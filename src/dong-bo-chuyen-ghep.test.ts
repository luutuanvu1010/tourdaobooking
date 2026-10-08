// BÀI GHÉP ĐIỂM GỌI ↔ CỔNG CHUYẾN (ADR-0104 Đ2.2; kế hoạch NT-5 "Bài ghép", S7). Câu cổng chuyến hỏi `v_aud_order_cmd` theo `auditIdDon` — view chỉ chứa các
// hành động `HANH_DONG_CONG_DON` (bài so tập ở src/migrations-dong-bo-chuyen.test.ts). Điểm gọi truyền id của một dòng nhật ký có hành động NGOÀI tập đó thì
// cổng chuyến luôn thua trong im lặng (máy không bao giờ đồng bộ mà không ai biết). Bài này chạy CẢ tám điểm gọi qua route thật (khung thử; máy THẬT, hàm chen
// chỉ GHI LẠI đầu vào) rồi đòi: mỗi `auditIdDon` là id một dòng audit_log của ĐÚNG đơn đó, hành động ∈ HANH_DONG_CONG_DON; tám route đã chạy = đúng các route có
// lời gọi `dongBoChuyen(` trong mã; mọi hành động của tập đều có điểm gọi.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { maskSource } from "../scripts/source-mask-lib.mjs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { FIELD, LOC, NGAY, SALES, batDongHo, don, setup } from "../tests/audit/dieu-phoi-khung.mjs";
import { HANH_DONG_CONG_DON } from "./shared/dong-bo-chuyen.ts";

