// ADR-0175 Đ2 (kế hoạch vé Tour Đảo Task 7): vé Tour Đảo mở từ lúc xác nhận, quyết THEO TỪNG VÉ. Qua ứng dụng THẬT (khung thử dieu-phoi-khung, SQLite tạm).
// Bất biến Đ2.5: đơn có cả vé hãng ngoài và vé Tour Đảo mà chưa thu đủ thì tạo đường dẫn / gửi / xem ảnh KHÔNG đóng dấu lộ lên vé hãng ngoài.
// Dựng đơn hai loại vé: kho có 1 vé hãng ngoài ⇒ xác nhận đơn 2 khách giữ được 1 vé hãng ngoài, thiếu 1; đổi ô «Vé do ai phát» sang Tour Đảo; lô Tour Đảo 1 vé vào kho ⇒ cấp bù.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, PARTNER, SALES, batDongHo, don, donDoiTac, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";

const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return Buffer.from(u).toString("base64"); };
const AT = "2026-01-01T00:00:00.000Z";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const MA_TD = /TD1\.[A-Z2-7]{26}/;
type Nguon = "HANG_NGOAI" | "TOUR_DAO";

async function loVaoKho(w: any, nguon: Nguon, soVe: number, lech: number) {
  const as = nguon === "TOUR_DAO" ? ACC : SALES;
  const lo = await w.call("POST", "/api/ve/lo", { as, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: PNG(i + 1 + lech), maVe: nguon === "TOUR_DAO" ? "TD1." + B32[i + lech]!.repeat(26) : `HN${i + 1 + lech}`, tuNgay: "2027-01-01", denNgay: "2027-12-31" }));
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as, body: { ve } })).json.themDuoc, soVe);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as, body: {} })).status, 200);
}
const datNguon = (w: any, nguon: Nguon) =>
  w.sqlite.prepare("INSERT INTO ctl_service_ticket_source (id, code, source, valid_from_at, created_at, updated_at) VALUES (?, 'ZA1', ?, ?, ?, ?)").run(crypto.randomUUID(), nguon, AT, AT, AT);
const phanBo = (w: any, id: string) =>
  w.q(`SELECT a.id, b.source AS nguon, a.revealed_at AS lo FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id JOIN vdt_batch b ON b.id = t.batch_id
       WHERE a.order_id = ? AND a.released_at IS NULL ORDER BY b.source`, id) as { id: string; nguon: Nguon; lo: string | null }[];
const cua = (w: any, id: string, nguon: Nguon) => phanBo(w, id).find((p) => p.nguon === nguon)!;

/** Kho: 1 vé hãng ngoài trước, xác nhận đơn (qua `lap`), đổi ô sang Tour Đảo, lô Tour Đảo 1 vé (cấp bù). Đơn có đúng một vé mỗi loại. */
async function donHaiLoaiVe(w: any, lap: () => Promise<{ id: string }>) {
  await loVaoKho(w, "HANG_NGOAI", 1, 0);
  const d = await lap();
  datNguon(w, "TOUR_DAO");
  await loVaoKho(w, "TOUR_DAO", 1, 10);
  assert.deepEqual(phanBo(w, d.id).map((p) => p.nguon), ["HANG_NGOAI", "TOUR_DAO"], "chống bài rỗng: đơn có một vé mỗi loại");
  return d;
}

