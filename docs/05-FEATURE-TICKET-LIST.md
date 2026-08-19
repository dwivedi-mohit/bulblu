# Feature Ticket List — bulblu

**Version:** 1.0 (MVP)
**Last Updated:** 2026-08-18
**Total Tickets:** 28

---

## Legend

- **P0** = Must ship. Blocking for MVP launch.
- **P1** = Important. Should ship before public beta.
- **P2** = Nice to have. Can ship after initial launch.

---

## Phase 1: Foundation (P0)

### Ticket 1: Initialize Expo Project
**Priority:** P0
**Dependencies:** None

**Description:**
Create a new Expo project in `L:\bulblu` with TypeScript template. Install all core dependencies.

**Acceptance Criteria:**
- [ ] `npx create-expo-app@latest . --template tabs` runs successfully
- [ ] App starts with `npx expo start` on iOS simulator and Android emulator
- [ ] TypeScript compiles without errors
- [ ] `package.json` has correct name "bulblu"

---

### Ticket 2: Install All Dependencies
**Priority:** P0
**Dependencies:** Ticket 1

**Description:**
Install every npm package the project needs.

**Dependencies to install:**
```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar
npx expo install expo-secure-store expo-image-picker expo-video
npx expo install expo-notifications expo-device expo-crypto
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install react-native-safe-area-context react-native-screens
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-svg expo-blur
npm install zustand @supabase/supabase-js
npm install stripe @stripe/stripe-react-native
npm install livekit-client
npm install moti
npm install lucide-react-native
npm install date-fns
```

**Acceptance Criteria:**
- [ ] All packages install without errors
- [ ] `npx expo start` still works after installation
- [ ] No peer dependency warnings that break the app

---

### Ticket 3: Set Up Project Structure
**Priority:** P0
**Dependencies:** Ticket 2

**Description:**
Create the folder structure and foundational files.

**Files to create:**
- `constants/colors.ts` — Full color palette
- `constants/typography.ts` — Font definitions
- `constants/spacing.ts` — Spacing tokens
- `constants/config.ts` — App-wide constants (e.g., MAX_PHOTOS = 6, MAX_BIO_LENGTH = 500)
- `types/database.ts` — TypeScript interfaces for all DB tables
- `lib/supabase.ts` — Supabase client initialization

**Acceptance Criteria:**
- [ ] All constant files export typed values
- [ ] TypeScript interfaces match database schema from `02-TECHNICAL-ARCHITECTURE.md`
- [ ] Supabase client initializes without errors
- [ ] Folder structure matches `02-TECHNICAL-ARCHITECTURE.md` Section 2

---

### Ticket 4: Set Up App Layout & Navigation
**Priority:** P0
**Dependencies:** Ticket 3

**Description:**
Configure Expo Router with the root layout, auth layout, and tab layout.

**Files to create/modify:**
- `app/_layout.tsx` — Root layout (providers, splash screen, font loading)
- `app/(auth)/_layout.tsx` — Auth stack (no tab bar)
- `app/(auth)/login.tsx` — Login screen (skeleton)
- `app/(auth)/signup.tsx` — Signup screen (skeleton)
- `app/(auth)/verify-email.tsx` — Email verification gate
- `app/(tabs)/_layout.tsx` — Tab bar layout (5 tabs: Explore, Discover, Community, Messages, Profile)
- `app/(tabs)/explore.tsx` — Explore tab (skeleton)
- `app/(tabs)/discover.tsx` — Discover tab (skeleton)
- `app/(tabs)/community.tsx` — Community tab (skeleton)
- `app/(tabs)/messages.tsx` — Messages tab (skeleton)
- `app/(tabs)/profile.tsx` — Profile tab (skeleton)

**Acceptance Criteria:**
- [ ] Tab bar shows 5 tabs with correct icons (Lucide)
- [ ] Tapping each tab navigates to the correct screen
- [ ] Auth flow is separate from main app (conditional layout based on auth state)
- [ ] Deep linking works for all routes

---

## Phase 2: Auth & Profile (P0)

