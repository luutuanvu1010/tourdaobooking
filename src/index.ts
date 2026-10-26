// Gốc lắp ráp: danh sách module + nối auth vào router + Cron. Thêm module mới = thêm một dòng vào `modules`.
// Đây cũng là nơi TIÊM hàm nối chéo module (ADR-0007 điều 4(b)): `orders` cần biết "người dùng có phải người phụ trách đơn", cần câu "mở người phụ trách do
// người lập CHỌN cho đơn mới" (ADR-0030 S20-4 — đơn mới không bao giờ tự gắn người lập), cần biết "trong các đơn này đơn nào đang có người" và "đơn nào tôi
// đang phụ trách" (ADR-0030 S20-13) nhưng KHÔNG được import `dispatch` (dispatch → orders là chiều được phép, chiều ngược lại sẽ thành vòng) và không đọc view
// `v_dsp_*` của nó. Router chỉ chuyển chúng vào `ctx`.
// `parties` cần biết hồ sơ gắn tài khoản nào (ADR-0013) nhưng KHÔNG được import `staff` — tiêm `partyAccount`.
// GỘP HỒ SƠ (ADR-0068): parties nhận "việc đang mở", đơn theo người đặt, câu đổi người đặt, số dòng nợ, SĐT đăng nhập qua ctx.gopHoSo — không cạnh phụ thuộc mới.
// BẢNG TIN (ADR-0022): module `bangtin` là lá, không đọc cơ sở dữ liệu (KHONG_DB) — gốc lắp ráp đọc mã đơn/người lập (`orders`) + người phụ trách
// (`dispatch`), tính nhãn người nhận (`nhanSuKien`) rồi đưa cho `phatDon`. Đây cũng là NƠI DUY NHẤT nạp lớp Durable Object `BangTin` (`tram.ts`) —
// wrangler cần lớp đó được export từ tệp chính.
// WEB PUSH (ADR-0036): cũng ở `baoThayDoi` gốc lắp ráp gõ cửa màn hình khoá (`dayGoCua` của `thongbao`) độc lập với phát Bảng tin; `thongbao` giao lô
// cho trạm qua hàm tiêm `giaoLoDay` (không cạnh thongbao → bangtin); `dongBangTin` còn tắt máy nhận của tài khoản vừa đổi (mọi máy / trừ máy mới / chỉ máy của phiên bị gỡ).
// TIN CHUYẾN (ADR-0052 D6): route van-chuyen gọi `ctx.baoThayDoiChuyen` sau lô thành công; gốc lắp ráp đọc hành động theo requestId (van-chuyen), phát Bảng tin
// chuyến (nhóm `dieu-xe` + tài xế có dòng lái lúc sự kiện) và gõ cửa tin chuyến (`dayGoCua` với `{ chuyen }`); hộp thông báo đọc dữ kiện qua `ctx.chuyenChoTin`.

import { accountsModule } from "./modules/accounts";
import { auditModule } from "./modules/audit";
import { anDanhPhienCuaTaiKhoanStatement, authModule, checkAuthConfig, currentStaff } from "./modules/auth";
import { bangtinModule, dongCua, phatChuyen, phatDon, xepHangDay } from "./modules/bangtin";
import { billingModule, nhapKeToanCuaDon, soDongNoCuaNguoi } from "./modules/billing";
import { receiptModule } from "./modules/receipt";
import { catalogModule, runScheduledSync } from "./modules/catalog";
import { companyModule } from "./modules/company";
import { dispatchModule, handledOrderIdsOf, handlerOf, isOrderHandler, newOrderHandler, ordersWithHandler, soDonDangPhuTrachCua } from "./modules/dispatch";
import { giaoDienModule } from "./modules/giao-dien";
import { checkLanGuiConfig, lanGuiNoi } from "./modules/lan-gui";
import { locationsModule } from "./modules/locations";
import { feedbackModule } from "./modules/feedback";
import { maintenanceBlock, maintenanceModule, type MaintenanceState } from "./modules/maintenance";
import { hanGiuPhienNgay, partiesModule } from "./modules/parties";
import { nguoiHuongCuaHoSo, pricingModule } from "./modules/pricing";
import { cauDoiNguoiDat, donCuaNguoiDat, findOrderRef, ordersModule } from "./modules/orders";
import { accountOfParty, listStaffAccounts, nhanNhanVienTheoId, soDangNhapTheoHoSo, taiKhoanChoXacMinh } from "./modules/staff";
import { dayGoCua, dayGoCuaDoi, dongChuyenTheoId, tatMayCuaCacPhienStatement, tatMayCuaPhienStatement, tatMayStatement, tatMayTruPhienStatement, thongbaoModule } from "./modules/thongbao";
import { troLyModule } from "./modules/tro-ly";
import { chuyenChoTinTheoId, dongBoChuyenChoDon, mocToiThieuHienHanh, nguongHetHanHienHanh, suKienTheoYeuCau, vanChuyenModule, viecXeCuaNguoi } from "./modules/van-chuyen";
import { HANDLER_TRUOC_KHONG_BIET, nhanSuKien, nhanSuKienChuyen } from "./shared/bang-tin";
import { dangChayLucSuKien, dongCoTheSinhTin, taiXeNhanSuKien, thayDoiCuaHanhDongChuyen } from "./shared/tin-chuyen";
import { hanhDongCuaThayDoi, khoaVapid } from "./shared/web-push";
import { holdsPartner } from "./shared/permissions";
import { createApp, type AppOptions } from "./shared/router";

