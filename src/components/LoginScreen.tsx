import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginScreen.css';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!login(username, password)) {
      setError('Utilizator sau parola incorecta.');
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">⬡</span>
          <span className="login-logo-text">EcoNEXUS</span>
        </div>
        <p className="login-subtitle">OPC UA Client — Node-RED Interface</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label className="login-label">Utilizator</label>
            <input
              className="login-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              placeholder="admin / operator"
            />
          </div>
          <div className="login-field">
            <label className="login-label">Parola</label>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="login-btn" type="submit">Autentificare</button>
        </form>
      </div>
    </div>
  );
};
