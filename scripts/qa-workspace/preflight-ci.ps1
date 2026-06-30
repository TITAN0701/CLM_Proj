param(
    [Parameter(Mandatory=$false)]
    [string[]]$RequiredEnv = @(
        "CYPRESS_BASE_URL",
        "API_BASE_URL",
        "CYPRESS_TEST_USER_EMAIL",
        "CYPRESS_TEST_USER_PASSWORD"
    )
)

$ErrorActionPreference = "Stop"

$missing = @()
foreach ($name in $RequiredEnv) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        $missing += $name
    }
}

if ($missing.Count -gt 0) {
    throw "Missing required CI environment variables: $($missing -join ', '). Configure repository secrets before running QA automation."
}

$invalidUrls = @()
foreach ($name in @("CYPRESS_BASE_URL", "API_BASE_URL")) {
    $value = [Environment]::GetEnvironmentVariable($name)
    if ($value -and $value -notmatch '^https?://') {
        $invalidUrls += $name
    }
}

if ($invalidUrls.Count -gt 0) {
    throw "Invalid URL environment variables: $($invalidUrls -join ', '). Values must start with http:// or https://."
}

Write-Output "CI preflight passed. Required QA automation environment variables are configured."
