// Việc 3 (kế hoạch 16 việc, 21/11/2026): ô «Tìm đối tác» của form lập đơn nhận cả số điện thoại — route THẬT `GET /api/pricing/nguoi-huong` qua khung thử.
// Gõ đủ một số Việt Nam ⇒ máy chủ so với liên hệ SĐT ĐANG MỞ của hồ sơ (qua `findPartiesByPhone` của parties — pricing không đọc bảng liên hệ), rồi chỉ giữ hồ sơ còn dùng
// VÀ mang vai được hưởng (cùng điều kiện tìm theo tên). Nhánh số chỉ mở cho người vốn tra được hồ sơ theo số (văn phòng + party.view, `traDoiTacTheoSo`); phản hồi không kèm số.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { coTheTimDoiTac } from "../../shared/hoa-hong-hien-thi.ts";
import { traDoiTacTheoSo } from "../../shared/phan-doi-tac-hien-thi.ts";
import { PERMISSION_CODES, type PermissionCode } from "../../shared/permissions.ts";

const SALES = "11111111-1111-4111-8111-111111111111";
const TT = "22222222-2222-4222-8222-222222222222"; // Thực tập: qua cổng tìm người hưởng (order.create) nhưng không có party.view
const DT = "55555555-5555-4555-8555-555555555555"; // tài khoản Đối tác: hồ sơ pty-DT mang vai Công ty lữ hành (được hưởng)
const KT = "44444444-4444-4444-8444-444444444444";
const NOW = "2026-10-01T00:00:00.000Z";
const SO = "0905123456";
type W = ReturnType<typeof world>;

