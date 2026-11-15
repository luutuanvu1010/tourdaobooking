// Sổ đại lý đợt 2, Task 7 — trần giảm giá theo NGƯỜI HƯỞNG của đơn (ADR-0079 điều 8, 9; C8 = A, C11 = A; đặc tả P7; trang ghép §7). Route thật qua khung thử
// (ứng dụng thật + SQLite dựng từ migrations):
//  - đơn CÓ người hưởng ⇒ trần = tổng hoa hồng của đơn cho MỌI người sửa đơn (Bán hàng, Quản trị, Đối tác) — 400 `discount_exceeds_commission`, câu «Giảm tối đa X ₫ (bằng hoa hồng
//    của đơn).»; Thực tập vẫn 0 (403 câu cũ); nháp tính theo bảng mức hôm nay, dòng thiếu mức tính 0; Xác nhận tính bản chụp TRƯỚC, kiểm trần SAU;
//  - đơn KHÔNG người hưởng ⇒ luật hôm nay (Đối tác kể cả lai 0, Thực tập 0, Bán hàng không trần — vá DK-T3-01 giữ nguyên);
//  - sau Xác nhận bớt khách làm hoa hồng < giảm giá ⇒ không chặn, chi tiết đơn có `canhBaoGiamGia: { vuot }` (chỉ người xem được phần thương mại);
//  - đổi bên đặt sau Xác nhận sang bên đặt có người hưởng mà giảm giá > tổng hoa hồng mới ⇒ 409 `discount_exceeds_commission` nêu hai số, bên đặt không đổi.
// Mức hoa hồng dùng mức RIÊNG từng đại lý (`DOI_TAC`) để số tiền xác định, không phụ thuộc mức theo vai / mức TA gieo sẵn.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const U = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const SALES = U(1), ADMIN = U(2), KT = U(3), DT = U(4), DT0 = U(5), LAI = U(6), INTERN = U(7);
const DLA = "dda00000-0000-4000-8000-000000000001"; // đại lý A — 10% mọi dịch vụ
const DLB = "dda00000-0000-4000-8000-000000000002"; // đại lý B — 10% mọi dịch vụ
const DLC = "dda00000-0000-4000-8000-000000000003"; // đại lý C — 15% mọi dịch vụ
const DLD = "dda00000-0000-4000-8000-000000000004"; // đại lý D — 10% CHỈ cho ZA1 (ZA2 thiếu mức)
const AT = "2026-10-01T00:00:00.000Z";
const CAU_THUC_TAP = "Tài khoản Thực tập chỉ dùng giá danh mục, không giảm giá — nhờ nhân viên Bán hàng nếu cần giá khác.";
const CAU_GIAM_DOI_TAC = "Tài khoản đối tác không giảm giá được trên đơn này: chỉ đơn mà chính bạn được hưởng hoa hồng mới giảm được, tối đa bằng hoa hồng đó. Muốn giảm cho khách, nhờ văn phòng.";

