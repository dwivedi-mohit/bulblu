import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setup() {
  console.log('Setting up bulblu database...');
  
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  
  try {
    await pool.query(schema);
    console.log('Schema created successfully!');
  } catch (err) {
    console.error('Error creating schema:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
  
  console.log('Database setup complete!');
  process.exit(0);
}

setup();
