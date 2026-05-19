---
name: media-search
description: 日経電子版・日経ビジネス・東洋経済オンラインを横断検索し、認証済みセッションで本文を取得・Markdown化する。Google検索でURLを発見→Playwrightで本文取得という2段構えのアプローチ。business-dd / case-analysis / topic-study / mission-creation など他スキルから呼ばれる基盤スキル。
---

# media-search

ペイウォール付き経済メディア（日経電子版・日経ビジネス・東洋経済オンライン）を、ユーザーの個人サブスクリプションの範囲内で横断検索し、案件調査用のローカル記事ベースを構築する。

## アーキテクチャ

[親 = Claude Code / business-dd / topic-study / case-analysis / mission-creation]
  ├─ Step 1: WebSearchツールでGoogle検索（site:オペレータ使用） → 候補URL収集
  ├─ Step 2: URL確定（自動モードは全件確定／対話モードのみユーザー確認）
  ├─ Step 2.5: セッション有効性チェック・必要なら login.js で再ログイン（←親が担当）
  └─ Step 3: media-fetch サブエージェントへ確定URLを委譲
              → サブエージェントが fetch.js を隔離コンテキストで順次実行
              → 本文を Markdown 保存し、索引だけ親に返す

※ media-search の役割 = 「URL発見＋セッション/ログイン管理＋URL確定」。
  実際の逐次本文取得は media-fetch サブエージェントが担う（ログインはサブエージェントでは不可）。

## 対応媒体

| 媒体 | ドメイン | セッションファイル |
|------|---------|-------------------|
| 日経電子版 | nikkei.com | workspace/sessions/nikkei.json |
| 日経ビジネス | business.nikkei.com | workspace/sessions/nikkei-business.json |
| 東洋経済オンライン | toyokeizai.net | workspace/sessions/toyokeizai.json |

## 前提条件

各媒体について `scripts/login.js` で初回ログイン済みであること。
セッションは数週間〜数ヶ月で切れるので、`fetch.js` がセッション失効を検知したら再ログインする。

    node .claude/skills/media-search/scripts/login.js <媒体名>

## ワークフロー：キーワード横断調査

ユーザーから「キーワード <X> について調査」「<X> の記事を集めて」など、横断記事収集を意図する指示があったら以下を実行する。

### Step 1: Google検索でURL収集（Claude CodeのWebSearchツール）

3媒体を並列で検索する。各クエリで上位10〜15件取得：

- WebSearch: <キーワード> site:nikkei.com
- WebSearch: <キーワード> site:business.nikkei.com  
- WebSearch: <キーワード> site:toyokeizai.net

タイトル・スニペットから明らかに無関係（同名異義語、企業名衝突など）と判断できるものは除外する。

### Step 2: URL確定（呼び出しモードで分岐）

**自動モード（business-dd / topic-study など全自動スキルから委譲された／指示に「確認不要」「全自動」がある場合）**:
ユーザー確認を**スキップ**し、Step 1 で明らかに無関係なものを除いた候補を**全件確定**して Step 2.5 へ進む。
（途中でユーザーに確認を求めると全自動パイプラインが途切れるため。利用者の no-prompt 方針とも整合）

**対話モード（ユーザーが直接 media-search を使っている場合のみ）**:
収集結果を媒体別に整理してユーザーに提示する：

▼ 日経電子版（X件）
  1. <タイトル>（<日付>） - <URL>
  2. ...
▼ 日経ビジネス（Y件）
  ...
▼ 東洋経済オンライン（Z件）
  ...

合計 N 件です。以下から選んでください：
A. 全件取得
B. 一部選択（番号指定）
C. 追加検索（別キーワード）

（対話モードのみ）ユーザーの指示を待つ。**自動モードではこの確認は行わず全件確定する。**

### Step 2.5: セッション有効性チェック（親＝media-searchが担当）

確定URLの媒体について、対応するセッションファイル（`workspace/sessions/<媒体>.json`）の存在を確認する。
不安・失効が疑われる場合、または後続の media-fetch から「⚠ 要・親対応（セッション失効）」が返った場合は、
**親がここで再ログインする**（サブエージェントはブラウザ対話できないため）：

    node .claude/skills/media-search/scripts/login.js <媒体名>

ログインは個人サブスクリプションの範囲内。完了後に Step 3 へ進む（または失効分を再委譲）。

### Step 3: 本文取得を `media-fetch` サブエージェントへ委譲

確定URLリストを `media-fetch` に渡す。逐次取得の大量ログは隔離され、親は索引だけ受け取る：

```
Agent(subagent_type="media-fetch", prompt=
  "keyword=<キーワード>。以下の確定URLを順次取得し workspace/research/ に保存して索引を返す:
   <URL1>
   <URL2>
   …")
```

`media-fetch` 側の取得ルール（並列禁止・1本ずつ・3秒待機・失敗スキップ継続・連続5失敗で中断・
セッション失効検知）はサブエージェント定義に内蔵済み。**ここで親が fetch.js を直接ループしない。**

フォールバック: サブエージェントが未登録で `Agent` 委譲が使えない環境のときのみ、親が直接
`node .claude/skills/media-search/scripts/fetch.js --url "<URL>" --keyword "<キーワード>"` を
1本ずつ（各取得後 `sleep 3`、連続5失敗で中断）実行する。

### Step 4: 結果サマリー

`media-fetch` の返却（成功/失敗/スキップ件数・媒体別保存パス索引・失敗URL一覧・
セッション失効警告）をそのまま親の結果として扱う。「⚠ 要・親対応（セッション失効）」があれば
Step 2.5 で再ログイン → 失効分URLを `media-fetch` に再委譲する。

## 出力ファイル形式

`workspace/research/<keyword>/<YYYY-MM-DD>/<media>/<title>.md`：

    ---
    media: nikkei
    url: https://www.nikkei.com/article/...
    title: "..."
    author: "..."
    published_at: 2025-10-15
    fetched_at: 2026-04-26T...
    keyword: タムロン
    ---

    # タイトル

    本文...

## 他スキルからの呼び出し

`business-dd`, `case-analysis`, `topic-study`, `mission-creation` から呼ばれる場合、
キーワードは案件名・対象会社名・テーマで指定する。取得後のMarkdownを呼び出し元スキルが
読み込んで分析・要約に使う。

責務分担（重要）:
- **media-search（このスキル）** = URL発見（WebSearch）＋ URL確定 ＋ セッション/ログイン管理。
  自動モードでは Step 2 のユーザー確認を行わない。
- **media-fetch サブエージェント** = 確定URLの逐次本文取得＋保存＋索引返却。ログインは行わず、
  セッション失効時は親（media-search）に再ログインを要求して返す。

## 規約遵守

- 取得記事は個人の調査利用範囲のみ
- 再配布・社内共有・SNS投稿は禁止
- セッションファイル（Cookie）はGit管理外（.gitignore済み）

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| セッション失効 | media-fetch が「⚠ 要・親対応」で報告 → 親が `node .claude/skills/media-search/scripts/login.js <媒体>` 再ログイン → 失効分URLを media-fetch に再委譲 |
| TimeoutError | fetch.jsのtimeoutを90000に延長 |
| 本文取得失敗 | サイト構造変化の可能性。fetch.jsのextractArticleのセレクタ更新 |
| WebSearch結果が少ない | 検索キーワードを変えて追加検索 |
