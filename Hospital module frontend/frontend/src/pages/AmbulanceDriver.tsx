import React, { useState } from 'react';

const DriverPortal = () => {
  const [formData, setFormData] = useState({
    driverName: '',
    contactNumber: '',
    vehicleNo: '',
    adminKey: ''
  });

  const NGROK_URL = "https://nonecliptical-logographic-maliah.ngrok-free.dev";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.driverName || !formData.vehicleNo || !formData.adminKey) {
      alert("Please fill in all required fields.");
      return;
    }

    const params = new URLSearchParams({
      name: formData.driverName,
      phone: formData.contactNumber,
      vehicle: formData.vehicleNo,
      key: formData.adminKey
    });
    
    window.location.href = `${NGROK_URL}/driver?${params.toString()}`;
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

        <h2 style={{ color: '#0369a1', marginBottom: '30px', textAlign: 'center' }}>Ambulance Driver Login</h2>
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '30px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Driver Name *</label>
              <input type="text" name="driverName" onChange={handleChange} required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Contact Number *</label>
              <input type="text" name="contactNumber" onChange={handleChange} required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Vehicle Number Plate *</label>
              <input type="text" name="vehicleNo" placeholder="MH-01-AB-1234" onChange={handleChange} required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>Admin Key *</label>
              <input type="password" name="adminKey" onChange={handleChange} required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
          </div>

          <button type="submit" style={{ width: '100%', padding: '16px', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', fontSize: '16px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Start Shift & Activate GPS
          </button>
        </form>

      </div>
    </div>
  );
};

export default DriverPortal;