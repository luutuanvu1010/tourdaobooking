// Trang "Phiên đăng nhập" — chỉ IT/Toàn quyền (ADR-0075 điều 7; đặc tả docs/superpowers/specs/2026-10-01-xac-thuc-hai-lop-dac-ta.md §5b "Màn hình").
// Sổ phiên của mọi tài khoản (GET /api/sessions): lọc theo tên người (trong trang) + "Chỉ phiên đang hiệu lực" (máy chủ, `live=1`); bảng ở máy tính, thẻ ở điện thoại
// (khuôn trang Quản lý tài khoản). "Gỡ phiên" và "Gỡ phiên + đặt lại PIN" xác nhận bằng hộp TRONG TRANG (không dùng hộp thoại trình duyệt). Không có route gộp:
// nút gộp gọi tuần tự POST /api/sessions/:id/revoke rồi POST /api/staff/:id/reset-pin (PIN mới hiện một lần, như trang Quản lý tài khoản).
// Ẩn/hiện hỏi bảng quyền (`can`) — cùng ô máy chủ hỏi (web/CLAUDE.md, luật 1.52); máy chủ vẫn kiểm lại.
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { vnDateTimeText } from "../src/shared/vn-date";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";
import { dungMucChinhSach } from "./chinh-sach-dang-nhap-ui";

const errorEl = byId("error");
const okEl = byId("ok");
const secretEl = byId("secret");
const filtersEl = byId("filters");
const tableCard = byId("table-card");
const listEl = byId("list");
const cardsEl = byId("list-cards");

const staff = await initShell();

const reasonOf = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const tenNguoi = (s: Api.StaffSessionDto): string => s.staffName || "(chưa có tên)";
/** So tên không phân biệt hoa thường và dấu: "tuan" khớp "Tuấn". */
const boDau = (s: string): string => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

function hienOk(text: string | null): void {
  okEl.textContent = text ?? "";
  okEl.hidden = !text;
}

/** PIN mới chỉ hiện đúng một lần ở đây; không lưu ở đâu phía trình duyệt (cùng khuôn showSecrets của web/staff.ts). */
function hienPinMoi(name: string, phone: string, pin: string): void {
  const close = h("button", { type: "button", class: "btn btn-link" }, "Đã ghi lại, ẩn đi");
  close.addEventListener("click", () => {
    secretEl.hidden = true;
    replaceChildren(secretEl);
  });
  replaceChildren(
    secretEl,
    h("h2", null, "PIN mới"),
    h("p", { class: "alert warn" }, "PIN chỉ hiển thị một lần duy nhất. Hãy gửi riêng cho người này (không gửi vào nhóm chung); họ nên tự đổi PIN sau khi đăng nhập."),
    h("table", { class: "items" }, h("thead", null, h("tr", null, h("th", null, "Họ tên"), h("th", null, "Số điện thoại (tên đăng nhập)"), h("th", null, "PIN"))),
      h("tbody", null, h("tr", null, h("td", null, name), h("td", null, phone), h("td", { class: "pin" }, pin)))),
    h("div", { class: "actions" }, close),
  );
  secretEl.hidden = false;
  secretEl.scrollIntoView({ block: "nearest" });
}

// ADR-0085: mục "Chính sách đăng nhập" hỏi ĐÚNG ô của nó (luật 1.52) — không lồng trong nhánh auth.session.viewAll.
if (can(staff, "auth.session.policy")) void dungMucChinhSach(byId("policy-card"));

