import { query } from './config/database.js';

async function check() {
  try {
    const users = await query(`SELECT id, email, username, full_name FROM users;`);
    console.log('--- ALL USERS IN DB ---');
    console.table(users.rows);

    const follows = await query(`SELECT * FROM follows;`);
    console.log('--- ALL FOLLOWS IN DB ---');
    console.table(follows.rows);

    const companionApps = await query(`SELECT id, user_id, display_name FROM companion_applications;`);
    console.log('--- ALL COMPANION APPS IN DB ---');
    console.table(companionApps.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

check();
