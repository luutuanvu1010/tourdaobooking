// Luật THUẦN bố cục ảnh vé Tour Đảo (ADR-0175 Đ1.7). Nội dung theo đặc tả `docs/superpowers/specs/2026-11-05-lenh-ve-mau-ve-claude-design.md`, khối «Vé từng khách»;
// ràng buộc kỹ thuật cùng tệp: khổ 1080 × 1920, nền phẳng, QR đen trên trắng vùng mã ≥ 520 px, viền trắng ≥ 40 px, mã ở nửa trên, chữ nhỏ nhất 28 px,
// mọi dòng cố định có tiếng Anh nhỏ hơn ngay bên dưới (tên công ty, hotline không dịch). Không giá, tên khách, số điện thoại, mã đơn, mã kỹ thuật:
// mã vé chỉ hiện 4 ký tự cuối. Bộ vẽ ở `web/ve-anh-tour-dao.ts`; tệp này chỉ tính vị trí (đo chữ do bên gọi đưa vào). Không I/O, không import module.
// Test cạnh tệp: ve-anh-tour-dao-bo-cuc.test.ts.

/** Loại khách của lô (cùng bốn giá trị máy chủ nhận ở `POST /api/ve/lo`). */
export type NhomLo = "ADULT" | "CHILD" | "SENIOR" | "ALL";

export const KHO_VE = { rong: 1080, cao: 1920 } as const;
export const QR_TOI_THIEU_PX = 520;
export const VIEN_TRANG_TOI_THIEU_PX = 40;
export const CO_CHU_TOI_THIEU = 28;
/** Lề trắng chuẩn QR mỗi bên: 4 ô (`web/qr-ve.ts` vẽ đúng số này). */
const LE_O_QR = 4;

/** Câu chữ chờ kế toán duyệt (kế hoạch Task 0): đổi chữ chỉ đổi hằng này. */
export const CAU_KHONG_PHAI_HOA_DON = { vi: "Vé này không phải hóa đơn.", en: "This ticket is not an invoice." } as const;

/** Tên loại khách hai thứ tiếng. Tiếng Anh của Trẻ em / Cao tuổi / Mọi loại khách: giả định của người thi công (đặc tả chỉ có «Người lớn / Adult»), chờ chủ xem ảnh. */
export const NHOM_KHACH_VE: Record<NhomLo, { vi: string; en: string }> = {
  ADULT: { vi: "Người lớn", en: "Adult" },
  CHILD: { vi: "Trẻ em", en: "Child" },
  SENIOR: { vi: "Cao tuổi", en: "Senior" },
  ALL: { vi: "Mọi loại khách", en: "All guests" },
};

export interface NoiDungVe { tenCongTy: string; hotline: string; tenDichVu: string; tenDichVuEn: string | null; nhomKhach: NhomLo; denNgay: string; ma: string }
/** Bề rộng (px) của chuỗi ở cỡ chữ và độ đậm cho trước. */
export type DoChu = (chu: string, coPx: number, dam: number) => number;
export type MauVe = "chinh" | "chu" | "phu";
/** `y` là đường cơ sở. `nhom` gom dòng tiếng Việt với dòng tiếng Anh cùng cặp; `chung` = không dịch (tên công ty, hotline). */
export interface DongChu { chu: string; x: number; y: number; coPx: number; dam: number; mau: MauVe; canh: "left" | "center"; ngonNgu: "vi" | "en" | "chung"; nhom: string }
export interface BoCucVe {
  rong: number;
  cao: number;
  logo: { x: number; y: number; canh: number };
  /** Khung mã gồm cả 4 ô lề trắng mỗi bên: `canh = o × (n + 8)`. */
  qr: { x: number; y: number; canh: number; o: number };
  vach: { x: number; y: number; rong: number; cao: number; mau: MauVe }[];
  dong: DongChu[];
  /** Đáy chữ thấp nhất (để kiểm không tràn). */
  dayNoiDung: number;
}

/** Cỡ một ô QR (px) cho ma trận `n` ô: vùng mã ≥ 520 px và lề 4 ô ≥ 40 px. */
export function oQrChoVe(n: number): number {
  return Math.max(Math.ceil(QR_TOI_THIEU_PX / n), Math.ceil(VIEN_TRANG_TOI_THIEU_PX / LE_O_QR));
}

