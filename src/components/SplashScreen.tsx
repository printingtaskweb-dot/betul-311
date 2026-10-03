import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2400);
    const t2 = setTimeout(() => onDone(), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #14532d 0%, #166534 30%, #16a34a 65%, #4ade80 100%)',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
    >
      {/* Decorative circles */}
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 280, height: 280, borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, left: -60,
        width: 220, height: 220, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />

      {/* Logo container */}
      <div style={{
        animation: 'splash-fade 0.7s ease forwards',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        {/* IMC emblem */}
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: '3px solid rgba(255,255,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 50,
          boxShadow: '0 0 40px rgba(255,255,255,0.2)',
          animation: 'pulse-green 2s ease-in-out infinite',
        }}>
          🏛️
        </div>

        {/* App name */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            color: '#fff', fontSize: 42, fontWeight: 900,
            letterSpacing: 3, margin: 0, lineHeight: 1,
            textShadow: '0 2px 20px rgba(0,0,0,0.3)',
          }}>
            IMC 311
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.85)', fontSize: 15,
            marginTop: 6, letterSpacing: 1, fontWeight: 400,
          }}>
            Indore Municipal Corporation
          </p>
        </div>

        {/* Tagline */}
        <div style={{
          marginTop: 8,
          padding: '8px 20px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.3)',
        }}>
          <p style={{ color: '#fff', fontSize: 13, margin: 0, letterSpacing: 0.5 }}>
            स्वच्छ इंदौर · Swachh Indore
          </p>
        </div>

        {/* Loading dots */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'rgba(255,255,255,0.7)',
                animation: `pulse-green 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom credit */}
      <p style={{
        position: 'absolute', bottom: 28,
        color: 'rgba(255,255,255,0.5)', fontSize: 12,
        letterSpacing: 0.5,
      }}>
        Powered by IMC · Smart City Mission
      </p>
    </div>
  );
};
