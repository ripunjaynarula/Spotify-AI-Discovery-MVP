import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonVariant = 'text' | 'circle' | 'rect' | 'card';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="skeleton"
      [class]="'skeleton--' + variant"
      [style.width]="width"
      [style.height]="height"
      [attr.aria-hidden]="true"
    ></div>
  `,
  styles: [
    `
      @use 'variables' as vars;
      @use 'mixins' as mix;

      .skeleton {
        @include mix.skeleton-shimmer;
        border-radius: vars.$radius-md;

        &--text {
          height: 14px;
          border-radius: vars.$radius-full;
        }

        &--circle {
          border-radius: 50%;
        }

        &--rect {
          border-radius: vars.$radius-md;
        }

        &--card {
          border-radius: vars.$radius-lg;
          min-height: 200px;
        }
      }
    `,
  ],
})
export class SkeletonLoaderComponent {
  @Input() variant: SkeletonVariant = 'rect';
  @Input() width = '100%';
  @Input() height = '16px';
}
