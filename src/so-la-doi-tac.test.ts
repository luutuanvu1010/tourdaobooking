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
  for (const [r, p] of [["r-dta", DT_A], ["r-dtb", DT_B]] as const) {
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
    w.sqlite.prepare(`INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`).run(s, id, i, code, `DV ${i}`, code ? "perPax" : "manual", vnHomNay());
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
  ];
  const trangThai: string[] = [];
  for (const [phuongThuc, duong] of bemat) {
    const r = await w.call(phuongThuc, duong, { as: DT_A });
    trangThai.push(`${r.status} ${duong}`);
    assert.ok(r.status < 500, `${duong} không được 5xx (bề mặt hỏng thì bài quét vô nghĩa): ${r.status} ${r.text}`);
    assert.deepEqual(soLaTrong(r.text), [], `${duong} (${r.status}) lộ số lạ: ${r.text}`);
  }
  // các bề mặt chính phải thật sự trả nội dung (không chỉ lỗi)
  assert.ok(trangThai.includes(`200 /api/orders/${cuaA}`) && trangThai.includes(`200 /api/orders/${cuaA}/thuong-mai`) && trangThai.includes("200 /api/orders"), trangThai.join(" | "));
  assert.ok(trangThai.includes(`403 /api/orders/${cuaB}`), "đơn của đại lý khác bị từ chối");

  // ---- Danh sách trắng: DTO của Đối tác không có khoá nào của tỷ lệ / đ/khách / giá vốn / nguồn.
  const khoaCam = khoaCua(doc.json).filter((k) => /rate|perPax|cost|ruleId|termId|source|supplier/i.test(k));
  assert.deepEqual(khoaCam, [], "DTO Đối tác không có khoá tỷ lệ / đ/khách / giá vốn / mã mức / mã điều khoản / nguồn / nhà cung cấp");

  // ---- Lịch sử đơn của Đối tác: không dòng order_terms_* nào (kể cả order_terms_captured).
  const chiTiet = await w.call("GET", `/api/orders/${cuaA}`, { as: DT_A });
  assert.ok(chiTiet.json.history.length > 0, "lịch sử vẫn có các dòng khác (đơn đã tạo, xác nhận)");
  assert.deepEqual(chiTiet.json.history.map((e: { action: string }) => e.action).filter((a: string) => a.startsWith("order_terms_")), []);
  assert.ok(nkVanPhong.json.history.some((e: { action: string }) => e.action === "order_terms_captured"), "văn phòng vẫn thấy dòng đã chụp mức");
});

test("số lạ: tài khoản lai Bán hàng + Đối tác (chủ đơn) cũng không thấy số lạ ở đơn của mình — chi tiết, lịch sử, phần đối tác, biên nhận, danh sách", async () => {
  const w = setup();
  await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-dla', 'ORGANIZATION', 'Đại lý C', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-dla', 'pty-dla', 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(AT, AT);
  w.sqlite.prepare(`INSERT INTO prc_supply_term (id, scope, catalog_code, seller_party_id, supplier_party_id, cost_rate_bp, valid_from_date, created_at, updated_at)
    VALUES ('st-ncc', 'SERVICE', 'HONTAM', 'pty-ncc', 'pty-ncc', 4817, '2026-01-01', ?, ?)`).run(AT, AT);
  const id = await daXacNhan(w, "pty-dla", [["HONTAM", GIA_DON]], LAI_BAN);
  const ghi = await w.call("POST", `/api/orders/${id}/thuong-mai/${id}-s0`, { as: KT, body: { lyDo: "Thoả thuận riêng với đại lý này", hoaHong: { kieu: "RATE", tyLeBp: 4817 } } });
  assert.equal(ghi.status, 200, ghi.text);
  for (const duong of ["/api/orders", `/api/orders/${id}`, `/api/orders/${id}/thuong-mai`, `/api/orders/${id}/receipt`, `/api/orders/${id}/qr-thanh-toan`, "/api/thong-bao", "/api/thong-bao/tom-tat"]) {
    const r = await w.call("GET", duong, { as: LAI_BAN });
    assert.ok(r.status < 500, `${duong}: ${r.status} ${r.text}`);
    assert.deepEqual(soLaTrong(r.text), [], `${duong} (${r.status}) lộ số lạ cho tài khoản lai: ${r.text}`);
  }
  const chiTiet = await w.call("GET", `/api/orders/${id}`, { as: LAI_BAN });
  assert.equal(chiTiet.status, 200, chiTiet.text);
  assert.ok(chiTiet.json.history.length > 0);
  assert.deepEqual(chiTiet.json.history.filter((e: { action: string }) => e.action.startsWith("order_terms_")), []);
  const doc = await w.call("GET", `/api/orders/${id}/thuong-mai`, { as: LAI_BAN });
  assert.deepEqual(Object.keys(doc.json), ["doiTac"]);
  assert.equal(doc.json.doiTac.dong[0].hoaHong, 963_400);
});

test("số lạ: nhật ký ghi mức KHÔNG sinh thông báo / tin Bảng tin — không hành động order_terms_* nào nằm trong các danh sách sinh tin", () => {
  assert.deepEqual((HANH_DONG_TIN_DON as readonly string[]).filter((a) => a.startsWith("order_terms_")), [], "hộp thông báo của đơn");
  assert.deepEqual((HANH_DONG_TIN_CHUYEN as readonly string[]).filter((a) => a.startsWith("order_terms_")), [], "tin chuyến");
  const rungMay = THAY_DOI.map((t) => hanhDongCuaThayDoi(t)).filter((a): a is string => a !== null);
  assert.deepEqual(rungMay.filter((a) => a.startsWith("order_terms_")), [], "cú gõ cửa màn hình khoá");
  assert.equal(hanhDongCuaThayDoi("tien"), null, "đổi tiền (kể cả ghi mức tay) không gõ cửa máy nào");
});
