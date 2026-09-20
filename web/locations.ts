// Trang Địa điểm (chỉ quản trị viên): xem, thêm, sửa, ngưng dùng. Dữ liệu qua /api/locations; sửa có khoá lạc quan (expectedUpdatedAt).
import { hasPermission } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const listEl = byId("list");
const editEl = byId("edit");
let types: Api.LocationTypeDto[] = [];

const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

async function act<T>(fn: () => Promise<T>): Promise<T | undefined> {
  showError(errorEl, null);
  try {
    return await fn();
  } catch (err) {
    fail(err);
    return undefined;
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
    if (await act(() => api<Api.LocationResponse>(`/api/locations/${l.id}`, { method: "PUT", body }))) {
      editEl.hidden = true;
      await load();
    }
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
  replaceChildren(byId("add-type"), ...typeOptions());
  replaceChildren(listEl, ...r.locations.map(row));
}

byId<HTMLFormElement>("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    code: byId<HTMLInputElement>("add-code").value.trim(),
    name: byId<HTMLInputElement>("add-name").value,
    locationTypeCode: byId<HTMLSelectElement>("add-type").value,
    address: byId<HTMLInputElement>("add-address").value || null,
    sortOrder: Number(byId<HTMLInputElement>("add-sort").value || 0),
  };
  if (await act(() => api<Api.LocationResponse>("/api/locations", { method: "POST", body }))) {
    for (const id of ["add-code", "add-name", "add-address"]) byId<HTMLInputElement>(id).value = "";
    await load();
  }
});

const staff = await initShell();
if (!hasPermission(staff, "ADMIN")) showError(errorEl, "Chỉ quản trị viên được vào trang này.");
else await load();
