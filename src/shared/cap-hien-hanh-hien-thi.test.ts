// ADR-0155 Đ2 — kế hoạch lượt 2 Task 4.2: luật hiển thị thuần của cột «Cấp độ đại lý» (src/shared/cap-hien-hanh-hien-thi.ts). Hai việc chính:
//   (a) CHỮ của ô đúng chữ của ADR cho đủ năm trạng thái, chỉ «Chưa có vai trò» không bấm được; dòng không giữ quyền Đối tác thì ô trống;
//   (b) NGÀY MẶC ĐỊNH của bảng bấm qua được luật của máy chủ (`kiemDoi`, `kiemNgung` ở pricing/rules.ts và ba route thật) — ghim hai phía, không luật thứ hai.
// Các bài (k4), (k5), (k9) chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs); ngày dựng theo hôm nay thật. Tên GIẢ.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import type { CapHienHanhDto, SuaXemTruocResponse } from "./contracts.ts";
import { CHU_CAP, cauNgayMacDinh, macDinhBangCap, nhanTheoVaiTu, ngayMayLucMo, nutMoBang, oCapCuaDong, suaDuocCot, thayCotCap, thucHienLenhGhiCap, yeuCauGhiCap, type DuongGhiCap } from "./cap-hien-hanh-hien-thi.ts";
import { PERMISSION_CODES, can, holdsPartner, type PermissionCode } from "./permissions.ts";
import { NGHIA_HON_DAO, TU_DA_LOAI } from "./bang-tu-giao-dien.ts";
import { addDays, vnToday } from "./vn-date.ts";
import { capHienHanhCuaHoSo } from "../modules/pricing/rules.ts";
import { kiemDoi, kiemNgung } from "../modules/pricing/rules.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../tests/audit/harness.mjs";

const HN = "2027-03-11";
const DOI_TAC = { permissions: ["PARTNER"] as PermissionCode[], partyId: "pty-1" };
const dto = (v: Partial<CapHienHanhDto>): CapHienHanhDto => ({ partyId: "pty-1", nguon: "CHUA_CO", cap: null, coMucRieng: false, rieng: null, sapApTu: null, doiDuoc: true, ...v });
const CAP = { code: "MT_AAAAAAAA", ten: "Đại lý cấp 2" };
const RIENG = { id: "r-1", tuNgay: "2027-03-01", denNgay: null };

test("(k) đủ năm trạng thái đúng chữ ADR; chỉ «Chưa có vai trò» không bấm được; nhãn và ngày theo vai trò chỉ từ dữ liệu máy chủ", () => {
  const ca: { ten: string; v: CapHienHanhDto | undefined; chu: string; moBang: boolean }[] = [
    { ten: "cấp riêng", v: dto({ nguon: "RIENG", cap: CAP, rieng: RIENG }), chu: "Đại lý cấp 2 (cấp riêng)", moBang: true },
    { ten: "theo vai trò", v: dto({ nguon: "THEO_VAI", cap: CAP }), chu: "Đại lý cấp 2 (theo vai trò)", moBang: true },
    { ten: "chưa có cấp", v: dto({ nguon: "CHUA_CO" }), chu: "Chưa có cấp", moBang: true },
    { ten: "hai vai trò khác cấp", v: dto({ nguon: "XUNG_DOT" }), chu: "Hai vai trò khác cấp", moBang: true },
    { ten: "chưa có vai trò (không có trong kết quả)", v: undefined, chu: "Chưa có vai trò", moBang: false },
  ];
  for (const c of ca) {
    const o = oCapCuaDong(DOI_TAC, c.v);
    assert.ok(o, c.ten);
    assert.equal(o.chu, c.chu, c.ten);
    assert.equal(o.moBang, c.moBang, c.ten);
  }
  assert.equal(ca.filter((c) => !oCapCuaDong(DOI_TAC, c.v)!.moBang).length, 1, "chỉ một trạng thái không bấm được");
  assert.equal(CHU_CAP.chuaCoVaiTro, "Chưa có vai trò");
  // cấp riêng đã hẹn ngày ngừng: theoVaiTu = ngày liền sau; troHoaHong theo doiDuoc của máy chủ; coMucRieng chép từ máy chủ
  const hen = oCapCuaDong(DOI_TAC, dto({ nguon: "RIENG", cap: CAP, rieng: { ...RIENG, denNgay: "2027-03-20" }, doiDuoc: false, coMucRieng: true }))!;
  assert.deepEqual([hen.theoVaiTu, hen.troHoaHong, hen.coMucRieng], ["2027-03-21", true, true]);
  assert.equal(nhanTheoVaiTu("2027-03-21"), "Theo vai trò từ 21/03/2027");
  const mo = oCapCuaDong(DOI_TAC, dto({ nguon: "RIENG", cap: CAP, rieng: RIENG }))!;
  assert.deepEqual([mo.theoVaiTu, mo.troHoaHong, mo.coMucRieng], [null, false, false]);
  const sap = oCapCuaDong(DOI_TAC, dto({ nguon: "THEO_VAI", cap: CAP, sapApTu: "2027-03-12", doiDuoc: false }))!;
  assert.deepEqual([sap.theoVaiTu, sap.troHoaHong], [null, true], "có cấp riêng sắp áp dụng: trỏ trang Hoa hồng");
});

