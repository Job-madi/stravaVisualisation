import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { logger } from 'firebase-functions';
const db = getFirestore();

export const getProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const userId = context.auth.uid;

  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    return {
      success: true,
      profile: {
        firstname: userData?.firstname,
        lastname: userData?.lastname,
        username: userData?.username,
        profile_image: userData?.profile_image,
        city: userData?.city,
        country: userData?.country,
      },
      last_sync: userData?.last_sync,
      activity_count: userData?.activity_count,
    };
  } catch (error: any) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    logger.error('Get profile error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get profile');
  }
});