type W = ReturnType<typeof world>;
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
function toChuc(w: W, id: string, ten: string): void {
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(`r-${id}`, id, AT, AT);
}
const muc = async (w: W, partyId: string, tyLeBp: number, catalogCode?: string) => {
  const r = await w.call("POST", "/api/pricing/hoa-hong", {
    as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "DOI_TAC", partyId }, ...(catalogCode ? { phamVi: "SERVICE", catalogCode } : { phamVi: "ALL" }), kieu: "RATE", tyLeBp },
  });
  assert.equal(r.status, 201, r.text);
};
async function setup(): Promise<W> {
  const w = world();
  const ai: [string, string, string[]][] = [
    [SALES, "0900000001", ["SALES"]], [ADMIN, "0900000002", ["ADMIN"]], [KT, "0900000003", ["ACCOUNTING"]], [DT, "0900000004", ["PARTNER"]],
    [DT0, "0900000005", ["PARTNER"]], [LAI, "0900000006", ["SALES", "PARTNER"]], [INTERN, "0900000007", ["INTERN"]],
  ];
  for (const [id, phone, perms] of ai) seedStaff(w.sqlite, { id, phone, name: `NV ${phone.slice(-1)}`, perms, ...(id === DT0 ? { kieuCu: true } : {}) });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 790000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA2', 'Tour lặn', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  toChuc(w, DLA, "Đại lý A");
  toChuc(w, DLB, "Đại lý B");
  toChuc(w, DLC, "Đại lý C");
  toChuc(w, DLD, "Đại lý D");
  // Đối tác DT: hồ sơ cá nhân mang vai được hưởng ⇒ bên đặt luôn là chính hồ sơ đó (sổ đại lý đợt 1). DT0 (tài khoản Đối tác kiểu cũ — ADR-0185), LAI: hồ sơ không mang vai được hưởng ⇒ đơn khách lẻ.
  await muc(w, DLA, 1000);
  await muc(w, DLB, 1000);
  await muc(w, DLC, 1500);
  await muc(w, DLD, 1000, "ZA1");
  await muc(w, `pty-${DT}`, 1000);
  return w;
}
const dv = (code: "ZA1" | "ZA2", adult: number) => ({
  kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: code, pax: { adult, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: code === "ZA1" ? 790000 : 500000 }, departDate: inDays(3),
});
const than = (services: unknown[], extra: Record<string, unknown> = {}) => ({ customerName: "Khách Thử", customerPhone: "0912345678", services, ...extra });
/** C-5: 10 người lớn × 790.000 = 7.900.000; 10% ⇒ hoa hồng 790.000. */
const C5 = [dv("ZA1", 10)];
const lap = (w: W, as: string, services: unknown[], extra: Record<string, unknown> = {}) => w.call("POST", "/api/orders", { as, body: than(services, extra) });
const xacNhan = (w: W, id: string, as = SALES) => w.xacNhanDon(id, as); // ADR-0136 Đ13.5: Đối tác «Gửi đơn», người khác /status
const dem = (w: W, sql: string, ...a: unknown[]): number => Number(w.q(sql, ...a)[0].n);
const soDon = (w: W) => dem(w, "SELECT count(*) AS n FROM orders");
const tran = (r: { status: number; json: any; text: string }, x: string, ten = "") => {
  assert.equal(r.status, 400, `${ten} ${r.text}`);
  assert.equal(r.json.error.code, "discount_exceeds_commission", ten);
  assert.equal(r.json.error.message, `Giảm tối đa ${x} ₫ (bằng hoa hồng của đơn).`, ten);
};
const cam = (r: { status: number; json: any; text: string }, cau: string, ten = "") => {
  assert.equal(r.status, 403, `${ten} ${r.text}`);
  assert.equal(r.json.error.code, "forbidden", ten);
  assert.equal(r.json.error.message, cau, ten);
};
/** Đặt giảm giá đã lưu của đơn NHÁP bằng SQL (giữ trigger total = subtotal − discount). */
const datGiam = (w: W, id: string, giam: number) =>
  w.sqlite.prepare("UPDATE orders SET discount = ?, total = subtotal - ?, remaining_amount = subtotal - ? - deposit_amount WHERE id = ?").run(giam, giam, giam, id);

test("C-5 (ADR-0079): đơn đại lý hoa hồng 790.000 — Bán hàng, Quản trị, Đối tác giảm 800.000 ⇒ 400 «Giảm tối đa 790.000 ₫ …», không lưu; giảm 790.000 ⇒ 201", async () => {
  const w = await setup();
  for (const [ten, who, extra] of [["Bán hàng", SALES, { bookerPartyId: DLA }], ["Quản trị", ADMIN, { bookerPartyId: DLA }], ["Đối tác (đơn của chính mình)", DT, {}]] as const) {
    const truoc = soDon(w);
    tran(await lap(w, who, C5, { ...extra, discount: 800000 }), "790.000", ten);
    assert.equal(soDon(w), truoc, `${ten}: bị từ chối thì không lưu đơn`);
    const r = await lap(w, who, C5, { ...extra, discount: 790000 });
    assert.equal(r.status, 201, `${ten}: ${r.text}`);
    assert.equal(r.json.order.discount, 790000);
    assert.ok(r.json.order.bookerPartyId === DLA || r.json.order.bookerPartyId === `pty-${DT}`, ten);
  }
});

test("B-5 ở lưu nháp (PUT): hoa hồng 100.000 — giảm 150.000 ⇒ 400, đơn không đổi; giảm 20.000 ⇒ 200", async () => {
  const w = await setup();
  const r0 = await lap(w, SALES, [dv("ZA2", 2)], { bookerPartyId: DLA });
  assert.equal(r0.status, 201, r0.text);
  const don = r0.json.order;
  const sua = (giam: number) => w.call("PUT", `/api/orders/${don.id}`, {
    as: SALES, body: than([{ ...dv("ZA2", 2), id: don.services[0].id }], { bookerPartyId: DLA, discount: giam, expectedUpdatedAt: don.updatedAt }),
  });
  tran(await sua(150000), "100.000", "B-5");
  assert.equal(w.q("SELECT discount, updated_at FROM orders WHERE id = ?", don.id)[0].discount, 0, "bị từ chối thì đơn không đổi");
  const r = await sua(20000);
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.order.discount, 20000);
});

