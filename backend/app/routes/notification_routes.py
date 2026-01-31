"""
Notification Routes for sending SMS and WhatsApp messages
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
from app.services.notification_service import (
    send_sms,
    send_whatsapp,
    send_notification,
    send_template_notification,
    NOTIFICATION_TEMPLATES
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


class SMSRequest(BaseModel):
    phone: str
    message: str
    country_code: Optional[str] = "+91"


class WhatsAppRequest(BaseModel):
    phone: str
    message: str
    country_code: Optional[str] = "+91"


class NotificationRequest(BaseModel):
    phone: str
    message: str
    notification_type: Literal["sms", "whatsapp", "both"] = "whatsapp"
    country_code: Optional[str] = "+91"


class TemplateNotificationRequest(BaseModel):
    phone: str
    template_name: str
    notification_type: Literal["sms", "whatsapp", "both"] = "whatsapp"
    country_code: Optional[str] = "+91"
    template_vars: Optional[dict] = {}


@router.post("/sms")
def send_sms_notification(request: SMSRequest):
    """Send an SMS notification"""
    result = send_sms(
        to_phone=request.phone,
        message=request.message,
        country_code=request.country_code
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return {
        "message": "SMS sent successfully",
        "data": result
    }


@router.post("/whatsapp")
def send_whatsapp_notification(request: WhatsAppRequest):
    """Send a WhatsApp notification"""
    result = send_whatsapp(
        to_phone=request.phone,
        message=request.message,
        country_code=request.country_code
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return {
        "message": "WhatsApp message sent successfully",
        "data": result
    }


@router.post("/send")
def send_multi_notification(request: NotificationRequest):
    """Send notification via SMS, WhatsApp, or both"""
    result = send_notification(
        to_phone=request.phone,
        message=request.message,
        notification_type=request.notification_type,
        country_code=request.country_code
    )
    
    return {
        "message": f"Notification sent via {request.notification_type}",
        "data": result
    }


@router.post("/template")
def send_template(request: TemplateNotificationRequest):
    """Send a pre-defined template notification"""
    result = send_template_notification(
        to_phone=request.phone,
        template_name=request.template_name,
        notification_type=request.notification_type,
        country_code=request.country_code,
        **request.template_vars
    )
    
    if "error" in result and not result.get("success", True):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {
        "message": f"Template notification sent",
        "data": result
    }


@router.get("/templates")
def get_available_templates():
    """Get list of available notification templates"""
    return {
        "templates": list(NOTIFICATION_TEMPLATES.keys()),
        "details": NOTIFICATION_TEMPLATES
    }


# Convenience endpoints for common notifications
@router.post("/welcome/{phone}")
def send_welcome_notification(phone: str, notification_type: str = "whatsapp"):
    """Send welcome notification to new user"""
    result = send_template_notification(
        to_phone=phone,
        template_name="welcome",
        notification_type=notification_type
    )
    return {"message": "Welcome notification sent", "data": result}


@router.post("/pickup-scheduled/{phone}")
def send_pickup_scheduled_notification(phone: str, notification_type: str = "whatsapp"):
    """Send pickup scheduled notification"""
    result = send_template_notification(
        to_phone=phone,
        template_name="pickup_scheduled",
        notification_type=notification_type
    )
    return {"message": "Pickup scheduled notification sent", "data": result}


@router.post("/delivery-completed/{phone}")
def send_delivery_completed_notification(phone: str, notification_type: str = "whatsapp"):
    """Send delivery completed notification"""
    result = send_template_notification(
        to_phone=phone,
        template_name="delivery_completed",
        notification_type=notification_type
    )
    return {"message": "Delivery completed notification sent", "data": result}
