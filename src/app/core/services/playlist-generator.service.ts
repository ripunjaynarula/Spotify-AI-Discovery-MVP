import { Injectable, signal } from '@angular/core';
import { Observable, forkJoin, throwError } from 'rxjs';
import { map, switchMap, catchError, finalize } from 'rxjs/operators';
import { AiService } from './ai.service';
import { SpotifyService } from './spotify.service';
import { AiSearchParams, DiscoveryIntent, FeedbackType, GeneratedPlaylist } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class PlaylistGeneratorService {
  readonly isGenerating = signal(false);
  readonly generationError = signal<string | null>(null);
  readonly currentPlaylist = signal<GeneratedPlaylist | null>(null);

  constructor(
    private aiService: AiService,
    private spotifyService: SpotifyService,
  ) {}

  generatePlaylist(intent: DiscoveryIntent): Observable<GeneratedPlaylist> {
    this.isGenerating.set(true);
    this.generationError.set(null);

    return this.aiService.generateSearchParams(intent).pipe(
      switchMap((aiParams) =>
        this.spotifyService.searchTracks(aiParams, 20).pipe(
          map((tracks) => {
            const playlist: GeneratedPlaylist = {
              title: aiParams.playlistTitle,
              description: aiParams.playlistDescription,
              tracks,
              aiParams,
              createdAt: new Date(),
              explanation: aiParams.recommendationExplanation,
            };
            this.currentPlaylist.set(playlist);
            return playlist;
          }),
        ),
      ),
      catchError((error) => {
        const message = error instanceof Error ? error.message : 'Failed to generate playlist. Please try again.';
        this.generationError.set(message);
        return throwError(() => new Error(message));
      }),
      finalize(() => {
        this.isGenerating.set(false);
      }),
    );
  }

  refinePlaylist(feedbackType: FeedbackType['type']): Observable<GeneratedPlaylist> {
    const current = this.currentPlaylist();
    if (!current) {
      return throwError(() => new Error('No playlist to refine'));
    }

    this.isGenerating.set(true);
    this.generationError.set(null);

    return this.aiService.refineSearchParams(current, feedbackType).pipe(
      switchMap((refinedParams) =>
        this.spotifyService.searchTracks(refinedParams, 20).pipe(
          map((tracks) => {
            const playlist: GeneratedPlaylist = {
              title: refinedParams.playlistTitle,
              description: refinedParams.playlistDescription,
              tracks,
              aiParams: refinedParams,
              createdAt: new Date(),
              explanation: refinedParams.recommendationExplanation,
            };
            this.currentPlaylist.set(playlist);
            return playlist;
          }),
        ),
      ),
      catchError((error) => {
        const message = error instanceof Error ? error.message : 'Failed to refine playlist. Please try again.';
        this.generationError.set(message);
        return throwError(() => new Error(message));
      }),
      finalize(() => {
        this.isGenerating.set(false);
      }),
    );
  }

  clearPlaylist(): void {
    this.currentPlaylist.set(null);
    this.generationError.set(null);
  }
}
