import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchListings } from '../store/slices/listingSlice';
import ListingCard from '../components/listings/ListingCard';
import { NEIGHBOURHOODS } from '../utils/validation';

const ALL_NEIGHBOURHOODS = ['All', ...NEIGHBOURHOODS];

export default function BrowsePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, error, pagination } = useSelector((s) => s.listings);
  const { user } = useSelector((s) => s.auth);

  const [neighbourhood, setNeighbourhood] = useState('All');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(() => {
    dispatch(fetchListings({ neighbourhood, search }));
  }, [dispatch, neighbourhood, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      {/* Nav */}
      <nav style={{ background: 'var(--coal)', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => navigate('/dashboard')}
          style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: 'white',
            fontSize: 20, cursor: 'pointer' }}>
          <span style={{ color: 'var(--ember)' }}>●</span> ZamMarket
        </span>
        {user?.role === 'seller' && (
          <button onClick={() => navigate('/listings/new')}
            style={{ background: 'var(--ember)', color: 'white', border: 'none',
              padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            + New Listing
          </button>
        )}
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
          <input type="text" placeholder="Search charcoal listings..."
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            style={{ flex: 1 }} />
          <button type="submit" className="btn btn-ember" style={{ width: 'auto', padding: '11px 20px' }}>
            
          </button>
          {search && (
            <button type="button" className="btn btn-outline"
              style={{ width: 'auto', padding: '11px 14px' }}
              onClick={() => { setSearch(''); setSearchInput(''); }}>
              ✕
            </button>
          )}
        </form>

        {/* Neighbourhood filter pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
          marginBottom: '1.25rem', scrollbarWidth: 'none' }}>
          {ALL_NEIGHBOURHOODS.map((n) => (
            <button key={n} onClick={() => setNeighbourhood(n)}
              style={{
                padding: '5px 14px', borderRadius: 20, border: 'none',
                background: neighbourhood === n ? 'var(--coal)' : 'white',
                color: neighbourhood === n ? 'white' : 'var(--ash)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
                border: neighbourhood === n ? 'none' : '1px solid var(--border)',
                transition: 'all 0.15s',
              }}>
              {n.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Results summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '1rem' }}>
          <p style={{ fontSize: 13, color: 'var(--ash)' }}>
            {loading ? 'Loading...' : `${pagination?.total || 0} listings found`}
            {neighbourhood !== 'All' && ` in ${neighbourhood.replace('_', ' ')}`}
            {search && ` for "${search}"`}
          </p>
          <p style={{ fontSize: 12, color: 'var(--ash)' }}>Newest first</p>
        </div>

        {/* Error state */}
        {error && <div className="error-msg">{error}</div>}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 14, overflow: 'hidden',
                border: '1px solid var(--border)' }}>
                <div style={{ height: 160, background: '#F0EFE8', animation: 'pulse 1.5s infinite' }} />
                <div style={{ padding: '0.9rem' }}>
                  <div style={{ height: 14, background: '#F0EFE8', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ height: 20, background: '#F0EFE8', borderRadius: 4, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Listings grid */}
        {!loading && items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {items.map((listing) => (
              <ListingCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🪵</div>
            <h3 style={{ marginBottom: 8, color: 'var(--coal)' }}>No listings found</h3>
            <p style={{ color: 'var(--ash)', fontSize: 14 }}>
              {search ? `No results for "${search}"` : `No charcoal listings in ${neighbourhood.replace('_', ' ')} yet`}
            </p>
            {user?.role === 'seller' && (
              <button onClick={() => navigate('/listings/new')}
                className="btn btn-ember"
                style={{ marginTop: 20, width: 'auto', padding: '10px 24px' }}>
                Post the first listing
              </button>
            )}
          </div>
        )}

        {/* Load more */}
        {pagination?.hasMore && !loading && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button className="btn btn-outline"
              style={{ width: 'auto', padding: '10px 28px' }}
              onClick={() => dispatch(fetchListings({ neighbourhood, search, page: pagination.page + 1 }))}>
              Load more listings
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}