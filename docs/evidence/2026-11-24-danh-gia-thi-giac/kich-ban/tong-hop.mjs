// Gom số đo thị giác của mọi ô (so-do/<tên bộ>/*.json do chup.mjs ghi) thành MỘT tệp số liệu máy sinh: so-lieu-may.md và so-lieu-may.json (ngoài kho).
// Con số ở đây là bằng chứng cho nhận định, không phải kết luận. Chạy từ GỐC kho, sau chup.mjs và doc-token.mjs:
//   node docs/evidence/2026-11-24-danh-gia-thi-giac/kich-ban/tong-hop.mjs [--ra ~/tourdao-thi-giac-2026-11-24] [--ten-bo hien-tai]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const lay = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const ra = resolve((lay("--ra") ?? join(homedir(), "tourdao-thi-giac-2026-11-24")).replace(/^~/, homedir()));
const tenBo = lay("--ten-bo") ?? "hien-tai";
const dir = join(ra, "so-do", tenBo);
const o = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => ({ tep: f, ...JSON.parse(readFileSync(join(dir, f), "utf8")) })).filter((x) => x.do);
const token = JSON.parse(readFileSync(join(ra, "so-do", "token.json"), "utf8"));
const rgbHex = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c ?? ""); if (!m) return null; const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); const a = p.length > 3 ? p[3] : 1; return "#" + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("") + (a < 0.995 ? `@${Math.round(a * 100)}` : ""); };
const mauToken = new Map(); // hex → [tên token]
for (const t of token.token) if (t.loai === "mau") { const h = rgbHex(t.mau); if (!h) continue; (mauToken.get(h) ?? mauToken.set(h, []).get(h)).push(t.ten); }

