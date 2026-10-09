import React, { useEffect, useRef } from 'react';
import './PosterShowcase.css';

export const PosterShowcase: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLElement>(null);
  const arcsRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let ctx: any = null;
    let animFrameId: number | null = null;
    let isCleanedUp = false;

    const initAnimations = () => {
      const gsap = (window as any).gsap;
      const ScrollTrigger = (window as any).ScrollTrigger;

      if (!gsap || !containerRef.current) return false;

      if (ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
      }

      ctx = gsap.context(() => {
        // Compute arc circumferences for stroke-dashoffset draw-on
        const arcElements = containerRef.current?.querySelectorAll<SVGCircleElement>('.arc');
        arcElements?.forEach((arc) => {
          const r = parseFloat(arc.getAttribute('r') || '0');
          const c = 2 * Math.PI * r;
          arc.style.strokeDasharray = `${c}`;
          arc.style.strokeDashoffset = `${c}`;
        });

        // 1. INITIAL STATES
        gsap.set('.top-divider .line', { scaleX: 0, transformOrigin: 'center' });
        gsap.set('.top-divider .dot', { scale: 0 });
        gsap.set('.pill', { y: 80, opacity: 0, scale: 0.96 });
        gsap.set('.tools-tile .t', { y: 16, opacity: 0 });
        gsap.set('.label-tile .lbl', { y: 16, opacity: 0 });
        gsap.set('#reinvent', { opacity: 0, y: 10 });
        gsap.set('.f-card', { opacity: 0 });
        gsap.set('.cta-inner', { opacity: 0 });

        // 2. INTRO TIMELINE
        const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
        intro
          .to('.top-divider .line', { scaleX: 1, duration: 0.9, ease: 'power3.inOut' }, 0.1)
          .to('.top-divider .dot', { scale: 1, duration: 0.6, ease: 'back.out(1.8)' }, 0.6)
          .to(
            '.arc',
            {
              strokeDashoffset: (_i: number, el: SVGCircleElement) => {
                const r = parseFloat(el.getAttribute('r') || '0');
                return 2 * Math.PI * r * 0.5; // draw half
              },
              duration: 2.4,
              stagger: 0.12,
              ease: 'power2.inOut',
            },
            0.4
          )
          .to(
            '.pill',
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 1.1,
              stagger: 0.15,
              ease: 'back.out(1.3)',
            },
            0.6
          )
          .to('.label-tile .lbl', { y: 0, opacity: 1, duration: 0.7, stagger: 0.15 }, 1.0)
          .to(
            '.tools-tile .t',
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              stagger: { each: 0.04, from: 'start' },
            },
            1.15
          )
          .to('#reinvent', { opacity: 1, y: 0, duration: 0.8 }, 1.9);

        // 3. CONTINUOUS: subtle pill float + arc shimmer
        containerRef.current?.querySelectorAll<HTMLElement>('.pill').forEach((pill, i) => {
          gsap.to(pill, {
            y: `+=${4 + i * 1.5}`,
            duration: 3.2 + i * 0.4,
            delay: 2.2 + i * 0.15,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          });
        });

        gsap.to('.arc', {
          opacity: 0.4,
          duration: 3,
          stagger: 0.3,
          delay: 2.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        });

        // 4. PILL HOVER: 3D tilt + lift
        containerRef.current?.querySelectorAll<HTMLElement>('.pill').forEach((pill) => {
          pill.addEventListener('mousemove', (e: MouseEvent) => {
            const r = pill.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            gsap.to(pill, {
              rotateX: -py * 6,
              rotateY: px * 6,
              y: -6,
              duration: 0.5,
              ease: 'power2.out',
              transformPerspective: 1200,
              overwrite: 'auto',
            });
          });
          pill.addEventListener('mouseleave', () => {
            gsap.to(pill, {
              rotateX: 0,
              rotateY: 0,
              y: 0,
              duration: 0.8,
              ease: 'elastic.out(1, 0.6)',
              overwrite: 'auto',
            });
          });
        });

        // 5. Tools click ripple
        containerRef.current?.querySelectorAll<HTMLElement>('.tools-tile .t').forEach((t) => {
          t.addEventListener('click', () => {
            gsap.fromTo(
              t,
              { scale: 1 },
              {
                scale: 0.94,
                duration: 0.1,
                yoyo: true,
                repeat: 1,
                ease: 'power2.inOut',
              }
            );
          });
        });

        // 6. MOUSE PARALLAX ON POSTER
        const posterEl = posterRef.current;
        let mx = 0, my = 0, tx = 0, ty = 0;
        if (posterEl) {
          const onPosterMove = (e: MouseEvent) => {
            const r = posterEl.getBoundingClientRect();
            mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
            my = ((e.clientY - r.top) / r.height - 0.5) * 2;
          };
          const onPosterLeave = () => {
            mx = 0;
            my = 0;
          };
          posterEl.addEventListener('mousemove', onPosterMove);
          posterEl.addEventListener('mouseleave', onPosterLeave);

          const parallax = () => {
            if (isCleanedUp) return;
            tx += (mx - tx) * 0.05;
            ty += (my - ty) * 0.05;
            if (arcsRef.current) {
              arcsRef.current.style.transform = `translateY(-50%) translate(${tx * 18}px, ${ty * 10}px)`;
            }
            animFrameId = requestAnimationFrame(parallax);
          };
          parallax();
        }

        // 7. SCROLL TRIGGER: Pills shift & reveal arcs
        if (ScrollTrigger) {
          ScrollTrigger.create({
            trigger: '.poster',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.8,
            onUpdate: (self: any) => {
              const p = self.progress;
              const pills = containerRef.current?.querySelectorAll<HTMLElement>('.pill');
              if (pills && pills.length >= 3) {
                gsap.set(pills[0], { x: -180 * p, rotation: -2 * p });
                gsap.set(pills[1], { x: 0, scale: 1 - 0.04 * p });
                gsap.set(pills[2], { x: 180 * p, rotation: 2 * p });
              }
              if (arcsRef.current) {
                gsap.set(arcsRef.current, { scale: 1 + 0.15 * p });
              }
              gsap.set('#reinvent', { opacity: 1 - p * 1.6 });
            },
          });

          // 8. FEATURED GRID REVEAL
          gsap.from('.eyebrow, .featured-head h2, .featured-head p', {
            opacity: 0,
            y: 30,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: '.featured-head', start: 'top 80%' },
          });

          gsap.to('.f-card', {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: '.featured-grid', start: 'top 80%' },
          });

          gsap.fromTo(
            '.f-card',
            { y: 70, scale: 0.94 },
            {
              y: 0,
              scale: 1,
              duration: 1,
              stagger: 0.1,
              ease: 'back.out(1.3)',
              scrollTrigger: { trigger: '.featured-grid', start: 'top 80%' },
            }
          );

          // Mini tile hover effect inside f-cards
          containerRef.current?.querySelectorAll<HTMLElement>('.f-card').forEach((card) => {
            const mini = card.querySelector<HTMLElement>('.f-mini');
            if (mini) {
              card.addEventListener('mouseenter', () => {
                gsap.to(mini, { rotate: -8, y: -4, scale: 1.08, duration: 0.5, ease: 'back.out(1.6)' });
              });
              card.addEventListener('mouseleave', () => {
                gsap.to(mini, { rotate: 0, y: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.6)' });
              });
            }
          });

          // 9. CTA REVEAL + COUNTERS
          gsap.to('.cta-inner', {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: { trigger: '.cta-section', start: 'top 80%' },
          });

          gsap.from('.cta-inner', {
            y: 80,
            scale: 0.95,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: { trigger: '.cta-section', start: 'top 80%' },
          });

          ScrollTrigger.create({
            trigger: '.cta-section',
            start: 'top 75%',
            onEnter: () => {
              containerRef.current?.querySelectorAll<HTMLElement>('.cta-stat .num').forEach((el) => {
                const target = parseFloat(el.dataset.count || '0');
                const span = el.querySelector('span');
                if (span) {
                  gsap.to(
                    { v: 0 },
                    {
                      v: target,
                      duration: 1.8,
                      ease: 'power2.out',
                      onUpdate: function () {
                        span.textContent = Math.floor((this as any).targets()[0].v).toLocaleString();
                      },
                    }
                  );
                }
              });
            },
            once: true,
          });
        }
      }, containerRef);

      return true;
    };

    // Try initializing immediately or wait for script load
    if (!initAnimations()) {
      const interval = setInterval(() => {
        if (initAnimations()) {
          clearInterval(interval);
        }
      }, 100);
      return () => {
        isCleanedUp = true;
        clearInterval(interval);
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (ctx) ctx.revert();
      };
    }

    return () => {
      isCleanedUp = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <div className="poster-wrapper" ref={containerRef}>
      <div className="poster-grain"></div>

      {/* ============ POSTER (HERO) ============ */}
      <section className="poster" ref={posterRef} id="poster">
        <div className="top-divider" id="topDiv">
          <span className="line"></span>
          <span className="dot"></span>
          <span className="line"></span>
        </div>

        {/* Decorative arcs on the left */}
        <svg className="arcs" viewBox="0 0 1600 1600" id="arcs" ref={arcsRef}>
          <circle className="arc" cx="0" cy="800" r="780" />
          <circle className="arc" cx="0" cy="800" r="900" />
          <circle className="arc" cx="0" cy="800" r="1020" />
          <circle className="arc" cx="0" cy="800" r="1140" />
          <circle className="arc" cx="0" cy="800" r="1260" />
        </svg>

        <div className="pills" id="pills">
          {/* Pill 1: SITE */}
          <div className="pill">
            <div className="dark-tile label-tile">
              <span className="lbl">Site</span>
            </div>
            <div className="dark-tile tools-tile">
              <span className="t">Deepseek R1</span>
              <span className="t">Gemini</span>
              <span className="t">Claude</span>
              <span className="t">Perplexity</span>
              <span className="t">ChatGPT</span>
            </div>
          </div>

          {/* Pill 2: GERADOR DE LOGO */}
          <div className="pill">
            <div className="dark-tile label-tile">
              <span className="lbl">
                Gerador
                <br />
                de Logo
              </span>
            </div>
            <div className="dark-tile tools-tile">
              <span className="t">Pencil</span>
              <span className="t">Adcopy</span>
              <span className="t">Drotruel</span>
              <span className="t">AI-Ads</span>
              <span className="t">Simplified</span>
            </div>
          </div>

          {/* Pill 3: UI/UX */}
          <div className="pill">
            <div className="dark-tile label-tile">
              <span className="lbl">UI/UX</span>
            </div>
            <div className="dark-tile tools-tile">
              <span className="t">Dora</span>
              <span className="t">10Web</span>
              <span className="t">Durable</span>
              <span className="t">LandingSite</span>
              <span className="t">Viz AI</span>
            </div>
          </div>
        </div>

        <div className="reinvent" id="reinvent">
          R&nbsp;E&nbsp;I&nbsp;N&nbsp;V&nbsp;E&nbsp;N&nbsp;T<span className="gap"></span>Y&nbsp;O&nbsp;U&nbsp;R&nbsp;S&nbsp;E&nbsp;L&nbsp;F
        </div>
      </section>

      {/* ============ SECTION 2: FEATURED TOOLS ============ */}
      <section className="featured">
        <div className="featured-head">
          <div>
            <div className="eyebrow">15 Tools · Three Stacks · One Workflow</div>
            <h2>
              The new <em>operating system</em>
              <br />
              for the curious.
            </h2>
          </div>
          <p>
            A handpicked breakdown of the tools we reach for daily — split by what they're good at, and what they let
            you ship faster.
          </p>
        </div>

        <div className="featured-grid" id="featuredGrid">
          {/* SITE category */}
          <article className="f-card">
            <div className="f-card-top">
              <div className="f-mini">C</div>
              <span className="f-tag">Site · LLM</span>
            </div>
            <h3>Claude</h3>
            <p>
              Long-form reasoning, careful writing, and large-context document work. Our default for nuanced thinking,
              not just answers.
            </p>
            <div className="url">
              claude.ai
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </article>

          <article className="f-card">
            <div className="f-card-top">
              <div className="f-mini">P</div>
              <span className="f-tag">Site · Search</span>
            </div>
            <h3>Perplexity</h3>
            <p>
              Search that cites its sources and writes you a summary. Use it for research where provenance matters more
              than vibes.
            </p>
            <div className="url">
              perplexity.ai
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </article>

          {/* LOGO category */}
          <article className="f-card">
            <div className="f-card-top">
              <div className="f-mini">P</div>
              <span className="f-tag">Logo · Brand</span>
            </div>
            <h3>Pencil</h3>
            <p>
              Generates ad creative and identity systems from a few prompts. Great for client pitches where you need 12
              directions by tomorrow.
            </p>
            <div className="url">
              pencil.ai
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </article>

          <article className="f-card">
            <div className="f-card-top">
              <div className="f-mini">A</div>
              <span className="f-tag">Logo · Copy</span>
            </div>
            <h3>AdCopy</h3>
            <p>
              Headline + tagline generation tuned for performance copy. Drop in a product and get angles you actually
              want to test.
            </p>
            <div className="url">
              adcopy.ai
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </article>

          {/* UI/UX category */}
          <article className="f-card">
            <div className="f-card-top">
              <div className="f-mini">D</div>
              <span className="f-tag">UI/UX · Sites</span>
            </div>
            <h3>Dora</h3>
            <p>
              3D animated websites without writing a line of code. The kind of frontend that used to take a team — built
              in a weekend.
            </p>
            <div className="url">
              dora.run
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </article>

          <article className="f-card">
            <div className="f-card-top">
              <div className="f-mini">D</div>
              <span className="f-tag">UI/UX · Landing</span>
            </div>
            <h3>Durable</h3>
            <p>
              Spins up a working business site in under a minute. Good for validation pages, MVPs, and "let me prove this
              idea" weekends.
            </p>
            <div className="url">
              durable.co
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </div>
          </article>
        </div>
      </section>

      {/* ============ SECTION 3: REINVENT CTA ============ */}
      <section className="cta-section">
        <div className="cta-inner">
          <div className="cta-tag">R&nbsp;E&nbsp;I&nbsp;N&nbsp;V&nbsp;E&nbsp;N&nbsp;T&nbsp;&nbsp;Y&nbsp;O&nbsp;U&nbsp;R&nbsp;S&nbsp;E&nbsp;L&nbsp;F</div>
          <h2>
            Stop reading lists.
            <br />
            <em>Start building.</em>
          </h2>
          <div className="cta-stats">
            <div className="cta-stat">
              <div className="num" data-count="15">
                <span>0</span>
              </div>
              <div className="lbl">Tools curated</div>
            </div>
            <div className="cta-stat">
              <div className="num" data-count="3">
                <span>0</span>
              </div>
              <div className="lbl">Stacks ready</div>
            </div>
            <div className="cta-stat">
              <div className="num" data-count="0">
                <span>0</span>
                <small>excuses</small>
              </div>
              <div className="lbl">Reasons to wait</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
