import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(VALID_PASSWORD);
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
    }, 100);
  };

  const VALID_PASSWORD = 'password';

  return (
    <div className="login-container">
      {/* Animated gradient background */}
      <div className="login-background">
        <div className="gradient-blob blob-1"></div>
        <div className="gradient-blob blob-2"></div>
        <div className="gradient-blob blob-3"></div>
      </div>

      {/* Login card */}
      <div className="login-card">
        <div className="login-header">
          <div className="logo-circle">
            <div className="logo-text">E</div>
          </div>
          <h1>Excevo Dashboard</h1>
          <p className="subtitle">Performance Analytics & Reporting</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <input
                id="email"
                type="email"
                placeholder="emerson.thomas@excevo.co.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoFocus
                className={error ? 'error' : ''}
              />
              <span className="input-icon">✉️</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className={error ? 'error' : ''}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <span className="arrow">→</span>
              </>
            )}
          </button>
        </form>

        <div className="divider">
          <span>Demo Accounts</span>
        </div>

        <div className="demo-accounts">
          <button
            type="button"
            className="demo-button"
            onClick={() => handleDemoLogin('emerson.thomas@excevo.co.uk')}
            disabled={loading}
          >
            <span className="demo-avatar">ET</span>
            <div className="demo-info">
              <div className="demo-name">Emerson</div>
              <div className="demo-email">emerson.thomas</div>
            </div>
          </button>
          <button
            type="button"
            className="demo-button"
            onClick={() => handleDemoLogin('fabian.hutton@excevo.co.uk')}
            disabled={loading}
          >
            <span className="demo-avatar">FH</span>
            <div className="demo-info">
              <div className="demo-name">Fabian</div>
              <div className="demo-email">fabian.hutton</div>
            </div>
          </button>
          <button
            type="button"
            className="demo-button"
            onClick={() => handleDemoLogin('jaswanth.lal@excevo.co.uk')}
            disabled={loading}
          >
            <span className="demo-avatar">JL</span>
            <div className="demo-info">
              <div className="demo-name">Jaswanth</div>
              <div className="demo-email">jaswanth.lal</div>
            </div>
          </button>
          <button
            type="button"
            className="demo-button"
            onClick={() => handleDemoLogin('simon.kay@excevo.co.uk')}
            disabled={loading}
          >
            <span className="demo-avatar">SK</span>
            <div className="demo-info">
              <div className="demo-name">Simon</div>
              <div className="demo-email">simon.kay</div>
            </div>
          </button>
        </div>

        <div className="login-footer">
          <p className="info-text">Demo password: <code>password</code></p>
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="particles">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="particle" style={{ '--delay': `${i * 0.1}s` } as React.CSSProperties}></div>
        ))}
      </div>
    </div>
  );
}
