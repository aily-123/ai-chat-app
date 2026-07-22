import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface KeyboardShineProps {
  /** Container className to identify which element receives the shine */
  className?: string;
  /** Shine color (default: accent gold) */
  color?: string;
  /** Shine size in pixels (default: 120px) */
  size?: number;
  /** Maximum opacity (0-1) */
  maxOpacity?: number;
  /** Trail length — number of afterimages to keep (default: 6) */
  trailLength?: number;
  /** Trail decay rate (0-1, default: 0.7) */
  trailDecay?: number;
  /** Smoothing factor 0-1: higher = snappier, lower = smoother (default: 0.18) */
  smoothing?: number;
  /** Enable shine effect (default: true) */
  enabled?: boolean;
  /** CSS selector for child elements that should "light up" when shine crosses them */
  childSelector?: string;
}

/**
 * KeyboardShine — a sophisticated mouse-following shine effect for keyboard hints.
 *
 * Architecture:
 * 1. A radial gradient overlay follows the cursor with smooth interpolation
 * 2. A trail of fading afterimages creates the "swipe" effect
 * 3. Each kbd child element is independently lit when the shine crosses it
 * 4. All updates use rAF + CSS variables — zero React re-renders
 * 5. Touch / non-mouse devices gracefully fall back to a static glow
 */
