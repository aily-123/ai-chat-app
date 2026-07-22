import React, { useEffect, useRef, useState } from 'react';

export type RevealVariant = 'block' | 'scale' | 'from-left' | 'from-right' | 'stagger';

export interface ScrollRevealProps {
  /** Variant of reveal animation */
  variant?: RevealVariant;
  /** Threshold (0-1) for IntersectionObserver */
  threshold?: number;
  /** Root margin for IntersectionObserver (e.g. '50px') */
  rootMargin?: string;
  /** Delay in ms before applying reveal */
  delay?: number;
  /** Trigger only once */
  once?: boolean;
  /** ClassName to merge with the reveal class */
  className?: string;
  /** Render as a specific element */
  as?: keyof JSX.IntrinsicElements;
  /** Children */
  children: React.ReactNode;
  /** Style override */
  style?: React.CSSProperties;
}

/**
 * ScrollReveal — A wrapper that applies scroll-triggered reveal animations.
 *
 * Uses IntersectionObserver for performance. Falls back to immediate
 * reveal for users with prefers-reduced-motion.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  variant = 'block',
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  delay = 0,
  once = true,
  className = '',
  as: Tag = 'div',
  children,
  style,
}) => {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respect reduced motion preference — reveal immediately
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setRevealed(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delay > 0) {
              setTimeout(() => setRevealed(true), delay);
            } else {
              setRevealed(true);
            }
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setRevealed(false);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, delay, once]);

  const variantClass = `reveal-${variant}`;
  const finalClass = [
    variantClass,
    revealed ? 'is-revealed' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return React.createElement(
    Tag,
    { ref, className: finalClass, style },
    children
  );
};
