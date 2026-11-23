// ADR-0213 Đ4.4 (mốc B1 Task 11; vòng sửa 1 theo người kiểm độc lập) — bài quét XẾP NHÓM mọi chỗ đọc hồ sơ của tài khoản NGƯỜI GỌI trong `src/` (trừ tệp test). «Đọc» = `<tên>.partyId`
// (kể cả `?.`, `ctx.staff.partyId`) hoặc gỡ `{ …partyId… } = <tên>`, với <tên> = `staff`, `actor`, `who`, `viewer`, `caller`, MỌI tên khai kiểu `StaffProfile` / `PermissionHolder`
// (kể cả `Pick<…>`, `Readonly<…>`) trong cùng tệp, và tên gán lại `const x = <tên>` — đổi tên biến không còn lọt (bài cũ chỉ bắt `staff|actor`).
//   THAY_MAT    = «bên đang thay mặt» (bên đặt khi lập, «Bên đặt của tôi» ở /api/auth/me, lọc danh mục theo luật bán, dịch vụ bị chặn bán, phiếu nộp tiền, hạn mức khi lập) — chỉ
//                 được đọc qua `benDangThayMat` / tư cách của gốc lắp ráp, hoặc so với BÊN ĐẶT ĐÃ CHỐT của đơn;
//   CHINH_NGUOI = chính người đó (hồ sơ của tôi, giấy tờ, xưng hô, tin cho người, việc văn phòng và tài xế, tự đặt Trả sau, Trả sau / sổ của tôi — xem tổ chức là Đ5, Task 12).
// Mỗi tệp liệt kê các mẩu mã (đoạn chữ phải có trên dòng) kèm nhóm và SỐ DÒNG khớp; một dòng đọc mới không khớp mẩu nào, hoặc thêm một dòng cùng mẩu ⇒ ĐỎ: người thêm phải xếp nhóm.
// Không khoá số dòng (sửa chỗ khác không làm đỏ). Chú thích bị bỏ trước khi quét.
// Bài thứ hai (Đ3.5, Ruling R3): `acting_party_id` / `actingPartyId` chỉ ở hàm ghi nhật ký (module audit) và câu của đơn (chèn, đọc meta, đổi khách) — handler không tự truyền vào nhật ký.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const GOC = new URL("..", import.meta.url).pathname;
type Nhom = "THAY_MAT" | "CHINH_NGUOI";
type Muc = { doan: string; nhom: Nhom; so: number };

