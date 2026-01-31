"""
TG-Matrix API Documentation Generator
API 文檔自動生成器

從命令路由器自動生成 API 文檔
支持 Markdown、JSON、HTML 格式
"""

import sys
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path

# 添加 backend 目錄到路徑
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from api.command_router import get_command_router, CommandCategory
from api.legacy_proxy import get_command_categories, get_all_known_commands
from core.logging import get_logger

logger = get_logger('DocGenerator')


class APIDocGenerator:
    """
    API 文檔生成器
    
    從命令路由器收集信息並生成文檔
    """
    
    def __init__(self):
        self.router = get_command_router()
        self._docs: Dict[str, Any] = {}
    
    def collect_commands(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        收集所有命令信息
        
        Returns:
            按類別分組的命令列表
        """
        result = {}
        
        # 從路由器獲取已註冊的命令
        if self.router:
            for command in self.router.get_commands():
                info = self.router.get_command_info(command)
                if info:
                    category = info.get('category', 'other')
                    if category not in result:
                        result[category] = []
                    
                    result[category].append({
                        'name': command,
                        'description': info.get('description', ''),
                        'handler': info.get('handler', ''),
                        'aliases': info.get('aliases', []),
                    })
        
        # 從舊處理器代理獲取額外命令
        categories = get_command_categories()
        for cat_name, commands in categories.items():
            if cat_name not in result:
                result[cat_name] = []
            
            for cmd in commands:
                # 避免重複
                if not any(c['name'] == cmd for c in result[cat_name]):
                    result[cat_name].append({
                        'name': cmd,
                        'description': self._infer_description(cmd),
                        'handler': f'handle_{cmd.replace("-", "_")}',
                        'aliases': [],
                    })
        
        return result
    
    def _infer_description(self, command: str) -> str:
        """從命令名推斷描述"""
        # 移除動詞前綴
        parts = command.split('-')
        
        verb_map = {
            'get': '獲取',
            'add': '添加',
            'remove': '移除',
            'delete': '刪除',
            'update': '更新',
            'save': '保存',
            'start': '啟動',
            'stop': '停止',
            'send': '發送',
            'create': '創建',
            'cancel': '取消',
            'toggle': '切換',
            'test': '測試',
            'sync': '同步',
            'bulk': '批量',
            'batch': '批量',
        }
        
        noun_map = {
            'account': '帳號',
            'accounts': '帳號',
            'message': '消息',
            'messages': '消息',
            'group': '群組',
            'groups': '群組',
            'keyword': '關鍵詞',
            'keywords': '關鍵詞',
            'template': '模板',
            'templates': '模板',
            'rule': '規則',
            'rules': '規則',
            'lead': '線索',
            'leads': '線索',
            'user': '用戶',
            'users': '用戶',
            'campaign': '活動',
            'campaigns': '活動',
            'ai': 'AI',
            'queue': '隊列',
            'status': '狀態',
            'settings': '設置',
            'log': '日誌',
            'logs': '日誌',
        }
        
        if len(parts) >= 2:
            verb = verb_map.get(parts[0], parts[0])
            noun = ' '.join(noun_map.get(p, p) for p in parts[1:])
            return f"{verb}{noun}"
        
        return command
    
    def generate_markdown(self) -> str:
        """生成 Markdown 格式文檔"""
        commands = self.collect_commands()
        
        lines = [
            "# TG-Matrix API 文檔",
            "",
            f"*自動生成於 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*",
            "",
            "## 目錄",
            "",
        ]
        
        # 目錄
        category_titles = {
            'account': '帳號管理',
            'messaging': '消息系統',
            'automation': '自動化',
            'ai': 'AI 服務',
            'contacts': '客戶管理',
            'system': '系統管理',
            'multi_role': '多角色協作',
            'ads': '廣告系統',
            'analytics': '數據分析',
            'other': '其他',
        }
        
        for cat in commands.keys():
            title = category_titles.get(cat, cat.title())
            lines.append(f"- [{title}](#{cat})")
        
        lines.append("")
        lines.append("---")
        lines.append("")
        
        # 各類別詳情
        for cat, cmds in sorted(commands.items()):
            title = category_titles.get(cat, cat.title())
            lines.append(f"## {title}")
            lines.append("")
            lines.append(f"共 {len(cmds)} 個命令")
            lines.append("")
            lines.append("| 命令 | 描述 |")
            lines.append("|------|------|")
            
            for cmd in sorted(cmds, key=lambda x: x['name']):
                desc = cmd['description'] or '-'
                lines.append(f"| `{cmd['name']}` | {desc} |")
            
            lines.append("")
        
        # 使用說明
        lines.extend([
            "---",
            "",
            "## 使用說明",
            "",
            "### 命令格式",
            "",
            "所有命令通過 IPC 通道發送，格式為：",
            "",
            "```json",
            "{",
            '  "command": "命令名稱",',
            '  "payload": { ... },',
            '  "requestId": "唯一請求ID"',
            "}",
            "```",
            "",
            "### 響應格式",
            "",
            "成功響應：",
            "",
            "```json",
            "{",
            '  "event": "命令名稱-result",',
            '  "data": { ... }',
            "}",
            "```",
            "",
            "錯誤響應：",
            "",
            "```json",
            "{",
            '  "event": "error",',
            '  "data": {',
            '    "message": "錯誤信息",',
            '    "code": "錯誤代碼"',
            "  }",
            "}",
            "```",
            "",
        ])
        
        return "\n".join(lines)
    
    def generate_json(self) -> Dict[str, Any]:
        """生成 JSON 格式文檔"""
        commands = self.collect_commands()
        
        return {
            'version': '1.0.0',
            'generated_at': datetime.now().isoformat(),
            'title': 'TG-Matrix API',
            'description': 'TG-AI 智控王後端 API 文檔',
            'categories': {
                cat: {
                    'name': cat,
                    'commands': cmds
                }
                for cat, cmds in commands.items()
            },
            'total_commands': sum(len(cmds) for cmds in commands.values()),
        }
    
    def generate_html(self) -> str:
        """生成 HTML 格式文檔"""
        commands = self.collect_commands()
        
        category_titles = {
            'account': '帳號管理',
            'messaging': '消息系統',
            'automation': '自動化',
            'ai': 'AI 服務',
            'contacts': '客戶管理',
            'system': '系統管理',
            'multi_role': '多角色協作',
            'ads': '廣告系統',
            'analytics': '數據分析',
            'other': '其他',
        }
        
        html = f'''<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TG-Matrix API 文檔</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            padding: 2rem;
        }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{ 
            font-size: 2.5rem; 
            margin-bottom: 1rem;
            background: linear-gradient(90deg, #00d4ff, #7c3aed);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}
        .meta {{ color: #888; margin-bottom: 2rem; }}
        .stats {{ 
            display: flex; 
            gap: 1rem; 
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }}
        .stat {{ 
            background: rgba(255,255,255,0.05);
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(255,255,255,0.1);
        }}
        .stat-value {{ font-size: 1.5rem; font-weight: bold; color: #00d4ff; }}
        .stat-label {{ font-size: 0.875rem; color: #888; }}
        .category {{ 
            background: rgba(255,255,255,0.03);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border: 1px solid rgba(255,255,255,0.08);
        }}
        .category h2 {{ 
            font-size: 1.25rem; 
            margin-bottom: 1rem;
            color: #00d4ff;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}
        .category-badge {{
            font-size: 0.75rem;
            background: rgba(0,212,255,0.2);
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
        }}
        table {{ width: 100%; border-collapse: collapse; }}
        th, td {{ 
            padding: 0.75rem; 
            text-align: left; 
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }}
        th {{ 
            font-weight: 500; 
            color: #888;
            font-size: 0.875rem;
        }}
        code {{ 
            background: rgba(0,212,255,0.1);
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-family: 'Monaco', 'Consolas', monospace;
            color: #00d4ff;
        }}
        .search {{ 
            margin-bottom: 2rem;
            position: relative;
        }}
        .search input {{ 
            width: 100%;
            padding: 1rem 1rem 1rem 3rem;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 0.5rem;
            background: rgba(255,255,255,0.05);
            color: #fff;
            font-size: 1rem;
        }}
        .search input:focus {{ 
            outline: none;
            border-color: #00d4ff;
        }}
        .search-icon {{
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: #888;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>TG-Matrix API 文檔</h1>
        <p class="meta">自動生成於 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value">{sum(len(cmds) for cmds in commands.values())}</div>
                <div class="stat-label">總命令數</div>
            </div>
            <div class="stat">
                <div class="stat-value">{len(commands)}</div>
                <div class="stat-label">命令類別</div>
            </div>
        </div>
        
        <div class="search">
            <span class="search-icon">🔍</span>
            <input type="text" id="searchInput" placeholder="搜索命令..." onkeyup="filterCommands()">
        </div>
'''
        
        for cat, cmds in sorted(commands.items()):
            title = category_titles.get(cat, cat.title())
            html += f'''
        <div class="category" data-category="{cat}">
            <h2>
                {title}
                <span class="category-badge">{len(cmds)} 命令</span>
            </h2>
            <table>
                <thead>
                    <tr>
                        <th style="width: 30%">命令</th>
                        <th>描述</th>
                    </tr>
                </thead>
                <tbody>
'''
            for cmd in sorted(cmds, key=lambda x: x['name']):
                desc = cmd['description'] or '-'
                html += f'''                    <tr class="command-row" data-command="{cmd['name']}">
                        <td><code>{cmd['name']}</code></td>
                        <td>{desc}</td>
                    </tr>
'''
            html += '''                </tbody>
            </table>
        </div>
'''
        
        html += '''
        <script>
            function filterCommands() {
                const query = document.getElementById('searchInput').value.toLowerCase();
                const rows = document.querySelectorAll('.command-row');
                
                rows.forEach(row => {
                    const command = row.dataset.command.toLowerCase();
                    const text = row.textContent.toLowerCase();
                    row.style.display = (command.includes(query) || text.includes(query)) ? '' : 'none';
                });
                
                // 隱藏空類別
                document.querySelectorAll('.category').forEach(cat => {
                    const visibleRows = cat.querySelectorAll('.command-row[style=""]').length +
                                       cat.querySelectorAll('.command-row:not([style])').length;
                    cat.style.display = visibleRows > 0 ? '' : 'none';
                });
            }
        </script>
    </div>
</body>
</html>'''
        
        return html
    
    def save(self, output_dir: str = None, formats: List[str] = None):
        """
        保存文檔到文件
        
        Args:
            output_dir: 輸出目錄
            formats: 要生成的格式列表 ['md', 'json', 'html']
        """
        if output_dir is None:
            output_dir = Path(__file__).parent.parent / 'docs' / 'api'
        else:
            output_dir = Path(output_dir)
        
        output_dir.mkdir(parents=True, exist_ok=True)
        
        if formats is None:
            formats = ['md', 'json', 'html']
        
        generated = []
        
        if 'md' in formats:
            md_path = output_dir / 'API.md'
            md_path.write_text(self.generate_markdown(), encoding='utf-8')
            generated.append(str(md_path))
        
        if 'json' in formats:
            json_path = output_dir / 'api.json'
            json_path.write_text(
                json.dumps(self.generate_json(), ensure_ascii=False, indent=2),
                encoding='utf-8'
            )
            generated.append(str(json_path))
        
        if 'html' in formats:
            html_path = output_dir / 'index.html'
            html_path.write_text(self.generate_html(), encoding='utf-8')
            generated.append(str(html_path))
        
        logger.info(f"API documentation generated", files=generated)
        return generated


def generate_api_docs(output_dir: str = None):
    """生成 API 文檔（便捷函數）"""
    generator = APIDocGenerator()
    return generator.save(output_dir)


if __name__ == '__main__':
    import sys
    
    # 設置輸出編碼
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    
    print("TG-Matrix API 文檔生成器")
    print("-" * 40)
    
    # 初始化路由器
    from api.command_router import init_command_router
    init_command_router(None)
    
    # 生成文檔
    generator = APIDocGenerator()
    files = generator.save()
    
    print(f"\n已生成 {len(files)} 個文檔文件:")
    for f in files:
        print(f"  - {f}")
