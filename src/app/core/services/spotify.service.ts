import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin, throwError } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AiSearchParams, Track, RecentlyPlayedItem } from '../../models';
import { SpotifyAuthService } from './spotify-auth.service';

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
  popularity?: number;
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
    total: number;
  };
}

export interface TasteProfile {
  topArtists: string[];
  topTracks: string[];
  recentlyPlayed: RecentlyPlayedItem[];
}

@Injectable({
  providedIn: 'root',
})
export class SpotifyService {
  private readonly baseUrl = environment.spotifyBaseUrl;
  private readonly requestTimeout = 15000;

  constructor(private http: HttpClient, private auth: SpotifyAuthService) {}

  getTasteProfile(): Observable<TasteProfile> {
    return this.auth.getValidAccessToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        const topArtists$ = this.http.get<any>(`${this.baseUrl}/me/top/artists?limit=10`, { headers }).pipe(
          map(res => res.items.map((a: any) => a.name)),
          catchError(() => of([]))
        );
        const topTracks$ = this.http.get<any>(`${this.baseUrl}/me/top/tracks?limit=10`, { headers }).pipe(
          map(res => res.items.map((t: any) => t.name)),
          catchError(() => of([]))
        );
        const recent$ = this.getRecentlyPlayed();
        
        return forkJoin({
          topArtists: topArtists$,
          topTracks: topTracks$,
          recentlyPlayed: recent$
        });
      })
    );
  }

  getRecentlyPlayed(): Observable<RecentlyPlayedItem[]> {
    return this.auth.getValidAccessToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        return this.http.get<any>(`${this.baseUrl}/me/player/recently-played?limit=10`, { headers }).pipe(
          map(res => {
            const items = res.items || [];
            // Deduplicate by track id
            const seen = new Set<string>();
            const result: RecentlyPlayedItem[] = [];
            for (const item of items) {
              const track = item.track;
              if (track && !seen.has(track.id)) {
                seen.add(track.id);
                result.push({
                  id: track.id,
                  title: track.name,
                  artist: track.artists.map((a: any) => a.name).join(', '),
                  albumArt: track.album.images[0]?.url || '',
                  type: 'track'
                });
              }
            }
            return result.slice(0, 10);
          })
        );
      })
    );
  }

  createPlaylist(name: string, description: string, trackUris: string[]): Observable<string> {
    return this.auth.getValidAccessToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        return this.http.get<any>(`${this.baseUrl}/me`, { headers }).pipe(
          switchMap(profile => {
            const userId = profile.id;
            return this.http.post<any>(`${this.baseUrl}/users/${userId}/playlists`, {
              name,
              description,
              public: false
            }, { headers });
          }),
          switchMap(playlist => {
            if (trackUris.length === 0) return of(playlist.external_urls.spotify);
            return this.http.post<any>(`${this.baseUrl}/playlists/${playlist.id}/tracks`, {
              uris: trackUris
            }, { headers }).pipe(
              map(() => playlist.external_urls.spotify)
            );
          })
        );
      })
    );
  }

  searchTracks(aiParams: AiSearchParams, count = 20): Observable<Track[]> {
    return this.auth.getValidAccessToken().pipe(
      switchMap((token) => this.performSearch(token, aiParams, count)),
    );
  }

  private performSearch(
    token: string,
    aiParams: AiSearchParams,
    count: number,
  ): Observable<Track[]> {
    const queries = this.buildSearchQueries(aiParams);
    const allTracks: Track[] = [];

    const searchObservables = queries.slice(0, 4).map((query) =>
      this.searchByQuery(token, query, 30)
    );

    if (searchObservables.length === 0) {
       return of([]);
    }

    return new Observable<Track[]>((observer) => {
      let completed = 0;
      const total = searchObservables.length;

      searchObservables.forEach((search$) => {
        search$.subscribe({
          next: (tracks) => {
            allTracks.push(...tracks);
            completed++;
            if (completed === total) {
              const selected = this.rankAndSelectTracks(allTracks, aiParams, count);
              observer.next(selected);
              observer.complete();
            }
          },
          error: (err) => {
            completed++;
            if (completed === total) {
              if (allTracks.length > 0) {
                const selected = this.rankAndSelectTracks(allTracks, aiParams, count);
                observer.next(selected);
                observer.complete();
              } else {
                observer.error(new Error('All Spotify searches failed: ' + err.message));
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
      .set('limit', Math.min(limit, 10).toString());

    return this.http
      .get<SpotifySearchResponse>(`${this.baseUrl}/search`, { headers, params })
      .pipe(
        timeout(this.requestTimeout),
        map((response) => (response.tracks?.items || []).map((track) => this.mapSpotifyTrack(track, query))),
        catchError((err) => {
          console.warn('Search query failed:', query, err);
          return of([]);
        }),
      );
  }

  private buildSearchQueries(aiParams: AiSearchParams): string[] {
    const queries: string[] = [];

    // 1. Genre + mood/activity query
    if (aiParams.genres && aiParams.genres.length > 0) {
      const g = aiParams.genres[0].toLowerCase().replace(/\s+/g, '-');
      let q = `genre:${g}`;
      if (aiParams.mood) q += ` ${aiParams.mood}`;
      queries.push(q);
    }

    // 2. Direct artist inspiration searches
    if (aiParams.artistPreferences && aiParams.artistPreferences.length > 0) {
      aiParams.artistPreferences.slice(0, 2).forEach(artist => {
        queries.push(`artist:${artist}`);
      });
    }

    // 3. Search keywords combined with tempo/energy
    if (aiParams.searchKeywords && aiParams.searchKeywords.length > 0) {
      aiParams.searchKeywords.slice(0, 2).forEach(keyword => {
        queries.push(keyword);
      });
    }

    // 4. Fallback search query using activity/mood if others are empty
    if (queries.length === 0) {
      const q = [aiParams.mood, aiParams.activity].filter(Boolean).join(' ');
      if (q) queries.push(q);
    }

    if (!environment.production) {
      console.log('[Dev] Spotify AI Discovery - Formulated Search Queries:', queries);
    }

    return queries.filter(Boolean);
  }

  private rankAndSelectTracks(tracks: Track[], aiParams: AiSearchParams, count: number): Track[] {
    // 1. Deduplicate by track ID and lowercased "title - artist"
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();
    let uniqueTracks = tracks.filter((track) => {
      if (seenIds.has(track.id)) return false;
      const key = `${track.title}-${track.artist}`.toLowerCase().replace(/\s+/g, '');
      if (seenTitles.has(key)) return false;
      seenIds.add(track.id);
      seenTitles.add(key);
      return true;
    });

    // 2. Filter out excluded genres
    if (aiParams.excludedGenres && aiParams.excludedGenres.length > 0) {
      const excluded = aiParams.excludedGenres.map(g => g.toLowerCase().trim());
      uniqueTracks = uniqueTracks.filter(track => {
        const genre = track.genre.toLowerCase();
        return !excluded.some(ex => genre.includes(ex) || ex.includes(genre));
      });
    }

    // 3. Score and rank tracks based on discoveryLevel
    const discoveryLevel = (aiParams.discoveryLevel || 'Balanced').toLowerCase();
    
    uniqueTracks.sort((a, b) => {
      const popA = a.popularity ?? 50;
      const popB = b.popularity ?? 50;
      
      if (discoveryLevel === 'deep cuts') {
        return popA - popB;
      } else if (discoveryLevel === 'familiar') {
        return popB - popA;
      } else {
        const distA = Math.abs(popA - 60);
        const distB = Math.abs(popB - 60);
        return distA - distB;
      }
    });

    // 4. Select tracks ensuring diversity of artists and albums
    const selected: Track[] = [];
    const artistCounts = new Map<string, number>();
    const albumCounts = new Map<string, number>();

    // Pass 1: Try to fill as many diverse tracks as possible (1 per album, max 2 per artist)
    for (const track of uniqueTracks) {
      const mainArtist = track.artist.split(',')[0].trim().toLowerCase();
      const album = track.album.toLowerCase().trim();
      const currentArtistCount = artistCounts.get(mainArtist) || 0;
      const currentAlbumCount = albumCounts.get(album) || 0;

      if (currentArtistCount < 2 && currentAlbumCount < 1) {
        selected.push(track);
        artistCounts.set(mainArtist, currentArtistCount + 1);
        albumCounts.set(album, currentAlbumCount + 1);
      }
      if (selected.length >= count) break;
    }

    // Pass 2: If we didn't get enough tracks, relax the album constraint
    if (selected.length < count) {
      for (const track of uniqueTracks) {
        if (selected.some(s => s.id === track.id)) continue;
        const mainArtist = track.artist.split(',')[0].trim().toLowerCase();
        const currentArtistCount = artistCounts.get(mainArtist) || 0;

        if (currentArtistCount < 2) {
          selected.push(track);
          artistCounts.set(mainArtist, currentArtistCount + 1);
        }
        if (selected.length >= count) break;
      }
    }

    // Pass 3: If still not enough, take whatever unique tracks remain
    if (selected.length < count) {
      for (const track of uniqueTracks) {
        if (selected.some(s => s.id === track.id)) continue;
        selected.push(track);
        if (selected.length >= count) break;
      }
    }

    if (!environment.production) {
      console.log(`[Dev] Spotify AI Discovery - Selected ${selected.length} tracks. Strategy details:`, {
        discoveryLevel,
        totalSearchedUnique: uniqueTracks.length,
        selectedArtists: Array.from(artistCounts.keys()),
        tracks: selected.map(t => `${t.title} by ${t.artist} (Popularity: ${t.popularity})`)
      });
    }

    return selected;
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
      popularity: spotifyTrack.popularity,
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
}
