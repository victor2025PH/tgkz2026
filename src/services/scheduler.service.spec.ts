/**
 * SchedulerService Unit Tests
 * 調度服務單元測試
 * 
 * 🆕 Phase 27: 為服務添加單元測試
 */

import { TestBed } from '@angular/core/testing';
import { SchedulerService, SchedulerStatus, ScheduledTask } from './scheduler.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

describe('SchedulerService', () => {
  let service: SchedulerService;
  let mockIpc: jasmine.SpyObj<ElectronIpcService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  
  const mockStatus: SchedulerStatus = {
    isRunning: true,
    uptime: 3661,
    totalTasks: 5,
    activeTasks: 2,
    tasks: [
      { name: 'task1', interval: 60, lastRun: null, nextRun: null, runCount: 0, status: 'idle', enabled: true },
      { name: 'task2', interval: 300, lastRun: '2026-01-25', nextRun: '2026-01-25', runCount: 5, status: 'running', enabled: true }
    ]
  };
  
  beforeEach(() => {
    mockIpc = jasmine.createSpyObj('ElectronIpcService', ['send', 'on']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    
    TestBed.configureTestingModule({
      providers: [
        SchedulerService,
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast }
      ]
    });
    
    service = TestBed.inject(SchedulerService);
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  describe('Initial State', () => {
    it('should have default status', () => {
      const status = service.status();
      expect(status.isRunning).toBeFalse();
      expect(status.uptime).toBe(0);
      expect(status.tasks).toEqual([]);
    });
    
    it('should have empty logs', () => {
      expect(service.logs()).toEqual([]);
    });
    
    it('should not be loading', () => {
      expect(service.isLoading()).toBeFalse();
    });
  });
  
  describe('Scheduler Control', () => {
    it('should send start command', () => {
      service.start();
      expect(mockIpc.send).toHaveBeenCalledWith('start-scheduler');
    });
    
    it('should send stop command', () => {
      service.stop();
      expect(mockIpc.send).toHaveBeenCalledWith('stop-scheduler');
    });
    
    it('should send restart command and show toast', () => {
      service.restart();
      expect(mockIpc.send).toHaveBeenCalledWith('restart-scheduler');
      expect(mockToast.info).toHaveBeenCalledWith('正在重啟調度器...');
    });
  });
  
  describe('Task Operations', () => {
    it('should run a specific task', () => {
      service.runTask('test-task');
      expect(mockIpc.send).toHaveBeenCalledWith('run-scheduler-task', { taskName: 'test-task' });
      expect(mockToast.info).toHaveBeenCalledWith('正在執行任務: test-task');
    });
    
    it('should enable a task', () => {
      service.enableTask('test-task');
      expect(mockIpc.send).toHaveBeenCalledWith('enable-scheduler-task', { taskName: 'test-task' });
    });
    
    it('should disable a task', () => {
      service.disableTask('test-task');
      expect(mockIpc.send).toHaveBeenCalledWith('disable-scheduler-task', { taskName: 'test-task' });
    });
    
    it('should update task interval', () => {
      service.updateTaskInterval('test-task', 120);
      expect(mockIpc.send).toHaveBeenCalledWith('update-task-interval', { taskName: 'test-task', interval: 120 });
      expect(mockToast.success).toHaveBeenCalledWith('任務間隔已更新');
    });
  });
  
  describe('Utility Methods', () => {
    it('should return correct status color', () => {
      expect(service.getTaskStatusColor('running')).toBe('text-green-400');
      expect(service.getTaskStatusColor('idle')).toBe('text-slate-400');
      expect(service.getTaskStatusColor('error')).toBe('text-red-400');
      expect(service.getTaskStatusColor('disabled')).toBe('text-slate-600');
    });
    
    it('should return correct status icon', () => {
      expect(service.getTaskStatusIcon('running')).toBe('🟢');
      expect(service.getTaskStatusIcon('idle')).toBe('⚪');
      expect(service.getTaskStatusIcon('error')).toBe('🔴');
      expect(service.getTaskStatusIcon('disabled')).toBe('⚫');
    });
    
    it('should format interval correctly', () => {
      expect(service.formatInterval(30)).toBe('30 秒');
      expect(service.formatInterval(120)).toBe('2 分鐘');
      expect(service.formatInterval(3600)).toBe('1 小時');
      expect(service.formatInterval(86400)).toBe('1 天');
    });
  });
  
  describe('Computed Properties', () => {
    it('should compute uptime formatted', () => {
      // 需要模擬 status 更新來測試
      expect(service.uptimeFormatted()).toBe('0s');
    });
  });
});
