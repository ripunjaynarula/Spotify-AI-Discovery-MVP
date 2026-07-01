import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TrackDurationPipe } from '../../pipes/track-duration.pipe';
import { Track } from '../../../models';

@Component({
  selector: 'app-track-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, TrackDurationPipe],
  template: `
    <article
      class="track-card"
      [class.track-card--playing]="isPlaying"
      [attr.aria-label]="track.title + ' by ' + track.artist"
      role="listitem"
    >
      <div class="track-card__index" aria-hidden="true">
        <span class="track-card__number" [class.hidden]="isPlaying">{{ index + 1 }}</span>
        <mat-icon class="track-card__playing-icon" [class.visible]="isPlaying" aria-hidden="true">
          equalizer
        </mat-icon>
      </div>

      <div class="track-card__artwork-wrapper">
        <img
          [src]="track.albumArt"
          [alt]="track.album + ' album art'"
          class="track-card__artwork"
          loading="lazy"
          (error)="onImageError($event)"
        />
        <div class="track-card__artwork-overlay" aria-hidden="true">
          <mat-icon>play_arrow</mat-icon>
        </div>
      </div>

      <div class="track-card__info">
        <p class="track-card__title" [matTooltip]="track.title" matTooltipShowDelay="500">
          {{ track.title }}
        </p>
        <p class="track-card__artist">{{ track.artist }}</p>
      </div>

      <div class="track-card__album" [attr.aria-label]="'Album: ' + track.album">
        <p class="track-card__album-name">{{ track.album }}</p>
      </div>

      <div class="track-card__genre">
        <span class="track-card__genre-badge">{{ track.genre }}</span>
      </div>

      <div class="track-card__duration" [attr.aria-label]="'Duration: ' + (track.duration | trackDuration)">
        {{ track.duration | trackDuration }}
      </div>

      <div class="track-card__actions">
        <a
          *ngIf="!track.isLocal"
          [href]="track.spotifyUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="track-card__spotify-link"
          [attr.aria-label]="'Open ' + track.title + ' in Spotify'"
          matTooltip="Open in Spotify"
        >
          <mat-icon>open_in_new</mat-icon>
        </a>
        <span
          *ngIf="track.isLocal"
          class="track-card__mock-badge"
          matTooltip="Demo track (Spotify credentials not configured)"
        >
          <mat-icon>info_outline</mat-icon>
        </span>
      </div>
    </article>
  `,
  styleUrls: ['./track-card.component.scss'],
})
export class TrackCardComponent implements OnInit {
  @Input() track!: Track;
  @Input() index = 0;
  @Input() isPlaying = false;
  @Output() trackClick = new EventEmitter<Track>();

  private fallbackArt = 'https://picsum.photos/seed/fallback/300/300';

  ngOnInit(): void {
    if (!this.track) {
      throw new Error('TrackCardComponent: track input is required');
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.fallbackArt;
  }
}
