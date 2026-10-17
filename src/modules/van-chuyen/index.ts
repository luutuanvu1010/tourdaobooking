// Module van-chuyen — phân hệ Vận chuyển, lượt 1a (ADR-0040 D1): xe, giấy tờ xe, danh mục loại giấy tờ xe, ngưỡng "sắp hết hạn", danh sách giấy tờ sắp hết
// hạn (xe + tài xế). Route: /api/van-chuyen/*. Tiền tố bảng vc_ (module nghiêm — STRICT). Phụ thuộc: parties (hàm công bố ownerCompany — chủ xe;
// expiringDriverDocuments — giấy tờ tài xế, KHÔNG số; nhaXeDangHopTac — nhà xe đối tác, ADR-0048 D1), audit (auditStatement) và ky-so (tháng đã khoá — ADR-0080: dòng chi phí xe không ghi được vào tháng khoá, lỗi trigger dịch ra 409). KHÔNG module nào import van-chuyen; ngoài AppModule chỉ xuất năm hàm công bố cho gốc lắp ráp: mocToiThieuHienHanh (ADR-0049 D2), nguongHetHanHienHanh (ADR-0040 D1), viecXeCuaNguoi (ADR-0068 Đ2), suKienTheoYeuCau và chuyenChoTinTheoId (tin chuyến — ADR-0052 D6.3).
// Ô quyền: vehicle.manage (Quản trị + Toàn quyền) hỏi ở ĐẦU thân mọi route, trước khi đọc thân yêu cầu (403 trước 400).
import { auditStatement } from "../audit";
import { expiringDriverDocuments, nhaXeDangHopTac, ownerCompany } from "../parties";
import type {
  CarrierListResponse, ExpiringListResponse, VanChuyenMetaResponse, VehicleDocumentDto, VehicleDto, VehicleListResponse, VehicleResponse,
} from "../../shared/contracts";
import { MA_LOAI_GIAY_TO_RE, TRANG_THAI_XE, kiemLoaiGiayToMoi, kiemSuaLoaiGiayTo, soNgayConLai } from "../../shared/giay-to";
import { UUID_RE, error, json, kemLocation, readJson } from "../../shared/http";
import { PARTY_ID_RE } from "../../shared/party-id";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { addDays, vnToday } from "../../shared/vn-date";
import {
  chassisHolder, currentWarnDays, expiringVehicleDocuments, findVehicle, findVehicleDocument, findVehicleDocumentType, hasCurrentVehicleDocOfType, insertPolicyStatement, insertVehicleDocStatement,
  insertVehicleDocTypeStatement, insertVehicleStatement, listVehicleDocumentTypes, listVehicleDocuments, listVehicles, listVehiclesOfOwner, plateHolder,
  updateVehicleDocStatement, updateVehicleDocTypeStatement, updateVehicleStatement, vehicleCountByOwner, voidVehicleDocStatement, type VehicleDocRow, type VehicleRow,
} from "./repository";
import {
  CAU_BIEN_TRUNG, CAU_CHU_XE, CAU_KHUNG_TRUNG, canhBaoXe, chiTietNhatKyXe, gopSapHetHan, kiemGiaHanXe, kiemNguong, kiemSuaSaiXe, kiemSuaXe, kiemThemGiayToXe, kiemXeMoi, loiRangBuocXe,
  type CanhBaoXe, type DanhMucGiayToXe, type XeNhap, type XeSua,
} from "./rules";

// ADR-0049 D2 (lát 1.1): hàm công bố mốc tối thiểu (chỉ gốc lắp ráp gọi — không module nào import van-chuyen); route chính sách điều phối, điều kiện xuất
// bến, hạng bằng (cổng office + ô settings.ops), danh mục lý do (cổng admin + ô admin.manage).
import type {
  DepartureRuleDto, DepartureRuleListResponse, DispatchPolicyDto, DispatchPolicyResponse, LicenseCapacityDto, LicenseCapacityResponse, MocRaLenhResponse, TripReasonDto, TripReasonListResponse,
} from "../../shared/contracts";
import { NHAN_NHOM_LY_DO, laLyDoHeThong, type NhomLyDo } from "../../shared/dieu-phoi-kieu";
import type { MocToiThieu } from "../../shared/moc-toi-thieu";
import {
  MA_LY_DO_RE, type ChinhSachMoi, chiTietChinhSach, chiTietDieuKien, chiTietHangBang, chiTietLyDo, kiemChinhSachMoi, kiemDieuKienMoi, kiemHangBangMoi, kiemLyDoMoi, kiemSuaLyDo,
} from "./chinh-sach";
import {
  chinhSachHienHanh, closeDepartureRuleStatement, currentDispatchPolicy, currentLicenseCapacity, findDepartureRule, findTripReason, insertDepartureRuleStatement, insertDispatchPolicyStatement,
  insertLicenseCapacityStatement, insertTripReasonStatement, listDepartureRules, listDispatchPolicies, listLicenseCapacity, listTripReasons, updateTripReasonStatement,
  type DepartureRuleRow, type DispatchPolicyRow, type LicenseCapacityRow, type TripReasonRow,
} from "./repository";

// ADR-0049 D1–D3 (Task A13): chuyến xe — hàm hẹp của orders (chỉ gọi trong THÂN route, sau can() — bài src/orders-cong-bo.test.ts), đọc / dựng lô / DTO.
import { cauThemHanhKhachTaiXe, hanhKhachChoChuyen, kiemHanhKhachTaiXe, lichChungChang, lienHeChoTaiXe } from "../orders";
import type { CapNhatDiemResponse, CuuHoResponse, HuongDanVienListResponse, CapNhatKhachResponse, ChuyenChiTietResponse, CuocChiTietResponse, CuocCuaToiResponse, StaffProfile, TuChoiResponse } from "../../shared/contracts";
import { kiemTaoSuaChuyen, mocMoKhung, trongKhungXemKhach } from "../../shared/dieu-phoi-kiem";
import { coSuatChuyenVao, hanTuChoiCuaCap } from "./han-tu-choi-repo";
import type { KhungTaiXe } from "./tai-xe-dto";
import { lyDoGiu, type LyDoGiu } from "../../shared/ly-do-giu";
import { isISODate, msToVnLocal } from "../../shared/vn-date";
import { eventByRequest, eventsByTrips, tripCountByDate, tripsByDate, tripsCuaTaiXe, tripsTouching } from "./chuyen-repo";
import { loTaoChuyen } from "./dieu-phoi";
import { cuuHoTu } from "./cuu-ho";
import { chinhSachVao, docChung, docNen, khungChuyen, taiXeVao, xeVao, type NenChuyen } from "./dieu-phoi-doc";
import { CAU_LY_DO_VUOT_LA, dungLichNgay, lenhBaoHuy, lenhBoSungTen, lenhCapNhatDiem, lenhCapNhatKhach, lenhDoi, lenhHuy, lenhRut, lenhSuaChuyen, lenhThemDiemDangChay, lenhXep } from "./dieu-phoi-lenh";
import {
  CAN_DIEU_PHOI, CAN_XEM_CHUYEN, KHONG_CO_CHUYEN, chanCoVuot, chayLo, chiTietChuyen, cuocChiTiet, danhSachCuoc, gioNgan, loi409, loiKiem, lyDoHopLe, nhanLyDo, phaLeNhatKy,
  gioKhanCapNhatKy, traLenhLap, vuotLenh, type QuyenVuot, MA_LENH_DUNG_LAI,
} from "./dieu-phoi-route";
import { lenhTuChoi } from "./tu-choi";
import { suKienTheoYeuCau } from "./han-tu-choi-repo";
import {
  docBaoHuy, docBoSungTen, docCapNhatDiem, docDieuChinhSuat, docDoi, docDoiThuTu, docHuy, docKetThucGianDoan, docRut, docSuaChuyen, docTaoChuyen, docThemDiem, docThuHoiXuatBen,
  docTienDo, docXep, docTuChoi, requestIdLong,
} from "./dieu-phoi-than";
// Task A15: lệnh tiến độ — MỘT hàm mỗi lệnh cho cả route tài xế lẫn route văn phòng bấm thay (R-P1).
import {
  lenhDaDon, lenhDaToi, lenhDaTra, lenhDoiThuTu, lenhKetThuc, lenhKetThucGianDoan, lenhKhachHuy, lenhVang, lenhXuatBen, type NguoiBam,
} from "./dieu-phoi-tien-do";
// ADR-0097 (gói A1, V3-B): hai lệnh điều chỉnh CHỈ văn phòng — tệp riêng (không phải cặp route tiến độ).
import { lenhDieuChinhSuat, lenhThuHoiXuatBen } from "./dieu-phoi-dieu-chinh";
import type { GoiBaoChangDto, LyDoDangDungDto, NhacGoiKhachResponse } from "../../shared/contracts";
// Mẫu đưa đón theo dịch vụ (ADR-0054 D10.1; ADR nháp nơi trả mặc định — kế hoạch 2026-10-01-may-chu-o-moi-chang Task 6, 7).
import type { MauChangBanDto, MauChangFormResponse, MauChangLichSuResponse } from "../../shared/contracts";
import { CATALOG_CODE_RE } from "../../shared/order-lines";
import { chiTietMauChang, kiemMauChangMoi } from "./chinh-sach";
import { insertLegTemplateStatement, legTemplateHistory, legTemplatesCurrent, locationLabel, type LegTemplateRow } from "./repository";
import { NHAC_GOI_SO_NGAY } from "../../shared/goi-bao";
import { changChoTrongKhoang, changChuDon, mocByRequest } from "./chuyen-repo";
import { docBoDanhDauGoiBao, docDaGoiBao } from "./dieu-phoi-than";
import { danhSachNhac, docGoiBao, phanHoiLenhLap, xuLyMoc, type QuyenGoiBao } from "./goi-bao-lenh";
// ADR-0059: xe trên chi tiết đơn — route đọc, danh sách trắng.
import type { XeCuaDonResponse } from "../../shared/contracts";
import { changMoCuaDon, donTonTai, xeCuaDon } from "./chuyen-repo";
import { lyDoGiuDto, xeCuaDonDto } from "./dieu-phoi-dto";
// ADR-0057 T1 (kế hoạch Đợt 4 Task 4): bảng giá thuê xe theo nhà xe, danh mục tuyến / cỡ xe — thân route mỏng, xử lý ở tien-xe-lenh.ts.
import type { BangGiaDongResponse, CoXeListResponse, TuyenListResponse } from "../../shared/contracts";
import { bangGiaDto, coXeDto, tuyenDto } from "./tien-xe-dto";
import { phanLoaiThue } from "./tien-xe";
import { chiTietChiPhiNhatKy, keHoachChiPhiKhiDoi, ngayCuaKeHoach } from "./tien-xe-lo";
import { CAU_NHA_XE_THOI } from "./rules";
import {
  docBangGia, docChiPhiChoLenh, lenhKetThucGia, loiKhoaThangXe, loiThangDaKhoa, tenTuyen, tenTuyenDangDung, lenhSuaCoXe, lenhSuaTuyen, lenhThemCoXe, lenhThemGia, lenhThemTuyen,
} from "./tien-xe-lenh";
import { listRoutes, listSizes } from "./tien-xe-repo";
import { MA_TUYEN_CO_RE, docCoXeMoi, docKetThucGia, docSuaCoXe, docSuaTuyen, docThemGia, docTuyenMoi } from "./tien-xe-than";
const CAN_GIA = () => error(403, "forbidden", "Chỉ Kế toán, Quản trị, Toàn quyền xem và nhập bảng giá thuê xe.");
// ADR-0057 T2 C9 (kế hoạch Đợt 4 Task 10): chi phí chuyến xe thuê + bảng kê — chỉ route hỏi transport.cost.*; thân mỏng, xử lý ở tien-xe-chi-phi.ts.
import type { ChiPhiChuyenResponse, NhomBangKeDto } from "../../shared/contracts";
import { docBangKe, docChiPhiChuyen, lenhChupLai, lenhDaoDong, lenhDieuChinh, lenhGiaThoaThuan } from "./tien-xe-chi-phi";
import { BANG_KE_TOI_DA_NGAY, NHOM_BANG_KE, docChupLai, docDaoDong, docDieuChinh, docGiaThoaThuan } from "./tien-xe-than";
const CAN_CHI_PHI = () => error(403, "forbidden", "Chỉ Kế toán, Quản trị, Toàn quyền xem và sửa chi phí xe thuê.");
const ID_CHUYEN_RE = /^[A-Za-z0-9-]{3,64}$/;
/** Phản hồi sau một lệnh ghi chi phí: chi phí HIỆN TẠI của chuyến (201 khi vừa ghi, 200 khi gửi lại cùng requestId). */
async function phanHoiChiPhi(db: D1Database, tripId: string, nhan: (ids: readonly string[]) => Promise<Map<string, string> | null>, r: { ok: true; lap: boolean } | { ok: false; res: Response } | null): Promise<Response> {
  if (r === null) return error(404, "not_found", "Không tìm thấy chuyến xe.");
  if (!r.ok) return r.res;
  const dto = await docChiPhiChuyen(db, tripId, nhan, vnToday(new Date()));
  return dto ? json({ chiPhi: dto } satisfies ChiPhiChuyenResponse, r.lap ? 200 : 201, { location: `/chuyen?id=${tripId}` }) : error(404, "not_found", "Không tìm thấy chuyến xe.");
}
const CAN_DANH_MUC_TUYEN = () => error(403, "forbidden", "Tài khoản này không xem được danh mục tuyến, cỡ xe.");
/** Bảng giá đọc theo tên tuyến / cỡ (map) — một lần mỗi request. */
const banDoTuyenCo = async (db: D1Database, ngay: string) => {
  const [t, c] = await Promise.all([listRoutes(db), listSizes(db, ngay)]);
  return { t: new Map(t.map((x) => [x.code, x])), c: new Map(c.map((x) => [x.code, x])) };
};
// ADR-0055 VK2-A (Đợt 3): khung bận của xe — ghi, rút một lần, xem (một xe / tuần).
import type { ChuyenXeBanDto, KhungBanChongChuyenLoi, KhungBanXeDto, KhungBanXeListResponse, LichXeBanResponse } from "../../shared/contracts";
import { chuyenVuongKhung, nhanKhoangGio } from "../../shared/khung-ban";
import { vnLocalToMs, vnWeekRange } from "../../shared/vn-date";
import { CAU_KHUNG_VUA_DOI, chiTietNhatKyKhung, kiemKhungBanMoi, kiemRutKhung, loiRangBuocKhungBan } from "./khung-ban";
import { insertKhungBanStatement, khungBanCuaXe, khungBanTheoId, khungBanXeTrongKhoang, rutKhungBanStatement, type KhungBanRow } from "./khung-ban-repo";
import { lyDoDangDung, xeDieuPhoi } from "./chuyen-repo";
import type { CanhBaoLichDto } from "../../shared/contracts";
import { NHAN_CANH_BAO_GIO_LAI, type CanhBaoGioLai } from "../../shared/gio-lai";
import { khungBanVao, khungTaiXeVao } from "./dieu-phoi-doc";
import { khungTaiXeTrongKhoang } from "./khung-ban-tai-xe-repo";
import { banTaiXeResponse, khungCuaToiResponse, lenhGhiKhungBan, lenhRutKhungBan } from "./bao-ban";
// ADR-0111 (kế hoạch A5): chuyển khách giữa hai xe — route tài xế (cổng staff, ô trip.transfer) và văn phòng (cổng office).
import type { DeNghiCuaToiResponse, DeNghiLenhResponse, DeNghiNgayResponse, KetQuaDeNghi, XeNhanResponse } from "../../shared/contracts";
import {
  deNghiDto, docGuiDeNghi, docLyDoDeNghi, docMaLenhDeNghi, lenhBacDeNghi, lenhDuyetDeNghi, lenhGuiDeNghi, lenhKhongNhanDeNghi, lenhNhanDeNghi, lenhRutDeNghi,
  motDeNghiDto, type GuiThan,
} from "./chuyen-khach-lenh";
import { deNghiById, deNghiByRequest, deNghiCuaChuyen, deNghiTheoNgay, kiemCuaDeNghi, type DeNghiRow } from "./chuyen-repo";
import { xeNhanChoDeNghi } from "./cuu-ho";
const CAN_CHUYEN_KHACH = () => error(403, "forbidden", "Tài khoản này không nhờ / nhận chuyển khách được.");
const KHONG_CO_DE_NGHI = () => error(404, "not_found", "Không tìm thấy đề nghị chuyển khách.");
const CAN_DUYET_DE_NGHI = () => error(403, "forbidden", "Chỉ Quản trị, Toàn quyền duyệt / bác đề nghị chuyển khách.");
/** Kết quả của lệnh đề nghị theo loại sự kiện của nó (lệnh lặp trả kết quả của lần đầu). */
const KET_QUA_CUA_SU_KIEN: Readonly<Record<string, KetQuaDeNghi>> = {
  TRANSFER_SENT: "DA_GUI", TRANSFER_WITHDRAWN: "DA_RUT", TRANSFER_DECLINED: "KHONG_NHAN", TRANSFER_EXPIRED: "HET_HAN", TRANSFER_ESCALATED: "LEO_THANG",
  TRANSFER_CONFIRMED: "DA_CHUYEN", TRANSFER_REJECTED: "DA_BAC",
};
/**
 * Lệnh lặp (G-A5-22): sự kiện cùng mã lệnh, cùng cặp chuyến phải là lệnh của CHÍNH đề nghị này — dấu lệnh đóng, dấu lệnh quyết, hoặc (Nhận rồi leo thang, sau
 * đó Duyệt ghi dấu lệnh quyết mới) dấu lệnh của một lần kiểm của đề nghị.
 */
async function laLenhCuaDeNghi(db: D1Database, lenhId: string, r: DeNghiRow): Promise<boolean> {
  if (lenhId === r.closed_cmd_id || lenhId === r.decided_cmd_id) return true;
  return (await kiemCuaDeNghi(db, [r.id])).some((k) => k.cmd_id === lenhId);
}
async function phanHoiDeNghi(db: D1Database, rid: string, ketQua: KetQuaDeNghi, bayGioMs: number, vanPhong: boolean): Promise<Response> {
  return json({ ketQua, deNghi: (await motDeNghiDto(db, rid, bayGioMs, vanPhong))! } satisfies DeNghiLenhResponse);
}
/** Phản hồi lệnh gửi (kể cả lệnh lặp): đề nghị mang request_id này; khác xe nhận / phạm vi / điểm của thân → 409 mã lệnh dùng lại (G-A5-22). */
async function phanHoiGui(db: D1Database, b: GuiThan, bayGioMs: number): Promise<Response> {
  const r = await deNghiByRequest(db, b.requestId);
  if (!r || r.to_trip_id !== b.denChuyenId || r.scope !== b.phamVi || r.from_stop_id !== b.diemId) return MA_LENH_DUNG_LAI();
  return json({ ketQua: "DA_GUI", deNghi: (await deNghiDto(db, [r], bayGioMs, false))[0]! } satisfies DeNghiLenhResponse);
}
const CAN_XEM_XE_DON = () => error(403, "forbidden", "Tài khoản này không xem được xe đón khách của đơn.");
const CAN_XEM_CUOC = () => error(403, "forbidden", "Tài khoản này không có cuốc xe.");
const CAN_BAM_THAY = () => error(403, "forbidden", "Tài khoản này không bấm thay tiến độ chuyến được.");
/** `assigned` của route tài xế (kế hoạch mục 1.2): người gọi có hồ sơ và là tài xế ĐANG MỞ dòng lái của chuyến. */
const dangLai = (nen: NenChuyen | null, staff: StaffProfile): boolean => nen !== null && staff.partyId !== null && nen.trip.driver_party_id === staff.partyId;
/**
 * KHUNG XEM KHÁCH của người gọi trên chuyến (ADR-0053 D7.2; kế hoạch A4 T1) — CHỖ DUY NHẤT trong module gọi hàm thuần `trongKhungXemKhach` (bài
 * mot-ham-khung.test.ts). Mọi route tài xế lấy cờ ở đây: GET chi tiết (tên, liên hệ, chỉ đường), chín lệnh tiến độ (cờ trong phản hồi), bổ sung tên khách.
 * VẾ HẠN (G-A4-2; kế hoạch A4 T3): người gọi có `can(trip.refuse, {assigned:true})` — đây là chỗ máy chủ hỏi ô `trip.refuse` đầu tiên — thì đọc hạn Từ chối
 * của cặp (chuyến, chính người gọi); thiếu dòng → `null` (ngoài khung). Không có ô → `undefined` (tài xế công ty: chỉ vế "trong ngày chạy").
 * Người gọi phải ĐANG LÁI chuyến (`dangLai` — mọi route gọi hàm này đã kiểm trước), nên `tuChoiDuoc` không xét lại dòng lái.
 */
