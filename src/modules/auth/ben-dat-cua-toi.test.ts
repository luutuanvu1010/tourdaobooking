// `benDatCuaToi` ở `GET /api/auth/me` (sổ đại lý đợt 1, Task 11; Ruling 21 của điều phối): cho GIAO DIỆN biết máy chủ có ÉP bên đặt của đơn mới về hồ sơ của chính tài khoản không,
// để form lập đơn hiện dòng chỉ đọc "Bên đặt: <tên>" mà KHÔNG tự suy luật. Luật nằm ở MỘT chỗ — `benDatChoTaiKhoan` (src/shared/booker.ts) hỏi: tài khoản giữ quyền Đối tác (`holdsPartner`),
// có hồ sơ, và hồ sơ ấy đang mang ít nhất một vai trong danh sách được hưởng (`laNguoiHuong` của pricing). Trường này trả lời ĐÚNG câu đó (kèm tên hồ sơ), không thêm nghĩa nào khác.
// Route thật qua khung thử (SQLite thật + cả ứng dụng, hàm tiêm thật của gốc lắp ráp). Id hồ sơ tài khoản do `seedStaff` đặt: `pty-<id tài khoản>`.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác, hồ sơ cá nhân mang TRAVEL_AGENCY
const DT2 = "66666666-6666-4666-8666-666666666667"; // Đối tác, hồ sơ chỉ mang CUSTOMER
const DT3 = "66666666-6666-4666-8666-666666666668"; // Đối tác chưa gắn hồ sơ (staff.party_id NULL)
const LAI = "66666666-6666-4666-8666-666666666669"; // Bán hàng + Đối tác, hồ sơ không mang vai nào
const SALES2 = "11111111-1111-4111-8111-111111111112"; // Bán hàng thuần mà hồ sơ (dữ liệu lệch) MANG vai được hưởng — không giữ quyền Đối tác thì máy chủ không ép
const LAI2 = "66666666-6666-4666-8666-66666666666a"; // Bán hàng + Đối tác, hồ sơ MANG vai được hưởng (đường quản trị cũ gán quyền lai — dữ liệu thật có thể có)
const AT = "2026-10-01T00:00:00.000Z";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: DT, phone: "0900000008", name: "Đối Tác Một", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DT2, phone: "0900000009", name: "Đối Tác Hai", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DT3, phone: "0900000010", name: "Đối Tác Ba", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000011", name: "Lai Không Vai", perms: ["SALES", "PARTNER"] });
  seedStaff(w.sqlite, { id: LAI2, phone: "0900000012", name: "Lai Có Vai", perms: ["SALES", "PARTNER"] });
  seedStaff(w.sqlite, { id: SALES2, phone: "0900000014", name: "Bán Hàng Có Vai", perms: ["SALES"] });
  const vai = (id: string, party: string, code: string, tu = "2026-01-01", den: string | null = null) =>
    w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, valid_to_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, party, code, tu, den, AT, AT);
  vai(`r-${DT}`, `pty-${DT}`, "TRAVEL_AGENCY");
  vai(`r-${DT2}`, `pty-${DT2}`, "CUSTOMER");
  vai(`r-${LAI2}`, `pty-${LAI2}`, "TRAVEL_AGENCY");
  vai(`r-${SALES2}`, `pty-${SALES2}`, "TRAVEL_AGENCY");
  w.sqlite.prepare("UPDATE staff SET party_id = NULL WHERE id = ?").run(DT3);
  return { w, vai };
}

type Doc = { status: number; json: { staff: { id: string }; benDatCuaToi?: { partyId: string; ten: string } | null }; text: string };
const me = async (w: ReturnType<typeof setup>["w"], as: string): Promise<Doc> => (await w.call("GET", "/api/auth/me", { as })) as Doc;

test("Đối tác có hồ sơ đang mang vai được hưởng ⇒ benDatCuaToi = chính hồ sơ đó, kèm tên", async () => {
  const { w } = setup();
  const r = await me(w, DT);
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.benDatCuaToi, { partyId: `pty-${DT}`, ten: "Đối Tác Một" });
  assert.deepEqual(Object.keys(r.json.benDatCuaToi ?? {}).sort(), ["partyId", "ten"], "chỉ id và tên — không thêm trường nào");
});

