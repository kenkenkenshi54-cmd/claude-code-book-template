# -*- coding: utf-8 -*-
"""Structural gate for topic-study の causal_graph.json（IR）。

数値ではなく『因果構造』の機械検査。chain-critic に渡す前・プローズ化の前に通す。

  python check_causal_graph.py path/to/causal_graph.json

PASS → exit 0 / FAIL → 非ゼロ exit。FAIL の間はプローズ化しない。

検査内容:
  G1 ノードID一意
  G2 全エッジの from/to が実在ノードを参照
  G3 孤立ノードなし（全ノードがいずれかのエッジに接続）
  G4 逆説ルール: 逆説エッジには隣接して理由付けが付いている
  G5 クリティカルノードは evidence_tier(A/B/C)＋evidence を持つ
  G6 クリティカルエッジは magnitude＋lag＋confidence を持つ
  G7 counter_chain: opposite=true・nodes>=2・edges>=1・conclusion 非空・参照整合
  G8 adjudication: short/mid/long すべて非空
  G9 main_conclusion と counter_chain.conclusion が両方あり、同一文でない
"""
import json
import sys


class Res:
    def __init__(self, code, name, passed, note=""):
        self.code, self.name, self.passed, self.note = code, name, passed, note


def _crit_edges(edges, crit_node_ids):
    out = []
    for e in edges:
        if e.get("from") in crit_node_ids or e.get("to") in crit_node_ids:
            out.append(e)
    return out


def check(graph: dict):
    results = []
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    ids = [n.get("id") for n in nodes]

    # G1
    dup = sorted({i for i in ids if ids.count(i) > 1})
    results.append(Res("G1", "ノードID一意", not dup,
                       f"重複ID: {dup}" if dup else ""))

    idset = set(ids)
    # G2
    bad_ref = []
    for e in edges:
        for k in ("from", "to"):
            if e.get(k) not in idset:
                bad_ref.append(f'{e.get(k)}({k})')
    results.append(Res("G2", "エッジ参照整合", not bad_ref,
                       f"未定義ノード参照: {bad_ref}" if bad_ref else ""))

    # G3
    deg = {i: 0 for i in idset}
    for e in edges:
        if e.get("from") in deg:
            deg[e["from"]] += 1
        if e.get("to") in deg:
            deg[e["to"]] += 1
    isolated = [i for i, d in deg.items() if d == 0]
    results.append(Res("G3", "孤立ノードなし", not isolated,
                       f"孤立: {isolated}" if isolated else ""))

    # G4 逆説ルール
    g4_fail = []
    reason_edges = [e for e in edges if e.get("type") == "理由付け"]
    for e in edges:
        if e.get("type") != "逆説":
            continue
        endpoints = {e.get("from"), e.get("to")}
        has_reason = any(
            (re.get("from") in endpoints or re.get("to") in endpoints)
            for re in reason_edges
        )
        if not has_reason:
            g4_fail.append(f'{e.get("from")}→{e.get("to")}')
    results.append(Res("G4", "逆説に理由付けが隣接", not g4_fail,
                       f"理由付け欠落の逆説: {g4_fail}" if g4_fail else ""))

    # G5 クリティカルノード
    crit_ids = {n.get("id") for n in nodes if n.get("critical")}
    g5_fail = []
    for n in nodes:
        if not n.get("critical"):
            continue
        if n.get("evidence_tier") not in ("A", "B", "C") or not n.get("evidence"):
            g5_fail.append(n.get("id"))
    results.append(Res("G5", "クリティカルノードに証拠グレード", not g5_fail,
                       f"tier/evidence 欠落: {g5_fail}" if g5_fail else ""))

    # G6 クリティカルエッジ
    g6_fail = []
    for e in _crit_edges(edges, crit_ids):
        miss = []
        if not e.get("magnitude"):
            miss.append("magnitude")
        if e.get("lag") not in ("即時", "1Q", "数Q", "年単位"):
            miss.append("lag")
        if e.get("confidence") not in ("高", "中", "低"):
            miss.append("confidence")
        if miss:
            g6_fail.append(f'{e.get("from")}→{e.get("to")}:{"/".join(miss)}')
    results.append(Res("G6", "クリティカルエッジに量/ラグ/確度", not g6_fail,
                       f"欠落: {g6_fail}" if g6_fail else ""))

    # G7 counter_chain
    cc = graph.get("counter_chain") or {}
    cc_nodes = cc.get("nodes", [])
    cc_edges = cc.get("edges", [])
    cc_ids = {n.get("id") for n in cc_nodes}
    cc_ref_ok = all(
        (e.get("from") in cc_ids and e.get("to") in cc_ids) for e in cc_edges
    ) if cc_edges else False
    g7_ok = (
        cc.get("opposite") is True
        and len(cc_nodes) >= 2
        and len(cc_edges) >= 1
        and bool(cc.get("conclusion"))
        and cc_ref_ok
    )
    g7_note = ""
    if not g7_ok:
        why = []
        if cc.get("opposite") is not True:
            why.append("opposite!=true")
        if len(cc_nodes) < 2:
            why.append("nodes<2")
        if len(cc_edges) < 1:
            why.append("edges<1")
        if not cc.get("conclusion"):
            why.append("conclusion空")
        if not cc_ref_ok:
            why.append("エッジ参照不整合")
        g7_note = "／".join(why)
    results.append(Res("G7", "反対連鎖の構築", g7_ok, g7_note))

    # G8 adjudication
    adj = graph.get("adjudication") or {}
    g8_miss = [k for k in ("short_term", "mid_term", "long_term") if not adj.get(k)]
    results.append(Res("G8", "時間軸別裁定", not g8_miss,
                       f"未記入: {g8_miss}" if g8_miss else ""))

    # G9 main vs counter conclusion
    main_c = (graph.get("main_conclusion") or "").strip()
    cc_c = (cc.get("conclusion") or "").strip()
    g9_ok = bool(main_c) and bool(cc_c) and main_c != cc_c
    g9_note = ""
    if not g9_ok:
        if not main_c:
            g9_note = "main_conclusion 空"
        elif not cc_c:
            g9_note = "counter_chain.conclusion 空"
        else:
            g9_note = "主結論と反対結論が同一文（対称化されていない）"
    results.append(Res("G9", "主結論と反対結論の対比", g9_ok, g9_note))

    return results


