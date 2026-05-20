# 自分宛 Gmail 送信ヘルパー

## セットアップ (初回のみ)

### 1. Google アカウントでアプリパスワード発行
1. https://myaccount.google.com/security で 2段階認証を ON
2. https://myaccount.google.com/apppasswords で「Claude Code」名義のパスワードを発行 (16桁)

### 2. 環境変数を Windows ユーザーレベルで登録 (PowerShell)

```powershell
[Environment]::SetEnvironmentVariable("GMAIL_USER", "kenkenkenshi54@gmail.com", "User")
[Environment]::SetEnvironmentVariable("GMAIL_APP_PASSWORD", "xxxxxxxxxxxxxxxx", "User")
[Environment]::SetEnvironmentVariable("MAIL_TO", "kenkenkenshi54@gmail.com,kamei.kenshi@adlittle.com", "User")
```

設定後、ターミナル / Claude Code を再起動して反映。

`MAIL_TO` を未設定にすると、`GMAIL_USER`(送信元)と同じアドレス1件のみに飛びます。
複数宛先はカンマ区切り、スペース不可。

### 3. インストール (済み)

```bash
cd workspace/scripts
npm install   # nodemailer
```

## 使い方

```bash
# 単純なテキスト送信
node workspace/scripts/send_to_self.cjs --subject "DD完了通知" --body "5社の比較データExcel完成"

# 本文をファイルから読む
node workspace/scripts/send_to_self.cjs --subject "リサーチメモ" --body-file research.md

# 添付ファイル付き
node workspace/scripts/send_to_self.cjs \
  --subject "建設DD最終Excel" \
  --body "添付の通り" \
  --attach workspace/business-dd/work_overall/建設技術者派遣5社_セグメント比較_FY16-FY25.xlsx

# 複数添付
node workspace/scripts/send_to_self.cjs --subject "DD一式" --body "..." \
  --attach a.xlsx --attach b.docx --attach c.pdf

# HTML本文
node workspace/scripts/send_to_self.cjs --subject "HTML" --body "<h1>Hi</h1>" --html
```

## トラブルシューティング

- `EAUTH` エラー → アプリパスワードが間違っている / 2段階認証OFF
- `GMAIL_USER と GMAIL_APP_PASSWORD の環境変数を設定してください` → 環境変数未登録、または Claude Code 再起動が必要
- 添付ファイルが見つからない → 絶対パスで指定するか、cwd を確認
