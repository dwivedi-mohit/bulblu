



# Security & Access Document — bulblu

**Version:** 1.0 (MVP)
**Last Updated:** 2026-08-18
**Threat Model:** Social app with payments, private messaging, and user-generated content. Primary risks: unauthorized data access, payment fraud, harassment/abuse, content violations.

---

## 1. Authentication Method

### Primary Methods

| Method | Implementation | When Used |
|--------|---------------|-----------|
| **Email + Password** | Supabase Auth with bcrypt hashing. Password minimum 8 chars, must include uppercase + lowercase + number. | Default signup/login |
| **Google OAuth** | Supabase Auth Google provider. One-tap sign-in. | Quick signup for existing Google users |

### Session Management

- Sessions are JWT tokens issued by Supabase Auth.
- Token expiry: 1 hour access token, 7 day refresh token.
- Refresh tokens rotate on use — each refresh invalidates the previous one.
- Sessions are stored in Expo SecureStore (encrypted device storage).
- Maximum 5 active sessions per user. Older sessions are automatically invalidated.

### Password Rules

| Rule | Enforcement |
|------|-------------|
| Minimum 8 characters | Client + server validation |
| Must contain uppercase letter | Client validation |
| Must contain lowercase letter | Client validation |
| Must contain number | Client validation |
| No common passwords (top 100k list) | Server-side check via Edge Function |
| No password reuse (last 5 passwords) | Stored as bcrypt hashes in a separate table |

### Email Verification

- Required before any app functionality is accessible.
- Supabase Auth handles verification email automatically.
- Unverified accounts can log in but see a "Verify your email" gate screen.
- Verification link expires after 24 hours. Resend available.

### Rate Limiting

| Action | Limit | Window |
|--------|-------|--------|
| Login attempts | 5 | 15 minutes |
| Signup | 3 | 1 hour |
| Password reset | 3 | 1 hour |
| Email verification resend | 3 | 1 hour |
| API requests (general) | 100 | 1 minute |

*Exceeded limits return HTTP 429. Account is locked for 15 minutes after 5 failed login attempts.*

---

## 2. User Roles & Permissions

### Roles

| Role | Description | How Assigned |
|------|-------------|--------------|
| **user** | Default role for all registered users | Automatic on signup |
| **companion** | Approved companion provider | Approved by admin after application |
| **admin** | Full system access | Manual database assignment only |
| **moderator** | Content moderation access | Manual database assignment only |

### Permissions Matrix

| Action | user | companion | moderator | admin |
|--------|------|-----------|-----------|-------|
| View own profile | ✅ | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ |
| View other profiles | ✅ | ✅ | ✅ | ✅ |
| Send messages (matched) | ✅ | ✅ | ✅ | ✅ |
| Post anonymously | ✅ | ✅ | ✅ | ✅ |
| Create stories | ✅ | ✅ | ✅ | ✅ |
| Join voice rooms | ✅ | ✅ | ✅ | ✅ |
| Create voice rooms | ✅ | ✅ | ✅ | ✅ |
| Book companions | ✅ | ✅ | ✅ | ✅ |
| Accept companion bookings | ❌ | ✅ | ✅ | ✅ |
| Receive companion payouts | ❌ | ✅ | ✅ | ✅ |
| View reported content | ❌ | ❌ | ✅ | ✅ |
| Remove violating content | ❌ | ❌ | ✅ | ✅ |
| Ban users | ❌ | ❌ | ❌ | ✅ |
| View analytics | ❌ | ❌ | ❌ | ✅ |
| Manage system settings | ❌ | ❌ | ❌ | ✅ |
| Access all user data | ❌ | ❌ | ❌ | ✅ |

### Companion Approval Process

1. User applies via Profile → "Become a Companion"
2. Submits: government ID photo, selfie for verification, bio, rate, activities
3. Admin reviews within 48 hours
4. If approved: `is_companion = true`, `companion_profiles` row created
5. If rejected: notification with reason, can reapply after 7 days

---

## 3. Row-Level Security Rules

### users table

```sql
-- Anyone can read public profile data (not email, not settings)
CREATE POLICY "users_select_public" ON users
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can only insert their own profile (during signup)
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Only admins can delete users
CREATE POLICY "users_delete_admin" ON users
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

### matches table

```sql
-- Users can only see matches they are part of
CREATE POLICY "matches_select_own" ON matches
  FOR SELECT USING (
    auth.uid() = user_a_id OR auth.uid() = user_b_id
  );

