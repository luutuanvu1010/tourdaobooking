// Trang Tôi › Chế độ bảo trì › NỘI DUNG MÀN BẢO TRÌ (bản mẫu 2c của chủ dự án 13/11/2026; ADR-0202): Toàn quyền tự sửa chữ, SĐT hỗ trợ, Zalo, website,
// lời cảm ơn và năm công tắc ẩn/hiện; xem trước trực tiếp bằng CHÍNH hàm dựng thẻ của lớp phủ thật (`dungTheBaoTri`) nên xem trước = điều nhân viên thấy.
// Máy chủ mới là nơi kiểm (PUT /api/maintenance/content — checkMaintenanceContent); ở đây chỉ báo lỗi sớm bằng cùng bộ luật.
import { ApiError, api, type Api } from "./api";
import { MAINTENANCE_CONTENT_DEFAULT, MAINTENANCE_CONTENT_MAX, checkMaintenanceContent, type MaintenanceContent } from "../src/shared/maintenance";
import { h, replaceChildren } from "./dom";
import { showError } from "./shell";
import { dungTheBaoTri, toDongHo } from "./maintenance-screen";

type O = "tieuDe" | "loiNhan" | "lyDo" | "sdt" | "zalo" | "website" | "camOn";
type CongTac = "hienLyDo" | "hienGoi" | "hienZalo" | "hienWeb" | "hienCamOn";

const O_NHAP: { k: O; nhan: string; nhieuDong?: true; tuyChon?: true; loai?: string; goiY?: string }[] = [
  { k: "tieuDe", nhan: "Tiêu đề" },
  { k: "loiNhan", nhan: "Lời nhắn chính", nhieuDong: true },
  { k: "lyDo", nhan: "Nội dung bảo trì", nhieuDong: true, tuyChon: true, goiY: "Vd: nâng cấp máy chủ, cập nhật bảng giá." },
  { k: "sdt", nhan: "Số điện thoại hỗ trợ", loai: "sdt" },
  { k: "zalo", nhan: "Liên kết Zalo", tuyChon: true, goiY: "Dạng https://zalo.me/số điện thoại" },
  { k: "website", nhan: "Website công ty", tuyChon: true, goiY: "Bắt đầu bằng https://" },
  { k: "camOn", nhan: "Lời cảm ơn cuối", tuyChon: true },
];
const CONG_TAC: { k: CongTac; nhan: string }[] = [
  { k: "hienLyDo", nhan: "Nội dung bảo trì" },
  { k: "hienGoi", nhan: "Nút gọi hỗ trợ" },
  { k: "hienZalo", nhan: "Nút nhắn Zalo" },
  { k: "hienWeb", nhan: "Thẻ website" },
  { k: "hienCamOn", nhan: "Lời cảm ơn" },
];
/** Giờ mẫu cho bản xem trước (đồng hồ đứng yên 02:05:09 như bản mẫu). */
const MAU_CON_LAI_MS = (2 * 3600 + 5 * 60 + 9) * 1000;

