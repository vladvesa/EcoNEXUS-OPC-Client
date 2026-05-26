export interface OpcUaServer {
  id: string;
  name: string;
  endpoint: string;
}

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
  updateCount?: number;
  serverId?: string;
  serverName?: string;
}

export interface WebSocketMessage {
  type:
    | 'browse'
    | 'subscribe'
    | 'unsubscribe'
    | 'unsubscribe-all'
    | 'mqtt-sparkplug-b'
    | 'browse_result'
    | 'subscription_update'
    | 'subscription_list_sync'
    | 'get_subscriptions'
    | 'server_list_sync'
    | 'add_server'
    | 'delete_server'
    | 'get_servers'
    | 'servers_result'
    | 'get_metadata'
    | 'save_metadata';
  payload: unknown;
  requestId?: string;
}

export interface BrowseRequest {
  parentNodeId?: string;
  serverId?: string;
}

export interface SubscribeRequest {
  tagIds: string[];
  serverId: string;
}

export interface MqttSparkplugBRequest {
  selectedTagIds: string[];
  topic: string;
}

export interface SparkplugTopicConfig {
  id: string;
  topic: string;
  selectedTagIds: string[];
}

export interface RawTag {
  nodeId: string;
}

export type EquipmentType =
  | 'Pompă'
  | 'Suflantă'
  | 'Convertizor de Frecvență (CSF)'
  | 'Aerator'
  | 'Electrovalvă'
  | 'Traductor de Nivel'
  | 'Senzor de Presiune'
  | 'Debitmetru'
  | 'Analizor de Rețea Electrică'
  | 'Dozator Clor'
  | 'Detector Clor în Aer'
  | 'PLC / RTU'
  | 'HMI (Panou Operator)'
  | 'UPS / Acumulator'
  | 'Panou Solar'
  | '';

export interface EquipmentGeneralData {
  cod: string;
  etichetaEchipament: string;
  denumire: string;
  pozitieSchema: string;
  tipEchipament: EquipmentType;
  locatie: string;
  portofoliu: string;
  sistem: string;
  grup: string;
  responsabil: string;
  dataPunereFunctiune1: string;
  dataPunereFunctiune2: string;
  gestiune: string;
  grupa: string;
  subgrupa: string;
  parteMijlocFix: boolean;
  cotaParte: string;
  codObInv: string;
  serie: string;
  observatii: string;
  // Obiecte de Cost
  zona: string;
  purtator: string;
  // Documente
  furnizor: string;
  distribuitor: string;
  telefonService: string;
  nrContract: string;
  codDocFurn: string;
  nrDocFurn: string;
  dataDocFurn: string;
  garantieExpira: string;
  manualTehnicUrl: string;
  codDocPF: string;
  nrDocPF: string;
  dataDocPF: string;
  codDocMiscare: string;
  nrDocMiscare: string;
  dataDocMiscare: string;
  // Date Fabricatie
  fabricant: string;
  anFabricatie: string;
  modelFabricatie: string;
  serieFabricatie: string;
}

export interface EquipmentRecord {
  id: string;
  tagId: string;
  general: EquipmentGeneralData;
  specific: Record<string, string | boolean>;
  createdAt: string;
  updatedAt: string;
}
