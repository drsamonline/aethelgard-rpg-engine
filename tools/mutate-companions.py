#!/usr/bin/env python3
"""Mutation check for the companion-behaviour guard: each edit must turn test10.js RED."""
import pathlib, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path("/scratch/work/rpg")

MUTATIONS = [
    ("the resolver hides an unknown behaviour", "js/companions.js",
     'return { behaviour:"strike", known:false, declared:true, raw:String(raw) };',
     'return { behaviour:String(raw), known:true, declared:true, raw:String(raw) };'),
    # NOTE: "the dispatch reads def.behaviour raw instead of resolved.behaviour" is
    # NOT listed: the resolver only ever returns a known word, so the two are
    # behaviourally identical for every input. It is an equivalent mutant; the
    # unknown-behaviour case is covered by mutation 1.
    ("the warning repeats every round", "js/companions.js",
     "if (!G._compBehaviourWarned[def.id]) {",
     "if (true) {"),
    ("every behaviour counts as guard for the intercept", "js/companions.js",
     'const chance = (G.companionBehaviour(act.def).behaviour === "guard" ? 0.45 : 0.2)',
     'const chance = (true ? 0.45 : 0.2)'),
    ("the healer stops healing", "js/companions.js",
     "if (p.hp < G.maxHp() * 0.5) {",
     "if (false) {"),
    ("the validator accepts any behaviour word", "js/validate.js",
     "else if (COMP_BEHAVIOURS.indexOf(b) < 0)",
     "else if (false)"),
    ("the validator stops checking duplicate ids", "js/validate.js",
     "else if (compIds.has(c.id)) E(",
     "else if (false) E("),
]

results = []
for what, rel, old, new in MUTATIONS:
    tmp = pathlib.Path(tempfile.mkdtemp()) / "rpg"
    shutil.copytree(ROOT, tmp, ignore=shutil.ignore_patterns(".git"))
    f = tmp / rel
    src = f.read_text()
    if old not in src:
        results.append((what, "SKIP (anchor not found)"))
        shutil.rmtree(tmp.parent)
        continue
    f.write_text(src.replace(old, new, 1))
    p = subprocess.run(["node", "test10.js"], cwd=tmp, capture_output=True, text=True)
    red = p.returncode != 0
    tail = [l for l in p.stdout.splitlines() if l.startswith("FAIL")]
    results.append((what, ("RED  " if red else "GREEN (test is blind!) ") + (tail[0][:110] if tail else "")))
    shutil.rmtree(tmp.parent)

bad = 0
for what, res in results:
    print(f"{what:52s} {res}")
    if not res.startswith("RED"):
        bad += 1
print(f"\n{len(results) - bad}/{len(results)} mutations turned the suite red")
sys.exit(1 if bad else 0)