const RONG = [...new Set(o.map((x) => x.rong))].sort((a, b) => a - b);
const MAN = new Set(o.map((x) => x.so));
// gom một trường kiểu { giá trị: { n, ky } } qua mọi ô (lọc theo điều kiện), trả [{ k, n, ky, soMan }] xếp theo n giảm
function gom(truong, loc = () => true, lay2 = (d) => d[truong]) {
  const m = new Map();
  for (const x of o.filter(loc)) for (const [k, v] of Object.entries(lay2(x.do) ?? {})) { const y = m.get(k) ?? { k, n: 0, ky: 0, man: new Set() }; y.n += v.n; y.ky += v.ky ?? 0; y.man.add(x.so); m.set(k, y); }
  return [...m.values()].map((y) => ({ k: y.k, n: y.n, ky: y.ky, soMan: y.man.size })).sort((a, b) => b.n - a.n);
}
const gomVung = (truong, vung, loc = () => true) => gom(truong, loc, (d) => d[truong]?.[vung]);
const dt = (x) => x.rong < 641, mt = (x) => x.rong === 1280;
const so = (n) => n.toLocaleString("vi-VN");
const pt = (a, b) => (b ? ((a / b) * 100).toFixed(1).replace(".", ",") + " %" : "—");
const bang = (dau, dong) => [`| ${dau.join(" | ")} |`, `|${dau.map(() => "---").join("|")}|`, ...dong.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const top = (ds, n = 12) => ds.slice(0, n);
const md = [];
const them = (...s) => md.push(...s, "");

them(`# Số liệu máy đếm — đánh giá thị giác 24/11/2026`, `> Máy sinh bằng \`tong-hop.mjs\` từ ${o.length} ô đo (${MAN.size} màn × bề rộng ${RONG.join(", ")}), bộ «${tenBo}». Mỗi ô là một màn vừa tải, chưa bấm gì. «Phần tử» là phần tử đang hiện; «ký tự» là số ký tự chữ nằm trực tiếp trong phần tử đó.`, `> Tệp giao diện công ty lúc đo: \`${token.giaoDien.trim()}\``);

// ---- 1. Token
const T = token.token;
const nhom = (re) => T.filter((t) => re.test(t.ten));
const tMau = T.filter((t) => t.loai === "mau");
them(`## 1. Token khai ở gốc`, bang(["Nhóm", "Số token", "Số giá trị khác nhau"], [
  ["Tất cả", so(T.length), "—"],
  ["Màu", so(tMau.length), so(new Set(tMau.map((t) => rgbHex(t.mau))).size)],
  ["Cỡ chữ (--fs-*)", so(nhom(/^--fs-/).length), so(new Set(nhom(/^--fs-/).map((t) => t.px)).size)],
  ["Độ đậm (--fw-*)", so(nhom(/^--fw-/).length), so(new Set(nhom(/^--fw-/).map((t) => t.tho)).size) + ` (${[...new Set(nhom(/^--fw-/).map((t) => t.tho))].join(", ")})`],
  ["Bo góc (--radius-*, --r-*, --kg-bo*)", so(nhom(/radius|^--r-|^--kg-bo/).length), so(new Set(nhom(/radius|^--r-|^--kg-bo/).map((t) => t.tho)).size)],
  ["Bóng (--shadow-*)", so(nhom(/shadow/).length), so(new Set(nhom(/shadow/).map((t) => t.tho)).size)],
  ["Bề rộng (--w-*)", so(nhom(/^--w-/).length), so(new Set(nhom(/^--w-/).map((t) => t.tho)).size)],
  ["Chiều cao (--h-*)", so(nhom(/^--h-/).length), so(new Set(nhom(/^--h-/).map((t) => t.tho)).size)],
  ["Thang khoảng cách (--s1…--s7)", so(nhom(/^--s\d$/).length), nhom(/^--s\d$/).map((t) => t.tho).join(", ")],
  ["Thời lượng chuyển động (--m-*)", so(nhom(/^--m-/).length), nhom(/^--m-/).map((t) => t.tho).join(", ")],
]));

// ---- 2. Màu
const mauChu = gom("mauChu"), mauNen = gom("mauNen"), mauVien = gom("mauVien");
const tatCaMau = new Set([...mauChu, ...mauNen, ...mauVien].map((x) => x.k).filter((k) => k.startsWith("#")));
const khongToken = [...tatCaMau].filter((k) => !mauToken.has(k));
const dongMau = (ds, n) => top(ds, n).map((x) => [`\`${x.k}\``, so(x.n), so(x.soMan), (mauToken.get(x.k) ?? []).slice(0, 3).join(", ") || "**không khớp token nào**"]);
them(`## 2. Màu thật sự hiện trên màn`,
  `Tổng số màu khác nhau đang hiện (chữ, nền, viền, mọi ô): **${tatCaMau.size}**; trong đó **${khongToken.length}** màu không trùng giá trị token màu nào (thường là màu có độ trong suốt hoặc màu tính ra từ phép trộn). Token màu: ${tMau.length} tên, ${new Set(tMau.map((t) => rgbHex(t.mau))).size} giá trị.`,
  `### Màu chữ (${mauChu.length} màu)`, bang(["Màu", "Số phần tử", "Số màn có", "Token trùng giá trị"], dongMau(mauChu, 20)),
  `### Màu nền (${mauNen.length} màu)`, bang(["Màu", "Số phần tử", "Số màn có", "Token trùng giá trị"], dongMau(mauNen, 28)),
  `### Màu viền (${mauVien.length} màu)`, bang(["Màu", "Số phần tử", "Số màn có", "Token trùng giá trị"], dongMau(mauVien, 16)));
const soMauMoiMan = o.filter(mt).map((x) => ({ x, n: new Set([...Object.keys(x.do.mauChu), ...Object.keys(x.do.mauNen), ...Object.keys(x.do.mauVien)]).size })).sort((a, b) => b.n - a.n);
const tb = (a) => (a.reduce((s, v) => s + v, 0) / (a.length || 1));
them(`Số màu khác nhau trên MỘT màn (máy tính 1.280): trung bình ${tb(soMauMoiMan.map((y) => y.n)).toFixed(1).replace(".", ",")}; nhiều nhất ${soMauMoiMan.slice(0, 5).map((y) => `${y.x.bo}:${y.x.trang.split("?")[0]} (${y.n})`).join(", ")}; ít nhất ${soMauMoiMan.slice(-3).map((y) => `${y.x.bo}:${y.x.trang.split("?")[0]} (${y.n})`).join(", ")}.`);

// ---- 3. Chữ
const coChu = gom("coChu").sort((a, b) => +a.k - +b.k), doDam = gom("doDam"), phong = gom("phong"), gianDong = gom("gianDong");
const tongKy = coChu.reduce((s, x) => s + x.ky, 0);
them(`## 3. Chữ`,
  `### Cỡ chữ đang hiện (${coChu.length} cỡ)`, bang(["Cỡ (px)", "Số phần tử", "Phần ký tự", "Số màn có"], coChu.map((x) => [x.k, so(x.n), pt(x.ky, tongKy), so(x.soMan)])),
  `### Độ đậm đang hiện (${doDam.length} mức)`, bang(["Độ đậm", "Số phần tử", "Phần ký tự", "Số màn có"], doDam.map((x) => [x.k, so(x.n), pt(x.ky, tongKy), so(x.soMan)])),
  `### Phông`, bang(["Phông (đầu chồng)", "Số phần tử", "Số màn có"], phong.map((x) => [x.k, so(x.n), so(x.soMan)])),
  `### Giãn dòng (chiều cao dòng chia cỡ chữ)`, bang(["Tỉ lệ", "Số phần tử", "Phần ký tự"], top(gianDong, 10).map((x) => [x.k, so(x.n), pt(x.ky, tongKy)])));
const capChu = (loc) => { const m = new Map(); for (const x of o.filter(loc)) for (const v of Object.values(x.do.coChuTheoVung ?? {})) for (const [k, y] of Object.entries(v)) { const z = m.get(k) ?? { k, n: 0, man: new Set() }; z.n += y.n; z.man.add(x.so); m.set(k, z); } return [...m.values()].sort((a, b) => b.n - a.n); };
const capMt = capChu(mt), capDt = capChu(dt);
them(`Số cặp «cỡ/độ đậm» khác nhau: máy tính 1.280 có **${capMt.length}**, điện thoại 390 có **${capDt.length}**. Mười cặp dùng nhiều nhất ở điện thoại: ${top(capDt, 10).map((x) => `${x.k} (${so(x.n)})`).join(", ")}.`);
const coMoiMan = (loc) => o.filter(loc).map((x) => Object.keys(x.do.coChu).length);
them(`Số cỡ chữ trên MỘT màn: điện thoại trung bình ${tb(coMoiMan(dt)).toFixed(1).replace(".", ",")} (nhiều nhất ${Math.max(...coMoiMan(dt))}); máy tính trung bình ${tb(coMoiMan(mt)).toFixed(1).replace(".", ",")} (nhiều nhất ${Math.max(...coMoiMan(mt))}).`);
const h1 = o.filter((x) => x.do.tieuDeTrang?.hien);
const h1Co = new Map(); for (const x of h1) { const k = `${x.rong}: ${x.do.tieuDeTrang.co}/${x.do.tieuDeTrang.dam}`; h1Co.set(k, (h1Co.get(k) ?? 0) + 1); }
them(`Tiêu đề trang (h1 đang hiện) theo «bề rộng: cỡ/độ đậm» → số ô: ${[...h1Co].sort().map(([k, n]) => `${k} → ${n}`).join("; ")}. Ô không hiện h1: ${o.length - h1.length}.`);
const tien = gom("tien");
them(`### Cách viết số tiền (${tien.length} kiểu: cỡ/độ đậm, màu, kiểu số, căn lề)`, bang(["Kiểu", "Số phần tử", "Số màn có"], top(tien, 16).map((x) => [x.k, so(x.n), so(x.soMan)])));
them(`Chữ viết HOA bằng kiểu: ${so(o.reduce((s, x) => s + x.do.vietHoa, 0))} phần tử qua mọi ô. Giãn chữ khác mặc định: ${gom("gianChu").map((x) => `${x.k} (${so(x.n)})`).join(", ") || "không"}.`);

// ---- 4. Hình khối
const boGoc = gom("boGoc"), beVien = gom("beVien"), bong = gom("bong");
them(`## 4. Hình khối và chiều sâu`,
  `### Bo góc (${boGoc.length} kiểu)`, bang(["Bo góc (px)", "Số phần tử", "Số màn có"], top(boGoc, 20).map((x) => [x.k, so(x.n), so(x.soMan)])),
  `### Bề dày viền`, bang(["Bề dày (px)", "Số phần tử", "Số màn có"], beVien.map((x) => [x.k, so(x.n), so(x.soMan)])),
  `### Bóng (${bong.length} kiểu)`, bang(["Bóng", "Số phần tử", "Số màn có"], top(bong, 22).map((x) => [`\`${x.k.slice(0, 110)}\``, so(x.n), so(x.soMan)])));

// ---- 5. Khoảng cách
const kc = gom("khoangCach"), nt = gom("ngoaiThang");
const tongKc = kc.reduce((s, x) => s + x.n, 0), tongNt = nt.reduce((s, x) => s + x.n, 0);
them(`## 5. Khoảng cách`, `Thang của khung gốc: 4, 8, 12, 16, 24, 32, 48. Trong ${so(tongKc)} giá trị đệm, lề, khe khác 0 đang hiện, **${so(tongNt)} (${pt(tongNt, tongKc)})** nằm ngoài thang; số giá trị khác nhau: ${kc.length}, ngoài thang ${nt.length}.`,
  bang(["Giá trị ngoài thang (px)", "Số lần", "Số màn có"], top(nt, 18).map((x) => [x.k, so(x.n), so(x.soMan)])));
const ntTheoHo = new Map(); for (const x of o) { const a = Object.values(x.do.khoangCach).reduce((s, v) => s + v.n, 0), b = Object.values(x.do.ngoaiThang).reduce((s, v) => s + v.n, 0); const y = ntTheoHo.get(x.ho) ?? { a: 0, b: 0 }; y.a += a; y.b += b; ntTheoHo.set(x.ho, y); }
them(bang(["Họ màn", "Phần khoảng cách ngoài thang"], [...ntTheoHo].map(([h, y]) => [h, pt(y.b, y.a)])));
const kgDung = o.filter((x) => x.do.khungGoc), kgKhong = o.filter((x) => !x.do.khungGoc);
const tiLeNt = (ds) => { let a = 0, b = 0; for (const x of ds) { a += Object.values(x.do.khoangCach).reduce((s, v) => s + v.n, 0); b += Object.values(x.do.ngoaiThang).reduce((s, v) => s + v.n, 0); } return pt(b, a); };
them(`Màn đã khai khuôn của khung gốc: ${new Set(kgDung.map((x) => x.so)).size} màn (${[...new Set(kgDung.map((x) => `${x.trang.split("?")[0]} → ${x.do.khungGoc}`))].join("; ")}); phần khoảng cách ngoài thang ở các màn này ${tiLeNt(kgDung)}, ở các màn chưa khai ${tiLeNt(kgKhong)}.`);

// ---- 6. Thành phần
const nutND = gomVung("nut", "noi-dung"), nutKhung = [...gomVung("nut", "thanh-tren"), ...gomVung("nut", "thanh-ben"), ...gomVung("nut", "thanh-duoi")];
const the = gom("the"), oNhap = gom("oNhap"), huyHieu = gom("huyHieu");
const nutMoiMan = (loc) => o.filter(loc).map((x) => Object.keys(x.do.nut?.["noi-dung"] ?? {}).length);
them(`## 6. Thành phần`,
  `Dáng nút khác nhau trong vùng nội dung (chiều cao, bo góc, nền, màu chữ, cỡ/độ đậm, viền): **${nutND.length}** qua mọi ô; ở khung chung (thanh trên, thanh bên, thanh dưới): ${nutKhung.length}. Trên MỘT màn: điện thoại trung bình ${tb(nutMoiMan(dt)).toFixed(1).replace(".", ",")}, máy tính ${tb(nutMoiMan(mt)).toFixed(1).replace(".", ",")}.`,
  bang(["Dáng nút (vùng nội dung)", "Số phần tử", "Số màn có"], top(nutND, 14).map((x) => [x.k, so(x.n), so(x.soMan)])),
  `Dáng thẻ / khối có nền hoặc viền và bo góc: **${the.length}**.`, bang(["Dáng thẻ", "Số phần tử", "Số màn có"], top(the, 14).map((x) => [x.k, so(x.n), so(x.soMan)])),
  `Dáng ô nhập: **${oNhap.length}**.`, bang(["Dáng ô nhập", "Số phần tử", "Số màn có"], top(oNhap, 10).map((x) => [x.k, so(x.n), so(x.soMan)])),
  `Dáng huy hiệu / nhãn nhỏ có nền: **${huyHieu.length}**.`, bang(["Dáng huy hiệu", "Số phần tử", "Số màn có"], top(huyHieu, 14).map((x) => [x.k, so(x.n), so(x.soMan)])));
const nutChinh = o.filter(mt).map((x) => ({ x, n: x.do.nutChinh.length }));
them(`Nút nền đặc đậm trong vùng nội dung (máy tính 1.280), số nút trên một màn: 0 nút ở ${nutChinh.filter((y) => y.n === 0).length} màn, 1 nút ở ${nutChinh.filter((y) => y.n === 1).length} màn, 2 nút ở ${nutChinh.filter((y) => y.n === 2).length} màn, từ 3 nút ở ${nutChinh.filter((y) => y.n >= 3).length} màn. Màu nền của các nút này: ${(() => { const m = new Map(); for (const y of nutChinh) for (const b of y.x.do.nutChinh) m.set(b.nen, (m.get(b.nen) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `\`${k}\` ${(mauToken.get(k) ?? ["?"])[0]} (${n})`).join(", "); })()}.`);

// ---- 7. Biểu tượng
const bt = gom("bieuTuong"), kh = gom("kyHieuHinh");
them(`## 7. Biểu tượng và hình`, `Kiểu biểu tượng vẽ (cỡ, độ dày nét, đặc hay nét): **${bt.length}**.`, bang(["Kiểu", "Số phần tử", "Số màn có"], top(bt, 14).map((x) => [x.k, so(x.n), so(x.soMan)])),
  `Ký hiệu hình dùng trong chữ (emoji, dấu ✓ ✕ …): ${kh.map((x) => `${x.k} (${so(x.n)} lần, ${x.soMan} màn)`).join(", ") || "không có"}. Ảnh (thẻ img) đang hiện: ${so(o.reduce((s, x) => s + x.do.hinhAnh, 0))} qua mọi ô.`);

