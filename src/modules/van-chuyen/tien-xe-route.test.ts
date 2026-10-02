// ROUTE TIỀN XE THUÊ (ADR-0057 T1 B3–B5, T2 C4–C9 — kế hoạch Đợt 4 Task 4, 9, 10) trên khung thử (CẢ ứng dụng + SQLite thật). Mỗi ca một `setup()`.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import * as esbuild from "esbuild";
import {
  ACC, ADM, DRIVER, DRIVER_PARTNER, FIELD, INTERN, NGAY, NGAY_SAU, PARTNER, SALES, SUP, batDongHo, chiTiet, denGio, don, nhaXeKhung, setup, taiXeNhaXe, thoiHopTac, tienDo, uuid, xe,
  xeNhaXe, xepHet,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

/** Nạp hàm dựng lô của dieu-phoi.ts + kế hoạch chi phí (esbuild — khuôn thu-tu-lo.test.ts) để dựng lô thật trên D1 giả của khung thử (ca chen giữa TC-8). */
async function napDieuPhoi(): Promise<any> {
  const built = await esbuild.build({
    stdin: { contents: 'export { loHuy } from "./dieu-phoi"; export { keHoachChiPhiKhiHuy } from "./tien-xe-lo";', resolveDir: new URL(".", import.meta.url).pathname, loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent",
  });
  return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`);
}

const AT = "2026-09-01T00:00:00.000Z";

async function tuyenMoi(w: any, ten: string, as = ACC): Promise<string> {
  const r = await w.call("POST", "/api/van-chuyen/tuyen", { as, body: { ten } });
  assert.equal(r.status, 201, r.text);
  return r.json.tuyen.find((t: any) => t.ten === ten).ma;
}
async function coMoi(w: any, tu: number, den: number, as = ACC): Promise<string> {
  const r = await w.call("POST", "/api/van-chuyen/co-xe", { as, body: { tuSoKhach: tu, denSoKhach: den } });
  assert.equal(r.status, 201, r.text);
  return r.json.coXe.find((c: any) => c.tuSoKhach === tu && c.denSoKhach === den && c.dangDung).ma;
}
/** Vòng sửa 2 (B): giá luôn theo CẢ tuyến LẪN cỡ — bài chỉ ghi một khoá (khuôn T1 cũ) thì khoá còn lại lấy MẶC ĐỊNH (tuyến / cỡ "Mặc định" của khung thử,
 *  tạo một lần); bài muốn thử "thiếu khoá" gửi `null` tường minh. */
async function khoaMacDinh(w: any, loai: "tuyen" | "co-xe"): Promise<string> {
  const ds = (await w.call("GET", `/api/van-chuyen/${loai}`, { as: ACC })).json;
  if (loai === "tuyen") return ds.tuyen.find((t: any) => t.ten === "Tuyến mặc định")?.ma ?? tuyenMoi(w, "Tuyến mặc định");
  return ds.coXe.find((c: any) => c.tuSoKhach === 50 && c.denSoKhach === 60)?.ma ?? coMoi(w, 50, 60);
}
async function themGia(w: any, as: string, body: Record<string, unknown>) {
  const b = { ...body };
  if (b.tuyen === undefined && b.coXe !== undefined && b.coXe !== null) b.tuyen = await khoaMacDinh(w, "tuyen");
  if (b.coXe === undefined && b.tuyen !== undefined && b.tuyen !== null) b.coXe = await khoaMacDinh(w, "co-xe");
  return w.call("POST", "/api/van-chuyen/bang-gia", { as, body: { requestId: uuid(), tuyen: null, coXe: null, soTien: 1_200_000, tuNgay: "2026-10-01", denNgay: null, ghiChu: null, thayDongId: null, ...b } });
}

test("T1 route: Kế toán VÀ Quản trị thêm tuyến, cỡ, giá (201); Bán hàng / HDV / tài xế / Đối tác / Thực tập → 403 cả đọc lẫn ghi; 403 đứng trước 400", async () => {
  const w = setup();
  const nx = nhaXeKhung(w);
  const t1 = await tuyenMoi(w, "Nha Trang – sân bay Cam Ranh", ACC);
  const t2 = await tuyenMoi(w, "Nha Trang – Đà Lạt", ADM);
  assert.match(t1, /^[A-Z0-9][A-Z0-9_-]{1,29}$/, "máy sinh mã");
  assert.notEqual(t1, t2);
  assert.equal((await themGia(w, ADM, { nhaXePartyId: nx, tuyen: t1 })).status, 201);
  assert.equal((await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t2 })).status, 201);
  assert.equal((await themGia(w, SUP, { nhaXePartyId: nx, coXe: await coMoi(w, 10, 16, SUP) })).status, 201);
  for (const as of [SALES, FIELD, DRIVER, DRIVER_PARTNER, PARTNER, INTERN]) {
    assert.equal((await themGia(w, as, { nhaXePartyId: nx, soTien: "sai" })).status, 403, `${as} ghi giá`);
    assert.equal((await w.call("GET", "/api/van-chuyen/bang-gia", { as })).status, 403, `${as} đọc giá`);
    assert.equal((await w.call("POST", "/api/van-chuyen/tuyen", { as, body: {} })).status, 403, `${as} thêm tuyến`);
    assert.equal((await w.call("PUT", `/api/van-chuyen/tuyen/${t1}`, { as, body: {} })).status, 403, `${as} sửa tuyến`);
    assert.equal((await w.call("POST", "/api/van-chuyen/co-xe", { as, body: {} })).status, 403, `${as} thêm cỡ`);
    assert.equal((await w.call("POST", `/api/van-chuyen/bang-gia/x-${uuid()}/ket-thuc`, { as, body: {} })).status, 403, `${as} kết thúc giá`);
  }
  for (const as of [FIELD, DRIVER, DRIVER_PARTNER, PARTNER, INTERN]) {
    assert.equal((await w.call("GET", "/api/van-chuyen/tuyen", { as })).status, 403, `${as} đọc tuyến`);
  }
  const r = await w.call("GET", "/api/van-chuyen/tuyen", { as: SALES });
  assert.equal(r.status, 200, "Bán hàng đọc TÊN tuyến để chọn khi xếp");
  assert.ok(!JSON.stringify(r.json).includes("1200000"));
  const co = await w.call("GET", "/api/van-chuyen/co-xe", { as: SALES });
  assert.equal(co.status, 200);
  assert.equal(co.json.coXe[0].soDongGiaDangAp, null, "Bán hàng không thấy số dòng giá");
});

test("T1 route: GET bảng giá — mọi dòng của nhà xe, nhãn đang áp / sắp áp / đã kết thúc theo ngày xem; danh sách nhà xe gồm nhà xe đã thôi còn giá mở", async () => {
  const w = setup();
  const nx = nhaXeKhung(w);
  const cu = nhaXeKhung(w, "Nhà xe Cũ");
  const nx3 = nhaXeKhung(w, "Nhà xe Không Giá");
  const t = await tuyenMoi(w, "Nha Trang – sân bay Cam Ranh");
  assert.equal((await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t, tuNgay: "2026-10-01", denNgay: "2026-10-31" })).status, 201);
  assert.equal((await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t, tuNgay: "2026-11-01", soTien: 1_100_000 })).status, 201);
  assert.equal((await themGia(w, ACC, { nhaXePartyId: cu, tuyen: t })).status, 201);
  thoiHopTac(w, cu);
  thoiHopTac(w, nx3);
  const r = await w.call("GET", `/api/van-chuyen/bang-gia?nha-xe=${nx}&ngay=2026-10-15`, { as: ACC });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.dong.map((d: any) => [d.tuNgay, d.trangThai, d.soTien]).sort(), [["2026-10-01", "DANG_AP", 1_200_000], ["2026-11-01", "SAP_AP", 1_100_000]]);
  const r2 = await w.call("GET", `/api/van-chuyen/bang-gia?nha-xe=${nx}&ngay=2026-11-05`, { as: ACC });
  assert.deepEqual(r2.json.dong.map((d: any) => d.trangThai).sort(), ["DANG_AP", "DA_KET_THUC"]);
  const ds = new Map(r.json.nhaXe.map((n: any) => [n.partyId, n.dangHopTac]));
  assert.equal(ds.get(nx), true);
  assert.equal(ds.get(cu), false, "nhà xe đã thôi còn giá mở vẫn có trong danh sách để Kết thúc");
  assert.equal(ds.has(nx3), false, "nhà xe đã thôi không còn giá: không hiện");
});

test("T1 route: chồng giá → 409 gia_chong; 'thay dòng X' đóng X ngày trước + thêm mới trong MỘT lô; thay bằng ngày ≤ ngày bắt đầu của X → 409; gửi lại cùng requestId → 200 dòng cũ", async () => {
  const w = setup();
  const nx = nhaXeKhung(w);
  const t = await tuyenMoi(w, "Nha Trang – sân bay Cam Ranh");
  const a = await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t, tuNgay: "2026-10-01" });
  assert.equal(a.status, 201);
  const x = a.json.dong.id;
  const cx = a.json.dong.coXe.ma;
  const chong = await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t, tuNgay: "2026-12-01" });
  assert.equal(chong.status, 409);
  assert.equal(chong.json.error.code, "gia_chong");
  assert.equal((await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t, tuNgay: "2026-10-01", thayDongId: x })).status, 409, "thay bằng ngày = ngày bắt đầu");
  const rid = uuid();
  const thay = await w.call("POST", "/api/van-chuyen/bang-gia", { as: ACC, body: { requestId: rid, nhaXePartyId: nx, tuyen: t, coXe: cx, soTien: 1_300_000, tuNgay: "2026-11-01", denNgay: null, ghiChu: "Tăng giá mùa", thayDongId: x } });
  assert.equal(thay.status, 201, thay.text);
  assert.equal(thay.json.dong.thayDongId, x);
  const rows = w.q("SELECT id, amount, valid_from_date, valid_to_date FROM vc_rental_rate WHERE carrier_party_id = ? ORDER BY valid_from_date", nx);
  assert.deepEqual(rows.map((r: any) => [r.amount, r.valid_from_date, r.valid_to_date]), [[1_200_000, "2026-10-01", "2026-10-31"], [1_300_000, "2026-11-01", null]]);
  const lai = await w.call("POST", "/api/van-chuyen/bang-gia", { as: ACC, body: { requestId: rid, nhaXePartyId: nx, tuyen: t, coXe: cx, soTien: 1_300_000, tuNgay: "2026-11-01", denNgay: null, ghiChu: "Tăng giá mùa", thayDongId: x } });
  assert.equal(lai.status, 200, "gửi lại cùng requestId → kết quả cũ");
  assert.equal(w.q("SELECT count(*) n FROM vc_rental_rate WHERE carrier_party_id = ?", nx)[0].n, 2);
  assert.equal(w.q("SELECT typeof(amount) t FROM vc_rental_rate LIMIT 1")[0].t, "integer");
});

test("T1 route: nhà xe thôi hợp tác → thêm giá 409 nha_xe_khong_hop_tac (câu bản vẽ); KẾT THÚC giá cũ của nhà xe đó → 200; kết thúc lần hai → 409", async () => {
  const w = setup();
  const nx = nhaXeKhung(w);
  const t = await tuyenMoi(w, "Nha Trang – sân bay Cam Ranh");
  const a = await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t });
  thoiHopTac(w, nx);
  const b = await themGia(w, ADM, { nhaXePartyId: nx, tuyen: t, tuNgay: "2027-01-01" });
  assert.equal(b.status, 409);
  assert.match(b.text, /nha_xe_khong_hop_tac/);
  assert.match(b.text, /Nhà xe này đã thôi hợp tác — không thể thêm giá mới/);
  const k = await w.call("POST", `/api/van-chuyen/bang-gia/${a.json.dong.id}/ket-thuc`, { as: ADM, body: { denNgay: "2026-12-31" } });
  assert.equal(k.status, 200, k.text);
  assert.equal(k.json.dong.denNgay, "2026-12-31");
  assert.equal((await w.call("POST", `/api/van-chuyen/bang-gia/${a.json.dong.id}/ket-thuc`, { as: ADM, body: { denNgay: "2026-12-30" } })).status, 409);
  assert.equal((await w.call("POST", `/api/van-chuyen/bang-gia/${a.json.dong.id}/ket-thuc`, { as: ADM, body: { denNgay: "sai" } })).status, 400);
});

test("T1 route: mỗi lần thêm / kết thúc giá có MỘT dòng audit_log cùng lô — detail có tên nhà xe, tuyến, số tiền; không SĐT", async () => {
  const w = setup();
  const nx = nhaXeKhung(w, "Nhà xe Hùng Phát");
  w.sqlite.prepare("INSERT INTO pty_contact_point (id, party_id, contact_kind_code, value, value_normalized, valid_from_date, created_at, updated_at) VALUES (?, ?, 'PHONE', '0987654321', '0987654321', '2026-09-01', ?, ?)").run(uuid(), nx, AT, AT);
  const t = await tuyenMoi(w, "Nha Trang – sân bay Cam Ranh");
  const a = await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t });
  await w.call("POST", `/api/van-chuyen/bang-gia/${a.json.dong.id}/ket-thuc`, { as: ACC, body: { denNgay: "2026-12-31" } });
  const nk = w.q("SELECT action, detail FROM audit_log WHERE action IN ('rental_rate_added', 'rental_rate_closed') ORDER BY created_at, action");
  assert.equal(nk.length, 2);
  for (const d of nk) {
    assert.match(d.detail, /Nhà xe Hùng Phát/);
    assert.match(d.detail, /Nha Trang – sân bay Cam Ranh/);
    assert.match(d.detail, /1\.200\.000/);
    assert.ok(!/0987654321/.test(d.detail));
  }
});

test("T1 route: cỡ xe chồng khoảng → 409 co_xe_chong; nhãn mặc định 'a–b khách'; số tiền không phải số nguyên dương → 400 câu tiếng Việt; tuyến ngưng dùng → 400", async () => {
  const w = setup();
  const nx = nhaXeKhung(w);
  const c16 = await coMoi(w, 10, 16);
  const ds = await w.call("GET", "/api/van-chuyen/co-xe", { as: ACC });
  assert.equal(ds.json.coXe.find((c: any) => c.ma === c16).nhan, "10–16 khách");
  const ch = await w.call("POST", "/api/van-chuyen/co-xe", { as: ACC, body: { tuSoKhach: 15, denSoKhach: 20 } });
  assert.equal(ch.status, 409);
  assert.match(ch.text, /co_xe_chong/);
  const mot = await w.call("POST", "/api/van-chuyen/co-xe", { as: ACC, body: { tuSoKhach: 45, denSoKhach: 45 } });
  assert.ok(mot.json.coXe.some((c: any) => c.nhan === "45 khách"));
  for (const soTien of [0, -5, 1.5, "1200000", 2_000_000_000]) {
    const r = await themGia(w, ACC, { nhaXePartyId: nx, coXe: c16, soTien });
    assert.equal(r.status, 400, String(soTien));
    assert.match(r.text, /Số tiền phải là số nguyên dương/);
  }
  const t = await tuyenMoi(w, "Tuyến cũ");
  assert.equal((await w.call("PUT", `/api/van-chuyen/tuyen/${t}`, { as: ACC, body: { dangDung: false } })).status, 200);
  assert.equal((await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t })).status, 400);
  assert.equal((await themGia(w, ACC, { nhaXePartyId: nx })).status, 400, "thiếu cả tuyến lẫn cỡ");
  // Vòng sửa 2 (B — ADR-0095 Q3): giá luôn theo CẢ tuyến LẪN cỡ xe.
  const t2 = await tuyenMoi(w, "Tuyến đủ");
  for (const b of [{ tuyen: t2, coXe: null }, { tuyen: null, coXe: c16 }, { tuyen: null, coXe: null }]) {
    const r = await themGia(w, ACC, { nhaXePartyId: nx, ...b });
    assert.equal(r.status, 400, JSON.stringify(b));
    assert.match(r.text, /Cần chọn cả tuyến và cỡ xe/);
  }
  assert.equal((await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t2, coXe: c16 })).status, 201);
});

// ==== T2 — chụp / đảo chi phí trong lô tạo, sửa, huỷ chuyến (kế hoạch Đợt 4 Task 9; Review Focus 1, 2, 3, 5) ===========================================
/** Nhà xe Hùng Phát + tài xế + xe 16 / 29 chỗ; tuyến NT-CR, NT-DL; cỡ C16, C29; giá G1–G4 quanh NGAY (2027-03-11) / NGAY_SAU — khuôn ví dụ vàng. */
async function nenThue(w: any) {
  const nx = nhaXeKhung(w);
  const tx = taiXeNhaXe(w, nx);
  const x16 = xeNhaXe(w, nx, 16);
  const x29 = xeNhaXe(w, nx, 29);
  const crt = await tuyenMoi(w, "Nha Trang – sân bay Cam Ranh");
  const dl = await tuyenMoi(w, "Nha Trang – Đà Lạt");
  const c16 = await coMoi(w, 10, 16);
  const c29 = await coMoi(w, 17, 29);
  const g = async (b: Record<string, unknown>) => {
    const r = await themGia(w, ACC, { nhaXePartyId: nx, ...b });
    assert.equal(r.status, 201, r.text);
    return r.json.dong.id as string;
  };
  // Vòng sửa 2 (B): mọi dòng đủ tuyến + cỡ (khuôn ví dụ vàng mới).
  await g({ tuyen: crt, coXe: c16, soTien: 1_200_000, tuNgay: "2027-03-01", denNgay: NGAY });
  await g({ tuyen: crt, coXe: c29, soTien: 1_000_000, tuNgay: "2027-03-01", denNgay: NGAY });
  await g({ tuyen: dl, coXe: c16, soTien: 900_000, tuNgay: "2027-03-01" });
  await g({ tuyen: crt, coXe: c29, soTien: 1_100_000, tuNgay: NGAY_SAU });
  return { nx, tx, x16, x29, crt, dl, c16, c29 };
}
async function taoThue(w: any, v: { xe: string; taiXe: string; tuyen?: string | null; ngay?: string; bd?: string; kt?: string; ngayKt?: string; as?: string; requestId?: string }) {
  return w.call("POST", "/api/van-chuyen/chuyen", {
    as: v.as ?? SALES,
    body: {
      requestId: v.requestId ?? uuid(), xeId: v.xe, taiXePartyId: v.taiXe, ...(v.tuyen === undefined ? {} : { tuyen: v.tuyen }),
      batDau: { ngay: v.ngay ?? NGAY, gio: v.bd ?? "12:30" }, ketThuc: { ngay: v.ngayKt ?? v.ngay ?? NGAY, gio: v.kt ?? "15:00" },
    },
  });
}
const sua = async (w: any, id: string, body: Record<string, unknown>, as = SALES) => {
  const c = await chiTiet(w, id);
  return w.call("PUT", `/api/van-chuyen/chuyen/${id}`, { as, body: { version: c.chuyen.version, requestId: uuid(), ...body } });
};
const dongCp = (w: any, id: string): [string, number][] =>
  w.q("SELECT kind, amount FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid", id).map((r: any) => [r.kind, r.amount]);
const tongCp = (w: any, id: string): number => dongCp(w, id).reduce((t, [, a]) => t + a, 0);
const chenCp = (w: any, trip: string, kind: string, amount: number, reason: string, ngay = NGAY) => {
  const carrier = w.q("SELECT carrier_party_id c FROM vc_trip WHERE id = ?", trip)[0].c;
  w.sqlite.prepare(`INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, reason_code, occurred_date, cmd_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uuid(), trip, carrier, kind, amount, reason, ngay, uuid(), new Date().toISOString(), new Date().toISOString());
};
const giu = async (w: any, id: string, as = SALES) => (await chiTiet(w, id, as)).chuyen.lyDoGiu.map((l: any) => l.ma) as string[];

test("RF1-a/b/c (V1, V7): tạo chuyến xe nhà xe 16 chỗ NT-CR → đúng một SNAPSHOT 1.200.000 cùng dấu lệnh CREATED, phản hồi KHÔNG mang tiền; đổi tuyến NT-DL → đảo phụ thu, đảo giá, chụp G3 cùng dấu lệnh sửa", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const r = await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt });
    assert.equal(r.status, 201, r.text);
    assert.ok(!r.text.includes("1200000"), "phản hồi lệnh xếp không mang tiền");
    const id = r.json.chuyen.id;
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_200_000]]);
    const ev = w.q("SELECT id FROM vc_trip_event WHERE trip_id = ? AND kind = 'CREATED'", id)[0].id;
    assert.equal(w.q("SELECT cmd_id FROM vc_trip_cost_line WHERE trip_id = ?", id)[0].cmd_id, ev);
    assert.deepEqual({ ...w.q("SELECT rented, route_code FROM vc_trip WHERE id = ?", id)[0] }, { rented: 1, route_code: n.crt });
    assert.ok(!(await giu(w, id)).includes("THIEU_GIA"));
    chenCp(w, id, "ADJUSTMENT", 150_000, "CPX_PHU_THU_CHO"); // V7
    const s = await sua(w, id, { tuyen: n.dl });
    assert.equal(s.status, 200, s.text);
    assert.ok(!s.text.includes("900000") && !s.text.includes("1200000"));
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_200_000], ["ADJUSTMENT", 150_000], ["REVERSAL", -150_000], ["REVERSAL", -1_200_000], ["SNAPSHOT", 900_000]]);
    assert.equal(tongCp(w, id), 900_000);
    const cmd = w.q("SELECT last_cmd_id c FROM vc_trip WHERE id = ?", id)[0].c;
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_cost_line WHERE trip_id = ? AND cmd_id = ?", id, cmd)[0].n, 3, "ba dòng cùng dấu lệnh sửa");
    assert.equal(w.q("SELECT route_code r FROM vc_trip WHERE id = ?", id)[0].r, n.dl);
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_edited' AND target_id = ?", id)[0].detail;
    assert.match(nk, /tuyến Nha Trang – sân bay Cam Ranh → Nha Trang – Đà Lạt/);
    assert.match(nk, /chi phí xe thuê 1\.350\.000 → 900\.000 \(đảo 1 điều chỉnh\)/);
  } finally {
    tat();
  }
});