const XEP: Record<string, Muc[]> = {
  "src/index.ts": [
    { doan: "if (!holdsPartner(actor) || actor.partyId === null) return [];", nhom: "THAY_MAT", so: 1 }, // tuCachCuaToi — nguồn của benDangThayMat
    { doan: "const minh = actor.partyId;", nhom: "THAY_MAT", so: 1 },
    // ADR-0213 Đ5 (Task 12): người quản lý có hiệu lực là vai của CHÍNH người đó trên tổ chức (cờ quanLyBenDat, «tổ chức tôi quản lý») — không phải bên đang thay mặt.
    { doan: "if (!holdsPartner(actor) || actor.partyId === null) return false;", nhom: "CHINH_NGUOI", so: 1 }, // laQuanLyCoHieuLuc
    { doan: "ql.personPartyId === actor.partyId && ql.staffId === actor.id", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "if (actor.partyId === null || !holdsPartner(actor)) return [];", nhom: "CHINH_NGUOI", so: 1 }, // toChucToiQuanLy
    { doan: "tcToChucCuaNguoi(db, actor.partyId)", nhom: "CHINH_NGUOI", so: 1 },
  ],
  "src/modules/orders/index.ts": [
    { doan: "benDatDoiTacBiCam({ laDoiTac, benThayMat: staff.partyId", nhom: "THAY_MAT", so: 1 }, // K1 ở đường «không tư cách» (bên đang thay mặt = chính mình)
    { doan: "if (staff.partyId === null && guiLaHuong) return { ok: false, res: PARTNER_NO_PARTY() };", nhom: "THAY_MAT", so: 1 }, // bên đặt khi lập, đường không tư cách
    { doan: "if (giaTri !== null && staff.partyId === null) return { loi: error(409, \"partner_no_party\"", nhom: "CHINH_NGUOI", so: 1 }, // lời khai cọc: tài khoản chưa gắn hồ sơ
    { doan: "if (an.ten && staff.partyId === null) return PARTNER_NO_PARTY();", nhom: "CHINH_NGUOI", so: 1 }, // «Đối tác không nhập tên, SĐT khách» (ADR-0228 Đ1): tên của chính người lập trên biên nhận
    { doan: "chiXemDonDuocGiao: seesOnlyAssignedOrders(staff), partyId: staff.partyId,", nhom: "CHINH_NGUOI", so: 2 }, // Hướng dẫn viên: đơn mình phụ trách
    { doan: "nguoiLap: { id: staff.id, partyId: staff.partyId }", nhom: "CHINH_NGUOI", so: 1 }, // Bán hàng tự nhận phụ trách
  ],
  "src/modules/orders/xac-nhan-route.ts": [
    { doan: "moYeuCau(env.DB, { id, staffId: staff.id, partyId: staff.partyId,", nhom: "CHINH_NGUOI", so: 2 },
    { doan: "nguoiLap: { id: staff.id, partyId: staff.partyId }", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "const ghiO = !holdsPartner(staff) && staff.partyId !== null;", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "partyId: staff.partyId!, actorId: staff.id", nhom: "CHINH_NGUOI", so: 1 },
  ],
  "src/modules/orders/xac-nhan-chung.ts": [{ doan: "{ cua: \"nguoi-lap\", partyId: staff.partyId }", nhom: "CHINH_NGUOI", so: 1 }], // chỉ chọn câu báo
  "src/modules/orders/price-guards.ts": [{ doan: "(staff.partyId ?? null) === don.beneficiaryPartyId", nhom: "CHINH_NGUOI", so: 1 }], // trần giảm giá: người hưởng là CHÍNH mình (siết)
  "src/modules/billing/index.ts": [
    { doan: "staff.partyId !== null && (staff.partyId === dich || (await dangGanToChuc(db, staff.partyId, dich)))", nhom: "CHINH_NGUOI", so: 1 }, // TU_DAT_TRA_SAU (Đ4.5)
    { doan: "partyId: staff.partyId,", nhom: "CHINH_NGUOI", so: 1 }, // người gọi của sổ tiền (người thu)
    { doan: "coPhieuNopTien({ nguoi: staff, partyId: staff.partyId, bookerPartyId:", nhom: "THAY_MAT", so: 2 }, // phiếu nộp tiền: so với bên đặt ĐÃ CHỐT của đơn
    { doan: "soCuaToi(env.DB, staff.partyId)", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "khoanCuaToi(env.DB, staff.partyId)", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "const partyId = staff.partyId;", nhom: "CHINH_NGUOI", so: 1 }, // «Trả sau của tôi»
    { doan: "macDinh.ok && macDinh.chon ? macDinh.chon.partyId : staff.partyId", nhom: "THAY_MAT", so: 1 }, // hạn mức khi lập — qua benDangThayMat
  ],
  "src/modules/receipt/index.ts": [
    { doan: "coPhieuNopTien({ nguoi: staff, partyId: staff.partyId, bookerPartyId: order.bookerPartyId", nhom: "THAY_MAT", so: 1 },
    { doan: "const qlPhieu = quanLyBenDat || (staff.partyId !== order.bookerPartyId", nhom: "THAY_MAT", so: 1 }, // phiếu: so với bên đặt ĐÃ CHỐT; khác thì hỏi vai người quản lý (Đ5)
  ],
  "src/modules/dispatch/ban-hang-route.ts": [
    { doan: "if (staff.partyId === null) return KHONG_HO_SO();", nhom: "CHINH_NGUOI", so: 2 },
    { doan: "partyId: staff.partyId, actorId: staff.id", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "loiMoi.staffId !== staff.id || staff.partyId === null", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "inviteePartyId: staff.partyId", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "partyMoi = staff.partyId;", nhom: "CHINH_NGUOI", so: 1 },
  ],
  "src/modules/dispatch/index.ts": [{ doan: "const cauAbort = assigned && staff.partyId ?", nhom: "CHINH_NGUOI", so: 1 }],
  "src/modules/parties/index.ts": [
    { doan: "laChinhChu: id !== null && staff.partyId === id,", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "active: true, partyId: staff.partyId ?? null", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "staff.partyId ? getPartyDetail(db, staff.partyId)", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "staff.partyId ? phienBanDangDongY(db, staff.partyId)", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "if (!pid || !staff.partyId) return", nhom: "CHINH_NGUOI", so: 2 },
    { doan: "timPhieuCuaHoSo(env.DB, pid, staff.partyId)", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "rutPhieuStatement(env.DB, { id: pid, partyId: staff.partyId,", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "targetType: \"party\", targetId: staff.partyId,", nhom: "CHINH_NGUOI", so: 2 },
    { doan: "if (!r || r.party_id !== staff.partyId) return ERASURE_NOT_FOUND();", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "if (!staff.partyId) return json({ documents: []", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "listPersonDocuments(env.DB, staff.partyId, true)", nhom: "CHINH_NGUOI", so: 1 },
  ],
  "src/modules/parties/to-chuc-route.ts": [
    { doan: "x.personPartyId === ctx.staff.partyId", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "if (body.personPartyId === ctx.staff.partyId) return LOI_THAN(", nhom: "CHINH_NGUOI", so: 1 }, // người quản lý không yêu cầu chuyển cho chính mình (Task 10)
    { doan: "dongThanhVien(ctx, org, ctx.staff.partyId!, \"org_member_left\"", nhom: "CHINH_NGUOI", so: 1 }, // tự rời tổ chức
  ],
  "src/modules/parties/loi-moi.ts": [ // người được mời nhận lời mời cho CHÍNH hồ sơ của mình (ADR-0213 Đ7.4, Task 15)
    { doan: "if (!staff.partyId || (await ctx.taiKhoanGanDuoc(staff.partyId)) !== \"DUOC\")", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "lk.some((x) => x.personPartyId === staff.partyId)", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "daDong.some((d) => d.personPartyId === staff.partyId", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "person: staff.partyId, org: org.id", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "thành viên ${staff.partyId}", nhom: "CHINH_NGUOI", so: 1 },
  ],
  "src/modules/parties/quyen-to-chuc.ts": [ // vai của CHÍNH người gọi trên tổ chức (Đ6, Task 10)
    { doan: "if (who.partyId === null) return { quanLy: false, thanhVien: false, laQuanLyMo: false };", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "v.hl.personPartyId === who.partyId", nhom: "CHINH_NGUOI", so: 1 },
  ],
  // Phiếu công nợ đại lý: so hồ sơ người gọi với BÊN ĐẶT ĐÃ CHỐT của đơn (như phiếu nộp tiền), cộng vế người quản lý có hiệu lực của bên đặt (Đ5 — route tính, kể cả khi chính mình lập).
  "src/shared/cong-no-dai-ly.ts": [{ doan: "(who.partyId === bookerPartyId || laQuanLyBenDat)", nhom: "THAY_MAT", so: 1 }],
  "src/modules/thongbao/index.ts": [{ doan: "staff.partyId !== null && can(staff, \"trip.view\", { assigned: true })", nhom: "CHINH_NGUOI", so: 1 }],
  "src/modules/van-chuyen/index.ts": [
    { doan: "nen.trip.driver_party_id === staff.partyId", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "const coVeHan = staff.partyId !== null", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "hanTuChoiCuaCap(db, nen.trip.id, staff.partyId!)", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "staff.partyId ? await tripsCuaTaiXe(env.DB, staff.partyId,", nhom: "CHINH_NGUOI", so: 2 },
    { doan: "l.chuyen, phamVi, staff.partyId!)", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "than.value, staff.id, staff.partyId!, bayGioMs)", nhom: "CHINH_NGUOI", so: 2 },
    { doan: "{ ownerId: staff.id }) || !staff.partyId) return error(403", nhom: "CHINH_NGUOI", so: 3 },
    { doan: "khungCuaToiResponse(env.DB, staff.partyId,", nhom: "CHINH_NGUOI", so: 3 },
    { doan: "staff, staff.partyId, bayGioMs)", nhom: "CHINH_NGUOI", so: 2 },
  ],
  "src/modules/van-chuyen/tu-choi.ts": [{ doan: "const partyId = staff.partyId ?? \"\";", nhom: "CHINH_NGUOI", so: 1 }],
  "src/shared/handler-view.ts": [
    { doan: "if (staff.partyId === null || staff.fullName.trim() === \"\") return undefined;", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "return { partyId: staff.partyId, staffId: staff.id, name: staff.fullName };", nhom: "CHINH_NGUOI", so: 1 },
  ],
  "src/shared/thong-bao.ts": [{ doan: "partyId: staff.partyId ?? null };", nhom: "CHINH_NGUOI", so: 1 }],
};

