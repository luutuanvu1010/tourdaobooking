// Chữ và luật hiển thị THUẦN của cột «Cấp độ đại lý» ở Quản lý tài khoản (ADR-0155 Đ2; kế hoạch lượt 2 Task 4.2) — web/cot-cap-dai-ly.ts, web/staff.ts.
// Giao diện KHÔNG tính cấp, KHÔNG chọn cấp nào đang áp dụng: máy chủ trả `CapHienHanhDto` (từ đúng `tomTatHoaHongHoSo`), ở đây chỉ dịch ra chữ và chọn ngày mặc định của bảng bấm.
// Ngày mặc định phải qua được MỘT luật của máy chủ (`kiemDoi`, `kiemNgung` ở src/modules/pricing/rules.ts, bài src/shared/cap-hien-hanh-hien-thi.test.ts ghim hai phía) — không viết luật thứ hai.
// Chữ theo bảng từ giao diện (src/shared/bang-tu-giao-dien.ts): «vai trò» (không «vai» đứng một mình), «Cấp độ đại lý», «mức riêng».
import type { CapHienHanhDto, SuaXemTruocResponse } from "./contracts.ts";
import { ngayVN } from "./giay-to-hien-thi.ts";
import { coQuyenSua, ngayDoiSomNhat } from "./hoa-hong-hien-thi.ts";
import { can, holdsPartner, type PermissionHolder } from "./permissions.ts";
import { addDays } from "./vn-date.ts";

/** Mọi chữ cố định của cột và của bảng bấm (một nơi, để bài bảng từ quét hết). */
export const CHU_CAP = {
  nhanCot: "Cấp độ đại lý",
  chuaCoVaiTro: "Chưa có vai trò",
  chuaCoCap: "Chưa có cấp",
  haiVaiTroKhacCap: "Hai vai trò khác cấp",
  coMucRieng: "có mức riêng",
  troHoaHong: "Sửa ở trang Hoa hồng",
  khongTaiDuoc: "—",
  chonCap: "Chọn cấp độ đại lý",
  tuNgay: "Từ ngày",
  luu: "Lưu",
  dungTheoVaiTro: "Dùng cấp theo vai trò",
  hieuLucNgayMai: "Có hiệu lực từ ngày mai.",
  chuaChonCap: "Chọn cấp độ đại lý.",
  khongCoCapNaoBat: "Chưa có cấp độ đại lý nào đang mở — tạo ở trang Hoa hồng trước.",
  khongTaiDuocDanhSach: "Không tải được danh sách cấp độ đại lý.",
  khongKetNoi: "Không kết nối được máy chủ.",
  khongSuaDuoc: "Cấp riêng này không đổi được ở đây — sửa ở trang Hoa hồng.",
  luuXong: "Đã lưu.",
  datCauChu: "Từ ngày này, đơn của tài khoản tính theo cấp riêng, không theo cấp của vai trò nữa. Đơn đã xác nhận không đổi.",
} as const;

/** Ai thấy cột: có ô xem hoa hồng đối tác và KHÔNG giữ quyền Đối tác (kể cả tài khoản lai) — cùng cổng với route `GET /api/pricing/cap-hien-hanh`. Hành chính nhân sự không có ô xem nên không thấy. */
export const thayCotCap = (s: PermissionHolder): boolean => can(s, "partner.commission.view") && !holdsPartner(s);
/** Ai sửa được trong cột: có ô ghi hoa hồng đối tác và không giữ quyền Đối tác — cùng cổng với ba route đặt, đổi, ngừng cấp riêng (một hàm với nút «Sửa» của trang Hoa hồng). */
export const suaDuocCot = (s: PermissionHolder): boolean => coQuyenSua(s);

