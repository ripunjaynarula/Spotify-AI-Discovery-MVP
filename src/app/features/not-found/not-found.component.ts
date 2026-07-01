import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  template: `
    <div class="not-found page-enter">
      <div class="not-found__container">
        <div class="not-found__content">
          <mat-icon class="not-found__icon">search_off</mat-icon>
          <h1 class="not-found__title">Page not found</h1>
          <p class="not-found__message">
            We can't seem to find the page you're looking for. It may have been moved, deleted, or never existed.
          </p>
          <div class="not-found__actions">
            <a mat-raised-button class="not-found__btn-primary" routerLink="/">
              <mat-icon>home</mat-icon>
              Go to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @use 'variables' as vars;
      @use 'mixins' as mix;

      .not-found {
        min-height: calc(100vh - vars.$navbar-height);
        @include mix.flex-center;

        @include mix.mobile {
          min-height: calc(100vh - vars.$navbar-height-mobile);
        }

        &__container {
          max-width: 500px;
          margin: 0 auto;
          padding: vars.$space-10 vars.$content-padding;
        }

        &__content {
          @include mix.flex-column;
          align-items: center;
          text-align: center;
          gap: vars.$space-4;
        }

        &__icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          color: vars.$color-text-muted;
          margin-bottom: vars.$space-2;
        }

        &__title {
          font-size: clamp(vars.$font-size-3xl, 5vw, vars.$font-size-4xl);
          font-weight: vars.$font-weight-black;
          color: vars.$color-text-primary;
          letter-spacing: vars.$letter-spacing-tight;
        }

        &__message {
          font-size: vars.$font-size-base;
          color: vars.$color-text-secondary;
          line-height: vars.$line-height-relaxed;
          margin-bottom: vars.$space-6;
        }

        &__btn-primary {
          @include mix.button-primary;
          height: 48px;
          border-radius: vars.$radius-full;
          font-family: vars.$font-family;
          font-weight: vars.$font-weight-bold;
          padding: 0 vars.$space-8;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: vars.$space-2;
        }
      }
    `,
  ],
})
export class NotFoundComponent {}
