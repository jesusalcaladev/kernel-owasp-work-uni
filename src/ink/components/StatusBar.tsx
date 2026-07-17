// src/ink/components/StatusBar.tsx
import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  title: string;
  target: string;
  status?: string;
  color?: string;
}

export function StatusBar({ title, target, status = 'active', color = '#00ff41' }: StatusBarProps) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const statusColor = status === 'active' ? '#00ff41' : status === 'warning' ? '#ffb000' : '#ff0040';

  return (
    <Box flexDirection="column">
      <Box
        paddingX={1}
        backgroundColor="#1a1a2e"
      >
        <Text color="#ffffff" bold>
          C2 · {title.padEnd(28)} target:{target.padEnd(18)} {now}
        </Text>
      </Box>
      <Box>
        <Text color="#555555">────────────────────────────────────────────────────────────────────</Text>
      </Box>
      <Box>
        <Text color="#888888">  status: </Text>
        <Text color={statusColor}>{status}</Text>
      </Box>
    </Box>
  );
}
