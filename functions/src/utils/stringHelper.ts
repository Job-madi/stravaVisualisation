import { defineSecret, defineString } from 'firebase-functions/params';
import strava from 'strava-v3';

export const stravaClientId = defineSecret('STRAVA_CLIENT_ID');
export const stravaClientSecret = defineSecret('STRAVA_CLIENT_SECRET');
export const stravaRedirectUri = defineSecret('STRAVA_REDIRECT_URI');
export const frontendUrl = defineString('FRONTEND_URL');
export const stravaScopes = defineSecret('STRAVA_SCOPES');

export function configureStrava(): void {
  strava.config({
    access_token: '',
    client_id: stravaClientId.value(),
    client_secret: stravaClientSecret.value(),
    redirect_uri: stravaRedirectUri.value(),
  });
}
