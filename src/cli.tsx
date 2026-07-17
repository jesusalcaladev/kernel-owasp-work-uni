#!/usr/bin/env node
// src/cli.tsx
// Kernel-style REPL with Ink — fuzzy hints, interactive shell

import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp, Static } from 'ink';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

import * as auth from './auth.js';
import * as chat from './chat.js';
import * as fetcher from './fetch.js';
import * as profile from './profile.js';
import { getDb } from './db.js';
import { THEME, sleep } from './ink/theme.js';

// ── Session ──
const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = resolve(__dirname, '..', 'data', '.session');

let session: { user: { id: number; username: string; role: string }; token: string } | null = null;

async function saveSessionFile(token: string) {
  try { await writeFile(SESSION_FILE, token, 'utf-8'); } catch {}
}

async function clearSessionFile() {
  try { await unlink(SESSION_FILE); } catch {}
}

async function restoreSession() {
  try {
    const token = await readFile(SESSION_FILE, 'utf-8');
    const cleaned = token.trim();
    if (!cleaned) return;
    const s = auth.getSessionByToken(cleaned);
    if (s) session = s;
    else await clearSessionFile();
  } catch {}
}

// ── Command metadata ──
const CMD: Record<string, { desc: string; args: string }> = {
  signup:     { desc: 'create account',        args: '<user> <pass> [email]' },
  login:      { desc: 'authenticate',          args: '<user> <pass>' },
  logout:     { desc: 'destroy session',       args: '' },
  su:         { desc: 'switch user',           args: '<username>' },
  sudo:       { desc: 'run as admin',          args: '<cmd> [args...]' },
  whoami:     { desc: 'print identity',        args: '' },
  passwd:     { desc: 'change password',       args: '<old> <new>' },
  chmod:      { desc: 'change role (admin)',   args: '<user> <role>' },
  admin:      { desc: 'admin panel',           args: '' },
  setupadmin: { desc: 'quick admin setup',     args: '[user] [pass]' },
  chat:       { desc: 'talk to LLM',           args: '<text>' },
  history:    { desc: 'chat history',          args: '[user_id]' },
  sessions:   { desc: 'list active sessions',  args: '' },
  fetch:      { desc: 'A10 SSRF — fetch URL',  args: '<url>' },
  users:      { desc: 'list users (shows MD5)', args: '' },
  clear:      { desc: 'clear screen',          args: '' },
  help:       { desc: 'this help',             args: '' },
  exit:       { desc: 'halt shell',            args: '' },
};

const CMD_KEYS = Object.keys(CMD);

function fuzzyMatch(text: string, pattern: string): boolean {
  if (!pattern) return true;
  const t = text.toLowerCase();
  const p = pattern.toLowerCase();
  let pi = 0;
  for (let ti = 0; ti < t.length && pi < p.length; ti++) {
    if (t[ti] === p[pi]) pi++;
  }
  return pi === p.length;
}

function fuzzySuggestions(partial: string, limit = 6): string[] {
  const word = partial.trim().split(/\s+/)[0] ?? '';
  return CMD_KEYS
    .filter(k => fuzzyMatch(k, word))
    .slice(0, limit);
}

// ── Prompt label ──
function promptLabel(): string {
  if (!session) return 'owasp> ';
  const isRoot = session.user.role === 'admin';
  const user = isRoot ? 'root' : session.user.username;
  const ch = isRoot ? '#' : '$';
  return `${user}@owasp${ch} `;
}

