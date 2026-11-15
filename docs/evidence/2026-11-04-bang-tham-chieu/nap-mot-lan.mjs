// Nạp MỘT LẦN bảng việc quan trọng từ hồ sơ rà soát nút bấm 4/11 (ADR-0167, kế hoạch Task 2). Giữ làm bằng chứng; từ đó bảng sửa tay ở src/shared/bang-tham-chieu-viec.ts.
// Chạy ở gốc dự án: node docs/evidence/2026-11-04-bang-tham-chieu/nap-mot-lan.mjs
// Ghi: src/shared/bang-tham-chieu-viec.ts và docs/evidence/2026-11-04-bang-tham-chieu/chua-noi.txt.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { AUDIT_ACTIONS } from "../../../src/shared/audit-actions.ts";
import { duongTrongMa, khoaNut, lietKeNut } from "../../../scripts/quet-nut-lib.mjs";

const ROOT = process.cwd();
const HS = "docs/superpowers/specs/2026-11-04-ra-soat-nut-bam/";
const LAN_LUU_RA_SOAT = "8a031e28";
const qt = JSON.parse(readFileSync(HS + "nut-quan-trong.json", "utf8"));
const ds = JSON.parse(readFileSync(HS + "danh-sach-day-du.json", "utf8"));
const theoMa = new Map(ds.map((r) => [r.ma, r]));
const duong = duongTrongMa(ROOT);
const songHienTai = lietKeNut(ROOT);
const khoaSong = new Set(songHienTai.map((n) => `${n.tep}\0${khoaNut(n)}`));

// Bảng đổi khoá (đo trên 447440cf): khoá cũ → các khoá mới; kèm câu ADR-0166 và cách đổi tên việc.
const DOI = [
  ["web/order.ts", "Khách đã chuyển khoản", ["Ghi khoản thu này"], 10],
  ["web/xac-nhan-don-ui.ts", "Gửi xác nhận", ["Gửi kiểm vé"], 8],
  ["web/xac-nhan-don-ui.ts", "Còn vé", ["Còn vé, xác nhận đơn"], 4],
  ["public/order-form.html", "Lưu, chờ xác nhận", ["Lưu đơn (chưa xác nhận)"], 5],
  ["web/ve-don.ts", "Chuẩn bị ‹…› vé để gửi", ["Mở ‹…› vé để gửi khách"], 3],
  ["web/hoa-hong-cap.ts", "Thêm vai trò vào cấp này", ["Gán cho vai trò", "Gán cho đối tác"], 1],
  ["web/luat-ban.ts", "Hẹn ngày kết thúc", ["Đặt ngày kết thúc"], 11],
  ["web/luat-ban.ts", "Hẹn kết thúc", ["Đặt ngày kết thúc"], 11],
  ["web/nguoi-ban.ts", "Đóng", ["Ngừng điều khoản"], 9],
  ["web/nguoi-ban.ts", 'macDinh ? "Vẫn đóng" : "Đóng điều khoản"', ['macDinh ? "Vẫn ngừng" : "Ngừng điều khoản"'], 9],
  ["web/phan-dinh.ts", "Đòi được khách / huỷ khoản", ["Ghi khoản thu đòi được"], 6],
  ["web/chuyen.ts", "Cứu hộ", ["Kết thúc gián đoạn (xe hỏng)"], 7],
  ["web/dieu-kien-xuat-ben.ts", "Đóng điều kiện", ["Ngừng điều kiện"], 9],
  ["web/catalog.ts", "Bỏ ghi đè", ["Bỏ ghi đè giá"], 2],
  ["web/catalog.ts", "Quay ‹…› về giá theo Sheet?", ["⟪CAU_HOI_BO_GHI_DE_GIA(it.code, it.hidden)⟫"], 2],
  ["web/catalog.ts", "Hiện lại / Ẩn", ["Mở bán lại / Ngừng bán"], 12],
  ["web/parties.ts", "Lưu cấp riêng", ["Lưu"], 1],
  ["web/parties.ts", "Áp dụng cấp riêng", ["Chọn cấp riêng cho đối tác"], 1],
];
const doiTheoKhoa = new Map(DOI.map(([t, c, m, cau]) => [`${t}\0${c}`, { moi: m, cau }]));
// Đổi tên việc (tiêu đề hàng) cho 12 tên; khoá = tiêu đề cũ trong hồ sơ.
const TEN_MOI = new Map([
  ["Khách đã chuyển khoản", "Ghi khoản thu này"],
  ["Gửi xác nhận", "Gửi kiểm vé"],
  ["Còn vé", "Còn vé, xác nhận đơn"],
  ["Hẹn ngày kết thúc", "Đặt ngày kết thúc"],
  ["Đòi được khách / huỷ khoản", "Ghi khoản thu đòi được"],
  ["Cứu hộ", "Kết thúc gián đoạn (xe hỏng)"],
  ["Bỏ ghi đè", "Bỏ ghi đè giá"],
  ["Ẩn / Hiện lại", "Ngừng bán / Mở bán lại"],
  ["Áp dụng cấp riêng", "Chọn cấp riêng cho đối tác"],
]);
const TEN_MOI_THEO_TEP = new Map([["web/parties.ts\0Đóng", "Ngừng dùng"]]);
const THAY_TRONG_TEN = [
  ["Lưu, chờ xác nhận", "Lưu đơn (chưa xác nhận)"],
  ["Chuẩn bị <N> vé để gửi", "Mở N vé để gửi khách"],
  ["Thêm vai trò vào cấp này (ở cấp)", "Gán cho vai trò · Gán cho đối tác (ở cấp)"],
  ["Đóng (nút ở dòng; nhãn đọc màn hình «Đóng điều kiện …»)", "Ngừng điều kiện (nút ở dòng; nhãn đọc màn hình «Ngừng điều kiện …»)"],
];

