import React, { useState } from 'react';
import { OpcUaTag } from '../types/index';
import { getTagDisplayName } from '../utils/tagParser';
import './TagBrowser.css';

interface TagBrowserProps {
  tags: OpcUaTag[];
  onSelectTags: (selectedTags: OpcUaTag[]) => void;
  isLoading: boolean;
}

export const TagBrowser: React.FC<TagBrowserProps> = ({ tags, onSelectTags, isLoading }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const toggleNode = (nodeId: string): void => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const toggleTagSelection = (tag: OpcUaTag): void => {
    // Only allow selection of leaf nodes (actual tags, not folders)
    if (tag.isFolder) return;

    const identifier = tag.nodeId || tag.id;
    const newSelected = new Set(selectedTags);
    if (newSelected.has(identifier)) {
      newSelected.delete(identifier);
    } else {
      newSelected.add(identifier);
    }
    setSelectedTags(newSelected);
  };

  const handleSubmit = (): void => {
    // Find all selected tags by traversing the tree
    const selectedTagNodes: OpcUaTag[] = [];

    const findSelectedTags = (tagList: OpcUaTag[]) => {
      tagList.forEach(tag => {
        if (!tag.isFolder) {
          const identifier = tag.nodeId || tag.id;
          if (selectedTags.has(identifier)) {
            selectedTagNodes.push(tag);
          }
        }
        if (tag.children) {
          findSelectedTags(tag.children);
        }
      });
    };

    findSelectedTags(tags);
    onSelectTags(selectedTagNodes);
  };

  const renderTagTree = (tagList: OpcUaTag[]): React.ReactNode => {
    return (
      <ul className="tag-list">
        {tagList.map(tag => (
          <li key={tag.id} className="tag-item">
            <div className="tag-row">
              {tag.children && tag.children.length > 0 && (
                <button
                  className="expand-btn"
                  onClick={() => toggleNode(tag.id)}
                >
                  {expandedNodes.has(tag.id) ? '▼' : '▶'}
                </button>
              )}
              {!tag.children || tag.children.length === 0 ? (
                <span className="expand-placeholder" />
              ) : null}
              <input
                type="checkbox"
                id={`tag-${tag.id}`}
                checked={selectedTags.has(tag.nodeId || tag.id)}
                onChange={() => toggleTagSelection(tag)}
                disabled={tag.isFolder}
              />
              <label htmlFor={`tag-${tag.id}`} className="tag-label">
                <span className="tag-name">{tag.name}</span>
                {tag.isFolder && <span className="tag-type">(folder)</span>}
                {!tag.isFolder && tag.path && <span className="tag-path">{getTagDisplayName(tag)}</span>}
              </label>
            </div>
            {expandedNodes.has(tag.id) && tag.children && tag.children.length > 0 && (
              <div className="tag-children">
                {renderTagTree(tag.children)}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="tag-browser">
      <h2>OPC UA Tag Browser</h2>
      {isLoading ? (
        <div className="loading">Loading tags...</div>
      ) : (
        <>
          <div className="browser-container">
            {tags.length > 0 ? renderTagTree(tags) : <p className="no-tags">No tags available</p>}
          </div>
          <div className="selections-summary">
            <p>{selectedTags.size} tag(s) selected</p>
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={selectedTags.size === 0}
            >
              Subscribe to Selected Tags
            </button>
          </div>
        </>
      )}
    </div>
  );
};
