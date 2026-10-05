// BẢNG TIN (ADR-0022, Task 8) — phần LOGIC THUẦN của bộ lắng nghe ở trình duyệt: không đụng `window`/`document`/`WebSocket`/`setTimeout` thật
// (mọi thứ ngoài đời đi qua `Phu` do web/bangtin.ts tiêm vào) nên `node --test` chạy được (src/bang-tin-web.test.ts). Import kèm đuôi `.ts` vì
// Node chạy trực tiếp tệp này; esbuild/tsc của web/ chấp nhận (allowImportingTsExtensions). Chỉ import src/shared/, không import src/modules/.
import { choNoiLai, laSuKienChuyenHopLe, laSuKienHopLe, thongBaoNoi, type SuKienChuyen, type SuKienDon, type ThongBaoNoi } from "../src/shared/bang-tin.ts";
import type { PermissionHolder } from "../src/shared/permissions.ts";

/** Trong khoảng này sau khi CHÍNH tab này ghi một đơn thì tin về đơn đó không hiện thông báo nổi (TD-4). */
export const HAN_TU_LAM_MS = 5000;
/** Gộp các tin đến liên tiếp thành MỘT lần làm mới (TD-1). */
export const GOP_MS = 1000;
/** Ping mỗi 50 giây; không thấy pong trong 10 giây thì coi kết nối đã chết (TD-2). */
export const PING_MS = 50_000;
export const PONG_HAN_MS = 10_000;
/** Hiện lại ứng dụng: gõ cửa kiểm kết nối, không thấy pong trong khoảng này thì coi đã chết và nối lại (ngắn hơn PONG_HAN_MS vì người đang chờ nhìn màn hình). */
export const KIEM_NHANH_MS = 3000;
/** Ẩn từ khoảng này trở lên thì khi hiện lại coi dữ liệu là cũ: nối lại + tải lại NGAY, không cần kiểm (đi lâu — đổi tab/khoá máy hàng phút). */
export const AN_LAU_MS = 120_000;
/**
 * Hoãn quyết định hiện thông báo nổi. Máy chủ phát tin SONG SONG với việc dựng phản hồi HTTP (khung WebSocket có thể tới trình duyệt trước HOẶC sau phản hồi) nên khung có thể tới trước khi
 * `api()` kịp parse phản hồi và ghi dấu "tab này vừa làm" — kiểm dấu LÚC HIỆN (sau khoảng này) chứ không lúc nhận khung; hoãn này đúng cho cả hai thứ tự. Chỉ hoãn thông báo
 * nổi; `don-thay-doi` (làm mới trang) KHÔNG bị hoãn.
 */
export const TRE_THONG_BAO_MS = 500;

/** Sổ "đơn nào tab này vừa ghi" — trong bộ nhớ của trang, KHÔNG lưu localStorage. `now` tiêm vào để test tất định. */
export function taoSoTuLam(now: () => number = Date.now): { ghiNho(orderId: string): void; vuaLam(orderId: string): boolean } {
  const so = new Map<string, number>();
  return {
    ghiNho(orderId) {
      const t = now();
      for (const [id, luc] of so) if (t - luc > HAN_TU_LAM_MS) so.delete(id); // dọn mục quá hạn để sổ không phình
      so.set(orderId, t);
    },
    vuaLam(orderId) {
      const luc = so.get(orderId);
      return luc !== undefined && now() - luc <= HAN_TU_LAM_MS;
    },
  };
}

