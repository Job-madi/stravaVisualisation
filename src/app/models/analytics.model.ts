export interface WeekStats {
  week: string;
  count: number;
  distance: number;
  moving_time: number;
  elevation: number;
}

export interface WeeklyStatsResponse {
  success: boolean;
  weeks: WeekStats[];
}

export interface HabitPatternsResponse {
  success: boolean;
  dayDistribution: { day: string; count: number; percentage: number }[];
  timeOfDay: { morning: number; afternoon: number; evening: number; night: number };
  currentStreak: number;
  longestStreak: number;
  mostSkippedDay: string;
  mostActiveDay: string;
  totalActivities: number;
}

export interface LoadMetric {
  week: string;
  weeklyLoad: number;
  activityCount: number;
  monotony: number;
  strain: number;
}

export interface LoadMetricsResponse {
  success: boolean;
  loadMetrics: LoadMetric[];
}

export interface Highlight {
  type: string;
  title: string;
  value: string;
  detail: string;
}

export interface YearInReviewResponse {
  success: boolean;
  highlights: Highlight[];
}

export interface PersonalRecord {
  category: string;
  title: string;
  value: string;
  activity_name: string;
  date: string;
}

export interface PersonalRecordsResponse {
  success: boolean;
  records: PersonalRecord[];
}

export interface Route {
  polyline: string;
  type: string;
  date: string;
}

export interface RouteHeatmapResponse {
  success: boolean;
  count: number;
  center: { lat: number; lng: number } | null;
  routes: Route[];
}

export interface HeartRateZone {
  name: string;
  min: number;
  max: number;
  minutes: number;
  color: string;
  percentage: number;
}

export interface HeartRateZonesResponse {
  success: boolean;
  maxHR: number;
  totalMinutes: number;
  activitiesWithHR: number;
  zones: HeartRateZone[];
}

