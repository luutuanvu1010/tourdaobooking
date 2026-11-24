// ẢNH BÀN GIAO (ADR-0232) trên API THẬT (wrangler dev, D1 local tạm, kho R2 cục bộ ANH_BAN_GIAO): chưa có chính sách ghi số năm ⇒ 409 no_photo_policy → Toàn quyền
// đăng chính sách THỬ có số năm giữ ảnh → Bán hàng gửi ảnh vào đơn đã xác nhận 201 (JPEG sạch; JPEG còn Exif 415) → Kế toán xem danh sách + ảnh lớn (no-store),
// Đối tác / HDV không phụ trách 403 → Toàn quyền ẩn (Quản trị 403), xoá ảnh lọt giấy tờ 200, HET_HAN trước hạn 409 → nhật ký không chép khoá kho, ghi chú.
// Đứng CUỐI danh sách (tests/e2e/danh-sach.mjs): đăng một bản chính sách riêng tư THỬ mới — các kịch bản tự khai / xoá / đăng ký tự đăng bản của mình trước khi dùng.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, gieoTaiKhoanLai, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const SUPER = await session(ACCOUNTS.superAdmin);
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const FIELD = await session(ACCOUNTS.field);
const tag = Date.now().toString(36);
const DT = (await gieoTaiKhoanLai(`Đối tác ảnh bàn giao ${tag}`, ["PARTNER"])).cookie;

function jpeg(exif = false) {
  const b = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  if (exif) b.push(0xff, 0xe1, 0x00, 0x0e, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8);
  b.push(0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0, 0x22, 0x22, 0x22, 0xff, 0xd9);
  return Buffer.from(b).toString("base64");
}
const than = (o = {}) => ({ anhNho: jpeg(), anhXem: jpeg(), loaiViec: "GIAO_KHACH", ghiChu: `Ghi chú thử ${tag}`, ...o });

const lap = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `Khách Ảnh Bàn Giao ${tag}`, customerPhone: "0913570001", services: [catalogService({ departDate: vnDate(5) })] }));
assert.equal(lap.status, 201, JSON.stringify(lap.body));
const id = lap.body.order.id;
const xn = await call(SALES, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
assert.equal(xn.status, 200, JSON.stringify(xn.body));

// Bản chính sách hiện hành (của kịch bản trước) chưa ghi số năm ⇒ không nhận ảnh.
const cs = await call(SUPER, "GET", "/api/parties/cua-toi");
if (cs.body.chinhSach?.soNamGiuAnh == null) {
  const r0 = await call(SALES, "POST", `/api/anh-ban-giao/don/${id}`, than());
  assert.equal(r0.status, 409, JSON.stringify(r0.body));
  assert.equal(r0.body.error.code, "no_photo_policy");
  console.log("✓ chính sách hiện hành chưa ghi số năm giữ ảnh ⇒ 409 no_photo_policy");
}
const dang = await call(SUPER, "POST", "/api/parties/chinh-sach-rieng-tu", { mucDich: `THỬ ảnh bàn giao ${tag}`, noiDung: `THỬ — toàn văn ảnh bàn giao ${tag}, không phải văn bản pháp lý.`, soNamGiuAnh: 5 });
assert.equal(dang.status, 201, JSON.stringify(dang.body));

let r = await call(SALES, "POST", `/api/anh-ban-giao/don/${id}`, than({ anhXem: jpeg(true) }));
assert.equal(r.status, 415, JSON.stringify(r.body));
r = await call(SALES, "POST", `/api/anh-ban-giao/don/${id}`, than());
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.daLuu, true, "kho cục bộ nhận ảnh");
const a1 = r.body.id;
const a2 = (await call(SALES, "POST", `/api/anh-ban-giao/don/${id}`, than())).body.id;
const dong = (await sqlRows(`SELECT thumb_key, view_key, stored_at, retain_until, created_at FROM abg_photo WHERE id = '${a1}'`))[0];
assert.ok(/^abg\/[0-9a-f]{32}$/.test(dong.thumb_key) && dong.stored_at, JSON.stringify(dong));
assert.equal(Number(dong.retain_until.slice(0, 4)), Number(dong.created_at.slice(0, 4)) + 5, "hạn giữ = giờ tải + 5 năm");
console.log("✓ JPEG còn Exif 415; Bán hàng gửi 2 ảnh 201, đã lưu kho, hạn giữ theo chính sách");

const ds = await call(ACC, "GET", `/api/anh-ban-giao/don/${id}`);
assert.equal(ds.status, 200);
assert.equal(ds.body.anh.length, 2);
assert.doesNotMatch(JSON.stringify(ds.body), /abg\//);
const x = await call(ACC, "GET", `/api/anh-ban-giao/anh/${a1}`);
assert.equal(x.status, 200);
assert.equal(x.headers.get("content-type"), "image/jpeg");
assert.equal(x.headers.get("cache-control"), "no-store");
for (const [ten, c] of [["Đối tác", DT], ["HDV không phụ trách", FIELD]]) {
  assert.equal((await call(c, "GET", `/api/anh-ban-giao/anh/${a1}`)).status, 403, ten);
  assert.equal((await call(c, "POST", `/api/anh-ban-giao/don/${id}`, than())).status, 403, ten);
}
console.log("✓ Kế toán xem danh sách + ảnh lớn (image/jpeg, no-store); Đối tác, HDV không phụ trách 403 cả xem lẫn gửi");

assert.equal((await call(ADM, "POST", `/api/anh-ban-giao/anh/${a1}/an`, { lyDo: "Chụp nhầm đơn" })).status, 403);
assert.equal((await call(SUPER, "POST", `/api/anh-ban-giao/anh/${a1}/an`, { lyDo: "Chụp nhầm đơn" })).status, 200);
assert.equal((await call(ACC, "GET", `/api/anh-ban-giao/anh/${a1}`)).status, 404, "ảnh đã ẩn biến khỏi Kế toán");
const hh = await call(SUPER, "POST", `/api/anh-ban-giao/anh/${a2}/xoa`, { lyDo: "HET_HAN", ghiChu: "Thử xoá trước hạn" });
assert.equal(hh.status, 409, JSON.stringify(hh.body));
assert.equal((await call(SUPER, "POST", `/api/anh-ban-giao/anh/${a2}/xoa`, { lyDo: "GIAY_TO_CHUP_NHAM", ghiChu: "Lọt căn cước của khách" })).status, 200);
assert.ok((await sqlRows(`SELECT r2_deleted_at FROM abg_photo WHERE id = '${a2}'`))[0].r2_deleted_at, "kho đã xoá");
console.log("✓ Quản trị 403; Toàn quyền ẩn 200 (Kế toán không còn thấy); xoá HET_HAN trước hạn 409; ảnh lọt giấy tờ xoá ngay 200, kho đã xoá");

const nk = await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action LIKE 'handover_photo_%' AND (detail LIKE '%abg/%' OR detail LIKE '%Ghi chú thử%' OR detail LIKE '%Chụp nhầm đơn%')`);
assert.equal(nk[0].n, 0, "nhật ký không chép khoá kho, ghi chú, lý do ẩn");
console.log("✓ nhật ký Ảnh bàn giao không chép khoá kho, ghi chú, lý do ẩn");
