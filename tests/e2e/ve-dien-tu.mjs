// KHO VÉ ĐIỆN TỬ trên API THẬT (wrangler dev, D1 local tạm + R2 local; ADR-0153). Ca: nhập lô → xác nhận lô → lập + xác nhận đơn (giữ vé qua D1 THẬT, db.batch) →
// huỷ đơn (trả vé về kho) → chưa thu đủ thì ảnh 403 → đường dẫn khách sai token 404 → Kế toán 403. Dùng RIÊNG mã danh mục giả ZVD1; mọi vé của kịch bản nằm trong lô riêng.
// ADR-0156: chống trùng theo mã + dấu vân tệp, trần lô (chỉ Toàn quyền đổi, khoá lạc quan, đợt sau cộng dồn), Bỏ lô rồi nhập lại đúng ảnh đó, lô từng giữ chỗ không bỏ được.
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, call, catalogService, ensureFakeCatalog, login, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const AT = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZVD1','Vé điện tử thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,96,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);

const SALES = await session(ACCOUNTS.salesA);
// ADR-0174: dịch vụ phải Có vé thì máy mới giữ vé. Chưa khai: kiểm ở ca 11b bằng mã riêng.
assert.equal((await call(await session(ACCOUNTS.admin), "POST", "/api/catalog/co-ve", { pham: "SERVICE", ma: "ZVD1", coVe: true })).status, 200);
const KT = await session(ACCOUNTS.accountant);
// Nhúng `tag`: từ ADR-0156 cùng ảnh là trùng, nên chạy lại trên cùng D1 cũng phải là ảnh khác.
const PNG = (n) => { const u = new Uint8Array(40); u.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, 0, 0, n, n]); u.set(new TextEncoder().encode(tag), 20); return Buffer.from(u).toString("base64"); };
const tag = Date.now().toString(36);
const den = vnDate(60);

// 1. Kế toán không vào được kho vé
assert.equal((await call(KT, "GET", "/api/ve/kho")).status, 403);

// 2. nhập lô 3 vé + xác nhận lô
const lo = await call(SALES, "POST", "/api/ve/lo", { catalogCode: "ZVD1", nhomKhach: "ADULT", tenSanPham: "Vé thử e2e" });
assert.equal(lo.status, 201, JSON.stringify(lo.body));
const them = await call(SALES, "POST", `/api/ve/lo/${lo.body.loId}/ve`, { ve: [1, 2, 3].map((i) => ({ noiDung: PNG(i), maVe: `E2E.${tag}.${i}`, tuNgay: vnDate(-1), denNgay: den })) });
assert.equal(them.status, 200, JSON.stringify(them.body));
assert.equal(them.body.themDuoc, 3);
assert.doesNotMatch(JSON.stringify(them.body), new RegExp(`E2E\\.${tag}`), "phản hồi không chứa mã vé đầy đủ");
assert.equal((await call(SALES, "POST", `/api/ve/lo/${lo.body.loId}/xac-nhan`, {})).status, 200);
const kho = (await call(SALES, "GET", "/api/ve/kho")).body.kho.find((d) => d.catalogCode === "ZVD1");
assert.deepEqual([kho.conTrong, kho.daGiu], [3, 0]);

