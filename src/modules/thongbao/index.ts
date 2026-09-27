// Module thongbao (ADR-0034 + ADR-0036): hộp thông báo + tin thủ công + địa chỉ nhận thông báo màn hình khoá. Không module nào import
// module này. Luật lọc ở src/shared/thong-bao.ts (một hàm).
import { auditStatement } from "../audit";
import { getStaffAccount, listStaffAccounts } from "../staff";
import type {
  DaGuiResponse, HopThongBaoResponse, MayThongBaoResponse, MoiNhatResponse, NguoiDaHieuResponse, NguoiNhanTin, PermissionCode, StaffAccount,
  StaffProfile, TinDaGuiDto, TomTatThongBaoResponse,
} from "../../shared/contracts";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { can, PERMISSION_LABEL } from "../../shared/permissions";
import { chuanHoaMocGio, NGAY_GIU_TIN, kiemTinThuCong, locHopThongBao, nhanNguoiNhan, nhanThayTinThuCong } from "../../shared/thong-bao";
import { kiemDiaChi } from "../../shared/web-push";
import { route, type AppModule } from "../../shared/router";
import {
  batMayStatements, demMay, findByRequest, getMark, getNotice, getThuCong, insertAckStatement, insertNoticeStatement, insertTargetStatement,
  listAcks, listDon, listSent, listThuCong, revokeStatement, tatMayStatement, upsertMarkStatement,
} from "./repository";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy thông báo.");
const FORBIDDEN = () => error(403, "forbidden", "Chỉ Toàn quyền được gửi và quản lý thông báo.");

/** "quyen:<QUYỀN>" | "noi-bo" (lưu ở ntf_notice_target) → NguoiNhanTin để trả về giao diện. */
const nguoiNhanTu = (tags: string): NguoiNhanTin =>
  tags.split(" ").includes("noi-bo") ? "noi-bo" : tags.split(" ").filter(Boolean).map((t) => t.slice(6) as PermissionCode);

/** Lọc, trên một danh sách tài khoản ĐANG HOẠT ĐỘNG đã có sẵn (không tự truy vấn), ai thuộc nhóm nhận `tags`. */
const locNguoiNhan = (dangHoatDong: StaffAccount[], tags: string[]) => dangHoatDong.filter((s) => nhanThayTinThuCong(s, tags));

/** R6: gọi `listStaffAccounts` một lần cho MỘT tin — dùng ở nguoi-da-hieu (đúng một tin mỗi lần gọi route). */
async function nguoiNhanCuaMotTin(db: D1Database, tags: string[]) {
  return locNguoiNhan((await listStaffAccounts(db)).filter((s) => s.active), tags);
}

async function hop(db: D1Database, staff: StaffProfile, ngan: "cua-toi" | "tat-ca"): Promise<HopThongBaoResponse> {
  const now = new Date().toISOString();
  const tu = new Date(Date.now() - NGAY_GIU_TIN * 86400000).toISOString();
  const [don, thuCong, mark] = await Promise.all([listDon(db, tu), listThuCong(db, tu, staff.id), getMark(db, staff.id)]);
  // Chưa từng mở hộp: mốc = ngày tạo tài khoản (không đổ dồn tin cũ lên người mới — đặc tả §4.4). createdAt không đảm bảo luôn ở dạng
  // ISO có mili-giây — locHopThongBao so mốc giờ BẰNG CHUỖI nên phải chuẩn hoá trước (chuanHoaMocGio, src/shared/thong-bao.ts).
  const docDenLuc = chuanHoaMocGio(mark ?? (await getStaffAccount(db, staff.id))?.createdAt ?? now);
  return locHopThongBao(staff, { don, thuCong, docDenLuc, now, ngan });
}

