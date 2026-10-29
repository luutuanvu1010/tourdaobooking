// Router tối giản cho Worker (không thư viện). Module khai route: phương thức + đường dẫn + mức truy cập; router lo phần chung:
// khớp đường dẫn, 401/403/404/405 thống nhất, chặn ghi cross-site (CSRF), bắt lỗi toàn cục → 500 JSON có requestId.
// Router KHÔNG import module nào: cách xác định "ai đang đăng nhập" do gốc lắp ráp (src/index.ts) truyền vào.
import type { StaffProfile } from "./contracts";
import type { ThayDoiDon, TrangThaiPhuTrach } from "./bang-tin.ts";
import { NGUONG_MAC_DINH } from "./giay-to-hien-thi.ts";
import { error, json } from "./http.ts";
import { bocDb } from "./lan-gui-boc.ts";
import { HEADER_PHAT_LAI, HEADER_VE, ketQuaDeLuu, kiemKhoa, phanLoai, thanPhatLai, type DongVe } from "./lan-gui-luat.ts";
import { laMienLanGui } from "./lan-gui-mien.ts";
import type { MocToiThieu } from "./moc-toi-thieu.ts";
import { dongBoDiThang, type DongBoTheoDon, type VaoDongBoTheoDon } from "./dong-bo-chuyen.ts";
import type { ChuyenChoTin, HoiChuyenChoTin } from "./tin-chuyen.ts";
import { canAccessOrders, isOffice, passesAccountsGate, passesAdminGate, type PermissionCode } from "./permissions.ts";

/**
 * public: không cần đăng nhập; staff: mọi tài khoản đăng nhập; office: nhân sự văn phòng (mọi quyền trừ chỉ-FIELD — ADR-0007); orders: văn phòng HOẶC Đối tác (ADR-0014);
 * admin: quyền ADMIN/SUPER_ADMIN; accounts: Quản lý tài khoản — ADMIN/SUPER_ADMIN/HR (ADR-0071, ACCOUNTS_GATE).
 */
export type Access = "public" | "staff" | "office" | "orders" | "admin" | "accounts";

/** Tóm tắt một tài khoản cho xác minh phiếu tự khai (ADR-0125): chỉ khoá + quyền + trạng thái + hồ sơ gắn. */
export interface TaiKhoanXacMinh { id: string; permissions: readonly PermissionCode[]; active: boolean; partyId: string | null }

/** ADR-0013 điều 4: hồ sơ có gắn tài khoản không, và người đang đăng nhập có quản được tài khoản đó không (luật cấp bậc ADR-0014 điều 8, module `staff` tính). */
/** `vaiAn` (ADR-0044): tài khoản gắn hồ sơ đang giữ Toàn quyền — vai ẩn; người xem không giữ Toàn quyền chỉ thấy vai đang mở của hồ sơ đó. */
/**
 * `coQuyenNoiBo` (ADR-0117 điều 4, vế 3 của luật «nội bộ»): tài khoản gắn hồ sơ mang ít nhất một quyền không thuộc nhóm bên ngoài. Quy ước đọc:
 * `acc.linked && acc.coQuyenNoiBo !== false` = «có quyền nội bộ» (thiếu cờ ⇒ coi là nội bộ — siết). KHÔNG dùng `acc.linked` một mình (đếm cả tài khoản Đối tác).
 */
export type PartyAccountVerdict = { linked: false } | { linked: true; manageable: boolean; vaiAn?: boolean; coQuyenNoiBo?: boolean };

/**
 * Kết luận của `dispatch` về người mà người lập CHỌN làm người phụ trách ngay lúc lập đơn (ADR-0030 S20-4, ADR-0020 điều 1, Q-C). Đạt → `statements`
 * dựng các câu lệnh D1 (CHƯA chạy) cho MỘT lần thử của lô tạo đơn: nhận id đơn và mốc `at` của CHÍNH lần thử đó từ `createOrder` (id đơn đổi mỗi lần
 * thử lại khi trùng mã) — không tự đọc đồng hồ: dòng `HANDLE` mở và dòng nhật ký mang ĐÚNG mốc của dòng nhật ký `created` cùng lô. Không đạt → `message`
 * (lời báo cho người dùng, route trả 400 `invalid_assignee` và KHÔNG tạo đơn).
 */
/**
 * Việc đóng Bảng tin (+ tắt máy nhận thông báo) gửi cho hàm tiêm `dongBangTin`: theo tài khoản (khi tài khoản đổi — `tatThongBao` bắt buộc, ADR-0046), theo
 * PHIÊN (đăng nhập máy khác / mất miễn — ADR-0075 điều 6: tắt mọi máy trừ `giuPhien`), CHỈ các phiên đó (IT/Toàn quyền gỡ phiên — ADR-0075 điều 6b:
 * `chiPhien: true`, tắt đúng máy của các phiên đó), hoặc mọi kết nối (`"tat-ca"`, bật bảo trì).
 */
export type MucDongBangTin =
  | { staffId: string; tatThongBao: boolean }
  | { staffId: string; sessionIds: string[]; giuPhien: string | null }
  | { staffId: string; sessionIds: string[]; chiPhien: true }
  // ADR-0085 Q3: Toàn quyền LƯU CHÍNH SÁCH làm nhiều tài khoản mất nhiều máy — MỘT lời gọi cho cả danh sách phiên vừa kết thúc (không một staffId nào):
  // đóng Bảng tin của đúng các phiên đó + tắt CHỈ đăng ký mang đúng các phiên đó (lý do mat-mien). Khoá `phienKetThuc` riêng để nhánh cũ không bắt nhầm.
  | { phienKetThuc: string[] }
  | "tat-ca";
export type NewOrderHandler = { ok: true; statements: (orderId: string, at: string) => D1PreparedStatement[] } | { ok: false; message: string };

/**
 * GỘP HỒ SƠ (ADR-0068 Đ2, Đ6, Đ8) — phần của module KHÁC mà route gộp / nghi trùng của `parties` cần. `parties` không import orders / dispatch / van-chuyen /
 * billing / staff và không đọc bảng của chúng: gốc lắp ráp nối (khuôn `isAssigned`, `mocToiThieu`). Mỗi phương thức là MỘT truy vấn D1 (trừ `cauDoiDon`:
 * câu CHƯA chạy, route gộp đặt nó TRƯỚC câu lật hồ sơ phụ trong cùng `db.batch()`).
 */
export interface ViecCuaHoSo { phuTrachDon: number; laiChuyen: number; toLaiChuyen: number; chuXeChuyen: number; soXe: number }
/** `maDoi` = mã các đơn sẽ đổi người đặt (nháp + đã xác nhận chưa giao) — route gộp nêu tên khi lô bị trigger tiền của đơn huỷ (ADR-0068 Đ1 bước 5). */
export interface DonCuaNguoiDatTom { doi: number; giuDaGiao: number; giuDaHuy: number; lechTien: string[]; maDoi: string[] }
export interface GopHoSoNoi {
  viecCua: (partyId: string) => Promise<ViecCuaHoSo>;
  donNguoiDat: (partyId: string) => Promise<DonCuaNguoiDatTom>;
  cauDoiDon: (tuPartyId: string, sangPartyId: string, at: string) => D1PreparedStatement;
  soDongNo: (partyId: string) => Promise<number>;
  soDangNhap: () => Promise<{ partyId: string; phone: string }[]>;
}