async function khungCuaNguoiGoi(db: D1Database, nen: NenChuyen, staff: StaffProfile, bayGioMs: number): Promise<KhungTaiXe> {
  const coVeHan = staff.partyId !== null && can(staff, "trip.refuse", { assigned: true });
  const han = coVeHan ? await hanTuChoiCuaCap(db, nen.trip.id, staff.partyId!) : undefined;
  const chuyen = { ngayChay: nen.trip.service_date, trangThai: nen.trip.status, xuatBenMs: nen.trip.departed_ms };
  const trongKhung = trongKhungXemKhach(chuyen, han, bayGioMs);
  const moc = han === null ? null : mocMoKhung(chuyen, han);
  const conHan = typeof han === "number" && nen.trip.status === "PLANNED" && bayGioMs <= han; // G-A4-1: Từ chối được khi bayGio ≤ hạn
  // ADR-0113 Đ1, Đ3: còn hạn mà chuyến có suất đang mở nhận chuyển vào → chặn (cùng thứ tự với `lyDoKhongDuoc`: quá hạn đứng trước). Chỉ hỏi CSDL khi còn hạn.
  const chan = conHan && (await coSuatChuyenVao(db, nen.trip.id));
  return {
    trongKhung,
    han,
    tuChoiDuoc: conHan && !chan,
    chanTuChoi: chan ? "KHACH_CHUYEN_VAO" : null,
    thayKhachTuMs: !trongKhung && moc !== null && moc > bayGioMs ? moc : null, // chỉ mốc ở tương lai (chuyến đã qua ngày chạy: không hứa)
  };
}
/** Văn phòng bấm thay: người bấm = tài khoản văn phòng; `bamThay` trừ khi chính người đó là tài xế đang lái chuyến. */
const nguoiBamVanPhong = (staff: StaffProfile, nen: NenChuyen): NguoiBam => ({ id: staff.id, bamThay: !dangLai(nen, staff) });
// ADR-0051 (Task A-GB): nhắc "gọi báo khách" khi giờ hẹn đổi — mốc giờ hẹn của chặng, họ lệnh "Đã gọi báo" / "Bỏ đánh dấu", danh sách nhắc.
const CAN_GOI_BAO = () => error(403, "forbidden", "Chỉ người lập đơn, người phụ trách đơn, Quản trị, Toàn quyền ghi được \"đã gọi báo\".");
const KHONG_CO_CHANG = () => error(404, "not_found", "Không tìm thấy chặng.");
/**
 * Quyền bấm "Đã gọi báo" / "Bỏ đánh dấu" trên chặng của đơn `orderId` — ĐÚNG lời gọi của route ghi (GB2): ô `trip.call_ack` với người lập (`ownerId`) và người
 * phụ trách ĐƠN (`ctx.isAssigned` — khác `assigned` của tài xế). Dùng cho `baoDuoc` / `boDuoc` của DTO (màn chỉ ẩn / hiện nút; máy chủ luôn kiểm lại).
 */
const quyenGoiBaoCua = (staff: StaffProfile, isAssigned: (orderId: string) => Promise<boolean>): QuyenGoiBao => async (orderId, ownerId) =>
  can(staff, "trip.call_ack", { ownerId: ownerId ?? undefined, assigned: await isAssigned(orderId) });
const NGAY_MS = 86_400_000;

