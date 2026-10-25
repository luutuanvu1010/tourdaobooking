// Bài quyền xuyên suốt của sổ đại lý đợt 1 (tiêu chí 7; Step 10b của Task 7, làm ở Task 5 khi đủ 12 route mới): Tài xế công ty (DRIVER), Tài xế đối tác (DRIVER_PARTNER) và Nhân sự (HR),
// mỗi tài khoản giữ ĐÚNG MỘT quyền đó (DRIVER_PARTNER đứng một mình theo ADR-0048), gọi lần lượt cả 12 route mới ⇒ bị từ chối, không route nào trả 2xx, không để lại dòng nào
// ở prc_* (cả prc_beneficiary_role), ord_service_terms, ky_period_close, audit_log. Đường có :id dùng id CÓ THẬT (một mức, một điều khoản, một đơn đã xác nhận, một dòng dịch vụ, tháng 2026-08) —
// để bị từ chối vì QUYỀN chứ không vì "không tìm thấy". Có "răng": cùng 12 lời gọi do Kế toán (riêng tìm người hưởng: Bán hàng) gọi thì KHÔNG bị 403 (route có thật, tới được logic riêng).
//
// Mã thật mà cổng trả (src/shared/router.ts, createApp): route cổng "office" ⇒ 403 `forbidden` "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này.";
// route cổng "orders" ⇒ 403 `forbidden` "Tài khoản này không dùng được màn hình đơn." (cả ba quyền trên đều không nằm trong OFFICE_GATE lẫn ORDERS_GATE). Cổng chặn TRƯỚC khi vào
// thân route, nên bảng quyền (MATRIX) là lưới thứ hai: ba ô của bài permissions.test.ts (`order.terms.*`, `ledger.period.close`, …) cũng đều "none" cho ba quyền này.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const TXC = "66666666-6666-4666-8666-666666666661"; // chỉ DRIVER
const TXDT = "66666666-6666-4666-8666-666666666662"; // chỉ DRIVER_PARTNER
const NS = "66666666-6666-4666-8666-666666666663"; // chỉ HR
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const GATE_VAN_PHONG = "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này.";
const GATE_DON = "Tài khoản này không dùng được màn hình đơn.";
type W = ReturnType<typeof world>;

const BANG = ["prc_commission_rule", "prc_supply_term", "prc_beneficiary_role", "ord_service_terms", "ky_period_close", "audit_log"] as const;
const dem = (w: W): Record<string, number> => Object.fromEntries(BANG.map((b) => [b, Number(w.q(`SELECT count(*) AS n FROM ${b}`)[0].n)]));

async function dungThe() {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [KT, "0900000004", "Lan Kế Toán", ["ACCOUNTING"]],
    [TXC, "0900000009", "Tài Xế Công Ty", ["DRIVER"]], [TXDT, "0900000010", "Tài Xế Đối Tác", ["DRIVER_PARTNER"]], [NS, "0900000011", "Hà Nhân Sự", ["HR"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-dla', 'ORGANIZATION', 'Đại lý A', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-dla', 'pty-dla', 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-ncc', 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-ncc', 'pty-ncc', 'SUPPLIER', '2026-01-01', ?, ?)").run(AT, AT);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('IRESORT', 'I-Resort', 'perPax', 300000, 1, '${AT}', '${AT}')`);
  // một MỨC có thật (qua route, Kế toán) và một ĐIỀU KHOẢN có thật
  const muc = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  assert.equal(muc.status, 201, muc.text);
  w.sqlite.prepare(`INSERT INTO prc_supply_term (id, scope, catalog_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, created_at, updated_at)
    VALUES ('st-ncc', 'SERVICE', 'HONTAM', 'pty-ncc', 'pty-ncc', 8000, '2026-01-01', ?, ?)`).run(AT, AT);
  // một ĐƠN ĐÃ XÁC NHẬN có bản chụp (một dòng dịch vụ)
  const don = "99999999-9999-4999-8999-000000000001";
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, 'TD-1', ?, 'draft', 'Khách Giả', '0900000099', 1000000, 1000000, 1000000, 'pty-dla', ?, ?)`).run(don, SALES, AT, AT);
  w.sqlite.prepare("INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'HONTAM', 'DV 0', 'perPax', 1, ?)").run(`${don}-s0`, don, vnHomNay());
  w.sqlite.prepare("INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'HONTAM', 'adult', 'Người lớn', 1, 1000000, 1000000, 1000000)").run(`${don}-s0-i`, don, `${don}-s0`);
  const xn = await w.call("POST", `/api/orders/${don}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(xn.status, 200, xn.text);
  assert.equal(Number(w.q("SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", don)[0].n), 1);
  return { w, mucId: muc.json.dong.id as string, don, dv: `${don}-s0` };
}

