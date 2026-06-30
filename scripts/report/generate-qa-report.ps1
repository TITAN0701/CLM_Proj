param(
    [Parameter(Mandatory=$false)]
    [string]$Feature,

    [Parameter(Mandatory=$false)]
    [string]$SpecDir,

    [Parameter(Mandatory=$false)]
    [string]$QaReport = "artifacts/generated/qa/test-report.md",

    [Parameter(Mandatory=$false)]
    [string]$PmSummary = "artifacts/generated/pm/release-summary.md",

    [Parameter(Mandatory=$false)]
    [string]$PmWord = "artifacts/generated/pm/release-summary.docx",

    [Parameter(Mandatory=$false)]
    [switch]$SkipPm,

    [Parameter(Mandatory=$false)]
    [switch]$SkipWord
)

$ErrorActionPreference = "Stop"

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::InputEncoding = $utf8NoBom
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

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

function Get-HeadingTitle {
    param(
        [string]$Content,
        [string]$Fallback
    )

    $match = [regex]::Match($Content, '(?m)^#\s+(.+?)\s*$')
    if ($match.Success) {
        return $match.Groups[1].Value.Trim()
    }

    return $Fallback
}

function Get-MarkdownSection {
    param(
        [string]$Content,
        [string]$HeadingPattern
    )

    $match = [regex]::Match($Content, "(?ms)^##+\s+$HeadingPattern\s*(.*?)(?=^##+\s+|\z)")
    if ($match.Success) {
        return $match.Groups[1].Value.Trim()
    }

    return ""
}

function Get-NestedMarkdownSection {
    param(
        [string]$Content,
        [string]$HeadingPattern
    )

    $match = [regex]::Match($Content, "(?ms)^###\s+$HeadingPattern\s*(.*?)(?=^###\s+|^##\s+|\z)")
    if ($match.Success) {
        return $match.Groups[1].Value.Trim()
    }

    return ""
}

function Get-BulletSummary {
    param(
        [string]$Content,
        [int]$MaxItems = 8,
        [string]$Fallback = "- 尚未整理。"
    )

    $items = @()
    foreach ($line in ($Content -split "`r?`n")) {
        if ($line -match '^\s*-\s+(.+?)\s*$') {
            $items += $Matches[1].Trim()
        }
    }

    if ($items.Count -eq 0) {
        return $Fallback
    }

    return (($items | Select-Object -First $MaxItems | ForEach-Object { "- $_" }) -join "`n")
}

function Count-Matches {
    param(
        [string]$Content,
        [string]$Pattern
    )

    return ([regex]::Matches($Content, $Pattern)).Count
}

function Get-TaskStats {
    param([string]$Content)

    $done = Count-Matches -Content $Content -Pattern '(?mi)^-\s+\[[xX]\]\s+'
    $open = Count-Matches -Content $Content -Pattern '(?m)^-\s+\[(\s)?\]\s+'

    return [PSCustomObject]@{
        Done = $done
        Open = $open
        Total = $done + $open
    }
}

function Get-OpenQuestionCount {
    param([string]$Content)

    if ([string]::IsNullOrWhiteSpace($Content)) {
        return 0
    }

    $statusCount = Count-Matches -Content $Content -Pattern '(?mi)^\s*-\s*Status\s*:\s*(Open|Pending|Blocked|Waiting|Waiting PM Answer|Need Clarification)\s*$'
    if ((Count-Matches -Content $Content -Pattern '(?mi)^\s*-\s*Status\s*:') -gt 0) {
        return $statusCount
    }

    return Count-Matches -Content $Content -Pattern '(?mi)^\s*-\s*PM Answer\s*:\s*$'
}

function Get-TestCaseCount {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return 0
    }

    try {
        $content = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($content.test_cases) {
            return @($content.test_cases).Count
        }
    } catch {
        return 0
    }

    return 0
}

