import { WebSocketMessage, BrowseRequest, SubscribeRequest, Subscription } from '../types/index';

export class WebSocketClient {
  private browseWs: WebSocket | null = null;
  private subscribeWs: WebSocket | null = null;
  private conversionWs: WebSocket | null = null;
  private browseUrl: string;
  private subscribeUrl: string;
  private conversionUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageHandlers: Map<string, (data: unknown) => void> = new Map();
  private subscriptionUpdateHandler: ((message: Subscription) => void) | null = null;
  private rawMessageHandler: ((message: WebSocketMessage) => void) | null = null;

  constructor(urls: { browse: string; subscribe: string; conversion: string }) {
    this.browseUrl = urls.browse;
    this.subscribeUrl = urls.subscribe;
    this.conversionUrl = urls.conversion;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Connect to browse WebSocket
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
          }
        };

        // Browse WebSocket setup
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

        // Subscribe WebSocket setup
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

        // Conversion WebSocket setup
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
    // Call raw message handler for debugging
    if (this.rawMessageHandler) {
      this.rawMessageHandler(message);
    }

    console.log('WebSocketClient handling message:', message);

    if (message.type === 'subscription_update') {
      if (this.subscriptionUpdateHandler) {
        this.subscriptionUpdateHandler(message.payload as Subscription);
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

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  browseTags(parentNodeId?: string): Promise<unknown> {
    return this.sendMessage('browse', { parentNodeId } as BrowseRequest);
  }

  subscribe(tagIds: string[]): Promise<unknown> {
    return this.sendMessage('subscribe', { tagIds } as SubscribeRequest);
  }

  unsubscribe(tagIds: string[]): Promise<unknown> {
    return this.sendMessage('unsubscribe', { tagIds });
  }

  unsubscribeAll(): Promise<unknown> {
    return this.sendMessage('unsubscribe-all', {});
  }

  sendConversionRequest(selectedTagIds: string[], topic: string): Promise<unknown> {
    return this.sendMessage('mqtt-sparkplug-b', { selectedTagIds, topic });
  }

  private sendMessage(type: string, payload: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // Choose WebSocket based on message type
      let ws: WebSocket | null = null;
      if (type === 'browse') {
        ws = this.browseWs;
      } else if (type === 'mqtt-sparkplug-b') {
        ws = this.conversionWs;
      } else {
        ws = this.subscribeWs;
      }

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        let wsName = 'Unknown';
        if (type === 'browse') wsName = 'Browse';
        else if (type === 'mqtt-sparkplug-b') wsName = 'Conversion';
        else wsName = 'Subscribe';
        reject(new Error(`${wsName} WebSocket is not connected`));
        return;
      }

      const requestId = this.generateRequestId();
      const message: WebSocketMessage = {
        type: type as any,
        payload,
        requestId,
      };

      // Use longer timeout for subscribe requests since they may take longer
      const timeout = type === 'subscribe' ? 15000 : 5000;
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
  }

  isConnected(): boolean {
    return (this.browseWs !== null && this.browseWs.readyState === WebSocket.OPEN) ||
           (this.subscribeWs !== null && this.subscribeWs.readyState === WebSocket.OPEN) ||
           (this.conversionWs !== null && this.conversionWs.readyState === WebSocket.OPEN);
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
