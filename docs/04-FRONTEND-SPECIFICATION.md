# Frontend Specification — bulblu

**Version:** 1.0 (MVP)
**Last Updated:** 2026-08-18
**Design Language:** Maxmorphism

---

## 1. Maxmorphism Design Language

Maxmorphism is the visual identity of bulblu. It fuses three design trends into one cohesive system:

- **Glassmorphism** — translucent surfaces with backdrop blur, layered depth
- **Neumorphism** — soft inset/outset shadows on dark surfaces
- **Organic Fluidity** — rounded shapes, flowing gradients, smooth motion

### Core Principles

1. **Depth through layers.** Every surface floats. Nothing feels flat.
2. **Glass over darkness.** Semi-transparent panels over dark, rich backgrounds.
3. **Vibrant accents on dark base.** Bold gradients pop against deep backgrounds.
4. **Motion is meaning.** Animations guide attention, confirm actions, and delight.
5. **Organic, not rigid.** Rounded corners (16-24px), flowing shapes, no hard edges.

---

## 2. Color Palette

### Primary Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#7B2FF7` | Primary actions, active states, links |
| `primaryLight` | `#A855F7` | Hover states, gradient endpoints |
| `primaryDark` | `#6D28D9` | Pressed states, gradient start points |
| `primaryGradient` | `#7B2FF7 → #FF6B9D` | Hero buttons, profile rings, story rings |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `accentBlue` | `#3B82F6` | Links, info states, secondary actions |
| `accentCoral` | `#FF6B35` | Notifications, badges, urgent actions |
| `accentGreen` | `#10B981` | Online status, success, confirmations |
| `accentPink` | `#FF6B9D` | Likes, matches, romantic features |
| `accentYellow` | `#F59E0B` | Warnings, Super Like, highlights |

### Background Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `bgPrimary` | `#0A0A1A` | Main app background |
| `bgSecondary` | `#111127` | Card backgrounds, surfaces |
| `bgTertiary` | `#1A1A3E` | Elevated surfaces, modals |
| `bgGlass` | `rgba(255,255,255,0.05)` | Glass panels (with backdrop blur) |
| `bgGlassLight` | `rgba(255,255,255,0.1)` | Lighter glass (hover states) |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `textPrimary` | `#FFFFFF` | Headings, primary content |
| `textSecondary` | `rgba(255,255,255,0.7)` | Body text, descriptions |
| `textTertiary` | `rgba(255,255,255,0.4)` | Placeholders, hints, timestamps |
| `textInverse` | `#0A0A1A` | Text on light/gradient backgrounds |

### Status Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `error` | `#EF4444` | Errors, destructive actions, bans |
| `success` | `#10B981` | Success states, confirmations |
| `warning` | `#F59E0B` | Warnings, caution states |
| `info` | `#3B82F6` | Informational messages |

### Gradient Presets

```typescript
const gradients = {
  primary: ['#7B2FF7', '#FF6B9D'],       // Main brand gradient
  hero: ['#7B2FF7', '#3B82F6', '#06B6D4'], // Hero sections
  warm: ['#FF6B9D', '#FF6B35'],           // Dating/romantic features
  cool: ['#3B82F6', '#06B6D4'],           // Voice/video features
  online: ['#10B981', '#34D399'],         // Online status indicator
  glass: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)'], // Glass panels
};
```

---

## 3. Typography

### Font Stack

| Purpose | Font | Weight | Size |
|---------|------|--------|------|
| **Headings** | Space Grotesk | Bold (700) | 28-32px |
| **Subheadings** | Space Grotesk | SemiBold (600) | 20-24px |
| **Body** | Inter | Regular (400) | 15-16px |
| **Body Medium** | Inter | Medium (500) | 15-16px |
| **Body Bold** | Inter | SemiBold (600) | 15-16px |
| **Caption** | Inter | Regular (400) | 12-13px |
| **Button** | Inter | SemiBold (600) | 15-16px |
| **Label** | Inter | Medium (500) | 13-14px |
| **Input** | Inter | Regular (400) | 16px |
| **Tab Bar** | Inter | Medium (500) | 11-12px |

### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `tight` | 1.2 | Headings |
| `normal` | 1.5 | Body text |
| `relaxed` | 1.75 | Long-form content |

### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `tight` | -0.02em | Large headings |
| `normal` | 0 | Body text |
| `wide` | 0.05em | Labels, captions, ALL CAPS |

---

## 4. Spacing & Layout

### Spacing Scale (8px base)

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 12px |
| `base` | 16px |
| `lg` | 20px |
| `xl` | 24px |
| `2xl` | 32px |
| `3xl` | 40px |
| `4xl` | 48px |
| `5xl` | 64px |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 8px | Small buttons, inputs |
| `md` | 12px | Cards, containers |
| `lg` | 16px | Large cards, modals |
| `xl` | 20px | Profile cards, sheets |
| `2xl` | 24px | Full-screen cards |
| `full` | 9999px | Avatars, pills, badges |

### Shadows (Maxmorphism Neumorphism)

```typescript
const shadows = {
  // Soft outset shadow (floating elements)
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  // Medium shadow (cards)
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  // Large shadow (modals, sheets)
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  // Glass glow (accent elements)
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  }),
};
```

### Layout Constants

| Token | Value | Usage |
|-------|-------|-------|
| `screenPadding` | 16px | Horizontal padding on screens |
| `cardPadding` | 16px | Padding inside cards |
| `tabBarHeight` | 80px | Bottom tab bar height |
| `headerHeight` | 56px | Top header/app bar height |
| `avatarSm` | 32px | Small avatar (chat list) |
| `avatarMd` | 48px | Medium avatar (comments) |
| `avatarLg` | 72px | Large avatar (profile card) |
| `avatarXl` | 96px | Extra large avatar (profile screen) |

---

## 5. Component Catalog

### 5.1 GlassCard

The core surface component. Translucent glass with backdrop blur.

```
Props:
  variant: 'default' | 'elevated' | 'inset'
  blur: number (default 20)
  opacity: number (default 0.05)
  borderColor: string (default rgba(255,255,255,0.1))
  children: ReactNode

Visual:
  ┌─────────────────────────────┐
  │  background: rgba(255,255,  │
  │  255, 0.05)                 │
  │  backdrop-filter: blur(20px)│
  │  border: 1px solid          │
  │  rgba(255,255,255, 0.1)    │
  │  border-radius: 16px        │
  │  shadow: md                 │
  │                             │
  │  [children]                 │
  └─────────────────────────────┘
```

### 5.2 GradientButton

Primary action button with animated gradient.

```
Props:
  variant: 'primary' | 'secondary' | 'danger' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  disabled: boolean
  loading: boolean
  onPress: () => void
  children: ReactNode

Visual (primary):
  ┌─────────────────────────────┐
  │  ████████████████████████   │ ← gradient: #7B2FF7 → #FF6B9D
  │  █  Button Text          █  │ ← white, Inter SemiBold 15px
  │  ████████████████████████   │
  └─────────────────────────────┘
  border-radius: 12px
  height: 48px (md)
  press animation: scale(0.97) + brightness increase
```

### 5.3 Avatar

User profile picture with status indicator.

```
Props:
  uri: string | null
  size: 'sm' | 'md' | 'lg' | 'xl'
  showOnline: boolean
  showStory: boolean (gradient ring if has story)
  isVerified: boolean

Visual:
  ┌──────────┐
  │ ╭──────╮ │ ← gradient ring (#7B2FF7 → #FF6B9D) if story
  │ │      │ │
  │ │ photo│ │ ← circular image
  │ │      │ │
  │ ╰──────╯ │
  │     ●    │ ← green dot (bottom-right) if online
  └──────────┘
```

### 5.4 Input

Text input with Maxmorphism styling.

