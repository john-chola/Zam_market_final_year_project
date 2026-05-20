import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateListingForm from '../components/listings/CreateListingForm';
import VoiceListingInput from '../components/voice/VoiceListingInput';
import './CreateListingPage.css';

export default function CreateListingPage() {
  const navigate = useNavigate();
  const [showVoice, setShowVoice] = useState(false);
  const [voiceResult, setVoiceResult] = useState(null);

  const handleVoiceResult = (result) => {
    setVoiceResult(result);
    setShowVoice(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>
      <nav style={{ background: 'var(--coal)', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: 'none', color: 'white',
            fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800,
          color: 'white', fontSize: 18, flex: 1 }}>New Listing</span>
        {/* Voice toggle button */}
        <button onClick={() => setShowVoice(!showVoice)}
          style={{
            background: showVoice ? 'var(--ember)' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)', color: 'white',
            padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
            fontSize: 13, display: 'flex', alignItems: 'center', gap: 5,
          }}>
          Voice
        </button>
      </nav>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '1.5rem' }}>

        {/* Voice input panel */}
        {showVoice && (
          <div className="card" style={{ marginBottom: 16, border: '2px solid var(--ember)' }}>
            <VoiceListingInput
              onResult={handleVoiceResult}
              onClose={() => setShowVoice(false)}
            />
          </div>
        )}

        {/* Voice result banner */}
        {voiceResult && !showVoice && (
          <div style={{ background: 'var(--green-light)', border: '1px solid var(--green)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 14,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
               Voice data applied — review and submit below
            </p>
            <button onClick={() => setVoiceResult(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--green)', fontSize: 16 }}>X</button>
          </div>
        )}

        <div className="card">
          <h2 style={{ marginBottom: '0.25rem', fontSize: 20 }}>Post a charcoal listing</h2>
          <p style={{ color: 'var(--ash)', fontSize: 13, marginBottom: '1.5rem' }}>
            Buyers in your neighbourhood will see this immediately.
          </p>
          <CreateListingForm
            voicePrefill={voiceResult}
            onSuccess={() => navigate('/listings/my')}
          />
        </div>
      </div>
    </div>
  );
}