// Route MỨC GIẢM PHÍ ĐƯA ĐÓN THEO CẤP (ADR-0218 Đ1.4; kế hoạch 2026-11-18 Task 3). Cổng `office`; ghi cần ô `partner.commission.write` (Kế toán, Quản trị, Toàn quyền) và KHÔNG giữ quyền Đối tác
// (như các route hoa hồng). Mỗi lệnh ghi = MỘT `db.batch`, nhật ký đi cùng lô; nhật ký chỉ ghi tên cấp và số tiền. Đợt 1: chưa có mã nào dùng mức này để tính tiền.
import { auditStatement } from "../audit";
import { error, json, kemLocation, readJson } from "../../shared/http";
import type { GiamPhiDonDto, GiamPhiDonGhiResponse, GiamPhiDonResponse } from "../../shared/contracts";
import { can, holdsPartner } from "../../shared/permissions";
import { route, type Route } from "../../shared/router";
import { nhanDong } from "../../shared/so-dai-ly-nhan";
import { addDays, ngayDayDu, vnToday } from "../../shared/vn-date";
import { capTheoMa, cauDongGiamPhiDon, cauThemGiamPhiDon, docGiamPhiDonTu, giamPhiDonTheoId, type DongGiamPhiDon } from "./giam-phi-don-repo";
import { rateTiers } from "./repository";
import { laNgay } from "./rules";

export const TRAN_GIAM_PHI_DON = 5_000_000;
const FORBIDDEN = () => error(403, "forbidden", "Chỉ Kế toán, Quản trị và Toàn quyền được đặt mức giảm phí đưa đón.");
const DA_DOI = () => error(409, "stale", "Mức giảm vừa được người khác đổi — tải lại rồi thử lại.");

const dto = (d: DongGiamPhiDon): GiamPhiDonDto => ({ id: d.id, tierCode: d.tier_code, tierName: d.tier_name, amount: d.amount, validFromDate: d.valid_from_date, validToDate: d.valid_to_date, updatedAt: d.updated_at });

function loiCsdl(e: unknown): Response | null {
  const m = e instanceof Error ? e.message : String(e);
  if (/prc_transfer_fee_discount_overlap/.test(m)) return error(409, "prc_overlap", "Cấp này đã có một mức giảm trong khoảng ngày đó — dùng «đổi mức» để thay.");
  if (/prc_tier_inactive/.test(m)) return error(400, "invalid_input", "Cấp độ đại lý này không còn được dùng.");
  if (/prc_append_only/.test(m)) return DA_DOI();
  if (/CHECK constraint failed/.test(m)) return error(400, "invalid_input", "Số tiền giảm hoặc ngày không hợp lệ.");
  return null;
}

