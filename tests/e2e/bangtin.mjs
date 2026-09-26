// Bảng tin (ADR-0022): WebSocket báo "đơn vừa đổi" tức thì tới mọi màn hình đang mở, và đóng kết nối khi tài khoản đổi/bảo trì bật.
// Kịch bản này chạy TRƯỚC `maintenance.mjs` (tự bật/tắt bảo trì ở ca 10, khôi phục ở `finally` — không đụng salesB/field mà `passkey.mjs` đổi)
// và SAU `company.mjs` (tests/e2e/run.mjs: mảng ALL).
//
// Hạn sống kết nối bị RÚT NGẮN cho e2e (`BANG_TIN_HAN_GIAY=20`, run.mjs) — mỗi ca dưới đây mở kết nối MỚI ngay trước thao tác ghi và đóng
// ngay sau (`moiPhien`/`dongHet`), không giữ kết nối qua nhiều ca (task-7-brief Bước 2).
//
// CA 1–8 (bắt tay 401/403/426/101; ai nhận tin theo quyền — NT-4; 8 điểm phát DP-1; Đối tác + nhãn giả BT-2; ping/pong BT-3; hạn sống KN-1)
// + CA 9, CA 10 (Task 6 — KN-2: đóng kết nối khi đổi tài khoản / bảo trì).
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, batTay, call, cho, ensureFakeCatalog, moBangTin, orderInput, randomPhone, session, sql } from "./lib.mjs";

await ensureFakeCatalog(); // "catalog" (Sheet thật) chạy trước "bangtin" trong ALL và đặt in_sheet = 0 cho mã giả — orderInput() dùng ZE1.
const ADMIN = await session(ACCOUNTS.admin);
const adminId = (await call(ADMIN, "GET", "/api/auth/me")).body.staff.id;

/**
 * Mở một loạt kết nối Bảng tin MỚI ngay trước một thao tác ghi (mỗi phần tử là cookie phiên, hoặc `{ cookie, opts }` để truyền `origin`/`headers`
 * riêng cho `moBangTin`) — trả mảng theo đúng thứ tự truyền vào. Dùng cho mọi ca (1–10): hạn sống e2e ngắn nên không giữ kết nối cũ qua ca sau.
 */
async function moiPhien(...danhSach) {
  return Promise.all(danhSach.map((x) => (typeof x === "string" ? moBangTin(x) : moBangTin(x.cookie, x.opts))));
}

/** Đóng mọi phiên đã mở ở một ca (dọn dẹp cuối ca, kể cả khi assert đã ném) — bỏ qua lỗi (đóng một kết nối đã đóng không sao). */
function dongHet(...phiens) {
  for (const p of phiens) {
    try {
      p.dongLai();
    } catch {
      // đã đóng — bỏ qua
    }
  }
}

/** Chờ `ms` mili-giây (chờ ổn định sau khi tin đầu đã tới, để một lần phát đôi không lọt qua kiểm "đúng MỘT tin"). */
const yen = (ms) => new Promise((res) => setTimeout(res, ms));
/** Khoảng chờ ổn định sau tin đầu (KHÔNG áp cho mốc "< 2 giây" của tin đầu tiên). */
const ON_DINH_MS = 300;

/** Đợi `promise` (thường là `phien.dong`) tối đa `ms`; hết giờ mà chưa xong → trả `null` (bên gọi tự `assert`, không ném ở đây). */
function doiToiDa(promise, ms) {
  return Promise.race([promise, new Promise((res) => setTimeout(() => res(null), ms))]);
}

/** Tài khoản SALES dùng MỘT LẦN cho riêng một ca (randomPhone) — không đụng tài khoản dùng chung (salesA/B, admin, accountant, field) mà
 * các kịch bản khác (đặc biệt `passkey.mjs`, chạy cuối cùng) cần giữ nguyên trạng. */
async function taoTaiKhoanDungMotLan(name, permissions = ["SALES"]) {
  const phone = randomPhone();
  const r = await call(ADMIN, "POST", "/api/staff", { fullName: name, phone, permissions });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const cookie = await session({ phone, pin: r.body.pin });
  return { id: r.body.staff.id, phone, cookie };
}

