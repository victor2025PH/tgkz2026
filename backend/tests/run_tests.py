#!/usr/bin/env python3
"""
Test runner script
"""
import sys
import subprocess
import os
from pathlib import Path

def main():
    """Run all tests"""
    # Change to backend directory
    backend_dir = Path(__file__).parent.parent
    os.chdir(backend_dir)
    
    # Run pytest
    cmd = [
        sys.executable, '-m', 'pytest',
        'tests/',
        '-v',  # Verbose
        '--tb=short',  # Short traceback format
        '--color=yes',  # Colored output
    ]
    
    # Add coverage if available
    try:
        import coverage
        cmd.extend(['--cov=.', '--cov-report=html', '--cov-report=term'])
    except ImportError:
        print("Coverage not available, skipping coverage report")
    
    result = subprocess.run(cmd)
    return result.returncode

if __name__ == '__main__':
    sys.exit(main())