test("(k2) dòng không giữ quyền Đối tác ⇒ null (ô trống) dù máy chủ có trả gì; chưa có hồ sơ ⇒ «Chưa có vai trò»; tài khoản lai có Đối tác vẫn có ô", () => {
  const v = dto({ nguon: "THEO_VAI", cap: CAP });
  for (const permissions of [[], ["SALES"], ["ACCOUNTING"], ["ADMIN"], ["SUPER_ADMIN"], ["HR"], ["FIELD"], ["DRIVER"], ["DRIVER_PARTNER"], ["INTERN"]] as PermissionCode[][]) {
    assert.equal(oCapCuaDong({ permissions, partyId: "pty-1" }, v), null, permissions.join("+") || "không quyền");
    assert.equal(oCapCuaDong({ permissions, partyId: null }, undefined), null);
  }
  assert.equal(oCapCuaDong({ permissions: ["PARTNER"], partyId: null }, v)!.chu, "Chưa có vai trò", "partyId null: không tin dữ liệu thừa");
  assert.equal(oCapCuaDong({ permissions: ["PARTNER"], partyId: null }, v)!.moBang, false);
  assert.equal(oCapCuaDong({ permissions: ["ACCOUNTING", "PARTNER"], partyId: "pty-1" }, v)!.chu, "Đại lý cấp 2 (theo vai trò)");
});

test("(k3) nhãn «có mức riêng»: dongRiengDoiTac > 0 ở mọi nguồn; dongRiengLoai > 0 chỉ khi đang theo vai trò — tính trong capHienHanhCuaHoSo, ô chỉ chép", () => {
  const tom = (v: { mucRieng: boolean; vai: (string | null)[]; xungDot: boolean; doiTac: number; loai: number }) => ({
    laNguoiHuong: true, vai: v.vai.map((m, i) => ({ loaiCode: `L${i}`, mucCode: m, tuNgay: m ? "2026-01-01" : null })), xungDot: v.xungDot,
    dongRiengLoai: v.loai, dongRiengDoiTac: v.doiTac, mucRieng: v.mucRieng ? { mucCode: "M2", tuNgay: "2027-03-01" } : null,
  });
  const ten = new Map([["M1", "Cấp một"], ["M2", "Cấp hai"]]);
  const gan = [{ id: "g1", tier_code: "M2", valid_from_date: "2027-03-01", valid_to_date: null }];
  const nguon = [
    { ten: "RIENG", t: { mucRieng: true, vai: ["M1"], xungDot: false }, mong: "RIENG" },
    { ten: "THEO_VAI", t: { mucRieng: false, vai: ["M1"], xungDot: false }, mong: "THEO_VAI" },
    { ten: "XUNG_DOT", t: { mucRieng: false, vai: ["M1", "M2"], xungDot: true }, mong: "XUNG_DOT" },
    { ten: "CHUA_CO", t: { mucRieng: false, vai: [null], xungDot: false }, mong: "CHUA_CO" },
  ];
  for (const n of nguon) for (const doiTac of [0, 2]) for (const loai of [0, 3]) {
    const d = capHienHanhCuaHoSo(tom({ ...n.t, doiTac, loai }), { partyId: "pty-1", homNay: HN, tenCuaMuc: ten, ganCuaHoSo: n.mong === "RIENG" ? gan : [] });
    assert.equal(d.nguon, n.mong);
    const mong = doiTac > 0 || (n.mong === "THEO_VAI" && loai > 0);
    assert.equal(d.coMucRieng, mong, `${n.ten} doiTac=${doiTac} loai=${loai}`);
    assert.equal(oCapCuaDong(DOI_TAC, d)!.coMucRieng, mong, "ô chép nguyên");
  }
  // chống bài rỗng: cả hai vế đều có ca đúng
  assert.equal(capHienHanhCuaHoSo(tom({ mucRieng: false, vai: ["M1"], xungDot: false, doiTac: 0, loai: 1 }), { partyId: "p", homNay: HN, tenCuaMuc: ten, ganCuaHoSo: [] }).coMucRieng, true);
  assert.equal(capHienHanhCuaHoSo(tom({ mucRieng: true, vai: ["M1"], xungDot: false, doiTac: 1, loai: 0 }), { partyId: "p", homNay: HN, tenCuaMuc: ten, ganCuaHoSo: gan }).coMucRieng, true);
  assert.equal(capHienHanhCuaHoSo(tom({ mucRieng: true, vai: ["M1"], xungDot: false, doiTac: 0, loai: 5 }), { partyId: "p", homNay: HN, tenCuaMuc: ten, ganCuaHoSo: gan }).coMucRieng, false);
});

test("(k8) thayCotCap, suaDuocCot trên cả 1024 tập quyền: thấy cột ⇔ ô xem hoa hồng đối tác và không giữ Đối tác; sửa ⇔ ô ghi và không giữ Đối tác; Hành chính nhân sự không thấy", () => {
  let thay = 0, sua = 0, lai = 0;
  for (let mask = 0; mask < 1 << PERMISSION_CODES.length; mask++) {
    const permissions: PermissionCode[] = PERMISSION_CODES.filter((_, i) => mask & (1 << i));
    const nguoi = { id: "x", permissions };
    const mongThay = can(nguoi, "partner.commission.view") && !holdsPartner(nguoi);
    const mongSua = can(nguoi, "partner.commission.write") && !holdsPartner(nguoi);
    assert.equal(thayCotCap(nguoi), mongThay, permissions.join("+"));
    assert.equal(suaDuocCot(nguoi), mongSua, permissions.join("+"));
    if (holdsPartner(nguoi)) { assert.equal(thayCotCap(nguoi), false, `giữ Đối tác không thấy cột: ${permissions.join("+")}`); assert.equal(suaDuocCot(nguoi), false); lai += permissions.length > 1 ? 1 : 0; }
    thay += mongThay ? 1 : 0;
    sua += mongSua ? 1 : 0;
  }
  assert.ok(thay > 0 && sua > 0 && lai > 0, "chống bài rỗng: có tập thấy, có tập sửa, có tập lai bị chặn");
  assert.equal(thayCotCap({ id: "x", permissions: ["HR"] }), false, "Hành chính nhân sự không thấy cột");
  assert.equal(thayCotCap({ id: "x", permissions: ["ADMIN"] }), true);
  assert.equal(thayCotCap({ id: "x", permissions: ["SUPER_ADMIN"] }), true);
  assert.equal(thayCotCap({ id: "x", permissions: ["ACCOUNTING", "PARTNER"] }), false, "tài khoản lai không thấy cột");
  assert.equal(suaDuocCot({ id: "x", permissions: ["ADMIN", "PARTNER"] }), false);
});

