// Lõi đo của máy đo giao diện: đo một danh sách ô trên một môi trường thử đã dựng (moi-truong.mjs) rồi ghi anh/, so-do.json, tom-tat.md.
// Dùng chung cho do-man.mjs (một lệnh một môi trường) và chay-vi-du.mjs (nhiều ca trên MỘT môi trường).
// `anTiem` CHỈ dùng cho bộ ví dụ thử: khi bật, tom-tat.md, so-do.json và stdout không nhắc gì tới việc cấy lỗi, để người chấm không biết màn nào bị cấy.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TIEU_CHI_MAY, chamMay, tongKet } from "./cham-may.mjs";
import { dangNhap, sleep } from "./cdp.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const doTep = (t) => readFileSync(join(HERE, "trong-trang", t), "utf8");
const DO_CO_BAN = doTep("do-co-ban.js"), DO_THEM = doTep("do-them.js"), DO_LOI_HT = doTep("do-loi-hien-thi.js");
export const KHO = { 390: { w: 390, h: 844, mobile: true, may: "iphone" }, 1280: { w: 1280, h: 800, mobile: false, may: "may-tinh" } };
const VAI_TUONG_TAC = new Set(["button", "link", "textbox", "searchbox", "combobox", "checkbox", "radio", "tab", "menuitem", "switch", "spinbutton", "listbox", "slider", "option", "menuitemcheckbox", "menuitemradio"]);
const tenTrang = (p) => (p === "/" ? "trang-chu" : p.slice(1).replace(/[^a-z0-9-]/gi, "_"));
const git = (...a) => { try { return execFileSync("git", a, { encoding: "utf8" }).trim(); } catch { return null; } };
const HAN_O_MS = 90_000;
const conHan = (p, ms, viec) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`hết giờ (${ms / 1000} s): ${viec}`)), ms))]);

async function doMotO(ngan, base, id, { bo, trang }, k, { tiemNoiDung, axeNoiDung, anhDir }) {
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
    if (tiemNoiDung) { await ngan.ev(`(async () => {\n${tiemNoiDung}\n})()`); await sleep(400); }
    const cuoi = await ngan.ev("location.pathname + location.search");
    o.url = String(cuoi).replace(/id=[^&]+/, "id=…");
    if (/^\/login/.test(cuoi) && trang !== "/login") throw new Error(`bị chuyển về trang đăng nhập (đang ở ${o.url}): phiên không vào được trang này`);
    if (String(cuoi).split("?")[0] !== trang) o.ghiChu = `trang tự chuyển sang ${o.url}`;
    await ngan.ev(`window.__UX_MOBILE = ${kho.mobile}; 0`);
    o.do = await ngan.ev(DO_CO_BAN);
    o.loiHt = await ngan.ev(DO_LOI_HT);
    o.them = await ngan.ev(DO_THEM);
    if (axeNoiDung) {
      await ngan.ev(axeNoiDung + ";0");
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
    const chup = await ngan.chupTungMan(anhDir, `${bo}-${tenTrang(trang)}-${k}`);
    o.anh = chup.tep;
    o.anhChiTiet = chup.anh;
    o.caoTrang = chup.caoTrang;
    o.caoKhung = chup.caoKhung;
    o.conLaiPx = chup.conLaiPx;
    o.loiTrang = [...ngan.loi].slice(0, 5);
    o.cham = chamMay(o);
  } catch (e) {
    o.loi = String(e?.message ?? e).slice(0, 500);
  }
  o.giay = +((Date.now() - t0) / 1000).toFixed(1);
  return o;
}

/**
 * Đo `o` ([{ bo, trang }]) ở các `kho` trên môi trường `moi` (kết quả dungMoiTruong; null nếu dựng hỏng, kèm `loiChung`), ghi vào `ra`.
 * Trả { maThoat, dongDau, cacO }. KHÔNG thoát tiến trình, KHÔNG dọn `moi` — bên gọi lo.
 * Tham số khác: tiemNoiDung/tiemTen (mã JS cấy lỗi và tên tệp), axeNoiDung/axeDuong (null = không dùng axe), khongAxe, anTiem, loiChung, bat (Date bắt đầu).
 */
