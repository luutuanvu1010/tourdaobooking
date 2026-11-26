// Trang Quản lý tài khoản (/staff). Bố cục: khuôn Danh sách của khung gốc (ADR-0222, đợt D1) — đầu trang (lối sang), thanh lọc theo vai trò
// với nút «Thêm tài khoản» ở mép phải, MỘT khối bảng (khối từ 800 là bảng, hẹp hơn là danh sách dòng), rồi khối «Hàng chờ xác minh» (public/staff.html). Biểu mẫu thêm, sửa và hộp tắt bảo mật
// hai lớp mở trong bảng trượt (web/bang-truot.ts); lỗi của thao tác hiện trong bảng đang mở. PIN mới hiện ở khối #secret trên trang, đúng một lần.
// Đợt D1 chỉ đổi bố cục: mọi ô, nút, điều kiện hiện nút theo quyền và lời gọi máy chủ giữ nguyên.
import { ApiError, api, type StaffAccount, type Api } from "./api";
import { NHAN_LY_DO_KHOP } from "../src/shared/ho-so-trung";
import { PERMISSION_CODES, PERMISSION_LABEL, can, isExternalPermission, type PermissionCode } from "../src/shared/permissions";
import { ROLE_CODES, canManageAccount, rolesLabelTheo, tuDoiQuyenCuaMinh } from "../src/shared/roles";
import { CAU_CHO_QUAN_TRI_CAP_PIN, CAU_NHAC_DAT_LAI_PIN_SAU_GAN_VAI } from "../src/shared/xem-moi-khach";
import { chonLocHopLe, locTheoVai, nutLocVai } from "../src/shared/loc-tai-khoan";
import { homeRedirect } from "../src/shared/start-page";
import { byId, h, replaceChildren } from "./dom";
import { hoiXacNhan, moBangTruot, type BangTruot } from "./bang-truot";
import { trangThaiHeThong, trangThaiToanTrang } from "./trang-thai-he-thong";
import { nhoKhoi } from "./giu-khoi";
import { dateTime } from "./format";
import { rolePicker, type RolePicker, type RolePickerValue } from "./role-picker";
import { CHINH_SACH_DAY_DU, anPhanTu, taiChinhSach, type ChinhSachUi } from "./chinh-sach-giao-dien";
import { initShell, showError } from "./shell";
import { nhanHaiLop } from "../src/shared/hai-lop-hien-thi";
import { dungHangChoXacMinh } from "./xac-minh-hang-cho";
import { dauXacMinh } from "./dau-xac-minh";
import { CHU_CAP, suaDuocCot, thayCotCap } from "../src/shared/cap-hien-hanh-hien-thi";
import { datTieuDiemODongCap, oCap, oCapDangNap, oCapKhongTai, taiCapHienHanh } from "./cot-cap-dai-ly";
import type { CapHienHanhDto } from "../src/shared/contracts";
import { luoi, thanhNut, truong } from "./khung";

const errorEl = byId("error");
const listEl = byId("list");
const listCardsEl = byId("list-cards");
const locVaiEl = byId("loc-vai");
const secretEl = byId("secret");
const khoiEl = byId("tk-khoi");
const permissionsLabel = (list: readonly PermissionCode[]): string => (list.length ? list.map((p) => PERMISSION_LABEL[p]).join(", ") : "—");
const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

/** Nơi hiện lỗi: dải lỗi của trang, hoặc dải lỗi của bảng trượt đang mở (dải của trang nằm sau bảng, không ai thấy). */
let noiLoi: HTMLElement = errorEl;
const baoLoi = (cau: string | null): void => showError(noiLoi, cau);

/** Tài khoản đã gán vai → tên vai; chưa gán → quyền cũ kèm ghi chú (chờ chuyển sang cách mới, đặc tả §14). */
// Task 3b: tên vai hiện hành từ máy chủ (GET /api/staff → tenVai); trước lần nạp đầu / nạp lỗi thì rỗng ⇒ tên gốc.
let tenVai: Readonly<Record<string, string>> = {};
const accessLabel = (s: StaffAccount): string => (s.roles.length ? rolesLabelTheo(s.roles, tenVai) : s.lamChoToChuc ? "Người làm cho tổ chức" : `${permissionsLabel(s.permissions)} (chưa gán vai trò)`);
const EMPTY: RolePickerValue = { roles: [], adds: [], removes: [], reason: "" };
const TU_DOI_QUYEN = "Vai trò vừa chọn làm đổi quyền của chính bạn — không ai tự đổi quyền của mình được (chống tự khoá). Hãy nhờ người quản trị khác. Chưa lưu gì.";
const TU_DOI_QUYEN_TOAN_QUYEN =
  "Vai trò vừa chọn làm đổi quyền của chính bạn — không ai tự đổi quyền của mình được (chống tự khoá). Toàn quyền đã làm được mọi việc của mọi vai trò, nên không cần tự gán thêm. Chưa lưu gì.";
const sameAssignment = (a: RolePickerValue, b: RolePickerValue): boolean => sameSet(a.roles, b.roles) && sameSet(a.adds, b.adds) && sameSet(a.removes, b.removes);
let meSuper = false;
let meQuanTri = false; // ADR-0169 Đ3
// ADR-0042 + ADR-0071 điều 1e: đặt lại PIN, gỡ Face ID, mở khoá — Quản trị + Toàn quyền (ô account.access.manage); HCNS không thấy nút (máy chủ vẫn chặn 403).
let canAccessManage = false;

let me: { id: string; permissions: readonly PermissionCode[] };
let accounts: Api.StaffListRowDto[] = [];
// Cột «Cấp độ đại lý» (ADR-0155 Đ2): chỉ khi người xem có ô xem hoa hồng đối tác và không giữ quyền Đối tác (`thayCotCap`) — Hành chính nhân sự không thấy và không gọi route.
// `capHienHanh`: undefined = đang nạp lần đầu (ô hiện «Đang tải…»); null = nạp lỗi (ô hiện «—», bảng tài khoản vẫn vẽ).
// Cấp nạp SONG SONG với danh sách tài khoản (kiểm độc lập m-2): bảng vẽ ngay khi danh sách về, không chờ route cấp.
let hienCotCap = false;
let capHienHanh: Map<string, CapHienHanhDto> | null | undefined = undefined;
let lanNapCap = 0; // số thứ tự lần nạp: lần nạp cũ về muộn không ghi đè lần mới hơn
let daVeLanDau = false; // đã vẽ bảng từ danh sách chưa — cấp về trước thì để `load` vẽ, về sau thì vẽ lại
const cotCapEl = byId("cot-cap");
/** ADR-0194 đợt 1: hai cột phụ (Tạo lúc, Đăng nhập gần nhất) Toàn quyền có thể ẩn — chỉ hiển thị; lỗi tải = mặc định đầy đủ. Tải TRƯỚC lần vẽ đầu. */
let chinhSach: ChinhSachUi = CHINH_SACH_DAY_DU;
const anCot = (truong: string): boolean => chinhSach.an("danh-sach-tai-khoan", truong);

