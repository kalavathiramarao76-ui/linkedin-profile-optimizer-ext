import React, { useState, useEffect, useCallback } from 'react';
import { ScoreRing } from '@/ui/components/ScoreRing';
import { RadarChart } from '@/ui/components/RadarChart';
import { SectionCard } from '@/ui/components/SectionCard';
import { CopyButton } from '@/ui/components/CopyButton';
import { LoadingSkeleton, ScoreSkeleton, SectionSkeleton } from '@/ui/components/LoadingSkeleton';
import { ToastContainer } from '@/ui/components/Toast';
import { useToast } from '@/ui/hooks/useToast';
import { useStreamingResponse } from '@/ui/hooks/useStreamingResponse';
import { FavoriteButton } from '@/ui/FavoriteButton';
import { getFavoritesCount } from '@/shared/favorites';
import { ProfileAnalysis, GeneratedHeadline, Settings } from '@/shared/types';
import { TONES, getScoreColor, getScoreLabel, DEFAULT_ENDPOINT, DEFAULT_MODEL } from '@/shared/constants';

type Tab = 'analyze' | 'headlines' | 'summary' | 'settings';

export function App() {
  const [tab, setTab] = useState<Tab>('analyze');
  const [profileText, setProfileText] = useState('');
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [headlines, setHeadlines] = useState<GeneratedHeadline[]>([]);
  const [summaryTone, setSummaryTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<Settings>({
    endpoint: DEFAULT_ENDPOINT,
    model: DEFAULT_MODEL,
    theme: 'dark',
  });

  const [favCount, setFavCount] = useState(0);
  const { toasts, addToast, removeToast } = useToast();
  const { streaming, streamedText, startStream, stopStream, setStreamedText } = useStreamingResponse();

  // Load favorites count
  useEffect(() => {
    getFavoritesCount().then(setFavCount);
  }, []);

  const handleFavToggle = useCallback((added: boolean, count: number) => {
    setFavCount(count);
    addToast(added ? 'Added to favorites' : 'Removed from favorites', added ? 'success' : 'info');
  }, [addToast]);

  // Load extracted profile from content script
  useEffect(() => {
    chrome.storage.local.get(['extractedProfile', 'extractedAt', 'pendingAction'], (result) => {
      if (result.extractedProfile && result.extractedAt) {
        const age = Date.now() - result.extractedAt;
        if (age < 30000) { // within 30s
          setProfileText(result.extractedProfile);
          if (result.pendingAction === 'analyze') {
            handleAnalyze(result.extractedProfile);
          } else if (result.pendingAction === 'headlines') {
            setTab('headlines');
          } else if (result.pendingAction === 'summary') {
            setTab('summary');
          }
          chrome.storage.local.remove(['pendingAction']);
        }
      }
    });

    // Load settings
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
      if (res && !res.error) {
        setSettings(res);
        applyTheme(res.theme);
      }
    });
  }, []);

  const applyTheme = (theme: string) => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('lpo_theme_cache', theme);
  };

  const handleAnalyze = useCallback(async (text?: string) => {
    const t = text || profileText;
    if (!t.trim()) {
      addToast('Please enter profile text first', 'error');
      return;
    }
    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_PROFILE',
        payload: { profileText: t.trim() },
      });
      if (response?.error) throw new Error(response.error);
      if (response?.analysis) {
        setAnalysis(response.analysis);
        addToast('Profile analyzed!', 'success');
      }
    } catch (err: any) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [profileText, addToast]);

  const handleGenerateHeadlines = useCallback(async () => {
    if (!profileText.trim()) {
      addToast('Please enter profile text first', 'error');
      return;
    }
    setLoading(true);
    setHeadlines([]);
    setError('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_HEADLINES',
        payload: { profileText: profileText.trim() },
      });
      if (response?.error) throw new Error(response.error);
      if (response?.headlines) {
        setHeadlines(response.headlines);
        addToast(`Generated ${response.headlines.length} headlines!`, 'success');
      }
    } catch (err: any) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [profileText, addToast]);

  const handleGenerateSummary = useCallback(async () => {
    if (!profileText.trim()) {
      addToast('Please enter profile text first', 'error');
      return;
    }
    setStreamedText('');
    setError('');

    try {
      await startStream(
        settings.endpoint,
        settings.model,
        [
          {
            role: 'system',
            content: `You are a LinkedIn summary writing expert. Write in a ${summaryTone} tone. Write a compelling LinkedIn summary (About section) that is 150-300 words. Include a strong opening hook, key achievements with metrics, core skills and expertise, and a call to action.`,
          },
          {
            role: 'user',
            content: `Write an optimized LinkedIn summary in a ${summaryTone} tone for this profile:\n\n${profileText.trim()}`,
          },
        ]
      );
      addToast('Summary generated!', 'success');
    } catch (err: any) {
      setError(err.message);
      addToast(err.message, 'error');
    }
  }, [profileText, summaryTone, settings, startStream, addToast, setStreamedText]);

  const handleSaveSettings = useCallback(async (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (newSettings.theme) applyTheme(newSettings.theme);
    await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: updated });
    addToast('Settings saved', 'success');
  }, [settings, addToast]);

  const extractFromPage = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'EXTRACT_PROFILE' });
      if (response?.profileText) {
        setProfileText(response.profileText);
        addToast('Profile extracted from page!', 'success');
      } else {
        addToast('Could not extract profile. Make sure you\'re on a LinkedIn profile page.', 'error');
      }
    } catch {
      addToast('Failed to extract profile', 'error');
    }
  }, [addToast]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: 'analyze', label: 'Analyze',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
    },
    {
      key: 'headlines', label: 'Headlines',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h10M4 17h12" /></svg>,
    },
    {
      key: 'summary', label: 'Summary',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>,
    },
    {
      key: 'settings', label: 'Settings',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>,
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-surface-0">
      {/* Header */}
      <div className="glass border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-text-primary">ProfileForge AI</h1>
            <p className="text-2xs text-text-tertiary">AI-powered optimization workspace</p>
          </div>
          {favCount > 0 && (
            <span className="fav-badge" title={`${favCount} favorite${favCount !== 1 ? 's' : ''}`}>
              {favCount}
            </span>
          )}
          <button onClick={extractFromPage} className="btn-ghost text-xs flex items-center gap-1.5" title="Extract from current LinkedIn page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Extract
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 mt-3 -mb-3 px-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`tab-btn flex items-center gap-1.5 text-xs ${tab === t.key ? 'tab-btn-active' : ''}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile input (shared across tabs) */}
        {tab !== 'settings' && (
          <div className="px-4 pt-4 pb-2">
            <textarea
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              placeholder="Paste your LinkedIn profile text here (headline, summary, experience, skills...)"
              className="input-base resize-none text-xs"
              rows={4}
            />
          </div>
        )}

        {error && (
          <div className="mx-4 mt-2 card border-error/30 bg-error/5 animate-slide-up">
            <p className="text-xs text-error">{error}</p>
          </div>
        )}

        <div className="px-4 pb-4">
          {/* === ANALYZE TAB === */}
          {tab === 'analyze' && (
            <div className="space-y-4 pt-2">
              <button
                onClick={() => handleAnalyze()}
                disabled={loading || !profileText.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing Profile...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                    Analyze Profile
                  </>
                )}
              </button>

              {loading && (
                <div className="space-y-3">
                  <ScoreSkeleton />
                  {[1, 2, 3].map(i => <SectionSkeleton key={i} />)}
                </div>
              )}

              {analysis && (
                <div className="space-y-4 animate-fade-in">
                  {/* Score + Radar */}
                  <div className="glass-card p-6 flex flex-col items-center gap-4 relative">
                    <FavoriteButton
                      type="analysis"
                      content={JSON.stringify({ score: analysis.overallScore, timestamp: analysis.timestamp })}
                      label={`Profile Score: ${analysis.overallScore}`}
                      score={analysis.overallScore}
                      onToggle={handleFavToggle}
                      className="absolute top-3 right-3"
                    />
                    <ScoreRing score={analysis.overallScore} size={160} />

                    <div className="flex flex-wrap gap-2 justify-center">
                      {analysis.topStrengths.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 text-2xs font-medium bg-success/10 text-success rounded-lg">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Radar chart */}
                  <div className="glass-card p-4 flex justify-center">
                    <RadarChart sections={analysis.sections} size={240} />
                  </div>

                  {/* Section cards */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Section Breakdown
                    </h3>
                    {analysis.sections.map((section, i) => (
                      <SectionCard key={section.key} section={section} index={i} />
                    ))}
                  </div>

                  {/* Improvements */}
                  {analysis.topImprovements.length > 0 && (
                    <div className="card border-warning/20 bg-warning/5">
                      <h3 className="text-xs font-semibold text-warning mb-2 flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        Top Improvements
                      </h3>
                      <div className="space-y-1.5">
                        {analysis.topImprovements.map((imp, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                            <span className="text-warning font-bold text-2xs mt-0.5">{i + 1}</span>
                            <span>{imp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* === HEADLINES TAB === */}
          {tab === 'headlines' && (
            <div className="space-y-4 pt-2">
              <button
                onClick={handleGenerateHeadlines}
                disabled={loading || !profileText.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating Headlines...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Generate 10 Headlines
                  </>
                )}
              </button>

              {loading && <LoadingSkeleton lines={6} />}

              {headlines.length > 0 && (
                <div className="space-y-2">
                  {headlines.map((h, i) => (
                    <div
                      key={i}
                      className="card-interactive !p-3 animate-slide-up group"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary font-medium leading-snug">
                            {h.text}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="px-2 py-0.5 text-2xs font-medium bg-accent/10 text-accent rounded-md">
                              {h.tone}
                            </span>
                            <span className="text-2xs text-text-tertiary">{h.impact}</span>
                          </div>
                        </div>
                        <FavoriteButton
                          type="headline"
                          content={h.text}
                          label={h.tone}
                          onToggle={handleFavToggle}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                        <CopyButton text={h.text} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === SUMMARY TAB === */}
          {tab === 'summary' && (
            <div className="space-y-4 pt-2">
              {/* Tone selector */}
              <div className="flex gap-2">
                {TONES.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setSummaryTone(t.key)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all duration-200 ${
                      summaryTone === t.key
                        ? 'bg-accent text-white shadow-lg shadow-accent/20'
                        : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
                    }`}
                  >
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-2xs mt-0.5 opacity-70">{t.desc}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={streaming || !profileText.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {streaming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Writing Summary...
                    <button onClick={stopStream} className="ml-2 text-2xs underline opacity-70 hover:opacity-100">
                      Stop
                    </button>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                    </svg>
                    Write Summary
                  </>
                )}
              </button>

              {(streamedText || streaming) && (
                <div className="glass-card p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      {summaryTone} Summary
                    </span>
                    <div className="flex items-center gap-1">
                      {streamedText && !streaming && (
                        <>
                          <FavoriteButton
                            type="summary"
                            content={streamedText}
                            label={`${summaryTone} summary`}
                            onToggle={handleFavToggle}
                          />
                          <CopyButton text={streamedText} />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                    {streamedText}
                    {streaming && <span className="streaming-cursor" />}
                  </div>
                  {streamedText && !streaming && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-2xs text-text-tertiary">
                        {streamedText.split(/\s+/).length} words
                      </span>
                      <CopyButton text={streamedText} label="Copy Summary" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* === SETTINGS TAB === */}
          {tab === 'settings' && (
            <div className="space-y-4 pt-4">
              <h2 className="text-sm font-bold text-text-primary">Settings</h2>

              {/* Theme */}
              <div className="card">
                <label className="text-xs font-semibold text-text-secondary mb-2 block">Theme</label>
                <div className="flex gap-2">
                  {(['dark', 'light', 'system'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => handleSaveSettings({ theme: t })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                        settings.theme === t
                          ? 'bg-accent text-white'
                          : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Endpoint */}
              <div className="card">
                <label className="text-xs font-semibold text-text-secondary mb-2 block">API Endpoint</label>
                <input
                  type="text"
                  value={settings.endpoint}
                  onChange={(e) => setSettings(s => ({ ...s, endpoint: e.target.value }))}
                  onBlur={() => handleSaveSettings({ endpoint: settings.endpoint })}
                  className="input-base text-xs"
                  placeholder="https://sai.sharedllm.com/v1/chat/completions"
                />
              </div>

              {/* Model */}
              <div className="card">
                <label className="text-xs font-semibold text-text-secondary mb-2 block">Model</label>
                <input
                  type="text"
                  value={settings.model}
                  onChange={(e) => setSettings(s => ({ ...s, model: e.target.value }))}
                  onBlur={() => handleSaveSettings({ model: settings.model })}
                  className="input-base text-xs"
                  placeholder="gpt-oss:120b"
                />
                <div className="mt-2 space-y-1">
                  {['gpt-oss:120b', 'gpt-oss:70b', 'gpt-oss:8b'].map(m => (
                    <button
                      key={m}
                      onClick={() => handleSaveSettings({ model: m })}
                      className={`block w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all ${
                        settings.model === m
                          ? 'bg-accent/10 text-accent font-medium'
                          : 'text-text-tertiary hover:bg-surface-2 hover:text-text-secondary'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keyboard shortcuts */}
              <div className="card">
                <label className="text-xs font-semibold text-text-secondary mb-2 block">Keyboard Shortcuts</label>
                <div className="space-y-2 text-xs text-text-tertiary">
                  <div className="flex items-center justify-between">
                    <span>Open Extension</span>
                    <kbd className="px-2 py-1 bg-surface-3 rounded text-2xs font-mono">Ctrl+Shift+L</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Command Palette</span>
                    <kbd className="px-2 py-1 bg-surface-3 rounded text-2xs font-mono">Ctrl+Shift+K</kbd>
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="card">
                <label className="text-xs font-semibold text-text-secondary mb-2 block">About</label>
                <p className="text-xs text-text-tertiary">
                  ProfileForge AI v1.0.0
                </p>
                <p className="text-2xs text-text-tertiary mt-1">
                  AI-powered profile analysis and optimization.
                  Scores your profile across 5 key sections, generates headlines, and writes summaries.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
