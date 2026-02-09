import { useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';
import logo from '../../assets/logo.webp';
import { NAV_LINKS } from '@/lib/constants';
import Container from '../common/Container';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

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
        isScrolled
          ? 'bg-black/40 backdrop-blur-md py-3'
          : 'bg-black/20 backdrop-blur-sm py-5'
      }`}
    >
      <Container size="full" className="flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center">
          <img
            src={logo}
            alt="Forsränningen Logo"
            className="h-11 w-auto"
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
                className="px-4 py-2 text-white bg-white/10 rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>

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
