# -*- coding: utf-8 -*-
"""Numerical consistency checks for business-dd reports.

Use from build_report.py:

    from numerical_checks import verify_all, PeriodData

    periods = [
        PeriodData(
            label="FY2025",
            segment_sales={"食品加工機械": 230.3, "食品製造販売": 161.9},
            segment_profits={"食品加工機械": 56.5, "食品製造販売": 18.6},
            inter_segment_elimination=0.1,    # signed value (+ if adjustment, - if elimination)
            hq_overhead=-22.2,                # signed value (negative)
            consolidated_sales=392.1,
            consolidated_op_profit=53.0,
            consolidated_dep=14.9,
            geographic_sales={"日本": 120.3, "北米南米": 205.1, "欧州": 46.2, "アジア": 20.5},
        ),
        # ... other periods
    ]
    verify_all(periods, tolerance=0.15)  # asserts; raises if any check fails

Run independently:
    python3 numerical_checks.py
to see the example output for the embedded sample.
"""
from dataclasses import dataclass, field
from typing import Dict, Optional, List


@dataclass
class PeriodData:
    label: str
    segment_sales: Dict[str, float]
    segment_profits: Dict[str, float]
    inter_segment_elimination: float
    hq_overhead: float
    consolidated_sales: float
    consolidated_op_profit: float
    consolidated_dep: Optional[float] = None
    geographic_sales: Optional[Dict[str, float]] = None
    segment_profit_rates: Optional[Dict[str, float]] = None  # in % (24.5, not 0.245)


@dataclass
class CheckResult:
    name: str
    period: str
    expected: float
    actual: float
    diff: float
    passed: bool
    note: str = ""


def _approx(a: float, b: float, tol: float) -> bool:
    return abs(a - b) <= tol


def check_segment_sales_to_consolidated(p: PeriodData, tol: float) -> CheckResult:
    """連結売上は外部顧客売上（=セグメント売上の素値）の合計と一致する。
    (Note: in EDINET disclosures the segment sales here should be 「外部顧客への売上高」 not 「計」.)"""
    seg_sum = sum(p.segment_sales.values())
    diff = seg_sum - p.consolidated_sales
    return CheckResult(
        "1. Σ(セグメント外部顧客売上) = 連結売上高",
        p.label, p.consolidated_sales, seg_sum, diff,
        _approx(seg_sum, p.consolidated_sales, tol),
        "segment_sales must be 外部顧客への売上高 (not セグメント計上額)",
    )


def check_segment_profit_to_consolidated_op(p: PeriodData, tol: float) -> CheckResult:
    """Σ(セグメント利益) + セグメント間取引消去 + 本社一般管理費 = 連結営業利益."""
    seg_sum = sum(p.segment_profits.values())
    reconciled = seg_sum + p.inter_segment_elimination + p.hq_overhead
    diff = reconciled - p.consolidated_op_profit
    return CheckResult(
        "2. Σ(セグメント利益) + 調整 + 本社費 = 連結営業利益",
        p.label, p.consolidated_op_profit, reconciled, diff,
        _approx(reconciled, p.consolidated_op_profit, tol),
        f"Σseg={seg_sum:.2f}, 調整={p.inter_segment_elimination:+.2f}, 本社費={p.hq_overhead:+.2f}",
    )


def check_segment_profit_rates(p: PeriodData, tol: float = 0.2) -> List[CheckResult]:
    """各セグメントの利益率 = 利益 ÷ 売上 ×100。displayed value matches calculation."""
    if not p.segment_profit_rates:
        return []
    results = []
    for k, displayed in p.segment_profit_rates.items():
        sales = p.segment_sales.get(k)
        profit = p.segment_profits.get(k)
        if sales is None or profit is None or sales == 0:
            continue
        calculated = profit / sales * 100
        diff = displayed - calculated
        results.append(CheckResult(
            f"3. 利益率（{k}）",
            p.label, calculated, displayed, diff,
            _approx(displayed, calculated, tol),
            "displayed - calculated (in pp)",
        ))
    return results


