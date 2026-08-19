# Product Requirements Document — bulblu

**Version:** 1.0 (MVP)
**Last Updated:** 2026-08-18
**Status:** Ready for review

---

## 1. Problem Statement

People today are lonely — even surrounded by apps. Dating apps feel transactional. Friendship apps feel awkward. Entertainment is consumed alone. Social media is performative, not connective.

The problem: **there is no single place where you can discover people, build real connections (romantic or platonic), share your life, and enjoy entertainment together — all in one flowing experience.**

Existing apps force users to juggle 5-7 different platforms: Tinder for dating, Bumble for friends, Instagram for stories, Discord for voice rooms, YouTube for content, Eventbrite for events, and Venmo to coordinate hangouts. Each app holds a fragment of someone's social life. None of them connect the pieces.

**bulblu solves this by unifying every form of social interaction into one immersive, animated social world — where discovery is playful, connection is effortless, and entertainment is shared.**

---

## 2. Target Users

### Primary Personas

**Persona 1: Aisha (24, urban, socially active)**
- Age: 22-30
- Tech comfort: High — grew up with social apps
- Wants: A platform where she can find both dating prospects AND new friends in her city. Tired of dating apps that only show romantic intent. Wants to post anonymously about real feelings, join voice rooms for casual hangouts, and discover events happening nearby.
- Frustrations: Dating apps feel shallow. Instagram is curated perfection. She has no "third place" online.

**Persona 2: Marcus (31, new to a city)**
- Age: 25-35
- Tech comfort: Medium — uses apps daily but not power-user
- Wants: To meet people after relocating. Looking for friends, activities, and maybe dating. Would rent a companion for a movie or event if he has no one to go with. Wants voice rooms to meet people without the pressure of dating.
- Frustrations: Starting over socially is exhausting. Existing apps require a huge existing network to be useful.

**Persona 3: Priya (19, creative, expressive)**
- Age: 18-24
- Tech comfort: Very high — mobile native
- Wants: To express herself through posts and stories, discover new people with shared interests, join multiplayer games, watch content with others, and explore the app's animated world for fun.
- Frustrations: Current apps feel sterile. She wants playfulness and self-expression, not just profiles and swipes.

### Secondary Users

**Companion Providers:** People (18+) who offer their time as paid companions for activities — movies, shopping, gaming, travel, events, conversation. They set their own rates, availability, and activity types. Verified through a separate onboarding flow.

**Content Creators:** Users who produce video content for bulblu's TV/video section. Can be anyone — not a separate role, just a feature available to all users.

---

## 3. Product Vision

> **bulblu is the social universe where every connection — romantic, platonic, or experiential — lives in one place. Tap to Explore and discover your world.**

North star metric: **Daily Active Connections** — the number of meaningful interactions (messages sent, voice room joins, companion bookings, matches, game sessions) per day across all users.

---

## 4. Core Features

### MVP (Must-Have for Launch)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| 1 | **Onboarding & Profile** | Email/Google signup, profile creation with photos, bio, interests, and location. Profile verification (photo check). | Must-have |
| 2 | **Tap to Explore** | The home screen — an immersive, animated world view where users discover people, posts, events, and rooms by exploring a visual map-like interface. Not a list. Not a grid. A living, breathing social world. | Must-have |
| 3 | **Discovery & Matching** | Swipe/browse profiles with compatibility signals. Filter by distance, age, interests, intent (dating/friends/activity). Mutual match unlocks messaging. | Must-have |
| 4 | **DMs (Direct Messages)** | Real-time text messaging. Read receipts, online status, typing indicators. Image/video sharing in chat. | Must-have |
| 5 | **Stories** | 24-hour ephemeral posts (photos/videos). View stories from matches, friends, and people you follow. Reaction-based responses. | Must-have |
| 6 | **Anonymous Posts** | Post text, images, or short videos anonymously to the community feed. Other users can react and comment (also anonymously or with their profile). | Must-have |
| 7 | **Online Presence** | Real-time indicator showing who's online, in a voice room, watching TV, or playing a game. Tap to join their activity. | Must-have |
| 8 | **Voice Rooms** | Drop-in audio rooms where users can join, talk, listen, and leave freely. Up to 50 participants per room. Topic-based rooms (e.g., "Chill Vibes", "Dating Talk", "Gaming"). | Must-have |
| 9 | **Companion Booking (Rent GF/BF)** | Browse companion profiles, view rates and availability, book for specific activities (movie, shopping, gaming, travel, events, conversation). In-app payment via Stripe. | Must-have |
| 10 | **Push Notifications** | Match notifications, message notifications, companion booking confirmations, event reminders, voice room invitations. | Must-have |
| 11 | **User Settings & Privacy** | Account settings, notification preferences, blocked users, report user, data download, account deletion. | Must-have |
| 12 | **Search & Filters** | Search users by name, interest, or location. Filter discovery results by multiple criteria simultaneously. | Must-have |

