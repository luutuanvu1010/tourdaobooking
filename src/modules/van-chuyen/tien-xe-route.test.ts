// ROUTE TIỀN XE THUÊ (ADR-0057 T1 B3–B5, T2 C4–C9 — kế hoạch Đợt 4 Task 4, 9, 10) trên khung thử (CẢ ứng dụng + SQLite thật). Mỗi ca một `setup()`.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import * as esbuild from "esbuild";
import {
  ACC, ADM, DRIVER, DRIVER_PARTNER, FIELD, INTERN, NGAY, NGAY_SAU, PARTNER, SALES, SUP, batDongHo, chiTiet, don, nhaXeKhung, setup, taiXeNhaXe, thoiHopTac, tienDo, uuid, xe,
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
const themGia = (w: any, as: string, body: Record<string, unknown>) =>
  w.call("POST", "/api/van-chuyen/bang-gia", { as, body: { requestId: uuid(), tuyen: null, coXe: null, soTien: 1_200_000, tuNgay: "2026-10-01", denNgay: null, ghiChu: null, thayDongId: null, ...body } });

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
  const chong = await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t, tuNgay: "2026-12-01" });
  assert.equal(chong.status, 409);
  assert.equal(chong.json.error.code, "gia_chong");
  assert.equal((await themGia(w, ACC, { nhaXePartyId: nx, tuyen: t, tuNgay: "2026-10-01", thayDongId: x })).status, 409, "thay bằng ngày = ngày bắt đầu");
  const rid = uuid();
  const thay = await w.call("POST", "/api/van-chuyen/bang-gia", { as: ACC, body: { requestId: rid, nhaXePartyId: nx, tuyen: t, coXe: null, soTien: 1_300_000, tuNgay: "2026-11-01", denNgay: null, ghiChu: "Tăng giá mùa", thayDongId: x } });
  assert.equal(thay.status, 201, thay.text);
  assert.equal(thay.json.dong.thayDongId, x);
  const rows = w.q("SELECT id, amount, valid_from_date, valid_to_date FROM vc_rental_rate WHERE carrier_party_id = ? ORDER BY valid_from_date", nx);
  assert.deepEqual(rows.map((r: any) => [r.amount, r.valid_from_date, r.valid_to_date]), [[1_200_000, "2026-10-01", "2026-10-31"], [1_300_000, "2026-11-01", null]]);
  const lai = await w.call("POST", "/api/van-chuyen/bang-gia", { as: ACC, body: { requestId: rid, nhaXePartyId: nx, tuyen: t, coXe: null, soTien: 1_300_000, tuNgay: "2026-11-01", denNgay: null, ghiChu: "Tăng giá mùa", thayDongId: x } });
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
  await coMoi(w, 17, 29);
  const g = async (b: Record<string, unknown>) => {
    const r = await themGia(w, ACC, { nhaXePartyId: nx, ...b });
    assert.equal(r.status, 201, r.text);
    return r.json.dong.id as string;
  };
  await g({ tuyen: crt, coXe: c16, soTien: 1_200_000, tuNgay: "2027-03-01", denNgay: NGAY });
  await g({ tuyen: crt, soTien: 1_000_000, tuNgay: "2027-03-01", denNgay: NGAY });
  await g({ coXe: c16, soTien: 900_000, tuNgay: "2027-03-01" });
  await g({ tuyen: crt, soTien: 1_100_000, tuNgay: NGAY_SAU });
  return { nx, tx, x16, x29, crt, dl, c16 };
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
const chenCp = (w: any, trip: string, kind: string, amount: number, reason: string) => {
  const carrier = w.q("SELECT carrier_party_id c FROM vc_trip WHERE id = ?", trip)[0].c;
  w.sqlite.prepare(`INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, reason_code, occurred_date, cmd_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uuid(), trip, carrier, kind, amount, reason, NGAY, uuid(), new Date().toISOString(), new Date().toISOString());
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
    assert.equal((await themGia(w, ACC, { nhaXePartyId: nx2, tuyen: n.crt, soTien: 1_300_000, tuNgay: "2027-03-01" })).status, 201);
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
    assert.deepEqual(w.q("SELECT occurred_date d FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid", id).map((r: any) => r.d), [NGAY, NGAY_SAU, NGAY_SAU]);
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
    chenCp(w, id, "ADJUSTMENT", -200_000, "CPX_NHAP_SAI");
    const c = await chiTiet(w, id);
    const h = await w.call("POST", `/api/van-chuyen/chuyen/${id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } });
    assert.equal(h.status, 200, h.text);
    assert.deepEqual(dongCp(w, id), [["SNAPSHOT", 1_200_000], ["ADJUSTMENT", -200_000], ["REVERSAL", 200_000], ["REVERSAL", -1_200_000]]);
    assert.equal(tongCp(w, id), 0);
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", id)[0].s, "CANCELLED");
    assert.deepEqual(w.q("SELECT DISTINCT reason_code r FROM vc_trip_cost_line WHERE trip_id = ? AND kind = 'REVERSAL'", id).map((r: any) => r.r), ["CPX_HUY_CHUYEN"]);
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
      const dong = w.q("SELECT id, kind, amount, reverses_id, reason_code, created_at, carrier_party_id FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid", id)
        .map((r: any) => ({ id: r.id, kind: r.kind, amount: r.amount, reversesId: r.reverses_id, reasonCode: r.reason_code, createdAt: r.created_at, carrierPartyId: r.carrier_party_id }));
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
