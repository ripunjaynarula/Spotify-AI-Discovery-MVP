import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, map, timeout, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AiSearchParams, DiscoveryIntent, FeedbackType } from '../../models';

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
  readonly isUsingFallback = signal(false);

  constructor(private http: HttpClient) {}

  generateSearchParams(intent: DiscoveryIntent): Observable<AiSearchParams> {
    if (!environment.openRouterApiKey) {
      this.isUsingFallback.set(true);
      return this.generateFallbackParams(intent);
    }

    this.isLoading.set(true);
    this.hasError.set(false);
    this.isUsingFallback.set(false);

    const prompt = this.buildPrompt(intent);
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
      max_tokens: 800,
      response_format: { type: 'json_object' },
    };

    const headers = new HttpHeaders({
      Authorization: `Bearer ${environment.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://spotify-ai-discovery.vercel.app',
      'X-Title': 'Spotify AI Discovery',
    });

    return this.http
      .post<OpenRouterResponse>(`${this.baseUrl}/chat/completions`, request, { headers })
      .pipe(
        timeout(this.requestTimeout),
        map((response) => this.parseResponse(response, intent)),
        catchError((error) => {
          this.hasError.set(true);
          this.isUsingFallback.set(true);
          return this.generateFallbackParams(intent);
        }),
      );
  }

  refineSearchParams(
    currentParams: AiSearchParams,
    feedbackType: FeedbackType['type'],
  ): Observable<AiSearchParams> {
    if (!environment.openRouterApiKey) {
      this.isUsingFallback.set(true);
      return this.generateRefinedFallbackParams(currentParams, feedbackType);
    }

    this.isLoading.set(true);
    this.hasError.set(false);

    const prompt = this.buildRefinementPrompt(currentParams, feedbackType);
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
      max_tokens: 800,
      response_format: { type: 'json_object' },
    };

    const headers = new HttpHeaders({
      Authorization: `Bearer ${environment.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://spotify-ai-discovery.vercel.app',
      'X-Title': 'Spotify AI Discovery',
    });

    return this.http
      .post<OpenRouterResponse>(`${this.baseUrl}/chat/completions`, request, { headers })
      .pipe(
        timeout(this.requestTimeout),
        map((response) => this.parseResponse(response, null)),
        catchError((error) => {
          this.hasError.set(true);
          this.isUsingFallback.set(true);
          return this.generateRefinedFallbackParams(currentParams, feedbackType);
        }),
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
  "artistPreferences": ["array", "of", "artist", "style", "descriptors"],
  "excludedGenres": ["array", "of", "genres", "to", "avoid"],
  "searchKeywords": ["array", "of", "spotify", "search", "terms"],
  "recommendationExplanation": "string (2-3 sentences explaining why these choices match the intent)",
  "refinementSuggestions": ["array", "of", "2-3", "user", "suggestions", "for", "next", "steps"]
}

Focus on underrepresented and emerging artists when appropriate. Be specific with genres. Avoid clichés.`;
  }

  private buildPrompt(intent: DiscoveryIntent): string {
    const answersText = Object.entries(intent.answers)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');

    return `User selected the discovery mode: "${intent.modeTitle}"

Their answers:
${answersText}

Generate music search parameters that perfectly match this intent. Be creative but precise.`;
  }

  private buildRefinementPrompt(
    currentParams: AiSearchParams,
    feedbackType: FeedbackType['type'],
  ): string {
    const feedbackMap: Record<FeedbackType['type'], string> = {
      more_like_this: 'The user wants more music that sounds similar to the current playlist. Reinforce the same sonic palette and mood.',
      less_like_this: 'The user dislikes this direction. Pivot significantly — change the mood, tempo, or overall feel.',
      different_artists: 'Keep the same genre and mood, but focus on entirely different, fresh artist profiles.',
      different_genres: 'Maintain the same energy and tempo, but shift to completely different genre territory.',
      refresh: 'Generate a fresh variation with slight differences while keeping the core intent intact.',
    };

    return `Current playlist parameters:
${JSON.stringify(currentParams, null, 2)}

User feedback: ${feedbackMap[feedbackType]}

Generate refined search parameters based on this feedback. Preserve what worked, address what did not.`;
  }

  private parseResponse(
    response: OpenRouterResponse,
    _intent: DiscoveryIntent | null,
  ): AiSearchParams {
    try {
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI');
      }
      const parsed = JSON.parse(content) as AiSearchParams;
      this.validateParams(parsed);
      this.isLoading.set(false);
      return parsed;
    } catch {
      this.isLoading.set(false);
      throw new Error('Failed to parse AI response');
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

  private generateFallbackParams(intent: DiscoveryIntent): Observable<AiSearchParams> {
    const fallbackMap: Record<string, AiSearchParams> = {
      'hidden-gems': {
        playlistTitle: 'Below the Radar',
        playlistDescription: 'Curated tracks from artists flying under the mainstream radar, selected to match your taste for discovery.',
        genres: ['Indie Folk', 'Lo-fi Indie', 'Dream Pop', 'Bedroom Pop'],
        mood: 'Exploratory and intimate',
        tempo: 'Medium',
        artistPreferences: ['Emerging', 'Underground', 'Bedroom producers'],
        excludedGenres: ['Top 40 Pop', 'Commercial EDM', 'Mainstream Hip-Hop'],
        searchKeywords: ['indie hidden gems', 'emerging artists', 'underground folk', 'bedroom pop 2024'],
        recommendationExplanation: 'These tracks were selected because they come from artists with strong cult followings but limited mainstream exposure. Each song offers something distinctive that most listeners have not encountered yet.',
        refinementSuggestions: ['Try "More like this" to stay underground', 'Select "Different genres" to explore another niche', 'Choose "Different artists" to find more emerging names'],
      },
      'workout': {
        playlistTitle: `Power Session`,
        playlistDescription: `High-octane tracks engineered for peak physical performance, matched to your workout intensity.`,
        genres: ['Electronic', 'Hip-Hop', 'Rock', 'Drum and Bass'],
        mood: 'Energised and driven',
        tempo: 'Fast',
        artistPreferences: ['High energy', 'Bass-heavy', 'Motivational'],
        excludedGenres: ['Classical', 'Jazz', 'Acoustic'],
        searchKeywords: ['workout music', 'high energy beats', 'gym playlist', 'motivational tracks'],
        recommendationExplanation: 'These tracks were chosen for their high BPM, driving rhythm, and motivational energy. They are designed to sync with the natural momentum of physical exertion.',
        refinementSuggestions: ['Try "More like this" for more pump', 'Select "Different genres" for a new sound', 'Choose "Refresh" for a different set at the same energy'],
      },
      'focus': {
        playlistTitle: 'Deep Focus Mode',
        playlistDescription: 'Carefully selected instrumental and minimal-lyric tracks to keep you in a productive flow state.',
        genres: ['Ambient', 'Lo-fi Hip-Hop', 'Instrumental Electronic', 'Modern Classical'],
        mood: 'Focused and calm',
        tempo: 'Medium',
        artistPreferences: ['Instrumental', 'Minimal', 'Atmospheric'],
        excludedGenres: ['Heavy Metal', 'Trap', 'Pop'],
        searchKeywords: ['focus music', 'instrumental study', 'lo-fi beats', 'ambient concentration'],
        recommendationExplanation: 'These tracks have been selected for their ability to stimulate without distracting. The minimal or absent lyrics allow your cognitive resources to stay on the task at hand.',
        refinementSuggestions: ['Try "Instrumentals only" for zero distraction', 'Select "Different genres" to try ambient classical', 'Choose "More like this" to deepen the focus state'],
      },
      'commute': {
        playlistTitle: 'Journey Soundtrack',
        playlistDescription: 'A dynamic playlist that transforms your commute into a cinematic experience.',
        genres: ['Indie Pop', 'Alternative', 'Electronic', 'Post-Rock'],
        mood: 'Reflective and energised',
        tempo: 'Medium',
        artistPreferences: ['Melodic', 'Atmospheric', 'Narrative'],
        excludedGenres: ['Harsh noise', 'Death Metal'],
        searchKeywords: ['commute playlist', 'indie pop journey', 'alternative road trip', 'travel music'],
        recommendationExplanation: 'These tracks match the rhythm of urban transit — dynamic enough to energise, melodic enough to transport you mentally beyond the commute itself.',
        refinementSuggestions: ['Try "More like this" for the same cinematic feel', 'Select "Different genres" for something edgier', 'Choose "Refresh" for a new commute set'],
      },
      'chill': {
        playlistTitle: 'Slow Everything Down',
        playlistDescription: 'A warm, enveloping collection designed to help you decompress and be present.',
        genres: ['Chillwave', 'Neo-Soul', 'Ambient Pop', 'Indie R&B'],
        mood: 'Relaxed and warm',
        tempo: 'Slow',
        artistPreferences: ['Smooth', 'Soulful', 'Warm textures'],
        excludedGenres: ['Metal', 'Punk', 'Hard EDM'],
        searchKeywords: ['chill vibes', 'relax music', 'neo soul chill', 'ambient pop'],
        recommendationExplanation: 'Each track in this set has been selected for its ability to lower cortisol and invite presence. The warm sonic textures and unhurried tempos are deliberately chosen for the post-work decompression ritual.',
        refinementSuggestions: ['Try "More like this" to go deeper into the chill', 'Select "Different artists" for fresh chill voices', 'Choose "Different genres" for an acoustic alternative'],
      },
      'surprise-me': {
        playlistTitle: 'Uncharted Territory',
        playlistDescription: 'AI took full creative control. Buckle up for a sonic journey across unexpected genres and eras.',
        genres: ['Art Rock', 'Afrobeat', 'Bossa Nova', 'Psych Pop'],
        mood: 'Adventurous and curious',
        tempo: 'Mixed',
        artistPreferences: ['Eclectic', 'World-influenced', 'Genre-defying'],
        excludedGenres: [],
        searchKeywords: ['eclectic mix', 'world music fusion', 'genre defying', 'art rock psychedelic'],
        recommendationExplanation: 'The AI deliberately crossed genre boundaries to challenge your listening habits. Each track was chosen to be surprising yet sonically coherent — a curated accident.',
        refinementSuggestions: ['Try "Different artists" for more surprises', 'Select "More like this" if you loved the direction', 'Choose "Refresh" for another wild card set'],
      },
    };

    const params = fallbackMap[intent.modeId] ?? fallbackMap['surprise-me'];
    this.isLoading.set(false);

    return new Observable<AiSearchParams>((observer) => {
      timer(800).subscribe(() => {
        observer.next(params);
        observer.complete();
      });
    });
  }

  private generateRefinedFallbackParams(
    currentParams: AiSearchParams,
    feedbackType: FeedbackType['type'],
  ): Observable<AiSearchParams> {
    const refined = { ...currentParams };

    switch (feedbackType) {
      case 'more_like_this':
        refined.playlistTitle = `More: ${currentParams.playlistTitle}`;
        refined.recommendationExplanation = `Based on your positive feedback, we doubled down on the elements that defined the previous set.`;
        break;
      case 'less_like_this':
        refined.playlistTitle = 'New Direction';
        refined.genres = ['Post-Rock', 'Alternative Folk', 'Dreamy Electronic'];
        refined.mood = 'Contrasting';
        refined.recommendationExplanation = `You indicated the previous direction wasn't right, so we pivoted to a contrasting sonic space.`;
        break;
      case 'different_artists':
        refined.playlistTitle = `Fresh Voices: ${currentParams.playlistTitle}`;
        refined.artistPreferences = ['New voices', 'Different backgrounds', 'Fresh perspectives'];
        refined.recommendationExplanation = `Same genre territory, entirely new set of artists to explore.`;
        break;
      case 'different_genres':
        refined.playlistTitle = 'Genre Shift';
        refined.genres = ['New Wave', 'Funk', 'Soul', 'Jazz Fusion'];
        refined.recommendationExplanation = `We shifted the genre palette completely while maintaining a similar energy and tempo.`;
        break;
      case 'refresh':
        refined.playlistTitle = `${currentParams.playlistTitle} (Refreshed)`;
        refined.searchKeywords = [...currentParams.searchKeywords, 'fresh', 'new'];
        refined.recommendationExplanation = `A fresh variation with the same core intent but different specific tracks.`;
        break;
    }

    this.isLoading.set(false);

    return new Observable<AiSearchParams>((observer) => {
      timer(600).subscribe(() => {
        observer.next(refined);
        observer.complete();
      });
    });
  }
}
