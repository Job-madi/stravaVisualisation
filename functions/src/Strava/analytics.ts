import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { logger } from 'firebase-functions';

const db = getFirestore();

interface Activity {
  strava_id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  average_speed: number;
  average_heartrate: number | null;
  suffer_score: number | null;
}

async function getAllActivities(userId: string): Promise<Activity[]> {
  const snapshot = await db
    .collection('users')
    .doc(userId)
    .collection('activities')
    .orderBy('start_date', 'desc')
    .get();
  return snapshot.docs.map((doc) => doc.data() as Activity);
}

export const getWeeklyStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const userId = context.auth.uid;

  try {
    const activities = await getAllActivities(userId);

    const weeklyMap = new Map<
      string,
      {
        week: string;
        count: number;
        distance: number;
        moving_time: number;
        elevation: number;
      }
    >();

    for (const a of activities) {
      const date = new Date(a.start_date_local);
      const weekStart = getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];

      const existing = weeklyMap.get(weekKey) || {
        week: weekKey,
        count: 0,
        distance: 0,
        moving_time: 0,
        elevation: 0,
      };

      existing.count++;
      existing.distance += a.distance;
      existing.moving_time += a.moving_time;
      existing.elevation += a.total_elevation_gain;

      weeklyMap.set(weekKey, existing);
    }

    const weeks = Array.from(weeklyMap.values()).sort((a, b) =>
      a.week.localeCompare(b.week),
    );

    return { success: true, weeks };
  } catch (error) {
    logger.error('Weekly stats error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get weekly stats',
    );
  }
});

export const getHabitPatterns = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }

    const userId = context.auth.uid;

    try {
      const activities = await getAllActivities(userId);

      const dayOfWeek = [0, 0, 0, 0, 0, 0, 0];
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const timeOfDay = { morning: 0, afternoon: 0, evening: 0, night: 0 };
      const activityDates = new Set<string>();

      for (const a of activities) {
        const date = new Date(a.start_date_local);
        dayOfWeek[date.getDay()]++;

        const hour = date.getHours();
        if (hour >= 5 && hour < 12) timeOfDay.morning++;
        else if (hour >= 12 && hour < 17) timeOfDay.afternoon++;
        else if (hour >= 17 && hour < 21) timeOfDay.evening++;
        else timeOfDay.night++;

        activityDates.add(date.toISOString().split('T')[0]);
      }

      const { currentStreak, longestStreak } = calculateStreaks(activityDates);

      const totalActivities = activities.length;
      const dayDistribution = dayOfWeek.map((count, i) => ({
        day: dayNames[i],
        count,
        percentage:
          totalActivities > 0 ? Math.round((count / totalActivities) * 100) : 0,
      }));

      const sortedDays = [...dayDistribution].sort((a, b) => a.count - b.count);
      const mostSkippedDay = sortedDays[0]?.day;
      const mostActiveDay = sortedDays[sortedDays.length - 1]?.day;

      return {
        success: true,
        dayDistribution,
        timeOfDay,
        currentStreak,
        longestStreak,
        mostSkippedDay,
        mostActiveDay,
        totalActivities,
      };
    } catch (error) {
      logger.error('Habit patterns error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to get habit patterns',
      );
    }
  },
);

export const getLoadMetrics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const userId = context.auth.uid;

  try {
    const activities = await getAllActivities(userId);

    const weeklyLoads = new Map<string, number[]>();

    for (const a of activities) {
      const date = new Date(a.start_date_local);
      const weekStart = getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];

      const load = a.suffer_score || a.moving_time / 60;

      const existing = weeklyLoads.get(weekKey) || [];
      existing.push(load);
      weeklyLoads.set(weekKey, existing);
    }

    const loadMetrics = Array.from(weeklyLoads.entries())
      .map(([week, dailyLoads]) => {
        const weeklyLoad = dailyLoads.reduce((sum, l) => sum + l, 0);
        const avgDailyLoad = weeklyLoad / 7;

        const variance =
          dailyLoads.reduce(
            (sum, l) => sum + Math.pow(l - avgDailyLoad, 2),
            0,
          ) / 7;
        const stdDev = Math.sqrt(variance);

        const monotony = stdDev > 0 ? avgDailyLoad / stdDev : 0;
        const strain = weeklyLoad * monotony;

        return {
          week,
          weeklyLoad: Math.round(weeklyLoad),
          activityCount: dailyLoads.length,
          monotony: Math.round(monotony * 100) / 100,
          strain: Math.round(strain),
        };
      })
      .sort((a, b) => a.week.localeCompare(b.week));

    return { success: true, loadMetrics };
  } catch (error) {
    logger.error('Load metrics error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get load metrics',
    );
  }
});

