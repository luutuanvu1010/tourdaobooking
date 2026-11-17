// Route BẢNG PHÍ ĐƯA ĐÓN (ADR-0147 Đ2, ADR-0203 ĐB1–ĐB2; kế hoạch Phí đưa đón Đợt B, Task 7). Mọi route: cổng `admin` + ô `admin.manage` ở dòng đầu thân (Quản trị, Toàn quyền).
// Danh sách khu vực đón đến qua `ctx.vungDon()` (gốc lắp ráp tiêm; `pricing` không import `locations`). Mỗi lệnh ghi = MỘT `db.batch`, nhật ký đi cùng lô; nhật ký chỉ ghi mã vùng / nhóm / dịch vụ / cấp
// và số tiền. Thiếu mức không bao giờ là 0 đồng: Thử tra dùng ĐÚNG `chonMucPhiDon` + `tinhPhiChang` của phi-don-rules.ts (không tính riêng). Số tiền, số khách kiểm là số nguyên an toàn ở máy chủ.
import { auditStatement } from "../audit";
import { getEffectiveServices, tenCacNhom } from "../catalog";
import { error, json, kemLocation, readJson } from "../../shared/http";
import type { CanhBaoPhiDonDto, MucPhiDonDto, PhiDonBatDauApResponse, PhiDonGhiResponse, PhiDonResponse, ThuTraPhiDonResponse } from "../../shared/contracts";
import { can } from "../../shared/permissions";
import { route, type Route } from "../../shared/router";
import { addDays, ngayDayDu, vnToday } from "../../shared/vn-date";
import { nhanDong } from "../../shared/so-dai-ly-nhan";
import { batDauApMoiNhat, cauDatBatDauAp, cauDongMucPhiDon, cauThemMucPhiDon, docMucPhiDonTu, quyTacTheoId, type DongMucPhiDon } from "./phi-don-repo";
import { canhBaoCapCaoHon, chonMucPhiDon, chuKyDieuKien, kiemThanMucPhiDon, tinhPhiDonThuan, vungThieuDongChung } from "./phi-don-rules";
import { groupsOf, rateTiers } from "./repository";
import { laNgay } from "./rules";

const FORBIDDEN = () => error(403, "forbidden", "Chỉ Quản trị và Toàn quyền được xem và đặt bảng phí đưa đón.");
const DA_DOI = () => error(409, "stale", "Bảng phí đưa đón vừa được người khác đổi — tải lại rồi thử lại.");
const TAT_CA = "0001-01-01"; // mọi dòng, kể cả dòng đã hết hạn (đọc để tìm theo mã, không để hiển thị)
const SO_KHACH_RE = /^[1-9]\d{0,4}$/; // 1–99.999: số nguyên dương, chặn số lẻ, số âm, số khổng lồ

/** Lỗi CSDL của bảng phí → câu tiếng Việt; không khớp → null (ném lại). */
function loiBangPhiDon(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : String(e);
  if (/\bprc_overlap:/.test(m)) return error(409, "prc_overlap", "Đã có mức cùng bộ điều kiện trong khoảng ngày này — kết thúc dòng cũ trước.");
  if (/\bprc_key_inactive:/.test(m)) return error(400, "invalid_input", "Có điều kiện không còn được dùng.");
  if (/\bprc_append_only:/.test(m) || /UNIQUE constraint failed: prc_transfer_fee_start/.test(m)) return DA_DOI();
  if (/FOREIGN KEY constraint failed/.test(m)) return error(400, "invalid_input", "Điều kiện của mức phí không hợp lệ.");
  if (/CHECK constraint failed/.test(m)) return error(400, "invalid_input", "Có giá trị quá dài hoặc không hợp lệ (mã, ghi chú hay ngày) — kiểm tra lại rồi thử lại.");
  return null;
}
async function chayLo(db: D1Database, lo: D1PreparedStatement[]): Promise<D1Result[] | Response> {
  try { return await db.batch(lo); } catch (e) { const r = loiBangPhiDon(e); if (r) return r; throw e; }
}
const dongDaDong = (res: D1Result[]): boolean => (res[0]?.meta.changes ?? 0) === 0;