const ngayVn = (iso: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error("Hạn cuối của vé phải dạng năm-tháng-ngày.");
  return iso.split("-").reverse().join("/");
};

/** Cắt chữ theo từ cho vừa `rong`; quá `toiDa` dòng thì dòng cuối thêm «…». Từ dài hơn cả dòng thì cắt theo ký tự. */
function catDong(chu: string, coPx: number, dam: number, rong: number, toiDa: number, doChu: DoChu): string[] {
  const vua = (s: string): boolean => doChu(s, coPx, dam) <= rong;
  const tu: string[] = [];
  for (const t of chu.split(/\s+/).filter((x) => x !== "")) {
    if (vua(t)) { tu.push(t); continue; }
    let manh = "";
    for (const k of t) { if (manh && !vua(manh + k)) { tu.push(manh); manh = k; } else manh += k; }
    if (manh) tu.push(manh);
  }
  const ra: string[] = [];
  let dong = "";
  for (const t of tu) {
    const thu = dong ? `${dong} ${t}` : t;
    if (!dong || vua(thu)) dong = thu;
    else { ra.push(dong); dong = t; }
  }
  if (dong) ra.push(dong);
  if (ra.length <= toiDa) return ra;
  const giu = ra.slice(0, toiDa);
  let cuoi = giu[toiDa - 1]!;
  while (cuoi.length > 0 && !vua(`${cuoi}…`)) cuoi = cuoi.slice(0, -1).trimEnd();
  giu[toiDa - 1] = `${cuoi}…`;
  return giu;
}

const W = KHO_VE.rong;
const H = KHO_VE.cao;
const LE = 72;
const RONG_TRONG = W - 2 * LE;
const LOGO = 112;
/** Phần chữ thò dưới đường cơ sở (ước) — dùng tính đáy dòng. */
const duoiChu = (coPx: number): number => Math.ceil(coPx * 0.3);

