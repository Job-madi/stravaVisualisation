import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { StravaService } from '../../services/strava.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [],
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.scss'
})
export class AuthCallbackComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private strava = inject(StravaService);

  message = 'Connecting to Strava...';

  ngOnInit(): void {
    this.route.queryParams.subscribe(async params => {
      const state = params['state'];
      const error = params['error'];

      if (error) {
        this.message = 'Authentication failed';
        setTimeout(() => this.router.navigate(['/']), 2000);
        return;
      }

      if (state) {
        this.message = 'Signing you in...';
        const success = await this.strava.handleCallback(state);

        if (success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.message = 'Authentication failed';
          setTimeout(() => this.router.navigate(['/']), 2000);
        }
      } else {
        this.router.navigate(['/']);
      }
    });
  }
}
