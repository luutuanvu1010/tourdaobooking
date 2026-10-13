// Hàm thuần kế hoạch gộp (ADR-0068 Đ1 bước 1–4, Đ2; đặc tả G4–G8, G11). Mỗi tiêu chí một ca, viết TRƯỚC khi có mã.
import { test } from "node:test";
import assert from "node:assert/strict";
import { keHoachGop, type CongViecGop, type GiayToGop, type HoSoGop, type KeHoachGop, type LienHeGop, type NgoaiGop, type QuanHeGop } from "./gop.ts";

const HOM_NAY = "2026-10-01";
const hs = (id: string, x: Partial<HoSoGop> = {}): HoSoGop => ({
  id, kind: "PERSON", displayName: `Người ${id}`, active: true, mergedIntoId: null, laCongTyChu: false, coTaiKhoan: false, coHoSoTroVao: false, nhanDoiTac: false, noiBo: false,
  lienHe: [], congViec: [], quanHe: [], giayTo: [], ...x,
});
const RANH: NgoaiGop = { phuTrachDon: 0, laiChuyen: 0, toLaiChuyen: 0, chuXeChuyen: 0, soXe: 0, donLechTien: [] };
const sdt = (id: string, so: string, x: Partial<LienHeGop> = {}): LienHeGop => ({ id, kind: "PHONE", value: so, valueNormalized: so, label: null, isPrimary: false, validFrom: "2026-09-01", validTo: null, ...x });
const cv = (id: string, code: string, x: Partial<CongViecGop> = {}): CongViecGop => ({ id, code, name: code, group: "OTHER", locationId: null, locationName: null, validFrom: "2026-09-01", validTo: null, ...x });
const qh = (id: string, fromId: string, toId: string, x: Partial<QuanHeGop> = {}): QuanHeGop => ({ id, typeCode: "CONTACT_OF", typeName: "Người liên hệ của", fromId, fromName: fromId, toId, toName: toId, validFrom: "2026-09-01", validTo: null, ...x });
const gt = (id: string, typeCode: string, x: Partial<GiayToGop> = {}): GiayToGop => ({ id, typeCode, typeName: typeCode, className: null, previousId: null, voided: false, current: true, ...x });
const ma = (k: KeHoachGop) => k.chan.map((c) => c.code);
const ke = (a: HoSoGop, b: HoSoGop, ngoai: Partial<NgoaiGop> = {}) => keHoachGop(a, b, { ...RANH, ...ngoai }, HOM_NAY);

test("G1 nền: A có SĐT chính + Lái cano ở bến L1, B có tài khoản, không SĐT → chuyển cả hai, không chặn; mọi dòng mở của A đều đóng", () => {
  const k = ke(hs("a", { lienHe: [sdt("c1", "0901", { isPrimary: true })], congViec: [cv("r1", "BOAT_CAPTAIN", { locationId: "L1" })] }), hs("b", { coTaiKhoan: true }));
  assert.deepEqual(ma(k), []);
  assert.deepEqual(k.lienHe.mo.map((m) => [m.tu.id, m.chinh]), [["c1", true]]);
  assert.deepEqual(k.congViec.mo.map((r) => r.id), ["r1"]);
  assert.deepEqual(k.lienHe.dong.map((c) => c.id), ["c1"]);
  assert.deepEqual(k.congViec.dong.map((r) => r.id), ["r1"]);
});

test("G4 liên hệ: B đã có cùng số (chuẩn hoá) đang mở → bỏ vì đã có, không nhân đôi; A vẫn đóng dòng đó", () => {
  const k = ke(hs("a", { lienHe: [sdt("c1", "0901", { isPrimary: true })] }), hs("b", { lienHe: [sdt("c9", "0901", { isPrimary: true })] }));
  assert.deepEqual(k.lienHe.mo, []);
  assert.deepEqual(k.lienHe.bo.map((c) => c.id), ["c1"]);
  assert.deepEqual(k.lienHe.dong.map((c) => c.id), ["c1"]);
});

test("G5 liên hệ chính: B có SĐT chính Y, A có SĐT chính X → X sang B KHÔNG chính; B không có email chính → email chính của A giữ cờ chính", () => {
  const k = ke(
    hs("a", { lienHe: [sdt("x", "0901", { isPrimary: true }), sdt("e", "a@vidu.vn", { kind: "EMAIL", isPrimary: true })] }),
    hs("b", { lienHe: [sdt("y", "0902", { isPrimary: true })] }),
  );
  assert.deepEqual(k.lienHe.mo.map((m) => [m.tu.id, m.chinh]).sort(), [["e", true], ["x", false]]);
});

