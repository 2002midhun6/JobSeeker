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
    onCallInitiated, // Add this new prop
    callStatus: externalCallStatus,
    acceptedCall
  }, ref) => {
    const isPeerConnectionUsable = () => {
        if (!peerConnection.current) {
          console.log('Peer connection not initialized');
          return false;
        }
        if (peerConnection.current.connectionState === 'closed' || 
            peerConnection.current.signalingState === 'closed') {
          console.log('Peer connection is closed');
          return false;
        }
        return true;
      };
      
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
  const isConnectingRef = useRef(false);
  const pendingOffers = useRef([]);
  const isProcessingCallRef = useRef(false);
  const isCleaningUpRef = useRef(false);
  const currentCallerRef = useRef(null); // Added missing ref
  const [pendingIceCandidates, setPendingIceCandidates] = useState([]);
  const [peerState, setPeerState] = useState('new'); 
  const [connectionQuality, setConnectionQuality] = useState('unknown'); 
 

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useImperativeHandle(ref, () => ({
    acceptCall: (callerParam) => acceptCall(callerParam),
    rejectCall: (callerParam) => rejectCall(callerParam)
  }));

  // Debug streams whenever they change
  useEffect(() => {
    if (localStream || remoteStream) {
      debugStreams();
    }
  }, [localStream, remoteStream]);

  useEffect(() => {
    console.log('Call status effect triggered:', { 
      externalCallStatus, 
      acceptedCall, 
      inCall, 
      callerInfo 
    });
    
    // Add a guard to prevent the loop
    if (externalCallStatus === 'active' && acceptedCall && !inCall && !isProcessingCallRef.current) {
      console.log('Auto-accepting call based on external state');
      
      // Set a processing flag to prevent re-entrant calls
      isProcessingCallRef.current = true;
      
      // Get caller info from ref if state isn't ready yet
      const effectiveCaller = callerInfo || currentCallerRef.current;
      
      if (!effectiveCaller) {
        console.error('Cannot auto-accept: No caller information available');
        isProcessingCallRef.current = false;
        return;
      }
      
      // Use a setTimeout to give React time to process state updates
      setTimeout(() => {
        acceptCall(effectiveCaller);
        
        // Reset flag after a delay to ensure all processing is complete
        setTimeout(() => {
          isProcessingCallRef.current = false;
        }, 1000);
      }, 100);
    }
  }, [externalCallStatus, acceptedCall, inCall]);

  useEffect(() => {
    const connectWebSocket = async () => {
      if (isConnectingRef.current) {
        console.log('Already connecting, skipping');
        return;
      }
      isConnectingRef.current = true;
      try {
        console.log('Attempting to connect to signaling server...');
        const response = await axios.get('http://localhost:8000/api/ws-auth-token/', {
          withCredentials: true,
          timeout: 5000 // Add timeout to prevent hanging
        });
        const token = response.data.access_token;
        if (!token) throw new Error('No authentication token received');
        const wsUrl = `ws://localhost:8000/ws/webrtc/${jobId}/?token=${encodeURIComponent(token)}`;
        console.log('Connecting to WebSocket at:', wsUrl);
        
        const ws = new WebSocket(wsUrl);
  
        // Add a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            console.error('WebSocket connection timeout');
            ws.close();
            setSocketConnected(false);
            setCallError('Failed to connect to call server. Retry in a moment.');
            isConnectingRef.current = false;
          }
        }, 10000);
  
        ws.onopen = () => {
            console.log('WebRTC signaling connected successfully for user:', userId);
            setSocketConnected(true);
            setCallError(null);
          // Send a presence message to notify the server we're online and ready for calls
          try {
            ws.send(JSON.stringify({
              type: 'user_presence',
              sender_id: userId,
              sender_name: userName,
              sender_role: userRole,
              status: 'online'
            }));
          } catch (err) {
            console.warn('Error sending presence message:', err);
          }
        };
        
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('Message received by user', userId, ':', message);
            handleSignalingMessage(message);
          };
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          clearTimeout(connectionTimeout);
          setSocketConnected(false);
          setCallError('Connection error');
        };
        
        ws.onclose = (event) => {
          console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
          clearTimeout(connectionTimeout);
          setSocketConnected(false);
          
          if (inCall) {
            console.log('Socket closed while in call - attempting to reconnect');
            setTimeout(reconnectSignalingSocket, 2000);
          } else {
            // If not in call, try to reconnect once after a delay
            setTimeout(connectWebSocket, 5000);
          }
        };
  
        setSocket(ws);
      } catch (error) {
        console.error('Failed to connect to signaling server:', error);
        setCallError('Failed to connect to call server. Check your connection.');
        
        // Reset connecting flag and try again after a delay
        isConnectingRef.current = false;
        setTimeout(connectWebSocket, 5000);
      }
    };
  
    if (jobId) {
      console.log('JobID present, connecting WebSocket');
      connectWebSocket();
    } else {
      console.warn('No jobId provided, cannot connect to signaling server');
    }
  
    return () => {
      console.log('Cleaning up WebSocket and media resources');
      cleanupResources();
      if (socket) {
        try {
          // Send offline status before closing
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'user_presence',
              sender_id: userId,
              sender_name: userName,
              sender_role: userRole,
              status: 'offline'
            }));
          }
          socket.close();
        } catch (e) {
          console.error('Error during socket cleanup:', e);
        }
      }
    };
  }, [jobId, userId, userName, userRole]);

  const handleSignalingMessage = (message) => {
    try {
      if (message.sender_id === userId) {
        console.log('Ignoring own message:', message.type);
        return;
      }
      
      console.log('Received signaling message:', message);
  
      switch (message.type) {
        case 'offer':
          console.log('Handling incoming offer from:', message.sender_id || message.from);
          handleOffer(message);
          break;
          
        case 'answer':
          console.log('Handling answer from:', message.sender_id || message.from);
          handleAnswer(message);
          break;
          
        case 'ice-candidate':
          console.log('Handling ICE candidate from:', message.sender_id || message.from);
          handleIceCandidate(message);
          break;
          
        case 'call-request':
            console.log('Handling incoming call from:', message.sender_id || message.from);
            handleCallRequest(message);
            break;
          
        case 'call-accepted':
          console.log('Call accepted by:', message.sender_id || message.from);
          handleCallAccepted(message);
          break;
          
        case 'call-rejected':
          console.log('Call rejected by:', message.sender_id || message.from);
          handleCallRejected(message);
          break;
          
        case 'call-ended':
          console.log('Call ended by:', message.sender_id || message.from);
          handleCallEnded(message);
          break;
          
        case 'user_connected':
          console.log(`User connected: ${message.user_name || message.sender_name}`);
          break;
          
        case 'user_disconnected':
          console.log(`User disconnected: ${message.user_name || message.sender_name}`);
          if (inCall && 
              (message.sender_id === callerInfo?.userId || 
               message.user_id === callerInfo?.userId)) {
            endCall('Participant disconnected');
          }
          break;
          
        case 'ping':
          // Just log it for debugging, no action needed
          console.log('Received ping from server');
          break;
          
        case 'user_presence':
          console.log(`User ${message.status}: ${message.sender_name}`);
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
    }
  };
  const monitorConnectionQuality = () => {
    if (!peerConnection.current) return;
    
    const statsInterval = setInterval(async () => {
      if (!peerConnection.current) {
        clearInterval(statsInterval);
        return;
      }
      
      try {
        const stats = await peerConnection.current.getStats();
        let totalPacketsLost = 0;
        let totalPackets = 0;
        let roundTripTime = 0;
        let roundTripTimeCount = 0;
        
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.packetsLost) {
            totalPacketsLost += report.packetsLost;
            totalPackets += report.packetsReceived;
          }
          
          if (report.type === 'remote-inbound-rtp' && report.roundTripTime) {
            roundTripTime += report.roundTripTime;
            roundTripTimeCount++;
          }
        });
        
        // Calculate packet loss percentage
        const packetLossPercent = totalPackets > 0 ? (totalPacketsLost / totalPackets) * 100 : 0;
        
        // Calculate average round trip time
        const avgRTT = roundTripTimeCount > 0 ? roundTripTime / roundTripTimeCount : 0;
        
        // Determine connection quality
        let quality = 'unknown';
        
        if (peerConnection.current.iceConnectionState === 'connected' || 
            peerConnection.current.iceConnectionState === 'completed') {
          if (packetLossPercent < 1 && avgRTT < 0.1) {
            quality = 'excellent';
          } else if (packetLossPercent < 3 && avgRTT < 0.3) {
            quality = 'good';
          } else if (packetLossPercent < 8 && avgRTT < 0.5) {
            quality = 'fair';
          } else {
            quality = 'poor';
          }
        }
        
        setConnectionQuality(quality);
        
      } catch (err) {
        console.error('Error getting WebRTC stats:', err);
      }
    }, 2000);
    
    return () => clearInterval(statsInterval);
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
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log('Assigning remote stream to video element');
      
      // Clear any existing srcObject first
      if (remoteVideoRef.current.srcObject) {
        try {
          const oldStream = remoteVideoRef.current.srcObject;
          if (oldStream !== remoteStream) {  // Only stop if it's a different stream
            oldStream.getTracks().forEach(track => {
              if (track.readyState === 'live') {
                track.stop();
              }
            });
          }
        } catch (err) {
          console.warn('Error cleaning up old stream:', err);
        }
      }
      
      // Set the new stream
      remoteVideoRef.current.srcObject = remoteStream;
      
      // More robust video play handling with exponential backoff
      const playWithRetry = (attempt = 0) => {
        if (!remoteVideoRef.current || !remoteVideoRef.current.srcObject) return;
        
        remoteVideoRef.current.play()
          .then(() => {
            console.log('Remote video started playing successfully');
          })
          .catch(err => {
            console.error(`Error playing remote video (attempt ${attempt + 1}):`, err);
            
            if (attempt < 5) {
              // Exponential backoff: 300ms, 600ms, 1200ms, 2400ms, 4800ms
              const delay = Math.min(300 * Math.pow(2, attempt), 5000);
              console.log(`Retrying play in ${delay}ms`);
              
              setTimeout(() => playWithRetry(attempt + 1), delay);
            } else {
              console.error('Maximum retry attempts reached for video play');
            }
          });
      };
      
      // Start the retry process
      playWithRetry();
      
      // Set up media stream track monitoring
      const trackEndedHandler = (event) => {
        console.log(`Remote ${event.target.kind} track ended`);
        
        // Check if both audio and video tracks have ended
        const allTracksEnded = remoteStream.getTracks().every(t => t.readyState === 'ended');
        if (allTracksEnded) {
          console.log('All remote tracks have ended, call may have been disconnected');
          // Consider notifying the user or attempting reconnection
        }
      };
      
      // Add listeners to all tracks
      remoteStream.getTracks().forEach(track => {
        track.addEventListener('ended', trackEndedHandler);
      });
      
      // Clean up function
      return () => {
        if (remoteStream) {
          remoteStream.getTracks().forEach(track => {
            track.removeEventListener('ended', trackEndedHandler);
          });
        }
      };
    }
  }, [remoteStream]);
  const createPeerConnection = async (stream) => {
    try {
      if (peerConnection.current) {
        console.log('Closing existing peer connection');
        peerConnection.current.close();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      console.log('Creating peer connection with ICE servers:', iceServers);
      const pc = new RTCPeerConnection(iceServers);
  
      if (stream) {
        stream.getTracks().forEach(track => {
          console.log('Adding track to peer connection:', track.kind);
          pc.addTrack(track, stream);
        });
      }
  
      pc.ontrack = (event) => {
        console.log('Received remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          console.log('Setting remote stream with ID:', event.streams[0].id);
          setRemoteStream(event.streams[0]); // Just set the state here
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
  
      pc.oniceconnectionstatechange = () => console.log('ICE connection state:', pc.iceConnectionState);
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          let recipientId = job?.professional_id || job?.client_id || callerInfo?.userId;
          
          // Create a properly formatted message with all required fields
          const message = {
            type: 'ice-candidate',
            candidate: event.candidate,
            from: userName,
            to: recipientId
          };
          
          // Only add the userId if it exists to avoid undefined values
          if (userId) {
            message.userId = userId;
          }
          
          sendSignalingMessage(message);
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
      
      // Remove all event listeners
      if (peerConnection.current.ontrack) peerConnection.current.ontrack = null;
      if (peerConnection.current.onicecandidate) peerConnection.current.onicecandidate = null;
      if (peerConnection.current.oniceconnectionstatechange) peerConnection.current.oniceconnectionstatechange = null;
      if (peerConnection.current.onconnectionstatechange) peerConnection.current.onconnectionstatechange = null;
      
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
    // Create the complete message with sender info
    const completeMessage = {
      ...message,
      sender_name: userName,
      sender_role: userRole
    };
    
    // Only add sender_id if userId exists
    if (userId) {
      completeMessage.sender_id = userId;
    }
    
    // Try to send the message if socket is open
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        console.log('Sending signaling message:', completeMessage);
        socket.send(JSON.stringify(completeMessage));
        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        // Handle sending error by storing message and attempting reconnect
        bufferMessageAndReconnect(completeMessage);
        return false;
      }
    } else {
      console.error('Cannot send message, socket not connected or not in OPEN state');
      console.log('Socket state:', socket ? socket.readyState : 'null');
      // Store message and attempt reconnection
      bufferMessageAndReconnect(completeMessage);
      return false;
    }
  };
  const sendBufferedMessages = () => {
    if (!window.pendingSignalingMessages || window.pendingSignalingMessages.length === 0) {
      return;
    }
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log(`Sending ${window.pendingSignalingMessages.length} buffered messages`);
      
      // Create a copy of the messages array to avoid modification during iteration
      const messagesToSend = [...window.pendingSignalingMessages];
      window.pendingSignalingMessages = [];
      
      messagesToSend.forEach(msg => {
        try {
          socket.send(JSON.stringify(msg));
          console.log('Sent buffered message:', msg.type);
        } catch (err) {
          console.error('Error sending buffered message:', err);
          // Re-add to pending messages if sending fails
          window.pendingSignalingMessages.push(msg);
        }
      });
    }
  };
  
  // 5. Add a useEffect to set up a keepalive ping to prevent connection loss
  
  useEffect(() => {
    let pingInterval;
    
    if (socket && socketConnected) {
      // Set up a ping every 30 seconds to keep the connection alive
      pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            // Send a lightweight ping message
            socket.send(JSON.stringify({ type: 'ping' }));
            console.log('Ping sent to keep connection alive');
          } catch (error) {
            console.error('Error sending ping:', error);
            setSocketConnected(false);
            reconnectSignalingSocket();
          }
        } else {
          console.warn('Socket not open for ping, attempting reconnect');
          setSocketConnected(false);
          reconnectSignalingSocket();
        }
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (pingInterval) {
        clearInterval(pingInterval);
      }
    };
  }, [socket, socketConnected]);
  const startCall = async () => {
    if (isStarting) {
      console.log('Call already starting, ignoring duplicate request');
      return;
    }
    if (callStatus === 'incoming' && currentCallerRef.current) {
        console.log('Accepting incoming call instead of starting a new one');
        acceptCall(currentCallerRef.current);
        return;
      }
    try {
      setIsStarting(true);
      console.log('Starting call, user role:', userRole);
      setCallStatus('connecting');
      setCallError(null);
  
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error('Socket not connected. Cannot start call');
        throw new Error('Not connected to call server. Please try again.');
      }
  
      const stream = await getLocalStream();
      if (!stream) {
        throw new Error('Could not access camera or microphone');
      }
      
      const pc = await createPeerConnection(stream);
      if (!pc) {
        throw new Error('Failed to create connection');
      }
  
      let recipientId;
      if (userRole === 'client') {
        if (!job || !job.professional_id) {
          console.log('No professional assigned to this job yet');
          throw new Error('No professional has been assigned to this job yet.');
        }
        recipientId = job.professional_id;
      } else if (userRole === 'professional' && job && job.client_id) {
        recipientId = job.client_id;
      } else {
        throw new Error('Cannot start call: No recipient available.');
      }
  
      const callRequestSuccess = sendSignalingMessage({
        type: 'call-request',
        from: userName,
        role: userRole,
        userId: userId,
        to: recipientId
      });
  
      if (!callRequestSuccess) {
        throw new Error('Failed to send call request. Please check your connection.');
      }
  
      // Notify parent that call has been initiated
      if (onCallInitiated) {
        onCallInitiated();
      }
  
      console.log('Call request sent, creating offer...');
  
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await pc.setLocalDescription(offer);
      
      const offerSuccess = sendSignalingMessage({
        type: 'offer',
        offer: offer,
        from: userName,
        role: userRole,
        userId: userId,
        to: recipientId
      });
      
      if (!offerSuccess) {
        throw new Error('Failed to send offer. Please check your connection.');
      }
      
      console.log('Offer sent to:', recipientId);
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
  const acceptCall = async (callerParam) => {
    // If already processing, bail out
    if (isProcessingCallRef.current) {
      console.log('Already processing a call acceptance, ignoring duplicate request');
      return;
    }
    
    try {
      isProcessingCallRef.current = true;
      
      // Use passed caller info or existing state or ref
      const effectiveCaller = callerParam || callerInfo || currentCallerRef.current;
      
      console.log('acceptCall called with callerParam:', callerParam);
      console.log('Existing callerInfo state:', callerInfo);
      console.log('Using effectiveCaller:', effectiveCaller);
      console.log('Current inCall state:', inCall);
      
      // Verify caller info is present
      if (!effectiveCaller || !effectiveCaller.userId) {
        console.error('Missing caller information. Cannot accept call.', { 
          callerParam, callerInfo, effectiveCaller 
        });
        setCallError('Cannot accept call: Missing caller information.');
        setCallStatus('idle');
        isProcessingCallRef.current = false;
        return;
      }
      
      // MODIFIED CONDITION: Only check if we're in an active call with video connected
      // This fixes the issue where a call is marked as "already in call" without actually being connected
      if (inCall && callerInfo && callerInfo.userId === effectiveCaller.userId && 
          peerConnection.current && peerConnection.current.connectionState === 'connected') {
        console.log('Already in active call with this caller, ignoring duplicate accept');
        isProcessingCallRef.current = false;
        return;
      }
      
      // Set caller info state with the effective caller
      setCallerInfo(effectiveCaller);
      // Also set the ref for consistency
      currentCallerRef.current = effectiveCaller;
      
      console.log('Accepting call from:', effectiveCaller.name, 'ID:', effectiveCaller.userId);
      setCallStatus('connecting');
      
      // Ensure any existing connections are cleaned up first
      cleanupResources();
      
      // Add a small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const stream = await getLocalStream();
      const pc = await createPeerConnection(stream);
      
      sendSignalingMessage({
        type: 'call-accepted',
        from: userName,
        role: userRole,
        userId: userId,
        to: effectiveCaller.userId
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
      cleanupResources();
    } finally {
      // Reset the processing flag even if there was an error
      setTimeout(() => {
        isProcessingCallRef.current = false;
      }, 1000);
    }
  };

  const rejectCall = (callerParam) => {
    // Use passed caller info or existing state
    const effectiveCaller = callerParam || callerInfo;
    
    console.log('Rejecting call from:', effectiveCaller?.name);
    
    if (!effectiveCaller || !effectiveCaller.userId) {
      console.error('Missing caller information. Cannot reject call properly.');
      setCallStatus('idle');
      setCallerInfo(null);
      return;
    }
    
    sendSignalingMessage({
      type: 'call-rejected',
      reason: 'Call rejected by user',
      from: userName,
      role: userRole,
      userId: userId,
      to: effectiveCaller.userId
    });
    
    setCallStatus('idle');
    setCallerInfo(null);
    
    if (onCallRejected) {
      onCallRejected();
    }
  };

  const endCall = (reason = 'Call ended') => {
    console.log('Ending call, reason:', reason);
    
    // Send call-ended message only if we're in a call and socket is connected
    if (inCall && socket && socket.readyState === WebSocket.OPEN) {
      try {
        sendSignalingMessage({
          type: 'call-ended',
          reason,
          from: userName,
          role: userRole,
          userId: userId
        });
      } catch (error) {
        console.error('Error sending call-ended message:', error);
      }
    }
    
    // Clean up all WebRTC resources
    cleanupResources();
    
    // Always call onCallEnded callback
    if (onCallEnded) {
      onCallEnded(reason);
    }
  };
  const handleOffer = async (message) => {
    try {
      // Check if we're already in a call that we want to prioritize
      if (inCall && callStatus === 'active' && peerState === 'connected') {
        console.log('Already in an active call, ignoring new offer');
        return;
      }
      
      console.log('Handling offer from:', message.sender_id);
      
      // Ensure peer connection is ready or create a new one
      if (!isPeerConnectionUsable()) {
        console.log('Creating new peer connection for offer');
        const stream = await getLocalStream();
        await createPeerConnection(stream);
        
        // Double check the connection was created successfully
        if (!isPeerConnectionUsable()) {
          throw new Error('Failed to create peer connection');
        }
      }
      
      // Log the original offer SDP
      console.log('Original offer SDP:', message.offer.sdp);
      
      // Ensure video codec support
      let sdp = message.offer.sdp;
      
      // Force video receive direction if needed
      if (!sdp.includes('a=sendrecv') && !sdp.includes('a=recvonly')) {
        console.log('Adding sendrecv to SDP to ensure video flow');
        sdp = sdp.replace(/m=video.*\r\n/g, (match) => {
          return match + 'a=sendrecv\r\n';
        });
      }
      
      // Create a modified offer with our adjusted SDP
      const modifiedOffer = {
        ...message.offer,
        sdp: sdp
      };
      
      // Set the remote description safely
      const success = await safeSetRemoteDescription(modifiedOffer);
      if (!success) {
        throw new Error('Failed to set remote description');
      }
      
      // Apply any buffered ICE candidates now that remote description is set
      await applyPendingIceCandidates();
      
      // Create an answer
      if (!isPeerConnectionUsable()) {
        throw new Error('Peer connection became unusable');
      }
      
      const answer = await peerConnection.current.createAnswer();
      
      // Log the original answer SDP
      console.log('Original answer SDP:', answer.sdp);
      
      // Ensure our answer has video marked as sendrecv
      let answerSdp = answer.sdp;
      
      // Force video direction in our answer too
      if (!answerSdp.includes('a=sendrecv')) {
        console.log('Adding sendrecv to answer SDP');
        answerSdp = answerSdp.replace(/m=video.*\r\n/g, (match) => {
          return match + 'a=sendrecv\r\n';
        });
      }
      
      // Create modified answer
      const modifiedAnswer = {
        ...answer,
        sdp: answerSdp
      };
      
      // Set local description safely
      if (!isPeerConnectionUsable()) {
        throw new Error('Peer connection became unusable');
      }
      
      await peerConnection.current.setLocalDescription(modifiedAnswer);
      
      // Send the answer
      sendSignalingMessage({
        type: 'answer',
        answer: modifiedAnswer,
        from: userName,
        role: userRole,
        userId: userId,
        to: message.sender_id
      });
      
      console.log('Sent answer to:', message.sender_id);
      
      // Update call status
      if (callStatus === 'connecting') {
        setCallStatus('connecting-established');
      }
      
    } catch (error) {
      console.error('Error handling offer:', error);
      setCallError(`Error establishing call: ${error.message}`);
      // Don't end the call immediately - give it a chance to recover
    }
  };

  const reconnectSignalingSocket = async () => {
    if (socket) {
      try {
        socket.close();
      } catch (e) {
        console.error('Error closing existing socket:', e);
      }
    }
    
    // Set a flag to indicate we're attempting reconnection
    console.log('Attempting to reconnect to signaling socket...');
    
    try {
      const response = await axios.get('http://localhost:8000/api/ws-auth-token/', {
        withCredentials: true,
        timeout: 5000 // Add timeout
      });
      
      const token = response.data.access_token;
      if (!token) throw new Error('No authentication token received');
      
      const wsUrl = `ws://localhost:8000/ws/webrtc/${jobId}/?token=${encodeURIComponent(token)}`;
      console.log('Reconnecting to signaling WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      // Create a timeout promise to detect connection failures
      const connectionTimeout = new Promise((_, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000); // 5 seconds timeout
        
        // Store the timeout ID so we can clear it if connection succeeds
        ws.timeoutId = timeoutId;
      });
      
      // Create a connection promise
      const connectionPromise = new Promise((resolve, reject) => {
        ws.onopen = () => {
          console.log('WebRTC signaling reconnected successfully');
          setSocketConnected(true);
          setCallError(null);
          clearTimeout(ws.timeoutId); // Clear the timeout
          
          // Send any pending messages
          if (window.pendingSignalingMessages && window.pendingSignalingMessages.length > 0) {
            console.log(`Sending ${window.pendingSignalingMessages.length} pending messages`);
            window.pendingSignalingMessages.forEach(msg => {
              try {
                ws.send(JSON.stringify(msg));
              } catch (err) {
                console.error('Error sending buffered message:', err);
              }
            });
            window.pendingSignalingMessages = [];
          }
          
          resolve(ws);
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket reconnection error:', error);
          reject(error);
        };
      });
      
      // Set up the message and close handlers
      ws.onmessage = (event) => handleSignalingMessage(JSON.parse(event.data));
      
      ws.onclose = (event) => {
        console.log(`WebSocket reconnection closed: code=${event.code}, reason=${event.reason}`);
        setSocketConnected(false);
        
        if (inCall && !event.wasClean) {
          console.log('Socket closed while in call - attempting to reconnect again');
          setTimeout(() => reconnectSignalingSocket(), 2000);
        }
      };
      
      // Race the connection promise against the timeout
      const newSocket = await Promise.race([connectionPromise, connectionTimeout]);
      setSocket(newSocket);
      return newSocket;
      
    } catch (error) {
      console.error('Failed to reconnect to signaling server:', error);
      setCallError('Failed to connect to call server. Retrying...');
      
      if (inCall) {
        // Try again with exponential backoff
        setTimeout(() => reconnectSignalingSocket(), 5000);
      }
      return null;
    }
  };
  // Add this function definition to fix the "bufferMessageAndReconnect is not defined" error

const bufferMessageAndReconnect = (message) => {
    // Initialize pending messages array if not exists
    if (!window.pendingSignalingMessages) {
      window.pendingSignalingMessages = [];
    }
    
    // Add message to buffer if not already present (avoid duplicates)
    const messageExists = window.pendingSignalingMessages.some(
      m => m.type === message.type && m.to === message.to
    );
    
    if (!messageExists) {
      window.pendingSignalingMessages.push(message);
      console.log('Message buffered for later delivery:', message.type);
    }
    
    // Handle reconnection based on socket state
    if (!socket || socket.readyState === WebSocket.CLOSED) {
      console.log('Socket is closed, attempting to reconnect');
      reconnectSignalingSocket();
    } else if (socket.readyState === WebSocket.CONNECTING) {
      console.log('Socket is already connecting, waiting...');
      // Try to send after the socket connects
      setTimeout(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          console.log('Socket connected, sending buffered messages');
          sendBufferedMessages();
        } else {
          console.log('Socket still not ready, will retry on connection');
        }
      }, 2000);
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
      console.log('Received answer from:', message.sender_id, message.answer);
    } catch (error) {
      console.error('Error handling answer:', error);
      setCallError(`Error establishing call: ${error.message}`);
      endCall('Failed to establish call');
    }
  };

  const handleIceCandidate = async (message) => {
    try {
      console.log('Handling ICE candidate from:', message.sender_id);
      
      if (!isPeerConnectionUsable()) {
        console.log('Cannot handle ICE candidate - peer connection not usable');
        return;
      }
      
      if (peerConnection.current.remoteDescription && 
          peerConnection.current.remoteDescription.type) {
        // Remote description is set, add the candidate immediately
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(message.candidate));
      } else {
        // Buffer the candidate for later
        console.log('Remote description not set yet, buffering ICE candidate');
        setPendingIceCandidates(prev => [...prev, message.candidate]);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };
  
  
  const applyPendingIceCandidates = async () => {
    if (!isPeerConnectionUsable()) return;
    
    if (pendingIceCandidates.length > 0) {
      console.log('Applying buffered ICE candidates:', pendingIceCandidates.length);
      
      for (const candidate of pendingIceCandidates) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error applying buffered ICE candidate:', err);
        }
      }
      
      setPendingIceCandidates([]); // Clear the buffer after applying
    }
  };
  const handleCallRequest = (message) => {
    console.log('handleCallRequest invoked with message:', message);
    console.log(`Incoming call from ${message.from || message.sender_name} (${message.role || message.sender_role})`, message);
    if (!message.sender_id && !message.userId) {
      console.error('Missing sender ID in call request');
      return;
    }
    if (inCall) {
      console.log('Already in a call, rejecting');
      sendSignalingMessage({
        type: 'call-rejected',
        reason: 'User is busy in another call',
        from: userName,
        role: userRole,
        userId: userId,
        to: message.sender_id || message.userId
      });
      return;
    }
    const caller = {
      name: message.from || message.sender_name,
      role: message.role || message.sender_role || 'User',
      userId: message.sender_id || message.userId
    };
    console.log('Setting caller info:', caller);
    setCallerInfo(caller);
    currentCallerRef.current = caller;
    setCallStatus('incoming');
    if (onIncomingCall) {
      console.log('Notifying parent of incoming call:', caller);
      onIncomingCall(caller);
    }
  };
  useEffect(() => {
    // Socket health check interval
    let healthCheckInterval;
    
    if (socket && socketConnected) {
      healthCheckInterval = setInterval(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          console.warn('Socket not in OPEN state during health check');
          setSocketConnected(false);
          
          if (inCall) {
            reconnectSignalingSocket();
          }
        } else {
          // Send a lightweight ping to keep connection alive
          try {
            socket.send(JSON.stringify({ 
              type: 'ping',
              sender_id: userId,
              sender_name: userName
            }));
          } catch (err) {
            console.error('Error sending ping during health check:', err);
            setSocketConnected(false);
            reconnectSignalingSocket();
          }
        }
      }, 15000); // Check every 15 seconds
    }
    
    return () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, [socket, socketConnected, inCall, userId, userName]);
  
