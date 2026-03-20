// Content script for LinkedIn.com
// Adds floating "Optimize" button and extracts profile data

const BUTTON_ID = 'lpo-optimize-btn';
const PALETTE_ID = 'lpo-command-palette';

function isProfilePage(): boolean {
  return window.location.pathname.startsWith('/in/');
}

function extractProfileText(): string {
  const sections: string[] = [];

  // Name
  const nameEl = document.querySelector('.text-heading-xlarge, h1.inline.t-24');
  if (nameEl?.textContent) sections.push(`Name: ${nameEl.textContent.trim()}`);

  // Headline
  const headlineEl = document.querySelector('.text-body-medium.break-words, .pv-text-details--left-panel .text-body-medium');
  if (headlineEl?.textContent) sections.push(`Headline: ${headlineEl.textContent.trim()}`);

  // Location
  const locationEl = document.querySelector('.text-body-small.inline.t-black--light.break-words, span.t-black--light.t-normal.t-14');
  if (locationEl?.textContent) sections.push(`Location: ${locationEl.textContent.trim()}`);

  // About / Summary
  const aboutSection = document.querySelector('#about ~ .display-flex .inline-show-more-text, [id*="about"] .pv-shared-text-with-see-more span[aria-hidden="true"]');
  if (aboutSection?.textContent) {
    sections.push(`\nAbout:\n${aboutSection.textContent.trim()}`);
  } else {
    // Fallback: try broader selector
    const aboutAlt = document.querySelector('.pv-about-section .pv-about__summary-text, .pv-shared-text-with-see-more');
    if (aboutAlt?.textContent) sections.push(`\nAbout:\n${aboutAlt.textContent.trim()}`);
  }

  // Experience
  const experienceItems = document.querySelectorAll('#experience ~ .pvs-list__outer-container .pvs-entity--padded, [id*="experience"] li.artdeco-list__item');
  if (experienceItems.length > 0) {
    sections.push('\nExperience:');
    experienceItems.forEach(item => {
      const text = item.textContent?.trim().replace(/\s+/g, ' ');
      if (text) sections.push(`- ${text}`);
    });
  }

  // Skills
  const skillItems = document.querySelectorAll('#skills ~ .pvs-list__outer-container .pvs-entity--padded, [id*="skills"] .pvs-entity__path-node span');
  if (skillItems.length > 0) {
    sections.push('\nSkills:');
    const skills: string[] = [];
    skillItems.forEach(item => {
      const text = item.textContent?.trim().replace(/\s+/g, ' ');
      if (text && text.length < 100) skills.push(text);
    });
    sections.push(skills.join(', '));
  }

  // Education
  const eduItems = document.querySelectorAll('#education ~ .pvs-list__outer-container .pvs-entity--padded');
  if (eduItems.length > 0) {
    sections.push('\nEducation:');
    eduItems.forEach(item => {
      const text = item.textContent?.trim().replace(/\s+/g, ' ');
      if (text) sections.push(`- ${text}`);
    });
  }

  // Fallback: if very little extracted, grab the whole main section
  if (sections.length < 3) {
    const mainContent = document.querySelector('main.scaffold-layout__main, .scaffold-layout__main');
    if (mainContent?.textContent) {
      return mainContent.textContent.trim().replace(/\s+/g, ' ').slice(0, 5000);
    }
  }

  return sections.join('\n');
}

