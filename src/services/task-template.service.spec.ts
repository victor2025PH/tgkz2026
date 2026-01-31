/**
 * 任務模板服務單元測試
 * Task Template Service Unit Tests
 * 
 * 🆕 測試優化: 前端單元測試
 */

import { TestBed } from '@angular/core/testing';
import { TaskTemplateService, TaskTemplate } from './task-template.service';

describe('TaskTemplateService', () => {
  let service: TaskTemplateService;

  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [TaskTemplateService]
    });

    service = TestBed.inject(TaskTemplateService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('模板創建', () => {
    it('應該創建新模板', () => {
      const template = service.createTemplate({
        name: '測試模板',
        goalType: 'conversion',
        executionMode: 'hybrid',
        audienceSource: 'recent',
        intentScoreMin: 70,
        isFavorite: false
      });

      expect(template).toBeTruthy();
      expect(template.id).toMatch(/^tpl-/);
      expect(template.name).toBe('測試模板');
      expect(template.isSystem).toBe(false);
    });

    it('應該初始化統計數據', () => {
      const template = service.createTemplate({
        name: '統計測試',
        goalType: 'conversion',
        executionMode: 'hybrid',
        audienceSource: 'recent',
        intentScoreMin: 50,
        isFavorite: false
      });

      expect(template.usageCount).toBe(0);
      expect(template.successCount).toBe(0);
      expect(template.totalContacted).toBe(0);
      expect(template.totalConverted).toBe(0);
    });
  });

  describe('系統模板', () => {
    it('應該包含系統預設模板', () => {
      const systemTemplates = service.systemTemplates();

      expect(systemTemplates.length).toBeGreaterThan(0);
      expect(systemTemplates.every(t => t.isSystem)).toBe(true);
    });

    it('系統模板應該有正確的屬性', () => {
      const systemTemplates = service.systemTemplates();
      
      systemTemplates.forEach(template => {
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.goalType).toBeTruthy();
        expect(template.executionMode).toBeTruthy();
      });
    });
  });

  describe('模板操作', () => {
    it('應該更新模板', () => {
      const template = service.createTemplate({
        name: '原始名稱',
        goalType: 'conversion',
        executionMode: 'hybrid',
        audienceSource: 'recent',
        intentScoreMin: 50,
        isFavorite: false
      });

      service.updateTemplate(template.id, { name: '新名稱' });

      const updated = service.getTemplate(template.id);
      expect(updated?.name).toBe('新名稱');
    });

    it('應該刪除模板', () => {
      const template = service.createTemplate({
        name: '待刪除',
        goalType: 'conversion',
        executionMode: 'hybrid',
        audienceSource: 'recent',
        intentScoreMin: 50,
        isFavorite: false
      });

      service.deleteTemplate(template.id);

      const deleted = service.getTemplate(template.id);
      expect(deleted).toBeUndefined();
    });

    it('應該切換收藏狀態', () => {
      const template = service.createTemplate({
        name: '收藏測試',
        goalType: 'conversion',
        executionMode: 'hybrid',
        audienceSource: 'recent',
        intentScoreMin: 50,
        isFavorite: false
      });

      service.toggleFavorite(template.id);

      const updated = service.getTemplate(template.id);
      expect(updated?.isFavorite).toBe(true);
    });
  });

  describe('使用記錄', () => {
    it('應該記錄模板使用', () => {
      const template = service.createTemplate({
        name: '使用測試',
        goalType: 'conversion',
        executionMode: 'hybrid',
        audienceSource: 'recent',
        intentScoreMin: 50,
        isFavorite: false
      });

      service.recordUsage(template.id);
      service.recordUsage(template.id);

      const updated = service.getTemplate(template.id);
      expect(updated?.usageCount).toBe(2);
    });

    it('應該記錄任務結果', () => {
      const template = service.createTemplate({
        name: '結果測試',
        goalType: 'conversion',
        executionMode: 'hybrid',
        audienceSource: 'recent',
        intentScoreMin: 50,
        isFavorite: false
      });

      service.recordResult(template.id, 100, 20, true);

      const updated = service.getTemplate(template.id);
      expect(updated?.totalContacted).toBe(100);
      expect(updated?.totalConverted).toBe(20);
      expect(updated?.successCount).toBe(1);
    });
  });

  describe('成功率計算', () => {
    it('應該計算正確的成功率', () => {
      const template: TaskTemplate = {
        id: 'test',
        name: 'Test',
        goalType: 'conversion',
        executionMode: 'hybrid',
        audienceSource: 'recent',
        intentScoreMin: 50,
        usageCount: 10,
        successCount: 5,
        totalContacted: 100,
        totalConverted: 25,
        isSystem: false,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const rate = service.getSuccessRate(template);

      expect(rate).toBe(25); // 25/100 * 100 = 25%
    });

    it('應該處理零接觸的情況', () => {
      const template: TaskTemplate = {
        id: 'test',
        name: 'Test',
        goalType: 'conversion',
        executionMode: 'hybrid',
        audienceSource: 'recent',
        intentScoreMin: 50,
        usageCount: 0,
        successCount: 0,
        totalContacted: 0,
        totalConverted: 0,
        isSystem: false,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const rate = service.getSuccessRate(template);

      expect(rate).toBe(0);
    });
  });

  describe('模板搜索', () => {
    it('應該按名稱搜索', () => {
      service.createTemplate({
        name: '特殊模板ABC',
        goalType: 'conversion',
        executionMode: 'hybrid',
        audienceSource: 'recent',
        intentScoreMin: 50,
        isFavorite: false
      });

      const results = service.searchTemplates('ABC');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(t => t.name.includes('ABC'))).toBe(true);
    });
  });

  describe('推薦模板', () => {
    it('應該返回推薦模板（使用次數 >= 3）', () => {
      // 創建並使用模板多次
      const template = service.createTemplate({
        name: '高使用模板',
        goalType: 'conversion',
        executionMode: 'hybrid',
        audienceSource: 'recent',
        intentScoreMin: 50,
        isFavorite: false
      });

      // 模擬使用3次
      service.recordUsage(template.id);
      service.recordUsage(template.id);
      service.recordUsage(template.id);
      service.recordResult(template.id, 100, 20, true);

      const recommended = service.recommendedTemplates();

      // 推薦列表應包含使用次數達標的模板
      expect(recommended.some(t => t.id === template.id)).toBe(true);
    });
  });
});