// 3. lập + xác nhận đơn 2 khách ⇒ giữ 2 vé (db.batch thật)
const lap = async () => {
  const r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `Khách Vé E2E ${tag}`, customerPhone: "0913571357", services: [catalogService({ catalogCode: "ZVD1", catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: vnDate(14) })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const x = await call(SALES, "POST", `/api/orders/${r.body.order.id}/status`, { status: "confirmed" });
  assert.equal(x.status, 200, JSON.stringify(x.body));
  return r.body.order.id;
};
const id = await lap();
const dem = async (dk) => Number((await sqlRows(`SELECT count(*) AS n FROM vdt_allocation WHERE order_id = '${id}' AND ${dk}`))[0].n);
assert.equal(await dem("released_at IS NULL"), 2);
assert.equal(Number((await sqlRows("SELECT count(*) AS n FROM vdt_ticket WHERE status = 'ALLOCATED' AND batch_id = '" + lo.body.loId + "'"))[0].n), 2);

// 4. chưa thu đủ ⇒ danh sách có số lượng nhưng không có mã xem ảnh; ảnh 403
const ds = await call(SALES, "GET", `/api/ve/don/${id}`);
assert.equal(ds.status, 200);
assert.equal(ds.body.thuDu, false);
assert.deepEqual(ds.body.veXem, []);
const aid = (await sqlRows(`SELECT id FROM vdt_allocation WHERE order_id = '${id}' AND released_at IS NULL LIMIT 1`))[0].id;
assert.equal((await call(SALES, "GET", `/api/ve/anh/${aid}`)).status, 403);

// 5. đường dẫn khách: token sai ⇒ 404 cùng thân; chưa thu đủ ⇒ không tạo được
assert.equal((await call(SALES, "POST", "/api/ve/duong-dan", { orderId: id, requestId: crypto.randomUUID() })).status, 403);
const sai = await call(undefined, "GET", `/ve/${"A".repeat(43)}`);
assert.equal(sai.status, 404);

// 6. cấp bù bằng tay không cấp thừa
assert.equal((await call(SALES, "POST", "/api/ve/cap", { orderId: id })).status, 200);
assert.equal(await dem("released_at IS NULL"), 2, "cấp lại không giữ thừa");

// 7. huỷ đơn ⇒ trả hết vé về kho
const h = await call(SALES, "POST", `/api/orders/${id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
assert.equal(h.status, 200, JSON.stringify(h.body));
assert.equal(await dem("released_at IS NULL"), 0);
assert.equal(Number((await sqlRows(`SELECT count(*) AS n FROM vdt_ticket WHERE status = 'AVAILABLE' AND batch_id = '${lo.body.loId}'`))[0].n), 3);

// ---- ADR-0156 trên D1 THẬT (chỉ mục có điều kiện, trigger, lô db.batch của Bỏ lô, R2 mô phỏng) ----
const TQ = await session(ACCOUNTS.superAdmin);
const QT = await session(ACCOUNTS.admin);
const moLo = async (them = {}) => { const r = await call(SALES, "POST", "/api/ve/lo", { catalogCode: "ZVD1", nhomKhach: "ADULT", tenSanPham: "Vé thử e2e ADR-0156", ...them }); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body.loId; };
const veThu = (n, ma = `E2E.${tag}.${n}`) => ({ noiDung: PNG(n), maVe: ma, tuNgay: vnDate(-1), denNgay: den });
const themVe = (loId, ve) => call(SALES, "POST", `/api/ve/lo/${loId}/ve`, { ve });
const conTrong = async () => (await call(SALES, "GET", "/api/ve/kho")).body.kho.find((d) => d.catalogCode === "ZVD1").conTrong;
const demAudit = async (action) => Number((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = '${action}'`))[0].n);

// 8. chống trùng: ảnh đã có trong kho (mã khác) · mã đã có (ảnh khác) · hai ảnh giống nhau trong cùng đợt. Ba ca bị loại, ca lành vẫn vào.
const loTrung = await moLo();
const trung = await themVe(loTrung, [veThu(1, `E2E.${tag}.khac`), veThu(11, `E2E.${tag}.1`), veThu(12), veThu(12, `E2E.${tag}.khac2`)]);
assert.equal(trung.status, 200, JSON.stringify(trung.body));
assert.equal(trung.body.themDuoc, 1);
assert.deepEqual(trung.body.loai.map((l) => [l.thuTu, l.lyDo]), [[0, "Ảnh này đã có trong kho, đã loại."], [1, "Mã vé đã có trong kho, đã loại."], [3, "Trùng với một ảnh khác trong đợt này."]]);

// hai yêu cầu song song cùng một ảnh (ADR-0156 tiêu chí 2): một vào, một không; không có lỗi 500
const [ss1, ss2] = await Promise.all([themVe(loTrung, [veThu(13, `E2E.${tag}.ss1`)]), themVe(loTrung, [veThu(13, `E2E.${tag}.ss2`)])]);
assert.deepEqual([ss1.status, ss2.status], [200, 200], JSON.stringify([ss1.body, ss2.body]));
assert.equal(ss1.body.themDuoc + ss2.body.themDuoc, 1, JSON.stringify([ss1.body, ss2.body]));