test("G3 (giao diện Đợt 4): chi tiết chuyến mang TÊN tuyến {ma, ten} (null khi chưa chọn) — form sửa điền sẵn được; tuyến đã ngưng dùng vẫn hiện tên; không số tiền", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const co = await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt });
    assert.equal(co.status, 201, co.text);
    const ct = await chiTiet(w, co.json.chuyen.id);
    assert.deepEqual(ct.chuyen.tuyen, { ma: n.crt, ten: "Nha Trang – sân bay Cam Ranh" });
    assert.ok(!JSON.stringify(ct).includes("1200000"), "chi tiết chuyến không mang tiền");
    assert.equal((await w.call("PUT", `/api/van-chuyen/tuyen/${n.crt}`, { as: ACC, body: { dangDung: false } })).status, 200);
    assert.deepEqual((await chiTiet(w, co.json.chuyen.id)).chuyen.tuyen, { ma: n.crt, ten: "Nha Trang – sân bay Cam Ranh" }, "tuyến ngưng dùng vẫn hiện tên");
    const khong = await taoThue(w, { xe: n.x29, taiXe: n.tx, bd: "16:00", kt: "18:00" });
    assert.equal(khong.status, 201, khong.text);
    assert.equal((await chiTiet(w, khong.json.chuyen.id)).chuyen.tuyen, null);
  } finally {
    tat();
  }
});