// === CA 1 (BT-1): bắt tay — không cookie → 401; Origin lạ / vắng → 403 cross_origin; thiếu Upgrade: websocket → 426; đúng → mở (101). ======
{
  assert.equal(await batTay(null, { upgrade: "websocket", connection: "Upgrade", origin: BASE }), 401, "ca 1: không cookie → 401");
  assert.equal(await batTay(ADMIN, { upgrade: "websocket", connection: "Upgrade", origin: "https://khac.tourdao.vn" }), 403, "ca 1: Origin lạ → 403");
  assert.equal(await batTay(ADMIN, { upgrade: "websocket", connection: "Upgrade" }), 403, "ca 1: vắng Origin → 403");
  assert.equal(await batTay(ADMIN, { connection: "Upgrade", origin: BASE }), 426, "ca 1: thiếu header Upgrade: websocket → 426");
  const phien = (await moiPhien(ADMIN))[0];
  dongHet(phien);
  console.log("✓ ca 1: bắt tay — không cookie → 401; Origin lạ/vắng → 403; thiếu Upgrade → 426; đúng → mở (101)");
}

// === CA 2: chuẩn bị phiên (cookie) cho ca 3–8 — salesA/salesB/kế toán/field (đã có sẵn ở D1 tạm, run.mjs nạp) + hai tài khoản CHỈ Đối tác MỚI
// (PARTNER, dùng một lần — không đụng ACCOUNTS dùng chung mà các kịch bản khác cần). ======================================================
const salesACookie = await session(ACCOUNTS.salesA);
const salesBCookie = await session(ACCOUNTS.salesB);
const accountantCookie = await session(ACCOUNTS.accountant);
const fieldCookie = await session(ACCOUNTS.field);
const meOf = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff;
const [salesAMe, salesBMe, fieldMe] = await Promise.all([meOf(salesACookie), meOf(salesBCookie), meOf(fieldCookie)]);
const salesAId = salesAMe.id;
const salesBId = salesBMe.id;
const fieldId = fieldMe.id;
const P1 = await taoTaiKhoanDungMotLan("Đối Tác Bảng Tin 1 (test)", ["PARTNER"]);
const P2 = await taoTaiKhoanDungMotLan("Đối Tác Bảng Tin 2 (test)", ["PARTNER"]);
{
  assert.ok(salesACookie && salesBCookie && accountantCookie && fieldCookie && P1.cookie && P2.cookie, "ca 2: chuẩn bị đủ 6 phiên (salesA/salesB/kế toán/field/hai tài khoản Đối tác)");
  console.log("✓ ca 2: chuẩn bị phiên salesA/salesB/kế toán/field + hai tài khoản Đối tác mới (dùng một lần)");
}

// === CA 3 (DP-1 POST /api/orders; NT-4): salesA lập đơn → salesA/salesB/kế toán (order.view = any) nhận đúng MỘT tin 'tao' đủ 5 khoá (maDon
// khớp orderCode) trong 2 giây; Đối tác không liên quan và field (order.view = none) không nhận. ==========================================
{
  const [pA, pB, pAcc, pField, pP1] = await moiPhien(salesACookie, salesBCookie, accountantCookie, fieldCookie, P1.cookie);
  try {
    const r = await call(salesACookie, "POST", "/api/orders", orderInput());
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const order = r.body.order;
    for (const [ten, p] of [["salesA", pA], ["salesB", pB], ["kế toán", pAcc]]) {
      assert.ok(await p.cho((tin) => tin.some((t) => t.orderId === order.id && t.thayDoi === "tao" && t.maDon === order.orderCode)), `ca 3: ${ten} phải nhận đúng một tin 'tao' (mã đơn khớp) trong 2 giây`);
      await yen(ON_DINH_MS); // tin đầu đã tới: chờ ổn định để lần phát đôi (nếu có) hiện ra
      const cuaDon = p.tin.filter((t) => t.orderId === order.id);
      assert.equal(cuaDon.length, 1, `ca 3: ${ten} chỉ nhận đúng MỘT tin cho đơn này`);
      assert.deepEqual(Object.keys(cuaDon[0]).sort(), ["loai", "luc", "maDon", "orderId", "thayDoi"], `ca 3: khung tin của ${ten} phải có đúng 5 khoá`);
    }
    assert.equal(pP1.tin.filter((t) => t.orderId === order.id).length, 0, "ca 3: Đối tác không liên quan không nhận tin đơn của salesA");
    assert.equal(pField.tin.filter((t) => t.orderId === order.id).length, 0, "ca 3: field (order.view = none) không nhận tin đơn");
  } finally {
    dongHet(pA, pB, pAcc, pField, pP1);
  }
  console.log("✓ ca 3: lập đơn → văn phòng (salesA/salesB/kế toán) nhận đúng một tin 'tao' đủ 5 khoá trong 2 giây; Đối tác/field không nhận");
}

