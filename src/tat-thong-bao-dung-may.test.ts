// ADR-0046 (sửa ADR-0036 điều 6): tự tắt thông báo điện thoại chỉ ĐÚNG máy khi đăng xuất; đổi vai/quyền KHÔNG tắt; thao tác bảo mật (ngưng tài
// khoản, đổi SĐT, đổi/đặt lại PIN, gỡ Face ID) vẫn tắt MỌI máy. Chạy CẢ ứng dụng (router + mọi module) trên SQLite thật qua tests/audit/harness.mjs.
// `ctx.dongBangTin` là bắn-và-quên (exec.waitUntil của khung thử không chờ) → đợi một nhịp trước khi đọc bảng ntf_push_sub.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
const diaChi = () => `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
async function batMay(w: any, as: string): Promise<string> {
  const ep = diaChi();
  const r = await w.call("POST", "/api/account/thong-bao/may", { as, body: { endpoint: ep, thietBi: "Máy thử" } });
  assert.equal(r.status, 200, r.text);
  return ep;
}
const dong = (w: any, ep: string) => w.q("SELECT revoked_at, revoke_reason FROM ntf_push_sub WHERE endpoint = ?", ep)[0];
const dangBat = (w: any, staffId: string): number => w.q("SELECT count(*) n FROM ntf_push_sub WHERE staff_id = ? AND revoked_at IS NULL", staffId)[0].n;
const choMotNhip = () => new Promise((r) => setTimeout(r, 30));

test("ADR-0046 điểm 1: đăng xuất ({ endpoint, dangXuat: true }) chỉ tắt ĐÚNG máy đó (lý do dang-xuat); máy kia của cùng tài khoản vẫn bật", async () => {
  const w = setup();
  const may1 = await batMay(w, SALES);
  const may2 = await batMay(w, SALES);
  const r = await w.call("POST", "/api/account/thong-bao/may/huy", { as: SALES, body: { endpoint: may1, dangXuat: true } });
  assert.equal(r.status, 200, r.text);
  assert.ok(dong(w, may1).revoked_at, "máy đăng xuất phải hết hiệu lực");
  assert.equal(dong(w, may1).revoke_reason, "dang-xuat", "lý do phải là dang-xuat (không phải tu-tat)");
  assert.equal(dong(w, may2).revoked_at, null, "máy khác của cùng tài khoản vẫn bật");
});

test("ADR-0046 điểm 1: đăng xuất không đụng máy của NGƯỜI KHÁC dù gửi đúng địa chỉ của họ", async () => {
  const w = setup();
  const mayAdm = await batMay(w, ADM);
  const r = await w.call("POST", "/api/account/thong-bao/may/huy", { as: SALES, body: { endpoint: mayAdm, dangXuat: true } });
  assert.equal(r.status, 200, r.text);
  assert.equal(dong(w, mayAdm).revoked_at, null, "địa chỉ thuộc tài khoản khác → không đổi");
});

test("ADR-0046 điểm 2: Toàn quyền ĐỔI QUYỀN kiểu cũ (từ ADR-0083 chỉ Toàn quyền dùng đường này) của một tài khoản có máy bật → máy vẫn bật", async () => {
  const w = setup();
  const may = await batMay(w, SALES);
  const r = await w.call("PUT", `/api/staff/${SALES}/permissions`, { as: SUP, body: { permissions: ["SALES", "ACCOUNTING"] } });
  assert.equal(r.status, 200, r.text);
  await choMotNhip();
  assert.equal(dong(w, may).revoked_at, null, "đổi quyền KHÔNG tắt máy");
  assert.equal(dangBat(w, SALES), 1);
});

test("ADR-0046 điểm 2: Toàn quyền ĐỔI VAI (gán vai IT) của một tài khoản có máy bật → máy vẫn bật", async () => {
  const w = setup();
  const may = await batMay(w, SALES);
  const r = await w.call("PUT", `/api/staff/${SALES}/roles`, { as: SUP, body: { roles: ["IT"] } });
  assert.equal(r.status, 200, r.text);
  await choMotNhip();
  assert.equal(dong(w, may).revoked_at, null, "đổi vai KHÔNG tắt máy");
});

test("ADR-0046 điểm 3: thao tác bảo mật vẫn tắt MỌI máy (lý do tai-khoan-doi) — ngưng tài khoản, đổi SĐT đăng nhập", async () => {
  const w = setup();
  const a1 = await batMay(w, SALES);
  const a2 = await batMay(w, SALES);
  assert.equal((await w.call("PATCH", `/api/staff/${SALES}`, { as: ADM, body: { phone: "0900000099" } })).status, 200);
  await choMotNhip();
  for (const ep of [a1, a2]) assert.equal(dong(w, ep).revoke_reason, "tai-khoan-doi", "đổi SĐT → mọi máy tắt");
  // Ngưng một tài khoản KHÔNG phải quản trị viên cuối cùng (luật "còn ít nhất một quản trị viên" chặn 409 nếu ngưng ADM).
  const ACC = "55555555-5555-4555-8555-555555555555";
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  const b = await batMay(w, ACC);
  assert.equal((await w.call("PATCH", `/api/staff/${ACC}`, { as: ADM, body: { active: false } })).status, 200);
  await choMotNhip();
  assert.equal(dong(w, b).revoke_reason, "tai-khoan-doi", "ngưng tài khoản → mọi máy tắt");
});

test("ADR-0046 điểm 2–3: MỌI route gọi dongBangTin khai cờ tatThongBao đúng loại — 7 thao tác bảo mật true, gỡ phiên chỉ-phiên (ADR-0075 điều 6b), đổi quyền/vai false; route mới gọi dongBangTin phải được xếp loại ở đây", () => {
  // Kiểm người kiểm độc lập 28/9 (VỪA): bài chạy-app ở trên chỉ phủ đổi SĐT/ngưng + đổi quyền/vai; 5 route bảo mật còn lại (gỡ Face ID, đổi PIN
  // bằng Face ID, quản trị đặt lại PIN / gỡ Face ID) cần giả lập WebAuthn/PIN thật — bài QUÉT NGUỒN này canh cờ của TỪNG route (tách theo `route(`).
  // Quét MỌI tệp .ts (không phải test) dưới src/modules/ — người kiểm cuối 28/9 (VỪA): bản trước chỉ đọc accounts + maintenance, route mới ở
  // module khác gọi dongBangTin với cờ sai sẽ lọt. Module bảo trì chỉ được gọi "tat-ca" (kiểm riêng ở dưới), mọi lời gọi khác phải nằm trong bảng.
  const goc = new URL("./modules/", import.meta.url);
  const tep = (readdirSync(goc, { recursive: true }) as string[]).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  const coGoi = tep.filter((f) => readFileSync(new URL(f, goc), "utf8").includes("dongBangTin("));
  assert.deepEqual(coGoi.sort(), ["accounts/index.ts", "auth/index.ts", "maintenance/index.ts"], "module mới gọi dongBangTin → thêm vào bảng dưới, xếp loại theo ADR-0046");
  // auth (ADR-0075 điều 6) chỉ dùng nhánh theo PHIÊN (kiểm riêng ở bài dưới) — không thuộc bảng cờ tatThongBao.
  const src = coGoi.filter((f) => f === "accounts/index.ts").map((f) => readFileSync(new URL(f, goc), "utf8")).join("\n");
  const RE_ROUTE = /route\("(GET|POST|PUT|PATCH|DELETE)", "([^"]+)"/g;
  const moc = [...src.matchAll(RE_ROUTE)].map((m) => ({ ten: `${m[1]} ${m[2]}`, tu: m.index ?? 0 }));
  const thay: Record<string, (boolean | string)[]> = {};
  moc.forEach((r, i) => {
    const than = src.slice(r.tu, i + 1 < moc.length ? moc[i + 1]!.tu : src.length);
    const co: (boolean | string)[] = [...than.matchAll(/dongBangTin\(\{\s*staffId:[^}]*?tatThongBao:\s*(true|false)\s*\}\)/g)].map((m) => m[1] === "true");
    // ADR-0075 điều 6: dạng THEO PHIÊN với `giuPhien: null` tắt MỌI máy của tài khoản — tính là `true` (thao tác bảo mật).
    co.push(...[...than.matchAll(/dongBangTin\(\{\s*staffId:[^}]*?sessionIds:[^}]*?giuPhien:\s*null\s*\}\)/g)].map(() => true));
    // Dạng theo phiên GIỮ một máy (`giuPhien: <biến>`) — tắt thông báo mọi máy TRỪ máy được giữ: xếp loại riêng "giữ-phiên"; chỉ hai route đổi quyền/vai được
    // dùng (ADR-0075 điều 3: mất miễn → còn phiên mới nhất). Route accounts khác dùng dạng này → bảng dưới đỏ (phải xếp loại lại có chủ đích).
    co.push(...[...than.matchAll(/dongBangTin\(\{\s*staffId:[^}]*?sessionIds:[^}]*?giuPhien:\s*(?!null\b)[A-Za-z_$][\w$.]*\s*\}\)/g)].map(() => "giữ-phiên"));
    // Dạng CHỈ PHIÊN (`chiPhien: true`, ADR-0075 điều 6b) — tắt thông báo CHỈ máy của các phiên được nêu: xếp loại riêng "chỉ-phiên"; route gỡ phiên PHẢI dùng
    // dạng này (đợt sửa sau kiểm độc lập 2026-10-01: dạng `giuPhien: null` cũ tắt MỌI máy của tài khoản — sai "của đúng máy đó").
    co.push(...[...than.matchAll(/dongBangTin\(\{\s*staffId:[^}]*?sessionIds:[^}]*?chiPhien:\s*true\s*\}\)/g)].map(() => "chỉ-phiên"));
    const goi = (than.match(/dongBangTin\(/g) ?? []).length;
    assert.equal(co.length, goi, `${r.ten}: mọi lời gọi dongBangTin phải khai rõ tatThongBao: true|false`);
    if (goi > 0) thay[r.ten] = co;
  });
  assert.deepEqual(thay, {
    "POST /api/account/change-pin": [true], // đổi PIN (tự đổi)
    "POST /api/account/passkeys/remove-all": [true], // gỡ mọi Face ID (tự gỡ)
    "DELETE /api/account/passkeys/:id": [true], // gỡ một Face ID (tự gỡ)
    "POST /api/account/pin-by-passkey": [true], // đổi PIN bằng Face ID
    "PATCH /api/staff/:id": [true], // ngưng tài khoản / đổi SĐT đăng nhập
    // đổi quyền / vai — ADR-0046 điểm 2: KHÔNG tắt; riêng khi mất miễn một máy (ADR-0075 điều 3) tắt máy vừa bị kết thúc, giữ máy còn lại
    "PUT /api/staff/:id/permissions": [false, "giữ-phiên"],
    "PUT /api/staff/:id/roles": [false, "giữ-phiên"],
    "POST /api/staff/:id/reset-pin": [true], // quản trị đặt lại PIN
    "POST /api/staff/:id/passkeys/remove-all": [true], // quản trị gỡ mọi Face ID
    "POST /api/sessions/:id/revoke": ["chỉ-phiên"], // ADR-0075 điều 6b–7: IT/Toàn quyền gỡ phiên — tắt CHỈ máy của phiên bị gỡ (không phải mọi máy)
  });
  // Chế độ bảo trì chỉ đóng Bảng tin ("tat-ca"), không tắt máy (ADR-0036/0046 điểm 4).
  const bt = readFileSync(new URL("./modules/maintenance/index.ts", import.meta.url), "utf8");
  assert.deepEqual([...bt.matchAll(/dongBangTin\(([^)]*)\)/g)].map((m) => m[1]), ['"tat-ca"']);
});

test("ADR-0075 điều 6: MỌI route của auth cấp phiên (issueLoginSession) phải gọi dongBangTin dạng theo phiên { staffId, sessionIds, giuPhien }; không lời gọi nào ngoài các route đó", () => {
  // Không ghim tên route: route đăng nhập mới (Phần B: PIN_MFA, PIN_TRUSTED…) gọi issueLoginSession mà quên dongBangTin sẽ đỏ.
  const src = readFileSync(new URL("./modules/auth/index.ts", import.meta.url), "utf8");
  const RE_ROUTE = /route\("(GET|POST|PUT|PATCH|DELETE)", "([^"]+)"/g;
  const moc = [...src.matchAll(RE_ROUTE)].map((m) => ({ ten: `${m[1]} ${m[2]}`, tu: m.index ?? 0 }));
  let soRouteCapPhien = 0;
  let soGoiTrongRoute = 0;
  moc.forEach((r, i) => {
    const than = src.slice(r.tu, i + 1 < moc.length ? moc[i + 1]!.tu : src.length);
    const dung = [...than.matchAll(/dongBangTin\(\{\s*staffId:[^}]*?sessionIds:[^}]*?giuPhien:[^}]*\}\)/g)].length;
    const goi = (than.match(/dongBangTin\(/g) ?? []).length;
    assert.equal(dung, goi, `${r.ten}: lời gọi dongBangTin ở auth phải đúng dạng theo phiên`);
    if (than.includes("issueLoginSession(")) {
      soRouteCapPhien++;
      assert.ok(dung >= 1, `${r.ten}: cấp phiên (issueLoginSession) mà không gọi dongBangTin theo phiên — máy cũ bị thay không tắt hẳn (ADR-0075 điều 6)`);
    } else assert.equal(goi, 0, `${r.ten}: không cấp phiên thì không gọi dongBangTin`);
    soGoiTrongRoute += goi;
  });
  assert.ok(soRouteCapPhien >= 2, `phải thấy ít nhất 2 route cấp phiên (PIN, Face ID) — thấy ${soRouteCapPhien}`);
  assert.equal((src.match(/dongBangTin\(/g) ?? []).length, soGoiTrongRoute, "không lời gọi nào ngoài thân route");
});

test("ADR-0046 tiêu chí 4: web/shell.ts — đăng xuất gửi địa chỉ CỦA MÁY NÀY kèm dangXuat, không còn gửi tatCa: true", () => {
  const src = readFileSync(new URL("../web/shell.ts", import.meta.url), "utf8");
  const than = src.slice(src.indexOf("async function tatThongBaoMayNay"), src.indexOf("export async function logout"));
  assert.ok(than.length > 0, "không tìm thấy hàm tatThongBaoMayNay");
  assert.doesNotMatch(than, /tatCa\s*:\s*true/, "đăng xuất không được tắt mọi máy của tài khoản");
  assert.match(than, /dangXuat\s*:\s*true/, "đăng xuất phải gửi cờ dangXuat cho đúng máy này");
});

test("ADR-0075 điều 6b: web/shell.ts gửi lại địa chỉ nhận của máy này sau đăng nhập (một lần, cờ sessionStorage); trang /login xoá cờ", () => {
  const shell = readFileSync(new URL("../web/shell.ts", import.meta.url), "utf8");
  const than = shell.slice(shell.indexOf("async function ganPhienThongBaoMayNay"), shell.indexOf("/** Số mục chưa đọc của Góp ý"));
  assert.match(than, /Notification\.permission !== "granted"/, "chỉ khi đã cho phép — không tự xin quyền");
  assert.match(than, /getSubscription\(\)/);
  assert.doesNotMatch(than, /\.subscribe\(/, "không tạo đăng ký mới");
  assert.match(than, /api\("\/api\/account\/thong-bao\/may", \{ method: "POST"/);
  assert.match(than, /sessionStorage\.setItem\(KHOA_GAN_PHIEN_THONG_BAO, "1"\)/);
  assert.match(shell, /void ganPhienThongBaoMayNay\(\);/, "initShell phải gọi (sau khi /api/auth/me xác nhận đăng nhập)");
  const login = readFileSync(new URL("../web/login.ts", import.meta.url), "utf8");
  assert.match(login, /sessionStorage\.removeItem\(KHOA_GAN_PHIEN_THONG_BAO\)/);
});
