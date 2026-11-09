// VÉ TOUR ĐẢO + QUÉT VÉ trên API THẬT (wrangler dev, D1 local tạm; ADR-0175 Đợt 1–2; đặc tả 2.12 mười một tiêu chí + bốn điều kiện nghiệm thu của ADR).
// Mã dịch vụ riêng ZTD1 (vé Tour Đảo), ZTD2 (vé hãng ngoài), ZTD3 (không khai «Có vé»); lô, đơn dùng một lần. Mã vé TD1 sinh ngẫu nhiên ngay trong kịch bản,
// KHÔNG in ra màn hình, không vào thông báo lỗi (assert chỉ kèm thân phản hồi, vốn không chứa mã). Dùng salesA / kế toán / admin / field / fieldB / superAdmin
// và ba tài khoản dùng một lần (Quản lý bán hàng, Tài xế công ty, Đối tác). KHÔNG đổi công ty chủ. Phần chưa phủ ở e2e (đã có bài đơn vị, ghi ở báo cáo):
// Trả sau còn nợ chỉ có vé Tour Đảo (huy-ve-tour-dao.test.ts), «đổi người bán dịch vụ không đổi luật vé», cửa sổ 5 phút bỏ lượt (quet-route.test.ts, đồng hồ giả).
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { ACCOUNTS, BASE, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, login, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const AT = "'2026-01-01T00:00:00.000Z'";
const tag = Date.now().toString(36);
const hom = vnDate(0);
const PHONE = "0913571360";
const TEN_KHACH = `Khách Vé TD ${tag}`;
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const maTD = () => "TD1." + Array.from(randomBytes(26), (b) => B32[b % 32]).join("");
const DANG_MA = /TD1\.[A-Z2-7]{26}/;
let dem = 0;
const PNG = (n) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); u.set(new TextEncoder().encode(tag), 20); return Buffer.from(u).toString("base64"); };

