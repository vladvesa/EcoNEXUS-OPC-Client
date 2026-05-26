import { useState, useEffect, useRef } from 'react';
import { TagBrowser } from './components/TagBrowser';
import { SubscriptionManager } from './components/SubscriptionManager';
import { MqttSparkplugB } from './components/MqttSparkplugB';
import { StatsPanel } from './components/StatsPanel';
import { MetadataManager } from './components/MetadataManager';
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './contexts/AuthContext';
import { WebSocketClient } from './utils/websocketClient';
import { parseTagsToTree } from './utils/tagParser';
import { OpcUaTag, OpcUaServer, Subscription, RawTag, SparkplugTopicConfig } from './types/index';
import './App.css';

function App() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [wsClient] = useState(() => new WebSocketClient({
    browse: 'ws://localhost:1880/ws/tags',
    subscribe: 'ws://localhost:1880/ws/tags/subscribe',
    conversion: 'ws://localhost:1880/ws/tags/conversion',
    metadata: 'ws://localhost:1880/ws/tags/metadata'
  }));
  const [tags, setTags] = useState<OpcUaTag[]>([]);
  const [servers, setServers] = useState<OpcUaServer[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'browser' | 'mqtt' | 'stats' | 'metadata'>('browser');
  const [isSendingConversion, setIsSendingConversion] = useState(false);
  const [totalUpdates, setTotalUpdates] = useState(0);
  const [updatesPerSecond, setUpdatesPerSecond] = useState(0);
  const [sessionStart] = useState(new Date());
  const updatesRef = useRef(0);

  // Redirect operator away from admin-only tabs
  useEffect(() => {
    if (!isAdmin && activeTab === 'mqtt') {
      setActiveTab('browser');
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    const initializeConnection = async () => {
      try {
        await wsClient.connect();
        setConnectionStatus('connected');

        wsClient.onSubscriptionUpdate((subscription: Subscription) => {
          updatesRef.current += 1;
          setTotalUpdates(updatesRef.current);
          setSubscriptions(prev => {
            const existing = prev.findIndex(s =>
              s.tagId === subscription.tagId &&
              (subscription.serverId ? s.serverId === subscription.serverId : true)
            );
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = {
                ...subscription,
                serverName: subscription.serverName ?? updated[existing].serverName,
                updateCount: (updated[existing].updateCount ?? 0) + 1,
              };
              return updated;
            }
            return prev;
          });
        });

        // Sincronizare lista subscriptii — broadcast de la Node-RED catre toti clientii
        wsClient.onSubscriptionListSync((incomingList: Subscription[]) => {
          setSubscriptions(prev => {
            const existingMap = new Map(prev.map(s => [`${s.serverId}:${s.tagId}`, s]));
            return incomingList.map(incoming => {
              const key = `${incoming.serverId}:${incoming.tagId}`;
              const existing = existingMap.get(key);
              return existing
                ? { ...incoming, lastValue: existing.lastValue, timestamp: existing.timestamp, updateCount: existing.updateCount }
                : incoming;
            });
          });
        });

        // Sincronizare lista servere — broadcast cand adminul adauga/sterge un server
        wsClient.onServerListSync((updatedServers: OpcUaServer[]) => {
          setServers(updatedServers);
          setSelectedServerId(prev => {
            if (prev && !updatedServers.find(s => s.id === prev)) {
              // Serverul curent a fost sters de admin — switch la primul disponibil
              const first = updatedServers[0];
              if (first) {
                setTags([]);
                loadTags(first.id, undefined, first.endpoint);
                return first.id;
              }
              return null;
            }
            return prev;
          });
        });

        // Try to load server list from Node-RED; fall back gracefully if not supported
        let firstServerId: string | undefined;
        let firstEndpoint: string | undefined;
        try {
          const serverList = await wsClient.getServers();
          if (serverList && serverList.length > 0) {
            setServers(serverList);
            setSelectedServerId(serverList[0].id);
            firstServerId = serverList[0].id;
            firstEndpoint = serverList[0].endpoint;
          }
        } catch {
          console.warn('Could not fetch server list (Node-RED flow may not support get_servers yet)');
        }

        // Incarca subscriptiile active existente (de la alta sesiune/browser)
        try {
          const existingSubs = await wsClient.getSubscriptions();
          if (existingSubs && existingSubs.length > 0) {
            setSubscriptions(existingSubs);
          }
        } catch {
          console.warn('Could not fetch existing subscriptions');
        }

        // endpoint pasat explicit — setServers() e async si nu e inca in state
        await loadTags(firstServerId, undefined, firstEndpoint);
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

  useEffect(() => {
    let lastCount = 0;
    const interval = setInterval(() => {
      const current = updatesRef.current;
      setUpdatesPerSecond(current - lastCount);
      lastCount = current;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadTags = async (serverId?: string, parentNodeId?: string, endpoint?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const resolvedEndpoint = endpoint ?? servers.find(s => s.id === serverId)?.endpoint;
      console.log('Loading tags for server:', serverId, resolvedEndpoint);
      const result = await wsClient.browseTags(parentNodeId, serverId, resolvedEndpoint);
      console.log('Browse result received:', result);
      if (Array.isArray(result)) {
        const parsedTags = parseTagsToTree(result as RawTag[]);
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

  const handleAddServer = (name: string, endpoint: string) => {
    const id = `dynamic-${Date.now()}`;
    const newServer: OpcUaServer = { id, name, endpoint };
    // Actualizare locala imediata (UX responsive) + sincronizare cu ceilalti clienti
    setServers(prev => [...prev, newServer]);
    setSelectedServerId(id);
    setTags([]);
    loadTags(id, undefined, endpoint);
    wsClient.addServer(newServer);
  };

  const handleDeleteServer = (serverId: string) => {
    wsClient.deleteServer(serverId);
    setServers(prev => {
      const remaining = prev.filter(s => s.id !== serverId);
      if (selectedServerId === serverId && remaining.length > 0) {
        const next = remaining[0];
        setSelectedServerId(next.id);
        setTags([]);
        loadTags(next.id, undefined, next.endpoint);
      }
      return remaining;
    });
  };

  const handleServerChange = (serverId: string) => {
    setSelectedServerId(serverId);
    setTags([]);
    const endpoint = servers.find(s => s.id === serverId)?.endpoint;
    loadTags(serverId, undefined, endpoint);
  };

  const handleRebrowse = async () => {
    await loadTags(selectedServerId ?? undefined);
  };

  const handleSelectTags = async (selectedTags: OpcUaTag[], serverId: string) => {
    const leafTags = selectedTags.filter(tag => tag.nodeId && !tag.isFolder);
    const nodeIds = leafTags.map(tag => tag.nodeId);

    if (nodeIds.length === 0) {
      setError('Nu exista tag-uri valide selectate pentru abonare');
      return;
    }

    const selectedServer = servers.find(s => s.id === serverId);
    const endpoint = selectedServer?.endpoint;

    try {
      setError(null);
      wsClient.subscribe(nodeIds, serverId, endpoint, selectedServer?.name).catch(err => {
        console.warn('Subscribe request error:', err);
      });
      const newSubscriptions: Subscription[] = leafTags.map(tag => ({
        tagId: tag.nodeId,
        tagName: tag.name,
        status: 'active',
        serverId,
        serverName: selectedServer?.name ?? serverId,
      }));

      setSubscriptions(prev => {
        const existingKeys = new Set(prev.map(s => `${s.serverId}:${s.tagId}`));
        return [
          ...prev,
          ...newSubscriptions.filter(ns => !existingKeys.has(`${ns.serverId}:${ns.tagId}`))
        ];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe to tags');
    }
  };

  const handleUnsubscribe = (tagId: string, serverId?: string) => {
    setError(null);
    setSubscriptions(prev => prev.filter(s => !(s.tagId === tagId && s.serverId === serverId)));
    if (serverId) {
      const endpoint = servers.find(s => s.id === serverId)?.endpoint;
      wsClient.unsubscribe([tagId], serverId, endpoint).catch(err => {
        console.warn('Unsubscribe request error:', err);
      });
    }
  };

  const handleUnsubscribeAll = async () => {
    try {
      setError(null);
      await wsClient.unsubscribeAll();
      setSubscriptions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear subscriptions');
    }
  };

  const handleSendConversion = async (topics: SparkplugTopicConfig[]) => {
    try {
      setError(null);
      setIsSendingConversion(true);
      await wsClient.sendConversionRequest(topics);
    } catch (err) {
      console.error('Conversion request error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send conversion request');
    } finally {
      setIsSendingConversion(false);
    }
  };

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
    const parsedTags = parseTagsToTree(testTags);
    setTags(parsedTags);
  };

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>OPC UA Tag Browser - Node-RED Interface</h1>
        <div className="header-status">
          <div className={`status-indicator ${connectionStatus}`} />
          <span className="status-text">
            {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
          <div className="user-info">
            <span className="user-display-name">{user.displayName}</span>
            <span className={`user-role-badge user-role-badge--${user.role}`}>{user.role}</span>
          </div>
          {isAdmin && (
            <button className="debug-btn" onClick={loadTestData} title="Load test data for debugging">
              Test Data
            </button>
          )}
          <button className="logout-btn" onClick={logout} title="Deconectare">
            Iesire
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="app-tabs">
        <button
          className={`tab-btn ${activeTab === 'browser' ? 'active' : ''}`}
          onClick={() => setActiveTab('browser')}
        >
          Tag Browser & Subscriptii
        </button>
        {isAdmin && (
          <button
            className={`tab-btn ${activeTab === 'mqtt' ? 'active' : ''}`}
            onClick={() => setActiveTab('mqtt')}
          >
            MQTT Sparkplug B
          </button>
        )}
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistici
        </button>
        <button
          className={`tab-btn ${activeTab === 'metadata' ? 'active' : ''}`}
          onClick={() => setActiveTab('metadata')}
        >
          Metadate Echipamente
        </button>
      </div>

      {activeTab === 'browser' && (
        <div className="app-container">
          <div className="browser-section">
            <TagBrowser
              tags={tags}
              servers={servers}
              selectedServerId={selectedServerId}
              onServerChange={handleServerChange}
              onSelectTags={handleSelectTags}
              onRebrowse={handleRebrowse}
              onAddServer={handleAddServer}
              onDeleteServer={handleDeleteServer}
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
      )}

      {activeTab === 'mqtt' && isAdmin && (
        <div className="app-container-full">
          <MqttSparkplugB
            subscriptions={subscriptions}
            onSendConversion={handleSendConversion}
            isLoading={isSendingConversion}
          />
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="app-container-full">
          <StatsPanel
            subscriptions={subscriptions}
            totalUpdates={totalUpdates}
            updatesPerSecond={updatesPerSecond}
            sessionStart={sessionStart}
          />
        </div>
      )}

      {activeTab === 'metadata' && (
        <MetadataManager subscriptions={subscriptions} wsClient={wsClient} />
      )}
    </div>
  );
}

export default App;
