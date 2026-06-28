# ================================================================
# scripts/server.ps1 — 사후관리 AI · 로컬 정적 파일 서버
# version: 1.0.0
#
# 사용법:
#   프로젝트 루트에서:  .\scripts\server.ps1
#   포트 지정:          .\scripts\server.ps1 -Port 8080
#   종료:               Ctrl+C
# ================================================================

param(
    [int]$Port = 3000
)

# ── MIME 타입 맵 ──
$mimeTypes = @{
    '.html'  = 'text/html; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.js'    = 'application/javascript; charset=utf-8'
    '.json'  = 'application/json; charset=utf-8'
    '.png'   = 'image/png'
    '.jpg'   = 'image/jpeg'
    '.jpeg'  = 'image/jpeg'
    '.gif'   = 'image/gif'
    '.svg'   = 'image/svg+xml'
    '.ico'   = 'image/x-icon'
    '.woff'  = 'font/woff'
    '.woff2' = 'font/woff2'
}

# ── 서버 루트: scripts/ 의 한 단계 위(프로젝트 루트) ──
$root = Split-Path -Parent $PSScriptRoot

# ── HttpListener 초기화 ──
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host ""
Write-Host "  ┌─────────────────────────────────────────┐"
Write-Host "  │  사후관리 AI · 로컬 서버 실행 중         │"
Write-Host "  │                                         │"
Write-Host "  │  URL : http://localhost:$Port             │"
Write-Host "  │  루트: $root"
Write-Host "  │                                         │"
Write-Host "  │  종료하려면 Ctrl+C 를 누르세요           │"
Write-Host "  └─────────────────────────────────────────┘"
Write-Host ""

# ── 요청 처리 루프 ──
try {
    while ($listener.IsListening) {

        # 다음 요청 대기 (비동기로 받아서 Ctrl+C 감지 가능하게 처리)
        $contextTask = $listener.GetContextAsync()
        while (-not $contextTask.IsCompleted) {
            Start-Sleep -Milliseconds 100
        }
        $context  = $contextTask.Result
        $request  = $context.Request
        $response = $context.Response

        # ── URL 경로 → 파일 경로 변환 ──
        $urlPath = $request.Url.AbsolutePath

        # 루트("/") 요청은 index.html로 처리
        if ($urlPath -eq '/') { $urlPath = '/index.html' }

        # 경로 탐색 공격(path traversal) 방어: 루트 밖을 벗어나는 경로 차단
        $filePath = [System.IO.Path]::GetFullPath(
            [System.IO.Path]::Combine($root, $urlPath.TrimStart('/'))
        )
        if (-not $filePath.StartsWith($root)) {
            $response.StatusCode = 403
            $response.Close()
            continue
        }

        # ── 파일 존재 여부 확인 및 응답 ──
        if ([System.IO.File]::Exists($filePath)) {
            $ext   = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime  = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)

            $response.ContentType      = $mime
            $response.ContentLength64  = $bytes.Length
            $response.StatusCode       = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)

            $ts = Get-Date -Format 'HH:mm:ss'
            Write-Host "  [$ts] 200  $urlPath"
        } else {
            # 파일 없음 → 404
            $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.ContentType      = 'text/plain; charset=utf-8'
            $response.ContentLength64  = $body.Length
            $response.StatusCode       = 404
            $response.OutputStream.Write($body, 0, $body.Length)

            $ts = Get-Date -Format 'HH:mm:ss'
            Write-Host "  [$ts] 404  $urlPath" -ForegroundColor DarkYellow
        }

        $response.OutputStream.Close()
    }
} finally {
    # ── 종료 시 서버 정리 ──
    $listener.Stop()
    $listener.Close()
    Write-Host ""
    Write-Host "  서버가 종료되었습니다." -ForegroundColor DarkGray
}