// Nối tay những hàng rõ (người thi công đọc web/bang-gia-xe.ts dòng 346 và 367: «Đổi tên» tuyến và cỡ xe gọi PUT hai đường dưới đây).
const NOI_TAY = new Map([["Đổi tên · nút lưu trong hộp: Lưu", ["/api/van-chuyen/tuyen/:x", "/api/van-chuyen/co-xe/:x"]]]);
// Tên cũ của nút trong lời mô tả (cột «thật sự làm gì», «hỏi lại», «màn hình»…) đổi theo ADR-0166 để bảng không mô tả bằng chữ đã loại.
const THAY_TRONG_LOI = [
  [/Hẹn ngày kết thúc|Hẹn kết thúc/g, "Đặt ngày kết thúc"],
  [/Đòi được khách \/ huỷ khoản/g, "Ghi khoản thu đòi được"],
  [/Khách đã chuyển khoản/g, "Ghi khoản thu này"],
  [/Thêm vai trò vào cấp này/g, "Gán cho vai trò"],
  [/Xác nhận đơn để gửi khách/g, "Ảnh gửi khách"],
  [/Lưu, chờ xác nhận/g, "Lưu đơn (chưa xác nhận)"],
  [/«Gửi xác nhận»/g, "«Gửi kiểm vé»"],
  [/Đóng điều kiện/g, "Ngừng điều kiện"],
  [/Vẫn đóng/g, "Vẫn ngừng"],
  [/Đóng điều khoản/g, "Ngừng điều khoản"],
  [/bảng Còn vé, Hết vé, Huỷ/g, "bảng Còn vé, xác nhận đơn · Hết vé · Huỷ"],
  [/Còn vé(?!, xác nhận đơn| quá| nhưng|\p{L})/gu, "Còn vé, xác nhận đơn"],
  [/Bỏ ghi đè(?! giá)/g, "Bỏ ghi đè giá"],
  // Hai chữ đã loại còn sót trong lời mô tả (bảng từ ADR-0130): «người thu» đứng một mình, «Phiên đang mở».
  [/người thu,/g, "người thu tiền,"],
  [/Phiên đang mở không bị đăng xuất/g, "Máy đang đăng nhập không bị đăng xuất"],
];
const doiLoi = (t) => THAY_TRONG_LOI.reduce((x, [re, moi]) => String(x ?? "").replace(re, moi), t ?? "");
const nhanNhatKy = new Map();
for (const [ma, v] of Object.entries(AUDIT_ACTIONS)) {
  const o = nhanNhatKy.get(v.label) ?? [];
  o.push(ma);
  nhanNhatKy.set(v.label, o);
}
const chuaNoi = [];

