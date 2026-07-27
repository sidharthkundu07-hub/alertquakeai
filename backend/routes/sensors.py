import os
import time
from threading import Lock

from flask import Blueprint, jsonify, request
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

sensor_bp = Blueprint("sensor", __name__)

# ---------------------------------------------------------------------------
# Twilio setup — ONE client, credentials read from environment variables only.
# Set these before running the server (e.g. in a .env file loaded via
# python-dotenv, or exported in your shell / hosting platform's config):
#
#   TWILIO_ACCOUNT_SID=xxxxxxxx
#   TWILIO_AUTH_TOKEN=xxxxxxxx
#   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
#   TWILIO_WHATSAPP_TO=whatsapp:+917003919438
#   TWILIO_SMS_FROM=+14783162210
#   TWILIO_SMS_TO=+919993522071
#
# Never hardcode real values here — that's what triggered GitHub's block.
# ---------------------------------------------------------------------------
TWILIO_ACCOUNT_SID = os.environ.get("AC006d3c35c2b16f01bcfc49621dff7c86")
TWILIO_AUTH_TOKEN = os.environ.get("5717bc1c7a6f0718fed3167da6bf3d51")
TWILIO_WHATSAPP_FROM = os.environ.get("+14155238886", "whatsapp:+14155238886")
TWILIO_WHATSAPP_TO = os.environ.get("+917003919438")
TWILIO_SMS_FROM = os.environ.get("+14783162210")
TWILIO_SMS_TO = os.environ.get("+919993522071")

_twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
else:
    print("[alerts] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set — alerts disabled.")

ALERT_MESSAGE = (
    "🚨 RED ALERT!\n\n"
    "AlertQuake AI has detected possible earthquake activity.\n\n"
    "In case of an EMERGENCY dial 112."
)


def send_whatsapp_alert():
    if not _twilio_client or not TWILIO_WHATSAPP_TO:
        return
    try:
        _twilio_client.messages.create(
            body=ALERT_MESSAGE,
            from_=TWILIO_WHATSAPP_FROM,
            to=TWILIO_WHATSAPP_TO,
        )
    except TwilioRestException as e:
        print(f"[alerts] WhatsApp alert failed: {e}")


def send_sms_alert():
    if not _twilio_client or not TWILIO_SMS_FROM or not TWILIO_SMS_TO:
        return
    try:
        _twilio_client.messages.create(
            body=ALERT_MESSAGE,
            from_=TWILIO_SMS_FROM,
            to=TWILIO_SMS_TO,
        )
    except TwilioRestException as e:
        print(f"[alerts] SMS alert failed: {e}")


# ---------------------------------------------------------------------------
# Sensor state
# ---------------------------------------------------------------------------
_lock = Lock()
data = {
    "vib": 20.05,
    "tilt": 0.25,
    "seis": 2.2,
    "temp": 28.0,
    "hum": 68.0,
    "pres": 1008.0,
    "gas": 320,
    "soil": 70.0,
    "dist": 12.0,
}
_last_esp32_update = None  # timestamp of the last real POST from the ESP32
DEMO_FALLBACK_TIMEOUT = 15  # seconds without real data before we simulate demo values

# Tune these to whatever actually counts as "earthquake-like" for your sensors
RISK_THRESHOLDS = {
    "vib": 25.0,
    "tilt": 3.0,
    "seis": 6.0,
}
ALERT_COOLDOWN_SECONDS = 300  # don't re-send alerts more than once every 5 min
_alert_cooldown_until = 0.0


def _maybe_send_alert(reading):
    """Only ever called with REAL sensor readings from the ESP32, and only
    fires when a threshold is actually crossed — never on server startup."""
    global _alert_cooldown_until
    now = time.time()
    is_high_risk = (
        reading["vib"] >= RISK_THRESHOLDS["vib"]
        or reading["tilt"] >= RISK_THRESHOLDS["tilt"]
        or reading["seis"] >= RISK_THRESHOLDS["seis"]
    )
    if is_high_risk and now >= _alert_cooldown_until:
        send_whatsapp_alert()
        send_sms_alert()
        _alert_cooldown_until = now + ALERT_COOLDOWN_SECONDS


@sensor_bp.route("/api/sensor", methods=["POST"])
def receive_sensor_data():
    """The ESP32 posts real readings here, e.g.:
    { "vib": 21.4, "tilt": 0.31, "seis": 2.8, "temp": 27.9, ... }
    Only the keys present in the payload are updated; missing/invalid keys
    are left untouched instead of silently randomized."""
    global _last_esp32_update

    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "expected a JSON body"}), 400

    with _lock:
        for key in data:
            if key in payload:
                try:
                    data[key] = int(payload[key]) if key == "gas" else float(payload[key])
                except (TypeError, ValueError):
                    continue
        _last_esp32_update = time.time()
        snapshot = dict(data)

    _maybe_send_alert(snapshot)
    return jsonify(snapshot)


@sensor_bp.route("/api/sensor", methods=["GET"])
def get_sensor_data():
    """The dashboard reads current readings here. Serves real ESP32 data
    whenever it's arrived within the last DEMO_FALLBACK_TIMEOUT seconds;
    otherwise falls back to a smooth simulated walk so the UI still has
    something to show while no hardware is connected. Demo mode NEVER
    triggers an alert."""
    with _lock:
        is_live = (
            _last_esp32_update is not None
            and (time.time() - _last_esp32_update) < DEMO_FALLBACK_TIMEOUT
        )

        if not is_live:
            import random  # local import: only needed in demo/simulation mode

            data["vib"] = round(data["vib"] + random.uniform(-0.2, 0.2), 2)
            data["tilt"] = round(data["tilt"] + random.uniform(-0.02, 0.02), 2)
            data["seis"] = round(data["seis"] + random.uniform(-0.10, 0.10), 2)
            data["temp"] = round(data["temp"] + random.uniform(-0.10, 0.10), 1)
            data["hum"] = round(data["hum"] + random.uniform(-0.30, 0.30), 1)
            data["pres"] = round(data["pres"] + random.uniform(-0.20, 0.20), 1)
            data["gas"] = int(data["gas"] + random.uniform(-2, 2))
            data["soil"] = round(data["soil"] + random.uniform(-1.0, 1.0), 1)
            data["dist"] = round(data["dist"] + random.uniform(-0.30, 0.30), 1)

            data["vib"] = max(0, min(30, data["vib"]))
            data["tilt"] = max(0, min(5, data["tilt"]))
            data["seis"] = max(0, min(8, data["seis"]))
            data["temp"] = max(20, min(45, data["temp"]))
            data["hum"] = max(30, min(100, data["hum"]))
            data["pres"] = max(980, min(1030, data["pres"]))
            data["gas"] = max(200, min(700, data["gas"]))
            data["soil"] = max(0, min(400, data["soil"]))
            data["dist"] = max(0, min(100, data["dist"]))

        snapshot = dict(data)
        snapshot["source"] = "live" if is_live else "demo"

    return jsonify(snapshot)