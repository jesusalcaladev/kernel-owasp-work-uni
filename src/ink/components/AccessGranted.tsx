// src/ink/components/AccessGranted.tsx
import React from 'react';
import { Box, Text } from 'ink';

interface AccessGrantedProps {
  target: string;
  details?: string[];
}

export function AccessGranted({ target, details = [] }: AccessGrantedProps) {
  return (
    <Box flexDirection="column" borderStyle="double" borderColor="#22cc88" padding={1}>
      <Text color="#22cc88" bold>
        ★★★  ACCESS GRANTED  ★★★
      </Text>
      <Text />
      <Text color="#ffffff">Target: {target}</Text>
      <Text color="#888888">Session elevated · Footprint minimized</Text>
      {details.map((d, i) => (
        <Text key={i} color="#888888">{d}</Text>
      ))}
    </Box>
  );
}