-- System creates matches (via Edge Function on mutual like)
-- Users cannot directly insert/update matches
```

### messages table

```sql
-- Users can only read messages in their own conversations
CREATE POLICY "messages_select_own" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = messages.match_id
      AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
      AND matches.is_active = true
    )
  );

-- Users can only send messages to their own matches
CREATE POLICY "messages_insert_own" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND (matches.user_a_id = auth.uid() OR matches.user_b_id = auth.uid())
      AND matches.is_active = true
    )
  );
```

### stories table

```sql
-- Anyone can view non-expired stories
CREATE POLICY "stories_select_active" ON stories
  FOR SELECT USING (expires_at > now());

-- Users can only insert their own stories
CREATE POLICY "stories_insert_own" ON stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own stories
CREATE POLICY "stories_delete_own" ON stories
  FOR DELETE USING (auth.uid() = user_id);
```

### posts table

```sql
-- Anyone can read non-reported posts
CREATE POLICY "posts_select_public" ON posts
  FOR SELECT USING (is_reported = false);

-- Users can insert their own posts
CREATE POLICY "posts_insert_own" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own posts (edit)
CREATE POLICY "posts_update_own" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "posts_delete_own" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Moderators can flag posts
CREATE POLICY "posts_moderate" ON posts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'moderator')
  );
```

### companion_profiles table

```sql
-- Anyone can view companion profiles
CREATE POLICY "companions_select_public" ON companion_profiles
  FOR SELECT USING (true);

-- Companions can update their own profile
CREATE POLICY "companions_update_own" ON companion_profiles
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_companion = true)
  );
```

### bookings table

```sql
-- Users can only see their own bookings (as booker or companion)
CREATE POLICY "bookings_select_own" ON bookings
  FOR SELECT USING (
    auth.uid() = booker_id
    OR EXISTS (
      SELECT 1 FROM companion_profiles
      WHERE companion_profiles.id = companion_id
      AND companion_profiles.user_id = auth.uid()
    )
  );
```

### blocks table

```sql
-- Users can see who they blocked and who blocked them
CREATE POLICY "blocks_select_own" ON blocks
  FOR SELECT USING (
    auth.uid() = blocker_id OR auth.uid() = blocked_id
  );

-- Users can block anyone
CREATE POLICY "blocks_insert_own" ON blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock
CREATE POLICY "blocks_delete_own" ON blocks
  FOR DELETE USING (auth.uid() = blocker_id);
```

---

## 4. Error Handling Guide

### Global Error Handling Rules

1. **Never show raw error messages to users.** All errors are mapped to user-friendly messages.
2. **Always log errors to Sentry** (or console in dev) with full context.
3. **Never crash the app.** Every error boundary catches and shows a recovery UI.
4. **Network errors get a specific "retry" UI.** Not a generic crash.

### Error Response Map

| Error | User Sees | Technical Action |
|-------|-----------|-----------------|
| No internet connection | "You're offline. Check your connection and try again." + retry button | Show cached content if available |
| Server error (500) | "Something went wrong on our end. We're looking into it." + retry button | Log to Sentry with full stack trace |
| Auth token expired | Silently refresh. If refresh fails: "Session expired. Please log in again." → redirect to login | Rotate refresh token |
| Invalid email | "Please enter a valid email address." | Client-side validation |
| Wrong password | "Incorrect password. Try again or reset it." | Generic message (don't reveal if email exists) |
| Email already registered | "An account with this email already exists. Try logging in." | Check before signup |
| Rate limit exceeded | "Too many attempts. Please wait [X] minutes." | Show countdown timer |
| Payment failed | "Payment couldn't be processed. Check your card details and try again." | Log Stripe error code |
| Payment declined | "Your card was declined. Try a different payment method." | Suggest card update |
| File too large | "Photo must be under 10MB. Try a smaller image." | Client-side check before upload |
| Invalid file type | "Only JPG, PNG, and MP4 files are allowed." | Client-side check |
| Companion unavailable | "This companion is currently unavailable. Try another." | Check availability before booking |
| Booking conflict | "This time slot is already booked. Choose another time." | Check calendar before confirming |
| LiveKit connection failed | "Couldn't connect to voice room. Check your connection and try again." | Retry with exponential backoff |
| Push notification permission denied | "Enable notifications in Settings to get alerts from bulblu." | Deep link to app settings |
| Stripe Connect not onboarded | "Companion account setup is incomplete. Please finish onboarding." | Redirect to Stripe onboarding |
| Database connection pool exhausted | "We're experiencing high traffic. Please try again in a moment." | Retry after 5 seconds |
| Supabase Realtime disconnect | Silently reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s) | Show "Reconnecting..." banner |

### Error Boundary Strategy

```
App Root
  └── GlobalErrorBoundary (catches fatal errors)
        → Shows full-screen error with "Restart App" button