/** Route ghi `/api/orders*` có lời gọi `dongBoChuyen(` trong thân (đọc mã đã che chú thích — khuôn src/dong-bo-chuyen-guard.test.ts, bản rút gọn). */
function routeCoGoiMay(): string[] {
  const out: string[] = [];
  for (const f of ["modules/orders/index.ts", "modules/dispatch/index.ts", "modules/billing/index.ts"]) {
    const text = maskSource(readFileSync(new URL(`./${f}`, import.meta.url), "utf8"), { strings: false, comments: true });
    const heads = [...text.matchAll(/route\(\s*"(POST|PUT|PATCH|DELETE)",\s*"(\/api\/orders[^"]*)"/g)];
    heads.forEach((h, i) => {
      const than = text.slice(h.index!, i + 1 < heads.length ? heads[i + 1]!.index! : text.length);
      if (/\bdongBoChuyen\s*\(/.test(than)) out.push(`${h[1]} ${h[2]}`);
    });
  }
  return out.sort();
}

test("NT-5 bài ghép (ADR-0104 Đ2.2): auditIdDon của CẢ tám điểm gọi là id dòng nhật ký của đúng đơn, hành động ∈ HANH_DONG_CONG_DON; tám route = route có lời gọi máy; phủ đủ tập hành động", async () => {
  const tat = batDongHo();
  try {
    const goi: { orderId: string; auditIdDon: string }[] = [];
    const w = setup({ chenGiuaDocVaGhi: async ({ x }: { x: { orderId: string; auditIdDon: string } }) => void goi.push({ orderId: x.orderId, auditIdDon: x.auditIdDon }) });
    const daChay: string[] = [];
    const chay = async (route: string, method: string, path: string, as: string, body: unknown) => {
      const truoc = goi.length;
      const r = await w.call(method, path, { as, body });
      assert.equal(r.status, 200, `${route}: ${r.text}`);
      assert.equal(goi.length, truoc + 1, `${route}: đúng MỘT lần gọi máy`);
      daChay.push(route);
    };
    const svc = (id: string) => w.q("SELECT id FROM order_service WHERE order_id = ?", id)[0].id;
    const chang = async (id: string) => (await w.call("GET", `/api/orders/${id}`, { as: SALES })).json.order;
    const pax = (adult: number) => ({ adult, child: 0, senior: 0, infant: 0 });

    const a = await don(w, { soNguoi: 2 });
    const b = await don(w, { soNguoi: 2, handler: FIELD });
    const c = await don(w, { soNguoi: 2 });
    const d = await don(w, { soNguoi: 2 });
    const e = await don(w, { soNguoi: 2 });
    await chay("POST /api/orders/:id/money-edit", "POST", `/api/orders/${a.id}/money-edit`, SALES, { lyDo: "THEM_NGUOI", services: [{ id: svc(a.id), pax: pax(3) }] });
    await chay("POST /api/orders/:id/handler-money-edit", "POST", `/api/orders/${b.id}/handler-money-edit`, FIELD, { reason: "Khách thêm người", services: [{ id: svc(b.id), pax: pax(3) }] });
    const ds = (await w.call("GET", `/api/orders/${a.id}/passengers`, { as: SALES })).json;
    await chay("POST /api/orders/:id/passengers", "POST", `/api/orders/${a.id}/passengers`, SALES, {
      expectedUpdatedAt: ds.orderUpdatedAt, them: [{ fullName: "Khách Ghép Thêm", birthYear: 1980, paxCode: "adult" }], sua: [], huy: [ds.passengers[0].personKey],
    });
    const la = (await chang(a.id)).services[0].legs[0];
    await chay("PUT /api/orders/:id/legs/:legId", "PUT", `/api/orders/${a.id}/legs/${a.legId}`, SALES, {
      expectedUpdatedAt: la.updatedAt, leg: { direction: "OUT", pickupDate: NGAY, pickupTime: "13:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" },
    });
    const lc = (await chang(c.id)).services[0].legs[0];
    await chay("POST /api/orders/:id/legs/:legId/close", "POST", `/api/orders/${c.id}/legs/${c.legId}/close`, SALES, { expectedUpdatedAt: lc.updatedAt, reasonCode: "NOT_NEEDED" });
    await chay("POST /api/orders/:id/legs/:legId/replace", "POST", `/api/orders/${d.id}/legs/${d.legId}/replace`, SALES, {
      expectedUpdatedAt: (await chang(d.id)).updatedAt, leg: { direction: "OUT", pickupDate: NGAY, pickupTime: "13:30", pickupLocationId: null, pickupPlace: "Khách sạn Mới", dropoffLocationId: LOC, dropoffPlace: "" },
    });
    await chay("POST /api/orders/:id/status", "POST", `/api/orders/${e.id}/status`, SALES, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
    await chay("POST /api/orders/:id/handler-cancel", "POST", `/api/orders/${b.id}/handler-cancel`, FIELD, { reason: "customer_requested" });

    assert.deepEqual([...daChay].sort(), routeCoGoiMay(), "tám route đã chạy = đúng các route có lời gọi dongBoChuyen( trong mã");
    const tap = new Set<string>(HANH_DONG_CONG_DON);
    const thay = new Set<string>();
    for (const g of goi) {
      const dong = w.q("SELECT action, order_id FROM audit_log WHERE id = ?", g.auditIdDon);
      assert.equal(dong.length, 1, `auditIdDon ${g.auditIdDon}: không phải id một dòng nhật ký`);
      assert.equal(dong[0].order_id, g.orderId, "dòng nhật ký của ĐÚNG đơn");
      assert.ok(tap.has(dong[0].action), `hành động "${dong[0].action}" ngoài HANH_DONG_CONG_DON — cổng chuyến (v_aud_order_cmd) sẽ luôn thua`);
      assert.equal(w.q("SELECT count(*) n FROM v_aud_order_cmd WHERE id = ? AND order_id = ?", g.auditIdDon, g.orderId)[0].n, 1, "view cổng thấy dòng");
      thay.add(dong[0].action);
    }
    assert.deepEqual([...thay].sort(), [...tap].sort(), "mọi hành động của HANH_DONG_CONG_DON đều có điểm gọi (tập không thừa)");
  } finally {
    tat();
  }
});
