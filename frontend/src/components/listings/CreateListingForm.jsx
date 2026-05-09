import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createListing, clearError, clearCreateSuccess } from '../../store/slices/listingSlice';
import { NEIGHBOURHOODS } from '../../utils/validation';

const CHARCOAL_TYPES = ['Hardwood (Miombo)', 'Softwood', 'Mixed', 'Other'];
const UNITS = ['bag', 'tin', 'kg'];

export default function CreateListingForm({ onSuccess }) {
  const dispatch = useDispatch();
  const { loading, error, createSuccess } = useSelector((s) => s.listings);
  const { user } = useSelector((s) => s.auth);

  const [title, setTitle] = useState('');
  const [charcoalType, setCharcoalType] = useState('Hardwood (Miombo)');
  const [pricePerBag, setPricePerBag] = useState('');
  const [unit, setUnit] = useState('bag');
  const [quantityAvailable, setQuantityAvailable] = useState('');
  const [neighbourhood, setNeighbourhood] = useState(user?.neighbourhood || 'Other');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (createSuccess) {
      dispatch(clearCreateSuccess());
      onSuccess?.();
    }
    return () => dispatch(clearError());
  }, [createSuccess, dispatch, onSuccess]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title);
    formData.append('charcoalType', charcoalType);
    formData.append('pricePerBag', pricePerBag);
    formData.append('unit', unit);
    formData.append('quantityAvailable', quantityAvailable);
    formData.append('neighbourhood', neighbourhood);
    formData.append('description', description);
    if (imageFile) formData.append('image', imageFile);
    dispatch(createListing(formData));
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="error-msg">{error}</div>
      )}

      {/* Image upload */}
      <div className="form-group">
        <label className="form-label">Photo (optional)</label>
        <div
          onClick={() => document.getElementById('img-upload').click()}
          style={{
            border: '2px dashed #E8E7E4', borderRadius: 10,
            height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden', background: '#F9F8F5',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#D85A30'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E8E7E4'}
        >
          {imagePreview ? (
            <img src={imagePreview} alt="Preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center', color: '#888780' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
              <p style={{ fontSize: 13 }}>Click to upload photo</p>
              <p style={{ fontSize: 11, marginTop: 2 }}>JPG, PNG, WebP — max 5MB</p>
            </div>
          )}
        </div>
        <input id="img-upload" type="file" accept="image/*"
          onChange={handleImage} style={{ display: 'none' }} />
      </div>

      {/* Title */}
      <div className="form-group">
        <label className="form-label">Listing Title</label>
        <input type="text" placeholder="e.g. Fresh Miombo Charcoal — 25kg bags"
          value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
      </div>

      {/* Charcoal type */}
      <div className="form-group">
        <label className="form-label">Charcoal Type</label>
        <select value={charcoalType} onChange={(e) => setCharcoalType(e.target.value)}>
          {CHARCOAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Price + unit row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Price (K)</label>
          <input type="number" placeholder="e.g. 95" min="1"
            value={pricePerBag} onChange={(e) => setPricePerBag(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Per</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Quantity */}
      <div className="form-group">
        <label className="form-label">Quantity Available</label>
        <input type="number" placeholder="How many bags/tins do you have?" min="1"
          value={quantityAvailable} onChange={(e) => setQuantityAvailable(e.target.value)} required />
      </div>

      {/* Neighbourhood */}
      <div className="form-group">
        <label className="form-label">Your Neighbourhood</label>
        <select value={neighbourhood} onChange={(e) => setNeighbourhood(e.target.value)}>
          {NEIGHBOURHOODS.map((n) => <option key={n} value={n}>{n.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label">Description (optional)</label>
        <textarea
          placeholder="Any extra details about your charcoal..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          rows={3}
          style={{
            width: '100%', padding: '11px 14px',
            border: '1px solid #E8E7E4', borderRadius: 10,
            resize: 'vertical', outline: 'none', fontFamily: 'inherit',
            fontSize: 15, color: '#2C2C2A',
          }}
        />
        <p style={{ fontSize: 11, color: '#888780', marginTop: 3, textAlign: 'right' }}>
          {description.length}/300
        </p>
      </div>

      <button className="btn btn-ember" type="submit" disabled={loading}>
        {loading ? <span className="spinner" /> : '🪵 Post Listing'}
      </button>
    </form>
  );
}