// LỚP CHỐNG GHI TRÙNG (ADR-0094) — luật THUẦN mà router (src/shared/router.ts) dùng ở bước tra trước / phát lại. Đặt ở src/shared/ (không ở
// src/modules/lan-gui/rules.ts) vì router không được import module (ADR-0002 điều 6); phần có khoá bí mật (vân tay HMAC) ở module `lan-gui`.
// Không I/O, không đồng hồ: mốc "bây giờ" do nơi gọi truyền vào.

/** Dạng vé (header `Idempotency-Key`): 16–64 ký tự `[A-Za-z0-9-]` (đặc tả §3.3 bước 1; UUID của `crypto.randomUUID()` dài 36). */
const KHOA_RE = /^[A-Za-z0-9-]{16,64}$/;
export const kiemKhoa = (s: string): boolean => KHOA_RE.test(s);

/** Tên header vé (IETF draft `Idempotency-Key`) và header đánh dấu phản hồi phát lại (tên của Stripe). */
export const HEADER_VE = "idempotency-key";
export const HEADER_PHAT_LAI = "Idempotent-Replayed";

/** Vé đã ghi, chưa có kết quả, mới hơn ngưỡng này ⇒ "đang xử lý" (409); cũ hơn ⇒ coi như đã ghi mà không rõ kết quả (đặc tả §3.3 bước 3c–3d). */
export const NGUONG_DANG_XU_LY_MS = 10_000;

/** Dòng vé router đọc lại (cột của `lg_lan_gui`, không có `staff_id`/`khoa`/`duong`). */
export interface DongVe {
  van_tay: string;
  ma_tra: number | null;
  ma_loi: string | null;
  ket_qua: string | null;
  created_at: string;
}

export type LoaiPhatLai = "khac_noi_dung" | "phat_lai" | "dang_xu_ly" | "phat_lai_khong_ro";

/** Bước 3a–3d: cùng vé đã có dòng — xử lý thế nào. Mốc `created_at` hỏng ⇒ không rõ (không treo "đang xử lý" mãi). */
export function phanLoai(dong: DongVe, vanTayMoi: string, nowMs: number): LoaiPhatLai {
  if (dong.van_tay !== vanTayMoi) return "khac_noi_dung";
  if (dong.ma_tra !== null) return dong.ma_tra >= 500 ? "phat_lai_khong_ro" : "phat_lai";
  const tuoi = nowMs - Date.parse(dong.created_at);
  return Number.isFinite(tuoi) && tuoi < NGUONG_DANG_XU_LY_MS ? "dang_xu_ly" : "phat_lai_khong_ro";
}

/** Câu cố định khi lần đầu bị từ chối mà vẫn ghi vé (ADR-0094 đ6) — không lưu câu chữ cũ vì có thể chứa tên. */
export const CAU_TU_CHOI_PHAT_LAI = "Lần gửi trước đã bị từ chối, tải lại để xem";

/** Thân phản hồi phát lại (ADR-0094 đ6 — R2: không lưu thân phản hồi). Gọi với `phat_lai` hoặc `phat_lai_khong_ro`. */
export function thanPhatLai(dong: DongVe, loai: "phat_lai" | "phat_lai_khong_ro"): { status: number; body: unknown } {
  if (loai === "phat_lai" && dong.ma_tra !== null && dong.ma_tra >= 300) {
    return { status: dong.ma_tra, body: { error: { code: dong.ma_loi ?? "error", message: CAU_TU_CHOI_PHAT_LAI } } };
  }
  return { status: 200, body: { da_ghi_truoc_do: true, ket_qua: loai === "phat_lai" ? dong.ket_qua : null } };
}

/**
 * Địa chỉ kết quả được lưu vào `ket_qua` (A-10): CHỈ đường dẫn trang nội bộ chỉ chứa id — `/trang` hoặc `/trang?khoa=<id>`. Mọi thứ khác (tuyệt đối,
 * `//…`, có chữ người dùng, nhiều tham số, `#`) ⇒ null (phát lại chỉ tải lại trang). Giao diện còn qua `safeNext` trước `location.replace` (T19).
 */
const KET_QUA_RE = /^\/[a-z0-9-]+(\?[a-z]+=[A-Za-z0-9-]+)?$/;
export const ketQuaDeLuu = (location: string | null): string | null => (location !== null && KET_QUA_RE.test(location) ? location : null);
