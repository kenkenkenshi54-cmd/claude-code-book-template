---
name: mission-creation
description: モアクトのミッションを企画・作成するSkill。背景情報や狙いを入力すると、ミッション草案・関連リサーチをまとめて出力する。
---

# ミッション作成

<!-- TODO: あとで詰める -->

## 🔒 対話ポリシー（最優先・他の全手順に優先する）

**AskUserQuestion 呼び出し予算 = このSkill起動から自動送付完了までの全期間で最大1回**。
中間確認・段階レビュー依頼・送信前確認・プランモード承認待ちは**全面禁止**。
ユーザーが打つプロンプトは **最大2回** に収める（プロンプト1=タスク定義、プロンプト2=任意の一括確認）。

### ブレーキ装置（必須・自己監視）

- 2回目の `AskUserQuestion` を呼ぼうとした瞬間、または「念のため確認したい」と感じた瞬間に、
  **呼ばず**に欠落入力を成果物内「Open Questions」へ移管して通常フローを継続する。
- *選択肢を提示してユーザーに決めさせる類の発話は全て違反*。

### プロンプトの内訳

- **プロンプト1 = タスク定義**（必須・唯一の起点）。背景／狙いが1つあれば起動し走り切る。
- **プロンプト2 = 任意・1回だけ**：決定的に欠けていて安全な既定値も置けない入力が *複数* ある場合に限り、
  開始前に **1度だけ** `AskUserQuestion` で**全不足項目を1リクエストにまとめて**問う。これを超える追加質問は禁止。

### 既定値（問わず採用・冒頭に明記）

- ターゲット・形式・粒度が未指定でも質問しない。既定（**モアクト標準のミッション体裁／
  背景・狙い・到達点・主要論点・想定リサーチ**）を採用し、前提を冒頭に明記して進める。
- 詰めきれない論点は、プロンプトで跳ね返さず成果物内「Open Questions」に記録し先に完成させる。
- メモリ準拠：逐一の確認・許可を求めない／成果物は完成次第 自動送付。

## 入力
- `workspace/mission-creation/input/` 配下の資料・要件メモ（無ければ指示文だけで進める）

## 出力
- `workspace/mission-creation/output/` にミッション草案を保存

## 手順
1. `input/` を読む。資料が無ければ指示文の背景・狙いのみで進める（提出を待たない）
2. 必要に応じ Web（`media-search`）で関連リサーチを補強。既定で置ける範囲は確認しない
3. 「背景／狙い／到達点／主要論点／想定リサーチ」でミッション草案を構造化
4. 草案を `output/` に保存 → 下記 auto-send で即送付

## 成果物の自動送付 (auto-send)

ミッション草案完成後、即 `send_mail.py` で送付（「送付不要」と明示された場合のみスキップ）。

- **To**: `kamei.kenshi@adlittle.com`
- **Subject**: `[mission-creation] <ミッション名> 草案 (YYYY-MM-DD)`
- **Body**: ミッション名・背景・狙い・主要論点を `output/_mail_body.md` に書き出して使用
- **添付**: `workspace/mission-creation/output/` 配下の最終草案のみ

```bash
"/c/Users/Kamei.Kenshi/AppData/Roaming/uv/python/cpython-3.14.4-windows-x86_64-none/python.exe" \
  "C:/Users/Kamei.Kenshi/.claude/scripts/send_mail.py" \
  --to kamei.kenshi@adlittle.com \
  --subject "[mission-creation] <ミッション名> 草案 (YYYY-MM-DD)" \
  --body-file output/_mail_body.md \
  --attach "output/<最終草案>"
```

送信失敗時は output/ にファイルは保存済みなので、エラー1行報告で終了。
