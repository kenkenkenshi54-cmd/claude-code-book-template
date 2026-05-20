# -*- coding: utf-8 -*-
"""住友商事 (8053) の有報をEDINET API v2で5期分取得する"""
import os
import time
import json
import requests
from pathlib import Path

EDINET_API_KEY = "ee817fd5fd6a4754b5c9550f5d8672b9"
BASE_URL = "https://api.edinet-fsa.go.jp/api/v2"
SEC_CODE = "80530"  # 8053 + trailing 0
OUT_DIR = Path(r"c:\Users\Kamei.Kenshi\Documents\dev\claude-code-book-template\workspace\business-dd\work_sumitomo_autofinance\edinet")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def list_documents(date_str):
    url = f"{BASE_URL}/documents.json"
    params = {"date": date_str, "type": 2, "Subscription-Key": EDINET_API_KEY}
    res = requests.get(url, params=params, timeout=30)
    res.raise_for_status()
    return res.json().get("results", [])


def find_yuho(year):
    """対象提出年の有報docIDを探す。住友商事は3月決算 → 提出は6月後半"""
    for month, day_start, day_end in [(6, 15, 30), (7, 1, 10)]:
        for day in range(day_start, day_end + 1):
            date_str = f"{year}-{month:02d}-{day:02d}"
            try:
                docs = list_documents(date_str)
                for d in docs:
                    if d.get("secCode") == SEC_CODE and d.get("docTypeCode") == "120":
                        return date_str, d
            except Exception as e:
                print(f"  err {date_str}: {e}")
            time.sleep(0.3)
    return None, None


def fetch_doc(doc_id, doc_type, save_path):
    url = f"{BASE_URL}/documents/{doc_id}"
    params = {"type": doc_type, "Subscription-Key": EDINET_API_KEY}
    res = requests.get(url, params=params, stream=True, timeout=120)
    res.raise_for_status()
    with open(save_path, "wb") as f:
        for chunk in res.iter_content(chunk_size=8192):
            f.write(chunk)
    return save_path


def main():
    # 提出年: 2021(FY2020) ~ 2025(FY2024)
    targets = [2021, 2022, 2023, 2024, 2025]
    summary = []
    for fy_filing_year in targets:
        print(f"=== Searching yuho filed in {fy_filing_year} ===")
        date_str, doc = find_yuho(fy_filing_year)
        if doc is None:
            print(f"  NOT FOUND in {fy_filing_year}")
            summary.append({"filing_year": fy_filing_year, "found": False})
            continue
        doc_id = doc["docID"]
        print(f"  Found: docID={doc_id}, date={date_str}, name={doc.get('docDescription')}")
        # CSV (type=5) for numeric extraction (XBRL CSV)
        csv_path = OUT_DIR / f"yuho_filed{fy_filing_year}.zip"
        try:
            fetch_doc(doc_id, 5, csv_path)
            print(f"  Saved CSV ZIP: {csv_path}")
        except Exception as e:
            print(f"  CSV fetch err: {e}")
        # PDF (type=2)
        pdf_path = OUT_DIR / f"yuho_filed{fy_filing_year}.pdf"
        try:
            fetch_doc(doc_id, 2, pdf_path)
            print(f"  Saved PDF: {pdf_path}")
        except Exception as e:
            print(f"  PDF fetch err: {e}")
        summary.append({
            "filing_year": fy_filing_year, "found": True, "docID": doc_id,
            "date": date_str, "desc": doc.get("docDescription"),
        })
        time.sleep(1)

    with open(OUT_DIR / "summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("\n=== Summary ===")
    for s in summary:
        print(s)


if __name__ == "__main__":
    main()
