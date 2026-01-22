"""
TG-Matrix Backend Services
"""
from .tts_service import TTSService, init_tts_service, get_tts_service

__all__ = [
    'TTSService',
    'init_tts_service',
    'get_tts_service',
]
