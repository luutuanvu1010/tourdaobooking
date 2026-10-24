// Thẻ «Hạn mức Từ chối của hướng dẫn viên» trên trang Chính sách điều phối (ADR-0032 điều 8 — giả định bề mặt; kế hoạch 2026-10-23 mục 6a).
// Bảng số lần: ai có `admin.manage` (Quản trị, Toàn quyền — trang này chỉ mở cho hai nhóm đó). Ô cài đặt + nút «Đặt lại»: chỉ `settings.ops` (Toàn quyền).
// Ẩn/hiện hỏi bảng quyền (`can`); máy chủ kiểm lại mọi lệnh. Không lộ mã thô (OFF/MEASURE/BLOCK, mã lý do): nhãn từ src/shared.
import type { StaffProfile } from "../src/shared/contracts";
import { CHE_DO, GIAI_THICH_CHE_DO, NHAN_CHE_DO, docCaiDat, type CheDo } from "../src/shared/han-muc-tu-choi";
import { LY_DO_TU_CHOI } from "../src/shared/ly-do-tu-choi";
import { can } from "../src/shared/permissions";
import { vnDateTimeText } from "../src/shared/vn-date";
import { ApiError, api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren } from "./dom";
import { loiCua } from "./giay-to-ui";
import { showError } from "./shell";

const BASE = "/api/dispatch/han-muc-tu-choi";
const nhanLyDo = (ma: string): string => LY_DO_TU_CHOI.find((l) => l.ma === ma)?.nhan ?? "Khác";

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
    replaceChildren(el, h("h2", { class: "hm-title" }, "Hạn mức Từ chối của hướng dẫn viên"), loi);
    showError(loi, loiCua(err));
    el.hidden = false;
    return;
  }
  const taiLai = async (cau: string | null, laLoi = false): Promise<void> => {
    await veTheHanMuc(el, staff);
    if (!cau) return;
    const box = el.querySelector<HTMLElement>(laLoi ? ".alert:not(.ok)" : ".alert.ok");
    if (box) showError(box, cau);
  };
  const doiDuoc = du.doiDuoc && can(staff, "settings.ops");

  const cs = du.caiDat;
  const tomTat = h(
    "p",
    { class: "hm-tom-tat" },
    cs ? `Đang áp: ${NHAN_CHE_DO[cs.cheDo]} · tối đa ${cs.lienTiep} đơn liên tiếp · ${cs.moiTuan} lần mỗi tuần (thứ Hai – Chủ nhật).` : "Chưa có cài đặt — báo Toàn quyền.",
  );

  const dong = du.nguoi.map((n) => {
    const nutDatLai = doiDuoc ? h("button", { type: "button", class: "btn hm-nut", "data-dat-lai": n.partyId }, "Đặt lại") : null;
    nutDatLai?.addEventListener("click", () => void datLai({ partyId: n.partyId }, nutDatLai, `Đặt lại số lần Từ chối của ${n.ten}?`));
    return h(
      "li",
      { class: "hm-row", "data-party": n.partyId },
      h("div", { class: "hm-ten" }, h("strong", null, n.ten), n.biGioiHan ? null : h("span", { class: "hm-phu" }, "không áp hạn mức")),
      h("div", { class: "hm-so" }, h("span", { class: "hm-nhan" }, "Từ chối tuần này"), h("span", { class: "hm-gia-tri" }, String(n.tuChoiTuan))),
      h("div", { class: "hm-so" }, h("span", { class: "hm-nhan" }, "Huỷ tuần này"), h("span", { class: "hm-gia-tri" }, String(n.huyTuan))),
      h("div", { class: "hm-so" }, h("span", { class: "hm-nhan" }, "Liên tiếp hiện tại"), h("span", { class: "hm-gia-tri" }, String(n.chuoi))),
      h(
        "div",
        { class: "hm-so hm-cuoi" },
        h("span", { class: "hm-nhan" }, "Lần Từ chối gần nhất"),
        h("span", { class: "hm-gia-tri" }, n.tuChoiCuoi ? `${vnDateTimeText(n.tuChoiCuoi.luc)} — ${nhanLyDo(n.tuChoiCuoi.lyDo)}` : "Chưa có"),
      ),
      nutDatLai ? h("div", { class: "hm-hanh-dong" }, nutDatLai) : null,
    );
  });
  const danhSach = dong.length > 0 ? h("ul", { class: "hm-list" }, ...dong) : h("p", { class: "hm-phu" }, "Chưa có hướng dẫn viên nào đang hoạt động.");

  async function datLai(than: { partyId: string } | { tatCa: true }, nut: HTMLElement, cauHoi: string): Promise<void> {
    const huy = h("button", { type: "button", class: "btn" }, "Không");
    const dongY = h("button", { type: "button", class: "btn btn-primary", "data-action": "xac-nhan-dat-lai" }, "Đặt lại");
    const bang = moBangTruot({ title: cauHoi, body: [h("p", null, "Chuỗi liên tiếp và số lần trong tuần của người đó tính lại từ 0. Lịch sử vẫn giữ nguyên.")], foot: [huy, dongY], opener: nut });
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

  const phan: (HTMLElement | null)[] = [h("h2", { class: "hm-title" }, "Hạn mức Từ chối của hướng dẫn viên"), tomTat, loi, ok];

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
    const oLienTiep = h("input", { id: "hm-lien-tiep", class: "vc-input", type: "text", inputmode: "numeric", autocomplete: "off", value: String(cs?.lienTiep ?? 2) });
    const oTuan = h("input", { id: "hm-moi-tuan", class: "vc-input", type: "text", inputmode: "numeric", autocomplete: "off", value: String(cs?.moiTuan ?? 15) });
    const loiO = h("div", { class: "vc-field-error", role: "alert", hidden: true });
    const luu = h("button", { type: "submit", class: "vc-btn btn btn-primary" }, "Lưu cài đặt");
    const form = h(
      "form",
      { class: "hm-form", novalidate: true, autocomplete: "off" },
      h("fieldset", { class: "pick-list" }, h("legend", { class: "pick-legend" }, "Chế độ"), ...radios),
      h(
        "div",
        { class: "hm-o-so" },
        h("div", { class: "vc-field" }, h("label", { for: "hm-lien-tiep" }, "Số đơn liên tiếp tối đa"), oLienTiep, h("div", { class: "vc-hint" }, "Từ 1 đến 10. Đơn kế tiếp bị chặn.")),
        h("div", { class: "vc-field" }, h("label", { for: "hm-moi-tuan" }, "Số lần mỗi tuần tối đa"), oTuan, h("div", { class: "vc-hint" }, "Từ 1 đến 100, tuần từ thứ Hai.")),
      ),
      loiO,
      h("div", { class: "dp-cs-actions" }, luu),
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
        await taiLai("Đã lưu cài đặt hạn mức — có hiệu lực từ bây giờ.");
      } catch (err) {
        luu.disabled = false;
        if (err instanceof ApiError && err.code === "stale") await taiLai(`${err.message}`, true);
        else showError(loiO, loiCua(err));
      }
    });
    const tatCa = h("button", { type: "button", class: "btn", "data-action": "dat-lai-tat-ca" }, "Đặt lại tất cả");
    tatCa.addEventListener("click", () => void datLai({ tatCa: true }, tatCa, `Đặt lại số lần Từ chối của ${du.nguoi.length} hướng dẫn viên?`));
    phan.push(form, h("div", { class: "hm-tat-ca" }, tatCa));
  }
  phan.push(danhSach);
  replaceChildren(el, ...phan);
  el.hidden = false;
}
