// MÁY ĐỒNG BỘ CHUYẾN THEO ĐƠN (ADR-0104 Đ2.1) — hàm công bố cho GỐC LẮP RÁP (`ctx.dongBoChuyen`; orders / dispatch không import van-chuyen). Đọc chuyến có
// suất mở của các chặng thuộc đơn, lập kế hoạch từng khúc bằng luật thuần `dongBoChuyenTheoDon` (cùng luật với nút tay), nối khúc SAU câu đơn đã soạn
// (`loDongBoChuyen`). Không chạy câu ghi nào — điểm gọi chạy MỘT db.batch. Không gọi hàm hẹp của orders (`lichChungChang` chỉ trong thân route sau `can(` —
// src/CLAUDE.md): dữ liệu chặng qua view công bố (v_ord_leg_key, v_ord_passenger_key, v_ord_leg_commit — phán quyết G10). Người sửa đơn có thể không có
// trip.view (HDV, Đối tác, Thực tập — quyền ghép Đ2.13): hàm KHÔNG trả dữ liệu chuyến nào ra ngoài, chỉ câu cố định + cờ.
import type { StaffProfile } from "../../shared/contracts";
import {
  CAU_NHAC_XE_DANG_CHAY, TRAN_CAU_CHUYEN, changTheoSau, dongBoChuyenTheoDon, moTaKhuc, tongCauChuyen,
  type ChuyenDongBo, type DongBoTheoDon, type VaoDongBoTheoDon,
} from "../../shared/dong-bo-chuyen";
import { error } from "../../shared/http";
import { allocsByTrips, allocsOpenByLegs, camKetChang, changCuaDonDongBo, nguoiCuaDon, stopsByTrips, tripsByIds, xeTheoId } from "./chuyen-repo";
import { loDongBoChuyen, type KhucLoDongBo } from "./dieu-phoi";
import { diemVao, suatVao } from "./dieu-phoi-doc";
import { loiRangBuocChuyen } from "./rules";

/** Lỗi CỦA PHẦN CHUYẾN trong lô (trigger lõi, chỉ mục suất) → 409 `trip_rule` (Đ2.12). Lỗi khác (của câu đơn) → null: route dịch như cũ. */
const LOI_CHUYEN = /\b(lc0[1-9]|lc1[0-6])_|\bvk1a_|vc_trip_append_only|\bgb_(needs_appt|snapshot)|UNIQUE constraint failed: vc_trip_allocation\.|UNIQUE constraint failed: vc_trip_event\./;
const dichLoiChuyen = (e: unknown): Response | null => {
  const m = e instanceof Error ? e.message : String(e);
  if (!LOI_CHUYEN.test(m)) return null;
  const r = loiRangBuocChuyen(m);
  return error(409, "trip_rule", r?.message ?? "Chuyến vừa thay đổi — tải lại rồi làm lại.");
};

/** Đuôi nhật ký khi khúc xoá cột phá lệ cam kết (cùng câu với `camKetSauLenh` — chỉ chữ cố định, không khoá). */
const DUOI_XOA_CAM_KET = " · hết vi phạm cam kết — bỏ phá lệ cam kết";

