# Spotify AI Discovery MVP

An AI-native music discovery interaction layer built on top of Spotify. This application translates real-time, situational listening intents into personalized 20-track playlists — bypassing the limitations of repetitive historical recommendation loops.

---

## Overview

Spotify AI Discovery acts as a premium client-side wrapper. It translates natural listening intents (e.g. obscurity preferences, commute vibes, workout drills) into structured search queries directed at the Spotify Web API. Spotify serves as the catalog engine, OpenRouter (GPT-4o-mini) acts as the cognitive layer, and the app handles intelligent curation, deduplication, and diversity-aware track selection.

---

## Key Features

### Spotify Authentication (OAuth PKCE)
- Full Authorization Code + PKCE flow — login, logout, auto session restore, auto token refresh
- Fetches user profile, avatar, display name, account type on login
- Navbar profile button with circular avatar and animated dropdown chevron
- All guest/demo placeholders replaced with real Spotify user data post-login

### AI-Powered Playlist Generation
- Six discovery modes: Hidden Gems, Focus, Workout, Commute, Chill, Surprise Me
- Two-step questionnaire with chip selection and free-text custom input
- AI translates intent + listening history into structured search parameters
- Generates 20-track playlists from real Spotify catalog

### Intelligent Playlist Refinement
All five refinement actions send the AI the full previous playlist context (tracks, genres, mood, activity, strategy) plus the user's listening history:
- **More like this** — increases similarity, keeps mood/activity, adds new discoveries
- **Less like this** — reduces similarity, pivots away while preserving original intent
- **Different artists** — same genre/mood, swaps artists, explicitly excludes previous playlist artists
- **Different genres** — same mood/activity, explores adjacent genres, excludes previous genres
- **Refresh** — same strategy, entirely fresh tracks, minimal overlap

### Track Selection Quality
- Multiple targeted Spotify searches (genre+mood, artist inspiration, keywords)
- Diversity-aware ranking: max 2 tracks per artist, max 1 per album
- Discovery-level-aware sorting (Familiar / Balanced / Deep Cuts)
- Excluded-genre filtering
- Deduplication by track ID and normalized title+artist

### Save to Spotify
- Save generated playlists directly to the authenticated user's Spotify account
- "Open in Spotify" button appears after saving
- Buttons only visible when logged in
- Graceful 403 handling with re-auth guidance

### Robust AI Response Parsing
- Handles markdown code blocks, ```json fences, plain JSON, wrapped objects, stray whitespace
- Extracts JSON boundaries from conversational AI output
- Logs raw responses in dev mode for debugging
- Never overwrites the existing playlist on parse failure

### Dev-Only Logging
- AI prompts, raw responses, and parsed JSON logged to console in development
- Spotify search queries, result counts, and selected tracks logged
- All logging suppressed in production builds

---

## Architecture & Folder Structure

Angular 17 with Standalone Components and Signals.

```
src/
├── app/
│   ├── constants/            # Discovery mode configs & mock data for logged-out state
│   ├── core/
│   │   └── services/
│   │       ├── ai.service.ts                # OpenRouter API — prompt building, parsing, refinement
│   │       ├── spotify.service.ts           # Spotify Web API — search, taste profile, playlist creation
│   │       ├── spotify-auth.service.ts      # OAuth PKCE flow — login, logout, token management
│   │       ├── playlist-generator.service.ts # Orchestrates AI → Spotify → playlist pipeline
│   │       └── discovery-state.service.ts   # Intent state management between components
│   ├── features/
│   │   ├── discovery/        # Multi-step questionnaire flow
│   │   ├── home/             # Entry portal — recently played & recommended sections
│   │   ├── not-found/        # 404 route
│   │   ├── playlist/         # Playlist display, explanation, refinement, save-to-Spotify
│   │   └── success/          # Post-feedback confirmation
│   ├── models/               # TypeScript interfaces (Track, AiSearchParams, etc.)
│   └── shared/
│       ├── components/       # Navbar, track cards, skeleton loaders, error banners
│       └── pipes/            # Duration formatting
├── environments/
│   ├── environment.ts              # Production config (uses Netlify env vars)
│   └── environment.development.ts  # Local dev config (fill in your credentials)
├── styles.scss               # Global styles including Material overrides & navbar dropdown
└── theme/
    ├── _variables.scss        # Color tokens, spacing, typography
    └── _mixins.scss           # Responsive breakpoints, flex helpers
