import { useState, useEffect, useRef } from 'react';
import { ArrowUpRight, Sun, Moon, Menu, X } from 'lucide-react';
import logo from '../../assets/logo.webp';
import { NAV_LINKS } from '@/lib/constants';
import Container from '../common/Container';
import { useTheme } from '@/contexts/ThemeContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [pillWidth, setPillWidth] = useState(19);
  const logoRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Calculate responsive offset based on viewport width
  const getResponsiveOffset = () => {
    if (viewportWidth >= 1024) return 9.5; // Desktop
    if (viewportWidth >= 768) return 8; // Tablet landscape
    if (viewportWidth >= 640) return 7; // Large phone landscape
    return 6.5; // Small phone portrait
  };

  // Calculate pill width based on actual element widths
  useEffect(() => {
    if (isScrolled && logoRef.current && ctaRef.current) {
      // Wait for animation to complete (700ms) before measuring
      const timer = setTimeout(() => {
        if (logoRef.current && ctaRef.current) {
          const logoRect = logoRef.current.getBoundingClientRect();
          const ctaRect = ctaRef.current.getBoundingClientRect();

          // Raw distance from logo left edge to CTA right edge
          const totalWidth = ctaRect.right - logoRect.left;
          const padding = 20; // Slight padding (6px logo side, 5px CTA side)

          setPillWidth((totalWidth + padding) / 16); // Convert to rem
        }
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [isScrolled, viewportWidth]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleNavClick = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTicketClick = () => {
    const ticketsSection = document.querySelector('#tickets');
    if (ticketsSection) {
      ticketsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
          isScrolled ? 'py-3' : 'py-5'
        }`}
        style={{ willChange: isScrolled ? 'auto' : 'transform' }}
      >
        <Container size="full" className="relative flex items-center justify-between min-h-[3.75rem]">
          {/* Frosted Glass Pill Container - appears when scrolled */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 backdrop-blur-md transition-all duration-700 ease-in-out"
            style={{
              opacity: isScrolled ? 1 : 0,
              transform: isScrolled
                ? 'translate(-50%, -50%) scale(1)'
                : 'translate(-50%, -50%) scale(0.9)',
              pointerEvents: 'none',
              zIndex: 0,
              height: isScrolled ? '3.75rem' : '0',
              width: isScrolled ? `${pillWidth}rem` : '0',
            }}
          />

          {/* Logo - slides to center */}
          <div
            ref={logoRef}
            className="flex items-center transition-transform duration-700 ease-in-out relative z-10"
            style={{
              transform: isScrolled
                ? `translateX(calc(50vw - 50% - ${getResponsiveOffset()}rem))`
                : 'translateX(0)',
              willChange: 'transform',
            }}
          >
            <img
              src={logo}
              alt="Forsränningen Logo"
              className="h-9 lg:h-10 w-auto"
            />
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
                  onClick={() => handleNavClick(link.href)}
                  className="px-4 py-2.5 text-white bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Theme Toggle Button (Desktop) */}
            <button
              onClick={toggleTheme}
              className="hidden lg:block p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-500 ease-in-out backdrop-blur-sm"
              style={{
                opacity: isScrolled ? 0 : 1,
                pointerEvents: isScrolled ? 'none' : 'auto',
                transform: isScrolled ? 'scale(0)' : 'scale(1)',
                width: isScrolled ? 0 : 'auto',
              }}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>

            {/* CTA Button - mobile: only when scrolled, desktop: always visible */}
            <button
              ref={ctaRef}
              onClick={handleTicketClick}
              className="flex items-center justify-between gap-3 pl-6 pr-2 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-100 absolute lg:relative right-0 lg:right-auto"
              style={{
                transform: isScrolled
                  ? `translateX(calc(-50vw + 50% + ${getResponsiveOffset()}rem)) scale(1)`
                  : 'translateX(0) scale(1)',
                willChange: 'transform, opacity',
                opacity: viewportWidth >= 1024 ? 1 : (isScrolled ? 1 : 0),
                pointerEvents: viewportWidth >= 1024 ? 'auto' : (isScrolled ? 'auto' : 'none'),
                transition: viewportWidth >= 1024
                  ? 'all 0.7s ease-in-out'
                  : isScrolled
                    ? 'opacity 0.3s ease-in-out 0.2s, transform 0.7s ease-in-out'
                    : 'opacity 0.4s ease-in-out, transform 0s 0.4s',
              }}
            >
              <span className="hidden lg:inline">Anmäl Er</span>
              <span className="lg:hidden">Anmäl</span>
              <div className="w-10 h-10 -my-1 -mr-1 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowUpRight className="w-6 h-6 text-white" />
              </div>
            </button>

            {/* Mobile Menu Button - visible on mobile when not scrolled, rightmost position */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
              style={{
                opacity: isScrolled ? 0 : 1,
                pointerEvents: isScrolled ? 'none' : 'auto',
                transform: isScrolled ? 'scale(0)' : 'scale(1)',
                width: isScrolled ? 0 : 'auto',
                transition: 'all 0.3s ease-in-out',
              }}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </Container>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="fixed top-20 left-0 right-0 z-40 lg:hidden">
          <Container size="full">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 space-y-4">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    handleNavClick(link.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-3 text-white bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors backdrop-blur-sm"
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => {
                  toggleTheme();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-between w-full px-4 py-3 text-white bg-white/20 rounded-full text-sm hover:bg-white/30 transition-colors backdrop-blur-sm"
              >
                <span>Theme</span>
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => {
                  handleTicketClick();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-between w-full gap-3 pl-6 pr-2 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
              >
                <span>Anmäl Er</span>
                <div className="w-10 h-10 -my-1 -mr-1 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <ArrowUpRight className="w-6 h-6 text-white" />
                </div>
              </button>
            </div>
          </Container>
        </div>
      )}
    </>
  );
}
