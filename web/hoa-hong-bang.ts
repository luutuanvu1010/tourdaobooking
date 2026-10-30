// Còn lại của bảng hoa hồng cũ: địa chỉ ngừng một dòng mức, thẻ «Các cấp đại lý» dùng. Phần khác đã sang web/hoa-hong-cap.ts / -loai.ts / -doi-tac.ts (Task 8–10); mã chết dọn ở Task 11.
import type { Api } from "./api";

export const urlNgung = (r: Api.CommissionRuleDto): string => `/api/pricing/hoa-hong/${encodeURIComponent(r.id)}/dong`;
