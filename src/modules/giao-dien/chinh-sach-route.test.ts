// Route chính sách giao diện (ADR-0194 đợt 1, nhiệm vụ 3): GET phần áp cho CHÍNH người gọi (no-store), GET tất cả + POST chỉ ô settings.ops, kiểm danh mục/cờ/chế độ,
// nhật ký chỉ ghi mã màn, mã trường, quyền, chế độ. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Bảng rỗng = không đổi gì.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ACC, ADM, INTERN, PARTNER, SUP, setup } from "../../../tests/audit/xac-nhan-khung.mjs";

const U = "/api/cai-dat/giao-dien";
type W = ReturnType<typeof setup>;
const doc = async (w: W, as: string) => (await w.call("GET", U, { as })).json.truong as { man: string; truong: string; an: boolean; batBuoc: boolean }[];
const dat = (w: W, as: string, man: string, thayDoi: unknown) => w.call("POST", U, { as, body: { man, thayDoi } });
const AN_PAX = [{ truong: "passengers", quyen: "SALES", cheDo: "AN" }];
const soDong = (w: W) => Number(w.q("SELECT count(*) AS n FROM gd_field_policy")[0].n);

test("GET: bảng rỗng ⇒ danh sách rỗng, no-store; mọi người đăng nhập đọc được (kể cả Đối tác)", async () => {
  const w = setup();
  for (const as of [A, ACC, ADM, SUP, INTERN, PARTNER]) {
    const r = await w.call("GET", U, { as });
    assert.equal(r.status, 200, `${as} ${r.text}`);
    assert.deepEqual(r.json.truong, []);
    assert.match(r.headers.get("cache-control") ?? "", /no-store/);
  }
  assert.equal((await w.call("GET", U)).status, 401, "chưa đăng nhập");
});

test("Toàn quyền ẩn passengers cho quyền Bán hàng ⇒ người chỉ có Bán hàng thấy ẩn; Kế toán thì không", async () => {
  const w = setup();
  const r = await dat(w, SUP, "tao-don", AN_PAX);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(await doc(w, A), [{ man: "tao-don", truong: "passengers", an: true, batBuoc: false }]);
  assert.deepEqual(await doc(w, ACC), []);
  assert.deepEqual(await doc(w, SUP), []);
});

test("POST: Quản trị / Bán hàng / Đối tác bị 403, không ghi gì; GET tất cả cũng chỉ Toàn quyền", async () => {
  const w = setup();
  for (const as of [ADM, A, ACC, PARTNER, INTERN]) {
    const r = await dat(w, as, "tao-don", AN_PAX);
    assert.equal(r.status, 403, `${as} ${r.text}`);
    assert.equal((await w.call("GET", `${U}/tat-ca`, { as })).status, 403, as);
  }
  assert.equal(soDong(w), 0);
  assert.equal((await w.call("GET", `${U}/tat-ca`, { as: SUP })).status, 200);
});

test("POST từ chối (400, không ghi): ẩn customerName / customerPhone / tiền; trường ngoài danh mục; màn lạ; quyền lạ; chế độ lạ; BAT_BUOC cho cột xem; thân hỏng", async () => {
  const w = setup();
  const xau = (b: unknown) => w.call("POST", U, { as: SUP, body: b });
  for (const t of ["customerName", "customerPhone", "services", "discount", "declaredDeposit", "paymentTerm", "handlerStaffId", "bookerPartyId"])
    assert.equal((await dat(w, SUP, "tao-don", [{ truong: t, quyen: "SALES", cheDo: "AN" }])).status, 400, t);
  assert.equal((await dat(w, SUP, "tao-don", [{ truong: "khongCoTruongNay", quyen: "SALES", cheDo: "AN" }])).status, 400);
  assert.equal((await dat(w, SUP, "man-la", AN_PAX)).status, 400);
  assert.equal((await dat(w, SUP, "tao-don", [{ truong: "passengers", quyen: "KHONG_PHAI_QUYEN", cheDo: "AN" }])).status, 400);
  assert.equal((await dat(w, SUP, "tao-don", [{ truong: "passengers", quyen: "SALES", cheDo: "ANH" }])).status, 400);
  assert.equal((await dat(w, SUP, "danh-sach-tai-khoan", [{ truong: "createdAt", quyen: "ADMIN", cheDo: "BAT_BUOC" }])).status, 400);
  assert.equal((await dat(w, SUP, "tao-don", [])).status, 400, "danh sách rỗng");
  assert.equal((await dat(w, SUP, "tao-don", "x")).status, 400);
  assert.equal((await xau(null)).status, 400);
  assert.equal((await xau({ man: "tao-don" })).status, 400);
  // một dòng xấu trong lô ⇒ cả lô không ghi
  assert.equal((await dat(w, SUP, "tao-don", [...AN_PAX, { truong: "customerName", quyen: "SALES", cheDo: "AN" }])).status, 400);
  assert.equal(soDong(w), 0);
});

