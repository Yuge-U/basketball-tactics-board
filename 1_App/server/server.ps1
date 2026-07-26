# スクリプト内のエラーを停止扱いにします。
$ErrorActionPreference = "Stop"

# このスクリプトが入っている1_App_Filesフォルダを取得します。
$ServerFolder = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppFolder = Split-Path -Parent $ServerFolder
# アプリ全体のルートフォルダを取得します。
$RootFolder = Split-Path -Parent $AppFolder
# 作戦JSONを保管する2_Play_Dataフォルダを設定します。
$DataFolder = Join-Path $RootFolder "2_Play_Data"
# 作戦データフォルダがない場合は新規作成します。
if (-not (Test-Path -LiteralPath $DataFolder)) {
    # 作戦データフォルダを作成します。
    New-Item -ItemType Directory -Path $DataFolder | Out-Null
}

# UTF-8をBOMなしで書き込むエンコーディングを作ります。
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
# ルートフォルダの正規化パスを取得します。
$RootFullPath = [System.IO.Path]::GetFullPath($RootFolder)
# データフォルダの正規化パスを取得します。
$DataFullPath = [System.IO.Path]::GetFullPath($DataFolder)
# パス判定用にルート末尾へ区切り文字を付けます。
$RootPrefix = $RootFullPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
# パス判定用にデータフォルダ末尾へ区切り文字を付けます。
$DataPrefix = $DataFullPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

# バイト列からHTTPヘッダー終端位置を探します。
function Find-HeaderEnd {
    # 検索対象のバイト列を受け取ります。
    param([byte[]]$Bytes)
    # CRLFCRLFを先頭から検索します。
    for ($Index = 0; $Index -le $Bytes.Length - 4; $Index++) {
        # 4バイトがCRLFCRLFなら位置を返します。
        if ($Bytes[$Index] -eq 13 -and $Bytes[$Index + 1] -eq 10 -and $Bytes[$Index + 2] -eq 13 -and $Bytes[$Index + 3] -eq 10) {
            # ヘッダー終端の先頭位置を返します。
            return $Index
        }
    }
    # 見つからない場合は-1を返します。
    return -1
}

