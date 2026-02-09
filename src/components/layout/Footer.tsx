import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { SOCIAL_LINKS, FOOTER_LINKS } from '@/lib/constants';
import Container from '../common/Container';
import MediaBetweenText from '../common/MediaBetweenText';
import { useTheme } from '@/contexts/ThemeContext';

export default function Footer() {
  const { theme } = useTheme();
  const handleLinkClick = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-background text-foreground transition-colors duration-500">
      {/* Row 1: Social and Links */}
      <div className={`border-b py-8 transition-colors duration-500 ${theme === 'light' ? 'border-zinc-200' : 'border-zinc-800'}`}>
        <Container className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Left: Social Section */}
          <div className="flex items-center gap-6">
            <span className={`text-sm font-semibold uppercase tracking-widest transition-colors duration-500 ${theme === 'light' ? 'text-zinc-600' : 'text-zinc-400'}`}>
              Social
            </span>
            <div className="flex gap-4">
              <a
                href={SOCIAL_LINKS.facebook}
                className="text-foreground hover:text-red-600 transition-colors"
                aria-label="Facebook"
              >
                <Facebook size={24} />
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                className="text-foreground hover:text-red-600 transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={24} />
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                className="text-foreground hover:text-red-600 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin size={24} />
              </a>
              <a
                href={SOCIAL_LINKS.twitter}
                className="text-foreground hover:text-red-600 transition-colors"
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
                className={`px-4 py-2 border rounded-full text-sm font-medium transition-colors ${
                  theme === 'light'
                    ? 'border-zinc-300 text-gray-900 hover:border-red-600/50 hover:text-red-600'
                    : 'border-zinc-700 text-white hover:border-red-600/50 hover:text-red-600'
                }`}
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
          <div className={`text-xs transition-colors duration-500 ${theme === 'light' ? 'text-zinc-600' : 'text-zinc-500'}`}>
            <MediaBetweenText
              firstText="Made with "
              secondText=" by Forskå"
              mediaUrl="https://images.unsplash.com/photo-1574096079513-d8259312b785?w=200&h=80&fit=crop"
              mediaType="image"
              alt="Beer pong celebration"
              className="items-center justify-center gap-1"
              leftTextClassName={theme === 'light' ? 'text-zinc-600' : 'text-zinc-500'}
              rightTextClassName={theme === 'light' ? 'text-zinc-600' : 'text-zinc-500'}
              mediaContainerClassName="h-5 rounded overflow-hidden"
            />
          </div>
        </Container>
      </div>
    </footer>
  );
}
