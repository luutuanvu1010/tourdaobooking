// Luật thuần cam kết "xe riêng" / "xe tối thiểu N chỗ" trên chặng (ADR-0056 VK3-A A2; kế hoạch Đợt 7 Task 3, C4, C5): R-XR, R-CX, khoá phá lệ.
// `chang` = các chặng có ≥ 1 suất khách MỞ trên chuyến, ở trạng thái SAU lệnh. Suất người đi kèm (CREW) không tính (G-2) — kiểm qua cổng xuất bến thật.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { khoaCamKet, kiemCamKet, nhanCamKet } from "./cam-ket-xe.ts";
import type { ChangVao, ChinhSachVao, ChuyenVao, SuatVao } from "./dieu-phoi-kieu.ts";
import { kiemXuatBen } from "./dieu-phoi-kiem.ts";
import { vnLocalToMs } from "./vn-date.ts";

type ChangCK = Pick<ChangVao, "legId" | "orderId" | "orderCode" | "xeRieng" | "choToiThieu">;
const ch = (legId: string, orderId: string, v: Partial<ChangCK> = {}): ChangCK => ({
  legId, orderId, orderCode: `ĐH-${orderId.toUpperCase()}`, xeRieng: false, choToiThieu: null, ...v,
});
const XE7 = { id: "xe-7", soCho: 7 };
const XE15 = { id: "xe-15", soCho: 15 };
const ck = (chang: ChangCK[], xe = XE15, khoaDaPhaLe: string | null = null) => kiemCamKet({ xe, chang, khoaDaPhaLe });
const dong = (r: ReturnType<typeof kiemCamKet>) => r.viPham.map((v) => `${v.legId}:${v.loai}`).sort();

test("R-XR: đơn A có chặng xe riêng và chỉ suất của A → không vi phạm; thêm suất người đi kèm (CREW) vẫn không vi phạm (G-2)", () => {
  const r = ck([ch("a1", "a", { xeRieng: true }), ch("a2", "a")]);
  assert.deepEqual(r, { viPham: [], khoa: null, daPhaLe: false, lyDo: [] });
  // CREW không có chặng: cổng xuất bến THẬT với một suất CREW (legId null) trên chuyến chỉ có khách đơn A xe riêng → không CAM_KET.
  const ms = (d: string, t: string) => vnLocalToMs(d, t)!;
  const CS: ChinhSachVao = { id: "cs", minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: false, requireContract: false, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 720 };
  const changA: ChangVao = {
    legId: "a1", orderId: "a", orderCode: "ĐH-A", chieu: "OUT", ngayDon: "2026-09-30", gioDon: "06:30", coNoiTra: true, donDaXacNhan: true, donDaHuy: false, changMo: true,
    soNguoi: 1, nguoiCuaDon: ["p1"], datGap: false, khoaNoiDon: "L:d", khoaNoiTra: null, xeRieng: true, choToiThieu: null,
  };
  const suat = (v: Partial<SuatVao>): SuatVao => ({
    id: "s", tripId: "cx", loai: "PASSENGER", legId: "a1", personKey: "p1", crewPartyId: null, boardStopId: "d-1", alightStopId: null, trangThai: "WAITING", mo: true, moTuMs: 0, ...v,
  });
  const ds = [suat({ id: "s1" }), suat({ id: "s-crew", loai: "CREW", legId: null, personKey: null, crewPartyId: "hdv-1" })];
  const chuyen: ChuyenVao = {
    id: "cx", ma: "CX-01", ngayChay: "2026-09-30", batDauMs: ms("2026-09-30", "06:00"), ketThucMs: ms("2026-09-30", "08:00"), ketThucThatMs: null, trangThai: "PLANNED",
    xe: { id: "xe-15", bienSo: "79B-1", soCho: 15, trangThai: "active", chuXePartyId: "cty", chuLaCongTy: true, giayTo: [] },
    taiXe: { partyId: "tx", displayName: "", loai: "CONG_TY", carrierPartyIds: [], giayTo: [{ rowId: "g", typeCode: "GPLX", classCode: "D", expiryDate: null }] },
    nghiChup: 30, nghiPhaLe: false, thue: false, coNguonGia: false, camKetPhaLeKhoa: null,
  };
  const xb = kiemXuatBen({
    chuyen, suat: ds, chang: [changA], suatMoCuaChang: ds, diem: [{ id: "d-1", tripId: "cx", seq: 1, loai: "PICKUP", trangThai: "PENDING", placeKey: "L:d", gioXeToiMs: null }],
    chuyenKhac: [], chinhSach: CS, hangBang: [{ classCode: "D", maxPassengers: null }], dieuKien: [], bayGioMs: chuyen.batDauMs, xuatBenMs: chuyen.batDauMs,
  });
  assert.equal(xb.dat, true, JSON.stringify(xb.lyDo));
  assert.equal(xb.camKet.khoa, null);
});

