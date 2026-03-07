import re

def is_valid_indian_mobile(phone_number):
    """
    Validates if a phone number is a valid 10-digit Indian mobile number
    starting with 6, 7, 8, or 9.
    """
    if not phone_number:
        return False
    
    # Remove any non-digit characters (though typically we expect clean strings)
    # This handles formats like +91-XXXXXXXXXX if we ever receive them
    clean_number = re.sub(r'\D', '', str(phone_number))
    
    # Check length and starting digit
    return bool(re.match(r'^[6-9]\d{9}$', clean_number))
