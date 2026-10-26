// ROUTE của BƯỚC XÁC NHẬN ĐƠN (ADR-0136, Task 3.3): Gửi xác nhận, Rút lại, Quyết định (Còn vé / Hết vé / Huỷ), danh sách chờ, cài đặt cờ + công tắc.
// Tệp riêng để `index.ts` (cửa vào module) không phình thêm và để KHÔNG import vòng: tệp này chỉ import `repository.ts`, `xac-nhan-chung.ts`, `xac-nhan-repo.ts` và các module khác QUA `index.ts` của chúng.
// SQL ở `xac-nhan-repo.ts` (nửa nghiêm). KHÔNG tự kiểm quyền bằng vai hồ sơ; mọi cổng hỏi `can(…)` viết thẳng ô.
import { auditStatement } from "../audit";
import type { GuiXacNhanResponse, LyDoCanXacNhan, YeuCauXacNhanDto } from "../../shared/contracts";
import { UUID_RE, error, json, trangDon } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route } from "../../shared/router";
import { cauThieuChonDon, thieuChonDon } from "../../shared/cong-chon-don";
import { hanXacNhan } from "../../shared/xac-nhan-don";
import { findOrder, getMeta, nextStamp } from "./repository";
import { MOC_CHUA_CO, STALE, tinhCanXacNhan } from "./xac-nhan-chung";
import { cauKhepYeuCau, cauMoYeuCau, orderTouchDraft, yeuCauMoCuaDon, type YeuCauRow } from "./xac-nhan-repo";
import { chiNguoiLapGhiNhap } from "../../shared/xem-don-nhap";

const NHAN_VI: Record<LyDoCanXacNhan, string> = { DICH_VU: "dịch vụ cần xác nhận", DAT_GAP: "chặng đón dưới hạn chốt, cần đặt gấp" };
const quaHan = (hanLuc: string, nowMs: number): boolean => Date.parse(hanLuc) < nowMs;
const dtoYeuCau = (y: YeuCauRow, vi: LyDoCanXacNhan[], nowMs: number): YeuCauXacNhanDto => ({ id: y.id, guiLuc: y.submitted_at, hanLuc: y.deadline_at, quaHan: quaHan(y.deadline_at, nowMs), vi });
const NOT_FOUND_DON = () => error(404, "not_found", "Không tìm thấy đơn.");
const DA_GIAO_DON = () => error(409, "order_delivered", "Đơn đã ở bước Đã giao – đã thu đủ: không sửa, huỷ hay đổi người phụ trách được nữa.");
const FORBIDDEN_NGUOI_LAP = () => error(403, "forbidden", "Chỉ người lập đơn mới gửi hoặc rút lại yêu cầu xác nhận.");

