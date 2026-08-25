import { query } from '../config/database.js';

async function setupAdmin() {
  const email = 'mohitdwi76@gmail.com';
  
  try {
    // Check if user exists
    const existing = await query('SELECT id, is_admin FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length === 0) {
      // Create new admin user
      const result = await query(
        `INSERT INTO users (email, full_name, username, password_hash, date_of_birth, gender, is_admin)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id, email, is_admin`,
        [email, 'Mohit Admin', 'mohit_admin', 'admin-setup', '1995-01-01', 'male']
      );
      console.log('Admin user created:', result.rows[0]);
    } else {
      // Promote existing user to admin
      await query('UPDATE users SET is_admin = true WHERE email = $1', [email]);
      console.log('User promoted to admin:', email);
    }
    
    console.log('Admin setup complete!');
    console.log('Login at: http://localhost:3000/admin');
    console.log('Email:', email);
    console.log('Password: Mohit@7509193904');
  } catch (error) {
    console.error('Error setting up admin:', error);
  } finally {
    process.exit(0);
  }
}

setupAdmin();
