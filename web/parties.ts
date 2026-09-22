// Trang Hồ sơ: tìm/lọc, tạo (cảnh báo trùng SĐT — ADR-0001 mục 8), xem/sửa, liên hệ, vai trò theo nơi và quan hệ.
// Vai trò và quan hệ chỉ quản trị viên sửa (ADR-0007); mọi nhân sự văn phòng tạo/sửa hồ sơ và liên hệ. Sửa hồ sơ dùng khoá lạc quan.
import { hasPermission } from "../src/shared/permissions";
import { ApiError, api, type Api, type Staff } from "./api";
import { byId, h, replaceChildren, type Child } from "./dom";
import { initials } from "./format";
import { icon } from "./icons";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const listEl = byId("list");
const listCardsEl = byId("list-cards");
const detailEl = byId("detail");
const createEl = byId("create");
const PAGE = 30;

let me: Staff;
let admin = false;
let meta: Api.PartyMetaResponse = { roleTypes: [], relationshipTypes: [] };
let locations: Api.LocationDto[] = [];
let offset = 0;
let openId: string | null = null;

const STALE_NOTICE = "Hồ sơ vừa được người khác thay đổi nên bản đang xem đã cũ. Đã nạp bản mới — hãy kiểm tra rồi Lưu lại nếu vẫn cần.";
const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

/**
 * Chạy một thao tác. Thao tác GHI truyền `btn`: nút bị khoá từ lúc bấm đến khi xong cả phần nạp lại (bấm đúp không tạo trùng), mở lại ở `finally`.
 * `onStale` (chỉ cho PUT có khoá lạc quan): gặp 409 `stale` thì nạp lại dữ liệu rồi hiện thông báo. Thông báo phải đặt SAU khi nạp xong vì act() xoá lỗi ở đầu mỗi lần gọi.
 */
async function act<T>(fn: () => Promise<T>, btn?: HTMLButtonElement | null, onStale?: () => Promise<void>): Promise<T | undefined> {
  if (btn?.disabled) return undefined;
  showError(errorEl, null);
  if (btn) btn.disabled = true;
  try {
    return await fn();
  } catch (err) {
    if (onStale && err instanceof ApiError && err.code === "stale") {
      await onStale();
      if (errorEl.hidden) showError(errorEl, STALE_NOTICE); // nạp lại thất bại thì giữ lỗi của lần nạp
    } else fail(err);
    return undefined;
  } finally {
    if (btn) btn.disabled = false;
  }
}

const KIND_LABEL = { PERSON: "Cá nhân", ORGANIZATION: "Tổ chức" } as const;
/** Nút chữ; `onclick` nhận chính nút để truyền cho act() khoá lúc gửi. */
const button = (label: string, onclick: (b: HTMLButtonElement) => void, cls = "btn btn-link"): HTMLButtonElement => {
  const b = h("button", { type: "button", class: cls }, label);
  b.addEventListener("click", () => onclick(b));
  return b;
};
const field = (label: string, input: Child): HTMLElement => h("label", null, label, input);
const input = (value = "", extra: Record<string, unknown> = {}) => h("input", { type: "text", value, ...extra });
/** Ô chọn; mặc định chọn MỤC ĐẦU (gán value = "" khi không có mục rỗng sẽ không chọn gì và select.value trả ""). */
const select = (options: { value: string; label: string }[], selected = options[0]?.value ?? "") => {
  const s = h("select", null, ...options.map((o) => h("option", { value: o.value }, o.label)));
  s.value = selected;
  return s;
};
const period = (from: string, to: string | null) => (to ? `${from} → ${to}` : `từ ${from}`);
const checkbox = (checked: boolean) => h("input", { type: "checkbox", checked, style: "width:auto;display:inline;margin:0 6px 0 0" });
const roleLabel = (code: string) => meta.roleTypes.find((t) => t.code === code)?.name ?? code;

// ---- Danh sách + tìm kiếm -----------------------------------------------------------------------------------------
function queryString(extra: Record<string, string>): string {
  const p = new URLSearchParams({ limit: String(PAGE), ...extra });
  for (const [k, id] of [["q", "q"], ["kind", "kind"], ["role", "role"], ["location", "location"]] as const) {
    const v = byId<HTMLInputElement | HTMLSelectElement>(id).value.trim();
    if (v) p.set(k, v);
  }
  if (byId<HTMLInputElement>("inactive").checked) p.set("includeInactive", "1");
  return p.toString();
}