export const KeyboardShine: React.FC<KeyboardShineProps> = ({
  className = '',
  color = 'var(--accent)',
  size = 120,
  maxOpacity = 0.35,
  trailLength = 6,
  trailDecay = 0.7,
  smoothing = 0.18,
  enabled = true,
  childSelector = 'kbd',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const trailRefs = useRef<HTMLDivElement[]>([]);
  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const trail = useRef<Array<{ x: number; y: number; opacity: number }>>([]);
  const rafId = useRef(0);
  const isInside = useRef(false);

  // Initialize trail positions
  useEffect(() => {
    trail.current = Array.from({ length: trailLength }, () => ({
      x: 0,
      y: 0,
      opacity: 0,
    }));
  }, [trailLength]);

  // Mouse move handler
  const handleMove = useCallback(
    (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      targetPos.current.x = e.clientX - rect.left;
      targetPos.current.y = e.clientY - rect.top;
      isInside.current = true;
    },
    []
  );

  const handleEnter = useCallback(() => {
    isInside.current = true;
  }, []);

  const handleLeave = useCallback(() => {
    isInside.current = false;
  }, []);

  // Touch / pointer fallback
  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('mousemove', handleMove, { passive: true });
    el.addEventListener('mouseenter', handleEnter);
    el.addEventListener('mouseleave', handleLeave);
    // Pointer events for hybrid devices
    el.addEventListener('pointermove', handleMove as EventListener, { passive: true });

    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('mouseenter', handleEnter);
      el.removeEventListener('mouseleave', handleLeave);
      el.removeEventListener('pointermove', handleMove as EventListener);
    };
  }, [enabled, handleMove, handleEnter, handleLeave]);

  // Animation loop — uses rAF for 60fps, updates CSS vars
  useEffect(() => {
    if (!enabled) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const tick = () => {
      // Smooth interpolation (lerp)
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * smoothing;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * smoothing;

      // Push new trail point
      if (isInside.current) {
        trail.current.unshift({
          x: currentPos.current.x,
          y: currentPos.current.y,
          opacity: 1,
        });
        if (trail.current.length > trailLength) {
          trail.current.length = trailLength;
        }
      }

      // Decay trail
      trail.current.forEach((p, i) => {
        if (i > 0) p.opacity *= trailDecay;
      });

      // Update overlay
      const x = currentPos.current.x;
      const y = currentPos.current.y;
      const baseOpacity = isInside.current ? maxOpacity : 0;
      overlay.style.setProperty('--shine-x', `${x}px`);
      overlay.style.setProperty('--shine-y', `${y}px`);
      overlay.style.setProperty('--shine-opacity', `${baseOpacity}`);

      // Update trail
      trailRefs.current.forEach((el, i) => {
        const point = trail.current[i];
        if (!el || !point) return;
        el.style.transform = `translate(${point.x - size / 4}px, ${point.y - size / 4}px)`;
        const trailOpacity = isInside.current ? maxOpacity * Math.pow(trailDecay, i) * 0.6 : 0;
        el.style.opacity = `${trailOpacity}`;
      });

      // Light up child kbd elements
      const container = containerRef.current;
      if (container) {
        const children = container.querySelectorAll<HTMLElement>(childSelector);
        children.forEach((child) => {
          const childRect = child.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const cx = childRect.left + childRect.width / 2 - containerRect.left;
          const cy = childRect.top + childRect.height / 2 - containerRect.top;
          const dx = cx - currentPos.current.x;
          const dy = cy - currentPos.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = size * 1.5;
          const t = Math.max(0, 1 - dist / maxDist);
          const easeT = t * t * (3 - 2 * t); // smoothstep
          child.style.setProperty('--kbd-glow', `${easeT * maxOpacity * 1.5}`);
        });
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [enabled, maxOpacity, size, smoothing, trailDecay, trailLength, childSelector]);

  // Respect prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const shouldRender = enabled && !reducedMotion;

  return (
    <div ref={containerRef} className={`keyboard-shine-host ${className}`}>
      {/* Trail layer — older points behind current position */}
      {shouldRender && (
        <div className="keyboard-shine-trail" aria-hidden="true">
          {Array.from({ length: trailLength }).map((_, i) => (
            <div
              key={i}
              ref={(el) => {
                if (el) trailRefs.current[i] = el;
              }}
              className="keyboard-shine-dot"
              style={{
                width: `${size / 2}px`,
                height: `${size / 2}px`,
                background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                willChange: 'transform, opacity',
              }}
            />
          ))}
        </div>
      )}

      {/* Main shine overlay — radial gradient following cursor */}
      <div
        ref={overlayRef}
        className="keyboard-shine-overlay"
        aria-hidden="true"
        style={{
          background: `radial-gradient(circle ${size}px at var(--shine-x, 50%) var(--shine-y, 50%), ${color} 0%, transparent 70%)`,
          opacity: shouldRender ? 'var(--shine-opacity, 0)' : 0,
        }}
      />

      {/* Children */}
      <div className="keyboard-shine-content">{/* slot */}</div>
    </div>
  );
};

/**
 * Wrap any kbd elements with this to enable automatic per-key lighting.
 * Listens to mouseover events at the container level, computes distance to each
 * kbd, and animates a glow via CSS variables — no re-renders.
 */
export interface KbdGlowGroupProps {
  children: React.ReactNode;
  className?: string;
  /** Selector for elements to light up (default: kbd) */
  childSelector?: string;
  /** Maximum glow opacity (0-1, default: 0.5) */
  maxGlow?: number;
  /** Shine color (default: var(--accent)) */
  color?: string;
  /** Reach distance in pixels (default: 100) */
  reach?: number;
  /** Trail / lag: 0 = snappy, 1 = very smooth (default: 0.25) */
  smoothing?: number;
}

export const KbdGlowGroup: React.FC<KbdGlowGroupProps> = ({
  children,
  className = '',
  childSelector = 'kbd',
  maxGlow = 0.5,
  color,
  reach = 100,
  smoothing = 0.25,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const targetPos = useRef({ x: -9999, y: -9999 });
  const currentPos = useRef({ x: -9999, y: -9999 });
  const rafId = useRef(0);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Capture resolved color from CSS variable if not provided
  const resolvedColor = useRef<string>(color || '');
  useEffect(() => {
    if (color) {
      resolvedColor.current = color;
      return;
    }
    const probe = document.createElement('div');
    probe.style.color = 'var(--accent)';
    document.body.appendChild(probe);
    const cs = window.getComputedStyle(probe).color;
    document.body.removeChild(probe);
    resolvedColor.current = cs;
  }, [color]);

  // Animation loop
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const tick = () => {
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * smoothing;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * smoothing;

      const container = containerRef.current;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const cx = currentPos.current.x - containerRect.left;
        const cy = currentPos.current.y - containerRect.top;
        const overlay = overlayRef.current;
        if (overlay) {
          overlay.style.setProperty('--shine-x', `${cx}px`);
          overlay.style.setProperty('--shine-y', `${cy}px`);
        }

        const children = container.querySelectorAll<HTMLElement>(childSelector);
        children.forEach((child) => {
          const rect = child.getBoundingClientRect();
          const childCx = rect.left + rect.width / 2 - containerRect.left;
          const childCy = rect.top + rect.height / 2 - containerRect.top;
          const dx = childCx - cx;
          const dy = childCy - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const t = Math.max(0, 1 - dist / reach);
          const easeT = t * t * (3 - 2 * t);
          const glow = easeT * maxGlow;
          child.style.setProperty('--kbd-glow', `${glow}`);
        });
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [childSelector, maxGlow, reach, smoothing]);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    targetPos.current.x = e.clientX;
    targetPos.current.y = e.clientY;
  }, []);

  const handleLeave = useCallback(() => {
    targetPos.current.x = -9999;
    targetPos.current.y = -9999;
  }, []);

  return (
    <div
      ref={containerRef}
      className={`kbd-glow-group ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div
        ref={overlayRef}
        className="kbd-glow-overlay"
        aria-hidden="true"
        style={{
          background: `radial-gradient(circle 100px at var(--shine-x, 50%) var(--shine-y, 50%), ${resolvedColor.current || 'var(--accent)'} 0%, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
};