test("nháp: dòng thiếu mức tính 0 — ZA1 có mức 10% (79.000), ZA2 thiếu mức ⇒ trần 79.000", async () => {
  const w = await setup();
  tran(await lap(w, SALES, [dv("ZA1", 1), dv("ZA2", 2)], { bookerPartyId: DLD, discount: 79001 }), "79.000");
  assert.equal((await lap(w, SALES, [dv("ZA1", 1), dv("ZA2", 2)], { bookerPartyId: DLD, discount: 79000 })).status, 201);
});

test("Thực tập trên đơn có người hưởng ⇒ trần 0 (403 câu của Thực tập); giảm 0 ⇒ 201", async () => {
  const w = await setup();
  cam(await lap(w, INTERN, C5, { bookerPartyId: DLA, discount: 1 }), CAU_THUC_TAP, "Thực tập");
  assert.equal((await lap(w, INTERN, C5, { bookerPartyId: DLA })).status, 201);
});

test("đơn KHÔNG người hưởng giữ luật hôm nay: Đối tác và tài khoản lai Bán hàng + Đối tác ⇒ trần 0 (403 câu cũ); Bán hàng ⇒ không trần", async () => {
  const w = await setup();
  cam(await lap(w, DT0, C5, { discount: 1 }), CAU_GIAM_DOI_TAC, "Đối tác không người hưởng");
  cam(await lap(w, LAI, C5, { discount: 1 }), CAU_GIAM_DOI_TAC, "tài khoản lai, đơn khách lẻ");
  const r = await lap(w, SALES, C5, { discount: 5_000_000 });
  assert.equal(r.status, 201, `Bán hàng khách lẻ giảm 5.000.000: ${r.text}`);
});

test("Xác nhận: tính bản chụp TRƯỚC, kiểm trần SAU — nháp khách lẻ giảm 800.000 rồi gắn đại lý (SQL) ⇒ 400, vẫn nháp, không bản chụp; giảm 790.000 ⇒ 200", async () => {
  const w = await setup();
  const r0 = await lap(w, SALES, C5, { discount: 800000 });
  assert.equal(r0.status, 201, r0.text);
  const id = r0.json.order.id;
  w.sqlite.prepare("UPDATE orders SET booker_party_id = ? WHERE id = ?").run(DLA, id);
  tran(await xacNhan(w, id), "790.000", "xác nhận");
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "draft");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", id), 0, "không bản chụp nào");
  datGiam(w, id, 790000);
  assert.equal((await xacNhan(w, id)).status, 200);
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", id), 1);
});

// ADR-0185 Đ1: đơn khách lẻ của Đối tác là đơn «không người hưởng» — cổng vai trò đứng ngay sau luật bán, TRƯỚC trần giảm giá ⇒ 409 thay cho 403 câu cũ. Câu cũ (DK-T3-01) ở bước
// xác nhận vẫn canh ở bài I-1 dưới (đơn có đại lý KHÁC làm bên đặt — qua cổng vai trò); ở lập đơn / lưu nháp vẫn như cũ.
test("Xác nhận: Đối tác kiểu cũ (đơn khách lẻ) có giảm giá đã lưu ⇒ 409 doi_tac_chua_co_vai_tro (cổng vai trò đứng trước trần giảm giá), đơn vẫn nháp", async () => {
  const w = await setup();
  const r0 = await lap(w, DT0, C5);
  assert.equal(r0.status, 201, r0.text);
  datGiam(w, r0.json.order.id, 5000);
  const xn = await xacNhan(w, r0.json.order.id, DT0);
  assert.equal(xn.status, 409, xn.text);
  assert.equal(xn.json.error.code, "doi_tac_chua_co_vai_tro");
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", r0.json.order.id)[0].status, "draft");
});

