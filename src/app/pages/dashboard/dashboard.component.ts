import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { StravaService, Activity, UserProfile } from '../../services/strava.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private strava = inject(StravaService);

  profile = signal<UserProfile | null>(null);
  activities = signal<Activity[]>([]);
  syncing = signal(false);

  Math = Math;

  ngOnInit(): void {

    this.strava.user$.subscribe(user => {
      if (user) {
        this.loadProfile();
        this.loadActivities();
      } else if (user === null) {

        this.router.navigate(['/']);
      }
    });
  }

  loadProfile(): void {
    this.strava.getProfile().subscribe({
      next: (res) => this.profile.set(res.profile),
      error: (err) => console.error('Failed to load profile:', err)
    });
  }

  loadActivities(): void {
    this.strava.getActivities(200).subscribe({
      next: (res) => this.activities.set(res.activities),
      error: (err) => console.error('Failed to load activities:', err)
    });
  }

  sync(): void {
    this.syncing.set(true);
    this.strava.syncActivities().subscribe({
      next: (res) => {
        console.log(`Synced ${res.synced} activities`);
        this.loadActivities();
        this.syncing.set(false);
      },
      error: (err) => {
        console.error('Sync failed:', err);
        this.syncing.set(false);
      }
    });
  }

  async logout(): Promise<void> {
    await this.strava.logout();
    this.router.navigate(['/']);
  }

  // Computed stats
  totalDistance(): number {
    return this.activities().reduce((sum, a) => sum + a.distance, 0) / 1000;
  }

  totalHours(): number {
    return this.activities().reduce((sum, a) => sum + a.moving_time, 0) / 3600;
  }

  totalElevation(): number {
    return this.activities().reduce((sum, a) => sum + a.total_elevation_gain, 0);
  }

  // Calendar heatmap data
  calendarWeeks(): { date: string; count: number }[][] {
    const weeks: { date: string; count: number }[][] = [];
    const activityDates = new Map<string, number>();

    // Count activities per date
    for (const activity of this.activities()) {
      const date = activity.start_date_local.split('T')[0];
      activityDates.set(date, (activityDates.get(date) || 0) + 1);
    }

    // Generate last 52 weeks
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start on Sunday

    let currentWeek: { date: string; count: number }[] = [];
    const current = new Date(startDate);

    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0];
      currentWeek.push({
        date: dateStr,
        count: activityDates.get(dateStr) || 0
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      current.setDate(current.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins}m`;
  }
}
