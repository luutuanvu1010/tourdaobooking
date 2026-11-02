// Khai kiểu TỐI THIỂU cho web/vendor/jsqr.cjs (jsqr, Apache-2.0 — ADR-0156 Đ4). Chỉ phần Nền tảng dùng (web/qr-doc-ve.ts).
interface KetQuaQr {
  data: string;
}
declare function jsQR(data: Uint8ClampedArray, width: number, height: number): KetQuaQr | null;
export = jsQR;
