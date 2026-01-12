"""
Create Excel template for account import
"""
import sys
from pathlib import Path
from openpyxl import Workbook

def create_template(file_path: str):
    """Create Excel template file"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Accounts"
    
    # Headers
    headers = ['phone', 'api_id', 'api_hash', 'proxy', 'group', 'two_factor_password', 'role']
    ws.append(headers)
    
    # Example row
    ws.append([
        '+1234567890',
        '12345',
        'abcdef1234567890abcdef1234567890',
        'socks5://user:pass@host:port',
        'Group1',
        '',
        'Listener'
    ])
    
    # Auto-adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width
    
    wb.save(file_path)
    print("Template created successfully")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python create_template.py <output_file_path>")
        sys.exit(1)
    
    create_template(sys.argv[1])

