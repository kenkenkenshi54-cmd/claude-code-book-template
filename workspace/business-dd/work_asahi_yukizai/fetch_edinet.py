# -*- coding: utf-8 -*-
"""旭有機材 (4216) の有報をEDINET API v2で5期分取得する"""
import os
import time
import json
import requests
from pathlib import Path

EDINET_API_KEY = "ee817fd5fd6a4754b5c9550f5d8672b9"
BASE_URL = "https://api.edinet-fsa.go.jp/api/v2"
SEC_CODE = "42160"  # 4216 + trailing 0
OUT_DIR = Path(r"c:\Users\Kamei.Kenshi\Documents\dev\claude-code-book-template\workspace\business-dd\work_asahi_yukizai\edinet")
OUT_DIR.mkdir(parents=True, exist_ok=True)


def list_documents(date_str):
    url = f"{BASE_URL}/documents.json"
    params = {"date": date_str, "type": 2, "Subscription-Key": EDINET_API_KEY}
    res = requests.get(url, params=params, timeout=30)
    res.raise_for_status()
    return res.json().get("results", [])


def find_yuho(year):
    """対象年(FY末がmar/year)の有報docIDを探す。提出は通常6月中下旬"""
    candidates = []
    # 旭有機材は3月決算 → 有報提出は通常6月後半
    for month, day_start, day_end in [(6, 1, 30), (7, 1, 15)]:
        for day in range(day_start, day_end + 1):
            date_str = f"{year}-{month:02d}-{day:02d}"
            try:
                docs = list_documents(date_str)
                for d in docs:
                    if d.get("secCode") == SEC_CODE and d.get("docTypeCode") == "120":
                        candidates.append((date_str, d))
                        return date_str, d
            except Exception as e:
                print(f"  err {date_str}: {e}")
            time.sleep(0.4)
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
    # FY2021(2022提出) ~ FY2025(2025提出) の5期分
    targets = [2021, 2022, 2023, 2024, 2025]
    summary = []
    for fy_end_year in targets:
        # FY end Mar/yfy_end_year → yuho filed in fy_end_year (June)
        print(f"=== Searching yuho filed in {fy_end_year} (FY end Mar/{fy_end_year}) ===")
        date_str, doc = find_yuho(fy_end_year)
        if doc is None:
            print(f"  NOT FOUND for FY{fy_end_year}")
            summary.append({"fy": fy_end_year, "found": False})
            continue
        doc_id = doc["docID"]
        print(f"  Found: docID={doc_id}, date={date_str}, name={doc.get('docDescription')}")
        # CSV (type=5) for numeric extraction
        csv_path = OUT_DIR / f"yuho_FY{fy_end_year}.zip"
        try:
            fetch_doc(doc_id, 5, csv_path)
            print(f"  Saved CSV: {csv_path}")
        except Exception as e:
            print(f"  CSV fetch err: {e}")
        # PDF (type=2)
        pdf_path = OUT_DIR / f"yuho_FY{fy_end_year}.pdf"
        try:
            fetch_doc(doc_id, 2, pdf_path)
            print(f"  Saved PDF: {pdf_path}")
        except Exception as e:
            print(f"  PDF fetch err: {e}")
        summary.append({
            "fy": fy_end_year, "found": True, "docID": doc_id,
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
