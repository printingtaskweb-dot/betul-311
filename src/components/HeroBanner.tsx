import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BannerSlide {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaLink: string;
  emoji: string;
  gradient: string;
  accentColor: string;
}

const SLIDES: BannerSlide[] = [
  {
    id: 1,
    tag: '🏆 #1 Cleanest City Model',
    title: 'Clean Indore & Betul Mission',
    subtitle: 'Report civic issues instantly with photo & auto GPS location. Track until resolved and verified.',
    cta: 'Report Civic Issue',
    ctaLink: '/complaint/new',
    emoji: '🏛️',
    gradient: 'linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%)',
    accentColor: '#f4c2d7',
  },
  {
    id: 2,
    tag: '💧 Water Conservation',
    title: 'Report Water Leakage & Supply',
    subtitle: 'Save precious water every day. Spot a broken pipe or shortage? Route to department in 30 seconds.',
    cta: 'Report Water Issue',
    ctaLink: '/complaint/new?dept=water',
    emoji: '💧',
    gradient: 'linear-gradient(135deg, #3b001d 0%, #520029 50%, #660033 100%)',
    accentColor: '#e383ac',
  },
  {
    id: 3,
    tag: '🌧️ Monsoon Preparedness',
    title: 'Rain Water & Flood Drainage',
    subtitle: 'Choked storm drains or road waterlogging? Municipal teams ready for immediate dispatch.',
    cta: 'Report Drainage',
    ctaLink: '/complaint/new?dept=rainwater',
    emoji: '🌧️',
    gradient: 'linear-gradient(135deg, #400020 0%, #660033 50%, #7a003d 100%)',
    accentColor: '#fae1eb',
  },
  {
    id: 4,
    tag: '🌿 Green Waste Initiative',
    title: 'Biodegradable Waste Pickup',
    subtitle: 'Garden trimmings, fallen branches, and leaves — specialized pickup fleet dispatched to your location.',
    cta: 'Report Green Waste',
    ctaLink: '/department/green',
    emoji: '🌱',
    gradient: 'linear-gradient(135deg, #4d0026 0%, #660033 50%, #800040 100%)',
    accentColor: '#f4c2d7',
  },
  {
    id: 5,
    tag: '🏗️ Debris Free City',
    title: 'C&D Waste Clearance Drive',
    subtitle: 'Construction and demolition waste clearance. Fast removal of roadside rubble and debris.',
    cta: 'Report C&D Waste',
    ctaLink: '/complaint/new?dept=cnd',
    emoji: '🏗️',
    gradient: 'linear-gradient(135deg, #3b001d 0%, #520029 50%, #660033 100%)',
    accentColor: '#e383ac',
  },
];

export const HeroBanner: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback(
    (idx: number) => {
      if (animating) return;
      setAnimating(true);
      setTimeout(() => {
        setCurrent(idx);
        setAnimating(false);
      }, 250);
    },
    [animating]
  );

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo]);

  useEffect(() => {
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next]);

  const slide = SLIDES[current];

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width: '100%' }}>
      <div
        style={{
          background: slide.gradient,
          padding: 'clamp(28px, 4vw, 56px) clamp(16px, 4vw, 32px)',
          transition: 'background 0.5s ease',
          position: 'relative',
          minHeight: 'clamp(260px, 30vw, 360px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {/* Background decorative emoji */}
        <div
          style={{
            position: 'absolute',
            right: 'clamp(-10px, 4vw, 40px)',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 'clamp(100px, 16vw, 220px)',
            opacity: 0.12,
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {slide.emoji}
        </div>

        {/* Content container */}
        <div
          className="app-container"
          style={{
            position: 'relative',
            zIndex: 2,
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            maxWidth: 800,
            marginLeft: 0,
            paddingLeft: 0,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 'var(--radius-full)',
              fontSize: 'clamp(0.72rem, 0.7rem + 0.2vw, 0.82rem)',
              fontWeight: 700,
              color: '#fff',
              marginBottom: 12,
              letterSpacing: '0.02em',
              backdropFilter: 'blur(8px)',
            }}
          >
            {slide.tag}
          </div>

          <h1
            style={{
              color: '#fff',
              fontSize: 'clamp(1.4rem, 1.2rem + 1.5vw, 2.4rem)',
              fontWeight: 900,
              marginBottom: 10,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              textShadow: '0 2px 16px rgba(0,0,0,0.25)',
              maxWidth: 620,
            }}
          >
            {slide.title}
          </h1>

          <p
            style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: 'clamp(0.85rem, 0.8rem + 0.3vw, 1.05rem)',
              marginBottom: 20,
              lineHeight: 1.6,
              maxWidth: 540,
            }}
          >
            {slide.subtitle}
          </p>

          <div>
            <a
              href={slide.ctaLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: 'clamp(10px, 1.5vw, 14px) clamp(20px, 2vw, 28px)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--theme-bg, #fff4e7)',
                color: 'var(--theme-primary, #660033)',
                fontWeight: 800,
                fontSize: 'clamp(0.85rem, 0.8rem + 0.2vw, 0.95rem)',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-lg)',
                transition: 'var(--transition)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
              }}
            >
              {slide.cta} →
            </a>
          </div>
        </div>

        {/* Carousel controls */}
        <button
          onClick={prev}
          aria-label="Previous slide"
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            border: '1px solid rgba(255,255,255,0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            zIndex: 10,
            transition: 'var(--transition)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.45)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
        >
          <ChevronLeft size={20} color="#fff" />
        </button>
        <button
          onClick={next}
          aria-label="Next slide"
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            border: '1px solid rgba(255,255,255,0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            zIndex: 10,
            transition: 'var(--transition)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.45)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
        >
          <ChevronRight size={20} color="#fff" />
        </button>
      </div>

      {/* Progress Dots */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          justifyContent: 'center',
          padding: '10px 0',
          background: slide.gradient,
        }}
      >
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: i === current ? 24 : 8,
              height: 7,
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              background: i === current ? '#fff' : 'rgba(255,255,255,0.35)',
              transition: 'all 0.3s ease',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
};