function Get-ScenarioStats {
    param([string]$Content)

    $total = Count-Matches -Content $Content -Pattern '(?m)^###\s+SC-'
    $passed = Count-Matches -Content $Content -Pattern '(?im)^\s*-\s+(Status|狀態)\s*:\s*(Passed|Pass|通過)\s*$'
    $failed = Count-Matches -Content $Content -Pattern '(?im)^\s*-\s+(Status|狀態)\s*:\s*(Failed|Fail|失敗)\s*$'
    $blocked = Count-Matches -Content $Content -Pattern '(?im)^\s*-\s+(Status|狀態)\s*:\s*(Blocked|阻塞)\s*$'
    $skipped = Count-Matches -Content $Content -Pattern '(?im)^\s*-\s+(Status|狀態)\s*:\s*(Skipped|Skip|略過)\s*$'
    $notRun = [Math]::Max(0, $total - $passed - $failed - $blocked - $skipped)

    return [PSCustomObject]@{
        Total = $total
        Passed = $passed
        Failed = $failed
        Blocked = $blocked
        Skipped = $skipped
        NotRun = $notRun
    }
}

function Get-ExecutionStats {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return $null
    }

    try {
        $content = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
        $results = @($content.test_results)
        $total = $results.Count
        $passed = @($results | Where-Object { $_.status -eq "Pass" }).Count
        $failed = @($results | Where-Object { $_.status -eq "Fail" }).Count
        $blocked = @($results | Where-Object { $_.status -eq "Blocked" }).Count
        $skipped = @($results | Where-Object { $_.status -eq "N/A" }).Count
        $notRun = @($results | Where-Object { $_.status -in @("Not Run", "Ready") }).Count

        return [PSCustomObject]@{
            Total = $total
            Passed = $passed
            Failed = $failed
            Blocked = $blocked
            Skipped = $skipped
            NotRun = $notRun
        }
    } catch {
        return $null
    }
}

function Get-ScenarioReviewStats {
    param([string]$Path)

    $default = [PSCustomObject]@{
        Total = 0
        Approved = 0
        Ready = 0
        NeedConfirm = 0
        Blocked = 0
        NotMarked = 0
    }

    if (-not (Test-Path $Path)) {
        return $default
    }

    try {
        $content = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
        $reviews = @($content.scenario_reviews)
        return [PSCustomObject]@{
            Total = $reviews.Count
            Approved = @($reviews | Where-Object { $_.status -eq "Approved" }).Count
            Ready = @($reviews | Where-Object { $_.status -eq "Ready" }).Count
            NeedConfirm = @($reviews | Where-Object { $_.status -eq "Need Confirm" }).Count
            Blocked = @($reviews | Where-Object { $_.status -eq "Blocked" }).Count
            NotMarked = @($reviews | Where-Object { $_.status -eq "Not Marked" }).Count
        }
    } catch {
        return $default
    }
}

function Get-ExecutionEvidenceStats {
    param([string]$Path)

    $default = [PSCustomObject]@{
        TestUrl = 0
        Evidence = 0
    }

    if (-not (Test-Path $Path)) {
        return $default
    }

    try {
        $content = Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
        $results = @($content.test_results)
        return [PSCustomObject]@{
            TestUrl  = @($results | Where-Object { -not [string]::IsNullOrWhiteSpace($_.test_url) }).Count
            Evidence = @($results | Where-Object { -not [string]::IsNullOrWhiteSpace($_.evidence) }).Count
        }
    } catch {
        return $default
    }
}

function Get-ReleaseStatus {
    param(
        [object]$ScenarioStats,
        [object]$TaskStats,
        [int]$OpenQuestions
    )

    if ($ScenarioStats.Failed -gt 0 -or $ScenarioStats.Blocked -gt 0) {
        return "Not Recommended"
    }

    if ($ScenarioStats.Total -eq 0 -or $ScenarioStats.NotRun -gt 0) {
        return "Not Evaluated"
    }

    if ($OpenQuestions -gt 0 -or $TaskStats.Open -gt 0) {
        return "Conditional"
    }

    return "Recommended"
}

function Get-FeatureFilePaths {
    param([string]$SpecDir, [string]$FeatureName)

    return [PSCustomObject]@{
        SpecPath             = Join-Path $SpecDir "spec.md"
        PlanPath             = Join-Path $SpecDir "plan.md"
        QuestionsPath        = Join-Path $SpecDir "questions.md"
        ScenariosPath        = Join-Path $SpecDir "scenarios.md"
        TestCasesPath        = Join-Path $SpecDir "test-cases.json"
        ExecutionResultsPath = Join-Path $SpecDir "execution-results.json"
        TasksPath            = Join-Path $SpecDir "tasks.md"
        CypressSpecPath      = Join-Path "automation/e2e/specs" "$FeatureName.cy.ts"
    }
}