const tepTs = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? tepTs(p) : p.endsWith(".ts") && !p.endsWith(".test.ts") ? [p] : [];
  });
/** Bỏ chú thích khối và chú thích dòng (`//` đứng sau khoảng trắng / dấu câu — không cắt `https://` trong chuỗi). Giữ số dòng. */
export const boChuThich = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[\s;,(){}])\/\/.*$/gm, "$1");
/** Tên luôn coi là tài khoản người gọi, cộng tên khai kiểu tài khoản và tên gán lại trong cùng tệp (điểm tựa kiểu chữ — không có bộ kiểu kiểu TS ở bài). */
const TEN_MAC_DINH = ["staff", "actor", "who", "viewer", "caller"];
export function tenTaiKhoan(s: string): Set<string> {
  const ten = new Set(TEN_MAC_DINH);
  for (const m of s.matchAll(/\b([A-Za-z_$][\w$]*)\??\s*:\s*(?:Readonly<\s*)?(?:(?:Pick|Omit)<\s*)?(?:StaffProfile|PermissionHolder)\b/g)) ten.add(m[1]!);
  for (let doi = true; doi;) {
    doi = false;
    // gán lại, kể cả qua thuộc tính: `const x = staff;`, `const u = ctx.staff;` (vế phải là đường thuộc tính kết thúc bằng một tên tài khoản)
    for (const m of s.matchAll(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:[A-Za-z_$][\w$]*\??\.)*([A-Za-z_$][\w$]*)\s*[;,)]/g)) if (ten.has(m[2]!) && !ten.has(m[1]!)) { ten.add(m[1]!); doi = true; }
    // gỡ đổi tên: `const { staff: x } = ctx;`, tham số `({ staff: x })` — `<tên tài khoản>: <định danh>` theo sau bởi `,` `}` `=`
    for (const m of s.matchAll(/\b([A-Za-z_$][\w$]*)\s*:\s*([a-z_$][\w$]*)\s*[,}=]/g)) if (ten.has(m[1]!) && !ten.has(m[2]!)) { ten.add(m[2]!); doi = true; }
  }
  return ten;
}
/** Các dòng (đã bỏ chú thích) đọc hồ sơ của tài khoản người gọi. */
export function dongDocHoSo(nguon: string): string[] {
  const s = boChuThich(nguon);
  const ten = [...tenTaiKhoan(s)].map((t) => t.replace(/\$/g, "\\$")).join("|");
  const doc = new RegExp(`(?<![\\w$.])(?:${ten})\\??\\.partyId\\b|\\bctx\\.staff\\??\\.partyId\\b|\\{[^{}]*\\bpartyId\\b[^{}]*\\}\\s*(?::[^=;]+)?=\\s*(?:ctx\\.)?(?:${ten})\\b`);
  return s.split("\n").filter((x) => doc.test(x)).map((x) => x.trim());
}
/**
 * CHO PHÉP KHÔNG XẾP NHÓM (có lý do từng dòng): tên trùng kiểu tài khoản nhưng KHÔNG phải người gọi.
 */
