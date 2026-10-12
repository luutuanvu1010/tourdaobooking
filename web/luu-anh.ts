// Lưu / chia sẻ một ảnh PNG (QR thanh toán — đặc tả QR §4.2): máy hỗ trợ chia sẻ tệp (iPhone) thì mở bảng chia sẻ, không thì tải về bằng liên kết `blob:`.
// Gọi NGAY trong lần bấm (ảnh dựng sẵn trước đó): iOS chỉ cho mở bảng chia sẻ trong cử chỉ của người dùng. Không đụng confirmation-dialog.ts (tránh phải chạy lại
// kịch bản ảnh xác nhận).
import { h } from "./dom";

/** Tệp chia sẻ được, hoặc null (trình duyệt không có `File` / `canShare` / `share`, hoặc `canShare` ném lỗi) ⇒ rơi sang đường tải về — cùng khuôn `shareFile` của confirmation-dialog.ts. */
function tepChiaSeDuoc(blob: Blob, tenTep: string): File | null {
  try {
    if (typeof navigator.canShare !== "function" || typeof navigator.share !== "function") return null;
    const tep = new File([blob], tenTep, { type: "image/png" });
    return navigator.canShare({ files: [tep] }) ? tep : null;
  } catch {
    return null;
  }
}

export async function luuHoacChiaSe(blob: Blob, tenTep: string, tieuDe: string, noiChua: HTMLElement): Promise<"chia-se" | "tai" | "huy"> {
  const tep = tepChiaSeDuoc(blob, tenTep);
  if (tep) {
    try {
      await navigator.share({ files: [tep], title: tieuDe });
      return "chia-se";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "huy";
      // chia sẻ hỏng (không phải người dùng huỷ) ⇒ tải về
    }
  }
  const url = URL.createObjectURL(blob);
  const a = h("a", { href: url, download: tenTep, hidden: true }) as HTMLAnchorElement;
  noiChua.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "tai";
}