```
Props:
  label: string
  placeholder: string
  value: string
  onChangeText: (text: string) => void
  error: string | null
  secureTextEntry: boolean
  multiline: boolean
  icon: ReactNode (optional, left side)

Visual:
  Label (Inter Medium 13px, rgba(255,255,255,0.7))
  ┌─────────────────────────────┐
  │ 🔍  Placeholder text...     │ ← bg: rgba(255,255,255,0.05)
  └─────────────────────────────┘ ← border: 1px solid rgba(255,255,255,0.1)
  Error text (if any, #EF4444)
  border-radius: 12px
  height: 48px
  focus state: border-color transitions to #7B2FF7
```

### 5.5 ProfileCard

Full-screen profile view (used in Discovery and Explore).

```
Props:
  user: UserProfile
  onLike: () => void
  onPass: () => void
  onSuperLike: () => void

Visual:
  ┌─────────────────────────────┐
  │                             │
  │     [Full-width photo]      │
  │                             │
  │  ┌─────────────────────────┐│
  │  │ Name, 25               ││ ← gradient overlay at bottom
  │  │ 📍 2 miles away         ││
  │  │ Bio text goes here...   ││
  │  │                         ││
  │  │ [Interest tags]         ││ ← pills: rgba(255,255,255,0.1)
  │  └─────────────────────────┘│
  │                             │
  │   ✕    ⭐    💜            │ ← Pass / Super Like / Like
  │  (red) (yellow) (pink)     │    circular buttons with glow
  └─────────────────────────────┘
```

### 5.6 MessageBubble

Chat message bubble.

```
Props:
  content: string
  isOwn: boolean
  timestamp: string
  isRead: boolean

Visual (own message):
                    ┌──────────────┐
                    │ Message text │  ← bg: gradient #7B2FF7 → #FF6B9D
                    │         2:30 ✓│  ← white text, checkmark
                    └──────────────┘

Visual (other's message):
  ┌──────────────┐
  │ Message text │  ← bg: rgba(255,255,255,0.08)
  │  2:30        │  ← white text
  └──────────────┘
```

### 5.7 StoryRing

Circular avatar with gradient ring for active stories.

```
Props:
  uri: string
  hasStory: boolean
  viewed: boolean
  onPress: () => void

Visual:
  ╭────────────╮ ← gradient ring (viewed: dimmer gray ring)
  │ ╭────────╮ │
  │ │ avatar │ │
  │ ╰────────╯ │
  ╰────────────╯
```

### 5.8 FloatingBubble

Used in Tap to Explore for people, rooms, and posts.

```
Props:
  type: 'person' | 'room' | 'post'
  uri: string (avatar/image)
  label: string
  isActive: boolean
  onPress: () => void

Visual (person):
     ╭──────╮
     │avatar│  ← circular, with subtle glow if online
     │ Name │  ← Inter Medium 12px
     ╰──────╯
  float animation: translateY oscillation (±4px, 3s loop)
  press: scale(1.1) + glow increase
```

### 5.9 BottomSheet

Modal bottom sheet for actions and forms.

```
Props:
  visible: boolean
  onClose: () => void
  title: string
  children: ReactNode

Visual:
  ┌─────────────────────────────┐
  │  ──── (drag handle)         │
  │                             │
  │  Title                      │
  │                             │
  │  [content]                  │
  │                             │
  └─────────────────────────────┘
  bg: #111127
  border-radius: 24px (top only)
  backdrop: rgba(0,0,0,0.5)
  slide up animation with spring physics
```

### 5.10 Badge

Notification badge.

```
Props:
  count: number
  variant: 'default' | 'danger'

Visual:
  ┌───┐
  │ 3 │ ← bg: #EF4444 (danger) or #FF6B35 (default)
  └───┘   white text, Inter Bold 11px
  border-radius: 9999px
  min-width: 20px, height: 20px
```

---

## 6. Animation Specs

### Timing Functions

