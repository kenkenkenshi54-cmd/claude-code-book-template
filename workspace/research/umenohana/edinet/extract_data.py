# -*- coding: utf-8 -*-
"""5期分の有報CSVから財務データ・セグメント情報を抽出。"""
import csv
import json
from pathlib import Path

BASE_DIR = Path("/workspaces/claude-code-book-template/workspace/research/umenohana/edinet")

CSV_FILES = {
    "FY2021": BASE_DIR / "FY2021_S100M23K_csv_extracted/XBRL_TO_CSV",
    "FY2022": BASE_DIR / "FY2022_S100OSQY_csv_extracted/XBRL_TO_CSV",
    "FY2023": BASE_DIR / "FY2023_S100RGRX_csv_extracted/XBRL_TO_CSV",
    "FY2024": BASE_DIR / "FY2024_S100U49Q_csv_extracted/XBRL_TO_CSV",
    "FY2025": BASE_DIR / "FY2025_S100WESD_csv_extracted/XBRL_TO_CSV",
}


def find_main_csv(d: Path):
    """jpcrp030000-asr で始まるCSV（有報本体）を返す。"""
    for f in d.glob("jpcrp030000-asr-*.csv"):
        return f
    return None


def load_rows(path: Path):
    rows = []
    with open(path, encoding="utf-16") as f:
        r = csv.reader(f, delimiter="\t")
        header = next(r)
        for row in r:
            if len(row) >= 9:
                rows.append({
                    "element_id": row[0],
                    "name": row[1],
                    "context_id": row[2],
                    "rel_year": row[3],
                    "is_consolidated": row[4],
                    "type": row[5],
                    "unit_id": row[6],
                    "unit": row[7],
                    "value": row[8],
                })
    return rows


def to_oku(value_str: str) -> float | None:
    """円→億円。NaN/Noneを安全に処理。"""
    if value_str in ("", "－", "-", None): return None
    try:
        return round(float(value_str) / 1e8, 2)
    except (ValueError, TypeError):
        return None


def extract_summary(rows, fy: str):
    """主要経営指標の5期推移（経営指標等の表）。"""
    # キー要素ID
    keys = {
        "売上高": "jpcrp_cor:NetSalesSummaryOfBusinessResults",
        "経常利益": "jpcrp_cor:OrdinaryIncomeLossSummaryOfBusinessResults",
        "親会社株主に帰属する当期純利益": "jpcrp_cor:ProfitLossAttributableToOwnersOfParentSummaryOfBusinessResults",
        "包括利益": "jpcrp_cor:ComprehensiveIncomeSummaryOfBusinessResults",
        "純資産": "jpcrp_cor:NetAssetsSummaryOfBusinessResults",
        "総資産": "jpcrp_cor:TotalAssetsSummaryOfBusinessResults",
        "1株あたり純資産": "jpcrp_cor:NetAssetsPerShareSummaryOfBusinessResults",
        "1株あたり当期純利益": "jpcrp_cor:BasicEarningsLossPerShareSummaryOfBusinessResults",
        "自己資本比率": "jpcrp_cor:EquityToAssetRatioSummaryOfBusinessResults",
        "自己資本利益率": "jpcrp_cor:RateOfReturnOnEquitySummaryOfBusinessResults",
        "営業活動キャッシュフロー": "jpcrp_cor:CashFlowsFromUsedInOperatingActivitiesSummaryOfBusinessResults",
        "投資活動キャッシュフロー": "jpcrp_cor:CashFlowsFromUsedInInvestingActivitiesSummaryOfBusinessResults",
        "財務活動キャッシュフロー": "jpcrp_cor:CashFlowsFromUsedInFinancingActivitiesSummaryOfBusinessResults",
        "現金及び現金同等物期末残高": "jpcrp_cor:CashAndCashEquivalentsSummaryOfBusinessResults",
        "従業員数": "jpcrp_cor:NumberOfEmployees",
    }
    out = {}
    for label, eid in keys.items():
        for r in rows:
            if r["element_id"] == eid:
                key = f"{label}_{r['rel_year']}"
                out[key] = r["value"]
    return out


def search_segment(rows):
    """セグメント関連の値を抽出（「外食事業」「テイクアウト事業」「外販事業」のような項目）。"""
    seg_rows = []
    for r in rows:
        # セグメント名がコンテキストに含まれる、もしくは項目名にセグメント関連キーワード
        if "Segment" in r["context_id"] or "セグメント" in r["name"]:
            seg_rows.append(r)
    return seg_rows


def search_keyword(rows, kw_list):
    out = []
    for r in rows:
        if any(kw in (r["name"] or "") for kw in kw_list):
            out.append(r)
    return out


def main():
    summary = {}
    for fy, dir_path in CSV_FILES.items():
        csv_path = find_main_csv(dir_path)
        if csv_path is None:
            print(f"[{fy}] CSV not found in {dir_path}")
            continue
        print(f"[{fy}] reading {csv_path.name}")
        rows = load_rows(csv_path)
        s = extract_summary(rows, fy)
        summary[fy] = {
            "csv_file": csv_path.name,
            "row_count": len(rows),
            "summary_indicators": s,
        }
        # セグメント関連を別ファイルで保存（巨大なので）
        seg_rows = search_segment(rows)
        seg_path = BASE_DIR / f"{fy}_segment_rows.json"
        seg_path.write_text(json.dumps(seg_rows, ensure_ascii=False, indent=1))
        print(f"  segment rows: {len(seg_rows)} → {seg_path.name}")
        # 介護関連キーワード
        kaigo = search_keyword(rows, ["介護", "ケアフード", "嚥下"])
        if kaigo:
            print(f"  '介護/ケアフード/嚥下' hits: {len(kaigo)}")
            for k in kaigo[:5]:
                print(f"    - {k['name']} | {k['value']}")
    out = BASE_DIR / "summary_indicators.json"
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"\nSaved: {out}")


if __name__ == "__main__":
    main()