test("BAT_BUOC cho trường tuỳ chọn: chỉ khi mọi quyền của người đó đòi; HIEN đặt lại mặc định", async () => {
  const w = setup();
  assert.equal((await dat(w, SUP, "tao-don", [{ truong: "customerEmail", quyen: "SALES", cheDo: "BAT_BUOC" }])).status, 200);
  assert.deepEqual(await doc(w, A), [{ man: "tao-don", truong: "customerEmail", an: false, batBuoc: true }]);
  assert.equal((await dat(w, SUP, "tao-don", [{ truong: "customerEmail", quyen: "SALES", cheDo: "HIEN" }])).status, 200);
  assert.deepEqual(await doc(w, A), []);
});

test("nhật ký ui_policy_changed: chỉ mã màn, mã trường, quyền, chế độ — không giá trị cá nhân; gửi đúng trạng thái đang có ⇒ 200, không ghi dòng", async () => {
  const w = setup();
  assert.equal((await dat(w, SUP, "tao-don", [{ truong: "passengers", quyen: "SALES", cheDo: "HIEN" }])).status, 200, "đúng mặc định");
  assert.equal(soDong(w), 0);
  assert.equal((await dat(w, SUP, "tao-don", AN_PAX)).status, 200);
  assert.equal(soDong(w), 1);
  const n = w.q("SELECT staff_id, target_type, detail FROM audit_log WHERE action = 'ui_policy_changed'");
  assert.equal(n.length, 1);
  assert.equal(n[0].staff_id, SUP);
  assert.match(String(n[0].detail), /tao-don/);
  assert.match(String(n[0].detail), /passengers/);
  assert.match(String(n[0].detail), /SALES/);
  assert.match(String(n[0].detail), /AN/);
  const lai = await dat(w, SUP, "tao-don", AN_PAX);
  assert.equal(lai.status, 200);
  assert.equal(soDong(w), 1, "không đổi ⇒ không ghi thêm");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'ui_policy_changed'")[0].n, 1);
});

test("Khôi phục mặc định từng màn: chèn dòng HIEN cho ô đang khác mặc định của ĐÚNG màn đó, nhật ký, không động màn khác", async () => {
  const w = setup();
  await dat(w, SUP, "tao-don", [...AN_PAX, { truong: "customerNote", quyen: "INTERN", cheDo: "AN" }]);
  await dat(w, SUP, "danh-sach-tai-khoan", [{ truong: "lastLoginAt", quyen: "ADMIN", cheDo: "AN" }]);
  assert.equal((await w.call("POST", `${U}/khoi-phuc`, { as: ADM, body: { man: "tao-don" } })).status, 403);
  assert.equal((await w.call("POST", `${U}/khoi-phuc`, { as: SUP, body: { man: "man-la" } })).status, 400);
  const r = await w.call("POST", `${U}/khoi-phuc`, { as: SUP, body: { man: "tao-don" } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(await doc(w, A), []);
  const tc = (await w.call("GET", `${U}/tat-ca`, { as: SUP })).json;
  assert.deepEqual(tc.dong.filter((d: { man: string; cheDo: string }) => d.man === "tao-don" && d.cheDo !== "HIEN"), []);
  assert.equal(tc.dong.filter((d: { man: string; cheDo: string }) => d.man === "danh-sach-tai-khoan" && d.cheDo === "AN").length, 1);
  assert.ok(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'ui_policy_changed'")[0].n >= 3);
});

test("GET tất cả: trả danh mục (màn, trường, cờ) + dòng đang hiệu lực + danh sách quyền", async () => {
  const w = setup();
  await dat(w, SUP, "tao-don", AN_PAX);
  const r = await w.call("GET", `${U}/tat-ca`, { as: SUP });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(r.json.dong, [{ man: "tao-don", truong: "passengers", quyen: "SALES", cheDo: "AN" }]);
  assert.ok(r.json.danhMuc.some((m: { man: string; truong: string; anDuoc: boolean }) => m.man === "tao-don" && m.truong === "passengers" && m.anDuoc === true));
  assert.ok(!r.json.danhMuc.some((m: { truong: string; anDuoc: boolean }) => m.truong === "customerName" && m.anDuoc));
  assert.ok(r.json.quyen.includes("SALES"));
});

test("dòng ngoài danh mục có sẵn trong bảng (ghi tay / danh mục thu hẹp sau này) bị BỎ QUA khi đọc, không làm vỡ", async () => {
  const w = setup();
  const at = new Date(Date.now() - 5000).toISOString();
  w.sqlite.prepare("INSERT INTO gd_field_policy (id, man, truong, quyen, che_do, valid_from_at, created_at, updated_at) VALUES ('x1','tao-don','customerName','SALES','AN',?,?,?)").run(at, at, at);
  w.sqlite.prepare("INSERT INTO gd_field_policy (id, man, truong, quyen, che_do, valid_from_at, created_at, updated_at) VALUES ('x2','tao-don','khongCo','SALES','AN',?,?,?)").run(at, at, at);
  assert.deepEqual(await doc(w, A), []);
});
