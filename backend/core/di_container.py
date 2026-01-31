"""
TG-Matrix 依賴注入容器
Phase C: Code Quality - 代碼重構

功能：
1. 服務註冊
2. 依賴解析
3. 生命週期管理
4. 作用域管理
"""

import asyncio
import inspect
from enum import Enum
from typing import (
    Any, Callable, Dict, List, Optional, Type, TypeVar, 
    Union, get_type_hints, Generic
)
from dataclasses import dataclass, field
from functools import wraps
import threading

from .logging import get_logger

logger = get_logger("di_container")

T = TypeVar('T')


class Lifetime(Enum):
    """服務生命週期"""
    TRANSIENT = "transient"    # 每次請求創建新實例
    SINGLETON = "singleton"    # 全局單例
    SCOPED = "scoped"          # 作用域內單例


@dataclass
class ServiceDescriptor:
    """服務描述符"""
    service_type: Type
    implementation: Union[Type, Callable, object]
    lifetime: Lifetime
    factory: Optional[Callable] = None
    instance: Optional[object] = None
    
    def is_factory(self) -> bool:
        return self.factory is not None
    
    def is_instance(self) -> bool:
        return self.instance is not None


class Scope:
    """作用域"""
    
    def __init__(self, container: 'DIContainer', parent: Optional['Scope'] = None):
        self.container = container
        self.parent = parent
        self._instances: Dict[Type, object] = {}
        self._lock = threading.Lock()
    
    def get_or_create(self, service_type: Type, factory: Callable) -> object:
        """獲取或創建作用域實例"""
        with self._lock:
            if service_type not in self._instances:
                self._instances[service_type] = factory()
            return self._instances[service_type]
    
    def dispose(self):
        """清理作用域"""
        for instance in self._instances.values():
            if hasattr(instance, 'dispose'):
                try:
                    instance.dispose()
                except Exception as e:
                    logger.error(f"Error disposing {type(instance).__name__}: {e}")
            elif hasattr(instance, 'close'):
                try:
                    instance.close()
                except Exception as e:
                    logger.error(f"Error closing {type(instance).__name__}: {e}")
        self._instances.clear()