# TCPストリームからHTTPリクエストを1件読み取ります。
function Read-HttpRequest {
    # 読込対象ストリームを受け取ります。
    param([System.Net.Sockets.NetworkStream]$Stream)
    # 受信データを蓄積するメモリを作ります。
    $Memory = New-Object System.IO.MemoryStream
    # 一度に読み取るバッファを作ります。
    $Buffer = New-Object byte[] 8192
    # ヘッダー終端位置を初期化します。
    $HeaderEnd = -1
    # ヘッダー全体を受信するまで繰り返します。
    while ($HeaderEnd -lt 0) {
        # ストリームからデータを読み取ります。
        $ReadCount = $Stream.Read($Buffer, 0, $Buffer.Length)
        # 接続終了の場合は空を返します。
        if ($ReadCount -le 0) {
            # リクエストなしとして返します。
            return $null
        }
        # 読み取ったバイトをメモリへ追加します。
        $Memory.Write($Buffer, 0, $ReadCount)
        # 現在の全バイトを取得します。
        $AllBytes = $Memory.ToArray()
        # ヘッダー終端を検索します。
        $HeaderEnd = Find-HeaderEnd -Bytes $AllBytes
        # 異常に大きいヘッダーを拒否します。
        if ($Memory.Length -gt 1048576) {
            # 不正リクエストとして例外にします。
            throw "HTTPヘッダーが大きすぎます。"
        }
    }
    # ヘッダー文字列をASCIIとして変換します。
    $HeaderText = [System.Text.Encoding]::ASCII.GetString($AllBytes, 0, $HeaderEnd)
    # ヘッダーを行ごとに分割します。
    $HeaderLines = $HeaderText -split "`r`n"
    # リクエスト行を空白で分割します。
    $RequestParts = $HeaderLines[0] -split " ", 3
    # リクエスト形式が不正なら例外にします。
    if ($RequestParts.Length -lt 2) {
        # 不正形式として停止します。
        throw "HTTPリクエスト行が不正です。"
    }
    # HTTPメソッドを取得します。
    $Method = $RequestParts[0].ToUpperInvariant()
    # リクエスト対象を取得します。
    $Target = $RequestParts[1]
    # ヘッダー格納用の連想配列を作ります。
    $Headers = @{}
    # 2行目以降のヘッダーを処理します。
    for ($LineIndex = 1; $LineIndex -lt $HeaderLines.Length; $LineIndex++) {
        # 現在行を取得します。
        $Line = $HeaderLines[$LineIndex]
        # コロン位置を取得します。
        $ColonIndex = $Line.IndexOf(":")
        # コロンがない行は無視します。
        if ($ColonIndex -lt 1) {
            # 次の行へ進みます。
            continue
        }
        # ヘッダー名を小文字で取得します。
        $HeaderName = $Line.Substring(0, $ColonIndex).Trim().ToLowerInvariant()
        # ヘッダー値を取得します。
        $HeaderValue = $Line.Substring($ColonIndex + 1).Trim()
        # 連想配列へ保存します。
        $Headers[$HeaderName] = $HeaderValue
    }
    # 本文長を初期化します。
    $ContentLength = 0
    # Content-Lengthがあれば数値へ変換します。
    if ($Headers.ContainsKey("content-length")) {
        # 本文のバイト数を取得します。
        $ContentLength = [int]$Headers["content-length"]
    }
    # 本文開始位置を計算します。
    $BodyStart = $HeaderEnd + 4
    # 必要な本文全体を受信するまで繰り返します。
    while (($Memory.Length - $BodyStart) -lt $ContentLength) {
        # 残りデータを読み取ります。
        $ReadCount = $Stream.Read($Buffer, 0, $Buffer.Length)
        # 途中で接続が切れた場合は例外にします。
        if ($ReadCount -le 0) {
            # 本文不足として停止します。
            throw "HTTP本文の受信が途中で終了しました。"
        }
        # 読み取った本文をメモリへ追加します。
        $Memory.Write($Buffer, 0, $ReadCount)
    }
    # 最終的な全バイトを取得します。
    $AllBytes = $Memory.ToArray()
    # 本文文字列を初期化します。
    $BodyText = ""
    # 本文がある場合はUTF-8へ変換します。
    if ($ContentLength -gt 0) {
        # 指定バイト数をUTF-8文字列へ変換します。
        $BodyText = [System.Text.Encoding]::UTF8.GetString($AllBytes, $BodyStart, $ContentLength)
    }
    # 読込結果をオブジェクトで返します。
    return [pscustomobject]@{
        # HTTPメソッドを返します。
        Method = $Method
        # リクエスト対象を返します。
        Target = $Target
        # ヘッダー一覧を返します。
        Headers = $Headers
        # 本文文字列を返します。
        Body = $BodyText
    }
}

# HTTP応答をクライアントへ返します。
function Send-HttpResponse {
    # 応答に必要な値を受け取ります。
    param(
        [System.Net.Sockets.NetworkStream]$Stream,
        [int]$StatusCode,
        [string]$StatusText,
        [string]$ContentType,
        [byte[]]$BodyBytes
    )
    # 本文が未指定の場合は空配列にします。
    if ($null -eq $BodyBytes) {
        # 空のバイト配列を設定します。
        $BodyBytes = New-Object byte[] 0
    }
    # HTTP応答ヘッダーを作ります。
    $HeaderText = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($BodyBytes.Length)`r`nCache-Control: no-store, no-cache, must-revalidate`r`nPragma: no-cache`r`nConnection: close`r`n`r`n"
    # ヘッダーをASCIIバイトへ変換します。
    $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($HeaderText)
    # ヘッダーを送信します。
    $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
    # 本文がある場合は送信します。
    if ($BodyBytes.Length -gt 0) {
        # 本文を送信します。
        $Stream.Write($BodyBytes, 0, $BodyBytes.Length)
    }
    # 送信内容を即時反映します。
    $Stream.Flush()
}

# JSON応答をクライアントへ返します。
function Send-JsonResponse {
    # 応答に必要な値を受け取ります。
    param(
        [System.Net.Sockets.NetworkStream]$Stream,
        [int]$StatusCode,
        [string]$StatusText,
        [object]$Data
    )
    # オブジェクトを十分な深さでJSONへ変換します。
    $JsonText = $Data | ConvertTo-Json -Depth 100
    # JSONをUTF-8バイトへ変換します。
    $JsonBytes = $Utf8NoBom.GetBytes($JsonText)
    # JSON形式で応答します。
    Send-HttpResponse -Stream $Stream -StatusCode $StatusCode -StatusText $StatusText -ContentType "application/json; charset=utf-8" -BodyBytes $JsonBytes
}

