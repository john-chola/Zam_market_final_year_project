import React from 'react';
import { useNavigate } from 'react-router-dom';
import CreateListingForm from '../components/listings/CreateListingForm';

export default function CreateListingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      <nav style={{ background: 'var(--coal)', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: 'white',
            fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>
          ←
        </button>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800,
          color: 'white', fontSize: 18 }}>
          New Listing
        </span>
      </nav>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '1.5rem' }}>
        <div className="card">
          <h2 style={{ marginBottom: '0.25rem', fontSize: 20 }}>Post a charcoal listing</h2>
          <p style={{ color: 'var(--ash)', fontSize: 13, marginBottom: '1.5rem' }}>
            Buyers in your neighbourhood will see this immediately.
          </p>
          <CreateListingForm onSuccess={() => navigate('/listings/my')} />
        </div>
      </div>
    </div>
  );
}