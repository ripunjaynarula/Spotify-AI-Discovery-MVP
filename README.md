# Spotify AI Discovery MVP

An AI-native music discovery interaction layer built on top of Spotify. Designed as an MVP for a Product Management fellowship, this application demonstrates how conversational and contextual AI inputs can improve catalog discovery, bypassing the limitations of repetitive historical listening profiles.

---

## Overview

Spotify AI Discovery acts as a premium client-side wrapper. It translates real-time, situational listening intents (e.g. Obscurity preferences, commute vibes, specific workout drills) into granular search queries directed at the Spotify Web API. Spotify serves as the reliable catalog engine, while OpenRouter acts as the cognitive layer that translates natural expressions into structured sonic metadata.

---

## Problem Statement & Research Summary

### Target Users
Working professionals who use Spotify daily, rely on recommendations (Smart Shuffle, Daily Mixes, Discover Weekly, Spotify Radio), but experience repetitive recommendation loops, lack custom preference control, and cannot communicate temporary listening scenarios.

### Validated Research Findings
1. Users like Spotify's underlying catalog and general quality but experience recommendation fatigue over time.
2. Discovery becomes a manual search task when users want to break out of their usual genres.
3. Current recommendation engines rely almost entirely on historical listening behavior, leaving no clean way to communicate a transient context (e.g. deep coding vs. admin work, or exact gym paces).

---

## Architecture & Folder Structure

The project conforms to an enterprise-grade standalone structure in Angular 17.

```
src/
├── app/
│   ├── constants/            # Immutable mock catalogs & discovery questions configs
│   ├── core/
│   │   └── services/         # State management, Spotify catalog API, OpenRouter wrapper
│   ├── features/
│   │   ├── discovery/        # Multistep lightweight questionnaire forms
│   │   ├── home/             # Entry portal, recently played & recommended playlists
│   │   ├── not-found/        # 404 Route handling
│   │   ├── playlist/         # Playlist displays, explanation panels, & feedback controls
│   │   └── success/          # Post-feedback notification screen
│   ├── models/               # Strongly-typed TypeScript interfaces
│   ├── shared/
│   │   ├── components/       # Reusable components: skeletons, track cards, error banners
│   │   └── pipes/            # Track duration transforms
│   ├── app.component.ts      # Root layout
│   ├── app.config.ts         # Application wide providers (animations, HTTP client, routers)
│   └── app.routes.ts         # Lazy-loaded route map definitions
├── theme/
│   ├── _mixins.scss          # Responsive layout breakpoints, flex helpers, typography classes
│   └── _variables.scss       # Theme-aligned color tokens, space scales, border-radii
└── environments/
    ├── environment.ts        # Production build environmental configurations
    └── environment.development.ts # Local development environmental configurations
```

---

## Application Flow

1. **Dashboard Home**: User lands on a dark-themed portal showing recently played mock tracks and the feature portal "Discover Your Way".
2. **Discovery Configurator**: User selects a mode (Hidden Gems, Focus, Workout, Commute, Chill, Surprise Me) and answers up to two target questions (supporting custom inputs).
3. **Structured Translation (AI)**: OpenRouter API parses the questions, generating structured search criteria (Title, Description, target genres, moods, tempo, search keywords, explanation).
4. **Catalog Lookup (Spotify)**: The search criteria are translated to Spotify API search endpoints to pull actual catalog records.
5. **Curation Display**: The generated playlist renders the metadata, tracks list, an explanation panel ("Why these songs?"), and a feedback toolbar.
6. **Refinement Iteration**: User provides feedback (e.g., More/Less like this, different artists, new genres) which immediately re-sends instructions to OpenRouter to pivot variables and reload the catalog tracks.
7. **Success Confirmation**: "More/Less like this" saves choices to state and redirects to a success screen confirming preferences are updated.

---

## Technology Stack

- **Framework**: Angular 17 (Strict Mode, Standalone Components, Signals)
- **Styling**: Vanilla SCSS utilizing Spotify-aligned design variables (no TailwindCSS)
- **UI Components**: Angular Material (MatIcon, MatButton, MatInput, MatFormField, MatRipple, MatTooltip, MatSnackBar)
- **API Services**: Spotify Web API, OpenRouter API (OpenAI GPT-4o-mini)
- **Build Tool**: Angular CLI

