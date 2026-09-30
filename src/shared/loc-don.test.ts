import { test } from "node:test";
import assert from "node:assert/strict";
import { docLocDon, LOC_DON_TOI_DA_DICH_VU } from "./loc-don.ts";

const doc = (qs: string) => docLocDon(new URLSearchParams(qs));

test("docLocDon: không tham số → không lọc gì (giữ hành vi cũ)", () => {
  assert.deepEqual(doc(""), { ok: true, loc: { tu: null, den: null, dichVu: [], trangThai: [], nguoiLap: null } });
});

test("docLocDon: khoảng ngày đi — một đầu hoặc hai đầu; sai dạng, sai lịch, đảo đầu → câu tiếng Việt", () => {
  assert.deepEqual(doc("tu=2026-10-01&den=2026-10-03"), { ok: true, loc: { tu: "2026-10-01", den: "2026-10-03", dichVu: [], trangThai: [], nguoiLap: null } });
  assert.equal((doc("tu=2026-10-01") as any).loc.den, null);
  assert.equal((doc("den=2026-10-01") as any).loc.tu, null);
  assert.equal((doc("tu=2026-10-01&den=2026-10-01") as any).ok, true, "một ngày");
  for (const bad of ["tu=01/10/2026", "tu=2026-02-30", "den=2026-1-1", "tu=hom-nay"]) {
    const r = doc(bad);
    assert.equal(r.ok, false, bad);
    assert.match((r as any).message, /Ngày đi/, bad);
  }
  const dao = doc("tu=2026-10-05&den=2026-10-01");
  assert.equal(dao.ok, false);
  assert.match((dao as any).message, /Từ ngày.*sau.*Đến ngày/);
});

test("docLocDon: ô trống (?tu=&status=) = không lọc ô đó", () => {
  assert.deepEqual(doc("tu=&den=&status=&dichVu=&nguoiLap="), { ok: true, loc: { tu: null, den: null, dichVu: [], trangThai: [], nguoiLap: null } });
});

test("docLocDon: trạng thái chọn nhiều (lặp tham số), bỏ trùng; mã lạ → 400", () => {
  assert.deepEqual((doc("status=draft&status=confirmed&status=draft") as any).loc.trangThai, ["draft", "confirmed"]);
  assert.deepEqual((doc("status=cancelled") as any).loc.trangThai, ["cancelled"], "một trạng thái như cũ");
  const r = doc("status=done");
  assert.equal(r.ok, false);
  assert.equal((r as any).message, "Trạng thái lọc không hợp lệ.");
});

test("docLocDon: dịch vụ chọn nhiều theo mã danh mục, bỏ trùng; quá giới hạn hoặc mã sai dạng → 400", () => {
  assert.deepEqual((doc("dichVu=TD101&dichVu=ZE1&dichVu=TD101") as any).loc.dichVu, ["TD101", "ZE1"]);
  const nhieu = new URLSearchParams();
  for (let i = 0; i <= LOC_DON_TOI_DA_DICH_VU; i++) nhieu.append("dichVu", `M${i}`);
  const r = docLocDon(nhieu);
  assert.equal(r.ok, false);
  assert.match((r as any).message, new RegExp(`tối đa ${LOC_DON_TOI_DA_DICH_VU} dịch vụ`));
  const sai = doc("dichVu=" + encodeURIComponent("a b;--"));
  assert.equal(sai.ok, false);
  assert.match((sai as any).message, /Mã dịch vụ/);
});

test("docLocDon: người lập — một mã; sai dạng hoặc nhiều mã → 400", () => {
  assert.equal((doc("nguoiLap=11111111-1111-4111-8111-111111111111") as any).loc.nguoiLap, "11111111-1111-4111-8111-111111111111");
  assert.equal(doc("nguoiLap=" + encodeURIComponent("x' OR 1=1")).ok, false);
  const hai = doc("nguoiLap=a1&nguoiLap=b2");
  assert.equal(hai.ok, false);
  assert.match((hai as any).message, /một người lập/);
});
