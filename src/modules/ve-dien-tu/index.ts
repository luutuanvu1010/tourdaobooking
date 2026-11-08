// Module ve-dien-tu — KHO VÉ ĐIỆN TỬ (ADR-0153, accepted 2026-10-31). Sở hữu `vdt_*`. Route: /api/ve*.
// Phụ thuộc: audit (nhật ký — chỉ số lượng và nhãn nhóm, KHÔNG BAO GIỜ mã vé), catalog (kiểm mã tour qua hàm công bố). Cạnh tới staff / thongbao / orders (chỉ đọc view)
// thêm khi dùng (ADR-0153 Đ1 mục 2). Chiều orders → ve-dien-tu KHÔNG có cạnh: gốc lắp ráp (src/index.ts) tiêm hàm cấp / trả vé vào ctx.
// Module khác CHỈ import từ file này.
import { auditStatement, nguoiLam } from "../audit";
import { clearAttempts, reserveAttempts } from "../auth";
import { coVeTheoMa, getEffectiveServices } from "../catalog";
import { UUID_RE, error, json, kemLocation, readJson } from "../../shared/http";
import { MATRIX, can, holdsPartner, isOffice, tacNhan } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { NGUON_VE, type NguonVe } from "../../shared/nguon-ve.ts";
import { LOAI_NOI_DUNG, bamSha256, dauPhanHoiTepChung, giaiBase64, nhanLoaiTep, taoKhoaNgauNhien, type LoaiTep } from "../../shared/tep-dinh-kem";
import { vnToday } from "../../shared/vn-date";
import { CAU_VE_QUA_HAN_TRA_SAU, CAU_VE_QUA_HAN_TRA_SAU_DOI_TAC, moVeDuoc } from "../../shared/tra-sau";
import { canVe, choDoiTacNop, thuDu } from "./rules.ts";
import { DANG_TOKEN, bamToken, hanDuongDan, soSanhHangThoiGian, taoToken, trangVeKhach } from "./duong-dan-khach.ts";
import { NHAN_NHOM, NHAN_NHOM_LO, soanCapVe, soanTraVe, veDangGiu, type GhiNhatKy, type NhatKyVe } from "./cap-ve.ts";
import { NGAY_LUU_ANH_LO_HUY, TOI_DA_BYTE_ANH, TOI_DA_VE_MOI_DOT, TRAN_LO_MAC_DINH, tranLoHopLe } from "../../shared/ve-nhap-lo";
import { datVeVaoKho, donHangChoXoa, type VeChuanBi } from "./kho-tep.ts";
import { che4SoCuoi, kiemLo, kiemVeMoi } from "./nhap-lo.ts";
import { bamDaCo, cauBoLo, cauChenLink, cauDemMoLink, cauDoiTranLo, cauRutVeCuaLo, cauThuHoiLink, docCaiDatVe, docHanCuoiCuaDon, docLinkCuaDon, docLinkTheoBam, docLinkTheoId, docVeCuaLink, dsLoBoDuoc, dsLoDaHuy, bamDaMo, cauMoAnhVe, docVeLoHuy, maVeDaMo, type LinkKhach, cauChenGiao, cauChenLo, cauChenVe, cauDanhDauLo, docChuDon, docTrangThaiDon, docPhanBoDeXem, docPhanBoMoCuaDon, docPhanBoMoKemLo, phanBoConGiu, cauKichHoatLo, cauSuaMaTour, demVeCuaLo, docLo, maVeDaCo, thongKeKho } from "./repository.ts";

export { demVeTheoTrangThai } from "./repository.ts";
import { veDaMoCuaDon as docVeDaMoCuaDon } from "./repository.ts";
/** ADR-0170 Đ3: «đơn có vé đã mở không» cho gốc lắp ráp tiêm. Không đọc được ⇒ `null` (bên gọi CHẶN, không đoán «chưa mở»). */
export const veDaMoCuaDon = async (db: D1Database, orderId: string): Promise<boolean | null> => {
  try { return await docVeDaMoCuaDon(db, orderId); } catch (e) { console.error("ve_da_mo_loi", orderId, e instanceof Error ? e.name : "loi"); return null; }
};

/** Nối nhật ký thật (module audit) vào các hàm soạn câu của cap-ve.ts. Gốc lắp ráp dùng khi tiêm (Task 5). */
export const nhatKyThat = (db: D1Database): GhiNhatKy => (e: NhatKyVe, onlyIf: string) => auditStatement(db, e, onlyIf);
export { NHAN_NHOM, soanCapVe, soanTraVe, veDangGiu };
export { canBangVeTheoSoKhach, capVeChoDon, soanTraVeKhiHuy } from "./noi-orders.ts";

const MAX_BYTE_ANH = TOI_DA_BYTE_ANH;
/** Cỡ thân một đợt thêm vé: 10 ảnh × 3 MB base64 + dư. */
const TOI_DA_THAN_DOT = Math.ceil((TOI_DA_VE_MOI_DOT * MAX_BYTE_ANH) / 3) * 4 + 64 * 1024;
const LOAI_ANH: readonly LoaiTep[] = ["jpg", "png"];
/** Danh sách lô bỏ được: đủ cho vài ngày nhập; lô cũ hơn không cần gỡ ở màn này. */
const TOI_DA_DS_LO = 50;
const TOI_DA_DON_MOI_LAN = 50;
/** Trần lô đang áp (ADR-0156 Đ3). Thiếu dòng cấu hình ⇒ mặc định, không bỏ giới hạn. */
const docTranLo = async (db: D1Database): Promise<number> => (await docCaiDatVe(db))?.batch_limit ?? TRAN_LO_MAC_DINH;

const KHONG_QUYEN = () => error(403, "forbidden", "Bạn không có quyền quản lý kho vé điện tử.");
type NguoiHoi = Parameters<typeof can>[0];
/**
 * ADR-0175 Đ1.4: MỘT cửa quyết quyền trên lô theo nguồn của lô. Lô hãng ngoài: `ve.kho.manage`. Lô Tour Đảo: `ve.phat-hanh`; riêng xem số lượng
 * (`chiXem` — GET /api/ve/kho, GET /api/ve/lo) thêm `ve.kho.manage`. Lô đã huỷ và ảnh của nó KHÔNG phải xem số lượng (chiXem = false).
 */
const coQuyenLo = (staff: NguoiHoi, nguon: NguonVe, chiXem = false): boolean =>
  nguon === "HANG_NGOAI" ? can(staff, "ve.kho.manage") : can(staff, "ve.phat-hanh") || (chiXem && can(staff, "ve.kho.manage"));
