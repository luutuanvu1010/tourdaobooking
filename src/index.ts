// Gốc lắp ráp: danh sách module + nối auth vào router + Cron. Thêm module mới = thêm một dòng vào `modules`.
// Đây cũng là nơi TIÊM hàm nối chéo module (ADR-0007 điều 4(b)): `orders` cần biết "người dùng có phải người phụ trách đơn" và có câu "đặt người phụ trách mặc định
// cho đơn mới" nhưng KHÔNG được import `dispatch` (dispatch → orders là chiều được phép, chiều ngược lại sẽ thành vòng). Router chỉ chuyển chúng vào `ctx`.
// `parties` cần biết hồ sơ gắn tài khoản nào (ADR-0013) nhưng KHÔNG được import `staff` — tiêm `partyAccount`.
// BẢNG TIN (ADR-0022): module `bangtin` là lá, không đọc cơ sở dữ liệu (KHONG_DB) — gốc lắp ráp đọc mã đơn/người lập (`orders`) + người phụ trách
// (`dispatch`), tính nhãn người nhận (`nhanSuKien`) rồi đưa cho `phatDon`. Đây cũng là NƠI DUY NHẤT nạp lớp Durable Object `BangTin` (`tram.ts`) —
// wrangler cần lớp đó được export từ tệp chính.
// WEB PUSH (ADR-0036): cũng ở `baoThayDoi` gốc lắp ráp gõ cửa màn hình khoá (`dayGoCua` của `thongbao`) độc lập với phát Bảng tin; `thongbao` giao lô
// cho trạm qua hàm tiêm `giaoLoDay` (không cạnh thongbao → bangtin); `dongBangTin` còn tắt mọi máy nhận của tài khoản vừa đổi.

import { accountsModule } from "./modules/accounts";
import { auditModule } from "./modules/audit";
import { authModule, checkAuthConfig, currentStaff } from "./modules/auth";
import { bangtinModule, dongCua, phatDon, xepHangDay } from "./modules/bangtin";
import { catalogModule, runScheduledSync } from "./modules/catalog";
import { companyModule } from "./modules/company";
import { defaultHandlerStatement, dispatchModule, handlerOf, isOrderHandler } from "./modules/dispatch";
import { locationsModule } from "./modules/locations";
import { feedbackModule } from "./modules/feedback";
import { maintenanceBlock, maintenanceModule } from "./modules/maintenance";
import { partiesModule } from "./modules/parties";
import { findOrderRef, ordersModule } from "./modules/orders";
import { accountOfParty } from "./modules/staff";
import { dayGoCua, tatMayStatement, thongbaoModule } from "./modules/thongbao";
import { nhanSuKien } from "./shared/bang-tin";
import { hanhDongCuaThayDoi, khoaVapid } from "./shared/web-push";
import { createApp } from "./shared/router";

export { BangTin } from "./modules/bangtin/tram";

/**
 * Gộp kết quả `allSettled` của các việc ĐỘC LẬP (đặt tên): một lỗi → ném lại chính nó; nhiều lỗi → một Error có `name` = "tram:<tên lỗi>; day:<tên lỗi>"
 * (router chỉ ghi `name` vào dòng `bang_tin_loi` — biết nửa nào hỏng, không lộ nội dung lỗi). Không nuốt lỗi.
 */
async function nemNeuLoi(viec: [string, Promise<unknown> | null][]): Promise<void> {
  const kq = await Promise.allSettled(viec.map(([, p]) => p));
  const loi = kq.flatMap((r, i) => (r.status === "rejected" ? [[viec[i]![0], r.reason] as const] : []));
  if (loi.length === 1) throw loi[0]![1];
  if (loi.length > 1) {
    const e = new Error(loi.map(([ten, r]) => `${ten}:${r instanceof Error ? r.name : "unknown"}`).join("; "));
    e.name = e.message;
    throw e;
  }
}