// Bộ lọc theo vai trò (đặt vé của đối tác, lượt 1, Task 4; đặc tả §4.4): lọc ngay trên danh sách ĐÃ NẠP (`accounts`), cả bảng máy tính lẫn dòng điện thoại; bấm nút chỉ vẽ lại, không gọi máy chủ.
// Lựa chọn nhớ theo phiên (sessionStorage — có thể bị chặn / không có: bọc try/catch, trang vẫn chạy với «Tất cả»). Luật chọn nút / lọc / giữ lựa chọn ở src/shared/loc-tai-khoan.ts.
const KHOA_NHO_LOC = "tk-loc-vai";
const docLocNho = (): string | null => {
  try {
    return sessionStorage.getItem(KHOA_NHO_LOC);
  } catch {
    return null;
  }
};
const nhoLoc = (khoa: string): void => {
  try {
    sessionStorage.setItem(KHOA_NHO_LOC, khoa);
  } catch {
    /* không nhớ được thì thôi */
  }
};
let locVai: string | null = docLocNho();

const reasonOf = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const fail = (err: unknown) => baoLoi(reasonOf(err));

/** Nút «Đóng» của chân bảng trượt (chỉ gập bảng). */
const nutDongBang = (bang: () => BangTruot | null): HTMLButtonElement => {
  const b = h("button", { type: "button", class: "nut", "data-co": "lon" }, "Đóng");
  b.addEventListener("click", () => bang()?.close());
  return b;
};

/** Khối #secret: đầu khối + thân. */
function veKhoiBiMat(tieuDe: string, ...than: (HTMLElement | null)[]): void {
  replaceChildren(secretEl, h("header", { class: "khoi-dau" }, h("h2", null, tieuDe)), ...than);
  secretEl.hidden = false;
  secretEl.scrollIntoView({ block: "nearest" });
}
const anKhoiBiMat = (): void => {
  secretEl.hidden = true;
  replaceChildren(secretEl);
};

/** ADR-0191 mục 5: thay hộp «PIN của tài khoản mới» khi máy chủ không trả PIN (`pin: null`). */
function hienChoCapPin(name: string, phone: string): void {
  const close = h("button", { type: "button", class: "nut", "data-cap": "loi" }, "Đóng");
  close.addEventListener("click", anKhoiBiMat);
  veKhoiBiMat("Tài khoản mới", h("p", null, `${name} — ${phone}`), h("p", { class: "alert warn" }, CAU_CHO_QUAN_TRI_CAP_PIN), thanhNut(null, close));
}

/** PIN chỉ hiện đúng một lần ở đây; không lưu vào bất kỳ đâu phía client. */
function showSecrets(title: string, rows: { name: string; phone: string; pin: string }[]): void {
  const copy = h("button", { type: "button", class: "nut", "data-cap": "phu" }, "Sao chép danh sách");
  copy.addEventListener("click", async () => {
    await navigator.clipboard?.writeText(rows.map((r) => `${r.name}\t${r.phone}\t${r.pin}`).join("\n")).catch(() => undefined);
    copy.textContent = "Đã sao chép";
  });
  const close = h("button", { type: "button", class: "nut", "data-cap": "loi" }, "Đã ghi lại, ẩn đi");
  close.addEventListener("click", anKhoiBiMat);
  veKhoiBiMat(
    title,
    h("p", { class: "alert warn" }, "PIN chỉ hiển thị một lần duy nhất. Hãy gửi riêng cho từng người (không gửi vào nhóm chung); họ nên tự đổi PIN sau khi đăng nhập."),
    h("table", { class: "bang" }, h("thead", null, h("tr", null, h("th", null, "Họ tên"), h("th", null, "Số điện thoại (tên đăng nhập)"), h("th", null, "PIN"))),
      h("tbody", null, ...rows.map((r) => h("tr", null, h("td", null, r.name), h("td", null, r.phone), h("td", { class: "pin" }, r.pin))))),
    thanhNut(null, copy, close),
  );
}

async function act<T>(fn: () => Promise<T>): Promise<T | undefined> {
  baoLoi(null);
  try {
    return await fn();
  } catch (err) {
    fail(err);
    return undefined;
  }
}

// ADR-0042 + ADR-0071 điều 1c: Quản trị / HCNS chỉ tác động được tài khoản cấp dưới (CÙNG luật mayManage của máy chủ — canManageAccount ở src/shared/roles.ts)
// — ẩn nút trên tài khoản giữ Quản trị / Toàn quyền / Nhân sự (máy chủ trả tài khoản Toàn quyền như Quản trị thường cho người không giữ Toàn quyền).
const quanDuoc = (s: StaffAccount): boolean => s.id === me.id || canManageAccount(me.permissions, s.permissions);

/** Nhãn "Hai lớp: …" (ADR-0074; đặc tả §13 — ô account.view): trạng thái và hạn do máy chủ trả theo dòng. */
const nhanHaiLopEl = (s: Api.StaffListRowDto): HTMLElement => h("span", { class: "huy-hieu", "data-tong": s.mfa.enabled ? "la" : "cat" }, nhanHaiLop(s.mfa, Date.now()));

/**
 * Hộp xác nhận "Tắt bảo mật hai lớp" (ADR-0074 điều 5; đặc tả §4.5) — mở trong bảng trượt. Nút chỉ hiện khi máy chủ trả cờ `canResetMfa`
 * cho dòng đó (cùng hàm cổng với route — trang không tự suy từ vai). Tài khoản chưa bật: tắt = mở 24 giờ cho người đó tự bật ở lần đăng nhập PIN kế tiếp
 * (dùng khi đã quá hạn và bị chặn — đặc tả §4.4).
 */
