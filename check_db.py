#!/usr/bin/env python3
import sqlite3
import os

db_path = '/app/data/tgmatrix.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("=== Accounts owner_user_id ===")
    cursor.execute('SELECT phone, owner_user_id FROM accounts')
    for row in cursor.fetchall():
        print(f"Phone: {row[0]}, Owner: {row[1]}")
    
    print("\n=== Users ===")
    cursor.execute('SELECT id, username FROM users LIMIT 10')
    for row in cursor.fetchall():
        print(f"ID: {row[0]}, Username: {row[1]}")
    
    conn.close()
else:
    print(f"Database not found: {db_path}")
