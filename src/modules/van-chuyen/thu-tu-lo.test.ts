// BÀI THỨ TỰ LÔ (ADR-0049 D1 "Thứ tự lô"; kế hoạch mục 1.5; TC-32 — Task A14). Chạy MỌI hàm dựng lô xuất từ dieu-phoi.ts (danh sách TỰ SUY bằng quét tên xuất
// `export function lo…`; hàm mới chưa có mẫu → đỏ; chống bài rỗng ≥ 12 lệnh) trên một D1 GIẢ ghi lại câu SQL + tham số, rồi kiểm bốn luật trên chính danh sách
// câu có nhãn:
//   (1) câu CỔNG đứng đầu — riêng lệnh tiến độ khuôn (a): câu `CHUYEN_TIEN_DO` đứng đầu (tự gác "chuyến đang chạy"), câu cổng thứ hai với `changes() > 0`;
//       lệnh dời: cổng nguồn rồi `CONG_DOI` (cổng đích chỉ thắng khi nguồn đã mang dấu lệnh);
//   (2) `NHAT_KY` NGAY sau (các) câu cổng, có `changes() > 0`;
//   (3) MỌI câu sau nhật ký mang lính gác dấu lệnh — `EXISTS (SELECT 1 FROM vc_trip WHERE id = ?a AND last_cmd_id = ?b)` hoặc (câu sửa chính `vc_trip`)
//       `WHERE id = ?a AND last_cmd_id = ?b` — và tham số `?b` bằng ĐÚNG dấu lệnh của lô, `?a` bằng chuyến được cổng (lệnh dời: chuyến ĐÍCH);
//   (4) câu `TRANG_THAI_CUOI` (nếu có) đứng CUỐI, nhiều nhất một.
// NGOẠI LỆ luật 3 (ruling VỪA-2 — ADR-0051 "Đã gọi báo", Task A-GB): họ lệnh trên mốc giờ hẹn KHÔNG chạm vc_trip — chỉ các hàm LIỆT KÊ TÊN ở HO_LENH_MOC
// được dùng nhãn `CONG_MOC`, và phải ĐÚNG HAI câu: `CONG_MOC` (INSERT có điều kiện `max(seq)`) rồi `NHAT_KY` (`changes() > 0`). Hàm khác dùng CONG_MOC → đỏ.
// Danh sách hàm tự suy bằng quét MỌI `export function` của dieu-phoi.ts (không chỉ tên `lo…`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const TEP = fileURLToPath(new URL("./dieu-phoi.ts", import.meta.url));
const built = await esbuild.build({ entryPoints: [TEP], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const MOD = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Record<string, unknown>;

type Cau = { nhan: string; stmt: { sql: string; args: unknown[] } };
const DB = { prepare: (sql: string) => ({ sql, bind: (...args: unknown[]) => ({ sql, args }) }) };
const CMD = "c0000000-0000-4000-8000-00000000c0de";
const T = "t-nguon";
const T2 = "t-dich";
const L = { cmd: CMD, requestId: "r0000000-0000-4000-8000-000000000001", lucIso: "2027-03-11T05:00:00.000Z", nguoiId: "s-1" };
const XR = { iso: L.lucIso, ms: Date.parse(L.lucIso), nguon: "MAY_CHU" };
const suat = (id: string, trip = T) => ({ id, tripId: trip, loai: "PASSENGER", legId: "leg-1", personKey: null, crewPartyId: null, boardStopId: "d-1", alightStopId: "d-2" });
const diem = (id: string, trip = T) => ({ id, tripId: trip, seq: 3, loai: "PICKUP", locationId: "loc-1", placeText: null, placeKey: "L:loc-1" });
// ADR-0057 C4 (kế hoạch Đợt 4 Task 9): kế hoạch chi phí ĐỦ nhánh — một đảo âm, một đảo dương, một chụp.
const DAO_AM = { id: "cl-r1", goc: { id: "cl-a", amount: -200000, carrierPartyId: "p-1" }, lyDo: "CPX_DOI_CHUYEN", ngay: "2027-03-11" };
const DAO_DUONG = { id: "cl-r2", goc: { id: "cl-s", amount: 1200000, carrierPartyId: "p-1" }, lyDo: "CPX_DOI_CHUYEN", ngay: "2027-03-11" };
const CHUP = { id: "cl-s2", rateId: "rate-1", amount: 900000, carrierPartyId: "p-1", routeCode: "T001", sizeCode: "S001", soCho: 16, ngayChay: "2027-03-11" };
const CHI_PHI = { dao: [DAO_AM, DAO_DUONG], chup: CHUP, phienBan: 2, daoDieuChinh: 1, tongTruoc: 1000000, tongSau: 900000 };

/** Mẫu đầu vào của TỪNG hàm dựng lô (đủ nhánh: có đổi tài xế, có điểm mới, có điểm bỏ qua…) + chuyến mà câu cổng gác. */
const MAU: Record<string, { vao: Record<string, unknown>; gac: string }> = {
  loTaoChuyen: {
    vao: {
      ...L, chuyen: { id: T, ma: "CX-1103-01", xeId: "x-1", chuXePartyId: "p-1", ngayChay: "2027-03-11", batDauMs: 1, ketThucMs: 2, nghiChup: 30, nghiPhaLeLyDo: null, thue: 1, tuyen: "T001" },
      taiXePartyId: "p-tx", policyId: null, phaLeNghi: null, chiPhi: { ...CHI_PHI, dao: [], phienBan: 0 }, detail: "d",
    },
    gac: T,
  },
  loSuaChuyen: {
    vao: {
      ...L, tripId: T, version: 3, moi: { xeId: "x-1", chuXePartyId: "p-1", ngayChay: "2027-03-11", batDauMs: 1, ketThucMs: 2, batDauSomNhatMs: 1, nghiPhaLeLyDo: null, thue: 1, tuyen: "T001" },
      doiTaiXe: "p-tx2", diem: [{ id: "d-1", seq: 2, ngayXeToi: null, gioXeToi: null }], phaLe: null, policyId: null, chiPhi: CHI_PHI, phienBanChiPhi: 2, detail: "d",
    },
    gac: T,
  },
  loXep: { vao: { ...L, tripId: T, version: 3, diemMoi: [diem("d-9")], doiThuTu: [{ id: "d-2", seq: 4 }], mocXep: [{ legId: "leg-1", ngay: "2027-03-11", gio: "09:00" }], suatMoi: [suat("a-1"), suat("a-2")], phaLe: null, policyId: null, detail: "d" }, gac: T },
  loRut: { vao: { ...L, tripId: T, version: 3, suatIds: ["a-1"], diemBoQua: ["d-1"], phaLe: null, policyId: null, detail: "d" }, gac: T },
  loDoi: {
    vao: { ...L, nguon: { tripId: T, version: 3 }, dich: { tripId: T2, version: 5 }, cap: [{ dongId: "a-1", mo: suat("a-9", T2) }], diemMoiDich: [diem("d-9", T2)], doiThuTuDich: [{ id: "d-8", seq: 4 }], diemBoQuaNguon: ["d-1"], phaLe: null, policyId: null, detail: "d" },
    gac: T2,
  },
  loHuy: { vao: { ...L, tripId: T, version: 3, lyDo: "HUY_KHAC", phaLe: null, policyId: null, soSuatMo: 2, chiPhi: { ...CHI_PHI, chup: null }, phienBanChiPhi: 2, detail: "d" }, gac: T },
  loCapNhatDiem: { vao: { ...L, tripId: T, version: 3, diemMoi: [diem("d-9")], doiThuTu: [{ id: "d-2", seq: 4 }], cap: [{ dongId: "a-1", mo: suat("a-9") }], diemBoQua: ["d-1"], detail: "d" }, gac: T },
  // R-P29 (chủ lần 16): "cập nhật khách theo đơn" — một suất đóng + mở lại, một suất chỉ đóng (đơn giảm người).
  loCapNhatKhach: { vao: { ...L, tripId: T, version: 3, cap: [{ dongId: "a-1", mo: suat("a-9") }, { dongId: "a-2", mo: null }], diemBoQua: ["d-1"], detail: "d" }, gac: T },
  loXuatBen: {
    vao: {
      ...L, tripId: T, version: 3, xayRa: XR, policyId: "cs-1", ganTen: [{ suatId: "a-1", personKey: "pk-1" }],
      chup: { id: "ck-1", xeId: "x-1", bienSo: "79B00001", soCho: 15, chuXePartyId: "p-1", taiXePartyId: "p-tx", nghiDaDung: 30 },
      muc: [{ loai: "GPLX", vehicleDocumentId: null, personDocumentId: "g-1", documentTypeCode: "GPLX", licenseClassCode: "D1", expiryDate: null, ruleId: null }],
      chot: [{ allocationId: "a-1", passengerRowId: "row-1", crewPartyId: null }], soKhach: 1, detail: "d",
    },
    gac: T,
  },
  loDaToi: { vao: { ...L, tripId: T, stopId: "d-1", xayRa: XR, policyId: null, detail: "d" }, gac: T },
  loSuat: { vao: { ...L, tripId: T, suatId: "a-1", lenh: "DA_TRA", stopId: "d-2", diemXet: ["d-1", "d-2"], xayRa: XR, policyId: null, detail: "d" }, gac: T },
  loKetThuc: { vao: { ...L, tripId: T, xayRa: XR, policyId: null, detail: "d" }, gac: T },
  loKetThucGianDoan: { vao: { ...L, tripId: T, xayRa: XR, policyId: null, lyDo: "GIAN_DOAN_KHAC", soSuatDong: 1, detail: "d" }, gac: T },
  loDoiThuTu: { vao: { ...L, tripId: T, diem: [{ id: "d-2", seq: 5 }], policyId: null, detail: "d" }, gac: T },
  // ADR-0052 D5 (Đợt 5): văn phòng thêm điểm / khách vào xe ĐANG CHẠY (có phá lệ mốc + bản chốt dòng thêm sau xuất bến); báo huỷ một suất.
  loThemDiemDangChay: {
    vao: {
      ...L, tripId: T, version: 7, diemMoi: [diem("d-9")], doiThuTu: [{ id: "d-2", seq: 4 }], mocXep: [{ legId: "leg-1", ngay: "2027-03-11", gio: "09:00" }],
      suatMoi: [suat("a-1"), suat("a-2")], chot: [{ allocationId: "a-1", passengerRowId: "row-1" }], phaLe: { luat: "MOC_TOI_THIEU", lyDo: "PHA_LE_SU_CO", policyId: "cs-1" }, policyId: "cs-1", detail: "d",
    },
    gac: T,
  },
  loBaoHuy: { vao: { ...L, tripId: T, version: 7, suatId: "a-1", lyDo: "BAO_HUY_KHONG_DI", detail: "d" }, gac: T },
  lenhDaGoiBao: { vao: { ...L, legId: "leg-1", phienBan: 1, moi: { ngay: "2027-03-11", gio: "09:15" }, cu: { ngay: "2027-03-11", gio: "09:00" }, tripId: T, detail: "d" }, gac: T },
  lenhBoDanhDauGoiBao: {
    vao: { ...L, legId: "leg-1", phienBan: 2, moi: { ngay: "2027-03-11", gio: "09:00" }, cu: { ngay: "2027-03-11", gio: "09:15" }, tripId: T, detail: "d", banChup: "null" }, gac: T,
  },
};
/** Họ lệnh trên mốc giờ hẹn (ADR-0051; ruling VỪA-2) — LIỆT KÊ TÊN. Thêm tên = NỚI luật 3 — người kiểm soi. */
const HO_LENH_MOC = ["lenhDaGoiBao", "lenhBoDanhDauGoiBao"];
/** Luật riêng cho họ lệnh mốc: đúng hai câu CONG_MOC (INSERT … max(seq)) + NHAT_KY (changes() > 0). */
export function viPhamLoMoc(ten: string, lo: readonly Cau[]): string[] {
  const loi: string[] = [];
  if (lo.length !== 2) loi.push(`${ten}: họ lệnh mốc phải đúng hai câu, thấy ${lo.length}`);
  if (lo[0]?.nhan !== "CONG_MOC" || !/^INSERT INTO vc_leg_appt_ack/.test(lo[0].stmt.sql.trim()) || !/max\(seq\)/.test(lo[0].stmt.sql)) loi.push(`${ten}: câu đầu phải là CONG_MOC — INSERT có điều kiện max(seq)`);
  if (lo[1]?.nhan !== "NHAT_KY" || !/changes\(\) > 0/.test(lo[1].stmt.sql)) loi.push(`${ten}: câu thứ hai phải là NHAT_KY với changes() > 0`);
  return loi;
}

const LINH_GAC = /EXISTS \(SELECT 1 FROM vc_trip WHERE id = \?(\d+) AND last_cmd_id = \?(\d+)\)/;
const SUA_CHUYEN = /^UPDATE vc_trip SET[\s\S]*WHERE id = \?(\d+) AND last_cmd_id = \?(\d+)$/;

/** Kiểm bốn luật trên một lô; trả danh sách vi phạm (rỗng = đạt). */
export function viPhamLo(ten: string, lo: readonly Cau[], gac: string): string[] {
  const loi: string[] = [];
  const nhan = lo.map((c) => c.nhan);
  if (nhan.includes("CONG_MOC")) loi.push(`${ten}: dùng nhãn CONG_MOC mà không có tên trong HO_LENH_MOC`);
  // (1) cổng đầu
  let sauCong: number;
  if (nhan[0] === "CONG") sauCong = nhan[1] === "CONG_DOI" ? 2 : 1;
  else if (nhan[0] === "CHUYEN_TIEN_DO" && nhan[1] === "CONG") {
    sauCong = 2;
    if (!/changes\(\) > 0/.test(lo[1]!.stmt.sql)) loi.push(`${ten}: cổng sau câu chuyển phải có changes() > 0`);
    if (!/status = 'RUNNING'/.test(lo[0]!.stmt.sql)) loi.push(`${ten}: câu chuyển đứng đầu phải tự gác "chuyến đang chạy"`);
  } else {
    loi.push(`${ten}: câu cổng không đứng đầu (${nhan.slice(0, 3).join(", ")})`);
    sauCong = nhan.findIndex((n) => n === "NHAT_KY");
  }
  if (nhan.slice(sauCong).some((n) => n === "CONG" || n === "CONG_DOI" || n === "CHUYEN_TIEN_DO")) loi.push(`${ten}: câu cổng / chuyển nằm sau nhật ký`);
  // (2) nhật ký ngay sau cổng
  if (nhan[sauCong] !== "NHAT_KY") loi.push(`${ten}: nhật ký không đứng ngay sau câu cổng (vị trí ${sauCong}: ${nhan[sauCong]})`);
  else if (!/changes\(\) > 0/.test(lo[sauCong]!.stmt.sql)) loi.push(`${ten}: nhật ký thiếu changes() > 0`);
  // (3) lính gác dấu lệnh ở MỌI câu sau nhật ký
  for (let i = sauCong + 1; i < lo.length; i++) {
    const { sql, args } = lo[i]!.stmt;
    const m = LINH_GAC.exec(sql) ?? SUA_CHUYEN.exec(sql.trim());
    if (!m) {
      loi.push(`${ten}: câu ${i} (${lo[i]!.nhan}) thiếu lính gác dấu lệnh`);
      continue;
    }
    if (args[Number(m[2]) - 1] !== CMD) loi.push(`${ten}: câu ${i} gác bằng tham số không phải dấu lệnh của lô`);
    if (args[Number(m[1]) - 1] !== gac) loi.push(`${ten}: câu ${i} gác chuyến ${String(args[Number(m[1]) - 1])} thay vì ${gac}`);
  }
  // (4) trạng thái cuối đứng cuối
  const cuoi = nhan.flatMap((n, i) => (n === "TRANG_THAI_CUOI" ? [i] : []));
  if (cuoi.length > 1 || (cuoi.length === 1 && cuoi[0] !== lo.length - 1)) loi.push(`${ten}: câu trạng thái cuối không đứng cuối lô`);
  return loi;
}

test("bộ bắt TC-32: đảo nhật ký với cổng, bỏ lính gác một câu GHI, đưa trạng thái cuối lên trước, gác bằng tham số lạ → đỏ; lô đúng → xanh", () => {
  const g = (sql: string, args: unknown[]) => ({ sql, args });
  const dung: Cau[] = [
    { nhan: "CONG", stmt: g("UPDATE vc_trip SET version = version + 1 WHERE id = ?1", [T]) },
    { nhan: "NHAT_KY", stmt: g("INSERT INTO audit_log SELECT … WHERE changes() > 0", []) },
    { nhan: "GHI", stmt: g("UPDATE vc_trip_stop SET x = 1 WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?1 AND last_cmd_id = ?2)", [T, CMD]) },
    { nhan: "TRANG_THAI_CUOI", stmt: g("UPDATE vc_trip SET status = 'CANCELLED' WHERE id = ?1 AND last_cmd_id = ?2", [T, CMD]) },
  ];
  assert.deepEqual(viPhamLo("mau", dung, T), []);
  assert.ok(viPhamLo("mau", [dung[1]!, dung[0]!, dung[2]!, dung[3]!], T).length > 0, "đảo nhật ký với cổng");
  assert.ok(viPhamLo("mau", [dung[0]!, dung[1]!, { nhan: "GHI", stmt: g("UPDATE vc_trip_stop SET x = 1 WHERE id = ?1", [T]) }, dung[3]!], T).length > 0, "bỏ lính gác");
  assert.ok(viPhamLo("mau", [dung[0]!, dung[1]!, dung[3]!, dung[2]!], T).length > 0, "trạng thái cuối lên trước");
  assert.ok(viPhamLo("mau", [dung[0]!, dung[1]!, { nhan: "GHI", stmt: g(dung[2]!.stmt.sql, [T, "khac"]) }, dung[3]!], T).length > 0, "gác bằng tham số lạ");
  assert.ok(viPhamLo("mau", dung, T2).length > 0, "gác nhầm chuyến");
  // Họ lệnh mốc: đúng hai câu; hàm KHÔNG có tên mà dùng CONG_MOC → đỏ.
  const moc: Cau[] = [
    { nhan: "CONG_MOC", stmt: g("INSERT INTO vc_leg_appt_ack (id) SELECT ?1 WHERE (SELECT max(seq) FROM vc_leg_appt_ack WHERE leg_id = ?2) = ?3", []) },
    { nhan: "NHAT_KY", stmt: g("INSERT INTO audit_log SELECT … WHERE changes() > 0", []) },
  ];
  assert.deepEqual(viPhamLoMoc("moc", moc), []);
  assert.ok(viPhamLoMoc("moc", [...moc, dung[2]!]).length > 0, "câu thứ ba");
  assert.ok(viPhamLoMoc("moc", [{ nhan: "CONG_MOC", stmt: g("INSERT INTO vc_leg_appt_ack (id) SELECT ?1", []) }, moc[1]!]).length > 0, "bỏ điều kiện max(seq)");
  assert.ok(viPhamLo("la", moc, T).some((l) => /CONG_MOC mà không có tên/.test(l)), "hàm lạ dùng CONG_MOC");
});

test("ADR-0057 C4 (Đợt 4 Task 9): lô sửa — đảo âm → đảo dương → ghi chuyến → … → chụp CUỐI; lô huỷ — đảo trước trạng thái cuối; lô tạo — chụp sau tài xế; cổng sửa / huỷ mang phiên bản chi phí", () => {
  const sua = (MOD.loSuaChuyen as (db: unknown, l: unknown) => Cau[])(DB, MAU.loSuaChuyen!.vao);
  const vt = (re: RegExp) => sua.findIndex((c) => re.test(c.stmt.sql));
  const daoAm = sua.findIndex((c) => /'REVERSAL'/.test(c.stmt.sql) && c.stmt.args[4] === 200000);
  const daoDuong = sua.findIndex((c) => /'REVERSAL'/.test(c.stmt.sql) && c.stmt.args[4] === -1200000);
  const ghiChuyen = vt(/^\s*UPDATE vc_trip SET vehicle_id/);
  const chup = vt(/'SNAPSHOT'/);
  assert.ok(daoAm > 0 && daoAm < daoDuong && daoDuong < ghiChuyen && ghiChuyen < chup && chup === sua.length - 1, JSON.stringify({ daoAm, daoDuong, ghiChuyen, chup, n: sua.length }));
  assert.match(sua[0]!.stmt.sql, /count\(\*\) FROM vc_trip_cost_line WHERE trip_id = \?1\) = \?6/);
  assert.equal(sua[0]!.stmt.args[5], 2, "phiên bản chi phí ở câu cổng");
  const huy = (MOD.loHuy as (db: unknown, l: unknown) => Cau[])(DB, MAU.loHuy!.vao);
  const cuoiDao = huy.map((c) => /'REVERSAL'/.test(c.stmt.sql)).lastIndexOf(true);
  assert.equal(cuoiDao, huy.length - 2, "đảo ngay trước câu trạng thái cuối");
  assert.match(huy[0]!.stmt.sql, /count\(\*\) FROM vc_trip_cost_line/);
  const tao = (MOD.loTaoChuyen as (db: unknown, l: unknown) => Cau[])(DB, MAU.loTaoChuyen!.vao);
  assert.match(tao[tao.length - 1]!.stmt.sql, /'SNAPSHOT'/);
  assert.equal(tao.filter((c) => /'REVERSAL'/.test(c.stmt.sql)).length, 0);
});

test("TC-32: MỌI hàm dựng lô của dieu-phoi.ts (tự suy từ tên xuất) có mẫu, ≥ 12 lệnh, và đúng bốn luật thứ tự lô", () => {
  const nguon = readFileSync(TEP, "utf8");
  const ten = [...nguon.matchAll(/^export function (\w+)\(/gm)].map((m) => m[1]!).sort();
  assert.ok(ten.length >= 12, `chống bài rỗng: ${ten.length} hàm dựng lô`);
  assert.deepEqual(ten, Object.keys(MAU).sort(), "hàm dựng lô MỚI phải có mẫu ở MAU (và mẫu không trỏ hàm đã bỏ)");
  const loi: string[] = [];
  for (const t of ten) {
    const f = MOD[t] as (db: unknown, l: unknown) => Cau[];
    const lo = f(DB, MAU[t]!.vao);
    assert.ok(lo.length >= 2, `${t}: lô rỗng`);
    loi.push(...(HO_LENH_MOC.includes(t) ? viPhamLoMoc(t, lo) : viPhamLo(t, lo, MAU[t]!.gac)));
  }
  assert.deepEqual(loi, []);
});

test("D5.3a (Đợt 5): loCapNhatDiem trên xe ĐANG CHẠY — cổng có version + chuyến đang chạy, câu CHỐT `SET version = version` đứng CUỐI (nhãn TRANG_THAI_CUOI), đúng bốn luật", () => {
  const f = MOD.loCapNhatDiem as (db: unknown, l: unknown) => Cau[];
  const lo = f(DB, { ...(MAU.loCapNhatDiem!.vao), diemBoQua: [], dangChay: true });
  assert.deepEqual(viPhamLo("loCapNhatDiem(dangChay)", lo, T), []);
  assert.match(lo[0]!.stmt.sql, /version = \?2 AND status = 'RUNNING'/, "cổng: đúng version + chuyến đang chạy");
  const cuoi = lo[lo.length - 1]!;
  assert.equal(cuoi.nhan, "TRANG_THAI_CUOI");
  assert.match(cuoi.stmt.sql, /^UPDATE vc_trip SET version = version WHERE id = \?1 AND last_cmd_id = \?2$/);
  // Không dangChay: không có câu chốt (chuyến chưa chạy giữ lô cũ).
  assert.ok(!f(DB, MAU.loCapNhatDiem!.vao).some((c) => c.nhan === "TRANG_THAI_CUOI"));
});