test("G4 công việc: B đang có cùng việc cùng nơi → bỏ (DA_CO); B vừa kết thúc hôm nay → bỏ (VUA_KET_THUC, không vướng trigger chồng lấn); B kết thúc hôm qua → chuyển", () => {
  const a = hs("a", { congViec: [cv("r1", "BOAT_CAPTAIN", { locationId: "L1" }), cv("r2", "GUIDE", { locationId: "L1" }), cv("r3", "AGENT")] });
  const b = hs("b", {
    congViec: [
      cv("s1", "BOAT_CAPTAIN", { locationId: "L1" }),
      cv("s2", "GUIDE", { locationId: "L1", validTo: HOM_NAY }),
      cv("s3", "AGENT", { validTo: "2026-09-30" }),
      cv("s4", "BOAT_CAPTAIN", { locationId: "L2" }),
    ],
  });
  const k = ke(a, b);
  assert.deepEqual(k.congViec.bo.map((x) => [x.cv.id, x.lyDo]), [["r1", "DA_CO"], ["r2", "VUA_KET_THUC"]]);
  assert.deepEqual(k.congViec.mo.map((r) => r.id), ["r3"]);
});

test("R7: dòng đã đóng trước hôm nay hoặc đúng hôm nay của A không chuyển, không đóng lại", () => {
  const k = ke(hs("a", { lienHe: [sdt("c1", "0901", { validTo: HOM_NAY })], congViec: [cv("r1", "AGENT", { validTo: "2026-09-20" })] }), hs("b"));
  assert.deepEqual([k.lienHe.dong, k.lienHe.mo, k.congViec.dong, k.congViec.mo], [[], [], [], []]);
});

test("G6 quan hệ: A 'Người liên hệ của' C → B–C mở, A–C đóng, C vào danh sách bên thứ ba; quan hệ A↔B chỉ đóng (không sinh B↔B); B đã có quan hệ y hệt → chỉ đóng", () => {
  const a = hs("a", { quanHe: [qh("q1", "a", "c"), qh("q2", "b", "a"), qh("q3", "a", "d")] });
  const b = hs("b", { quanHe: [qh("q2", "b", "a"), qh("q9", "b", "d")] });
  const k = ke(a, b);
  assert.deepEqual(k.quanHe.mo.map((m) => [m.tu.id, m.fromId, m.toId]), [["q1", "b", "c"]]);
  assert.deepEqual(k.quanHe.chiDong.map((x) => [x.qh.id, x.lyDo]), [["q2", "HAI_DAU_LA_MOT"], ["q3", "DA_CO"]]);
  assert.deepEqual(k.quanHe.dong.map((x) => x.id), ["q1", "q2", "q3"]);
  assert.deepEqual(k.benThu3, ["c", "d"]);
});

test("Review Focus 5: A là nhà xe cá nhân, D 'Tài xế của' A → vai Nhà xe chuyển sang B, quan hệ thành D → B; B là tài xế của A → chỉ đóng", () => {
  const a = hs("a", { congViec: [cv("r1", "CARRIER")], quanHe: [qh("q1", "d", "a", { typeCode: "DRIVES_FOR" }), qh("q2", "b", "a", { typeCode: "DRIVES_FOR" })] });
  const k = ke(a, hs("b"));
  assert.deepEqual(k.congViec.mo.map((r) => r.code), ["CARRIER"]);
  assert.deepEqual(k.quanHe.mo.map((m) => [m.fromId, m.toId, m.tu.typeCode]), [["d", "b", "DRIVES_FOR"]]);
  assert.deepEqual(k.quanHe.chiDong.map((x) => x.lyDo), ["HAI_DAU_LA_MOT"]);
});

test("G8 giấy tờ: A có bằng lái hiện hành, B không → huỷ ở A, chép sang B; B đã có bằng lái hiện hành → giữ ở A (không huỷ, không chép)", () => {
  const k1 = ke(hs("a", { giayTo: [gt("g1", "GPLX", { className: "D2" })] }), hs("b"));
  assert.deepEqual([k1.giayTo.huy.map((d) => d.id), k1.giayTo.chep.map((d) => d.id), k1.giayTo.giu], [["g1"], ["g1"], []]);
  const k2 = ke(hs("a", { giayTo: [gt("g1", "GPLX")] }), hs("b", { giayTo: [gt("h1", "GPLX")] }));
  assert.deepEqual([k2.giayTo.huy, k2.giayTo.chep, k2.giayTo.giu.map((d) => d.id)], [[], [], ["g1"]]);
});