test("RF1-d (V12, V12b): nguồn là giá thoả thuận → đổi tuyến: thoả thuận bị đảo, chụp giá bảng nếu có; không có → thiếu giá (giữ THIEU_GIA, mọi người xem chuyến thấy, không số)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const r = await taoThue(w, { xe: n.x29, taiXe: n.tx }); // V6: 29 chỗ, không tuyến → không dòng nào
    assert.equal(r.status, 201, r.text);
    const id = r.json.chuyen.id;
    assert.deepEqual(dongCp(w, id), [], "không bao giờ ghi 0 đồng");
    assert.ok((await giu(w, id)).includes("THIEU_GIA"));
    const ld = (await chiTiet(w, id)).chuyen.lyDoGiu.find((l: any) => l.ma === "THIEU_GIA");
    assert.match(ld.loiNhan, /Chuyến xe thuê chưa có giá/);
    chenCp(w, id, "AGREED", 1_350_000, "CPX_GIA_THOA_THUAN"); // V6b
    assert.ok(!(await giu(w, id)).includes("THIEU_GIA"));
    assert.equal((await sua(w, id, { tuyen: n.crt })).status, 200);
    assert.deepEqual(dongCp(w, id), [["AGREED", 1_350_000], ["REVERSAL", -1_350_000], ["SNAPSHOT", 1_000_000]]); // V12
    assert.equal((await sua(w, id, { tuyen: n.dl })).status, 200);
    assert.deepEqual(dongCp(w, id).slice(3), [["REVERSAL", -1_000_000]], "tuyến không có giá cho xe 29 chỗ → không chụp");
    assert.ok((await giu(w, id)).includes("THIEU_GIA"));
    assert.ok(!JSON.stringify(await chiTiet(w, id)).includes("1000000"));
  } finally {
    tat();
  }
});

test("RF1-e (V13): đổi sang XE CÔNG TY → đảo hết, rented = 0, tổng 0; không còn bị giữ thiếu giá", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    const s = await sua(w, id, { xeId: xe(w, 16), taiXePartyId: `pty-${DRIVER}` });
    assert.equal(s.status, 200, s.text);
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_200_000], ["REVERSAL", -1_200_000]]);
    assert.equal(w.q("SELECT rented r FROM vc_trip WHERE id = ?", id)[0].r, 0);
    assert.ok(!(await giu(w, id)).includes("THIEU_GIA"));
  } finally {
    tat();
  }
});

test("RF1-f: nhà xe thôi hợp tác SAU khi chụp → đổi tuyến 409 carrier_inactive (câu ADR C4), không dòng mới; đổi sang xe khác CÙNG nhà xe → 409; đổi sang xe nhà xe khác có giá → 200 chụp giá nhà xe mới", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    thoiHopTac(w, n.nx);
    const a = await sua(w, id, { tuyen: n.dl });
    assert.equal(a.status, 409, a.text);
    assert.equal(a.json.error.code, "carrier_inactive");
    assert.equal(a.json.error.message, "Nhà xe này đã thôi hợp tác nên máy không tính lại giá được. Hãy chọn xe của nhà xe khác, hoặc giữ tuyến cũ.");
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_200_000]], "không dòng đảo lẻ");
    const b = await sua(w, id, { xeId: n.x29 });
    assert.equal(b.status, 409, b.text);
    assert.equal(b.json.error.code, "carrier_inactive");
    const nx2 = nhaXeKhung(w, "Nhà xe Minh Phát");
    const tx2 = taiXeNhaXe(w, nx2);
    const xe2 = xeNhaXe(w, nx2, 16);
    assert.equal((await themGia(w, ACC, { nhaXePartyId: nx2, tuyen: n.crt, coXe: n.c16, soTien: 1_300_000, tuNgay: "2027-03-01" })).status, 201);
    const c = await sua(w, id, { xeId: xe2, taiXePartyId: tx2 });
    assert.equal(c.status, 200, c.text);
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_200_000], ["REVERSAL", -1_200_000], ["SNAPSHOT", 1_300_000]]);
    assert.equal(w.q("SELECT carrier_party_id FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", id)[0].carrier_party_id, nx2);
  } finally {
    tat();
  }
});

test("RF1-g (Cần chủ 3 = A — 'giá ngày chạy'): dời giờ sang NGÀY KHÁC → đảo + chụp theo giá của ngày mới; dời giờ trong CÙNG ngày → không dòng mới, giá thoả thuận giữ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x29, taiXe: n.tx, tuyen: n.crt, bd: "20:00", kt: "22:00" })).json.chuyen.id; // G2 1.000.000 (hết hạn hết NGAY)
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_000_000]]);
    const cungNgay = await sua(w, id, { batDau: { ngay: NGAY, gio: "20:30" }, ketThuc: { ngay: NGAY, gio: "22:30" } });
    assert.equal(cungNgay.status, 200, cungNgay.text);
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_000_000]], "cùng ngày chạy: không tính lại");
    const sang = await sua(w, id, { batDau: { ngay: NGAY_SAU, gio: "08:00" }, ketThuc: { ngay: NGAY_SAU, gio: "10:00" } });
    assert.equal(sang.status, 200, sang.text);
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_000_000], ["REVERSAL", -1_000_000], ["SNAPSHOT", 1_100_000]], "ngày mới → G4");
    // Vòng sửa 2 (SV-1, ADR-0095 Q2): dòng ĐẢO mang ngày của DÒNG GỐC (tháng / ngày cũ về 0), chụp mới mang ngày chạy mới.
    assert.deepEqual(w.q("SELECT occurred_date d FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid", id).map((r: any) => r.d), [NGAY, NGAY, NGAY_SAU]);
    // Giá thoả thuận (chuyến khác, thiếu giá) + dời giờ trong cùng ngày → giữ nguyên thoả thuận.
    const id2 = (await taoThue(w, { xe: n.x29, taiXe: n.tx, bd: "13:00", kt: "14:00", ngay: NGAY_SAU })).json.chuyen.id;
    chenCp(w, id2, "AGREED", 1_350_000, "CPX_GIA_THOA_THUAN");
    const doi2 = await sua(w, id2, { batDau: { ngay: NGAY_SAU, gio: "13:15" }, ketThuc: { ngay: NGAY_SAU, gio: "14:15" } });
    assert.equal(doi2.status, 200, doi2.text);
    assert.deepEqual(dongCp(w, id2), [["AGREED", 1_350_000]]);
  } finally {
    tat();
  }
});

