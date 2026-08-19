# Technical Architecture Document — bulblu

**Version:** 1.0 (MVP)
**Last Updated:** 2026-08-18
**Platform:** Mobile-first (iOS + Android)

---

## 1. Tech Stack

| Layer | Technology | Version | Reason |
|-------|-----------|---------|--------|
| **Mobile Framework** | React Native (Expo) | SDK 52+ | Cross-platform iOS/Android from one codebase. Expo handles builds, OTA updates, push notifications. Free tier covers MVP. |
| **Language** | TypeScript | 5.x | Type safety across the entire codebase. Prevents runtime errors in a complex social app. |
| **State Management** | Zustand | 5.x | Lightweight, no boilerplate. Better than Redux for a social app where most state is server-derived. |
| **Navigation** | Expo Router | 4.x | File-based routing. Deep linking out of the box. Works with Expo's ecosystem. |
| **Backend** | Supabase | Latest | Free tier: Postgres DB, Auth, Storage, Realtime subscriptions, Edge Functions. Covers all backend needs at zero cost. |
| **Database** | PostgreSQL (via Supabase) | 15+ | Relational data with row-level security. Supabase wraps it with a REST API automatically. |
| **Authentication** | Supabase Auth | — | Email/password + Google OAuth. JWT tokens for API access. Session management handled. |
| **File Storage** | Supabase Storage | — | Profile photos, post images/videos, story media. Built-in CDN. Free tier: 1GB storage + 2GB bandwidth/month. |
| **Realtime** | Supabase Realtime | — | WebSocket subscriptions for DMs, presence, typing indicators, voice room state. |
| **Payments** | Stripe | — | Companion bookings. Stripe handles PCI compliance. Connect for companion payouts. |
| **Voice/Video** | LiveKit | — | Free tier: 100 participants per room, unlimited rooms. WebRTC-based. SDKs for React Native. |
| **Push Notifications** | Expo Push Notifications | — | Free. Handles iOS APNs and Android FCM token management. |
| **Image/Video Handling** | expo-image-picker + expo-video | — | Camera, gallery, video playback. |
| **Animations** | Reanimated 3 + Moti | — | 60fps native animations for the Maxmorphism design language. Smooth gesture-driven interactions. |
| **Icons** | Lucide Icons | — | Clean, consistent icon set. Tree-shakeable. |
| **HTTP Client** | Supabase JS SDK | 2.x | Handles auth headers, retries, and real-time subscriptions automatically. |

### Why NOT other options

| Alternative | Why Not |
|------------|---------|
| Flutter | Expo has better JS ecosystem integration and faster iteration for a solo developer. |
| Firebase | Supabase gives you a real Postgres database with RLS instead of NoSQL with security rules. More predictable for social features. |
| Socket.io (self-hosted) | Supabase Realtime handles WebSocket management for free. No server to maintain. |
| AWS Amplify | Overly complex for an MVP. Supabase covers the same features with less config. |
| MongoDB | Relational data (users→matches→messages→bookings) fits Postgres better. |

---

## 2. File & Folder Structure

