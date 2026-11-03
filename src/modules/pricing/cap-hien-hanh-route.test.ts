// ADR-0155 Đ2.5 — kế hoạch lượt 2 Task 4.1: route đọc `GET /api/pricing/cap-hien-hanh` cho cột «Cấp độ đại lý» ở Quản lý tài khoản. Chỉ đọc, không nhận `ids`, trả MỌI hồ sơ đang mang
// vai được hưởng; cổng `office` + `partner.commission.view` + chặn `holdsPartner` (tài khoản lai cũng bị chặn). Số câu cố định, gọi đúng `tomTatHoaHongHoSo` rồi đối chiếu với route
// hồ sơ `GET /api/pricing/ho-so/:id/hoa-hong` — không luật thứ hai. Không tên hồ sơ, không SĐT. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs); tên GIẢ.
// Khuôn: ho-so-hoa-hong.test.ts, doi-cap-rieng.test.ts, orders/chup-xac-nhan.test.ts.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PERMISSION_CODES, can, holdsPartner, isOffice, type PermissionCode } from "../../shared/permissions.ts";
import { addDays, vnToday } from "../../shared/vn-date.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const HDV = "22222222-2222-4222-8222-222222222222";
const SA = "33333333-3333-4333-8333-333333333333";
const KT = "44444444-4444-4444-8444-444444444444";
const ADM = "55555555-5555-4555-8555-555555555555";
const DT = "66666666-6666-4666-8666-666666666666"; // Đối tác
const HR = "77777777-7777-4777-8777-777777777777";
const KP = "99999999-9999-4999-8999-999999999990"; // tài khoản lai Kế toán + Đối tác
const AT = "2026-10-01T00:00:00.000Z";
const DUONG = "/api/pricing/cap-hien-hanh";
const H = () => vnToday(new Date());
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };

