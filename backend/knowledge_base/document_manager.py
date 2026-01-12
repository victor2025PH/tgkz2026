"""
Document Manager
Handles document import, storage, and text extraction
"""
import os
import sys
import json
import hashlib
import aiosqlite
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path


class DocumentManager:
    """Manages knowledge base documents"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent.parent.parent / "data"
        self.docs_path = self.base_path / "knowledge" / "documents"
        self.db_path = self.base_path / "knowledge" / "knowledge.db"
        self._connection: Optional[aiosqlite.Connection] = None
        
    async def initialize(self):
        """Initialize document manager and create necessary directories"""
        # Create directory structure
        directories = [
            self.base_path / "knowledge" / "documents",
            self.base_path / "knowledge" / "categories",
            self.base_path / "media" / "images" / "products",
            self.base_path / "media" / "images" / "tutorials",
            self.base_path / "media" / "images" / "general",
            self.base_path / "media" / "videos" / "demos",
            self.base_path / "media" / "videos" / "tutorials",
            self.base_path / "media" / "videos" / "general",
            self.base_path / "media" / "thumbnails",
            self.base_path / "templates" / "text",
            self.base_path / "templates" / "rich",
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        await self._init_database()
        
        print(f"[KnowledgeBase] Initialized at {self.base_path}", file=sys.stderr)
        return True
    
    async def _init_database(self):
        """Initialize SQLite database for knowledge base"""
        self._connection = await aiosqlite.connect(str(self.db_path))
        self._connection.row_factory = aiosqlite.Row
        
        # Knowledge documents table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                file_path TEXT NOT NULL UNIQUE,
                file_type TEXT,
                category TEXT DEFAULT 'general',
                tags TEXT DEFAULT '[]',
                content TEXT,
                summary TEXT,
                file_size INTEGER,
                file_hash TEXT,
                chunk_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Document chunks table (for RAG)
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS document_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                tokens INTEGER DEFAULT 0,
                FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE
            )
        """)
        
        # Media resources table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS media_resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                file_path TEXT NOT NULL UNIQUE,
                media_type TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                tags TEXT DEFAULT '[]',
                description TEXT,
                thumbnail_path TEXT,
                file_size INTEGER,
                dimensions TEXT,
                duration INTEGER,
                ai_caption TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # QA pairs table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS qa_pairs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                keywords TEXT DEFAULT '[]',
                media_ids TEXT DEFAULT '[]',
                usage_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create indexes
        await self._connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_docs_category ON knowledge_documents(category)
        """)
        await self._connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_media_type ON media_resources(media_type)
        """)
        await self._connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_media_category ON media_resources(category)
        """)
        await self._connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON document_chunks(document_id)
        """)
        
        await self._connection.commit()
    
    async def close(self):
        """Close database connection"""
        if self._connection:
            await self._connection.close()
            self._connection = None
    
    def _calculate_hash(self, file_path: str) -> str:
        """Calculate MD5 hash of a file"""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    def _extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        try:
            import PyPDF2
            text = ""
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += page.extract_text() + "\n"
            return text.strip()
        except ImportError:
            print("[KnowledgeBase] PyPDF2 not installed, PDF extraction unavailable", file=sys.stderr)
            return ""
        except Exception as e:
            print(f"[KnowledgeBase] Error extracting PDF: {e}", file=sys.stderr)
            return ""
    
    def _extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        try:
            from docx import Document
            doc = Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            return text.strip()
        except ImportError:
            print("[KnowledgeBase] python-docx not installed, DOCX extraction unavailable", file=sys.stderr)
            return ""
        except Exception as e:
            print(f"[KnowledgeBase] Error extracting DOCX: {e}", file=sys.stderr)
            return ""
    
    def _extract_text(self, file_path: str, file_type: str) -> str:
        """Extract text content from document"""
        if file_type == 'pdf':
            return self._extract_text_from_pdf(file_path)
        elif file_type == 'docx':
            return self._extract_text_from_docx(file_path)
        elif file_type in ['txt', 'md']:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except:
                with open(file_path, 'r', encoding='gbk') as f:
                    return f.read()
        return ""
    
    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """Split text into chunks for RAG"""
        if not text:
            return []
        
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            
            # Try to break at sentence boundary
            if end < len(text):
                last_period = chunk.rfind('。')
                last_newline = chunk.rfind('\n')
                break_point = max(last_period, last_newline)
                if break_point > chunk_size * 0.5:
                    chunk = text[start:start + break_point + 1]
                    end = start + break_point + 1
            
            chunks.append(chunk.strip())
            start = end - overlap
        
        return [c for c in chunks if c]
    
    async def add_document(self, file_path: str, title: str = None, 
                           category: str = "general", tags: List[str] = None) -> Dict[str, Any]:
        """Add a document to the knowledge base"""
        path = Path(file_path)
        if not path.exists():
            return {"success": False, "error": "File not found"}
        
        # Determine file type
        file_type = path.suffix.lower().lstrip('.')
        if file_type not in ['pdf', 'txt', 'md', 'docx']:
            return {"success": False, "error": f"Unsupported file type: {file_type}"}
        
        # Copy file to knowledge base
        dest_path = self.docs_path / path.name
        if dest_path.exists():
            # Add timestamp to avoid collision
            stem = path.stem
            suffix = path.suffix
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            dest_path = self.docs_path / f"{stem}_{timestamp}{suffix}"
        
        import shutil
        shutil.copy2(file_path, dest_path)
        
        # Extract text content
        content = self._extract_text(str(dest_path), file_type)
        
        # Calculate file info
        file_size = dest_path.stat().st_size
        file_hash = self._calculate_hash(str(dest_path))
        
        # Create chunks
        chunks = self._chunk_text(content)
        
        # Insert into database
        cursor = await self._connection.execute("""
            INSERT INTO knowledge_documents 
            (title, file_path, file_type, category, tags, content, file_size, file_hash, chunk_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            title or path.stem,
            str(dest_path),
            file_type,
            category,
            json.dumps(tags or []),
            content,
            file_size,
            file_hash,
            len(chunks)
        ))
        doc_id = cursor.lastrowid
        
        # Insert chunks
        for i, chunk in enumerate(chunks):
            await self._connection.execute("""
                INSERT INTO document_chunks (document_id, chunk_index, content, tokens)
                VALUES (?, ?, ?, ?)
            """, (doc_id, i, chunk, len(chunk)))
        
        await self._connection.commit()
        
        return {
            "success": True,
            "id": doc_id,
            "title": title or path.stem,
            "file_path": str(dest_path),
            "chunks": len(chunks)
        }
    
    async def add_document_from_text(self, title: str, content: str,
                                      category: str = "general", 
                                      tags: List[str] = None) -> Dict[str, Any]:
        """Add a document directly from text content"""
        # Save as text file
        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()
        file_path = self.docs_path / f"{safe_title}.txt"
        
        counter = 1
        while file_path.exists():
            file_path = self.docs_path / f"{safe_title}_{counter}.txt"
            counter += 1
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return await self.add_document(str(file_path), title, category, tags)
    
    async def get_all_documents(self, category: str = None) -> List[Dict[str, Any]]:
        """Get all documents, optionally filtered by category"""
        query = "SELECT * FROM knowledge_documents"
        params = []
        
        if category:
            query += " WHERE category = ?"
            params.append(category)
        
        query += " ORDER BY created_at DESC"
        
        cursor = await self._connection.execute(query, params)
        rows = await cursor.fetchall()
        
        return [dict(row) for row in rows]
    
    async def get_document(self, doc_id: int) -> Optional[Dict[str, Any]]:
        """Get a document by ID"""
        cursor = await self._connection.execute(
            "SELECT * FROM knowledge_documents WHERE id = ?", (doc_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    
    async def delete_document(self, doc_id: int) -> bool:
        """Delete a document and its chunks"""
        # Get file path first
        doc = await self.get_document(doc_id)
        if doc:
            # Delete file
            try:
                Path(doc['file_path']).unlink(missing_ok=True)
            except:
                pass
        
        # Delete from database (chunks will be deleted via CASCADE)
        await self._connection.execute(
            "DELETE FROM knowledge_documents WHERE id = ?", (doc_id,)
        )
        await self._connection.commit()
        return True
    
    async def search_documents(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search documents by keyword"""
        cursor = await self._connection.execute("""
            SELECT d.*, c.content as chunk_content, c.chunk_index
            FROM knowledge_documents d
            JOIN document_chunks c ON d.id = c.document_id
            WHERE c.content LIKE ? OR d.title LIKE ?
            ORDER BY d.created_at DESC
            LIMIT ?
        """, (f"%{query}%", f"%{query}%", limit))
        
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def get_relevant_chunks(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Get relevant document chunks for RAG"""
        # Simple keyword matching (can be enhanced with embeddings later)
        keywords = query.split()
        conditions = " OR ".join(["content LIKE ?" for _ in keywords])
        params = [f"%{kw}%" for kw in keywords]
        params.append(limit)
        
        cursor = await self._connection.execute(f"""
            SELECT c.content, c.chunk_index, d.title, d.category
            FROM document_chunks c
            JOIN knowledge_documents d ON c.document_id = d.id
            WHERE {conditions}
            LIMIT ?
        """, params)
        
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def get_categories(self) -> List[str]:
        """Get all document categories"""
        cursor = await self._connection.execute(
            "SELECT DISTINCT category FROM knowledge_documents"
        )
        rows = await cursor.fetchall()
        return [row['category'] for row in rows]
    
    async def update_document(self, doc_id: int, title: str = None,
                               category: str = None, tags: List[str] = None) -> bool:
        """Update document metadata"""
        updates = ["updated_at = CURRENT_TIMESTAMP"]
        params = []
        
        if title:
            updates.append("title = ?")
            params.append(title)
        if category:
            updates.append("category = ?")
            params.append(category)
        if tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(tags))
        
        params.append(doc_id)
        
        await self._connection.execute(
            f"UPDATE knowledge_documents SET {', '.join(updates)} WHERE id = ?",
            params
        )
        await self._connection.commit()
        return True
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        cursor = await self._connection.execute(
            "SELECT COUNT(*) as count, SUM(file_size) as total_size FROM knowledge_documents"
        )
        doc_stats = await cursor.fetchone()
        
        cursor = await self._connection.execute(
            "SELECT COUNT(*) as count FROM document_chunks"
        )
        chunk_stats = await cursor.fetchone()
        
        cursor = await self._connection.execute(
            "SELECT COUNT(*) as count FROM media_resources WHERE media_type = 'image'"
        )
        image_stats = await cursor.fetchone()
        
        cursor = await self._connection.execute(
            "SELECT COUNT(*) as count FROM media_resources WHERE media_type = 'video'"
        )
        video_stats = await cursor.fetchone()
        
        cursor = await self._connection.execute(
            "SELECT COUNT(*) as count FROM qa_pairs"
        )
        qa_stats = await cursor.fetchone()
        
        return {
            "documents": doc_stats['count'] or 0,
            "total_size": doc_stats['total_size'] or 0,
            "chunks": chunk_stats['count'] or 0,
            "images": image_stats['count'] or 0,
            "videos": video_stats['count'] or 0,
            "qa_pairs": qa_stats['count'] or 0
        }


# Global instance
document_manager = DocumentManager()
