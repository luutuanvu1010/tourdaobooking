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
  /** Tên MỘT việc ở cả ba nơi (ADR-0166 câu 1): trang Hoa hồng, Danh bạ, Quản lý tài khoản — đặt cấp riêng cho một đối tác. */
  chonCapRieng: "Chọn cấp riêng cho đối tác",
  tuNgay: "Từ ngày",
  luu: "Lưu",
  dungTheoVaiTro: "Dùng cấp theo vai trò",
  // Ruling R13 (chủ dự án, qua điều phối 2/11): câu CỐ ĐỊNH cạnh nút — nói cả ngày hiệu lực lẫn hậu quả khi vai trò chưa gắn cấp (DTO không cho biết cấp theo vai trò khi đang có cấp riêng, nên không thể
  // cảnh báo riêng từng hồ sơ; không thêm khoá DTO).
  dungTheoVaiTroLuuY: "Có hiệu lực từ ngày mai. Nếu vai trò chưa có cấp, tài khoản sẽ thành «Chưa có cấp».",
  chuaChonCap: "Chọn cấp độ đại lý.",
  khongDocDuocNgay: "Không đọc được ngày của máy chủ nên chưa lưu gì. Thử lại sau.",
  dangTai: "Đang tải…",
  khongCoCapNaoBat: "Chưa có cấp độ đại lý nào đang mở — tạo ở trang Hoa hồng trước.",
  khongTaiDuocDanhSach: "Không tải được danh sách cấp độ đại lý.",
  khongKetNoi: "Không kết nối được máy chủ.",
  khongSuaDuoc: "Cấp riêng này không đổi được ở đây — sửa ở trang Hoa hồng.",
  luuXong: "Đã lưu.",
  datCauChu: "Từ ngày này, đơn của tài khoản tính theo cấp riêng, không theo cấp của vai trò nữa. Đơn đã xác nhận không đổi.",
  // Hai câu cùng nghĩa cho hồ sơ CHƯA có tài khoản ở màn «Cấp độ đại lý»: nói «tài khoản» với hồ sơ không có tài khoản là sai sự thật.
  dungTheoVaiTroLuuYHoSo: "Có hiệu lực từ ngày mai. Nếu vai trò chưa có cấp, đại lý này sẽ thành «Chưa có cấp».",
  datCauChuHoSo: "Từ ngày này, đơn của đại lý này tính theo cấp riêng, không theo cấp của vai trò nữa. Đơn đã xác nhận không đổi.",
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
  return oCapCuaHoSo(v);
}
/**
 * Nội dung ô cấp của MỘT hồ sơ đang mang vai trò được hưởng, KHÔNG hỏi quyền của tài khoản: màn «Cấp độ đại lý» (đặc tả 2026-11-04-man-cap-dai-ly) có cả hồ sơ chưa có tài khoản,
 * máy chủ đã chỉ trả hồ sơ được hưởng nên không cần giả quyền Đối tác. Dòng tài khoản đi qua `oCapCuaDong` ở trên rồi vào đây.
 */