// 9. trần lô: chỉ Toàn quyền đọc và đổi; ngoài khoảng 400; phiên bản cũ 409; vượt trần KHÔNG sinh lô dở; đợt sau cộng dồn với đợt trước
assert.equal((await call(SALES, "GET", "/api/ve/cai-dat")).status, 403);
assert.equal((await call(QT, "GET", "/api/ve/cai-dat")).status, 403);
assert.equal((await call(QT, "PUT", "/api/ve/cai-dat", { tranLo: 5, version: 0 })).status, 403);
const cd = await call(TQ, "GET", "/api/ve/cai-dat");
assert.equal(cd.status, 200, JSON.stringify(cd.body));
assert.equal(cd.body.tranLo, 50, "mặc định 50 do migration gieo");
for (const sai of [0, 201, 1.5, "2"]) assert.equal((await call(TQ, "PUT", "/api/ve/cai-dat", { tranLo: sai, version: cd.body.version })).status, 400, `trần ${sai}`);
const doi = await call(TQ, "PUT", "/api/ve/cai-dat", { tranLo: 2, version: cd.body.version });
assert.equal(doi.status, 200, JSON.stringify(doi.body));
assert.equal((await call(TQ, "PUT", "/api/ve/cai-dat", { tranLo: 3, version: cd.body.version })).status, 409, "phiên bản cũ thì thua");
assert.equal((await call(SALES, "GET", "/api/ve/kho")).body.tranLo, 2, "trang nhập lô đọc trần qua /api/ve/kho");
const soLoTruoc = Number((await sqlRows("SELECT count(*) AS n FROM vdt_batch"))[0].n);
const vuot = await call(SALES, "POST", "/api/ve/lo", { catalogCode: "ZVD1", nhomKhach: "ADULT", tenSanPham: "Vượt trần", soVeDuKien: 3 });
assert.equal(vuot.status, 400);
assert.equal(vuot.body.error.code, "batch_limit", JSON.stringify(vuot.body));
assert.equal(Number((await sqlRows("SELECT count(*) AS n FROM vdt_batch"))[0].n), soLoTruoc, "vượt trần không để lại lô dở");
const loTran = await moLo({ soVeDuKien: 2 });
assert.equal((await themVe(loTran, [veThu(21), veThu(22), veThu(23)])).status, 400, "ba ảnh một đợt vượt trần 2");
assert.equal((await themVe(loTran, [veThu(21), veThu(22)])).body.themDuoc, 2);
assert.equal((await themVe(loTran, [veThu(24)])).status, 400, "đợt sau cộng dồn với số vé đã có trong lô");
assert.equal((await call(TQ, "PUT", "/api/ve/cai-dat", { tranLo: 50, version: doi.body.version })).status, 200);
assert.equal(await demAudit("ve_doi_tran_lo"), 2, "mỗi lần đổi thắng đúng một dòng nhật ký; lần thua không ghi");
assert.match(JSON.stringify(await sqlRows("SELECT detail FROM audit_log WHERE action = 've_doi_tran_lo'")), /50 → 2/, "nhật ký ghi số cũ, số mới");

