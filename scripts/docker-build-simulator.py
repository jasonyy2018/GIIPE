#!/usr/bin/env python3
"""
Docker build simulator - runs the same checks as Docker build
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(cmd, cwd, description):
    """Run a command and return success status."""
    print(f"\n{'='*80}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    print('='*80)
    
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode != 0:
            print(f"❌ {description} FAILED")
            print("\nSTDOUT:")
            print(result.stdout)
            print("\nSTDERR:")
            print(result.stderr)
            return False
        else:
            print(f"✅ {description} PASSED")
            if result.stdout:
                print(result.stdout)
            return True
    except subprocess.TimeoutExpired:
        print(f"❌ {description} TIMED OUT")
        return False
    except FileNotFoundError:
        print(f"❌ Command not found: {cmd[0]}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    base_dir = Path(__file__).parent.parent
    frontend_dir = base_dir / 'frontend'
    
    if not frontend_dir.exists():
        print(f"Error: frontend directory not found")
        return 1
    
    print("Docker Build Simulator")
    print("=" * 80)
    print("This script simulates the Docker build process")
    print("Running the same checks that would run in Ubuntu 24 Docker container\n")
    
    checks_passed = 0
    checks_failed = 0
    
    # Check 1: TypeScript compilation
    if run_command(
        ['npx', 'tsc', '--noEmit', '--skipLibCheck'],
        frontend_dir,
        'TypeScript Compilation Check'
    ):
        checks_passed += 1
    else:
        checks_failed += 1
    
    # Check 2: ESLint
    if run_command(
        ['npx', 'eslint', 'src', '--ext', '.ts,.tsx', '--max-warnings', '0'],
        frontend_dir,
        'ESLint Check'
    ):
        checks_passed += 1
    else:
        checks_failed += 1
    
    # Check 3: Next.js Build (the actual build)
    print("\n⚠️  Running actual Next.js build (this may take a while)...")
    if run_command(
        ['npm', 'run', 'build'],
        frontend_dir,
        'Next.js Production Build'
    ):
        checks_passed += 1
    else:
        checks_failed += 1
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"✅ Passed: {checks_passed}")
    print(f"❌ Failed: {checks_failed}")
    print(f"Total: {checks_passed + checks_failed}")
    
    if checks_failed == 0:
        print("\n🎉 All checks passed! Code is ready for Docker build.")
        return 0
    else:
        print(f"\n⚠️  {checks_failed} check(s) failed. Please fix the issues above.")
        return 1

if __name__ == '__main__':
    sys.exit(main())