function openTatHaiLop(s: Api.StaffListRowDto): void {
  const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null; // nút vừa bấm: bảng đóng thì tiêu điểm về đó
  const loi = h("div", { class: "alert", role: "alert", hidden: true });
  const xacNhan = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "nguy-hiem", id: "mfa-reset-confirm" }, "Xác nhận tắt");
  const dong = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "loi" }, "Huỷ");
  const bang = moBangTruot({
    title: `Tắt bảo mật hai lớp: ${s.fullName}`,
    body: [
      h(
        "div",
        { class: "maint-confirm", role: "group", "aria-label": "Xác nhận tắt bảo mật hai lớp" },
        s.mfa.enabled
          ? h("p", null, h("strong", null, "Ứng dụng xác thực, mã dự phòng và mọi máy được tin của người này hết hiệu lực; mọi máy đang đăng nhập bị đăng xuất ngay."))
          : h("p", null, h("strong", null, "Người này chưa bật bảo mật hai lớp. Xác nhận để mở 24 giờ cho họ tự bật (dùng khi họ đã quá hạn và bị chặn đăng nhập); mọi máy đang đăng nhập bị đăng xuất.")),
        h("p", null, "Nhân viên nội bộ có 24 giờ để tự bật lại ở lần đăng nhập bằng PIN kế tiếp; quá 24 giờ phải nhờ lại. Chỉ làm khi đã chắc đúng người (ví dụ họ gọi báo mất hoặc đổi điện thoại)."),
        loi,
      ),
    ],
    foot: [dong, xacNhan],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  xacNhan.addEventListener("click", async () => {
    showError(loi, null);
    xacNhan.disabled = true;
    bang.setBusy(true);
    try {
      await api(`/api/staff/${s.id}/mfa-reset`, { method: "POST" });
    } catch (err) {
      xacNhan.disabled = false;
      return showError(loi, reasonOf(err));
    } finally {
      bang.setBusy(false);
    }
    replaceChildren(
      bang.body,
      h("p", { class: "alert ok", id: "mfa-reset-done" }, `Đã tắt bảo mật hai lớp: ${s.fullName}. Mọi máy của người này đã bị đăng xuất. Nhắc họ đăng nhập bằng PIN trong 24 giờ tới để bật lại bảo mật hai lớp trên điện thoại của họ.`),
    );
    replaceChildren(bang.foot, nutDongBang(() => bang));
    await load();
  });
}

/** Nạp cấp hiện hành (MỘT chỗ duy nhất gọi route cấp). Không hiện cột ⇒ không gọi gì (Hành chính nhân sự không có ô xem). Về xong thì vẽ lại nếu bảng đã vẽ. */
function napCap(): Promise<void> {
  if (!hienCotCap) return Promise.resolve();
  const lan = ++lanNapCap;
  return taiCapHienHanh().then((m) => {
    if (lan !== lanNapCap) return;
    capHienHanh = m;
    if (daVeLanDau) ve();
  });
}
/** Sau khi lưu một cấp ở bảng bấm: nạp lại cấp hiện hành, vẽ lại (không gọi lại danh sách tài khoản), rồi đặt tiêu điểm bàn phím về ô của đúng hồ sơ vừa lưu (nút mở bảng đã bị vẽ lại). */
async function lamMoiCap(partyId: string): Promise<void> {
  await napCap();
  datTieuDiemODongCap(partyId);
}
/** Nội dung ô «Cấp độ đại lý» của một dòng (bảng và dòng điện thoại dùng CHUNG một hàm); null = không có ô (người xem không thấy cột, hoặc dòng không giữ quyền Đối tác). */
const oCapCuaS = (s: Api.StaffListRowDto): HTMLElement | null =>
  !hienCotCap
    ? null
    : capHienHanh === undefined
      ? oCapDangNap(s)
      : capHienHanh === null
        ? oCapKhongTai(s)
        : oCap(s, s.partyId === null ? undefined : capHienHanh.get(s.partyId), suaDuocCot(me), lamMoiCap);

/** Tài khoản đang tắt: «Chưa kích hoạt» (sinh từ phiếu đăng ký, chưa tự đặt PIN — ADR-0207 Đ7) hoặc «Ngưng». */
const trangThaiTat = (s: Api.StaffListRowDto): HTMLElement =>
  s.chuaKichHoat ? h("span", { class: "huy-hieu", "data-tong": "cat", "data-chua-kich-hoat": "1" }, "Chưa kích hoạt") : h("span", { class: "huy-hieu", "data-tong": "xam" }, "Ngưng");

/** Các huy hiệu của một tài khoản (dòng phụ dưới tên): đang tắt, bị khoá, hai lớp. */
const huyHieuCua = (s: Api.StaffListRowDto): HTMLElement =>
  h(
    "span",
    { class: "o-phu tk-huy-hieu" },
    !s.active && !anCot("active") && trangThaiTat(s),
    !s.active && !anCot("active") && " ",
    s.locked && h("span", { class: "huy-hieu", "data-tong": "cat" }, "Bị khoá đăng nhập"),
    s.locked && " ",
    nhanHaiLopEl(s),
  );

function row(s: Api.StaffListRowDto): HTMLElement {
  const btn = (label: string, onclick: (b: HTMLButtonElement) => void, cap = "loi") => {
    const b = h("button", { type: "button", class: "nut", "data-cap": cap }, label);
    b.addEventListener("click", () => onclick(b));
    return b;
  };
  const isMe = s.id === me.id;
  return h(
    "tr",
    { "data-ngung": s.active ? undefined : "" },
    h(
      "td",
      null,
      s.fullName,
      isMe && h("span", { class: "muted" }, " (bạn)"),
      dauXacMinh(s.dauXacMinh),
      huyHieuCua(s),
      // Ba cột Số điện thoại, Tạo lúc, Đăng nhập gần nhất nằm thành MỘT dòng phụ dưới tên (bảng khai data-cot-phu="an": cột phụ ẩn ở mọi bề rộng — tham số khuôn
      // Danh sách ở public/app.css): bảng còn chỗ cho hàng nút cuối dòng (phát hiện người chấm giao diện, đợt D1). Mỗi mẩu không ngắt giữa (data-manh).
      h(
        "span",
        { class: "o-phu", "data-thay-cot": "", "data-manh": "" },
        h("span", null, s.phone),
        !anCot("createdAt") && h("span", null, `Tạo lúc ${dateTime(s.createdAt)}`),
        !anCot("lastLoginAt") && h("span", null, s.lastLoginAt ? `Đăng nhập ${dateTime(s.lastLoginAt)}` : "Chưa ghi nhận đăng nhập"),
      ),
    ),
    h("td", { "data-gon": "", "data-cot-phu": "" }, s.phone),
    h("td", null, accessLabel(s)),
    hienCotCap && h("td", { "data-co": "" }, oCapCuaS(s)), // cột co về bề rộng tối thiểu: chỗ dư dành cho hàng nút
    h("td", { class: "muted", "data-cot-phu": "", hidden: anCot("createdAt") }, dateTime(s.createdAt)),
    h("td", { class: "muted", "data-cot-phu": "", hidden: anCot("lastLoginAt") }, s.lastLoginAt ? dateTime(s.lastLoginAt) : "Chưa ghi nhận"),
    h(
      "td",
      null,
      h(
        "div",
        { class: "hang", "data-mot-hang": "" },
        quanDuoc(s) && btn("Sửa", (b) => void openEdit(s, b), "phu"),
        // Cờ máy chủ theo dòng (ADR-0090 đ2): cùng hàm với cổng route — hai ô, cấp dưới, không phải chính mình (DK-T3-02: đổi PIN của mình ở trang "Tôi"),
        // tài khoản có quyền tiền chỉ Toàn quyền. Trang không tự tính.
        s.datLaiPinDuoc &&
          btn("Đặt lại PIN", async () => {
            if (!(await hoiXacNhan({ tieuDe: "Đặt lại PIN", hauQua: `Đặt lại PIN của ${s.fullName}? PIN cũ, Face ID và mọi máy đang đăng nhập sẽ mất hiệu lực.`, nhanNguyHiem: "Đặt lại PIN" }))) return;
            const r = await act(() => api<Api.StaffWithPinResponse>(`/api/staff/${s.id}/reset-pin`, { method: "POST" }));
            if (r) {
              showSecrets("PIN mới", [{ name: s.fullName, phone: s.phone, pin: r.pin }]);
              await load();
            }
          }),
        canAccessManage && quanDuoc(s) && s.locked && !s.chuaKichHoat && btn("Mở khoá", async () => {
          if (await act(() => api(`/api/staff/${s.id}/unlock`, { method: "POST" }))) await load();
        }),
        // Cờ máy chủ theo dòng (ADR-0074 điều 5, ADR-0090 đ1 iv) — cùng hàm cổng với route POST /api/staff/:id/mfa-reset; Nhân sự không có.
        s.canResetMfa && btn("Tắt bảo mật hai lớp", () => openTatHaiLop(s), "nguy-hiem"),
        // Không hiện trên hàng của chính admin đang đăng nhập: route quản trị đăng xuất người bị gỡ NGAY mà không cấp cookie mới cho người gọi — tự gỡ của mình làm ở trang "Tôi".
        canAccessManage && quanDuoc(s) &&
          !isMe &&
          s.passkeyCount > 0 &&
          btn(`Gỡ Face ID (${s.passkeyCount})`, async () => {
            if (!(await hoiXacNhan({ tieuDe: `Gỡ Face ID (${s.passkeyCount})`, hauQua: `Gỡ Face ID của ${s.fullName} trên mọi máy? Mọi máy đang đăng nhập của tài khoản này sẽ bị đăng xuất.`, nhanNguyHiem: `Gỡ Face ID (${s.passkeyCount})` }))) return;
            if (await act(() => api(`/api/staff/${s.id}/passkeys/remove-all`, { method: "POST" }))) await load();
          }),
        quanDuoc(s) &&
          !isMe &&
          !s.chuaKichHoat && // ADR-0207 Đ7: tài khoản chưa kích hoạt chỉ có đường «Gửi lại lời mời» (hàng chờ phiếu đăng ký); máy chủ trả 409 cho «Kích hoạt lại»
          btn(
            s.active ? "Ngưng" : "Kích hoạt lại",
            async () => {
              if (s.active && !(await hoiXacNhan({ tieuDe: "Ngưng", hauQua: `Ngưng tài khoản ${s.fullName}? Họ sẽ bị đăng xuất ngay.`, nhanNguyHiem: "Ngưng" }))) return;
              if (await act(() => api(`/api/staff/${s.id}`, { method: "PATCH", body: { active: !s.active } }))) await load();
            },
            s.active ? "nguy-hiem" : "loi",
          ),
      ),
    ),
  );
}

function card(s: Api.StaffListRowDto): HTMLElement {
  const btn = (label: string, onclick: (b: HTMLButtonElement) => void, cap = "loi") => {
    const b = h("button", { type: "button", class: "nut", "data-cap": cap }, label);
    b.addEventListener("click", () => onclick(b));
    return b;
  };
  const isMe = s.id === me.id;
  const oCapThe = oCapCuaS(s); // dòng điện thoại có đúng ô của bảng; null ⇒ không dựng dòng
  return h(
    "div",
    { class: "dong", "data-ngung": s.active ? undefined : "" },
    h(
      "div",
      { class: "dong-chu" },
      h("div", null, h("strong", null, s.fullName), isMe && h("span", { class: "muted" }, " (bạn)"), dauXacMinh(s.dauXacMinh)),
      huyHieuCua(s),
      h("span", { class: "o-phu" }, s.phone, " · ", accessLabel(s)),
      oCapThe && h("div", null, h("span", { class: "muted" }, `${CHU_CAP.nhanCot}: `), oCapThe),
      h("span", { class: "o-phu", hidden: anCot("lastLoginAt") }, s.lastLoginAt ? `Đăng nhập gần nhất ${dateTime(s.lastLoginAt)}` : "Chưa ghi nhận đăng nhập"),
    ),
    h(
      "div",
      { class: "hang" },
      quanDuoc(s) && btn("Sửa", (b) => void openEdit(s, b), "phu"),
      // Cờ máy chủ theo dòng (ADR-0090 đ2): cùng hàm với cổng route — hai ô, cấp dưới, không phải chính mình (DK-T3-02: đổi PIN của mình ở trang "Tôi"),
      // tài khoản có quyền tiền chỉ Toàn quyền. Trang không tự tính.
      s.datLaiPinDuoc &&
        btn("Đặt lại PIN", async () => {
          if (!(await hoiXacNhan({ tieuDe: "Đặt lại PIN", hauQua: `Đặt lại PIN của ${s.fullName}? PIN cũ, Face ID và mọi máy đang đăng nhập sẽ mất hiệu lực.`, nhanNguyHiem: "Đặt lại PIN" }))) return;
          const r = await act(() => api<Api.StaffWithPinResponse>(`/api/staff/${s.id}/reset-pin`, { method: "POST" }));
          if (r) {
            showSecrets("PIN mới", [{ name: s.fullName, phone: s.phone, pin: r.pin }]);
            await load();
          }
        }),
      canAccessManage && quanDuoc(s) && s.locked && !s.chuaKichHoat && btn("Mở khoá", async () => {
        if (await act(() => api(`/api/staff/${s.id}/unlock`, { method: "POST" }))) await load();
      }),
      s.canResetMfa && btn("Tắt bảo mật hai lớp", () => openTatHaiLop(s), "nguy-hiem"),
      // Không hiện trên dòng của chính admin đang đăng nhập: route quản trị đăng xuất người bị gỡ NGAY mà không cấp cookie mới cho người gọi — tự gỡ của mình làm ở trang "Tôi".
      canAccessManage && quanDuoc(s) &&
        !isMe &&
        s.passkeyCount > 0 &&
        btn(`Gỡ Face ID (${s.passkeyCount})`, async () => {
          if (!(await hoiXacNhan({ tieuDe: `Gỡ Face ID (${s.passkeyCount})`, hauQua: `Gỡ Face ID của ${s.fullName} trên mọi máy? Mọi máy đang đăng nhập của tài khoản này sẽ bị đăng xuất.`, nhanNguyHiem: `Gỡ Face ID (${s.passkeyCount})` }))) return;
          if (await act(() => api(`/api/staff/${s.id}/passkeys/remove-all`, { method: "POST" }))) await load();
        }),
      quanDuoc(s) &&
        !isMe &&
        !s.chuaKichHoat && // ADR-0207 Đ7: tài khoản chưa kích hoạt chỉ có đường «Gửi lại lời mời» (hàng chờ phiếu đăng ký); máy chủ trả 409 cho «Kích hoạt lại»
        btn(
          s.active ? "Ngưng" : "Kích hoạt lại",
          async () => {
            if (s.active && !(await hoiXacNhan({ tieuDe: "Ngưng", hauQua: `Ngưng tài khoản ${s.fullName}? Họ sẽ bị đăng xuất ngay.`, nhanNguyHiem: "Ngưng" }))) return;
            if (await act(() => api(`/api/staff/${s.id}`, { method: "PATCH", body: { active: !s.active } }))) await load();
          },
          s.active ? "nguy-hiem" : "loi",
        ),
    ),
  );
}

async function openEdit(s: StaffAccount, opener: HTMLElement | null): Promise<void> {
  const legacy = s.roles.length === 0 && !s.lamChoToChuc; // chưa gán vai: đang dùng quyền cũ (tài khoản chỉ làm cho tổ chức, ADR-0213, không tính)
  // ADR-0083 điều 1a, 1d: sửa quyền kiểu cũ (PUT …/permissions) chỉ người hỏi được ô gán/gỡ Toàn quyền — cùng bảng với máy chủ; người khác chuyển sang vai.
  const quyenCu = legacy && meSuper;
  let saved = EMPTY;
  if (!legacy) {
    const r = await act(() => api<Api.StaffRolesResponse>(`/api/staff/${s.id}/roles`));
    if (!r) return; // lỗi đã hiện ở dải lỗi của trang
    saved = { roles: r.roles, adds: r.adds, removes: r.removes, reason: r.reason ?? "" };
  }
  const name = h("input", { id: "sua-ten", class: "o", type: "text", value: s.fullName, maxLength: 200 });
  const phone = h("input", { id: "sua-sdt", class: "o", type: "tel", value: s.phone });
  const isMe = s.id === me.id;
  const picker = rolePicker({ initial: saved, actorIsSuperAdmin: meSuper, actorLaQuanTri: meQuanTri, current: s.permissions, tenVai });
  const boxes = new Map<PermissionCode, HTMLInputElement>();
  const permissionBoxes = PERMISSION_CODES.map((code) => {
    const box = h("input", { type: "checkbox", class: "o-tick", checked: s.permissions.includes(code), disabled: isMe });
    boxes.set(code, box);
    // ADR-0042: vai ẩn. ADR-0185 Đ2 (K9): không vẽ ô quyền bên ngoài — đường quyền cũ không cấp Đối tác, Tài xế đối tác (máy chủ cũng chặn). Ô vẫn ở `boxes`, tích theo
    // s.permissions: tài khoản kiểu cũ đang giữ quyền đó chỉ đổi tên / số thì không gửi PUT quyền làm rơi quyền.
    return (meSuper || code !== "SUPER_ADMIN") && !isExternalPermission(code) ? h("label", { class: "check" }, box, PERMISSION_LABEL[code]) : null;
  });
  const loi = h("div", { class: "alert", role: "alert", hidden: true });
  const save = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "chinh" }, "Lưu");
  let bang: BangTruot | null = null;
  const cancel = nutDongBang(() => bang);
  bang = moBangTruot({
    title: `Sửa: ${s.fullName}`,
    body: [
      loi,
      luoi(
        null,
        truong("Họ tên", name),
        truong("Số điện thoại đăng nhập", phone, { goiY: "Đổi số điện thoại sẽ đổi tên đăng nhập của người này. Các máy đang đăng nhập vẫn giữ nguyên." }),
        h("h3", null, "Vai trò và quyền"),
        legacy && h("p", { class: "alert warn" }, `Tài khoản này chưa gán vai trò, đang dùng quyền cũ: ${permissionsLabel(s.permissions)}. Chọn vai trò để chuyển sang cách mới — xem dòng "Sẽ mất" trước khi lưu.`),
        isMe && h("p", { class: "muted" }, meSuper ? "Bạn chỉ đổi được vai trò của chính mình khi quyền không đổi. Toàn quyền đã làm được mọi việc của mọi vai trò — không cần tự gán thêm vai trò." : "Bạn chỉ đổi được vai trò của chính mình khi quyền không đổi (xem dòng xem trước)."),
        picker.el,
        !legacy && meQuanTri && h("p", { class: "muted" }, CAU_NHAC_DAT_LAI_PIN_SAU_GAN_VAI), // ADR-0191 mục 3: Quản trị gán được vai xem mọi khách, nhắc đặt lại PIN nếu có người đã biết
        quyenCu && h("details", null, h("summary", null, "Quyền cũ (chỉ dùng khi chưa gán vai trò)"), ...permissionBoxes),
      ),
    ],
    foot: [cancel, save],
    footClass: "vc-foot-2",
    opener,
    onClosed: () => (noiLoi = errorEl),
  });
  if (!bang) return;
  noiLoi = loi;
  const bangSua = bang;
  save.addEventListener("click", async () => {
    if (save.disabled) return;
    const chosen = picker.value();
    const legacyPerms = PERMISSION_CODES.filter((code) => boxes.get(code)!.checked);
    if (!legacy && chosen.roles.length === 0) return baoLoi("Chọn ít nhất một vai trò.");
    if (quyenCu && chosen.roles.length === 0 && !isMe && legacyPerms.length === 0) return baoLoi("Chọn ít nhất một vai trò (hoặc một quyền cũ).");
    // Chủ dự án 2026-10-01: báo TRƯỚC khi lưu (không lưu nửa chừng) khi vai vừa chọn làm đổi quyền của chính mình.
    if (isMe && chosen.roles.length > 0 && !sameAssignment(chosen, saved) && tuDoiQuyenCuaMinh(s.permissions, chosen)) {
      return baoLoi(meSuper ? TU_DOI_QUYEN_TOAN_QUYEN : TU_DOI_QUYEN);
    }
    save.disabled = true;
    bangSua.setBusy(true);
    try {
      const doiTenSo = name.value.trim() !== s.fullName || phone.value.trim() !== s.phone;
      if (!(await act(() => api(`/api/staff/${s.id}`, { method: "PATCH", body: { fullName: name.value, phone: phone.value } })))) return;
      try {
        if (chosen.roles.length > 0 && !sameAssignment(chosen, saved)) {
          const body: Api.StaffRolesRequest = { roles: chosen.roles, adds: chosen.adds, removes: chosen.removes, reason: chosen.reason };
          await api(`/api/staff/${s.id}/roles`, { method: "PUT", body });
        } else if (quyenCu && chosen.roles.length === 0 && !isMe && !sameSet(legacyPerms, s.permissions)) {
          const body: Api.StaffPermissionsRequest = { permissions: legacyPerms };
          await api(`/api/staff/${s.id}/permissions`, { method: "PUT", body });
        }
      } catch (err) {
        // Tên/số điện thoại đã lưu ở lời gọi trên. load() xoá thông báo lỗi (act mở đầu bằng baoLoi(null)), nên nạp lại TRƯỚC rồi mới hiện lý do.
        await load();
        return baoLoi(doiTenSo ? `Đã lưu tên/số điện thoại nhưng chưa đổi được vai trò/quyền: ${reasonOf(err)}` : `Chưa đổi được vai trò/quyền: ${reasonOf(err)}`);
      }
      bangSua.setBusy(false);
      bangSua.close(false); // danh sách sắp được vẽ lại: nút «Sửa» đã mở bảng không còn
      await load();
    } finally {
      save.disabled = false;
      bangSua.setBusy(false);
    }
  });
}

