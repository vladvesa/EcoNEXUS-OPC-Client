import React from 'react';
import { Subscription } from '../types/index';
import { useAuth } from '../contexts/AuthContext';
import './SubscriptionManager.css';

interface SubscriptionManagerProps {
  subscriptions: Subscription[];
  onUnsubscribe: (tagId: string, serverId?: string) => void;
  onUnsubscribeAll: () => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  subscriptions,
  onUnsubscribe,
  onUnsubscribeAll,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
  const errorSubscriptions = subscriptions.filter(s => s.status === 'error').length;

  // Group subscriptions by server
  const servers = Array.from(new Set(subscriptions.map(s => s.serverId ?? 'default')));

  return (
    <div className="subscription-manager">
      <div className="subscriptions-header">
        <h2>Subscriptii Active</h2>
        {isAdmin && subscriptions.length > 0 && (
          <button
            className="clear-all-btn"
            onClick={onUnsubscribeAll}
            title="Sterge toate subscriptiile"
          >
            Sterge Toate
          </button>
        )}
      </div>
      <div className="subscription-stats">
        <div className="stat active">
          <span className="stat-label">Active:</span>
          <span className="stat-value">{activeSubscriptions}</span>
        </div>
        <div className="stat servers">
          <span className="stat-label">Servere:</span>
          <span className="stat-value">{servers.length}</span>
        </div>
        {errorSubscriptions > 0 && (
          <div className="stat error">
            <span className="stat-label">Erori:</span>
            <span className="stat-value">{errorSubscriptions}</span>
          </div>
        )}
      </div>

      {subscriptions.length === 0 ? (
        <p className="no-subscriptions">Nu exista subscriptii active</p>
      ) : (
        <div className="subscriptions-list">
          {servers.map(serverId => {
            const serverSubs = subscriptions.filter(
              s => (s.serverId ?? 'default') === serverId
            );
            const serverName = serverSubs[0]?.serverName ?? serverId;
            return (
              <div key={serverId} className="server-group">
                <div className="server-group-header">
                  <span className="server-group-badge">{serverName}</span>
                  <span className="server-group-count">{serverSubs.length} tag(uri)</span>
                </div>
                {serverSubs.map(subscription => (
                  <div
                    key={`${subscription.serverId}-${subscription.tagId}`}
                    className={`subscription-item ${subscription.status}`}
                  >
                    <div className="subscription-header">
                      <div className="subscription-info">
                        <h3>{subscription.tagName}</h3>
                        <p className="subscription-id">{subscription.tagId}</p>
                      </div>
                      {isAdmin && (
                        <button
                          className="unsubscribe-btn"
                          onClick={() => onUnsubscribe(subscription.tagId, subscription.serverId)}
                          title="Dezaboneaza"
                        >
                          ✕
                        </button>
                      )}
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
                          <span className="detail-label">Ultima valoare:</span>
                          <span className="detail-value">
                            {typeof subscription.lastValue === 'object'
                              ? JSON.stringify(subscription.lastValue)
                              : String(subscription.lastValue)}
                          </span>
                        </div>
                      )}
                      {subscription.timestamp && (
                        <div className="detail">
                          <span className="detail-label">Actualizat:</span>
                          <span className="detail-value">
                            {new Date(subscription.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                      {subscription.updateCount !== undefined && subscription.updateCount > 0 && (
                        <div className="detail">
                          <span className="detail-label">Actualizari:</span>
                          <span className="detail-value">{subscription.updateCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
