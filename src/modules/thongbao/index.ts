// Module thongbao (ADR-0034): hộp thông báo + tin thủ công. Không module nào import module này. Luật lọc ở src/shared/thong-bao.ts (một hàm).
import { auditStatement } from "../audit";
import { getStaffAccount, listStaffAccounts } from "../staff";
import type {
  DaGuiResponse, HopThongBaoResponse, NguoiDaHieuResponse, NguoiNhanTin, PermissionCode, StaffProfile, TinDaGuiDto, TomTatThongBaoResponse,
} from "../../shared/contracts";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { can, PERMISSION_LABEL } from "../../shared/permissions";
import { chuanHoaMocGio, NGAY_GIU_TIN, kiemTinThuCong, locHopThongBao, nhanNguoiNhan, nhanThayTinThuCong } from "../../shared/thong-bao";
import { route, type AppModule } from "../../shared/router";
import {
  findByRequest, getMark, getNotice, getThuCong, insertAckStatement, insertNoticeStatement, insertTargetStatement,
  listAcks, listDon, listSent, listThuCong, revokeStatement, upsertMarkStatement,
} from "./repository";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy thông báo.");
const FORBIDDEN = () => error(403, "forbidden", "Chỉ Toàn quyền được gửi và quản lý thông báo.");

/** "quyen:<QUYỀN>" | "noi-bo" (lưu ở ntf_notice_target) → NguoiNhanTin để trả về giao diện. */
const nguoiNhanTu = (tags: string): NguoiNhanTin =>
  tags.split(" ").includes("noi-bo") ? "noi-bo" : tags.split(" ").filter(Boolean).map((t) => t.slice(6) as PermissionCode);

async function nguoiNhanCua(db: D1Database, tags: string[]) {
  return (await listStaffAccounts(db)).filter((s) => s.active && nhanThayTinThuCong(s, tags));
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
      const quanTrongChuaHieu = h.tin.filter((t) => t.loai === "thu_cong" && t.quanTrong && t.daHieuLuc === null)
        .map((t) => ({ id: t.id, tieuDe: t.cau, nguoiGui: t.nguoiGui ?? "", luc: t.luc }));
      return json({ soChuaDoc: h.soChuaDoc, quanTrongChuaHieu } satisfies TomTatThongBaoResponse);
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
      if (!t || t.thuHoi || !t.quanTrong || !nhanThayTinThuCong(staff, t.nhan)) return NOT_FOUND();
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
      if (cu) return json({ id: cu }, 200);
      const id = crypto.randomUUID(), at = new Date().toISOString();
      const tags = nhanNguoiNhan(v.value.nguoiNhan);
      await env.DB.batch([
        insertNoticeStatement(env.DB, { id, tieuDe: v.value.tieuDe, noiDung: v.value.noiDung, quanTrong: v.value.quanTrong, req: v.value.clientRequestId, at, by: staff.id }),
        ...tags.map((t) => insertTargetStatement(env.DB, id, t, at, staff.id)),
        auditStatement(env.DB, { staffId: staff.id, action: "notice_sent", at, targetType: "notice", targetId: id, detail: `${tags.length} nhóm nhận` }),
      ]);
      return json({ id }, 201);
    }),
    route("GET", "/api/thong-bao/da-gui", "admin", async ({ env, staff }) => {
      if (!can(staff, "notice.send")) return FORBIDDEN();
      const rows = await listSent(env.DB);
      const tin: TinDaGuiDto[] = await Promise.all(rows.map(async (r) => {
        const tags = (r.tags ?? "").split(" ").filter(Boolean);
        const nhan = await nguoiNhanCua(env.DB, tags);
        const acks = r.quan_trong ? await listAcks(env.DB, r.id) : [];
        return {
          id: r.id, tieuDe: r.tieu_de, nguoiNhan: nguoiNhanTu(r.tags ?? ""), quanTrong: r.quan_trong === 1, luc: r.created_at, thuHoiLuc: r.valid_to,
          soNguoiNhan: nhan.filter((s) => s.id !== staff.id).length, soDaHieu: acks.filter((a) => nhan.some((s) => s.id === a.staff_id)).length,
        };
      }));
      return json({ tin } satisfies DaGuiResponse);
    }),
    route("GET", "/api/thong-bao/:id/nguoi-da-hieu", "admin", async ({ env, staff, params }) => {
      if (!can(staff, "notice.send")) return FORBIDDEN();
      if (!UUID_RE.test(params.id!)) return NOT_FOUND();
      const n = await getNotice(env.DB, params.id!);
      if (!n) return NOT_FOUND();
      const nhan = (await nguoiNhanCua(env.DB, (n.tags ?? "").split(" ").filter(Boolean))).filter((s) => s.id !== staff.id);
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
