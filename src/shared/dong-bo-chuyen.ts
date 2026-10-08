// ĐỒNG BỘ CHUYẾN THEO ĐƠN (ADR-0104 Đ2, Q-2 = a). Luật THUẦN dùng chung cho máy (lệnh đơn nối khúc chuyến vào CÙNG lô — `ctx.dongBoChuyen`) và nút tay
// "Cập nhật khách theo đơn" (route `cap-nhat-khach`). Không I/O, không import module; import kèm đuôi .ts. Mở rộng `suatKhachDaDoi` / `khoaNguoiRanh` /
// `moLaiSauDoiKhach` của dieu-phoi-kiem.ts — không chép luật. Test cạnh tệp: dong-bo-chuyen.test.ts.
//
// Luật trên chuyến PLANNED (Đ2.6), xét theo từng chặng của đơn:
//   (i)   đơn huỷ / chặng đóng / đơn không còn xác nhận → đóng MỌI suất mở của chặng, mã REMOVED (phán quyết G7, G9);
//   (ii)  khoá người không còn trong đơn → đóng PASSENGER_CHANGED rồi mở lại theo `moLaiSauDoiKhach` (khoá rảnh tính CHUNG mọi khúc của lô);
//   (iii) suất mở của chặng (mọi chuyến) nhiều hơn số người → đóng suất CHƯA TÊN trước, theo mã suất tăng dần (REMOVED); còn thừa mà mọi suất mang tên
//         người còn trong đơn → giữ THUA_SUAT; chặng trên hơn một chuyến → giữ;
//   (iv)  chỉ khi lệnh vừa tăng người ở chặng (`tang`) và chặng chỉ trên đúng chuyến này → mở tối đa số vừa tăng, không lấp phần thiếu cũ, trong số chỗ còn
//         (LC-02) và khi `kiemCamKet` không có vi phạm chưa phá lệ; không đạt → giữ THIEU_SUAT.
// Điểm hết khách → bỏ qua; cột phá lệ cam kết xoá khi hết vi phạm (khuôn `camKetSauGiam`). Chuyến RUNNING: không câu nào, chỉ cờ nhắc (Đ2.7). Chuyến đã
// kết thúc / huỷ: không gì (Đ2.8).
import { kiemCamKet, type ChangCamKet } from "./cam-ket-xe.ts";
import type { DongBoChuyenDto } from "./contracts.ts";
import { khoaNguoiRanh, moLaiSauDoiKhach } from "./dieu-phoi-kiem.ts";
import { LENH_DONG_SUAT, type DiemVao, type LyDoDongSuat, type SuatVao, type TrangThaiChuyen } from "./dieu-phoi-kieu.ts";

/**
 * Hành động nhật ký của CÂU CỔNG ĐƠN mà câu cổng chuyến hỏi (`v_aud_order_cmd`, ADR-0104 Đ2.2). Bằng ĐÚNG danh sách `IN (…)` của migration view (bài
 * src/migrations-dong-bo-chuyen.test.ts so tập). Thêm điểm gọi mang hành động ngoài danh sách → bài ghép đỏ (cổng chuyến không bao giờ thắng).
 */
export const HANH_DONG_CONG_DON = [
  "cancelled", "order_cancelled_by_field", "order_money_adjusted", "order_money_adjusted_by_field", "order_passenger_changed", "order_leg_updated", "order_leg_closed",
] as const;
export type HanhDongCongDon = (typeof HANH_DONG_CONG_DON)[number];