// === CA 4 (DP-1 PUT /api/orders/:id/handler — nhan/giao; NT-2 handlerTruoc): đóng dòng người phụ trách bằng SQL rồi salesB Nhận → văn phòng
// nhận 'nhan', field (chưa liên quan) thì không; salesA giao cho field (ADR-0014 điều 6: field nay đủ điều kiện làm người phụ trách cấp hẹp)
// → field nhận 'giao'; salesA giao tiếp từ field sang salesB → field VẪN nhận (là người phụ trách TRƯỚC thay đổi, NT-2), thêm một tin 'giao'. ==
{
  const o4 = (await call(salesACookie, "POST", "/api/orders", orderInput())).body.order;
  await sql(`UPDATE dsp_assignment SET valid_to_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE order_id = '${o4.id}' AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL`);
  const [pA, pB, pAcc, pField] = await moiPhien(salesACookie, salesBCookie, accountantCookie, fieldCookie);
  try {
    let r = await call(salesBCookie, "PUT", `/api/orders/${o4.id}/handler`, { staffId: salesBId });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    for (const [ten, p] of [["salesA", pA], ["salesB", pB], ["kế toán", pAcc]]) {
      assert.ok(await p.cho((tin) => tin.some((t) => t.orderId === o4.id && t.thayDoi === "nhan")), `ca 4: ${ten} phải nhận tin 'nhan' trong 2 giây`);
    }
    assert.equal(pField.tin.filter((t) => t.orderId === o4.id).length, 0, "ca 4: field chưa liên quan tới đơn, chưa nhận tin nào");

    r = await call(salesACookie, "PUT", `/api/orders/${o4.id}/handler`, { staffId: fieldId });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(await pField.cho((tin) => tin.some((t) => t.orderId === o4.id && t.thayDoi === "giao")), "ca 4: field vừa được giao phải nhận tin 'giao' trong 2 giây");
    await yen(ON_DINH_MS);
    assert.equal(pField.tin.filter((t) => t.orderId === o4.id).length, 1, "ca 4: field nhận đúng MỘT tin ở lượt giao này");

    r = await call(salesACookie, "PUT", `/api/orders/${o4.id}/handler`, { staffId: salesBId });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(
      await cho(() => pField.tin.filter((t) => t.orderId === o4.id && t.thayDoi === "giao").length === 2, 2000),
      "ca 4: field nhận THÊM một tin 'giao' khi bị đổi đi (là người phụ trách TRƯỚC thay đổi — NT-2), tổng cộng 2 tin 'giao'",
    );
    await yen(ON_DINH_MS);
    assert.equal(pField.tin.filter((t) => t.orderId === o4.id).length, 2, "ca 4: sau khi ổn định field vẫn đúng 2 tin (không phát đôi)");
  } finally {
    dongHet(pA, pB, pAcc, pField);
  }
  console.log("✓ ca 4: nhận đơn chưa có người → văn phòng nhận 'nhan'; giao cho field → field nhận 'giao'; giao tiếp đi → field vẫn nhận (là người phụ trách trước)");
}

