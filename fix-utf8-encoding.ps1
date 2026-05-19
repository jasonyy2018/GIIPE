# Fix UTF-8 encoding issues in TypeScript files
# Run this script in PowerShell

$files = @(
    "frontend/src/components/admin/SystemMaintenanceTools.tsx",
    "frontend/src/components/admin/SystemSettingsManager.tsx",
    "frontend/src/components/admin/SensitiveWordManager.tsx",
    "frontend/src/components/accessibility/KeyboardShortcutsHelp.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing $file..."
        
        # Read file content
        $content = Get-Content $file -Raw -Encoding UTF8
        
        # Fix corrupted characters
        $content = $content -replace '🗄\?', '🗄️'
        $content = $content -replace '🗑\?', '🗑️'
        $content = $content -replace '\?\s*Optimize', '⚙️ Optimize'
        $content = $content -replace '<span className="text-green-600">\?</span>', '<span className="text-green-600">✓</span>'
        $content = $content -replace '\?\s*\{', '• {'
        $content = $content -replace "'Alt': '\?", "'Alt': '⌥'"
        $content = $content -replace "'Ctrl': '\?", "'Ctrl': '⌃'"
        $content = $content -replace "'Shift': '\?", "'Shift': '⇧'"
        $content = $content -replace "'Meta': '\?", "'Meta': '⌘'"
        
        # Write back with UTF-8 encoding
        [System.IO.File]::WriteAllText((Resolve-Path $file), $content, [System.Text.Encoding]::UTF8)
        
        Write-Host "Fixed $file"
    } else {
        Write-Host "File not found: $file"
    }
}

Write-Host "Done!"

