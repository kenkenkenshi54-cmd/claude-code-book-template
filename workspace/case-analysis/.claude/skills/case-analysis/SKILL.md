---
name: case-analysis
description: 「このような事例」というテーマに基づき、Webソースを含めて関連する事例を収集・分析するSkill。事例集やケーススタディの形式でレポートを生成する。
---

# 事例分析

<!-- TODO: あとで詰める -->

## 対話ポリシー（プロンプト最小化・最大2回）

「最初のタスク定義」を受けたら、原則として追加の質問・確認・許可を一切取らず、
事例集レポートの自動送付まで一気通貫で完了する。ユーザーが打つプロンプトは **最大2回** に収める。

- **プロンプト1 = タスク定義**（必須・唯一の起点）。テーマが1つあれば起動し走り切る。
- **プロンプト2 = 任意・1回だけ**：決定的に欠けていて安全な既定値も置けない入力が
  *存在する場合に限り*、開始前に `AskUserQuestion` で**全不足項目を1回にまとめて**問う。
- テーマの範囲・件数・粒度が未指定でも質問しない。既定（**国内中心／代表事例5〜8件／
  「背景→打ち手→結果→示唆」構成**）を採用し、採用した前提を冒頭に明記して進める。
- 中間確認・送信前確認・プランモード承認待ちは**一切しない**。
- 深掘りしたい論点は、プロンプトで跳ね返さず成果物内「Open Questions」に記録し先に完成させる。

## 入力
- `workspace/case-analysis/input/` 配下の資料・テーマメモ（無ければテーマ文だけで進める）

## 出力
- `workspace/case-analysis/output/` にレポートを保存

## 手順
1. `input/` を読む。資料が無ければテーマ文のみで進める（提出を待たない）
2. Web（必要に応じ `media-search`）で関連事例を収集。明らかに既定で置ける範囲は確認しない
3. 各事例を「背景→打ち手→結果→示唆」で構造化し、横断パターンを2-3点抽出
4. レポートを `output/` に保存 → 下記 auto-send で即送付

## 成果物の自動送付 (auto-send)

事例集レポートが完成したら即 `send_mail.py` で送付（「送付不要」と明示された場合のみスキップ）。

- **To**: `kamei.kenshi@adlittle.com`
- **Subject**: `[case-analysis] <テーマ> 事例集 (YYYY-MM-DD)`
- **Body**: テーマ名・収集事例数・主要観察パターン2-3点を `output/_mail_body.md` に書き出して使用
- **添付**: `workspace/case-analysis/output/` 配下の最終成果物のみ（中間メモ・raw素材は添付しない）

```bash
"/c/Users/Kamei.Kenshi/AppData/Roaming/uv/python/cpython-3.14.4-windows-x86_64-none/python.exe" \
  "C:/Users/Kamei.Kenshi/.claude/scripts/send_mail.py" \
  --to kamei.kenshi@adlittle.com \
  --subject "[case-analysis] <テーマ> 事例集 (YYYY-MM-DD)" \
  --body-file output/_mail_body.md \
  --attach "output/<最終成果物>"
```

送信失敗時は output/ にファイルは保存済みなので、エラー1行報告で終了。