function Get-FeatureStatusFlags {
    param([object]$Paths, [object]$ScenarioStats, [object]$TaskStats, [int]$OpenQuestions)

    $hasCypress = Test-Path $Paths.CypressSpecPath
    $hasAllure  = (Test-Path "artifacts/raw/allure-results") -and (
        (Get-ChildItem "artifacts/raw/allure-results" -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -ne ".gitkeep" } | Measure-Object).Count -gt 0)

    return [PSCustomObject]@{
        HasCypressSpec    = $hasCypress
        HasAllureResults  = $hasAllure
        ReleaseStatus     = Get-ReleaseStatus -ScenarioStats $ScenarioStats -TaskStats $TaskStats -OpenQuestions $OpenQuestions
        SpecExistsStatus  = if (Test-Path $Paths.SpecPath)  { "OK" } else { "Missing" }
        PlanExistsStatus  = if (Test-Path $Paths.PlanPath)  { "OK" } else { "Missing" }
        CypressStatus     = if ($hasCypress) { "OK: $($Paths.CypressSpecPath)" } else { "Missing: $($Paths.CypressSpecPath)" }
        AllureStatus      = if ($hasAllure)  { "OK" } else { "Not Found" }
        CypressSummary    = if ($hasCypress) { "已找到" } else { "尚未建立" }
        AllureSummary     = if ($hasAllure)  { "已找到" } else { "尚未產生" }
    }
}

function ConvertTo-FeatureReportObject {
    param([string]$FeatureName, [string]$SpecDir, [object]$p, [string]$Spec,
          [string]$Title, [object]$ScenarioStats, [object]$ScenarioReviewStats,
          [object]$EvidenceStats, [int]$TestCaseCount, [object]$TaskStats,
          [int]$OpenQuestions, [object]$Flags)

    return [PSCustomObject]@{
        FeatureName          = $FeatureName;  SpecDir = $SpecDir;  Title = $Title
        SpecPath             = $p.SpecPath;   PlanPath = $p.PlanPath;  QuestionsPath = $p.QuestionsPath
        ScenariosPath        = $p.ScenariosPath;  TestCasesPath = $p.TestCasesPath
        ExecutionResultsPath = $p.ExecutionResultsPath;  TasksPath = $p.TasksPath;  CypressSpecPath = $p.CypressSpecPath
        ScenarioStats        = $ScenarioStats;  ScenarioReviewStats = $ScenarioReviewStats
        EvidenceStats        = $EvidenceStats;  TestCaseCount = $TestCaseCount
        TaskStats            = $TaskStats;  OpenQuestions = $OpenQuestions
        HasCypressSpec       = $Flags.HasCypressSpec;  HasAllureResults = $Flags.HasAllureResults
        ReleaseStatus        = $Flags.ReleaseStatus;  SpecExistsStatus = $Flags.SpecExistsStatus
        PlanExistsStatus     = $Flags.PlanExistsStatus;  CypressStatus = $Flags.CypressStatus
        AllureStatus         = $Flags.AllureStatus;  CypressSummary = $Flags.CypressSummary;  AllureSummary = $Flags.AllureSummary
        TestedFunctionsSummary = Get-BulletSummary -Content (Get-NestedMarkdownSection -Content $Spec -HeadingPattern "In Scope") -MaxItems 8 -Fallback "- 尚未整理測試功能範圍。"
        AcceptanceSummary      = Get-BulletSummary -Content (Get-MarkdownSection -Content $Spec -HeadingPattern "Acceptance Criteria") -MaxItems 8 -Fallback "- 尚未整理驗收條件。"
        BusinessGoalSummary    = Get-BulletSummary -Content (Get-MarkdownSection -Content $Spec -HeadingPattern "Business Goal") -MaxItems 4 -Fallback "- 尚未整理功能目標。"
    }
}

