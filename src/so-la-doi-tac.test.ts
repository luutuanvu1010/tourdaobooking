// Bài "số lạ" (sổ đại lý đợt 1 — Task 5; đặc tả 2026-10-08 §12; ADR-0077 điều 10–11, C9 = A): Đối tác — kể cả tài khoản lai — chỉ được thấy SỐ TIỀN hoa hồng của chính mình.
// Tỷ lệ, đ/khách, tỷ lệ mua lại của nhà cung cấp, mức riêng của đại lý khác, lý do ghi tay: không bao giờ lộ qua BẤT KỲ bề mặt nào Đối tác gọi được.
// Cách thử: gieo vài SỐ LẠ (480017, 4817 — không trùng số tiền nào được tính ra), cho Đối tác gọi mọi bề mặt có thể chứa tiền / lịch sử / thông báo, rồi quét thân phản hồi
// (đã bỏ mã UUID và mốc giờ ISO — hai thứ này có thể chứa dãy số bất kỳ). Có "răng": bài chứng minh chính các số lạ ấy HIỆN ra với Kế toán, nên một chỗ rò sẽ bắt được.
// KHÔNG bao giờ nới bài này bằng cách bỏ bớt một số lạ hay một bề mặt; số tiền tính ra đổi thì chọn lại giá đơn, không đổi bộ số lạ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { HANH_DONG_TIN_DON } from "./shared/thong-bao.ts";
import { HANH_DONG_TIN_CHUYEN } from "./shared/tin-chuyen.ts";
import { THAY_DOI } from "./shared/bang-tin.ts";
import { hanhDongCuaThayDoi } from "./shared/web-push.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const SUP = "55555555-5555-4555-8555-555555555555";
const DT_A = "88888888-8888-4888-8888-88888888888a";
const DT_B = "88888888-8888-4888-8888-88888888888b";
const LAI_BAN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"; // SALES + PARTNER
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
let seq = 0;
const uuid = () => `99999999-9999-4999-8999-${String(++seq).padStart(12, "0")}`;
type W = ReturnType<typeof world>;

/** Số lạ: mức riêng của đại lý B (480.017đ/khách), tỷ lệ mua lại 48,17% của nhà cung cấp, mức tay 48,17% Kế toán ghi cho đơn của A. Mỗi số một dạng viết có thể lộ ra. */
const SO_LA = ["480017", "480.017", "4817", "48,17"] as const;
const GIA_DON = 2_000_000; // hoa hồng tay 48,17% ⇒ 963.400; giá đại lý 1.036.600 — không số nào chứa số lạ

function setup(): W {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [KT, "0900000004", "Lan Kế Toán", ["ACCOUNTING"]], [SUP, "0900000006", "Chủ", ["SUPER_ADMIN"]],
    [DT_A, "0900000007", "Đại Lý A", ["PARTNER"]], [DT_B, "0900000008", "Đại Lý B", ["PARTNER"]], [LAI_BAN, "0900000012", "Sơn Lai Bán", ["SALES", "PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  for (const [r, p] of [["r-dta", DT_A], ["r-dtb", DT_B], ["r-lai", LAI_BAN]] as const) { // r-lai: tài khoản lai cũng có thể mang vai này (quyền gán bằng đường cũ không qua LC-1) — để thử đơn do CHÍNH hồ sơ họ hưởng
    w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(r, `pty-${p}`, AT, AT);
  }
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-ncc', 'ORGANIZATION', 'i-resort', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-ncc', 'pty-ncc', 'SUPPLIER', '2026-01-01', ?, ?)").run(AT, AT);
  return w;
}
function nhap(w: W, chu: string, booker: string | null, dv: [string | null, number][]): string {
  const id = uuid();
  const tong = dv.reduce((s, [, t]) => s + t, 0);
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, `TD-${seq}`, chu, tong, tong, tong, booker, AT, AT);
  dv.forEach(([code, t], i) => {
    const s = `${id}-s${i}`;
    w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, ?, ?, ?, ?, 1, ?)`).run(s, id, i, code, `DV ${i}`, code ? "perPax" : "manual", vnHomNay());
    w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, ?, ?, 'Người lớn', 1, ?, ?, ?)`)
      .run(`${s}-i`, id, s, code, code ? "adult" : null, t, code ? t : null, t);
  });
  return id;
}
async function daXacNhan(w: W, booker: string | null, dvs: [string | null, number][], chu: string): Promise<string> {
  const id = nhap(w, chu, booker, dvs);
  const r = await w.call("POST", `/api/orders/${id}/status`, { as: chu, body: { status: "confirmed" } });
  assert.equal(r.status, 200, r.text);
  return id;
}
/** Bỏ mã UUID (kể cả `pty-<uuid>`) và mốc giờ ISO — hai thứ này có thể chứa dãy số bất kỳ, không phải số liệu tiền. */
const boMaVaGio = (t: string): string => t
  .replace(/(?:pty-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "")
  .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, "");
const soLaTrong = (t: string): string[] => SO_LA.filter((s) => boMaVaGio(t).includes(s));
const khoaCua = (x: unknown): string[] => (Array.isArray(x) ? x.flatMap(khoaCua) : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => [k, ...khoaCua(v)]) : []);

/** Dựng thế giới: A có đơn của mình (Kế toán ghi tay 48,17%), B có mức riêng 480.017đ/khách và đơn của mình, nhà cung cấp mua lại 48,17%, tài khoản lai có đơn của mình. */
async function dungThe() {
  const w = setup();
  const KQ = async (r: Promise<{ status: number; text: string; json: any }>, ma: number) => { const x = await r; assert.equal(x.status, ma, x.text); return x; };
  await KQ(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } }), 201);
  await KQ(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "DOI_TAC", partyId: `pty-${DT_B}` }, phamVi: "ALL", kieu: "PER_PAX", moiKhach: 480_017 } }), 201);
  w.sqlite.prepare(`INSERT INTO prc_supply_term (id, scope, catalog_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, created_at, updated_at)
    VALUES ('st-ncc', 'SERVICE', 'HONTAM', 'pty-ncc', 'pty-ncc', 4817, '2026-01-01', ?, ?)`).run(AT, AT);
  const cuaB = await daXacNhan(w, `pty-${DT_B}`, [["HONTAM", GIA_DON]], DT_B);
  const cuaA = await daXacNhan(w, `pty-${DT_A}`, [["HONTAM", GIA_DON]], DT_A);
  const ghi = (id: string) => w.call("POST", `/api/orders/${id}/thuong-mai/${id}-s0`, { as: KT, body: { lyDo: "Thoả thuận riêng với đại lý này", hoaHong: { kieu: "RATE", tyLeBp: 4817 } } });
  await KQ(ghi(cuaA), 200);
  return { w, cuaA, cuaB };
}

