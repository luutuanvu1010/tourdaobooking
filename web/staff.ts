import { ApiError, api, type StaffAccount, type Api } from "./api";
import { NHAN_LY_DO_KHOP } from "../src/shared/ho-so-trung";
import { PERMISSION_CODES, PERMISSION_LABEL, can, type PermissionCode } from "../src/shared/permissions";
import { ROLE_CODES, canManageAccount, rolesLabel } from "../src/shared/roles";
import { byId, h, replaceChildren } from "./dom";
import { dateTime } from "./format";
import { rolePicker, type RolePicker, type RolePickerValue } from "./role-picker";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const listEl = byId("list");
const listCardsEl = byId("list-cards");
const secretEl = byId("secret");
const editEl = byId("edit");
const permissionsLabel = (list: readonly PermissionCode[]): string => (list.length ? list.map((p) => PERMISSION_LABEL[p]).join(", ") : "—");
const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

/** Tài khoản đã gán vai → tên vai; chưa gán → quyền cũ kèm ghi chú (chờ chuyển sang cách mới, đặc tả §14). */
const accessLabel = (s: StaffAccount): string => (s.roles.length ? rolesLabel(s.roles) : `${permissionsLabel(s.permissions)} (chưa gán vai)`);
const EMPTY: RolePickerValue = { roles: [], adds: [], removes: [], reason: "" };
const sameAssignment = (a: RolePickerValue, b: RolePickerValue): boolean => sameSet(a.roles, b.roles) && sameSet(a.adds, b.adds) && sameSet(a.removes, b.removes);
let meSuper = false;
// ADR-0042 + ADR-0071 điều 1e: đặt lại PIN, gỡ Face ID, mở khoá — Quản trị + Toàn quyền (ô account.access.manage); HCNS không thấy nút (máy chủ vẫn chặn 403).
let canAccessManage = false;

let me: { id: string; permissions: readonly PermissionCode[] };
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

// ADR-0042 + ADR-0071 điều 1c: Quản trị / HCNS chỉ tác động được tài khoản cấp dưới (CÙNG luật mayManage của máy chủ — canManageAccount ở src/shared/roles.ts)
// — ẩn nút trên tài khoản giữ Quản trị / Toàn quyền / Nhân sự (máy chủ trả tài khoản Toàn quyền như Quản trị thường cho người không giữ Toàn quyền).
const quanDuoc = (s: StaffAccount): boolean => s.id === me.id || canManageAccount(me.permissions, s.permissions);

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
      quanDuoc(s) && btn("Sửa", () => void openEdit(s)),
      // DK-T3-02: không hiện trên hàng/thẻ của chính mình — máy chủ trả 403 (đặt lại không hỏi PIN cũ); đổi PIN của mình ở trang "Tôi".
      canAccessManage && quanDuoc(s) &&
        !isMe &&
        btn("Đặt lại PIN", async () => {
          if (!confirm(`Đặt lại PIN của ${s.fullName}? PIN cũ, Face ID và mọi phiên đang đăng nhập sẽ mất hiệu lực.`)) return;
          const r = await act(() => api<Api.StaffWithPinResponse>(`/api/staff/${s.id}/reset-pin`, { method: "POST" }));
          if (r) {
            showSecrets("PIN mới", [{ name: s.fullName, phone: s.phone, pin: r.pin }]);
            await load();
          }
        }),
      canAccessManage && quanDuoc(s) && s.locked && btn("Mở khoá", async () => {
        if (await act(() => api(`/api/staff/${s.id}/unlock`, { method: "POST" }))) await load();
      }),
      // Không hiện trên hàng của chính admin đang đăng nhập: route quản trị đăng xuất người bị gỡ NGAY mà không cấp cookie mới cho người gọi — tự gỡ của mình làm ở trang "Tôi".
      canAccessManage && quanDuoc(s) &&
        !isMe &&
        s.passkeyCount > 0 &&
        btn(`Gỡ Face ID (${s.passkeyCount})`, async () => {
          if (!confirm(`Gỡ Face ID của ${s.fullName} trên mọi máy? Mọi phiên đang đăng nhập của tài khoản này sẽ bị đăng xuất.`)) return;
          if (await act(() => api(`/api/staff/${s.id}/passkeys/remove-all`, { method: "POST" }))) await load();
        }),
      quanDuoc(s) &&
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
      quanDuoc(s) && btn("Sửa", () => void openEdit(s)),
      // DK-T3-02: không hiện trên hàng/thẻ của chính mình — máy chủ trả 403 (đặt lại không hỏi PIN cũ); đổi PIN của mình ở trang "Tôi".
      canAccessManage && quanDuoc(s) &&
        !isMe &&
        btn("Đặt lại PIN", async () => {
          if (!confirm(`Đặt lại PIN của ${s.fullName}? PIN cũ, Face ID và mọi phiên đang đăng nhập sẽ mất hiệu lực.`)) return;
          const r = await act(() => api<Api.StaffWithPinResponse>(`/api/staff/${s.id}/reset-pin`, { method: "POST" }));
          if (r) {
            showSecrets("PIN mới", [{ name: s.fullName, phone: s.phone, pin: r.pin }]);
            await load();
          }
        }),
      canAccessManage && quanDuoc(s) && s.locked && btn("Mở khoá", async () => {
        if (await act(() => api(`/api/staff/${s.id}/unlock`, { method: "POST" }))) await load();
      }),
      // Không hiện trên thẻ của chính admin đang đăng nhập: route quản trị đăng xuất người bị gỡ NGAY mà không cấp cookie mới cho người gọi — tự gỡ của mình làm ở trang "Tôi".
      canAccessManage && quanDuoc(s) &&
        !isMe &&
        s.passkeyCount > 0 &&
        btn(`Gỡ Face ID (${s.passkeyCount})`, async () => {
          if (!confirm(`Gỡ Face ID của ${s.fullName} trên mọi máy? Mọi phiên đang đăng nhập của tài khoản này sẽ bị đăng xuất.`)) return;
          if (await act(() => api(`/api/staff/${s.id}/passkeys/remove-all`, { method: "POST" }))) await load();
        }),
      quanDuoc(s) &&
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
    return meSuper || code !== "SUPER_ADMIN" ? h("label", { class: "check" }, box, PERMISSION_LABEL[code]) : null; // ADR-0042: vai ẩn
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
const existingNote = h("div", { id: "add-khop", class: "muted", hidden: true });

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

