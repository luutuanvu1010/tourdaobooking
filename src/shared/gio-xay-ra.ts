// GIỜ XẢY RA THẬT khi văn phòng bấm thay (ADR-0050 VK1-A; kế hoạch I33–I35, TC-46) — luật THUẦN dùng chung máy chủ (route văn phòng 31–38, A15) và màn hình
// (ô khai giờ). Không I/O, không import module; import kèm đuôi .ts. Test cạnh tệp: gio-xay-ra.test.ts.
//
// Hai trục thời gian: GIỜ GHI NHẬN = lúc máy chủ ghi (`created_at`); GIỜ XẢY RA = lúc việc diễn ra ngoài đời. Tài xế tự bấm / máy chủ: xảy ra = ghi nhận.
// Văn phòng bấm thay được KHAI giờ xảy ra trong khoảng kẹp (năm vế của ADR-0050):
//   1. không sau giờ ghi nhận (TUONG_LAI);
//   2. không sớm hơn giờ ghi nhận − kẹp lùi của chính sách hiện hành (`proxy_backdate_max_minutes`) (LUI_QUA_KEP);
//   3. thứ tự trong chuyến (DAO_THU_TU): xuất bến ≤ mọi tiến độ; đã tới điểm ≤ đã đón / vắng / khách huỷ / đã trả ở điểm đó; đã đón ≤ đã trả cùng suất;
//      kết thúc ≥ mọi tiến độ đã có;
//   4. xuất bến ≥ giờ XẢY RA kết thúc của chuyến liền trước cùng xe và cùng tài xế (CHONG_CHUYEN_TRUOC);
//   5. không sớm hơn lần sửa kế hoạch cuối chạm đúng đối tượng: xuất bến ≥ GIỜ GHI NHẬN mọi sự kiện trước của chuyến (TRUOC_SUA_KE_HOACH — cùng định nghĩa
//      với trigger `vc_trip_departed_after_plan` của 0042); đã tới ≥ giờ ghi nhận lần đổi thứ tự điểm cuối (TRUOC_DOI_THU_TU); sự kiện của suất ≥ lúc mở
//      suất (TRUOC_MO_SUAT).
// Chỉ tám loại TIẾN ĐỘ (`LOAI_SU_KIEN_KHAI_GIO`) được khai; khai cho loại khác → LOAI_KHONG_KHAI_GIO. Máy chủ không bao giờ lưu chuỗi giờ của trình duyệt:
// route đổi `xayRaLuc` ra mili-giây, gọi hàm này, rồi tự định dạng lại bằng `toISOString()` (I33 — thử thật ở A0 bước 14).
import { isSuKienKhaiGio, type LoaiSuKienChuyen } from "./dieu-phoi-kieu.ts";

const PHUT = 60_000;

export const MA_GIO_XAY_RA = [
  "LOAI_KHONG_KHAI_GIO", "TUONG_LAI", "LUI_QUA_KEP", "DAO_THU_TU", "CHONG_CHUYEN_TRUOC", "TRUOC_SUA_KE_HOACH", "TRUOC_DOI_THU_TU", "TRUOC_MO_SUAT",
] as const;
export type MaGioXayRa = (typeof MA_GIO_XAY_RA)[number];
export const NHAN_GIO_XAY_RA: Readonly<Record<MaGioXayRa, string>> = {
  LOAI_KHONG_KHAI_GIO: "Việc này không khai giờ được — giờ là lúc bấm",
  TUONG_LAI: "Giờ khai sau thời điểm bấm",
  LUI_QUA_KEP: "Giờ khai lùi quá khoảng cho phép",
  DAO_THU_TU: "Giờ khai sai thứ tự với các mốc đã ghi của chuyến",
  CHONG_CHUYEN_TRUOC: "Giờ xuất bến sớm hơn lúc chuyến trước của xe hoặc tài xế kết thúc",
  TRUOC_SUA_KE_HOACH: "Giờ xuất bến sớm hơn lần sửa kế hoạch cuối của chuyến",
  TRUOC_DOI_THU_TU: "Giờ tới điểm sớm hơn lần đổi thứ tự điểm cuối",
  TRUOC_MO_SUAT: "Giờ khai sớm hơn lúc khách được xếp lên xe",
};

/** Một sự kiện ĐÃ CÓ của chính chuyến (`vc_trip_event`): loại, giờ xảy ra, giờ ghi nhận, điểm / suất nó chạm. */
export interface SuKienDaCo {
  loai: LoaiSuKienChuyen;
  xayRaMs: number;
  ghiNhanMs: number;
  diemId: string | null;
  suatId: string | null;
}
export interface KiemGioXayRaVao {
  /** Loại sự kiện SẮP ghi. */
  loai: LoaiSuKienChuyen;
  /** Văn phòng khai giờ (`VAN_PHONG_KHAI`) — false = máy chủ tự ghi (xảy ra = ghi nhận). */
  khai: boolean;
  xayRaMs: number;
  /** Giờ ghi nhận = MỘT mốc giờ của request (I33). */
  ghiNhanMs: number;
  /** Kẹp lùi tối đa (phút) của chính sách hiện hành. */
  kepLuiPhut: number;
  /** MỌI sự kiện đã có của chính chuyến (không gồm sự kiện sắp ghi). */
  suKien: SuKienDaCo[];
  /** Điểm của sự kiện: đã tới → điểm đó; đã đón / vắng / khách huỷ → điểm LÊN của suất; đã trả → điểm XUỐNG. */
  diemId: string | null;
  suatId: string | null;
  /** Lúc mở suất (`valid_from_at` — giờ ghi nhận) — sự kiện của suất. */
  suatMoTuMs: number | null;
  /** Giờ XẢY RA kết thúc của chuyến liền trước cùng xe và cùng tài xế — chỉ xét khi xuất bến. */
  ketThucChuyenTruocMs: number[];
}
export type KetQuaGioXayRa = { ok: true } | { ok: false; chan: MaGioXayRa[] };

