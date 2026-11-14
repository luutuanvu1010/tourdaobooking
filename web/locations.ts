// Trang Địa điểm (chỉ quản trị viên): xem, thêm, sửa, ngưng dùng. Dữ liệu qua /api/locations; sửa có khoá lạc quan (expectedUpdatedAt).
import { docChonNhanh } from "../src/shared/chon-nhanh";
import { moTrang } from "../src/shared/muc-giao-dien";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const listEl = byId("list");
const listCardsEl = byId("list-cards");
const editEl = byId("edit");
let types: Api.LocationTypeDto[] = [];
let current: Api.LocationDto[] = [];
let zones: Api.VungDonDto[] = [];
const MA_NGOAI_VUNG = "NGOAI_VUNG"; // khu vực gieo sẵn, luôn bật (máy chủ: loc_zone, ADR-0147 Đ1)

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

const ZONE_MESSAGES: Record<string, (z?: Api.VungDonDto) => string> = {
  zone_in_use: (z) => `Khu vực này còn ${z?.soDiaDiem ?? 0} địa điểm. Chuyển các địa điểm sang khu vực khác rồi ngưng.`,
  zone_required: () => "Không ngưng được khu vực này vì nơi đón gõ tay được tính vào đây.",
};

/** Chạy thao tác ghi khu vực; 409 `zone_in_use` / `zone_required` hiện câu của màn (lời thường), 409 `stale` nạp lại. */
async function actZone<T>(fn: () => Promise<T>, btn: HTMLButtonElement | null, z?: Api.VungDonDto): Promise<T | undefined> {
  if (btn?.disabled) return undefined;
  showError(errorEl, null);
  if (btn) btn.disabled = true;
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError && ZONE_MESSAGES[err.code]) showError(errorEl, ZONE_MESSAGES[err.code]!(z));
    else if (err instanceof ApiError && err.code === "stale") {
      await load();
      if (errorEl.hidden) showError(errorEl, "Khu vực vừa được người khác thay đổi nên bản đang xem đã cũ. Đã nạp bản mới, hãy kiểm tra rồi lưu lại nếu vẫn cần.");
    } else fail(err);
    return undefined;
  } finally {
    if (btn) btn.disabled = false;
  }
}

/** Chữ khu vực của một địa điểm: chưa xếp thì hiện tên «Ngoài khu vực» kèm nhãn phụ «chưa xếp». */
function zoneCell(l: Api.LocationDto): (HTMLElement | string)[] {
  const z = l.zoneCode === null ? undefined : zones.find((x) => x.code === l.zoneCode);
  if (z) return [z.name];
  const ngoai = zones.find((x) => x.code === MA_NGOAI_VUNG);
  return [ngoai?.name ?? "Ngoài khu vực", " ", h("span", { class: "muted" }, "(chưa xếp)")];
}

function zoneOptions(selected: string | null): HTMLElement[] {
  const opts = [h("option", { value: "", selected: selected === null }, "Chưa xếp")];
  for (const z of zones) if (z.active || z.code === selected) opts.push(h("option", { value: z.code, selected: z.code === selected }, z.active ? z.name : `${z.name} (ngưng)`));
  return opts;
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
    h("td", null, ...zoneCell(l)),
    h("td", { class: "muted" }, l.address ?? ""),
    h("td", null, String(l.sortOrder)),
    h("td", null, l.quickPickOrder === null ? "" : String(l.quickPickOrder)),
    h("td", { class: "row-actions" }, edit),
  );
}

function card(l: Api.LocationDto): HTMLElement {
  const edit = h("button", { type: "button", class: "pill-btn" }, "Sửa");
  edit.addEventListener("click", () => openEdit(l));
  return h(
    "div",
    { class: l.active ? "card" : "card row-off", "data-testid": "location-card" },
    h(
      "div",
      { style: "flex:1" },
      h("strong", null, l.name),
      !l.active
        ? h("div", null, h("span", { class: "badge badge-cancelled" }, "Ngưng dùng"))
        : h("div", { class: "muted" }, l.code, " · ", l.locationTypeName),
      l.active && h("div", { class: "muted" }, "Khu vực: ", ...zoneCell(l)),
      l.active && l.address && h("div", { class: "muted" }, l.address),
      l.active && l.quickPickOrder !== null && h("div", { class: "muted" }, `Chọn nhanh: số ${l.quickPickOrder}`),
    ),
    edit,
  );
}