def main(path: str) -> int:
    with open(path, "r", encoding="utf-8") as f:
        graph = json.load(f)
    results = check(graph)
    fails = [r for r in results if not r.passed]
    print("\n" + "=" * 84)
    print(f"  causal_graph 構造検査: {len(results)}件中 "
          f"PASS={len(results)-len(fails)} / FAIL={len(fails)}")
    print("=" * 84)
    for r in results:
        mark = "✓ PASS" if r.passed else "✗ FAIL"
        print(f"{mark:6} {r.code:4} {r.name}")
        if r.note and not r.passed:
            print(f"       └─ {r.note}")
    print("=" * 84)
    if fails:
        print(f"\n⚠️ {len(fails)}件のFAIL。プローズ化を中止。causal_graph.json を見直してください。")
        return 1
    print("\n✓ 構造検査 全PASS。プローズ化・chain-critic へ進みます。")
    return 0


if __name__ == "__main__":
    for _s in (sys.stdout, sys.stderr):
        try:
            _s.reconfigure(encoding="utf-8")
        except Exception:
            pass
    if len(sys.argv) < 2 or not sys.argv[1].endswith(".json"):
        print("usage: python check_causal_graph.py path/to/causal_graph.json",
              file=sys.stderr)
        sys.exit(2)
    try:
        sys.exit(main(sys.argv[1]))
    except (OSError, json.JSONDecodeError) as e:
        print(f"\n✗ 読み込み失敗: {e}", file=sys.stderr)
        sys.exit(1)