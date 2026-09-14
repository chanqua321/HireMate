import React from 'react';
import { Link } from 'react-router-dom';
import './css/Footer.css';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-left">
          <div className="footer-brand-row">
            <Link to="/" className="footer-brand-title">
              HireMate
            </Link>
          </div>
          <p className="footer-slogan">
            2026 HireMate. Empowering the next generation of Vietnamese talent.
          </p>
        </div>

        <div className="footer-links-row">
          <a href="#privacy" onClick={(e) => e.preventDefault()}>
            Privacy Policy
          </a>
          <a href="#terms" onClick={(e) => e.preventDefault()}>
            Terms of Service
          </a>
          <a href="#help" onClick={(e) => e.preventDefault()}>
            Help Center
          </a>
          <a href="mailto:hirematecompany@gmail.com">
            Contact Us
          </a>
        </div>
      </div>
    </footer>
  );
};
