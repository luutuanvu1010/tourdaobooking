// ADR-0154 Đ1.5 — kế hoạch lượt 2 Task 1.4, bài (m): người ĐIỀN giờ ở bảng «Còn vé» (Kế toán, Hướng dẫn viên nội bộ — những người giữ ô `order.confirm.review` nhưng không lập đơn) đọc ĐÚNG
// khung giờ đón đang cài, không còn bị 403 như khi khung chỉ mở cho người lập đơn. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs); bản đảo của dòng cũ ở chon-don-route.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { seedStaff } from "../../../tests/audit/harness.mjs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, B, H, INTERN, PARTNER, SUP, datCo, inDays, lap, leg, setup, svc } from "../../../tests/audit/xac-nhan-khung.mjs";

const TXC = "66666666-6666-4666-8666-666666666661"; // chỉ DRIVER (Tài xế công ty): không lập đơn, không xét duyệt
const KHUNG_MAC_DINH_DAU = { tu: "07:30", den: "08:00" };
const KHUNG_MOI = [{ tu: "06:00", den: "06:30" }, { tu: "06:30", den: "07:00" }];
const NGAY = () => inDays(3);

const doc = (w: any, as: string) => w.call("GET", "/api/cai-dat/khung-gio-don", { as });

test("(m) Bán hàng, Đối tác, Thực tập, Toàn quyền đọc khung giờ đang cài (200); Kế toán, HDV (ADR-0142: không còn ô xét duyệt) và Tài xế công ty 403 — ô đọc khung là «lập đơn HOẶC xét duyệt»", async () => {
  const w = setup();
  seedStaff(w.sqlite, { id: TXC, phone: "0900000019", name: "Tài Xế", perms: ["DRIVER"] });
  for (const [nhan, as] of [["Bán hàng", A], ["Đối tác", PARTNER], ["Thực tập", INTERN], ["Toàn quyền", SUP]] as const) {
    const r = await doc(w, as);
    assert.equal(r.status, 200, `${nhan}: ${r.text}`);
    assert.equal(r.json.khung.length, 5, `${nhan}: khung mặc định`);
    assert.deepEqual(r.json.khung[0], KHUNG_MAC_DINH_DAU);
    assert.equal(r.json.doiDuoc, as === SUP, `${nhan}: chỉ Toàn quyền đổi được`);
  }
  for (const [nhan, as] of [["Tài xế công ty", TXC], ["Kế toán", ACC], ["HDV nội bộ", H]] as const) {
    const r = await doc(w, as);
    assert.equal(r.status, 403, `${nhan}: ${r.text}`);
  }
});

test("(m) Toàn quyền đổi khung: Bán hàng khác đọc khung mới; Còn vé theo khung MỚI → 200, theo khung cũ → 400 doi_gio_khong_hop_le (không ghi gì)", async () => {
  const w = setup();
  const dat = await w.call("POST", "/api/cai-dat/khung-gio-don", { as: SUP, body: { khung: KHUNG_MOI, luuY: "Giờ có thể đổi." } });
  assert.equal(dat.status, 200, dat.text);
  const ke = await doc(w, B);
  assert.equal(ke.status, 200, ke.text);
  assert.deepEqual(ke.json.khung, KHUNG_MOI, "Bán hàng khác đọc đúng khung vừa cài");
  assert.equal(ke.json.luuY, "Giờ có thể đổi.");
  // đơn Đối tác có lượt đón chưa giờ → gửi đơn → yêu cầu mang cờ chốt giờ → Bán hàng khác điền giờ theo khung
  const o = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null)])]);
  const gui = await w.call("POST", `/api/orders/${o.id}/gui-don`, { as: PARTNER, body: {} });
  assert.equal(gui.status, 201, gui.text);
  const legId = o.services[0].legs[0].id as string;
  const qd = (gio: Record<string, unknown>) => {
    const moc = w.q("SELECT updated_at u FROM orders WHERE id = ?", o.id)[0].u;
    const y = w.q("SELECT id FROM ord_confirm_request WHERE order_id = ? AND decided_at IS NULL", o.id)[0];
    return w.call("POST", `/api/orders/${o.id}/quyet-dinh`, { as: B, body: { yeuCauId: y.id, updatedAt: moc, ketQua: "CON_VE", gioDon: [{ legId, ...gio }] } });
  };
  const cu = await qd({ pickupTime: KHUNG_MAC_DINH_DAU.tu, pickupSlotEnd: KHUNG_MAC_DINH_DAU.den });
  assert.equal(cu.status, 400, cu.text);
  assert.equal(cu.json.error.code, "doi_gio_khong_hop_le");
  assert.equal(w.q("SELECT status s FROM orders WHERE id = ?", o.id)[0].s, "draft", "khung cũ: không ghi gì");
  assert.equal(w.q("SELECT pickup_time t FROM ord_transfer_leg WHERE id = ?", legId)[0].t, null);
  const moi = await qd({ pickupTime: KHUNG_MOI[0]!.tu, pickupSlotEnd: KHUNG_MOI[0]!.den });
  assert.equal(moi.status, 200, moi.text);
  assert.equal(w.q("SELECT status s FROM orders WHERE id = ?", o.id)[0].s, "confirmed");
  assert.equal(w.q("SELECT pickup_time t FROM ord_transfer_leg WHERE id = ?", legId)[0].t, "06:00");
});

test("danh sách chờ (ADR-0154 Đ1.7): yêu cầu mang cờ chốt giờ, chiều về có giờ gợi ý 16:00 → gioDon null (không để 16:00 trông như giờ đón), vi có CHOT_GIO; yêu cầu không cờ vẫn hiện giờ đón", async () => {
  const w = setup();
  const RET = { ...leg(NGAY(), "16:00"), direction: "RETURN" };
  const cuaDoiTac = await lap(w, PARTNER, [svc("ZB1", NGAY(), [leg(NGAY(), null), RET])]);
  assert.equal((await w.call("POST", `/api/orders/${cuaDoiTac.id}/gui-don`, { as: PARTNER, body: {} })).status, 201);
  datCo(w, "SERVICE", "ZA1", true);
  const cuaVanPhong = await lap(w, A, [svc("ZA1", NGAY(), [leg(NGAY(), "09:00")])]);
  assert.equal((await w.call("POST", `/api/orders/${cuaVanPhong.id}/gui-xac-nhan`, { as: A, body: {} })).status, 201);
  const ds = await w.call("GET", "/api/orders/cho-xac-nhan", { as: B });
  assert.equal(ds.status, 200, ds.text);
  const dong = (id: string) => (ds.json.don as any[]).find((d) => d.orderId === id);
  assert.equal(dong(cuaDoiTac.id).gioDon, null, "mang cờ: lượt đầu chưa có giờ, không lấy giờ chiều về làm giờ đón");
  assert.ok(dong(cuaDoiTac.id).vi.includes("CHOT_GIO"));
  assert.equal(dong(cuaVanPhong.id).gioDon, "09:00", "không cờ: như cũ");
  assert.ok(!dong(cuaVanPhong.id).vi.includes("CHOT_GIO"));
});
