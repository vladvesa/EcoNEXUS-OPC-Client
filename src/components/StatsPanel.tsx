import React from 'react';
import { Subscription } from '../types/index';
import './StatsPanel.css';

interface StatsPanelProps {
  subscriptions: Subscription[];
  totalUpdates: number;
  updatesPerSecond: number;
  sessionStart: Date;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  subscriptions,
  totalUpdates,
  updatesPerSecond,
  sessionStart,
}) => {
  const sessionDuration = Math.floor((Date.now() - sessionStart.getTime()) / 1000);
  const minutes = Math.floor(sessionDuration / 60);
  const seconds = sessionDuration % 60;
  const activeCount = subscriptions.filter(s => s.status === 'active').length;

  const handlePrint = () => window.print();

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <h2>Statistici Sesiune</h2>
        <button className="print-btn no-print" onClick={handlePrint}>
          Printeaza Raport
        </button>
      </div>

      <div className="print-title">
        <h1>EcoNEXUS OPC UA — Raport Sesiune</h1>
        <p>Data: {new Date().toLocaleString('ro-RO')} &nbsp;|&nbsp; Start sesiune: {sessionStart.toLocaleTimeString('ro-RO')}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-card-label">Subscriptii active</span>
          <span className="stat-card-value">{activeCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Total updates primite</span>
          <span className="stat-card-value">{totalUpdates.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Updates / secunda</span>
          <span className="stat-card-value">{updatesPerSecond}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Durata sesiune</span>
          <span className="stat-card-value">{minutes}m {seconds}s</span>
        </div>
      </div>

      {subscriptions.length > 0 && (
        <div className="stats-table-wrapper">
          <h3>Detalii per tag</h3>
          <table className="stats-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tag</th>
                <th>NodeID</th>
                <th>Status</th>
                <th>Ultima valoare</th>
                <th>Updates primite</th>
                <th>Ultima actualizare</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub, idx) => (
                <tr key={sub.tagId} className={sub.status}>
                  <td>{idx + 1}</td>
                  <td>{sub.tagName}</td>
                  <td className="node-id">{sub.tagId}</td>
                  <td>
                    <span className={`status-badge ${sub.status}`}>{sub.status}</span>
                  </td>
                  <td>
                    {sub.lastValue !== undefined && sub.lastValue !== null
                      ? String(sub.lastValue)
                      : '—'}
                  </td>
                  <td>{sub.updateCount ?? 0}</td>
                  <td>
                    {sub.timestamp
                      ? new Date(sub.timestamp).toLocaleTimeString('ro-RO')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subscriptions.length === 0 && (
        <p className="no-data">Nicio subscriptie activa. Subscrie la tag-uri pentru a vedea statistici.</p>
      )}
    </div>
  );
};
