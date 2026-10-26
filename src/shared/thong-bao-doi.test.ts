// TIN "ĐƠN ĐỔI SAU XÁC NHẬN" (ADR-0062 Đ1–Đ3) + TIN MQ-07 "giờ hẹn chặng đổi khi đã xếp" (ADR-0052 D6.2) trong MỘT hàm lọc `locHopThongBao`.
// Bảng ca ADR-0062 "Bài kiểm" mục 1 (câu 3 = A, câu 5 = Có) = NT-B7; cùng lô một tin + mốc = NT-B8; Đối tác / Thực tập là người lập = NT-B9; câu = NT-B10;
// liên kết = NT-B11; chống trùng MQ-07 = NT-B12 (D6 đã có trên nhánh — bài thật). Dữ liệu GIẢ (tên / SĐT / nơi Dò Tìm).
import { test } from "node:test";
import assert from "node:assert/strict";
import { locHopThongBao, loaiTinDon, MOC_TIN_DOI, type DongDon } from "./thong-bao.ts";
import type { PermissionCode } from "./permissions.ts";
import type { ChuyenCuaChang } from "./tin-chuyen.ts";

const NOW = "2026-10-08T03:00:00.000Z";
const LUC = "2026-10-08T02:00:00.000Z";
const ai = (id: string, ...p: PermissionCode[]) => ({ id, permissions: p, partyId: null as string | null });
const LAN = ai("lan", "SALES"); // người lập
const HUNG = ai("hung", "SALES"); // Bán hàng không liên quan
const TAM = ai("tam", "FIELD"); // HDV phụ trách
const QT = ai("qt", "ADMIN"); // người sửa
const QT2 = ai("qt2", "ADMIN"); // Quản trị khác (không lập, không phụ trách)
const MAI = ai("mai", "ACCOUNTING");
const SUP = ai("sup", "SUPER_ADMIN"); // Toàn quyền: người DUY NHẤT thấy tên người làm (ADR-0131)
const SUP_DOI_TAC = ai("sup2", "SUPER_ADMIN", "PARTNER");
const BX = ai("bx", "PARTNER");
const NGAN = ai("ngan", "INTERN");
const TX = { id: "tx", permissions: ["DRIVER"] as PermissionCode[], partyId: "p-tx" };
const TX2 = { id: "tx2", permissions: ["DRIVER"] as PermissionCode[], partyId: "p-tx2" };

// id CỐ ĐỊNH theo bộ đếm (không ngẫu nhiên): bài "không SĐT" quét CẢ JSON của hộp bằng /09\d{8}/ — id "d0.09…" ngẫu nhiên từng khớp (đỏ ~5–7%, phiếu kiểm A3 V1).
let soId = 0;
const doi = (o: Partial<DongDon> = {}): DongDon => ({
  id: `d${++soId}`, orderId: "o1", maDon: "TD-1", action: "trip_updated", actorId: "qt", tenNguoiLam: "Quản Trị", luc: LUC, ownerId: "lan",
  phuTrach: { coNguoi: true, staffId: "tam" }, lapChuaCoNguoi: false, cungLoLap: false,
  detail: "Tour đảo: giờ đón 07:00 → 06:30", sauXacNhan: true, legId: null, ...o,
});
/** Mốc RIÊNG của bài (không đọc MOC_TIN_DOI thật, vì hằng thật đặt = lúc phát hành và dịch theo từng đợt). */
const MOC_BAI_KIEM = "2026-09-30T00:00:00.000Z";
const hop = (staff: { id: string; permissions: PermissionCode[]; partyId: string | null }, d: DongDon[], ngan: "cua-toi" | "tat-ca" = "cua-toi", mocTinDoi?: string) =>
  locHopThongBao(staff, { don: d, thuCong: [], docDenLuc: "2026-10-01T00:00:00.000Z", now: NOW, ngan, mocTinDoi: mocTinDoi ?? MOC_BAI_KIEM });
const cau = (staff: Parameters<typeof hop>[0], d: DongDon[], ngan: "cua-toi" | "tat-ca" = "cua-toi") => hop(staff, d, ngan).tin.map((t) => t.cau);
const loai = (staff: Parameters<typeof hop>[0], d: DongDon[], ngan: "cua-toi" | "tat-ca" = "cua-toi") => hop(staff, d, ngan).tin.map((t) => t.loai);