/**
 * ADR-0148 Đ1 — câu hỏi «đã có bản chụp chưa» của route Sửa / Đổi / Ngừng ở trang Hoa hồng (kế hoạch 2026-10-29 Task 3, Q1). `MUC` = một dòng mức (bản chụp trỏ đúng mã dòng).
 * `GAN` = một gắn loại / gắn đối tác ↔ chính sách: bản chụp không ghi gắn nào đã dùng, nên hỏi «có bản chụp trỏ dòng mức của chính sách `tierCode`, ngày chụp trong [tu, den]»
 * (gắn đối tác: thêm người hưởng = hồ sơ) — thừa chứ không thiếu.
 */
export type HoiDaChup = { loai: "MUC"; ruleId: string } | { loai: "GAN"; tierCode: string; tu: string; den: string | null; partyId: string | null };

export interface Ctx<A extends Access = Access> {
  request: Request;
  env: Env;
  exec: ExecutionContext;
  url: URL;
  /** Tham số `:tên` trong đường dẫn, đã giải mã. */
  params: Record<string, string>;
  /** Nhân viên đang đăng nhập — luôn có với route "staff"/"admin". */
  staff: A extends "public" ? StaffProfile | null : StaffProfile;
  /** Mã phiên đăng nhập của request (dòng `aut_session`, ADR-0075) — có với mọi route cần đăng nhập; route công khai luôn `null` (router không đọc cookie ở đó). */
  sessionId: string | null;
  /**
   * Trạng thái chế độ bảo trì mà `currentStaff` đã đọc SONG SONG với phiên (nghiên cứu tốc độ 2026-10-02: bớt một chặng D1 ở mọi lời gọi). Router không biết
   * nghĩa của nó (module `maintenance` định kiểu) — chỉ chuyển từ `currentStaff` sang cổng bảo trì và sang handler (`/api/auth/me` dùng lại, khỏi hỏi lần hai).
   * `undefined` = chưa đọc (route công khai, hoặc `currentStaff` giả của bài kiểm) ⇒ nơi dùng tự đọc.
   */
  baoTri?: unknown;
  /**
   * Người đang đăng nhập có phải người phụ trách ĐANG MỞ của đơn `orderId` không — kết quả điền vào `can(staff, op, { ownerId, assigned })` cho các ô
   * `ownOrAssigned`/`assigned` (ADR-0007 điều 4(b), ADR-0009 điều 3). Do gốc lắp ráp tiêm (module `orders` không import `dispatch`). Là một HÀM (không phải giá trị
   * tính sẵn): MỖI LẦN GỌI là một truy vấn D1. Route phải truyền kết quả vào MỌI lời gọi `can()` có ô như vậy (quên là lặng lẽ tụt về `own`).
   * Bốn route của `orders` (GET/PUT đơn, PUT trip, POST status) gọi nó VÔ ĐIỀU KIỆN, song song với việc đọc đơn (`Promise.all`) — kể cả khi đơn không tồn tại hoặc
   * người dùng đằng nào cũng là người lập — chứ KHÔNG gọi lười sau khi biết cần. Chưa đăng nhập → false.
   */
  isAssigned: (orderId: string) => Promise<boolean>;
  /**
   * Người phụ trách do người lập CHỌN ngay lúc lập đơn (ADR-0030 S20-4, ADR-0020 điều 1, Q-C) — đơn mới KHÔNG BAO GIỜ tự gắn người lập; không chọn thì
   * route không gọi hàm này và đơn "chờ nhận". `dispatch` đọc tài khoản `staffId` và xét bằng CHÍNH luật người được giao (`checkAssignee`: đang hoạt
   * động, có hồ sơ, không phải tài khoản có quyền Đối tác, đủ cấp); đạt thì trả hàm dựng câu lệnh để gộp vào CÙNG `db.batch()` tạo đơn (xem
   * `NewOrderHandler` — mảng câu gồm dòng phụ trách, nhật ký và dòng sự kiện ASSIGN của ADR-0032; `orders` chỉ trải mảng, không đọc chỉ số). Quyền CHỌN
   * của người gọi (`dispatch.assign`) route tự hỏi TRƯỚC khi gọi. Do gốc lắp ráp tiêm; mỗi lần gọi là một truy vấn D1.
   * Chưa đăng nhập → không đạt, không truy vấn.
   */
  newOrderHandler: (staffId: string) => Promise<NewOrderHandler>;
  /**
   * Trong các đơn `orderIds`, đơn nào ĐANG có người phụ trách (ADR-0030 S20-13) — do gốc lắp ráp tiêm; `dispatch` trả lời. Module `orders` không import
   * `dispatch` và không đọc view `v_dsp_*` của nó (`src/architecture.test.ts` canh): cần biết đơn nào có người thì hỏi hàm này. KHÔNG phụ thuộc người
   * đang gọi (chỉ tra theo mã đơn nơi gọi đã có) — cả route công khai cũng nhận câu trả lời THẬT: trả tập rỗng ở đó sẽ là câu trả lời SAI ("không đơn nào
   * có người"), không phải từ chối. Mỗi lần gọi là MỘT truy vấn D1 với cả mảng id trong một tham số JSON (mảng rỗng: không truy vấn).
   */
  ordersWithHandler: (orderIds: readonly string[]) => Promise<Set<string>>;
  /**
   * Mọi đơn mà NGƯỜI ĐANG ĐĂNG NHẬP đang phụ trách (ADR-0030) — do gốc lắp ráp tiêm; id người lấy từ phiên, KHÔNG nhận tham số (route không hỏi được
   * thay người khác). Chưa đăng nhập → `[]` (không phụ trách gì), không truy vấn. Mỗi lần gọi là một truy vấn D1.
   */
  myHandledOrderIds: () => Promise<string[]>;
  /**
   * ADR-0013 điều 4 — do gốc lắp ráp tiêm (module `parties` không import `staff`). Mỗi lần gọi là 1–2 truy vấn D1.
   * Chưa đăng nhập → `{ linked: true, manageable: false }` (TỪ CHỐI; không được tụt về ô `party.write`).
   */
  partyAccount: (partyId: string) => Promise<PartyAccountVerdict>;
  /**
   * BẢNG TIN (ADR-0022) — báo một thay đổi đơn vừa xảy ra, để trạm (Durable Object) phát cho mọi kết nối đang mở liên quan. Kiểu `void`: route
   * KHÔNG `await` được (bắn-và-quên, DP-3) — router tự bọc `exec.waitUntil` + bắt lỗi, lỗi phát tin không bao giờ làm hỏng hay làm chậm thao tác
   * ghi. Route công khai (`staff` null, chưa đăng nhập) → no-op, không có ai "báo" thay mặt.
   */
  baoThayDoi: (e: { orderId: string; thayDoi: ThayDoiDon; handlerTruoc?: TrangThaiPhuTrach }) => void;
  /**
   * TIN CHUYẾN (ADR-0052 D6.3) — route van-chuyen báo "lệnh chuyến vừa ghi xong" SAU lô thành công; KHÔNG gọi khi 4xx hay lệnh lặp. Kiểu `void`: bắn-và-quên
   * (router bọc waitUntil + bắt lỗi → một dòng `bang_tin_loi` viec "bao_chuyen"). Gốc lắp ráp tự đọc hành động từ nhật ký theo `requestId` (không tin chữ route).
   */
  baoThayDoiChuyen: (e: { tripId: string; requestId: string }) => void;
  /**
   * BẢNG TIN — đóng các kết nối đang mở của một tài khoản (`{ staffId }`, khi tài khoản đó bị ngưng/đổi quyền/đổi SĐT/đổi PIN…) hoặc MỌI kết
   * nối (`"tat-ca"`, khi bật chế độ bảo trì). Không phụ thuộc người đang gọi (không cần ai đăng nhập) — bắn-và-quên như `baoThayDoi`.
   * `tatThongBao` (BẮT BUỘC, ADR-0046): có tắt luôn mọi máy nhận thông báo điện thoại của tài khoản không — `true` CHỈ cho thao tác bảo mật
   * (đổi/đặt lại PIN, gỡ Face ID, ngưng tài khoản, đổi SĐT đăng nhập); `false` cho đổi vai/quyền (người nhận tính lúc gửi theo quyền hiện tại).
   * Nhánh theo PHIÊN (ADR-0075 điều 6, chỉ route đăng nhập gọi): `{ staffId, sessionIds, giuPhien }` — đóng kết nối của đúng các phiên vừa bị thay và tắt
   * mọi máy nhận thông báo của `staffId` trừ máy mang phiên `giuPhien` (máy mới).
   * Nhánh CHỈ PHIÊN (ADR-0075 điều 6b, route gỡ phiên): `{ staffId, sessionIds, chiPhien: true }` — đóng kết nối và tắt máy nhận thông báo của ĐÚNG các
   * phiên đó; máy khác của tài khoản không đụng.
   */
  dongBangTin: (muc: MucDongBangTin) => void;
  /**
   * WEB PUSH (ADR-0036) — giao một danh sách địa chỉ nhận cho trạm `BangTin` chia lô ≤ 40 bằng báo thức (khi > 40 máy). Hàm tiêm để `thongbao` không
   * import `bangtin` (không nới ALLOWED_EDGES). Trả địa chỉ đã nhận 410 ở các lượt trước của trạm (người gọi đánh dấu hết hiệu lực). Không có trạm → `[]`.
   * Khác `baoThayDoi`: trả lời hứa — người gọi tự bọc `waitUntil` + bắt lỗi.
   */
  giaoLoDay: (ds: string[]) => Promise<string[]>;
  /**
   * MỐC TỐI THIỂU đang hiệu lực (ADR-0049 D2, kế hoạch I25) — do gốc lắp ráp tiêm (`van-chuyen.mocToiThieuHienHanh`; `orders` KHÔNG đọc bảng `vc_`, không
   * import `van-chuyen`). Mỗi lần gọi là MỘT truy vấn D1 — route gọi ĐÚNG MỘT lần mỗi request (TC-26). `null` = bảng chính sách rỗng HOẶC môi trường không
   * tiêm hàm (khung thử cố ý) → route CHẶN lệnh cần mốc (503 `moc_toi_thieu_chua_co`), KHÔNG đoán con số. Không phụ thuộc người đang gọi.
   */
  mocToiThieu: () => Promise<MocToiThieu | null>;
  /**
   * ĐỒNG BỘ CHUYẾN THEO ĐƠN (ADR-0104 Đ2.1) — do gốc lắp ráp tiêm (`van-chuyen.dongBoChuyenChoDon`; orders / dispatch KHÔNG import van-chuyen). Nhận câu đơn ĐÃ
   * SOẠN chưa chạy, trả danh sách đầy đủ `[câu đơn…, khúc chuyến…]` để điểm gọi chạy MỘT `db.batch`. `sauKhiGhi(kq)` (gọi khi lệnh đơn thắng) trả phần "chuyến"
   * của phản hồi và — bản router bọc — tự báo Bảng tin / tin chuyến (`baoThayDoiChuyen`) cho từng khúc thắng. Câu đi vào CHÍNH lô của handler ⇒ dùng `envH`.
   * Môi trường không tiêm (khung thử cố ý tắt) → `dongBoDiThang`: lô = câu đơn, phản hồi `capNhatTay` (không lặng lẽ "đã đồng bộ").
   */
  dongBoChuyen: (x: VaoDongBoTheoDon) => Promise<DongBoTheoDon>;
  /**
   * MỐC "SẮP HẾT HẠN" đang hiệu lực (ADR-0040 D1 — MỘT mốc cho giấy tờ xe lẫn giấy tờ người; GB2/R23) — do gốc lắp ráp tiêm (`van-chuyen.nguongHetHanHienHanh`;
   * `parties` không đọc bảng `vc_`, không import `van-chuyen` — khuôn `mocToiThieu`). Một truy vấn mỗi lần gọi; route gọi đúng một lần mỗi request. Môi
   * trường không tiêm (khung thử cố ý) → `NGUONG_MAC_DINH` (30 — bằng dòng gieo 0033; chỉ dùng để hiển thị nhãn hạn).
   */
  nguongHetHan: () => Promise<number>;
  /**
   * NGƯỜI ĐI KÈM gắn được (lời chủ 2026-10-01): tài khoản quyền `FIELD` đang hoạt động, có hồ sơ — hồ sơ + tên hiển thị, KHÔNG SĐT. Do gốc lắp ráp tiêm
   * (`staff`; `van-chuyen` không có cạnh tới `staff`). Không tiêm (khung thử cố ý) → `[]` ⇒ mọi người đi kèm bị từ chối (mặc định từ chối).
   */
  huongDanVien: () => Promise<{ partyId: string; ten: string }[]>;
  /**
   * NHÃN NGƯỜI BẤM (ruling R-P20 của điều phối, ADR-0049 kế hoạch mục 1.8 / R-P11) — do gốc lắp ráp tiêm (`staff`, view `v_stf_staff_label`; `van-chuyen`
   * KHÔNG import `staff`, không nới ALLOWED_EDGES — khuôn `mocToiThieu`, `giaoLoDay`). Trả TÊN HIỂN THỊ theo id tài khoản (không SĐT, không email, không
   * quyền). Route gọi MỘT lần mỗi request cho CẢ danh sách id (mảng rỗng: không truy vấn). `null` = môi trường không tiêm (khung thử cố ý) ⇒ route để trống
   * nhãn — KHÔNG đoán tên (nhãn chỉ để hiển thị, không quyết quyền).
   */
  nhanNhanVien: (ids: readonly string[]) => Promise<Map<string, string> | null>;
  /**
   * ADR-0125 đ3, đ5 — MỌI tài khoản (id, quyền ĐANG HIỆU LỰC, đang hoạt động, hồ sơ) cho route xác minh phiếu tự khai: xét cấp bậc, "còn ai xác minh được" (chuyển Toàn quyền)
   * và phiếu của tài khoản nào. Do gốc lắp ráp tiêm (`staff`; `parties` không import `staff` — khuôn `huongDanVien`). MỘT truy vấn D1, gọi tối đa MỘT lần mỗi request.
   * Chưa đăng nhập → `[]`, không truy vấn. Không tiêm (khung thử cũ) → `[]` ⇒ chỉ Toàn quyền xác minh được (mặc định từ chối). Không SĐT, không email, không tên.
   */
  taiKhoanXacMinh: () => Promise<TaiKhoanXacMinh[]>;
  /**
   * ADR-0126 đ8 — câu ẩn danh IP / User-Agent mọi phiên của MỘT tài khoản, do `auth` cấp, gốc lắp ráp tiêm (parties không import auth — khuôn `gopHoSo.cauDoiDon`).
   * Không tiêm (khung thử cũ) → null ⇒ route Thực hiện trả 503, KHÔNG thực hiện thiếu phần sổ phiên.
   */
  cauAnDanhPhien: (staffId: string, at: string, by: string) => D1PreparedStatement | null;
  /** ADR-0126 đ8 — số ngày giữ IP / User-Agent của phiên đã kết thúc, đọc từ chính sách riêng tư hiện hành (parties). null = chưa có số. Gốc lắp ráp tiêm (accounts không import parties). */
  hanGiuPhienNgay: () => Promise<number | null>;
  /**
   * BÊN ĐẶT MÁY CHỦ ÉP CHO NGƯỜI GỌI (sổ đại lý đợt 1, Task 11; Ruling 21) — do gốc lắp ráp tiêm (`pricing.nguoiHuongCuaHoSo`; `auth` KHÔNG import `pricing`, không nới ALLOWED_EDGES — khuôn
   * `mocToiThieu`, `nhanNhanVien`). Khác null khi và chỉ khi người gọi giữ quyền Đối tác, có hồ sơ, và hồ sơ đó đang mang vai được hưởng hoa hồng — ĐÚNG điều kiện `benDatChoTaiKhoan` ép bên đặt. Chỉ id + tên hồ sơ.
   * Người gọi không giữ quyền Đối tác thì KHÔNG truy vấn (mọi lời gọi `/api/auth/me` đi qua đây). Môi trường không tiêm (khung thử cũ) ⇒ null.
   */
  benDatCuaToi: () => Promise<{ partyId: string; ten: string } | null>;
  /** GỘP HỒ SƠ (ADR-0068) — do gốc lắp ráp tiêm; xem `GopHoSoNoi`. Lười: chỉ gọi hàm tiêm khi route dùng (khung thử cũ không có hàm này vẫn chạy route khác). */
  gopHoSo: GopHoSoNoi;
  /**
   * DẤU "ĐÃ NHẬP PHẦN MỀM KẾ TOÁN" (ADR-0060 điều 5) — do gốc lắp ráp tiêm (`billing.nhapKeToanCuaDon`; `orders` KHÔNG đọc bảng `bil_`, không import `billing` —
   * khuôn `ordersWithHandler`): trong các đơn `orderIds`, đơn nào có trạng thái hiện tại = đã nhập. KHÔNG phụ thuộc người gọi và KHÔNG tự kiểm quyền — route
   * hỏi `accounting.entry.view` trước khi dùng kết quả. MỘT truy vấn D1, mảng id trong MỘT tham số JSON (mảng rỗng: không truy vấn). `null` = môi trường
   * không tiêm (khung thử cố ý) ⇒ route không gắn nhãn, bộ lọc trả 503 — KHÔNG đoán "chưa nhập".
   */
  nhapKeToanCuaDon: (orderIds: readonly string[]) => Promise<Set<string> | null>;
  /**
   * SỐ ĐÃ THU RÒNG của MỘT đơn (ADR-0136 Đ3 — «đơn đã có khoản thu» chặn mở yêu cầu xác nhận) — do gốc lắp ráp tiêm (`billing.daThuCuaDon`; `orders` KHÔNG đọc bảng `bil_`, không
   * import `billing`, ADR-0024 đ4). Số ròng đã trừ dòng đảo và tiền trả lại khách (`hieuLuc` + `conLai`). MỘT truy vấn mỗi lần gọi. `null` = môi trường không tiêm (khung thử cố ý)
   * HOẶC không đọc được ⇒ route TỪ CHỐI KÍN (503 `khoan_thu_chua_kiem`), KHÔNG đoán «chưa có khoản thu».
   */
  daThuCuaDon: (orderId: string) => Promise<number | null>;
  /**
   * «DÒNG NÀY ĐÃ ĐƯỢC CHỤP CHƯA» (ADR-0148 Đ1) — do gốc lắp ráp tiêm (`orders.ngayChupGanNhat`; `pricing` KHÔNG đọc bảng `ord_`, không phụ thuộc `orders` — sẽ thành vòng; khuôn
   * `mocToiThieu`). `{ ngay }` = ngày chụp gần nhất, `ngay: null` = chưa có bản chụp nào (mở đường huỷ hẳn dòng). `null` = môi trường không tiêm ⇒ route TỪ CHỐI KÍN (503),
   * KHÔNG BAO GIỜ đoán «chưa chụp». MỘT truy vấn mỗi lần gọi.
   */
  hoiDaChup: (q: HoiDaChup) => Promise<{ ngay: string | null } | null>;
  /**
   * TIN CHUYẾN (ADR-0052 D6.3) — dữ kiện chuyến theo id (mã, ngày, khoảng lái, đơn của suất vắng) do gốc lắp ráp tiêm (`van-chuyen.chuyenChoTinTheoId`;
   * thongbao không import van-chuyen). Một lần gọi = ba truy vấn mảng JSON (mảng chuyến rỗng: không truy vấn). `null` = môi trường không tiêm (khung thử cố ý)
   * ⇒ không có tin chuyến. `legIds` (MQ-07, ADR-0052 D6.2): thêm suất khách của các chặng đó + dữ kiện chuyến của chúng.
   */
  chuyenChoTin: (q: HoiChuyenChoTin) => Promise<ChuyenChoTin | null>;
}