// 10. Bỏ lô đã vào kho: vé bị rút khỏi kho, ảnh còn lưu 3 ngày, bỏ lần hai 409; nhập lại ĐÚNG hai ảnh và hai mã đó vào lô mới được
const loBo = await moLo();
assert.equal((await themVe(loBo, [veThu(31), veThu(32)])).body.themDuoc, 2);
assert.equal((await call(SALES, "POST", `/api/ve/lo/${loBo}/xac-nhan`, {})).status, 200);
assert.equal(await conTrong(), 5);
const dsTruoc = (await call(SALES, "GET", "/api/ve/lo")).body.lo;
assert.equal(dsTruoc.find((l) => l.loId === loBo)?.soVe, 2);
assert.equal(dsTruoc.some((l) => l.loId === lo.body.loId), false, "lô từng giữ chỗ không hiện trong danh sách bỏ được");
const bo = await call(SALES, "POST", `/api/ve/lo/${loBo}/bo`, {});
assert.equal(bo.status, 200, JSON.stringify(bo.body));
assert.equal(bo.body.veDaRut, 2);
assert.equal(await conTrong(), 3, "vé của lô đã bỏ không còn đếm trong kho");
const hang = await sqlRows(`SELECT status, withdrawn_at, purged_at, r2_deleted_at FROM vdt_ticket WHERE batch_id = '${loBo}'`);
assert.equal(hang.length, 2);
for (const h of hang) { assert.equal(h.status, "VOID"); assert.ok(h.withdrawn_at && h.purged_at, `dòng vé sau Bỏ lô: ${JSON.stringify(h)}`); assert.equal(h.r2_deleted_at, null, "ảnh được lưu 3 ngày, chưa xoá ngay"); }
// Màn «Lô đã huỷ gần đây» đi qua gốc lắp ráp thật: tên người huỷ do `nhanNhanVien` được tiêm; chỉ 4 số cuối, không có gì để mở ảnh.
const daHuy = await call(SALES, "GET", "/api/ve/lo-da-huy");
assert.equal(daHuy.status, 200, JSON.stringify(daHuy.body));
const dongHuy = daHuy.body.lo.find((l) => l.loId === loBo);
assert.equal(dongHuy?.ve.length, 2, JSON.stringify(daHuy.body));
assert.ok(dongHuy.huyBoi, "gốc lắp ráp thật phải trả tên người huỷ");
assert.ok(!JSON.stringify(daHuy.body).includes(`E2E.${tag}.31`), "không lộ mã đầy đủ");
assert.equal((await call(SALES, "POST", `/api/ve/lo/${loBo}/bo`, {})).status, 409, "bỏ lần hai");
assert.equal(await demAudit("ve_bo_lo"), 1, "bỏ lần hai không ghi nhật ký");
assert.equal((await call(SALES, "GET", "/api/ve/lo")).body.lo.some((l) => l.loId === loBo), false);
const loLai = await moLo();
const lai = await themVe(loLai, [veThu(31), veThu(32)]);
assert.equal(lai.body.themDuoc, 2, JSON.stringify(lai.body));
assert.deepEqual(lai.body.loai, []);

// 10b. Mở ảnh của lô đã huỷ (chủ quyết 2/11/2026), đi qua kho R2 thật của wrangler: vé đã nhập lại thì ảnh cũ không mở được; vé chưa nhập lại thì mở được và bị khoá hẳn.
assert.equal((await call(SALES, "POST", `/api/ve/lo-da-huy/${dongHuy.ve[0].veId}/mo`, {})).status, 409, "vé đã nhập lại");
const loMo = await moLo();
assert.equal((await themVe(loMo, [veThu(41)])).body.themDuoc, 1);
assert.equal((await call(SALES, "POST", `/api/ve/lo/${loMo}/bo`, {})).status, 200);
const veMo = (await call(SALES, "GET", "/api/ve/lo-da-huy")).body.lo.find((l) => l.loId === loMo).ve[0];
assert.equal(veMo.trangThaiAnh, "CHUA_MO");
assert.equal((await call(SALES, "GET", `/api/ve/lo-da-huy/${veMo.veId}/anh`)).status, 409, "chưa mở thì chưa xem được");
const moAnh = await call(SALES, "POST", `/api/ve/lo-da-huy/${veMo.veId}/mo`, {});
assert.equal(moAnh.status, 200, JSON.stringify(moAnh.body));
assert.equal((await call(SALES, "GET", `/api/ve/lo-da-huy/${veMo.veId}/anh`)).status, 200);
const loNhapLaiMo = await moLo();
const nhapLaiMo = await themVe(loNhapLaiMo, [veThu(41)]);
assert.equal(nhapLaiMo.body.themDuoc, 0, JSON.stringify(nhapLaiMo.body));
assert.match(nhapLaiMo.body.loai[0].lyDo, /đã được mở ảnh/);
assert.equal((await call(SALES, "POST", `/api/ve/lo/${loNhapLaiMo}/bo`, {})).status, 200);