export const getYearInReview = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const userId = context.auth.uid;

  try {
    const activities = await getAllActivities(userId);
    const runActivities = activities.filter(
      (a) =>
        a.type === 'Run' || a.type === 'TrailRun' || a.type === 'VirtualRun',
    );

    const highlights: Array<{
      type: string;
      title: string;
      value: string;
      detail: string;
    }> = [];

    const totalDistance =
      activities.reduce((sum, a) => sum + a.distance, 0) / 1000;
    const totalTime =
      activities.reduce((sum, a) => sum + a.moving_time, 0) / 3600;
    const totalElevation = activities.reduce(
      (sum, a) => sum + a.total_elevation_gain,
      0,
    );

    highlights.push({
      type: 'total',
      title: 'Total Distance',
      value: `${Math.round(totalDistance)} km`,
      detail: `Across ${activities.length} activities`,
    });

    highlights.push({
      type: 'total',
      title: 'Time Moving',
      value: `${Math.round(totalTime)} hours`,
      detail: `That's ${Math.round(totalTime / 24)} full days of exercise!`,
    });

    // Biggest week
    const weeklyMap = new Map<string, { distance: number; count: number }>();
    for (const a of activities) {
      const weekKey = getWeekStart(new Date(a.start_date_local))
        .toISOString()
        .split('T')[0];
      const existing = weeklyMap.get(weekKey) || { distance: 0, count: 0 };
      existing.distance += a.distance;
      existing.count++;
      weeklyMap.set(weekKey, existing);
    }

    const biggestWeek = Array.from(weeklyMap.entries()).sort(
      (a, b) => b[1].distance - a[1].distance,
    )[0];

    if (biggestWeek) {
      highlights.push({
        type: 'record',
        title: 'Biggest Week',
        value: `${Math.round(biggestWeek[1].distance / 1000)} km`,
        detail: `Week of ${formatWeek(biggestWeek[0])} with ${biggestWeek[1].count} activities`,
      });
    }

    // Most consistent month
    const monthlyMap = new Map<string, number>();
    for (const a of activities) {
      const monthKey = a.start_date_local.substring(0, 7);
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
    }

    const mostConsistentMonth = Array.from(monthlyMap.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0];

    if (mostConsistentMonth) {
      highlights.push({
        type: 'consistency',
        title: 'Most Active Month',
        value: formatMonth(mostConsistentMonth[0]),
        detail: `${mostConsistentMonth[1]} activities logged`,
      });
    }

    // Longest run
    const longestRun = runActivities.sort((a, b) => b.distance - a.distance)[0];
    if (longestRun) {
      highlights.push({
        type: 'record',
        title: 'Longest Run',
        value: `${(longestRun.distance / 1000).toFixed(1)} km`,
        detail: longestRun.name,
      });
    }

    // Most elevation
    const mostClimbing = activities.sort(
      (a, b) => b.total_elevation_gain - a.total_elevation_gain,
    )[0];
    if (mostClimbing && mostClimbing.total_elevation_gain > 0) {
      highlights.push({
        type: 'record',
        title: 'Biggest Climb',
        value: `${Math.round(mostClimbing.total_elevation_gain)} m`,
        detail: mostClimbing.name,
      });
    }

    highlights.push({
      type: 'total',
      title: 'Total Elevation',
      value: `${Math.round(totalElevation).toLocaleString()} m`,
      detail: `That's ${(totalElevation / 8849).toFixed(1)}x Mount Everest!`,
    });

    // Streak stats
    const activityDates = new Set(
      activities.map(
        (a) => new Date(a.start_date_local).toISOString().split('T')[0],
      ),
    );
    const { longestStreak } = calculateStreaks(activityDates);

    if (longestStreak > 1) {
      highlights.push({
        type: 'consistency',
        title: 'Longest Streak',
        value: `${longestStreak} days`,
        detail: 'Consecutive days with activity',
      });
    }

    return { success: true, highlights };
  } catch (error) {
    logger.error('Year in review error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get year in review',
    );
  }
});