/** Trần phần CHUYẾN của một lô đồng bộ (ADR-0104 Đ2.5 — bằng lô lớn nhất đang có). Vượt → không nối khúc nào, phản hồi "chuyến cần cập nhật tay". */
export const TRAN_CAU_CHUYEN = 74;
/** Câu CỐ ĐỊNH khi đơn có khách trên xe đang chạy (Đ2.7) — không kèm mã chuyến, biển số, tài xế. */
export const CAU_NHAC_XE_DANG_CHAY = "Đơn có khách trên xe đang chạy — văn phòng bấm Báo huỷ";
/** Câu cố định khi máy không nối được phần chuyến (vượt trần / thua cổng chuyến) — kế hoạch §8. */
export const CAU_CAP_NHAT_TAY = "Chuyến cần cập nhật tay — người xếp xe bấm Cập nhật khách theo đơn";

/** Nguyên nhân dạng nhãn cố định (Đ2.9) — thứ tự in cố định. */
export const NGUYEN_NHAN_DONG_BO = ["DON_HUY", "DON_KHONG_XAC_NHAN", "BO_CHANG", "DOI_NGUOI", "BOT_KHACH", "THEM_KHACH"] as const;
export type NguyenNhanDongBo = (typeof NGUYEN_NHAN_DONG_BO)[number];
export const NHAN_NGUYEN_NHAN: Readonly<Record<NguyenNhanDongBo, string>> = {
  DON_HUY: "đơn huỷ", DON_KHONG_XAC_NHAN: "đơn không còn xác nhận", BO_CHANG: "bỏ chặng", DOI_NGUOI: "đổi người", BOT_KHACH: "bớt khách", THEM_KHACH: "thêm khách",
};
/** Lý do làm luật (i) đóng hết suất của chặng. */
export type LyDoDongChang = "DON_HUY" | "DON_KHONG_XAC_NHAN" | "BO_CHANG";

/**
 * Trạng thái đơn SAU lệnh do route đơn lấy từ bản kế hoạch của chính nó (Đ2.1). Vắng = không đổi so với dữ liệu đọc. `nguoi` = khoá người hiện hành của
 * ĐƠN sau lệnh (hành khách thuộc đơn, mọi chặng dùng chung — như `lichChungChang.nguoiCuaDon`).
 */
export interface SauDon {
  trangThai: string;
  changDong?: readonly string[];
  soNguoiTheoChang?: Readonly<Record<string, number>>;
  nguoi?: readonly string[];
}
/** Chặng của đơn đọc được (view công bố của orders): khoá + cờ mở TRƯỚC lệnh. */
export interface ChangDoc {
  legId: string;
  orderId: string;
  orderCode: string;
  moTruoc: boolean;
}
/** Một chặng ở trạng thái SAU lệnh — vào luật. `soNguoi` null = không biết (bỏ (iii), (iv); (ii) mở lại một-đổi-một). */
export interface ChangDongBo {
  legId: string;
  orderId: string;
  orderCode: string;
  dong: LyDoDongChang | null;
  soNguoi: number | null;
  nguoi: readonly string[];
  /** Số người lệnh này vừa tăng ở chặng (≥ 0). */
  tang: number;
}
/** Một chuyến có suất của các chặng được xét. `suat` = suất của chuyến (mở hoặc đóng); `changCamKet` = cột cam kết của chặng có suất khách mở trên chuyến. */
export interface ChuyenDongBo {
  id: string;
  ma: string;
  trangThai: TrangThaiChuyen;
  xeId: string;
  /** Số chỗ của xe; null = không đọc được xe → không mở thêm, không xoá cột phá lệ. */
  soCho: number | null;
  suat: readonly SuatVao[];
  diem: readonly DiemVao[];
  camKetPhaLeKhoa: string | null;
  changCamKet: ReadonlyMap<string, ChangCamKet>;
}
export interface VaoDongBo {
  chang: readonly ChangDongBo[];
  /** Chuyến được xét (PLANNED → lập khúc; RUNNING → chỉ cờ nhắc; còn lại bỏ qua). */
  chuyen: readonly ChuyenDongBo[];
  /** Suất MỞ của các chặng trên MỌI chuyến (L-D1 — `allocsOpenByLegs`), kể cả chuyến không trong `chuyen`. */
  suatMoCuaChang: readonly SuatVao[];
  /** Suất đã có cờ "văn phòng báo huỷ" (xe đang chạy — ADR-0052 D5.2): không nhắc lại. */
  daBaoHuy?: ReadonlySet<string>;
  newId: () => string;
}
export interface SuatMoDongBo {
  id: string;
  tripId: string;
  legId: string;
  personKey: string | null;
  boardStopId: string | null;
  alightStopId: string | null;
}
/** Kế hoạch ghi của MỘT chuyến (một khúc của lô): đóng trước, mở sau (LC-02 đếm theo dòng). */
export interface KhucDongBo {
  tripId: string;
  ma: string;
  dong: { suatId: string; lyDo: LyDoDongSuat }[];
  mo: SuatMoDongBo[];
  diemBoQua: string[];
  /** Hết vi phạm cam kết mà chuyến đang có cột phá lệ → xoá cột (`{ null, null }`). */
  xoaCamKet: boolean;
  /** Theo đơn (mã đơn, nguyên nhân, số ghế trả / thêm) — cho nhật ký; không khoá người. */
  theoDon: { orderCode: string; nguyenNhan: NguyenNhanDongBo[]; tra: number; them: number }[];
}
export interface KetQuaDongBo {
  khuc: KhucDongBo[];
  /** Có chuyến ĐANG CHẠY mà luật sẽ đóng suất khách chờ đón → phản hồi kèm `CAU_NHAC_XE_DANG_CHAY`. */
  nhacXeDangChay: boolean;
  /** Chỗ máy KHÔNG đoán (giữ cho người xếp xe) — để bài thử và nhật ký đọc; `tripId` null = chặng trên nhiều chuyến. */
  giu: { tripId: string | null; legId: string; lyDo: "THUA_SUAT" | "THIEU_SUAT" | "NHIEU_CHUYEN" }[];
}