test("RF2 (V8): huỷ chuyến có SNAPSHOT + ADJUSTMENT −200.000 → một lô: +200.000 rồi −1.200.000, tổng 0, CANCELLED; nhật ký có chi phí trước → sau", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    chenCp(w, id, "ADJUSTMENT", -200_000, "CPX_NHAP_SAI", "2027-03-05");
    const c = await chiTiet(w, id);
    const h = await w.call("POST", `/api/van-chuyen/chuyen/${id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } });
    assert.equal(h.status, 200, h.text);
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_200_000], ["ADJUSTMENT", -200_000], ["REVERSAL", 200_000], ["REVERSAL", -1_200_000]]);
    assert.equal(tongCp(w, id), 0);
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", id)[0].s, "CANCELLED");
    assert.deepEqual(w.q("SELECT DISTINCT reason_code r FROM vc_trip_cost_line WHERE trip_id = ? AND kind = 'REVERSAL'", id).map((r: any) => r.r), ["CPX_HUY_CHUYEN"]);
    // SV-1: dòng đảo của lô huỷ mang ngày của dòng gốc (điều chỉnh −200.000 ghi ngày "2027-03-05").
    assert.deepEqual(w.q("SELECT kind, amount, occurred_date d FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid", id).map((r: any) => [r.kind, r.amount, r.d]),
      [["SNAPSHOT", 1_200_000, NGAY], ["ADJUSTMENT", -200_000, "2027-03-05"], ["REVERSAL", 200_000, "2027-03-05"], ["REVERSAL", -1_200_000, NGAY]]);
    assert.match(w.q("SELECT detail FROM audit_log WHERE action = 'trip_cancelled' AND target_id = ?", id)[0].detail, /chi phí xe thuê 1\.000\.000 → 0 \(đảo 1 điều chỉnh\)/);
  } finally {
    tat();
  }
});

test("RF2 chen giữa (TC-8): lô huỷ dựng với phiên bản chi phí đã đọc; có điều chỉnh chen vào trước khi lô chạy → câu cổng 0 dòng ⇒ không dòng đảo nào, chuyến vẫn PLANNED (đỏ-xanh: không chen thì qua)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    const dp = await napDieuPhoi();
    const dungLo = (phienBan: number) => {
      const t = w.q("SELECT version, service_date FROM vc_trip WHERE id = ?", id)[0];
      const dong = w.q("SELECT id, kind, amount, reverses_id, reason_code, created_at, carrier_party_id, occurred_date FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid", id)
        .map((r: any) => ({ id: r.id, kind: r.kind, amount: r.amount, reversesId: r.reverses_id, reasonCode: r.reason_code, createdAt: r.created_at, carrierPartyId: r.carrier_party_id, occurredDate: r.occurred_date }));
      const kh = dp.keHoachChiPhiKhiHuy(dong, t.service_date);
      return dp.loHuy(w.env.DB, {
        cmd: uuid(), requestId: uuid(), lucIso: new Date().toISOString(), nguoiId: SALES, tripId: id, version: t.version, lyDo: "HUY_KHAC", phaLe: null, policyId: null,
        soSuatMo: 0, chiPhi: kh, phienBanChiPhi: phienBan ?? kh.phienBan, detail: "thử chen giữa",
      });
    };
    const lo = dungLo(1); // đọc: 1 dòng (SNAPSHOT)
    chenCp(w, id, "ADJUSTMENT", 100_000, "CPX_PHU_THU_CHO"); // chen giữa lúc đọc và lúc ghi
    const kq = await w.env.DB.batch(lo.map((c: any) => c.stmt));
    assert.equal(kq[0].meta.changes, 0, "câu cổng thua");
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_200_000], ["ADJUSTMENT", 100_000]], "không dòng đảo nào");
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", id)[0].s, "PLANNED");
    const lo2 = dungLo(2);
    const kq2 = await w.env.DB.batch(lo2.map((c: any) => c.stmt));
    assert.equal(kq2[0].meta.changes, 1);
    assert.equal(tongCp(w, id), 0);
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", id)[0].s, "CANCELLED");
  } finally {
    tat();
  }
});

test("RF3 (ranh ngày): chuyến 23:30 → 01:30 bắt đầu ngày NGAY → giá ngày NGAY (G2); bắt đầu 00:30 ngày sau → G4", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const a = await taoThue(w, { xe: n.x29, taiXe: n.tx, tuyen: n.crt, bd: "23:30", kt: "01:30", ngayKt: NGAY_SAU });
    assert.equal(a.status, 201, a.text);
    assert.deepEqual(dongCp(w, a.json.chuyen.id), [["SNAPSHOT", 1_000_000]]);
    const b = await taoThue(w, { xe: xeNhaXe(w, n.nx, 29), taiXe: taiXeNhaXe(w, n.nx), tuyen: n.crt, ngay: NGAY_SAU, bd: "00:30", kt: "02:00" });
    assert.equal(b.status, 201, b.text);
    assert.deepEqual(dongCp(w, b.json.chuyen.id), [["SNAPSHOT", 1_100_000]]);
  } finally {
    tat();
  }
});

test("RF5: gửi lại cùng requestId lệnh tạo / lệnh sửa → 200 kết quả cũ, vẫn đúng một SNAPSHOT còn hiệu lực", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const rid = uuid();
    const a = await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt, requestId: rid });
    assert.equal(a.status, 201);
    const b = await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt, requestId: rid });
    assert.equal(b.status, 200, b.text);
    const id = a.json.chuyen.id;
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_200_000]]);
    const c = await chiTiet(w, id);
    const rid2 = uuid();
    const s1 = await w.call("PUT", `/api/van-chuyen/chuyen/${id}`, { as: SALES, body: { version: c.chuyen.version, requestId: rid2, tuyen: n.dl } });
    const s2 = await w.call("PUT", `/api/van-chuyen/chuyen/${id}`, { as: SALES, body: { version: c.chuyen.version, requestId: rid2, tuyen: n.dl } });
    assert.deepEqual([s1.status, s2.status], [200, 200]);
    assert.equal(dongCp(w, id).length, 3, "lệnh lặp không ghi thêm");
  } finally {
    tat();
  }
});

test("RF6: chuyến xe nhà xe CŨ có rented = 0 (trước T2) → sửa chỉ giờ 200, cờ vẫn 0, không dòng; đổi tuyến → 200, không chụp (chuyến không thuê)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    // Mô phỏng chuyến có trước T2: gỡ dòng chụp + hạ cờ (bỏ qua trigger — chỉ để dựng dữ liệu cũ).
    w.sqlite.exec("DROP TRIGGER vc_trip_cost_line_no_delete; DROP TRIGGER vc_trip_rented_alone; DROP TRIGGER vc_trip_rented_lower");
    w.sqlite.prepare("DELETE FROM vc_trip_cost_line WHERE trip_id = ?").run(id);
    w.sqlite.prepare("UPDATE vc_trip SET rented = 0 WHERE id = ?").run(id);
    const a = await sua(w, id, { batDau: { ngay: NGAY, gio: "12:45" }, ketThuc: { ngay: NGAY, gio: "15:00" } });
    assert.equal(a.status, 200, a.text);
    const b = await sua(w, id, { tuyen: n.dl });
    assert.equal(b.status, 200, b.text);
    assert.deepEqual({ ...w.q("SELECT rented r, route_code t FROM vc_trip WHERE id = ?", id)[0] }, { r: 0, t: n.dl });
    assert.deepEqual(dongCp(w, id), []);
  } finally {
    tat();
  }
});

test("Thiếu giá (V6): xe 29 chỗ không tuyến → không dòng nào; xuất bến (văn phòng) 409 có THIEU_GIA; Quản trị gửi kèm phá lệ vẫn 409 — không đường phá lệ; Bán hàng xếp + chọn tuyến 200, phản hồi không tiền", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const d = await don(w, { soNguoi: 2 });
    const r = await taoThue(w, { xe: n.x29, taiXe: n.tx });
    const id = r.json.chuyen.id;
    await xepHet(w, { chuyen: r.json.chuyen }, d, 2);
    assert.deepEqual(dongCp(w, id), []);
    const x = await tienDo(w, "van-phong", id, "xuat-ben");
    assert.equal(x.status, 409, x.text);
    assert.equal(x.json.error.code, "chua_du_dieu_kien_xuat_ben");
    assert.ok(x.json.error.lyDo.some((l: any) => l.ma === "THIEU_GIA"), JSON.stringify(x.json.error.lyDo));
    const y = await tienDo(w, "van-phong", id, "xuat-ben", { phaLe: { lyDo: "PHA_LE_SU_CO" } }, ADM);
    assert.equal(y.status, 409, y.text);
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", id)[0].s, "PLANNED");
    // Có giá thì xuất bến được: đổi tuyến sang NT-CR (G2) → chụp → xuất bến 200.
    const s = await sua(w, id, { tuyen: n.crt });
    assert.equal(s.status, 200, s.text);
    assert.ok(!s.text.includes("1000000"), "Bán hàng chọn tuyến — phản hồi không mang tiền");
    const z = await tienDo(w, "van-phong", id, "xuat-ben");
    assert.equal(z.status, 200, z.text);
  } finally {
    tat();
  }
});

// ==== T2 — route chi phí chuyến (Kế toán / Quản trị) + bảng kê (kế hoạch Đợt 4 Task 10; đánh giá bản vẽ §4 mục 7–9) =====================================
const chiPhi = (w: any, id: string, as = ACC) => w.call("GET", `/api/van-chuyen/chuyen/${id}/chi-phi`, { as });
const ghiCp = async (w: any, id: string, duoi: string, body: Record<string, unknown>, as = ACC) => {
  const pb = body.phienBanChiPhi ?? (await chiPhi(w, id)).json.chiPhi.phienBanChiPhi;
  return w.call("POST", `/api/van-chuyen/chuyen/${id}/chi-phi/${duoi}`, { as, body: { requestId: uuid(), phienBanChiPhi: pb, ...body } });
};
const xuatBenVp = (w: any, id: string) => tienDo(w, "van-phong", id, "xuat-ben");

test("Task 10 quyền: Kế toán VÀ Quản trị dùng được cả sáu route chi phí; Bán hàng / HDV / tài xế / tài xế đối tác / Đối tác / Thực tập → 403 (403 trước 400)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x29, taiXe: n.tx })).json.chuyen.id; // thiếu giá
    for (const as of [ACC, ADM]) {
      assert.equal((await chiPhi(w, id, as)).status, 200, `${as} xem`);
      assert.equal((await w.call("GET", `/api/van-chuyen/chi-phi?tu=${NGAY}&den=${NGAY}`, { as })).status, 200, `${as} bảng kê`);
    }
    assert.equal((await ghiCp(w, id, "chup-lai", {}, ACC)).status, 409, "chưa có giá bảng khớp");
    assert.equal((await ghiCp(w, id, "gia-thoa-thuan", { soTien: 1_350_000, ghiChu: "đã chốt với anh Hùng 14/10" }, ADM)).status, 201);
    assert.equal((await ghiCp(w, id, "dieu-chinh", { soTien: 50_000, lyDo: "CPX_CAU_DUONG", ghiChu: null }, ACC)).status, 201);
    const cp = (await chiPhi(w, id)).json.chiPhi;
    assert.equal((await ghiCp(w, id, "dao", { dongId: cp.dong[1].id, lyDo: "CPX_NHAP_SAI", ghiChu: null }, ADM)).status, 201);
    for (const as of [SALES, FIELD, DRIVER, DRIVER_PARTNER, PARTNER, INTERN]) {
      assert.equal((await chiPhi(w, id, as)).status, 403, `${as} xem`);
      assert.equal((await w.call("GET", `/api/van-chuyen/chi-phi?tu=${NGAY}&den=${NGAY}`, { as })).status, 403, `${as} bảng kê`);
      for (const duoi of ["dieu-chinh", "dao", "chup-lai", "gia-thoa-thuan"]) {
        assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${id}/chi-phi/${duoi}`, { as, body: { soTien: "sai" } })).status, 403, `${as} ${duoi}`);
      }
    }
  } finally {
    tat();
  }
});

