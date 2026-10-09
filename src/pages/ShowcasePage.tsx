import React from 'react';
import { Link } from 'react-router-dom';
import { PosterShowcase } from '../components/PosterShowcase';
import { ArrowLeft, Home as HomeIcon } from 'lucide-react';

export const ShowcasePage: React.FC = () => {
  return (
    <div style={{ position: 'relative' }}>
      {/* Floating navigation button back to Home */}
      <div
        style={{
          position: 'fixed',
          top: 20,
          left: 20,
          zIndex: 150,
          display: 'flex',
          gap: 10,
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: '999px',
            background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.88rem',
            boxShadow: '0 8px 24px rgba(102, 0, 51, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ArrowLeft size={16} />
          <HomeIcon size={15} />
          <span>Portal Home</span>
        </Link>
      </div>

      <PosterShowcase />
    </div>
  );
};