// 11. lô đã từng giữ chỗ (lô đầu, vé đã về kho sau khi huỷ đơn): không bỏ được, vì có thể đã lộ mã
assert.equal((await call(SALES, "POST", `/api/ve/lo/${lo.body.loId}/bo`, {})).status, 409);
assert.equal(await conTrong(), 3);

// 11b. ADR-0157: lô «Mọi loại khách» trên D1 thật (bảng lô đã được dựng lại khi wrangler áp migration): một lô đủ cho cả người lớn lẫn trẻ em
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZVD2','Vé dùng chung thử','perPax',100000,50000,NULL,NULL,NULL,NULL,NULL,97,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, price_child = excluded.price_child, in_sheet = 1`);
assert.equal((await call(await session(ACCOUNTS.admin), "POST", "/api/catalog/co-ve", { pham: "SERVICE", ma: "ZVD2", coVe: true })).status, 200);
const loChung = await call(SALES, "POST", "/api/ve/lo", { catalogCode: "ZVD2", nhomKhach: "ALL", tenSanPham: "Vé dùng chung e2e" });
assert.equal(loChung.status, 201, JSON.stringify(loChung.body));
const themChung = await call(SALES, "POST", `/api/ve/lo/${loChung.body.loId}/ve`, { ve: [71, 72, 73].map((i) => ({ noiDung: PNG(i), maVe: `E2E.${tag}.chung.${i}`, tuNgay: vnDate(-1), denNgay: den })) });
assert.equal(themChung.body.themDuoc, 3, JSON.stringify(themChung.body));
assert.equal((await call(SALES, "POST", `/api/ve/lo/${loChung.body.loId}/xac-nhan`, {})).status, 200);
const donChung = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `Khách Vé Chung ${tag}`, customerPhone: "0913571358", services: [catalogService({ catalogCode: "ZVD2", catalogPriceSeen: { adult: 100000, child: 50000 }, pax: { adult: 1, child: 1 }, departDate: vnDate(14) })] }));
assert.equal(donChung.status, 201, JSON.stringify(donChung.body));
assert.equal((await call(SALES, "POST", `/api/orders/${donChung.body.order.id}/status`, { status: "confirmed" })).status, 200);
const suatChung = await sqlRows(`SELECT pax_group FROM vdt_allocation WHERE order_id = '${donChung.body.order.id}' AND released_at IS NULL ORDER BY pax_group`);
assert.deepEqual(suatChung.map((r) => r.pax_group), ["ADULT", "CHILD"]);
const khoChung = (await call(SALES, "GET", "/api/ve/kho")).body.kho.find((d) => d.catalogCode === "ZVD2");
assert.deepEqual([khoChung.nhomKhach, khoChung.conTrong, khoChung.daGiu], ["ALL", 1, 2]);

