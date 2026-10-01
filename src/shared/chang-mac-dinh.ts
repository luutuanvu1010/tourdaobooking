// MẪU CHẶNG → chặng GỢI Ý của một dịch vụ (ADR-0054 D10.2 — đã duyệt; ADR nháp nơi trả mặc định docs/superpowers/specs/2026-10-01-de-xuat-adr-noi-tra-mac-dinh.md
// D3 — chủ duyệt 1/10 Q-D = A). Luật THUẦN dùng chung cho form lập đơn (giao diện làm sau — chờ bản vẽ). Máy chủ KHÔNG gọi hàm này khi lưu đơn: mẫu chỉ là gợi
// ý, người lập thêm / bỏ / sửa tay được; máy chủ lưu đúng cái người lập gửi (D10.2 "tự tạo ở máy chủ thì chặng người lập đã bỏ sẽ bị tạo lại"; NT-D5).
import type { LegInput } from "./contracts.ts";

/** Chế độ đưa đón của dịch vụ — tập ĐÓNG, khớp `CHECK (mode IN …)` của 0058. Nhãn tiếng Việt cho màn Danh mục. */
export const CHE_DO_DUA_DON = { NONE: "Không đưa đón", ONE_WAY: "Một chiều", ROUND_TRIP: "Hai chiều" } as const;
export type CheDoDuaDon = keyof typeof CHE_DO_DUA_DON;
export const isCheDoDuaDon = (v: unknown): v is CheDoDuaDon => typeof v === "string" && Object.hasOwn(CHE_DO_DUA_DON, v);

/** Mẫu HIỆN HÀNH của một dịch vụ (route `GET /api/van-chuyen/mau-chang`). `noiTraMacDinh` null = chưa cài / điểm đã ngưng. */
export interface MauChang {
  mode: CheDoDuaDon;
  /** Giờ đón gợi ý chiều về (HH:MM) — chỉ khi hai chiều. */
  returnTimeHint: string | null;
  noiTraMacDinh: { id: string; ten: string } | null;
}

/**
 * Chặng gợi ý cho MỘT dịch vụ: `null` (không có dòng mẫu) hoặc NONE → 0 chặng; ONE_WAY → chặng đi; ROUND_TRIP → chặng đi + chặng về.
 * - Chặng đi: nơi đón = nơi đón khách người lập đã gõ / chọn (`noiDon`, có thể trống); nơi trả = điểm mặc định (nếu có).
 * - Chặng về (D10.2): nơi đón = nơi trả chiều đi (điểm mặc định), nơi trả = nơi đón chiều đi; giờ = giờ gợi ý hoặc trống.
 * Ngày đón để trống — máy chủ điền ngày đi khi lưu (R4b). Không gửi số hiệu / số người (form thêm khi người lập nhập).
 */
export function changMacDinh(mau: MauChang | null, noiDon: { pickupLocationId: string | null; pickupPlace: string }): LegInput[] {
  if (mau === null || mau.mode === "NONE") return [];
  const diem = mau.noiTraMacDinh?.id ?? null;
  const di: LegInput = {
    direction: "OUT", pickupDate: "", pickupTime: "", pickupLocationId: noiDon.pickupLocationId, pickupPlace: noiDon.pickupLocationId ? "" : noiDon.pickupPlace,
    dropoffLocationId: diem, dropoffPlace: "",
  };
  if (mau.mode === "ONE_WAY") return [di];
  const ve: LegInput = {
    direction: "RETURN", pickupDate: "", pickupTime: mau.returnTimeHint ?? "", pickupLocationId: diem, pickupPlace: "",
    dropoffLocationId: di.pickupLocationId, dropoffPlace: di.pickupLocationId ? "" : di.pickupPlace,
  };
  return [di, ve];
}