export interface OCap {
  /** Chữ chính của ô. */
  chu: string;
  /** Bấm được để mở bảng đặt / đổi cấp. Chỉ «Chưa có vai trò» là không (đặt cấp cho hồ sơ không có vai trò sẽ bị 400). */
  moBang: boolean;
  /** Nhãn «có mức riêng» (trỏ sang trang Hoa hồng): cột nói cấp đang áp dụng, không nói số tiền. */
  coMucRieng: boolean;
  /** Ngày (ISO) từ đó tài khoản theo vai trò khi cấp riêng đã hẹn ngày ngừng; null = không có. */
  theoVaiTu: string | null;
  /** Không đổi được ở đây (cấp riêng đã hẹn ngày ngừng, hoặc đã có cấp riêng sắp áp dụng): ô trỏ sang trang Hoa hồng. */
  troHoaHong: boolean;
}

/**
 * Nội dung ô cấp của MỘT dòng tài khoản. Dòng không giữ quyền Đối tác ⇒ null (ô trống). Chưa có hồ sơ, hoặc hồ sơ không có trong kết quả (không mang vai trò được hưởng) ⇒ «Chưa có vai trò».
 * Mọi con số và nguồn lấy NGUYÊN từ `CapHienHanhDto` của máy chủ.
 */
export function oCapCuaDong(dong: Pick<PermissionHolder, "permissions"> & { partyId: string | null }, v: CapHienHanhDto | undefined): OCap | null {
  if (!holdsPartner(dong)) return null;
  if (v === undefined || dong.partyId === null) return { chu: CHU_CAP.chuaCoVaiTro, moBang: false, coMucRieng: false, theoVaiTu: null, troHoaHong: false };
  const chu =
    v.nguon === "RIENG" ? `${v.cap?.ten ?? ""} (cấp riêng)`
    : v.nguon === "THEO_VAI" ? `${v.cap?.ten ?? ""} (theo vai trò)`
    : v.nguon === "XUNG_DOT" ? CHU_CAP.haiVaiTroKhacCap
    : CHU_CAP.chuaCoCap;
  return {
    chu, moBang: true, coMucRieng: v.coMucRieng,
    theoVaiTu: v.rieng !== null && v.rieng.denNgay !== null ? addDays(v.rieng.denNgay, 1) : null,
    troHoaHong: !v.doiDuoc,
  };
}
/**
 * Chữ chính của ô có là NÚT mở bảng đặt / đổi cấp không: ô bấm được (`moBang`), người xem được sửa (`suaDuocCot`) và máy chủ nhận đổi ở đây (`!troHoaHong`, tức `doiDuoc`).
 * Thiếu một vế thì chỉ là chữ — kèm liên kết «Sửa ở trang Hoa hồng» khi `troHoaHong`. Một hàm cho cả bảng lẫn thẻ điện thoại (web/cot-cap-dai-ly.ts).
 */
export const nutMoBang = (o: OCap, suaDuoc: boolean): boolean => o.moBang && suaDuoc && !o.troHoaHong;
/** Dòng phụ «Theo vai trò từ <ngày>» khi cấp riêng đã hẹn ngày ngừng. */
export const nhanTheoVaiTu = (ngay: string): string => `Theo vai trò từ ${ngayVN(ngay)}`;

export interface MacDinhBang {
  /** DAT = đặt cấp riêng mới (chưa có cấp riêng); DOI = đổi cấp riêng đang áp dụng. */
  kieu: "DAT" | "DOI";
  /** Ngày bắt đầu mặc định (và nhỏ nhất) của ô «Từ ngày»: ngày sớm nhất mà `kiemDoi` của máy chủ nhận. */
  tuNgay: string;
  /** Hiện nút «Dùng cấp theo vai trò» (ngừng cấp riêng hết hôm nay): `kiemNgung` của máy chủ nhận ngày kết thúc = hôm nay. */
  dungTheoVaiDuoc: boolean;
}
/**
 * Ngày mặc định của bảng bấm — không phải luôn là hôm nay (ADR-0155 Đ2.4). Không cấp riêng ⇒ đặt từ hôm nay. Có cấp riêng ⇒ đổi: cấp cũ bắt đầu từ hôm nay trở đi thì sớm nhất ngày liền sau
 * (`ngayDoiSomNhat`, khớp `kiemDoi`); đã có đơn chụp (`xem.duong = "TU_NGAY"`, từ `GET /api/pricing/muc-rieng/:id/sua`) thì không trước `tuNgaySomNhat`. `xem` null chỉ hợp lệ khi chưa có cấp riêng
 * (hoặc chưa tải được — nơi gọi không mở bảng đổi khi chưa có `xem`). «Dùng cấp theo vai trò» cần: cấp riêng đã bắt đầu, ngày kết thúc còn trống hoặc sau hôm nay, và (đã có đơn chụp) ngày chụp không quá hôm nay.
 */
