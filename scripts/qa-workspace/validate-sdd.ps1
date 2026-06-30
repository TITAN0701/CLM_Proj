param(
    [Parameter(Mandatory=$false)]
    [string]$SpecsRoot = "qa-workspace/specs",

    [Parameter(Mandatory=$false)]
    [switch]$FailOnOpenQuestions
)

$ErrorActionPreference = "Stop"

function Read-TextOrDefault {
    param(
        [string]$Path,
        [string]$Default = ""
    )

    if (Test-Path $Path) {
        return Get-Content -LiteralPath $Path -Raw -Encoding UTF8
    }

    return $Default
}

function Count-Matches {
    param(
        [string]$Content,
        [string]$Pattern
    )

    if ([string]::IsNullOrWhiteSpace($Content)) {
        return 0
    }

    return ([regex]::Matches($Content, $Pattern)).Count
}

function Get-OpenQuestionCount {
    param([string]$Content)

    $statusCount = Count-Matches -Content $Content -Pattern '(?mi)^\s*-\s*Status\s*:\s*(Open|Pending|Blocked|Waiting|Waiting PM Answer|Need Clarification)\s*$'
    if ((Count-Matches -Content $Content -Pattern '(?mi)^\s*-\s*Status\s*:') -gt 0) {
        return $statusCount
    }

    return Count-Matches -Content $Content -Pattern '(?mi)^\s*-\s*PM Answer\s*:\s*$'
}

function Get-Section {
    param(
        [string]$Content,
        [string]$Heading
    )

    $escaped = [regex]::Escape($Heading)
    $match = [regex]::Match($Content, "(?ms)^##+\s+$escaped\s*(.*?)(?=^##+\s+|\z)")
    if ($match.Success) {
        return $match.Groups[1].Value.Trim()
    }

    return ""
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path $SpecsRoot)) {
    throw "Specs root not found: $SpecsRoot"
}

$requiredFiles = @("README.md", "spec.md", "questions.md", "scenarios.md", "plan.md", "tasks.md")
$featureDirs = Get-ChildItem -LiteralPath $SpecsRoot -Directory |
    Where-Object { $_.Name -notmatch '^[._]' } |
    Sort-Object Name

if (-not $featureDirs -or $featureDirs.Count -eq 0) {
    throw "No SDD feature directories found under $SpecsRoot."
}

$errors = @()
$warnings = @()

foreach ($dir in $featureDirs) {
    foreach ($fileName in $requiredFiles) {
        $path = Join-Path $dir.FullName $fileName
        if (-not (Test-Path $path)) {
            $errors += "$($dir.Name): missing $fileName"
        }
    }

    $spec = Read-TextOrDefault -Path (Join-Path $dir.FullName "spec.md")
    $questions = Read-TextOrDefault -Path (Join-Path $dir.FullName "questions.md")
    $scenarios = Read-TextOrDefault -Path (Join-Path $dir.FullName "scenarios.md")
    $tasks = Read-TextOrDefault -Path (Join-Path $dir.FullName "tasks.md")

    $acceptance = Get-Section -Content $spec -Heading "Acceptance Criteria"
    if ((Count-Matches -Content $acceptance -Pattern '(?m)^\s*-\s+') -eq 0) {
        $errors += "$($dir.Name): spec.md has no Acceptance Criteria bullets"
    }

    if ((Count-Matches -Content $scenarios -Pattern '(?m)^###\s+SC-') -eq 0) {
        $errors += "$($dir.Name): scenarios.md has no SC-* scenarios"
    }

    if ((Count-Matches -Content $tasks -Pattern '(?m)^-\s+\[[ xX]\]\s+') -eq 0) {
        $warnings += "$($dir.Name): tasks.md has no checkbox tasks"
    }

    $openQuestions = Get-OpenQuestionCount -Content $questions
    if ($openQuestions -gt 0) {
        $message = "$($dir.Name): $openQuestions open PM question(s)"
        if ($FailOnOpenQuestions) {
            $errors += $message
        } else {
            $warnings += $message
        }
    }
}

if ($warnings.Count -gt 0) {
    Write-Output "SDD validation warnings:"
    foreach ($warning in $warnings) {
        Write-Output "  - $warning"
    }
}

if ($errors.Count -gt 0) {
    Write-Output "SDD validation failed:"
    foreach ($errorItem in $errors) {
        Write-Output "  - $errorItem"
    }
    exit 1
}

Write-Output "SDD validation passed. Checked $($featureDirs.Count) feature workspace(s)."