test("số lạ: Đối tác A gọi mọi bề mặt có tiền / lịch sử / thông báo ⇒ không số lạ nào lộ ra (tỷ lệ, đ/khách, a% nhà cung cấp, mức riêng của B, mức tay)", async () => {
  const { w, cuaA, cuaB } = await dungThe();

  // ---- Tự kiểm bài: số tiền tính ra cho A không chứa số lạ, nên một số lạ trong thân phản hồi chỉ có thể là rò rỉ.
  const doc = await w.call("GET", `/api/orders/${cuaA}/thuong-mai`, { as: DT_A });
  assert.equal(doc.status, 200, doc.text);
  const dong = doc.json.doiTac.dong[0];
  assert.deepEqual([dong.thanhTien, dong.hoaHong, dong.giaDaiLy], [2_000_000, 963_400, 1_036_600], "mức tay 48,17% × 2.000.000 = 963.400");
  for (const so of [dong.thanhTien, dong.hoaHong, dong.giaDaiLy, doc.json.doiTac.tong.thanhTien, doc.json.doiTac.tong.hoaHong, doc.json.doiTac.tong.giaDaiLy]) {
    assert.deepEqual(soLaTrong(String(so)), [], `số tiền tính ra ${so} không được trùng số lạ`);
  }

  // ---- Có răng: Kế toán THẤY chính các số lạ ấy (nên bài quét bắt được nếu chúng rò sang Đối tác).
  const vp = await w.call("GET", `/api/orders/${cuaA}/thuong-mai`, { as: KT });
  assert.match(vp.text, /48,17%/, "văn phòng thấy mức tay 48,17% và a% 48,17%");
  assert.equal(vp.json.vanPhong.dong[0].muc, "48,17%");
  assert.equal(vp.json.vanPhong.dong[0].nhaCungCap.tyLeMua, "48,17%");
  assert.match((await w.call("GET", "/api/pricing/hoa-hong", { as: KT })).text, /480017/, "Kế toán thấy mức riêng 480.017đ/khách của B");
  const nkVanPhong = await w.call("GET", `/api/orders/${cuaA}`, { as: KT });
  assert.ok(nkVanPhong.json.history.some((e: { action: string; detail: string }) => e.action === "order_terms_manual" && /48,17%/.test(e.detail)), "nhật ký ghi mức tay 48,17% — thứ Đối tác không được thấy");

  // ---- Các bề mặt Đối tác A gọi được (kể cả bề mặt trả 403 — thân lỗi cũng không được chứa số lạ).
  const bemat: [string, string][] = [
    ["GET", "/api/orders"],
    ["GET", `/api/orders/${cuaA}`],
    ["GET", `/api/orders/${cuaA}/thuong-mai`],
    ["GET", `/api/orders/${cuaA}/receipt`],
    ["GET", `/api/orders/${cuaA}/qr-thanh-toan`],
    ["GET", "/api/ledger/mine"],
    ["GET", "/api/thong-bao"],
    ["GET", "/api/thong-bao/tom-tat"],
    ["GET", "/api/pricing/hoa-hong"],
    ["GET", "/api/pricing/cung-ung"],
    ["GET", `/api/pricing/thu-tra?doiTac=pty-${DT_B}&dichVu=HONTAM&ngay=2026-10-10`],
    ["GET", "/api/pricing/nguoi-huong?q=Đại"],
    // đơn của đại lý khác: bị từ chối, nhưng thân lỗi cũng không được lộ mức của B
    ["GET", `/api/orders/${cuaB}`],
    ["GET", `/api/orders/${cuaB}/thuong-mai`],
    ["GET", `/api/orders/${cuaB}/receipt`],
    ["GET", `/api/orders/${cuaB}/qr-thanh-toan`],
    // Sổ đại lý đợt 2 Task 9 (Step 1 của brief): màn tiền của đơn và tiền nhiều đơn.
    ["GET", `/api/orders/${cuaA}/payments`],
    ["GET", `/api/orders/${cuaB}/payments`],
    ["POST", "/api/ledger/balances"],
  ];
  const trangThai: string[] = [];
  for (const [phuongThuc, duong] of bemat) {
    const r = await w.call(phuongThuc, duong, { as: DT_A, ...(phuongThuc === "POST" ? { body: { orderIds: [cuaA, cuaB] } } : {}) });
    trangThai.push(`${r.status} ${duong}`);
    assert.ok(r.status < 500, `${duong} không được 5xx (bề mặt hỏng thì bài quét vô nghĩa): ${r.status} ${r.text}`);
    assert.deepEqual(soLaTrong(r.text), [], `${duong} (${r.status}) lộ số lạ: ${r.text}`);
  }
  // các bề mặt chính phải thật sự trả nội dung (không chỉ lỗi)
  assert.ok(trangThai.includes(`200 /api/orders/${cuaA}`) && trangThai.includes(`200 /api/orders/${cuaA}/thuong-mai`) && trangThai.includes("200 /api/orders"), trangThai.join(" | "));
  assert.ok(trangThai.includes(`403 /api/orders/${cuaB}`), "đơn của đại lý khác bị từ chối");
  assert.ok(trangThai.includes(`200 /api/orders/${cuaA}/payments`) && trangThai.includes("200 /api/ledger/balances"), trangThai.join(" | "));
  assert.ok(trangThai.includes(`404 /api/orders/${cuaB}/thuong-mai`), "phần đối tác của đơn đại lý khác: 404 (Ruling 18 — không dò được)");

  // ---- Danh sách trắng: DTO của Đối tác không có khoá nào của tỷ lệ / đ/khách / giá vốn / nguồn.
  const khoaCam = khoaCua(doc.json).filter((k) => /rate|perPax|cost|ruleId|termId|source|supplier/i.test(k));
  assert.deepEqual(khoaCam, [], "DTO Đối tác không có khoá tỷ lệ / đ/khách / giá vốn / mã mức / mã điều khoản / nguồn / nhà cung cấp");

  // ---- Lịch sử đơn của Đối tác: không dòng order_terms_* nào (kể cả order_terms_captured).
  const chiTiet = await w.call("GET", `/api/orders/${cuaA}`, { as: DT_A });
  assert.ok(chiTiet.json.history.length > 0, "lịch sử vẫn có các dòng khác (đơn đã tạo, xác nhận)");
  assert.deepEqual(chiTiet.json.history.map((e: { action: string }) => e.action).filter((a: string) => a.startsWith("order_terms_")), []);
  assert.ok(nkVanPhong.json.history.some((e: { action: string }) => e.action === "order_terms_captured"), "văn phòng vẫn thấy dòng đã chụp mức");
});