export const getPersonalRecords = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }

    const userId = context.auth.uid;

    try {
      const activities = await getAllActivities(userId);
      const runActivities = activities.filter(
        (a) =>
          a.type === 'Run' || a.type === 'TrailRun' || a.type === 'VirtualRun',
      );

      const records: Array<{
        category: string;
        title: string;
        value: string;
        activity_name: string;
        date: string;
        activity_id?: string;
      }> = [];

      // Fastest runs by distance thresholds
      const distanceRecords = [
        { name: 'Fastest 1K', min: 1000, max: 1500 },
        { name: 'Fastest 5K', min: 4800, max: 5500 },
        { name: 'Fastest 10K', min: 9500, max: 11000 },
        { name: 'Fastest Half Marathon', min: 20500, max: 22000 },
        { name: 'Fastest Marathon', min: 41500, max: 43500 },
      ];

      for (const dr of distanceRecords) {
        const eligible = runActivities.filter(
          (a) => a.distance >= dr.min && a.distance <= dr.max,
        );
        if (eligible.length > 0) {
          const fastest = eligible.sort(
            (a, b) => a.moving_time - b.moving_time,
          )[0];
          records.push({
            category: 'speed',
            title: dr.name,
            value: formatDuration(fastest.moving_time),
            activity_name: fastest.name,
            date: fastest.start_date_local.split('T')[0],
          });
        }
      }

      // Longest run
      const longestRun = runActivities.sort(
        (a, b) => b.distance - a.distance,
      )[0];
      if (longestRun) {
        records.push({
          category: 'distance',
          title: 'Longest Run',
          value: `${(longestRun.distance / 1000).toFixed(2)} km`,
          activity_name: longestRun.name,
          date: longestRun.start_date_local.split('T')[0],
        });
      }

      // Most elevation in a single activity
      const mostElevation = activities.sort(
        (a, b) => b.total_elevation_gain - a.total_elevation_gain,
      )[0];
      if (mostElevation && mostElevation.total_elevation_gain > 0) {
        records.push({
          category: 'climbing',
          title: 'Most Elevation Gain',
          value: `${Math.round(mostElevation.total_elevation_gain)} m`,
          activity_name: mostElevation.name,
          date: mostElevation.start_date_local.split('T')[0],
        });
      }

      // Longest duration
      const longestDuration = activities.sort(
        (a, b) => b.moving_time - a.moving_time,
      )[0];
      if (longestDuration) {
        records.push({
          category: 'endurance',
          title: 'Longest Activity',
          value: formatDuration(longestDuration.moving_time),
          activity_name: longestDuration.name,
          date: longestDuration.start_date_local.split('T')[0],
        });
      }

      // Best average pace (for runs over 5K)
      const longRuns = runActivities.filter((a) => a.distance >= 5000);
      if (longRuns.length > 0) {
        const fastestPace = longRuns.sort((a, b) => {
          const paceA = a.moving_time / a.distance;
          const paceB = b.moving_time / b.distance;
          return paceA - paceB;
        })[0];
        const pace = fastestPace.moving_time / (fastestPace.distance / 1000);
        const paceMin = Math.floor(pace / 60);
        const paceSec = Math.round(pace % 60);
        records.push({
          category: 'speed',
          title: 'Best Pace (5K+)',
          value: `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`,
          activity_name: fastestPace.name,
          date: fastestPace.start_date_local.split('T')[0],
        });
      }

      // Highest average heart rate
      const hrActivities = activities.filter(
        (a) => a.average_heartrate && a.average_heartrate > 0,
      );
      if (hrActivities.length > 0) {
        const maxHR = hrActivities.sort(
          (a, b) => (b.average_heartrate || 0) - (a.average_heartrate || 0),
        )[0];
        records.push({
          category: 'effort',
          title: 'Highest Avg Heart Rate',
          value: `${Math.round(maxHR.average_heartrate!)} bpm`,
          activity_name: maxHR.name,
          date: maxHR.start_date_local.split('T')[0],
        });
      }

      return { success: true, records };
    } catch (error) {
      logger.error('Personal records error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to get personal records',
      );
    }
  },
);

