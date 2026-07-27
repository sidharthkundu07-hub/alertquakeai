from twilio.rest import Client
from flask import Blueprint, jsonify
import random

ACCOUNT_SID = "AC006d3c35c2b16f01bcfc49621dff7c86"
AUTH_TOKEN = "5717bc1c7a6f0718fed3167da6bf3d51"

client = Client("AC006d3c35c2b16f01bcfc49621dff7c86", "5717bc1c7a6f0718fed3167da6bf3d51")

def send_whatsapp_alert():

    client.messages.create(

        body="""🚨 RED ALERT!

NTS AI has detected possible earthquake activity.

In case of an EMERGENCY dial 112.""",
        from_="whatsapp:+14155238886",

        to="whatsapp:+917003919438"

    )
sensor_bp = Blueprint("sensor", __name__)

# Initial values
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

@sensor_bp.route("/api/sensor", methods=["GET", "POST"])
def get_sensor_data():
    global data

    # Smoothly change values
    data["vib"] = round(data["vib"] + random.uniform(-0.2, 0.2), 2)
    data["tilt"] = round(data["tilt"] + random.uniform(-0.02, 0.02), 2)
    data["seis"] = round(data["seis"] + random.uniform(-0.10, 0.10), 2)
    data["temp"] = round(data["temp"] + random.uniform(-0.10, 0.10), 1)
    data["hum"] = round(data["hum"] + random.uniform(-0.30, 0.30), 1)
    data["pres"] = round(data["pres"] + random.uniform(-0.20, 0.20), 1)
    data["gas"] = int(data["gas"] + random.uniform(-2, 2))
    data["soil"] = round(data["soil"] + random.uniform(-1.0, 1.0), 1)
    data["dist"] = round(data["dist"] + random.uniform(-0.30, 0.30), 1)

    # Keep values in realistic ranges
    data["vib"] = max(0, min(30, data["vib"]))
    data["tilt"] = max(0, min(5, data["tilt"]))
    data["seis"] = max(0, min(8, data["seis"]))
    data["temp"] = max(20, min(45, data["temp"]))
    data["hum"] = max(30, min(100, data["hum"]))
    data["pres"] = max(980, min(1030, data["pres"]))
    data["gas"] = max(200, min(700, data["gas"]))
    data["soil"] = max(0, min(400, data["soil"]))
    data["dist"] = max(0, min(100, data["dist"]))

    return jsonify(data)

send_whatsapp_alert()

# def send_sms_alert():

#     client.messages.create(

#         body="""🚨 RED ALERT!

# NTS AI has detected possible earthquake activity.

# In case of an EMERGENCY dial 112.""",

#         from_="+14783162210",

#         to="+919993522071"

#     )

#     send_sms_alert

from twilio.rest import Client
account_sid = 'ACa07f25dd63cffb3b7b6e9f3fc2e7b7ab'
auth_token = '22925b6605eb09af10288949a7125c72'
client = Client(account_sid, auth_token)
message = client.messages.create(
  from_='+14783162210',
  body='''RED Alert!
NTS AI has detected possible earthquake activity. Take cover immediately.
Incase of an EMERGENCY dial 112.''',
  to='+919993522071'
)
print(message.sid)