/** Chồng `sau` (route) + `tangTheoChang` lên chặng đọc được. Đơn không `confirmed` → (i) cho mọi chặng; chặng trong `changDong` hoặc đã đóng → bỏ chặng. */
export function changTheoSau(v: {
  doc: readonly ChangDoc[]; sau: SauDon; nguoiDoc: readonly string[]; tangTheoChang?: Readonly<Record<string, number>>;
}): ChangDongBo[] {
  const dongDon: LyDoDongChang | null = v.sau.trangThai === "cancelled" ? "DON_HUY" : v.sau.trangThai !== "confirmed" ? "DON_KHONG_XAC_NHAN" : null;
  const changDong = new Set(v.sau.changDong ?? []);
  return v.doc.map((d) => ({
    legId: d.legId, orderId: d.orderId, orderCode: d.orderCode,
    dong: dongDon ?? (changDong.has(d.legId) || !d.moTruoc ? "BO_CHANG" : null),
    soNguoi: v.sau.soNguoiTheoChang?.[d.legId] ?? null,
    nguoi: [...(v.sau.nguoi ?? v.nguoiDoc)],
    tang: Math.max(0, v.tangTheoChang?.[d.legId] ?? 0),
  }));
}

const soSanh = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const chiemCho = (s: SuatVao) => s.mo && (s.trangThai === "WAITING" || s.trangThai === "BOARDED");