# データフォルダ配下の安全な絶対パスを取得します。
function Resolve-DataPath {
    # 相対パスを受け取ります。
    param([string]$RelativePath)
    # URL形式の区切り文字をWindows形式へ変換します。
    $LocalRelativePath = $RelativePath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    # 絶対パスへ変換します。
    $FullPath = [System.IO.Path]::GetFullPath((Join-Path $DataFullPath $LocalRelativePath))
    # データフォルダ外への移動を拒否します。
    if (-not $FullPath.StartsWith($DataPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        # 不正パスとして例外にします。
        throw "データフォルダ外のパスは利用できません。"
    }
    # 安全な絶対パスを返します。
    return $FullPath
}

# ルートフォルダ配下の安全な静的ファイルパスを取得します。
function Resolve-StaticPath {
    # URLパスを受け取ります。
    param([string]$UrlPath)
    # 先頭スラッシュを取り除きます。
    $RelativePath = $UrlPath.TrimStart("/")
    # ルートアクセスの場合はHTMLを指定します。
    if ([string]::IsNullOrWhiteSpace($RelativePath)) {
        # メインHTMLを指定します。
        $RelativePath = "Basketball_Tactics_Board.html"
    }
    # URL形式の区切り文字をWindows形式へ変換します。
    $LocalRelativePath = $RelativePath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    # 絶対パスへ変換します。
    $FullPath = [System.IO.Path]::GetFullPath((Join-Path $RootFullPath $LocalRelativePath))
    # ルート外への移動を拒否します。
    if (-not $FullPath.StartsWith($RootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        # 不正パスとして例外にします。
        throw "アプリフォルダ外のパスは利用できません。"
    }
    # 安全な絶対パスを返します。
    return $FullPath
}

# 拡張子に対応するContent-Typeを返します。
function Get-ContentType {
    # ファイルパスを受け取ります。
    param([string]$FilePath)
    # 拡張子を小文字で取得します。
    $Extension = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
    # 拡張子ごとのContent-Typeを返します。
    switch ($Extension) {
        ".html" { return "text/html; charset=utf-8" }
        ".css" { return "text/css; charset=utf-8" }
        ".js" { return "application/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".webmanifest" { return "application/manifest+json; charset=utf-8" }
        ".png" { return "image/png" }
        ".jpg" { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".svg" { return "image/svg+xml" }
        ".ico" { return "image/x-icon" }
        default { return "application/octet-stream" }
    }
}

# URLから指定クエリ値を取得します。
function Get-QueryValue {
    # URLとキーを受け取ります。
    param([string]$Target, [string]$Key)
    # クエリ開始位置を取得します。
    $QuestionIndex = $Target.IndexOf("?")
    # クエリがない場合は空を返します。
    if ($QuestionIndex -lt 0) {
        # 空文字を返します。
        return ""
    }
    # クエリ部分を取得します。
    $QueryText = $Target.Substring($QuestionIndex + 1)
    # アンパサンドで分割して確認します。
    foreach ($Pair in ($QueryText -split "&")) {
        # キーと値を2分割します。
        $Parts = $Pair -split "=", 2
        # 指定キーと一致する場合を処理します。
        if ($Parts.Length -ge 1 -and [System.Uri]::UnescapeDataString($Parts[0]) -eq $Key) {
            # 値がある場合はURLデコードして返します。
            if ($Parts.Length -eq 2) {
                # プラス記号を空白へ戻してから返します。
                return [System.Uri]::UnescapeDataString($Parts[1].Replace("+", " "))
            }
            # 値なしの場合は空を返します。
            return ""
        }
    }
    # 指定キーがない場合は空を返します。
    return ""
}

# 作戦名を安全なJSONファイル名へ変換します。
function ConvertTo-SafeFileName {
    # 作戦名を受け取ります。
    param([string]$Name)
    # 空の名前を既定値へ置き換えます。
    if ([string]::IsNullOrWhiteSpace($Name)) {
        # 既定の作戦名を設定します。
        $Name = "名称未設定の作戦"
    }
    # 利用できない文字を順番に置換します。
    foreach ($InvalidCharacter in [System.IO.Path]::GetInvalidFileNameChars()) {
        # 不正文字をアンダースコアへ置き換えます。
        $Name = $Name.Replace([string]$InvalidCharacter, "_")
    }
    # 前後の空白と末尾のピリオドを除去します。
    $Name = $Name.Trim().TrimEnd([char]".")
    # 変換後が空なら既定値へ戻します。
    if ([string]::IsNullOrWhiteSpace($Name)) {
        # 既定名を設定します。
        $Name = "名称未設定の作戦"
    }
    # JSON拡張子を付けて返します。
    return "$Name.json"
}

# 2_Play_Data内のJSON一覧を取得します。
function Get-TacticsList {
    # 一覧格納用の配列を作ります。
    $Items = @()
    # JSONファイルをサブフォルダも含めて取得します。
    $Files = Get-ChildItem -LiteralPath $DataFullPath -Filter "*.json" -File -Recurse -ErrorAction SilentlyContinue
    # 各JSONファイルを確認します。
    foreach ($File in $Files) {
        # データフォルダからの相対パスを作ります。
        $RelativePath = $File.FullName.Substring($DataPrefix.Length).Replace([System.IO.Path]::DirectorySeparatorChar, "/")
        try {
            # JSON文字列を読み込みます。
            $RawText = [System.IO.File]::ReadAllText($File.FullName, [System.Text.Encoding]::UTF8)
            # JSONをオブジェクトへ変換します。
            $Parsed = $RawText | ConvertFrom-Json
            # 書出し形式ならsnapshotを取得します。
            if ($null -ne $Parsed.snapshot) {
                # snapshotを作戦本体として使います。
                $Snapshot = $Parsed.snapshot
            } else {
                # 直接形式なら全体を作戦本体として使います。
                $Snapshot = $Parsed
            }
            # 作戦名をファイル内またはファイル名から取得します。
            if ($null -ne $Snapshot.playName -and -not [string]::IsNullOrWhiteSpace([string]$Snapshot.playName)) {
                # 保存された作戦名を使います。
                $PlayName = [string]$Snapshot.playName
            } else {
                # 拡張子を除いたファイル名を使います。
                $PlayName = [System.IO.Path]::GetFileNameWithoutExtension($File.Name)
            }
            # STEP数を初期化します。
            $StepCount = 0
            # STEP配列がある場合は件数を取得します。
            if ($null -ne $Snapshot.steps) {
                # STEP数を取得します。
                $StepCount = @($Snapshot.steps).Count
            }
            # 一覧項目を追加します。
            $Items += [pscustomobject]@{
                # 表示する作戦名を設定します。
                name = $PlayName
                # 読込に使う相対パスを設定します。
                relativePath = $RelativePath
                # 更新日時をISO形式で設定します。
                updatedAt = $File.LastWriteTime.ToString("o")
                # STEP数を設定します。
                stepCount = $StepCount
                # ファイルサイズを設定します。
                size = $File.Length
                # 正常データとして設定します。
                invalid = $false
            }
        } catch {
            # 不正JSONも一覧へ表示できるよう追加します。
            $Items += [pscustomobject]@{
                # ファイル名を表示名にします。
                name = [System.IO.Path]::GetFileNameWithoutExtension($File.Name)
                # 読込に使う相対パスを設定します。
                relativePath = $RelativePath
                # 更新日時をISO形式で設定します。
                updatedAt = $File.LastWriteTime.ToString("o")
                # STEP数を0にします。
                stepCount = 0
                # ファイルサイズを設定します。
                size = $File.Length
                # 不正データとして設定します。
                invalid = $true
            }
        }
    }
    # 更新日時の新しい順で返します。
    return @($Items | Sort-Object -Property updatedAt -Descending)
}

# 利用可能なローカルポートを探します。
$Listener = $null
# 8765番から順に試します。
for ($Port = 8765; $Port -le 8795; $Port++) {
    try {
        # ループバック専用のTCPリスナーを作ります。
        $Candidate = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
        # 待受を開始します。
        $Candidate.Start()
        # 利用できたリスナーを保存します。
        $Listener = $Candidate
        # ポート探索を終了します。
        break
    } catch {
        # 利用中のポートなら次を試します。
        continue
    }
}
# 利用可能なポートがない場合は停止します。
if ($null -eq $Listener) {
    # エラーを表示します。
    Write-Host "利用可能なポートを確保できませんでした。" -ForegroundColor Red
    # キー入力を待ちます。
    Read-Host "Enterキーで終了"
    # スクリプトを終了します。
    exit 1
}

# 起動URLを作ります。
$StartUrl = "http://127.0.0.1:$Port/Basketball_Tactics_Board.html"
# 起動案内を表示します。
Write-Host "ZEROONE CANVAS" -ForegroundColor Cyan
# 保存フォルダを表示します。
Write-Host "作戦データ: $DataFullPath"
# 終了方法を表示します。
Write-Host "この画面を閉じるとアプリサーバーが終了します。" -ForegroundColor Yellow
# ブラウザーでアプリを開きます。
Start-Process $StartUrl

try {
    # サーバー停止までリクエストを処理します。
    while ($true) {
        # クライアント接続を待ちます。
        $Client = $Listener.AcceptTcpClient()
        # 前回接続のストリームを引き継がないよう初期化します。
        $Stream = $null
        try {
            # 通信ストリームを取得します。
            $Stream = $Client.GetStream()
            # HTTPリクエストを読み込みます。
            $Request = Read-HttpRequest -Stream $Stream
            # 空リクエストの場合は次へ進みます。
            if ($null -eq $Request) {
                # 接続処理を終了します。
                continue
            }
            # パス部分だけを取得します。
            $RawPath = ($Request.Target -split "\?", 2)[0]
            # URLエンコードを解除します。
            $DecodedPath = [System.Uri]::UnescapeDataString($RawPath)

            # 作戦一覧APIを処理します。
            if ($Request.Method -eq "GET" -and $DecodedPath -eq "/api/tactics/list") {
                # 最新一覧を取得します。
                $Items = Get-TacticsList
                # 一覧をJSONで返します。
                Send-JsonResponse -Stream $Stream -StatusCode 200 -StatusText "OK" -Data ([pscustomobject]@{ success = $true; items = $Items })
                # 次の接続へ進みます。
                continue
            }

            # 作戦読込APIを処理します。
            if ($Request.Method -eq "GET" -and $DecodedPath -eq "/api/tactics/load") {
                # 対象相対パスを取得します。
                $RelativeFile = Get-QueryValue -Target $Request.Target -Key "file"
                # ファイル指定がない場合はエラーにします。
                if ([string]::IsNullOrWhiteSpace($RelativeFile)) {
                    # 必須項目エラーを返します。
                    Send-JsonResponse -Stream $Stream -StatusCode 400 -StatusText "Bad Request" -Data ([pscustomobject]@{ success = $false; message = "読込ファイルが指定されていません。" })
                    # 次の接続へ進みます。
                    continue
                }
                # 安全な絶対パスを取得します。
                $FilePath = Resolve-DataPath -RelativePath $RelativeFile
                # ファイルがない場合は404を返します。
                if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
                    # 未検出エラーを返します。
                    Send-JsonResponse -Stream $Stream -StatusCode 404 -StatusText "Not Found" -Data ([pscustomobject]@{ success = $false; message = "作戦ファイルが見つかりません。" })
                    # 次の接続へ進みます。
                    continue
                }
                # JSON文字列を読み込みます。
                $RawText = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8)
                # JSON形式を検証してオブジェクトへ変換します。
                $Parsed = $RawText | ConvertFrom-Json
                # 読込結果を返します。
                Send-JsonResponse -Stream $Stream -StatusCode 200 -StatusText "OK" -Data ([pscustomobject]@{ success = $true; data = $Parsed })
                # 次の接続へ進みます。
                continue
            }

            # 作戦保存APIを処理します。
            if ($Request.Method -eq "POST" -and $DecodedPath -eq "/api/tactics/save") {
                # 受信JSONをオブジェクトへ変換します。
                $Payload = $Request.Body | ConvertFrom-Json
                # 作戦名から安全なファイル名を作ります。
                $FileName = ConvertTo-SafeFileName -Name ([string]$Payload.name)
                # 指定された保存フォルダを安全な相対パスとして取得します。
                $FolderName = [string]$Payload.folder
                if ([string]::IsNullOrWhiteSpace($FolderName)) { $FolderName = "Shared" }
                $RelativeSavePath = ($FolderName.Trim("/", "\") + "/" + $FileName)
                # 保存先パスを取得します。
                $FilePath = Resolve-DataPath -RelativePath $RelativeSavePath
                # 保存先フォルダがなければ作成します。
                $ParentFolder = Split-Path -Parent $FilePath
                if (-not (Test-Path -LiteralPath $ParentFolder)) { New-Item -ItemType Directory -Path $ParentFolder -Force | Out-Null }
                # 保存データがない場合はエラーにします。
                if ($null -eq $Payload.data) {
                    # 必須データエラーを返します。
                    Send-JsonResponse -Stream $Stream -StatusCode 400 -StatusText "Bad Request" -Data ([pscustomobject]@{ success = $false; message = "保存する作戦データがありません。" })
                    # 次の接続へ進みます。
                    continue
                }
                # 作戦データを読みやすいJSONへ変換します。
                $JsonText = $Payload.data | ConvertTo-Json -Depth 100
                # BOMなしUTF-8で保存します。
                [System.IO.File]::WriteAllText($FilePath, $JsonText, $Utf8NoBom)
                # 保存結果を返します。
                Send-JsonResponse -Stream $Stream -StatusCode 200 -StatusText "OK" -Data ([pscustomobject]@{ success = $true; relativePath = $RelativeSavePath })
                # 次の接続へ進みます。
                continue
            }

            # 作戦削除APIを処理します。
            if ($Request.Method -eq "POST" -and $DecodedPath -eq "/api/tactics/delete") {
                # 受信JSONをオブジェクトへ変換します。
                $Payload = $Request.Body | ConvertFrom-Json
                # 削除対象を取得します。
                $RelativeFile = [string]$Payload.file
                # ファイル指定がない場合はエラーにします。
                if ([string]::IsNullOrWhiteSpace($RelativeFile)) {
                    # 必須項目エラーを返します。
                    Send-JsonResponse -Stream $Stream -StatusCode 400 -StatusText "Bad Request" -Data ([pscustomobject]@{ success = $false; message = "削除ファイルが指定されていません。" })
                    # 次の接続へ進みます。
                    continue
                }
                # 安全な絶対パスを取得します。
                $FilePath = Resolve-DataPath -RelativePath $RelativeFile
                # ファイルがある場合は削除します。
                if (Test-Path -LiteralPath $FilePath -PathType Leaf) {
                    # JSONファイルを削除します。
                    Remove-Item -LiteralPath $FilePath -Force
                }
                # 削除結果を返します。
                Send-JsonResponse -Stream $Stream -StatusCode 200 -StatusText "OK" -Data ([pscustomobject]@{ success = $true })
                # 次の接続へ進みます。
                continue
            }

            # GET以外の静的アクセスを拒否します。
            if ($Request.Method -ne "GET") {
                # 許可されていないメソッドを返します。
                Send-JsonResponse -Stream $Stream -StatusCode 405 -StatusText "Method Not Allowed" -Data ([pscustomobject]@{ success = $false; message = "この操作は利用できません。" })
                # 次の接続へ進みます。
                continue
            }

            # 静的ファイルの安全な絶対パスを取得します。
            $StaticPath = Resolve-StaticPath -UrlPath $DecodedPath
            # ファイルがない場合は404を返します。
            if (-not (Test-Path -LiteralPath $StaticPath -PathType Leaf)) {
                # 404本文を作ります。
                $NotFoundBytes = $Utf8NoBom.GetBytes("ファイルが見つかりません。")
                # 404応答を返します。
                Send-HttpResponse -Stream $Stream -StatusCode 404 -StatusText "Not Found" -ContentType "text/plain; charset=utf-8" -BodyBytes $NotFoundBytes
                # 次の接続へ進みます。
                continue
            }
            # 静的ファイルをバイトで読み込みます。
            $FileBytes = [System.IO.File]::ReadAllBytes($StaticPath)
            # 拡張子に対応するContent-Typeを取得します。
            $ContentType = Get-ContentType -FilePath $StaticPath
            # 静的ファイルを返します。
            Send-HttpResponse -Stream $Stream -StatusCode 200 -StatusText "OK" -ContentType $ContentType -BodyBytes $FileBytes
        } catch {
            # リクエスト処理エラーを記録します。
            Write-Warning $_.Exception.Message
            # 応答可能な場合は500エラーを返します。
            if ($null -ne $Stream -and $Stream.CanWrite) {
                # エラーJSONを返します。
                Send-JsonResponse -Stream $Stream -StatusCode 500 -StatusText "Internal Server Error" -Data ([pscustomobject]@{ success = $false; message = $_.Exception.Message })
            }
        } finally {
            # ストリームがある場合は閉じます。
            if ($null -ne $Stream) {
                # 通信ストリームを閉じます。
                $Stream.Close()
            }
            # クライアント接続を閉じます。
            $Client.Close()
        }
    }
} finally {
    # TCPリスナーを停止します。
    $Listener.Stop()
}
