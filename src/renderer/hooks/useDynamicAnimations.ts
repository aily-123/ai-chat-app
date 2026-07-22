import { useEffect, useRef, useState } from 'react';

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  delay?: number;
}

/**
 * Hook for triggering reveal animations on scroll.
 * Uses IntersectionObserver for native browser-level performance.
 *
 * @example
 * const { ref, isRevealed } = useScrollReveal({ threshold: 0.2 });
 * return <div ref={ref} className={`reveal-on-scroll ${isRevealed ? 'is-revealed' : ''}`}>...</div>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(options: UseScrollRevealOptions = {}) {
  const {
    threshold = 0.15,
    rootMargin = '0px 0px -10% 0px',
    once = true,
    delay = 0,
  } = options;

  const ref = useRef<T | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Fallback: if IntersectionObserver not supported, reveal immediately
    if (typeof IntersectionObserver === 'undefined') {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delay > 0) {
              window.setTimeout(() => setIsRevealed(true), delay);
            } else {
              setIsRevealed(true);
            }
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            setIsRevealed(false);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once, delay]);

  return { ref, isRevealed };
}

/**
 * Hook for tracking scroll position of a container.
 * Returns scroll percentage (0-100) for scroll progress bars.
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let rafId = 0;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight - element.clientHeight;
        const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        setProgress(Math.min(100, Math.max(0, pct)));
      });
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return { ref, progress };
}

/**
 * Hook for tracking mouse position relative to a container.
 * Used for magnetic effects, parallax, spotlight cursors.
 */
export function useMousePosition<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0, normalized: { x: 0, y: 0 } });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let rafId = 0;
    const handleMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const normalized = {
          x: (x / rect.width) * 2 - 1, // -1 to 1
          y: (y / rect.height) * 2 - 1,
        };
        setPosition({ x, y, normalized });
      });
    };

    const handleLeave = () => {
      setPosition({ x: 0, y: 0, normalized: { x: 0, y: 0 } });
    };

    element.addEventListener('mousemove', handleMove);
    element.addEventListener('mouseleave', handleLeave);
    return () => {
      element.removeEventListener('mousemove', handleMove);
      element.removeEventListener('mouseleave', handleLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return { ref, position };
}

/**
 * Hook for intersection-based re-trigger animations.
 * Returns true each time the element enters viewport.
 */
export function useIntersectionTrigger<T extends HTMLElement = HTMLDivElement>(options: UseScrollRevealOptions = {}) {
  const { threshold = 0.5 } = options;
  const ref = useRef<T | null>(null);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTrigger((t) => t + 1);
          }
        });
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, trigger };
}

/**
 * Hook for animating a numeric value with eased counter.
 */
export function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const startRef = useRef(target);
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    startRef.current = value;
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / duration, 1);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = startRef.current + (target - startRef.current) * eased;
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
