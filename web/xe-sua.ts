// Thêm / sửa xe (/xe-sua, /xe-sua?id=<xe> — ADR-0040 D1; bản vẽ docs/design/van-chuyen-1a/project/02 Them sua xe.dc.html).
// Trạng thái trong form chỉ Đang dùng / Bảo dưỡng; "Ngừng dùng xe" là nút viền đỏ riêng + hộp xác nhận "không bị xoá" (gửi NGAY giá trị đã lưu + trạng thái
// Ngừng — chỗ đang sửa dở trong form không lẫn vào); xe đã Ngừng có "Dùng lại xe" (đổi trạng thái trong form, bấm Lưu mới gửi — máy chủ kiểm biển số, R15).
// Số người được chở dùng bộ đếm −/+ (không kể tài xế). Biển số / số khung trùng → câu của máy chủ ngay dưới ô. Lưu xong → chi tiết xe (location.replace).
// ADR-0048 D1 (Task B3, khuôn ô chọn .vc-input sẵn có): ô "Chủ xe" dưới "Tên / đời xe" — công ty chủ hoặc nhà xe đang hợp tác (GET /api/van-chuyen/nha-xe); chỉ
// hiện khi đã có nhà xe (hoặc xe đang thuộc chủ khác công ty chủ). Sửa chủ xe khi nhập nhầm được (chủ chọn Q1 = (a)); máy chủ kiểm chủ và ghi nhật ký.
import { luaChonChuXe, thanDungLaiHoacSuaXe, thanNgungXe, thanXeMoi, type XeForm } from "../src/shared/giay-to-hien-thi";
import { can } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { chipTrangThaiXe, datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, setBarTitle, showError } from "./shell";

const errorEl = byId("error");
const form = byId<HTMLFormElement>("xe-form");
const stopEl = byId("xe-stop");
const bottomEl = byId("xe-bottom");
const id = new URLSearchParams(location.search).get("id");

const staff = await initShell();
datCrumb("Vận chuyển › Xe", id ? "Sửa xe" : "Thêm xe");

async function main(): Promise<void> {
  if (!can(staff, "vehicle.manage")) return showError(errorEl, "Tài khoản này không quản lý được xe.");
  let xe: Api.VehicleDto | null = null;
  // Danh sách chủ xe chọn được; lỗi đọc thì bỏ ô (máy chủ vẫn dùng mặc định: thêm → công ty chủ; sửa → giữ chủ).
  const chuXe = api<Api.CarrierListResponse>("/api/van-chuyen/nha-xe").catch(() => null);
  if (id) {
    try {
      xe = (await api<Api.VehicleResponse>(`/api/van-chuyen/xe/${encodeURIComponent(id)}`)).vehicle;
    } catch (err) {
      return showError(errorEl, loiCua(err));
    }
    const tieuDe = `Sửa xe ${xe.plateNumber}`;
    byId("xe-title").textContent = tieuDe;
    setBarTitle(tieuDe);
    datCrumb("Vận chuyển › Xe", tieuDe);
    document.title = `${tieuDe} — Island Booking System`;
  }
  dung(xe, await chuXe);
}

