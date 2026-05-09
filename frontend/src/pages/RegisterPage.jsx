import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { requestOTP, registerUser, clearError, resetOtp } from '../store/slices/authSlice';
import { isValidZambianPhone, normalizePhone, NEIGHBOURHOODS } from '../utils/validation';

const steps = ['Phone', 'Verify', 'Details'];

function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: i <= current ? 'var(--ember)' : 'var(--border)',
              color: i <= current ? 'white' : 'var(--ash)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 500,
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 11, marginTop: 4, color: i === current ? 'var(--ember)' : 'var(--ash)' }}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 2, height: 2, marginBottom: 20,
              background: i < current ? 'var(--ember)' : 'var(--border)',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, otpSent, isAuthenticated } = useSelector((s) => s.auth);

  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [neighbourhood, setNeighbourhood] = useState('Other');
  const [businessName, setBusinessName] = useState('');
  const [phoneErr, setPhoneErr] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
    return () => { dispatch(clearError()); dispatch(resetOtp()); };
  }, [isAuthenticated, navigate, dispatch]);

  useEffect(() => {
    if (otpSent && step === 0) setStep(1);
  }, [otpSent, step]);

  const handleRequestOTP = (e) => {
    e.preventDefault();
    const normalized = normalizePhone(phone);
    if (!isValidZambianPhone(normalized)) {
      setPhoneErr('Enter a valid Zambian number (e.g. 0977123456)');
      return;
    }
    setPhoneErr('');
    dispatch(requestOTP(normalized));
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setStep(2);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    dispatch(registerUser({
      phone: normalizePhone(phone),
      otp,
      name,
      password,
      role,
      neighbourhood,
      ...(role === 'seller' && businessName && { sellerProfile: { businessName } }),
    }));
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 26, color: 'var(--coal)' }}>
            <span style={{ color: 'var(--ember)' }}>●</span> ZamMarket
          </h1>
          <p style={{ color: 'var(--ash)', fontSize: 14, marginTop: 4 }}>Create your account</p>
        </div>

        <div className="card">
          <StepBar current={step} />

          {error && <div className="error-msg">{error}</div>}

          {step === 0 && (
            <form onSubmit={handleRequestOTP}>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 0977 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                {phoneErr && <p style={{ color: 'var(--ember)', fontSize: 12, marginTop: 4 }}>{phoneErr}</p>}
                <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 4 }}>
                  Zamtel, Airtel, or MTN number. A verification code will be sent.
                </p>
              </div>
              <button className="btn btn-ember" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Send Verification Code'}
              </button>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={handleVerifyOTP}>
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <input
                  type="text"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ letterSpacing: '0.3em', fontSize: 22, textAlign: 'center' }}
                  required
                />
                <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 6 }}>
                  💡 Dev mode: Check your backend terminal (Git Bash window running the server) for the code.
                </p>
              </div>
              <button className="btn btn-ember" type="submit" disabled={otp.length !== 6}>
                Verify Code
              </button>
              <button
                className="btn btn-outline"
                type="button"
                style={{ marginTop: 8 }}
                onClick={() => { setStep(0); dispatch(resetOtp()); }}
              >
                ← Change Number
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label className="form-label">I want to</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {['buyer', 'seller'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      style={{
                        padding: '10px 0',
                        borderRadius: 'var(--radius)',
                        border: role === r ? '2px solid var(--ember)' : '1px solid var(--border)',
                        background: role === r ? 'var(--ember-light)' : 'var(--white)',
                        color: role === r ? 'var(--ember-dark)' : 'var(--ash)',
                        fontWeight: 500,
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      {r === 'buyer' ? '🛒 Buy' : '🪵 Sell'}
                    </button>
                  ))}
                </div>
              </div>

              {role === 'seller' && (
                <div className="form-group">
                  <label className="form-label">Business Name (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Mwale Charcoal"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Neighbourhood</label>
                <select value={neighbourhood} onChange={(e) => setNeighbourhood(e.target.value)}>
                  {NEIGHBOURHOODS.map((n) => (
                    <option key={n} value={n}>{n.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <button className="btn btn-ember" type="submit" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: 14, color: 'var(--ash)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--ember)', textDecoration: 'none', fontWeight: 500 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}