---

## Environment Variables

Configure placeholders in the following files:

### src/environments/environment.ts (Production) & environment.development.ts (Development)

```typescript
export const environment = {
  production: true, // false in environment.development.ts
  openRouterApiKey: '', // Paste your OpenRouter API Key here
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  openRouterModel: 'openai/gpt-4o-mini',
  spotifyClientId: '', // Paste your Spotify Client ID here
  spotifyClientSecret: '', // Paste your Spotify Client Secret here
  spotifyBaseUrl: 'https://api.spotify.com/v1',
  spotifyAuthUrl: 'https://accounts.spotify.com/api/token',
  appName: 'Spotify AI Discovery',
  appVersion: '1.0.0',
};
```

---

## How AI & Spotify API Work Together

### OpenRouter Curation
The `AiService` compiles the answers from the discovery flow and formats a system instructions prompt enforcing a JSON-Schema response. The model outputs a JSON payload specifying song-search keywords and music attributes.

### Spotify Catalog Fetching
The `SpotifyService` authenticates via Client Credentials Flow (obtaining a temporary token). It runs searches across the generated keywords and filtering variables, maps the returned tracks (album covers, durations, URLs), and deduplicates items.

### Resilient Fallback Mechanics
If no API keys are supplied (or if API endpoints fail due to network or rate limits):
- **AI Fallback**: The app returns simulated playlist metadata containing realistic context descriptions matching the user's selected mode.
- **Spotify Fallback**: The app falls back to a curated offline mock catalog of actual popular songs, ensuring the application remains fully testable without credentials.

---

## Setup & Installation

### 1. External Accounts Setup
- **Spotify Developer Portal**: Create a free developer account at [developer.spotify.com](https://developer.spotify.com/). Register a new app to obtain your Client ID and Client Secret.
- **OpenRouter Account**: Register at [openrouter.ai](https://openrouter.ai/). Obtain a developer API Key and top-up credits.

### 2. Install Dependencies
Run the installation command in your workspace directory:
```bash
npm install
```

### 3. Setup Credentials
Copy the credentials into `src/environments/environment.ts` and `src/environments/environment.development.ts`.

### 4. Running Locally
Launch the local development server:
```bash
npx ng serve --host 127.0.0.1
```
Open `http://localhost:4200` in your web browser.

### 5. Production Build
Verify production compilation:
```bash
npm run build
```

---

## Deployment

This app is a client-side SPA configured for Netlify. A `netlify.toml` at the project root handles the full build and routing configuration automatically.

### Netlify (recommended)

**Step 1 — Connect your repository**

1. Push this repository to GitHub.
2. Go to [app.netlify.com](https://app.netlify.com) and click **Add new site → Import an existing project**.
3. Select your GitHub repository.

**Step 2 — Build settings** (auto-detected from `netlify.toml`)

| Setting | Value |
|---|---|
| Build command | `npm run build:ci` |
| Publish directory | `dist/spotify-ai-discovery/browser` |

**Step 3 — Environment variables**

In Netlify → **Site configuration → Environment variables**, add:

| Key | Where to get it |
|---|---|
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `SPOTIFY_CLIENT_ID` | [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) |
| `SPOTIFY_CLIENT_SECRET` | [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) |

**Step 4 — Deploy**

Click **Deploy site**. Netlify runs `node set-env.js` first (which injects the env vars into the Angular environment files) and then builds the production bundle. No secrets ever touch git.

> If credentials are missing, the app automatically falls back to the mock catalog so it never shows a blank page.



## Assumptions & Limitations

- **Client Credentials Flow**: Client Credentials authentication is used to query the public Spotify catalog. No personal user playlists are read or modified, which avoids login gates.
- **Client Key Security**: In a production environment, API keys should be hidden behind a proxy backend. This MVP is configured as a serverless SPA to meet PM fellowship constraints.

---

## Future Improvements

1. Add OAuth PKCE authorization to save the generated playlist directly into user accounts.
2. Implement audio player controls to preview songs directly within the TrackCard component.
3. Integrate custom mood sliders to adjust energy, acousticness, and instrumentalness values dynamically.