function dung(xeBanDau: Api.VehicleDto | null, chuXe: Api.CarrierListResponse | null): void {
  let xe = xeBanDau;
  const st: XeForm = {
    plateNumber: xe?.plateNumber ?? "", chassisNumber: xe?.chassisNumber ?? "", name: xe?.name ?? "", passengerCapacity: xe?.passengerCapacity ?? 15, status: xe?.status ?? "active",
    ownerPartyId: xe?.ownerPartyId ?? chuXe?.ownerCompany?.partyId ?? "",
  };
  let dangGui = false;

  const oGo = (key: "plateNumber" | "chassisNumber" | "name", idO: string, placeholder: string, maxLength: number, err?: HTMLElement): HTMLInputElement => {
    const el = h("input", { id: idO, class: "vc-input", type: "text", value: st[key], placeholder, maxLength, autocomplete: "off", ...(err ? { "aria-describedby": err.id } : {}) });
    el.addEventListener("input", () => {
      st[key] = el.value;
      if (err) baoLoiO(el, err, null);
    });
    return el;
  };
  const baoLoiO = (input: HTMLInputElement, err: HTMLElement, msg: string | null): void => {
    replaceChildren(err, ...(msg ? [icon("alert", 16, 2), msg] : []));
    err.hidden = !msg;
    if (msg) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  };
  const plateErr = h("div", { id: "xe-plate-error", class: "vc-field-error", role: "alert", hidden: true });
  const chassisErr = h("div", { id: "xe-chassis-error", class: "vc-field-error", role: "alert", hidden: true });
  const plate = oGo("plateNumber", "xe-plate", "Ví dụ: 79B-123.45", 20, plateErr);
  plate.setAttribute("autocapitalize", "characters");
  const chassis = oGo("chassisNumber", "xe-chassis", "In trên giấy đăng ký xe", 30, chassisErr);
  chassis.setAttribute("autocapitalize", "characters");
  const ten = oGo("name", "xe-name", "Ví dụ: Ford Transit 2019", 100);
  const truong = (label: string, input: HTMLElement, ...sau: (HTMLElement | null)[]): HTMLElement => h("div", { class: "vc-field" }, h("label", { for: input.id }, label), input, ...sau);

  // Ô "Chủ xe": công ty chủ + nhà xe đang hợp tác; xe đang thuộc chủ KHÔNG còn trong danh sách (nhà xe đã thôi, công ty chủ cũ) thì thêm đúng chủ đó để Lưu không
  // tự đổi chủ. Chưa có nhà xe nào (và xe thuộc công ty chủ) → không hiện ô (giữ bản vẽ 02 của lượt 1a).
  const luaChon = chuXe ? luaChonChuXe(chuXe) : [];
  if (xe && !luaChon.some((o) => o.value === xe!.ownerPartyId)) luaChon.push({ value: xe.ownerPartyId, label: xe.ownerName });
  const coOChu = luaChon.length > 1;
  const chu = h("select", { id: "xe-owner", class: "vc-input" }, ...luaChon.map((o) => h("option", { value: o.value }, o.label)));
  chu.value = st.ownerPartyId ?? "";
  chu.addEventListener("change", () => { st.ownerPartyId = chu.value; });

  // Bộ đếm −/+ (bản vẽ: hai nút riêng + số ở giữa; xe công ty chủ yếu 6 hoặc 15). Tối thiểu 1; mức trần do máy chủ kiểm (câu báo của máy chủ).
  const giam = h("button", { id: "xe-seats-dec", type: "button", class: "vc-step-btn", "aria-label": "Bớt một người" }, "−");
  const tang = h("button", { id: "xe-seats-inc", type: "button", class: "vc-step-btn", "aria-label": "Thêm một người" }, "+");
  const so = h("output", { id: "xe-seats", class: "vc-step-val", "aria-live": "polite" }, String(st.passengerCapacity));
  const veSo = (): void => {
    so.textContent = String(st.passengerCapacity);
    giam.disabled = st.passengerCapacity <= 1;
  };
  giam.addEventListener("click", () => {
    st.passengerCapacity = Math.max(1, st.passengerCapacity - 1);
    veSo();
  });
  tang.addEventListener("click", () => {
    st.passengerCapacity += 1;
    veSo();
  });
  veSo();

  const trangThai = h("div", { class: "vc-field" });
  const veTrangThai = (): void => {
    const nhan = h("div", { id: "xe-status-label", class: "vc-label" }, "Trạng thái");
    if (st.status === "retired") {
      const dungLai = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Dùng lại xe");
      dungLai.addEventListener("click", () => {
        st.status = "active";
        veTrangThai();
        veNutNgung();
        trangThai.querySelector<HTMLElement>("[role=radio]")?.focus();
      });
      replaceChildren(trangThai, nhan, h("div", { class: "vc-stopped" }, chipTrangThaiXe("retired"), dungLai));
      return;
    }
    const lua = (["active", "maintenance"] as const).map((v) => {
      const b = h("button", { type: "button", role: "radio", "aria-checked": String(st.status === v), tabindex: st.status === v ? 0 : -1 }, v === "active" ? "Đang dùng" : "Bảo dưỡng");
      b.addEventListener("click", () => {
        st.status = v;
        for (const x of lua) {
          x.setAttribute("aria-checked", String(x === b));
          x.tabIndex = x === b ? 0 : -1;
        }
      });
      b.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const khac = lua.find((x) => x !== b);
        khac?.click();
        khac?.focus();
      });
      return b;
    });
    replaceChildren(trangThai, nhan, h("div", { class: "vc-seg", role: "radiogroup", "aria-labelledby": "xe-status-label" }, ...lua));
  };
  veTrangThai();

  const nhanLuu = xe ? "Lưu" : "Lưu xe";
  const ngungDesk = h("button", { type: "button", class: "vc-btn vc-btn-stop" }, "Ngừng dùng xe");
  const ngungMob = h("button", { type: "button", class: "vc-btn vc-btn-stop" }, "Ngừng dùng xe");
  const veNutNgung = (): void => {
    const coNgung = xe !== null && xe.status !== "retired" && st.status !== "retired";
    ngungDesk.hidden = !coNgung;
    stopEl.hidden = !coNgung;
  };

  replaceChildren(
    form,
    h("div", { class: "vc-grid-2" }, truong("Biển số", plate, plateErr), truong("Số khung", chassis, chassisErr)),
    truong("Tên / đời xe", ten),
    coOChu ? truong("Chủ xe", chu) : null,
    h(
      "div",
      { class: "vc-grid-2" },
      h("div", { class: "vc-field" }, h("div", { id: "xe-seats-label", class: "vc-label" }, "Số người được chở (không kể tài xế)"), h("div", { class: "vc-stepper", role: "group", "aria-labelledby": "xe-seats-label" }, giam, so, tang), h("div", { class: "vc-hint" }, "Xe 16 chỗ nhập 15.")),
      trangThai,
    ),
    h(
      "div",
      { class: "vc-form-actions" },
      h("button", { type: "submit", class: "vc-btn btn btn-primary" }, nhanLuu),
      h("a", { class: "vc-btn vc-btn-ghost-primary", href: xe ? `/xe-chi-tiet?id=${encodeURIComponent(xe.id)}` : "/xe" }, "Huỷ"),
      ngungDesk,
    ),
  );
  replaceChildren(stopEl, ngungMob, h("div", { class: "vc-stop-note" }, "Xe không bị xoá — giấy tờ và lịch sử vẫn giữ."));
  const luuDay = h("button", { type: "submit", class: "vc-btn btn btn-primary" }, nhanLuu);
  luuDay.setAttribute("form", "xe-form"); // thuộc tính `form` của nút chỉ đọc (không gán qua h()) — nút ở thanh đáy, ngoài <form>
  replaceChildren(bottomEl, luuDay);
  form.hidden = false;
  bottomEl.hidden = false;
  veNutNgung();

  const moNgung = (opener: HTMLElement): void => {
    if (!xe) return;
    const daLuu = xe;
    const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
    const giu = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Giữ nguyên");
    const ngung = h("button", { type: "button", class: "vc-btn vc-btn-danger" }, "Ngừng dùng");
    const bang = moBangTruot({
      title: `Ngừng dùng xe ${daLuu.plateNumber}?`,
      body: [
        h(
          "div",
          { class: "vc-sheet-text" },
          h("div", null, "Xe ", h("strong", null, "không bị xoá"), ". Xe chuyển sang trạng thái ", h("strong", null, "Ngừng"), "; giấy tờ và lịch sử vẫn giữ nguyên."),
          h("div", { class: "muted" }, "Có thể dùng lại xe bất cứ lúc nào."),
          loi,
        ),
      ],
      foot: [giu, ngung],
      footClass: "vc-foot-2",
      opener,
    });
    if (!bang) return;
    giu.addEventListener("click", () => bang.close());
    ngung.addEventListener("click", async () => {
      bang.setBusy(true);
      ngung.disabled = true;
      giu.disabled = true;
      try {
        xe = (await api<Api.VehicleResponse>(`/api/van-chuyen/xe/${encodeURIComponent(daLuu.id)}`, { method: "PUT", body: thanNgungXe(daLuu) })).vehicle;
        st.status = "retired";
        bang.close(false);
        veTrangThai();
        veNutNgung();
        trangThai.querySelector<HTMLElement>("button")?.focus();
      } catch (err) {
        replaceChildren(loi, icon("alert", 16, 2), loiCua(err));
        loi.hidden = false;
        ngung.disabled = false;
        giu.disabled = false;
      } finally {
        bang.setBusy(false);
      }
    });
  };
  ngungDesk.addEventListener("click", () => moNgung(ngungDesk));
  ngungMob.addEventListener("click", () => moNgung(ngungMob));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (dangGui) return;
    showError(errorEl, null);
    baoLoiO(plate, plateErr, null);
    baoLoiO(chassis, chassisErr, null);
    dangGui = true;
    const nut = [...document.querySelectorAll<HTMLButtonElement>('button[type="submit"]')];
    for (const b of nut) b.disabled = true;
    try {
      const r = xe
        ? await api<Api.VehicleResponse>(`/api/van-chuyen/xe/${encodeURIComponent(xe.id)}`, { method: "PUT", body: thanDungLaiHoacSuaXe(st, xe) })
        : await api<Api.VehicleResponse>("/api/van-chuyen/xe", { method: "POST", body: thanXeMoi(st) });
      location.replace(`/xe-chi-tiet?id=${encodeURIComponent(r.vehicle.id)}`); // replace: Back không đưa về form đã lưu (web/CLAUDE.md, bẫy form)
      return;
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      if (code === "vehicle_plate_taken" || code === "vehicle_plate_conflict") {
        baoLoiO(plate, plateErr, loiCua(err));
        plate.focus();
      } else if (code === "vehicle_chassis_taken" || code === "vehicle_chassis_conflict") {
        baoLoiO(chassis, chassisErr, loiCua(err));
        chassis.focus();
      } else {
        showError(errorEl, loiCua(err));
        errorEl.scrollIntoView({ block: "nearest" });
      }
    } finally {
      dangGui = false;
      for (const b of nut) b.disabled = false;
    }
  });
}

void main();