useEffect(() => {
    console.log('VideoCall component mounted with props:', {
      jobId, userName, userRole, userId, job,
      callStatus: externalCallStatus, 
      acceptedCall
    });
    
    return () => {
      console.log('VideoCall component unmounting');
    };
  }, []);

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

  const cleanupResources = () => {
  console.log('Performing thorough cleanup of WebRTC resources');
  
  // Check if a cleanup is already in progress
  if (isCleaningUpRef.current) {
    console.log('Cleanup already in progress, waiting...');
    return;
  }
  
  isCleaningUpRef.current = true;
  
  try {
    // Stop timers
    if (callTimer.current) {
      clearInterval(callTimer.current);
      callTimer.current = null;
    }
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (err) {
          console.warn('Error stopping track:', err);
        }
      });
      setLocalStream(null);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }
    
    // Close peer connection
    closeConnection();
    
    // Reset states
    setInCall(false); // Explicitly set to false to ensure we can accept new calls
    setCallStatus('idle');
    callDuration.current = 0;
    setCallTime('00:00');
    // Don't reset callerInfo here - it may lead to races with acceptCall
  } finally {
    // Reset the cleaning flag with a delay
    setTimeout(() => {
      isCleaningUpRef.current = false;
    }, 500);
  }
};
  const safeSetRemoteDescription = async (description) => {
    if (!peerConnection.current) {
      console.error('Cannot set remote description - peer connection is null');
      return false;
    }
    
    if (peerConnection.current.signalingState === 'closed') {
      console.error('Cannot set remote description - peer connection is closed');
      return false;
    }
    
    try {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(description));
      return true;
    } catch (error) {
      console.error('Error setting remote description:', error);
      return false;
    }
  };
  // Debug function to help troubleshoot stream issues
  const debugStreams = () => {
    console.log('==== STREAM DEBUG INFO ====');
    
    if (localStream) {
      console.log('Local stream:', localStream.id);
      console.log('Local tracks:', localStream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      })));
    } else {
      console.log('No local stream available');
    }
    
    if (remoteStream) {
      console.log('Remote stream:', remoteStream.id);
      console.log('Remote tracks:', remoteStream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState
      })));
    } else {
      console.log('No remote stream available');
    }
    
    if (peerConnection.current) {
      console.log('PeerConnection state:', peerConnection.current.connectionState);
      console.log('ICE Connection state:', peerConnection.current.iceConnectionState);
      console.log('Signaling state:', peerConnection.current.signalingState);
      
      const senders = peerConnection.current.getSenders();
      console.log('RTCPeerConnection senders:', senders.length);
      
      const receivers = peerConnection.current.getReceivers();
      console.log('RTCPeerConnection receivers:', receivers.length);
      receivers.forEach((receiver, i) => {
        console.log(`Receiver ${i}:`, receiver.track?.kind, 'enabled:', receiver.track?.enabled);
      });
    } else {
      console.log('No peer connection available');
    }
    
    console.log('==== END DEBUG INFO ====');
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
  const recoverFromError = (errorMessage) => {
    console.log('Attempting to recover from error:', errorMessage);
    
    // Clean up resources
    cleanupResources();
    
    // Reset state
    setCallStatus('idle');
    setCallError(errorMessage);
    
    // Attempt to reconnect signaling if that was the issue
    if (errorMessage.includes('connection') || errorMessage.includes('socket')) {
      reconnectSignalingSocket();
    }
    
    // After a brief delay, allow the user to try again
    setTimeout(() => {
      setCallError(errorMessage + ' - You can try the call again.');
    }, 3000);
  };
  useEffect(() => {
    if (!peerConnection.current) return;
    
    const handleIceConnectionStateChange = () => {
      const state = peerConnection.current.iceConnectionState;
      console.log('ICE connection state change:', state);
      
      switch (state) {
        case 'connected':
        case 'completed':
          setCallStatus('active');
          startCallTimer();
          break;
          
        case 'failed':
          console.error('ICE connection failed');
          recoverIceConnection();
          break;
          
        case 'disconnected':
          console.warn('ICE connection disconnected - may recover automatically');
          // Start a timer to check if it recovers
          setTimeout(() => {
            if (peerConnection.current && 
                peerConnection.current.iceConnectionState === 'disconnected') {
              console.warn('ICE still disconnected after timeout, attempting recovery');
              recoverIceConnection();
            }
          }, 5000);
          break;
          
        case 'closed':
          endCall('Connection closed');
          break;
      }
    };
    
    peerConnection.current.addEventListener('iceconnectionstatechange', handleIceConnectionStateChange);
    
    return () => {
      if (peerConnection.current) {
        peerConnection.current.removeEventListener('iceconnectionstatechange', handleIceConnectionStateChange);
      }
    };
  }, [peerConnection.current]);
  
  // Add this function to help with ICE connection recovery
  const recoverIceConnection = () => {
    console.log('Attempting to recover ICE connection...');
    
    // Try restarting ICE
    if (peerConnection.current && isPeerConnectionUsable()) {
      try {
        // For the caller, create a new offer with ICE restart
        if (userRole === 'professional') {
          console.log('Creating new offer with ICE restart');
          
          peerConnection.current.createOffer({ iceRestart: true })
            .then(offer => {
              return peerConnection.current.setLocalDescription(offer);
            })
            .then(() => {
              let recipientId = job?.client_id || callerInfo?.userId;
              sendSignalingMessage({
                type: 'offer',
                offer: peerConnection.current.localDescription,
                from: userName,
                role: userRole,
                userId: userId,
                to: recipientId
              });
            })
            .catch(err => {
              console.error('Error during ICE restart:', err);
            });
        }
        // For the answerer, we wait for a new offer
      } catch (err) {
        console.error('Error attempting to recover ICE connection:', err);
      }
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
      <video 
        ref={remoteVideoRef}
        autoPlay 
        playsInline 
        muted={false}
        className="remote-video"
        onLoadedMetadata={() => {
          console.log('Remote video metadata loaded');
          // Try to automatically play the video when loaded
          if (remoteVideoRef.current) {
            const playPromise = remoteVideoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(err => {
                console.warn('Auto-play prevented:', err);
              });
            }
          }
        }}
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '70vh',
          objectFit: 'cover', // Changed from contain to cover
          backgroundColor: '#000',
          border: '1px solid #ddd',
        }}
      />
    ) : (
      <div className="connecting-placeholder">
        <div className="connecting-spinner"></div>
        <p>{callStatus === 'connecting' ? 'Calling...' : 'Waiting for video...'}</p>
      </div>
    )}
  </div>
  
  <div className="connection-quality-indicator">
    {connectionQuality !== 'unknown' && (
      <div className={`quality-indicator ${connectionQuality}`}>
        <span>Connection: {connectionQuality}</span>
      </div>
    )}
  </div>
  
  <div className="local-video-container">
    <video
      ref={localVideoRef}
      autoPlay
      playsInline
      muted={true}  // Local must be muted to prevent echo
      className="local-video"
      onLoadedMetadata={() => console.log('Local video metadata loaded')}
    />
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
  <button 
    className={`audio-button ${audioEnabled ? '' : 'muted'}`} 
    onClick={toggleAudio}
    title={audioEnabled ? "Mute microphone" : "Unmute microphone"}
  >
    {audioEnabled ? '🎙️' : '🔇'}
  </button>
  <button 
    className={`video-button ${videoEnabled ? '' : 'disabled'}`} 
    onClick={toggleVideo}
    title={videoEnabled ? "Turn off camera" : "Turn on camera"}
  >
    {videoEnabled ? '📹' : '🚫'}
  </button>
  <button 
    className="fullscreen-button" 
    onClick={toggleFullScreen}
    title={isFullScreen ? "Exit fullscreen" : "Go fullscreen"}
  >
    {isFullScreen ? '↙️' : '↗️'}
  </button>
  <button 
    className="end-call-button" 
    onClick={() => endCall('Call ended by user')}
    title="End call"
  >
    📵 End Call
  </button>
</div>
        </>
      )}
    </div>
  );
});

export default VideoCall;