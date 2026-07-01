import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DISCOVERY_MODES } from '../../constants/discovery-modes.constants';
import { MOCK_RECENTLY_PLAYED, MOCK_RECOMMENDED } from '../../constants/mock-data.constants';
import { DiscoveryMode, RecentlyPlayedItem, RecommendedItem } from '../../models';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

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
  readonly recentlyPlayed = signal<RecentlyPlayedItem[]>([]);
  readonly recommended = signal<RecommendedItem[]>([]);
  readonly isLoading = signal(true);

  readonly greetingText = this.getGreeting();

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    setTimeout(() => {
      this.recentlyPlayed.set(MOCK_RECENTLY_PLAYED);
      this.recommended.set(MOCK_RECOMMENDED);
      this.isLoading.set(false);
    }, 600);
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
