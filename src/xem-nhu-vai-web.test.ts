// ADR-0180 Task 6: luật HIỆN/ẨN của mục chọn "Xem như vai trò khác" và thanh báo (thuần, không DOM); phần dựng DOM kiểm bằng typecheck + build + kịch bản Chrome.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PERMISSION_LABEL, type PermissionCode } from "./shared/permissions.ts";
import { VAI_CHON_DUOC } from "./shared/xem-nhu-vai.ts";
import { CAU_GOI_Y_XEM_NHU, NHAN_THOAT_XEM_NHU, NHAN_XEM_NHU, TIEU_DE_XEM_NHU, cauThanhXemNhu, hienMucXemNhuVai, hienThanhXemNhu, luaChonXemNhu } from "./shared/xem-nhu-vai-hien-thi.ts";

const staff = (permissions: PermissionCode[], realPermissions?: PermissionCode[]) => ({ permissions, ...(realPermissions ? { realPermissions } : {}) });

test("mục chọn: hiện cho Toàn quyền THẬT, dù đang xem như vai trò khác", () => {
  assert.equal(hienMucXemNhuVai(staff(["SUPER_ADMIN"])), true);
  assert.equal(hienMucXemNhuVai(staff(["SALES"], ["SUPER_ADMIN"])), true);
  assert.equal(hienMucXemNhuVai(staff(["ADMIN", "SUPER_ADMIN"])), true);
});

test("mục chọn: ẩn với mọi người khác", () => {
  for (const p of ["SALES", "ADMIN", "ACCOUNTING", "FIELD", "PARTNER", "INTERN", "DRIVER", "HR", "SALES_MANAGER", "DRIVER_PARTNER"] as PermissionCode[]) {
    assert.equal(hienMucXemNhuVai(staff([p])), false, p);
  }
  assert.equal(hienMucXemNhuVai(staff(["SALES", "ADMIN"])), false);
  // quyền hiệu lực có SUPER_ADMIN nhưng quyền thật thì không: không thể xảy ra, nhưng luật hỏi quyền THẬT
  assert.equal(hienMucXemNhuVai(staff(["SUPER_ADMIN"], ["SALES"])), false);
});

test("các lựa chọn: đúng VAI_CHON_DUOC, nhãn từ PERMISSION_LABEL, không mã thô", () => {
  const ds = luaChonXemNhu();
  assert.deepEqual(ds.map((x) => x.ma), [...VAI_CHON_DUOC]);
  for (const x of ds) {
    assert.equal(x.nhan, PERMISSION_LABEL[x.ma]);
    assert.notEqual(x.nhan, x.ma);
    assert.ok(!/^[A-Z_]+$/.test(x.nhan), x.nhan);
  }
  assert.ok(!ds.some((x) => (x.ma as string) === "SUPER_ADMIN"));
});

test("thanh báo: hiện khi và chỉ khi me.actingRole; luôn kèm nút Thoát", () => {
  assert.equal(hienThanhXemNhu({}), null);
  assert.equal(hienThanhXemNhu({ actingRole: undefined }), null);
  const t = hienThanhXemNhu({ actingRole: "ACCOUNTING" });
  assert.ok(t);
  assert.equal(t.cau, `Đang xem như vai trò ${PERMISSION_LABEL.ACCOUNTING}`);
  assert.equal(t.nutThoat, NHAN_THOAT_XEM_NHU);
  for (const ma of VAI_CHON_DUOC) {
    const x = hienThanhXemNhu({ actingRole: ma });
    assert.ok(x && x.nutThoat === "Thoát" && x.cau === cauThanhXemNhu(ma) && !x.cau.includes(ma));
  }
});

test("chữ: dùng «vai trò», không «vai» đứng một mình (ADR-0130)", () => {
  assert.equal(TIEU_DE_XEM_NHU, "Xem như vai trò khác");
  assert.equal(NHAN_XEM_NHU, "Xem");
  assert.ok(CAU_GOI_Y_XEM_NHU.length > 20);
});

test("thanh báo nằm trong khung chung (shell) và mục chọn ở trang Tôi, chỉ hỏi qua hàm thuần", () => {
  const shell = readFileSync(new URL("../web/shell.ts", import.meta.url), "utf8");
  const account = readFileSync(new URL("../web/account.ts", import.meta.url), "utf8");
  assert.match(shell, /hienThanhXemNhu\(me\)/);
  assert.match(account, /hienMucXemNhuVai\(staff\)/);
  for (const t of [shell, account]) assert.doesNotMatch(t, /realPermissions/);
});
