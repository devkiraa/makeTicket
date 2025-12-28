import requests
import json
import base64
from datetime import datetime
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

# ===============================
# 🔐 ISU CONFIG (FILL THESE)
# ===============================
API_URL = "https://api.test.iserveu.in/transaction/status"  # fake URL

HEADER_SECRET = "TEST_HEADER_SECRET_123456"
PASS_KEY = "TEST_PASS_KEY_123456"

AES_KEY = "12345678901234567890123456789012"  # 32 chars (AES-256)
AES_IV  = "1234567890123456"                  # 16 chars


# ===============================
# 🔒 AES HELPERS
# ===============================
BLOCK_SIZE = 16

def aes_encrypt(data, key, iv):
    cipher = AES.new(key.encode(), AES.MODE_CBC, iv.encode())
    encrypted = cipher.encrypt(pad(data.encode(), BLOCK_SIZE))
    return base64.b64encode(encrypted).decode()

def aes_decrypt(data, key, iv):
    cipher = AES.new(key.encode(), AES.MODE_CBC, iv.encode())
    decrypted = unpad(cipher.decrypt(base64.b64decode(data)), BLOCK_SIZE)
    return decrypted.decode()

# ===============================
# 🧾 USER INPUT
# ===============================
client_ref_id = input("Enter UPI Transaction ID: ").strip()

payload = {
    "productCode": "UPI",
    "txnDate": datetime.utcnow().strftime("%Y-%m-%d"),
    "clientRefId": client_ref_id
}

# ===============================
# 🔐 ENCRYPT REQUEST
# ===============================
encrypted_request = aes_encrypt(json.dumps(payload), AES_KEY, AES_IV)

request_body = {
    "RequestData": encrypted_request
}

headers = {
    "Content-Type": "application/json",
    "header_secrets": HEADER_SECRET,
    "pass_key": PASS_KEY
}

# ===============================
# 📡 API CALL
# ===============================
try:
    response = requests.post(API_URL, json=request_body, headers=headers, timeout=30)
    response.raise_for_status()

    resp_json = response.json()

    print("\n===== RAW RESPONSE =====")
    print(json.dumps(resp_json, indent=2))

    if "ResponseData" in resp_json:
        decrypted = aes_decrypt(resp_json["ResponseData"], AES_KEY, AES_IV)
        print("\n===== DECRYPTED RESPONSE =====")
        print(json.dumps(json.loads(decrypted), indent=2))
    else:
        print("\n===== RESPONSE (NO ENCRYPTION) =====")
        print(json.dumps(resp_json, indent=2))

except requests.exceptions.RequestException as e:
    print("\n❌ API ERROR:", str(e))
except Exception as e:
    print("\n❌ INTERNAL ERROR:", str(e))
