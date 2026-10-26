// ROUTE của BƯỚC XÁC NHẬN ĐƠN (ADR-0136, Task 3.3): Gửi xác nhận, Rút lại, Quyết định (Còn vé / Hết vé / Huỷ), danh sách chờ, cài đặt cờ + công tắc.
// Tệp riêng để `index.ts` (cửa vào module) không phình thêm và để KHÔNG import vòng: tệp này chỉ import `repository.ts`, `xac-nhan-chung.ts`, `xac-nhan-repo.ts` và các module khác QUA `index.ts` của chúng.
// SQL ở `xac-nhan-repo.ts` (nửa nghiêm). KHÔNG tự kiểm quyền bằng vai hồ sơ; mọi cổng hỏi `can(…)` viết thẳng ô.
import { auditStatement } from "../audit";
import type { DonChoXacNhanDto, DonChoXacNhanResponse, GuiXacNhanResponse, LyDoCanXacNhan, QuyetDinhXacNhanResponse, ShortNoticeRequiredBody, YeuCauXacNhanDto } from "../../shared/contracts";
import { UUID_RE, error, json, readJson, trangDon } from "../../shared/http";
import { can, holdsIntern, holdsPartner } from "../../shared/permissions";
import { route } from "../../shared/router";
import { cauThieuChonDon, thieuChonDon } from "../../shared/cong-chon-don";
import { docLyDoHuy, type LyDoHuy } from "../../shared/ly-do-huy";
import { KHUNG_MAC_DINH, kiemDanhSachKhung } from "../../shared/khung-gio-don";
import { nguongMocVn } from "../../shared/moc-toi-thieu";
import { isHHMM, isISODate, vnToday } from "../../shared/vn-date";
import { duocQuyetDinh, hanXacNhan, quaHanXacNhan } from "../../shared/xac-nhan-don";
import { chiNguoiLapGhiNhap } from "../../shared/xem-don-nhap";
import { canhBaoMocCua } from "./dat-gap";
import { cauDoiGioChang, cauDoiNgayChang, cauDoiNgayDichVu, cauGhiKepGio, cauKhepYeuCau, cauMoYeuCau, orderTouchDraft, tuXacNhanNoiBo, yeuCauMoCuaDon, yeuCauMoTatCa, yeuCauTheoId, type YeuCauRow } from "./xac-nhan-repo";
import { legDatGapByOrder, slotPolicy } from "./chang-hanh-khach-repo";
import { daHuy, findOrder, getMeta, nextStamp, soanHuyDon, soanXacNhan } from "./repository";
import { MOC_CHUA_CO, RACED, STALE, chanDoanXacNhan, chayLoNoiChuyen, dichLoiXacNhan, kemChupXacNhan, kiemCongXacNhan, tinhCanXacNhan } from "./xac-nhan-chung";
import { confirmWindow } from "./service-rules";

const NHAN_VI: Record<LyDoCanXacNhan, string> = { DICH_VU: "dịch vụ cần xác nhận", DAT_GAP: "chặng đón dưới hạn chốt, cần đặt gấp" };
const dtoYeuCau = (y: YeuCauRow, vi: LyDoCanXacNhan[], nowMs: number): YeuCauXacNhanDto => ({ id: y.id, guiLuc: y.submitted_at, hanLuc: y.deadline_at, quaHan: quaHanXacNhan(y.deadline_at, nowMs), vi });
const NOT_FOUND_DON = () => error(404, "not_found", "Không tìm thấy đơn.");
const DA_GIAO_DON = () => error(409, "order_delivered", "Đơn đã ở bước Đã giao – đã thu đủ: không sửa, huỷ hay đổi người phụ trách được nữa.");
const FORBIDDEN_NGUOI_LAP = () => error(403, "forbidden", "Chỉ người lập đơn mới gửi hoặc rút lại yêu cầu xác nhận.");