/** 12 route mới: [tên, phương thức, đường, cổng, thân]. Thân hợp lệ để nếu cổng hỏng, route sẽ chạy tới logic và GHI (bài bắt được). */
const muoiHaiRoute = (mucId: string, don: string, dv: string): [string, string, string, "office" | "orders", unknown][] => [
  ["pricing: xem bảng mức", "GET", "/api/pricing/hoa-hong", "office", undefined],
  ["pricing: thêm mức", "POST", "/api/pricing/hoa-hong", "office", { tuNgay: "2026-02-01", doiTuong: { loai: "VAI", code: "COLLABORATOR" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 500 }],
  ["pricing: đóng mức", "POST", `/api/pricing/hoa-hong/${mucId}/dong`, "office", { denNgay: "2026-12-31" }],
  ["pricing: thử tra", "GET", "/api/pricing/thu-tra?doiTac=pty-dla&dichVu=HONTAM&ngay=2026-10-10", "office", undefined],
  ["pricing: xem điều khoản", "GET", "/api/pricing/cung-ung", "office", undefined],
  ["pricing: thêm điều khoản", "POST", "/api/pricing/cung-ung", "office", { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: "pty-ncc", tyLeMuaBp: 8000, tuNgay: "2026-10-01" }],
  ["pricing: đóng điều khoản", "POST", "/api/pricing/cung-ung/st-ncc/dong", "office", { denNgay: "2026-12-31" }],
  ["pricing: tìm người hưởng", "GET", "/api/pricing/nguoi-huong?q=Đại", "orders", undefined], // người LẬP ĐƠN hoặc người ĐẶT MỨC dùng (ADR-0141: Kế toán cũng qua cổng); ca "có răng" vẫn gọi bằng Bán hàng
  ["orders: xem phần thương mại", "GET", `/api/orders/${don}/thuong-mai`, "orders", undefined],
  ["orders: ghi mức tay", "POST", `/api/orders/${don}/thuong-mai/${dv}`, "office", { lyDo: "thoả thuận miệng với CTV Lan", hoaHong: { kieu: "RATE", tyLeBp: 1500 } }],
  ["ledger: xem kỳ", "GET", "/api/ledger/ky", "office", undefined],
  ["ledger: khoá tháng", "POST", "/api/ledger/ky/2026-08/khoa", "office", {}],
];

test("12 route mới của sổ đại lý: Tài xế công ty, Tài xế đối tác, Nhân sự (mỗi tài khoản đúng một quyền) ⇒ mọi phản hồi 403 `forbidden` của cổng, không 2xx, không ghi dòng nào", async () => {
  const { w, mucId, don, dv } = await dungThe();
  const ds = muoiHaiRoute(mucId, don, dv);
  assert.equal(ds.length, 12);
  const truoc = dem(w);
  for (const [nhan, as] of [["Tài xế công ty (DRIVER)", TXC], ["Tài xế đối tác (DRIVER_PARTNER)", TXDT], ["Nhân sự (HR)", NS]] as const) {
    const quyen = w.q("SELECT permission_type_code AS p FROM stf_permission WHERE staff_id = ?", as).map((r: { p: string }) => r.p);
    assert.equal(quyen.length, 1, `${nhan} giữ đúng một quyền`);
    for (const [ten, phuongThuc, duong, cong, than] of ds) {
      const r = await w.call(phuongThuc, duong, { as, body: than });
      assert.equal(r.status, 403, `${nhan} gọi ${ten} (${phuongThuc} ${duong}): ${r.status} ${r.text}`);
      assert.equal(r.json.error.code, "forbidden", `${nhan} · ${ten}`);
      assert.equal(r.json.error.message, cong === "office" ? GATE_VAN_PHONG : GATE_DON, `${nhan} · ${ten}: đúng câu của cổng ${cong}`);
    }
  }
  assert.deepEqual(dem(w), truoc, "không lời gọi nào để lại dòng ở prc_*, ord_service_terms, ky_period_close, audit_log");
});

test("có răng: cùng 12 lời gọi do Kế toán (riêng tìm người hưởng: Bán hàng) gọi thì KHÔNG bị 403 và không 5xx (route có thật, có id thật, tới được logic riêng)", async () => {
  const { w, mucId, don, dv } = await dungThe();
  const trangThai: string[] = [];
  for (const [ten, phuongThuc, duong, , than] of muoiHaiRoute(mucId, don, dv)) {
    const r = await w.call(phuongThuc, duong, { as: ten === "pricing: tìm người hưởng" ? SALES : KT, body: than });
    trangThai.push(`${r.status} ${ten}`);
    assert.notEqual(r.status, 403, `${ten}: ${r.text}`);
    assert.notEqual(r.status, 404, `${ten}: đường có :id phải trỏ id có thật — ${r.text}`);
    assert.ok(r.status < 500, `${ten}: ${r.status} ${r.text}`);
  }
  // các lời gọi ghi hợp lệ thật sự ghi (không chỉ bị từ chối vì lý do khác)
  assert.ok(trangThai.includes("201 pricing: thêm mức") && trangThai.includes("200 pricing: đóng mức") && trangThai.includes("200 orders: ghi mức tay"), trangThai.join(" | "));
});

// ADR-0117 lần 2 (mức TA dùng chung, N-19): bảy route mới /api/pricing/muc-ta* — cùng khuôn: Tài xế công ty, Tài xế đối tác, Nhân sự ⇒ 403 của cổng văn phòng, không ghi gì
// (kể cả prc_rate_tier, prc_role_tier); có răng: Kế toán gọi thì tới logic (không 403, không 404, không 5xx). Mã mức / mã gắn là mã THẬT (Kế toán tạo trước).
test("mức TA (ADR-0117 lần 2): 7 route mới — Tài xế công ty, Tài xế đối tác, Nhân sự ⇒ 403 cổng, không ghi dòng nào; Kế toán tới logic", async () => {
  const { w } = await dungThe();
  const tao = await w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten: "TA thử quyền" } });
  assert.equal(tao.status, 201, tao.text);
  const ma: string = tao.json.muc.code;
  const gan = await w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai: "COLLABORATOR", muc: ma, tuNgay: "2026-01-01" } });
  assert.equal(gan.status, 201, gan.text);
  const ds: [string, string, string, unknown][] = [
    ["xem mức TA", "GET", "/api/pricing/muc-ta", undefined],
    ["tạo mức TA", "POST", "/api/pricing/muc-ta", { ten: "TA của người không quyền" }],
    ["gắn loại vào mức", "POST", "/api/pricing/muc-ta/gan", { loai: "HOTEL_RECEPTION", muc: ma, tuNgay: "2026-01-01" }],
    ["thêm dòng cho mức", "POST", `/api/pricing/muc-ta/${ma}/dong`, { phamVi: "ALL", kieu: "RATE", tyLeBp: 700, tuNgay: "2026-01-01" }],
    ["kết thúc gắn", "POST", `/api/pricing/muc-ta/gan/${gan.json.gan.id}/ket-thuc`, { denNgay: "2026-12-31" }],
    ["tắt mức", "POST", `/api/pricing/muc-ta/${ma}/tat`, {}],
    ["bật mức", "POST", `/api/pricing/muc-ta/${ma}/bat`, {}],
  ];
  const bang = () => [...Object.values(dem(w)), Number(w.q("SELECT count(*) AS n FROM prc_rate_tier")[0].n), Number(w.q("SELECT count(*) AS n FROM prc_role_tier")[0].n)];
  const truoc = bang();
  for (const [nhan, as] of [["Tài xế công ty (DRIVER)", TXC], ["Tài xế đối tác (DRIVER_PARTNER)", TXDT], ["Nhân sự (HR)", NS]] as const) {
    for (const [ten, phuongThuc, duong, than] of ds) {
      const r = await w.call(phuongThuc, duong, { as, body: than });
      assert.equal(r.status, 403, `${nhan} gọi ${ten}: ${r.status} ${r.text}`);
      assert.equal(r.json.error.message, GATE_VAN_PHONG, `${nhan} · ${ten}: đúng câu của cổng văn phòng`);
    }
  }
  assert.deepEqual(bang(), truoc, "không lời gọi nào để lại dòng");
  const trangThai: string[] = [];
  for (const [ten, phuongThuc, duong, than] of ds) {
    const r = await w.call(phuongThuc, duong, { as: KT, body: than });
    trangThai.push(`${r.status} ${ten}`);
    assert.ok(r.status !== 403 && r.status !== 404 && r.status < 500, `${ten}: ${r.status} ${r.text}`);
  }
  assert.deepEqual(trangThai, ["200 xem mức TA", "201 tạo mức TA", "201 gắn loại vào mức", "201 thêm dòng cho mức", "200 kết thúc gắn", "200 tắt mức", "200 bật mức"]);
});