test("số lạ: tài khoản lai Bán hàng + Đối tác quét đơn của B và đơn của A (xác nhận lẫn nháp) ⇒ 404 ở phần đối tác, không số lạ ở bất kỳ bề mặt nào; đơn do chính hồ sơ mình hưởng thì thấy đúng số của mình", async () => {
  const { w, cuaA, cuaB } = await dungThe();
  // Đơn NHÁP của B (bên đặt B ⇒ bản tính thử có mức riêng 480.017đ/khách của B) và đơn của chính tài khoản lai (bên đặt là hồ sơ của họ, Kế toán ghi tay 48,17%).
  const nhapB = nhap(w, DT_B, `pty-${DT_B}`, [["HONTAM", GIA_DON]]);
  const cuaMinh = await daXacNhan(w, `pty-${LAI_BAN}`, [["HONTAM", GIA_DON]], LAI_BAN);
  const ghi = await w.call("POST", `/api/orders/${cuaMinh}/thuong-mai/${cuaMinh}-s0`, { as: KT, body: { lyDo: "Thoả thuận riêng với đại lý này", hoaHong: { kieu: "RATE", tyLeBp: 4817 } } });
  assert.equal(ghi.status, 200, ghi.text);

  // Có răng: văn phòng THẤY số lạ của B ở đúng các đơn mà tài khoản lai không được thấy (nên một chỗ rò sẽ bị bài bắt).
  assert.equal((await w.call("GET", `/api/orders/${cuaB}/thuong-mai`, { as: KT })).json.vanPhong.dong[0].hoaHong, 480_017, "đơn B đã xác nhận: 1 khách × 480.017đ");
  assert.equal((await w.call("GET", `/api/orders/${nhapB}/thuong-mai`, { as: KT })).json.vanPhong.dong[0].hoaHong, 480_017, "đơn B nháp (tính thử): cùng số");

  const trangThai: string[] = [];
  const quet = async (duong: string, as = LAI_BAN) => {
    const r = await w.call("GET", duong, { as });
    trangThai.push(`${r.status} ${duong}`);
    assert.ok(r.status < 500, `${duong}: ${r.status} ${r.text}`);
    assert.deepEqual(soLaTrong(r.text), [], `${duong} (${r.status}) lộ số lạ cho tài khoản lai: ${r.text}`);
    return r;
  };
  // Tài khoản lai mở được CHI TIẾT đơn người khác (Bán hàng xem mọi đơn) nhưng KHÔNG được thấy phần đối tác của chúng: 404, và không bề mặt nào kèm số lạ.
  for (const id of [cuaB, nhapB, cuaA]) { // đơn B trước: nếu rò thì số lạ 480017 hiện ngay ở bề mặt đầu tiên
    for (const duong of [`/api/orders/${id}`, `/api/orders/${id}/receipt`, `/api/orders/${id}/qr-thanh-toan`, `/api/orders/${id}/payments`]) await quet(duong);
    const doc = await quet(`/api/orders/${id}/thuong-mai`);
    assert.equal(doc.status, 404, `phần đối tác của đơn người khác phải 404: ${doc.text}`);
    assert.equal(doc.json.error.code, "not_found");
    const chiTiet = await w.call("GET", `/api/orders/${id}`, { as: LAI_BAN });
    if (chiTiet.status === 200) assert.deepEqual(chiTiet.json.history.filter((e: { action: string }) => e.action.startsWith("order_terms_")), [], "lịch sử đơn người khác cũng lọc order_terms_*");
  }
  // Sổ đại lý đợt 2 Task 9: tiền nhiều đơn (POST, thân là danh sách đơn) cũng không kèm số lạ.
  const ds = await w.call("POST", "/api/ledger/balances", { as: LAI_BAN, body: { orderIds: [cuaB, nhapB, cuaA, cuaMinh] } });
  assert.equal(ds.status, 200, ds.text);
  assert.deepEqual(soLaTrong(ds.text), [], `/api/ledger/balances lộ số lạ cho tài khoản lai: ${ds.text}`);
  // Đơn của chính tài khoản lai: DTO hẹp, đúng số của mình (mức tay 48,17% × 2.000.000 = 963.400), không số lạ ở bề mặt nào.
  for (const duong of ["/api/orders", `/api/orders/${cuaMinh}`, `/api/orders/${cuaMinh}/receipt`, `/api/orders/${cuaMinh}/qr-thanh-toan`, "/api/thong-bao", "/api/thong-bao/tom-tat", "/api/ledger/mine"]) await quet(duong);
  const chiTiet = await w.call("GET", `/api/orders/${cuaMinh}`, { as: LAI_BAN });
  assert.equal(chiTiet.status, 200, chiTiet.text);
  assert.ok(chiTiet.json.history.length > 0);
  assert.deepEqual(chiTiet.json.history.filter((e: { action: string }) => e.action.startsWith("order_terms_")), []);
  const doc = await quet(`/api/orders/${cuaMinh}/thuong-mai`); // qua `quet` như mọi bề mặt khác (M1 người kiểm Task 5): thân DTO hẹp cũng không được chứa số lạ
  assert.equal(doc.status, 200, doc.text);
  assert.deepEqual(Object.keys(doc.json), ["doiTac"]);
  assert.equal(doc.json.doiTac.dong[0].hoaHong, 963_400);
  assert.deepEqual(khoaCua(doc.json).filter((k) => /rate|perPax|cost|ruleId|termId|source|supplier/i.test(k)), []);
  assert.ok(trangThai.includes(`404 /api/orders/${cuaB}/thuong-mai`) && trangThai.includes(`404 /api/orders/${nhapB}/thuong-mai`) && trangThai.includes(`404 /api/orders/${cuaA}/thuong-mai`), trangThai.join(" | "));
});

