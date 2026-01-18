#!/usr/bin/env python3
"""檢查數據庫中的關鍵詞集和群組"""
import asyncio
import sys
import os

# 添加路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import db

async def main():
    await db.initialize()
    
    print("=== Keyword Sets ===")
    keyword_sets = await db.get_all_keyword_sets()
    for ks in keyword_sets:
        keywords = [kw.get('keyword') for kw in ks.get('keywords', [])]
        print(f"ID: {ks.get('id')}, Name: {ks.get('name')}, Keywords: {keywords}")
    
    if not keyword_sets:
        print("(No keyword sets found)")
    
    print("\n=== Monitored Groups ===")
    groups = await db.get_all_groups()
    for g in groups:
        print(f"ID: {g.get('id')}, URL: {g.get('url')}, KeywordSetIds: {g.get('keywordSetIds')}, MemberCount: {g.get('memberCount', 0)}")
    
    if not groups:
        print("(No monitored groups found)")
    
    print("\n=== Accounts ===")
    accounts = await db.get_all_accounts()
    for a in accounts:
        print(f"Phone: {a.get('phone')}, Role: {a.get('role')}, Status: {a.get('status')}")
    
    if not accounts:
        print("(No accounts found)")

if __name__ == "__main__":
    asyncio.run(main())
