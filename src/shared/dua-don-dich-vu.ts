// Ô «Được đón không» của MỘT dịch vụ (ADR-0149 Đ1): luật riêng thắng cờ «Có đưa đón» của nhóm (ADR-0118), cả hai chiều. Thuần, dùng cả máy chủ và màn Danh mục.
// KHÁC «mẫu đưa đón» (`chang-mac-dinh.ts`: Không đưa đón / Một chiều / Hai chiều) — mẫu chỉ GỢI Ý chặng cho form; ô này quyết dịch vụ CÓ được ghi chặng hay không (Ruling R-0149-A).

/** «Theo nhóm» = không có dòng hiệu lực ở `ctl_service_transfer_rule` (không lưu thành giá trị); ALWAYS / NEVER khớp `CHECK (mode IN …)` của migration. */
export const QUY_TAC_DUA_DON = { GROUP: "Theo nhóm", ALWAYS: "Luôn đón", NEVER: "Không đón" } as const;
export type QuyTacDuaDon = keyof typeof QUY_TAC_DUA_DON;
export const isQuyTacDuaDon = (v: unknown): v is QuyTacDuaDon => typeof v === "string" && Object.hasOwn(QUY_TAC_DUA_DON, v);

/** Chữ nhật ký `catalog_service_transfer_set`: "Theo nhóm → Không đón". */
export const moTaDoiQuyTac = (cu: QuyTacDuaDon, moi: QuyTacDuaDon): string => `${QUY_TAC_DUA_DON[cu]} → ${QUY_TAC_DUA_DON[moi]}`;
