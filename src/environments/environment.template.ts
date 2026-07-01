// ─────────────────────────────────────────────────────────────
// TEMPLATE FILE — committed to git, safe to share publicly
//
// DO NOT put real credentials in this file.
// Real credentials go in environment.ts (which is gitignored).
//
// To set up locally:
//   cp src/environments/environment.template.ts src/environments/environment.ts
//   then fill in your keys in environment.ts
//
// On Vercel/Netlify:
//   Add environment variables and run:  node set-env.js && ng build
// ─────────────────────────────────────────────────────────────

export const environment = {
  production: true,
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
