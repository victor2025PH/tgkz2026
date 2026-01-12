"""
TG-Matrix Log Rotation Manager
Handles log rotation, cleanup, and archival
"""
import os
import gzip
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from config import BASE_DIR, LOGS_DIR


class LogRotator:
    """Manages log rotation and cleanup"""
    
    def __init__(
        self,
        log_dir: Optional[Path] = None,
        max_size_mb: float = 10.0,
        retention_days: int = 30,
        compress_old_logs: bool = True
    ):
        """
        Initialize log rotator
        
        Args:
            log_dir: Directory containing log files (default: backend/logs)
            max_size_mb: Maximum log file size in MB before rotation
            retention_days: Number of days to retain logs
            compress_old_logs: Whether to compress old log files
        """
        self.log_dir = Path(log_dir) if log_dir else LOGS_DIR
        self.max_size_mb = max_size_mb
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.retention_days = retention_days
        self.compress_old_logs = compress_old_logs
        
        # Ensure log directory exists
        self.log_dir.mkdir(parents=True, exist_ok=True)
    
    def rotate_log_file(self, log_file: Path) -> Optional[Path]:
        """
        Rotate a log file if it exceeds max size
        
        Args:
            log_file: Path to log file to rotate
        
        Returns:
            Path to rotated file, or None if no rotation needed
        """
        if not log_file.exists():
            return None
        
        file_size = log_file.stat().st_size
        if file_size < self.max_size_bytes:
            return None  # No rotation needed
        
        # Generate rotated filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        rotated_name = f"{log_file.stem}_{timestamp}{log_file.suffix}"
        rotated_path = self.log_dir / rotated_name
        
        # Move current log to rotated file
        shutil.move(str(log_file), str(rotated_path))
        
        # Compress if enabled
        if self.compress_old_logs:
            compressed_path = self._compress_log(rotated_path)
            if compressed_path:
                return compressed_path
        
        return rotated_path
    
    def _compress_log(self, log_file: Path) -> Optional[Path]:
        """
        Compress a log file using gzip
        
        Args:
            log_file: Path to log file to compress
        
        Returns:
            Path to compressed file, or None on error
        """
        try:
            compressed_path = log_file.with_suffix(log_file.suffix + '.gz')
            
            with open(log_file, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Remove original file after compression
            log_file.unlink()
            
            return compressed_path
        except Exception as e:
            print(f"Error compressing log file {log_file}: {e}")
            return None
    
    def cleanup_old_logs(self) -> int:
        """
        Remove log files older than retention_days
        
        Returns:
            Number of files removed
        """
        cutoff_date = datetime.now() - timedelta(days=self.retention_days)
        removed_count = 0
        
        for log_file in self.log_dir.glob("*.log*"):
            if not log_file.is_file():
                continue
            
            # Get file modification time
            file_time = datetime.fromtimestamp(log_file.stat().st_mtime)
            
            if file_time < cutoff_date:
                try:
                    log_file.unlink()
                    removed_count += 1
                except Exception as e:
                    print(f"Error removing old log file {log_file}: {e}")
        
        return removed_count
    
    def list_log_files(self) -> List[Dict[str, Any]]:
        """
        List all log files with metadata
        
        Returns:
            List of log file information dictionaries
        """
        log_files = []
        
        for log_file in sorted(self.log_dir.glob("*.log*"), key=lambda p: p.stat().st_mtime, reverse=True):
            if not log_file.is_file():
                continue
            
            file_stat = log_file.stat()
            file_time = datetime.fromtimestamp(file_stat.st_mtime)
            
            log_files.append({
                "name": log_file.name,
                "path": str(log_file),
                "size": file_stat.st_size,
                "sizeMB": round(file_stat.st_size / (1024 * 1024), 2),
                "modified": file_time.isoformat(),
                "compressed": log_file.suffix == '.gz'
            })
        
        return log_files
    
    def get_log_stats(self) -> Dict[str, Any]:
        """
        Get statistics about log files
        
        Returns:
            Dictionary with log statistics
        """
        log_files = self.list_log_files()
        total_size = sum(f['size'] for f in log_files)
        compressed_count = sum(1 for f in log_files if f['compressed'])
        
        return {
            "total_files": len(log_files),
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "compressed_files": compressed_count,
            "retention_days": self.retention_days,
            "max_size_mb": self.max_size_mb,
            "log_dir": str(self.log_dir)
        }
    
    def rotate_all_logs(self) -> List[Path]:
        """
        Rotate all log files that exceed max size
        
        Returns:
            List of rotated file paths
        """
        rotated_files = []
        
        for log_file in self.log_dir.glob("*.log"):
            if not log_file.is_file():
                continue
            
            rotated = self.rotate_log_file(log_file)
            if rotated:
                rotated_files.append(rotated)
        
        return rotated_files


# Global log rotator instance
_log_rotator: Optional[LogRotator] = None


def get_log_rotator() -> LogRotator:
    """Get global log rotator instance"""
    global _log_rotator
    if _log_rotator is None:
        _log_rotator = LogRotator()
    return _log_rotator