```
bulblu/
├── app/                          # Expo Router file-based routes
│   ├── (auth)/                   # Auth flow screens (no tab bar)
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── verify-email.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── explore.tsx           # Tap to Explore (home)
│   │   ├── discover.tsx          # Swipe/browse profiles
│   │   ├── community.tsx         # Anonymous posts feed
│   │   ├── messages.tsx          # DM list
│   │   └── profile.tsx           # User profile
│   ├── explore/
│   │   └── [userId].tsx          # User profile card (from explore)
│   ├── chat/
│   │   └── [matchId].tsx         # DM conversation screen
│   ├── voice/
│   │   ├── [roomId].tsx          # Voice room screen
│   │   └── create.tsx            # Create voice room
│   ├── companion/
│   │   ├── [companionId].tsx     # Companion profile
│   │   ├── book.tsx              # Booking flow
│   │   └── history.tsx           # Booking history
│   ├── story/
│   │   ├── create.tsx            # Create story
│   │   └── [userId].tsx          # View story
│   ├── post/
│   │   ├── create.tsx            # Create anonymous post
│   │   └── [postId].tsx          # Post detail
│   └── _layout.tsx               # Root layout (providers, splash)
├── components/
│   ├── ui/                       # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Badge.tsx
│   │   ├── GlassCard.tsx         # Maxmorphism glass surface
│   │   ├── GradientButton.tsx
│   │   └── Skeleton.tsx
│   ├── explore/                  # Tap to Explore components
│   │   ├── WorldView.tsx         # Main immersive canvas
│   │   ├── PersonBubble.tsx      # Floating person node
│   │   ├── RoomBubble.tsx        # Active voice room node
│   │   └── PostBubble.tsx        # Trending post node
│   ├── discover/                 # Discovery/swipe components
│   │   ├── ProfileCard.tsx
│   │   ├── SwipeStack.tsx
│   │   └── FilterModal.tsx
│   ├── chat/                     # Messaging components
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   └── TypingIndicator.tsx
│   ├── companion/                # Companion booking components
│   │   ├── CompanionCard.tsx
│   │   ├── BookingSheet.tsx
│   │   └── AvailabilityCalendar.tsx
│   └── voice/                    # Voice room components
│       ├── ParticipantGrid.tsx
│       ├── RoomControls.tsx
│       └── RaiseHand.tsx
├── lib/
│   ├── supabase.ts               # Supabase client init
│   ├── stripe.ts                 # Stripe config
│   ├── livekit.ts                # LiveKit config
│   └── expo-notifications.ts     # Push notification setup
├── stores/
│   ├── authStore.ts              # Auth state (user, session)
│   ├── chatStore.ts              # DM state
│   ├── exploreStore.ts           # Explore world state
│   ├── discoverStore.ts          # Discovery/swipe state
│   └── companionStore.ts         # Companion booking state
├── hooks/
│   ├── useAuth.ts
│   ├── usePresence.ts            # Online status tracking
│   ├── useRealtime.ts            # Supabase realtime subscriptions
│   └── useVoiceRoom.ts           # LiveKit room management
├── types/
│   └── database.ts               # Supabase generated types
├── constants/
│   ├── colors.ts                 # Maxmorphism color palette
│   ├── typography.ts             # Font definitions
│   ├── spacing.ts                # Spacing/layout tokens
│   └── config.ts                 # App config constants
├── assets/
│   ├── fonts/                    # Custom fonts (Space Grotesk)
│   ├── images/                   # Static images, splash, icons
│   └── animations/               # Lottie/Rive animations
├── docs/                         # Project documentation
│   ├── 01-PRD.md
│   ├── 02-TECHNICAL-ARCHITECTURE.md
│   ├── 03-SECURITY-AND-ACCESS.md
│   ├── 04-FRONTEND-SPECIFICATION.md
│   └── 05-FEATURE-TICKET-LIST.md
├── app.json                      # Expo config
├── tsconfig.json
└── package.json
```

---

## 3. Database Schema

### 3.1 Core Tables

#### `users`
Extends Supabase Auth's `auth.users` with app-specific data.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | References auth.users.id |
| email | TEXT | User's email |
| full_name | TEXT | Display name |
| username | TEXT (unique) | @username handle |
| bio | TEXT | Short bio (max 500 chars) |
| avatar_url | TEXT | Profile photo URL |
| date_of_birth | DATE | For age display |
| gender | TEXT | male / female / non_binary / prefer_not_to_say |
| city | TEXT | City name |
| latitude | DOUBLE PRECISION | For proximity matching |
| longitude | DOUBLE PRECISION | For proximity matching |
| interests | TEXT[] | Array of interest tags |
| looking_for | TEXT[] | dating / friends / activity / companion |
| is_companion | BOOLEAN | Default false. true = approved companion |
| is_verified | BOOLEAN | Photo-verified profile |
| is_online | BOOLEAN | Current online status |
| last_active | TIMESTAMPTZ | Last activity timestamp |
| settings | JSONB | Notification preferences, privacy settings |
| created_at | TIMESTAMPTZ | Account creation |
| updated_at | TIMESTAMPTZ | Last profile update |

#### `matches`
Tracks when two users mutually like each other.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| user_a_id | UUID (FK→users) | The user with the lower UUID |
| user_b_id | UUID (FK→users) | The user with the higher UUID |
| matched_at | TIMESTAMPTZ | When the mutual like occurred |
| is_active | BOOLEAN | false = unmatched/blocked |

*Constraint: unique(user_a_id, user_b_id)*

#### `messages`
Direct messages between matched users.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| match_id | UUID (FK→matches) | The conversation |
| sender_id | UUID (FK→users) | Who sent this |
| content | TEXT | Message text |
| media_url | TEXT | Optional image/video URL |
| message_type | TEXT | text / image / video |
| is_read | BOOLEAN | Read receipt |
| created_at | TIMESTAMPTZ | |

#### `likes`
Tracks individual likes (one-directional until mutual).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
|-liker_id | UUID (FK→users) | Who liked |
| liked_id | UUID (FK→users) | Who was liked |
| is_super | BOOLEAN | Super like (1/day free) |
| created_at | TIMESTAMPTZ | |

*Constraint: unique(liker_id, liked_id)*

#### `stories`
24-hour ephemeral stories.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | Story creator |
| media_url | TEXT | Photo or video URL |
| media_type | TEXT | image / video |
| text_overlay | TEXT | Optional text |
| expires_at | TIMESTAMPTZ | Auto-delete after 24 hours |
| created_at | TIMESTAMPTZ | |

