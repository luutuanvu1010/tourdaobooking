// Trang Danh bạ (/parties; mỗi mục là một "hồ sơ"): tìm/lọc, tạo (cảnh báo trùng SĐT — ADR-0001 mục 8), xem/sửa, liên hệ, "Công việc tại đâu" (vai trò theo nơi) và
// "Người liên hệ, tài xế" (quan hệ: người liên hệ; "Tài xế của" — người → nhà xe đối tác, ADR-0048 D1).
// Vai trò và quan hệ chỉ quản trị viên sửa (ADR-0007); hồ sơ khách/đại lý: mọi nhân sự văn phòng; hồ sơ có tài khoản: chỉ quản trị viên cấp trên (ADR-0013, máy chủ tính `editable`);
// hồ sơ công ty chủ: chỉ người giữ ô company.legal.write (ADR-0024 6.4 — máy chủ tính `editable`). Lựa chọn "Công ty chủ" (= đổi công ty chủ, chủ dự án 2026-09-28)
// chỉ hiện với người giữ ô đó, trên hồ sơ tổ chức, kèm câu xác nhận. Giao diện chỉ ẩn/hiện, máy chủ luôn kiểm lại.
import { OWNER_COMPANY_ROLE } from "../src/shared/cong-ty-chu";
import { NGUONG_MAC_DINH, chipHan, lichSuCua, ngayVN, tenGiayTo, xepTheoHan } from "../src/shared/giay-to-hien-thi";
import { can } from "../src/shared/permissions";
import { ApiError, api, type Api, type Staff } from "./api";
import { byId, h, replaceChildren, type Child } from "./dom";
import { initials } from "./format";
import { chipEl, loiCua, moFormGiayTo, moXacNhanXemSo, taoBoCheSo, type GiayToDong } from "./giay-to-ui";
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

/** Bộ che số của mục "Giấy tờ" (ADR-0040 D2, bản vẽ 04): một dòng hiện đủ một lúc, tự che sau token --t-reveal / "Che lại" / rời trang / đóng hồ sơ. */
const boCheSo = taoBoCheSo(detailEl);
let metaGiayTo: Promise<Api.PersonDocumentMetaResponse> | null = null;
const moLichSuGiayTo = new Set<string>();

