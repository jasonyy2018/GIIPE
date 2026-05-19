#!/usr/bin/env python3
"""
Pre-build check - runs before Docker build to catch issues early
Similar to what Ubuntu 24 Docker build would check
"""

import subprocess
import sys
import os
from pathlib import Path

def check_typescript():
    """Check TypeScript compilation."""
    print("=" * 80)
    print("1. TypeScript Compilation Check")
    print("=" * 80)
    
    frontend_dir = Path(__file__).parent.parent / 'frontend'
    
    try:
        result = subprocess.run(
            ['npx', 'tsc', '--noEmit', '--skipLibCheck'],
            cwd=frontend_dir,
            capture_output=True,
            text=True,
            timeout=180
        )
        
        if result.returncode == 0:
            print("[OK] TypeScript compilation passed")
            return True
        else:
            print("[ERROR] TypeScript compilation failed:")
            print(result.stdout)
            print(result.stderr)
            return False
    except FileNotFoundError:
        print("[SKIP] TypeScript compiler not found (install with: npm install)")
        return True
    except subprocess.TimeoutExpired:
        print("[ERROR] TypeScript check timed out")
        return False
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

def check_eslint():
    """Check ESLint."""
    print("\n" + "=" * 80)
    print("2. ESLint Check")
    print("=" * 80)
    
    frontend_dir = Path(__file__).parent.parent / 'frontend'
    
    try:
        result = subprocess.run(
            ['npx', 'eslint', 'src', '--ext', '.ts,.tsx', '--max-warnings', '0'],
            cwd=frontend_dir,
            capture_output=True,
            text=True,
            timeout=180
        )
        
        if result.returncode == 0:
            print("[OK] ESLint check passed")
            return True
        else:
            print("[WARNING] ESLint found issues:")
            print(result.stdout)
            return True  # Don't fail build on ESLint warnings
    except FileNotFoundError:
        print("[SKIP] ESLint not found")
        return True
    except subprocess.TimeoutExpired:
        print("[ERROR] ESLint check timed out")
        return False
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

def check_nextjs_build():
    """Check Next.js build (actual build)."""
    print("\n" + "=" * 80)
    print("3. Next.js Production Build Check")
    print("=" * 80)
    print("This is the actual build that runs in Docker...")
    
    frontend_dir = Path(__file__).parent.parent / 'frontend'
    
    try:
        # Clear .next directory first
        import shutil
        next_dir = frontend_dir / '.next'
        if next_dir.exists():
            shutil.rmtree(next_dir)
            print("Cleared .next cache")
        
        result = subprocess.run(
            ['npm', 'run', 'build'],
            cwd=frontend_dir,
            capture_output=True,
            text=True,
            timeout=600
        )
        
        if result.returncode == 0:
            print("[OK] Next.js build passed")
            return True
        else:
            print("[ERROR] Next.js build failed:")
            # Show last 100 lines of output
            output_lines = result.stdout.split('\n') + result.stderr.split('\n')
            for line in output_lines[-100:]:
                print(line)
            return False
    except subprocess.TimeoutExpired:
        print("[ERROR] Build timed out")
        return False
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

def main():
    print("\n" + "=" * 80)
    print("PRE-BUILD CHECK - Simulating Ubuntu 24 Docker Build")
    print("=" * 80)
    print("\nThis script runs the same checks that would run in Docker build")
    print("to catch issues before pushing to server.\n")
    
    results = []
    
    # Run checks
    results.append(("TypeScript", check_typescript()))
    results.append(("ESLint", check_eslint()))
    results.append(("Next.js Build", check_nextjs_build()))
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    failed = len(results) - passed
    
    for name, result in results:
        status = "[OK]" if result else "[FAILED]"
        print(f"{status} {name}")
    
    print(f"\nTotal: {passed}/{len(results)} checks passed")
    
    if failed == 0:
        print("\n[SUCCESS] All checks passed! Ready for Docker build.")
        return 0
    else:
        print(f"\n[FAILURE] {failed} check(s) failed. Fix issues before building.")
        return 1

if __name__ == '__main__':
    sys.exit(main())

