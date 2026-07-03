import { Component, computed, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { SpotifyAuthService } from '../../../core/services/spotify-auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatTooltipModule, MatMenuModule, MatDividerModule],
  template: `
    <header class="navbar" role="banner" [class.navbar--scrolled]="isScrolled()">
      <div class="navbar__container">
        <a
          routerLink="/"
          class="navbar__brand"
          aria-label="Spotify AI Discovery — Home"
        >
          <div class="navbar__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" aria-hidden="true">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </div>
          <span class="navbar__brand-text">AI Discovery</span>
        </a>

        <nav class="navbar__nav" role="navigation" aria-label="Main navigation">
          <a
            routerLink="/"
            routerLinkActive="navbar__nav-link--active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="navbar__nav-link"
            aria-label="Home"
          >
            <mat-icon aria-hidden="true">home</mat-icon>
            <span>Home</span>
          </a>
        </nav>

        <div class="navbar__actions">
          <ng-container *ngIf="!auth.isAuthenticated()">
            <button mat-raised-button class="navbar__login-btn" (click)="login()">
              Connect Spotify
            </button>
          </ng-container>
          
          <ng-container *ngIf="auth.isAuthenticated() && auth.profileSignal() as profile">
            <button
              mat-button
              #trigger="matMenuTrigger"
              [matMenuTriggerFor]="profileMenu"
              class="navbar__profile-btn"
            >
              <ng-container *ngIf="profile.images?.length; else initialsAvatar">
                <img [src]="profile.images[0].url" [alt]="profile.display_name" class="navbar__avatar" />
              </ng-container>
              <ng-template #initialsAvatar>
                <div class="navbar__avatar navbar__avatar--initials">
                  {{ getInitials(profile.display_name) }}
                </div>
              </ng-template>
              <mat-icon class="navbar__chevron" [class.navbar__chevron--open]="trigger.menuOpen">expand_more</mat-icon>
            </button>
            
            <mat-menu #profileMenu="matMenu" class="navbar__profile-menu">
              <div class="navbar__profile-header">
                <p class="navbar__profile-name">{{ profile.display_name }}</p>
                <p class="navbar__profile-type" *ngIf="profile.product">
                  {{ profile.product === 'premium' ? 'Spotify Premium' : 'Spotify Free' }}
                </p>
              </div>
              <mat-divider></mat-divider>
              <a mat-menu-item [href]="'https://open.spotify.com/user/' + profile.id" target="_blank" rel="noopener">
                <mat-icon>open_in_new</mat-icon>
                <span>View on Spotify</span>
              </a>
              <button mat-menu-item (click)="logout()">
                <mat-icon>logout</mat-icon>
                <span>Log out</span>
              </button>
            </mat-menu>
          </ng-container>
        </div>
      </div>
    </header>
  `,
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  readonly isScrolled = signal(false);

  constructor(public auth: SpotifyAuthService) {}

  ngOnInit(): void {
    this.checkScroll();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.checkScroll();
  }

  private checkScroll(): void {
    this.isScrolled.set(window.scrollY > 20);
  }

  login(): void {
    this.auth.login();
  }

  logout(): void {
    this.auth.logout();
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
