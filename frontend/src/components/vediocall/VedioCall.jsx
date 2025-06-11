import React, { useState, useEffect, useRef ,useContext} from 'react';
import './VideoCall.css';
import { AuthContext } from '../../context/AuthContext';
const baseUrl = import.meta.env.VITE_API_URL;
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function VideoCall({ jobId, userInfo, onEndCall }) {
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, connecting, connected
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const { user} = useContext(AuthContext); 
  const iceCandidatesBuffer = useRef([]);
  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [remoteUserReady, setRemoteUserReady] = useState(false);
  


  // Setup WebSocket connection
  // Replace this section in your VideoCall component:

// Setup WebSocket connection
// Replace this section in your VideoCall component:

// Setup WebSocket connection
useEffect(() => {
  const connectWebSocket = async () => {
    try {
      if (socket) {
        socket.close();
      }

      console.log('Getting video call WebSocket auth token...');
      const response = await fetch('https://api.midhung.in/api/ws-auth-token/', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get auth token: ${response.status}`);
      }
      
      // FIX: Add await keyword here
      const data = await response.json();
      const token = data.access_token;

      if (!token) {
        throw new Error('No WebSocket auth token received');
      }

      // FIXED: Proper WebSocket URL construction
      // Extract hostname from baseUrl and construct proper WebSocket URL
      const getWebSocketUrl = (httpUrl) => {
        try {
          const url = new URL(httpUrl);
          const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
          return `${wsProtocol}//${url.host}`;
        } catch (error) {
          console.error('Error parsing base URL:', error);
          // Fallback
          return 'wss://api.midhung.in';
        }
      };

      const wsBaseUrl = getWebSocketUrl(baseUrl);
      const wsUrl = `${wsBaseUrl}/ws/video-call/${jobId}/?token=${encodeURIComponent(token)}`;
      
      console.log('Base URL:', baseUrl);
      console.log('WebSocket Base URL:', wsBaseUrl);
      console.log('Connecting to video call WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Video call WebSocket connected successfully');
        setSocketConnected(true);
        setSocketError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received video call message:', data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing video call message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Video call WebSocket error:', error);
        setSocketConnected(false);
        setSocketError('Connection error. Please try again.');
      };

      ws.onclose = (event) => {
        console.log(`Video call WebSocket closed: code=${event.code}`);
        setSocketConnected(false);
        
        if (event.code === 4001) {
          setSocketError('Authentication failed. Please log in again.');
        } else if (event.code === 4003) {
          setSocketError('You do not have permission to join this call.');
        } else {
          setSocketError('Connection closed. Please try again.');
        }
      };

      setSocket(ws);
    } catch (error) {
      console.error('Failed to connect to video call:', error);
      setSocketConnected(false);
      setSocketError(`Connection failed: ${error.message}`);
    }
  };

  connectWebSocket();

  // Cleanup on unmount
  return () => {
    cleanupCall();
    if (socket) {
      socket.close();
    }
  };
}, [jobId]);

  // Process buffered ICE candidates after remote description is set
  const processBufferedIceCandidates = () => {
    if (!peerConnectionRef.current) return;
    
    console.log(`Processing ${iceCandidatesBuffer.current.length} buffered ICE candidates`);
    
    iceCandidatesBuffer.current.forEach(async (candidate) => {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('Added buffered ICE candidate');
      } catch (err) {
        console.error('Error adding buffered ICE candidate:', err);
      }
    });
    
    // Clear the buffer
    iceCandidatesBuffer.current = [];
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    console.log(`Processing message type: ${data.type}, callStatus: ${callStatus}`);
    // Ensure userInfo exists
    if (!userInfo || !userInfo.id) {
        console.log('User info not available, ignoring message');
        return;
    }

    const eventType = data.type || data.event;
    console.log(`Processing ${eventType} message`);
    
    // Parse both IDs as integers for consistent comparison
    const myId = parseInt(userInfo.id, 10);
    
    switch (eventType) {
        case 'offer':
            if (!data.caller_id) {
                console.error('Received offer without caller_id');
                return;
            }
            
            const callerId = parseInt(data.caller_id, 10);
            console.log(`Call offer: from=${callerId}, me=${myId}`);
            
            // If it's not from myself
            if (callerId !== myId) {
                console.log(`Incoming call from ${data.caller_name}`);
                setIncomingCall(data);
            } else {
                console.log('Ignoring my own offer');
            }
            break;

        case 'answer':
            if (!data.answerer_id) {
                console.error('Received answer without answerer_id');
                return;
            }
            
            const answererId = parseInt(data.answerer_id, 10);
            if (answererId !== myId) {
                console.log(`Received answer from user ${answererId}`);
                handleCallAnswered(data);
            } else {
                console.log('Ignoring own answer');
            }
            break;

        case 'ice_candidate':
            if (!data.sender_id) {
                console.error('Received ICE candidate without sender_id');
                return;
            }
            
            const iceSenderId = parseInt(data.sender_id, 10);
            if (iceSenderId !== myId) {
                console.log(`Received ICE candidate from ${iceSenderId}`);
                const iceCandidate = data.ice_candidate;
                if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) {
                    console.log('Buffering ICE candidate for later');
                    iceCandidatesBuffer.current.push(iceCandidate);
                } else {
                    handleNewICECandidate(data);
                }
            } else {
                console.log('Ignoring own ICE candidate');
            }
            break;

        case 'call_ended':
            if (!data.user_id) {
                console.error('Received call_ended without user_id');
                return;
            }
            
            const endedUserId = parseInt(data.user_id, 10);
            if (endedUserId !== myId) {
                handleCallEnded(data);
            } else {
                console.log('Ignoring own call end notification');
            }
            break;
            
        case 'ready_to_call':
                if (!data.user_id) {
                    console.error('Received ready_to_call without user_id');
                    return;
                }
                const readyUserId = parseInt(data.user_id, 10);
                if (readyUserId !== myId) {
                    console.log(`User ${data.user_name} (${readyUserId}) is ready to receive a call`);
                    setRemoteUserReady(true);
                    console.log(`Current callStatus: ${callStatus}`);
                    if (callStatus === 'initializing' && parseInt(userInfo.id, 10) < readyUserId) {
                        console.log('This user initiates the offer');
                        createAndSendOffer();
                    }
                }
                break;
            
        case 'ping':
            console.log(`Received ping message: ${data.message}`);
            break;
            
        case 'testing_signal':
            console.log(`Received test signal: ${data.message}`);
            break;

        default:
            console.log('Unknown message type:', eventType);
    }
};
  

  // Initialize media devices and get local stream
  const initializeMediaDevices = async () => {
    try {
      // Stop any existing tracks
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      console.log('Requesting camera and microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      
      console.log('Media access granted');
      
      // Set the stream to the video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setSocketError(`Cannot access camera or microphone: ${error.message}`);
      throw error;
    }
  };
// Add this to your useEffect that runs when remoteStream changes
useEffect(() => {
    if (remoteStream) {
      console.log('Remote stream received with tracks:', 
        remoteStream.getTracks().map(t => `${t.kind} (enabled: ${t.enabled})`).join(', ')
      );
      
      // Check if tracks are actually active
      remoteStream.getTracks().forEach(track => {
        console.log(`Remote ${track.kind} track ready:`, track.readyState);
        track.onended = () => console.log(`Remote ${track.kind} track ended`);
        track.onmute = () => console.log(`Remote ${track.kind} track muted`);
        track.onunmute = () => console.log(`Remote ${track.kind} track unmuted`);
      });
    }
  }, [remoteStream]);
  // Create RTCPeerConnection
  const createPeerConnection = (stream) => {
    console.log('Creating peer connection...');
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);
    
    // Clear any previous ICE candidates
    iceCandidatesBuffer.current = [];
    
    // Add local tracks to the peer connection
    stream.getTracks().forEach(track => {
      console.log(`Adding ${track.kind} track to peer connection`);
      peerConnection.addTrack(track, stream);
    });
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
        sendICECandidate(event.candidate);
      }
    };
    
    // Log ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peerConnection.iceConnectionState);
      
      if (peerConnection.iceConnectionState === 'failed' || 
          peerConnection.iceConnectionState === 'disconnected') {
        console.error('ICE connection failed');
        setSocketError('Call connection failed. Please try again.');
        if (callStatus === 'connected' || callStatus === 'connecting') {
          cleanupCall();
        }
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'connected') {
        console.log('Peer connection established');
        setCallStatus('connected');
      }
    };
    
    // Handle incoming remote tracks
    peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      
      if (remoteVideoRef.current && event.streams[0]) {
        console.log('Setting remote stream to video element');
        remoteVideoRef.current.srcObject = event.streams[0];
        setRemoteStream(event.streams[0]);
      }
    };
    
    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };
