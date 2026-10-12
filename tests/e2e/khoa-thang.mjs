// Khoá sổ tháng (ADR-0080 phần D1; đặc tả docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/README.md §8, §12 mục 10 và 11c) trên D1 local THẬT (wrangler dev).
// Tháng đã khoá KHÔNG mở lại được, mà các kịch bản cùng nhóm dùng chung một D1 tạm ⇒ kịch bản này CHỈ khoá tháng 2025-01 và 2025-02: KHÔNG kịch bản e2e nào ghi tiền vào năm 2025
// (rà `grep -rn "2025-0[12]" tests/e2e` trước khi thêm kịch bản ghi tiền có ngày cố định). Lần khoá đầu tiên hợp lệ vì dòng sổ sớm nhất trên D1 e2e là tháng hiện tại (hoặc chưa có).
// Đứng CUỐI `ALL` (trước "passkey"): mọi kịch bản ghi tiền của nhóm đã chạy xong. run.mjs dựng D1 mới mỗi lần nên khoá không dồn qua lần chạy; chạy lẻ lại trên CÙNG một D1 thì bước 2 sẽ 409.
// Dùng accountant / admin / salesA (không đổi tài khoản dùng chung).
import assert from "node:assert/strict";
import { ACCOUNTS, call, ensureFakeCatalog, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const A = await session(ACCOUNTS.salesA);
const maLoi = (r) => r.body?.error?.code;
const khoa = (c, ky, body = {}) => call(c, "POST", `/api/ledger/ky/${ky}/khoa`, body);
const THANG_NAY = vnDate(0).slice(0, 7);

// ---- 1) Quản trị không giữ ô ledger.period.close ⇒ 403; Kế toán khoá tháng hiện tại ⇒ 400 (chỉ khoá được tháng đã qua)
let r = await khoa(ADM, "2025-01");
assert.equal(r.status, 403, JSON.stringify(r.body));
r = await khoa(ACC, THANG_NAY);
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.equal(maLoi(r), "period_not_past");
assert.equal(r.body.error.message, "Chỉ khoá được tháng đã qua.");
assert.equal((await sqlRows("SELECT count(*) AS n FROM ky_period_close"))[0].n, 0, "chưa có tháng nào bị khoá");
console.log("✓ 1) Quản trị khoá ⇒ 403; Kế toán khoá tháng hiện tại ⇒ 400 «Chỉ khoá được tháng đã qua.»; bảng khoá vẫn rỗng");

// ---- 2) 2025-01 ⇒ 201 + Location; 2025-03 ⇒ 409 (không liền kề); 2025-02 ⇒ 201; 2025-02 lần hai ⇒ 409. (Lần khoá đầu trên bảng rỗng phải là 2025-01, nếu không mọi tháng sau phải liền kề tháng đó.)
r = await khoa(ACC, "2025-01", { ghiChu: "Khoá thử e2e tháng 01/2025" });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.headers.get("location"), "/khoa-thang");
assert.deepEqual(r.body.daKhoa, ["2025-01"]);
r = await khoa(ACC, "2025-03");
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(maLoi(r), "period_not_adjacent");
assert.equal(r.body.error.message, "Phải khoá lần lượt — tháng khoá được kế tiếp là 02/2025.");
r = await khoa(ACC, "2025-02");
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await khoa(ACC, "2025-02");
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(maLoi(r), "period_already_closed");
const dong = await sqlRows("SELECT period, note FROM ky_period_close ORDER BY period");
assert.deepEqual(dong.map((x) => x.period), ["2025-01", "2025-02"]);
assert.equal(dong[0].note, "Khoá thử e2e tháng 01/2025");
assert.equal((await sqlRows("SELECT count(*) AS n FROM audit_log WHERE action = 'ledger_period_closed'"))[0].n, 2, "mỗi lần khoá thành công một dòng nhật ký");
console.log("✓ 2) Khoá 2025-01 ⇒ 201 + Location /khoa-thang; 2025-03 ⇒ 409 không liền kề (câu tiếng Việt); 2025-02 ⇒ 201; 2025-02 lần hai ⇒ 409 đã khoá; D1 đúng hai dòng + hai dòng nhật ký");

// ---- 3) Kế toán ghi lần thu có ngày phát sinh thuộc tháng đã khoá ⇒ 409 đúng câu, không chèn dòng nào. (Luật ngày phát sinh không có điều "không trước ngày lập đơn" —
// `ngayPhatSinh` ở src/modules/billing/rules.ts — nên đường lần thu chạm tới kiểm tháng khoá.)
const lap = await call(A, "POST", "/api/orders", orderInput({ services: [{ ...orderInput().services[0], departDate: vnDate(10) }] }));
assert.equal(lap.status, 201, JSON.stringify(lap.body));
const don = lap.body.order;
assert.equal((await call(A, "POST", `/api/orders/${don.id}/status`, { status: "confirmed" })).status, 200);
const demThu = async () => (await sqlRows(`SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = '${don.id}'`))[0].n;
const truoc = await demThu();
r = await call(ACC, "POST", `/api/orders/${don.id}/payments`, { soTien: 10000, hinhThuc: "CASH", nguoiThu: "cong_ty", ngayPhatSinh: "2025-02-15" });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(maLoi(r), "period_closed");
assert.equal(r.body.error.message, "Tháng 02/2025 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)");
assert.equal(await demThu(), truoc, "409 ⇒ không có lần thu mới");
assert.equal((await sqlRows("SELECT count(*) AS n FROM bil_payment_receipt WHERE substr(occurred_date, 1, 4) = '2025'"))[0].n, 0, "D1 không có lần thu nào năm 2025");
// đối chứng: cùng thân với ngày hôm nay ⇒ 201 (đường ghi không hỏng vì khoá tháng cũ)
r = await call(ACC, "POST", `/api/orders/${don.id}/payments`, { soTien: 10000, hinhThuc: "CASH", nguoiThu: "cong_ty" });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(await demThu(), truoc + 1);
console.log("✓ 3) Lần thu ngày 15/02/2025 ⇒ 409 period_closed «Tháng 02/2025 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)», không chèn dòng; ngày hôm nay ⇒ 201");

// ---- 4) GET /api/ledger/ky (Kế toán) ⇒ daKhoa chứa 2025-01, 2025-02; tháng khoá được kế tiếp 2025-03. Quản trị (ô ledger.view chỉ "own") ⇒ 403.
r = await call(ACC, "GET", "/api/ledger/ky");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.ok(r.body.daKhoa.includes("2025-01") && r.body.daKhoa.includes("2025-02"), JSON.stringify(r.body.daKhoa));
assert.equal(r.body.keTiep, "2025-03");
assert.equal(r.body.coTheKhoa, true);
assert.equal((await call(ADM, "GET", "/api/ledger/ky")).status, 403);
console.log("✓ 4) GET /api/ledger/ky: daKhoa có 2025-01, 2025-02; kế tiếp 2025-03; Quản trị 403");
console.log("E2E OK");