// === CA 5 (DP-1, 6 route còn lại): PUT /api/orders/:id (sua), PUT .../trip (chuyen), PUT .../booker (sua), POST .../status (xac_nhan),
// POST .../handler-cancel (huy), POST .../handler-money-edit (tien) — mỗi route MỘT lần thành công (đúng một tin, đúng thayDoi, trong 2 giây)
// + MỘT lần thất bại (403/409) → không tin nào trong 1,5 giây; PUT .../trip và PUT .../booker còn thêm một lần thân "không đổi gì" → không tin. =
{
  const svcTripOf = (sv) => ({
    departDate: sv.departDate ?? "", departTime: sv.departTime ?? "", pickupTime: sv.pickupTime ?? "", pickupPlace: sv.pickupPlace ?? "",
    checkinDate: sv.checkinDate ?? "", checkinTime: sv.checkinTime ?? "", checkinPlace: sv.checkinPlace ?? "", note: sv.note ?? "",
  });
  const putTrip = (cookie, order, changes = {}) =>
    call(cookie, "PUT", `/api/orders/${order.id}/trip`, { expectedUpdatedAt: order.updatedAt, services: [{ id: order.services[0].id, ...svcTripOf(order.services[0]), ...changes }] });
  const putBooker = (cookie, order, patch = {}) =>
    call(cookie, "PUT", `/api/orders/${order.id}/booker`, { customerName: order.customerName, customerPhone: order.customerPhone, bookerPartyId: order.bookerPartyId ?? null, expectedUpdatedAt: order.updatedAt, ...patch });
  /** Đợi đúng một tin `thayDoi` của `orderId` trên `phien`, trong `ms`; và khẳng định không có tin thứ hai. */
  const motTinDung = async (phien, orderId, thayDoi, moTa, ms = 2000) => {
    assert.ok(await phien.cho((tin) => tin.some((t) => t.orderId === orderId && t.thayDoi === thayDoi)), `${moTa}: phải nhận đúng một tin '${thayDoi}' trong ${ms}ms`);
    await yen(ON_DINH_MS); // tin đầu đã tới: chờ ổn định để lần phát đôi (route gọi baoThayDoi hai lần) hiện ra
    assert.equal(phien.tin.filter((t) => t.orderId === orderId).length, 1, `${moTa}: chỉ đúng MỘT tin cho đơn này`);
  };
  /** Đợi `ms` rồi khẳng định KHÔNG có tin nào cho `orderId` trên `phien` (nhánh lỗi/không đổi gì của DP-1). */
  const khongTinNao = async (phien, orderId, moTa, ms = 1500) => {
    await new Promise((res) => setTimeout(res, ms));
    assert.equal(phien.tin.filter((t) => t.orderId === orderId).length, 0, `${moTa}: không tin nào trong ${ms}ms`);
  };

  const C = await taoTaiKhoanDungMotLan("SALES không liên quan (ca 5, test)");

  // --- PUT /api/orders/:id → 'sua' ---
  {
    let o = (await call(salesACookie, "POST", "/api/orders", orderInput())).body.order;
    let phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await call(salesACookie, "PUT", `/api/orders/${o.id}`, orderInput({ customerNote: "ca 5: sửa đơn", expectedUpdatedAt: o.updatedAt }));
      assert.equal(r.status, 200, JSON.stringify(r.body));
      o = r.body.order;
      await motTinDung(phien, o.id, "sua", "ca 5a PUT /api/orders/:id thành công");
    } finally { dongHet(phien); }

    phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await call(C.cookie, "PUT", `/api/orders/${o.id}`, orderInput({ customerNote: "không được phép", expectedUpdatedAt: o.updatedAt }));
      assert.equal(r.status, 403, JSON.stringify(r.body));
      await khongTinNao(phien, o.id, "ca 5a PUT /api/orders/:id thất bại (403, không liên quan)");
    } finally { dongHet(phien); }
  }
  console.log("✓ ca 5a: PUT /api/orders/:id — thành công → một tin 'sua'; 403 (không liên quan) → không tin nào");

  // --- PUT /api/orders/:id/trip → 'chuyen' ---
  {
    let o = (await call(salesACookie, "POST", "/api/orders", orderInput())).body.order;
    let phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await putTrip(salesACookie, o, { note: "ca 5: đổi ghi chú chuyến" });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      o = r.body.order;
      await motTinDung(phien, o.id, "chuyen", "ca 5b PUT /api/orders/:id/trip thành công");
    } finally { dongHet(phien); }

    phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await putTrip(C.cookie, o, { note: "không được phép" });
      assert.equal(r.status, 403, JSON.stringify(r.body));
      await khongTinNao(phien, o.id, "ca 5b PUT /api/orders/:id/trip thất bại (403, không liên quan)");
    } finally { dongHet(phien); }

    phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await putTrip(salesACookie, o); // không đổi gì
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.order.updatedAt, o.updatedAt, "ca 5b PUT /trip 'không đổi gì': updatedAt không đổi");
      await khongTinNao(phien, o.id, "ca 5b PUT /api/orders/:id/trip 'không đổi gì'");
    } finally { dongHet(phien); }
  }
  console.log("✓ ca 5b: PUT /api/orders/:id/trip — thành công → một tin 'chuyen'; 403 → không tin; thân 'không đổi gì' → không tin");

  // --- PUT /api/orders/:id/booker → 'sua' ---
  {
    let o = (await call(salesACookie, "POST", "/api/orders", orderInput())).body.order;
    let phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await putBooker(salesACookie, o, { customerName: "Ca 5 Đổi Khách" });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      o = r.body.order;
      await motTinDung(phien, o.id, "sua", "ca 5c PUT /api/orders/:id/booker thành công");
    } finally { dongHet(phien); }

    phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await putBooker(C.cookie, o, { customerName: "Không được phép" });
      assert.equal(r.status, 403, JSON.stringify(r.body));
      await khongTinNao(phien, o.id, "ca 5c PUT /api/orders/:id/booker thất bại (403, không liên quan)");
    } finally { dongHet(phien); }

    phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await putBooker(salesACookie, o); // không đổi gì
      assert.equal(r.status, 200, JSON.stringify(r.body));
      await khongTinNao(phien, o.id, "ca 5c PUT /api/orders/:id/booker 'không đổi gì'");
    } finally { dongHet(phien); }
  }
  console.log("✓ ca 5c: PUT /api/orders/:id/booker — thành công → một tin 'sua'; 403 → không tin; thân 'không đổi gì' → không tin");

  // --- POST /api/orders/:id/status → 'xac_nhan' ---
  {
    const o = (await call(salesACookie, "POST", "/api/orders", orderInput())).body.order;
    let phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await call(salesACookie, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      await motTinDung(phien, o.id, "xac_nhan", "ca 5d POST /api/orders/:id/status thành công");
    } finally { dongHet(phien); }

    phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await call(salesACookie, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" }); // đã xác nhận rồi
      assert.equal(r.status, 409, JSON.stringify(r.body));
      assert.equal(r.body.error.code, "invalid_transition", JSON.stringify(r.body));
      await khongTinNao(phien, o.id, "ca 5d POST /api/orders/:id/status thất bại (409 invalid_transition)");
    } finally { dongHet(phien); }
  }
  console.log("✓ ca 5d: POST /api/orders/:id/status — thành công → một tin 'xac_nhan'; 409 (đã xác nhận rồi) → không tin nào");

  // --- POST /api/orders/:id/handler-cancel → 'huy' (FIELD đang phụ trách, ADR-0014 điều 11) ---
  {
    const o = (await call(salesACookie, "POST", "/api/orders", orderInput())).body.order;
    assert.equal((await call(salesACookie, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 200);
    assert.equal((await call(salesACookie, "PUT", `/api/orders/${o.id}/handler`, { staffId: fieldId })).status, 200);
    let phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await call(fieldCookie, "POST", `/api/orders/${o.id}/handler-cancel`, { reason: "customer_requested" });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      await motTinDung(phien, o.id, "huy", "ca 5e POST /api/orders/:id/handler-cancel thành công");
    } finally { dongHet(phien); }

    // Thất bại: field CHƯA phải người phụ trách của một đơn xác nhận khác → 403.
    const o5b = (await call(salesACookie, "POST", "/api/orders", orderInput())).body.order;
    assert.equal((await call(salesACookie, "POST", `/api/orders/${o5b.id}/status`, { status: "confirmed" })).status, 200);
    phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await call(fieldCookie, "POST", `/api/orders/${o5b.id}/handler-cancel`, { reason: "customer_requested" });
      assert.equal(r.status, 403, JSON.stringify(r.body));
      await khongTinNao(phien, o5b.id, "ca 5e POST /api/orders/:id/handler-cancel thất bại (403, field chưa được giao)");
    } finally { dongHet(phien); }
  }
  console.log("✓ ca 5e: POST /api/orders/:id/handler-cancel — thành công (field đang phụ trách) → một tin 'huy'; 403 (chưa được giao) → không tin nào");

  // --- POST /api/orders/:id/handler-money-edit → 'tien' (FIELD đang phụ trách, ADR-0014 điều 6) ---
  {
    const o = (await call(salesACookie, "POST", "/api/orders", orderInput())).body.order;
    assert.equal((await call(salesACookie, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 200);
    assert.equal((await call(salesACookie, "PUT", `/api/orders/${o.id}/handler`, { staffId: fieldId })).status, 200);
    const svcId = o.services[0].id;
    let phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await call(fieldCookie, "POST", `/api/orders/${o.id}/handler-money-edit`, { reason: "ca 5: khách báo thêm người", services: [{ id: svcId, pax: { adult: 2, child: 0, senior: 0, infant: 0 } }] });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      await motTinDung(phien, o.id, "tien", "ca 5f POST /api/orders/:id/handler-money-edit thành công");
    } finally { dongHet(phien); }

    const o5b = (await call(salesACookie, "POST", "/api/orders", orderInput())).body.order;
    assert.equal((await call(salesACookie, "POST", `/api/orders/${o5b.id}/status`, { status: "confirmed" })).status, 200);
    phien = (await moiPhien(salesACookie))[0];
    try {
      const r = await call(fieldCookie, "POST", `/api/orders/${o5b.id}/handler-money-edit`, { reason: "x", services: [{ id: o5b.services[0].id, pax: { adult: 2, child: 0, senior: 0, infant: 0 } }] });
      assert.equal(r.status, 403, JSON.stringify(r.body));
      await khongTinNao(phien, o5b.id, "ca 5f POST /api/orders/:id/handler-money-edit thất bại (403, field chưa được giao)");
    } finally { dongHet(phien); }
  }
  console.log("✓ ca 5f: POST /api/orders/:id/handler-money-edit — thành công (field đang phụ trách) → một tin 'tien'; 403 (chưa được giao) → không tin nào");
}

