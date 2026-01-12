"""
TG-Matrix Ad Template System
Provides ad template management with Spintax support for content variation
"""
import re
import random
import json
import sys
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum


class MediaType(Enum):
    """Supported media types for ads"""
    TEXT = "text"
    PHOTO = "photo"
    VIDEO = "video"
    DOCUMENT = "document"
    ANIMATION = "animation"  # GIF


@dataclass
class AdTemplate:
    """Ad template data structure"""
    id: int
    name: str
    content: str  # Supports Spintax syntax
    media_type: MediaType
    media_file_id: Optional[str] = None
    media_path: Optional[str] = None  # Local file path
    is_active: bool = True
    use_count: int = 0
    success_count: int = 0
    fail_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "content": self.content,
            "mediaType": self.media_type.value,
            "mediaFileId": self.media_file_id,
            "mediaPath": self.media_path,
            "isActive": self.is_active,
            "useCount": self.use_count,
            "successCount": self.success_count,
            "failCount": self.fail_count,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at
        }


class SpintaxGenerator:
    """
    Spintax content variation generator
    
    Supports syntax: {option1|option2|option3}
    Nested spintax: {Hello|Hi {there|friend}|Hey}
    
    Example:
        Input:  "{嗨|你好|Hi}！我們提供{優質|專業}的服務"
        Output: "嗨！我們提供專業的服務"
    """
    
    # Pattern to match spintax blocks: {option1|option2|...}
    SPINTAX_PATTERN = re.compile(r'\{([^{}]+)\}')
    
    @classmethod
    def generate_variant(cls, content: str) -> str:
        """
        Generate a single variant from spintax content
        
        Args:
            content: Template content with spintax syntax
            
        Returns:
            Generated variant with random selections
        """
        if not content:
            return content
        
        # Process nested spintax from inner to outer
        result = content
        max_iterations = 50  # Prevent infinite loops
        iterations = 0
        
        while cls.SPINTAX_PATTERN.search(result) and iterations < max_iterations:
            result = cls.SPINTAX_PATTERN.sub(cls._replace_match, result)
            iterations += 1
        
        return result
    
    @classmethod
    def _replace_match(cls, match) -> str:
        """Replace a spintax match with a random option"""
        options = match.group(1).split('|')
        return random.choice(options).strip()
    
    @classmethod
    def generate_variants(cls, content: str, count: int = 10) -> List[str]:
        """
        Generate multiple unique variants from spintax content
        
        Args:
            content: Template content with spintax syntax
            count: Number of variants to generate
            
        Returns:
            List of unique generated variants
        """
        if not content:
            return [content]
        
        variants = set()
        max_attempts = count * 3  # Try more times to get unique results
        attempts = 0
        
        while len(variants) < count and attempts < max_attempts:
            variant = cls.generate_variant(content)
            variants.add(variant)
            attempts += 1
        
        return list(variants)
    
    @classmethod
    def count_possible_variants(cls, content: str) -> int:
        """
        Estimate the number of possible unique variants
        
        Args:
            content: Template content with spintax syntax
            
        Returns:
            Estimated number of possible variants (may be approximate for nested)
        """
        if not content:
            return 1
        
        total = 1
        for match in cls.SPINTAX_PATTERN.finditer(content):
            options = match.group(1).split('|')
            total *= len(options)
        
        return total
    
    @classmethod
    def validate_syntax(cls, content: str) -> Tuple[bool, Optional[str]]:
        """
        Validate spintax syntax
        
        Args:
            content: Template content to validate
            
        Returns:
            (is_valid, error_message)
        """
        if not content:
            return True, None
        
        # Check for balanced braces
        open_count = content.count('{')
        close_count = content.count('}')
        
        if open_count != close_count:
            return False, f"大括號不匹配: {open_count} 個 '{{' 和 {close_count} 個 '}}'"
        
        # Check for empty options
        if '||' in content or '{|' in content or '|}' in content:
            return False, "發現空選項，請確保每個選項都有內容"
        
        # Check for empty braces
        if '{}' in content:
            return False, "發現空的變體塊 '{}'"
        
        # Try to generate a variant to ensure syntax is valid
        try:
            cls.generate_variant(content)
            return True, None
        except Exception as e:
            return False, f"語法錯誤: {str(e)}"
    
    @classmethod
    def preview_variants(cls, content: str, count: int = 5) -> Dict[str, Any]:
        """
        Generate preview of variants with statistics
        
        Args:
            content: Template content
            count: Number of preview variants
            
        Returns:
            Preview data including variants and statistics
        """
        is_valid, error = cls.validate_syntax(content)
        if not is_valid:
            return {
                "valid": False,
                "error": error,
                "variants": [],
                "possibleCount": 0
            }
        
        variants = cls.generate_variants(content, count)
        possible_count = cls.count_possible_variants(content)
        
        return {
            "valid": True,
            "error": None,
            "variants": variants,
            "possibleCount": possible_count,
            "uniqueGenerated": len(set(variants))
        }


