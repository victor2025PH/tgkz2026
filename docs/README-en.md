# TG-Matrix User Manual

<p align="center">
  <img src="../assets/logo.png" alt="TG-Matrix Logo" width="120">
</p>

<p align="center">
  <strong>🚀 Powerful Telegram Marketing Automation Platform</strong>
</p>

<p align="center">
  <a href="README-zh-CN.md">简体中文</a> |
  <a href="TG-Matrix使用說明手冊.md">繁體中文</a> |
  <strong>English</strong>
</p>

---

## 📑 Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Features](#features)
4. [Account Management](#account-management)
5. [Keyword Monitoring](#keyword-monitoring)
6. [AI Assistant](#ai-assistant)
7. [Automation](#automation)
8. [Membership Plans](#membership-plans)
9. [FAQ](#faq)
10. [Support](#support)

---

## Introduction

TG-Matrix is a professional Telegram marketing automation tool designed for marketers, sales teams, and community managers. It helps you:

- 🎯 **Capture Leads** - Automatically capture potential customers through keyword monitoring
- 🤖 **AI Auto-Reply** - Intelligent responses powered by AI (Gemini, OpenAI, local models)
- 📊 **Multi-Account Management** - Manage multiple Telegram accounts in one place
- 🔄 **Automation Workflows** - Set up automated marketing campaigns
- 📈 **Analytics Dashboard** - Track performance and conversion rates

---

## Quick Start

### System Requirements

- **Operating System**: Windows 10/11 (64-bit)
- **Memory**: 4GB RAM minimum (8GB recommended)
- **Storage**: 500MB free disk space
- **Network**: Stable internet connection

### Installation Steps

1. Download the latest version from the official website
2. Run the installer and follow the prompts
3. Launch TG-Matrix
4. Complete the initial setup wizard

### First-Time Setup

1. **Add Your First Account**
   - Click "Add Account" in the sidebar
   - Enter your Telegram phone number
   - Complete phone verification
   - Or import an existing session file

2. **Configure Keywords**
   - Navigate to "Monitoring"
   - Add keywords to track
   - Select groups to monitor

3. **Set Up AI Assistant**
   - Go to "AI Center"
   - Enter your API key
   - Customize AI persona

---

## Features

### Dashboard

The dashboard provides an overview of your marketing performance:

| Metric | Description |
|--------|-------------|
| Total Accounts | Number of connected Telegram accounts |
| Active Leads | Leads currently being tracked |
| Messages Sent | Total messages sent today |
| AI Calls | Number of AI-generated responses |
| Conversion Rate | Lead to customer conversion percentage |

### Navigation

| Menu Item | Function |
|-----------|----------|
| Dashboard | Overview and quick actions |
| Accounts | Manage Telegram accounts |
| Leads | View and manage captured leads |
| Monitoring | Keyword and group monitoring |
| AI Center | AI configuration and testing |
| Automation | Marketing automation workflows |
| Analytics | Performance charts and reports |
| Settings | Application preferences |

---

## Account Management

### Adding Accounts

#### Method 1: Phone Login
1. Click "Add Account"
2. Enter phone number with country code
3. Input verification code
4. Optional: Enter 2FA password

#### Method 2: Session Import
1. Click "Import Session"
2. Select `.session` or `.tgpkg` file
3. Enter API credentials if prompted

### Account Status

| Status | Description |
|--------|-------------|
| 🟢 Connected | Account is active and ready |
| 🟡 Connecting | Connection in progress |
| 🔴 Disconnected | Connection lost |
| ⚠️ Limited | Account has restrictions |

### Proxy Configuration

For improved stability, configure a proxy:

1. Click account settings (⚙️)
2. Select "Proxy Settings"
3. Choose proxy type (SOCKS5/HTTP)
4. Enter proxy details

---

## Keyword Monitoring

### Creating Keyword Sets

1. Navigate to "Monitoring"
2. Click "Add Keyword Set"
3. Enter keywords (one per line)
4. Enable options:
   - Case sensitive matching
   - Regex support
   - Exclude patterns

### Monitoring Groups

1. Click "Add Group"
2. Enter group username or link
3. Select monitoring keywords
4. Set alert preferences

### Captured Leads

When keywords are detected, leads are automatically:
- Added to your lead list
- Categorized by source
- Ready for follow-up

---

## AI Assistant

### Supported Providers

| Provider | Features |
|----------|----------|
| Google Gemini | Fast, reliable, multi-language |
| OpenAI GPT | Powerful, versatile |
| Local Models | Privacy-focused, offline |

### Configuration

1. Select AI provider
2. Enter API key
3. Choose model version
4. Set parameters:
   - Temperature (creativity)
   - Max tokens (response length)

### AI Persona

Customize how AI responds:

```
You are a friendly sales representative for [Company].
Your goal is to understand customer needs and provide helpful information.
Always be professional and courteous.
```

### Knowledge Base (RAG)

Upload documents to enhance AI responses:
- Product catalogs
- FAQ documents
- Pricing information
- Company policies

---

## Automation

### Creating Campaigns

1. Click "Create Campaign"
2. Set trigger conditions:
   - New lead captured
   - Keyword matched
   - Scheduled time
3. Define actions:
   - Send message
   - Assign to team member
   - Add tags
4. Activate campaign

### Workflow Examples

**Welcome Sequence**
```
Trigger: New Lead
→ Wait 5 minutes
→ Send welcome message
→ Wait 24 hours
→ Send follow-up if no response
```

**Keyword Response**
```
Trigger: Keyword "pricing"
→ Generate AI response with pricing info
→ Send to lead
→ Mark as "Interested"
```

---

## Membership Plans

### Plan Comparison

| Feature | Free | VIP | SVIP | MVP |
|---------|------|-----|------|-----|
| Accounts | 1 | 3 | 10 | Unlimited |
| Daily Messages | 20 | 200 | 1000 | Unlimited |
| Daily AI Calls | 10 | 100 | 500 | Unlimited |
| Keyword Sets | 2 | 10 | 50 | Unlimited |
| Data Retention | 7 days | 30 days | 90 days | Forever |
| Priority Support | ❌ | ✅ | ✅ | ✅ |
| API Access | ❌ | ❌ | ✅ | ✅ |

### Pricing

| Plan | Monthly | Yearly (20% off) |
|------|---------|------------------|
| VIP | $29 | $278 |
| SVIP | $99 | $950 |
| MVP | $299 | $2,870 |

### Activation

1. Purchase activation code
2. Go to Settings → Membership
3. Enter activation code
4. Click "Activate"

---

## FAQ

### General

**Q: Is TG-Matrix safe to use?**
A: Yes. We use secure session management and encrypted storage. Your credentials are never transmitted to our servers.

**Q: Can I use multiple accounts?**
A: Yes, based on your membership plan. Free users can use 1 account, VIP users up to 3, etc.

**Q: Does it work on Mac/Linux?**
A: Currently Windows only. Mac and Linux versions are in development.

### Technical

**Q: Why is my account disconnected?**
A: Common reasons:
- Network issues
- Session expired
- Account restricted by Telegram

**Q: How do I backup my data?**
A: Go to Settings → Backup → Create Backup. You can also enable auto-backup.

**Q: Can I export my leads?**
A: Yes. Go to Leads → Export → Choose format (CSV/JSON).

### Billing

**Q: What payment methods are accepted?**
A: We accept Alipay, WeChat Pay, Credit Cards (Stripe), and USDT.

**Q: Is there a refund policy?**
A: Yes. Contact support within 7 days of purchase for a full refund.

---

## Support

### Contact Us

- 📧 Email: support@tg-matrix.com
- 💬 Telegram: @TGMatrixSupport
- 🌐 Website: https://tg-matrix.com

### Useful Links

- [Video Tutorials](https://tg-matrix.com/tutorials)
- [API Documentation](https://docs.tg-matrix.com)
- [Community Forum](https://community.tg-matrix.com)
- [Feature Requests](https://feedback.tg-matrix.com)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | Add new account |
| `Ctrl + K` | Quick search |
| `Ctrl + S` | Save settings |
| `Ctrl + ?` | Show all shortcuts |
| `Escape` | Close dialog |

---

<p align="center">
  <strong>TG-Matrix v1.0.5</strong><br>
  © 2026 TG-Matrix Team. All rights reserved.
</p>
