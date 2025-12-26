export interface Activity {
  id: string;
  strava_id: number;
  name: string;
  type: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  timezone: string;
  start_latlng: [number, number] | null;
  average_speed: number;
  max_speed: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
  suffer_score: number | null;
  summary_polyline: string | null;
}

export interface ActivitiesResponse {
  success: boolean;
  count: number;
  activities: Activity[];
}

export interface SyncResponse {
  success: boolean;
  synced: number;
}

