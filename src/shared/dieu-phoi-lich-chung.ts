// LỊCH CHUNG NGÀY D — hình chiếu dựng lúc đọc, KHÔNG có bảng riêng (ADR-0049 D1; [TK] §1.3; MQ-04 cảnh báo, MQ-05 giữ — phần lượt 1). Nguồn: chặng của
// đơn đã xác nhận (hàm hẹp `lichChungChang` của orders — chỉ khoá, mã, ngày giờ, cờ) + bảng `vc_trip*` + hàm thuần này. Không I/O, không import module.
//
// - "Giữ" của chuyến CHƯA CHẠY = chính `kiemXuatBen` (một luật với cổng xuất bến), dự phóng "xuất bến đúng giờ": mốc xuất bến = max(bây giờ, giờ bắt đầu
//   dự kiến). Nhờ vậy chuyến ngày mai không bị giữ "nghỉ thiếu" chỉ vì chuyến trước vừa kết thúc.
// - Đơn nháp chỉ ĐẾM (I11); nháp có chặng dưới mốc chưa đặt gấp vào danh sách "chờ Quản trị duyệt đặt gấp" — route quyết ai được thấy (ô
//   `order.leg.short_notice`), hàm này không biết quyền.
// - Chính sách rỗng → cảnh báo, không đoán mốc.
import type { ChangVao, ChinhSachVao, ChuyenVao, DiemVao, DieuKienVao, HangBangVao, KhungChuyen, SuatVao, TrangThaiChuyen } from "./dieu-phoi-kieu.ts";
import { kiemXuatBen, noiLechCuaSuat, type KiemXuatBenVao } from "./dieu-phoi-kiem.ts";
import { trangThaiChang, type TrangThaiChangRa } from "./dieu-phoi-trang-thai.ts";
import { canhBaoGioLai, NHAN_CANH_BAO_GIO_LAI } from "./gio-lai.ts";
import type { LyDoGiu } from "./ly-do-giu.ts";
import { kiemMocDat } from "./moc-toi-thieu.ts";
import { suatTraTruocDon } from "./thu-tu-diem.ts";
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
  /** I38 (R-P9): chặng có suất mà rơi khỏi `lichChungChang` — lý do CỤ THỂ theo cờ view, truyền nguyên xuống cổng xuất bến (`kiemXuatBen`). */
  changNgoai?: KiemXuatBenVao["changNgoai"];
  nhap: ChangNhapVao[];
  /** Chuyến của khoảng ngày. */
  chuyen: ChuyenVao[];
  /** Suất (mở và đóng) của các chuyến trên + suất mở của các chặng trên ở chuyến khác. */
  suat: SuatVao[];
  /** Điểm dừng của các chuyến trên (`placeKey`, giờ xe tới ghi đè — ADR-0050 VK1-B, [SOI] K-02). */
  diem: DiemVao[];
  /** Chuyến ngoài khoảng ngày có thể chạm (đang chạy, vừa kết thúc) — cho luật xe / tài xế đang chạy và nghỉ đủ. */
  chuyenKhac: KhungChuyen[];
  chinhSach: ChinhSachVao | null;
  hangBang: HangBangVao[];
  dieuKien: DieuKienVao[];
  bayGioMs: number;
}
export const LOAI_CANH_BAO_LICH = [
  "CHINH_SACH_RONG", "CHANG_QUA_MOC", "CHANG_SAT_MOC", "THIEU_SUAT", "THUA_SUAT", "CHANG_GIU", "GIO_HEN_NGOAI_CHUYEN", "CHUYEN_GIU", "NHAP_CHO_DAT_GAP",
  // [SOI] K-02 (ADR-0050): nơi hiện hành của chặng khác điểm của suất đang mở (mọi chuyến chưa kết thúc — kể cả đang chạy: chỉ báo); điểm đón có giờ xe tới
  // ghi đè MUỘN hơn giờ hẹn sớm nhất của các chặng đón tại điểm.
  "NOI_HEN_KHAC_DIEM", "GIO_XE_TOI_MUON_HON_HEN",
  // ADR-0055 VK2-B B3: giờ lái — CHỈ cảnh báo (không vào kiemXuatBen, không chặn).
  "GIO_LAI_VUOT", "CHUYEN_DAI_CAN_NGHI",
  // HT-01 (kiểm theo vai 2/10 — V1.2): suất chờ đón có điểm xuống đứng trước điểm lên — CHỈ cảnh báo; chặn ở cổng xuất bến chờ ADR-0096.
  "TRA_TRUOC_DON",
] as const;
export type LoaiCanhBaoLich = (typeof LOAI_CANH_BAO_LICH)[number];
/** Nhãn tiếng Việt của cảnh báo lịch chung (màn hình không tự đặt chữ — một chỗ). */
export const NHAN_CANH_BAO_LICH: Readonly<Record<LoaiCanhBaoLich, string>> = {
  CHINH_SACH_RONG: "Chưa có chính sách điều phối đang hiệu lực",
  CHANG_QUA_MOC: "Chặng đã quá mốc tối thiểu mà chưa xếp",
  CHANG_SAT_MOC: "Chặng sát mốc tối thiểu mà chưa xếp",
  THIEU_SUAT: "Chặng mới xếp một phần",
  THUA_SUAT: "Chặng xếp nhiều người hơn số khách",
  CHANG_GIU: "Chặng có khách trên xe nhưng đơn đã huỷ hoặc chặng đã bỏ",
  GIO_HEN_NGOAI_CHUYEN: "Giờ hẹn nằm ngoài khung giờ chuyến",
  CHUYEN_GIU: "Chuyến đang bị giữ",
  NHAP_CHO_DAT_GAP: "Đơn nháp có chặng dưới mốc chờ duyệt đặt gấp",
  NOI_HEN_KHAC_DIEM: "Nơi đón / trả của đơn khác điểm của xe",
  GIO_XE_TOI_MUON_HON_HEN: "Giờ xe tới muộn hơn giờ hẹn",
  GIO_LAI_VUOT: NHAN_CANH_BAO_GIO_LAI.GIO_LAI_VUOT,
  CHUYEN_DAI_CAN_NGHI: NHAN_CANH_BAO_GIO_LAI.CHUYEN_DAI_CAN_NGHI,
  TRA_TRUOC_DON: "Điểm trả đứng trước điểm đón của khách",
};
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
  xuatBenMs: c.xuatBenMs ?? null,
});

