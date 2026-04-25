import { OpcUaTag, RawTag } from '../types/index';

export function parseTagsToTree(rawTags: RawTag[]): OpcUaTag[] {
  const root: OpcUaTag[] = [];

  rawTags.forEach(tag => {
    const parts = parseNodeId(tag.nodeId);
    if (parts.length === 0) return;

    let currentLevel = root;
    let currentPath: string[] = [];

    parts.forEach((part, index) => {
      currentPath.push(part);
      const pathStr = currentPath.join('.');
      const isLast = index === parts.length - 1;

      let existingNode = currentLevel.find(node => node.name === part);

      if (!existingNode) {
        const newNode: OpcUaTag = {
          id: isLast ? tag.nodeId : pathStr,
          name: part,
          nodeId: isLast ? tag.nodeId : '',
          isFolder: !isLast,
          level: index,
          path: [...currentPath],
          children: isLast ? undefined : []
        };
        currentLevel.push(newNode);
        existingNode = newNode;
      }

      if (!isLast && existingNode.children) {
        currentLevel = existingNode.children;
      }
    });
  });

  return root;
}

function parseNodeId(nodeId: string): string[] {
  // Parse nodeId like "ns=2;s=Channel1.PLC2.Command_Pump1"
  // Extract the path part after "s="
  const match = nodeId.match(/s=(.+)/);
  if (!match) return [];

  const path = match[1];
  // Split by dots to get hierarchy
  return path.split('.');
}

export function getTagDisplayName(tag: OpcUaTag): string {
  if (tag.path && tag.path.length > 0) {
    return tag.path.join(' → ');
  }
  return tag.name;
}