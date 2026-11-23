// Route ô «Hotline trên vé» (ADR-0231). Mảng `soHoTroRoutes` được `index.ts` trải vào đầu danh sách, trước `/api/catalog/:code`.
// Ghi: dùng chung ô `catalog.ticket_flag.write` của ô «Có vé», «Vé do ai phát» (ADR-0174 Đ4, ADR-0175 Đ1.2), chặn Đối tác. Đọc: thêm người giữ `ve.phat-hanh`
// (form Tạo vé điền sẵn số), vẫn chặn Đối tác. Khuôn `nguon-ve-route.ts`: mỗi lần đổi chèn MỘT dòng chỉ-thêm, valid_from_at = max(lúc ghi, mới nhất + 1 ms),
// cùng nhật ký trong một lô; gửi đúng số đang có = 200, không ghi; va UNIQUE → 409 `stale`. Nhật ký KHÔNG chứa số. Lô vé đã tạo không đổi (bản chụp ở `vdt_batch`).
import { auditStatement } from "../audit";
import { can, holdsPartner } from "../../shared/permissions";
import { error, json, readJson } from "../../shared/http";
import { route, type Route } from "../../shared/router";
import { chuanHoaSoHoTro } from "../../shared/so-ho-tro";
import type { CatalogSoHoTroResponse } from "../../shared/contracts";
import { cauThemSoHoTro, soHoTroHienHanh, soHoTroMoiNhat } from "./so-ho-tro-repo";
import { loadAll } from "./repository";

const lanSau = (moiNhat: string | null, now: Date): string => (moiNhat && Date.parse(moiNhat) >= now.getTime() ? new Date(Date.parse(moiNhat) + 1) : now).toISOString();

async function docSoHoTro(db: D1Database): Promise<CatalogSoHoTroResponse> {
  const hienHanh = await soHoTroHienHanh(db);
  return { dichVu: [...hienHanh].map(([ma, so]) => ({ ma, so })).sort((a, b) => a.ma.localeCompare(b.ma)) };
}

export const soHoTroRoutes: Route[] = [
  route("GET", "/api/catalog/so-ho-tro", "office", async ({ env, staff }) => {
    if ((!can(staff, "catalog.ticket_flag.write") && !can(staff, "ve.phat-hanh")) || holdsPartner(staff)) return error(403, "forbidden", "Tài khoản này không xem được ô Hotline trên vé.");
    return json(await docSoHoTro(env.DB));
  }),
  route("POST", "/api/catalog/so-ho-tro", "office", async ({ env, request, staff }) => {
    if (!can(staff, "catalog.ticket_flag.write") || holdsPartner(staff)) return error(403, "forbidden", "Tài khoản này không đổi được ô Hotline trên vé.");
    const b = (await readJson(request)) as Record<string, unknown> | null;
    const ma = b?.ma;
    const vao = b?.so;
    if (typeof ma !== "string" || ma.trim() === "") return error(400, "invalid_input", "Chọn dịch vụ cần đặt hotline trên vé.");
    if (vao !== null && typeof vao !== "string") return error(400, "invalid_input", "Nhập hotline trên vé, hoặc để trống để dùng hotline công ty.");
    let so: string | null = null;
    if (typeof vao === "string" && vao.trim() !== "") {
      const c = chuanHoaSoHoTro(vao);
      if (!c.ok) return error(400, "invalid_input", c.cau);
      so = c.so;
    }
    const [hienHanh, items] = await Promise.all([soHoTroHienHanh(env.DB), loadAll(env.DB)]);
    if (!items.some((i) => i.code === ma)) return error(400, "invalid_input", "Mã dịch vụ không có trong danh mục.");
    if ((hienHanh.get(ma) ?? null) !== so) {
      const at = lanSau(await soHoTroMoiNhat(env.DB), new Date());
      try {
        await env.DB.batch([
          cauThemSoHoTro(env.DB, { id: crypto.randomUUID(), ma, so, at, by: staff.id }),
          auditStatement(env.DB, { staffId: staff.id, action: "ticket_support_phone_changed", at, targetType: "catalog", targetId: ma, detail: so ? `Dịch vụ ${ma}: đặt hotline riêng` : `Dịch vụ ${ma}: dùng hotline công ty` }),
        ]);
      } catch (e) {
        if (/UNIQUE/i.test(String((e as Error)?.message ?? e))) return error(409, "stale", "Ô Hotline trên vé vừa được đổi. Hãy tải lại rồi thử lại.");
        throw e;
      }
    }
    return json(await docSoHoTro(env.DB));
  }),
];
