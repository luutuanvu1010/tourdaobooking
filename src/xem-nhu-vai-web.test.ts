// ADR-0180 Task 6: luật HIỆN/ẨN của mục chọn "Xem như vai trò khác" và thanh báo (thuần, không DOM); phần dựng DOM kiểm bằng typecheck + build + kịch bản Chrome.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PERMISSION_LABEL, type PermissionCode } from "./shared/permissions.ts";
import { VAI_CHON_DUOC, laToanQuyenThat } from "./shared/xem-nhu-vai.ts";
import { CAU_GOI_Y_XEM_NHU, NHAN_CHON_XEM_NHU, NHAN_THOAT_XEM_NHU, NHAN_XEM_NHU, TIEU_DE_XEM_NHU, cauThanhXemNhu, hienMucXemNhuVai, hienThanhXemNhu, luaChonXemNhu } from "./shared/xem-nhu-vai-hien-thi.ts";

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

test("thanh báo: bảo trì đang bật thì thêm « · Đang bảo trì»; không thì không có", () => {
  assert.equal(hienThanhXemNhu({ actingRole: "SALES", maintenance: { on: true } })!.cau, `${cauThanhXemNhu("SALES")} · Đang bảo trì`);
  assert.equal(hienThanhXemNhu({ actingRole: "SALES", maintenance: { on: false } })!.cau, cauThanhXemNhu("SALES"));
  assert.equal(hienThanhXemNhu({ maintenance: { on: true } }), null);
});

test("hienMucXemNhuVai chính là laToanQuyenThat (không viết lại)", () => {
  assert.equal(hienMucXemNhuVai, laToanQuyenThat);
});

// Nguồn: không dựng được DOM của initShell trong bài thuần, nên khoá ở mức MÃ NGUỒN của khung chung (web/shell.ts) — chọn cách này, nói rõ.
test("khung chung: thanh báo dùng đúng hàm chung, Thoát = DELETE rồi tải lại thật, không chép chữ", () => {
  const shell = readFileSync(new URL("../web/shell.ts", import.meta.url), "utf8");
  const account = readFileSync(new URL("../web/menu-tai-khoan.ts", import.meta.url), "utf8"); // chủ dự án 8/11: mục chọn chuyển từ trang Tôi vào menu tên tài khoản
  assert.match(shell, /import \{ hienThanhXemNhu \} from "\.\.\/src\/shared\/xem-nhu-vai-thanh"/);
  assert.match(shell, /const t = hienThanhXemNhu\(me\);\s*\n\s*if \(t\) datDai\("xem-nhu-vai", \{ cau: t\.cau, nut: \{ nhan: t\.nutThoat,/);
  assert.match(shell, /"\/api\/auth\/xem-nhu-vai", \{ method: "DELETE" \}\)\.finally\(taiLai\)/);
  assert.match(shell, /ganThanhXemNhu\(me\);/);
  assert.doesNotMatch(shell, /location\.replace\(location\.href\)/);
  assert.doesNotMatch(shell, /"Đang xem như vai trò|`Đang xem như vai trò/);
  assert.doesNotMatch(shell, /nhan: "Thoát"/);
  assert.match(account, /hienMucXemNhuVai\(staff\)/);
  for (const t of [shell, account]) assert.doesNotMatch(t, /realPermissions/);
});

test("nhãn ô chọn vai là «Vai trò muốn xem» (ghim chữ)", () => {
  assert.equal(NHAN_CHON_XEM_NHU, "Vai trò muốn xem");
});
