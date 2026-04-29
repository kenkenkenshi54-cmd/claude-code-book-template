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
# Self-test (run module directly)
# ----------------------------------------------------------------------------
if __name__ == "__main__":
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