const KHONG_PHAI_NGUOI_GOI: Record<string, { doan: string; so: number; lyDo: string }[]> = {
  "src/modules/dispatch/rules.ts": [
    { doan: "if (!who.partyId) return { ok: false, message: \"Nhân viên này chưa có hồ sơ", so: 1, lyDo: "checkAssignee: `who` là người ĐƯỢC GIAO phụ trách, không phải người gọi" },
    { doan: "return { ok: true, partyId: who.partyId, name: who.fullName };", so: 1, lyDo: "checkAssignee: hồ sơ của người được giao" },
  ],
  "src/shared/cap-hien-hanh-hien-thi.ts": [
    { doan: "dong.partyId === null) return { chu: CHU_CAP.chuaCoVaiTro", so: 1, lyDo: "oCapCuaDong: `dong` là một dòng tài khoản ở bảng Quản lý tài khoản (đích), không phải người gọi" },
  ],
};
const DOC_HO_SO = /\b(?:staff|actor)\.partyId\b/; // chỉ còn dùng cho bài dương cũ

function quetHoSo(): Map<string, string[]> {
  const ra = new Map<string, string[]>();
  for (const p of tepTs(join(GOC, "src"))) {
    const tep = relative(GOC, p);
    const mien = KHONG_PHAI_NGUOI_GOI[tep] ?? [];
    const dong = dongDocHoSo(readFileSync(p, "utf8")).filter((d) => !mien.some((m) => d.includes(m.doan)));
    if (dong.length > 0) ra.set(tep, dong);
  }
  return ra;
}
function quet(re: RegExp): Map<string, string[]> {
  const ra = new Map<string, string[]>();
  for (const p of tepTs(join(GOC, "src"))) {
    const dong = boChuThich(readFileSync(p, "utf8")).split("\n").filter((x) => re.test(x)).map((x) => x.trim());
    if (dong.length > 0) ra.set(relative(GOC, p), dong);
  }
  return ra;
}

