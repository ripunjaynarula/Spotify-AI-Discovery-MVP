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

  readonly isUsingMockData = this.spotifyService.isUsingMock;
  readonly isUsingFallbackAi = this.aiService.isUsingFallback;

  constructor(
    private playlistGenerator: PlaylistGeneratorService,
    private aiService: AiService,
    private spotifyService: SpotifyService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const current = this.playlistGenerator.currentPlaylist();
    if (!current) {
      this.router.navigate(['/']);
      return;
    }
    this.playlist.set(current);
  }

  onFeedback(feedbackType: FeedbackType['type']): void {
    if (feedbackType === 'more_like_this' || feedbackType === 'less_like_this') {
      this.submitFeedback(feedbackType);
    } else {
      this.refinePlaylist(feedbackType);
    }
  }

  private submitFeedback(feedbackType: 'more_like_this' | 'less_like_this'): void {
    const label = feedbackType === 'more_like_this' ? 'More like this' : 'Less like this';
    this.snackBar.open(
      `Preference recorded: "${label}". Future recommendations will improve.`,
      'Dismiss',
      { duration: 4000, panelClass: 'feedback-snackbar' },
    );
    this.router.navigate(['/success'], {
      queryParams: { feedback: feedbackType },
    });
  }

  private refinePlaylist(feedbackType: FeedbackType['type']): void {
    this.isRefining.set(true);
    this.refineError.set(null);

    this.playlistGenerator.refinePlaylist(feedbackType).subscribe({
      next: (refined) => {
        this.playlist.set(refined);
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
