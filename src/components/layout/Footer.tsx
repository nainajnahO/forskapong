import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { SOCIAL_LINKS, FOOTER_LINKS } from '@/lib/constants';
import Container from '../common/Container';

export default function Footer() {
  const handleLinkClick = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-black text-white">
      {/* Row 1: Social and Links */}
      <div className="border-b border-zinc-800 py-8">
        <Container className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Left: Social Section */}
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
              Social
            </span>
            <div className="flex gap-4">
              <a
                href={SOCIAL_LINKS.facebook}
                className="text-white hover:text-red-600 transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={24} />
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                className="text-white hover:text-red-600 transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={24} />
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                className="text-white hover:text-red-600 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={24} />
              </a>
              <a
                href={SOCIAL_LINKS.twitter}
                className="text-white hover:text-red-600 transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={24} />
              </a>
            </div>
          </div>

          {/* Right: Navigation Links */}
          <div className="flex flex-wrap gap-4">
            {FOOTER_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleLinkClick(link.href)}
                className="px-4 py-2 border border-zinc-700 rounded-full text-sm font-medium text-white hover:border-red-600/50 hover:text-red-600 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>
        </Container>
      </div>

      {/* Row 2: Copyright and Credits */}
      <div className="py-8">
        <Container className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Left: Copyright */}
          <div className="flex flex-col gap-2 text-xs text-zinc-500">
            <div>© 2026 Forskåpong. All rights reserved.</div>
          </div>

          {/* Right: Credits */}
          <div className="text-xs text-zinc-500">
            Made with ❤️ by Forskå
          </div>
        </Container>
      </div>
    </footer>
  );
}
