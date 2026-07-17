// src/ink/components/CodeBlock.tsx
// Beautiful code viewer with syntax highlighting
import React from 'react';
import { Box, Text } from 'ink';

interface CodeBlockProps {
  code: string;
  title?: string;
  color?: string;
  lang?: string;
  filename?: string;
}

export function CodeBlock({ code, title, color = '#ff8800', lang, filename }: CodeBlockProps) {
  const lines = code.split('\n');
  const maxLineNum = String(lines.length).length;

  return (
    <Box flexDirection="column">
      {/* Header */}
      {title && (
        <Box paddingX={1} paddingTop={0} paddingBottom={0}>
          <Text color={color} bold>  {title}</Text>
          {filename && <Text color="#555555"> — {filename}</Text>}
        </Box>
      )}
      
      {/* Code box */}
      <Box flexDirection="column" borderStyle="round" borderColor={color} paddingX={1}>
        {lines.map((line, i) => {
          const lineNum = String(i + 1).padStart(maxLineNum);
          return (
            <Box key={i}>
              <Text color="#444444">{lineNum} │ </Text>
              <Text>{renderLine(line, lang)}</Text>
            </Box>
          );
        })}
      </Box>
      
      {/* Footer */}
      {filename && (
        <Box paddingTop={0} paddingBottom={0}>
          <Text color="#555555">  {filename}</Text>
        </Box>
      )}
    </Box>
  );
}

// Inline Token component
function Token({ children, color, bold, italic }: { children: string; color?: string; bold?: boolean; italic?: boolean }) {
  return <Text color={color} bold={bold} italic={italic}>{children}</Text>;
}

// Syntax highlighting renderer
function renderLine(line: string, lang?: string): React.ReactNode {
  if (!line) return <Text>{' '}</Text>;
  
  const tokens: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  // Comment detection
  const jsCommentMatch = remaining.match(/^(\s*)(\/\/.*)$/);
  const pyCommentMatch = remaining.match(/^(\s*)(#.*)$/);
  const sqlCommentMatch = remaining.match(/^(\s*)(--.*)$/);
  
  if (jsCommentMatch) {
    return (
      <>
        <Text>{jsCommentMatch[1]}</Text>
        <Token color="#555555" italic>{jsCommentMatch[2]}</Token>
      </>
    );
  }
  if (pyCommentMatch) {
    return (
      <>
        <Text>{pyCommentMatch[1]}</Text>
        <Token color="#555555" italic>{pyCommentMatch[2]}</Token>
      </>
    );
  }
  if (sqlCommentMatch) {
    return (
      <>
        <Text>{sqlCommentMatch[1]}</Text>
        <Token color="#555555" italic>{sqlCommentMatch[2]}</Token>
      </>
    );
  }

  // String highlighting
  const parts = remaining.split(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g);
  
  return (
    <>
      {parts.map((part, i) => {
        // Check if this part is a string
        if (/^['"`]/.test(part)) {
          return <Token key={i} color="#00ff41">{part}</Token>;
        }
        
        // Highlight keywords in non-string parts
        return <Text key={i}>{highlightKeywords(part)}</Text>;
      })}
    </>
  );
}

// Highlight JavaScript/TypeScript keywords
function highlightKeywords(text: string): React.ReactNode {
  const keywords = /\b(const|let|var|function|return|if|else|for|while|import|export|from|async|await|new|throw|try|catch|typeof|instanceof|in|of|this|class|extends|super|this|null|undefined|true|false)\b/g;
  const types = /\b(string|number|boolean|void|any|never|unknown)\b/g;
  const functions = /\b([a-zA-Z_]\w*)\s*\(/g;
  
  // Simple approach: split by keywords and color them
  const parts = text.split(keywords);
  
  return (
    <>
      {parts.map((part, i) => {
        if (keywords.test(part)) {
          return <Token key={i} color="#aa44ff">{part}</Token>;
        }
        if (types.test(part)) {
          return <Token key={i} color="#00ffff">{part}</Token>;
        }
        return <Text key={i}>{part}</Text>;
      })}
    </>
  );
}

// Simple SQL keyword highlighting
function highlightSQLKeywords(text: string): React.ReactNode {
  const sqlKeywords = /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|DROP|ALTER|JOIN|ON|AND|OR|NOT|NULL|PRIMARY|KEY|FOREIGN|REFERENCES|IF|EXISTS|LIKE|ORDER|BY|GROUP|HAVING|LIMIT|COUNT|SUM|AVG|MIN|MAX|INTEGER|TEXT|REAL|BLOB)\b/gi;
  
  const parts = text.split(sqlKeywords);
  return (
    <>
      {parts.map((part, i) => {
        if (sqlKeywords.test(part)) {
          return <Token key={i} color="#aa44ff" bold>{part}</Token>;
        }
        return <Text key={i}>{part}</Text>;
      })}
    </>
  );
}
