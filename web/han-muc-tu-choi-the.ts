// Thẻ «Hạn mức Từ chối của hướng dẫn viên» trên trang Chính sách điều phối (ADR-0032 điều 8 — giả định bề mặt; kế hoạch 2026-10-23 mục 6a).
// Bảng số lần: ai có `admin.manage` (Quản trị, Toàn quyền — trang này chỉ mở cho hai nhóm đó). Ô cài đặt + nút «Đặt lại»: chỉ `settings.ops` (Toàn quyền).
// Ẩn/hiện hỏi bảng quyền (`can`); máy chủ kiểm lại mọi lệnh. Không lộ mã thô (OFF/MEASURE/BLOCK, mã lý do): nhãn từ src/shared.
// Khuôn Thiết lập của khung gốc (ADR-0222, đợt D3): `el` là một `.khoi` (public/chinh-sach-dieu-phoi.html) — đầu khối có tên và nút «Đặt lại tất cả», câu đang áp
// dụng là mô tả khối, biểu mẫu cài đặt (ô trên lưới, nút «Lưu cài đặt» cuối biểu mẫu), rồi danh sách dòng theo người với nút «Đặt lại» cuối dòng.
import type { StaffProfile } from "../src/shared/contracts";
import { CHE_DO, GIAI_THICH_CHE_DO, NHAN_CHE_DO, docCaiDat, type CheDo } from "../src/shared/han-muc-tu-choi";
import { LY_DO_TU_CHOI } from "../src/shared/ly-do-tu-choi";
import { can } from "../src/shared/permissions";
import { vnDateTimeText } from "../src/shared/vn-date";
import { ApiError, api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import { loiCua } from "./giay-to-ui";
import { cap, dsDong, luoi, thanhNut, truong } from "./khung";
import { showError } from "./shell";

const BASE = "/api/dispatch/han-muc-tu-choi";
const nhanLyDo = (ma: string): string => LY_DO_TU_CHOI.find((l) => l.ma === ma)?.nhan ?? "Khác";
/** Đầu khối (khuôn `khoi()` của web/khung.ts; khối là phần tử có sẵn trong HTML nên dựng phần đầu tại đây). */
const dauKhoi = (): HTMLElement => h("header", { class: "khoi-dau" }, h("h2", { id: "hm-ten" }, "Hạn mức Từ chối của hướng dẫn viên"));

/** Dựng (và dựng lại sau mỗi lệnh) thẻ vào `el`. Không có `admin.manage` → ẩn thẻ, không gọi API. */
export async function veTheHanMuc(el: HTMLElement, staff: StaffProfile): Promise<void> {
  if (!can(staff, "admin.manage")) {
    el.hidden = true;
    return;
  }
  const loi = h("div", { class: "alert", role: "alert", hidden: true });
  const ok = h("div", { class: "alert ok", role: "status", hidden: true });
  let du: Api.HanMucTuChoiResponse;
  try {
    du = await api<Api.HanMucTuChoiResponse>(BASE);
  } catch (err) {
    replaceChildren(el, dauKhoi(), loi);
    showError(loi, loiCua(err));
    el.hidden = false;
    return;
  }
  // `cuon`: chỉ biểu mẫu cài đặt dùng — nút «Lưu cài đặt» ở cuối biểu mẫu còn câu báo ở đầu thẻ, ở điện thoại hai chỗ không cùng một màn nên phải đưa câu báo
  // vào tầm nhìn. «Đặt lại» từng dòng thì không cuộn: người dùng đang đứng ở dòng đó.
  const taiLai = async (cau: string | null, laLoi = false, cuon = false): Promise<void> => {
    await veTheHanMuc(el, staff);
    if (!cau) return;
    const box = el.querySelector<HTMLElement>(laLoi ? ".alert:not(.ok)" : ".alert.ok");
    if (!box) return;
    showError(box, cau);
    if (cuon) box.scrollIntoView({ block: "nearest" });
  };
  const doiDuoc = du.doiDuoc && can(staff, "settings.ops");

  const cs = du.caiDat;
  const tomTat = h(
    "p",
    { class: "khoi-mo-ta" },
    cs ? `Đang áp dụng: ${NHAN_CHE_DO[cs.cheDo]} · tối đa ${cs.lienTiep} đơn liên tiếp · ${cs.moiTuan} lần mỗi tuần (thứ Hai – Chủ nhật).` : "Chưa có cài đặt — báo Toàn quyền.",
  );

  const dong = du.nguoi.map((n) => {
    const nutDatLai = doiDuoc ? h("button", { type: "button", class: "nut", "data-cap": "phu", "data-dat-lai": n.partyId }, "Đặt lại") : null;
    nutDatLai?.addEventListener("click", () => void datLai({ partyId: n.partyId }, nutDatLai, `Đặt lại số lần Từ chối của ${n.ten}?`));
    return h(
      "div",
      { class: "dong", "data-party": n.partyId },
      h(
        "div",
        { class: "dong-chu" },
        h("strong", null, n.ten),
        n.biGioiHan ? null : h("span", { class: "o-phu" }, "không áp hạn mức"),
        cap("Từ chối tuần này", String(n.tuChoiTuan), { kieu: "so" }),
        cap("Huỷ tuần này", String(n.huyTuan), { kieu: "so" }),
        cap("Liên tiếp hiện tại", String(n.chuoi), { kieu: "so" }),
        cap("Lần Từ chối gần nhất", n.tuChoiCuoi ? `${vnDateTimeText(n.tuChoiCuoi.luc)} — ${nhanLyDo(n.tuChoiCuoi.lyDo)}` : "Chưa có", { kieu: "so" }),
      ),
      nutDatLai,
    );
  });
  const danhSach = dong.length > 0 ? dsDong(null, ...dong) : h("p", { class: "khoi-mo-ta" }, "Chưa có hướng dẫn viên nào đang hoạt động.");

  async function datLai(than: { partyId: string } | { tatCa: true }, nut: HTMLElement, cauHoi: string): Promise<void> {
    const huy = h("button", { type: "button", class: "nut", "data-co": "lon" }, "Không");
    const dongY = h("button", { type: "button", class: "nut", "data-co": "lon", "data-cap": "chinh", "data-action": "xac-nhan-dat-lai" }, "Đặt lại");
    const bang = moBangTruot({ title: cauHoi, body: [h("p", null, "Chuỗi liên tiếp và số lần trong tuần của người đó tính lại từ 0. Lịch sử vẫn giữ nguyên.")], foot: [huy, dongY], footClass: "vc-foot-2", opener: nut });
    if (!bang) return;
    huy.addEventListener("click", () => bang.close());
    dongY.addEventListener("click", async () => {
      bang.setBusy(true);
      try {
        const r = await api<Api.HanMucDatLaiResponse>(`${BASE}/dat-lai`, { method: "POST", body: than });
        bang.close(false);
        await taiLai(`Đã đặt lại cho ${r.soNguoi} người.`);
      } catch (err) {
        bang.close(false);
        await taiLai(loiCua(err), true);
      }
    });
  }

  const phan: (HTMLElement | null)[] = [dauKhoi(), null, tomTat, loi, ok];

  if (doiDuoc) {
    let cheDo: CheDo = cs?.cheDo ?? "MEASURE";
    const radios = CHE_DO.map((m) => {
      const input = h("input", { type: "radio", name: "hm-che-do", value: m, checked: m === cheDo });
      input.addEventListener("change", () => (cheDo = m));
      return h(
        "label",
        { class: "pick" },
        input,
        h("span", { class: "pick-mark", "aria-hidden": "true" }),
        h("span", { class: "pick-name" }, NHAN_CHE_DO[m], h("span", { class: "hm-phu hm-giai-thich" }, GIAI_THICH_CHE_DO[m])),
      );
    });
    const oLienTiep = h("input", { id: "hm-lien-tiep", class: "o", type: "text", inputmode: "numeric", autocomplete: "off", value: String(cs?.lienTiep ?? 2) });
    const oTuan = h("input", { id: "hm-moi-tuan", class: "o", type: "text", inputmode: "numeric", autocomplete: "off", value: String(cs?.moiTuan ?? 15) });
    const loiO = h("div", { class: "truong-loi", role: "alert", hidden: true });
    const luu = h("button", { type: "submit", class: "nut", "data-cap": "chinh" }, "Lưu cài đặt");
    const form = h(
      "form",
      { class: "luoi", novalidate: true, autocomplete: "off" },
      h("fieldset", { class: "pick-list" }, h("legend", { class: "pick-legend" }, "Chế độ"), ...radios),
      truong("Số đơn liên tiếp tối đa", oLienTiep, { cot: 6, goiY: "Từ 1 đến 10. Đơn kế tiếp bị chặn." }),
      truong("Số lần mỗi tuần tối đa", oTuan, { cot: 6, goiY: "Từ 1 đến 100, tuần từ thứ Hai." }),
      loiO,
      thanhNut(null, luu),
    );
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const so = (v: string): number | string => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : v);
      const r = docCaiDat({ cheDo, lienTiep: so(oLienTiep.value), moiTuan: so(oTuan.value) });
      showError(loiO, r.ok ? null : r.loi);
      if (!r.ok) return;
      luu.disabled = true;
      try {
        await api<Api.HanMucCaiDatResponse>(`${BASE}/chinh-sach`, { method: "POST", body: r.cs });
        await taiLai("Đã lưu cài đặt hạn mức — có hiệu lực từ bây giờ.", false, true);
      } catch (err) {
        luu.disabled = false;
        if (err instanceof ApiError && err.code === "stale") await taiLai(`${err.message}`, true, true);
        else showError(loiO, loiCua(err));
      }
    });
    const tatCa = h("button", { type: "button", class: "nut", "data-cap": "phu", "data-action": "dat-lai-tat-ca" }, "Đặt lại tất cả");
    tatCa.addEventListener("click", () => void datLai({ tatCa: true }, tatCa, `Đặt lại số lần Từ chối của ${du.nguoi.length} hướng dẫn viên?`));
    phan[1] = h("div", { class: "khoi-viec" }, tatCa); // nút của khối: khối rộng thì ở đầu khối bên phải, hẹp thì xuống cuối khối (khung gốc)
    phan.push(form);
  }
  phan.push(danhSach);
  replaceChildren(el, ...phan);
  el.hidden = false;
}
