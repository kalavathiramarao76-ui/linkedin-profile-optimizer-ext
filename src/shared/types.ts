export interface ProfileSection {
  name: string;
  key: SectionKey;
  score: number;
  maxScore: number;
  feedback: string;
  suggestions: string[];
}

export type SectionKey = 'headline' | 'summary' | 'experience' | 'skills' | 'keywords';

export interface ProfileAnalysis {
  overallScore: number;
  sections: ProfileSection[];
  topStrengths: string[];
  topImprovements: string[];
  timestamp: number;
}

export interface GeneratedHeadline {
  text: string;
  tone: string;
  impact: string;
}

export interface GeneratedSummary {
  text: string;
  tone: 'professional' | 'creative' | 'executive';
  wordCount: number;
}

export interface Settings {
  endpoint: string;
  model: string;
  theme: 'dark' | 'light' | 'system';
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export type MessageAction =
  | { type: 'ANALYZE_PROFILE'; payload: { profileText: string } }
  | { type: 'GENERATE_HEADLINES'; payload: { profileText: string } }
  | { type: 'GENERATE_SUMMARY'; payload: { profileText: string; tone: string } }
  | { type: 'OPEN_SIDE_PANEL'; payload?: { tabId?: number } }
  | { type: 'EXTRACT_PROFILE' }
  | { type: 'PROFILE_EXTRACTED'; payload: { profileText: string } }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; payload: Settings }
  | { type: 'STREAM_CHUNK'; payload: StreamChunk }
  | { type: 'STREAM_START'; payload: { requestId: string } }
  | { type: 'STREAM_END'; payload: { requestId: string } }
  | { type: 'STREAM_ERROR'; payload: { error: string; requestId: string } };

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}
