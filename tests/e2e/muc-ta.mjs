// Mức TA dùng chung (ADR-0117 lần 2; migration 0096 + 0097; kế hoạch docs/superpowers/plans/2026-10-14-adr-0117-lan-2-ke-hoach.md, Task 5) trên D1 local THẬT (wrangler dev):
//  1) Kế toán tạo mức «Đại lý cấp 1 …» ⇒ 201 + Location /hoa-hong (mã MT_ + 8 chữ do máy chủ sinh); trùng tên (khác dấu / hoa thường) ⇒ 409 muc_trung; Bán hàng ghi 403, đọc 200; HDV đọc 403;
//  2) Kế toán thêm dòng cho mức: dịch vụ ZE1 15% (thay «Du thuyền 15%» của kế hoạch: danh mục giả của e2e chỉ có ZE1/ZE2, không có nhóm Du thuyền) ⇒ dòng mang đối tượng «Mức TA» + tên mức;
//  3) gắn loại MỚI (dùng một lần, không có dòng riêng) vào mức từ hôm qua ⇒ 201, `dongRieng` rỗng; Bán hàng «Thử tra» ⇒ bậc 7 + tên mức + 15%;
//  4) Bán hàng lập đơn A với bên đặt là tổ chức mang loại đó, xác nhận ⇒ bản chụp AUTO/SET 1500 trỏ ĐÚNG dòng của mức (đối chiếu SQL);
//  5) đổi mức (ADR-0148 Q4 — đơn A đã chụp HÔM NAY nên đổi chỉ áp từ NGÀY MAI): kết thúc gắn cũ tới hôm qua ⇒ 400 câu tiếng Việt (không đóng lùi qua ngày đơn đã chụp);
//     kết thúc tới hôm nay ⇒ 200, lần hai cùng ngày ⇒ 400; gắn «Đại lý cấp 2 …» (10%) từ ngày mai ⇒ Thử tra ngày mai ra dòng của mức mới; đơn B xác nhận HÔM NAY vẫn theo
//     mức cũ 15%; đơn A GIỮ nguyên bản chụp (SQL trước / sau) và hoa hồng. (Đơn xác nhận ngày mai theo mức mới: bài máy chủ N-13 / SV-TA-03 chạy đồng hồ giả.)
//  6) cảnh báo N-17: loại thứ hai còn dòng riêng «mọi dịch vụ» 8% ⇒ gắn vào mức vẫn 201 (không chặn) và `dongRieng` có đúng dòng đó;
//  7) tắt mức ⇒ gắn mới 409 muc_tat, thêm dòng 409 muc_tat; dòng / gắn đang có vẫn áp (Thử tra loại cũ vẫn bậc 7); bật lại ⇒ gắn được; mọi câu lỗi không lộ mã thô.
// Dùng accountant / admin / salesA / field (không đổi tài khoản dùng chung). Tên loại, tên mức và hồ sơ dùng một lần (hậu tố chữ suy từ Date.now() — tên không được chứa dãy ≥ 8 chữ số;
// `name_key` của mức là UNIQUE nên tên cố định sẽ 409 khi chạy lại trên cùng D1). KHÔNG gắn mức cho vai có sẵn (TRAVEL_AGENCY…): dòng riêng 10% của «so-dai-ly» sẽ thắng ở bậc 6 và
// làm bẩn kịch bản sau. KHÔNG đổi công ty chủ, KHÔNG đụng tài khoản của `passkey`.
import assert from "node:assert/strict";
import { ACCOUNTS, FAKE_CATALOG, call, catalogService, ensureFakeCatalog, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ACC = await session(ACCOUNTS.accountant);
const ADM = await session(ACCOUNTS.admin);
const A = await session(ACCOUNTS.salesA);
const F = await session(ACCOUNTS.field);
const HOM_NAY = vnDate(0);
const HOM_QUA = vnDate(-1);
const CHU = String(Date.now()).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // hậu tố chỉ gồm chữ
const TEN_TA1 = `Đại lý cấp 1 ${CHU}`;
const TEN_TA2 = `Đại lý cấp 2 ${CHU}`;
const maLoi = (r) => r.body?.error?.code;
const thongBao = (r) => r.body?.error?.message ?? "";
const lamTronNuaLen = (tu, mau) => Math.floor((2 * tu + mau) / (2 * mau));
const MA_THO = /\b(MT_[A-Z]{8}|LD_[A-Z]{8}|muc_trung|muc_tat|prc_\w+|stale|invalid_input|forbidden)\b/;
const phai = (r, status, nhan) => {
  assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
};

const congTyTruoc = (await sqlRows("SELECT party_id FROM v_pty_owner_company")).map((x) => x.party_id);
assert.equal(congTyTruoc.length, 1, "D1 phải có đúng một công ty chủ");

// ---- dựng: hai loại mới (dùng một lần) + hai hồ sơ tổ chức mang chúng
const themLoai = async (ten) => phai(await call(ACC, "POST", "/api/pricing/loai-doi-tac", { ten }), 201, `thêm loại ${ten}`).loai.code;
const LOAI = await themLoai(`Lễ tân cấp ${CHU}`);
const LOAI2 = await themLoai(`Nhân viên tour ${CHU}`);
const taoToChuc = async (ten, loai) => {
  const p = phai(await call(ACC, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: ten }), 201, `Kế toán tạo hồ sơ tổ chức ${ten}`).party;
  phai(await call(ADM, "POST", `/api/parties/${p.id}/roles`, { roleTypeCode: loai }), 201, "Quản trị gắn loại cho hồ sơ");
  return p;
};
const ORG = await taoToChuc(`Khách sạn Biển Xanh E2E ${CHU}`, LOAI);
const ORG2 = await taoToChuc(`Lữ hành Sao Biển E2E ${CHU}`, LOAI2);

