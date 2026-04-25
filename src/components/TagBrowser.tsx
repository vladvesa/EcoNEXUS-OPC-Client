import React, { useState } from 'react';
import { OpcUaTag } from '../types/index';
import { getTagDisplayName } from '../utils/tagParser';
import './TagBrowser.css';

interface TagBrowserProps {
  tags: OpcUaTag[];
  onSelectTags: (selectedTags: OpcUaTag[]) => void;
  onRebrowse: () => void;
  isLoading: boolean;
}

export const TagBrowser: React.FC<TagBrowserProps> = ({ tags, onSelectTags, onRebrowse, isLoading }) => {
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

  // Get all descendant tag IDs recursively
  const getAllDescendantIds = (tag: OpcUaTag): string[] => {
    const ids: string[] = [];
    const identifier = tag.nodeId || tag.id;
    
    // Add the tag itself if it's a leaf node
    if (!tag.isFolder) {
      ids.push(identifier);
    }
    
    // Add all children recursively
    if (tag.children) {
      tag.children.forEach(child => {
        ids.push(...getAllDescendantIds(child));
      });
    }
    
    return ids;
  };

  const toggleTagSelection = (tag: OpcUaTag): void => {
    const newSelected = new Set(selectedTags);
    const descendantIds = getAllDescendantIds(tag);
    
    // Check if this tag or any of its descendants are selected
    const isCurrentlySelected = descendantIds.some(id => newSelected.has(id));
    
    if (isCurrentlySelected) {
      // Deselect all descendants
      descendantIds.forEach(id => newSelected.delete(id));
    } else {
      // Select all descendants
      descendantIds.forEach(id => newSelected.add(id));
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
                checked={getAllDescendantIds(tag).some(id => selectedTags.has(id))}
                onChange={() => toggleTagSelection(tag)}
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
      <div className="browser-header">
        <h2>OPC UA Tag Browser</h2>
        <button
          className="rebrowse-btn"
          onClick={onRebrowse}
          disabled={isLoading}
          title="Refresh tag browser"
        >
          Rebrowse
        </button>
      </div>
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