export interface Route {
  method: string;
  path: string;
  access: Access;
  handler: (ctx: Ctx) => Promise<Response>;
}

export interface AppModule {
  name: string;
  routes: Route[];
}

/** Khai một route. `path` dạng "/api/orders/:id/status". */
export function route<A extends Access>(method: string, path: string, access: A, handler: (ctx: Ctx<A>) => Promise<Response>): Route {
  return { method, path, access, handler: handler as (ctx: Ctx) => Promise<Response> };
}

function match(pattern: string, pathname: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = pathname.split("/").filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i]!.startsWith(":")) {
      try {
        params[p[i]!.slice(1)] = decodeURIComponent(s[i]!);
      } catch {
        return null;
      }
    } else if (p[i] !== s[i]) return null;
  }
  return params;
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Chặn yêu cầu ghi không đến từ chính trang này (CSRF). Cookie SameSite=Lax đã chặn site khác; lớp này chặn thêm trang
 * cùng site (*.tourdao.vn) và form `enctype="text/plain"` giả JSON. Trả Response lỗi, hoặc null nếu hợp lệ.
 */
function checkWriteRequest(request: Request, url: URL): Response | null {
  if (!WRITE_METHODS.has(request.method)) return null;
  const origin = request.headers.get("origin");
  const sameOrigin = origin ? origin === url.origin : request.headers.get("sec-fetch-site") === "same-origin";
  if (!sameOrigin) return error(403, "cross_origin", "Yêu cầu không đến từ trang của hệ thống.");
  const type = request.headers.get("content-type");
  const hasBody = type !== null || (request.headers.get("content-length") ?? "0") !== "0";
  if (hasBody && !(type ?? "").toLowerCase().startsWith("application/json")) return error(415, "unsupported_media_type", "Dữ liệu phải gửi dạng JSON.");
  return null;
}

