// Chữ hiện của Trả sau (ADR-0168, ADR-0172, ADR-0173): màn «Hạn mức trả sau», ô «Trả sau» ở Cấp độ đại lý, khối Thanh toán và nút «Ân hạn» trên đơn, mục «Trả sau của tôi».
// Thuần, không DOM. Mốc giờ là ISO UTC của máy chủ; MỌI chỗ hiện cho người dùng đi qua `vnDateTimeText` (giờ Việt Nam, ADR-0172 Đ3 mục 4) — không cắt chuỗi ngày.
// Lý do khoá lấy từ `CAU_KHOA_QUA_HAN` — cùng ý với câu máy chủ (`lyDoKhongTraSau`).
import { GIO_TOI_DA, NHAN_HINH_THUC, dongTien, type HinhThucThanhToan, type TrangThaiHan } from "./tra-sau.ts";
import { msToVnLocal, vnDateTimeText, vnLocalToIso } from "./vn-date.ts";
import { boDau } from "./so-cong-no-hien-thi.ts";

const CAU_KHOA_QUA_HAN = "Bên đặt còn đơn trả sau quá hạn chưa thanh toán nên chưa đặt thêm đơn trả sau được.";

/** Cảnh báo ở màn hạn mức khi nợ vượt hạn mức hiện hành (thay R-CRD-3); `null` = không có gì cần báo. */
export function canhBaoVuotHanMuc(d: { hanMuc: number | null; dangNo: number }): string | null {
  if (d.hanMuc === null) return d.dangNo > 0 ? `Đang nợ ${dongTien(d.dangNo)} nhưng không còn hạn mức trả sau đang hiệu lực.` : null;
  return d.dangNo > d.hanMuc ? `Đang nợ ${dongTien(d.dangNo)}, vượt hạn mức hiện hành ${dongTien(d.hanMuc)}.` : null;
}

/** «36 giờ»; tròn ngày thì kèm số ngày cho dễ hình dung: «48 giờ (2 ngày)». */
export const cauGio = (gio: number): string => (gio >= 24 && gio % 24 === 0 ? `${gio} giờ (${gio / 24} ngày)` : `${gio} giờ`);

/** Tóm tắt Trả sau của một đại lý: «50.000.000 ₫ · trả trong 36 giờ · ân hạn 12 giờ»; chưa có hạn mức → «Chưa cấp» (chủ 2026-11-06). */
export const cauHanMuc = (d: { hanMuc: number | null; gioTra: number | null; gioAnHan: number | null }): string =>
  d.hanMuc === null || d.gioTra === null
    ? "Chưa cấp"
    : `${dongTien(d.hanMuc)} · trả trong ${cauGio(d.gioTra)} · ${d.gioAnHan ? `ân hạn ${cauGio(d.gioAnHan)}` : "không ân hạn"}`;

export const nhanQuaHan = (soDon: number): string | null => (soDon > 0 ? `${soDon} đơn quá hạn` : null);
export const nhanAnHan = (soDon: number): string | null => (soDon > 0 ? `${soDon} đơn đang trong ân hạn` : null);

/** Nhãn ba trạng thái hạn (ADR-0172 Đ3 mục 3): trong ân hạn chỉ báo, quá hạn (hết ân hạn) thì chặn. */
export const NHAN_TRANG_THAI_HAN: Record<TrangThaiHan, string> = { trong_han: "Trong hạn", an_han: "Quá hạn, đang trong ân hạn", qua_han: "Quá hạn" };

/** Nhãn hình thức thanh toán ở chi tiết đơn: «Thanh toán ngay», «Trả sau · hạn trả 16:00 10/11/2026» (giờ Việt Nam). */
export const nhanHinhThucDon = (hinh: HinhThucThanhToan, hanTra: string | null): string =>
  hinh === "CREDIT" && hanTra ? `${NHAN_HINH_THUC.CREDIT} · hạn trả ${vnDateTimeText(hanTra)}` : NHAN_HINH_THUC[hinh];

/** Một dòng đơn còn nợ (màn Hạn mức trả sau, Trả sau của tôi): số nợ, hạn trả, và trạng thái khi đã quá hạn. */
export function cauDonNo(d: { hanTra: string | null; hetAnHan: string | null; no: number; trangThai: TrangThaiHan }): string {
  const phan = [`nợ ${dongTien(d.no)}`];
  if (d.hanTra) phan.push(`hạn trả ${vnDateTimeText(d.hanTra)}`);
  if (d.trangThai === "an_han") phan.push(`${NHAN_TRANG_THAI_HAN.an_han}${d.hetAnHan ? ` tới ${vnDateTimeText(d.hetAnHan)}` : ""}`);
  if (d.trangThai === "qua_han") phan.push(NHAN_TRANG_THAI_HAN.qua_han);
  return phan.join(" · ");
}

