// ADR-0175 §2.7 (kế hoạch vé Tour Đảo Task 15): màn đối chiếu khách thực tế, theo dõi người quét, sổ vé Tour Đảo, «Đã dùng x/y» trên đơn. Qua ứng dụng THẬT (khung thử, SQLite tạm, đồng hồ giả).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, FIELD, NGAY, SALES, SUP, batDongHo, don, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { seedStaff } from "../../../tests/audit/harness.mjs";
import { CHECKS } from "../../../scripts/audit-checks.mjs";

const QL = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return Buffer.from(u).toString("base64"); };
const AT = "2026-01-01T00:00:00.000Z";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const MA_TD = /TD1\.[A-Z2-7]{26}/;

async function khoVe(w: any, soVe = 6) {
  w.sqlite.prepare("INSERT INTO ctl_service_ticket_source (id, code, source, valid_from_at, created_at, updated_at) VALUES (?, 'ZA1', 'TOUR_DAO', ?, ?, ?)").run(crypto.randomUUID(), AT, AT, AT);
  const lo = await w.call("POST", "/api/ve/lo", { as: ACC, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo", nguon: "TOUR_DAO" } });
  assert.equal(lo.status, 201, lo.text);
  const ve = Array.from({ length: soVe }, (_x, i) => ({ noiDung: PNG(i + 1), maVe: "TD1." + B32[i]!.repeat(26), tuNgay: "2027-01-01", denNgay: "2027-12-31" }));
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: ACC, body: { ve } })).json.themDuoc, soVe);
  assert.equal((await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as: ACC, body: {} })).status, 200);
}
async function donDaMo(w: any, soNguoi = 2) {
  const d = await don(w, { soNguoi });
  const tong = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order.total as number;
  assert.equal((await w.call("POST", `/api/orders/${d.id}/payments`, { as: ADM, body: { soTien: tong, hinhThuc: "CASH", nguoiThu: "cong_ty" } })).status, 201);
  assert.equal((await w.call("POST", "/api/ve/giao", { as: SALES, body: { orderId: d.id, requestId: crypto.randomUUID() } })).status, 200);
  return d;
}
const maCuaDon = (w: any, id: string): string[] =>
  w.q("SELECT t.ticket_code AS ma FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_id = ? AND a.released_at IS NULL ORDER BY a.slot_no", id).map((r: { ma: string }) => r.ma);
const quet = (w: any, as: string, ma: string) => w.call("POST", "/api/ve/quet", { as, body: { ma } });
const doiChieu = (w: any, as: string, ngay = NGAY) => w.call("GET", `/api/ve/doi-chieu?ngay=${ngay}`, { as });
const nguoiQuet = (w: any, as: string, ngay = NGAY) => w.call("GET", `/api/ve/nguoi-quet?ngay=${ngay}`, { as });
const soVe = (r: any) => r.json.soVe as { daTao: number; trongKho: number; daCapChuaMo: number; daMoChuaDung: number; daDung: number; daHuy: number };
const tongNamO = (s: ReturnType<typeof soVe>) => s.trongKho + s.daCapChuaMo + s.daMoChuaDung + s.daDung + s.daHuy;
const chiSo = (d: any, ma: string): number => Number(Object.values(d.prepare(CHECKS.find((x: { code: string }) => x.code === ma)!.sql).get() as Record<string, unknown>)[0]);
const themQuanLy = (w: any) => seedStaff(w.sqlite, { id: QL, phone: "0900000031", name: "Quản Lý", perms: ["SALES", "SALES_MANAGER"] });

test("Kế toán, Quản trị, Toàn quyền, Quản lý bán hàng xem được đối chiếu và người quét; Bán hàng thường, Hướng dẫn viên, Tài xế bị 403", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    themQuanLy(w);
    for (const as of [ACC, ADM, SUP, QL]) {
      assert.equal((await doiChieu(w, as)).status, 200, `đối chiếu ${as}`);
      assert.equal((await nguoiQuet(w, as)).status, 200, `người quét ${as}`);
    }
    for (const as of [SALES, FIELD, DRIVER]) {
      assert.equal((await doiChieu(w, as)).status, 403, `đối chiếu ${as}`);
      assert.equal((await nguoiQuet(w, as)).status, 403, `người quét ${as}`);
    }
    assert.equal((await doiChieu(w, ACC, "2027-13-40")).status, 400, "ngày sai");
    assert.equal((await w.call("GET", "/api/ve/doi-chieu?ngay=hom-nay", { as: ACC })).status, 400);
  } finally { tat(); }
});

