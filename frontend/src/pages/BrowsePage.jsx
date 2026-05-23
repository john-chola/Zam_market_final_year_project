import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchListings } from '../store/slices/listingSlice';
import ListingCard from '../components/listings/ListingCard';
import { NEIGHBOURHOODS } from '../utils/validation';
import './BrowsePage.css';

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

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const clearSearch = () => {
    setSearch('');
    setSearchInput('');
  };

  return (
    <div className="browse-container">
      {/* Nav */}
      <nav className="browse-nav">
        <span onClick={() => navigate('/dashboard')} className="browse-logo">
          <span className="browse-logo-dot">●</span> ZamMarket
        </span>
        {user?.role === 'seller' && (
          <button onClick={() => navigate('/listings/new')} className="btn-new-listing">
            + New Listing
          </button>
        )}
      </nav>

      <div className="browse-content">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search charcoal listings..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-ember btn-search">
            🔍 Search
          </button>
          {search && (
            <button
              type="button"
              className="btn btn-outline btn-clear-search"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </form>

        {/* Neighbourhood filter pills */}
        <div className="filter-pills">
          {ALL_NEIGHBOURHOODS.map((n) => (
            <button
              key={n}
              onClick={() => setNeighbourhood(n)}
              className={`filter-pill ${neighbourhood === n ? 'filter-pill-active' : ''}`}
            >
              {n.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Results summary */}
        <div className="results-summary">
          <p className="results-text">
            {loading
              ? 'Loading...'
              : `${pagination?.total || 0} listings found`}
            {neighbourhood !== 'All' && ` in ${neighbourhood.replace('_', ' ')}`}
            {search && ` for "${search}"`}
          </p>
          <p className="results-sort">Newest first</p>
        </div>

        {/* Error state */}
        {error && <div className="error-msg">{error}</div>}

        {/* Loading skeleton */}
        {loading && (
          <div className="listings-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-image" />
                <div className="skeleton-content">
                  <div className="skeleton-line skeleton-line-short" />
                  <div className="skeleton-line skeleton-line-long" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Listings grid */}
        {!loading && items.length > 0 && (
          <div className="listings-grid">
            {items.map((listing) => (
              <ListingCard key={listing._id} listing={listing} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🪵</div>
            <h3 className="empty-state-title">No listings found</h3>
            <p className="empty-state-description">
              {search
                ? `No results for "${search}"`
                : `No charcoal listings in ${neighbourhood.replace('_', ' ')} yet`}
            </p>
            {user?.role === 'seller' && (
              <button
                onClick={() => navigate('/listings/new')}
                className="btn btn-ember btn-post-first"
              >
                Post the first listing
              </button>
            )}
          </div>
        )}

        {/* Load more */}
        {pagination?.hasMore && !loading && (
          <div className="load-more">
            <button
              className="btn btn-outline btn-load-more"
              onClick={() =>
                dispatch(
                  fetchListings({
                    neighbourhood,
                    search,
                    page: pagination.page + 1,
                  })
                )
              }
            >
              Load more listings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}