/** Số gợi ý của đúng cấp hiện hành (ADR-0172 Đ2): chỉ để điền sẵn bảng bật, không cho ai Trả sau. */
export const goiYCuaCap = <T extends { cap: string }>(goiY: readonly T[], cap: string | null): T | null => (cap === null ? null : (goiY.find((g) => g.cap === cap) ?? null));

/** Câu nhắc khi bảng bật đã điền sẵn số gợi ý của cấp; đang bật hoặc không có số gợi ý thì không nhắc. */
export const cauGoiYDienSan = (dangBat: boolean, tenCap: string | null): string | null =>
  dangBat || tenCap === null ? null : `Đã điền sẵn số gợi ý của cấp ${tenCap}. Đổi được trước khi lưu.`;

/** Câu về «Mức tối đa Quản trị được cấp» cho người đang đặt: Toàn quyền không bị giới hạn nên không cần câu. */
export const cauMucToiDa = (mucToiDa: number | null, khongGioiHan: boolean): string | null =>
  khongGioiHan ? null : mucToiDa === null ? "Toàn quyền chưa đặt mức tối đa Quản trị được cấp nên Quản trị chưa bật được Trả sau." : `Quản trị đặt được hạn mức tới ${dongTien(mucToiDa)}.`;

/** Ô giờ: số nguyên từ `toiThieu` (1 cho thời hạn trả, 0 cho ân hạn) tới 8760 (365 ngày) — cùng trần với máy chủ (`kiemSoGio`). */
export function docGio(raw: string, toiThieu: 0 | 1, ten: string): { ok: true; gio: number } | { ok: false; message: string } {
  const s = raw.trim();
  return /^\d{1,4}$/.test(s) && Number(s) >= toiThieu && Number(s) <= GIO_TOI_DA
    ? { ok: true, gio: Number(s) }
    : { ok: false, message: `${ten} là số giờ nguyên từ ${toiThieu} đến ${GIO_TOI_DA} (365 ngày).` };
}

/** Ô ngày giờ của «Ân hạn» (`datetime-local`): hiểu là GIỜ VIỆT NAM bất kể múi giờ của máy → mốc ISO gửi máy chủ. */
export function docHanMoi(raw: string): { ok: true; iso: string } | { ok: false; message: string } {
  const iso = vnLocalToIso(raw.trim());
  return iso ? { ok: true, iso } : { ok: false, message: "Chọn ngày và giờ của hạn trả mới." };
}

/** Giá trị đặt sẵn cho ô `datetime-local` từ một mốc ISO: «YYYY-MM-DDTHH:MM» theo giờ Việt Nam. */
export const giaTriOGioVn = (iso: string): string => {
  const v = msToVnLocal(Date.parse(iso));
  return `${v.date}T${v.time}`;
};

/** ADR-0198 Đ1.2 (chữ theo cột «Khuyến nghị»): câu ở khối «Hình thức thanh toán» cho đối tác — không số tiền. */
export const CAU_TRA_SAU_DOI_TAC = "Bạn được trả sau. Nhận vé trước, chuyển tiền cho Tour Đảo trong hạn trả.";

/**
 * Khối chọn hình thức ở màn đặt đơn: ẩn khi bên đặt không có hạn mức; khoá (kèm lý do) khi còn đơn quá hạn.
 * `laDoiTac` (ADR-0198 Đ1: `laDoiTacTraSau` của người đang lập): đối tác thấy câu gọn không số; văn phòng giữ «Hạn mức khả dụng …».
 */
export function cauChonTraSau(r: { coHanMuc: boolean; conDuocDung: number; coDonQuaHan: boolean; laDoiTac?: boolean }): { hien: boolean; khoa: string | null; cau: string } {
  if (!r.coHanMuc) return { hien: false, khoa: null, cau: "" };
  return { hien: true, khoa: r.coDonQuaHan ? CAU_KHOA_QUA_HAN : null, cau: r.laDoiTac ? CAU_TRA_SAU_DOI_TAC : `Hạn mức khả dụng ${dongTien(r.conDuocDung)}` };
}

/**
 * Hai dòng đầu của mục «Trả sau của tôi» (ADR-0173 Đ3 mục 3, sửa bởi ADR-0198 Đ1.5). Đối tác: dòng một chỉ nói số giờ trả và giờ ân hạn (không số tiền), dòng hai chỉ còn số đang nợ.
 * Không phải đối tác: giữ như cũ (tóm tắt hạn mức; đang nợ kèm hạn mức khả dụng).
 */
