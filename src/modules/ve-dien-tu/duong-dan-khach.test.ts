// Đường dẫn riêng cho khách (ADR-0153 Đ2; kế hoạch Task 7) qua ứng dụng THẬT. Hai route công khai chỉ đọc + giới hạn tốc độ chống dò token.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, SALES, batDongHo, don, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { bamToken, hanDuongDan, soSanhHangThoiGian, taoToken } from "./duong-dan-khach.ts";

const PNG = (n: number) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); return u; };
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const IP = (n: number) => ({ "cf-connecting-ip": `203.0.113.${n}` });

async function donThuDu(w: any) {
  const lo = await w.call("POST", "/api/ve/lo", { as: SALES, body: { catalogCode: "ZA1", nhomKhach: "ADULT", tenSanPham: "Tour đảo" } });
  const ve = [1, 2, 3].map((i) => ({ noiDung: b64(PNG(i)), maVe: `BI.MAT.${i}`, tuNgay: "2027-01-01", denNgay: "2027-03-20" }));
  await w.call("POST", `/api/ve/lo/${lo.json.loId}/ve`, { as: SALES, body: { ve } });
  await w.call("POST", `/api/ve/lo/${lo.json.loId}/xac-nhan`, { as: SALES, body: {} });
  const d = await don(w, { soNguoi: 2 });
  const phaiThu = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order.total as number;
  return { ...d, phaiThu };
}
const thuDuTien = (w: any, d: any) => w.call("POST", `/api/orders/${d.id}/payments`, { as: ADM, body: { soTien: d.phaiThu, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
const taoLink = (w: any, d: any, as = SALES) => w.call("POST", "/api/ve/duong-dan", { as, body: { orderId: d.id, requestId: crypto.randomUUID() } });

test("luật thuần: token ≥ 32 byte ngẫu nhiên, băm 64 hex, hạn = ngày dùng cuối + 7 ngày (cuối ngày giờ VN), so hằng thời gian", async () => {
  const [a, b] = [taoToken(), taoToken()];
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]{43,}$/);
  assert.match(await bamToken(a), /^[0-9a-f]{64}$/);
  assert.equal(hanDuongDan("2027-03-20"), "2027-03-27T16:59:59.999Z"); // 27/03 23:59:59.999 giờ VN
  assert.equal(soSanhHangThoiGian("abc", "abc"), true);
  assert.equal(soSanhHangThoiGian("abc", "abd"), false);
  assert.equal(soSanhHangThoiGian("abc", "abcd"), false);
});

test("donChuaThuDuKhongTaoDuongDan; thu đủ thì tạo được, token trả đúng một lần", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donThuDu(w);
    assert.equal((await taoLink(w, d)).status, 403);
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_guest_link")[0].n, 0);
    await thuDuTien(w, d);
    const r = await taoLink(w, d);
    assert.equal(r.status, 200, r.text);
    assert.match(r.json.duongDan, /^\/ve\/[A-Za-z0-9_-]{43,}$/);
    assert.equal(r.json.hetHan, "2027-03-27T16:59:59.999Z");
    const lai = await w.call("GET", `/api/ve/don/${d.id}`, { as: SALES });
    assert.doesNotMatch(lai.text, new RegExp(r.json.duongDan.slice(4)), "danh sách đường dẫn của đơn không bao giờ chứa token");
    assert.equal(lai.json.duongDan.length, 1);
  } finally { tat(); }
});

test("chiLuuBamKhongLuuToken: token không nằm ở bất kỳ cột nào của D1 lẫn nhật ký", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donThuDu(w);
    await thuDuTien(w, d);
    const token = (await taoLink(w, d)).json.duongDan.slice(4) as string;
    const toanBo = JSON.stringify([w.q("SELECT * FROM vdt_guest_link"), w.q("SELECT * FROM audit_log"), w.q("SELECT * FROM vdt_delivery")]);
    assert.ok(!toanBo.includes(token));
    assert.equal(w.q("SELECT token_hash FROM vdt_guest_link")[0].token_hash, await bamToken(token));
  } finally { tat(); }
});

