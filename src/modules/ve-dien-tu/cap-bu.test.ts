// ADR-0175 Đ1.5a — cấp bù khi lô vào kho, báo thiếu vé qua hộp thư (kế hoạch vé Tour Đảo Task 6). Qua ứng dụng THẬT (khung thử dieu-phoi-khung, SQLite tạm).
//   • Lô vào kho ⇒ máy cấp bù cho các đơn đã xác nhận còn thiếu, ngày đi gần trước; phản hồi có `capBu`.
//   • Giữ vé xong mà còn thiếu ⇒ một dòng nhật ký `ve_thieu` (lúc xác nhận đơn VÀ lúc cấp bù). Không mã vé, không tên khách.
//   • Hộp thư: vé Tour Đảo báo người giữ `ve.phat-hanh` (Kế toán có, Bán hàng thường không), vé hãng ngoài báo người giữ `ve.kho.manage` (ngược lại).
//   • Lô cho dịch vụ khác nguồn / «Không vé»: không chặn, phản hồi `canhBaoNguon: true`, không cấp bù.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, NGAY, NGAY_SAU, SALES, batDongHo, don, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";

const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return Buffer.from(u).toString("base64"); };
const AT = "2026-01-01T00:00:00.000Z";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
type Nguon = "HANG_NGOAI" | "TOUR_DAO";

/** Tạo lô `soVe` vé, thêm vé; trả phản hồi của lệnh xác nhận lô (đưa vào kho). */
async function loVaoKho(w: any, as: string, nguon: Nguon, soVe: number, lech = 0) {
  const lo = await w.call("POST", "/api/ve/lo", { as, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: PNG(i + 1 + lech), maVe: nguon === "TOUR_DAO" ? "TD1." + B32[i + lech]!.repeat(26) : `HN${i + 1 + lech}`, tuNgay: "2027-01-01", denNgay: "2027-12-31" }));
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as, body: { ve } })).json.themDuoc, soVe);
  const x = await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as, body: {} });
  assert.equal(x.status, 200, x.text);
  return x.json;
}
const datNguon = (w: any, nguon: Nguon) =>
  w.sqlite.prepare("INSERT INTO ctl_service_ticket_source (id, code, source, valid_from_at, created_at, updated_at) VALUES (?, 'ZA1', ?, ?, ?, ?)").run(crypto.randomUUID(), nguon, AT, AT, AT);
const soVeGiu = (w: any, id: string) => Number(w.q("SELECT count(*) AS n FROM vdt_allocation WHERE order_id = ? AND released_at IS NULL", id)[0].n);
const dongThieu = (w: any) => w.q("SELECT order_id, staff_id, target_type, target_id, detail FROM audit_log WHERE action = 've_thieu' ORDER BY rowid") as { order_id: string; staff_id: string; target_type: string; target_id: string; detail: string }[];
const hopThu = async (w: any, as: string) => {
  const r = await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as });
  assert.equal(r.status, 200, r.text);
  return (r.json.tin as { cau: string; maDon: string | null }[]).filter((t) => /thiếu vé/i.test(t.cau));
};