const STALE_NOTICE = "Hồ sơ vừa được người khác thay đổi nên bản đang xem đã cũ. Đã nạp bản mới — hãy kiểm tra rồi Lưu lại nếu vẫn cần.";
/** Câu xác nhận trước khi đổi công ty chủ (ADR-0024 6.2: trang đăng nhập và biên nhận đọc hồ sơ công ty chủ). Không nói "Toàn quyền" (vai ẩn). */
const XAC_NHAN_DOI_CONG_TY_CHU =
  "Đặt hồ sơ này làm công ty chủ? Trang đăng nhập và biên nhận sẽ dùng thông tin của hồ sơ này từ hôm nay (tên, mã số thuế, địa chỉ, liên hệ ghi chú “Hotline”, email). Công ty chủ hiện tại sẽ thôi giữ công việc này.";
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
/** Vai quyết định quyền đăng nhập (nội bộ/bên ngoài, ADR-0018): chỉ gán/gỡ ở màn Quản lý tài khoản. */
const isAccountRole = (code: string): boolean => {
  const g = meta.roleTypes.find((t) => t.code === code)?.group;
  return g === "INTERNAL" || g === "EXTERNAL";
};

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
    { class: p.active ? "card" : "card row-off", style: "cursor:pointer" },
    h("div", { style: "width:40px;height:40px;border-radius:var(--radius-pill);background:var(--c-primary-soft);color:var(--c-primary);display:flex;align-items:center;justify-content:center;font-weight:800;flex:none" }, initials(p.displayName)),
    h(
      "div",
      { style: "flex:1" },
      h("div", null, p.displayName, !p.active && h("span", { class: "badge badge-cancelled" }, " Ngưng")),
      h("div", { class: "muted" }, p.primaryPhone ?? "—", " · ", p.roleCodes.map(roleLabel).join(", ") || "—"),
      h("div", { class: "muted" }, KIND_LABEL[p.kind]),
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
  boCheSo.che(); // hồ sơ trước đang hiện đủ số → che trước khi dựng lại
  if (openId !== id) moLichSuGiayTo.clear();
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
  active.disabled = p.accountLinked;
  if (!p.editable) {
    fullName.disabled = true;
    displayName.disabled = true;
    legalName.disabled = true;
    taxCode.disabled = true;
    address.disabled = true;
    invoiceEmail.disabled = true;
  }
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
    h(
      "div",
      { class: "grid three" },
      ...(person ? [field("Họ và tên (tên = từ cuối)", fullName)] : [field("Tên gọi", displayName), field("Tên pháp lý", legalName), field("Mã số thuế", taxCode), field("Địa chỉ", address), field("Email nhận hoá đơn", invoiceEmail)]),
      h("label", { class: "check" }, active, "Đang dùng"),
    ),
    p.accountLinked ? h("p", { class: "muted" }, "Người này có tài khoản: tạm khoá hoặc cho nghỉ việc ở màn Quản lý tài khoản.") : null,
    p.editable ? h("div", { class: "actions" }, saveInfo) : null,
  );

  // -- liên hệ
  const contactRows = p.contacts.map((c) =>
    h("tr", { class: c.validTo ? "row-off" : "" }, h("td", null, c.kind === "PHONE" ? "Điện thoại" : "Email"), h("td", null, c.value, c.isPrimary && !c.validTo && h("span", { class: "badge" }, "chính")), h("td", { class: "muted" }, c.label ?? ""), h("td", { class: "muted" }, period(c.validFrom, c.validTo)), h("td", null, p.editable && !c.validTo && button("Đóng", (b) => void act(async () => { await api(`/api/parties/${id}/contacts/${c.id}/end`, { method: "POST", body: {} }); await reload(); }, b)))),
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
    h("tr", { class: r2.validTo ? "row-off" : "" }, h("td", null, r2.roleName), h("td", null, r2.locationName ?? "(mọi nơi)"), h("td", { class: "muted" }, period(r2.validFrom, r2.validTo)), h("td", null, admin && !r2.validTo && (isAccountRole(r2.roleTypeCode) ? h("span", { class: "muted" }, "Đổi ở màn Quản lý tài khoản") : button("Kết thúc", (b) => void act(async () => { await api(`/api/parties/${id}/roles/${r2.id}/end`, { method: "POST", body: {} }); await reload(); }, b))))),
  );
  // Vai "Công ty chủ" gieo "ngưng gán thường" (active = false) nên không có trong danh sách chung; chỉ người giữ ô company.legal.write thấy nó, trên hồ sơ tổ
  // chức chưa phải công ty chủ — gán = ĐỔI công ty chủ (chủ dự án 2026-09-28).
  const doiCongTyChu = can(me, "company.legal.write") && p.kind === "ORGANIZATION" && !p.roles.some((x) => x.roleTypeCode === OWNER_COMPANY_ROLE && x.validTo === null);
  const rType = select([
    ...meta.roleTypes.filter((t) => t.active && t.group === "OTHER").map((t) => ({ value: t.code, label: t.name })),
    ...(doiCongTyChu ? [{ value: OWNER_COMPANY_ROLE, label: roleLabel(OWNER_COMPANY_ROLE) }] : []),
  ]);
  const rLoc = select([{ value: "", label: "(mọi nơi)" }, ...locations.filter((l) => l.active).map((l) => ({ value: l.id, label: l.name }))]);
  const rFrom = input("", { type: "date" });
  const addRole = button("Thêm công việc", (b) => {
    if (rType.value === OWNER_COMPANY_ROLE && !confirm(XAC_NHAN_DOI_CONG_TY_CHU)) return;
    const body = { roleTypeCode: rType.value, locationId: rLoc.value || null, validFrom: rFrom.value || undefined };
    void act(async () => { await api(`/api/parties/${id}/roles`, { method: "POST", body }); await reload(); }, b);
  }, "btn");

  // -- quan hệ
  const relRows = p.relationships.map((x) =>
    h("tr", { class: x.validTo ? "row-off" : "" }, h("td", null, `${x.fromPartyName} — ${x.typeName} — ${x.toPartyName}`), h("td", { class: "muted" }, period(x.validFrom, x.validTo)), h("td", null, admin && !x.validTo && button("Kết thúc", (b) => void act(async () => { await api(`/api/parties/${id}/relationships/${x.id}/end`, { method: "POST", body: {} }); await reload(); }, b)))),
  );
  const relQ = input("", { placeholder: "Gõ tên hồ sơ cần liên kết…" });
  const relPick = h("select", null);
  // Loại + chiều của quan hệ. "Tài xế của" (DRIVES_FOR, ADR-0048 D1): từ hồ sơ NGƯỜI (tài xế) tới hồ sơ đang là nhà xe đối tác — máy chủ kiểm hai đầu và trả
  // câu tiếng Việt (409) khi sai; giao diện chỉ gửi đúng chiều (Task B2, khuôn ô chọn sẵn có).
  const LOAI_QUAN_HE = [
    { value: "from", label: "Hồ sơ này LÀ người liên hệ của…", code: "CONTACT_OF", laDauTu: true, nut: "Thêm người liên hệ" },
    { value: "to", label: "Hồ sơ này CÓ người liên hệ là…", code: "CONTACT_OF", laDauTu: false, nut: "Thêm người liên hệ" },
    { value: "tx-from", label: "Hồ sơ này LÀ tài xế của nhà xe…", code: "DRIVES_FOR", laDauTu: true, nut: "Thêm quan hệ tài xế" },
    { value: "tx-to", label: "Hồ sơ này là nhà xe CÓ tài xế…", code: "DRIVES_FOR", laDauTu: false, nut: "Thêm tài xế" },
  ] as const;
  const relDir = select(LOAI_QUAN_HE.map((x) => ({ value: x.value, label: x.label })));
  const loaiQuanHe = () => LOAI_QUAN_HE.find((x) => x.value === relDir.value) ?? LOAI_QUAN_HE[0];
  let relTimer: number | undefined;
  relQ.addEventListener("input", () => {
    window.clearTimeout(relTimer);
    relTimer = window.setTimeout(async () => {
      if (relQ.value.trim().length < 2) return replaceChildren(relPick);
      const found = await act(() => api<Api.PartyListResponse>(`/api/parties?limit=10&q=${encodeURIComponent(relQ.value.trim())}`));
      replaceChildren(relPick, ...(found?.parties.filter((x) => x.id !== id).map((x) => h("option", { value: x.id }, `${x.displayName} (${KIND_LABEL[x.kind]})`)) ?? []));
    }, 300);
  });
  const addRel = button(loaiQuanHe().nut, (b) => {
    if (!relPick.value) return showError(errorEl, "Chọn hồ sơ cần liên kết.");
    const l = loaiQuanHe();
    const body = l.laDauTu ? { fromPartyId: id, toPartyId: relPick.value, relationshipTypeCode: l.code } : { fromPartyId: relPick.value, toPartyId: id, relationshipTypeCode: l.code };
    void act(async () => { await api(`/api/parties/${id}/relationships`, { method: "POST", body }); await reload(); }, b);
  }, "btn");
  relDir.addEventListener("change", () => { addRel.textContent = loaiQuanHe().nut; });

  // Mục "Giấy tờ" (ADR-0040 D2; bản vẽ 04): chỉ hồ sơ CÁ NHÂN, chỉ người giữ ô party.document.write (Quản trị, Toàn quyền) — party.view KHÔNG mở giấy tờ.
  const giayTo = can(me, "party.document.write") && p.kind === "PERSON" ? h("section", { id: "giay-to", class: "vc-gt-section", "aria-labelledby": "giay-to-title" }) : null;
  if (giayTo) void veGiayTo(giayTo, p);

  replaceChildren(
    detailEl,
    h("h2", null, p.displayName, " ", h("span", { class: "muted" }, KIND_LABEL[p.kind])),
    info,
    h("h3", null, "Liên hệ"),
    h("table", { class: "items" }, h("tbody", null, ...contactRows)),
    p.editable ? h("div", { class: "grid three" }, field("Loại", cKind), field("Giá trị", cValue), field("Ghi chú", cLabel), h("label", { class: "check" }, cPrimary, "Liên hệ chính")) : null,
    p.editable ? h("div", { class: "actions" }, addContact) : null,
    h("h3", null, "Công việc tại đâu"),
    h("table", { class: "items" }, h("tbody", null, ...roleRows)),
    admin
      ? h("div", null, h("div", { class: "grid three" }, field("Công việc", rType), field("Nơi làm", rLoc), field("Từ ngày (mặc định hôm nay)", rFrom)), h("div", { class: "actions" }, addRole))
      : h("p", { class: "muted" }, "Chỉ quản trị viên thêm hoặc kết thúc công việc."),
    h("h3", null, "Người liên hệ, tài xế"), // G3 (ADR-0048): mục này nay gồm cả quan hệ "Tài xế của"
    h("table", { class: "items" }, h("tbody", null, ...relRows)),
    admin ? h("div", null, h("div", { class: "grid three" }, field("Loại", relDir), field("Tìm hồ sơ", relQ), field("Chọn", relPick)), h("div", { class: "actions" }, addRel)) : null,
    giayTo,
    h("div", { class: "actions", style: "margin-top:12px" }, button("Đóng", () => { boCheSo.che(); detailEl.hidden = true; openId = null; }, "btn")),
  );
  detailEl.hidden = false;
  detailEl.scrollIntoView({ block: "nearest" });
}