// ---- 8. Tương phản, vùng chạm
const tpO = o.filter((x) => x.do.tpDuoi > 0);
const tpCap = new Map(); for (const x of o) for (const m of x.do.tpMau) { const k = `chữ ${m.mauChu} trên nền ${m.nen} (${m.ti}:1, cỡ ${m.co}/${m.dam})`; const y = tpCap.get(k) ?? { k, n: 0, man: new Set(), vd: m.chu, vung: m.vung }; y.n++; y.man.add(x.so); tpCap.set(k, y); }
them(`## 8. Tương phản và vùng chạm`, `Chữ dưới ngưỡng tương phản (4,5:1; chữ lớn 3:1): ${so(o.reduce((s, x) => s + x.do.tpDuoi, 0))} phần tử ở ${tpO.length} trên ${o.length} ô (${new Set(tpO.map((x) => x.so)).size} màn). Phép đo tự tính nền hiệu lực; chữ đè lên ảnh hay nền chuyển màu có thể bị tính sai.`,
  bang(["Cặp màu", "Số mẫu", "Số màn", "Vùng", "Ví dụ chữ"], [...tpCap.values()].sort((a, b) => b.man.size - a.man.size).slice(0, 14).map((y) => [y.k, so(y.n), so(y.man.size), y.vung, y.vd.replace(/\|/g, "/")])));
