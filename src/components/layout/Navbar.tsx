import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowUpRight, Flame, Waves } from 'lucide-react';
import logo from '../../assets/logo.webp';
import logoHdr from '../../assets/hdr/logo.avif';
import { NAV_LINKS, NAV_RESPONSIVE_OFFSETS } from '@/lib/constants';
import Container from '../common/Container';
import { useTheme } from '@/contexts/useTheme';
import { useScrollState } from '@/hooks/useScrollState';
import { useScrollToSection } from '@/hooks/useScrollToSection';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { cn } from '@/lib/utils';
import {
  SpringProvider,
  Spring,
  SpringElement,
  useSpring,
} from '@/components/animate-ui/primitives/animate/spring';

function NavbarEasterEgg({
  isScrolled,
  responsiveOffset,
}: {
  isScrolled: boolean;
  responsiveOffset: number;
}) {
  const { isDragging } = useSpring();
  const show = isDragging && isScrolled;

  return (
    <div
      className="absolute right-6 md:right-12 top-1/2 z-0 pointer-events-none flex items-center justify-between gap-3 pl-6 pr-2 py-2 rounded-full overflow-hidden"
      style={{
        transform: isScrolled
          ? `translateY(-50%) translateX(calc(-50vw + 50% + ${responsiveOffset}rem))`
          : 'translateY(-50%) translateX(0)',
        opacity: show ? 1 : 0,
        visibility: show ? 'visible' : 'hidden',
        willChange: 'transform, opacity, visibility',
        transition: show
          ? 'opacity 0.15s ease-out, visibility 0s, transform 0.7s ease-in-out'
          : 'opacity 0.4s ease-in, visibility 0s 0.4s, transform 0.7s ease-in-out',
      }}
    >
      <img
        src="/IMG_3365.jpeg"
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover object-[center_34%]"
      />
      {/* Invisible CTA replica to match exact dimensions */}
      <span className="invisible hidden lg:inline">Anmälan</span>
      <span className="invisible lg:hidden">Anmäl</span>
      <div className="w-10 h-10 -my-1 -mr-1 invisible flex-shrink-0" />
    </div>
  );
}