export const getRouteHeatmap = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  const userId = context.auth.uid;

  try {
    // Get activities with polylines
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('activities')
      .where('summary_polyline', '!=', null)
      .limit(200)
      .get();

    const routes: Array<{ polyline: string; type: string; date: string }> = [];

    snapshot.docs.forEach((doc) => {
      const docData = doc.data();
      if (docData.summary_polyline) {
        routes.push({
          polyline: docData.summary_polyline,
          type: docData.type || docData.sport_type || 'Unknown',
          date: docData.start_date_local?.split('T')[0] || '',
        });
      }
    });

    // Calculate center point from first activity with start_latlng
    let center: { lat: number; lng: number } | null = null;
    for (const doc of snapshot.docs) {
      const docData = doc.data();
      if (docData.start_latlng && docData.start_latlng.length === 2) {
        center = { lat: docData.start_latlng[0], lng: docData.start_latlng[1] };
        break;
      }
    }

    return {
      success: true,
      count: routes.length,
      center,
      routes,
    };
  } catch (error) {
    logger.error('Route heatmap error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get route heatmap',
    );
  }
});

export const getHeartRateZones = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }

    const userId = context.auth.uid;
    const maxHR = data?.maxHR || 190;

    try {
      const activities = await getAllActivities(userId);
      const hrActivities = activities.filter(
        (a) => a.average_heartrate && a.average_heartrate > 0,
      );

      // Define zones as percentage of max HR
      const zones = [
        {
          name: 'Zone 1 - Recovery',
          min: 0.5,
          max: 0.6,
          minutes: 0,
          color: '#3B82F6',
        },
        {
          name: 'Zone 2 - Aerobic',
          min: 0.6,
          max: 0.7,
          minutes: 0,
          color: '#10B981',
        },
        {
          name: 'Zone 3 - Tempo',
          min: 0.7,
          max: 0.8,
          minutes: 0,
          color: '#F59E0B',
        },
        {
          name: 'Zone 4 - Threshold',
          min: 0.8,
          max: 0.9,
          minutes: 0,
          color: '#EF4444',
        },
        {
          name: 'Zone 5 - VO2 Max',
          min: 0.9,
          max: 1.0,
          minutes: 0,
          color: '#8B5CF6',
        },
      ];

      for (const activity of hrActivities) {
        const avgHR = activity.average_heartrate!;
        const hrPercent = avgHR / maxHR;
        const durationMins = activity.moving_time / 60;

        for (const zone of zones) {
          if (hrPercent >= zone.min && hrPercent < zone.max) {
            zone.minutes += durationMins;
            break;
          }
        }
        if (hrPercent >= 1.0) {
          zones[4].minutes += durationMins;
        }
      }

      zones.forEach((z) => (z.minutes = Math.round(z.minutes)));

      const totalMinutes = zones.reduce((sum, z) => sum + z.minutes, 0);
      const distribution = zones.map((z) => ({
        ...z,
        percentage:
          totalMinutes > 0 ? Math.round((z.minutes / totalMinutes) * 100) : 0,
      }));

      return {
        success: true,
        maxHR,
        totalMinutes,
        activitiesWithHR: hrActivities.length,
        zones: distribution,
      };
    } catch (error) {
      logger.error('Heart rate zones error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to get heart rate zones',
      );
    }
  },
);

// Helper functions

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateStreaks(activityDates: Set<string>): {
  currentStreak: number;
  longestStreak: number;
} {
  if (activityDates.size === 0) return { currentStreak: 0, longestStreak: 0 };

  const sortedDates = Array.from(activityDates).sort();
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(today);

  while (activityDates.has(checkDate.toISOString().split('T')[0])) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]);
    const curr = new Date(sortedDates[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}

function formatWeek(weekStart: string): string {
  const date = new Date(weekStart);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