// Chặng đã xếp: chuyến CX-1 có dòng lái của tài xế p-tx bao lúc sự kiện.
const CHUYEN: ChuyenCuaChang[] = [{ tripId: "t1", ma: "CX-1", ngayChay: "2026-10-08", lai: [{ partyId: "p-tx", tu: "2026-10-08T00:00:00.000Z", den: null }] }];
const doiChang = (o: Partial<DongDon> = {}) =>
  doi({ action: "order_leg_updated", detail: "Chiều đi · Tour đảo: giờ đón 07:00 → 06:30", legId: "leg-1", chuyenCuaChang: CHUYEN, ...o });

// ---- NT-B7: bảng ca ADR-0062 "Bài kiểm" mục 1 ------------------------------------------------------------------------------------------------

test("NT-B7.1 Bán hàng lập, HDV phụ trách, Quản trị đổi giờ đón đơn đã xác nhận → Bán hàng + HDV có tin 'Của tôi'; Quản trị (người sửa) không", () => {
  const d = [doi()];
  assert.deepEqual(loai(LAN, d), ["doi_sau_xac_nhan"]);
  assert.deepEqual(loai(TAM, d), ["doi_sau_xac_nhan"]);
  assert.deepEqual(hop(QT, d, "tat-ca").tin, [], "người sửa không nhận tin của chính mình, kể cả ngăn Tất cả");
  assert.equal(hop(LAN, d).soChuaDoc, 1, "tính số đỏ");
});

test("NT-B7.2 HDV sửa số khách → người lập có tin (không lộ lý do); HDV (người sửa) không", () => {
  const d = [doi({ action: "order_money_adjusted_by_field", actorId: "tam", tenNguoiLam: "Hướng Dẫn", detail: "số khách: Tour đảo: người lớn 2 → 3 · lý do: Khách báo thêm, gọi 0905 123 456" })];
  assert.deepEqual(cau(LAN, d), ["Đơn TD-1: đổi số khách (Tour đảo: người lớn 2 → 3)"]);
  assert.ok(!JSON.stringify(hop(LAN, d)).includes("lý do") && !JSON.stringify(hop(LAN, d)).includes("0905"));
  assert.deepEqual(hop(TAM, d, "tat-ca").tin, []);
  // Hành động văn phòng khai trước (ADR-0062 Đ1 cách a) đọc cùng một luật.
  assert.deepEqual(loai(LAN, [doi({ action: "order_money_adjusted", detail: "số khách: Tour đảo: người lớn 2 → 3 · lý do: x" })]), ["doi_sau_xac_nhan"]);
});

test("NT-B7.3 cùng thao tác khi đơn CÒN NHÁP (sauXacNhan false) → không ai, kể cả ngăn Tất cả", () => {
  const d = [doi({ sauXacNhan: false })];
  for (const s of [LAN, TAM, MAI, HUNG]) assert.deepEqual(hop(s, d, "tat-ca").tin, [], s.id);
  assert.equal(loaiTinDon(d[0]!), null);
  assert.deepEqual(hop(LAN, [doi({ sauXacNhan: undefined })], "tat-ca").tin, [], "vắng cờ = không biết đã xác nhận → không tin");
});

test("NT-B7.4 chỉ đổi ghi chú / nơi khách có mặt (kể cả chữ cũ \"check-in\" của nhật ký đã ghi) / nơi trả → không ai", () => {
  for (const d of [
    doi({ detail: "Tour đảo: đổi ghi chú" }), doi({ detail: "Tour đảo: đổi nơi khách có mặt" }), doi({ detail: "Tour đảo: đổi nơi check-in" }), doi({ detail: "Tour đảo: đổi ghi chú, đổi nơi check-in" }),
    doi({ action: "order_leg_updated", detail: "Chiều đi · Tour đảo: nơi trả Bến A → Bến B" }),
  ]) for (const s of [LAN, TAM, MAI]) assert.deepEqual(hop(s, [d], "tat-ca").tin, [], `${s.id}: ${d.detail}`);
});

