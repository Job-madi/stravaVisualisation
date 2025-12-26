export interface UserProfile {
  athlete_id: number;
  firstname: string;
  lastname: string;
  profile_image: string;
  city: string;
  country: string;
}

export interface ProfileResponse {
  success: boolean;
  profile: UserProfile;
  last_sync: { _seconds: number } | null;
  activity_count: number;
}

