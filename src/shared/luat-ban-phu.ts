// MỘT luật bán có PHỦ một dịch vụ không (ADR-0152 Đ2, ba vế) — luật thuần dùng chung: máy chủ (`chanBan` ở src/modules/pricing/luat-ban-rules.ts) và giao diện
// (cảnh báo «sẽ bỏ chặn / bắt đầu chặn» ở src/shared/dac-diem-hien-thi.ts — ADR-0152 Đ4 mục 2). Một nguồn, không chép tay (src/CLAUDE.md).
// Không xét hiệu lực ngày, không xét bên đặt: nơi gọi lọc luật trước. Dịch vụ chưa khai đặc điểm thì vế 3 không phủ (Đ5). Chỉ so khoá với khoá.

/** Phạm vi của luật: khoá dịch vụ / nhóm / đặc điểm + giá trị (kèm nhóm tuỳ chọn). */
export interface PhamViPhu {
  readonly scope: "SERVICE" | "GROUP" | "ATTRIBUTE";
  readonly catalogCode: string | null;
  readonly groupCode: string | null;
  readonly attributeCode: string | null;
  readonly valueCode: string | null;
}
/** Dịch vụ: mã, nhóm HIỆN HÀNH (`null` = Chưa phân loại / nhóm tắt), giá trị hiệu lực theo đặc điểm (`attributeCode → valueCode`; vắng = chưa khai). */
export interface DichVuPhu {
  readonly code: string;
  readonly nhom: string | null;
  readonly giaTri: ReadonlyMap<string, string>;
}

export function phuDichVu(l: PhamViPhu, d: DichVuPhu): boolean {
  if (l.scope === "SERVICE") return l.catalogCode === d.code;
  if (l.scope === "GROUP") return l.groupCode !== null && l.groupCode === d.nhom;
  if (l.attributeCode === null || l.valueCode === null) return false;
  if (d.giaTri.get(l.attributeCode) !== l.valueCode) return false;
  return l.groupCode === null || l.groupCode === d.nhom;
}