// ---- 1) Tạo mức
let r = await call(ACC, "POST", "/api/pricing/muc-ta", { ten: TEN_TA1 });
phai(r, 201, "Kế toán tạo mức");
assert.equal(r.headers.get("location"), "/hoa-hong");
const TA1 = r.body.muc.code;
assert.match(TA1, /^MT_[A-Z]{8}$/);
assert.deepEqual(r.body.muc, { code: TA1, ten: TEN_TA1, dangBat: true, dong: [], gan: [] });
r = await call(ACC, "POST", "/api/pricing/muc-ta", { ten: TEN_TA1.toLowerCase().replace("đại lý cấp", "dai ly cap") });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(maLoi(r), "muc_trung");
assert.doesNotMatch(thongBao(r), MA_THO, "câu báo trùng không lộ mã thô");
assert.equal((await call(A, "POST", "/api/pricing/muc-ta", { ten: `Mức của Bán hàng ${CHU}` })).status, 403, "Bán hàng không tạo mức được");
assert.equal((await call(A, "GET", "/api/pricing/muc-ta")).status, 200, "Bán hàng xem được");
assert.equal((await call(F, "GET", "/api/pricing/muc-ta")).status, 403, "Hướng dẫn viên không xem được");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'prc_rate_tier_added' AND detail = '${TEN_TA1}'`))[0].n, 1, "một dòng nhật ký tạo mức, lần trùng không ghi");
console.log("✓ 1) Kế toán tạo mức «Đại lý cấp 1 …» ⇒ 201 + Location /hoa-hong (mã MT_ do máy chủ sinh); trùng tên khác dấu ⇒ 409 muc_trung; Bán hàng ghi 403 / đọc 200; HDV 403; một dòng nhật ký");

// ---- 2) Thêm dòng cho mức: dịch vụ ZE1 15% từ hôm qua
r = await call(ACC, "POST", `/api/pricing/muc-ta/${TA1}/dong`, { phamVi: "SERVICE", catalogCode: "ZE1", kieu: "RATE", tyLeBp: 1500, tuNgay: HOM_QUA });
phai(r, 201, "thêm dòng cho mức");
const DONG_TA1 = r.body.dong;
assert.deepEqual([DONG_TA1.doiTuong, DONG_TA1.phamVi, DONG_TA1.catalogCode, DONG_TA1.tyLeBp], [{ loai: "MUC", code: TA1, ten: TEN_TA1 }, "SERVICE", "ZE1", 1500]);
assert.equal((await call(A, "POST", `/api/pricing/muc-ta/${TA1}/dong`, { phamVi: "ALL", kieu: "RATE", tyLeBp: 100, tuNgay: HOM_NAY })).status, 403, "Bán hàng không thêm dòng được");
console.log("✓ 2) Kế toán thêm dòng «Dịch vụ ZE1 · 15%» cho mức ⇒ 201, đối tượng = Mức TA + tên mức; Bán hàng 403");

// ---- 3) Gắn loại vào mức (loại mới không có dòng riêng ⇒ không cảnh báo); Thử tra
r = await call(ACC, "POST", "/api/pricing/muc-ta/gan", { loai: LOAI, muc: TA1, tuNgay: HOM_QUA });
phai(r, 201, "gắn loại vào mức");
assert.equal(r.headers.get("location"), "/hoa-hong");
const GAN1 = r.body.gan;
assert.deepEqual([GAN1.loai.code, GAN1.muc.code, GAN1.muc.ten, GAN1.tuNgay, GAN1.denNgay, GAN1.conHieuLuc], [LOAI, TA1, TEN_TA1, HOM_QUA, null, true]);
assert.deepEqual(r.body.dongRieng, [], "loại mới không còn dòng riêng ⇒ không cảnh báo");
const thuTra = async (doiTac) => phai(await call(A, "GET", `/api/pricing/thu-tra?doiTac=${doiTac}&dichVu=ZE1&ngay=${HOM_NAY}`), 200, "thử tra");
let t = await thuTra(ORG.id);
assert.deepEqual([t.ketQua.trangThai, t.ketQua.bac, t.ketQua.muc.id, t.ketQua.muc.doiTuong.ten, t.ketQua.muc.tyLeBp], ["SET", 7, DONG_TA1.id, TEN_TA1, 1500], JSON.stringify(t));
console.log("✓ 3) Gắn loại mới vào mức từ hôm qua ⇒ 201 + Location, dongRieng rỗng; Thử tra (Bán hàng) ⇒ bậc 7, dòng của mức, tên mức, 15%");

// ---- 4) Đơn A: xác nhận ⇒ bản chụp theo mức TA
const lapDon = async (bookerPartyId) => phai(await call(A, "POST", "/api/orders", orderInput({ customerName: "Khách Mức TA E2E", customerPhone: "0901 234 567", bookerPartyId, services: [catalogService({ pax: { adult: 2 }, departDate: vnDate(10) })] })), 201, "lập đơn").order;
const xacNhan = async (id) => phai(await call(A, "POST", `/api/orders/${id}/status`, { status: "confirmed" }), 200, "xác nhận");
const thuongMai = async (id) => phai(await call(A, "GET", `/api/orders/${id}/thuong-mai`), 200, "thương mại").vanPhong;
const banChup = async (orderId) => sqlRows(`SELECT t.id, t.order_service_id AS sid, t.beneficiary_party_id AS ben, t.commission_status AS st, t.commission_rate_bp AS bp, t.commission_rule_id AS rule, t.source
  FROM ord_service_terms t WHERE t.order_id = '${orderId}' AND NOT EXISTS (SELECT 1 FROM ord_service_terms n WHERE n.supersedes_id = t.id) ORDER BY t.order_service_id`);
const thanhTien = FAKE_CATALOG.ZE1.prices.adult * 2;
const donA = await lapDon(ORG.id);
await xacNhan(donA.id);
const chupA = await banChup(donA.id);
assert.equal(chupA.length, 1);
assert.deepEqual([chupA[0].source, chupA[0].st, chupA[0].bp, chupA[0].rule, chupA[0].ben], ["AUTO", "SET", 1500, DONG_TA1.id, ORG.id]);
const hhA = lamTronNuaLen(1500 * thanhTien, 10000);
let vp = await thuongMai(donA.id);
assert.deepEqual([vp.tong.thanhTien, vp.tong.hoaHong, vp.tong.giaDaiLy], [thanhTien, hhA, thanhTien - hhA]);
console.log(`✓ 4) Đơn A (bên đặt mang loại gắn mức) xác nhận ⇒ bản chụp AUTO/SET 1500 trỏ đúng dòng của mức; hoa hồng ${hhA.toLocaleString("vi-VN")}đ`);

// ---- 5) Đổi mức sau khi đơn A đã chụp hôm nay ⇒ chỉ áp từ ngày mai; đơn B hôm nay theo mức cũ, đơn A giữ
const TA2 = phai(await call(ACC, "POST", "/api/pricing/muc-ta", { ten: TEN_TA2 }), 201, "tạo mức 2").muc.code;
const DONG_TA2 = phai(await call(ACC, "POST", `/api/pricing/muc-ta/${TA2}/dong`, { phamVi: "SERVICE", catalogCode: "ZE1", kieu: "RATE", tyLeBp: 1000, tuNgay: HOM_QUA }), 201, "dòng mức 2").dong;
// cùng ngày: gắn mức 2 khi gắn cũ còn mở ⇒ chồng ngày, 409 (một loại một mức tại một ngày)
r = await call(ACC, "POST", "/api/pricing/muc-ta/gan", { loai: LOAI, muc: TA2, tuNgay: HOM_NAY });
assert.equal(r.status, 409, `gắn chồng ngày phải 409: ${JSON.stringify(r.body)}`);
assert.doesNotMatch(thongBao(r), MA_THO);
r = await call(ACC, "POST", `/api/pricing/muc-ta/gan/${GAN1.id}/ket-thuc`, { denNgay: HOM_QUA });
assert.equal(r.status, 400, `kết thúc gắn cũ tới hôm qua sau khi đơn A chụp hôm nay ⇒ 400: ${JSON.stringify(r.body)}`);
assert.match(thongBao(r), /^Đã có đơn dùng mức này tới ngày .* — ngày kết thúc sớm nhất là /);
assert.doesNotMatch(thongBao(r), MA_THO);
r = await call(ACC, "POST", `/api/pricing/muc-ta/gan/${GAN1.id}/ket-thuc`, { denNgay: HOM_NAY });
phai(r, 200, "kết thúc gắn cũ tới hôm nay");
assert.deepEqual([r.body.gan.denNgay, r.body.gan.conHieuLuc], [HOM_NAY, true]);
assert.equal((await call(ACC, "POST", `/api/pricing/muc-ta/gan/${GAN1.id}/ket-thuc`, { denNgay: HOM_NAY })).status, 400, "kết thúc lần hai cùng ngày ⇒ 400");
phai(await call(ACC, "POST", "/api/pricing/muc-ta/gan", { loai: LOAI, muc: TA2, tuNgay: vnDate(1) }), 201, "gắn mức mới từ ngày mai");
t = await thuTra(ORG.id);
assert.deepEqual([t.ketQua.bac, t.ketQua.muc.id], [7, DONG_TA1.id], "hôm nay vẫn theo mức cũ");
const traMai = phai(await call(A, "GET", `/api/pricing/thu-tra?doiTac=${ORG.id}&dichVu=ZE1&ngay=${vnDate(1)}`), 200, "thử tra ngày mai");
assert.deepEqual([traMai.ketQua.bac, traMai.ketQua.muc.id, traMai.ketQua.muc.doiTuong.ten], [7, DONG_TA2.id, TEN_TA2], "ngày mai theo mức mới");
const donB = await lapDon(ORG.id);
await xacNhan(donB.id);
const chupB = await banChup(donB.id);
assert.deepEqual([chupB[0].st, chupB[0].bp, chupB[0].rule], ["SET", 1500, DONG_TA1.id], "đơn B xác nhận hôm nay theo mức cũ");
assert.deepEqual(await banChup(donA.id), chupA, "đơn A GIỮ nguyên bản chụp (SQL trước / sau)");
vp = await thuongMai(donA.id);
assert.equal(vp.tong.hoaHong, hhA, "hoa hồng đơn A không đổi");
console.log("✓ 5) Đổi mức sau khi đơn A chụp hôm nay (gắn chồng ngày 409; kết thúc tới hôm qua 400; tới hôm nay 200, lần hai 400; mức 2 từ ngày mai) ⇒ Thử tra ngày mai ra mức 2; đơn B hôm nay 15% mức cũ; đơn A giữ nguyên bản chụp và hoa hồng");

// ---- 6) Cảnh báo N-17: loại còn dòng riêng ⇒ gắn vẫn 201, dongRieng có đúng dòng đó
const RIENG = phai(await call(ACC, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code: LOAI2 }, phamVi: "ALL", kieu: "RATE", tyLeBp: 800, tuNgay: HOM_NAY }), 201, "dòng riêng loại 2").dong;
r = await call(ACC, "POST", "/api/pricing/muc-ta/gan", { loai: LOAI2, muc: TA1, tuNgay: HOM_NAY });
phai(r, 201, "gắn loại còn dòng riêng: KHÔNG chặn");
assert.deepEqual(r.body.dongRieng.map((d) => d.id), [RIENG.id], "cảnh báo liệt kê đúng dòng riêng");
const GAN_L2 = r.body.gan;
t = await thuTra(ORG2.id);
assert.deepEqual([t.ketQua.bac, t.ketQua.muc.id], [6, RIENG.id], "dòng riêng (bậc 6) thắng mức TA");
console.log("✓ 6) Gắn loại còn dòng riêng ⇒ 201 (không chặn), dongRieng = [dòng riêng 8%]; Thử tra: dòng riêng bậc 6 thắng mức TA");

// ---- 7) Tắt / bật mức
r = await call(ACC, "POST", `/api/pricing/muc-ta/${TA1}/tat`, {});
phai(r, 200, "tắt mức");
assert.equal(r.body.muc.dangBat, false);
phai(await call(ACC, "POST", `/api/pricing/muc-ta/gan/${GAN_L2.id}/ket-thuc`, { denNgay: HOM_NAY }), 200, "kết thúc gắn loại 2");
r = await call(ACC, "POST", "/api/pricing/muc-ta/gan", { loai: LOAI2, muc: TA1, tuNgay: vnDate(1) });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(maLoi(r), "muc_tat");
assert.doesNotMatch(thongBao(r), MA_THO);
r = await call(ACC, "POST", `/api/pricing/muc-ta/${TA1}/dong`, { phamVi: "ALL", kieu: "RATE", tyLeBp: 500, tuNgay: HOM_NAY });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(maLoi(r), "muc_tat");
assert.equal((await call(ACC, "POST", `/api/pricing/muc-ta/${TA1}/tat`, {})).status, 409, "tắt lần hai ⇒ 409");
assert.equal((await call(A, "POST", `/api/pricing/muc-ta/${TA1}/bat`, {})).status, 403, "Bán hàng không bật được");
r = await call(ACC, "POST", `/api/pricing/muc-ta/${TA1}/bat`, {});
phai(r, 200, "bật lại");
assert.equal(r.body.muc.dangBat, true);
phai(await call(ACC, "POST", "/api/pricing/muc-ta/gan", { loai: LOAI2, muc: TA1, tuNgay: vnDate(1) }), 201, "bật lại ⇒ gắn được");
const nk = await sqlRows(`SELECT action, count(*) AS n FROM audit_log WHERE action IN ('prc_rate_tier_off', 'prc_rate_tier_on') AND detail = '${TEN_TA1}' GROUP BY action ORDER BY action`);
assert.deepEqual(nk.map((x) => [x.action, x.n]), [["prc_rate_tier_off", 1], ["prc_rate_tier_on", 1]], "mỗi lần đổi thật một dòng nhật ký; lần thua (409) không ghi");
console.log("✓ 7) Tắt mức ⇒ gắn mới / thêm dòng 409 muc_tat; tắt lần hai 409; Bán hàng bật 403; bật lại ⇒ gắn được; một dòng nhật ký mỗi lần đổi thật");

// ---- 8) Không đổi công ty chủ
assert.deepEqual((await sqlRows("SELECT party_id FROM v_pty_owner_company")).map((x) => x.party_id), congTyTruoc, "công ty chủ không đổi");
console.log("✓ 8) Công ty chủ không đổi");
console.log("E2E OK");
