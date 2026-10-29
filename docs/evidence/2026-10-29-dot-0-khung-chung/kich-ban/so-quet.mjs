// QA2 đợt 0 (29/10/2026): so hai lượt quét do-trang.mjs (27/10 ↔ mới) trên các ô CHUNG (cùng bộ quyền, trang, khổ, trạng thái).
// Chạy từ GỐC repo: node docs/evidence/2026-10-29-dot-0-khung-chung/kich-ban/so-quet.mjs docs/evidence/2026-10-27-danh-gia-ux-tong-the/so-lieu/nhieu.json docs/evidence/2026-10-29-dot-0-khung-chung/so-lieu/nhieu.json
import { readFileSync } from "node:fs";
const a = JSON.parse(readFileSync(process.argv[2])).ketQua, b = JSON.parse(readFileSync(process.argv[3])).ketQua;
const key = (x) => `${x.bo}|${x.trang}|${x.kho}|${x.loai ?? ""}`;
const A = new Map(a.filter((x) => x.do).map((x) => [key(x), x])), B = new Map(b.filter((x) => x.do).map((x) => [key(x), x]));
const chung = [...A.keys()].filter((k) => B.has(k));
console.log("ô 27/10", a.length, "ô mới", b.length, "ô chung", chung.length, "ô chỉ mới", [...B.keys()].filter((k) => !A.has(k)).length);
const nang = (v) => v.impact === "serious" || v.impact === "critical";
const m = {
  "vùng chạm <44 (tổng)": (x) => x.do.soNhoHon44, "ô tràn ngang": (x) => (x.do.tranNgang ? 1 : 0), "ô gõ <16px": (x) => x.do.oGoNho.length, "ô gõ không nhãn": (x) => x.do.oKhongNhan.length,
  "chữ bị cắt": (x) => x.do.catChu.length, "từ Anh": (x) => x.do.tuAnh.length, "số màn cuộn (tổng)": (x) => x.do.soManCuon, "axe nghiêm trọng+": (x) => (x.axe || []).filter(nang).reduce((s, v) => s + v.n, 0),
  "axe mọi mức": (x) => (x.axe || []).reduce((s, v) => s + v.n, 0), "lỗi console": (x) => (x.loiConsole || []).length, "số vùng dính": (x) => x.do.dinh.length, "h1 nhiều hơn 1": (x) => (x.do.h1.length > 1 ? 1 : 0),
};
for (const kho of [390, 1040, 768, 1440]) {
  const ks = chung.filter((k) => k.split("|")[2] === String(kho));
  console.log(`\n[${kho}] ${ks.length} ô chung\n  ` + Object.entries(m).map(([n, f]) => `${n}: ${ks.reduce((s, k) => s + f(A.get(k)), 0)} → ${ks.reduce((s, k) => s + f(B.get(k)), 0)}`).join("\n  "));
}
const d = chung.map((k) => [k, B.get(k).do.soNhoHon44 - A.get(k).do.soNhoHon44]).sort((x, y) => y[1] - x[1]);
console.log("\nTăng vùng chạm<44 nhiều nhất:", d.slice(0, 10).map((x) => x.join(" ")).join("; "));
console.log("Giảm nhiều nhất:", d.slice(-8).map((x) => x.join(" ")).join("; "));
console.log("Tràn MỚI:", chung.filter((k) => B.get(k).do.tranNgang && !A.get(k).do.tranNgang).join("; "));
console.log("Hết tràn:", chung.filter((k) => !B.get(k).do.tranNgang && A.get(k).do.tranNgang).join("; "));
const cc = chung.filter((k) => B.get(k).do.catChu.length > A.get(k).do.catChu.length).map((k) => k + " " + JSON.stringify(B.get(k).do.catChu.filter((c) => !A.get(k).do.catChu.includes(c))).slice(0, 80));
console.log("Cắt chữ MỚI:", cc.length, cc.slice(0, 15).join("; "));
console.log("axe nghiêm trọng MỚI:", chung.filter((k) => (B.get(k).axe || []).some((v) => nang(v) && !(A.get(k).axe || []).some((w) => w.id === v.id))).map((k) => k + " " + B.get(k).axe.map((v) => v.id).join(",")).join("; "));
console.log("axe nghiêm trọng HẾT:", chung.filter((k) => (A.get(k).axe || []).some((v) => nang(v) && !(B.get(k).axe || []).some((w) => w.id === v.id))).join("; "));
console.log("Ô chỉ có ở mới:", [...B.keys()].filter((k) => !A.has(k)).join("; "));
console.log("Ô chỉ có ở 27/10:", [...A.keys()].filter((k) => !B.has(k)).join("; "));
