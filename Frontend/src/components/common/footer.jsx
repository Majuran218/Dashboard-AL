import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-title">AL Dashboard</h3>
          <p className="footer-text">
            Your comprehensive learning management system for A-Level studies.
          </p>
        </div>

        <div className="footer-section">
          <h4 className="footer-subtitle">Quick Links</h4>
          <Link to="/" className="footer-link">Home</Link>
          <Link to="/about" className="footer-link">About Us</Link>
          <Link to="/contact" className="footer-link">Contact</Link>
        </div>

        <div className="footer-section">
          <h4 className="footer-subtitle">Resources</h4>
          <Link to="/pastpapers" className="footer-link">Past Papers</Link>
          <Link to="/mcq" className="footer-link">MCQ Practice</Link>
          <Link to="/notes" className="footer-link">Study Notes</Link>
        </div>

        <div className="footer-section">
          <h4 className="footer-subtitle">Contact Us</h4>
          <p className="footer-text">Email: info@aldashboard.com</p>
          <p className="footer-text">Phone: +94 123 456 789</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} AL Dashboard. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