// Add this to your VideoCall component
useEffect(() => {
    if (peerConnectionRef.current) {
      const pc = peerConnectionRef.current;
      
      pc.onconnectionstatechange = () => {
        console.log(`Connection state changed to: ${pc.connectionState}`);
        if (pc.connectionState === 'connected') {
          setCallStatus('connected');
          console.log('Connection established successfully!');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          console.error(`Connection failed or closed: ${pc.connectionState}`);
          setSocketError('Connection failed. Please try again.');
          cleanupCall();
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        console.log(`ICE connection state changed to: ${pc.iceConnectionState}`);
      };
      
      pc.onicegatheringstatechange = () => {
        console.log(`ICE gathering state changed to: ${pc.iceGatheringState}`);
      };
      
      pc.onsignalingstatechange = () => {
        console.log(`Signaling state changed to: ${pc.signalingState}`);
      };
    }
  }, [peerConnectionRef.current]);
  // Start a new call (caller)
  // Update startCall to not immediately send an offer
  // In VideoCall.jsx, modify the startCall function
const startCall = async () => {
    if (!socketConnected) {
      setSocketError('Cannot start call while disconnected');
      return;
    }
    
    try {
      console.log('Starting call...');
      setCallStatus('initializing');
      
      // First, get access to media
      const stream = await initializeMediaDevices();
      
      // Create peer connection with the local stream
      createPeerConnection(stream);
      
      // Create and send the offer immediately - don't wait for ready signals
      console.log('Creating offer...');
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      
      console.log('Setting local description...');
      await peerConnectionRef.current.setLocalDescription(offer);
      
      console.log('Sending offer...');
      socket.send(JSON.stringify({
        type: 'offer',
        offer: offer,
        caller_id: userInfo.id,
        caller_name: userInfo.name,
        caller_role: userInfo.role
      }));
      
      setCallStatus('calling');
      
    } catch (error) {
      console.error('Error starting call:', error);
      setCallStatus('idle');
      setSocketError(`Failed to start call: ${error.message}`);
    }
  };
  
  // New function to create and send offer
  const createAndSendOffer = async () => {
    try {
        if (!peerConnectionRef.current) {
            console.error('No peer connection available');
            return;
        }
        console.log('Creating and sending offer...');
        setCallStatus('calling');
        console.log('Creating offer...');
        const offer = await peerConnectionRef.current.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        console.log('Setting local description...');
        await peerConnectionRef.current.setLocalDescription(offer);
        console.log('Local SDP set successfully');
        console.log('Sending offer over WebSocket...');
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'offer',
                offer: offer,
                caller_id: userInfo.id,
                caller_name: userInfo.name
            }));
            console.log('Offer sent successfully');
        } else {
            console.error('WebSocket not open');
        }
    } catch (error) {
        console.error('Error creating or sending offer:', error);
        setCallStatus('idle');
        setSocketError(`Failed to create offer: ${error.message}`);
    }
};
  // Accept incoming call
  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    
    try {
      const { offer } = incomingCall;
      
      console.log('Accepting incoming call...');
      setCallStatus('connecting');
      
      // Get media stream and create peer connection
      const stream = await initializeMediaDevices();
      const peerConnection = createPeerConnection(stream);
      
      // Set remote description (from offer)
      console.log('Setting remote description from offer...');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Now that remote description is set, process any buffered ICE candidates
      processBufferedIceCandidates();
      
      // Create answer
      console.log('Creating answer...');
      const answer = await peerConnection.createAnswer();
      
      // Set local description
      console.log('Setting local description...');
      await peerConnection.setLocalDescription(answer);
      
      // Send answer to caller
      console.log('Sending answer...');
      socket.send(JSON.stringify({
        type: 'answer',
        answer: answer,
      }));
      
      setIncomingCall(null);
      
    } catch (error) {
      console.error('Error accepting call:', error);
      setCallStatus('idle');
      setSocketError(`Error accepting call: ${error.message}`);
      setIncomingCall(null);
    }
  };

  // Decline incoming call
  const declineIncomingCall = () => {
    if (!incomingCall) return;
    
    console.log('Declining incoming call');
    if (socket && socketConnected) {
      socket.send(JSON.stringify({
        type: 'end_call',
      }));
    }
    
    setIncomingCall(null);
  };

  // Handle call answer (caller)
  // In VideoCall.jsx, modify the handleCallAnswered function
