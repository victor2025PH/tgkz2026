"""
TG-Matrix Input Validators
Provides validation functions for various data types and inputs
"""
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime


class ValidationError(Exception):
    """Custom exception for validation errors"""
    def __init__(self, field: str, message: str, value: Any = None):
        self.field = field
        self.message = message
        self.value = value
        super().__init__(f"{field}: {message}")


class Validator:
    """Base validator class with common validation methods"""
    
    @staticmethod
    def validate_required(value: Any, field_name: str) -> None:
        """Validate that a required field is not empty"""
        if value is None or (isinstance(value, str) and not value.strip()):
            raise ValidationError(field_name, f"{field_name} is required")
    
    @staticmethod
    def validate_string_length(value: str, field_name: str, min_length: int = 0, max_length: int = None) -> None:
        """Validate string length"""
        if not isinstance(value, str):
            raise ValidationError(field_name, f"{field_name} must be a string")
        
        if len(value) < min_length:
            raise ValidationError(field_name, f"{field_name} must be at least {min_length} characters")
        
        if max_length and len(value) > max_length:
            raise ValidationError(field_name, f"{field_name} must be at most {max_length} characters")
    
    @staticmethod
    def validate_integer_range(value: Any, field_name: str, min_value: int = None, max_value: int = None) -> None:
        """Validate integer range"""
        if not isinstance(value, int):
            try:
                value = int(value)
            except (ValueError, TypeError):
                raise ValidationError(field_name, f"{field_name} must be an integer")
        
        if min_value is not None and value < min_value:
            raise ValidationError(field_name, f"{field_name} must be at least {min_value}")
        
        if max_value is not None and value > max_value:
            raise ValidationError(field_name, f"{field_name} must be at most {max_value}")


