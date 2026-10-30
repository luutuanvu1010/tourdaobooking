// Chữ màn «Luật bán» (ADR-0146 Đ5; ADR-0152 Đ2, trang ghép 3b; kế hoạch 2026-10-30 R-1, R-10, T11). Thuần: web/luat-ban.ts chỉ vẽ, bài kiểm ở luat-ban-hien-thi.test.ts.
// Ngày kết thúc TÍNH TRỌN (R-1, chủ chọn Q-3 (a)): hẹn «đến ngày D» thì luật vẫn chặn tới hết D; chỉ «Kết thúc ngay» thôi chặn từ bây giờ (máy chủ ghi ngày kết thúc = hôm qua,
// hoặc ngày bắt đầu − 1 cho luật chưa bắt đầu ⇒ khoảng rỗng, không chặn ngày nào). Màn hiện TÊN (loại, dịch vụ, nhóm, đặc điểm) — không mã.
import type { LuatBanDto, TrangThaiLuatBan } from "./contracts.ts";
import { addDays, ngayDayDu } from "./vn-date.ts";

export const NHAN_THE_LUAT: Readonly<Record<TrangThaiLuatBan, string>> = { DANG_AP_DUNG: "Đang áp dụng", SAP_AP_DUNG: "Sắp áp dụng", DA_KET_THUC: "Đã kết thúc" };
export const THU_TU_THE: readonly TrangThaiLuatBan[] = ["DANG_AP_DUNG", "SAP_AP_DUNG", "DA_KET_THUC"];
export const NHAN_PHAM_VI: Readonly<Record<LuatBanDto["phamVi"], string>> = { SERVICE: "Một dịch vụ", GROUP: "Cả nhóm", ATTRIBUTE: "Theo đặc điểm" };
export const tongTrangThai = (t: TrangThaiLuatBan): "la" | "bien" | "xam" => (t === "DANG_AP_DUNG" ? "la" : t === "SAP_AP_DUNG" ? "bien" : "xam");

export const NUT_KET_THUC_NGAY = "Kết thúc ngay";
export const CAU_KET_THUC_NGAY = "Luật thôi chặn từ bây giờ.";
export const DONG_PHU_DEN_NGAY = "Luật vẫn chặn tới hết ngày này.";
export const CAU_KHONG_PHU = "Không phủ dịch vụ nào";
export const CAU_RONG_THE: Readonly<Record<TrangThaiLuatBan, string>> = {
  DANG_AP_DUNG: "Chưa có luật bán nào đang áp dụng.",
  SAP_AP_DUNG: "Chưa có luật bán nào sắp áp dụng.",
  DA_KET_THUC: "Chưa có luật bán nào đã kết thúc.",
};
export const CAU_GIOI_THIEU = "Luật bán chặn một loại đối tác đặt một dịch vụ, cả một nhóm, hoặc mọi dịch vụ mang một giá trị đặc điểm. Đơn đã xác nhận không bị xét lại.";

/** Phạm vi bằng TÊN. Thiếu tên (dịch vụ / nhóm / đặc điểm không còn) ⇒ chữ thay, không mã. Luật theo đặc điểm trỏ giá trị hoặc đặc điểm đang tắt ⇒ «Không phủ dịch vụ nào». */
export function moTaPhamVi(l: LuatBanDto): string {
  if (l.phamVi === "SERVICE") return `Dịch vụ: ${l.tenDichVu ?? "(dịch vụ không còn trong danh mục)"}`;
  if (l.phamVi === "GROUP") return `Nhóm: ${l.tenNhom ?? "(nhóm không còn)"}`;
  const dd = `${l.tenDacDiem ?? "(đặc điểm không còn)"}: ${l.tenGiaTri ?? "(giá trị không còn)"}`;
  const nhom = l.groupCode ? ` · trong nhóm ${l.tenNhom ?? "(nhóm không còn)"}` : "";
  return `${dd}${nhom}${l.khongPhu ? ` · ${CAU_KHONG_PHU} (giá trị hoặc đặc điểm đang tắt)` : ""}`;
}