/** Dựng khung sửa nội dung + bản xem trước. `daLuu` là nội dung máy chủ đang giữ; `onSaved` nhận phản hồi sau khi lưu. */
export function dungSuaNoiDung(daLuu: MaintenanceContent, onSaved: (r: Api.MaintenanceResponse) => void): HTMLElement {
  const errorBox = h("div", { class: "alert", role: "alert", hidden: true });
  const okBox = h("p", { class: "muted", role: "status" });
  const o = {} as Record<O, HTMLInputElement | HTMLTextAreaElement>;
  const ct = {} as Record<CongTac, HTMLButtonElement>;
  const bat = (k: CongTac): boolean => ct[k].getAttribute("aria-checked") === "true";
  const truong = O_NHAP.map((f) => {
    const id = `maint-nd-${f.k}`;
    const input = f.nhieuDong
      ? (h("textarea", { class: "o", id, "data-loai": "nhieu-dong", maxlength: String(MAINTENANCE_CONTENT_MAX[f.k as keyof typeof MAINTENANCE_CONTENT_MAX]) }) as HTMLTextAreaElement)
      : (h("input", {
          class: "o",
          id,
          type: f.loai === "sdt" ? "tel" : f.k === "zalo" || f.k === "website" ? "url" : "text",
          inputmode: f.loai === "sdt" ? "numeric" : null,
          autocomplete: "off",
          "data-loai": f.loai ?? null,
          maxlength: f.k === "sdt" ? "14" : String(MAINTENANCE_CONTENT_MAX[f.k as keyof typeof MAINTENANCE_CONTENT_MAX]),
        }) as HTMLInputElement);
    o[f.k] = input;
    return h("label", { class: "maint-nd-o" }, h("span", { class: "nhan" }, f.nhan, f.tuyChon ? h("span", { class: "muted" }, " (tuỳ chọn)") : null), input, f.goiY ? h("span", { class: "muted maint-nd-goi-y" }, f.goiY) : null);
  });
  const congTac = CONG_TAC.map((c) => {
    const id = `maint-nd-${c.k}`;
    const nut = h("button", { type: "button", role: "switch", class: "dp-switch", "aria-checked": "false", "aria-labelledby": id }, h("span", { class: "dp-switch-knob", "aria-hidden": "true" })) as HTMLButtonElement;
    nut.addEventListener("click", () => {
      nut.setAttribute("aria-checked", String(!bat(c.k)));
      veXemTruoc();
    });
    ct[c.k] = nut;
    return h("div", { class: "maint-nd-cong-tac" }, h("span", { id }, c.nhan), nut);
  });

  const dien = (nd: MaintenanceContent): void => {
    for (const f of O_NHAP) o[f.k].value = nd[f.k];
    for (const c of CONG_TAC) ct[c.k].setAttribute("aria-checked", String(nd[c.k]));
  };
  const doc = (): Record<string, unknown> => {
    const v: Record<string, unknown> = {};
    for (const f of O_NHAP) v[f.k] = o[f.k].value;
    for (const c of CONG_TAC) v[c.k] = bat(c.k);
    return v;
  };

  // Bản xem trước: dựng lại thẻ thật mỗi lần gõ. Nội dung chưa hợp lệ vẫn xem được, nhưng đường dẫn chưa qua kiểm thì bỏ (không đặt href lạ, kể cả trong khung inert).
  const khung = h("div", { class: "maint-xem-truoc", inert: true, "aria-hidden": "true" });
  const veXemTruoc = (): void => {
    const v = doc();
    const r = checkMaintenanceContent(v);
    const nd: MaintenanceContent = r.ok ? r.content : { ...(v as unknown as MaintenanceContent), zalo: "", website: "" };
    const t = dungTheBaoTri(nd, new Date(Date.now() + MAU_CON_LAI_MS).toISOString());
    t.title.removeAttribute("id");
    t.message.removeAttribute("id");
    toDongHo(t, MAU_CON_LAI_MS);
    replaceChildren(khung, t.cot);
  };
  const xemTruoc = h("div", { class: "maint-nd-xem" }, h("p", { class: "nhan" }, "Xem trước trên điện thoại"), khung);
  const nutXem = h("button", { class: "nut maint-nd-nut-xem", "data-cap": "phu", type: "button", "aria-expanded": "false" }, "Xem trước màn bảo trì");
  nutXem.addEventListener("click", () => {
    const mo = !xemTruoc.classList.contains("mo");
    xemTruoc.classList.toggle("mo", mo);
    nutXem.setAttribute("aria-expanded", String(mo));
    if (mo) xemTruoc.scrollIntoView({ block: "nearest" });
  });

  const luu = h("button", { class: "nut", "data-cap": "chinh", type: "button" }, "Lưu nội dung") as HTMLButtonElement;
  const khoiPhuc = h("button", { class: "nut", "data-cap": "phu", type: "button" }, "Về mặc định") as HTMLButtonElement;
  khoiPhuc.addEventListener("click", () => {
    dien(MAINTENANCE_CONTENT_DEFAULT); // chỉ điền lại ô; bấm Lưu nội dung mới ghi
    okBox.textContent = "Đã điền lại nội dung mặc định. Bấm «Lưu nội dung» để áp dụng.";
    veXemTruoc();
  });
  luu.addEventListener("click", async () => {
    showError(errorBox, null);
    okBox.textContent = "";
    const r = checkMaintenanceContent(doc());
    if (!r.ok) return showError(errorBox, r.message);
    luu.disabled = khoiPhuc.disabled = true;
    try {
      const res = await api<Api.MaintenanceResponse>("/api/maintenance/content", { method: "PUT", body: r.content satisfies Api.MaintenanceContentRequest });
      dien(res.content);
      okBox.textContent = "Đã lưu. Nhân viên bị chặn sẽ thấy nội dung mới ở lần mở kế tiếp.";
      onSaved(res);
    } catch (err) {
      showError(errorBox, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
    } finally {
      luu.disabled = khoiPhuc.disabled = false;
    }
  });

  const form = h(
    "div",
    { class: "maint-nd-form" },
    h("h3", { id: "maint-nd-heading" }, "Nội dung màn bảo trì"),
    h("p", { class: "muted" }, "Chữ hiện cho người bị chặn. Ô trống thì khối đó ẩn."),
    ...truong,
    h("div", { class: "maint-nd-hien", role: "group", "aria-label": "Hiện trên màn bảo trì" }, h("span", { class: "nhan" }, "Hiện trên màn bảo trì"), ...congTac),
    nutXem,
    errorBox,
    okBox,
    h("div", { class: "maint-actions" }, luu, khoiPhuc),
  );
  form.addEventListener("input", veXemTruoc);
  dien(daLuu);
  veXemTruoc();
  return h("div", { class: "maint-nd", role: "group", "aria-labelledby": "maint-nd-heading" }, form, xemTruoc);
}
