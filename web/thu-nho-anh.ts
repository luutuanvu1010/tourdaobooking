// Thu nhỏ ảnh trên máy người gửi (ADR-0144 đ7; ADR-0196 Đ9): dùng chung cho tệp kèm vé hỗ trợ (web/ho-tro-tep.ts) và ảnh biên lai chuyển khoản (web/order.ts).
// Tệp riêng, KHÔNG import biểu tượng: trang Đơn hàng nhúng tệp này mà không kéo cả bộ của trang Hỗ trợ (trần gói src/goi-trang-nhe.test.ts).
import { nhanLoaiTep } from "../src/shared/tep-dinh-kem";
import { CHAT_LUONG_JPG, kichThuocThuNho } from "../src/shared/tep-hien-thi";

export const ACCEPT_ANH_PDF = "image/jpeg,image/png,image/heic,image/heif,.heic,.heif,application/pdf";
const NEN_TRANG = "#ffffff"; // ảnh PNG trong suốt: tô nền trắng trước khi vẽ ra JPG (JPG không có kênh trong suốt)

/**
 * Vẽ lại ảnh qua khung vẽ: cạnh dài ≤ 2000, JPG 0,85 — bỏ luôn toạ độ chụp và mọi siêu dữ liệu. Giải bằng thẻ `<img>` để trình duyệt tự xoay theo
 * hướng chụp. Không giải được (HEIC trên máy tính) / lỗi bất kỳ ⇒ null: người gọi gửi nguyên tệp (không xoá được thông tin ẩn — ADR nói thẳng).
 */
export async function thuNhoAnh(f: Blob): Promise<Uint8Array | null> {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const { rong, cao } = kichThuocThuNho(img.naturalWidth, img.naturalHeight);
    if (!rong || !cao) return null;
    const c = document.createElement("canvas");
    c.width = rong;
    c.height = cao;
    const g = c.getContext("2d");
    if (!g) return null;
    g.fillStyle = NEN_TRANG;
    g.fillRect(0, 0, rong, cao);
    g.drawImage(img, 0, 0, rong, cao);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", CHAT_LUONG_JPG));
    if (!blob) return null;
    const ra = new Uint8Array(await blob.arrayBuffer());
    return nhanLoaiTep(ra.subarray(0, 16)) === "jpg" ? ra : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