test("(k6) bảng từ: mọi chữ cố định và chữ dựng ra của cột qua bảng từ giao diện (ADR-0130)", () => {
  const viPham = (chu: string) => {
    const bo = chu.replace(NGHIA_HON_DAO, "");
    return TU_DA_LOAI.find((t) => t.cam.test(t.cam.source.includes("Đđ]ảo") ? bo : chu)) ?? null;
  };
  const chu: string[] = [...Object.values(CHU_CAP), nhanTheoVaiTu("2027-03-21")];
  for (const v of [dto({ nguon: "RIENG", cap: CAP, rieng: RIENG }), dto({ nguon: "THEO_VAI", cap: CAP }), dto({ nguon: "CHUA_CO" }), dto({ nguon: "XUNG_DOT" }), undefined]) chu.push(oCapCuaDong(DOI_TAC, v)!.chu);
  const rieng = dto({ nguon: "RIENG", cap: CAP, rieng: { ...RIENG, tuNgay: HN } });
  for (const xem of [null, { homNay: HN, duong: "HUY_THAY" } as SuaXemTruocResponse, { homNay: HN, duong: "TU_NGAY", tuNgaySomNhat: "2027-03-13", denNgayToiDa: null } as SuaXemTruocResponse]) {
    chu.push(cauNgayMacDinh(macDinhBangCap(rieng, HN, xem), rieng, HN, xem));
  }
  chu.push(cauNgayMacDinh(macDinhBangCap(dto({}), HN, null), dto({}), HN, null));
  chu.push(cauNgayMacDinh(macDinhBangCap(dto({ nguon: "RIENG", cap: CAP, rieng: RIENG }), HN, null), dto({ nguon: "RIENG", cap: CAP, rieng: RIENG }), HN, null));
  assert.ok(chu.length >= 25, `chống bài rỗng: ${chu.length} chữ`);
  for (const c of chu) assert.equal(viPham(c), null, `«${c}» còn chữ đã loại`);
  // chống bài rỗng ở bộ quét: chữ cấm thật vẫn bị bắt
  assert.ok(viPham("Hai vai khác cấp"), "«vai» đứng một mình bị bắt");
  assert.ok(viPham("Cấp đại lý"), "«Cấp đại lý» bị bắt");
});

test("(k5b) «Dùng cấp theo vai trò» chỉ khi cấp riêng ĐÃ bắt đầu — vế phòng thủ: máy chủ chỉ trả cấp riêng đang áp dụng (bắt đầu ≤ hôm nay), nhưng hàm không tin điều đó, vì ngừng một cấp chưa bắt đầu là việc khác", () => {
  const chuaBatDau = dto({ nguon: "RIENG", cap: CAP, rieng: { id: "r-1", tuNgay: addDays(HN, 1), denNgay: null } });
  assert.equal(macDinhBangCap(chuaBatDau, HN, null).dungTheoVaiDuoc, false, "bắt đầu ngày mai ⇒ không có nút");
  assert.equal(macDinhBangCap(chuaBatDau, HN, null).tuNgay, addDays(HN, 2), "đổi cấp chưa bắt đầu: sớm nhất ngày liền sau ngày bắt đầu (khớp kiemDoi)");
  const dangChay = dto({ nguon: "RIENG", cap: CAP, rieng: { id: "r-1", tuNgay: HN, denNgay: null } });
  assert.equal(macDinhBangCap(dangChay, HN, null).dungTheoVaiDuoc, true, "bắt đầu hôm nay ⇒ có nút (chống bài rỗng)");
});

test("(k10) nutMoBang: chữ chính là NÚT chỉ khi ô bấm được ∧ người xem được sửa ∧ máy chủ nhận đổi; thiếu một vế là chữ (và liên kết trang Hoa hồng khi không đổi được)", () => {
  for (const moBang of [true, false]) for (const troHoaHong of [true, false]) for (const suaDuoc of [true, false]) {
    const o = { chu: "x", moBang, coMucRieng: false, theoVaiTu: null, troHoaHong };
    assert.equal(nutMoBang(o, suaDuoc), moBang && suaDuoc && !troHoaHong, `moBang=${moBang} troHoaHong=${troHoaHong} suaDuoc=${suaDuoc}`);
  }
  // qua ô thật của từng trạng thái
  const trangThai: { ten: string; v: CapHienHanhDto | undefined; nut: boolean }[] = [
    { ten: "cấp riêng mở", v: dto({ nguon: "RIENG", cap: CAP, rieng: RIENG }), nut: true },
    { ten: "cấp riêng đã hẹn ngày ngừng", v: dto({ nguon: "RIENG", cap: CAP, rieng: { ...RIENG, denNgay: "2027-03-20" }, doiDuoc: false }), nut: false },
    { ten: "theo vai trò", v: dto({ nguon: "THEO_VAI", cap: CAP }), nut: true },
    { ten: "theo vai trò, đã có cấp riêng sắp áp dụng", v: dto({ nguon: "THEO_VAI", cap: CAP, sapApTu: "2027-03-12", doiDuoc: false }), nut: false },
    { ten: "chưa có cấp", v: dto({ nguon: "CHUA_CO" }), nut: true },
    { ten: "hai vai trò khác cấp", v: dto({ nguon: "XUNG_DOT" }), nut: true },
    { ten: "chưa có vai trò", v: undefined, nut: false },
  ];
  for (const t of trangThai) {
    const o = oCapCuaDong(DOI_TAC, t.v)!;
    assert.equal(nutMoBang(o, true), t.nut, t.ten);
    assert.equal(nutMoBang(o, false), false, `${t.ten}: người xem không được sửa thì không có nút`);
  }
  assert.ok(trangThai.some((t) => t.nut) && trangThai.some((t) => !t.nut), "chống bài rỗng");
});

