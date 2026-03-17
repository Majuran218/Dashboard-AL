import React, { useState, useEffect } from 'react';
import api from '../services/api';

const HomePage = () => {
  const [backendStatus, setBackendStatus] = useState('Checking...');

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await api.get('/test');
        setBackendStatus('Connected ✓');
        console.log('Backend response:', response.data);
      } catch (error) {
        setBackendStatus('Not Connected ✗');
        console.error('Backend connection error:', error);
      }
    };
    checkBackend();
  }, []);

  return (
    <div className="home-page">
      <h1>Welcome to QAL Dashboard</h1>
      <p>Backend Status: {backendStatus}</p>
    </div>
  );
};

export default HomePage;