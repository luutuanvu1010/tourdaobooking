// ROUTE «Bán hàng phụ trách đơn» của dispatch (ADR-0142; migration 0138). KHÔNG có SQL ở đây (SQL ở `ban-hang.ts`, đọc tài khoản ở `ban-hang-moi.ts`). Mỗi lệnh ghi là MỘT `db.batch`,
// thứ tự cổng: 403 quyền → 404 → đọc thân 400 → 409 trạng thái → ghi (thua đua ⇒ 409 `stale`, không 500). Nhật ký ghi ngay sau câu chính, gác `changes() > 0`; chi tiết nhật ký KHÔNG tên, mã người, SĐT.
// Thông báo (Task 6): sau lô THẮNG, MỘT lời gọi `baoThayDoi` — gốc lắp ráp tự suy tin phụ («Chờ Bán hàng nhận» khi X từ chối). Thua đua / 4xx thì không gọi.
import { auditStatement } from "../audit";
import { donDangChoXacNhan, findOrderDepartDates, findOrderOwner, ghiNhanCuaDon } from "../orders";
import type { BanHangCuaDonResponse, BanHangChinhSachResponse, BanHangGhiResponse, BanHangMoiResponse } from "../../shared/contracts";
import { duocNhanBanHang, laVaChamOBanHang, phutGioHanhChinhConLai, trangThaiLoiMoi, type KhungGioHanhChinh, type LyDoKhongNhan } from "../../shared/ban-hang-phu-trach";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { can, hasPermission, holdsIntern, holdsPartner, passesAdminGate } from "../../shared/permissions";
import { route } from "../../shared/router";
import { chiNguoiLapGhiNhap } from "../../shared/xem-don-nhap";
import { tripDeparted } from "../../shared/trip-rules";
import { vnToday } from "../../shared/vn-date";
import { banHangThang, banHangCuaDon, cauDoiBanHang, cauMoBanHangNeuTrong, cauKhepLoiMoiSauNhan, cauThemChinhSach, cauTuChoiLoiMoi, khungGioHanhChinh, moiNhatChinhSach } from "./ban-hang";
import { danhSachBanHangMoi, kiemBanHangMoi, loiMoiMoCua } from "./ban-hang-moi";
import { findHandledOrderIds, orderDelivered } from "./repository";
import { parseOrderIds } from "./rules";

/** Số đơn tối đa của một lần tra `GET /api/dispatch/ban-hang` (trang Danh sách đơn). */
const TOI_DA_TRA_BAN_HANG = 30;

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy đơn.");
const DA_GIAO = () => error(409, "order_delivered", "Đơn đã ở bước Đã giao – đã thu đủ: không đổi hay nhận người phụ trách được nữa.");
const GIO_CHUA_CO = () => error(503, "gio_hanh_chinh_chua_co", "Chưa có cài đặt giờ hành chính của người phụ trách — báo Toàn quyền.");
const STALE_NHAN = () => error(409, "stale", "Đơn vừa có người phụ trách, hãy tải lại.");
const KHONG_HO_SO = () => error(409, "khong_co_ho_so", "Tài khoản này chưa có hồ sơ nên chưa làm người phụ trách được — báo Quản trị.");

const LOI_NHAN: Record<LyDoKhongNhan, () => Response> = {
  don_nhap: () => error(409, "order_not_confirmed", "Đơn chưa xác nhận, chưa nhận được."),
  tai_khoan_lai: () => error(403, "forbidden", "Tài khoản có quyền Đối tác không làm người phụ trách được."),
  khong_du_quyen: () => error(403, "forbidden", "Tài khoản này không nhận người phụ trách được."),
  don_huy: () => error(409, "cancelled", "Đơn đã huỷ, không nhận được."),
  qua_ngay_di: () => error(409, "departed", "Tour đã qua ngày đi, không nhận được."),
  don_cu: () => error(409, "don_cu", "Đơn này lập trước khi có người phụ trách nên không tự nhận được — nhờ Quản trị hoặc Toàn quyền gán."),
  da_co_nguoi: STALE_NHAN,
  dang_cho_nguoi_khac: STALE_NHAN, // thay bằng câu có tên + số phút ở nơi gọi
};

/** Mốc `valid_from_at` của dòng chính sách mới: `max(lúc ghi, mốc mới nhất + 1 ms)` — hai lần đổi liền nhau không va UNIQUE (khuôn `/api/cai-dat/xac-nhan-don`). */
const lanSau = (moiNhat: string | null, now: Date): string => (moiNhat && Date.parse(moiNhat) >= now.getTime() ? new Date(Date.parse(moiNhat) + 1) : now).toISOString();

