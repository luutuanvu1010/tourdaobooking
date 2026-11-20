// Máy đo giao diện: chụp từng màn cuộn và chấm các tiêu chí máy đo (TIEU_CHI_MAY) cho từng ô = bộ quyền × trang × khổ, trên bản thử tạm (D1 tạm + wrangler dev + Chrome ẩn).
// Chạy từ GỐC kho:
//   node scripts/giao-dien/do-man.mjs --o <BỘ:/trang>[,<BỘ:/trang>…] [--kho 390,1280] [--tiem <tệp.js>] [--ra <thư mục ngoài kho>] [--khong-axe] [--han-phut N]
// Ghi ra thư mục tạm NGOÀI kho: anh/*.jpg, so-do.json, tom-tat.md. Mã thoát: 0 = đạt hết; 1 = có tiêu chí không đạt; 2 = không chạy được hoặc ĐO THIẾU (không bao giờ ghi là đạt).
// Tài liệu tiêu chí: docs/TIEU-CHI-GIAO-DIEN.md. Ảnh và số đo không bao giờ vào kho (kho công khai).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TIEU_CHI_MAY, chamMay, tongKet } from "./cham-may.mjs";
import { dangNhap, sleep } from "./cdp.mjs";
import { phanTichThamSo, timAxe } from "./tham-so.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const loiThoat = (cau) => { console.error(cau); process.exit(2); };

let tham, axeDuong;
try {
  tham = phanTichThamSo(process.argv.slice(2), { goc: process.cwd() });
  axeDuong = timAxe({ env: process.env, tonTai: existsSync, goc: process.cwd() });
} catch (e) { loiThoat(`${e.message}\nDùng: node scripts/giao-dien/do-man.mjs --o <BỘ:/trang>[,…] [--kho 390,1280] [--tiem <tệp.js>] [--ra <thư mục>] [--khong-axe] [--han-phut N]`); }
if (axeDuong === null && !tham.khongAxe) {
  loiThoat("Thiếu công cụ kiểm tương phản axe-core. Chạy `npm ci`, hoặc đặt AXE_JS=<đường dẫn axe.min.js>. Muốn đo các tiêu chí khác: thêm --khong-axe (kết quả khi đó là ĐO THIẾU, không được coi là đạt).");
}
const dungAxe = !tham.khongAxe && axeDuong !== null;
const AXE = dungAxe ? readFileSync(axeDuong, "utf8") : null;
let TIEM = null;
if (tham.tiem) { if (!existsSync(tham.tiem)) loiThoat(`--tiem: không thấy tệp ${tham.tiem}`); TIEM = readFileSync(tham.tiem, "utf8"); }

const doTep = (t) => readFileSync(join(HERE, "trong-trang", t), "utf8");
const DO_CO_BAN = doTep("do-co-ban.js"), DO_THEM = doTep("do-them.js"), DO_LOI_HT = doTep("do-loi-hien-thi.js");
const KHO = { 390: { w: 390, h: 844, mobile: true, may: "iphone" }, 1280: { w: 1280, h: 800, mobile: false, may: "may-tinh" } };
const VAI_TUONG_TAC = new Set(["button", "link", "textbox", "searchbox", "combobox", "checkbox", "radio", "tab", "menuitem", "switch", "spinbutton", "listbox", "slider", "option", "menuitemcheckbox", "menuitemradio"]);
const tenTrang = (p) => (p === "/" ? "trang-chu" : p.slice(1).replace(/[^a-z0-9-]/gi, "_"));
const git = (...a) => { try { return execFileSync("git", a, { encoding: "utf8" }).trim(); } catch { return null; } };
const HAN_O_MS = 90_000;
const conHan = (p, ms, viec) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`hết giờ (${ms / 1000} s): ${viec}`)), ms))]);

const ra = tham.ra ?? mkdtempSync(join(tmpdir(), "tourdao-do-man-"));
const anhDir = join(ra, "anh");
mkdirSync(anhDir, { recursive: true });
const bat = new Date();
const cacO = [];
let moi = null, loiChung = null;

