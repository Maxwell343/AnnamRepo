import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Tracking.css';

const OrderTracking: React.FC = () => {
  const navigate = useNavigate();
  
  // Get user from localStorage
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
  const isDriver = user?.role === 'distributor';

  // Mock Data: Farmer/NGO view (Tracking an outgoing order)
  const farmerOrderDetails = {
    id: '#ORD-8821',
    item: 'Fresh Tomatoes (50kg)',
    status: 'In Transit',
    driver: 'Rajesh Kumar',
    vehicle: 'Tata Ace (MH-04-AB-1234)',
    otp: '4821'
  };

  // Mock Data: Driver view (Deliveries assigned to driver)
  const driverOrderDetails = {
    id: '#DRV-5234',
    item: 'Fresh Spinach (20kg)',
    status: 'In Transit',
    pickupFrom: 'Green Valley Farm',
    deliverTo: 'Seva Kitchen NGO',
    distance: '12 km',
    estimatedTime: '35 mins',
    otp: '5682',
    contact: 'Farm: +91 98765 43210 | NGO: +91 87654 32109'
  };

  const orderDetails = isDriver ? driverOrderDetails : farmerOrderDetails;

  return (
    <div className="tracking-container">
      <div className="tracking-card">
        
        {/* 1. Map Visualization (Placeholder) */}
        <div className="map-placeholder">
          📍 Live Map Tracking View
        </div>

        <div className="order-body">
          {/* 2. Header */}
          <div className="order-header">
            <div>
              <div className="order-id">{orderDetails.id}</div>
              <h2 className="order-title">{orderDetails.item}</h2>
            </div>
            <span className="status-badge">In Transit</span>
          </div>

          {/* 3. The Digital Handshake (OTP) */}
          <div className="otp-section">
            <span className="otp-label">Secure Verification Code</span>
            <div className="otp-code">{(orderDetails as any).otp}</div>
            <p className="otp-instruction">
              {isDriver ? 'Share this code at pickup point for verification.' : 'Share this code with the driver ONLY upon pickup.'}
            </p>
          </div>

          {/* 4. Timeline Steps */}
          <div className="timeline">
            {isDriver ? (
              <>
                {/* Driver Timeline */}
                <div className="timeline-item active">
                  <div className="timeline-dot"></div>
                  <div className="timeline-title">Order Assigned</div>
                  <div className="timeline-desc">Delivery assigned to you by dispatch</div>
                </div>
                
                <div className="timeline-item active">
                  <div className="timeline-dot"></div>
                  <div className="timeline-title">Heading to Pickup</div>
                  <div className="timeline-desc">En route to {(orderDetails as any).pickupFrom}</div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-title">Pickup Complete</div>
                  <div className="timeline-desc">Goods loaded and verified</div>
                </div>

                <div className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-title">Delivery Complete</div>
                  <div className="timeline-desc">Delivered to {(orderDetails as any).deliverTo}</div>
                </div>
              </>
            ) : (
              <>
                {/* Farmer/NGO Timeline */}
                <div className="timeline-item active">
                  <div className="timeline-dot"></div>
                  <div className="timeline-title">Request Accepted</div>
                  <div className="timeline-desc">NGO "Seva Kitchen" claimed the donation</div>
                </div>
                
                <div className="timeline-item active">
                  <div className="timeline-dot"></div>
                  <div className="timeline-title">Driver Assigned</div>
                  <div className="timeline-desc">Driver is on the way to pickup</div>
                </div>

                <div className="timeline-item active">
                  <div className="timeline-dot"></div>
              <div className="timeline-title">Pickup Verified</div>
              <div className="timeline-desc">Code matched. Goods in transit.</div>
            </div>

            <div className="timeline-item">
              <div className="timeline-dot"></div>
              <div className="timeline-title">Delivered</div>
              <div className="timeline-desc">Estimated arrival: 15 mins</div>
            </div>
              </>
            )}
          </div>

          {/* 5. Driver/Route Details */}
          {isDriver ? (
            <div className="driver-info" style={{border: '1px solid #e0e0e0', padding: '1.5rem', borderRadius: '8px'}}>
              <h3 style={{marginTop: 0, marginBottom: '1rem'}}>📍 Delivery Details</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <div>
                  <div style={{fontSize: '0.85rem', color: '#666', fontWeight: '500'}}>PICKUP FROM</div>
                  <div style={{fontSize: '1rem', fontWeight: 'bold'}}>{(orderDetails as any).pickupFrom}</div>
                </div>
                <div>
                  <div style={{fontSize: '0.85rem', color: '#666', fontWeight: '500'}}>DELIVER TO</div>
                  <div style={{fontSize: '1rem', fontWeight: 'bold'}}>{(orderDetails as any).deliverTo}</div>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                  <div>
                    <div style={{fontSize: '0.85rem', color: '#666', fontWeight: '500'}}>DISTANCE</div>
                    <div style={{fontSize: '1rem', fontWeight: 'bold'}}>{(orderDetails as any).distance}</div>
                  </div>
                  <div>
                    <div style={{fontSize: '0.85rem', color: '#666', fontWeight: '500'}}>EST. TIME</div>
                    <div style={{fontSize: '1rem', fontWeight: 'bold'}}>{(orderDetails as any).estimatedTime}</div>
                  </div>
                </div>
                <div>
                  <div style={{fontSize: '0.85rem', color: '#666', fontWeight: '500'}}>CONTACTS</div>
                  <div style={{fontSize: '0.9rem'}}>{(orderDetails as any).contact}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="driver-info">
              <div className="driver-avatar" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
                👨🏽‍✈️
              </div>
              <div>
                <div style={{fontWeight: 'bold'}}>{(orderDetails as any).driver}</div>
                <div style={{fontSize: '0.9rem', color: '#666'}}>
                  {(orderDetails as any).vehicle} • 4.8 ⭐
                </div>
              </div>
              <div style={{marginLeft: 'auto'}}>
                <button style={{padding:'8px 15px', borderRadius:'20px', border:'none', background:'#e3f2fd', color:'#1565c0', fontWeight:'bold', cursor:'pointer'}}>
                  📞 Call
                </button>
              </div>
            </div>
          )}

          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;