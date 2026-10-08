// BÀI THỨ TỰ LÔ (ADR-0049 D1 "Thứ tự lô"; kế hoạch mục 1.5; TC-32 — Task A14). Chạy MỌI hàm dựng lô xuất từ dieu-phoi.ts (danh sách TỰ SUY bằng quét tên xuất
// `export function lo…`; hàm mới chưa có mẫu → đỏ; chống bài rỗng ≥ 12 lệnh) trên một D1 GIẢ ghi lại câu SQL + tham số, rồi kiểm bốn luật trên chính danh sách
// câu có nhãn:
//   (1) câu CỔNG đứng đầu — riêng lệnh tiến độ khuôn (a): câu `CHUYEN_TIEN_DO` đứng đầu (tự gác "chuyến đang chạy"), câu cổng thứ hai với `changes() > 0`;
//       lệnh dời: cổng nguồn rồi `CONG_DOI` (cổng đích chỉ thắng khi nguồn đã mang dấu lệnh);
//   (2) `NHAT_KY` NGAY sau (các) câu cổng, có `changes() > 0`;
//   (3) MỌI câu sau nhật ký mang lính gác dấu lệnh — `EXISTS (SELECT 1 FROM vc_trip WHERE id = ?a AND last_cmd_id = ?b)` hoặc (câu sửa chính `vc_trip`)
//       `WHERE id = ?a AND last_cmd_id = ?b` — và tham số `?b` bằng ĐÚNG dấu lệnh của lô, `?a` bằng chuyến được cổng (lệnh dời: chuyến ĐÍCH);
//   (4) câu `TRANG_THAI_CUOI` (nếu có) đứng CUỐI, nhiều nhất một.
// NGOẠI LỆ luật 3 (ruling VỪA-2 — ADR-0051 "Đã gọi báo", Task A-GB): họ lệnh trên mốc giờ hẹn KHÔNG chạm vc_trip — chỉ các hàm LIỆT KÊ TÊN ở HO_LENH_MOC
// được dùng nhãn `CONG_MOC`, và phải ĐÚNG HAI câu: `CONG_MOC` (INSERT có điều kiện `max(seq)`) rồi `NHAT_KY` (`changes() > 0`). Hàm khác dùng CONG_MOC → đỏ.
// NGOẠI LỆ luật 3 thứ hai (Đợt 5 A-1b — chủ duyệt 5/10, đề xuất luật A-1b mục 2): nhãn `GHI_NGOAI` = câu ghi do module KHÁC cấp (orders — dòng hành khách tài xế
// nhập), gác bằng ID NHẬT KÝ của lô `EXISTS (SELECT 1 FROM audit_log WHERE id = ?n)` với ?n = dấu lệnh. CHỈ hàm có tên ở CHO_GHI_NGOAI; hàm khác dùng → đỏ.
// Danh sách hàm tự suy bằng quét MỌI `export function` của dieu-phoi.ts (không chỉ tên `lo…`).
// NGOẠI LỆ luật 1 (ADR-0104 Đ2.3 — chủ duyệt cùng ADR 2026-10-08; nới có tên N1 ở docs/SO-HANG-RAO.md): lô ĐỒNG BỘ CHUYẾN THEO ĐƠN (`loDongBoChuyen`) mở đầu bằng
// các câu của orders (nhãn `CAU_DON`, đã soạn, chưa chạy — cổng đơn đứng đầu như hôm nay), rồi TỪNG KHÚC chuyến tự đúng bốn luật với DẤU LỆNH riêng của khúc
// (trường `cmd` của câu) và C38 tính riêng từng khúc (một câu sự kiện mang `requestId` riêng). CHỈ hàm có tên ở CHO_CAU_DON được dùng nhãn `CAU_DON`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const TEP = fileURLToPath(new URL("./dieu-phoi.ts", import.meta.url));
const built = await esbuild.build({ entryPoints: [TEP], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const MOD = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Record<string, unknown>;

type Cau = { nhan: string; stmt: { sql: string; args: unknown[] }; cmd?: string };
const DB = { prepare: (sql: string) => ({ sql, bind: (...args: unknown[]) => ({ sql, args }) }) };
const CMD = "c0000000-0000-4000-8000-00000000c0de";
const T = "t-nguon";
const T2 = "t-dich";
const L = { cmd: CMD, requestId: "r0000000-0000-4000-8000-000000000001", lucIso: "2027-03-11T05:00:00.000Z", nguoiId: "s-1" };
const XR = { iso: L.lucIso, ms: Date.parse(L.lucIso), nguon: "MAY_CHU" };
const suat = (id: string, trip = T) => ({ id, tripId: trip, loai: "PASSENGER", legId: "leg-1", personKey: null, crewPartyId: null, boardStopId: "d-1", alightStopId: "d-2" });
const diem = (id: string, trip = T) => ({ id, tripId: trip, seq: 3, loai: "PICKUP", locationId: "loc-1", placeText: null, placeKey: "L:loc-1" });
// ADR-0057 C4 (kế hoạch Đợt 4 Task 9): kế hoạch chi phí ĐỦ nhánh — một đảo âm, một đảo dương, một chụp.
const DAO_AM = { id: "cl-r1", goc: { id: "cl-a", amount: -200000, carrierPartyId: "p-1" }, lyDo: "CPX_DOI_CHUYEN", ngay: "2027-03-11" };
const DAO_DUONG = { id: "cl-r2", goc: { id: "cl-s", amount: 1200000, carrierPartyId: "p-1" }, lyDo: "CPX_DOI_CHUYEN", ngay: "2027-03-11" };
const CHUP = { id: "cl-s2", rateId: "rate-1", amount: 900000, carrierPartyId: "p-1", routeCode: "T001", sizeCode: "S001", soCho: 16, ngayChay: "2027-03-11" };
const CHI_PHI = { dao: [DAO_AM, DAO_DUONG], chup: CHUP, phienBan: 2, daoDieuChinh: 1, tongTruoc: 1000000, tongSau: 900000 };
// ADR-0056 VK3-A (Đợt 7 Task 4): câu ghi / xoá cột phá lệ cam kết của chuyến — nhãn CAM_KET_PHA_LE.
const CAM_KET_GHI = { lyDo: "PHA_LE_SU_CO", khoa: "xe:x-1|leg-1:XR:1:-|leg-2:XR:0:-" };
const CAM_KET_XOA = { lyDo: null, khoa: null };

// ADR-0104 Đ2 — mẫu lô đồng bộ theo đơn: câu orders đã soạn (giả) + hai khúc chuyến.
const AUDIT_DON = "a0000000-0000-4000-8000-0000000000d0";
const CAU_DON_MAU = [
  { sql: "UPDATE orders SET status = 'cancelled' WHERE id = ?1 AND updated_at = ?2", args: ["o-1", "t0"] },
  { sql: "INSERT INTO audit_log (id) SELECT ?1 WHERE changes() > 0", args: [AUDIT_DON] },
];
const CMD_2 = "c0000000-0000-4000-8000-00000000c0d2";
const KHUC_1 = {
  ...L, tripId: T, version: 3, auditIdDon: AUDIT_DON, orderId: "o-1", dong: [{ suatId: "a-1", lyDo: "REMOVED" }, { suatId: "a-2", lyDo: "PASSENGER_CHANGED" }],
  mo: [suat("a-9")], diemBoQua: ["d-1"], camKet: CAM_KET_XOA, soNguoi: 2, detail: "d",
};
const KHUC_2 = {
  cmd: CMD_2, requestId: "r0000000-0000-4000-8000-000000000002", lucIso: L.lucIso, nguoiId: L.nguoiId, tripId: T2, version: 5, auditIdDon: AUDIT_DON, orderId: "o-1",
  dong: [{ suatId: "b-1", lyDo: "REMOVED" }], mo: [], diemBoQua: [], camKet: CAM_KET_XOA, soNguoi: 1, detail: "d",
};
/** Mẫu đầu vào của TỪNG hàm dựng lô (đủ nhánh: có đổi tài xế, có điểm mới, có điểm bỏ qua…) + chuyến mà câu cổng gác. */
const MAU: Record<string, { vao: Record<string, unknown>; gac: string }> = {
  loTaoChuyen: {
    vao: {
      ...L, chuyen: { id: T, ma: "CX-1103-01", xeId: "x-1", chuXePartyId: "p-1", ngayChay: "2027-03-11", batDauMs: 1, ketThucMs: 2, nghiChup: 30, nghiPhaLeLyDo: null, thue: 1, tuyen: "T001" },
      taiXePartyId: "p-tx", policyId: null, phaLeNghi: null, chiPhi: { ...CHI_PHI, dao: [], phienBan: 0 }, detail: "d",
    },
    gac: T,
  },
  loSuaChuyen: {
    vao: {
      ...L, tripId: T, version: 3, moi: { xeId: "x-1", chuXePartyId: "p-1", ngayChay: "2027-03-11", batDauMs: 1, ketThucMs: 2, batDauSomNhatMs: 1, nghiPhaLeLyDo: null, thue: 1, tuyen: "T001", nghiChup: 45 },
      doiTaiXe: "p-tx2", diem: [{ id: "d-1", seq: 2, ngayXeToi: null, gioXeToi: null }], phaLe: null, policyId: null, chiPhi: CHI_PHI, phienBanChiPhi: 2, camKet: CAM_KET_GHI, detail: "d",
    },
    gac: T,
  },
  loXep: { vao: { ...L, tripId: T, version: 3, diemMoi: [diem("d-9")], doiThuTu: [{ id: "d-2", seq: 4 }], mocXep: [{ legId: "leg-1", ngay: "2027-03-11", gio: "09:00" }], suatMoi: [suat("a-1"), suat("a-2")], phaLe: null, policyId: null, camKet: CAM_KET_GHI, detail: "d" }, gac: T },
  loRut: { vao: { ...L, tripId: T, version: 3, suatIds: ["a-1"], diemBoQua: ["d-1"], phaLe: null, policyId: null, camKet: CAM_KET_XOA, detail: "d" }, gac: T },
  loDoi: {
    vao: { ...L, nguon: { tripId: T, version: 3 }, dich: { tripId: T2, version: 5 }, cap: [{ dongId: "a-1", mo: suat("a-9", T2) }], diemMoiDich: [diem("d-9", T2)], doiThuTuDich: [{ id: "d-8", seq: 4 }], diemBoQuaNguon: ["d-1"], phaLe: null, policyId: null, camKetNguon: CAM_KET_XOA, camKetDich: CAM_KET_GHI, detail: "d" },
    gac: T2,
  },
  loHuy: { vao: { ...L, tripId: T, version: 3, lyDo: "HUY_KHAC", phaLe: null, policyId: null, soSuatMo: 2, chiPhi: { ...CHI_PHI, chup: null }, phienBanChiPhi: 2, detail: "d" }, gac: T },
  loCapNhatDiem: { vao: { ...L, tripId: T, version: 3, diemMoi: [diem("d-9")], doiThuTu: [{ id: "d-2", seq: 4 }], cap: [{ dongId: "a-1", mo: suat("a-9") }], diemBoQua: ["d-1"], camKet: CAM_KET_XOA, detail: "d" }, gac: T },
  // R-P29 (chủ lần 16): "cập nhật khách theo đơn" — ADR-0104 Đ2.11: nút tay dùng chung luật thuần ⇒ đóng theo mã của từng luật (khách đổi PASSENGER_CHANGED, đơn
  // huỷ / thừa suất REMOVED), ĐÓNG hết rồi mới MỞ lại.
  loCapNhatKhach: {
    vao: { ...L, tripId: T, version: 3, dong: [{ suatId: "a-1", lyDo: "PASSENGER_CHANGED" }, { suatId: "a-2", lyDo: "REMOVED" }], mo: [suat("a-9")], diemBoQua: ["d-1"], camKet: CAM_KET_XOA, detail: "d" },
    gac: T,
  },
  // ADR-0104 Đ2: lô ĐỒNG BỘ THEO ĐƠN — hai câu orders (cổng đơn + nhật ký đơn) rồi HAI khúc chuyến, mỗi khúc dấu lệnh + request_id riêng (gác theo từng khúc).
  loDongBoChuyen: { vao: { cauDon: CAU_DON_MAU, khuc: [KHUC_1, KHUC_2] }, gac: "" },
  loXuatBen: {
    vao: {
      ...L, tripId: T, version: 3, xayRa: XR, policyId: "cs-1", ganTen: [{ suatId: "a-1", personKey: "pk-1" }],
      chup: { id: "ck-1", xeId: "x-1", bienSo: "79B00001", soCho: 15, chuXePartyId: "p-1", taiXePartyId: "p-tx", nghiDaDung: 30 },
      muc: [{ loai: "GPLX", vehicleDocumentId: null, personDocumentId: "g-1", documentTypeCode: "GPLX", licenseClassCode: "D1", expiryDate: null, ruleId: null }],
      chot: [{ allocationId: "a-1", passengerRowId: "row-1", crewPartyId: null }], soKhach: 1, xoaCamKet: true, detail: "d",
    },
    gac: T,
  },
  loDaToi: { vao: { ...L, tripId: T, stopId: "d-1", xayRa: XR, policyId: null, detail: "d" }, gac: T },
  loSuat: { vao: { ...L, tripId: T, suatId: "a-1", lenh: "DA_TRA", stopId: "d-2", diemXet: ["d-1", "d-2"], xayRa: XR, policyId: null, detail: "d" }, gac: T },
  loKetThuc: { vao: { ...L, tripId: T, xayRa: XR, policyId: null, detail: "d" }, gac: T },
  loKetThucGianDoan: { vao: { ...L, tripId: T, xayRa: XR, policyId: null, lyDo: "GIAN_DOAN_KHAC", soSuatDong: 1, detail: "d" }, gac: T },
  loDoiThuTu: { vao: { ...L, tripId: T, diem: [{ id: "d-2", seq: 5 }], policyId: null, detail: "d" }, gac: T },
  // ADR-0052 D5 (Đợt 5): văn phòng thêm điểm / khách vào xe ĐANG CHẠY (có phá lệ mốc + bản chốt dòng thêm sau xuất bến); báo huỷ một suất.
  loThemDiemDangChay: {
    vao: {
      ...L, tripId: T, version: 7, diemMoi: [diem("d-9")], doiThuTu: [{ id: "d-2", seq: 4 }], mocXep: [{ legId: "leg-1", ngay: "2027-03-11", gio: "09:00" }],
      suatMoi: [suat("a-1"), suat("a-2")], chot: [{ allocationId: "a-1", passengerRowId: "row-1" }], phaLe: { luat: "MOC_TOI_THIEU", lyDo: "PHA_LE_SU_CO", policyId: "cs-1" }, policyId: "cs-1", camKet: CAM_KET_GHI, detail: "d",
    },
    gac: T,
  },
  loBaoHuy: { vao: { ...L, tripId: T, version: 7, suatId: "a-1", lyDo: "BAO_HUY_KHONG_DI", detail: "d" }, gac: T },
  // Đợt 5 A-1b (ADR-0052 D5b): tài xế bổ sung tên — xe đang chạy (có bản chốt dòng thêm sau xuất bến). Câu orders mô phỏng đúng khuôn gác id nhật ký.
  loBoSungTen: {
    vao: { ...L, tripId: T, version: 7, dangChay: true, suatId: "a-1", personKey: "pk-moi", hanhKhach: { sql: "INSERT INTO ord_passenger (id) SELECT ?1 WHERE EXISTS (SELECT 1 FROM audit_log WHERE id = ?8)", args: ["pk-moi", 0, 0, 0, 0, 0, 0, CMD] }, detail: "d" },
    gac: T,
  },
  // ADR-0097 (gói A1, V3-B): văn phòng điều chỉnh kết quả một suất (suất có tên → bản chốt dòng thêm sau xuất bến; hai điểm tự xong; câu CHỐT cuối) và thu hồi
  // xuất bến (trạng thái cuối RUNNING → PLANNED).
  loDieuChinh: {
    vao: { ...L, tripId: T, version: 7, suatId: "a-1", suatMoiId: "a-9", trangThaiMoi: "NO_SHOW", lyDo: "DIEU_CHINH_BAM_NHAM", passengerRowId: "row-1", diemXet: ["d-1", "d-2"], detail: "d" },
    gac: T,
  },
  loThuHoiXuatBen: { vao: { ...L, tripId: T, version: 7, lyDo: "DIEU_CHINH_BAM_NHAM", detail: "d" }, gac: T },
  lenhDaGoiBao: { vao: { ...L, legId: "leg-1", phienBan: 1, moi: { ngay: "2027-03-11", gio: "09:15" }, cu: { ngay: "2027-03-11", gio: "09:00" }, tripId: T, detail: "d" }, gac: T },
  lenhBoDanhDauGoiBao: {
    vao: { ...L, legId: "leg-1", phienBan: 2, moi: { ngay: "2027-03-11", gio: "09:00" }, cu: { ngay: "2027-03-11", gio: "09:15" }, tripId: T, detail: "d", banChup: "null" }, gac: T,
  },
};
/** Họ lệnh trên mốc giờ hẹn (ADR-0051; ruling VỪA-2) — LIỆT KÊ TÊN. Thêm tên = NỚI luật 3 — người kiểm soi. */
const HO_LENH_MOC = ["lenhDaGoiBao", "lenhBoDanhDauGoiBao"];
/** Luật riêng cho họ lệnh mốc: đúng hai câu CONG_MOC (INSERT … max(seq)) + NHAT_KY (changes() > 0). */
export function viPhamLoMoc(ten: string, lo: readonly Cau[]): string[] {
  const loi: string[] = [];
  if (lo.length !== 2) loi.push(`${ten}: họ lệnh mốc phải đúng hai câu, thấy ${lo.length}`);
  if (lo[0]?.nhan !== "CONG_MOC" || !/^INSERT INTO vc_leg_appt_ack/.test(lo[0].stmt.sql.trim()) || !/max\(seq\)/.test(lo[0].stmt.sql)) loi.push(`${ten}: câu đầu phải là CONG_MOC — INSERT có điều kiện max(seq)`);
  if (lo[1]?.nhan !== "NHAT_KY" || !/changes\(\) > 0/.test(lo[1].stmt.sql)) loi.push(`${ten}: câu thứ hai phải là NHAT_KY với changes() > 0`);
  return loi;
}

/** Hàm được dùng nhãn GHI_NGOAI (câu module khác gác bằng id nhật ký) — LIỆT KÊ TÊN. Thêm tên = NỚI luật 3 — chủ duyệt 5/10 (đề xuất luật A-1b mục 2). */
const CHO_GHI_NGOAI = ["loBoSungTen"];
const GAC_NHAT_KY = /EXISTS \(SELECT 1 FROM audit_log WHERE id = \?(\d+)\)/;
const LINH_GAC = /EXISTS \(SELECT 1 FROM vc_trip WHERE id = \?(\d+) AND last_cmd_id = \?(\d+)\)/;
const SUA_CHUYEN = /^UPDATE vc_trip SET[\s\S]*WHERE id = \?(\d+) AND last_cmd_id = \?(\d+)$/;

/** Kiểm bốn luật trên một lô; trả danh sách vi phạm (rỗng = đạt). */
export function viPhamLo(ten: string, lo: readonly Cau[], gac: string, cmd: string = CMD): string[] {
  const loi: string[] = [];
  const nhan = lo.map((c) => c.nhan);
  if (nhan.includes("CONG_MOC")) loi.push(`${ten}: dùng nhãn CONG_MOC mà không có tên trong HO_LENH_MOC`);
  if (nhan.includes("CAU_DON")) loi.push(`${ten}: dùng nhãn CAU_DON ngoài phần đầu lô chung (chỉ CHO_CAU_DON, chỉ trước khúc chuyến)`);
  // (1) cổng đầu
  let sauCong: number;
  if (nhan[0] === "CONG") sauCong = nhan[1] === "CONG_DOI" ? 2 : 1;
  else if (nhan[0] === "CHUYEN_TIEN_DO" && nhan[1] === "CONG") {
    sauCong = 2;
    if (!/changes\(\) > 0/.test(lo[1]!.stmt.sql)) loi.push(`${ten}: cổng sau câu chuyển phải có changes() > 0`);
    if (!/status = 'RUNNING'/.test(lo[0]!.stmt.sql)) loi.push(`${ten}: câu chuyển đứng đầu phải tự gác "chuyến đang chạy"`);
  } else {
    loi.push(`${ten}: câu cổng không đứng đầu (${nhan.slice(0, 3).join(", ")})`);
    sauCong = nhan.findIndex((n) => n === "NHAT_KY");
  }
  if (nhan.slice(sauCong).some((n) => n === "CONG" || n === "CONG_DOI" || n === "CHUYEN_TIEN_DO")) loi.push(`${ten}: câu cổng / chuyển nằm sau nhật ký`);
  // (2) nhật ký ngay sau cổng
  if (nhan[sauCong] !== "NHAT_KY") loi.push(`${ten}: nhật ký không đứng ngay sau câu cổng (vị trí ${sauCong}: ${nhan[sauCong]})`);
  else if (!/changes\(\) > 0/.test(lo[sauCong]!.stmt.sql)) loi.push(`${ten}: nhật ký thiếu changes() > 0`);
  // (3) lính gác dấu lệnh ở MỌI câu sau nhật ký
  for (let i = sauCong + 1; i < lo.length; i++) {
    const { sql, args } = lo[i]!.stmt;
    if (lo[i]!.nhan === "GHI_NGOAI") {
      if (!CHO_GHI_NGOAI.includes(ten)) loi.push(`${ten}: dùng nhãn GHI_NGOAI mà không có tên trong CHO_GHI_NGOAI`);
      const g = GAC_NHAT_KY.exec(sql);
      if (!g) loi.push(`${ten}: câu ${i} (GHI_NGOAI) thiếu gác id nhật ký`);
      else if (args[Number(g[1]) - 1] !== cmd) loi.push(`${ten}: câu ${i} (GHI_NGOAI) gác bằng tham số không phải dấu lệnh của lô`);
      continue;
    }
    const m = LINH_GAC.exec(sql) ?? SUA_CHUYEN.exec(sql.trim());
    if (!m) {
      loi.push(`${ten}: câu ${i} (${lo[i]!.nhan}) thiếu lính gác dấu lệnh`);
      continue;
    }
    if (args[Number(m[2]) - 1] !== cmd) loi.push(`${ten}: câu ${i} gác bằng tham số không phải dấu lệnh của lô`);
    if (args[Number(m[1]) - 1] !== gac) loi.push(`${ten}: câu ${i} gác chuyến ${String(args[Number(m[1]) - 1])} thay vì ${gac}`);
  }
  // (4) trạng thái cuối đứng cuối
  const cuoi = nhan.flatMap((n, i) => (n === "TRANG_THAI_CUOI" ? [i] : []));
  if (cuoi.length > 1 || (cuoi.length === 1 && cuoi[0] !== lo.length - 1)) loi.push(`${ten}: câu trạng thái cuối không đứng cuối lô`);
  return loi;
}

/** Hàm được dùng nhãn CAU_DON (câu orders đứng đầu lô chung) — LIỆT KÊ TÊN. Thêm tên = NỚI luật 1 — ADR-0104 Đ2.3 (nới N1). */
const CHO_CAU_DON = ["loDongBoChuyen"];
const CONG_THEO_DON = /EXISTS \(SELECT 1 FROM v_aud_order_cmd WHERE id = \?(\d+) AND order_id = \?(\d+)\)/;
type CauSk = Cau & { suKien?: { tripId: string; relatedTripId: string | null; loai: string; stopId: string | null; allocationId: string | null } };
/**
 * ADR-0104 Đ2.3 — lô chung: phần đầu ≥ 1 câu `CAU_DON` liền nhau; sau đó TỪNG KHÚC bắt đầu bằng câu `CONG` (cổng theo đơn — hỏi v_aud_order_cmd), mọi câu
 * của khúc mang CÙNG `cmd`, khúc tự đúng bốn luật với dấu lệnh của chính nó và chuyến của chính câu cổng; C38 theo khúc (đúng một câu chèn sự kiện, mang
 * nhãn suKien và `requestId` riêng — không khúc nào dùng lại mã của khúc khác). `requestIds` = mã của từng khúc theo thứ tự (lấy từ đầu vào).
 */
export function viPhamLoNhieuKhuc(ten: string, lo: readonly CauSk[], requestIds: readonly string[]): string[] {
  const loi: string[] = [];
  if (!CHO_CAU_DON.includes(ten)) loi.push(`${ten}: dùng nhãn CAU_DON mà không có tên trong CHO_CAU_DON`);
  const dauKhuc = lo.findIndex((c) => c.nhan !== "CAU_DON");
  const soCauDon = dauKhuc === -1 ? lo.length : dauKhuc;
  if (soCauDon === 0) loi.push(`${ten}: lô chung phải mở đầu bằng câu đơn (CAU_DON) — khúc chuyến đứng trước câu đơn thì cổng chuyến luôn thua`);
  const khuc: CauSk[][] = [];
  for (const c of lo.slice(soCauDon)) {
    if (c.nhan === "CONG") khuc.push([c]);
    else if (khuc.length === 0) {
      loi.push(`${ten}: câu ${c.nhan} sau câu đơn nhưng trước câu cổng của khúc đầu`);
      khuc.push([c]);
    } else khuc[khuc.length - 1]!.push(c);
  }
  if (khuc.length !== requestIds.length) loi.push(`${ten}: ${khuc.length} khúc chuyến, đầu vào có ${requestIds.length}`);
  const daDung = new Set<string>();
  khuc.forEach((k, j) => {
    const cmd = k[0]!.cmd;
    if (!cmd) {
      loi.push(`${ten}: khúc ${j} — câu đầu không mang dấu lệnh (cmd)`);
      return;
    }
    if (daDung.has(cmd)) loi.push(`${ten}: khúc ${j} dùng lại dấu lệnh của khúc trước`);
    daDung.add(cmd);
    if (k.some((c) => c.cmd !== cmd)) loi.push(`${ten}: khúc ${j} có câu mang dấu lệnh khác`);
    if (k[0]!.nhan !== "CONG" || !CONG_THEO_DON.test(k[0]!.stmt.sql)) loi.push(`${ten}: khúc ${j} — câu đầu phải là cổng theo đơn (hỏi v_aud_order_cmd)`);
    const gac = String(k[0]!.stmt.args[0]);
    loi.push(...viPhamLo(`${ten}[khúc ${j}]`, k, gac, cmd));
    const chen = k.filter((c) => /^\s*INSERT INTO vc_trip_event\b/.test(c.stmt.sql));
    const coNhan = k.filter((c) => c.suKien !== undefined);
    if (chen.length !== 1 || coNhan.length !== 1 || coNhan[0] !== chen[0]) loi.push(`${ten}: khúc ${j} có ${chen.length} câu chèn vc_trip_event / ${coNhan.length} nhãn suKien (phải đúng 1, cùng câu)`);
    else {
      const a = chen[0]!.stmt.args;
      if (a[1] !== gac) loi.push(`${ten}: khúc ${j} — sự kiện ghi cho chuyến khác`);
      if (a[0] !== cmd) loi.push(`${ten}: khúc ${j} — id sự kiện không phải dấu lệnh của khúc`);
      if (a[7] !== requestIds[j]) loi.push(`${ten}: khúc ${j} — sự kiện không mang requestId của khúc`);
    }
  });
  if (new Set(requestIds).size !== requestIds.length) loi.push(`${ten}: hai khúc dùng chung một requestId (UNIQUE vc_trip_event.request_id làm hỏng cả lô)`);
  return loi;
}

test("NT-7 (ADR-0104 Đ2.3) bộ bắt lô chung: khúc đứng trước câu đơn, khúc thiếu cổng ở đầu, gác bằng dấu lệnh khúc khác, hai sự kiện trong khúc, requestId của khúc khác / dùng lại, hàm lạ dùng CAU_DON → đỏ; lô đúng → xanh", () => {
  const lo = (MOD.loDongBoChuyen as (db: unknown, l: unknown) => CauSk[])(DB, MAU.loDongBoChuyen!.vao);
  const rq = [KHUC_1.requestId, KHUC_2.requestId];
  assert.deepEqual(viPhamLoNhieuKhuc("loDongBoChuyen", lo, rq), []);
  assert.deepEqual(lo.slice(0, 2).map((c) => c.nhan), ["CAU_DON", "CAU_DON"]);
  const n1 = lo.findIndex((c, i) => i > 2 && c.nhan === "CONG");
  const khuc1 = lo.slice(2, n1);
  const khuc2 = lo.slice(n1);
  assert.ok(viPhamLoNhieuKhuc("loDongBoChuyen", [...khuc1, ...lo.slice(0, 2), ...khuc2], rq).length > 0, "khúc đứng trước câu đơn");
  assert.ok(viPhamLoNhieuKhuc("loDongBoChuyen", [...lo.slice(0, 2), ...khuc1.slice(1), ...khuc2], rq).length > 0, "khúc thiếu cổng ở đầu");
  const lenhKhac = [...lo.slice(0, 2), ...khuc1, ...khuc2.map((c, i) => (i === khuc2.length - 1 ? { ...c, cmd: KHUC_1.cmd } : c))];
  assert.ok(viPhamLoNhieuKhuc("loDongBoChuyen", lenhKhac, rq).length > 0, "câu mang dấu lệnh khúc khác");
  const gacKhac = [...lo.slice(0, 2), ...khuc1, ...khuc2.map((c) => (c.nhan === "GHI" ? { ...c, stmt: { ...c.stmt, args: c.stmt.args.map((x) => (x === CMD_2 ? CMD : x)) } } : c))];
  assert.ok(viPhamLoNhieuKhuc("loDongBoChuyen", gacKhac, rq).length > 0, "gác bằng dấu lệnh của khúc khác");
  const haiSuKien = [...lo.slice(0, 2), ...khuc1, ...khuc2, khuc2.find((c) => c.suKien)!];
  assert.ok(viPhamLoNhieuKhuc("loDongBoChuyen", haiSuKien, rq).length > 0, "hai câu sự kiện trong một khúc");
  assert.ok(viPhamLoNhieuKhuc("loDongBoChuyen", lo, [KHUC_1.requestId, KHUC_1.requestId]).length > 0, "dùng lại requestId");
  const loCungMa = (MOD.loDongBoChuyen as (db: unknown, l: unknown) => CauSk[])(DB, { cauDon: CAU_DON_MAU, khuc: [KHUC_1, { ...KHUC_2, requestId: KHUC_1.requestId }] });
  assert.ok(viPhamLoNhieuKhuc("loDongBoChuyen", loCungMa, rq).length > 0, "khúc 2 mang requestId của khúc 1");
  assert.ok(viPhamLoNhieuKhuc("loLa", lo, rq).some((l) => /CHO_CAU_DON/.test(l)), "hàm lạ dùng CAU_DON");
  assert.ok(viPhamLo("loLa", lo, T).some((l) => /CAU_DON/.test(l)), "viPhamLo thường gặp CAU_DON → đỏ");
  // Cổng của khúc hỏi ĐÚNG mã nhật ký đơn + đơn; câu đơn đứng đầu, nguyên vẹn (chỉ số kết quả mà route đọc để biết thắng không đổi).
  for (const k of [khuc1, khuc2]) {
    const g = CONG_THEO_DON.exec(k[0]!.stmt.sql)!;
    assert.deepEqual([k[0]!.stmt.args[Number(g[1]) - 1], k[0]!.stmt.args[Number(g[2]) - 1]], [AUDIT_DON, "o-1"]);
  }
  assert.deepEqual(lo.slice(0, 2).map((c) => c.stmt), CAU_DON_MAU);
});

test("NT-7: loDongBoChuyen — trong khúc đóng TRƯỚC mở (LC-02 đếm theo dòng), mã đóng theo từng luật; nhật ký trip_order_synced, sự kiện ALLOCATION_ORDER_SYNCED", () => {
  const lo = (MOD.loDongBoChuyen as (db: unknown, l: unknown) => CauSk[])(DB, MAU.loDongBoChuyen!.vao);
  const khuc1 = lo.filter((c) => c.cmd === CMD);
  const dong = khuc1.flatMap((c, i) => (/^\s*UPDATE vc_trip_allocation SET valid_to_at/.test(c.stmt.sql) ? [i] : []));
  const mo = khuc1.flatMap((c, i) => (/^\s*INSERT INTO vc_trip_allocation\b/.test(c.stmt.sql) ? [i] : []));
  assert.equal(dong.length, 2);
  assert.equal(mo.length, 1);
  assert.ok(Math.max(...dong) < Math.min(...mo), "đóng trước mở");
  assert.deepEqual(dong.map((i) => khuc1[i]!.stmt.args[3]), ["REMOVED", "PASSENGER_CHANGED"]);
  assert.ok(khuc1.some((c) => c.nhan === "NHAT_KY" && c.stmt.args.includes("trip_order_synced")));
  assert.equal(khuc1.find((c) => c.suKien)!.suKien!.loai, "ALLOCATION_ORDER_SYNCED");
});

test("bộ bắt TC-32: đảo nhật ký với cổng, bỏ lính gác một câu GHI, đưa trạng thái cuối lên trước, gác bằng tham số lạ → đỏ; lô đúng → xanh", () => {
  const g = (sql: string, args: unknown[]) => ({ sql, args });
  const dung: Cau[] = [
    { nhan: "CONG", stmt: g("UPDATE vc_trip SET version = version + 1 WHERE id = ?1", [T]) },
    { nhan: "NHAT_KY", stmt: g("INSERT INTO audit_log SELECT … WHERE changes() > 0", []) },
    { nhan: "GHI", stmt: g("UPDATE vc_trip_stop SET x = 1 WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?1 AND last_cmd_id = ?2)", [T, CMD]) },
    { nhan: "TRANG_THAI_CUOI", stmt: g("UPDATE vc_trip SET status = 'CANCELLED' WHERE id = ?1 AND last_cmd_id = ?2", [T, CMD]) },
  ];
  assert.deepEqual(viPhamLo("mau", dung, T), []);
  assert.ok(viPhamLo("mau", [dung[1]!, dung[0]!, dung[2]!, dung[3]!], T).length > 0, "đảo nhật ký với cổng");
  assert.ok(viPhamLo("mau", [dung[0]!, dung[1]!, { nhan: "GHI", stmt: g("UPDATE vc_trip_stop SET x = 1 WHERE id = ?1", [T]) }, dung[3]!], T).length > 0, "bỏ lính gác");
  assert.ok(viPhamLo("mau", [dung[0]!, dung[1]!, dung[3]!, dung[2]!], T).length > 0, "trạng thái cuối lên trước");
  assert.ok(viPhamLo("mau", [dung[0]!, dung[1]!, { nhan: "GHI", stmt: g(dung[2]!.stmt.sql, [T, "khac"]) }, dung[3]!], T).length > 0, "gác bằng tham số lạ");
  assert.ok(viPhamLo("mau", dung, T2).length > 0, "gác nhầm chuyến");
  // Họ lệnh mốc: đúng hai câu; hàm KHÔNG có tên mà dùng CONG_MOC → đỏ.
  const moc: Cau[] = [
    { nhan: "CONG_MOC", stmt: g("INSERT INTO vc_leg_appt_ack (id) SELECT ?1 WHERE (SELECT max(seq) FROM vc_leg_appt_ack WHERE leg_id = ?2) = ?3", []) },
    { nhan: "NHAT_KY", stmt: g("INSERT INTO audit_log SELECT … WHERE changes() > 0", []) },
  ];
  assert.deepEqual(viPhamLoMoc("moc", moc), []);
  assert.ok(viPhamLoMoc("moc", [...moc, dung[2]!]).length > 0, "câu thứ ba");
  assert.ok(viPhamLoMoc("moc", [{ nhan: "CONG_MOC", stmt: g("INSERT INTO vc_leg_appt_ack (id) SELECT ?1", []) }, moc[1]!]).length > 0, "bỏ điều kiện max(seq)");
  assert.ok(viPhamLo("la", moc, T).some((l) => /CONG_MOC mà không có tên/.test(l)), "hàm lạ dùng CONG_MOC");
  // GHI_NGOAI (Đợt 5 A-1b): hàm lạ dùng → đỏ; thiếu gác id nhật ký → đỏ; gác bằng tham số lạ → đỏ; loBoSungTen đúng khuôn → xanh.
  const coNgoai = (sql: string, args: unknown[]) => [dung[0]!, dung[1]!, { nhan: "GHI_NGOAI", stmt: g(sql, args) }];
  const NGOAI = "INSERT INTO ord_passenger (id) SELECT ?1 WHERE EXISTS (SELECT 1 FROM audit_log WHERE id = ?2)";
  assert.ok(viPhamLo("la", coNgoai(NGOAI, ["p", CMD]), T).some((l) => /GHI_NGOAI mà không có tên/.test(l)), "hàm lạ dùng GHI_NGOAI");
  assert.ok(viPhamLo("loBoSungTen", coNgoai("INSERT INTO ord_passenger (id) SELECT ?1", ["p"]), T).some((l) => /thiếu gác id nhật ký/.test(l)), "thiếu gác");
  assert.ok(viPhamLo("loBoSungTen", coNgoai(NGOAI, ["p", "lạ"]), T).some((l) => /không phải dấu lệnh/.test(l)), "tham số lạ");
  assert.deepEqual(viPhamLo("loBoSungTen", coNgoai(NGOAI, ["p", CMD]), T), []);
});

test("ADR-0057 C4 (Đợt 4 Task 9): lô sửa — đảo âm → đảo dương → ghi chuyến → … → chụp CUỐI; lô huỷ — đảo trước trạng thái cuối; lô tạo — chụp sau tài xế; cổng sửa / huỷ mang phiên bản chi phí", () => {
  const sua = (MOD.loSuaChuyen as (db: unknown, l: unknown) => Cau[])(DB, MAU.loSuaChuyen!.vao);
  const vt = (re: RegExp) => sua.findIndex((c) => re.test(c.stmt.sql));
  const daoAm = sua.findIndex((c) => /'REVERSAL'/.test(c.stmt.sql) && c.stmt.args[4] === 200000);
  const daoDuong = sua.findIndex((c) => /'REVERSAL'/.test(c.stmt.sql) && c.stmt.args[4] === -1200000);
  const ghiChuyen = vt(/^\s*UPDATE vc_trip SET vehicle_id/);
  const chup = vt(/'SNAPSHOT'/);
  assert.ok(daoAm > 0 && daoAm < daoDuong && daoDuong < ghiChuyen && ghiChuyen < chup && chup === sua.length - 1, JSON.stringify({ daoAm, daoDuong, ghiChuyen, chup, n: sua.length }));
  assert.match(sua[0]!.stmt.sql, /count\(\*\) FROM vc_trip_cost_line WHERE trip_id = \?1\) = \?6/);
  assert.equal(sua[0]!.stmt.args[5], 2, "phiên bản chi phí ở câu cổng");
  const huy = (MOD.loHuy as (db: unknown, l: unknown) => Cau[])(DB, MAU.loHuy!.vao);
  const cuoiDao = huy.map((c) => /'REVERSAL'/.test(c.stmt.sql)).lastIndexOf(true);
  assert.equal(cuoiDao, huy.length - 2, "đảo ngay trước câu trạng thái cuối");
  assert.match(huy[0]!.stmt.sql, /count\(\*\) FROM vc_trip_cost_line/);
  const tao = (MOD.loTaoChuyen as (db: unknown, l: unknown) => Cau[])(DB, MAU.loTaoChuyen!.vao);
  assert.match(tao[tao.length - 1]!.stmt.sql, /'SNAPSHOT'/);
  assert.equal(tao.filter((c) => /'REVERSAL'/.test(c.stmt.sql)).length, 0);
});

test("TC-32: MỌI hàm dựng lô của dieu-phoi.ts (tự suy từ tên xuất) có mẫu, ≥ 12 lệnh, và đúng bốn luật thứ tự lô", () => {
  const nguon = readFileSync(TEP, "utf8");
  const ten = [...nguon.matchAll(/^export function (\w+)\(/gm)].map((m) => m[1]!).sort();
  assert.ok(ten.length >= 12, `chống bài rỗng: ${ten.length} hàm dựng lô`);
  assert.deepEqual(ten, Object.keys(MAU).sort(), "hàm dựng lô MỚI phải có mẫu ở MAU (và mẫu không trỏ hàm đã bỏ)");
  const loi: string[] = [];
  for (const t of ten) {
    const f = MOD[t] as (db: unknown, l: unknown) => Cau[];
    const lo = f(DB, MAU[t]!.vao);
    assert.ok(lo.length >= 2, `${t}: lô rỗng`);
    if (CHO_CAU_DON.includes(t)) {
      const v = MAU[t]!.vao as { khuc: { requestId: string }[] };
      loi.push(...viPhamLoNhieuKhuc(t, lo, v.khuc.map((k) => k.requestId)));
      continue;
    }
    loi.push(...(HO_LENH_MOC.includes(t) ? viPhamLoMoc(t, lo) : viPhamLo(t, lo, MAU[t]!.gac)));
  }
  assert.deepEqual(loi, []);
});

// C38 + phiếu kiểm V2(c): đường chạy đua của `chayLo` (cổng thua / vỡ UNIQUE request_id) so sự kiện đã có với câu SU_KIEN của CHÍNH lô (`suKien` trên CauCoNhan).
// Lô thiếu nhãn, có hai câu sự kiện, hay nhãn lệch tham số của câu chèn ⇒ "lệnh lặp" so nhầm thao tác.
test("C38: mỗi lô (trừ họ lệnh mốc) có ĐÚNG một câu chèn vc_trip_event và đúng câu đó mang `suKien`, khớp tham số đã gắn (chuyến, chuyến liên quan, loại, điểm, suất); lô sửa ghi `nghiChup` vào rest_minutes_snapshot", () => {
  const loi: string[] = [];
  for (const ten of Object.keys(MAU)) {
    if (CHO_CAU_DON.includes(ten)) continue; // ADR-0104 Đ2.3: C38 theo KHÚC — viPhamLoNhieuKhuc (bài NT-7 + TC-32)
    const lo = (MOD[ten] as (db: unknown, l: unknown) => CauSk[])(DB, MAU[ten]!.vao);
    const chen = lo.filter((c) => /^\s*INSERT INTO vc_trip_event\b/.test(c.stmt.sql));
    const coNhan = lo.filter((c) => c.suKien !== undefined);
    if (HO_LENH_MOC.includes(ten)) {
      if (chen.length + coNhan.length > 0) loi.push(`${ten}: họ lệnh mốc không có sự kiện chuyến`);
      continue;
    }
    if (chen.length !== 1) loi.push(`${ten}: ${chen.length} câu chèn vc_trip_event (phải đúng 1)`);
    if (coNhan.length !== 1 || coNhan[0] !== chen[0]) {
      loi.push(`${ten}: nhãn suKien phải nằm ở đúng câu chèn sự kiện (thấy ${coNhan.length} câu có nhãn)`);
      continue;
    }
    const { suKien: sk, stmt, nhan } = coNhan[0]!;
    if (nhan !== "SU_KIEN") loi.push(`${ten}: câu sự kiện mang nhãn ${nhan}`);
    const a = stmt.args;
    const thuc = { tripId: a[1], relatedTripId: a[2], loai: a[3], stopId: a[4], allocationId: a[5] };
    try {
      assert.deepEqual({ ...sk }, thuc);
    } catch {
      loi.push(`${ten}: suKien ${JSON.stringify(sk)} lệch tham số câu chèn ${JSON.stringify(thuc)}`);
    }
    if (a[7] !== L.requestId) loi.push(`${ten}: câu sự kiện không mang requestId của lệnh`);
  }
  assert.deepEqual(loi, []);
  // Lô dời: sự kiện ở chuyến ĐÍCH, chuyến nguồn ở related_trip_id (cặp mà traLenhLap / chayLo so — phiếu kiểm V1).
  const doi = (MOD.loDoi as (db: unknown, l: unknown) => CauSk[])(DB, MAU.loDoi!.vao).find((c) => c.suKien)!;
  assert.deepEqual([doi.suKien!.tripId, doi.suKien!.relatedTripId, doi.suKien!.loai], [T2, T, "ALLOCATION_MOVED"]);
  // N3: câu sửa kế hoạch ghi ĐÚNG số chụp của lệnh (tsc không phủ tệp bài — thiếu khoá thì ràng buộc undefined lặng lẽ).
  const sua = (MOD.loSuaChuyen as (db: unknown, l: unknown) => Cau[])(DB, MAU.loSuaChuyen!.vao).find((c) => /^\s*UPDATE vc_trip SET vehicle_id/.test(c.stmt.sql))!;
  assert.match(sua.stmt.sql, /rest_minutes_snapshot = \?14/);
  assert.equal(sua.stmt.args[13], 45);
});

test("D5.3a (Đợt 5): loCapNhatDiem trên xe ĐANG CHẠY — cổng có version + chuyến đang chạy, câu CHỐT `SET version = version` đứng CUỐI (nhãn TRANG_THAI_CUOI), đúng bốn luật", () => {
  const f = MOD.loCapNhatDiem as (db: unknown, l: unknown) => Cau[];
  const lo = f(DB, { ...(MAU.loCapNhatDiem!.vao), diemBoQua: [], dangChay: true });
  assert.deepEqual(viPhamLo("loCapNhatDiem(dangChay)", lo, T), []);
  assert.match(lo[0]!.stmt.sql, /version = \?2 AND status = 'RUNNING'/, "cổng: đúng version + chuyến đang chạy");
  const cuoi = lo[lo.length - 1]!;
  assert.equal(cuoi.nhan, "TRANG_THAI_CUOI");
  assert.match(cuoi.stmt.sql, /^UPDATE vc_trip SET version = version WHERE id = \?1 AND last_cmd_id = \?2$/);
  // Không dangChay: không có câu chốt (chuyến chưa chạy giữ lô cũ).
  assert.ok(!f(DB, MAU.loCapNhatDiem!.vao).some((c) => c.nhan === "TRANG_THAI_CUOI"));
});

test("Đợt 7 Task 4 (ADR-0056 VK3-A): câu ghi / xoá cột phá lệ cam kết mang nhãn CAM_KET_PHA_LE, đứng SAU nhật ký, TRƯỚC câu trạng thái cuối; mọi câu chạm commitment_override_* đều mang nhãn; lô dời: xoá nguồn + ghi đích, cùng gác chuyến ĐÍCH", () => {
  // Task 5: lệnh giảm khách + cổng xuất bến chỉ XOÁ (C7).
  const CO_CAM_KET = ["loXep", "loSuaChuyen", "loDoi", "loThemDiemDangChay", "loRut", "loCapNhatDiem", "loCapNhatKhach", "loXuatBen", "loDongBoChuyen"];
  for (const ten of Object.keys(MAU)) {
    const lo = (MOD[ten] as (db: unknown, l: unknown) => Cau[])(DB, MAU[ten]!.vao);
    const sai = lo.filter((c) => /commitment_override/.test(c.stmt.sql) !== (c.nhan === "CAM_KET_PHA_LE"));
    assert.deepEqual(sai.map((c) => c.nhan), [], `${ten}: câu chạm cột phá lệ cam kết phải mang nhãn CAM_KET_PHA_LE (và ngược lại)`);
    const vt = lo.flatMap((c, i) => (c.nhan === "CAM_KET_PHA_LE" ? [i] : []));
    if (!CO_CAM_KET.includes(ten)) {
      assert.equal(vt.length, 0, `${ten}: không có câu cam kết`);
      continue;
    }
    assert.equal(vt.length, ten === "loDoi" || ten === "loDongBoChuyen" ? 2 : 1, `${ten}: số câu cam kết`);
    const cuoi = lo.findIndex((c) => c.nhan === "TRANG_THAI_CUOI");
    for (const i of vt) {
      const nk = lo.findIndex((c) => c.nhan === "NHAT_KY" && (lo[i]!.cmd === undefined || c.cmd === lo[i]!.cmd)); // lô chung: nhật ký CỦA KHÚC
      assert.ok(nk >= 0 && i > nk, `${ten}: câu cam kết sau nhật ký`);
      if (cuoi >= 0) assert.ok(i < cuoi, `${ten}: câu cam kết trước trạng thái cuối`);
      assert.match(lo[i]!.stmt.sql, /^UPDATE vc_trip SET commitment_override_reason_code = \?3, commitment_override_key = \?4/);
    }
    // Không có câu cam kết khi lệnh không mang (null).
    const v0 = MAU[ten]!.vao as Record<string, unknown> & { khuc?: Record<string, unknown>[] };
    const khong = { ...v0, camKet: null, camKetNguon: null, camKetDich: null, xoaCamKet: false, ...(v0.khuc ? { khuc: v0.khuc.map((k) => ({ ...k, camKet: null })) } : {}) };
    assert.equal((MOD[ten] as (db: unknown, l: unknown) => Cau[])(DB, khong).filter((c) => c.nhan === "CAM_KET_PHA_LE").length, 0, `${ten}: null → không câu`);
  }
  const doi = (MOD.loDoi as (db: unknown, l: unknown) => Cau[])(DB, MAU.loDoi!.vao).filter((c) => c.nhan === "CAM_KET_PHA_LE");
  assert.deepEqual(doi.map((c) => [c.stmt.args[0], c.stmt.args[2], c.stmt.args[3]]), [[T, null, null], [T2, CAM_KET_GHI.lyDo, CAM_KET_GHI.khoa]], "xoá nguồn, ghi đích");
  const xep = (MOD.loXep as (db: unknown, l: unknown) => Cau[])(DB, MAU.loXep!.vao).find((c) => c.nhan === "CAM_KET_PHA_LE")!;
  assert.deepEqual([xep.stmt.args[0], xep.stmt.args[2], xep.stmt.args[3]], [T, CAM_KET_GHI.lyDo, CAM_KET_GHI.khoa]);
  // loSuaChuyen: câu chụp giá vẫn CUỐI (ADR-0057 C4) — câu cam kết đứng trước.
  const sua = (MOD.loSuaChuyen as (db: unknown, l: unknown) => Cau[])(DB, MAU.loSuaChuyen!.vao);
  assert.match(sua[sua.length - 1]!.stmt.sql, /'SNAPSHOT'/);
});

test("Đợt 7 Task 5 (C7): lô rút / cập nhật khách / cập nhật điểm / xuất bến chỉ XOÁ cột phá lệ cam kết (tham số null, null) — câu CAM_KET_PHA_LE sau nhật ký; xuất bến: TRƯỚC câu sang RUNNING; xe đang chạy: TRƯỚC câu chốt", () => {
  for (const ten of ["loRut", "loCapNhatDiem", "loCapNhatKhach", "loXuatBen"]) {
    const lo = (MOD[ten] as (db: unknown, l: unknown) => Cau[])(DB, MAU[ten]!.vao);
    const ck = lo.filter((c) => c.nhan === "CAM_KET_PHA_LE");
    assert.equal(ck.length, 1, ten);
    assert.deepEqual([ck[0]!.stmt.args[0], ck[0]!.stmt.args[2], ck[0]!.stmt.args[3], ck[0]!.stmt.args[4]], [T, null, null, T], `${ten}: xoá về NULL, gác chính chuyến`);
  }
  const xb = (MOD.loXuatBen as (db: unknown, l: unknown) => Cau[])(DB, MAU.loXuatBen!.vao);
  const iCk = xb.findIndex((c) => c.nhan === "CAM_KET_PHA_LE");
  const iChay = xb.findIndex((c) => /SET status = 'RUNNING'/.test(c.stmt.sql));
  assert.ok(iChay > 0 && iCk > xb.findIndex((c) => c.nhan === "NHAT_KY") && iCk < iChay, `xuất bến: câu xoá sau nhật ký, trước câu sang RUNNING (${iCk} / ${iChay})`);
  const chay = (MOD.loCapNhatDiem as (db: unknown, l: unknown) => Cau[])(DB, { ...MAU.loCapNhatDiem!.vao, diemBoQua: [], dangChay: true });
  assert.deepEqual(viPhamLo("loCapNhatDiem(dangChay, camKet)", chay, T), []);
  assert.equal(chay[chay.length - 1]!.nhan, "TRANG_THAI_CUOI");
});
