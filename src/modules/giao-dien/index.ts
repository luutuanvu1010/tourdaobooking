// Module giao-dien — giao diện công ty do Toàn quyền chỉnh (ADR-0087). Sở hữu `gd_setting`. Luật thuần ở src/shared/giao-dien.ts (dùng chung màn chỉnh).
// Route: GET/PUT /api/giao-dien (cổng admin + ô settings.ops = chỉ Toàn quyền); GET /giao-dien.css (+ đường cũ /api/giao-dien.css; ADR-0102) (CÔNG KHAI — trang Đăng nhập cần trước khi có phiên;
// chỉ chứa màu/phông/cỡ, không dữ liệu cá nhân). Phụ thuộc: chỉ `audit`.
import { auditStatement } from "../audit";
import type { ChinhSachGiaoDienDto, ChinhSachGiaoDienTatCaDto, GiaoDienDto } from "../../shared/contracts";
import { docTokensDaLuu, dungCss, kiemGiaoDien } from "../../shared/giao-dien";
import { css, error, json, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { PERMISSION_CODES } from "../../shared/permissions";
import { DANH_MUC_UI, MAN_UI, giaiChinhSach, type TruongDaGiai } from "../../shared/ui-truong";
import { chiTietChinhSach, chiTietDoi, dongHopLe, kiemYeuCauChinhSach } from "./rules";
import { chinhSachHieuLuc, chinhSachMoiNhat, findGiaoDien, themChinhSach, updateGiaoDienStatement } from "./repository";

const lanSau = (moiNhat: string | null, now: Date): string => (moiNhat && Date.parse(moiNhat) >= now.getTime() ? new Date(Date.parse(moiNhat) + 1) : now).toISOString();

/**
 * Phần chính sách giao diện ÁP CHO MỘT NGƯỜI (hợp của mọi quyền — ADR-0194; luật thuần `giaiChinhSach`). Hàm công bố cho gốc lắp ráp tiêm vào `ctx` của `orders`
 * (`orders` không import `giao-dien`). Bảng rỗng ⇒ []. MỘT truy vấn D1 mỗi lần gọi; lỗi đọc thì ném — nơi gọi quyết (máy chủ lập đơn: không đoán «không ẩn gì»).
 */
export async function chinhSachChoNguoi(db: D1Database, quyen: readonly string[], luc: string = new Date().toISOString()): Promise<TruongDaGiai[]> {
  return giaiChinhSach(await chinhSachHieuLuc(db, luc), quyen);
}

async function docTatCa(db: D1Database): Promise<ChinhSachGiaoDienTatCaDto> {
  const dong = dongHopLe(await chinhSachHieuLuc(db, new Date().toISOString()));
  return { danhMuc: DANH_MUC_UI.map((m) => ({ man: m.man, truong: m.truong, loai: m.loai, anDuoc: m.anDuoc, boBatBuocDuoc: m.boBatBuocDuoc })), dong, quyen: [...PERMISSION_CODES] };
}

async function phucVuCss({ env, request }: { env: Env; request: Request }): Promise<Response> {
  const row = await findGiaoDien(env.DB);
  const version = row?.version ?? 0;
  const etag = `"v${version}"`;
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag, "cache-control": "no-cache" } });
  return css(dungCss(row ? docTokensDaLuu(row.tokens) : {}), 200, { etag });
}

