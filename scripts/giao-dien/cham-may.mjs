// Phần CHẤM của máy đo giao diện: hàm thuần, số đo của một ô vào, kết quả từng tiêu chí ra. Không đọc, không ghi gì.
// Ngưỡng theo bảng T ở docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md mục 3 và cách lọc của
// docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/tong-hop.mjs; mã và tên khớp bảng «## 1. Phần máy đo» ở docs/TIEU-CHI-GIAO-DIEN.md (bài src/giao-dien-tieu-chi-khop.test.ts).
//
// Một «ô» = một bộ quyền × một trang × một khổ. Số đo của ô: { kho, mobile, do, them, loiHt, axe, t15 }
//   do    — từ trong-trang/do-co-ban.js        them — từ trong-trang/do-them.js        loiHt — từ trong-trang/do-loi-hien-thi.js
//   axe   — mảng vi phạm { id, impact, n, vd[] } hoặc null (CHƯA đo)        t15 — { soKhongTen, mota? } hoặc null (CHƯA đo)

export const TIEU_CHI_MAY = [
  { ma: "T1", ten: "Không cuộn ngang", nguong: "tràn ngang = không", kho: "mọi khổ" },
  { ma: "T2", ten: "Không cắt chữ thông tin chính", nguong: "không chỗ nào cắt chữ có số tiền hoặc toàn chữ số (chỗ cắt chữ khác chỉ đếm phụ)", kho: "mọi khổ" },
  { ma: "T3", ten: "Không có phần tử nổi hay dính đè nút hoặc số tiền", nguong: "0 chỗ bị đè khi cuộn tới giữa màn", kho: "mọi khổ" },
  { ma: "T4", ten: "Vùng chạm từ 44 × 44", nguong: "0 phần tử bấm được nhỏ hơn 44 × 44 px", kho: "điện thoại (390)" },
  { ma: "T5", ten: "Một tiêu đề, tối đa một nút chính ở màn đầu", nguong: "đúng 1 tiêu đề lớn và không quá 1 nút nền đặc ở màn đầu (trang trạng thái toàn trang không xét)", kho: "mọi khổ" },
  { ma: "T6", ten: "Ít kiểu dáng", nguong: "không quá 3 hình nút khác nhau và không quá 5 cỡ chữ", kho: "máy tính (từ 1024)" },
  { ma: "T8", ten: "Trợ năng tự động (axe, gồm tương phản AA)", nguong: "không vi phạm mức nghiêm trọng hay rất nghiêm trọng", kho: "mọi khổ" },
  { ma: "T9", ten: "Không lộ chữ Anh hay mã thô", nguong: "0 từ", kho: "mọi khổ" },
  { ma: "T15", ten: "Mọi nút, ô, liên kết có tên cho bộ đọc màn hình", nguong: "0 phần tử tương tác không tên (cây trợ năng của Chrome)", kho: "mọi khổ" },
  { ma: "M1", ten: "Ô gõ cỡ chữ từ 16 px", nguong: "0 ô gõ dưới 16 px", kho: "mọi khổ" },
  { ma: "M2", ten: "Chữ không chồng chữ", nguong: "0 cặp chữ chồng nhau", kho: "mọi khổ" },
  { ma: "M3", ten: "Ô gõ có nhãn", nguong: "0 ô gõ không nhãn", kho: "mọi khổ" },
];

const TIEN = /\d{1,3}(?:\.\d{3})+\s?(?:đ|₫)/;
const TOAN_SO = /^[\d.,\s]*\d[\d.,\s]*$/;
const catChinh = (c) => TIEN.test(c?.chu ?? "") || TOAN_SO.test(String(c?.chu ?? "").trim());
const bo5 = (a) => a.slice(0, 5).map((x) => String(x).slice(0, 120));
const hinhNut = (nutKieu) => new Set((nutKieu ?? []).map((n) => String(n.sig).replace(/\|c[^|]+/, "")));

const dat = (ma, so = 0) => ({ ma, ketQua: "dat", so, viDu: [] });
const khongDat = (ma, so, viDu) => ({ ma, ketQua: "khong-dat", so, viDu: bo5(viDu) });
const chuaDo = (ma) => ({ ma, ketQua: "chua-do", so: 0, viDu: [] });
const khongApDung = (ma) => ({ ma, ketQua: "khong-ap-dung", so: 0, viDu: [] });
const theoSo = (ma, so, viDu) => (so === 0 ? dat(ma) : khongDat(ma, so, viDu));

