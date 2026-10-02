// BÀI SỐ LẠ — CHI PHÍ XE THUÊ là giá vốn (ADR-0057 C7, Hệ quả hàng rào 1; kế hoạch Đợt 4 Task 11 — Review Focus 4). Trên khung thử: gieo giá bảng 480017
// và chuyến xe nhà xe có SNAPSHOT 480017 + điều chỉnh 1480017; đơn có HDV phụ trách và khách trên chuyến đó. Gọi MỌI route GET (tự quét `route("GET", …)`
// của src/modules/*/index.ts — route mới tự vào bài) bằng Bán hàng, HDV, Đối tác, Thực tập, tài xế, tài xế đối tác, cùng phản hồi lệnh tạo / sửa chuyến của
// Bán hàng ⇒ không thân 200 nào chứa 480017 (kể cả "480.017"). Đối chứng: Kế toán đọc chi phí THẤY số (bài không rỗng).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import {
  ACC, DRIVER, DRIVER_PARTNER, FIELD, INTERN, NGAY, PARTNER, SALES, batDongHo, chiTiet, don, nhaXeKhung, setup, taiXeNhaXe, uuid, xeNhaXe, xepHet,
} from "../tests/audit/dieu-phoi-khung.mjs";

const LA = "480017";
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
/** Số lạ của dòng (480017, 1480017) VÀ tổng dẫn xuất (480017 + 1480017 = 1960034) — lộ tổng cũng là lộ giá vốn. */
const LA_TONG = "1960034";
const coLo = (text: string) => { const t = text.replace(UUID, ""); return t.includes(LA) || t.includes("480.017") || t.includes(LA_TONG) || t.includes("1.960.034"); };
const MODULES = new URL("./modules/", import.meta.url);
/** Mọi route GET khai ở src/modules/<m>/index.ts (đường dẫn thô, có :tham số). */
const ROUTE_GET = readdirSync(MODULES).flatMap((m) => {
  let src = "";
  try { src = readFileSync(new URL(`${m}/index.ts`, MODULES), "utf8"); } catch { return []; }
  return [...src.matchAll(/route\(\s*"GET"\s*,\s*"([^"]+)"/g)].map((x) => x[1]!);
});

test("bài số lạ 480017: giá thuê / chi phí chuyến KHÔNG lộ ở bất kỳ route GET nào mà Bán hàng, HDV, Đối tác, Thực tập, tài xế, tài xế đối tác vào được, kể cả phản hồi lệnh xếp", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const nx = nhaXeKhung(w, "Nhà xe Số Lạ");
    const tx = taiXeNhaXe(w, nx);
    const x16 = xeNhaXe(w, nx, 16);
    const t = await w.call("POST", "/api/van-chuyen/tuyen", { as: ACC, body: { ten: "Tuyến số lạ" } });
    const tuyen = t.json.tuyen[0].ma;
    const coXe = (await w.call("POST", "/api/van-chuyen/co-xe", { as: ACC, body: { tuSoKhach: 10, denSoKhach: 16 } })).json.coXe[0].ma; // vòng sửa 2 (B): đủ tuyến + cỡ
    assert.equal((await w.call("POST", "/api/van-chuyen/bang-gia", { as: ACC, body: { requestId: uuid(), nhaXePartyId: nx, tuyen, coXe, soTien: Number(LA), tuNgay: "2027-03-01", denNgay: null, ghiChu: null, thayDongId: null } })).status, 201);
    const d = await don(w, { soNguoi: 2, handler: FIELD });
    const tao = await w.call("POST", "/api/van-chuyen/chuyen", { as: SALES, body: { requestId: uuid(), xeId: x16, taiXePartyId: tx, tuyen, batDau: { ngay: NGAY, gio: "12:30" }, ketThuc: { ngay: NGAY, gio: "15:00" } } });
    assert.equal(tao.status, 201, tao.text);
    const tripId = tao.json.chuyen.id;
    const phanHoiGhi: { ten: string; text: string }[] = [{ ten: "tạo chuyến (Bán hàng)", text: tao.text }];
    const xep = await xepHet(w, { chuyen: tao.json.chuyen }, d, 2);
    phanHoiGhi.push({ ten: "xếp khách (Bán hàng)", text: JSON.stringify(xep) });
    const c = await chiTiet(w, tripId);
    const pb = (await w.call("GET", `/api/van-chuyen/chuyen/${tripId}/chi-phi`, { as: ACC })).json.chiPhi.phienBanChiPhi;
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${tripId}/chi-phi/dieu-chinh`, { as: ACC, body: { requestId: uuid(), phienBanChiPhi: pb, soTien: 1_480_017, lyDo: "CPX_KHAC", ghiChu: null } })).status, 201);
    const sua = await w.call("PUT", `/api/van-chuyen/chuyen/${tripId}`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), batDau: { ngay: NGAY, gio: "12:45" }, ketThuc: { ngay: NGAY, gio: "15:00" } } });
    assert.equal(sua.status, 200, sua.text);
    phanHoiGhi.push({ ten: "sửa chuyến (Bán hàng)", text: sua.text });
    // Đối chứng: Kế toán THẤY số (dữ liệu đúng là có số lạ).
    const kt = await w.call("GET", `/api/van-chuyen/chuyen/${tripId}/chi-phi`, { as: ACC });
    assert.ok(coLo(kt.text), "chống bài rỗng: Kế toán thấy chi phí 480017");
    for (const p of phanHoiGhi) assert.ok(!coLo(p.text), `phản hồi "${p.ten}" lộ số lạ`);
    // Tham số đường dẫn: chuyến / đơn thật; tham số khác → giá trị lạ (route trả 4xx thì bỏ qua).
    const duong = (p: string) => {
      let r = p;
      if (/\/api\/van-chuyen\/(chuyen|cuoc-cua-toi)\/:id/.test(r)) r = r.replace(":id", tripId);
      if (/\/api\/orders\/:id/.test(r)) r = r.replace(":id", d.id);
      r = r.replace(":orderId", d.id).replace(":legId", d.legId).replace(/:[A-Za-z]+/g, "x");
      if (r === "/api/van-chuyen/lich") r += `?ngay=${NGAY}`;
      if (r === "/api/van-chuyen/chi-phi") r += `?tu=${NGAY}&den=${NGAY}`;
      if (r === "/api/van-chuyen/bang-gia") r += `?nha-xe=${nx}`;
      return r;
    };
    let so200 = 0;
    const loi: string[] = [];
    const daGoi = new Set<string>();
    for (const as of [SALES, FIELD, PARTNER, INTERN, DRIVER, DRIVER_PARTNER]) {
      for (const p of ROUTE_GET) {
        const r = await w.call("GET", duong(p), { as });
        if (r.status !== 200) continue;
        so200++;
        daGoi.add(`${p} ${as}`);
        if (coLo(r.text)) loi.push(`${p} (${as})`);
      }
    }
    assert.deepEqual(loi, [], "route GET lộ số lạ");
    assert.ok(ROUTE_GET.length >= 50, `chống bài rỗng: ${ROUTE_GET.length} route GET`);
    assert.ok(so200 >= 40, `chống bài rỗng: ${so200} lần gọi 200`);
    for (const k of [`/api/van-chuyen/chuyen/:id ${SALES}`, `/api/van-chuyen/lich ${SALES}`, `/api/orders/:id ${FIELD}`, `/api/van-chuyen/xe-cua-don/:orderId ${SALES}`, `/api/van-chuyen/tuyen ${SALES}`]) {
      assert.ok(daGoi.has(k), `chống bài rỗng: đã gọi được ${k}`);
    }
  } finally {
    tat();
  }
});

test("bài số lạ 480017 — Task 13 (giaBangCoThe): dòng giá 480017 khớp chuyến CHƯA chụp — mọi route GET của Bán hàng, HDV, Đối tác, Thực tập, tài xế, tài xế đối tác không lộ; Kế toán /chi-phi THẤY (ca dương)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const nx = nhaXeKhung(w, "Nhà xe Số Lạ");
    const tx = taiXeNhaXe(w, nx);
    const x16 = xeNhaXe(w, nx, 16);
    const tuyen = (await w.call("POST", "/api/van-chuyen/tuyen", { as: ACC, body: { ten: "Tuyến số lạ" } })).json.tuyen[0].ma;
    const coXe = (await w.call("POST", "/api/van-chuyen/co-xe", { as: ACC, body: { tuSoKhach: 10, denSoKhach: 16 } })).json.coXe[0].ma;
    const d = await don(w, { soNguoi: 2, handler: FIELD });
    const tao = await w.call("POST", "/api/van-chuyen/chuyen", { as: SALES, body: { requestId: uuid(), xeId: x16, taiXePartyId: tx, tuyen, batDau: { ngay: NGAY, gio: "12:30" }, ketThuc: { ngay: NGAY, gio: "15:00" } } });
    assert.equal(tao.status, 201, tao.text);
    const tripId = tao.json.chuyen.id;
    await xepHet(w, { chuyen: tao.json.chuyen }, d, 2);
    // Giá thêm SAU khi tạo chuyến ⇒ chuyến chưa chụp, chỉ có giá "có thể lấy".
    assert.equal((await w.call("POST", "/api/van-chuyen/bang-gia", { as: ACC, body: { requestId: uuid(), nhaXePartyId: nx, tuyen, coXe, soTien: Number(LA), tuNgay: "2027-03-01", denNgay: null, ghiChu: null, thayDongId: null } })).status, 201);
    const kt = await w.call("GET", `/api/van-chuyen/chuyen/${tripId}/chi-phi`, { as: ACC });
    assert.equal(kt.json.chiPhi.giaBangCoThe, Number(LA), "chống bài rỗng: Kế toán thấy giá có thể lấy 480017");
    assert.equal(kt.json.chiPhi.dong.length, 0, "chuyến chưa chụp");
    const duong = (p: string) => {
      let r = p;
      if (/\/api\/van-chuyen\/(chuyen|cuoc-cua-toi)\/:id/.test(r)) r = r.replace(":id", tripId);
      if (/\/api\/orders\/:id/.test(r)) r = r.replace(":id", d.id);
      r = r.replace(":orderId", d.id).replace(":legId", d.legId).replace(/:[A-Za-z]+/g, "x");
      if (r === "/api/van-chuyen/lich") r += `?ngay=${NGAY}`;
      if (r === "/api/van-chuyen/chi-phi") r += `?tu=${NGAY}&den=${NGAY}`;
      if (r === "/api/van-chuyen/bang-gia") r += `?nha-xe=${nx}`;
      return r;
    };
    let so200 = 0;
    const loi: string[] = [];
    for (const as of [SALES, FIELD, PARTNER, INTERN, DRIVER, DRIVER_PARTNER]) {
      for (const p of ROUTE_GET) {
        const r = await w.call("GET", duong(p), { as });
        if (r.status !== 200) continue;
        so200++;
        if (coLo(r.text)) loi.push(`${p} (${as})`);
      }
    }
    assert.deepEqual(loi, [], "route GET lộ giá có thể lấy");
    assert.ok(so200 >= 40, `chống bài rỗng: ${so200} lần gọi 200`);
  } finally {
    tat();
  }
});
