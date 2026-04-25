export interface OpcUaTag {
  id: string;
  name: string;
  nodeId: string;
  children?: OpcUaTag[];
  isFolder?: boolean;
  level?: number;
  path?: string[];
}

export interface Subscription {
  tagId: string;
  tagName: string;
  status: 'active' | 'inactive' | 'error';
  lastValue?: unknown;
  timestamp?: Date;
}

export interface WebSocketMessage {
  type: 'browse' | 'subscribe' | 'unsubscribe' | 'unsubscribe-all' | 'mqtt-sparkplug-b' | 'browse_result' | 'subscription_update';
  payload: unknown;
  requestId?: string;
}

export interface BrowseRequest {
  parentNodeId?: string;
}

export interface SubscribeRequest {
  tagIds: string[];
}

export interface MqttSparkplugBRequest {
  selectedTagIds: string[];
  topic: string;
}

export interface RawTag {
  nodeId: string;
}
