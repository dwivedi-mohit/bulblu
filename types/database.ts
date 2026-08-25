export interface User {
  id: string;
  email: string;
  full_name: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  date_of_birth: string;
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  interests: string[];
  looking_for: ('dating' | 'friends' | 'activity' | 'companion')[];
  is_companion: boolean;
  is_verified: boolean;
  is_online: boolean;
  last_active: string;
  settings: UserSettings;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  notifications: {
    matches: boolean;
    messages: boolean;
    bookings: boolean;
    stories: boolean;
    events: boolean;
  };
  privacy: {
    show_online: boolean;
    show_read_receipts: boolean;
    profile_visibility: 'everyone' | 'matches' | 'friends';
  };
}

export interface Match {
  id: string;
  user_a_id: string;
  user_b_id: string;
  matched_at: string;
  is_active: boolean;
  user_a?: User;
  user_b?: User;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  message_type: 'text' | 'image' | 'video';
  is_read: boolean;
  created_at: string;
}

export interface Like {
  id: string;
  liker_id: string;
  liked_id: string;
  is_super: boolean;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  text_overlay: string | null;
  expires_at: string;
  created_at: string;
  user?: User;
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  viewed_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  is_anonymous: boolean;
  content: string;
  media_url: string | null;
  media_type: 'image' | 'video' | 'none';
  reaction_count: number;
  comment_count: number;
  is_reported: boolean;
  created_at: string;
  user?: User;
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  is_anonymous: boolean;
  content: string;
  created_at: string;
  user?: User;
}

export interface VoiceRoom {
  id: string;
  host_id: string;
  topic: string;
  is_public: boolean;
  max_participants: number;
  livekit_room_id: string;
  status: 'active' | 'ended';
  created_at: string;
  host?: User;
  participants?: VoiceRoomParticipant[];
  participant_count?: number;
}

export interface VoiceRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  role: 'host' | 'speaker' | 'listener';
  user?: User;
}

export interface CompanionProfile {
  id: string;
  user_id: string;
  hourly_rate: number;
  activities: string[];
  availability: Record<string, { start: string; end: string }[]>;
  bio: string;
  is_available: boolean;
  rating: number;
  total_bookings: number;
  stripe_account_id: string | null;
  created_at: string;
  user?: User;
}

export interface Booking {
  id: string;
  booker_id: string;
  companion_id: string;
  activity: string;
  date: string;
  start_time: string;
  duration_hours: number;
  total_cents: number;
  stripe_payment_id: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'disputed';
  created_at: string;
  companion?: CompanionProfile;
  booker?: User;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: 'spam' | 'harassment' | 'fake' | 'inappropriate' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'match' | 'message' | 'booking' | 'story' | 'system';
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface CompanionApplication {
  id: string;
  user_id: string;
  full_legal_name: string;
  display_name: string;
  phone_number: string;
  whatsapp_number: string;
  email: string;
  govt_id_type: string;
  govt_id_number: string;
  pfp_url: string | null;
  gallery_images: string[];
  live_selfie_url: string | null;
  voice_intro_url: string | null;
  bank_upi_id: string;
  hourly_rate: number;
  speed_call_rate: number;
  services_offered: string[];
  city: string;
  area: string;
  bio: string;
  signed_code_of_conduct: boolean;
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  user?: User;
}
