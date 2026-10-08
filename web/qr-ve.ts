// Vẽ mã QR thanh toán (ADR-0108 đ3; đặc tả QR §4.2, §7): trình duyệt CHỈ vẽ ma trận từ chuỗi máy chủ trả — không tự dựng payload, không gọi mạng. Mức sửa lỗi M,
// phiên bản tự chọn. Mã luôn ĐEN trên TRẮNG (điều kiện quét được của ứng dụng ngân hàng — không theo tông giao diện, nên không lấy màu từ token CSS).
import type { Api } from "./api";
import { h } from "./dom";
import qrcode from "./vendor/qrcode.js";
import { dongThongTinQr } from "../src/shared/qr-thong-tin";

const DEN = "#000000";
const TRANG = "#ffffff";
/** Vùng lề trắng quanh mã: 4 ô (chuẩn QR). */
const LE_O = 4;

export function veMaQr(canvas: HTMLCanvasElement, payload: string, canhPx = 560): void {
  const qr = qrcode(0, "M");
  qr.addData(payload, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  const o = Math.max(1, Math.floor(canhPx / (n + 2 * LE_O)));
  const canh = o * (n + 2 * LE_O);
  canvas.width = canh;
  canvas.height = canh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = TRANG;
  ctx.fillRect(0, 0, canh, canh);
  ctx.fillStyle = DEN;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + LE_O) * o, (r + LE_O) * o, o, o);
}

/** Cắt một dòng chữ cho vừa bề ngang (theo từ). */
function catDong(ctx: CanvasRenderingContext2D, chu: string, rong: number): string[] {
  const out: string[] = [];
  let dong = "";
  for (const tu of chu.split(" ")) {
    const thu = dong ? `${dong} ${tu}` : tu;
    if (ctx.measureText(thu).width <= rong || !dong) dong = thu;
    else {
      out.push(dong);
      dong = tu;
    }
  }
  if (dong) out.push(dong);
  return out;
}

/** Ảnh PNG gửi khách: mã QR + ĐÚNG các dòng của `dongThongTinQr` (danh sách trắng — không thêm trường nào từ màn đơn). */
export async function dungAnhQr(dto: Api.QrThanhToanDto): Promise<Blob> {
  const RONG = 720;
  const LE = 40;
  const CO_CHU = 28;
  const DONG_CAO = 40;
  try {
    await document.fonts.ready;
  } catch {
    // phông chưa sẵn thì vẽ bằng phông dự phòng
  }
  const font = `500 ${CO_CHU}px ${getComputedStyle(document.body).fontFamily || "sans-serif"}`;
  const ma = h("canvas", null) as HTMLCanvasElement;
  veMaQr(ma, dto.payload, RONG - 2 * LE);
  const anh = h("canvas", null) as HTMLCanvasElement;
  const ctx = anh.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không vẽ được ảnh.");
  ctx.font = font;
  const cacDong = dongThongTinQr(dto).flatMap((d) => catDong(ctx, d, RONG - 2 * LE));
  anh.width = RONG;
  anh.height = LE + ma.height + 24 + cacDong.length * DONG_CAO + LE;
  ctx.fillStyle = TRANG;
  ctx.fillRect(0, 0, anh.width, anh.height);
  ctx.drawImage(ma, Math.round((RONG - ma.width) / 2), LE);
  ctx.fillStyle = DEN;
  ctx.font = font; // đổi kích thước canvas làm mất font đã đặt
  ctx.textBaseline = "top";
  cacDong.forEach((d, i) => ctx.fillText(d, LE, LE + ma.height + 24 + i * DONG_CAO));
  return new Promise((ok, loi) => anh.toBlob((b) => (b ? ok(b) : loi(new Error("Không mã hoá được ảnh PNG."))), "image/png"));
}
