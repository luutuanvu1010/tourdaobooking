// LỊCH CHUNG NGÀY D — hình chiếu dựng lúc đọc, KHÔNG có bảng riêng (ADR-0049 D1; [TK] §1.3; MQ-04 cảnh báo, MQ-05 giữ — phần lượt 1). Nguồn: chặng của
// đơn đã xác nhận (hàm hẹp `lichChungChang` của orders — chỉ khoá, mã, ngày giờ, cờ) + bảng `vc_trip*` + hàm thuần này. Không I/O, không import module.
//
// - "Giữ" của chuyến CHƯA CHẠY = chính `kiemXuatBen` (một luật với cổng xuất bến), dự phóng "xuất bến đúng giờ": mốc xuất bến = max(bây giờ, giờ bắt đầu
//   dự kiến). Nhờ vậy chuyến ngày mai không bị giữ "nghỉ thiếu" chỉ vì chuyến trước vừa kết thúc.
// - Đơn nháp chỉ ĐẾM (I11); nháp có chặng dưới mốc chưa đặt gấp vào danh sách "chờ Quản trị duyệt đặt gấp" — route quyết ai được thấy (ô
//   `order.leg.short_notice`), hàm này không biết quyền.
// - Chính sách rỗng → cảnh báo, không đoán mốc.
import type { ChangVao, ChinhSachVao, ChuyenVao, DieuKienVao, HangBangVao, KhungChuyen, SuatVao, TrangThaiChuyen } from "./dieu-phoi-kieu.ts";
import { kiemXuatBen } from "./dieu-phoi-kiem.ts";
import { trangThaiChang, type TrangThaiChangRa } from "./dieu-phoi-trang-thai.ts";
import type { LyDoGiu } from "./ly-do-giu.ts";
import { kiemMocDat } from "./moc-toi-thieu.ts";
import { vnLocalToMs } from "./vn-date.ts";

/** Chặng của đơn NHÁP (I11): chỉ khoá, mã đơn, ngày giờ hẹn, cờ đặt gấp — không nơi, không số người. */
export interface ChangNhapVao {
  legId: string;
  orderId: string;
  orderCode: string;
  ngayDon: string | null;
  gioDon: string | null;
  datGap: boolean;
}
export interface LichChungVao {
  /** Chặng mở của đơn đã xác nhận trong khoảng ngày + MỌI chặng mà suất mở của các chuyến bên dưới trỏ tới (kèm cờ đơn huỷ / chặng đóng). */
  chang: ChangVao[];
  nhap: ChangNhapVao[];
  /** Chuyến của khoảng ngày. */
  chuyen: ChuyenVao[];
  /** Suất (mở và đóng) của các chuyến trên + suất mở của các chặng trên ở chuyến khác. */
  suat: SuatVao[];
  /** Chuyến ngoài khoảng ngày có thể chạm (đang chạy, vừa kết thúc) — cho luật xe / tài xế đang chạy và nghỉ đủ. */
  chuyenKhac: KhungChuyen[];
  chinhSach: ChinhSachVao | null;
  hangBang: HangBangVao[];
  dieuKien: DieuKienVao[];
  bayGioMs: number;
}
export const LOAI_CANH_BAO_LICH = [
  "CHINH_SACH_RONG", "CHANG_QUA_MOC", "CHANG_SAT_MOC", "THIEU_SUAT", "THUA_SUAT", "CHANG_GIU", "GIO_HEN_NGOAI_CHUYEN", "CHUYEN_GIU", "NHAP_CHO_DAT_GAP",
] as const;
export type LoaiCanhBaoLich = (typeof LOAI_CANH_BAO_LICH)[number];
export interface CanhBaoLich {
  loai: LoaiCanhBaoLich;
  legId: string | null;
  tripId: string | null;
  orderCode: string | null;
}
export interface ChuyenLichRa {
  id: string;
  ma: string;
  trangThai: TrangThaiChuyen;
  /** Suất đang chiếm chỗ (chờ đón + đã lên), kể cả người đi kèm. */
  tai: number;
  soCho: number;
  /** Lý do giữ (chỉ chuyến chưa chạy); rỗng = đủ điều kiện nếu xuất bến đúng giờ. */
  lyDoGiu: LyDoGiu[];
}
export interface LichChungRa {
  chang: { chang: ChangVao; trangThai: TrangThaiChangRa }[];
  chuyen: ChuyenLichRa[];
  nhapChoDatGap: ChangNhapVao[];
  soNhap: number;
  canhBao: CanhBaoLich[];
}