// ---- Giấy tờ của người (ADR-0040 D2; bản vẽ docs/design/van-chuyen-1a/project/04 Giay to cua mot nguoi.dc.html) ---------------------------------------
// Số LUÔN che (máy chủ che — maskedNumber); "Xem đủ số" (ô party.document.reveal) = hộp xác nhận → POST …/reveal (một dòng nhật ký, không kèm số) → số hiện đủ
// trong ô số, đếm ngược, tự che. Ghi (Thêm / Gia hạn / Sửa sai) và xem đủ số chỉ khi `editable` — cùng điều kiện máy chủ hỏi ở route ghi (hồ sơ gắn tài khoản cấp
// trên → 403, Ruling R8). Điện thoại: danh sách + "Thêm giấy tờ" cuối mục; máy tính (≥900px): bảng, nút ở đầu mục.
async function veGiayTo(sec: HTMLElement, p: Api.PartyDto): Promise<void> {
  boCheSo.che();
  const loi = h("div", { class: "vc-field-error vc-gt-error", role: "alert", hidden: true });
  const baoLoi = (err: unknown) => {
    replaceChildren(loi, icon("alert", 16, 2), loiCua(err));
    loi.hidden = false;
  };
  let docs: Api.PersonDocumentDto[];
  let meta: Api.PersonDocumentMetaResponse;
  try {
    metaGiayTo ??= api<Api.PersonDocumentMetaResponse>("/api/parties/documents/meta");
    [docs, meta] = await Promise.all([api<Api.PersonDocumentListResponse>(`/api/parties/${p.id}/documents`).then((r) => r.documents), metaGiayTo]);
  } catch (err) {
    metaGiayTo = null;
    replaceChildren(sec, h("div", { class: "vc-gt-head" }, h("h3", { id: "giay-to-title" }, "Giấy tờ")), loi);
    return baoLoi(err);
  }
  const ghi = can(me, "party.document.write") && p.editable;
  const xemSo = can(me, "party.document.reveal") && p.editable;
  const url = `/api/parties/${encodeURIComponent(p.id)}/documents`;
  const dongCua = (d: Api.PersonDocumentDto): GiayToDong => ({
    typeCode: d.typeCode, typeName: d.typeName, className: d.className, classCode: d.classCode, soHien: d.maskedNumber, issuedDate: d.issuedDate, issuedPlace: d.issuedPlace, expiryDate: d.expiryDate, updatedAt: d.updatedAt,
  });
  const moBang = (kind: "add" | "renew" | "fix", opener: HTMLElement, d?: Api.PersonDocumentDto) =>
    moFormGiayTo({
      kind, cho: "nguoi", opener, types: meta.types, classes: meta.classes, doc: d ? dongCua(d) : undefined,
      gui: async (body) => {
        const duong = kind === "add" ? url : `${url}/${encodeURIComponent(d!.id)}/${kind === "renew" ? "renew" : "correct"}`;
        try {
          docs = (await api<Api.PersonDocumentListResponse>(duong, { method: "POST", body })).documents;
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) void veGiayTo(sec, p); // dòng đã cũ: nạp lại ngầm, bảng vẫn hiện câu của máy chủ
          throw err;
        }
        ve();
        byId("giay-to-title").focus();
      },
    });
  const nut = (chu: string, lop: string, bam: (b: HTMLButtonElement) => void, them: Record<string, unknown> = {}): HTMLButtonElement => {
    const b = h("button", { type: "button", class: lop, ...them }, chu);
    b.addEventListener("click", () => bam(b));
    return b;
  };
  const xemDu = (d: Api.PersonDocumentDto, opener: HTMLElement) =>
    moXacNhanXemSo({
      opener,
      tieuDe: tenGiayTo(d),
      soChe: d.maskedNumber ?? "",
      xem: async () => (await api<Api.PersonDocumentRevealResponse>(`${url}/${encodeURIComponent(d.id)}/reveal`, { method: "POST" })).number,
      khiCo: (so) => {
        boCheSo.hien(d.id, so);
        [...sec.querySelectorAll<HTMLElement>(`[data-hide-for="${CSS.escape(d.id)}"]`)].find((x) => x.getClientRects().length > 0)?.focus();
      },
    });
  const coMat = (b: HTMLButtonElement, size: number): HTMLButtonElement => {
    b.prepend(icon("eye", size));
    return b;
  };
  const oSo = (d: Api.PersonDocumentDto): HTMLElement => h("span", { class: "vc-no-val", "data-no-for": d.id, "data-masked": d.maskedNumber ?? "" }, d.maskedNumber ?? "—");
  const nutLichSu = (d: Api.PersonDocumentDto, n: number, lop: string): HTMLButtonElement => {
    const b = nut(`Lịch sử (${n})`, lop, () => {
      if (moLichSuGiayTo.has(d.id)) moLichSuGiayTo.delete(d.id);
      else moLichSuGiayTo.add(d.id);
      const trongBang = !!b.closest(".vc-docs-table");
      ve();
      sec.querySelector<HTMLElement>(`${trongBang ? ".vc-docs-table" : ".vc-docs-list"} [data-hist-for="${CSS.escape(d.id)}"]`)?.focus();
    }, { "aria-expanded": String(moLichSuGiayTo.has(d.id)), "data-hist-for": d.id });
    b.append(icon("chevron-down", 16, 2));
    return b;
  };
  const dongCu = (o: Api.PersonDocumentDto): string => `${o.maskedNumber ? `${o.maskedNumber} · ` : ""}${o.issuedDate ? ngayVN(o.issuedDate) : "—"} → ${o.expiryDate ? ngayVN(o.expiryDate) : "không hạn"}`;

  const ve = (): void => {
    boCheSo.che();
    const hienHanh = xepTheoHan(docs.filter((d) => d.current && !d.voided));
    const themTren = ghi ? nut("Thêm giấy tờ", "vc-btn vc-btn-line vc-wide", (b) => moBang("add", b)) : null;
    themTren?.prepend(icon("plus", 16));
    const themDuoi = ghi ? nut("Thêm giấy tờ", "vc-btn vc-btn-soft", (b) => moBang("add", b)) : null;
    themDuoi?.prepend(icon("plus", 18));
    // Điện thoại (<900px)
    const khoi = hienHanh.map((d) => {
      const cu = lichSuCua(d, docs);
      const chip = chipHan(d.daysLeft, NGUONG_MAC_DINH);
      const dong = [d.issuedDate ? `Cấp ${ngayVN(d.issuedDate)}` : null, d.issuedPlace, d.expiryDate ? `hết hạn ${ngayVN(d.expiryDate)}` : "không hạn"].filter(Boolean).join(" · ");
      const nutDong = [
        ghi && d.expiryDate ? nut("Gia hạn", "vc-btn vc-btn-line", (b) => moBang("renew", b, d)) : null,
        ghi ? nut("Sửa sai", "vc-btn vc-btn-ghost", (b) => moBang("fix", b, d)) : null,
        cu.length ? nutLichSu(d, cu.length, "vc-btn vc-btn-text vc-hist-toggle") : null,
      ].filter((x): x is HTMLButtonElement => x !== null);
      return h(
        "div",
        { class: "vc-doc" },
        h("div", { class: "vc-doc-top" }, h("span", { class: "vc-doc-title" }, tenGiayTo(d)), chipEl(chip)),
        d.maskedNumber
          ? h(
              "div",
              { class: "vc-no vc-no-row" },
              oSo(d),
              xemSo ? coMat(nut("Xem đủ số", "vc-btn vc-btn-text", (b) => xemDu(d, b), { "data-reveal-for": d.id }), 18) : null,
              xemSo ? nut("Che lại", "vc-btn vc-btn-text", () => boCheSo.che(), { "data-hide-for": d.id, hidden: true }) : null,
            )
          : null,
        d.maskedNumber && xemSo ? h("div", { class: "vc-countdown", "data-count-for": d.id, hidden: true }, "Tự che sau ", h("span", { class: "vc-count-n" }, ""), " giây · lần xem này đã ghi nhật ký") : null,
        h("div", { class: "vc-doc-line" }, dong),
        nutDong.length ? h("div", { class: "vc-doc-btns" }, ...nutDong) : null,
        moLichSuGiayTo.has(d.id) && cu.length
          ? h("div", { class: "vc-hist" }, ...cu.map((o) => h("div", { class: "vc-hist-row" }, h("span", null, dongCu(o)), h("span", { class: "vc-pill-old" }, "Đã thay"))))
          : null,
      );
    });
    // Máy tính (≥900px)
    const hang = hienHanh.map((d) => {
      const cu = lichSuCua(d, docs);
      const lenMo = xemSo && d.maskedNumber ? coMat(nut("Xem đủ số", "vc-reveal-link", (b) => xemDu(d, b), { "data-reveal-for": d.id }), 16) : null;
      return h(
        "div",
        { class: "vc-pt-item" },
        h(
          "div",
          { class: "vc-pt-grid vc-pt-row vc-dt-row" },
          h(
            "span",
            { class: "vc-dt-type" },
            h("span", { class: "vc-doc-title" }, tenGiayTo(d)),
            h("span", { class: "vc-doc-sub" }, [d.issuedDate ? ngayVN(d.issuedDate) : null, d.issuedPlace].filter(Boolean).join(" · ") || "—"),
            cu.length ? nutLichSu(d, cu.length, "vc-reveal-link vc-hist-toggle") : null,
          ),
          h(
            "span",
            { class: "vc-no vc-pt-no" },
            oSo(d),
            lenMo,
            lenMo
              ? h("span", { class: "vc-countdown vc-countdown-sm", "data-count-for": d.id, hidden: true }, h("span", null, "Tự che sau ", h("span", { class: "vc-count-n" }, ""), " giây"), nut("Che lại", "vc-reveal-link", () => boCheSo.che(), { "data-hide-for": d.id }))
              : null,
          ),
          h("span", { class: "vc-pt-exp" }, h("span", null, d.expiryDate ? ngayVN(d.expiryDate) : "Không hạn"), chipEl(chipHan(d.daysLeft, NGUONG_MAC_DINH))),
          h(
            "span",
            { class: "vc-dt-actions" },
            ghi ? nut("Sửa sai", "vc-btn vc-btn-ghost", (b) => moBang("fix", b, d)) : null,
            ghi && d.expiryDate ? nut("Gia hạn", "vc-btn vc-btn-line", (b) => moBang("renew", b, d)) : null,
          ),
        ),
        ...(moLichSuGiayTo.has(d.id)
          ? cu.map((o) =>
              h(
                "div",
                { class: "vc-pt-grid vc-dt-hist" },
                h("span", null, `↳ Dòng cũ · cấp ${o.issuedDate ? ngayVN(o.issuedDate) : "—"}`),
                h("span", null, o.maskedNumber ?? "—"),
                h("span", null, o.expiryDate ? ngayVN(o.expiryDate) : "Không hạn"),
                h("span", null, h("span", { class: "vc-pill-old" }, "Đã thay")),
              ),
            )
          : []),
      );
    });
    const trong = (): HTMLElement => h("p", { class: "vc-empty-line" }, "Chưa có giấy tờ nào.");
    replaceChildren(
      sec,
      h("div", { class: "vc-gt-head" }, h("h3", { id: "giay-to-title", tabindex: -1 }, "Giấy tờ"), themTren),
      ghi ? null : h("p", { class: "vc-readonly-note" }, "Tài khoản cấp trên: chỉ xem — không thêm, gia hạn, sửa hay xem đủ số."),
      loi,
      h("div", { class: "vc-docs-list vc-narrow" }, ...(khoi.length ? khoi : [trong()])),
      h(
        "div",
        { class: "vc-docs-table vc-wide" },
        h("div", { class: "vc-pt-grid vc-pt-head vc-th", "aria-hidden": "true" }, h("span", null, "LOẠI · CẤP"), h("span", null, "SỐ"), h("span", null, "HẾT HẠN"), h("span", null, "")),
        ...(hang.length ? hang : [trong()]),
      ),
      themDuoi ? h("div", { class: "vc-gt-foot vc-narrow" }, themDuoi) : null,
    );
  };
  ve();
}

