"""
統一模板變量替換
供觸發規則、問候、營銷活動等發送前渲染模板內容，與前端「可用變量」一致。
支持 {{var}} 與 {var} 兩種寫法。
"""
import re
from datetime import datetime
from typing import Dict, Any


# 前端「可用變量」對應的鍵名（小寫規範）
DEFAULT_VARS = ('username', 'firstname', 'keyword', 'date', 'time', 'groupname')


def render_template_content(content: str, context: Dict[str, Any]) -> str:
    """
    將模板內容中的變量替換為上下文值。
    
    Args:
        content: 模板字符串，可含 {{username}}、{{keyword}}、{{date}} 等
        context: 鍵為變量名（小寫），值為替換字符串。建議包含：
            username, firstName/firstname, keyword, groupName/groupname；
            date/time 若未提供則用當前時間生成。
    
    Returns:
        替換後的字符串。未匹配的 {{var}} / {var} 會替換為空字符串。
    """
    if not content or not isinstance(content, str):
        return content or ''
    
    # 規範化 context：小寫鍵 + 補齊 date/time
    ctx = {}
    for k, v in context.items():
        if v is None:
            v = ''
        ctx[k.lower()] = str(v).strip()
    
    now = datetime.now()
    if 'date' not in ctx:
        ctx['date'] = now.strftime('%Y/%m/%d')
    if 'time' not in ctx:
        ctx['time'] = now.strftime('%H:%M')
    
    # 兼容 firstName / firstname
    if 'firstname' not in ctx and 'first_name' in context:
        ctx['firstname'] = str(context['first_name'] or '').strip()
    
    result = content
    
    # 前端常用 camelCase 與後端 key 對應
    alias = {'firstname': 'firstName', 'groupname': 'groupName'}
    
    # 先替換雙花括號 {{var}}（支持 username, firstName, keyword, date, time, groupName）
    for key in list(ctx.keys()):
        val = ctx[key]
        result = result.replace('{{' + key + '}}', val)
        result = result.replace('{{' + key.capitalize() + '}}', val)
        if key in alias:
            result = result.replace('{{' + alias[key] + '}}', val)
    
    # 再替換單花括號 {var}
    for key in list(ctx.keys()):
        val = ctx[key]
        result = result.replace('{' + key + '}', val)
        result = result.replace('{' + key.capitalize() + '}', val)
        if key in alias:
            result = result.replace('{' + alias[key] + '}', val)
    
    # 清理未定義的占位符：剩餘的 {{xxx}} 或 {xxx} 替為空
    result = re.sub(r'\{\{[^}]+\}\}', '', result)
    result = re.sub(r'\{[^{][^}]*\}', '', result)
    
    return result.strip()


def build_lead_context(lead_data: Dict[str, Any], triggered_keyword: str = '', group_name: str = '') -> Dict[str, Any]:
    """
    從 lead_data 和可選關鍵詞、群名構建模板上下文。
    """
    username = lead_data.get('username', '') or ''
    first_name = lead_data.get('first_name', '') or lead_data.get('firstName', '') or username or '你'
    keyword = triggered_keyword or lead_data.get('triggered_keyword', '')
    group = group_name or lead_data.get('source_group_title', '') or ''
    
    return {
        'username': username,
        'firstName': first_name,
        'firstname': first_name,
        'keyword': keyword,
        'groupName': group,
        'groupname': group,
    }
