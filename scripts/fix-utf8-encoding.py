#!/usr/bin/env python3
"""
Script to fix UTF-8 encoding issues in files that cause "stream did not contain valid UTF-8" errors.
"""

import sys
from pathlib import Path

def fix_file_encoding(file_path: Path) -> bool:
    """Fix encoding issues in a file by reading with error handling and re-saving as UTF-8."""
    try:
        # Try to read with different encodings
        content = None
        encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252', 'iso-8859-1']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding, errors='replace') as f:
                    content = f.read()
                print(f"  ✓ Read with {encoding} encoding")
                break
            except Exception as e:
                continue
        
        if content is None:
            print(f"  ✗ Could not read file with any encoding")
            return False
        
        # Remove invalid UTF-8 characters (replace with space)
        content_clean = content.encode('utf-8', errors='replace').decode('utf-8')
        
        # Write back as UTF-8
        with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content_clean)
        
        print(f"  ✓ Fixed and saved as UTF-8")
        return True
        
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def main():
    """Main function."""
    if len(sys.argv) > 1:
        target_dir = Path(sys.argv[1])
    else:
        target_dir = Path(__file__).parent.parent / 'frontend' / 'src'
    
    if not target_dir.exists():
        print(f"Error: Directory {target_dir} does not exist")
        sys.exit(1)
    
    print(f"Fixing UTF-8 encoding issues in: {target_dir}")
    print("=" * 80)
    
    # Files with encoding errors found by the previous script
    problematic_files = [
        'frontend/src/app/personalization-settings/page.tsx',
        'frontend/src/app/preference-learning-demo/page.tsx',
        'frontend/src/app/connections/recommendations/page.tsx',
        'frontend/src/app/notifications/manage/page.tsx',
        'frontend/src/components/admin/CommentPreviewModal.tsx',
        'frontend/src/components/admin/QuickActions.tsx',
        'frontend/src/components/analytics/AnalyticsDashboard.tsx',
        'frontend/src/components/dashboard/ContentRecommendations.tsx',
        'frontend/src/components/dashboard/PreferenceValidationPanel.tsx',
        'frontend/src/components/dashboard/QuickActionsTest.tsx',
        'frontend/src/components/dashboard/ThemeSelector.tsx',
        'frontend/src/components/dashboard/UpcomingEvents.tsx',
        'frontend/src/components/search/EnhancedSearchInterface.tsx',
        'frontend/src/components/search/SearchResults.tsx',
        'frontend/src/components/settings/KeyboardShortcutsSettings.tsx',
        'frontend/src/components/settings/PersonalizationSettingsManager.tsx',
        'frontend/src/components/settings/PersonalizationSettingsTest.tsx',
        'frontend/src/components/settings/PreferenceLearningSettings.tsx',
        'frontend/src/components/settings/QuickActionsSettings.tsx',
        'frontend/src/components/settings/VoiceCommandsSettings.tsx',
    ]
    
    fixed_count = 0
    failed_count = 0
    
    for rel_path in problematic_files:
        file_path = Path(__file__).parent.parent / rel_path
        if file_path.exists():
            print(f"\nFixing: {rel_path}")
            if fix_file_encoding(file_path):
                fixed_count += 1
            else:
                failed_count += 1
        else:
            print(f"\nSkipping (not found): {rel_path}")
    
    # Also fix the remaining syntax issues
    print("\n" + "=" * 80)
    print("Fixing remaining syntax issues...")
    
    # Fix ModerationQueue.tsx
    mod_queue = Path(__file__).parent.parent / 'frontend/src/components/admin/ModerationQueue.tsx'
    if mod_queue.exists():
        content = mod_queue.read_text(encoding='utf-8')
        if 'onRefresh  :' in content:
            content = content.replace('onRefresh  :', 'onRefresh:')
            mod_queue.write_text(content, encoding='utf-8')
            print("  ✓ Fixed ModerationQueue.tsx")
    
    # Fix SystemSettingsManager.tsx
    sys_settings = Path(__file__).parent.parent / 'frontend/src/components/admin/SystemSettingsManager.tsx'
    if sys_settings.exists():
        content = sys_settings.read_text(encoding='utf-8')
        if "result.success    'Test passed'" in content:
            content = content.replace("result.success    'Test passed'", "result.success ? 'Test passed'")
            sys_settings.write_text(content, encoding='utf-8')
            print("  ✓ Fixed SystemSettingsManager.tsx")
    
    print("\n" + "=" * 80)
    print(f"✅ Fixed: {fixed_count} files")
    if failed_count > 0:
        print(f"⚠️  Failed: {failed_count} files")
    print("\nDone! You can now rebuild the Docker image.")

if __name__ == '__main__':
    main()

