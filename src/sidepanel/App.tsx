import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { incrementUsage } from '@/shared/usage';
import { ScoreRing } from '@/ui/components/ScoreRing';
import { RadarChart } from '@/ui/components/RadarChart';
import { SectionCard } from '@/ui/components/SectionCard';
import { CopyButton } from '@/ui/components/CopyButton';
import { LoadingSkeleton, ScoreSkeleton, SectionSkeleton } from '@/ui/components/LoadingSkeleton';
import { ToastContainer } from '@/ui/components/Toast';
import { useToast } from '@/ui/hooks/useToast';
import { useStreamingResponse } from '@/ui/hooks/useStreamingResponse';
import { FavoriteButton } from '@/ui/FavoriteButton';
import { CommandPalette, useCommandPalette } from '@/ui/CommandPalette';
import { ExportMenu } from '@/ui/ExportMenu';
import { ApiErrorFallback } from '@/ui/ApiErrorFallback';
import { getFavoritesCount } from '@/shared/favorites';
import { ProfileAnalysis, GeneratedHeadline, Settings } from '@/shared/types';
import { TONES, getScoreColor, getScoreLabel, DEFAULT_ENDPOINT, DEFAULT_MODEL, SECTION_LABELS } from '@/shared/constants';

const AVAILABLE_MODELS = ['gpt-oss:120b', 'gpt-oss:20b', 'qwen2.5:3b'];

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

  const [apiError, setApiError] = useState<string | null>(null);
  const lastApiActionRef = React.useRef<(() => void) | null>(null);
  const [clearingData, setClearingData] = useState(false);

  const [favCount, setFavCount] = useState(0);
  const { toasts, addToast, removeToast } = useToast();
  const { streaming, streamedText, startStream, stopStream, setStreamedText } = useStreamingResponse();
  const { isOpen: cmdOpen, close: cmdClose } = useCommandPalette();

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
    setApiError(null);
    setAnalysis(null);
    lastApiActionRef.current = () => handleAnalyze(t);

    try {
      incrementUsage();
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
      setApiError(err.message);
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
    setApiError(null);
    lastApiActionRef.current = handleGenerateHeadlines;

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
      setApiError(err.message);
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
    setApiError(null);
    lastApiActionRef.current = handleGenerateSummary;

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
      setApiError(err.message);
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

  const handleClearData = useCallback(async () => {
    setClearingData(true);
    try {
      await chrome.storage.local.clear();
      setSettings({ endpoint: DEFAULT_ENDPOINT, model: DEFAULT_MODEL, theme: 'dark' });
      setAnalysis(null);
      setHeadlines([]);
      setStreamedText('');
      setFavCount(0);
      setProfileText('');
      applyTheme('dark');
      addToast('All data cleared', 'success');
    } catch {
      addToast('Failed to clear data', 'error');
    } finally {
      setClearingData(false);
    }
  }, [addToast, setStreamedText]);

  const handleApiRetry = useCallback(() => {
    setApiError(null);
    setError('');
    if (lastApiActionRef.current) lastApiActionRef.current();
  }, []);

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

  const commands = useMemo(() => [
    {
      id: 'analyze', label: 'Analyze Profile',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
      action: () => { setTab('analyze'); if (profileText.trim()) handleAnalyze(); },
    },
    {
      id: 'headlines', label: 'Generate Headlines',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h10M4 17h12"/></svg>,
      action: () => { setTab('headlines'); },
    },
    {
      id: 'summary', label: 'Write Summary',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>,
      action: () => { setTab('summary'); },
    },
    {
      id: 'favorites', label: 'View Favorites',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/></svg>,
      action: () => { addToast(`You have ${favCount} favorite${favCount !== 1 ? 's' : ''} saved`, 'info'); },
    },
    {
      id: 'theme', label: 'Toggle Theme',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
      action: () => {
        const next = settings.theme === 'dark' ? 'light' : 'dark';
        handleSaveSettings({ theme: next });
      },
    },
    {
      id: 'settings', label: 'Settings',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
      action: () => setTab('settings'),
    },
    {
      id: 'sidepanel', label: 'Open Side Panel',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/></svg>,
      action: () => addToast('You are already in the side panel', 'info'),
    },
    {
      id: 'help', label: 'Help',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>,
      action: () => addToast('Paste your LinkedIn profile text to analyze, generate headlines, or write summaries', 'info'),
    },
  ], [profileText, settings, favCount, handleAnalyze, handleSaveSettings, addToast]);

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
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
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
            <h1 className="text-sm font-bold text-text-primary">ProfiluxAI</h1>
            <p className="text-2xs text-text-tertiary">AI-powered optimization workspace <kbd className="px-1 py-0.5 bg-surface-3/60 rounded text-2xs font-mono text-text-tertiary ml-1 no-print" title="Command Palette">&#8984;&#8679;K</kbd></p>
          </div>
          {favCount > 0 && (
            <span className="fav-badge" title={`${favCount} favorite${favCount !== 1 ? 's' : ''}`}>
              {favCount}
            </span>
          )}
          <ExportMenu
            analysis={analysis}
            headlines={headlines}
            summaryText={streamedText}
            summaryTone={summaryTone}
            onToast={addToast}
          />
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

        {apiError && !loading && (
          <div className="mx-4 mt-2">
            <ApiErrorFallback
              error={apiError}
              onRetry={handleApiRetry}
              onDismiss={() => { setApiError(null); setError(''); }}
            />
          </div>
        )}

        {error && !apiError && (
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
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                Settings
              </h2>

              {/* AI Endpoint */}
              <div className="card">
                <label className="text-xs font-semibold text-text-secondary mb-1 block">AI Endpoint</label>
                <p className="text-2xs text-text-tertiary mb-2">Custom Ollama-compatible endpoint URL</p>
                <input
                  type="text"
                  value={settings.endpoint}
                  onChange={(e) => setSettings(s => ({ ...s, endpoint: e.target.value }))}
                  onBlur={() => handleSaveSettings({ endpoint: settings.endpoint })}
                  className="input-base text-xs font-mono"
                  placeholder="https://sai.sharedllm.com/v1/chat/completions"
                />
                <button
                  onClick={() => handleSaveSettings({ endpoint: DEFAULT_ENDPOINT })}
                  className="mt-2 text-2xs text-accent hover:underline"
                >
                  Reset to default
                </button>
              </div>

              {/* Model */}
              <div className="card">
                <label className="text-xs font-semibold text-text-secondary mb-1 block">Model</label>
                <p className="text-2xs text-text-tertiary mb-2">Select or type a model name</p>
                <select
                  value={AVAILABLE_MODELS.includes(settings.model) ? settings.model : '__custom__'}
                  onChange={(e) => {
                    if (e.target.value !== '__custom__') {
                      handleSaveSettings({ model: e.target.value });
                    }
                  }}
                  className="input-base text-xs mb-2 cursor-pointer"
                  aria-label="Select AI model"
                >
                  {AVAILABLE_MODELS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  {!AVAILABLE_MODELS.includes(settings.model) && (
                    <option value="__custom__">{settings.model} (custom)</option>
                  )}
                </select>
                <div className="flex gap-1.5 flex-wrap">
                  {AVAILABLE_MODELS.map(m => (
                    <button
                      key={m}
                      onClick={() => handleSaveSettings({ model: m })}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                        settings.model === m
                          ? 'bg-accent text-white font-medium shadow-sm shadow-accent/20'
                          : 'bg-surface-2 text-text-tertiary hover:bg-surface-3 hover:text-text-secondary'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div className="card">
                <label className="text-xs font-semibold text-text-secondary mb-2 block">Theme</label>
                <div className="flex gap-2">
                  {(['dark', 'light', 'system'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => handleSaveSettings({ theme: t })}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                        settings.theme === t
                          ? 'bg-accent text-white shadow-sm shadow-accent/20'
                          : 'bg-surface-2 text-text-secondary hover:bg-surface-3'
                      }`}
                    >
                      {t === 'dark' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
                      )}
                      {t === 'light' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                      )}
                      {t === 'system' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
                      )}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Data */}
              <div className="card border-error/20">
                <label className="text-xs font-semibold text-text-secondary mb-1 block">Clear Data</label>
                <p className="text-2xs text-text-tertiary mb-3">
                  Remove all favorites, analysis history, and settings. This action cannot be undone.
                </p>
                <button
                  onClick={handleClearData}
                  disabled={clearingData}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {clearingData ? (
                    <>
                      <div className="w-3 h-3 border-2 border-error/30 border-t-error rounded-full animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                      Clear All Data
                    </>
                  )}
                </button>
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
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/20">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">ProfiluxAI</p>
                    <p className="text-2xs text-text-tertiary">v1.0.0</p>
                  </div>
                </div>
                <p className="text-2xs text-text-tertiary leading-relaxed">
                  AI-powered LinkedIn profile analysis and optimization.
                  Scores your profile across 5 key sections, generates headlines, and writes summaries.
                </p>
                <div className="mt-3 pt-3 border-t border-border/50 flex gap-3">
                  <a
                    href="https://github.com/kalavathiramarao76-ui/linkedin-profile-optimizer-ext"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xs text-accent hover:underline flex items-center gap-1"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                    GitHub
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Command Palette */}
      {cmdOpen && <CommandPalette commands={commands} onClose={cmdClose} />}

      {/* Print-only report */}
      <div className="print-report" style={{ display: 'none' }}>
        <h1>ProfiluxAI Analysis Report</h1>
        <div className="print-subtitle">Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>

        {analysis && (
          <>
            <h2>Profile Score</h2>
            <div className="print-score">{analysis.overallScore}/100</div>
            {analysis.topStrengths.length > 0 && (
              <>
                <h3>Strengths</h3>
                <ul>{analysis.topStrengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </>
            )}
            <h3>Section Breakdown</h3>
            {analysis.sections.map(s => (
              <div key={s.key} className="print-section-row">
                <span><strong>{SECTION_LABELS[s.key] || s.key}</strong></span>
                <span>{s.score}/{s.maxScore} ({Math.round((s.score / s.maxScore) * 100)}%)</span>
              </div>
            ))}
            {analysis.topImprovements.length > 0 && (
              <>
                <h3>Top Improvements</h3>
                <ol>{analysis.topImprovements.map((imp, i) => <li key={i}>{imp}</li>)}</ol>
              </>
            )}
          </>
        )}

        {headlines.length > 0 && (
          <>
            <h2>Generated Headlines</h2>
            {headlines.map((h, i) => (
              <div key={i} className="print-headline">
                <strong>{i + 1}. {h.text}</strong>
                <br /><small>Tone: {h.tone} | Impact: {h.impact}</small>
              </div>
            ))}
          </>
        )}

        {streamedText && (
          <>
            <h2>Generated Summary ({summaryTone})</h2>
            <div className="print-summary">{streamedText}</div>
          </>
        )}

        <div className="print-footer">Generated by ProfiluxAI &mdash; LinkedIn Profile Optimizer</div>
      </div>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
