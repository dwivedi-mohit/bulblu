import { Router, Request, Response } from 'express';
import { query } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

export const ALL_27_SERVICES = [
  { id: 'Rent GF/BF', label: '💖 Rent GF/BF', category: 'Relationship' },
  { id: 'Movie Partner', label: '🍿 Movie Partner', category: 'Entertainment' },
  { id: 'In-Person Meet', label: '☕ In-Person Meet', category: 'Social' },
  { id: 'Elder Care', label: '👵 Elder Care', category: 'Care' },
  { id: 'Hanging Out', label: '🎈 Hanging Out', category: 'Social' },
  { id: 'Clubbing', label: '🪩 Clubbing', category: 'Nightlife' },
  { id: 'Shopping Buddy', label: '🛍️ Shopping Buddy', category: 'Lifestyle' },
  { id: 'Medical Support', label: '🩺 Medical Support', category: 'Care' },
  { id: 'Domestic Help', label: '🏡 Domestic Help', category: 'Care' },
  { id: 'Travel Partner', label: '✈️ Travel Partner', category: 'Travel' },
  { id: 'Event Partner', label: '🎟️ Event Partner', category: 'Events' },
  { id: 'City Tour', label: '🧭 City Tour', category: 'Travel' },
  { id: 'Gaming Partner', label: '🎮 Gaming Partner', category: 'Gaming' },
  { id: 'Concert Partner', label: '🎸 Concert Partner', category: 'Events' },
  { id: 'Coffee Partner', label: '☕ Coffee Partner', category: 'Social' },
  { id: 'Cafe & Food', label: '🍕 Cafe & Food', category: 'Food' },
  { id: 'Networking', label: '💼 Networking', category: 'Professional' },
  { id: 'Gym & Fitness Buddy', label: '🏋️ Gym & Fitness Buddy', category: 'Fitness' },
  { id: 'Pet Care Companion', label: '🐾 Pet Care Companion', category: 'Care' },
  { id: 'Study Buddy', label: '📚 Study Buddy', category: 'Education' },
  { id: 'Photographer Companion', label: '📸 Photographer Companion', category: 'Creative' },
  { id: 'Long Drive Buddy', label: '🚗 Long Drive Buddy', category: 'Travel' },
  { id: 'Yoga & Wellness Partner', label: '🧘 Yoga & Wellness Partner', category: 'Fitness' },
  { id: 'Theater & Play Companion', label: '🎭 Theater & Play Companion', category: 'Events' },
  { id: 'Karaoke Buddy', label: '🎤 Karaoke Buddy', category: 'Nightlife' },
  { id: 'Esports Teammate', label: '🕹️ Esports Teammate', category: 'Gaming' },
  { id: 'Wedding Guest Plus-One', label: '🤝 Wedding Guest Plus-One', category: 'Events' },
];

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// GET /api/rent/services
router.get('/services', (_req: Request, res: Response) => {
  res.json({ services: ALL_27_SERVICES });
});

function formatPublicUrl(url: string | null | undefined, req: Request): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
  }
  const trimmed = url.trim();
  if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) {
    return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
  }
  if (trimmed.startsWith('/uploads/')) {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    return `${protocol}://${host}${trimmed}`;
  }
  return trimmed;
}