/** Lỗi xếp nhóm của MỘT tệp (thuần — bài quan sát chặn thật dùng lại). */
export function loiXepNhom(tep: string, dong: readonly string[], muc: readonly Muc[] | undefined): string[] {
  if (!muc) return [`${tep}: có ${dong.length} chỗ đọc hồ sơ của tài khoản mà tệp chưa có trong bảng xếp nhóm — xếp THAY_MAT hay CHINH_NGUOI (ADR-0213 Đ4.4)`];
  const loi: string[] = [];
  // Mỗi dòng thuộc về mẩu DÀI NHẤT nó chứa (mẩu ngắn như «partyId: staff.partyId,» không nuốt dòng của mẩu dài hơn).
  const cua = (d: string): Muc | undefined => muc.filter((m) => d.includes(m.doan)).sort((a, b) => b.doan.length - a.doan.length)[0];
  for (const d of dong) if (!cua(d)) loi.push(`${tep}: chỗ đọc chưa xếp nhóm: ${d.slice(0, 160)}`);
  for (const m of muc) {
    const n = dong.filter((d) => cua(d) === m).length;
    if (n !== m.so) loi.push(`${tep}: mẩu «${m.doan}» khớp ${n} dòng, bảng ghi ${m.so} — chỗ đọc mới / đã bỏ phải xếp lại nhóm`);
  }
  return loi;
}

test("Đ4.4: mọi chỗ đọc hồ sơ của tài khoản người gọi (mọi tên biến, cả gỡ { partyId }) trong src/ đã được xếp nhóm THAY_MAT hoặc CHINH_NGUOI (chỗ mới chưa xếp ⇒ đỏ)", () => {
  const hit = quetHoSo();
  // Miễn «không phải người gọi» phải còn khớp đúng số dòng (miễn thừa / lệch ⇒ đỏ).
  for (const [tep, ds] of Object.entries(KHONG_PHAI_NGUOI_GOI)) {
    const tat = dongDocHoSo(readFileSync(join(GOC, tep), "utf8"));
    for (const m of ds) assert.equal(tat.filter((d) => d.includes(m.doan)).length, m.so, `${tep}: miễn «${m.doan}» (${m.lyDo})`);
  }
  assert.ok(hit.size >= 15, "chống bài rỗng: bộ quét phải thấy các chỗ đọc hiện có");
  const loi = [...hit].flatMap(([tep, dong]) => loiXepNhom(tep, dong, XEP[tep]));
  for (const tep of Object.keys(XEP)) if (!hit.has(tep)) loi.push(`${tep}: bảng xếp nhóm có tệp nhưng mã không còn chỗ đọc nào — bỏ dòng ở bảng`);
  assert.deepEqual(loi, []);
});

test("Đ4.4: bộ xếp nhóm bắt một chỗ đọc mới (bài dương — mô phỏng thêm một dòng đọc staff.partyId)", () => {
  const tep = "src/modules/billing/index.ts";
  const goc = quetHoSo().get(tep)!;
  assert.deepEqual(loiXepNhom(tep, goc, XEP[tep]), []);
  assert.equal(loiXepNhom(tep, [...goc, "const ben = staff.partyId;"], XEP[tep]).length, 1);
  assert.equal(loiXepNhom(tep, [...goc, "return json((await soCuaToi(env.DB, staff.partyId)) satisfies X);"], XEP[tep]).length, 1, "thêm dòng cùng mẩu ⇒ lệch số");
  assert.equal(loiXepNhom("src/modules/moi/index.ts", ["staff.partyId"], undefined).length, 1);
  assert.equal(boChuThich("const a = 1; // staff.partyId\n/* actor.partyId */ const u = \"https://x\";").match(/partyId/g), null);
  void DOC_HO_SO;
});

