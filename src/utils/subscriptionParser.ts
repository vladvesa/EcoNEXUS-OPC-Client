import { Subscription } from '../types/index';

export interface SubscriptionNode {
  id: string;
  name: string;
  tagId: string;
  children?: SubscriptionNode[];
  isLeaf: boolean;
}

/**
 * Parse subscriptions into a hierarchical tree structure based on nodeId paths.
 * For example: "ns=2;s=Channel1.PLC2.Command_Pump1" becomes a tree:
 * ns=2 > Channel1 > PLC2 > Command_Pump1
 */
export const parseSubscriptionsToTree = (subscriptions: Subscription[]): SubscriptionNode[] => {
  const root: Map<string, SubscriptionNode> = new Map();

  subscriptions.forEach(subscription => {
    const parts = parseNodeId(subscription.tagId);
    let currentLevel = root;
    let path = '';

    parts.forEach((part, index) => {
      path = path ? `${path}.${part}` : part;
      const key = path;
      const isLeaf = index === parts.length - 1;

      if (!currentLevel.has(key)) {
        currentLevel.set(key, {
          id: key,
          name: part,
          tagId: subscription.tagId,
          children: new Map() as any,
          isLeaf,
        });
      }

      const node = currentLevel.get(key)!;
      if (!isLeaf && !node.children) {
        node.children = new Map() as any;
      }
      currentLevel = node.children || new Map();
    });
  });

  // Convert maps to arrays recursively
  const mapToArray = (nodeMap: Map<string, SubscriptionNode>): SubscriptionNode[] => {
    return Array.from(nodeMap.values()).map(node => ({
      ...node,
      children: node.children instanceof Map ? mapToArray(node.children) : undefined,
    }));
  };

  return mapToArray(root);
};

/**
 * Parse OPC UA nodeId into hierarchical parts.
 * Examples:
 * "ns=2;s=Channel1.PLC2.Command_Pump1" -> ["Channel1", "PLC2", "Command_Pump1"]
 * "ns=2;i=12345" -> ["12345"]
 */
const parseNodeId = (nodeId: string): string[] => {
  // Extract the identifier part (after "=" in the last segment)
  const match = nodeId.match(/[is]=(.+)$/);
  if (!match) return [nodeId];

  const identifier = match[1];

  // Split by dots for string identifiers
  if (identifier.includes('.')) {
    return identifier.split('.');
  }

  return [identifier];
};

/**
 * Get all leaf node tag IDs from a tree of SubscriptionNodes
 */
export const getAllLeafTagIds = (nodes: SubscriptionNode[]): string[] => {
  const tagIds: string[] = [];

  const traverse = (nodeList: SubscriptionNode[]) => {
    nodeList.forEach(node => {
      if (node.isLeaf) {
        tagIds.push(node.tagId);
      }
      if (node.children) {
        traverse(node.children);
      }
    });
  };

  traverse(nodes);
  return Array.from(new Set(tagIds)); // Remove duplicates
};
