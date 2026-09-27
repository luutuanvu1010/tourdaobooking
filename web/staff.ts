import { ApiError, api, type SheetCandidate, type StaffAccount, type Api } from "./api";
import { PERMISSION_CODES, PERMISSION_LABEL, can, hasPermission, type PermissionCode } from "../src/shared/permissions";
import { ROLE_CODES, rolesLabel } from "../src/shared/roles";
import { byId, h, replaceChildren } from "./dom";
import { dateTime } from "./format";
import { rolePicker, type RolePicker, type RolePickerValue } from "./role-picker";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const listEl = byId("list");
const listCardsEl = byId("list-cards");
const secretEl = byId("secret");
const sheetEl = byId("sheet");
const editEl = byId("edit");
const permissionsLabel = (list: readonly PermissionCode[]): string => (list.length ? list.map((p) => PERMISSION_LABEL[p]).join(", ") : "—");
const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

/** Tài khoản đã gán vai → tên vai; chưa gán → quyền cũ kèm ghi chú (chờ chuyển sang cách mới, đặc tả §14). */
const accessLabel = (s: StaffAccount): string => (s.roles.length ? rolesLabel(s.roles) : `${permissionsLabel(s.permissions)} (chưa gán vai)`);
const EMPTY: RolePickerValue = { roles: [], adds: [], removes: [], reason: "" };
const sameAssignment = (a: RolePickerValue, b: RolePickerValue): boolean => sameSet(a.roles, b.roles) && sameSet(a.adds, b.adds) && sameSet(a.removes, b.removes);
let meSuper = false;
// ADR-0038 điều 6: đặt lại PIN, gỡ Face ID, mở khoá, đồng bộ từ Sheet chỉ Toàn quyền — Quản trị không thấy nút (máy chủ vẫn chặn 403).
let canAccessManage = false;

let me: { id: string };
let accounts: StaffAccount[] = [];

const reasonOf = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const fail = (err: unknown) => showError(errorEl, reasonOf(err));

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
    h("td", null, accessLabel(s)),
    h("td", { class: "muted" }, dateTime(s.createdAt)),
    h("td", { class: "muted" }, s.lastLoginAt ? dateTime(s.lastLoginAt) : "Chưa ghi nhận"),
    h(
      "td",
      { class: "row-actions" },
      btn("Sửa", () => void openEdit(s)),
      // DK-T3-02: không hiện trên hàng/thẻ của chính mình — máy chủ trả 403 (đặt lại không hỏi PIN cũ); đổi PIN của mình ở trang "Tôi".
      canAccessManage &&
        !isMe &&
        btn("Đặt lại PIN", async () => {
          if (!confirm(`Đặt lại PIN của ${s.fullName}? PIN cũ, Face ID và mọi phiên đang đăng nhập sẽ mất hiệu lực.`)) return;
          const r = await act(() => api<Api.StaffWithPinResponse>(`/api/staff/${s.id}/reset-pin`, { method: "POST" }));
          if (r) {
            showSecrets("PIN mới", [{ name: s.fullName, phone: s.phone, pin: r.pin }]);
            await load();
          }
        }),
      canAccessManage && s.locked && btn("Mở khoá", async () => {
        if (await act(() => api(`/api/staff/${s.id}/unlock`, { method: "POST" }))) await load();
      }),
      // Không hiện trên hàng của chính admin đang đăng nhập: route quản trị đăng xuất người bị gỡ NGAY mà không cấp cookie mới cho người gọi — tự gỡ của mình làm ở trang "Tôi".
      canAccessManage &&
        !isMe &&
        s.passkeyCount > 0 &&
        btn(`Gỡ Face ID (${s.passkeyCount})`, async () => {
          if (!confirm(`Gỡ Face ID của ${s.fullName} trên mọi máy? Mọi phiên đang đăng nhập của tài khoản này sẽ bị đăng xuất.`)) return;
          if (await act(() => api(`/api/staff/${s.id}/passkeys/remove-all`, { method: "POST" }))) await load();
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

function card(s: StaffAccount): HTMLElement {
  const btn = (label: string, onclick: () => void, danger = false) => {
    const b = h("button", { type: "button", class: danger ? "pill-btn pill-btn-danger" : "pill-btn" }, label);
    b.addEventListener("click", onclick);
    return b;
  };
  const isMe = s.id === me.id;
  return h(
    "div",
    { class: s.active ? "card card-col" : "card card-col row-off" },
    h("div", null, h("strong", null, s.fullName), isMe && h("span", { class: "muted" }, " (bạn)")),
    !s.active && h("div", null, h("span", { class: "badge badge-cancelled" }, "Ngưng")),
    s.locked && h("div", null, h("span", { class: "badge badge-draft" }, "Bị khoá đăng nhập")),
    h("div", { class: "muted" }, s.phone, " · ", accessLabel(s)),
    h("div", { class: "muted" }, s.lastLoginAt ? `Đăng nhập gần nhất ${dateTime(s.lastLoginAt)}` : "Chưa ghi nhận đăng nhập"),
    h(
      "div",
      { style: "display:flex;flex-wrap:wrap;gap:var(--s2);margin-top:var(--s1)" },
      btn("Sửa", () => void openEdit(s)),
      // DK-T3-02: không hiện trên hàng/thẻ của chính mình — máy chủ trả 403 (đặt lại không hỏi PIN cũ); đổi PIN của mình ở trang "Tôi".
      canAccessManage &&
        !isMe &&
        btn("Đặt lại PIN", async () => {
          if (!confirm(`Đặt lại PIN của ${s.fullName}? PIN cũ, Face ID và mọi phiên đang đăng nhập sẽ mất hiệu lực.`)) return;
          const r = await act(() => api<Api.StaffWithPinResponse>(`/api/staff/${s.id}/reset-pin`, { method: "POST" }));
          if (r) {
            showSecrets("PIN mới", [{ name: s.fullName, phone: s.phone, pin: r.pin }]);
            await load();
          }
        }),
      canAccessManage && s.locked && btn("Mở khoá", async () => {
        if (await act(() => api(`/api/staff/${s.id}/unlock`, { method: "POST" }))) await load();
      }),
      // Không hiện trên thẻ của chính admin đang đăng nhập: route quản trị đăng xuất người bị gỡ NGAY mà không cấp cookie mới cho người gọi — tự gỡ của mình làm ở trang "Tôi".
      canAccessManage &&
        !isMe &&
        s.passkeyCount > 0 &&
        btn(`Gỡ Face ID (${s.passkeyCount})`, async () => {
          if (!confirm(`Gỡ Face ID của ${s.fullName} trên mọi máy? Mọi phiên đang đăng nhập của tài khoản này sẽ bị đăng xuất.`)) return;
          if (await act(() => api(`/api/staff/${s.id}/passkeys/remove-all`, { method: "POST" }))) await load();
        }),
      !isMe &&
        btn(
          s.active ? "Ngưng" : "Kích hoạt lại",
          async () => {
            if (s.active && !confirm(`Ngưng tài khoản ${s.fullName}? Họ sẽ bị đăng xuất ngay.`)) return;
            if (await act(() => api(`/api/staff/${s.id}`, { method: "PATCH", body: { active: !s.active } }))) await load();
          },
          s.active,
        ),
    ),
  );
}

async function openEdit(s: StaffAccount): Promise<void> {
  const legacy = s.roles.length === 0; // chưa gán vai: còn sửa được quyền cũ
  let saved = EMPTY;
  if (!legacy) {
    const r = await act(() => api<Api.StaffRolesResponse>(`/api/staff/${s.id}/roles`));
    if (!r) return; // lỗi đã hiện ở errorEl
    saved = { roles: r.roles, adds: r.adds, removes: r.removes, reason: r.reason ?? "" };
  }
  const name = h("input", { type: "text", value: s.fullName, maxLength: 200 });
  const phone = h("input", { type: "tel", value: s.phone });
  const isMe = s.id === me.id;
  const picker = rolePicker({ initial: saved, actorIsSuperAdmin: meSuper, current: s.permissions });
  const boxes = new Map<PermissionCode, HTMLInputElement>();
  const permissionBoxes = PERMISSION_CODES.map((code) => {
    const box = h("input", { type: "checkbox", checked: s.permissions.includes(code), disabled: isMe, style: "width:auto;display:inline;margin:0 6px 0 0" });
    boxes.set(code, box);
    return h("label", { class: "check" }, box, PERMISSION_LABEL[code]);
  });
  const save = h("button", { type: "button", class: "btn btn-primary" }, "Lưu");
  const cancel = h("button", { type: "button", class: "btn" }, "Đóng");
  cancel.addEventListener("click", () => (editEl.hidden = true));
  save.addEventListener("click", async () => {
    const chosen = picker.value();
    const legacyPerms = PERMISSION_CODES.filter((code) => boxes.get(code)!.checked);
    if (!legacy && chosen.roles.length === 0) return showError(errorEl, "Chọn ít nhất một vai.");
    if (legacy && chosen.roles.length === 0 && !isMe && legacyPerms.length === 0) return showError(errorEl, "Chọn ít nhất một vai (hoặc một quyền cũ).");
    if (!(await act(() => api(`/api/staff/${s.id}`, { method: "PATCH", body: { fullName: name.value, phone: phone.value } })))) return;
    try {
      if (chosen.roles.length > 0 && !sameAssignment(chosen, saved)) {
        const body: Api.StaffRolesRequest = { roles: chosen.roles, adds: chosen.adds, removes: chosen.removes, reason: chosen.reason };
        await api(`/api/staff/${s.id}/roles`, { method: "PUT", body });
      } else if (legacy && chosen.roles.length === 0 && !isMe && !sameSet(legacyPerms, s.permissions)) {
        const body: Api.StaffPermissionsRequest = { permissions: legacyPerms };
        await api(`/api/staff/${s.id}/permissions`, { method: "PUT", body });
      }
    } catch (err) {
      // Tên/số điện thoại đã lưu ở lời gọi trên. load() xoá thông báo lỗi (act mở đầu bằng showError(null)), nên nạp lại TRƯỚC rồi mới hiện lý do.
      await load();
      return showError(errorEl, `Đã lưu tên/số điện thoại nhưng chưa đổi được vai/quyền: ${reasonOf(err)}`);
    }
    editEl.hidden = true;
    await load();
  });
  replaceChildren(
    editEl,
    h("h2", null, `Sửa: ${s.fullName}`),
    h("div", { class: "grid two" }, h("label", null, "Họ tên", name), h("label", null, "Số điện thoại đăng nhập", phone)),
    h("h3", null, "Vai và quyền"),
    legacy && h("p", { class: "alert warn" }, `Tài khoản này chưa gán vai, đang dùng quyền cũ: ${permissionsLabel(s.permissions)}. Chọn vai để chuyển sang cách mới — xem dòng "Sẽ mất" trước khi lưu.`),
    isMe && h("p", { class: "muted" }, "Bạn chỉ đổi được vai của chính mình khi quyền không đổi (xem dòng xem trước)."),
    picker.el,
    legacy && h("details", null, h("summary", null, "Quyền cũ (chỉ dùng khi chưa gán vai)"), ...permissionBoxes),
    h("p", { class: "muted" }, "Đổi số điện thoại sẽ đổi tên đăng nhập của người này. Phiên đang đăng nhập vẫn giữ nguyên."),
    h("div", { class: "actions" }, save, cancel),
  );
  editEl.hidden = false;
  editEl.scrollIntoView({ block: "nearest" });
}

async function load(): Promise<void> {
  const r = await act(() => api<Api.StaffListResponse>("/api/staff"));
  if (!r) return;
  accounts = r.staff;
  replaceChildren(listEl, ...accounts.map(row));
  replaceChildren(listCardsEl, ...accounts.map(card));
}

// ---- Thêm thủ công (ADR-0018): chọn vai + xem trước; tuỳ chọn dùng hồ sơ cá nhân có sẵn (tra theo SĐT) để không tạo hồ sơ trùng.
// Khối vai dựng SAU khi biết người dùng có phải Toàn quyền không (setupAddForm) — ô Giám đốc/Điều hành chỉ mở cho Toàn quyền.
let addPicker: RolePicker | null = null;
let existingPartyId: string | null = null;
const addName = byId<HTMLInputElement>("add-name");
const addPhone = byId<HTMLInputElement>("add-phone");
const existingNote = h("div", { class: "muted", hidden: true });

function setupAddForm(): void {
  addPicker = rolePicker({ initial: EMPTY, actorIsSuperAdmin: meSuper, current: null });
  replaceChildren(byId("add-perms"), addPicker.el, existingNote);
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

addPhone.addEventListener("change", async () => {
  clearExisting();
  const raw = addPhone.value.trim();
  if (!raw) return;
  let found: Api.PartyLookupResponse | null = null;
  try {
    found = await api<Api.PartyLookupResponse>(`/api/parties/lookup?phone=${encodeURIComponent(raw)}`);
  } catch {
    return; // SĐT chưa đúng dạng hay mất mạng: không gợi ý gì, không báo lỗi giữa lúc gõ
  }
  const person = found.matches.find((m) => m.kind === "PERSON" && m.active);
  if (!person) return;
  const use = h("button", { type: "button", class: "btn btn-link" }, `Dùng hồ sơ có sẵn: ${person.displayName}`);
  use.addEventListener("click", () => {
    existingPartyId = person.id;
    addName.value = person.displayName;
    addName.readOnly = true;
    replaceChildren(existingNote, `Sẽ tạo tài khoản cho hồ sơ có sẵn "${person.displayName}" (không tạo hồ sơ mới). Đổi số điện thoại để bỏ chọn.`);
    void preselectRoles(person.id);
  });
  replaceChildren(existingNote, use);
  existingNote.hidden = false;
});

/**
 * Ruling R26: hồ sơ có sẵn đang giữ vai tài khoản (không gắn nơi, chưa đóng — cùng định nghĩa "đang mở" với máy chủ) thì máy chủ bắt chọn cả vai đó.
 * Chọn sẵn các vai này (hợp với vai người dùng đã tích, giữ chỉnh tay + lý do). Không đọc được thì im lặng — máy chủ vẫn kiểm.
 */
async function preselectRoles(partyId: string): Promise<void> {
  let party: Api.PartyDto;
  try {
    party = (await api<Api.PartyResponse>(`/api/parties/${encodeURIComponent(partyId)}`)).party;
  } catch {
    return;
  }
  if (existingPartyId !== partyId || !addPicker) return; // người dùng đã đổi số/bỏ chọn trong lúc chờ
  const open = party.roles.filter((r) => r.locationId === null && r.validTo === null).map((r) => r.roleTypeCode);
  const v = addPicker.value();
  addPicker.reset({ ...v, roles: ROLE_CODES.filter((c) => v.roles.includes(c) || open.includes(c)) });
}

byId<HTMLFormElement>("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!addPicker) return;
  const v = addPicker.value();
  if (v.roles.length === 0) return showError(errorEl, "Chọn ít nhất một vai.");
  const who = existingPartyId ? { partyId: existingPartyId } : { fullName: addName.value };
  const body = { phone: addPhone.value, roles: v.roles, adds: v.adds, removes: v.removes, reason: v.reason, ...who };
  const r = await act(() => api<Api.StaffWithPinResponse>("/api/staff", { method: "POST", body }));
  if (r) {
    showSecrets("Tài khoản mới", [{ name: r.staff.fullName, phone: r.staff.phone, pin: r.pin }]);
    clearExisting();
    addName.value = addPhone.value = "";
    addPicker.reset(EMPTY);
    await load();
  }
});

// ---- Đồng bộ từ Google Sheet: xem trước rồi mới xác nhận
byId("sheet-pull").addEventListener("click", async () => {
  const r = await act(() =>
    api<Api.StaffSheetPreviewResponse>("/api/staff/sheet"),
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
    const res = await act(() => api<Api.StaffSheetApplyResponse>("/api/staff/sheet/apply", { method: "POST", body: { phones } }));
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
    h("p", { class: "muted" }, "Sheet chỉ là nguồn đề xuất. Mọi tài khoản mới mang vai Nhân viên kinh doanh (đổi vai ở nút Sửa). Sheet không tự ngưng hay xoá ai."),
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
meSuper = hasPermission(staff, "SUPER_ADMIN");
canAccessManage = can(staff, "account.access.manage");
byId("sheet-pull").hidden = !can(staff, "staff.sheet.sync");
// Cổng trang theo ô admin.manage (Quản trị HOẶC Toàn quyền — cùng đối tượng với access "admin" của API), không riêng quyền ADMIN.
if (!can(staff, "admin.manage")) showError(errorEl, "Chỉ quản trị viên được vào trang này.");
else {
  setupAddForm();
  await load();
}