export { BangTin } from "./modules/bangtin/tram";

/**
 * Gộp kết quả `allSettled` của các việc ĐỘC LẬP (đặt tên): một lỗi → ném lại chính nó; nhiều lỗi → một Error có `name` = "tram:<tên lỗi>; day:<tên lỗi>"
 * (router chỉ ghi `name` vào dòng `bang_tin_loi` — biết nửa nào hỏng, không lộ nội dung lỗi). Không nuốt lỗi.
 */
async function nemNeuLoi(viec: [string, Promise<unknown> | null][]): Promise<void> {
  const kq = await Promise.allSettled(viec.map(([, p]) => p));
  const loi = kq.flatMap((r, i) => (r.status === "rejected" ? [[viec[i]![0], r.reason] as const] : []));
  if (loi.length === 1) throw loi[0]![1];
  if (loi.length > 1) {
    const e = new Error(loi.map(([ten, r]) => `${ten}:${r instanceof Error ? r.name : "unknown"}`).join("; "));
    e.name = e.message;
    throw e;
  }
}

const APP_OPTIONS: AppOptions = {
  modules: [authModule, accountsModule, ordersModule, dispatchModule, billingModule, pricingModule, receiptModule, catalogModule, auditModule, locationsModule, partiesModule, companyModule, maintenanceModule, giaoDienModule, feedbackModule, bangtinModule, thongbaoModule, vanChuyenModule, troLyModule],
  currentStaff,
  // Cấu hình bắt buộc: khoá phiên (auth) VÀ khoá HMAC của lớp vé (lan-gui, ADR-0094 đ4) — mỗi module kiểm khoá của mình; thiếu một ⇒ mọi API 500.
  checkConfig: (env) => checkAuthConfig(env) ?? checkLanGuiConfig(env),
  injected: {
    isAssigned: (env, staffId, orderId) => isOrderHandler(env.DB, staffId, orderId),
    newOrderHandler: (env, actor, staffId) => newOrderHandler(env.DB, actor.id, staffId),
    ordersWithHandler: (env, orderIds) => ordersWithHandler(env.DB, orderIds),
    handledOrderIdsOf: (env, staffId) => handledOrderIdsOf(env.DB, staffId),
    maintenanceBlock: (env, staff, truoc) => maintenanceBlock(env.DB, () => staff.permissions, truoc as MaintenanceState | undefined), // ADR-0071 điều 3a: theo QUYỀN của phiên, không theo SĐT
    partyAccount: (env, staff, partyId) => accountOfParty(env.DB, staff, partyId),
    // BẢNG TIN (ADR-0022). Router gọi bắn-và-quên (exec.waitUntil + bắt lỗi → một dòng `bang_tin_loi`): việc phát được BẮT ĐẦU ở một microtask ngay khi route gọi, chạy SONG SONG
    // với việc dựng phản hồi HTTP nên khung tin có thể tới trình duyệt TRƯỚC hoặc SAU phản hồi của chính thao tác đó; lỗi ở đây không làm hỏng/chậm thao tác ghi (DP-3). `_actor` (người vừa thao tác) giữ trong chữ ký cho Web Push giai đoạn sau — KHÔNG đưa vào sự kiện (điều 4: đúng 5 khoá).
    baoThayDoi: async (env, actor, e, batDau) => {
      // Kiểm TRƯỚC hai lần đọc D1: không trạm VÀ không khoá gõ cửa (khung thử, e2e) → không đọc gì.
      if (!env.BANG_TIN && !khoaVapid(env)) return;
      const [ref, handlerSau] = await Promise.all([findOrderRef(env.DB, e.orderId), handlerOf(env.DB, e.orderId)]);
      if (!ref) return;
      // Đơn mới mà không ai phụ trách (người lập không chọn ai — ADR-0030 S20-4 — hoặc không đủ điều kiện: Đối tác, chưa có hồ sơ) → loại sự kiện
      // riêng (màn hình làm mới); ADR-0045: lưu nháp KHÔNG thông báo nổi / gõ cửa ai — tin "chờ nhận" nảy ra lúc xác nhận (luật ở src/shared/thong-bao.ts).
      const thayDoi = e.thayDoi === "tao" && !handlerSau.coNguoi ? "tao_cho_nhan" : e.thayDoi;
      // ADR-0030 S20-8/9: route không tự đọc lại trạng thái trước khi ghi (chỉ `PUT .../handler` mới truyền `e.handlerTruoc` thật) mặc định
      // là "KHÔNG BIẾT" — hằng dùng chung `HANDLER_TRUOC_KHONG_BIET` (`null`), KHÔNG PHẢI "chưa ai phụ trách": coi nhầm thành "chưa ai" làm
      // `nhanSuKien` gắn `cho-nhan` sai cho đơn ĐÃ có người, lộ tin sang mọi HDV khác (xem chú thích `nhanSuKien`). KHÔNG viết tay giá trị
      // mặc định ở đây: bài hàng rào "(2)" ở `src/shared/bang-tin.test.ts` đọc chính dòng này và đỏ nếu đối số khác `e.handlerTruoc ?? HANDLER_TRUOC_KHONG_BIET`.
      const luc = new Date().toISOString();
      const action = hanhDongCuaThayDoi(thayDoi);
      // ADR-0062 Đ4 + ADR-0052 D6.2 MQ-07: lệnh báo "chuyen" (chuyến / chặng / đặt gấp) hay "tien" (số khách, sổ tiền) → gõ cửa theo DÒNG ĐỔI mà CHÍNH request
      // này ghi (đọc lại từ v_aud_order_change qua thongbao, của người này trên đơn, ghi từ `batDau` — mốc router chụp trước handler). Lệnh không ghi dòng đổi
      // (ghi khoản thu, đặt gấp, số khách y nguyên) → không có dòng → không gõ cửa. Route KHÔNG truyền chữ nhật ký qua ctx, nên sự kiện Bảng tin vẫn đúng id +
      // loại; cùng hàm locHopThongBao với hộp thư (mỗi người tối đa một tin: MQ-07 hoặc tin đơn đổi). Câu trên màn hình khoá do GET …/moi-nhat đọc lại từ hộp thư.
      const tinDoi = action === null && (thayDoi === "chuyen" || thayDoi === "tien") && khoaVapid(env) !== null;
      // Hai việc ĐỘC LẬP: trạm lỗi thì vẫn gõ cửa, và ngược lại.
      await nemNeuLoi([
        ["tram", phatDon(
          env,
          { loai: "don", orderId: e.orderId, maDon: ref.orderCode, thayDoi, luc },
          nhanSuKien({ ownerId: ref.staffId, handlerTruoc: e.handlerTruoc ?? HANDLER_TRUOC_KHONG_BIET, handlerSau, laNhap: ref.status === "draft" }), // ADR-0135 Đ4: tin của nháp chỉ tới người lập
        )],
        ["day", tinDoi ? dayGoCuaDoi(env, e.orderId, actor.id, batDau, (q) => chuyenChoTinTheoId(env.DB, q), (ds) => xepHangDay(env, ds)) : action === null ? null : dayGoCua(env, {
          don: {
            id: "day", orderId: e.orderId, maDon: ref.orderCode, action, actorId: actor.id, tenNguoiLam: null, luc, ownerId: ref.staffId,
            phuTrach: handlerSau, lapChuaCoNguoi: thayDoi === "tao_cho_nhan", cungLoLap: false, laNhap: ref.status === "draft",
          },
          quanTrong: false,
        }, (ds) => xepHangDay(env, ds))],
      ]);
    },
    // TIN CHUYẾN (ADR-0052 D6.3, D6.4). Bảng tin: MỌI lệnh chuyến (màn đang mở tự tải lại) — chuyến nguồn và chuyến liên quan (dời khách); gõ cửa: chỉ
    // hành động sinh tin (HANH_DONG_TIN_CHUYEN). Hai việc độc lập. Kiểm TRƯỚC mọi lần đọc D1: không trạm VÀ không khoá gõ cửa (khung thử, e2e) → thôi.
    baoThayDoiChuyen: async (env, _actor, e) => {
      if (!env.BANG_TIN && !khoaVapid(env)) return;
      const ev = await suKienTheoYeuCau(env.DB, e.requestId);
      if (!ev || (ev.tripId !== e.tripId && ev.relatedTripId !== e.tripId)) return;
      const noi = (q: { tripIds: readonly string[]; suKienIds: readonly string[] }) => chuyenChoTinTheoId(env.DB, q);
      const tripIds = ev.relatedTripId ? [ev.tripId, ev.relatedTripId] : [ev.tripId];
      // Một lần gọi dữ kiện chuyến cho cả dòng nhật ký lẫn chuyến liên quan (vòng sửa 1, V1).
      const [kq, taiKhoan] = await Promise.all([dongChuyenTheoId(env.DB, ev.id, noi, tripIds), listStaffAccounts(env.DB)]);
      if (!kq) return;
      const { dong, f } = kq;
      const dangHoatDong = taiKhoan.filter((s) => s.active);
      const thayDoi = thayDoiCuaHanhDongChuyen(dong.action, dangChayLucSuKien(dong)); // Đợt 5: đổi khi xe đang chạy → "xe_chay"
      await nemNeuLoi([
        ["tram", Promise.all(f.chuyen.map((c) => phatChuyen(env, { loai: "chuyen", maChuyen: c.ma, thayDoi, luc: dong.luc }, nhanSuKienChuyen(taiXeNhanSuKien(dangHoatDong, c.lai, dong.luc)))))],
        // Phiếu kiểm D1 CAO-3: xếp / rút / dời KHÔNG khẩn cấp không sinh tin cho ai — không gõ cửa (không đọc máy nhận, tài khoản).
        ["day", dongCoTheSinhTin(dong) ? dayGoCua(env, { chuyen: dong, quanTrong: false }, (ds) => xepHangDay(env, ds)) : null],
      ]);
    },
    // Đóng kết nối Bảng tin (mọi lần gọi) + tắt mọi máy nhận thông báo điện thoại của tài khoản đó CHỈ khi `tatThongBao` (ADR-0046: thao tác bảo
    // mật; đổi vai/quyền không tắt — thay ADR-0036 điều 6). Chạy cả khi không có trạm. "tat-ca" (bật bảo trì) KHÔNG tắt máy.
    // Nhánh theo PHIÊN (ADR-0075 điều 6, đăng nhập tài khoản một máy): trạm chỉ nhận `{ sessionIds }` — KHÔNG kèm staffId (trạm đóng theo staffId là đóng
    // luôn máy mới); tắt mọi máy nhận của tài khoản trừ máy mang phiên mới (`giuPhien`), lý do bi-thay. Hai việc độc lập.
    // Nhánh CHỈ PHIÊN (ADR-0075 điều 6b, IT/Toàn quyền gỡ phiên): trạm chỉ nhận `{ sessionIds }`; tắt CHỈ máy nhận mang đúng các phiên đó, lý do bi-go.
    // Phải xét TRƯỚC nhánh "sessionIds" (dạng này cũng có sessionIds; lọt xuống dưới là giuPhien undefined ⇒ tắt mọi máy).
    dongBangTin: async (env, muc) => {
      // ADR-0085 Q3 — danh sách phiên do lưu chính sách: xét TRƯỚC mọi nhánh khác (không có staffId; khoá riêng phienKetThuc).
      if (typeof muc === "object" && "phienKetThuc" in muc) {
        if (muc.phienKetThuc.length === 0) return;
        await nemNeuLoi([
          ["tram", dongCua(env, { sessionIds: muc.phienKetThuc })],
          ["tat-may", tatMayCuaCacPhienStatement(env.DB, muc.phienKetThuc, new Date().toISOString()).run()],
        ]);
        return;
      }
      if (typeof muc === "object" && "chiPhien" in muc) {
        await nemNeuLoi([
          ["tram", dongCua(env, { sessionIds: muc.sessionIds })],
          ["tat-may", tatMayCuaPhienStatement(env.DB, muc.staffId, muc.sessionIds, new Date().toISOString()).run()],
        ]);
        return;
      }
      if (typeof muc === "object" && "sessionIds" in muc) {
        await nemNeuLoi([
          ["tram", dongCua(env, { sessionIds: muc.sessionIds })],
          ["tat-may", tatMayTruPhienStatement(env.DB, muc.staffId, muc.giuPhien, new Date().toISOString()).run()],
        ]);
        return;
      }
      await nemNeuLoi([
        ["tram", dongCua(env, muc)],
        // updated_by = NULL (hệ thống): tắt kèm khi tài khoản đổi — người làm thay đổi đó có trong audit_log của chính thao tác.
        ["tat-may", typeof muc === "object" && muc.tatThongBao ? tatMayStatement(env.DB, muc.staffId, null, "tai-khoan-doi", new Date().toISOString(), null).run() : null],
      ]);
    },
    giaoLoDay: (env, ds) => xepHangDay(env, ds),
    // MỐC TỐI THIỂU (ADR-0049 D2, I25): `orders` không đọc bảng vc_ — gốc lắp ráp là NƠI DUY NHẤT gọi hàm công bố của van-chuyen (TC-26, A12 quét nơi gọi).
    mocToiThieu: (env) => mocToiThieuHienHanh(env.DB),
    // ĐỒNG BỘ CHUYẾN THEO ĐƠN (ADR-0104 Đ2.1): orders / dispatch không import van-chuyen — gốc lắp ráp là NƠI DUY NHẤT gọi hàm công bố (bài siết architecture.test.ts).
    // `env` ở đây là env BỌC của lệnh (router truyền envH): câu chuyến đi vào CHÍNH lô của lệnh đơn. Không gọi hàm hẹp của orders (src/CLAUDE.md, phán quyết G10).
    dongBoChuyen: (env, actor, x) => dongBoChuyenChoDon(env.DB, actor, x),
    // TIN CHUYẾN (ADR-0052 D6.3): thongbao không đọc bảng vc_ — gốc lắp ráp là NƠI DUY NHẤT gọi hàm công bố của van-chuyen (bài siết architecture.test.ts).
    chuyenChoTin: (env, q) => chuyenChoTinTheoId(env.DB, q),
    // MỐC SẮP HẾT HẠN (ADR-0040 D1, GB2/R23): parties không đọc bảng vc_ — gốc lắp ráp là NƠI DUY NHẤT gọi hàm công bố của van-chuyen.
    nguongHetHan: (env) => nguongHetHanHienHanh(env.DB),
    // NHÃN NGƯỜI BẤM (ruling R-P20): van-chuyen không import staff — gốc lắp ráp gọi hàm công bố của staff (chỉ tên hiển thị).
    nhanNhanVien: (env, ids) => nhanNhanVienTheoId(env.DB, ids),
    // XÁC MINH PHIẾU TỰ KHAI (ADR-0125 đ3, đ5): parties không import staff — gốc lắp ráp tiêm MỘT truy vấn đọc mọi tài khoản (id, quyền hiện hiệu lực, hoạt động, hồ sơ).
    taiKhoanXacMinh: (env) => taiKhoanChoXacMinh(env.DB),
    // ẨN DANH SỔ PHIÊN (ADR-0126 đ8): parties không import auth / accounts không import parties — gốc lắp ráp tiêm câu của auth và số ngày giữ (chính sách riêng tư) của parties.
    cauAnDanhPhien: (env, staffId, at, by) => anDanhPhienCuaTaiKhoanStatement(env.DB, staffId, at, by),
    hanGiuPhienNgay: (env) => hanGiuPhienNgay(env.DB),
    // BÊN ĐẶT MÁY CHỦ ÉP (sổ đại lý đợt 1, Task 11 — Ruling 21): `auth` không import `pricing` (không nới ALLOWED_EDGES) — gốc lắp ráp là NƠI DUY NHẤT nối. Chỉ tài khoản giữ quyền Đối tác
    // CÓ hồ sơ mới tốn một truy vấn; mọi người khác trả null ngay (`/api/auth/me` đi qua đây ở MỌI trang). Điều kiện y hệt `benDatChoTaiKhoan` (holdsPartner + hồ sơ mang vai được hưởng).
    benDatCuaToi: (env, actor) => (holdsPartner(actor) && actor.partyId !== null ? nguoiHuongCuaHoSo(env.DB, actor.partyId) : Promise.resolve(null)),
    // NGƯỜI ĐI KÈM (lời chủ 2026-10-01 — "Chỉ hướng dẫn viên"): van-chuyen không import staff — gốc lắp ráp đọc tài khoản FIELD đang hoạt động, chỉ tên.
    huongDanVien: async (env) => {
      const ds = (await listStaffAccounts(env.DB)).filter((a) => a.active && a.partyId !== null && a.permissions.includes("FIELD"));
      const nhan = await nhanNhanVienTheoId(env.DB, ds.map((a) => a.id));
      return ds.map((a) => ({ partyId: a.partyId!, ten: nhan.get(a.id) ?? "" })).sort((x, y) => x.ten.localeCompare(y.ten, "vi"));
    },
    // GỘP HỒ SƠ (ADR-0068 Đ2, Đ6, Đ8): parties không import orders / dispatch / van-chuyen / billing / staff — gốc lắp ráp là NƠI DUY NHẤT gọi các hàm công bố này.
    gopHoSo: (env) => ({
      // KIỂM "ĐANG BẬN" (Đ2): giữa lúc kiểm này và lô ghi gộp có khe thời gian CHẤP NHẬN ĐƯỢC (không có câu bảo vệ trong lô); lưới an toàn = bất biến
      // kiểm toán R-PTY-MERGE-4 (Task 10) bắt nếu có việc lọt sang hồ sơ phụ.
      viecCua: async (partyId) => {
        const [phuTrachDon, xe] = await Promise.all([soDonDangPhuTrachCua(env.DB, partyId), viecXeCuaNguoi(env.DB, partyId)]);
        return { phuTrachDon, ...xe };
      },
      donNguoiDat: (partyId) => donCuaNguoiDat(env.DB, partyId),
      cauDoiDon: (tu, sang, at) => cauDoiNguoiDat(env.DB, tu, sang, at),
      soDongNo: (partyId) => soDongNoCuaNguoi(env.DB, partyId),
      soDangNhap: () => soDangNhapTheoHoSo(env.DB),
    }),
    // DẤU "ĐÃ NHẬP PHẦN MỀM KẾ TOÁN" (ADR-0060 điều 5): `orders` không đọc bảng bil_ — gốc lắp ráp gọi hàm đọc tập id của billing (lọc + nhãn danh sách đơn).
    nhapKeToanCuaDon: (env, ids) => nhapKeToanCuaDon(env.DB, ids),
    // LỚP CHỐNG GHI TRÙNG (ADR-0094 đ2): router không import module — gốc lắp ráp tiêm phần của `lan-gui` (vân tay HMAC, tra / chèn / cập nhật vé).
    lanGui: lanGuiNoi,
  },
};
const app = createApp(APP_OPTIONS);

/**
 * CHỈ khung thử (`tests/audit/harness.mjs`) gọi: dựng CÙNG ứng dụng với vài hàm tiêm GHI ĐÈ (vd mốc giả cho bài KHÔNG kiểm mốc — Ruling N-9 (iii); bỏ
 * `mocToiThieu` cho bài TC-26). Không đọc env / binding nào: mã chạy thật (`export default` dưới) luôn dùng APP_OPTIONS nguyên vẹn — không có công tắc lách
 * được từ production.
 */
export function taoAppChoKhungThu(ghiDe: Partial<AppOptions["injected"]>): ReturnType<typeof createApp> {
  return createApp({ ...APP_OPTIONS, injected: { ...APP_OPTIONS.injected, ...ghiDe } });
}

export default {
  fetch: app.fetch,
  // Cron Trigger (wrangler.jsonc "triggers.crons"): tự đồng bộ danh mục dịch vụ từ Google Sheet.
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledSync(env));
  },
} satisfies ExportedHandler<Env>;
