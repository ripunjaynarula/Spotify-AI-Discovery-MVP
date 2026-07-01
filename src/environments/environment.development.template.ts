// ─────────────────────────────────────────────────────────────
// TEMPLATE FILE — committed to git, safe to share publicly
//
// DO NOT put real credentials in this file.
// Real credentials go in environment.development.ts (gitignored).
//
// To set up locally:
//   cp src/environments/environment.development.template.ts src/environments/environment.development.ts
//   then fill in your keys in environment.development.ts
// ─────────────────────────────────────────────────────────────

export const environment = {
  production: false,
  openRouterApiKey: '',        // OPENROUTER_API_KEY — get from openrouter.ai
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  openRouterModel: 'openai/gpt-4o-mini',
  spotifyClientId: '',         // SPOTIFY_CLIENT_ID — get from developer.spotify.com
  spotifyClientSecret: '',     // SPOTIFY_CLIENT_SECRET — get from developer.spotify.com
  spotifyBaseUrl: 'https://api.spotify.com/v1',
  spotifyAuthUrl: 'https://accounts.spotify.com/api/token',
  appName: 'Spotify AI Discovery',
  appVersion: '1.0.0',
};
