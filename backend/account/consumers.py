import json
import logging
import urllib.parse
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from account.models import Job, JobApplication, Conversation, Message, CustomUser
import jwt

logger = logging.getLogger('django')

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.job_id = self.scope['url_route']['kwargs']['job_id']
        self.room_group_name = f'chat_{self.job_id}'
        
        query_string = self.scope.get('query_string', b'').decode()
        ws_url = f"ws://{self.scope['headers'][0][1].decode()}:{self.scope['server'][1]}{self.scope['path']}?{query_string}"
        cookies = self.scope.get('cookies', {})
        logger.info(f"WebSocket connect: job_id={self.job_id}, url={ws_url}, cookies={cookies}")
        
        self.user = None
        token = cookies.get('access_token')
        logger.info(f"Extracted access_token from cookies: {'Present' if token else 'Missing'}")
        
        if token:
            try:
                jwt_auth = JWTAuthentication()
                validated_token = jwt_auth.get_validated_token(token)
                self.user = await database_sync_to_async(jwt_auth.get_user)(validated_token)
                logger.info(f"Authenticated user from cookie: {self.user.email} (ID: {self.user.id})")
            except (InvalidToken, TokenError) as e:
                logger.error(f"Token error: {str(e)}")
            except Exception as e:
                logger.error(f"Unexpected authentication error: {str(e)}")
        
        if not self.user and query_string:
            try:
                query_params = dict(urllib.parse.parse_qsl(query_string))
                token = query_params.get('token')
                logger.info(f"Extracted token from query string: {'Present' if token else 'Missing'}")
                if token:
                    jwt_auth = JWTAuthentication()
                    validated_token = jwt_auth.get_validated_token(token)
                    self.user = await database_sync_to_async(jwt_auth.get_user)(validated_token)
                    logger.info(f"Authenticated user from query string: {self.user.email} (ID: {self.user.id})")
            except (InvalidToken, TokenError) as e:
                logger.error(f"Query string token error: {str(e)}")
            except Exception as e:
                logger.error(f"Unexpected query string authentication error: {str(e)}")
        
        if not self.user:
            self.user = self.scope.get('user')
            logger.info(f"Fallback to AuthMiddlewareStack user: {self.user if self.user else 'None'}")
        
        if not self.user or self.user.is_anonymous:
            logger.error(f"Unauthenticated user: job_id={self.job_id}, cookies={cookies}, query_string={query_string}")
            await self.close(code=4001)
            return
        
        logger.info(f"Authenticated user: {self.user.email} (ID: {self.user.id})")
        
        try:
            is_authorized = await self.is_user_authorized()
            if not is_authorized:
                logger.error(f"Unauthorized user: {self.user.email}, job_id={self.job_id}")
                await self.close(code=4003)
                return
            
            logger.info(f"Authorized user: {self.user.email}, job_id={self.job_id}")
            
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            logger.info(f"WebSocket accepted: user={self.user.email}, job_id={self.job_id}")
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_joined',
                    'message': {
                        'event': 'user_joined',
                        'user_id': self.user.id,
                        'user_name': self.user.name,
                        'user_role': self.user.role,
                        'timestamp': timezone.now().isoformat()
                    }
                }
            )
        except Exception as e:
            logger.error(f"Connect error: job_id={self.job_id}, user={self.user.email}, error={str(e)}")
            await self.close(code=4000)
            raise

    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnect: code={close_code}, user={getattr(self.user, 'email', 'Unknown')}, job_id={self.job_id}")
        
        if hasattr(self, 'user') and hasattr(self.user, 'id') and hasattr(self, 'room_group_name'):
            try:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_left',
                        'message': {
                            'event': 'user_left',
                            'user_id': self.user.id,
                            'timestamp': timezone.now().isoformat()
                        }
                    }
                )
                await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
                logger.info(f"Left room group: {self.room_group_name}")
            except Exception as e:
                logger.error(f"Disconnect error: {str(e)}")

    async def receive(self, text_data):
        try:
            logger.info(f"Received: {text_data[:100]}...")
            data = json.loads(text_data)
            
            if 'message' not in data:
                logger.error("Missing 'message' key")
                await self.send(text_data=json.dumps({'error': 'Message content required'}))
                return
                
            message_content = data['message']
            message_data = await self.save_message(message_content)
            logger.info(f"Saved message: ID={message_data['id']}")
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message_data
                }
            )
        except json.JSONDecodeError as e:
            logger.error(f"JSON error: {str(e)}")
            await self.send(text_data=json.dumps({'error': 'Invalid message format'}))
        except Exception as e:
            logger.error(f"Receive error: {str(e)}")
            await self.send(text_data=json.dumps({'error': f'Error: {str(e)}'}))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['message']))
        logger.debug(f"Sent message: ID={event['message'].get('id')}")

    async def user_joined(self, event):
        await self.send(text_data=json.dumps(event['message']))

    async def user_left(self, event):
        await self.send(text_data=json.dumps(event['message']))

    @database_sync_to_async
    def is_user_authorized(self):
        try:
            job = Job.objects.get(job_id=self.job_id)
            logger.info(f"Job: job_id={job.job_id}, client={job.client_id.email}")
            
            if job.client_id.id == self.user.id:
                return True
            
            application = JobApplication.objects.filter(
                job_id=job,
                professional_id=self.user,
                status='Accepted'
            ).first()
            
            if application:
                logger.info(f"Accepted application for user: {self.user.email}")
                return True
            
            logger.info(f"No authorization: user={self.user.email}, job_id={self.job_id}")
            return False
        except Job.DoesNotExist:
            logger.error(f"Job not found: job_id={self.job_id}")
            return False
        except Exception as e:
            logger.error(f"Authorization error: {str(e)}")
            return False

    @database_sync_to_async
    def save_message(self, content):
        job = Job.objects.get(job_id=self.job_id)
        conversation, created = Conversation.objects.get_or_create(job=job)
        
        message = Message.objects.create(
            conversation=conversation,
            sender=self.user,
            content=content,
            file_type='text' if content else None,
            is_read=False
        )
        
        return {
            'id': message.id,
            'sender': message.sender.id,
            'sender_name': message.sender.name,
            'sender_role': message.sender.role,
            'content': message.content,
            'file_url': message.file.url if message.file else None,
            'file_type': message.file_type,
            'created_at': message.created_at.isoformat(),
            'is_read': False
        }

class WebRTCSignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.job_id = self.scope['url_route']['kwargs']['job_id']
        self.room_group_name = f'webrtc_{self.job_id}'
        
        self.user = self.scope.get('user')
        logger.info(f"WebRTC connect attempt: job_id={self.job_id}, user={getattr(self.user, 'email', 'Unknown')}")
        
        if not self.user or self.user.is_anonymous:
            logger.error("Unauthenticated user attempted to access WebRTC")
            await self.close(code=4001)
            return
        
        is_authorized = await self.is_user_authorized()
        if not is_authorized:
            logger.error(f"Unauthorized WebRTC access: {self.user.email}, job_id={self.job_id}")
            await self.close(code=4003)
            return
            
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        logger.info(f"WebRTC WebSocket accepted: user={self.user.email}, job_id={self.job_id}")
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_connected',
                'message': {
                    'type': 'user_connected',
                    'user_id': self.user.id,
                    'user_name': self.user.name,
                    'user_role': self.user.role
                }
            }
        )

    async def disconnect(self, close_code):
        logger.info(f"WebRTC disconnect: code={close_code}, user={getattr(self.user, 'email', 'Unknown')}")
        
        if hasattr(self, 'room_group_name'):
            if hasattr(self, 'user') and hasattr(self.user, 'id'):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_disconnected',
                        'message': {
                            'type': 'user_disconnected',
                            'user_id': self.user.id
                        }
                    }
                )
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            logger.info(f"WebRTC message received: type={data.get('type')}, from={data.get('sender_id', 'Unknown')}")
            
            if 'type' not in data:
                logger.error("Missing 'type' key in WebRTC message")
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Message type required'
                }))
                return
            
            data['sender_id'] = self.user.id
            data['sender_name'] = self.user.name
            data['sender_role'] = self.user.role
            
            valid_types = ['offer', 'answer', 'ice-candidate', 'call-request', 'call-accepted', 'call-rejected', 'call-ended']
            if data['type'] not in valid_types:
                logger.error(f"Invalid message type: {data['type']}")
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f"Invalid message type: {data['type']}"
                }))
                return
            
            if data['type'] in ['offer', 'answer'] and 'to' not in data:
                logger.warning(f"Missing 'to' field for {data['type']} message")
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'signaling_message',
                    'message': data
                }
            )
        except json.JSONDecodeError:
            logger.error(f"Invalid WebRTC message format: {text_data[:100]}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid message format'
            }))
        except Exception as e:
            logger.error(f"WebRTC message error: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Error processing message: {str(e)}'
            }))

    async def signaling_message(self, event):
        message = event['message']
        if message.get('sender_id') != self.user.id:
            if 'to' in message and message['to'] != self.user.id:
                logger.debug(f"Ignoring message for user {message['to']}, current user {self.user.id}")
                return
            await self.send(text_data=json.dumps(message))

    async def user_connected(self, event):
        await self.send(text_data=json.dumps(event['message']))

    async def user_disconnected(self, event):
        await self.send(text_data=json.dumps(event['message']))

    @database_sync_to_async
    def is_user_authorized(self):
        try:
            job = Job.objects.get(job_id=self.job_id)
            if job.client_id.id == self.user.id:
                return True
            application = JobApplication.objects.filter(
                job_id=job,
                professional_id=self.user,
                status='Accepted'
            ).first()
            return bool(application)
        except Job.DoesNotExist:
            logger.error(f"Job not found: job_id={self.job_id}")
            return False
        except Exception as e:
            logger.error(f"Authorization check error: {str(e)}")
            return False