#### `story_views`
Who viewed whose story.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| story_id | UUID (FK→stories) | |
| viewer_id | UUID (FK→users) | |
| viewed_at | TIMESTAMPTZ | |

*Constraint: unique(story_id, viewer_id)*

#### `posts`
Anonymous (or attributed) community posts.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | Creator (stored for moderation, hidden from UI) |
| is_anonymous | BOOLEAN | Show as anonymous |
| content | TEXT | Post text |
| media_url | TEXT | Optional image/video |
| media_type | TEXT | image / video / none |
| reaction_count | INTEGER | Cached count |
| comment_count | INTEGER | Cached count |
| is_reported | BOOLEAN | Flagged for review |
| created_at | TIMESTAMPTZ | |

#### `reactions`
Emoji reactions on posts.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| post_id | UUID (FK→posts) | |
| user_id | UUID (FK→users) | |
| emoji | TEXT | Heart, fire, laugh, etc. |
| created_at | TIMESTAMPTZ | |

*Constraint: unique(post_id, user_id, emoji)*

#### `comments`
Comments on posts.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| post_id | UUID (FK→posts) | |
| user_id | UUID (FK→users) | |
| is_anonymous | BOOLEAN | |
| content | TEXT | |
| created_at | TIMESTAMPTZ | |

#### `voice_rooms`
Active voice rooms.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| host_id | UUID (FK→users) | Room creator |
| topic | TEXT | Room topic |
| is_public | BOOLEAN | |
| max_participants | INTEGER | Default 50 |
| livekit_room_id | TEXT | LiveKit room identifier |
| status | TEXT | active / ended |
| created_at | TIMESTAMPTZ | |

#### `voice_room_participants`
Who is currently in a voice room.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| room_id | UUID (FK→voice_rooms) | |
| user_id | UUID (FK→users) | |
| joined_at | TIMESTAMPTZ | |
| left_at | TIMESTAMPTZ | null = still in room |
| role | TEXT | host / speaker / listener |

#### `companion_profiles`
Extended info for users approved as companions.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | References users.id |
| hourly_rate | INTEGER | Cents (e.g., 2500 = $25/hr) |
| activities | TEXT[] | movies / shopping / gaming / travel / events / conversation |
| availability | JSONB | Weekly schedule |
| bio | TEXT | Companion-specific bio |
| is_available | BOOLEAN | Currently accepting bookings |
| rating | DECIMAL | Average rating (1-5) |
| total_bookings | INTEGER | Cached count |
| stripe_account_id | TEXT | Stripe Connect account for payouts |
| created_at | TIMESTAMPTZ | |

#### `bookings`
Companion booking records.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| booker_id | UUID (FK→users) | Who booked |
| companion_id | UUID (FK→companion_profiles) | Who was booked |
| activity | TEXT | Selected activity |
| date | DATE | Booking date |
| start_time | TIME | Start time |
| duration_hours | INTEGER | 1, 2, 4, or 8 |
| total_cents | INTEGER | Total price in cents |
| stripe_payment_id | TEXT | Stripe payment intent |
| status | TEXT | pending / confirmed / completed / cancelled / disputed |
| created_at | TIMESTAMPTZ | |

#### `reports`
User reports for moderation.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| reporter_id | UUID (FK→users) | |
| reported_user_id | UUID (FK→users) | |
| reason | TEXT | spam / harassment / fake / inappropriate / other |
| description | TEXT | |
| status | TEXT | pending / reviewed / resolved |
| created_at | TIMESTAMPTZ | |

#### `blocks`
Blocked user relationships.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| blocker_id | UUID (FK→users) | |
| blocked_id | UUID (FK→users) | |
| created_at | TIMESTAMPTZ | |

*Constraint: unique(blocker_id, blocked_id)*

#### `notifications`
In-app notification feed.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | Recipient |
| type | TEXT | match / message / booking / story / system |
| title | TEXT | |
| body | TEXT | |
| data | JSONB | Deep link payload |
| is_read | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### 3.2 Indexes

```sql
-- Performance-critical indexes
CREATE INDEX idx_users_location ON users USING GIST (
  ll_to_earth(latitude, longitude)
);

CREATE INDEX idx_users_interests ON users USING GIN (interests);

CREATE INDEX idx_matches_user_a ON matches(user_a_id) WHERE is_active = true;
CREATE INDEX idx_matches_user_b ON matches(user_b_id) WHERE is_active = true;

CREATE INDEX idx_messages_match ON messages(match_id, created_at DESC);

CREATE INDEX idx_stories_expires ON stories(expires_at) WHERE expires_at > now();

CREATE INDEX idx_posts_created ON posts(created_at DESC);

CREATE INDEX idx_voice_rooms_status ON voice_rooms(status) WHERE status = 'active';

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX idx_bookings_companion ON bookings(companion_id, date, status);
```