class AdTemplateManager:
    """Manages ad templates with database persistence"""
    
    def __init__(self, db):
        self.db = db
        self._initialized = False
    
    async def initialize(self):
        """Initialize ad template tables"""
        if self._initialized:
            return
        
        try:
            # Create ad_templates table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS ad_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    content TEXT NOT NULL,
                    media_type TEXT DEFAULT 'text',
                    media_file_id TEXT,
                    media_path TEXT,
                    is_active INTEGER DEFAULT 1,
                    use_count INTEGER DEFAULT 0,
                    success_count INTEGER DEFAULT 0,
                    fail_count INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # Create index for faster queries
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_ad_templates_active 
                ON ad_templates(is_active)
            ''')
            
            self._initialized = True
            print("[AdTemplate] Ad template manager initialized", file=sys.stderr)
            
        except Exception as e:
            print(f"[AdTemplate] Error initializing: {e}", file=sys.stderr)
    
    async def create_template(
        self,
        name: str,
        content: str,
        media_type: str = "text",
        media_file_id: Optional[str] = None,
        media_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new ad template"""
        # Validate spintax syntax
        is_valid, error = SpintaxGenerator.validate_syntax(content)
        if not is_valid:
            return {"success": False, "error": error}
        
        # Validate name
        if not name or not name.strip():
            return {"success": False, "error": "模板名稱不能為空"}
        
        now = datetime.now().isoformat()
        
        try:
            cursor = await self.db.execute('''
                INSERT INTO ad_templates 
                (name, content, media_type, media_file_id, media_path, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            ''', (name.strip(), content, media_type, media_file_id, media_path, now, now))
            
            template_id = cursor.lastrowid
            
            return {
                "success": True,
                "templateId": template_id,
                "name": name.strip()
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def update_template(
        self,
        template_id: int,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update an existing ad template"""
        # Validate spintax if content is being updated
        if 'content' in updates:
            is_valid, error = SpintaxGenerator.validate_syntax(updates['content'])
            if not is_valid:
                return {"success": False, "error": error}
        
        # Build update query
        allowed_fields = ['name', 'content', 'media_type', 'media_file_id', 'media_path', 'is_active']
        update_parts = []
        params = []
        
        for field in allowed_fields:
            if field in updates:
                update_parts.append(f"{field} = ?")
                params.append(updates[field])
        
        if not update_parts:
            return {"success": False, "error": "沒有要更新的欄位"}
        
        update_parts.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        params.append(template_id)
        
        try:
            await self.db.execute(f'''
                UPDATE ad_templates 
                SET {', '.join(update_parts)}
                WHERE id = ?
            ''', tuple(params))
            
            return {"success": True, "templateId": template_id}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def delete_template(self, template_id: int) -> Dict[str, Any]:
        """Delete an ad template"""
        try:
            await self.db.execute('DELETE FROM ad_templates WHERE id = ?', (template_id,))
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_template(self, template_id: int) -> Optional[AdTemplate]:
        """Get a single ad template by ID"""
        try:
            row = await self.db.fetch_one(
                'SELECT * FROM ad_templates WHERE id = ?', 
                (template_id,)
            )
            
            if not row:
                return None
            
            return AdTemplate(
                id=row['id'],
                name=row['name'],
                content=row['content'],
                media_type=MediaType(row['media_type']),
                media_file_id=row['media_file_id'],
                media_path=row['media_path'],
                is_active=bool(row['is_active']),
                use_count=row['use_count'],
                success_count=row['success_count'],
                fail_count=row['fail_count'],
                created_at=row['created_at'],
                updated_at=row['updated_at']
            )
            
        except Exception as e:
            print(f"[AdTemplate] Error getting template: {e}", file=sys.stderr)
            return None
    
    async def get_all_templates(self, active_only: bool = False) -> List[AdTemplate]:
        """Get all ad templates"""
        try:
            query = 'SELECT * FROM ad_templates'
            if active_only:
                query += ' WHERE is_active = 1'
            query += ' ORDER BY created_at DESC'
            
            rows = await self.db.fetch_all(query)
            
            templates = []
            for row in rows:
                templates.append(AdTemplate(
                    id=row['id'],
                    name=row['name'],
                    content=row['content'],
                    media_type=MediaType(row['media_type']),
                    media_file_id=row['media_file_id'],
                    media_path=row['media_path'],
                    is_active=bool(row['is_active']),
                    use_count=row['use_count'],
                    success_count=row['success_count'],
                    fail_count=row['fail_count'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                ))
            
            return templates
            
        except Exception as e:
            print(f"[AdTemplate] Error getting templates: {e}", file=sys.stderr)
            return []
    
    async def generate_variant(self, template_id: int) -> Dict[str, Any]:
        """Generate a variant from a template"""
        template = await self.get_template(template_id)
        if not template:
            return {"success": False, "error": "模板不存在"}
        
        variant = SpintaxGenerator.generate_variant(template.content)
        
        return {
            "success": True,
            "templateId": template_id,
            "original": template.content,
            "variant": variant,
            "mediaType": template.media_type.value,
            "mediaFileId": template.media_file_id,
            "mediaPath": template.media_path
        }
    
    async def preview_template(self, template_id: int, count: int = 5) -> Dict[str, Any]:
        """Preview variants of a template"""
        template = await self.get_template(template_id)
        if not template:
            return {"success": False, "error": "模板不存在"}
        
        preview = SpintaxGenerator.preview_variants(template.content, count)
        preview["templateId"] = template_id
        preview["templateName"] = template.name
        preview["success"] = True
        
        return preview
    
    async def increment_use_count(self, template_id: int, success: bool = True):
        """Increment template usage count"""
        try:
            if success:
                await self.db.execute('''
                    UPDATE ad_templates 
                    SET use_count = use_count + 1, success_count = success_count + 1
                    WHERE id = ?
                ''', (template_id,))
            else:
                await self.db.execute('''
                    UPDATE ad_templates 
                    SET use_count = use_count + 1, fail_count = fail_count + 1
                    WHERE id = ?
                ''', (template_id,))
        except Exception as e:
            print(f"[AdTemplate] Error updating use count: {e}", file=sys.stderr)
    
    async def toggle_template_status(self, template_id: int) -> Dict[str, Any]:
        """Toggle template active status"""
        try:
            template = await self.get_template(template_id)
            if not template:
                return {"success": False, "error": "模板不存在"}
            
            new_status = not template.is_active
            await self.db.execute('''
                UPDATE ad_templates SET is_active = ?, updated_at = ?
                WHERE id = ?
            ''', (1 if new_status else 0, datetime.now().isoformat(), template_id))
            
            return {"success": True, "isActive": new_status}
            
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global instance
ad_template_manager: Optional[AdTemplateManager] = None


async def init_ad_template_manager(db) -> AdTemplateManager:
    """Initialize ad template manager"""
    global ad_template_manager
    ad_template_manager = AdTemplateManager(db)
    await ad_template_manager.initialize()
    return ad_template_manager


def get_ad_template_manager() -> Optional[AdTemplateManager]:
    """Get ad template manager instance"""
    return ad_template_manager
