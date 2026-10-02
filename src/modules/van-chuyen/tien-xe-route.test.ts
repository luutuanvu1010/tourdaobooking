// ROUTE TIỀN XE THUÊ (ADR-0057 T1 B3–B5, T2 C4–C9 — kế hoạch Đợt 4 Task 4, 9, 10) trên khung thử (CẢ ứng dụng + SQLite thật). Mỗi ca một `setup()`.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, DRIVER_PARTNER, FIELD, INTERN, PARTNER, SALES, SUP, nhaXeKhung, setup, thoiHopTac, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";

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
