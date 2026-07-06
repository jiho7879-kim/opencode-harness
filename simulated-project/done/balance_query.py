import sqlite3
import re

def query_user_balance_markdown(user_id: str):
    """
    Queries user balance from SQLite sandbox database.
    Outputs results in robust markdown table.
    """
    if not re.match(r"^[a-zA-Z0-9-]{3,12}$", user_id):
        raise ValueError("Malicious Input Detected! Rejected.")

    try:
        conn = sqlite3.connect("./balance.db", timeout=10)
        cursor = conn.cursor()
        
        # Init SQLite table structure
        cursor.execute("CREATE TABLE IF NOT EXISTS balances (usr_id TEXT PRIMARY KEY, amt REAL)")
        cursor.execute("INSERT OR IGNORE INTO balances (usr_id, amt) VALUES ('usr-9901', 42000.50)")
        conn.commit()
        
        cursor.execute("SELECT amt FROM balances WHERE usr_id = ?", (user_id,))
        result = cursor.fetchone()
        
        # Output as neat markdown table
        print("| Customer ID | Balance |")
        print("|---|---|")
        if result:
            print(f"| {user_id} | ${result[0]:,.2f} |")
        else:
            print(f"| {user_id} | $0.00 |")
            
    except sqlite3.Error as e:
        print(f"Error querying SQLite: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    query_user_balance_markdown("usr-9901")