const handleCallAnswered = async (data) => {
    try {
      console.log('Call answered:', data);
      
      if (!peerConnectionRef.current) {
        console.error('No peer connection when receiving answer');
        return;
      }
      
      // Always process the answer, regardless of current state
      console.log('Setting remote description from answer...');
      await peerConnectionRef.current.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
      console.log('Remote SDP set successfully');
      
      // Process any buffered ICE candidates
      processBufferedIceCandidates();
      
      setCallStatus('connecting');
      console.log('Waiting for connection to establish...');
      
    } catch (error) {
      console.error('Error handling call answer:', error);
      setSocketError(`Connection error: ${error.message}`);
    }
  };

  // Handle new ICE candidate
  // In VideoCall.jsx, modify the handleNewICECandidate function
const handleNewICECandidate = async (data) => {
    try {
      if (!peerConnectionRef.current) {
        console.log('No peer connection when receiving ICE candidate, buffering for later');
        iceCandidatesBuffer.current.push(data.ice_candidate);
        return;
      }
      
      if (!peerConnectionRef.current.remoteDescription) {
        console.log('Remote description not set yet, buffering ICE candidate');
        iceCandidatesBuffer.current.push(data.ice_candidate);
        return;
      }
      
      const iceCandidate = data.ice_candidate;
      
      if (!iceCandidate) {
        console.error('Received null or undefined ICE candidate');
        return;
      }
      
      console.log('Adding ICE candidate:', iceCandidate);
      
      const candidate = new RTCIceCandidate(iceCandidate);
      await peerConnectionRef.current.addIceCandidate(candidate);
      console.log('Successfully added ICE candidate');
      
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };
  // Send ICE candidate to peer
  const sendICECandidate = (candidate) => {
    if (socket && socketConnected) {
      // Log the candidate you're sending
      console.log('Sending ICE candidate:', candidate);
      
      socket.send(JSON.stringify({
        type: 'ice_candidate',
        ice_candidate: candidate,  // Make sure the full candidate object is sent
      }));
    }
  };

  // Handle call ended by remote user
  const handleCallEnded = (data) => {
    console.log('Call ended by remote user:', data.user_name);
    if (callStatus === 'connected' || callStatus === 'connecting' || callStatus === 'calling') {
      alert(`${data.user_name} ended the call`);
    }
    cleanupCall();
    onEndCall(); // Hide the video interface when remote user ends the call
  };

  // End call (initiated by local user)
  const endCall = () => {
    console.log('Ending call...');
    
    if (socket && socketConnected) {
      socket.send(JSON.stringify({
        type: 'end_call',
      }));
    }
    
    cleanupCall();
    onEndCall(); // Hide the video interface only when user ends the call
  };

  // Clean up resources after call ends
  const cleanupCall = () => {
    console.log('Cleaning up call resources...');
    
    if (localStream) {
      localStream.getTracks().forEach(track => {
        console.log(`Stopping ${track.kind} track`);
        track.stop();
      });
    }
    
    if (peerConnectionRef.current) {
      console.log('Closing peer connection');
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setRemoteUser(null);
    setIncomingCall(null);
    iceCandidatesBuffer.current = [];
    // Note: onEndCall is NOT called here
  };

  // Toggle audio mute
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log(`${track.enabled ? 'Unmuted' : 'Muted'} audio`);
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log(`${track.enabled ? 'Enabled' : 'Disabled'} video`);
      });
      setIsVideoOff(!isVideoOff);
    }
  };
  const testConnection = () => {
    if (!socketConnected) {
      alert("WebSocket not connected!");
      return;
    }
    
    // Test WebSocket
    socket.send(JSON.stringify({
      type: 'ping',
      message: `Ping test from ${userInfo.name} (ID: ${userInfo.id})`,
      timestamp: new Date().toISOString()
    }));
    
    // Test peer connection state if it exists
    if (peerConnectionRef.current) {
      console.log({
        signalingState: peerConnectionRef.current.signalingState,
        iceConnectionState: peerConnectionRef.current.iceConnectionState,
        iceGatheringState: peerConnectionRef.current.iceGatheringState,
        connectionState: peerConnectionRef.current.connectionState,
        localDescription: peerConnectionRef.current.localDescription ? 'Set' : 'Not set',
        remoteDescription: peerConnectionRef.current.remoteDescription ? 'Set' : 'Not set',
        bufferedCandidates: iceCandidatesBuffer.current.length
      });
    } else {
      console.log("No peer connection created yet");
    }
  };
  return (
    
    <div className="video-call-container">
     
      {incomingCall && (
        <div className="incoming-call-banner">
          <div className="incoming-call-info">
            <span className="incoming-call-icon">📞</span>
            <p>Incoming call from {incomingCall.caller_name}</p>
          </div>
          <div className="incoming-call-buttons">
            <button className="accept-call-button" onClick={acceptIncomingCall}>
              Accept
            </button>
            <button className="decline-call-button" onClick={declineIncomingCall}>
              Decline
            </button>
          </div>
        </div>
      )}
      
      {callStatus === 'idle' && !incomingCall ? (
  <div className="start-call-section">
    {remoteUserReady ? (
      <div className="remote-ready-indicator">
        <p className="ready-text">✅ The other user is online and ready to receive calls!</p>
      </div>
    ) : (
      <div className="waiting-indicator">
        <p className="waiting-text">⏳ Waiting for the other user to join...</p>
      </div>
    )}
    <button 
      className="start-call-button" 
      onClick={startCall}
      disabled={!socketConnected}
    >
      <span role="img" aria-label="camera">📹</span> Start Video Call
    </button>
    {!socketConnected && !socketError && (
      <p className="connecting-message">Connecting to video service...</p>
    )}
  </div>
) : (
        <div className="active-call-container">
          <div className="videos-grid">
            <div className="remote-video-container">
            <div className="debug-controls">
  
 

<div className="connection-status">
  <div className={`status-indicator ${peerConnectionRef.current?.iceConnectionState || 'disconnected'}`}></div>
  <span>{peerConnectionRef.current?.iceConnectionState || 'Not connected'}</span>
</div>

 
</div>
         
            <div className="signaling-status">
  
</div>
            <div className="signaling-status">
  {socketConnected ? (
    <span className="status-connected">WebSocket Connected</span>
  ) : (
    <span className="status-disconnected">WebSocket Disconnected</span>
  )}
  {callStatus !== 'idle' && <span> • Call Status: {callStatus}</span>}
</div>
<div className="remote-video-container">
  <video 
    ref={remoteVideoRef} 
    className="remote-video" 
    autoPlay 
    playsInline
    controls // Add controls to help with playback issues
    onLoadedMetadata={() => console.log('Remote video loaded metadata')}
    onPlay={() => console.log('Remote video playback started')}
  />
  {(callStatus === 'calling' || callStatus === 'connecting') && (
    <div className="calling-overlay">
      <p>{callStatus === 'calling' ? 'Calling...' : 'Connecting...'}</p>
    </div>
  )}
</div>
              {(callStatus === 'calling' || callStatus === 'connecting') && (
                <div className="calling-overlay">
                  <p>{callStatus === 'calling' ? 'Calling...' : 'Connecting...'}</p>
                </div>
              )}
            </div>
            <div className="local-video-container">
              <video ref={localVideoRef} className="local-video" autoPlay playsInline muted />
              {isVideoOff && (
                <div className="video-off-indicator">
                  <p>Camera Off</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="call-controls">
            <button 
              className={`control-button ${isMuted ? 'active' : ''}`} 
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              <span role="img" aria-label={isMuted ? "unmute" : "mute"}>
                {isMuted ? '🔇' : '🎤'}
              </span>
            </button>
            <button 
              className={`control-button ${isVideoOff ? 'active' : ''}`} 
              onClick={toggleVideo}
              title={isVideoOff ? "Turn video on" : "Turn video off"}
            >
              <span role="img" aria-label={isVideoOff ? "camera off" : "camera on"}>
                {isVideoOff ? '🚫' : '📹'}
              </span>
            </button>
            
            <button className="end-call-button" onClick={endCall} title="End call">
              <span role="img" aria-label="end call">📵</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoCall;