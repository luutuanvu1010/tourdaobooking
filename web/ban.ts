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
import { dai } from "./dieu-phoi-ui";
import { loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { dsDong, luoi, thanhNut, truong } from "./khung";
import { initShell, showError } from "./shell";

// Bố cục: khuôn Biểu mẫu của khung gốc giao diện (ADR-0222) bằng hàm của web/khung.ts — khối biểu mẫu (trường trên lưới 12 cột, Lý do chọn một bằng
// `.chon-doan`), «Lưu khung bận» ở thanh nút cuối trang (vùng nội dung từ 560) và ở cuối khối biểu mẫu khi hẹp hơn (KHÔNG dính đáy: trang là một tab của tài
// xế, thanh dính đáy sẽ ẩn thanh tab — người điều phối quyết 24/11); khối «Khung bận đang có» là danh sách dòng.
const errorEl = byId("error");
const baoEl = byId("bb-bao");
const formEl = byId("bb-form");
const nutEl = byId("bb-nut");
const dsEl = byId("bb-ds");
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

/** Chọn một trong vài lựa chọn ngắn (`.chon-doan`, role="radiogroup" — như ô Trạng thái của web/xe-sua.ts): chưa chọn gì lúc đầu, phím mũi tên đổi lựa chọn. */
function chonDoan(idNhan: string, ds: readonly { code: string; nhan: string }[], onDoi: (code: string) => void): HTMLElement {
  const nut = ds.map((l) => {
    const b = h("button", { type: "button", role: "radio", "aria-checked": "false", tabindex: -1, "data-code": l.code }, l.nhan);
    b.addEventListener("click", () => chon(b));
    b.addEventListener("keydown", (e: KeyboardEvent) => {
      const i = nut.indexOf(b);
      const toi = e.key === "ArrowDown" || e.key === "ArrowRight" ? nut[(i + 1) % nut.length] : e.key === "ArrowUp" || e.key === "ArrowLeft" ? nut[(i - 1 + nut.length) % nut.length] : null;
      if (toi) {
        e.preventDefault();
        chon(toi);
        toi.focus();
      }
    });
    return b;
  });
  if (nut[0]) nut[0].tabIndex = 0;
  function chon(b: HTMLButtonElement): void {
    for (const x of nut) {
      x.setAttribute("aria-checked", String(x === b));
      x.tabIndex = x === b ? 0 : -1;
    }
    onDoi(b.dataset.code!);
  }
  return h("div", { class: "chon-doan", role: "radiogroup", "aria-labelledby": idNhan }, ...nut);
}

function ve(): void {
  const r = duLieu!;
  let lyDo: string | null = null;
  const oTu = h("input", { id: "bb-tu", class: "o", type: "datetime-local", value: phutNay(), "aria-describedby": "bb-loi" }) as HTMLInputElement;
  const oDen = h("input", { id: "bb-den", class: "o", type: "datetime-local", value: motGioSau(), "aria-describedby": "bb-loi" }) as HTMLInputElement;
  const loi = h("div", { id: "bb-loi", class: "truong-loi", role: "alert", hidden: true });
  // Hai bản của cùng một nút: thanh nút cuối trang (vùng nội dung từ 560) và cuối khối biểu mẫu (hẹp hơn 560). Trạng thái khoá luôn đặt cho cả hai.
  const luu = h("button", { type: "button", class: "nut day-phai", "data-cap": "chinh", disabled: true, "data-action": "luu-khung" }, "Lưu khung bận");
  const luuHep = h("button", { type: "button", class: "nut", "data-cap": "chinh", disabled: true, "data-action": "luu-khung" }, "Lưu khung bận");
  const haiNut = [luu, luuHep];
  const chon = chonDoan("bb-ly-do", r.lyDo.map((x) => ({ code: x.code, nhan: x.label })), (code) => {
    lyDo = code;
    for (const b of haiNut) b.disabled = false;
  });
  const ghi = async (): Promise<void> => {
    const batDau = tuODatetime(oTu.value);
    const ketThuc = tuODatetime(oDen.value);
    if (!batDau || !ketThuc || !lyDo) {
      replaceChildren(loi, icon("alert", 16, 2), "Chọn giờ bắt đầu, giờ kết thúc và lý do.");
      loi.hidden = false;
      return;
    }
    for (const b of haiNut) b.disabled = true;
    try {
      duLieu = await api<KhungBanCuaToiResponse>(GOC, { method: "POST", body: { batDau, ketThuc, lyDo } });
      baoCao = dai("ok", "Đã lưu khung bận", [`${nhanKhoangGio(vnLocalToMs(batDau.ngay, batDau.gio)!, vnLocalToMs(ketThuc.ngay, ketThuc.gio)!)}. Văn phòng sẽ không xếp chuyến cho bạn trong giờ này.`]);
    } catch (e) {
      baoCao = loiGhi(e);
    }
    ve();
  };
  for (const b of haiNut) b.addEventListener("click", () => void ghi());
  replaceChildren(
    formEl,
    h("header", { class: "khoi-dau" }, h("h2", { id: "bb-form-title" }, "Ghi khung bận")),
    h("p", { class: "khoi-mo-ta" }, "Văn phòng chỉ thấy là bạn bận, không thấy lý do. Một khung dài tối đa 14 ngày."),
    luoi(null, truong("Bắt đầu", oTu, { cot: 6 }), truong("Kết thúc", oDen, { cot: 6 }), truong("Lý do", chon, { idNhan: "bb-ly-do", loi })),
    thanhNut({ "data-chi": "hep" }, luuHep),
  );
  replaceChildren(nutEl, luu);

  const ds = r.khung.map((k) => {
    const dong = h("div", { class: "dong", "data-khung": k.id }, h("div", { class: "dong-chu" }, h("strong", null, nhanKhoangGio(k.batDauMs, k.ketThucMs)), h("span", { class: "o-phu" }, k.lyDo)));
    if (dangHoiRut === k.id) {
      const co = h("button", { type: "button", class: "nut", "data-cap": "nguy-hiem", "data-action": "rut-xac-nhan" }, "Rút khung bận");
      const khong = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "rut-thoi" }, "Không rút");
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
      dong.append(dai("warning", "Rút khung này?", ["Văn phòng sẽ xếp chuyến được cho bạn trong giờ này."], undefined, [thanhNut(null, co, khong)]));
    } else {
      const rut = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "rut-khung" }, "Rút khung bận");
      rut.addEventListener("click", () => {
        dangHoiRut = k.id;
        ve();
      });
      dong.append(rut);
    }
    return dong;
  });
  replaceChildren(
    dsEl,
    h("header", { class: "khoi-dau" }, h("h2", { id: "bb-ds-title" }, "Khung bận đang có")),
    ds.length ? dsDong(null, ...ds) : h("p", { class: "rong" }, "Chưa có khung bận nào."),
  );
  replaceChildren(baoEl, baoCao);
  formEl.hidden = false;
  nutEl.hidden = false;
  dsEl.hidden = false;
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