/** Luật đồng bộ (Đ2.6) — xem chú thích đầu tệp. Khúc sắp theo mã chuyến; trong khúc đóng trước, mở sau. */
export function dongBoChuyenTheoDon(v: VaoDongBo): KetQuaDongBo {
  const chuyen = [...v.chuyen].sort((a, b) => soSanh(a.ma, b.ma) || soSanh(a.id, b.id));
  const theoId = new Map(chuyen.map((c) => [c.id, c]));
  const ghiDuoc = (tripId: string) => theoId.get(tripId)?.trangThai === "PLANNED";
  const dangChay = (tripId: string) => theoId.get(tripId)?.trangThai === "RUNNING";
  const thuTuChuyen = (tripId: string) => {
    const i = chuyen.findIndex((c) => c.id === tripId);
    return i === -1 ? chuyen.length : i;
  };
  const dong = new Map<string, { suatId: string; lyDo: LyDoDongSuat; tripId: string }[]>();
  const mo = new Map<string, SuatMoDongBo[]>();
  const daDong = new Set<string>();
  const nguyenNhan = new Map<string, Map<string, { nn: Set<NguyenNhanDongBo>; tra: number; them: number }>>();
  const giu: KetQuaDongBo["giu"] = [];
  let nhac = false;
  const ghiNguyenNhan = (tripId: string, orderCode: string, nn: NguyenNhanDongBo, tra: number, them: number) => {
    const t = nguyenNhan.get(tripId) ?? new Map();
    nguyenNhan.set(tripId, t);
    const o = t.get(orderCode) ?? { nn: new Set<NguyenNhanDongBo>(), tra: 0, them: 0 };
    t.set(orderCode, o);
    o.nn.add(nn);
    o.tra += tra;
    o.them += them;
  };
  const dongSuat = (s: SuatVao, lyDo: LyDoDongSuat, ch: ChangDongBo, nn: NguyenNhanDongBo) => {
    daDong.add(s.id);
    dong.set(s.tripId, [...(dong.get(s.tripId) ?? []), { suatId: s.id, lyDo, tripId: s.tripId }]);
    ghiNguyenNhan(s.tripId, ch.orderCode, nn, 1, 0);
  };
  const moSuat = (m: SuatMoDongBo, ch: ChangDongBo, nn: NguyenNhanDongBo) => {
    mo.set(m.tripId, [...(mo.get(m.tripId) ?? []), m]);
    ghiNguyenNhan(m.tripId, ch.orderCode, nn, 0, 1);
  };
  /** Suất khách CHỜ ĐÓN trên xe đang chạy, chưa báo huỷ — luật sẽ đóng nhưng máy không ghi ⇒ nhắc văn phòng bấm Báo huỷ (Đ2.7). */
  const canNhac = (s: SuatVao) => dangChay(s.tripId) && s.trangThai === "WAITING" && !(v.daBaoHuy?.has(s.id) ?? false);
  const theoThuTu = (a: SuatVao, b: SuatVao) => thuTuChuyen(a.tripId) - thuTuChuyen(b.tripId) || soSanh(a.id, b.id);
  // Khoá đã cấp trong lô (theo chặng) — khoá người tính CHUNG cho mọi khúc (chỉ mục duy nhất chặng + người trên suất mở ở MỌI chuyến).
  const khoaDaCap = new Map<string, Set<string>>();
  const ranhCua = (ch: ChangDongBo): string[] => {
    const conMo = v.suatMoCuaChang.filter((s) => s.mo && s.legId === ch.legId && !daDong.has(s.id));
    const cap = khoaDaCap.get(ch.legId) ?? new Set<string>();
    return khoaNguoiRanh({ legId: ch.legId, nguoiCuaDon: ch.nguoi, suatMoCuaChang: conMo }).filter((k) => !cap.has(k));
  };
  const capKhoa = (legId: string, k: string | null) => {
    if (k === null) return;
    khoaDaCap.set(legId, new Set([...(khoaDaCap.get(legId) ?? []), k]));
  };
  /** Số suất mở của chặng trên mọi chuyến sau các lệnh đóng / mở đã lập. */
  const demMo = (legId: string) =>
    v.suatMoCuaChang.filter((s) => s.mo && s.legId === legId && !daDong.has(s.id)).length + [...mo.values()].flat().filter((m) => m.legId === legId).length;

  // ---- Pha 1: (i), (ii), (iii) — mọi chặng.
  for (const ch of v.chang) {
    const moAll = v.suatMoCuaChang.filter((s) => s.mo && s.legId === ch.legId).sort(theoThuTu);
    if (moAll.length === 0) continue;
    if (ch.dong !== null) {
      for (const s of moAll) {
        if (ghiDuoc(s.tripId)) dongSuat(s, LENH_DONG_SUAT.DONG_BO_THEO_DON, ch, ch.dong);
        else if (canNhac(s)) nhac = true;
      }
      continue;
    }
    const nguoi = new Set(ch.nguoi);
    const lech = moAll.filter((s) => s.personKey !== null && !nguoi.has(s.personKey));
    if (lech.some(canNhac)) nhac = true;
    const lechGhi = lech.filter((s) => ghiDuoc(s.tripId));
    if (lechGhi.length > 0) {
      for (const s of lechGhi) daDong.add(s.id); // khoá của suất sắp đóng không chiếm chỗ khi tính khoá rảnh
      const ranh = ranhCua(ch);
      const soMoSauDong = moAll.length - lechGhi.length;
      const khoa = ch.soNguoi === null
        ? lechGhi.map((_s, i) => ranh[i] ?? null)
        : moLaiSauDoiKhach({ soNguoi: ch.soNguoi, soMoSauDong, soDong: lechGhi.length, ranh });
      lechGhi.forEach((s, i) => {
        dongSuat(s, LENH_DONG_SUAT.DOI_KHACH_THEO_DON, ch, "DOI_NGUOI");
        if (i < khoa.length) {
          const k = khoa[i] ?? null;
          capKhoa(ch.legId, k);
          moSuat({ id: v.newId(), tripId: s.tripId, legId: ch.legId, personKey: k, boardStopId: s.boardStopId, alightStopId: s.alightStopId }, ch, "DOI_NGUOI");
        }
      });
    }
    if (ch.soNguoi === null) continue;
    let thua = demMo(ch.legId) - ch.soNguoi;
    if (thua <= 0) continue;
    const chuyenCuaChang = new Set(moAll.map((s) => s.tripId));
    if (chuyenCuaChang.size > 1) {
      giu.push({ tripId: null, legId: ch.legId, lyDo: "NHIEU_CHUYEN" });
      continue;
    }
    const tripId = [...chuyenCuaChang][0]!;
    if (!ghiDuoc(tripId)) {
      if (moAll.some(canNhac)) nhac = true;
      continue;
    }
    const chuaTen = moAll.filter((s) => s.personKey === null && !daDong.has(s.id)).sort((a, b) => soSanh(a.id, b.id));
    for (const s of chuaTen.slice(0, thua)) dongSuat(s, LENH_DONG_SUAT.DONG_BO_THEO_DON, ch, "BOT_KHACH");
    thua -= Math.min(thua, chuaTen.length);
    if (thua > 0) giu.push({ tripId, legId: ch.legId, lyDo: "THUA_SUAT" });
  }

  // ---- Pha 2: (iv) — sau mọi lệnh đóng (chỗ trống của chuyến tính sau khi đóng).
  const changSauCua = (c: ChuyenDongBo): ChangCamKet[] => {
    const legs = new Set([
      ...c.suat.filter((s) => s.mo && s.loai === "PASSENGER" && s.legId !== null && !daDong.has(s.id)).map((s) => s.legId as string),
      ...(mo.get(c.id) ?? []).map((m) => m.legId),
    ]);
    return [...legs].sort().flatMap((id) => {
      const x = c.changCamKet.get(id);
      return x ? [x] : [];
    });
  };
  for (const ch of v.chang) {
    if (ch.dong !== null || ch.tang <= 0 || ch.soNguoi === null) continue;
    const moAll = v.suatMoCuaChang.filter((s) => s.mo && s.legId === ch.legId);
    const chuyenCuaChang = new Set(moAll.map((s) => s.tripId));
    if (chuyenCuaChang.size !== 1) continue;
    const c = theoId.get([...chuyenCuaChang][0]!);
    if (!c || c.trangThai !== "PLANNED") continue;
    const muon = Math.min(ch.tang, Math.max(0, ch.soNguoi - demMo(ch.legId)));
    if (muon === 0) continue;
    let duoc = 0;
    if (c.soCho !== null) {
      const ck = kiemCamKet({ xe: { id: c.xeId, soCho: c.soCho }, chang: changSauCua(c), khoaDaPhaLe: c.camKetPhaLeKhoa });
      const dangChiem = c.suat.filter((s) => chiemCho(s) && !daDong.has(s.id)).length + (mo.get(c.id) ?? []).length;
      duoc = ck.khoa !== null && !ck.daPhaLe ? 0 : Math.min(muon, Math.max(0, c.soCho - dangChiem));
    }
    // Suất mới cùng điểm lên / xuống của suất hiện có của chặng trên chuyến (mã suất nhỏ nhất); không còn suất mở thì suất vừa đóng trong lô.
    const mau = [...moAll.filter((s) => !daDong.has(s.id)), ...moAll.filter((s) => daDong.has(s.id))][0];
    if (duoc > 0 && mau) {
      const ranh = ranhCua(ch);
      for (let i = 0; i < duoc; i++) {
        const k = ranh[i] ?? null;
        capKhoa(ch.legId, k);
        moSuat({ id: v.newId(), tripId: c.id, legId: ch.legId, personKey: k, boardStopId: mau.boardStopId, alightStopId: mau.alightStopId }, ch, "THEM_KHACH");
      }
    }
    if (duoc < muon) giu.push({ tripId: c.id, legId: ch.legId, lyDo: "THIEU_SUAT" });
  }

  // ---- Lập khúc cho chuyến có thay đổi.
  const khuc: KhucDongBo[] = [];
  for (const c of chuyen) {
    const d = (dong.get(c.id) ?? []).map(({ suatId, lyDo }) => ({ suatId, lyDo }));
    const m = mo.get(c.id) ?? [];
    if (d.length === 0 && m.length === 0) continue;
    const conMo = [
      ...c.suat.filter((s) => s.mo && !daDong.has(s.id)).map((s) => ({ board: s.boardStopId, alight: s.alightStopId })),
      ...m.map((x) => ({ board: x.boardStopId, alight: x.alightStopId })),
    ];
    const diemBoQua = c.diem.filter((x) => x.tripId === c.id && x.trangThai === "PENDING" && !conMo.some((a) => a.board === x.id || a.alight === x.id)).map((x) => x.id);
    let xoaCamKet = false;
    if (c.camKetPhaLeKhoa !== null && c.soCho !== null) {
      xoaCamKet = kiemCamKet({ xe: { id: c.xeId, soCho: c.soCho }, chang: changSauCua(c), khoaDaPhaLe: c.camKetPhaLeKhoa }).khoa === null;
    }
    const theoDon = [...(nguyenNhan.get(c.id) ?? new Map()).entries()]
      .sort(([a], [b]) => soSanh(a, b))
      .map(([orderCode, x]) => ({ orderCode, nguyenNhan: NGUYEN_NHAN_DONG_BO.filter((n) => x.nn.has(n)), tra: x.tra, them: x.them }));
    khuc.push({ tripId: c.id, ma: c.ma, dong: d, mo: m, diemBoQua, xoaCamKet, theoDon });
  }
  return { khuc, nhacXeDangChay: nhac, giu };
}

