import os
from pathlib import Path

from routes.sensors import sensor_bp
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy


# Find the exact folder where app.py lives, then look for the .env file inside it
backend_dir = Path(__file__).resolve().parent
env_path = backend_dir / '.env'

# Explicitly load the file using its full path
# load_dotenv(dotenv_path=env_path)

# --- QUICK DIAGNOSTIC PRINT ---
# This will tell you instantly in your terminal if Python successfully found your file
if env_path.exists():
    print(f"✅ Success: Found .env file at {env_path}")
else:
    print(f"❌ Error: Cannot find .env file at {env_path}. Make sure it is inside the backend folder!")
app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///family.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

app.register_blueprint(sensor_bp)

from routes.family import family_bp, init_family_models
init_family_models(db)
app.register_blueprint(family_bp)

with app.app_context():
    db.create_all()

@app.route("/")
def home():
    return {
        "status": "OK",
        "message": "Earthquake monitoring backend is running"
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)