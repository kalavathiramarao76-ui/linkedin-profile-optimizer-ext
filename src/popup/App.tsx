import React, { useState, useCallback, useEffect } from 'react';
import { ScoreRing } from '@/ui/components/ScoreRing';
import { LoadingSkeleton, ScoreSkeleton } from '@/ui/components/LoadingSkeleton';
import { ToastContainer } from '@/ui/components/Toast';
import { useToast } from '@/ui/hooks/useToast';
import { FavoriteButton } from '@/ui/FavoriteButton';
import { getFavoritesCount } from '@/shared/favorites';
import { ProfileAnalysis } from '@/shared/types';
import { getScoreColor, getScoreLabel, SECTION_LABELS } from '@/shared/constants';

export function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [error, setError] = useState('');
  const [favCount, setFavCount] = useState(0);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    getFavoritesCount().then(setFavCount);
  }, []);

  const handleFavToggle = useCallback((added: boolean, count: number) => {
    setFavCount(count);
    addToast(added ? 'Added to favorites' : 'Removed from favorites', added ? 'success' : 'info');
  }, [addToast]);

  const handleAnalyze = useCallback(async () => {
    if (!input.trim()) {
      addToast('Please paste your LinkedIn profile text or URL', 'error');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_PROFILE',
        payload: { profileText: input.trim() },
      });

      if (response?.error) throw new Error(response.error);
      if (response?.analysis) {
        setAnalysis(response.analysis);
        addToast('Profile analyzed successfully!', 'success');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze profile');
      addToast(err.message || 'Analysis failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [input, addToast]);

  const openSidePanel = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      if (input.trim()) {
        await chrome.storage.local.set({
          extractedProfile: input.trim(),
          extractedAt: Date.now(),
        });
      }
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL', payload: { tabId: tab.id } });
    }
  }, [input]);

  return (
    <div className="w-[400px] h-[500px] flex flex-col bg-surface-0 overflow-hidden">
      {/* Header */}
      <div className="glass-card m-3 mb-0 p-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">ProfileForge AI</h1>
            <p className="text-2xs text-text-tertiary">AI-powered LinkedIn profile optimization</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {!analysis ? (
          <>
            {/* Input area */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary">
                Paste your LinkedIn profile text
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your LinkedIn headline, summary, experience, skills... or a LinkedIn URL"
                className="input-base resize-none"
                rows={6}
                disabled={loading}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleAnalyze}
                disabled={loading || !input.trim()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                    Get Score
                  </>
                )}
              </button>
              <button onClick={openSidePanel} className="btn-ghost flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M15 3v18" />
                </svg>
                Full View
              </button>
            </div>

            {loading && <ScoreSkeleton />}

            {error && (
              <div className="card border-error/30 bg-error/5 animate-slide-up">
                <p className="text-xs text-error">{error}</p>
              </div>
            )}

            {/* Quick tips */}
            <div className="card animate-fade-in">
              <h3 className="text-xs font-semibold text-text-primary mb-2">Quick Tips</h3>
              <div className="space-y-1.5">
                {[
                  'Include your full headline and summary',
                  'Add work experience with metrics',
                  'List your top skills and certifications',
                  'Use the Side Panel for full analysis',
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-2xs text-text-tertiary">
                    <span className="text-accent mt-0.5">&#x2022;</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Results */
          <div className="space-y-3 animate-fade-in">
            {/* Score ring */}
            <div className="flex justify-center py-2 relative">
              <FavoriteButton
                type="analysis"
                content={JSON.stringify({ score: analysis.overallScore, timestamp: analysis.timestamp })}
                label={`Profile Score: ${analysis.overallScore}`}
                score={analysis.overallScore}
                onToggle={handleFavToggle}
                className="absolute top-2 right-0"
              />
              <ScoreRing score={analysis.overallScore} />
            </div>

            {/* Section scores */}
            <div className="space-y-2">
              {analysis.sections.map((section, i) => {
                const pct = Math.round((section.score / section.maxScore) * 100);
                const color = getScoreColor(pct);
                return (
                  <div key={section.key} className="card !p-3 animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-text-primary">
                        {SECTION_LABELS[section.key]}
                      </span>
                      <span className="text-xs font-bold" style={{ color }}>
                        {section.score}/{section.maxScore}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <p className="text-2xs text-text-tertiary mt-1 line-clamp-2">{section.feedback}</p>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => { setAnalysis(null); setInput(''); }}
                className="btn-ghost flex-1"
              >
                New Analysis
              </button>
              <button onClick={openSidePanel} className="btn-primary flex-1 flex items-center justify-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M15 3v18" />
                </svg>
                Deep Analysis
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border/50">
        <div className="flex items-center justify-between text-2xs text-text-tertiary">
          <span className="flex items-center gap-1.5">
            ProfileForge AI v1.0
            {favCount > 0 && <span className="fav-badge">{favCount}</span>}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-surface-3 rounded text-2xs font-mono">Ctrl+Shift+K</kbd>
            <span>Commands</span>
          </span>
        </div>
      </div>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