async function doMotO(ngan, base, id, { bo, trang }, k) {
  const kho = KHO[k];
  const o = { bo, trang, kho: k, may: kho.may, mobile: kho.mobile, url: null, ghiChu: null, do: null, them: null, loiHt: null, axe: null, t15: null, anh: [], loiTrang: [], giay: 0 };
  const t0 = Date.now();
  try {
    let duoi = "";
    if (trang === "/order") {
      const donId = id.orderTheoBo?.[bo] ?? id.order;
      if (!donId) throw new Error("không có đơn nào để mở /order (gieo dữ liệu không dựng được đơn — xem loiGieo)");
      duoi = `?id=${donId}`;
    }
    await ngan.khung(kho.w, kho.h, kho.mobile, 1, kho.may);
    await ngan.di(base + trang + duoi);
    await sleep(700);
    if (TIEM) { await ngan.ev(`(async () => {\n${TIEM}\n})()`); await sleep(400); }
    const cuoi = await ngan.ev("location.pathname + location.search");
    o.url = String(cuoi).replace(/id=[^&]+/, "id=…");
    if (/^\/login/.test(cuoi) && trang !== "/login") throw new Error(`bị chuyển về trang đăng nhập (đang ở ${o.url}): phiên không vào được trang này`);
    if (String(cuoi).split("?")[0] !== trang) o.ghiChu = `trang tự chuyển sang ${o.url}`;
    await ngan.ev(`window.__UX_MOBILE = ${kho.mobile}; 0`);
    o.do = await ngan.ev(DO_CO_BAN);
    o.loiHt = await ngan.ev(DO_LOI_HT);
    o.them = await ngan.ev(DO_THEM);
    if (AXE) {
      await ngan.ev(AXE + ";0");
      o.axe = await ngan.ev(`axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] }).then((r) => r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, vd: v.nodes.slice(0, 3).map((x) => x.target.join(" ")) })))`);
    }
    // T15 — tên truy cập do Chrome tính (cây trợ năng), không cần axe
    const nodes = await ngan.cayTroNang();
    const tuongTac = nodes.filter((n) => !n.ignored && VAI_TUONG_TAC.has(n.role?.value));
    const khongTen = tuongTac.filter((n) => !String(n.name?.value ?? "").trim());
    o.t15 = { soTuongTac: tuongTac.length, soKhongTen: khongTen.length, mota: [] };
    for (const n of khongTen.slice(0, 8)) {
      const r = await ngan.s("DOM.describeNode", { backendNodeId: n.backendDOMNodeId }).catch(() => null);
      const nd = r?.result?.node; if (!nd) continue;
      const at = {}; for (let i = 0; i < (nd.attributes ?? []).length; i += 2) at[nd.attributes[i]] = nd.attributes[i + 1];
      o.t15.mota.push(`${n.role?.value}:${nd.localName}${at.id ? "#" + at.id : ""}${at.class ? "." + at.class.split(/\s+/).slice(0, 2).join(".") : ""}`);
    }
    await ngan.ev("scrollTo(0,0);0");
    o.anh = await ngan.chupTungMan(anhDir, `${bo}-${tenTrang(trang)}-${k}`);
    o.loiTrang = [...ngan.loi].slice(0, 5);
    o.cham = chamMay(o);
  } catch (e) {
    o.loi = String(e?.message ?? e).slice(0, 500);
  }
  o.giay = +((Date.now() - t0) / 1000).toFixed(1);
  return o;
}

try {
  moi = await (await import("./moi-truong.mjs")).dungMoiTruong({ bo: tham.o.map((x) => x.bo), hanPhut: tham.hanPhut });
  const ngans = new Map();
  for (const { bo, trang } of tham.o) {
    let ngan = ngans.get(bo);
    if (!ngan) {
      ngan = await moi.chrome.moNgan();
      if (bo !== "KHACH") await ngan.cookie(await dangNhap(moi.base, moi.taiKhoan[bo].phone, moi.taiKhoan[bo].pin), moi.base);
      ngans.set(bo, ngan);
    }
    for (const k of tham.kho) {
      const o = await conHan(doMotO(ngan, moi.base, moi.id, { bo, trang }, k), HAN_O_MS, `${bo}:${trang} @${k}`).catch((e) => ({ bo, trang, kho: k, loi: String(e.message), anh: [], giay: HAN_O_MS / 1000 }));
      cacO.push(o);
      console.error(`${o.loi ? "✗" : "✓"} ${bo}:${trang} @${k} (${o.giay} s)${o.loi ? " — " + o.loi : ""}`);
    }
  }
  for (const ngan of ngans.values()) await ngan.dong().catch(() => {});
} catch (e) {
  loiChung = String(e?.message ?? e);
  console.error(`Không chạy được: ${loiChung}`);
} finally {
  await moi?.dung();
}

