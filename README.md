<p align="center"><img src="src/assets/icons/logo.svg" width="128" height="128" alt="ProfiluxAI Logo"></p>

# ProfiluxAI — AI LinkedIn Profile Optimizer

![Version](https://img.shields.io/badge/version-1.0.0-6366F1)
![License](https://img.shields.io/badge/license-ISC-green)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

> Analyze, score, and optimize your LinkedIn profile with AI-powered insights, headline generation, and summary writing — extracted directly from your LinkedIn page.

---

## Features

- :bar_chart: **5-Section Analysis** — Scores Headline, Summary, Experience, Skills, and Keywords (20 points each, 100 total)
- :doughnut: **Score Ring + Radar Chart** — Visual dashboard showing your profile strength at a glance
- :bulb: **Headline Generator** — Generates 10 alternative headlines tailored to your industry and goals
- :memo: **Summary Writer** — Creates professional summaries in 3 tones: Professional, Creative, and Executive
- :mag: **Profile Extraction** — Automatically extracts profile data from LinkedIn pages via content scripts
- :file_cabinet: **Analysis History** — Stores up to 20 past analyses for tracking improvement over time
- :large_blue_diamond: **Indigo Theme** — Sophisticated, premium UI with indigo accents

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling with typography plugin |
| **Vite** | Build tool & dev server |
| **Firebase** | Authentication & data persistence |
| **Chrome Extensions API** | Browser integration & profile extraction |

---

## Installation

### From Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/linkedin-profile-optimizer-ext.git
   cd linkedin-profile-optimizer-ext
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load into Chrome**
   - Open `chrome://extensions/`
   - Enable **Developer mode** (top right)
   - Click **Load unpacked**
   - Select the `dist/` folder

### Development Mode

```bash
npm run dev
```
Runs Vite in watch mode with automatic rebuilds on file changes.

---

## Usage

### Analyzing Your Profile
1. Navigate to your **LinkedIn profile page**
2. Click the **ProfiluxAI** icon in the toolbar or open the side panel
3. The extension automatically extracts your profile data
4. View your **overall score (0-100)** with the score ring visualization

### Understanding Your Score
Each section is scored out of 20 points:

| Section | What It Evaluates |
|---|---|
| **Headline** | Clarity, keywords, value proposition |
| **Summary** | Length, storytelling, keywords, call-to-action |
| **Experience** | Detail, achievements, quantified results |
| **Skills** | Relevance, endorsements, completeness |
| **Keywords** | SEO optimization, industry terms, discoverability |

### Generating Headlines
1. Navigate to the **Headline Generator** tab
2. Review **10 AI-generated alternatives** for your headline
3. Click to copy and paste into your LinkedIn profile

### Writing Summaries
1. Open the **Summary Writer** section
2. Choose a tone: **Professional**, **Creative**, or **Executive**
3. Edit the generated summary to add personal touches
4. Copy directly to your LinkedIn profile

### Tracking Progress
- Each analysis is saved to **Analysis History** (up to 20 entries)
- Compare scores over time to measure improvement
- View the **Radar Chart** for a visual breakdown of strengths and weaknesses

---

## Architecture

```
linkedin-profile-optimizer-ext/
├── src/
│   ├── popup/              # Extension popup with score overview
│   ├── sidepanel/          # Full analysis dashboard
│   ├── background/         # Service worker & data processing
│   ├── content/            # Content scripts for LinkedIn extraction
│   ├── shared/             # Shared utilities, types, constants
│   ├── ui/                 # Reusable UI components
│   └── assets/
│       └── icons/          # Extension icons (16, 48, 128px)
├── dist/                   # Built extension output
├── vite.config.ts          # Vite build configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── manifest.json           # Chrome extension manifest
```

---

## Screenshots

<p align="center">
  <img src="src/assets/icons/logo.svg" alt="ProfiluxAI Logo" width="128" height="128" />
</p>

| Icon | Path |
|---|---|
| SVG Logo | `src/assets/icons/logo.svg` |
| 16x16 | `src/assets/icons/icon-16.png` |
| 48x48 | `src/assets/icons/icon-48.png` |
| 128x128 | `src/assets/icons/icon-128.png` |

---

## License

ISC