/** Các nguồn người gọi được thấy ở một danh sách; rỗng ⇒ route trả 403. */
const nguonDuocXem = (staff: NguoiHoi, chiXem: boolean): NguonVe[] => NGUON_VE.filter((n) => coQuyenLo(staff, n, chiXem));
const KHONG_THAY = () => error(404, "not_found", "Không tìm thấy lô vé.");
const BAD_JSON = () => error(400, "invalid_input", "Nội dung gửi lên không hợp lệ.");
/** Mã phân bổ do D1 sinh (`lower(hex(randomblob(16)))`), không phải UUID. */
const MA_PHAN_BO = /^[0-9a-f]{32}$/;
/** `vdt_ticket.content_kind` lưu kiểu MIME (khi nhập lô); đổi ngược về loại tệp cho `dauPhanHoiTepChung`. Không nhận ra ⇒ PNG (ảnh, không bao giờ loại chạy được). */
const loaiTuMime = (mime: string): LoaiTep => (LOAI_ANH.find((l) => LOAI_NOI_DUNG[l] === mime) ?? "png");
// ---- Đường dẫn khách: đầu phản hồi, 404 duy nhất, giới hạn tốc độ -----------------------------------------------------------------------------------------------
const DAU_KHACH = { "cache-control": "no-store", "x-content-type-options": "nosniff", "cross-origin-resource-policy": "same-origin", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow" } as const;
/** MỘT thân, MỘT bộ đầu cho mọi lý do không thấy (sai token, hết hạn, thu hồi, vé ngoài khoảng) — không phân biệt được từ ngoài. */
const khongThayDuongDan = (): Response => new Response("Không tìm thấy.", { status: 404, headers: { ...DAU_KHACH, "content-type": "text/plain; charset=utf-8" } });
/** Giới hạn tốc độ chống dò token: mỗi lần gọi đặt chỗ theo địa chỉ và theo tổng; thành công thì TRẢ chỗ (chỉ lần sai tính). Vượt ⇒ 429 (không phân biệt token đúng / sai). */
const HAN_MUC_IP = 20;
const HAN_MUC_TONG = 400;
async function mocDuongDanKhach(env: Env, request: Request, token: string): Promise<{ loi: Response; link?: undefined; tra?: undefined } | { loi?: undefined; link: LinkKhach; tra: () => Promise<void> }> {
  const ip = (request.headers.get("cf-connecting-ip") ?? "khong-ro").slice(0, 64);
  const chan = await reserveAttempts(env.DB, [{ key: `vekhach:ip:${ip}`, max: HAN_MUC_IP }, { key: "vekhach:tong", max: HAN_MUC_TONG }]);
  if (!chan.allowed) return { loi: new Response("Thử lại sau ít phút.", { status: 429, headers: { ...DAU_KHACH, "content-type": "text/plain; charset=utf-8", "retry-after": String(chan.retryAfterSeconds) } }) };
  if (!DANG_TOKEN.test(token)) return { loi: khongThayDuongDan() };
  const bam = await bamToken(token);
  const link = await docLinkTheoBam(env.DB, bam);
  const hopLe = link !== null && soSanhHangThoiGian(link.token_hash, bam) && link.revoked_at === null && link.expires_at >= new Date().toISOString();
  if (!hopLe) return { loi: khongThayDuongDan() };
  return { link, tra: () => clearAttempts(env.DB, null, chan.ids) };
}
const DON_KHONG_THAY = () => error(404, "not_found", "Không tìm thấy đơn.");
const VE_KHONG_THAY = () => error(404, "not_found", "Không tìm thấy vé.");
const KHONG_QUYEN_GUI = () => error(403, "forbidden", "Bạn không có quyền xem hoặc gửi vé của đơn này.");
/** ADR-0170 Đ2 mục 5: người giữ quyền Đối tác nghe «Công ty chưa xác nhận…»; nhân viên giữ câu cũ. Chữ dùng chung với `web/ve-don.ts` (cùng nội dung, hai nơi vì giao diện không import module). */
const CAU_CHO_CONG_TY_XAC_NHAN = "Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé.";
const CHUA_THU_DU = (t: Parameters<typeof choDoiTacNop>[0], nguoiXemLaDoiTac: boolean) =>
  error(403, "chua_thu_du", choDoiTacNop(t) ? (nguoiXemLaDoiTac ? CAU_CHO_CONG_TY_XAC_NHAN : "Đang chờ đối tác nộp tiền về công ty nên chưa xem hoặc gửi được vé.") : "Đơn chưa thu đủ tiền nên chưa xem hoặc gửi được vé.");
/**
 * ADR-0170 Đ1: sáu route vé qua cổng `orders` nên Hướng dẫn viên, Thực tập vào được cổng; tài khoản KHÔNG có ô `ve.cap.send` nào khác `none` nhận 403 NGAY, trước khi tra đơn
 * (cùng một mã dù mã đơn có tồn tại hay không — như cổng `office` trước đây). `GET /api/ve/don` còn cho văn phòng (Kế toán xem số lượng, không có ô gửi).
 */
const coOGuiVe = (staff: { permissions: readonly string[] }): boolean => staff.permissions.some((p) => (MATRIX["ve.cap.send"] as Record<string, string>)[p] !== undefined && (MATRIX["ve.cap.send"] as Record<string, string>)[p] !== "none");
const chanNeuKhongCoO = (staff: Parameters<typeof isOffice>[0], choVanPhong = false): Response | null => (coOGuiVe(staff) || (choVanPhong && isOffice(staff)) ? null : KHONG_QUYEN_GUI());
type TienVe = { daThu: number; phaiThu: number; choNop?: number; choXacNhan?: number; traSau?: { hanTra: string | null; hetAnHan: string | null; no: number } | null } | null;
/** ADR-0168 Đ3 mục 1, ADR-0172 Đ3 mục 3: MỘT cửa quyết vé có mở được không — đơn Trả trước phải thu đủ; đơn Trả sau mở trước, trừ khi HẾT ÂN HẠN còn nợ mà vé CHƯA mở (`veDaMo`). Mọi route vé, KỂ CẢ hai route công khai của đường dẫn khách (ADR-0171 Đ2), chỉ hỏi hàm này. */
const veMoDuoc = (tien: TienVe, veDaMo: boolean): boolean => moVeDuoc({ thuDu: thuDu(tien), traSau: tien?.traSau ?? null, veDaMo, bayGio: new Date().toISOString() });
/** Câu khoá: đơn Trả sau quá hạn có câu riêng; đơn Trả trước giữ câu cũ (và ca chờ đối tác nộp, câu riêng cho đối tác). */
const CHUA_MO_VE = (t: TienVe, nguoiXemLaDoiTac: boolean) => (t?.traSau ? error(403, "tra_sau_qua_han", nguoiXemLaDoiTac ? CAU_VE_QUA_HAN_TRA_SAU_DOI_TAC : CAU_VE_QUA_HAN_TRA_SAU) : CHUA_THU_DU(t, nguoiXemLaDoiTac));
const mocLoHuy = (): string => new Date(Date.now() - NGAY_LUU_ANH_LO_HUY * 864e5).toISOString();
const VE_DA_NHAP_LAI = () => error(409, "ve_da_nhap_lai", "Vé này đã được nhập lại vào kho nên không mở được ảnh cũ.");
const KHO_CHUA_BAT = () => error(503, "storage_unavailable", "Kho vé điện tử chưa được bật. Vui lòng báo người phụ trách hệ thống.");

/** Tác nhân tự động của việc dọn ảnh vé (ADR-0186 Đ1): chỉ Cron dùng; giữ đúng ô `ve.kho.purge`, không có nút hay route nào cho người. */
const DON_ANH_VE = tacNhan("DON_ANH_VE");

/**
 * Cron ở gốc lắp ráp: xoá ảnh ở hàng «chờ xoá» đã quá hạn lưu, dưới tác nhân DON_ANH_VE (ADR-0186). Tắt kho thì không làm gì. Lượt có xoá ghi MỘT dòng nhật ký
 * «Xoá ảnh vé hết hạn lưu» mang mã tác nhân — chỉ số ảnh, không mã vé, không khoá kho (ADR-0186 Đ4). KHÔNG BAO GIỜ NÉM, để lỗi ở đây không kéo theo việc định kỳ khác.
 */
export async function donHangChoXoaVe(env: Pick<Env, "DB"> & { VE_DIEN_TU?: R2Bucket }): Promise<void> {
  if (!env.VE_DIEN_TU) return;
  const daXoa = await donHangChoXoa(env.DB, env.VE_DIEN_TU, DON_ANH_VE, TOI_DA_DON_MOI_LAN, () => new Date().toISOString());
  if (daXoa === 0) return;
  try {
    await auditStatement(env.DB, { ...nguoiLam(DON_ANH_VE), action: "ve_xoa_anh_het_han", at: new Date().toISOString(), targetType: "system", targetId: "ve-dien-tu", detail: `${daXoa} ảnh` }).run();
  } catch (e) {
    console.error(JSON.stringify({ level: "error", event: "ve_dien_tu_nhat_ky_xoa_anh_loi", loi: e instanceof Error ? e.name : "unknown" }));
  }
}

export const veDienTuModule: AppModule = {
  name: "ve-dien-tu",
  routes: [
    // Thống kê kho (tiêu chí D5): theo dịch vụ + nhóm khách; chỉ ĐẾM, không mã vé, không khoá kho.
    route("GET", "/api/ve/kho", "office", async ({ env, staff }) => {
      const nguon = nguonDuocXem(staff, true);
      if (nguon.length === 0) return KHONG_QUYEN();
      const hom = new Date();
      const homNay = vnToday(hom);
      const hanSap = vnToday(new Date(hom.getTime() + 7 * 24 * 3600 * 1000));
      const dong = await thongKeKho(env.DB, homNay, hanSap, nguon);
      const ten = await getEffectiveServices(env.DB, [...new Set(dong.map((d) => d.catalog_code))]);
      return json({
        tranLo: await docTranLo(env.DB),
        kho: dong.map((d) => ({
          catalogCode: d.catalog_code,
          tenDichVu: ten.get(d.catalog_code)?.name ?? null,
          nhomKhach: d.pax_group,
          nguon: d.source,
          conTrong: d.con_trong ?? 0,
          sapHetHan: d.sap_het_han ?? 0,
          daGiu: d.da_giu ?? 0,
          daGiao: d.da_giao ?? 0,
        })),
      });
    }),

    // Trần lô (ADR-0156 Đ3): chỉ Toàn quyền đọc và đổi ở đây; trang nhập lô đọc trần qua GET /api/ve/kho (ô ve.kho.manage).
    route("GET", "/api/ve/cai-dat", "admin", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được xem cài đặt vé điện tử.");
      const r = await docCaiDatVe(env.DB);
      return json({ tranLo: r?.batch_limit ?? TRAN_LO_MAC_DINH, version: r?.version ?? 0 });
    }),

    route("PUT", "/api/ve/cai-dat", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được đổi cài đặt vé điện tử.");
      const body = await readJson(request);
      const version = body?.version;
      if (!body || !Number.isInteger(version)) return error(400, "invalid_input", "Thiếu phiên bản cài đặt đang xem — tải lại trang.");
      if (!tranLoHopLe(body.tranLo)) return error(400, "invalid_input", "Số vé tối đa mỗi lô phải là số nguyên từ 1 đến 200.");
      const cu = await docCaiDatVe(env.DB);
      if (!cu || cu.version !== version) return error(409, "stale", "Cài đặt vừa được người khác đổi — tải lại để xem bản mới.");
      const at = new Date().toISOString();
      const [doi] = await env.DB.batch([
        cauDoiTranLo(env.DB, { tranLo: body.tranLo, version: version as number, at, by: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "ve_doi_tran_lo", at, targetType: "system", targetId: "ve-dien-tu", detail: `Số vé tối đa mỗi lô: ${cu.batch_limit} → ${body.tranLo}` }, "changes() > 0"),
      ]);
      if (!doi || doi.meta.changes === 0) return error(409, "stale", "Cài đặt vừa được người khác đổi — tải lại để xem bản mới.");
      return json({ tranLo: body.tranLo, version: (version as number) + 1 });
    }),

    // Các lô còn huỷ được (ADR-0156 Đ2 mục 3): đang dở hoặc đã vào kho nhưng chưa vé nào từng được giữ chỗ. Chỉ nhãn và số đếm, không mã vé, không khoá kho.
    route("GET", "/api/ve/lo", "office", async ({ env, staff }) => {
      const nguon = nguonDuocXem(staff, true);
      if (nguon.length === 0) return KHONG_QUYEN();
      const ds = await dsLoBoDuoc(env.DB, TOI_DA_DS_LO, nguon);
      const ten = await getEffectiveServices(env.DB, [...new Set(ds.map((d) => d.catalog_code))]);
      return json({
        lo: ds.map((d) => ({ loId: d.id, tenDichVu: ten.get(d.catalog_code)?.name ?? null, nhomKhach: d.pax_group, tenSanPham: d.printed_name, nguon: d.source, trangThai: d.status, soVe: d.so_ve, taoLuc: d.created_at })),
      });
    }),

    // Lô đã huỷ gần đây (chủ quyết 2/11/2026): để tra cứu; chỉ 4 số cuối mã, không khoá kho. Ảnh mở bằng hai route dưới: mở lần đầu thì khoá hẳn vé, vì ảnh mang QR dùng được như vé thật.
    route("GET", "/api/ve/lo-da-huy", "office", async ({ env, staff, nhanNhanVien }) => {
      const nguon = nguonDuocXem(staff, false);
      if (nguon.length === 0) return KHONG_QUYEN();
      const dong = await dsLoDaHuy(env.DB, mocLoHuy(), TOI_DA_DS_LO, nguon);
      const ten = await getEffectiveServices(env.DB, [...new Set(dong.map((d) => d.catalog_code))]);
      const nguoi = await nhanNhanVien([...new Set(dong.flatMap((d) => (d.huy_boi ? [d.huy_boi] : [])))]);
      const lo = new Map<string, { loId: string; tenDichVu: string | null; nhomKhach: string; tenSanPham: string; huyLuc: string; huyBoi: string | null; ve: { veId: string; duoiMa: string; tuNgay: string; denNgay: string; trangThaiAnh: "CHUA_MO" | "DA_MO" | "DA_NHAP_LAI" | "HET_ANH" }[] }>();
      for (const d of dong) {
        let l = lo.get(d.id);
        if (!l) lo.set(d.id, (l = { loId: d.id, tenDichVu: ten.get(d.catalog_code)?.name ?? null, nhomKhach: d.pax_group, tenSanPham: d.printed_name, huyLuc: d.huy_luc, huyBoi: (d.huy_boi && nguoi?.get(d.huy_boi)) || null, ve: [] }));
        l.ve.push({ veId: d.ve_id, duoiMa: d.duoi_ma, tuNgay: d.valid_from, denNgay: d.valid_to, trangThaiAnh: d.r2_deleted_at ? "HET_ANH" : d.opened_at ? "DA_MO" : d.da_nhap_lai ? "DA_NHAP_LAI" : "CHUA_MO" });
      }
      return json({ hanLuuNgay: NGAY_LUU_ANH_LO_HUY, lo: [...lo.values()] });
    }),

    // Mở ảnh vé của lô đã huỷ (chủ quyết 2/11/2026): khoá hẳn vé rồi mới xem được, để không có chuyện gửi ảnh cho khách A rồi nhập lại bán cho khách B. Hỏi kho TRƯỚC khi khoá: kho hỏng hay mất ảnh thì không làm mất vé.
    route("POST", "/api/ve/lo-da-huy/:veId/mo", "office", async ({ env, staff, params }) => {
      if (!can(staff, "ve.kho.manage") && !can(staff, "ve.phat-hanh")) return KHONG_QUYEN();
      const kho = env.VE_DIEN_TU;
      if (!kho) return KHO_CHUA_BAT();
      const veId = params.veId ?? "";
      if (!UUID_RE.test(veId)) return VE_KHONG_THAY();
      const moc = mocLoHuy();
      const ve = await docVeLoHuy(env.DB, veId, moc);
      if (!ve) return VE_KHONG_THAY();
      if (!coQuyenLo(staff, ve.source)) return KHONG_QUYEN();
      if (ve.opened_at) return json({ veId, trangThaiAnh: "DA_MO" });
      if (ve.da_nhap_lai) return VE_DA_NHAP_LAI();
      let coAnh: boolean;
      try { coAnh = (await kho.head(ve.storage_key)) !== null; } catch (e) {
        console.error(JSON.stringify({ level: "error", event: "ve_dien_tu_hoi_kho_loi", veId, loi: e instanceof Error ? e.message : "khong_ro" }));
        return error(503, "storage_unavailable", "Kho vé đang lỗi, vé chưa bị khoá. Vui lòng thử lại sau.");
      }
      if (!coAnh) {
        console.error(JSON.stringify({ level: "error", event: "ve_dien_tu_thieu_doi_tuong", veId }));
        return VE_KHONG_THAY();
      }
      const at = new Date().toISOString();
      const kq = await env.DB.batch([
        cauMoAnhVe(env.DB, veId, at, staff.id, moc),
        auditStatement(env.DB, { staffId: staff.id, action: "ve_mo_anh_lo_huy", at, targetType: "ve", targetId: veId, detail: "Mở ảnh vé của lô đã huỷ; vé bị khoá, không nhập lại được" }, "changes() > 0"),
      ]);
      if ((kq[0]?.meta?.changes ?? 0) > 0) return json({ veId, trangThaiAnh: "DA_MO" });
      // Thua đua: hoặc người khác vừa mở cùng vé, hoặc vé vừa được nhập lại.
      const lai = await docVeLoHuy(env.DB, veId, moc);
      if (!lai) return VE_KHONG_THAY();
      return lai.opened_at ? json({ veId, trangThaiAnh: "DA_MO" }) : VE_DA_NHAP_LAI();
    }),

    // Xem ảnh vé đã mở. Cùng thứ tự với route ảnh của đơn: chặn trang khác → quyền → vé đã mở → NHẬT KÝ → mới đọc kho.
    route("GET", "/api/ve/lo-da-huy/:veId/anh", "office", async ({ request, env, staff, params }) => {
      const sfs = request.headers.get("sec-fetch-site");
      if (sfs !== null && sfs !== "same-origin" && sfs !== "none") return error(403, "forbidden", "Không mở ảnh vé từ trang khác.");
      if (!can(staff, "ve.kho.manage") && !can(staff, "ve.phat-hanh")) return KHONG_QUYEN();
      const kho = env.VE_DIEN_TU;
      if (!kho) return KHO_CHUA_BAT();
      const veId = params.veId ?? "";
      if (!UUID_RE.test(veId)) return VE_KHONG_THAY();
      const ve = await docVeLoHuy(env.DB, veId, mocLoHuy());
      if (!ve) return VE_KHONG_THAY();
      if (!coQuyenLo(staff, ve.source)) return KHONG_QUYEN();
      if (!ve.opened_at) return error(409, "ve_chua_mo", "Vé này chưa được mở ảnh.");
      await env.DB.batch([auditStatement(env.DB, { staffId: staff.id, action: "ve_mo_anh_lo_huy", at: new Date().toISOString(), targetType: "ve", targetId: veId, detail: "Xem ảnh vé của lô đã huỷ" })]);
      let obj: R2ObjectBody | null;
      try { obj = await kho.get(ve.storage_key); } catch (e) {
        console.error(JSON.stringify({ level: "error", event: "ve_dien_tu_hoi_kho_loi", veId, loi: e instanceof Error ? e.message : "khong_ro" }));
        return error(503, "storage_unavailable", "Kho vé đang lỗi. Vui lòng thử lại sau.");
      }
      if (!obj) {
        console.error(JSON.stringify({ level: "error", event: "ve_dien_tu_thieu_doi_tuong", veId }));
        return VE_KHONG_THAY();
      }
      return new Response(obj.body, { status: 200, headers: dauPhanHoiTepChung({ id: ve.id, loai: loaiTuMime(ve.content_kind), tenDau: "ve" }) });
    }),

    // Tạo lô (PENDING): một dịch vụ + một nhóm khách + tên sản phẩm in trên vé, chọn một lần cho cả lô. Vượt trần ⇒ 400 và KHÔNG tạo lô dở.
    route("POST", "/api/ve/lo", "office", async ({ request, env, staff }) => {
      if (!can(staff, "ve.kho.manage") && !can(staff, "ve.phat-hanh")) return KHONG_QUYEN();
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = kiemLo(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      if (!coQuyenLo(staff, v.value.nguon)) return KHONG_QUYEN();
      if (raw.soVeDuKien !== undefined) {
        if (!Number.isInteger(raw.soVeDuKien) || (raw.soVeDuKien as number) < 1) return error(400, "invalid_input", "Số ảnh dự kiến không hợp lệ.");
        const tran = await docTranLo(env.DB);
        if ((raw.soVeDuKien as number) > tran) return error(400, "batch_limit", `Một lô tối đa ${tran} vé.`);
      }
      const dv = await getEffectiveServices(env.DB, [v.value.catalogCode]);
      if (!dv.has(v.value.catalogCode)) return error(400, "invalid_input", "Dịch vụ không có trong danh mục.");
      const id = crypto.randomUUID();
      const at = new Date().toISOString();
      await env.DB.batch([
        cauChenLo(env.DB, { id, catalogCode: v.value.catalogCode, nhom: v.value.nhomKhach, tenSanPham: v.value.tenSanPham, at, by: staff.id, nguon: v.value.nguon }),
        auditStatement(env.DB, { staffId: staff.id, action: "ve_nhap_lo", at, targetType: "ve", targetId: v.value.catalogCode, detail: `Mở lô vé · ${NHAN_NHOM_LO[v.value.nhomKhach]}` }),
      ]);
      return kemLocation(json({ loId: id }, 201), `/ve-kho?lo=${id}`);
    }),

    // Thêm một đợt vé vào lô PENDING. D1 TRƯỚC (dòng vé + nhật ký), kho SAU; lỗi kho không làm hỏng yêu cầu (vé chưa lưu thì không bao giờ được giữ chỗ).
    route("POST", "/api/ve/lo/:id/ve", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "ve.kho.manage") && !can(staff, "ve.phat-hanh")) return KHONG_QUYEN();
      const loId = params.id ?? "";
      if (!UUID_RE.test(loId)) return KHONG_THAY();
      if (Number(request.headers.get("content-length") ?? "0") > TOI_DA_THAN_DOT) return error(413, "file_too_large", `Mỗi đợt tối đa ${TOI_DA_VE_MOI_DOT} ảnh, mỗi ảnh tối đa 3 MB.`);
      const kho = env.VE_DIEN_TU;
      if (!kho) return KHO_CHUA_BAT();
      const raw = await readJson(request);
      if (!raw || !Array.isArray(raw.ve)) return BAD_JSON();
      if (raw.ve.length < 1 || raw.ve.length > TOI_DA_VE_MOI_DOT) return error(400, "invalid_input", `Mỗi đợt thêm từ 1 đến ${TOI_DA_VE_MOI_DOT} vé.`);
      const lo = await docLo(env.DB, loId);
      if (!lo) return KHONG_THAY();
      if (!coQuyenLo(staff, lo.source)) return KHONG_QUYEN();
      if (lo.status !== "PENDING") return error(409, "batch_closed", "Lô này đã đưa vào kho hoặc đã vô hiệu, không thêm vé được nữa.");
      const tran = await docTranLo(env.DB);
      if ((await demVeCuaLo(env.DB, loId)).tong + raw.ve.length > tran) return error(400, "batch_limit", `Một lô tối đa ${tran} vé.`);
      // Kiểm TỪNG vé trước khi chạm D1; một vé sai không kéo cả đợt.
      const hop: { thuTu: number; raw: Record<string, unknown>; ma: string; tuNgay: string; denNgay: string; gio: string | null; bytes: Uint8Array; loai: LoaiTep; bam: string }[] = [];
      const loi: { thuTu: number; lyDo: string }[] = [];
      const trongDot = new Set<string>();
      const bamTrongDot = new Set<string>();
      for (const [i, x] of raw.ve.entries()) {
        const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
        const k = kiemVeMoi(r, lo.source);
        if (!k.ok) { loi.push({ thuTu: i, lyDo: k.message }); continue; }
        const bytes = giaiBase64(r.noiDung);
        if (!bytes) { loi.push({ thuTu: i, lyDo: "Ảnh không đọc được." }); continue; }
        if (bytes.length > MAX_BYTE_ANH) { loi.push({ thuTu: i, lyDo: "Ảnh quá 3 MB." }); continue; }
        const loai = nhanLoaiTep(bytes);
        if (!loai || !LOAI_ANH.includes(loai)) { loi.push({ thuTu: i, lyDo: "Chỉ nhận ảnh JPG hoặc PNG." }); continue; }
        if (trongDot.has(k.value.maVe)) { loi.push({ thuTu: i, lyDo: "Trùng mã vé với một ảnh khác trong đợt này." }); continue; }
        const bam = await bamSha256(bytes);
        if (bamTrongDot.has(bam)) { loi.push({ thuTu: i, lyDo: "Trùng với một ảnh khác trong đợt này." }); continue; }
        trongDot.add(k.value.maVe);
        bamTrongDot.add(bam);
        hop.push({ thuTu: i, raw: r, ma: k.value.maVe, tuNgay: k.value.tuNgay, denNgay: k.value.denNgay, gio: k.value.gio, bytes, loai, bam });
      }
      // Dấu vân tệp do máy chủ tự tính nên không phụ thuộc chuỗi QR trình duyệt gửi (ADR-0156 Đ1 mục 5, Đ2 mục 1).
      const daCo = await maVeDaCo(env.DB, hop.map((h) => h.ma));
      const bamCo = await bamDaCo(env.DB, hop.map((h) => h.bam));
      const [maMo, bamMo] = await Promise.all([maVeDaMo(env.DB, hop.map((h) => h.ma)), bamDaMo(env.DB, hop.map((h) => h.bam))]);
      const moi = hop.filter((h) => {
        if (maMo.has(h.ma) || bamMo.has(h.bam)) { loi.push({ thuTu: h.thuTu, lyDo: "Vé này đã được mở ảnh khi lô bị huỷ nên không nhập lại được." }); return false; }
        if (daCo.has(h.ma)) { loi.push({ thuTu: h.thuTu, lyDo: "Mã vé đã có trong kho, đã loại." }); return false; }
        if (bamCo.has(h.bam)) { loi.push({ thuTu: h.thuTu, lyDo: "Ảnh này đã có trong kho, đã loại." }); return false; }
        return true;
      });
      const at = new Date().toISOString();
      const chuanBi: VeChuanBi[] = [];
      const cau: D1PreparedStatement[] = [];
      for (const h of moi) {
        const id = crypto.randomUUID();
        chuanBi.push({ id, bytes: h.bytes, loai: h.loai });
        cau.push(cauChenVe(env.DB, { id, batchId: loId, maVe: h.ma, tuNgay: h.tuNgay, denNgay: h.denNgay, gio: h.gio, khoa: taoKhoaNgauNhien("vdt"), loaiNoiDung: LOAI_NOI_DUNG[h.loai], coBytes: h.bytes.length, bam: h.bam, at, by: staff.id }));
      }
      let ketQua: D1Result[] = [];
      if (cau.length > 0) {
        cau.push(auditStatement(env.DB, { staffId: staff.id, action: "ve_nhap_lo", at, targetType: "ve", targetId: lo.catalog_code, detail: `Thêm vé vào lô · ${NHAN_NHOM_LO[lo.pax_group as keyof typeof NHAN_NHOM_LO]} · ${cau.length} vé` }, "changes() > 0"));
        ketQua = await env.DB.batch(cau);
      }
      // Câu chèn có điều kiện không ghi dòng nào: người khác vừa nhập đúng vé này. Báo rõ để khỏi bị bảo «nhập lại», vì nhập lại cũng bị loại.
      const daChen = (_: unknown, i: number): boolean => (ketQua[i]?.meta?.changes ?? 0) > 0;
      moi.forEach((h, i) => { if (!daChen(h, i)) loi.push({ thuTu: h.thuTu, lyDo: "Vé này vừa được nhập ở nơi khác, đã loại." }); });
      const veVao = chuanBi.filter(daChen);
      const chuaLuu = await datVeVaoKho(env.DB, kho, { batchId: loId, ve: veVao, luc: () => new Date().toISOString() });
      const dem = await demVeCuaLo(env.DB, loId);
      return json({
        loId,
        themDuoc: veVao.length - chuaLuu > 0 ? veVao.length - chuaLuu : 0,
        chuaLuuVaoKho: chuaLuu,
        loai: loi.sort((a, b) => a.thuTu - b.thuTu),
        veTrongLo: dem.daLuu,
        veDaNhap: moi.filter(daChen).map((h) => ({ maVeCuoi: che4SoCuoi(h.ma), tuNgay: h.tuNgay, denNgay: h.denNgay })),
      });
    }),

    // Đưa lô vào kho (PENDING → ACTIVE): chỉ khi lô có ít nhất một vé đã lưu kho.
    route("POST", "/api/ve/lo/:id/xac-nhan", "office", async ({ env, params, staff }) => {
      if (!can(staff, "ve.kho.manage") && !can(staff, "ve.phat-hanh")) return KHONG_QUYEN();
      const loId = params.id ?? "";
      if (!UUID_RE.test(loId)) return KHONG_THAY();
      const lo = await docLo(env.DB, loId);
      if (!lo) return KHONG_THAY();
      if (!coQuyenLo(staff, lo.source)) return KHONG_QUYEN();
      const at = new Date().toISOString();
      const kq = await env.DB.batch([
        cauKichHoatLo(env.DB, loId, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "ve_xac_nhan_lo", at, targetType: "ve", targetId: lo.catalog_code, detail: `Đưa lô vé vào kho · ${NHAN_NHOM_LO[lo.pax_group as keyof typeof NHAN_NHOM_LO]}` }, "changes() > 0"),
      ]);
      if ((kq[0]?.meta?.changes ?? 0) === 0) return error(409, "batch_not_ready", "Lô chưa có vé nào lưu được vào kho, hoặc đã được đưa vào kho trước đó.");
      // ADR-0174 Đ6: không chặn nhập lô; dịch vụ đang Không vé thì báo để người nhập nhờ Quản trị bật ô.
      const coVe = await coVeTheoMa(env.DB, [lo.catalog_code]);
      return json({ loId, trangThai: "ACTIVE", veTrongLo: (await demVeCuaLo(env.DB, loId)).daLuu, dichVuKhongVe: coVe.get(lo.catalog_code) !== true });
    }),

    // Huỷ lô (nút «Huỷ lô»; ADR-0156 Đ2 mục 3): lô chưa có vé nào TỪNG được giữ chỗ. Một lô D1 nguyên khối. Vé mang dấu rút nên nhập lại được. Ảnh KHÔNG xoá ngay: lưu `NGAY_LUU_ANH_LO_HUY` ngày rồi việc định kỳ xoá (chủ quyết 2/11).
    route("POST", "/api/ve/lo/:id/bo", "office", async ({ env, params, staff }) => {
      if (!can(staff, "ve.kho.manage") && !can(staff, "ve.phat-hanh")) return KHONG_QUYEN();
      const loId = params.id ?? "";
      if (!UUID_RE.test(loId)) return KHONG_THAY();
      const lo = await docLo(env.DB, loId);
      if (!lo) return KHONG_THAY();
      if (!coQuyenLo(staff, lo.source)) return KHONG_QUYEN();
      const at = new Date().toISOString();
      const lenh = crypto.randomUUID();
      const kq = await env.DB.batch([
        cauBoLo(env.DB, loId, at, staff.id, lenh),
        auditStatement(env.DB, { staffId: staff.id, action: "ve_bo_lo", at, targetType: "ve", targetId: lo.catalog_code, detail: `Huỷ lô vé · ${NHAN_NHOM_LO[lo.pax_group as keyof typeof NHAN_NHOM_LO]}` }, "changes() > 0"),
        cauRutVeCuaLo(env.DB, loId, at, staff.id, lenh),
      ]);
      if ((kq[0]?.meta?.changes ?? 0) === 0) return error(409, "batch_in_use", "Lô này đã có vé từng được giữ chỗ cho đơn hoặc đã huỷ trước đó, không huỷ được.");
      return json({ loId, trangThai: "VOID", veDaRut: kq[2]?.meta?.changes ?? 0 });
    }),

    // Sửa dịch vụ (mã tour) của lô — chỉ khi CHƯA vé nào của lô được giữ chỗ (trigger vdt_batch_code_locked canh ở cơ sở dữ liệu).
    route("POST", "/api/ve/lo/:id/sua-ma-tour", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "ve.kho.manage") && !can(staff, "ve.phat-hanh")) return KHONG_QUYEN();
      const loId = params.id ?? "";
      if (!UUID_RE.test(loId)) return KHONG_THAY();
      const raw = await readJson(request);
      const ma = typeof raw?.catalogCode === "string" ? raw.catalogCode.trim() : "";
      if (!raw || ma.length < 1 || ma.length > 40) return BAD_JSON();
      const lo = await docLo(env.DB, loId);
      if (!lo) return KHONG_THAY();
      if (!coQuyenLo(staff, lo.source)) return KHONG_QUYEN();
      if (!(await getEffectiveServices(env.DB, [ma])).has(ma)) return error(400, "invalid_input", "Dịch vụ không có trong danh mục.");
      const at = new Date().toISOString();
      try {
        await env.DB.batch([
          cauSuaMaTour(env.DB, loId, ma, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "ve_sua_ma_tour", at, targetType: "ve", targetId: ma, detail: `Sửa dịch vụ của lô vé · ${NHAN_NHOM_LO[lo.pax_group as keyof typeof NHAN_NHOM_LO]}` }, "changes() > 0"),
        ]);
      } catch (e) {
        if (e instanceof Error && /vdt_one_way/.test(e.message)) return error(409, "batch_in_use", "Lô này đã có vé được giữ chỗ cho đơn nên không đổi dịch vụ được. Hãy vô hiệu lô và nhập lại.");
        throw e;
      }
      return json({ loId, catalogCode: ma });
    }),

    // DANH SÁCH VÉ CỦA ĐƠN (ADR-0153 Đ3): CHỈ số lượng theo nhóm khách (cần / đang giữ / thiếu) và cờ «đã thu đủ» — không ảnh, không mã. Theo ô `order.view` nên Kế toán cũng thấy.
    // Thứ tự: mã đơn → chủ đơn (view công bố của orders; không có ⇒ 404) → `can` (không đủ quyền ⇒ cùng 404, không lộ đơn có tồn tại) → dịch vụ + số khách hiệu lực → đếm vé giữ.
    route("GET", "/api/ve/don/:orderId", "orders", async ({ env, staff, params, isAssigned, dichVuChoVe, tienDonVe }) => {
      { const chan = chanNeuKhongCoO(staff, true); if (chan) return chan; }
      const orderId = params.orderId!;
      if (!UUID_RE.test(orderId)) return DON_KHONG_THAY();
      const [chu, assigned] = await Promise.all([docChuDon(env.DB, orderId), isAssigned(orderId)]);
      if (chu === null || !can(staff, "order.view", { ownerId: chu, assigned })) return DON_KHONG_THAY();
      // ADR-0170 Đ1 mục 4: cổng `orders` cho cả FIELD, INTERN đi qua và `order.view` của họ ≠ none — chỉ văn phòng hoặc người có ô gửi vé trên đơn này được xem tiếp.
      if (!isOffice(staff) && !can(staff, "ve.cap.send", { ownerId: chu, assigned })) return KHONG_QUYEN_GUI();
      const dv = await dichVuChoVe(orderId);
      const homNay = vnToday(new Date());
      const dichVu = [];
      for (const d of dv) {
        const can_ = canVe(d.pax);
        const giu = await veDangGiu(env.DB, d.serviceId);
        // ADR-0174 Đ3, Đ7: chỉ dịch vụ Có vé, ngày đi chưa qua mới báo thiếu. Còn lại chỉ hiện vé đang giữ (nếu có).
        const baoThieu = d.coVe && d.ngayDi >= homNay;
        const nhom = (["ADULT", "CHILD", "SENIOR"] as const).filter((n) => (baoThieu && can_[n] > 0) || giu[n] > 0).map((n) => ({ nhom: n, nhan: NHAN_NHOM[n], can: can_[n], giu: giu[n], thieu: baoThieu ? Math.max(0, can_[n] - giu[n]) : 0 }));
        dichVu.push({ serviceId: d.serviceId, catalogCode: d.catalogCode, nhom });
      }
      const duongDan = (await docLinkCuaDon(env.DB, orderId)).map((l) => ({ id: l.id, hetHan: l.expires_at, daThuHoi: l.revoked_at !== null, luotMo: l.opened_count })); // KHÔNG token (chỉ lưu băm)
      const tien = await tienDonVe(orderId);
      const du = veMoDuoc(tien, false); // mở được MỌI vé (đơn Trả sau quá hạn còn nợ ⇒ false, chỉ vé đã mở xem được)
      // Mã phân bổ (KHÔNG phải mã vé) để giao diện gọi route ảnh — chỉ khi người xem có ô gửi vé VÀ vé mở được; route ảnh vẫn kiểm lại cả hai.
      const coQuyenGui = can(staff, "ve.cap.send", { ownerId: chu, assigned });
      const veXem = coQuyenGui && (du || veMoDuoc(tien, true)) ? (await docPhanBoMoKemLo(env.DB, orderId, null)).filter((p) => du || p.lo).map((p, i) => ({ id: p.id, stt: i + 1 })) : [];
      return json({ dichVu, thuDu: du, choDoiTacNop: choDoiTacNop(tien), nguoiXemLaDoiTac: holdsPartner(staff), traSauQuaHan: !!tien?.traSau && !du, duongDan, veXem });
    }),

    // ẢNH VÉ (ADR-0153 Đ3): chỉ khi đơn THU ĐỦ. Thứ tự cố định (bài khoá thứ tự ở xem-giao-ve.test.ts): sec-fetch-site → kho → mã → phân bổ → chủ đơn → `can(ve.cap.send)` → thu đủ
    // → NHẬT KÝ + đóng dấu «đã lộ» (một lô) → mới đọc kho. Mọi cách hỏng trước nhật ký ⇒ không đọc kho. Đóng dấu `revealed_at` ngay lần đầu để vé đã lộ không bao giờ về kho (Đ1 mục 6).
    route("GET", "/api/ve/anh/:allocationId", "orders", async ({ request, env, staff, params, isAssigned, tienDonVe }) => {
      { const chan = chanNeuKhongCoO(staff); if (chan) return chan; }
      const sfs = request.headers.get("sec-fetch-site");
      if (sfs !== null && sfs !== "same-origin" && sfs !== "none") return error(403, "forbidden", "Không mở ảnh vé từ trang khác.");
      const kho = env.VE_DIEN_TU;
      if (!kho) return KHO_CHUA_BAT();
      const id = params.allocationId!;
      if (!MA_PHAN_BO.test(id)) return VE_KHONG_THAY();
      const pb = await docPhanBoDeXem(env.DB, id);
      if (!pb) return VE_KHONG_THAY();
      const [chu, assigned] = await Promise.all([docChuDon(env.DB, pb.order_id), isAssigned(pb.order_id)]);
      if (chu === null) return VE_KHONG_THAY();
      if (!can(staff, "ve.cap.send", { ownerId: chu, assigned })) return KHONG_QUYEN_GUI();
      const tien = await tienDonVe(pb.order_id);
      if (!veMoDuoc(tien, pb.revealed_at !== null)) return CHUA_MO_VE(tien, holdsPartner(staff));
      const at = new Date().toISOString();
      await env.DB.batch([
        auditStatement(env.DB, { staffId: staff.id, action: "ve_xem_anh", at, orderId: pb.order_id, targetType: "ve", targetId: pb.order_service_id, detail: `Xem ảnh vé số ${pb.slot_no}` }),
        cauDanhDauLo(env.DB, pb.id, at, staff.id),
      ]);
      // Lệnh huỷ có thể chen vào giữa lúc đọc phân bổ và lúc đóng dấu: đã trả về kho thì dấu không ghi được và vé sẽ cấp cho khách khác — KHÔNG đọc kho, 404.
      if (!(await phanBoConGiu(env.DB, pb.id))) return VE_KHONG_THAY();
      const obj = await kho.get(pb.storage_key);
      if (!obj) {
        console.error(JSON.stringify({ level: "error", event: "ve_dien_tu_thieu_doi_tuong", allocId: pb.id }));
        return VE_KHONG_THAY();
      }
      return new Response(obj.body, { status: 200, headers: dauPhanHoiTepChung({ id: pb.id, loai: loaiTuMime(pb.content_kind), tenDau: "ve" }) });
    }),

    // GIAO VÉ (kênh Zalo; ADR-0153 Đ3): ghi MỖI vé một lần giao + đóng dấu «đã lộ» + một dòng nhật ký (số lượng). `requestId` do giao diện sinh mỗi lần bấm: bấm đúp cùng mã thì
    // `INSERT OR IGNORE` bỏ qua và nhật ký (gác `changes() > 0`) không ghi lần hai. Phản hồi chỉ có SỐ vé, không mã. Việc gửi tin Zalo là của nhân viên (ảnh lấy từ route ảnh).
    route("POST", "/api/ve/giao", "orders", async ({ env, request, staff, isAssigned, tienDonVe }) => {
      { const chan = chanNeuKhongCoO(staff); if (chan) return chan; }
      const raw = await readJson(request);
      const orderId = typeof raw?.orderId === "string" ? raw.orderId : "";
      const requestId = typeof raw?.requestId === "string" ? raw.requestId : "";
      const serviceId = typeof raw?.serviceId === "string" ? raw.serviceId : null;
      if (!UUID_RE.test(orderId) || !UUID_RE.test(requestId) || (serviceId !== null && !UUID_RE.test(serviceId))) return BAD_JSON();
      const [chu, assigned] = await Promise.all([docChuDon(env.DB, orderId), isAssigned(orderId)]);
      if (chu === null) return DON_KHONG_THAY();
      if (!can(staff, "ve.cap.send", { ownerId: chu, assigned })) return KHONG_QUYEN_GUI();
      const tien = await tienDonVe(orderId);
      const dsLo = await docPhanBoMoKemLo(env.DB, orderId, serviceId);
      if (!veMoDuoc(tien, dsLo.length > 0 && dsLo.every((p) => p.lo))) return CHUA_MO_VE(tien, holdsPartner(staff));
      const ds = dsLo.map((p) => p.id);
      if (ds.length === 0) return json({ daGiao: 0 });
      const at = new Date().toISOString();
      const cau: D1PreparedStatement[] = [];
      ds.forEach((a, i) => {
        cau.push(cauChenGiao(env.DB, { id: `${requestId}:${a}`, allocId: a, by: staff.id, at, kenh: "ZALO" }));
        if (i === 0) cau.push(auditStatement(env.DB, { staffId: staff.id, action: "ve_giao", at, orderId, targetType: "ve", targetId: serviceId ?? orderId, detail: `Giao ${ds.length} vé qua Zalo` }, "changes() > 0"));
        cau.push(cauDanhDauLo(env.DB, a, at, staff.id));
      });
      await env.DB.batch(cau);
      return json({ daGiao: ds.length });
    }),

    // CẤP BÙ BẰNG TAY (ADR-0153 Đ1 mục 3, đường «nhân viên bấm Cấp vé»): đơn bị thiếu vé (kho cạn lúc xác nhận, hoặc tiến trình chết giữa chừng) được giữ lại theo số khách hiệu lực.
    // Cùng hàm cấp sau xác nhận (chạy lại bao nhiêu lần cũng không giữ thừa; lỗi nuốt). Cần ô `ve.cap.send` trên đơn; chỉ đơn đã xác nhận (view trạng thái của orders).
    route("POST", "/api/ve/cap", "orders", async ({ env, request, staff, isAssigned, capVeSauXacNhan }) => {
      { const chan = chanNeuKhongCoO(staff); if (chan) return chan; }
      const raw = await readJson(request);
      const orderId = typeof raw?.orderId === "string" ? raw.orderId : "";
      if (!UUID_RE.test(orderId)) return BAD_JSON();
      const [chu, assigned] = await Promise.all([docChuDon(env.DB, orderId), isAssigned(orderId)]);
      if (chu === null) return DON_KHONG_THAY();
      if (!can(staff, "ve.cap.send", { ownerId: chu, assigned })) return KHONG_QUYEN_GUI();
      if ((await docTrangThaiDon(env.DB, orderId)) !== "confirmed") return error(409, "order_not_confirmed", "Chỉ cấp vé cho đơn đã xác nhận.");
      await capVeSauXacNhan(orderId);
      return json({ ok: true });
    }),

    // TẠO ĐƯỜNG DẪN CHO KHÁCH (ADR-0153 Đ2): chỉ khi đơn thu đủ và đã có vé. Token trả ĐÚNG MỘT LẦN, D1 chỉ lưu băm. Hạn = ngày dùng cuối của vé + 7 ngày. Đường dẫn là lộ vé ra ngoài
    // vĩnh viễn nên đóng dấu «đã lộ» cho mọi vé của đơn ngay lúc tạo (vé đã lộ không bao giờ về kho). Một lô: đường dẫn → nhật ký (chỉ số vé + hạn) → dấu lộ từng vé.
    route("POST", "/api/ve/duong-dan", "orders", async ({ env, request, staff, isAssigned, tienDonVe }) => {
      { const chan = chanNeuKhongCoO(staff); if (chan) return chan; }
      const raw = await readJson(request);
      const orderId = typeof raw?.orderId === "string" ? raw.orderId : "";
      if (!UUID_RE.test(orderId)) return BAD_JSON();
      const [chu, assigned] = await Promise.all([docChuDon(env.DB, orderId), isAssigned(orderId)]);
      if (chu === null) return DON_KHONG_THAY();
      if (!can(staff, "ve.cap.send", { ownerId: chu, assigned })) return KHONG_QUYEN_GUI();
      const tien = await tienDonVe(orderId);
      const [den, dsLo] = await Promise.all([docHanCuoiCuaDon(env.DB, orderId), docPhanBoMoKemLo(env.DB, orderId, null)]);
      if (!veMoDuoc(tien, dsLo.length > 0 && dsLo.every((p) => p.lo))) return CHUA_MO_VE(tien, holdsPartner(staff));
      const ds = dsLo.map((p) => p.id);
      if (den === null || ds.length === 0) return error(409, "chua_co_ve", "Đơn chưa được giữ vé nào nên chưa tạo được đường dẫn cho khách.");
      const token = taoToken();
      const hetHan = hanDuongDan(den);
      const at = new Date().toISOString();
      const id = crypto.randomUUID();
      await env.DB.batch([
        cauChenLink(env.DB, { id, orderId, bam: await bamToken(token), hetHan, at, by: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "ve_tao_duong_dan", at, orderId, targetType: "ve", targetId: orderId, detail: `Tạo đường dẫn vé cho khách · ${ds.length} vé · hạn ${hetHan.slice(0, 10)}` }),
        ...ds.map((a) => cauDanhDauLo(env.DB, a, at, staff.id)),
      ]);
      return json({ id, duongDan: `/ve/${token}`, hetHan });
    }),

    route("POST", "/api/ve/duong-dan/:id/thu-hoi", "orders", async ({ env, staff, params, isAssigned }) => {
      { const chan = chanNeuKhongCoO(staff); if (chan) return chan; }
      const id = params.id!;
      if (!UUID_RE.test(id)) return VE_KHONG_THAY();
      const link = await docLinkTheoId(env.DB, id);
      if (!link) return VE_KHONG_THAY();
      const [chu, assigned] = await Promise.all([docChuDon(env.DB, link.order_id), isAssigned(link.order_id)]);
      if (chu === null) return VE_KHONG_THAY();
      if (!can(staff, "ve.cap.send", { ownerId: chu, assigned })) return KHONG_QUYEN_GUI();
      const at = new Date().toISOString();
      await env.DB.batch([
        cauThuHoiLink(env.DB, id, at, staff.id),
        auditStatement(env.DB, { staffId: staff.id, action: "ve_thu_hoi_duong_dan", at, orderId: link.order_id, targetType: "ve", targetId: link.order_id, detail: "Thu hồi đường dẫn vé của khách" }, "changes() > 0"),
      ]);
      return json({ ok: true });
    }),

    // HAI ROUTE CÔNG KHAI CHỈ ĐỌC (ADR-0153 Đ2). Cùng một khuôn: giới hạn tốc độ (đặt chỗ TRƯỚC khi tra; thành công thì trả chỗ nên chỉ lần SAI mới tính) → tra theo BĂM token
    // → so băm hằng thời gian → hạn / thu hồi. Sai, hết hạn, thu hồi, vé ngoài khoảng: CÙNG một 404 (cùng thân, cùng đầu). Trang không script, không tên khách / mã đơn / giá / mã vé.
    // ADR-0171 Đ2: vé ĐÃ có dấu lộ thì khách vẫn xem như cũ (không tắt đường dẫn đã gửi); vé CHƯA có dấu chỉ hiện và chỉ trả ảnh khi cổng tiền của đơn đạt (`veMoDuoc` trên `tienDonVe`: Trả trước phải thu đủ, Trả sau trong hạn mở trước). Không đọc được tiền ⇒ chưa đạt. SỐ THỨ TỰ vé (`slot`) tính trên DANH SÁCH ĐỦ vé đang giữ rồi mới lọc: lọc không được làm dồn số, vé hiện thêm không làm đổi số vé cũ.
    route("GET", "/ve/:token", "public", async ({ env, request, params, tienDonVe }) => {
      const kq = await mocDuongDanKhach(env, request, params.token!);
      if (kq.loi) return kq.loi;
      const ve = await docVeCuaLink(env.DB, kq.link.order_id);
      if (ve.length === 0) return khongThayDuongDan();
      const duTien = ve.some((v) => v.revealed_at === null) ? veMoDuoc(await tienDonVe(kq.link.order_id), false) : true;
      const hien = ve.map((v, i) => ({ v, slot: i + 1 })).filter((x) => duTien || x.v.revealed_at !== null);
      const at = new Date().toISOString();
      await env.DB.batch([cauDemMoLink(env.DB, kq.link.id, at), ...hien.map((x) => cauDanhDauLo(env.DB, x.v.id, at, null))]);
      await kq.tra();
      const html = trangVeKhach(params.token!, hien.map((x) => ({ slot: x.slot, nhom: x.v.pax_group as "ADULT" | "CHILD" | "SENIOR", tuNgay: x.v.valid_from, denNgay: x.v.valid_to })), ve.length - hien.length);
      return new Response(html, { status: 200, headers: { ...DAU_KHACH, "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" } });
    }),

    route("GET", "/api/ve-khach/:token/anh/:slot", "public", async ({ env, request, params, tienDonVe }) => {
      const kho = env.VE_DIEN_TU;
      if (!kho) return khongThayDuongDan();
      const kq = await mocDuongDanKhach(env, request, params.token!);
      if (kq.loi) return kq.loi;
      const slot = /^[1-9][0-9]{0,2}$/.test(params.slot!) ? Number(params.slot) : 0;
      const ve = await docVeCuaLink(env.DB, kq.link.order_id);
      const v = slot >= 1 ? ve[slot - 1] : undefined;
      if (!v) return khongThayDuongDan();
      if (v.revealed_at === null && !veMoDuoc(await tienDonVe(kq.link.order_id), false)) return khongThayDuongDan(); // ADR-0171 Đ2: vé chưa mở + cổng tiền chưa đạt ⇒ 404 TRƯỚC nhật ký, dấu lộ và kho
      const at = new Date().toISOString();
      await env.DB.batch([cauDanhDauLo(env.DB, v.id, at, null)]);
      const obj = await kho.get(v.storage_key);
      if (!obj) return khongThayDuongDan();
      await kq.tra();
      return new Response(obj.body, { status: 200, headers: { ...dauPhanHoiTepChung({ id: v.id, loai: loaiTuMime(v.content_kind), tenDau: "ve" }) } });
    }),
  ],
};