function lienHe(w: W, id: string, partyId: string, giaTri: string, chuan: string, dongNgay: string | null = null): void {
  w.sqlite.prepare(`INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, is_primary, valid_from_date, valid_to_date, created_at, created_by, updated_at)
    VALUES (?, ?, 'PHONE', ?, ?, 1, '2026-01-01', ?, ?, 'nguoi-thu', ?)`).run(id, partyId, giaTri, chuan, dongNgay, NOW, NOW);
}
function hoSo(w: W, id: string, ten: string, vai: string, active = 1): void {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, ?, ?, ?)").run(id, ten, active, NOW, NOW);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)").run(`r-${id}`, id, vai, NOW, NOW);
}
function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [TT, "0900000002", "Tú Thực Tập", ["INTERN"]], [DT, "0900000006", "Đại Lý Biển Xanh", ["PARTNER"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  lienHe(w, "c-dt", `pty-${DT}`, "0905 123 456", SO); // số liên hệ do người thêm ở Danh bạ (không phải số đăng nhập 0900000006)
  hoSo(w, "pty-ncc", "Nhà Cung Cấp Cùng Số", "SUPPLIER"); // không được hưởng ⇒ không ra
  lienHe(w, "c-ncc", "pty-ncc", "0905123456", SO);
  hoSo(w, "pty-ngung", "Cộng Tác Viên Đã Ngưng", "COLLABORATOR", 0); // được hưởng nhưng hồ sơ đã ngưng ⇒ không ra
  lienHe(w, "c-ngung", "pty-ngung", "0905123456", SO);
  hoSo(w, "pty-dong", "Cộng Tác Viên Số Cũ", "COLLABORATOR"); // số đã đóng (valid_to_date) ⇒ không ra
  lienHe(w, "c-dong", "pty-dong", "0905999888", "0905999888", "2026-06-30");
  return w;
}
const ids = (r: { json: { ketQua: { partyId: string }[] } }): string[] => r.json.ketQua.map((x) => x.partyId).sort();
const goi = (w: W, q: string, as: string) => w.call("GET", `/api/pricing/nguoi-huong?q=${encodeURIComponent(q)}`, { as });

test("Bán hàng gõ số liên hệ của đối tác (0…, +84…, có dấu cách) ⇒ ra đúng đối tác; nhà cung cấp, hồ sơ đã ngưng cùng số không ra; phản hồi không kèm số", async () => {
  const w = setup();
  for (const q of [SO, "+84 905 123 456", "0905.123.456", "0905 123 456"]) {
    const r = await goi(w, q, SALES);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(ids(r), [`pty-${DT}`], `q=${q}`);
    assert.deepEqual(r.json.ketQua[0], { partyId: `pty-${DT}`, ten: "Đại Lý Biển Xanh", loai: "PERSON" }, "chỉ id, tên, loại hồ sơ");
    assert.ok(!r.text.includes("905") , `phản hồi không được kèm số: ${r.text}`);
  }
});

test("số đã đóng (liên hệ hết hiệu lực) không tìm ra; số không thuộc đối tác nào ⇒ rỗng; gõ tên vẫn tìm như cũ", async () => {
  const w = setup();
  assert.deepEqual(ids(await goi(w, "0905999888", SALES)), []);
  assert.deepEqual(ids(await goi(w, "0911222333", SALES)), []);
  assert.deepEqual(ids(await goi(w, "Biển Xanh", SALES)), [`pty-${DT}`], "tìm theo tên không đổi");
  assert.deepEqual(ids(await goi(w, "0905", SALES)), [], "số thiếu chữ số ⇒ tìm theo tên (không tên nào chứa 0905)");
  // Số đăng nhập (0900000006) KHÔNG phải số liên hệ — không tự chép, không tìm ra (ADR-0001 mục 5).
  assert.deepEqual(ids(await goi(w, "0900000006", SALES)), []);
});

test("Thực tập (không có party.view) gõ số ⇒ không có lối tìm theo số: 200 rỗng; Kế toán (văn phòng + party.view) tìm được; Đối tác vẫn 403", async () => {
  const w = setup();
  const tt = await goi(w, SO, TT);
  assert.equal(tt.status, 200, tt.text);
  assert.deepEqual(ids(tt), []);
  assert.deepEqual(ids(await goi(w, "Biển Xanh", TT)), [`pty-${DT}`], "Thực tập vẫn tìm theo tên như cũ");
  assert.deepEqual(ids(await goi(w, SO, KT)), [`pty-${DT}`]);
  assert.equal((await goi(w, SO, DT)).status, 403);
});

test("nhãn ô «tìm theo tên hoặc số điện thoại» của giao diện ⇔ route tìm được theo số (mọi quyền đơn lẻ và mọi cặp quyền cùng tồn tại được)", async () => {
  const w = setup();
  const tap: PermissionCode[][] = PERMISSION_CODES.map((p) => [p]);
  for (let i = 0; i < PERMISSION_CODES.length; i++) {
    for (let j = i + 1; j < PERMISSION_CODES.length; j++) {
      const a = PERMISSION_CODES[i]!;
      const b = PERMISSION_CODES[j]!;
      if (a !== "DRIVER_PARTNER" && b !== "DRIVER_PARTNER") tap.push([a, b]);
    }
  }
  const lech: string[] = [];
  let thayTheoSo = 0;
  for (const [n, perms] of tap.entries()) {
    const id = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    seedStaff(w.sqlite, { id, phone: `09${String(10_000_000 + n)}`, name: `Tài khoản ${n}`, perms });
    const r = await goi(w, SO, id);
    const route = r.status === 200 && r.json.ketQua.some((x: { partyId: string }) => x.partyId === `pty-${DT}`);
    if (route) thayTheoSo++;
    const giaoDien = coTheTimDoiTac({ id, permissions: perms } as never) && traDoiTacTheoSo({ id, permissions: perms } as never);
    if (route !== giaoDien) lech.push(`${perms.join("+")}: route ${route ? "tìm được" : "không tìm được"} theo số, giao diện ${giaoDien ? "nói có" : "nói không"}`);
  }
  assert.deepEqual(lech, [], "nhãn ô tìm và route lệch nhau — đổi traDoiTacTheoSo (src/shared/phan-doi-tac-hien-thi.ts) theo cổng nhánh số của route");
  assert.ok(thayTheoSo > 0 && thayTheoSo < tap.length, "bài phải thấy cả hai phía");
});
