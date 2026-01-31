/**
 * RagService Unit Tests
 * RAG 服務單元測試
 * 
 * 🆕 Phase 28: 為服務添加單元測試
 */

import { TestBed } from '@angular/core/testing';
import { RagService, RagStats } from './rag.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

describe('RagService', () => {
  let service: RagService;
  let mockIpc: jasmine.SpyObj<ElectronIpcService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  
  beforeEach(() => {
    mockIpc = jasmine.createSpyObj('ElectronIpcService', ['send', 'on']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    
    TestBed.configureTestingModule({
      providers: [
        RagService,
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast }
      ]
    });
    
    service = TestBed.inject(RagService);
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  describe('Initial State', () => {
    it('should not be initialized initially', () => {
      expect(service.isInitialized()).toBeFalse();
    });
    
    it('should not be loading initially', () => {
      expect(service.isLoading()).toBeFalse();
    });
    
    it('should not be indexing initially', () => {
      expect(service.isIndexing()).toBeFalse();
    });
    
    it('should have default stats', () => {
      const stats = service.stats();
      expect(stats.totalDocuments).toBe(0);
      expect(stats.totalChunks).toBe(0);
    });
    
    it('should have empty search results', () => {
      expect(service.searchResults()).toEqual([]);
    });
  });
  
  describe('initRagSystem', () => {
    it('should set isLoading and send IPC message', () => {
      service.initRagSystem();
      
      expect(service.isLoading()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('init-rag-system');
    });
  });
  
  describe('Indexing Operations', () => {
    it('should trigger learning', () => {
      service.triggerLearning();
      expect(mockIpc.send).toHaveBeenCalledWith('rag-trigger-learning');
    });
    
    it('should reindex conversations', () => {
      service.reindexConversations();
      expect(mockIpc.send).toHaveBeenCalledWith('rag-reindex-conversations');
    });
    
    it('should reindex high value conversations', () => {
      service.reindexHighValueConversations();
      expect(mockIpc.send).toHaveBeenCalledWith('rag-reindex-high-value');
    });
  });
  
  describe('Search Operations', () => {
    it('should search with query', () => {
      service.search('test query');
      
      expect(service.searchQuery()).toBe('test query');
      expect(service.isLoading()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('rag-search', { query: 'test query' });
    });
    
    it('should not search with empty query', () => {
      service.search('');
      
      expect(mockIpc.send).not.toHaveBeenCalledWith('rag-search', jasmine.any(Object));
    });
    
    it('should clear search results', () => {
      service.clearSearchResults();
      
      expect(service.searchResults()).toEqual([]);
      expect(service.searchQuery()).toBe('');
    });
  });
  
  describe('Knowledge Management', () => {
    it('should add knowledge', () => {
      service.addKnowledge('test content', 'test-category', { key: 'value' });
      
      expect(mockIpc.send).toHaveBeenCalledWith('rag-add-knowledge', {
        content: 'test content',
        category: 'test-category',
        metadata: { key: 'value' }
      });
    });
    
    it('should delete knowledge', () => {
      service.deleteKnowledge('doc-123');
      
      expect(mockIpc.send).toHaveBeenCalledWith('rag-delete-knowledge', { id: 'doc-123' });
    });
  });
  
  describe('Feedback', () => {
    it('should send feedback', () => {
      const feedback = {
        queryId: 'q-123',
        resultId: 'r-456',
        helpful: true,
        comment: 'Great result!'
      };
      
      service.sendFeedback(feedback);
      
      expect(mockIpc.send).toHaveBeenCalledWith('rag-feedback', feedback);
      expect(mockToast.success).toHaveBeenCalledWith('感謝您的反饋！');
    });
  });
  
  describe('Cleanup', () => {
    it('should cleanup knowledge', () => {
      service.cleanupKnowledge();
      expect(mockIpc.send).toHaveBeenCalledWith('rag-cleanup');
    });
  });
  
  describe('Stats', () => {
    it('should refresh stats', () => {
      service.refreshStats();
      
      expect(service.isLoading()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('get-rag-stats');
    });
  });
});
