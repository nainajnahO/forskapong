import { useState, useEffect } from 'react';
import { ArrowUpRight, Sun, Moon } from 'lucide-react';
import logo from '../../assets/logo.webp';
import { NAV_LINKS } from '@/lib/constants';
import Container from '../common/Container';
import { useTheme } from '@/contexts/ThemeContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'py-3' : 'py-5'
      }`}
    >
      <Container size="full" className="flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center">
          <img
            src={logo}
            alt="Forsränningen Logo"
            className="h-10 w-auto"
          />
        </div>

        {/* Right: Nav Links and CTA Button */}
        <div className="flex items-center gap-4">
          {/* Nav Links (Desktop) */}
          <div className={`hidden lg:flex items-center gap-2 transition-opacity duration-300 ${isScrolled ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-300 backdrop-blur-sm"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          {/* CTA Button */}
          <button
            onClick={handleTicketClick}
            className="flex items-center justify-between gap-3 pl-6 pr-2 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-100 transition-colors"
          >
            <span>Anmäl Er</span>
            <div className="w-10 h-10 -my-1 -mr-1 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
          </button>
        </div>
      </Container>
    </nav>
  );
}