test("sau Xác nhận: bớt khách làm hoa hồng < giảm giá ⇒ KHÔNG chặn; chi tiết đơn có canhBaoGiamGia { vuot } cho văn phòng; tài khoản lai Đối tác không thấy; khách lẻ null", async () => {
  const w = await setup();
  const r0 = await lap(w, SALES, C5, { bookerPartyId: DLA, discount: 790000 });
  assert.equal(r0.status, 201, r0.text);
  const id = r0.json.order.id;
  assert.equal((await xacNhan(w, id)).status, 200);
  const chiTiet = async (as: string) => (await w.call("GET", `/api/orders/${id}`, { as })).json;
  assert.equal((await chiTiet(SALES)).canhBaoGiamGia, null, "giảm bằng hoa hồng: không cảnh báo");
  const sua = await w.call("POST", `/api/orders/${id}/money-edit`, { as: KT, body: { lyDo: "BOT_NGUOI", services: [{ id: r0.json.order.services[0].id, pax: { adult: 5, child: 0, senior: 0, infant: 0 } }] } });
  assert.equal(sua.status, 200, `bớt khách không bị chặn: ${sua.text}`);
  // 5 × 790.000 = 3.950.000; hoa hồng 395.000; giảm giá hiệu lực 790.000 ⇒ vượt 395.000.
  assert.deepEqual((await chiTiet(SALES)).canhBaoGiamGia, { vuot: 395000 });
  assert.deepEqual((await chiTiet(KT)).canhBaoGiamGia, { vuot: 395000 });
  const lai = await w.call("GET", `/api/orders/${id}`, { as: LAI });
  assert.equal(lai.status, 200, `tài khoản lai Bán hàng + Đối tác mở được đơn (ô Bán hàng): ${lai.text}`);
  assert.equal(lai.json.canhBaoGiamGia, null, "tài khoản lai Đối tác không thấy số suy ra hoa hồng của đại lý khác");
  const kl = await lap(w, SALES, C5, { discount: 790000 });
  assert.equal((await xacNhan(w, kl.json.order.id)).status, 200);
  assert.equal((await w.call("GET", `/api/orders/${kl.json.order.id}`, { as: SALES })).json.canhBaoGiamGia, null, "khách lẻ: không cảnh báo theo hoa hồng");
});

test("đổi bên đặt sau Xác nhận: khách lẻ giảm 300.000 → đại lý hoa hồng 200.000 ⇒ 409 nêu hai số, bên đặt không đổi, không bản chụp mới; → đại lý hoa hồng 300.000 ⇒ 200", async () => {
  const w = await setup();
  const r0 = await lap(w, SALES, [dv("ZA2", 4)], { discount: 300000 }); // 4 × 500.000 = 2.000.000
  assert.equal(r0.status, 201, r0.text);
  const id = r0.json.order.id;
  assert.equal((await xacNhan(w, id)).status, 200);
  const chupTruoc = dem(w, "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", id);
  const doi = (ben: string) => w.call("PUT", `/api/orders/${id}/booker`, {
    as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: ben, expectedUpdatedAt: w.q("SELECT updated_at AS u FROM orders WHERE id = ?", id)[0].u },
  });
  const r = await doi(DLB); // 10% của 2.000.000 = 200.000
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "discount_exceeds_commission");
  assert.match(r.json.error.message, /300\.000 ₫/);
  assert.match(r.json.error.message, /200\.000 ₫/);
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", id)[0].b, null, "bên đặt không đổi");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", id), chupTruoc, "không chụp lại");
  const ok = await doi(DLC); // 15% của 2.000.000 = 300.000
  assert.equal(ok.status, 200, ok.text);
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", id)[0].b, DLC);
});

