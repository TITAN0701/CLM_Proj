param(
    [Parameter(Mandatory=$false)]
    [string]$Source = "artifacts/generated/pm/release-summary.md",

    [Parameter(Mandatory=$false)]
    [string]$Output = "artifacts/generated/pm/release-summary.docx"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path $Source)) {
    $reportScript = Join-Path "scripts" "generate-qa-report.ps1"
    if (Test-Path $reportScript) {
        Write-Output "Source markdown not found. Generating PM markdown first: $Source"
        & ".\$reportScript" -PmSummary $Source -SkipWord | Out-Null
    }
}

if (-not (Test-Path $Source)) {
    throw "Source markdown not found after generation attempt: $Source"
}

$localPython = $null
if ($env:LOCALAPPDATA) {
    $localPython = Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\python.exe"
}

if ($localPython -and (Test-Path $localPython)) {
    $python = $localPython
} else {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand) {
        $python = $pythonCommand.Source
    }
}

if (-not $python) {
    throw "Python was not found. Install Python and run: pip install -r requirements.txt"
}

& $python scripts/export-pm-report-docx.py --source $Source --output $Output
