import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface SpotifyProfile {
  id: string;
  display_name: string;
  images: Array<{ url: string; height: number; width: number }>;
  product: string; // 'premium' | 'free' | 'open'
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

@Injectable({
  providedIn: 'root'
})
export class SpotifyAuthService {
  private readonly AUTH_URL = 'https://accounts.spotify.com/authorize';
  private readonly TOKEN_URL = 'https://accounts.spotify.com/api/token';
  private readonly PROFILE_URL = 'https://api.spotify.com/v1/me';
  
  // Use environment variables or fallback if missing during build
  private get clientId(): string { return environment.spotifyClientId || ''; }
  private get redirectUri(): string { return (environment as any).spotifyRedirectUri || window.location.origin + '/'; }

  private readonly SCOPES = [
    'user-read-private',
    'user-read-email',
    'user-top-read',
    'user-read-recently-played',
    'playlist-modify-public',
    'playlist-modify-private'
  ].join(' ');

  private profileSubject = new BehaviorSubject<SpotifyProfile | null>(null);
  
  readonly isAuthenticated = signal(false);
  readonly userProfile = this.profileSubject.asObservable();
  readonly profileSignal = signal<SpotifyProfile | null>(null);

  constructor(private http: HttpClient, private router: Router, private snackBar: MatSnackBar) {
    this.restoreSession();
  }

  private restoreSession(): void {
    const accessToken = this.getAccessToken();
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    
    if (accessToken) {
      this.isAuthenticated.set(true);
      this.fetchProfile().subscribe();
    } else if (refreshToken) {
      this.refreshAccessToken().subscribe();
    }
  }

  async login(): Promise<void> {
    if (!this.clientId) {
      this.snackBar.open('Spotify Client ID is not configured.', 'Dismiss', { duration: 5000 });
      return;
    }
    
    const codeVerifier = this.generateRandomString(128);
    localStorage.setItem('spotify_code_verifier', codeVerifier);
    
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    const args = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: this.SCOPES,
      redirect_uri: this.redirectUri,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge
    });

    window.location.href = `${this.AUTH_URL}?${args.toString()}`;
  }

  handleCallback(code: string): Observable<boolean> {
    const codeVerifier = localStorage.getItem('spotify_code_verifier');
    localStorage.removeItem('spotify_code_verifier');

    if (!codeVerifier) {
      return throwError(() => new Error('Code verifier not found'));
    }

    const body = new URLSearchParams({
      client_id: this.clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
    });

    return this.http.post<TokenResponse>(this.TOKEN_URL, body.toString(), {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    }).pipe(
      tap(response => this.saveTokens(response)),
      switchMap(() => this.fetchProfile()),
      map(() => true),
      catchError(err => {
        console.error('Failed to handle Spotify callback', err);
        this.snackBar.open('Authentication failed. Please try logging in again.', 'Dismiss', { duration: 5000 });
        return of(false);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expires');
    
    this.isAuthenticated.set(false);
    this.profileSubject.next(null);
    this.profileSignal.set(null);
    
    // Use Angular router to navigate to home
    this.router.navigate(['/']);
  }

  getValidAccessToken(): Observable<string> {
    if (this.isAuthenticated()) {
      const token = this.getAccessToken();
      const expiresAt = localStorage.getItem('spotify_token_expires');
      
      // If token exists and hasn't expired (with 1 min buffer)
      if (token && expiresAt && parseInt(expiresAt) > Date.now() + 60000) {
        return of(token);
      }
      
      return this.refreshAccessToken();
    } else {
      const ccToken = localStorage.getItem('spotify_client_credentials_token');
      const ccExpiresAt = localStorage.getItem('spotify_client_credentials_expires');
      
      if (ccToken && ccExpiresAt && parseInt(ccExpiresAt) > Date.now() + 60000) {
        return of(ccToken);
      }
      return this.getClientCredentialsToken();
    }
  }

  private getClientCredentialsToken(): Observable<string> {
    const credentials = btoa(`${this.clientId}:${environment.spotifyClientSecret}`);
    const headers = new HttpHeaders({
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    const body = new URLSearchParams({
      grant_type: 'client_credentials'
    });

    return this.http.post<any>(this.TOKEN_URL, body.toString(), { headers }).pipe(
      map(res => {
        localStorage.setItem('spotify_client_credentials_token', res.access_token);
        localStorage.setItem('spotify_client_credentials_expires', (Date.now() + res.expires_in * 1000).toString());
        return res.access_token;
      }),
      catchError(err => {
        console.error('Client credentials auth failed:', err);
        return throwError(() => err);
      })
    );
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('spotify_access_token');
  }

  private refreshAccessToken(): Observable<string> {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    const body = new URLSearchParams({
      client_id: this.clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    return this.http.post<TokenResponse>(this.TOKEN_URL, body.toString(), {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    }).pipe(
      tap(response => this.saveTokens(response)),
      map(response => response.access_token),
      catchError(err => {
        console.error('Failed to refresh token', err);
        this.snackBar.open('Your session expired. Please log in again.', 'Dismiss', { duration: 5000 });
        this.logout();
        return throwError(() => err);
      })
    );
  }

  private fetchProfile(): Observable<SpotifyProfile> {
    return this.getValidAccessToken().pipe(
      switchMap(token => {
        return this.http.get<SpotifyProfile>(this.PROFILE_URL, {
          headers: new HttpHeaders({
            'Authorization': `Bearer ${token}`
          })
        });
      }),
      tap(profile => {
        this.profileSubject.next(profile);
        this.profileSignal.set(profile);
        this.isAuthenticated.set(true);
      }),
      catchError(err => {
        console.error('Failed to fetch profile', err);
        this.snackBar.open('Could not load your Spotify profile.', 'Dismiss', { duration: 5000 });
        return throwError(() => err);
      })
    );
  }

  private saveTokens(response: TokenResponse): void {
    localStorage.setItem('spotify_access_token', response.access_token);
    if (response.refresh_token) {
      localStorage.setItem('spotify_refresh_token', response.refresh_token);
    }
    // Set expiration time
    localStorage.setItem('spotify_token_expires', (Date.now() + response.expires_in * 1000).toString());
    this.isAuthenticated.set(true);
  }

  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
  }

  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