/** Số câu của một khúc: cổng + nhật ký + sự kiện + đóng + mở + bỏ điểm + cam kết (ADR-0104 "Đếm câu"). */
export const demCau = (k: KhucDongBo): number => 3 + k.dong.length + k.mo.length + k.diemBoQua.length + (k.xoaCamKet ? 1 : 0);
export const tongCauChuyen = (ks: readonly KhucDongBo[]): number => ks.reduce((n, k) => n + demCau(k), 0);

/** Phần đơn của `detail` nhật ký (LC-18): mã đơn, nhãn nguyên nhân cố định, số ghế trả / thêm — không tên, không khoá người. */
export const moTaTheoDon = (k: Pick<KhucDongBo, "theoDon">): string =>
  k.theoDon.map((d) => {
    const so = [d.tra > 0 ? `trả ${d.tra} ghế` : "", d.them > 0 ? `thêm ${d.them} ghế` : ""].filter(Boolean).join(", ");
    return `${d.orderCode} (${d.nguyenNhan.map((n) => NHAN_NGUYEN_NHAN[n]).join(", ")}): ${so}`;
  }).join("; ");
/** `detail` của nhật ký `trip_order_synced` (Đ2.9) — trước đuôi cam kết. */
export const moTaKhuc = (k: Pick<KhucDongBo, "ma" | "theoDon">): string => `${k.ma}: máy cập nhật theo đơn — ${moTaTheoDon(k)}`;

