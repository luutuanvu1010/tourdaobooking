// Route ô «Có vé» (ADR-0174 Đ1, Đ4). Mảng `coVeRoutes` được `index.ts` trải vào đầu danh sách, trước `/api/catalog/:code`. Quyền: ô `catalog.ticket_flag.write`, cổng thật ở thân route.
// Khuôn `/api/cai-dat/xac-nhan-don`: mỗi lần đổi chèn MỘT dòng chỉ-thêm với valid_from_at = max(lúc ghi, mới nhất + 1 ms) cùng nhật ký trong một lô; gửi đúng giá trị đang có = 200, không ghi; va UNIQUE → 409 `stale`.
import { auditStatement } from "../audit";
import { can, holdsPartner } from "../../shared/permissions";
import { error, json, readJson } from "../../shared/http";
import { route, type Route } from "../../shared/router";
import { coVeCua } from "../../shared/co-ve";
import type { CatalogCoVeResponse } from "../../shared/contracts";
import { cauThemCoVe, coVeHienHanh, coVeMoiNhat } from "./co-ve-repo";
import { nhomHienHanhTheoMa, nhomTheoMa } from "./nhom-repo";
import { loadAll } from "./repository";

const lanSau = (moiNhat: string | null, now: Date): string => (moiNhat && Date.parse(moiNhat) >= now.getTime() ? new Date(Date.parse(moiNhat) + 1) : now).toISOString();

async function docCoVe(db: D1Database): Promise<CatalogCoVeResponse> {
  const [co, items, nhomCua] = await Promise.all([coVeHienHanh(db), loadAll(db), nhomHienHanhTheoMa(db)]);
  return {
    dichVu: items.map((i) => ({ code: i.code, ...coVeCua(i.code, nhomCua.get(i.code) ?? null, co) })),
    nhom: [...co.coNhom].map(([code, coVe]) => ({ code, coVe })),
  };
}

export const coVeRoutes: Route[] = [
  route("GET", "/api/catalog/co-ve", "office", async ({ env, staff }) => {
    if (!can(staff, "catalog.ticket_flag.write") || holdsPartner(staff)) return error(403, "forbidden", "Tài khoản này không xem được ô Có vé.");
    return json(await docCoVe(env.DB));
  }),
  route("POST", "/api/catalog/co-ve", "office", async ({ env, request, staff }) => {
    if (!can(staff, "catalog.ticket_flag.write") || holdsPartner(staff)) return error(403, "forbidden", "Tài khoản này không đổi được ô Có vé.");
    const b = (await readJson(request)) as Record<string, unknown> | null;
    const pham = b?.pham;
    const ma = b?.ma;
    const coVe = b?.coVe;
    if ((pham !== "SERVICE" && pham !== "GROUP") || typeof ma !== "string" || ma.trim() === "" || typeof coVe !== "boolean") return error(400, "invalid_input", "Chọn dịch vụ hoặc nhóm và bật, tắt ô Có vé.");
    const [co, items, nhomCua] = await Promise.all([coVeHienHanh(env.DB), loadAll(env.DB), nhomHienHanhTheoMa(env.DB)]);
    let dang: boolean | undefined;
    if (pham === "SERVICE") {
      if (!items.some((i) => i.code === ma)) return error(400, "invalid_input", "Mã dịch vụ không có trong danh mục.");
      dang = coVeCua(ma, nhomCua.get(ma) ?? null, co).coVe; // dịch vụ chưa có dòng riêng đang đi theo nhóm: so với giá trị đang hiệu lực, nếu không «Không vé» trong nhóm «Có vé» không ghi được
    } else {
      const nhom = await nhomTheoMa(env.DB, ma);
      if (!nhom || nhom.active !== 1) return error(400, "invalid_input", "Nhóm này không có hoặc đã tắt.");
      dang = co.coNhom.get(ma) ?? false;
    }
    if (dang !== coVe) {
      const now = new Date();
      const at = lanSau(await coVeMoiNhat(env.DB), now);
      try {
        await env.DB.batch([
          cauThemCoVe(env.DB, { id: crypto.randomUUID(), pham, ma, coVe, at, by: staff.id }),
          auditStatement(env.DB, { staffId: staff.id, action: "ticket_flag_changed", at, targetType: "catalog", targetId: ma, detail: `${pham === "SERVICE" ? "Dịch vụ" : "Nhóm"} ${ma}: ${coVe ? "Có vé" : "Không vé"}` }),
        ]);
      } catch (e) {
        if (/UNIQUE/i.test(String((e as Error)?.message ?? e))) return error(409, "stale", "Ô Có vé vừa được đổi. Hãy tải lại rồi thử lại.");
        throw e;
      }
    }
    return json(await docCoVe(env.DB));
  }),
];
