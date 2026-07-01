import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="app-main" role="main" id="main-content">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [
    `
      @use 'variables' as vars;

      .app-main {
        padding-top: vars.$navbar-height;
        min-height: 100vh;

        @media (max-width: 767px) {
          padding-top: vars.$navbar-height-mobile;
        }
      }
    `,
  ],
})
export class AppComponent {}
