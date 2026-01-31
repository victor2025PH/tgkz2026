/**
 * VectorMemoryService Unit Tests
 * 向量記憶服務單元測試
 * 
 * 🆕 Phase 28: 為服務添加單元測試
 */

import { TestBed } from '@angular/core/testing';
import { VectorMemoryService } from './vector-memory.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

describe('VectorMemoryService', () => {
  let service: VectorMemoryService;
  let mockIpc: jasmine.SpyObj<ElectronIpcService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  
  beforeEach(() => {
    mockIpc = jasmine.createSpyObj('ElectronIpcService', ['send', 'on']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    
    TestBed.configureTestingModule({
      providers: [
        VectorMemoryService,
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast }
      ]
    });
    
    service = TestBed.inject(VectorMemoryService);
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  describe('Initial State', () => {
    it('should have default stats', () => {
      const stats = service.stats();
      expect(stats.totalMemories).toBe(0);
      expect(stats.totalUsers).toBe(0);
    });
    
    it('should have empty memories', () => {
      expect(service.memories()).toEqual([]);
    });
    
    it('should have empty search results', () => {
      expect(service.searchResults()).toEqual([]);
    });
    
    it('should have empty users', () => {
      expect(service.users()).toEqual([]);
    });
    
    it('should not be loading', () => {
      expect(service.isLoading()).toBeFalse();
    });
    
    it('should have no selected user', () => {
      expect(service.selectedUserId()).toBeNull();
    });
  });
  
  describe('Search Operations', () => {
    it('should search with query', () => {
      service.search('test query');
      
      expect(service.isLoading()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('search-vector-memory', { query: 'test query', userId: undefined });
    });
    
    it('should search with user filter', () => {
      service.search('test query', 'user-123');
      
      expect(mockIpc.send).toHaveBeenCalledWith('search-vector-memory', { query: 'test query', userId: 'user-123' });
    });
    
    it('should not search with empty query', () => {
      service.search('');
      
      expect(mockIpc.send).not.toHaveBeenCalledWith('search-vector-memory', jasmine.any(Object));
    });
    
    it('should clear search results', () => {
      service.clearSearchResults();
      expect(service.searchResults()).toEqual([]);
    });
  });
  
  describe('Memory Operations', () => {
    it('should add memory', () => {
      service.addMemory('user-123', 'test content', { key: 'value' });
      
      expect(mockIpc.send).toHaveBeenCalledWith('add-vector-memory', {
        userId: 'user-123',
        content: 'test content',
        metadata: { key: 'value' }
      });
    });
    
    it('should not delete memory without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      service.deleteMemory('mem-123');
      
      expect(mockIpc.send).not.toHaveBeenCalledWith('delete-vector-memory', jasmine.any(Object));
    });
    
    it('should delete memory with confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      
      service.deleteMemory('mem-123');
      
      expect(mockIpc.send).toHaveBeenCalledWith('delete-vector-memory', { id: 'mem-123' });
    });
    
    it('should load user memories', () => {
      service.loadUserMemories('user-123');
      
      expect(service.selectedUserId()).toBe('user-123');
      expect(service.isLoading()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('get-user-memories', { userId: 'user-123' });
    });
  });
  
  describe('User Operations', () => {
    it('should load user list', () => {
      service.loadUserList();
      
      expect(service.isLoading()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('get-memory-users');
    });
    
    it('should select user and load memories', () => {
      service.selectUser('user-123');
      
      expect(service.selectedUserId()).toBe('user-123');
      expect(mockIpc.send).toHaveBeenCalledWith('get-user-memories', { userId: 'user-123' });
    });
    
    it('should deselect user', () => {
      service.selectUser('user-123');
      service.selectUser(null);
      
      expect(service.selectedUserId()).toBeNull();
    });
  });
  
  describe('Maintenance Operations', () => {
    it('should not cleanup without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      service.cleanupOldMemories(90);
      
      expect(mockIpc.send).not.toHaveBeenCalledWith('cleanup-old-memories', jasmine.any(Object));
    });
    
    it('should cleanup with confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      
      service.cleanupOldMemories(90);
      
      expect(mockIpc.send).toHaveBeenCalledWith('cleanup-old-memories', { daysOld: 90 });
    });
    
    it('should not merge without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      service.mergeSimilarMemories();
      
      expect(mockIpc.send).not.toHaveBeenCalledWith('merge-similar-memories', jasmine.any(Object));
    });
    
    it('should merge with confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      
      service.mergeSimilarMemories(0.85);
      
      expect(mockIpc.send).toHaveBeenCalledWith('merge-similar-memories', { threshold: 0.85 });
    });
  });
  
  describe('Stats Operations', () => {
    it('should refresh stats', () => {
      service.refreshStats();
      
      expect(service.isLoading()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('get-vector-memory-stats');
    });
    
    it('should load all memories', () => {
      service.loadAllMemories();
      
      expect(service.isLoading()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('get-all-memories');
    });
  });
});
