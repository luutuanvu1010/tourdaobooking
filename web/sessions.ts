// Trang "Phiên đăng nhập" — chỉ IT/Toàn quyền (ADR-0075 điều 7; đặc tả docs/superpowers/specs/2026-10-01-xac-thuc-hai-lop-dac-ta.md §5b "Màn hình").
// Sổ phiên của mọi tài khoản (GET /api/sessions): lọc theo tên người (trong trang) + "Chỉ phiên đang hiệu lực" (máy chủ, `live=1`); bảng ở máy tính, thẻ ở điện thoại
// (khuôn trang Quản lý tài khoản). "Gỡ phiên" và "Gỡ phiên + đặt lại PIN" xác nhận bằng hộp TRONG TRANG (không dùng hộp thoại trình duyệt). Không có route gộp:
// nút gộp gọi tuần tự POST /api/sessions/:id/revoke rồi POST /api/staff/:id/reset-pin (PIN mới hiện một lần, như trang Quản lý tài khoản).
// Ẩn/hiện hỏi bảng quyền (`can`) — cùng ô máy chủ hỏi (web/CLAUDE.md, luật 1.52); máy chủ vẫn kiểm lại.
// Khuôn Danh sách của khung gốc (ADR-0222; đợt D1): khối bảng (bảng từ 800, danh sách dòng hẹp hơn), nút bằng `.nut[data-cap]`, cặp nhãn–giá trị bằng `cap()`.
import { ApiError, api, type Api } from "./api";
import { can } from "../src/shared/permissions";
import { vnDateTimeText } from "../src/shared/vn-date";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";
import { dungMucChinhSach } from "./chinh-sach-dang-nhap-ui";
import { cap, thanhNut, vungPhu } from "./khung";

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
  const close = h("button", { type: "button", class: "nut", "data-cap": "loi" }, "Đã ghi lại, ẩn đi");
  close.addEventListener("click", () => {
    secretEl.hidden = true;
    replaceChildren(secretEl);
  });
  replaceChildren(
    secretEl,
    h("header", { class: "khoi-dau" }, h("h2", { id: "pin-moi-ten" }, "PIN mới")),
    h("p", { class: "alert warn" }, "PIN chỉ hiển thị một lần duy nhất. Hãy gửi riêng cho người này (không gửi vào nhóm chung); họ nên tự đổi PIN sau khi đăng nhập."),
    h("div", null, cap("Họ tên", name), cap("Số điện thoại (tên đăng nhập)", phone), cap("PIN", h("span", { class: "pin" }, pin))),
    thanhNut(null, close),
  );
  secretEl.hidden = false;
  secretEl.scrollIntoView({ block: "nearest" });
}

// ADR-0085: mục "Chính sách đăng nhập" hỏi ĐÚNG ô của nó (luật 1.52) — không lồng trong nhánh auth.session.viewAll.
if (can(staff, "auth.session.policy")) {
  void dungMucChinhSach(byId("policy-card"));
  void dungAnDanhPhienCu(byId("an-danh-phien"));
}

/** Mục "Ẩn danh hoá phiên cũ" (ADR-0126 đ8, chỉ Toàn quyền): số ngày do chính sách quy định; chưa có số thì không làm được, nút tắt. Bấm có bước xác nhận trong trang. */
async function dungAnDanhPhienCu(goc: HTMLElement): Promise<void> {
  let d: Api.PhienCuAnDanhResponse;
  try {
    d = await api<Api.PhienCuAnDanhResponse>("/api/sessions/an-danh-cu");
  } catch (err) {
    showError(errorEl, reasonOf(err));
    return;
  }
  const coHan = d.hanNgay !== null;
  const nut = h("button", { type: "button", class: "nut", "data-cap": "nguy-hiem", id: "adp-nut", disabled: !coHan || d.soPhien === 0 }, "Ẩn danh hoá") as HTMLButtonElement;
  const xacNhan = vungPhu({ id: "adp-xac-nhan", role: "group", "aria-label": "Xác nhận ẩn danh hoá máy đã đăng xuất", hidden: true },
    h("p", null, h("strong", null, `Ẩn danh hoá ${d.soPhien} máy đã đăng xuất? Địa chỉ mạng và thông tin máy của các máy này bị xoá, không hoàn tác được.`)),
    thanhNut(null,
      h("button", { type: "button", class: "nut", "data-cap": "nguy-hiem", id: "adp-xac-nhan-nut", onclick: async () => {
        showError(errorEl, null);
        try {
          const r = await api<Api.PhienCuAnDanhKetQua>("/api/sessions/an-danh-cu", { method: "POST" });
          hienOk(`Đã ẩn danh hoá ${r.daAnDanh} máy đã đăng xuất.`);
          await dungAnDanhPhienCu(goc);
        } catch (err) {
          xacNhan.hidden = true;
          showError(errorEl, reasonOf(err));
        }
      } }, "Xác nhận ẩn danh hoá"),
      h("button", { type: "button", class: "nut", "data-cap": "loi", onclick: () => { xacNhan.hidden = true; } }, "Thôi")));
  nut.addEventListener("click", () => { xacNhan.hidden = false; });
  replaceChildren(goc,
    h("header", { class: "khoi-dau" }, h("h2", { id: "adp-heading" }, "Ẩn danh hoá máy đã đăng xuất")),
    h("div", { class: "khoi-viec" }, nut),
    coHan
      ? h("p", { class: "khoi-mo-ta", id: "adp-dong" }, `Ẩn danh IP và thông tin máy của ${d.soPhien} máy đã đăng xuất quá ${d.hanNgay} ngày.`)
      : h("p", { class: "khoi-mo-ta", id: "adp-dong" }, "Chính sách riêng tư chưa có thời hạn giữ thông tin máy đã đăng xuất, nên chưa ẩn danh hoá được."),
    xacNhan);
  goc.hidden = false;
}

