/**
 * ResourceService Unit Tests
 * 資源服務單元測試
 * 
 * 🆕 Phase 27: 為服務添加單元測試
 */

import { TestBed } from '@angular/core/testing';
import { ResourceService, Resource, ResourceFilter } from './resource.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

describe('ResourceService', () => {
  let service: ResourceService;
  let mockIpc: jasmine.SpyObj<ElectronIpcService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  
  const mockResources: Resource[] = [
    { id: 1, title: 'Group 1', type: 'group', status: 'joined', discovered_at: '2026-01-01', member_count: 100 },
    { id: 2, title: 'Channel 1', type: 'channel', status: 'discovered', discovered_at: '2026-01-02', member_count: 500 },
    { id: 3, title: 'Group 2', type: 'group', status: 'monitored', discovered_at: '2026-01-03', member_count: 50 }
  ];
  
  beforeEach(() => {
    mockIpc = jasmine.createSpyObj('ElectronIpcService', ['send', 'on']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    
    TestBed.configureTestingModule({
      providers: [
        ResourceService,
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast }
      ]
    });
    
    service = TestBed.inject(ResourceService);
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  describe('Initial State', () => {
    it('should have empty resources initially', () => {
      expect(service.resources()).toEqual([]);
    });
    
    it('should have empty selected IDs', () => {
      expect(service.selectedIds().size).toBe(0);
    });
    
    it('should have default filter', () => {
      const filter = service.filter();
      expect(filter.type).toBe('all');
      expect(filter.status).toBe('all');
    });
  });
  
  describe('loadResources', () => {
    it('should set isLoading and send IPC message', () => {
      service.loadResources();
      
      expect(service.isLoading()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('get-resources');
    });
  });
  
  describe('Selection Operations', () => {
    it('should toggle selection', () => {
      service.toggleSelection(1);
      expect(service.selectedIds().has(1)).toBeTrue();
      
      service.toggleSelection(1);
      expect(service.selectedIds().has(1)).toBeFalse();
    });
    
    it('should check if item is selected', () => {
      service.toggleSelection(1);
      expect(service.isSelected(1)).toBeTrue();
      expect(service.isSelected(2)).toBeFalse();
    });
    
    it('should deselect all', () => {
      service.toggleSelection(1);
      service.toggleSelection(2);
      service.deselectAll();
      
      expect(service.selectedIds().size).toBe(0);
    });
  });
  
  describe('Filter Operations', () => {
    it('should set filter', () => {
      service.setFilter({ type: 'group' });
      expect(service.filter().type).toBe('group');
    });
    
    it('should set search filter', () => {
      service.setSearch('test');
      expect(service.filter().search).toBe('test');
    });
    
    it('should clear filter', () => {
      service.setFilter({ type: 'group', status: 'joined' });
      service.clearFilter();
      
      const filter = service.filter();
      expect(filter.type).toBe('all');
      expect(filter.status).toBe('all');
    });
  });
  
  describe('Search Operations', () => {
    it('should send search request', () => {
      const query = { keyword: 'test', type: 'group' as const, limit: 10, includePrivate: false };
      service.search(query);
      
      expect(service.isSearching()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('search-resources', query);
      expect(mockToast.info).toHaveBeenCalledWith('正在搜索...');
    });
    
    it('should clear search results', () => {
      service.clearSearchResults();
      expect(service.searchResults()).toEqual([]);
    });
  });
  
  describe('Delete Operations', () => {
    it('should not delete without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      service.deleteResource(1);
      
      expect(mockIpc.send).not.toHaveBeenCalledWith('delete-resource', jasmine.any(Object));
    });
  });
  
  describe('Tag Operations', () => {
    it('should add tag', () => {
      service.addTag(1, 'VIP');
      expect(mockIpc.send).toHaveBeenCalledWith('add-resource-tag', { resourceId: 1, tag: 'VIP' });
    });
    
    it('should remove tag', () => {
      service.removeTag(1, 'VIP');
      expect(mockIpc.send).toHaveBeenCalledWith('remove-resource-tag', { resourceId: 1, tag: 'VIP' });
    });
  });
  
  describe('Batch Operations', () => {
    it('should show warning when no resources selected', () => {
      service.batchJoin('+1234567890');
      expect(mockToast.warning).toHaveBeenCalledWith('請先選擇資源');
    });
    
    it('should not batch delete without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      service.toggleSelection(1);
      
      service.batchDelete();
      
      expect(mockIpc.send).not.toHaveBeenCalledWith('batch-delete-resources', jasmine.any(Object));
    });
  });
  
  describe('Computed Properties', () => {
    it('should compute selected count', () => {
      service.toggleSelection(1);
      service.toggleSelection(2);
      
      expect(service.selectedCount()).toBe(2);
    });
  });
});
