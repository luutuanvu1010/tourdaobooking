// Bảng phí đưa đón (ADR-0147 Đ2, ADR-0203 ĐB1; kế hoạch Phí đưa đón Đợt B, Task 7): route đặt mức, kết thúc mức, ngày bắt đầu áp, Thử tra, và hàm công bố `docBangPhiDonChoDon`.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs); bảng mẫu = sổ vàng golden/phi-dua-don.json gieo qua chính route POST. Tên người dùng GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff, fakeD1 } from "../../../tests/audit/harness.mjs";
// index.ts nhập "../audit" (không đuôi) nên node không nạp trực tiếp; hàm công bố nằm ở phi-don-repo.ts và index.ts chỉ xuất lại.
import { docBangPhiDonChoDon } from "./phi-don-repo.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "..");
const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const SA = "33333333-3333-4333-8333-333333333333";
const DT = "66666666-6666-4666-8666-666666666666";
const TT = "99999999-9999-4999-8999-999999999999";
const AT = "2026-10-01T00:00:00.000Z";
const NGAY_AP = "2026-12-01";
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };
const golden = JSON.parse(readFileSync(join(ROOT, "golden/phi-dua-don.json"), "utf8"));

const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`);
  return r;
};
const dem = (w: W, sql: string, ...a: unknown[]) => Number(w.q(sql, ...a)[0].n);

interface Ctx { w: W; cap: Record<string, string>; id: Map<string, string> }
async function setup(): Promise<Ctx> {
  const w = world();
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]], [ADM, "0900000006", "Quản Trị", ["ADMIN"]],
    [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [TT, "0900000009", "Tú Thực Tập", ["INTERN"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  for (const [code, ten] of [["TOUR_3DAO", "Tour 3 đảo"], ["TOUR_LAN", "Tour lặn biển"], ["HT_BUN", "Tắm bùn Hòn Tằm"], ["HT_VE", "Vé Hòn Tằm có đón"]]) {
    w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES (?, ?, 'perPax', 500000, 1, ?, ?)").run(code, ten, AT, AT);
  }
  for (const [code, ten] of [["DAO", "Nhóm thử Đảo"], ["HT", "Nhóm thử Hòn Tằm"]]) w.sqlite.prepare("INSERT INTO ctl_group (code, name, sort_order, active, created_at, updated_at) VALUES (?, ?, 50, 1, ?, ?)").run(code, ten, AT, AT);
  for (const [dv, nhom] of Object.entries(golden.dich_vu as Record<string, { nhom: string }>)) {
    await ok(w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: [dv], groupCode: nhom.nhom } }), 200, `nhóm ${dv}`);
  }
  for (const [code, name] of [["TT", "Trung tâm Nha Trang"], ["BAC", "Bắc Nha Trang"], ["CR", "Bãi Dài – Cam Ranh"]]) {
    await ok(w.call("POST", "/api/location-zones", { as: ADM, body: { code, name, sortOrder: 5 } }), 201, `vùng ${code}`);
  }
  const cap: Record<string, string> = {};
  for (const [k, ten] of [["C1", "Đại lý cấp 1"], ["C3", "Đại lý cấp 3"]]) cap[k] = (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten } }), 201, `cấp ${k}`)).json.muc.code;
  return { w, cap, id: new Map() };
}
const than = (c: Ctx, m: any) => {
  const dk: { khoa: string; giaTri: string }[] = [{ khoa: "ZONE", giaTri: m.vung }];
  if (m.cap) dk.push({ khoa: "TIER", giaTri: c.cap[m.cap]! });
  if (m.dich_vu) dk.push({ khoa: "SERVICE", giaTri: m.dich_vu });
  if (m.nhom) dk.push({ khoa: "SERVICE_GROUP", giaTri: m.nhom });
  if (m.chieu) dk.push({ khoa: "DIRECTION", giaTri: m.chieu });
  if (m.xe_rieng) dk.push({ khoa: "EXCLUSIVE", giaTri: "1" });
  return { kind: m.kieu, amount: m.tien, validFrom: m.tu, validTo: m.den, note: null, dieuKien: dk };
};
async function gieo(c: Ctx, bo: string[] = []): Promise<void> {
  for (const m of golden.bang_phi) {
    if (bo.includes(m.id)) continue;
    const r = await ok(c.w.call("POST", "/api/pricing/phi-don", { as: ADM, body: than(c, m) }), 201, `gieo ${m.id}`);
    c.id.set(m.id, r.json.muc.id);
  }
}
const lay = (c: Ctx, ngay = NGAY_AP, as = ADM) => c.w.call("GET", `/api/pricing/phi-don?ngay=${ngay}`, { as });
const batDau = (c: Ctx, ngay: string | null, tuLucDaDoc: string | null, as = ADM) => c.w.call("POST", "/api/pricing/phi-don/bat-dau-ap", { as, body: { ngay, tuLucDaDoc } });
const kqThu = (c: Ctx, q: Record<string, string | number>, as = ADM) => c.w.call("GET", `/api/pricing/phi-don/thu-tra?${new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)]))}`, { as });

test("ai ghi, ai đọc: năm route — Bán hàng, Kế toán, Đối tác, Thực tập → 403; Quản trị, Toàn quyền → 2xx", async () => {
  const c = await setup();
  await gieo(c);
  const p02 = c.id.get("P02")!;
  const chung = (ai: string): (() => Promise<Res>)[] => [() =>
    c.w.call("GET", "/api/pricing/phi-don", { as: ai }),
    () => c.w.call("POST", "/api/pricing/phi-don", { as: ai, body: than(c, { kieu: "PER_PAX", vung: "TT", dich_vu: "TOUR_LAN", tien: 5000, tu: "2027-06-01", den: "2027-06-30" }) }),
    () => c.w.call("POST", `/api/pricing/phi-don/${p02}/ket-thuc`, { as: ai, body: { validTo: "2026-12-31", expectedUpdatedAt: "x" } }),
    () => batDau(c, null, null, ai),
    () => kqThu(c, { vung: "TT", chieu: "OUT", xeRieng: 0, dichVu: "TOUR_LAN", ngay: NGAY_AP, soKhach: 2 }, ai),
  ];
  for (const ai of [SALES, KT, DT, TT]) for (const f of chung(ai)) { const r = await f(); assert.equal(r.status, 403, `${ai}: ${r.text}`); }
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_start"), 0);
  const [g, p, , b, t] = [await chung(ADM)[0]!(), await chung(ADM)[1]!(), null, await chung(ADM)[3]!(), await chung(ADM)[4]!()];
  assert.deepEqual([g!.status, p!.status, b!.status, t!.status], [200, 201, 200, 200]);
  assert.equal((await ok(batDau(c, null, b!.json.batDauAp.tuLuc, SA), 200)).status, 200);
  assert.equal((await lay(c, NGAY_AP, SA)).status, 200);
});

test("thêm mức ghi đúng dòng và nhật ký", async () => {
  const c = await setup();
  await gieo(c);
  const dong = c.w.q("SELECT id, condition_sig, kind, amount FROM prc_transfer_fee_rule WHERE id = ?", c.id.get("P06"))[0];
  assert.equal(dong.condition_sig, `TIER=${c.cap.C3}|ZONE=CR`);
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_condition WHERE rule_id = ?", c.id.get("P06")), 2);
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_added'"), golden.bang_phi.length);
  const detail = String(c.w.q("SELECT detail FROM audit_log WHERE action = 'prc_transfer_fee_added' AND detail LIKE ?", `%TIER=${c.cap.C3}%`)[0].detail);
  assert.ok(detail.includes("80.000") && detail.includes(`TIER=${c.cap.C3}|ZONE=CR`) && detail.includes("01/12/2026"), detail);
  assert.ok(!/\b0\d{9}\b/.test(detail) && !detail.includes("Quản Trị"), "nhật ký không có số điện thoại hay tên người");
});

test("trùng bộ điều kiện cùng ngày → 409 prc_overlap, không ghi dòng nào, không nhật ký", async () => {
  const c = await setup();
  await gieo(c);
  const dong = (n: string) => dem(c.w, `SELECT count(*) AS n FROM ${n}`);
  const truoc = [dong("prc_transfer_fee_rule"), dong("prc_transfer_fee_condition"), dong("audit_log")];
  const r = await ok(c.w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { ...than(c, golden.bang_phi[5]), amount: 1000 } }), 409);
  assert.equal(r.json.error.code, "prc_overlap");
  assert.deepEqual([dong("prc_transfer_fee_rule"), dong("prc_transfer_fee_condition"), dong("audit_log")], truoc);
});

test("thân sai → 400, bảng không đổi", async () => {
  const c = await setup();
  const khoa = c.w.call("POST", `/api/pricing/muc-ta/${c.cap.C3}/tat`, { as: KT });
  await ok(khoa, 200, "khoá cấp 3");
  const goc = than(c, { kieu: "PER_PAX", vung: "BAC", tien: 30000, tu: NGAY_AP, den: null });
  const dk = (...e: [string, string][]) => e.map(([khoa, giaTri]) => ({ khoa, giaTri }));
  const sai: Record<string, unknown> = {
    "mã vùng không có": { ...goc, dieuKien: dk(["ZONE", "KHONGCO"]) },
    "cấp đã khoá": { ...goc, dieuKien: dk(["ZONE", "BAC"], ["TIER", c.cap.C3!]) },
    "EXCLUSIVE=0": { ...goc, kind: "PER_TRIP", dieuKien: dk(["ZONE", "BAC"], ["EXCLUSIVE", "0"]) },
    "chiều chữ thường": { ...goc, dieuKien: dk(["ZONE", "BAC"], ["DIRECTION", "out"]) },
    "khoá lặp hai lần": { ...goc, dieuKien: dk(["ZONE", "BAC"], ["ZONE", "CR"]) },
    "dịch vụ và nhóm cùng lúc": { ...goc, dieuKien: dk(["ZONE", "BAC"], ["SERVICE", "TOUR_LAN"], ["SERVICE_GROUP", "DAO"]) },
    "theo chuyến không xe riêng": { ...goc, kind: "PER_TRIP" },
    "ngày kết thúc trước ngày bắt đầu": { ...goc, validTo: "2026-11-30" },
    "tiền lẻ": { ...goc, amount: 1000.5 },
    "tiền âm": { ...goc, amount: -1 },
    "không có thân": null,
  };
  for (const [ten, body] of Object.entries(sai)) {
    const r = await c.w.call("POST", "/api/pricing/phi-don", { as: ADM, ...(body === null ? {} : { body }) });
    assert.equal(r.status, 400, `${ten}: ${r.text}`);
  }
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_rule"), 0);
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_added'"), 0);
  // dạng đối tượng { KHOÁ: giá trị } cũng được nhận, mỗi kiểu một thân đúng
  const doiTuong = await ok(c.w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { ...goc, dieuKien: { ZONE: "BAC" } } }), 201, "dạng đối tượng");
  assert.equal(doiTuong.json.muc.dieuKien.vung, "BAC");
  const xe = await ok(c.w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { ...goc, kind: "PER_TRIP", amount: 200000, dieuKien: dk(["ZONE", "BAC"], ["EXCLUSIVE", "1"]) } }), 201, "xe riêng");
  assert.deepEqual([xe.json.muc.kieu, xe.json.muc.dieuKien.xeRieng], ["PER_TRIP", true]);
});

test("cảnh báo cấp trả cao hơn: lưu vẫn 201, kèm cảnh báo; thêm dòng cấp + nhóm thì hết", async () => {
  const c = await setup();
  await gieo(c, ["P06", "P10"]);
  const r = await ok(c.w.call("POST", "/api/pricing/phi-don", { as: ADM, body: than(c, golden.bang_phi[5]) }), 201);
  const khop = (x: any) => x.cap === c.cap.C3 && x.vung === "CR" && x.nhom === "HT" && x.dichVu === null && x.xeRieng === false && x.tienCap === 80000 && x.tienKhongCap === 70000;
  assert.ok(r.json.canhBao.some(khop), JSON.stringify(r.json.canhBao));
  assert.deepEqual(r.json.canhBao.filter(khop).map((x: any) => x.chieu).sort(), ["OUT", "RETURN"], "một mục cho mỗi chiều");
  assert.ok((await lay(c)).json.canhBao.some(khop), "GET cũng thấy");
  await ok(c.w.call("POST", "/api/pricing/phi-don", { as: ADM, body: than(c, { kieu: "PER_PAX", vung: "CR", cap: "C3", nhom: "HT", tien: 70000, tu: NGAY_AP, den: null }) }), 201, "dòng cấp 3 + nhóm");
  assert.ok(!(await lay(c)).json.canhBao.some(khop), "hết cảnh báo");
});

test("đủ mức trước khi bật: thiếu dòng chung của Bắc Nha Trang → 409 nêu tên; đủ → 200", async () => {
  const c = await setup();
  await gieo(c, ["P02"]);
  const r = await ok(batDau(c, NGAY_AP, null), 409);
  assert.equal(r.json.error.code, "transfer_fee_general_required");
  assert.ok(String(r.json.error.message).includes("Bắc Nha Trang"), r.text);
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_start"), 0);
  await ok(c.w.call("POST", "/api/pricing/phi-don", { as: ADM, body: than(c, golden.bang_phi[1]) }), 201);
  await ok(batDau(c, NGAY_AP, null), 200);
  const g = (await lay(c)).json;
  assert.equal(g.batDauAp.ngay, NGAY_AP);
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_start_set'"), 1);
  assert.equal((await batDau(c, "ngày sai", g.batDauAp.tuLuc)).status, 400);
});

test("đang áp thì không kết thúc dòng chung cuối của vùng; dòng khác kết thúc được; tắt phí đón thì được", async () => {
  const c = await setup();
  await gieo(c);
  await ok(batDau(c, NGAY_AP, null), 200);
  const p02 = c.id.get("P02")!;
  const upd = async (id: string) => (await lay(c)).json.muc.find((m: any) => m.id === id).updatedAt as string;
  const r = await ok(c.w.call("POST", `/api/pricing/phi-don/${p02}/ket-thuc`, { as: ADM, body: { validTo: "2026-12-31", expectedUpdatedAt: await upd(p02) } }), 409);
  assert.equal(r.json.error.code, "transfer_fee_general_required");
  assert.ok(String(r.json.error.message).includes("Bắc Nha Trang"));
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_rule WHERE id = ? AND valid_to_date IS NULL", p02), 1, "dòng chưa đổi");
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_ended'"), 0);
  // dòng không phải dòng chung (P05: CR + cấp 1) kết thúc được dù đang áp
  const p05 = c.id.get("P05")!;
  const k = await ok(c.w.call("POST", `/api/pricing/phi-don/${p05}/ket-thuc`, { as: ADM, body: { validTo: "2026-12-31", expectedUpdatedAt: await upd(p05) } }), 200);
  assert.equal(k.json.muc.denNgay, "2026-12-31");
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_ended'"), 1);
  // tắt phí đón rồi kết thúc dòng chung
  const hien = (await lay(c)).json.batDauAp;
  await ok(batDau(c, null, hien.tuLuc), 200);
  assert.equal((await lay(c)).json.batDauAp.ngay, null);
  await ok(c.w.call("POST", `/api/pricing/phi-don/${p02}/ket-thuc`, { as: ADM, body: { validTo: "2026-12-31", expectedUpdatedAt: await upd(p02) } }), 200);
});

// ---- đổi mức bằng `thayCho` (một lô: đóng dòng cũ → chèn dòng mới → điều kiện → hai nhật ký) ----
const BAC_CHUNG = { kieu: "PER_PAX", vung: "BAC", tien: 35000, tu: "2027-01-01", den: null };
const capNhat = async (c: Ctx, id: string) => (await lay(c)).json.muc.find((m: any) => m.id === id).updatedAt as string;
const thay = async (c: Ctx, id: string, m: any, expectedUpdatedAt?: string) =>
  c.w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { ...than(c, m), thayCho: { id, expectedUpdatedAt: expectedUpdatedAt ?? (await capNhat(c, id)) } } });
const trangThai = (c: Ctx) => [dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_rule"), dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_condition"), dem(c.w, "SELECT count(*) AS n FROM audit_log"),
  JSON.stringify(c.w.q("SELECT id, valid_to_date, updated_at FROM prc_transfer_fee_rule ORDER BY id"))];

test("đang áp: thay mức chung bằng thayCho — dòng cũ đóng ngày liền trước, dòng mới nối tiếp, hai nhật ký", async () => {
  const c = await setup();
  await gieo(c);
  await ok(batDau(c, NGAY_AP, null), 200);
  const p02 = c.id.get("P02")!;
  const tra = (ngay: string) => kqThu(c, { vung: "BAC", chieu: "OUT", xeRieng: 0, dichVu: "TOUR_LAN", ngay, soKhach: 1 });
  const r = await ok(thay(c, p02, BAC_CHUNG), 201);
  assert.equal(r.json.muc.tien, 35000);
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_rule WHERE id = ? AND valid_to_date = '2026-12-31'", p02), 1, "dòng cũ đóng 2026-12-31");
  const g = (await lay(c, "2026-12-15")).json.muc;
  assert.equal(g.find((m: any) => m.id === p02).denNgay, "2026-12-31");
  assert.ok(g.find((m: any) => m.id === r.json.muc.id), "GET thấy cả dòng mới");
  assert.equal((await tra("2026-12-31")).json.ketQua.tien, 30000);
  assert.equal((await tra("2027-01-01")).json.ketQua.tien, 35000);
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_ended' AND target_id = ?", p02), 1);
  const them = String(c.w.q("SELECT detail FROM audit_log WHERE action = 'prc_transfer_fee_added' AND target_id = ?", r.json.muc.id)[0].detail);
  assert.ok(them.includes(`thay dòng ${p02}`), them);
  // kết thúc mức mới đang áp (khu vực chỉ còn dòng này) vẫn bị chốt «đủ mức» chặn
  const chan = await ok(c.w.call("POST", `/api/pricing/phi-don/${r.json.muc.id}/ket-thuc`, { as: ADM, body: { validTo: "2027-03-31", expectedUpdatedAt: r.json.muc.updatedAt } }), 409);
  assert.equal(chan.json.error.code, "transfer_fee_general_required");
});

test("thayCho: dòng mới có ngày kết thúc làm khu vực hở sau đó → 409 transfer_fee_general_required, không ghi gì", async () => {
  const c = await setup();
  await gieo(c);
  await ok(batDau(c, NGAY_AP, null), 200);
  const truoc = trangThai(c);
  const r = await ok(thay(c, c.id.get("P02")!, { ...BAC_CHUNG, den: "2027-06-30" }), 409);
  assert.equal(r.json.error.code, "transfer_fee_general_required");
  assert.deepEqual(trangThai(c), truoc);
});

test("thayCho khác bộ điều kiện hoặc khác kiểu tính → 400, không dòng nào đổi, không nhật ký", async () => {
  const c = await setup();
  await gieo(c);
  await ok(batDau(c, NGAY_AP, null), 200);
  const p02 = c.id.get("P02")!;
  const truoc = trangThai(c);
  const khacDk = await ok(thay(c, p02, { ...BAC_CHUNG, cap: "C1" }), 400);
  assert.ok(String(khacDk.json.error.message).includes("cùng kiểu tính và cùng bộ điều kiện"), khacDk.text);
  await ok(thay(c, p02, { ...BAC_CHUNG, vung: "TT" }), 400);
  await ok(thay(c, p02, { kieu: "PER_TRIP", vung: "BAC", xe_rieng: true, tien: 200000, tu: "2027-01-01", den: null }), 400);
  assert.deepEqual(trangThai(c), truoc);
});

test("thayCho: mốc cũ → 409 stale; không có dòng cũ → 404; thân thayCho thiếu → 400; không dòng nào đổi", async () => {
  const c = await setup();
  await gieo(c);
  const p07 = c.id.get("P07")!; // BAC + cấp 1, đang mở
  const cu = await capNhat(c, p07);
  await ok(c.w.call("POST", `/api/pricing/phi-don/${p07}/ket-thuc`, { as: ADM, body: { validTo: "2027-06-30", expectedUpdatedAt: cu } }), 200);
  const truoc = trangThai(c);
  const moi = { kieu: "PER_PAX", vung: "BAC", cap: "C1", tien: 5000, tu: "2027-01-01", den: null };
  assert.equal((await ok(thay(c, p07, moi, cu), 409)).json.error.code, "stale");
  assert.equal((await ok(thay(c, "khong-co-dong-nay", moi, "x"), 404)).status, 404);
  assert.equal((await c.w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { ...than(c, moi), thayCho: { id: p07 } } })).status, 400);
  assert.deepEqual(trangThai(c), truoc);
});

test("thayCho: ngày bắt đầu mới không sau ngày bắt đầu dòng cũ, hoặc dòng cũ đã kết thúc sớm hơn → 400", async () => {
  const c = await setup();
  await gieo(c);
  const p02 = c.id.get("P02")!; // từ 2026-12-01
  const truoc = trangThai(c);
  await ok(thay(c, p02, { ...BAC_CHUNG, tu: "2026-12-01" }), 400);
  await ok(thay(c, p02, { ...BAC_CHUNG, tu: "2026-11-15" }), 400);
  const p07 = c.id.get("P07")!;
  await ok(c.w.call("POST", `/api/pricing/phi-don/${p07}/ket-thuc`, { as: ADM, body: { validTo: "2026-12-10", expectedUpdatedAt: await capNhat(c, p07) } }), 200);
  const sauKetThuc = trangThai(c);
  await ok(thay(c, p07, { kieu: "PER_PAX", vung: "BAC", cap: "C1", tien: 5000, tu: "2027-01-01", den: null }), 400); // không nới ngày kết thúc 2026-12-10 ra 2026-12-31
  assert.deepEqual(trangThai(c), sauKetThuc);
  assert.notDeepEqual(truoc, sauKetThuc);
});

test("thayCho là lô nguyên tử: chèn dòng mới thất bại thì dòng cũ KHÔNG bị đóng, không nhật ký", async () => {
  const c = await setup();
  await gieo(c);
  const p07 = c.id.get("P07")!;
  const truoc = trangThai(c);
  c.w.sqlite.prepare("UPDATE prc_transfer_fee_key SET active = 0 WHERE code = 'TIER'").run(); // trigger prc_key_inactive chặn bước chèn điều kiện
  const r = await ok(thay(c, p07, { kieu: "PER_PAX", vung: "BAC", cap: "C1", tien: 5000, tu: "2027-01-01", den: null }), 400);
  assert.equal(r.json.error.code, "invalid_input");
  assert.deepEqual(trangThai(c), truoc, "dòng cũ vẫn mở, không dòng mới, không nhật ký");
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_rule WHERE id = ? AND valid_to_date IS NULL", p07), 1);
});

test("thayCho: cảnh báo cấp cao hơn vẫn được tính trên trạng thái sau lô; vắng thayCho thì tạo mức thường", async () => {
  const c = await setup();
  await gieo(c);
  // thay dòng chung CR (P12 từ 2027-01-01, 110.000) bằng dòng 60.000 từ 2027-02-01: cấp 3 (80.000) cao hơn → có cảnh báo
  const r = await ok(thay(c, c.id.get("P12")!, { kieu: "PER_PAX", vung: "CR", tien: 60000, tu: "2027-02-01", den: null }), 201);
  assert.ok(r.json.canhBao.some((x: any) => x.cap === c.cap.C3 && x.vung === "CR" && x.tienKhongCap === 60000), JSON.stringify(r.json.canhBao));
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_rule WHERE id = ? AND valid_to_date = '2027-01-31'", c.id.get("P12")), 1);
  const thuong = await ok(c.w.call("POST", "/api/pricing/phi-don", { as: ADM, body: than(c, { kieu: "PER_PAX", vung: "BAC", cap: "C3", tien: 1000, tu: NGAY_AP, den: null }) }), 201);
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_ended'"), 1, "tạo thường không ghi «kết thúc»");
  assert.ok(!String(c.w.q("SELECT detail FROM audit_log WHERE action = 'prc_transfer_fee_added' AND target_id = ?", thuong.json.muc.id)[0].detail).includes("thay dòng"));
});

test("kết thúc: ngày không hợp lệ, không phải rút ngắn, mã không có → 400/404", async () => {
  const c = await setup();
  await gieo(c);
  const p03 = c.id.get("P03")!; // CR chung, đến 2026-12-31
  const lanDau = (await lay(c)).json.muc.find((m: any) => m.id === p03).updatedAt;
  const ket = (id: string, body: unknown) => c.w.call("POST", `/api/pricing/phi-don/${id}/ket-thuc`, { as: ADM, body });
  assert.equal((await ket(p03, { validTo: "2026-11-30", expectedUpdatedAt: lanDau })).status, 400, "trước ngày bắt đầu");
  assert.equal((await ket(p03, { validTo: "hôm qua", expectedUpdatedAt: lanDau })).status, 400);
  assert.equal((await ket(p03, { validTo: "2026-12-31", expectedUpdatedAt: lanDau })).status, 400, "không rút ngắn");
  assert.equal((await ket(p03, { validTo: "2027-02-01", expectedUpdatedAt: lanDau })).status, 400, "không nới");
  assert.equal((await ket(p03, { validTo: "2026-12-15" })).status, 400, "thiếu khoá lạc quan");
  assert.equal((await ket("khong-co-dong-nay", { validTo: "2026-12-15", expectedUpdatedAt: lanDau })).status, 404);
  assert.equal((await ket(p03, { validTo: "2026-12-15", expectedUpdatedAt: lanDau })).status, 200);
});

test("khoá lạc quan: bat-dau-ap hai lần cùng tuLucDaDoc → lần hai 409 stale; ket-thuc với mốc cũ → 409 stale", async () => {
  const c = await setup();
  await gieo(c);
  await ok(batDau(c, NGAY_AP, null), 200);
  const r = await ok(batDau(c, null, null), 409);
  assert.equal(r.json.error.code, "stale");
  assert.equal((await lay(c)).json.batDauAp.ngay, NGAY_AP, "lần hai không ghi");
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_start_set'"), 1);
  const p05 = c.id.get("P05")!;
  const cu = (await lay(c)).json.muc.find((m: any) => m.id === p05).updatedAt;
  await ok(c.w.call("POST", `/api/pricing/phi-don/${p05}/ket-thuc`, { as: ADM, body: { validTo: "2026-12-20", expectedUpdatedAt: cu } }), 200);
  const hai = await ok(c.w.call("POST", `/api/pricing/phi-don/${p05}/ket-thuc`, { as: ADM, body: { validTo: "2026-12-10", expectedUpdatedAt: cu } }), 409);
  assert.equal(hai.json.error.code, "stale");
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_ended'"), 1);
});

test("Thử tra khớp sổ vàng: mọi ca đã xác nhận, mọi chặng đủ dữ kiện", async () => {
  const c = await setup();
  await gieo(c);
  const idThat = new Map([...c.id].map(([p, u]) => [u, p]));
  let soChang = 0;
  let soThieu = 0;
  for (const ca of golden.cac_ca) {
    if (ca.xac_nhan.trang_thai !== "da_xac_nhan" || !ca.dap_an.ap_dung) continue;
    const bd = ca.dau_vao.ben_dat;
    if (bd.hai_cap) continue; // Thử tra không có ô «hai cấp»; ca này do luật thuần và bài sổ vàng canh
    for (const [i, ch] of ca.dau_vao.chang.entries()) {
      const k = ca.dap_an.chang[i];
      const khach = (ch.khach.nguoi_lon ?? 0) + (ch.khach.tre_em ?? 0) + (ch.khach.cao_tuoi ?? 0);
      const q: Record<string, string | number> = { vung: ch.vung, chieu: ch.chieu, xeRieng: ch.xe_rieng ? 1 : 0, dichVu: ch.dich_vu, cap: bd.cap ? c.cap[bd.cap]! : "", ngay: ca.dau_vao.ngay_xac_nhan, soKhach: khach };
      if (ch.so_nguoi_rieng != null) q.soNguoiVe = ch.so_nguoi_rieng;
      const r = await ok(kqThu(c, q), 200, `${ca.ma} chặng ${i + 1}`);
      soChang += 1;
      if (k.ket_qua === "THIEU_MUC") {
        assert.deepEqual([r.json.ketQua.trangThai, r.json.ketQua.lyDo], ["THIEU_MUC", "KHONG_CO_MUC"], ca.ma);
        soThieu += 1;
        continue;
      }
      assert.equal(r.json.ketQua.trangThai, "CO_MUC", ca.ma);
      assert.deepEqual([r.json.ketQua.donGia, r.json.ketQua.soLuong, r.json.ketQua.tien], [k.don_gia, k.so_luong, k.tien], `${ca.ma} chặng ${i + 1}`);
      assert.equal(idThat.get(r.json.ketQua.mucId), k.quy_tac, `${ca.ma}: dòng mức`);
    }
  }
  assert.ok(soChang >= 25 && soThieu >= 1, `chỉ thử ${soChang} chặng, ${soThieu} chặng thiếu mức`);
  // dòng bị thua có lý do
  const t = await ok(kqThu(c, { vung: "CR", chieu: "OUT", xeRieng: 0, dichVu: "HT_BUN", cap: c.cap.C3!, ngay: NGAY_AP, soKhach: 2 }), 200);
  assert.ok(t.json.thua.length >= 1 && t.json.thua.every((x: any) => typeof x.viSao === "string" && x.viSao.length > 5 && typeof x.mucId === "string"), t.text);
});

test("Thử tra: tham số sai → 400; số quá lớn → 400", async () => {
  const c = await setup();
  await gieo(c);
  const tot = { vung: "CR", chieu: "OUT", xeRieng: 0, dichVu: "TOUR_LAN", cap: "", ngay: NGAY_AP, soKhach: 2 };
  assert.equal((await kqThu(c, tot)).status, 200);
  for (const [ten, them] of Object.entries({
    "vùng lạ": { vung: "KHONGCO" }, "chiều thường": { chieu: "out" }, "xeRieng 2": { xeRieng: 2 }, "dịch vụ lạ": { dichVu: "KHONGCO" }, "cấp lạ": { cap: "KHONGCO" },
    "ngày sai": { ngay: "hôm nay" }, "khách 0": { soKhach: 0 }, "khách lẻ": { soKhach: "1.5" }, "khách âm": { soKhach: -2 }, "người về 0": { chieu: "RETURN", soNguoiVe: 0 }, "khách khổng lồ": { soKhach: "9007199254740991" },
  } as Record<string, Record<string, string | number>>)) assert.equal((await kqThu(c, { ...tot, ...them })).status, 400, ten);
});

test("Thử tra: cờ chuaApNgayNay — chưa bật, ngày sớm hơn ngày áp → true; từ ngày áp → false; số tiền và mức vẫn như cũ", async () => {
  const c = await setup();
  await gieo(c);
  const hoi = (ngay: string) => kqThu(c, { vung: "BAC", chieu: "OUT", xeRieng: 0, dichVu: "TOUR_LAN", ngay, soKhach: 1 });
  const chuaBat = await ok(hoi(NGAY_AP), 200);
  assert.equal(chuaBat.json.chuaApNgayNay, true, "chưa đặt ngày bắt đầu áp");
  assert.equal(chuaBat.json.ketQua.trangThai, "CO_MUC");
  await ok(batDau(c, NGAY_AP, null), 200);
  const som = await ok(hoi("2026-11-30"), 200);
  assert.equal(som.json.chuaApNgayNay, true, "ngày hỏi sớm hơn ngày bắt đầu áp");
  const dung = await ok(hoi(NGAY_AP), 200);
  assert.equal(dung.json.chuaApNgayNay, false);
  assert.equal(dung.json.ketQua.tien, chuaBat.json.ketQua.tien, "số tiền không đổi theo cờ");
  const tat = (await lay(c)).json.batDauAp.tuLuc;
  await ok(batDau(c, null, tat), 200);
  assert.equal((await ok(hoi(NGAY_AP), 200)).json.chuaApNgayNay, true, "đã tắt phí");
});

test("lỗi CHECK của CSDL (mã dịch vụ dài quá) → 400 lời thường, không 500, bảng không đổi", async () => {
  const c = await setup();
  const dai = "DV_" + "X".repeat(70);
  c.w.sqlite.prepare("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES (?, 'Dịch vụ mã dài', 'perPax', 1000, 1, ?, ?)").run(dai, AT, AT);
  const truoc = trangThai(c);
  const r = await ok(c.w.call("POST", "/api/pricing/phi-don", { as: ADM, body: { kind: "PER_PAX", amount: 1000, validFrom: NGAY_AP, validTo: null, note: null, dieuKien: [{ khoa: "ZONE", giaTri: "BAC" }, { khoa: "SERVICE", giaTri: dai }] } }), 400);
  assert.equal(r.json.error.code, "invalid_input");
  assert.doesNotMatch(r.text, /CHECK|constraint|SQLITE/i);
  assert.deepEqual(trangThai(c), truoc);
});

test("docBangPhiDonChoDon: ngày bắt đầu áp, mức hiệu lực, cấp của bên đặt", async () => {
  const c = await setup();
  await gieo(c);
  const db = fakeD1(c.w.sqlite);
  const ngay = "2026-12-10";
  const mo = (id: string, ten: string) => {
    c.w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, ten, AT, AT);
    c.w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, AT, AT);
  };
  let so = 0;
  const vai = (p: string, code: string) => c.w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)").run(`vai-${++so}`, p, code, AT, AT);
  mo("dd000000-0000-4000-8000-000000000001", "Lữ hành Một Cấp");
  mo("dd000000-0000-4000-8000-000000000002", "Lữ hành Hai Cấp");
  mo("dd000000-0000-4000-8000-000000000003", "Lữ hành Chưa Gắn");
  vai("dd000000-0000-4000-8000-000000000001", "TRAVEL_AGENCY");
  vai("dd000000-0000-4000-8000-000000000002", "TRAVEL_AGENCY");
  vai("dd000000-0000-4000-8000-000000000002", "COLLABORATOR");
  vai("dd000000-0000-4000-8000-000000000003", "TAXI_DRIVER");
  await ok(c.w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai: "TRAVEL_AGENCY", muc: c.cap.C3, tuNgay: "2026-01-01" } }), 201);
  await ok(c.w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai: "COLLABORATOR", muc: c.cap.C1, tuNgay: "2026-01-01" } }), 201);
  const chua = await docBangPhiDonChoDon(db, { bookerPartyId: null, ngay });
  assert.equal(chua.batDauAp, null, "chưa đặt ngày");
  assert.deepEqual(chua.cap, { loai: "KHONG_CAP" });
  assert.equal(chua.muc.length, golden.bang_phi.filter((m: any) => m.tu <= ngay && (m.den === null || m.den >= ngay)).length, "chỉ mức hiệu lực ngày đó");
  assert.ok(chua.muc.every((m) => m.validFrom <= ngay), "không lẫn mức chưa tới ngày");
  await ok(batDau(c, NGAY_AP, null), 200);
  const mot = await docBangPhiDonChoDon(db, { bookerPartyId: "dd000000-0000-4000-8000-000000000001", ngay });
  assert.equal(mot.batDauAp, NGAY_AP);
  assert.deepEqual(mot.cap, { loai: "CO_CAP", tierCode: c.cap.C3 });
  assert.deepEqual((await docBangPhiDonChoDon(db, { bookerPartyId: "dd000000-0000-4000-8000-000000000002", ngay })).cap, { loai: "HAI_CAP" });
  assert.deepEqual((await docBangPhiDonChoDon(db, { bookerPartyId: "dd000000-0000-4000-8000-000000000003", ngay })).cap, { loai: "KHONG_CAP" });
  const p06 = mot.muc.find((m) => m.id === c.id.get("P06"))!;
  assert.deepEqual([p06.kind, p06.amount, p06.dieuKien], ["PER_PAX", 80000, { ZONE: "CR", TIER: c.cap.C3 }]);
});

// ---- hàng rào ----
const nguonRepo = readFileSync(join(ROOT, "src/modules/pricing/phi-don-repo.ts"), "utf8");
const duyet = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? duyet(join(d, f)) : f.endsWith(".ts") && !f.endsWith(".test.ts") ? [join(d, f)] : []));

test("pricing không đọc locations: phi-don-repo.ts không nhắc loc_", () => {
  assert.ok(!/\bloc_|\bv_loc_/.test(nguonRepo));
});

test("điều kiện của dòng mức chỉ được chèn cùng lô tạo mức: một câu INSERT duy nhất, một nơi dùng, một route gọi (lưới thứ hai là bất biến R-PRC-PD-1)", () => {
  const nguon = (f: string) => readFileSync(f, "utf8");
  const tepNhacBang = duyet(join(ROOT, "src")).filter((f) => nguon(f).includes("prc_transfer_fee_condition")).map((f) => f.slice(ROOT.length + 1));
  assert.deepEqual(tepNhacBang, ["src/modules/pricing/phi-don-repo.ts"], "chỉ phi-don-repo.ts được nhắc bảng điều kiện");
  assert.equal((nguonRepo.match(/INSERT INTO prc_transfer_fee_condition/g) ?? []).length, 1, "đúng một câu chèn điều kiện");
  assert.equal((nguonRepo.match(/\bCAU_THEM_DIEU_KIEN\b/g) ?? []).length, 2, "hằng câu chèn điều kiện: một khai báo, MỘT nơi dùng (trong cauThemMucPhiDon)");
  const dung = duyet(join(ROOT, "src")).filter((f) => /\bcauThemMucPhiDon\(/.test(nguon(f)) && !f.endsWith("phi-don-repo.ts"));
  assert.deepEqual(dung.map((f) => f.slice(ROOT.length + 1)), ["src/modules/pricing/phi-don-route.ts"], "chỉ route tạo mức gọi hàm tạo mức");
  assert.equal((nguon(join(ROOT, "src/modules/pricing/phi-don-route.ts")).match(/\bcauThemMucPhiDon\(/g) ?? []).length, 1, "đúng một lời gọi");
});

// ---- vòng sửa nhỏ: nhật ký «kết thúc» chỉ khi có đóng thật; ca đua trả stale ----
const P07_MOI = { kieu: "PER_PAX", vung: "BAC", cap: "C1", tien: 5000, tu: "2027-01-01", den: null };

test("thayCho: dòng cũ ĐÃ đóng đúng ngày liền trước → không câu đóng, không nhật ký «kết thúc» mới, đúng một nhật ký «thêm»", async () => {
  const c = await setup();
  await gieo(c);
  const p07 = c.id.get("P07")!;
  await ok(c.w.call("POST", `/api/pricing/phi-don/${p07}/ket-thuc`, { as: ADM, body: { validTo: "2026-12-31", expectedUpdatedAt: await capNhat(c, p07) } }), 200);
  const daKetThuc = dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_ended' AND target_id = ?", p07);
  const daThem = dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_added'");
  const capCu = await capNhat(c, p07);
  const r = await ok(thay(c, p07, P07_MOI), 201);
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_ended' AND target_id = ?", p07), daKetThuc, "không thêm nhật ký «kết thúc»");
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_added'"), daThem + 1);
  assert.equal(dem(c.w, "SELECT count(*) AS n FROM audit_log WHERE action = 'prc_transfer_fee_added' AND target_id = ?", r.json.muc.id), 1);
  assert.equal(await capNhat(c, p07), capCu, "dòng cũ không bị chạm");
});

test("thayCho: ca đua — dòng cũ bị người khác đổi ngay trước lô → 409 stale (không phải prc_overlap), bảng và nhật ký không đổi", async () => {
  const c = await setup();
  await gieo(c);
  const p07 = c.id.get("P07")!;
  const mocCu = await capNhat(c, p07);
  c.w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /prc_transfer_fee_rule/.test(s.sql)), () => {
    c.w.sqlite.prepare("UPDATE prc_transfer_fee_rule SET valid_to_date = '2027-06-30', updated_at = '2030-01-01T00:00:00.000Z' WHERE id = ?").run(p07);
  });
  const truoc = [dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_rule"), dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_condition"), dem(c.w, "SELECT count(*) AS n FROM audit_log")];
  const r = await ok(thay(c, p07, P07_MOI, mocCu), 409);
  assert.equal(r.json.error.code, "stale");
  assert.deepEqual([dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_rule"), dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_condition"), dem(c.w, "SELECT count(*) AS n FROM audit_log")], truoc);
});

test("thayCho: ca đua khi dòng cũ đã đóng sẵn ngày liền trước — bị đổi giữa chừng → 409 stale, không ghi gì", async () => {
  const c = await setup();
  await gieo(c);
  const p07 = c.id.get("P07")!;
  await ok(c.w.call("POST", `/api/pricing/phi-don/${p07}/ket-thuc`, { as: ADM, body: { validTo: "2026-12-31", expectedUpdatedAt: await capNhat(c, p07) } }), 200);
  const mocCu = await capNhat(c, p07);
  c.w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => /prc_transfer_fee_rule/.test(s.sql)), () => {
    c.w.sqlite.prepare("UPDATE prc_transfer_fee_rule SET valid_to_date = '2026-12-20', updated_at = '2030-01-01T00:00:00.000Z' WHERE id = ?").run(p07);
  });
  const truoc = [dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_rule"), dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_condition"), dem(c.w, "SELECT count(*) AS n FROM audit_log")];
  assert.equal((await ok(thay(c, p07, P07_MOI, mocCu), 409)).json.error.code, "stale");
  assert.deepEqual([dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_rule"), dem(c.w, "SELECT count(*) AS n FROM prc_transfer_fee_condition"), dem(c.w, "SELECT count(*) AS n FROM audit_log")], truoc);
});