export async function dongBoChuyenChoDon(db: D1Database, actor: Pick<StaffProfile, "id">, x: VaoDongBoTheoDon): Promise<DongBoTheoDon> {
  const cauDon = [...x.cauDon];
  const khong = (capNhatTay: boolean, nhac: string | null = null): DongBoTheoDon => ({
    lo: cauDon, soCauDon: cauDon.length, nhac, capNhatTay,
    sauKhiGhi: () => ({ dto: { nhac, capNhatTay }, bao: [] }),
    dichLoi: () => null,
  });
  const chang = await changCuaDonDongBo(db, x.orderId);
  if (chang.length === 0) return khong(false);
  const moCuaChang = await allocsOpenByLegs(db, chang.map((c) => c.id));
  if (moCuaChang.length === 0) return khong(false);
  const trips = await tripsByIds(db, [...new Set(moCuaChang.map((a) => a.trip_id))]);
  const xet = trips.filter((t) => t.status === "PLANNED" || t.status === "RUNNING");
  if (xet.length === 0) return khong(false);
  const ids = xet.map((t) => t.id);
  const [suat, diem, xe, nguoiDoc] = await Promise.all([
    allocsByTrips(db, ids), stopsByTrips(db, ids), xeTheoId(db, [...new Set(xet.map((t) => t.vehicle_id))]), x.sau.nguoi ? Promise.resolve([]) : nguoiCuaDon(db, x.orderId),
  ]);
  const legTren = [...new Set(suat.filter((a) => a.valid_to_at === null && a.kind === "PASSENGER" && a.leg_id !== null).map((a) => a.leg_id as string))];
  const camKet = await camKetChang(db, legTren);
  const camKetMap = new Map(camKet.map((c) => [c.id, { legId: c.id, orderId: c.order_id, orderCode: c.order_code ?? "", xeRieng: c.exclusive_vehicle === 1, choToiThieu: c.min_vehicle_seats }]));
  const chuyen: ChuyenDongBo[] = xet.map((t) => {
    const s = suat.filter((a) => a.trip_id === t.id);
    return {
      id: t.id, ma: t.code, trangThai: t.status, xeId: t.vehicle_id, soCho: xe.find((v) => v.id === t.vehicle_id)?.passenger_capacity ?? null,
      suat: s.map(suatVao), diem: diem.filter((d) => d.trip_id === t.id).map(diemVao), camKetPhaLeKhoa: t.commitment_override_key,
      changCamKet: new Map(s.flatMap((a) => (a.leg_id !== null && camKetMap.has(a.leg_id) ? [[a.leg_id, camKetMap.get(a.leg_id)!] as const] : []))),
    };
  });
  const kq = dongBoChuyenTheoDon({
    chang: changTheoSau({
      doc: chang.map((c) => ({ legId: c.id, orderId: c.order_id, orderCode: c.order_code ?? "", moTruoc: c.is_open === 1 })),
      sau: x.sau, nguoiDoc, tangTheoChang: x.tangTheoChang,
    }),
    chuyen,
    suatMoCuaChang: moCuaChang.map(suatVao),
    daBaoHuy: new Set(moCuaChang.filter((a) => a.office_cancel_at !== null).map((a) => a.id)),
    newId: () => crypto.randomUUID(),
  });
  const nhac = kq.nhacXeDangChay ? CAU_NHAC_XE_DANG_CHAY : null;
  if (kq.khuc.length === 0) return khong(false, nhac);
  // Đ2.5: trần CHỈ tính phần chuyến; vượt → không nối khúc nào, chuyến giữ như hôm nay.
  if (tongCauChuyen(kq.khuc) > TRAN_CAU_CHUYEN) return khong(true, nhac);
  const lucIso = new Date(x.bayGioMs).toISOString();
  const khuc: KhucLoDongBo[] = kq.khuc.map((k) => ({
    cmd: crypto.randomUUID(), requestId: crypto.randomUUID(), lucIso, nguoiId: actor.id,
    tripId: k.tripId, version: xet.find((t) => t.id === k.tripId)!.version, auditIdDon: x.auditIdDon, orderId: x.orderId,
    dong: k.dong, mo: k.mo.map((m) => ({ ...m, loai: "PASSENGER" as const, crewPartyId: null })), diemBoQua: k.diemBoQua,
    camKet: k.xoaCamKet ? { lyDo: null, khoa: null } : null,
    soNguoi: k.dong.length + k.mo.length,
    detail: `${moTaKhuc(k)}${k.xoaCamKet ? DUOI_XOA_CAM_KET : ""}`,
  }));
  const lo = loDongBoChuyen(db, { cauDon, khuc });
  // Vị trí câu cổng của từng khúc trong kết quả lô (câu đơn đứng đầu — chỉ số của chúng không đổi).
  const viTriCong = lo.flatMap((c, i) => (c.nhan === "CONG" ? [i] : []));
  return {
    lo: lo.map((c) => c.stmt), soCauDon: cauDon.length, nhac, capNhatTay: false,
    sauKhiGhi: (res) => {
      const bao: { tripId: string; requestId: string }[] = [];
      let capNhatTay = false;
      khuc.forEach((k, j) => {
        if ((res[viTriCong[j]!]?.meta.changes ?? 0) > 0) bao.push({ tripId: k.tripId, requestId: k.requestId });
        else capNhatTay = true; // khúc thua cổng chuyến (chuyến vừa đổi) — chuyến giữ như hôm nay (Đ2.12), giả định kế hoạch §10
      });
      return { dto: { nhac, capNhatTay }, bao };
    },
    dichLoi: dichLoiChuyen,
  };
}