### Should-Have (v1.1)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| 13 | **Video Calls** | 1:1 and group video calls (up to 8 participants). In-call effects and screen sharing. | Should-have |
| 14 | **Live Rooms** | Scheduled live streaming rooms where a host broadcasts to an audience. Chat overlay, reactions, and "go live" scheduling. | Should-have |
| 15 | **Multiplayer Games** | Simple in-app games (trivia, drawing, cards) that users can play together in real-time during calls or in dedicated game rooms. | Should-have |
| 16 | **Events** | Create and discover local events. RSVP, invite matches/friends, see who's going. | Should-have |
| 17 | **TV/Video Section** | Curated and user-generated video content. Watch together in sync rooms. Shorts-style vertical video feed. | Should-have |
| 18 | **Interest Groups** | Topic-based communities (e.g., "Anime Fans", "Foodies", "Gamers"). Post, chat, and find people with shared passions. | Should-have |

### Nice-to-Have (v2.0+)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| 19 | **AI Matchmaking** | ML-powered compatibility scoring based on behavior, interests, and interaction patterns. | Nice-to-have |
| 20 | **Gifts & Virtual Currency** | Send virtual gifts to companions, matches, or in voice rooms. In-app currency (bulblu coins). | Nice-to-have |
| 21 | **Companion Tiers** | Verified companions with badges, reviews, and tiered pricing (Standard, Premium, VIP). | Nice-to-have |
| 22 | **AR Filters** | Augmented reality filters for video calls, stories, and profile photos. | Nice-to-have |
| 23 | **Location-Based Meetups** | GPS-powered "nearby now" feature showing who's around and available for spontaneous meetups. | Nice-to-have |
| 24 | **Translation** | Real-time message translation for cross-language conversations. | Nice-to-have |

---

## 5. What We Are NOT Building in v1

- AR/VR features
- In-app virtual currency or gifts
- AI matchmaking (rule-based matching only)
- Content moderation AI (manual moderation only)
- Web admin panel (managed via Supabase dashboard + direct DB access)
- Multi-language support (English only for v1)
- Two-factor authentication (email/password + Google OAuth only)
- Live streaming (voice rooms only — no video broadcast)
- In-app games (voice rooms + DMs only)
- Companion ratings/reviews (added in v1.1)

---

## 6. App Flow

### 6.1 First-Time User Flow

```
App Opens
  → Splash Screen (bulblu logo, animated gradient)
  → Onboarding Carousel (3 screens: "Discover People", "Build Connections", "Share Your World")
  → Sign Up Screen
    → Options: Email+Password, Google OAuth
    → If Email: verification email sent, must verify before proceeding
  → Profile Setup (3 steps)
    → Step 1: Name, Birthday, Gender
    → Step 2: Upload 1-6 photos (first photo = main)
    → Step 3: Select interests from tags (minimum 3)
  → Location Permission Request
    → "Enable location to discover people near you"
    → Can skip — falls back to manual city selection
  → Home Screen: Tap to Explore (the immersive world view)
```

### 6.2 Returning User Flow

```
App Opens
  → If logged in: Home Screen (Tap to Explore)
  → If not logged in: Login Screen (Email+Password or Google)
  → Home Screen shows:
    → Nearby people floating in the world
    → Active voice rooms
    → Trending anonymous posts
    → Stories from connections
    → Online friends/companions
```

### 6.3 Discovery Flow

```
Home Screen (Tap to Explore)
  → Tap on a person bubble → Profile Card (full-screen overlay)
    → See: photos, bio, interests, online status
    → Actions: Like (swipe right), Pass (swipe left), Send Crush
    → If mutual like: Match! → Unlock DM
  → Alternatively: Swipe mode (Tinder-style) accessible via bottom tab
    → Swipe right = like, swipe left = pass
    → Super Like (1/day free, more via subscription)
```