const chamO = o.filter(dt);
const chamNho = chamO.reduce((s, x) => s + x.do.chamNho, 0), chamTong = chamO.reduce((s, x) => s + x.do.chamTong, 0);
const chamPt = new Map(); for (const x of chamO) for (const m of x.do.chamMau) { const k = `${m.pt} (${m.vung})`; const y = chamPt.get(k) ?? { k, n: 0, man: new Set(), co: `${m.rong}×${m.cao}`, vd: m.chu }; y.n++; y.man.add(x.so); chamPt.set(k, y); }
them(`Vùng chạm nhỏ hơn 44 điểm ở điện thoại: **${so(chamNho)} trên ${so(chamTong)}** phần tử bấm được (${pt(chamNho, chamTong)}), ở ${chamO.filter((x) => x.do.chamNho > 0).length} trên ${chamO.length} màn.`,
  bang(["Phần tử", "Số mẫu", "Số màn", "Cỡ mẫu", "Ví dụ chữ"], [...chamPt.values()].sort((a, b) => b.man.size - a.man.size).slice(0, 16).map((y) => [`\`${y.k}\``, so(y.n), so(y.man.size), y.co, y.vd.replace(/\|/g, "/")])));

// ---- 9. Chuyển động
const cd = gom("chuyenDong");
them(`## 9. Chuyển động`, bang(["Kiểu", "Số phần tử", "Số màn có"], top(cd, 14).map((x) => [x.k, so(x.n), so(x.soMan)])));


