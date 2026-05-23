import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { logout, upgradeToSeller } from '../store/slices/authSlice';
import { isPWA } from '../utils/pwa';
import './DashboardPage.css';

function TrustScoreBar({ score, onClick }) {
  const getScoreCategory = (score) => {
    if (score >= 70) return 'trusted';
    if (score >= 40) return 'building';
    return 'new';
  };

  const category = getScoreCategory(score);
  
  return (
    <div 
      className={`trust-score-container ${onClick ? 'trust-score-clickable' : ''}`}
      onClick={onClick}
    >
      <div className="trust-score-header">
        <span className="trust-score-label">Trust Score</span>
        <div className="trust-score-meta">
          <span className={`trust-score-badge ${category}`}>
            {score >= 70 ? 'Trusted' : score >= 40 ? 'Building' : 'New'}
          </span>
          <span className={`trust-score-value ${category}`}>{score}/100</span>
        </div>
      </div>
      <div className="trust-score-bar">
        <div 
          className={`trust-score-fill ${category}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {onClick && (
        <p className="trust-score-link">View blockchain history →</p>
      )}
    </div>
  );
}

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  
  if (!offline) return null;
  
  return (
    <div className="offline-banner">
      <span className="offline-banner-icon">📡</span>
      <div>
        <p className="offline-banner-title">You are offline</p>
        <p className="offline-banner-message">
          Cached listings available. Messages will queue and send when reconnected.
        </p>
      </div>
    </div>
  );
}

function PWAInstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa_dismissed') === '1'
  );

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt || dismissed || isPWA()) return null;

  const install = async () => {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa_dismissed', '1');
  };

  return (
    <div className="pwa-banner">
      <div className="pwa-banner-icon">🪵</div>
      <div className="pwa-banner-content">
        <p className="pwa-banner-title">Install ZamMarket</p>
        <p className="pwa-banner-subtitle">Add to home screen — works offline</p>
      </div>
      <div className="pwa-banner-actions">
        <button onClick={dismiss} className="pwa-btn-later">
          Later
        </button>
        <button onClick={install} className="pwa-btn-install">
          Install
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector((s) => s.auth);
  const { conversations } = useSelector((s) => s.chat);

  const isSeller = user?.role === 'seller' || user?.role === 'admin';
  const unreadTotal = conversations.reduce(
    (n, c) => n + (isSeller ? (c.unreadSeller || 0) : (c.unreadBuyer || 0)),
    0
  );
  const trustScore = user?.trustScore?.score || 50;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };
  
  const handleUpgrade = () => {
    const businessName = prompt('Enter your business name (optional):');
    dispatch(upgradeToSeller({ businessName }));
  };

  if (!user) return null;
  
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Seller nav — all Sprint 3 features included
  const sellerItems = [
    { icon: '📋', label: 'My Listings', sub: 'Manage your listings', path: '/listings/my' },
    { icon: '➕', label: 'New Listing', sub: 'Post by voice or text', path: '/listings/new' },
    { icon: '🔍', label: 'Browse', sub: 'See all listings', path: '/browse' },
    {
      icon: '💬',
      label: 'Messages',
      sub: unreadTotal > 0 ? `${unreadTotal} unread` : 'Your inbox',
      path: '/chat',
      badge: unreadTotal,
    },
  ];

  // Buyer nav
  const buyerItems = [
    { icon: '🪵', label: 'Browse Charcoal', sub: 'Find sellers near you', path: '/browse' },
    {
      icon: '📍',
      label: 'Near Me',
      sub: `In ${(user.neighbourhood || 'your area').replace('_', ' ')}`,
      path: `/browse?neighbourhood=${user.neighbourhood}`,
    },
    {
      icon: '💬',
      label: 'Messages',
      sub: unreadTotal > 0 ? `${unreadTotal} unread` : 'Your inbox',
      path: '/chat',
      badge: unreadTotal,
    },
    {
      icon: '🛡️',
      label: 'Trust Score',
      sub: `Score: ${trustScore}/100`,
      path: `/trust/${user?._id || user?.id}`,
    },
  ];

  const navItems = isSeller ? sellerItems : buyerItems;

  return (
    <div className="dashboard-container">
      {/* Nav */}
      <nav className="dashboard-nav">
        <span className="dashboard-logo">
          <span className="dashboard-logo-highlight">🔥</span> ZamMarket
        </span>
        <button onClick={handleLogout} className="dashboard-logout-btn">
          Log out
        </button>
      </nav>

      <div className="dashboard-content">
        {/* Offline banner */}
        <OfflineBanner />

        {/* PWA install prompt */}
        <PWAInstallBanner />

        {/* Profile card */}
        <div className="dashboard-card">
          <div className="profile-section">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-info">
              <h2 className="profile-name">{user.name}</h2>
              <div className="profile-badges">
                <span className={isSeller ? 'badge-seller' : 'badge-buyer'}>
                  {isSeller ? 'Seller' : 'Buyer'}
                </span>
                {user.sellerProfile?.isVerified && (
                  <span className="badge-verified">✓ Verified</span>
                )}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Phone</div>
              <div className="info-value">{user.phone}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Area</div>
              <div className="info-value">
                {(user.neighbourhood || 'Not set').replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Clickable trust score — goes to blockchain page */}
          <TrustScoreBar
            score={trustScore}
            onClick={() => navigate(`/trust/${user?._id || user?.id}`)}
          />
        </div>

        {/* Buyer upgrade banner */}
        {!isSeller && (
          <div className="upgrade-banner">
            <div>
              <p className="upgrade-banner-title">Start selling charcoal</p>
              <p className="upgrade-banner-subtitle">Upgrade to post listings</p>
            </div>
            <button onClick={handleUpgrade} disabled={loading} className="btn-upgrade">
              {loading ? '...' : 'Upgrade →'}
            </button>
          </div>
        )}

        {/* Seller quick action banner */}
        {isSeller && (
          <div className="seller-quick-action">
            <div>
              <p className="seller-quick-action-title">Ready to sell?</p>
              <p className="seller-quick-action-subtitle">Post by voice or type</p>
            </div>
            <button onClick={() => navigate('/listings/new')} className="btn-post">
              + Post →
            </button>
          </div>
        )}

        {/* Seller trust score panel */}
        {isSeller && (
          <div 
            className="dashboard-card trust-panel"
            onClick={() => navigate(`/trust/${user?._id || user?.id}`)}
          >
            <div className="trust-panel-header">
              <p className="trust-panel-title">🔗 Your Trust Score</p>
              <span className="trust-panel-link">View chain →</span>
            </div>
            <TrustScoreBar score={trustScore} />
            <p className="trust-panel-description">
              Score increases when you post listings, complete conversations, and receive ratings.
            </p>
          </div>
        )}

        {/* Nav grid */}
        <div className="nav-grid">
          {navItems.map(({ icon, label, sub, path, badge }) => (
            <Link to={path} key={label} className="nav-link">
              <div className="dashboard-card nav-card">
                <div className="nav-card-icon">{icon}</div>
                {badge > 0 && (
                  <div className="nav-card-badge">{badge}</div>
                )}
                <div className="nav-card-label">{label}</div>
                <div className="nav-card-sub">{sub}</div>
              </div>
            </Link>
          ))}
        </div>

        <p className="dashboard-footer">ZamMarket · Sprint 3 · UNZA 2026</p>
      </div>
    </div>
  );
}