// === CA 6 (order.view = own của PARTNER; BT-2): Đối tác lập đơn của mình → chính Đối tác đó nhận (tin 'tao_cho_nhan' — tài khoản CHỈ Đối tác
// KHÔNG tự thành người phụ trách, ADR-0014 điều 9/10); Đối tác thứ hai không liên quan không nhận; văn phòng vẫn nhận. Đối tác bắt tay kèm
// header giả x-bang-tin-nhan: ["tat-ca","cho-nhan"] → vẫn KHÔNG nhận được tin đơn NGƯỜI KHÁC (BT-2: máy chủ dựng nhãn mới, bỏ header trình duyệt). =
{
  const [pP1, pP1Gia, pP2, pOffice] = await moiPhien(
    P1.cookie,
    { cookie: P1.cookie, opts: { headers: { "x-bang-tin-nhan": '["tat-ca","cho-nhan"]' } } },
    P2.cookie,
    salesACookie,
  );
  try {
    const r = await call(P1.cookie, "POST", "/api/orders", orderInput());
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const order = r.body.order;
    for (const [ten, p] of [["chính Đối tác (kết nối thường)", pP1], ["chính Đối tác (kết nối gửi nhãn giả)", pP1Gia], ["văn phòng", pOffice]]) {
      assert.ok(await p.cho((tin) => tin.some((t) => t.orderId === order.id && t.thayDoi === "tao_cho_nhan")), `ca 6: ${ten} phải nhận tin 'tao_cho_nhan' của đơn Đối tác lập, trong 2 giây`);
    }
    assert.equal(pP2.tin.filter((t) => t.orderId === order.id).length, 0, "ca 6: Đối tác thứ hai không liên quan không nhận tin đơn của Đối tác thứ nhất");

    // BT-2: đơn của MỘT NGƯỜI KHÁC (salesA) — kết nối gửi nhãn giả "tat-ca"/"cho-nhan" của Đối tác vẫn KHÔNG nhận được.
    const r2 = await call(salesACookie, "POST", "/api/orders", orderInput());
    assert.equal(r2.status, 201, JSON.stringify(r2.body));
    // Đối chứng dương: người lập (salesA, văn phòng) chắc chắn phải nhận tin của r2 — tới lúc đó tin phát chậm (nếu có) cũng đã tới pP1Gia; rồi chờ đủ 1,5 giây như mọi kiểm âm khác.
    assert.ok(await pOffice.cho((tin) => tin.some((t) => t.orderId === r2.body.order.id)), "ca 6 (BT-2): đối chứng — người lập (văn phòng) phải nhận tin đơn của mình trong 2 giây");
    await yen(1500);
    assert.equal(pP1Gia.tin.filter((t) => t.orderId === r2.body.order.id).length, 0, `ca 6 (BT-2): header giả 'x-bang-tin-nhan: ["tat-ca","cho-nhan"]' bị máy chủ bỏ qua — Đối tác vẫn không nhận tin đơn người khác`);
  } finally {
    dongHet(pP1, pP1Gia, pP2, pOffice);
  }
  console.log("✓ ca 6: Đối tác lập đơn của mình → chính mình nhận 'tao_cho_nhan'; Đối tác khác không nhận; văn phòng nhận; header nhãn giả (BT-2) không mở rộng được phạm vi nhận");
}

