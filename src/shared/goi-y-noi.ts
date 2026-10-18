// Danh sách gợi ý của ô "Nơi đón" / "Nơi trả" bản MỘT ô (Tạo đơn thiết kế lại 18/10/2026, việc 7 — đặc tả docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md mục 3C):
// chạm ô → ô gõ + danh sách ngay dưới; mỗi dòng "tên điểm · loại điểm"; dòng cuối LUÔN là gõ tự do ("Gõ tự do…", đang gõ thì "Gõ tự do: “…”"). Lọc và thứ tự là của ô tìm
// điểm cũ (`locDiem`: bỏ dấu, gộp khoảng trắng, giữ thứ tự danh mục). Thuần, không I/O, CHỈ để hiển thị — không đụng khoá so sánh nơi (`place_key`, `khoaNoi*`).
import { locDiem } from "./loc-diem.ts";

export const NHAN_GO_TU_DO = "Gõ tự do…";

export type DongGoiYNoi =
  | { loai: "diem"; id: string; ten: string; loaiDiem: string; nhan: string }
  | { loai: "chua-chot"; nhan: string }
  | { loai: "tu-do"; chu: string; nhan: string };

/** Nhãn điểm danh mục "<tên> · <loại>" (cách `web/order-form.ts` dựng `DiemChon.nhan`) → tên và loại; không có " · " thì cả nhãn là tên. */
const tach = (nhan: string): { ten: string; loaiDiem: string } => {
  const cat = nhan.lastIndexOf(" · ");
  return cat > 0 ? { ten: nhan.slice(0, cat), loaiDiem: nhan.slice(cat + 3) } : { ten: nhan, loaiDiem: "" };
};

/**
 * Các dòng gợi ý theo chữ đang gõ `kim`: ["Chưa chốt" nếu `coChuaChot`] + điểm khớp (thứ tự danh mục) + dòng gõ tự do. Dòng gõ tự do mang chữ sẽ lưu (`chu` — bỏ khoảng trắng hai
 * đầu, như thân gửi vẫn cắt); `chu` rỗng = người lập chưa gõ gì (giao diện không lưu, chỉ nhắc gõ). Không ghim điểm đang chọn (khác ô chọn cũ: ô gõ không cần giữ giá trị trong danh sách).
 */
export function goiYNoi(ds: readonly { id: string; nhan: string }[], kim: string, o: { coChuaChot: boolean }): DongGoiYNoi[] {
  const chu = kim.trim();
  return [
    ...(o.coChuaChot ? [{ loai: "chua-chot" as const, nhan: "Chưa chốt" }] : []),
    ...locDiem(ds, kim, "").map((d) => ({ loai: "diem" as const, id: d.id, ...tach(d.nhan), nhan: d.nhan })),
    { loai: "tu-do" as const, chu, nhan: chu === "" ? NHAN_GO_TU_DO : `Gõ tự do: “${chu}”` },
  ];
}
