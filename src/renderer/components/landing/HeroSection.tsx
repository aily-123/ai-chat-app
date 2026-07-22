import React, { useEffect, useState } from 'react';

export interface HeroSectionProps {
  /** Handler when the user wants to leave the landing page and open the app */
  onLaunchApp?: () => void;
}

/**
 * Stagger helper — each child gets a different delay based on its index.
 * Uses CSS transitions triggered by a state change (not keyframe animations).
 */
const useStagger = (count: number, stepMs = 90) => {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 30);
    return () => window.clearTimeout(t);
  }, []);
  return (i: number): React.CSSProperties => ({
    transitionDelay: `${i * stepMs}ms`,
    opacity: shown ? 1 : 0,
    transform: shown ? 'translateY(0)' : 'translateY(10px)',
  });
};

/* A single image cell with optional rotation and label. */
const Photo: React.FC<{
  src: string;
  alt: string;
  rotate?: number;
  plate?: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ src, alt, rotate = 0, plate, label, className = '', style }) => (
  <figure
    className={`relative overflow-hidden rounded-sm bg-foreground/5 shadow-[0_24px_50px_-25px_rgba(21,17,13,0.4)] ${className}`}
    style={{
      transform: `translateZ(0) rotate(${rotate}deg)`,
      willChange: 'transform',
      ...style,
    }}
  >
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 w-full h-full object-cover"
    />
    {/* Subtle dark gradient for label readability */}
    <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    {/* Top-left plate tag */}
    {plate && (
      <figcaption className="absolute top-2.5 left-2.5 px-1.5 py-0.5 bg-background/85 backdrop-blur-sm border border-foreground/15 rounded-sm">
        <span className="text-[8px] tracking-[0.3em] uppercase text-foreground/80 font-medium">
          {plate}
        </span>
      </figcaption>
    )}
    {/* Bottom-right label */}
    {label && (
      <figcaption className="absolute bottom-2 right-2.5">
        <span className="text-[8px] tracking-[0.3em] uppercase text-white/95 [text-shadow:0_1px_3px_rgba(0,0,0,0.6)] font-medium">
          {label}
        </span>
      </figcaption>
    )}
  </figure>
);