function openEdit(l: Api.LocationDto): void {
  const name = h("input", { type: "text", value: l.name, maxLength: 100 });
  const type = h("select", null, ...typeOptions(l.locationTypeCode));
  const address = h("input", { type: "text", value: l.address ?? "", maxLength: 300 });
  const zone = h("select", null, ...zoneOptions(l.zoneCode));
  const sort = h("input", { type: "number", value: String(l.sortOrder), min: 0, max: 9999 });
  const nhanh = h("input", { type: "text", inputMode: "numeric", maxLength: 2, autocomplete: "off", placeholder: "Trống = không", value: l.quickPickOrder === null ? "" : String(l.quickPickOrder) });
  const active = h("input", { type: "checkbox", checked: l.active, style: "width:auto;display:inline;margin:0 6px 0 0" });
  const save = h("button", { type: "button", class: "btn btn-primary btn-chinh" }, "Lưu");
  const close = h("button", { type: "button", class: "btn" }, "Đóng");
  close.addEventListener("click", () => (editEl.hidden = true));
  save.addEventListener("click", async () => {
    const q = docChonNhanh(nhanh.value);
    if (!q.ok) return showError(errorEl, q.message);
    // `quickPickOrder` LUÔN gửi (số hoặc null): ô trống = người dùng muốn bỏ chọn nhanh (khoá vắng mới là «giữ» — dành cho màn bản cũ).
    const body = { name: name.value, locationTypeCode: type.value, address: address.value || null, sortOrder: Number(sort.value), active: active.checked, quickPickOrder: q.value, zoneCode: zone.value === "" ? null : zone.value, expectedUpdatedAt: l.updatedAt };
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
    h("div", { class: "grid three" }, h("label", null, "Tên", name), h("label", null, "Loại", type), h("label", null, "Địa chỉ", address), h("label", null, "Khu vực đón", zone), h("label", null, "Thứ tự", sort), h("label", null, "Chọn nhanh (1–99)", nhanh), h("label", { class: "check" }, active, "Đang dùng")),
    h("p", { class: "muted" }, "Chọn nhanh: điền số (1–99) thì địa điểm này hiện thành nút bấm ở form Tạo đơn — dưới ô Nơi trả của chiều đi và ô Nơi đón của chiều về, xếp theo số nhỏ trước. Để trống nếu không cần."),
    h("p", { class: "muted" }, "Mã là định danh, không đổi được. Địa điểm đã dùng ở vai trò hồ sơ không xoá được — chỉ ngưng dùng."),
    h("div", { class: "actions" }, save, close),
  );
  editEl.hidden = false;
  editEl.scrollIntoView({ block: "nearest" });
}

function zoneRow(z: Api.VungDonDto): HTMLElement {
  const edit = h("button", { type: "button", class: "pill-btn" }, "Sửa khu vực đón");
  edit.addEventListener("click", () => wrap.replaceWith(zoneEditor(z)));
  const wrap = h(
    "div",
    { class: z.active ? "card" : "card row-off", "data-testid": "zone-card" },
    h(
      "div",
      { style: "flex:1" },
      h("strong", null, z.name),
      !z.active && h("div", null, h("span", { class: "badge badge-cancelled" }, "Ngưng dùng")),
      h("div", { class: "muted" }, z.code, " · ", `${z.soDiaDiem} địa điểm`, " · thứ tự ", String(z.sortOrder)),
    ),
    edit,
  );
  return wrap;
}

function zoneEditor(z: Api.VungDonDto): HTMLElement {
  const name = h("input", { type: "text", value: z.name, maxLength: 60 });
  const sort = h("input", { type: "number", value: String(z.sortOrder), min: 0, max: 9999 });
  const active = h("input", { type: "checkbox", checked: z.active, style: "width:auto;display:inline;margin:0 6px 0 0" });
  const save = h("button", { type: "button", class: "btn btn-primary btn-chinh" }, "Lưu");
  const close = h("button", { type: "button", class: "btn" }, "Đóng");
  close.addEventListener("click", () => void load());
  save.addEventListener("click", async () => {
    await actZone(
      async () => {
        await api<Api.VungDonResponse>(`/api/location-zones/${z.code}`, { method: "PUT", body: { name: name.value, sortOrder: Number(sort.value), active: active.checked, expectedUpdatedAt: z.updatedAt } });
        await load();
      },
      save,
      z,
    );
  });
  return h(
    "div",
    { class: "card card-col", "data-testid": "zone-editor" },
    h("strong", null, `Sửa: ${z.code}`),
    h("div", { class: "grid three" }, h("label", null, "Tên", name), h("label", null, "Thứ tự", sort), h("label", { class: "check" }, active, "Đang dùng")),
    h("div", { class: "actions" }, save, close),
  );
}

async function load(): Promise<void> {
  const r = await act(() => api<Api.LocationListResponse>("/api/locations"));
  if (!r) return;
  types = r.types;
  current = r.locations;
  zones = r.zones;
  replaceChildren(byId("add-type"), ...typeOptions());
  replaceChildren(listEl, ...r.locations.map(row));
  replaceChildren(listCardsEl, ...r.locations.map(card));
  replaceChildren(byId("zone-list"), ...r.zones.map(zoneRow));
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

const zoneForm = byId<HTMLFormElement>("zone-form");
zoneForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = { code: byId<HTMLInputElement>("zone-code").value.trim(), name: byId<HTMLInputElement>("zone-name").value, sortOrder: Number(byId<HTMLInputElement>("zone-sort").value || 0) };
  await actZone(async () => {
    await api<Api.VungDonResponse>("/api/location-zones", { method: "POST", body });
    for (const id of ["zone-code", "zone-name"]) byId<HTMLInputElement>(id).value = "";
    await load();
  }, zoneForm.querySelector<HTMLButtonElement>('button[type="submit"]'));
});

// Form "Thêm địa điểm" mặc định ẩn trong HTML tĩnh: chỉ quản trị viên mới được thêm (máy chủ 403 với người khác), và danh sách
// loại địa điểm của form cũng chỉ nạp được khi load() chạy.
const staff = await initShell();
// Chốt chặn của trang khai ở bảng mục (`TRANG.diaDiem.moTrang` — ô admin.manage): bảng và trang một nguồn, bài rào "mục hiện ⇔ trang mở được" đọc được.
if (!moTrang("diaDiem", staff)) showError(errorEl, "Chỉ quản trị viên được vào trang này.");
else {
  const addCard = document.getElementById("add-card"); // chịu được phần tử vắng: HTML cũ trong cache + JS mới không được làm hỏng cả trang
  if (addCard) addCard.hidden = false;
  const zoneCard = document.getElementById("zone-card");
  if (zoneCard) zoneCard.hidden = false;
  await load();
}
