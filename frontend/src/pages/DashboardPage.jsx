import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { logout, upgradeToSeller } from '../store/slices/authSlice';
import { isPWA } from '../utils/pwa';
import './DashboardPage.css';

function TrustScoreBar({ score, onClick }) {
  const color = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--ember)' : '#E24B4A';
  const label = score >= 70 ? 'Trusted' : score >= 40 ? 'Building' : 'New';
  return (
    <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--ash)' }}>Trust Score</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, background: `${color}22`, color,
            padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color }}>{score}/100</span>
        </div>
      </div>
      <div style={{ height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color,
          borderRadius: 4, transition: 'width 1s ease' }} />
      </div>
      {onClick && (
        <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 5, textAlign: 'right' }}>
           View blockchain history →
        </p>
      )}
    </div>
  );
}

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on  = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (!offline) return null;
  return (
    <div style={{ background: '#BA7517', borderRadius: 10, padding: '10px 14px',
      marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 16 }}></span>
      <div>
        <p style={{ color: 'white', fontSize: 13, fontWeight: 500, margin: 0 }}>You are offline</p>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0 }}>
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
    <div style={{ background: 'var(--coal)', borderRadius: 12, padding: '1rem 1.25rem',
      marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--ember)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0 }}>🪵</div>
      <div style={{ flex: 1 }}>
        <p style={{ color: 'white', fontWeight: 500, fontSize: 13, margin: 0 }}>
          Install ZamMarket
        </p>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '2px 0 0' }}>
          Add to home screen — works offline
        </p>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={dismiss}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.6)', padding: '5px 10px', borderRadius: 6,
            cursor: 'pointer', fontSize: 12 }}>Later</button>
        <button onClick={install}
          style={{ background: 'var(--ember)', color: 'white', border: 'none',
            padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
            fontSize: 12, fontWeight: 500 }}>Install</button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector((s) => s.auth);
  const { conversations }  = useSelector((s) => s.chat);

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
  const initials = user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  // Seller nav — all Sprint 3 features included
  const sellerItems = [
    { icon: '', label: 'My Listings',  sub: 'Manage your listings',   path: '/listings/my' },
    { icon: '', label: 'New Listing',  sub: 'Post by voice or text',   path: '/listings/new' },
    { icon: '', label: 'Browse',       sub: 'See all listings',        path: '/browse' },
    { icon: '', label: 'Messages',     sub: unreadTotal > 0 ? `${unreadTotal} unread` : 'Your inbox',
      path: '/chat', badge: unreadTotal },
  ];

  // Buyer nav
  const buyerItems = [
    { icon: '', label: 'Browse Charcoal', sub: 'Find sellers near you',
      path: '/browse' },
    { icon: '', label: 'Near Me',         sub: `In ${(user.neighbourhood || 'your area').replace('_', ' ')}`,
      path: `/browse?neighbourhood=${user.neighbourhood}` },
    { icon: '', label: 'Messages',        sub: unreadTotal > 0 ? `${unreadTotal} unread` : 'Your inbox',
      path: '/chat', badge: unreadTotal },
    { icon: '', label: 'Trust Score',     sub: `Score: ${trustScore}/100`,
      path: `/trust/${user?._id || user?.id}` },
  ];

  const navItems = isSeller ? sellerItems : buyerItems;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      {/* Nav */}
      <nav style={{ background: 'var(--coal)', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'white', fontSize: 20 }}>
          <span style={{ color: 'var(--ember)' }}></span> ZamMarket
        </span>
        <button onClick={handleLogout}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          Log out
        </button>
      </nav>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem' }}>

        {/* Offline banner */}
        <OfflineBanner />

        {/* PWA install prompt */}
        <PWAInstallBanner />

        {/* Profile card */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--ember)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 18, marginBottom: 3 }}>{user.name}</h2>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  background: isSeller ? 'var(--green-light)' : 'var(--ember-light)',
                  color: isSeller ? 'var(--green)' : 'var(--ember-dark)',
                  fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 500 }}>
                  {isSeller ? 'Seller' : 'Buyer'}
                </span>
                {user.sellerProfile?.isVerified && (
                  <span style={{ fontSize: 11, background: 'var(--green-light)',
                    color: 'var(--green)', padding: '2px 10px', borderRadius: 20, fontWeight: 500 }}>
                     Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <div style={{ background: 'var(--cream)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--ash)', textTransform: 'uppercase',
                letterSpacing: '0.05em', marginBottom: 2 }}>Phone</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{user.phone}</div>
            </div>
            <div style={{ background: 'var(--cream)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--ash)', textTransform: 'uppercase',
                letterSpacing: '0.05em', marginBottom: 2 }}>Area</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
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
          <div style={{ background: 'var(--coal)', borderRadius: 12, padding: '1.25rem',
            marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>Start selling charcoal</p>
              <p style={{ color: 'var(--ash)', fontSize: 12, marginTop: 2 }}>Upgrade to post listings</p>
            </div>
            <button onClick={handleUpgrade} disabled={loading}
              style={{ background: 'var(--ember)', color: 'white', border: 'none',
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 500, flexShrink: 0, marginLeft: 12 }}>
              {loading ? '...' : 'Upgrade →'}
            </button>
          </div>
        )}

        {/* Seller quick action banner */}
        {isSeller && (
          <div style={{ background: 'var(--ember)', borderRadius: 12, padding: '1.25rem',
            marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>Ready to sell?</p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                Post by voice or type
              </p>
            </div>
            <button onClick={() => navigate('/listings/new')}
              style={{ background: 'white', color: 'var(--ember-dark)', border: 'none',
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 500, flexShrink: 0, marginLeft: 12 }}>
              + Post →
            </button>
          </div>
        )}

        {/* Seller trust score panel */}
        {isSeller && (
          <div className="card" style={{ marginBottom: 14 }}
            onClick={() => navigate(`/trust/${user?._id || user?.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 500 }}>🔗 Your Trust Score</p>
              <span style={{ fontSize: 11, color: 'var(--ash)' }}>View chain →</span>
            </div>
            <TrustScoreBar score={trustScore} />
            <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 8 }}>
              Score increases when you post listings, complete conversations, and receive ratings.
            </p>
          </div>
        )}

        {/* Nav grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {navItems.map(({ icon, label, sub, path, badge }) => (
            <Link to={path} key={label} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ textAlign: 'center', padding: '1.25rem 1rem',
                cursor: 'pointer', position: 'relative', transition: 'border-color 0.15s' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--ember)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
                {badge > 0 && (
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18,
                    borderRadius: '50%', background: 'var(--ember)', color: 'white',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {badge}
                  </div>
                )}
                <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--coal)' }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>{sub}</div>
              </div>
            </Link>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ash)', marginTop: '2rem' }}>
          ZamMarket · Sprint 3 · UNZA 2026
        </p>
      </div>
    </div>
  );
}