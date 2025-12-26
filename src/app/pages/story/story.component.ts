import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { StravaService, Highlight, UserProfile } from '../../services/strava.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-story',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
  templateUrl: './story.component.html',
  styleUrl: './story.component.scss'
})
export class StoryComponent implements OnInit {
  private router = inject(Router);
  private strava = inject(StravaService);

  loading = signal(true);
  profile = signal<UserProfile | null>(null);
  highlights = signal<Highlight[]>([]);

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

    this.strava.getProfile().subscribe({
      next: (res) => this.profile.set(res.profile),
      error: (err) => console.error('Failed to load profile:', err)
    });

    this.strava.getYearInReview().subscribe({
      next: (res) => {
        this.highlights.set(res.highlights);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load year in review:', err);
        this.loading.set(false);
      }
    });
  }
}