const dtoMuc = (d: DongMucPhiDon): MucPhiDonDto => {
  const k = d.muc.dieuKien;
  return {
    id: d.muc.id, kieu: d.muc.kind, tien: d.muc.amount, tuNgay: d.muc.validFrom, denNgay: d.muc.validTo, ghiChu: d.ghiChu,
    dieuKien: { vung: k.ZONE!, cap: k.TIER ?? null, dichVu: k.SERVICE ?? null, nhom: k.SERVICE_GROUP ?? null, chieu: k.DIRECTION === "OUT" || k.DIRECTION === "RETURN" ? k.DIRECTION : null, xeRieng: k.EXCLUSIVE === "1" },
    updatedAt: d.updatedAt,
  };
};

/** Cảnh báo cấp trả cao hơn bên không có cấp, tính cho ngày `ngay` bằng ĐÚNG `canhBaoCapCaoHon` (không có luật so sánh thứ hai). */
async function canhBaoNgay(db: D1Database, dong: readonly DongMucPhiDon[], ngay: string): Promise<CanhBaoPhiDonDto[]> {
  const muc = dong.map((d) => d.muc);
  const dichVu = [...new Set(muc.map((m) => m.dieuKien.SERVICE).filter((x): x is string => x !== undefined))];
  const nhomCuaDichVu = dichVu.length === 0 ? new Map<string, string | null>() : await groupsOf(db, dichVu);
  return canhBaoCapCaoHon({ muc, ngay, nhomCuaDichVu }).map((c) => ({
    cap: c.tierCode, vung: c.zoneCode, chieu: c.direction, xeRieng: c.exclusive, dichVu: c.catalogCode, nhom: c.groupCode, tienCap: c.tienCap, tienKhongCap: c.tienKhongCap,
  }));
}

/** Mã đang có thật, để `kiemThanMucPhiDon` kiểm: vùng đang bật (tiêm), cấp đang bật, nhóm, dịch vụ trong danh mục. */
async function bietMa(db: D1Database, vungDon: () => Promise<{ code: string; name: string }[]>) {
  const [vung, cap, nhom, dichVu] = await Promise.all([vungDon(), rateTiers(db), tenCacNhom(db), getEffectiveServices(db)]);
  return { vung, cap, nhom, dichVu, biet: { vung: new Set(vung.map((v) => v.code)), cap: new Set(cap.filter((c) => c.active === 1).map((c) => c.code)), nhom: new Set(nhom.keys()), dichVu: new Set(dichVu.keys()) } };
}

