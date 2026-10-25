// BÀI NỐI (sổ đại lý đợt 1, Task 11): ba cổng ẩn/hiện của giao diện "bên đặt là đối tác" phải khớp ĐÚNG câu trả lời của route thật — giao diện chỉ ẩn/hiện, máy chủ luôn kiểm lại, nhưng một ô hiện ra mà route luôn
// từ chối (hay ngược lại một ô bị ẩn trong khi route cho) là lỗi giao diện. Mỗi cặp tài khoản thật gọi route thật qua khung thử (SQLite thật + cả ứng dụng):
//  - ô "Đặt qua đối tác"  ⇔ `GET /api/pricing/nguoi-huong` trả 200 VÀ giữ `order.create` (`coODatQuaDoiTac`; ADR-0141: route đã nới cho Kế toán, ô thì không);
//  - khối người bán       ⇔ `GET /api/pricing/cung-ung` trả 200       (`coXemNguoiBan`);
//  - nút "Ghi mức tay"    ⇔ `POST /api/orders/:id/thuong-mai/:serviceId` KHÔNG bị 403 (`duocGhiTay` với đơn đã xác nhận, chưa giao) — id đơn lạ nên qua cổng quyền thì nhận 404, không phải 403.
// Bài thứ hai nối cổng THỨ TƯ — khối "Phần đối tác" ở trang đơn (`coXemPhanDoiTac`, truyền `assigned: true` vì trang chỉ vẽ khi người xem đã mở được đơn) với `GET /api/orders/:id/thuong-mai`.
// Tài khoản lai (Bán hàng / Kế toán / Quản trị + Đối tác) nằm trong tập thử: "có quyền Đối tác là áp" (Ruling 12).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { coODatQuaDoiTac, coXemNguoiBan, coXemPhanDoiTac, duocGhiTay } from "../../shared/phan-doi-tac-hien-thi.ts";
import { can, type PermissionCode } from "../../shared/permissions.ts";

const TAP: { ten: string; perms: PermissionCode[] }[] = [
  { ten: "Bán hàng", perms: ["SALES"] },
  { ten: "Kế toán", perms: ["ACCOUNTING"] },
  { ten: "Quản trị", perms: ["ADMIN"] },
  { ten: "Toàn quyền", perms: ["SUPER_ADMIN"] },
  { ten: "Hướng dẫn viên", perms: ["FIELD"] },
  { ten: "Đối tác", perms: ["PARTNER"] },
  { ten: "Thực tập", perms: ["INTERN"] },
  { ten: "Tài xế", perms: ["DRIVER"] },
  { ten: "Nhân sự", perms: ["HR"] },
  { ten: "lai Bán hàng + Đối tác", perms: ["SALES", "PARTNER"] },
  { ten: "lai Kế toán + Đối tác", perms: ["ACCOUNTING", "PARTNER"] },
  { ten: "lai Quản trị + Đối tác", perms: ["ADMIN", "PARTNER"] },
];
const DON_LA = "99999999-9999-4999-8999-999999999999";

test("ba cổng ẩn/hiện khớp ĐÚNG câu trả lời của route thật, cho từng tài khoản (kể cả tài khoản lai)", async () => {
  const w = world();
  const ids = TAP.map((t, i) => {
    const id = `77777777-7777-4777-8777-7777777777${String(10 + i).padStart(2, "0")}`;
    seedStaff(w.sqlite, { id, phone: `09000001${String(10 + i).padStart(2, "0")}`, name: t.ten, perms: t.perms });
    return id;
  });
  const lech: string[] = [];
  for (const [i, t] of TAP.entries()) {
    const staff = { id: ids[i]!, permissions: t.perms };
    const timDoiTac = await w.call("GET", "/api/pricing/nguoi-huong?q=", { as: ids[i] });
    const cungUng = await w.call("GET", "/api/pricing/cung-ung", { as: ids[i] });
    const ghiTay = await w.call("POST", `/api/orders/${DON_LA}/thuong-mai/dich-vu-la`, { as: ids[i], body: {} });
    if ((timDoiTac.status === 200 && can(staff, "order.create")) !== coODatQuaDoiTac(staff)) lech.push(`${t.ten}: ô Đặt qua đối tác = ${coODatQuaDoiTac(staff)} nhưng nguoi-huong trả ${timDoiTac.status} và order.create = ${can(staff, "order.create")}`);
    if ((cungUng.status === 200) !== coXemNguoiBan(staff)) lech.push(`${t.ten}: khối người bán = ${coXemNguoiBan(staff)} nhưng cung-ung trả ${cungUng.status}`);
    const ghiTayDuoc = duocGhiTay(staff, { status: "confirmed", deliveredAt: null });
    if ((ghiTay.status !== 403) !== ghiTayDuoc) lech.push(`${t.ten}: nút Ghi mức tay = ${ghiTayDuoc} nhưng route ghi tay trả ${ghiTay.status}`);
  }
  assert.deepEqual(lech, []);
  // đối chứng: bài có răng — ít nhất một tài khoản mở được từng cổng và ít nhất một bị từ chối
  assert.equal(coODatQuaDoiTac({ id: "x", permissions: ["SALES"] }), true);
  assert.equal(coODatQuaDoiTac({ id: "x", permissions: ["SALES", "PARTNER"] }), false);
  assert.equal(duocGhiTay({ id: "x", permissions: ["ACCOUNTING"] }, { status: "confirmed", deliveredAt: null }), true);
});

