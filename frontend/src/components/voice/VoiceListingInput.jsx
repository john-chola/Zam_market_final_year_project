import React, { useState, useRef, useEffect } from 'react';

// ── Nyanja / Bemba keyword mappings ───────────────────────
const KEYWORD_MAP = {
  // Nyanja numbers
  'imodzi': '1', 'iwiri': '2', 'itatu': '3', 'inayi': '4', 'isanu': '5',
  'isanu ndi imodzi': '6', 'isanu ndi iwiri': '7', 'isanu ndi itatu': '8',
  // Bemba numbers
  'cimo': '1', 'fibili': '2', 'fitatu': '3', 'fine': '4', 'fisano': '5', 'mutanda': '6', 'cine lubala': '7', 'cine konsekonse': '8', 'pabula': '9', 'ikumi linmo': '10',
  // Nyanja charcoal terms
  'maalasha': 'charcoal', 'masaka': 'bags', 'saka': 'bag',
  // Bemba charcoal terms
  'amalaasha': 'charcoal', 'amasaka': 'bags', 'isaka': 'bag',
  // Common price words
  'kwacha': 'K', 'ngwe': '',
  // Units
  'umufuko': 'bag', 'tini': 'tin', 'kilogram': 'kg',
};

const applyKeywordMap = (transcript) => {
  let result = transcript.toLowerCase();
  Object.entries(KEYWORD_MAP).forEach(([local, english]) => {
    result = result.replace(new RegExp(`\\b${local}\\b`, 'gi'), english);
  });
  return result;
};

// Try to extract price from transcript
const extractPrice = (text) => {
  const match = text.match(/(?:K|kwacha)?\s*(\d+)/i);
  return match ? match[1] : '';
};

// Try to extract quantity from transcript
const extractQuantity = (text) => {
  const match = text.match(/(\d+)\s*(?:bag|tin|kg|amasaka)/i);
  return match ? match[1] : '';
};

export default function VoiceListingInput({ onResult, onClose }) {
  const [phase, setPhase] = useState('idle'); // idle | listening | processing | done | error
  const [transcript, setTranscript] = useState('');
  const [extracted, setExtracted] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous      = false;
    recognition.interimResults  = true;
    recognition.lang            = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onresult = (e) => {
      let interim = '';
      let final   = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final || interim);
    };

    recognition.onend = () => {
      setPhase((prev) => {
        if (prev === 'listening') {
          // Process the final transcript
          processTranscript();
          return 'processing';
        }
        return prev;
      });
    };

    recognition.onerror = (e) => {
      console.error('Speech error:', e.error);
      const msgs = {
        'not-allowed':    'Microphone access denied. Please allow microphone in browser settings.',
        'no-speech':      'No speech detected. Please try again.',
        'network':        'Network error. Using text input instead.',
        'aborted':        'Listening stopped.',
      };
      setErrorMsg(msgs[e.error] || `Speech error: ${e.error}`);
      setPhase('error');
    };

    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, []);

  const processTranscript = () => {
    setPhase('processing');
    setTimeout(() => {
      const mapped = applyKeywordMap(transcript);
      const result = {
        rawTranscript:  transcript,
        mappedText:     mapped,
        suggestedTitle: mapped.length > 5
          ? mapped.charAt(0).toUpperCase() + mapped.slice(1)
          : '',
        suggestedPrice: extractPrice(mapped),
        suggestedQty:   extractQuantity(mapped),
      };
      setExtracted(result);
      setPhase('done');
    }, 600);
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setExtracted({});
    setErrorMsg('');
    setPhase('listening');
    recognitionRef.current.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const handleUse = () => {
    onResult(extracted);
    onClose();
  };

  const handleRetry = () => {
    setPhase('idle');
    setTranscript('');
    setExtracted({});
  };

  if (!supported) return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}></div>
      <p style={{ color: 'var(--ash)', fontSize: 14, marginBottom: 16 }}>
        Voice input is not supported in this browser. Please use Chrome or Edge.
      </p>
      <button onClick={onClose} className="btn btn-outline" style={{ width: 'auto', padding: '8px 20px' }}>
        Use Text Input
      </button>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ fontSize: 17 }}>Voice Listing</h3>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--ash)', lineHeight: 1 }}>✕</button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--ash)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        Speak your listing in <strong>English, Nyanja, or Bemba</strong>.<br />
        Example: <em>"charcoal, 10 bags, K95 each, kalundu"</em>
      </p>

      {/* Mic button */}
      {(phase === 'idle' || phase === 'error') && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button onClick={startListening}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'var(--ember)', border: 'none',
              cursor: 'pointer', fontSize: 32,
              boxShadow: '0 4px 16px rgba(216,90,48,0.3)',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            
          </button>
          <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 8 }}>Tap to speak</p>
        </div>
      )}

      {/* Listening animation */}
      {phase === 'listening' && (
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <button onClick={stopListening}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: '#E24B4A', border: 'none', cursor: 'pointer', fontSize: 32,
              animation: 'pulse-mic 1s ease-in-out infinite',
            }}></button>
          <p style={{ fontSize: 12, color: 'var(--ember)', marginTop: 8, fontWeight: 500 }}>
            Listening... tap to stop
          </p>
          {transcript && (
            <p style={{ fontSize: 13, color: 'var(--coal)', marginTop: 8,
              background: 'var(--cream)', borderRadius: 8, padding: '8px 12px' }}>
              "{transcript}"
            </p>
          )}
        </div>
      )}

      {/* Processing */}
      {phase === 'processing' && (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          <div className="spinner" style={{ margin: '0 auto', borderTopColor: 'var(--ember)',
            border: '3px solid var(--border)', width: 28, height: 28 }} />
          <p style={{ fontSize: 13, color: 'var(--ash)', marginTop: 8 }}>Processing speech...</p>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="error-msg" style={{ marginBottom: '1rem' }}>{errorMsg}</div>
      )}

      {/* Results */}
      {phase === 'done' && extracted.suggestedTitle && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ background: 'var(--cream)', borderRadius: 10, padding: '1rem',
            marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: 'var(--ash)', textTransform: 'uppercase',
              letterSpacing: '0.06em', marginBottom: 6 }}>You said</p>
            <p style={{ fontSize: 13, color: 'var(--coal)', fontStyle: 'italic' }}>
              "{extracted.rawTranscript}"
            </p>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { label: 'Title detected', value: extracted.suggestedTitle },
              extracted.suggestedPrice && { label: 'Price detected', value: `K${extracted.suggestedPrice}` },
              extracted.suggestedQty   && { label: 'Quantity detected', value: extracted.suggestedQty },
            ].filter(Boolean).map(({ label, value }) => (
              <div key={label} style={{ background: 'white', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 12px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--ash)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
            <button onClick={handleUse} className="btn btn-ember" style={{ flex: 2 }}>
               Use This
            </button>
            <button onClick={handleRetry} className="btn btn-outline" style={{ flex: 1 }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && !extracted.suggestedTitle && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ash)', fontSize: 13, marginBottom: 12 }}>
            Could not extract listing details. Please try again or type manually.
          </p>
          <button onClick={handleRetry} className="btn btn-outline"
            style={{ width: 'auto', padding: '8px 20px' }}>Try Again</button>
        </div>
      )}

      <style>{`
        @keyframes pulse-mic {
          0%, 100% { box-shadow: 0 0 0 0 rgba(226,75,74,0.4); }
          50%       { box-shadow: 0 0 0 16px rgba(226,75,74,0); }
        }
      `}</style>
    </div>
  );
}