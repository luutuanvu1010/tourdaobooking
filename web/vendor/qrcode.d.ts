// Khai kiểu TỐI THIỂU cho web/vendor/qrcode.js (qrcode-generator, MIT — ADR-0108 đ3). Chỉ phần Nền tảng dùng (web/qr-ve.ts).
export interface QrCode {
  addData(data: string, mode?: "Byte"): void;
  make(): void;
  getModuleCount(): number;
  isDark(row: number, col: number): boolean;
}
declare function qrcode(typeNumber: number, errorCorrectionLevel: "L" | "M" | "Q" | "H"): QrCode;
export default qrcode;