function Get-FeatureReportData {
    param([string]$SpecDir)

    if (-not (Test-Path $SpecDir)) { throw "找不到功能資料夾: $SpecDir" }

    $featureName = Split-Path $SpecDir -Leaf
    $p = Get-FeatureFilePaths -SpecDir $SpecDir -FeatureName $featureName

    $spec      = Read-TextOrDefault -Path $p.SpecPath
    $questions = Read-TextOrDefault -Path $p.QuestionsPath
    $scenarios = Read-TextOrDefault -Path $p.ScenariosPath
    $tasks     = Read-TextOrDefault -Path $p.TasksPath

    $title               = Get-HeadingTitle -Content $spec -Fallback $featureName
    $scenarioStats       = Get-ExecutionStats -Path $p.ExecutionResultsPath
    if ($null -eq $scenarioStats) { $scenarioStats = Get-ScenarioStats -Content $scenarios }
    $scenarioReviewStats = Get-ScenarioReviewStats -Path $p.ExecutionResultsPath
    $evidenceStats       = Get-ExecutionEvidenceStats -Path $p.ExecutionResultsPath
    $testCaseCount       = Get-TestCaseCount -Path $p.TestCasesPath
    $taskStats           = Get-TaskStats -Content $tasks
    $openQuestions       = Get-OpenQuestionCount -Content $questions
    $flags               = Get-FeatureStatusFlags -Paths $p -ScenarioStats $scenarioStats -TaskStats $taskStats -OpenQuestions $openQuestions

    return ConvertTo-FeatureReportObject -FeatureName $featureName -SpecDir $SpecDir -p $p -Spec $spec `
        -Title $title -ScenarioStats $scenarioStats -ScenarioReviewStats $scenarioReviewStats `
        -EvidenceStats $evidenceStats -TestCaseCount $testCaseCount -TaskStats $taskStats `
        -OpenQuestions $openQuestions -Flags $flags
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Get-ReportStats {
    param([array]$FeatureData)

    $isSingle = $FeatureData.Count -eq 1
    $primary  = $FeatureData[0]

    $status = if (($FeatureData | Where-Object { $_.ReleaseStatus -eq 'Not Recommended' }).Count -gt 0) { 'Not Recommended' }
              elseif (($FeatureData | Where-Object { $_.ReleaseStatus -eq 'Not Evaluated' }).Count -gt 0) { 'Not Evaluated' }
              elseif (($FeatureData | Where-Object { $_.ReleaseStatus -eq 'Conditional' }).Count -gt 0) { 'Conditional' }
              else { 'Recommended' }

    return [PSCustomObject]@{
        Title                = if ($isSingle) { $primary.Title } else { '全部測試功能' }
        IsSingle             = $isSingle
        Primary              = $primary
        GeneratedAt          = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        FeatureCount         = $FeatureData.Count
        ReleaseStatus        = $status
        TotalTestCases       = ($FeatureData | ForEach-Object { $_.TestCaseCount }              | Measure-Object -Sum).Sum
        TotalScenarios       = ($FeatureData | ForEach-Object { $_.ScenarioStats.Total }        | Measure-Object -Sum).Sum
        PassedScenarios      = ($FeatureData | ForEach-Object { $_.ScenarioStats.Passed }       | Measure-Object -Sum).Sum
        FailedScenarios      = ($FeatureData | ForEach-Object { $_.ScenarioStats.Failed }       | Measure-Object -Sum).Sum
        BlockedScenarios     = ($FeatureData | ForEach-Object { $_.ScenarioStats.Blocked }      | Measure-Object -Sum).Sum
        SkippedScenarios     = ($FeatureData | ForEach-Object { $_.ScenarioStats.Skipped }      | Measure-Object -Sum).Sum
        NotRunScenarios      = ($FeatureData | ForEach-Object { $_.ScenarioStats.NotRun }       | Measure-Object -Sum).Sum
        ReviewTotal          = ($FeatureData | ForEach-Object { $_.ScenarioReviewStats.Total }  | Measure-Object -Sum).Sum
        ReviewApproved       = ($FeatureData | ForEach-Object { $_.ScenarioReviewStats.Approved }    | Measure-Object -Sum).Sum
        ReviewReady          = ($FeatureData | ForEach-Object { $_.ScenarioReviewStats.Ready }       | Measure-Object -Sum).Sum
        ReviewNeedConfirm    = ($FeatureData | ForEach-Object { $_.ScenarioReviewStats.NeedConfirm } | Measure-Object -Sum).Sum
        ReviewBlocked        = ($FeatureData | ForEach-Object { $_.ScenarioReviewStats.Blocked }     | Measure-Object -Sum).Sum
        ReviewNotMarked      = ($FeatureData | ForEach-Object { $_.ScenarioReviewStats.NotMarked }   | Measure-Object -Sum).Sum
        TestUrlCount         = ($FeatureData | ForEach-Object { $_.EvidenceStats.TestUrl }      | Measure-Object -Sum).Sum
        EvidenceCount        = ($FeatureData | ForEach-Object { $_.EvidenceStats.Evidence }     | Measure-Object -Sum).Sum
        TotalTasks           = ($FeatureData | ForEach-Object { $_.TaskStats.Total }            | Measure-Object -Sum).Sum
        DoneTasks            = ($FeatureData | ForEach-Object { $_.TaskStats.Done }             | Measure-Object -Sum).Sum
        OpenTasks            = ($FeatureData | ForEach-Object { $_.TaskStats.Open }             | Measure-Object -Sum).Sum
        OpenQuestionsTotal   = ($FeatureData | ForEach-Object { $_.OpenQuestions }             | Measure-Object -Sum).Sum
        CypressOkCount       = ($FeatureData | Where-Object { $_.HasCypressSpec }).Count
        AllureOk             = (($FeatureData | Where-Object { $_.HasAllureResults }).Count -gt 0)
        FeatureRows          = ($FeatureData | ForEach-Object {
            "| $($_.FeatureName) | $($_.ReleaseStatus) | $($_.ScenarioReviewStats.NeedConfirm) | $($_.TestCaseCount) | $($_.ScenarioStats.Passed) | $($_.ScenarioStats.Failed) | $($_.ScenarioStats.NotRun) | $($_.EvidenceStats.TestUrl) | $($_.EvidenceStats.Evidence) | $($_.OpenQuestions) |"
        }) -join "`n"
        TestedFunctionsSummary = if ($isSingle) { $primary.TestedFunctionsSummary }
                                 else { ($FeatureData | ForEach-Object { "- $($_.FeatureName): $($_.Title)" }) -join "`n" }
        AcceptanceSummary    = if ($isSingle) { $primary.AcceptanceSummary }
                               else { ($FeatureData | ForEach-Object { "- $($_.FeatureName): 測試案例 $($_.ScenarioStats.Total) 筆，通過 $($_.ScenarioStats.Passed) 筆，未執行 $($_.ScenarioStats.NotRun) 筆；情境待確認 $($_.ScenarioReviewStats.NeedConfirm) 筆。" }) -join "`n" }
        BusinessGoalSummary  = if ($isSingle) { $primary.BusinessGoalSummary }
                               else { '- 彙整 qa-workspace/specs/ 下所有功能的 QA 狀態與發布風險。' }
    }
}

# ── QA 報告各段落 ──

function Get-SectionReviewStats { param([object]$s) return @"
## 情境可測性統計

| 項目 | 數量 |
|---|---:|
| Total | $($s.ReviewTotal) |
| Approved | $($s.ReviewApproved) |
| Ready | $($s.ReviewReady) |
| Need Confirm | $($s.ReviewNeedConfirm) |
| Blocked | $($s.ReviewBlocked) |
| Not Marked | $($s.ReviewNotMarked) |
"@ }

function Get-SectionExecStats { param([object]$s) return @"
## 測試案例執行統計

| 項目 | 數量 |
|---|---:|
| Total | $($s.TotalScenarios) |
| Passed | $($s.PassedScenarios) |
| Failed | $($s.FailedScenarios) |
| Blocked | $($s.BlockedScenarios) |
| Skipped | $($s.SkippedScenarios) |
| Not Run / Not Marked | $($s.NotRunScenarios) |
"@ }

function Get-SectionEvidence { param([object]$s) return @"
## 佐證覆蓋

| 項目 | 數量 |
|---|---:|
| 已填測試位址 | $($s.TestUrlCount) |
| 已填其他佐證 | $($s.EvidenceCount) |
"@ }

function Get-SectionFeatureRows { param([object]$s) return @"
## 功能狀態明細

| 功能 | 狀態 | 情境待確認 | Test Cases | Passed | Failed | Not Run | URL | Evidence | Open PM Questions |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
$($s.FeatureRows)
"@ }

function Get-QaReportContent {
    param([object]$s)

    $sections = @(
        "# QA 測試報告：$($s.Title)`n`n## 摘要`n`n- 功能數量：$($s.FeatureCount)`n- 測試案例數量：$($s.TotalTestCases)`n- 產生時間：$($s.GeneratedAt)`n- 發布狀態：$($s.ReleaseStatus)`n- QA 回填來源：qa-workspace/execution-results.csv"
        Get-SectionReviewStats -s $s
        Get-SectionExecStats   -s $s
        Get-SectionEvidence    -s $s
        "## 本次測試功能`n`n$($s.TestedFunctionsSummary)`n`n## 驗收重點`n`n$($s.AcceptanceSummary)"
        "## QA 任務統計`n`n| 項目 | 數量 |`n|---|---:|`n| Total | $($s.TotalTasks) |`n| Done | $($s.DoneTasks) |`n| Open | $($s.OpenTasks) |"
        Get-SectionFeatureRows -s $s
        "## 檢查結果`n`n| 檢查項目 | 數量 / 狀態 |`n|---|---|`n| 功能數量 | $($s.FeatureCount) |`n| 測試案例數量 | $($s.TotalTestCases) |`n| 未回答 PM Answer | $($s.OpenQuestionsTotal) |`n| Cypress spec 已建立 | $($s.CypressOkCount) |`n| Allure raw results | $(if ($s.AllureOk) { 'OK' } else { 'Not Found' }) |`n| QA 回填總表 | qa-workspace/execution-results.csv |"
        "## 測試範圍來源`n`n- qa-workspace/specs/{feature}/plan.md`n- qa-workspace/specs/{feature}/scenarios.md`n- qa-workspace/specs/{feature}/test-cases.json`n- qa-workspace/specs/{feature}/execution-results.json`n- qa-workspace/execution-results.csv`n`n## 測試情境矩陣`n`n- Markdown：artifacts/generated/qa/scenario-matrix.md`n- Excel：artifacts/generated/qa/scenario-matrix.xlsx"
        "## 待釐清問題`n`n- 未回答 PM Answer 數量：$($s.OpenQuestionsTotal)`n- 來源：qa-workspace/specs/{feature}/questions.md"
        "## QA 結論`n`n狀態：$($s.ReleaseStatus)`n`n原因：`n`n- 尚未標記測試結果的情境數量：$($s.NotRunScenarios)`n- 仍待確認的測試情境數量：$($s.ReviewNeedConfirm)`n- 未回答 PM 問題數量：$($s.OpenQuestionsTotal)`n- 未完成任務數量：$($s.OpenTasks)"
    )
    return $sections -join "`n`n"
}

function Get-PmSummaryContent {
    param([object]$s, [string]$QaReport)

    $sections = @(
        "# PM 測試發布摘要：$($s.Title)`n`n## 整體狀態`n`n$($s.ReleaseStatus)"
        "## 摘要說明`n`n本摘要根據 QA workspace 文件產生，包含 $($s.FeatureCount) 個功能。`n`n- 產生時間：$($s.GeneratedAt)`n- 測試案例數量：$($s.TotalTestCases)`n- QA 回填來源：qa-workspace/execution-results.csv"
        "## 本次測試功能`n`n$($s.TestedFunctionsSummary)`n`n## 驗收重點`n`n$($s.AcceptanceSummary)`n`n## 功能目標`n`n$($s.BusinessGoalSummary)"
        Get-SectionReviewStats -s $s
        Get-SectionExecStats   -s $s
        Get-SectionEvidence    -s $s
        "## QA 任務狀態`n`n| 項目 | 數量 |`n|---|---:|`n| Done | $($s.DoneTasks) |`n| Open | $($s.OpenTasks) |"
        Get-SectionFeatureRows -s $s
        "## 發布建議`n`n狀態：$($s.ReleaseStatus)`n`n需要注意：`n`n- 尚未回答 PM 問題：$($s.OpenQuestionsTotal)`n- 尚未完成 QA 任務：$($s.OpenTasks)`n- 尚未標記測試結果的情境：$($s.NotRunScenarios)`n- 仍待確認的測試情境：$($s.ReviewNeedConfirm)"
        "## 主要風險`n`n- 若仍有 PM 問題未回答，測試斷言與驗收標準可能不穩定。`n- 若 Cypress spec 尚未建立，代表自動化覆蓋尚未完成。`n- 若 Allure raw results 尚未產生，代表尚未有正式自動化執行結果。"
        "## 相關連結`n`n- QA 測試報告：$QaReport`n- 測試情境矩陣 Markdown：artifacts/generated/qa/scenario-matrix.md`n- 測試情境矩陣 Excel：artifacts/generated/qa/scenario-matrix.xlsx`n- 功能規格：qa-workspace/specs/{feature}/spec.md`n- 測試計畫：qa-workspace/specs/{feature}/plan.md`n- 測試情境：qa-workspace/specs/{feature}/scenarios.md`n- 測試案例：qa-workspace/specs/{feature}/test-cases.json`n- 測試執行結果：qa-workspace/specs/{feature}/execution-results.json`n- QA 回填總表：qa-workspace/execution-results.csv"
    )
    return $sections -join "`n`n"
}

# ── 主流程 ──

Write-Output 'Syncing CSV to JSON...'
python scripts/sync-execution-results-sheet.py --import --sheet qa-workspace/execution-results.csv
Write-Output ''

if ($SpecDir) {
    $featureData = @(Get-FeatureReportData -SpecDir $SpecDir)
} elseif ($Feature) {
    $featureData = @(Get-FeatureReportData -SpecDir (Join-Path 'qa-workspace/specs' $Feature))
} else {
    $featureData = Get-ChildItem -Path 'qa-workspace/specs' -Directory |
        Where-Object { $_.Name -notmatch '^[._]' -and (Test-Path (Join-Path $_.FullName 'spec.md')) } |
        ForEach-Object { Get-FeatureReportData -SpecDir $_.FullName }
}

if (-not $featureData -or $featureData.Count -eq 0) { throw '找不到可產生報告的功能資料夾。' }

$s = Get-ReportStats -FeatureData $featureData

New-Item -ItemType Directory -Force -Path (Split-Path $QaReport -Parent) | Out-Null
Set-Content -LiteralPath $QaReport -Value (Get-QaReportContent -s $s) -Encoding UTF8

$pmStatus   = 'Skipped'
$wordStatus = 'Skipped'

if (-not $SkipPm) {
    New-Item -ItemType Directory -Force -Path (Split-Path $PmSummary -Parent) | Out-Null
    Set-Content -LiteralPath $PmSummary -Value (Get-PmSummaryContent -s $s -QaReport $QaReport) -Encoding UTF8
    $pmStatus = $PmSummary
}

if (-not $SkipPm -and -not $SkipWord) {
    $exportScript = Join-Path 'scripts' 'export-pm-report-docx.ps1'
    if (Test-Path $exportScript) {
        $exportOutput = & ".\$exportScript" -Source $PmSummary -Output $PmWord
        $exportOutput | Write-Output
        $exportedLine = $exportOutput | Where-Object { $_ -match '^Exported PM Word report:\s*(.+)$' } | Select-Object -First 1
        $wordStatus   = if ($exportedLine -match '^Exported PM Word report:\s*(.+)$') { $Matches[1] } else { $PmWord }
    } else {
        $wordStatus = "Export script not found: $exportScript"
    }
}

Write-Output "Generated QA report:`n  $QaReport"
Write-Output "Generated PM summary:`n  $pmStatus"
Write-Output "Generated PM Word report:`n  $wordStatus"
Write-Output "`nRelease status: $($s.ReleaseStatus)"

