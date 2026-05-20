"""Extract key financial data from EDINET CSVs across 5 FYs."""
import csv
import os
import json
import re

BASE = "/workspaces/claude-code-book-template/workspace/research/レオン自動機/edinet"

FY_DIRS = {
    "FY2021": "FY2021_S100LUBS_csv",
    "FY2022": "FY2022_S100OF9E_csv",
    "FY2023": "FY2023_S100R65G_csv",
    "FY2024": "FY2024_S100TVT1_csv",
    "FY2025": "FY2025_S100W3X7_csv",
}

# Keywords for relevant rows
KEYWORDS = [
    "セグメント",
    "売上高",
    "営業利益",
    "経常利益",
    "純利益",
    "減価償却",
    "設備投資",
    "従業員",
    "主要な販売先",
    "大株主",
    "所有株式",
    "顧客",
    "海外",
    "地域",
    "原材料",
    "有形固定資産",
    "報告セグメント",
    "事業セグメント",
    "報告セグメントの利益",
    "売上原価",
    "販売費",
    "外部顧客",
    "従業員数",
    "研究開発",
    "資本金",
]

def load_csv(fy: str):
    d = os.path.join(BASE, FY_DIRS[fy], "XBRL_TO_CSV")
    files = [f for f in os.listdir(d) if f.startswith("jpcrp030000-asr")]
    if not files:
        return None
    path = os.path.join(d, files[0])
    with open(path, encoding="utf-16") as f:
        reader = csv.reader(f, delimiter='\t')
        return list(reader)

def filter_rows(rows, keywords):
    """Find rows whose 項目名 (col 1) or 要素ID (col 0) contain any keyword."""
    out = []
    for r in rows:
        if len(r) < 9:
            continue
        elem_id = r[0]
        item_name = r[1]
        if any(kw in item_name or kw in elem_id for kw in keywords):
            out.append(r)
    return out

# Per-FY extraction
for fy in FY_DIRS:
    rows = load_csv(fy)
    if not rows:
        print(f"{fy}: no CSV")
        continue
    print(f"\n=== {fy} ===  ({len(rows)} rows)")
    # Save filtered subset
    filtered = filter_rows(rows, KEYWORDS)
    out_path = os.path.join(BASE, f"{fy}_filtered.tsv")
    with open(out_path, "w", encoding="utf-8") as f:
        # Header
        f.write("\t".join(rows[0]) + "\n")
        for r in filtered:
            f.write("\t".join(r) + "\n")
    print(f"  filtered: {len(filtered)} rows → {out_path}")