// ---- 11. Chữ đậm, màu đỏ, khung chung, màu nút theo động từ, tràn ngang (các phép đo thêm; ô nào thiếu trường thì bỏ qua)
const trungVi = (a) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 0; };
const tiLeDam = (x) => { let d = 0, t = 0, dn = 0, tn = 0; for (const [k, v] of Object.entries(x.do.doDam)) { t += v.ky; tn += v.n; if (+k >= 600) { d += v.ky; dn += v.n; } } return { ky: t ? d / t : 0, pt: tn ? dn / tn : 0 }; };
const damMt = o.filter(mt).map(tiLeDam), damDt = o.filter(dt).map(tiLeDam);
const pc = (v) => (v * 100).toFixed(0) + " %";
const DO = ["#c0392b", "#96271a", "#b01235", "#8e0e2b"];
const doMoiMan = o.filter(dt).map((x) => { const m = new Set(); for (const f of ["mauChu", "mauNen", "mauVien"]) for (const k of Object.keys(x.do[f])) if (DO.includes(k)) m.add(k); return m.size; });
them(`## 11. Phép đo thêm`,
  `**Chữ đậm.** Phần tử chữ ở độ đậm nhấn (600 trở lên), trung vị trên một màn: máy tính ${pc(trungVi(damMt.map((y) => y.pt)))} số phần tử chữ (${pc(trungVi(damMt.map((y) => y.ky)))} số ký tự); điện thoại ${pc(trungVi(damDt.map((y) => y.pt)))} số phần tử chữ (${pc(trungVi(damDt.map((y) => y.ky)))} số ký tự). Số màn điện thoại có từ một nửa số phần tử chữ là chữ đậm: ${damDt.filter((y) => y.pt >= 0.5).length} trên ${damDt.length}.`,
  `**Màu đỏ.** Bốn sắc đỏ đang dùng: san hô \`#c0392b\`, san hô đậm \`#96271a\`, đỏ nguy hiểm \`#b01235\`, đỏ chữ \`#8e0e2b\`. Số sắc đỏ cùng hiện trên một màn điện thoại: 0 sắc ở ${doMoiMan.filter((n) => n === 0).length} màn, 1 sắc ở ${doMoiMan.filter((n) => n === 1).length}, 2 sắc ở ${doMoiMan.filter((n) => n === 2).length}, 3 sắc ở ${doMoiMan.filter((n) => n === 3).length}, cả 4 sắc ở ${doMoiMan.filter((n) => n === 4).length} màn.`);