test("số liệu khớp dữ liệu gieo: đơn đã xác nhận 2 khách, quét 1 → khách theo đơn 2, đã dùng 1, chênh 1; đơn huỷ không tính; không lộ khách, mã đơn, mã vé", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await khoVe(w);
    const a = await donDaMo(w, 2);
    const b = await donDaMo(w, 1);
    const [ma] = maCuaDon(w, a.id);
    assert.equal((await quet(w, FIELD, ma!)).json.mau, "XANH");
    let r = await doiChieu(w, ACC);
    assert.deepEqual(r.json.dong, [{ dichVu: "Tour đảo", soKhachTheoDon: 3, daDung: 1, chenhLech: 2 }]);
    // Huỷ đơn chưa quét: khỏi đối chiếu.
    assert.equal((await w.call("POST", `/api/orders/${b.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
    r = await doiChieu(w, ACC);
    assert.deepEqual(r.json.dong, [{ dichVu: "Tour đảo", soKhachTheoDon: 2, daDung: 1, chenhLech: 1 }]);
    assert.equal((await doiChieu(w, ACC, "2027-03-20")).json.dong.length, 0, "ngày khác không có dòng");
    assert.doesNotMatch(r.text, /Khách Dò Tìm|0912345678|777000/);
    assert.doesNotMatch(r.text, MA_TD);
    assert.doesNotMatch(r.text, new RegExp(a.code));
  } finally { tat(); }
});

test("theo dõi người quét: số lượt tính, chỉ xem, từ chối, đã bỏ theo từng người", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await khoVe(w);
    const a = await donDaMo(w, 2);
    const [m1, m2] = maCuaDon(w, a.id);
    const t1 = await quet(w, FIELD, m1!);
    await quet(w, FIELD, m1!); // quét lại → từ chối
    await quet(w, DRIVER, m2!); // chỉ xem
    const t2 = await quet(w, FIELD, m2!);
    assert.equal((await w.call("POST", `/api/ve/quet/${t2.json.lanQuetId}/bo`, { as: FIELD, body: { lyDo: "Quét nhầm vé khách khác" } })).status, 200);
    const r = await nguoiQuet(w, ACC);
    assert.equal(r.status, 200, r.text);
    const dong = r.json.dong as { nguoi: string; daTinh: number; chiXem: number; tuChoi: number; daBo: number }[];
    assert.deepEqual(dong.find((d) => d.nguoi === "Hướng Dẫn"), { nguoi: "Hướng Dẫn", daTinh: 1, chiXem: 0, tuChoi: 1, daBo: 1 });
    assert.deepEqual(dong.find((d) => d.nguoi === "Tài Xế Một"), { nguoi: "Tài Xế Một", daTinh: 0, chiXem: 1, tuChoi: 0, daBo: 0 });
    assert.ok(t1.json.lanQuetId);
    assert.doesNotMatch(r.text, MA_TD);
    assert.doesNotMatch(r.text, /"(ticket|order|scanned_by|id)"/);
  } finally { tat(); }
});

test("sổ vé Tour Đảo: daTao bằng tổng năm ô sau từng bước, kể cả vé đã mở rồi chết vì huỷ đơn (thuộc «đã huỷ»); R-VDT-9 đạt", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await khoVe(w, 6);
    let s = soVe(await doiChieu(w, ACC));
    assert.deepEqual(s, { daTao: 6, trongKho: 6, daCapChuaMo: 0, daMoChuaDung: 0, daDung: 0, daHuy: 0 });
    // Đơn A: đã mở, quét 1 → đã dùng. Đơn B: cấp chưa mở (chưa thu đủ, chưa giao).
    const a = await donDaMo(w, 2);
    assert.equal((await quet(w, FIELD, maCuaDon(w, a.id)[0]!)).json.mau, "XANH");
    const b = await don(w, { soNguoi: 1 });
    assert.ok(b.id);
    s = soVe(await doiChieu(w, ACC));
    assert.equal(s.daTao, 6);
    assert.equal(s.daDung, 1);
    assert.equal(s.daMoChuaDung, 1);
    assert.equal(s.daCapChuaMo, 1);
    assert.equal(s.trongKho, 3);
    assert.equal(tongNamO(s), s.daTao);
    // Đơn C đã mở, chưa quét, rồi huỷ đơn: vé mở bị huỷ → «đã huỷ».
    const c = await donDaMo(w, 1);
    assert.equal((await w.call("POST", `/api/orders/${c.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } })).status, 200);
    s = soVe(await doiChieu(w, ACC));
    assert.equal(s.daHuy, 1, "vé đã mở rồi chết vì huỷ đơn thuộc «đã huỷ»");
    assert.equal(tongNamO(s), s.daTao);
    assert.equal(chiSo(w.sqlite, "R-VDT-9"), 0);
  } finally { tat(); }
});

test("R-VDT-9 bắt sổ lệch: vé ALLOCATED không còn phân bổ mở rơi khỏi cả năm ô", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await khoVe(w, 2);
    assert.equal(chiSo(w.sqlite, "R-VDT-9"), 0);
    w.sqlite.exec("UPDATE vdt_ticket SET status = 'ALLOCATED' WHERE id = (SELECT id FROM vdt_ticket LIMIT 1)");
    assert.equal(chiSo(w.sqlite, "R-VDT-9"), 1);
  } finally { tat(); }
});

test("GET /api/ve/don/:id: «Đã dùng x/y» theo dịch vụ, chỉ con số", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await khoVe(w);
    const a = await donDaMo(w, 2);
    let r = await w.call("GET", `/api/ve/don/${a.id}`, { as: SALES });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.dichVu[0].daDung, 0);
    assert.equal((await quet(w, FIELD, maCuaDon(w, a.id)[0]!)).json.mau, "XANH");
    r = await w.call("GET", `/api/ve/don/${a.id}`, { as: SALES });
    assert.equal(r.json.dichVu[0].daDung, 1);
    assert.equal(r.json.dichVu[0].nhom[0].giu, 2);
    assert.doesNotMatch(r.text, MA_TD);
  } finally { tat(); }
});
