// Vẽ ảnh vé Tour Đảo (ADR-0175 Đ1.7): PNG dọc 1080 × 1920, nền trắng phẳng, QR đen trên trắng ở nửa trên, chữ hai thứ tiếng.
// Vị trí từng phần do luật thuần `src/shared/ve-anh-tour-dao-bo-cuc` tính (có bài kiểm); tệp này chỉ nạp phông, logo, màu token rồi vẽ.
// Mã vé là bí mật: chỉ đi vào ma trận QR, không vào chữ (chỉ 4 ký tự cuối), không ghi console.
import { boCucVeTourDao, type MauVe, type NhomLo } from "../src/shared/ve-anh-tour-dao-bo-cuc";
import { h } from "./dom";
import { soOMaQr, veMaQr } from "./qr-ve";

/** Nền vé và nền mã luôn trắng (in đen trắng, quét ngoài nắng) — không theo tông giao diện, như `web/qr-ve.ts`. */
const TRANG = "#ffffff";
const LOGO_URL = "/icons/icon-192.png";
const HAN_NAP_MS = 8_000;
const DO_DAM = [500, 600, 700];

const hoPhong = (chong: string): string[] => chong.split(",").map((x) => x.trim().replace(/^["']|["']$/g, "")).filter((x) => x !== "");

/** Màu và phông đọc từ token `:root` (cùng nguồn với ảnh biên nhận). Thiếu token thì báo lỗi, không có màu dự phòng cứng. */
function docToken(): { mau: Record<MauVe, string>; phong: string } {
  const s = getComputedStyle(document.documentElement);
  const doc = (ten: string): string => {
    const v = s.getPropertyValue(ten).trim();
    if (v === "") throw new Error(`Thiếu token ${ten} để vẽ vé.`);
    return v;
  };
  return { mau: { chinh: doc("--c-primary"), chu: doc("--c-text"), phu: doc("--c-text-muted") }, phong: doc("--font") };
}

/** Chờ phông nạp xong kèm đúng chữ sẽ vẽ (tập con tiếng Việt). Quá hạn thì vẽ bằng phông dự phòng của máy, không kẹt cả lô. */
async function napPhong(chong: string, mau: string): Promise<void> {
  if (!("fonts" in document)) return;
  let hen: ReturnType<typeof setTimeout> | undefined;
  try {
    const xong = Promise.all(hoPhong(chong).flatMap((ho) => DO_DAM.map((d) => document.fonts.load(`${d} 16px "${ho}"`, mau)))).then(() => document.fonts.ready);
    await Promise.race([xong, new Promise<void>((ok) => (hen = setTimeout(ok, HAN_NAP_MS)))]);
  } catch {
    // phông chưa sẵn thì vẽ bằng phông dự phòng
  } finally {
    clearTimeout(hen);
  }
}

let logoHua: Promise<HTMLImageElement | null> | null = null;
/** Logo cùng nguồn, nạp một lần cho cả lô; hỏng thì vé vẫn ra, chỉ thiếu logo. */
function napLogo(): Promise<HTMLImageElement | null> {
  logoHua ??= (async () => {
    try {
      const img = new Image();
      img.src = LOGO_URL;
      await Promise.race([img.decode(), new Promise((_, loi) => setTimeout(() => loi(new Error("logo")), HAN_NAP_MS))]);
      return img;
    } catch {
      return null;
    }
  })();
  return logoHua;
}

export interface VeTourDaoVao { tenCongTy: string; hotline: string; tenDichVu: string; tenDichVuEn: string | null; nhomKhach: NhomLo; denNgay: string; ma: string }

export async function veAnhTourDao(m: VeTourDaoVao): Promise<Blob> {
  const { mau, phong } = docToken();
  const font = (dam: number, px: number): string => `${dam} ${px}px ${phong}`;
  await napPhong(phong, [...new Set(`${m.tenCongTy}${m.tenDichVu}${m.tenDichVuEn ?? ""}Vé dịch vụ Người lớn Trẻ em Cao tuổi Mọi loại khách Dùng vào ngày đi đã đặt. Hạn cuối Mỗi vé dùng một lần. Xuất trình mã cho nhân viên Tour Đảo. Vé này không phải hóa đơn. Hotline Số vé …0123456789/`)].join(""));
  const logo = await napLogo();

  const anh = h("canvas", null) as HTMLCanvasElement;
  const ctx = anh.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không vẽ được ảnh vé.");
  const doChu = (chu: string, px: number, dam: number): number => { ctx.font = font(dam, px); return ctx.measureText(chu).width; };
  const b = boCucVeTourDao(m, soOMaQr(m.ma), doChu);

  anh.width = b.rong;
  anh.height = b.cao; // đổi kích thước canvas xoá mọi trạng thái đã đặt
  ctx.fillStyle = TRANG;
  ctx.fillRect(0, 0, b.rong, b.cao);
  for (const v of b.vach) { ctx.fillStyle = mau[v.mau]; ctx.fillRect(v.x, v.y, v.rong, v.cao); }
  if (logo) ctx.drawImage(logo, b.logo.x, b.logo.y, b.logo.canh, b.logo.canh);

  const ma = h("canvas", null) as HTMLCanvasElement;
  veMaQr(ma, m.ma, b.qr.canh);
  if (ma.width !== b.qr.canh) throw new Error("Mã QR vẽ sai cỡ.");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(ma, b.qr.x, b.qr.y);

  ctx.textBaseline = "alphabetic";
  for (const d of b.dong) {
    ctx.font = font(d.dam, d.coPx);
    ctx.fillStyle = mau[d.mau];
    ctx.textAlign = d.canh;
    ctx.fillText(d.chu, d.x, d.y);
  }
  // iOS trả canvas trống khi vẽ hỏng: hai góc đã tô kín nên phải đặc.
  const goc = (x: number, y: number): number => ctx.getImageData(x, y, 1, 1).data[3] ?? 0;
  if (goc(0, b.cao - 1) !== 255 || goc(b.rong - 1, b.cao - 1) !== 255) throw new Error("Trình duyệt trả ảnh vé trống.");
  return new Promise((ok, loi) => anh.toBlob((x) => (x ? ok(x) : loi(new Error("Không mã hoá được ảnh vé PNG."))), "image/png"));
}
