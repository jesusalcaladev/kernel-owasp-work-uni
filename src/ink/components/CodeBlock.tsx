// src/ink/components/CodeBlock.tsx
import React from 'react';
import { Box, Text } from 'ink';

interface CodeBlockProps {
  code: string;
  title?: string;
  color?: string;
  lang?: string;
}

export function CodeBlock({ code, title, color = '#ff8800', lang }: CodeBlockProps) {
  const lines = code.split('\n');

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={color} padding={1}>
      {title && (
        <>
          <Text color={color} bold>{title}</Text>
          <Text />
        </>
      )}
      {lines.map((line, i) => (
        <Box key={i}>
          <Text color="#555555">{String(i + 1).padStart(3)} │ </Text>
          <Text>{highlightLine(line, lang)}</Text>
        </Box>
      ))}
    </Box>
  );
}

function highlightLine(line: string, lang?: string): React.ReactNode {
  // Simple syntax highlighting for common patterns
  const patterns: [RegExp, string][] = [
    [/\/\/.*/g, '#555555'],
    [/#.*/g, '#555555'],
    [/(?:function|const|let|var|return|if|else|for|while|import|export|from|async|await|new|throw|try|catch)/g, '#aa44ff'],
    [/(?:true|false|null|undefined|this)/g, '#ff8800'],
    [/(?:'[^']*'|"[^"]*"|`[^`]*`)/g, '#00ff41'],
    [/(?:\d+)/g, '#ffb000'],
    [/(?:[A-Z][a-zA-Z]+)/g, '#00ffff'],
  ];

  // For SQL keywords
  if (lang === 'sql') {
    patterns.push([/(?:SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|JOIN|ON|AND|OR|NOT|NULL|PRIMARY|KEY|FOREIGN|REFERENCES|IF|EXISTS|LIKE|ORDER|BY|GROUP|HAVING|LIMIT|COUNT|SUM|AVG|MIN|MAX)/gi, '#aa44ff']);
  }

  // Simple approach: just color the whole line with basic highlighting
  // In a real app we'd use shiki for proper highlighting
  return <Text>{line}</Text>;
}
