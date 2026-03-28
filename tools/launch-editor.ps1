param()

$ErrorActionPreference = "Stop"

function Get-ProjectRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-LauncherConfig {
  param(
    [string]$ProjectRoot
  )

  $packageJsonPath = Join-Path $ProjectRoot "package.json"
  $packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
  $editorScriptNames = @("app:edge", "edge:editor")
  $editorScriptName = $null
  $editorScript = $null

  foreach ($candidate in $editorScriptNames) {
    $candidateValue = $packageJson.scripts.$candidate
    if ($candidateValue) {
      $editorScriptName = $candidate
      $editorScript = [string]$candidateValue
      break
    }
  }

  if (-not $editorScriptName) {
    throw "Nao encontrei app:edge nem edge:editor em $packageJsonPath."
  }

  $editorUrlMatch = [regex]::Match($editorScript, 'https?://[^"\s]+')
  if (-not $editorUrlMatch.Success) {
    throw "Nao consegui extrair a URL do editor a partir do script '$editorScriptName'."
  }

  $editorUrl = [Uri]$editorUrlMatch.Value
  $devUrl = [Uri]($editorUrl.GetLeftPart([System.UriPartial]::Authority) + "/")

  return [pscustomobject]@{
    ProjectRoot   = $ProjectRoot
    PackageJson   = $packageJsonPath
    DevScript     = "dev"
    OpenScript    = $editorScriptName
    DevUrl        = $devUrl.AbsoluteUri
    EditorUrl     = $editorUrl.AbsoluteUri
    Host          = $editorUrl.Host
    Port          = $editorUrl.Port
    RootProbePath = ""
    FileProbePath = "/src/app/appBootstrap.ts"
    FileProbeText = "battle-layout-editor"
  }
}

function Test-TcpPortOpen {
  param(
    [string]$TargetHost,
    [int]$Port
  )

  $client = [System.Net.Sockets.TcpClient]::new()

  try {
    $async = $client.BeginConnect($TargetHost, $Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(500)) {
      return $false
    }

    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Invoke-HttpProbe {
  param(
    [string]$Url,
    [string]$ExpectedText
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    $ok = $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
    if (-not $ok) {
      return [pscustomobject]@{
        Ok      = $false
        Message = "HTTP $($response.StatusCode)"
      }
    }

    if ($ExpectedText -and $response.Content -notmatch [regex]::Escape($ExpectedText)) {
      return [pscustomobject]@{
        Ok      = $false
        Message = "Resposta nao contem o marcador esperado '$ExpectedText'."
      }
    }

    return [pscustomobject]@{
      Ok      = $true
      Message = "HTTP $($response.StatusCode)"
    }
  } catch {
    return [pscustomobject]@{
      Ok      = $false
      Message = $_.Exception.Message
    }
  }
}

function Get-DevServerStatus {
  param(
    $Config
  )

  $rootProbe = Invoke-HttpProbe -Url ($Config.DevUrl + $Config.RootProbePath) -ExpectedText "/src/main.tsx"
  $fileProbe = Invoke-HttpProbe -Url ($Config.DevUrl.TrimEnd("/") + $Config.FileProbePath) -ExpectedText $Config.FileProbeText
  $portOpen = Test-TcpPortOpen -TargetHost $Config.Host -Port $Config.Port

  $status = if ($rootProbe.Ok -and $fileProbe.Ok) {
    "running"
  } elseif ($portOpen) {
    "port-open-not-validated"
  } else {
    "stopped"
  }

  return [pscustomobject]@{
    Status    = $status
    PortOpen  = $portOpen
    RootProbe = $rootProbe
    FileProbe = $fileProbe
  }
}

function Start-ProjectDevServer {
  param(
    $Config
  )

  $escapedProjectRoot = $Config.ProjectRoot.Replace("'", "''")
  $windowCommand = @(
    "Set-Location -LiteralPath '$escapedProjectRoot'",
    '$Host.UI.RawUI.WindowTitle = ''Syllable Battle Dev Server''',
    'npm.cmd run dev'
  ) -join "; "

  Start-Process -FilePath "powershell.exe" `
    -WorkingDirectory $Config.ProjectRoot `
    -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $windowCommand) `
    | Out-Null
}

function Wait-ForProjectDevServer {
  param(
    $Config,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  do {
    Start-Sleep -Seconds 1
    $status = Get-DevServerStatus -Config $Config

    if ($status.Status -eq "running") {
      return $status
    }

  } while ((Get-Date) -lt $deadline)

  throw "O dev server nao ficou pronto em $TimeoutSeconds segundos. Root probe: $($status.RootProbe.Message) | File probe: $($status.FileProbe.Message)"
}

function Open-ProjectEditor {
  param(
    $Config
  )

  Push-Location $Config.ProjectRoot
  try {
    & npm.cmd run $Config.OpenScript
  } finally {
    Pop-Location
  }
}

$mutexName = "Local\SyllableBattleEditorLauncher"
$mutex = [System.Threading.Mutex]::new($false, $mutexName)
$hasMutex = $false

try {
  $hasMutex = $mutex.WaitOne([TimeSpan]::FromMinutes(2))
  if (-not $hasMutex) {
    throw "Nao consegui obter o lock do launcher em 2 minutos."
  }

  $projectRoot = Get-ProjectRoot
  $config = Get-LauncherConfig -ProjectRoot $projectRoot
  $initialStatus = Get-DevServerStatus -Config $config

  switch ($initialStatus.Status) {
    "running" {
      Write-Host "Dev server correto ja esta ativo em $($config.DevUrl)"
    }
    "stopped" {
      Write-Host "Dev server nao estava ativo. Iniciando npm run dev em $($config.ProjectRoot)..."
      Start-ProjectDevServer -Config $config
      Wait-ForProjectDevServer -Config $config | Out-Null
      Write-Host "Dev server pronto em $($config.DevUrl)"
    }
    "port-open-not-validated" {
      Write-Host "A porta $($config.Port) ja esta com listener ativo. Validando se o projeto certo ainda esta terminando de subir..."
      try {
        Wait-ForProjectDevServer -Config $config -TimeoutSeconds 10 | Out-Null
        Write-Host "Dev server correto ficou disponivel em $($config.DevUrl)"
      } catch {
        throw "A porta $($config.Port) ja esta em uso, mas a URL nao bate com este projeto. Root probe: $($initialStatus.RootProbe.Message) | File probe: $($initialStatus.FileProbe.Message)"
      }
    }
    default {
      throw "Status inesperado do dev server: $($initialStatus.Status)"
    }
  }

  Write-Host "Abrindo o editor com npm run $($config.OpenScript)..."
  Open-ProjectEditor -Config $config
} finally {
  if ($hasMutex) {
    $mutex.ReleaseMutex() | Out-Null
  }

  $mutex.Dispose()
}
