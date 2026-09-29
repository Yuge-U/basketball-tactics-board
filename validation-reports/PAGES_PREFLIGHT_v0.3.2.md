# ZERO ONE PRACTICE v0.3.2 — 公開前の配置検証

2026-09-29。状態：公開準備版。HTTPS検証サイトは未作成・未公開。本人のMicrosoft認証、実OneDrive、物理PC／iPhone引継ぎは未検証。

## 実行した検証

GitHub Actions run 36505420970、commit b9390aa320ec39a19f649849a1111e26e4968453。両OSのジョブがsuccessとなり、両成果物ZIPのSHA-256と実結果JSONを照合した。

| 環境 | 実画面シナリオ |
|---|---|
| macOS 15 / WebKit | 11/11合格 |
| Ubuntu 24.04 / WebKit | 11/11合格 |
| macOS 15 / Chromium | 11/11合格 |
| Ubuntu 24.04 / Chromium | 11/11合格 |

各OSのpages-smoke.jsonは22実行・22合格・errors=[]。同じ11シナリオを4環境で実施した結果であり、44個の独立した機能を検証したという意味ではない。

従来の9画面シナリオを /zero-one-practice-lab/ 配下で再実行し、認証リダイレクトURI・Service Workerのscope・ホーム画面manifestのstart_url/scope、およびHTMLのCSPによるインラインスクリプト拒否を2シナリオとして追加した。
試験サーバーはローカルHTTPであり、GitHub Pagesや実HTTPS/TLSを測定したものではない。配信停止と機内モードも同一条件ではない。

ローカルの共通ロジックは150/150合格、skip=0。JavaScript構文は33ファイル失敗0。同梱部品・実HTTP配信・版表示など8確認も合格。
版更新直後の共通試験では、SWキャッシュ名の旧版期待値で3件失敗した。期待する版名だけを0.3.2へ更新し、全150件を再実行した。配布検査ツールの版表示期待値も同様に更新した。

## 実行コードの変更

公開時に独自のHTTPレスポンスヘッダーがなくても方針が適用されるよう、index.htmlにCSPとno-referrerのmeta指定を追加した。CSPは既存ローカルサーバーの方針と同じ許可先を使い、metaで適用できないframe-ancestorsは含めていない。全セキュリティ項目の網羅試験ではない。
版表示を0.3.2とし、Service Workerのキャッシュ版も更新した。DB名、アカウント境界、OneDriveのZERO_ONE_PRACTICE_LAB_V02、保存・同期・認証ロジックは変更していない。
前回合格CI成果物と今回をバイト比較し、公開ファイルの差分はconfig.mjs、index.html、sw.jsだけだった。LinuxとmacOSで公開ファイルの内容が同一であることも確認した。
配布には実際に試験したsite、コメント付きのsource、検証報告・ログを分離して収録する。siteへは静的配信用の空.nojekyllと既存の第三者部品案内も追加する。

## 変更しなかったもの／次の工程

変更はlab/practice-browser-v03だけ。mainは0a1537578ffaa94297782acd4994e5f86674c800のまま。公開中のCANVAS／TERMINOLOGY、Pages設定、Microsoftアプリ登録、本人OneDriveは変更していない。
現時点の接続に新規GitHubリポジトリ作成・Pages設定変更の操作はないため、ユーザーによる初期設定が必要。新規公開先候補はYuge-U/zero-one-practice-lab。Public＋READMEありで新規作成し、その新規リポジトリのPages SourceをGitHub Actionsへ設定する。
このリポジトリはまだ作成していない。初期設定後に実際の保存先と権限を確認して配置する。既存アプリのPages公開元を差し替えない。
MicrosoftのSPA戻り先追加は実際のHTTPS公開URLを確認してから行い、本人サインイン後にPC→iPhone→PCの実データ転送試験を行う。パスワードやトークンのチャット共有は不要。

## 成果物ハッシュ

macOS: 6533acbe138f15a9ef41d497d8c26121e6773a504e77c5e4ceea3ce34b7a65db
Linux: b6e238a4d04a1eda04383358e50a3d57a30ce25711a28f150b2c0b69e01a6943