/** Yêu cầu ghi của `api()` có liên quan tới đơn nào (để ghi vào sổ tự làm)? Chỉ nhận id lấy được từ ĐƯỜNG DẪN `/api/orders/<id>…`; còn `POST /api/orders` (đơn mới, id chưa có) thì `null` — nơi gọi lấy `order.id` từ phản hồi. */
export function donTuDuongDan(method: string, path: string): string | null {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) return null;
  const m = /^\/api\/orders\/([^/?#]+)/.exec(path);
  if (!m) return null;
  // Bộ ghi dấu KHÔNG BAO GIỜ được làm một lần ghi thành công thành lỗi: chuỗi % hỏng (URIError) thì dùng nguyên văn (id thật là UUID, không cần giải mã).
  try {
    return decodeURIComponent(m[1]!);
  } catch {
    return m[1]!;
  }
}

/** `POST /api/orders` (tạo đơn) — id nằm trong phản hồi `{ order: { id } }`. */
export function laTaoDonMoi(method: string, path: string): boolean {
  return method.toUpperCase() === "POST" && /^\/api\/orders\/?(\?.*)?$/.test(path);
}

/**
 * Bộ hiện thông báo nổi: `thongBaoNoi` quyết ai/loại nào (TD-4) ngay khi tin tới; nếu có thì HẸN `TRE_THONG_BAO_MS` rồi mới kiểm
 * `vuaLamBoiTabNay(orderId)` — còn dấu (chính tab này vừa ghi đơn đó, kể cả dấu ghi trễ hơn khung tin) thì không hiện. Loại không nổi/tài khoản
 * không được nhận thì không hẹn giờ gì cả.
 */
export function taoBoThongBao(
  staff: PermissionHolder,
  vuaLamBoiTabNay: (orderId: string) => boolean,
  hien: (tb: ThongBaoNoi) => void,
  hen: (fn: () => void, ms: number) => unknown,
): (suKien: SuKienDon) => void {
  return (suKien) => {
    const tb = thongBaoNoi(staff, suKien);
    if (!tb) return;
    hen(() => {
      if (!vuaLamBoiTabNay(suKien.orderId)) hien(tb);
    }, TRE_THONG_BAO_MS);
  };
}

/** Gộp: tin đầu tiên của một đợt bắt đầu đếm `GOP_MS`; hết hạn thì phát CẢ đợt một lần. Ngưng (`huy`) thì bỏ đợt đang chờ. */
export function taoBoGop<T = SuKienDon>(phat: (ds: T[]) => void, hen: (fn: () => void, ms: number) => unknown, huyHen: (id: unknown) => void) {
  let dem: T[] = [];
  let timer: unknown = null;
  return {
    them(e: T): void {
      dem.push(e);
      if (timer !== null) return;
      timer = hen(() => {
        timer = null;
        const ds = dem;
        dem = [];
        phat(ds);
      }, GOP_MS);
    },
    huy(): void {
      if (timer !== null) huyHen(timer);
      timer = null;
      dem = [];
    },
  };
}

/** Phần của WebSocket mà bộ điều khiển dùng (để test bằng socket giả). */
export interface OSocket {
  onopen: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(s: string): void;
  close(): void;
}

export interface Phu {
  moSocket(): OSocket;
  hen(fn: () => void, ms: number): unknown;
  huyHen(id: unknown): void;
  ngauNhien(): number;
  /** Mỗi tin hợp lệ (ngay khi đến — dùng để quyết thông báo nổi). */
  khiSuKien(e: SuKienDon): void;
  /** Một đợt tin đã gộp trong `GOP_MS` (phát `don-thay-doi`). */
  khiDot(ds: SuKienDon[]): void;
  /** Một đợt sự kiện CHUYẾN đã gộp (phát `chuyen-thay-doi`) — ADR-0052 D6.4; không thông báo nổi (tự chốt T4 kế hoạch Đợt 2). */
  khiDotChuyen(ds: SuKienChuyen[]): void;
  /** Nối lại thành công (phát `can-tai-lai`). */
  khiCanTaiLai(): void;
  /** Đồng hồ (mili-giây) để đo thời gian ẩn; vắng thì dùng `Date.now`. Tiêm để bài kiểm tất định. */
  bayGio?(): number;
}

/**
 * Bộ điều khiển kết nối (TD-1/TD-2), MỘT socket mỗi trang. Mọi hàm gọi lại của socket cũ đều bị bỏ qua (`ws !== mine`) nên đóng chủ động
 * (trang hiện lại, mạng có lại, ping chết) không sinh lịch nối lại thừa. `can-tai-lai` phát ở MỌI lần mở thành công trừ lần mở đầu tiên của
 * trang khi chưa có lần hỏng nào — kể cả lần mở đầu tiên đến sau khi lần thử đầu đã hỏng, vì trong lúc chờ trang có thể đã lỡ tin.
 */
export function taoBoDieuKhien(phu: Phu) {
  const gop = taoBoGop(phu.khiDot, phu.hen, phu.huyHen);
  const gopChuyen = taoBoGop<SuKienChuyen>(phu.khiDotChuyen, phu.hen, phu.huyHen);
  let ws: OSocket | null = null;
  let dung = false; // đã ngưng (pagehide): không nối lại
  let lan = 0; // số lần hỏng liên tiếp chưa mở được
  let daHong = false; // đã có ít nhất một lần đóng/lỗi/chết → lần mở kế tiếp là NỐI LẠI
  let daMoTungLan = false;
  let henNoi: unknown = null;
  let henPing: unknown = null;
  let henPong: unknown = null;
  let henKiem: unknown = null; // đang chờ pong của lần gõ cửa kiểm khi hiện lại ứng dụng
  let lucAn: number | null = null;

  const xoaHen = (id: unknown) => {
    if (id !== null) phu.huyHen(id);
  };
  const dungPing = () => {
    xoaHen(henPing);
    xoaHen(henPong);
    xoaHen(henKiem);
    henPing = null;
    henPong = null;
    henKiem = null;
  };
  const boSocket = () => {
    // Gỡ TRƯỚC khi đóng để hàm gọi lại `onclose` của socket cũ không còn được tính.
    const cu = ws;
    ws = null;
    dungPing();
    if (cu) {
      try {
        cu.close();
      } catch {
        // đã đóng
      }
    }
  };
  const henNoiLai = () => {
    if (dung || henNoi !== null) return;
    const cho = choNoiLai(lan, phu.ngauNhien());
    lan++;
    henNoi = phu.hen(() => {
      henNoi = null;
      noi();
    }, cho);
  };
  const matKetNoi = (mine: OSocket) => {
    if (ws !== mine) return;
    daHong = true;
    boSocket();
    henNoiLai();
  };
  const lenLichPing = () => {
    henPing = phu.hen(() => {
      henPing = null;
      const mine = ws;
      if (!mine) return;
      try {
        mine.send("ping");
      } catch {
        noiNgay();
        return;
      }
      henPong = phu.hen(() => {
        henPong = null;
        noiNgay(); // không thấy pong: coi như chết
      }, PONG_HAN_MS);
      lenLichPing();
    }, PING_MS);
  };
  function noi(): void {
    if (dung) return;
    xoaHen(henNoi);
    henNoi = null;
    let mine: OSocket;
    try {
      mine = phu.moSocket();
    } catch {
      daHong = true;
      henNoiLai();
      return;
    }
    ws = mine;
    mine.onopen = () => {
      if (ws !== mine) return;
      lan = 0;
      if (daMoTungLan || daHong) phu.khiCanTaiLai();
      daMoTungLan = true;
      dungPing();
      lenLichPing();
    };
    mine.onmessage = (ev) => {
      if (ws !== mine) return;
      if (ev.data === "pong") {
        xoaHen(henPong);
        henPong = null;
        xoaHen(henKiem); // còn sống: huỷ hẹn kiểm khi hiện lại — không đóng-mở lại cái khoẻ
        henKiem = null;
        return;
      }
      if (typeof ev.data !== "string") return;
      let x: unknown;
      try {
        x = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (laSuKienHopLe(x)) {
        phu.khiSuKien(x);
        gop.them(x);
      } else if (laSuKienChuyenHopLe(x)) gopChuyen.them(x); // ADR-0052 D6.4: chỉ làm mới màn hình
    };
    mine.onclose = () => matKetNoi(mine);
    mine.onerror = () => matKetNoi(mine);
  }
  /** Đóng socket hiện tại (bỏ qua `onclose` của nó) và nối lại NGAY — trang hiện lại, có mạng lại, ping chết. */
  function noiNgay(): void {
    if (dung) return;
    daHong = true;
    xoaHen(henNoi);
    henNoi = null;
    boSocket();
    lan = 0;
    noi();
  }
  const bayGio = () => (phu.bayGio ? phu.bayGio() : Date.now());
  return {
    batDau: noi,
    noiNgay,
    /** Trang bị ẩn (đổi tab, khoá máy, sang ứng dụng khác): ghi mốc để biết đã đi bao lâu. */
    anDi(): void {
      if (lucAn === null) lucAn = bayGio();
    },
    /**
     * Trang hiện lại. TRƯỚC: luôn `noiNgay()` — đóng cả kết nối còn khoẻ rồi `can-tai-lai` làm mọi trang tải lại toàn bộ dữ liệu. NAY: đi lâu (≥ AN_LAU_MS)
     * hoặc chưa có kết nối sống ⇒ nối lại + tải lại như cũ; còn lại chỉ GÕ CỬA (ping): có pong trong KIEM_NHANH_MS thì giữ nguyên (không đã lỡ tin nào —
     * tin tới qua kết nối đang mở), không pong hoặc `send` ném lỗi thì nối lại + tải lại.
     */
    hienLai(): void {
      const di = lucAn === null ? 0 : bayGio() - lucAn;
      lucAn = null;
      if (dung) return;
      const mine = ws;
      if (di >= AN_LAU_MS || !mine || henNoi !== null) {
        noiNgay();
        return;
      }
      if (henKiem !== null) return; // đang chờ pong của lần kiểm trước
      try {
        mine.send("ping");
      } catch {
        noiNgay();
        return;
      }
      henKiem = phu.hen(() => {
        henKiem = null;
        if (ws === mine) noiNgay(); // không pong: coi như chết
      }, KIEM_NHANH_MS);
    },
    /** `pagehide`: đóng sạch, không nối lại (cho tới `tiepTuc`). */
    dung(): void {
      dung = true;
      xoaHen(henNoi);
      henNoi = null;
      gop.huy();
      gopChuyen.huy();
      boSocket();
    },
    /** Trang được khôi phục từ bộ nhớ đệm chuyển trang (`pageshow` persisted): kết nối đã bị `dung()` đóng, mở lại. */
    tiepTuc(): void {
      if (!dung) return;
      dung = false;
      noiNgay();
    },
  };
}

/** Tối đa bao nhiêu thông báo nổi cùng lúc (TD-4). Danh sách theo thứ tự cũ → mới; trả phần còn lại và phần bị đẩy ra (cũ nhất trước). */
export const TOI_DA_THONG_BAO = 3;
export function ganThongBao<T>(hienCo: readonly T[], moi: T): { con: T[]; bo: T[] } {
  const tat = [...hienCo, moi];
  const bo = tat.slice(0, Math.max(0, tat.length - TOI_DA_THONG_BAO));
  return { con: tat.slice(bo.length), bo };
}
