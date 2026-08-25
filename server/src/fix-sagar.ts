import { query } from './config/database.js';

async function fixSagar() {
  try {
    const sagarRes = await query(`SELECT id, username, full_name FROM users WHERE username = 'sagar';`);
    if (sagarRes.rows.length > 0) {
      const sagarId = sagarRes.rows[0].id;

      const compRes = await query(`SELECT id FROM companion_applications WHERE user_id = $1;`, [sagarId]);
      const caId = compRes.rows[0]?.id;

      const otherUsers = await query(`SELECT id FROM users WHERE id != $1 LIMIT 5;`, [sagarId]);

      for (const other of otherUsers.rows) {
        // Add followers for sagar
        await query(`INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [
          other.id,
          sagarId,
        ]);
        if (caId) {
          await query(`INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [
            other.id,
            caId,
          ]);
        }

        // Add following for sagar
        await query(`INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [
          sagarId,
          other.id,
        ]);
      }

      console.log('Successfully inserted real database followers and following for @sagar (ID:', sagarId, ')!');
    } else {
      console.log('User sagar not found.');
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

fixSagar();
