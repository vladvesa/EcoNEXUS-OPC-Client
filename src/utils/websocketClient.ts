import { WebSocketMessage, Subscription, OpcUaServer, EquipmentRecord } from '../types/index';

export class WebSocketClient {
  private browseWs: WebSocket | null = null;
  private subscribeWs: WebSocket | null = null;
  private conversionWs: WebSocket | null = null;
  private metadataWs: WebSocket | null = null;
  private browseUrl: string;
  private subscribeUrl: string;
  private conversionUrl: string;
  private metadataUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isReconnecting = false;
  private messageHandlers: Map<string, (data: unknown) => void> = new Map();
  private subscriptionUpdateHandler: ((message: Subscription) => void) | null = null;
  private subscriptionListSyncHandler: ((subscriptions: Subscription[]) => void) | null = null;
  private serverListSyncHandler: ((servers: OpcUaServer[]) => void) | null = null;
  private rawMessageHandler: ((message: WebSocketMessage) => void) | null = null;

  constructor(urls: { browse: string; subscribe: string; conversion: string; metadata: string }) {
    this.browseUrl = urls.browse;
    this.subscribeUrl = urls.subscribe;
    this.conversionUrl = urls.conversion;
    this.metadataUrl = urls.metadata;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.browseWs = new WebSocket(this.browseUrl);
        this.subscribeWs = new WebSocket(this.subscribeUrl);
        this.conversionWs = new WebSocket(this.conversionUrl);

        let browseConnected = false;
        let subscribeConnected = false;
        let conversionConnected = false;

        const checkConnections = () => {
          if (browseConnected && subscribeConnected && conversionConnected) {
            console.log('All WebSocket connections established');
            this.reconnectAttempts = 0;
            resolve();
            this.connectMetadataWs();
          }
        };

        this.browseWs.onopen = () => {
          console.log('Browse WebSocket connected');
          browseConnected = true;
          checkConnections();
        };

        this.browseWs.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse browse WebSocket message:', error);
          }
        };

        this.browseWs.onerror = (error) => {
          console.error('Browse WebSocket error:', error);
          reject(error);
        };

        this.browseWs.onclose = () => {
          console.log('Browse WebSocket closed');
          this.attemptReconnect();
        };

        this.subscribeWs.onopen = () => {
          console.log('Subscribe WebSocket connected');
          subscribeConnected = true;
          checkConnections();
        };

        this.subscribeWs.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse subscribe WebSocket message:', error);
          }
        };

        this.subscribeWs.onerror = (error) => {
          console.error('Subscribe WebSocket error:', error);
          reject(error);
        };

        this.subscribeWs.onclose = () => {
          console.log('Subscribe WebSocket closed');
          this.attemptReconnect();
        };

        this.conversionWs.onopen = () => {
          console.log('Conversion WebSocket connected');
          conversionConnected = true;
          checkConnections();
        };

        this.conversionWs.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse conversion WebSocket message:', error);
          }
        };

        this.conversionWs.onerror = (error) => {
          console.error('Conversion WebSocket error:', error);
          reject(error);
        };

        this.conversionWs.onclose = () => {
          console.log('Conversion WebSocket closed');
          this.attemptReconnect();
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    if (this.rawMessageHandler) {
      this.rawMessageHandler(message);
    }

    console.log('WebSocketClient handling message:', message);

    if (message.type === 'subscription_update') {
      if (this.subscriptionUpdateHandler) {
        this.subscriptionUpdateHandler(message.payload as Subscription);
      }
    } else if (message.type === 'subscription_list_sync') {
      if (this.subscriptionListSyncHandler) {
        this.subscriptionListSyncHandler((message as unknown as { subscriptions: Subscription[] }).subscriptions ?? []);
      }
    } else if (message.type === 'server_list_sync') {
      if (this.serverListSyncHandler) {
        this.serverListSyncHandler((message as unknown as { servers: OpcUaServer[] }).servers ?? []);
      }
    } else if (message.requestId && this.messageHandlers.has(message.requestId)) {
      console.log('Found handler for requestId:', message.requestId);
      const handler = this.messageHandlers.get(message.requestId)!;
      handler(message.payload);
      this.messageHandlers.delete(message.requestId);
    } else if (message.requestId) {
      console.warn('No handler found for requestId:', message.requestId, 'Available handlers:', Array.from(this.messageHandlers.keys()));
    }
  }

  private connectMetadataWs(): void {
    try {
      this.metadataWs = new WebSocket(this.metadataUrl);
      this.metadataWs.onopen = () => console.log('Metadata WebSocket connected');
      this.metadataWs.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse metadata WebSocket message:', error);
        }
      };
      this.metadataWs.onerror = () => console.warn('Metadata WebSocket unavailable');
      this.metadataWs.onclose = () => console.log('Metadata WebSocket closed');
    } catch (error) {
      console.warn('Could not connect metadata WebSocket:', error);
    }
  }

  private attemptReconnect(): void {
    if (this.isReconnecting) return;
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.isReconnecting = true;
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.isReconnecting = false;
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  getServers(): Promise<OpcUaServer[]> {
    return this.sendMessage('get_servers', {}, 3000) as Promise<OpcUaServer[]>;
  }

  addServer(server: OpcUaServer): void {
    if (this.browseWs && this.browseWs.readyState === WebSocket.OPEN) {
      this.browseWs.send(JSON.stringify({ type: 'add_server', payload: server, requestId: this.generateRequestId() }));
    }
  }

  deleteServer(serverId: string): void {
    if (this.browseWs && this.browseWs.readyState === WebSocket.OPEN) {
      this.browseWs.send(JSON.stringify({ type: 'delete_server', payload: { serverId }, requestId: this.generateRequestId() }));
    }
  }

  getSubscriptions(): Promise<Subscription[]> {
    return this.sendMessage('get_subscriptions', {}, 3000) as Promise<Subscription[]>;
  }

  browseTags(parentNodeId?: string, serverId?: string, endpoint?: string): Promise<unknown> {
    return this.sendMessage('browse', { parentNodeId, serverId, endpoint });
  }

  subscribe(tagIds: string[], serverId: string, endpoint?: string, serverName?: string): Promise<unknown> {
    return this.sendMessage('subscribe', { tagIds, serverId, endpoint, serverName }, 15000);
  }

  unsubscribe(tagIds: string[], serverId: string, endpoint?: string): Promise<unknown> {
    return this.sendMessage('unsubscribe', { tagIds, serverId, endpoint });
  }

  unsubscribeAll(): Promise<unknown> {
    return this.sendMessage('unsubscribe-all', {});
  }

  sendConversionRequest(topics: { id: string; topic: string; selectedTagIds: string[] }[]): Promise<unknown> {
    return this.sendMessage('mqtt-sparkplug-b', { topics });
  }

  getMetadata(): Promise<EquipmentRecord[]> {
    return this.sendMessage('get_metadata', {}, 5000) as Promise<EquipmentRecord[]>;
  }

  saveMetadata(records: EquipmentRecord[]): Promise<unknown> {
    return this.sendMessage('save_metadata', records, 10000);
  }

  private sendMessage(type: string, payload: unknown, timeoutMs?: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let ws: WebSocket | null = null;
      if (type === 'browse' || type === 'get_servers') {
        ws = this.browseWs;
      } else if (type === 'mqtt-sparkplug-b') {
        ws = this.conversionWs;
      } else if (type === 'get_metadata' || type === 'save_metadata') {
        ws = this.metadataWs;
      } else {
        ws = this.subscribeWs;
      }

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        let wsName = 'Unknown';
        if (type === 'browse' || type === 'get_servers') wsName = 'Browse';
        else if (type === 'mqtt-sparkplug-b') wsName = 'Conversion';
        else wsName = 'Subscribe';
        reject(new Error(`${wsName} WebSocket is not connected`));
        return;
      }

      const requestId = this.generateRequestId();
      const message: WebSocketMessage = {
        type: type as WebSocketMessage['type'],
        payload,
        requestId,
      };

      const timeout = timeoutMs ?? 5000;
      const timeoutId = setTimeout(() => {
        this.messageHandlers.delete(requestId);
        reject(new Error(`Request ${requestId} timed out`));
      }, timeout);

      this.messageHandlers.set(requestId, (data) => {
        clearTimeout(timeoutId);
        resolve(data);
      });

      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        this.messageHandlers.delete(requestId);
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  onSubscriptionUpdate(handler: (message: Subscription) => void): void {
    this.subscriptionUpdateHandler = handler;
  }

  onSubscriptionListSync(handler: (subscriptions: Subscription[]) => void): void {
    this.subscriptionListSyncHandler = handler;
  }

  onServerListSync(handler: (servers: OpcUaServer[]) => void): void {
    this.serverListSyncHandler = handler;
  }

  onMessage(handler: (message: WebSocketMessage) => void): void {
    this.rawMessageHandler = handler;
  }

  disconnect(): void {
    if (this.browseWs) {
      this.browseWs.close();
      this.browseWs = null;
    }
    if (this.subscribeWs) {
      this.subscribeWs.close();
      this.subscribeWs = null;
    }
    if (this.conversionWs) {
      this.conversionWs.close();
      this.conversionWs = null;
    }
    if (this.metadataWs) {
      this.metadataWs.close();
      this.metadataWs = null;
    }
  }

  isConnected(): boolean {
    return (this.browseWs !== null && this.browseWs.readyState === WebSocket.OPEN) ||
           (this.subscribeWs !== null && this.subscribeWs.readyState === WebSocket.OPEN) ||
           (this.conversionWs !== null && this.conversionWs.readyState === WebSocket.OPEN);
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}
