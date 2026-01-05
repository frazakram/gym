import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { User, Profile } from '@/types';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase connection
  },
});

export async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        age INTEGER,
        weight DECIMAL(5,2),
        height DECIMAL(5,2),
        level VARCHAR(50),
        tenure TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL
      );
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export async function createUser(username: string, password: string): Promise<User | null> {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query<User>(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, password_hash, created_at`,
      [username, hashedPassword]
    );
    return result.rows[0] || null;
  } catch (error: any) {
    if (error.code === '23505') {
      return null;
    }
    throw error;
  }
}

export async function authenticateUser(username: string, password: string): Promise<number | null> {
  try {
    const result = await pool.query<User>(
      'SELECT id, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    return isValid ? user.id : null;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function getProfile(userId: number): Promise<Profile | null> {
  try {
    const result = await pool.query<Profile>(
      'SELECT * FROM profiles WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

export async function saveProfile(
  userId: number,
  age: number,
  weight: number,
  height: number,
  level: string,
  tenure: string
): Promise<Profile | null> {
  try {
    const existing = await getProfile(userId);

    if (existing) {
      const result = await pool.query<Profile>(
        `UPDATE profiles 
         SET age = $2, weight = $3, height = $4, 
             level = $5, tenure = $6, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING *`,
        [userId, age, weight, height, level, tenure]
      );
      return result.rows[0] || null;
    } else {
      const result = await pool.query<Profile>(
        `INSERT INTO profiles (user_id, age, weight, height, level, tenure)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, age, weight, height, level, tenure]
      );
      return result.rows[0] || null;
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    return null;
  }
}
