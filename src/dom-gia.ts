// DOM giả tối thiểu cho bài node (không phải bài kiểm): đủ cho h(), icon(), replaceChildren() của web/dom.ts và web/icons.ts.
// Dùng: gọi dungDomGia() TRƯỚC khi import() động tệp web/ cần DOM.
type Ham = (ev?: unknown) => void;

const kebab = (s: string): string => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

export class NutGia {
  children: NutGia[] = [];
  attributes = new Map<string, string>();
  parent: NutGia | null = null;
  hidden = false;
  tabIndex = -1;
  private cacNghe = new Map<string, Ham[]>();
  private chu = "";
  dataset: Record<string, string>;
  classList = {
    add: (...c: string[]) => this.datLop([...this.lop(), ...c]),
    remove: (...c: string[]) => this.datLop(this.lop().filter((x) => !c.includes(x))),
    toggle: (c: string, ep?: boolean) => {
      const co = this.lop().includes(c);
      const them = ep ?? !co;
      if (them && !co) this.classList.add(c);
      if (!them && co) this.classList.remove(c);
      return them;
    },
    contains: (c: string) => this.lop().includes(c),
  };

  tag: string;
  laChu: boolean;

  constructor(tag: string, laChu = false) {
    this.tag = tag;
    this.laChu = laChu;
    // dataset phản chiếu thuộc tính data-* (camelCase ↔ kebab-case) như trình duyệt.
    this.dataset = new Proxy({} as Record<string, string>, {
      get: (_t, k) => (typeof k === "string" ? this.attributes.get("data-" + kebab(k)) : undefined),
      set: (_t, k, v) => {
        this.attributes.set("data-" + kebab(String(k)), String(v));
        return true;
      },
      deleteProperty: (_t, k) => {
        this.attributes.delete("data-" + kebab(String(k)));
        return true;
      },
      has: (_t, k) => this.attributes.has("data-" + kebab(String(k))),
    });
  }

  private lop(): string[] {
    return (this.attributes.get("class") ?? "").split(/\s+/).filter(Boolean);
  }
  private datLop(l: string[]): void {
    this.attributes.set("class", l.join(" "));
  }
  get isConnected(): boolean {
    return this.tag === "body" || (!!this.parent && this.parent.isConnected);
  }
  get className(): string {
    return this.attributes.get("class") ?? "";
  }
  set className(v: string) {
    this.attributes.set("class", v);
  }
  get textContent(): string {
    return this.laChu ? this.chu : this.children.map((c) => c.textContent).join("");
  }
  set textContent(v: string) {
    if (this.laChu) this.chu = v;
    else {
      this.children = [];
      if (v) this.append(new NutGia("#text", true).datChu(v));
    }
  }
  datChu(v: string): this {
    this.chu = v;
    return this;
  }
  append(...c: Array<NutGia | string>): void {
    for (const x of c) {
      const n = typeof x === "string" ? new NutGia("#text", true).datChu(x) : x;
      n.parent = this;
      this.children.push(n);
    }
  }
  replaceChildren(...c: Array<NutGia | string>): void {
    this.children = [];
    this.append(...c);
  }
  setAttribute(k: string, v: string): void {
    this.attributes.set(k, String(v));
  }
  getAttribute(k: string): string | null {
    return this.attributes.get(k) ?? null;
  }
  removeAttribute(k: string): void {
    this.attributes.delete(k);
  }
  hasAttribute(k: string): boolean {
    return this.attributes.has(k);
  }
  focus(): void {
    NutGia.dangFocus = this;
  }
  static dangFocus: NutGia | null = null;
  addEventListener(ten: string, f: Ham): void {
    this.cacNghe.set(ten, [...(this.cacNghe.get(ten) ?? []), f]);
  }
  dispatchEvent(ev: { type: string }): boolean {
    for (const f of this.cacNghe.get(ev.type) ?? []) f(ev);
    return true;
  }
  /** Bấm giả: gọi các hàm nghe "click". */
  click(): void {
    this.dispatchEvent({ type: "click" });
  }
  private khop(sel: string): boolean {
    if (sel.startsWith("#")) return this.attributes.get("id") === sel.slice(1);
    if (sel.startsWith(".")) return this.lop().includes(sel.slice(1));
    const m = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(sel);
    if (m) return m[2] === undefined ? this.attributes.has(m[1]!) : this.attributes.get(m[1]!) === m[2];
    return !this.laChu && this.tag.toLowerCase() === sel.toLowerCase();
  }
  querySelectorAll(sel: string): NutGia[] {
    const ra: NutGia[] = [];
    for (const c of this.children) {
      if (c.khop(sel)) ra.push(c);
      ra.push(...c.querySelectorAll(sel));
    }
    return ra;
  }
  querySelector(sel: string): NutGia | null {
    return this.querySelectorAll(sel)[0] ?? null;
  }
  remove(): void {
    if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
  }
}

export function dungDomGia(): void {
  const g = globalThis as Record<string, unknown>;
  const body = new NutGia("body");
  const main = new NutGia("main");
  body.append(main);
  g.Node = NutGia;
  g.document = {
    createElement: (t: string) => new NutGia(t),
    createElementNS: (_ns: string, t: string) => new NutGia(t),
    createTextNode: (s: string) => new NutGia("#text", true).datChu(s),
    body,
    querySelector: (s: string) => (s === "body" ? body : body.querySelector(s)),
    querySelectorAll: (s: string) => body.querySelectorAll(s),
    getElementById: (id: string) => body.querySelector("#" + id),
  };
  const nghe = new Map<string, Ham[]>();
  g.window = {
    addEventListener: (t: string, f: Ham) => nghe.set(t, [...(nghe.get(t) ?? []), f]),
    dispatchEvent: (ev: { type: string }) => {
      for (const f of nghe.get(ev.type) ?? []) f(ev);
      return true;
    },
    requestAnimationFrame: (f: Ham) => {
      f();
      return 0;
    },
  };
  const kho = new Map<string, string>();
  g.sessionStorage = { getItem: (k: string) => kho.get(k) ?? null, setItem: (k: string, v: string) => void kho.set(k, v), removeItem: (k: string) => void kho.delete(k) };
}
