import { test } from "node:test";
import assert from "node:assert/strict";
import { boDieuKien, chipLocDon, chotLocDon, dsNguoiLapChon, docLocDaNho, docLocDon, khoangNhanh, LOC_DON_TOI_DA_DICH_VU, LOC_TRONG, NGUOI_LAP_TOI_CU, soDieuKienLoc, thamSoLocDon, type LocDonMan } from "./loc-don.ts";

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
const KHAC = "22222222-2222-4222-8222-222222222222";
const L = (x: Partial<LocDonMan>): LocDonMan => ({ ...LOC_TRONG, ...x });

test("thamSoLocDon: bộ lọc màn → tham số máy chủ đọc lại được bằng docLocDon (cùng một luật); 'đơn tôi lập' = mã của người xem", () => {
  const loc = L({ tu: "2026-10-01", den: "2026-10-03", dichVu: ["TD101", "ZE1"], trangThai: ["draft", "confirmed"], nguoiLap: TOI });
  const p = new URLSearchParams(thamSoLocDon(loc, TOI));
  assert.deepEqual(docLocDon(p), { ok: true, loc: { tu: "2026-10-01", den: "2026-10-03", dichVu: ["TD101", "ZE1"], trangThai: ["draft", "confirmed"], nguoiLap: TOI } });
  assert.deepEqual(thamSoLocDon(LOC_TRONG, TOI), [], "không lọc → không tham số");
});