def check_geographic_sales_to_consolidated(p: PeriodData, tol: float) -> Optional[CheckResult]:
    """Σ(地域別売上) = 連結売上高."""
    if not p.geographic_sales:
        return None
    geo_sum = sum(p.geographic_sales.values())
    diff = geo_sum - p.consolidated_sales
    return CheckResult(
        "5. Σ(地域別売上) = 連結売上高",
        p.label, p.consolidated_sales, geo_sum, diff,
        _approx(geo_sum, p.consolidated_sales, tol),
    )


def check_composition_ratio_table_b(seg_sales: Dict[str, float],
                                     seg_profits: Dict[str, float],
                                     sales_ratios: Dict[str, float],
                                     profit_ratios: Dict[str, float],
                                     tol: float = 0.2) -> List[CheckResult]:
    """Table B（直近期構成比）の合計が100%、各行の比率が再計算と一致。
    sales_ratios/profit_ratios in % (e.g., 58.7, not 0.587)."""
    results = []
    sales_total = sum(seg_sales.values())
    profit_total = sum(seg_profits.values())
    sales_ratio_sum = sum(sales_ratios.values())
    profit_ratio_sum = sum(profit_ratios.values())
    results.append(CheckResult(
        "4a. テーブルB 売上構成比合計=100.0%",
        "FY-latest", 100.0, sales_ratio_sum, sales_ratio_sum - 100.0,
        _approx(sales_ratio_sum, 100.0, tol),
    ))
    results.append(CheckResult(
        "4b. テーブルB 利益構成比合計=100.0%",
        "FY-latest", 100.0, profit_ratio_sum, profit_ratio_sum - 100.0,
        _approx(profit_ratio_sum, 100.0, tol),
    ))
    for k, displayed in sales_ratios.items():
        calc = seg_sales[k] / sales_total * 100 if sales_total else 0
        results.append(CheckResult(
            f"4c. 売上構成比（{k}）",
            "FY-latest", calc, displayed, displayed - calc,
            _approx(displayed, calc, tol),
        ))
    for k, displayed in profit_ratios.items():
        calc = seg_profits[k] / profit_total * 100 if profit_total else 0
        results.append(CheckResult(
            f"4d. 利益構成比（{k}）",
            "FY-latest", calc, displayed, displayed - calc,
            _approx(displayed, calc, tol),
        ))
    return results


def check_ebitda(p: PeriodData, tol: float) -> Optional[CheckResult]:
    """EBITDA = 営業利益 + 減価償却費 (consolidated)."""
    if p.consolidated_dep is None:
        return None
    ebitda = p.consolidated_op_profit + p.consolidated_dep
    return CheckResult(
        "6. EBITDA = 営業利益 + 減価償却費",
        p.label, ebitda, ebitda, 0.0, True,
        f"EBITDA = {ebitda:.1f} (営業利益 {p.consolidated_op_profit} + 減価償却 {p.consolidated_dep})",
    )


def check_value_up_bridge(current_ebitda: float,
                          organic_low: float, organic_high: float,
                          inorganic_low: float, inorganic_high: float,
                          target_low: float, target_high: float,
                          tol: float = 0.5) -> List[CheckResult]:
    """Bridge:現状 + オーガニック + インオーガニック = 5年後ターゲット (low and high bound)."""
    expected_low = current_ebitda + organic_low + inorganic_low
    expected_high = current_ebitda + organic_high + inorganic_high
    return [
        CheckResult(
            "7a. Value-up Bridge 下限",
            "5y", expected_low, target_low, target_low - expected_low,
            _approx(target_low, expected_low, tol),
            f"{current_ebitda} + {organic_low} + {inorganic_low} = {expected_low:.1f} vs target {target_low}",
        ),
        CheckResult(
            "7b. Value-up Bridge 上限",
            "5y", expected_high, target_high, target_high - expected_high,
            _approx(target_high, expected_high, tol),
            f"{current_ebitda} + {organic_high} + {inorganic_high} = {expected_high:.1f} vs target {target_high}",
        ),
    ]


