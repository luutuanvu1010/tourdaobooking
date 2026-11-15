// POST /api/dang-ky/phieu/tep — người đăng ký (chưa có tài khoản) tải MỘT tệp vào một ô của phiếu (ADR-0208 Đ2). Route khai `public`; cổng là cookie đăng ký, kiểm ở ĐÂY (ADR-0206 Đ5, Đ7).
// Thứ tự: phiên → phiếu (trạng thái) → trần tệp mỗi phiếu → trần theo địa chỉ mạng → Content-Length (413 TRƯỚC khi đọc thân) → thân (400/413/415) → trùng băm →
// MỘT lô D1 (dòng tệp chờ, thay tệp cùng ô, dòng lịch sử) → đặt kho → đánh dấu đã lưu. Kho hỏng KHÔNG thành 5xx: ô báo «chưa tải xong», gửi lại cùng tệp là xong.
// KHÔNG có route đọc tệp nào nhận cookie đăng ký (ADR-0208 Đ3): trả lời chỉ mang «đã gửi / chưa tải xong» theo ô, không khoá kho, không băm.
import { bamSha256 } from "../../shared/tep-dinh-kem.ts";
import { error, json, readJson } from "../../shared/http.ts";
import type { Ctx } from "../../shared/router.ts";
import { cauTepChoMoi, datKhoTepCho, demTepChoCuaPhieu, timTepChoTrung, trangThaiTepChoTheoO, xoaKhoTepChoDaGo } from "../parties";
import { chanNguoiKhongTaiKhoan } from "../../shared/maintenance.ts";
import { getMaintenanceState, maintenanceResponse } from "../maintenance";
import { cookiePhienDangKy, dkTepIpKey, docPhienDangKy, taoPhienDangKy } from "./phien.ts";
import { chinhSachHienHanh, datChoTepMang, phieuCuaPhien, suKienThemTepStatement } from "./repository.ts";
import { TRANG_THAI_CHO_TAI_TEP, kiemTepPhieu, laOTepPhieu, tranThanTep, type TrangThai } from "./rules.ts";

const HAN_TEP_MANG_MS = 3_600_000;
const CAU_HET_PHIEN = "Lần đăng nhập để điền phiếu đã hết hạn. Hãy đăng nhập lại bằng email để tiếp tục.";