test("trangKhachChiCoAnhNhanKhoangNgay: trang công khai không có tên khách, mã đơn, giá, mã vé; đầu phản hồi chặt; ghi lộ vé và đếm lượt mở", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donThuDu(w);
    await thuDuTien(w, d);
    const token = (await taoLink(w, d)).json.duongDan.slice(4) as string;
    const p = await w.call("GET", `/ve/${token}`, { headers: IP(1) });
    assert.equal(p.status, 200, p.text);
    assert.match(p.headers.get("content-type") ?? "", /^text\/html/);
    assert.equal(p.headers.get("cache-control"), "no-store");
    assert.equal(p.headers.get("x-content-type-options"), "nosniff");
    assert.match(p.headers.get("content-security-policy") ?? "", /default-src 'none'/);
    assert.equal((p.text.match(/<img /g) ?? []).length, 2, "đúng 2 vé của đơn 2 khách");
    assert.match(p.text, /Người lớn/);
    assert.match(p.text, /01\/01\/2027/);
    assert.match(p.text, /20\/03\/2027/);
    for (const cam of [d.code, "Khách Liên Hệ", "Dò Tìm", "777000", "BI.MAT", "vdt/", "0912345678"]) assert.ok(!p.text.includes(cam), `trang lộ "${cam}"`);
    assert.equal(w.q("SELECT opened_count FROM vdt_guest_link")[0].opened_count, 1);
    assert.equal(w.q("SELECT count(*) AS n FROM vdt_allocation WHERE order_id = ? AND revealed_at IS NOT NULL", d.id)[0].n, 2);
    const a = await w.call("GET", `/api/ve-khach/${token}/anh/1`, { headers: IP(1) });
    assert.equal(a.status, 200);
    assert.equal(a.headers.get("content-type"), "image/png");
    assert.equal(a.headers.get("cache-control"), "no-store");
    assert.equal((await w.call("GET", `/api/ve-khach/${token}/anh/3`, { headers: IP(1) })).status, 404, "vé thứ 3 không thuộc đơn");
    assert.equal((await w.call("GET", `/api/ve-khach/${token}/anh/0`, { headers: IP(1) })).status, 404);
  } finally { tat(); }
});

test("tokenSaiHoacHetHan_404GiongNhau; thuHoiRoiKhongXemDuoc; quetNhieuTokenKhongLoThongTin", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donThuDu(w);
    await thuDuTien(w, d);
    const r = await taoLink(w, d);
    const token = r.json.duongDan.slice(4) as string;
    const linkId = w.q("SELECT id FROM vdt_guest_link")[0].id as string;
    // hết hạn: chèn thẳng một đường dẫn đã quá hạn (trigger cấm sửa expires_at của dòng cũ)
    const hetHan = taoToken();
    w.sqlite.prepare("INSERT INTO vdt_guest_link (id, order_id, token_hash, expires_at, created_at, updated_at) VALUES ('het', ?1, ?2, '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z')").run(d.id, await bamToken(hetHan));
    const sai = await w.call("GET", `/ve/${taoToken()}`, { headers: IP(2) });
    const het = await w.call("GET", `/ve/${hetHan}`, { headers: IP(2) });
    assert.equal(sai.status, 404);
    assert.equal(het.status, 404);
    assert.equal(sai.text, het.text, "sai và hết hạn cùng một thân");
    assert.equal(sai.bytes.length, het.bytes.length);
    // thu hồi
    assert.equal((await w.call("POST", `/api/ve/duong-dan/${linkId}/thu-hoi`, { as: SALES, body: {} })).status, 200);
    const thuHoi = await w.call("GET", `/ve/${token}`, { headers: IP(2) });
    assert.equal(thuHoi.status, 404);
    assert.equal(thuHoi.text, sai.text, "thu hồi cùng thân với sai token");
    assert.equal((await w.call("GET", `/api/ve-khach/${token}/anh/1`, { headers: IP(2) })).status, 404);
    // quét nhiều token ngẫu nhiên: mọi thân 404 y hệt
    const doDai = new Set<number>();
    for (let i = 0; i < 8; i++) doDai.add((await w.call("GET", `/ve/${taoToken()}`, { headers: IP(10 + i) })).bytes.length);
    assert.equal(doDai.size, 1);
    // đã thu hồi: thu hồi lại vẫn 200 (không đổi gì), người không có quyền 403
    assert.equal((await w.call("POST", `/api/ve/duong-dan/${linkId}/thu-hoi`, { as: SALES, body: {} })).status, 200);
    assert.equal((await w.call("POST", `/api/ve/duong-dan/${linkId}/thu-hoi`, { body: {} })).status, 401);
  } finally { tat(); }
});

test("dungMotTokenSaiNhieuLan_biGioiHan: dò token sai nhiều lần từ một địa chỉ bị chặn 429; địa chỉ khác không bị ảnh hưởng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donThuDu(w);
    await thuDuTien(w, d);
    const token = (await taoLink(w, d)).json.duongDan.slice(4) as string;
    let chan = 0;
    for (let i = 0; i < 40; i++) if ((await w.call("GET", `/ve/${taoToken()}`, { headers: IP(77) })).status === 429) chan++;
    assert.ok(chan > 0, "phải bị chặn sau một số lần sai");
    assert.equal((await w.call("GET", `/ve/${token}`, { headers: IP(77) })).status, 429, "địa chỉ đã bị chặn thì cả token đúng cũng chờ");
    assert.equal((await w.call("GET", `/ve/${token}`, { headers: IP(78) })).status, 200, "địa chỉ khác vẫn vào được");
  } finally { tat(); }
});