async function load(): Promise<void> {
  void napCap(); // chạy song song với danh sách, KHÔNG chờ: lỗi route cấp không chặn bảng (null ⇒ ô «—»), chậm cũng không làm bảng chậm theo
  const r = await act(() => api<Api.StaffListResponse>("/api/staff"));
  if (!r) return;
  accounts = r.staff;
  tenVai = r.tenVai;
  ve();
  daVeLanDau = true;
}

/** Vẽ hàng nút lọc, bảng và danh sách dòng từ `accounts` đã nạp (không gọi máy chủ). Vai vừa hết người giữ thì nút biến mất và lựa chọn đã nhớ về «Tất cả». */
function ve(): void {
  const nut = nutLocVai(accounts, tenVai);
  const khoa = chonLocHopLe(locVai, nut);
  if (khoa !== locVai) {
    locVai = khoa;
    nhoLoc(khoa);
  }
  const coTieuDiem = locVaiEl.contains(document.activeElement); // bấm nút vẽ lại cả hàng nút: giữ tiêu điểm bàn phím ở đúng nút đó
  const nutEl = new Map<string, HTMLButtonElement>();
  for (const n of nut) {
    const b = h("button", { type: "button", class: "vien", "aria-pressed": n.khoa === khoa ? "true" : "false", "data-loc": n.khoa }, `${n.nhan} (${n.soLuong})`);
    b.addEventListener("click", () => {
      locVai = n.khoa;
      nhoLoc(n.khoa);
      ve();
    });
    nutEl.set(n.khoa, b);
  }
  replaceChildren(locVaiEl, ...nutEl.values());
  locVaiEl.hidden = accounts.length === 0; // chỉ hiện khi có dữ liệu
  if (coTieuDiem) nutEl.get(khoa)?.focus();
  const hien = locTheoVai(accounts, khoa);
  replaceChildren(listEl, ...hien.map(row));
  replaceChildren(listCardsEl, ...hien.map(card));
  khoiEl.hidden = false;
}