export const thongbaoModule: AppModule = {
  name: "thongbao",
  routes: [
    route("GET", "/api/thong-bao/tom-tat", "staff", async ({ env, staff }) => {
      const h = await hop(env.DB, staff, "cua-toi");
      // Sửa vòng kiểm Task 5→6: quanTrongChuaHieu lấy từ trường riêng của locHopThongBao (tính TRƯỚC khi cắt trần 100), KHÔNG lọc từ
      // h.tin (đã cắt) — nếu không, người có > 100 tin "Của tôi" mới hơn sẽ mất tin quan trọng chưa hiểu khỏi dải (trái X4).
      const quanTrongChuaHieu = h.quanTrongChuaHieu.map((t) => ({ id: t.id, tieuDe: t.cau, nguoiGui: t.nguoiGui ?? "", luc: t.luc }));
      return json({ soChuaDoc: h.soChuaDoc, quanTrongChuaHieu } satisfies TomTatThongBaoResponse);
    }),
    // Web Push (ADR-0036) — cú gõ cửa màn hình khoá của service worker: câu của tin CHƯA ĐỌC mới nhất ở ngăn "Của tôi" (h.tin đã sắp
    // xếp mới nhất trước). Chỉ đọc — không đổi mốc đã đọc (đó là việc của POST …/da-doc, người dùng tự bấm khi mở hộp).
    route("GET", "/api/thong-bao/moi-nhat", "staff", async ({ env, staff }) => {
      const h = await hop(env.DB, staff, "cua-toi");
      const t = h.tin.find((x) => x.chuaDoc);
      return json({ tin: t ? { cau: t.cau, lienKet: t.lienKet } : null } satisfies MoiNhatResponse);
    }),
    // Tự phục vụ (ADR-0036 điều 1–2; "ngoại lệ" ở docs/quyen-hoan.json): id luôn lấy từ phiên (staff.id), không tin thân yêu cầu.
    route("GET", "/api/account/thong-bao/may", "staff", async ({ env, staff }) => {
      const soMay = await demMay(env.DB, staff.id);
      const khoa = env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? env.VAPID_PUBLIC_KEY : null;
      return json({ khoa, soMay } satisfies MayThongBaoResponse);
    }),
    route("POST", "/api/account/thong-bao/may", "staff", async ({ env, staff, request }) => {
      const body = await readJson(request);
      const endpoint = body?.endpoint;
      const thietBi = typeof body?.thietBi === "string" ? body.thietBi.trim() : "";
      if (!kiemDiaChi(endpoint) || thietBi.length < 1 || thietBi.length > 40) {
        return error(400, "invalid_input", "Địa chỉ máy hoặc tên máy không hợp lệ.");
      }
      const at = new Date().toISOString();
      await env.DB.batch(batMayStatements(env.DB, { id: crypto.randomUUID(), staffId: staff.id, endpoint, thietBi, at }));
      return json({ ok: true });
    }),
    route("POST", "/api/account/thong-bao/may/huy", "staff", async ({ env, staff, request }) => {
      const body = await readJson(request);
      const at = new Date().toISOString();
      if (body?.tatCa === true) {
        await tatMayStatement(env.DB, staff.id, null, "dang-xuat", at).run();
        return json({ ok: true });
      }
      const endpoint = body?.endpoint;
      if (typeof endpoint === "string" && endpoint.length >= 1 && endpoint.length <= 1024) {
        // Không kiểm host bằng kiemDiaChi ở đây: đây là XOÁ theo giá trị đã lưu (không gọi ra ngoài), không phải nơi máy chủ sẽ POST
        // tới. Endpoint không tồn tại hoặc thuộc người khác → câu UPDATE khớp 0 dòng, vẫn 200 (không lộ ai có/không có máy đó).
        await tatMayStatement(env.DB, staff.id, endpoint, "tu-tat", at).run();
        return json({ ok: true });
      }
      return error(400, "invalid_input", "Thiếu địa chỉ máy hoặc cờ huỷ tất cả.");
    }),
    route("POST", "/api/account/thong-bao/da-doc", "staff", async ({ env, staff }) => {
      await upsertMarkStatement(env.DB, staff.id, new Date().toISOString()).run();
      return json({ ok: true });
    }),
    route("GET", "/api/thong-bao", "staff", async ({ env, staff, url }) => {
      const ngan = url.searchParams.get("ngan") === "cua-toi" ? "cua-toi" : "tat-ca";
      return json(await hop(env.DB, staff, ngan) satisfies HopThongBaoResponse);
    }),
    route("POST", "/api/account/thong-bao/:id/da-hieu", "staff", async ({ env, staff, params }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      // Tra thẳng theo id, KHÔNG qua cửa sổ 30 ngày của listThuCong: tin quan trọng có thể đã quá hạn giữ, và bấm "Đã hiểu" lần hai
      // (đã hiểu từ trước) vẫn phải tìm thấy tin để trả OK như đặc tả §7 (rà soát trước thi công, mục R5).
      const t = await getThuCong(env.DB, id, staff.id);
      // K6 (mục 3, người kiểm độc lập): người GỬI bấm "Đã hiểu" trên chính tin mình gửi → 404, giống cách locHopThongBao (E3) ẩn hẳn
      // tin đó khỏi hộp của người gửi — id không lộ ra thì đường tự phục vụ này cũng phải coi như "không tìm thấy".
      if (!t || t.thuHoi || !t.quanTrong || t.nguoiGuiId === staff.id || !nhanThayTinThuCong(staff, t.nhan)) return NOT_FOUND();
      const at = new Date().toISOString();
      await env.DB.batch([
        insertAckStatement(env.DB, id, staff.id, at),
        auditStatement(env.DB, { staffId: staff.id, action: "notice_acknowledged", at, targetType: "notice", targetId: id }, "changes() > 0"),
      ]);
      return json({ ok: true, luc: t.daHieuLuc ?? at });
    }),
    route("POST", "/api/thong-bao", "admin", async ({ env, staff, request }) => {
      if (!can(staff, "notice.send")) return FORBIDDEN();
      const v = kiemTinThuCong(await readJson(request));
      if (!v.ok) return error(400, "invalid_input", v.message);
      const cu = await findByRequest(env.DB, staff.id, v.value.clientRequestId);
      if (cu) return json({ id: cu }, 200); // bấm-hai-lần TUẦN TỰ: đã có tin từ lần gửi trước, trả lại luôn
      const id = crypto.randomUUID(), at = new Date().toISOString();
      const tags = nhanNguoiNhan(v.value.nguoiNhan);
      await env.DB.batch([
        insertNoticeStatement(env.DB, { id, tieuDe: v.value.tieuDe, noiDung: v.value.noiDung, quanTrong: v.value.quanTrong, req: v.value.clientRequestId, at, by: staff.id }),
        ...tags.map((t) => insertTargetStatement(env.DB, id, t, at, staff.id)),
        auditStatement(env.DB, { staffId: staff.id, action: "notice_sent", at, targetType: "notice", targetId: id, detail: `${tags.length} nhóm nhận` }, `EXISTS (SELECT 1 FROM ntf_notice WHERE id = '${id}')`),
      ]);
      // Mối lo 4: hai yêu cầu GỬI ĐỒNG THỜI cùng clientRequestId đều có thể qua được lần tra `findByRequest` ở trên trước khi ai ghi
      // xong — INSERT_NOTICE (repository.ts) chỉ chèn được MỘT trong hai (WHERE NOT EXISTS, D1 tuần tự hoá batch()); bên thua không lỗi,
      // chỉ chèn 0 dòng. Tra lại để lấy id thật sự đã được ghi (có thể là của chính mình, hoặc của bên thắng).
      const win = await findByRequest(env.DB, staff.id, v.value.clientRequestId);
      if (!win) return error(500, "internal", "Không gửi được, thử lại."); // lý thuyết không xảy ra: điều kiện NOT EXISTS chỉ có một khoá
      return json({ id: win }, win === id ? 201 : 200);
    }),
    route("GET", "/api/thong-bao/da-gui", "admin", async ({ env, staff }) => {
      if (!can(staff, "notice.send")) return FORBIDDEN();
      // R6: listStaffAccounts gọi ĐÚNG MỘT LẦN ở đây, ngoài vòng lặp bên dưới (không phải một lần mỗi tin đã gửi).
      const [rows, taiKhoan] = await Promise.all([listSent(env.DB), listStaffAccounts(env.DB)]);
      const dangHoatDong = taiKhoan.filter((s) => s.active);
      const tin: TinDaGuiDto[] = await Promise.all(rows.map(async (r) => {
        const tags = (r.tags ?? "").split(" ").filter(Boolean);
        const nhan = locNguoiNhan(dangHoatDong, tags);
        const acks = r.quan_trong ? await listAcks(env.DB, r.id) : [];
        return {
          id: r.id, tieuDe: r.tieu_de, nguoiNhan: nguoiNhanTu(r.tags ?? ""), quanTrong: r.quan_trong === 1, luc: r.created_at, thuHoiLuc: r.valid_to,
          // Loại NGƯỜI GỬI (r.created_by) khỏi "số người nhận" — KHÔNG phải người đang xem (staff.id). Với ≥2 Toàn quyền, người xem
          // khác người gửi thì hai id này khác nhau (người kiểm độc lập, lượt sửa cuối Task 6).
          soNguoiNhan: nhan.filter((s) => s.id !== r.created_by).length, soDaHieu: acks.filter((a) => nhan.some((s) => s.id === a.staff_id)).length,
        };
      }));
      return json({ tin } satisfies DaGuiResponse);
    }),
    route("GET", "/api/thong-bao/:id/nguoi-da-hieu", "admin", async ({ env, staff, params }) => {
      if (!can(staff, "notice.send")) return FORBIDDEN();
      if (!UUID_RE.test(params.id!)) return NOT_FOUND();
      const n = await getNotice(env.DB, params.id!);
      if (!n) return NOT_FOUND();
      // Loại NGƯỜI GỬI (n.created_by) khỏi danh sách đã hiểu/chưa hiểu — KHÔNG phải người đang xem (staff.id). Cùng lý do ở da-gui.
      const nhan = (await nguoiNhanCuaMotTin(env.DB, (n.tags ?? "").split(" ").filter(Boolean))).filter((s) => s.id !== n.created_by);
      const acks = new Map((await listAcks(env.DB, n.id)).map((a) => [a.staff_id, a.created_at]));
      const quyen = (s: { permissions: readonly PermissionCode[] }) => s.permissions.map((p) => PERMISSION_LABEL[p]).join(", ");
      return json({
        daHieu: nhan.filter((s) => acks.has(s.id)).map((s) => ({ ten: s.fullName, quyen: quyen(s), luc: acks.get(s.id)! })),
        chuaHieu: nhan.filter((s) => !acks.has(s.id)).map((s) => ({ ten: s.fullName, quyen: quyen(s) })),
      } satisfies NguoiDaHieuResponse);
    }),
    route("POST", "/api/thong-bao/:id/thu-hoi", "admin", async ({ env, staff, params }) => {
      if (!can(staff, "notice.send")) return FORBIDDEN();
      if (!UUID_RE.test(params.id!)) return NOT_FOUND();
      const at = new Date().toISOString();
      const res = await env.DB.batch([
        revokeStatement(env.DB, params.id!, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "notice_revoked", at, targetType: "notice", targetId: params.id! }, "changes() > 0"),
      ]);
      if ((res[0]?.meta.changes ?? 0) === 0) return (await getNotice(env.DB, params.id!)) ? error(409, "conflict", "Tin đã được thu hồi.") : NOT_FOUND();
      return json({ ok: true });
    }),
  ],
};
