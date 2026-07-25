# GitHub Pages 無料公開手順

## 1. GitHubで新しいリポジトリを作成

1. GitHub右上の「＋」を押します。
2. 「New repository」を押します。
3. Repository nameを `basketball-tactics-board` にします。
4. Publicを選択します。
5. 「Create repository」を押します。

無料プランでGitHub Pagesを使う場合、リポジトリはPublicにします。アプリ本体は公開されますが、作戦JSONはGitHubへアップロードしません。

## 2. このフォルダの中身をアップロード

GitHubのリポジトリ画面で、

1. 「uploading an existing file」を押します。
2. このフォルダの中身をすべてドラッグします。
3. 画面下の「Commit changes」を押します。

ZIPファイルそのものではなく、ZIPを展開した中身をアップロードしてください。`index.html` がリポジトリ直下にある状態にします。

## 3. GitHub Pagesを有効化

1. リポジトリ上部の「Settings」を押します。
2. 左側の「Pages」を押します。
3. Sourceで「Deploy from a branch」を選びます。
4. Branchを `main`、フォルダを `/(root)` にします。
5. 「Save」を押します。

数分後に次の形式のURLが表示されます。

```text
https://GitHubユーザー名.github.io/basketball-tactics-board/
```

## 4. iPadのホーム画面へ追加

公開URLが決まったら、先に `ONEDRIVE_SETUP.md` に沿ってOneDrive連携を設定します。
そのあとiPadで次の操作をします。

1. Safariで公開URLを開きます。
2. 共有ボタンを押します。
3. 「ホーム画面に追加」を押します。
4. 「追加」を押します。

以後はホーム画面のアイコンから起動できます。初回表示後はアプリ本体が端末へ保存されるため、通信が不安定な場所でも起動しやすくなります。

## 作戦データの保存

画面上部の「OneDrive接続」から個人用Microsoftアカウントへ接続します。
以後は「作戦保存」でOneDriveへ保存され、「ライブラリ」に同じアカウントの作戦が表示されます。
PCとiPadのどちらでも同じ手順です。

「JSON保存」「JSON読込」は、OneDrive連携とは別の手動バックアップとして残しています。

## 更新方法

修正版のファイルを同じリポジトリへ上書きアップロードすると、GitHub Pagesも更新されます。iPadで古い画面が残る場合はSafariで一度再読み込みしてください。