test("R-XR + C5: A xe riêng cộng một chặng của B → 2 dòng XR (chặng của A, chặng của B); thêm chặng của C → 3 dòng và KHOÁ KHÁC (tiêu chí 3b)", () => {
  const hai = ck([ch("a1", "a", { xeRieng: true }), ch("b1", "b")]);
  assert.deepEqual(dong(hai), ["a1:XR", "b1:XR"]);
  assert.notEqual(hai.khoa, null);
  const ba = ck([ch("a1", "a", { xeRieng: true }), ch("b1", "b"), ch("c1", "c")]);
  assert.deepEqual(dong(ba), ["a1:XR", "b1:XR", "c1:XR"]);
  assert.notEqual(ba.khoa, hai.khoa);
  // Lời: mã đơn + loại, mỗi vi phạm một lý do CAM_KET (Quản trị).
  assert.ok(hai.lyDo.length === 2 && hai.lyDo.every((l) => l.ma === "CAM_KET" && l.aiXuLy === "QUAN_TRI"));
  assert.ok(hai.lyDo.some((l) => /ĐH-A xe riêng/.test(l.loiNhan)));
  assert.ok(hai.lyDo.some((l) => /ĐH-B/.test(l.loiNhan)));
});

test("R-XR: bật xe riêng ở chặng thứ hai của A khi đã ghép B → khoá khác (tiêu chí 3b)", () => {
  const truoc = ck([ch("a1", "a", { xeRieng: true }), ch("a2", "a"), ch("b1", "b")]);
  const sau = ck([ch("a1", "a", { xeRieng: true }), ch("a2", "a", { xeRieng: true }), ch("b1", "b")]);
  assert.deepEqual(dong(truoc), ["a1:XR", "b1:XR"], "chặng thứ hai của chính đơn A không vi phạm khi chưa bật");
  assert.deepEqual(dong(sau), ["a1:XR", "a2:XR", "b1:XR"]);
  assert.notEqual(sau.khoa, truoc.khoa);
});

test("R-CX: choToiThieu 15 trên xe 7 chỗ → vi phạm CX; trên xe 15 chỗ → không (số chỗ KHÔNG kể tài xế, G-3)", () => {
  const nho = ck([ch("a1", "a", { choToiThieu: 15 })], XE7);
  assert.deepEqual(dong(nho), ["a1:CX"]);
  assert.match(nho.lyDo[0]!.loiNhan, /ĐH-A cần ≥ 15 chỗ, xe 7 chỗ/);
  assert.deepEqual(ck([ch("a1", "a", { choToiThieu: 15 })], XE15).viPham, []);
  assert.deepEqual(ck([ch("a1", "a", { choToiThieu: 16 })], XE15).viPham.map((v) => v.loai), ["CX"]);
});

test("C5: đổi id xe với cùng vi phạm CX → khoá khác; tăng choToiThieu 15 → 16 → khoá khác (tiêu chí 3c)", () => {
  const goc = ck([ch("a1", "a", { choToiThieu: 15 })], XE7);
  assert.notEqual(ck([ch("a1", "a", { choToiThieu: 15 })], { id: "xe-7b", soCho: 7 }).khoa, goc.khoa);
  assert.notEqual(ck([ch("a1", "a", { choToiThieu: 16 })], XE7).khoa, goc.khoa);
  assert.equal(ck([ch("a1", "a", { choToiThieu: 15 })], XE7).khoa, goc.khoa, "cùng trạng thái → cùng khoá (tất định)");
  // Thứ tự chặng vào không đổi khoá (sắp xếp).
  const ab = ck([ch("a1", "a", { xeRieng: true }), ch("b1", "b")]);
  const ba = ck([ch("b1", "b"), ch("a1", "a", { xeRieng: true })]);
  assert.equal(ab.khoa, ba.khoa);
});