export const giamPhiDonRoutes: Route[] = [
  route("GET", "/api/pricing/giam-phi-don", "office", async ({ env, staff }) => {
    if (!can(staff, "partner.commission.view") || holdsPartner(staff)) return FORBIDDEN();
    const [dong, cap] = await Promise.all([docGiamPhiDonTu(env.DB, vnToday(new Date())), rateTiers(env.DB)]);
    return json({ dong: dong.map(dto), cap: cap.filter((c) => c.active === 1).map((c) => ({ code: c.code, name: c.name })), doiDuoc: can(staff, "partner.commission.write") } satisfies GiamPhiDonResponse);
  }),

  // Thân tuỳ chọn `thayCho: { id, expectedUpdatedAt }` = «đổi mức»: đóng dòng cũ (ngày liền trước ngày bắt đầu mới) rồi chèn dòng mới trong CÙNG MỘT lô.
  route("POST", "/api/pricing/giam-phi-don", "office", async ({ env, request, staff }) => {
    if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
    const b = await readJson(request);
    const SAI = (m: string) => error(400, "invalid_input", m);
    if (!b || typeof b !== "object") return SAI("Thân yêu cầu không hợp lệ.");
    const { tierCode, amount, validFromDate, thayCho } = b as Record<string, unknown>;
    if (typeof tierCode !== "string" || tierCode === "") return SAI("Chọn cấp độ đại lý.");
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0 || amount > TRAN_GIAM_PHI_DON) return SAI("Số tiền giảm phải là số nguyên từ 0 đến 5.000.000 đồng mỗi khách.");
    if (!laNgay(validFromDate)) return SAI("Ngày bắt đầu không hợp lệ.");
    const homNay = vnToday(new Date());
    if (validFromDate < homNay) return SAI("Ngày bắt đầu không được trước hôm nay.");
    const cap = await capTheoMa(env.DB, tierCode);
    if (!cap || cap.active !== 1) return SAI("Cấp độ đại lý không có hoặc đã tắt.");
    let thay: { id: string; truocLuc: string; cu: DongGiamPhiDon } | null = null;
    if (thayCho !== undefined && thayCho !== null) {
      const t = thayCho as Record<string, unknown>;
      if (typeof thayCho !== "object" || Array.isArray(thayCho) || typeof t.id !== "string" || t.id === "" || typeof t.expectedUpdatedAt !== "string" || t.expectedUpdatedAt === "")
        return SAI("Thiếu mức cần thay hoặc mốc cập nhật của nó — tải lại rồi thử lại.");
      const cu = await giamPhiDonTheoId(env.DB, t.id);
      if (!cu) return error(404, "not_found", "Không tìm thấy mức giảm này.");
      if (cu.tier_code !== tierCode) return SAI("Mức thay thế phải cùng cấp độ với mức cũ.");
      if (cu.updated_at !== t.expectedUpdatedAt || cu.valid_to_date !== null) return DA_DOI();
      if (validFromDate <= cu.valid_from_date) return SAI("Ngày bắt đầu của mức thay thế phải sau ngày bắt đầu của mức cũ.");
      thay = { id: t.id, truocLuc: t.expectedUpdatedAt, cu };
    }
    const id = crypto.randomUUID();
    const at = new Date().toISOString();
    const ketThuc = thay ? addDays(validFromDate, -1) : null;
    let res: D1Result[];
    try {
      res = await env.DB.batch([
        ...(thay && ketThuc ? [
          cauDongGiamPhiDon(env.DB, { id: thay.id, denNgay: ketThuc, at, by: staff.id, truocLuc: thay.truocLuc }),
          auditStatement(env.DB, { staffId: staff.id, action: "prc_transfer_fee_discount_ended", at, targetType: "ledger", targetId: thay.id, detail: `${cap.name} · kết thúc ${ngayDayDu(ketThuc)} · đổi mức` }, "changes() > 0"),
        ] : []),
        cauThemGiamPhiDon(env.DB, { id, tierCode, amount, validFrom: validFromDate, at, by: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_transfer_fee_discount_set", at, targetType: "ledger", targetId: id,
          detail: `${cap.name}: ${thay ? `${nhanDong(thay.cu.amount)}đ` : "chưa đặt"} → ${nhanDong(amount)}đ từ ${ngayDayDu(validFromDate)}` }, "changes() > 0"),
      ]);
    } catch (e) {
      const r = loiCsdl(e);
      if (r) return r;
      throw e;
    }
    // Câu đóng không đổi dòng nào ⇒ người khác đã đổi dòng cũ giữa lúc đọc và ghi; câu chèn bị trigger chồng ngày chặn nên cả lô đã không ghi gì (ném ở trên). Kiểm thêm cho chắc.
    if (thay && (res[0]?.meta.changes ?? 0) === 0) return DA_DOI();
    const moi = (await giamPhiDonTheoId(env.DB, id))!;
    return kemLocation(json({ dong: dto(moi) } satisfies GiamPhiDonGhiResponse, 201), "/cap-dai-ly");
  }),

  // Kết thúc: đóng dòng đang mở tới hết HÔM NAY (mức vẫn áp cho ngày hôm nay). Dòng chưa tới ngày bắt đầu không kết thúc được (đóng sớm hơn ngày bắt đầu bị CSDL cấm) — đổi mức bằng `thayCho`.
  route("POST", "/api/pricing/giam-phi-don/:id/ket-thuc", "office", async ({ env, request, params, staff }) => {
    if (!can(staff, "partner.commission.write") || holdsPartner(staff)) return FORBIDDEN();
    const id = params.id!;
    const row = await giamPhiDonTheoId(env.DB, id);
    if (!row) return error(404, "not_found", "Không tìm thấy mức giảm này.");
    const body = await readJson(request);
    const truocLuc = body?.expectedUpdatedAt;
    if (typeof truocLuc !== "string" || truocLuc === "") return error(400, "invalid_input", "Thiếu mốc cập nhật của dòng — tải lại rồi thử lại.");
    if (truocLuc !== row.updated_at || row.valid_to_date !== null) return DA_DOI();
    const homNay = vnToday(new Date());
    if (row.valid_from_date > homNay) return error(400, "invalid_input", "Mức này chưa bắt đầu nên chưa kết thúc được — đặt mức mới bắt đầu muộn hơn để thay.");
    const at = new Date().toISOString();
    let res: D1Result[];
    try {
      res = await env.DB.batch([
        cauDongGiamPhiDon(env.DB, { id, denNgay: homNay, at, by: staff.id, truocLuc }),
        auditStatement(env.DB, { staffId: staff.id, action: "prc_transfer_fee_discount_ended", at, targetType: "ledger", targetId: id, detail: `${row.tier_name} · kết thúc ${ngayDayDu(homNay)}` }, "changes() > 0"),
      ]);
    } catch (e) {
      const r = loiCsdl(e);
      if (r) return r;
      throw e;
    }
    if ((res[0]?.meta.changes ?? 0) === 0) return DA_DOI();
    return json({ dong: dto((await giamPhiDonTheoId(env.DB, id))!) } satisfies GiamPhiDonGhiResponse);
  }),
];