// ---- Thêm thủ công (ADR-0018): chọn vai + xem trước; tuỳ chọn dùng hồ sơ cá nhân có sẵn (tra theo SĐT) để không tạo hồ sơ trùng.
// Khối vai dựng SAU khi biết người dùng có phải Toàn quyền không (setupAddForm) — ô Giám đốc/Điều hành chỉ mở cho Toàn quyền.
// Biểu mẫu (#add-form) và nút «Tạo tài khoản» (#add-tao) viết sẵn trong public/staff.html (giữ trong #add-kho ẩn); nút «Thêm tài khoản» chuyển CHÍNH các phần tử đó
// vào bảng trượt mỗi lần mở — không dựng lại, nên ô đã gõ, kết quả tra hồ sơ khớp và lựa chọn vai giữ nguyên khi đóng rồi mở lại.
let addPicker: RolePicker | null = null;
let existingPartyId: string | null = null;
const addForm = byId<HTMLFormElement>("add-form");
const addName = byId<HTMLInputElement>("add-name");
const addPhone = byId<HTMLInputElement>("add-phone");
const existingNote = h("div", { id: "add-khop", class: "muted", hidden: true });
const addLoi = h("div", { class: "alert", role: "alert", hidden: true });
let bangThem: BangTruot | null = null;

