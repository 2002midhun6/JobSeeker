import React, { useEffect } from 'react';
import './IncomingCallDialog.css';
const baseUrl = import.meta.env.VITE_API_URL;
function IncomingCallDialog({ caller, onAccept, onReject, isVisible }) {
  useEffect(() => {
    // Play sound when call is incoming
    let audio;
    if (isVisible && caller) {
      audio = new Audio('/path/to/ring.mp3'); // Replace with your ringtone path
      audio.loop = true;
      
      // Try to play with a fallback for browsers that require user interaction
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log('Auto-play prevented by browser:', error);
        });
      }
    }
    
    // Clean up
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [isVisible, caller]);

  // Important: if not visible or no caller, return null, but leave a console log for debugging
  if (!isVisible || !caller) {
    isVisible && console.log('IncomingCallDialog: Caller information missing');
    return null;
  }

  console.log('Rendering incoming call dialog for', caller);

  return (
    <>
      <div className="incoming-call-overlay"></div>
      <div className="incoming-call-dialog">
        <h3>Incoming Video Call</h3>
        <div className="caller-info">
          <p>{caller.name} is calling you</p>
          <p className="caller-role">{caller.role}</p>
        </div>
        <div className="incoming-call-dialog-buttons">
          <button className="accept-call-button" onClick={onAccept}>
            📱 Accept
          </button>
          <button className="reject-call-button" onClick={onReject}>
            ❌ Reject
          </button>
        </div>
      </div>
    </>
  );
}

export default IncomingCallDialog;