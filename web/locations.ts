// Trang Địa điểm (chỉ quản trị viên): xem, thêm, sửa, ngưng dùng. Dữ liệu qua /api/locations; sửa có khoá lạc quan (expectedUpdatedAt).
// Bố cục: khuôn Thiết lập của khung gốc giao diện (ADR-0222; chủ dự án duyệt hình 21/11/2026) — hai khối «Địa điểm» và «Khu vực đón» (public/locations.html);
// nút «thêm» ở đầu khối, «Sửa» ở cuối dòng; biểu mẫu thêm và sửa mở trong bảng trượt (web/bang-truot.ts), không còn nằm sẵn trên trang.
import { docChonNhanh } from "../src/shared/chon-nhanh";
import { moTrang } from "../src/shared/muc-giao-dien";
import { ApiError, api, type Api } from "./api";
import { moBangTruot, type BangTruot } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { truong } from "./khung";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const listEl = byId("list");
const listCardsEl = byId("list-cards");
let types: Api.LocationTypeDto[] = [];
let current: Api.LocationDto[] = [];
let zones: Api.VungDonDto[] = [];
const MA_NGOAI_VUNG = "NGOAI_VUNG"; // khu vực gieo sẵn, luôn bật (máy chủ: loc_zone, ADR-0147 Đ1)

/** Nơi hiện lỗi: dải lỗi của trang, hoặc dải lỗi của bảng trượt đang mở (dải của trang nằm sau bảng, không ai thấy). */
let noiLoi: HTMLElement = errorEl;
const baoLoi = (cau: string | null): void => showError(noiLoi, cau);

const STALE_NOTICE = "Địa điểm vừa được người khác thay đổi nên bản đang xem đã cũ. Đã nạp bản mới — hãy kiểm tra rồi Lưu lại nếu vẫn cần.";
const fail = (err: unknown) => baoLoi(err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

/**
 * Chạy một thao tác. Thao tác GHI truyền `btn`: nút bị khoá từ lúc bấm đến khi xong cả phần nạp lại (bấm đúp không gửi hai lần), mở lại ở `finally`.
 * `onStale` (chỉ cho PUT có khoá lạc quan): gặp 409 `stale` thì nạp lại dữ liệu rồi hiện thông báo. Thông báo phải đặt SAU khi nạp xong vì act() xoá lỗi ở đầu mỗi lần gọi.
 */
async function act<T>(fn: () => Promise<T>, btn?: HTMLButtonElement | null, onStale?: () => Promise<void>): Promise<T | undefined> {
  if (btn?.disabled) return undefined;
  baoLoi(null);
  if (btn) btn.disabled = true;
  try {
    return await fn();
  } catch (err) {
    if (onStale && err instanceof ApiError && err.code === "stale") {
      await onStale();
      if (noiLoi.hidden) baoLoi(STALE_NOTICE); // nạp lại thất bại thì giữ lỗi của lần nạp
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

/** Chạy thao tác ghi khu vực; 409 `zone_in_use` / `zone_required` hiện câu của màn (lời thường); 409 `stale` đóng bảng đang mở (`dong`), nạp lại và báo ở trang. */
async function actZone<T>(fn: () => Promise<T>, btn: HTMLButtonElement | null, z?: Api.VungDonDto, dong?: () => void): Promise<T | undefined> {
  if (btn?.disabled) return undefined;
  baoLoi(null);
  if (btn) btn.disabled = true;
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError && ZONE_MESSAGES[err.code]) baoLoi(ZONE_MESSAGES[err.code]!(z));
    else if (err instanceof ApiError && err.code === "stale") {
      dong?.();
      await load();
      if (noiLoi.hidden) baoLoi("Khu vực vừa được người khác thay đổi nên bản đang xem đã cũ. Đã nạp bản mới, hãy kiểm tra rồi lưu lại nếu vẫn cần.");
    } else fail(err);
    return undefined;
  } finally {
    if (btn) btn.disabled = false;
  }
}

const huyHieuNgung = (): HTMLElement => h("span", { class: "huy-hieu", "data-tong": "xam" }, "Ngưng dùng");

/** Chữ khu vực của một địa điểm: chưa xếp thì hiện tên «Ngoài khu vực» kèm nhãn phụ «chưa xếp» (`lopPhu`: lớp của nhãn phụ — trong bảng xuống dòng riêng, trong dòng thì nối tiếp). */
function zoneCell(l: Api.LocationDto, lopPhu: "o-phu" | "muted"): (HTMLElement | string)[] {
  const z = l.zoneCode === null ? undefined : zones.find((x) => x.code === l.zoneCode);
  if (z) return [z.name];
  const ngoai = zones.find((x) => x.code === MA_NGOAI_VUNG);
  return [ngoai?.name ?? "Ngoài khu vực", " ", h("span", { class: lopPhu }, "(chưa xếp)")];
}

function zoneOptions(selected: string | null): HTMLElement[] {
  const opts = [h("option", { value: "", selected: selected === null }, "Chưa xếp")];
  for (const z of zones) if (z.active || z.code === selected) opts.push(h("option", { value: z.code, selected: z.code === selected }, z.active ? z.name : `${z.name} (ngưng)`));
  return opts;
}

const typeOptions = (selected?: string) => types.map((t) => h("option", { value: t.code, selected: t.code === selected }, t.name));

/** Dòng của bảng (khối rộng từ 800): mã nằm dưới tên; địa chỉ có cột riêng khi khối rộng từ 1040, hẹp hơn thì nằm dưới tên. */
function row(l: Api.LocationDto): HTMLElement {
  const edit = h("button", { type: "button", class: "nut", "data-cap": "loi" }, "Sửa");
  edit.addEventListener("click", () => openEdit(l, edit));
  return h(
    "tr",
    { "data-ngung": l.active ? undefined : "" },
    h("td", null, l.name, !l.active && " ", !l.active && huyHieuNgung(), h("span", { class: "o-phu" }, l.code), l.address ? h("span", { class: "o-phu", "data-thay-cot": "" }, l.address) : null),
    h("td", { "data-gon": "" }, l.locationTypeName),
    h("td", null, ...zoneCell(l, "o-phu")),
    h("td", { class: "muted", "data-cot-phu": "" }, l.address ?? ""),
    h("td", { "data-so": "" }, String(l.sortOrder)),
    h("td", { "data-so": "" }, l.quickPickOrder === null ? "" : String(l.quickPickOrder)),
    h("td", null, edit),
  );
}

/** Dòng của danh sách (khối hẹp hơn 800, điện thoại). */
function card(l: Api.LocationDto): HTMLElement {
  const edit = h("button", { type: "button", class: "nut", "data-cap": "loi" }, "Sửa");
  edit.addEventListener("click", () => openEdit(l, edit));
  return h(
    "div",
    { class: "dong", "data-ngung": l.active ? undefined : "", "data-testid": "location-card" },
    h(
      "div",
      { class: "dong-chu" },
      h("strong", null, l.name),
      !l.active ? h("div", null, huyHieuNgung()) : h("div", { class: "o-phu" }, l.code, " · ", l.locationTypeName),
      l.active && h("div", { class: "o-phu" }, "Khu vực: ", ...zoneCell(l, "muted")),
      l.active && l.address && h("div", { class: "o-phu" }, l.address),
      l.active && l.quickPickOrder !== null && h("div", { class: "o-phu" }, `Chọn nhanh: số ${l.quickPickOrder}`),
    ),
    edit,
  );
}

let demBang = 0;

/** Mở bảng trượt chứa một biểu mẫu: dải lỗi riêng ở đầu bảng, chân bảng có «Đóng» và nút ghi (`nutGhi`, do nơi gọi dựng để chữ của nó nằm ngay tại chỗ).
 *  Enter trong ô và bấm nút ghi cùng đi qua kiểm tra bắt buộc của trình duyệt rồi gọi `gui`. Lỗi của thao tác hiện trong bảng tới khi bảng đóng. */
function moBieuMau(o: { tieuDe: string; than: (HTMLElement | null)[]; nutGhi: HTMLButtonElement; opener: HTMLElement | null; testId?: string; gui: (bang: BangTruot) => Promise<void> }): BangTruot | null {
  const id = `dd-bieu-mau-${++demBang}`;
  const loi = h("div", { class: "alert", role: "alert", hidden: true });
  const bieuMau = h("form", { id, class: "luoi", autocomplete: "off", "data-testid": o.testId }, ...o.than);
  const dong = h("button", { type: "button", class: "nut", "data-co": "lon" }, "Đóng");
  o.nutGhi.setAttribute("form", id); // nút ghi đứng ở chân bảng, ngoài <form> (thuộc tính `form` chỉ đọc, không gán qua h())
  const bang = moBangTruot({ title: o.tieuDe, body: [loi, bieuMau], foot: [dong, o.nutGhi], footClass: "vc-foot-2", opener: o.opener, onClosed: () => (noiLoi = errorEl) });
  if (!bang) return null;
  noiLoi = loi;
  dong.addEventListener("click", () => bang.close());
  bieuMau.addEventListener("submit", async (e) => {
    e.preventDefault();
    bang.setBusy(true);
    try {
      await o.gui(bang);
    } finally {
      bang.setBusy(false);
    }
  });
  return bang;
}

const oGo = (id: string, them: Record<string, unknown>): HTMLInputElement => h("input", { id, class: "o", type: "text", ...them });
const oTich = (id: string, dangBat: boolean): HTMLInputElement => h("input", { id, type: "checkbox", class: "o-tick", checked: dangBat });

function openAdd(opener: HTMLElement): void {
  const code = oGo("add-code", { maxLength: 40, placeholder: "QUAY_VE_05", required: true });
  const name = oGo("add-name", { maxLength: 100, required: true });
  const type = h("select", { id: "add-type", class: "o" }, ...typeOptions());
  const address = oGo("add-address", { maxLength: 300 });
  const sort = oGo("add-sort", { type: "number", min: 0, max: 9999, value: "0" });
  const them = h("button", { type: "submit", class: "nut", "data-co": "lon", "data-cap": "chinh" }, "Thêm");
  moBieuMau({
    tieuDe: "Thêm địa điểm",
    than: [truong("Mã (chữ HOA, số, gạch dưới)", code), truong("Tên", name), truong("Loại", type), truong("Địa chỉ", address), truong("Thứ tự", sort)],
    nutGhi: them,
    opener,
    gui: async (bang) => {
      const body = { code: code.value.trim(), name: name.value, locationTypeCode: type.value, address: address.value || null, sortOrder: Number(sort.value || 0) };
      await act(async () => {
        await api<Api.LocationResponse>("/api/locations", { method: "POST", body });
        bang.close();
        await load();
      }, them);
    },
  });
}

function openEdit(l: Api.LocationDto, opener: HTMLElement | null): void {
  const name = oGo("sua-ten", { value: l.name, maxLength: 100 });
  const type = h("select", { id: "sua-loai", class: "o" }, ...typeOptions(l.locationTypeCode));
  const address = oGo("sua-dia-chi", { value: l.address ?? "", maxLength: 300 });
  const zone = h("select", { id: "sua-khu-vuc", class: "o" }, ...zoneOptions(l.zoneCode));
  const sort = oGo("sua-thu-tu", { type: "number", value: String(l.sortOrder), min: 0, max: 9999 });
  const nhanh = oGo("sua-chon-nhanh", { inputMode: "numeric", maxLength: 2, autocomplete: "off", placeholder: "Trống = không", value: l.quickPickOrder === null ? "" : String(l.quickPickOrder) });
  const active = oTich("sua-dang-dung", l.active);
  const save = h("button", { type: "submit", class: "nut", "data-co": "lon", "data-cap": "chinh" }, "Lưu");
  moBieuMau({
    tieuDe: `Sửa: ${l.code}`,
    than: [
      truong("Tên", name),
      truong("Loại", type),
      truong("Địa chỉ", address),
      truong("Khu vực đón", zone),
      truong("Thứ tự", sort),
      truong("Chọn nhanh (1–99)", nhanh, { goiY: "Chọn nhanh: điền số (1–99) thì địa điểm này hiện thành nút bấm ở form Tạo đơn — dưới ô Nơi trả của chiều đi và ô Nơi đón của chiều về, xếp theo số nhỏ trước. Để trống nếu không cần." }),
      h("label", { class: "check" }, active, "Đang dùng"),
      h("p", { class: "khoi-mo-ta" }, "Mã là định danh, không đổi được. Địa điểm đã dùng ở vai trò hồ sơ không xoá được — chỉ ngưng dùng."),
    ],
    nutGhi: save,
    opener,
    gui: async (bang) => {
      const q = docChonNhanh(nhanh.value);
      if (!q.ok) return baoLoi(q.message);
      // `quickPickOrder` LUÔN gửi (số hoặc null): ô trống = người dùng muốn bỏ chọn nhanh (khoá vắng mới là «giữ» — dành cho màn bản cũ).
      const body = { name: name.value, locationTypeCode: type.value, address: address.value || null, sortOrder: Number(sort.value), active: active.checked, quickPickOrder: q.value, zoneCode: zone.value === "" ? null : zone.value, expectedUpdatedAt: l.updatedAt };
      await act(
        async () => {
          await api<Api.LocationResponse>(`/api/locations/${l.id}`, { method: "PUT", body });
          bang.close(false); // danh sách sắp được vẽ lại: nút «Sửa» đã mở bảng không còn
          await load();
        },
        save,
        async () => {
          // 409 stale: `l.updatedAt` đã cũ. Nạp lại rồi mở lại bảng với bản mới để Lưu lần sau dùng đúng `updatedAt`; câu báo hiện trong bảng mới.
          bang.close(false);
          await load();
          const fresh = current.find((x) => x.id === l.id);
          if (fresh) openEdit(fresh, null);
        },
      );
    },
  });
}

function zoneRow(z: Api.VungDonDto): HTMLElement {
  const edit = h("button", { type: "button", class: "nut", "data-cap": "phu" }, "Sửa khu vực đón");
  edit.addEventListener("click", () => openZoneEdit(z, edit));
  return h(
    "div",
    { class: "dong", "data-ngung": z.active ? undefined : "", "data-testid": "zone-card" },
    h(
      "div",
      { class: "dong-chu" },
      h("strong", null, z.name),
      !z.active && h("div", null, huyHieuNgung()),
      h("div", { class: "o-phu" }, z.code, " · ", `${z.soDiaDiem} địa điểm`, " · thứ tự ", String(z.sortOrder)),
    ),
    edit,
  );
}

function openZoneAdd(opener: HTMLElement): void {
  const code = oGo("zone-code", { maxLength: 30, placeholder: "BAC_NHA_TRANG", required: true });
  const name = oGo("zone-name", { maxLength: 60, required: true });
  const sort = oGo("zone-sort", { type: "number", min: 0, max: 9999, value: "0" });
  const them = h("button", { type: "submit", class: "nut", "data-co": "lon", "data-cap": "chinh" }, "Thêm khu vực đón");
  moBieuMau({
    tieuDe: "Thêm khu vực đón",
    than: [truong("Mã (chữ HOA, số, gạch dưới)", code), truong("Tên", name), truong("Thứ tự", sort)],
    nutGhi: them,
    opener,
    gui: async (bang) => {
      const body = { code: code.value.trim(), name: name.value, sortOrder: Number(sort.value || 0) };
      await actZone(async () => {
        await api<Api.VungDonResponse>("/api/location-zones", { method: "POST", body });
        bang.close();
        await load();
      }, them);
    },
  });
}

function openZoneEdit(z: Api.VungDonDto, opener: HTMLElement): void {
  const name = oGo("zone-sua-ten", { value: z.name, maxLength: 60 });
  const sort = oGo("zone-sua-thu-tu", { type: "number", value: String(z.sortOrder), min: 0, max: 9999 });
  const active = oTich("zone-sua-dang-dung", z.active);
  const save = h("button", { type: "submit", class: "nut", "data-co": "lon", "data-cap": "chinh" }, "Lưu");
  moBieuMau({
    tieuDe: `Sửa: ${z.code}`,
    than: [truong("Tên", name), truong("Thứ tự", sort), h("label", { class: "check" }, active, "Đang dùng")],
    nutGhi: save,
    opener,
    testId: "zone-editor",
    gui: async (bang) => {
      await actZone(
        async () => {
          await api<Api.VungDonResponse>(`/api/location-zones/${z.code}`, { method: "PUT", body: { name: name.value, sortOrder: Number(sort.value), active: active.checked, expectedUpdatedAt: z.updatedAt } });
          bang.close(false); // danh sách sắp được vẽ lại
          await load();
        },
        save,
        z,
        () => bang.close(false),
      );
    },
  });
}

async function load(): Promise<void> {
  const r = await act(() => api<Api.LocationListResponse>("/api/locations"));
  if (!r) return;
  types = r.types;
  current = r.locations;
  zones = r.zones;
  replaceChildren(listEl, ...r.locations.map(row));
  replaceChildren(listCardsEl, ...r.locations.map(card));
  replaceChildren(byId("zone-list"), ...r.zones.map(zoneRow));
}

// Nút «Thêm địa điểm» và khối «Khu vực đón» mặc định ẩn trong HTML tĩnh: chỉ quản trị viên mới được thêm (máy chủ 403 với người khác), và danh sách
// loại địa điểm của biểu mẫu thêm cũng chỉ nạp được khi load() chạy.
const staff = await initShell();
// Chốt chặn của trang khai ở bảng mục (`TRANG.diaDiem.moTrang` — ô admin.manage): bảng và trang một nguồn, bài rào "mục hiện ⇔ trang mở được" đọc được.
if (!moTrang("diaDiem", staff)) showError(errorEl, "Chỉ quản trị viên được vào trang này.");
else {
  // Chịu được phần tử vắng: HTML cũ trong cache + JS mới không được làm hỏng cả trang.
  const addMo = document.getElementById("add-mo");
  if (addMo) {
    addMo.hidden = false;
    addMo.addEventListener("click", () => openAdd(addMo));
  }
  const zoneCard = document.getElementById("zone-card");
  if (zoneCard) zoneCard.hidden = false;
  const zoneMo = document.getElementById("zone-mo");
  zoneMo?.addEventListener("click", () => openZoneAdd(zoneMo));
  await load();
}
