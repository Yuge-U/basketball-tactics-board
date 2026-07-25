# Basketball Tactics Board v22

GitHub Pagesで無料公開し、個人用OneDriveへ作戦を保存できる版です。
同じMicrosoftアカウントで接続すれば、Windows PC、Mac、iPadのブラウザーから同じ作戦ライブラリを利用できます。

最初に次の順で手順書を開いてください。

1. `GITHUB_PAGES_SETUP.md` — GitHub Pagesで公開
2. `ONEDRIVE_SETUP.md` — 個人用OneDriveを接続
3. `IPAD_DEPLOYMENT.md` — iPadのホーム画面へ追加

## データの扱い

- アプリ本体：GitHub Pages
- 保存した作戦：個人用OneDriveのアプリ専用フォルダ
- 作業中の自動保存：操作中の端末内
- 手動バックアップ：従来どおり「JSON保存」「JSON読込」も利用可能

GitHubへ個人の作戦JSONをアップロードする必要はありません。
OneDrive連携は `Files.ReadWrite.AppFolder` だけを使用し、専用アプリフォルダ以外のOneDriveファイルへはアクセスしません。
