import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Auth, User, onAuthStateChanged, signInWithCustomToken, signOut } from '@angular/fire/auth';
import { environment } from '../../enviroments/enviroment';

import {
  ProfileResponse,
  ActivitiesResponse,
  SyncResponse,
  WeeklyStatsResponse,
  HabitPatternsResponse,
  LoadMetricsResponse,
  YearInReviewResponse,
  PersonalRecordsResponse,
  RouteHeatmapResponse,
  HeartRateZonesResponse,
} from '../models';

export * from '../models';

@Injectable({
  providedIn: 'root'
})
export class StravaService {
  private http = inject(HttpClient);
  private functions = inject(Functions);
  private auth = inject(Auth);
  private baseUrl = environment.functionsUrl;

  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.userSubject.next(user);
    });
  }

  get userId(): string | null {
    return this.userSubject.value?.uid || null;
  }

  get isLoggedIn(): boolean {
    return !!this.userSubject.value;
  }

  login(): void {
    const state = crypto.randomUUID();
    sessionStorage.setItem('oauth_state', state);
    window.location.href = `${environment.stravaAuthUrl}?state=${state}`;
  }

  async handleCallback(state: string): Promise<boolean> {
    const savedState = sessionStorage.getItem('oauth_state');

    if (!state || state !== savedState) {
      console.error('State mismatch');
      return false;
    }

    sessionStorage.removeItem('oauth_state');

    try {
      const response = await this.getAuthToken(state).toPromise();
      if (response?.token) {
        await signInWithCustomToken(this.auth, response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Auth callback error:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  private getAuthToken(state: string): Observable<{ token: string; userId: string }> {
    return this.http.get<{ token: string; userId: string }>(
      `${this.baseUrl}/getAuthToken?state=${state}`
    );
  }

  getProfile(): Observable<ProfileResponse> {
    const fn = httpsCallable<void, ProfileResponse>(this.functions, 'getProfile');
    return from(fn()).pipe(map(result => result.data));
  }

  syncActivities(): Observable<SyncResponse> {
    const fn = httpsCallable<void, SyncResponse>(this.functions, 'syncActivities');
    return from(fn()).pipe(map(result => result.data));
  }

  getActivities(limit = 100, type?: string): Observable<ActivitiesResponse> {
    const fn = httpsCallable<{ limit: number; type?: string }, ActivitiesResponse>(
      this.functions, 'getActivities'
    );
    return from(fn({ limit, type })).pipe(map(result => result.data));
  }

  getWeeklyStats(): Observable<WeeklyStatsResponse> {
    const fn = httpsCallable<void, WeeklyStatsResponse>(this.functions, 'getWeeklyStats');
    return from(fn()).pipe(map(result => result.data));
  }

  getHabitPatterns(): Observable<HabitPatternsResponse> {
    const fn = httpsCallable<void, HabitPatternsResponse>(this.functions, 'getHabitPatterns');
    return from(fn()).pipe(map(result => result.data));
  }

  getLoadMetrics(): Observable<LoadMetricsResponse> {
    const fn = httpsCallable<void, LoadMetricsResponse>(this.functions, 'getLoadMetrics');
    return from(fn()).pipe(map(result => result.data));
  }

  getYearInReview(): Observable<YearInReviewResponse> {
    const fn = httpsCallable<void, YearInReviewResponse>(this.functions, 'getYearInReview');
    return from(fn()).pipe(map(result => result.data));
  }

  getPersonalRecords(): Observable<PersonalRecordsResponse> {
    const fn = httpsCallable<void, PersonalRecordsResponse>(this.functions, 'getPersonalRecords');
    return from(fn()).pipe(map(result => result.data));
  }

  getRouteHeatmap(): Observable<RouteHeatmapResponse> {
    const fn = httpsCallable<void, RouteHeatmapResponse>(this.functions, 'getRouteHeatmap');
    return from(fn()).pipe(map(result => result.data));
  }

  getHeartRateZones(maxHR?: number): Observable<HeartRateZonesResponse> {
    const fn = httpsCallable<{ maxHR?: number }, HeartRateZonesResponse>(
      this.functions, 'getHeartRateZones'
    );
    return from(fn({ maxHR })).pipe(map(result => result.data));
  }
}
