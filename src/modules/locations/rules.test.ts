import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLocationCreate, validateLocationUpdate } from "./rules.ts";

const ok = { code: "QUAY_VE_05", name: "  Quầy   vé 05 ", locationTypeCode: "TICKET_COUNTER" };

test("tạo: hợp lệ — chuẩn hoá tên, mặc định địa chỉ null và thứ tự 0", () => {
  const r = validateLocationCreate(ok);
  assert.deepEqual(r, { ok: true, value: { code: "QUAY_VE_05", name: "Quầy vé 05", locationTypeCode: "TICKET_COUNTER", address: null, sortOrder: 0 } });
  const withAddr = validateLocationCreate({ ...ok, address: " 12 Trần Phú ", sortOrder: 9 });
  assert.equal(withAddr.ok && withAddr.value.address, "12 Trần Phú");
});

test("tạo: từ chối mã sai, tên rỗng/quá dài, loại sai, địa chỉ quá dài, thứ tự sai", () => {
  const bad: [Record<string, unknown> | null, RegExp][] = [
    [null, /không hợp lệ/],
    [{ ...ok, code: "quay_ve" }, /Mã địa điểm/],
    [{ ...ok, code: "Q" }, /Mã địa điểm/],
    [{ ...ok, code: "1ABC" }, /Mã địa điểm/],
    [{ ...ok, name: "   " }, /Tên địa điểm/],
    [{ ...ok, name: "x".repeat(101) }, /tối đa 100/],
    [{ ...ok, locationTypeCode: "office" }, /Loại địa điểm/],
    [{ ...ok, address: "x".repeat(301) }, /tối đa 300/],
    [{ ...ok, sortOrder: -1 }, /Thứ tự/],
    [{ ...ok, sortOrder: 1.5 }, /Thứ tự/],
    [{ ...ok, sortOrder: "3" }, /Thứ tự/],
  ];
  for (const [body, re] of bad) {
    const r = validateLocationCreate(body);
    assert.ok(!r.ok && re.test(r.message), JSON.stringify(body) + " → " + JSON.stringify(r));
  }
});

test("sửa: bắt buộc expectedUpdatedAt và active kiểu boolean; mã không đổi được", () => {
  const body = { name: "Quầy vé 05", locationTypeCode: "TICKET_COUNTER", active: false, expectedUpdatedAt: "2026-09-20T00:00:00.000Z", code: "BO_QUA" };
  const r = validateLocationUpdate(body);
  assert.deepEqual(r, { ok: true, value: { name: "Quầy vé 05", locationTypeCode: "TICKET_COUNTER", address: null, sortOrder: 0, active: false, expectedUpdatedAt: "2026-09-20T00:00:00.000Z" } });
  assert.ok(!("code" in (r.ok ? r.value : {})), "mã là định danh, không nằm trong dữ liệu sửa");
  assert.ok(!validateLocationUpdate({ ...body, expectedUpdatedAt: undefined }).ok);
  assert.ok(!validateLocationUpdate({ ...body, active: "false" }).ok);
});
