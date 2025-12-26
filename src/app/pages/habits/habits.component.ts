import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { StravaService, HabitPatternsResponse } from '../../services/strava.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-habits',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './habits.component.html',
  styleUrl: './habits.component.scss'
})
export class HabitsComponent implements OnInit {
  private router = inject(Router);
  private strava = inject(StravaService);

  loading = signal(true);
  data = signal<HabitPatternsResponse | null>(null);
  maxDayCount = 0;

  ngOnInit(): void {
    this.strava.user$.subscribe(user => {
      if (user) {
        this.loadData();
      } else if (user === null) {
        this.router.navigate(['/']);
      }
    });
  }

  loadData(): void {
    this.strava.getHabitPatterns().subscribe({
      next: (res) => {
        this.data.set(res);
        this.maxDayCount = Math.max(...res.dayDistribution.map(d => d.count));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load habit patterns:', err);
        this.loading.set(false);
      }
    });
  }

  getBarHeight(count: number): number {
    if (this.maxDayCount === 0) return 5;
    return Math.max(5, (count / this.maxDayCount) * 100);
  }
}
