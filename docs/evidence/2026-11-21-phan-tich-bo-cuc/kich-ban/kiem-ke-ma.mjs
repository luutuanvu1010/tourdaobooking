// Kiểm kê TĨNH tệp kiểu chung (public/app.css) và cách các trang dựng giao diện (web/*.ts) cho đợt phân tích khung gốc 21/11/2026.
// Chỉ đọc mã; in bảng tóm tắt và ghi số liệu ra NGOÀI kho. Chạy từ GỐC kho:
//   node docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/kiem-ke-ma.mjs [--ra ~/tourdao-bo-cuc-2026-11-21]
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const ra = resolve(lay("--ra", "~/tourdao-bo-cuc-2026-11-21").replace(/^~/, homedir()));
const css = readFileSync("public/app.css", "utf8");

// ---- Tách luật CSS (đủ dùng cho tệp này: khối lồng @media / @supports / @container; bỏ chú thích) ----
const sach = css.replace(/\/\*[\s\S]*?\*\//g, "");
const luat = []; // { bo: [bộ chọn], kd: [[thuộc tính, giá trị]], dk: [điều kiện @ đang bao] }
const tach = (s, dk) => {
  let i = 0;
  while (i < s.length) {
    const mo = s.indexOf("{", i);
    if (mo < 0) break;
    const dau = s.slice(i, mo).trim();
    let sau = 1, j = mo + 1;
    for (; j < s.length && sau > 0; j++) { if (s[j] === "{") sau++; else if (s[j] === "}") sau--; }
    const than = s.slice(mo + 1, j - 1);
    if (dau.startsWith("@")) { if (/^@(media|supports|container|layer)/.test(dau)) tach(than, [...dk, dau]); /* @keyframes, @font-face: bỏ */ }
    else luat.push({ bo: dau.split(",").map((x) => x.trim()).filter(Boolean), kd: than.split(";").map((x) => { const k = x.indexOf(":"); return k < 0 ? null : [x.slice(0, k).trim().toLowerCase(), x.slice(k + 1).trim()]; }).filter((x) => x && x[0]), dk });
    i = j;
  }
};
tach(sach, []);
const dem = (ds) => { const m = new Map(); for (const x of ds) m.set(x, (m.get(x) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
const moiKd = luat.flatMap((l) => l.kd.map(([p, v]) => ({ p, v, l })));
const cua = (...ps) => moiKd.filter((x) => ps.includes(x.p));

// 1. Bề rộng
const RONG = ["width", "max-width", "min-width", "flex-basis", "inline-size", "max-inline-size", "min-inline-size"];
const kdRong = cua(...RONG).filter((x) => !/^(100%|auto|none|0|inherit|initial|unset|fit-content|max-content|min-content)$/.test(x.v) && !x.p.startsWith("--"));
const cot = cua("grid-template-columns");
// 2. Mốc khổ
const dkMedia = dem(luat.flatMap((l) => l.dk.filter((d) => d.startsWith("@media"))));
const moc = dem([...css.matchAll(/@media[^{]*?\((min|max)-width:\s*([0-9.]+)(px|em|rem)\)/g)].map((m) => `${m[1]} ${m[2]}${m[3]}`));
// Mốc chuẩn hoá: «max N» và «min N+1» là cùng một mốc (bố cục đổi tại N+1).
const mocChuan = dem([...css.matchAll(/@media[^{]*?\((min|max)-width:\s*([0-9.]+)px\)/g)].map((m) => (m[1] === "max" ? Number(m[2]) + 1 : Number(m[2])))).sort((a, b) => a[0] - b[0]);
// 3. Khoảng cách, bo góc, bóng, cỡ chữ
const KC = ["padding", "padding-top", "padding-right", "padding-bottom", "padding-left", "padding-inline", "padding-block", "margin", "margin-top", "margin-right", "margin-bottom", "margin-left", "margin-inline", "margin-block", "gap", "row-gap", "column-gap"];
const kdKc = cua(...KC);
const boGoc = cua("border-radius"), bong = cua("box-shadow"), coChu = cua("font-size"), damChu = cua("font-weight");
// 4. Token ở :root
const token = new Map();
for (const l of luat) if (l.bo.some((b) => b === ":root")) for (const [p, v] of l.kd) if (p.startsWith("--")) token.set(p, v);
const dungToken = dem([...sach.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
const soLanDung = new Map(dungToken);
const nhomToken = dem([...token.keys()].map((t) => t.match(/^--([a-z]+)/)?.[1] ?? "?"));
const tokenRong = [...token.keys()].filter((t) => /^--w-/.test(t));
const tokenRongMotLan = tokenRong.filter((t) => (soLanDung.get(t) ?? 0) <= 1);
// 5. Họ lớp: tiền tố trước dấu gạch đầu tiên
const V2 = new Set(["nut", "o", "nhan", "vien", "huy-hieu", "the", "dong", "bang", "tab-phu", "bo-qua", "chan-dinh", "rong", "trang-thai", "trang-thai-phu", "trang-thai-xuong", "vong", "xuong", "dai", "toast", "toast-hoan-tac"]);
const lopTrongBo = (b) => [...b.matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)].map((m) => m[1]);
const moiLop = new Set(luat.flatMap((l) => l.bo.flatMap(lopTrongBo)));
const hoCua = (c) => (V2.has(c) ? "(bộ chung v2)" : c.includes("-") ? c.slice(0, c.indexOf("-")) : c);
const luatTheoHo = dem(luat.map((l) => { const c = lopTrongBo(l.bo[0]); return c.length ? hoCua(c[0]) : "(không lớp: thẻ, thuộc tính)"; }));
const luatV2 = luat.filter((l) => l.bo.some((b) => lopTrongBo(b).some((c) => V2.has(c)))).length;
// 6. Luật bó bề rộng riêng cho từng trang / từng khối
const trangRieng = luat.filter((l) => l.bo.some((b) => /^(body\[data-(trang|khuon)|body\.[\w-]+ main|main\.[\w-]+)/.test(b)));
const boRongRieng = luat.filter((l) => l.kd.some(([p, v]) => p === "max-width" && !/^(100%|none)$/.test(v)));

// ---- web/*.ts: lớp nào được dựng ----
const tepWeb = readdirSync("web").filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".d.ts"));
const lopWeb = new Map(); // lớp → tập tệp dùng
for (const f of tepWeb) {
  const s = readFileSync(join("web", f), "utf8");
  const chuoi = [...s.matchAll(/class(?:Name)?:\s*(?:"([^"]*)"|`([^`]*)`|'([^']*)')/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  const them = [...s.matchAll(/classList\.(?:add|toggle|remove)\(\s*"([^"]+)"/g)].map((m) => m[1]);
  for (const c of [...chuoi, ...them].flatMap((x) => x.replace(/\$\{[^}]*\}/g, " ").split(/\s+/)).filter((x) => /^[a-zA-Z_][\w-]*$/.test(x))) { if (!lopWeb.has(c)) lopWeb.set(c, new Set()); lopWeb.get(c).add(f); }
}
const soTep = (c) => lopWeb.get(c)?.size ?? 0;
const capCu = [["nut (bộ v2)", "btn (cũ)"], ["the (bộ v2)", "card (cũ)"], ["huy-hieu (bộ v2)", "badge (cũ)"], ["bang (bộ v2)", "table / data-table (cũ)"], ["o (bộ v2)", "field (cũ)"], ["dong (bộ v2)", "row (cũ)"]];
const soTepHo = (re) => new Set([...lopWeb.entries()].filter(([c]) => re.test(c)).flatMap(([, s]) => [...s])).size;
const lopMotTep = [...lopWeb.entries()].filter(([, s]) => s.size === 1).length;
const styleNoiTuyen = tepWeb.map((f) => [f, (readFileSync(join("web", f), "utf8").match(/\.style\.[a-zA-Z]+\s*=|style:\s*["`{]/g) ?? []).length]).filter(([, n]) => n > 0);

const kq = {
  css: { byte: css.length, dong: css.split("\n").length, luat: luat.length, boChon: luat.reduce((a, l) => a + l.bo.length, 0), khaiBao: moiKd.length, lopKhacNhau: moiLop.size },
  beRong: { khaiBao: kdRong.length, giaTriKhacNhau: new Set(kdRong.map((x) => x.v)).size, bangToken: kdRong.filter((x) => /var\(--/.test(x.v)).length, soCung: kdRong.filter((x) => !/var\(--/.test(x.v)).length, nhieuNhat: dem(kdRong.map((x) => x.v)).slice(0, 25), maxWidthRieng: boRongRieng.length, maxWidthGiaTri: dem(boRongRieng.flatMap((l) => l.kd.filter(([p]) => p === "max-width").map(([, v]) => v))).length },
  chiaCot: { khaiBao: cot.length, cachKhacNhau: new Set(cot.map((x) => x.v)).size, nhieuNhat: dem(cot.map((x) => x.v)).slice(0, 20) },
  mocKho: { dieuKienMedia: dkMedia.length, moc: moc, mocChuan },
  khoangCach: { khaiBao: kdKc.length, giaTriKhacNhau: new Set(kdKc.map((x) => x.v)).size, coSoCung: kdKc.filter((x) => /\d(px|rem|em)\b/.test(x.v.replace(/var\([^)]*\)/g, "")) && !/^0(px)?$/.test(x.v)).length },
  boGoc: { khaiBao: boGoc.length, giaTri: dem(boGoc.map((x) => x.v)).slice(0, 20), khacNhau: new Set(boGoc.map((x) => x.v)).size },
  bong: { khaiBao: bong.length, khacNhau: new Set(bong.map((x) => x.v)).size },
  coChu: { khaiBao: coChu.length, khacNhau: new Set(coChu.map((x) => x.v)).size, giaTri: dem(coChu.map((x) => x.v)).slice(0, 30) },
  damChu: { khacNhau: new Set(damChu.map((x) => x.v)).size, giaTri: dem(damChu.map((x) => x.v)) },
  token: { tong: token.size, theoNhom: nhomToken.slice(0, 20), beRong: tokenRong.length, beRongDungToiDaMotLan: tokenRongMotLan.length },
  hoLop: { soHo: luatTheoHo.length, luatBoChungV2: luatV2, nhieuNhat: luatTheoHo.slice(0, 45) },
  trangRieng: { luat: trangRieng.length },
  web: { tep: tepWeb.length, lopKhacNhau: lopWeb.size, lopChiMotTepDung: lopMotTep, capCuMoi: Object.fromEntries(capCu.map(([m, c]) => [m + " / " + c, [soTep(m.split(" ")[0]), c.startsWith("table") ? soTepHo(/^(data-table|table)$/) : soTep(c.split(" ")[0])]])), tepDungHoBtn: soTepHo(/^btn(-|$)/), tepDungNut: soTep("nut"), tepDungCard: soTepHo(/^card(-|$)/), tepDungThe: soTep("the"), tepCoStyleNoiTuyen: styleNoiTuyen.length, styleNoiTuyen: styleNoiTuyen.sort((a, b) => b[1] - a[1]).slice(0, 15) },
};
mkdirSync(join(ra, "so-do"), { recursive: true });
writeFileSync(join(ra, "so-do", "kiem-ke-ma.json"), JSON.stringify(kq, null, 1));
console.log(JSON.stringify(kq, null, 1));
