import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timer, of } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AiSearchParams, DiscoveryIntent, FeedbackType, GeneratedPlaylist } from '../../models';
import { SpotifyService, TasteProfile } from './spotify.service';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature: number;
  max_tokens: number;
  response_format?: { type: 'json_object' };
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly baseUrl = environment.openRouterBaseUrl;
  private readonly model = environment.openRouterModel;
  private readonly requestTimeout = 30000;

  readonly isLoading = signal(false);
  readonly hasError = signal(false);

  constructor(private http: HttpClient, private spotify: SpotifyService) {}

  generateSearchParams(intent: DiscoveryIntent): Observable<AiSearchParams> {
    if (!environment.openRouterApiKey && !environment.openRouterBaseUrl.includes('/api/openai')) {
      return throwError(() => new Error('OpenRouter API key is missing.'));
    }

    this.isLoading.set(true);
    this.hasError.set(false);

    return this.spotify.getTasteProfile().pipe(
      switchMap(tasteProfile => {
        const prompt = this.buildPrompt(intent, tasteProfile);
        if (!environment.production) {
          console.log('[Dev] Spotify AI Discovery - Prompt generated:', prompt);
        }

        const request: OpenRouterRequest = {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.buildSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        };

        const headers = new HttpHeaders({
          Authorization: `Bearer ${environment.openRouterApiKey || 'proxy'}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://spotify-ai-discovery.netlify.app',
          'X-Title': 'Spotify AI Discovery',
        });

        return this.http.post<OpenRouterResponse>(`${this.baseUrl}/chat/completions`, request, { headers }).pipe(
          timeout(this.requestTimeout),
          map((response) => this.parseResponse(response, intent)),
          catchError((error) => {
            console.error('OpenRouter request failed:', error);
            this.hasError.set(true);
            return throwError(() => error);
          })
        );
      }),
      catchError(err => {
         this.hasError.set(true);
         return throwError(() => err);
      })
    );
  }

  refineSearchParams(
    currentPlaylist: GeneratedPlaylist,
    feedbackType: FeedbackType['type'],
  ): Observable<AiSearchParams> {
    if (!environment.openRouterApiKey && !environment.openRouterBaseUrl.includes('/api/openai')) {
      return throwError(() => new Error('OpenRouter API key is missing.'));
    }

    this.isLoading.set(true);
    this.hasError.set(false);

    return this.spotify.getTasteProfile().pipe(
      switchMap(tasteProfile => {
        const prompt = this.buildRefinementPrompt(currentPlaylist, feedbackType, tasteProfile);
        if (!environment.production) {
          console.log('[Dev] Spotify AI Discovery - Refinement Prompt generated:', prompt);
        }

        const request: OpenRouterRequest = {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.buildSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.8,
          max_tokens: 500,
          response_format: { type: 'json_object' },
        };

        const headers = new HttpHeaders({
          Authorization: `Bearer ${environment.openRouterApiKey || 'proxy'}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://spotify-ai-discovery.netlify.app',
          'X-Title': 'Spotify AI Discovery',
        });

        return this.http
          .post<OpenRouterResponse>(`${this.baseUrl}/chat/completions`, request, { headers })
          .pipe(
            timeout(this.requestTimeout),
            map((response) => this.parseResponse(response, null)),
            catchError((error) => {
              this.hasError.set(true);
              return throwError(() => error);
            }),
          );
      }),
      catchError(err => {
        this.hasError.set(true);
        return throwError(() => err);
      })
    );
  }

  private buildSystemPrompt(): string {
    return `You are a music discovery AI assistant. Your role is to convert user listening intent into structured music search parameters.

Always respond with a valid JSON object matching exactly this structure:
{
  "playlistTitle": "string (creative, evocative title)",
  "playlistDescription": "string (1-2 sentences describing the mood and curation rationale)",
  "genres": ["array", "of", "specific", "genre", "names"],
  "mood": "string (single descriptive mood word or phrase)",
  "tempo": "string (Slow / Medium / Fast / Energetic)",
  "energy": "string (Low / Medium / High)",
  "activity": "string (e.g. Chill, Study, Workout, Focus, Commute, Party)",
  "artistPreferences": ["array", "of", "artist", "style", "descriptors", "or", "artist", "names"],
  "excludedGenres": ["array", "of", "genres", "to", "avoid"],
  "searchKeywords": ["array", "of", "spotify", "search", "terms"],
  "discoveryLevel": "string (Familiar / Balanced / Deep Cuts)",
  "recommendationExplanation": "string (2-3 sentences explaining why these choices match the intent)",
  "refinementSuggestions": ["array", "of", "2-3", "user", "suggestions", "for", "next", "steps"]
}

Constraints:
1. Suggest up to 20 tracks indirectly by balancing the user's intent with their listening history.
2. Avoid excessive repetition of their top artists; favor discovery of new but similar artists.
3. Be specific with genres.
4. Avoid clichés.`;
  }

  private buildPrompt(intent: DiscoveryIntent, taste: TasteProfile): string {
    const answersText = Object.entries(intent.answers)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    let historyText = 'No Spotify listening history available.';
    if (taste.topArtists.length > 0 || taste.topTracks.length > 0 || taste.recentlyPlayed.length > 0) {
      historyText = `User's Listening Profile:
- Top Artists: ${taste.topArtists.slice(0, 5).join(', ')}
- Top Tracks: ${taste.topTracks.slice(0, 5).join(', ')}
- Recently Played: ${taste.recentlyPlayed.slice(0, 5).map(t => `${t.title} by ${t.artist}`).join(', ')}

Please use this history to inform your recommendations but do NOT simply return their top tracks. Discover new music that fits their intent and aligns with their taste.`;
    }

    return `User selected the discovery mode: "${intent.modeTitle}"

Their answers:
${answersText}

${historyText}

Generate music search parameters that perfectly match this intent while introducing fresh but relevant sounds.`;
  }

  private buildRefinementPrompt(
    currentPlaylist: GeneratedPlaylist,
    feedbackType: FeedbackType['type'],
    taste: TasteProfile
  ): string {
    const feedbackMap: Record<FeedbackType['type'], string> = {
      more_like_this: 'MORE LIKE THIS: Increase similarity to the current tracks. Keep the mood and activity, but add a few new discovery tracks. Make sure to stay within the original intent.',
      less_like_this: 'LESS LIKE THIS: Reduce similarity to the current tracks. Move further away from the current songs while keeping the original user intent.',
      different_artists: 'DIFFERENT ARTISTS: Keep the same genre, mood, and activity, but swap the artists. Exclude the artists that are already in the playlist (avoid: ' + currentPlaylist.tracks.map(t => t.artist).join(', ') + ').',
      different_genres: 'DIFFERENT GENRES: Keep the same mood and activity, but explore adjacent genres. Keep the energy consistent. Exclude the genres used previously (avoid: ' + currentPlaylist.aiParams.genres.join(', ') + ').',
      refresh: 'REFRESH PLAYLIST: Keep the exact same curation strategy, but provide entirely fresh tracks. Minimal overlap with the previous tracks.',
    };

    let historyText = 'No Spotify listening history available.';
    if (taste.topArtists.length > 0 || taste.topTracks.length > 0 || taste.recentlyPlayed.length > 0) {
      historyText = `User's Listening Profile:
- Top Artists: ${taste.topArtists.slice(0, 5).join(', ')}
- Top Tracks: ${taste.topTracks.slice(0, 5).join(', ')}
- Recently Played: ${taste.recentlyPlayed.slice(0, 5).map(t => `${t.title} by ${t.artist}`).join(', ')}`;
    }

    const previousPlaylistInfo = {
      title: currentPlaylist.title,
      description: currentPlaylist.description,
      explanation: currentPlaylist.explanation,
      genres: currentPlaylist.aiParams.genres,
      mood: currentPlaylist.aiParams.mood,
      tempo: currentPlaylist.aiParams.tempo,
      energy: currentPlaylist.aiParams.energy || 'Medium',
      activity: currentPlaylist.aiParams.activity || 'General',
      artistPreferences: currentPlaylist.aiParams.artistPreferences,
      discoveryLevel: currentPlaylist.aiParams.discoveryLevel || 'Balanced',
      tracks: currentPlaylist.tracks.map(t => `${t.title} by ${t.artist}`)
    };

    return `You are refining an existing playlist.
Here is the previous playlist context:
${JSON.stringify(previousPlaylistInfo, null, 2)}

${historyText}

Refinement Instruction:
${feedbackMap[feedbackType]}

Generate refined search parameters based on this instruction. You must preserve the core user intent, mood, and activity, but modify the specific parameters (genres, artists, searchKeywords, discoveryLevel) as instructed. Never produce an unrelated playlist.`;
  }

  private parseResponse(
    response: OpenRouterResponse,
    _intent: DiscoveryIntent | null,
  ): AiSearchParams {
    const rawContent = response.choices[0]?.message?.content;
    if (!environment.production) {
      console.log('[Dev] Spotify AI Discovery - Raw Response:', rawContent);
    }

    if (!rawContent) {
      throw new Error('Empty response from AI');
    }

    try {
      let cleanContent = rawContent.trim();
      
      // Clean markdown code blocks if present
      if (cleanContent.includes('```')) {
        const matches = cleanContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (matches && matches[1]) {
          cleanContent = matches[1].trim();
        } else {
          cleanContent = cleanContent.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
        }
      }

      // Find boundaries of the JSON object
      const firstCurly = cleanContent.indexOf('{');
      const lastCurly = cleanContent.lastIndexOf('}');
      if (firstCurly !== -1 && lastCurly !== -1) {
        cleanContent = cleanContent.substring(firstCurly, lastCurly + 1);
      }

      const parsed = JSON.parse(cleanContent) as AiSearchParams;
      this.validateParams(parsed);
      this.isLoading.set(false);

      if (!environment.production) {
        console.log('[Dev] Spotify AI Discovery - Parsed JSON:', parsed);
      }

      return parsed;
    } catch (e) {
      this.isLoading.set(false);
      console.error('Failed to parse AI response. Raw content:', rawContent, 'Error:', e);
      throw new Error('Failed to parse AI response. The response was malformed.');
    }
  }

  private validateParams(params: AiSearchParams): void {
    const required: Array<keyof AiSearchParams> = [
      'playlistTitle',
      'playlistDescription',
      'genres',
      'mood',
      'tempo',
      'artistPreferences',
      'excludedGenres',
      'searchKeywords',
      'recommendationExplanation',
      'refinementSuggestions',
    ];

    for (const field of required) {
      if (!params[field]) {
        throw new Error(`Missing required field: ${String(field)}`);
      }
    }
  }
}