test("V6b + chụp lại (ADR tiêu chí 4): thiếu giá → giá thoả thuận 1.350.000 → hết THIEU_GIA, xuất bến được; nhập lần nữa → 409; chụp lại khi Quản trị vừa thêm giá → SNAPSHOT, xuất bến được; occurred_date = ngày chạy", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const a = (await taoThue(w, { xe: n.x29, taiXe: n.tx })).json.chuyen.id;
    assert.ok((await giu(w, a)).includes("THIEU_GIA"));
    const cp0 = (await chiPhi(w, a)).json.chiPhi;
    assert.deepEqual([cp0.nguonGia, cp0.tong, cp0.coTheNhapThoaThuan, cp0.coTheChupLai, cp0.giaBangCoThe, cp0.phienBanChiPhi], [null, 0, true, false, null, 0]); // Task 13: chưa chọn tuyến ⇒ không giá bảng để lấy
    assert.ok(!cp0.lyDoChon.some((l: any) => ["CPX_DOI_CHUYEN", "CPX_HUY_CHUYEN", "CPX_GIA_THOA_THUAN"].includes(l.ma)), "không chọn được mã hệ thống / mã thoả thuận");
    assert.equal((await ghiCp(w, a, "gia-thoa-thuan", { soTien: 1_350_000, ghiChu: "" })).status, 400, "ghi chú thoả thuận bắt buộc");
    const t = await ghiCp(w, a, "gia-thoa-thuan", { soTien: 1_350_000, ghiChu: "đã chốt với anh Hùng 14/10" });
    assert.equal(t.status, 201, t.text);
    assert.deepEqual([t.json.chiPhi.nguonGia, t.json.chiPhi.tong, t.json.chiPhi.coTheNhapThoaThuan], ["THOA_THUAN", 1_350_000, false]);
    assert.equal(w.q("SELECT occurred_date d FROM vc_trip_cost_line WHERE trip_id = ?", a)[0].d, NGAY);
    assert.ok(!(await giu(w, a)).includes("THIEU_GIA"));
    const lai = await ghiCp(w, a, "gia-thoa-thuan", { soTien: 1_000_000, ghiChu: "lần hai" });
    assert.equal(lai.status, 409);
    assert.match(lai.text, /đã có giá thoả thuận/);
    assert.equal((await xuatBenVp(w, a)).status, 200);
    assert.equal((await ghiCp(w, a, "gia-thoa-thuan", { soTien: 1_000_000, ghiChu: "sau xuất bến" })).status, 409, "đã xuất bến");
    // Chụp lại: chuyến 29 chỗ tuyến NT-DL (không giá) → 409; Quản trị thêm giá cỡ 29 → chụp lại → SNAPSHOT.
    const b = (await taoThue(w, { xe: xeNhaXe(w, n.nx, 29), taiXe: taiXeNhaXe(w, n.nx), tuyen: n.dl, bd: "16:00", kt: "17:00" })).json.chuyen.id;
    const k = await ghiCp(w, b, "chup-lai", {});
    assert.equal(k.status, 409);
    assert.match(k.text, /Chưa có giá bảng cho chuyến này — nhập giá thoả thuận/);
    const c29 = (await w.call("GET", "/api/van-chuyen/co-xe", { as: ACC })).json.coXe.find((c: any) => c.tuSoKhach === 17).ma;
    assert.equal((await themGia(w, ADM, { nhaXePartyId: n.nx, tuyen: n.dl, coXe: c29, soTien: 1_250_000, tuNgay: NGAY })).status, 201);
    const k2 = await ghiCp(w, b, "chup-lai", {});
    assert.equal(k2.status, 201, k2.text);
    assert.deepEqual([k2.json.chiPhi.nguonGia, k2.json.chiPhi.tong], ["BANG", 1_250_000]);
    assert.equal(k2.json.chiPhi.dong[0].tuDong, false, "chụp lại do người bấm");
    assert.ok(!(await giu(w, b)).includes("THIEU_GIA"));
    const k3 = await ghiCp(w, b, "gia-thoa-thuan", { soTien: 1, ghiChu: "x" });
    assert.equal(k3.status, 409);
    assert.match(k3.text, /Chuyến đã có giá bảng — đảo giá bảng trước nếu muốn dùng giá thoả thuận/);
  } finally {
    tat();
  }
});

test("Task 13 (ADR-0095 Q9, vòng sửa 2 — 4.3): giaBangCoThe — thiếu giá + Quản trị thêm giá khớp 450.000 ⇒ 450000 / coTheChupLai; không khớp ⇒ null / false; đã có SNAPSHOT hoặc đã xuất bến ⇒ null; nhà xe thôi ⇒ null", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const a = (await taoThue(w, { xe: n.x29, taiXe: n.tx, tuyen: n.dl })).json.chuyen.id; // NT-DL + C29: chưa có giá
    const d = (await taoThue(w, { xe: xeNhaXe(w, n.nx, 29), taiXe: taiXeNhaXe(w, n.nx), tuyen: n.dl, bd: "20:00", kt: "21:00" })).json.chuyen.id;
    const cp0 = (await chiPhi(w, a)).json.chiPhi;
    assert.deepEqual([cp0.giaBangCoThe, cp0.coTheChupLai, cp0.coTheNhapThoaThuan], [null, false, true], "không dòng khớp");
    assert.equal((await themGia(w, ADM, { nhaXePartyId: n.nx, tuyen: n.dl, coXe: n.c29, soTien: 450_000, tuNgay: NGAY })).status, 201);
    const cp1 = (await chiPhi(w, a)).json.chiPhi;
    assert.deepEqual([cp1.giaBangCoThe, cp1.coTheChupLai], [450_000, true], "Quản trị vừa thêm giá khớp");
    assert.equal((await chiPhi(w, d)).json.chiPhi.giaBangCoThe, 450_000);
    const k = await ghiCp(w, a, "chup-lai", {});
    assert.equal(k.status, 201, k.text);
    assert.equal(k.json.chiPhi.tong, 450_000, "số gợi ý = số được chụp");
    assert.deepEqual([k.json.chiPhi.giaBangCoThe, k.json.chiPhi.coTheChupLai], [null, false], "đã có SNAPSHOT");
    const b = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt, bd: "16:00", kt: "17:00" })).json.chuyen.id;
    assert.equal((await xuatBenVp(w, b)).status, 200);
    assert.equal((await chiPhi(w, b)).json.chiPhi.giaBangCoThe, null, "đã xuất bến");
    thoiHopTac(w, n.nx);
    const cpd = (await chiPhi(w, d)).json.chiPhi;
    assert.deepEqual([cpd.giaBangCoThe, cpd.coTheChupLai, cpd.coTheNhapThoaThuan], [null, false, false], "nhà xe đã thôi");
  } finally {
    tat();
  }
});