// ---- Vòng sửa theo người kiểm Task 7 (I-1, M-1) ----
test("I-1: Đối tác không được hưởng / tài khoản lai Bán hàng + Đối tác sửa nháp mà văn phòng đã gắn đại lý KHÁC (DLA) ⇒ 403 câu cũ, không lộ số hoa hồng — lưu nháp và Xác nhận", async () => {
  const w = await setup();
  for (const [ten, who] of [["Đối tác không được hưởng", DT0], ["tài khoản lai Bán hàng + Đối tác", LAI]] as const) {
    const r0 = await lap(w, who, C5);
    assert.equal(r0.status, 201, `${ten}: ${r0.text}`);
    const id = r0.json.order.id;
    // Văn phòng gắn bên đặt DLA. ADR-0135: Quản trị KHÔNG ghi được nháp của người khác (route → 404) → gieo thẳng cột, như thể văn phòng đã gắn từ trước.
    assert.equal((await w.call("PUT", `/api/orders/${id}`, {
      as: ADMIN, body: than([{ ...dv("ZA1", 10), id: r0.json.order.services[0].id }], { bookerPartyId: DLA, expectedUpdatedAt: w.q("SELECT updated_at AS u FROM orders WHERE id = ?", id)[0].u }),
    })).status, 404, `${ten}: Quản trị gắn DLA vào nháp người khác → 404`);
    const moc = new Date(Date.now() + 1000).toISOString();
    w.sqlite.prepare("UPDATE orders SET booker_party_id = ?, updated_at = ? WHERE id = ?").run(DLA, moc, id);
    const gan = { status: 200, json: { order: { services: r0.json.order.services, updatedAt: moc } }, text: "" };
    assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", id)[0].b, DLA);
    const sua = await w.call("PUT", `/api/orders/${id}`, {
      as: who, body: than([{ ...dv("ZA1", 10), id: gan.json.order.services[0].id }], { discount: 790000, expectedUpdatedAt: gan.json.order.updatedAt }),
    });
    cam(sua, CAU_GIAM_DOI_TAC, `${ten}, lưu nháp giảm 790.000`);
    assert.doesNotMatch(sua.text, /790\.000/, `${ten}: câu không lộ số hoa hồng của đại lý`);
    assert.equal(w.q("SELECT discount FROM orders WHERE id = ?", id)[0].discount, 0, `${ten}: đơn không đổi`);
    datGiam(w, id, 790000);
    const xn = await xacNhan(w, id, who);
    cam(xn, CAU_GIAM_DOI_TAC, `${ten}, xác nhận`);
    assert.doesNotMatch(xn.text, /790\.000/);
    assert.equal(w.q("SELECT status FROM orders WHERE id = ?", id)[0].status, "draft");
  }
});

