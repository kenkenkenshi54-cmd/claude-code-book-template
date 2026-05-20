# -*- coding: utf-8 -*-
"""5期分のセグメント別売上・営業利益・設備投資・減価償却費を抽出。"""
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

# セグメント名 → context substring
SEG_KEYS = {
    "外食事業": "RestaurantBusinessReportableSegments",
    "テイクアウト事業": "TakeOutBusinessReportableSegments",
    "外販事業": "ExternalSalesBusinessReportableSegments",
}

# 抽出したい項目とそれぞれの要素ID（一部は項目名で判定）
# Note: EDINETの標準要素IDは:
#   売上高（外部顧客）: jppfs_cor:NetSalesIFRS とは異なり、jpcrp_cor:OperatingRevenue1IFRS等 だが、
#   セグメント情報内では jppfs_cor:NetSales / jpcrp_cor:OperatingProfitLoss 等を使う。
# 確実なのは name で判定する方法。

def find_main_csv(d: Path):
    for f in d.glob("jpcrp030000-asr-*.csv"):
        return f
    return None


def to_oku(value_str):
    if value_str in ("", "－", "-", None): return None
    try:
        return round(float(value_str) / 1e8, 2)
    except (ValueError, TypeError):
        return None


def load_rows(path: Path):
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


def extract_segment_metrics(rows, fy):
    """セグメント別 × 期 × 指標 をマトリクスで返す。"""
    # 関心のある context_id プレフィックス：CurrentYearDuration / Prior1YearDuration
    # （連結セグメント情報は当期+前期のみ提供）
    out = {}
    for seg_name, seg_token in SEG_KEYS.items():
        out[seg_name] = {"current": {}, "prior1": {}}
        for r in rows:
            ctx = r["context_id"]
            if seg_token not in ctx: continue
            if "NonConsolidatedMember" in ctx: continue  # 単体は除外
            # 指標判定
            is_current = ctx.startswith("CurrentYear")
            is_prior1 = ctx.startswith("Prior1Year")
            if not (is_current or is_prior1): continue
            slot = "current" if is_current else "prior1"
            n = r["name"]
            v = r["value"]
            if n == "外部顧客への売上高":
                out[seg_name][slot]["外部顧客売上"] = v
            elif n == "売上高":  # セグメント計上額
                out[seg_name][slot]["売上高_セグメント計"] = v
            elif n == "営業利益又は営業損失（△）":
                out[seg_name][slot]["営業利益"] = v
            elif n == "減価償却費、セグメント情報":
                out[seg_name][slot]["減価償却費"] = v
            elif n == "有形固定資産及び無形固定資産の増加額":
                out[seg_name][slot]["設備投資"] = v
            elif n == "資産":
                out[seg_name][slot]["セグメント資産"] = v
            elif n == "セグメント間の内部売上高又は振替高":
                out[seg_name][slot]["内部売上"] = v
    return out


def extract_consolidated(rows):
    """連結ベースの売上・営業利益・営業外・経常利益・減価償却費を抽出。"""
    keys = {
        "連結売上高": "jppfs_cor:NetSales",
        "連結営業利益": "jppfs_cor:OperatingIncome",
        "連結経常利益": "jppfs_cor:OrdinaryIncome",
        "連結営業外収益": "jppfs_cor:NonOperatingIncome",
        "連結営業外費用": "jppfs_cor:NonOperatingExpenses",
        "親会社株主に帰属する当期純利益": "jppfs_cor:ProfitLossAttributableToOwnersOfParent",
        "減価償却費（CF）": "jppfs_cor:DepreciationAndAmortizationOpeCF",
    }
    out = {"current": {}, "prior1": {}}
    for label, eid in keys.items():
        for r in rows:
            if r["element_id"] != eid: continue
            ctx = r["context_id"]
            if ctx.startswith("CurrentYearDuration") and "Member" not in ctx:
                out["current"][label] = r["value"]
            elif ctx.startswith("Prior1YearDuration") and "Member" not in ctx:
                out["prior1"][label] = r["value"]
    return out


def main():
    all_data = {}
    for fy, dir_path in CSV_FILES.items():
        csv_path = find_main_csv(dir_path)
        rows = load_rows(csv_path)
        seg = extract_segment_metrics(rows, fy)
        cons = extract_consolidated(rows)
        all_data[fy] = {"segments": seg, "consolidated": cons}
        # 出力（億円ベース）
        print(f"\n=== {fy} ===")
        print(f"  [連結] 売上={to_oku(cons['current'].get('連結売上高'))}億 / 営利={to_oku(cons['current'].get('連結営業利益'))}億 / 経常={to_oku(cons['current'].get('連結経常利益'))}億 / 当期純={to_oku(cons['current'].get('親会社株主に帰属する当期純利益'))}億")
        print(f"  [減価償却(CF)] {to_oku(cons['current'].get('減価償却費（CF）'))}億")
        for seg_name, slots in seg.items():
            cur = slots["current"]
            print(f"  [{seg_name}] 外部顧客売上={to_oku(cur.get('外部顧客売上'))}億 / セグメント計={to_oku(cur.get('売上高_セグメント計'))}億 / 営利={to_oku(cur.get('営業利益'))}億 / 減価償却={to_oku(cur.get('減価償却費'))}億 / 設備投資={to_oku(cur.get('設備投資'))}億")
    out = BASE_DIR / "segments_5y.json"
    out.write_text(json.dumps(all_data, ensure_ascii=False, indent=2))
    print(f"\nSaved: {out}")


if __name__ == "__main__":
    main()
