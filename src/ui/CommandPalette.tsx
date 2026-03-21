import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  commands: Command[];
  onClose: () => void;
}

const RECENT_KEY = 'profileforge_recent_commands';
const MAX_RECENT = 4;

function getRecentIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

function saveRecentId(id: string) {
  const recent = getRecentIds().filter(r => r !== id);
  recent.unshift(id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 80;
  // sequential char match score
  let qi = 0;
  let score = 0;
  let lastIdx = -1;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      score += (lastIdx === i - 1) ? 10 : 5;
      lastIdx = i;
      qi++;
    }
  }
  return qi === q.length ? score : 0;
}

export function CommandPalette({ commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const recentIds = useMemo(() => getRecentIds(), []);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show recent first, then the rest
      const recent = recentIds
        .map(id => commands.find(c => c.id === id))
        .filter(Boolean) as Command[];
      const rest = commands.filter(c => !recentIds.includes(c.id));
      return [...recent, ...rest];
    }
    return commands
      .map(c => ({ cmd: c, score: fuzzyScore(query, c.label) }))
      .filter(x => x.score > 0 || fuzzyMatch(query, x.cmd.label))
      .sort((a, b) => b.score - a.score)
      .map(x => x.cmd);
  }, [query, commands, recentIds]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement;
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const executeCommand = useCallback((cmd: Command) => {
    saveRecentId(cmd.id);
    onClose();
    // Tiny delay so overlay closes first
    setTimeout(() => cmd.action(), 50);
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % filtered.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[selectedIndex]) executeCommand(filtered[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filtered, selectedIndex, executeCommand, onClose]);

  const hasRecent = !query.trim() && recentIds.length > 0;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div
        className="command-palette"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="command-palette-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-tertiary flex-shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="command-palette-input"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="command-palette-kbd">ESC</kbd>
        </div>

        {/* Results */}
        <div className="command-palette-list" ref={listRef}>
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-text-tertiary">
              No commands found
            </div>
          )}
          {filtered.map((cmd, i) => {
            const isRecent = hasRecent && i < recentIds.length && recentIds.includes(cmd.id);
            return (
              <React.Fragment key={cmd.id}>
                {hasRecent && i === 0 && (
                  <div className="px-4 pt-2 pb-1 text-2xs font-semibold text-text-tertiary uppercase tracking-wider">Recent</div>
                )}
                {hasRecent && i === recentIds.length && (
                  <div className="px-4 pt-3 pb-1 text-2xs font-semibold text-text-tertiary uppercase tracking-wider border-t border-border/30">All Commands</div>
                )}
                <button
                  className={`command-palette-item ${i === selectedIndex ? 'command-palette-item-active' : ''}`}
                  onClick={() => executeCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <span className="command-palette-item-icon">{cmd.icon}</span>
                  <span className="flex-1 text-left">{cmd.label}</span>
                  {cmd.shortcut && (
                    <kbd className="command-palette-shortcut">{cmd.shortcut}</kbd>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer */}
        <div className="command-palette-footer">
          <span className="flex items-center gap-1.5 text-2xs text-text-tertiary">
            <kbd className="command-palette-kbd-sm">&#8593;&#8595;</kbd> navigate
            <kbd className="command-palette-kbd-sm">&#8629;</kbd> select
            <kbd className="command-palette-kbd-sm">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

// Hook to manage command palette open/close with keyboard shortcut
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}
