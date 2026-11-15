// ADR-0180 Đ1.2 — ma trận mười vai chọn được: mỗi mã, `GET /api/auth/me` trả đúng bộ quyền hiệu lực của mã đó và không bao giờ có SUPER_ADMIN.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff, world } from "../../../tests/audit/harness.mjs";
import { VAI_CHON_DUOC } from "../../shared/xem-nhu-vai.ts";

const CHU = "77777777-7777-4777-8777-777777777777";
const DUONG = "/api/auth/xem-nhu-vai";

test("mười vai chọn được: /me đúng bộ quyền của mã (SALES_MANAGER kèm SALES), không SUPER_ADMIN, quyền thật vẫn là Toàn quyền", async () => {
  assert.equal(VAI_CHON_DUOC.length, 10);
  for (const ma of VAI_CHON_DUOC) {
    const w = world();
    seedStaff(w.sqlite, { id: CHU, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
    await w.token(CHU);
    const r = await w.call("POST", DUONG, { as: CHU, body: { role: ma } });
    assert.equal(r.status, 200, `${ma} → ${r.text}`);
    const m = await w.call("GET", "/api/auth/me", { as: CHU });
    const mong = ma === "SALES_MANAGER" ? ["SALES_MANAGER", "SALES"] : [ma];
    assert.deepEqual(m.json.staff.permissions, mong, ma);
    assert.ok(!m.json.staff.permissions.includes("SUPER_ADMIN"), ma);
    assert.equal(m.json.actingRole, ma);
    assert.ok(m.json.staff.realPermissions.includes("SUPER_ADMIN"), ma);
  }
});
