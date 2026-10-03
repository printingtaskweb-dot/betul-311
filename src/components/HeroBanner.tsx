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
    tag: '🏆 #1 Cleanest City',
    title: 'Indore – Swachh Survekshan 2024',
    subtitle: 'Help us stay the cleanest! Report civic issues instantly with photo & location.',
    cta: 'Report Now',
    ctaLink: '/complaint/new',
    emoji: '🌿',
    gradient: 'linear-gradient(135deg, #14532d 0%, #166534 45%, #16a34a 100%)',
    accentColor: '#4ade80',
  },
  {
    id: 2,
    tag: '💧 Water Conservation',
    title: 'Report Water Leakages',
    subtitle: 'Save thousands of litres every day. Spot a leaking pipe? Report it in 30 seconds.',
    cta: 'Report Water Issue',
    ctaLink: '/complaint/new?dept=water',
    emoji: '💧',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #2563eb 100%)',
    accentColor: '#60a5fa',
  },
  {
    id: 3,
    tag: '🌧️ Monsoon Ready',
    title: 'Drainage & Flooding Issues',
    subtitle: 'Pre-monsoon drain cleaning is underway. Report blocked drains before rains arrive.',
    cta: 'Report Drainage',
    ctaLink: '/complaint/new?dept=rainwater',
    emoji: '🌧️',
    gradient: 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%)',
    accentColor: '#a5b4fc',
  },
  {
    id: 4,
    tag: '🌿 Green Indore',
    title: 'Biodegradable Waste Pickup',
    subtitle: 'Garden waste, fallen leaves, tree branches — we\'ll pick it up. Just click & report.',
    cta: 'Report Green Waste',
    ctaLink: '/department/green',
    emoji: '🌱',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 45%, #059669 100%)',
    accentColor: '#6ee7b7',
  },
  {
    id: 5,
    tag: '🏗️ C&D Waste Drive',
    title: 'Construction Waste Free Indore',
    subtitle: 'Illegal dumping of construction debris? Spot it, photograph it, report it instantly.',
    cta: 'Report C&D Waste',
    ctaLink: '/complaint/new?dept=cnd',
    emoji: '🏗️',
    gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 45%, #b45309 100%)',
    accentColor: '#fcd34d',
  },
];

export const HeroBanner: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const goTo = useCallback((idx: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 250);
  }, [animating]);

  const next = useCallback(() => goTo((current + 1) % SLIDES.length), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + SLIDES.length) % SLIDES.length), [current, goTo]);

  useEffect(() => {
    const id = setInterval(next, 4500);
    return () => clearInterval(id);
  }, [next]);

  const slide = SLIDES[current];

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 0 }}>
      {/* Main slide */}
      <div
        style={{
          background: slide.gradient,
          padding: '36px 24px 48px',
          transition: 'background 0.5s ease',
          position: 'relative',
          minHeight: 280,
        }}
      >
        {/* Background decorations */}
        <div style={{
          position: 'absolute', right: -30, top: -30,
          fontSize: 140, opacity: 0.12, lineHeight: 1,
          userSelect: 'none', pointerEvents: 'none',
        }}>
          {slide.emoji}
        </div>
        <div style={{
          position: 'absolute', bottom: 10, left: -10,
          width: 150, height: 150, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none',
        }} />

        {/* Content */}
        <div
          style={{
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            maxWidth: 520,
          }}
        >
          {/* Tag */}
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: 'rgba(255,255,255,0.18)',
            border: `1px solid rgba(255,255,255,0.3)`,
            borderRadius: 20,
            fontSize: 12, fontWeight: 600,
            color: '#fff', marginBottom: 14,
            letterSpacing: 0.3,
          }}>
            {slide.tag}
          </div>

          <h1 style={{
            color: '#fff', fontSize: 24, fontWeight: 800,
            marginBottom: 10, lineHeight: 1.2,
            textShadow: '0 2px 12px rgba(0,0,0,0.25)',
          }}>
            {slide.title}
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.85)', fontSize: 14,
            marginBottom: 22, lineHeight: 1.6, maxWidth: 400,
          }}>
            {slide.subtitle}
          </p>

          <a
            href={slide.ctaLink}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '11px 22px', borderRadius: 10,
              background: '#fff',
              color: '#166534',
              fontWeight: 700, fontSize: 14,
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {slide.cta} →
          </a>
        </div>

        {/* Nav arrows */}
        <button
          onClick={prev}
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={18} color="#fff" />
        </button>
        <button
          onClick={next}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronRight size={18} color="#fff" />
        </button>
      </div>

      {/* Dots */}
      <div style={{
        display: 'flex', gap: 6, justifyContent: 'center',
        padding: '10px 0',
        background: slide.gradient,
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === current ? 24 : 8, height: 8,
              borderRadius: 4, border: 'none', cursor: 'pointer',
              background: i === current ? '#fff' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.3s ease',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
};
