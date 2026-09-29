# ZERO ONE WebKit regression v0.3.1

基準日：2026-09-29。
対象：独立したSQLite WASM／OPFS保存試験。製品全画面・実OneDrive・物理iPhoneの受入ではない。

## 実行確認

| 環境 | run 36501336880 | run 36501868984 |
|---|---|---|
| Ubuntu 24.04 / WebKit | 10/10合格 | 10/10合格 |
| macOS 15 / WebKit | 10/10合格 | 10/10合格 |
| Ubuntu 24.04 / Chromium | 10/10合格 | 10/10合格 |
| macOS 15 / Chromium | 10/10合格 | 10/10合格 |

Node 22.16.0、Playwright 1.63.0、SQLite 3.53.4。
同じ10シナリオを4環境で2回実行。80種類の独立要件ではない。
両回の `browser-storage-fixed.mjs` が同じバイトであることを成果物から照合した。
各回の `fixed-results.json` をダウンロードして全結果を確認した。失敗ケースのskipや自動再試行はない。

初回コミット：307964d1079c08d526a7c8654dda1ba8eb6f126b。
再確認コミット：12972fb7d53f982cb1ca5796762b0863e0bba879。

## 不合格の切分けと対応

1. S07：macOS Playwright WebKitで、別の永続プロファイルでも同一OSホームではOPFSの値が混ざることを、SQLiteなしの標準APIで再現。合成端末ごとのOS保存領域と永続プロファイルを分離した。同じURL・同じDB名・同じアカウントスコープを維持し、双方向非混入と再起動を確認。これは検証子プロセスの設定であり、利用者の端末設定やアプリDB名を変更するものではない。Safariや物理iPhoneでの情報漏えいを示したものでもない。
2. S08：`setOffline(true)` にすると、固定HTMLを返すだけのService WorkerでもWebKitが内部エラーとなることを再現。公式Issue #42775と一致する。元の診断失敗を残し、配信サーバーと接続を本当に停止する保存要件試験を実行。未キャッシュURLの通信失敗、キャッシュからのHTTP200応答、Service Worker経由、SQLiteの書込・読取・outbox・整合性を検証した。サーバー到達不能は機内モードやnavigator.onLine=falseと同一ではない。Playwrightエンジン自体は修正していない。
3. S09：先行するS08で保存されなかった行まで期待していた依存を解消。強制終了試験自身で2件の保存成功を確認してから停止し、再起動後に本文と送信待ちの完全一致を確認。ブラウザプロセス全体の再起動もS10として追加した。

原診断の一時コンテキストOPFSエラー、macOS同一OSホームの非分離、疑似オフラインの内部エラーは `diagnostic.json` に残している。診断プロセスの終了コード0を全ケース合格と解釈しない。
関連公式Issue：https://github.com/microsoft/playwright/issues/42775
関連PR：https://github.com/microsoft/playwright/pull/42894 （確認時点で未マージ）

## 配布版・本番への影響

配布版v0.3.1の共通処理150件はローカルで再実行し150合格。製品UI試験コードに同じ環境分離・配信停止方法を反映したが、製品UI試験自体は今回未実行。
アプリの実行コードは版識別子以外変更していない。SQLite方式、既存DBパス、OneDrive保存先、同期・認証ロジックは維持。
検証ブランチのみ変更。mainは0a1537578ffaa94297782acd4994e5f86674c800のまま。Pages、Microsoft設定、本人OneDrive、公開CANVAS／TERMINOLOGYを変更していない。

途中のrun36501702220のmacOSジョブは、保存試験で使わない公開部品取得のHTTP403で準備失敗。実ブラウザ試験は未実行で合格に数えない。不要な取得をCI前提から外して再確認runを実行した。必要なSQLiteのハッシュ照合は維持。

次の未検証範囲：製品全画面、実Microsoft認証／OneDrive、物理PC・iPhone、Safariホーム画面版、OS通信切替、容量不足・削除・長時間ロック復帰。