// === CA 7 (BT-3): gửi 'ping' → nhận 'pong' tự động (khung văn bản bình thường trên đường truyền nhưng không phải SuKienDon nên không vào `tin`
// — đọc `raw`); gửi chuỗi rác → bị bỏ qua hoàn toàn (không có gì trong `tin` lẫn `raw`), kết nối vẫn mở. ==================================
{
  const phien = (await moiPhien(ADMIN))[0];
  try {
    phien.gui("ping");
    assert.ok(await cho(() => phien.raw.includes("pong"), 2000), "ca 7: gửi 'ping' phải nhận 'pong' tự động (BT-3, không đánh thức trạm)");
    const soRawTruoc = phien.raw.length;
    phien.gui("một chuỗi rác không phải JSON, không phải 'ping'");
    await new Promise((res) => setTimeout(res, 300));
    assert.equal(phien.raw.length, soRawTruoc, "ca 7: gửi rác không được máy chủ đáp lại gì (không thêm khung văn bản nào)");
    assert.equal(phien.tin.length, 0, "ca 7: không có tin đơn (SuKienDon) nào phát sinh từ ping/rác");
    const conMo = await doiToiDa(phien.dong, 300);
    assert.equal(conMo, null, "ca 7: kết nối vẫn MỞ sau khi gửi ping/rác (trạm không đóng, không ném lỗi)");
  } finally {
    dongHet(phien);
  }
  console.log("✓ ca 7: gửi 'ping' → nhận 'pong' tự động (không phát vào tin đơn); gửi rác → bị bỏ qua, kết nối vẫn mở");
}

