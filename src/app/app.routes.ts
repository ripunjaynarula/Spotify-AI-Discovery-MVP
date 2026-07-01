import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
    title: 'Spotify AI Discovery — Discover Music Your Way',
  },
  {
    path: 'discovery/:modeId',
    loadComponent: () =>
      import('./features/discovery/discovery.component').then((m) => m.DiscoveryComponent),
    title: 'Discover Music — Spotify AI Discovery',
  },
  {
    path: 'playlist',
    loadComponent: () =>
      import('./features/playlist/playlist.component').then((m) => m.PlaylistComponent),
    title: 'Your Curated Playlist — Spotify AI Discovery',
  },
  {
    path: 'success',
    loadComponent: () =>
      import('./features/success/success.component').then((m) => m.SuccessComponent),
    title: 'Preferences Updated — Spotify AI Discovery',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page Not Found — Spotify AI Discovery',
  },
];