/**
 * LỚP CHỐNG GHI TRÙNG (ADR-0094 đ2) — phần của module `lan-gui` mà router cần; gốc lắp ráp tiêm (`AppOptions.injected.lanGui`), router không import module.
 * Ở đây (không ở lan-gui-luat.ts) vì dùng kiểu D1 của Worker — lan-gui-luat.ts còn được giao diện import. `vanTay` đọc khoá `LAN_GUI_SECRET` từ `env`.
 * Mọi hàm nhận tay cầm D1 GỐC (không bọc) trừ `cauChenVe` — câu chưa chạy, bộ bọc nối vào lô.
 */
export interface LanGuiNoi {
  vanTay: (env: Env, method: string, duongDanThat: string, than: string) => Promise<string>;
  tra: (db: D1Database, staffId: string, khoa: string) => Promise<DongVe | null>;
  cauChenVe: (db: D1Database, v: { staffId: string; khoa: string; vanTay: string; duong: string; at: string }) => D1PreparedStatement;
  capNhatKetQua: (db: D1Database, v: { staffId: string; khoa: string; maTra: number; maLoi: string | null; ketQua: string | null; at: string }) => Promise<void>;
  tangLap: (db: D1Database, staffId: string, khoa: string) => Promise<void>;
}

export interface AppOptions {
  modules: AppModule[];
  /** Nhân viên đang đăng nhập + mã phiên (sổ phiên ADR-0075) ứng với request (đọc cookie phiên), hoặc null. */
  currentStaff: (request: Request, env: Env, exec?: ExecutionContext) => Promise<{ staff: StaffProfile; sessionId: string; baoTri?: unknown } | null>;
  /** Kiểm cấu hình bắt buộc trước khi xử lý; trả thông báo lỗi (→ 500) hoặc null. */
  checkConfig?: (env: Env) => string | null;
  /**
   * Hàm nối chéo module do gốc lắp ráp cung cấp, router chỉ đưa vào `ctx` (ADR-0007 điều 4(b)) — router không biết chúng đến từ module nào và module
   * nhận (`orders`) không import module cung cấp (`dispatch`). BẮT BUỘC: thiếu là ô `ownOrAssigned` lặng lẽ tụt về `own`.
   */
  injected: {
    isAssigned: (env: Env, staffId: string, orderId: string) => Promise<boolean>;
    /** ADR-0030 S20-4. BẮT BUỘC. `actor` = người đang đăng nhập (người lập — ghi vào cột người thao tác và nhật ký), `staffId` = người được chọn. */
    newOrderHandler: (env: Env, actor: StaffProfile, staffId: string) => Promise<NewOrderHandler>;
    /** ADR-0030 S20-13. BẮT BUỘC: thiếu là `orders` không biết đơn nào đang có người phụ trách (Trang chủ đếm sai "Chưa phụ trách"). */
    ordersWithHandler: (env: Env, orderIds: readonly string[]) => Promise<Set<string>>;
    /** ADR-0030. BẮT BUỘC. Router luôn truyền `staffId` = người đang đăng nhập (`ctx.myHandledOrderIds`). */
    handledOrderIdsOf: (env: Env, staffId: string) => Promise<string[]>;
    /**
     * Cổng CHẾ ĐỘ BẢO TRÌ (module `maintenance`, gốc lắp ráp tiêm — router không biết module đó): Response 503 nếu tài khoản này bị chặn LÚC NÀY (ADR-0071 điều 3:
     * theo QUYỀN của phiên — không giữ Toàn quyền thì bị chặn), hoặc null để cho qua.
     * Chạy cho mọi route cần đăng nhập, ngay sau khi biết ai đang đăng nhập và TRƯỚC kiểm quyền admin/văn phòng (người bị chặn thấy "đang bảo trì", không phải "không đủ quyền").
     * Route công khai (`/api/auth/*` trừ `/me`, `/api/company`) không qua cổng. BẮT BUỘC: thiếu là chế độ bảo trì lặng lẽ không còn hiệu lực với phiên đang mở.
     */
    maintenanceBlock: (env: Env, staff: StaffProfile, truoc?: unknown) => Promise<Response | null>;
    /** ADR-0013 điều 4. BẮT BUỘC: thiếu là route Hồ sơ không biết hồ sơ nào gắn tài khoản. */
    partyAccount: (env: Env, actor: StaffProfile, partyId: string) => Promise<PartyAccountVerdict>;
    /** BẢNG TIN (ADR-0022). BẮT BUỘC: router gọi cho MỌI route có đăng nhập gọi `ctx.baoThayDoi`. Bản thật ở `src/index.ts` (trạm `BangTin` đã có); chỉ là no-op khi môi trường không có binding `BANG_TIN` (khung thử). */
    /**
     * `batDau` (ADR-0062 Đ4): mốc ISO router chụp TRƯỚC khi chạy handler của request này — gốc lắp ráp chỉ gõ cửa theo dòng đổi ghi từ mốc đó (dòng do CHÍNH
     * request này ghi), nên lệnh báo "chuyen" / "tien" mà không ghi dòng đổi (ghi khoản thu, đặt gấp…) không gõ cửa lại dòng đổi cũ. Không vào sự kiện Bảng tin.
     */
    baoThayDoi: (env: Env, actor: StaffProfile, e: { orderId: string; thayDoi: ThayDoiDon; handlerTruoc?: TrangThaiPhuTrach }, batDau: string) => Promise<void>;
    /** TIN CHUYẾN (ADR-0052 D6.3, D6.4). BẮT BUỘC trong mã chạy thật (`src/index.ts`): phát Bảng tin chuyến + gõ cửa tin chuyến; thiếu (khung thử cũ) → no-op. */
    baoThayDoiChuyen: (env: Env, actor: StaffProfile, e: { tripId: string; requestId: string }) => Promise<void>;
    /** BẢNG TIN (ADR-0022). BẮT BUỘC. Bản thật ở `src/index.ts` (`dongCua` của module `bangtin`); chỉ là no-op khi môi trường không có binding `BANG_TIN`. */
    dongBangTin: (env: Env, muc: MucDongBangTin) => Promise<void>;
    /** WEB PUSH (ADR-0036). BẮT BUỘC. Bản thật ở `src/index.ts` (`xepHangDay` của module `bangtin`); `[]` khi môi trường không có binding `BANG_TIN`. */
    giaoLoDay: (env: Env, ds: string[]) => Promise<string[]>;
    /**
     * MỐC TỐI THIỂU (ADR-0049 D2, I25). BẮT BUỘC trong mã chạy thật (`src/index.ts`: `mocToiThieuHienHanh(env.DB)`); thiếu (chỉ khung thử cố ý — TC-26) thì
     * router trả `null` ⇒ `orders` chặn lệnh cần mốc (khuôn `isAssigned`: không bao giờ lặng lẽ "không có mốc").
     */
    mocToiThieu: (env: Env) => Promise<MocToiThieu | null>;
    /** ĐỒNG BỘ CHUYẾN THEO ĐƠN (ADR-0104 Đ2.1). BẮT BUỘC trong mã chạy thật (`src/index.ts`: `dongBoChuyenChoDon` của van-chuyen); thiếu (khung thử cố ý) → `dongBoDiThang`. */
    dongBoChuyen: (env: Env, actor: StaffProfile, x: VaoDongBoTheoDon) => Promise<DongBoTheoDon>;
    /** Mốc sắp hết hạn (ADR-0040 D1). BẮT BUỘC trong mã chạy thật (`src/index.ts`: `nguongHetHanHienHanh(env.DB)`). */
    nguongHetHan: (env: Env) => Promise<number>;
    /** Người đi kèm gắn được. BẮT BUỘC trong mã chạy thật (src/index.ts). */
    huongDanVien: (env: Env) => Promise<{ partyId: string; ten: string }[]>;
    /** R-P20. BẮT BUỘC trong mã chạy thật (`src/index.ts`: `nhanNhanVienTheoId` của staff); thiếu (khung thử cố ý) → router trả `null` (route để trống nhãn). */
    nhanNhanVien: (env: Env, ids: readonly string[]) => Promise<Map<string, string>>;
    /** ADR-0125 đ3, đ5. BẮT BUỘC trong mã chạy thật (`src/index.ts`: `taiKhoanChoXacMinh` của staff); thiếu (khung thử cũ) → router trả `[]` (chỉ Toàn quyền xác minh được). */
    taiKhoanXacMinh: (env: Env) => Promise<TaiKhoanXacMinh[]>;
    /** ADR-0126 đ8. BẮT BUỘC trong mã chạy thật (`src/index.ts`: `anDanhPhienCuaTaiKhoanStatement` của auth); thiếu (khung thử cũ) → router trả `null` (route Thực hiện 503). */
    cauAnDanhPhien: (env: Env, staffId: string, at: string, by: string) => D1PreparedStatement;
    /** ADR-0126 đ8. BẮT BUỘC trong mã chạy thật (`src/index.ts`: `hanGiuPhienNgay` của parties); thiếu (khung thử cũ) hoặc chưa đăng nhập → `null`. */
    hanGiuPhienNgay: (env: Env) => Promise<number | null>;
    /** Task 11 (Ruling 21). BẮT BUỘC trong mã chạy thật (`src/index.ts`: `nguoiHuongCuaHoSo` của pricing, chỉ cho tài khoản giữ quyền Đối tác); thiếu (khung thử cũ) → router trả `null`. */
    benDatCuaToi: (env: Env, actor: StaffProfile) => Promise<{ partyId: string; ten: string } | null>;
    /** GỘP HỒ SƠ (ADR-0068). BẮT BUỘC trong mã chạy thật (`src/index.ts`). */
    gopHoSo: (env: Env) => GopHoSoNoi;
    /** ADR-0060 điều 5. BẮT BUỘC trong mã chạy thật (`src/index.ts`: `nhapKeToanCuaDon` của billing); thiếu (khung thử cố ý) → router trả `null`. */
    nhapKeToanCuaDon: (env: Env, orderIds: readonly string[]) => Promise<Set<string>>;
    /** ADR-0136 Đ3. BẮT BUỘC trong mã chạy thật (`src/index.ts`: `daThuCuaDon` của billing); thiếu (khung thử cố ý) → router trả `null`. */
    daThuCuaDon: (env: Env, orderId: string) => Promise<number | null>;
    /** ADR-0148 Đ1. BẮT BUỘC trong mã chạy thật (`src/index.ts`: `ngayChupGanNhat` của orders); thiếu (khung thử cố ý) → router trả `null` (route Sửa / Đổi / Ngừng của pricing 503). */
    hoiDaChup: (env: Env, q: HoiDaChup) => Promise<string | null>;
    /** TIN CHUYẾN (ADR-0052 D6.3). BẮT BUỘC trong mã chạy thật (`src/index.ts`: `chuyenChoTinTheoId` của van-chuyen); thiếu (khung thử cố ý) → router trả `null`. */
    chuyenChoTin: (env: Env, q: HoiChuyenChoTin) => Promise<ChuyenChoTin>;
    /**
     * LỚP CHỐNG GHI TRÙNG (ADR-0094 đ2) — phần của module `lan-gui` (gốc lắp ráp tiêm; router không import module). BẮT BUỘC: thiếu ⇒ MỌI route ghi có
     * đăng nhập trả 500 `server_misconfigured` (T18) — không bao giờ lặng lẽ tắt lớp.
     */
    lanGui: LanGuiNoi;
  };
}

