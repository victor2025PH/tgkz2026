#!/usr/bin/env python3
"""P10-2: Extract 2FA/API Key methods to auth_mixin, subscription mgmt to payment_mixin"""

src_path = 'backend/api/http_server.py'
lines = open(src_path, 'r', encoding='utf-8').readlines()
print(f"Source: {len(lines)} lines")

# Block definitions (0-indexed)
TFA_START, TFA_END = 1883, 2104    # 2FA + API Keys: L1884-2104
SUB_START, SUB_END = 2736, 2863    # Subscription mgmt: L2737-2863

# Extract blocks
tfa_block = lines[TFA_START:TFA_END]
sub_block = lines[SUB_START:SUB_END]

print(f"2FA+API Keys: {len(tfa_block)} lines")
print(f"Subscription: {len(sub_block)} lines")

# Append 2FA+API Keys to auth_routes_mixin.py
auth_path = 'backend/api/auth_routes_mixin.py'
with open(auth_path, 'r', encoding='utf-8') as f:
    auth_content = f.read()

with open(auth_path, 'w', encoding='utf-8') as f:
    # Remove trailing newline and add the new block
    f.write(auth_content.rstrip('\n'))
    f.write('\n\n')
    for line in tfa_block:
        f.write(line)
    f.write('\n')

auth_lines = open(auth_path, 'r', encoding='utf-8').readlines()
print(f"auth_routes_mixin.py: now {len(auth_lines)} lines")

# Append Subscription mgmt to payment_routes_mixin.py
pay_path = 'backend/api/payment_routes_mixin.py'
with open(pay_path, 'r', encoding='utf-8') as f:
    pay_content = f.read()

with open(pay_path, 'w', encoding='utf-8') as f:
    f.write(pay_content.rstrip('\n'))
    f.write('\n\n')
    for line in sub_block:
        f.write(line)
    f.write('\n')

pay_lines = open(pay_path, 'r', encoding='utf-8').readlines()
print(f"payment_routes_mixin.py: now {len(pay_lines)} lines")

# Remove blocks from http_server.py (bottom to top to preserve indices)
new_lines = []
i = 0
while i < len(lines):
    if i == SUB_START:
        new_lines.append('    # P10-2: Subscription management extracted to api/payment_routes_mixin.py\n')
        new_lines.append('\n')
        i = SUB_END
    elif i == TFA_START:
        new_lines.append('    # P10-2: 2FA + API Keys extracted to api/auth_routes_mixin.py\n')
        new_lines.append('\n')
        i = TFA_END
    else:
        new_lines.append(lines[i])
        i += 1

with open(src_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"http_server.py: {len(lines)} -> {len(new_lines)} lines (removed {len(lines) - len(new_lines)})")