class AccountValidator(Validator):
    """Validator for Telegram account data"""
    
    # Phone number regex: + followed by 1-15 digits
    PHONE_REGEX = re.compile(r'^\+\d{1,15}$')
    
    # API ID should be a positive integer
    API_ID_REGEX = re.compile(r'^\d+$')
    
    # API Hash should be 32 character hexadecimal string
    API_HASH_REGEX = re.compile(r'^[a-fA-F0-9]{32}$')
    
    # Proxy format: protocol://host:port or protocol://user:pass@host:port
    PROXY_REGEX = re.compile(r'^(socks5|http|https)://([^:]+(:[^@]+)?@)?[^:]+(:\d+)?$')
    
    @classmethod
    def validate_phone(cls, phone: str) -> Tuple[bool, Optional[str]]:
        """
        Validate phone number format
        
        Returns:
            (is_valid, error_message)
        """
        if not phone:
            return False, "Phone number is required"
        
        # Remove spaces, dashes, and parentheses before validation
        import re as re_module
        phone = re_module.sub(r'[\s\-\(\)]', '', phone.strip())
        
        if not cls.PHONE_REGEX.match(phone):
            return False, "Phone number must be in format +1234567890 (with country code)"
        
        if len(phone) < 8 or len(phone) > 16:
            return False, "Phone number must be between 8 and 16 characters"
        
        return True, None
    
    @classmethod
    def validate_api_id(cls, api_id: str) -> Tuple[bool, Optional[str]]:
        """
        Validate API ID format
        
        Returns:
            (is_valid, error_message)
        """
        if not api_id:
            return False, "API ID is required"
        
        api_id = str(api_id).strip()
        
        if not cls.API_ID_REGEX.match(api_id):
            return False, "API ID must be a positive integer"
        
        try:
            api_id_int = int(api_id)
            if api_id_int <= 0:
                return False, "API ID must be a positive integer"
        except ValueError:
            return False, "API ID must be a valid integer"
        
        return True, None
    
    @classmethod
    def validate_api_hash(cls, api_hash: str) -> Tuple[bool, Optional[str]]:
        """
        Validate API Hash format
        
        Returns:
            (is_valid, error_message)
        """
        if not api_hash:
            return False, "API Hash is required"
        
        api_hash = api_hash.strip()
        
        if not cls.API_HASH_REGEX.match(api_hash):
            return False, "API Hash must be a 32-character hexadecimal string"
        
        return True, None
    
    @classmethod
    def validate_proxy(cls, proxy: str) -> Tuple[bool, Optional[str]]:
        """
        Validate proxy format (optional)
        
        Returns:
            (is_valid, error_message)
        """
        if not proxy:
            return True, None  # Proxy is optional
        
        proxy = proxy.strip()
        
        # 'auto' 表示後端自動分配代理，視為有效
        if proxy.lower() == 'auto':
            return True, None
        
        if not cls.PROXY_REGEX.match(proxy):
            return False, "Proxy must be in format: socks5://host:port or http://host:port or https://host:port"
        
        return True, None
    
    @classmethod
    def validate_account_data(cls, account_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate complete account data
        
        Returns:
            (is_valid, list_of_errors)
        """
        errors = []
        
        # Validate phone
        phone = account_data.get('phone', '')
        is_valid, error = cls.validate_phone(phone)
        if not is_valid:
            errors.append(error)
        
        # Validate API ID
        api_id = account_data.get('apiId', '')
        is_valid, error = cls.validate_api_id(api_id)
        if not is_valid:
            errors.append(error)
        
        # Validate API Hash
        api_hash = account_data.get('apiHash', '')
        is_valid, error = cls.validate_api_hash(api_hash)
        if not is_valid:
            errors.append(error)
        
        # Validate proxy (optional)
        proxy = account_data.get('proxy', '')
        if proxy:
            is_valid, error = cls.validate_proxy(proxy)
            if not is_valid:
                errors.append(error)
        
        # Validate daily send limit
        daily_send_limit = account_data.get('dailySendLimit')
        if daily_send_limit is not None:
            try:
                limit = int(daily_send_limit)
                if limit < 0:
                    errors.append("Daily send limit must be a non-negative integer")
                if limit > 10000:
                    errors.append("Daily send limit should not exceed 10000")
            except (ValueError, TypeError):
                errors.append("Daily send limit must be a valid integer")
        
        # Validate health score
        health_score = account_data.get('healthScore')
        if health_score is not None:
            try:
                score = int(health_score)
                if score < 0 or score > 100:
                    errors.append("Health score must be between 0 and 100")
            except (ValueError, TypeError):
                errors.append("Health score must be a valid integer")
        
        return len(errors) == 0, errors


class KeywordValidator(Validator):
    """Validator for keywords and keyword sets"""
    
    MAX_KEYWORD_LENGTH = 200
    MAX_KEYWORD_SET_NAME_LENGTH = 100
    
    @classmethod
    def validate_keyword(cls, keyword: str, is_regex: bool = False) -> Tuple[bool, Optional[str]]:
        """
        Validate keyword format
        
        Returns:
            (is_valid, error_message)
        """
        if not keyword:
            return False, "Keyword is required"
        
        keyword = keyword.strip()
        
        if len(keyword) > cls.MAX_KEYWORD_LENGTH:
            return False, f"Keyword must be at most {cls.MAX_KEYWORD_LENGTH} characters"
        
        if is_regex:
            # Validate regex syntax
            try:
                re.compile(keyword)
            except re.error as e:
                return False, f"Invalid regex pattern: {str(e)}"
        
        return True, None
    
    @classmethod
    def validate_keyword_set_name(cls, name: str) -> Tuple[bool, Optional[str]]:
        """
        Validate keyword set name
        
        Returns:
            (is_valid, error_message)
        """
        if not name:
            return False, "Keyword set name is required"
        
        name = name.strip()
        
        if len(name) > cls.MAX_KEYWORD_SET_NAME_LENGTH:
            return False, f"Keyword set name must be at most {cls.MAX_KEYWORD_SET_NAME_LENGTH} characters"
        
        # Allow letters, numbers, spaces, hyphens, underscores, AND Unicode characters (including Chinese)
        # Only reject control characters and special punctuation that could cause issues
        if re.search(r'[\x00-\x1f\x7f<>"|?*\\/:;]', name):
            return False, "Keyword set name contains invalid characters"
        
        return True, None


class TemplateValidator(Validator):
    """Validator for message templates"""
    
    MAX_TEMPLATE_NAME_LENGTH = 100
    MAX_TEMPLATE_CONTENT_LENGTH = 4096  # Telegram message limit
    
    # Template variable placeholder pattern: {variable_name}
    VARIABLE_PATTERN = re.compile(r'\{([a-zA-Z_][a-zA-Z0-9_]*)\}')
    
    @classmethod
    def validate_template_name(cls, name: str) -> Tuple[bool, Optional[str]]:
        """
        Validate template name
        
        Returns:
            (is_valid, error_message)
        """
        if not name:
            return False, "Template name is required"
        
        name = name.strip()
        
        if len(name) > cls.MAX_TEMPLATE_NAME_LENGTH:
            return False, f"Template name must be at most {cls.MAX_TEMPLATE_NAME_LENGTH} characters"
        
        return True, None
    
    @classmethod
    def validate_template_content(cls, content: str) -> Tuple[bool, Optional[str], List[str]]:
        """
        Validate template content
        
        Returns:
            (is_valid, error_message, list_of_variables)
        """
        if not content:
            return False, "Template content is required", []
        
        content = content.strip()
        
        if len(content) > cls.MAX_TEMPLATE_CONTENT_LENGTH:
            return False, f"Template content must be at most {cls.MAX_TEMPLATE_CONTENT_LENGTH} characters", []
        
        # Extract variables
        variables = cls.VARIABLE_PATTERN.findall(content)
        
        # Check for unmatched braces
        open_braces = content.count('{')
        close_braces = content.count('}')
        if open_braces != close_braces:
            return False, "Unmatched braces in template content", []
        
        return True, None, variables
    
    @classmethod
    def validate_template_data(cls, template_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate complete template data
        
        Returns:
            (is_valid, list_of_errors)
        """
        errors = []
        
        # Validate name
        name = template_data.get('name', '')
        is_valid, error = cls.validate_template_name(name)
        if not is_valid:
            errors.append(error)
        
        # Validate content (prompt)
        content = template_data.get('prompt', '')
        is_valid, error, _ = cls.validate_template_content(content)
        if not is_valid:
            errors.append(error)
        
        return len(errors) == 0, errors


class CampaignValidator(Validator):
    """Validator for automation campaigns"""
    
    MAX_CAMPAIGN_NAME_LENGTH = 100
    MIN_DELAY_SECONDS = 0
    MAX_DELAY_SECONDS = 3600  # 1 hour
    
    @classmethod
    def validate_campaign_name(cls, name: str) -> Tuple[bool, Optional[str]]:
        """
        Validate campaign name
        
        Returns:
            (is_valid, error_message)
        """
        if not name:
            return False, "Campaign name is required"
        
        name = name.strip()
        
        if len(name) > cls.MAX_CAMPAIGN_NAME_LENGTH:
            return False, f"Campaign name must be at most {cls.MAX_CAMPAIGN_NAME_LENGTH} characters"
        
        return True, None
    
    @classmethod
    def validate_delay_range(cls, min_delay: int, max_delay: int) -> Tuple[bool, Optional[str]]:
        """
        Validate delay range
        
        Returns:
            (is_valid, error_message)
        """
        if min_delay < cls.MIN_DELAY_SECONDS:
            return False, f"Minimum delay must be at least {cls.MIN_DELAY_SECONDS} seconds"
        
        if max_delay > cls.MAX_DELAY_SECONDS:
            return False, f"Maximum delay must be at most {cls.MAX_DELAY_SECONDS} seconds"
        
        if min_delay > max_delay:
            return False, "Minimum delay must be less than or equal to maximum delay"
        
        return True, None
    
    @classmethod
    def validate_campaign_data(cls, campaign_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate complete campaign data
        
        Returns:
            (is_valid, list_of_errors)
        """
        errors = []
        
        # Validate name
        name = campaign_data.get('name', '')
        is_valid, error = cls.validate_campaign_name(name)
        if not is_valid:
            errors.append(error)
        
        # Validate delay range
        min_delay = campaign_data.get('actionMinDelaySeconds', 30)
        max_delay = campaign_data.get('actionMaxDelaySeconds', 120)
        
        try:
            min_delay = int(min_delay)
            max_delay = int(max_delay)
            is_valid, error = cls.validate_delay_range(min_delay, max_delay)
            if not is_valid:
                errors.append(error)
        except (ValueError, TypeError):
            errors.append("Delay values must be valid integers")
        
        # Validate template ID (if provided)
        template_id = campaign_data.get('actionTemplateId')
        if template_id is not None:
            try:
                int(template_id)
            except (ValueError, TypeError):
                errors.append("Template ID must be a valid integer")
        
        return len(errors) == 0, errors


class GroupValidator(Validator):
    """Validator for monitored groups"""
    
    MAX_GROUP_NAME_LENGTH = 200
    MAX_GROUP_URL_LENGTH = 500
    
    # Telegram group/channel URL pattern
    # Supports: https://t.me/groupname, t.me/groupname, https://t.me/+invitecode, @username, username
    GROUP_URL_PATTERN = re.compile(r'^(https?://)?(t\.me|telegram\.me)/(joinchat/)?([a-zA-Z0-9_\+-]+)$')
    # Username pattern: @username or just username (letters, numbers, underscores, 5-32 chars)
    USERNAME_PATTERN = re.compile(r'^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$')
    
    @classmethod
    def validate_group_url(cls, url: str) -> Tuple[bool, Optional[str]]:
        """
        Validate Telegram group/channel URL or username
        
        Returns:
            (is_valid, error_message)
        """
        if not url:
            return False, "Group URL or username is required"
        
        url = url.strip()
        
        if len(url) > cls.MAX_GROUP_URL_LENGTH:
            return False, f"Group URL must be at most {cls.MAX_GROUP_URL_LENGTH} characters"
        
        # Accept t.me URLs
        if cls.GROUP_URL_PATTERN.match(url):
            return True, None
        
        # Accept @username or plain username format
        if cls.USERNAME_PATTERN.match(url):
            return True, None
        
        return False, "Please enter a valid Telegram URL (e.g., https://t.me/groupname), @username, or group name"
    
    @classmethod
    def validate_group_name(cls, name: str) -> Tuple[bool, Optional[str]]:
        """
        Validate group name (optional)
        
        Returns:
            (is_valid, error_message)
        """
        if not name:
            return True, None  # Name is optional
        
        name = name.strip()
        
        if len(name) > cls.MAX_GROUP_NAME_LENGTH:
            return False, f"Group name must be at most {cls.MAX_GROUP_NAME_LENGTH} characters"
        
        return True, None


# Convenience functions for easy import
def validate_account(account_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate account data"""
    return AccountValidator.validate_account_data(account_data)


def validate_keyword(keyword: str, is_regex: bool = False) -> Tuple[bool, Optional[str]]:
    """Validate keyword"""
    return KeywordValidator.validate_keyword(keyword, is_regex)


def validate_template(template_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate template data"""
    return TemplateValidator.validate_template_data(template_data)


def validate_campaign(campaign_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate campaign data"""
    return CampaignValidator.validate_campaign_data(campaign_data)


def validate_group_url(url: str) -> Tuple[bool, Optional[str]]:
    """Validate group URL"""
    return GroupValidator.validate_group_url(url)

