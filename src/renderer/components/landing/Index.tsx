import React, { useEffect } from 'react';
import { Navbar } from './Navbar';
import { HeroSection } from './HeroSection';

export interface LandingIndexProps {
  /** Triggered when the user dismisses the landing screen to enter the app */
  onLaunchApp?: () => void;
  /** Kept for back-compat with overlays; same behavior as onLaunchApp */
  onBackToChat?: () => void;
}

export const LandingIndex: React.FC<LandingIndexProps> = ({
  onLaunchApp,
  onBackToChat,
}) => {
  // Apply Sora to body when landing is mounted; restore on unmount
  useEffect(() => {
    document.body.classList.add('sentinel-mounted');
    return () => {
      document.body.classList.remove('sentinel-mounted');
    };
  }, []);

  const dismiss = onLaunchApp ?? onBackToChat;

  return (
    <div className="sentinel-root bg-background min-h-screen font-sora antialiased">
      <Navbar onLaunchApp={dismiss} />
      <HeroSection onLaunchApp={dismiss} />

      {/* Footer rail — small, editorial, matches the chat's quiet footer */}
      <footer
        className="relative z-10 px-6 md:px-10 lg:px-16 py-8 border-t border-foreground/10 bg-background/60"
        style={{ contain: 'layout paint' }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="text-foreground font-semibold">ATELIER.ai</span>
            <span className="text-foreground/30">·</span>
            <span>Editorial AI for thinking</span>
          </div>
          <div className="flex items-center gap-4">
            <span>© 2026</span>
            <span className="text-foreground/30">·</span>
            <span>Made with care</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
