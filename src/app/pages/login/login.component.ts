import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StravaService } from '../../services/strava.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private strava = inject(StravaService);

  login(): void {
    this.strava.login();
  }
}
