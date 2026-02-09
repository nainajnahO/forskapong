import { useState, useEffect } from 'react';
import FluidBackground from '../common/FluidBackground';
import StaticNoise from '../common/StaticNoise';
import { EVENT_INFO, HERO_ROTATING_WORDS } from '@/lib/constants';

export default function Hero() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = HERO_ROTATING_WORDS[currentWordIndex];
    const typeSpeed = isDeleting ? 75 : 150;
    const pauseDuration = 2000;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing phase
        if (currentText.length < currentWord.length) {
          setCurrentText(currentWord.slice(0, currentText.length + 1));
        } else {
          // Word is complete, pause then start deleting
          setTimeout(() => setIsDeleting(true), pauseDuration);
        }
      } else {
        // Deleting phase
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1));
        } else {
          // Deletion complete, move to next word
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % HERO_ROTATING_WORDS.length);
        }
      }
    }, typeSpeed);

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex]);

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-black">
      {/* Animated Fluid Background */}
      <div className="absolute inset-0">
        <FluidBackground preset="Lava" />
      </div>

      {/* TV Static Noise Overlay */}
      <StaticNoise />

      {/* Content Container */}
      <div className="relative z-10 h-screen flex flex-col items-center justify-center px-6">
        {/* Main Title */}
        <h1 className="text-5xl md:text-[6.5rem] font-display text-white uppercase tracking-wider text-center mb-4 px-1">
          {EVENT_INFO.name}
        </h1>

        {/* Typewriter Text Section */}
        <div className="text-center mb-20">
          <div className="text-2xl md:text-4xl text-white">
            <span>Ta med dig </span>
            <span className="font-display text-red-500">
              {currentText}
              <span className="animate-pulse">|</span>
            </span>
          </div>
        </div>

        {/* Bottom Info Bar */}
        <div className="absolute bottom-20 left-0 right-0 px-10">
          <div className="flex items-center gap-6 max-w-full">
            {/* Left: Date */}
            <span className="text-white text-sm md:text-base font-light whitespace-nowrap">
              {EVENT_INFO.date}
            </span>

            {/* Center: Divider Line */}
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

            {/* Right: Location */}
            <span className="text-white text-sm md:text-base font-light whitespace-nowrap">
              {EVENT_INFO.location}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
