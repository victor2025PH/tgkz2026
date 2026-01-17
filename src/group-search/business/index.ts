/**
 * TG-AI智控王 商業化模塊導出
 * Business Module Export
 */

// 報表系統
export { 
  ReportService, 
  ReportConfig,
  ReportType,
  ChartType,
  TimeRange,
  ReportData,
  SeriesData 
} from './report.service';

// API 開放平台
export { 
  APIGatewayService, 
  APIKey, 
  APIPermission,
  APIRequest,
  APIResponse,
  Webhook,
  WebhookEvent 
} from './api-gateway.service';

// 使用統計儀表板
export { UsageDashboardComponent } from './usage-dashboard.component';