// Nhãn nhật ký trong hồ sơ rà soát là nhãn TRƯỚC khi ADR-0166 đổi tên; chỉ nối những cái nghĩa y hệt, không đoán thêm.
const NHAN_CU = new Map([
  ["Áp dụng cấp riêng cho đối tác", "prc_party_tier_set"],
  ["Gửi xác nhận đơn", "order_confirm_requested"],
  ["Đóng điều kiện cho xe chạy", "departure_rule_closed"],
  ["Rút phiếu tự khai", "self_submission_withdrawn"],
  ["Từ chối phiếu tự khai", "self_submission_rejected"],
  ["Xem số giấy tờ trên phiếu tự khai", "self_submission_number_viewed"],
  ["Bỏ ghi đè dịch vụ", "catalog_override_cleared"],
  ["Lưu tuyến", "route_saved"],
  ["Lưu cỡ xe", "vehicle_size_saved"],
  ["Ẩn dịch vụ", "catalog_hidden"],
  ["Hiện lại dịch vụ", "catalog_unhidden"],
]);
function maNhatKy(hang) {
  const s = (hang.nhat_ky ?? "").trim();
  if (!s) return [];
  const ra = [];
  const them = (x) => {
    if (!ra.includes(x)) ra.push(x);
  };
  // 1. mã hành động viết thẳng trong chữ
  for (const ma of Object.keys(AUDIT_ACTIONS)) if (new RegExp(`(?<![\\w])${ma}(?![\\w])`).test(s)) them(ma);
  // 2. nhãn: tách theo dấu nối rõ nghĩa (không tách « / » trước, vì có nhãn chứa « / » như «Ghi nộp / trả tiền»)
  const dich = (p) => {
    const t = p.trim();
    const bo = t.replace(/\s*\([^()]*\)\s*$/, "").trim();
    const dauNgoac = t.split(" (")[0].trim();
    for (const k of [t, bo, dauNgoac]) {
      const d = nhanNhatKy.get(k);
      if (d?.length === 1) return d[0];
      if (NHAN_CU.has(k)) return NHAN_CU.get(k);
    }
    return null;
  };
  const ca = dich(s);
  if (ca) {
    them(ca);
    return ra;
  }
  const doan = s.split(/\s·\s|;\s*|,\s*rồi\s+|,\s*hoặc\s+|\s+hoặc\s+|\s\+\s|,\s+rồi\s+/);
  let khop = 0;
  let tong = 0;
  for (const d of doan) {
    if (!d.trim()) continue;
    tong++;
    let m = dich(d);
    if (m) {
      them(m);
      khop++;
      continue;
    }
    const con = d.split(/\s\/\s/);
    if (con.length > 1) {
      const kq = con.map(dich);
      if (kq.every(Boolean)) {
        kq.forEach(them);
        khop++;
        continue;
      }
    }
  }
  if (khop < tong && !ra.length) chuaNoi.push(`  nhật ký chưa khớp: «${s.slice(0, 160)}» (việc «${hang.ten}») → (trống)`);
  else if (khop < tong) chuaNoi.push(`  nhật ký khớp một phần (${khop}/${tong}): «${s.slice(0, 160)}» (việc «${hang.ten}») → ${ra.join(", ")}`);
  return ra;
}

const gitShow = (tep) => {
  try {
    return execFileSync("git", ["show", `${LAN_LUU_RA_SOAT}:${tep}`], { encoding: "utf8", maxBuffer: 1 << 26 });
  } catch {
    return null;
  }
};
const cacheGit = new Map();
/** route( gần nhất phía trên dòng, chỉ khi giữa hai dòng không có khai báo ở cột 0 (tức dòng ghi nằm TRONG thân route). */
function duongTuNguon(nguon) {
  const m = nguon.match(/^(src\/[^:]+\.ts):(\d+)/);
  if (!m) return null;
  if (!cacheGit.has(m[1])) cacheGit.set(m[1], gitShow(m[1])?.split("\n") ?? null);
  const dong = cacheGit.get(m[1]);
  if (!dong) return null;
  const den = Number(m[2]) - 1;
  for (let i = Math.min(den, dong.length - 1); i >= 0; i--) {
    const r = dong[i].match(/\broute(?:<[^>]*>)?\(\s*"[A-Z]+"\s*,\s*"([^"]+)"/);
    if (r) return r[1].replace(/:[A-Za-z_]\w*/g, ":x");
    if (i < den && /^(?:export\s+)?(?:async\s+)?(?:function|const|class|interface|type)\b/.test(dong[i])) return null;
  }
  return null;
}

