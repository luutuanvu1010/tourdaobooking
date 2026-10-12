// Báo bận của tôi (/ban — ADR-0053 D9; kế hoạch A4 T9, G-A4-10, G-A4-16, G-A4-28). Tài xế đối tác ghi khung giờ mình bận (bắt đầu mặc định = phút hiện tại,
// ô `datetime-local` 16px — giờ VN treo tường, đổi sang {ngay, gio} bằng `tuODatetime`), xem khung còn hiệu lực, rút khung (dải hỏi lại NGAY TRONG TRANG, không
// hộp nổi). Khung chồng chuyến mình đang được xếp → máy chủ 409 kèm mã chuyến + giờ (chỉ chuyến của mình) — dải đỏ có liên kết mở chuyến để Từ chối (nếu còn
// hạn) hoặc gọi văn phòng. Thân không có `requestId` (lớp vé chống ghi trùng — G-A4-28). Không gửi tin văn phòng (D9.4): văn phòng thấy ở dải "Tài xế bận".
import type { KhungBanChongChuyenTaiXeLoi, KhungBanCuaToiResponse } from "../src/shared/contracts";
import { nhanKhoangGio } from "../src/shared/khung-ban";
import { can } from "../src/shared/permissions";
import { chiTaiXe } from "../src/shared/start-page";
import { sangODatetime, tuODatetime } from "../src/shared/tu-choi-man";
import { msToVnLocal, vnLocalToMs } from "../src/shared/vn-date";
import { ApiError, api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { dai, nhomChon } from "./dieu-phoi-ui";
import { loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const trangEl = byId("bb-trang");
const GOC = "/api/van-chuyen/ban";

let duLieu: KhungBanCuaToiResponse | null = null;
/** Dải kết quả / lỗi của lần bấm cuối (chỉ bộ nhớ trang). */
let baoCao: HTMLElement | null = null;
/** Khung đang hỏi lại "Rút khung này?" (id) — dải hỏi lại ngay dưới dòng đó. */
let dangHoiRut: string | null = null;

const phutNay = (): string => {
  const { date, time } = msToVnLocal(Date.now());
  return sangODatetime({ ngay: date, gio: time });
};
const motGioSau = (): string => {
  const { date, time } = msToVnLocal(Date.now() + 3_600_000);
  return sangODatetime({ ngay: date, gio: time });
};

function loiGhi(e: unknown): HTMLElement {
  if (e instanceof ApiError && e.code === "khung_ban_chong_chuyen_tai_xe") {
    const ct = (e.details as KhungBanChongChuyenTaiXeLoi["error"] | undefined)?.chuyen ?? [];
    return dai("danger", "Khung này trùng chuyến bạn đang được xếp", [e.message], undefined, [
      h("ul", { class: "bb-trung" }, ...ct.map((c) => h("li", null, h("a", { href: `/cuoc-chuyen?id=${encodeURIComponent(c.id)}` }, `${c.ma} · ${c.gio}`)))),
    ]);
  }
  return dai("danger", e instanceof ApiError ? e.message : "Chưa gửi được — kiểm tra mạng rồi bấm lại.");
}

function ve(): void {
  const r = duLieu!;
  let lyDo: string | null = null;
  const oTu = h("input", { id: "bb-tu", class: "vc-input", type: "datetime-local", value: phutNay(), "aria-describedby": "bb-loi" }) as HTMLInputElement;
  const oDen = h("input", { id: "bb-den", class: "vc-input", type: "datetime-local", value: motGioSau(), "aria-describedby": "bb-loi" }) as HTMLInputElement;
  const loi = h("div", { id: "bb-loi", class: "vc-field-error", role: "alert", hidden: true });
  const luu = h("button", { type: "button", class: "vc-btn btn btn-accent", disabled: true, "data-action": "luu-khung" }, "Lưu khung bận");
  const chon = nhomChon("bb-ly-do", "Lý do", r.lyDo.map((x) => ({ code: x.code, nhan: x.label })), (code) => {
    lyDo = code;
    luu.disabled = false;
  });
  luu.addEventListener("click", async () => {
    const batDau = tuODatetime(oTu.value);
    const ketThuc = tuODatetime(oDen.value);
    if (!batDau || !ketThuc || !lyDo) {
      replaceChildren(loi, icon("alert", 16, 2), "Chọn giờ bắt đầu, giờ kết thúc và lý do.");
      loi.hidden = false;
      return;
    }
    luu.disabled = true;
    try {
      duLieu = await api<KhungBanCuaToiResponse>(GOC, { method: "POST", body: { batDau, ketThuc, lyDo } });
      baoCao = dai("ok", "Đã lưu khung bận", [`${nhanKhoangGio(vnLocalToMs(batDau.ngay, batDau.gio)!, vnLocalToMs(ketThuc.ngay, ketThuc.gio)!)}. Văn phòng sẽ không xếp chuyến cho bạn trong giờ này.`]);
    } catch (e) {
      baoCao = loiGhi(e);
    }
    ve();
  });
  const form = h(
    "section",
    { class: "vc-card bb-form", "aria-labelledby": "bb-form-title" },
    h("h2", { id: "bb-form-title", class: "vc-card-title" }, "Ghi khung bận"),
    h("p", { class: "dp-note" }, "Văn phòng chỉ thấy là bạn bận, không thấy lý do. Một khung dài tối đa 14 ngày."),
    h("div", { class: "bb-o" }, h("div", { class: "vc-field" }, h("label", { for: "bb-tu" }, "Bắt đầu"), oTu), h("div", { class: "vc-field" }, h("label", { for: "bb-den" }, "Kết thúc"), oDen)),
    chon,
    loi,
    h("div", { class: "bb-hanh-dong" }, luu),
  );
  const ds = r.khung.length
    ? r.khung.map((k) => {
        const dong = h("div", { class: "vc-card bb-khung", "data-khung": k.id },
          h("span", { class: "bb-khung-gio" }, nhanKhoangGio(k.batDauMs, k.ketThucMs)),
          h("span", { class: "dp-note" }, k.lyDo));
        if (dangHoiRut === k.id) {
          const co = h("button", { type: "button", class: "vc-btn vc-btn-danger", "data-action": "rut-xac-nhan" }, "Rút khung bận");
          const khong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "rut-thoi" }, "Không rút");
          khong.addEventListener("click", () => {
            dangHoiRut = null;
            ve();
          });
          co.addEventListener("click", async () => {
            co.disabled = true;
            try {
              duLieu = await api<KhungBanCuaToiResponse>(`${GOC}/${encodeURIComponent(k.id)}/rut`, { method: "POST", body: { version: k.version } });
              baoCao = dai("ok", "Đã rút khung bận", [nhanKhoangGio(k.batDauMs, k.ketThucMs)]);
            } catch (e) {
              baoCao = dai("danger", e instanceof ApiError ? e.message : "Chưa gửi được — kiểm tra mạng rồi bấm lại.");
              await napLai();
            }
            dangHoiRut = null;
            ve();
          });
          dong.append(dai("warning", "Rút khung này?", ["Văn phòng sẽ xếp chuyến được cho bạn trong giờ này."], undefined, [h("div", { class: "banner-actions" }, co, khong)]));
        } else {
          const rut = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "rut-khung" }, "Rút khung bận");
          rut.addEventListener("click", () => {
            dangHoiRut = k.id;
            ve();
          });
          dong.append(rut);
        }
        return dong;
      })
    : [h("p", { class: "dp-cuoc-trong" }, "Chưa có khung bận nào.")];
  replaceChildren(trangEl, baoCao, form, h("section", { class: "bb-ds", "aria-label": "Khung bận đang có" }, h("h2", { class: "vc-card-title" }, "Khung bận đang có"), ...ds));
}

async function napLai(): Promise<void> {
  try {
    duLieu = await api<KhungBanCuaToiResponse>(`${GOC}/cua-toi`);
  } catch {
    /* giữ dữ liệu cũ */
  }
}

async function main(): Promise<void> {
  const staff = await initShell();
  // G-A4-16: trang của tài khoản "chỉ tài xế" có ô báo bận (ô own — hỏi kèm ngữ cảnh chính mình); máy chủ vẫn kiểm lại.
  if (!chiTaiXe(staff) || !can(staff, "unavailability.self", { ownerId: staff.id })) return showError(errorEl, "Tài khoản này không báo bận được.");
  try {
    duLieu = await api<KhungBanCuaToiResponse>(`${GOC}/cua-toi`);
  } catch (e) {
    return showError(errorEl, loiCua(e));
  }
  ve();
}
void main();