if (!can(staff, "auth.session.viewAll")) {
  showError(errorEl, "Trang Phiên đăng nhập chỉ người phụ trách hệ thống (IT, Toàn quyền) xem được.");
} else {
  const goDuoc = can(staff, "auth.session.revoke");

  let sessions: Api.StaffSessionDto[] = [];
  /** Phiên đang mở hộp xác nhận: mã phiên → có kèm đặt lại PIN không. Chỉ một hộp mở một lúc. */
  let xacNhan: { id: string; datLaiPin: boolean } | null = null;
  let dangGui = false;

  const timEl = h("input", { type: "search", id: "tim-ten", placeholder: "Tìm theo tên người", "aria-label": "Tìm theo tên người" });
  const chiSong = h("input", { type: "checkbox", id: "chi-song", class: "o-tick", checked: true });
  timEl.addEventListener("input", () => render());
  chiSong.addEventListener("change", () => {
    xacNhan = null;
    void load();
  });
  replaceChildren(filtersEl, timEl, h("label", { class: "check" }, chiSong, "Chỉ phiên đang hiệu lực"));
  filtersEl.hidden = false;
  tableCard.hidden = false;

  async function load(): Promise<void> {
    try {
      sessions = (await api<Api.StaffSessionListResponse>(`/api/sessions${chiSong.checked ? "?live=1" : ""}`)).sessions;
    } catch (err) {
      showError(errorEl, reasonOf(err));
      return;
    }
    if (xacNhan && !sessions.some((s) => s.id === xacNhan!.id && s.live)) xacNhan = null;
    render();
  }

  async function goPhien(s: Api.StaffSessionDto, datLaiPin: boolean): Promise<void> {
    if (dangGui) return;
    dangGui = true;
    showError(errorEl, null);
    hienOk(null);
    render();
    try {
      let daGo = false;
      try {
        await api(`/api/sessions/${encodeURIComponent(s.id)}/revoke`, { method: "POST" });
        daGo = true;
      } catch (err) {
        // Phiên vừa kết thúc theo đường khác (409 already_ended): vẫn đặt lại PIN nếu người dùng đã chọn — mục đích "đuổi hẳn" vẫn còn nguyên.
        if (!(datLaiPin && err instanceof ApiError && err.code === "already_ended")) {
          showError(errorEl, reasonOf(err));
          return;
        }
      }
      if (!datLaiPin) {
        hienOk(`Đã gỡ phiên của ${tenNguoi(s)} trên ${s.deviceLabel}. Máy đó đã bị đăng xuất.`);
        return;
      }
      try {
        const r = await api<Api.StaffWithPinResponse>(`/api/staff/${encodeURIComponent(s.staffId)}/reset-pin`, { method: "POST" });
        hienOk(`${daGo ? "Đã gỡ phiên" : "Phiên này đã kết thúc từ trước"} và đã đặt lại PIN của ${tenNguoi(s)}. Mọi máy của tài khoản này đã bị đăng xuất.`);
        hienPinMoi(r.staff.fullName || tenNguoi(s), r.staff.phone, r.pin);
      } catch (err) {
        showError(errorEl, `${daGo ? "Đã gỡ phiên" : "Phiên này đã kết thúc từ trước"}, nhưng chưa đặt lại được PIN: ${reasonOf(err)}`);
      }
    } finally {
      xacNhan = null;
      dangGui = false;
      await load();
    }
  }

  function nut(label: string, onclick: () => void, cls: string): HTMLButtonElement {
    const b = h("button", { type: "button", class: cls, disabled: dangGui }, label);
    b.addEventListener("click", onclick);
    return b;
  }

  /** Các nút của một phiên còn sống, không phải máy đang dùng (máy chủ trả 409 cho phiên của chính request — dùng Đăng xuất). */
  function nutGo(s: Api.StaffSessionDto, pill: boolean): HTMLElement[] {
    if (!goDuoc || !s.live || s.thisDevice) return [];
    const cls = pill ? "pill-btn pill-btn-danger" : "btn btn-link danger";
    const out = [nut("Gỡ phiên", () => {
      xacNhan = { id: s.id, datLaiPin: false };
      render();
    }, cls)];
    // Đặt lại PIN: máy chủ tính `datLaiPinDuoc` cho từng dòng bằng CÙNG luật route reset-pin (hai ô, không phải chính mình, cấp bậc) — trang không chép luật.
    if (s.datLaiPinDuoc) {
      out.push(nut("Gỡ phiên + đặt lại PIN", () => {
        xacNhan = { id: s.id, datLaiPin: true };
        render();
      }, cls));
    }
    return out;
  }

  /** Hộp xác nhận trong trang (không `confirm()`), đặt ngay dưới phiên đang chọn. */
  function hopXacNhan(s: Api.StaffSessionDto): HTMLElement | null {
    if (xacNhan?.id !== s.id) return null;
    const kemPin = xacNhan.datLaiPin;
    const cau = kemPin
      ? `Gỡ phiên của ${tenNguoi(s)} trên ${s.deviceLabel} và đặt lại PIN? PIN cũ, Face ID và mọi máy đang đăng nhập của tài khoản này mất hiệu lực. PIN mới hiện một lần ở đầu trang.`
      : `Gỡ phiên của ${tenNguoi(s)} trên ${s.deviceLabel}? Máy đó bị đăng xuất ngay. Người có PIN vẫn đăng nhập lại được.`;
    return h(
      "div",
      { class: "maint-confirm", role: "group", "aria-label": "Xác nhận gỡ phiên", "data-xac-nhan": s.id },
      h("p", null, h("strong", null, cau)),
      h(
        "div",
        { class: "maint-actions" },
        nut(kemPin ? "Xác nhận gỡ và đặt lại PIN" : "Xác nhận gỡ", () => void goPhien(s, kemPin), "btn btn-primary"),
        nut("Thôi", () => {
          xacNhan = null;
          render();
        }, "btn"),
      ),
    );
  }

  const trangThai = (s: Api.StaffSessionDto): HTMLElement =>
    h("span", { class: s.live ? "badge badge-confirmed" : "muted" }, s.statusLabel, !s.live && s.endedAt ? ` lúc ${vnDateTimeText(s.endedAt)}` : "");

  function hang(s: Api.StaffSessionDto): HTMLElement[] {
    const tr = h(
      "tr",
      { class: s.live ? "" : "row-off", "data-phien": s.id },
      h("td", null, tenNguoi(s), s.thisDevice && h("span", { class: "muted" }, " (máy này)")),
      h("td", null, s.deviceLabel),
      h("td", { class: "muted" }, s.ip ?? "—"),
      h("td", null, s.methodLabel),
      h("td", { class: "muted" }, vnDateTimeText(s.createdAt)),
      h("td", { class: "muted" }, vnDateTimeText(s.lastSeenAt)),
      h("td", null, trangThai(s)),
      h("td", { class: "row-actions" }, ...nutGo(s, false)),
    );
    const hop = hopXacNhan(s);
    return hop ? [tr, h("tr", null, h("td", { colSpan: 8 }, hop))] : [tr];
  }

  function the(s: Api.StaffSessionDto): HTMLElement {
    const nuts = nutGo(s, true);
    return h(
      "div",
      { class: s.live ? "card card-col" : "card card-col row-off", "data-phien": s.id },
      h("div", null, h("strong", null, tenNguoi(s)), s.thisDevice && h("span", { class: "muted" }, " (máy này)")),
      h("div", null, s.deviceLabel, " · ", s.methodLabel),
      h("div", { class: "muted" }, `IP ${s.ip ?? "không rõ"}`),
      h("div", { class: "muted" }, `Đăng nhập ${vnDateTimeText(s.createdAt)} · Hoạt động gần nhất ${vnDateTimeText(s.lastSeenAt)}`),
      h("div", null, trangThai(s)),
      nuts.length > 0 && h("div", { class: "maint-actions" }, ...nuts),
      hopXacNhan(s),
    );
  }

  function render(): void {
    const q = boDau(timEl.value.trim());
    const shown = q ? sessions.filter((s) => boDau(tenNguoi(s)).includes(q)) : sessions;
    if (shown.length === 0) {
      const trong = q ? "Không có phiên nào khớp tên này." : chiSong.checked ? "Không có phiên nào đang hiệu lực." : "Chưa có phiên nào.";
      replaceChildren(listEl, h("tr", null, h("td", { colSpan: 8, class: "muted" }, trong)));
      replaceChildren(cardsEl, h("div", { class: "card muted" }, trong));
      return;
    }
    replaceChildren(listEl, ...shown.flatMap(hang));
    replaceChildren(cardsEl, ...shown.map(the));
  }

  await load();
}
