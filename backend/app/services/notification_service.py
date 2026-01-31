"""
Notification Service for SMS and WhatsApp messaging
Uses Twilio API for sending messages
"""

import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")  # For SMS
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")  # Twilio sandbox default

# Initialize Twilio client
twilio_client = None

def get_twilio_client():
    """Get or create Twilio client"""
    global twilio_client
    if twilio_client is None:
        try:
            from twilio.rest import Client
            if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
                twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            else:
                print("[WARNING] Twilio credentials not configured")
        except ImportError:
            print("[WARNING] Twilio library not installed. Run: pip install twilio")
    return twilio_client


def format_phone_number(phone: str, country_code: str = "+91") -> str:
    """Format phone number with country code"""
    # Remove spaces, dashes, and other characters
    phone = ''.join(filter(str.isdigit, phone))
    
    # Remove leading zeros
    phone = phone.lstrip('0')
    
    # If already has country code digits, check and format
    if len(phone) > 10:
        # Assume it already includes country code
        return f"+{phone}"
    
    # Add country code
    return f"{country_code}{phone}"


def send_sms(
    to_phone: str,
    message: str,
    country_code: str = "+91"
) -> dict:
    """
    Send SMS to a phone number
    
    Args:
        to_phone: Recipient's phone number
        message: Message content
        country_code: Country code (default: +91 for India)
    
    Returns:
        dict with status and message_sid or error
    """
    client = get_twilio_client()
    
    if not client:
        return {
            "success": False,
            "error": "Twilio client not configured. Check your credentials."
        }
    
    if not TWILIO_PHONE_NUMBER:
        return {
            "success": False,
            "error": "Twilio phone number not configured"
        }
    
    try:
        formatted_phone = format_phone_number(to_phone, country_code)
        
        message_response = client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_phone
        )
        
        return {
            "success": True,
            "message_sid": message_response.sid,
            "status": message_response.status
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def send_whatsapp(
    to_phone: str,
    message: str,
    country_code: str = "+91"
) -> dict:
    """
    Send WhatsApp message to a phone number
    
    Args:
        to_phone: Recipient's phone number
        message: Message content
        country_code: Country code (default: +91 for India)
    
    Returns:
        dict with status and message_sid or error
    """
    client = get_twilio_client()
    
    if not client:
        return {
            "success": False,
            "error": "Twilio client not configured. Check your credentials."
        }
    
    try:
        formatted_phone = format_phone_number(to_phone, country_code)
        
        message_response = client.messages.create(
            body=message,
            from_=TWILIO_WHATSAPP_NUMBER,
            to=f"whatsapp:{formatted_phone}"
        )
        
        return {
            "success": True,
            "message_sid": message_response.sid,
            "status": message_response.status
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def send_notification(
    to_phone: str,
    message: str,
    notification_type: str = "both",
    country_code: str = "+91"
) -> dict:
    """
    Send notification via SMS, WhatsApp, or both
    
    Args:
        to_phone: Recipient's phone number
        message: Message content
        notification_type: "sms", "whatsapp", or "both"
        country_code: Country code (default: +91 for India)
    
    Returns:
        dict with results for each channel
    """
    results = {}
    
    if notification_type in ["sms", "both"]:
        results["sms"] = send_sms(to_phone, message, country_code)
    
    if notification_type in ["whatsapp", "both"]:
        results["whatsapp"] = send_whatsapp(to_phone, message, country_code)
    
    return results


# Pre-defined notification templates
NOTIFICATION_TEMPLATES = {
    "welcome": "Welcome to ANNAM! 🌾 Thank you for joining our mission to reduce food waste and help those in need.",
    
    "new_listing": "New food listing available near you! 🍎 Check the ANNAM app for details.",
    
    "pickup_scheduled": "Your pickup has been scheduled! 🚗 A driver will collect the food soon.",
    
    "pickup_completed": "Pickup completed! ✅ Thank you for your contribution to reducing food waste.",
    
    "delivery_started": "Your delivery is on the way! 🚚 Track it in the ANNAM app.",
    
    "delivery_completed": "Delivery completed! 🎉 Thank you for helping feed those in need.",
    
    "donation_received": "Thank you for your generous donation! 💚 Your contribution helps us feed more people.",
    
    "otp_verification": "Your ANNAM verification code is: {otp}. Valid for 10 minutes.",
    
    "password_reset": "Your password reset code is: {code}. Valid for 15 minutes.",
}


def send_template_notification(
    to_phone: str,
    template_name: str,
    notification_type: str = "both",
    country_code: str = "+91",
    **template_vars
) -> dict:
    """
    Send a pre-defined template notification
    
    Args:
        to_phone: Recipient's phone number
        template_name: Name of the template to use
        notification_type: "sms", "whatsapp", or "both"
        country_code: Country code
        **template_vars: Variables to substitute in the template
    
    Returns:
        dict with results
    """
    if template_name not in NOTIFICATION_TEMPLATES:
        return {
            "success": False,
            "error": f"Template '{template_name}' not found"
        }
    
    message = NOTIFICATION_TEMPLATES[template_name].format(**template_vars)
    return send_notification(to_phone, message, notification_type, country_code)
