# -*- coding: utf-8 -*-
"""コプロ・ホールディングス (7059) の有報をEDINET API v2で5期分取得する。

経緯:
 - 2023年8月、決算月を3月→9月に変更すると発表。
 - 通常の3月決算期は6月後半提出、9月決算期は12月後半提出。
 - 経過期間（2024年4-9月の6ヶ月変則決算）の有報も取得対象とする。

提出時期を広めに走査:
 - 5月-7月（旧3月決算の有報）
 - 11月-翌年1月（新9月決算の有報）
"""
import os
import time
import json
import requests
from pathlib import Path

EDINET_API_KEY = "ee817fd5fd6a4754b5c9550f5d8672b9"
BASE_URL = "https://api.edinet-fsa.go.jp/api/v2"
SEC_CODE = "70590"  # 7059 + trailing 0
OUT_DIR = Path(r"c:\Users\Kamei.Kenshi\Documents\dev\claude-code-book-template\workspace\business-dd\work_copro\edinet")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def list_documents(date_str):
    url = f"{BASE_URL}/documents.json"
    params = {"date": date_str, "type": 2, "Subscription-Key": EDINET_API_KEY}
    res = requests.get(url, params=params, timeout=30)
    res.raise_for_status()
    return res.json().get("results", [])


def scan_range(year, month_ranges):
    """指定の年・月範囲を走査して7059の有報(120)を探す"""
    for (m, d_start, d_end) in month_ranges:
        for day in range(d_start, d_end + 1):
            date_str = f"{year}-{m:02d}-{day:02d}"
            try:
                docs = list_documents(date_str)
                for doc in docs:
                    if doc.get("secCode") == SEC_CODE and doc.get("docTypeCode") == "120":
                        return date_str, doc
            except Exception as e:
                print(f"  err {date_str}: {e}")
            time.sleep(0.25)
    return None, None


def fetch_doc(doc_id, doc_type, save_path):
    url = f"{BASE_URL}/documents/{doc_id}"
    params = {"type": doc_type, "Subscription-Key": EDINET_API_KEY}
    res = requests.get(url, params=params, stream=True, timeout=60)
    res.raise_for_status()
    with open(save_path, "wb") as f:
        for chunk in res.iter_content(chunk_size=8192):
            f.write(chunk)
    return save_path


def main():
    # 旧3月決算: FY2020(2020/6提出), FY2021(2021/6), FY2022(2022/6), FY2023(2023/6)
    # 経過期間6ヶ月: FY2024H1(2024/12提出 6ヶ月決算)
    # 新9月決算: FY2025(2025/12提出)
    targets = [
        ("FY2020_Mar", 2020, [(5, 15, 31), (6, 1, 30), (7, 1, 15)]),
        ("FY2021_Mar", 2021, [(5, 15, 31), (6, 1, 30), (7, 1, 15)]),
        ("FY2022_Mar", 2022, [(5, 15, 31), (6, 1, 30), (7, 1, 15)]),
        ("FY2023_Mar", 2023, [(5, 15, 31), (6, 1, 30), (7, 1, 15)]),
        ("FY2024_Sep_transition", 2024, [(11, 15, 30), (12, 1, 31), (2025, 1, 1, 15)]),
        ("FY2025_Sep", 2025, [(11, 15, 30), (12, 1, 31)]),
    ]
    summary = []
    for label, y, ranges in targets:
        print(f"=== {label} (year={y}) ===")
        # ranges may have an entry with year embedded; handle both shapes
        normalized = []
        for r in ranges:
            if len(r) == 3:
                normalized.append((y, r[0], r[1], r[2]))
            elif len(r) == 4:
                normalized.append(r)
        date_str, doc = None, None
        for (yy, m, ds, de) in normalized:
            for day in range(ds, de + 1):
                ds_str = f"{yy}-{m:02d}-{day:02d}"
                try:
                    docs = list_documents(ds_str)
                    for dd in docs:
                        if dd.get("secCode") == SEC_CODE and dd.get("docTypeCode") == "120":
                            date_str, doc = ds_str, dd
                            break
                except Exception as e:
                    print(f"  err {ds_str}: {e}")
                if doc is not None:
                    break
                time.sleep(0.2)
            if doc is not None:
                break
        if doc is None:
            print(f"  NOT FOUND for {label}")
            summary.append({"label": label, "found": False})
            continue
        doc_id = doc["docID"]
        print(f"  Found: docID={doc_id}, date={date_str}, desc={doc.get('docDescription')}")
        for typ, ext in [(5, "zip"), (2, "pdf")]:
            path = OUT_DIR / f"yuho_{label}.{ext}"
            try:
                fetch_doc(doc_id, typ, path)
                print(f"  Saved type={typ}: {path}")
            except Exception as e:
                print(f"  fetch err type={typ}: {e}")
        summary.append({
            "label": label, "found": True, "docID": doc_id,
            "date": date_str, "desc": doc.get("docDescription"),
        })
        time.sleep(0.8)

    with open(OUT_DIR / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("\n=== Summary ===")
    for s in summary:
        print(s)


if __name__ == "__main__":
    main()