/** Log lỗi phát tin (DP-3): KHÔNG ghi SĐT/email/tên/nội dung lỗi — chỉ mã lỗi (`name`) và việc nào (`bao` báo thay đổi đơn, `bao_chuyen` báo thay đổi chuyến, `dong` đóng kết nối). */
function ghiLoiBangTin(viec: "bao" | "dong" | "bao_chuyen", e: unknown): void {
  const name = e instanceof Error ? e.name : "unknown";
  console.error(JSON.stringify({ level: "error", event: "bang_tin_loi", viec, name }));
}

/** Lớp vé (ADR-0094): lỗi của việc chạy nền (cập nhật kết quả, đếm lặp) — chỉ tên lỗi, không dữ liệu. Dữ liệu nghiệp vụ không bị ảnh hưởng. */
function ghiLoiLanGui(viec: "cap_nhat" | "tang_lap", e: unknown): void {
  console.error(JSON.stringify({ level: "error", event: "lan_gui_loi", viec, name: e instanceof Error ? e.name : "unknown" }));
}
/** H5 (ADR-0094 đ3): lệnh ghi > 1 lần mỗi yêu cầu — đo ở giai đoạn 1; e2e đối chiếu với danh sách nợ có tên (src/shared/lan-gui-no.ts). */
function ghiNhieuLan(duong: string, so: number): void {
  if (so > 1) console.warn(JSON.stringify({ event: "lan_gui_ghi_nhieu_lan", duong, so }));
}
/** Mã lỗi máy (`error.code`) của phản hồi 4xx — đọc từ bản sao, chỉ giữ mã (không câu chữ: có thể chứa tên). */
async function maLoiCua(res: Response): Promise<string | null> {
  try {
    const code = ((await res.clone().json()) as { error?: { code?: unknown } } | null)?.error?.code;
    return typeof code === "string" && /^[a-z0-9_]{1,64}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

/** `ctx.newOrderHandler` ở route công khai (không ai đăng nhập): không đạt, không truy vấn. */
const NOT_SIGNED_IN: NewOrderHandler = { ok: false, message: "Chưa đăng nhập hoặc đã hết hạn đăng nhập." };

export function createApp(opts: AppOptions) {
  const routes = opts.modules.flatMap((m) => m.routes);

  async function dispatch(request: Request, env: Env, exec: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const candidates = routes.flatMap((r) => {
      const params = match(r.path, url.pathname);
      return params ? [{ r, params }] : [];
    });
    if (candidates.length === 0) return error(404, "not_found", "Không tìm thấy.");
    const hit = candidates.find((c) => c.r.method === request.method);
    if (!hit) {
      const allow = [...new Set(candidates.map((c) => c.r.method))].join(", ");
      return json({ error: { code: "method_not_allowed", message: "Phương thức không được hỗ trợ." } }, 405, { allow });
    }

    const misconfigured = opts.checkConfig?.(env);
    if (misconfigured) {
      console.error(JSON.stringify({ level: "error", event: "server_misconfigured", message: misconfigured }));
      return error(500, "server_misconfigured", "Hệ thống chưa được cấu hình đúng. Hãy báo quản trị viên.");
    }
    const blocked = checkWriteRequest(request, url);
    if (blocked) return blocked;

    let staff: StaffProfile | null = null;
    let sessionId: string | null = null;
    let baoTri: unknown;
    if (hit.r.access !== "public") {
      const cur = await opts.currentStaff(request, env, exec);
      if (!cur) return error(401, "unauthenticated", "Chưa đăng nhập hoặc đã hết hạn đăng nhập.");
      staff = cur.staff;
      sessionId = cur.sessionId;
      baoTri = cur.baoTri;
      const maintenance = await opts.injected.maintenanceBlock(env, staff, baoTri);
      if (maintenance) return maintenance;
      // ADR-0014 điều 2: SUPER_ADMIN = any ở mọi thao tác, kể cả admin.manage — không thay thế ADMIN, nên tài khoản chỉ giữ SUPER_ADMIN (không giữ ADMIN)
      // vẫn phải dùng được route access "admin" (bản đồ quyền — MATRIX — đã cho phép; cổng thô này chỉ đi theo, không siết chặt hơn).
      if (hit.r.access === "admin" && !passesAdminGate(staff)) return error(403, "forbidden", "Chỉ quản trị viên được thực hiện thao tác này.");
      if (hit.r.access === "accounts" && !passesAccountsGate(staff)) return error(403, "forbidden", "Tài khoản này không quản lý được tài khoản.");
      if (hit.r.access === "office" && !isOffice(staff)) return error(403, "forbidden", "Tài khoản này chỉ dùng cho việc được giao, không dùng màn hình này.");
      if (hit.r.access === "orders" && !canAccessOrders(staff)) return error(403, "forbidden", "Tài khoản này không dùng được màn hình đơn.");
    }
    const who = staff;
    // Mốc bắt đầu request (trước handler): dòng nhật ký do handler ghi luôn có created_at ≥ mốc này (đồng hồ một request không lùi) — xem `batDau` ở trên.
    const batDau = new Date().toISOString();
    // `envH` = env đưa cho handler và cho các hàm tiêm có câu đi vào CHÍNH lô của handler (ADR-0094 đặc tả §3.5 bẫy 6) — bản BỌC khi lệnh mang vé. Việc
    // bắn-và-quên (Bảng tin, đóng kết nối, gõ cửa) ghi trong waitUntil, KHÔNG thuộc lô của lệnh ⇒ luôn dùng `env` gốc (không ăn vé, không bị từ chối).
    const chayHandler = (envH: Env): Promise<Response> => hit.r.handler({
      request, env: envH, exec, url, params: hit.params, staff, sessionId, baoTri,
      isAssigned: (orderId) => (who ? opts.injected.isAssigned(envH, who.id, orderId) : Promise.resolve(false)),
      newOrderHandler: (staffId) => (who ? opts.injected.newOrderHandler(envH, who, staffId) : Promise.resolve(NOT_SIGNED_IN)),
      ordersWithHandler: (orderIds) => opts.injected.ordersWithHandler(envH, orderIds),
      myHandledOrderIds: () => (who ? opts.injected.handledOrderIdsOf(envH, who.id) : Promise.resolve([])),
      partyAccount: (partyId) => (who ? opts.injected.partyAccount(envH, who, partyId) : Promise.resolve({ linked: true, manageable: false } as const)),
      baoThayDoi: (e) => {
        if (!who) return; // route công khai: không ai "báo" thay mặt.
        exec.waitUntil(Promise.resolve().then(() => opts.injected.baoThayDoi(env, who, e, batDau)).catch((err) => ghiLoiBangTin("bao", err)));
      },
      baoThayDoiChuyen: (e) => {
        if (!who || typeof opts.injected.baoThayDoiChuyen !== "function") return;
        exec.waitUntil(Promise.resolve().then(() => opts.injected.baoThayDoiChuyen(env, who, e)).catch((err) => ghiLoiBangTin("bao_chuyen", err)));
      },
      dongBangTin: (muc) => {
        exec.waitUntil(Promise.resolve().then(() => opts.injected.dongBangTin(env, muc)).catch((err) => ghiLoiBangTin("dong", err)));
      },
      giaoLoDay: (ds) => opts.injected.giaoLoDay(env, ds),
      // Thiếu hàm tiêm (khung thử cố ý) → null: route chặn, không đoán (I25). Kiểm lúc GỌI, không lúc dựng app (typeof — JS không kiểm kiểu).
      mocToiThieu: () => (typeof opts.injected.mocToiThieu === "function" ? opts.injected.mocToiThieu(envH) : Promise.resolve(null)),
      // ADR-0104 Đ2.1: `sauKhiGhi` bọc thêm việc báo Bảng tin / tin chuyến cho từng khúc thắng (khuôn baoThayDoiChuyen bên trên — bắn-và-quên, env gốc).
      dongBoChuyen: async (x) => {
        if (!who || typeof opts.injected.dongBoChuyen !== "function") return dongBoDiThang(x);
        const d = await opts.injected.dongBoChuyen(envH, who, x);
        return {
          ...d,
          sauKhiGhi: (kq) => {
            const r = d.sauKhiGhi(kq);
            if (typeof opts.injected.baoThayDoiChuyen === "function") {
              for (const b of r.bao) exec.waitUntil(Promise.resolve().then(() => opts.injected.baoThayDoiChuyen(env, who, b)).catch((err) => ghiLoiBangTin("bao_chuyen", err)));
            }
            return r;
          },
        };
      },
      nguongHetHan: () => (typeof opts.injected.nguongHetHan === "function" ? opts.injected.nguongHetHan(envH) : Promise.resolve(NGUONG_MAC_DINH)),
      huongDanVien: () => (typeof opts.injected.huongDanVien === "function" ? opts.injected.huongDanVien(envH) : Promise.resolve([])),
      nhanNhanVien: (ids) =>
        typeof opts.injected.nhanNhanVien !== "function" ? Promise.resolve(null) : ids.length === 0 ? Promise.resolve(new Map()) : opts.injected.nhanNhanVien(envH, ids),
      taiKhoanXacMinh: () => (who && typeof opts.injected.taiKhoanXacMinh === "function" ? opts.injected.taiKhoanXacMinh(envH) : Promise.resolve([])),
      cauAnDanhPhien: (id, at, by) => (typeof opts.injected.cauAnDanhPhien === "function" ? opts.injected.cauAnDanhPhien(envH, id, at, by) : null),
      hanGiuPhienNgay: () => (who && typeof opts.injected.hanGiuPhienNgay === "function" ? opts.injected.hanGiuPhienNgay(envH) : Promise.resolve(null)),
      benDatCuaToi: () => (who && typeof opts.injected.benDatCuaToi === "function" ? opts.injected.benDatCuaToi(envH, who) : Promise.resolve(null)),
      // Lười (kế hoạch R9): gọi opts.injected.gopHoSo(env) trong từng phương thức — app dựng bằng injected cũ (src/shared/router.test.ts) không vỡ ở route khác.
      gopHoSo: {
        viecCua: (id) => opts.injected.gopHoSo(envH).viecCua(id),
        donNguoiDat: (id) => opts.injected.gopHoSo(envH).donNguoiDat(id),
        cauDoiDon: (tu, sang, at) => opts.injected.gopHoSo(envH).cauDoiDon(tu, sang, at),
        soDongNo: (id) => opts.injected.gopHoSo(envH).soDongNo(id),
        soDangNhap: () => opts.injected.gopHoSo(envH).soDangNhap(),
      },
      nhapKeToanCuaDon: (ids) =>
        typeof opts.injected.nhapKeToanCuaDon !== "function" ? Promise.resolve(null) : ids.length === 0 ? Promise.resolve(new Set<string>()) : opts.injected.nhapKeToanCuaDon(envH, ids),
      daThuCuaDon: (id) => (typeof opts.injected.daThuCuaDon !== "function" ? Promise.resolve(null) : opts.injected.daThuCuaDon(envH, id)),
      hoiDaChup: (q) => (typeof opts.injected.hoiDaChup !== "function" ? Promise.resolve(null) : opts.injected.hoiDaChup(envH, q).then((ngay) => ({ ngay }))),
      chuyenChoTin: (q) =>
        // Không hỏi chuyến NÀO và không hỏi chặng nào → không truy vấn. Hỏi CHỈ chặng (MQ-07) vẫn phải gọi hàm thật — chuyến suy từ suất của chặng.
        typeof opts.injected.chuyenChoTin !== "function" ? Promise.resolve(null)
          : q.tripIds.length === 0 && !q.legIds?.length ? Promise.resolve({ chuyen: [], vang: [] }) : opts.injected.chuyenChoTin(envH, q),
    } as Ctx);

    // ---- LỚP CHỐNG GHI TRÙNG (ADR-0094 đ3; đặc tả §3.3 bước 1–8), giai đoạn 1. SAU mọi cổng (đăng nhập, bảo trì, access), TRƯỚC handler; chỉ route GHI có
    // đăng nhập, không nằm trong tệp miễn (src/shared/lan-gui-mien.ts).
    if (!WRITE_METHODS.has(request.method) || !who || laMienLanGui(request.method, hit.r.path)) return chayHandler(env);
    const lanGui = opts.injected.lanGui;
    if (typeof lanGui !== "object" || lanGui === null) {
      // T18: thiếu phần tiêm thì TỪ CHỐI lệnh ghi, không lặng lẽ tắt lớp.
      console.error(JSON.stringify({ level: "error", event: "server_misconfigured", message: "Thiếu injected.lanGui (lớp chống ghi trùng)." }));
      return error(500, "server_misconfigured", "Hệ thống chưa được cấu hình đúng. Hãy báo quản trị viên.");
    }
    const duong = `${request.method} ${hit.r.path}`; // MẪU route — không id, không dữ liệu
    const ve = request.headers.get(HEADER_VE);
    if (ve === null) {
      // Bước 1, giai đoạn 1 (đ7): thiếu vé ⇒ cho qua và ĐẾM (máy còn bản cũ). Bản siết sẽ trả 400.
      console.warn(JSON.stringify({ event: "thieu_ma_lan_gui", duong }));
      return chayHandler(env);
    }
    if (!kiemKhoa(ve)) return error(400, "ma_lan_gui_sai_dang", "Mã lần gửi không hợp lệ. Tải lại trang rồi thử lại.");

    // Bước 2: vân tay của phương thức + đường dẫn thật (kèm query) + thân THÔ — đọc từ bản sao, handler đọc bản gốc.
    const vanTay = await lanGui.vanTay(env, request.method, url.pathname + url.search, await request.clone().text());
    const tra = () => lanGui.tra(env.DB, who.id, ve);
    /** Bước 3a–3d: trả lời cho lần gửi trúng một vé đã có dòng. */
    const traLoiVeCo = (dong: DongVe): Response => {
      const loai = phanLoai(dong, vanTay, Date.now());
      if (loai === "khac_noi_dung") return error(422, "ma_lan_gui_khac_noi_dung", "Lần gửi trước đã ghi với nội dung khác. Tải lại để xem.");
      if (loai === "dang_xu_ly") return error(409, "dang_xu_ly", "Lần bấm trước đang được xử lý. Chờ chút rồi thử lại.");
      exec.waitUntil(lanGui.tangLap(env.DB, who.id, ve).catch((e) => ghiLoiLanGui("tang_lap", e))); // A-1
      const p = thanPhatLai(dong, loai);
      return json(p.body, p.status, { [HEADER_PHAT_LAI]: "true" });
    };

    const dong0 = await tra(); // Bước 3: tra trước bằng env GỐC
    if (dong0) return traLoiVeCo(dong0);

    // Bước 4: handler chạy với env BỌC — lô ghi đầu tiên thành công mang câu chèn vé.
    const boc = bocDb(env.DB, (g) => lanGui.cauChenVe(g, { staffId: who.id, khoa: ve, vanTay, duong, at: new Date().toISOString() }));
    const capNhat = (maTra: number, maLoi: string | null, ketQua: string | null): void =>
      exec.waitUntil(lanGui.capNhatKetQua(env.DB, { staffId: who.id, khoa: ve, maTra, maLoi, ketQua, at: new Date().toISOString() }).catch((e) => ghiLoiLanGui("cap_nhat", e)));
    let res: Response;
    try {
      res = await chayHandler({ ...env, DB: boc.db });
    } catch (e) {
      boc.dong();
      ghiNhieuLan(duong, boc.soLanGhi());
      if (boc.dungVe()) {
        // Bước 5 ở nhánh NÉM (handler ném lại lỗi đụng vé — vd createOrder): không tin lỗi của handler; tra lại, không thấy thì "đang xử lý" (không 500).
        const d = await tra();
        return d ? traLoiVeCo(d) : error(409, "dang_xu_ly", "Lần bấm trước đang được xử lý. Chờ chút rồi thử lại.");
      }
      if (boc.daGhiVe()) capNhat(500, null, null); // Bước 8: đã ghi vé ⇒ lần sau "đã ghi, tải lại để xem"
      else {
        // Bước 7 ở nhánh ném (lỗi khác, nhưng một lần gửi đồng thời cùng vé có thể đã thắng): tra lại một lần.
        const d = await tra();
        if (d) return traLoiVeCo(d);
      }
      throw e;
    }
    boc.dong(); // lệnh ghi trễ của handler (waitUntil) đi thẳng D1 gốc
    ghiNhieuLan(duong, boc.soLanGhi());
    if (boc.dungVe()) {
      // Bước 5: lô đụng khoá vé (lần gửi đồng thời đã thắng) — KHÔNG tin phản hồi handler tự dựng (có thể đã nuốt lỗi).
      const d = await tra();
      if (d) return traLoiVeCo(d);
      return error(409, "dang_xu_ly", "Lần bấm trước đang được xử lý. Chờ chút rồi thử lại.");
    }
    if (boc.daGhiVe()) {
      // Bước 6: ghi kết quả lần đầu (chạy nền). Mã lỗi máy chỉ khi 4xx; địa chỉ kết quả chỉ khi 2xx và là đường dẫn nội bộ chỉ chứa id.
      const maLoi = res.status >= 400 && res.status < 500 ? await maLoiCua(res) : null;
      capNhat(res.status, maLoi, res.status < 300 ? ketQuaDeLuu(res.headers.get("location")) : null);
      return res;
    }
    if (res.status >= 400) {
      // Bước 7: handler báo lỗi mà lệnh này không ghi vé — có thể một lần gửi đồng thời cùng vé đã thắng (vd handler đọc thấy "đã có" rồi trả 409).
      const d = await tra();
      if (d) return traLoiVeCo(d);
    }
    return res;
  }

  return {
    async fetch(request: Request, env: Env, exec: ExecutionContext): Promise<Response> {
      try {
        return await dispatch(request, env, exec);
      } catch (e) {
        const requestId = request.headers.get("cf-ray") ?? crypto.randomUUID();
        // Sổ tiền lượt 1 (ADR-0025 đ4; kiểm độc lập T-1): route đã đọc "chưa Đã giao" nhưng người khác bấm Đã giao / Hoàn thành giữa lúc đọc và lúc ghi →
        // trigger 0044 RAISE (`order_delivered:` / `order_completed:`), cả lô đã huỷ. Trả 409 câu cố định (không lộ chữ thô của CSDL), không 500 chung.
        const msg = e instanceof Error ? e.message : String(e);
        if (/\border_(delivered|completed):/.test(msg)) {
          console.warn(JSON.stringify({ level: "warn", event: "order_delivered_race", requestId, method: request.method, path: new URL(request.url).pathname }));
          return json({ error: { code: "order_delivered", message: "Đơn đã ở bước Đã giao – đã thu đủ (vừa có người bấm) — không sửa được nữa. Tải lại để xem đơn mới nhất." } }, 409);
        }
        const err = e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : { message: String(e) };
        console.error(JSON.stringify({ level: "error", event: "unhandled", requestId, method: request.method, path: new URL(request.url).pathname, error: err }));
        return json({ error: { code: "internal", message: "Có lỗi hệ thống. Thử lại sau; nếu còn lỗi, báo quản trị viên kèm mã này.", requestId } }, 500);
      }
    },
  };
}
