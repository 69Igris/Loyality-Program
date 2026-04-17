import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CITIES = ["Delhi", "Mumbai", "Bangalore", "Goa", "Hyderabad", "Chennai", "Kolkata", "Pune"];

function SearchForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    from: '',
    to: ''
  });
  const [userData, setUserData] = useState(null);
  const [fileError, setFileError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);

        if (!Array.isArray(json.cards) || !Array.isArray(json.loyalty_programs)) {
          throw new Error('Invalid JSON structure');
        }

        setUserData(json);
        setFileError('');
      } catch (_err) {
        setFileError('Invalid JSON. Expected: { cards: [], loyalty_programs: [] }.');
        setUserData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.from || !formData.to) {
      alert("Please select From and To locations.");
      return;
    }
    if (formData.from === formData.to) {
      setFileError('Origin and destination cannot be the same.');
      return;
    }
    if (!userData) {
      setFileError('Please upload a valid JSON profile.');
      return;
    }
    
    // Navigate to results and pass the search data
    navigate('/results', { state: { trip: formData, userData } });
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <h2 className="search-title">Plan Your Trip Strategy</h2>
      
      <div className="form-group">
        <label htmlFor="from">From</label>
        <select 
          id="from"
          name="from" 
          value={formData.from}
          onChange={handleChange}
        >
          <option value="" disabled>Select Origin</option>
          {CITIES.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="to">To</label>
        <select 
          id="to"
          name="to" 
          value={formData.to}
          onChange={handleChange}
        >
          <option value="" disabled>Select Destination</option>
          {CITIES.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ marginTop: '12px' }}>
        <label htmlFor="userDataFile">Upload JSON Profile (Loyalty & Cards)</label>
        <input 
          id="userDataFile"
          type="file" 
          accept=".json"
          onChange={handleFileUpload}
          style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '6px' }}
        />
        {fileError && <span className="explanation-error">{fileError}</span>}
        {userData && <span style={{ color: 'green', fontSize: '0.9rem', marginTop: '4px' }}>✓ Profile Loaded</span>}
      </div>

      <button type="submit" className="btn-primary" style={{ marginTop: '12px' }}>
        Find Strategy
      </button>
    </form>
  );
}

export default SearchForm;
