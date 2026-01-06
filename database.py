import sqlite3
import bcrypt
import os

DB_NAME = "gym_buddy.db"

def init_db():
    """Initialize the database with users and profiles tables."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    # Create Users table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash BLOB NOT NULL
        )
    ''')
    
    # Create Profiles table
    c.execute('''
        CREATE TABLE IF NOT EXISTS profiles (
            user_id INTEGER PRIMARY KEY,
            age INTEGER,
            weight REAL,
            height REAL,
            gender TEXT,
            goal TEXT,
            goal_weight REAL,
            level TEXT,
            tenure TEXT,
            notes TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')

    # Backward-compatible: add new columns if DB already exists
    c.execute("PRAGMA table_info(profiles)")
    existing_cols = {row[1] for row in c.fetchall()}
    desired_cols = {
        "gender": "TEXT",
        "goal": "TEXT",
        "goal_weight": "REAL",
        "notes": "TEXT",
    }
    for col, col_type in desired_cols.items():
        if col not in existing_cols:
            c.execute(f"ALTER TABLE profiles ADD COLUMN {col} {col_type}")
    
    conn.commit()
    conn.close()

def register_user(username, password):
    """Register a new user. Returns True if successful, False if username exists."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    try:
        c.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)", (username, password_hash))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def authenticate_user(username, password):
    """Verify credentials. Returns user_id if valid, None otherwise."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    c.execute("SELECT id, password_hash FROM users WHERE username = ?", (username,))
    user = c.fetchone()
    conn.close()
    
    if user:
        stored_hash = user[1]
        if bcrypt.checkpw(password.encode('utf-8'), stored_hash):
            return user[0]
    return None

def save_profile(user_id, age, weight, height, gender, goal, goal_weight, level, tenure, notes):
    """Save or update user profile."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    c.execute('''
        INSERT OR REPLACE INTO profiles (user_id, age, weight, height, gender, goal, goal_weight, level, tenure, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (user_id, age, weight, height, gender, goal, goal_weight, level, tenure, notes))
    
    conn.commit()
    conn.close()

def get_profile(user_id):
    """Get profile by user_id."""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    
    c.execute("SELECT age, weight, height, gender, goal, goal_weight, level, tenure, notes FROM profiles WHERE user_id = ?", (user_id,))
    profile = c.fetchone()
    conn.close()
    
    if profile:
        return {
            "age": profile[0],
            "weight": profile[1],
            "height": profile[2],
            "gender": profile[3],
            "goal": profile[4],
            "goal_weight": profile[5],
            "level": profile[6],
            "tenure": profile[7],
            "notes": profile[8],
        }
    return None

if __name__ == "__main__":
    init_db()
