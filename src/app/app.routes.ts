import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./pages/auth-callback/auth-callback.component').then(m => m.AuthCallbackComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'habits',
    loadComponent: () => import('./pages/habits/habits.component').then(m => m.HabitsComponent)
  },
  {
    path: 'story',
    loadComponent: () => import('./pages/story/story.component').then(m => m.StoryComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