/**
 * C32 (đánh giá ERP 7/10): giờ hẹn đón (ms) nằm NGOÀI khung giờ [bắt đầu, kết thúc] của chuyến — MỘT luật cho cảnh báo lịch chung `GIO_HEN_NGOAI_CHUYEN` (cũng là
 * cảnh báo trong phản hồi lệnh xếp: `ChuyenChiTietResponse.canhBao`) và cho hộp "Xếp vào chuyến" (sắp / làm mờ chuyến lệch khung — `luaChonChuyenXep`). Chỉ cảnh
 * báo, không chặn (ADR-0096 Đ3.5: luật chặn chỉ là giờ hẹn SỚM hơn giờ khởi hành, ở cổng xuất bến — không đổi ở đây).
 */
export const gioHenNgoaiKhung = (gioMs: number, batDauMs: number, ketThucMs: number): boolean => gioMs < batDauMs || gioMs > ketThucMs;

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
      // GIO_HEN_NGOAI_CHUYEN = giờ hẹn nằm NGOÀI khung giờ của chuyến chưa chạy đang chở chặng (người XẾP XE dời khách sang chuyến khác). "Giờ hẹn đổi — gọi báo
      // khách" (MỌI lần đổi giờ của khách đã xếp, kể cả trong khung — người PHỤ TRÁCH ĐƠN gọi khách) là danh sách nhắc RIÊNG của ADR-0051 (src/shared/goi-bao.ts).
      const gio = c.ngayDon !== null && c.gioDon !== null ? vnLocalToMs(c.ngayDon, c.gioDon) : null;
      if (gio !== null) {
        const tripIds = [...new Set(v.suat.filter((s) => s.mo && s.legId === c.legId).map((s) => s.tripId))];
        for (const id of tripIds) {
          const t = chuyenTheoId.get(id);
          if (t && t.trangThai === "PLANNED" && gioHenNgoaiKhung(gio, t.batDauMs, t.ketThucMs)) cb("GIO_HEN_NGOAI_CHUYEN", c.legId, id, c.orderCode);
        }
      }
    }
    return { chang: c, trangThai: tt };
  });

  const chuyen: ChuyenLichRa[] = v.chuyen.map((c) => {
    const suatCuaChuyen = v.suat.filter((s) => s.tripId === c.id);
    const diemCuaChuyen = v.diem.filter((d) => d.tripId === c.id);
    const tai = suatCuaChuyen.filter((s) => s.mo && (s.trangThai === "WAITING" || s.trangThai === "BOARDED")).length;
    // [SOI] K-02 — mọi chuyến CHƯA kết thúc (kể cả đang chạy: chỉ báo, để văn phòng gọi tài xế). Cùng hàm so với lý do giữ NOI_HEN_DOI (I47). Khách đã lên xe
    // thì nơi ĐÓN đổi không còn ý nghĩa — chỉ xét nơi TRẢ.
    if (c.trangThai === "PLANNED" || c.trangThai === "RUNNING") {
      const daBao = new Set<string>();
      for (const s of suatCuaChuyen) {
        if (!(s.mo && s.loai === "PASSENGER" && s.legId !== null && (s.trangThai === "WAITING" || s.trangThai === "BOARDED"))) continue;
        const ch = v.chang.find((x) => x.legId === s.legId);
        if (!ch || daBao.has(ch.legId)) continue;
        const n = noiLechCuaSuat(s, diemCuaChuyen.find((d) => d.id === s.boardStopId), s.alightStopId === null ? undefined : diemCuaChuyen.find((d) => d.id === s.alightStopId), ch);
        if ((n.don && s.trangThai === "WAITING") || n.tra) {
          daBao.add(ch.legId);
          cb("NOI_HEN_KHAC_DIEM", ch.legId, c.id, ch.orderCode);
        }
      }
      for (const d of diemCuaChuyen) {
        if (d.loai !== "PICKUP" || d.trangThai !== "PENDING" || d.gioXeToiMs === null) continue;
        let somNhat: { ms: number; ch: ChangVao } | null = null;
        for (const s of suatCuaChuyen) {
          if (!(s.mo && s.loai === "PASSENGER" && s.boardStopId === d.id && s.legId !== null)) continue;
          const ch = v.chang.find((x) => x.legId === s.legId);
          const hen = ch && ch.ngayDon !== null && ch.gioDon !== null ? vnLocalToMs(ch.ngayDon, ch.gioDon) : null;
          if (ch && hen !== null && (somNhat === null || hen < somNhat.ms)) somNhat = { ms: hen, ch };
        }
        if (somNhat && d.gioXeToiMs > somNhat.ms) cb("GIO_XE_TOI_MUON_HON_HEN", somNhat.ch.legId, c.id, somNhat.ch.orderCode);
      }
      // HT-01 (V1.2): suất CHỜ ĐÓN có điểm xuống đứng trước điểm lên (MỘT luật: `suatTraTruocDon`) — một mục mỗi chặng. Khách đã lên xe thì thôi.
      const choDon = suatCuaChuyen.filter((s) => s.mo && s.loai === "PASSENGER" && s.trangThai === "WAITING" && s.legId !== null);
      const traTruoc = new Set(suatTraTruocDon(diemCuaChuyen, choDon.map((s) => ({ diemLen: s.boardStopId, diemXuong: s.alightStopId }))).map((i) => choDon[i]!.legId!));
      for (const legId of traTruoc) cb("TRA_TRUOC_DON", legId, c.id, v.chang.find((x) => x.legId === legId)?.orderCode ?? null);
    }
    let lyDoGiu: LyDoGiu[] = [];
    if (c.trangThai === "PLANNED") {
      const legIds = new Set(suatCuaChuyen.filter((s) => s.mo && s.legId !== null).map((s) => s.legId));
      lyDoGiu = kiemXuatBen({
        chuyen: c,
        suat: suatCuaChuyen,
        chang: v.chang.filter((x) => legIds.has(x.legId)),
        changNgoai: (v.changNgoai ?? []).filter((x) => legIds.has(x.legId)),
        suatMoCuaChang: v.suat.filter((s) => s.mo && s.legId !== null && legIds.has(s.legId)),
        diem: diemCuaChuyen,
        chuyenKhac: [...v.chuyen.filter((x) => x.id !== c.id).map(khung), ...v.chuyenKhac],
        chinhSach: v.chinhSach,
        hangBang: v.hangBang,
        dieuKien: v.dieuKien,
        bayGioMs: Math.max(v.bayGioMs, c.batDauMs),
        xuatBenMs: Math.max(v.bayGioMs, c.batDauMs), // dự phóng "xuất bến đúng giờ" (GA-11)
      }).lyDo;
      if (lyDoGiu.length > 0) cb("CHUYEN_GIU", null, c.id, null);
    }
    return { id: c.id, ma: c.ma, trangThai: c.trangThai, tai, soCho: c.xe.soCho, lyDoGiu };
  });
  // ADR-0055 VK2-B B3: giờ lái — CHỈ cảnh báo. Gộp chuyến của lịch + chuyến khác (khử trùng id trong canhBaoGioLai); chỉ gắn mục cho chuyến của lịch này.
  const csGioLai = v.chinhSach ? { dutyDayMaxMinutes: v.chinhSach.dutyDayMaxMinutes, tripNoBreakMaxMinutes: v.chinhSach.tripNoBreakMaxMinutes } : null;
  for (const w of canhBaoGioLai([...v.chuyen.map(khung), ...v.chuyenKhac], csGioLai, v.bayGioMs, new Set(v.chuyen.map((c) => c.id)))) cb(w.loai, null, w.tripId, null);

  const nhapChoDatGap = v.chinhSach ? v.nhap.filter((n) => kiemMocDat(n, v.bayGioMs, v.chinhSach!.minLeadMinutes).duoiMoc) : [];
  for (const n of nhapChoDatGap) cb("NHAP_CHO_DAT_GAP", n.legId, null, n.orderCode);
  return { chang, chuyen, nhapChoDatGap, soNhap: v.nhap.length, canhBao };
}
