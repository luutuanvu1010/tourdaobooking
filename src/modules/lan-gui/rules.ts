// Luật của module lan-gui có dùng KHOÁ BÍ MẬT (ADR-0094 đ4): kiểm cấu hình khoá và vân tay nội dung HMAC-SHA-256. Không đọc env, không I/O ngoài
// `crypto.subtle`. Luật thuần không cần khoá (dạng vé, phân loại phát lại, thân phát lại) ở src/shared/lan-gui-luat.ts — router dùng chúng.

/** Độ dài tối thiểu của LAN_GUI_SECRET (như SESSION_SECRET). */
export const MIN_LAN_GUI_SECRET = 32;

/** Trả thông báo lỗi cho log (→ router trả 500 server_misconfigured cho mọi API) hoặc null. Không bao giờ in giá trị khoá. */
export function kiemCauHinhLanGui(secret: unknown): string | null {
  if (typeof secret !== "string" || secret.length === 0) return "Thiếu LAN_GUI_SECRET (wrangler secret put LAN_GUI_SECRET).";
  if (secret.length < MIN_LAN_GUI_SECRET) return `LAN_GUI_SECRET quá ngắn (${secret.length} < ${MIN_LAN_GUI_SECRET} ký tự).`;
  return null;
}

/** Khoá HMAC đã nhập, nhớ theo isolate (mỗi khoá bí mật nhập một lần). */
const khoaDaNhap = new Map<string, Promise<CryptoKey>>();
function khoaHmac(secret: string): Promise<CryptoKey> {
  let k = khoaDaNhap.get(secret);
  if (!k) {
    k = crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    khoaDaNhap.set(secret, k);
  }
  return k;
}

/**
 * Vân tay nội dung (đặc tả §3.3 bước 2): HMAC-SHA-256(khoá, phương thức + "\n" + đường dẫn thật kèm query + "\n" + thân THÔ đúng từng byte). Không dùng mã
 * băm trơn: thân có PIN / số giấy tờ thì mã băm trơn dò ngược được. Kết quả hex 64 ký tự.
 */
export async function vanTay(secret: string, method: string, duongDanThat: string, than: string): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await khoaHmac(secret), new TextEncoder().encode(`${method}\n${duongDanThat}\n${than}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