function card(p: Api.PartyListItemDto): HTMLElement {
  const el = h(
    "div",
    { class: "card", style: "cursor:pointer" },
    h("div", { style: "width:40px;height:40px;border-radius:var(--radius-pill);background:var(--c-primary-soft);color:var(--c-primary);display:flex;align-items:center;justify-content:center;font-weight:800;flex:none" }, initials(p.displayName)),
    h(
      "div",
      { style: "flex:1" },
      h("div", null, p.displayName, !p.active && h("span", { class: "badge badge-cancelled" }, " Ngưng")),
      h("div", { class: "muted" }, p.primaryPhone ?? "—", " · ", p.roleCodes.map(roleLabel).join(", ") || "—"),
    ),
    icon("next", 20),
  );
  el.addEventListener("click", () => void openDetail(p.id));
  return el;
}

async function search(reset = true): Promise<void> {
  if (reset) offset = 0;
  const r = await act(() => api<Api.PartyListResponse>(`/api/parties?${queryString({ offset: String(offset) })}`));
  if (!r) return;
  const rows = r.parties.map((p) => {
    const tr = h("tr", { class: p.active ? "" : "row-off", style: "cursor:pointer" }, h("td", null, p.displayName, !p.active && h("span", { class: "badge badge-cancelled" }, "Ngưng")), h("td", null, KIND_LABEL[p.kind]), h("td", null, p.primaryPhone ?? ""), h("td", null, p.roleCodes.map(roleLabel).join(", ")));
    tr.addEventListener("click", () => void openDetail(p.id));
    return tr;
  });
  if (reset) {
    replaceChildren(listEl, ...rows);
    replaceChildren(listCardsEl, ...r.parties.map(card));
  } else {
    listEl.append(...rows);
    listCardsEl.append(...r.parties.map(card));
  }
  byId("empty").hidden = listEl.children.length > 0;
  byId("more").hidden = !r.hasMore;
  offset += r.parties.length;
}

// ---- Tạo hồ sơ (cảnh báo trùng SĐT) ------------------------------------------------------------------------------------
function openCreate(): void {
  const kind = select([{ value: "PERSON", label: "Cá nhân" }, { value: "ORGANIZATION", label: "Tổ chức (đại lý, công ty)" }]);
  const fullName = input("", { maxLength: 200 });
  const displayName = input("", { maxLength: 200 });
  const legalName = input("", { maxLength: 300 });
  const taxCode = input("", { maxLength: 14 });
  const address = input("", { maxLength: 300 });
  const invoiceEmail = input("", { maxLength: 200, type: "email" });
  const phone = input("", { type: "tel", maxLength: 30 });
  const email = input("", { type: "email", maxLength: 200 });
  const dupBox = h("div", { class: "alert warn", hidden: true });
  const personFields = h("div", { class: "grid three" }, field("Họ và tên", fullName));
  const orgFields = h("div", { class: "grid three" }, field("Tên gọi", displayName), field("Tên pháp lý", legalName), field("Mã số thuế", taxCode), field("Địa chỉ", address), field("Email nhận hoá đơn", invoiceEmail));
  const sync = () => {
    personFields.hidden = kind.value !== "PERSON";
    orgFields.hidden = kind.value !== "ORGANIZATION";
  };
  kind.addEventListener("change", sync);

  let timer: number | undefined;
  phone.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      dupBox.hidden = true;
      if (phone.value.replace(/\D/g, "").length < 10) return;
      const r = await act(() => api<Api.PartyLookupResponse>(`/api/parties/lookup?phone=${encodeURIComponent(phone.value)}`));
      if (!r || r.matches.length === 0) return;
      replaceChildren(
        dupBox,
        h("strong", null, `Đã có ${r.matches.length} hồ sơ dùng số này — kiểm tra trước khi tạo mới:`),
        ...r.matches.map((m) => h("div", null, `${m.displayName} (${KIND_LABEL[m.kind]}) `, button("Mở hồ sơ này", () => void openDetail(m.id)))),
        h("div", { class: "muted" }, "Cùng một số có thể thuộc nhiều hồ sơ (vd người nhà, công ty). Nếu đúng người thì dùng hồ sơ có sẵn."),
      );
      dupBox.hidden = false;
    }, 400);
  });

  const save = h("button", { type: "button", class: "btn btn-primary" }, "Tạo hồ sơ");
  save.addEventListener("click", async () => {
    const contacts: Record<string, unknown>[] = [];
    if (phone.value.trim()) contacts.push({ kind: "PHONE", value: phone.value });
    if (email.value.trim()) contacts.push({ kind: "EMAIL", value: email.value });
    const body =
      kind.value === "PERSON"
        ? { kind: "PERSON", fullName: fullName.value, contacts }
        : { kind: "ORGANIZATION", displayName: displayName.value, legalName: legalName.value, taxCode: taxCode.value, address: address.value, invoiceEmail: invoiceEmail.value, contacts };
    await act(async () => {
      const r = await api<Api.PartyResponse>("/api/parties", { method: "POST", body });
      createEl.hidden = true;
      await search();
      await openDetail(r.party.id);
    }, save);
  });
  replaceChildren(
    createEl,
    h("h2", null, "Hồ sơ mới"),
    field("Loại", kind),
    personFields,
    orgFields,
    h("div", { class: "grid three" }, field("Số điện thoại (không bắt buộc)", phone), field("Email (không bắt buộc)", email)),
    dupBox,
    h("div", { class: "actions" }, save, button("Đóng", () => (createEl.hidden = true), "btn")),
  );
  sync();
  createEl.hidden = false;
  createEl.scrollIntoView({ block: "nearest" });
}