/** Chấm MỘT ô: trả mảng { ma, ketQua: "dat" | "khong-dat" | "chua-do" | "khong-ap-dung", so, viDu[≤5] } đúng thứ tự TIEU_CHI_MAY. */
export function chamMay(o) {
  const d = o.do ?? {};
  const them = o.them ?? {};
  const kho = Number(o.kho);
  const dienThoai = !!o.mobile;
  const ra = [];

  // T1
  ra.push(d.tranNgang === false ? dat("T1") : khongDat("T1", Math.max(1, (d.thoRa ?? []).length), d.thoRa?.length ? d.thoRa : ["trang rộng hơn màn hình"]));

  // T2 — chỉ chỗ cắt có số tiền hoặc toàn chữ số làm «không đạt»; chỗ cắt chữ khác đếm vào soCatChuPhu.
  const cat = (o.loiHt?.cat ?? []).filter((c) => (c.rong ?? 0) > 2);
  const chinh = cat.filter(catChinh);
  const t2 = theoSo("T2", chinh.length, chinh.map((c) => `${c.el} «${c.chu}» ${c.rong}/${c.can}px`));
  t2.soCatChuPhu = cat.length - chinh.length;
  ra.push(t2);

  // T3
  const t3 = them.t3 ?? [];
  ra.push(theoSo("T3", t3.length, t3.map((c) => `${c.loai ?? ""} ${c.el} «${c.chu}» bị ${c.biDeBoi} đè`.trim())));

  // T4 — chỉ điện thoại
  ra.push(!dienThoai ? khongApDung("T4") : theoSo("T4", d.soNhoHon44 ?? 0, (d.nhoHon44 ?? []).map((c) => `${c.the ?? ""} «${c.ten}» ${c.w}×${c.h}`.trim())));

  // T5 — trang trạng thái toàn trang (không quyền, không tìm thấy, thiếu mã…) không xét: không có tiêu đề lớn là chủ ý (N12, 13/11)
  if (d.laTrangThaiToanTrang) ra.push(khongApDung("T5"));
  else {
    const h1 = (d.h1 ?? []).length, nut = (d.nutChinhTrongManDau ?? []).length;
    const loi = [];
    if (h1 !== 1) loi.push(`${h1} tiêu đề lớn (cần đúng 1)`);
    if (nut > 1) loi.push(`${nut} nút chính ở màn đầu: ${(d.nutChinhTrongManDau ?? []).slice(0, 4).join(" | ")}`);
    ra.push(loi.length ? khongDat("T5", loi.length, loi) : dat("T5", 0));
  }

  // T6 — chỉ khổ rộng từ 1024
  if (kho < 1024) ra.push(khongApDung("T6"));
  else {
    const nut = hinhNut(d.nutKieu).size, co = them.coChu?.so ?? 0;
    const loi = [];
    if (nut > 3) loi.push(`${nut} hình nút khác nhau (tối đa 3)`);
    if (co > 5) loi.push(`${co} cỡ chữ khác nhau (tối đa 5)`);
    const r = loi.length ? khongDat("T6", loi.length, loi) : dat("T6");
    r.so = nut; // số hình nút; số cỡ chữ nằm ở viDu khi vượt
    ra.push(r);
  }

  // T8
  if (o.axe === null || o.axe === undefined) ra.push(chuaDo("T8"));
  else {
    const nang = o.axe.filter((v) => v.impact === "serious" || v.impact === "critical");
    ra.push(theoSo("T8", nang.length, nang.map((v) => `${v.id} (${v.impact}, ${v.n} chỗ): ${(v.vd ?? [])[0] ?? ""}`)));
  }

  // T9
  ra.push(theoSo("T9", (d.tuAnh ?? []).length, d.tuAnh ?? []));

  // T15
  if (o.t15 === null || o.t15 === undefined) ra.push(chuaDo("T15"));
  else ra.push(theoSo("T15", o.t15.soKhongTen ?? 0, o.t15.mota ?? []));

  // M1, M2, M3
  ra.push(theoSo("M1", (d.oGoNho ?? []).length, (d.oGoNho ?? []).map((c) => `«${c.ten}» ${c.co}`)));
  const chong = them.chong ?? [];
  ra.push(theoSo("M2", chong.length, chong.map((c) => `«${c.chuA}» × «${c.chuB}»`)));
  ra.push(theoSo("M3", (d.oKhongNhan ?? []).length, d.oKhongNhan ?? []));

  return ra;
}

/**
 * Gộp mọi ô. Mỗi ô là { loi } (ô hỏng: trang không mở, hết giờ) hoặc { cham } (kết quả của chamMay).
 * maThoat: 2 nếu có ô hỏng hoặc có tiêu chí «chưa đo»; ngược lại 1 nếu có «không đạt»; ngược lại 0. «Không áp dụng» không ảnh hưởng.
 * soKhongDat và soChuaDo đếm theo (ô × tiêu chí); maKhongDat là các mã tiêu chí khác nhau không đạt.
 */
export function tongKet(cacO) {
  let soKhongDat = 0, soChuaDo = 0, soOLoi = 0;
  const maKhongDat = new Set();
  for (const o of cacO) {
    if (o.loi) { soOLoi++; continue; }
    for (const k of o.cham ?? o.tieuChi ?? []) {
      if (k.ketQua === "khong-dat") { soKhongDat++; maKhongDat.add(k.ma); }
      else if (k.ketQua === "chua-do") soChuaDo++;
    }
  }
  const maThoat = soOLoi > 0 || soChuaDo > 0 ? 2 : soKhongDat > 0 ? 1 : 0;
  return { maThoat, soKhongDat, soChuaDo, soOLoi, maKhongDat: [...maKhongDat] };
}
