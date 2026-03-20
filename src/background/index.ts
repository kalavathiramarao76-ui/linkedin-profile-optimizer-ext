import { callAI, buildAnalysisPrompt, buildHeadlinePrompt, buildSummaryPrompt } from './api';
import { getSettings, saveSettings, saveAnalysis, addToHistory } from '@/shared/storage';
import { ProfileAnalysis } from '@/shared/types';

// Open side panel on action click
chrome.sidePanel?.setOptions?.({ enabled: true }).catch(() => {});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try {
      await (chrome.sidePanel as any).open({ tabId: tab.id });
    } catch {
      // Fallback: popup handles it
    }
  }
});

// Handle commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-command-palette') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_COMMAND_PALETTE' }).catch(() => {});
    }
  }
});

// Handle messages from popup, sidepanel, and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((err) => {
    sendResponse({ error: err.message || 'Unknown error' });
  });
  return true; // async response
});

async function handleMessage(message: any, _sender: chrome.runtime.MessageSender): Promise<any> {
  switch (message.type) {
    case 'ANALYZE_PROFILE': {
      const { profileText } = message.payload;
      const messages = buildAnalysisPrompt(profileText);
      const response = await callAI(messages, false);
      const content = response.choices?.[0]?.message?.content || '';

      // Parse JSON from response
      let analysis: ProfileAnalysis;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        analysis = {
          ...parsed,
          timestamp: Date.now(),
        };
      } catch {
        throw new Error('Failed to parse AI response. Please try again.');
      }

      await saveAnalysis(analysis);
      await addToHistory(analysis);
      return { analysis };
    }

    case 'GENERATE_HEADLINES': {
      const { profileText } = message.payload;
      const messages = buildHeadlinePrompt(profileText);
      const response = await callAI(messages, false);
      const content = response.choices?.[0]?.message?.content || '';

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const headlines = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        return { headlines };
      } catch {
        throw new Error('Failed to parse headlines. Please try again.');
      }
    }

    case 'GENERATE_SUMMARY': {
      const { profileText, tone } = message.payload;
      const messages = buildSummaryPrompt(profileText, tone);
      const response = await callAI(messages, false);
      const content = response.choices?.[0]?.message?.content || '';
      return { summary: content.trim() };
    }

    case 'OPEN_SIDE_PANEL': {
      const tabId = message.payload?.tabId;
      if (tabId) {
        try {
          await (chrome.sidePanel as any).open({ tabId });
        } catch {
          // May not be supported
        }
      }
      return { ok: true };
    }

    case 'GET_SETTINGS': {
      return await getSettings();
    }

    case 'SAVE_SETTINGS': {
      return await saveSettings(message.payload);
    }

    case 'EXTRACT_PROFILE': {
      // Forward to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id!, { type: 'EXTRACT_PROFILE' }, (response) => {
            resolve(response || { error: 'No response from content script' });
          });
        });
      }
      return { error: 'No active tab' };
    }

    default:
      return { error: 'Unknown message type' };
  }
}
