// Thu nhỏ ảnh trên máy người gửi (ADR-0144 đ7; ADR-0196 Đ9): dùng chung cho tệp kèm vé hỗ trợ (web/ho-tro-tep.ts) và ảnh biên lai chuyển khoản (web/order.ts).
// Tệp riêng, KHÔNG import biểu tượng: trang Đơn hàng nhúng tệp này mà không kéo cả bộ của trang Hỗ trợ (trần gói src/goi-trang-nhe.test.ts).
import { CAU_SAI_LOAI, TOI_DA_BYTE, nhanLoaiTep } from "../src/shared/tep-dinh-kem";
import { CHAT_LUONG_JPG, kichThuocThuNho, maBase64 } from "../src/shared/tep-hien-thi";
import { CAU_BIEN_LAI_QUA_CO } from "../src/shared/bien-lai";

export const ACCEPT_ANH_PDF = "image/jpeg,image/png,image/heic,image/heif,.heic,.heif,application/pdf";
const NEN_TRANG = "#ffffff"; // ảnh PNG trong suốt: tô nền trắng trước khi vẽ ra JPG (JPG không có kênh trong suốt)

/**
 * Vẽ lại ảnh qua khung vẽ: cạnh dài ≤ 2000, JPG 0,85 — bỏ luôn toạ độ chụp và mọi siêu dữ liệu. Giải bằng thẻ `<img>` để trình duyệt tự xoay theo
 * hướng chụp. Không giải được (HEIC trên máy tính) / lỗi bất kỳ ⇒ null: người gọi gửi nguyên tệp (không xoá được thông tin ẩn — ADR nói thẳng).
 */
export async function thuNhoAnh(f: Blob, canhDai?: number): Promise<Uint8Array | null> {
  const url = URL.createObjectURL(f);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const { rong, cao } = kichThuocThuNho(img.naturalWidth, img.naturalHeight, canhDai);
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

/**
 * Ảnh biên lai đã chọn (ADR-0196 Đ2, Đ9 — form «Ghi khoản thu»; ADR-0182 phần B — form «Đã chuyển tiền»): đọc, nhận loại theo chữ ký, thu nhỏ ảnh mở được (bỏ thông tin ẩn),
 * mã base64 MỘT lần lúc gửi. HEIC trình duyệt không mở được và PDF: gửi nguyên (không xoá được thông tin ẩn — ADR-0196 Đ9).
 */
export async function chuanBiBienLai(f: File): Promise<{ noiDung: string } | { loi: string }> {
  let bytes: Uint8Array = new Uint8Array(await f.slice(0, 16).arrayBuffer());
  const loai = nhanLoaiTep(bytes);
  if (!loai) return { loi: CAU_SAI_LOAI };
  const nho = loai === "pdf" ? null : await thuNhoAnh(f);
  bytes = nho ?? new Uint8Array(await f.arrayBuffer());
  if (bytes.length > TOI_DA_BYTE) return { loi: CAU_BIEN_LAI_QUA_CO };
  return { noiDung: maBase64(bytes) };
}
