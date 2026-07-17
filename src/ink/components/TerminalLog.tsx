// src/ink/components/TerminalLog.tsx
import React from 'react';
import { Box, Text } from 'ink';

type LogLevel = 'info' | 'warn' | 'hit' | 'fail' | 'ok' | 'net';

interface LogEntry {
  ts: string;
  level: LogLevel;
  msg: string;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: '#888888',
  warn: '#ffb000',
  hit: '#ff0040',
  fail: '#ff0040',
  ok: '#00ff41',
  net: '#00ffff',
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  info: '[ INFO ]',
  warn: '[ WARN ]',
  hit: '[ HIT  ]',
  fail: '[ FAIL ]',
  ok: '[  OK  ]',
  net: '[ NET  ]',
};

interface TerminalLogProps {
  entries: LogEntry[];
}

export function TerminalLog({ entries }: TerminalLogProps) {
  return (
    <Box flexDirection="column">
      {entries.map((entry, i) => (
        <Box key={i}>
          <Text color="#555555">[{entry.ts}] </Text>
          <Text color={LEVEL_COLORS[entry.level]} bold={entry.level === 'hit'}>
            {LEVEL_LABELS[entry.level]}
          </Text>
          <Text> {entry.msg}</Text>
        </Box>
      ))}
    </Box>
  );
}

export function makeLogEntry(level: LogLevel, msg: string): LogEntry {
  const ts = (Math.random() * 0.004 + 0.001).toFixed(6);
  return { ts, level, msg };
}
