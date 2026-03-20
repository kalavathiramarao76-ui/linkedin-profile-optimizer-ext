import { DEFAULT_ENDPOINT, DEFAULT_MODEL } from '@/shared/constants';
import { getSettings } from '@/shared/storage';

export async function callAI(
  messages: Array<{ role: string; content: string }>,
  stream = false,
): Promise<any> {
  const settings = await getSettings();
  const endpoint = settings.endpoint || DEFAULT_ENDPOINT;
  const model = settings.model || DEFAULT_MODEL;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  if (!stream) {
    return response.json();
  }

  return response;
}

export function buildAnalysisPrompt(profileText: string): Array<{ role: string; content: string }> {
  return [
    {
      role: 'system',
      content: `You are a LinkedIn profile optimization expert. Analyze profiles and return ONLY valid JSON.
Respond with this exact JSON structure:
{
  "overallScore": <number 0-100>,
  "sections": [
    {
      "name": "Headline",
      "key": "headline",
      "score": <number 0-20>,
      "maxScore": 20,
      "feedback": "<1-2 sentence feedback>",
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    },
    {
      "name": "Summary",
      "key": "summary",
      "score": <number 0-20>,
      "maxScore": 20,
      "feedback": "<1-2 sentence feedback>",
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    },
    {
      "name": "Experience",
      "key": "experience",
      "score": <number 0-20>,
      "maxScore": 20,
      "feedback": "<1-2 sentence feedback>",
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    },
    {
      "name": "Skills",
      "key": "skills",
      "score": <number 0-20>,
      "maxScore": 20,
      "feedback": "<1-2 sentence feedback>",
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    },
    {
      "name": "Keywords",
      "key": "keywords",
      "score": <number 0-20>,
      "maxScore": 20,
      "feedback": "<1-2 sentence feedback>",
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    }
  ],
  "topStrengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "topImprovements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"]
}`,
    },
    {
      role: 'user',
      content: `Analyze this LinkedIn profile and rate it:\n\n${profileText}`,
    },
  ];
}

export function buildHeadlinePrompt(profileText: string): Array<{ role: string; content: string }> {
  return [
    {
      role: 'system',
      content: `You are a LinkedIn headline optimization expert. Generate exactly 10 compelling headline alternatives. Return ONLY valid JSON array:
[
  {"text": "<headline>", "tone": "<Professional|Creative|Executive|Bold|Minimal>", "impact": "<why this works in 10 words>"},
  ...
]
Each headline should be under 120 characters, keyword-rich, and attention-grabbing.`,
    },
    {
      role: 'user',
      content: `Generate 10 optimized LinkedIn headlines for this profile:\n\n${profileText}`,
    },
  ];
}

export function buildSummaryPrompt(profileText: string, tone: string): Array<{ role: string; content: string }> {
  const toneGuide: Record<string, string> = {
    professional: 'Write in a clear, authoritative, corporate tone. Focus on achievements and expertise.',
    creative: 'Write in an engaging, storytelling style. Use vivid language and show personality.',
    executive: 'Write in a C-suite, strategic, visionary tone. Focus on leadership and impact.',
  };

  return [
    {
      role: 'system',
      content: `You are a LinkedIn summary writing expert. ${toneGuide[tone] || toneGuide.professional}
Write a compelling LinkedIn summary (About section) that is 150-300 words. Return ONLY the summary text, no JSON wrapping.
Include:
- A strong opening hook
- Key achievements with metrics where possible
- Core skills and expertise
- A call to action at the end`,
    },
    {
      role: 'user',
      content: `Write an optimized LinkedIn summary in a ${tone} tone for this profile:\n\n${profileText}`,
    },
  ];
}
