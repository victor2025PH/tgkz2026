-- 修复 admins 表，添加缺失的 last_login_ip 字段
-- 使用方法：sqlite3 backend/data/tgai_server.db < backend/fix_admin_table.sql

-- 检查并添加 last_login_ip 字段
-- SQLite 不支持直接检查字段是否存在，所以使用 try-catch 方式
-- 如果字段已存在，会报错但不会影响

-- 方法1：使用 ALTER TABLE（如果字段不存在）
-- 注意：SQLite 不支持 IF NOT EXISTS，所以需要先检查

-- 方法2：直接执行（如果字段已存在会报错，但可以忽略）
ALTER TABLE admins ADD COLUMN last_login_ip TEXT;
