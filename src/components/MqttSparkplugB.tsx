import React, { useState } from 'react';
import { Subscription, SparkplugTopicConfig } from '../types/index';
import './MqttSparkplugB.css';

interface ConfiguredTopic {
  id: string;
  groupId: string;
  edgeNodeId: string;
  deviceId: string;
  selectedTagIds: string[];
  status: 'draft' | 'sent';
}

interface MqttSparkplugBProps {
  subscriptions: Subscription[];
  onSendConversion: (topics: SparkplugTopicConfig[]) => void;
  isLoading: boolean;
}

let topicCounter = 0;
const generateId = () => `topic-${Date.now()}-${++topicCounter}`;

export const MqttSparkplugB: React.FC<MqttSparkplugBProps> = ({
  subscriptions,
  onSendConversion,
  isLoading,
}) => {
  const [formGroupId, setFormGroupId] = useState('Factory1');
  const [formEdgeNodeId, setFormEdgeNodeId] = useState('Node-RED-GW');
  const [formDeviceId, setFormDeviceId] = useState('');
  const [formSelectedTags, setFormSelectedTags] = useState<Set<string>>(new Set());
  const [configuredTopics, setConfiguredTopics] = useState<ConfiguredTopic[]>([]);

  const serverGroups = Object.entries(
    subscriptions.reduce((acc, sub) => {
      const key = sub.serverId ?? 'default';
      if (!acc[key]) acc[key] = { serverName: sub.serverName ?? key, tags: [] };
      acc[key].tags.push(sub);
      return acc;
    }, {} as Record<string, { serverName: string; tags: Subscription[] }>)
  );

  const topicPreview =
    formGroupId.trim() && formEdgeNodeId.trim() && formDeviceId.trim()
      ? `spBv1.0/${formGroupId.trim()}/DDATA/${formEdgeNodeId.trim()}/${formDeviceId.trim()}`
      : '';

  const toggleTag = (tagId: string) => {
    setFormSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId); else next.add(tagId);
      return next;
    });
  };

  const toggleServerGroup = (tags: Subscription[]) => {
    const tagIds = tags.map(t => t.tagId);
    const allSelected = tagIds.every(id => formSelectedTags.has(id));
    setFormSelectedTags(prev => {
      const next = new Set(prev);
      if (allSelected) {
        tagIds.forEach(id => next.delete(id));
      } else {
        tagIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleAddTopic = () => {
    if (!formGroupId.trim() || !formEdgeNodeId.trim() || !formDeviceId.trim() || formSelectedTags.size === 0) return;
    setConfiguredTopics(prev => [...prev, {
      id: generateId(),
      groupId: formGroupId.trim(),
      edgeNodeId: formEdgeNodeId.trim(),
      deviceId: formDeviceId.trim(),
      selectedTagIds: Array.from(formSelectedTags),
      status: 'draft',
    }]);
    setFormSelectedTags(new Set());
    setFormDeviceId('');
  };

  const removeTopic = (id: string) => {
    setConfiguredTopics(prev => prev.filter(t => t.id !== id));
  };

  const handleSend = () => {
    const toSend = configuredTopics.filter(t => t.status === 'draft');
    if (toSend.length === 0) return;
    onSendConversion(toSend.map(t => ({
      id: t.id,
      topic: `spBv1.0/${t.groupId}/DDATA/${t.edgeNodeId}/${t.deviceId}`,
      selectedTagIds: t.selectedTagIds,
    })));
    setConfiguredTopics(prev => prev.map(t => t.status === 'draft' ? { ...t, status: 'sent' } : t));
  };

  const canAdd = formGroupId.trim() && formEdgeNodeId.trim() && formDeviceId.trim() && formSelectedTags.size > 0;
  const draftCount = configuredTopics.filter(t => t.status === 'draft').length;

  if (subscriptions.length === 0) {
    return (
      <div className="mqtt-sparkplug-b">
        <div className="mqtt-header">
          <h2>MQTT Sparkplug B Configuration</h2>
        </div>
        <div className="no-subscriptions-msg">
          <p>Nu exista tag-uri abonate. Aboneaza-te la tag-uri in tab-ul OPC UA mai intai.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mqtt-sparkplug-b">
      <div className="mqtt-header">
        <h2>MQTT Sparkplug B Configuration</h2>
      </div>

      <div className="mqtt-main">
        {/* STANGA: selectie taguri */}
        <div className="mqtt-tags-panel">
          <div className="mqtt-panel-title">
            Taguri Abonate OPC UA
            {formSelectedTags.size > 0 && (
              <span className="mqtt-panel-selected">{formSelectedTags.size} selectate</span>
            )}
          </div>
          <p className="mqtt-tags-hint">Selecteaza individual sau pe tot serverul</p>
          <div className="mqtt-tags-scroll">
            {serverGroups.map(([serverId, { serverName, tags }]) => {
              const tagIds = tags.map(t => t.tagId);
              const selectedCount = tagIds.filter(id => formSelectedTags.has(id)).length;
              const allSelected = selectedCount === tagIds.length && tagIds.length > 0;
              const someSelected = selectedCount > 0 && !allSelected;
              return (
                <div key={serverId} className="mqtt-server-group">
                  <div className="mqtt-server-header">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={() => toggleServerGroup(tags)}
                    />
                    <span className="mqtt-server-name">{serverName}</span>
                    <span className="mqtt-server-count">{selectedCount}/{tagIds.length}</span>
                  </div>
                  <div className="mqtt-tag-items">
                    {tags.map(sub => (
                      <div key={sub.tagId} className="mqtt-tag-row">
                        <input
                          type="checkbox"
                          id={`mqtttag-${sub.tagId}`}
                          checked={formSelectedTags.has(sub.tagId)}
                          onChange={() => toggleTag(sub.tagId)}
                        />
                        <label htmlFor={`mqtttag-${sub.tagId}`} className="mqtt-tag-label">
                          <span className="mqtt-tag-name">{sub.tagName}</span>
                          {sub.lastValue !== undefined && (
                            <span className="mqtt-tag-value">
                              {typeof sub.lastValue === 'object'
                                ? JSON.stringify(sub.lastValue)
                                : String(sub.lastValue)}
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DREAPTA: constructor topic */}
        <div className="mqtt-builder-panel">
          <div className="mqtt-panel-title">Configurare Topic Sparkplug B</div>
          <div className="mqtt-builder-form">
            <div className="mqtt-field-group">
              <div className="mqtt-field">
                <label className="mqtt-field-label">Group ID</label>
                <input
                  className="mqtt-field-input"
                  type="text"
                  value={formGroupId}
                  onChange={e => setFormGroupId(e.target.value)}
                  placeholder="ex: Factory1"
                />
              </div>
              <div className="mqtt-field">
                <label className="mqtt-field-label">Edge Node ID</label>
                <input
                  className="mqtt-field-input"
                  type="text"
                  value={formEdgeNodeId}
                  onChange={e => setFormEdgeNodeId(e.target.value)}
                  placeholder="ex: Node-RED-GW"
                />
              </div>
              <div className="mqtt-field">
                <label className="mqtt-field-label">Device ID</label>
                <input
                  className="mqtt-field-input"
                  type="text"
                  value={formDeviceId}
                  onChange={e => setFormDeviceId(e.target.value)}
                  placeholder="ex: PLC2"
                />
              </div>
            </div>

            <div className="mqtt-preview-box">
              <span className="mqtt-preview-label">Topic preview:</span>
              {topicPreview
                ? <code className="mqtt-preview-value">{topicPreview}</code>
                : <span className="mqtt-preview-placeholder">spBv1.0/ ... completati campurile</span>
              }
            </div>

            {formSelectedTags.size > 0 && (
              <div className="mqtt-selection-summary">
                <span className="summary-active">{formSelectedTags.size} tag(uri) selectate</span>
              </div>
            )}

            <button
              className="mqtt-add-btn"
              onClick={handleAddTopic}
              disabled={!canAdd || isLoading}
            >
              + Adauga Topic
            </button>
          </div>
        </div>
      </div>

      {/* TOPICURI CONFIGURATE */}
      {configuredTopics.length > 0 && (
        <div className="mqtt-configured-section">
          <div className="mqtt-panel-title">Topicuri Configurate ({configuredTopics.length})</div>
          <div className="mqtt-configured-list">
            {configuredTopics.map((t, i) => {
              const fullTopic = `spBv1.0/${t.groupId}/DDATA/${t.edgeNodeId}/${t.deviceId}`;
              return (
                <div key={t.id} className={`mqtt-configured-row mqtt-configured-row--${t.status}`}>
                  <span className="mqtt-configured-index">#{i + 1}</span>
                  <code className="mqtt-configured-topic" title={fullTopic}>{fullTopic}</code>
                  <span className="mqtt-configured-tags">{t.selectedTagIds.length} tag(uri)</span>
                  <span className={`mqtt-status-badge mqtt-status-badge--${t.status}`}>
                    {t.status === 'sent' ? '✓ Trimis' : 'Draft'}
                  </span>
                  <button
                    className="mqtt-remove-btn"
                    onClick={() => removeTopic(t.id)}
                    disabled={isLoading}
                    title="Sterge topic"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mqtt-footer">
        <span className="send-info">
          {draftCount > 0
            ? `${draftCount} topic(uri) gata de trimis`
            : configuredTopics.length > 0
              ? 'Toate topicurile au fost trimise'
              : ''}
        </span>
        <button
          className="send-conversion-btn"
          onClick={handleSend}
          disabled={draftCount === 0 || isLoading}
        >
          {isLoading ? 'Se trimite...' : `Send Topics (${draftCount})`}
        </button>
      </div>
    </div>
  );
};