// Hoa hồng + Hỗ trợ PR 1, Task 4: route «Đổi mức» — Tài xế công ty, Tài xế đối tác, Nhân sự ⇒ 403 của cổng văn phòng, mức không đổi, không dòng mới; Kế toán tới logic (không 403/404/5xx).
test("Đổi mức (POST …/hoa-hong/:id/doi): Tài xế công ty, Tài xế đối tác, Nhân sự ⇒ 403 cổng, không ghi gì; Kế toán tới logic", async () => {
  const { w, mucId } = await dungThe();
  const than = { kieu: "RATE", tyLeBp: 1200, tuNgay: "2099-01-01" };
  const truoc = Number(w.q("SELECT count(*) AS n FROM prc_commission_rule")[0].n);
  for (const [nhan, ai] of [["Tài xế công ty", TXC], ["Tài xế đối tác", TXDT], ["Nhân sự", NS]] as const) {
    const r = await w.call("POST", `/api/pricing/hoa-hong/${mucId}/doi`, { as: ai, body: than });
    assert.equal(r.status, 403, `${nhan}: ${r.text}`);
    assert.equal(r.json.error.code, "forbidden", nhan);
  }
  assert.equal(Number(w.q("SELECT count(*) AS n FROM prc_commission_rule")[0].n), truoc, "không dòng mới");
  const kt = await w.call("POST", `/api/pricing/hoa-hong/${mucId}/doi`, { as: KT, body: than });
  assert.ok(kt.status !== 403 && kt.status !== 404 && kt.status < 500, `Kế toán: ${kt.status} ${kt.text}`);
});