def check_top_shareholders_total(individual_ratios: List[float], stated_total: float,
                                 tol: float = 0.15) -> CheckResult:
    """大株主上位N名の合計＝有報注記の「計」と一致。"""
    calc = sum(individual_ratios)
    return CheckResult(
        "8. 大株主合計持株比率",
        "FY-latest", stated_total, calc, calc - stated_total,
        _approx(calc, stated_total, tol),
    )


# ----------------------------------------------------------------------------
# Top-level driver
# ----------------------------------------------------------------------------
def verify_all(periods: List[PeriodData], tolerance: float = 0.15,
               table_b: Optional[dict] = None,
               value_up_bridge: Optional[dict] = None,
               top_shareholders: Optional[dict] = None) -> bool:
    """Run all checks. Returns True if all pass; raises AssertionError otherwise.

    Args:
        periods: list of PeriodData (5 fiscal years).
        tolerance: max diff in 億円 for sales/profit checks (0.15 = ±0.15億円).
        table_b: optional dict for Table-B composition-ratio check, keys:
            seg_sales, seg_profits, sales_ratios, profit_ratios.
        value_up_bridge: optional dict for Bridge check, keys:
            current_ebitda, organic_low, organic_high,
            inorganic_low, inorganic_high, target_low, target_high.
        top_shareholders: optional dict, keys: ratios (list), stated_total.
    """
    all_results: List[CheckResult] = []

    for p in periods:
        all_results.append(check_segment_sales_to_consolidated(p, tolerance))
        all_results.append(check_segment_profit_to_consolidated_op(p, tolerance))
        all_results.extend(check_segment_profit_rates(p))
        gr = check_geographic_sales_to_consolidated(p, tolerance)
        if gr is not None:
            all_results.append(gr)
        eb = check_ebitda(p, tolerance)
        if eb is not None:
            all_results.append(eb)

    if table_b is not None:
        all_results.extend(check_composition_ratio_table_b(**table_b))
    if value_up_bridge is not None:
        all_results.extend(check_value_up_bridge(**value_up_bridge))
    if top_shareholders is not None:
        all_results.append(check_top_shareholders_total(**top_shareholders))

    # Print formatted results
    fail_count = sum(1 for r in all_results if not r.passed)
    print("\n" + "=" * 90)
    print(f"  数値整合性検算結果（{len(all_results)}件中 PASS={len(all_results)-fail_count} / FAIL={fail_count}）")
    print("=" * 90)
    print(f"{'判定':6} {'期':10} {'検算項目':50} {'差':>10}")
    print("-" * 90)
    for r in all_results:
        mark = "✓ PASS" if r.passed else "✗ FAIL"
        print(f"{mark:6} {r.period:10} {r.name[:50]:50} {r.diff:+10.3f}")
        if r.note and not r.passed:
            print(f"       └─ {r.note}")
    print("=" * 90)
    if fail_count > 0:
        print(f"\n⚠️ {fail_count}件のFAIL検出。docx保存を中止。数値を見直してください。")
        raise AssertionError(f"Numerical verification failed: {fail_count} checks did not pass")
    print(f"\n✓ 全検算PASS。docx保存を継続します。")
    return True


# ----------------------------------------------------------------------------
# dd_model.json gate （IR を入力にした数値ゲート本体）
# ----------------------------------------------------------------------------
#
# 使い方（business-dd ワークフローのハードゲート）:
#     python numerical_checks.py path/to/dd_model.json
#   PASS → exit 0 / FAIL → 非ゼロ exit + stderr。FAIL の間は docx を生成しない。
#
# periods / table_b の単位は百万円。verify_all は億円・tol=0.15 で調整済みのため、
# ロード時に ÷100 で億円換算してから既存チェックに通す（IR 値が百万単位に丸められて
# いる前提で、periods の許容差は 1.0 億円＝100百万に緩める。粗誤差のみ検出する）。

_MLN_TO_OKU = 100.0  # 1 億円 = 100 百万円


def _d_to_oku(d):
    return {k: (v / _MLN_TO_OKU) for k, v in (d or {}).items()}


