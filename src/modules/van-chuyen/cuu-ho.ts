// Cứu hộ đơn giản (ADR-0052 D5c bản đơn giản; kế hoạch Đợt 5 Task 15): dựng `CuuHoResponse` THUẦN từ nền chuyến hỏng + lịch chung ngày chạy (route đã đọc
// sau `can(trip.dispatch)`). Không lệnh ghi mới, không cột mới: "chặng cần chuyển" suy từ suất đóng `TRIP_INTERRUPTED` trên chuyến hỏng giao với chặng còn
// người chưa xếp; "xe nhận" = chuyến cùng ngày PLANNED / RUNNING có tài xế công ty (lời chủ 5.2b — xe nhà xe đi đường "Tạo chuyến mới"). Test: cuu-ho.test.ts.
// DTO KHÔNG tên khách, SĐT, mã đơn (văn phòng xem tên ở Chi tiết chuyến).
import type { CuuHoResponse, LichChungResponse, XeNhanDto } from "../../shared/contracts";
import { changChuaXep } from "../../shared/dieu-phoi-man.ts";
import type { NenChuyen } from "./dieu-phoi-doc";

export function cuuHoTu(nen: Pick<NenChuyen, "trip" | "allocs">, l: Pick<LichChungResponse, "chang" | "chuyen">): CuuHoResponse {
  const gianDoan = new Map<string, number>();
  for (const a of nen.allocs) {
    if (a.kind !== "PASSENGER" || a.leg_id === null || a.close_reason !== "TRIP_INTERRUPTED") continue;
    gianDoan.set(a.leg_id, (gianDoan.get(a.leg_id) ?? 0) + 1);
  }
  const changChoXep = changChuaXep(l)
    .filter((x) => gianDoan.has(x.chang.legId) && x.conLai > 0)
    .map(({ chang: c, conLai }) => ({ legId: c.legId, soNguoi: Math.min(conLai, gianDoan.get(c.legId)!), noiDon: c.noiDon, gioHen: c.gioDon, datGap: c.datGap }));
  const xeNhan = l.chuyen
    .filter((c) => c.id !== nen.trip.id && (c.trangThai === "PLANNED" || c.trangThai === "RUNNING") && c.taiXe?.loai === "CONG_TY")
    .map((c) => ({
      tripId: c.id,
      maChuyen: c.ma,
      trangThai: c.trangThai as "PLANNED" | "RUNNING",
      tenTaiXe: c.taiXe!.ten,
      choTrong: Math.max(0, c.xe.soCho - c.tai),
      diemSapToi: diemSapToi(c),
      version: c.version,
    }));
  return {
    chuyenHong: { id: nen.trip.id, ma: nen.trip.code, ngay: nen.trip.service_date, soKhachCanChuyen: changChoXep.reduce((s, x) => s + x.soNguoi, 0) },
    changChoXep,
    xeNhan,
  };
}

/** Điểm sắp tới của chuyến (điểm Chờ có số thứ tự nhỏ nhất) — tên nơi, không khoá nơi. */
function diemSapToi(c: LichChungResponse["chuyen"][number]): string | null {
  return [...c.diem].filter((d) => d.trangThai === "PENDING").sort((a, b) => a.thuTu - b.thuTu)[0]?.tenNoi ?? null;
}

/**
 * Xe nhận được đề nghị chuyển khách (ADR-0052 D4; ADR-0111 Đ4; NT-A5-2): chuyến cùng ngày chạy với chuyến nguồn, khác chuyến nguồn, có tài xế MỞ khác người
 * gửi; `STOP` nhận PLANNED / RUNNING, `ONBOARD` (cứu hộ) chỉ RUNNING. Trước khi A4 gộp chỉ tài xế công ty (G-A5-20). Đúng năm khoá của `XeNhanDto`.
 */
export function xeNhanChoDeNghi(nguon: { id: string; ngayChay: string }, chuyen: LichChungResponse["chuyen"], phamVi: "STOP" | "ONBOARD", nguoiGuiPartyId: string): XeNhanDto[] {
  return chuyen
    .filter((c) => c.id !== nguon.id && c.ngayChay === nguon.ngayChay && (phamVi === "ONBOARD" ? c.trangThai === "RUNNING" : c.trangThai === "PLANNED" || c.trangThai === "RUNNING"))
    .filter((c) => c.taiXe !== null && c.taiXe.loai === "CONG_TY" && c.taiXe.partyId !== nguoiGuiPartyId)
    .map((c) => ({ tripId: c.id, maChuyen: c.ma, tenTaiXe: c.taiXe!.ten, choTrong: Math.max(0, c.xe.soCho - c.tai), diemSapToi: diemSapToi(c) }));
}
