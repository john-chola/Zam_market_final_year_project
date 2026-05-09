import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchMyListings, updateListingStatus, deleteListing } from '../store/slices/listingSlice';
import ListingCard from '../components/listings/ListingCard';

export default function MyListingsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { myListings, myLoading, error } = useSelector((s) => s.listings);
  const { user } = useSelector((s) => s.auth);

  useEffect(() => { dispatch(fetchMyListings()); }, [dispatch]);

  const handleStatusChange = (id, status) => {
    if (window.confirm(`Mark this listing as "${status}"?`)) {
      dispatch(updateListingStatus({ id, status }));
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this listing? This cannot be undone.')) {
      dispatch(deleteListing(id));
    }
  };

  const active = myListings.filter((l) => l.status === 'active');
  const other = myListings.filter((l) => l.status !== 'active');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      <nav style={{ background: 'var(--coal)', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ background: 'transparent', border: 'none', color: 'white',
              fontSize: 20, cursor: 'pointer' }}>←</button>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'white', fontSize: 18 }}>
            My Listings
          </span>
        </div>
        <button onClick={() => navigate('/listings/new')}
          style={{ background: 'var(--ember)', color: 'white', border: 'none',
            padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          + New
        </button>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10, marginBottom: '1.5rem' }}>
          {[
            { label: 'Active', value: myListings.filter(l => l.status === 'active').length, color: 'var(--green)' },
            { label: 'Sold', value: myListings.filter(l => l.status === 'sold').length, color: 'var(--ember)' },
            { label: 'Paused', value: myListings.filter(l => l.status === 'paused').length, color: 'var(--ash)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--ash)' }}>{label}</div>
            </div>
          ))}
        </div>

        {error && <div className="error-msg">{error}</div>}

        {myLoading && (
          <p style={{ textAlign: 'center', color: 'var(--ash)', padding: '2rem' }}>Loading your listings...</p>
        )}

        {!myLoading && myListings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🪵</div>
            <h3 style={{ marginBottom: 8 }}>No listings yet</h3>
            <p style={{ color: 'var(--ash)', fontSize: 14, marginBottom: 20 }}>
              Post your first charcoal listing and start getting buyers.
            </p>
            <button onClick={() => navigate('/listings/new')}
              className="btn btn-ember" style={{ width: 'auto', padding: '10px 24px' }}>
              Post First Listing
            </button>
          </div>
        )}

        {active.length > 0 && (
          <>
            <h3 style={{ fontSize: 14, color: 'var(--ash)', textTransform: 'uppercase',
              letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Active</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 14, marginBottom: '1.5rem' }}>
              {active.map((l) => (
                <ListingCard key={l._id} listing={l} showActions
                  onStatusChange={handleStatusChange} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}

        {other.length > 0 && (
          <>
            <h3 style={{ fontSize: 14, color: 'var(--ash)', textTransform: 'uppercase',
              letterSpacing: '0.07em', marginBottom: '0.75rem' }}>Sold / Paused</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {other.map((l) => (
                <ListingCard key={l._id} listing={l} showActions
                  onStatusChange={handleStatusChange} onDelete={handleDelete} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}