function setupAddForm(): void {
  addPicker = rolePicker({ initial: EMPTY, actorIsSuperAdmin: meSuper, actorLaQuanTri: meQuanTri, current: null, tenVai });
  replaceChildren(byId("add-perms"), addPicker.el, existingNote);
}

function openAdd(opener: HTMLElement): void {
  showError(addLoi, null);
  bangThem = moBangTruot({
    title: "Thêm tài khoản",
    body: [addLoi, addForm],
    foot: [nutDongBang(() => bangThem), nutTao],
    footClass: "vc-foot-2",
    opener,
    onClosed: () => {
      noiLoi = errorEl;
      bangThem = null;
    },
  });
  if (bangThem) noiLoi = addLoi;
}

function clearExisting(): void {
  if (existingPartyId) {
    addName.value = "";
    addPicker?.reset(EMPTY); // bỏ các vai đã chọn sẵn theo hồ sơ vừa bỏ chọn
  }
  existingPartyId = null;
  addName.readOnly = false;
  existingNote.hidden = true;
}

// ADR-0068 Đ9 (C1): gõ SĐT hoặc tên → liệt kê MỌI hồ sơ cá nhân khớp; phải chọn "Dùng hồ sơ này" hoặc tick "Vẫn tạo hồ sơ mới" thì nút Tạo mở. Máy chủ kiểm lại
// (409 party_match_exists — cùng một hàm với route đọc). Tra sau 300 ms ngừng gõ; chỉ nhận kết quả của lần tra MỚI NHẤT (`lanKhop`).
let khop: Api.PartyMatchDto[] = [];
// ADR-0071 điều 3b: có hồ sơ trùng mà tài khoản này không được thấy (không xem Danh bạ — Hành chính nhân sự): máy chủ chỉ báo cờ, không tên.
let khopAn = false;
const CAU_KHOP_AN = "Số hoặc tên này đã có trong Danh bạ. Vẫn tạo được hồ sơ mới; sau đó nhờ Quản trị gộp hồ sơ trùng.";
const taoMoi = h("input", { type: "checkbox", class: "o-tick" });
const nutTao = byId<HTMLButtonElement>("add-tao");
const capNhatNutTao = () => { nutTao.disabled = (khop.length > 0 || khopAn) && !existingPartyId && !taoMoi.checked; };
taoMoi.addEventListener("change", capNhatNutTao);
function veKhop(): void {
  if ((khop.length === 0 && !khopAn) || existingPartyId) {
    if (!existingPartyId) existingNote.hidden = true;
    capNhatNutTao();
    return;
  }
  replaceChildren(
    existingNote,
    khop.length > 0 && h("p", null, "Đã có hồ sơ khớp — chọn một hồ sơ, hoặc tạo hồ sơ mới nếu là người khác:"),
    khop.length > 0 && h("ul", null, ...khop.map((k) => {
      const dung = h("button", { type: "button", class: "nut", "data-cap": "loi" }, "Dùng hồ sơ này");
      dung.addEventListener("click", () => {
        existingPartyId = k.id;
        addName.value = k.displayName;
        addName.readOnly = true;
        replaceChildren(existingNote, `Sẽ tạo tài khoản cho hồ sơ có sẵn "${k.displayName}" (không tạo hồ sơ mới). Đổi số điện thoại để bỏ chọn.`);
        capNhatNutTao();
        preselectRoles(k);
      });
      const lyDo = k.lyDo.map((l) => NHAN_LY_DO_KHOP[l]).join(", ");
      return h("li", null, h("strong", null, k.displayName), ` — ${lyDo}`, k.vai.length ? ` — ${k.vai.join(", ")}` : "", " ",
        k.coTaiKhoan ? h("span", { class: "muted" }, "(đã có tài khoản)") : dung);
    })),
    khopAn && h("p", null, CAU_KHOP_AN),
    h("label", { class: "check" }, taoMoi, "Vẫn tạo hồ sơ mới (người khác trùng tên/số)"),
  );
  existingNote.hidden = false;
  capNhatNutTao();
}
let henKhop: number | undefined;
let lanKhop = 0;
const traKhop = () => {
  clearExisting();
  taoMoi.checked = false;
  window.clearTimeout(henKhop);
  henKhop = window.setTimeout(async () => {
    const lan = ++lanKhop;
    const phone = addPhone.value.trim();
    const ten = addName.value.trim();
    let ds: Api.PartyMatchResponse = { khop: [], coHoSoKhacTrongDanhBa: false };
    if (phone || ten) {
      try {
        ds = await api<Api.PartyMatchResponse>(`/api/staff/ho-so-khop?${new URLSearchParams({ phone, ten })}`);
      } catch {
        // SĐT chưa đúng dạng hay mất mạng giữa lúc gõ: không chặn, không báo lỗi — máy chủ vẫn trả 409 khi bấm Tạo
      }
    }
    if (lan !== lanKhop) return;
    khop = ds.khop;
    khopAn = ds.coHoSoKhacTrongDanhBa === true;
    veKhop();
  }, 300);
};
/** Bỏ mọi lần tra đang chờ / đang chạy (sau khi tạo xong hoặc khi 409 đã trả danh sách mới nhất). */
const huyTraKhop = () => {
  window.clearTimeout(henKhop);
  lanKhop++;
};
addPhone.addEventListener("input", traKhop);
addName.addEventListener("input", () => { if (!existingPartyId) traKhop(); });