test("NT-B7.5 câu 3 = A: chỉ đổi giờ khách có mặt (nhật ký mới) hoặc giờ check-in (nhật ký cũ) hoặc giờ khởi hành → có tin, câu dùng chữ mới", () => {
  assert.deepEqual(cau(TAM, [doi({ detail: "Tour đảo: giờ khách có mặt 14:00 → 15:00" })]), ["Đơn TD-1: giờ khách có mặt 14:00 → 15:00"]);
  assert.deepEqual(cau(TAM, [doi({ detail: "Tour đảo: giờ check-in 14:00 → 15:00" })]), ["Đơn TD-1: giờ khách có mặt 14:00 → 15:00"], "nhật ký cũ trên production");
  assert.deepEqual(cau(TAM, [doi({ detail: "Tour đảo: giờ khởi hành 07:00 → 08:00" })]), ["Đơn TD-1: giờ khởi hành 07:00 → 08:00"]);
  assert.deepEqual(cau(TAM, [doi({ detail: "Tour đảo: ngày khởi hành 2026-10-10 → 2026-10-11" })]), ["Đơn TD-1: ngày khởi hành 10/10/2026 → 11/10/2026"]);
});

test("NT-B7.6 Kế toán (xem mọi đơn) → chỉ ngăn 'Tất cả', không số đỏ", () => {
  const d = [doi()];
  assert.deepEqual(hop(MAI, d).tin, []);
  assert.equal(hop(MAI, d).soChuaDoc, 0);
  const tat = hop(MAI, d, "tat-ca").tin;
  assert.equal(tat.length, 1);
  assert.equal(tat[0]!.cuaToi, false);
  assert.equal(tat[0]!.loai, "doi_sau_xac_nhan");
});

test("NT-B7.7 câu 5 = Có: Đối tác / Thực tập là người lập nhận tin ở 'Của tôi'", () => {
  for (const s of [BX, NGAN]) {
    const d = [doi({ ownerId: s.id, phuTrach: { coNguoi: false, staffId: null } })];
    assert.deepEqual(loai(s, d), ["doi_sau_xac_nhan"], s.id);
    assert.equal(hop(s, d).soChuaDoc, 1, s.id);
  }
});

test("NT-B7.8 tài xế → không nhận tin đơn đổi (đơn không có chặng xếp cho họ)", () => {
  for (const d of [doi(), doi({ action: "order_leg_updated", detail: "Chiều đi · Tour đảo: giờ đón 07:00 → 06:30", legId: "leg-1" })]) {
    assert.deepEqual(hop(TX, [d], "tat-ca").tin, []);
  }
});

test("NT-B7.9 + 7.10: 'sau xác nhận' do nguồn tính (sauXacNhan) — hàm lọc KHÔNG áp cửa sổ cho dòng xác nhận, chỉ cho dòng đổi", () => {
  // Dòng đổi trong cửa sổ 30 ngày, sauXacNhan true (dòng confirmed có thể 40 ngày trước — câu đọc ở thongbao/repository.ts không giới hạn) → có tin.
  assert.equal(hop(LAN, [doi()]).tin.length, 1);
  // Dòng đổi ngoài cửa sổ 30 ngày → không.
  assert.deepEqual(hop(LAN, [doi({ luc: "2026-09-01T00:00:00.000Z" })], "tat-ca").tin, []);
});

// ---- NT-B8: cùng lô một tin; mốc bắt đầu ---------------------------------------------------------------------------------------------------

test("thay chặng (một lô: bỏ + thêm, cùng mốc): câu luôn 'bỏ chặng đón; thêm chặng đón' và id tin cố định — không phụ thuộc thứ tự dòng SQL trả (phiếu kiểm A3 T3)", () => {
  const bo = doi({ id: "r1", action: "order_leg_closed", detail: "Chiều đi · Tour đảo: bỏ chặng (lý do: Nhập sai)", legId: "leg-1" });
  const them = doi({ id: "r2", action: "order_leg_added", detail: "Chiều đi · Tour đảo: thêm — giờ đón 06:30", legId: null });
  for (const lo of [[bo, them], [them, bo]]) {
    const t = hop(LAN, lo).tin;
    assert.deepEqual(t.map((x) => x.cau), ["Đơn TD-1: bỏ lượt đưa đón; thêm lượt đưa đón"], JSON.stringify(t.map((x) => x.cau)));
    assert.equal(t[0]!.id, "r1", "id tin = dòng đứng đầu theo thứ tự cố định");
  }
});

