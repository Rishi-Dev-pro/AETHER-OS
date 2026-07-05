import sys
import io
from datetime import datetime, timezone

# Force stdout to use UTF-8 encoding on Windows to prevent UnicodeEncodeError
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_iso_timestamp():
    return datetime.now(timezone.utc).isoformat()

def log_success(message):
    print(f"✓ {message}", flush=True)

def log_info(message):
    print(f"[INFO] {message}", flush=True)

def log_error(message):
    print(f"[ERROR] {message}", flush=True)

def log_warning(message):
    print(f"[WARNING] {message}", flush=True)