const KHOA_DTO = ["cap", "coMucRieng", "doiDuoc", "nguon", "partyId", "rieng", "sapApTu"];
const pid = (n: number) => `dda00000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const TEN_HO_SO = (n: number) => `Công ty Dò Tìm Số ${n}`;
let seq = 0;

function setup(tuyChon: Record<string, unknown> = {}): W {
  const w = world(tuyChon);
  for (const [id, phone, name, perms] of [
    [SALES, "0900000001", "An Bán", ["SALES"]], [HDV, "0900000002", "Nam HDV", ["FIELD"]], [SA, "0900000003", "Chủ", ["SUPER_ADMIN"]], [KT, "0900000005", "Lan Kế Toán", ["ACCOUNTING"]],
    [ADM, "0900000006", "Quản Trị", ["ADMIN"]], [DT, "0900000008", "Đối Tác Một", ["PARTNER"]], [HR, "0900000009", "Hà Nhân Sự", ["HR"]], [KP, "0900000011", "Khoa Lai Kế", ["ACCOUNTING", "PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '${AT}', '${AT}')`);
  return w;
}
function themHoSo(w: W, n: number): string {
  const id = pid(n);
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', ?, 1, ?, ?)").run(id, TEN_HO_SO(n), AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(id, AT, AT);
  return id;
}
const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => {
  const r = await p;
  assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`);
  return r;
};
const themLoai = async (w: W, ten: string): Promise<string> => (await ok(w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten } }), 201, `loại ${ten}`)).json.loai.code as string;
async function taoMuc(w: W, ten: string, tyLeBp: number): Promise<string> {
  const code = (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten } }), 201, `mức ${ten}`)).json.muc.code as string;
  await ok(w.call("POST", `/api/pricing/muc-ta/${code}/dong`, { as: KT, body: { phamVi: "ALL", kieu: "RATE", tuNgay: "2026-01-01", tyLeBp } }), 201, `dòng ${ten}`);
  return code;
}
const ganMuc = (w: W, loai: string, muc: string) => ok(w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai, muc, tuNgay: "2026-01-01" } }), 201, `gắn ${loai}→${muc}`);
const ganHoSo = (w: W, id: string, code: string) => ok(w.call("POST", `/api/parties/${id}/roles`, { as: ADM, body: { roleTypeCode: code } }), 201, `gắn loại ${code}`);
const datRieng = (w: W, id: string, muc: string, tuNgay: string, denNgay?: string, as = ADM) =>
  w.call("POST", `/api/pricing/ho-so/${id}/muc-rieng`, { as, body: { muc, tuNgay, ...(denNgay === undefined ? {} : { denNgay }) } });
const doiRieng = (w: W, rid: string, muc: string, tuNgay: string, as = ADM) => w.call("POST", `/api/pricing/muc-rieng/${rid}/doi`, { as, body: { muc, tuNgay } });
const ngungRieng = (w: W, rid: string, denNgay: string, as = ADM) => w.call("POST", `/api/pricing/muc-rieng/${rid}/ket-thuc`, { as, body: { denNgay } });
const dongRiengDoiTac = (w: W, partyId: string) =>
  ok(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "DOI_TAC", partyId }, phamVi: "ALL", kieu: "RATE", tuNgay: "2026-01-01", tyLeBp: 1500 } }), 201, "dòng riêng đối tác");
const dongRiengLoai = (w: W, loai: string) =>
  ok(w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { doiTuong: { loai: "VAI", code: loai }, phamVi: "ALL", kieu: "RATE", tuNgay: "2026-01-01", tyLeBp: 700 } }), 201, "dòng riêng loại");
const doc = (w: W, as: string): Promise<Res> => w.call("GET", DUONG, { as });
const hoSoCua = (r: Res, id: string): any => (r.json.hoSo as any[]).find((x) => x.partyId === id);
const rieng1 = (w: W, partyId: string): string => String(w.q("SELECT id FROM prc_party_tier WHERE party_id = ? AND voided_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1", partyId)[0].id);

/** Bộ hồ sơ đủ bốn nguồn + các tổ hợp mức riêng, dùng cho đối chiếu (f) và đếm câu (f3). */
async function boHoSo(w: W) {
  const loaiA = await themLoai(w, "Loại A"), loaiB = await themLoai(w, "Loại B"), loaiC = await themLoai(w, "Loại C"), loaiD = await themLoai(w, "Loại D"), loaiE = await themLoai(w, "Loại E");
  const mucA = await taoMuc(w, "Cấp A", 1000), mucB = await taoMuc(w, "Cấp B", 800), mucR = await taoMuc(w, "Cấp R", 1200);
  await ganMuc(w, loaiA, mucA); await ganMuc(w, loaiB, mucB); await ganMuc(w, loaiD, mucA);
  const id = { vai: themHoSo(w, 1), rieng: themHoSo(w, 2), xung: themHoSo(w, 3), chua: themHoSo(w, 4), khong: themHoSo(w, 5), vaiLoai: themHoSo(w, 6), riengLoai: themHoSo(w, 7), riengDoiTac: themHoSo(w, 8), vaiDoiTac: themHoSo(w, 9) };
  await ganHoSo(w, id.vai, loaiA);
  await ganHoSo(w, id.rieng, loaiA); await ok(datRieng(w, id.rieng, mucR, "2026-01-01"), 201, "cấp riêng hồ sơ rieng");
  await ganHoSo(w, id.xung, loaiA); await ganHoSo(w, id.xung, loaiB);
  await ganHoSo(w, id.chua, loaiC);
  // id.khong: không mang vai nào được hưởng
  await ganHoSo(w, id.vaiLoai, loaiD); await dongRiengLoai(w, loaiD);
  await ganHoSo(w, id.riengLoai, loaiE); await dongRiengLoai(w, loaiE); await ok(datRieng(w, id.riengLoai, mucR, "2026-01-01"), 201, "cấp riêng hồ sơ riengLoai");
  await ganHoSo(w, id.riengDoiTac, loaiA); await ok(datRieng(w, id.riengDoiTac, mucR, "2026-01-01"), 201, "cấp riêng hồ sơ riengDoiTac"); await dongRiengDoiTac(w, id.riengDoiTac);
  await ganHoSo(w, id.vaiDoiTac, loaiA); await dongRiengDoiTac(w, id.vaiDoiTac);
  return { id, loaiA, loaiB, loaiC, loaiD, loaiE, mucA, mucB, mucR };
}

test("(e) quyền: Bán hàng, Kế toán, Quản trị, Toàn quyền 200 (cùng cổng route hồ sơ); Hướng dẫn viên, Nhân sự, Đối tác, tài khoản lai Kế toán + Đối tác 403; Bán hàng không vào được trang (GET /api/staff 403)", async () => {
  const w = setup();
  for (const as of [SALES, KT, ADM, SA]) await ok(doc(w, as), 200, `người ${as}`);
  for (const as of [HDV, HR, DT, KP]) {
    const r = await ok(doc(w, as), 403, `người ${as}`);
    assert.equal(r.json.error.code, "forbidden");
  }
  assert.equal((await w.call("GET", "/api/staff", { as: SALES })).status, 403, "Bán hàng không qua cổng trang Quản lý tài khoản");
  for (const as of [ADM, SA, HR]) assert.equal((await w.call("GET", "/api/staff", { as })).status, 200, `trang tài khoản mở được với ${as}`);
  assert.equal((await w.call("GET", DUONG)).status, 401, "chưa đăng nhập");
});

test("(e3) hai vế của cổng: quét MỌI tập quyền qua cổng văn phòng — chỉ tập có partner.commission.view và không giữ Đối tác được 200 (mỗi lớp tương đương một tài khoản); mã nguồn route còn đủ hai vế", async () => {
  const w = setup();
  const lop = new Map<string, PermissionCode[][]>(); // khoá "<view>|<doiTac>" → các tập quyền (chỉ tập qua cổng văn phòng)
  let tapQuaCong = 0;
  for (let mask = 1; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const nguoi = { id: "quet", permissions };
    if (!isOffice(nguoi)) continue;
    tapQuaCong++;
    const khoa = `${can(nguoi, "partner.commission.view")}|${holdsPartner(nguoi)}`;
    lop.set(khoa, [...(lop.get(khoa) ?? []), permissions]);
  }
  assert.ok(tapQuaCong > 0 && lop.has("true|false") && lop.has("true|true"), "chống bài rỗng: có tập được và tập bị chặn vì giữ Đối tác");
  let n = 0;
  for (const [khoa, ds] of lop) {
    const [view, doiTac] = khoa.split("|").map((x) => x === "true");
    const mong = view && !doiTac ? 200 : 403;
    let dung = false;
    for (const permissions of ds) {
      const id = `aaaaaaaa-aaaa-4aaa-8aaa-${String(++n).padStart(12, "0")}`;
      try { seedStaff(w.sqlite, { id, phone: `09000100${String(n).padStart(2, "0")}`, name: `Tập ${n}`, perms: [...permissions] }); } catch { continue; } // tổ hợp CSDL không cho tạo (LC-1) thì thử tập khác cùng lớp
      assert.equal((await doc(w, id)).status, mong, `lớp view=${view} giữ Đối tác=${doiTac}: ${permissions.join("+")}`);
      dung = true;
      break;
    }
    assert.ok(dung, `lớp ${khoa}: không tạo được tài khoản đại diện`);
  }
  // Lớp «qua cổng văn phòng mà thiếu view» hôm nay RỖNG (mọi vai văn phòng đều có view) nên vế `can(view)` của route chưa thể thấy bằng hành vi; nếu ma trận đổi để có lớp này,
  // vòng trên tự thêm ca 403 (không cần sửa bài). Phần dưới quét mã nguồn để hai vế không bị gỡ lặng lẽ trong lúc lớp đó còn rỗng.
  const nguon = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  const dau = nguon.indexOf('route("GET", "/api/pricing/cap-hien-hanh"');
  assert.ok(dau >= 0, "tìm thấy route");
  const khoi = nguon.slice(dau, nguon.indexOf("route(", dau + 10));
  assert.match(khoi, /can\(staff, "partner\.commission\.view"\)/, "vế partner.commission.view còn trong route đọc");
  assert.match(khoi, /holdsPartner\(staff\)/, "vế holdsPartner còn trong route đọc");
});

test("(e2) Quản trị đặt, đổi, ngừng qua ba route có sẵn 2xx và đọc lại đúng; Nhân sự và tài khoản lai Kế toán + Đối tác bị 403 ở cả ba, không ghi gì", async () => {
  const w = setup();
  const hn = H();
  const loai = await themLoai(w, "Loại thử");
  const m1 = await taoMuc(w, "Cấp một", 1000), m2 = await taoMuc(w, "Cấp hai", 1200);
  const p = themHoSo(w, 1), q = themHoSo(w, 2);
  await ganHoSo(w, p, loai);
  await ganHoSo(w, q, loai);
  // 403 trước khi có gì: Nhân sự, tài khoản lai
  for (const as of [HR, KP]) assert.equal((await datRieng(w, p, m1, hn, undefined, as)).status, 403, `đặt: ${as}`);
  assert.equal(Number(w.q("SELECT count(*) n FROM prc_party_tier")[0].n), 0);
  // đặt
  await ok(datRieng(w, p, m1, addDays(hn, -3)), 201, "đặt");
  await ok(datRieng(w, q, m1, addDays(hn, -3)), 201, "đặt hồ sơ hai");
  let d = hoSoCua(await ok(doc(w, ADM), 200), p);
  assert.deepEqual([d.nguon, d.cap.code, d.cap.ten, d.rieng.tuNgay, d.rieng.denNgay, d.doiDuoc, d.sapApTu], ["RIENG", m1, "Cấp một", addDays(hn, -3), null, true, null]);
  const rid = d.rieng.id as string;
  const ridQ = hoSoCua(await ok(doc(w, ADM), 200), q).rieng.id as string;
  const truoc = [Number(w.q("SELECT count(*) n FROM prc_party_tier")[0].n), Number(w.q("SELECT count(*) n FROM audit_log")[0].n)];
  for (const as of [HR, KP]) {
    assert.equal((await doiRieng(w, rid, m2, addDays(hn, 1), as)).status, 403, `đổi: ${as}`);
    assert.equal((await ngungRieng(w, rid, hn, as)).status, 403, `ngừng: ${as}`);
  }
  assert.deepEqual([Number(w.q("SELECT count(*) n FROM prc_party_tier")[0].n), Number(w.q("SELECT count(*) n FROM audit_log")[0].n)], truoc, "403 không ghi gì");
  // đổi từ ngày mai: hôm nay vẫn cấp một (đã hẹn ngừng hết hôm nay), đã có cấp sắp áp dụng nên không đổi tiếp được
  await ok(doiRieng(w, rid, m2, addDays(hn, 1)), 200, "đổi");
  d = hoSoCua(await ok(doc(w, ADM), 200), p);
  assert.deepEqual([d.nguon, d.cap.code, d.rieng.id, d.rieng.denNgay, d.sapApTu, d.doiDuoc], ["RIENG", m1, rid, hn, addDays(hn, 1), false]);
  // ngừng hôm nay (đường «Dùng cấp theo vai trò»): hôm nay vẫn cấp riêng, đã có ngày ngừng
  await ok(ngungRieng(w, ridQ, hn), 200, "ngừng");
  const dq = hoSoCua(await ok(doc(w, ADM), 200), q);
  assert.deepEqual([dq.nguon, dq.cap.code, dq.rieng.denNgay, dq.sapApTu, dq.doiDuoc], ["RIENG", m1, hn, null, false]);
});

test("(f) đối chiếu: bốn nguồn, có và không có mức riêng của hồ sơ, của vai trò — mỗi hồ sơ khớp GET /api/pricing/ho-so/:id/hoa-hong; DTO đúng bảy khoá", async () => {
  const w = setup();
  const b = await boHoSo(w);
  const r = await ok(doc(w, ADM), 200);
  assert.equal(r.json.homNay, H());
  const thay = new Set<string>();
  for (const [ten, partyId] of Object.entries(b.id)) {
    if (ten === "khong") continue;
    const e = (await ok(w.call("GET", `/api/pricing/ho-so/${partyId}/hoa-hong`, { as: ADM }), 200, `ho-so ${ten}`)).json;
    const nguon = e.mucRieng ? "RIENG" : e.xungDot ? "XUNG_DOT" : e.vai.some((v: any) => v.muc) ? "THEO_VAI" : "CHUA_CO";
    const capMong = e.mucRieng ? e.mucRieng.muc : nguon === "THEO_VAI" ? e.vai.find((v: any) => v.muc).muc : null;
    const d = hoSoCua(r, partyId);
    assert.ok(d, `${ten}: có trong kết quả`);
    assert.deepEqual(Object.keys(d).sort(), KHOA_DTO, `${ten}: đúng bảy khoá`);
    assert.equal(d.nguon, nguon, `${ten}: nguồn`);
    assert.deepEqual(d.cap, capMong === null ? null : { code: capMong.code, ten: capMong.ten }, `${ten}: cấp`);
    assert.equal(d.coMucRieng, e.dongRiengDoiTac > 0 || (nguon === "THEO_VAI" && e.dongRiengLoai > 0), `${ten}: có mức riêng`);
    assert.deepEqual(d.rieng, e.mucRieng ? { id: e.mucRieng.id, tuNgay: e.mucRieng.tuNgay, denNgay: e.mucRieng.denNgay } : null, `${ten}: cấp riêng`);
    assert.equal(d.sapApTu, null);
    assert.equal(d.doiDuoc, true);
    thay.add(nguon);
  }
  assert.deepEqual([...thay].sort(), ["CHUA_CO", "RIENG", "THEO_VAI", "XUNG_DOT"], "chống bài rỗng: đủ bốn nguồn");
  // chống bài rỗng ở nhãn «có mức riêng»: cả hai vế của công thức đều có ca đúng và ca sai
  const co = (n: string) => hoSoCua(r, (b.id as any)[n]).coMucRieng;
  assert.deepEqual([co("vai"), co("vaiLoai"), co("vaiDoiTac"), co("rieng"), co("riengLoai"), co("riengDoiTac")], [false, true, true, false, false, true]);
});

test("(f2) hồ sơ không mang vai được hưởng không có trong kết quả; vai bị tắt thì hồ sơ rời khỏi kết quả; kết quả xếp theo mã hồ sơ", async () => {
  const w = setup();
  const b = await boHoSo(w);
  const r = await ok(doc(w, ADM), 200);
  assert.equal(hoSoCua(r, b.id.khong), undefined, "hồ sơ không vai");
  const mongIds = Object.entries(b.id).filter(([ten]) => ten !== "khong").map(([, id]) => id).sort();
  assert.deepEqual(r.json.hoSo.map((x: any) => x.partyId), mongIds, "đúng tám hồ sơ được hưởng, theo mã");
  // vai trò thường (không phải loại được hưởng) không đưa hồ sơ vào kết quả
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-khach', ?, 'CUSTOMER', '2026-01-01', ?, ?)").run(b.id.khong, AT, AT);
  assert.equal(hoSoCua(await ok(doc(w, ADM), 200), b.id.khong), undefined, "vai khách không được hưởng");
  // tắt loại C: hồ sơ chỉ mang loại C rời khỏi kết quả
  await ok(w.call("POST", `/api/pricing/loai-doi-tac/${b.loaiC}/tat`, { as: KT, body: {} }), 200, "tắt loại C");
  assert.equal(hoSoCua(await ok(doc(w, ADM), 200), b.id.chua), undefined, "loại đã tắt");
});

test("(f3) số câu cố định: 0, 1 và 5 hồ sơ cùng số câu; đúng sáu câu đọc bảng giá, không lặp theo hồ sơ", async () => {
  const w = setup();
  const dem = async (): Promise<string[]> => {
    const goc = w.env.DB.prepare;
    const ds: string[] = [];
    w.env.DB.prepare = (sql: string) => (ds.push(sql), goc(sql));
    try { await ok(doc(w, ADM), 200, "đếm câu"); } finally { w.env.DB.prepare = goc; }
    return ds;
  };
  const cauBang = (ds: string[]) => ds.filter((s) => /prc_|v_pty_open_role/.test(s));
  const loai = await themLoai(w, "Loại đếm");
  const muc = await taoMuc(w, "Cấp đếm", 1000);
  await ganMuc(w, loai, muc);
  await ok(doc(w, ADM), 200, "làm nóng: phiên của Quản trị đã có, không tính vào số câu");
  const k0 = await dem();
  const p1 = themHoSo(w, 1);
  await ganHoSo(w, p1, loai);
  const k1 = await dem();
  for (let n = 2; n <= 5; n++) {
    const p = themHoSo(w, n);
    await ganHoSo(w, p, loai);
    if (n % 2 === 0) await ok(datRieng(w, p, muc, "2026-01-01"), 201, `cấp riêng ${n}`);
    else await dongRiengDoiTac(w, p);
  }
  const k5 = await dem();
  assert.equal(hoSoCua(await ok(doc(w, ADM), 200), p1).partyId, p1, "chống bài rỗng: hồ sơ có trong kết quả");
  assert.equal(Number((await ok(doc(w, ADM), 200)).json.hoSo.length), 5, "chống bài rỗng: năm hồ sơ");
  assert.equal(cauBang(k0).length, 6, `sáu câu bảng giá: ${cauBang(k0).join(" || ")}`);
  assert.deepEqual([k0.length, k1.length, k5.length], [k0.length, k0.length, k0.length], "không đổi theo số hồ sơ");
  assert.equal(cauBang(k5).length, 6);
  assert.equal(new Set(cauBang(k5)).size, 6, "sáu câu khác nhau, không câu nào lặp");
});

test("(f4) phản hồi không có tên hồ sơ, SĐT, email; không nhật ký; chỉ đọc", async () => {
  const w = setup();
  const b = await boHoSo(w);
  const truoc = Number(w.q("SELECT count(*) n FROM audit_log")[0].n);
  const r = await ok(doc(w, ADM), 200);
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) assert.ok(!r.text.includes(TEN_HO_SO(n)), `tên hồ sơ ${n} lộ ra`);
  assert.doesNotMatch(r.text, /Công ty|display_name|party_name|phone|email|@|\b0\d{9}\b/, "không tên, SĐT, email");
  assert.ok(r.text.includes(b.mucR), "chống bài rỗng: có mã cấp");
  assert.equal(Number(w.q("SELECT count(*) n FROM audit_log")[0].n), truoc, "chỉ đọc: không nhật ký");
});

test("(f5) hai vai trò, một có cấp một chưa có cấp, vai chưa có cấp có mã đứng TRƯỚC (và đứng SAU): cấp là của vai có cấp, khớp route hồ sơ (kiểm độc lập m-1, phá thử M6f)", async () => {
  const w = setup();
  // Mã loại tự thêm do máy chủ sinh NGẪU NHIÊN ⇒ sắp ba loại theo mã rồi gắn cấp cho loại GIỮA, để thứ tự không phụ thuộc may rủi.
  const [l1, l2, l3] = [await themLoai(w, "Loại Một"), await themLoai(w, "Loại Hai"), await themLoai(w, "Loại Ba")].sort();
  const mucA = await taoMuc(w, "Cấp A", 1000);
  await ganMuc(w, l2, mucA);
  const p1 = themHoSo(w, 1), p2 = themHoSo(w, 2);
  await ganHoSo(w, p1, l1); await ganHoSo(w, p1, l2); // vai chưa có cấp (l1) đứng TRƯỚC vai có cấp (l2)
  await ganHoSo(w, p2, l2); await ganHoSo(w, p2, l3); // vai chưa có cấp (l3) đứng SAU
  const r = await ok(doc(w, ADM), 200);
  for (const [id, viTriChuaCap] of [[p1, 0], [p2, 1]] as const) {
    const e = (await ok(w.call("GET", `/api/pricing/ho-so/${id}/hoa-hong`, { as: ADM }), 200)).json;
    assert.equal(e.vai.length, 2);
    assert.equal(e.vai[viTriChuaCap].muc, null, "điều kiện của bài: vai chưa có cấp nằm đúng vị trí (trước / sau vai có cấp)");
    assert.equal(e.vai[1 - viTriChuaCap].muc?.code, mucA);
    const d = hoSoCua(r, id);
    assert.deepEqual([d.nguon, d.cap?.code], ["THEO_VAI", mucA], `hồ sơ có vai chưa-cấp ở vị trí ${viTriChuaCap}`);
  }
});

test("doiDuoc: cấp riêng đã hẹn ngày ngừng ⇒ false; có cấp riêng sắp áp dụng ⇒ false; cấp riêng mở ⇒ true (kể cả bắt đầu hôm nay); không cấp riêng ⇒ true; hai vai trò khác cấp ⇒ true", async () => {
  const w = setup();
  const hn = H();
  const loai = await themLoai(w, "Loại thử");
  const loai2 = await themLoai(w, "Loại hai");
  const m1 = await taoMuc(w, "Cấp một", 1000), m2 = await taoMuc(w, "Cấp hai", 800);
  await ganMuc(w, loai, m1);
  await ganMuc(w, loai2, m2);
  const p = { hen: themHoSo(w, 1), sap: themHoSo(w, 2), mo: themHoSo(w, 3), hnay: themHoSo(w, 4), khong: themHoSo(w, 5), xung: themHoSo(w, 6), vua: themHoSo(w, 7) };
  for (const id of [p.hen, p.sap, p.mo, p.hnay, p.khong, p.vua]) await ganHoSo(w, id, loai);
  await ganHoSo(w, p.xung, loai); await ganHoSo(w, p.xung, loai2);
  await ok(datRieng(w, p.hen, m2, addDays(hn, -5), addDays(hn, 10)), 201, "hẹn ngừng");
  await ok(datRieng(w, p.sap, m2, addDays(hn, 1)), 201, "sắp áp dụng");
  await ok(datRieng(w, p.mo, m2, addDays(hn, -5)), 201, "mở");
  await ok(datRieng(w, p.hnay, m2, hn), 201, "bắt đầu hôm nay");
  await ok(datRieng(w, p.vua, m2, addDays(hn, -5)), 201, "vừa đổi");
  await ok(doiRieng(w, rieng1(w, p.vua), m1, addDays(hn, 1)), 200, "đổi từ ngày mai");
  const r = await ok(doc(w, ADM), 200);
  const tom = (id: string) => { const d = hoSoCua(r, id); return [d.nguon, d.rieng === null ? null : d.rieng.denNgay, d.sapApTu, d.doiDuoc]; };
  assert.deepEqual(tom(p.hen), ["RIENG", addDays(hn, 10), null, false], "đã hẹn ngày ngừng");
  assert.deepEqual(tom(p.sap), ["THEO_VAI", null, addDays(hn, 1), false], "cấp riêng sắp áp dụng: hôm nay vẫn theo vai trò");
  assert.deepEqual(tom(p.mo), ["RIENG", null, null, true], "cấp riêng mở");
  assert.deepEqual(tom(p.hnay), ["RIENG", null, null, true], "bắt đầu hôm nay vẫn đổi được (từ ngày mai)");
  assert.deepEqual(tom(p.khong), ["THEO_VAI", null, null, true], "không cấp riêng");
  assert.deepEqual(tom(p.xung), ["XUNG_DOT", null, null, true], "hai vai trò khác cấp");
  assert.deepEqual(tom(p.vua), ["RIENG", hn, addDays(hn, 1), false], "vừa đổi từ ngày mai: đã có cấp sắp áp dụng");
  assert.equal(hoSoCua(r, p.sap).cap.code, m1, "hôm nay theo cấp của vai trò");
  assert.equal(hoSoCua(r, p.sap).rieng, null);
});

test("sapApTu là ngày SỚM nhất trong các cấp riêng sắp áp dụng, kể cả khi đặt cấp xa trước", async () => {
  const w = setup();
  const hn = H();
  const loai = await themLoai(w, "Loại thử");
  const m1 = await taoMuc(w, "Cấp một", 1000);
  const p = themHoSo(w, 1);
  await ganHoSo(w, p, loai);
  await ok(datRieng(w, p, m1, addDays(hn, 6)), 201, "cấp xa đặt trước");
  await ok(datRieng(w, p, m1, addDays(hn, 3), addDays(hn, 4)), 201, "cấp gần đặt sau");
  const d = hoSoCua(await ok(doc(w, ADM), 200), p);
  assert.deepEqual([d.nguon, d.rieng, d.sapApTu, d.doiDuoc], ["CHUA_CO", null, addDays(hn, 3), false]);
});

// ---- (g) đơn đã xác nhận không đổi khi đổi cấp riêng; đơn xác nhận sau ngày hiệu lực dùng cấp mới (khuôn orders/chup-xac-nhan.test.ts) ------------------------------------------
let seqDon = 0;
const uuidDon = () => `98989898-9898-4989-8989-${String(++seqDon).padStart(12, "0")}`;
/** Đơn NHÁP của Bán hàng, bên đặt `booker`, một dịch vụ ZA1 thành tiền `t`, ngày đi hôm nay (giờ VN, theo đồng hồ đang chạy). */
function nhapDon(w: W, booker: string, t: number): string {
  const id = uuidDon();
  const homNay = vnToday(new Date());
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, ?, ?)`).run(id, `TD-G${seqDon}`, SALES, t, t, t, booker, AT, AT);
  const s = `${id}-s0`;
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'ZA1', 'DV 0', 'perPax', 1, ?)`).run(s, id, homNay);
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total) VALUES (?, ?, ?, 'ZA1', 'adult', 'Người lớn', 1, ?, ?, ?)`).run(`${s}-i`, id, s, t, t, t);
  return id;
}
const xacNhanDon = (w: W, id: string) => w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } });
const chupDon = (w: W, id: string): string => JSON.stringify(w.q("SELECT * FROM ord_service_terms WHERE order_id = ? ORDER BY order_service_id", id));
const tyLeChup = (w: W, id: string): number[] => w.q("SELECT commission_rate_bp r FROM ord_service_terms WHERE order_id = ? ORDER BY order_service_id", id).map((x: any) => Number(x.r));

