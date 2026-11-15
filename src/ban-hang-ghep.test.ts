// BÀI GHÉP «Bán hàng phụ trách» (ADR-0142, Task 5; khuôn src/dong-bo-chuyen-ghep.test.ts). Câu của `dispatch` nối vào lô lệnh đơn gác bằng `EXISTS (SELECT 1 FROM v_aud_order_ban_hang WHERE id = :auditId AND order_id = :đơn)`
// — view chỉ chứa các hành động `HANH_DONG_GAC_BAN_HANG`. Điểm gọi truyền id sai (hành động ngoài tập, hay đơn khác) thì câu LUÔN thua trong im lặng: không lỗi, không lời mời, không ô. Bài này chạy CẢ các điểm gọi
// qua route thật và đòi MỖI điểm để lại đúng dấu vết của câu gác (dòng lời mời / dòng ô / kết quả khép) — chứng cứ auditId đúng; rồi đòi danh sách route đã chạy = đúng các route có lời gọi trong mã.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { maskSource } from "../scripts/source-mask-lib.mjs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ADM, B, H, PARTNER, datCo, inDays, lap, setup, svc } from "../tests/audit/xac-nhan-khung.mjs";
import { HANH_DONG_GAC_BAN_HANG } from "./shared/ban-hang-phu-trach.ts";