export default function Navbar() {
  const isScrolled = useScrollState(50);
  const viewportWidth = useViewportWidth();
  const [pillMetrics, setPillMetrics] = useState({ left: 0, width: 0 });
  const logoRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const { backgroundVariant, toggleBackground } = useTheme();
  const scrollToSection = useScrollToSection();

  // Calculate responsive offset based on viewport width
  const responsiveOffset = useMemo(() => {
    if (viewportWidth >= 1024) return NAV_RESPONSIVE_OFFSETS.desktop;
    if (viewportWidth >= 768) return NAV_RESPONSIVE_OFFSETS.tablet;
    if (viewportWidth >= 640) return NAV_RESPONSIVE_OFFSETS.phoneLg;
    return NAV_RESPONSIVE_OFFSETS.phoneSm;
  }, [viewportWidth]);

  // Calculate pill position and width based on actual element positions
  // Delay measurement to after the 700ms CSS transition completes
  useEffect(() => {
    if (isScrolled && logoRef.current && ctaRef.current && pillRef.current) {
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          if (logoRef.current && ctaRef.current && pillRef.current?.parentElement) {
            const logoRect = logoRef.current.getBoundingClientRect();
            const ctaRect = ctaRef.current.getBoundingClientRect();
            const containerRect = pillRef.current.parentElement.getBoundingClientRect();

            const pad = 10;
            const left = logoRect.left - containerRect.left - pad;
            const width = ctaRect.right - logoRect.left + pad * 2;

            setPillMetrics({ left: left / 16, width: width / 16 });
          }
        });
      }, 750);

      return () => clearTimeout(timeoutId);
    }
  }, [isScrolled, viewportWidth]);

  const handleTicketClick = useCallback(() => {
    scrollToSection('#tickets');
  }, [scrollToSection]);

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <SpringProvider dragElastic={0.15} transition={{ stiffness: 300, damping: 25 }}>
      {isScrolled && <Spring className="z-[60] text-white/20" />}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out',
          isScrolled ? 'py-3' : 'py-5',
        )}
        style={{ willChange: isScrolled ? 'auto' : 'transform' }}
      >
        <Container size="full" className="relative">
          {/* Hidden photo easter egg — revealed when the pill is dragged away */}
          <NavbarEasterEgg
            isScrolled={isScrolled}
            responsiveOffset={responsiveOffset}
          />
          <SpringElement
            drag={isScrolled}
            style={!isScrolled ? { cursor: 'default' } : undefined}
            className="relative flex items-center justify-between min-h-[3.75rem] select-none"
          >
            {/* Frosted Glass Pill Container - appears when scrolled */}
            <div
              ref={pillRef}
              className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 backdrop-blur-md ease-in-out duration-700"
              style={{
                transitionProperty: 'opacity, transform, height, left, width',
                opacity: isScrolled ? 1 : 0,
                transform: isScrolled ? 'translateY(-50%) scale(1)' : 'translateY(-50%) scale(0.9)',
                pointerEvents: 'none',
                zIndex: 0,
                height: isScrolled ? '3.75rem' : '0',
                left: isScrolled ? `${pillMetrics.left}rem` : '50%',
                width: isScrolled ? `${pillMetrics.width}rem` : '0',
              }}
            />

            {/* Logo - slides to center */}
            <div
              ref={logoRef}
              className="flex items-center transition-transform duration-700 ease-in-out relative z-10"
              style={{
                transform: isScrolled
                  ? `translateX(calc(50vw - 50% - ${responsiveOffset}rem))`
                  : 'translateX(0)',
                willChange: 'transform',
              }}
            >
              <a href="#" draggable={false} onClick={handleLogoClick}>
                <picture>
                  <source srcSet={logoHdr} media="(dynamic-range: high)" type="image/avif" />
                  <img
                    src={logo}
                    alt="Forsränningen Logo"
                    draggable={false}
                    className="h-9 lg:h-10 w-auto cursor-pointer"
                  />
                </picture>
              </a>
            </div>

            {/* Right: Nav Links and CTA Button */}
            <div className="flex items-center gap-4 relative z-10">
              {/* Nav Links (Desktop) */}
              <div
                className="hidden lg:flex items-center gap-2 transition-opacity duration-500 ease-in-out"
                style={{
                  opacity: isScrolled ? 0 : 1,
                  pointerEvents: isScrolled ? 'none' : 'auto',
                }}
              >
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => scrollToSection(link.href)}
                    className="px-4 py-2.5 text-white bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors backdrop-blur-sm"
                  >
                    <span className="hdr-white-fill">{link.label}</span>
                  </button>
                ))}
              </div>

              {/* Background Toggle Button */}
              <button
                onClick={toggleBackground}
                className="text-white hover:text-white/70 transition-all duration-500 ease-in-out"
                style={{
                  opacity: isScrolled ? 0 : 1,
                  pointerEvents: isScrolled ? 'none' : 'auto',
                  transform: isScrolled ? 'scale(0)' : 'scale(1)',
                  width: isScrolled ? 0 : 'auto',
                }}
                aria-label="Toggle background style"
              >
                {backgroundVariant === 'framer' ? (
                  <Flame className="w-5 h-5 hdr-white-icon" />
                ) : (
                  <Waves className="w-5 h-5 hdr-white-icon" />
                )}
              </button>

              {/* CTA Button - mobile: only when scrolled, desktop: always visible */}
              <button
                ref={ctaRef}
                onClick={handleTicketClick}
                className="flex items-center justify-between gap-3 pl-6 pr-2 py-2 bg-white hdr-bg-white text-black font-semibold rounded-full hover:bg-zinc-100 absolute lg:relative right-0 lg:right-auto"
                style={{
                  transform: isScrolled
                    ? `translateX(calc(-50vw + 50% + ${responsiveOffset}rem)) scale(1)`
                    : 'translateX(0) scale(1)',
                  willChange: 'transform, opacity',
                  opacity: viewportWidth >= 1024 ? 1 : isScrolled ? 1 : 0,
                  pointerEvents: viewportWidth >= 1024 ? 'auto' : isScrolled ? 'auto' : 'none',
                  transition:
                    viewportWidth >= 1024
                      ? 'all 0.7s ease-in-out'
                      : isScrolled
                        ? 'opacity 0.3s ease-in-out 0.2s, transform 0.7s ease-in-out'
                        : 'opacity 0.4s ease-in-out, transform 0s 0.4s',
                }}
              >
                <span className="hidden lg:inline">Anmälan</span>
                <span className="lg:hidden">Anmäl</span>
                <div className="w-10 h-10 -my-1 -mr-1 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0 hdr-dot-fill">
                  <ArrowUpRight className="w-6 h-6 text-white hdr-white-icon" />
                </div>
              </button>
            </div>
          </SpringElement>
        </Container>
      </nav>
    </SpringProvider>
  );
}