export const xacNhanRoutes = [
  // GỬI XÁC NHẬN (Đ3): người lập, đơn nháp, thuộc diện cần xác nhận (Đ1), đã chọn Đón / Không đón, chưa có yêu cầu mở, đơn CHƯA CÓ KHOẢN THU. Không chạy R2 / R3 ở bước này
  // (giá của Thực tập xét theo người bấm Còn vé — ADR-0136 làm rõ 25/10). Chặng dưới mốc KHÔNG bị từ chối lúc gửi: chính nó đưa đơn vào diện cần xác nhận (`DAT_GAP`).
  // Task 3.4 sẽ thêm cổng 409 `partner_submit_required` NGAY SAU `can()` cho người lập giữ quyền Đối tác.
  route("POST", "/api/orders/:id/gui-xac-nhan", "orders", async ({ env, params, staff, isAssigned, baoThayDoi, mocToiThieu, daThuCuaDon }) => {
    const id = params.id!;
    if (!UUID_RE.test(id)) return NOT_FOUND_DON();
    const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
    if (!meta) return NOT_FOUND_DON();
    if (!chiNguoiLapGhiNhap({ status: meta.status, laNguoiLap: meta.staffId === staff.id })) return NOT_FOUND_DON(); // nháp của người khác: 404 như đơn không có (ADR-0135 Đ2)
    if (!can(staff, "order.modify", { ownerId: meta.staffId, assigned })) return FORBIDDEN_NGUOI_LAP();
    if (meta.deliveredAt) return DA_GIAO_DON();
    if (meta.status !== "draft" || meta.staffId !== staff.id) return error(409, "invalid_state", "Chỉ gửi xác nhận được đơn nháp của chính bạn.");
    if (await yeuCauMoCuaDon(env.DB, id)) return error(409, "confirm_already_open", "Đơn này đã gửi xác nhận và đang chờ.");
    const order = await findOrder(env.DB, id);
    if (!order) return NOT_FOUND_DON();
    const moc = await mocToiThieu(); // MỘT lần mỗi request (TC-26); chưa có mốc thì không xét được "chặng dưới mốc" ⇒ từ chối kín
    if (!moc) return MOC_CHUA_CO();
    const nowMs = Date.now();
    const canXN = await tinhCanXacNhan(env.DB, order, moc, nowMs);
    if (!canXN.can) return error(409, "confirm_not_required", "Đơn này không cần xác nhận, hãy bấm Xác nhận đơn.");
    const thieuDon = thieuChonDon(order.services.map((s) => ({ pickupChoice: s.pickupChoice, soChangMo: s.legs.length })));
    if (thieuDon.length > 0) return error(409, "pickup_choice_required", cauThieuChonDon(thieuDon[0]!));
    // Đ3 «chưa có khoản thu»: hàm TIÊM từ gốc lắp ráp (orders không đọc bảng bil_). Không đọc được ⇒ 503, KHÔNG đoán «chưa có».
    const daThu = await daThuCuaDon(id);
    if (daThu === null) return error(503, "khoan_thu_chua_kiem", "Chưa kiểm được khoản thu của đơn nên chưa gửi xác nhận được — báo người phụ trách hệ thống.");
    if (daThu > 0) return error(409, "confirm_blocked_has_payment", "Đơn đã có khoản thu nên chưa gửi xác nhận được. Hãy báo Kế toán.");
    const at = nextStamp(meta.updatedAt);
    const han = hanXacNhan(at);
    const yeuCauId = crypto.randomUUID();
    const auditId = crypto.randomUUID();
    let kq: D1Result[];
    try {
      kq = await env.DB.batch([
        orderTouchDraft(env.DB, id, at, meta.updatedAt),
        auditStatement(env.DB, { id: auditId, orderId: id, staffId: staff.id, action: "order_confirm_requested", at, detail: `Gửi xác nhận · ${canXN.vi.map((v) => NHAN_VI[v]).join("; ")}` }, "changes() > 0"),
        cauMoYeuCau(env.DB, { id: yeuCauId, orderId: id, at, by: staff.id, han, auditId }),
      ]);
    } catch (e) {
      if (/ord_confirm_request.*order_id|ord_confirm_request_one_open|UNIQUE constraint failed: ord_confirm_request/i.test(String((e as Error)?.message ?? e))) {
        return error(409, "confirm_already_open", "Đơn này đã gửi xác nhận và đang chờ.");
      }
      throw e;
    }
    if ((kq[0]!.meta.changes ?? 0) === 0) return STALE(); // người khác vừa đổi đơn giữa lúc đọc và lúc ghi — tải lại rồi bấm lại
    baoThayDoi({ orderId: id, thayDoi: "sua" });
    return json({ yeuCau: dtoYeuCau({ id: yeuCauId, order_id: id, submitted_at: at, submitted_by: staff.id, deadline_at: han }, canXN.vi, nowMs) } satisfies GuiXacNhanResponse, 201, { location: trangDon(id) });
  }),

  // RÚT LẠI (Đ3): người lập rút yêu cầu còn mở; yêu cầu khép `RUT_LAI`, không có kết quả vé. Đẩy mốc đơn để người xét duyệt đang cầm mốc cũ THUA (409) thay vì huỷ / xác nhận sau lưng.
  route("POST", "/api/orders/:id/rut-xac-nhan", "orders", async ({ env, params, staff, isAssigned, baoThayDoi }) => {
    const id = params.id!;
    if (!UUID_RE.test(id)) return NOT_FOUND_DON();
    const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
    if (!meta) return NOT_FOUND_DON();
    if (!chiNguoiLapGhiNhap({ status: meta.status, laNguoiLap: meta.staffId === staff.id })) return NOT_FOUND_DON();
    if (!can(staff, "order.modify", { ownerId: meta.staffId, assigned })) return FORBIDDEN_NGUOI_LAP();
    if (meta.status !== "draft" || meta.staffId !== staff.id) return error(409, "confirm_not_open", "Đơn này không có yêu cầu xác nhận đang chờ.");
    const y = await yeuCauMoCuaDon(env.DB, id);
    if (!y) return error(409, "confirm_not_open", "Đơn này không có yêu cầu xác nhận đang chờ.");
    const at = nextStamp(meta.updatedAt);
    const auditId = crypto.randomUUID();
    const kq = await env.DB.batch([
      orderTouchDraft(env.DB, id, at, meta.updatedAt),
      auditStatement(env.DB, { id: auditId, orderId: id, staffId: staff.id, action: "order_confirm_withdrawn", at, detail: "Rút lại yêu cầu xác nhận" }, "changes() > 0"),
      cauKhepYeuCau(env.DB, { id: y.id, at, by: staff.id, outcome: "RUT_LAI", ticket: null, note: null, auditId }),
    ]);
    if ((kq[0]!.meta.changes ?? 0) === 0 || (kq[2]!.meta.changes ?? 0) === 0) {
      // Thua: có người quyết định (hoặc sửa đơn) giữa lúc đọc và lúc ghi — không dòng nào của lô này ghi.
      return error(409, "invalid_transition", "Đơn vừa được người khác đổi trạng thái, hãy tải lại.");
    }
    baoThayDoi({ orderId: id, thayDoi: "sua" });
    return json({ ok: true });
  }),
];
