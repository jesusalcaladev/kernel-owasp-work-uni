// src/ink/components/ProgressHack.tsx
import React from 'react';
import { Box, Text } from 'ink';

interface ProgressHackProps {
  progress: number;
  label?: string;
  width?: number;
  color?: string;
  showPercent?: boolean;
}

export function ProgressHack({
  progress,
  label = '',
  width = 30,
  color = '#00ff41',
  showPercent = true,
}: ProgressHackProps) {
  const filled = Math.round((Math.min(progress, 100) / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text color={color}>[</Text>
      <Text color={color} bold>{'█'.repeat(filled)}</Text>
      <Text color="#333333">{'░'.repeat(empty)}</Text>
      <Text color={color}>]</Text>
      {label && <Text color="#888888"> {label}</Text>}
      {showPercent && <Text color="#888888"> {Math.floor(progress)}%</Text>}
    </Box>
  );
}