// 11b. ADR-0174: đơn đã xác nhận trên dịch vụ chưa khai ô «Có vé» không báo thiếu vé (D1 thật); bật ô thì báo đúng, tắt lại thì hết
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZVD3','Dịch vụ không vé thử','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,98,1,${AT},${AT})
  ON CONFLICT(code) DO UPDATE SET name = excluded.name, price_adult = excluded.price_adult, in_sheet = 1`);
const donKhongVe = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `Khách Không Vé ${tag}`, customerPhone: "0913571359", services: [catalogService({ catalogCode: "ZVD3", catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: vnDate(14) })] }));
assert.equal(donKhongVe.status, 201, JSON.stringify(donKhongVe.body));
assert.equal((await call(SALES, "POST", `/api/orders/${donKhongVe.body.order.id}/status`, { status: "confirmed" })).status, 200);
const nhomKhongVe = async () => (await call(SALES, "GET", `/api/ve/don/${donKhongVe.body.order.id}`)).body.dichVu.flatMap((d) => d.nhom);
const coZvd3 = (await call(QT, "GET", "/api/catalog/co-ve")).body.dichVu.find((d) => d.code === "ZVD3");
if (coZvd3.coVe) assert.equal((await call(QT, "POST", "/api/catalog/co-ve", { pham: "SERVICE", ma: "ZVD3", coVe: false })).status, 200); // chạy lại trên cùng D1
assert.deepEqual(await nhomKhongVe(), []);
assert.equal((await call(QT, "POST", "/api/catalog/co-ve", { pham: "SERVICE", ma: "ZVD3", coVe: true })).status, 200);
assert.deepEqual((await nhomKhongVe()).map((n) => [n.can, n.giu, n.thieu]), [[2, 0, 2]]);
assert.equal((await call(QT, "POST", "/api/catalog/co-ve", { pham: "SERVICE", ma: "ZVD3", coVe: false })).status, 200);
assert.deepEqual(await nhomKhongVe(), []);
assert.equal((await call(SALES, "POST", "/api/catalog/co-ve", { pham: "SERVICE", ma: "ZVD3", coVe: true })).status, 403);

// 11c. ADR-0170 Đ1 + Đ3 trên API THẬT: đối tác xem và gửi vé của đơn MÌNH lập, sau khi Kế toán ghi tiền về công ty; đơn người khác không mở; đã mở vé thì không tự huỷ.
{
  const TQ2 = await session(ACCOUNTS.superAdmin);
  const taoDoiTac = async (ten) => {
    const t = await call(TQ2, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `${ten} ${tag}`, phone: randomPhone(), roles: ["COLLABORATOR"] });
    assert.equal(t.status, 201, JSON.stringify(t.body));
    return (await login(t.body.staff.phone, t.body.pin)).cookie;
  };
  const DT = await taoDoiTac("Đối Tác Vé E2E");
  const DT2 = await taoDoiTac("Đối Tác Khác Vé E2E");
  // thêm 6 vé riêng cho đoạn này: ba đơn × 2 khách, không phụ thuộc số vé còn lại của các ca trên
  const loDT = await moLo();
  assert.equal((await themVe(loDT, [81, 82, 83, 84, 85, 86].map((n) => veThu(n, `E2E.${tag}.dt.${n}`)))).body.themDuoc, 6);
  assert.equal((await call(SALES, "POST", `/api/ve/lo/${loDT}/xac-nhan`, {})).status, 200);
  const donDoiTac = async () => {
    const r = await call(DT, "POST", "/api/orders", orderInput({ customerName: `Khách Vé Đối Tác ${tag}`, customerPhone: "0913571359", services: [catalogService({ catalogCode: "ZVD1", catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: vnDate(14) })] }));
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const g = await call(DT, "POST", `/api/orders/${r.body.order.id}/gui-don`, {});
    assert.equal(g.status, 200, JSON.stringify(g.body));
    return { id: r.body.order.id, total: r.body.order.total };
  };
  const ghiThu = (cookie, d, nguoiThu) => call(cookie, "POST", `/api/orders/${d.id}/payments`, { soTien: d.total, hinhThuc: "CASH", nguoiThu });
  const daDM = await donDoiTac();
  const phanBoDM = await sqlRows(`SELECT id FROM vdt_allocation WHERE order_id = '${daDM.id}' AND released_at IS NULL`);
  assert.equal(phanBoDM.length, 2, "đơn đối tác giữ 2 vé");
  // tự ghi «Tôi thu» đủ tiền: vẫn khoá (Đ2)
  assert.equal((await ghiThu(DT, daDM, "toi")).status, 201);
  const khoa = await call(DT, "GET", `/api/ve/don/${daDM.id}`);
  assert.equal(khoa.status, 200, JSON.stringify(khoa.body));
  assert.equal(khoa.body.thuDu, false);
  assert.equal((await call(DT, "POST", "/api/ve/duong-dan", { orderId: daDM.id })).status, 403);
  // đơn khác: Kế toán ghi thẳng «Công ty thu» đủ tiền (tiền đã về công ty) ⇒ đối tác mở được
  const daKT = await donDoiTac();
  assert.equal((await ghiThu(KT, daKT, "cong_ty")).status, 201);
  const mo = await call(DT, "GET", `/api/ve/don/${daKT.id}`);
  assert.equal(mo.status, 200, JSON.stringify(mo.body));
  assert.equal(mo.body.thuDu, true);
  assert.equal(mo.body.veXem.length, 2);
  assert.doesNotMatch(JSON.stringify(mo.body), new RegExp(`E2E\\.${tag}|vdt/`));
  assert.equal((await call(DT, "GET", `/api/ve/anh/${mo.body.veXem[0].id}`)).status, 200, "đối tác mở ảnh vé đơn mình");
  assert.equal((await call(DT, "POST", "/api/ve/giao", { orderId: daKT.id, requestId: crypto.randomUUID() })).status, 200);
  const dd = await call(DT, "POST", "/api/ve/duong-dan", { orderId: daKT.id });
  assert.equal(dd.status, 200, JSON.stringify(dd.body));
  assert.equal((await call(DT, "POST", `/api/ve/duong-dan/${dd.body.id}/thu-hoi`, {})).status, 200);
  assert.equal((await call(DT, "POST", "/api/ve/cap", { orderId: daKT.id })).status, 200);
  // nộp MỘT PHẦN không mở vé (sửa sau người kiểm độc lập): đối tác ghi «Công ty thu» đủ tiền, Kế toán ghi nộp 1.000 ₫ ⇒ vẫn khoá; nộp đủ ⇒ mở
  const daNop = await donDoiTac();
  assert.equal((await ghiThu(DT, daNop, "cong_ty")).status, 201);
  const partyDT = (await sqlRows(`SELECT s.party_id AS p FROM orders o JOIN staff s ON s.id = o.staff_id WHERE o.id = '${daNop.id}'`))[0].p;
  const nopTien = (soTien) => call(KT, "POST", "/api/ledger/settlements", { chieu: "nop", partyId: partyDT, phanBo: [{ orderId: daNop.id, soTien }] });
  assert.equal((await call(DT, "GET", `/api/ve/don/${daNop.id}`)).body.thuDu, false, "chưa nộp");
  assert.equal((await nopTien(1000)).status, 201);
  const mot = await call(DT, "GET", `/api/ve/don/${daNop.id}`);
  assert.equal(mot.body.thuDu, false, "nộp một phần vẫn khoá");
  assert.deepEqual(mot.body.veXem, []);
  assert.equal((await nopTien(daNop.total - 1000)).status, 201);
  assert.equal((await call(DT, "GET", `/api/ve/don/${daNop.id}`)).body.thuDu, true, "nộp đủ thì mở");
  // đơn người khác: đối tác khác không thấy, không mở ảnh; kho vé đóng với đối tác
  for (const r of [await call(DT2, "GET", `/api/ve/don/${daKT.id}`), await call(DT2, "GET", `/api/ve/anh/${mo.body.veXem[0].id}`), await call(DT2, "POST", "/api/ve/duong-dan", { orderId: daKT.id })]) {
    assert.ok(r.status === 403 || r.status === 404, `đối tác khác: ${r.status}`);
  }
  assert.equal((await call(DT, "GET", "/api/ve/kho")).status, 403);
  // Đ3: đã mở vé thì đối tác không tự huỷ (409, đơn giữ nguyên); Quản trị huỷ được
  const huyDT = await call(DT, "POST", `/api/orders/${daKT.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
  assert.equal(huyDT.status, 409, JSON.stringify(huyDT.body));
  assert.equal((await sqlRows(`SELECT status FROM orders WHERE id = '${daKT.id}'`))[0].status, "confirmed");
  const ct = await call(DT, "GET", `/api/orders/${daKT.id}`);
  assert.equal(ct.body.coVeDaMo, true);
  assert.equal((await call(QT, "POST", `/api/orders/${daKT.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" })).status, 200);
  // đơn CHƯA mở vé: đối tác huỷ được
  assert.equal((await call(DT, "POST", `/api/orders/${daDM.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" })).status, 200);

  // ADR-0171 Đ2: đường dẫn khách — số khách 2→4 chưa thu thêm thì chỉ thấy 2 vé đã mở; ảnh vé 3 không trả; thu đủ phần tăng thì thấy 4, vé 1 giữ nguyên số
  const loLink = await moLo();
  assert.equal((await themVe(loLink, [91, 92, 93, 94].map((n) => veThu(n, `E2E.${tag}.lk.${n}`)))).body.themDuoc, 4);
  assert.equal((await call(SALES, "POST", `/api/ve/lo/${loLink}/xac-nhan`, {})).status, 200);
  const daLink = await donDoiTac();
  assert.equal((await ghiThu(KT, daLink, "cong_ty")).status, 201);
  const dl = await call(DT, "POST", "/api/ve/duong-dan", { orderId: daLink.id });
  assert.equal(dl.status, 200, JSON.stringify(dl.body));
  const tokenLink = String(dl.body.duongDan).replace("/ve/", "");
  const dichVuLink = (await sqlRows(`SELECT id FROM order_service WHERE order_id = '${daLink.id}'`))[0].id;
  const tang = await call(QT, "POST", `/api/orders/${daLink.id}/money-edit`, { lyDo: "THEM_NGUOI", services: [{ id: dichVuLink, pax: { adult: 4, child: 0, senior: 0, infant: 0 } }] });
  assert.equal(tang.status, 200, JSON.stringify(tang.body));
  const giu = Number((await sqlRows(`SELECT count(*) AS n FROM vdt_allocation WHERE order_id = '${daLink.id}' AND released_at IS NULL`))[0].n);
  assert.equal(giu, 4, "tăng khách thì cấp thêm 2 vé");
  const slotTrang = (t) => [...t.matchAll(/\/anh\/(\d+)"/g)].map((m) => Number(m[1]));
  const layTrang = async () => { const r = await fetch(`${BASE}/ve/${tokenLink}`, { headers: { "cf-connecting-ip": `198.51.100.${Math.floor(Math.random() * 200) + 1}` } }); return { status: r.status, text: await r.text() }; };
  const trangKhach = await layTrang();
  assert.equal(trangKhach.status, 200);
  assert.deepEqual(slotTrang(trangKhach.text), [1, 2]);
  assert.match(trangKhach.text, /Còn 2 vé chưa sẵn sàng/);
  assert.equal((await call(undefined, "GET", `/api/ve-khach/${tokenLink}/anh/3`)).status, 404);
  assert.equal(Number((await sqlRows(`SELECT count(*) AS n FROM vdt_allocation WHERE order_id = '${daLink.id}' AND released_at IS NULL AND revealed_at IS NOT NULL`))[0].n), 2, "vé 3, 4 chưa đóng dấu lộ");
  assert.equal((await call(undefined, "GET", `/api/ve-khach/${tokenLink}/anh/1`)).status, 200, "vé đã mở vẫn tải được dù đơn đang thiếu tiền");
  const tongMoi = (await call(QT, "GET", `/api/orders/${daLink.id}`)).body.order.total;
  const chenh = tongMoi - daLink.total;
  assert.ok(chenh > 0);
  // hai khoản KHÁC số tiền khoản đầu: tăng 2→4 khách thì phần thêm bằng đúng khoản đầu và bị cảnh báo «có thể trùng» (409 co_the_trung)
  for (const soTien of [chenh - 1000, 1000]) { const t = await call(KT, "POST", `/api/orders/${daLink.id}/payments`, { soTien, hinhThuc: "CASH", nguoiThu: "cong_ty" }); assert.equal(t.status, 201, JSON.stringify(t.body)); }
  assert.deepEqual(slotTrang((await layTrang()).text), [1, 2, 3, 4]);
  assert.equal((await call(undefined, "GET", `/api/ve-khach/${tokenLink}/anh/3`)).status, 200);
}

// 12. nhật ký không chứa mã vé
const nk =JSON.stringify(await sqlRows(`SELECT detail, target_id FROM audit_log WHERE action LIKE 've_%'`));
assert.doesNotMatch(nk, new RegExp(`E2E\\.${tag}|vdt/`));
console.log("ve-dien-tu e2e: ĐẠT");
