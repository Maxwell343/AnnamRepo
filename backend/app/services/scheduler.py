"""
Background Scheduler — APScheduler Jobs
────────────────────────────────────────
Runs periodic tasks:
  • mark_expired_listings_batch   — every 5 mins
  • auto_donate_abandoned_listings — every 5 mins
  • recalculate_impact_metrics    — every 10 mins

Starts automatically with the FastAPI app.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import atexit

_scheduler: BackgroundScheduler | None = None


def _job_mark_expired():
    """Wrapper for the expiry batch job."""
    try:
        from app.services.expiry_engine import mark_expired_listings_batch
        count = mark_expired_listings_batch()
        if count > 0:
            print(f"[SCHEDULER] Expired {count} listings")
    except Exception as e:
        print(f"[SCHEDULER] Error in mark_expired job: {e}")


def _job_auto_donate():
    """Wrapper for the auto-donate job."""
    try:
        from app.services.expiry_engine import auto_donate_abandoned_listings
        count = auto_donate_abandoned_listings()
        if count > 0:
            print(f"[SCHEDULER] Auto-donated {count} listings")
    except Exception as e:
        print(f"[SCHEDULER] Error in auto_donate job: {e}")


def _job_recalculate_impact():
    """Wrapper for the impact recalculation job."""
    try:
        from app.services.impact_service import recalculate_impact_metrics
        recalculate_impact_metrics()
    except Exception as e:
        print(f"[SCHEDULER] Error in impact recalc job: {e}")


def start_scheduler():
    """Initialize and start the background scheduler."""
    global _scheduler

    if _scheduler is not None:
        print("[SCHEDULER] Already running, skipping start")
        return

    _scheduler = BackgroundScheduler(daemon=True)

    # Job 1: Mark expired listings — every 5 minutes
    _scheduler.add_job(
        _job_mark_expired,
        trigger=IntervalTrigger(minutes=5),
        id="mark_expired",
        name="Mark expired listings",
        replace_existing=True,
    )

    # Job 2: Auto-donate abandoned listings — every 5 minutes
    _scheduler.add_job(
        _job_auto_donate,
        trigger=IntervalTrigger(minutes=5),
        id="auto_donate",
        name="Auto-donate abandoned listings",
        replace_existing=True,
    )

    # Job 3: Recalculate impact metrics — every 10 minutes
    _scheduler.add_job(
        _job_recalculate_impact,
        trigger=IntervalTrigger(minutes=10),
        id="recalculate_impact",
        name="Recalculate impact metrics",
        replace_existing=True,
    )

    _scheduler.start()
    print("✅ [SCHEDULER] Background scheduler started with 3 jobs")

    # Ensure clean shutdown
    atexit.register(stop_scheduler)


def stop_scheduler():
    """Stop the background scheduler gracefully."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        print("🛑 [SCHEDULER] Background scheduler stopped")
        _scheduler = None
