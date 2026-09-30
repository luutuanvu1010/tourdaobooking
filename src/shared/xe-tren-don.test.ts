// ADR-0059 — luật thuần của khối xe trên chi tiết đơn (web/order.ts): ai được gọi route, câu hiện cho từng xe / chặng chưa xếp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, type PermissionCode } from "./permissions.ts";
import { CHUA_XEP_XE, dongXeTrenDon, duocXemXeTrenDon } from "./xe-tren-don.ts";

const ai = (...permissions: PermissionCode[]) => ({ id: "x", permissions });

test("duocXemXeTrenDon: đúng Bán hàng, Kế toán, Quản trị, Toàn quyền (một mình); HDV, Đối tác, Thực tập, Tài xế, Tài xế đối tác không; lai Bán hàng + HDV có, HDV + Thực tập không", () => {
  assert.deepEqual(PERMISSION_CODES.filter((p) => duocXemXeTrenDon(ai(p))), ["SALES", "ACCOUNTING", "ADMIN", "SUPER_ADMIN"]);
  assert.equal(duocXemXeTrenDon(ai("SALES", "FIELD")), true);
  assert.equal(duocXemXeTrenDon(ai("FIELD", "INTERN")), false);
  assert.equal(duocXemXeTrenDon(ai("DRIVER")), false, "tài xế công ty (trip.view assigned) không qua");
  assert.equal(duocXemXeTrenDon(ai()), false);
});

test("dongXeTrenDon: 'Xe <biển> · Tài xế <tên> · <n> khách · <trạng thái tiếng Việt>'; chưa có tài xế nói rõ; không lộ mã thô", () => {
  assert.equal(dongXeTrenDon({ bienSo: "79B-123.45", tenTaiXe: "Nguyễn Văn A", soKhach: 4, trangThai: "PLANNED" }), "Xe 79B-123.45 · Tài xế Nguyễn Văn A · 4 khách · Đã lên kế hoạch");
  assert.equal(dongXeTrenDon({ bienSo: "79B-123.45", tenTaiXe: null, soKhach: 1, trangThai: "RUNNING" }), "Xe 79B-123.45 · Chưa có tài xế · 1 khách · Đang chạy");
  for (const t of ["PLANNED", "RUNNING", "ENDED", "ENDED_INTERRUPTED", "CANCELLED"] as const) {
    assert.doesNotMatch(dongXeTrenDon({ bienSo: "X", tenTaiXe: "Y", soKhach: 1, trangThai: t }), /[A-Z]{4,}/, t);
  }
  assert.equal(CHUA_XEP_XE, "Chưa xếp xe");
});
