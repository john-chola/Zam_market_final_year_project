import React from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLES = {
  active:  { bg: '#EAF3DE', color: '#3B6D11', label: 'In Stock' },
  sold:    { bg: '#FCEBEB', color: '#A32D2D', label: 'Sold Out' },
  paused:  { bg: '#F0F0EE', color: '#888780', label: 'Paused' },
};

export default function ListingCard({ listing, showActions = false, onStatusChange, onDelete }) {
  const navigate = useNavigate();
  const statusStyle = STATUS_STYLES[listing.status] || STATUS_STYLES.active;
  const imageUrl = listing.image?.url;

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 14,
        border: '1px solid #E8E7E4',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(44,44,42,0.07)',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onClick={() => navigate(`/listings/${listing._id}`)}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(44,44,42,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 3px rgba(44,44,42,0.07)'; }}
    >
      {/* Image */}
      <div style={{
        height: 160, background: '#2C2C2A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt={listing.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 48 }}>🪵</span>
        )}
        {/* Status badge */}
        <span style={{
          position: 'absolute', top: 8, right: 8,
          background: statusStyle.bg, color: statusStyle.color,
          fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20,
        }}>
          {statusStyle.label}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '0.9rem' }}>
        <p style={{ fontWeight: 500, fontSize: 14, marginBottom: 4, color: '#2C2C2A',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {listing.title}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: '#2C2C2A' }}>
            K{listing.pricePerBag}
            <span style={{ fontSize: 12, fontWeight: 400, color: '#888780' }}>/{listing.unit}</span>
          </span>
          <span style={{ fontSize: 12, color: '#888780' }}>
            {listing.quantityAvailable} {listing.unit}s left
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#888780' }}>
             {listing.neighbourhood?.replace('_', ' ')}
          </span>
          {listing.seller?.trustScore?.score >= 70 && (
            <span style={{ fontSize: 11, background: '#EAF3DE', color: '#3B6D11',
              padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
              ✓ Trusted
            </span>
          )}
        </div>

        {/* Seller action buttons */}
        {showActions && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}
            onClick={(e) => e.stopPropagation()}>
            {listing.status === 'active' && (
              <button onClick={() => onStatusChange(listing._id, 'sold')}
                style={actionBtn('#FCEBEB', '#A32D2D')}>Mark Sold</button>
            )}
            {listing.status === 'sold' && (
              <button onClick={() => onStatusChange(listing._id, 'active')}
                style={actionBtn('#EAF3DE', '#3B6D11')}>Relist</button>
            )}
            {listing.status === 'active' && (
              <button onClick={() => onStatusChange(listing._id, 'paused')}
                style={actionBtn('#F0F0EE', '#888780')}>Pause</button>
            )}
            <button onClick={() => onDelete(listing._id)}
              style={actionBtn('#FCEBEB', '#A32D2D', true)}>🗑</button>
          </div>
        )}
      </div>
    </div>
  );
}

const actionBtn = (bg, color, small = false) => ({
  flex: small ? '0 0 auto' : 1,
  padding: small ? '5px 8px' : '5px 0',
  background: bg, color, border: 'none',
  borderRadius: 6, fontSize: 12, fontWeight: 500,
  cursor: 'pointer',
});