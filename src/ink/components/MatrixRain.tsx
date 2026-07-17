// src/ink/components/MatrixRain.tsx
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
const HEX = '0123456789ABCDEF';
const CHARS = KATAKANA + HEX;

interface Column {
  y: number;
  speed: number;
  char: string;
  brightness: number;
}

interface MatrixRainProps {
  width?: number;
  height?: number;
  duration?: number;
  color?: string;
}

export function MatrixRain({ width = 40, height = 8, duration = 2000, color = '#00ff41' }: MatrixRainProps) {
  const [columns, setColumns] = useState<Column[]>(() =>
    Array.from({ length: width }, () => ({
      y: Math.random() * height,
      speed: 0.3 + Math.random() * 0.7,
      char: CHARS[Math.floor(Math.random() * CHARS.length)],
      brightness: Math.random(),
    }))
  );

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - start > duration) {
        clearInterval(timer);
        return;
      }
      setColumns(prev =>
        prev.map(col => ({
          y: (col.y + col.speed) % (height + 2),
          speed: 0.3 + Math.random() * 0.7,
          char: Math.random() < 0.1 ? CHARS[Math.floor(Math.random() * CHARS.length)] : col.char,
          brightness: Math.random(),
        }))
      );
    }, 30);
    return () => clearInterval(timer);
  }, [width, height, duration]);

  const rows: string[][] = Array.from({ length: height }, () => Array(width).fill(' '));
  
  columns.forEach((col, x) => {
    const headY = Math.floor(col.y);
    if (headY >= 0 && headY < height) {
      rows[headY][x] = col.char;
    }
    for (let i = 1; i <= 3; i++) {
      const tailY = headY - i;
      if (tailY >= 0 && tailY < height && Math.random() < 0.8) {
        rows[tailY][x] = CHARS[Math.floor(Math.random() * CHARS.length)];
      }
    }
  });

  return (
    <Box flexDirection="column">
      {rows.map((row, y) => (
        <Box key={y}>
          {row.map((ch, x) => {
            const col = columns[x];
            const dist = Math.abs(y - Math.floor(col.y));
            const opacity = dist === 0 ? 'bold' : dist <= 1 ? undefined : 'dim';
            return (
              <Text
                key={x}
                color={opacity === 'bold' ? '#ffffff' : opacity === 'dim' ? '#003300' : color}
                bold={opacity === 'bold'}
                dimColor={opacity === 'dim'}
              >
                {ch}
              </Text>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