test("M-1: bên đặt mang vai bên ngoài không còn được hưởng (KHONG_HUONG — loại vai được hưởng bị tắt sau khi gắn) ⇒ Xác nhận 400 câu riêng, không «Giảm tối đa 0 ₫»", async () => {
  const w = await setup();
  const r0 = await lap(w, SALES, C5, { bookerPartyId: DLB });
  assert.equal(r0.status, 201, r0.text);
  datGiam(w, r0.json.order.id, 1);
  w.sqlite.prepare("UPDATE prc_beneficiary_role SET active = 0 WHERE role_type_code = 'TRAVEL_AGENCY'").run();
  const xn = await xacNhan(w, r0.json.order.id);
  assert.equal(xn.status, 400, xn.text);
  assert.equal(xn.json.error.code, "discount_exceeds_commission");
  assert.equal(xn.json.error.message, "Chưa giảm giá được: bên đặt không còn được hưởng hoa hồng — nhờ văn phòng sửa bên đặt hoặc Kế toán ghi mức.");
  assert.equal(w.q("SELECT status FROM orders WHERE id = ?", r0.json.order.id)[0].status, "draft");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// ADR-0161 Đ5 (kế hoạch 2026-11-03-chinh-sach-chiet-khau-bon-truc, Task 3) — trần giảm giá KHÔNG tính dòng có hoa hồng vượt thành tiền của dòng.
// Đầu vào và đáp án ba ca đọc từ sổ vàng golden/tran-giam-gia-dong-vuot.json (số do AI soạn, chờ Kế toán xác nhận). Dòng vượt tính 0; BẰNG thành tiền vẫn tính.
// ---------------------------------------------------------------------------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as H from "../../shared/hoa-hong-dong.ts";

interface DichVuVang { ma: string; ten: string; gia_moi_khach: number; so_khach: number }
interface DauVaoVang { dich_vu: DichVuVang[]; muc_tat_ca: { kieu: "PER_PAX"; moi_khach: number }; muc_rieng_dich_vu: { ma: string; kieu: "RATE"; ty_le_bp: number }[] }
interface CaVang {
  ma: string; mo_ta: string; xac_nhan: { trang_thai: string; nguoi: string | null; ngay: string | null }; dau_vao: DauVaoVang;
  dap_an: { thanh_tien_don: number; hoa_hong_goc: number; hoa_hong_tinh_tran: number; co_dong_vuot: boolean; tran_giam_gia: number; cau_khi_giam_vuot_tran: string };
}
const cacCa = (JSON.parse(readFileSync(fileURLToPath(new URL("../../../golden/tran-giam-gia-dong-vuot.json", import.meta.url)), "utf8")) as { cac_ca: CaVang[] }).cac_ca;
const DLE = "dda00000-0000-4000-8000-000000000005"; // đại lý E — mức theo từng ca của sổ vàng
const DTV = U(8); // tài khoản Đối tác được hưởng, mức theo từng ca của sổ vàng
const CAU_VUOT_0 = "Chưa giảm giá được: mức hoa hồng của dịch vụ trong đơn đang vượt giá bán — nhờ Kế toán xem lại.";
const VE: DichVuVang = cacCa[2]!.dau_vao.dich_vu[0]!;
const TOUR: DichVuVang = cacCa[2]!.dau_vao.dich_vu[1]!;

/** Hoa hồng gốc từng dòng của một ca, tính tay bằng số học (không qua mã dưới kiểm): mức riêng của dịch vụ thắng mức «tất cả». */
const dongTinhTay = (d: DauVaoVang) => d.dich_vu.map((x) => {
  const thanhTien = x.gia_moi_khach * x.so_khach;
  const rieng = d.muc_rieng_dich_vu.find((m) => m.ma === x.ma);
  return { hoaHong: rieng ? (thanhTien * rieng.ty_le_bp) / 10_000 : d.muc_tat_ca.moi_khach * x.so_khach, thanhTien };
});
/** Đơn thử: catalog theo `dich_vu` của ca; đại lý E và tài khoản Đối tác DTV (hồ sơ được hưởng) cùng mang mức của ca; mức «riêng dịch vụ» là phần trăm nên không vướng so vượt giá lúc nhập. */
async function setupVuot(d: DauVaoVang): Promise<W> {
  const w = await setup();
  seedStaff(w.sqlite, { id: DTV, phone: "0900000008", name: "NV 8", perms: ["PARTNER"] });
  toChuc(w, DLE, "Đại lý E");
  for (const x of d.dich_vu) {
    w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', ?, 1, '2026-01-01', '2026-01-01')").run(x.ma, x.ten, x.gia_moi_khach);
  }
  for (const ben of [DLE, `pty-${DTV}`]) {
    const doiTuong = { loai: "DOI_TAC", partyId: ben };
    const tat = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong, phamVi: "ALL", kieu: "PER_PAX", moiKhach: d.muc_tat_ca.moi_khach } });
    assert.equal(tat.status, 201, tat.text);
    for (const m of d.muc_rieng_dich_vu) {
      const r = await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong, phamVi: "SERVICE", catalogCode: m.ma, kieu: "RATE", tyLeBp: m.ty_le_bp } });
      assert.equal(r.status, 201, r.text);
    }
  }
  return w;
}
const dvVang = (x: DichVuVang) => ({
  kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: x.ma, pax: { adult: x.so_khach, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: x.gia_moi_khach }, departDate: inDays(3),
});
const nhanCau = (r: { status: number; json: any; text: string }, cau: string, ten = "") => {
  assert.equal(r.status, 400, `${ten} ${r.text}`);
  assert.equal(r.json.error.code, "discount_exceeds_commission", ten);
  assert.equal(r.json.error.message, cau, ten);
};

test("sổ vàng trần giảm giá LỚP 1: ba ca (chờ xác nhận hoặc đã xác nhận), đáp án tự cân với tính tay và với luật thuần (dòng vượt tính 0, bằng thì tính)", () => {
  assert.deepEqual(cacCa.map((c) => c.ma), ["SV-TG-01", "SV-TG-02", "SV-TG-03"]);
  for (const c of cacCa) {
    // Khuôn so-vang-dat-coc.test.ts: ca chờ xác nhận thì không có tên người; ca đã xác nhận thì đòi người và ngày (người xác nhận chỉ sửa JSON, bài không phải sửa).
    if (c.xac_nhan.trang_thai === "cho_xac_nhan") assert.equal(c.xac_nhan.nguoi, null, c.ma);
    else assert.ok(c.xac_nhan.nguoi && c.xac_nhan.ngay, c.ma);
    const dong = dongTinhTay(c.dau_vao);
    assert.equal(dong.reduce((s, d) => s + d.thanhTien, 0), c.dap_an.thanh_tien_don, `${c.ma}: thành tiền`);
    assert.equal(dong.reduce((s, d) => s + d.hoaHong, 0), c.dap_an.hoa_hong_goc, `${c.ma}: hoa hồng gốc`);
    assert.equal(H.tongTinhTran(dong), c.dap_an.hoa_hong_tinh_tran, `${c.ma}: hoa hồng tính vào trần`);
    assert.equal(H.tongTinhTran(dong), c.dap_an.tran_giam_gia, `${c.ma}: trần`);
    assert.equal(dong.some(H.dongVuotThanhTien), c.dap_an.co_dong_vuot, `${c.ma}: có dòng vượt`);
  }
});