export function boCucVeTourDao(nd: NoiDungVe, soOQr: number, doChu: DoChu): BoCucVe {
  const dong: DongChu[] = [];
  const vach: BoCucVe["vach"] = [{ x: 0, y: 0, rong: W, cao: 16, mau: "chinh" }];
  const han = ngayVn(nd.denNgay);
  const duoi4 = `…${nd.ma.slice(-4)}`;

  /** Thêm một khối chữ (cắt dòng) bắt đầu ở đường cơ sở `y`; trả đường cơ sở dòng cuối. */
  const khoi = (chu: string, o: { x: number; y: number; rong: number; coPx: number; dam: number; mau: MauVe; canh?: "left" | "center"; ngonNgu: DongChu["ngonNgu"]; nhom: string; toiDa: number; caoDong: number }): number => {
    const cac = catDong(chu, o.coPx, o.dam, o.rong, o.toiDa, doChu);
    cac.forEach((c, i) => dong.push({ chu: c, x: o.x, y: o.y + i * o.caoDong, coPx: o.coPx, dam: o.dam, mau: o.mau, canh: o.canh ?? "left", ngonNgu: o.ngonNgu, nhom: o.nhom }));
    return o.y + (cac.length - 1) * o.caoDong;
  };

  // Đầu vé: logo trái; cột phải là tên công ty (không dịch) rồi «Vé dịch vụ / Service ticket».
  const logo = { x: LE, y: 56, canh: LOGO };
  const xPhai = LE + LOGO + 28;
  const rongPhai = W - LE - xPhai;
  let y = khoi(nd.tenCongTy, { x: xPhai, y: 88, rong: rongPhai, coPx: 32, dam: 700, mau: "chu", ngonNgu: "chung", nhom: "congTy", toiDa: 2, caoDong: 40 });
  y = khoi("Vé dịch vụ", { x: xPhai, y: y + 48, rong: rongPhai, coPx: 36, dam: 700, mau: "chinh", ngonNgu: "vi", nhom: "loaiVe", toiDa: 1, caoDong: 44 });
  y = khoi("Service ticket", { x: xPhai, y: y + 38, rong: rongPhai, coPx: 28, dam: 500, mau: "phu", ngonNgu: "en", nhom: "loaiVe", toiDa: 1, caoDong: 36 });
  const dauDau = Math.max(logo.y + LOGO, y + duoiChu(28));

  // Mã QR ở nửa trên, giữa vé; khung đã gồm lề trắng.
  const o = oQrChoVe(soOQr);
  const canh = o * (soOQr + 2 * LE_O_QR);
  const qr = { x: Math.round((W - canh) / 2), y: dauDau + 20, canh, o };

  // Số vé (4 ký tự cuối) ngay dưới mã.
  const giua = W / 2;
  y = khoi(`Số vé ${duoi4}`, { x: giua, y: qr.y + canh + 44, rong: RONG_TRONG, coPx: 40, dam: 700, mau: "chu", canh: "center", ngonNgu: "vi", nhom: "soVe", toiDa: 1, caoDong: 48 });
  y = khoi(`Ticket no. ${duoi4}`, { x: giua, y: y + 38, rong: RONG_TRONG, coPx: 28, dam: 500, mau: "phu", canh: "center", ngonNgu: "en", nhom: "soVe", toiDa: 1, caoDong: 36 });
  const yVach = y + 28;
  vach.push({ x: LE, y: yVach, rong: RONG_TRONG, cao: 2, mau: "phu" });

  // Thân vé: dịch vụ, loại khách, hạn dùng, cách dùng, câu không phải hóa đơn.
  const cap = (vi: string, en: string | null, nhom: string, yVi: number, s: { vi: number; en: number; damVi: number; toiDaVi: number; toiDaEn: number }): number => {
    let yy = khoi(vi, { x: LE, y: yVi, rong: RONG_TRONG, coPx: s.vi, dam: s.damVi, mau: "chu", ngonNgu: "vi", nhom, toiDa: s.toiDaVi, caoDong: Math.round(s.vi * 1.25) });
    if (en !== null) yy = khoi(en, { x: LE, y: yy + Math.round(s.en * 1.35), rong: RONG_TRONG, coPx: s.en, dam: 500, mau: "phu", ngonNgu: "en", nhom, toiDa: s.toiDaEn, caoDong: Math.round(s.en * 1.35) });
    return yy;
  };
  const tenEn = nd.tenDichVuEn?.trim() ? nd.tenDichVuEn.trim() : null;
  y = cap(nd.tenDichVu.trim(), tenEn, "dichVu", yVach + 28 + 50, { vi: 50, en: 32, damVi: 700, toiDaVi: 3, toiDaEn: 2 });
  const nk = NHOM_KHACH_VE[nd.nhomKhach];
  y = cap(nk.vi, nk.en, "nhomKhach", y + 28 + 40, { vi: 40, en: 30, damVi: 700, toiDaVi: 1, toiDaEn: 1 });
  y = cap(`Dùng vào ngày đi đã đặt. Hạn cuối ${han}`, `Valid on your booked date. Expires ${han}`, "thoiHan", y + 28 + 32, { vi: 32, en: 28, damVi: 600, toiDaVi: 2, toiDaEn: 2 });
  y = cap("Mỗi vé dùng một lần. Xuất trình mã cho nhân viên Tour Đảo.", "Single use. Show this code to Tour Đảo staff.", "motLan", y + 28 + 30, { vi: 30, en: 28, damVi: 500, toiDaVi: 2, toiDaEn: 2 });
  y = cap(CAU_KHONG_PHAI_HOA_DON.vi, CAU_KHONG_PHAI_HOA_DON.en, "hoaDon", y + 20 + 30, { vi: 30, en: 28, damVi: 500, toiDaVi: 2, toiDaEn: 2 });

  // Hotline ở chân vé (không dịch).
  y = khoi(`Hotline ${nd.hotline}`, { x: LE, y: Math.max(y + 56, H - 72), rong: RONG_TRONG, coPx: 36, dam: 700, mau: "chinh", ngonNgu: "chung", nhom: "hotline", toiDa: 1, caoDong: 44 });

  return { rong: W, cao: H, logo, qr, vach, dong, dayNoiDung: y + duoiChu(36) };
}