test("(k9) yeuCauGhiCap: đúng ba route có sẵn, thân đúng khoá; đổi / ngừng khi chưa có cấp riêng ⇒ null", () => {
  const chua = dto({ partyId: "pty-a/b" });
  const co = dto({ partyId: "pty-1", nguon: "RIENG", cap: CAP, rieng: RIENG });
  assert.deepEqual(yeuCauGhiCap({ kieu: "DAT", muc: "MT_X", tuNgay: HN }, chua), { url: "/api/pricing/ho-so/pty-a%2Fb/muc-rieng", body: { muc: "MT_X", tuNgay: HN } });
  assert.deepEqual(yeuCauGhiCap({ kieu: "DOI", muc: "MT_X", tuNgay: "2027-03-12" }, co), { url: "/api/pricing/muc-rieng/r-1/doi", body: { muc: "MT_X", tuNgay: "2027-03-12" } });
  assert.deepEqual(yeuCauGhiCap({ kieu: "DUNG_THEO_VAI_TRO", homNay: HN }, co), { url: "/api/pricing/muc-rieng/r-1/ket-thuc", body: { denNgay: HN } });
  assert.equal(yeuCauGhiCap({ kieu: "DOI", muc: "MT_X", tuNgay: HN }, chua), null);
  assert.equal(yeuCauGhiCap({ kieu: "DUNG_THEO_VAI_TRO", homNay: HN }, chua), null);
});

// ---- (k4), (k5), (k9 qua route) — ngày mặc định và ba lệnh ghi đi qua máy chủ thật ------------------------------------------------------------------------------------------------
const ADM = "55555555-5555-4555-8555-555555555555";
const KT = "44444444-4444-4444-8444-444444444444";
const AT = "2026-10-01T00:00:00.000Z";
const ORG = "dda00000-0000-4000-8000-0000000000d1";
const H = () => vnToday(new Date());
type W = ReturnType<typeof world>;
type Res = { status: number; text: string; json: any };
let seq = 0;
function setup(tuyChon: Record<string, unknown> = {}): W {
  const w = world(tuyChon);
  seedStaff(w.sqlite, { id: KT, phone: "0900000005", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000006", name: "Quản Trị", perms: ["ADMIN"] });
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'ORGANIZATION', 'Spa Hoa Sen', 1, ?, ?)").run(ORG, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_organization (party_id, created_at, updated_at) VALUES (?, ?, ?)").run(ORG, AT, AT);
  return w;
}
const ok = async (p: Promise<Res>, ma: number, ten = ""): Promise<Res> => { const r = await p; assert.equal(r.status, ma, `${ten} ${r.status}: ${r.text}`); return r; };
async function taoMuc(w: W, ten: string, tyLeBp: number): Promise<string> {
  const code = (await ok(w.call("POST", "/api/pricing/muc-ta", { as: KT, body: { ten } }), 201, `cấp ${ten}`)).json.muc.code as string;
  await ok(w.call("POST", `/api/pricing/muc-ta/${code}/dong`, { as: KT, body: { phamVi: "ALL", kieu: "RATE", tyLeBp, tuNgay: "2026-01-01" } }), 201, `dòng ${ten}`);
  return code;
}
/** Hồ sơ ORG mang một vai trò được hưởng (gắn cấp vai trò M0); hai cấp TA1, TA2; nếu `tu` thì cấp riêng ORG → TA1 từ `tu`. */
async function nen(w: W, tu: string | null) {
  const loai = (await ok(w.call("POST", "/api/pricing/loai-doi-tac", { as: KT, body: { ten: `Vai trò thử ${++seq}` } }), 201, "vai trò")).json.loai.code as string;
  await ok(w.call("POST", `/api/parties/${ORG}/roles`, { as: ADM, body: { roleTypeCode: loai } }), 201, "gắn vai trò");
  const m0 = await taoMuc(w, `M0-${seq}`, 700), ta1 = await taoMuc(w, `TA1-${seq}`, 1000), ta2 = await taoMuc(w, `TA2-${seq}`, 1200);
  await ok(w.call("POST", "/api/pricing/muc-ta/gan", { as: KT, body: { loai, muc: m0, tuNgay: "2026-01-01" } }), 201, "gắn cấp vai trò");
  if (tu !== null) await ok(w.call("POST", `/api/pricing/ho-so/${ORG}/muc-rieng`, { as: ADM, body: { muc: ta1, tuNgay: tu } }), 201, "cấp riêng");
  return { m0, ta1, ta2 };
}
const docCap = async (w: W): Promise<CapHienHanhDto> => (await ok(w.call("GET", "/api/pricing/cap-hien-hanh", { as: ADM }), 200, "đọc cấp")).json.hoSo.find((x: CapHienHanhDto) => x.partyId === ORG);
const dongRieng = (w: W, id: string): { valid_from_date: string; valid_to_date: string | null } => w.q("SELECT * FROM prc_party_tier WHERE id = ?", id)[0];

type CaNgay = { ten: string; tu: number | null; chup: number | null; dungMong: boolean };
const CA_NGAY: CaNgay[] = [
  { ten: "không cấp riêng (đặt mới)", tu: null, chup: null, dungMong: false },
  { ten: "cấp riêng bắt đầu hôm qua, chưa đơn nào chụp", tu: -1, chup: null, dungMong: true },
  { ten: "cấp riêng bắt đầu hôm nay, chưa đơn nào chụp", tu: 0, chup: null, dungMong: true },
  { ten: "đã chụp tới hôm nay", tu: -5, chup: 0, dungMong: true },
  { ten: "đã chụp tới ngày mai", tu: -5, chup: 1, dungMong: false },
  { ten: "bắt đầu hôm nay và đã chụp tới hôm nay", tu: 0, chup: 0, dungMong: true },
];

