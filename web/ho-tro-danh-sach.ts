// Danh sách bên trái của trang Hỗ trợ (PR 3): thẻ «Yêu cầu của tôi» và «Việc của nhóm» (lọc, tìm, đếm, nhận việc, tải thêm).
// Dựng khung một lần (ô tìm không bị dựng lại khi gõ), chỉ thay phần động. Mỗi lần tải tăng `doi`: phản hồi của đời cũ bị bỏ (đổi bộ lọc rồi «Tải thêm»
// không lặp dòng); thêm nữa là dòng gộp theo `id`. Chỉ ẩn/hiện; máy chủ luôn kiểm quyền.
import { FEEDBACK_STATUS_NAME, SAC_TRANG_THAI, type FeedbackStatus } from "../src/shared/feedback-catalog";
import { thoiGianTuongDoi } from "../src/shared/thoi-gian-tuong-doi";
import type { LocHangDoi } from "../src/shared/ve-ho-tro";
import { cauTuanNay, chuaAiNhan, demTuanNay, duongHangDoi, hienNhanViec, huyHieuUuTien } from "../src/shared/ve-ho-tro-hien-thi";
import { api, type Api } from "./api";
import { h, replaceChildren } from "./dom";

export interface TuyChonDanhSach {
  the: "mine" | "queue";
  nhom: { id: string; name: string }[];
  moYeuCau: (id: string) => void;
  staffId: string;
  /** Yêu cầu đang mở ở cột luồng (tô đậm dòng tương ứng). */
  dangMo?: string | null;
  /** Nút «Nhận việc» dùng chung với khối đầu luồng. */
  nutNhanViec: (t: Api.FeedbackTicketDto, nhan: string, after: () => void) => HTMLButtonElement;
  baoLoi: (err: unknown) => void;
  /** Nhóm chọn sẵn (nhóm của mình trước). */
  nhomMacDinh?: string;
}

const TRANG = 50;
const NHAN_LOC: Record<LocHangDoi, string> = { UNASSIGNED: "Chưa ai nhận", MINE: "Tôi đang xử lý", ALL: "Tất cả" };
const THU_TU_LOC: LocHangDoi[] = ["UNASSIGNED", "MINE", "ALL"];
const TRANG_THAI: { key: string; nhan: string; ds: FeedbackStatus[] }[] = [
  { key: "mo", nhan: "Đang mở", ds: ["NEW", "ACK", "IN_PROGRESS"] },
  { key: "xong", nhan: "Đã xong", ds: ["DONE"] },
  { key: "tu-choi", nhan: "Từ chối", ds: ["DECLINED"] },
  { key: "tat-ca", nhan: "Tất cả", ds: [] },
];

// Bộ lọc giữ qua các lần dựng lại (đổi thẻ, nạp lại danh sách khi luồng đổi).
let loc: LocHangDoi = "UNASSIGNED"; // bản vẽ ho-tro-ban-2: «Việc của nhóm» mở ra ở «Chưa ai nhận»
let khoaTrangThai = "mo";
let tim = "";
let nhomChon = "";