const khung = (c: ChuyenVao): KhungChuyen => ({
  id: c.id, ma: c.ma, xeId: c.xe.id, taiXePartyId: c.taiXe?.partyId ?? null, batDauMs: c.batDauMs, ketThucMs: c.ketThucMs, ketThucThatMs: c.ketThucThatMs, trangThai: c.trangThai,
});

export function dungLichChung(v: LichChungVao): LichChungRa {
  const canhBao: CanhBaoLich[] = [];
  const cb = (loai: LoaiCanhBaoLich, legId: string | null, tripId: string | null, orderCode: string | null) => canhBao.push({ loai, legId, tripId, orderCode });
  if (!v.chinhSach) cb("CHINH_SACH_RONG", null, null, null);
  const chuyenTheoId = new Map(v.chuyen.map((c) => [c.id, c]));
  const ttChuyen = [...v.chuyen.map((c) => ({ id: c.id, trangThai: c.trangThai })), ...v.chuyenKhac.map((k) => ({ id: k.id, trangThai: k.trangThai }))];

  const chang = v.chang.map((c) => {
    const tt = trangThaiChang(c, v.suat, ttChuyen, v.chinhSach, v.bayGioMs);
    if (tt.trangThai === "GIU") cb("CHANG_GIU", c.legId, null, c.orderCode);
    else if (tt.trangThai !== "DA_BO" && tt.trangThai !== "DON_NHAP") {
      if (tt.nhan.includes("QUA_MOC")) cb("CHANG_QUA_MOC", c.legId, null, c.orderCode);
      else if (tt.nhan.includes("SAT_MOC")) cb("CHANG_SAT_MOC", c.legId, null, c.orderCode);
      if (tt.nhan.includes("XEP_MOT_PHAN")) cb("THIEU_SUAT", c.legId, null, c.orderCode);
      if (tt.nhan.includes("THUA_SUAT")) cb("THUA_SUAT", c.legId, null, c.orderCode);
      // "Giờ hẹn đổi sau khi xếp" (MQ-04) — lượt 1 nhận ra khi giờ hẹn nằm NGOÀI khung giờ của chuyến chưa chạy đang chở chặng.
      const gio = c.ngayDon !== null && c.gioDon !== null ? vnLocalToMs(c.ngayDon, c.gioDon) : null;
      if (gio !== null) {
        const tripIds = [...new Set(v.suat.filter((s) => s.mo && s.legId === c.legId).map((s) => s.tripId))];
        for (const id of tripIds) {
          const t = chuyenTheoId.get(id);
          if (t && t.trangThai === "PLANNED" && (gio < t.batDauMs || gio > t.ketThucMs)) cb("GIO_HEN_NGOAI_CHUYEN", c.legId, id, c.orderCode);
        }
      }
    }
    return { chang: c, trangThai: tt };
  });

  const chuyen: ChuyenLichRa[] = v.chuyen.map((c) => {
    const suatCuaChuyen = v.suat.filter((s) => s.tripId === c.id);
    const tai = suatCuaChuyen.filter((s) => s.mo && (s.trangThai === "WAITING" || s.trangThai === "BOARDED")).length;
    let lyDoGiu: LyDoGiu[] = [];
    if (c.trangThai === "PLANNED") {
      const legIds = new Set(suatCuaChuyen.filter((s) => s.mo && s.legId !== null).map((s) => s.legId));
      lyDoGiu = kiemXuatBen({
        chuyen: c,
        suat: suatCuaChuyen,
        chang: v.chang.filter((x) => legIds.has(x.legId)),
        suatMoCuaChang: v.suat.filter((s) => s.mo && s.legId !== null && legIds.has(s.legId)),
        chuyenKhac: [...v.chuyen.filter((x) => x.id !== c.id).map(khung), ...v.chuyenKhac],
        chinhSach: v.chinhSach,
        hangBang: v.hangBang,
        dieuKien: v.dieuKien,
        bayGioMs: Math.max(v.bayGioMs, c.batDauMs),
      }).lyDo;
      if (lyDoGiu.length > 0) cb("CHUYEN_GIU", null, c.id, null);
    }
    return { id: c.id, ma: c.ma, trangThai: c.trangThai, tai, soCho: c.xe.soCho, lyDoGiu };
  });

  const nhapChoDatGap = v.chinhSach ? v.nhap.filter((n) => kiemMocDat(n, v.bayGioMs, v.chinhSach!.minLeadMinutes).duoiMoc) : [];
  for (const n of nhapChoDatGap) cb("NHAP_CHO_DAT_GAP", n.legId, null, n.orderCode);
  return { chang, chuyen, nhapChoDatGap, soNhap: v.nhap.length, canhBao };
}
