# Spotify AI Discovery MVP

An AI-native music discovery layer built on top of Spotify that combines a user's listening history with their current intent to generate personalized playlists.

Built as part of a Product Management fellowship, this project demonstrates how Large Language Models can augment traditional recommendation systems by understanding *why* a user wants music at a particular moment instead of relying solely on historical listening behavior.

---

# Overview

Spotify already provides one of the world's best recommendation engines. However, recommendations are primarily optimized around historical listening behavior.

This MVP introduces an AI reasoning layer that combines:

- Current user intent
- Listening history
- Recently played songs
- Top artists
- Top tracks
- Discovery preferences

to generate playlists that better match the user's present context.

Spotify remains the music catalog and playlist platform, while OpenRouter (GPT-4o-mini) performs the reasoning required to convert natural language into structured discovery strategies.

---

# Problem Statement

## Target Users

Working professionals who:

- listen to Spotify daily
- rely on Discover Weekly, Smart Shuffle, Radio and Daily Mixes
- eventually experience repetitive recommendations
- want recommendations based on what they feel like listening to *right now*

Examples:

- "I'm driving through the mountains."
- "Give me energetic cycling songs."
- "I want something like Coldplay but less mainstream."
- "Help me discover indie artists similar to what I already enjoy."

---

# Research Summary

Primary research included:

- Survey responses
- Face-to-face interviews
- AI-powered review mining across Google Play and Reddit

Key findings:

- Users trust Spotify's recommendations but experience recommendation fatigue.
- Discovery often becomes a manual search task.
- Users cannot express temporary listening contexts.
- Existing recommendation systems optimize for similarity instead of exploration.

---

# AI-native Solution

Instead of generating recommendations only from intent:

```
Spotify History
        +
Current Intent
        +
AI Reasoning
        ↓
Discovery Strategy
        ↓
Spotify Search
        ↓
20-song Playlist
        ↓
Save directly to Spotify
```

This allows recommendations to balance:

- familiarity
- novelty
- mood
- activity
- discovery level

---

# Features

## Spotify OAuth (PKCE)

- Secure Spotify login
- User profile
- Profile picture
- Automatic authentication restoration
- Logout
- Save generated playlists directly to Spotify

---

## Personalized Taste Profile

After login the application automatically loads:

- User profile
- Top artists
- Top tracks
- Recently played tracks

These are used to build a personalized music profile.

---

## AI Playlist Generation

Users describe what they want in natural language.

Examples:

- Cycling workout
- Coding session
- Rainy evening
- Road trip
- Hidden gems

The AI combines:

- listening history
- current intent
- discovery preference

to generate a playlist strategy.

---

## Intelligent Playlist Refinement

Users can iteratively improve playlists using:

- More like this
- Less like this
- Different artists
- Different genres
- Refresh playlist

Each refinement preserves previous context while modifying only the requested aspects.

---

## Spotify Playlist Creation

Generated recommendations are:

- searched on Spotify
- deduplicated
- converted into Spotify tracks
- saved directly to the user's account

---

# Architecture

```
User
 │
 ▼
Spotify OAuth (PKCE)
 │
 ▼
Spotify APIs
 │
 ├── User Profile
 ├── Top Artists
 ├── Top Tracks
 ├── Recently Played
 │
 ▼
Taste Profile
 │
 ▼
User Intent
 │
 ▼
OpenRouter (GPT-4o-mini)
 │
 ▼
Discovery Strategy
 │
 ▼
Spotify Search API
 │
 ▼
Playlist Generator
 │
 ▼
Spotify Playlist
```

---

# Project Structure

```
src/
├── app/
│   ├── constants/
│   ├── core/
│   │   └── services/
│   ├── features/
│   │   ├── discovery/
│   │   ├── home/
│   │   ├── playlist/
│   │   ├── success/
│   │   └── not-found/
│   ├── models/
│   ├── shared/
│   ├── app.routes.ts
│   └── app.config.ts
├── environments/
│   ├── environment.ts
│   └── environment.development.ts
└── theme/
```

---

# Technology Stack

- Angular 17
- Standalone Components
- Angular Signals
- Angular Material
- SCSS
- Spotify Web API
- Spotify OAuth PKCE
- OpenRouter GPT-4o-mini

---

# Environment Configuration

## Local Development

Configure:

`src/environments/environment.development.ts`

Example:

```ts
spotifyClientId: "...",
spotifyRedirectUri: "http://127.0.0.1:4200",
openRouterApiKey: "...",
openRouterModel: "openai/gpt-4o-mini"
```

---

## Production

Production builds use:

`src/environments/environment.ts`

Secrets should **not** be committed.

Deployments should inject:

- OPENROUTER_API_KEY
- SPOTIFY_CLIENT_ID
- SPOTIFY_CLIENT_SECRET

through Netlify environment variables.

---

# Running Locally

Install dependencies:

```bash
npm install
```

Run:

```bash
ng serve
```

Open:

```
http://127.0.0.1:4200
```

---

# Deployment

Deploy to Netlify.

Required environment variables:

```
OPENROUTER_API_KEY

SPOTIFY_CLIENT_ID

SPOTIFY_CLIENT_SECRET
```

Spotify Developer Dashboard should contain:

```
http://127.0.0.1:4200

https://your-netlify-site.netlify.app
```

as Redirect URIs.

---

# AI Workflow

1. User logs into Spotify.
2. Application loads listening history.
3. User describes their current listening intent.
4. GPT-4o-mini generates a discovery strategy.
5. Spotify Search retrieves matching songs.
6. Tracks are ranked and deduplicated.
7. A playlist of up to 20 songs is generated.
8. User can refine the playlist.
9. Playlist can be saved directly to Spotify.

---

# Error Handling

The application gracefully handles:

- expired Spotify tokens
- network failures
- OpenRouter failures
- Spotify API failures
- rate limits

with informative user feedback.

---

# Assumptions

- Spotify provides the music catalog.
- GPT-4o-mini performs reasoning only.
- AI recommends tracks but Spotify remains the source of truth.
- Search quality depends on Spotify's available catalog.

---

# Future Improvements

- Voice-based playlist generation
- Learning from explicit user feedback
- Playlist sharing and collaborative refinement