/**
 * Ruling R26: hồ sơ có sẵn đang giữ vai tài khoản (chưa đóng — cùng định nghĩa "đang mở" với máy chủ) thì máy chủ bắt chọn cả vai đó. Chọn sẵn các vai này
 * (hợp với vai người dùng đã tích, giữ chỉnh tay + lý do). Lấy từ chính kết quả hồ sơ khớp (`vaiTaiKhoan`), không đọc hồ sơ qua Danh bạ: Hành chính nhân sự
 * không xem Danh bạ (ADR-0071) nên lời gọi cũ `GET /api/parties/:id` bị 403 và bước chọn sẵn im lặng không chạy. Máy chủ vẫn kiểm.
 */
function preselectRoles(k: Api.PartyMatchDto): void {
  if (!addPicker) return;
  const v = addPicker.value();
  addPicker.reset({ ...v, roles: ROLE_CODES.filter((c) => v.roles.includes(c) || k.vaiTaiKhoan.includes(c)) });
}

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  baoLoi(null);
  if (!addPicker) return;
  const v = addPicker.value();
  if (v.roles.length === 0) return baoLoi("Chọn ít nhất một vai trò.");
  const who = existingPartyId ? { partyId: existingPartyId } : { fullName: addName.value, ...(taoMoi.checked ? { taoHoSoMoi: true } : {}) };
  const body = { phone: addPhone.value, roles: v.roles, adds: v.adds, removes: v.removes, reason: v.reason, ...who };
  let r: Api.TaoTaiKhoanResponse;
  bangThem?.setBusy(true);
  nutTao.disabled = true;
  try {
    r = await api<Api.TaoTaiKhoanResponse>("/api/staff", { method: "POST", body });
  } catch (err) {
    bangThem?.setBusy(false);
    capNhatNutTao();
    // Máy chủ thấy hồ sơ khớp mà lần tra lúc gõ chưa kịp trả (hoặc vừa có hồ sơ mới): hiện khối với danh sách của máy chủ, kèm câu báo của máy chủ.
    if (err instanceof ApiError && err.code === "party_match_exists") {
      huyTraKhop();
      const ct = err.details as Partial<Api.PartyMatchResponse> | undefined;
      khop = ct?.khop ?? [];
      khopAn = ct?.coHoSoKhacTrongDanhBa === true;
      veKhop();
      // Câu "đã có trong Danh bạ" khối hồ sơ khớp đã hiện — không lặp lại ở ô báo lỗi (chủ dự án 2026-10-01).
      if (khopAn && err.message === CAU_KHOP_AN) return;
      return baoLoi(err.message);
    }
    return fail(err);
  }
  bangThem?.setBusy(false);
  capNhatNutTao();
  bangThem?.close(false); // PIN hiện ở khối trên trang, sau khi bảng đã đóng
  if (r.pin === null) hienChoCapPin(r.staff.fullName, r.staff.phone); // ADR-0191: tài khoản xem mọi khách do Nhân sự tạo — không có PIN để hiện
  else showSecrets("Tài khoản mới", [{ name: r.staff.fullName, phone: r.staff.phone, pin: r.pin }]);
  huyTraKhop();
  clearExisting();
  addName.value = addPhone.value = "";
  addPicker.reset(EMPTY);
  khop = [];
  khopAn = false;
  taoMoi.checked = false;
  veKhop();
  await load();
});