test("luật thuần: vượt khi LỚN HƠN thành tiền (bằng thì không); dòng vượt tính 0; thiếu mức thì không có tổng", () => {
  assert.equal(H.dongVuotThanhTien({ hoaHong: 600_001, thanhTien: 600_000 }), true);
  assert.equal(H.dongVuotThanhTien({ hoaHong: 600_000, thanhTien: 600_000 }), false, "bằng thành tiền không vượt");
  assert.equal(H.dongVuotThanhTien({ hoaHong: null, thanhTien: 600_000 }), false, "thiếu mức không phải vượt");
  assert.equal(H.hoaHongTinhTran({ hoaHong: 600_001, thanhTien: 600_000 }), 0);
  assert.equal(H.hoaHongTinhTran({ hoaHong: 600_000, thanhTien: 600_000 }), 600_000, "bằng thành tiền vẫn tính vào trần");
  assert.equal(H.hoaHongTinhTran({ hoaHong: null, thanhTien: 600_000 }), 0, "thiếu mức tính 0 như cũ");
  assert.equal(H.hoaHongTinhTran({ hoaHong: 0, thanhTien: 0 }), 0);
  assert.equal(H.tongTinhTran([{ hoaHong: 1_000_000, thanhTien: 600_000 }, { hoaHong: 300_000, thanhTien: 2_000_000 }]), 300_000);
  assert.equal(H.tongTinhTran([{ hoaHong: 300_000, thanhTien: 2_000_000 }, { hoaHong: null, thanhTien: 100_000 }]), null, "còn dòng thiếu mức ⇒ null");
  assert.equal(H.tongTinhTran([]), 0);
});

for (const c of cacCa) {
  test(`sổ vàng trần giảm giá LỚP 2: ${c.ma} — Bán hàng và Đối tác: giảm ${c.dap_an.tran_giam_gia} nhận, +1 ₫ ⇒ 400 đúng câu của sổ vàng; lập, lưu nháp rồi Xác nhận cùng một trần`, async () => {
    const w = await setupVuot(c.dau_vao);
    const dvs = c.dau_vao.dich_vu.map(dvVang);
    const tran = c.dap_an.tran_giam_gia;
    for (const [ten, who, extra] of [["Bán hàng", SALES, { bookerPartyId: DLE }], ["Đối tác (đơn của chính mình)", DTV, {}]] as const) {
      const truoc = soDon(w);
      nhanCau(await lap(w, who, dvs, { ...extra, discount: tran + 1 }), c.dap_an.cau_khi_giam_vuot_tran, `${ten}: lập quá trần 1 ₫`);
      assert.equal(soDon(w), truoc, `${ten}: bị từ chối thì không lưu đơn`);
      // lưu nháp (PUT)
      const nhap = await lap(w, who, dvs, extra);
      assert.equal(nhap.status, 201, `${ten}: giảm 0 lập được: ${nhap.text}`);
      const sua = (giam: number) => w.call("PUT", `/api/orders/${nhap.json.order.id}`, {
        as: who, body: than(dvs.map((d, i) => ({ ...d, id: nhap.json.order.services[i].id })), { ...extra, discount: giam, expectedUpdatedAt: w.q("SELECT updated_at AS u FROM orders WHERE id = ?", nhap.json.order.id)[0].u }),
      });
      nhanCau(await sua(tran + 1), c.dap_an.cau_khi_giam_vuot_tran, `${ten}: lưu nháp quá trần 1 ₫`);
      assert.equal(w.q("SELECT discount FROM orders WHERE id = ?", nhap.json.order.id)[0].discount, 0, `${ten}: nháp không đổi`);
      // Xác nhận kiểm trần SAU khi tính bản chụp: nháp bị gieo giảm quá trần 1 ₫ (SQL) ⇒ 400 cùng câu, vẫn nháp
      datGiam(w, nhap.json.order.id, tran + 1);
      nhanCau(await xacNhan(w, nhap.json.order.id, who), c.dap_an.cau_khi_giam_vuot_tran, `${ten}: xác nhận quá trần 1 ₫`);
      assert.equal(w.q("SELECT status FROM orders WHERE id = ?", nhap.json.order.id)[0].status, "draft");
      // đúng trần: lưu được và gửi / xác nhận được
      datGiam(w, nhap.json.order.id, tran);
      const xn = await xacNhan(w, nhap.json.order.id, who);
      assert.equal(xn.status, 200, `${ten}: đúng trần ${tran} xác nhận được: ${xn.text}`);
      const dung = await lap(w, who, dvs, { ...extra, discount: tran });
      assert.equal(dung.status, 201, `${ten}: lập đúng trần: ${dung.text}`);
    }
  });
}

