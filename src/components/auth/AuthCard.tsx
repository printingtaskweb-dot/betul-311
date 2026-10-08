import React from 'react';

interface Props {
  children: React.ReactNode;
}

export const AuthCard: React.FC<Props> = ({ children }) => (
  <div style={{ maxWidth: 440, margin: '10px auto 0', padding: '0 16px 100px' }}>
    <div
      style={{
        background: 'var(--theme-component, #d9d9d9)',
        borderRadius: 20,
        boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        border: '1.5px solid var(--theme-component-border, #bfbfbf)',
      }}
    >
      {children}
    </div>
  </div>
);
