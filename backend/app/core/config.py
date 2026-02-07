import os
from pathlib import Path
from dotenv import load_dotenv

_this_file = Path(__file__).resolve()
_backend_dir = _this_file.parents[2]  # .../backend
_repo_root = _this_file.parents[3]    # .../AnnamRepo

# Prefer backend/.env, then repo-root .env, then normal env
load_dotenv(dotenv_path=_backend_dir / ".env", override=False)
load_dotenv(dotenv_path=_repo_root / ".env", override=False)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "annam")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