/** Hiệu lực, ngày gồm cả hai đầu (R-1). Khoảng rỗng (ngày kết thúc trước ngày bắt đầu) chỉ nói «không còn chặn» — có thể đã chặn trong chính ngày bắt đầu. */
export function moTaHieuLuc(l: Pick<LuatBanDto, "tuNgay" | "denNgay">): string {
  if (l.denNgay === null) return `Từ ${ngayDayDu(l.tuNgay)} · chưa hẹn ngày kết thúc`;
  // Khoảng rỗng: «Kết thúc ngay» ngay trong ngày bắt đầu (đã chặn được vài giờ) hoặc trước ngày bắt đầu (chưa chặn lần nào) — DTO không có giờ kết thúc nên không phân biệt.
  if (l.denNgay < l.tuNgay) return `Từ ${ngayDayDu(l.tuNgay)} · đã kết thúc, không còn chặn`;
  return `Từ ${ngayDayDu(l.tuNgay)} đến hết ${ngayDayDu(l.denNgay)}`;
}

/** Dòng phụ dưới ô «Đến ngày» (K-7): ngày chọn vẫn bị chặn trọn; chọn hôm nay thì nhắc nút «Kết thúc ngay». */
export function dongPhuDenNgay(den: string, homNay: string): string {
  if (!den) return DONG_PHU_DEN_NGAY;
  if (den === homNay) return `Luật vẫn chặn tới hết hôm nay. Muốn thôi chặn từ bây giờ, bấm «${NUT_KET_THUC_NGAY}».`;
  return `Luật vẫn chặn tới hết ngày này (${ngayDayDu(den)}), thôi chặn từ ${ngayDayDu(addDays(den, 1))}.`;
}

/** Hậu quả trong hộp hỏi «Kết thúc ngay»: thôi chặn từ bây giờ; ngày ghi trên luật là hôm qua (hoặc luật chưa bắt đầu ⇒ không chặn ngày nào). */
export function hauQuaKetThucNgay(l: LuatBanDto, homNay: string): string {
  const pv = moTaPhamVi({ ...l, khongPhu: false });
  if (l.tuNgay > homNay) return `${CAU_KET_THUC_NGAY} Luật chưa bắt đầu nên sẽ không chặn ngày nào. Không mở lại được — muốn chặn lại thì thêm luật mới.`;
  return `${CAU_KET_THUC_NGAY} ${l.tenLoai} đặt lại được ${pv} ngay. Luật ghi ngày kết thúc ${ngayDayDu(addDays(homNay, -1))} (hôm qua) vì hôm nay không còn chặn. Không mở lại được — muốn chặn lại thì thêm luật mới.`;
}

/** Luật kết thúc «đến hôm qua» có thể vừa được «Kết thúc ngay» trong hôm nay — đơn sáng nay có thể đã bị chặn. Chỉ chỗ tra, không đoán. */
export function dongPhuDaKetThuc(l: Pick<LuatBanDto, "tuNgay" | "denNgay">, homNay: string): string | null {
  // Gồm cả khoảng rỗng của luật bắt đầu hôm nay rồi «Kết thúc ngay» hôm nay (ngày kết thúc = hôm qua < ngày bắt đầu): luật đó đã chặn được vài giờ.
  if (l.denNgay === null || l.denNgay !== addDays(homNay, -1) || l.tuNgay > homNay) return null;
  return "Nếu luật được kết thúc trong hôm nay, nó vẫn có thể đã chặn đơn đặt sáng nay. Giờ kết thúc ghi ở Nhật ký (Toàn quyền xem được).";
}

/** Một thẻ: luật đúng trạng thái, sắp theo tên loại rồi ngày bắt đầu — luật trùng (R-10) đứng cạnh nhau. */
export function locTheThe(luat: readonly LuatBanDto[], the: TrangThaiLuatBan): LuatBanDto[] {
  return luat.filter((l) => l.trangThai === the).sort((a, b) => a.tenLoai.localeCompare(b.tenLoai, "vi") || a.tuNgay.localeCompare(b.tuNgay) || a.id.localeCompare(b.id));
}

/** Ngày nhỏ nhất cho ô hẹn kết thúc: hôm nay (luật đã bắt đầu) hoặc ngày bắt đầu (luật sắp áp dụng). Muốn sớm hơn thì dùng «Kết thúc ngay». */
export const ngayHenNhoNhat = (l: Pick<LuatBanDto, "tuNgay">, homNay: string): string => (l.tuNgay > homNay ? l.tuNgay : homNay);
