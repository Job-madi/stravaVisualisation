import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import {
  stravaClientId,
  stravaClientSecret,
  stravaRedirectUri,
  stravaScopes,
  configureStrava,
} from '../utils/stringHelper';
import strava from 'strava-v3';
import { getValidToken } from './auth';
import { logger } from 'firebase-functions';

const db = getFirestore();

export const syncActivities = functions
  .runWith({
    secrets: [
      stravaClientId,
      stravaClientSecret,
      stravaRedirectUri,
      stravaScopes,
    ],
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }

    configureStrava();
    const userId = context.auth.uid;

    try {
      const accessToken = await getValidToken(userId);

      // Fetch activities from last 12 months
      const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;

      const allActivities: any[] = [];
      let page = 1;

      while (true) {
        const activities = await strava.athlete.listActivities({
          access_token: accessToken,
          after: oneYearAgo,
          page,
          per_page: 100,
        });

        allActivities.push(...activities);

        if (activities.length < 100) break;
        page++;
      }

      const batch = db.batch();
      const activitiesRef = db
        .collection('users')
        .doc(userId)
        .collection('activities');

      for (const a of allActivities) {
        batch.set(
          activitiesRef.doc(a.id.toString()),
          {
            strava_id: a.id,
            name: a.name,
            type: a.type,
            sport_type: a.sport_type,
            distance: a.distance,
            moving_time: a.moving_time,
            elapsed_time: a.elapsed_time,
            total_elevation_gain: a.total_elevation_gain,
            start_date: a.start_date,
            start_date_local: a.start_date_local,
            timezone: a.timezone,
            start_latlng: a.start_latlng,
            average_speed: a.average_speed,
            max_speed: a.max_speed,
            average_heartrate: a.average_heartrate || null,
            max_heartrate: a.max_heartrate || null,
            suffer_score: a.suffer_score || null,
            summary_polyline: a.map?.summary_polyline || null,
            synced_at: new Date(),
          },
          { merge: true },
        );
      }

      await batch.commit();

      await db.collection('users').doc(userId).update({
        last_sync: new Date(),
        activity_count: allActivities.length,
      });

      return { success: true, synced: allActivities.length };
    } catch (error) {
      logger.error('Sync error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to sync activities',
      );
    }
  });

export const getActivities = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const userId = context.auth.uid;
  const limit = data?.limit || 100;
  const type = data?.type as string;

  try {
    let query: FirebaseFirestore.Query = db
      .collection('users')
      .doc(userId)
      .collection('activities')
      .orderBy('start_date', 'desc')
      .limit(limit);

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.get();
    const activities = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, count: activities.length, activities };
  } catch (error) {
    logger.error('Get activities error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get activities',
    );
  }
});
