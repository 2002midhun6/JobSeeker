from django.urls import re_path
from .consumers import ChatConsumer,VideoCallConsumer

websocket_urlpatterns = [
  re_path(r'^ws/chat/(?P<job_id>\d+)/$', ChatConsumer.as_asgi()),
  re_path(r'^ws/video-call/(?P<job_id>\d+)/$', VideoCallConsumer.as_asgi()),
   

]