const viecRa = [];
let soDoi = 0;
for (const h of qt.hang) {
  const noiDat = [];
  const them = (tep, chu) => {
    if (!noiDat.some((d) => d.tep === tep && d.chu === chu)) noiDat.push({ tep, chu });
  };
  const apiSet = [];
  let cau = null;
  for (const m of h.ma_may) {
    const r = theoMa.get(m);
    if (!r) {
      chuaNoi.push(`  mã máy ${m} của việc «${h.ten}» không có trong danh sách đầy đủ`);
      continue;
    }
    const k = khoaNut(r);
    // ADR-0166 câu 9: nút kết thúc dòng liên hệ ở Danh bạ nay là «Ngừng dùng» (khoá «Đóng» của tệp này là nút gập khung, không thuộc hàng này).
    const d = h.ten === "Đóng" && r.tep === "web/parties.ts" && k === "Đóng" ? { moi: ["Ngừng dùng"], cau: 9 } : doiTheoKhoa.get(`${r.tep}\0${k}`);
    if (d) {
      cau = d.cau;
      soDoi++;
      for (const moi of d.moi) them(r.tep, moi);
    } else them(r.tep, k);
    for (const a of r.api ?? []) {
      const sach = a.replace(/\?.*$/, "");
      if (duong.has(sach) && !apiSet.includes(sach)) apiSet.push(sach);
    }
  }
  let duongLenh = apiSet;
  if (h.ghi_du_lieu && !duongLenh.length) {
    for (const ng of h.nguon ?? []) {
      const d = duongTuNguon(ng);
      if (d && duong.has(d) && !duongLenh.includes(d)) duongLenh.push(d);
    }
    for (const d of NOI_TAY.get(h.ten) ?? []) if (duong.has(d) && !duongLenh.includes(d)) duongLenh.push(d);
    if (!duongLenh.length) chuaNoi.push(`  ghi dữ liệu chưa có đường lệnh: «${h.ten}» (${(h.nguon ?? []).join(", ")})`);
  }
  let ten = TEN_MOI.get(h.ten) ?? h.ten;
  if (h.ten === "Đóng" && h.ma_may.some((m) => theoMa.get(m)?.tep === "web/parties.ts")) ten = TEN_MOI_THEO_TEP.get("web/parties.ts\0Đóng");
  for (const [cu, moi] of THAY_TRONG_TEN) ten = ten.replace(cu, moi);
  const trangThai = cau || h.ket_luan === "dung" ? "da-chot" : "cho-chon";
  const nguonTen = cau ? `ADR-0166 câu ${cau}` : h.ket_luan === "dung" ? `rà soát 2026-11-04: tên đúng${h.chu_da_chon ? `; ${h.chu_da_chon}` : ""}` : "rà soát 2026-11-04: chưa rõ, chờ chủ";
  viecRa.push({
    nhom: h.nhom, manHinh: doiLoi(h.man_hinh), ten, thatSuLam: doiLoi(h.that_su_lam), hoiLai: doiLoi(h.xac_nhan), hoanTac: doiLoi(h.dao_nguoc),
    duongLenh, maNhatKy: maNhatKy(h), noiDat, trangThai, nguonTen,
  });
}

const daKhai = new Set(viecRa.flatMap((v) => v.noiDat).map((d) => `${d.tep}\0${d.chu}`));
const boQua = [];
for (const b of qt.bo_qua) {
  const r = theoMa.get(b.ma);
  if (!r) {
    chuaNoi.push(`  mục bỏ qua ${b.ma} không có trong danh sách đầy đủ`);
    continue;
  }
  const k = khoaNut(r);
  const d = doiTheoKhoa.get(`${r.tep}\0${k}`);
  for (const chu of d ? d.moi : [k]) {
    const kk = `${r.tep}\0${chu}`;
    if (daKhai.has(kk) || boQua.some((x) => x.tep === r.tep && x.chu === chu)) continue;
    boQua.push({ tep: r.tep, chu, lyDo: b.ly_do });
  }
}