export async function doVaGhi(moi, { o, kho, tiemNoiDung = null, tiemTen = null, ra, anTiem = false, axeNoiDung = null, axeDuong = null, khongAxe = false, loiChung = null, bat = new Date() }) {
  const anhDir = join(ra, "anh");
  mkdirSync(anhDir, { recursive: true });
  const cacO = [];
  let loi = loiChung;
  const dungAxe = !khongAxe && !!axeNoiDung;
  if (moi && !loi) {
    const ngans = new Map();
    try {
      for (const { bo, trang } of o) {
        let ngan = ngans.get(bo);
        if (!ngan) {
          ngan = await moi.chrome.moNgan();
          if (bo !== "KHACH") await ngan.cookie(await dangNhap(moi.base, moi.taiKhoan[bo].phone, moi.taiKhoan[bo].pin), moi.base);
          ngans.set(bo, ngan);
        }
        for (const k of kho) {
          const x = await conHan(doMotO(ngan, moi.base, moi.id, { bo, trang }, k, { tiemNoiDung, axeNoiDung: dungAxe ? axeNoiDung : null, anhDir }), HAN_O_MS, `${bo}:${trang} @${k}`).catch((e) => ({ bo, trang, kho: k, loi: String(e.message), anh: [], giay: HAN_O_MS / 1000 }));
          cacO.push(x);
          console.error(`${x.loi ? "✗" : "✓"} ${bo}:${trang} @${k} (${x.giay} s)${x.loi ? " — " + x.loi : ""}`);
        }
      }
    } catch (e) {
      loi = String(e?.message ?? e);
      console.error(`Không chạy được: ${loi}`);
    } finally {
      for (const ngan of ngans.values()) await ngan.dong().catch(() => {});
    }
  }

  // ---- tổng kết
  const tk = tongKet(cacO);
  let maThoat = tk.maThoat;
  if (loi || khongAxe || !dungAxe || cacO.length === 0) maThoat = 2;
  const lyDoThieu = [];
  if (loi) lyDoThieu.push(`không chạy được: ${loi}`);
  if (khongAxe) lyDoThieu.push("chạy với --khong-axe nên T8 chưa đo");
  if (tk.soOLoi) lyDoThieu.push(`${tk.soOLoi} ô hỏng`);
  if (tk.soChuaDo && !khongAxe) lyDoThieu.push(`${tk.soChuaDo} tiêu chí chưa đo`);
  else if (tk.soChuaDo) lyDoThieu.push(`${tk.soChuaDo} chỗ chưa đo`);
  if (cacO.length === 0 && !loi) lyDoThieu.push("không có ô nào được đo");
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
    ...(anTiem ? [] : [`- Tiêm lỗi (--tiem): ${tiemTen ? "CÓ, tệp " + basename(tiemTen) : "không"}.`]),
    `- Công cụ axe: ${dungAxe ? axeDuong : "KHÔNG dùng"}.`,
    `- Thư mục kết quả: ${ra}`,
    `- Lỗi gieo dữ liệu: ${moi?.loiGieo?.length ? "" : "không"}`,
    ...(moi?.loiGieo ?? []).map((l) => `  - ${l.viec}${l.status ? ` (${l.status})` : ""}: ${o2(l.loi)}`),
    `- Bộ quyền tạo được tài khoản thử: ${moi?.boChayDuoc?.join(", ") || "(không)"}.`, ""];
  for (const x of cacO) {
    md.push(`## ${x.bo}:${x.trang} @${x.kho}`, "");
    if (x.loi) { md.push(`Ô HỎNG: ${o2(x.loi)}`, ""); continue; }
    if (x.ghiChu) md.push(`Ghi chú: ${o2(x.ghiChu)}`, "");
    if (x.loiTrang?.length) md.push(`Lỗi chạy trong trang: ${o2(x.loiTrang.join(" / "))}`, "");
    md.push("| Mã | Tiêu chí | Kết quả | Số chỗ | Ví dụ |", "|---|---|---|---|---|");
    for (const c of x.cham) md.push(`| ${c.ma} | ${o2(tenTieuChi[c.ma])} | ${NHAN[c.ketQua]} | ${c.so}${c.soCatChuPhu ? ` (+${c.soCatChuPhu} cắt chữ khác)` : ""} | ${o2(c.viDu.join(" ; "))} |`);
    md.push("", `Trang cao ${x.caoTrang} px, khung nhìn cao ${x.caoKhung} px; các ảnh gối nhau 40 %.`);
    if (x.conLaiPx > 0) md.push(`CHƯA CHỤP HẾT: còn ${x.conLaiPx} px ở cuối trang chưa có ảnh (đã dừng ở số ảnh tối đa).`);
    md.push("Ảnh:", ...(x.anhChiTiet ?? []).map((a) => `- ${a.tep} (y từ ${a.y} đến ${Math.min(a.y + a.caoKhung, x.caoTrang)})`), "");
  }
  writeFileSync(join(ra, "tom-tat.md"), md.join("\n"));
  writeFileSync(join(ra, "so-do.json"), JSON.stringify({ luc: bat.toISOString(), maThoat, dongDau, tongKet: tk, thamSo: { o, kho, tiem: anTiem || !tiemTen ? null : basename(tiemTen) }, loiChung: loi, loiGieo: moi?.loiGieo ?? [], boChayDuoc: moi?.boChayDuoc ?? [], o: cacO }, null, 1));
  return { maThoat, dongDau, cacO };
}
