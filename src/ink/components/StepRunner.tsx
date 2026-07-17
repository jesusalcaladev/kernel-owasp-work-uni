// src/ink/components/StepRunner.tsx
import React from 'react';
import { Box, Text } from 'ink';

type StepStatus = 'pending' | 'running' | 'success' | 'error';

interface Step {
  label: string;
  status: StepStatus;
  details?: string;
}

const STATUS_ICON: Record<StepStatus, string> = {
  pending: '○',
  running: '●',
  success: '✔',
  error: '✖',
};

const STATUS_COLOR: Record<StepStatus, string> = {
  pending: '#555555',
  running: '#00ffff',
  success: '#00ff41',
  error: '#ff0040',
};

interface StepRunnerProps {
  steps: Step[];
}

export function StepRunner({ steps }: StepRunnerProps) {
  return (
    <Box flexDirection="column">
      {steps.map((step, i) => (
        <Box key={i} flexDirection="column">
          <Box>
            <Text color={STATUS_COLOR[step.status]} bold={step.status !== 'pending'}>
              {STATUS_ICON[step.status]}{' '}
            </Text>
            <Text
              color={step.status === 'pending' ? '#555555' : '#ffffff'}
              bold={step.status === 'running'}
              dimColor={step.status === 'pending'}
            >
              {step.label}
            </Text>
          </Box>
          {step.details && (
            <Box paddingLeft={3}>
              <Text color="#888888">└─ {step.details}</Text>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
}
