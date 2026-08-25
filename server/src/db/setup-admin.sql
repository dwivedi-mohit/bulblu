-- Setup admin user for Bulblu
-- Run this after npm run db:setup

-- First, check if the user exists
DO $$
BEGIN
  -- If user doesn't exist, create them
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'mohitdwi76@gmail.com') THEN
    INSERT INTO users (email, full_name, username, password_hash, date_of_birth, gender, is_admin)
    VALUES (
      'mohitdwi76@gmail.com',
      'Mohit Admin',
      'mohit_admin',
      'admin-password-hash',
      '1995-01-01',
      'male',
      true
    );
    RAISE NOTICE 'Admin user created successfully';
  ELSE
    -- If user exists, make them admin
    UPDATE users SET is_admin = true WHERE email = 'mohitdwi76@gmail.com';
    RAISE NOTICE 'User promoted to admin';
  END IF;
END $$;