export const giaoDienModule: AppModule = {
  name: "giao-dien",
  routes: [
    // ADR-0102: đường MỚI `/giao-dien.css` (ngoài /api) để service worker đệm "dùng ngay, làm mới ở nền" — trang không còn chờ mạng + D1 trước khi vẽ. Đường cũ
    // `/api/giao-dien.css` GIỮ nguyên thân cho trang đã đệm từ trước khi đổi (service worker không bao giờ đệm /api/*).
    route("GET", "/giao-dien.css", "public", async (c) => {
      return phucVuCss(c);
    }),
    route("GET", "/api/giao-dien.css", "public", async (c) => {
      return phucVuCss(c);
    }),

    route("GET", "/api/giao-dien", "admin", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được xem cài đặt giao diện.");
      const row = await findGiaoDien(env.DB);
      return json({ tokens: row ? docTokensDaLuu(row.tokens) : {}, version: row?.version ?? 0 } satisfies GiaoDienDto);
    }),

    route("PUT", "/api/giao-dien", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được đổi giao diện.");
      const body = await readJson(request);
      const version = body?.version;
      if (!body || !Number.isInteger(version)) return error(400, "invalid_input", "Thiếu phiên bản giao diện đang xem — tải lại trang.");
      const loi = kiemGiaoDien(body.tokens);
      if (loi.length > 0) return json({ error: { code: "invalid_input", message: loi.map((l) => l.message).join(" "), loi } }, 400);
      const tokens = body.tokens as Record<string, string>;
      const db = env.DB;
      const cu = await findGiaoDien(db);
      if (!cu || cu.version !== version) return error(409, "stale", "Giao diện vừa được người khác đổi — tải lại để xem bản mới.");
      const at = new Date().toISOString();
      const [upd] = await db.batch([
        updateGiaoDienStatement(db, { tokens: JSON.stringify(tokens), at, by: staff.id, version: version as number }),
        auditStatement(db, { staffId: staff.id, action: "giao_dien_changed", at, targetType: "system", targetId: "giao-dien", detail: chiTietDoi(docTokensDaLuu(cu.tokens), tokens) }, "changes() > 0"),
      ]);
      if (!upd || upd.meta.changes === 0) return error(409, "stale", "Giao diện vừa được người khác đổi — tải lại để xem bản mới.");
      return json({ tokens, version: (version as number) + 1 } satisfies GiaoDienDto);
    }),
    // ---- Chính sách hiện / ẩn / bắt buộc theo màn × trường × quyền (ADR-0194 đợt 1) — khuôn `/api/cai-dat/an-thong-tin-khach` ----
    // ĐỌC phần áp cho CHÍNH người gọi: cổng `staff` (mọi tài khoản đăng nhập, kể cả Đối tác — form của họ cũng đọc); `no-store`. Ẩn nhầm không chặn lập đơn: trường luật nền cần không khai ẩn được.
    route("GET", "/api/cai-dat/giao-dien", "staff", async ({ env, staff }) => {
      return json({ truong: await chinhSachChoNguoi(env.DB, staff.permissions) } satisfies ChinhSachGiaoDienDto);
    }),
    route("GET", "/api/cai-dat/giao-dien/tat-ca", "admin", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền xem cài đặt hiển thị trường.");
      return json(await docTatCa(env.DB));
    }),
    // GHI: một lô cho MỘT màn; cả lô hợp lệ mới ghi (một dòng xấu ⇒ 400, không ghi). Ô đã đúng chế độ thì bỏ qua (không dòng, không nhật ký). MỘT db.batch: dòng mới chỉ-thêm + nhật ký.
    route("POST", "/api/cai-dat/giao-dien", "admin", async ({ env, request, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền đổi cài đặt hiển thị trường.");
      const k = kiemYeuCauChinhSach(await readJson(request));
      if (!k.ok) return error(400, "invalid_input", k.message);
      const hien = new Map((await chinhSachHieuLuc(env.DB, new Date().toISOString())).map((d) => [`${d.man}/${d.truong}/${d.quyen}`, d.cheDo] as const));
      const canGhi = k.dong.filter((d) => (hien.get(`${k.man}/${d.truong}/${d.quyen}`) ?? "HIEN") !== d.cheDo);
      return ghiLo(env.DB, staff.id, k.man, canGhi);
    }),
    // Khôi phục mặc định MỘT màn: chèn dòng HIEN cho mọi ô đang khác mặc định của đúng màn đó (không động màn khác).
    route("POST", "/api/cai-dat/giao-dien/khoi-phuc", "admin", async ({ env, request, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền đổi cài đặt hiển thị trường.");
      const b = (await readJson(request)) as { man?: unknown } | null;
      if (!b || typeof b.man !== "string" || !(MAN_UI as readonly string[]).includes(b.man)) return error(400, "invalid_input", "Màn hình không có trong danh mục chỉnh được.");
      const man = b.man;
      const khac = (await chinhSachHieuLuc(env.DB, new Date().toISOString())).filter((d) => d.man === man && d.cheDo !== "HIEN");
      return ghiLo(env.DB, staff.id, man, khac.map((d) => ({ truong: d.truong, quyen: d.quyen, cheDo: "HIEN" })));
    }),
  ],
};

/** Ghi một lô dòng chỉ-thêm + nhật ký; lô rỗng ⇒ không ghi gì, trả trạng thái hiện tại. Thua mốc (cùng ô, cùng mili-giây) ⇒ 409 `stale`. */
async function ghiLo(db: D1Database, by: string, man: string, dong: readonly { truong: string; quyen: string; cheDo: string }[]): Promise<Response> {
  if (dong.length > 0) {
    const at = lanSau(await chinhSachMoiNhat(db), new Date());
    try {
      await db.batch([
        ...dong.map((d) => themChinhSach(db, { id: crypto.randomUUID(), man, truong: d.truong, quyen: d.quyen, cheDo: d.cheDo, at, by })),
        auditStatement(db, { staffId: by, action: "ui_policy_changed", at, targetType: "system", detail: chiTietChinhSach(man, dong) }),
      ]);
    } catch (e) {
      if (/UNIQUE constraint failed: gd_field_policy/i.test(String((e as Error)?.message ?? e))) return error(409, "stale", "Cài đặt vừa được đổi — tải lại rồi thử lại.");
      throw e;
    }
  }
  return json(await docTatCa(db));
}
