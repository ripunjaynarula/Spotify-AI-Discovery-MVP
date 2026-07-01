import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AiSearchParams, Track } from '../../models';
import { MOCK_TRACKS } from '../../constants/mock-data.constants';

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
    total: number;
  };
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class SpotifyService {
  private readonly baseUrl = environment.spotifyBaseUrl;
  private readonly authUrl = environment.spotifyAuthUrl;
  private cachedToken: CachedToken | null = null;
  private readonly requestTimeout = 15000;

  readonly isAvailable = signal(true);
  readonly isUsingMock = signal(false);

  constructor(private http: HttpClient) {
    this.checkCredentials();
  }

  private checkCredentials(): void {
    if (!environment.spotifyClientId || !environment.spotifyClientSecret) {
      this.isAvailable.set(false);
      this.isUsingMock.set(true);
    }
  }

  searchTracks(aiParams: AiSearchParams, count = 10): Observable<Track[]> {
    if (!environment.spotifyClientId || !environment.spotifyClientSecret) {
      this.isUsingMock.set(true);
      return this.getMockTracks(aiParams, count);
    }

    return this.getAccessToken().pipe(
      switchMap((token) => this.performSearch(token, aiParams, count)),
      catchError(() => {
        this.isUsingMock.set(true);
        return this.getMockTracks(aiParams, count);
      }),
    );
  }

  private getAccessToken(): Observable<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60000) {
      return of(this.cachedToken.token);
    }

    const credentials = btoa(`${environment.spotifyClientId}:${environment.spotifyClientSecret}`);
    const headers = new HttpHeaders({
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    const body = new HttpParams().set('grant_type', 'client_credentials');

    return this.http
      .post<SpotifyTokenResponse>(this.authUrl, body.toString(), { headers })
      .pipe(
        timeout(this.requestTimeout),
        map((response) => {
          this.cachedToken = {
            token: response.access_token,
            expiresAt: now + response.expires_in * 1000,
          };
          return response.access_token;
        }),
        catchError(() => {
          throw new Error('Spotify authentication failed');
        }),
      );
  }

  private performSearch(
    token: string,
    aiParams: AiSearchParams,
    count: number,
  ): Observable<Track[]> {
    const queries = this.buildSearchQueries(aiParams);
    const allTracks: Track[] = [];

    const searchObservables = queries.slice(0, 3).map((query) =>
      this.searchByQuery(token, query, Math.ceil(count / queries.length)),
    );

    return new Observable<Track[]>((observer) => {
      let completed = 0;
      const total = searchObservables.length;

      searchObservables.forEach((search$) => {
        search$.subscribe({
          next: (tracks) => {
            allTracks.push(...tracks);
            completed++;
            if (completed === total) {
              const unique = this.deduplicateTracks(allTracks);
              const shuffled = this.shuffleTracks(unique);
              observer.next(shuffled.slice(0, count));
              observer.complete();
            }
          },
          error: () => {
            completed++;
            if (completed === total) {
              if (allTracks.length > 0) {
                observer.next(allTracks.slice(0, count));
                observer.complete();
              } else {
                observer.error(new Error('All Spotify searches failed'));
              }
            }
          },
        });
      });
    });
  }

  private searchByQuery(token: string, query: string, limit: number): Observable<Track[]> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const params = new HttpParams()
      .set('q', query)
      .set('type', 'track')
      .set('limit', Math.min(limit * 2, 50).toString())
      .set('market', 'US');

    return this.http
      .get<SpotifySearchResponse>(`${this.baseUrl}/search`, { headers, params })
      .pipe(
        timeout(this.requestTimeout),
        map((response) => response.tracks.items.map((track) => this.mapSpotifyTrack(track, query))),
        catchError(() => of([])),
      );
  }

  private buildSearchQueries(aiParams: AiSearchParams): string[] {
    const queries: string[] = [];

    if (aiParams.searchKeywords.length > 0) {
      queries.push(aiParams.searchKeywords.slice(0, 3).join(' '));
    }

    if (aiParams.genres.length > 0) {
      const genre = aiParams.genres[0].toLowerCase().replace(/\s+/g, '-');
      queries.push(`genre:${genre}`);
    }

    if (aiParams.genres.length > 1) {
      const genre2 = aiParams.genres[1].toLowerCase().replace(/\s+/g, '-');
      queries.push(`genre:${genre2} ${aiParams.mood}`);
    }

    return queries.filter(Boolean);
  }

  private mapSpotifyTrack(spotifyTrack: SpotifyTrack, genre: string): Track {
    const albumArt =
      spotifyTrack.album.images.find((img) => img.width >= 300)?.url ||
      spotifyTrack.album.images[0]?.url ||
      'https://picsum.photos/seed/spotify/300/300';

    return {
      id: spotifyTrack.id,
      title: spotifyTrack.name,
      artist: spotifyTrack.artists.map((a) => a.name).join(', '),
      album: spotifyTrack.album.name,
      albumArt,
      duration: spotifyTrack.duration_ms,
      genre: this.extractGenreFromQuery(genre),
      previewUrl: spotifyTrack.preview_url,
      spotifyUrl: spotifyTrack.external_urls.spotify,
      isLocal: false,
    };
  }

  private extractGenreFromQuery(query: string): string {
    const genreMatch = query.match(/genre:(\S+)/);
    if (genreMatch) {
      return genreMatch[1]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return 'Music';
  }

  private deduplicateTracks(tracks: Track[]): Track[] {
    const seen = new Set<string>();
    return tracks.filter((track) => {
      const key = `${track.title}-${track.artist}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private shuffleTracks(tracks: Track[]): Track[] {
    const arr = [...tracks];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private getMockTracks(aiParams: AiSearchParams, count: number): Observable<Track[]> {
    const shuffled = this.shuffleTracks(MOCK_TRACKS);

    const enriched = shuffled.slice(0, count).map((track, index) => ({
      ...track,
      id: `mock-${track.id}-${Date.now()}-${index}`,
      genre: aiParams.genres[index % aiParams.genres.length] || track.genre,
    }));

    return new Observable<Track[]>((observer) => {
      timer(1200).subscribe(() => {
        observer.next(enriched);
        observer.complete();
      });
    });
  }
}