export function oCapCuaHoSo(v: CapHienHanhDto): OCap {
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
export function cauNgayMacDinh(m: MacDinhBang, v: CapHienHanhDto, homNay: string, xem: SuaXemTruocResponse | null, coTaiKhoan = true): string {
  if (m.kieu === "DAT") return coTaiKhoan ? CHU_CAP.datCauChu : CHU_CAP.datCauChuHoSo;
  if (xem !== null && xem.duong === "TU_NGAY") return `Đã có đơn dùng cấp riêng này — cấp mới áp dụng sớm nhất từ ngày ${ngayVN(m.tuNgay)}; đơn cũ giữ cấp cũ.`;
  if (v.rieng !== null && v.rieng.tuNgay >= homNay) return "Cấp riêng cũ bắt đầu hôm nay nên cấp mới áp dụng sớm nhất từ ngày mai; đơn xác nhận trong hôm nay vẫn tính theo cấp cũ.";
  return "Đơn đã xác nhận không đổi; đơn xác nhận từ ngày này tính theo cấp mới.";
}

/** Câu cố định cạnh nút «Dùng cấp theo vai trò»: hồ sơ chưa có tài khoản không được nghe chữ «tài khoản». */
export const cauDungTheoVaiTro = (coTaiKhoan: boolean): string => (coTaiKhoan ? CHU_CAP.dungTheoVaiTroLuuY : CHU_CAP.dungTheoVaiTroLuuYHoSo);

/**
 * Ngày «hôm nay» của bảng bấm = ngày MÁY CHỦ vừa trả lúc MỞ bảng (ruling R12): `xem.homNay` của `GET …/muc-rieng/:id/sua` nếu có (hồ sơ đã có cấp riêng), không thì `homNay` của danh sách cấp
 * (`GET /api/pricing/muc-ta`) đọc cùng lúc mở. KHÔNG dùng ngày giữ từ lúc tải trang: trang mở xuyên nửa đêm (giờ Việt Nam) làm ngày đó cũ một ngày.
 */
export const ngayMayLucMo = (xem: SuaXemTruocResponse | null, homNayDanhSach: string): string => xem?.homNay ?? homNayDanhSach;

/** Ý định của người bấm. Lệnh «Dùng cấp theo vai trò» không có ô ngày hiện ra, nên KHÔNG mang ngày: ngày được đọc lại từ máy chủ ngay lúc bấm (`thucHienLenhGhiCap`). */
export type YDinhGhiCap =
  | { kieu: "DAT"; muc: string; tuNgay: string }
  | { kieu: "DOI"; muc: string; tuNgay: string }
  | { kieu: "DUNG_THEO_VAI_TRO" };
/** Lệnh đã đủ dữ kiện để gửi: «Dùng cấp theo vai trò» mang ngày máy chủ đọc lúc bấm. */
export type LenhGhiCap =
  | { kieu: "DAT"; muc: string; tuNgay: string }
  | { kieu: "DOI"; muc: string; tuNgay: string }
  | { kieu: "DUNG_THEO_VAI_TRO"; homNay: string };
/**
 * Yêu cầu gửi lên máy chủ cho một lệnh ghi của bảng bấm — đúng ba route có sẵn, KHÔNG route mới (ADR-0155 Đ2.5): đặt `POST /api/pricing/ho-so/:id/muc-rieng { muc, tuNgay }`; đổi
 * `POST /api/pricing/muc-rieng/:id/doi { muc, tuNgay }`; «Dùng cấp theo vai trò» `POST /api/pricing/muc-rieng/:id/ket-thuc { denNgay: hôm nay }` (cấp riêng hết hôm nay, từ ngày mai theo vai trò).
 * null khi lệnh không hợp với trạng thái (đổi / ngừng mà chưa có cấp riêng).
 */
export function yeuCauGhiCap(lenh: LenhGhiCap, v: CapHienHanhDto): { url: string; body: Record<string, string> } | null {
  if (lenh.kieu === "DAT") return { url: `/api/pricing/ho-so/${encodeURIComponent(v.partyId)}/muc-rieng`, body: { muc: lenh.muc, tuNgay: lenh.tuNgay } };
  if (v.rieng === null) return null;
  if (lenh.kieu === "DOI") return { url: `/api/pricing/muc-rieng/${encodeURIComponent(v.rieng.id)}/doi`, body: { muc: lenh.muc, tuNgay: lenh.tuNgay } };
  return { url: `/api/pricing/muc-rieng/${encodeURIComponent(v.rieng.id)}/ket-thuc`, body: { denNgay: lenh.homNay } };
}

/** Hai việc có I/O của bảng bấm, do nơi gọi (web) đưa vào để luật chạy được cả trong bài kiểm với máy chủ thật. */
export interface DuongGhiCap {
  /** Đọc ngày hôm nay của MÁY CHỦ ngay lúc gọi (không dùng ngày giữ từ trước). null = không đọc được. */
  docNgayMay(): Promise<string | null>;
  /** Gửi một yêu cầu ghi. Trả null khi máy chủ nhận, hoặc câu lỗi để hiện tại chỗ. */
  gui(yc: { url: string; body: Record<string, string> }): Promise<string | null>;
}
/**
 * Chạy một lệnh ghi của bảng bấm; trả null khi xong, hoặc câu lỗi để hiện ngay trong bảng.
 * Ruling R12 (kiểm độc lập N-1): lệnh «Dùng cấp theo vai trò» không có ô ngày để người dùng thấy, nên ngày kết thúc = ngày máy chủ ĐỌC LẠI ngay lúc bấm. Không đọc được ngày ⇒ KHÔNG gửi.
 * Lệnh đặt / đổi có ô ngày hiện ra: dùng đúng ngày người dùng thấy (đã lấy từ ngày máy chủ lúc mở bảng, `ngayMayLucMo`), không đọc lại; máy chủ vẫn kiểm.
 */
export async function thucHienLenhGhiCap(y: YDinhGhiCap, v: CapHienHanhDto, dep: DuongGhiCap): Promise<string | null> {
  let lenh: LenhGhiCap;
  if (y.kieu === "DUNG_THEO_VAI_TRO") {
    const homNay = await dep.docNgayMay();
    if (homNay === null) return CHU_CAP.khongDocDuocNgay;
    lenh = { kieu: "DUNG_THEO_VAI_TRO", homNay };
  } else lenh = y;
  const yc = yeuCauGhiCap(lenh, v);
  if (yc === null) return CHU_CAP.khongSuaDuoc;
  return dep.gui(yc);
}