test("Đ4.4 (vòng sửa 1): bộ đọc bắt đổi tên biến, `?.`, gỡ `{ partyId }`, tên khai kiểu tài khoản, tên gán lại — và không bắt hồ sơ của đối tượng khác", () => {
  assert.deepEqual(dongDocHoSo("const ben = who.partyId;"), ["const ben = who.partyId;"]);
  assert.deepEqual(dongDocHoSo("function f(nguoiGoi: StaffProfile) {\n  return nguoiGoi?.partyId;\n}"), ["return nguoiGoi?.partyId;"]);
  assert.deepEqual(dongDocHoSo("function f(u: Pick<PermissionHolder, \"id\"> & { partyId: string | null }) { return u.partyId; }").length, 1);
  assert.deepEqual(dongDocHoSo("const { partyId } = staff;"), ["const { partyId } = staff;"]);
  assert.deepEqual(dongDocHoSo("const { id, partyId: p } = ctx.staff;").length, 1);
  assert.deepEqual(dongDocHoSo("const tk = actor;\nconst x = tk.partyId;"), ["const x = tk.partyId;"]);
  assert.deepEqual(dongDocHoSo("const x = ctx.staff.partyId;").length, 1);
  // vòng sửa 1 Task 12 (người kiểm): gán lại qua thuộc tính và gỡ đổi tên
  assert.deepEqual(dongDocHoSo("const u = ctx.staff;\nconst p = u.partyId;"), ["const p = u.partyId;"]);
  assert.deepEqual(dongDocHoSo("const { staff: x } = ctx;\nreturn x.partyId;"), ["return x.partyId;"]);
  assert.deepEqual(dongDocHoSo("route(\"GET\", \"/x\", \"orders\", async ({ env, staff: nguoi }) => nguoi?.partyId);").length, 1);
  assert.deepEqual(dongDocHoSo("const a = t.partyId; const b = order.bookerPartyId; const c = huong.partyId;"), [], "hồ sơ của tư cách / đơn / người hưởng không phải hồ sơ người gọi");
  // Phá thử của người kiểm: thêm `who.partyId` vào pricing ⇒ tệp chưa có trong bảng ⇒ đỏ.
  assert.equal(loiXepNhom("src/modules/pricing/index.ts", dongDocHoSo("const ben = who.partyId;"), XEP["src/modules/pricing/index.ts"]).length, 1);
});

test("Đ3.5 (Ruling R3): acting_party_id / actingPartyId chỉ ở hàm ghi nhật ký và câu của đơn; không dòng nào ngoài module audit đưa nó vào nhật ký", () => {
  const hit = quet(/\b(?:acting_party_id|actingPartyId)\b/);
  // Task 18 (1a): chang-hanh-khach-repo.ts — câu «Nháp chờ» (`member_drafts_of_org`) chỉ LỌC ứng viên theo tư cách của đơn (WHERE), không đưa vào nhật ký.
  assert.deepEqual([...hit.keys()].sort(), ["src/modules/audit/repository.ts", "src/modules/orders/chang-hanh-khach-repo.ts", "src/modules/orders/index.ts", "src/modules/orders/repository.ts", "src/modules/orders/thanh-vien-route.ts", "src/modules/orders/xac-nhan-chung.ts", "src/modules/orders/xac-nhan-route.ts"]);
  for (const [tep, dong] of hit) {
    if (tep.startsWith("src/modules/audit/")) continue;
    for (const d of dong) assert.doesNotMatch(d, /audit/i, `${tep}: ${d}`);
  }
  // orders/index.ts (bookerChot, ngoại lệ nháp), xac-nhan-chung.ts (conThayMatToChuc, quyenGhiNhap), thanh-vien-route.ts / xac-nhan-route.ts (Task 16: tổ chức của dòng chờ người quản lý)
  // chỉ ĐỌC tư cách của đơn — không đưa vào nhật ký.
  for (const tep of ["src/modules/orders/index.ts", "src/modules/orders/xac-nhan-chung.ts", "src/modules/orders/thanh-vien-route.ts", "src/modules/orders/xac-nhan-route.ts"]) {
    for (const d of hit.get(tep)!) assert.match(d, /meta\.actingPartyId|"actingPartyId"|actingPartyId: string \| null/, `${tep}: ${d}`);
  }
});