class DIContainer:
    """依賴注入容器"""
    
    def __init__(self):
        self._services: Dict[Type, ServiceDescriptor] = {}
        self._singletons: Dict[Type, object] = {}
        self._aliases: Dict[str, Type] = {}
        self._lock = threading.Lock()
        self._initialized = False
    
    # ==================== 註冊方法 ====================
    
    def register(
        self,
        service_type: Type[T],
        implementation: Optional[Union[Type[T], Callable[..., T]]] = None,
        lifetime: Lifetime = Lifetime.TRANSIENT,
        instance: Optional[T] = None
    ) -> 'DIContainer':
        """
        註冊服務
        
        Args:
            service_type: 服務類型（接口或基類）
            implementation: 實現類或工廠函數
            lifetime: 生命週期
            instance: 預創建的實例（用於單例）
        
        Returns:
            self，支持鏈式調用
        """
        with self._lock:
            if instance is not None:
                # 直接使用實例
                descriptor = ServiceDescriptor(
                    service_type=service_type,
                    implementation=type(instance),
                    lifetime=Lifetime.SINGLETON,
                    instance=instance
                )
                self._singletons[service_type] = instance
            else:
                impl = implementation or service_type
                is_factory = callable(impl) and not isinstance(impl, type)
                
                descriptor = ServiceDescriptor(
                    service_type=service_type,
                    implementation=impl,
                    lifetime=lifetime,
                    factory=impl if is_factory else None
                )
            
            self._services[service_type] = descriptor
            logger.debug(f"Registered {service_type.__name__} with lifetime {lifetime.value}")
        
        return self
    
    def register_singleton(
        self,
        service_type: Type[T],
        implementation: Optional[Union[Type[T], Callable[..., T]]] = None
    ) -> 'DIContainer':
        """註冊單例服務"""
        return self.register(service_type, implementation, Lifetime.SINGLETON)
    
    def register_transient(
        self,
        service_type: Type[T],
        implementation: Optional[Union[Type[T], Callable[..., T]]] = None
    ) -> 'DIContainer':
        """註冊瞬態服務"""
        return self.register(service_type, implementation, Lifetime.TRANSIENT)
    
    def register_scoped(
        self,
        service_type: Type[T],
        implementation: Optional[Union[Type[T], Callable[..., T]]] = None
    ) -> 'DIContainer':
        """註冊作用域服務"""
        return self.register(service_type, implementation, Lifetime.SCOPED)
    
    def register_instance(self, service_type: Type[T], instance: T) -> 'DIContainer':
        """註冊實例"""
        return self.register(service_type, instance=instance)
    
    def register_factory(
        self,
        service_type: Type[T],
        factory: Callable[..., T],
        lifetime: Lifetime = Lifetime.TRANSIENT
    ) -> 'DIContainer':
        """註冊工廠函數"""
        return self.register(service_type, factory, lifetime)
    
    def alias(self, name: str, service_type: Type) -> 'DIContainer':
        """添加服務別名"""
        self._aliases[name] = service_type
        return self
    
    # ==================== 解析方法 ====================
    
    def resolve(self, service_type: Type[T], scope: Optional[Scope] = None) -> T:
        """
        解析服務
        
        Args:
            service_type: 服務類型
            scope: 可選的作用域
        
        Returns:
            服務實例
        
        Raises:
            KeyError: 服務未註冊
        """
        # 檢查別名
        if isinstance(service_type, str):
            if service_type not in self._aliases:
                raise KeyError(f"Service alias not found: {service_type}")
            service_type = self._aliases[service_type]
        
        # 檢查註冊
        if service_type not in self._services:
            raise KeyError(f"Service not registered: {service_type.__name__}")
        
        descriptor = self._services[service_type]
        
        # 根據生命週期處理
        if descriptor.lifetime == Lifetime.SINGLETON:
            return self._get_singleton(service_type, descriptor)
        elif descriptor.lifetime == Lifetime.SCOPED:
            if scope is None:
                raise ValueError(f"Scoped service {service_type.__name__} requires a scope")
            return self._get_scoped(service_type, descriptor, scope)
        else:
            return self._create_instance(descriptor)
    
    def resolve_optional(
        self,
        service_type: Type[T],
        scope: Optional[Scope] = None
    ) -> Optional[T]:
        """解析服務（可選，不存在返回 None）"""
        try:
            return self.resolve(service_type, scope)
        except KeyError:
            return None
    
    def resolve_all(self, service_type: Type[T]) -> List[T]:
        """解析所有匹配的服務"""
        instances = []
        for registered_type, descriptor in self._services.items():
            if issubclass(registered_type, service_type) or registered_type == service_type:
                instances.append(self.resolve(registered_type))
        return instances
    
    def _get_singleton(self, service_type: Type, descriptor: ServiceDescriptor) -> object:
        """獲取單例"""
        with self._lock:
            if service_type not in self._singletons:
                self._singletons[service_type] = self._create_instance(descriptor)
            return self._singletons[service_type]
    
    def _get_scoped(
        self,
        service_type: Type,
        descriptor: ServiceDescriptor,
        scope: Scope
    ) -> object:
        """獲取作用域實例"""
        return scope.get_or_create(
            service_type,
            lambda: self._create_instance(descriptor)
        )
    
    def _create_instance(self, descriptor: ServiceDescriptor) -> object:
        """創建實例"""
        # 如果有預創建實例
        if descriptor.instance is not None:
            return descriptor.instance
        
        # 如果是工廠函數
        if descriptor.is_factory():
            return self._call_with_injection(descriptor.factory)
        
        # 否則是類，需要構造
        impl = descriptor.implementation
        return self._call_with_injection(impl)
    
    def _call_with_injection(self, callable_obj: Callable) -> Any:
        """調用可調用對象並注入依賴"""
        # 獲取類型提示
        try:
            hints = get_type_hints(callable_obj.__init__ if isinstance(callable_obj, type) else callable_obj)
        except Exception:
            hints = {}
        
        # 獲取參數
        sig = inspect.signature(callable_obj.__init__ if isinstance(callable_obj, type) else callable_obj)
        
        kwargs = {}
        for param_name, param in sig.parameters.items():
            if param_name == 'self':
                continue
            
            # 獲取類型
            param_type = hints.get(param_name)
            
            if param_type and param_type in self._services:
                kwargs[param_name] = self.resolve(param_type)
            elif param.default is not inspect.Parameter.empty:
                # 有默認值，跳過
                pass
            else:
                # 無法解析的必需參數
                if param_type:
                    logger.warning(f"Cannot resolve parameter {param_name}: {param_type}")
        
        if isinstance(callable_obj, type):
            return callable_obj(**kwargs)
        else:
            return callable_obj(**kwargs)
    
    # ==================== 作用域管理 ====================
    
    def create_scope(self) -> Scope:
        """創建新作用域"""
        return Scope(self)
    
    def create_child_scope(self, parent: Scope) -> Scope:
        """創建子作用域"""
        return Scope(self, parent)
    
    # ==================== 生命週期管理 ====================
    
    async def initialize_async(self):
        """異步初始化所有單例服務"""
        if self._initialized:
            return
        
        for service_type, descriptor in self._services.items():
            if descriptor.lifetime == Lifetime.SINGLETON:
                instance = self.resolve(service_type)
                if hasattr(instance, 'initialize'):
                    if asyncio.iscoroutinefunction(instance.initialize):
                        await instance.initialize()
                    else:
                        instance.initialize()
        
        self._initialized = True
        logger.info("DI container initialized")
    
    def initialize(self):
        """同步初始化"""
        if self._initialized:
            return
        
        for service_type, descriptor in self._services.items():
            if descriptor.lifetime == Lifetime.SINGLETON:
                instance = self.resolve(service_type)
                if hasattr(instance, 'initialize') and not asyncio.iscoroutinefunction(instance.initialize):
                    instance.initialize()
        
        self._initialized = True
    
    async def shutdown_async(self):
        """異步關閉所有服務"""
        for service_type, instance in self._singletons.items():
            if hasattr(instance, 'shutdown'):
                try:
                    if asyncio.iscoroutinefunction(instance.shutdown):
                        await instance.shutdown()
                    else:
                        instance.shutdown()
                except Exception as e:
                    logger.error(f"Error shutting down {service_type.__name__}: {e}")
            elif hasattr(instance, 'close'):
                try:
                    if asyncio.iscoroutinefunction(instance.close):
                        await instance.close()
                    else:
                        instance.close()
                except Exception as e:
                    logger.error(f"Error closing {service_type.__name__}: {e}")
        
        self._singletons.clear()
        self._initialized = False
        logger.info("DI container shut down")
    
    def shutdown(self):
        """同步關閉"""
        for service_type, instance in self._singletons.items():
            if hasattr(instance, 'shutdown') and not asyncio.iscoroutinefunction(instance.shutdown):
                try:
                    instance.shutdown()
                except Exception as e:
                    logger.error(f"Error shutting down {service_type.__name__}: {e}")
            elif hasattr(instance, 'close') and not asyncio.iscoroutinefunction(instance.close):
                try:
                    instance.close()
                except Exception as e:
                    logger.error(f"Error closing {service_type.__name__}: {e}")
        
        self._singletons.clear()
        self._initialized = False
    
    # ==================== 工具方法 ====================
    
    def is_registered(self, service_type: Type) -> bool:
        """檢查服務是否已註冊"""
        return service_type in self._services
    
    def get_registered_services(self) -> List[Type]:
        """獲取所有已註冊的服務類型"""
        return list(self._services.keys())
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        by_lifetime = {lt.value: 0 for lt in Lifetime}
        for descriptor in self._services.values():
            by_lifetime[descriptor.lifetime.value] += 1
        
        return {
            "total_registered": len(self._services),
            "active_singletons": len(self._singletons),
            "by_lifetime": by_lifetime,
            "initialized": self._initialized
        }