async function docChinhSach(db: D1Database, staff: Parameters<typeof can>[0]): Promise<BanHangChinhSachResponse | null> {
  const k = await khungGioHanhChinh(db);
  return k ? { phutUuTien: k.phutUuTien, tuPhut: k.tuPhut, denPhut: k.denPhut, mocPhatHanh: k.mocPhatHanh, doiDuoc: can(staff, "settings.ops") } : null;
}

export const banHangRoutes = [
  // Danh sách để MỜI lúc lập (mọi người giữ `order.create`): CHỈ mã tài khoản + tên.
  route("GET", "/api/dispatch/ban-hang-moi", "orders", async ({ env, staff }) => {
    if (!can(staff, "dispatch.sales.invitees")) return error(403, "forbidden", "Tài khoản này không chọn người phụ trách được.");
    return json({ banHang: await danhSachBanHangMoi(env.DB) } satisfies BanHangMoiResponse);
  }),

  // Bán hàng phụ trách + lời mời của các đơn đang hiện ở danh sách. Chỉ đơn người gọi XEM ĐƯỢC qua `order.view` (Đối tác / Thực tập: đơn của mình). Họ chỉ nhận TÊN: không mã tài khoản, không lời mời.
  // KHÁC `GET /api/dispatch/handlers` (người phụ trách HDV) — route đó giữ 403 với họ (ADR-0019 điều 2).
  route("GET", "/api/dispatch/ban-hang", "orders", async ({ env, url, staff }) => {
    const parsed = parseOrderIds(url.searchParams.get("orderIds"));
    if (!parsed.ok) return error(400, "invalid_input", parsed.message);
    if (parsed.ids.length > TOI_DA_TRA_BAN_HANG) return error(400, "invalid_input", `Chỉ tra được tối đa ${TOI_DA_TRA_BAN_HANG} đơn mỗi lần.`);
    const ra: BanHangCuaDonResponse = {};
    if (parsed.ids.length === 0) return json(ra);
    const [chu, cua, daPhuTrach, dangCho] = await Promise.all([
      Promise.all(parsed.ids.map((id) => findOrderOwner(env.DB, id))),
      banHangCuaDon(env.DB, parsed.ids),
      findHandledOrderIds(env.DB, staff.id).then((a) => new Set(a)),
      donDangChoXacNhan(env.DB, parsed.ids), // đơn nháp ĐANG CHỜ xác nhận: người xét (`order.confirm.review`) được tra để vẽ khối Người phụ trách
    ]);
    const nguoiXet = can(staff, "order.confirm.review");
    const hep = holdsPartner(staff) || holdsIntern(staff); // chỉ tên
    const khung = hep ? null : await khungGioHanhChinh(env.DB);
    const nowIso = new Date().toISOString();
    for (const [i, id] of parsed.ids.entries()) {
      const o = chu[i];
      if (!o) continue;
      const choXet = o.status === "draft" && o.staffId !== staff.id && dangCho.has(id) && nguoiXet; // nháp của người khác: CHỈ khi đang chờ xác nhận VÀ người gọi là người xét
      if (!choXet && !chiNguoiLapGhiNhap({ status: o.status, laNguoiLap: o.staffId === staff.id })) continue;
      const bh = cua.get(id) ?? null;
      const duocGiao = daPhuTrach.has(id) || (bh !== null && bh.staffId === staff.id);
      if (!choXet && !can(staff, "order.view", { ownerId: o.staffId, assigned: duocGiao })) continue;
      let loiMoi: BanHangCuaDonResponse[string]["loiMoi"] = null;
      if (!hep) {
        const lm = await loiMoiMoCua(env.DB, id);
        if (lm && khung && trangThaiLoiMoi({ hanIso: lm.hanIso, nowMs: Date.parse(nowIso), xConHopLe: lm.xConHopLe, daKhep: false }) === "UU_TIEN") {
          loiMoi = { staffId: lm.staffId, name: lm.name, conPhut: phutGioHanhChinhConLai(nowIso, lm.hanIso, khung) };
        }
      }
      ra[id] = { banHang: bh ? (hep ? { name: bh.name } : { staffId: bh.staffId, name: bh.name }) : null, loiMoi, laBanHangPhuTrach: bh !== null && bh.staffId === staff.id };
    }
    return json(ra);
  }),

  // NHẬN PHỤ TRÁCH (đơn đã xác nhận, chưa có Bán hàng phụ trách). Đơn còn chờ xác nhận: phải quyết Còn vé / Hết vé (ở route quyết định), không nhận ở đây.
  route("POST", "/api/orders/:id/ban-hang/nhan", "orders", async ({ env, params, staff, baoThayDoi }) => {
    if (!can(staff, "dispatch.sales.claim")) return error(403, "forbidden", "Tài khoản này không nhận người phụ trách được.");
    const orderId = params.id!;
    if (!UUID_RE.test(orderId)) return NOT_FOUND();
    const order = await findOrderOwner(env.DB, orderId);
    if (!order) return NOT_FOUND();
    const dangCho = order.status === "draft" && (await donDangChoXacNhan(env.DB, [orderId])).has(orderId);
    if (!dangCho && !chiNguoiLapGhiNhap({ status: order.status, laNguoiLap: order.staffId === staff.id })) return NOT_FOUND(); // nháp của người khác (không chờ) như không có (ADR-0135 Đ2)
    if (dangCho) return error(409, "can_quyet_dinh", "Đơn cần kiểm vé — hãy chọn Còn vé / Hết vé.");
    if (await orderDelivered(env.DB, orderId)) return DA_GIAO();
    const khung = await khungGioHanhChinh(env.DB);
    if (!khung) return GIO_CHUA_CO();
    const nowIso = new Date().toISOString();
    const [hien, loiMoi, ghiNhan, ngayDi] = await Promise.all([banHangCuaDon(env.DB, [orderId]), loiMoiMoCua(env.DB, orderId), ghiNhanCuaDon(env.DB, orderId), findOrderDepartDates(env.DB, orderId)]);
    const laX = loiMoi !== null && loiMoi.staffId === staff.id;
    const uuTien = loiMoi !== null && trangThaiLoiMoi({ hanIso: loiMoi.hanIso, nowMs: Date.parse(nowIso), xConHopLe: loiMoi.xConHopLe, daKhep: false }) === "UU_TIEN";
    const kq = duocNhanBanHang({
      giuBanHang: hasPermission(staff, "SALES"), laQuanTriHoacToanQuyen: passesAdminGate(staff), giuDoiTac: holdsPartner(staff), laX,
      uuTienCuaNguoiKhac: uuTien && !laX, daCoNguoi: hien.has(orderId), donHuy: order.status === "cancelled", quaNgayDi: tripDeparted(ngayDi, vnToday(new Date(nowIso))),
      laDonCu: ghiNhan?.confirmedAt != null && Date.parse(ghiNhan.confirmedAt) < Date.parse(khung.mocPhatHanh), laNhap: order.status === "draft",
    });
    if (!kq.ok) {
      if (kq.lyDo === "dang_cho_nguoi_khac" && loiMoi) return error(409, "dang_cho_nguoi_khac", `Đơn đang chờ ${loiMoi.name} trả lời, còn ${phutGioHanhChinhConLai(nowIso, loiMoi.hanIso, khung)} phút.`);
      return LOI_NHAN[kq.lyDo]();
    }
    if (staff.partyId === null) return KHONG_HO_SO();
    const rowId = crypto.randomUUID();
    const nhatKyId = crypto.randomUUID();
    let ket: D1Result[];
    try {
      // thứ tự cố định: câu chính → nhật ký (`changes() > 0` trỏ đúng câu chính) → khép lời mời (gác bằng dòng ô vừa mở)
      ket = await env.DB.batch([
        cauMoBanHangNeuTrong(env.DB, { id: rowId, orderId, partyId: staff.partyId, actorId: staff.id, at: nowIso }),
        auditStatement(env.DB, { id: nhatKyId, orderId, staffId: staff.id, action: "sales_owner_claimed", at: nowIso, detail: uuTien && !laX ? "Nhận phụ trách thay trong thời gian ưu tiên" : "Nhận phụ trách đơn" }, "changes() > 0"),
        cauKhepLoiMoiSauNhan(env.DB, { orderId, outcome: laX ? "NHAN" : "NGUOI_KHAC", at: nowIso, actorId: staff.id, ownerRowId: rowId }),
      ]);
    } catch (e) {
      if (laVaChamOBanHang(e)) return STALE_NHAN();
      if (/order_delivered/.test(String((e as Error)?.message ?? e))) return DA_GIAO();
      throw e;
    }
    if (!banHangThang(ket, 0)) return STALE_NHAN();
    baoThayDoi({ orderId, thayDoi: "ban_hang_nhan", nguoiMoi: laX ? null : (loiMoi?.staffId ?? null) }); // X bị người khác nhận thay chỉ nhận ở Bảng tin (lời mời đã khép, hộp thư không biết)
    return json({ ok: true, banHang: { staffId: staff.id, name: staff.fullName } } satisfies BanHangGhiResponse);
  }),

  // TỪ CHỐI lời mời: chỉ đúng người được mời, khi lời mời còn mở. Đơn sang «Chờ Bán hàng nhận». Không hạn mức (ADR-0032).
  route("POST", "/api/orders/:id/ban-hang/tu-choi", "orders", async ({ env, params, staff, baoThayDoi }) => {
    if (!can(staff, "dispatch.sales.claim")) return error(403, "forbidden", "Tài khoản này không nhận người phụ trách được.");
    const orderId = params.id!;
    if (!UUID_RE.test(orderId)) return NOT_FOUND();
    const loiMoi = await loiMoiMoCua(env.DB, orderId);
    if (!loiMoi || loiMoi.staffId !== staff.id || staff.partyId === null) return error(409, "khong_co_loi_moi", "Bạn không có lời mời nào còn mở cho đơn này.");
    const at = new Date().toISOString();
    const ket = await env.DB.batch([
      cauTuChoiLoiMoi(env.DB, { orderId, inviteePartyId: staff.partyId, at, actorId: staff.id }),
      auditStatement(env.DB, { orderId, staffId: staff.id, action: "sales_invite_refused", at, detail: "Từ chối phụ trách đơn" }, "changes() > 0"),
    ]);
    if (!banHangThang(ket, 0)) return error(409, "stale", "Lời mời vừa được xử lý, hãy tải lại.");
    baoThayDoi({ orderId, thayDoi: "ban_hang_tu_choi" });
    return json({ ok: true, banHang: null } satisfies BanHangGhiResponse);
  }),

  // ĐỔI / BỎ TRỐNG Bán hàng phụ trách (Quản trị, Toàn quyền): chỉ đơn đã xác nhận; không chặn đơn cũ. Người được đặt phải qua `kiemBanHangMoi`, hoặc là chính người đang gọi.
  route("PUT", "/api/orders/:id/ban-hang", "orders", async ({ env, request, params, staff, baoThayDoi }) => {
    if (!can(staff, "dispatch.sales.assign")) return error(403, "forbidden", "Chỉ Quản trị hoặc Toàn quyền đổi được người phụ trách.");
    const orderId = params.id!;
    if (!UUID_RE.test(orderId)) return NOT_FOUND();
    const order = await findOrderOwner(env.DB, orderId);
    if (!order) return NOT_FOUND();
    if (order.status === "draft" && !chiNguoiLapGhiNhap({ status: order.status, laNguoiLap: order.staffId === staff.id }) && !(await donDangChoXacNhan(env.DB, [orderId])).has(orderId)) return NOT_FOUND();
    const body = (await readJson(request)) as Record<string, unknown> | null;
    const dich = body?.staffId;
    if (dich !== null && (typeof dich !== "string" || !UUID_RE.test(dich))) return error(400, "invalid_input", "Chọn người phụ trách, hoặc bỏ trống.");
    if (order.status === "draft") return error(409, "don_nhap", "Đơn chưa xác nhận, chưa đổi người phụ trách được.");
    if (order.status !== "confirmed") return error(409, "cancelled", "Đơn đã huỷ, không đổi người phụ trách được.");
    if (await orderDelivered(env.DB, orderId)) return DA_GIAO();
    const hien = (await banHangCuaDon(env.DB, [orderId])).get(orderId) ?? null;
    let partyMoi: string | null = null;
    if (dich !== null) {
      if (dich === staff.id) {
        if (holdsPartner(staff)) return error(403, "forbidden", "Tài khoản có quyền Đối tác không làm người phụ trách được.");
        if (staff.partyId === null) return KHONG_HO_SO();
        partyMoi = staff.partyId;
      } else {
        const x = await kiemBanHangMoi(env.DB, dich);
        if (!x.ok) return error(400, "invalid_assignee", x.message);
        partyMoi = x.partyId;
      }
    }
    if ((hien?.partyId ?? null) === partyMoi) return error(409, "no_change", partyMoi === null ? "Đơn đang chưa có người phụ trách." : "Người này đang là người phụ trách rồi.");
    const at = new Date().toISOString();
    const [c0, c1, c2] = cauDoiBanHang(env.DB, { orderId, partyIdCu: hien?.partyId ?? null, idMoi: crypto.randomUUID(), partyIdMoi: partyMoi, actorId: staff.id, at });
    const nhatKy = auditStatement(env.DB, { orderId, staffId: staff.id, action: "sales_owner_changed", at, detail: partyMoi === null ? "Bỏ trống người phụ trách" : "Đổi người phụ trách" }, "changes() > 0");
    // nhật ký đứng NGAY SAU câu quyết định thắng/thua: có người mới ⇒ sau câu mở [1]; bỏ trống ⇒ sau câu khép [0]
    const lo = partyMoi === null ? [c0!, nhatKy, c1!, c2!] : [c0!, c1!, nhatKy, c2!];
    let ket: D1Result[];
    try {
      ket = await env.DB.batch(lo);
    } catch (e) {
      if (laVaChamOBanHang(e)) return error(409, "stale", "Người phụ trách vừa được đổi, hãy tải lại.");
      if (/order_delivered/.test(String((e as Error)?.message ?? e))) return DA_GIAO();
      throw e;
    }
    if (!banHangThang(ket, partyMoi === null ? 0 : 1)) return error(409, "stale", "Người phụ trách vừa được đổi, hãy tải lại.");
    const moi = (await banHangCuaDon(env.DB, [orderId])).get(orderId) ?? null;
    baoThayDoi({ orderId, thayDoi: "doi_ban_hang", banHangTruoc: hien?.staffId ?? null }); // người cũ nhận ở Bảng tin lúc sự kiện, không có dòng hộp thư
    return json({ ok: true, banHang: moi ? { staffId: moi.staffId, name: moi.name } : null } satisfies BanHangGhiResponse);
  }),

  // CÀI ĐẶT ba con số giờ hành chính (ADR-0142 Đ5): chỉ API, không giao diện. Khuôn `/api/cai-dat/xac-nhan-don`: dòng mới chỉ-thêm, gửi đúng giá trị đang hiệu lực ⇒ 200 không ghi, va UNIQUE ⇒ 409 `stale`.
  route("GET", "/api/cai-dat/ban-hang-phu-trach", "admin", async ({ env, staff }) => {
    if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền xem cài đặt người phụ trách.");
    const r = await docChinhSach(env.DB, staff);
    return r ? json(r) : GIO_CHUA_CO();
  }),
  route("POST", "/api/cai-dat/ban-hang-phu-trach", "admin", async ({ env, request, staff }) => {
    if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ Toàn quyền đổi cài đặt người phụ trách.");
    const b = (await readJson(request)) as Record<string, unknown> | null;
    const { phutUuTien, tuPhut, denPhut } = b ?? {};
    const so = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= lo && v <= hi;
    if (!so(phutUuTien, 1, 120) || !so(tuPhut, 0, 1439) || !so(denPhut, 1, 1440) || tuPhut >= denPhut) {
      return error(400, "invalid_input", "Số phút ưu tiên từ 1 đến 120; giờ bắt đầu phải trước giờ kết thúc trong cùng một ngày.");
    }
    const hien: KhungGioHanhChinh | null = await khungGioHanhChinh(env.DB);
    if (!hien) return GIO_CHUA_CO();
    if (hien.phutUuTien !== phutUuTien || hien.tuPhut !== tuPhut || hien.denPhut !== denPhut) {
      const now = new Date();
      const at = lanSau(await moiNhatChinhSach(env.DB), now);
      try {
        await env.DB.batch([
          cauThemChinhSach(env.DB, { id: crypto.randomUUID(), at, phutUuTien, tuPhut, denPhut, by: staff.id }),
          auditStatement(env.DB, { staffId: staff.id, action: "sales_policy_changed", at, targetType: "system", detail: `Ưu tiên ${phutUuTien} phút; giờ hành chính từ phút ${tuPhut} đến phút ${denPhut}` }),
        ]);
      } catch (e) {
        if (/UNIQUE/i.test(String((e as Error)?.message ?? e))) return error(409, "stale", "Cài đặt vừa được đổi — tải lại rồi thử lại.");
        throw e;
      }
    }
    const r = await docChinhSach(env.DB, staff);
    return r ? json(r) : GIO_CHUA_CO();
  }),
];