// === CA 8 (KN-1): hạn sống kết nối = BANG_TIN_HAN_GIAY (20 giây ở e2e) — trạm đóng mã 4001 (không phát gì) trong ≤ 23 giây nhờ alarm; không
// đóng SỚM hơn hạn sống. CHẠY CUỐI CÙNG của ca 1–8 (giữ một kết nối sống 20+ giây trong khi các ca khác đều mở/đóng ngay lập tức). ==========
{
  const phien = (await moiPhien(ADMIN))[0];
  const mocMo = Date.now();
  try {
    const dong = await doiToiDa(phien.dong, 23_000);
    assert.ok(dong, "ca 8: kết nối phải bị trạm đóng trong ≤ 23 giây (hạn 20 giây + tối đa vài giây cho alarm/độ trễ Miniflare)");
    assert.equal(dong.code, 4001, "ca 8: mã đóng khi hết hạn sống phải là 4001 (KN-1), không phải 4003 (KN-2)");
    assert.ok(Date.now() - mocMo >= 19_500, "ca 8: không được đóng SỚM hơn hạn sống 20 giây (trừ dung sai 0,5 giây)");
    assert.equal(phien.tin.length, 0, "ca 8: hết hạn sống không phát tin đơn nào, chỉ đóng");
  } finally {
    dongHet(phien);
  }
  console.log(`✓ ca 8: hết hạn sống (BANG_TIN_HAN_GIAY=20) → trạm tự đóng mã 4001 sau ${Date.now() - mocMo}ms (không sớm hơn 20s), không phát gì`);
}

