// ADR-0191 — tập «xem mọi khách» rút từ bảng quyền (không liệt kê tay). Bài canh: thêm mã giả có contact.view = any vào bản sao bảng thì tập đổi theo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MATRIX } from "./permissions.ts";
import { coXemMoiKhach, maXemMoiKhach } from "./xem-moi-khach.ts";

test("hôm nay tập xem mọi khách gồm đúng SALES, ACCOUNTING, ADMIN, SUPER_ADMIN (không FIELD, PARTNER, HR)", () => {
  const tap = maXemMoiKhach();
  assert.deepEqual([...tap].sort(), ["ACCOUNTING", "ADMIN", "SALES", "SUPER_ADMIN"]);
  for (const khong of ["FIELD", "PARTNER", "HR"] as const) assert.ok(!tap.includes(khong), khong);
});

test("bản sao bảng có thêm một mã giả contact.view = any thì tập có mã đó (rút từ bảng, không liệt kê tay)", () => {
  const banSao = { ...MATRIX, "contact.view": { ...MATRIX["contact.view"], HR: "any" as const } };
  assert.ok(maXemMoiKhach(banSao).includes("HR"));
  assert.ok(coXemMoiKhach(["HR"], banSao));
  assert.ok(!coXemMoiKhach(["HR"]), "bảng thật không đổi");
});

test("coXemMoiKhach: có ít nhất một mã trong tập thì true; tập rỗng, tài xế, thực tập, Nhân sự thì false", () => {
  assert.equal(coXemMoiKhach(["SALES"]), true);
  assert.equal(coXemMoiKhach(["DRIVER", "SALES_MANAGER", "SALES"]), true);
  assert.equal(coXemMoiKhach([]), false);
  assert.equal(coXemMoiKhach(["DRIVER", "INTERN", "HR", "FIELD", "PARTNER"]), false);
});
