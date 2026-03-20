export const DEFAULT_ENDPOINT = 'https://sai.sharedllm.com/v1/chat/completions';
export const DEFAULT_MODEL = 'gpt-oss:120b';

export const SECTION_LABELS: Record<string, string> = {
  headline: 'Headline',
  summary: 'Summary',
  experience: 'Experience',
  skills: 'Skills',
  keywords: 'Keywords',
};

export const SECTION_ICONS: Record<string, string> = {
  headline: 'H',
  summary: 'S',
  experience: 'E',
  skills: 'K',
  keywords: 'W',
};

export const SCORE_COLORS = {
  excellent: '#22c55e',
  good: '#6366f1',
  average: '#f59e0b',
  poor: '#ef4444',
} as const;

export function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLORS.excellent;
  if (score >= 60) return SCORE_COLORS.good;
  if (score >= 40) return SCORE_COLORS.average;
  return SCORE_COLORS.poor;
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Needs Work';
  return 'Poor';
}

export const TONES = [
  { key: 'professional' as const, label: 'Professional', desc: 'Clear, authoritative, corporate' },
  { key: 'creative' as const, label: 'Creative', desc: 'Engaging, storytelling, unique' },
  { key: 'executive' as const, label: 'Executive', desc: 'C-suite, strategic, visionary' },
];