test("(g) đổi cấp riêng sau khi đơn đã xác nhận: ord_service_terms của đơn đó giống từng byte; đơn xác nhận trước ngày hiệu lực vẫn cấp cũ; đơn xác nhận sau ngày hiệu lực dùng cấp mới", async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2027-03-11T12:00:00+07:00") });
  try {
    const w = setup();
    const hn = H();
    assert.equal(hn, "2027-03-11", "đồng hồ giả đang chạy");
    const loai = await themLoai(w, "Loại thử");
    const m1 = await taoMuc(w, "Cấp một", 1000), m2 = await taoMuc(w, "Cấp hai", 2000);
    const p = themHoSo(w, 1);
    await ganHoSo(w, p, loai);
    await ok(datRieng(w, p, m1, "2027-03-01"), 201, "cấp riêng một");
    const a = nhapDon(w, p, 2_000_000);
    await ok(xacNhanDon(w, a), 200, "xác nhận đơn A");
    assert.deepEqual(tyLeChup(w, a), [1000], "đơn A theo cấp một");
    const chupA = chupDon(w, a);
    // văn phòng đổi cấp từ ngày mai bằng chính route mà cột sẽ gọi
    const d0 = hoSoCua(await ok(doc(w, ADM), 200), p);
    await ok(doiRieng(w, d0.rieng.id, m2, "2027-03-12"), 200, "đổi từ ngày mai");
    assert.equal(chupDon(w, a), chupA, "đơn A: bản chụp giống từng byte sau khi đổi cấp");
    const b = nhapDon(w, p, 3_000_000);
    await ok(xacNhanDon(w, b), 200, "xác nhận đơn B trước ngày hiệu lực");
    assert.deepEqual(tyLeChup(w, b), [1000], "đơn B xác nhận hôm nay vẫn cấp cũ");
    assert.equal(chupDon(w, a), chupA);
    let d = hoSoCua(await ok(doc(w, ADM), 200), p);
    assert.deepEqual([d.nguon, d.cap.code, d.sapApTu], ["RIENG", m1, "2027-03-12"], "hôm nay: cấp một; cấp hai sắp áp dụng");
    mock.timers.tick(24 * 3600 * 1000);
    assert.equal(H(), "2027-03-12");
    d = hoSoCua(await ok(doc(w, ADM), 200), p);
    assert.deepEqual([d.nguon, d.cap.code, d.cap.ten, d.rieng.tuNgay, d.sapApTu, d.doiDuoc], ["RIENG", m2, "Cấp hai", "2027-03-12", null, true], "sang ngày hiệu lực: cột nói cấp hai");
    const c = nhapDon(w, p, 4_000_000);
    await ok(xacNhanDon(w, c), 200, "xác nhận đơn C sau ngày hiệu lực");
    assert.deepEqual(tyLeChup(w, c), [2000], "đơn C dùng cấp mới");
    assert.equal(chupDon(w, a), chupA, "đơn A vẫn giống từng byte");
    assert.deepEqual(tyLeChup(w, b), [1000], "đơn B vẫn cấp cũ");
  } finally {
    mock.timers.reset();
  }
});

