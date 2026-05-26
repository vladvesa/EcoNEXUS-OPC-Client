import React, { useState, useEffect } from 'react';
import { OpcUaTag, OpcUaServer } from '../types/index';
import { getTagDisplayName } from '../utils/tagParser';
import { useAuth } from '../contexts/AuthContext';
import './TagBrowser.css';

interface TagBrowserProps {
  tags: OpcUaTag[];
  servers: OpcUaServer[];
  selectedServerId: string | null;
  onServerChange: (serverId: string) => void;
  onSelectTags: (selectedTags: OpcUaTag[], serverId: string) => void;
  onRebrowse: () => void;
  onAddServer: (name: string, endpoint: string) => void;
  onDeleteServer: (serverId: string) => void;
  isLoading: boolean;
}

export const TagBrowser: React.FC<TagBrowserProps> = ({
  tags,
  servers,
  selectedServerId,
  onServerChange,
  onSelectTags,
  onRebrowse,
  onAddServer,
  onDeleteServer,
  isLoading,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEndpoint, setNewEndpoint] = useState('opc.tcp://');

  // Clear selection when the tag tree changes (server switch)
  useEffect(() => {
    setSelectedTags(new Set());
    setExpandedNodes(new Set());
  }, [tags]);

  const toggleNode = (nodeId: string): void => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getAllDescendantIds = (tag: OpcUaTag): string[] => {
    const ids: string[] = [];
    const identifier = tag.nodeId || tag.id;
    if (!tag.isFolder) {
      ids.push(identifier);
    }
    if (tag.children) {
      tag.children.forEach(child => {
        ids.push(...getAllDescendantIds(child));
      });
    }
    return ids;
  };

  const toggleTagSelection = (tag: OpcUaTag): void => {
    if (!isAdmin) return;
    const newSelected = new Set(selectedTags);
    const descendantIds = getAllDescendantIds(tag);
    const isCurrentlySelected = descendantIds.some(id => newSelected.has(id));
    if (isCurrentlySelected) {
      descendantIds.forEach(id => newSelected.delete(id));
    } else {
      descendantIds.forEach(id => newSelected.add(id));
    }
    setSelectedTags(newSelected);
  };

  const handleSubmit = (): void => {
    if (!selectedServerId) return;
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
    onSelectTags(selectedTagNodes, selectedServerId);
    setSelectedTags(new Set());
  };

  const handleAddServerSubmit = (): void => {
    const name = newName.trim();
    const endpoint = newEndpoint.trim();
    if (!name || !endpoint || endpoint === 'opc.tcp://') return;
    onAddServer(name, endpoint);
    setNewName('');
    setNewEndpoint('opc.tcp://');
    setShowAddForm(false);
  };

  const handleSubscribeAll = (): void => {
    if (!selectedServerId) return;
    const allLeafTags: OpcUaTag[] = [];
    const collectLeafTags = (tagList: OpcUaTag[]) => {
      tagList.forEach(tag => {
        if (!tag.isFolder && tag.nodeId) {
          allLeafTags.push(tag);
        }
        if (tag.children) {
          collectLeafTags(tag.children);
        }
      });
    };
    collectLeafTags(tags);
    onSelectTags(allLeafTags, selectedServerId);
    setSelectedTags(new Set());
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
              {(!tag.children || tag.children.length === 0) && (
                <span className="expand-placeholder" />
              )}
              {isAdmin && (
                <input
                  type="checkbox"
                  id={`tag-${tag.id}`}
                  checked={getAllDescendantIds(tag).some(id => selectedTags.has(id))}
                  onChange={() => toggleTagSelection(tag)}
                />
              )}
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
          disabled={isLoading || !selectedServerId}
          title="Refresh tag browser"
        >
          🔄 Rebrowse
        </button>
      </div>

      <div className="server-selector">
        <div className="server-selector-header">
          <label className="server-selector-label" htmlFor="server-select">OPC UA Server Browser</label>
          {isAdmin && (
            <button
              className="add-server-toggle-btn"
              onClick={() => setShowAddForm(v => !v)}
              title="Adauga server nou"
            >
              {showAddForm ? '✕' : '+ Server'}
            </button>
          )}
        </div>
        {servers.length === 0 ? (
          <span className="no-servers">Se incarca serverele...</span>
        ) : (
          <div className="server-select-row">
            <select
              id="server-select"
              className="server-select"
              value={selectedServerId ?? ''}
              onChange={e => onServerChange(e.target.value)}
            >
              {servers.map(server => (
                <option key={server.id} value={server.id} title={server.endpoint}>
                  {server.name}{server.endpoint ? ` — ${server.endpoint}` : ''}
                </option>
              ))}
            </select>
            {isAdmin && servers.length > 1 && selectedServerId && (
              <button
                className="delete-server-btn"
                onClick={() => onDeleteServer(selectedServerId)}
                title="Sterge serverul selectat din lista"
              >
                ✕
              </button>
            )}
          </div>
        )}
        {isAdmin && showAddForm && (
          <div className="add-server-form">
            <input
              className="add-server-input"
              type="text"
              placeholder="Nume server (ex: Kepware Plant 2)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <input
              className="add-server-input"
              type="text"
              placeholder="opc.tcp://192.168.1.100:49320"
              value={newEndpoint}
              onChange={e => setNewEndpoint(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddServerSubmit()}
            />
            <div className="add-server-actions">
              <button
                className="add-server-btn"
                onClick={handleAddServerSubmit}
                disabled={!newName.trim() || newEndpoint.trim() === 'opc.tcp://'}
              >
                Conecteaza
              </button>
              <button className="add-server-cancel-btn" onClick={() => setShowAddForm(false)}>
                Anuleaza
              </button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="loading">Se incarca tag-urile...</div>
      ) : !selectedServerId ? (
        <div className="no-tags">Selecteaza un server pentru a vedea tag-urile</div>
      ) : (
        <>
          <div className="browser-container">
            {tags.length > 0
              ? renderTagTree(tags)
              : <p className="no-tags">Nu exista tag-uri disponibile</p>
            }
          </div>
          {isAdmin && (
            <div className="selections-summary">
              <div className="selections-left">
                <span className="selections-count">{selectedTags.size} tag(uri) selectate</span>
                <button
                  className="submit-btn"
                  onClick={handleSubmit}
                  disabled={selectedTags.size === 0 || !selectedServerId}
                >
                  Aboneaza Selectate
                </button>
              </div>
              <button
                className="subscribe-all-btn"
                onClick={handleSubscribeAll}
                disabled={tags.length === 0 || !selectedServerId}
              >
                Abonare all topics
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