// Hoa hồng + Hỗ trợ PR 1, Task 5: route «Đổi chính sách» của loại — Tài xế công ty, Tài xế đối tác, Nhân sự ⇒ 403 cổng, không ghi gì; Kế toán tới logic.
test("Đổi chính sách (POST …/muc-ta/gan/:id/doi): Tài xế công ty, Tài xế đối tác, Nhân sự ⇒ 403 cổng, không ghi gì; Kế toán tới logic", async () => {
  const { w } = await dungThe();
  const ma: string = (await w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten: "TA đổi chính sách" } })).json.muc.code;
  const gan = await w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai: "COLLABORATOR", muc: ma, tuNgay: "2026-01-01" } });
  assert.equal(gan.status, 201, gan.text);
  const than = { muc: ma, tuNgay: "2099-01-01" };
  const dem2 = () => Number(w.q("SELECT count(*) AS n FROM prc_role_tier")[0].n);
  const truoc = dem2();
  for (const [nhan, ai] of [["Tài xế công ty", TXC], ["Tài xế đối tác", TXDT], ["Nhân sự", NS]] as const) {
    const r = await w.call("POST", `/api/pricing/muc-ta/gan/${gan.json.gan.id}/doi`, { as: ai, body: than });
    assert.equal(r.status, 403, `${nhan}: ${r.text}`);
    assert.equal(r.json.error.code, "forbidden", nhan);
  }
  assert.equal(dem2(), truoc, "không gắn mới");
  const kt = await w.call("POST", `/api/pricing/muc-ta/gan/${gan.json.gan.id}/doi`, { as: KT, body: than });
  assert.ok(kt.status !== 403 && kt.status !== 404 && kt.status < 500, `Kế toán: ${kt.status} ${kt.text}`);
});

// ADR-0141: cổng GET /api/pricing/nguoi-huong nới cho Kế toán (partner.commission.write); Đối tác, tài khoản lai có Đối tác, HDV, Tài xế, Nhân sự vẫn bị chặn.
test("tìm người hưởng (ADR-0141): Kế toán 200; Đối tác, lai Kế toán + Đối tác, HDV, Tài xế, Tài xế đối tác, Nhân sự ⇒ 403", async () => {
  const { w } = await dungThe();
  const them = (id: string, phone: string, perms: string[]) => seedStaff(w.sqlite, { id, phone, name: `Thử ${phone}`, perms });
  const DT = "66666666-6666-4666-8666-666666666671", LAI = "66666666-6666-4666-8666-666666666672", HDV = "66666666-6666-4666-8666-666666666673";
  them(DT, "0900000021", ["PARTNER"]); them(LAI, "0900000022", ["ACCOUNTING", "PARTNER"]); them(HDV, "0900000023", ["FIELD"]);
  const ok = await w.call("GET", "/api/pricing/nguoi-huong?q=a", { as: KT });
  assert.equal(ok.status, 200, ok.text);
  for (const [nhan, as] of [["Đối tác", DT], ["lai Kế toán + Đối tác", LAI], ["HDV", HDV], ["Tài xế công ty", TXC], ["Tài xế đối tác", TXDT], ["Nhân sự", NS]] as const) {
    const r = await w.call("GET", "/api/pricing/nguoi-huong?q=a", { as });
    assert.equal(r.status, 403, `${nhan}: ${r.status} ${r.text}`);
  }
});
