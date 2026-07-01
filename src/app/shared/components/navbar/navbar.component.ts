import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <header class="navbar" role="banner">
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
          <a
            routerLink="/discovery/surprise-me"
            routerLinkActive="navbar__nav-link--active"
            class="navbar__nav-link navbar__nav-link--discover"
            aria-label="AI Discover"
          >
            <mat-icon aria-hidden="true">auto_awesome</mat-icon>
            <span>Discover</span>
          </a>
        </nav>

        <div class="navbar__badge" aria-label="AI-powered feature">
          <mat-icon aria-hidden="true">auto_awesome</mat-icon>
          <span>AI-Powered</span>
        </div>
      </div>
    </header>
  `,
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {}
