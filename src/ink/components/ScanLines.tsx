// src/ink/components/ScanLines.tsx
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface ScanItem {
  target: string;
  port?: number;
  status?: 'scanning' | 'open' | 'closed' | 'filtered';
}

interface ScanLinesProps {
  items: ScanItem[];
  title?: string;
  interval?: number;
}

export function ScanLines({ items, title, interval = 150 }: ScanLinesProps) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= items.length) return;
    const timer = setTimeout(() => setVisible(v => v + 1), interval + Math.random() * 100);
    return () => clearTimeout(timer);
  }, [visible, items.length, interval]);

  return (
    <Box flexDirection="column">
      {title && <Text bold>{title}</Text>}
      {items.slice(0, visible).map((item, i) => (
        <Box key={i}>
          {item.status === 'scanning' ? (
            <Text color="#ffb000">  ⏳ {item.target}:{item.port || '*'} ...</Text>
          ) : item.status === 'open' ? (
            <Text color="#00ff41">  ✓ {item.target}:{item.port || '*'} OPEN</Text>
          ) : item.status === 'closed' ? (
            <Text color="#ff0040">  ✗ {item.target}:{item.port || '*'} closed</Text>
          ) : (
            <Text color="#888888">  ? {item.target}:{item.port || '*'} filtered</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