export function macDinhBangCap(v: CapHienHanhDto, homNay: string, xem: SuaXemTruocResponse | null): MacDinhBang {
  const r = v.rieng;
  if (r === null) return { kieu: "DAT", tuNgay: homNay, dungTheoVaiDuoc: false };
  const som = ngayDoiSomNhat(r.tuNgay, homNay);
  const tu = xem !== null && xem.duong === "TU_NGAY" && xem.tuNgaySomNhat > som ? xem.tuNgaySomNhat : som;
  const daChupQuaHomNay = xem !== null && xem.duong === "TU_NGAY" && addDays(xem.tuNgaySomNhat, -1) > homNay;
  return { kieu: "DOI", tuNgay: tu, dungTheoVaiDuoc: r.tuNgay <= homNay && (r.denNgay === null || r.denNgay > homNay) && !daChupQuaHomNay };
}
/** Câu giải thích dưới ô «Từ ngày» của bảng bấm. */
export function cauNgayMacDinh(m: MacDinhBang, v: CapHienHanhDto, homNay: string, xem: SuaXemTruocResponse | null): string {
  if (m.kieu === "DAT") return CHU_CAP.datCauChu;
  if (xem !== null && xem.duong === "TU_NGAY") return `Đã có đơn dùng cấp riêng này — cấp mới áp dụng sớm nhất từ ngày ${ngayVN(m.tuNgay)}; đơn cũ giữ cấp cũ.`;
  if (v.rieng !== null && v.rieng.tuNgay >= homNay) return "Cấp riêng cũ bắt đầu hôm nay nên cấp mới áp dụng sớm nhất từ ngày mai; đơn xác nhận trong hôm nay vẫn tính theo cấp cũ.";
  return "Đơn đã xác nhận không đổi; đơn xác nhận từ ngày này tính theo cấp mới.";
}

export type LenhGhiCap =
  | { kieu: "DAT"; muc: string; tuNgay: string }
  | { kieu: "DOI"; muc: string; tuNgay: string }
  | { kieu: "DUNG_THEO_VAI_TRO" };
/**
 * Yêu cầu gửi lên máy chủ cho một lệnh ghi của bảng bấm — đúng ba route có sẵn, KHÔNG route mới (ADR-0155 Đ2.5): đặt `POST /api/pricing/ho-so/:id/muc-rieng { muc, tuNgay }`; đổi
 * `POST /api/pricing/muc-rieng/:id/doi { muc, tuNgay }`; «Dùng cấp theo vai trò» `POST /api/pricing/muc-rieng/:id/ket-thuc { denNgay: hôm nay }` (cấp riêng hết hôm nay, từ ngày mai theo vai trò).
 * null khi lệnh không hợp với trạng thái (đổi / ngừng mà chưa có cấp riêng).
 */
export function yeuCauGhiCap(lenh: LenhGhiCap, v: CapHienHanhDto, homNay: string): { url: string; body: Record<string, string> } | null {
  if (lenh.kieu === "DAT") return { url: `/api/pricing/ho-so/${encodeURIComponent(v.partyId)}/muc-rieng`, body: { muc: lenh.muc, tuNgay: lenh.tuNgay } };
  if (v.rieng === null) return null;
  if (lenh.kieu === "DOI") return { url: `/api/pricing/muc-rieng/${encodeURIComponent(v.rieng.id)}/doi`, body: { muc: lenh.muc, tuNgay: lenh.tuNgay } };
  return { url: `/api/pricing/muc-rieng/${encodeURIComponent(v.rieng.id)}/ket-thuc`, body: { denNgay: homNay } };
}
