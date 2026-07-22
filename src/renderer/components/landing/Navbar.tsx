import React from 'react';
import { Button } from '../ui/button';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Voices', href: '#voices' },
  { label: 'Studio', href: '#studio' },
  { label: 'Journal', href: '#journal' },
  { label: 'Contact', href: '#contact' },
] as const;

export interface NavbarProps {
  /** Handler when the user wants to leave the landing page and open the app */
  onLaunchApp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLaunchApp }) => {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 lg:px-16 py-5 bg-background/85 backdrop-blur-sm border-b border-foreground/10"
      style={{ contain: 'layout paint', willChange: 'transform' }}
      role="navigation"
      aria-label="Primary"
    >
      {/* Left — Brand mark */}
      <a
        href="#top"
        className="flex items-baseline gap-2 group"
        aria-label="ATELIER.ai"
      >
        <span className="text-foreground text-lg font-semibold tracking-[-0.02em]">
          ATELIER
        </span>
        <span className="text-primary text-lg font-light tracking-tight">.ai</span>
      </a>

      {/* Middle — Nav links (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.2em]"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Right — Enter CTA (hidden on mobile) */}
      <Button
        variant="navCta"
        size="lg"
        onClick={onLaunchApp}
        className="hidden md:inline-flex rounded-sm uppercase text-[11px] tracking-[0.2em] px-6"
      >
        Enter Studio
      </Button>

      {/* Mobile: Simple Enter button */}
      <button
        onClick={onLaunchApp}
        className="md:hidden text-xs uppercase tracking-[0.2em] text-primary font-medium px-3 py-1.5 rounded-sm border border-primary/30 hover:bg-primary/5 active:scale-[0.97] transition-all"
      >
        Enter
      </button>
    </nav>
  );
};
