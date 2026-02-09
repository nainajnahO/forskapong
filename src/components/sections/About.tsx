import { ABOUT_CONTENT } from '@/lib/constants';
import Container from '../common/Container';
import racketImg from '@/assets/racket.webp';
import ballImg from '@/assets/ball.webp';
import cupImg from '@/assets/cup.webp';
import { useTheme } from '@/contexts/ThemeContext';

interface AboutProps {
  id?: string;
}

export default function About({ id }: AboutProps) {
  const { theme } = useTheme();
  return (
    <section id={id} className="w-full py-20">
      <Container>
        {/* Section Label */}
        <div className="flex items-center gap-4 mb-12">
          <div className={`w-10 h-px transition-colors duration-500 ${theme === 'light' ? 'bg-gray-900' : 'bg-white'}`}></div>
          <span className="text-sm text-foreground font-sans tracking-wide transition-colors duration-500">Om Forskåpong</span>
        </div>

        {/* Heading */}
        <div className="mb-16">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-2 text-foreground transition-colors duration-500">
            {ABOUT_CONTENT.title}{' '}
            <span className="italic text-red-400">{ABOUT_CONTENT.titleHighlight}</span>
          </h1>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-16">
          {/* LEFT: Product Images (40% width) */}
          <div className="md:col-span-2 flex gap-6 justify-center items-end">
            {/* Ping-Pong Paddle */}
            <div className="flex flex-col items-center">
              <img
                src={racketImg}
                alt="Ping-pong paddle"
                className="w-24 h-32 object-contain"
              />
              <p className={`text-xs mt-4 text-center transition-colors duration-500 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Paddle</p>
            </div>

            {/* Ping-Pong Ball */}
            <div className="flex flex-col items-center">
              <img
                src={ballImg}
                alt="Ping-pong ball"
                className="w-32 h-32 object-contain"
              />
              <p className={`text-xs mt-4 transition-colors duration-500 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Ball</p>
            </div>

            {/* Red Solo Cup */}
            <div className="flex flex-col items-center">
              <img
                src={cupImg}
                alt="Red solo cup"
                className="w-20 h-24 object-contain"
              />
              <p className={`text-xs mt-4 text-center transition-colors duration-500 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>Cup</p>
            </div>
          </div>

          {/* RIGHT: Description Text (60% width) */}
          <div className="md:col-span-3 space-y-4">
            <p className={`font-sans leading-relaxed text-base transition-colors duration-500 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
              {ABOUT_CONTENT.description1}
            </p>
            <p className={`font-sans leading-relaxed text-base transition-colors duration-500 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
              {ABOUT_CONTENT.description2}
            </p>
          </div>
        </div>

        {/* Full-Width Image Placeholder */}
        <div className={`w-full h-96 rounded-2xl border flex items-center justify-center transition-colors duration-500 ${
          theme === 'light'
            ? 'bg-gradient-to-b from-gray-100 to-white border-gray-300'
            : 'bg-gradient-to-b from-gray-900 to-black border-gray-800'
        }`}>
          <div className="text-center">
            <div className={`w-24 h-24 mx-auto mb-4 rounded-lg flex items-center justify-center transition-colors duration-500 ${
              theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'
            }`}>
              <svg className={`w-12 h-12 transition-colors duration-500 ${theme === 'light' ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className={`text-sm font-sans transition-colors duration-500 ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'}`}>Event Photos Coming Soon</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