// ---- Hàm tiêm `ctx.dongBoChuyen` (ADR-0104 Đ2.1 — gốc lắp ráp nối van-chuyen; orders / dispatch không import van-chuyen) ---------------------------------
/** Đầu vào từ điểm gọi (route đơn): câu đơn ĐÃ SOẠN chưa chạy + mã nhật ký của câu cổng đơn + trạng thái đơn SAU lệnh. */
export interface VaoDongBoTheoDon {
  orderId: string;
  /** id dòng audit_log của câu cổng đơn — hành động phải thuộc HANH_DONG_CONG_DON (bài ghép). */
  auditIdDon: string;
  bayGioMs: number;
  sau: SauDon;
  /** Số người lệnh này tăng ở từng chặng; vắng = không tăng (Đ2.1). */
  tangTheoChang?: Readonly<Record<string, number>>;
  cauDon: readonly D1PreparedStatement[];
}
/**
 * Kết quả của hàm tiêm: `lo` = danh sách ĐẦY ĐỦ chưa chạy `[câu đơn…, khúc chuyến…]` (vượt trần / không có gì để đồng bộ → đúng `cauDon`). Điểm gọi chạy MỘT
 * `db.batch(lo)`; chỉ số kết quả của câu đơn không đổi (câu đơn đứng đầu). `sauKhiGhi(kq)` (khi lệnh đơn THẮNG) trả phần "chuyến" của phản hồi — khúc thua
 * cổng chuyến bật `capNhatTay` — và (bản do router bọc) tự báo Bảng tin cho từng khúc thắng. `dichLoi(e)`: lỗi trigger chuyến của lô → 409 `trip_rule`, lỗi
 * khác → null (route tự dịch như cũ).
 */