test("(k4) ngày mặc định qua được luật máy chủ: kiemDoi nhận đúng ngày mặc định và từ chối ngày liền trước; route Đổi / Đặt thật trả 2xx với đúng ngày đó", async (t) => {
  const hn = H();
  for (const ca of CA_NGAY) await t.test(ca.ten, async () => {
    const w = setup({ ngayChupGia: ca.chup === null ? null : addDays(hn, ca.chup) });
    const { ta2 } = await nen(w, ca.tu === null ? null : addDays(hn, ca.tu));
    const v = await docCap(w);
    assert.equal(v.nguon, ca.tu === null ? "THEO_VAI" : "RIENG", "chống bài rỗng: dựng đúng trạng thái");
    const xem: SuaXemTruocResponse | null = v.rieng === null ? null : (await ok(w.call("GET", `/api/pricing/muc-rieng/${v.rieng.id}/sua`, { as: ADM }), 200, "xem trước")).json;
    const m = macDinhBangCap(v, hn, xem);
    assert.equal(m.kieu, ca.tu === null ? "DAT" : "DOI");
    if (v.rieng === null) {
      assert.equal(m.tuNgay, hn);
      await ok(w.call("POST", `/api/pricing/ho-so/${ORG}/muc-rieng`, { as: ADM, body: { muc: ta2, tuNgay: m.tuNgay } }), 201, "đặt từ ngày mặc định");
      return;
    }
    const row = dongRieng(w, v.rieng.id);
    const cu = { validFrom: row.valid_from_date, validTo: row.valid_to_date, daHuy: false };
    const ngayChup = ca.chup === null ? null : addDays(hn, ca.chup);
    const kd = kiemDoi({ cu, tuNgay: m.tuNgay, homNay: hn, ngayChup });
    assert.ok(kd.ok, `kiemDoi từ chối ngày mặc định ${m.tuNgay}: ${kd.ok ? "" : kd.error}`);
    assert.equal(kiemDoi({ cu, tuNgay: addDays(m.tuNgay, -1), homNay: hn, ngayChup }).ok, false, "ngày liền trước ngày mặc định phải bị từ chối (mặc định là sớm nhất)");
    const r = await w.call("POST", `/api/pricing/muc-rieng/${v.rieng.id}/doi`, { as: ADM, body: { muc: ta2, tuNgay: m.tuNgay } });
    assert.equal(r.status, 200, `route Đổi từ chối ngày mặc định ${m.tuNgay}: ${r.text}`);
    const sau = await docCap(w);
    assert.equal(sau.sapApTu ?? sau.rieng?.tuNgay, m.tuNgay, "cấp mới bắt đầu đúng ngày mặc định");
  });
});

test("(k5) «Dùng cấp theo vai trò»: kiemNgung nhận ngày kết thúc = hôm nay ⇔ dungTheoVaiDuoc; đã chụp tới ngày mai, cấp riêng bắt đầu ngày mai, đã hẹn ngày ngừng ⇒ false; route ket-thuc thật đồng ý", async (t) => {
  const hn = H();
  type CaD = { ten: string; tu: number; den?: number; chup: number | null; dung: boolean };
  const ca: CaD[] = [
    { ten: "bắt đầu hôm qua, chưa chụp", tu: -1, chup: null, dung: true },
    { ten: "bắt đầu hôm nay, chưa chụp", tu: 0, chup: null, dung: true },
    { ten: "đã chụp tới hôm nay", tu: -5, chup: 0, dung: true },
    { ten: "đã chụp tới ngày mai", tu: -5, chup: 1, dung: false },
    { ten: "đã hẹn ngày ngừng hôm nay", tu: -5, den: 0, chup: null, dung: false },
    { ten: "ngày ngừng còn xa (rút ngắn được)", tu: -5, den: 10, chup: null, dung: true },
    { ten: "cấp riêng bắt đầu ngày mai", tu: 1, chup: null, dung: false },
  ];
  for (const c of ca) await t.test(c.ten, async () => {
    const w = setup({ ngayChupGia: c.chup === null ? null : addDays(hn, c.chup) });
    const { ta1 } = await nen(w, null);
    const dat = await ok(w.call("POST", `/api/pricing/ho-so/${ORG}/muc-rieng`, { as: ADM, body: { muc: ta1, tuNgay: addDays(hn, c.tu), ...(c.den === undefined ? {} : { denNgay: addDays(hn, c.den) }) } }), 201, "cấp riêng");
    const rid = String(w.q("SELECT id FROM prc_party_tier WHERE party_id = ? AND voided_at IS NULL", ORG)[0].id);
    assert.ok(dat.json.laNguoiHuong);
    const v = await docCap(w);
    const xem: SuaXemTruocResponse | null = v.rieng === null ? null : (await w.call("GET", `/api/pricing/muc-rieng/${rid}/sua`, { as: ADM })).json;
    // v.rieng null (cấp riêng chưa tới ngày) ⇒ dungTheoVaiDuoc false theo định nghĩa; kiemNgung vẫn phải đồng ý với kết luận
    const m = macDinhBangCap(v, hn, xem?.homNay === undefined ? null : xem);
    assert.equal(m.dungTheoVaiDuoc, c.dung, "dungTheoVaiDuoc");
    const row = dongRieng(w, rid);
    const kn = kiemNgung({ raw: { denNgay: hn }, cu: { validFrom: row.valid_from_date, validTo: row.valid_to_date, daHuy: false }, ngayChup: c.chup === null ? null : addDays(hn, c.chup), homNay: hn });
    assert.equal(kn.ok, c.dung, `kiemNgung ${kn.ok ? "nhận" : `từ chối: ${kn.message}`} nhưng dungTheoVaiDuoc = ${c.dung}`);
    const yc = yeuCauGhiCap({ kieu: "DUNG_THEO_VAI_TRO", homNay: hn }, { ...v, rieng: { id: rid, tuNgay: row.valid_from_date, denNgay: row.valid_to_date } })!;
    const r = await w.call("POST", yc.url, { as: ADM, body: yc.body });
    assert.equal(r.status === 200, c.dung, `route ket-thuc ${r.status}: ${r.text}`);
    if (c.dung) assert.equal(dongRieng(w, rid).valid_to_date, hn, "valid_to_date = hôm nay");
  });
});