function createFloatingButton(): void {
  if (document.getElementById(BUTTON_ID)) return;
  if (!isProfilePage()) return;

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
    </svg>
    <span>Optimize</span>
  `;

  Object.assign(btn.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '10000',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 4px 24px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
    transition: 'all 200ms ease',
    backdropFilter: 'blur(12px)',
  });

  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-2px) scale(1.02)';
    btn.style.boxShadow = '0 8px 32px rgba(99, 102, 241, 0.5), 0 0 0 1px rgba(255,255,255,0.2) inset';
  });

  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translateY(0) scale(1)';
    btn.style.boxShadow = '0 4px 24px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset';
  });

  btn.addEventListener('click', async () => {
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      <span>Extracting...</span>
    `;

    const profileText = extractProfileText();

    // Store in chrome.storage for side panel to pick up
    await chrome.storage.local.set({
      extractedProfile: profileText,
      extractedAt: Date.now(),
    });

    // Open side panel
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });

    // Reset button
    setTimeout(() => {
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/>
        </svg>
        <span>Optimize</span>
      `;
    }, 2000);
  });

  document.body.appendChild(btn);
}

function removeFloatingButton(): void {
  const btn = document.getElementById(BUTTON_ID);
  if (btn) btn.remove();
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_PROFILE') {
    const text = extractProfileText();
    sendResponse({ profileText: text });
  } else if (message.type === 'TOGGLE_COMMAND_PALETTE') {
    toggleCommandPalette();
  }
  return true;
});

function toggleCommandPalette(): void {
  const existing = document.getElementById(PALETTE_ID);
  if (existing) {
    existing.remove();
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = PALETTE_ID;
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '99999',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '20vh',
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
  });

  const palette = document.createElement('div');
  Object.assign(palette.style, {
    width: '400px',
    maxWidth: '90vw',
    background: '#18181b',
    borderRadius: '16px',
    border: '1px solid #27272a',
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    animation: 'fadeIn 150ms ease-out',
  });

  const actions = [
    { label: 'Analyze Profile', icon: 'chart', action: 'analyze' },
    { label: 'Generate Headlines', icon: 'edit', action: 'headlines' },
    { label: 'Write Summary', icon: 'doc', action: 'summary' },
    { label: 'Open Side Panel', icon: 'panel', action: 'panel' },
  ];

  palette.innerHTML = `
    <div style="padding: 12px 16px; border-bottom: 1px solid #27272a;">
      <input type="text" placeholder="Type a command..." style="width: 100%; background: transparent; border: none; outline: none; color: #fafafa; font-size: 14px; font-family: inherit;" />
    </div>
    <div style="padding: 8px;">
      ${actions.map(a => `
        <button data-action="${a.action}" style="display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px 12px; background: transparent; border: none; color: #a1a1aa; cursor: pointer; border-radius: 8px; font-size: 13px; font-family: inherit; text-align: left; transition: all 100ms;"
          onmouseenter="this.style.background='#27272a';this.style.color='#fafafa'"
          onmouseleave="this.style.background='transparent';this.style.color='#a1a1aa'">
          <span style="color: #6366f1; font-weight: 600; width: 20px; text-align: center;">${a.icon[0].toUpperCase()}</span>
          ${a.label}
        </button>
      `).join('')}
    </div>
  `;

  overlay.appendChild(palette);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  palette.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('[data-action]');
    if (!btn) return;
    const action = (btn as HTMLElement).dataset.action;

    overlay.remove();

    if (action === 'panel' || action === 'analyze' || action === 'headlines' || action === 'summary') {
      const profileText = extractProfileText();
      await chrome.storage.local.set({
        extractedProfile: profileText,
        extractedAt: Date.now(),
        pendingAction: action,
      });
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    }
  });

  // Close on Escape
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', handleKey);
    }
  };
  document.addEventListener('keydown', handleKey);

  document.body.appendChild(overlay);

  // Focus input
  const input = palette.querySelector('input');
  if (input) (input as HTMLInputElement).focus();
}

// Initialize
function init(): void {
  if (isProfilePage()) {
    createFloatingButton();
  }

  // Watch for navigation (LinkedIn is SPA)
  const observer = new MutationObserver(() => {
    if (isProfilePage()) {
      createFloatingButton();
    } else {
      removeFloatingButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also handle popstate
  window.addEventListener('popstate', () => {
    if (isProfilePage()) createFloatingButton();
    else removeFloatingButton();
  });
}

// Inject animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .animate-spin { animation: spin 1s linear infinite; }
`;
document.head.appendChild(style);

init();
