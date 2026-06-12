# Generate SchemaSpy HTML documentation for the LUMEN PostgreSQL database.
# Uses viz.js for relationship diagrams (avoids Graphviz "Permission denied" on Windows).

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

function Read-DatabaseUrl {
    param([string]$EnvPath)
    if (-not (Test-Path $EnvPath)) {
        throw "Missing env file: $EnvPath"
    }
    foreach ($line in Get-Content $EnvPath) {
        if ($line -match '^DATABASE_URL=(.+)') {
            return $Matches[1].Trim()
        }
    }
    throw "DATABASE_URL not found in $EnvPath"
}

function Parse-PostgresUrl {
    param([string]$Url)
    # postgresql+asyncpg://user:pass@host:port/dbname
    if ($Url -notmatch 'postgresql(?:\+asyncpg)?://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/([^?]+)') {
        throw "Could not parse DATABASE_URL: $Url"
    }
    return @{
        User = $Matches[1]
        Password = $Matches[2]
        Host = $Matches[3]
        Port = if ($Matches[4]) { $Matches[4] } else { "5432" }
        Database = $Matches[5]
    }
}

$envPath = Join-Path (Split-Path $ScriptDir -Parent) "backend\.env"
$db = Parse-PostgresUrl (Read-DatabaseUrl $envPath)

# ASCII row counts in diagrams (avoid Arabic-Indic digits on Arabic Windows locales)
$env:LANG = "en_US.UTF-8"
$env:LC_ALL = "en_US.UTF-8"

$outputDir = Join-Path $ScriptDir "output"
$tempOutput = Join-Path $ScriptDir "output_build"

if (Test-Path $tempOutput) {
    Remove-Item -Recurse -Force $tempOutput
}

Write-Host "Generating SchemaSpy docs for $($db.Database) on $($db.Host):$($db.Port) ..."

java -jar (Join-Path $ScriptDir "schemaspy.jar") `
    -t pgsql `
    -dp (Join-Path $ScriptDir "postgresql.jar") `
    -host $db.Host `
    -port $db.Port `
    -db $db.Database `
    -u $db.User `
    -p $db.Password `
    -s public `
    -o $tempOutput `
    -vizjs

if ($LASTEXITCODE -ne 0) {
    throw "SchemaSpy failed with exit code $LASTEXITCODE"
}

if (Test-Path $outputDir) {
    Remove-Item -Recurse -Force $outputDir
}
Move-Item $tempOutput $outputDir

Write-Host "Done. Open: $outputDir\index.html"
Write-Host "Relationships: $outputDir\relationships.html"
