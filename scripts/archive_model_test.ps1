$ErrorActionPreference = 'Stop'

$sourceDir = 'public/assets/brigades/model_test'
if (-not (Test-Path $sourceDir)) {
  throw "Source folder not found: $sourceDir"
}

$campaignJson = Get-ChildItem -Path $sourceDir -File -Filter '*.json' | Where-Object {
  $_.BaseName -match '^(?<brigade>[a-z0-9]+(?:_[a-z0-9]+)*)_(?<model>[a-z][a-z0-9.-]*\d[a-z0-9.-]*)$'
}
if (-not $campaignJson) {
  throw 'No campaign JSON files found to infer brigade slug.'
}

$brigade = (
  $campaignJson | ForEach-Object {
    [regex]::Match(
      $_.BaseName,
      '^(?<brigade>[a-z0-9]+(?:_[a-z0-9]+)*)_(?<model>[a-z][a-z0-9.-]*\d[a-z0-9.-]*)$'
    ).Groups['brigade'].Value
  } | Group-Object | Sort-Object Count -Descending | Select-Object -First 1
).Name

$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$zipPath = "public/assets/brigades/model_test_${brigade}_archive_${timestamp}.zip"

$stagingRoot = Join-Path $env:TEMP ("model_test_stage_" + [guid]::NewGuid().ToString('N'))
$stagingModelTest = Join-Path $stagingRoot 'model_test'
New-Item -ItemType Directory -Path $stagingModelTest -Force | Out-Null

Get-ChildItem -Path $sourceDir -Recurse -File | Where-Object {
  $_.Extension -ne '.log' -and
  $_.Name -notmatch '^model_test_.*_archive_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.zip$' -and
  $_.Name -notmatch '^model_test_archive_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.zip$'
} | ForEach-Object {
  $relative = $_.FullName.Substring((Resolve-Path $sourceDir).Path.Length).TrimStart('\\')
  $dest = Join-Path $stagingModelTest $relative
  $destDir = Split-Path $dest -Parent
  if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
  }
  Copy-Item -Path $_.FullName -Destination $dest -Force
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

Compress-Archive -Path $stagingModelTest -DestinationPath $zipPath -CompressionLevel Optimal

$zipInfo = Get-Item $zipPath
$includedLogs = (Get-ChildItem -Path $stagingModelTest -Recurse -File -Filter '*.log' | Measure-Object).Count

Remove-Item -Path $stagingRoot -Recurse -Force

Write-Host ''
Write-Host 'Archive created:'
Write-Host "  $($zipInfo.FullName)"
Write-Host "Size (bytes): $($zipInfo.Length)"
Write-Host "Log files in ZIP: $includedLogs"