export interface DongBoTheoDon {
  lo: D1PreparedStatement[];
  soCauDon: number;
  nhac: string | null;
  capNhatTay: boolean;
  sauKhiGhi: (kq: readonly D1Result[]) => { dto: DongBoChuyenDto; bao: { tripId: string; requestId: string }[] };
  dichLoi: (e: unknown) => Response | null;
}
/** Kiểu của `ctx.dongBoChuyen` — orders / dispatch nhận làm tham số (không import van-chuyen). */
export type NoiChuyen = (x: VaoDongBoTheoDon) => Promise<DongBoTheoDon>;
/**
 * Không có máy đồng bộ (hàm tiêm vắng — chỉ khung thử cố ý tắt): lô = đúng câu đơn, chuyến giữ như cũ; phản hồi báo `capNhatTay` (máy không đồng bộ được — nói
 * thật, không đoán "không có chuyến nào").
 */
export function dongBoDiThang(x: Pick<VaoDongBoTheoDon, "cauDon">): DongBoTheoDon {
  return {
    lo: [...x.cauDon], soCauDon: x.cauDon.length, nhac: null, capNhatTay: true,
    sauKhiGhi: () => ({ dto: { nhac: null, capNhatTay: true }, bao: [] }),
    dichLoi: () => null,
  };
}