const kc2 = o.filter((x) => dt(x) && x.do.khungChung);
if (kc2.length) {
  const tl = kc2.map((x) => { const k = x.do.khungChung; return { x, tong: k.thanhTren + k.dai + k.thanhDuoi + k.dinhDay, k }; }).sort((a, b) => b.tong - a.tong);
  them(`**Khung chung ở điện thoại** (thanh trên + dải nhắc + thanh dưới + thanh dính đáy của trang, đo trên khung nhìn 844 lúc trang ở đầu; ${kc2.length} màn): trung vị ${trungVi(tl.map((y) => y.tong))} điểm (${pc(trungVi(tl.map((y) => y.tong)) / 844)}); chiều cao dải nhắc trung vị ${trungVi(tl.map((y) => y.k.dai))}, thanh trên ${trungVi(tl.map((y) => y.k.thanhTren))}, thanh dưới ${trungVi(tl.map((y) => y.k.thanhDuoi))}. Số màn mà khung chung chiếm từ 25 % khung nhìn: ${tl.filter((y) => y.tong / 844 >= 0.25).length}. Nhiều nhất: ${tl.slice(0, 6).map((y) => `${y.x.bo}:${y.x.trang.split("?")[0]} ${y.tong} (${pc(y.tong / 844)}; trên ${y.k.thanhTren}, dải ${y.k.dai}, dưới ${y.k.thanhDuoi}, dính đáy ${y.k.dinhDay})`).join("; ")}.`);
}
const ntc = new Map();
for (const x of o.filter(mt)) for (const [dtu, m] of Object.entries(x.do.nutTheoChu ?? {})) for (const [mau, v] of Object.entries(m)) { const y = ntc.get(dtu) ?? new Map(); const z = y.get(mau) ?? { n: 0, man: new Set() }; z.n += v.n; z.man.add(x.so); y.set(mau, z); ntc.set(dtu, y); }
if (ntc.size) them(`**Cùng một động từ trên nút, đang mang những dáng màu nào** (máy tính 1.280, vùng nội dung; «nền» là nút có nền, «viền» là nút viền, «chỉ chữ» là lối chữ):`, bang(["Chữ mở đầu nút", "Dáng màu → số nút (số màn)"], [...ntc].map(([dtu, m]) => [dtu, [...m].sort((a, b) => b[1].n - a[1].n).map(([mau, z]) => `${mau.replace(/(#[0-9a-f@]+)/, "`$1`")} → ${z.n} (${z.man.size})`).join("; ")])));
const coTran = o.filter((x) => x.do.tranNgang !== undefined);
if (coTran.length) {
  const theoRong = new Map(); for (const x of coTran) { const y = theoRong.get(x.rong) ?? { n: 0, tran: [], bop: [] }; y.n++; if (x.do.tranNgang) y.tran.push(`${x.bo}:${x.trang.split("?")[0]}`); if (x.do.chuBop) y.bop.push(`${x.bo}:${x.trang.split("?")[0]} (${x.do.chuBop})`); theoRong.set(x.rong, y); }
  them(`**Tràn ngang và chữ bị bóp theo bề rộng** (${coTran.length} ô có đo):`, bang(["Bề rộng", "Số màn đo", "Màn tràn ngang", "Màn có chữ bị bóp (số đoạn)"], [...theoRong].sort((a, b) => a[0] - b[0]).map(([r, y]) => [String(r), String(y.n), y.tran.join(", ") || "không", y.bop.join(", ") || "không"])));
}