export const phiDonRoutes: Route[] = [
  route("GET", "/api/pricing/phi-don", "admin", async ({ env, url, staff, vungDon }) => {
    if (!can(staff, "admin.manage")) return FORBIDDEN();
    const ngay = url.searchParams.get("ngay") || vnToday(new Date());
    if (!laNgay(ngay)) return error(400, "invalid_input", "Ngày không hợp lệ.");
    const [dong, ap, b] = await Promise.all([docMucPhiDonTu(env.DB, ngay), batDauApMoiNhat(env.DB), bietMa(env.DB, vungDon)]);
    const nhomDv = await groupsOf(env.DB, [...b.dichVu.values()].filter((s) => s.visible).map((s) => s.code));
    // Điểm 1: vùng đang bật chưa có dòng chung còn hiệu lực hôm nay, hoặc vào ngày bắt đầu áp nếu ở tương lai (`dong` đọc từ `ngay` hỏi; mốc kiểm đều không sớm hơn hôm nay).
    const homNay = vnToday(new Date());
    const mocKiem = [homNay, ...(ap?.start_date != null && ap.start_date > homNay ? [ap.start_date] : [])];
    const dongKiem = ngay <= homNay ? dong : await docMucPhiDonTu(env.DB, homNay);
    const thieuMa = new Set(mocKiem.flatMap((m) => vungThieuDongChung({ vung: b.vung.map((x) => x.code), muc: dongKiem.map((d) => d.muc), ngay: m })));
    return json({
      muc: dong.map(dtoMuc), vungThieuMucChung: b.vung.filter((x) => thieuMa.has(x.code)), batDauAp: { ngay: ap?.start_date ?? null, tuLuc: ap?.valid_from_at ?? null }, canhBao: await canhBaoNgay(env.DB, dong, ngay),
      vung: b.vung, cap: b.cap.filter((c) => c.active === 1).map((c) => ({ code: c.code, name: c.name })), nhom: [...b.nhom].map(([code, name]) => ({ code, name })),
      dichVu: [...b.dichVu.values()].filter((s) => s.visible).map((s) => ({ code: s.code, name: s.name, nhom: nhomDv.get(s.code) ?? null })),
    } satisfies PhiDonResponse);
  }),

  // Thân tuỳ chọn `thayCho: { id, expectedUpdatedAt }` = «đổi mức»: đóng dòng cũ (ngày liền trước ngày bắt đầu mới) rồi chèn dòng mới trong CÙNG MỘT lô; vắng thì là tạo mức thường.
  route("POST", "/api/pricing/phi-don", "admin", async ({ env, request, staff, vungDon }) => {
    if (!can(staff, "admin.manage")) return FORBIDDEN();
    const b = await bietMa(env.DB, vungDon);
    const raw = await readJson(request);
    const kq = kiemThanMucPhiDon(raw, b.biet);
    if (!kq.ok) return error(400, "invalid_input", kq.message);
    const v = kq.value;
    const rawThay = (raw as Record<string, unknown>).thayCho;
    let thay: { id: string; truocLuc: string } | null = null;
    if (rawThay !== undefined && rawThay !== null) {
      const t = rawThay as Record<string, unknown>;
      if (typeof rawThay !== "object" || Array.isArray(rawThay) || typeof t.id !== "string" || t.id === "" || typeof t.expectedUpdatedAt !== "string" || t.expectedUpdatedAt === "")
        return error(400, "invalid_input", "Thiếu mức cần thay hoặc mốc cập nhật của nó — tải lại rồi thử lại.");
      thay = { id: t.id, truocLuc: t.expectedUpdatedAt };
    }
    const id = crypto.randomUUID();
    const at = new Date().toISOString();
    const khoang = `từ ${ngayDayDu(v.validFrom)}${v.validTo ? ` đến ${ngayDayDu(v.validTo)}` : ""}`;
    let dongCu: { ketThuc: string; chuKy: string; canDong: boolean } | null = null;
    if (thay) {
      const row = await quyTacTheoId(env.DB, thay.id);
      if (!row) return error(404, "not_found", "Không tìm thấy mức phí đưa đón này.");
      if (thay.truocLuc !== row.updated_at) return DA_DOI();
      const truoc = (await docMucPhiDonTu(env.DB, TAT_CA)).find((d) => d.muc.id === thay.id);
      if (!truoc) return error(404, "not_found", "Không tìm thấy mức phí đưa đón này.");
      if (truoc.muc.kind !== v.kind || chuKyDieuKien(truoc.muc.dieuKien) !== chuKyDieuKien(v.dieuKien))
        return error(400, "invalid_input", "Mức thay thế phải cùng kiểu tính và cùng bộ điều kiện với mức cũ.");
      if (v.validFrom <= row.valid_from_date) return error(400, "invalid_input", "Ngày bắt đầu của mức thay thế phải sau ngày bắt đầu của mức cũ.");
      const ketThuc = addDays(v.validFrom, -1);
      if (row.valid_to_date !== null && row.valid_to_date < ketThuc) return error(400, "invalid_input", "Mức cũ đã kết thúc sớm hơn ngày liền trước ngày bắt đầu mới — chỉ được rút ngắn, không được nới.");
      const k = truoc.muc.dieuKien;
      // ADR-0214 (thay ADR-0203 ĐB1): bỏ chốt «khu vực phải còn mức chung khi phí đang áp» — bảng không còn dùng cho đơn.
      // Điểm 5: dòng mới kết thúc SỚM hơn dòng cũ (hoặc dòng cũ không có ngày kết thúc mà dòng mới có) ⇒ khoảng sau đó bị bỏ trống. Siết chặt, không đổi tiền của ai.
      if (v.validTo !== null && (row.valid_to_date === null || v.validTo < row.valid_to_date)) {
        const tu = ngayDayDu(addDays(v.validTo, 1));
        return error(409, "transfer_fee_gap", `Mức mới kết thúc ${ngayDayDu(v.validTo)}, sớm hơn mức cũ, nên từ ${tu} ${row.valid_to_date === null ? "trở đi" : `đến ${ngayDayDu(row.valid_to_date)}`} sẽ không còn mức nào. Hãy để trống ngày kết thúc, hoặc đặt cùng ngày kết thúc với mức cũ.`);
      }
      // Dòng cũ đã đóng đúng ngày liền trước thì KHÔNG đóng lại (câu đóng sẽ không đổi gì và nhật ký «kết thúc» sẽ nói dối).
      dongCu = { ketThuc, chuKy: chuKyDieuKien(k), canDong: row.valid_to_date !== ketThuc };
    }
    // Cổng của dòng mới: dòng cũ SAU câu đóng ở đúng `ketThuc` và mang đúng mốc (mốc `at` do câu đóng ghi, hoặc mốc đã đọc nếu đã đóng sẵn). Người khác đổi dòng cũ ⇒ cả lô không ghi gì.
    const chiKhiDongCu = thay && dongCu ? { id: thay.id, denNgay: dongCu.ketThuc, updatedAt: dongCu.canDong ? at : thay.truocLuc } : undefined;
    const res = await chayLo(env.DB, [
      // Đóng dòng cũ TRƯỚC khi chèn dòng mới (trigger chồng ngày); nhật ký «kết thúc» chỉ ghi khi câu đóng thật sự đổi một dòng.
      ...(thay && dongCu?.canDong ? [
        cauDongMucPhiDon(env.DB, { id: thay.id, denNgay: dongCu.ketThuc, at, by: staff.id, truocLuc: thay.truocLuc }),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_transfer_fee_ended", at, targetType: "ledger", targetId: thay.id, detail: `${dongCu.chuKy} · kết thúc ${ngayDayDu(dongCu.ketThuc)} · đổi mức` }, "changes() > 0"),
      ] : []),
      ...cauThemMucPhiDon(env.DB, { id, ...v, at, by: staff.id, chiKhiDongCu }),
      // Điều kiện luôn có (ít nhất khu vực): `changes() > 0` ngay sau câu điều kiện cuối ⇒ dòng mới đã vào.
      auditStatement(env.DB, { staffId: staff.id, action: "prc_transfer_fee_added", at, targetType: "ledger", targetId: id,
        detail: `${v.kind === "PER_TRIP" ? "theo chuyến" : "theo khách"} · ${nhanDong(v.amount)}đ · ${chuKyDieuKien(v.dieuKien)} · ${khoang}${thay ? ` · thay dòng ${thay.id}` : ""}` }, "changes() > 0"),
    ]);
    if (res instanceof Response) return res;
    // Dòng mới không vào ⇒ cổng dòng cũ sai (có người đổi nó giữa lúc đọc và lúc ghi); câu đóng và hai nhật ký cũng bị cổng chặn, lô không ghi gì.
    if (res[thay && dongCu?.canDong ? 2 : 0]?.meta.changes === 0) return DA_DOI();
    const dong = await docMucPhiDonTu(env.DB, TAT_CA);
    const moi = dong.find((d) => d.muc.id === id)!;
    // Cảnh báo tính cho ngày bắt đầu của dòng vừa lưu (bảng thường được đặt trước ngày áp, nên không thể tính cho «hôm nay»).
    return kemLocation(json({ muc: dtoMuc(moi), canhBao: await canhBaoNgay(env.DB, dong, v.validFrom) } satisfies PhiDonGhiResponse, 201), "/phi-don");
  }),

  // Đường cố định (bat-dau-ap, thu-tra) khác số đoạn với `:id/ket-thuc` nên không va nhau.
  route("POST", "/api/pricing/phi-don/bat-dau-ap", "admin", async ({ env, request, staff }) => {
    if (!can(staff, "admin.manage")) return FORBIDDEN();
    const body = await readJson(request);
    const ngay = body?.ngay;
    const daDoc = body?.tuLucDaDoc;
    if (!body || (ngay !== null && (typeof ngay !== "string" || !laNgay(ngay))) || (daDoc !== null && typeof daDoc !== "string")) return error(400, "invalid_input", "Ngày bắt đầu áp không hợp lệ.");
    const hien = await batDauApMoiNhat(env.DB);
    if ((hien?.valid_from_at ?? null) !== daDoc) return DA_DOI();
    // ADR-0214 (thay ADR-0203 ĐB1): đặt ngày bắt đầu áp KHÔNG còn đòi mọi khu vực có mức chung — ngày này nay chỉ là công tắc phí do văn phòng chọn trên đơn.
    const now = new Date();
    // Mốc dòng mới = max(lúc ghi, mốc dòng mới nhất + 1 ms): hai lần đổi liền nhau không va UNIQUE (khuôn giới hạn nhập hoa hồng).
    const tuLuc = (hien && Date.parse(hien.valid_from_at) >= now.getTime() ? new Date(Date.parse(hien.valid_from_at) + 1) : now).toISOString();
    const at = now.toISOString();
    const res = await chayLo(env.DB, [
      cauDatBatDauAp(env.DB, { id: crypto.randomUUID(), ngay, tuLuc, tuLucDaDoc: daDoc, at, by: staff.id }),
      auditStatement(env.DB, { staffId: staff.id, action: "prc_transfer_fee_start_set", at, targetType: "ledger", detail: ngay === null ? "tắt phí đưa đón" : `áp dụng từ ${ngayDayDu(ngay)}` }, "changes() > 0"),
    ]);
    if (res instanceof Response) return res;
    if (dongDaDong(res)) return DA_DOI();
    return json({ batDauAp: { ngay, tuLuc } } satisfies PhiDonBatDauApResponse);
  }),

  route("POST", "/api/pricing/phi-don/:id/ket-thuc", "admin", async ({ env, request, params, staff }) => {
    if (!can(staff, "admin.manage")) return FORBIDDEN();
    const id = params.id!;
    const row = await quyTacTheoId(env.DB, id);
    if (!row) return error(404, "not_found", "Không tìm thấy mức phí đưa đón này.");
    const body = await readJson(request);
    const validTo = body?.validTo;
    const truocLuc = body?.expectedUpdatedAt;
    if (typeof truocLuc !== "string" || truocLuc === "") return error(400, "invalid_input", "Thiếu mốc cập nhật của dòng — tải lại rồi thử lại.");
    if (truocLuc !== row.updated_at) return DA_DOI();
    if (typeof validTo !== "string" || !laNgay(validTo) || validTo < row.valid_from_date) return error(400, "invalid_input", "Ngày kết thúc không hợp lệ hoặc trước ngày bắt đầu.");
    if (row.valid_to_date !== null && validTo >= row.valid_to_date) return error(400, "invalid_input", "Chỉ được rút ngắn: ngày kết thúc phải sớm hơn ngày kết thúc hiện có.");
    const dong = await docMucPhiDonTu(env.DB, TAT_CA);
    const dich = dong.find((d) => d.muc.id === id);
    if (!dich) return error(404, "not_found", "Không tìm thấy mức phí đưa đón này.");
    const k = dich.muc.dieuKien;
    // ADR-0214: bỏ chốt «không kết thúc dòng chung cuối của khu vực khi phí đang áp» — bảng không còn dùng cho đơn.
    const at = new Date().toISOString();
    const res = await chayLo(env.DB, [
      cauDongMucPhiDon(env.DB, { id, denNgay: validTo, at, by: staff.id, truocLuc }),
      auditStatement(env.DB, { staffId: staff.id, action: "prc_transfer_fee_ended", at, targetType: "ledger", targetId: id, detail: `${chuKyDieuKien(k)} · kết thúc ${ngayDayDu(validTo)}` }, "changes() > 0"),
    ]);
    if (res instanceof Response) return res;
    if (dongDaDong(res)) return DA_DOI();
    const moi = (await docMucPhiDonTu(env.DB, TAT_CA)).find((d) => d.muc.id === id)!;
    return json({ muc: dtoMuc(moi) } satisfies { muc: MucPhiDonDto });
  }),

  route("GET", "/api/pricing/phi-don/thu-tra", "admin", async ({ env, url, staff, vungDon }) => {
    if (!can(staff, "admin.manage")) return FORBIDDEN();
    const q = url.searchParams;
    const SAI = (m: string) => error(400, "invalid_input", m);
    const vung = q.get("vung") ?? "";
    const chieu = q.get("chieu");
    const xeRieng = q.get("xeRieng");
    const dichVu = q.get("dichVu") ?? "";
    const cap = q.get("cap") ?? "";
    const ngay = q.get("ngay") || vnToday(new Date());
    const soKhachRaw = q.get("soKhach") ?? "";
    const soVeRaw = q.get("soNguoiVe");
    if (chieu !== "OUT" && chieu !== "RETURN") return SAI("Chọn chiều đón.");
    if (xeRieng !== "0" && xeRieng !== "1") return SAI("Chọn đi chung hay xe riêng.");
    if (!laNgay(ngay)) return SAI("Ngày không hợp lệ.");
    if (!SO_KHACH_RE.test(soKhachRaw)) return SAI("Số khách phải là số nguyên từ 1 trở lên.");
    if (soVeRaw !== null && soVeRaw !== "" && !SO_KHACH_RE.test(soVeRaw)) return SAI("Số người đón về phải là số nguyên từ 1 trở lên.");
    const [vungDangBat, dv, tiers] = await Promise.all([vungDon(), getEffectiveServices(env.DB, [dichVu]), rateTiers(env.DB)]);
    if (!vungDangBat.some((x) => x.code === vung)) return SAI("Khu vực đón không có.");
    if (!dv.has(dichVu)) return SAI("Dịch vụ không có.");
    if (cap !== "" && !tiers.some((t) => t.code === cap)) return SAI("Cấp độ đại lý không có.");
    const nhom = (await groupsOf(env.DB, [dichVu])).get(dichVu) ?? null;
    const muc = (await docMucPhiDonTu(env.DB, ngay)).map((d) => d.muc);
    const ap = await batDauApMoiNhat(env.DB);
    const chuaApNgayNay = ap?.start_date == null || ngay < ap.start_date;
    // Cùng MỘT hàm `tinhPhiDonThuan` với đơn thật (tiêu chí «Thử tra = đơn thật»); Thử tra không xét ngày bắt đầu áp nên đưa mốc sớm nhất, còn «chưa áp» báo riêng ở `chuaApNgayNay`.
    let kq;
    try {
      kq = tinhPhiDonThuan({
        bang: { batDauAp: TAT_CA, muc, cap: cap === "" ? { loai: "KHONG_CAP" } : { loai: "CO_CAP", tierCode: cap } },
        nhom: new Map([[dichVu, nhom]]), ngay,
        chang: [{ legKey: "thu-tra", zoneCode: vung, direction: chieu, exclusive: xeRieng === "1", catalogCode: dichVu, soKhachTinhTien: Number(soKhachRaw), paxOverride: soVeRaw ? Number(soVeRaw) : null }],
      });
    } catch (e) { if (e instanceof RangeError) return SAI("Số khách hoặc số tiền quá lớn để tính."); throw e; }
    if (!kq.apDung) return SAI("Số khách hoặc số tiền quá lớn để tính.");
    const thieu = kq.thieu[0];
    if (thieu) return json({ ketQua: { trangThai: "THIEU_MUC", lyDo: thieu.lyDo === "XUNG_DOT" ? "XUNG_DOT" : "KHONG_CO_MUC" }, thua: [], chuaApNgayNay } satisfies ThuTraPhiDonResponse);
    const d = kq.dong[0];
    if (!d) return SAI("Số khách hoặc số tiền quá lớn để tính.");
    // Danh sách dòng thua chỉ để giải thích; chọn mức đã nằm trong hàm của đơn, đây chỉ đọc lại phần «thua vì».
    const chon = chonMucPhiDon({ chang: { zoneCode: vung, direction: chieu, exclusive: xeRieng === "1", catalogCode: dichVu, groupCode: nhom, tierCode: cap === "" ? null : cap }, ngay, muc });
    return json({
      ketQua: { trangThai: "CO_MUC", mucId: d.ruleId, kieu: d.kind, donGia: d.donGia, soLuong: d.soLuong, tien: d.tien },
      thua: chon.trangThai === "CO_MUC" ? chon.thua.map((x) => ({ mucId: x.muc.id, tien: x.muc.amount, viSao: x.viSao })) : [],
      chuaApNgayNay,
    } satisfies ThuTraPhiDonResponse);
  }),
];