byId<HTMLFormElement>("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  void search();
});
byId("new").addEventListener("click", openCreate);
byId("more").addEventListener("click", () => void search(false));

me = await initShell();
admin = can(me, "admin.manage"); // Quản trị hoặc Toàn quyền (như cổng quản trị của máy chủ) — tài khoản chỉ giữ Toàn quyền cũng thấy khối công việc (Ruling T7, T2b)
const [m, l] = await Promise.all([act(() => api<Api.PartyMetaResponse>("/api/parties/meta")), act(() => api<Api.LocationListResponse>("/api/locations"))]);
if (m) meta = m;
if (l) locations = l.locations;
replaceChildren(byId("role"), h("option", { value: "" }, "Tất cả"), ...meta.roleTypes.map((t) => h("option", { value: t.code }, t.name)));
replaceChildren(byId("location"), h("option", { value: "" }, "Tất cả"), ...locations.filter((x) => x.active).map((x) => h("option", { value: x.id }, x.name)));
await search();
// Mở thẳng một hồ sơ theo ?id= (màn 06 "Giấy tờ sắp hết hạn" bấm dòng người → hồ sơ ở Danh bạ). Máy chủ kiểm quyền và id như mọi lần mở hồ sơ.
const moTheoId = new URLSearchParams(location.search).get("id");
if (moTheoId) await openDetail(moTheoId);