export async function taiTepPhieu({ request, env }: Ctx<"public">): Promise<Response> {
  // ADR-0206 Đ8: bảo trì BẬT ⇒ chặn mọi lệnh của người đăng ký (không có ngoại lệ Toàn quyền); đứng TRƯỚC cookie và mọi việc với D1 ngoài việc đọc trạng thái.
  const baoTri = await getMaintenanceState(env.DB);
  if (chanNguoiKhongTaiKhoan(baoTri)) return maintenanceResponse(baoTri);
  const nowMs = Date.now();
  const at = new Date(nowMs).toISOString();
  const chinhSach = await chinhSachHienHanh(env.DB, at);
  if (!chinhSach) return error(404, "not_found", "Không tìm thấy.");
  const phien = await docPhienDangKy(request, env, nowMs, { idleMin: chinhSach.session_idle_minutes, maxHours: chinhSach.session_max_hours });
  if (!phien) return error(401, "registration_session_required", CAU_HET_PHIEN);
  const phieu = await phieuCuaPhien(env.DB, phien.registrationId, phien.identityId);
  if (!phieu) return error(401, "registration_session_required", CAU_HET_PHIEN);
  if (!TRANG_THAI_CHO_TAI_TEP.includes(phieu.status as TrangThai)) return error(409, "registration_not_editable", "Phiếu này không còn nhận thêm tệp.");
  if ((await demTepChoCuaPhieu(env.DB, phieu.id)) >= chinhSach.photo_max_count) return error(409, "too_many_files", `Mỗi phiếu tối đa ${chinhSach.photo_max_count} tệp.`);
  // Route công khai: đòi Content-Length (411) để trần cỡ thân có hiệu lực TRƯỚC khi đọc; thân không khai cỡ (chunked) không được đọc.
  const cl = request.headers.get("content-length");
  if (cl === null || !/^\d+$/.test(cl)) return error(411, "length_required", "Yêu cầu thiếu độ dài nội dung.");
  if (Number(cl) > tranThanTep(chinhSach.photo_max_mb)) return error(413, "file_too_large", `Tệp lớn hơn ${chinhSach.photo_max_mb} MB.`);
  const body = await readJson(request);
  if (!laOTepPhieu(body?.o)) return error(400, "invalid_input", "Ô tệp không hợp lệ.");
  const k = kiemTepPhieu(body?.noiDung, chinhSach.photo_max_mb);
  if (!k.ok) return error(k.status, k.code, k.message);
  const bam = await bamSha256(k.bytes);
  const slot = body.o;

  const trung = await timTepChoTrung(env.DB, phieu.id, slot, bam);
  if (trung) {
    // Bấm hai lần, hoặc gửi lại sau «tải dở dang»: không thêm dòng, không tốn lượt theo địa chỉ mạng. Chưa lưu thì đặt kho lại đúng khoá cũ.
    if (!trung.daLuu) await datKhoTepCho(env, trung.id, trung.storageKey, k.bytes);
  } else {
    // Chỉ tệp đã qua mọi kiểm tra mới tốn lượt theo địa chỉ mạng.
    const ip = request.headers.get("cf-connecting-ip") ?? "khong-ro";
    if (!(await datChoTepMang(env.DB, dkTepIpKey(ip), chinhSach.files_per_network_hour, nowMs, HAN_TEP_MANG_MS))) {
      return error(429, "too_many_uploads", "Đã tải quá nhiều tệp trong một giờ. Hãy thử lại sau.");
    }
    const moi = cauTepChoMoi(env.DB, { registrationId: phieu.id, slot, contentKind: k.loai, byteSize: k.bytes.length, contentHash: bam, actorRef: phien.identityId, toiDaMoiPhieu: chinhSach.photo_max_count }, at);
    // Thứ tự CỐ ĐỊNH: [chèn tệp, dòng lịch sử (đọc changes() của câu chèn; trigger canh trạng thái phiếu), gỡ tệp cũ cùng ô].
    const [chen, goCu] = moi.statements as [D1PreparedStatement, D1PreparedStatement];
    let kq: D1Result[];
    try {
      kq = await env.DB.batch([chen, suKienThemTepStatement(env.DB, { registrationId: phieu.id, identityId: phien.identityId, at }), goCu]);
    } catch (e) {
      if (/dk_event_tep_status/.test(e instanceof Error ? e.message : "")) return error(409, "registration_not_editable", "Phiếu này không còn nhận thêm tệp.");
      throw e;
    }
    if ((kq[0]?.meta.changes ?? 0) === 0) return error(409, "too_many_files", `Mỗi phiếu tối đa ${chinhSach.photo_max_count} tệp.`);
    await datKhoTepCho(env, moi.id, moi.storageKey, k.bytes);
    await xoaKhoTepChoDaGo(env, phieu.id); // tệp cũ cùng ô vừa bị thay: xoá khỏi kho SAU lô (lỗi không ném)
  }
  const tep = (await trangThaiTepChoTheoO(env.DB, phieu.id)).map((x) => ({ o: x.slot, trangThai: x.daLuu ? ("DA_GUI" as const) : ("CHUA_TAI_XONG" as const) }));
  const token = await taoPhienDangKy(env.SESSION_SECRET, phien.registrationId, phien.identityId, nowMs, phien.startMs);
  return json({ tep }, 200, { "set-cookie": cookiePhienDangKy(token, chinhSach.session_max_hours, new URL(request.url).protocol === "https:"), "cache-control": "no-store" });
}