test("G8 chuỗi gia hạn CCCD: hai dòng cùng số (c2 gia hạn c1), B không có CCCD → huỷ c2 TRƯỚC rồi c1; chép đúng một dòng (c2); dòng đã huỷ sẵn bỏ qua", () => {
  const a = hs("a", { giayTo: [gt("c1", "CCCD", { current: false }), gt("c2", "CCCD", { previousId: "c1" }), gt("c0", "CCCD", { voided: true, current: false })] });
  const k = ke(a, hs("b"));
  assert.deepEqual(k.giayTo.huy.map((d) => d.id), ["c2", "c1"]);
  assert.deepEqual(k.giayTo.chep.map((d) => d.id), ["c2"]);
});

test("G11: mỗi điều kiện chặn một mã riêng (409 ở route)", () => {
  const ca: [string, HoSoGop, HoSoGop, Partial<NgoaiGop>][] = [
    ["merge_same", hs("a"), hs("a"), {}],
    ["merge_not_person", hs("a", { kind: "ORGANIZATION" }), hs("b"), {}],
    ["merge_inactive", hs("a"), hs("b", { active: false }), {}],
    ["merge_inactive", hs("a", { mergedIntoId: "z" }), hs("b"), {}],
    ["merge_owner_company", hs("a"), hs("b", { laCongTyChu: true }), {}],
    ["merge_source_has_account", hs("a", { coTaiKhoan: true }), hs("b"), {}],
    ["merge_both_accounts", hs("a", { coTaiKhoan: true }), hs("b", { coTaiKhoan: true }), {}],
    ["merge_source_account_role", hs("a", { congViec: [cv("r", "DRIVER_INTERNAL", { group: "INTERNAL" })] }), hs("b"), {}],
    ["merge_source_busy", hs("a"), hs("b"), { phuTrachDon: 2 }],
    ["merge_source_busy", hs("a"), hs("b"), { laiChuyen: 1 }],
    ["merge_source_busy", hs("a"), hs("b"), { toLaiChuyen: 1 }],
    ["merge_source_busy", hs("a"), hs("b"), { chuXeChuyen: 1 }],
    ["merge_source_is_target", hs("a", { coHoSoTroVao: true }), hs("b"), {}],
    ["merge_source_future_row", hs("a", { congViec: [cv("r", "AGENT", { validFrom: "2026-10-05" })] }), hs("b"), {}], // [Dừng Q5]
    ["merge_order_invalid", hs("a"), hs("b"), { donLechTien: ["TD-0001"] }],
    ["merge_source_owns_vehicle", hs("a"), hs("b"), { soXe: 1 }], // [Dừng Q2]
  ];
  for (const [code, a, b, ngoai] of ca) assert.ok(ma(ke(a, b, ngoai)).includes(code as never), `${code}: ${JSON.stringify(ma(ke(a, b, ngoai)))}`);
  const busy = ke(hs("a"), hs("b"), { phuTrachDon: 2, laiChuyen: 1 }).chan.find((c) => c.code === "merge_source_busy")!;
  assert.match(busy.message, /phụ trách 2 đơn/);
  assert.match(busy.message, /lái 1 chuyến/);
  assert.match(ke(hs("a"), hs("b"), { donLechTien: ["TD-0001"] }).chan[0]!.message, /TD-0001/);
  for (const [, a, b, ngoai] of ca) for (const c of ke(a, b, ngoai).chan) assert.match(c.message, /[à-ỹ]/, `câu tiếng Việt có dấu: ${c.code}`);
});

test("R6 LC-3 (chỉ tới được ở mức hàm thuần): B giữ vai nội bộ, A giữ vai bên ngoài → có merge_role_group_conflict (kèm merge_source_account_role)", () => {
  const k = ke(hs("a", { congViec: [cv("r", "TRAVEL_AGENCY", { group: "EXTERNAL" })] }), hs("b", { congViec: [cv("s", "SALES_STAFF", { group: "INTERNAL" })] }));
  assert.deepEqual(ma(k).sort(), ["merge_role_group_conflict", "merge_source_account_role"]);
});

test("có chặn vẫn trả đủ phần chuyển / giữ / bỏ (xem trước hiện cả hai)", () => {
  const k = ke(hs("a", { lienHe: [sdt("c1", "0901")] }), hs("b"), { phuTrachDon: 1 });
  assert.deepEqual(ma(k), ["merge_source_busy"]);
  assert.equal(k.lienHe.mo.length, 1);
});

test("Phán quyết Task 3: liên hệ của A bắt đầu sau hôm nay → merge_source_future_row (đóng 'hôm nay' sẽ phạm CHECK ngày đóng ≥ ngày bắt đầu); bắt đầu hôm nay thì không chặn", () => {
  assert.deepEqual(ma(ke(hs("a", { lienHe: [sdt("c", "0912000111", { validFrom: "2026-10-02" })] }), hs("b"))), ["merge_source_future_row"]);
  assert.deepEqual(ma(ke(hs("a", { lienHe: [sdt("c", "0912000111", { validFrom: HOM_NAY })] }), hs("b"))), []);
});