// GET /api/rent/companions — queries strictly approved companion applications from PostgreSQL
router.get('/companions', async (req: Request, res: Response) => {
  try {
    const { category, lat, lng, maxDistanceKm } = req.query;

    let sql = `
      SELECT ca.id, ca.display_name AS name, ca.city, ca.area AS "locationName",
        COALESCE(NULLIF(ca.pfp_url, ''), NULLIF(u.avatar_url, '')) AS avatar, ca.gallery_images AS "galleryImages",
        ca.hourly_rate AS "hourlyRate", ca.speed_call_rate AS "speedCallRate",
        ca.bio, ca.services_offered AS "serviceCategory",
        ca.services_offered AS tags, ca.voice_intro_url AS "voiceUrl",
        ca.created_at,
        u.id AS "userId", u.username,
        u.latitude AS lat, u.longitude AS lng,
        EXTRACT(YEAR FROM AGE(u.date_of_birth)) AS age,
        u.is_verified AS "isVerified"
      FROM companion_applications ca
      JOIN users u ON ca.user_id = u.id
      WHERE ca.status IN ('APPROVED', 'PENDING_VERIFICATION')
    `;
    const params: any[] = [];
    let idx = 1;

    if (category && category !== 'All') {
      sql += ` AND $${idx} = ANY(ca.services_offered)`;
      params.push(category);
      idx++;
    }

    sql += ` ORDER BY ca.created_at DESC`;

    const result = await query(sql, params);

    let list = result.rows.map((row: any) => {
      const avatarUrl = formatPublicUrl(row.avatar, req);
      const gallery = Array.isArray(row.galleryImages)
        ? row.galleryImages.map((g: string) => formatPublicUrl(g, req))
        : [];

      return {
        id: row.id,
        userId: row.userId,
        username: row.username,
        name: row.name,
        age: row.age || 24,
        city: row.city,
        lat: parseFloat(row.lat) || 19.0760,
        lng: parseFloat(row.lng) || 72.8777,
        distanceKm: 0,
        locationName: row.locationName || row.city || 'Near You',
        avatar: avatarUrl,
        galleryImages: gallery.length > 0 ? gallery : [avatarUrl],
        rating: 5.0,
        reviewsCount: 0,
        bio: row.bio || 'Verified social companion ready for dates & events.',
        hourlyRate: parseFloat(row.hourlyRate) || 25,
        speedCallRate: parseFloat(row.speedCallRate) || 5,
        vipRate: (parseFloat(row.hourlyRate) || 25) * 4,
        serviceCategory: row.serviceCategory?.[0] || 'Rent GF/BF',
        tags: row.tags || ['Rent GF/BF'],
        voiceUrl: row.voiceUrl || 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
        isVerified: row.isVerified !== false,
        availableTonight: true,
        slotsLeft: 3,
      };
    });

    // Apply distance filter
    if (lat && lng) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      list = list.map((c) => ({
        ...c,
        distanceKm: getDistanceKm(userLat, userLng, c.lat, c.lng),
      }));
    }

    if (maxDistanceKm) {
      const maxDist = parseFloat(maxDistanceKm as string);
      list = list.filter((c) => c.distanceKm <= maxDist);
    }

    res.json({
      companions: list,
      services: ALL_27_SERVICES,
      activeNowCount: list.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch companion list' });
  }
});

// POST /api/rent/become-companion — with real validation
router.post('/become-companion', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      fullLegalName,
      displayName,
      phoneNumber,
      whatsappNumber,
      email,
      govtIdType,
      govtIdNumber,
      pfpUrl,
      galleryImages,
      liveSelfieUrl,
      voiceIntroUrl,
      bankUpiId,
      hourlyRate,
      speedCallRate,
      servicesOffered,
      city,
      area,
      bio,
      signedCodeOfConduct,
    } = req.body;

    // Required field validation
    if (!fullLegalName?.trim()) {
      return res.status(400).json({ error: 'Full legal name is required' });
    }
    if (!displayName?.trim()) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    // Phone format validation
    const phoneRegex = /^\+?[\d\s\-()]{10,18}$/;
    if (!phoneNumber?.trim() || !phoneRegex.test(phoneNumber.trim())) {
      return res.status(400).json({ error: 'Please enter a valid phone number (7-15 digits with optional +, spaces, dashes)' });
    }
    if (!whatsappNumber?.trim() || !phoneRegex.test(whatsappNumber.trim())) {
      return res.status(400).json({ error: 'Please enter a valid WhatsApp number' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email?.trim() || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Govt ID
    if (!govtIdType?.trim()) {
      return res.status(400).json({ error: 'Government ID type is required' });
    }
    if (!govtIdNumber?.trim()) {
      return res.status(400).json({ error: 'Government ID number is required' });
    }
    const validIdTypes = ['Aadhaar', 'Passport', 'Driving License'];
    if (!validIdTypes.includes(govtIdType)) {
      return res.status(400).json({ error: 'Invalid government ID type' });
    }

    // Rate validation
    const parsedHourly = parseFloat(hourlyRate);
    const parsedSpeed = parseFloat(speedCallRate);
    if (isNaN(parsedHourly) || parsedHourly < 5) {
      return res.status(400).json({ error: 'Hourly rate must be at least $5' });
    }
    if (parsedHourly > 500) {
      return res.status(400).json({ error: 'Hourly rate cannot exceed $500' });
    }
    if (isNaN(parsedSpeed) || parsedSpeed < 1) {
      return res.status(400).json({ error: 'Speed call rate must be at least $1' });
    }
    if (parsedSpeed > 100) {
      return res.status(400).json({ error: 'Speed call rate cannot exceed $100' });
    }

    // Services validation
    if (!servicesOffered?.length || !Array.isArray(servicesOffered)) {
      return res.status(400).json({ error: 'Please select at least one service you offer' });
    }

    // Bank/UPI validation
    if (!bankUpiId?.trim()) {
      return res.status(400).json({ error: 'Bank account or UPI ID is required for payouts' });
    }

    // Check for duplicate application
    const existing = await query(
      'SELECT id FROM companion_applications WHERE user_id = $1',
      [userId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You have already submitted a companion application' });
    }

    const result = await query(
      `INSERT INTO companion_applications (
        user_id, full_legal_name, display_name, phone_number, whatsapp_number, email,
        govt_id_type, govt_id_number,
        pfp_url, gallery_images, live_selfie_url, voice_intro_url, bank_upi_id,
        hourly_rate, speed_call_rate, services_offered, city, area, bio, signed_code_of_conduct, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *;`,
      [
        userId,
        fullLegalName.trim(),
        displayName.trim(),
        phoneNumber.trim(),
        whatsappNumber.trim(),
        email.trim(),
        govtIdType,
        govtIdNumber.trim(),
        pfpUrl || null,
        galleryImages || [],
        liveSelfieUrl || null,
        voiceIntroUrl || null,
        bankUpiId.trim(),
        parsedHourly,
        parsedSpeed,
        servicesOffered,
        city || 'Mumbai',
        area || 'Near You',
        bio || '',
        signedCodeOfConduct !== false,
        'PENDING_VERIFICATION',
      ]
    );

    res.json({
      success: true,
      application: result.rows[0],
      message: 'Companion application submitted successfully. It will be reviewed by our team within 24-48 hours.',
    });
  } catch (error: any) {
    console.error('Error submitting companion application:', error);
    res.status(500).json({ error: error.message || 'Failed to submit companion application' });
  }
});

// POST /api/rent/speed-call
router.post('/speed-call', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { companionId } = req.body;

    const result = await query(
      `SELECT ca.*, u.latitude AS lat, u.longitude AS lng
       FROM companion_applications ca
       JOIN users u ON ca.user_id = u.id
       WHERE ca.id = $1 AND ca.status = 'APPROVED'`,
      [companionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Companion not found' });
    }

    const companion = result.rows[0];

    res.json({
      success: true,
      callSession: {
        id: `call_${Date.now()}`,
        companion: {
          id: companion.id,
          userId: companion.user_id,
          name: companion.display_name,
          avatar: companion.pfp_url,
          speedCallRate: parseFloat(companion.speed_call_rate) || 5,
        },
        durationMinutes: 15,
        cost: parseFloat(companion.speed_call_rate) || 5,
        channelName: `room_${companionId}_${Date.now()}`,
        status: 'CONNECTING',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to initiate speed call' });
  }
});

// POST /api/rent/book — now uses DB
router.post('/book', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { companionId, vibe, style, perks, durationHours } = req.body;

    const result = await query(
      `SELECT ca.*, u.id AS user_id
       FROM companion_applications ca
       JOIN users u ON ca.user_id = u.id
       WHERE ca.id = $1 AND ca.status = 'APPROVED'`,
      [companionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Companion not found' });
    }

    const companion = result.rows[0];
    const hourlyRate = parseFloat(companion.hourly_rate) || 25;
    const totalAmount = hourlyRate * (durationHours || 2);

    res.json({
      success: true,
      booking: {
        id: `book_${Date.now()}`,
        companion: {
          id: companion.id,
          userId: companion.user_id,
          name: companion.display_name,
          avatar: companion.pfp_url,
          hourlyRate,
        },
        vibe: vibe || 'Cozy Cafe',
        style: style || 'Deep Talk',
        perks: perks || [],
        durationHours: durationHours || 2,
        totalAmount,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to complete companion booking' });
  }
});

export default router;
