"""
TG-Matrix Session Package Manager
Handles import/export of session packages with API credentials

Package format: .tgpkg (ZIP file containing metadata.json + session file)
"""

import json
import zipfile
import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import tempfile
import hashlib


class SessionPackage:
    """Manages TG-Matrix session packages"""
    
    PACKAGE_VERSION = "1.0"
    PACKAGE_EXTENSION = ".tgpkg"
    METADATA_FILENAME = "metadata.json"
    SESSION_FILENAME = "session.session"
    
    @classmethod
    def create_package(
        cls,
        session_file_path: Path,
        api_id: str,
        api_hash: str,
        phone: str,
        output_path: Path,
        proxy: str = "",
        role: str = "Unassigned",
        group: str = "",
        daily_send_limit: int = 50,
        notes: str = ""
    ) -> Tuple[bool, str]:
        """
        Create a session package file
        
        Args:
            session_file_path: Path to the .session file
            api_id: Telegram API ID
            api_hash: Telegram API Hash
            phone: Phone number
            output_path: Output path for the package
            proxy: Proxy settings (optional)
            role: Account role (optional)
            group: Account group (optional)
            daily_send_limit: Daily send limit (optional)
            notes: Notes (optional)
        
        Returns:
            (success, message)
        """
        try:
            # Validate inputs
            if not session_file_path.exists():
                return False, f"Session file not found: {session_file_path}"
            
            if not api_id or not api_hash:
                return False, "API ID and API Hash are required"
            
            # Ensure output has correct extension
            if not str(output_path).endswith(cls.PACKAGE_EXTENSION):
                output_path = Path(str(output_path) + cls.PACKAGE_EXTENSION)
            
            # Create metadata
            metadata = {
                "version": cls.PACKAGE_VERSION,
                "created_at": datetime.now().isoformat(),
                "phone": phone,
                "api_id": str(api_id),
                "api_hash": api_hash,
                "proxy": proxy,
                "role": role,
                "group": group,
                "daily_send_limit": daily_send_limit,
                "notes": notes,
                # Add checksum for integrity verification
                "session_checksum": cls._calculate_checksum(session_file_path)
            }
            
            # Create ZIP package
            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Add metadata
                zipf.writestr(cls.METADATA_FILENAME, json.dumps(metadata, indent=2, ensure_ascii=False))
                
                # Add session file
                zipf.write(session_file_path, cls.SESSION_FILENAME)
            
            return True, f"Package created: {output_path}"
            
        except Exception as e:
            return False, f"Error creating package: {str(e)}"
    
    @classmethod
    def extract_package(
        cls,
        package_path: Path,
        sessions_dir: Path
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Extract a session package
        
        Args:
            package_path: Path to the .tgpkg file
            sessions_dir: Directory to extract session file to
        
        Returns:
            (success, message, account_data or None)
        """
        try:
            if not package_path.exists():
                return False, f"Package not found: {package_path}", None
            
            # Check if it's a valid ZIP file
            if not zipfile.is_zipfile(package_path):
                return False, "Invalid package format (not a valid ZIP file)", None
            
            with zipfile.ZipFile(package_path, 'r') as zipf:
                # Check required files
                file_list = zipf.namelist()
                
                if cls.METADATA_FILENAME not in file_list:
                    return False, "Invalid package: missing metadata.json", None
                
                if cls.SESSION_FILENAME not in file_list:
                    return False, "Invalid package: missing session file", None
                
                # Read metadata
                metadata_content = zipf.read(cls.METADATA_FILENAME).decode('utf-8')
                metadata = json.loads(metadata_content)
                
                # Validate required fields
                required_fields = ['phone', 'api_id', 'api_hash']
                for field in required_fields:
                    if not metadata.get(field):
                        return False, f"Invalid package: missing {field} in metadata", None
                
                # Extract session file
                phone = metadata['phone']
                safe_phone = phone.replace('+', '').replace('-', '').replace(' ', '')
                target_session_path = sessions_dir / f"{safe_phone}.session"
                
                # Extract to temp first, then move
                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_session = Path(temp_dir) / cls.SESSION_FILENAME
                    zipf.extract(cls.SESSION_FILENAME, temp_dir)
                    
                    # Verify checksum if available
                    if 'session_checksum' in metadata:
                        actual_checksum = cls._calculate_checksum(temp_session)
                        if actual_checksum != metadata['session_checksum']:
                            return False, "Session file integrity check failed", None
                    
                    # Move to target location
                    shutil.copy2(temp_session, target_session_path)
                
                # Prepare account data
                account_data = {
                    'phone': phone,
                    'api_id': metadata['api_id'],
                    'api_hash': metadata['api_hash'],
                    'proxy': metadata.get('proxy', ''),
                    'role': metadata.get('role', 'Unassigned'),
                    'group': metadata.get('group', ''),
                    'daily_send_limit': metadata.get('daily_send_limit', 50),
                    'notes': metadata.get('notes', ''),
                    'status': 'Offline',  # Start as offline, will connect
                    'session_path': str(target_session_path)
                }
                
                return True, f"Package extracted successfully for {phone}", account_data
                
        except json.JSONDecodeError:
            return False, "Invalid package: corrupted metadata", None
        except Exception as e:
            return False, f"Error extracting package: {str(e)}", None
    
    @classmethod
    def get_package_info(cls, package_path: Path) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Get information from a package without extracting
        
        Returns:
            (success, message, metadata or None)
        """
        try:
            if not package_path.exists():
                return False, f"Package not found: {package_path}", None
            
            if not zipfile.is_zipfile(package_path):
                return False, "Invalid package format", None
            
            with zipfile.ZipFile(package_path, 'r') as zipf:
                if cls.METADATA_FILENAME not in zipf.namelist():
                    return False, "Invalid package: missing metadata", None
                
                metadata_content = zipf.read(cls.METADATA_FILENAME).decode('utf-8')
                metadata = json.loads(metadata_content)
                
                # Hide sensitive data
                safe_metadata = {
                    'phone': metadata.get('phone', ''),
                    'api_id': metadata.get('api_id', '')[:4] + '****',  # Partially hide
                    'api_hash': metadata.get('api_hash', '')[:8] + '****',  # Partially hide
                    'role': metadata.get('role', 'Unassigned'),
                    'group': metadata.get('group', ''),
                    'created_at': metadata.get('created_at', ''),
                    'version': metadata.get('version', '1.0')
                }
                
                return True, "Package info retrieved", safe_metadata
                
        except Exception as e:
            return False, f"Error reading package: {str(e)}", None
    
    @classmethod
    def _calculate_checksum(cls, file_path: Path) -> str:
        """Calculate SHA256 checksum of a file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    
    @classmethod
    def is_package_file(cls, file_path: Path) -> bool:
        """Check if a file is a TG-Matrix session package"""
        return str(file_path).lower().endswith(cls.PACKAGE_EXTENSION)
    
    @classmethod
    def is_legacy_session(cls, file_path: Path) -> bool:
        """Check if a file is a legacy .session file"""
        return str(file_path).lower().endswith('.session')


class BatchSessionPackage:
    """Handles batch import/export of multiple session packages"""
    
    BATCH_EXTENSION = ".tgbatch"
    
    @classmethod
    def create_batch_package(
        cls,
        accounts_data: list,  # List of dicts with session_path and account info
        sessions_dir: Path,
        output_path: Path
    ) -> Tuple[bool, str, int]:
        """
        Create a batch package containing multiple accounts
        
        Returns:
            (success, message, count)
        """
        try:
            if not accounts_data:
                return False, "No accounts to export", 0
            
            # Ensure output has correct extension
            if not str(output_path).endswith(cls.BATCH_EXTENSION):
                output_path = Path(str(output_path) + cls.BATCH_EXTENSION)
            
            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                batch_metadata = {
                    "version": SessionPackage.PACKAGE_VERSION,
                    "created_at": datetime.now().isoformat(),
                    "count": 0,
                    "accounts": []
                }
                
                count = 0
                for account in accounts_data:
                    phone = account.get('phone', '')
                    safe_phone = phone.replace('+', '').replace('-', '').replace(' ', '')
                    session_file = sessions_dir / f"{safe_phone}.session"
                    
                    if not session_file.exists():
                        continue
                    
                    # Add session file
                    session_name = f"sessions/{safe_phone}.session"
                    zipf.write(session_file, session_name)
                    
                    # Add account info to batch metadata
                    account_meta = {
                        "phone": phone,
                        "api_id": str(account.get('api_id', '')),
                        "api_hash": account.get('api_hash', ''),
                        "proxy": account.get('proxy', ''),
                        "role": account.get('role', 'Unassigned'),
                        "group": account.get('group', ''),
                        "daily_send_limit": account.get('daily_send_limit', 50),
                        "session_file": session_name,
                        "checksum": SessionPackage._calculate_checksum(session_file)
                    }
                    batch_metadata["accounts"].append(account_meta)
                    count += 1
                
                batch_metadata["count"] = count
                
                # Write batch metadata
                zipf.writestr("batch_metadata.json", json.dumps(batch_metadata, indent=2, ensure_ascii=False))
            
            return True, f"Batch package created with {count} accounts", count
            
        except Exception as e:
            return False, f"Error creating batch package: {str(e)}", 0
    
    @classmethod
    def extract_batch_package(
        cls,
        package_path: Path,
        sessions_dir: Path
    ) -> Tuple[bool, str, list]:
        """
        Extract a batch package
        
        Returns:
            (success, message, list of account_data)
        """
        try:
            if not package_path.exists():
                return False, f"Package not found: {package_path}", []
            
            if not zipfile.is_zipfile(package_path):
                return False, "Invalid package format", []
            
            accounts = []
            
            with zipfile.ZipFile(package_path, 'r') as zipf:
                # Read batch metadata
                if "batch_metadata.json" not in zipf.namelist():
                    return False, "Invalid batch package: missing metadata", []
                
                metadata = json.loads(zipf.read("batch_metadata.json").decode('utf-8'))
                
                for account_meta in metadata.get("accounts", []):
                    session_file_in_zip = account_meta.get("session_file", "")
                    
                    if session_file_in_zip and session_file_in_zip in zipf.namelist():
                        phone = account_meta['phone']
                        safe_phone = phone.replace('+', '').replace('-', '').replace(' ', '')
                        target_path = sessions_dir / f"{safe_phone}.session"
                        
                        # Extract session file
                        with tempfile.TemporaryDirectory() as temp_dir:
                            zipf.extract(session_file_in_zip, temp_dir)
                            temp_session = Path(temp_dir) / session_file_in_zip
                            shutil.copy2(temp_session, target_path)
                        
                        # Prepare account data
                        account_data = {
                            'phone': phone,
                            'api_id': account_meta.get('api_id', ''),
                            'api_hash': account_meta.get('api_hash', ''),
                            'proxy': account_meta.get('proxy', ''),
                            'role': account_meta.get('role', 'Unassigned'),
                            'group': account_meta.get('group', ''),
                            'daily_send_limit': account_meta.get('daily_send_limit', 50),
                            'status': 'Offline'
                        }
                        accounts.append(account_data)
            
            return True, f"Extracted {len(accounts)} accounts", accounts
            
        except Exception as e:
            return False, f"Error extracting batch package: {str(e)}", []