// ── Shell component ──
function Shell() {
  const [line, setLine] = useState('');
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [output, setOutput] = useState<string[]>([]);
  const [hintIdx, setHintIdx] = useState(0);
  const { exit } = useApp();

  const hints = fuzzySuggestions(line);
  const currentWord = line.includes(' ') ? null : line.trim() === '' ? '' : line.trim();
  const showHints = currentWord !== null && hints.length > 0;

  const addOutput = useCallback((...lines: string[]) => {
    setOutput(prev => [...prev, ...lines]);
  }, []);

  const handleCommand = useCallback(async (rawLine: string) => {
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    const [cmd, ...args] = trimmed.split(/\s+/);

    switch (cmd) {
      case 'help': {
        addOutput('');
        addOutput('Available commands:');
        for (const [k, v] of Object.entries(CMD)) {
          addOutput(`  ${k.padEnd(12)} ${v.desc} ${v.args ? `(${v.args})` : ''}`);
        }
        addOutput('');
        addOutput('Tips: Tab complete, ↑↓ cycle hints, type partial like "lg" → "login"');
        addOutput('');
        break;
      }
      case 'clear':
        setOutput([]);
        break;
      case 'exit':
      case 'quit':
        addOutput('halt.');
        await sleep(100);
        exit();
        break;
      case 'signup': {
        const [username, password, email] = args;
        if (!username || !password) { addOutput('usage: signup <user> <pass> [email]'); break; }
        const r = auth.signup({ username, password, email });
        if (r.ok) addOutput(`user created: ${username} (uid=${r.user.id})`);
        else addOutput(`error: ${r.error}`);
        break;
      }
      case 'login': {
        const [username, password] = args;
        if (!username || !password) { addOutput('usage: login <user> <pass>'); break; }
        const r = auth.login({ username, password });
        if (r.ok) {
          session = { user: r.user, token: r.token };
          await saveSessionFile(r.token);
          addOutput(`authenticated as ${r.user.username}`);
        } else addOutput(`error: ${r.error}`);
        break;
      }
      case 'logout': {
        if (!session) { addOutput('not logged in.'); break; }
        auth.destroySession(session.token);
        session = null;
        await clearSessionFile();
        addOutput('session destroyed.');
        break;
      }
      case 'su': {
        if (!session) { addOutput('login first.'); break; }
        const target = args[0];
        if (!target) { addOutput('usage: su <username>'); break; }
        const user = auth.getUserByUsername(target);
        if (!user) { addOutput(`user '${target}' not found`); break; }
        auth.destroySession(session.token);
        const newToken = auth.createSession(user.id);
        session = { user: { id: user.id, username: user.username, role: user.role }, token: newToken };
        await saveSessionFile(newToken);
        addOutput(`switched to ${target}`);
        break;
      }
      case 'whoami': {
        if (!session) { addOutput('not logged in.'); break; }
        const role = session.user.role === 'admin' ? '(admin)' : '(user)';
        addOutput(`uid=${session.user.id} username=${session.user.username} role=${role} token=${session.token}`);
        break;
      }
      case 'setupadmin': {
        const adminUser = args[0] || 'admin';
        const adminPass = args[1] || 'admin123';
        const existing = auth.getUserByUsername(adminUser);
        if (existing) {
          const r = auth.login({ username: adminUser, password: adminPass });
          if (r.ok) {
            session = { user: r.user, token: r.token };
            await saveSessionFile(r.token);
            if (r.user.role === 'admin') {
              addOutput(`logged in as ${adminUser} (admin)`);
            } else {
              auth.changeUserRole(adminUser, 'admin');
              session.user.role = 'admin';
              addOutput(`elevated ${adminUser} to admin`);
            }
          } else addOutput(`login failed: ${r.error}`);
        } else {
          const r = auth.signup({ username: adminUser, password: adminPass, email: `${adminUser}@owasp.local` });
          if (r.ok) {
            auth.changeUserRole(adminUser, 'admin');
            session = { user: { id: r.user.id, username: r.user.username, role: 'admin' }, token: auth.createSession(r.user.id) };
            await saveSessionFile(session.token);
            addOutput(`admin user created: ${adminUser}`);
            addOutput(`logged in as admin (uid=${r.user.id})`);
          } else addOutput(`error: ${r.error}`);
        }
        break;
      }
      case 'fetch': {
        if (!session) { addOutput('login first.'); break; }
        const url = args[0];
        if (!url) { addOutput('usage: fetch <url>'); break; }
        addOutput(`(⚠ A10 SSRF) requesting ${url} from server...`);
        try {
          const body = await fetcher.fetchUrl(url);
          addOutput('--- first 200 chars ---');
          addOutput(body.slice(0, 200));
          addOutput('--- end ---');
        } catch (e: any) {
          addOutput(`fetch failed: ${e.message}`);
        }
        break;
      }
      case 'users': {
        const rows = auth.listAllUsers();
        if (!rows.length) { addOutput('no users.'); break; }
        addOutput('⚠ A02 DEMO — password column is MD5 hashes (no salt)');
        addOutput('');
        for (const u of rows) {
          addOutput(`  ${String(u.id).padStart(3)}  ${u.username.padEnd(15)} ${u.password}  ${u.email || ''}`);
        }
        break;
      }
      case 'chmod': {
        if (!session) { addOutput('login first.'); break; }
        if (session.user.role !== 'admin') { addOutput('Permission denied. root only.'); break; }
        const [target, role] = args;
        if (!target || !role) { addOutput('usage: chmod <user> <role>'); break; }
        const r = auth.changeUserRole(target, role);
        if (r.ok) addOutput(`role of ${target} → ${role}`);
        else addOutput(`error: ${r.error}`);
        break;
      }
      case 'chat': {
        if (!session) { addOutput('login first.'); break; }
        const prompt = args.join(' ');
        if (!prompt) { addOutput('usage: chat <text>'); break; }
        addOutput(`you: ${prompt}`);
        try {
          const answer = await chat.askLLM(prompt);
          addOutput(`llm: ${answer}`);
          profile.appendHistory(session.user.id, 'user', prompt);
          profile.appendHistory(session.user.id, 'assistant', answer);
        } catch (e: any) {
          addOutput(`llm error: ${e.message}`);
        }
        break;
      }
      case 'history': {
        if (!session) { addOutput('login first.'); break; }
        const target = Number(args[0] || session.user.id);
        const rows = profile.getHistoryOf(target);
        if (!rows.length) { addOutput('empty history.'); break; }
        addOutput('── chat history ──');
        for (const r of rows) {
          const icon = r.role === 'user' ? 'you' : 'llm';
          addOutput(`  ${r.created_at.slice(0, 19)}  ${icon}  ${r.content.slice(0, 100)}`);
        }
        addOutput('──────────────────');
        break;
      }
      case 'sessions': {
        if (!session) { addOutput('login first.'); break; }
        const allSessions = auth.listSessions();
        if (!allSessions.length) { addOutput('no active sessions.'); break; }
        addOutput('active sessions:');
        for (const s of allSessions) {
          addOutput(`  ${s.token.slice(0, 20)}…  ${s.username}  ${s.role}  ${s.created_at.slice(0, 19)}`);
        }
        break;
      }
      default:
        addOutput(`unknown: ${cmd}. type "help".`);
    }
  }, [addOutput, exit]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
      return;
    }

    if (key.return) {
      const prompt = promptLabel();
      addOutput(`${prompt}${line}`);
      handleCommand(line);
      if (line.trim()) setHistory(prev => [...prev, line]);
      setLine('');
      setCursor(0);
      setHintIdx(0);
      return;
    }

    if (key.tab) {
      if (hints.length) {
        const pick = hints[hintIdx] ?? hints[0];
        const rest = line.includes(' ') ? line.slice(line.indexOf(' ')) : '';
        setLine(pick + rest);
        setCursor(pick.length);
        setHintIdx(0);
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (cursor > 0) {
        setLine(line.slice(0, cursor - 1) + line.slice(cursor));
        setCursor(c => c - 1);
        setHintIdx(0);
      }
      return;
    }

    if (key.upArrow) {
      if (hints.length) {
        setHintIdx(i => (i - 1 + hints.length) % hints.length);
      }
      return;
    }

    if (key.downArrow) {
      if (hints.length) {
        setHintIdx(i => (i + 1) % hints.length);
      }
      return;
    }

    if (key.leftArrow) {
      setCursor(c => Math.max(0, c - 1));
      return;
    }

    if (key.rightArrow) {
      setCursor(c => Math.min(line.length, c + 1));
      return;
    }

    if (key.home) {
      setCursor(0);
      return;
    }

    if (key.end) {
      setCursor(line.length);
      return;
    }

    // Printable character
    if (input.length === 1 && (input === ' ' || input > ' ')) {
      setLine(line.slice(0, cursor) + input + line.slice(cursor));
      setCursor(c => c + 1);
      setHintIdx(0);
    }
  });

  return (
    <Box flexDirection="column">
      {/* Boot messages */}
      <Static items={['boot']}>
        {() => (
          <Box key="boot" flexDirection="column">
            <Box>
              <Text color={THEME.primary} bold>
                {'  ██████╗ ██╗    ██╗ █████╗ ███████╗██████╗ '}
              </Text>
            </Box>
            <Box>
              <Text color={THEME.primary} bold>
                {' ██╔═══██╗██║    ██║██╔══██╗██╔════╝██╔══██╗'}
              </Text>
            </Box>
            <Box>
              <Text color={THEME.danger} bold>
                {' ██║   ██║██║ █╗ ██║███████║███████╗██████╔╝'}
              </Text>
            </Box>
            <Box>
              <Text color={THEME.danger} bold>
                {' ██║   ██║██║███╗██║██╔══██║╚════██║██╔═══╝ '}
              </Text>
            </Box>
            <Box>
              <Text color={THEME.warning} bold>
                {' ╚██████╔╝╚███╔███╔╝██║  ██║███████║██║     '}
              </Text>
            </Box>
            <Box>
              <Text color={THEME.warning} bold>
                {'  ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚═╝     '}
              </Text>
            </Box>
            <Box marginTop={1}>
              <Text color="#888888">  ────────────────────────────────────────────────────</Text>
            </Box>
            <Box>
              <Text color="#888888">  </Text>
              <Text color={THEME.primary} bold>owasp-kernel</Text>
              <Text color="#888888">  v2.0.0 (Ink) · ring-0 demo shell</Text>
            </Box>
            <Box>
              <Text color="#888888">  </Text>
              <Text color={THEME.accent}>A02</Text>
              <Text color="#888888"> Crypto · </Text>
              <Text color={THEME.warning}>A07</Text>
              <Text color="#888888"> Auth · </Text>
              <Text color={THEME.A10.primary}>A10</Text>
              <Text color="#888888"> SSRF</Text>
            </Box>
            <Box>
              <Text color="#888888">  ────────────────────────────────────────────────────</Text>
            </Box>
            <Box>
              <Text color="#888888">  type </Text>
              <Text bold>help</Text>
              <Text color="#888888"> for commands · </Text>
              <Text bold>setupadmin</Text>
              <Text color="#888888"> to get started</Text>
            </Box>
            <Box marginTop={1} />
          </Box>
        )}
      </Static>

      {/* Output */}
      {output.map((line, i) => (
        <Box key={i}>
          <Text>{line}</Text>
        </Box>
      ))}

      {/* Current input line */}
      <Box>
        <Text color={session?.user.role === 'admin' ? THEME.danger : THEME.primary} bold>
          {promptLabel()}
        </Text>
        <Text>{line.slice(0, cursor)}</Text>
        <Text inverse> </Text>
        <Text>{line.slice(cursor)}</Text>
      </Box>

      {/* Fuzzy hints */}
      {showHints && (
        <Box flexDirection="column" paddingLeft={2}>
          {hints.map((h, i) => {
            const meta = CMD[h];
            return (
              <Box key={h}>
                <Text color={i === hintIdx ? THEME.accent : '#555555'}>
                  {i === hintIdx ? '▸ ' : '  '}
                </Text>
                <Text color={i === hintIdx ? THEME.accent : '#ffffff'} bold={i === hintIdx}>
                  {h}
                </Text>
                {meta?.args && <Text color="#888888"> {meta.args}</Text>}
                {meta?.desc && <Text color="#555555">  — {meta.desc}</Text>}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function App() {
  const isTTY = process.stdin.isTTY ?? false;
  
  if (!isTTY) {
    return (
      <Box flexDirection="column">
        <Text color={THEME.danger} bold>ERROR: Interactive mode requires a TTY terminal.</Text>
        <Text color="#888888">Run directly in your terminal: pnpm start</Text>
      </Box>
    );
  }
  
  return <Shell />;
}

async function main() {
  await restoreSession();
  render(<App />, {
    exitOnCtrlC: true,
  });
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  main().catch(e => {
    console.error(`fatal: ${e.message}`);
    process.exit(1);
  });
}
