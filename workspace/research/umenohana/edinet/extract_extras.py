# -*- coding: utf-8 -*-
"""有報から (1)主要な販売先 (2)大株主 (3)対処すべき課題 (4)役員 (5)製品別売上 を抽出。"""
import csv
import json
import re
from pathlib import Path

BASE_DIR = Path("/workspaces/claude-code-book-template/workspace/research/umenohana/edinet")

CSV_FILES = {
    "FY2025": BASE_DIR / "FY2025_S100WESD_csv_extracted/XBRL_TO_CSV",
    "FY2024": BASE_DIR / "FY2024_S100U49Q_csv_extracted/XBRL_TO_CSV",
    "FY2023": BASE_DIR / "FY2023_S100RGRX_csv_extracted/XBRL_TO_CSV",
}


def find_main_csv(d):
    for f in d.glob("jpcrp030000-asr-*.csv"):
        return f
    return None


def load_rows(path):
    rows = []
    with open(path, encoding="utf-16") as f:
        r = csv.reader(f, delimiter="\t")
        next(r)
        for row in r:
            if len(row) >= 9:
                rows.append({
                    "element_id": row[0], "name": row[1], "context_id": row[2],
                    "rel_year": row[3], "is_consolidated": row[4],
                    "type": row[5], "unit_id": row[6], "unit": row[7], "value": row[8],
                })
    return rows


def find_text_blocks(rows, keyword_in_name):
    """テキストブロック型項目で項目名にキーワードを含むものを返す。"""
    out = []
    for r in rows:
        if (r["unit_id"] == "" and r["type"] == "" and keyword_in_name in (r["name"] or "")):
            out.append(r)
    return out


def find_by_name_substr(rows, substrs):
    out = []
    for r in rows:
        n = r["name"] or ""
        if any(s in n for s in substrs):
            out.append(r)
    return out


def main():
    for fy, dir_path in CSV_FILES.items():
        print(f"\n{'='*60}\n{fy}\n{'='*60}")
        rows = load_rows(find_main_csv(dir_path))
        # 1. 主要な販売先
        sales_target_rows = find_by_name_substr(rows, ["主要な販売先", "顧客の名称又は氏名"])
        print(f"\n--- 主要な販売先 ({len(sales_target_rows)}) ---")
        for r in sales_target_rows[:8]:
            v = (r["value"] or "")[:120]
            print(f"  {r['name'][:50]} | {v}")

        # 2. 大株主
        share_rows = find_by_name_substr(rows, ["大株主", "株主名", "発行済株式（自己株式を除く。）の総数に対する所有株式数の割合"])
        print(f"\n--- 大株主関連 ({len(share_rows)}) ---")
        seen_n = set()
        for r in share_rows:
            n = r["name"]
            if n in seen_n: continue
            seen_n.add(n)
            print(f"  {n}")

        # 3. 対処すべき課題（テキストブロック）
        tb_rows = find_text_blocks(rows, "対処すべき課題")
        print(f"\n--- 対処すべき課題テキストブロック ({len(tb_rows)}) ---")
        for r in tb_rows:
            v = (r["value"] or "")
            print(f"  --- 全文（最初2000字） ---")
            # HTMLタグを簡易除去
            text = re.sub(r'<[^>]+>', ' ', v)
            text = re.sub(r'\s+', ' ', text)
            print(f"  {text[:2000]}")

        # 4. 経営方針 / 経営戦略
        ms_rows = find_text_blocks(rows, "経営方針") + find_text_blocks(rows, "経営戦略") + find_text_blocks(rows, "経営環境") + find_text_blocks(rows, "中長期的")
        print(f"\n--- 経営方針/戦略/環境/中長期 テキストブロック ({len(ms_rows)}) ---")
        for r in ms_rows[:3]:
            v = (r["value"] or "")
            text = re.sub(r'<[^>]+>', ' ', v)
            text = re.sub(r'\s+', ' ', text)
            print(f"  [{r['name']}]")
            print(f"  {text[:1800]}\n")

        # 5. 販売実績（製品別）
        sales_rows = find_text_blocks(rows, "販売実績")
        print(f"\n--- 販売実績テキスト ({len(sales_rows)}) ---")
        for r in sales_rows[:2]:
            v = re.sub(r'<[^>]+>', ' ', r["value"] or "")
            v = re.sub(r'\s+', ' ', v)
            print(f"  {v[:1500]}")

        # 6. 事業の状況（FY2025のみで詳細出す）
        if fy == "FY2025":
            biz_rows = find_text_blocks(rows, "事業の内容") + find_text_blocks(rows, "経営成績")
            for r in biz_rows[:4]:
                v = re.sub(r'<[^>]+>', ' ', r["value"] or "")
                v = re.sub(r'\s+', ' ', v)
                print(f"\n--- [{r['name']}] ---")
                print(f"  {v[:2500]}")


if __name__ == "__main__":
    main()
