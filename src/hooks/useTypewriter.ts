import { useState, useEffect, useRef } from 'react';

interface UseTypewriterOptions {
  words: readonly string[];
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseAfterType?: number;
  pauseAfterDelete?: number;
}

export function useTypewriter({
  words,
  typeSpeed = 100,
  deleteSpeed = 60,
  pauseAfterType = 1800,
  pauseAfterDelete = 400,
}: UseTypewriterOptions) {
  const [text, setText] = useState('');
  const ref = useRef({ wordIdx: 0, deleting: false });

  useEffect(() => {
    const { wordIdx, deleting } = ref.current;
    const word = words[wordIdx];
    const atEnd = !deleting && text === word;
    const atStart = deleting && text === '';
    const delay = atEnd
      ? pauseAfterType
      : atStart
        ? pauseAfterDelete
        : deleting
          ? deleteSpeed
          : typeSpeed;

    const timeout = setTimeout(() => {
      const { wordIdx, deleting } = ref.current;
      const word = words[wordIdx];

      if (!deleting && text === word) {
        ref.current.deleting = true;
        setText(word.slice(0, -1));
      } else if (deleting && text === '') {
        const next = (wordIdx + 1) % words.length;
        ref.current = { wordIdx: next, deleting: false };
        setText(words[next].slice(0, 1));
      } else if (deleting) {
        setText(text.slice(0, -1));
      } else {
        setText(word.slice(0, text.length + 1));
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, words, typeSpeed, deleteSpeed, pauseAfterType, pauseAfterDelete]);

  return { displayText: text };
}
