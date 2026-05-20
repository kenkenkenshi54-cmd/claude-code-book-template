# -*- coding: utf-8 -*-
"""要素IDベースで対処すべき課題、経営方針、大株主、主要販売先を抽出。"""
import csv
import json
import re
from pathlib import Path

BASE_DIR = Path("/workspaces/claude-code-book-template/workspace/research/umenohana/edinet")

CSV_FILES = {
    "FY2025": BASE_DIR / "FY2025_S100WESD_csv_extracted/XBRL_TO_CSV",
    "FY2024": BASE_DIR / "FY2024_S100U49Q_csv_extracted/XBRL_TO_CSV",
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


def find_by_element_substr(rows, substr):
    out = []
    for r in rows:
        if substr.lower() in r["element_id"].lower():
            out.append(r)
    return out


def clean_html(s):
    if not s: return ""
    s = re.sub(r'<[^>]+>', ' ', s)
    s = re.sub(r'&nbsp;', ' ', s)
    s = re.sub(r'&amp;', '&', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()


def main():
    for fy, dir_path in CSV_FILES.items():
        print(f"\n{'='*70}\n{fy}\n{'='*70}")
        rows = load_rows(find_main_csv(dir_path))

        # ユニーク要素ID一覧で「TextBlock」を含む長文項目をリスト化
        text_block_ids = set()
        for r in rows:
            if r["type"] == "" and r["unit_id"] == "" and r["value"] and len(r["value"]) > 200 and "TextBlock" in r["element_id"]:
                text_block_ids.add(r["element_id"])

        # 関心のあるキーワード（要素ID部分一致）
        targets = [
            "BusinessPolicy",
            "BusinessRisks",
            "ManagementAnalysis",
            "Issues",  # 対処すべき課題
            "ResearchAndDevelopment",
            "OverviewOfBusiness",
            "DividendPolicy",
            "CorporateGovernance",
            "MajorShareholders",
            "PrincipalCustomers",
            "SalesByCustomer",
            "ChangesInBusiness",
        ]

        for kw in targets:
            hits = [r for r in rows if kw.lower() in r["element_id"].lower() and r["value"]]
            if not hits: continue
            print(f"\n--- [{kw}] hits={len(hits)} ---")
            seen = set()
            for r in hits[:6]:
                key = (r["element_id"], r["context_id"])
                if key in seen: continue
                seen.add(key)
                v = clean_html(r["value"])[:1800]
                print(f"  ELEMENT={r['element_id']}")
                print(f"  NAME={r['name']}")
                print(f"  VALUE={v}\n")

        # 大株主の個別要素を抽出
        if fy == "FY2025":
            print("\n--- 大株主（個別） ---")
            shareholders = []
            # 同じcontext_idでまとめる
            ctx_groups = {}
            for r in rows:
                eid = r["element_id"]
                if "MajorShareholders" in eid or "Shareholders" in eid:
                    if "Member" in r["context_id"]:
                        ctx = r["context_id"]
                        if ctx not in ctx_groups: ctx_groups[ctx] = {}
                        ctx_groups[ctx][r["name"]] = r["value"]
            # 個別シェアホルダーを表示
            for ctx, fields in ctx_groups.items():
                print(f"  ctx={ctx[:80]}")
                for k, v in fields.items():
                    print(f"    {k}: {v}")
                print()


if __name__ == "__main__":
    main()