test("NT-B8 cùng đơn + cùng người + cùng mốc → MỘT tin (nối phần đổi bằng '; '); khác mốc → hai tin; dòng trước MOC_TIN_DOI → không tin", () => {
  const a = doi({ id: "a1" });
  const b = doi({ id: "a2", action: "order_leg_added", detail: "Chiều về · Tour đảo: thêm — ngày đón 2026-10-10" });
  const t = hop(LAN, [a, b]).tin;
  assert.equal(t.length, 1);
  assert.equal(t[0]!.cau, "Đơn TD-1: giờ đón 07:00 → 06:30; thêm lượt đưa đón");
  assert.equal(t[0]!.id, "a1", "id tin = id dòng đầu");
  assert.equal(hop(LAN, [a, doi({ id: "a3", luc: "2026-10-08T02:00:00.001Z" })]).tin.length, 2);
  assert.equal(hop(LAN, [doi({ id: "c1", actorId: "qt2" }), doi({ id: "c2" })]).tin.length, 2, "khác người làm → hai tin");
  // Mốc qua tham số (giá trị thật của MOC_TIN_DOI do K1B đặt lúc gộp).
  assert.deepEqual(hop(LAN, [doi()], "tat-ca", "2026-10-08T02:00:00.001Z").tin, []);
  assert.equal(hop(LAN, [doi()], "tat-ca", "2026-10-08T02:00:00.000Z").tin.length, 1, "đúng mốc vẫn tính");
  assert.equal(typeof MOC_TIN_DOI, "string");
});

