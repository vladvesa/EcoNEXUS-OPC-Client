import { useState, useEffect } from 'react';
import { TagBrowser } from './components/TagBrowser';
import { SubscriptionManager } from './components/SubscriptionManager';
import { WebSocketClient } from './utils/websocketClient';
import { parseTagsToTree } from './utils/tagParser';
import { OpcUaTag, Subscription, RawTag } from './types/index';
import './App.css';

function App() {
  const [wsClient] = useState(() => new WebSocketClient({
    browse: 'ws://localhost:1880/ws/tags',
    subscribe: 'ws://localhost:1880/ws/tags/subscribe'
  }));
  const [tags, setTags] = useState<OpcUaTag[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeConnection = async () => {
      try {
        await wsClient.connect();
        setConnectionStatus('connected');
        
        // Setup subscription update handler
        wsClient.onSubscriptionUpdate((subscription: Subscription) => {
          setSubscriptions(prev => {
            const existing = prev.findIndex(s => s.tagId === subscription.tagId);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = subscription;
              return updated;
            }
            return [...prev, subscription];
          });
        });

        // Load initial tags
        await loadTags();
      } catch (err) {
        setConnectionStatus('disconnected');
        setError(err instanceof Error ? err.message : 'Failed to connect');
      }
    };

    initializeConnection();

    return () => {
      wsClient.disconnect();
    };
  }, [wsClient]);

  const loadTags = async (parentNodeId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Loading tags, sending browse request...');
      const result = await wsClient.browseTags(parentNodeId);
      console.log('Browse result received:', result);
      if (Array.isArray(result)) {
        console.log('Parsing tags to tree structure...');
        const parsedTags = parseTagsToTree(result as RawTag[]);
        console.log('Parsed tags:', parsedTags);
        setTags(parsedTags);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load tags';
      console.error('Error loading tags:', errorMsg, err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRebrowse = async () => {
    await loadTags();
  };

  const handleSelectTags = async (selectedTags: OpcUaTag[]) => {
    // Filter to only leaf nodes (tags with nodeId)
    const leafTags = selectedTags.filter(tag => tag.nodeId && !tag.isFolder);
    const nodeIds = leafTags.map(tag => tag.nodeId);

    if (nodeIds.length === 0) {
      setError('No valid tags selected for subscription');
      return;
    }

    try {
      setError(null);
      // Send subscribe request but don't fail if it times out - subscriptions will be confirmed via subscription_update
      wsClient.subscribe(nodeIds).catch(err => {
        console.warn('Subscribe request error:', err);
        // Don't show error to user as subscription updates may still arrive
      });

      // Add subscriptions locally
      const newSubscriptions: Subscription[] = leafTags.map(tag => ({
        tagId: tag.nodeId,
        tagName: tag.name,
        status: 'active'
      }));

      setSubscriptions(prev => {
        const existing = prev.map(s => s.tagId);
        return [
          ...prev,
          ...newSubscriptions.filter(ns => !existing.includes(ns.tagId))
        ];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe to tags');
    }
  };

  const handleUnsubscribe = async (tagId: string) => {
    try {
      setError(null);
      await wsClient.unsubscribe([tagId]);
      setSubscriptions(prev => prev.filter(s => s.tagId !== tagId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
    }
  };

  const handleUnsubscribeAll = async () => {
    try {
      setError(null);
      console.log('Sending unsubscribe-all request...');
      const response = await wsClient.unsubscribeAll();
      console.log('Unsubscribe-all response:', response);
      setSubscriptions([]);
      console.log('Subscriptions cleared');
    } catch (err) {
      console.error('Unsubscribe-all error:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear subscriptions');
    }
  };

  // Load test data for debugging
  const loadTestData = () => {
    const testTags: RawTag[] = [
      {"nodeId":"ns=2;s=Channel1.PLC2.Command_Pump1"},
      {"nodeId":"ns=2;s=Channel1.PLC2.Command_Pump2"},
      {"nodeId":"ns=2;s=Channel1.PLC2.Faults_Pump1"},
      {"nodeId":"ns=2;s=Channel1.PLC2.Faults_Pump2"},
      {"nodeId":"ns=2;s=Channel1.PLC2.FlowRate_Pump1"},
      {"nodeId":"ns=2;s=Channel1.PLC2.FlowRate_Pump2"},
      {"nodeId":"ns=2;s=Channel1.PLC2.Speed_Pump1"},
      {"nodeId":"ns=2;s=Channel1.PLC2.Speed_Pump2"},
      {"nodeId":"ns=2;s=Channel1.PLC2.State_Pump1"},
      {"nodeId":"ns=2;s=Channel1.PLC2.State_Pump2"}
    ];
    console.log('Loading test data:', testTags);
    const parsedTags = parseTagsToTree(testTags);
    console.log('Parsed test tags:', parsedTags);
    setTags(parsedTags);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>OPC UA Tag Browser - Node-RED Interface</h1>
        <div className="header-status">
          <div className={`status-indicator ${connectionStatus}`} />
          <span className="status-text">
            {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
          <button className="debug-btn" onClick={loadTestData} title="Load test data for debugging">
            Test Data
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="app-container">
        <div className="browser-section">
          <TagBrowser
            tags={tags}
            onSelectTags={handleSelectTags}
            onRebrowse={handleRebrowse}
            isLoading={isLoading}
          />
        </div>
        <div className="subscriptions-section">
          <SubscriptionManager
            subscriptions={subscriptions}
            onUnsubscribe={handleUnsubscribe}
            onUnsubscribeAll={handleUnsubscribeAll}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