test("(k9) ba lệnh ghi do yeuCauGhiCap dựng được máy chủ thật nhận: đặt 201, đổi 200, dùng cấp theo vai trò 200; cấp đọc lại đúng sau từng lệnh", async () => {
  const w = setup();
  const hn = H();
  const { ta1, ta2, m0 } = await nen(w, null);
  let v = await docCap(w);
  let yc = yeuCauGhiCap({ kieu: "DAT", muc: ta1, tuNgay: macDinhBangCap(v, hn, null).tuNgay }, v)!;
  await ok(w.call("POST", yc.url, { as: ADM, body: yc.body }), 201, "đặt");
  v = await docCap(w);
  assert.deepEqual([v.nguon, v.cap?.code], ["RIENG", ta1]);
  const xem = (await ok(w.call("GET", `/api/pricing/muc-rieng/${v.rieng!.id}/sua`, { as: ADM }), 200, "xem trước")).json as SuaXemTruocResponse;
  const m = macDinhBangCap(v, hn, xem);
  yc = yeuCauGhiCap({ kieu: "DOI", muc: ta2, tuNgay: m.tuNgay }, v)!;
  await ok(w.call("POST", yc.url, { as: ADM, body: yc.body }), 200, "đổi");
  v = await docCap(w);
  assert.deepEqual([v.nguon, v.cap?.code, v.sapApTu, v.doiDuoc], ["RIENG", ta1, addDays(hn, 1), false], "hôm nay vẫn cấp một; đã có cấp sắp áp dụng nên ô trỏ trang Hoa hồng");
  assert.equal(oCapCuaDong({ permissions: ["PARTNER"], partyId: ORG }, v)!.troHoaHong, true);
  // hồ sơ khác: dùng cấp theo vai trò
  const w2 = setup();
  const n2 = await nen(w2, addDays(hn, -2));
  let v2 = await docCap(w2);
  assert.equal(macDinhBangCap(v2, hn, null).dungTheoVaiDuoc, true);
  const y2 = yeuCauGhiCap({ kieu: "DUNG_THEO_VAI_TRO", homNay: hn }, v2)!;
  await ok(w2.call("POST", y2.url, { as: ADM, body: y2.body }), 200, "dùng cấp theo vai trò");
  v2 = await docCap(w2);
  assert.deepEqual([v2.nguon, v2.cap?.code, v2.rieng?.denNgay, v2.doiDuoc], ["RIENG", n2.ta1, hn, false], "hôm nay vẫn cấp riêng, đã hẹn ngừng hết hôm nay");
  const o = oCapCuaDong({ permissions: ["PARTNER"], partyId: ORG }, v2)!;
  assert.equal(o.theoVaiTu, addDays(hn, 1), "ô nói: theo vai trò từ ngày mai");
  assert.ok(n2.m0.length > 0);
  assert.ok(m0.length > 0);
});

// ---- Sửa sau kiểm độc lập Đợt 4 -----------------------------------------------------------------------------------------------------------------------------------------------------
// N-1 (ruling R12): trang tải 23:59 giờ Việt Nam, bấm 00:01 — ngày «hôm nay» giữ từ lúc tải trang đã cũ một ngày. «Dùng cấp theo vai trò» không có ô ngày nên người dùng không thấy ngày được gửi:
// ngày phải đọc LẠI từ máy chủ ngay lúc BẤM (hàm `thucHienLenhGhiCap` + `DuongGhiCap.docNgayMay`); lệnh có ô ngày hiện ra (đặt, đổi) lấy ngày máy chủ lúc MỞ bảng (`ngayMayLucMo`). Các bài dưới đây
// chạy máy chủ thật với đồng hồ giả qua nửa đêm (khuôn `mock.timers` của bài (g) ở cap-hien-hanh-route.test.ts).
const NUA_DEM_TAI_TRANG = "2027-03-11T23:59:00+07:00";
const HAI_PHUT = 2 * 60 * 1000;
type YC = { url: string; body: Record<string, string> };
type Dem = { docNgay: number; gui: YC[] };
/** Đường thật cho `thucHienLenhGhiCap`: đọc ngày bằng `GET …/muc-rieng/:id/sua` (route có sẵn, mang `homNay` máy chủ); gửi bằng route thật. `docDuoc` false = mô phỏng mất mạng lúc đọc ngày. */
function duongThat(w: W, v: CapHienHanhDto, dem: Dem, docDuoc = true): DuongGhiCap {
  return {
    docNgayMay: async () => {
      dem.docNgay++;
      if (!docDuoc || v.rieng === null) return null;
      const r = await w.call("GET", `/api/pricing/muc-rieng/${v.rieng.id}/sua`, { as: ADM });
      return r.status === 200 ? (r.json.homNay as string) : null;
    },
    gui: async (yc) => {
      dem.gui.push(yc);
      const r = await w.call("POST", yc.url, { as: ADM, body: yc.body });
      return r.status < 300 ? null : `${r.status} ${r.text}`;
    },
  };
}
async function voiMayQuaNuaDem(fn: () => Promise<void>): Promise<void> {
  mock.timers.enable({ apis: ["Date"], now: Date.parse(NUA_DEM_TAI_TRANG) });
  try {
    await fn();
  } finally {
    mock.timers.reset();
  }
}