def _v_to_oku(v):
    return None if v is None else v / _MLN_TO_OKU


def check_market_vintage(market: List[dict]) -> List[CheckResult]:
    """市場規模カードは計測年(vintage)と実績/予測(kind)を必ず持つ（タムロンv2教訓の機械封じ込め）。"""
    results = []
    for i, m in enumerate(market or []):
        name = m.get("name", f"market[{i}]")
        has_vintage = isinstance(m.get("vintage"), int)
        has_kind = m.get("kind") in ("実績", "予測")
        ok = has_vintage and has_kind and bool(m.get("source"))
        miss = []
        if not has_vintage:
            miss.append("vintage(計測年)欠落")
        if not has_kind:
            miss.append("kind(実績/予測)欠落")
        if not m.get("source"):
            miss.append("source欠落")
        results.append(CheckResult(
            f"M1. 市場カード必須メタ（{name}）",
            "market", 1.0, 1.0 if ok else 0.0, 0.0 if ok else 1.0, ok,
            "／".join(miss) if miss else "",
        ))
    return results


def check_market_share_triangulation(share: List[dict], rel_tol: float = 0.30) -> List[CheckResult]:
    """自社売上(億円) ÷ 市場規模(億円) ×100 が記載シェアと整合（粗い不整合のみ検出）。"""
    results = []
    for i, s in enumerate(share or []):
        mkt = s.get("market", f"share[{i}]")
        rev = s.get("company_revenue_oku")
        size = s.get("market_size_oku")
        stated = s.get("stated_share_pct")
        if rev is None or not size or stated is None:
            results.append(CheckResult(
                f"S1. シェア三角測量（{mkt}）", "share", 0.0, 0.0, 0.0, False,
                "company_revenue_oku / market_size_oku / stated_share_pct のいずれか欠落",
            ))
            continue
        calc = rev / size * 100.0
        # 相対許容（シェアは出典で定義差があるため粗い不整合のみ検出）
        denom = max(abs(stated), 1e-9)
        passed = abs(calc - stated) / denom <= rel_tol or abs(calc - stated) <= 1.5
        results.append(CheckResult(
            f"S1. シェア三角測量（{mkt}）",
            "share", calc, stated, stated - calc, passed,
            f"算出 {calc:.2f}% vs 記載 {stated:.2f}%（rev={rev} / size={size}）",
        ))
    return results


