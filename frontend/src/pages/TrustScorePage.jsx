import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../utils/api';

const EVENT_LABELS = {
  LISTING_CREATED:   { label: 'Listing posted',         icon: '', color: '#3B6D11' },
  CONVERSATION_DONE: { label: 'Conversation completed',  icon: '', color: '#185FA5' },
  BUYER_RATING_5:    { label: '5-star rating received',  icon: '', color: '#BA7517' },
  BUYER_RATING_4:    { label: '4-star rating received',  icon: '', color: '#BA7517' },
  BUYER_RATING_3:    { label: '3-star rating received',  icon: '', color: '#888780' },
  BUYER_RATING_1:    { label: '1-star rating received',  icon: '', color: '#A32D2D' },
  ADMIN_VERIFIED:    { label: 'Admin verified',          icon: '',  color: '#3B6D11' },
};

// Safely compare two IDs regardless of format (string, ObjectId, etc)
const sameId = (id1, id2) => {
  if (!id1 || !id2) return false;
  return String(id1).trim() === String(id2).trim();
};

export default function TrustScorePage() {
  const { sellerId } = useParams();
  const navigate     = useNavigate();
  const { user }     = useSelector((s) => s.auth);

  // Safely extract user ID (handle both _id and id formats)
  const myId     = user?._id || user?.id;
  // Use URL param if present, otherwise fall back to logged-in user
  const targetId = sellerId && sellerId !== 'undefined' ? sellerId : myId;

  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [rating, setRating]           = useState(0);
  const [rated, setRated]             = useState(false);
  const [hasConversation, setHasConversation]     = useState(false);
  const [checkingConversation, setCheckingConversation] = useState(false);

  // Fetch trust chain data
  useEffect(() => {
    if (!targetId || targetId === 'undefined') {
      setError('Could not identify seller. Please try again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api.get(`/trust/${targetId}`)
      .then(({ data: d }) => { 
        setData(d); 
        setLoading(false); 
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Could not load trust data');
        setLoading(false);
      });
  }, [targetId]);

  // Check if current user has a conversation with this seller
  useEffect(() => {
    if (!user || !targetId || sameId(myId, targetId)) {
      setHasConversation(false);
      return;
    }

    setCheckingConversation(true);
    api.get(`/trust/check-conversation/${targetId}`)
      .then(({ data: d }) => {
        setHasConversation(d.hasConversation);
        setCheckingConversation(false);
      })
      .catch((err) => {
        console.error('Error checking conversation:', err);
        setHasConversation(false);
        setCheckingConversation(false);
      });
  }, [myId, targetId, user]);

  const handleRate = async (stars) => {
    if (!targetId || targetId === 'undefined') return;
    setRating(stars);
    try {
      await api.post('/trust/rate', { sellerId: targetId, rating: stars });
      setRated(true);
      const { data: fresh } = await api.get(`/trust/${targetId}`);
      setData(fresh);
    } catch (err) {
      setError(err.response?.data?.message || 'Rating failed');
      setRating(0); // Reset rating on error
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--cream)' }}>
      <p style={{ color: 'var(--ash)' }}>Loading trust data...</p>
    </div>
  );

  const score   = data?.chain?.score ?? 50;
  const isValid = data?.chain?.isValid;
  const blocks  = data?.chain?.blocks || [];
  const seller  = data?.seller;

  // FIXED: Properly compare IDs using sameId helper
  // isSelf is true only if viewing YOUR OWN profile
  const isSelf  = user && sameId(myId, targetId);

  const scoreColor = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--ember)' : '#E24B4A';
  const scoreLabel = score >= 70 ? 'Trusted Seller'
    : score >= 40 ? 'Building Reputation' : 'New Seller';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <nav style={{ background: 'var(--coal)', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: 'white',
            fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800,
          color: 'white', fontSize: 18 }}>Trust Score</span>
      </nav>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '1.5rem' }}>

        {error && <div className="error-msg">{error}</div>}

        {/* Score card */}
        <div className="card" style={{ textAlign: 'center', marginBottom: 14, padding: '2rem 1.5rem' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 72, fontWeight: 800,
            color: scoreColor, lineHeight: 1, marginBottom: 4 }}>
            {score}
          </div>
          <p style={{ fontSize: 13, color: 'var(--ash)', marginBottom: 4 }}>out of 100</p>
          <p style={{ fontSize: 14, fontWeight: 500, color: scoreColor, marginBottom: 16 }}>
            {scoreLabel}
          </p>

          <div style={{ height: 10, background: 'var(--border)', borderRadius: 5,
            overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${score}%`, background: scoreColor,
              borderRadius: 5, transition: 'width 1s ease' }} />
          </div>

          {/* How score is built */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Listings', value: blocks.filter(b => b.event?.type === 'LISTING_CREATED').length, icon: '📦' },
              { label: 'Chats', value: blocks.filter(b => b.event?.type === 'CONVERSATION_DONE').length, icon: '💬' },
              { label: 'Ratings', value: blocks.filter(b => b.event?.type?.startsWith('BUYER_RATING')).length, icon: '⭐' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ background: 'var(--cream)', borderRadius: 8, padding: '8px' }}>
                <div style={{ fontSize: 16 }}>{icon}</div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--ash)' }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              background: isValid ? 'var(--green-light)' : '#FCEBEB',
              color: isValid ? 'var(--green)' : '#A32D2D',
              fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20,
            }}>
              {isValid ? 'Chain Valid' : 'Chain Invalid'}
            </span>
            {seller?.isVerified && (
              <span style={{ background: 'var(--green-light)', color: 'var(--green)',
                fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20 }}>
                Verified Seller
              </span>
            )}
          </div>
        </div>

        {/* How to improve score */}
        {blocks.length === 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
              How to build your trust score
            </p>
            {[
              { icon: '', action: 'Post a listing', points: '+2 pts each' },
              { icon: '', action: 'Complete a conversation', points: '+5 pts each' },
              { icon: '', action: 'Receive a 5-star rating', points: '+8 pts each' },
              { icon: '',  action: 'Get admin verified', points: '+15 pts once' },
            ].map(({ icon, action, points }) => (
              <div key={action} style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '8px 0',
                borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13 }}>{icon} {action}</span>
                <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>{points}</span>
              </div>
            ))}
          </div>
        )}

        {/* Seller info */}
        {seller && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--ember)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16 }}>
                {seller.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p style={{ fontWeight: 500 }}>{seller.name}</p>
                <p style={{ fontSize: 12, color: 'var(--ash)' }}>
                   {(seller.neighbourhood || '').replace('_', ' ')} · {blocks.length} trust events
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rate seller section */}
        {!isSelf && user && (
          <>
            {/* Show conversation requirement message if no conversation */}
            {!hasConversation && !checkingConversation && (
              <div style={{ background: '#FEF3E2', border: '1px solid #BA7517', borderRadius: 10,
                padding: '12px 14px', marginBottom: 14, textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#BA7517', marginBottom: 8 }}>
                  💬 Start a conversation to rate this seller
                </p>
                <p style={{ fontSize: 12, color: '#996D0A', marginBottom: 10 }}>
                  Messages help build trust. Chat about the listing first.
                </p>
                <button onClick={() => navigate('/browse')}
                  style={{ background: '#BA7517', color: 'white', border: 'none',
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, fontWeight: 500 }}>
                  Browse Listings
                </button>
              </div>
            )}

            {/* Show rating stars only if conversation exists and not yet rated */}
            {hasConversation && !rated && (
              <div className="card" style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Rate this seller</p>
                <p style={{ fontSize: 12, color: 'var(--ash)', marginBottom: 12 }}>
                  Your rating is recorded on the blockchain and cannot be changed.
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => handleRate(star)}
                      style={{
                        width: 46, height: 46, borderRadius: '50%', border: 'none',
                        background: rating >= star ? '#BA7517' : 'var(--border)',
                        fontSize: 20, cursor: 'pointer', transition: 'all 0.15s',
                        transform: rating >= star ? 'scale(1.1)' : 'scale(1)',
                      }}>⭐</button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {rated && (
          <div style={{ background: 'var(--green-light)', border: '1px solid var(--green)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 14, textAlign: 'center',
            fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
            ✓ Rating recorded on blockchain. Trust score updated.
          </div>
        )}

        {/* Blockchain event chain */}
        <div className="card">
          <p style={{ fontSize: 11, color: 'var(--ash)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 12 }}>
            Blockchain History · {blocks.length} blocks
          </p>

          {blocks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
              <p style={{ color: 'var(--ash)', fontSize: 13 }}>
                No events yet. Post a listing to add the first block.
              </p>
            </div>
          )}

          {[...blocks].reverse().map((block, i) => {
            const meta = EVENT_LABELS[block.event?.type] || {
              label: block.event?.type || 'Unknown event',
              icon: '⬛', color: 'var(--ash)',
            };
            return (
              <div key={block._id || i} style={{
                display: 'flex', gap: 12, paddingBottom: 12, marginBottom: 12,
                borderBottom: i < blocks.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: `${meta.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--coal)', marginBottom: 2 }}>
                    {meta.label}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--ash)', fontFamily: 'monospace',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    #{block.hash?.slice(0, 24)}...
                  </p>
                </div>
                <p style={{ fontSize: 11, color: 'var(--ash)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {new Date(block.timestamp).toLocaleDateString('en-ZM', {
                    day: 'numeric', month: 'short' })}
                </p>
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ash)', marginTop: '1.5rem' }}>
          Secured by SHA-256 hash chain · ZamMarket 2026
        </p>
      </div>
    </div>
  );
}
