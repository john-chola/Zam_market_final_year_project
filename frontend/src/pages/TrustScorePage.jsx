import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../utils/api';
import './TrustScorePage.css';

const EVENT_LABELS = {
  LISTING_CREATED: { label: 'Listing posted', icon: '📦', color: '#3B6D11' },
  CONVERSATION_DONE: { label: 'Conversation completed', icon: '💬', color: '#185FA5' },
  BUYER_RATING_5: { label: '5-star rating received', icon: '⭐', color: '#BA7517' },
  BUYER_RATING_4: { label: '4-star rating received', icon: '⭐', color: '#BA7517' },
  BUYER_RATING_3: { label: '3-star rating received', icon: '⭐', color: '#888780' },
  BUYER_RATING_1: { label: '1-star rating received', icon: '⭐', color: '#A32D2D' },
  ADMIN_VERIFIED: { label: 'Admin verified', icon: '✓', color: '#3B6D11' },
};

export default function TrustScorePage() {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const myId = user?._id || user?.id;
  const targetId = sellerId && sellerId !== 'undefined' ? sellerId : myId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    if (!targetId || targetId === 'undefined') {
      setError('Could not identify seller. Please try again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    api
      .get(`/trust/${targetId}`)
      .then(({ data: d }) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Could not load trust data');
        setLoading(false);
      });
  }, [targetId]);

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
    }
  };

  if (loading)
    return (
      <div className="trust-loading">
        <p>Loading trust data...</p>
      </div>
    );

  const score = data?.chain?.score ?? 50;
  const isValid = data?.chain?.isValid;
  const blocks = data?.chain?.blocks || [];
  const seller = data?.seller;
  const isSelf = myId && (myId === targetId || myId === seller?.id);

  const getScoreCategory = (score) => {
    if (score >= 70) return 'trusted';
    if (score >= 40) return 'building';
    return 'new';
  };

  const scoreCategory = getScoreCategory(score);
  const scoreLabel =
    score >= 70
      ? 'Trusted Seller'
      : score >= 40
      ? 'Building Reputation'
      : 'New Seller';

  return (
    <div className="trust-container">
      <nav className="trust-nav">
        <button onClick={() => navigate(-1)} className="trust-back-btn" aria-label="Go back">
          ←
        </button>
        <span className="trust-nav-title">Trust Score</span>
      </nav>

      <div className="trust-content">
        {error && <div className="error-msg">{error}</div>}

        {/* Score card */}
        <div className="card trust-score-card">
          <div className={`trust-score-value ${scoreCategory}`}>{score}</div>
          <p className="trust-score-out-of">out of 100</p>
          <p className={`trust-score-label ${scoreCategory}`}>{scoreLabel}</p>

          <div className="trust-progress-bar">
            <div
              className={`trust-progress-fill ${scoreCategory}`}
              style={{ width: `${score}%` }}
            />
          </div>

          {/* Score breakdown */}
          <div className="trust-breakdown">
            {[
              {
                label: 'Listings',
                value: blocks.filter((b) => b.event?.type === 'LISTING_CREATED').length,
                icon: '📦',
              },
              {
                label: 'Chats',
                value: blocks.filter((b) => b.event?.type === 'CONVERSATION_DONE').length,
                icon: '💬',
              },
              {
                label: 'Ratings',
                value: blocks.filter((b) => b.event?.type?.startsWith('BUYER_RATING')).length,
                icon: '⭐',
              },
            ].map(({ label, value, icon }) => (
              <div key={label} className="breakdown-item">
                <div className="breakdown-icon">{icon}</div>
                <div className="breakdown-value">{value}</div>
                <div className="breakdown-label">{label}</div>
              </div>
            ))}
          </div>

          <div className="trust-badges">
            <span className={`badge ${isValid ? 'badge-valid' : 'badge-invalid'}`}>
              {isValid ? '✓ Chain Valid' : '⚠ Chain Invalid'}
            </span>
            {seller?.isVerified && (
              <span className="badge badge-verified">✓ Verified Seller</span>
            )}
          </div>
        </div>

        {/* How to improve score */}
        {blocks.length === 0 && (
          <div className="card trust-guide-card">
            <p className="trust-guide-title">How to build your trust score</p>
            {[
              { icon: '📦', action: 'Post a listing', points: '+2 pts each' },
              { icon: '💬', action: 'Complete a conversation', points: '+5 pts each' },
              { icon: '⭐', action: 'Receive a 5-star rating', points: '+8 pts each' },
              { icon: '✓', action: 'Get admin verified', points: '+15 pts once' },
            ].map(({ icon, action, points }) => (
              <div key={action} className="trust-guide-item">
                <span className="trust-guide-action">
                  {icon} {action}
                </span>
                <span className="trust-guide-points">{points}</span>
              </div>
            ))}
          </div>
        )}

        {/* Seller info */}
        {seller && (
          <div className="card trust-seller-card">
            <div className="trust-seller-info">
              <div className="trust-seller-avatar">
                {seller.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="trust-seller-name">{seller.name}</p>
                <p className="trust-seller-meta">
                  {(seller.neighbourhood || '').replace('_', ' ')} · {blocks.length} trust events
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rate seller — buyers only, not viewing own profile */}
        {!isSelf && user && !rated && (
          <div className="card trust-rating-card">
            <p className="trust-rating-title">Rate this seller</p>
            <p className="trust-rating-description">
              Your rating is recorded on the blockchain and cannot be changed.
            </p>
            <div className="trust-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  className={`trust-star-btn ${rating >= star ? 'star-active' : 'star-inactive'}`}
                >
                  ⭐
                </button>
              ))}
            </div>
          </div>
        )}

        {rated && (
          <div className="trust-rated-banner">
            ✓ Rating recorded on blockchain. Trust score updated.
          </div>
        )}

        {/* Blockchain event chain */}
        <div className="card trust-chain-card">
          <p className="trust-chain-title">
            Blockchain History · {blocks.length} blocks
          </p>

          {blocks.length === 0 && (
            <div className="trust-chain-empty">
              <div className="trust-chain-empty-icon">🔗</div>
              <p className="trust-chain-empty-text">
                No events yet. Post a listing to add the first block.
              </p>
            </div>
          )}

          {[...blocks].reverse().map((block, i) => {
            const meta = EVENT_LABELS[block.event?.type] || {
              label: block.event?.type || 'Unknown event',
              icon: '⬛',
              color: 'var(--ash)',
            };
            const isLast = i === blocks.length - 1;

            return (
              <div
                key={block._id || i}
                className={`trust-chain-item ${!isLast ? 'chain-item-border' : ''}`}
              >
                <div
                  className="chain-item-icon"
                  style={{
                    background: `${meta.color}22`,
                  }}
                >
                  {meta.icon}
                </div>
                <div className="chain-item-content">
                  <p className="chain-item-label">{meta.label}</p>
                  <p className="chain-item-hash">#{block.hash?.slice(0, 24)}...</p>
                </div>
                <p className="chain-item-date">
                  {new Date(block.timestamp).toLocaleDateString('en-ZM', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
            );
          })}
        </div>

        <p className="trust-footer">
          Secured by SHA-256 hash chain · ZamMarket 2026
        </p>
      </div>
    </div>
  );
}