for (const [ma, ten, hang] of [["ZTD1", "Tour Đảo vé riêng thử", 191], ["ZTD2", "Tour vé hãng ngoài thử", 192], ["ZTD3", "Dịch vụ không vé thử", 193]]) {
  await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
    ('${ma}','${ten}','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,${hang},1,${AT},${AT})
    ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);
}
const SALES = await session(ACCOUNTS.salesA);
const KT = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const FIELD = await session(ACCOUNTS.field);
const FIELD_B = await session(ACCOUNTS.fieldB);
const SA = await session(ACCOUNTS.superAdmin);
const QLBH = (await gieoTaiKhoanLai(`Quản Lý Bán Vé ${tag}`, ["SALES_MANAGER", "SALES"])).cookie;
const DRV = (await gieoTaiKhoanLai(`Tài Xế Vé ${tag}`, ["DRIVER"])).cookie;
const taoDoiTac = async () => {
  const t = await call(SA, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Đối Tác Vé TD ${tag}`, phone: randomPhone(), roles: ["COLLABORATOR"] });
  assert.equal(t.status, 201, JSON.stringify(t.body));
  return (await login(t.body.staff.phone, t.body.pin)).cookie;
};
const DT = await taoDoiTac();

// ---- dựng: ô «Có vé», ô «Vé do ai phát», lô vé
for (const ma of ["ZTD1", "ZTD2"]) assert.equal((await call(ADM, "POST", "/api/catalog/co-ve", { pham: "SERVICE", ma, coVe: true })).status, 200);
const datNguon = (ma, nguon) => call(SA, "POST", "/api/catalog/nguon-ve", { ma, nguon });
assert.equal((await datNguon("ZTD1", "TOUR_DAO")).status, 200);
assert.equal((await datNguon("ZTD2", "HANG_NGOAI")).status, 200);
async function nhapLo(cookie, ma, nguon, n) {
  const lo = await call(cookie, "POST", "/api/ve/lo", { catalogCode: ma, nhomKhach: "ADULT", tenSanPham: "Vé thử Tour Đảo e2e", nguon });
  assert.equal(lo.status, 201, JSON.stringify(lo.body));
  const ve = Array.from({ length: n }, () => { dem++; return { noiDung: PNG(dem), maVe: nguon === "TOUR_DAO" ? maTD() : `E2E.${tag}.hn.${dem}`, tuNgay: vnDate(-1), denNgay: vnDate(60) }; });
  for (let i = 0; i < n; i += 10) { // mỗi đợt tối đa 10 vé
    const them = await call(cookie, "POST", `/api/ve/lo/${lo.body.loId}/ve`, { ve: ve.slice(i, i + 10) });
    assert.equal(them.body?.themDuoc, Math.min(10, n - i), JSON.stringify(them.body));
  }
  assert.equal((await call(cookie, "POST", `/api/ve/lo/${lo.body.loId}/xac-nhan`, {})).status, 200);
  return lo.body.loId;
}
const loTD1 = await nhapLo(KT, "ZTD1", "TOUR_DAO", 18);
await nhapLo(SALES, "ZTD1", "HANG_NGOAI", 2); // dịch vụ Tour Đảo: lô hãng ngoài KHÔNG được giữ
await nhapLo(SALES, "ZTD2", "HANG_NGOAI", 3);
const loTD2 = await nhapLo(KT, "ZTD2", "TOUR_DAO", 3); // dịch vụ hãng ngoài: lô Tour Đảo KHÔNG được giữ (vé luôn nằm trong kho)

const sv = (ma, adult, ngay = hom) => catalogService({ catalogCode: ma, catalogPriceSeen: { adult: 100000 }, pax: { adult }, departDate: ngay });
async function lap(cookie, dichVu, { thu = true, doiTac = false } = {}) {
  const r = await call(cookie, "POST", "/api/orders", orderInput({ customerName: TEN_KHACH, customerPhone: PHONE, services: dichVu }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const x = await call(cookie, "POST", `/api/orders/${r.body.order.id}/${doiTac ? "gui-don" : "status"}`, doiTac ? {} : { status: "confirmed" });
  assert.equal(x.status, 200, JSON.stringify(x.body));
  const don = { id: r.body.order.id, total: r.body.order.total, svc: r.body.order.services[0].id };
  if (thu) await thuDu(don);
  return don;
}
const thuDu = async (don) => { const t = await call(KT, "POST", `/api/orders/${don.id}/payments`, { soTien: don.total, hinhThuc: "CASH", nguoiThu: "cong_ty" }); assert.equal(t.status, 201, JSON.stringify(t.body)); };
const maCuaDon = async (id) => (await sqlRows(`SELECT t.ticket_code AS ma FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id WHERE a.order_id = '${id}' AND a.released_at IS NULL AND t.ticket_code LIKE 'TD1.%' ORDER BY a.slot_no`)).map((r) => r.ma);
const giao = (cookie, don) => call(cookie, "POST", "/api/ve/giao", { orderId: don.id, requestId: crypto.randomUUID() });
const rieng = []; // mọi thân phản hồi của route quét, để kiểm cuối: không chứa mã vé
const quet = async (cookie, ma, xacNhan) => { const r = await call(cookie, "POST", "/api/ve/quet", { ma, ...(xacNhan ? { xacNhan } : {}) }); rieng.push(JSON.stringify(r.body)); return r; };
const luot = async (dk = "1=1") => sqlRows(`SELECT * FROM vdt_scan WHERE ${dk}`);
const nLuot = async (ma, kq) => Number((await sqlRows(`SELECT count(*) AS n FROM vdt_scan s JOIN vdt_ticket t ON t.id = s.ticket_id WHERE t.ticket_code = '${ma}'${kq ? ` AND s.ket_qua = '${kq}'` : ""}`))[0].n);

// ---- Tiêu chí 1 + 2 (+ Đ1 của ADR): đơn nội bộ chưa thu đủ gửi được, đơn đối tác thì chưa; đơn có cả hai loại vé
const A = await lap(SALES, [sv("ZTD1", 2), sv("ZTD2", 1)], { thu: false });
assert.deepEqual((await sqlRows(`SELECT b.source AS s, count(*) AS n FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id JOIN vdt_batch b ON b.id = t.batch_id WHERE a.order_id = '${A.id}' AND a.released_at IS NULL GROUP BY b.source ORDER BY b.source`)).map((r) => [r.s, Number(r.n)]), [["HANG_NGOAI", 1], ["TOUR_DAO", 2]], "mỗi dịch vụ chỉ giữ lô đúng nguồn của nó");
const dsA = await call(SALES, "GET", `/api/ve/don/${A.id}`);
assert.equal(dsA.status, 200, JSON.stringify(dsA.body));
assert.equal(dsA.body.thuDu, false);
assert.equal(dsA.body.veTourDaoMoSom, true);
assert.equal(dsA.body.veXem.length, 2, "chưa thu đủ chỉ mở được vé Tour Đảo");
const gA = await giao(SALES, A);
assert.equal(gA.status, 200, JSON.stringify(gA.body));
assert.equal(gA.body.daGiao, 2, "gửi vé không kéo theo vé hãng ngoài");
const veHN = () => sqlRows(`SELECT a.revealed_at AS r FROM vdt_allocation a JOIN vdt_ticket t ON t.id = a.ticket_id JOIN vdt_batch b ON b.id = t.batch_id WHERE a.order_id = '${A.id}' AND a.released_at IS NULL AND b.source = 'HANG_NGOAI'`);
assert.deepEqual((await veHN()).map((r) => r.r), [null]);
const dd = await call(SALES, "POST", "/api/ve/duong-dan", { orderId: A.id, requestId: crypto.randomUUID() });
assert.equal(dd.status, 200, JSON.stringify(dd.body));
const tokenA = String(dd.body.duongDan).replace("/ve/", "");
const trangA = await fetch(`${BASE}/ve/${tokenA}`, { headers: { "cf-connecting-ip": `198.51.100.${Math.floor(Math.random() * 200) + 1}` } });
const htmlA = await trangA.text();
assert.equal(trangA.status, 200);
assert.equal([...htmlA.matchAll(/\/anh\/(\d+)"/g)].length, 2, "khách chỉ thấy hai vé Tour Đảo");
assert.match(htmlA, /Còn 1 vé chưa sẵn sàng/);
assert.deepEqual((await veHN()).map((r) => r.r), [null], "mở trang khách không đổi dấu lộ của vé hãng ngoài");

const D1 = await lap(DT, [sv("ZTD1", 2)], { thu: false, doiTac: true });
assert.equal((await giao(DT, D1)).status, 403, "đơn đối tác chưa thu đủ: chưa gửi được");
assert.equal((await call(DT, "POST", "/api/ve/duong-dan", { orderId: D1.id })).status, 403);

// ---- Tiêu chí 3, 4, 10: quét
const B = await lap(SALES, [sv("ZTD1", 3)]);
assert.equal((await giao(SALES, B)).body.daGiao, 3);
const [b1, b2, b3] = await maCuaDon(B.id);
const dx = await quet(DRV, b1);
assert.equal(dx.status, 200, JSON.stringify(dx.body));
assert.deepEqual([dx.body.mau, dx.body.ghi], ["XANH", "CHI_XEM"]);
assert.equal(await nLuot(b1, "DA_TINH"), 0, "Tài xế quét không tính đã dùng");
const hx = await quet(FIELD, b1);
assert.equal(hx.status, 200, JSON.stringify(hx.body));
assert.deepEqual([hx.body.mau, hx.body.ghi], ["XANH", "DA_TINH"]);
assert.equal(await nLuot(b1, "DA_TINH"), 1, "Hướng dẫn viên quét sau vẫn tính được");
assert.equal(hx.body.maDon, undefined, "người quét không có quyền xem đơn không nhận mã đơn");
assert.doesNotMatch(JSON.stringify(hx.body), new RegExp(`${TEN_KHACH}|${PHONE}|100000|100\\.000|300\\.000`), "không tên, SĐT, giá");
const [s1, s2] = await Promise.all([quet(FIELD, b2), quet(SALES, b2)]);
assert.deepEqual([s1.status, s2.status], [200, 200], JSON.stringify([s1.body, s2.body]));
assert.deepEqual([s1.body.ma, s2.body.ma].sort(), ["DA_DUNG", "HOP_LE"], "hai yêu cầu cùng lúc: đúng một bên thắng");
assert.equal(await nLuot(b2, "DA_TINH"), 1);
const thua = [s1, s2].find((x) => x.body.ma === "DA_DUNG");
assert.match(thua.body.cau, /^Đã dùng lúc \d\d:\d\d ngày \d\d\/\d\d bởi /, "bên thua nhận giờ và người");
assert.notEqual(thua.body.ghi, "DA_TINH", "bên thua không bao giờ ghi lượt tính");

// ---- Tiêu chí 6: vé còn trong kho, vé hãng ngoài, mã lạ
const maKho = (await sqlRows(`SELECT ticket_code AS ma FROM vdt_ticket WHERE batch_id = '${loTD2}' AND status = 'AVAILABLE' LIMIT 1`))[0].ma;
const kho = await quet(FIELD, maKho);
assert.deepEqual([kho.body.mau, kho.body.ma], ["DO", "CHUA_GIAO"]);
assert.equal(await nLuot(maKho, "DA_TINH"), 0);
const maHN = (await sqlRows(`SELECT ticket_code AS ma FROM vdt_ticket t JOIN vdt_batch b ON b.id = t.batch_id WHERE b.source = 'HANG_NGOAI' AND t.ticket_code LIKE 'E2E.${tag}.%' LIMIT 1`))[0].ma;
const truocLuot = (await luot()).length;
const hn = await quet(FIELD, maHN);
const la = await quet(FIELD, maTD());
assert.deepEqual(hn.body, la.body, "vé hãng ngoài và mã lạ trả cùng một câu");
assert.equal(hn.body.mau, "DO");
assert.equal((await luot()).length, truocLuot, "không ghi lượt cho vé hãng ngoài và mã lạ");

// ---- Tiêu chí 7: vàng (lệch ngày, chưa thu đủ, vượt số khách)
const E = await lap(SALES, [sv("ZTD1", 1, vnDate(3))]);
assert.equal((await giao(SALES, E)).body.daGiao, 1);
const [e1] = await maCuaDon(E.id);
const vE = await quet(FIELD, e1);
assert.deepEqual([vE.body.mau, vE.body.ma], ["VANG", "LECH_NGAY"]);
assert.equal(await nLuot(e1), 0, "vàng chưa bấm thì chưa ghi " + JSON.stringify(await sqlRows(`SELECT s.ket_qua, s.ly_do FROM vdt_scan s JOIN vdt_ticket t ON t.id = s.ticket_id WHERE t.ticket_code = '${e1}'`)));
assert.deepEqual([(await quet(FIELD, e1, { lechNgay: true })).body.mau], ["XANH"]);
assert.deepEqual((await luot(`ticket_id = (SELECT id FROM vdt_ticket WHERE ticket_code = '${e1}')`)).map((l) => [l.ket_qua, l.xac_nhan_lech_ngay]), [["DA_TINH", 1]]);
const F = await lap(SALES, [sv("ZTD1", 1)], { thu: false });
assert.equal((await giao(SALES, F)).body.daGiao, 1);
const [f1] = await maCuaDon(F.id);
const vF = await quet(FIELD, f1);
assert.deepEqual([vF.body.mau, vF.body.ma], ["VANG", "CHUA_THU_DU"]);
assert.doesNotMatch(vF.body.cau, /thiếu \d/, "Hướng dẫn viên chỉ thấy câu chung, không số tiền");
assert.equal(await nLuot(f1), 0);
assert.equal((await quet(FIELD, f1, { chuaThu: true })).body.mau, "XANH");
assert.deepEqual((await luot(`ticket_id = (SELECT id FROM vdt_ticket WHERE ticket_code = '${f1}')`)).map((l) => [l.ket_qua, l.xac_nhan_chua_thu]), [["DA_TINH", 1]]);
const G = await lap(SALES, [sv("ZTD1", 3)]);
assert.equal((await giao(SALES, G)).body.daGiao, 3);
const [g1, g2, g3] = await maCuaDon(G.id);
assert.equal((await quet(FIELD, g1)).body.mau, "XANH");
assert.equal((await quet(FIELD, g2)).body.mau, "XANH");
const pax = (n) => ({ adult: n, child: 0, senior: 0, infant: 0 });
const giamQuaSo = await call(ADM, "POST", `/api/orders/${G.id}/money-edit`, { lyDo: "BOT_NGUOI", services: [{ id: G.svc, pax: pax(1) }] });
assert.equal(giamQuaSo.status, 409, "giảm khách dưới số vé đã dùng bị chặn: " + JSON.stringify(giamQuaSo.body));
assert.equal(giamQuaSo.body.error.code, "duoi_so_ve_da_dung");
const giamDuoc = await call(ADM, "POST", `/api/orders/${G.id}/money-edit`, { lyDo: "BOT_NGUOI", services: [{ id: G.svc, pax: pax(2) }] });
assert.equal(giamDuoc.status, 200, JSON.stringify(giamDuoc.body));
const vG = await quet(FIELD, g3);
assert.deepEqual([vG.body.mau, vG.body.ma], ["VANG", "VUOT_KHACH"], "vé thừa sau khi giảm khách ra vàng");
assert.equal(await nLuot(g3), 0);
assert.equal((await quet(FIELD, g3, { vuotKhach: true })).body.mau, "XANH");
assert.deepEqual((await luot(`ticket_id = (SELECT id FROM vdt_ticket WHERE ticket_code = '${g3}')`)).map((l) => l.xac_nhan_vuot_khach), [1]);

// ---- Tiêu chí 5 (+ Đ1, Đ2 của ADR): huỷ đơn
const C = await lap(SALES, [sv("ZTD1", 2)]);
assert.equal((await giao(SALES, C)).body.daGiao, 2);
const [c1] = await maCuaDon(C.id);
assert.equal((await quet(DRV, c1)).body.ghi, "CHI_XEM");
const huyC = await call(SALES, "POST", `/api/orders/${C.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
assert.equal(huyC.status, 200, "chỉ có lượt CHI_XEM: huỷ được: " + JSON.stringify(huyC.body));
const qc = await quet(FIELD, c1);
assert.deepEqual([qc.body.mau, qc.body.ma, qc.body.cau], ["DO", "VE_DA_HUY", "Vé đã huỷ"]);
const nhomC = (await call(SALES, "GET", `/api/ve/don/${C.id}`)).body.dichVu.flatMap((d) => d.nhom);
assert.ok(nhomC.every((n) => n.thieu === 0), "đơn huỷ không báo thiếu vé");
const huyB = await call(SALES, "POST", `/api/orders/${B.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
assert.equal(huyB.status, 409, "đơn có vé đã dùng: huỷ bị chặn: " + JSON.stringify(huyB.body));
// bỏ lượt: lý do không được chứa mã vé hay số điện thoại; người khác 403; người quét tự bỏ; Quản trị bỏ bất kỳ lúc nào
const luotB = await sqlRows(`SELECT id, scanned_by FROM vdt_scan WHERE order_id = '${B.id}' AND ket_qua = 'DA_TINH' AND voided_at IS NULL`);
assert.equal(luotB.length, 2);
const luotB1 = (await sqlRows(`SELECT s.id FROM vdt_scan s JOIN vdt_ticket t ON t.id = s.ticket_id WHERE t.ticket_code = '${b1}' AND s.ket_qua = 'DA_TINH'`))[0].id;
const bo = (cookie, id, lyDo) => call(cookie, "POST", `/api/ve/quet/${id}/bo`, { lyDo });
assert.equal((await bo(FIELD, luotB1, `quét nhầm ${b1}`)).status, 400, "lý do chứa mã vé");
assert.equal((await bo(FIELD, luotB1, `quét nhầm gọi ${PHONE}`)).status, 400, "lý do chứa số điện thoại");
assert.equal((await bo(FIELD_B, luotB1, "người khác bỏ lượt này")).status, 403, "người không quét, không phải Quản trị");
assert.equal((await bo(SALES, luotB1, "Bán hàng bỏ lượt người khác")).status, 403);
assert.equal((await bo(FIELD, luotB1, "quét nhầm vé khi thử")).status, 200, "người quét tự bỏ trong 5 phút");
assert.equal((await bo(FIELD, luotB1, "quét nhầm vé khi thử")).status, 409, "bỏ lần hai");
assert.equal((await quet(FIELD, b1)).body.mau, "XANH", "bỏ lượt thì vé trở lại chưa dùng");
for (const l of await sqlRows(`SELECT id FROM vdt_scan WHERE order_id = '${B.id}' AND ket_qua = 'DA_TINH' AND voided_at IS NULL`)) assert.equal((await bo(ADM, l.id, "Quản trị bỏ lượt thử nghiệm")).status, 200);
assert.equal((await call(SALES, "POST", `/api/orders/${B.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" })).status, 200, "bỏ lượt rồi huỷ được");
assert.equal((await quet(FIELD, b3)).body.ma, "VE_DA_HUY");
assert.equal(Number((await sqlRows("SELECT count(*) AS n FROM audit_log WHERE action = 've_bo_luot_quet'"))[0].n) >= 3, true);

// ---- ADR Đ1.1: Đối tác huỷ đơn có vé Tour Đảo đã mở → 409
await thuDu(D1);
assert.equal((await giao(DT, D1)).status, 200, "đơn đối tác thu đủ thì gửi được");
const huyDT = await call(DT, "POST", `/api/orders/${D1.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
assert.equal(huyDT.status, 409, JSON.stringify(huyDT.body));
assert.equal((await sqlRows(`SELECT status FROM orders WHERE id = '${D1.id}'`))[0].status, "confirmed");

// ---- Tiêu chí 8: quyền lô, kho Kế toán, «Không vé», đổi ô «Vé do ai phát»
const taoLo = (cookie, nguon) => call(cookie, "POST", "/api/ve/lo", { catalogCode: "ZTD1", nhomKhach: "ADULT", tenSanPham: "Vé thử quyền", ...(nguon ? { nguon } : {}) });
assert.equal((await taoLo(SALES, "TOUR_DAO")).status, 403, "Bán hàng thường không tạo lô Tour Đảo");
for (const c of [SA, ADM, QLBH, KT]) assert.equal((await taoLo(c, "TOUR_DAO")).status, 201);
assert.equal((await taoLo(KT)).status, 403, "Kế toán không tạo lô hãng ngoài");
const loHN = new Set((await sqlRows("SELECT id FROM vdt_batch WHERE source = 'HANG_NGOAI'")).map((r) => r.id));
assert.ok(loHN.size > 0);
assert.ok((await call(KT, "GET", "/api/ve/kho")).body.kho.every((d) => d.nguon === "TOUR_DAO"));
assert.ok((await call(KT, "GET", "/api/ve/lo")).body.lo.every((l) => l.nguon === "TOUR_DAO" && !loHN.has(l.loId)));
assert.ok((await call(KT, "GET", "/api/ve/lo-da-huy")).body.lo.every((l) => !loHN.has(l.loId)));
const Z3 = await lap(SALES, [sv("ZTD3", 2)]);
assert.deepEqual((await call(SALES, "GET", `/api/ve/don/${Z3.id}`)).body.dichVu.flatMap((d) => d.nhom), [], "dịch vụ không vé không báo thiếu");
// đổi ô «Vé do ai phát» không làm đơn đã xác nhận đổi nghĩa: vé của đơn A vẫn là vé Tour Đảo (nguồn nằm ở lô, không ở danh mục)
const [a1] = await maCuaDon(A.id);
const truoc = await quet(FIELD, a1);
assert.equal((await datNguon("ZTD1", "HANG_NGOAI")).status, 200);
try {
  const sau = await quet(FIELD, a1);
  assert.deepEqual([sau.body.mau, sau.body.ma], [truoc.body.mau, truoc.body.ma]);
  assert.notEqual(sau.body.cau, "Không phải vé Tour Đảo");
} finally { assert.equal((await datNguon("ZTD1", "TOUR_DAO")).status, 200); }

// ---- Màn Đối chiếu vé và người quét (ô ve.doi-chieu.view; bỏ lượt bất kỳ lúc nào chỉ Quản trị, Toàn quyền)
const dc = await call(KT, "GET", `/api/ve/doi-chieu?ngay=${hom}`);
assert.equal(dc.status, 200, JSON.stringify(dc.body));
assert.ok(dc.body.dong.some((d) => d.daDung > 0));
assert.equal((await call(FIELD, "GET", `/api/ve/doi-chieu?ngay=${hom}`)).status, 403);
assert.equal((await call(KT, "GET", `/api/ve/nguoi-quet?ngay=${hom}`)).status, 200);
assert.equal((await call(ADM, "GET", `/api/ve/luot-quet?ngay=${hom}`)).status, 200);
assert.equal((await call(KT, "GET", `/api/ve/luot-quet?ngay=${hom}`)).status, 403);
assert.equal((await call(DT, "POST", "/api/ve/quet", { ma: "x" })).status, 403, "Đối tác không quét");

// ---- Tiêu chí 9: Permissions-Policy thật (camera chỉ ở /quet-ve); chưa thử iPhone thật
const pp = async (duong) => { const r = await fetch(`${BASE}${duong}`, { headers: { "cf-connecting-ip": "198.51.100.77" } }); return { status: r.status, pp: r.headers.get("permissions-policy") ?? "" }; };
const quetVe = await pp("/quet-ve");
assert.equal(quetVe.status, 200);
assert.match(quetVe.pp, /camera=\(self\)/);
for (const duong of ["/orders", "/login", "/ve-kho"]) assert.match((await pp(duong)).pp, /camera=\(\)/, duong);

// ---- Tiêu chí 10: nhật ký và mọi phản hồi quét không chứa mã vé
const nk = JSON.stringify(await sqlRows("SELECT detail, target_id FROM audit_log WHERE action LIKE 've_%'"));
assert.doesNotMatch(nk, DANG_MA);
for (const t of rieng) assert.doesNotMatch(t, DANG_MA);
console.log("ve-tour-dao e2e: ĐẠT");
