# Prepare portable native QA tools, never production services.
$ErrorActionPreference = 'Stop'
$workspace = (Get-Location).Path
$nativeBase = Join-Path $workspace '.tmp/native'
New-Item -ItemType Directory -Force $nativeBase | Out-Null
$downloads = @{
  'php.zip' = 'https://www.php.net/~windows/releases/php-8.3.36-1-nts-Win32-vs16-x64.zip'
  'mariadb.zip' = 'https://archive.mariadb.org/mariadb-11.4.5/winx64-packages/mariadb-11.4.5-winx64.zip'
  'wordpress.zip' = 'https://wordpress.org/wordpress-6.8.3.zip'
}
foreach ($name in $downloads.Keys) {
  $filePath = Join-Path $nativeBase $name
  if (!(Test-Path -LiteralPath $filePath)) { Invoke-WebRequest $downloads[$name] -OutFile $filePath }
}
if (!(Test-Path (Join-Path $nativeBase 'php/php.exe'))) { Expand-Archive -LiteralPath (Join-Path $nativeBase 'php.zip') -DestinationPath (Join-Path $nativeBase 'php') }
if (!(Test-Path (Join-Path $nativeBase 'mariadb/mariadb-11.4.5-winx64/bin/mysqld.exe'))) { Expand-Archive -LiteralPath (Join-Path $nativeBase 'mariadb.zip') -DestinationPath (Join-Path $nativeBase 'mariadb') }
$phpBase = (Join-Path $nativeBase 'php').Replace('\','/')
@"
extension_dir="$phpBase/ext"
extension=mysqli
extension=mbstring
extension=openssl
extension=fileinfo
extension=gd
extension=curl
extension=zip
memory_limit=512M
upload_max_filesize=10M
post_max_size=12M
date.timezone=UTC
"@ | Set-Content (Join-Path $nativeBase 'php/php.ini')
$passFile = Join-Path $nativeBase 'password.txt'
$dbData = Join-Path $nativeBase 'data'
if (!(Test-Path -LiteralPath $passFile)) {
  if (Test-Path (Join-Path $dbData 'my.ini')) { throw 'Existing database has no QA password file. Do not modify it automatically.' }
  [guid]::NewGuid().ToString('N') | Set-Content $passFile
}
$qaPass = (Get-Content -LiteralPath $passFile -Raw).Trim()
$dbBin = Join-Path $nativeBase 'mariadb/mariadb-11.4.5-winx64/bin'
if (!(Test-Path (Join-Path $dbData 'my.ini'))) {
  New-Item -ItemType Directory -Force $dbData | Out-Null
  & (Join-Path $dbBin 'mariadb-install-db.exe') "--datadir=$dbData" "--password=$qaPass" '--port=3309'
  if ($LASTEXITCODE) { throw 'Local database initialization failed' }
}
$client = Join-Path $nativeBase 'client.ini'
@"
[client]
user=root
password=$qaPass
host=127.0.0.1
port=3309
"@ | Set-Content -LiteralPath $client
& (Join-Path $dbBin 'mariadb-admin.exe') "--defaults-file=$client" 'ping' 2>$null | Out-Null
if ($LASTEXITCODE) {
  $dbIni = Join-Path $dbData 'my.ini'
  $helper = Start-Process -FilePath (Join-Path $dbBin 'mysqld.exe') -ArgumentList @("--defaults-file=`"$dbIni`"",'--bind-address=127.0.0.1','--port=3309','--console') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $nativeBase 'server.log') -RedirectStandardError (Join-Path $nativeBase 'server-error.log')
  $helper.Id | Set-Content (Join-Path $nativeBase 'server.pid')
}
Write-Output 'Portable QA prepared. Wait for MariaDB readiness, then run node scripts/test-native-wp.mjs. No Windows service was installed.'
