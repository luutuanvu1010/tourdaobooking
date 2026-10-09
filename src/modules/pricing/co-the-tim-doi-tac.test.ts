// Giao diện (src/shared/hoa-hong-hien-thi.ts: `coTheTimDoiTac`) chỉ hiện ô tìm đối tác cho ai ĐƯỢC route `GET /api/pricing/nguoi-huong` trả lời. Bài này nối hai bên bằng
// route THẬT qua khung thử: mỗi tài khoản (mọi quyền đơn lẻ, mọi cặp quyền cùng tồn tại được) gọi route, và "route không trả 403" PHẢI đúng bằng `coTheTimDoiTac`.
// Vì sao có bài: hôm nay Kế toán (người chính đặt mức) không qua cổng đó nên màn Hoa hồng đối tác chỉ cho Kế toán chọn "Loại đối tác". Khi chủ mở route cho Kế toán, bài này
// ĐỎ cho tới khi đổi hàm giao diện theo — không để hai bên lệch nhau lặng lẽ (ô tìm không hiện dù route đã mở, hoặc ô tìm hiện mà route từ chối).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";
import { coTheTimDoiTac } from "../../shared/hoa-hong-hien-thi.ts";
import { PERMISSION_CODES, type PermissionCode } from "../../shared/permissions.ts";

test("ô tìm đối tác của giao diện ⇔ route nguoi-huong không từ chối (mọi quyền đơn lẻ và mọi cặp quyền cùng tồn tại được)", async () => {
  const w = world();
  // Tài khoản mang DRIVER_PARTNER phải đứng một mình (trigger LC-1): bỏ mọi cặp có nó.
  const tap: PermissionCode[][] = PERMISSION_CODES.map((p) => [p]);
  for (let i = 0; i < PERMISSION_CODES.length; i++) {
    for (let j = i + 1; j < PERMISSION_CODES.length; j++) {
      const a = PERMISSION_CODES[i]!;
      const b = PERMISSION_CODES[j]!;
      if (a !== "DRIVER_PARTNER" && b !== "DRIVER_PARTNER") tap.push([a, b]);
    }
  }
  const lech: string[] = [];
  let soChoQua = 0;
  for (const [n, perms] of tap.entries()) {
    const id = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    seedStaff(w.sqlite, { id, phone: `09${String(10_000_000 + n)}`, name: `Tài khoản ${n}`, perms });
    const r = await w.call("GET", "/api/pricing/nguoi-huong?q=a", { as: id });
    assert.ok(r.status === 200 || r.status === 403, `${perms.join("+")}: mã lạ ${r.status} ${r.text}`);
    const route = r.status === 200;
    if (route) soChoQua++;
    if (route !== coTheTimDoiTac({ id, permissions: perms } as never)) lech.push(`${perms.join("+")}: route ${route ? "cho" : "chặn"}, giao diện ${route ? "ẩn ô tìm" : "hiện ô tìm"}`);
  }
  assert.deepEqual(lech, [], "giao diện và route tìm người hưởng lệch nhau — đổi coTheTimDoiTac (src/shared/hoa-hong-hien-thi.ts) theo cổng của route");
  assert.ok(soChoQua > 0 && soChoQua < tap.length, "bài phải thấy cả hai phía (có tập được qua, có tập bị chặn), không thì không so được gì");
});
