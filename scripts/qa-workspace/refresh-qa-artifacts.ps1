param(
    [Parameter(Mandatory=$false)]
    [string]$SpecsRoot = "qa-workspace/specs",

    [Parameter(Mandatory=$false)]
    [switch]$IncludePm,

    [Parameter(Mandatory=$false)]
    [switch]$IncludeWord
)

$ErrorActionPreference = "Stop"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Output "Step 1/7 Import QA execution sheet"
python scripts\sync-execution-results-sheet.py --import --sheet qa-workspace/execution-results.csv --specs-root $SpecsRoot

Write-Output ""
Write-Output "Step 2/7 Validate SDD"
.\scripts\validate-sdd.ps1

Write-Output ""
Write-Output "Step 3/7 Validate test cases"
python scripts\validate-testcases.py --specs-root $SpecsRoot

Write-Output ""
Write-Output "Step 4/7 Sync automation evidence"
python scripts\sync-automation-evidence.py --specs-root $SpecsRoot

Write-Output ""
Write-Output "Step 5/7 Auto-fill and validate execution results"
python scripts\validate-execution-results.py --specs-root $SpecsRoot --fix

Write-Output ""
Write-Output "Step 6/7 Generate scenario matrix and Excel"
.\scripts\generate-scenario-matrix.ps1 -SpecsRoot $SpecsRoot

Write-Output ""
Write-Output "Step 7/7 Generate QA report"
if ($IncludePm -and $IncludeWord) {
    .\scripts\generate-qa-report.ps1
} elseif ($IncludePm) {
    .\scripts\generate-qa-report.ps1 -SkipWord
} else {
    .\scripts\generate-qa-report.ps1 -SkipPm -SkipWord
}

Write-Output ""
Write-Output "QA artifacts refreshed."
