// Trang Địa điểm (chỉ quản trị viên): xem, thêm, sửa, ngưng dùng. Dữ liệu qua /api/locations; sửa có khoá lạc quan (expectedUpdatedAt).
import { hasPermission } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const listEl = byId("list");
const editEl = byId("edit");
let types: Api.LocationTypeDto[] = [];
let current: Api.LocationDto[] = [];

const STALE_NOTICE = "Địa điểm vừa được người khác thay đổi nên bản đang xem đã cũ. Đã nạp bản mới — hãy kiểm tra rồi Lưu lại nếu vẫn cần.";
const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

/**
 * Chạy một thao tác. Thao tác GHI truyền `btn`: nút bị khoá từ lúc bấm đến khi xong cả phần nạp lại (bấm đúp không gửi hai lần), mở lại ở `finally`.
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

const typeOptions = (selected?: string) => types.map((t) => h("option", { value: t.code, selected: t.code === selected }, t.name));

function row(l: Api.LocationDto): HTMLElement {
  const edit = h("button", { type: "button", class: "btn btn-link" }, "Sửa");
  edit.addEventListener("click", () => openEdit(l));
  return h(
    "tr",
    { class: l.active ? "" : "row-off" },
    h("td", null, l.code),
    h("td", null, l.name, !l.active && h("span", { class: "badge badge-cancelled" }, "Ngưng dùng")),
    h("td", null, l.locationTypeName),
    h("td", { class: "muted" }, l.address ?? ""),
    h("td", null, String(l.sortOrder)),
    h("td", { class: "row-actions" }, edit),
  );
}

function openEdit(l: Api.LocationDto): void {
  const name = h("input", { type: "text", value: l.name, maxLength: 100 });
  const type = h("select", null, ...typeOptions(l.locationTypeCode));
  const address = h("input", { type: "text", value: l.address ?? "", maxLength: 300 });
  const sort = h("input", { type: "number", value: String(l.sortOrder), min: 0, max: 9999 });
  const active = h("input", { type: "checkbox", checked: l.active, style: "width:auto;display:inline;margin:0 6px 0 0" });
  const save = h("button", { type: "button", class: "btn btn-primary" }, "Lưu");
  const close = h("button", { type: "button", class: "btn" }, "Đóng");
  close.addEventListener("click", () => (editEl.hidden = true));
  save.addEventListener("click", async () => {
    const body = { name: name.value, locationTypeCode: type.value, address: address.value || null, sortOrder: Number(sort.value), active: active.checked, expectedUpdatedAt: l.updatedAt };
    await act(
      async () => {
        await api<Api.LocationResponse>(`/api/locations/${l.id}`, { method: "PUT", body });
        editEl.hidden = true;
        await load();
      },
      save,
      async () => {
        // 409 stale: `l.updatedAt` đã cũ. Nạp lại rồi mở lại form với bản mới để Lưu lần sau dùng đúng `updatedAt`.
        await load();
        const fresh = current.find((x) => x.id === l.id);
        if (fresh) openEdit(fresh);
        else editEl.hidden = true;
      },
    );
  });
  replaceChildren(
    editEl,
    h("h2", null, `Sửa: ${l.code}`),
    h("div", { class: "grid three" }, h("label", null, "Tên", name), h("label", null, "Loại", type), h("label", null, "Địa chỉ", address), h("label", null, "Thứ tự", sort), h("label", { class: "check" }, active, "Đang dùng")),
    h("p", { class: "muted" }, "Mã là định danh, không đổi được. Địa điểm đã dùng ở vai trò hồ sơ không xoá được — chỉ ngưng dùng."),
    h("div", { class: "actions" }, save, close),
  );
  editEl.hidden = false;
  editEl.scrollIntoView({ block: "nearest" });
}

async function load(): Promise<void> {
  const r = await act(() => api<Api.LocationListResponse>("/api/locations"));
  if (!r) return;
  types = r.types;
  current = r.locations;
  replaceChildren(byId("add-type"), ...typeOptions());
  replaceChildren(listEl, ...r.locations.map(row));
}

const addForm = byId<HTMLFormElement>("add-form");
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    code: byId<HTMLInputElement>("add-code").value.trim(),
    name: byId<HTMLInputElement>("add-name").value,
    locationTypeCode: byId<HTMLSelectElement>("add-type").value,
    address: byId<HTMLInputElement>("add-address").value || null,
    sortOrder: Number(byId<HTMLInputElement>("add-sort").value || 0),
  };
  await act(async () => {
    await api<Api.LocationResponse>("/api/locations", { method: "POST", body });
    for (const id of ["add-code", "add-name", "add-address"]) byId<HTMLInputElement>(id).value = "";
    await load();
  }, addForm.querySelector<HTMLButtonElement>('button[type="submit"]'));
});

const staff = await initShell();
if (!hasPermission(staff, "ADMIN")) showError(errorEl, "Chỉ quản trị viên được vào trang này.");
else await load();