const SU_KIEN_SUAT_O_DIEM_LEN = new Set<LoaiSuKienChuyen>(["PASSENGER_BOARDED", "PASSENGER_NO_SHOW", "PASSENGER_CANCELLED_AT_STOP"]);
const laSuKienSuat = (l: LoaiSuKienChuyen): boolean => SU_KIEN_SUAT_O_DIEM_LEN.has(l) || l === "PASSENGER_DROPPED";

export function kiemGioXayRa(v: KiemGioXayRaVao): KetQuaGioXayRa {
  const chan = new Set<MaGioXayRa>();
  const x = v.xayRaMs;
  if (v.khai && !isSuKienKhaiGio(v.loai)) chan.add("LOAI_KHONG_KHAI_GIO");
  if (x > v.ghiNhanMs) chan.add("TUONG_LAI");
  if (x < v.ghiNhanMs - v.kepLuiPhut * PHUT) chan.add("LUI_QUA_KEP");

  // 3. Thứ tự trong chuyến — chỉ so với sự kiện TIẾN ĐỘ đã có (giờ xảy ra).
  const tienDo = v.suKien.filter((e) => isSuKienKhaiGio(e.loai));
  const xuatBen = tienDo.find((e) => e.loai === "DEPARTED");
  if (v.loai === "DEPARTED") {
    if (tienDo.some((e) => e.loai !== "DEPARTED" && e.xayRaMs < x)) chan.add("DAO_THU_TU");
  } else if (isSuKienKhaiGio(v.loai) && xuatBen && x < xuatBen.xayRaMs) chan.add("DAO_THU_TU");
  // ADR-0050 vế 3: đã tới điểm ≤ đã đón / vắng / khách huỷ Ở ĐIỂM ĐÓ (điểm LÊN của suất) — hai chiều.
  if (v.loai === "STOP_ARRIVED" && v.diemId !== null) {
    if (tienDo.some((e) => SU_KIEN_SUAT_O_DIEM_LEN.has(e.loai) && e.diemId === v.diemId && e.xayRaMs < x)) chan.add("DAO_THU_TU");
  }
  if (SU_KIEN_SUAT_O_DIEM_LEN.has(v.loai) && v.diemId !== null) {
    if (tienDo.some((e) => e.loai === "STOP_ARRIVED" && e.diemId === v.diemId && e.xayRaMs > x)) chan.add("DAO_THU_TU");
  }
  // GA-25 — chủ chốt 29/9, Trả lời lần 11 — docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md ("Chặn"): giờ "đã tới điểm
  // trả" phải ≤ giờ "đã trả khách" ở điểm đó; khai ngược → báo lỗi. Hai chiều (khuôn I20: "Đã trả" đòi điểm xuống đã tới). Bài: "GA-25 …"
  // trong gio-xay-ra.test.ts.
  if (v.loai === "STOP_ARRIVED" && v.diemId !== null) {
    if (tienDo.some((e) => e.loai === "PASSENGER_DROPPED" && e.diemId === v.diemId && e.xayRaMs < x)) chan.add("DAO_THU_TU");
  }
  if (v.loai === "PASSENGER_DROPPED" && v.diemId !== null) {
    if (tienDo.some((e) => e.loai === "STOP_ARRIVED" && e.diemId === v.diemId && e.xayRaMs > x)) chan.add("DAO_THU_TU");
  }
  // hết khối GA-25
  if (laSuKienSuat(v.loai)) {
    if (v.loai === "PASSENGER_DROPPED" && tienDo.some((e) => e.loai === "PASSENGER_BOARDED" && e.suatId === v.suatId && e.xayRaMs > x)) chan.add("DAO_THU_TU");
    if (v.loai === "PASSENGER_BOARDED" && tienDo.some((e) => e.loai === "PASSENGER_DROPPED" && e.suatId === v.suatId && e.xayRaMs < x)) chan.add("DAO_THU_TU");
  }
  if ((v.loai === "ENDED" || v.loai === "ENDED_INTERRUPTED") && tienDo.some((e) => e.xayRaMs > x)) chan.add("DAO_THU_TU");

  // 4. Không chồng chuyến trước (cùng xe / cùng tài xế) — theo giờ XẢY RA kết thúc.
  if (v.loai === "DEPARTED" && v.ketThucChuyenTruocMs.some((kt) => x < kt)) chan.add("CHONG_CHUYEN_TRUOC");
  // 5. Không sớm hơn lần sửa kế hoạch cuối — so với GIỜ GHI NHẬN.
  if (v.loai === "DEPARTED" && v.suKien.some((e) => e.ghiNhanMs > x)) chan.add("TRUOC_SUA_KE_HOACH");
  if (v.loai === "STOP_ARRIVED" && v.suKien.some((e) => e.loai === "STOPS_REORDERED" && e.ghiNhanMs > x)) chan.add("TRUOC_DOI_THU_TU");
  if (laSuKienSuat(v.loai) && v.suatMoTuMs !== null && x < v.suatMoTuMs) chan.add("TRUOC_MO_SUAT");

  const ds = MA_GIO_XAY_RA.filter((m) => chan.has(m));
  return ds.length === 0 ? { ok: true } : { ok: false, chan: ds };
}
