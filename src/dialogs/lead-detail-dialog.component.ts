/**
 * Phase 10: Lead Detail Dialog (Client Operation Center)
 * Extracted from app.component.html (461 lines → largest dialog block)
 * 
 * Injects I18nService directly for translations, duplicates small
 * utility methods to avoid passing functions as inputs.
 */
import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { I18nService } from '../i18n.service';

@Component({
  selector: 'app-lead-detail-dialog',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  templateUrl: './lead-detail-dialog.component.html',
})
export class LeadDetailDialogComponent {
  private i18n = inject(I18nService);

  // ── Inputs (read-only state from parent) ──
  lead = input.required<any>();
  generationState = input<any>({});
  leadDetailView = input('sendMessage');
  chatHistory = input<any[]>([]);
  editableMessage = input('');
  messageMode = input('manual');
  senderAccounts = input<any[]>([]);
  selectedSenderId = input('');
  selectedChatUserId = input('');
  chatHistoryHasMore = input(false);
  chatHistoryLoadingMore = input(false);
  isLoadingChatHistory = input(false);
  isAiConfigured = input(false);
  aiApiType = input('');
  messageTemplates = input<any[]>([]);
  canSendMessage = input(false);
  ragEnabled = input(false);

  // ── Outputs (events) ──
  close = output<void>();
  generateMsg = output<void>();
  sendMsg = output<void>();
  loadHistory = output<string>();
  loadMoreHistory = output<void>();
  historyScroll = output<Event>();
  selectAttach = output<{ type: string; multi: boolean }>();
  addMoreAttach = output<string>();
  clearAttach = output<void>();
  removeAttach = output<number>();
  applyTmpl = output<Event>();
  updatePrompt = output<string>();
  addDnc = output<string>();
  editableMsgChange = output<string>();
  msgModeChange = output<string>();
  senderChange = output<string>();
  viewChange = output<string>();
  navigateTo = output<string>();

  // ── Translation helper ──
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }

  // ── Duplicated utility methods (small, pure functions) ──
  formatTimestamp(timestamp: Date | string | null | undefined): string {
    if (!timestamp) return '';
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return '';
    }
  }

  getOnlineStatusColor(status: string | undefined): string {
    switch (status) {
      case 'Online': return 'bg-green-500';
      case 'Recently': return 'bg-yellow-500';
      case 'Offline': return 'bg-slate-500';
      default: return 'bg-slate-400';
    }
  }

  getIntentLevelColor(level: string | undefined): string {
    switch (level) {
      case 'HOT': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'WARM': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'NEUTRAL': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'COLD': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  }

  getIntentLevelEmoji(level: string | undefined): string {
    switch (level) {
      case 'HOT': return '🔥';
      case 'WARM': return '🌡️';
      case 'NEUTRAL': return '😐';
      case 'COLD': return '❄️';
      default: return '⚪';
    }
  }

  trackByChatMessageId(index: number, message: any): any {
    return message.id || index;
  }

  getTotalAttachmentSize(): string {
    const attachments = this.generationState()?.attachments || [];
    const totalBytes = attachments.reduce((sum: number, a: any) => sum + (a.fileSize || 0), 0);
    return (totalBytes / 1024 / 1024).toFixed(2);
  }
}