test("V9 + điều chỉnh làm tổng âm (bản vẽ): đảo SNAPSHOT khi còn −200.000 → 409 tong_am, không dòng mới; điều chỉnh −1.300.000 trên tổng 1.000.000 → 409 tong_am; DTO: daoDuoc, lyDo {ma, nhan}, tuDong", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    const dc = await ghiCp(w, id, "dieu-chinh", { soTien: -200_000, lyDo: "CPX_NHAP_SAI", ghiChu: "nhập thừa" });
    assert.equal(dc.status, 201, dc.text);
    const cp = dc.json.chiPhi;
    assert.equal(cp.tong, 1_000_000);
    assert.deepEqual(cp.dong.map((d: any) => [d.loai, d.soTien, d.daoDuoc, d.tuDong, d.lyDo?.ma ?? null]), [["SNAPSHOT", 1_200_000, true, true, null], ["ADJUSTMENT", -200_000, true, false, "CPX_NHAP_SAI"]]);
    assert.equal(cp.dong[1].lyDo.nhan, "Nhập sai");
    const v9 = await ghiCp(w, id, "dao", { dongId: cp.dong[0].id, lyDo: "CPX_NHAP_SAI", ghiChu: null });
    assert.equal(v9.status, 409);
    assert.equal(v9.json.error.code, "tong_am");
    assert.equal(v9.json.error.message, "Tổng chi phí chuyến sẽ âm — đảo điều chỉnh giảm trước.");
    const am = await ghiCp(w, id, "dieu-chinh", { soTien: -1_300_000, lyDo: "CPX_KHAC", ghiChu: null });
    assert.equal(am.status, 409);
    assert.equal(am.json.error.code, "tong_am");
    assert.equal(dongCp(w, id).length, 2, "không dòng mới");
    assert.equal((await ghiCp(w, id, "dieu-chinh", { soTien: 100, lyDo: "CPX_DOI_CHUYEN", ghiChu: null })).status, 400, "mã hệ thống không chọn được");
    // SV-1: đảo TAY mang ngày của dòng gốc (điều chỉnh ghi ngày 2027-03-20 → đảo cũng 2027-03-20, dù hôm nay là NGAY).
    const g = await ghiCp(w, id, "dieu-chinh", { soTien: 70_000, lyDo: "CPX_CAU_DUONG", ghiChu: null, ngay: "2027-03-20" });
    const dg = await ghiCp(w, id, "dao", { dongId: g.json.chiPhi.dong.find((d: any) => d.soTien === 70_000).id, lyDo: "CPX_NHAP_SAI", ghiChu: null });
    assert.equal(dg.status, 201, dg.text);
    assert.equal(w.q("SELECT occurred_date d FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid DESC LIMIT 1", id)[0].d, "2027-03-20");
    assert.equal((await ghiCp(w, id, "dieu-chinh", { soTien: 100, lyDo: "CPX_GIA_THOA_THUAN", ghiChu: null })).status, 400);
  } finally {
    tat();
  }
});

test("V10 + V8b + TC-11: chuyến kết thúc gián đoạn — điều chỉnh −400.000 → 800.000, đảo giá sau xuất bến → 409; chuyến huỷ — phí huỷ muộn 300.000 → 300.000; chuyến chưa có dòng nào → 409 chua_co_chi_phi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    assert.equal((await xuatBenVp(w, id)).status, 200);
    const kt = await tienDo(w, "van-phong", id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" });
    assert.equal(kt.status, 200, kt.text);
    const a = await ghiCp(w, id, "dieu-chinh", { soTien: -400_000, lyDo: "CPX_XE_HONG", ghiChu: null }); // ADR-0095 Q8: lý do "Xe hỏng giữa đường"
    assert.equal(a.status, 201, a.text);
    assert.equal(a.json.chiPhi.tong, 800_000);
    assert.deepEqual(a.json.chiPhi.dong.find((x: any) => x.loai === "ADJUSTMENT").lyDo, { ma: "CPX_XE_HONG", nhan: "Xe hỏng giữa đường" });
    assert.equal(a.json.chiPhi.dong[0].daoDuoc, false, "giá đã chụp không đảo sau xuất bến");
    const d = await ghiCp(w, id, "dao", { dongId: a.json.chiPhi.dong[0].id, lyDo: "CPX_NHAP_SAI", ghiChu: null });
    assert.equal(d.status, 409);
    assert.match(d.text, /Giá đã chụp không đảo được sau khi xe chạy — dùng điều chỉnh/);
    // V8b
    const h = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt, bd: "17:00", kt: "18:00" })).json.chuyen.id;
    const c = await chiTiet(w, h);
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${h}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } })).status, 200);
    const p = await ghiCp(w, h, "dieu-chinh", { soTien: 300_000, lyDo: "CPX_HUY_MUON", ghiChu: null });
    assert.equal(p.status, 201, p.text);
    assert.equal(p.json.chiPhi.tong, 300_000);
    // TC-11: chuyến xe công ty không dòng nào.
    const cty = (await taoThue(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "19:00", kt: "20:00" })).json.chuyen.id;
    const k = await ghiCp(w, cty, "dieu-chinh", { soTien: 100_000, lyDo: "CPX_KHAC", ghiChu: null });
    assert.equal(k.status, 409);
    assert.equal(k.json.error.code, "chua_co_chi_phi");
  } finally {
    tat();
  }
});

test("Vòng sửa 2 (C1 — ADR-0095 Q4): điều chỉnh trên chuyến ĐÃ HUỶ mặc định mang NGÀY HUỶ (không phải hôm nay, không phải ngày chạy); chọn ngày khác vẫn được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x29, taiXe: n.tx, tuyen: n.crt, ngay: NGAY_SAU })).json.chuyen.id; // G4, chạy NGAY_SAU
    const c = await chiTiet(w, id);
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } })).status, 200); // huỷ ngày NGAY
    denGio("09:00", "2027-03-14"); // Kế toán ghi phí ba ngày sau
    const p = await ghiCp(w, id, "dieu-chinh", { soTien: 300_000, lyDo: "CPX_HUY_MUON", ghiChu: null });
    assert.equal(p.status, 201, p.text);
    const s = await ghiCp(w, id, "dieu-chinh", { soTien: -50_000, lyDo: "CPX_NHAP_SAI", ghiChu: null });
    assert.equal(s.status, 201, s.text);
    const t = await ghiCp(w, id, "dieu-chinh", { soTien: 10_000, lyDo: "CPX_KHAC", ghiChu: null, ngay: "2027-03-20" });
    assert.equal(t.status, 201, t.text);
    const ngay = w.q("SELECT amount a, occurred_date d FROM vc_trip_cost_line WHERE trip_id = ? AND kind = 'ADJUSTMENT' ORDER BY rowid", id).map((r: any) => [r.a, r.d]);
    assert.deepEqual(ngay, [[300_000, NGAY], [-50_000, NGAY], [10_000, "2027-03-20"]], "mặc định = ngày huỷ (NGAY); ngày chọn tay giữ nguyên");
  } finally {
    tat();
  }
});

test("Vòng sửa 2 (4.7 — ADR-0095 Q5): chuyến đã đổi sang XE CÔNG TY (chưa huỷ) — ghi 'Phí huỷ muộn' 300.000 → 201, dòng mang nhà xe CŨ, kiểm định không đỏ, bảng kê ở nhóm nhà xe cũ; lý do khác → 409", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    assert.equal((await sua(w, id, { xeId: xe(w, 16), taiXePartyId: `pty-${DRIVER}` })).status, 200);
    assert.equal(w.q("SELECT rented r FROM vc_trip WHERE id = ?", id)[0].r, 0);
    const k = await ghiCp(w, id, "dieu-chinh", { soTien: 100_000, lyDo: "CPX_KHAC", ghiChu: null });
    assert.equal(k.status, 409, k.text);
    assert.equal(k.json.error.code, "khong_phai_xe_thue");
    const p = await ghiCp(w, id, "dieu-chinh", { soTien: 300_000, lyDo: "CPX_HUY_MUON", ghiChu: "nhà xe đã điều xe tới bến" });
    assert.equal(p.status, 201, p.text);
    assert.equal(p.json.chiPhi.tong, 300_000);
    assert.equal(p.json.chiPhi.nhaXe.partyId, n.nx, "màn chi phí: nhà xe chịu là nhà xe cũ");
    assert.equal(w.q("SELECT carrier_party_id c FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid DESC LIMIT 1", id)[0].c, n.nx);
    const { CHECKS } = (await import(new URL("../../../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: { code: string; sql: string }[] };
    const do_ = CHECKS.filter((c) => c.code.startsWith("R-VC-COST")).map((c) => [c.code, Number(Object.values(w.q(c.sql)[0])[0])]).filter(([, v]) => v !== 0);
    assert.deepEqual(do_, [], "kiểm định R-VC-COST-* không đỏ");
    const bk = (await w.call("GET", `/api/van-chuyen/chi-phi?tu=${NGAY}&den=${NGAY}&nha-xe=${n.nx}`, { as: ACC })).json;
    assert.deepEqual([bk.soChuyen, bk.tongCong], [1, 300_000]);
  } finally {
    tat();
  }
});

test("Vòng sửa 2 (4.7) — GHIM hành vi hiện tại (Cần chủ): phí huỷ cho nhà xe cũ rồi HUỶ chuyến → lô huỷ đảo luôn phí đó (tổng 0); Kế toán ghi lại phí huỷ sau huỷ → mang nhà xe cũ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    assert.equal((await sua(w, id, { xeId: xe(w, 16), taiXePartyId: `pty-${DRIVER}` })).status, 200);
    assert.equal((await ghiCp(w, id, "dieu-chinh", { soTien: 300_000, lyDo: "CPX_HUY_MUON", ghiChu: null })).status, 201);
    const c = await chiTiet(w, id);
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } })).status, 200);
    assert.equal(tongCp(w, id), 0, "lô huỷ đảo mọi dòng còn hiệu lực, kể cả phí huỷ cho nhà xe cũ");
    assert.match(w.q("SELECT detail FROM audit_log WHERE action = 'trip_cancelled' AND target_id = ?", id)[0].detail, /đã đảo phí huỷ của nhà xe: Nhà xe Hùng Phát/, "nhật ký lệnh huỷ (Q5b)");
    const p = await ghiCp(w, id, "dieu-chinh", { soTien: 300_000, lyDo: "CPX_HUY_MUON", ghiChu: null });
    assert.equal(p.status, 201, p.text);
    assert.equal(w.q("SELECT carrier_party_id c FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid DESC LIMIT 1", id)[0].c, n.nx);
  } finally {
    tat();
  }
});

