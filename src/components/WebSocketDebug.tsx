import React from 'react';
import './WebSocketDebug.css';

interface WebSocketDebugProps {
  lastMessage: unknown;
}

export const WebSocketDebug: React.FC<WebSocketDebugProps> = ({ lastMessage }) => {
  return (
    <div className="websocket-debug">
      <h3>Last WebSocket Message</h3>
      <pre className="message-content">
        {lastMessage ? JSON.stringify(lastMessage, null, 2) : 'Waiting for messages...'}
      </pre>
    </div>
  );
};
