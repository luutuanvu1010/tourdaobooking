import { ApiError, api, type SheetCandidate, type StaffAccount } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { dateTime } from "./format";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const listEl = byId("list");
const secretEl = byId("secret");
const sheetEl = byId("sheet");
const editEl = byId("edit");
const ROLE_LABEL = { sales: "Nhân viên", admin: "Quản trị viên" } as const;

let me: { id: string };
let accounts: StaffAccount[] = [];

const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

/** PIN chỉ hiện đúng một lần ở đây; không lưu vào bất kỳ đâu phía client. */
function showSecrets(title: string, rows: { name: string; phone: string; pin: string }[]): void {
  const copy = h("button", { type: "button", class: "btn" }, "Sao chép danh sách");
  copy.addEventListener("click", async () => {
    await navigator.clipboard?.writeText(rows.map((r) => `${r.name}\t${r.phone}\t${r.pin}`).join("\n")).catch(() => undefined);
    copy.textContent = "Đã sao chép";
  });
  const close = h("button", { type: "button", class: "btn btn-link" }, "Đã ghi lại, ẩn đi");
  close.addEventListener("click", () => {
    secretEl.hidden = true;
    replaceChildren(secretEl);
  });
  replaceChildren(
    secretEl,
    h("h2", null, title),
    h("p", { class: "alert warn" }, "PIN chỉ hiển thị một lần duy nhất. Hãy gửi riêng cho từng người (không gửi vào nhóm chung); họ nên tự đổi PIN sau khi đăng nhập."),
    h("table", { class: "items" }, h("thead", null, h("tr", null, h("th", null, "Họ tên"), h("th", null, "Số điện thoại (tên đăng nhập)"), h("th", null, "PIN"))),
      h("tbody", null, ...rows.map((r) => h("tr", null, h("td", null, r.name), h("td", null, r.phone), h("td", { class: "pin" }, r.pin))))),
    h("div", { class: "actions", style: "margin-top:12px" }, copy, close),
  );
  secretEl.hidden = false;
  secretEl.scrollIntoView({ block: "nearest" });
}

async function act<T>(fn: () => Promise<T>): Promise<T | undefined> {
  showError(errorEl, null);
  try {
    return await fn();
  } catch (err) {
    fail(err);
    return undefined;
  }
}

function row(s: StaffAccount): HTMLElement {
  const btn = (label: string, onclick: () => void, cls = "btn btn-link") => {
    const b = h("button", { type: "button", class: cls }, label);
    b.addEventListener("click", onclick);
    return b;
  };
  const isMe = s.id === me.id;
  return h(
    "tr",
    { class: s.active ? "" : "row-off" },
    h("td", null, s.fullName, isMe && h("span", { class: "muted" }, " (bạn)"), !s.active && h("span", { class: "badge badge-cancelled" }, "Ngưng"), s.locked && h("span", { class: "badge badge-draft" }, "Bị khoá đăng nhập")),
    h("td", null, s.phone),
    h("td", null, ROLE_LABEL[s.role]),
    h("td", { class: "muted" }, dateTime(s.createdAt)),
    h(
      "td",
      { class: "row-actions" },
      btn("Sửa", () => openEdit(s)),
      btn("Đặt lại PIN", async () => {
        if (!confirm(`Đặt lại PIN của ${s.fullName}? PIN cũ và mọi phiên đang đăng nhập sẽ mất hiệu lực.`)) return;
        const r = await act(() => api<{ pin: string }>(`/api/staff/${s.id}/reset-pin`, { method: "POST" }));
        if (r) {
          showSecrets("PIN mới", [{ name: s.fullName, phone: s.phone, pin: r.pin }]);
          await load();
        }
      }),
      s.locked && btn("Mở khoá", async () => {
        if (await act(() => api(`/api/staff/${s.id}/unlock`, { method: "POST" }))) await load();
      }),
      !isMe &&
        btn(
          s.active ? "Ngưng" : "Kích hoạt lại",
          async () => {
            if (s.active && !confirm(`Ngưng tài khoản ${s.fullName}? Họ sẽ bị đăng xuất ngay.`)) return;
            if (await act(() => api(`/api/staff/${s.id}`, { method: "PATCH", body: { active: !s.active } }))) await load();
          },
          s.active ? "btn btn-link danger" : "btn btn-link",
        ),
    ),
  );
}

function openEdit(s: StaffAccount): void {
  const name = h("input", { type: "text", value: s.fullName, maxLength: 200 });
  const phone = h("input", { type: "tel", value: s.phone });
  const role = h("select", null, h("option", { value: "sales" }, ROLE_LABEL.sales), h("option", { value: "admin" }, ROLE_LABEL.admin));
  role.value = s.role;
  if (s.id === me.id) role.disabled = true; // không tự đổi vai trò của mình
  const save = h("button", { type: "button", class: "btn btn-primary" }, "Lưu");
  const cancel = h("button", { type: "button", class: "btn" }, "Đóng");
  cancel.addEventListener("click", () => (editEl.hidden = true));
  save.addEventListener("click", async () => {
    const body: Record<string, string> = { fullName: name.value, phone: phone.value };
    if (!role.disabled) body.role = role.value;
    if (await act(() => api(`/api/staff/${s.id}`, { method: "PATCH", body }))) {
      editEl.hidden = true;
      await load();
    }
  });
  replaceChildren(
    editEl,
    h("h2", null, `Sửa: ${s.fullName}`),
    h("div", { class: "grid three" }, h("label", null, "Họ tên", name), h("label", null, "Số điện thoại đăng nhập", phone), h("label", null, "Vai trò", role)),
    h("p", { class: "muted" }, "Đổi số điện thoại sẽ đổi tên đăng nhập của người này. Phiên đang đăng nhập vẫn giữ nguyên."),
    h("div", { class: "actions" }, save, cancel),
  );
  editEl.hidden = false;
  editEl.scrollIntoView({ block: "nearest" });
}

