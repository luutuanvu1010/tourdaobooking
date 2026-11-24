// Liệt kê đoạn chữ ĐẬM HƠN chữ thân trong vùng nội dung (cùng phép đếm của scripts/giao-dien/cham-khung-goc.mjs, phần ngôn ngữ thị giác), gom theo lớp của phần tử cha,
// để biết sửa chỗ nào khi một màn vượt trần chữ đậm. Chỉ GET; dùng cookie ở <ra>/phien.json (đăng nhập lại nếu hết hạn, như chup.mjs).
// Chạy từ gốc kho: node docs/evidence/2026-11-24-khung-goc-dot-b/kich-ban/liet-ke-dam.mjs --tk taixe --trang /cuoc [--rong 390] [--base http://127.0.0.1:8871]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { dangNhap, moChrome, sleep } from "../../../../scripts/giao-dien/cdp.mjs";
const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const base = lay("--base", "http://127.0.0.1:8871"), ra = join(homedir(), "tourdao-dot-b-2026-11-24"), tkKhoa = lay("--tk"), w = Number(lay("--rong", "1280"));
const tk = JSON.parse(readFileSync(join(ra, "tai-khoan.json"), "utf8")).taiKhoan.find((t) => t.khoa === tkKhoa);
const phienTep = join(ra, "phien.json"); const phien = existsSync(phienTep) ? JSON.parse(readFileSync(phienTep, "utf8")) : {};
let ck = phien[tkKhoa];
if (!ck || (await fetch(`${base}/api/auth/me`, { headers: { cookie: `${ck.name}=${ck.value}` } })).status !== 200) { ck = await dangNhap(base, tk.sdt, tk.pin); phien[tkKhoa] = ck; writeFileSync(phienTep, JSON.stringify(phien)); }
const c = await moChrome(); const n = await c.moNgan();
try {
  await n.cookie(ck, base); await n.khung(w, w < 641 ? 844 : 800, w < 641, 1); await n.di(base + lay("--trang")); await sleep(1200);
  const kq = await n.ev(String.raw`(() => { const main = document.querySelector("main"); const than = Number(getComputedStyle(document.body).fontWeight) || 400; const hien = (el) => { if (el.closest("[hidden]")) return false; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 1 && r.height > 1 && s.display !== "none" && s.visibility !== "hidden"; };
    let tong = 0; const g = {}; const w2 = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let x = w2.nextNode(); x; x = w2.nextNode()) { if (!x.textContent.trim()) continue; const p = x.parentElement; if (!hien(p) || p.closest(".vung-tu-do") || p.closest("svg")) continue; tong++; const fw = Number(getComputedStyle(p).fontWeight); if (fw > than) { const k = p.tagName.toLowerCase() + "." + [...p.classList].join(".") + " (" + fw + ")"; (g[k] ??= []).push(x.textContent.trim().slice(0, 30)); } }
    return { tong, than, g }; })()`);
  const dam = Object.values(kq.g).reduce((a, v) => a + v.length, 0);
  console.log(`${lay("--trang")} @${w}: ${dam}/${kq.tong} đoạn đậm (${Math.round((dam / kq.tong) * 100)} %), chữ thân ${kq.than}`);
  for (const [k, v] of Object.entries(kq.g).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${String(v.length).padStart(3)}  ${k}  — ${v.slice(0, 4).join(" | ")}`);
} finally { await c.tat(); }
