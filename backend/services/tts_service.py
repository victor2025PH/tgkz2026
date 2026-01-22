"""
TTS Service - GPT-SoVITS 語音合成服務
Text-to-Speech service for multi-role voice generation

支持：
- GPT-SoVITS v2 API
- 多角色語音克隆
- 語音緩存
- 異步生成
"""
import asyncio
import aiohttp
import hashlib
import json
import os
import sys
import tempfile
import time
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass


@dataclass
class VoiceConfig:
    """語音配置"""
    ref_audio_path: str = ""           # 參考音頻路徑
    prompt_text: str = ""              # 參考音頻的文本
    prompt_language: str = "zh"        # 參考文本語言
    text_language: str = "zh"          # 合成文本語言
    speed: float = 1.0                 # 語速
    top_k: int = 10
    top_p: float = 1.0
    temperature: float = 1.0


class TTSService:
    """
    GPT-SoVITS 語音合成服務
    
    API 端點：http://127.0.0.1:9880
    """
    
    def __init__(
        self,
        endpoint: str = "http://127.0.0.1:9880",
        cache_dir: str = None,
        log_callback=None
    ):
        self.endpoint = endpoint.rstrip('/')
        self.cache_dir = Path(cache_dir) if cache_dir else Path(tempfile.gettempdir()) / "tts_cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.log_callback = log_callback or self._default_log
        
        # 角色語音配置緩存
        self._voice_configs: Dict[str, VoiceConfig] = {}
        
        # 默認語音配置
        self._default_config = VoiceConfig()
        
        # 連接狀態
        self._connected = False
        self._last_check = 0
        
    def _default_log(self, message: str, level: str = "info"):
        print(f"[TTS] [{level.upper()}] {message}", file=sys.stderr)
    
    async def check_connection(self) -> bool:
        """檢查 GPT-SoVITS 服務是否可用"""
        # 5 秒內不重複檢查
        if time.time() - self._last_check < 5:
            return self._connected
        
        self.log_callback(f"[TTS] 正在檢查連接: {self.endpoint}", "info")
        
        try:
            async with aiohttp.ClientSession() as session:
                # 嘗試多個端點
                endpoints_to_try = [
                    self.endpoint,
                    f"{self.endpoint}/",
                    f"{self.endpoint}/tts",
                ]
                
                for url in endpoints_to_try:
                    try:
                        # 先嘗試 GET
                        async with session.get(
                            url,
                            timeout=aiohttp.ClientTimeout(total=5)
                        ) as resp:
                            self.log_callback(f"[TTS] GET {url} -> {resp.status}", "info")
                            if resp.status in [200, 404, 405]:  # 405 = Method Not Allowed 也表示服務存在
                                self._connected = True
                                self._last_check = time.time()
                                self.log_callback(f"✅ GPT-SoVITS 服務已連接: {url}", "success")
                                return True
                    except Exception as e:
                        self.log_callback(f"[TTS] GET {url} 失敗: {e}", "warning")
                        continue
                
                # 如果 GET 都失敗，嘗試 POST（某些 TTS 服務只接受 POST）
                try:
                    test_payload = {"text": "test", "text_language": "zh"}
                    async with session.post(
                        self.endpoint,
                        json=test_payload,
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as resp:
                        self.log_callback(f"[TTS] POST {self.endpoint} -> {resp.status}", "info")
                        # 任何響應都表示服務存在
                        if resp.status in [200, 400, 422, 500]:
                            self._connected = True
                            self._last_check = time.time()
                            self.log_callback(f"✅ GPT-SoVITS 服務已連接（POST）: {self.endpoint}", "success")
                            return True
                except Exception as e:
                    self.log_callback(f"[TTS] POST 測試失敗: {e}", "warning")
                
                self._connected = False
                self._last_check = time.time()
                self.log_callback(f"❌ GPT-SoVITS 服務不可用", "warning")
                return False
                    
        except Exception as e:
            self._connected = False
            self._last_check = time.time()
            self.log_callback(f"❌ GPT-SoVITS 服務不可用: {e}", "warning")
            return False
    
    def set_voice_config(self, role_id: str, config: Dict[str, Any]):
        """設置角色的語音配置"""
        self._voice_configs[role_id] = VoiceConfig(
            ref_audio_path=config.get('ref_audio_path', ''),
            prompt_text=config.get('prompt_text', ''),
            prompt_language=config.get('prompt_language', 'zh'),
            text_language=config.get('text_language', 'zh'),
            speed=config.get('speed', 1.0),
            top_k=config.get('top_k', 10),
            top_p=config.get('top_p', 1.0),
            temperature=config.get('temperature', 1.0)
        )
        self.log_callback(f"🔊 已設置角色 {role_id} 的語音配置", "info")
    
    def get_voice_config(self, role_id: str = None) -> VoiceConfig:
        """獲取角色的語音配置"""
        if role_id and role_id in self._voice_configs:
            return self._voice_configs[role_id]
        return self._default_config
    
    async def generate_voice(
        self,
        text: str,
        role_id: str = None,
        role_voice: str = None,  # 直接傳入參考音頻路徑
        use_cache: bool = True
    ) -> Optional[str]:
        """
        生成語音文件
        
        Args:
            text: 要合成的文本
            role_id: 角色 ID（用於獲取預設配置）
            role_voice: 參考音頻路徑（覆蓋配置）
            use_cache: 是否使用緩存
            
        Returns:
            生成的語音文件路徑，失敗返回 None
        """
        if not text or not text.strip():
            return None
        
        # 檢查服務可用性
        if not await self.check_connection():
            self.log_callback("⚠️ TTS 服務不可用，跳過語音生成", "warning")
            return None
        
        # 獲取配置
        config = self.get_voice_config(role_id)
        ref_audio = role_voice or config.ref_audio_path
        
        # 生成緩存鍵
        cache_key = hashlib.md5(f"{text}_{ref_audio}_{config.speed}".encode()).hexdigest()
        cache_file = self.cache_dir / f"{cache_key}.wav"
        
        # 檢查緩存
        if use_cache and cache_file.exists():
            self.log_callback(f"📁 使用緩存語音: {cache_file.name}", "info")
            return str(cache_file)
        
        try:
            # 構建請求參數
            payload = {
                "text": text,
                "text_language": config.text_language,
            }
            
            # 如果有參考音頻
            if ref_audio and os.path.exists(ref_audio):
                payload.update({
                    "ref_audio_path": ref_audio,
                    "prompt_text": config.prompt_text,
                    "prompt_language": config.prompt_language,
                })
            
            # 添加生成參數
            payload.update({
                "top_k": config.top_k,
                "top_p": config.top_p,
                "temperature": config.temperature,
                "speed": config.speed,
            })
            
            self.log_callback(f"🎙️ 正在生成語音: {text[:30]}...", "info")
            
            # 調用 GPT-SoVITS API
            async with aiohttp.ClientSession() as session:
                # GPT-SoVITS v2 API 格式
                async with session.post(
                    self.endpoint,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)  # 語音生成可能較慢
                ) as resp:
                    if resp.status == 200:
                        content_type = resp.headers.get('Content-Type', '')
                        
                        if 'audio' in content_type or 'octet-stream' in content_type:
                            # 直接返回音頻數據
                            audio_data = await resp.read()
                            
                            # 保存到緩存
                            with open(cache_file, 'wb') as f:
                                f.write(audio_data)
                            
                            self.log_callback(f"✅ 語音已生成: {cache_file.name}", "success")
                            return str(cache_file)
                        else:
                            # 可能返回 JSON 錯誤
                            try:
                                error_data = await resp.json()
                                self.log_callback(f"❌ TTS 返回錯誤: {error_data}", "error")
                            except:
                                text_data = await resp.text()
                                self.log_callback(f"❌ TTS 返回: {text_data[:200]}", "error")
                    else:
                        error_text = await resp.text()
                        self.log_callback(f"❌ TTS 請求失敗 [{resp.status}]: {error_text[:200]}", "error")
            
            return None
            
        except asyncio.TimeoutError:
            self.log_callback("❌ TTS 請求超時", "error")
            return None
        except Exception as e:
            self.log_callback(f"❌ TTS 生成失敗: {e}", "error")
            return None
    
    async def generate_voice_stream(
        self,
        text: str,
        role_id: str = None
    ):
        """
        流式生成語音（用於長文本）
        
        Yields:
            音頻數據塊
        """
        # GPT-SoVITS 支持流式輸出時使用
        # 目前先返回完整文件
        voice_file = await self.generate_voice(text, role_id)
        if voice_file:
            with open(voice_file, 'rb') as f:
                yield f.read()
    
    def clear_cache(self, max_age_hours: int = 24):
        """清理過期緩存"""
        try:
            now = time.time()
            max_age_seconds = max_age_hours * 3600
            cleared = 0
            
            for file in self.cache_dir.glob("*.wav"):
                if now - file.stat().st_mtime > max_age_seconds:
                    file.unlink()
                    cleared += 1
            
            if cleared > 0:
                self.log_callback(f"🧹 已清理 {cleared} 個過期語音緩存", "info")
                
        except Exception as e:
            self.log_callback(f"⚠️ 清理緩存失敗: {e}", "warning")
    
    def get_status(self) -> Dict[str, Any]:
        """獲取服務狀態"""
        cache_files = list(self.cache_dir.glob("*.wav"))
        cache_size = sum(f.stat().st_size for f in cache_files) / (1024 * 1024)  # MB
        
        return {
            "endpoint": self.endpoint,
            "connected": self._connected,
            "lastCheck": self._last_check,
            "cacheDir": str(self.cache_dir),
            "cacheFiles": len(cache_files),
            "cacheSizeMB": round(cache_size, 2),
            "voiceConfigs": len(self._voice_configs)
        }


# 全局實例
_tts_service: Optional[TTSService] = None


def init_tts_service(
    endpoint: str = "http://127.0.0.1:9880",
    cache_dir: str = None,
    log_callback=None
) -> TTSService:
    """初始化 TTS 服務"""
    global _tts_service
    _tts_service = TTSService(
        endpoint=endpoint,
        cache_dir=cache_dir,
        log_callback=log_callback
    )
    return _tts_service


def get_tts_service() -> Optional[TTSService]:
    """獲取 TTS 服務實例"""
    return _tts_service