export function dongTraSauCuaToi(
  r: { hanMuc: number | null; gioTra: number | null; gioAnHan: number | null; dangNo: number; conDuocDung: number | null },
  laDoiTac: boolean,
): { dong1: string; dong2: string } {
  if (!laDoiTac) return { dong1: cauHanMuc(r), dong2: `Đang nợ ${dongTien(r.dangNo)}${r.conDuocDung === null ? "" : ` · Hạn mức khả dụng ${dongTien(r.conDuocDung)}`}` };
  const dong1 =
    r.hanMuc === null || r.gioTra === null
      ? "Chưa cấp"
      : `Bạn được trả sau, trả trong ${cauGio(r.gioTra)} kể từ khi đơn được xác nhận${r.gioAnHan ? `, sau đó còn ${cauGio(r.gioAnHan)} ân hạn` : ""}.`;
  return { dong1, dong2: `Đang nợ ${dongTien(r.dangNo)}` };
}

/**
 * ADR-0198 Đ2 mục 1–3: có chọn sẵn «Trả sau» không — chỉ đơn MỚI (chưa từng lưu) do đối tác lập, khi người dùng CHƯA chọn gì (chưa chạm nút, chưa nạp nháp / bản đang gõ dở).
 * Văn phòng lập đơn qua đối tác: không (giữ «Thanh toán ngay»). Bên đặt có dùng được hay không do `quyetHinhThuc` xét.
 */
export const duocChonSanTraSau = (i: { laDoiTac: boolean; donMoi: boolean; daChon: boolean }): boolean => i.laDoiTac && i.donMoi && !i.daChon;

const HAN_MUC_TOI_DA = 10_000_000_000; // cùng trần `MAX_SO_TIEN` của máy chủ (billing/service.ts)

export function docHanMuc(raw: string): { ok: true; dong: number } | { ok: false; message: string } {
  const s = raw.trim().replace(/\./g, "");
  if (!/^\d+$/.test(s) || Number(s) < 1) return { ok: false, message: "Hạn mức là số tiền nguyên đồng lớn hơn 0 (vd 50.000.000)." };
  return Number(s) > HAN_MUC_TOI_DA ? { ok: false, message: `Hạn mức không quá ${dongTien(HAN_MUC_TOI_DA)}.` } : { ok: true, dong: Number(s) };
}

export const CAU_VE_TRA_TRUOC = "Bên đặt không còn hạn mức trả sau dùng được nên đơn này chuyển về Thanh toán ngay. Kiểm lại rồi lưu.";

/**
 * Sau khi biết hạn mức của bên đặt, đơn đang chọn hình thức nào: dùng được thì giữ nguyên; không dùng được (không hạn mức, hoặc còn đơn quá hạn)
 * thì về Trả trước KÈM câu báo nếu đang là Trả sau — không bao giờ đổi âm thầm, và luôn có một hình thức rõ ràng để gửi lên máy chủ.
 */
export function quyetHinhThuc(i: { dangChon: HinhThucThanhToan; c: ReturnType<typeof cauChonTraSau>; benDatChuaNap?: boolean; chonSan?: boolean }): { chon: HinhThucThanhToan; bao: string | null } {
  if (i.benDatChuaNap) return { chon: i.dangChon, bao: null }; // bên đặt chưa nạp xong (đang mở nháp): chưa đủ căn cứ để đổi lựa chọn của người dùng
  // ADR-0198 Đ2: đơn mới của đối tác, người dùng chưa chọn gì ⇒ dùng được thì «Trả sau», không thì «Thanh toán ngay» — KHÔNG câu báo (người dùng chưa chọn gì để mà đổi).
  if (i.chonSan) return { chon: i.c.hien && i.c.khoa === null ? "CREDIT" : "PREPAID", bao: null };
  if (i.dangChon === "PREPAID") return { chon: i.dangChon, bao: null };
  return i.c.hien && i.c.khoa === null ? { chon: "CREDIT", bao: null } : { chon: "PREPAID", bao: CAU_VE_TRA_TRUOC };
}

/**
 * Danh sách hồ sơ để chọn ở bảng cấp hạn mức: lọc theo tên không phân biệt dấu và hoa thường (ô tìm chung của Danh bạ dùng LIKE của SQLite,
 * nên «đại lý» không ra «Đại Lý»), xếp theo tên tiếng Việt, hiện tối đa `toiDa` dòng; `conLai` = số hồ sơ khớp chưa hiện, để màn nhắc gõ thêm.
 */
export function locHoSoTraSau<T extends { ten: string }>(ds: readonly T[], tu: string, toiDa = 20): { hien: T[]; conLai: number } {
  const q = boDau(tu.trim());
  const khop = ds.filter((x) => q === "" || boDau(x.ten).includes(q)).sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  return { hien: khop.slice(0, toiDa), conLai: Math.max(0, khop.length - toiDa) };
}
