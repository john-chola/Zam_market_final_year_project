import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { logout, upgradeToSeller } from '../store/slices/authSlice';
import { isPWA } from '../utils/pwa';
import './DashboardPage.css';

const getUserId = (user) => user?._id || user?.id || null;

// ── Trust Score Bar (sellers only) ────────────────────
function TrustScoreBar({ score, onClick }) {
  const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  const label = score >= 70 ? 'Trusted' : score >= 40 ? 'Building' : 'New';

  return (
    <div className="trust-score" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="trust-score-header">
        <span className="trust-score-label">Trust Score</span>
        <div className="trust-score-badge">
          <span className={`trust-score-tag ${level}`}>{label}</span>
          <span className={`trust-score-value ${level}`}>{score}/100</span>
        </div>
      </div>
      <div className="trust-score-bar">
        <div className={`trust-score-fill ${level}`} style={{ width: `${score}%` }} />
      </div>
      {onClick && (
        <p className="trust-score-link">🔗 View blockchain history →</p>
      )}
    </div>
  );
}

// ── Offline Banner ─────────────────────────────────────
function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner">
      <span className="offline-banner-icon">📵</span>
      <div>
        <p className="offline-banner-title">You are offline</p>
        <p className="offline-banner-text">
          Cached listings available. Messages will queue and send when reconnected.
        </p>
      </div>
    </div>
  );
}

// ── PWA Install Banner ─────────────────────────────────
function PWAInstallBanner() {
  const [prompt, setPrompt]       = useState(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa_dismissed') === '1'
  );

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setPrompt(e); };
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
    <div className="pwa-install-banner">
      <div className="pwa-icon">🪵</div>
      <div className="pwa-text">
        <p className="pwa-title">Install ZamMarket</p>
        <p className="pwa-subtitle">Add to home screen — works offline</p>
      </div>
      <div className="pwa-actions">
        <button onClick={dismiss} className="btn-pwa-later">Later</button>
        <button onClick={install} className="btn-pwa-install">Install</button>
      </div>
    </div>
  );
}

// ── Main Dashboard Component ───────────────────────────
export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector((s) => s.auth);
  const { conversations }  = useSelector((s) => s.chat);

  const userId      = getUserId(user);
  const isSeller    = user?.role === 'seller' || user?.role === 'admin';
  const unreadTotal = conversations.reduce((n, c) =>
    n + (isSeller ? (c.unreadSeller || 0) : (c.unreadBuyer || 0)), 0);
  const trustScore  = user?.trustScore?.score || 50;

  const handleLogout  = () => { dispatch(logout()); navigate('/login'); };
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

  // ── Seller navigation items ──────────────────────────
  const sellerItems = [
    { icon: '📦', label: 'My Listings',  sub: 'Manage your listings',   path: '/listings/my' },
    { icon: '➕', label: 'New Listing',  sub: 'Post by voice or text',   path: '/listings/new' },
    { icon: '🔍', label: 'Browse',       sub: 'See all listings',        path: '/browse' },
    { icon: '💬', label: 'Messages',
      sub: unreadTotal > 0 ? `${unreadTotal} unread` : 'Your inbox',
      path: '/chat', badge: unreadTotal },
  ];

  // ── Buyer navigation items ───────────────────────────
  const buyerItems = [
    { icon: '🔍', label: 'Browse Charcoal', sub: 'Find sellers near you', path: '/browse' },
    { icon: '📍', label: 'Near Me',
      sub: `In ${(user.neighbourhood || 'your area').replace('_', ' ')}`,
      path: `/browse?neighbourhood=${user.neighbourhood}` },
    { icon: '💬', label: 'Messages',
      sub: unreadTotal > 0 ? `${unreadTotal} unread` : 'Your inbox',
      path: '/chat', badge: unreadTotal },
    { icon: '🪵', label: 'Become a Seller', sub: 'Post charcoal listings',
      path: null, action: 'upgrade' },
  ];

  const navItems = isSeller ? sellerItems : buyerItems;

  return (
    <div className="dashboard">
      {/* Navigation */}
      <nav className="dashboard-nav">
        <span className="nav-brand">
          <span className="brand-dot">●</span> ZamMarket
        </span>
        <button onClick={handleLogout} className="btn-logout">
          Log out
        </button>
      </nav>

      <div className="dashboard-content">
        <OfflineBanner />
        <PWAInstallBanner />

        {/* Profile Card */}
        <div className={`card profile-card ${isSeller ? 'has-trust' : ''}`}>
          <div className="profile-header">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-info">
              <h2 className="profile-name">{user.name}</h2>
              <div className="profile-badges">
                <span className={`badge ${isSeller ? 'badge-seller' : 'badge-buyer'}`}>
                  {isSeller ? '🪵 Seller' : '🛒 Buyer'}
                </span>
                {user.sellerProfile?.isVerified && (
                  <span className="badge badge-verified">✓ Verified</span>
                )}
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="profile-details">
            <div className="detail-item">
              <div className="detail-label">Phone</div>
              <div className="detail-value">{user.phone}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Area</div>
              <div className="detail-value">
                {(user.neighbourhood || 'Not set').replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Trust score bar — sellers only */}
          {isSeller && (
            <TrustScoreBar
              score={trustScore}
              onClick={userId ? () => navigate(`/trust/${userId}`) : undefined}
            />
          )}
        </div>

        {/* Buyer upgrade banner */}
        {!isSeller && (
          <div className="upgrade-banner buyer">
            <div className="banner-text">
              <p className="banner-title">Start selling charcoal</p>
              <p className="banner-subtitle">Upgrade to post listings</p>
            </div>
            <button onClick={handleUpgrade} disabled={loading} className="btn-upgrade">
              {loading ? '...' : 'Upgrade →'}
            </button>
          </div>
        )}

        {/* Seller quick action + trust chain */}
        {isSeller && (
          <>
            <div className="upgrade-banner seller">
              <div className="banner-text">
                <p className="banner-title">Ready to sell?</p>
                <p className="banner-subtitle">Post by voice 🎙️ or type</p>
              </div>
              <button onClick={() => navigate('/listings/new')} className="btn-upgrade">
                + Post →
              </button>
            </div>

            {/* Blockchain trust chain card */}
            {userId && (
              <div
                className="card trust-chain-card"
                onClick={() => navigate(`/trust/${userId}`)}
              >
                <div className="trust-chain-header">
                  <p className="trust-chain-title">🔗 Your Trust Score</p>
                  <span className="trust-chain-link-text">View chain →</span>
                </div>
                <TrustScoreBar score={trustScore} />
                <p className="trust-chain-description">
                  Increases with listings, conversations, and buyer ratings.
                </p>
              </div>
            )}
          </>
        )}

        {/* Navigation Grid */}
        <div className="nav-grid">
          {navItems.map(({ icon, label, sub, path, badge, action }) => {
            const cardContent = (
              <div className="nav-card">
                <div className="nav-card-icon">{icon}</div>
                {badge > 0 && (
                  <div className="notification-badge">{badge}</div>
                )}
                <div className="nav-card-label">{label}</div>
                <div className="nav-card-sub">{sub}</div>
              </div>
            );

            return path ? (
              <Link to={path} key={label} className="nav-card-link">
                {cardContent}
              </Link>
            ) : (
              <div key={label} onClick={action === 'upgrade' ? handleUpgrade : undefined}>
                {cardContent}
              </div>
            );
          })}
        </div>

        <p className="dashboard-footer">ZamMarket · Sprint 4 · UNZA 2026</p>
      </div>
    </div>
  );
}