const FORBIDDEN = () => error(403, "forbidden", "Tài khoản này không quản lý được xe.");
const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy xe.");
const STALE = () => error(409, "stale", "Xe vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
// R15 điểm 1, 3 (điều phối 2026-09-28): lớp ROUTE của biển số / số khung trùng — mã riêng; lớp CSDL (chỉ mục duy nhất) trả mã KHÁC (loiRangBuocXe).
const PLATE_TAKEN = () => error(409, "vehicle_plate_taken", CAU_BIEN_TRUNG);
const CHASSIS_TAKEN = () => error(409, "vehicle_chassis_taken", CAU_KHUNG_TRUNG);
const NO_OWNER = () => error(409, "no_owner_company", "Chưa có hồ sơ công ty chủ nên chưa thêm xe được. Báo người phụ trách hệ thống.");
// ADR-0048 B1.1 lớp ROUTE: chủ xe không phải công ty chủ / nhà xe đang hợp tác — mã riêng; lớp CSDL (trigger 0039) trả vehicle_owner_conflict (loiRangBuocXe).
const OWNER_NOT_CARRIER = () => error(409, "vehicle_owner_not_carrier", CAU_CHU_XE);
const BAD_OWNER_FILTER = () => error(400, "invalid_input", "Bộ lọc chủ xe không hợp lệ.");

const RETIRED = () => error(409, "vehicle_retired", "Xe đã ngừng dùng.");
// ---- Khung bận của xe (ADR-0055 VK2-A A5) -------------------------------------------------------------------------------------------------------------
const khungBanXeDto = (r: KhungBanRow, bayGioMs: number): KhungBanXeDto => ({
  id: r.id, xeId: r.vehicle_id, batDau: new Date(r.start_ms).toISOString(), ketThuc: new Date(r.end_ms).toISOString(), batDauMs: r.start_ms, ketThucMs: r.end_ms,
  lyDoMa: r.reason_code, lyDo: r.reason_label, daRut: r.withdrawn_at !== null, daQua: r.end_ms <= bayGioMs, version: r.version,
});
/** Lý do ĐANG DÙNG của nhóm BAN_XE (danh mục — câu 3.2, chủ 2/10). */
const lyDoBanXe = async (db: D1Database): Promise<{ code: string; label: string }[]> =>
  (await lyDoDangDung(db)).filter((r) => r.reason_group === "BAN_XE").map((r) => ({ code: r.code, label: r.label }));
/** Lý do đang dùng của các nhóm `nhom` (DTO danh mục — mã, nhóm, nhãn) cho màn đề nghị chuyển khách (ADR-0111; gói A5 T13 / T14). */
const lyDoNhom = async (db: D1Database, nhom: readonly NhomLyDo[]): Promise<LyDoDangDungDto[]> =>
  (await lyDoDangDung(db)).flatMap((r) => (nhom.includes(r.reason_group as NhomLyDo) ? [{ code: r.code, nhom: r.reason_group as NhomLyDo, nhan: r.label }] : []));
/** Nhắc giờ lái của lệnh tạo / sửa chuyến → `canhBaoLenh` (id tạm "__moi__" của luật thuần đổi sang id thật). */
const nhacGioLaiDto = (ds: readonly CanhBaoGioLai[], tripId: string): CanhBaoLichDto[] =>
  ds.map((w) => ({ loai: w.loai, nhan: NHAN_CANH_BAO_GIO_LAI[w.loai], legId: null, tripId, maDon: null }));
async function respondKhungBan(db: D1Database, xeId: string, status = 200): Promise<Response> {
  const bayGioMs = Date.now();
  const [rows, lyDo] = await Promise.all([khungBanCuaXe(db, xeId), lyDoBanXe(db)]);
  const ds = rows.map((r) => khungBanXeDto(r, bayGioMs));
  const dangCo = ds.filter((k) => !k.daRut && !k.daQua).sort((a, b) => a.batDauMs - b.batDauMs);
  const lichSu = ds.filter((k) => k.daRut || k.daQua);
  return json({ dangCo, lichSu, lyDo } satisfies KhungBanXeListResponse, status);
}
const DOC_NOT_FOUND = () => error(404, "not_found", "Không tìm thấy giấy tờ này của xe.");
// ADR-0056 VK3-B lớp ROUTE — lớp CSDL (trigger) trả document_type_conflict (loiRangBuocXe).
const DOC_TYPE_EXISTS = (ten: string) => error(409, "document_type_exists", `Xe đã có ${ten} đang dùng — bấm Gia hạn hoặc Sửa sai.`);
const DOC_NOT_CURRENT = () => error(409, "document_not_current", "Dòng này đã được gia hạn hoặc đã huỷ — chỉ dòng hiện hành mới gia hạn hay sửa sai được.");
const DOC_STALE = () => error(409, "stale", "Giấy tờ vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");

/**
 * HÀM CÔNG BỐ (ADR-0049 D2; kế hoạch I25, mục 1.6): mốc tối thiểu đang hiệu lực = dòng `vc_dispatch_policy` mới nhất có `valid_from_at` ≤ bây giờ. Không cần
 * quyền (chính sách công khai trong công ty — [TK] §1.11). CHỈ gốc lắp ráp gọi, để tiêm `ctx.mocToiThieu` cho orders (Task A10) — orders không được đọc
 * bảng vc_. `null` = bảng rỗng → orders CHẶN lệnh cần mốc, không đoán con số.
 */
export async function mocToiThieuHienHanh(db: D1Database): Promise<MocToiThieu | null> {
  const r = await chinhSachHienHanh(db);
  return r ? { phut: r.min_lead_minutes, policyId: r.id, canhBaoPhut: r.warn_lead_minutes } : null;
}

/** HÀM CÔNG BỐ (ADR-0040 D1; GB2/R23): mốc "sắp hết hạn" đang hiệu lực — CHỈ gốc lắp ráp gọi, để tiêm `ctx.nguongHetHan` cho parties (không import van-chuyen). */
export const nguongHetHanHienHanh = (db: D1Database): Promise<number> => currentWarnDays(db, new Date().toISOString());

/** HÀM CÔNG BỐ (ADR-0068 Đ2) — CHỈ gốc lắp ráp gọi (ctx.gopHoSo của route gộp hồ sơ ở parties). Khe giữa kiểm và ghi chấp nhận được, R-PTY-MERGE-4 bắt nếu lọt. */
export { viecXeCuaNguoi } from "./chuyen-repo";
// TIN CHUYẾN (ADR-0052 D6.3): CHỈ gốc lắp ráp gọi (bài siết ở src/architecture.test.ts) — thongbao nhận dữ kiện qua ctx.chuyenChoTin.
export { chuyenChoTinTheoId, suKienTheoYeuCau } from "./chuyen-repo";
/** ADR-0104 Đ2.1 — máy đồng bộ chuyến theo đơn: CHỈ gốc lắp ráp gọi (`ctx.dongBoChuyen`; bài siết ở src/architecture.test.ts). */
export { dongBoChuyenChoDon } from "./dong-bo-don";

// ---- Chính sách điều phối, điều kiện xuất bến, hạng bằng, danh mục lý do (ADR-0049 D2; kế hoạch mục 1.7 route 9–18, Task A7) ------------------------------
// Chính sách / điều kiện / hạng bằng: dòng có ngày hiệu lực, CHỈ THÊM, `valid_from_at` = lúc ghi (I28). Hai lần ghi cùng mili-giây vấp khoá duy nhất → 409
// stale (tiền lệ Ruling R19). Mã lạ trỏ danh mục của parties vấp khoá ngoại → 400 (van-chuyen không đọc thẳng bảng của parties; cả lô huỷ, không nhật ký).
/** Dòng chính sách hiện hành → giá trị `ChinhSachMoi` (cùng nghĩa với thân POST đầy đủ) — dùng chung cho route đầy đủ và route mốc (ADR-0128 Q1). */
const chinhSachTuDong = (cu: NonNullable<Awaited<ReturnType<typeof currentDispatchPolicy>>>): ChinhSachMoi => ({
  minLeadMinutes: cu.min_lead_minutes, warnLeadMinutes: cu.warn_lead_minutes, restMinutes: cu.rest_minutes, requireManifest: cu.require_manifest === 1,
  proxyBackdateMaxMinutes: cu.proxy_backdate_max_minutes, dutyDayMaxMinutes: cu.duty_day_max_minutes, tripNoBreakMaxMinutes: cu.trip_no_break_max_minutes,
  departureWindowMinutes: cu.departure_window_minutes, refuseLeadMinutes: cu.refuse_lead_minutes, officePhone: cu.office_phone, acceptWaitMinutes: cu.accept_wait_minutes,
  autoConfirmTransfer: cu.auto_confirm_transfer === 1,
});
const CHI_QUAN_TRI_MOC = () => error(403, "forbidden", "Chỉ Quản trị hoặc Toàn quyền đặt được mốc ra lệnh.");
const CHI_TOAN_QUYEN = () => error(403, "forbidden", "Chỉ người phụ trách hệ thống xem và đổi được chính sách điều phối xe.");
const LOI_KHOA_NGOAI = /FOREIGN KEY constraint failed/;
const toPolicyDto = (r: DispatchPolicyRow, currentId: string | null, nhan: ReadonlyMap<string, string> | null): DispatchPolicyDto => ({
  id: r.id,
  minLeadMinutes: r.min_lead_minutes,
  warnLeadMinutes: r.warn_lead_minutes,
  restMinutes: r.rest_minutes,
  requireManifest: r.require_manifest === 1,
  requireContract: r.require_contract === 1,
  proxyBackdateMaxMinutes: r.proxy_backdate_max_minutes,
  dutyDayMaxMinutes: r.duty_day_max_minutes,
  tripNoBreakMaxMinutes: r.trip_no_break_max_minutes,
  departureWindowMinutes: r.departure_window_minutes,
  refuseLeadMinutes: r.refuse_lead_minutes,
  officePhone: r.office_phone,
  acceptWaitMinutes: r.accept_wait_minutes,
  autoConfirmTransfer: r.auto_confirm_transfer === 1,
  validFrom: r.valid_from_at,
  current: r.id === currentId,
  nguoiLuu: r.created_by === null ? null : (nhan?.get(r.created_by) ?? null),
});
// R-P23: "ai lưu" = nhãn qua hàm tiêm `ctx.nhanNhanVien` (R-P20) — gom id rồi gọi MỘT lần; thiếu hàm tiêm → null (để trống, không đoán).
async function respondChinhSach(
  db: D1Database,
  nhanNhanVien: (ids: readonly string[]) => Promise<Map<string, string> | null>,
  status = 200,
): Promise<Response> {
  const rows = await listDispatchPolicies(db); // mới trước
  const now = new Date().toISOString();
  const cur = rows.find((r) => r.valid_from_at <= now) ?? null;
  const nhan = await nhanNhanVien([...new Set(rows.flatMap((r) => (r.created_by === null ? [] : [r.created_by])))]);
  return json(
    { current: cur ? toPolicyDto(cur, cur.id, nhan) : null, history: rows.map((r) => toPolicyDto(r, cur?.id ?? null, nhan)) } satisfies DispatchPolicyResponse,
    status,
  );
}
const toRuleDto = (r: DepartureRuleRow, now: string): DepartureRuleDto => ({
  id: r.id,
  minCapacity: r.min_capacity,
  subject: r.subject,
  documentTypeCode: r.vehicle_document_type_code ?? r.person_document_type_code ?? "",
  documentTypeName: r.vehicle_document_type_name,
  validFrom: r.valid_from_at,
  validTo: r.valid_to_at,
  active: r.valid_from_at <= now && (r.valid_to_at === null || r.valid_to_at > now),
});
async function respondDieuKien(db: D1Database, status = 200): Promise<Response> {
  const now = new Date().toISOString();
  return json({ rules: (await listDepartureRules(db)).map((r) => toRuleDto(r, now)) } satisfies DepartureRuleListResponse, status);
}
const tenLoaiDieuKien = (r: Pick<DepartureRuleRow, "vehicle_document_type_name" | "vehicle_document_type_code" | "person_document_type_code">): string =>
  r.vehicle_document_type_name ?? r.vehicle_document_type_code ?? r.person_document_type_code ?? "";
async function respondHangBang(db: D1Database, status = 200): Promise<Response> {
  const rows = await listLicenseCapacity(db); // theo hạng, mới trước
  const now = new Date().toISOString();
  const currentIds = new Set<string>();
  const hangDaCo = new Set<string>();
  for (const r of rows) {
    if (r.valid_from_at > now || hangDaCo.has(r.license_class_code)) continue;
    hangDaCo.add(r.license_class_code);
    currentIds.add(r.id);
  }
  const dto = (r: LicenseCapacityRow): LicenseCapacityDto => ({ id: r.id, classCode: r.license_class_code, maxPassengers: r.max_passengers, validFrom: r.valid_from_at, current: currentIds.has(r.id) });
  return json({ current: rows.filter((r) => currentIds.has(r.id)).map(dto), history: rows.map(dto) } satisfies LicenseCapacityResponse, status);
}
const toReasonDto = (r: TripReasonRow): TripReasonDto => ({
  code: r.code,
  group: r.reason_group as NhomLyDo,
  groupLabel: NHAN_NHOM_LY_DO[r.reason_group as NhomLyDo] ?? r.reason_group,
  label: r.label,
  active: r.active === 1,
  sortOrder: r.sort_order,
  updatedAt: r.updated_at,
  heThong: laLyDoHeThong(r.code),
});
async function respondLyDo(db: D1Database, status = 200): Promise<Response> {
  return json({ reasons: (await listTripReasons(db)).map(toReasonDto) } satisfies TripReasonListResponse, status);
}

/** Danh mục loại giấy tờ xe cho một lần kiểm (mọi loại, kể cả đã ngưng — sửa sai dòng cũ vẫn cần `hasExpiry`) + tra tên cho nhật ký. */
async function danhMucXe(db: D1Database, homNay: string): Promise<{ dm: DanhMucGiayToXe; tenLoai: (c: string) => string }> {
  const types = await listVehicleDocumentTypes(db);
  return {
    dm: { loai: new Map(types.map((t) => [t.code, { hasExpiry: t.has_expiry === 1, active: t.active === 1 }])), homNay },
    tenLoai: (c) => types.find((t) => t.code === c)?.name ?? c,
  };
}

const ADMIN_ONLY = () => error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");

/** Lịch sử mẫu đưa đón (mới trước) → DTO từng KHOÁ; bản hiện hành = bản mới nhất đã tới. */
function lichSuMauChang(code: string, rows: readonly LegTemplateRow[]): MauChangLichSuResponse {
  const ban = (r: LegTemplateRow): MauChangBanDto => ({
    mode: r.mode,
    returnTimeHint: r.return_time_hint,
    noiTraMacDinh: r.default_dropoff_location_id !== null ? { id: r.default_dropoff_location_id, ten: r.noi_tra_ten ?? "", dangDung: r.noi_tra_active === 1 } : null,
    tuLuc: r.valid_from_at,
    createdBy: r.created_by,
  });
  const now = new Date().toISOString();
  const hien = rows.find((r) => r.valid_from_at <= now);
  return { code, hienHanh: hien ? ban(hien) : null, lichSu: rows.map(ban) };
}

/** Danh mục loại giấy tờ xe (cả loại đã ngưng) + ngưỡng đang hiệu lực. */
async function respondMeta(db: D1Database, status = 200): Promise<Response> {
  const [types, warnDays] = await Promise.all([listVehicleDocumentTypes(db), currentWarnDays(db, new Date().toISOString())]);
  return json({
    documentTypes: types.map((t) => ({ code: t.code, name: t.name, hasExpiry: t.has_expiry === 1, sortOrder: t.sort_order, active: t.active === 1, updatedAt: t.updated_at })),
    warnDays,
  } satisfies VanChuyenMetaResponse, status);
}

function dbProblem(e: unknown): Response | null {
  const p = loiRangBuocXe(e instanceof Error ? e.message : "");
  return p ? error(p.status, p.code, p.message) : null;
}

const KHONG_CANH_BAO: CanhBaoXe = { alert: "none", alertTypeName: null, alertDaysLeft: null, alertCount: 0 };
const toVehicleDto = (r: VehicleRow, cb: CanhBaoXe): VehicleDto => ({
  id: r.id,
  plateNumber: r.plate_number,
  chassisNumber: r.chassis_number,
  name: r.name,
  modelYear: r.model_year,
  passengerCapacity: r.passenger_capacity,
  status: r.status,
  validFrom: r.valid_from_date,
  validTo: r.valid_to_date,
  ...(r.status === "retired" ? KHONG_CANH_BAO : cb),
  updatedAt: r.updated_at,
  ownerPartyId: r.owner_party_id,
  ownerName: r.owner_name,
  ownerIsCompany: r.owner_is_company === 1,
});
const toVehicleDocDto = (d: VehicleDocRow, today: string): VehicleDocumentDto => ({
  id: d.id,
  typeCode: d.document_type_code,
  typeName: d.type_name,
  number: d.document_number,
  issuedDate: d.issued_date,
  expiryDate: d.expiry_date,
  daysLeft: d.expiry_date === null ? null : soNgayConLai(d.expiry_date, today),
  previousId: d.previous_id,
  current: d.is_current === 1,
  voided: d.voided_at !== null,
  updatedAt: d.updated_at,
});

/** Cảnh báo giấy tờ theo từng xe (giấy hiện hành có hạn ≤ hôm nay + ngưỡng đang hiệu lực). */
async function canhBaoTheoXe(db: D1Database, now: Date): Promise<(vehicleId: string) => CanhBaoXe> {
  const today = vnToday(now);
  const warnDays = await currentWarnDays(db, now.toISOString());
  const rows = await expiringVehicleDocuments(db, addDays(today, warnDays));
  return (vehicleId) => canhBaoXe(rows.filter((r) => r.vehicle_id === vehicleId).map((r) => ({ typeName: r.type_name, expiryDate: r.expiry_date })), today, warnDays);
}

/** Một xe + giấy tờ của nó (đủ lịch sử). */
async function respondVehicle(db: D1Database, id: string, status = 200): Promise<Response> {
  const now = new Date();
  const [row, docs, cb] = await Promise.all([findVehicle(db, id), listVehicleDocuments(db, id), canhBaoTheoXe(db, now)]);
  if (!row) return NOT_FOUND();
  const today = vnToday(now);
  return json({ vehicle: toVehicleDto(row, cb(id)), documents: docs.map((d) => toVehicleDocDto(d, today)) } satisfies VehicleResponse, status);
}

/** Nhãn thay đổi cho nhật ký sửa xe — biển số là định danh của xe (không phải "số giấy tờ"), mở đầu `detail` (giả định G12). `chuMoi` ≠ null khi đổi chủ
 * xe (ADR-0048 Q1 = (a)): ghi "chủ xe <tên cũ> → <tên mới>" — TÊN hiển thị, không liên hệ, không MST. */
function thayDoiXe(cu: VehicleRow, moi: XeSua, chuMoi: string | null = null): string {
  const doi: string[] = [];
  if (chuMoi !== null) doi.push(`chủ xe ${cu.owner_name} → ${chuMoi}`);
  if (cu.plate_number !== moi.plateNumber) doi.push(`biển số ${cu.plate_number} → ${moi.plateNumber}`);
  if ((cu.chassis_number ?? "") !== moi.chassisNumber) doi.push("số khung");
  if (cu.name !== moi.name) doi.push(`tên ${cu.name} → ${moi.name}`);
  if (cu.model_year !== moi.modelYear) doi.push(`đời xe ${cu.model_year ?? "—"} → ${moi.modelYear ?? "—"}`);
  if (cu.passenger_capacity !== moi.passengerCapacity) doi.push(`số người được chở ${cu.passenger_capacity} → ${moi.passengerCapacity}`);
  if (cu.status !== moi.status) doi.push(`trạng thái ${TRANG_THAI_XE[cu.status]} → ${TRANG_THAI_XE[moi.status]}`);
  return `xe ${cu.plate_number}: ${doi.length ? doi.join("; ") : "không đổi gì"}`;
}

/**
 * ADR-0048 D1, B1.1 (lớp route): chủ xe được chọn → hồ sơ chủ; `null` = công ty chủ (mặc định, như ADR-0040 D1). Chủ phải là công ty chủ HIỆN TẠI hoặc nhà xe
 * đang hợp tác (hàm công bố nhaXeDangHopTac) — không thì 409 vehicle_owner_not_carrier. `tenNhaXe` ≠ null khi chủ là nhà xe (ghi nhật ký).
 */
async function xacDinhChuXe(db: D1Database, ownerPartyId: string | null): Promise<{ partyId: string; ten: string; tenNhaXe: string | null } | Response> {
  const congTy = await ownerCompany(db);
  if (ownerPartyId === null || ownerPartyId === congTy?.partyId) return congTy ? { partyId: congTy.partyId, ten: congTy.displayName, tenNhaXe: null } : NO_OWNER();
  const nhaXe = (await nhaXeDangHopTac(db)).find((c) => c.partyId === ownerPartyId);
  return nhaXe ? { partyId: nhaXe.partyId, ten: nhaXe.displayName, tenNhaXe: nhaXe.displayName } : OWNER_NOT_CARRIER();
}

/** R15 điểm 1 (lớp route): biển số / số khung đã thuộc xe khác → phản hồi 409; `exceptId` = chính xe đang sửa (thêm xe: chuỗi rỗng). */
async function trungXe(db: D1Database, v: XeNhap | XeSua, exceptId: string): Promise<Response | null> {
  if (v.status !== "retired" && (await plateHolder(db, v.plateKey, exceptId))) return PLATE_TAKEN();
  if (await chassisHolder(db, v.chassisKey, exceptId)) return CHASSIS_TAKEN();
  return null;
}

export const vanChuyenModule: AppModule = {
  name: "van-chuyen",
  routes: [
    route("GET", "/api/van-chuyen/xe", "office", async ({ env, staff, url }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      // ADR-0048 D1: `?chu=<partyId>` lọc theo chủ xe (vắng hoặc rỗng = mọi xe); sai khuôn → 400.
      const chu = url.searchParams.get("chu") || null;
      if (chu !== null && !PARTY_ID_RE.test(chu)) return BAD_OWNER_FILTER();
      const [rows, cb] = await Promise.all([chu === null ? listVehicles(env.DB) : listVehiclesOfOwner(env.DB, chu), canhBaoTheoXe(env.DB, new Date())]);
      return json({ vehicles: rows.map((r) => toVehicleDto(r, cb(r.id))) } satisfies VehicleListResponse);
    }),

    route("POST", "/api/van-chuyen/xe", "office", async ({ request, env, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const now = new Date();
      const parsed = kiemXeMoi(await readJson(request), vnToday(now));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      // ADR-0040 D1: chủ xe mặc định = hồ sơ công ty chủ LÚC THÊM (đổi công ty chủ sau này không tự đổi chủ xe). ADR-0048 D1 (B1.1 lớp route): chọn được nhà
      // xe đang hợp tác — kiểm qua hàm công bố nhaXeDangHopTac của parties (không xuất hàm "isCarrier" riêng).
      const chu = await xacDinhChuXe(env.DB, v.ownerPartyId);
      if (chu instanceof Response) return chu;
      const trung = await trungXe(env.DB, v, "");
      if (trung) return trung;
      const id = crypto.randomUUID();
      const at = now.toISOString();
      try {
        await env.DB.batch([
          insertVehicleStatement(env.DB, id, v, chu.partyId, staff.id, at),
          auditStatement(env.DB, {
            staffId: staff.id, action: "vehicle_created", at, targetType: "vehicle", targetId: id,
            // G7: tên nhà xe (tên hiển thị — không liên hệ, không MST) khi chủ không phải công ty chủ.
            detail: `xe ${v.plateNumber}: thêm ${v.name}, ${v.passengerCapacity} người${chu.tenNhaXe ? `; chủ: ${chu.tenNhaXe}` : ""}`,
          }),
        ]);
      } catch (e) {
        const p = dbProblem(e);
        if (p) return p;
        throw e;
      }
      return kemLocation(await respondVehicle(env.DB, id, 201), `/xe-chi-tiet?id=${id}`);
    }),

    route("GET", "/api/van-chuyen/xe/:id", "office", async ({ env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      return UUID_RE.test(id) ? respondVehicle(env.DB, id) : NOT_FOUND();
    }),

    route("PUT", "/api/van-chuyen/xe/:id", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const cu = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      if (!cu) return NOT_FOUND();
      const now = new Date();
      const parsed = kiemSuaXe(await readJson(request), { status: cu.status, validFrom: cu.valid_from_date, validTo: cu.valid_to_date }, vnToday(now));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      // ADR-0048 D1, Q1 = (a): đổi chủ xe (sửa nhập nhầm) — chỉ kiểm khi chủ ĐỔI (không gửi, hoặc gửi đúng chủ hiện tại → giữ nguyên, kể cả xe của công ty chủ cũ).
      let chuMoi: { partyId: string; ten: string } | null = null;
      if (v.ownerPartyId !== null && v.ownerPartyId !== cu.owner_party_id) {
        const chu = await xacDinhChuXe(env.DB, v.ownerPartyId);
        if (chu instanceof Response) return chu;
        chuMoi = chu;
      }
      // R15 điểm 1: sửa biển, hoặc DÙNG LẠI xe đã ngừng (Ngừng → Đang dùng/Bảo dưỡng) — biển không được đang thuộc xe khác chưa ngừng.
      const trung = await trungXe(env.DB, v, id);
      if (trung) return trung;
      const at = now.toISOString();
      let results: D1Result[];
      try {
        results = await env.DB.batch([
          updateVehicleStatement(env.DB, id, v, chuMoi?.partyId ?? cu.owner_party_id, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "vehicle_updated", at, targetType: "vehicle", targetId: id, detail: thayDoiXe(cu, v, chuMoi?.ten ?? null) }, "changes() > 0"),
        ]);
      } catch (e) {
        const p = dbProblem(e);
        if (p) return p;
        throw e;
      }
      if ((results[0]!.meta.changes ?? 0) === 0) return STALE();
      return respondVehicle(env.DB, id);
    }),

    // ---- Giấy tờ xe (Task A14): thứ tự 403 ô → 404 xe → 409 xe đã ngừng (thêm, gia hạn) → 404 dòng → 400 thân → 409 loại đã có dòng hiện hành (thêm — ADR-0056 VK3-B, `document_type_exists`; lớp CSDL `document_type_conflict`) → 409 dòng hiện hành (gia hạn, sửa sai) → ghi + nhật ký cùng lô
    // (chi tiết mở đầu bằng biển số, KHÔNG số) → 409 stale. Lớp CSDL (trigger) trả document_changed — khác document_not_current của lớp route.
    route("POST", "/api/van-chuyen/xe/:id/giay-to", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const xe = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      if (!xe) return NOT_FOUND();
      if (xe.status === "retired") return RETIRED();
      const now = new Date();
      const d = await danhMucXe(env.DB, vnToday(now));
      const parsed = kiemThemGiayToXe(await readJson(request), d.dm);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      if (await hasCurrentVehicleDocOfType(env.DB, id, v.typeCode)) return DOC_TYPE_EXISTS(d.tenLoai(v.typeCode));
      const at = now.toISOString();
      try {
        await env.DB.batch([
          insertVehicleDocStatement(env.DB, crypto.randomUUID(), id, v, null, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "vehicle_document_added", at, targetType: "vehicle", targetId: id, detail: chiTietNhatKyXe(xe.plate_number, { loai: d.tenLoai(v.typeCode), hetHan: v.expiryDate }) }),
        ]);
      } catch (e) {
        const p = dbProblem(e);
        if (p) return p;
        throw e;
      }
      return kemLocation(await respondVehicle(env.DB, id, 201), `/xe-chi-tiet?id=${id}`);
    }),

    route("POST", "/api/van-chuyen/xe/:id/giay-to/:did/gia-han", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const xe = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      if (!xe) return NOT_FOUND();
      if (xe.status === "retired") return RETIRED();
      const did = params.did ?? "";
      const cu = UUID_RE.test(did) ? await findVehicleDocument(env.DB, did, id) : null;
      if (!cu) return DOC_NOT_FOUND();
      const now = new Date();
      const d = await danhMucXe(env.DB, vnToday(now));
      // Gia hạn = dòng MỚI; không gửi số thì chép số dòng trước.
      const parsed = kiemGiaHanXe(await readJson(request), { typeCode: cu.document_type_code, number: cu.document_number }, d.dm);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (cu.is_current !== 1) return DOC_NOT_CURRENT();
      const v = parsed.value;
      const at = now.toISOString();
      try {
        await env.DB.batch([
          insertVehicleDocStatement(env.DB, crypto.randomUUID(), id, v, did, staff.id, at),
          auditStatement(env.DB, {
            staffId: staff.id, action: "vehicle_document_renewed", at, targetType: "vehicle", targetId: id,
            detail: chiTietNhatKyXe(xe.plate_number, { loai: d.tenLoai(v.typeCode), giaHan: true, truoc: cu.expiry_date, sau: v.expiryDate }),
          }),
        ]);
      } catch (e) {
        const p = dbProblem(e);
        if (p) return p;
        throw e;
      }
      return kemLocation(await respondVehicle(env.DB, id, 201), `/xe-chi-tiet?id=${id}`);
    }),

    route("POST", "/api/van-chuyen/xe/:id/giay-to/:did/sua-sai", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const xe = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      if (!xe) return NOT_FOUND();
      const did = params.did ?? "";
      const cu = UUID_RE.test(did) ? await findVehicleDocument(env.DB, did, id) : null;
      if (!cu) return DOC_NOT_FOUND();
      const now = new Date();
      const d = await danhMucXe(env.DB, vnToday(now));
      const hienHanh = { typeCode: cu.document_type_code, number: cu.document_number, issuedDate: cu.issued_date, expiryDate: cu.expiry_date };
      const parsed = kiemSuaSaiXe(await readJson(request), hienHanh, d.dm);
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      if (cu.is_current !== 1) return DOC_NOT_CURRENT();
      const s = parsed.value;
      const at = now.toISOString();
      const loai = d.tenLoai(cu.document_type_code);
      let ghi: D1PreparedStatement;
      let detail: string;
      if (s.huy) {
        ghi = voidVehicleDocStatement(env.DB, did, id, s.expectedUpdatedAt, staff.id, at);
        detail = chiTietNhatKyXe(xe.plate_number, { loai, lyDo: s.lyDo });
      } else {
        const moi = { ...hienHanh, [s.truong]: s.giaTri };
        ghi = updateVehicleDocStatement(env.DB, did, id, s.expectedUpdatedAt, moi, staff.id, at);
        const ngay = s.truong === "issuedDate" || s.truong === "expiryDate";
        detail = chiTietNhatKyXe(xe.plate_number, { loai, lyDo: s.lyDo, truoc: ngay ? hienHanh[s.truong] : null, sau: ngay ? moi[s.truong] : null });
      }
      let results: D1Result[];
      try {
        results = await env.DB.batch([ghi, auditStatement(env.DB, { staffId: staff.id, action: "vehicle_document_corrected", at, targetType: "vehicle", targetId: id, detail }, "changes() > 0")]);
      } catch (e) {
        const p = dbProblem(e);
        if (p) return p;
        throw e;
      }
      if ((results[0]!.meta.changes ?? 0) === 0) return DOC_STALE();
      return respondVehicle(env.DB, id);
    }),

    // ---- ADR-0055 VK2-A (Đợt 3): khung bận của xe — ô vehicle.manage ĐẦU thân (403 trước 400). Thứ tự: 403 → 404 xe → 409 xe ngừng (chỉ ghi) → 400 thân →
    // 400 lý do ngoài nhóm / ngưng → 409 chồng chuyến (lớp route, liệt kê mã chuyến) → lô ghi + nhật ký → lỗi CSDL (mã lớp CSDL khác).
    route("GET", "/api/van-chuyen/xe/:id/ban", "office", async ({ env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const xe = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      return xe ? respondKhungBan(env.DB, id) : NOT_FOUND();
    }),
    route("POST", "/api/van-chuyen/xe/:id/ban", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const xe = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      if (!xe) return NOT_FOUND();
      if (xe.status === "retired") return RETIRED();
      const now = new Date();
      const parsed = kiemKhungBanMoi(await readJson(request), now.getTime());
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const k = parsed.value;
      const lyDo = (await lyDoBanXe(env.DB)).find((r) => r.code === k.lyDo);
      if (!lyDo) return error(400, "invalid_input", "Lý do không có trong danh mục lý do xe bận.");
      // Q-L2-1 = a (lớp route): chuyến chưa huỷ, chưa kết thúc của xe chồng khung → 409 liệt kê mã chuyến + giờ (không tên khách).
      const vuong = chuyenVuongKhung({ xeId: id, ...k }, (await tripsTouching(env.DB, k.batDauMs, k.ketThucMs)).map(khungChuyen));
      if (vuong.length > 0) {
        const dau = vuong[0]!;
        return json({
          error: {
            code: "khung_ban_chong_chuyen", message: `Xe đang có chuyến ${dau.ma} lúc ${nhanKhoangGio(dau.batDauMs, dau.ketThucMs)} — dời hoặc đổi xe chuyến đó trước.`,
            chuyen: vuong.map((c) => ({ ma: c.ma, gio: nhanKhoangGio(c.batDauMs, c.ketThucMs) })),
          },
        } satisfies KhungBanChongChuyenLoi, 409);
      }
      const at = now.toISOString();
      try {
        await env.DB.batch([
          insertKhungBanStatement(env.DB, crypto.randomUUID(), id, k, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "vehicle_unavailability_added", at, targetType: "vehicle", targetId: id, detail: chiTietNhatKyKhung(xe.plate_number, k, lyDo.label) }),
        ]);
      } catch (e) {
        const p = loiRangBuocKhungBan(e instanceof Error ? e.message : "");
        if (p) return error(p.status, p.code, p.message);
        throw e;
      }
      return kemLocation(await respondKhungBan(env.DB, id, 201), "/lich-xe-ban"); // ADR-0094 A-10: trang gọi route này (web/lich-xe-ban.ts)
    }),
    route("POST", "/api/van-chuyen/xe/:id/ban/:bid/rut", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const xe = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      if (!xe) return NOT_FOUND();
      const bid = params.bid ?? "";
      const k = UUID_RE.test(bid) ? await khungBanTheoId(env.DB, bid, id) : null;
      if (!k) return error(404, "not_found", "Không có khung bận này.");
      const parsed = kiemRutKhung(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const now = new Date();
      if (k.withdrawn_at !== null || k.version !== parsed.value.version) return error(409, "khung_ban_vua_doi_route", CAU_KHUNG_VUA_DOI);
      if (k.end_ms <= now.getTime()) return error(409, "khung_ban_da_qua", "Khung này đã qua — giữ trong lịch sử, không rút.");
      const at = now.toISOString();
      let kq: D1Result[];
      try {
        kq = await env.DB.batch([
          rutKhungBanStatement(env.DB, bid, parsed.value.version, at, staff.id),
          auditStatement(env.DB, {
            staffId: staff.id, action: "vehicle_unavailability_withdrawn", at, targetType: "vehicle", targetId: id,
            detail: chiTietNhatKyKhung(xe.plate_number, { batDauMs: k.start_ms, ketThucMs: k.end_ms }, k.reason_label, true),
          }, "changes() > 0"),
        ]);
      } catch (e) {
        const p = loiRangBuocKhungBan(e instanceof Error ? e.message : "");
        if (p) return error(p.status, p.code, p.message);
        throw e;
      }
      if ((kq[0]!.meta.changes ?? 0) === 0) return error(409, "khung_ban_vua_doi_route", CAU_KHUNG_VUA_DOI);
      return respondKhungBan(env.DB, id);
    }),
    // Dải "Tài xế bận" của văn phòng (ADR-0053 D9; kế hoạch A4 T8, G-A4-19): ô trip.dispatch (ô any của văn phòng — không ngữ cảnh là đúng ở đây; Kế toán,
    // tài xế → 403). Không lý do (lời chủ 6.2). Ô chọn tài xế ở màn sửa chuyến dùng CÙNG route (không thêm route).
    route("GET", "/api/van-chuyen/ban-tai-xe", "office", async ({ env, url, staff }) => {
      if (!can(staff, "trip.dispatch")) return error(403, "forbidden", "Tài khoản này không xem lịch tài xế bận.");
      return banTaiXeResponse(env.DB, url, Date.now());
    }),
    // Trang tuần "Lịch xe bận" (bản vẽ 2/10): ô vehicle.manage (câu 3.4 — chỉ Quản trị + Toàn quyền), 403 trước 400. Tuần = MỘT luật với màn (vnWeekRange),
    // khoảng chặn bằng nửa đêm VN. Chuyến đã xếp chỉ khi có trip.view, DANH SÁCH TRẮNG (câu 3.1).
    route("GET", "/api/van-chuyen/ban-xe", "office", async ({ env, url, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const now = new Date();
      const tuGui = url.searchParams.get("tu");
      if (tuGui !== null && !isISODate(tuGui)) return error(400, "invalid_input", "Tuần xem: YYYY-MM-DD.");
      const { from: tu, to: den } = vnWeekRange(tuGui ?? vnToday(now));
      const tuMs = vnLocalToMs(tu, "00:00")!;
      const denMs = vnLocalToMs(addDays(tu, 7), "00:00")!;
      const bayGioMs = now.getTime();
      const [xeRows, khung, lyDo, trips] = await Promise.all([
        xeDieuPhoi(env.DB), khungBanXeTrongKhoang(env.DB, tuMs, denMs), lyDoBanXe(env.DB), can(staff, "trip.view") ? tripsTouching(env.DB, tuMs, denMs) : Promise.resolve([]),
      ]);
      const chuyen: ChuyenXeBanDto[] = trips.filter((t) => t.status !== "CANCELLED" && t.planned_start_ms < denMs && t.planned_end_ms > tuMs) // tripsTouching trả MỌI chuyến đang chạy
        .map((t) => ({ id: t.id, ma: t.code, xeId: t.vehicle_id, batDauMs: t.planned_start_ms, ketThucMs: t.planned_end_ms, trangThai: t.status as ChuyenXeBanDto["trangThai"] }));
      return json({
        tu, den,
        xe: xeRows.map((x) => ({ id: x.id, bienSo: x.plate_number, soCho: x.passenger_capacity, trangThai: x.status as "active" | "maintenance", chuXe: x.owner_name, chuLaCongTy: x.owner_is_company === 1 })),
        khung: khung.map((r) => khungBanXeDto(r, bayGioMs)), chuyen, lyDo,
      } satisfies LichXeBanResponse);
    }),

    // ---- ADR-0049 D2 (Task A7): chính sách điều phối, điều kiện xuất bến, hạng bằng — cổng office + ô settings.ops (chỉ Toàn quyền) viết thẳng ở đầu thân,
    // kể cả route ĐỌC (luật (1b) hàng rào 2). Khác tiền lệ `nguong-het-han` (cổng admin): ADR-0049 D3 ghi rõ cổng office.
    route("GET", "/api/van-chuyen/chinh-sach-dieu-phoi", "office", async ({ env, staff, nhanNhanVien }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      return respondChinhSach(env.DB, nhanNhanVien);
    }),

    route("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", "office", async ({ request, env, staff, nhanNhanVien }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      const parsed = kiemChinhSachMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const at = new Date().toISOString();
      const cu = await currentDispatchPolicy(env.DB, at);
      const truoc = cu ? chinhSachTuDong(cu) : null;
      try {
        await env.DB.batch([
          insertDispatchPolicyStatement(env.DB, crypto.randomUUID(), parsed.value, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "dispatch_policy_changed", at, detail: chiTietChinhSach(truoc, parsed.value) }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: vc_dispatch_policy\.valid_from_at/.test(e.message)) return error(409, "stale", "Vừa có người đổi chính sách, tải lại rồi thử lại.");
        throw e;
      }
      return kemLocation(await respondChinhSach(env.DB, nhanNhanVien, 201), "/chinh-sach-dieu-phoi");
    }),

    // ---- ADR-0128 Q1: MỐC RA LỆNH do Quản trị đặt — route hẹp, ô riêng `dispatch.policy.lead` (Quản trị, Toàn quyền). Chỉ đổi hai con số; mọi cột khác chép nguyên từ
    // bản hiện hành (cùng luật kiểm với route đầy đủ — `kiemChinhSachMoi`). Chính sách đầy đủ vẫn chỉ `settings.ops`.
    route("GET", "/api/van-chuyen/moc-ra-lenh", "office", async ({ env, staff }) => {
      if (!can(staff, "dispatch.policy.lead")) return CHI_QUAN_TRI_MOC();
      const cu = await currentDispatchPolicy(env.DB, new Date().toISOString());
      if (!cu) return error(404, "not_found", "Chưa có chính sách điều phối.");
      return json({ minLeadMinutes: cu.min_lead_minutes, warnLeadMinutes: cu.warn_lead_minutes } satisfies MocRaLenhResponse);
    }),

    route("POST", "/api/van-chuyen/moc-ra-lenh", "office", async ({ request, env, staff }) => {
      if (!can(staff, "dispatch.policy.lead")) return CHI_QUAN_TRI_MOC();
      const body = await readJson(request);
      const khoaDuocPhep = new Set(["minLeadMinutes", "warnLeadMinutes"]);
      if (!body || Object.keys(body).some((k) => !khoaDuocPhep.has(k)) || body.minLeadMinutes === undefined || body.warnLeadMinutes === undefined) {
        return error(400, "invalid_input", "Chỉ gửi mốc tối thiểu và cảnh báo sát mốc (cả hai số phút).");
      }
      const at = new Date().toISOString();
      const cu = await currentDispatchPolicy(env.DB, at);
      if (!cu) return error(404, "not_found", "Chưa có chính sách điều phối.");
      const truoc = chinhSachTuDong(cu);
      // Bản đầy đủ = bản hiện hành + hai số mới, đi qua ĐÚNG hàm kiểm của route đầy đủ (biên, kiểu số nguyên, các khoá bắt buộc I43).
      const parsed = kiemChinhSachMoi({ ...truoc, minLeadMinutes: body.minLeadMinutes, warnLeadMinutes: body.warnLeadMinutes });
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      try {
        await env.DB.batch([
          insertDispatchPolicyStatement(env.DB, crypto.randomUUID(), parsed.value, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "dispatch_policy_changed", at, detail: chiTietChinhSach(truoc, parsed.value) }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: vc_dispatch_policy\.valid_from_at/.test(e.message)) return error(409, "stale", "Vừa có người đổi chính sách, tải lại rồi thử lại.");
        throw e;
      }
      return json({ minLeadMinutes: parsed.value.minLeadMinutes, warnLeadMinutes: parsed.value.warnLeadMinutes } satisfies MocRaLenhResponse);
    }),

    route("GET", "/api/van-chuyen/dieu-kien", "office", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      return respondDieuKien(env.DB);
    }),

    route("POST", "/api/van-chuyen/dieu-kien", "office", async ({ request, env, staff }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      const parsed = kiemDieuKienMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      // Loại giấy tờ XE: danh mục của chính module → kiểm trước. Loại giấy tờ của NGƯỜI: danh mục của parties → khoá ngoại giữ (lỗi → 400 dưới).
      const loaiXe = v.subject === "VEHICLE" ? await findVehicleDocumentType(env.DB, v.documentTypeCode) : null;
      if (v.subject === "VEHICLE" && !loaiXe) return error(400, "invalid_input", "Không có loại giấy tờ xe này trong danh mục.");
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          insertDepartureRuleStatement(env.DB, crypto.randomUUID(), v, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "departure_rule_added", at, detail: chiTietDieuKien(v, loaiXe?.name ?? v.documentTypeCode) }),
        ]);
      } catch (e) {
        if (e instanceof Error && LOI_KHOA_NGOAI.test(e.message)) return error(400, "invalid_input", "Không có loại giấy tờ này trong danh mục.");
        throw e;
      }
      return kemLocation(await respondDieuKien(env.DB, 201), "/dieu-kien-xuat-ben");
    }),

    route("POST", "/api/van-chuyen/dieu-kien/:id/dong", "office", async ({ env, params, staff }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      const id = params.id ?? "";
      const r = UUID_RE.test(id) ? await findDepartureRule(env.DB, id) : null;
      if (!r) return error(404, "not_found", "Không tìm thấy điều kiện xuất bến.");
      const DA_DONG = () => error(409, "rule_closed", "Điều kiện này đã đóng rồi — tải lại.");
      if (r.valid_to_at !== null) return DA_DONG();
      const at = new Date().toISOString();
      const detail = chiTietDieuKien({ minCapacity: r.min_capacity, subject: r.subject, documentTypeCode: r.vehicle_document_type_code ?? r.person_document_type_code ?? "" }, tenLoaiDieuKien(r));
      const results = await env.DB.batch([
        closeDepartureRuleStatement(env.DB, id, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "departure_rule_closed", at, detail }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return DA_DONG();
      return respondDieuKien(env.DB);
    }),

    route("GET", "/api/van-chuyen/hang-bang", "office", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      return respondHangBang(env.DB);
    }),

    route("POST", "/api/van-chuyen/hang-bang", "office", async ({ request, env, staff }) => {
      if (!can(staff, "settings.ops")) return CHI_TOAN_QUYEN();
      const parsed = kiemHangBangMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = new Date().toISOString();
      const cu = await currentLicenseCapacity(env.DB, v.classCode, at);
      try {
        await env.DB.batch([
          insertLicenseCapacityStatement(env.DB, crypto.randomUUID(), v, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "license_capacity_changed", at, detail: chiTietHangBang(v.classCode, cu ? cu.max_passengers : undefined, v.maxPassengers) }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: vc_license_capacity\./.test(e.message)) return error(409, "stale", "Vừa có người đổi hạng bằng này, tải lại rồi thử lại.");
        if (e instanceof Error && LOI_KHOA_NGOAI.test(e.message)) return error(400, "invalid_input", "Không có hạng bằng này trong danh mục.");
        throw e;
      }
      return kemLocation(await respondHangBang(env.DB, 201), "/dieu-kien-xuat-ben");
    }),

    // Danh mục lý do (ADR-0049 D2 CH-06) — Quản trị sửa: cổng admin + ô admin.manage viết thẳng (luật (4) của hàng rào 2); khuôn loc_location (Ruling R7).
    route("GET", "/api/van-chuyen/ly-do", "admin", async ({ env, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      return respondLyDo(env.DB);
    }),

    route("POST", "/api/van-chuyen/ly-do", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const parsed = kiemLyDoMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          insertTripReasonStatement(env.DB, v, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "trip_reason_added", at, detail: chiTietLyDo(v.code, v.group, v.label) }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: vc_reason\.code/.test(e.message)) return error(409, "code_taken", "Mã này đã có trong danh mục lý do.");
        throw e;
      }
      return kemLocation(await respondLyDo(env.DB, 201), "/ly-do-dieu-phoi");
    }),

    route("PUT", "/api/van-chuyen/ly-do/:code", "admin", async ({ request, env, params, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const code = params.code ?? "";
      const cu = MA_LY_DO_RE.test(code) ? await findTripReason(env.DB, code) : null;
      if (!cu) return error(404, "not_found", "Không tìm thấy lý do.");
      const parsed = kiemSuaLyDo(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      // R-P22: mã lý do máy tự dùng không ngưng được (máy chủ sẽ ghi mã này dù màn không còn chọn được) — sửa nhãn / thứ tự vẫn được.
      if (!v.active && laLyDoHeThong(code)) return error(409, "ly_do_he_thong", "Lý do này do hệ thống tự dùng nên không ngưng được — chỉ sửa được tên và thứ tự.");
      const at = new Date().toISOString();
      const results = await env.DB.batch([
        updateTripReasonStatement(env.DB, code, v, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "trip_reason_updated", at, detail: chiTietLyDo(code, cu.reason_group as NhomLyDo, v.label, v.active) }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return error(409, "stale", "Danh mục lý do vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
      return respondLyDo(env.DB);
    }),

    // ---- MẪU ĐƯA ĐÓN THEO DỊCH VỤ (ADR-0054 D10.1–D10.2; nơi trả mặc định — ADR nháp docs/superpowers/specs/2026-10-01-de-xuat-adr-noi-tra-mac-dinh.md, chủ duyệt
    // 1/10 Q-D = A). Màn Danh mục (Quản trị, Toàn quyền): cổng admin + `admin.manage` ĐẦU thân (luật (4) hàng rào 2) — xem lịch sử, thêm bản mới (hiệu lực ngay).
    // Form lập đơn: cổng orders + `order.create` ĐẦU thân — CHỈ mẫu hiện hành, ba khoá mỗi mã. van-chuyen KHÔNG đọc bảng catalog (mã dịch vụ = tham chiếu logic).
    route("GET", "/api/van-chuyen/mau-chang", "orders", async ({ env, staff }) => {
      if (!can(staff, "order.create")) return error(403, "forbidden", "Tài khoản này không lập đơn nên không cần mẫu đưa đón.");
      const mauChang: MauChangFormResponse["mauChang"] = {};
      for (const r of await legTemplatesCurrent(env.DB, new Date().toISOString())) {
        mauChang[r.code] = {
          mode: r.mode, returnTimeHint: r.return_time_hint,
          // Điểm đã ngưng → null (form gửi id điểm ngưng thì lưu đơn sẽ 400 — ADR nháp D3).
          noiTraMacDinh: r.default_dropoff_location_id !== null && r.noi_tra_active === 1 && r.noi_tra_ten !== null ? { id: r.default_dropoff_location_id, ten: r.noi_tra_ten } : null,
        };
      }
      return json({ mauChang } satisfies MauChangFormResponse);
    }),

    route("GET", "/api/van-chuyen/mau-chang/:code", "admin", async ({ env, params, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const code = params.code ?? "";
      if (!CATALOG_CODE_RE.test(code)) return error(400, "invalid_input", "Mã dịch vụ không hợp lệ.");
      return json(lichSuMauChang(code, await legTemplateHistory(env.DB, code)) satisfies MauChangLichSuResponse);
    }),

    route("POST", "/api/van-chuyen/mau-chang/:code", "admin", async ({ request, env, params, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const code = params.code ?? "";
      if (!CATALOG_CODE_RE.test(code)) return error(400, "invalid_input", "Mã dịch vụ không hợp lệ.");
      const parsed = kiemMauChangMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = new Date().toISOString();
      const lichSu = await legTemplateHistory(env.DB, code);
      const cu = lichSu.find((r) => r.valid_from_at <= at) ?? null;
      // ADR nháp D2: khoá VẮNG = chép điểm của bản hiện hành, TRỪ khi bản mới không đưa đón (chép sẽ vi phạm NT-D1 — 400 bất ngờ) → NULL; null tường minh = bỏ.
      const noiTraId = v.noiTraMacDinhId !== undefined ? v.noiTraMacDinhId : v.mode === "NONE" ? null : (cu?.default_dropoff_location_id ?? null);
      // NT-D3: điểm phải ĐANG DÙNG lúc ghi (cả khi chép từ bản cũ — ruling nhật ký thi công: không ghi bản mới trỏ điểm đã ngưng).
      let noiTra: { id: string; ten: string } | null = null;
      if (noiTraId !== null) {
        const diem = await locationLabel(env.DB, noiTraId);
        if (!diem) return error(400, "invalid_input", "Nơi trả mặc định không có trong danh mục Địa điểm — chọn lại.");
        if (diem.active !== 1) return error(400, "invalid_input", "Nơi trả mặc định là điểm đã ngưng dùng — chọn điểm khác hoặc bỏ nơi trả mặc định.");
        noiTra = { id: diem.id, ten: diem.name };
      }
      const truoc = cu ? { mode: cu.mode, noiTra: cu.default_dropoff_location_id !== null ? { id: cu.default_dropoff_location_id, ten: cu.noi_tra_ten ?? "(điểm không rõ)" } : null } : null;
      try {
        await env.DB.batch([
          insertLegTemplateStatement(env.DB, crypto.randomUUID(), code, { mode: v.mode, returnTimeHint: v.returnTimeHint, noiTraMacDinhId: noiTraId }, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "transfer_template_set", at, detail: chiTietMauChang(code, truoc, { mode: v.mode, returnTimeHint: v.returnTimeHint, noiTra }) }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: vc_leg_template\.code, vc_leg_template\.valid_from_at/.test(e.message)) {
          return error(409, "stale", "Vừa có người đổi mẫu đưa đón của dịch vụ này, tải lại rồi thử lại.");
        }
        throw e;
      }
      return json(lichSuMauChang(code, await legTemplateHistory(env.DB, code)) satisfies MauChangLichSuResponse, 201, { location: "/catalog" });
    }),

    // ---- Danh mục loại giấy tờ xe + ngưỡng "sắp hết hạn" + danh sách giấy tờ sắp hết hạn (Task A15) ---------------------------------------------------------
    route("GET", "/api/van-chuyen/meta", "office", async ({ env, staff }) => {
      // Người quản lý xe (chọn loại khi thêm giấy tờ) và người sửa danh mục (admin.manage).
      if (!can(staff, "vehicle.manage") && !can(staff, "admin.manage")) return FORBIDDEN();
      return respondMeta(env.DB);
    }),

    // Danh mục loại giấy tờ xe — Quản trị sửa (ô admin.manage viết thẳng — luật (4) của hàng rào 2); khuôn loc_location (Ruling R7). Luật kiểm chung với loại
    // giấy tờ của người (src/shared/giay-to.ts). Nhật ký cùng lô, chỉ mã + tên.
    route("POST", "/api/van-chuyen/loai-giay-to-xe", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const parsed = kiemLoaiGiayToMoi(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          insertVehicleDocTypeStatement(env.DB, v, staff.id, at),
          auditStatement(env.DB, { staffId: staff.id, action: "vehicle_document_type_changed", at, detail: `loại giấy tờ xe: ${v.code} — ${v.name}` }),
        ]);
      } catch (e) {
        if (e instanceof Error && /UNIQUE constraint failed: vc_vehicle_document_type\.code/.test(e.message)) return error(409, "code_taken", "Mã này đã có trong danh mục.");
        throw e;
      }
      return kemLocation(await respondMeta(env.DB, 201), "/loai-giay-to-xe");
    }),

    route("PUT", "/api/van-chuyen/loai-giay-to-xe/:code", "admin", async ({ request, env, params, staff }) => {
      if (!can(staff, "admin.manage")) return ADMIN_ONLY();
      const code = params.code ?? "";
      if (!MA_LOAI_GIAY_TO_RE.test(code) || !(await findVehicleDocumentType(env.DB, code))) return error(404, "not_found", "Không tìm thấy loại giấy tờ xe.");
      const parsed = kiemSuaLoaiGiayTo(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const at = new Date().toISOString();
      const results = await env.DB.batch([
        updateVehicleDocTypeStatement(env.DB, code, v, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "vehicle_document_type_changed", at, detail: `loại giấy tờ xe: ${code} — ${v.name}` }, "changes() > 0"),
      ]);
      if ((results[0]!.meta.changes ?? 0) === 0) return error(409, "stale", "Danh mục vừa được người khác sửa, hãy tải lại rồi sửa tiếp.");
      return respondMeta(env.DB);
    }),

    // Ngưỡng "sắp hết hạn" (ADR-0040 D1) — chính sách có ngày hiệu lực, CHỈ Toàn quyền (ô settings.ops viết thẳng ở đầu thân). Đổi = chèn dòng mới, hiệu lực ngay.
    route("POST", "/api/van-chuyen/nguong-het-han", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống đổi được mốc nhắc giấy tờ sắp hết hạn.");
      const parsed = kiemNguong(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const now = new Date();
      const at = now.toISOString();
      const cu = await currentWarnDays(env.DB, at);
      try {
        await env.DB.batch([
          insertPolicyStatement(env.DB, crypto.randomUUID(), parsed.value, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "expiry_policy_changed", at, detail: `mốc nhắc giấy tờ sắp hết hạn: ${cu} → ${parsed.value} ngày` }),
        ]);
      } catch (e) {
        // Ruling R19 (điều phối 2026-09-28): hai lần đổi CÙNG một mili-giây vấp khoá duy nhất valid_from_at (cả lô huỷ, không dòng nhật ký) → 409, không 500.
        if (e instanceof Error && /UNIQUE constraint failed: vc_expiry_policy\.valid_from_at/.test(e.message)) {
          return error(409, "stale", "Vừa có người đổi mốc nhắc, tải lại rồi thử lại.");
        }
        throw e;
      }
      return respondMeta(env.DB);
    }),

    // ADR-0048 D1: danh sách nhà xe đang hợp tác (hàm công bố của parties) + công ty chủ + số xe CHƯA NGỪNG theo chủ (bảng của chính module). Xếp theo tên.
    route("GET", "/api/van-chuyen/nha-xe", "office", async ({ env, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const [congTy, nhaXe, soXe] = await Promise.all([ownerCompany(env.DB), nhaXeDangHopTac(env.DB), vehicleCountByOwner(env.DB)]);
      return json({
        ownerCompany: congTy ? { partyId: congTy.partyId, name: congTy.displayName } : null,
        carriers: nhaXe.map((c) => ({ partyId: c.partyId, name: c.displayName, kind: c.kind, vehicleCount: soXe.get(c.partyId) ?? 0, driverCount: c.driverCount })),
      } satisfies CarrierListResponse);
    }),

    route("GET", "/api/van-chuyen/sap-het-han", "office", async ({ env, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const now = new Date();
      const today = vnToday(now);
      const warnDays = await currentWarnDays(env.DB, now.toISOString());
      const until = addDays(today, warnDays);
      // Giấy tờ xe (xe chưa ngừng, dòng hiện hành) + giấy tờ tài xế qua hàm công bố của parties (KHÔNG số, không nơi cấp, không id giấy tờ).
      const [xe, nguoi] = await Promise.all([expiringVehicleDocuments(env.DB, until), expiringDriverDocuments(env.DB, { today, until })]);
      const items = gopSapHetHan(
        xe.map((r) => ({
          vehicleId: r.vehicle_id, plateNumber: r.plate_number, vehicleName: r.vehicle_name, typeName: r.type_name, expiryDate: r.expiry_date,
          // ADR-0048 D1 (I6, G4): null = xe của công ty chủ HIỆN TẠI; nhà xe hay công ty chủ cũ → tên chủ.
          ownerLabel: r.owner_is_company === 1 ? null : r.owner_name,
        })),
        nguoi,
        today,
      );
      return json({ warnDays, count: items.length, items } satisfies ExpiringListResponse);
    }),
    // ---- BẢNG GIÁ THUÊ XE (ADR-0057 T1 B5; kế hoạch Đợt 4 Task 4 + đánh giá bản vẽ 2/10) — cổng office, `can()` ĐẦU thân (403 trước 400). Quản trị = Kế toán
    // (chủ lần 18). Tuyến / cỡ xe: ĐỌC tên được cả người xếp xe (`trip.dispatch` — chọn tuyến khi xếp, không giá); GHI cần `transport.rate.manage`.
    route("GET", "/api/van-chuyen/bang-gia", "office", async ({ env, url, staff }) => {
      if (!can(staff, "transport.rate.view")) return CAN_GIA();
      const ngay = url.searchParams.get("ngay") ?? vnToday(new Date());
      if (!isISODate(ngay)) return error(400, "invalid_input", "Ngày xem giá: YYYY-MM-DD.");
      const nhaXe = url.searchParams.get("nha-xe");
      if (nhaXe !== null && !PARTY_ID_RE.test(nhaXe)) return error(400, "invalid_input", "Nhà xe không hợp lệ.");
      return json(await docBangGia(env.DB, nhaXe, ngay));
    }),
    route("POST", "/api/van-chuyen/bang-gia", "office", async ({ env, request, staff }) => {
      if (!can(staff, "transport.rate.manage")) return CAN_GIA();
      const than = docThemGia(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const r = await lenhThemGia(env.DB, than.value, staff, new Date().toISOString());
      if (r instanceof Response) return r;
      const ngay = vnToday(new Date());
      const m = await banDoTuyenCo(env.DB, ngay);
      return json({ dong: bangGiaDto(r.row, ngay, m.t, m.c) } satisfies BangGiaDongResponse, r.lap ? 200 : 201, { location: "/bang-gia-xe" }); // ADR-0094 A-10: trang gọi route này (web/bang-gia-xe.ts)
    }),
    route("POST", "/api/van-chuyen/bang-gia/:id/ket-thuc", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "transport.rate.manage")) return CAN_GIA();
      const id = params.id ?? "";
      if (!/^[A-Za-z0-9-]{3,64}$/.test(id)) return error(404, "not_found", "Không tìm thấy dòng giá.");
      const than = docKetThucGia(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const r = await lenhKetThucGia(env.DB, id, than.value.denNgay, staff, new Date().toISOString());
      if (r instanceof Response) return r;
      const ngay = vnToday(new Date());
      const m = await banDoTuyenCo(env.DB, ngay);
      return json({ dong: bangGiaDto(r, ngay, m.t, m.c) } satisfies BangGiaDongResponse);
    }),
    route("GET", "/api/van-chuyen/tuyen", "office", async ({ env, staff }) => {
      if (!can(staff, "trip.dispatch") && !can(staff, "transport.rate.view")) return CAN_DANH_MUC_TUYEN();
      return json({ tuyen: (await listRoutes(env.DB)).map(tuyenDto) } satisfies TuyenListResponse);
    }),
    route("POST", "/api/van-chuyen/tuyen", "office", async ({ env, request, staff }) => {
      if (!can(staff, "transport.rate.manage")) return CAN_GIA();
      const than = docTuyenMoi(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const r = await lenhThemTuyen(env.DB, than.value, staff, new Date().toISOString());
      if (r instanceof Response) return r;
      return json({ tuyen: (await listRoutes(env.DB)).map(tuyenDto) } satisfies TuyenListResponse, 201, { location: "/bang-gia-xe" });
    }),
    route("PUT", "/api/van-chuyen/tuyen/:code", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "transport.rate.manage")) return CAN_GIA();
      const code = params.code ?? "";
      if (!MA_TUYEN_CO_RE.test(code)) return error(404, "not_found", "Không tìm thấy tuyến.");
      const than = docSuaTuyen(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const r = await lenhSuaTuyen(env.DB, code, than.value, staff, new Date().toISOString());
      if (r instanceof Response) return r;
      return json({ tuyen: (await listRoutes(env.DB)).map(tuyenDto) } satisfies TuyenListResponse);
    }),
    route("GET", "/api/van-chuyen/co-xe", "office", async ({ env, staff }) => {
      if (!can(staff, "trip.dispatch") && !can(staff, "transport.rate.view")) return CAN_DANH_MUC_TUYEN();
      const xemGia = can(staff, "transport.rate.view");
      return json({ coXe: (await listSizes(env.DB, vnToday(new Date()))).map((c) => coXeDto(c, xemGia)) } satisfies CoXeListResponse);
    }),
    route("POST", "/api/van-chuyen/co-xe", "office", async ({ env, request, staff }) => {
      if (!can(staff, "transport.rate.manage")) return CAN_GIA();
      const than = docCoXeMoi(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const r = await lenhThemCoXe(env.DB, than.value, staff, new Date().toISOString());
      if (r instanceof Response) return r;
      return json({ coXe: (await listSizes(env.DB, vnToday(new Date()))).map((c) => coXeDto(c, true)) } satisfies CoXeListResponse, 201, { location: "/bang-gia-xe" });
    }),
    route("PUT", "/api/van-chuyen/co-xe/:code", "office", async ({ env, request, params, staff }) => {
      if (!can(staff, "transport.rate.manage")) return CAN_GIA();
      const code = params.code ?? "";
      if (!MA_TUYEN_CO_RE.test(code)) return error(404, "not_found", "Không tìm thấy cỡ xe.");
      const than = docSuaCoXe(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const r = await lenhSuaCoXe(env.DB, code, than.value, staff, new Date().toISOString());
      if (r instanceof Response) return r;
      return json({ coXe: (await listSizes(env.DB, vnToday(new Date()))).map((c) => coXeDto(c, true)) } satisfies CoXeListResponse);
    }),

    // ---- CHI PHÍ CHUYẾN XE THUÊ + BẢNG KÊ (ADR-0057 T2 C9) — cổng office, `can()` ĐẦU thân (403 trước 400). Quản trị = Kế toán (chủ lần 18). Không báo tài xế /
    // Bảng tin (route ghi TIỀN, không đổi chuyến — kế hoạch Đợt 4 Task 10 bước 3b).
    route("GET", "/api/van-chuyen/chuyen/:id/chi-phi", "office", async ({ env, params, staff, nhanNhanVien }) => {
      if (!can(staff, "transport.cost.view")) return CAN_CHI_PHI();
      const id = params.id ?? "";
      const dto = ID_CHUYEN_RE.test(id) ? await docChiPhiChuyen(env.DB, id, nhanNhanVien, vnToday(new Date())) : null;
      return dto ? json({ chiPhi: dto } satisfies ChiPhiChuyenResponse) : error(404, "not_found", "Không tìm thấy chuyến xe.");
    }),
    route("POST", "/api/van-chuyen/chuyen/:id/chi-phi/dieu-chinh", "office", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "transport.cost.adjust")) return CAN_CHI_PHI();
      const id = params.id ?? "";
      const than = docDieuChinh(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const now = new Date();
      return phanHoiChiPhi(env.DB, id, nhanNhanVien, ID_CHUYEN_RE.test(id) ? await lenhDieuChinh(env.DB, id, than.value, staff, now) : null);
    }),
    route("POST", "/api/van-chuyen/chuyen/:id/chi-phi/dao", "office", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "transport.cost.adjust")) return CAN_CHI_PHI();
      const id = params.id ?? "";
      const than = docDaoDong(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const now = new Date();
      return phanHoiChiPhi(env.DB, id, nhanNhanVien, ID_CHUYEN_RE.test(id) ? await lenhDaoDong(env.DB, id, than.value, staff, now, vnToday(now)) : null);
    }),
    route("POST", "/api/van-chuyen/chuyen/:id/chi-phi/chup-lai", "office", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "transport.cost.adjust")) return CAN_CHI_PHI();
      const id = params.id ?? "";
      const than = docChupLai(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const now = new Date();
      return phanHoiChiPhi(env.DB, id, nhanNhanVien, ID_CHUYEN_RE.test(id) ? await lenhChupLai(env.DB, id, than.value, staff, now, vnToday(now)) : null);
    }),
    route("POST", "/api/van-chuyen/chuyen/:id/chi-phi/gia-thoa-thuan", "office", async ({ env, request, params, staff, nhanNhanVien }) => {
      if (!can(staff, "transport.cost.adjust")) return CAN_CHI_PHI();
      const id = params.id ?? "";
      const than = docGiaThoaThuan(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      return phanHoiChiPhi(env.DB, id, nhanNhanVien, ID_CHUYEN_RE.test(id) ? await lenhGiaThoaThuan(env.DB, id, than.value, staff, new Date()) : null);
    }),
    route("GET", "/api/van-chuyen/chi-phi", "office", async ({ env, url, staff }) => {
      if (!can(staff, "transport.cost.view")) return CAN_CHI_PHI();
      const tu = url.searchParams.get("tu") ?? "";
      const den = url.searchParams.get("den") ?? "";
      if (!isISODate(tu) || !isISODate(den) || den < tu) return error(400, "invalid_input", "Khoảng ngày chạy: từ ngày, đến ngày dạng YYYY-MM-DD, đến ngày không trước từ ngày.");
      if (addDays(tu, BANG_KE_TOI_DA_NGAY) < den) return error(400, "invalid_input", `Khoảng ngày chạy tối đa ${BANG_KE_TOI_DA_NGAY} ngày (khoảng 3 tháng).`);
      const nhaXe = url.searchParams.get("nha-xe");
      if (nhaXe !== null && !PARTY_ID_RE.test(nhaXe)) return error(400, "invalid_input", "Nhà xe không hợp lệ.");
      const tt = url.searchParams.get("trang-thai");
      if (tt !== null && !(NHOM_BANG_KE as readonly string[]).includes(tt)) return error(400, "invalid_input", "Trạng thái lọc không hợp lệ.");
      return json(await docBangKe(env.DB, { tu, den, nhaXe, nhom: tt as NhomBangKeDto | null }));
    }),

    // ---- CHUYẾN XE — route văn phòng lập kế hoạch (ADR-0049 D1–D3 lát 1.5; ADR-0050 VK1-B route 40; kế hoạch mục 1.7 route 1–8, 40; Task A13) -------------
    // Mọi route: `can()` ĐẦU thân (403 trước 400). Hàm hẹp của orders (`lichChungChang`, `hanhKhachChoChuyen`) CHỈ gọi ở đây, SAU `can()`, rồi truyền xuống
    // (dieu-phoi-doc.ts, dieu-phoi-route.ts không gọi). Mỗi lệnh ghi: một `db.batch` có thứ tự cố định (dieu-phoi.ts — bài thứ tự lô A14); lệnh lặp cùng
    // `requestId` → 200 kết quả hiện tại (LC-11). Nhật ký `trip_*`: orderId NULL (I17).
    route("GET", "/api/van-chuyen/lich", "office", async ({ env, url, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view")) return CAN_XEM_CHUYEN();
      const ngay = url.searchParams.get("ngay") ?? vnToday(new Date());
      if (!isISODate(ngay)) return error(400, "invalid_input", "Ngày xem lịch: YYYY-MM-DD.");
      const bayGioMs = Date.now();
      const trips = await tripsByDate(env.DB, ngay);
      const lich = await lichChungChang(env.DB, addDays(ngay, -1), addDays(ngay, 1));
      return json(await dungLichNgay(env.DB, ngay, trips, lich, nhanNhanVien, bayGioMs, can(staff, "order.leg.short_notice")));
    }),

    route("GET", "/api/van-chuyen/chuyen/:id", "office", async ({ env, params, staff, nhanNhanVien, isAssigned }) => {
      if (!can(staff, "trip.view")) return CAN_XEM_CHUYEN();
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const lich = await lichChungChang(env.DB, nen.tu, nen.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen.legIds);
      return json(await chiTietChuyen(env.DB, nen, lich.chang, hk, true, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), Date.now(), can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    route("POST", "/api/van-chuyen/chuyen", "office", async ({ env, request, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docTaoChuyen(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const t = than.value;
      const quyenVuot: QuyenVuot = (lop) => (lop === "KHAN_CAP" ? can(staff, "trip.urgent_adjust") : can(staff, "trip.override")); // ADR-0104 Đ1: lớp → ô
      // LC-11 + C38: lệnh lặp chỉ khi mã lệnh thuộc sự kiện TẠO chuyến (chưa có chuyến để so); mã của thao tác khác → 409 request_id_reused.
      const lap = await traLenhLap(env.DB, t.requestId, { tripId: null, loai: ["CREATED"] });
      if (lap instanceof Response) return lap;
      const bayGioMs = Date.now();
      const nowIso = new Date(bayGioMs).toISOString();
      let canhBaoLenh: CanhBaoLichDto[] = []; // ADR-0055 VK2-B B3: chỉ nhắc, chỉ lần đầu (khuôn canhBaoXep)
      if (!lap) {
        const chung = await docChung(env.DB, nowIso, vnToday(new Date(bayGioMs)));
        // ADR-0104 Đ1 mục 0: tạo chuyến không có luật mốc; "dưới mốc" = giờ bắt đầu của chuyến mới — quyết lớp của cờ vượt khoảng nghỉ.
        const vuot = vuotLenh({ dangChay: false, gioXetMs: t.batDauMs }, bayGioMs, chung.chinhSach?.min_lead_minutes ?? null, [], quyenVuot);
        const cam = chanCoVuot({ moc: false, nghiCamKet: t.nghiPhaLe !== null }, vuot);
        if (cam) return cam;
        const xeRow = chung.xe.find((x) => x.id === t.xeId);
        if (!xeRow) return error(400, "invalid_input", "Xe không có hoặc đã ngừng dùng.");
        if (t.nghiPhaLe && !lyDoHopLe(chung, t.nghiPhaLe.lyDo, "PHA_LE")) return error(400, "invalid_input", CAU_LY_DO_VUOT_LA);
        if (t.tuyen !== null && (await tenTuyenDangDung(env.DB, t.tuyen)) === null) return error(400, "invalid_input", "Tuyến không có hoặc đã ngừng dùng.");
        // LC-13 phần CHỈ máy chủ giữ (R-P8): hồ sơ không có trong `taiXeChoDieuPhoi` (không mở vai tài xế công ty, không thuộc nhà xe nào) → chéo xe – tài xế.
        if (!chung.taiXe.some((x) => x.partyId === t.taiXePartyId)) return loi409("cheo_xe_tai_xe", [lyDoGiu("CHEO_XE_TAI_XE")]);
        const khac = await tripsTouching(env.DB, t.batDauMs - NGAY_MS, t.ketThucMs + NGAY_MS);
        // ADR-0055 VK2-A A2 (i): khung bận còn hiệu lực là khoảng chặn (lớp máy chủ nói trước — trigger vc_trip_unavailable_ins là lưới thứ hai).
        // ADR-0053 D9 B9.3 (kế hoạch A4 T4): khung bận của TÀI XẾ cũng là khoảng chặn — lớp máy chủ nói trước bằng câu không lý do (trigger
        // vc_trip_driver_unavailable_ins là lưới thứ hai).
        const khungBan = [
          ...(await khungBanXeTrongKhoang(env.DB, t.batDauMs, t.ketThucMs)).map(khungBanVao),
          ...(await khungTaiXeTrongKhoang(env.DB, t.taiXePartyId, t.batDauMs, t.ketThucMs)).map(khungTaiXeVao),
        ];
        const kq = kiemTaoSuaChuyen({
          lenh: "TAO", chuyen: { id: null, batDauMs: t.batDauMs, ketThucMs: t.ketThucMs, xe: xeVao(xeRow, chung.giayToXe), taiXe: taiXeVao(t.taiXePartyId, chung.taiXe), nghiPhaLe: t.nghiPhaLe !== null },
          chuyenKhac: khac.map(khungChuyen), khungBan, chinhSach: chinhSachVao(chung.chinhSach), hangBang: chung.hangBang, bayGioMs,
        });
        const chan = loiKiem(kq, vuot, null, { moc: false, nghi: t.nghiPhaLe !== null, camKet: true }); // tạo chuyến chưa có khách — không xét cam kết
        if (chan) return chan;
        const ngayChay = msToVnLocal(t.batDauMs).date;
        // ADR-0057 C2a, C4: cờ xe thuê + chụp giá bảng LÚC XẾP xe nhà xe (cùng lô); thiếu giá ⇒ không dòng nào (chuyến bị giữ THIEU_GIA tới khi có giá).
        const cp = await docChiPhiChoLenh(env.DB, { tripId: null, chuXe: xeRow.owner_party_id, homNay: vnToday(new Date(bayGioMs)) });
        const thue = phanLoaiThue({ chuXePartyId: xeRow.owner_party_id, congTyChuId: cp.congTyChuId, nhaXeDangMo: cp.nhaXeDangMo, cuRented: null });
        const kh = keHoachChiPhiKhiDoi({
          dong: [], homNay: vnToday(new Date(bayGioMs)), kyDaKhoa: cp.kyDaKhoa, rentedMoi: thue, chuXeMoi: xeRow.owner_party_id, nhaXeDangMo: cp.nhaXeDangMo, laTaoMoi: true, doiXeHoacNhaXe: false,
          doiTuyen: false, doiNgay: false, tuyenMoi: t.tuyen, soChoMoi: xeRow.passenger_capacity, ngayChayMoi: ngayChay, gia: cp.gia, coXe: cp.coXe,
        });
        if (!kh.ok) return kh.loi === "period_closed" ? loiThangDaKhoa(kh.thang) : error(409, "carrier_inactive", CAU_NHA_XE_THOI); // ADR-0080: ngày chạy ở tháng đã khoá ⇒ cả lệnh 409
        const tenT = t.tuyen ? ` · tuyến ${await tenTuyen(env.DB, t.tuyen)}` : "";
        const id = crypto.randomUUID();
        canhBaoLenh = nhacGioLaiDto(kq.nhacGioLai, id);
        for (let lan = 0; ; lan++) {
          const ma = `CX-${ngayChay.slice(8, 10)}${ngayChay.slice(5, 7)}-${String((await tripCountByDate(env.DB, ngayChay)) + 1 + lan).padStart(2, "0")}`;
          const lo = loTaoChuyen(env.DB, {
            cmd: crypto.randomUUID(), requestId: t.requestId, lucIso: nowIso, nguoiId: staff.id,
            chuyen: {
              id, ma, xeId: xeRow.id, chuXePartyId: xeRow.owner_party_id, ngayChay, batDauMs: t.batDauMs, ketThucMs: t.ketThucMs, nghiChup: chung.chinhSach?.rest_minutes ?? 0,
              nghiPhaLeLyDo: t.nghiPhaLe?.lyDo ?? null, thue, tuyen: t.tuyen,
            },
            chiPhi: kh.kh,
            taiXePartyId: t.taiXePartyId, policyId: chung.chinhSach?.id ?? null,
            phaLeNghi: t.nghiPhaLe ? { luat: "KHOANG_NGHI", lyDo: t.nghiPhaLe.lyDo, policyId: chung.chinhSach?.id ?? null } : null,
            detail: `${ma} · xe ${xeRow.plate_number} (${xeRow.passenger_capacity} chỗ) · ${gioNgan(t.batDauMs, bayGioMs)} → ${gioNgan(t.ketThucMs, bayGioMs)}${tenT}${t.nghiPhaLe ? phaLeNhatKy("KHOANG_NGHI", nhanLyDo(chung, t.nghiPhaLe.lyDo), vuot) + gioKhanCapNhatKy(["KHOANG_NGHI"], vuot) : ""}${chiTietChiPhiNhatKy(kh.kh, thue)}`,
          });
          try {
            const r = await chayLo(env.DB, lo, t.requestId);
            if (!r.ok) return r.res;
            break;
          } catch (e) {
            const khoa = await loiKhoaThangXe(env.DB, e, ngayCuaKeHoach(kh.kh)); // tháng khoá GIỮA lúc đọc và lúc ghi (trigger period_closed:) ⇒ 409 đúng câu, không 500
            if (khoa) return khoa;
            if (lan < 3 && e instanceof Error && /UNIQUE constraint failed: vc_trip\.service_date, vc_trip\.code/.test(e.message)) continue;
            throw e;
          }
        }
        baoThayDoiChuyen({ tripId: id, requestId: t.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen = await docNen(env.DB, lap?.trip_id ?? (await eventByRequest(env.DB, t.requestId))!.trip_id);
      if (!nen) return KHONG_CO_CHUYEN();
      const lich = await lichChungChang(env.DB, nen.tu, nen.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen.legIds);
      const ct = await chiTietChuyen(env.DB, nen, lich.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch"));
      return json({ ...ct, ...(canhBaoLenh.length > 0 ? { canhBaoLenh } : {}) } satisfies ChuyenChiTietResponse, lap ? 200 : 201, { location: `/chuyen?id=${nen.trip.id}` });
    }),

    route("PUT", "/api/van-chuyen/chuyen/:id", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docSuaChuyen(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const quyenVuot: QuyenVuot = (lop) => (lop === "KHAN_CAP" ? can(staff, "trip.urgent_adjust") : can(staff, "trip.override")); // ADR-0104 Đ1: lớp → ô
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const ra: { nhacGioLai?: CanhBaoGioLai[] } = {}; // ADR-0055 VK2-B B3: nhắc giờ lái của chuyến sau sửa (chỉ lần đầu)
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: nen.trip.id, loai: ["UPDATED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        // ADR-0056 VK3-A: chặng quanh ngày chạy (sau `can()`) — đổi xe thì luật cam kết xét khách đang trên chuyến.
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const r = await lenhSuaChuyen(env.DB, nen, lich.chang, b, staff, bayGioMs, quyenVuot, ra);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      const ct = await chiTietChuyen(env.DB, nen2, lich.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch"));
      const canhBaoLenh = nhacGioLaiDto(ra.nhacGioLai ?? [], nen.trip.id);
      return json({ ...ct, ...(canhBaoLenh.length > 0 ? { canhBaoLenh } : {}) } satisfies ChuyenChiTietResponse);
    }),

    // Người đi kèm (lời chủ 2026-10-01, phương án A): ai gắn được — tài khoản Hướng dẫn viên đang hoạt động; tên, KHÔNG SĐT. Cùng ô với lệnh xếp.
    route("GET", "/api/van-chuyen/huong-dan-vien", "office", async ({ staff, huongDanVien }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      return json({ nguoi: await huongDanVien() } satisfies HuongDanVienListResponse);
    }),

    route("POST", "/api/van-chuyen/chuyen/:id/phan-bo", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, huongDanVien, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docXep(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const quyenVuot: QuyenVuot = (lop) => (lop === "KHAN_CAP" ? can(staff, "trip.urgent_adjust") : can(staff, "trip.override")); // ADR-0104 Đ1: lớp → ô
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      let canhBaoXep: LyDoGiu[] = [];
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: nen.trip.id, loai: ["ALLOCATED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        // Lời chủ 2026-10-01: người đi kèm phải là hướng dẫn viên đang có tài khoản (gửi lại cùng requestId không kiểm lại — lô đã chạy).
        if (b.nguoiDiKem.length > 0) {
          const duoc = new Set((await huongDanVien()).map((x) => x.partyId));
          if (!b.nguoiDiKem.every((p) => duoc.has(p))) return error(409, "nguoi_di_kem_khong_hop_le", "Chỉ gắn được hướng dẫn viên đang có tài khoản làm người đi kèm.");
        }
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const r = await lenhXep(env.DB, nen, lich.chang, b, staff, bayGioMs, quyenVuot);
        if (r.loi) return r.loi;
        canhBaoXep = r.canhBao;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      // Cảnh báo sớm (chỉ nhắc): chặng chưa có nơi trả / chưa đủ tên — xe sẽ bị giữ ở xuất bến nếu chưa bổ sung.
      const ct = await chiTietChuyen(env.DB, nen2, lich2.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch"));
      return json({ ...ct, ...(canhBaoXep.length > 0 ? { canhBaoXep: canhBaoXep.map(lyDoGiuDto) } : {}) } satisfies ChuyenChiTietResponse);
    }),

    // Đợt 5 D5c (cứu hộ đơn giản — Task 15): văn phòng xem chặng cần chuyển + xe nhận cùng ngày của chuyến đã Kết thúc gián đoạn. Chỉ đọc; xếp lại bằng
    // them-diem / phan-bo / tạo chuyến có sẵn. DTO không tên khách, SĐT, mã đơn.
    route("GET", "/api/van-chuyen/chuyen/:id/cuu-ho", "office", async ({ env, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      if (nen.trip.status !== "ENDED_INTERRUPTED") return loi409("chua_gian_doan");
      const ngay = nen.trip.service_date;
      const [trips, lich] = await Promise.all([tripsByDate(env.DB, ngay), lichChungChang(env.DB, addDays(ngay, -1), addDays(ngay, 1))]);
      const l = await dungLichNgay(env.DB, ngay, trips, lich, nhanNhanVien, Date.now(), false);
      return json(cuuHoTu(nen, l) satisfies CuuHoResponse);
    }),

    // ADR-0111 Đ4 (gói A5 T14): xe nhận cho văn phòng GỬI THAY đề nghị cứu hộ — chỉ ONBOARD (xe đang chạy khác, cùng ngày, tài xế công ty khác tài xế xe
    // nhờ); CÙNG hàm lọc + năm khoá với danh sách của tài xế. Ô trip.progress như route gửi thay; xe nhờ phải đang chạy.
    route("GET", "/api/van-chuyen/chuyen/:id/xe-nhan", "office", async ({ env, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      if (nen.trip.status !== "RUNNING" || nen.trip.driver_party_id === null) return loi409("ck_nguon_khong_chay", [], {}, "Chỉ gửi đề nghị cứu hộ cho xe đang chạy.");
      const ngay = nen.trip.service_date;
      const [trips, lich] = await Promise.all([tripsByDate(env.DB, ngay), lichChungChang(env.DB, addDays(ngay, -1), addDays(ngay, 1))]);
      const l = await dungLichNgay(env.DB, ngay, trips, lich, nhanNhanVien, Date.now(), false);
      return json({ phamVi: "ONBOARD", xe: xeNhanChoDeNghi({ id: nen.trip.id, ngayChay: ngay }, l.chuyen, "ONBOARD", nen.trip.driver_party_id) } satisfies XeNhanResponse);
    }),

    // ADR-0111 Đ3 (b), Đ4 (kế hoạch A5 T8; NT-A5-15): văn phòng (trip.progress) GỬI THAY đề nghị cứu hộ cho xe đang chạy — chỉ ONBOARD (STOP → 403: nhờ đón
    // một điểm do tài xế gửi). Người gửi (hồ sơ) = tài xế đang lái xe nhờ; `proposed_by_staff_id` = người bấm. CÙNG hàm xử lý với route tài xế.
    route("POST", "/api/van-chuyen/chuyen/:id/cuu-ho", "office", async ({ env, request, params, staff, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docGuiDeNghi(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      if (b.phamVi !== "ONBOARD") return error(403, "forbidden", "Văn phòng chỉ gửi thay đề nghị cứu hộ (chuyển cả xe); nhờ đón một điểm do tài xế gửi.");
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: b.denChuyenId, nguonId: nen.trip.id, loai: ["TRANSFER_SENT"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhGuiDeNghi(env.DB, nen, await docNen(env.DB, b.denChuyenId), b, { staffId: staff.id, vanPhong: true }, bayGioMs);
        if (r instanceof Response) return r;
        baoThayDoiChuyen({ tripId: b.denChuyenId, requestId: b.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      return phanHoiGui(env.DB, b, bayGioMs);
    }),

    // ADR-0111 (kế hoạch A5 T8, T14): đề nghị chuyển khách của các chuyến chạy ngày `ngay` — người có trip.view (văn phòng) xem chỉ-đọc, kèm dòng kiểm lần bấm
    // gần nhất và hộp duyệt (Leo thang). DTO không tên khách, SĐT; nơi gặp là chữ đã che.
    route("GET", "/api/van-chuyen/de-nghi", "office", async ({ env, url, staff }) => {
      if (!can(staff, "trip.view")) return CAN_XEM_CHUYEN();
      const ngay = url.searchParams.get("ngay") ?? vnToday(new Date());
      if (!isISODate(ngay)) return error(400, "invalid_input", "Ngày xem: YYYY-MM-DD.");
      return json({
        ngay, deNghi: await deNghiDto(env.DB, await deNghiTheoNgay(env.DB, ngay), Date.now(), true), lyDo: await lyDoNhom(env.DB, ["PHA_LE", "TU_CHOI_NHAN"]),
      } satisfies DeNghiNgayResponse);
    }),

    // ADR-0111 Đ1, Đ3 (b) + ADR-0052 D4.2 ĐP4 (NT-A5-11): Quản trị / Toàn quyền DUYỆT đề nghị leo thang — chạy lại kiểm; có điều kiện tầng LOI không đạt (mọi
    // lần kiểm) → 409 không ghi; lý do nhóm PHA_LE; cam kết xe nhận không đạt → ghi khoá phá lệ (ADR-0056 A3). Ô trip.override hỏi THẲNG (nới có tên N2 của
    // lop-vuot NT-3(b): duyệt / bác không qua hàm lớp — không có "dưới mốc / ngoài mốc"). Hàm hẹp của orders gọi ở đây, sau `can()`.
    route("POST", "/api/van-chuyen/de-nghi/:rid/duyet", "office", async ({ env, request, params, staff, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.override")) return CAN_DUYET_DE_NGHI();
      const r = await deNghiById(env.DB, params.rid ?? "");
      if (!r) return KHONG_CO_DE_NGHI();
      const than = docLyDoDeNghi(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: r.to_trip_id, nguonId: r.from_trip_id, loai: ["TRANSFER_CONFIRMED"] });
      if (lap instanceof Response) return lap;
      if (lap && lap.id !== r.closed_cmd_id) return MA_LENH_DUNG_LAI();
      if (!lap) {
        const nguon = await docNen(env.DB, r.from_trip_id);
        const [lich, hk] = await Promise.all([lichChungChang(env.DB, addDays(r.service_date, -1), addDays(r.service_date, 1)), hanhKhachChoChuyen(env.DB, nguon?.legIds ?? [])]);
        const k = await lenhDuyetDeNghi(env.DB, r.id, { lich: lich.chang, hk }, than.value, staff.id, bayGioMs);
        if (k instanceof Response) return k;
        baoThayDoiChuyen({ tripId: r.to_trip_id, requestId: than.value.requestId });
      }
      return phanHoiDeNghi(env.DB, r.id, "DA_CHUYEN", bayGioMs, true);
    }),

    // ADR-0111 Đ3 (b), (d) (NT-A5-12): Quản trị / Toàn quyền BÁC đề nghị leo thang — lý do nhóm TU_CHOI_NHAN; suất không đổi; tin tới hai tài xế. Ô hỏi thẳng
    // (nới N2 — như Duyệt).
    route("POST", "/api/van-chuyen/de-nghi/:rid/bac", "office", async ({ env, request, params, staff, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.override")) return CAN_DUYET_DE_NGHI();
      const r = await deNghiById(env.DB, params.rid ?? "");
      if (!r) return KHONG_CO_DE_NGHI();
      const than = docLyDoDeNghi(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: r.to_trip_id, nguonId: r.from_trip_id, loai: ["TRANSFER_REJECTED"] });
      if (lap instanceof Response) return lap;
      if (lap && lap.id !== r.closed_cmd_id) return MA_LENH_DUNG_LAI();
      if (!lap) {
        const k = await lenhBacDeNghi(env.DB, r, than.value, staff.id, bayGioMs);
        if (k instanceof Response) return k;
        baoThayDoiChuyen({ tripId: r.to_trip_id, requestId: than.value.requestId });
      }
      return phanHoiDeNghi(env.DB, r.id, "DA_BAC", bayGioMs, true);
    }),

    // ADR-0052 D5.1 (Đợt 5): "Thêm điểm khi xe đang chạy" — ô xếp xe (+ ô theo lớp khi vượt mốc / cam kết — ADR-0104 Đ1: xe đang chạy luôn dưới mốc nên
    // là điều chỉnh khẩn cấp). Thân như phan-bo, không người đi kèm. Chuyến RUNNING (chưa chạy → 409 dùng Xếp). Mốc: chặng đặt gấp qua; chặng khác → 409
    // "Khách không đặt gấp — cần điều chỉnh khẩn cấp kèm lý do." trừ khi gửi điều chỉnh khẩn cấp.
    route("POST", "/api/van-chuyen/chuyen/:id/them-diem", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docThemDiem(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const quyenVuot: QuyenVuot = (lop) => (lop === "KHAN_CAP" ? can(staff, "trip.urgent_adjust") : can(staff, "trip.override")); // ADR-0104 Đ1: lớp → ô
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: nen.trip.id, loai: ["STOP_ADDED_RUNNING"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const hkMoi = await hanhKhachChoChuyen(env.DB, b.chang.map((c) => c.legId)); // dòng hành khách hiện hành — chỉ để ghi bản chốt (không ra phản hồi)
        const r = await lenhThemDiemDangChay(env.DB, nen, lich.chang, hkMoi, b, staff, bayGioMs, quyenVuot);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    // ADR-0052 D5.2 (Đợt 5): văn phòng báo khách huỷ trên xe đang chạy — chỉ đặt cờ (suất vẫn chiếm chỗ tới khi tài xế bấm "Khách đã huỷ"). Ô trip.dispatch;
    // lý do nhóm BAO_HUY_DIEM (sai nhóm 400); báo lần hai / suất đã có kết quả 409.
    route("POST", "/api/van-chuyen/chuyen/:id/phan-bo/:aid/bao-huy", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docBaoHuy(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: nen.trip.id, loai: ["ALLOCATION_OFFICE_CANCELLED"], suatId: params.aid ?? "" });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const r = await lenhBaoHuy(env.DB, nen, lich.chang, params.aid ?? "", b, staff, bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    route("POST", "/api/van-chuyen/chuyen/:id/rut", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docRut(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const quyenVuot: QuyenVuot = (lop) => (lop === "KHAN_CAP" ? can(staff, "trip.urgent_adjust") : can(staff, "trip.override")); // ADR-0104 Đ1: lớp → ô
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: nen.trip.id, loai: ["ALLOCATION_REMOVED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const r = await lenhRut(env.DB, nen, lich.chang, b, staff, bayGioMs, quyenVuot);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    route("POST", "/api/van-chuyen/chuyen/:id/doi", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docDoi(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const quyenVuot: QuyenVuot = (lop) => (lop === "KHAN_CAP" ? can(staff, "trip.urgent_adjust") : can(staff, "trip.override")); // ADR-0104 Đ1: lớp → ô
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      // C38 + phiếu kiểm V1: sự kiện dời ghi ở chuyến ĐÍCH, nguồn ở related_trip_id — so đúng cặp (dời ngược, dời sang chuyến khác cùng mã đều lệch).
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: b.denChuyenId, nguonId: nen.trip.id, loai: ["ALLOCATION_MOVED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const dich = b.denChuyenId === nen.trip.id ? null : await docNen(env.DB, b.denChuyenId);
        if (!dich) return error(400, "invalid_input", "Chuyến đích không hợp lệ.");
        const lich = await lichChungChang(env.DB, nen.tu < dich.tu ? nen.tu : dich.tu, nen.den > dich.den ? nen.den : dich.den);
        const r = await lenhDoi(env.DB, nen, dich, lich.chang, b, staff, bayGioMs, quyenVuot);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    route("POST", "/api/van-chuyen/chuyen/:id/huy", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docHuy(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const quyenVuot: QuyenVuot = (lop) => (lop === "KHAN_CAP" ? can(staff, "trip.urgent_adjust") : can(staff, "trip.override")); // ADR-0104 Đ1: lớp → ô
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: nen.trip.id, loai: ["CANCELLED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhHuy(env.DB, nen, b, staff, bayGioMs, quyenVuot);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    // ADR-0050 VK1-B (route 40, I42): "Cập nhật điểm theo đơn" — máy tự tìm MỌI suất khách mở lệch nơi (không chọn tay), đóng STOP_CHANGED + mở suất mới ở điểm
    // theo khoá nơi hiện hành. Chỉ chuyến PLANNED; KHÔNG khoá theo mốc (DOI_DIEM_THEO_CHANG ngoài LENH_KHOA_THEO_MOC), không cần phá lệ. Không suất nào lệch →
    // 200 daCapNhat 0, không ghi gì — xét TRƯỚC câu cổng version (người thứ hai bấm sau khi người khác đã cập nhật nhận 200 / 0, không 409).
    route("POST", "/api/van-chuyen/chuyen/:id/cap-nhat-diem", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docCapNhatDiem(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      let daCapNhat = 0;
      let boQua: number | undefined;
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: nen.trip.id, loai: ["ALLOCATION_STOP_CHANGED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const r = await lenhCapNhatDiem(env.DB, nen, lich.chang, b, staff, bayGioMs);
        if (r instanceof Response) return r;
        daCapNhat = r.daCapNhat;
        if (nen.trip.status === "RUNNING") boQua = r.boQua; // Đợt 5 D5.3a: chỉ xe đang chạy mới có suất "không đổi được"
        if (r.daCapNhat > 0) baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId }); // ADR-0052 D6.3: không suất lệch = không ghi = không báo
      } else daCapNhat = (await eventsByTrips(env.DB, [nen.trip.id])).find((e) => e.id === lap.id)?.count ?? 0;
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      const ct = await chiTietChuyen(env.DB, nen2, lich2.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch"));
      return json({ ...ct, daCapNhat, ...(boQua !== undefined ? { boQua } : {}) } satisfies CapNhatDiemResponse);
    }),

    // R-P29 (chủ lần 16 — "Giữ xe + nút cập nhật", khuôn route 40): "Cập nhật khách theo đơn" — máy tự tìm MỌI suất khách mở mang khoá người không còn trong
    // đơn (cùng định nghĩa lý do giữ KHACH_DA_DOI), đóng PASSENGER_CHANGED + mở lại tới số người của chặng (khoá rảnh / null). Ô trip.dispatch; không khoá theo
    // mốc; chỉ chuyến PLANNED (RUNNING → 409 xe_dang_chay). Không lệch → 200 daCapNhat 0 (không ghi, kể cả version cũ). Lệnh lặp → kết quả cũ.
    route("POST", "/api/van-chuyen/chuyen/:id/cap-nhat-khach", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.dispatch")) return CAN_DIEU_PHOI();
      const than = docCapNhatDiem(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      let daCapNhat = 0;
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: nen.trip.id, loai: ["ALLOCATION_PASSENGER_CHANGED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const r = await lenhCapNhatKhach(env.DB, nen, lich.chang, b, staff, bayGioMs);
        if (r instanceof Response) return r;
        daCapNhat = r;
        if (r > 0) baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId }); // ADR-0052 D6.3: không suất lệch = không ghi = không báo
      } else daCapNhat = (await eventsByTrips(env.DB, [nen.trip.id])).find((e) => e.id === lap.id)?.count ?? 0;
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json({ ...(await chiTietChuyen(env.DB, nen2, lich2.chang, hk, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch"))), daCapNhat } satisfies CapNhatKhachResponse);
    }),

    // ---- LỆNH TIẾN ĐỘ — route TÀI XẾ (cổng staff; kế hoạch mục 1.7 route 19–29; Task A15) ------------------------------------------------------------------
    // Khuôn hai bước (mục 1.2): (1) `can(trip.view, { assigned: true })` — tài khoản không có ô nào → 403 trước mọi truy vấn; (2) chuyến có dòng lái MỞ của
    // CHÍNH người gọi (`assigned`) và ô của lệnh → không thì 404 (kể cả người có ô `any` — văn phòng bấm thay qua route office, R-P1); (3) rồi mới đọc thân
    // (400). Thân có `xayRaLuc` → 400 `xay_ra_khong_nhan` (tài xế bấm = giờ máy chủ). Hàm hẹp của orders gọi ở đây, SAU `can()`; `lienHeChoTaiXe` CHỈ ở GET
    // chi tiết và chỉ khi `trongNgayChay` (mục 1.6). Chuỗi đích "Chỉ đường" (ADR-0105, đối cuối `kemChiDuong` của `cuocChiTiet`) cũng CHỈ ở GET chi tiết.
    route("GET", "/api/van-chuyen/cuoc-cua-toi", "staff", async ({ env, url, staff }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const bayGioMs = Date.now();
      const homNay = vnToday(new Date(bayGioMs));
      const tu = url.searchParams.get("tu") ?? homNay;
      const den = url.searchParams.get("den") ?? addDays(tu, 6);
      if (!isISODate(tu) || !isISODate(den) || den < tu || den > addDays(tu, 31)) return error(400, "invalid_input", "Khoảng ngày: tu, den dạng YYYY-MM-DD, tối đa 31 ngày.");
      const trips = staff.partyId ? await tripsCuaTaiXe(env.DB, staff.partyId, tu, den) : [];
      const ngay = trips.map((t) => t.service_date).sort();
      const lich = trips.length === 0 ? { chang: [] } : await lichChungChang(env.DB, addDays(ngay[0]!, -1), addDays(ngay[ngay.length - 1]!, 1));
      // Vế hạn Từ chối (G-A4-2): danh sách không tính khung từng chuyến → điều kiện còn thiếu chỉ câu gốc (không mã đơn trong chi tiết).
      const veHan = can(staff, "trip.refuse", { assigned: true });
      return json({ tu, den, chuyen: await danhSachCuoc(env.DB, trips, lich.chang, bayGioMs, veHan) } satisfies CuocCuaToiResponse);
    }),

    route("GET", "/api/van-chuyen/cuoc-cua-toi/:id", "staff", async ({ env, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.view", { assigned })) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const khung = await khungCuaNguoiGoi(env.DB, nen, staff, bayGioMs);
      const trongNgay = khung.trongKhung;
      const lich = await lichChungChang(env.DB, nen.tu, nen.den);
      const hk = trongNgay ? await hanhKhachChoChuyen(env.DB, nen.legIds) : [];
      const donIds = [...new Set(lich.chang.filter((c) => nen.allocs.some((a) => a.valid_to_at === null && a.leg_id === c.legId)).map((c) => c.orderId))];
      const lienHe = trongNgay ? await lienHeChoTaiXe(env.DB, donIds) : null;
      return json(await cuocChiTiet(env.DB, nen, lich.chang, hk, lienHe, nhanNhanVien, bayGioMs, khung, true) satisfies CuocChiTietResponse);
    }),

    // ADR-0052 D4 + ADR-0111 Đ4 (kế hoạch A5 T7a, NT-A5-2): xe nhận được đề nghị chuyển khách của chuyến MÌNH ĐANG LÁI. Khuôn hai bước như lệnh tiến độ:
    // không có ô trip.transfer nào → 403 trước mọi truy vấn; không lái chuyến này (kể cả Toàn quyền — ADR-0052:84) → 404. Chỉ đọc; DTO đúng năm khoá.
    route("GET", "/api/van-chuyen/cuoc-cua-toi/:id/xe-nhan", "staff", async ({ env, url, params, staff, nhanNhanVien }) => {
      if (!can(staff, "trip.transfer", { assigned: true })) return CAN_CHUYEN_KHACH();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.transfer", { assigned })) return KHONG_CO_CHUYEN();
      const phamVi = url.searchParams.get("phamVi") ?? "STOP";
      if (phamVi !== "STOP" && phamVi !== "ONBOARD") return error(400, "invalid_input", "Phạm vi chuyển: STOP (một điểm đón) hoặc ONBOARD (cứu hộ).");
      if (nen.trip.status !== "RUNNING") return loi409("ck_nguon_khong_chay", [], {}, "Chỉ nhờ xe khác khi xe của bạn đang chạy.");
      const ngay = nen.trip.service_date;
      const [trips, lich] = await Promise.all([tripsByDate(env.DB, ngay), lichChungChang(env.DB, addDays(ngay, -1), addDays(ngay, 1))]);
      const l = await dungLichNgay(env.DB, ngay, trips, lich, nhanNhanVien, Date.now(), false);
      return json({ phamVi, xe: xeNhanChoDeNghi({ id: nen.trip.id, ngayChay: ngay }, l.chuyen, phamVi, staff.partyId!) } satisfies XeNhanResponse);
    }),

    // ADR-0111 Đ3, Đ4 (kế hoạch A5 T7b; NT-A5-3, -4, -21): tài xế xe nhờ GỬI đề nghị chuyển khách (STOP: một điểm đón; ONBOARD: cứu hộ có nơi gặp). Khuôn hai
    // bước lệnh tài xế: không có ô trip.transfer → 403 (cổng đầu, ADR-0052:218, :248); không lái chuyến (kể cả Toàn quyền — ADR-0052:84) → 404; rồi ô trip.transfer. Mã lệnh dùng lại: khác
    // cặp chuyến / loại → 409 (traLenhLap); cùng cặp mà khác phạm vi / điểm → 409 (G-A5-22).
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/de-nghi", "staff", async ({ env, request, params, staff, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.transfer", { assigned: true })) return CAN_CHUYEN_KHACH();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.transfer", { assigned })) return KHONG_CO_CHUYEN();
      const than = docGuiDeNghi(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: b.denChuyenId, nguonId: nen.trip.id, loai: ["TRANSFER_SENT"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhGuiDeNghi(env.DB, nen, await docNen(env.DB, b.denChuyenId), b, { staffId: staff.id, vanPhong: false }, bayGioMs);
        if (r instanceof Response) return r;
        baoThayDoiChuyen({ tripId: b.denChuyenId, requestId: b.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      return phanHoiGui(env.DB, b, bayGioMs);
    }),

    // ADR-0111 Đ3 (b) (NT-A5-9): tài xế xe nhờ RÚT đề nghị còn Chờ (Leo thang: 409 da_leo_thang — G-A5-19). Không tin.
    route("POST", "/api/van-chuyen/de-nghi/:rid/rut", "staff", async ({ env, request, params, staff, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.transfer", { assigned: true })) return CAN_CHUYEN_KHACH();
      const r = await deNghiById(env.DB, params.rid ?? "");
      const assigned = r !== null && dangLai(await docNen(env.DB, r.from_trip_id), staff);
      if (!r || !assigned || !can(staff, "trip.transfer", { assigned })) return KHONG_CO_DE_NGHI();
      const than = docMaLenhDeNghi(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: r.to_trip_id, nguonId: r.from_trip_id, loai: ["TRANSFER_WITHDRAWN", "TRANSFER_EXPIRED"] });
      if (lap instanceof Response) return lap;
      if (lap && lap.id !== r.closed_cmd_id) return MA_LENH_DUNG_LAI(); // G-A5-22: cùng cặp chuyến, khác đề nghị
      let ketQua = lap ? KET_QUA_CUA_SU_KIEN[lap.kind]! : "DA_RUT";
      if (!lap) {
        const k = await lenhRutDeNghi(env.DB, r, than.value, staff.id, bayGioMs);
        if (k instanceof Response) return k;
        ketQua = k.ketQua;
        baoThayDoiChuyen({ tripId: r.to_trip_id, requestId: than.value.requestId }); // ADR-0052 D6.3: Bảng tin (rút không sinh tin; quá hạn → tin hết giờ)
      }
      return phanHoiDeNghi(env.DB, r.id, ketQua, bayGioMs, false);
    }),

    // ADR-0111 Đ3 (b), (c) (NT-A5-6, -7, -10, -20, -21, -24): tài xế XE NHẬN bấm Nhận. Khuôn hai bước lệnh tài xế (403 / 404 — kể cả Toàn quyền không lái xe
    // nhận). Đọc mới + kiemChuyen (11 điều kiện): đạt hết + công tắc tự đồng ý (chính sách lúc bấm) bật → xác nhận; còn lại leo thang. Quá hạn → Hết hạn (200).
    // Hàm hẹp của orders (chặng, hành khách cho bản chốt) gọi ở đây, sau `can()`.
    route("POST", "/api/van-chuyen/de-nghi/:rid/nhan", "staff", async ({ env, request, params, staff, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.transfer", { assigned: true })) return CAN_CHUYEN_KHACH();
      const r = await deNghiById(env.DB, params.rid ?? "");
      const assigned = r !== null && dangLai(await docNen(env.DB, r.to_trip_id), staff);
      if (!r || !assigned || !can(staff, "trip.transfer", { assigned })) return KHONG_CO_DE_NGHI();
      const than = docMaLenhDeNghi(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: r.to_trip_id, nguonId: r.from_trip_id, loai: ["TRANSFER_CONFIRMED", "TRANSFER_ESCALATED", "TRANSFER_EXPIRED"] });
      if (lap instanceof Response) return lap;
      if (lap && !(await laLenhCuaDeNghi(env.DB, lap.id, r))) return MA_LENH_DUNG_LAI();
      let ketQua = lap ? KET_QUA_CUA_SU_KIEN[lap.kind]! : "DA_CHUYEN";
      if (!lap) {
        const nguon = await docNen(env.DB, r.from_trip_id);
        const [lich, hk] = await Promise.all([lichChungChang(env.DB, addDays(r.service_date, -1), addDays(r.service_date, 1)), hanhKhachChoChuyen(env.DB, nguon?.legIds ?? [])]);
        const k = await lenhNhanDeNghi(env.DB, r.id, { lich: lich.chang, hk }, than.value, staff.id, staff.partyId!, bayGioMs);
        if (k instanceof Response) return k;
        ketQua = k.ketQua;
        baoThayDoiChuyen({ tripId: r.to_trip_id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên
      }
      return phanHoiDeNghi(env.DB, r.id, ketQua, bayGioMs, false);
    }),

    // ADR-0111 Đ3 (b), (d) (NT-A5-8): tài xế XE NHẬN bấm Không nhận — lý do bắt buộc nhóm TU_CHOI_NHAN; tin tới tài xế xe nhờ. Quá hạn → Hết hạn (200).
    route("POST", "/api/van-chuyen/de-nghi/:rid/khong-nhan", "staff", async ({ env, request, params, staff, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.transfer", { assigned: true })) return CAN_CHUYEN_KHACH();
      const r = await deNghiById(env.DB, params.rid ?? "");
      const assigned = r !== null && dangLai(await docNen(env.DB, r.to_trip_id), staff);
      if (!r || !assigned || !can(staff, "trip.transfer", { assigned })) return KHONG_CO_DE_NGHI();
      const than = docLyDoDeNghi(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: r.to_trip_id, nguonId: r.from_trip_id, loai: ["TRANSFER_DECLINED", "TRANSFER_EXPIRED"] });
      if (lap instanceof Response) return lap;
      if (lap && lap.id !== r.closed_cmd_id) return MA_LENH_DUNG_LAI();
      let ketQua = lap ? KET_QUA_CUA_SU_KIEN[lap.kind]! : "KHONG_NHAN";
      if (!lap) {
        const k = await lenhKhongNhanDeNghi(env.DB, r, than.value, staff.id, staff.partyId!, bayGioMs);
        if (k instanceof Response) return k;
        ketQua = k.ketQua;
        baoThayDoiChuyen({ tripId: r.to_trip_id, requestId: than.value.requestId });
      }
      return phanHoiDeNghi(env.DB, r.id, ketQua, bayGioMs, false);
    }),

    // ADR-0111 (kế hoạch A5 T13): đề nghị của chuyến tài xế đang lái (hôm nay / đang chạy) — gửi đi (xe nhờ) và gửi tới (xe nhận). Chỉ đọc.
    route("GET", "/api/van-chuyen/de-nghi-cua-toi", "staff", async ({ env, staff }) => {
      if (!can(staff, "trip.transfer", { assigned: true })) return CAN_CHUYEN_KHACH();
      const bayGioMs = Date.now();
      const hom = vnToday(new Date(bayGioMs));
      const ids = new Set((staff.partyId ? await tripsCuaTaiXe(env.DB, staff.partyId, hom, hom) : []).map((t) => t.id));
      const ds = await deNghiDto(env.DB, await deNghiCuaChuyen(env.DB, [...ids]), bayGioMs, false);
      return json({
        guiDi: ds.filter((d) => ids.has(d.tuChuyenId)), guiToi: ds.filter((d) => ids.has(d.denChuyenId)), lyDo: await lyDoNhom(env.DB, ["TU_CHOI_NHAN"]),
      } satisfies DeNghiCuaToiResponse);
    }),

    // route 21 ↔ 31
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/xuat-ben", "staff", async ({ env, request, params, staff, nhanNhanVien, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["DEPARTED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const hk = await hanhKhachChoChuyen(env.DB, nen.legIds);
        // A4 CAO-1: người có vế hạn NGOÀI khung xem khách → thân 409 chỉ câu gốc của mã (không mã đơn trong chi tiết lý do giữ).
        const khungTruoc = await khungCuaNguoiGoi(env.DB, nen, staff, bayGioMs);
        const r = await lenhXuatBen(env.DB, nen, lich.chang, hk, than.value, { id: staff.id, bamThay: false }, bayGioMs, khungTruoc.han !== undefined && !khungTruoc.trongKhung);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const khung = await khungCuaNguoiGoi(env.DB, nen2, staff, bayGioMs);
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, khung, false) satisfies CuocChiTietResponse);
    }),

    // route 22 ↔ 32
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/diem/:sid/da-toi", "staff", async ({ env, request, params, staff, nhanNhanVien, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["STOP_ARRIVED"], diemId: params.sid ?? "" });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhDaToi(env.DB, nen, params.sid ?? "", than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const khung = await khungCuaNguoiGoi(env.DB, nen2, staff, bayGioMs);
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, khung, false) satisfies CuocChiTietResponse);
    }),

    // route 23 ↔ 33
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/don", "staff", async ({ env, request, params, staff, nhanNhanVien, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["PASSENGER_BOARDED"], suatId: params.aid ?? "" });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhDaDon(env.DB, nen, params.aid ?? "", than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const khung = await khungCuaNguoiGoi(env.DB, nen2, staff, bayGioMs);
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, khung, false) satisfies CuocChiTietResponse);
    }),

    // route 24 ↔ 34
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/vang", "staff", async ({ env, request, params, staff, nhanNhanVien, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["PASSENGER_NO_SHOW"], suatId: params.aid ?? "" });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhVang(env.DB, nen, params.aid ?? "", than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const khung = await khungCuaNguoiGoi(env.DB, nen2, staff, bayGioMs);
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, khung, false) satisfies CuocChiTietResponse);
    }),

    // route 25 ↔ 35
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/khach-huy", "staff", async ({ env, request, params, staff, nhanNhanVien, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["PASSENGER_CANCELLED_AT_STOP"], suatId: params.aid ?? "" });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhKhachHuy(env.DB, nen, params.aid ?? "", than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const khung = await khungCuaNguoiGoi(env.DB, nen2, staff, bayGioMs);
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, khung, false) satisfies CuocChiTietResponse);
    }),

    // route 26 ↔ 36
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/phan-bo/:aid/tra", "staff", async ({ env, request, params, staff, nhanNhanVien, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["PASSENGER_DROPPED"], suatId: params.aid ?? "" });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhDaTra(env.DB, nen, params.aid ?? "", than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const khung = await khungCuaNguoiGoi(env.DB, nen2, staff, bayGioMs);
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, khung, false) satisfies CuocChiTietResponse);
    }),

    // route 27 ↔ 37
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/ket-thuc", "staff", async ({ env, request, params, staff, nhanNhanVien, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docTienDo(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["ENDED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhKetThuc(env.DB, nen, than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const khung = await khungCuaNguoiGoi(env.DB, nen2, staff, bayGioMs);
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, khung, false) satisfies CuocChiTietResponse);
    }),

    // route 28 ↔ 38
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/ket-thuc-gian-doan", "staff", async ({ env, request, params, staff, nhanNhanVien, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docKetThucGianDoan(await readJson(request), { nhanXayRa: false });
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["ENDED_INTERRUPTED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhKetThucGianDoan(env.DB, nen, than.value, { id: staff.id, bamThay: false }, bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const khung = await khungCuaNguoiGoi(env.DB, nen2, staff, bayGioMs);
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, khung, false) satisfies CuocChiTietResponse);
    }),

    // route 29 ↔ 39
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/thu-tu", "staff", async ({ env, request, params, staff, nhanNhanVien, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.view", { assigned: true })) return CAN_XEM_CUOC();
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.progress", { assigned })) return KHONG_CO_CHUYEN();
      const than = docDoiThuTu(await readJson(request));
      if (!than.ok) return error(400, than.code, than.message);
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["STOPS_REORDERED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const khungTruoc = await khungCuaNguoiGoi(env.DB, nen, staff, bayGioMs); // A4 CAO-1b: vế hạn NGOÀI khung → thân 409 không mã đơn
        const r = await lenhDoiThuTu(env.DB, nen, than.value, { id: staff.id, bamThay: false }, bayGioMs, khungTruoc.han !== undefined && !khungTruoc.trongKhung);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const khung = await khungCuaNguoiGoi(env.DB, nen2, staff, bayGioMs);
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      // Phản hồi lệnh tiến độ KHÔNG kèm họ tên / liên hệ — chỉ GET /cuoc-cua-toi/:id (TC-39: đúng hai route van-chuyen trả tên); màn tải lại chi tiết.
      return json(await cuocChiTiet(env.DB, nen2, lich2.chang, [], null, nhanNhanVien, bayGioMs, khung, false) satisfies CuocChiTietResponse);
    }),

    // ADR-0052 D5b (Vận chuyển Đợt 5 A-1b — chủ duyệt 5/10): tài xế BỔ SUNG TÊN một khách chưa có tên trên chuyến mình đang lái, trong ngày chạy. Thứ tự:
    // can(trip.passenger.add) → chuyến mình đang lái → trong ngày chạy → thân (CÙNG luật nhập tên ở đơn) → suất / đơn (lenhBoSungTen). Phản hồi { ok, soNguoi }
    // — KHÔNG tên (màn đọc lại GET chi tiết). Câu ghi dòng hành khách do orders cấp, gọi trong thân route sau can() (bài src/orders-cong-bo.test.ts).
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/hanh-khach", "staff", async ({ env, request, params, staff, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.passenger.add", { assigned: true })) return error(403, "forbidden", "Tài khoản này không bổ sung tên khách được.");
      const nen = await docNen(env.DB, params.id ?? "");
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.passenger.add", { assigned })) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const homNay = vnToday(new Date(bayGioMs));
      if (!(await khungCuaNguoiGoi(env.DB, nen, staff, bayGioMs)).trongKhung) return KHONG_CO_CHUYEN();
      const body = await readJson(request);
      const than = docBoSungTen(body);
      if (!than.ok) return error(400, than.code, than.message);
      const nguoi = kiemHanhKhachTaiXe(body, homNay);
      if (!nguoi.ok) return error(400, "invalid_input", nguoi.message);
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["PASSENGER_NAMED"], suatId: than.value.suatId });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const hk = await hanhKhachChoChuyen(env.DB, nen.legIds);
        const r = await lenhBoSungTen(env.DB, nen, hk, than.value.suatId, than.value.requestId, (v) =>
          cauThemHanhKhachTaiXe(env.DB, { id: v.id, orderId: v.orderId, ...nguoi.value, at: v.lucIso, by: staff.id }, v.cmd), staff, bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      return json({ ok: true, soNguoi: 1 });
    }),

    // ADR-0053 D8.3, D8.4, D8.6 (kế hoạch A4 T7, G-A4-15): tài xế TỪ CHỐI chuyến mình đang lái trước hạn. Thứ tự: (1) ô trip.refuse {assigned} → 403; (2) đọc chuyến
    // + mã yêu cầu LỎNG; (3) lệnh lặp của CHÍNH MÌNH (sự kiện DRIVER_REFUSED cùng chuyến, cùng người tạo) → 200 — dòng lái đã đóng nên phải xét TRƯỚC "đang lái";
    // (4) không đang lái → Toàn quyền 403 (không từ chối thay — đổi người bằng xếp xe), còn lại 404; (5) thân sai → 400; (6) mã yêu cầu đã dùng cho việc khác —
    // kể cả Từ chối của NGƯỜI KHÁC cùng mã → 409 request_id_reused (không lộ việc người khác đã Từ chối); (7) lô (`lenhTuChoi`). Phản hồi không kèm dữ liệu chuyến.
    route("POST", "/api/van-chuyen/cuoc-cua-toi/:id/tu-choi", "staff", async ({ env, request, params, staff, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.refuse", { assigned: true })) return error(403, "forbidden", "Tài khoản này không từ chối chuyến được.");
      const id = params.id ?? "";
      const nen = await docNen(env.DB, id);
      const body = await readJson(request);
      const ridLong = requestIdLong(body);
      if (ridLong !== null && (await suKienTheoYeuCau(env.DB, ridLong)).some((e) => e.kind === "DRIVER_REFUSED" && e.trip_id === id && e.created_by === staff.id)) {
        return json({ daTuChoi: true } satisfies TuChoiResponse);
      }
      const assigned = dangLai(nen, staff);
      if (!nen || !assigned || !can(staff, "trip.refuse", { assigned })) {
        return can(staff, "trip.refuse") ? error(403, "forbidden", "Toàn quyền không từ chối thay — đổi người bằng xếp xe.") : KHONG_CO_CHUYEN();
      }
      const than = docTuChoi(body);
      if (!than.ok) return error(400, than.code, than.message);
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["DRIVER_REFUSED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhTuChoi(env.DB, nen, than.value, staff, Date.now());
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
        return json({ daTuChoi: true } satisfies TuChoiResponse);
      }
      return MA_LENH_DUNG_LAI(); // sự kiện Từ chối cùng mã nhưng KHÔNG của mình (bước 3 đã nhận lệnh lặp của chính mình)
    }),

    // ---- BÁO BẬN CỦA TÔI (ADR-0053 D9; kế hoạch A4 T8) — cổng staff, ô unavailability.self với ownerId = CHÍNH người gọi; khung luôn của staff.partyId
    // (không nhận id tài xế từ thân). Thứ tự 403 → 404 → 400. Thân không có requestId (G-A4-28). Không gửi tin (D9.4). Logic ở bao-ban.ts.
    route("GET", "/api/van-chuyen/ban/cua-toi", "staff", async ({ env, staff }) => {
      if (!can(staff, "unavailability.self", { ownerId: staff.id }) || !staff.partyId) return error(403, "forbidden", "Tài khoản này không báo bận được.");
      return khungCuaToiResponse(env.DB, staff.partyId, Date.now());
    }),
    route("POST", "/api/van-chuyen/ban", "staff", async ({ env, request, staff }) => {
      if (!can(staff, "unavailability.self", { ownerId: staff.id }) || !staff.partyId) return error(403, "forbidden", "Tài khoản này không báo bận được.");
      const bayGioMs = Date.now();
      const r = await lenhGhiKhungBan(env.DB, request, staff, staff.partyId, bayGioMs);
      if (r) return r;
      return kemLocation(await khungCuaToiResponse(env.DB, staff.partyId, bayGioMs, 201), "/ban"); // H7: trang gọi route này (web/ban.ts — T9)
    }),
    route("POST", "/api/van-chuyen/ban/:id/rut", "staff", async ({ env, request, params, staff }) => {
      if (!can(staff, "unavailability.self", { ownerId: staff.id }) || !staff.partyId) return error(403, "forbidden", "Tài khoản này không báo bận được.");
      const bayGioMs = Date.now();
      const r = await lenhRutKhungBan(env.DB, request, params.id ?? "", staff, staff.partyId, bayGioMs);
      if (r) return r;
      return khungCuaToiResponse(env.DB, staff.partyId, bayGioMs);
    }),

    // ---- LỆNH TIẾN ĐỘ — route VĂN PHÒNG BẤM THAY (cổng office; kế hoạch mục 1.7 route 31–39; R-P1 — Task A15) ---------------------------------------------
    // `can(trip.progress)` ĐẦU thân (Kế toán → 403), rồi gọi ĐÚNG hàm xử lý mà route tài xế cùng lệnh gọi (bài tien-do-mot-luat.test.ts). Route 31–38 nhận
    // `xayRaLuc` (văn phòng khai giờ xảy ra — ADR-0050 VK1-A); route 39 (đổi thứ tự) thì không. Phản hồi = chi tiết chuyến của văn phòng.

    // route 31 ↔ 21
    route("POST", "/api/van-chuyen/chuyen/:id/xuat-ben", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["DEPARTED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const lich = await lichChungChang(env.DB, nen.tu, nen.den);
        const hk = await hanhKhachChoChuyen(env.DB, nen.legIds);
        const r = await lenhXuatBen(env.DB, nen, lich.chang, hk, than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    // route 32 ↔ 22
    route("POST", "/api/van-chuyen/chuyen/:id/diem/:sid/da-toi", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["STOP_ARRIVED"], diemId: params.sid ?? "" });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhDaToi(env.DB, nen, params.sid ?? "", than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    // route 33 ↔ 23
    route("POST", "/api/van-chuyen/chuyen/:id/phan-bo/:aid/don", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["PASSENGER_BOARDED"], suatId: params.aid ?? "" });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhDaDon(env.DB, nen, params.aid ?? "", than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    // route 34 ↔ 24
    route("POST", "/api/van-chuyen/chuyen/:id/phan-bo/:aid/vang", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["PASSENGER_NO_SHOW"], suatId: params.aid ?? "" });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhVang(env.DB, nen, params.aid ?? "", than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    // route 35 ↔ 25
    route("POST", "/api/van-chuyen/chuyen/:id/phan-bo/:aid/khach-huy", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["PASSENGER_CANCELLED_AT_STOP"], suatId: params.aid ?? "" });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhKhachHuy(env.DB, nen, params.aid ?? "", than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    // route 36 ↔ 26
    route("POST", "/api/van-chuyen/chuyen/:id/phan-bo/:aid/tra", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["PASSENGER_DROPPED"], suatId: params.aid ?? "" });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhDaTra(env.DB, nen, params.aid ?? "", than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    // route 37 ↔ 27
    route("POST", "/api/van-chuyen/chuyen/:id/ket-thuc", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docTienDo(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["ENDED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhKetThuc(env.DB, nen, than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    // route 38 ↔ 28
    route("POST", "/api/van-chuyen/chuyen/:id/ket-thuc-gian-doan", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docKetThucGianDoan(await readJson(request), { nhanXayRa: true });
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["ENDED_INTERRUPTED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhKetThucGianDoan(env.DB, nen, than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    // route 39 ↔ 29
    route("POST", "/api/van-chuyen/chuyen/:id/thu-tu", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docDoiThuTu(await readJson(request));
      if (!than.ok) return error(400, than.code, than.message);
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, than.value.requestId, { tripId: nen.trip.id, loai: ["STOPS_REORDERED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhDoiThuTu(env.DB, nen, than.value, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: than.value.requestId }); // ADR-0052 D6.3: sau lô thành công, bắn-và-quên; không gọi khi 4xx / lệnh lặp
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      return json(await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch")) satisfies ChuyenChiTietResponse);
    }),

    // ---- SỰ KIỆN ĐIỀU CHỈNH CÓ LÝ DO (ADR-0097 Đ2, Đ3 — gói A1, V3-B): CHỈ văn phòng — cổng office + ô trip.progress KHÔNG ngữ cảnh ĐẦU thân (Kế toán → 403;
    // tài xế không có route — cổng office đã chặn). Qua lớp vé chống ghi trùng (ADR-0094) như mọi route ghi. Ghi được → 201 + Location trang chuyến; lệnh lặp
    // cùng requestId → 200 chi tiết hiện tại (không ghi lần hai). Phản hồi không kèm tên khách (Đ2.6 — chi tiết chuyến của văn phòng như mọi lệnh khác).
    route("POST", "/api/van-chuyen/chuyen/:id/phan-bo/:aid/dieu-chinh", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docDieuChinhSuat(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: nen.trip.id, loai: ["CORRECTION"], suatId: params.aid ?? "" });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const hk = await hanhKhachChoChuyen(env.DB, nen.legIds);
        const r = await lenhDieuChinhSuat(env.DB, nen, hk, params.aid ?? "", b, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId }); // ADR-0097 Đ5: tin cho tài xế đang lái + người có trip.dispatch (tin-chuyen.ts)
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      const body = (await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch"))) satisfies ChuyenChiTietResponse;
      return json(body, lap ? 200 : 201, { location: `/chuyen?id=${nen2.trip.id}` });
    }),
    route("POST", "/api/van-chuyen/chuyen/:id/thu-hoi-xuat-ben", "office", async ({ env, request, params, staff, nhanNhanVien, isAssigned, baoThayDoiChuyen }) => {
      if (!can(staff, "trip.progress")) return CAN_BAM_THAY();
      const than = docThuHoiXuatBen(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      const b = than.value;
      const nen = await docNen(env.DB, params.id ?? "");
      if (!nen) return KHONG_CO_CHUYEN();
      const bayGioMs = Date.now();
      const lap = await traLenhLap(env.DB, b.requestId, { tripId: nen.trip.id, loai: ["DEPARTURE_REVOKED"] });
      if (lap instanceof Response) return lap;
      if (!lap) {
        const r = await lenhThuHoiXuatBen(env.DB, nen, b, nguoiBamVanPhong(staff, nen), bayGioMs);
        if (r) return r;
        baoThayDoiChuyen({ tripId: nen.trip.id, requestId: b.requestId }); // ADR-0097 Đ5
      }
      const nen2 = (await docNen(env.DB, nen.trip.id))!;
      const lich2 = await lichChungChang(env.DB, nen2.tu, nen2.den);
      const hk2 = await hanhKhachChoChuyen(env.DB, nen2.legIds);
      const body = (await chiTietChuyen(env.DB, nen2, lich2.chang, hk2, false, nhanNhanVien, quyenGoiBaoCua(staff, isAssigned), bayGioMs, can(staff, "trip.dispatch"))) satisfies ChuyenChiTietResponse;
      return json(body, lap ? 200 : 201, { location: `/chuyen?id=${nen2.trip.id}` });
    }),

    // ---- XE TRÊN CHI TIẾT ĐƠN (ADR-0059) — màn chi tiết đơn gọi THÊM route này (khuôn ADR-0024 điều 4). HAI lần hỏi quyền KHÔNG ngữ cảnh, TRƯỚC mọi truy vấn
    // (không dựa vào việc cổng office hôm nay trùng tập trip.view = any): trip.view (Tài xế công ty — assigned — bị từ chối) VÀ order.view (chỉ người xem mọi
    // đơn). Bài ghim "trip.view = any ⇒ order.view = any" ở src/shared/permissions.test.ts. Đọc, không ghi nhật ký; nhật ký trip_* vẫn không gắn đơn.
    route("GET", "/api/van-chuyen/xe-cua-don/:orderId", "office", async ({ env, params, staff }) => {
      if (!can(staff, "trip.view") || !can(staff, "order.view")) return CAN_XEM_XE_DON();
      const orderId = params.orderId ?? "";
      if (!(await donTonTai(env.DB, orderId))) return error(404, "not_found", "Không tìm thấy đơn.");
      const [legIds, rows] = await Promise.all([changMoCuaDon(env.DB, orderId), xeCuaDon(env.DB, orderId)]);
      return json(xeCuaDonDto(legIds, rows) satisfies XeCuaDonResponse);
    }),

    // ---- NHẮC "GỌI BÁO KHÁCH" KHI GIỜ HẸN ĐỔI (ADR-0051 GB1, GB2 — Task A-GB) ----------------------------------------------------------------------------
    // Danh sách nhắc KHÔNG theo ngày đang xem (Q-GB-3 = (a) "Hiện ngay hôm nay"): chuyến chưa kết thúc có ngày CHUYẾN trong [hôm nay − 1, hôm nay + 14]. Giờ hẹn
    // hiện hành đọc THEO ID qua hàm hẹp `hanhKhachChoChuyen` (sau `can()`); tên khách của hàm đó KHÔNG ra DTO (TC-GB-9b).
    route("GET", "/api/van-chuyen/nhac-goi-khach", "office", async ({ env, staff, isAssigned }) => {
      if (!can(staff, "trip.view")) return CAN_XEM_CHUYEN();
      const homNay = vnToday(new Date());
      const tu = addDays(homNay, -1);
      const den = addDays(homNay, NHAC_GOI_SO_NGAY);
      const legIds = await changChoTrongKhoang(env.DB, tu, den);
      const hk = await hanhKhachChoChuyen(env.DB, legIds);
      const d = await docGoiBao(env.DB, legIds);
      return json({ tu, den, muc: await danhSachNhac(legIds, hk, d, quyenGoiBaoCua(staff, isAssigned)) } satisfies NhacGoiKhachResponse);
    }),

    // Thứ tự mã CỐ ĐỊNH (GB1): 403 thô (trip.view + trip.call_ack ≠ none ở một cột — trước mọi truy vấn) → 404 (chặng lạ, qua v_ord_leg_key) → 403 (người lập /
    // người phụ trách đơn / Quản trị / Toàn quyền) → 400 (thân) → lệnh lặp 200 → 409 (khong_con_can_goi / gio_hen_vua_doi). Không chạm vc_trip (không version).
    route("POST", "/api/van-chuyen/chang/:legId/da-goi-bao", "office", async ({ env, request, params, staff, isAssigned, nhanNhanVien }) => {
      if (!can(staff, "trip.view") || !can(staff, "trip.call_ack", { ownerId: staff.id, assigned: true })) return CAN_GOI_BAO();
      const legId = params.legId ?? "";
      const chu = (await changChuDon(env.DB, [legId]))[0];
      if (!chu) return KHONG_CO_CHANG();
      if (!can(staff, "trip.call_ack", { ownerId: chu.owner_id ?? undefined, assigned: await isAssigned(chu.order_id) })) return CAN_GOI_BAO();
      const than = docDaGoiBao(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      // Lệnh lặp → kết quả của LẦN ĐẦU, dựng từ dòng mốc mang requestId (ADR-0051 bước 4; K2a T2) — không đọc trạng thái mới nhất.
      const lap = await mocByRequest(env.DB, than.value.requestId);
      if (lap) return json((await phanHoiLenhLap(env.DB, lap, quyenGoiBaoCua(staff, isAssigned), await nhanNhanVien(lap.created_by ? [lap.created_by] : []))) satisfies GoiBaoChangDto);
      const hk = await hanhKhachChoChuyen(env.DB, [legId]);
      const r = await xuLyMoc("DA_GOI", env.DB, legId, hk, than.value, staff.id, Date.now());
      if (r) return r;
      // R-P30 (GA-67): phản hồi lần đầu dựng từ CHÍNH dòng vừa ghi — cùng hàm với lệnh lặp ⇒ lặp trả y hệt lần đầu, lệnh khác chen vào sau lô không đổi kết quả.
      const dong = await mocByRequest(env.DB, than.value.requestId);
      if (!dong) throw new Error("da-goi-bao: lô đã chạy mà không thấy dòng mốc của requestId");
      return json((await phanHoiLenhLap(env.DB, dong, quyenGoiBaoCua(staff, isAssigned), await nhanNhanVien(dong.created_by ? [dong.created_by] : []))) satisfies GoiBaoChangDto);
    }),

    // Thứ tự mã CỐ ĐỊNH (GB1): 403 thô (trip.view + trip.call_ack ≠ none ở một cột — trước mọi truy vấn) → 404 (chặng lạ, qua v_ord_leg_key) → 403 (người lập /
    // người phụ trách đơn / Quản trị / Toàn quyền) → 400 (thân) → lệnh lặp 200 → 409 (khong_con_can_goi / gio_hen_vua_doi). Không chạm vc_trip (không version).
    route("POST", "/api/van-chuyen/chang/:legId/bo-danh-dau-goi-bao", "office", async ({ env, request, params, staff, isAssigned, nhanNhanVien }) => {
      if (!can(staff, "trip.view") || !can(staff, "trip.call_ack", { ownerId: staff.id, assigned: true })) return CAN_GOI_BAO();
      const legId = params.legId ?? "";
      const chu = (await changChuDon(env.DB, [legId]))[0];
      if (!chu) return KHONG_CO_CHANG();
      if (!can(staff, "trip.call_ack", { ownerId: chu.owner_id ?? undefined, assigned: await isAssigned(chu.order_id) })) return CAN_GOI_BAO();
      const than = docBoDanhDauGoiBao(await readJson(request));
      if (!than.ok) return error(400, "invalid_input", than.message);
      // Lệnh lặp → kết quả của LẦN ĐẦU, dựng từ dòng mốc mang requestId (ADR-0051 bước 4; K2a T2) — không đọc trạng thái mới nhất.
      const lap = await mocByRequest(env.DB, than.value.requestId);
      if (lap) return json((await phanHoiLenhLap(env.DB, lap, quyenGoiBaoCua(staff, isAssigned), await nhanNhanVien(lap.created_by ? [lap.created_by] : []))) satisfies GoiBaoChangDto);
      const hk = await hanhKhachChoChuyen(env.DB, [legId]);
      const r = await xuLyMoc("BO_DANH_DAU", env.DB, legId, hk, than.value, staff.id, Date.now());
      if (r) return r;
      // GA-59: phản hồi lần đầu dựng từ CHÍNH dòng vừa ghi (bản chụp kết quả) — cùng hàm với lệnh lặp ⇒ lặp trả y hệt lần đầu.
      const dong = await mocByRequest(env.DB, than.value.requestId);
      if (!dong) throw new Error("bo-danh-dau-goi-bao: lô đã chạy mà không thấy dòng mốc của requestId");
      return json((await phanHoiLenhLap(env.DB, dong, quyenGoiBaoCua(staff, isAssigned), null)) satisfies GoiBaoChangDto);
    }),
  ],
};
