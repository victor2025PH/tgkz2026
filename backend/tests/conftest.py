"""
Pytest configuration and fixtures
"""
import pytest
import pytest_asyncio
import asyncio
import aiosqlite
import tempfile
import os
from pathlib import Path
from database import Database


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def temp_db():
    """Create a temporary database for testing"""
    # Create temporary database file
    fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    
    try:
        # Create database instance
        db = Database(db_path)
        await db.connect()
        await db.initialize()
        
        yield db
        
        # Cleanup
        await db.close()
    finally:
        # Remove temporary database file
        if os.path.exists(db_path):
            os.unlink(db_path)


@pytest.fixture
def sample_account():
    """Create a sample account for testing"""
    return {
        'phone': '+1234567890',
        'apiId': '12345',
        'apiHash': 'abcdef1234567890abcdef1234567890',  # 32 characters
        'role': 'LEAD_CAPTURE',
        'group': 'Test Group',
        'enableWarmup': False
    }


@pytest.fixture
def sample_keyword_set():
    """Create a sample keyword set for testing"""
    return {
        'name': 'Test Keyword Set'
    }


@pytest.fixture
def sample_keyword():
    """Create a sample keyword for testing"""
    return {
        'keywordSetId': 1,
        'keyword': 'test keyword',
        'regex': False
    }


@pytest.fixture
def sample_group():
    """Create a sample group for testing"""
    return {
        'url': 'https://t.me/testgroup',
        'keywordSetId': 1
    }


@pytest.fixture
def sample_template():
    """Create a sample template for testing"""
    return {
        'name': 'Test Template',
        'content': 'Hello {{name}}, this is a test message.',
        'enabled': True
    }


@pytest.fixture
def sample_campaign():
    """Create a sample campaign for testing"""
    return {
        'name': 'Test Campaign',
        'templateId': 1,
        'triggerKeywordSetId': 1,
        'delayAfterCapture': 60,
        'delayBetweenMessages': 120,
        'enabled': True
    }