export const xacNhanRoutes = [
  // DANH SÁCH CHỜ (Đ6, Đ9): MỌI yêu cầu đang mở cho người giữ ô `order.confirm.review` — dịch vụ, ngày, số khách, giờ đón, tiền, hạn; KHÔNG tên khách / SĐT / email (DTO không có chỗ chứa).
  // Phải đứng TRƯỚC `GET /api/orders/:id` (index.ts spread mảng này ở ĐẦU `routes`). Quá hạn chỉ là cờ cảnh báo.
  route("GET", "/api/orders/cho-xac-nhan", "orders", async ({ env, staff, mocToiThieu }) => {
    if (!can(staff, "order.confirm.review")) return error(403, "forbidden", "Tài khoản này không xét duyệt xác nhận đơn.");
    const [ys, moc] = await Promise.all([yeuCauMoTatCa(env.DB), mocToiThieu()]);
    const nowMs = Date.now();
    const don: DonChoXacNhanDto[] = [];
    for (const y of ys) {
      const o = await findOrder(env.DB, y.order_id);
      if (!o) continue;
      const vi = (await tinhCanXacNhan(env.DB, o, moc, nowMs)).vi;
      const ngay = o.services.map((s) => s.departDate).filter((d): d is string => d !== null).sort()[0] ?? null;
      const dau = o.services.flatMap((s) => s.legs).filter((l) => l.pickupTime !== null).sort((a, b) => `${a.pickupDate ?? ""} ${a.pickupTime}`.localeCompare(`${b.pickupDate ?? ""} ${b.pickupTime}`))[0];
      don.push({
        yeuCauId: y.id, orderId: o.id, orderCode: o.orderCode, dichVu: o.services.map((s) => s.name), ngayDi: ngay,
        soKhach: o.services.reduce((t, s) => t + (s.pax.adult ?? 0) + (s.pax.child ?? 0) + (s.pax.senior ?? 0), 0),
        gioDon: dau ? (dau.pickupSlotEnd ? `${dau.pickupTime}–${dau.pickupSlotEnd}` : dau.pickupTime) : null,
        tong: o.total, hanLuc: y.deadline_at, quaHan: quaHanXacNhan(y.deadline_at, nowMs), canDatGap: vi.includes("DAT_GAP"), vi,
      });
    }
    return json({ don } satisfies DonChoXacNhanResponse);
  }),

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

  // QUYẾT ĐỊNH (Đ5, Đ7): Còn vé / Hết vé / Huỷ trên yêu cầu ĐANG MỞ. Ô `order.confirm.review` + `duocQuyetDinh` (người lập chỉ tự quyết khi nội bộ + công tắc bật; `can()` lấy HỢP nên tài khoản lai
  // giữ quyền Bán hàng quyết định được đơn chờ của người khác, còn đơn chờ của chính họ thì không). Nháp KHÔNG chờ của người khác vẫn 404 (ADR-0135 Đ2). Khoá lạc quan: `updatedAt` + `yeuCauId`
  // người xét duyệt đã đọc — Rút lại rồi Gửi lại là yêu cầu KHÁC (409). MỘT lô: [đổi ngày / giờ đón có lính gác] → [xác nhận có khoá + vế yêu cầu còn mở] → [nhật ký] → [bản chụp mức] → [khép yêu
  // cầu, gác bằng id nhật ký]; thua ⇒ không câu nào ghi (mọi câu mang cùng điều kiện: yêu cầu còn mở VÀ đơn còn nháp đúng mốc). Thứ tự kiểm TRƯỚC khi ghi để giờ mới không qua mặt mốc 6 giờ.
  route("POST", "/api/orders/:id/quyet-dinh", "orders", async ({ env, request, params, staff, baoThayDoi, mocToiThieu, dongBoChuyen }) => {
    if (!can(staff, "order.confirm.review")) return error(403, "forbidden", "Tài khoản này không xét duyệt xác nhận đơn.");
    const id = params.id!;
    if (!UUID_RE.test(id)) return NOT_FOUND_DON();
    const body = await readJson(request);
    const ketQua = body?.ketQua;
    if (ketQua !== "CON_VE" && ketQua !== "HET_VE" && ketQua !== "HUY") return error(400, "invalid_input", "Chọn Còn vé, Hết vé hoặc Huỷ.");
    if (typeof body?.yeuCauId !== "string" || body.yeuCauId === "" || typeof body?.updatedAt !== "string" || body.updatedAt === "") return error(400, "invalid_input", "Thiếu yêu cầu xác nhận hoặc mốc cập nhật của đơn — tải lại rồi thử lại.");
    const meta = await getMeta(env.DB, id);
    if (!meta) return NOT_FOUND_DON();
    const y = await yeuCauMoCuaDon(env.DB, id);
    if (meta.status !== "draft") return RACED();
    if (!y) {
      if (meta.staffId === staff.id) return error(409, "confirm_not_open", "Đơn này không có yêu cầu xác nhận đang chờ.");
      // Người khác: nháp không chờ thì như không có (404) — TRỪ khi họ cầm đúng yêu cầu CỦA ĐƠN NÀY vừa khép (người lập Rút lại giữa lúc họ đọc và lúc bấm): bên thua nhận 409 "vừa có người đổi".
      const cu = await yeuCauTheoId(env.DB, body.yeuCauId);
      return cu && cu.order_id === id ? RACED() : NOT_FOUND_DON();
    }
    if (y.id !== body.yeuCauId) return RACED(); // yêu cầu đã khép / đã thay bằng yêu cầu khác
    const laNguoiLap = meta.staffId === staff.id;
    const nowIso = new Date().toISOString();
    if (!duocQuyetDinh({ laNguoiLap, laNoiBo: !holdsPartner(staff) && !holdsIntern(staff), coQuyenXetDuyet: true, choTuXacNhan: laNguoiLap ? await tuXacNhanNoiBo(env.DB, nowIso) : false })) {
      return error(403, "forbidden", "Bạn không quyết định được đơn này.");
    }
    if (body.updatedAt !== meta.updatedAt) return STALE();

    if (ketQua !== "CON_VE") {
      let lyDo: LyDoHuy;
      if (ketQua === "HET_VE") {
        lyDo = { ma: "HET_CHO", nhom: "CONG_TY_HUY", ghiChu: null }; // ngoại lệ có tên của ADR-0089 đ8: máy chủ tự gán, không hỏi `order.cancel.classify`
      } else {
        const d = docLyDoHuy(body, { coTheChonCongTy: can(staff, "order.cancel.classify") });
        if (!d.ok) return error(d.status, d.status === 403 ? "forbidden" : "invalid_input", d.message);
        lyDo = d.lyDo;
      }
      // Lô huỷ (câu đơn đứng đầu) + khúc chuyến của máy đồng bộ — MỘT db.batch; câu khép yêu cầu nối vào CUỐI phần câu đơn, gác bằng id nhật ký `cancelled` của chính lô.
      const huy = soanHuyDon(env.DB, id, staff.id, "draft", meta.updatedAt, lyDo);
      const khep = cauKhepYeuCau(env.DB, { id: y.id, at: nextStamp(meta.updatedAt), by: staff.id, outcome: "HUY", ticket: ketQua === "HET_VE" ? "HET_VE" : "HUY", note: null, auditId: huy.auditId });
      const dong = await dongBoChuyen({ orderId: id, auditIdDon: huy.auditId, bayGioMs: Date.now(), sau: { trangThai: "cancelled" }, cauDon: [...huy.cau, khep] });
      const r = await chayLoNoiChuyen(env.DB, dong, daHuy);
      if (r.kq === "loi") return r.res;
      if (r.kq === "thua") return RACED();
      baoThayDoi({ orderId: id, thayDoi: "huy" });
      return json({ ketQua, trangThai: "cancelled" } satisfies QuyetDinhXacNhanResponse);
    }

    // ---- CON_VE ----
    const order = await findOrder(env.DB, id);
    if (!order) return NOT_FOUND_DON();
    const moc = await mocToiThieu();
    if (!moc) return MOC_CHUA_CO();
    const nowMs = Date.now();
    const homNay = vnToday(new Date(nowMs));
    const sai = (m: string) => error(400, "doi_gio_khong_hop_le", m);
    // đổi ngày đi: ngày dân sự giờ VN, không quá khứ, trong cửa sổ xác nhận
    let ngayDi: string | undefined;
    if (body.ngayDi !== undefined && body.ngayDi !== null) {
      if (typeof body.ngayDi !== "string" || !isISODate(body.ngayDi)) return sai("Ngày đi không hợp lệ.");
      if (body.ngayDi < homNay || body.ngayDi > confirmWindow(homNay).to) return sai("Ngày đi phải từ hôm nay trở đi và trong vòng một năm.");
      ngayDi = body.ngayDi;
    }
    // đổi giờ đón: chặng MỞ của chính đơn, giờ HH:MM; có cuối khung thì phải đúng một khung của chính sách ADR-0134 (không có thì là "Giờ khác")
    const chang = new Map(order.services.flatMap((s) => s.legs.map((l) => [l.id, { l, dichVu: s }] as const)));
    const gioMoi = new Map<string, { gio: string; cuoi: string | null }>();
    const ds = body.gioDon;
    if (ds !== undefined && ds !== null) {
      if (!Array.isArray(ds)) return sai("Giờ đón không hợp lệ.");
      const pol = await slotPolicy(env.DB, nowIso);
      let khung: { tu: string; den: string }[] = [...KHUNG_MAC_DINH];
      try {
        const k = kiemDanhSachKhung(pol.slotsJson === null ? null : (JSON.parse(pol.slotsJson) as unknown));
        if (k.ok) khung = k.khung;
      } catch { /* dòng hỏng → bộ mặc định, như route khung giờ */ }
      for (const g of ds as unknown[]) {
        const o = g as { legId?: unknown; pickupTime?: unknown; pickupSlotEnd?: unknown } | null;
        if (!o || typeof o.legId !== "string" || !chang.has(o.legId) || gioMoi.has(o.legId)) return sai("Lượt đưa đón không có trong đơn hoặc bị nhắc hai lần.");
        if (typeof o.pickupTime !== "string" || !isHHMM(o.pickupTime)) return sai("Giờ đón phải theo dạng HH:MM (24 giờ).");
        let cuoi: string | null = null;
        if (o.pickupSlotEnd !== undefined && o.pickupSlotEnd !== null && o.pickupSlotEnd !== "") {
          if (typeof o.pickupSlotEnd !== "string" || !isHHMM(o.pickupSlotEnd) || o.pickupSlotEnd <= o.pickupTime) return sai("Giờ cuối khung phải sau giờ đón.");
          if (!khung.some((k) => k.tu === o.pickupTime && k.den === o.pickupSlotEnd)) return sai("Khung giờ đón không nằm trong các khung đã cài đặt.");
          cuoi = o.pickupSlotEnd;
        }
        gioMoi.set(o.legId, { gio: o.pickupTime, cuoi });
      }
    }
    // (0) KIỂM TRƯỚC KHI GHI — mốc tối thiểu / đặt gấp tính trên ngày + giờ MỚI (cùng `canhBaoMocCua`, cùng ngưỡng `nguongMocVn` với câu xác nhận): không để người xét duyệt đổi sang khung sớm hơn mà qua mặt mốc.
    const daDatGap = new Set((await legDatGapByOrder(env.DB, id)).map((r) => r.id));
    const legsMoi = [...chang.values()].map(({ l, dichVu }) => ({
      id: l.id,
      pickupDate: ngayDi !== undefined && (l.pickupDate === null || l.pickupDate === dichVu.departDate) ? ngayDi : (l.pickupDate ?? dichVu.departDate),
      pickupTime: gioMoi.get(l.id)?.gio ?? l.pickupTime,
    }));
    const duoi = canhBaoMocCua(legsMoi, daDatGap, nowMs, moc.phut);
    if (duoi.length > 0) {
      return json({ error: { code: "short_notice_required", message: "Có lượt đưa đón mà giờ đón đã qua hạn chốt — cần đặt gấp trước khi xác nhận.", legs: duoi.map((d) => ({ legId: d.legKey, phutConLai: d.phutConLai })) } } satisfies ShortNoticeRequiredBody, 409);
    }
    // Các cổng còn lại (R2 giá, người lớn, chọn đón, R3 trần) xét theo NGƯỜI BẤM Còn vé — như hôm nay; mốc đã kiểm ở trên.
    const cong = await kiemCongXacNhan(env.DB, { actor: staff, order, kiemMoc: true, mocToiThieu: moc });
    if ("loi" in cong) return cong.loi;
    const atChang = nextStamp(meta.updatedAt);
    const cauDau: D1PreparedStatement[] = [];
    const doiNgay = ngayDi !== undefined && order.services.some((s) => s.departDate !== ngayDi);
    if (doiNgay) {
      cauDau.push(cauDoiNgayChang(env.DB, { orderId: id, ngay: ngayDi!, at: atChang, by: staff.id, yeuCauId: y.id, prevUpdatedAt: meta.updatedAt }));
      cauDau.push(cauDoiNgayDichVu(env.DB, { orderId: id, ngay: ngayDi!, yeuCauId: y.id, prevUpdatedAt: meta.updatedAt }));
    }
    let doiGio = false;
    for (const [legId, g] of gioMoi) {
      const cu = chang.get(legId)!.l;
      if (cu.pickupTime === g.gio && (cu.pickupSlotEnd ?? null) === g.cuoi) continue;
      doiGio = true;
      cauDau.push(cauDoiGioChang(env.DB, { legId, orderId: id, gio: g.gio, cuoiKhung: g.cuoi, at: atChang, by: staff.id, yeuCauId: y.id, prevUpdatedAt: meta.updatedAt }));
      if (cu.direction === "OUT") cauDau.push(cauGhiKepGio(env.DB, { legId, orderId: id, gio: g.gio, yeuCauId: y.id, prevUpdatedAt: meta.updatedAt }));
    }
    const doi = doiNgay && doiGio ? ", đổi ngày và giờ" : doiNgay ? ", đổi ngày" : doiGio ? ", đổi giờ" : "";
    const detail = ["Còn vé" + doi, cong.detail].filter(Boolean).join(" | ");
    const auditId = crypto.randomUUID();
    const xn = soanXacNhan(env.DB, id, staff.id, cong.today, meta.updatedAt, nguongMocVn(nowMs, moc.phut), detail, kemChupXacNhan(env.DB, { orderId: id, staffId: staff.id, today: cong.today, chup: cong.chup }), { auditId, yeuCauId: y.id });
    const khep = cauKhepYeuCau(env.DB, { id: y.id, at: xn.at, by: staff.id, outcome: "XAC_NHAN", ticket: "CON_VE", note: null, auditId });
    let kq: D1Result[];
    try {
      kq = await env.DB.batch([...cauDau, ...xn.cau, khep]);
    } catch (e) {
      const res = dichLoiXacNhan(e);
      if (res) return res;
      throw e;
    }
    if ((kq[cauDau.length + 1]!.meta.changes ?? 0) === 0) {
      // Thua: đọc lại để trả đúng lý do. Yêu cầu không còn mở (rút lại / người khác quyết) → RACED; còn mở → `chanDoanXacNhan` (chưa đủ chuyến, mốc, hoặc đơn vừa đổi).
      const con = await yeuCauMoCuaDon(env.DB, id);
      if (!con || con.id !== y.id) return RACED();
      return chanDoanXacNhan(env.DB, { id, today: cong.today, mocToiThieu: moc, nowMs });
    }
    baoThayDoi({ orderId: id, thayDoi: "xac_nhan" });
    return json({ ketQua, trangThai: "confirmed" } satisfies QuyetDinhXacNhanResponse);
  }),
];