test("H1 (vòng sửa 3; ADR-0095 Q5b — chủ chọn E1): phí huỷ muộn cho nhà xe cũ trên chuyến xe công ty BỊ ĐẢO khi đổi sang xe công ty khác / dời ngày chạy / đổi tuyến (đường huỷ: bài 4.7 GHIM ở trên)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const phiHuy = async (bd: string, kt: string) => {
      const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt, bd, kt })).json.chuyen.id;
      const s = await sua(w, id, { xeId: xe(w, 16), taiXePartyId: `pty-${DRIVER}` });
      assert.equal(s.status, 200, s.text);
      assert.equal((await ghiCp(w, id, "dieu-chinh", { soTien: 300_000, lyDo: "CPX_HUY_MUON", ghiChu: null })).status, 201);
      assert.equal(tongCp(w, id), 300_000);
      return id;
    };
    const daoPhi = (id: string) => w.q("SELECT count(*) n FROM vc_trip_cost_line r JOIN vc_trip_cost_line g ON g.id = r.reverses_id WHERE r.trip_id = ? AND g.reason_code = 'CPX_HUY_MUON'", id)[0].n;
    const a = await phiHuy("12:30", "13:30");
    const sa = await sua(w, a, { xeId: xe(w, 16), taiXePartyId: `pty-${DRIVER}` });
    assert.equal(sa.status, 200, `đổi sang xe công ty khác: ${sa.text}`);
    const b = await phiHuy("15:00", "16:00");
    const sb = await sua(w, b, { batDau: { ngay: NGAY_SAU, gio: "15:00" }, ketThuc: { ngay: NGAY_SAU, gio: "16:00" } });
    assert.equal(sb.status, 200, `dời ngày: ${sb.text}`);
    const c = await phiHuy("18:00", "19:00");
    const sc = await sua(w, c, { tuyen: n.dl });
    assert.equal(sc.status, 200, `đổi tuyến: ${sc.text}`);
    for (const [id, ten] of [[a, "đổi xe công ty khác"], [b, "dời ngày"], [c, "đổi tuyến"]] as const) {
      assert.equal(daoPhi(id), 1, `${ten}: phí huỷ cho nhà xe cũ BỊ đảo theo luật chung (ADR-0095 Q5b — chủ chọn E1; dongBiDaoKhi)`);
      assert.equal(tongCp(w, id), 0, ten);
      const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_edited' AND target_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1", id)[0].detail;
      assert.match(nk, /đã đảo phí huỷ của nhà xe: Nhà xe Hùng Phát/, `${ten}: nhật ký lệnh ghi rõ đã đảo phí huỷ (Q5b)`);
    }
    // Q5b: kiểm định cảnh báo R-VC-COST-8 thấy đủ 3 phí huỷ bị đảo tự động chưa ghi lại; Kế toán ghi lại một chuyến → còn 2.
    const { CHECKS } = (await import(new URL("../../../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: { code: string; sql: string }[] };
    const c8 = CHECKS.find((x) => x.code === "R-VC-COST-8")!;
    const dem8 = () => Number(Object.values(w.q(c8.sql)[0])[0]);
    assert.equal(dem8(), 3);
    assert.equal((await ghiCp(w, c, "dieu-chinh", { soTien: 300_000, lyDo: "CPX_HUY_MUON", ghiChu: null })).status, 201);
    assert.equal(dem8(), 2);
  } finally {
    tat();
  }
});

test("Phiên bản chi phí cũ (TC-8): hai Kế toán cùng đọc phiên bản 1 — người thứ nhất 201, người thứ hai 409 chi_phi_vua_doi; gửi lại cùng requestId → 200, không dòng mới; ngày phát sinh điều chỉnh mặc định = NGÀY CHẠY (ADR-0095 Q4, vòng sửa 3 M1), chọn được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x29, taiXe: n.tx, tuyen: n.crt, ngay: NGAY_SAU })).json.chuyen.id; // G4 (NT-CR, C29) từ NGAY_SAU
    const rid = uuid();
    const mot = await w.call("POST", `/api/van-chuyen/chuyen/${id}/chi-phi/dieu-chinh`, { as: ACC, body: { requestId: rid, phienBanChiPhi: 1, soTien: 150_000, lyDo: "CPX_PHU_THU_CHO", ghiChu: null } });
    assert.equal(mot.status, 201, mot.text);
    const hai = await w.call("POST", `/api/van-chuyen/chuyen/${id}/chi-phi/dieu-chinh`, { as: ADM, body: { requestId: uuid(), phienBanChiPhi: 1, soTien: 50_000, lyDo: "CPX_CAU_DUONG", ghiChu: null } });
    assert.equal(hai.status, 409);
    assert.equal(hai.json.error.code, "chi_phi_vua_doi");
    const lai = await w.call("POST", `/api/van-chuyen/chuyen/${id}/chi-phi/dieu-chinh`, { as: ACC, body: { requestId: rid, phienBanChiPhi: 1, soTien: 150_000, lyDo: "CPX_PHU_THU_CHO", ghiChu: null } });
    assert.equal(lai.status, 200);
    assert.equal(dongCp(w, id).length, 2);
    const ngay = w.q("SELECT kind, occurred_date d FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid", id).map((r: any) => [r.kind, r.d]);
    assert.deepEqual(ngay, [["SNAPSHOT", NGAY_SAU], ["ADJUSTMENT", NGAY_SAU]], "SNAPSHOT = ngày chạy; điều chỉnh mặc định = ngày chạy (hôm nay là NGAY ≠ ngày chạy)");
    assert.equal((await ghiCp(w, id, "dieu-chinh", { soTien: 10_000, lyDo: "CPX_KHAC", ghiChu: null, ngay: "2027-03-20" })).status, 201);
    assert.equal(w.q("SELECT occurred_date d FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid DESC LIMIT 1", id)[0].d, "2027-03-20");
  } finally {
    tat();
  }
});

test("Nhật ký chi phí: mỗi lệnh ghi MỘT dòng audit_log cùng lô — mã chuyến, tên nhà xe, tổng trước → sau, nhãn lý do; không ghi chú tự do, không SĐT", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x29, taiXe: n.tx })).json.chuyen.id;
    const ma = (await chiTiet(w, id)).chuyen.ma;
    await ghiCp(w, id, "gia-thoa-thuan", { soTien: 1_350_000, ghiChu: "anh Hùng 0987654321" });
    await ghiCp(w, id, "dieu-chinh", { soTien: 150_000, lyDo: "CPX_PHU_THU_CHO", ghiChu: "chờ 2 giờ" });
    const nk = w.q("SELECT action, detail FROM audit_log WHERE action LIKE 'trip_cost_%' ORDER BY created_at, rowid");
    assert.deepEqual(nk.map((r: any) => r.action), ["trip_cost_agreed", "trip_cost_adjusted"]);
    assert.equal(nk[0].detail, `${ma} · Nhà xe Hùng Phát · chi phí 0 → 1.350.000 · giá thoả thuận trước`);
    assert.equal(nk[1].detail, `${ma} · Nhà xe Hùng Phát · chi phí 1.350.000 → 1.500.000 · Phụ thu chờ thêm giờ`);
    for (const r of nk) assert.ok(!/0987654321|chờ 2 giờ/.test(r.detail));
  } finally {
    tat();
  }
});