const q = (s) => JSON.stringify(s);
let ts = `/**
 * Bảng việc quan trọng (ADR-0167): nạp một lần từ hồ sơ rà soát nút bấm 2026-11-04 (\`docs/evidence/2026-11-04-bang-tham-chieu/nap-mot-lan.mjs\`), từ đó SỬA TAY.
 * Thêm hay đổi tên = chủ dự án đã chọn tên (AI đưa 2–3 tên, không tự đặt). Đổi tên một nút: sửa nút và bảng này cùng lần lưu, rồi \`npm run tham-chieu\`.
 * \`noiDat.chu\` là khoá do \`khoaNut\` (scripts/quet-nut-lib.mjs) sinh. Bài \`src/bang-tham-chieu.test.ts\` so từng nút với bảng.
 * Giao diện KHÔNG nạp tệp này.
 */
import type { MucBoQua, ViecQuanTrong } from "./bang-tham-chieu.ts";

export const VIEC_QUAN_TRONG: readonly ViecQuanTrong[] = [
`;
for (const v of viecRa) {
  ts += `  {
    nhom: ${q(v.nhom)},
    manHinh: ${q(v.manHinh)},
    ten: ${q(v.ten)},
    thatSuLam: ${q(v.thatSuLam)},
    hoiLai: ${q(v.hoiLai)},
    hoanTac: ${q(v.hoanTac)},
    duongLenh: ${q(v.duongLenh)},
    maNhatKy: ${q(v.maNhatKy)},
    noiDat: [
${v.noiDat.map((d) => `      { tep: ${q(d.tep)}, chu: ${q(d.chu)} },`).join("\n")}
    ],
    trangThai: ${q(v.trangThai)},
    nguonTen: ${q(v.nguonTen)},
  },
`;
}
ts += `];

/** Nút máy dò là ghi dữ liệu hay nút chính nhưng không phải việc quan trọng (chỉ tải lại, chỉ ẩn khung…); mỗi mục có lý do. */
export const BO_QUA: readonly MucBoQua[] = [
${boQua.map((b) => `  { tep: ${q(b.tep)}, chu: ${q(b.chu)}, lyDo: ${q(b.lyDo)} },`).join("\n")}
];
`;
writeFileSync("src/shared/bang-tham-chieu-viec.ts", ts);

const ghiRong = viecRa.filter((v, i) => qt.hang[i].ghi_du_lieu && !v.duongLenh.length).length;
const bao = `Nạp một lần ${new Date().toISOString().slice(0, 10)} từ lần lưu ${LAN_LUU_RA_SOAT} của hồ sơ, đo trên mã hiện tại.
việc: ${viecRa.length}; da-chot: ${viecRa.filter((v) => v.trangThai === "da-chot").length}; cho-chon: ${viecRa.filter((v) => v.trangThai === "cho-chon").length}; mục bỏ qua: ${boQua.length}
nơi đặt đã đổi khoá theo bảng đổi: ${soDoi}; khoá không còn thấy trong mã: ${viecRa.flatMap((v) => v.noiDat).filter((d) => !khoaSong.has(`${d.tep}\0${d.chu}`)).length}
hàng ghi dữ liệu còn chưa có đường lệnh: ${ghiRong}; hàng có đường lệnh: ${viecRa.filter((v) => v.duongLenh.length).length}/${viecRa.length}
hàng có mã nhật ký: ${viecRa.filter((v) => v.maNhatKy.length).length}/${viecRa.length}
Chưa nối (người thi công đọc mã nối tay những hàng rõ; hàng không rõ để trống, không đoán):
${chuaNoi.join("\n")}
`;
writeFileSync("docs/evidence/2026-11-04-bang-tham-chieu/chua-noi.txt", bao);
console.log(bao.split("\n").slice(0, 7).join("\n"));