// ---- 10. Bảng từng màn (máy tính 1.280 và điện thoại)
const dongMan = [...MAN].sort((a, b) => a - b).map((s) => { const a = o.find((x) => x.so === s && x.rong < 641), b = o.find((x) => x.so === s && x.rong === 1280) ?? a; const y = b ?? a; const dem = (x, f) => (x ? Object.keys(x.do[f]).length : "—"); return [String(s), y.bo + (y.tk ? `/${y.tk}` : ""), y.trang.split("?")[0], y.do.khungGoc ?? "—", dem(a, "coChu") + " / " + dem(b, "coChu"), dem(a, "mauChu") + " / " + dem(b, "mauChu"), dem(a, "boGoc") + " / " + dem(b, "boGoc"), (a ? Object.keys(a.do.nut?.["noi-dung"] ?? {}).length : "—") + " / " + (b ? Object.keys(b.do.nut?.["noi-dung"] ?? {}).length : "—"), a ? `${a.do.chamNho}/${a.do.chamTong}` : "—", a ? Math.round(a.do.caoTrang / a.do.cao * 10) / 10 : "—"]; });
them(`## 10. Từng màn (điện thoại 390 / máy tính 1.280)`, bang(["Số", "Bộ quyền", "Trang", "Khuôn đã khai", "Số cỡ chữ", "Số màu chữ", "Số kiểu bo góc", "Số dáng nút", "Vùng chạm nhỏ", "Dài mấy màn (390)"], dongMan));

writeFileSync(join(ra, `so-lieu-may-${tenBo}.md`), md.join("\n"));
writeFileSync(join(ra, `so-lieu-may-${tenBo}.json`), JSON.stringify({ soO: o.length, soMan: MAN.size, rong: RONG, token: { tong: T.length, mau: tMau.length, mauGiaTri: new Set(tMau.map((t) => rgbHex(t.mau))).size }, mau: { tong: tatCaMau.size, khongToken: khongToken.length, chu: mauChu.length, nen: mauNen.length, vien: mauVien.length }, coChu: coChu.map((x) => +x.k), doDam: doDam.map((x) => +x.k), capChu: { mt: capMt.length, dt: capDt.length }, boGoc: boGoc.length, bong: bong.length, khoangCach: { tong: tongKc, ngoaiThang: tongNt, soGiaTri: kc.length }, nut: nutND.length, the: the.length, oNhap: oNhap.length, huyHieu: huyHieu.length, bieuTuong: bt.length, tien: tien.length, cham: { nho: chamNho, tong: chamTong }, tuongPhan: { phanTu: o.reduce((s, x) => s + x.do.tpDuoi, 0), o: tpO.length } }, null, 1));
console.log(`Gom ${o.length} ô, ${MAN.size} màn → ${join(ra, `so-lieu-may-${tenBo}.md`)}`);
