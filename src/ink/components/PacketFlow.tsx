// src/ink/components/PacketFlow.tsx
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface Packet {
  from: string;
  to: string;
  method?: string;
  path: string;
  status?: number;
  bytes?: number;
}

interface PacketFlowProps {
  packets: Packet[];
  autoPlay?: boolean;
  interval?: number;
}

export function PacketFlow({ packets, autoPlay = true, interval = 400 }: PacketFlowProps) {
  const [visible, setVisible] = useState(autoPlay ? 0 : packets.length);

  useEffect(() => {
    if (!autoPlay || visible >= packets.length) return;
    const timer = setTimeout(() => setVisible(v => v + 1), interval);
    return () => clearTimeout(timer);
  }, [visible, autoPlay, packets.length, interval]);

  return (
    <Box flexDirection="column">
      {packets.slice(0, visible).map((pkt, i) => {
        const statusColor =
          !pkt.status ? '#888888' :
          pkt.status < 300 ? '#00ff41' :
          pkt.status < 400 ? '#ffb000' : '#ff0040';

        return (
          <Box key={i}>
            <Text color="#00ffff">  ──▶ </Text>
            <Text color="#ffffff">{(pkt.method || 'GET').padEnd(6)}</Text>
            <Text color="#ffb000">{pkt.from}</Text>
            <Text color="#ffffff">{pkt.path}</Text>
            <Text>  </Text>
            <Text color={statusColor}>{pkt.status || '····'}</Text>
            {pkt.bytes !== undefined && (
              <Text color="#888888"> {pkt.bytes}B</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
