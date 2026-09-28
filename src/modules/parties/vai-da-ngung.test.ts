// Loại vai (công việc) đã NGƯNG DÙNG không gán mới được — hàng rào MÁY CHỦ (ADR-0040 D3; Ruling R1, R6 của điều phối 2026-09-28). Trước đây `active = 0`
// chỉ ẩn loại đó khỏi ô "Thêm công việc" của Danh bạ (web/parties.ts); gọi thẳng API vẫn gán được. Áp cho MỌI loại đã ngưng (mã cũ mơ hồ của 0024
// STAFF/SALES/GUIDE/AGENT, mã hồ sơ cũ DRIVER của 0031), TRỪ đường đổi công ty chủ (OWNER_COMPANY cũng gieo active = 0 — Ruling T2 của T2b, ADR-0043).
// Chạy CẢ ứng dụng (router + mọi module) trên SQLite thật qua tests/audit/harness.mjs. Ca từ chối khẳng định ĐÚNG MÃ 409 `role_type_inactive`.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  return w;
}
async function hoSoKhongTaiKhoan(w: any): Promise<string> {
  const r = await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Người Lái Thử", contacts: [] } });
  assert.equal(r.status, 201, r.text);
  return r.json.party.id as string;
}
const ganVai = (w: any, as: string, id: string, body: Record<string, unknown>) => w.call("POST", `/api/parties/${id}/roles`, { as, body });
const soDongVai = (w: any, id: string): number => w.q("SELECT count(*) n FROM pty_party_role WHERE party_id = ?", id)[0].n;
const soNhatKy = (w: any): number => w.q("SELECT count(*) n FROM audit_log")[0].n;

test("R6: Quản trị gán loại vai ĐÃ NGƯNG (DRIVER cũ, STAFF, SALES, GUIDE, AGENT) → 409 role_type_inactive, câu 'ngưng dùng', không ghi dòng vai, không nhật ký", async () => {
  const w = setup();
  const id = await hoSoKhongTaiKhoan(w);
  for (const code of ["DRIVER", "STAFF", "SALES", "GUIDE", "AGENT"]) {
    assert.equal(w.q("SELECT active FROM pty_role_type WHERE code = ?", code)[0].active, 0, `${code} phải đang ngưng (điều kiện của ca)`);
    const [vai, log] = [soDongVai(w, id), soNhatKy(w)];
    const r = await ganVai(w, ADM, id, { roleTypeCode: code });
    assert.equal(r.status, 409, `${code}: ${r.text}`);
    assert.equal(r.json.error.code, "role_type_inactive", code);
    assert.match(r.json.error.message, /ngưng dùng/, code);
    assert.equal(soDongVai(w, id), vai, `${code}: không thêm dòng vai`);
    assert.equal(soNhatKy(w), log, `${code}: không dòng nhật ký`);
  }
});

test("R6 không chặn quá tay: loại OTHER đang dùng (Lái cano) → 201; mã lạ → 400 (khoá ngoại) như cũ; ngày sai → 400 (kiểm thân đứng trước); Bán hàng → 403", async () => {
  const w = setup();
  const id = await hoSoKhongTaiKhoan(w);
  let r = await ganVai(w, ADM, id, { roleTypeCode: "BOAT_CAPTAIN" });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(r.json.party.roleCodes, ["BOAT_CAPTAIN"]);
  r = await ganVai(w, ADM, id, { roleTypeCode: "KHONG_CO" });
  assert.equal(r.status, 400, r.text);
  r = await ganVai(w, ADM, id, { roleTypeCode: "DRIVER", validFrom: "2026-02-30" });
  assert.equal(r.status, 400, `ngày 30/02 bị kiểm thân trước lời kiểm 'đã ngưng': ${r.text}`);
  r = await ganVai(w, SALES, id, { roleTypeCode: "DRIVER" });
  assert.equal(r.status, 403, r.text);
});

test("R6: dòng vai ĐÃ CÓ của loại đã ngưng (gieo trước khi ngưng) vẫn nguyên — lời kiểm chỉ chặn gán MỚI", async () => {
  const w = setup();
  const id = await hoSoKhongTaiKhoan(w);
  w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('ptr-cu', '${id}', 'DRIVER', NULL, '2026-09-01', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z')`);
  const r = await w.call("GET", `/api/parties/${id}`, { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.party.roleCodes, ["DRIVER"], "dòng vai cũ vẫn mở và vẫn hiện");
});
