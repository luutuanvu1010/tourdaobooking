// Route ô «Vé do ai phát» (ADR-0175 Đ1.2, Đ1.5). Mảng `nguonVeRoutes` được `index.ts` trải vào đầu danh sách, trước `/api/catalog/:code`.
// Quyền: dùng chung ô `catalog.ticket_flag.write` của ô «Có vé» (ADR-0174 Đ4), chặn Đối tác; cổng thật ở thân route. Chỉ trên từng dịch vụ, không có ô theo nhóm.
// Khuôn `co-ve-route.ts`: mỗi lần đổi chèn MỘT dòng chỉ-thêm với valid_from_at = max(lúc ghi, mới nhất + 1 ms) cùng nhật ký trong một lô; gửi đúng giá trị đang có
// = 200, không ghi; va UNIQUE → 409 `stale`. Đổi theo giá trị hiện tại (ADR-0174 Đ7 cách (a)): vé đã giữ không đổi.
import { auditStatement } from "../audit";
import { can, holdsPartner } from "../../shared/permissions";
import { error, json, readJson } from "../../shared/http";
import { route, type Route } from "../../shared/router";
import { isNguonVe, nguonVeCua } from "../../shared/nguon-ve";
import type { CatalogNguonVeResponse } from "../../shared/contracts";
import { cauThemNguonVe, nguonVeHienHanh, nguonVeMoiNhat } from "./nguon-ve-repo";
import { loadAll } from "./repository";

const lanSau = (moiNhat: string | null, now: Date): string => (moiNhat && Date.parse(moiNhat) >= now.getTime() ? new Date(Date.parse(moiNhat) + 1) : now).toISOString();
const NHAN = { HANG_NGOAI: "Vé hãng ngoài", TOUR_DAO: "Vé Tour Đảo" } as const;

async function docNguonVe(db: D1Database): Promise<CatalogNguonVeResponse> {
  const [hienHanh, items] = await Promise.all([nguonVeHienHanh(db), loadAll(db)]);
  return { dichVu: items.map((i) => ({ ma: i.code, nguon: nguonVeCua(i.code, hienHanh) })) };
}

export const nguonVeRoutes: Route[] = [
  route("GET", "/api/catalog/nguon-ve", "office", async ({ env, staff }) => {
    if (!can(staff, "catalog.ticket_flag.write") || holdsPartner(staff)) return error(403, "forbidden", "Tài khoản này không xem được ô Vé do ai phát.");
    return json(await docNguonVe(env.DB));
  }),
  route("POST", "/api/catalog/nguon-ve", "office", async ({ env, request, staff }) => {
    if (!can(staff, "catalog.ticket_flag.write") || holdsPartner(staff)) return error(403, "forbidden", "Tài khoản này không đổi được ô Vé do ai phát.");
    const b = (await readJson(request)) as Record<string, unknown> | null;
    const ma = b?.ma;
    const nguon = b?.nguon;
    if (typeof ma !== "string" || ma.trim() === "" || !isNguonVe(nguon)) return error(400, "invalid_input", "Chọn dịch vụ và chọn Vé hãng ngoài hoặc Vé Tour Đảo.");
    const [hienHanh, items] = await Promise.all([nguonVeHienHanh(env.DB), loadAll(env.DB)]);
    if (!items.some((i) => i.code === ma)) return error(400, "invalid_input", "Mã dịch vụ không có trong danh mục.");
    if (nguonVeCua(ma, hienHanh) !== nguon) {
      const at = lanSau(await nguonVeMoiNhat(env.DB), new Date());
      try {
        await env.DB.batch([
          cauThemNguonVe(env.DB, { id: crypto.randomUUID(), ma, nguon, at, by: staff.id }),
          auditStatement(env.DB, { staffId: staff.id, action: "ticket_source_changed", at, targetType: "catalog", targetId: ma, detail: `Dịch vụ ${ma}: ${NHAN[nguon]}` }),
        ]);
      } catch (e) {
        if (/UNIQUE/i.test(String((e as Error)?.message ?? e))) return error(409, "stale", "Ô Vé do ai phát vừa được đổi. Hãy tải lại rồi thử lại.");
        throw e;
      }
    }
    return json(await docNguonVe(env.DB));
  }),
];
