"""
Media Manager
Handles image and video storage, thumbnails, and metadata
"""
import os
import sys
import json
import base64
import hashlib
import shutil
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path


class MediaManager:
    """Manages images and videos in the knowledge base"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent.parent.parent / "data"
        self.images_path = self.base_path / "media" / "images"
        self.videos_path = self.base_path / "media" / "videos"
        self.thumbnails_path = self.base_path / "media" / "thumbnails"
        self.db_path = self.base_path / "knowledge" / "knowledge.db"
        self._connection = None
        
        # Supported formats
        self.image_formats = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
        self.video_formats = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    
    async def initialize(self, connection):
        """Initialize with database connection from document manager"""
        self._connection = connection
        
        # Ensure directories exist
        for category in ['products', 'tutorials', 'general']:
            (self.images_path / category).mkdir(parents=True, exist_ok=True)
            (self.videos_path.parent / "videos" / category.replace('products', 'demos')).mkdir(parents=True, exist_ok=True)
        
        self.thumbnails_path.mkdir(parents=True, exist_ok=True)
        
        print(f"[MediaManager] Initialized", file=sys.stderr)
    
    def _calculate_hash(self, file_path: str) -> str:
        """Calculate MD5 hash of a file"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    def _get_image_dimensions(self, file_path: str) -> Optional[str]:
        """Get image dimensions"""
        try:
            from PIL import Image
            with Image.open(file_path) as img:
                return f"{img.width}x{img.height}"
        except ImportError:
            return None
        except Exception:
            return None
    
    def _generate_thumbnail(self, file_path: str, media_type: str) -> Optional[str]:
        """Generate thumbnail for image or video"""
        try:
            thumb_name = f"{self._calculate_hash(file_path)[:16]}.jpg"
            thumb_path = self.thumbnails_path / thumb_name
            
            if thumb_path.exists():
                return str(thumb_path)
            
            if media_type == 'image':
                from PIL import Image
                with Image.open(file_path) as img:
                    img.thumbnail((200, 200))
                    if img.mode in ('RGBA', 'P'):
                        img = img.convert('RGB')
                    img.save(thumb_path, 'JPEG', quality=80)
                return str(thumb_path)
            
            elif media_type == 'video':
                # Try using ffmpeg for video thumbnail
                try:
                    import subprocess
                    subprocess.run([
                        'ffmpeg', '-i', file_path,
                        '-ss', '00:00:01', '-vframes', '1',
                        '-vf', 'scale=200:-1',
                        str(thumb_path), '-y'
                    ], capture_output=True, timeout=30)
                    if thumb_path.exists():
                        return str(thumb_path)
                except:
                    pass
            
            return None
        except Exception as e:
            print(f"[MediaManager] Thumbnail error: {e}", file=sys.stderr)
            return None
    
    def _get_video_duration(self, file_path: str) -> Optional[int]:
        """Get video duration in seconds"""
        try:
            import subprocess
            result = subprocess.run([
                'ffprobe', '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                file_path
            ], capture_output=True, text=True, timeout=30)
            return int(float(result.stdout.strip()))
        except:
            return None
    
    async def add_image(self, file_path: str = None, base64_data: str = None,
                        name: str = None, category: str = "general",
                        tags: List[str] = None, description: str = None) -> Dict[str, Any]:
        """Add an image to the media library"""
        
        # Handle base64 data
        if base64_data:
            if not name:
                name = f"image_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Determine format from base64 header or default to jpg
            ext = '.jpg'
            if base64_data.startswith('/9j/'):
                ext = '.jpg'
            elif base64_data.startswith('iVBOR'):
                ext = '.png'
            elif base64_data.startswith('R0lGOD'):
                ext = '.gif'
            
            file_path = self.images_path / category / f"{name}{ext}"
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'wb') as f:
                f.write(base64.b64decode(base64_data))
            
            file_path = str(file_path)
        
        if not file_path:
            return {"success": False, "error": "No file provided"}
        
        path = Path(file_path)
        if not path.exists():
            return {"success": False, "error": "File not found"}
        
        # Check format
        if path.suffix.lower() not in self.image_formats:
            return {"success": False, "error": f"Unsupported format: {path.suffix}"}
        
        # Copy to media library if not already there
        if not str(path).startswith(str(self.images_path)):
            dest_category = category if category in ['products', 'tutorials'] else 'general'
            dest_path = self.images_path / dest_category / path.name
            
            counter = 1
            while dest_path.exists():
                dest_path = self.images_path / dest_category / f"{path.stem}_{counter}{path.suffix}"
                counter += 1
            
            shutil.copy2(file_path, dest_path)
            file_path = str(dest_path)
        
        # Get metadata
        file_size = Path(file_path).stat().st_size
        dimensions = self._get_image_dimensions(file_path)
        thumbnail = self._generate_thumbnail(file_path, 'image')
        
        # Insert into database
        cursor = await self._connection.execute("""
            INSERT INTO media_resources 
            (name, file_path, media_type, category, tags, description, thumbnail_path, file_size, dimensions)
            VALUES (?, ?, 'image', ?, ?, ?, ?, ?, ?)
        """, (
            name or path.stem,
            file_path,
            category,
            json.dumps(tags or []),
            description,
            thumbnail,
            file_size,
            dimensions
        ))
        
        await self._connection.commit()
        
        return {
            "success": True,
            "id": cursor.lastrowid,
            "name": name or path.stem,
            "file_path": file_path,
            "thumbnail": thumbnail
        }
    
    async def add_video(self, file_path: str = None, base64_data: str = None,
                        name: str = None, category: str = "general",
                        tags: List[str] = None, description: str = None) -> Dict[str, Any]:
        """Add a video to the media library"""
        
        # Handle base64 data
        if base64_data:
            if not name:
                name = f"video_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            file_path = self.videos_path / category / f"{name}.mp4"
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'wb') as f:
                f.write(base64.b64decode(base64_data))
            
            file_path = str(file_path)
        
        if not file_path:
            return {"success": False, "error": "No file provided"}
        
        path = Path(file_path)
        if not path.exists():
            return {"success": False, "error": "File not found"}
        
        # Check format
        if path.suffix.lower() not in self.video_formats:
            return {"success": False, "error": f"Unsupported format: {path.suffix}"}
        
        # Copy to media library if not already there
        if not str(path).startswith(str(self.videos_path)):
            dest_category = category if category in ['demos', 'tutorials'] else 'general'
            dest_path = self.videos_path / dest_category / path.name
            
            counter = 1
            while dest_path.exists():
                dest_path = self.videos_path / dest_category / f"{path.stem}_{counter}{path.suffix}"
                counter += 1
            
            shutil.copy2(file_path, dest_path)
            file_path = str(dest_path)
        
        # Get metadata
        file_size = Path(file_path).stat().st_size
        duration = self._get_video_duration(file_path)
        thumbnail = self._generate_thumbnail(file_path, 'video')
        
        # Insert into database
        cursor = await self._connection.execute("""
            INSERT INTO media_resources 
            (name, file_path, media_type, category, tags, description, thumbnail_path, file_size, duration)
            VALUES (?, ?, 'video', ?, ?, ?, ?, ?, ?)
        """, (
            name or path.stem,
            file_path,
            category,
            json.dumps(tags or []),
            description,
            thumbnail,
            file_size,
            duration
        ))
        
        await self._connection.commit()
        
        return {
            "success": True,
            "id": cursor.lastrowid,
            "name": name or path.stem,
            "file_path": file_path,
            "thumbnail": thumbnail
        }
    
    async def get_all_media(self, media_type: str = None, 
                            category: str = None) -> List[Dict[str, Any]]:
        """Get all media resources"""
        query = "SELECT * FROM media_resources WHERE 1=1"
        params = []
        
        if media_type:
            query += " AND media_type = ?"
            params.append(media_type)
        if category:
            query += " AND category = ?"
            params.append(category)
        
        query += " ORDER BY created_at DESC"
        
        cursor = await self._connection.execute(query, params)
        rows = await cursor.fetchall()
        
        return [dict(row) for row in rows]
    
    async def get_media(self, media_id: int) -> Optional[Dict[str, Any]]:
        """Get a media resource by ID"""
        cursor = await self._connection.execute(
            "SELECT * FROM media_resources WHERE id = ?", (media_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    
    async def delete_media(self, media_id: int) -> bool:
        """Delete a media resource"""
        media = await self.get_media(media_id)
        if media:
            # Delete files
            try:
                Path(media['file_path']).unlink(missing_ok=True)
                if media.get('thumbnail_path'):
                    Path(media['thumbnail_path']).unlink(missing_ok=True)
            except:
                pass
        
        await self._connection.execute(
            "DELETE FROM media_resources WHERE id = ?", (media_id,)
        )
        await self._connection.commit()
        return True
    
    async def search_media(self, query: str, media_type: str = None,
                           limit: int = 10) -> List[Dict[str, Any]]:
        """Search media by name, description, or tags"""
        sql = """
            SELECT * FROM media_resources 
            WHERE (name LIKE ? OR description LIKE ? OR tags LIKE ?)
        """
        params = [f"%{query}%", f"%{query}%", f"%{query}%"]
        
        if media_type:
            sql += " AND media_type = ?"
            params.append(media_type)
        
        sql += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        cursor = await self._connection.execute(sql, params)
        rows = await cursor.fetchall()
        
        return [dict(row) for row in rows]
    
    async def update_media(self, media_id: int, name: str = None,
                           category: str = None, tags: List[str] = None,
                           description: str = None) -> bool:
        """Update media metadata"""
        updates = []
        params = []
        
        if name:
            updates.append("name = ?")
            params.append(name)
        if category:
            updates.append("category = ?")
            params.append(category)
        if tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(tags))
        if description is not None:
            updates.append("description = ?")
            params.append(description)
        
        if not updates:
            return False
        
        params.append(media_id)
        
        await self._connection.execute(
            f"UPDATE media_resources SET {', '.join(updates)} WHERE id = ?",
            params
        )
        await self._connection.commit()
        return True
    
    async def get_media_base64(self, media_id: int) -> Optional[str]:
        """Get media file as base64 string"""
        media = await self.get_media(media_id)
        if not media:
            return None
        
        try:
            with open(media['file_path'], 'rb') as f:
                return base64.b64encode(f.read()).decode('utf-8')
        except:
            return None
    
    async def get_categories(self, media_type: str = None) -> List[str]:
        """Get all media categories"""
        query = "SELECT DISTINCT category FROM media_resources"
        params = []
        
        if media_type:
            query += " WHERE media_type = ?"
            params.append(media_type)
        
        cursor = await self._connection.execute(query, params)
        rows = await cursor.fetchall()
        return [row['category'] for row in rows]
    
    def get_file_path(self, relative_path: str) -> str:
        """Get absolute file path from relative path"""
        return str(self.base_path / relative_path)


# Global instance
media_manager = MediaManager()
