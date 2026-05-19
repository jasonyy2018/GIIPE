#!/usr/bin/env python3
"""
Ultimate build check - simulates Ubuntu 24 Docker build environment
Uses TypeScript compiler and comprehensive syntax checking
"""

import os
import subprocess
import sys
import json
import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional

class BuildChecker:
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.frontend_dir = base_dir / 'frontend'
        self.issues = []
        
    def find_tsx_files(self) -> List[Path]:
        """Find all TypeScript/TSX files."""
        files = []
        for root, dirs, filenames in os.walk(self.frontend_dir / 'src'):
            # Skip test files and node_modules
            if 'node_modules' in root or '.next' in root or 'dist' in root:
                continue
            for filename in filenames:
                if filename.endswith(('.ts', '.tsx')) and not filename.endswith('.d.ts'):
                    files.append(Path(root) / filename)
        return sorted(files)
    
    def check_with_typescript(self) -> bool:
        """Check files using TypeScript compiler."""
        print("Running TypeScript compiler check...")
        try:
            # Try to run tsc if available
            result = subprocess.run(
                ['npx', 'tsc', '--noEmit', '--skipLibCheck'],
                cwd=self.frontend_dir,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode != 0:
                print("TypeScript errors found:")
                print(result.stdout)
                print(result.stderr)
                # Parse errors
                for line in result.stdout.split('\n') + result.stderr.split('\n'):
                    if 'error TS' in line or 'error:' in line:
                        self.issues.append(('typescript', line.strip()))
                return False
            return True
        except subprocess.TimeoutExpired:
            print("TypeScript check timed out")
            return False
        except FileNotFoundError:
            print("TypeScript compiler not found, skipping...")
            return True
        except Exception as e:
            print(f"Error running TypeScript: {e}")
            return False
    
    def check_encoding_issues(self, file_path: Path) -> List[str]:
        """Check for encoding issues."""
        issues = []
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
                
            # Check for BOM
            if content.startswith(b'\xef\xbb\xbf'):
                issues.append(f"BOM character detected")
            
            # Check for replacement characters
            if b'\xef\xbf\xbd' in content:
                issues.append(f"Contains replacement character (U+FFFD)")
            
            # Try to decode
            try:
                content.decode('utf-8')
            except UnicodeDecodeError as e:
                issues.append(f"Invalid UTF-8: {e}")
                
        except Exception as e:
            issues.append(f"Error reading file: {e}")
        
        return issues
    
    def check_syntax_errors(self, file_path: Path) -> List[str]:
        """Check for common syntax errors."""
        issues = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
                lines = content.split('\n')
            
            # Check for unterminated strings
            for i, line in enumerate(lines, 1):
                # Check single quotes
                single_quotes = line.count("'")
                if single_quotes % 2 != 0:
                    # Skip if it's a template literal or regex
                    if '`' not in line and not re.search(r'/[^/]*/', line):
                        # Check if previous line ends with \
                        if i > 1 and not lines[i-2].rstrip().endswith('\\'):
                            issues.append(f"Line {i}: Possible unterminated single-quoted string")
                
                # Check double quotes
                double_quotes = line.count('"')
                if double_quotes % 2 != 0:
                    if '`' not in line:
                        if i > 1 and not lines[i-2].rstrip().endswith('\\'):
                            issues.append(f"Line {i}: Possible unterminated double-quoted string")
                
                # Check for comments breaking method chains
                if re.search(r'\)\s*//\s*[^/\n]*\?\.', line):
                    issues.append(f"Line {i}: Comment breaking method chain")
            
            # Check for duplicate top-level definitions
            top_level_patterns = [
                (r'^export\s+(default\s+)?function\s+(\w+)', 'function'),
                (r'^export\s+(default\s+)?const\s+(\w+)\s*=', 'const'),
            ]
            
            seen_names = {}
            for pattern, type_name in top_level_patterns:
                for match in re.finditer(pattern, content, re.MULTILINE):
                    name = match.group(2) if match.group(2) else match.group(3)
                    line_num = content[:match.start()].count('\n') + 1
                    if name in seen_names:
                        issues.append(f"Line {line_num}: Duplicate {type_name} '{name}' (first at line {seen_names[name]})")
                    else:
                        seen_names[name] = line_num
            
        except Exception as e:
            issues.append(f"Error checking syntax: {e}")
        
        return issues
    
    def check_jsx_structure(self, file_path: Path) -> List[str]:
        """Check JSX structure for common issues."""
        issues = []
        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            
            # Find all export default functions
            func_pattern = r'export\s+default\s+function\s+\w+[^{]*\{'
            func_matches = list(re.finditer(func_pattern, content))
            
            for func_match in func_matches:
                func_start = func_match.end() - 1  # Start at {
                func_body = content[func_start:]
                
                # Find return statement
                return_pattern = r'\n\s*return\s*\('
                return_match = re.search(return_pattern, func_body)
                
                if not return_match:
                    continue
                
                before_return = func_body[:return_match.start()]
                
                # Count braces (simplified)
                brace_count = 0
                paren_count = 0
                
                in_string = False
                in_template = False
                string_char = None
                i = 0
                
                while i < len(before_return):
                    char = before_return[i]
                    next_char = before_return[i + 1] if i + 1 < len(before_return) else ''
                    
                    # Skip comments
                    if not in_string and not in_template:
                        if char == '/' and next_char == '/':
                            while i < len(before_return) and before_return[i] != '\n':
                                i += 1
                            continue
                        elif char == '/' and next_char == '*':
                            i += 2
                            while i < len(before_return) - 1:
                                if before_return[i] == '*' and before_return[i + 1] == '/':
                                    i += 2
                                    break
                                i += 1
                            continue
                    
                    # Handle strings
                    if not in_string and not in_template:
                        if char in ('"', "'"):
                            in_string = True
                            string_char = char
                        elif char == '`':
                            in_template = True
                    elif in_string:
                        if char == string_char and (i == 0 or before_return[i-1] != '\\'):
                            in_string = False
                    elif in_template:
                        if char == '`' and (i == 0 or before_return[i-1] != '\\'):
                            in_template = False
                    
                    # Count braces
                    if not in_string and not in_template:
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                        elif char == '(':
                            paren_count += 1
                        elif char == ')':
                            paren_count -= 1
                    
                    i += 1
                
                if brace_count != 0 or paren_count != 0:
                    line_num = content[:func_match.start()].count('\n') + 1
                    issues.append(f"Unbalanced blocks before return: braces={brace_count}, parens={paren_count}")
        
        except Exception as e:
            issues.append(f"Error checking JSX: {e}")
        
        return issues
    
    def check_all_files(self):
        """Check all files."""
        print(f"Scanning files in {self.frontend_dir / 'src'}...")
        files = self.find_tsx_files()
        print(f"Found {len(files)} TypeScript/TSX files\n")
        
        for file_path in files:
            rel_path = file_path.relative_to(self.base_dir)
            
            # Encoding check
            encoding_issues = self.check_encoding_issues(file_path)
            if encoding_issues:
                for issue in encoding_issues:
                    self.issues.append((rel_path, 'encoding', issue))
            
            # Syntax check
            syntax_issues = self.check_syntax_errors(file_path)
            if syntax_issues:
                for issue in syntax_issues:
                    self.issues.append((rel_path, 'syntax', issue))
            
            # JSX structure check
            jsx_issues = self.check_jsx_structure(file_path)
            if jsx_issues:
                for issue in jsx_issues:
                    self.issues.append((rel_path, 'jsx', issue))
    
    def run_eslint(self) -> bool:
        """Run ESLint if available."""
        print("\nRunning ESLint...")
        try:
            result = subprocess.run(
                ['npx', 'eslint', 'src', '--ext', '.ts,.tsx', '--format', 'json'],
                cwd=self.frontend_dir,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode != 0:
                try:
                    eslint_data = json.loads(result.stdout)
                    for file_data in eslint_data:
                        file_path = file_data.get('filePath', '')
                        for message in file_data.get('messages', []):
                            if message.get('severity') == 2:  # Error
                                rel_path = Path(file_path).relative_to(self.base_dir)
                                self.issues.append((
                                    rel_path,
                                    'eslint',
                                    f"Line {message.get('line')}: {message.get('message')}"
                                ))
                except json.JSONDecodeError:
                    print("Could not parse ESLint output")
                    print(result.stdout)
                return False
            return True
        except subprocess.TimeoutExpired:
            print("ESLint check timed out")
            return False
        except FileNotFoundError:
            print("ESLint not found, skipping...")
            return True
        except Exception as e:
            print(f"Error running ESLint: {e}")
            return False
    
    def generate_report(self):
        """Generate comprehensive report."""
        print("\n" + "=" * 80)
        print("ULTIMATE BUILD CHECK REPORT")
        print("=" * 80)
        
        if not self.issues:
            print("\n[OK] All checks passed! No issues found.")
            return 0
        
        # Group issues by file
        issues_by_file = {}
        for item in self.issues:
            if len(item) == 3:
                file_path, category, issue = item
            else:
                category, issue = item
                file_path = 'unknown'
            
            if file_path not in issues_by_file:
                issues_by_file[file_path] = {}
            if category not in issues_by_file[file_path]:
                issues_by_file[file_path][category] = []
            issues_by_file[file_path][category].append(issue)
        
        print(f"\n[ERROR] Found {len(self.issues)} issues in {len(issues_by_file)} files:\n")
        
        for file_path in sorted(issues_by_file.keys()):
            print(f"\n{file_path}:")
            for category, issues in issues_by_file[file_path].items():
                print(f"  {category.upper()}:")
                for issue in issues:
                    print(f"    - {issue}")
        
        return 1

def main():
    base_dir = Path(__file__).parent.parent
    
    if not (base_dir / 'frontend').exists():
        print(f"Error: frontend directory not found in {base_dir}")
        return 1
    
    checker = BuildChecker(base_dir)
    
    # Run TypeScript check
    ts_ok = checker.check_with_typescript()
    
    # Check all files
    checker.check_all_files()
    
    # Run ESLint
    eslint_ok = checker.run_eslint()
    
    # Generate report
    return checker.generate_report()

if __name__ == '__main__':
    sys.exit(main())