test("Bảng kê: ba chuyến (đã kết thúc 1.200.000; huỷ có phí 300.000; thiếu giá) ⇒ nhóm nhà xe 1.500.000, tổng cộng, số đếm do máy chủ; lọc DA_PHAT_SINH ⇒ 1.200.000; cột điều chỉnh là TIỀN; khoảng > 92 ngày → 400", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const a = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    assert.equal((await xuatBenVp(w, a)).status, 200);
    assert.equal((await tienDo(w, "van-phong", a, "ket-thuc")).status, 200);
    const b = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt, bd: "17:00", kt: "18:00" })).json.chuyen.id;
    await ghiCp(w, b, "dieu-chinh", { soTien: 150_000, lyDo: "CPX_PHU_THU_CHO", ghiChu: null });
    const cb = await chiTiet(w, b);
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${b}/huy`, { as: SALES, body: { version: cb.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } })).status, 200);
    await ghiCp(w, b, "dieu-chinh", { soTien: 300_000, lyDo: "CPX_HUY_MUON", ghiChu: null });
    const c = (await taoThue(w, { xe: n.x29, taiXe: n.tx, bd: "19:00", kt: "20:00" })).json.chuyen.id; // thiếu giá
    const r = await w.call("GET", `/api/van-chuyen/chi-phi?tu=${NGAY}&den=${NGAY}`, { as: ACC });
    assert.equal(r.status, 200, r.text);
    const k = r.json;
    assert.deepEqual([k.tongCong, k.soChuyen, k.soNhaXe, k.soThieuGia], [1_500_000, 3, 1, 1]);
    assert.equal(k.nhom[0].nhaXe.ten, "Nhà xe Hùng Phát");
    assert.deepEqual([k.nhom[0].soChuyen, k.nhom[0].tongNhom], [3, 1_500_000]);
    const theo = new Map(k.nhom[0].dong.map((d: any) => [d.tripId, d]));
    assert.deepEqual(((x: any) => [x.nhomTrangThai, x.nguonGia, x.tong, x.tongDieuChinh])(theo.get(a)), ["DA_PHAT_SINH", "BANG", 1_200_000, 0]);
    assert.deepEqual(((x: any) => [x.nhomTrangThai, x.nguonGia, x.tong, x.tongDieuChinh, x.soDieuChinh])(theo.get(b)), ["DA_HUY", null, 300_000, 300_000, 1]);
    assert.deepEqual(((x: any) => [x.nhomTrangThai, x.tong])(theo.get(c)), ["THIEU_GIA", 0]);
    assert.ok((theo.get(a) as any).bienSo.length > 0);
    const loc = (await w.call("GET", `/api/van-chuyen/chi-phi?tu=${NGAY}&den=${NGAY}&trang-thai=DA_PHAT_SINH`, { as: ACC })).json;
    assert.deepEqual([loc.tongCong, loc.soChuyen], [1_200_000, 1]);
    assert.equal((await w.call("GET", `/api/van-chuyen/chi-phi?tu=2027-01-01&den=2027-04-15`, { as: ACC })).status, 400);
    assert.equal((await w.call("GET", `/api/van-chuyen/chi-phi?tu=${NGAY}&den=${NGAY}&trang-thai=LA`, { as: ACC })).status, 400);
    // V7 trên bảng kê: điều chỉnh bị đảo DO ĐỔI CHUYẾN được đếm.
    const d = (await taoThue(w, { xe: n.x29, taiXe: n.tx, tuyen: n.crt, ngay: NGAY_SAU, bd: "09:00", kt: "10:00" })).json.chuyen.id; // G4
    await ghiCp(w, d, "dieu-chinh", { soTien: 150_000, lyDo: "CPX_PHU_THU_CHO", ghiChu: null });
    assert.equal((await sua(w, d, { tuyen: n.dl })).status, 200);
    const kd = (await w.call("GET", `/api/van-chuyen/chi-phi?tu=${NGAY_SAU}&den=${NGAY_SAU}`, { as: ADM })).json.nhom[0].dong[0];
    // Vòng sửa 2 (B): NT-DL không có giá cho xe 29 chỗ ⇒ sau đổi tuyến chưa có giá.
    assert.deepEqual([kd.tong, kd.soDieuChinh, kd.soDieuChinhBiDao, kd.tongDieuChinh, kd.nhomTrangThai], [0, 0, 1, 0, "THIEU_GIA"]);
    const cpd = (await chiPhi(w, d)).json.chiPhi;
    assert.ok(cpd.dong.find((x: any) => x.loai === "ADJUSTMENT").daoDoDoiChuyen, "dòng điều chỉnh: 'đảo do đổi chuyến'");
  } finally {
    tat();
  }
});

test("Bảng kê nhóm theo NHÀ XE CHỊU CHI PHÍ: chuyến của nhà xe A đổi sang xe công ty rồi huỷ, phí huỷ muộn 300.000 → nằm ở nhóm A (lọc nha-xe=A thấy), không ở công ty chủ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    assert.equal((await sua(w, id, { xeId: xe(w, 16), taiXePartyId: `pty-${DRIVER}` })).status, 200);
    const c = await chiTiet(w, id);
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } })).status, 200);
    const p = await ghiCp(w, id, "dieu-chinh", { soTien: 300_000, lyDo: "CPX_HUY_MUON", ghiChu: null });
    assert.equal(p.status, 201, p.text);
    assert.equal(p.json.chiPhi.nhaXe.partyId, n.nx, "màn chi phí: nhà xe chịu là A");
    assert.equal(w.q("SELECT carrier_party_id c FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid DESC LIMIT 1", id)[0].c, n.nx);
    const k = (await w.call("GET", `/api/van-chuyen/chi-phi?tu=${NGAY}&den=${NGAY}`, { as: ACC })).json;
    assert.deepEqual(k.nhom.map((g: any) => [g.nhaXe.partyId, g.nhaXe.ten, g.tongNhom]), [[n.nx, "Nhà xe Hùng Phát", 300_000]]);
    const loc = (await w.call("GET", `/api/van-chuyen/chi-phi?tu=${NGAY}&den=${NGAY}&nha-xe=${n.nx}`, { as: ACC })).json;
    assert.deepEqual([loc.soChuyen, loc.tongCong], [1, 300_000]);
  } finally {
    tat();
  }
});

// ==== Vòng sửa 1 (người kiểm độc lập — mục thấp) ======================================================================================================
test("Vòng sửa 1: nhật ký bảng giá / tuyến / cỡ xe KHÔNG gắn targetType 'trip' cho id không phải chuyến — giá: hồ sơ nhà xe ('party'); tuyến, cỡ xe: không đối tượng (khuôn lý do điều phối)", async () => {
  const w = setup();
  const nx = nhaXeKhung(w);
  const t = await tuyenMoi(w, "Tuyến nhật ký");
  await w.call("PUT", `/api/van-chuyen/tuyen/${t}`, { as: ACC, body: { ten: "Tuyến nhật ký 2" } });
  const c = await coMoi(w, 10, 16);
  await w.call("PUT", `/api/van-chuyen/co-xe/${c}`, { as: ACC, body: { nhan: "Xe 16 chỗ" } });
  const a = await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t, coXe: c });
  await w.call("POST", `/api/van-chuyen/bang-gia/${a.json.dong.id}/ket-thuc`, { as: ACC, body: { denNgay: "2026-12-31" } });
  const rows = w.q("SELECT action, target_type, target_id FROM audit_log WHERE action IN ('rental_rate_added', 'rental_rate_closed', 'route_saved', 'vehicle_size_saved') ORDER BY created_at, rowid")
    .map((r: any) => [r.action, r.target_type, r.target_id]);
  assert.equal(rows.length, 6);
  for (const [action, type, id] of rows) {
    if (String(action).startsWith("rental_rate")) assert.deepEqual([type, id], ["party", nx], String(action));
    else assert.deepEqual([type, id], [null, null], String(action));
  }
});

test("Vòng sửa 1: chặn TỔNG ÂM ở LỚP MÁY CHỦ (điều chỉnh, đảo dòng) — gỡ trigger vc_trip_cost_line_total trong DB thử, máy chủ vẫn 409 tong_am, không dòng mới", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    w.sqlite.exec("DROP TRIGGER vc_trip_cost_line_total"); // chỉ còn lớp máy chủ
    const am = await ghiCp(w, id, "dieu-chinh", { soTien: -1_300_000, lyDo: "CPX_KHAC", ghiChu: null });
    assert.equal(am.status, 409, am.text);
    assert.equal(am.json.error.code, "tong_am");
    const dc = await ghiCp(w, id, "dieu-chinh", { soTien: -200_000, lyDo: "CPX_NHAP_SAI", ghiChu: null });
    assert.equal(dc.status, 201, dc.text);
    const v9 = await ghiCp(w, id, "dao", { dongId: dc.json.chiPhi.dong[0].id, lyDo: "CPX_NHAP_SAI", ghiChu: null });
    assert.equal(v9.status, 409, v9.text);
    assert.equal(v9.json.error.code, "tong_am");
    assert.equal(dongCp(w, id).length, 2, "không dòng mới");
  } finally {
    tat();
  }
});

test("Vòng sửa 1: đổi sang xe nhà xe A KÈM tài xế của nhà xe B → bị chặn (chéo xe – tài xế), không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    const nxA = nhaXeKhung(w, "Nhà xe A");
    const xeA = xeNhaXe(w, nxA, 16);
    const nxB = nhaXeKhung(w, "Nhà xe B");
    const txB = taiXeNhaXe(w, nxB);
    const truoc = dongCp(w, id);
    const r = await sua(w, id, { xeId: xeA, taiXePartyId: txB });
    assert.equal(r.status, 409, r.text);
    assert.match(r.text, /CHEO_XE_TAI_XE|cheo_xe_tai_xe|Tài xế không thuộc chủ của xe/);
    assert.deepEqual(dongCp(w, id), truoc, "không dòng chi phí mới");
    assert.equal(w.q("SELECT vehicle_id v FROM vc_trip WHERE id = ?", id)[0].v, n.x16);
  } finally {
    tat();
  }
});

test("Vòng sửa 1 (mục 5): nhà xe đã thôi — DỜI NGÀY chạy → 409 carrier_inactive với lời đúng ca ('giữ ngày chạy cũ'); đổi tuyến vẫn câu ADR nguyên văn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nenThue(w);
    const id = (await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    thoiHopTac(w, n.nx);
    const ngay = await sua(w, id, { batDau: { ngay: NGAY_SAU, gio: "12:30" }, ketThuc: { ngay: NGAY_SAU, gio: "15:00" } });
    assert.equal(ngay.status, 409, ngay.text);
    assert.equal(ngay.json.error.code, "carrier_inactive");
    assert.equal(ngay.json.error.message, "Nhà xe này đã thôi hợp tác nên máy không tính lại giá được. Hãy chọn xe của nhà xe khác, hoặc giữ ngày chạy cũ.");
    const tuyen = await sua(w, id, { tuyen: n.dl });
    assert.equal(tuyen.json.error.message, "Nhà xe này đã thôi hợp tác nên máy không tính lại giá được. Hãy chọn xe của nhà xe khác, hoặc giữ tuyến cũ.");
    const ca2 = await sua(w, id, { tuyen: n.dl, batDau: { ngay: NGAY_SAU, gio: "12:30" }, ketThuc: { ngay: NGAY_SAU, gio: "15:00" } });
    assert.equal(ca2.json.error.message, "Nhà xe này đã thôi hợp tác nên máy không tính lại giá được. Hãy chọn xe của nhà xe khác, hoặc giữ tuyến và ngày chạy cũ.");
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_200_000]]);
  } finally {
    tat();
  }
});