test("khoaDaPhaLe đúng bằng khoá → daPhaLe = true; khác một ký tự → false; không vi phạm → daPhaLe = false dù có khoá cũ", () => {
  const r = ck([ch("a1", "a", { xeRieng: true }), ch("b1", "b")]);
  const k = r.khoa!;
  const khop = ck([ch("a1", "a", { xeRieng: true }), ch("b1", "b")], XE15, k);
  assert.equal(khop.daPhaLe, true);
  assert.deepEqual(khop.viPham.length, 2, "đã phá lệ vẫn liệt kê vi phạm");
  const lech = ck([ch("a1", "a", { xeRieng: true }), ch("b1", "b")], XE15, `${k.slice(0, -1)}${k.endsWith("-") ? "0" : "-"}`);
  assert.equal(lech.daPhaLe, false);
  assert.equal(ck([ch("a1", "a")], XE15, k).daPhaLe, false);
  assert.equal(khoaCamKet("xe-1", []), null);
});

test("C4: khoá chỉ gồm id / mã / số (khuôn ^[A-Za-z0-9:|\\-]+$) — không tên, không chữ tự do, không mã đơn có dấu", () => {
  const r = ck([ch("3f1c-aa", "a", { xeRieng: true, choToiThieu: 12 }), ch("b1", "b")], XE7);
  assert.match(r.khoa!, /^[A-Za-z0-9:|\-]+$/);
  assert.ok(r.khoa!.startsWith("xe:xe-7|"));
  assert.doesNotMatch(r.khoa!, /ĐH/);
});

test("tệp luật thuần: không import modules/, import kèm đuôi .ts", () => {
  const src = readFileSync(new URL("./cam-ket-xe.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /from\s+["'][^"']*modules\//);
  for (const m of src.matchAll(/from\s+["'](\.[^"']+)["']/g)) assert.match(m[1]!, /\.ts$/, `import ${m[1]} phải kèm đuôi .ts`);
});

test("Global Constraints (Task 5): xeRieng không phải boolean hoặc choToiThieu không phải null | số nguyên → NÉM lỗi rõ ràng (undefined KHÔNG lặng lẽ thành 'không cam kết')", () => {
  const sai: [string, Record<string, unknown>][] = [
    ["xeRieng undefined", { xeRieng: undefined }],
    ["xeRieng 1", { xeRieng: 1 }],
    ["xeRieng null", { xeRieng: null }],
    ["choToiThieu undefined", { choToiThieu: undefined }],
    ["choToiThieu 7.5", { choToiThieu: 7.5 }],
    ["choToiThieu '15'", { choToiThieu: "15" }],
  ];
  for (const [ten, v] of sai) {
    assert.throws(() => ck([ch("a1", "a", v as Partial<ChangCK>)]), /cam kết.*chặng a1/i, ten);
  }
  // Giá trị hợp lệ biên: false / null / số nguyên — không ném.
  assert.doesNotThrow(() => ck([ch("a1", "a", { xeRieng: false, choToiThieu: null }), ch("b1", "b", { choToiThieu: 1 })]));
});

test("nhanCamKet: XE RIÊNG (navy) rồi ≥ N chỗ (unit); không cam kết → []; chỉ một loại → một nhãn", () => {
  assert.deepEqual(nhanCamKet(true, 15), [{ nhan: "XE RIÊNG", tone: "navy" }, { nhan: "≥ 15 chỗ", tone: "unit" }]);
  assert.deepEqual(nhanCamKet(false, null), []);
  assert.deepEqual(nhanCamKet(true, null), [{ nhan: "XE RIÊNG", tone: "navy" }]);
  assert.deepEqual(nhanCamKet(false, 7), [{ nhan: "≥ 7 chỗ", tone: "unit" }]);
});
