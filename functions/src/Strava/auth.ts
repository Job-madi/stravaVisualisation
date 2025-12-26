import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as functions from 'firebase-functions';
import {
  stravaClientId,
  stravaClientSecret,
  stravaRedirectUri,
  frontendUrl,
  configureStrava,
  stravaScopes,
} from '../utils/stringHelper';
import strava from 'strava-v3';
import { logger } from 'firebase-functions';
import { setCorsHeaders } from '../utils/cors';

const db = getFirestore();

// initiate Strava OAuth - redirects to Strava authorization

export const stravaAuth = functions
  .runWith({
    secrets: [
      stravaClientId,
      stravaClientSecret,
      stravaRedirectUri,
      stravaScopes,
    ],
  })
  .https.onRequest(async (req, res) => {
    configureStrava();
    const state = req.query.state as string;
    const authUrl = strava.oauth.getRequestAccessURL({
      scope: stravaScopes.value(),
      state,
    });
    res.redirect(await authUrl);
  });

// callback handler for Strava OAuth, Strava redirects here, then we redirect to the frontend with state

export const stravaCallbackRedirect = functions
  .runWith({
    secrets: [
      stravaClientId,
      stravaClientSecret,
      stravaRedirectUri,
      stravaScopes,
    ],
  })
  .https.onRequest(async (req, res) => {
    configureStrava();

    try {
      const code = req.query.code as string;
      const error = req.query.error as string;
      const state = req.query.state as string;
      const baseUrl = frontendUrl.value();

      if (error) {
        res.redirect(`${baseUrl}?error=${error}`);
        return;
      }

      if (!code) {
        res.redirect(`${baseUrl}?error=no_code`);
        return;
      }

      if (!state) {
        res.redirect(`${baseUrl}?error=no_state`);
        return;
      }

      const result = await strava.oauth.getToken(code);

      const athlete = await strava.athlete.get({
        access_token: result.access_token,
      });

      const userId = athlete.id.toString();

      const userData = {
        id: userId,
        firstname: athlete.firstname ?? null,
        lastname: athlete.lastname ?? null,
        username: athlete.username ?? null,
        profile_image: (athlete.profile_medium || athlete.profile) ?? null,
        city: athlete.city ?? null,
        country: athlete.country ?? null,
        strava: {
          access_token: result.access_token ?? null,
          refresh_token: result.refresh_token ?? null,
          expires_at: result.expires_at ?? null,
        },
        updated_at: new Date(),
      };

      await db.collection('users').doc(userId).set(userData, { merge: true });

      const customToken = await getAuth().createCustomToken(userId);

      await db.collection('authTokens').doc(state).set({
        token: customToken,
        userId,
        createdAt: new Date(),
      });

      res.redirect(`${baseUrl}/auth/callback?state=${state}`);
    } catch (err: any) {
      logger.error('OAuth callback error:', err);
      logger.error('Error details:', err?.message, err?.response?.body);
      res.status(500).json({
        error: 'auth_failed',
        message: err?.message,
        details: err?.response?.body || err?.toString(),
      });
    }
  });

// Retrieve auth token by state

export const getAuthToken = functions.https.onRequest(async (req, res) => {
  setCorsHeaders(res, frontendUrl.value());

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const state = req.query.state as string;

  if (!state) {
    res.status(400).json({ error: 'state required' });
    return;
  }

  try {
    const doc = await db.collection('authTokens').doc(state).get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Token not found or expired', state });
      return;
    }

    const data = doc.data();
    const { token, userId } = data!;

    await db.collection('authTokens').doc(state).delete();

    res.json({ token, userId });
  } catch (err: any) {
    logger.error('getAuthToken error:', err);
    res.status(500).json({ error: 'Failed to retrieve token' });
  }
});

// Handles Strava OAuth callback (called from frontend after redirect)

export const stravaCallback = functions
  .runWith({
    secrets: [
      stravaClientId,
      stravaClientSecret,
      stravaRedirectUri,
      stravaScopes,
    ],
  })
  .https.onCall(async (data, context) => {
    configureStrava();

    try {
      const code = data.code;

      if (!code) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Authorization code required',
        );
      }

      // Exchange code for tokens
      const result = await strava.oauth.getToken(code);

      const athlete = await strava.athlete.get({
        access_token: result.access_token,
      });

      const userId = athlete.id.toString();

      const userDoc = await db.collection('users').doc(userId).get();

      if (userDoc.exists) {
        await db
          .collection('users')
          .doc(userId)
          .update({
            strava: {
              access_token: result.access_token,
              refresh_token: result.refresh_token,
              expires_at: result.expires_at,
            },
            updated_at: new Date(),
          });
      } else {
        await db
          .collection('users')
          .doc(userId)
          .set({
            id: userId,
            firstname: athlete.firstname,
            lastname: athlete.lastname,
            username: athlete.username,
            profile_image: athlete.profile_medium || athlete.profile,
            city: athlete.city,
            country: athlete.country,
            strava: {
              access_token: result.access_token,
              refresh_token: result.refresh_token,
              expires_at: result.expires_at,
            },
            created_at: new Date(),
            updated_at: new Date(),
          });
      }

      return {
        success: true,
        message: 'Strava authentication successful',
        uid: userId,
        profile: {
          firstname: athlete.firstname,
          lastname: athlete.lastname,
          profile_image: athlete.profile_medium || athlete.profile,
        },
      };
    } catch (error) {
      logger.error('OAuth error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to authenticate with Strava, Please try again homie:)',
      );
    }
  });

// Check if token is valid
export async function getValidToken(uid: string): Promise<string> {
  const userDoc = await db.collection('users').doc(uid).get();

  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();
  const stravaData = userData?.strava;

  if (!stravaData) {
    throw new Error('No Strava tokens found');
  }

  const { access_token, refresh_token, expires_at } = stravaData;

  // Check if token is expired (with 5 min buffer)
  const now = Math.floor(Date.now() / 1000);
  if (expires_at < now + 300) {
    const newTokens = await strava.oauth.refreshToken(refresh_token);

    await db
      .collection('users')
      .doc(uid)
      .update({
        strava: {
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: newTokens.expires_at,
        },
      });

    return newTokens.access_token;
  }

  return access_token;
}
