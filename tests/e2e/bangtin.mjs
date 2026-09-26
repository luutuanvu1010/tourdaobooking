// Bảng tin (ADR-0022): WebSocket báo "đơn vừa đổi" tức thì tới mọi màn hình đang mở, và đóng kết nối khi tài khoản đổi/bảo trì bật.
// Kịch bản này chạy TRƯỚC `maintenance.mjs` (tự bật/tắt bảo trì ở ca 10, khôi phục ở `finally` — không đụng salesB/field mà `passkey.mjs` đổi)
// và SAU `company.mjs` (tests/e2e/run.mjs: mảng ALL).
//
// Hạn sống kết nối bị RÚT NGẮN cho e2e (`BANG_TIN_HAN_GIAY=20`, run.mjs) — mỗi ca dưới đây mở kết nối MỚI ngay trước thao tác ghi và đóng
// ngay sau (`moiPhien`/`dongHet`), không giữ kết nối qua nhiều ca (task-7-brief Bước 2).
//
// CA 1–8 (bắt tay 401/403/426/101; ai nhận tin theo quyền — NT-4; 8 điểm phát DP-1; Đối tác + nhãn giả BT-2; ping/pong BT-3; hạn sống KN-1)
// CHƯA VIẾT ở lượt này — một dispatch sau viết tiếp, đặt TRƯỚC "CA 9" dưới đây, dùng lại `ADMIN`/`adminId`/`moiPhien`/`dongHet`/`doiToiDa`
// đã khai trong tệp này. Tệp này chỉ có hạ tầng (helper) + CA 9, CA 10 (Task 6 — KN-2: đóng kết nối khi đổi tài khoản / bảo trì).
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, batTay, call, moBangTin, randomPhone, session, sql } from "./lib.mjs";

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

// === CA 1–8: TODO — xem chú thích đầu tệp. ==============================================================================================

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

console.log("E2E BANG TIN (ca 9–10) OK — ca 1–8 chưa viết (dispatch phiên sau)");
