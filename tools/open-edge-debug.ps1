param(
  [string]$Url = "http://127.0.0.1:3000/"
)

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$userData = "C:\Users\Pc_Lu\AppData\Local\Temp\codex-edge-debug"

if (!(Test-Path $edgePath)) {
  throw "Edge not found at $edgePath"
}

if (!(Test-Path $userData)) {
  New-Item -ItemType Directory -Path $userData | Out-Null
}

$args = @(
  "--new-window",
  "--remote-debugging-port=9222",
  "--user-data-dir=$userData",
  $Url
)

Start-Process -FilePath $edgePath -ArgumentList $args