const staff = await initShell();
me = staff;
meQuanTri = can(staff, "admin.manage");
meSuper = can(staff, "admin.manage.superadmin"); // ADR-0072 mục 4a: hỏi bảng quyền (ô gán/gỡ Toàn quyền), không hỏi mã
canAccessManage = can(staff, "account.access.manage");
byId("lien-ket-cap-dai-ly").hidden = !suaDuocCot(me); // lối sang màn gom (đặc tả 2026-11-04-man-cap-dai-ly): cùng cổng với route đọc của màn
hienCotCap = thayCotCap(staff); // ADR-0155 Đ2.2: hỏi bảng quyền (ô xem hoa hồng đối tác, không giữ Đối tác), không hỏi mã vai
cotCapEl.hidden = !hienCotCap;
// ADR-0071 điều 1b: cổng trang theo ô account.view (Quản trị, Toàn quyền, Hành chính nhân sự — cùng đối tượng với cổng "accounts" của API); nút "Thêm tài khoản"
// theo ô account.create (Hành chính nhân sự, Toàn quyền — Quản trị KHÔNG).
// Lần mở sau tệp đầu trang giữ chỗ (vô hình) cho nút thêm (#add-card) và khối xác minh từ lần vẽ đầu — ghi cả khi không vào được trang để trí nhớ cũ không để lại khoảng trống.
nhoKhoi("add-card", can(staff, "account.view") && can(staff, "account.create"));
nhoKhoi("xac-minh", can(staff, "account.view") && can(staff, "party.verify"));
if (!can(staff, "account.view")) trangThaiToanTrang("403", { cau: "Tài khoản này không quản lý được tài khoản.", trangDau: homeRedirect(staff) ?? "/" });
else {
  byId("thanh-loc").hidden = false;
  const nutThem = byId<HTMLButtonElement>("add-card");
  nutThem.addEventListener("click", () => openAdd(nutThem));
  if (can(staff, "account.create")) {
    // Bước 1 khung chung (N10): khối vai dựng sau lần nạp đầu — giữ chỗ trong biểu mẫu tới khi nó về (bảng trượt mở trước lúc đó vẫn thấy khung chờ).
    replaceChildren(byId("add-perms"), trangThaiHeThong("dang-tai", { khuon: "bieu-mau", giuCho: true }));
  }
  // ADR-0125 đ6: hàng chờ xác minh phiếu tự khai — ô party.verify (Quản trị, Nhân sự, Toàn quyền); khối tự dựng và hiện, máy chủ kiểm lại từng route.
  if (can(staff, "party.verify")) dungHangChoXacMinh(byId("xac-minh"), staff);
  // ADR-0219 Đ3: hàng chờ phiếu đăng ký đối tác (và chỗ mở, đóng đăng ký của Toàn quyền) ở trang riêng /phieu-dang-ky; ở đây chỉ một lối sang, cùng ô với trang đó.
  byId("lien-ket-phieu-dang-ky").hidden = !can(staff, "registration.queue.view");
  byId("dau-trang").hidden = byId("lien-ket-cap-dai-ly").hidden && byId("lien-ket-phieu-dang-ky").hidden;
  chinhSach = await taiChinhSach();
  for (const th of document.querySelectorAll<HTMLElement>("#tk-khoi th")) anPhanTu(anCot(th.textContent === "Tạo lúc" ? "createdAt" : th.textContent === "Đăng nhập gần nhất" ? "lastLoginAt" : ""), th);
  // Cột «Số điện thoại», «Tạo lúc», «Đăng nhập gần nhất» là cột phụ, nội dung nằm ở dòng phụ dưới tên (thuộc tính đặt ở đây để hàng tiêu đề trong HTML giữ nguyên dạng cũ).
  for (const th of document.querySelectorAll<HTMLElement>("#tk-khoi th")) if (["Số điện thoại", "Tạo lúc", "Đăng nhập gần nhất"].includes(th.textContent ?? "")) th.setAttribute("data-cot-phu", "");
  await load();
  // Task 3b: khối vai dựng SAU lần nạp đầu để ô vai mang tên hiện hành (tenVai) từ máy chủ. Nút «Thêm tài khoản» chỉ hiện khi khối vai đã có (trước đó bấm Tạo không làm gì).
  if (can(staff, "account.create")) {
    setupAddForm();
    nutThem.hidden = false;
  }
}
