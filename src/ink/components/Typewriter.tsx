// src/ink/components/Typewriter.tsx
import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

interface TypewriterProps {
  text: string;
  speed?: number;
  color?: string;
  bold?: boolean;
  onComplete?: () => void;
}

export function Typewriter({ text, speed = 18, color, bold, onComplete }: TypewriterProps) {
  const [visible, setVisible] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (visible >= text.length) {
      if (!done) {
        setDone(true);
        onComplete?.();
      }
      return;
    }
    const timer = setTimeout(() => setVisible(v => v + 1), text[visible] === ' ' ? speed / 2 : speed);
    return () => clearTimeout(timer);
  }, [visible, text, speed, done, onComplete]);

  return (
    <Text color={color} bold={bold}>
      {text.slice(0, visible)}
      {!done && <Text inverse> </Text>}
    </Text>
  );
}