test("hoa hồng đúng BẰNG thành tiền vẫn tính vào trần: vé 2 × 300.000 mức 300.000 mỗi khách (= thành tiền) + tour 300.000 ⇒ trần 900.000, câu cũ", async () => {
  const w = await setupVuot({ dich_vu: [VE, TOUR], muc_tat_ca: { kieu: "PER_PAX", moi_khach: 300_000 }, muc_rieng_dich_vu: cacCa[2]!.dau_vao.muc_rieng_dich_vu });
  const dvs = [dvVang(VE), dvVang(TOUR)];
  for (const [ten, who, extra] of [["Bán hàng", SALES, { bookerPartyId: DLE }], ["Đối tác", DTV, {}]] as const) {
    nhanCau(await lap(w, who, dvs, { ...extra, discount: 900_001 }), "Giảm tối đa 900.000 ₫ (bằng hoa hồng của đơn).", ten);
    const r = await lap(w, who, dvs, { ...extra, discount: 900_000 });
    assert.equal(r.status, 201, `${ten}: ${r.text}`);
  }
});

test("đổi bên đặt sau Xác nhận sang đại lý có dòng vượt, đơn đang giảm: 409 discount_exceeds_commission, nêu hai số và câu nhắc Kế toán xem lại; bên đặt không đổi", async () => {
  const w = await setupVuot(cacCa[1]!.dau_vao); // mức 500.000 mỗi khách cho vé 2 × 300.000 ⇒ hoa hồng gốc 1.000.000 > 600.000 ⇒ tính 0
  const r0 = await lap(w, SALES, [dvVang(VE)], { discount: 100_000 }); // khách lẻ giảm 100.000
  assert.equal(r0.status, 201, r0.text);
  const id = r0.json.order.id;
  assert.equal((await xacNhan(w, id)).status, 200);
  const chupTruoc = dem(w, "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", id);
  const r = await w.call("PUT", `/api/orders/${id}/booker`, {
    as: SALES, body: { customerName: "Khách Thử", customerPhone: "0912345678", bookerPartyId: DLE, expectedUpdatedAt: w.q("SELECT updated_at AS u FROM orders WHERE id = ?", id)[0].u },
  });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "discount_exceeds_commission");
  assert.match(r.json.error.message, /100\.000 ₫/);
  assert.match(r.json.error.message, /\(0 ₫\)/, "hoa hồng của bên đặt mới tính 0 vì dòng vượt");
  assert.match(r.json.error.message, /Mức hoa hồng của dịch vụ đang vượt giá bán — nhờ Kế toán xem lại\.$/);
  assert.equal(w.q("SELECT booker_party_id AS b FROM orders WHERE id = ?", id)[0].b, null, "bên đặt không đổi");
  assert.equal(dem(w, "SELECT count(*) AS n FROM ord_service_terms WHERE order_id = ?", id), chupTruoc, "không chụp lại");
});

test("Thực tập và Đối tác không phải người hưởng giữ luật cũ trên đơn có dòng vượt: Thực tập 403 câu Thực tập; Đối tác bị gắn đại lý khác 403 câu Đối tác, không lộ số", async () => {
  const w = await setupVuot(cacCa[1]!.dau_vao);
  cam(await lap(w, INTERN, [dvVang(VE)], { bookerPartyId: DLE, discount: 1 }), CAU_THUC_TAP, "Thực tập");
  const r0 = await lap(w, DT0, [dvVang(VE)]);
  assert.equal(r0.status, 201, r0.text);
  w.sqlite.prepare("UPDATE orders SET booker_party_id = ? WHERE id = ?").run(DLE, r0.json.order.id);
  datGiam(w, r0.json.order.id, 1);
  const xn = await xacNhan(w, r0.json.order.id, DT0);
  cam(xn, CAU_GIAM_DOI_TAC, "Đối tác không hưởng");
  assert.doesNotMatch(xn.text, /vượt giá bán|Kế toán xem lại|\d{3}\.\d{3}/, "không lộ chuyện dòng vượt hay số của bên khác");
});