export const HeroSection: React.FC<HeroSectionProps> = ({ onLaunchApp }) => {
  const styleFor = useStagger(6);

  return (
    <section
      id="top"
      className="relative min-h-screen overflow-hidden pt-28 md:pt-32 pb-16 md:pb-24"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '100vh' }}
    >
      {/* ============================================================
          IMAGE BENTO — right side, asymmetric grid layout.
          Grid: 2 columns × 3 rows
            [ img-1 (tall)  ] [ img-2 ]
            [ spans 2 rows  ] [-------]
            [                ] [ img-3 ]
            [----------------][-------]
            [   img-4 (wide)         ]
            [   spans 2 columns      ]
          ============================================================ */}
      <div
        className="hidden md:grid absolute right-6 lg:right-10 top-28 w-[44vw] max-w-[560px] grid-cols-2 gap-3 pointer-events-none"
        style={{
          height: 'min(70vh, 640px)',
          gridTemplateRows: '1.4fr 1fr 0.65fr',
          contain: 'layout paint',
        }}
        aria-hidden
      >
        {/* Tall primary image — visual anchor, 2 rows tall */}
        <Photo
          src="/images/img-1.jpg"
          alt="A quiet desk with notebook and warm light"
          plate="Plate N° 01"
          label="The Studio"
          rotate={-1.2}
          className="col-start-1 row-start-1 row-span-2"
        />

        {/* Secondary image — top-right, small square */}
        <Photo
          src="/images/img-2.jpg"
          alt="Open book pages with text"
          plate="N° 02"
          label="Library"
          rotate={1.8}
          className="col-start-2 row-start-1"
        />

        {/* Tertiary image — middle-right, small square */}
        <Photo
          src="/images/img-3.jpg"
          alt="Detail of writing instruments"
          plate="N° 03"
          label="Specimen"
          rotate={-1.5}
          className="col-start-2 row-start-2"
        />

        {/* Wide bottom image — spans full width, anchors composition */}
        <Photo
          src="/images/img-4.jpg"
          alt="A spread of curated notebooks and tools"
          plate="N° 04"
          label="Atelier"
          rotate={0.6}
          className="col-start-1 row-start-3 col-span-2"
        />
      </div>

      {/* Mobile: simple 2x2 grid (no rotation, tighter) */}
      <div
        className="md:hidden grid grid-cols-2 gap-2 px-6 mb-8"
        aria-hidden
      >
        <Photo src="/images/img-1.jpg" alt="" plate="N° 01" className="aspect-[3/4]" />
        <Photo src="/images/img-2.jpg" alt="" plate="N° 02" className="aspect-square" />
        <Photo src="/images/img-3.jpg" alt="" plate="N° 03" className="aspect-square" />
        <Photo src="/images/img-4.jpg" alt="" plate="N° 04" className="aspect-[3/4]" />
      </div>

      {/* Top-left page indicator */}
      <div
        className="hidden md:flex absolute top-24 left-6 md:left-10 lg:left-16 items-baseline gap-2 text-foreground/55"
        aria-hidden
      >
        <span className="text-[10px] tracking-[0.3em] uppercase">Index</span>
        <span className="text-[10px] tracking-[0.3em] uppercase text-foreground/30">
          ·
        </span>
        <span className="text-[10px] tracking-[0.3em] uppercase">Cover</span>
      </div>

      {/* Marginalia — "live" tag floating near the bento */}
      <div
        className="hidden lg:flex absolute top-24 right-[44vw] mr-3 items-center gap-2 px-2.5 py-1 bg-background border border-foreground/15 rounded-sm shadow-sm"
        aria-hidden
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[9px] tracking-[0.3em] uppercase text-foreground/70">
          Specimen&nbsp;·&nbsp;Live
        </span>
      </div>

      {/* Bottom hairline — anchors the section's baseline */}
      <div
        className="absolute left-6 right-6 md:left-10 md:right-10 bottom-12 h-px bg-foreground/10"
        aria-hidden
      />

      {/* ============================================================
          CONTENT — bottom-left, editorial column.
          Default opacity 1 — text is always visible.
          ============================================================ */}
      <div className="relative z-30 w-full max-w-[88%] sm:max-w-md md:max-w-lg lg:max-w-xl px-6 md:px-10 lg:px-16 mt-auto pt-20 md:pt-28">
        {/* Eyebrow */}
        <p
          className="text-muted-foreground text-[11px] tracking-[0.4em] uppercase mb-4 md:mb-6 transition-all duration-700 ease-out"
          style={styleFor(0)}
        >
          <span className="inline-block w-6 align-middle sentinel-hairline mr-3" />
          An AI conversation studio
        </p>

        {/* Headline */}
        <h1
          className="text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-foreground mb-3 md:mb-5 transition-all duration-700 ease-out"
          style={styleFor(1)}
        >
          ATELIER<span className="text-primary">.ai</span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-foreground/85 text-[clamp(1rem,2.2vw,1.5rem)] font-light leading-snug mb-3 md:mb-5 transition-all duration-700 ease-out"
          style={styleFor(2)}
        >
          A quieter, more deliberate way to think with machines.
        </p>

        {/* Description */}
        <p
          className="text-muted-foreground text-[clamp(0.875rem,1.3vw,1.0625rem)] font-light leading-relaxed mb-6 md:mb-8 max-w-md transition-all duration-700 ease-out"
          style={styleFor(3)}
        >
          Curated characters. Long-form memory. A writing-first interface
          designed for thinking — not scrolling.
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-wrap items-center gap-3 font-medium transition-all duration-700 ease-out"
          style={styleFor(4)}
        >
          <button
            type="button"
            onClick={onLaunchApp}
            className="bg-primary text-primary-foreground px-7 py-3.5 text-sm rounded-sm cursor-pointer hover:brightness-110 transition-all active:scale-[0.97] tracking-wide"
          >
            Enter the Studio
          </button>
          <button
            type="button"
            onClick={onLaunchApp}
            className="text-foreground px-6 py-3.5 text-sm rounded-sm cursor-pointer border border-foreground/20 hover:border-foreground/60 transition-all active:scale-[0.97] tracking-wide"
          >
            Browse Characters
          </button>
        </div>

        {/* Trust line */}
        <p
          className="text-muted-foreground/70 text-[11px] font-light mt-5 md:mt-7 tracking-[0.18em] uppercase transition-all duration-700 ease-out"
          style={styleFor(5)}
        >
          <span className="text-foreground/70">N°&nbsp;01</span>
          <span className="mx-2 text-foreground/30">·</span>
          Editorial AI for writers &amp; researchers
          <span className="mx-2 text-foreground/30">·</span>
          12 curated voices
        </p>
      </div>
    </section>
  );
};
