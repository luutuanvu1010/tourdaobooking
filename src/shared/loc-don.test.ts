import { test } from "node:test";
import assert from "node:assert/strict";
import { boDieuKien, chipLocDon, docLocDaNho, docLocDon, khoangNhanh, LOC_DON_TOI_DA_DICH_VU, LOC_TRONG, soDieuKienLoc, thamSoLocDon, type LocDonMan } from "./loc-don.ts";

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

// ---- Phía màn (chủ duyệt ảnh a, 30/9) -------------------------------------------------------------------------------
const TOI = "11111111-1111-4111-8111-111111111111";
const L = (x: Partial<LocDonMan>): LocDonMan => ({ ...LOC_TRONG, ...x });

test("thamSoLocDon: bộ lọc màn → tham số máy chủ đọc lại được bằng docLocDon (cùng một luật); 'đơn tôi lập' = mã của người xem", () => {
  const loc = L({ tu: "2026-10-01", den: "2026-10-03", dichVu: ["TD101", "ZE1"], trangThai: ["draft", "confirmed"], cuaToi: true });
  const p = new URLSearchParams(thamSoLocDon(loc, TOI));
  assert.deepEqual(docLocDon(p), { ok: true, loc: { tu: "2026-10-01", den: "2026-10-03", dichVu: ["TD101", "ZE1"], trangThai: ["draft", "confirmed"], nguoiLap: TOI } });
  assert.deepEqual(thamSoLocDon(LOC_TRONG, TOI), [], "không lọc → không tham số");
});

test("soDieuKienLoc / chipLocDon / boDieuKien: mỗi nhóm một chip, nhãn tiếng Việt; bỏ từng nhóm", () => {
  const loc = L({ tu: "2026-10-01", den: "2026-10-03", dichVu: ["TD101", "ZE1"], trangThai: ["draft", "confirmed"], cuaToi: true });
  assert.equal(soDieuKienLoc(loc), 4);
  assert.equal(soDieuKienLoc(LOC_TRONG), 0);
  const ten = new Map([["TD101", "Tour 4 đảo"]]);
  assert.deepEqual(chipLocDon(loc, ten), [
    { khoa: "ngay", nhan: "Ngày đi 01/10 – 03/10" },
    { khoa: "dichVu", nhan: "Tour 4 đảo +1" },
    { khoa: "trangThai", nhan: "Chờ xác nhận, Đã xác nhận" },
    { khoa: "nguoiLap", nhan: "Đơn tôi lập" },
  ]);
  assert.deepEqual(chipLocDon(L({ tu: "2026-10-01" }), ten), [{ khoa: "ngay", nhan: "Ngày đi từ 01/10" }]);
  assert.deepEqual(chipLocDon(L({ den: "2026-10-01" }), ten), [{ khoa: "ngay", nhan: "Ngày đi đến 01/10" }]);
  assert.deepEqual(chipLocDon(L({ tu: "2026-10-01", den: "2026-10-01" }), ten), [{ khoa: "ngay", nhan: "Ngày đi 01/10" }]);
  assert.deepEqual(chipLocDon(L({ dichVu: ["ZE1"] }), ten), [{ khoa: "dichVu", nhan: "ZE1" }], "không có tên → mã");
  assert.deepEqual(boDieuKien(loc, "ngay"), { ...loc, tu: null, den: null });
  assert.deepEqual(boDieuKien(loc, "dichVu").dichVu, []);
  assert.deepEqual(boDieuKien(loc, "trangThai").trangThai, []);
  assert.equal(boDieuKien(loc, "nguoiLap").cuaToi, false);
});

test("khoangNhanh: Hôm nay / Ngày mai / 3 ngày tới / Tuần này theo ngày giờ Việt Nam truyền vào", () => {
  assert.deepEqual(khoangNhanh("hom-nay", "2026-09-30"), { tu: "2026-09-30", den: "2026-09-30" });
  assert.deepEqual(khoangNhanh("ngay-mai", "2026-09-30"), { tu: "2026-10-01", den: "2026-10-01" });
  assert.deepEqual(khoangNhanh("3-ngay", "2026-09-30"), { tu: "2026-09-30", den: "2026-10-02" });
  assert.deepEqual(khoangNhanh("tuan-nay", "2026-09-30"), { tu: "2026-09-28", den: "2026-10-04" });
});

test("docLocDaNho: đọc bộ lọc đã nhớ trên máy — rác / sai dạng / bản cũ → không lọc (không bao giờ ném lỗi)", () => {
  const loc = L({ tu: "2026-10-01", dichVu: ["TD101"], trangThai: ["cancelled"], cuaToi: true });
  assert.deepEqual(docLocDaNho(JSON.stringify(loc)), loc);
  for (const rac of [null, "", "{", "[]", "42", "null", JSON.stringify({ tu: "hôm qua" }), JSON.stringify({ trangThai: ["xong"] }), JSON.stringify({ dichVu: "TD101" }), JSON.stringify({ tu: "2026-10-05", den: "2026-10-01" })]) {
    assert.deepEqual(docLocDaNho(rac), LOC_TRONG, String(rac));
  }
});