test("đơn nội bộ, chưa thu đủ, có cả hai loại vé: tạo đường dẫn được; vé hãng ngoài KHÔNG bị đóng dấu lộ; trang khách chỉ hiện vé Tour Đảo; ảnh vé hãng ngoài vẫn khoá", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donHaiLoaiVe(w, () => don(w, { soNguoi: 2 }));
    const xem = await w.call("GET", `/api/ve/don/${d.id}`, { as: SALES });
    assert.equal(xem.status, 200, xem.text);
    assert.equal(xem.json.thuDu, false, "cổng tiền của vé hãng ngoài chưa đạt");
    assert.equal(xem.json.veTourDaoMoSom, true);
    assert.deepEqual(xem.json.veXem.map((v: { id: string }) => v.id), [cua(w, d.id, "TOUR_DAO").id], "veXem chỉ có vé Tour Đảo");
    const dd = await w.call("POST", "/api/ve/duong-dan", { as: SALES, body: { orderId: d.id } });
    assert.equal(dd.status, 200, dd.text);
    assert.doesNotMatch(dd.text, MA_TD);
    assert.equal(cua(w, d.id, "HANG_NGOAI").lo, null, "vé hãng ngoài không bị đóng dấu lộ");
    assert.notEqual(cua(w, d.id, "TOUR_DAO").lo, null, "vé Tour Đảo đã mở");
    const trang = await w.call("GET", dd.json.duongDan, { headers: { "cf-connecting-ip": "203.0.113.9" } });
    assert.equal(trang.status, 200, trang.text);
    assert.equal((trang.text.match(/<figure>/g) ?? []).length, 1, "trang khách liệt kê đúng 1 vé");
    assert.doesNotMatch(trang.text, MA_TD);
    assert.equal(cua(w, d.id, "HANG_NGOAI").lo, null, "mở trang khách không đóng dấu vé hãng ngoài");
    const anh = await w.call("GET", `/api/ve/anh/${cua(w, d.id, "HANG_NGOAI").id}`, { as: SALES });
    assert.equal(anh.status, 403, anh.text);
    assert.equal(anh.json.error.code, "chua_thu_du");
    assert.equal(cua(w, d.id, "HANG_NGOAI").lo, null);
    const giao = await w.call("POST", "/api/ve/giao", { as: SALES, body: { orderId: d.id, requestId: crypto.randomUUID() } });
    assert.equal(giao.status, 200, giao.text);
    assert.equal(giao.json.daGiao, 1, "chỉ giao vé Tour Đảo");
    assert.equal(cua(w, d.id, "HANG_NGOAI").lo, null, "giao vé không đóng dấu vé hãng ngoài");
    const anhTd = await w.call("GET", `/api/ve/anh/${cua(w, d.id, "TOUR_DAO").id}`, { as: SALES });
    assert.equal(anhTd.status, 200, anhTd.text);
  } finally { tat(); }
});

test("đơn chỉ vé Tour Đảo, nội bộ, chưa thu đủ: xem ảnh được ngay sau xác nhận (không chờ thu tiền)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    datNguon(w, "TOUR_DAO");
    await loVaoKho(w, "TOUR_DAO", 2, 0);
    const d = await don(w, { soNguoi: 1 });
    const anh = await w.call("GET", `/api/ve/anh/${cua(w, d.id, "TOUR_DAO").id}`, { as: SALES });
    assert.equal(anh.status, 200, anh.text);
  } finally { tat(); }
});

test("đơn tài khoản Đối tác lập, cùng tình huống: vé Tour Đảo KHÔNG mở trước khi thu đủ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donHaiLoaiVe(w, () => donDoiTac(w, { soNguoi: 2 }));
    const dd = await w.call("POST", "/api/ve/duong-dan", { as: PARTNER, body: { orderId: d.id } });
    assert.equal(dd.status, 403, dd.text);
    assert.equal(cua(w, d.id, "TOUR_DAO").lo, null);
    assert.equal(cua(w, d.id, "HANG_NGOAI").lo, null);
    const anh = await w.call("GET", `/api/ve/anh/${cua(w, d.id, "TOUR_DAO").id}`, { as: SALES });
    assert.equal(anh.status, 403, "văn phòng xem đơn đối tác lập cũng chưa mở");
    const xem = await w.call("GET", `/api/ve/don/${d.id}`, { as: SALES });
    assert.equal(xem.json.veTourDaoMoSom, false);
    assert.deepEqual(xem.json.veXem, []);
  } finally { tat(); }
});

test("đơn nhân viên lập, bên đặt là hồ sơ đối tác (vai được hưởng): vé Tour Đảo chờ thu đủ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    datNguon(w, "TOUR_DAO");
    await loVaoKho(w, "TOUR_DAO", 2, 0);
    const d = await don(w, { soNguoi: 1 });
    const DL = "dda00000-0000-4000-8000-0000000000aa";
    w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Đại lý Thử', 1, ?, ?)").run(DL, AT, AT);
    w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${DL}`, DL, AT, AT);
    w.sqlite.prepare("UPDATE orders SET booker_party_id = ? WHERE id = ?").run(DL, d.id);
    const anh = await w.call("GET", `/api/ve/anh/${cua(w, d.id, "TOUR_DAO").id}`, { as: SALES });
    assert.equal(anh.status, 403, anh.text);
    assert.equal(cua(w, d.id, "TOUR_DAO").lo, null);
  } finally { tat(); }
});

test("đơn huỷ: vé Tour Đảo đã trả về kho, đường dẫn không tạo được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    datNguon(w, "TOUR_DAO");
    await loVaoKho(w, "TOUR_DAO", 2, 0);
    const d = await don(w, { soNguoi: 1 });
    const id = cua(w, d.id, "TOUR_DAO").id;
    const h = await w.call("POST", `/api/orders/${d.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
    assert.equal(h.status, 200, h.text);
    assert.equal((await w.call("GET", `/api/ve/anh/${id}`, { as: SALES })).status, 404);
    const dd = await w.call("POST", "/api/ve/duong-dan", { as: SALES, body: { orderId: d.id } });
    assert.notEqual(dd.status, 200, dd.text);
  } finally { tat(); }
});
