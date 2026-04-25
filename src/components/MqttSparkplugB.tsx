import React, { useState } from 'react';
import { Subscription } from '../types/index';
import { parseSubscriptionsToTree, getAllLeafTagIds, SubscriptionNode } from '../utils/subscriptionParser';
import './MqttSparkplugB.css';

interface MqttSparkplugBProps {
  subscriptions: Subscription[];
  onSendConversion: (selectedTagIds: string[], topic: string) => void;
  isLoading: boolean;
}

export const MqttSparkplugB: React.FC<MqttSparkplugBProps> = ({
  subscriptions,
  onSendConversion,
  isLoading,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [topic, setTopic] = useState<string>('');

  const tree = parseSubscriptionsToTree(subscriptions);

  const toggleNode = (nodeId: string): void => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Get all leaf tag IDs under a node
  const getAllLeafIdsUnderNode = (node: SubscriptionNode): string[] => {
    const ids: string[] = [];

    const traverse = (n: SubscriptionNode) => {
      if (n.isLeaf) {
        ids.push(n.tagId);
      }
      if (n.children) {
        n.children.forEach(child => traverse(child));
      }
    };

    traverse(node);
    return Array.from(new Set(ids));
  };

  const toggleTagSelection = (node: SubscriptionNode): void => {
    const newSelected = new Set(selectedTagIds);
    const leafIds = getAllLeafIdsUnderNode(node);

    // Check if all leaf nodes under this node are selected
    const allSelected = leafIds.every(id => newSelected.has(id));

    if (allSelected) {
      // Deselect all leaf nodes
      leafIds.forEach(id => newSelected.delete(id));
    } else {
      // Select all leaf nodes
      leafIds.forEach(id => newSelected.add(id));
    }

    setSelectedTagIds(newSelected);
  };

  const handleSubmit = (): void => {
    if (selectedTagIds.size === 0) return;
    if (!topic.trim()) return;

    onSendConversion(Array.from(selectedTagIds), topic);
  };

  const renderTree = (nodes: SubscriptionNode[], depth: number = 0): React.ReactNode => {
    return (
      <ul className="mqtt-tree">
        {nodes.map(node => (
          <li key={node.id} className="mqtt-tree-item" style={{ marginLeft: `${depth * 20}px` }}>
            <div className="mqtt-row">
              {node.children && node.children.length > 0 && (
                <button
                  className="expand-btn"
                  onClick={() => toggleNode(node.id)}
                >
                  {expandedNodes.has(node.id) ? '▼' : '▶'}
                </button>
              )}
              {!node.children || node.children.length === 0 ? (
                <span className="expand-placeholder" />
              ) : null}
              <input
                type="checkbox"
                id={`mqtt-${node.id}`}
                checked={
                  node.isLeaf
                    ? selectedTagIds.has(node.tagId)
                    : getAllLeafIdsUnderNode(node).some(id => selectedTagIds.has(id))
                }
                onChange={() => toggleTagSelection(node)}
              />
              <label htmlFor={`mqtt-${node.id}`} className="mqtt-label">
                <span className="mqtt-name">{node.name}</span>
                {!node.isLeaf && <span className="mqtt-type">(folder)</span>}
              </label>
            </div>
            {expandedNodes.has(node.id) && node.children && node.children.length > 0 && (
              <div className="mqtt-children">
                {renderTree(node.children, depth + 1)}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="mqtt-sparkplug-b">
      <h2>MQTT Sparkplug B Conversion</h2>

      {subscriptions.length === 0 ? (
        <div className="no-subscriptions-msg">
          <p>No subscribed tags available. Please subscribe to tags first.</p>
        </div>
      ) : (
        <>
          <div className="mqtt-content">
            <div className="mqtt-tree-section">
              <h3>Available Subscribed Tags</h3>
              <div className="mqtt-tree-container">
                {renderTree(tree)}
              </div>
            </div>

            <div className="mqtt-config-section">
              <h3>Configuration</h3>

              <div className="config-group">
                <label htmlFor="sparkplug-topic">Sparkplug B Topic:</label>
                <input
                  id="sparkplug-topic"
                  type="text"
                  className="topic-input"
                  placeholder="e.g., spBv1.0/namespace/MQTT Devices/device_id/DATA/group_id"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isLoading}
                />
                <p className="topic-hint">The base topic for Sparkplug B messages</p>
              </div>

              <div className="selections-info">
                <p>
                  <strong>{selectedTagIds.size}</strong> tag(s) selected
                </p>
              </div>

              <button
                className="send-conversion-btn"
                onClick={handleSubmit}
                disabled={selectedTagIds.size === 0 || !topic.trim() || isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Conversion Request'}
              </button>
            </div>
          </div>

          <div className="selected-tags-summary">
            <h3>Selected Tags for Conversion</h3>
            {selectedTagIds.size === 0 ? (
              <p className="no-selected">No tags selected</p>
            ) : (
              <div className="selected-tags-list">
                {Array.from(selectedTagIds).map(tagId => {
                  const subscription = subscriptions.find(s => s.tagId === tagId);
                  return (
                    <div key={tagId} className="selected-tag-item">
                      <span className="tag-name">{subscription?.tagName || tagId}</span>
                      <span className="tag-id">{tagId}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