test("(n1) nửa đêm: «Dùng cấp theo vai trò» đọc lại ngày máy chủ lúc BẤM và gửi ngày đó (không gửi ngày 11 của lúc tải trang); cấp riêng còn áp dụng hôm nay, theo vai trò từ ngày mai", async () => {
  await voiMayQuaNuaDem(async () => {
    const w = setup();
    await nen(w, "2027-03-01");
    const v = await docCap(w); // trang tải lúc 23:59 ngày 11/3
    assert.equal(H(), "2027-03-11");
    mock.timers.tick(HAI_PHUT);
    assert.equal(H(), "2027-03-12", "bấm lúc 00:01 ngày 12/3");
    const dem: Dem = { docNgay: 0, gui: [] };
    assert.equal(await thucHienLenhGhiCap({ kieu: "DUNG_THEO_VAI_TRO" }, v, duongThat(w, v, dem)), null);
    assert.equal(dem.docNgay, 1, "đọc lại ngày máy chủ đúng một lần, lúc bấm");
    assert.deepEqual(dem.gui.map((g) => g.body), [{ denNgay: "2027-03-12" }], "gửi ngày máy chủ lúc bấm, KHÔNG phải ngày lúc tải trang");
    const sau = await docCap(w);
    assert.deepEqual([sau.nguon, sau.rieng?.denNgay], ["RIENG", "2027-03-12"], "hôm nay (12/3) vẫn theo cấp riêng");
    assert.equal(oCapCuaDong({ permissions: ["PARTNER"], partyId: ORG }, sau)!.theoVaiTu, "2027-03-13", "theo vai trò từ ngày mai (13/3)");
    // Đối chứng (bài có nghĩa): gửi NGÀY CŨ như trước khi sửa thì máy chủ vẫn nhận 200, nhưng cấp riêng mất ngay từ hôm nay — đúng hậu quả mà bài này chặn.
    const w2 = setup();
    await nen(w2, "2027-03-01");
    const v2 = await docCap(w2);
    assert.equal((await w2.call("POST", `/api/pricing/muc-rieng/${v2.rieng!.id}/ket-thuc`, { as: ADM, body: { denNgay: "2027-03-11" } })).status, 200);
    assert.equal((await docCap(w2)).nguon, "THEO_VAI", "ngày cũ ⇒ hôm nay đã mất cấp riêng");
  });
});

test("(n1b) không đọc được ngày máy chủ lúc bấm ⇒ KHÔNG gửi gì, trả câu lỗi tại chỗ; lệnh không hợp trạng thái ⇒ cũng không gửi; máy chủ từ chối ⇒ trả câu của máy chủ", async () => {
  const w = setup();
  await nen(w, addDays(H(), -3));
  const v = await docCap(w);
  const dem: Dem = { docNgay: 0, gui: [] };
  assert.equal(await thucHienLenhGhiCap({ kieu: "DUNG_THEO_VAI_TRO" }, v, duongThat(w, v, dem, false)), CHU_CAP.khongDocDuocNgay);
  assert.equal(dem.docNgay, 1);
  assert.equal(dem.gui.length, 0, "không đọc được ngày thì không gửi");
  const sau = await docCap(w);
  assert.deepEqual([sau.nguon, sau.rieng?.denNgay], ["RIENG", null], "cấp riêng giữ nguyên");
  // đổi khi chưa có cấp riêng: yeuCauGhiCap trả null ⇒ không gửi
  const chua = dto({ partyId: ORG });
  assert.equal(await thucHienLenhGhiCap({ kieu: "DOI", muc: "MT_X", tuNgay: HN }, chua, duongThat(w, chua, dem)), CHU_CAP.khongSuaDuoc);
  assert.equal(dem.gui.length, 0);
  // gửi lỗi (máy chủ từ chối) ⇒ trả đúng câu của `gui`
  const tuChoi: DuongGhiCap = { docNgayMay: async () => HN, gui: async () => "400 Ngày kết thúc không hợp lệ" };
  assert.equal(await thucHienLenhGhiCap({ kieu: "DUNG_THEO_VAI_TRO" }, v, tuChoi), "400 Ngày kết thúc không hợp lệ");
});