// ---- Chi tiết ----------------------------------------------------------------------------------------------------------
async function reload(): Promise<void> {
  if (openId) await openDetail(openId);
  await search();
}

async function openDetail(id: string): Promise<void> {
  const r = await act(() => api<Api.PartyResponse>(`/api/parties/${id}`));
  if (!r) return;
  openId = id;
  const p = r.party;

  // -- thông tin + sửa
  const person = p.kind === "PERSON";
  const fullName = input(p.displayName, { maxLength: 200 });
  const displayName = input(p.displayName, { maxLength: 200 });
  const legalName = input(p.legalName ?? "", { maxLength: 300 });
  const taxCode = input(p.taxCode ?? "", { maxLength: 14 });
  const address = input(p.address ?? "", { maxLength: 300 });
  const invoiceEmail = input(p.invoiceEmail ?? "", { maxLength: 200, type: "email" });
  const active = checkbox(p.active);
  const saveInfo = button(
    "Lưu thông tin",
    async (b) => {
      const body = person
        ? { fullName: fullName.value, active: active.checked, expectedUpdatedAt: p.updatedAt }
        : { displayName: displayName.value, legalName: legalName.value, taxCode: taxCode.value, address: address.value, invoiceEmail: invoiceEmail.value, active: active.checked, expectedUpdatedAt: p.updatedAt };
      // 409 stale: `p.updatedAt` đã cũ → reload() nạp lại chi tiết (updatedAt mới) và danh sách, rồi hiện thông báo.
      await act(async () => {
        await api<Api.PartyResponse>(`/api/parties/${id}`, { method: "PUT", body });
        await reload();
      }, b, reload);
    },
    "btn btn-primary",
  );
  const info = h(
    "div",
    null,
    h("div", { class: "grid three" }, ...(person ? [field("Họ và tên (tên = từ cuối)", fullName)] : [field("Tên gọi", displayName), field("Tên pháp lý", legalName), field("Mã số thuế", taxCode), field("Địa chỉ", address), field("Email nhận hoá đơn", invoiceEmail)]), h("label", { class: "check" }, active, "Đang dùng")),
    h("div", { class: "actions" }, saveInfo),
  );

  // -- liên hệ
  const contactRows = p.contacts.map((c) =>
    h("tr", { class: c.validTo ? "row-off" : "" }, h("td", null, c.kind === "PHONE" ? "Điện thoại" : "Email"), h("td", null, c.value, c.isPrimary && !c.validTo && h("span", { class: "badge" }, "chính")), h("td", { class: "muted" }, c.label ?? ""), h("td", { class: "muted" }, period(c.validFrom, c.validTo)), h("td", null, !c.validTo && button("Đóng", (b) => void act(async () => { await api(`/api/parties/${id}/contacts/${c.id}/end`, { method: "POST", body: {} }); await reload(); }, b)))),
  );
  const cKind = select([{ value: "PHONE", label: "Điện thoại" }, { value: "EMAIL", label: "Email" }]);
  const cValue = input("", { maxLength: 200 });
  const cLabel = input("", { maxLength: 50, placeholder: "Zalo, hotline…" });
  const cPrimary = checkbox(false);
  const addContact = button("Thêm liên hệ", (b) => {
    const body = { kind: cKind.value, value: cValue.value, label: cLabel.value || null, isPrimary: cPrimary.checked };
    void act(async () => { await api(`/api/parties/${id}/contacts`, { method: "POST", body }); await reload(); }, b);
  }, "btn");

  // -- vai trò theo nơi
  const roleRows = p.roles.map((r2) =>
    h("tr", { class: r2.validTo ? "row-off" : "" }, h("td", null, r2.roleName), h("td", null, r2.locationName ?? "(mọi nơi)"), h("td", { class: "muted" }, period(r2.validFrom, r2.validTo)), h("td", null, admin && !r2.validTo && button("Kết thúc", (b) => void act(async () => { await api(`/api/parties/${id}/roles/${r2.id}/end`, { method: "POST", body: {} }); await reload(); }, b)))),
  );
  const rType = select(meta.roleTypes.map((t) => ({ value: t.code, label: t.name })));
  const rLoc = select([{ value: "", label: "(mọi nơi)" }, ...locations.filter((l) => l.active).map((l) => ({ value: l.id, label: l.name }))]);
  const rFrom = input("", { type: "date" });
  const addRole = button("Thêm vai trò", (b) => {
    const body = { roleTypeCode: rType.value, locationId: rLoc.value || null, validFrom: rFrom.value || undefined };
    void act(async () => { await api(`/api/parties/${id}/roles`, { method: "POST", body }); await reload(); }, b);
  }, "btn");

  // -- quan hệ
  const relRows = p.relationships.map((x) =>
    h("tr", { class: x.validTo ? "row-off" : "" }, h("td", null, `${x.fromPartyName} — ${x.typeName} — ${x.toPartyName}`), h("td", { class: "muted" }, period(x.validFrom, x.validTo)), h("td", null, admin && !x.validTo && button("Kết thúc", (b) => void act(async () => { await api(`/api/parties/${id}/relationships/${x.id}/end`, { method: "POST", body: {} }); await reload(); }, b)))),
  );
  const relQ = input("", { placeholder: "Gõ tên hồ sơ cần liên kết…" });
  const relPick = h("select", null);
  const relDir = select([{ value: "from", label: "Hồ sơ này LÀ người liên hệ của…" }, { value: "to", label: "Hồ sơ này CÓ người liên hệ là…" }]);
  let relTimer: number | undefined;
  relQ.addEventListener("input", () => {
    window.clearTimeout(relTimer);
    relTimer = window.setTimeout(async () => {
      if (relQ.value.trim().length < 2) return replaceChildren(relPick);
      const found = await act(() => api<Api.PartyListResponse>(`/api/parties?limit=10&q=${encodeURIComponent(relQ.value.trim())}`));
      replaceChildren(relPick, ...(found?.parties.filter((x) => x.id !== id).map((x) => h("option", { value: x.id }, `${x.displayName} (${KIND_LABEL[x.kind]})`)) ?? []));
    }, 300);
  });
  const addRel = button("Thêm quan hệ", (b) => {
    if (!relPick.value) return showError(errorEl, "Chọn hồ sơ cần liên kết.");
    const body = relDir.value === "from" ? { fromPartyId: id, toPartyId: relPick.value, relationshipTypeCode: "CONTACT_OF" } : { fromPartyId: relPick.value, toPartyId: id, relationshipTypeCode: "CONTACT_OF" };
    void act(async () => { await api(`/api/parties/${id}/relationships`, { method: "POST", body }); await reload(); }, b);
  }, "btn");

  replaceChildren(
    detailEl,
    h("h2", null, p.displayName, " ", h("span", { class: "muted" }, KIND_LABEL[p.kind])),
    info,
    h("h3", null, "Liên hệ"),
    h("table", { class: "items" }, h("tbody", null, ...contactRows)),
    h("div", { class: "grid three" }, field("Loại", cKind), field("Giá trị", cValue), field("Ghi chú", cLabel), h("label", { class: "check" }, cPrimary, "Liên hệ chính")),
    h("div", { class: "actions" }, addContact),
    h("h3", null, "Vai trò theo nơi"),
    h("table", { class: "items" }, h("tbody", null, ...roleRows)),
    admin
      ? h("div", null, h("div", { class: "grid three" }, field("Vai trò", rType), field("Nơi", rLoc), field("Từ ngày (mặc định hôm nay)", rFrom)), h("div", { class: "actions" }, addRole))
      : h("p", { class: "muted" }, "Chỉ quản trị viên thêm/kết thúc vai trò."),
    h("h3", null, "Quan hệ"),
    h("table", { class: "items" }, h("tbody", null, ...relRows)),
    admin ? h("div", null, h("div", { class: "grid three" }, field("Loại", relDir), field("Tìm hồ sơ", relQ), field("Chọn", relPick)), h("div", { class: "actions" }, addRel)) : null,
    h("div", { class: "actions", style: "margin-top:12px" }, button("Đóng", () => { detailEl.hidden = true; openId = null; }, "btn")),
  );
  detailEl.hidden = false;
  detailEl.scrollIntoView({ block: "nearest" });
}

byId<HTMLFormElement>("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  void search();
});
byId("new").addEventListener("click", openCreate);
byId("more").addEventListener("click", () => void search(false));

me = await initShell();
admin = hasPermission(me, "ADMIN");
const [m, l] = await Promise.all([act(() => api<Api.PartyMetaResponse>("/api/parties/meta")), act(() => api<Api.LocationListResponse>("/api/locations"))]);
if (m) meta = m;
if (l) locations = l.locations;
replaceChildren(byId("role"), h("option", { value: "" }, "Tất cả"), ...meta.roleTypes.map((t) => h("option", { value: t.code }, t.name)));
replaceChildren(byId("location"), h("option", { value: "" }, "Tất cả"), ...locations.filter((x) => x.active).map((x) => h("option", { value: x.id }, x.name)));
await search();
