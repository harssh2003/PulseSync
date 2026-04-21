import React, { useState } from 'react';

const BookAmbulance = () => {
  const [formData, setFormData] = useState({
    patientName: '',
    contactNumber: '',
    pickupLocation: '',
    destination: '',
    ambulanceType: 'Standard'
  });

  const NGROK_URL = "https://nonecliptical-logographic-maliah.ngrok-free.dev"; // IMPORTANT: Update this!

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTypeSelect = (type: string) => {
    setFormData({ ...formData, ambulanceType: type });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientName || !formData.contactNumber) {
      alert("Please fill in the required fields.");
      return;
    }

    const params = new URLSearchParams({
      name: formData.patientName,
      phone: formData.contactNumber,
      pickup: formData.pickupLocation,
      dest: formData.destination,
      type: formData.ambulanceType
    });
    
    window.location.href = `${NGROK_URL}/?${params.toString()}`;
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#f4f9fd', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', width: '100%', maxWidth: '100%' }}>
        
        {/* Header */}
        <div style={{
          width: '100%',
          background: 'linear-gradient(to right, #0ea5e9, #06b6d4)',
          color: 'white',
          padding: '40px',
          borderRadius: '20px',
          marginBottom: '30px'
        }}>
          <button
            onClick={() => window.history.back()}
            style={{
              marginBottom: '20px',
              padding: '8px 16px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ← Back
          </button>

          <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '10px' }}>
            🚑 Ambulance Services
          </h1>

          <p style={{ fontSize: '16px', opacity: 0.9 }}>
            Book and track ambulance services 24/7 with real-time tracking
          </p>
        </div>

        <h2 style={{ color: '#0369a1', marginBottom: '30px' }}>Book an Ambulance</h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Patient Name *</label>
              <input type="text" name="patientName" placeholder="Enter patient name" onChange={handleChange} required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Contact Number *</label>
              <input type="text" name="contactNumber" placeholder="+91 XXXXX XXXXX" onChange={handleChange} required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Pickup Location</label>
              <input type="text" name="pickupLocation" placeholder="Your current location" onChange={handleChange}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Destination</label>
              <input type="text" name="destination" placeholder="Hospital or destination" onChange={handleChange}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Ambulance Type *</label>
            <div style={{ display: 'flex', gap: '15px' }}>
              {['Standard', 'Advanced', 'ICU'].map((type) => (
                <button type="button" key={type} onClick={() => handleTypeSelect(type)}
                  style={{
                    flex: 1, padding: '15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                    border: formData.ambulanceType === type ? 'none' : '1px solid #cbd5e1',
                    backgroundColor: formData.ambulanceType === type ? '#00b4d8' : 'white',
                    color: formData.ambulanceType === type ? 'white' : '#64748b'
                  }}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" style={{ width: '100%', padding: '16px', backgroundColor: '#00b4d8', color: 'white', fontWeight: 'bold', fontSize: '16px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Proceed to Live Tracking
          </button>
        </form>

      </div>
    </div>
  );
};

export default BookAmbulance;