test("số lạ + loại đối tác MỚI (ADR-0117, N-8): Đối tác mang một loại do Kế toán thêm trên màn hình, loại ấy có mức 48,17% ⇒ Đối tác chỉ thấy số tiền của mình, không thấy tên loại, tỷ lệ, hay mức", async () => {
  const w = setup();
  const TEN_LOAI = "Cửa hàng quà tặng Lạ";
  const them = await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: TEN_LOAI } });
  assert.equal(them.status, 201, them.text);
  const ma: string = them.json.loai.code;
  const gan = await w.call("POST", `/api/parties/pty-${DT_A}/roles`, { as: SUP, body: { roleTypeCode: ma } });
  assert.equal(gan.status, 201, gan.text);
  const muc = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: ma }, phamVi: "ALL", kieu: "RATE", tyLeBp: 4817 } });
  assert.equal(muc.status, 201, muc.text);
  const don = await daXacNhan(w, `pty-${DT_A}`, [["HONTAM", GIA_DON]], DT_A);

  // Có răng: Kế toán THẤY tên loại và 48,17% (nên bài bắt được nếu chúng rò sang Đối tác).
  const vp = await w.call("GET", `/api/orders/${don}/thuong-mai`, { as: KT });
  assert.equal(vp.status, 200, vp.text);
  assert.equal(vp.json.vanPhong.dong[0].hoaHong, 963_400, "loại mới có hiệu lực: 48,17% × 2.000.000");
  assert.match((await w.call("GET", "/api/pricing/hoa-hong", { as: KT })).text, new RegExp(TEN_LOAI), "Kế toán thấy tên loại mới");

  const bemat = ["/api/orders", `/api/orders/${don}`, `/api/orders/${don}/thuong-mai`, `/api/orders/${don}/receipt`, `/api/orders/${don}/qr-thanh-toan`,
    "/api/ledger/mine", "/api/thong-bao", "/api/thong-bao/tom-tat", "/api/pricing/hoa-hong", "/api/pricing/loai-doi-tac", "/api/pricing/cung-ung", "/api/pricing/nguoi-huong?q=Đại"];
  for (const duong of bemat) {
    const r = await w.call("GET", duong, { as: DT_A });
    assert.ok(r.status < 500, `${duong}: ${r.status} ${r.text}`);
    assert.deepEqual(soLaTrong(r.text), [], `${duong} (${r.status}) lộ số lạ: ${r.text}`);
    assert.ok(!r.text.includes(TEN_LOAI) && !r.text.includes(ma), `${duong} (${r.status}) lộ tên / mã loại đối tác mới: ${r.text}`);
  }
  const doc = await w.call("GET", `/api/orders/${don}/thuong-mai`, { as: DT_A });
  assert.equal(doc.status, 200, doc.text);
  assert.equal(doc.json.doiTac.dong[0].hoaHong, 963_400, "Đối tác thấy đúng SỐ TIỀN của mình");
  assert.deepEqual(khoaCua(doc.json).filter((k) => /rate|perPax|cost|ruleId|termId|source|supplier|loai|vai|role/i.test(k)), [], "DTO Đối tác không có khoá tỷ lệ / mã mức / loại / vai");
});

test("số lạ + MỨC TA (ADR-0117 lần 2): loại của Đối tác gắn mức «Mức Lạ Biển» có dòng 48,17% ⇒ Đối tác chỉ thấy số tiền của mình, tài khoản lai Bán hàng + Đối tác không thấy gì của mức — không tên mức, tên loại, mã, tỷ lệ ở bất kỳ route GET nào", async () => {
  const w = setup();
  const TEN_LOAI = "Quầy vé Lạ";
  const TEN_MUC = "Mức Lạ Biển";
  const loai = await w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: TEN_LOAI } });
  assert.equal(loai.status, 201, loai.text);
  const ma: string = loai.json.loai.code;
  // Tài khoản lai (có quyền nội bộ) KHÔNG mang được loại đối tác (ADR-0117 điều 4) — nó chỉ là NGƯỜI XEM ở bài này (Bán hàng mở được đơn của A).
  const gan = await w.call("POST", `/api/parties/pty-${DT_A}/roles`, { as: SUP, body: { roleTypeCode: ma } });
  assert.equal(gan.status, 201, gan.text);
  // Hồ sơ A còn mang Đại lý lữ hành (gieo sẵn) — kết thúc để chỉ còn loại mới ⇒ mức TA là bậc thắng.
  w.sqlite.prepare("UPDATE pty_party_role SET valid_to_date = '2026-01-02' WHERE id = 'r-dta'").run();
  const muc = await w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten: TEN_MUC } });
  assert.equal(muc.status, 201, muc.text);
  const maMuc: string = muc.json.muc.code;
  assert.equal((await w.call("POST", `/api/pricing/muc-ta/${maMuc}/dong`, { as: KT, body: { tuNgay: "2026-01-01", phamVi: "ALL", kieu: "RATE", tyLeBp: 4817 } })).status, 201);
  assert.equal((await w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai: ma, muc: maMuc, tuNgay: "2026-01-01" } })).status, 201);
  const don = await daXacNhan(w, `pty-${DT_A}`, [["HONTAM", GIA_DON]], DT_A);

  // Có răng: Kế toán THẤY tên mức, tỷ lệ 48,17% và số tiền theo mức (nên bài bắt được nếu chúng rò sang Đối tác).
  const vp = await w.call("GET", `/api/orders/${don}/thuong-mai`, { as: KT });
  assert.equal(vp.json.vanPhong.dong[0].hoaHong, 963_400, "mức TA 48,17% × 2.000.000");
  assert.equal(vp.json.vanPhong.dong[0].muc, "48,17%");
  const bangMuc = await w.call("GET", "/api/pricing/muc-ta", { as: KT });
  assert.equal(bangMuc.status, 200, bangMuc.text);
  assert.ok(bangMuc.text.includes(TEN_MUC) && bangMuc.text.includes(TEN_LOAI) && bangMuc.text.includes("4817"), "Kế toán thấy tên mức, tên loại, tỷ lệ");
  const tt = await w.call("GET", `/api/pricing/thu-tra?doiTac=pty-${DT_A}&dichVu=HONTAM&ngay=${vnHomNay()}`, { as: KT });
  assert.equal(tt.json.ketQua.bac, 9);
  assert.equal(tt.json.ketQua.muc.doiTuong.ten, TEN_MUC);

  const bemat = ["/api/orders", `/api/orders/${don}`, `/api/orders/${don}/thuong-mai`, `/api/orders/${don}/receipt`, `/api/orders/${don}/qr-thanh-toan`, "/api/ledger/mine", "/api/thong-bao", "/api/thong-bao/tom-tat", "/api/pricing/hoa-hong", "/api/pricing/muc-ta", "/api/pricing/loai-doi-tac",
    "/api/pricing/cung-ung", "/api/pricing/nguoi-huong?q=Đại", `/api/pricing/thu-tra?doiTac=pty-${DT_A}&dichVu=HONTAM&ngay=${vnHomNay()}`, `/api/parties/pty-${DT_A}`];
  for (const as of [DT_A, LAI_BAN]) {
    for (const duong of bemat) {
      const r = await w.call("GET", duong, { as });
      assert.ok(r.status < 500, `${duong}: ${r.status} ${r.text}`);
      assert.deepEqual(soLaTrong(r.text), [], `${duong} (${as}, ${r.status}) lộ số lạ: ${r.text}`);
      // CHỜ ĐIỀU PHỐI / CHỦ QUYẾT (phát hiện ở Task 4 lần 2, chưa phải ngoại lệ đã duyệt): Danh bạ hôm nay cho tài khoản lai Bán hàng + Đối tác (có party.view) thấy TÊN LOẠI
      // hồ sơ đang mang (hành vi lần 1, module parties). Bài chỉ khoanh lại để không chặn Task 4; quyết giữ hay ẩn tên loại với mọi người giữ PARTNER thì sửa dòng này.
      // Tên / mã MỨC thì không bao giờ lộ, kể cả ở Danh bạ.
      const cam = as === LAI_BAN && duong.startsWith("/api/parties/") ? [TEN_MUC, maMuc] : [TEN_MUC, maMuc, TEN_LOAI, ma];
      for (const x of cam) assert.ok(!r.text.includes(x), `${duong} (${as}, ${r.status}) lộ «${x}»: ${r.text}`);
    }
  }
  const doc = await w.call("GET", `/api/orders/${don}/thuong-mai`, { as: DT_A });
  assert.equal(doc.status, 200, doc.text);
  assert.equal(doc.json.doiTac.dong[0].hoaHong, 963_400, "Đối tác thấy đúng SỐ TIỀN của mình");
  assert.deepEqual(khoaCua(doc.json).filter((k) => /rate|perPax|cost|ruleId|termId|source|supplier|loai|vai|role|mucTa|tier/i.test(k)), [], "DTO Đối tác không có khoá tỷ lệ / mã mức / loại / vai / mức TA");
});

