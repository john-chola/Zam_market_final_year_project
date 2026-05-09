import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { logout, upgradeToSeller } from '../store/slices/authSlice';

function TrustScoreBar({ score }) {
  const color = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--ember)' : '#E24B4A';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--ash)' }}>Trust Score</span>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{score}/100</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color,
          borderRadius: 3, transition: 'width 0.5s' }} />
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
  const unreadTotal = conversations.reduce((n, c) =>
    n + (isSeller ? (c.unreadSeller || 0) : (c.unreadBuyer || 0)), 0);

  const handleLogout = () => { dispatch(logout()); navigate('/login'); };
  const handleUpgrade = () => {
    const businessName = prompt('Enter your business name (optional):');
    dispatch(upgradeToSeller({ businessName }));
  };

  if (!user) return null;
  const initials = user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const sellerItems = [
    { icon: '📦', label: 'My Listings', sub: 'Manage your listings', path: '/listings/my' },
    { icon: '➕', label: 'New Listing', sub: 'Post charcoal for sale', path: '/listings/new' },
    { icon: '🔍', label: 'Browse', sub: 'See all listings', path: '/browse' },
    { icon: '💬', label: 'Messages', sub: unreadTotal > 0 ? `${unreadTotal} unread` : 'Your inbox', path: '/chat', badge: unreadTotal },
  ];

  const buyerItems = [
    { icon: '🔍', label: 'Browse Charcoal', sub: 'Find sellers near you', path: '/browse' },
    { icon: '📍', label: 'Near Me', sub: `In ${(user.neighbourhood || 'your area').replace('_', ' ')}`, path: `/browse?neighbourhood=${user.neighbourhood}` },
    { icon: '💬', label: 'Messages', sub: unreadTotal > 0 ? `${unreadTotal} unread` : 'Your inbox', path: '/chat', badge: unreadTotal },
    { icon: '⭐', label: 'Trust Score', sub: 'Coming in Sprint 3', path: '/trust' },
  ];

  const navItems = isSeller ? sellerItems : buyerItems;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <nav style={{ background: 'var(--coal)', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'white', fontSize: 20 }}>
          <span style={{ color: 'var(--ember)' }}>●</span> ZamMarket
        </span>
        <button onClick={handleLogout}
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          Log out
        </button>
      </nav>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem' }}>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--ember)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18 }}>
              {initials}
            </div>
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 2 }}>{user.name}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{
                  background: isSeller ? 'var(--green-light)' : 'var(--ember-light)',
                  color: isSeller ? 'var(--green)' : 'var(--ember-dark)',
                  fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 500,
                }}>
                  {isSeller ? '🪵 Seller' : '🛒 Buyer'}
                </span>
                {user.sellerProfile?.isVerified && (
                  <span style={{ fontSize: 11, background: 'var(--green-light)', color: 'var(--green)',
                    padding: '2px 10px', borderRadius: 20, fontWeight: 500 }}>✓ Verified</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: 'var(--cream)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{user.phone}</div>
            </div>
            <div style={{ background: 'var(--cream)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Area</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                {(user.neighbourhood || 'Not set').replace('_', ' ')}
              </div>
            </div>
          </div>
          <TrustScoreBar score={user.trustScore?.score || 50} />
        </div>

        {!isSeller && (
          <div style={{ background: 'var(--coal)', borderRadius: 12, padding: '1.25rem',
            marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

        {isSeller && (
          <div style={{ background: 'var(--ember)', borderRadius: 12, padding: '1.25rem',
            marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>Ready to sell?</p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>Post a new listing now</p>
            </div>
            <button onClick={() => navigate('/listings/new')}
              style={{ background: 'white', color: 'var(--ember-dark)', border: 'none',
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 500, flexShrink: 0, marginLeft: 12 }}>
              + Post →
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {navItems.map(({ icon, label, sub, path, badge }) => (
            <Link to={path} key={label} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ textAlign: 'center', padding: '1.25rem 1rem',
                cursor: 'pointer', position: 'relative' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
                {badge > 0 && (
                  <div style={{ position: 'absolute', top: 10, right: 10,
                    width: 18, height: 18, borderRadius: '50%', background: 'var(--ember)',
                    color: 'white', fontSize: 10, fontWeight: 600,
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

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ash)', marginTop: '2rem' }}>
          ZamMarket · Sprint 4 · UNZA 2026
        </p>
      </div>
    </div>
  );
}