const app = createApp({
  modules: [authModule, accountsModule, ordersModule, dispatchModule, catalogModule, auditModule, locationsModule, partiesModule, companyModule, maintenanceModule, feedbackModule, bangtinModule, thongbaoModule],
  currentStaff,
  checkConfig: checkAuthConfig,
  injected: {
    isAssigned: (env, staffId, orderId) => isOrderHandler(env.DB, staffId, orderId),
    defaultHandlerStatement: (env, staff, orderId, at) => defaultHandlerStatement(env.DB, staff, orderId, at),
    maintenanceBlock: (env, staff) => maintenanceBlock(env.DB, staff.phone),
    partyAccount: (env, staff, partyId) => accountOfParty(env.DB, staff, partyId),
    // BẢNG TIN (ADR-0022). Router gọi bắn-và-quên (exec.waitUntil + bắt lỗi → một dòng `bang_tin_loi`): việc phát được BẮT ĐẦU ở một microtask ngay khi route gọi, chạy SONG SONG
    // với việc dựng phản hồi HTTP nên khung tin có thể tới trình duyệt TRƯỚC hoặc SAU phản hồi của chính thao tác đó; lỗi ở đây không làm hỏng/chậm thao tác ghi (DP-3). `_actor` (người vừa thao tác) giữ trong chữ ký cho Web Push giai đoạn sau — KHÔNG đưa vào sự kiện (điều 4: đúng 5 khoá).
    baoThayDoi: async (env, actor, e) => {
      // Kiểm TRƯỚC hai lần đọc D1: không trạm VÀ không khoá gõ cửa (khung thử, e2e) → không đọc gì.
      if (!env.BANG_TIN && !khoaVapid(env)) return;
      const [ref, handlerSau] = await Promise.all([findOrderRef(env.DB, e.orderId), handlerOf(env.DB, e.orderId)]);
      if (!ref) return;
      // Đơn mới mà không ai phụ trách (người lập không đủ điều kiện — Đối tác, chưa có hồ sơ) → loại riêng để người nhận được đơn thấy thông báo nổi.
      const thayDoi = e.thayDoi === "tao" && !handlerSau.coNguoi ? "tao_cho_nhan" : e.thayDoi;
      const luc = new Date().toISOString();
      const action = hanhDongCuaThayDoi(thayDoi);
      // Hai việc ĐỘC LẬP: trạm lỗi thì vẫn gõ cửa, và ngược lại.
      await nemNeuLoi([
        ["tram", phatDon(
          env,
          { loai: "don", orderId: e.orderId, maDon: ref.orderCode, thayDoi, luc },
          nhanSuKien({ ownerId: ref.staffId, handlerTruoc: e.handlerTruoc ?? { coNguoi: false, staffId: null }, handlerSau }),
        )],
        ["day", action === null ? null : dayGoCua(env, {
          don: {
            id: "day", orderId: e.orderId, maDon: ref.orderCode, action, actorId: actor.id, tenNguoiLam: null, luc, ownerId: ref.staffId,
            phuTrach: handlerSau, lapChuaCoNguoi: thayDoi === "tao_cho_nhan", cungLoLap: false,
          },
          quanTrong: false,
        }, (ds) => xepHangDay(env, ds))],
      ]);
    },
    // Đóng kết nối Bảng tin + tắt mọi máy nhận của tài khoản đó (ADR-0036; chạy cả khi không có trạm). "tat-ca" (bật bảo trì) KHÔNG tắt máy.
    dongBangTin: async (env, muc) => {
      await nemNeuLoi([
        ["tram", dongCua(env, muc)],
        // updated_by = NULL (hệ thống): tắt kèm khi tài khoản đổi — người làm thay đổi đó có trong audit_log của chính thao tác.
        ["tat-may", typeof muc === "object" ? tatMayStatement(env.DB, muc.staffId, null, "tai-khoan-doi", new Date().toISOString(), null).run() : null],
      ]);
    },
    giaoLoDay: (env, ds) => xepHangDay(env, ds),
  },
});

export default {
  fetch: app.fetch,
  // Cron Trigger (wrangler.jsonc "triggers.crons"): tự đồng bộ danh mục dịch vụ từ Google Sheet.
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledSync(env));
  },
} satisfies ExportedHandler<Env>;