test("(k7) «Dùng cấp theo vai trò» hôm nay: valid_to_date = hôm nay; hôm nay vẫn nguon RIENG (kể cả theoVaiTu ngày mai), ngày mai THEO_VAI; đơn đã chụp hôm nay không đổi", async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2027-03-11T12:00:00+07:00") });
  try {
    const w = setup();
    const hn = H();
    const loai = await themLoai(w, "Loại thử");
    const m1 = await taoMuc(w, "Cấp một", 1000), mV = await taoMuc(w, "Cấp của vai trò", 700);
    await ganMuc(w, loai, mV);
    const p = themHoSo(w, 1);
    await ganHoSo(w, p, loai);
    await ok(datRieng(w, p, m1, "2027-03-01"), 201, "cấp riêng");
    const don = nhapDon(w, p, 2_000_000);
    await ok(xacNhanDon(w, don), 200, "đơn chụp hôm nay");
    const chup = chupDon(w, don);
    assert.deepEqual(tyLeChup(w, don), [1000]);
    let d = hoSoCua(await ok(doc(w, ADM), 200), p);
    const r = await ok(ngungRieng(w, d.rieng.id, hn), 200, "dùng cấp theo vai trò");
    assert.equal(r.json.mucRieng.denNgay, hn);
    assert.equal(w.q("SELECT valid_to_date v FROM prc_party_tier WHERE id = ?", d.rieng.id)[0].v, hn, "valid_to_date = hôm nay");
    d = hoSoCua(await ok(doc(w, ADM), 200), p);
    assert.deepEqual([d.nguon, d.cap.code, d.rieng.denNgay, d.doiDuoc], ["RIENG", m1, hn, false], "hôm nay vẫn cấp riêng, đã hẹn ngày ngừng");
    mock.timers.tick(24 * 3600 * 1000);
    d = hoSoCua(await ok(doc(w, ADM), 200), p);
    assert.deepEqual([d.nguon, d.cap.code, d.cap.ten, d.rieng, d.doiDuoc], ["THEO_VAI", mV, "Cấp của vai trò", null, true], "ngày mai theo vai trò");
    assert.equal(chupDon(w, don), chup, "đơn đã chụp: giống từng byte");
    const sau = nhapDon(w, p, 1_000_000);
    await ok(xacNhanDon(w, sau), 200, "đơn sau");
    assert.deepEqual(tyLeChup(w, sau), [700], "đơn xác nhận ngày mai theo cấp của vai trò");
  } finally {
    mock.timers.reset();
  }
});