### 6.4 Messaging Flow

```
Match Screen
  → "You matched with [Name]!"
  → Send first message (or auto-generated icebreaker)
  → DM Screen (real-time chat)
    → Text, images, voice messages
    → Online indicator, typing indicator
    → Tap profile pic → View full profile
    → Tap "+" → Start video call (v1.1), share location, send companion request
```

### 6.5 Companion Booking Flow

```
Home Screen → "Companions" tab
  → Browse companion cards (photo, name, rate, rating, available activities)
  → Filter by: activity type, price range, availability, gender
  → Tap companion → Full profile
    → See: bio, photos, rates (hourly), available activities, availability calendar
    → Select activity (e.g., "Movie Night")
    → Select date & time
    → Select duration (1hr, 2hr, 4hr, full day)
    → See total price breakdown
    → Confirm & Pay (Stripe checkout)
  → Booking confirmed
    → Both parties see booking details in DMs
    → Push notification reminder 1hr before
    → After activity: rate and review companion
```

### 6.6 Voice Room Flow

```
Home Screen → See active voice rooms floating in the world
  → Tap a room → Room preview (topic, participants, host)
    → "Join Room" button
    → Room Screen
      → See participant avatars in a circle/grid
      → Mute/Unmute button
      → "Raise Hand" to request speaking
      → Leave room button
      → Room chat (text overlay)
  → Create Room button (bottom right)
    → Set topic, privacy (public/friends-only), max participants
    → Start Room → Invited friends get push notification
```

### 6.7 Anonymous Post Flow

```
Home Screen → "Community" tab (or from Tap to Explore)
  → See anonymous posts in a feed
  → Tap "+" to create post
    → Write text (optional), add image/video (optional)
    → Toggle: "Post as Anonymous" (default: on) or "Post as [Name]"
    → Post → Appears in community feed
  → Others can: React (emoji), Comment (anonymous or profile), Share
```

### 6.8 Stories Flow

```
Home Screen → Stories ring at top (circular avatars with gradient ring)
  → Tap your own story ring → Camera/Gallery picker
    → Add photo/video
    → Add text overlay, stickers, filters
    → Post → Appears for 24 hours
  → Tap someone else's story → Full-screen story viewer
    → Tap right = next story, tap left = previous
    → Swipe up = reply (DM)
    → Auto-advance after 5 seconds
```

---

## 7. Success Metrics

### North Star
- **Daily Active Connections (DAC):** Number of meaningful interactions per day across all users. Target: 2.0+ per DAU.

### Key Metrics (tracked weekly)

| Metric | Definition | MVP Target (Month 3) |
|--------|-----------|----------------------|
| DAU/MAU Ratio | Daily active / Monthly active users | > 25% |
| Match Rate | % of likes that result in mutual matches | > 15% |
| Message Response Rate | % of first messages that get a reply | > 40% |
| Companion Bookings/Week | Total bookings completed | > 100 |
| Voice Room Avg Duration | Average time spent in voice rooms | > 12 min |
| Stories Views/Day | Total story views across all users | > 500 |
| Session Duration | Average time per session | > 8 min |
| Retention (D7) | % of users returning after 7 days | > 30% |
| Retention (D30) | % of users returning after 30 days | > 15% |
| NPS Score | Net Promoter Score | > 40 |
| Report Rate | Reports per 1000 interactions | < 2 |

### Vanity Metrics (tracked but not optimized for)
- Total signups
- Total posts
- App store rating

---

## 8. MVP Scope Summary

**Bulblu MVP ships with:**
- Authentication (Email + Google)
- Profile creation with photos and interests
- Tap to Explore home screen (immersive world view)
- Discovery/matching with swipe and browse
- Real-time DMs with media sharing
- Stories (24-hour ephemeral)
- Anonymous community posts
- Online presence indicators
- Voice rooms (audio-only, drop-in)
- Companion booking with Stripe payment
- Push notifications
- User settings and privacy controls
- Search and filters
- Report and block functionality

**Bulblu v1.1 adds:**
- Video calls (1:1 and group)
- Live rooms (scheduled streams)
- Multiplayer games
- Events
- TV/video section
- Interest groups
- Companion reviews/ratings

**Bulblu v2.0 adds:**
- AI matchmaking
- Virtual currency/gifts
- AR filters
- Location-based meetups
- Translation
- Web admin panel
