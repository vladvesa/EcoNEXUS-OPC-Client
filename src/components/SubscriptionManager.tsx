import React from 'react';
import { Subscription } from '../types/index';
import './SubscriptionManager.css';

interface SubscriptionManagerProps {
  subscriptions: Subscription[];
  onUnsubscribe: (tagId: string) => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  subscriptions,
  onUnsubscribe,
}) => {
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const errorSubscriptions = subscriptions.filter(s => s.status === 'error').length;

  return (
    <div className="subscription-manager">
      <h2>Active Subscriptions</h2>
      <div className="subscription-stats">
        <div className="stat active">
          <span className="stat-label">Active:</span>
          <span className="stat-value">{activeSubscriptions}</span>
        </div>
        {errorSubscriptions > 0 && (
          <div className="stat error">
            <span className="stat-label">Errors:</span>
            <span className="stat-value">{errorSubscriptions}</span>
          </div>
        )}
      </div>

      {subscriptions.length === 0 ? (
        <p className="no-subscriptions">No active subscriptions</p>
      ) : (
        <div className="subscriptions-list">
          {subscriptions.map(subscription => (
            <div
              key={subscription.tagId}
              className={`subscription-item ${subscription.status}`}
            >
              <div className="subscription-header">
                <div className="subscription-info">
                  <h3>{subscription.tagName}</h3>
                  <p className="subscription-id">{subscription.tagId}</p>
                </div>
                <button
                  className="unsubscribe-btn"
                  onClick={() => onUnsubscribe(subscription.tagId)}
                  title="Unsubscribe"
                >
                  ✕
                </button>
              </div>
              <div className="subscription-details">
                <div className="detail">
                  <span className="detail-label">Status:</span>
                  <span className={`detail-value ${subscription.status}`}>
                    {subscription.status}
                  </span>
                </div>
                {subscription.lastValue !== undefined && (
                  <div className="detail">
                    <span className="detail-label">Last Value:</span>
                    <span className="detail-value">
                      {typeof subscription.lastValue === 'object'
                        ? JSON.stringify(subscription.lastValue)
                        : String(subscription.lastValue)}
                    </span>
                  </div>
                )}
                {subscription.timestamp && (
                  <div className="detail">
                    <span className="detail-label">Updated:</span>
                    <span className="detail-value">
                      {new Date(subscription.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