test("soDieuKienLoc / chipLocDon / boDieuKien: mỗi nhóm một chip, nhãn tiếng Việt; bỏ từng nhóm", () => {
  const loc = L({ tu: "2026-10-01", den: "2026-10-03", dichVu: ["TD101", "ZE1"], trangThai: ["draft", "confirmed"], nguoiLap: TOI });
  assert.equal(soDieuKienLoc(loc), 4);
  assert.equal(soDieuKienLoc(LOC_TRONG), 0);
  const ten = new Map([["TD101", "Tour 4 đảo"]]);
  assert.deepEqual(chipLocDon(loc, ten, { toiId: TOI, ten: new Map() }), [
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
  assert.equal(boDieuKien(loc, "nguoiLap").nguoiLap, null);
});

test("khoangNhanh: Hôm nay / Ngày mai / 3 ngày tới / Tuần này theo ngày giờ Việt Nam truyền vào", () => {
  assert.deepEqual(khoangNhanh("hom-nay", "2026-09-30"), { tu: "2026-09-30", den: "2026-09-30" });
  assert.deepEqual(khoangNhanh("ngay-mai", "2026-09-30"), { tu: "2026-10-01", den: "2026-10-01" });
  assert.deepEqual(khoangNhanh("3-ngay", "2026-09-30"), { tu: "2026-09-30", den: "2026-10-02" });
  assert.deepEqual(khoangNhanh("tuan-nay", "2026-09-30"), { tu: "2026-09-28", den: "2026-10-04" });
});

test("docLocDaNho: đọc bộ lọc đã nhớ trên máy — rác / sai dạng / bản cũ → không lọc (không bao giờ ném lỗi)", () => {
  const loc = L({ tu: "2026-10-01", dichVu: ["TD101"], trangThai: ["cancelled"], nguoiLap: KHAC });
  assert.deepEqual(docLocDaNho(JSON.stringify(loc)), loc);
  for (const rac of [null, "", "{", "[]", "42", "null", JSON.stringify({ tu: "hôm qua" }), JSON.stringify({ trangThai: ["xong"] }), JSON.stringify({ dichVu: "TD101" }), JSON.stringify({ tu: "2026-10-05", den: "2026-10-01" })]) {
    assert.deepEqual(docLocDaNho(rac), LOC_TRONG, String(rac));
  }
  assert.deepEqual(docLocDaNho(JSON.stringify({ nguoiLap: "x' OR 1=1" })), LOC_TRONG, "mã người lập sai dạng → không lọc");
});

// ---- ADR-0067: ô "Người lập" chọn từng người ------------------------------------------------------------------------------------------------------
test("ADR-0067 docLocDaNho: bộ lọc cũ đã nhớ 'Đơn tôi lập' (cuaToi: true, bản ≤ 1.44) → dấu NGUOI_LAP_TOI_CU (chưa biết mã người xem lúc đọc bộ nhớ)", () => {
  const cu = JSON.stringify({ tu: null, den: null, dichVu: [], trangThai: ["draft"], cuaToi: true });
  assert.deepEqual(docLocDaNho(cu), L({ trangThai: ["draft"], nguoiLap: NGUOI_LAP_TOI_CU }));
  assert.deepEqual(docLocDaNho(JSON.stringify({ cuaToi: false })), LOC_TRONG);
  assert.deepEqual(docLocDaNho(JSON.stringify({ cuaToi: true, nguoiLap: KHAC })), L({ nguoiLap: KHAC }), "khoá mới thắng khoá cũ");
  assert.deepEqual(thamSoLocDon(L({ nguoiLap: NGUOI_LAP_TOI_CU }), TOI), [["nguoiLap", TOI]], "dấu cũ gửi đi = mã người xem");
  assert.deepEqual(thamSoLocDon(L({ nguoiLap: KHAC }), TOI), [["nguoiLap", KHAC]]);
});

test("ADR-0067 chotLocDon: sau khi biết người xem — dấu cũ thành mã chính mình; người KHÔNG xem mọi đơn thì bỏ ô người lập (bộ nhớ của tài khoản khác trên cùng máy)", () => {
  assert.deepEqual(chotLocDon(L({ nguoiLap: NGUOI_LAP_TOI_CU, trangThai: ["draft"] }), TOI, true), L({ nguoiLap: TOI, trangThai: ["draft"] }));
  assert.deepEqual(chotLocDon(L({ nguoiLap: KHAC }), TOI, true), L({ nguoiLap: KHAC }));
  assert.deepEqual(chotLocDon(L({ nguoiLap: KHAC, tu: "2026-10-01" }), TOI, false), L({ tu: "2026-10-01" }));
  assert.deepEqual(chotLocDon(L({ nguoiLap: NGUOI_LAP_TOI_CU }), TOI, false), LOC_TRONG);
  assert.deepEqual(chotLocDon(L({ nguoiLap: TOI }), TOI, false), LOC_TRONG);
  assert.deepEqual(chotLocDon(L({ dichVu: ["ZE1"] }), TOI, false), L({ dichVu: ["ZE1"] }));
});

test("ADR-0067 chipLocDon: người lập = chính mình → 'Đơn tôi lập'; người khác → tên từ danh sách; thiếu tên → 'Người lập đã chọn' (không hiện mã thô)", () => {
  const ten = new Map([[KHAC, "Bình"]]);
  const chip = (nguoiLap: string) => chipLocDon(L({ nguoiLap }), new Map(), { toiId: TOI, ten });
  assert.deepEqual(chip(TOI), [{ khoa: "nguoiLap", nhan: "Đơn tôi lập" }]);
  assert.deepEqual(chip(NGUOI_LAP_TOI_CU), [{ khoa: "nguoiLap", nhan: "Đơn tôi lập" }]);
  assert.deepEqual(chip(KHAC), [{ khoa: "nguoiLap", nhan: "Bình" }]);
  assert.deepEqual(chip("33333333-3333-4333-8333-333333333333"), [{ khoa: "nguoiLap", nhan: "Người lập đã chọn" }]);
  assert.deepEqual(chipLocDon(L({ nguoiLap: KHAC }), new Map()), [{ khoa: "nguoiLap", nhan: "Người lập đã chọn" }], "chưa tải danh sách");
  assert.equal(soDieuKienLoc(L({ nguoiLap: KHAC })), 1);
});

test("ADR-0067 dsNguoiLapChon: bỏ chính người xem; gõ tìm không dấu vẫn khớp; tên trùng (kể cả '(chưa có hồ sơ)') kèm ngày đơn gần nhất", () => {
  const ds = [
    { id: TOI, ten: "Tôi Đây", ganNhat: "2026-09-30" },
    { id: "a", ten: "Nguyễn Văn Đức", ganNhat: "2026-09-29" },
    { id: "b", ten: "Lê Hoa", ganNhat: "2026-09-28" },
    { id: "c", ten: "Lê Hoa", ganNhat: "2026-08-01" },
    { id: "d", ten: "(chưa có hồ sơ)", ganNhat: "2026-07-02" },
    { id: "e", ten: "(chưa có hồ sơ)", ganNhat: "2026-07-01" },
  ];
  assert.deepEqual(dsNguoiLapChon(ds, TOI, ""), [
    { id: "a", nhan: "Nguyễn Văn Đức" },
    { id: "b", nhan: "Lê Hoa · đơn gần nhất 28/09" },
    { id: "c", nhan: "Lê Hoa · đơn gần nhất 01/08" },
    { id: "d", nhan: "(chưa có hồ sơ) · đơn gần nhất 02/07" },
    { id: "e", nhan: "(chưa có hồ sơ) · đơn gần nhất 01/07" },
  ], "giữ thứ tự máy chủ (đơn gần nhất trước), không có chính mình");
  assert.deepEqual(dsNguoiLapChon(ds, TOI, "duc").map((x) => x.id), ["a"], "không dấu, đ → d");
  assert.deepEqual(dsNguoiLapChon(ds, TOI, "  LÊ hoa ").map((x) => x.id), ["b", "c"]);
  assert.deepEqual(dsNguoiLapChon(ds, TOI, "tôi").map((x) => x.id), [], "chính mình không nằm trong danh sách dưới");
});
