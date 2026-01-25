import strava from 'strava-v3';

export const stravaClientId = process.env.STRAVA_CLIENT_ID || '';
export const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET || '';
export const stravaRedirectUri = process.env.STRAVA_REDIRECT_URI || '';
export const frontendUrl = process.env.FRONTEND_URL || '';
export const stravaScopes = process.env.STRAVA_SCOPES || '';

export function configureStrava(): void {
  strava.config({
    access_token: '',
    client_id: stravaClientId,
    client_secret: stravaClientSecret,
    redirect_uri: stravaRedirectUri,
  });
}
