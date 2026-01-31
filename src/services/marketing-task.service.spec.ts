/**
 * 營銷任務服務單元測試
 * Marketing Task Service Unit Tests
 * 
 * 🆕 測試優化: 前端單元測試
 */

import { TestBed } from '@angular/core/testing';
import { MarketingTaskService } from './marketing-task.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { GoalType, ExecutionMode, TaskStatus } from '../models/marketing-task.models';

describe('MarketingTaskService', () => {
  let service: MarketingTaskService;
  let ipcMock: jasmine.SpyObj<ElectronIpcService>;

  beforeEach(() => {
    ipcMock = jasmine.createSpyObj('ElectronIpcService', ['send', 'invoke', 'on']);
    ipcMock.invoke.and.returnValue(Promise.resolve({ success: true, tasks: [] }));

    TestBed.configureTestingModule({
      providers: [
        MarketingTaskService,
        { provide: ElectronIpcService, useValue: ipcMock }
      ]
    });

    service = TestBed.inject(MarketingTaskService);
  });

  describe('任務創建', () => {
    it('應該創建新任務', async () => {
      ipcMock.invoke.and.returnValue(Promise.resolve({
        success: true,
        task: {
          id: 'task-123',
          name: '測試任務',
          goalType: 'conversion',
          status: 'draft'
        }
      }));

      const taskId = await service.create({
        name: '測試任務',
        goalType: 'conversion' as GoalType,
        executionMode: 'hybrid' as ExecutionMode
      });

      expect(taskId).toBeTruthy();
      expect(ipcMock.invoke).toHaveBeenCalledWith('create-marketing-task', jasmine.any(Object));
    });

    it('應該使用默認值', async () => {
      ipcMock.invoke.and.returnValue(Promise.resolve({
        success: true,
        task: { id: 'task-456' }
      }));

      await service.create({
        name: '基本任務',
        goalType: 'conversion' as GoalType,
        executionMode: 'hybrid' as ExecutionMode
      });

      const callArgs = ipcMock.invoke.calls.mostRecent().args[1];
      expect(callArgs.name).toBe('基本任務');
      expect(callArgs.goalType).toBe('conversion');
    });
  });

  describe('任務狀態管理', () => {
    it('應該啟動任務', () => {
      service.startTask('task-123');

      expect(ipcMock.send).toHaveBeenCalledWith('start-marketing-task', { id: 'task-123' });
    });

    it('應該暫停任務', () => {
      service.pauseTask('task-123');

      expect(ipcMock.send).toHaveBeenCalledWith('pause-marketing-task', { id: 'task-123' });
    });

    it('應該恢復任務', () => {
      service.resumeTask('task-123');

      expect(ipcMock.send).toHaveBeenCalledWith('resume-marketing-task', { id: 'task-123' });
    });

    it('應該完成任務', () => {
      service.completeTask('task-123');

      expect(ipcMock.send).toHaveBeenCalledWith('complete-marketing-task', { id: 'task-123' });
    });
  });

  describe('批量操作', () => {
    it('應該批量啟動任務', () => {
      const taskIds = ['task-1', 'task-2', 'task-3'];
      
      service.batchStartTasks(taskIds);

      expect(ipcMock.send).toHaveBeenCalledTimes(3);
    });

    it('應該批量暫停任務', () => {
      const taskIds = ['task-1', 'task-2'];
      
      service.batchPauseTasks(taskIds);

      expect(ipcMock.send).toHaveBeenCalledTimes(2);
    });

    it('應該批量刪除任務', () => {
      const taskIds = ['task-1', 'task-2'];
      
      service.batchDeleteTasks(taskIds);

      expect(ipcMock.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('計算屬性', () => {
    it('應該計算活躍任務數', () => {
      // 設置測試數據
      (service as any)._tasks.set([
        { id: '1', status: 'running' },
        { id: '2', status: 'running' },
        { id: '3', status: 'completed' },
        { id: '4', status: 'draft' }
      ] as any);

      const activeTasks = service.activeTasks();

      expect(activeTasks.length).toBe(2);
    });

    it('應該計算總體統計', () => {
      (service as any)._tasks.set([
        { id: '1', status: 'running', stats: { contacted: 100, converted: 10 } },
        { id: '2', status: 'completed', stats: { contacted: 200, converted: 30 } }
      ] as any);

      const stats = service.overallStats();

      expect(stats.totalTasks).toBe(2);
      expect(stats.totalContacted).toBe(300);
      expect(stats.totalConverted).toBe(40);
    });
  });
});