// NT-B16 (phiếu kiểm A3 C1): mốc thật do CỔNG MÁY ở `npm run trien-khai` canh (kiemMocTinDoi, scripts/release-lib.mjs) — không dựa trí nhớ người gộp. Bài này
// khoá: hằng đúng dạng toISOString (cổng đọc được), và cổng chặn khi lần phát hành đầu mang 0086 chạy hơn 24 giờ sau mốc (viết tương đối theo hằng: đúng cả
// sau khi chủ đặt mốc thật).
test("NT-B16 MOC_TIN_DOI: đúng dạng ISO đủ mili-giây; cổng phát hành chặn lần đầu mang 0086 khi mốc cũ hơn 24 giờ, cho qua khi mốc đúng lúc phát hành", async () => {
  type K = { ok: true; kiem: boolean } | { ok: false; reason: string };
  const { kiemMocTinDoi, DUOI_MIGRATION_TIN_DOI } = (await import(new URL("../../scripts/release-lib.mjs", import.meta.url).href)) as {
    kiemMocTinDoi: (p: string[], m: unknown, n: number) => K; DUOI_MIGRATION_TIN_DOI: string;
  };
  const { readdirSync } = await import("node:fs");
  const MIGRATION_TIN_DOI = readdirSync(new URL("../../migrations/", import.meta.url)).find((f) => f.endsWith(DUOI_MIGRATION_TIN_DOI))!; // tên THẬT trong migrations/
  assert.match(MOC_TIN_DOI, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(new Date(MOC_TIN_DOI).toISOString(), MOC_TIN_DOI);
  const t = Date.parse(MOC_TIN_DOI);
  assert.equal(kiemMocTinDoi([MIGRATION_TIN_DOI], MOC_TIN_DOI, t + 25 * 3600e3).ok, false, "quên đặt mốc (phát hành > 24 giờ sau mốc) → dừng");
  assert.deepEqual(kiemMocTinDoi([MIGRATION_TIN_DOI], MOC_TIN_DOI, t + 3600e3), { ok: true, kiem: true }, "mốc = lúc phát hành → đạt");
  assert.deepEqual(kiemMocTinDoi([], MOC_TIN_DOI, t + 400 * 24 * 3600e3), { ok: true, kiem: false }, "0086 đã áp → không kiểm nữa");
});

// ---- NT-B9: Đối tác / Thực tập mở hẹp ĐÚNG loại tin mới, đúng đơn họ lập -------------------------------------------------------------------------

// Cổng người xem tin đổi (`duocThayTinDoi`) là lớp RIÊNG, không trùng lọc nhãn `nguoi:` ngay sau nó: tài khoản đứng tên người phụ trách / người lập mà
// không phải văn phòng, không HDV (dữ liệu lạ — route giao việc hôm nay không cho; phiếu kiểm lại A3 mục 2) vẫn có nhãn `nguoi:<mình>` khớp, chỉ cổng chặn.
test("cổng duocThayTinDoi: Đối tác / Thực tập / tài xế / Tài xế đối tác / Nhân sự đứng tên người phụ trách → KHÔNG tin đổi; tài xế / Tài xế đối tác / Nhân sự đứng tên người lập → KHÔNG; đối chứng Đối tác / Thực tập người lập → có", () => {
  const ai1 = (p: PermissionCode) => ({ id: "x", permissions: [p], partyId: "p-x" as string | null });
  for (const p of ["PARTNER", "INTERN", "DRIVER", "DRIVER_PARTNER", "HR"] as PermissionCode[]) {
    assert.deepEqual(hop(ai1(p), [doi({ phuTrach: { coNguoi: true, staffId: "x" } })], "tat-ca").tin, [], `${p} là người phụ trách`);
  }
  for (const p of ["DRIVER", "DRIVER_PARTNER", "HR"] as PermissionCode[]) {
    assert.deepEqual(hop(ai1(p), [doi({ ownerId: "x" })], "tat-ca").tin, [], `${p} là người lập`);
  }
  for (const p of ["PARTNER", "INTERN"] as PermissionCode[]) assert.equal(hop(ai1(p), [doi({ ownerId: "x" })]).tin.length, 1, `${p} là người lập (câu 5 = Có)`);
});

test("NT-B9 Đối tác / Thực tập: có tin đổi của đơn MÌNH lập; KHÔNG có tin đổi đơn người khác; KHÔNG có tin đơn loại khác của đơn mình", () => {
  for (const s of [BX, NGAN]) {
    assert.deepEqual(hop(s, [doi()], "tat-ca").tin, [], `${s.id}: đơn của Lan`);
    const cuaMinh = { ownerId: s.id, phuTrach: { coNguoi: true, staffId: "hung" } };
    // ADR-0136 Đ10 (Task 3.5): người lập Đối tác / Thực tập NHẬN tin xác nhận và huỷ của đơn MÌNH lập (không kèm tên người làm); đơn người khác vẫn không (dòng đầu).
    assert.equal(hop(s, [doi({ ...cuaMinh, action: "confirmed", detail: null, sauXacNhan: undefined })], "tat-ca").tin.length, 1, `${s.id}: tin xác nhận đơn mình lập`);
    assert.equal(hop(s, [doi({ ...cuaMinh, action: "cancelled", detail: null })], "tat-ca").tin.length, 1, `${s.id}: tin huỷ đơn mình lập`);
    assert.deepEqual(hop(s, [doi({ action: "confirmed", detail: null, sauXacNhan: undefined })], "tat-ca").tin, [], `${s.id}: tin xác nhận đơn người khác vẫn không`);
    assert.equal(hop(s, [doi(cuaMinh)]).tin.length, 1);
  }
});

// ---- NT-B10: câu ----------------------------------------------------------------------------------------------------------------------------

test("NT-B10 câu (ADR-0131): tên chỉ cho Toàn quyền không giữ Đối tác; mọi người khác không tên 'Đơn <mã>: …'; câu chung không lộ chữ thô", () => {
  assert.deepEqual(cau(LAN, [doi()]), ["Đơn TD-1: giờ đón 07:00 → 06:30"]); // người lập: ADR-0131 cũng không tên
  assert.deepEqual(cau(HUNG, [doi()], "tat-ca"), ["Đơn TD-1: giờ đón 07:00 → 06:30"]); // Bán hàng khác: không tên
  // Toàn quyền (xem ngăn Tất cả) thấy tên; Toàn quyền kiêm Đối tác thì không.
  assert.deepEqual(cau(SUP, [doi()], "tat-ca"), ["Quản Trị đổi đơn TD-1: giờ đón 07:00 → 06:30"]);
  assert.deepEqual(cau(SUP, [doi({ detail: "cập nhật chặng đưa đón" })], "tat-ca"), ["Quản Trị vừa đổi lượt đưa đón của đơn TD-1"]);
  assert.deepEqual(cau(SUP, [doi({ actorId: null, tenNguoiLam: null })], "tat-ca"), ["Đơn TD-1: giờ đón 07:00 → 06:30"]);
  assert.ok(!JSON.stringify(hop(SUP_DOI_TAC, [doi()], "tat-ca")).includes("Quản Trị"), "Toàn quyền kiêm Đối tác không tên");
  assert.deepEqual(cau(HUNG, [doi({ detail: "cập nhật chặng đưa đón" })], "tat-ca"), ["Đơn TD-1 vừa đổi lượt đưa đón"]);
  assert.deepEqual(cau(LAN, [doi({ detail: "cập nhật chặng đưa đón" })]), ["Đơn TD-1 vừa đổi lượt đưa đón"]);
  assert.deepEqual(cau(HUNG, [doi({ action: "order_money_adjusted_by_field", detail: "Khách báo thêm 1 người" })], "tat-ca"), ["Đơn TD-1: đổi số khách"]);
  assert.deepEqual(cau(LAN, [doi({ action: "order_money_adjusted_by_field", detail: "Khách báo thêm 1 người" })]), ["Đơn TD-1: đổi số khách"]);
  assert.deepEqual(cau(HUNG, [doi({ actorId: null, tenNguoiLam: null })], "tat-ca"), ["Đơn TD-1: giờ đón 07:00 → 06:30"]);
  // Câu 6: đổi nơi đón không ghi nơi mới (chặng và dịch vụ).
  const noi = cau(LAN, [doi({ action: "order_leg_updated", detail: "Chiều đi · Tour đảo: nơi đón Khách sạn Dò Tìm → 12 Trần Phú •••• ••• •••" })]);
  assert.deepEqual(noi, ["Đơn TD-1: Chiều đi: đổi nơi đón"]);
  assert.deepEqual(cau(LAN, [doi({ detail: "Tour đảo: đổi điểm đón" })]), ["Đơn TD-1: đổi nơi đón"]);
  const json = JSON.stringify(hop(LAN, [doi({ action: "order_leg_updated", detail: "Chiều đi · Anh Nam 0901234567: nơi đón A → 12 Trần Phú" })]));
  for (const x of ["Trần Phú", "Anh Nam", "0901234567", "Tour đảo"]) assert.ok(!json.includes(x), x);
});

// ---- NT-B11: liên kết -----------------------------------------------------------------------------------------------------------------------

test("NT-B11 liên kết: văn phòng → trang đơn; Đối tác / Thực tập người lập → trang đơn (order.view own); HDV → Việc của tôi", () => {
  assert.equal(hop(LAN, [doi()]).tin[0]!.lienKet, "/order?id=o1");
  assert.equal(hop(MAI, [doi()], "tat-ca").tin[0]!.lienKet, "/order?id=o1");
  assert.equal(hop(TAM, [doi()]).tin[0]!.lienKet, "/account");
  for (const s of [BX, NGAN]) assert.equal(hop(s, [doi({ ownerId: s.id })]).tin[0]!.lienKet, "/order?id=o1", s.id);
});

// ---- NT-B12 + MQ-07 (ADR-0052 D6.2): chặng đã xếp đổi giờ hẹn ------------------------------------------------------------------------------------

test("NT-B12 chặng có suất mở đổi giờ đón → người lập (Bán hàng) nhận ĐÚNG MỘT tin (MQ-07 'gọi báo khách'), không thêm tin đơn đổi ở ngăn nào", () => {
  const d = [doiChang()];
  for (const ngan of ["cua-toi", "tat-ca"] as const) {
    const t = hop(LAN, d, ngan).tin;
    assert.equal(t.length, 1, ngan);
    assert.equal(t[0]!.loai, "chuyen");
    assert.equal(t[0]!.cau, "Đơn TD-1: giờ hẹn đổi ở chuyến CX-1 ngày 08/10 — gọi báo khách");
    assert.equal(t[0]!.lienKet, "/chuyen?id=t1");
    assert.equal(t[0]!.cuaToi, true);
  }
});

test("MQ-07: tài xế đang lái chuyến có suất của chặng nhận; tài xế khác không; HDV / Đối tác (không trip.view) không nhận tin chuyến — HDV nhận tin đơn đổi", () => {
  const d = [doiChang()];
  assert.deepEqual(hop(TX, d).tin.map((t) => [t.loai, t.cau, t.lienKet]), [["chuyen", "Văn phòng vừa đổi giờ đón ở chuyến CX-1 ngày 08/10 — mở để xem", "/cuoc-chuyen?id=t1"]]);
  assert.deepEqual(hop(TX2, d, "tat-ca").tin, []);
  assert.deepEqual(loai(TAM, d), ["doi_sau_xac_nhan"], "HDV phụ trách: không trip.view → tin đơn đổi, không tin chuyến");
  const cuaBx = [doiChang({ ownerId: "bx", phuTrach: { coNguoi: false, staffId: null } })];
  assert.deepEqual(loai(BX, cuaBx), ["doi_sau_xac_nhan"], "Đối tác người lập: không trip.view → không MQ-07");
  // Không tên khách / SĐT / nơi trong DTO tin chuyến.
  for (const s of [LAN, TX]) assert.ok(!/Khách|Dò Tìm|(?<![0-9a-f-])09\d{8}(?!\d)/.test(JSON.stringify(hop(s, d))), s.id);
});

test("MQ-07: Quản trị KHÔNG lập / KHÔNG phụ trách → không MQ-07 (call_ack any nhưng không phải việc của họ), chỉ tin đơn đổi ở 'Tất cả'; người phụ trách là HDV → MQ-07 tới người lập + tài xế", () => {
  const d = [doiChang({ actorId: "hung", tenNguoiLam: "Hùng" })];
  const t = hop(QT2, d, "tat-ca").tin;
  assert.deepEqual(t.map((x) => [x.loai, x.cuaToi]), [["doi_sau_xac_nhan", false]]);
  assert.deepEqual(hop(QT2, d).tin, []);
  assert.deepEqual(loai(LAN, d), ["chuyen"]);
  assert.deepEqual(loai(TX, d), ["chuyen"]);
  // Quản trị LÀ người phụ trách → MQ-07.
  assert.deepEqual(loai(QT2, [doiChang({ actorId: "hung", phuTrach: { coNguoi: true, staffId: "qt2" } })]), ["chuyen"]);
});

test("MQ-07: người sửa là người lập → người lập không nhận gì; tài xế vẫn nhận", () => {
  const d = [doiChang({ actorId: "lan", tenNguoiLam: "An" })];
  assert.deepEqual(hop(LAN, d, "tat-ca").tin, []);
  assert.deepEqual(loai(TX, d), ["chuyen"]);
});

test("MQ-07 chỉ khi đổi NGÀY / GIỜ đón (hoặc câu chung): đổi nơi đón chặng đã xếp → tin đơn đổi 'đổi nơi đón', tài xế không nhận", () => {
  const d = [doiChang({ detail: "Chiều đi · Tour đảo: nơi đón A → B" })];
  assert.deepEqual(hop(LAN, d).tin.map((t) => [t.loai, t.cau]), [["doi_sau_xac_nhan", "Đơn TD-1: Chiều đi: đổi nơi đón"]]);
  assert.deepEqual(hop(TX, d, "tat-ca").tin, []);
  // Câu chung của dòng chặng (không đọc được) vẫn có thể đổi giờ → MQ-07.
  assert.deepEqual(loai(LAN, [doiChang({ detail: "chữ lạ không khuôn" })]), ["chuyen"]);
  // Chặng chưa xếp (không chuyến) → tin đơn đổi thường.
  assert.deepEqual(loai(LAN, [doiChang({ chuyenCuaChang: [] })]), ["doi_sau_xac_nhan"]);
  // Dòng KHÔNG phải sửa chặng (trip_updated) dù có chuyến → không MQ-07.
  assert.deepEqual(loai(LAN, [doi({ chuyenCuaChang: CHUYEN, legId: "leg-1" })]), ["doi_sau_xac_nhan"]);
});

test("MQ-07: đơn nháp / trước mốc / ngoài cửa sổ → không tin chuyến (cùng điều kiện nguồn với tin đơn đổi)", () => {
  for (const d of [doiChang({ sauXacNhan: false }), doiChang({ luc: "2026-09-01T00:00:00.000Z" })]) assert.deepEqual(hop(TX, [d], "tat-ca").tin, []);
  assert.deepEqual(hop(TX, [doiChang()], "tat-ca", "2026-10-09T00:00:00.000Z").tin, []);
});