export function veDanhSach(goc: HTMLElement, o: TuyChonDanhSach): { napLai(): void } {
  const oHangDoi = o.the === "queue";
  if (!o.nhom.some((x) => x.id === nhomChon)) nhomChon = o.nhom.find((x) => x.id === o.nhomMacDinh)?.id ?? o.nhom[0]?.id ?? "";

  let doi = 0;
  let offset = 0;
  let dong: Api.FeedbackTicketDto[] = [];
  let conNua = false;
  let dem: { chuaAiNhan: number; cuaToi: number; tatCa: number } | null = null;
  let chan = "";

  const lanLoc = h("div", { class: "ht-loc-nut", role: "group", "aria-label": "Lọc theo người nhận" });
  const chonNhom = h("select", { id: "ht-loc-nhom", "aria-label": "Nhóm" }, ...o.nhom.map((x) => h("option", { value: x.id, selected: x.id === nhomChon }, x.name)));
  chonNhom.addEventListener("change", () => {
    nhomChon = chonNhom.value;
    void tai(false);
  });
  const chonTrangThai = h("select", { id: "ht-loc-trang-thai", "aria-label": "Trạng thái" }, ...TRANG_THAI.map((t) => h("option", { value: t.key, selected: t.key === khoaTrangThai }, t.nhan)));
  chonTrangThai.addEventListener("change", () => {
    khoaTrangThai = chonTrangThai.value;
    void tai(false);
  });
  const oTim = h("input", { id: "ht-tim", type: "search", placeholder: "Tìm mã, tiêu đề, người gửi…", "aria-label": "Tìm yêu cầu", value: tim, maxLength: 80 });
  let henTim: ReturnType<typeof setTimeout> | undefined;
  oTim.addEventListener("input", () => {
    clearTimeout(henTim);
    henTim = setTimeout(() => {
      tim = oTim.value;
      void tai(false);
    }, 300);
  });
  const khungLoc = h("div", { class: "ht-loc" },
    o.nhom.length > 1 ? h("label", { class: "ht-loc-o" }, "Nhóm", chonNhom) : o.nhom[0] ? h("p", { class: "ht-ten-nhom" }, o.nhom[0].name) : null,
    lanLoc,
    h("label", { class: "ht-loc-o" }, "Trạng thái", chonTrangThai),
    oTim);
  const khungDs = h("div", { class: "ht-ds", id: "ht-ds" });
  const chanDs = h("div", { class: "ht-chan" });
  replaceChildren(goc, oHangDoi ? khungLoc : null, khungDs, chanDs);

  function veLoc(): void {
    const dangLay = lanLoc.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.loc : undefined; // giữ tiêu điểm khi vẽ lại
    replaceChildren(
      lanLoc,
      ...THU_TU_LOC.map((k) => {
        const n = dem ? (k === "UNASSIGNED" ? dem.chuaAiNhan : k === "MINE" ? dem.cuaToi : dem.tatCa) : null;
        const b = h("button", { type: "button", class: loc === k ? "btn btn-primary" : "btn", "data-loc": k, "aria-pressed": String(loc === k) }, NHAN_LOC[k], n === null ? null : h("span", { class: "ht-so" }, String(n)));
        b.addEventListener("click", () => {
          loc = k;
          void tai(false);
        });
        return b;
      }),
    );
    if (dangLay) lanLoc.querySelector<HTMLElement>(`[data-loc="${dangLay}"]`)?.focus();
  }

  function dongYeuCau(t: Api.FeedbackTicketDto): HTMLElement {
    const now = new Date();
    const uuTien = huyHieuUuTien(t.priority);
    const lienKet = h("a", { class: "ht-dong-noi", href: `/feedback?id=${encodeURIComponent(t.id)}` },
      h("span", { class: `ht-tieu-de${t.unread ? " is-chua-doc" : ""}` },
        t.unread && h("span", { class: "ht-cham", role: "img", "aria-label": "Có tin mới" }),
        t.title,
        uuTien && h("span", { class: `badge fb-uu-tien is-${uuTien.sac}`, "data-uu-tien": t.priority }, uuTien.chu)),
      h("span", { class: "ht-phu muted" }, (oHangDoi ? [t.code, t.submitterName, t.orderCode] : [t.code, t.kindName, t.teamName]).filter(Boolean).join(" · ")),
      h("span", { class: "ht-phu" },
        h("span", { class: `badge fb-badge is-${SAC_TRANG_THAI[t.status]}` }, t.statusName || FEEDBACK_STATUS_NAME[t.status]),
        oHangDoi && (chuaAiNhan(t) ? h("span", { class: "badge badge-draft" }, "Chưa ai nhận") : h("span", { class: "muted" }, `${t.assigneeName ?? "?"}${t.assigneeId === o.staffId ? " (tôi)" : ""}`))),
      t.mailPending && h("span", { class: "ht-phu muted" }, "Chưa gửi được email báo nhóm"));
    lienKet.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // mở tab mới vẫn dùng được
      e.preventDefault();
      o.moYeuCau(t.id);
    });
    return h("div", { class: `ht-dong${o.dangMo === t.id ? " is-dang-mo" : ""}`, "data-ticket": t.id },
      lienKet,
      h("div", { class: "ht-dong-phai" },
        h("span", { class: "ht-gio muted" }, thoiGianTuongDoi(t.lastActivityAt, now)),
        oHangDoi && hienNhanViec(t, o.staffId) && o.nutNhanViec(t, "Nhận việc", () => void tai(false, true))));
  }

  function ve(): void {
    veLoc();
    const trong = o.the === "mine" ? "Bạn chưa gửi yêu cầu nào." : tim.trim() ? "Không có yêu cầu nào khớp." : "Chưa có yêu cầu nào.";
    replaceChildren(khungDs, ...(dong.length ? dong.map(dongYeuCau) : [h("p", { class: "muted ht-trong" }, oHangDoi && !nhomChon ? "Chưa có nhóm nào." : trong)]));
    const tiep = h("button", { type: "button", class: "btn", id: "ht-tai-them" }, "Tải thêm");
    tiep.addEventListener("click", () => void tai(true));
    replaceChildren(chanDs, chan ? h("p", { class: "muted ht-tuan" }, chan) : null, conNua ? tiep : null);
  }

  /**
   * Nạp danh sách. `them`: nối thêm trang kế. `giu`: làm mới nhưng GIỮ số dòng đã tải (R36 — sau thao tác ở luồng, danh sách không rơi về 50 dòng đầu);
   * máy chủ trần 100 dòng mỗi lần nên nạp từng trang 50 cho tới khi đủ số dòng đang có. Dòng gộp theo `id`, không lặp.
   */
  async function tai(them: boolean, giu = false): Promise<void> {
    const lanNay = ++doi;
    if (oHangDoi && !nhomChon) {
      dong = [];
      conNua = false;
      ve();
      return;
    }
    const muc = giu ? Math.max(TRANG, dong.length) : TRANG;
    const tu = them ? offset : 0;
    try {
      const theoId = new Map<string, Api.FeedbackTicketDto>();
      for (const t of them ? dong : []) theoId.set(t.id, t);
      let con = false;
      let da = 0;
      let dauTien = true;
      do {
        const phan = `limit=${TRANG}&offset=${tu + da}`;
        let tickets: Api.FeedbackTicketDto[];
        if (oHangDoi) {
          const ds = TRANG_THAI.find((t) => t.key === khoaTrangThai)?.ds ?? [];
          const r = await api<Api.FeedbackQueueResponse>(`${duongHangDoi(nhomChon, loc, ds, tim)}&${phan}`);
          if (lanNay !== doi) return;
          tickets = r.tickets;
          if (dauTien) {
            if (r.dem) dem = r.dem;
            chan = cauTuanNay(demTuanNay(r.stats, new Date()));
          }
        } else {
          const r = await api<Api.FeedbackListResponse>(`/api/feedback/mine?${phan}`);
          if (lanNay !== doi) return;
          tickets = r.tickets;
        }
        dauTien = false;
        for (const t of tickets) theoId.set(t.id, t);
        da += tickets.length;
        con = tickets.length >= TRANG;
      } while (con && da < muc);
      dong = [...theoId.values()];
      offset = tu + da;
      conNua = con;
      ve();
    } catch (err) {
      if (lanNay === doi) o.baoLoi(err);
    }
  }

  veLoc();
  void tai(false);
  return { napLai: () => void tai(false, true) };
}