test("số lạ: nhật ký ghi mức KHÔNG sinh thông báo / tin Bảng tin — không hành động order_terms_* nào nằm trong các danh sách sinh tin", () => {
  assert.deepEqual((HANH_DONG_TIN_DON as readonly string[]).filter((a) => a.startsWith("order_terms_")), [], "hộp thông báo của đơn");
  assert.deepEqual((HANH_DONG_TIN_CHUYEN as readonly string[]).filter((a) => a.startsWith("order_terms_")), [], "tin chuyến");
  const rungMay = THAY_DOI.map((t) => hanhDongCuaThayDoi(t)).filter((a): a is string => a !== null);
  assert.deepEqual(rungMay.filter((a) => a.startsWith("order_terms_")), [], "cú gõ cửa màn hình khoá");
  assert.equal(hanhDongCuaThayDoi("tien"), null, "đổi tiền (kể cả ghi mức tay) không gõ cửa máy nào");
});

// ===================================================================================================================================================
// Sổ đại lý đợt 2, Task 9 — chặn lộ khi đơn đại lý qua «Đã giao» (đặc tả P8; trang-ghep.md §8; ADR-0081 điều 4; ô `supply.terms.view`):
//  (1) tài khoản giữ quyền Đối tác (kể cả lai Bán hàng + Đối tác, Kế toán + Đối tác) không thấy tên người thu khác, tiền người khác giữ, tên nhà cung cấp / đại lý khác;
//  (2) người không có `supply.terms.view` (Bán hàng, HDV, Thực tập, Đối tác) không thấy số dư nhà cung cấp hay câu nói tới giá vốn — chỉ «còn khoản giữa công ty
//      và nhà cung cấp — Kế toán xử lý». Bề mặt: `GET /api/orders/:id/payments`, `POST /api/ledger/balances`, thân 409 của `POST /api/orders/:id/delivered`.
// Số / tên lạ: HDV «Nam Số Lạ 4817»; nhà cung cấp «i-resort»; đại lý khác «Đại Lý B». Tên «Người thu tiền khác» (không «Người thu khác» — bảng từ ADR-0130 lượt 2, R-90).
// ===================================================================================================================================================
const T9_HDV = "22222222-2222-4222-8222-222222222222";
const T9_KTP = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"; // ACCOUNTING + PARTNER (lai)
const TEN_HDV = "Nam Số Lạ 4817";