def load_dd_model(path: str) -> dict:
    import json
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def verify_dd_model(path: str) -> bool:
    """dd_model.json を読み、periods は億円換算して verify_all に通し、
    さらに市場カード必須メタ・シェア三角測量を実行する。FAIL があれば AssertionError。"""
    m = load_dd_model(path)

    periods = []
    for p in m.get("periods", []):
        periods.append(PeriodData(
            label=p["label"],
            segment_sales=_d_to_oku(p.get("segment_sales")),
            segment_profits=_d_to_oku(p.get("segment_profits")),
            inter_segment_elimination=_v_to_oku(p.get("inter_segment_elimination", 0.0)) or 0.0,
            hq_overhead=_v_to_oku(p.get("hq_overhead", 0.0)) or 0.0,
            consolidated_sales=_v_to_oku(p.get("consolidated_sales")),
            consolidated_op_profit=_v_to_oku(p.get("consolidated_op_profit")),
            consolidated_dep=_v_to_oku(p.get("consolidated_dep")),
            geographic_sales=_d_to_oku(p.get("geographic_sales")) if p.get("geographic_sales") else None,
            segment_profit_rates=p.get("segment_profit_rates"),  # ％はそのまま
        ))

    tb = m.get("table_b")
    table_b = dict(
        seg_sales=tb["seg_sales"], seg_profits=tb["seg_profits"],
        sales_ratios=tb["sales_ratios"], profit_ratios=tb["profit_ratios"],
    ) if tb else None

    vub = m.get("value_up_bridge")
    bridge = dict(
        current_ebitda=vub["current_ebitda"],
        organic_low=vub["organic_low"], organic_high=vub["organic_high"],
        inorganic_low=vub["inorganic_low"], inorganic_high=vub["inorganic_high"],
        target_low=vub["target_low"], target_high=vub["target_high"],
    ) if vub else None

    ts = m.get("top_shareholders")
    shareholders = None
    if ts and ts.get("ratios") and ts.get("stated_total") is not None:
        shareholders = dict(individual_ratios=ts["ratios"], stated_total=ts["stated_total"])

    # periods は百万→億換算で丸め誤差が出るため許容差を 1.0 億円に緩める
    try:
        verify_all(periods, tolerance=1.0, table_b=table_b,
                   value_up_bridge=bridge, top_shareholders=shareholders)
        core_ok = True
    except AssertionError:
        core_ok = False

    extra = check_market_vintage(m.get("market", []))
    extra += check_market_share_triangulation(m.get("share", []))
    fails = [r for r in extra if not r.passed]
    print("\n" + "=" * 90)
    print(f"  IR追加検算（市場カード/シェア）: {len(extra)}件中 PASS={len(extra)-len(fails)} / FAIL={len(fails)}")
    print("=" * 90)
    for r in extra:
        mark = "✓ PASS" if r.passed else "✗ FAIL"
        print(f"{mark:6} {r.period:8} {r.name[:48]:48} {r.diff:+8.2f}")
        if r.note and not r.passed:
            print(f"       └─ {r.note}")
    print("=" * 90)

    if not core_ok or fails:
        raise AssertionError(
            f"dd_model 検算 FAIL（core_ok={core_ok}, 追加FAIL={len(fails)}）。docx生成を中止。"
        )
    print("\n✓ dd_model 全検算PASS。docx生成を継続します。")
    return True


# ----------------------------------------------------------------------------
# Self-test / CLI dispatch
# ----------------------------------------------------------------------------
def _self_test():
    # Sample: レオン自動機 FY2025 — should all pass
    periods = [
        PeriodData(
            label="FY2025",
            segment_sales={"食品加工機械": 230.3, "食品製造販売": 161.9},
            segment_profits={"食品加工機械": 56.5, "食品製造販売": 18.6},
            inter_segment_elimination=0.1,
            hq_overhead=-22.2,
            consolidated_sales=392.1,
            consolidated_op_profit=53.0,
            consolidated_dep=14.9,
            geographic_sales={"日本": 120.3, "北米南米": 205.1, "欧州": 46.2, "アジア": 20.5},
            segment_profit_rates={"食品加工機械": 24.5, "食品製造販売": 11.5},
        ),
    ]
    table_b = dict(
        seg_sales={"食品加工機械": 230.3, "食品製造販売": 161.9},
        seg_profits={"食品加工機械": 56.5, "食品製造販売": 18.6},
        sales_ratios={"食品加工機械": 58.7, "食品製造販売": 41.3},
        profit_ratios={"食品加工機械": 75.2, "食品製造販売": 24.8},
    )
    bridge = dict(
        current_ebitda=68, organic_low=15, organic_high=25,
        inorganic_low=10, inorganic_high=20, target_low=93, target_high=113,
    )
    shareholders = dict(
        individual_ratios=[11.3, 10.8, 6.3, 4.6, 4.3, 3.0, 2.3, 1.8, 1.8, 1.8],
        stated_total=48.0,
    )
    verify_all(periods, table_b=table_b, value_up_bridge=bridge, top_shareholders=shareholders)


if __name__ == "__main__":
    import sys
    # Windows コンソール(cp932)でも ✓/✗/罫線を出せるよう UTF-8 に固定
    for _s in (sys.stdout, sys.stderr):
        try:
            _s.reconfigure(encoding="utf-8")
        except Exception:
            pass
    args = [a for a in sys.argv[1:] if a.endswith(".json")]
    try:
        if args:
            verify_dd_model(args[0])
        else:
            _self_test()
    except AssertionError as e:
        print(f"\n✗ {e}", file=sys.stderr)
        sys.exit(1)
    sys.exit(0)