| Name | Value | Usage |
|------|-------|-------|
| `spring` | `{ damping: 15, stiffness: 150 }` | Default transition for most interactions |
| `bouncy` | `{ damping: 12, stiffness: 200 }` | Playful interactions (likes, matches) |
| `smooth` | `{ duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) }` | Page transitions |
| `snappy` | `{ duration: 150, easing: Easing.out(Easing.cubic) }` | Button presses, quick feedback |

### Key Animations

| Animation | Trigger | Spec |
|-----------|---------|------|
| **Like burst** | Tap heart button | Particles explode from heart, scale(0→1.3→1), opacity 1→0 over 800ms |
| **Match reveal** | Mutual match detected | Full-screen gradient overlay, both avatars slide in from sides, "It's a Match!" text fades in |
| **Profile card swipe** | Drag gesture | Card follows finger, rotation based on drag X, opacity fades, springs back if not dragged far enough |
| **Floating bubble** | Idle state on Explore | `translateY` oscillation: ±4px with 3s period, sine wave easing |
| **Story ring pulse** | Story available | Subtle scale pulse: 1.0→1.02→1.0 with 2s period |
| **Message send** | Send button tap | Bubble scales from 0.8→1.0 with spring, slides up into position |
| **Tab switch** | Bottom tab tap | Cross-fade with slight Y translate (8px) over 200ms |
| **Pull to refresh** | Swipe down on feed | Custom refresh indicator: rotating gradient circle |
| **Voice room participant join** | New participant | Avatar scales from 0→1 with bouncy spring, glow effect |
| **Typing indicator** | Other user typing | Three dots with staggered bounce animation (150ms delay between dots) |
| **Gradient shimmer** | Loading states | Linear gradient animation moving left-to-right over 1.5s loop |
| **Card press** | Touchable card | `scale(1.0) → scale(0.97)` on press, back to 1.0 on release (50ms) |

---

## 7. API & Integration Spec

### 7.1 Supabase Client Setup

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export default supabase;
```

### 7.2 Auth Pattern

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Signup
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name, username } },
});

// Google OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: 'bulblu://auth/callback' },
});

// Logout
await supabase.auth.signOut();
```

### 7.3 Data Fetching Pattern

```typescript
// Get user profile
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// Get matches with profiles
const { data, error } = await supabase
  .from('matches')
  .select(`
    *,
    user_a:users!matches_user_a_id_fkey(id, full_name, avatar_url, is_online),
    user_b:users!matches_user_b_id_fkey(id, full_name, avatar_url, is_online)
  `)
  .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
  .eq('is_active', true)
  .order('matched_at', { ascending: false });

// Get messages for a conversation
const { data, error } = await supabase
  .from('messages')
  .select('*')
  .eq('match_id', matchId)
  .order('created_at', { ascending: true })
  .range(0, 49); // First 50 messages
```

### 7.4 Realtime Subscription Pattern

```typescript
// Listen for new messages
const channel = supabase
  .channel(`messages:${matchId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `match_id=eq.${matchId}`,
  }, (payload) => {
    addMessage(payload.new);
  })
  .subscribe();

// Presence (online status)
const channel = supabase
  .channel('online')
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    updateOnlineUsers(state);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: userId });
    }
  });

// Cleanup
supabase.removeChannel(channel);
```

### 7.5 File Upload Pattern

```typescript
// Upload avatar
const fileName = `${userId}/${Date.now()}.jpg`;
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(fileName, file, {
    contentType: 'image/jpeg',
    upsert: true,
  });

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(fileName);
```

### 7.6 Edge Function Calls

```typescript
// Create booking
const { data, error } = await supabase.functions.invoke('create-booking', {
  body: {
    companion_id,
    activity,
    date,
    start_time,
    duration_hours,
  },
});

// Get LiveKit token
const { data, error } = await supabase.functions.invoke('create-livekit-token', {
  body: { room_id: roomId },
});
```
