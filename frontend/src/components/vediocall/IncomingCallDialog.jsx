import React from 'react';
import './IncomingCallDialog.css';

const IncomingCallDialog = ({ caller, onAccept, onReject, isVisible }) => {
  if (!isVisible || !caller) return null;

  return (
    <div className="incoming-call-dialog">
      <div className="incoming-call-content">
        <h3>Incoming Call</h3>
        <p>From: {caller.name} ({caller.role})</p>
        <div className="call-actions">
          <button className="accept-call-button" onClick={onAccept}>
            <span role="img" aria-label="Accept">✓</span> Accept
          </button>
          <button className="reject-call-button" onClick={onReject}>
            <span role="img" aria-label="Reject">✕</span> Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallDialog;