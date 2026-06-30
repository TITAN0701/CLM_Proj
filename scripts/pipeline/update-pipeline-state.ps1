# update-pipeline-state.ps1
# 更新 qa-workspace/.pipeline-state.json
# 用法：
#   .\scripts\update-pipeline-state.ps1 -Feature "login" -Qa5 "done" -TestsRun "done" -Pass 5 -Pending 1 -Fail 0
#   .\scripts\update-pipeline-state.ps1 -Finalize  (只更新 last_updated + totals)

param(
    [string]$Feature     = "",
    [string]$Qa5         = "",
    [string]$TestsRun    = "",
    [int]$Pass           = -1,
    [int]$Pending        = -1,
    [int]$Fail           = -1,
    [switch]$Finalize
)

$statePath = "qa-workspace\.pipeline-state.json"

# 讀取或初始化
if (Test-Path $statePath) {
    $raw = [System.IO.File]::ReadAllText($statePath, [System.Text.Encoding]::UTF8)
    $state = $raw | ConvertFrom-Json
} else {
    $state = [PSCustomObject]@{
        pipeline_id  = (Get-Date -Format "yyyy-MM-dd-HHmm")
        started_at   = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
        last_updated = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")
        scope        = "all"
        features     = [PSCustomObject]@{}
        totals       = [PSCustomObject]@{ pass = 0; pending = 0; fail = 0; specs = 0 }
    }
}

# 更新單一 feature
if ($Feature -ne "") {
    $entry = [PSCustomObject]@{
        qa5       = if ($Qa5 -ne "")      { $Qa5 }      else { "pending" }
        tests_run = if ($TestsRun -ne "") { $TestsRun }  else { "pending" }
        pass      = if ($Pass -ge 0)      { $Pass }      else { 0 }
        pending   = if ($Pending -ge 0)   { $Pending }   else { 0 }
        fail      = if ($Fail -ge 0)      { $Fail }      else { 0 }
    }
    $state.features | Add-Member -NotePropertyName $Feature -NotePropertyValue $entry -Force
}

# 重新計算 totals
if ($Finalize -or $Feature -ne "") {
    $totalPass = 0; $totalPending = 0; $totalFail = 0; $totalSpecs = 0
    $state.features.PSObject.Properties | ForEach-Object {
        $f = $_.Value
        $totalPass    += $f.pass
        $totalPending += $f.pending
        $totalFail    += $f.fail
        $totalSpecs   += ($f.pass + $f.pending + $f.fail)
    }
    $state.totals = [PSCustomObject]@{
        pass    = $totalPass
        pending = $totalPending
        fail    = $totalFail
        specs   = $totalSpecs
    }
}

$state.last_updated = (Get-Date -Format "yyyy-MM-ddTHH:mm:sszzz")

$json = $state | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($statePath, $json, [System.Text.Encoding]::UTF8)
if ($Finalize) {
    Write-Host "✅ pipeline-state.json totals 已重新計算：pass=$($state.totals.pass) pending=$($state.totals.pending) fail=$($state.totals.fail) specs=$($state.totals.specs)"
} elseif ($Feature -ne "") {
    $entry = $state.features.$Feature
    Write-Host "✅ pipeline-state.json 已更新：$Feature  pass=$($entry.pass) pending=$($entry.pending) fail=$($entry.fail)"
}
