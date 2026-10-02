// Luật thuần của module giao-dien: dòng chi tiết nhật ký `giao_dien_changed` (ADR-0087 điều 6). Không D1, không import module khác.
import { NUM } from "../../shared/giao-dien.ts";

const NHAN = new Map(NUM.map((n) => [n.khoa, n.nhan] as const));

/** Chi tiết nhật ký: "Nền thanh trên: #ffffff → #0c4a6e; Phông nội dung: mặc định → nunito". Chỉ khoá + giá trị (không dữ liệu cá nhân). */
export function chiTietDoi(cu: Readonly<Record<string, string>>, moi: Readonly<Record<string, string>>): string {
  const khoa = [...new Set([...Object.keys(cu), ...Object.keys(moi)])].filter((k) => cu[k] !== moi[k]).sort();
  if (khoa.length === 0) return "Không đổi";
  return khoa.map((k) => `${NHAN.get(k) ?? k}: ${cu[k] ?? "mặc định"} → ${moi[k] ?? "mặc định"}`).join("; ");
}
