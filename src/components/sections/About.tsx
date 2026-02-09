import { ABOUT_CONTENT } from '@/lib/constants';
import Container from '../common/Container';

interface AboutProps {
  id?: string;
}

export default function About({ id }: AboutProps) {
  return (
    <section id={id} className="w-full py-20">
      <Container>
        {/* Section Label */}
        <div className="flex items-center gap-4 mb-12">
          <div className="w-10 h-px bg-white"></div>
          <span className="text-sm text-white font-sans tracking-wide">Om Forskåpong</span>
        </div>

        {/* Heading */}
        <div className="mb-16">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-2">
            {ABOUT_CONTENT.title}{' '}
            <span className="italic text-red-400">{ABOUT_CONTENT.titleHighlight}</span>
          </h1>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-16">
          {/* LEFT: Product Images (40% width) */}
          <div className="md:col-span-2 flex gap-6 justify-center items-end">
            {/* Red Ping-Pong Paddle */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-32 bg-red-600 rounded-3xl flex items-center justify-center shadow-lg relative">
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-red-700 rounded-full"></div>
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center">Paddle</p>
            </div>

            {/* Orange Ping-Pong Ball with Text */}
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg">
                <div className="absolute w-20 h-8 bg-black rounded-full opacity-20"></div>
                <span className="text-white font-bold text-xs text-center font-sans z-10">
                  40+ PONGORI
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-4">Ball</p>
            </div>

            {/* Red Solo Cup */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-24 bg-red-500 rounded-b-2xl shadow-lg relative">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-2 bg-red-600 rounded-full"></div>
                <div className="absolute top-8 left-2 right-2 h-0.5 bg-red-400 opacity-50"></div>
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center">Cup</p>
            </div>
          </div>

          {/* RIGHT: Description Text (60% width) */}
          <div className="md:col-span-3 space-y-4">
            <p className="text-gray-400 font-sans leading-relaxed text-base">
              {ABOUT_CONTENT.description1}
            </p>
            <p className="text-gray-400 font-sans leading-relaxed text-base">
              {ABOUT_CONTENT.description2}
            </p>
          </div>
        </div>

        {/* Full-Width Image Placeholder */}
        <div className="w-full h-96 bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-800 rounded-lg flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-sans">Event Photos Coming Soon</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