# 裝飾器

def injectable(
    lifetime: Lifetime = Lifetime.TRANSIENT,
    as_type: Optional[Type] = None
):
    """
    標記類為可注入
    
    Usage:
        @injectable(lifetime=Lifetime.SINGLETON)
        class MyService:
            pass
    """
    def decorator(cls: Type[T]) -> Type[T]:
        cls._di_lifetime = lifetime
        cls._di_as_type = as_type or cls
        return cls
    return decorator


def inject(service_type: Type[T]) -> T:
    """
    屬性注入標記
    
    Usage:
        class MyClass:
            service: MyService = inject(MyService)
    """
    # 這是一個佔位符，實際注入由容器處理
    return None  # type: ignore


# 全局容器
_container: Optional[DIContainer] = None


def get_container() -> DIContainer:
    """獲取全局容器"""
    global _container
    if _container is None:
        _container = DIContainer()
    return _container


def set_container(container: DIContainer):
    """設置全局容器"""
    global _container
    _container = container


def reset_container():
    """重置全局容器"""
    global _container
    if _container:
        _container.shutdown()
    _container = None


__all__ = [
    'Lifetime',
    'ServiceDescriptor',
    'Scope',
    'DIContainer',
    'injectable',
    'inject',
    'get_container',
    'set_container',
    'reset_container'
]
