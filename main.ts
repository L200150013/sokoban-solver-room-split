import * as fs from "node:fs";
import * as path from "node:path";
const D = [[0, -1, "u"], [0, 1, "d"], [-1, 0, "l"], [1, 0, "r"]];
const INF = 1 / 0, MAXN = 2e6;
function parse(t) {
  const ls = t.replace(/\r/g, "").split("\n");
  while (ls.length && ls[ls.length - 1] === "") ls.pop();
  let w = 0;
  for (const l of ls) w = Math.max(w, l.length);
  const h = ls.length, wall = new Uint8Array(w * h), goals = new Set(), boxes = new Set();
  let p = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = y * w + x, ch = x < ls[y].length ? ls[y][x] : "#";
    if (ch === "#") wall[c] = 1;
    else if (ch === ".") goals.add(c);
    else if (ch === "$") boxes.add(c);
    else if (ch === "*") { goals.add(c); boxes.add(c); }
    else if (ch === "@") p = c;
    else if (ch === "+") { goals.add(c); p = c; }
    else if (ch !== " ") wall[c] = 1;
  }
  return { w, h, wall, goals, boxes, player: p, py: (p / w) | 0 };
}
function flood(c, blocked, seeds) {
  let r = 0n;
  const st = [];
  for (const s of seeds) {
    const b = 1n << BigInt(s);
    if (!(blocked & b) && !(r & b)) { r |= b; st.push(s); }
  }
  while (st.length) {
    const cur = st.pop();
    for (let d = 0; d < 4; d++) {
      const nb = c.nbr[cur][d];
      if (nb < 0) continue;
      const b = 1n << BigInt(nb);
      if ((blocked & b) || (r & b)) continue;
      r |= b; st.push(nb);
    }
  }
  return r;
}
function bits(m, n) {
  const o = [];
  for (let i = 0; i < n; i++) if ((m >> BigInt(i)) & 1n) o.push(i);
  return o;
}
function heap() {
  const a = [];
  const less = (x, y) => x.f !== y.f ? x.f < y.f : x.h !== y.h ? x.h < y.h : x.s < y.s;
  return {
    size() { return a.length; },
    push(it) {
      a.push(it);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (!less(a[i], a[p])) break;
        [a[i], a[p]] = [a[p], a[i]]; i = p;
      }
    },
    pop() {
      const t = a[0], l = a.pop();
      if (a.length) {
        a[0] = l;
        let i = 0;
        for (;;) {
          const x = i * 2 + 1, y = x + 1;
          let m = i;
          if (x < a.length && less(a[x], a[m])) m = x;
          if (y < a.length && less(a[y], a[m])) m = y;
          if (m === i) break;
          [a[i], a[m]] = [a[m], a[i]]; i = m;
        }
      }
      return t;
    },
  };
}
function search(c, b0, seeds, ex, maxG) {
  const hr = c.hr, n = c.n;
  const r0 = flood(c, b0, seeds);
  if (b0 & c.dead) return null;
  const h0 = hr(b0);
  if (h0 === INF || h0 > maxG) return null;
  const k0 = (b0 << BigInt(n)) | r0;
  const best = new Map([[k0, 0]]), par = new Map(), hp = heap();
  let sq = 0, exn = 0;
  hp.push({ f: h0, h: h0, s: sq++, k: k0, b: b0, r: r0, g: 0 });
  while (hp.size()) {
    const cur = hp.pop();
    if (best.get(cur.k) !== cur.g) continue;
    if (++exn > MAXN) throw new Error("budget");
    if ((cur.b & ~c.gm) === 0n && (!ex || (cur.r & c.pm))) {
      const sq2 = [];
      let k = cur.k;
      while (par.has(k)) { const p = par.get(k); sq2.push(p); k = p.p; }
      return { n: cur.g, q: sq2.reverse() };
    }
    for (const b of bits(cur.b, n)) for (let d = 0; d < 4; d++) {
      const t = c.nbr[b][d];
      if (t < 0 || !c.rm[t]) continue;
      const tb = 1n << BigInt(t);
      if (cur.b & tb) continue;
      const s = c.nbr[b][d ^ 1];
      if (s < 0 || !(cur.r & (1n << BigInt(s)))) continue;
      const nb = (cur.b & ~(1n << BigInt(b))) | tb;
      if (nb & c.dead) continue;
      if (blk(c, nb, t)) continue;
      const g = cur.g + 1, h = hr(nb);
      if (h === INF || g + h > maxG) continue;
      const nr = flood(c, nb, [b]), nk = (nb << BigInt(n)) | nr, pb = best.get(nk);
      if (pb !== undefined && pb <= g) continue;
      best.set(nk, g);
      par.set(nk, { p: cur.k, b, d });
      hp.push({ f: g + h, h, s: sq++, k: nk, b: nb, r: nr, g });
    }
  }
  return null;
}
function blk(c, bm, mv) {
  const bs = c.bk[mv];
  if (!bs) return false;
  for (const cl of bs) {
    let full = true, off = false;
    for (const x of cl) {
      if (x === -1) continue;
      const b = 1n << BigInt(x);
      if (!(bm & b)) { full = false; break; }
      if (!(c.gm & b)) off = true;
    }
    if (full && off) return true;
  }
  return false;
}
function ctx(L, fl, rm, gl, po) {
  const n = fl.length, g2l = new Map(fl.map((x, i) => [x, i]));
  const inf = new Uint8Array(L.w * L.h);
  for (const x of fl) inf[x] = 1;
  const nbr = fl.map((g) => {
    const x = g % L.w, y = (g / L.w) | 0;
    return D.map((d) => {
      const nx = x + d[0], ny = y + d[1];
      if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h) return -1;
      const ng = ny * L.w + nx;
      return inf[ng] ? g2l.get(ng) : -1;
    });
  });
  const rmm = new Uint8Array(n);
  for (const x of rm) rmm[g2l.get(x)] = 1;
  const gl2 = [];
  let gm = 0n, pm = 0n;
  for (const g of gl) { const li = g2l.get(g); gl2.push(li); gm |= 1n << BigInt(li); }
  for (const p of po) { const li = g2l.get(p); if (li !== undefined) pm |= 1n << BigInt(li); }
  const dist = [];
  for (let s = 0; s < n; s++) {
    const row = new Array(n).fill(INF);
    row[s] = 0;
    const q = [s];
    let qi = 0;
    while (qi < q.length) {
      const cur = q[qi++];
      for (const nb of nbr[cur]) if (nb >= 0 && row[nb] === INF) { row[nb] = row[cur] + 1; q.push(nb); }
    }
    dist.push(row);
  }
  const c = { n, cells: fl, g2l, nbr, rm: rmm, gm, pm, dist, dead: 0n, bk: {} };
  let dm = 0n;
  for (let i = 0; i < n; i++) {
    if (!rmm[i] || (gm >> BigInt(i)) & 1n) continue;
    const u = nbr[i][0] < 0, dn = nbr[i][1] < 0, lf = nbr[i][2] < 0, rt = nbr[i][3] < 0;
    if ((u || dn) && (lf || rt)) dm |= 1n << BigInt(i);
  }
  c.dead = dm;
  const bk = {};
  for (let y = 0; y + 1 < L.h; y++) for (let x = 0; x + 1 < L.w; x++) {
    const gs = [y * L.w + x, y * L.w + x + 1, (y + 1) * L.w + x, (y + 1) * L.w + x + 1];
    const cl = [];
    let ok = true, hr2 = false;
    for (const g of gs) {
      const li = g2l.get(g);
      if (li === undefined) {
        if (!L.wall[g]) { ok = false; break; }
        cl.push(-1);
      } else {
        if (!rmm[li]) { ok = false; break; }
        cl.push(li); hr2 = true;
      }
    }
    if (!ok || !hr2) continue;
    for (const x2 of cl) if (x2 >= 0) (bk[x2] = bk[x2] || []).push(cl);
  }
  c.bk = bk;
  const cache = new Map();
  c.hr = (bm) => {
    const cd = cache.get(bm);
    if (cd !== undefined) return cd;
    const bs = bits(bm, n);
    let v;
    if (!bs.length) v = 0;
    else if (bs.length > gl2.length) v = INF;
    else {
      let best = INF;
      const used = new Array(gl2.length).fill(false);
      const asg = (bi, pt) => {
        if (pt >= best) return;
        if (bi === bs.length) { best = pt; return; }
        for (let gi = 0; gi < gl2.length; gi++) {
          if (used[gi]) continue;
          const d = dist[bs[bi]][gl2[gi]];
          if (d === INF) continue;
          used[gi] = true; asg(bi + 1, pt + d); used[gi] = false;
        }
      };
      asg(0, 0);
      v = best;
    }
    cache.set(bm, v);
    return v;
  };
  return c;
}
function split(L) {
  const hy = L.py, seen = new Uint8Array(L.w * L.h), comps = [];
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const cc = y * L.w + x;
    if (L.wall[cc] || y === hy || seen[cc]) continue;
    const comp = [], st = [cc];
    seen[cc] = 1;
    while (st.length) {
      const cur = st.pop();
      comp.push(cur);
      for (const d of D) {
        const nx = (cur % L.w) + d[0], ny = ((cur / L.w) | 0) + d[1];
        if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h || ny === hy) continue;
        const ng = ny * L.w + nx;
        if (L.wall[ng] || seen[ng]) continue;
        seen[ng] = 1; st.push(ng);
      }
    }
    const bx = comp.filter((z) => L.boxes.has(z)), gl = comp.filter((z) => L.goals.has(z));
    if (!bx.length && !gl.length) continue;
    comps.push({ cells: comp, boxes: bx, goals: gl });
  }
  if (!comps.length) return null;
  for (const cp of comps) if (cp.boxes.length !== cp.goals.length) return null;
  const reach = new Uint8Array(L.w * L.h), st = [L.player];
  reach[L.player] = 1;
  while (st.length) {
    const cur = st.pop();
    for (const d of D) {
      const nx = (cur % L.w) + d[0], ny = ((cur / L.w) | 0) + d[1];
      if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h) continue;
      const ng = ny * L.w + nx;
      if (L.wall[ng] || L.boxes.has(ng) || reach[ng]) continue;
      reach[ng] = 1; st.push(ng);
    }
  }
  const rooms = [];
  for (const cp of comps) {
    const po = new Set();
    for (const cell of cp.cells) for (const d of D) {
      const nx = (cell % L.w) + d[0], ny = ((cell / L.w) | 0) + d[1];
      if (ny !== hy || nx < 0 || nx >= L.w) continue;
      const ng = ny * L.w + nx;
      if (!L.wall[ng]) po.add(ng);
    }
    const pa = [...po];
    if (!pa.length) return null;
    rooms.push({ ...cp, porch: pa, seeds: pa.filter((p) => reach[p]) });
  }
  return rooms;
}
function walk(L, boxes, from, to) {
  if (from === to) return [];
  const prev = new Map([[from, -1]]), q = [from];
  let qi = 0;
  while (qi < q.length) {
    const cur = q[qi++];
    for (let d = 0; d < 4; d++) {
      const nx = (cur % L.w) + D[d][0], ny = ((cur / L.w) | 0) + D[d][1];
      if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h) continue;
      const ng = ny * L.w + nx;
      if (L.wall[ng] || boxes.has(ng) || prev.has(ng)) continue;
      prev.set(ng, (cur << 2) | d);
      if (ng === to) {
        const ds = [];
        let nd = ng;
        while (nd !== from) { const pk = prev.get(nd); ds.push(pk & 3); nd = pk >> 2; }
        return ds.reverse();
      }
      q.push(ng);
    }
  }
  return null;
}
function solve(L) {
  const rooms = split(L);
  if (!rooms) return "";
  const plan = [];
  for (const rm of rooms) {
    const c = ctx(L, [...rm.cells, ...rm.porch], rm.cells, rm.goals, rm.porch);
    let b0 = 0n;
    for (const b of rm.boxes) b0 |= 1n << BigInt(c.g2l.get(b));
    if (!rm.seeds.length) return "";
    const seeds = rm.seeds.map((p) => c.g2l.get(p)).filter((v) => v !== undefined);
    if (!seeds.length) return "";
    let pl, ex;
    try {
      pl = search(c, b0, seeds, false, INF);
      if (!pl) return "";
      ex = search(c, b0, seeds, true, pl.n);
    } catch (e) { return ""; }
    plan.push({ rm, c, q: ex ? ex.q : pl.q, trap: !ex });
  }
  plan.sort((a, b) => (a.trap ? 1 : 0) - (b.trap ? 1 : 0));
  const boxes = new Set(L.boxes);
  let player = L.player, moves = "";
  for (const st of plan) {
    for (const pu of st.q) {
      const bg = st.c.cells[pu.b], d = pu.d;
      const bx = bg % L.w, by = (bg / L.w) | 0;
      const stance = (by - D[d][1]) * L.w + (bx - D[d][0]);
      const wk = walk(L, boxes, player, stance);
      if (wk === null) return "";
      for (const wd of wk) moves += D[wd][2];
      moves += D[d][2];
      boxes.delete(bg);
      boxes.add((by + D[d][1]) * L.w + (bx + D[d][0]));
      player = bg;
    }
  }
  return moves;
}
function main() {
  fs.mkdirSync("/output", { recursive: true });
  for (const id of fs.readdirSync("/input").sort()) {
    const lp = path.join("/input", id, "level.txt");
    let st = null;
    try { st = fs.statSync(lp); } catch (e) { st = null; }
    if (!st || !st.isFile()) continue;
    let mv = "";
    try { mv = solve(parse(fs.readFileSync(lp, "utf8"))); } catch (e) { mv = ""; }
    const od = path.join("/output", id);
    fs.mkdirSync(od, { recursive: true });
    fs.writeFileSync(path.join(od, "solution.txt"), mv, "utf8");
  }
}
main();
