// ADR-0221 — «Đối tác không nhập nơi đón»: luật THUẦN quanh CHỮ TẠM ở nơi đón của lượt (`NOI_DON_CHUA_GHI`, src/shared/chang-dua-don.ts). Dùng ở máy chủ (lập / lưu nháp, cổng xác nhận,
// Còn vé) và giao diện (bảng Còn vé, nhãn lượt). Tệp RIÊNG, không nằm trong chang-dua-don.ts: tệp đó đi vào gói trang Đơn hàng (bài src/goi-trang-nhe.test.ts canh từng byte), còn luật ở đây
// chỉ các trang lập đơn / chi tiết đơn cần. Không DOM, không I/O; import kèm đuôi .ts. Bài cạnh tệp: noi-don-tam.test.ts.
import { NOI_DON_CHUA_GHI, kiemChang } from "./chang-dua-don.ts";

/**
 * Chữ tạm nay còn sinh ra từ MỘT ĐƯỜNG SỐNG (ADR-0221 Đ2, Đ3): tài khoản giữ quyền Đối tác lập / lưu nháp lượt chiều đi không có nơi đón lúc công tắc «Đối tác không nhập nơi đón» BẬT
 * (`dienNoiDonTam`, chỉ route lập / lưu nháp gọi, sau khi đã kiểm người gọi và công tắc). Văn phòng điền nơi đón thật lúc «Còn vé»; cổng 409 `pickup_place_required` chặn mọi đường xác
 * nhận khi còn lượt MỞ mang chữ tạm (`luotThieuNoiDon`) — xét theo dữ liệu, không theo công tắc.
 */
export const laNoiDonTam = (l: { pickupLocationId: string | null; pickupPlace: string | null }): boolean => l.pickupLocationId === null && l.pickupPlace === NOI_DON_CHUA_GHI;
/** Các lượt (đang mở — nơi gọi đưa vào lượt còn hiệu lực) còn mang chữ tạm ở nơi đón. */
export const luotThieuNoiDon = <T extends { pickupLocationId: string | null; pickupPlace: string | null }>(legs: readonly T[]): T[] => legs.filter(laNoiDonTam);
/** Chữ hiện cho người dùng thay nguyên văn chữ tạm (ADR-0221 Đ3) — cùng chữ với chip dòng gập «Chưa có nơi đón». */
export const CHUA_CO_NOI_DON = "Chưa có nơi đón";
/** Nhãn nơi đón để HIỆN: nhãn là chữ tạm ⇒ «Chưa có nơi đón»; nhãn khác giữ nguyên. Không dùng để so sánh hay ghi. */
export const nhanNoiDon = (nhan: string): string => (nhan === NOI_DON_CHUA_GHI ? CHUA_CO_NOI_DON : nhan);

/**
 * Thân lập / lưu nháp (CHƯA kiểm) → thân MỚI trong đó mỗi lượt `direction: "OUT"` không có `pickupLocationId` và `pickupPlace` rỗng (vắng, null, chuỗi toàn khoảng trắng) được điền
 * `pickupPlace = NOI_DON_CHUA_GHI`. Mọi thứ khác giữ nguyên (chiều về, lượt có nơi, giá trị sai kiểu, thân không có `legs`) để `kiemChang` xét như trước. Không sửa đầu vào.
 * KHÔNG tự kiểm người gọi hay công tắc: route chỉ gọi khi `holdsPartner(người gọi)` VÀ công tắc bật.
 */
export function dienNoiDonTam(than: unknown): unknown {
  if (!than || typeof than !== "object" || Array.isArray(than)) return than;
  const t = than as Record<string, unknown>;
  if (!Array.isArray(t.services)) return than;
  const rong = (v: unknown): boolean => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
  return {
    ...t,
    services: t.services.map((s: unknown) => {
      if (!s || typeof s !== "object" || Array.isArray(s) || !Array.isArray((s as Record<string, unknown>).legs)) return s;
      const sv = s as Record<string, unknown>;
      return {
        ...sv,
        legs: (sv.legs as unknown[]).map((l) => {
          if (!l || typeof l !== "object" || Array.isArray(l)) return l;
          const r = l as Record<string, unknown>;
          return r.direction === "OUT" && rong(r.pickupLocationId) && rong(r.pickupPlace) ? { ...r, pickupPlace: NOI_DON_CHUA_GHI } : l;
        }),
      };
    }),
  };
}


/**
 * ADR-0221 Đ3: nơi đón văn phòng ghi lúc «Còn vé» cho lượt đang mang chữ tạm — ĐÚNG MỘT trong hai (điểm danh mục hoặc chữ 1–200 ký tự). Kiểm bằng CHÍNH luật nơi của `kiemChang`
 * (một luật một nơi: dựng lượt chiều đi chỉ có nơi đón rồi hỏi `kiemChang`); chữ tạm không phải nơi đón thật nên bị từ chối. Điểm danh mục có đang dùng không là việc của route
 * (đọc `v_loc_location_label`).
 */
export function kiemNoiDonGhi(raw: unknown): { ok: true; id: string | null; place: string | null } | { ok: false; message: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Nơi đón không hợp lệ." };
  const r = raw as Record<string, unknown>;
  const k = kiemChang({ direction: "OUT", pickupLocationId: r.pickupLocationId, pickupPlace: r.pickupPlace }, { at: "Lượt đưa đón", departDate: null });
  if (!k.ok) return k;
  if (k.value.pickupPlace === NOI_DON_CHUA_GHI) return { ok: false, message: "Lượt đưa đón: cần nơi đón (chọn điểm có sẵn hoặc gõ nơi đón)." };
  return { ok: true, id: k.value.pickupLocationId, place: k.value.pickupPlace };
}