### Ticket 5: Build Auth Store (Zustand)
**Priority:** P0
**Dependencies:** Ticket 4

**Description:**
Create the auth state management store.

**File:** `stores/authStore.ts`

**State shape:**
```typescript
{
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

**Acceptance Criteria:**
- [ ] `initialize()` checks for existing session on app start
- [ ] `signIn()` calls Supabase and stores session
- [ ] `signUp()` creates account and sends verification email
- [ ] `signOut()` clears session and navigates to auth
- [ ] Session persists across app restarts (SecureStore)
- [ ] Auth state drives navigation (authenticated → tabs, not → auth)

---

### Ticket 6: Build Login Screen
**Priority:** P0
**Dependencies:** Ticket 5

**Description:**
Fully functional login screen with email/password and Google sign-in.

**UI Elements:**
- App logo/title at top
- Email input
- Password input (with show/hide toggle)
- "Log In" GradientButton
- "Forgot Password?" link
- Divider with "or"
- "Continue with Google" button (outlined, with Google icon)
- "Don't have an account? Sign Up" link at bottom

**Acceptance Criteria:**
- [ ] Email validation (valid format)
- [ ] Password validation (non-empty)
- [ ] Loading state on submit button during API call
- [ ] Error messages display below inputs (red text)
- [ ] "Forgot Password" opens Supabase password reset
- [ ] Google OAuth opens browser and returns to app
- [ ] Successful login navigates to `(tabs)/explore`
- [ ] Keyboard avoids inputs (keyboard padding)

---

### Ticket 7: Build Signup Screen
**Priority:** P0
**Dependencies:** Ticket 5

**Description:**
Multi-step signup flow.

**Step 1 — Account:**
- Full name input
- Email input
- Password input
- "Next" button

**Step 2 — Profile:**
- Birthday picker (date picker, must be 18+)
- Gender selector (male, female, non-binary, prefer not to say)
- "Next" button

**Step 3 — Interests:**
- Grid of interest tags (at least 30 options: Gaming, Music, Travel, Food, Fitness, etc.)
- Tap to select (minimum 3 required)
- "Finish" button

**Acceptance Criteria:**
- [ ] Steps are sequential (can't skip ahead)
- [ ] Can go back to previous steps
- [ ] Form validation at each step before proceeding
- [ ] Age validation: must be 18+ (calculated from birthday)
- [ ] Minimum 3 interests required
- [ ] Loading state during account creation
- [ ] On success: navigates to verify-email screen
- [ ] Progress indicator shows current step

---

### Ticket 8: Build Email Verification Screen
**Priority:** P0
**Dependencies:** Ticket 7

**Description:**
Gate screen shown after signup until email is verified.

**UI:**
- Illustration (email icon)
- "Check your email" heading
- "We sent a verification link to [email]" subtext
- "Open Email App" button (deep links to mail app)
- "Resend Email" link (with cooldown timer: 60s)
- "Change Email" link
- "I verified — Continue" button (checks verification status)

**Acceptance Criteria:**
- [ ] Polls Supabase auth every 3 seconds to check verification
- [ ] On verified: auto-navigates to main app
- [ ] Resend email works with cooldown
- [ ] Change email opens a modal to enter new email
- [ ] Shows error if verification link expired

---

### Ticket 9: Build Profile Setup Flow (Post-Signup)
**Priority:** P0
**Dependencies:** Ticket 8

**Description:**
Profile completion flow shown to new users who haven't set up photos/bio.

**Step 1 — Photos:**
- Grid of 6 photo slots (first = main photo)
- Tap slot → image picker (camera or gallery)
- Drag to reorder (first = profile photo)
- Minimum 1 photo required to proceed

**Step 2 — Bio:**
- Text area (max 500 chars)
- Character counter
- Placeholder: "Tell people about yourself..."

**Step 3 — Location:**
- "Enable Location" button (requests permission)
- Fallback: manual city input with search
- "Skip for now" option

**Acceptance Criteria:**
- [ ] Photo upload shows progress indicator
- [ ] Photos are compressed before upload (max 10MB)
- [ ] Bio respects 500 char limit
- [ ] Location permission request has explanation text
- [ ] On completion: navigates to main app (explore tab)
- [ ] Profile completion status saved (so flow doesn't repeat)

---

## Phase 3: UI Primitives (P0)

### Ticket 10: Build UI Component Library
**Priority:** P0
**Dependencies:** Ticket 3

**Description:**
Build all reusable UI components matching the Maxmorphism spec.

**Components to build (in `components/ui/`):**
- `Button.tsx` — variants: primary, secondary, ghost, danger; sizes: sm, md, lg
- `GradientButton.tsx` — animated gradient background, loading state
- `Card.tsx` — basic card wrapper
- `GlassCard.tsx` — translucent glass surface with backdrop blur
- `Avatar.tsx` — circular image with online dot, story ring, verified badge
- `Input.tsx` — text input with label, error state, icon support
- `Badge.tsx` — notification count badge
- `Modal.tsx` — bottom sheet modal
- `Skeleton.tsx` — loading skeleton with shimmer animation
- `EmptyState.tsx` — illustration + text for empty screens
- `ErrorState.tsx` — error display with retry button

**Acceptance Criteria:**
- [ ] All components match colors/typography/spacing from `04-FRONTEND-SPECIFICATION.md`
- [ ] All components accept standard props (style, onPress, children, etc.)
- [ ] Components work in both light and dark contexts (dark-only for v1)
- [ ] Animations use Reanimated 3 (not Animated API)
- [ ] No TypeScript errors
- [ ] Each component can render independently (test in a story-like view)

---

## Phase 4: Tap to Explore (P0)

### Ticket 11: Build Explore World View
**Priority:** P0
**Dependencies:** Ticket 10

**Description:**
The main home screen — an immersive, animated world view.

**UI:**
- Full-screen dark background with subtle animated gradient
- Floating bubbles representing nearby people, active rooms, and trending posts
- Bubbles gently bob (translateY oscillation)
- Tap a bubble → expand to full profile/room/post view
- Pull down to refresh (re-fetch nearby people)
- Search bar at top (glass style)
- Stories row at very top (horizontal scroll of story rings)
- Filter icon (top right) → distance, age range, interests

**Acceptance Criteria:**
- [ ] Minimum 8 floating bubbles visible at any time
- [ ] Bubbles are positioned randomly but don't overlap
- [ ] Each bubble has: avatar, name label, and glow if online
- [ ] Tap bubble → profile card modal slides up
- [ ] Smooth 60fps animation (no jank)
- [ ] Pull-to-refresh fetches new nearby users
- [ ] Stories row shows users with active stories (gradient ring)
- [ ] Filter modal allows adjusting discovery preferences

---

### Ticket 12: Build Floating Bubble Component
**Priority:** P0
**Dependencies:** Ticket 10

**Description:**
The animated bubble used in the Explore view.

**Props:**
- `user: UserProfile` (or `room`/`post` variant)
- `onPress: () => void`
- `position: { x: number; y: number }`

**Animation:**
- Idle: translateY oscillation ±4px, 3s period
- Press: scale(1.0 → 1.1) with spring, glow intensifies
- Online users: subtle green glow
- Has story: gradient ring around avatar

**Acceptance Criteria:**
- [ ] Smooth 60fps animation on both iOS and Android
- [ ] Animation pauses when bubble is off-screen (performance)
- [ ] Press animation is responsive (<100ms delay)
- [ ] Bubble size adapts to name length

---

## Phase 5: Discovery & Matching (P0)

### Ticket 13: Build Discovery Screen (Swipe)
**Priority:** P0
**Dependencies:** Ticket 10

**Description:**
Tinder-style swipe interface for browsing profiles.

**UI:**
- Stack of profile cards (3 visible, rest behind)
- Swipe right = like, swipe left = pass
- Buttons: ✕ (pass), ⭐ (super like), 💜 (like)
- Profile card shows: photo, name, age, distance, bio snippet, interests
- Empty state: "No more profiles nearby. Try adjusting your filters!"

**Acceptance Criteria:**
- [ ] Swipe gesture works smoothly (drag to rotate/fade card)
- [ ] Card snaps back if not dragged far enough (<30% width)
- [ ] Card flies off screen if dragged far enough (>30% width)
- [ ] Button taps trigger same action as swipe
- [ ] Like/pass calls Supabase and checks for mutual match
- [ ] Super Like shows special animation (1/day limit)
- [ ] Loading skeleton while fetching profiles

---

### Ticket 14: Build Match Celebration Screen
**Priority:** P0
**Dependencies:** Ticket 13

**Description:**
Full-screen celebration when two users mutually like each other.

**UI:**
- Full-screen gradient overlay (#7B2FF7 → #FF6B9D → transparent)
- Both avatars slide in from left and right
- "It's a Match!" text fades in (Space Grotesk, 32px)
- "[Name] and you liked each other" subtext
- "Send Message" GradientButton → opens DM
- "Keep Exploring" ghost button → back to discovery

**Acceptance Criteria:**
- [ ] Animation plays on first match only (not on app load)
- [ ] Avatars have spring animation (bouncy)
- [ ] "Send Message" navigates to new conversation
- [ ] Can dismiss by swiping down or tapping "Keep Exploring"
- [ ] Haptic feedback on match (light impact)

---

### Ticket 15: Build Filter Modal
**Priority:** P1
**Dependencies:** Ticket 13

**Description:**
Modal for adjusting discovery preferences.

**Filters:**
- Distance range (slider: 1-100 km)
- Age range (dual slider: 18-55)
- Gender preference (multi-select: male, female, non-binary)
- Looking for (multi-select: dating, friends, activity)
- Interests (multi-select from interest tags)

**Acceptance Criteria:**
- [ ] Sliders show current values in real-time
- [ ] "Apply" saves filters to user settings
- [ ] "Reset" restores defaults
- [ ] Filters persist across app restarts
- [ ] Discovery results update immediately after applying

---

## Phase 6: Messaging (P0)

### Ticket 16: Build DM List Screen
**Priority:** P0
**Dependencies:** Ticket 5

**Description:**
List of all active conversations (matches).

**UI:**
- List of conversation rows
- Each row: avatar (with online dot), name, last message preview, timestamp
- Unread messages: bold name, unread count badge
- Tap row → open conversation
- Empty state: "Your conversations will appear here after you match!"

**Acceptance Criteria:**
- [ ] Conversations sorted by most recent message
- [ ] Online status updates in real-time (Supabase presence)
- [ ] Unread count badge shows correct number
- [ ] Pull-to-refresh
- [ ] Long press → options (unmatch, block, report)

---

### Ticket 17: Build Chat Screen
**Priority:** P0
**Dependencies:** Ticket 16

**Description:**
Real-time DM conversation screen.

**UI:**
- Header: avatar, name, online status, video call icon (disabled for v1)
- Message list (inverted FlatList for chat)
- Own messages: right-aligned, gradient background
- Other's messages: left-aligned, glass background
- Input bar at bottom: text input, send button, image picker button
- Typing indicator (3 bouncing dots)
- Read receipts (single check = sent, double check = read)
- Load more messages on scroll up

**Acceptance Criteria:**
- [ ] Messages load from Supabase (paginated, 50 per page)
- [ ] New messages appear in real-time via Supabase Realtime
- [ ] Typing indicator shows when other user is typing
- [ ] Read receipts update when messages are read
- [ ] Image picker opens gallery/camera
- [ ] Image messages show thumbnail in chat (tap to expand)
- [ ] Keyboard pushes input bar up (avoid keyboard overlap)
- [ ] Scroll to bottom on new message
- [ ] Messages persist across app restarts

---

### Ticket 18: Build Search & User Search
**Priority:** P1
**Dependencies:** Ticket 5

**Description:**
Search for users by name or username.

**UI:**
- Search bar at top of Messages screen (or separate screen)
- Results list: avatar, name, username, mutual connections count
- Tap result → view profile
- Recent searches (stored locally)

**Acceptance Criteria:**
- [ ] Search queries Supabase `users` table with `ilike` on name/username
- [ ] Results filter out blocked users
- [ ] Debounced search (300ms delay)
- [ ] Recent searches stored in AsyncStorage
- [ ] Clear individual or all recent searches

---

## Phase 7: Stories (P0)

### Ticket 19: Build Stories Row
**Priority:** P0
**Dependencies:** Ticket 10

**Description:**
Horizontal scroll of story rings in the Explore view.

**UI:**
- "Your Story" ring (with + icon if no story, or your avatar if story exists)
- Other users' story rings (gradient ring if unviewed, gray if viewed)
- Names below each ring
- Horizontal scroll, snap to edges

**Acceptance Criteria:**
- [ ] Shows users with active (non-expired) stories
- [ ] Your story appears first
- [ ] Unviewed stories have vibrant gradient ring
- [ ] Viewed stories have dimmed gray ring
- [ ] Tap ring → open story viewer
- [ ] Tap "Your Story" → open story creator

---

### Ticket 20: Build Story Creator
**Priority:** P0
**Dependencies:** Ticket 19

**Description:**
Create and post a story (photo/video).

**UI:**
- Camera viewfinder (or gallery picker)
- Bottom bar: gallery, flash toggle, capture button, flip camera
- After capture: preview screen
  - Text overlay tool (tap to add text)
  - Color picker for text
  - "Post Story" button
  - "Cancel" button
- Posting state with progress

**Acceptance Criteria:**
- [ ] Camera works on both iOS and Android
- [ ] Gallery picker shows recent photos/videos
- [ ] Video stories limited to 15 seconds
- [ ] Photo stories auto-expire after 24 hours (DB `expires_at`)
- [ ] Upload progress shown during posting
- [ ] Story appears in stories row immediately after posting
- [ ] Can add text overlay (drag to position, pinch to resize)

---

### Ticket 21: Build Story Viewer
**Priority:** P0
**Dependencies:** Ticket 19

**Description:**
Full-screen story viewer.

**UI:**
- Full-screen image/video
- Progress bars at top (one per story segment)
- User avatar + name + timestamp at top
- Auto-advance after 5 seconds (video: when video ends)
- Tap right half → next story
- Tap left half → previous story
- Swipe down → close
- "Reply" input at bottom → sends DM

**Acceptance Criteria:**
- [ ] Stories play in order (oldest → newest per user)
- [ ] All stories from all users are queued
- [ ] Progress bar animates in real-time
- [ ] Pause on long press (to read long text)
- [ ] Reply sends DM to story creator
- [ ] Marks story as viewed (DB update)
- [ ] Video stories play with sound (toggleable)
- [ ] Keyboard dismisses when typing reply

---

## Phase 8: Community Posts (P0)

### Ticket 22: Build Community Feed
**Priority:** P0
**Dependencies:** Ticket 10

**Description:**
Anonymous (or attributed) post feed.

**UI:**
- Infinite scroll feed of posts
- Each post: content text, optional image, reaction bar, comment count, timestamp
- Anonymous posts show "Anonymous" with random avatar
- Attributed posts show username + avatar
- "Create Post" FAB (floating action button, bottom right)
- Pull-to-refresh

**Acceptance Criteria:**
- [ ] Posts load paginated (20 per page)
- [ ] Infinite scroll loads more on bottom reach
- [ ] Reactions show emoji count (tap to react)
- [ ] Tap post → post detail with comments
- [ ] Anonymous posts hide user identity in UI
- [ ] Pull-to-refresh fetches new posts

---

### Ticket 23: Build Post Creator
**Priority:** P0
**Dependencies:** Ticket 22

**Description:**
Create a new community post.

**UI:**
- Modal or full screen
- Text area (max 1000 chars)
- Image picker button
- Toggle: "Post as Anonymous" (default: on)
- Character counter
- "Post" GradientButton

**Acceptance Criteria:**
- [ ] Text validation (non-empty, under 1000 chars)
- [ ] Image compression before upload
- [ ] Anonymous toggle works (stores `is_anonymous` in DB)
- [ ] Loading state during upload
- [ ] On success: post appears at top of feed, modal closes
- [ ] Error handling for failed uploads

---

### Ticket 24: Build Post Detail with Comments
**Priority:** P1
**Dependencies:** Ticket 22

**Description:**
View post detail and comments.

**UI:**
- Full post content (text + image)
- Reaction bar (emoji buttons)
- Comments list below
- Comment input at bottom
- "Anonymous" or username for each comment

**Acceptance Criteria:**
- [ ] Comments load from Supabase (paginated)
- [ ] Add comment (anonymous or attributed)
- [ ] React to post (emoji picker)
- [ ] Delete own comments
- [ ] Report post option

---

## Phase 9: Companion Booking (P0)

### Ticket 25: Build Companion Browse
**Priority:** P0
**Dependencies:** Ticket 10

**Description:**
Browse and filter companion profiles.

**UI:**
- Grid/list of companion cards
- Each card: photo, name, hourly rate, rating, available activities
- Filter bar: activity type, price range, availability
- Tap card → companion detail profile

**Acceptance Criteria:**
- [ ] Only shows approved companions (`is_companion = true`)
- [ ] Filters work in combination (AND logic)
- [ ] Results sorted by relevance (rating, availability)
- [ ] Empty state if no companions match filters
- [ ] Pull-to-refresh

---

### Ticket 26: Build Companion Profile & Booking Flow
**Priority:** P0
**Dependencies:** Ticket 25

**Description:**
View companion details and book them.

**Companion Profile Screen:**
- Full photos (horizontal scroll)
- Name, bio, hourly rate
- Available activities (tags)
- Availability calendar
- Reviews section (v1.1 placeholder)

**Booking Flow:**
1. Select activity (from companion's available list)
2. Select date (calendar picker)
3. Select time (available time slots)
4. Select duration (1hr, 2hr, 4hr, 8hr)
5. See price breakdown (rate × duration)
6. "Confirm & Pay" → Stripe Checkout
7. Success screen with booking details

**Acceptance Criteria:**
- [ ] Availability calendar only shows available dates
- [ ] Time slots filtered by selected date
- [ ] Price calculation is accurate (hourly_rate × duration)
- [ ] Stripe Checkout opens in-app (not external browser)
- [ ] On payment success: booking created in DB
- [ ] Both booker and companion see booking in DMs
- [ ] Push notification sent to companion

---

### Ticket 27: Build Booking Management
**Priority:** P1
**Dependencies:** Ticket 26

**Description:**
View and manage bookings.

**UI:**
- Tabs: Upcoming, Past
- Each booking: companion name, activity, date, time, status, price
- Status indicators: pending (yellow), confirmed (green), completed (blue), cancelled (red)
- Actions: Cancel (if pending), Rate (if completed, v1.1)

**Acceptance Criteria:**
- [ ] Bookings sorted by date (upcoming: soonest first, past: most recent first)
- [ ] Cancel booking within 24 hours of start time (full refund)
- [ ] Cancel booking after 24 hours (no refund)
- [ ] Booking status updates in real-time

---

## Phase 10: Voice Rooms (P0)

### Ticket 28: Build Voice Room Feature
**Priority:** P0
**Dependencies:** Ticket 10, Ticket 5

**Description:**
Join, create, and participate in voice rooms.

**Explore View Integration:**
- Voice rooms appear as RoomBubbles in the world view
- Shows: topic, participant count, host name
- Tap → room preview → "Join Room"

**Create Room:**
- Topic input (max 50 chars)
- Privacy toggle (public/friends-only)
- Max participants (10, 25, 50)
- "Start Room" button

**Room Screen:**
- Participant grid (circular avatars)
- Host has crown icon
- Mute/Unmute button (large, bottom center)
- "Raise Hand" button
- Leave room button
- Room chat (text overlay, slide up)
- Participant count at top

**Acceptance Criteria:**
- [ ] LiveKit connection established via Edge Function token
- [ ] Audio works on both iOS and Android
- [ ] Mute/unmute toggles local audio track
- [ ] Participant join/leave updates in real-time
- [ ] Host can mute other participants
- [ ] "Raise Hand" sends notification to host
- [ ] Room chat messages appear as overlay
- [ ] Leave room disconnects from LiveKit
- [ ] Room auto-ends when host leaves
- [ ] Background audio continues when app is minimized (optional)

---

## Phase 11: Settings & Privacy (P1)

### Ticket 29: Build Profile Screen
**Priority:** P1
**Dependencies:** Ticket 5

**Description:**
View and edit your own profile.

**UI:**
- Editable photo grid (reorder, add, delete)
- Editable name, bio, interests
- "Become a Companion" CTA (if not already companion)
- Stats: matches count, posts count, profile views (if tracked)
- Settings gear icon → settings screen

**Acceptance Criteria:**
- [ ] Tap field to edit inline
- [ ] Photo changes upload immediately
- [ ] Interest changes save to DB
- [ ] "Become a Companion" navigates to application flow
- [ ] Profile changes reflect immediately in all views

---

### Ticket 30: Build Settings Screen
**Priority:** P1
**Dependencies:** Ticket 5

**Description:**
App settings and privacy controls.

**Sections:**
- **Account:** Email, password change, username change
- **Notifications:** Toggle for each notification type (matches, messages, bookings, stories, events)
- **Privacy:** Profile visibility, online status visibility, read receipts toggle
- **Blocked Users:** List of blocked users, unblock option
- **Data:** Download my data, delete account
- **About:** App version, terms of service, privacy policy

**Acceptance Criteria:**
- [ ] Notification toggles save to Supabase user settings
- [ ] Privacy settings apply immediately (e.g., hide online status)
- [ ] Block user removes them from discovery and messages
- [ ] Unblock user restores visibility
- [ ] Delete account requires confirmation + password
- [ ] Download data exports user's data as JSON

---

## Phase 12: Polish & Launch (P1)

### Ticket 31: Push Notifications
**Priority:** P1
**Dependencies:** Ticket 5

**Description:**
Set up push notification infrastructure.

**Acceptance Criteria:**
- [ ] Expo Push Token registered on login
- [ ] Token stored in Supabase `users` table
- [ ] Notifications sent for: new match, new message, companion booking, voice room invite
- [ ] Tapping notification deep links to relevant screen
- [ ] Notification permissions handled gracefully (denied = don't ask again)

---

### Ticket 32: Error Boundaries & Loading States
**Priority:** P1
**Dependencies:** All feature tickets

**Description:**
Global error handling and consistent loading UI.

**Acceptance Criteria:**
- [ ] Global error boundary catches fatal crashes
- [ ] Tab-level error boundaries (one tab crash doesn't kill others)
- [ ] Screen-level error boundaries with retry
- [ ] Skeleton loaders on all data-fetching screens
- [ ] Empty states on all list screens
- [ ] Network error UI with retry button
- [ ] Offline mode with cached content

---

### Ticket 33: Haptic Feedback
**Priority:** P2
**Dependencies:** All feature tickets

**Description:**
Add haptic feedback to key interactions.

**Acceptance Criteria:**
- [ ] Like tap → light impact
- [ ] Super Like → medium impact
- [ ] Match celebration → heavy impact
- [ ] Send message → light impact
- [ ] Pull-to-refresh → selection feedback
- [ ] Button press → selection feedback
- [ ] Disable haptics if user has system haptics off

---

### Ticket 34: Performance Optimization
**Priority:** P1
**Dependencies:** All feature tickets

**Description:**
Optimize app performance for smooth 60fps.

**Acceptance Criteria:**
- [ ] FlatLists use `getItemLayout` and `keyExtractor`
- [ ] Images use blurhash placeholders
- [ ] Reanimated animations run on UI thread
- [ ] No unnecessary re-renders (React.memo, useMemo where needed)
- [ ] Bundle size analyzed and optimized
- [ ] Startup time < 2 seconds
- [ ] Profile card swipe is 60fps on mid-range Android devices
