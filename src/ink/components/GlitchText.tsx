// src/ink/components/GlitchText.tsx
import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

const GLITCH_CHARS = '█▓▒░╬╫╪┼┤├│═║╗╝╚╔';

interface GlitchTextProps {
  text: string;
  iterations?: number;
  color?: string;
  interval?: number;
}

export function GlitchText({ text, iterations = 8, color = '#ff0040', interval = 50 }: GlitchTextProps) {
  const [display, setDisplay] = useState(text);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (phase >= iterations) {
      setDisplay(text);
      return;
    }
    const timer = setTimeout(() => {
      const glitched = text
        .split('')
        .map(ch =>
          Math.random() < 0.3
            ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
            : ch
        )
        .join('');
      setDisplay(glitched);
      setPhase(p => p + 1);
    }, interval);
    return () => clearTimeout(timer);
  }, [phase, text, iterations, interval]);

  return (
    <Text color={phase >= iterations ? color : '#ff0000'} bold>
      {display}
    </Text>
  );
}
