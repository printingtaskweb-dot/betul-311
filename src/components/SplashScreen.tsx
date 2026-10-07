import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onDone: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2400);
    const t2 = setTimeout(() => onDone(), 2900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-primary)',

        /* 🍷 Burgundy gradient background */
        background:
          'linear-gradient(160deg, #4A0D18 0%, #6E1423 45%, #8C2A3A 100%)',

        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
    >
      {/* Local keyframes */}
      <style>{`
        @keyframes splash-fade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splash-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(250,243,224,0.35); }
          50%      { box-shadow: 0 0 0 14px rgba(250,243,224,0); }
        }
        @keyframes splash-logo-pop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
      `}</style>

      {/* Decorative cream circles */}
      <div style={{
        position: 'absolute', top: -80, right: -80,
        width: 280, height: 280, borderRadius: '50%',
        background: 'rgba(250,243,224,0.07)',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, left: -60,
        width: 220, height: 220, borderRadius: '50%',
        background: 'rgba(250,243,224,0.05)',
      }} />

      {/* Logo container */}
      <div style={{
        animation: 'splash-fade 0.7s ease forwards',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        {/* Logo image in cream circle */}
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: '#FAF3E0',                          // cream base
          border: '3px solid #FFF9EC',                    // lighter cream border
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 0 40px rgba(250,243,224,0.35)',   // cream glow
          animation: 'splash-pulse 2s ease-in-out infinite, splash-logo-pop 0.8s ease forwards',
        }}>
          <img
            src="/logo.png"
            alt="IMC 311 Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>

        {/* App name */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            color: '#FAF3E0',                              // cream text
            fontSize: 42, fontWeight: 900,
            letterSpacing: 3, margin: 0, lineHeight: 1,
            textShadow: '0 2px 20px rgba(0,0,0,0.35)',
          }}>
            IMC 311
          </h1>
          <p style={{
            color: 'rgba(250,243,224,0.85)',              // soft cream
            fontSize: 15, marginTop: 6, letterSpacing: 1, fontWeight: 500,
          }}>
            Indore Municipal Corporation
          </p>
        </div>

        {/* Tagline pill */}
        <div style={{
          marginTop: 8,
          padding: '8px 20px',
          background: 'rgba(250,243,224,0.12)',
          borderRadius: 20,
          border: '1px solid rgba(250,243,224,0.35)',
        }}>
          <p lang="hi" style={{
            color: '#FAF3E0', fontSize: 13, margin: 0, letterSpacing: 0.5,
            fontFamily: 'var(--font-hindi)',
          }}>
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
                background: '#FAF3E0',                     // cream dots
                animation: `splash-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom credit */}
      <p style={{
        position: 'absolute', bottom: 28,
        color: 'rgba(250,243,224,0.55)',                   // muted cream
        fontSize: 12, letterSpacing: 0.5,
      }}>
        Powered by printing task · Smart City Mission
      </p>
    </div>
  );
};