async function load(): Promise<void> {
  const r = await act(() => api<{ staff: StaffAccount[] }>("/api/staff"));
  if (!r) return;
  accounts = r.staff;
  replaceChildren(listEl, ...accounts.map(row));
}

// ---- Thêm thủ công
byId<HTMLFormElement>("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = byId<HTMLInputElement>("add-name");
  const phone = byId<HTMLInputElement>("add-phone");
  const role = byId<HTMLSelectElement>("add-role");
  const r = await act(() => api<{ staff: StaffAccount; pin: string }>("/api/staff", { method: "POST", body: { fullName: name.value, phone: phone.value, role: role.value } }));
  if (r) {
    showSecrets("Tài khoản mới", [{ name: r.staff.fullName, phone: r.staff.phone, pin: r.pin }]);
    name.value = phone.value = "";
    role.value = "sales";
    await load();
  }
});

// ---- Đồng bộ từ Google Sheet: xem trước rồi mới xác nhận
byId("sheet-pull").addEventListener("click", async () => {
  const r = await act(() =>
    api<{ candidates: SheetCandidate[]; problems: { row: number; message: string }[]; notInSheet: { fullName: string; phone: string; active: boolean }[] }>("/api/staff/sheet"),
  );
  if (!r) return;
  const fresh = r.candidates.filter((c) => c.status === "new");
  const boxes = new Map<string, HTMLInputElement>();
  const apply = h("button", { type: "button", class: "btn btn-accent" }, "Tạo tài khoản cho người đã chọn");
  const refresh = () => {
    const n = [...boxes.values()].filter((b) => b.checked).length;
    apply.disabled = n === 0;
    apply.textContent = n ? `Tạo ${n} tài khoản` : "Tạo tài khoản cho người đã chọn";
  };
  for (const c of fresh) {
    const box = h("input", { type: "checkbox", checked: true, style: "width:auto;display:inline;margin:0 8px 0 0" });
    box.addEventListener("change", refresh);
    boxes.set(c.phone, box);
  }
  apply.addEventListener("click", async () => {
    const phones = [...boxes].filter(([, b]) => b.checked).map(([p]) => p);
    const res = await act(() => api<{ created: { fullName: string; phone: string; pin: string }[] }>("/api/staff/sheet/apply", { method: "POST", body: { phones } }));
    if (res) {
      sheetEl.hidden = true;
      showSecrets(`Đã tạo ${res.created.length} tài khoản`, res.created.map((c) => ({ name: c.fullName, phone: c.phone, pin: c.pin })));
      await load();
    }
  });
  const close = h("button", { type: "button", class: "btn" }, "Đóng");
  close.addEventListener("click", () => (sheetEl.hidden = true));
  replaceChildren(
    sheetEl,
    h("h2", null, "Xem trước dữ liệu từ Google Sheet"),
    h("p", { class: "muted" }, "Sheet chỉ là nguồn đề xuất. Mọi tài khoản mới đều là vai trò Nhân viên (cấp quản trị viên ở bảng bên dưới). Sheet không tự ngưng hay xoá ai."),
    fresh.length === 0
      ? h("p", { class: "alert warn" }, r.candidates.length === 0 && r.problems.length > 0
          ? "Sheet chưa có ai kèm số điện thoại hợp lệ. Hãy điền số điện thoại vào Sheet rồi đồng bộ lại."
          : "Không có ai mới để thêm — mọi người trong Sheet đều đã có tài khoản.")
      : h("div", null, h("h3", null, `Người mới (${fresh.length})`), ...fresh.map((c) => h("label", { class: "check" }, boxes.get(c.phone)!, `${c.name} — ${c.phone}`))),
    r.candidates.some((c) => c.status !== "new") &&
      h("div", null, h("h3", null, "Đã có tài khoản"), h("ul", { class: "history" }, ...r.candidates.filter((c) => c.status !== "new").map((c) => h("li", null, `${c.phone}: `, c.status === "name_differs" ? `Sheet ghi "${c.name}", hệ thống đang là "${c.currentName}" (sửa tên ở nút Sửa nếu cần)` : `${c.name} — không đổi`)))),
    r.problems.length > 0 && h("div", null, h("h3", null, `Dòng bị bỏ qua (${r.problems.length})`), h("ul", { class: "history" }, ...r.problems.map((p) => h("li", null, `Dòng ${p.row}: ${p.message}`)))),
    r.notInSheet.length > 0 && h("details", null, h("summary", { class: "muted" }, `${r.notInSheet.length} tài khoản có trong hệ thống nhưng không có trong Sheet (không bị đụng tới)`), h("ul", { class: "history" }, ...r.notInSheet.map((s) => h("li", null, `${s.fullName} — ${s.phone}${s.active ? "" : " (đã ngưng)"}`)))),
    h("div", { class: "actions", style: "margin-top:12px" }, fresh.length > 0 && apply, close),
  );
  refresh();
  sheetEl.hidden = false;
  sheetEl.scrollIntoView({ block: "nearest" });
});

const staff = await initShell();
me = staff;
if (staff.role !== "admin") showError(errorEl, "Chỉ quản trị viên được vào trang này.");
else await load();