test("Kế toán: route nguoi-huong 200, ô Đặt qua đối tác ẩn (ADR-0141 Đ1 + Đ2)", async () => {
  const w = world();
  const id = "77777777-7777-4777-8777-777777777799";
  seedStaff(w.sqlite, { id, phone: "0900000199", name: "Kế toán thử", perms: ["ACCOUNTING"] });
  const staff = { id, permissions: ["ACCOUNTING"] as PermissionCode[] };
  const r = await w.call("GET", "/api/pricing/nguoi-huong?q=", { as: id });
  assert.equal(r.status, 200, r.text);
  assert.equal(can(staff, "order.create"), false);
  assert.equal(coODatQuaDoiTac(staff), false);
});


// ---- cổng khối "Phần đối tác" ở trang đơn ----

const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

test("cổng khối Phần đối tác: người ĐÃ mở được trang đơn thì giao diện luôn gắn khối và route phần đối tác không bao giờ 403 (chỉ 200 hoặc 404 — ẩn lặng lẽ); đơn của mình, của người khác, được giao", async () => {
  const w = world();
  const CHU = "77777777-7777-4777-8777-777777777700";
  seedStaff(w.sqlite, { id: CHU, phone: "0900000100", name: "Chủ đơn", perms: ["SALES"] });
  const ids = TAP.map((t, i) => {
    const id = `77777777-7777-4777-8777-7777777777${String(10 + i).padStart(2, "0")}`;
    seedStaff(w.sqlite, { id, phone: `09000001${String(10 + i).padStart(2, "0")}`, name: t.ten, perms: t.perms });
    return id;
  });
  let seq = 0;
  const taoDon = (chu: string): string => {
    const id = `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
    w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, NULL, ?, ?)`).run(id, `TD-${seq}`, chu, AT, AT);
    w.sqlite.prepare(`INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, 0, NULL, 'DV 0', 'manual', 1, ?)`).run(`${id}-s0`, id, vnHomNay());
    w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, NULL, NULL, 'Người lớn', 1, 1000000, NULL, 1000000)`).run(`${id}-i0`, id, `${id}-s0`);
    return id;
  };
  const donCuaNguoiKhac = taoDon(CHU);
  const donCuaMinh = ids.map((id) => taoDon(id));
  const donDuocGiao = ids.map((id, i) => {
    const don = taoDon(CHU);
    w.sqlite.prepare("INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, valid_from_at, created_at, updated_at) VALUES (?, ?, 'HANDLE', ?, ?, ?, ?)").run(`as-${i}`, don, `pty-${id}`, AT, AT, AT);
    return don;
  });
  const sai: string[] = [];
  const tk = { mo: 0, khongMo: 0, koAn404: 0, hien200: 0 };
  for (const [i, t] of TAP.entries()) {
    const staff = { id: ids[i]!, permissions: t.perms };
    const ca: [string, string, string][] = [["đơn của mình", donCuaMinh[i]!, ids[i]!], ["đơn người khác", donCuaNguoiKhac, CHU], ["đơn được giao", donDuocGiao[i]!, CHU]];
    for (const [nhan, don, chu] of ca) {
      const trang = await w.call("GET", `/api/orders/${don}`, { as: ids[i] });
      if (trang.status !== 200) { tk.khongMo++; continue; } // không mở được trang đơn ⇒ không có khối nào để bàn
      tk.mo++;
      const gate = coXemPhanDoiTac(staff, { staffId: chu });
      const route = await w.call("GET", `/api/orders/${don}/thuong-mai`, { as: ids[i] });
      if (!gate) sai.push(`${t.ten} · ${nhan}: mở được trang đơn nhưng giao diện không gắn khối (route trả ${route.status})`);
      if (route.status === 403) sai.push(`${t.ten} · ${nhan}: giao diện gắn khối nhưng route trả 403 (khối sẽ báo lỗi mãi, nút Tải lại vô dụng)`);
      if (route.status === 404) tk.koAn404++;
      if (route.status === 200) tk.hien200++;
      if (route.status !== 200 && route.status !== 404 && route.status !== 403) sai.push(`${t.ten} · ${nhan}: route trả ${route.status}`);
    }
  }
  assert.deepEqual(sai, []);
  // đối chứng: bài có răng — có tài khoản mở được và không mở được trang đơn, có khối hiện (200) và có khối bị ẩn lặng lẽ (404)
  assert.ok(tk.mo >= 10 && tk.khongMo >= 3 && tk.hien200 >= 5 && tk.koAn404 >= 2, JSON.stringify(tk));
});