// ADR-0068 Đ9 (C1): gõ SĐT hoặc tên → liệt kê MỌI hồ sơ cá nhân khớp; phải chọn "Dùng hồ sơ này" hoặc tick "Vẫn tạo hồ sơ mới" thì nút Tạo mở. Máy chủ kiểm lại
// (409 party_match_exists — cùng một hàm với route đọc). Tra sau 300 ms ngừng gõ; chỉ nhận kết quả của lần tra MỚI NHẤT (`lanKhop`).
let khop: Api.PartyMatchDto[] = [];
// ADR-0071 điều 3b: có hồ sơ trùng mà tài khoản này không được thấy (không xem Danh bạ — Hành chính nhân sự): máy chủ chỉ báo cờ, không tên.
let khopAn = false;
const CAU_KHOP_AN = "Số hoặc tên này đã có trong Danh bạ. Vẫn tạo được hồ sơ mới; sau đó nhờ Quản trị gộp hồ sơ trùng.";
const taoMoi = h("input", { type: "checkbox", class: "o-tick" });
const nutTao = byId<HTMLFormElement>("add-form").querySelector<HTMLButtonElement>('button[type="submit"]')!;
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
      const dung = h("button", { type: "button", class: "btn btn-link" }, "Dùng hồ sơ này");
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

byId<HTMLFormElement>("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  showError(errorEl, null);
  if (!addPicker) return;
  const v = addPicker.value();
  if (v.roles.length === 0) return showError(errorEl, "Chọn ít nhất một vai.");
  const who = existingPartyId ? { partyId: existingPartyId } : { fullName: addName.value, ...(taoMoi.checked ? { taoHoSoMoi: true } : {}) };
  const body = { phone: addPhone.value, roles: v.roles, adds: v.adds, removes: v.removes, reason: v.reason, ...who };
  let r: Api.StaffWithPinResponse;
  try {
    r = await api<Api.StaffWithPinResponse>("/api/staff", { method: "POST", body });
  } catch (err) {
    // Máy chủ thấy hồ sơ khớp mà lần tra lúc gõ chưa kịp trả (hoặc vừa có hồ sơ mới): hiện khối với danh sách của máy chủ, kèm câu báo của máy chủ.
    if (err instanceof ApiError && err.code === "party_match_exists") {
      huyTraKhop();
      const ct = err.details as Partial<Api.PartyMatchResponse> | undefined;
      khop = ct?.khop ?? [];
      khopAn = ct?.coHoSoKhacTrongDanhBa === true;
      veKhop();
      // Câu "đã có trong Danh bạ" khối hồ sơ khớp đã hiện — không lặp lại ở ô báo lỗi (chủ dự án 2026-10-01).
      if (khopAn && err.message === CAU_KHOP_AN) return;
      return showError(errorEl, err.message);
    }
    return fail(err);
  }
  showSecrets("Tài khoản mới", [{ name: r.staff.fullName, phone: r.staff.phone, pin: r.pin }]);
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
meSuper = can(staff, "admin.manage.superadmin"); // ADR-0072 mục 4a: hỏi bảng quyền (ô gán/gỡ Toàn quyền), không hỏi mã
canAccessManage = can(staff, "account.access.manage");
// ADR-0071 điều 1b: cổng trang theo ô account.view (Quản trị, Toàn quyền, Hành chính nhân sự — cùng đối tượng với cổng "accounts" của API); khung "Thêm tài khoản"
// theo ô account.create (Hành chính nhân sự, Toàn quyền — Quản trị KHÔNG).
if (!can(staff, "account.view")) showError(errorEl, "Tài khoản này không quản lý được tài khoản.");
else {
  if (can(staff, "account.create")) {
    byId("add-card").hidden = false;
    setupAddForm();
  }
  await load();
}