// ---- tổng kết
const tk = tongKet(cacO);
let maThoat = tk.maThoat;
if (loiChung || tham.khongAxe || !dungAxe || cacO.length === 0) maThoat = 2;
const lyDoThieu = [];
if (loiChung) lyDoThieu.push(`không chạy được: ${loiChung}`);
if (tham.khongAxe) lyDoThieu.push("chạy với --khong-axe nên T8 chưa đo");
if (tk.soOLoi) lyDoThieu.push(`${tk.soOLoi} ô hỏng`);
if (tk.soChuaDo && !tham.khongAxe) lyDoThieu.push(`${tk.soChuaDo} tiêu chí chưa đo`);
else if (tk.soChuaDo) lyDoThieu.push(`${tk.soChuaDo} chỗ chưa đo`);
if (cacO.length === 0 && !loiChung) lyDoThieu.push("không có ô nào được đo");
if (maThoat === 2 && tk.soKhongDat) lyDoThieu.push(`đồng thời ${tk.maKhongDat.length} tiêu chí không đạt (${tk.maKhongDat.join(", ")})`);
const dongDau = maThoat === 0 ? "KẾT QUẢ MÁY ĐO: đạt"
  : maThoat === 1 ? `KẾT QUẢ MÁY ĐO: có vi phạm (${tk.maKhongDat.length} tiêu chí không đạt)`
  : `KẾT QUẢ MÁY ĐO: ĐO THIẾU — không được coi là đạt (${lyDoThieu.join("; ") || "không rõ lý do"})`;

const NHAN = { dat: "đạt", "khong-dat": "không đạt", "chua-do": "chưa đo", "khong-ap-dung": "không áp dụng" };
const o2 = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const tenTieuChi = Object.fromEntries(TIEU_CHI_MAY.map((t) => [t.ma, t.ten]));
const sachChua = (git("status", "--porcelain") ?? "").length === 0;
const md = [dongDau, "",
  `- Mã lần lưu: ${git("rev-parse", "--short", "HEAD") ?? "(không đọc được)"}; cây làm việc ${sachChua ? "sạch" : "CÓ phần chưa lưu"}.`,
  `- Giờ chạy: ${bat.toISOString()} (UTC); mất ${Math.round((Date.now() - bat.getTime()) / 1000)} giây.`,
  `- Tiêm lỗi (--tiem): ${tham.tiem ? "CÓ, tệp " + basename(tham.tiem) : "không"}.`,
  `- Công cụ axe: ${dungAxe ? axeDuong : "KHÔNG dùng"}.`,
  `- Thư mục kết quả: ${ra}`,
  `- Lỗi gieo dữ liệu: ${moi?.loiGieo?.length ? "" : "không"}`,
  ...(moi?.loiGieo ?? []).map((l) => `  - ${l.viec}${l.status ? ` (${l.status})` : ""}: ${o2(l.loi)}`),
  `- Bộ quyền tạo được tài khoản thử: ${moi?.boChayDuoc?.join(", ") || "(không)"}.`, ""];
for (const o of cacO) {
  md.push(`## ${o.bo}:${o.trang} @${o.kho}`, "");
  if (o.loi) { md.push(`Ô HỎNG: ${o2(o.loi)}`, ""); continue; }
  if (o.ghiChu) md.push(`Ghi chú: ${o2(o.ghiChu)}`, "");
  if (o.loiTrang?.length) md.push(`Lỗi chạy trong trang: ${o2(o.loiTrang.join(" / "))}`, "");
  md.push("| Mã | Tiêu chí | Kết quả | Số chỗ | Ví dụ |", "|---|---|---|---|---|");
  for (const c of o.cham) md.push(`| ${c.ma} | ${o2(tenTieuChi[c.ma])} | ${NHAN[c.ketQua]} | ${c.so}${c.soCatChuPhu ? ` (+${c.soCatChuPhu} cắt chữ khác)` : ""} | ${o2(c.viDu.join(" ; "))} |`);
  md.push("", "Ảnh:", ...o.anh.map((a) => `- ${a}`), "");
}
writeFileSync(join(ra, "tom-tat.md"), md.join("\n"));
writeFileSync(join(ra, "so-do.json"), JSON.stringify({ luc: bat.toISOString(), maThoat, dongDau, tongKet: tk, thamSo: { ...tham, tiem: tham.tiem ? basename(tham.tiem) : null }, loiChung, loiGieo: moi?.loiGieo ?? [], boChayDuoc: moi?.boChayDuoc ?? [], o: cacO }, null, 1));
console.log(ra);
console.log(dongDau);
process.exit(maThoat);
