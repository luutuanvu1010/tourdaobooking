// Khối "Hồ sơ khách" (N2 lát 1, ADR-0011) dùng ở form đơn và bảng "Đổi khách": gõ SĐT → hiện MỌI hồ sơ trùng số (ADR-0001 mục 8, bắt buộc) →
// "Dùng hồ sơ này" (chỉ cá nhân đang hoạt động) hoặc "Tạo hồ sơ mới" (tạo khi bấm Lưu, cùng lúc với đơn); không chọn gì = lưu không gắn.
// Luật và câu chữ ở src/shared/booker.ts; khối này chỉ dựng DOM và gọi GET /api/parties/lookup (máy chủ vẫn kiểm lại mọi thứ).
import { NO_BOOKER_TEXT, bookerPayload, canPickMatch, lookupReady, matchNote, type BookerChoice } from "../src/shared/booker";
import { api, type Api } from "./api";
import { h, replaceChildren } from "./dom";

export interface BookerPicker {
  root: HTMLElement;
  /** Trường gửi kèm đơn / bảng đổi khách theo lựa chọn hiện tại (đọc tên + SĐT đang gõ). */
  payload(): ReturnType<typeof bookerPayload>;
  /** Đặt lựa chọn khi mở đơn đã lưu (null = chưa gắn) rồi tra lại hồ sơ theo SĐT hiện có. */
  set(partyId: string | null, name: string | null): void;
  /** Tắt hẳn (tài khoản Đối tác mà máy chủ ép bên đặt — sổ đại lý đợt 1, Task 11): thôi tra hồ sơ theo SĐT, `set` không còn tra. Khối đã bị gỡ khỏi trang bởi nơi gọi. */
  tat(): void;
}

export function createBookerPicker(o: { name: HTMLInputElement; phone: HTMLInputElement }): BookerPicker {
  let choice: BookerChoice = { kind: "none" };
  let seq = 0; // bỏ kết quả tra cứu cũ về muộn
  let timer: number | undefined;
  let daTat = false;

  const status = h("p", { class: "booker-status", "aria-live": "polite" });
  const matches = h("div", { class: "booker-matches" });
  const root = h("div", { class: "booker" }, status, matches);

  const linkButton = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = h("button", { type: "button", class: "btn btn-link" }, label);
    b.addEventListener("click", onClick);
    return b;
  };
  const choose = (next: BookerChoice): void => {
    choice = next;
    renderStatus();
  };

  function renderStatus(): void {
    if (choice.kind === "existing") replaceChildren(status, `Đã gắn hồ sơ: ${choice.name} · `, linkButton("Bỏ gắn", () => choose({ kind: "none" })));
    else if (choice.kind === "new") replaceChildren(status, "Sẽ tạo hồ sơ mới cho khách này khi lưu · ", linkButton("Không tạo nữa", () => choose({ kind: "none" })));
    else replaceChildren(status, h("span", { class: "chip chip-warn" }, NO_BOOKER_TEXT));
  }

  const newButton = (): HTMLButtonElement => {
    const b = h("button", { type: "button", class: "btn" }, "Tạo hồ sơ mới");
    b.addEventListener("click", () => {
      if (!o.name.value.trim()) {
        replaceChildren(matches, h("p", { class: "field-error" }, "Nhập tên khách trước khi tạo hồ sơ."));
        o.name.focus();
        return;
      }
      choose({ kind: "new" });
    });
    return b;
  };

  async function lookup(): Promise<void> {
    const mine = ++seq;
    if (daTat || !lookupReady(o.phone.value)) {
      replaceChildren(matches);
      return;
    }
    let found: Api.PartyListItemDto[];
    try {
      found = (await api<Api.PartyLookupResponse>(`/api/parties/lookup?phone=${encodeURIComponent(o.phone.value)}`)).matches;
    } catch {
      // Tra lỗi (mạng/máy chủ) vẫn cho tạo hồ sơ mới — không tra được không có nghĩa là không tạo được.
      if (mine === seq) replaceChildren(matches, h("p", { class: "muted" }, "Không tra được hồ sơ — vẫn lưu đơn được, chỉ chưa gắn khách."), h("div", { class: "booker-match" }, newButton()));
      return;
    }
    if (mine !== seq) return;
    const rows = found.map((m) => {
      const note = matchNote(m);
      const use = canPickMatch(m)
        ? linkButton("Dùng hồ sơ này", () => {
            o.name.value = m.displayName; // điền sẵn; ô vẫn sửa được (tên trên đơn là bản chụp, không ghi ngược vào hồ sơ)
            choose({ kind: "existing", partyId: m.id, name: m.displayName });
          })
        : null;
      return h("div", { class: "booker-match" }, h("span", null, m.displayName), note ? h("span", { class: "muted" }, `(${note})`) : null, use);
    });
    replaceChildren(
      matches,
      found.length ? h("p", null, `Có ${found.length} hồ sơ dùng số này:`) : h("p", { class: "muted" }, "Chưa có hồ sơ nào dùng số này."),
      ...rows,
      h("div", { class: "booker-match" }, newButton()),
      found.length ? h("p", { class: "muted" }, "Cùng một số có thể thuộc nhiều người (người nhà, công ty) — chọn đúng người hoặc tạo hồ sơ mới.") : null,
    );
  }

  o.phone.addEventListener("input", () => {
    // SĐT vừa đổi không còn khớp hồ sơ MỚI đã chọn (hồ sơ mới lấy đúng SĐT đang gõ) — bỏ lựa chọn để tránh SĐT không hợp lệ chặn lưu đơn (400).
    // Hồ sơ CÓ SẴN không bị ảnh hưởng: bản chụp tên/SĐT trên đơn vốn được sửa tự do.
    if (choice.kind === "new") choose({ kind: "none" });
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void lookup(), 400);
  });
  renderStatus();

  return {
    root,
    payload: () => bookerPayload(choice, o.name.value, o.phone.value),
    set(partyId, name) {
      choice = partyId ? { kind: "existing", partyId, name: name ?? "" } : { kind: "none" };
      renderStatus();
      void lookup();
    },
    tat() {
      daTat = true;
      window.clearTimeout(timer);
      seq++;
    },
  };
}