/** Các lời gọi dựng câu GÁC NHẬT KÝ của lệnh đơn (có `auditId`) — route nào có trong thân (kể cả qua hàm trợ giúp đã biết) thì phải có trong danh sách đã chạy. */
const GOI = /\b(soanGhiNhan|moYeuCau|cauKhepLoiMoi|cauKhepLoiMoiSauLenhDon|cauMoBanHangBatBuoc)\s*\(/;

function routeCoGoi(): string[] {
  const out: string[] = [];
  for (const f of ["modules/orders/index.ts", "modules/orders/xac-nhan-route.ts", "modules/dispatch/index.ts"]) {
    const text = maskSource(readFileSync(new URL(`./${f}`, import.meta.url), "utf8"), { strings: false, comments: true });
    const heads = [...text.matchAll(/route\(\s*"(POST|PUT|PATCH|DELETE)",\s*"(\/api\/orders[^"]*)"/g)];
    heads.forEach((h, i) => {
      const than = text.slice(h.index!, i + 1 < heads.length ? heads[i + 1]!.index! : text.length);
      if (GOI.test(than)) out.push(`${h[1]} ${h[2]}`);
    });
  }
  return out.sort();
}

const loiMoi = (w: any, id: string) => w.q("SELECT outcome o FROM dsp_sales_invite WHERE order_id = ? ORDER BY recorded_at, rowid", id).map((r: any) => r.o);
const nOMo = (w: any, id: string) => w.q("SELECT count(*) n FROM dsp_sales_owner WHERE order_id = ? AND valid_to_at IS NULL", id)[0].n;
const goi = (w: any, id: string, as: string, duong: string, body: unknown = {}) => w.call("POST", `/api/orders/${id}/${duong}`, { as, body });
const quyet = (w: any, id: string, as: string, ketQua: string, extra: Record<string, unknown> = {}) =>
  goi(w, id, as, "quyet-dinh", { ketQua, yeuCauId: w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", id)[0].id, updatedAt: w.q("SELECT updated_at u FROM orders WHERE id = ?", id)[0].u, ...extra });

test("mọi điểm gọi câu gác nhật ký của Bán hàng phụ trách để lại đúng dấu vết (auditId đúng, hành động ∈ HANH_DONG_GAC_BAN_HANG); route đã chạy = route có lời gọi trong mã", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  const daChay: string[] = [];
  const ghi = (route: string) => daChay.push(route);
  const can = (ngay = inDays(3)) => [svc("ZA1", ngay)];
  const thuong = () => [svc("ZB1", inDays(3))];

  // gui-xac-nhan: lời mời MỞ cùng lô, gác bằng dòng order_confirm_requested
  const g = await lap(w, A, can(), { banHangMoiStaffId: B });
  assert.equal((await goi(w, g.id, A, "gui-xac-nhan")).status, 201);
  assert.deepEqual(loiMoi(w, g.id), [null]);
  ghi("POST /api/orders/:id/gui-xac-nhan");
  // rut-xac-nhan: khép RUT_LAI, gác bằng order_confirm_withdrawn
  assert.equal((await goi(w, g.id, A, "rut-xac-nhan")).status, 200);
  assert.deepEqual(loiMoi(w, g.id), ["RUT_LAI"]);
  ghi("POST /api/orders/:id/rut-xac-nhan");
  // quyet-dinh Còn vé: ô + khép NHAN, gác bằng confirmed
  assert.equal((await goi(w, g.id, A, "gui-xac-nhan")).status, 201);
  assert.equal((await quyet(w, g.id, B, "CON_VE")).status, 200);
  assert.deepEqual([nOMo(w, g.id), loiMoi(w, g.id)], [1, ["RUT_LAI", "NHAN"]]);
  // quyet-dinh Hết vé: khép HUY_DON, gác bằng cancelled
  const h = await lap(w, A, can(), { banHangMoiStaffId: B });
  assert.equal((await goi(w, h.id, A, "gui-xac-nhan")).status, 201);
  assert.equal((await quyet(w, h.id, ADM, "HET_VE")).status, 200);
  assert.deepEqual([nOMo(w, h.id), loiMoi(w, h.id)], [0, ["HUY_DON"]]);
  ghi("POST /api/orders/:id/quyet-dinh");
  // status: xác nhận (lời mời, gác confirmed) và huỷ (HUY_DON, gác cancelled)
  const s = await lap(w, A, thuong(), { banHangMoiStaffId: B });
  assert.equal((await goi(w, s.id, A, "status", { status: "confirmed" })).status, 200);
  assert.deepEqual(loiMoi(w, s.id), [null]);
  assert.equal((await goi(w, s.id, ADM, "status", { status: "cancelled", lyDo: "KHACH_DOI_Y" })).status, 200);
  assert.deepEqual(loiMoi(w, s.id), ["HUY_DON"]);
  ghi("POST /api/orders/:id/status");
  // gui-don nhánh A (lời mời mở) và nhánh B (lời mời mở, gác confirmed) của Đối tác
  const a = await lap(w, PARTNER, can(), { banHangMoiStaffId: B });
  assert.equal((await goi(w, a.id, PARTNER, "gui-don")).status, 201);
  assert.deepEqual(loiMoi(w, a.id), [null]);
  const b = await lap(w, PARTNER, thuong(), { banHangMoiStaffId: B });
  assert.equal((await goi(w, b.id, PARTNER, "gui-don")).status, 200);
  assert.deepEqual(loiMoi(w, b.id), [null]);
  ghi("POST /api/orders/:id/gui-don");
  // handler-cancel: HDV đang phụ trách huỷ, khép HUY_DON, gác bằng order_cancelled_by_field
  const f = await lap(w, A, thuong(), { handlerStaffId: H, banHangMoiStaffId: B });
  assert.equal((await goi(w, f.id, A, "status", { status: "confirmed" })).status, 200);
  assert.deepEqual(loiMoi(w, f.id), [null]);
  assert.equal((await goi(w, f.id, H, "handler-cancel", { reason: "customer_requested" })).status, 200);
  assert.deepEqual(loiMoi(w, f.id), ["HUY_DON"]);
  ghi("POST /api/orders/:id/handler-cancel");

  assert.deepEqual([...new Set(daChay)].sort(), routeCoGoi(), "route đã chạy = đúng các route có lời gọi câu gác trong mã");
  // mọi hành động gác có thật trong tập khai báo (không thừa, không thiếu so với view)
  const tap = new Set<string>(HANH_DONG_GAC_BAN_HANG);
  const thay = new Set<string>(w.q("SELECT DISTINCT action a FROM audit_log WHERE order_id IS NOT NULL AND id IN (SELECT id FROM v_aud_order_ban_hang)").map((r: any) => r.a));
  for (const x of thay) assert.ok(tap.has(x), `view chứa hành động ${x} ngoài HANH_DONG_GAC_BAN_HANG`);
  for (const x of ["confirmed", "order_confirm_requested", "order_confirm_withdrawn", "cancelled", "order_cancelled_by_field"]) assert.ok(thay.has(x), `${x}: có điểm gọi để lại dấu vết`);
});