test("Đối tác hồ sơ không được hưởng, chưa gắn hồ sơ, tài khoản lai thường, Bán hàng, Kế toán ⇒ benDatCuaToi = null (khoá có mặt)", async () => {
  const { w } = setup();
  for (const [ten, id] of [["Đối tác hồ sơ chỉ CUSTOMER", DT2], ["Đối tác chưa gắn hồ sơ", DT3], ["lai Bán hàng + Đối tác, hồ sơ không vai", LAI], ["Bán hàng", SALES], ["Bán hàng mà hồ sơ mang vai được hưởng (không giữ quyền Đối tác ⇒ máy chủ không ép)", SALES2], ["Kế toán", KT]] as const) {
    const r = await me(w, id);
    assert.equal(r.status, 200, ten);
    assert.ok("benDatCuaToi" in r.json, `${ten}: khoá benDatCuaToi phải có mặt`);
    assert.equal(r.json.benDatCuaToi, null, ten);
  }
});

test("tài khoản lai mà hồ sơ mang vai được hưởng ⇒ khác null (cùng điều kiện máy chủ ép bên đặt: holdsPartner + hồ sơ được hưởng)", async () => {
  const { w } = setup();
  const r = await me(w, LAI2);
  assert.deepEqual(r.json.benDatCuaToi, { partyId: `pty-${LAI2}`, ten: "Lai Có Vai" });
});

test("vai được hưởng bị đóng ngày, hoặc loại vai bị tắt khỏi danh sách được hưởng ⇒ null", async () => {
  const { w, vai } = setup();
  const DT4 = "66666666-6666-4666-8666-66666666666b";
  seedStaff(w.sqlite, { id: DT4, phone: "0900000013", name: "Đối Tác Bốn", perms: ["PARTNER"] });
  vai(`r-${DT4}`, `pty-${DT4}`, "TRAVEL_AGENCY", "2026-01-01", "2026-02-01"); // đã đóng
  assert.equal((await me(w, DT4)).json.benDatCuaToi, null, "vai đóng ngày");
  assert.deepEqual((await me(w, DT)).json.benDatCuaToi, { partyId: `pty-${DT}`, ten: "Đối Tác Một" }, "đối chứng: vai còn mở thì khác null");
  w.sqlite.prepare("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'TRAVEL_AGENCY'").run();
  assert.equal((await me(w, DT)).json.benDatCuaToi, null, "loại vai bị tắt khỏi danh sách được hưởng");
});

test("benDatCuaToi không mang liên hệ: chỉ id + tên; thân /me ngoài khối staff của chính mình không chứa số điện thoại nào", async () => {
  const { w } = setup();
  const r = await me(w, DT);
  assert.ok(r.json.benDatCuaToi, "đối chứng: Đối tác được hưởng có benDatCuaToi (kẻo bài trống rỗng)");
  assert.ok(!/\d{6,}/.test(r.json.benDatCuaToi.ten), "tên không có dãy số dài");
  const ngoaiStaff = JSON.stringify({ ...r.json, staff: undefined });
  assert.ok(!/0\d{8,9}/.test(ngoaiStaff), "ngoài khối staff, thân không chứa số điện thoại");
  assert.ok(!ngoaiStaff.includes("0900000008"), "đặc biệt không lặp lại SĐT của tài khoản");
});

test("/api/auth/me đi qua MỌI trang: tài khoản không giữ quyền Đối tác (và Đối tác chưa gắn hồ sơ) KHÔNG tốn câu đọc người hưởng nào; Đối tác có hồ sơ tốn đúng một", async () => {
  const { w } = setup();
  const thay = w.env.DB as { prepare: (sql: string) => unknown };
  const goc = thay.prepare.bind(thay);
  let dem = 0;
  thay.prepare = (sql: string) => {
    if (/prc_beneficiary_role/.test(sql)) dem++;
    return goc(sql);
  };
  for (const id of [SALES, SALES2, KT, DT3]) {
    dem = 0;
    assert.equal((await me(w, id)).status, 200);
    assert.equal(dem, 0, `${id}: không câu nào đọc bảng người hưởng`);
  }
  dem = 0;
  await me(w, DT);
  assert.equal(dem, 1, "Đối tác có hồ sơ: đúng một câu đọc người hưởng");
});
