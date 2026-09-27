// Module thongbao (ADR-0034): hộp thông báo + tin thủ công. Không module nào import module này. Luật lọc ở src/shared/thong-bao.ts (một hàm).
import { auditStatement } from "../audit";
import { getStaffAccount } from "../staff";
import type { HopThongBaoResponse, StaffProfile, TomTatThongBaoResponse } from "../../shared/contracts";
import { UUID_RE, error, json } from "../../shared/http";
import { chuanHoaMocGio, NGAY_GIU_TIN, locHopThongBao, nhanThayTinThuCong } from "../../shared/thong-bao";
import { route, type AppModule } from "../../shared/router";
import { getMark, getThuCong, insertAckStatement, listDon, listThuCong, upsertMarkStatement } from "./repository";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy thông báo.");

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
  ],
};
