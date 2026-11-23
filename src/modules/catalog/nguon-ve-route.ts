// Route ô «Vé do ai phát» (ADR-0175 Đ1.2, Đ1.5; theo nhóm ADR-0230 Đ3). Mảng `nguonVeRoutes` được `index.ts` trải vào đầu danh sách, trước `/api/catalog/:code`.
// Quyền: dùng chung ô `catalog.ticket_flag.write` của ô «Có vé» (ADR-0174 Đ4), chặn Đối tác; cổng thật ở thân route. Thân `{ ma, nguon }` đặt cho một dịch vụ,
// `{ nhom, nguon }` đặt cho một nhóm (đang hoạt động); gửi cả hai hoặc không gửi gì → 400. Giá trị của một dịch vụ: dòng riêng, không thì dòng nhóm hiện tại (`nguonVeCua`).
// Khuôn `co-ve-route.ts`: mỗi lần đổi chèn MỘT dòng chỉ-thêm với valid_from_at = max(lúc ghi, mới nhất + 1 ms) cùng nhật ký trong một lô; gửi đúng giá trị đang có
// = 200, không ghi; va UNIQUE → 409 `stale`. Đổi theo giá trị hiện tại (ADR-0174 Đ7 cách (a)): vé đã giữ không đổi.
import { auditStatement } from "../audit";
import { can, holdsPartner } from "../../shared/permissions";
import { error, json, readJson } from "../../shared/http";
import { route, type Route } from "../../shared/router";
import { isNguonVe, nguonVeCua } from "../../shared/nguon-ve";
import type { CatalogNguonVeResponse } from "../../shared/contracts";
import { cauThemNguonVe, cauThemNguonVeNhom, nguonVeHienHanh, nguonVeMoiNhat, nguonVeNhomMoiNhat } from "./nguon-ve-repo";
import { nhomHienHanhTheoMa, nhomTheoMa } from "./nhom-repo";
import { loadAll } from "./repository";

const lanSau = (moiNhat: string | null, now: Date): string => (moiNhat && Date.parse(moiNhat) >= now.getTime() ? new Date(Date.parse(moiNhat) + 1) : now).toISOString();
const NHAN = { HANG_NGOAI: "Vé hãng ngoài", TOUR_DAO: "Vé Tour Đảo" } as const;
const coMa = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const laUnique = (e: unknown): boolean => /UNIQUE/i.test(String((e as Error)?.message ?? e));
const CU = (): Response => error(409, "stale", "Ô Vé do ai phát vừa được đổi. Hãy tải lại rồi thử lại.");

async function docNguonVe(db: D1Database): Promise<CatalogNguonVeResponse> {
  const [hien, items, nhomCua] = await Promise.all([nguonVeHienHanh(db), loadAll(db), nhomHienHanhTheoMa(db)]);
  return {
    dichVu: items.map((i) => {
      const g = nguonVeCua(i.code, nhomCua.get(i.code) ?? null, hien);
      return { ma: i.code, nguon: g.nguonVe, theo: g.theo };
    }),
    nhom: [...hien.nguonNhom].map(([ma, nguon]) => ({ ma, nguon })),
  };
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
    const nhom = b?.nhom;
    const nguon = b?.nguon;
    if (nhom !== undefined) {
      // ADR-0230 Đ3: ô của NHÓM. So với dòng của chính nhóm (chưa đặt = vé hãng ngoài), không so với giá trị gộp của dịch vụ nào.
      if (ma !== undefined || !coMa(nhom) || !isNguonVe(nguon)) return error(400, "invalid_input", "Chọn nhóm và chọn Vé hãng ngoài hoặc Vé Tour Đảo.");
      const g = await nhomTheoMa(env.DB, nhom);
      if (!g || g.active !== 1) return error(400, "invalid_input", "Nhóm này không có hoặc đã tắt.");
      const hien = await nguonVeHienHanh(env.DB);
      if ((hien.nguonNhom.get(nhom) ?? "HANG_NGOAI") !== nguon) {
        const at = lanSau(await nguonVeNhomMoiNhat(env.DB), new Date());
        try {
          await env.DB.batch([
            cauThemNguonVeNhom(env.DB, { id: crypto.randomUUID(), nhom, nguon, at, by: staff.id }),
            auditStatement(env.DB, { staffId: staff.id, action: "ticket_source_group_changed", at, targetType: "catalog", targetId: nhom, detail: `Nhóm ${nhom}: ${NHAN[nguon]}` }),
          ]);
        } catch (e) {
          if (laUnique(e)) return CU();
          throw e;
        }
      }
      return json(await docNguonVe(env.DB));
    }
    if (!coMa(ma) || !isNguonVe(nguon)) return error(400, "invalid_input", "Chọn dịch vụ và chọn Vé hãng ngoài hoặc Vé Tour Đảo.");
    const [hien, items] = await Promise.all([nguonVeHienHanh(env.DB), loadAll(env.DB)]);
    if (!items.some((i) => i.code === ma)) return error(400, "invalid_input", "Mã dịch vụ không có trong danh mục.");
    // Chọn cho MỘT dịch vụ là đặt dòng riêng (ADR-0230 Đ3: dòng riêng thắng nhóm): chỉ bỏ qua khi chính dòng riêng đã mang đúng giá trị đó. KHÔNG so với giá trị gộp —
    // nếu không, dịch vụ đặt «Vé hãng ngoài» lúc giá trị gộp đang là mặc định sẽ không có dòng riêng, rồi đặt nhóm «Vé Tour Đảo» sau đó làm nó lặng lẽ thành vé Tour Đảo
    // (đủ điều kiện mở vé trước tiền, ADR-0230 Đ1). Lượt chấm giao diện 23/11/2026 phát hiện.
    if (hien.nguonDichVu.get(ma) !== nguon) {
      const at = lanSau(await nguonVeMoiNhat(env.DB), new Date());
      try {
        await env.DB.batch([
          cauThemNguonVe(env.DB, { id: crypto.randomUUID(), ma, nguon, at, by: staff.id }),
          auditStatement(env.DB, { staffId: staff.id, action: "ticket_source_changed", at, targetType: "catalog", targetId: ma, detail: `Dịch vụ ${ma}: ${NHAN[nguon]}` }),
        ]);
      } catch (e) {
        if (laUnique(e)) return CU();
        throw e;
      }
    }
    return json(await docNguonVe(env.DB));
  }),
];
