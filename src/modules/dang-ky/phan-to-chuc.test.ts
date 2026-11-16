// Dấu «Thu thông tin tổ chức» của chính sách riêng tư (ADR-0212 Đ7, đợt 2 Task 4): đăng bản có / không tích, cấu hình công khai, điểm cuối công khai không lộ dấu, và
// phần tổ chức chỉ mở khi ĐỦ HAI điều kiện (biểu mẫu có phần tổ chức + chính sách có dấu). Route thật, SQLite thật (tests/audit/harness.mjs). Toàn dữ liệu GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import "./repository.ts"; // đăng ký các câu defineSql của dang-ky

const SUP = "77777777-7777-4777-8777-777777777777";
const GIO = "2026-11-10T00:00:00.000Z";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  return w;
}
const dang = (w: any, body: Record<string, unknown> = {}) =>
  w.call("POST", "/api/parties/chinh-sach-rieng-tu", { as: SUP, body: { mucDich: "Mục đích thử", noiDung: "Toàn văn thử", ...body } });
const cot = (w: any): Array<{ version: number; covers_org_data: number }> => w.q("SELECT version, covers_org_data FROM pty_privacy_policy ORDER BY version").map((x: any) => ({ ...x }));
const cauHinh = async (w: any) => (await w.call("GET", "/api/dang-ky/cau-hinh")).json;
/** Chèn thẳng một bản có ngày hiệu lực tuỳ ý (đăng qua route luôn hiệu lực ngay). */
function chenBan(w: any, version: number, coToChuc: number, hieuLuc: string): void {
  w.sqlite.prepare(
    "INSERT INTO pty_privacy_policy (id, version, purposes, body, valid_from_at, created_at, created_by, updated_at, updated_by, covers_org_data) VALUES (?, ?, 'm', 'b', ?, ?, 'x', ?, 'x', ?)",
  ).run(`bt-${version}`, version, hieuLuc, GIO, GIO, coToChuc);
}

test("đăng chính sách: không tích ⇒ covers_org_data 0; tích ⇒ 1; giá trị không phải đúng/sai ⇒ 400, không thêm dòng", async () => {
  const w = setup();
  assert.equal((await dang(w)).status, 201);
  assert.equal((await dang(w, { coPhanToChuc: false })).status, 201);
  assert.equal((await dang(w, { coPhanToChuc: true })).status, 201);
  assert.deepEqual(cot(w), [{ version: 1, covers_org_data: 0 }, { version: 2, covers_org_data: 0 }, { version: 3, covers_org_data: 1 }]);
  for (const sai of ["true", 1, "co", []]) assert.equal((await dang(w, { coPhanToChuc: sai })).status, 400, JSON.stringify(sai));
  assert.equal(cot(w).length, 3);
});

test("bảng vẫn chỉ-thêm: không sửa, không xoá được dấu của bản đã đăng", async () => {
  const w = setup();
  assert.equal((await dang(w, { coPhanToChuc: true })).status, 201);
  assert.throws(() => w.sqlite.prepare("UPDATE pty_privacy_policy SET covers_org_data = 0").run());
  assert.throws(() => w.sqlite.prepare("DELETE FROM pty_privacy_policy").run());
  assert.deepEqual(cot(w), [{ version: 1, covers_org_data: 1 }]);
});

test("GET /api/dang-ky/cau-hinh: phanToChucMo theo bản ĐANG hiệu lực; bản hẹn giờ tương lai chưa tính", async () => {
  // Bảng bắt phiên bản sau không được hiệu lực trước bản trước (trigger), nên mỗi tình huống một thế giới.
  const a = setup();
  assert.equal((await cauHinh(a)).phanToChucMo, false, "chưa có chính sách ⇒ đóng");
  chenBan(a, 1, 0, GIO);
  assert.equal((await cauHinh(a)).phanToChucMo, false, "bản hiệu lực chưa có dấu");
  chenBan(a, 2, 1, "2999-01-01T00:00:00.000Z");
  assert.equal((await cauHinh(a)).phanToChucMo, false, "bản có dấu nhưng hẹn tương lai ⇒ chưa tính");
  const b = setup();
  chenBan(b, 1, 1, GIO);
  assert.equal((await cauHinh(b)).phanToChucMo, true, "bản hiệu lực có dấu");
  chenBan(b, 2, 0, "2999-01-01T00:00:00.000Z");
  assert.equal((await cauHinh(b)).phanToChucMo, true, "bản tương lai không dấu cũng chưa tính");
  const c = setup();
  chenBan(c, 1, 1, GIO);
  chenBan(c, 2, 0, "2026-11-12T00:00:00.000Z");
  assert.equal((await cauHinh(c)).phanToChucMo, false, "bản mới hiệu lực không dấu thay hẳn bản cũ có dấu");
});

test("GET /api/chinh-sach-rieng-tu công khai KHÔNG lộ dấu: chỉ phiên bản, ngày hiệu lực, toàn văn", async () => {
  const w = setup();
  assert.equal((await dang(w, { coPhanToChuc: true })).status, 201);
  const r = await w.call("GET", "/api/chinh-sach-rieng-tu");
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(Object.keys(r.json).sort(), ["hieuLucTu", "noiDung", "phienBan"]);
  for (const cam of ["covers_org", "coToChuc", "phanToChuc", "coPhanToChuc"]) assert.equal(r.text.includes(cam), false, cam);
});

test("Công ty lữ hành cần ĐỦ HAI điều kiện: từ Task 13 biểu mẫu đã có phần tổ chức (hằng bật) ⇒ chỉ còn thiếu dấu của chính sách; có dấu ⇒ mở được (null)", async () => {
  const w = setup();
  const lyDo = async () => Object.fromEntries((await w.call("GET", "/api/dang-ky/chinh-sach", { as: SUP })).json.loaiCoThe.map((x: any) => [x.ma, x.lyDoChuaMo]));
  assert.equal((await dang(w)).status, 201);
  const khongDau = (await lyDo()).TRAVEL_AGENCY as string;
  assert.doesNotMatch(khongDau, /phiếu đăng ký chưa có phần khai tổ chức/, "Task 13: biểu mẫu đã có phần tổ chức");
  assert.match(khongDau, /chính sách riêng tư chưa nêu việc thu thập thông tin của tổ chức/);
  assert.equal((await dang(w, { coPhanToChuc: true })).status, 201);
  assert.equal((await lyDo()).TRAVEL_AGENCY, null, "đủ hai điều kiện ⇒ mở được");
  assert.equal((await cauHinh(w)).loaiMo.some((x: any) => x.ma === "TRAVEL_AGENCY"), false, "chưa có trong chính sách đăng ký ⇒ chưa mở cho người đăng ký");
});
