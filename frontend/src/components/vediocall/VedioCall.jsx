import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';
import './VideoCall.css';

const VideoCall = forwardRef(({
  jobId,
  userName,
  userRole,
  userId,
  job,
  onIncomingCall,
  onCallAccepted,
  onCallRejected,
  onCallEnded,
  callStatus: externalCallStatus,
  acceptedCall
}, ref) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');
  const [callError, setCallError] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [callerInfo, setCallerInfo] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const callTimer = useRef(null);
  const callDuration = useRef(0);
  const [callTime, setCallTime] = useState('00:00');

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useImperativeHandle(ref, () => ({
    acceptCall,
    rejectCall
  }));

  useEffect(() => {
    if (externalCallStatus === 'active' && acceptedCall && !inCall) {
      acceptCall();
    }
  }, [externalCallStatus, acceptedCall]);

  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/ws-auth-token/', {
          withCredentials: true,
        });
        const token = response.data.access_token;
        if (!token) {
          throw new Error('No authentication token received');
        }
        const wsUrl = `ws://localhost:8000/ws/webrtc/${jobId}/?token=${encodeURIComponent(token)}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebRTC signaling connected');
          setSocketConnected(true);
          setCallError(null);
        };

        ws.onmessage = (event) => {
          handleSignalingMessage(JSON.parse(event.data));
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setSocketConnected(false);
          setCallError('Connection error');
        };

        ws.onclose = () => {
          console.log('WebSocket closed');
          setSocketConnected(false);
          if (inCall) {
            endCall();
          }
        };

        setSocket(ws);

        return () => {
          if (ws) {
            ws.close();
          }
        };
      } catch (error) {
        console.error('Failed to connect to signaling server:', error);
        setCallError('Failed to connect to call server');
      }
    };

    if (jobId) {
      connectWebSocket();
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (socket) {
        socket.close();
      }
      if (callTimer.current) {
        clearInterval(callTimer.current);
      }
    };
  }, [jobId]);

  const handleSignalingMessage = (message) => {
    try {
      if (message.sender_id === userId) return;
      console.log('Received signaling message:', message);

      switch (message.type) {
        case 'offer':
          handleOffer(message);
          break;
        case 'answer':
          handleAnswer(message);
          break;
        case 'ice-candidate':
          handleIceCandidate(message);
          break;
        case 'call-request':
          handleCallRequest(message);
          break;
        case 'call-accepted':
          handleCallAccepted(message);
          break;
        case 'call-rejected':
          handleCallRejected(message);
          break;
        case 'call-ended':
          handleCallEnded(message);
          break;
        case 'user_connected':
          console.log(`User connected: ${message.user_name}`);
          break;
        case 'user_disconnected':
          if (inCall) {
            endCall('Participant disconnected');
          }
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  };

  const getLocalStream = async () => {
    try {
      console.log('Requesting camera and microphone access');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      console.log('Got local media stream:', stream);
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setCallError(`Cannot access camera or microphone: ${error.message}`);
      throw error;
    }
  };

  const stopLocalStream = () => {
    if (localStream) {
      console.log('Stopping local media stream');
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
  };

  const createPeerConnection = async (stream) => {
    try {
      console.log('Creating peer connection with ICE servers:', iceServers);
      const pc = new RTCPeerConnection(iceServers);

      if (stream) {
        console.log('Adding local tracks to peer connection');
        stream.getTracks().forEach(track => {
          console.log('Adding track to peer connection:', track.kind);
          pc.addTrack(track, stream);
        });
      } else {
        console.warn('No stream provided to createPeerConnection');
      }

      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            remoteVideoRef.current.onloadedmetadata = () => {
              remoteVideoRef.current.play().catch(e => {
                console.error('Error playing remote video:', e);
              });
            };
          }
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallStatus('active');
          startCallTimer();
        }
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          endCall(`Call ended (${pc.connectionState})`);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          let recipientId = job?.professional_id || job?.client_id || callerInfo?.userId;
          sendSignalingMessage({
            type: 'ice-candidate',
            candidate: event.candidate,
            from: userName,
            userId: userId,
            to: recipientId
          });
        }
      };

      peerConnection.current = pc;
      return pc;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      setCallError(`Failed to set up call: ${error.message}`);
      throw error;
    }
  };

  const closeConnection = () => {
    if (peerConnection.current) {
      console.log('Closing peer connection');
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (remoteStream) {
      console.log('Stopping remote stream tracks');
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    }
  };

  const sendSignalingMessage = (message) => {
    if (socket && socketConnected) {
      console.log('Sending signaling message:', message);
      socket.send(JSON.stringify({
        ...message,
        sender_id: userId,
        sender_name: userName,
        sender_role: userRole
      }));
    } else {
      console.error('Cannot send message, socket not connected');
      setCallError('Connection to call server lost');
    }
  };

 const startCall = async () => {
  if (isStarting) return;
  try {
    setIsStarting(true);
    console.log('Starting call, user role:', userRole);
    setCallStatus('connecting');
    setCallError(null);

    const stream = await getLocalStream();
    const pc = await createPeerConnection(stream);

    let recipientId;
    
    if (userRole === 'client') {
      // If professional_id is missing, show an appropriate message
      if (!job.professional_id) {
        console.log('No professional assigned to this job yet');
        setCallError('No professional has been assigned to this job yet. Please wait until a professional accepts your job.');
        throw new Error('No professional assigned');
      }
      recipientId = job.professional_id;
      console.log('Calling professional:', recipientId);
    } else if (userRole === 'professional' && job.client_id) {
      recipientId = job.client_id;
      console.log('Calling client:', recipientId);
    }

    if (!recipientId) {
      console.error('Could not determine call recipient');
      console.log('Current role:', userRole);
      console.log('Job info:', job);
      setCallError('Cannot start call: No recipient available.');
      throw new Error('Could not determine who to call');
    }

    sendSignalingMessage({
      type: 'call-request',
      from: userName,
      role: userRole,
      userId: userId,
      to: recipientId
    });

    console.log('Creating offer');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignalingMessage({
      type: 'offer',
      offer: offer,
      from: userName,
      role: userRole,
      userId: userId,
      to: recipientId
    });

    setInCall(true);
  } catch (err) {
    console.error('Error starting call:', err.message);
    setCallStatus('idle');
    setCallError(`Failed to start call: ${err.message}`);
    stopLocalStream();
    closeConnection();
  } finally {
    setIsStarting(false);
  }
};

  const acceptCall = async () => {
    try {
      console.log('Accepting call from:', callerInfo?.name);
      setCallStatus('connecting');

      const stream = await getLocalStream();
      await createPeerConnection(stream);

      sendSignalingMessage({
        type: 'call-accepted',
        from: userName,
        role: userRole,
        userId: userId,
        to: callerInfo?.userId
      });

      setInCall(true);
      if (onCallAccepted) {
        onCallAccepted();
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      setCallError(`Failed to accept call: ${error.message}`);
      setCallStatus('idle');
      setCallerInfo(null);
      endCall('Failed to accept call');
    }
  };

  const rejectCall = () => {
    console.log('Rejecting call from:', callerInfo?.name);
    sendSignalingMessage({
      type: 'call-rejected',
      reason: 'Call rejected by user',
      from: userName,
      role: userRole,
      userId: userId,
      to: callerInfo?.userId
    });
    setCallStatus('idle');
    setCallerInfo(null);
    if (onCallRejected) {
      onCallRejected();
    }
  };

  const endCall = (reason = 'Call ended') => {
    console.log('Ending call, reason:', reason);
    sendSignalingMessage({
      type: 'call-ended',
      reason,
      from: userName,
      role: userRole,
      userId: userId
    });
    stopLocalStream();
    closeConnection();
    setInCall(false);
    setCallStatus('idle');
    setCallerInfo(null);
    if (callTimer.current) {
      clearInterval(callTimer.current);
      callTimer.current = null;
      callDuration.current = 0;
      setCallTime('00:00');
    }
    if (onCallEnded) {
      onCallEnded(reason);
    }
  };

  const handleOffer = async (message) => {
    try {
      if (!inCall || !peerConnection.current) return;
      console.log('Handling offer from:', message.sender_id);
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message.offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      sendSignalingMessage({
        type: 'answer',
        answer: answer,
        from: userName,
        role: userRole,
        userId: userId,
        to: message.sender_id
      });
      if (callStatus === 'connecting') {
        setCallStatus('active');
        startCallTimer();
      }
    } catch (error) {
      console.error('Error handling offer:', error);
      setCallError(`Error establishing call: ${error.message}`);
      endCall('Failed to establish call');
    }
  };

  const handleAnswer = async (message) => {
    try {
      console.log('Handling answer from:', message.sender_id);
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(message.answer));
        if (callStatus !== 'active') {
          setCallStatus('active');
          startCallTimer();
        }
      }
    } catch (error) {
      console.error('Error handling answer:', error);
      setCallError(`Error establishing call: ${error.message}`);
      endCall('Failed to establish call');
    }
  };

  const handleIceCandidate = async (message) => {
    try {
      console.log('Handling ICE candidate from:', message.sender_id);
      if (peerConnection.current && message.candidate) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const handleCallRequest = (message) => {
    console.log(`Incoming call from ${message.from} (${message.role})`);
    if (inCall) {
      sendSignalingMessage({
        type: 'call-rejected',
        reason: 'User is busy in another call',
        from: userName,
        role: userRole,
        userId: userId,
        to: message.sender_id
      });
      return;
    }
    const caller = {
      name: message.from,
      role: message.role,
      userId: message.sender_id
    };
    setCallerInfo(caller);
    if (onIncomingCall) {
      onIncomingCall(caller);
    }
  };

  const handleCallAccepted = (message) => {
    console.log('Call accepted by:', message.sender_id);
  };

  const handleCallRejected = (message) => {
    console.log('Call rejected by:', message.sender_id, 'Reason:', message.reason);
    setCallError(`Call rejected: ${message.reason || 'User unavailable'}`);
    endCall();
  };

  const handleCallEnded = (message) => {
    console.log('Call ended by:', message.sender_id, 'Reason:', message.reason);
    endCall(message.reason || 'Call ended by other party');
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const startCallTimer = () => {
    if (callTimer.current) {
      clearInterval(callTimer.current);
    }
    callDuration.current = 0;
    callTimer.current = setInterval(() => {
      callDuration.current += 1;
      const minutes = Math.floor(callDuration.current / 60).toString().padStart(2, '0');
      const seconds = (callDuration.current % 60).toString().padStart(2, '0');
      setCallTime(`${minutes}:${seconds}`);
    }, 1000);
  };

  const getStatusDisplay = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'active':
        return `In call ${callTime}`;
      default:
        return '';
    }
  };

  return (
    <div className={`video-call-container ${isFullScreen ? 'fullscreen' : ''}`}>
      {callStatus === 'idle' && !inCall && (
        <div className="call-controls">
          <button
            className="start-call-button"
            onClick={startCall}
            disabled={!socketConnected || isStarting}
          >
            {isStarting ? 'Starting Call...' : 'Start Video Call'}
          </button>
          {callError && <p className="call-error">{callError}</p>}
        </div>
      )}

      {(callStatus === 'connecting' || callStatus === 'active') && (
        <>
          <div className="video-grid">
            <div className="remote-video-container">
              {remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
              ) : (
                <div className="connecting-placeholder">
                  <div className="connecting-spinner"></div>
                  <p>{callStatus === 'connecting' ? 'Calling...' : 'Waiting for video...'}</p>
                </div>
              )}
            </div>
            <div className="local-video-container">
              <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
              {!videoEnabled && (
                <div className="video-off-overlay">
                  <span>Video Off</span>
                </div>
              )}
            </div>
          </div>
          <div className="call-status">
            {getStatusDisplay()}
            {callError && <p className="call-error">{callError}</p>}
          </div>
          <div className="call-controls">
            <button className={`audio-button ${audioEnabled ? '' : 'muted'}`} onClick={toggleAudio}>
              {audioEnabled ? '🎙️' : '🔇'}
            </button>
            <button className={`video-button ${videoEnabled ? '' : 'disabled'}`} onClick={toggleVideo}>
              {videoEnabled ? '📹' : '🚫'}
            </button>
            <button className="fullscreen-button" onClick={toggleFullScreen}>
              {isFullScreen ? '↙️' : '↗️'}
            </button>
            <button className="end-call-button" onClick={() => endCall()}>
              📵 End Call
            </button>
          </div>
        </>
      )}
    </div>
  );
});

export default VideoCall;