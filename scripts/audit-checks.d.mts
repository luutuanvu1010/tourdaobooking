// Khai kiểu cho scripts/audit-checks.mjs — để gốc lắp ráp src/index.ts tiêm vào soát tiền hằng ngày (src/modules/audit/soat-tien-hang-ngay.ts, Đợt 2 sau kiểm toán) — dùng CHÍNH danh sách kiểm của script soát (một nguồn,
// không chép câu SQL sang src/). Chỉ khai phần máy chủ đọc.
export interface KiemBatBien {
  readonly code: string;
  readonly what: string;
  readonly sql: string;
  readonly level: "fail" | "warn-unless-strict" | "warn";
  readonly note?: string;
  readonly mode?: "rows";
  readonly dem?: (rows: object[]) => number;
}
export const CHECKS: readonly KiemBatBien[];
export const GHI_CHU: readonly { readonly code: string; readonly text: string }[];
export function demViPham(check: KiemBatBien, rows: object[]): number;