---

## 4. Environment Variables

### Required (must set before running)

| Variable | Where to Get | Notes |
|----------|-------------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Public anon key |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys | pk_live_... or pk_test_... |
| `EXPO_PUBLIC_LIVEKIT_URL` | LiveKit Dashboard | wss://... |
| `EXPO_PUBLIC_LIVEKIT_API_KEY` | LiveKit Dashboard | |
| `EXPO_PUBLIC_LIVEKIT_API_SECRET` | LiveKit Dashboard | **NEVER commit this** |

### Server-side (Supabase Edge Functions — never in client code)

| Variable | Where to Get | Notes |
|----------|-------------|-------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard | sk_live_... or sk_test_... |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks | For payment event verification |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe Dashboard → Connect | For companion payouts |

### Build/Deploy

| Variable | Where to Get | Notes |
|----------|-------------|-------|
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google AI Studio | For image generation features |
| `SENTRY_DSN` | Sentry.io (optional) | Error tracking |

### Config Notes

- All `EXPO_PUBLIC_*` variables are bundled into the client app. They are **not secret**. Anyone can extract them from the built app. Security comes from RLS policies, not hiding these keys.
- `LIVEKIT_API_SECRET` must only be used in Edge Functions. Never put it in client code.
- Use `.env` for local development. Use Expo's EAS environment variables for production builds.
- `.env` is in `.gitignore`. Never commit it.
- Stripe keys: always start with `pk_test_` / `sk_test_` during development. Switch to `pk_live_` / `sk_live_` only at launch.

---

## 5. API Design

### 5.1 Supabase Auto-Generated REST API

Supabase auto-generates a PostgREST API from your database schema. Every table gets CRUD endpoints at `https://<project>.supabase.co/rest/v1/<table>`. Row-Level Security policies control access.

Examples:
```
GET    /rest/v1/users?id=eq.123          → Get user by ID
POST   /rest/v1/messages                 → Send message
GET    /rest/v1/matches?user_a_id=eq.123 → Get user's matches
PATCH  /rest/v1/users                    → Update profile
DELETE /rest/v1/stories?id=eq.456        → Delete story
```

### 5.2 Supabase Edge Functions (Custom Logic)

| Function | Trigger | What It Does |
|----------|---------|-------------|
| `create-booking` | POST | Creates a Stripe checkout session for companion booking |
| `stripe-webhook` | POST | Handles Stripe payment events (payment_intent.succeeded, etc.) |
| `create-livekit-token` | POST | Generates a LiveKit access token for voice rooms |
| `cleanup-expired-stories` | Cron (hourly) | Deletes stories older than 24 hours |
| `send-push-notification` | Called from client | Sends Expo push notification to specific user |
| `companion-payout` | Cron (daily) | Processes Stripe Connect payouts for completed bookings |

### 5.3 Supabase Realtime Subscriptions

| Channel | What It Streams |
|---------|----------------|
| `messages:{match_id}` | New messages in a conversation |
| `presence:{room_id}` | Voice room participant join/leave |
| `typing:{match_id}` | Typing indicators |
| `online:{user_id}` | Online status changes |
| `notifications:{user_id}` | New notifications |

---

## 6. Third-Party Service Integration Map

```
┌─────────────────────────────────────────────────────┐
│                    bulblu App                        │
│                                                     │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Supabase│  │  Stripe  │  │ LiveKit  │          │
│  │ Auth    │  │ Payments │  │ Voice/   │          │
│  │ DB      │  │ Connect  │  │ Video    │          │
│  │ Storage │  │          │  │          │          │
│  │ Realtime│  │          │  │          │          │
│  │ Edge    │  │          │  │          │          │
│  │ Funcs   │  │          │  │          │          │
│  └─────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ┌──────────────────────┐  ┌─────────────────┐    │
│  │ Expo Push Notifs     │  │ Gemini API      │    │
│  │ (FCM + APNs)        │  │ (Image Gen)     │    │
│  └──────────────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Data Flow: Companion Booking

```
User taps "Book" → Client sends POST to /functions/v1/create-booking
→ Edge Function creates Stripe Checkout Session
→ Redirects user to Stripe Checkout (in-app browser)
→ User pays → Stripe fires webhook to /functions/v1/stripe-webhook
→ Webhook updates bookings table (status: confirmed)
→ Supabase Realtime notifies companion's device
→ Both parties see booking in their DMs
→ Push notification sent to companion
```

### Data Flow: Voice Room

```
User taps "Create Room" → Client sends POST to /functions/v1/create-livekit-token
→ Edge Function generates LiveKit token with room permissions
→ Client connects to LiveKit server via WebSocket
→ User joins room, publishes audio track
→ Supabase voice_room_participants table updated
→ Other users see room in their "Explore" view via Realtime subscription
```
