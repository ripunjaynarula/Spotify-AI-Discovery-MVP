import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div
      class="error-banner"
      role="alert"
      aria-live="assertive"
      [class.error-banner--inline]="variant === 'inline'"
      [class.error-banner--page]="variant === 'page'"
    >
      <div class="error-banner__icon-wrapper" aria-hidden="true">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      <div class="error-banner__content">
        <h3 class="error-banner__title">{{ title }}</h3>
        <p class="error-banner__message">{{ message }}</p>
      </div>
      <div class="error-banner__actions" *ngIf="showActions">
        <button
          mat-stroked-button
          class="error-banner__action"
          (click)="onRetry()"
          *ngIf="onRetryFn"
        >
          <mat-icon>refresh</mat-icon>
          Try again
        </button>
        <button
          mat-stroked-button
          class="error-banner__action"
          (click)="onGoHome()"
        >
          <mat-icon>home</mat-icon>
          Go home
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./error-banner.component.scss'],
})
export class ErrorBannerComponent {
  @Input() title = 'Something went wrong';
  @Input() message = 'An unexpected error occurred. Please try again.';
  @Input() icon = 'error_outline';
  @Input() variant: 'inline' | 'page' = 'inline';
  @Input() showActions = true;
  @Input() onRetryFn?: () => void;

  constructor(private router: Router) {}

  onRetry(): void {
    if (this.onRetryFn) {
      this.onRetryFn();
    }
  }

  onGoHome(): void {
    this.router.navigate(['/']);
  }
}
