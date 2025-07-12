import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import QuotationEngine from './components/QuotationEngine';
import BulkQuotation from './components/BulkQuotation';
import VendorLookup from './components/VendorLookup';
import RouteLookup from './components/RouteLookup';

function App() {
  React.useEffect(() => {
    document.body.style.fontFamily = `Poppins, Montserrat, Raleway, Lato, Open Sans, Noto Sans, Oswald, sans-serif`;
    // Add global style for headings and body
    const style = document.createElement('style');
    style.innerHTML = `
      body {
        font-family: Poppins, Montserrat, Raleway, Lato, Open Sans, Noto Sans, Oswald, sans-serif;
        background: #f5f7fa;
        color: #222;
        letter-spacing: 0.01em;
      }
      h1, h2, h3, h4, h5, h6 {
        font-family: Montserrat, Poppins, Raleway, Lato, Open Sans, Noto Sans, Oswald, sans-serif;
        font-weight: 800;
        letter-spacing: 0.02em;
      }
      .modern-card, .modern-table, .modern-header, .modern-btn, .modern-input {
        font-family: Poppins, Montserrat, Raleway, Lato, Open Sans, Noto Sans, Oswald, sans-serif;
      }
      .modern-card {
        background: #fff;
        border-radius: 1.25rem;
        box-shadow: 0 6px 24px 0 rgba(60, 64, 67, 0.18), 0 1.5px 4px rgba(60, 64, 67, 0.10);
        padding: 2rem;
        transition: box-shadow 0.2s;
      }
      .modern-card:hover {
        box-shadow: 0 12px 32px 0 rgba(60, 64, 67, 0.22), 0 2px 8px rgba(60, 64, 67, 0.13);
      }
      .modern-table th, .modern-table td {
        font-size: 1rem;
        font-family: Raleway, Poppins, Montserrat, Lato, Open Sans, Noto Sans, Oswald, sans-serif;
        padding: 1rem 1.25rem;
      }
      .modern-table th {
        background: #f5f5f5;
        color: #5f6368;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .modern-table tr {
        transition: background 0.2s;
      }
      .modern-table tr:hover {
        background: #e3f2fd;
      }
      .modern-header {
        font-size: 2.25rem;
        font-weight: 900;
        color: #1a73e8;
        letter-spacing: 0.04em;
      }
      .modern-btn {
        font-weight: 700;
        border-radius: 0.75rem;
        padding: 0.75rem 2rem;
        background: linear-gradient(90deg, #1a73e8 0%, #43cea2 100%);
        color: #fff;
        box-shadow: 0 2px 8px rgba(26,115,232,0.10);
        border: none;
        outline: none;
        cursor: pointer;
        transition: background 0.2s, color 0.2s, box-shadow 0.2s;
        font-size: 1.1rem;
        letter-spacing: 0.01em;
        display: inline-block;
      }
      .modern-btn:hover, .modern-btn:focus {
        background: linear-gradient(90deg, #1765c1 0%, #43cea2 100%);
        color: #fff;
        box-shadow: 0 4px 16px rgba(26,115,232,0.18);
      }
      .modern-input {
        border-radius: 0.75rem;
        border: 1.5px solid #e0e0e0;
        padding: 0.85rem 1.1rem;
        font-size: 1.05rem;
        background: #fafbfc;
        transition: border 0.2s, box-shadow 0.2s;
        box-shadow: 0 1px 2px rgba(60,64,67,0.04);
      }
      .modern-input:focus {
        border-color: #1a73e8;
        outline: none;
        box-shadow: 0 0 0 2px #e3f2fd;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  return (
    <Router>
      <Header />
      <div className="container" style={{ padding: '2rem' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/quotations" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quotations" element={<QuotationEngine />} />
          <Route path="/bulk-quotation" element={<BulkQuotation />} />
          <Route path="/vendor-lookup" element={<VendorLookup />} />
          <Route path="/route-lookup" element={<RouteLookup />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
