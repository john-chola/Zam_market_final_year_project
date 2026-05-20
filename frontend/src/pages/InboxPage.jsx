import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchConversations } from '../store/slices/chatSlice';

const timeAgo = (date) => {
  if (!date) return '';
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function InboxPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { conversations, loading, error } = useSelector((s) => s.chat);
  const { user } = useSelector((s) => s.auth);

  useEffect(() => { dispatch(fetchConversations()); }, [dispatch]);

  const isSeller = user?.role === 'seller' || user?.role === 'admin';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      <nav style={{ background: 'var(--coal)', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')}
          style={{ background: 'transparent', border: 'none', color: 'white',
            fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800,
          color: 'white', fontSize: 18 }}>Messages</span>
        {conversations.length > 0 && (
          <span style={{ marginLeft: 'auto', background: 'var(--ember)', color: 'white',
            borderRadius: 20, fontSize: 11, padding: '2px 10px', fontWeight: 500 }}>
            {conversations.reduce((n, c) =>
              n + (isSeller ? c.unreadSeller : c.unreadBuyer), 0) || null}
          </span>
        )}
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {loading && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ash)' }}>
            Loading messages...
          </div>
        )}

        {error && <div className="error-msg" style={{ margin: '1rem' }}>{error}</div>}

        {!loading && conversations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}></div>
            <h3 style={{ marginBottom: 8 }}>No messages yet</h3>
            <p style={{ color: 'var(--ash)', fontSize: 14 }}>
              {isSeller
                ? 'When buyers message you about your listings, conversations will appear here.'
                : 'Find a listing you like and tap "Message Seller" to start a conversation.'}
            </p>
            {!isSeller && (
              <button onClick={() => navigate('/browse')} className="btn btn-ember"
                style={{ marginTop: 20, width: 'auto', padding: '10px 24px' }}>
                Browse Listings
              </button>
            )}
          </div>
        )}

        {conversations.map((conv) => {
          const other = isSeller ? conv.buyer : conv.seller;
          const unread = isSeller ? conv.unreadSeller : conv.unreadBuyer;

          return (
            <div key={conv._id}
              onClick={() => navigate(`/chat/${conv._id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border)',
                background: unread > 0 ? 'rgba(216,90,48,0.04)' : 'white',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#F5F4F0'}
              onMouseLeave={(e) => e.currentTarget.style.background = unread > 0 ? 'rgba(216,90,48,0.04)' : 'white'}
            >
              {/* Avatar */}
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: 'var(--ember)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17,
              }}>
                {other?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontWeight: unread > 0 ? 600 : 500, fontSize: 14,
                    color: 'var(--coal)' }}>
                    {other?.name || 'Unknown'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ash)', flexShrink: 0 }}>
                    {timeAgo(conv.lastMessage?.sentAt || conv.updatedAt)}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--ash)', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  🪵 {conv.listing?.title || 'Listing'}
                </p>
                <p style={{ fontSize: 13, color: unread > 0 ? 'var(--coal)' : 'var(--ash)',
                  fontWeight: unread > 0 ? 500 : 400, margin: '2px 0 0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.lastMessage?.text || 'No messages yet'}
                </p>
              </div>

              {/* Unread badge */}
              {unread > 0 && (
                <div style={{ width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--ember)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  {unread}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}