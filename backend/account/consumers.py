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



class VideoCallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.job_id = self.scope['url_route']['kwargs']['job_id']
            self.room_group_name = f'video_call_{self.job_id}'
            
            # Authentication logic (similar to ChatConsumer)
            query_string = self.scope.get('query_string', b'').decode()
            cookies = self.scope.get('cookies', {})
            logger.info(f"VideoCall WebSocket connecting: job_id={self.job_id}")
            
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
            
            # Extract token from query string if not in cookie
            if not self.user and query_string:
                try:
                    query_params = dict(urllib.parse.parse_qsl(query_string))
                    token = query_params.get('token')
                    if token:
                        jwt_auth = JWTAuthentication()
                        validated_token = jwt_auth.get_validated_token(token)
                        self.user = await database_sync_to_async(jwt_auth.get_user)(validated_token)
                        logger.info(f"Authenticated user from query string: {self.user.email} (ID: {self.user.id})")
                except Exception as e:
                    logger.error(f"Query string authentication error: {str(e)}")
            
            if not self.user:
                self.user = self.scope.get('user')
                logger.info(f"Fallback to AuthMiddlewareStack user: {self.user if self.user else 'None'}")
            
            if not self.user or self.user.is_anonymous:
                logger.error(f"Unauthenticated video call user: job_id={self.job_id}")
                await self.close(code=4001)
                return
            
            # Now that user is authenticated, we can safely log this
            logger.info(f"User {self.user.id} joined video call room {self.room_group_name}")
            
            # Check if user is authorized for this job
            is_authorized = await self.is_user_authorized()
            if not is_authorized:
                logger.error(f"Unauthorized video call user: {self.user.email}, job_id={self.job_id}")
                await self.close(code=4003)
                return
            
            # Join room group
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
            logger.info(f"Video call WebSocket accepted: user={self.user.email}, job_id={self.job_id}")
        
        except Exception as e:
            logger.error(f"VideoCall connect error: {str(e)}", exc_info=True)
            await self.close(code=4000)
            return
    async def disconnect(self, close_code):
        logger.info(f"Video call WebSocket disconnect: code={close_code}, user={getattr(self.user, 'email', 'Unknown')}")
       
        if hasattr(self, 'room_group_name') and hasattr(self, 'user'):
            # Send call_ended notification to all members
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'call_ended',
                    'user_id': self.user.id,
                    'user_name': self.user.name,
                }
            )
            
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        # First get the message type, then use it in logging
            message_type = data.get('type')
            
            logger.info(f"Current user ID: {self.user.id}, channel: {self.channel_name}")
            logger.info(f"Message data: {data}")
            logger.info(f"Received message from user {self.user.id}, room: {self.room_group_name}, type: {message_type}")
        
            # Handle different WebRTC signaling messages
            message_type = data.get('type')
            
            if message_type == 'offer':
                # Call offer from initiator
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'call_offer',
                        'offer': data.get('offer'),
                        'caller_id': self.user.id,
                        'caller_name': self.user.name,
                        'caller_role': self.user.role,
                        'sender_channel': self.channel_name
                    }
                )
            
            elif message_type == 'answer':
                # Call answer from receiver
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'call_answer',
                        'answer': data.get('answer'),
                        'answerer_id': self.user.id,
                    }
                )
            
            elif message_type == 'ice_candidate':

                logger.info(f"Received ICE candidate from user {self.user.id}: {data.get('ice_candidate')}")
                
                # Make sure to forward the COMPLETE ice_candidate object
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'ice_candidate',
                        'ice_candidate': data.get('ice_candidate'),  # This should contain the full candidate
                        'sender_id': self.user.id,
                    }
                )
            elif message_type == 'end_call':
                # User ended call
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'call_ended',
                        'user_id': self.user.id,
                        'user_name': self.user.name,
                    }
                )
                
            elif message_type == 'ping':
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'ping_message',
                        'message': data.get('message'),
                        'sender_id': self.user.id,
                        'sender_channel': self.channel_name
                    }
                )
            elif message_type == 'testing_signal':
                logger.info(f"Received test signal from user {self.user.id}: {data.get('message')}")
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'test_signal',
                        'message': data.get('message'),
                        'sender_id': self.user.id,
                        'sender_name': self.user.name
        }
    )
            elif message_type == 'ready_to_call':
            # Handle ready_to_call message
               await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'ready_to_call',
                    'user_id': self.user.id,
                    'user_name': self.user.name,
                    'sender_channel': self.channel_name
                }
            )
   
        except json.JSONDecodeError:
            logger.error("Invalid JSON in video call")
        except Exception as e:
            logger.error(f"Video call receive error: {str(e)}")

    # Handler for call offer
    async def call_offer(self, event):
        logger.info(f"Processing call_offer: from={event.get('caller_id')}, to={self.user.id}, same={event.get('sender_channel') == self.channel_name}")
        if event.get('sender_channel') == self.channel_name:
            logger.info("Skipping sending offer to self")
            return
        
        await self.send(text_data=json.dumps({
        'type': 'offer',
        'offer': event['offer'],
        'caller_id': event['caller_id'],
        'caller_name': event['caller_name'],
        'caller_role': event['caller_role'],
    }))

    # Handler for call answer
    async def call_answer(self, event):
        await self.send(text_data=json.dumps({
            'type': 'answer',
            'answer': event['answer'],
            'answerer_id': event['answerer_id'],
        }))
    async def ping_message(self, event):
        if event.get('sender_channel') == self.channel_name:
            return
            
        await self.send(text_data=json.dumps({
            'type': 'ping',
            'message': event['message'],
            'sender_id': event['sender_id']
        }))
    # Handler for ICE candidates
    async def ice_candidate(self, event):
    # Add debug logging
        logger.info(f"Forwarding ICE candidate from {event['sender_id']} to {self.user.id}")
        
        # Forward the message to the client
        await self.send(text_data=json.dumps({
            'type': 'ice_candidate',
            'ice_candidate': event['ice_candidate'],
            'sender_id': event['sender_id'],
        }))
    async def ready_to_call(self, event):
        if event.get('sender_channel') == self.channel_name:
            return
            
        await self.send(text_data=json.dumps({
            'type': 'ready_to_call',
            'user_id': event['user_id'],
            'user_name': event['user_name']
        }))
    # Handler for call ended notification
    async def call_ended(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call_ended',
            'user_id': event['user_id'],
            'user_name': event['user_name'],
        }))
    async def test_signal(self, event):
        if event.get('sender_id') != self.user.id:
            logger.info(f"Forwarding test signal to user {self.user.id}")
            await self.send(text_data=json.dumps({
                'type': 'testing_signal',
                'message': event['message'],
                'sender_id': event['sender_id'],
                'sender_name': event['sender_name']
            }))
    @database_sync_to_async
    def is_user_authorized(self):
        try:
            job = Job.objects.get(job_id=self.job_id)
            
            # Allow job client
            if job.client_id.id == self.user.id:
                return True
            
            # Allow professionals with accepted applications
            application = JobApplication.objects.filter(
                job_id=job,
                professional_id=self.user,
                status='Accepted'
            ).first()
            
            return application is not None
            
        except Job.DoesNotExist:
            logger.error(f"Job not found for video call: job_id={self.job_id}")
            return False
        except Exception as e:
            logger.error(f"Video call authorization error: {str(e)}")
            return False