```

---

## Application Flow

1. **Home** — Dark-themed portal with time-based greeting, discovery mode cards, recently played, and recommended sections. Shows mock data when logged out; real Spotify data when logged in.
2. **Discovery** — User selects a mode and answers 1–2 questions (chips or free text; only one input source active at a time).
3. **AI Translation** — OpenRouter receives the intent + user's listening history and returns structured search parameters (genres, mood, tempo, energy, activity, artist inspirations, discovery level, search keywords).
4. **Spotify Search** — Multiple targeted searches run in parallel; results are merged, deduplicated, filtered by excluded genres, ranked by discovery level, and selected for artist/album diversity.
5. **Playlist Display** — 20-track playlist with artwork grid, explanation panel ("Why these songs?"), and refinement toolbar.
6. **Refinement** — User clicks a refinement button → animated progress bar appears → buttons disabled → AI receives full context → new playlist replaces old one smoothly (no blank page).
7. **Save** — Authenticated users can save the playlist to their Spotify account and open it directly.

---

## Technology Stack

- **Framework**: Angular 17 (Standalone Components, Signals)
- **Styling**: Vanilla SCSS with Spotify-aligned design tokens
- **UI Components**: Angular Material (MatIcon, MatButton, MatMenu, MatSnackBar, MatRipple, MatTooltip, MatDivider)
- **AI**: OpenRouter API (GPT-4o-mini)
- **Music Catalog**: Spotify Web API
- **Auth**: OAuth 2.0 Authorization Code + PKCE
- **Deployment**: Netlify (with serverless proxy for API key protection)

---

## Environment Variables

### Local Development (`environment.development.ts`)

```typescript
export const environment = {
  production: false,
  openRouterApiKey: 'your-openrouter-key',
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  openRouterModel: 'openai/gpt-4o-mini',
  spotifyClientId: 'your-spotify-client-id',
  spotifyClientSecret: 'your-spotify-client-secret',
  spotifyRedirectUri: 'http://127.0.0.1:4200',
  spotifyBaseUrl: 'https://api.spotify.com/v1',
  spotifyAuthUrl: 'https://accounts.spotify.com/api/token',
  appName: 'Spotify AI Discovery',
  appVersion: '1.0.0',
};
```

### Production (`environment.ts`)

Production builds use `set-env.js` to inject Netlify environment variables at build time. The OpenRouter API key is proxied through a Netlify serverless function (`netlify/functions/openai.js`) — never exposed to the client.

---

## Setup & Installation

### 1. External Accounts

- **Spotify Developer Portal**: Create a free account at [developer.spotify.com](https://developer.spotify.com/). Register an app, add `http://127.0.0.1:4200` as a Redirect URI, and note the Client ID.
- **OpenRouter**: Register at [openrouter.ai](https://openrouter.ai/). Get an API key and add credits.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Credentials

Fill in `src/environments/environment.development.ts` with your keys (this file is gitignored).

### 4. Run Locally

```bash
npx ng serve --host 127.0.0.1
```

Open `http://127.0.0.1:4200` in your browser.

### 5. Production Build

```bash
npm run build
```

---

## Deployment (Netlify)

### Step 1 — Connect repository

Push to GitHub. In Netlify, click **Add new site → Import existing project** and select the repo.

### Step 2 — Build settings (auto-detected from `netlify.toml`)

| Setting | Value |
|---|---|
| Build command | `npm run build:ci` |
| Publish directory | `dist/spotify-ai-discovery/browser` |

### Step 3 — Environment variables

In **Site configuration → Environment variables**, add:

| Key | Source |
|---|---|
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `SPOTIFY_CLIENT_ID` | [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) |
| `SPOTIFY_CLIENT_SECRET` | [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) |
| `SPOTIFY_REDIRECT_URI` | Your Netlify site URL (e.g. `https://spotify-ai-discovery.netlify.app`) |

### Step 4 — Deploy

Click **Deploy site**. `set-env.js` injects the env vars at build time. The OpenRouter key is proxied through a Netlify function.

---

## OAuth Scopes

The app requests the following Spotify scopes:

| Scope | Purpose |
|---|---|
| `user-read-private` | Read account details |
| `user-read-email` | Read email address |
| `user-top-read` | Fetch top artists/tracks for taste profile |
| `user-read-recently-played` | Fetch recently played tracks |
| `playlist-modify-public` | Create and save playlists |
| `playlist-modify-private` | Create private playlists |

> **Note:** If you logged in before playlist scopes were added, you must log out and log back in to grant the new permissions.

---

## Assumptions & Limitations

- **PKCE Flow**: All auth happens client-side with PKCE. No backend session management.
- **API Key Security**: In production, the OpenRouter key is proxied through a Netlify serverless function. Spotify auth uses PKCE (no client secret needed client-side).
- **Spotify API Rate Limits**: Multiple searches per playlist generation may hit rate limits under heavy use.
- **AI Model**: Relies on GPT-4o-mini via OpenRouter. Response quality depends on model availability and prompt adherence.

---

## Future Improvements

1. Audio preview playback within track cards
2. Custom mood/energy sliders for fine-tuned control
3. Playlist history — view and replay previously generated playlists
4. Collaborative playlists — generate for group listening sessions
5. Offline mode with cached playlist data