/** Khung Task 9: tài khoản của bài số lạ + HDV «Nam Số Lạ 4817» + tài khoản lai Kế toán + Đối tác; đại lý hưởng 10%; i-resort bán IRESORT, a% `tyLeMuaBp`. */
async function dungT9(tyLeMuaBp = 8000): Promise<W> {
  const w = setup();
  seedStaff(w.sqlite, { id: T9_HDV, phone: "0900000002", name: TEN_HDV, perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: T9_KTP, phone: "0900000013", name: "Kim Lai Kế Toán", perms: ["ACCOUNTING", "PARTNER"] });
  const m = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  assert.equal(m.status, 201, m.text);
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, price_child, price_senior, price_infant, sheet_row, in_sheet, first_seen_at, updated_at)
    VALUES ('IRESORT', 'Vé tắm bùn i-resort', 'perPax', 300000, NULL, NULL, NULL, 1, 1, '${AT}', '${AT}')`);
  const c = await w.call("POST", "/api/pricing/cung-ung", { as: KT, body: { phamVi: "SERVICE", catalogCode: "IRESORT", nguoiBanPartyId: "pty-ncc", tyLeMuaBp, tuNgay: "2026-01-01" } });
  assert.equal(c.status, 201, c.text);
  return w;
}
const phanCongT9 = (w: W, id: string) => w.sqlite.prepare(`INSERT INTO dsp_assignment (id, order_id, task_kind_code, party_id, status_code, valid_from_at, created_at, created_by, updated_at, updated_by)
  VALUES (?, ?, 'HANDLE', ?, 'PENDING', ?, ?, NULL, ?, NULL)`).run(uuid(), id, `pty-${T9_HDV}`, AT, AT, AT);
const ghiT9 = async (w: W, as: string, id: string, body: Record<string, unknown>) => {
  const r = await w.call("POST", `/api/orders/${id}/payments`, { as, body: { hinhThuc: "CASH", ...body } });
  assert.equal(r.status, 201, r.text);
};
/**
 * Đơn của `chu` (bên đặt = hồ sơ của `chu`): Hòn Tằm 1.000.000 + 2 vé i-resort 600.000. HDV «Nam Số Lạ 4817» thu 500.000, chính đại lý thu 300.000, quầy i-resort
 * (Kế toán ghi) 600.000, công ty 200.000 ⇒ «Đã giao». Sổ: HDV nợ 500.000; đại lý nợ 300.000 − hoa hồng 160.000 = 140.000; i-resort nợ 600.000 − giá vốn 480.000 = 120.000.
 */
async function donDaGiaoT9(w: W, chu: string): Promise<string> {
  const id = await daXacNhan(w, `pty-${chu}`, [["HONTAM", 1_000_000], ["IRESORT", 600_000]], chu);
  phanCongT9(w, id);
  await ghiT9(w, T9_HDV, id, { soTien: 500_000, nguoiThu: "toi" });
  await ghiT9(w, chu, id, { soTien: 300_000, nguoiThu: "toi" });
  await ghiT9(w, KT, id, { soTien: 600_000, nguoiThu: { partyId: "pty-ncc" } });
  await ghiT9(w, SUP, id, { soTien: 200_000, nguoiThu: "cong_ty" });
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: SUP, body: {} });
  assert.equal(g.status, 200, g.text);
  return id;
}
const tienT9 = async (w: W, id: string, as: string) => {
  const r = await w.call("GET", `/api/orders/${id}/payments`, { as });
  assert.equal(r.status, 200, `${as}: ${r.text}`);
  return r;
};
const CAU_NCC = "còn khoản giữa công ty và nhà cung cấp — Kế toán xử lý";

test("Task 9 (1): Đối tác, tài khoản lai Bán hàng + Đối tác và Kế toán + Đối tác xem đơn đại lý đã giao ⇒ không tên HDV «Nam Số Lạ», không «i-resort», không số người khác giữ; người thu khác = «Người thu tiền khác»; Kế toán thuần thấy đủ (có răng)", async () => {
  const w = await dungT9();
  const cuaA = await donDaGiaoT9(w, DT_A);
  const cuaLai = await donDaGiaoT9(w, LAI_BAN);

  // Có răng: Kế toán thuần thấy tên HDV, tên nhà cung cấp và ba số dư trong câu chưa hoàn thành.
  const kt = await tienT9(w, cuaA, KT);
  assert.match(kt.text, /Nam Số Lạ 4817/);
  assert.match(kt.json.lyDoChuaHoanThanh.cau, /Nam Số Lạ 4817 còn 500\.000 ₫ chưa nộp/);
  assert.match(kt.json.lyDoChuaHoanThanh.cau, /i-resort còn 120\.000 ₫ chưa nộp/);
  assert.match(kt.json.lyDoChuaHoanThanh.cau, /Đại Lý A còn 140\.000 ₫ chưa nộp/);
  assert.deepEqual(kt.json.lanThu.map((l: { nguoiThu: string }) => l.nguoiThu), [TEN_HDV, "Đại Lý A", "i-resort", "Công ty"]);

  for (const [as, id, tenMinh] of [[DT_A, cuaA, "Đại Lý A"], [LAI_BAN, cuaLai, "Sơn Lai Bán"], [T9_KTP, cuaA, null]] as const) {
    const r = await tienT9(w, id, as);
    for (const cam of ["Nam Số Lạ", "4817", "i-resort", "Đại Lý B", "120.000", "120000", "500.000 ₫ chưa nộp"]) assert.ok(!r.text.includes(cam), `${as} thấy «${cam}»: ${r.text}`);
    if (as !== T9_KTP) assert.ok(!r.text.includes(as === DT_A ? "Sơn Lai Bán" : "Đại Lý A"), `${as} thấy tên đại lý khác`);
    const nguoiThu = r.json.lanThu.map((l: { nguoiThu: string }) => l.nguoiThu);
    assert.deepEqual(nguoiThu, ["Người thu tiền khác", tenMinh ?? "Người thu tiền khác", "Người thu tiền khác", "Công ty"], `${as}: ${nguoiThu}`);
    assert.ok(r.json.lanThu.every((l: { nguoiThuPartyId: string | null }) => l.nguoiThuPartyId === null), `${as}: không id hồ sơ người thu khác`);
    const cau: string = r.json.lyDoChuaHoanThanh.cau;
    if (tenMinh) assert.match(cau, new RegExp(`${tenMinh} còn 140\\.000 ₫ chưa nộp`), "số của chính mình vẫn thấy");
    assert.match(cau, /còn khoản của bên khác — Kế toán xử lý/, cau);
    if (r.json.keToan) assert.deepEqual(r.json.keToan.dangGiu, [], `${as}: khối Kế toán không liệt kê người khác đang giữ`);
    const ds = await w.call("POST", "/api/ledger/balances", { as, body: { orderIds: [cuaA, cuaLai] } });
    assert.equal(ds.status, 200, ds.text);
    for (const cam of ["Nam Số Lạ", "i-resort", "120000"]) assert.ok(!ds.text.includes(cam), `${as} /api/ledger/balances thấy «${cam}»`);
  }
});

test("Task 9 (2): Bán hàng thuần và HDV (không `supply.terms.view`) xem đơn SV-HT-05 sau «Đã giao» ⇒ không 120.000 / «i-resort còn», thấy «còn khoản giữa công ty và nhà cung cấp — Kế toán xử lý»; Đối tác đang đối chiếu «tại quầy i-resort» ⇒ câu giữ không tên quầy, không tên HDV", async () => {
  const w = await dungT9();
  // SV-HT-05: chỉ 2 vé i-resort 600.000, khách trả đủ tại quầy (Kế toán ghi người thu i-resort) ⇒ «Đã giao»: i-resort nợ 120.000, Tour Đảo nợ đại lý 60.000.
  const id = await daXacNhan(w, `pty-${DT_A}`, [["IRESORT", 600_000]], DT_A);
  phanCongT9(w, id);
  await ghiT9(w, KT, id, { soTien: 600_000, nguoiThu: { partyId: "pty-ncc" } });
  const g = await w.call("POST", `/api/orders/${id}/delivered`, { as: T9_HDV, body: {} });
  assert.equal(g.status, 200, g.text);
  assert.match((await tienT9(w, id, KT)).json.lyDoChuaHoanThanh.cau, /i-resort còn 120\.000 ₫ chưa nộp/, "có răng: Kế toán thấy số dư nhà cung cấp");
  for (const as of [SALES, T9_HDV, DT_A]) {
    const r = await tienT9(w, id, as);
    for (const cam of ["120000", "120.000", "i-resort còn", "i-resort đang giữ"]) assert.ok(!r.text.includes(cam), `${as} thấy «${cam}»: ${r.text}`);
    if (as !== DT_A) assert.equal(r.json.lyDoChuaHoanThanh.cau, `Chưa Hoàn thành được: ${CAU_NCC}.`);
  }

  // Đối tác: đơn đang giữ «đang đối chiếu» vì HDV khai «khách trả tại quầy i-resort».
  const giu = await daXacNhan(w, `pty-${DT_A}`, [["IRESORT", 600_000]], DT_A);
  phanCongT9(w, giu);
  await ghiT9(w, T9_HDV, giu, { soTien: 600_000, nguoiThu: { nhaCungCapPartyId: "pty-ncc" } });
  assert.match((await tienT9(w, giu, SALES)).json.lyDoChuaGiao.cau, /tại quầy i-resort/, "văn phòng thấy tên quầy (người khai chọn từ danh sách)");
  for (const as of [DT_A, T9_KTP]) {
    const r = await tienT9(w, giu, as);
    assert.equal(r.json.lyDoChuaGiao.ma, "reconciling");
    for (const cam of ["i-resort", "Nam Số Lạ", "4817"]) assert.ok(!r.text.includes(cam), `${as} thấy «${cam}»: ${r.text}`);
  }
});

test("Task 9 (3) — I-1 người kiểm Task 3+4: câu `terms_exceed_price` nói tới giá vốn chỉ cho người có `supply.terms.view` không giữ quyền Đối tác; người khác nhận câu chung ở CẢ GET /payments lẫn thân 409 của «Đã giao» (cả nhánh kiểm trước lẫn nhánh lỗi CSDL)", async () => {
  const w = await dungT9(9500); // 10% hoa hồng + 95% giá vốn > giá bán
  const id = await daXacNhan(w, `pty-${DT_A}`, [["IRESORT", 1_000_000]], DT_A);
  phanCongT9(w, id);
  await ghiT9(w, SUP, id, { soTien: 1_000_000, nguoiThu: "cong_ty" });
  const CAU_KT = "Mức hoa hồng / giá vốn cài cho DV 0 vượt giá bán — Kế toán xem lại.";
  const CAU_CHUNG = "Đơn đang chờ Kế toán xem lại mức của một dịch vụ.";
  assert.equal((await tienT9(w, id, KT)).json.lyDoChuaGiao.cau, CAU_KT, "có răng: Kế toán thấy câu đủ");
  assert.equal((await tienT9(w, id, SUP)).json.lyDoChuaGiao.cau, CAU_KT);
  for (const as of [SALES, T9_HDV, DT_A, T9_KTP]) {
    const r = await tienT9(w, id, as);
    assert.deepEqual([r.json.lyDoChuaGiao.ma, r.json.lyDoChuaGiao.cau], ["terms_exceed_price", CAU_CHUNG], `${as}: ${r.text}`);
    assert.ok(!/giá vốn/.test(r.text), `${as} thấy chữ «giá vốn»`);
  }
  const hdv = await w.call("POST", `/api/orders/${id}/delivered`, { as: T9_HDV, body: {} });
  assert.deepEqual([hdv.status, hdv.json.error.message], [409, CAU_CHUNG], hdv.text);
  const sup = await w.call("POST", `/api/orders/${id}/delivered`, { as: SUP, body: {} });
  assert.deepEqual([sup.status, sup.json.error.message], [409, CAU_KT], sup.text);
  // Nhánh lỗi CSDL (`commercial_exceeds_gross` — lớp kiểm trước bị vượt): đơn đủ mức, lô bị hỏng một dòng hoa hồng trước khi chạy.
  const w2 = await dungT9();
  const id2 = await daXacNhan(w2, `pty-${DT_A}`, [["IRESORT", 1_000_000]], DT_A);
  phanCongT9(w2, id2);
  await ghiT9(w2, SUP, id2, { soTien: 1_000_000, nguoiThu: "cong_ty" });
  for (const [as, cau] of [[T9_HDV, CAU_CHUNG], [SUP, "Mức hoa hồng / giá vốn cài cho đơn này vượt giá bán — Kế toán xem lại."]] as const) {
    w2.chenTruocLo((stmts: { sql: string }[]) => stmts.some((c) => /^UPDATE orders SET delivered_at/.test(c.sql)), (stmts: { sql: string; args: unknown[]; bind: (...a: unknown[]) => unknown }[]) => {
      const i = stmts.findIndex((c) => /^INSERT INTO bil_debt_line/.test(c.sql) && c.args[5] === "HOA_HONG");
      const a = [...stmts[i]!.args];
      a[4] = 1_000_001;
      stmts[i] = stmts[i]!.bind(...a) as (typeof stmts)[number];
    });
    const r = await w2.call("POST", `/api/orders/${id2}/delivered`, { as, body: {} });
    assert.deepEqual([r.status, r.json.error.message], [409, cau], `${as}: ${r.text}`);
  }
});

test("Task 9 (4) — M-5: đơn bị huỷ đúng lúc giữa hai lần đọc của «Đã giao» / màn tiền ⇒ «Đơn vừa thay đổi — tải lại trang rồi thử lại.», không phải câu «thiếu mức»", async () => {
  const w = await dungT9();
  const CAU = "Đơn vừa thay đổi — tải lại trang rồi thử lại.";
  for (const duong of ["delivered", "payments"] as const) {
    const id = await daXacNhan(w, `pty-${DT_A}`, [["HONTAM", 1_000_000]], DT_A);
    phanCongT9(w, id);
    await ghiT9(w, SUP, id, { soTien: 1_000_000, nguoiThu: "cong_ty" });
    // Lô đọc đơn đầy đủ của `phanThuongMaiCuaDon` (findOrder — sau `thongTinGiaoDon`): huỷ đơn ngay trước lô đó.
    w.chenTruocLo((stmts: { sql: string }[]) => stmts.length === 5 && stmts.some((c) => /FROM order_service/.test(c.sql)), () => {
      // Người khác huỷ đơn (trigger 0078 đòi lý do huỷ có trước).
      w.sqlite.prepare(`INSERT INTO ord_cancel_reason (id, order_id, reason_code, group_code, cancelled_date, created_at, created_by, updated_at, updated_by)
        VALUES (?, ?, 'KHACH_DOI_Y', 'KHACH_HUY', ?, ?, NULL, ?, NULL)`).run(uuid(), id, vnHomNay(), AT, AT);
      w.sqlite.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(id);
    });
    if (duong === "delivered") {
      const r = await w.call("POST", `/api/orders/${id}/delivered`, { as: T9_HDV, body: {} });
      assert.deepEqual([r.status, r.json.error.code, r.json.error.message], [409, "stale", CAU], r.text);
    } else {
      const r = await w.call("GET", `/api/orders/${id}/payments`, { as: SALES });
      assert.equal(r.status, 200, r.text);
      assert.deepEqual([r.json.lyDoChuaGiao?.ma, r.json.lyDoChuaGiao?.cau], ["stale", CAU], r.text);
    }
  }
});

test("Task 9 (5) — người kiểm Task 5: «thu cho» của tài khoản Đối tác ⇒ MỘT câu cho hồ sơ không phải nhà cung cấp và cho số vượt phần chưa thu (không dò được ai là nhà cung cấp); HDV vẫn nhận câu riêng; đơn xác nhận chưa chụp mức ⇒ câu «Chụp bù», không «không có đại lý đặt»", async () => {
  const w = await dungT9();
  const id = await daXacNhan(w, `pty-${DT_A}`, [["HONTAM", 1_000_000], ["IRESORT", 600_000]], DT_A);
  phanCongT9(w, id);
  const thuCho = (as: string, pid: string, soTien: number) => w.call("POST", `/api/orders/${id}/payments`, { as, body: { soTien, hinhThuc: "CASH", nguoiThu: "toi", thuChoNhaCungCapPartyId: pid } });
  const khongPhai = await thuCho(DT_A, `pty-${SALES}`, 100_000);
  const vuot = await thuCho(DT_A, "pty-ncc", 600_001);
  const sai = await thuCho(DT_A, "không hợp lệ!", 100_000);
  // Sửa 3 sau rà soát 24/10 (Ruling R-155): nay 403 «không dùng thu cho» trước mọi kiểm khác — vẫn MỘT câu, không số, không tên.
  assert.deepEqual([khongPhai.status, vuot.status, sai.status], [403, 403, 403]);
  assert.equal(khongPhai.json.error.message, vuot.json.error.message, "cùng một câu");
  assert.equal(sai.json.error.message, vuot.json.error.message);
  assert.doesNotMatch(vuot.text, /600\.000|nhà cung cấp/, vuot.text);
  // HDV (không giữ quyền Đối tác) vẫn nhận câu nói rõ.
  assert.match((await thuCho(T9_HDV, `pty-${SALES}`, 100_000)).json.error.message, /chỉ chọn được nhà cung cấp/);
  assert.match((await thuCho(T9_HDV, "pty-ncc", 600_001)).json.error.message, /600\.000 ₫/);
  // Đơn đại lý xác nhận trước khi có bảng mức (chưa chụp): «khách trả cho đại lý» ⇒ câu nói việc cần làm.
  const cu = nhap(w, SALES, `pty-${DT_A}`, [["HONTAM", 1_000_000]]);
  w.sqlite.prepare("UPDATE orders SET status = 'confirmed', confirmed_at = ?, updated_at = ? WHERE id = ?").run(AT, AT, cu);
  phanCongT9(w, cu);
  const k = await w.call("POST", `/api/orders/${cu}/payments`, { as: T9_HDV, body: { soTien: 100_000, hinhThuc: "CASH", nguoiThu: "ben_dat" } });
  assert.equal(k.status, 400, k.text);
  assert.equal(k.json.error.message, "Đơn xác nhận trước khi có bảng mức, chưa chụp mức — Kế toán bấm Chụp bù rồi mới ghi được khoản khách trả cho đại lý.");
});

test("Task 9 (6) — I-1 người kiểm Task 8+9: tài khoản lai Kế toán + Đối tác ⇒ thân 409 của «Hoàn thành» không tên / số người khác giữ; khối cọc của đơn huỷ không tên người giữ tiền (Kế toán thuần thấy — có răng)", async () => {
  const w = await dungT9();
  // (a) `POST /api/orders/:id/completed` trên đơn đã giao còn người giữ tiền (HDV 500.000, i-resort 120.000, Đại Lý A 140.000).
  const id = await donDaGiaoT9(w, DT_A);
  const kt = await w.call("POST", `/api/orders/${id}/completed`, { as: KT, body: {} });
  assert.equal(kt.status, 409, kt.text);
  assert.match(kt.json.error.message, /Nam Số Lạ 4817 còn 500\.000 ₫ chưa nộp/, "có răng: Kế toán thuần thấy tên và số");
  assert.match(kt.json.error.message, /i-resort còn 120\.000 ₫ chưa nộp/);
  const lai = await w.call("POST", `/api/orders/${id}/completed`, { as: T9_KTP, body: {} });
  assert.equal(lai.status, 409, lai.text);
  for (const cam of ["Nam Số Lạ", "4817", "i-resort", "Đại Lý A", "500.000", "120.000", "140.000"]) assert.ok(!lai.text.includes(cam), `lai thấy «${cam}»: ${lai.text}`);
  assert.match(lai.json.error.message, /còn khoản của bên khác — Kế toán xử lý/, lai.text);

  // (b) Khối cọc của đơn huỷ: HDV «Nam Số Lạ 4817» đang giữ 300.000 tiền khách trả trước.
  const huy = await daXacNhan(w, `pty-${DT_A}`, [["HONTAM", 1_000_000]], DT_A);
  phanCongT9(w, huy);
  await ghiT9(w, T9_HDV, huy, { soTien: 300_000, nguoiThu: "toi" });
  const c = await w.call("POST", `/api/orders/${huy}/status`, { as: SUP, body: { status: "cancelled", lyDo: "THOI_TIET" } });
  assert.equal(c.status, 200, c.text);
  const ktCoc = (await tienT9(w, huy, KT)).json.coc;
  assert.deepEqual(ktCoc.nguoiGiu, [{ ten: TEN_HDV, soTien: 300_000 }], "có răng: Kế toán thuần thấy người giữ tiền");
  const r = await tienT9(w, huy, T9_KTP);
  assert.equal(r.json.coc.nguoiGiu, null, `lai thấy người giữ: ${JSON.stringify(r.json.coc.nguoiGiu)}`);
  for (const cam of ["Nam Số Lạ", "4817"]) assert.ok(!r.text.includes(cam), `lai thấy «${cam}» ở màn tiền đơn huỷ: ${r.text}`);
});
