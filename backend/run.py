import os
from dotenv import load_dotenv
from pathlib import Path

# Explicitly load .env from the backend directory
env_path = Path(__file__).parent / '.env'
load_dotenv(env_path)

from app import create_app

app = create_app()

if __name__ == "__main__":
    # Log the database host on startup (masked for security)
    db_url = os.getenv("DATABASE_URL", "")
    try:
        host = db_url.split("@")[1].split("/")[0]
        print(f" * Connecting to Database: {host}")
    except Exception:
        print(" * Connecting to Database: [Local/Default]")
        
    app.run(debug=True, host="0.0.0.0", port=5001)
