import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PlaylistGeneratorService } from '../../core/services/playlist-generator.service';
import { AiService } from '../../core/services/ai.service';
import { SpotifyService } from '../../core/services/spotify.service';
import { SpotifyAuthService } from '../../core/services/spotify-auth.service';
import { TrackCardComponent } from '../../shared/components/track-card/track-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { GeneratedPlaylist, FeedbackType } from '../../models';
import { FEEDBACK_TYPES } from '../../constants/discovery-modes.constants';

@Component({
  selector: 'app-playlist',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatRippleModule,
    MatSnackBarModule,
    TrackCardComponent,
    SkeletonLoaderComponent,
    ErrorBannerComponent,
  ],
  templateUrl: './playlist.component.html',
  styleUrls: ['./playlist.component.scss'],
})
export class PlaylistComponent implements OnInit {
  readonly playlist = signal<GeneratedPlaylist | null>(null);
  readonly isRefining = signal(false);
  readonly refineError = signal<string | null>(null);
  readonly showExplanation = signal(true);
  readonly feedbackTypes = FEEDBACK_TYPES;
  
  readonly isSaving = signal(false);
  readonly savedPlaylistUrl = signal<string | null>(null);


  constructor(
    private playlistGenerator: PlaylistGeneratorService,
    private aiService: AiService,
    private spotifyService: SpotifyService,
    private spotifyAuth: SpotifyAuthService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  get isLoggedIn(): boolean {
    return this.spotifyAuth.isAuthenticated();
  }

  ngOnInit(): void {
    const current = this.playlistGenerator.currentPlaylist();
    if (!current) {
      this.router.navigate(['/']);
      return;
    }
    this.playlist.set(current);
  }

  saveToSpotify(): void {
    const current = this.playlist();
    if (!current || this.isSaving()) return;

    this.isSaving.set(true);
    
    // Get valid track URIs (only real Spotify tracks have spotify:track:id URIs)
    // The Track model has `id`, so URI is `spotify:track:${id}`
    const uris = current.tracks.map(t => `spotify:track:${t.id}`);
    
    this.spotifyService.createPlaylist(current.title, current.description, uris).subscribe({
      next: (url) => {
        this.isSaving.set(false);
        this.savedPlaylistUrl.set(url);
        this.snackBar.open('Playlist saved to your Spotify account!', 'Open', {
          duration: 5000,
          panelClass: 'success-snackbar'
        }).onAction().subscribe(() => {
          window.open(url, '_blank');
        });
      },
      error: (err) => {
        this.isSaving.set(false);
        const status = err?.status || err?.error?.status;
        const msg = status === 403
          ? 'Permission denied. Please log out and log back in to grant playlist access.'
          : 'Failed to save playlist. Please try again.';
        this.snackBar.open(msg, 'Dismiss', {
          duration: 5000,
          panelClass: 'error-snackbar'
        });
      }
    });
  }

  openSpotify(): void {
    const url = this.savedPlaylistUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  onFeedback(feedbackType: FeedbackType['type']): void {
    this.refinePlaylist(feedbackType);
  }

  private refinePlaylist(feedbackType: FeedbackType['type']): void {
    this.isRefining.set(true);
    this.refineError.set(null);

    this.playlistGenerator.refinePlaylist(feedbackType).subscribe({
      next: (refined) => {
        this.playlist.set(refined);
        this.savedPlaylistUrl.set(null); // Reset save state for new tracks
        this.isRefining.set(false);
        this.snackBar.open('Playlist refreshed based on your feedback', 'Dismiss', {
          duration: 3000,
        });
      },
      error: (err: Error) => {
        this.isRefining.set(false);
        this.refineError.set(err.message);
      },
    });
  }

  onRetryRefine(): void {
    this.refineError.set(null);
  }

  toggleExplanation(): void {
    this.showExplanation.update((v) => !v);
  }

  trackByTrackId(_index: number, track: GeneratedPlaylist['tracks'][number]): string {
    return track.id;
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  }

  getTotalDuration(playlist: GeneratedPlaylist): string {
    const totalMs = playlist.tracks.reduce((sum, t) => sum + t.duration, 0);
    const totalMin = Math.floor(totalMs / 60000);
    return `${totalMin} min`;
  }
}
