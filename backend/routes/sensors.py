import os
import time
from threading import Lock

from flask import Blueprint, jsonify, request
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

sensor_bp = Blueprint("sensor", __name__)

# ---------------------------------------------------------------------------
# Global Alert Content
# ---------------------------------------------------------------------------
ALERT_MESSAGE = (
    "🚨 RED ALERT!\n\n"
    "AlertQuake AI has detected possible earthquake activity.\n\n"
    "In case of an EMERGENCY dial 112."
)

# ---------------------------------------------------------------------------
# Twilio Account Configurations (Hardcoded Production Access)
# ---------------------------------------------------------------------------

# --- WhatsApp account ---
WHATSAPP_SID = "AC006d3c35c2b16f01bcfc49621dff7c86"
WHATSAPP_TOKEN = "c0bcbf3045dbb676e08b222e82899f29"
WHATSAPP_FROM = "whatsapp:+14155238886"
WHATSAPP_TO = "whatsapp:+917003919438"

# --- SMS account ---
SMS_SID = "ACa07f25dd63cffb3b7b6e9f3fc2e7b7ab"
SMS_TOKEN = "09694b31a7a041d5f01c58ab8fb48cab"
SMS_FROM = "+14783162210"
SMS_TO = "+919993522071"

# ---------------------------------------------------------------------------
# Twilio API Client Initializations
# ---------------------------------------------------------------------------
_whatsapp_client = None
_sms_client = None

# Initialize SMS
if SMS_SID and SMS_TOKEN:
    _sms_client = Client(SMS_SID, SMS_TOKEN)
    print("✅ Twilio SMS Client initialized successfully!")
else:
    print("[alerts] TWILIO_SMS_SID / TWILIO_SMS_TOKEN not set — SMS alerts disabled.")

# Initialize WhatsApp
if WHATSAPP_SID and WHATSAPP_TOKEN:
    _whatsapp_client = Client(WHATSAPP_SID, WHATSAPP_TOKEN)
    print("✅ Twilio WhatsApp Client initialized successfully!")
else:
    print("[alerts] TWILIO_WHATSAPP_SID / TWILIO_WHATSAPP_TOKEN not set — WhatsApp alerts disabled.")

# ---------------------------------------------------------------------------
# Dispatch Logic Functions
# ---------------------------------------------------------------------------
def send_whatsapp_alert():
    if not _whatsapp_client or not WHATSAPP_TO:
        print("[alerts] WhatsApp skipped: client or TO number missing.")
        return
    try:
        msg = _whatsapp_client.messages.create(
            body=ALERT_MESSAGE,
            from_=WHATSAPP_FROM,
            to=WHATSAPP_TO,
        )
        print(f"[alerts] WhatsApp sent successfully! SID: {msg.sid}")
    except TwilioRestException as e:
        print(f"[alerts] WhatsApp alert failed: {e}")


def send_sms_alert():
    if not _sms_client or not SMS_FROM or not SMS_TO:
        print("[alerts] SMS skipped: client or FROM/TO number missing.")
        return
    try:
        msg = _sms_client.messages.create(
            body=ALERT_MESSAGE,
            from_=SMS_FROM,
            to=SMS_TO,
        )
        print(f"[alerts] SMS sent successfully! SID: {msg.sid}")
    except TwilioRestException as e:
        print(f"[alerts] SMS alert failed: {e}")

# ---------------------------------------------------------------------------
# Live Sensor Matrix State
# ---------------------------------------------------------------------------
_lock = Lock()
data = {
    "vib": 26.05,
    "tilt": 0.25,
    "seis": 2.2,
    "temp": 28.0,
    "hum": 68.0,
    "pres": 1008.0,
    "gas": 320,
    "soil": 70.0,
    "dist": 12.0,
}
_last_esp32_update = None
DEMO_FALLBACK_TIMEOUT = 15

RISK_THRESHOLDS = {
    "vib": 25.0,
    "tilt": 3.0,
    "seis": 6.0,
}
ALERT_COOLDOWN_SECONDS = 300
_alert_cooldown_until = 0.0


def _maybe_send_alert(reading):
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
    with _lock:
        is_live = (
            _last_esp32_update is not None
            and (time.time() - _last_esp32_update) < DEMO_FALLBACK_TIMEOUT
        )

        if not is_live:
            import random

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


@sensor_bp.route("/api/test-alert", methods=["GET"])
def test_alert():
    """Manual direct routing trigger verification endpoint"""
    send_whatsapp_alert()
    send_sms_alert()
    return jsonify({"status": "test alert dispatched — check Render logs for delivery result"})