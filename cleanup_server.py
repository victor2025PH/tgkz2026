#!/usr/bin/env python3
"""Clean up disk space on server"""
import paramiko
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('165.154.210.154', username='ubuntu', password='TgMatrix2026!', timeout=15)

print('=== Current Disk Usage ===')
stdin, stdout, stderr = ssh.exec_command('df -h')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Cleaning Docker... ===')
stdin, stdout, stderr = ssh.exec_command('docker system prune -af --volumes 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Cleaning apt cache... ===')
stdin, stdout, stderr = ssh.exec_command('sudo apt-get clean && sudo apt-get autoremove -y 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Cleaning log files... ===')
stdin, stdout, stderr = ssh.exec_command('sudo journalctl --vacuum-time=1d 2>&1')
print(stdout.read().decode('utf-8', errors='replace'))

print('\n=== Disk Usage After Cleanup ===')
stdin, stdout, stderr = ssh.exec_command('df -h')
print(stdout.read().decode('utf-8', errors='replace'))

ssh.close()
print('\nDone!')