if (!can(staff, "auth.session.viewAll")) {
  showError(errorEl, "Trang Máy đang đăng nhập chỉ người phụ trách hệ thống (IT, Toàn quyền) xem được.");
} else {
  const goDuoc = can(staff, "auth.session.revoke");

  let sessions: Api.StaffSessionDto[] = [];
  /** Phiên đang mở hộp xác nhận: mã phiên → có kèm đặt lại PIN không. Chỉ một hộp mở một lúc. */
  let xacNhan: { id: string; datLaiPin: boolean } | null = null;
  let dangGui = false;

  const timEl = h("input", { type: "search", id: "tim-ten", class: "o", placeholder: "Tìm theo tên người", "aria-label": "Tìm theo tên người" });
  const chiSong = h("input", { type: "checkbox", id: "chi-song", class: "o-tick", checked: true });
  timEl.addEventListener("input", () => render());
  chiSong.addEventListener("change", () => {
    xacNhan = null;
    void load();
  });
  replaceChildren(filtersEl, timEl, h("label", { class: "check" }, chiSong, "Chỉ máy đang đăng nhập"));
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
        hienOk(`Đã đăng xuất máy ${s.deviceLabel} của ${tenNguoi(s)}.`);
        return;
      }
      try {
        const r = await api<Api.StaffWithPinResponse>(`/api/staff/${encodeURIComponent(s.staffId)}/reset-pin`, { method: "POST" });
        hienOk(`${daGo ? "Đã đăng xuất máy này" : "Máy này đã đăng xuất từ trước"} và đã đặt lại PIN của ${tenNguoi(s)}. Mọi máy của tài khoản này đã bị đăng xuất.`);
        hienPinMoi(r.staff.fullName || tenNguoi(s), r.staff.phone, r.pin);
      } catch (err) {
        showError(errorEl, `${daGo ? "Đã đăng xuất máy này" : "Máy này đã đăng xuất từ trước"}, nhưng chưa đặt lại được PIN: ${reasonOf(err)}`);
      }
    } finally {
      xacNhan = null;
      dangGui = false;
      await load();
    }
  }

  /** Nút của bộ thành phần chung; `capNut` là cấp (`data-cap`) — dòng dùng lối chữ, hộp xác nhận dùng nguy hiểm / lối chữ. */
  function nut(label: string, onclick: () => void, capNut: "loi" | "nguy-hiem"): HTMLButtonElement {
    const b = h("button", { type: "button", class: "nut", "data-cap": capNut, disabled: dangGui }, label);
    b.addEventListener("click", onclick);
    return b;
  }

  /** Các nút của một phiên còn sống, không phải máy đang dùng (máy chủ trả 409 cho phiên của chính request — dùng Đăng xuất). */
  function nutGo(s: Api.StaffSessionDto): HTMLElement[] {
    if (!goDuoc || !s.live || s.thisDevice) return [];
    const out = [nut("Đăng xuất máy này", () => {
      xacNhan = { id: s.id, datLaiPin: false };
      render();
    }, "loi")];
    // Đặt lại PIN: máy chủ tính `datLaiPinDuoc` cho từng dòng bằng CÙNG luật route reset-pin (hai ô, không phải chính mình, cấp bậc) — trang không chép luật.
    if (s.datLaiPinDuoc) {
      out.push(nut("Đăng xuất mọi máy + đặt lại PIN", () => {
        xacNhan = { id: s.id, datLaiPin: true };
        render();
      }, "loi"));
    }
    return out;
  }

  /** Hộp xác nhận trong trang (không `confirm()`), đặt ngay dưới phiên đang chọn. */
  function hopXacNhan(s: Api.StaffSessionDto): HTMLElement | null {
    if (xacNhan?.id !== s.id) return null;
    const kemPin = xacNhan.datLaiPin;
    const cau = kemPin
      ? `Đăng xuất máy ${s.deviceLabel} của ${tenNguoi(s)} và đặt lại PIN? PIN cũ, Face ID và mọi máy đang đăng nhập của tài khoản này mất hiệu lực. PIN mới hiện một lần ở đầu trang.`
      : `Đăng xuất máy ${s.deviceLabel} của ${tenNguoi(s)}? Máy đó bị đăng xuất ngay. Người có PIN vẫn đăng nhập lại được.`;
    return vungPhu(
      { role: "group", "aria-label": "Xác nhận đăng xuất máy", "data-xac-nhan": s.id },
      h("p", null, h("strong", null, cau)),
      thanhNut(
        null,
        nut(kemPin ? "Xác nhận gỡ và đặt lại PIN" : "Xác nhận gỡ", () => void goPhien(s, kemPin), "nguy-hiem"),
        nut("Thôi", () => {
          xacNhan = null;
          render();
        }, "loi"),
      ),
    );
  }

  const trangThai = (s: Api.StaffSessionDto): HTMLElement =>
    h("span", { class: "huy-hieu", "data-tong": s.live ? "la" : "xam" }, s.statusLabel, !s.live && s.endedAt ? ` lúc ${vnDateTimeText(s.endedAt)}` : "");

  function hang(s: Api.StaffSessionDto): HTMLElement[] {
    const nuts = nutGo(s);
    const tr = h(
      "tr",
      { "data-ngung": s.live ? undefined : "", "data-phien": s.id },
      h("td", null, tenNguoi(s), s.thisDevice && h("span", { class: "o-phu" }, "(máy này)")),
      h("td", null, s.deviceLabel, h("span", { class: "o-phu", "data-thay-cot": "" }, `IP ${s.ip ?? "không rõ"} · ${s.methodLabel}`)),
      h("td", { "data-cot-phu": "" }, s.ip ?? "—"),
      h("td", { "data-cot-phu": "" }, s.methodLabel),
      h("td", null, vnDateTimeText(s.createdAt)),
      h("td", null, vnDateTimeText(s.lastSeenAt)),
      h("td", null, trangThai(s)),
      h("td", null, nuts.length > 0 ? h("div", { class: "hang" }, ...nuts) : null),
    );
    const hop = hopXacNhan(s);
    return hop ? [tr, h("tr", null, h("td", { colSpan: 8, "data-ca-hang": "" }, hop))] : [tr];
  }

  /** Một dòng của danh sách dòng (khối hẹp hơn 800): tên người là chữ đậm duy nhất của dòng; hộp xác nhận nằm ngay dưới chữ của dòng. */
  function the(s: Api.StaffSessionDto): HTMLElement {
    const nuts = nutGo(s);
    return h(
      "div",
      { class: "dong", "data-ngung": s.live ? undefined : "", "data-phien": s.id },
      h(
        "span",
        { class: "dong-chu" },
        h("span", null, h("strong", null, tenNguoi(s)), s.thisDevice && " (máy này)"),
        h("span", null, s.deviceLabel, " · ", s.methodLabel),
        h("span", { class: "o-phu" }, `IP ${s.ip ?? "không rõ"}`),
        h("span", { class: "o-phu" }, `Đăng nhập ${vnDateTimeText(s.createdAt)} · Hoạt động gần nhất ${vnDateTimeText(s.lastSeenAt)}`),
        h("span", null, trangThai(s)),
        nuts.length > 0 && h("span", { class: "hang" }, ...nuts),
        hopXacNhan(s),
      ),
    );
  }

  function render(): void {
    const q = boDau(timEl.value.trim());
    const shown = q ? sessions.filter((s) => boDau(tenNguoi(s)).includes(q)) : sessions;
    if (shown.length === 0) {
      const trong = q ? "Không có máy nào khớp tên này." : chiSong.checked ? "Không có máy nào đang đăng nhập." : "Chưa có máy nào đăng nhập.";
      replaceChildren(listEl, h("tr", null, h("td", { colSpan: 8, "data-ca-hang": "" }, h("span", { class: "o-phu" }, trong))));
      replaceChildren(cardsEl, h("p", { class: "dong o-phu" }, trong));
      return;
    }
    replaceChildren(listEl, ...shown.flatMap(hang));
    replaceChildren(cardsEl, ...shown.map(the));
  }

  await load();
}