Tab Navigator
  └── TabErrorBoundary (catches tab-specific errors)
        → Shows error within the tab, other tabs still work

Screen
  └── ScreenErrorBoundary (catches screen-specific errors)
        → Shows error card within the screen, navigation still works
```

---

## 5. Edge Cases

### Form Handling

| Edge Case | Handling |
|-----------|----------|
| Empty form submission | Disable submit button until required fields are filled |
| Extremely long text input | Enforce max lengths: bio (500), message (2000), post (1000), comment (500) |
| Special characters in inputs | Sanitize HTML to prevent XSS. Allow emojis and unicode. |
| Rapid double-tap on buttons | Debounce all tap handlers (300ms). Disable button during async operation. |
| Form submission during network loss | Queue locally, show "Sending..." state, retry when online |

### Data Edge Cases

| Edge Case | Handling |
|-----------|----------|
| User tries to match with themselves | Impossible — discovery filters out own profile |
| User tries to message unmatched user | Blocked at UI level + RLS policy blocks at DB level |
| User blocks then unblocks | Match is still active if it existed. If matched after block, new block removes match. |
| Companion books themselves | Edge Function validates booker_id ≠ companion.user_id |
| Same-day booking after cutoff | Enforce minimum 2-hour lead time for bookings |
| Multiple concurrent bookings | Companion availability check is atomic (SELECT FOR UPDATE) |
| Story expires mid-view | Story viewer handles gracefully — shows "Story expired" and moves to next |
| Profile photo deleted from storage | Cascade: if avatar_url references deleted file, show default avatar |
| User deletes account with active bookings | Force-complete or cancel all pending bookings first |
| User deletes account with pending messages | Messages remain (tied to match), but user is anonymized |

### Network Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Slow 3G connection | Skeleton loaders, progressive image loading (blurhash placeholders), lazy-load below-fold content |
| Connection drops mid-upload | Resume upload from last chunk (chunked upload for videos >5MB) |
| WebSocket disconnects | Auto-reconnect with exponential backoff. Show "Reconnecting..." banner. Pending messages cached locally. |
| Offline mode | Cache last 50 messages per conversation, last 20 explore profiles, last 10 community posts. Queue outbound messages. |
| Airplane mode →恢复 | Sync queued actions on reconnect. Show "X messages sent" confirmation. |

### Security Edge Cases

| Edge Case | Handling |
|-----------|----------|
| User pastes SQL in input fields | Supabase parameterized queries prevent SQL injection. Inputs sanitized. |
| User uploads malicious file | File type validated on client AND server. Supabase Storage policies restrict to image/video MIME types. Files served from CDN (not directly). |
| User tries to access other user's data via API | RLS policies enforce at database level. Even if client code is modified, server blocks unauthorized access. |
| JWT token stolen | Tokens are short-lived (1 hour). Refresh rotation limits window. Device binding optional in v1.1. |
| User creates multiple accounts | Email uniqueness enforced. Phone verification in v1.1. |
| Companion overcharges outside app | All payments must go through in-app Stripe. Companion agreements prohibit off-platform payments. Violation = ban. |
| User screenshots private content | No technical prevention for screenshots. Terms of service prohibit redistribution. |

### UI Edge Cases

| Edge Case | Handling |
|-----------|----------|
| No matches yet (empty discovery) | Show friendly illustration: "No one nearby yet. Try expanding your distance filter!" |
| No messages yet (empty DM list) | Show illustration: "Your conversations will appear here after you match!" |
| No voice rooms active | Show "No rooms active right now. Start one!" with create button |
| User has no profile photos | Block discovery (can't be shown to others). Show prompt: "Add a photo to get discovered!" |
| Very long username/bio | Truncate with ellipsis. Full text on tap/expand. |
| Notification permission denied | Don't ask again. Show subtle banner once per session. |
| Deep link to nonexistent content | Show "This content is no longer available" screen with back button |
| App opened via expired deep link | Navigate to home screen with toast: "That link has expired" |
