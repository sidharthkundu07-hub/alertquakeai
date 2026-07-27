from routes.sensors import sensor_bp
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

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