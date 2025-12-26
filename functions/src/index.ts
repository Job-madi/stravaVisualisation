import { initializeApp } from 'firebase-admin/app';

initializeApp();

//strava oauth
export {
  stravaAuth,
  stravaCallbackRedirect,
  stravaCallback,
  getAuthToken,
} from './Strava/auth';

//user priofile
export { getProfile } from './Strava/user';

//activities
export { syncActivities, getActivities } from './Strava/activities';

//analytics
export {
  getWeeklyStats,
  getHabitPatterns,
  getLoadMetrics,
  getYearInReview,
  getPersonalRecords,
  getRouteHeatmap,
  getHeartRateZones,
} from './Strava/analytics';
