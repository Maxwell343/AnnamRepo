"""Compatibility entrypoint.

Use this module if you run the backend as `uvicorn main:app` from the `backend/` folder.
It re-exports the full FastAPI app defined in `app/main.py`.
"""

from app.main import app
