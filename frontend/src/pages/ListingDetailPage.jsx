import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchListing, clearCurrent } from '../store/slices/listingSlice';
import { startConversation } from '../store/slices/chatSlice';

const fmtArea = (n) => (n ? n.replace('_', ' ') : 'Unknown');

export default function ListingDetailPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const { current: listing, loading, error } = useSelector((s) => s.listings);
  const { user } = useSelector((s) => s.auth);
  const { loading: chatLoading } = useSelector((s) => s.chat);

  useEffect(() => {
    dispatch(fetchListing(id));
    return () => dispatch(clearCurrent());
  }, [id, dispatch]);

  const handleMessage = async () => {
    if (!user) { navigate('/login'); return; }
    const result = await dispatch(startConversation(id)).unwrap();
    navigate(`/chat/${result.conversation._id}`);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--cream)' }}>
      <p style={{ color: 'var(--ash)' }}>Loading listing...</p>
    </div>
  );

  if (error || !listing) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--cream)', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 40 }}>🪵</div>
      <p style={{ color: 'var(--ash)' }}>Listing not found.</p>
      <button className="btn btn-outline" style={{ width: 'auto', padding: '10px 20px' }}
        onClick={() => navigate('/browse')}>Browse listings</button>
    </div>
  );

  const seller = listing.seller;
  const isOwner = user?._id === seller?._id;
  const statusActive = listing.status === 'active';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <nav style={{ background: 'var(--coal)', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: 'white',
            fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'white',
          fontSize: 18, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {listing.title}
        </span>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem' }}>

        {/* Image */}
        <div style={{ background: 'var(--coal)', borderRadius: 14, overflow: 'hidden',
          height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14 }}>
          {listing.image?.url
            ? <img src={listing.image.url} alt={listing.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 64 }}>🪵</span>}
        </div>

        {/* Main info */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: 12 }}>
            <h1 style={{ fontSize: 20, flex: 1, marginRight: 12 }}>{listing.title}</h1>
            <span style={{
              background: statusActive ? 'var(--green-light)' : '#FCEBEB',
              color: statusActive ? 'var(--green)' : '#A32D2D',
              fontSize: 11, fontWeight: 500, padding: '3px 10px',
              borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {listing.status === 'active' ? 'In Stock'
                : listing.status === 'sold' ? 'Sold Out' : 'Paused'}
            </span>
          </div>

          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 700,
            color: 'var(--coal)', marginBottom: 16 }}>
            K{listing.pricePerBag}
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--ash)' }}>
              {' '}per {listing.unit}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Type', value: listing.charcoalType || 'N/A' },
              { label: 'Available', value: `${listing.quantityAvailable} ${listing.unit}s` },
              { label: 'Area', value: fmtArea(listing.neighbourhood) },
              { label: 'Views', value: listing.views ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--cream)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--ash)', textTransform: 'uppercase',
                  letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>

          {listing.description
            ? <p style={{ fontSize: 14, color: 'var(--ash)', lineHeight: 1.6,
                borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                {listing.description}
              </p>
            : null}
        </div>

        {/* Seller + contact */}
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--ash)', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 10 }}>Seller</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--ember)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16 }}>
              {seller?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500 }}>{seller?.name || 'Unknown'}</p>
              <p style={{ fontSize: 12, color: 'var(--ash)' }}>
                📍 {fmtArea(seller?.neighbourhood)}
                {seller?.sellerProfile?.isVerified ? ' · ✓ Verified' : ''}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20,
                color: (seller?.trustScore?.score ?? 50) >= 70 ? 'var(--green)' : 'var(--ember)' }}>
                {seller?.trustScore?.score ?? 50}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ash)' }}>Trust</div>
            </div>
          </div>

          {/* Buyer: message or call */}
          {!isOwner && statusActive && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleMessage} disabled={chatLoading}
                className="btn btn-ember" style={{ flex: 2 }}>
                {chatLoading ? '...' : '💬 Message Seller'}
              </button>
              {seller?.phone && (
                <a href={`tel:${seller.phone}`} className="btn btn-outline"
                  style={{ flex: 1, textDecoration: 'none', display: 'flex',
                    alignItems: 'center', justifyContent: 'center' }}>
                  📞 Call
                </a>
              )}
            </div>
          )}

          {isOwner && (
            <button onClick={() => navigate('/listings/my')}
              className="btn btn-ember">My Listings</button>
          )}
        </div>

        <p style={{ fontSize: 11, color: 'var(--ash)', textAlign: 'center' }}>
          Listed {new Date(listing.createdAt).toLocaleDateString('en-ZM', {
            day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
}