// === CA 9 (KN-2, Task 6): tạm ngưng rồi kích hoạt lại tài khoản dùng một lần → kết nối của nó đóng 4003 trong < 2 giây; kết nối người khác
// (admin) vẫn mở; kích hoạt lại thành công. ==============================================================================================
{
  const E = await taoTaiKhoanDungMotLan("Tạm Ngưng Bảng Tin (test)");
  const [phienE, phienAdmin] = await moiPhien(E.cookie, ADMIN);
  try {
    let r = await call(ADMIN, "PATCH", `/api/staff/${E.id}`, { active: false });
    assert.equal(r.status, 200, JSON.stringify(r.body));

    const dongE = await doiToiDa(phienE.dong, 2000);
    assert.ok(dongE, "ca 9: kết nối của tài khoản bị tạm ngưng phải đóng trong 2 giây");
    assert.equal(dongE.code, 4003, "ca 9: mã đóng phải là 4003 (cập nhật tài khoản), không phải 4001 (hết hạn)");

    const conAdmin = await doiToiDa(phienAdmin.dong, 300);
    assert.equal(conAdmin, null, "ca 9: kết nối của admin (người khác) KHÔNG được đóng khi tài khoản E bị ngưng");

    r = await call(ADMIN, "PATCH", `/api/staff/${E.id}`, { active: true });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  } finally {
    dongHet(phienE, phienAdmin);
  }
  console.log("✓ ca 9: tạm ngưng tài khoản → kết nối của nó đóng 4003 trong 2 giây; kết nối người khác vẫn mở; kích hoạt lại thành công");
}

// === CA 10 (KN-2, Task 6): bật chế độ bảo trì → MỌI kết nối đóng; bắt tay lại của tài khoản không được phép → 503; tắt bảo trì ở `finally`.
// Theo cùng cách `maintenance.mjs`: server e2e không có SĐT được phép mặc định của production, tạm đặt = SĐT admin test rồi khôi phục. ======
{
  const SEED_ALLOWED = "0989929373";
  const SALES = await session(ACCOUNTS.salesA);
  const [phienAdmin, phienSales] = await moiPhien(ADMIN, SALES);
  try {
    await sql(`UPDATE mnt_setting SET allowed_phones = '${ACCOUNTS.admin.phone}' WHERE id = 'default'`);
    const endsAt = new Date(Date.now() + 30 * 60_000).toISOString();
    let r = await call(ADMIN, "PUT", "/api/maintenance", { on: true, endsAt });
    assert.equal(r.status, 200, JSON.stringify(r.body));

    for (const [ten, phien] of [["admin", phienAdmin], ["salesA", phienSales]]) {
      const dong = await doiToiDa(phien.dong, 2000);
      assert.ok(dong, `ca 10: kết nối của ${ten} phải đóng trong 2 giây khi bật bảo trì`);
      assert.equal(dong.code, 4003, `ca 10: mã đóng của ${ten} phải là 4003`);
    }

    const status = await batTay(SALES, { upgrade: "websocket", connection: "Upgrade", origin: BASE });
    assert.equal(status, 503, "ca 10: bắt tay lại của salesA (không được phép) khi đang bảo trì phải bị chặn 503, không mở kết nối");
  } finally {
    dongHet(phienAdmin, phienSales);
    await call(ADMIN, "PUT", "/api/maintenance", { on: false }).catch(() => {});
    await sql(`UPDATE mnt_setting SET enabled = 0, ends_at = NULL, allowed_phones = '${SEED_ALLOWED}' WHERE id = 'default'`);
    // KHÔNG dọn hai dòng nhật ký `maintenance_changed` vừa tạo: `audit_log` chỉ-thêm được CƯỠNG CHẾ bằng trigger SQL `audit_append_only`
    // (không chỉ là quy ước tài liệu — `DELETE` bị chặn cả trên D1 tạm của e2e, đã tự thử và thấy `SQLITE_CONSTRAINT_TRIGGER`). Ca này CHẠY
    // TRƯỚC `maintenance.mjs` (tests/e2e/run.mjs) nên hai dòng còn lại là "nhiễu" hợp lệ — `maintenance.mjs` đếm theo MỐC THỜI GIAN của
    // chính nó (biến `moc`), không theo tổng số dòng, nên không bị ảnh hưởng.
  }
  console.log("✓ ca 10: bật bảo trì đóng mọi kết nối (4003, kể cả admin); bắt tay lại của tài khoản không được phép → 503; đã tắt bảo trì");
}

console.log("E2E BANG TIN (ca 1–10) OK");