test("Tour Đảo: xác nhận đơn khi kho rỗng ghi ve_thieu; lô 2 vé vào kho cấp bù đơn ngày đi gần trước trước, đơn sau nhận phần còn lại, vẫn thiếu và có thêm đúng một dòng ve_thieu", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    datNguon(w, "TOUR_DAO");
    const sau = await don(w, { soNguoi: 2, ngay: NGAY_SAU });
    const truoc = await don(w, { soNguoi: 1, ngay: NGAY });
    const luc0 = dongThieu(w);
    assert.equal(luc0.length, 2, "mỗi đơn xác nhận khi kho rỗng có một dòng ve_thieu");
    assert.deepEqual(luc0.map((d) => [d.order_id, d.target_type, d.target_id]), [[sau.id, "ve", "TOUR_DAO"], [truoc.id, "ve", "TOUR_DAO"]]);
    assert.match(luc0[0]!.detail, /ZA1/);
    assert.match(luc0[0]!.detail, /thiếu 2/);
    const kq = await loVaoKho(w, ACC, "TOUR_DAO", 2);
    assert.equal(kq.capBu, 2);
    assert.equal(kq.canhBaoNguon, false);
    assert.equal(soVeGiu(w, truoc.id), 1, "đơn ngày đi gần nhận đủ vé trước");
    assert.equal(soVeGiu(w, sau.id), 1, "đơn ngày đi sau nhận phần còn lại, vẫn thiếu 1");
    const moi = dongThieu(w).slice(luc0.length);
    assert.equal(moi.length, 1, "lần cấp bù chỉ thêm một dòng ve_thieu (cho đơn còn thiếu)");
    assert.equal(moi[0]!.order_id, sau.id);
    assert.equal(moi[0]!.staff_id, ACC);
    assert.equal(moi[0]!.target_id, "TOUR_DAO");
    assert.match(moi[0]!.detail, /thiếu 1/);
    for (const d of dongThieu(w)) assert.doesNotMatch(d.detail, /TD1\.|Khách/, "nhật ký không mã vé, không tên khách");
    // Hộp thư: Kế toán (ve.phat-hanh) thấy; Bán hàng thường (chỉ ve.kho.manage) không thấy tin thiếu vé Tour Đảo.
    const keToan = await hopThu(w, ACC);
    assert.ok(keToan.some((t) => t.maDon === sau.code), JSON.stringify(keToan));
    assert.deepEqual(await hopThu(w, SALES), []);
  } finally { tat(); }
});

test("hãng ngoài: tin thiếu vé tới người giữ ve.kho.manage (Bán hàng), không tới Kế toán", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const sau = await don(w, { soNguoi: 2, ngay: NGAY_SAU });
    const truoc = await don(w, { soNguoi: 1, ngay: NGAY });
    const kq = await loVaoKho(w, ADM, "HANG_NGOAI", 2);
    assert.equal(kq.capBu, 2);
    assert.equal(soVeGiu(w, truoc.id), 1);
    const moi = dongThieu(w).filter((d) => d.staff_id === ADM);
    assert.deepEqual(moi.map((d) => [d.order_id, d.target_id]), [[sau.id, "HANG_NGOAI"]]);
    const banHang = await hopThu(w, SALES);
    assert.ok(banHang.some((t) => t.maDon === sau.code), JSON.stringify(banHang));
    assert.deepEqual(await hopThu(w, ACC), []);
  } finally { tat(); }
});

test("lô hết vé thì dừng cấp bù: đơn sau không được xét lại, không thêm dòng ve_thieu (đã báo lúc xác nhận)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const sau = await don(w, { soNguoi: 1, ngay: NGAY_SAU });
    const truoc = await don(w, { soNguoi: 1, ngay: NGAY });
    const luc0 = dongThieu(w).length;
    const kq = await loVaoKho(w, ADM, "HANG_NGOAI", 1);
    assert.equal(kq.capBu, 1);
    assert.equal(soVeGiu(w, truoc.id), 1);
    assert.equal(soVeGiu(w, sau.id), 0);
    assert.equal(dongThieu(w).length, luc0, "lô hết vé sau đơn đầu: vòng dừng");
  } finally { tat(); }
});

test("lô Tour Đảo cho dịch vụ đang là vé hãng ngoài: không chặn, canhBaoNguon true, không cấp bù đơn đang thiếu", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 1, ngay: NGAY });
    const kq = await loVaoKho(w, ACC, "TOUR_DAO", 1);
    assert.equal(kq.canhBaoNguon, true);
    assert.equal(kq.capBu, 0);
    assert.equal(soVeGiu(w, d.id), 0);
  } finally { tat(); }
});

test("lô cho dịch vụ «Không vé»: canhBaoNguon true", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ chuaKhaiCoVe: true });
    const kq = await loVaoKho(w, ADM, "HANG_NGOAI", 1);
    assert.equal(kq.canhBaoNguon, true);
    assert.equal(kq.dichVuKhongVe, true);
    assert.equal(kq.capBu, 0);
  } finally { tat(); }
});
