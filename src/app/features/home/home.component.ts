import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DISCOVERY_MODES } from '../../constants/discovery-modes.constants';
import { MOCK_RECENTLY_PLAYED, MOCK_RECOMMENDED } from '../../constants/mock-data.constants';
import { DiscoveryMode, RecentlyPlayedItem, RecommendedItem } from '../../models';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { SpotifyAuthService } from '../../core/services/spotify-auth.service';
import { SpotifyService } from '../../core/services/spotify.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatRippleModule,
    MatTooltipModule,
    SkeletonLoaderComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  readonly discoveryModes: DiscoveryMode[] = DISCOVERY_MODES;
  readonly recentlyPlayed = signal<RecentlyPlayedItem[]>(MOCK_RECENTLY_PLAYED);
  readonly recommended = signal<RecommendedItem[]>(MOCK_RECOMMENDED);
  readonly isLoading = signal(false);

  readonly greetingText = this.getGreeting();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: SpotifyAuthService,
    private spotify: SpotifyService,
  ) {}

  ngOnInit(): void {
    // Handle Spotify OAuth callback — Spotify redirects back to '/' with ?code=...
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const error = params['error'];

      if (error) {
        console.error('Spotify auth error:', error);
        this.router.navigate(['/'], { replaceUrl: true });
        return;
      }

      if (code) {
        this.isLoading.set(true);
        this.auth.handleCallback(code).subscribe({
          next: (success) => {
            this.router.navigate(['/'], { replaceUrl: true });
            if (success) {
              this.loadRealData();
            } else {
              this.isLoading.set(false);
              // Keep showing mock data on failure
            }
          },
          error: () => {
            this.router.navigate(['/'], { replaceUrl: true });
            this.isLoading.set(false);
          }
        });
      } else if (this.auth.isAuthenticated()) {
        // Already logged in — load real Spotify data
        this.loadRealData();
      }
      // Not logged in, no code → mock data is already set as default, do nothing
    });
  }

  private loadRealData(): void {
    this.isLoading.set(true);
    this.spotify.getRecentlyPlayed().subscribe({
      next: (items) => {
        // If Spotify returned data, use it; otherwise keep mock
        if (items && items.length > 0) {
          this.recentlyPlayed.set(items);
        }
        // Recommended for you: always use mock (no Spotify recommendations endpoint)
        this.recommended.set(MOCK_RECOMMENDED);
        this.isLoading.set(false);
      },
      error: () => {
        // On error, keep existing mock data
        this.isLoading.set(false);
      }
    });
  }

  onDiscoveryCardClick(mode: DiscoveryMode): void {
    this.router.navigate(['/discovery', mode.id]);
  }

  trackByModeId(_index: number, mode: DiscoveryMode): string {
    return mode.id;
  }

  trackByItemId(_index: number, item: RecentlyPlayedItem | RecommendedItem): string {
    return item.id;
  }

  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
}