test("(n2) nửa đêm: bảng đặt / đổi lấy ngày máy chủ LÚC MỞ (xem.homNay trước, không có xem thì ngày của danh sách cấp); ngày mặc định máy chủ nhận; không đọc lại lúc bấm", async () => {
  await voiMayQuaNuaDem(async () => {
    // Đổi: cấp riêng cũ bắt đầu từ trước, chưa đơn nào dùng
    const w = setup();
    const { ta2 } = await nen(w, "2027-03-01");
    const v = await docCap(w); // tải 23:59
    mock.timers.tick(HAI_PHUT); // mở bảng 00:01
    const xem = (await ok(w.call("GET", `/api/pricing/muc-rieng/${v.rieng!.id}/sua`, { as: ADM }), 200, "xem trước")).json as SuaXemTruocResponse;
    const mt = (await ok(w.call("GET", "/api/pricing/muc-ta", { as: ADM }), 200, "danh sách cấp")).json;
    assert.deepEqual([xem.homNay, mt.homNay], ["2027-03-12", "2027-03-12"]);
    const homNay = ngayMayLucMo(xem, mt.homNay);
    assert.equal(homNay, "2027-03-12");
    const m = macDinhBangCap(v, homNay, xem);
    assert.equal(m.tuNgay, "2027-03-12");
    // đối chứng: ngày mặc định tính từ ngày lúc tải trang (11/3) bị máy chủ từ chối
    const cu = macDinhBangCap(v, "2027-03-11", xem).tuNgay;
    assert.equal(cu, "2027-03-11");
    assert.equal((await w.call("POST", `/api/pricing/muc-rieng/${v.rieng!.id}/doi`, { as: ADM, body: { muc: ta2, tuNgay: cu } })).status, 400, "ngày cũ ⇒ 400");
    const dem: Dem = { docNgay: 0, gui: [] };
    assert.equal(await thucHienLenhGhiCap({ kieu: "DOI", muc: ta2, tuNgay: m.tuNgay }, v, duongThat(w, v, dem)), null, "ngày mặc định lấy lúc mở được nhận");
    assert.equal(dem.docNgay, 0, "lệnh có ô ngày hiện ra: không đọc lại lúc bấm");
    assert.deepEqual(dem.gui.map((g) => g.body.tuNgay), ["2027-03-12"]);
    // Đặt: chưa có cấp riêng ⇒ không có `xem`, ngày lấy từ danh sách cấp đọc lúc mở
    const w2 = setup();
    const { ta1 } = await nen(w2, null);
    const v2 = await docCap(w2);
    assert.equal(v2.rieng, null);
    const mt2 = (await ok(w2.call("GET", "/api/pricing/muc-ta", { as: ADM }), 200, "danh sách cấp 2")).json;
    const homNay2 = ngayMayLucMo(null, mt2.homNay);
    assert.equal(homNay2, "2027-03-12");
    const m2 = macDinhBangCap(v2, homNay2, null);
    assert.equal(await thucHienLenhGhiCap({ kieu: "DAT", muc: ta1, tuNgay: m2.tuNgay }, v2, duongThat(w2, v2, { docNgay: 0, gui: [] })), null);
    assert.equal((await docCap(w2)).rieng?.tuNgay, "2027-03-12", "cấp riêng bắt đầu đúng ngày máy chủ lúc mở");
  });
});

test("(n2b) ngayMayLucMo: có xem trước thì lấy ngày của nó, không có thì ngày của danh sách cấp (cả hai do máy chủ vừa trả lúc mở bảng)", () => {
  const xem: SuaXemTruocResponse = { homNay: "2027-03-12", duong: "HUY_THAY" };
  assert.equal(ngayMayLucMo(xem, "2027-03-11"), "2027-03-12", "ưu tiên xem.homNay");
  assert.equal(ngayMayLucMo(null, "2027-03-11"), "2027-03-11");
});

test("(n3) R13: câu cố định cạnh nút «Dùng cấp theo vai trò» nói ngày hiệu lực VÀ hậu quả khi vai trò chưa có cấp, đúng chữ của ô", () => {
  assert.equal(CHU_CAP.dungTheoVaiTroLuuY, "Có hiệu lực từ ngày mai. Nếu vai trò chưa có cấp, tài khoản sẽ thành «Chưa có cấp».");
  assert.ok(CHU_CAP.dungTheoVaiTroLuuY.includes(`«${CHU_CAP.chuaCoCap}»`), "dùng đúng chữ «Chưa có cấp» của ô");
});

// m-1 (kiểm độc lập): các phá thử còn sống của lượt trước.
const tomTat = (o: { vai: (string | null)[]; mucRieng?: boolean }) => ({
  laNguoiHuong: true, vai: o.vai.map((m, i) => ({ loaiCode: `L${i}`, mucCode: m, tuNgay: m ? "2026-01-01" : null })), xungDot: false,
  dongRiengLoai: 0, dongRiengDoiTac: 0, mucRieng: o.mucRieng ? { mucCode: "M2", tuNgay: "2027-03-01" } : null,
});
const TEN_MUC = new Map([["M1", "Cấp một"], ["M2", "Cấp hai"]]);
test("(n4) capHienHanhCuaHoSo: hai vai trò, một có cấp một chưa có — cấp là của vai CÓ cấp dù vai chưa có cấp đứng trước hay sau; cấp riêng không tìm được dòng ⇒ không cho đổi", () => {
  const v = (g: { id: string; tier_code: string; valid_from_date: string; valid_to_date: string | null }[] = []) => ({ partyId: "pty-1", homNay: HN, tenCuaMuc: TEN_MUC, ganCuaHoSo: g });
  for (const vai of [[null, "M1"], ["M1", null], [null, null, "M1"]]) {
    const d = capHienHanhCuaHoSo(tomTat({ vai }), v());
    assert.deepEqual([d.nguon, d.cap], ["THEO_VAI", { code: "M1", ten: "Cấp một" }], `vai ${JSON.stringify(vai)}: cấp của vai có cấp, không phải của vai đứng đầu`);
  }
  assert.deepEqual(capHienHanhCuaHoSo(tomTat({ vai: [null, null] }), v()).nguon, "CHUA_CO");
  // cấp riêng đang áp mà không tìm được dòng của nó (không xảy ra với dữ liệu thật): đừng đoán «chưa có» rồi đặt chồng
  const khongDong = capHienHanhCuaHoSo(tomTat({ vai: ["M1"], mucRieng: true }), v());
  assert.deepEqual([khongDong.nguon, khongDong.rieng, khongDong.doiDuoc], ["RIENG", null, false]);
  // chống bài rỗng: có dòng thì đổi được
  const coDong = capHienHanhCuaHoSo(tomTat({ vai: ["M1"], mucRieng: true }), v([{ id: "g1", tier_code: "M2", valid_from_date: "2027-03-01", valid_to_date: null }]));
  assert.deepEqual([coDong.nguon, coDong.rieng?.id, coDong.doiDuoc], ["RIENG", "g1", true]);
});
