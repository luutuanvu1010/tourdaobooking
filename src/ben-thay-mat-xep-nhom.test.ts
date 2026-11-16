// ADR-0213 Đ4.4 (mốc B1 Task 11) — bài quét XẾP NHÓM mọi chỗ đọc hồ sơ của tài khoản (`staff.partyId` / `actor.partyId`, kể cả `ctx.staff.partyId`) trong `src/` (trừ tệp test):
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
    { doan: "if (an && staff.partyId === null) return PARTNER_NO_PARTY();", nhom: "CHINH_NGUOI", so: 1 }, // «Ẩn thông tin khách»: tên của chính người lập trên biên nhận
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
  "src/modules/receipt/index.ts": [{ doan: "coPhieuNopTien({ nguoi: staff, partyId: staff.partyId, bookerPartyId: order.bookerPartyId", nhom: "THAY_MAT", so: 1 }],
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
    { doan: "!ctx.staff.partyId) return KHONG();", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "x.personPartyId === ctx.staff.partyId", nhom: "CHINH_NGUOI", so: 1 },
    { doan: "dongThanhVien(ctx, org, ctx.staff.partyId, \"org_member_left\"", nhom: "CHINH_NGUOI", so: 1 },
  ],
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
const DOC_HO_SO = /\b(?:staff|actor)\.partyId\b/;

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

test("Đ4.4: mọi chỗ đọc staff.partyId / actor.partyId trong src/ đã được xếp nhóm THAY_MAT hoặc CHINH_NGUOI (chỗ mới chưa xếp ⇒ đỏ)", () => {
  const hit = quet(DOC_HO_SO);
  assert.ok(hit.size >= 15, "chống bài rỗng: bộ quét phải thấy các chỗ đọc hiện có");
  const loi = [...hit].flatMap(([tep, dong]) => loiXepNhom(tep, dong, XEP[tep]));
  for (const tep of Object.keys(XEP)) if (!hit.has(tep)) loi.push(`${tep}: bảng xếp nhóm có tệp nhưng mã không còn chỗ đọc nào — bỏ dòng ở bảng`);
  assert.deepEqual(loi, []);
});

test("Đ4.4: bộ xếp nhóm bắt một chỗ đọc mới (bài dương — mô phỏng thêm một dòng đọc staff.partyId)", () => {
  const tep = "src/modules/billing/index.ts";
  const goc = quet(DOC_HO_SO).get(tep)!;
  assert.deepEqual(loiXepNhom(tep, goc, XEP[tep]), []);
  assert.equal(loiXepNhom(tep, [...goc, "const ben = staff.partyId;"], XEP[tep]).length, 1);
  assert.equal(loiXepNhom(tep, [...goc, "return json((await soCuaToi(env.DB, staff.partyId)) satisfies X);"], XEP[tep]).length, 1, "thêm dòng cùng mẩu ⇒ lệch số");
  assert.equal(loiXepNhom("src/modules/moi/index.ts", ["staff.partyId"], undefined).length, 1);
  assert.equal(boChuThich("const a = 1; // staff.partyId\n/* actor.partyId */ const u = \"https://x\";").match(/partyId/g), null);
});

test("Đ3.5 (Ruling R3): acting_party_id / actingPartyId chỉ ở hàm ghi nhật ký và câu của đơn; không dòng nào ngoài module audit đưa nó vào nhật ký", () => {
  const hit = quet(/\b(?:acting_party_id|actingPartyId)\b/);
  assert.deepEqual([...hit.keys()].sort(), ["src/modules/audit/repository.ts", "src/modules/orders/index.ts", "src/modules/orders/repository.ts", "src/modules/orders/xac-nhan-chung.ts"]);
  for (const [tep, dong] of hit) {
    if (tep.startsWith("src/modules/audit/")) continue;
    for (const d of dong) assert.doesNotMatch(d, /audit/i, `${tep}: ${d}`);
  }
  // orders/index.ts (bookerChot) và xac-nhan-chung.ts (conThayMatToChuc) chỉ ĐỌC tư cách của đơn để kiểm — không dựng câu nào.
  for (const tep of ["src/modules/orders/index.ts", "src/modules/orders/xac-nhan-chung.ts"]) {
    for (const d of hit.get(tep)!) assert.match(d, /meta\.actingPartyId|"actingPartyId"|actingPartyId: string \| null/, `${tep}: ${d}`);
  }
});
