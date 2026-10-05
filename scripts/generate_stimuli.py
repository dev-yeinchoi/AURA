"""AURA rev08 stimuli generator (reference implementation).

Computes G, A, confusion type, exact interventional Shapley values and the
nearest comparison case from the Phase 0 rev08 spec (docs/02, docs/01) and
writes data/stimuli/{low,high}.json. Values are stored as exact rationals
("num/den"). The TypeScript rule functions must reproduce these files exactly.

Run from repo root: python3 scripts/generate_stimuli.py
"""
import json
from fractions import Fraction as F
from itertools import product, combinations
from math import factorial

VERSION = "rev08"
# (profile_id, age, E months, P /6, R /4, T hours/week)
PROFILES = {
    "low": (2, [("L01",32,6,5,3,2),("L02",47,12,6,4,3),("L03",39,9,5,4,2.5),("L04",28,8,5,3,1.5),
                ("L05",51,15,6,4,1),("L06",43,0,6,3,2),("L07",30,4,6,4,3),("L08",54,3,5,3,2),
                ("L09",35,10,4,4,3),("L10",45,14,6,2,3),("L11",27,2,4,2,1),("L12",41,5,6,4,1.5)]),
    "high": (4, [("H01",48,14,5,4,4),("H02",31,7,5,3,5),("H03",40,20,6,3,6),("H04",52,9,6,4,3),
                 ("H05",29,16,5,3,3.5),("H06",36,2,6,4,4),("H07",46,5,6,3,5),("H08",28,1,5,4,4),
                 ("H09",53,12,3,4,5),("H10",34,8,6,1,6),("H11",42,4,4,2,3),("H12",39,3,6,4,3.5)]),
}
FEATURES = ["E", "P", "R", "T"]


def G(E, P, R, T, tau):
    return int(T >= tau and R >= 3 and P >= 5 and (E >= 6 or P == 6))


def A(E, P, R, T):  # T is intentionally unused by the AI rule
    return int(E >= 6 and P >= 5 and R >= 3)


def ctype(g, a):
    return {(1, 1): "TP", (0, 1): "FP", (1, 0): "FN", (0, 0): "TN"}[(g, a)]


def frac(x):
    return f"{x.numerator}/{x.denominator}"


def build(risk):
    tau, rows = PROFILES[risk]
    baseline = list(product([3, 9], [4, 6], [2, 4], [tau - 1, tau + 1]))  # E→P→R→T ascending
    prefix = "LC" if risk == "low" else "HC"
    cases = [{"case_id": f"{prefix}{i + 1:02d}", "E": b[0], "P": b[1], "R": b[2], "T": b[3], "A": A(*b)}
             for i, b in enumerate(baseline)]
    v0 = sum(F(A(*b)) for b in baseline) / 16

    profiles = []
    for pid, age, E, P, R, T in rows:
        x = (E, P, R, T)
        g, a = G(*x, tau), A(*x)

        def v(S):
            return sum(F(A(*[x[k] if k in S else b[k] for k in range(4)])) for b in baseline) / 16

        phi = {}
        for j in range(4):
            others = [k for k in range(4) if k != j]
            s = F(0)
            for r in range(4):
                for S in combinations(others, r):
                    w = F(factorial(r) * factorial(3 - r), factorial(4))
                    s += w * (v(set(S) | {j}) - v(set(S)))
            phi[FEATURES[j]] = s
        assert v0 + sum(phi.values()) == a, pid
        assert phi["T"] == 0, pid

        def dist(c):
            return (F(abs(E - c["E"]), 24) + F(abs(P - c["P"]), 6) + F(abs(R - c["R"]), 4)) / 3

        best = min(cases, key=lambda c: (dist(c), c["case_id"]))
        n_ties = sum(1 for c in cases if dist(c) == dist(best))
        profiles.append({
            "profile_id": pid, "age": age, "E": E, "P": P, "R": R, "T": T,
            "G": g, "A": a, "type": ctype(g, a),
            "fi": {k: frac(val) for k, val in phi.items()},
            "case_id": best["case_id"], "case_distance": frac(dist(best)), "case_tie_count": n_ties,
        })

    counts = {t: sum(p["type"] == t for p in profiles) for t in ["TP", "FP", "FN", "TN"]}
    assert counts == {"TP": 3, "FP": 2, "FN": 2, "TN": 5}, counts
    return {
        "stimulus_version": VERSION,
        "risk": risk,
        "tau": tau,
        "rule_versions": {"G": f"G-{VERSION}", "A": f"A-{VERSION}", "FI": f"FI-{VERSION}", "case": f"case-{VERSION}"},
        "baseline_v0": frac(v0),
        "_note": "SERVER-ONLY. G and type never leave the server. A, fi, case are returned only after the initial-judgment lock.",
        "profiles": profiles,
        "cases": cases,
    }


if __name__ == "__main__":
    for risk in ["low", "high"]:
        with open(f"data/stimuli/{risk}.json", "w", encoding="utf-8") as f:
            json.dump(build(risk), f, ensure_ascii=False, indent=2)
    print("ok: data/stimuli/low.json, data/stimuli/high.json")
