// <ib-icon ten="home" co="20" lop="..."> — vẽ biểu tượng từ HINH của bộ thiết kế (chép đúng path của web/icons.ts).
// Chỉ thêm một hình MỚI: alertCircle (tông Đỏ, mục 8). Nét = --bt-net, màu currentColor. Vẽ trong shadow root để khung không đụng vào.
(function () {
  if (customElements.get('ib-icon')) return;
  var NS = 'http://www.w3.org/2000/svg';
  var MOI = { alertCircle: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 8v4.5M12 16v.01' }]] };
  var cho = new Set();
  function hinh(ten) {
    var g = window.IslandBookingSystemDesignSystemV2_449f87;
    return MOI[ten] || (g && g.HINH && g.HINH[ten]) || null;
  }
  class IbIcon extends HTMLElement {
    static get observedAttributes() { return ['ten', 'co', 'lop']; }
    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
      this.ve();
    }
    attributeChangedCallback() { if (this.shadowRoot) this.ve(); }
    ve() {
      var co = this.getAttribute('co') || '20';
      var lop = ('ib-bt ' + (this.getAttribute('lop') || '')).trim();
      if (this.getAttribute('class') !== lop) this.setAttribute('class', lop);
      this.style.display = 'inline-flex';
      this.style.flex = 'none';
      this.style.lineHeight = '0';
      this.style.width = co + 'px';
      this.style.height = co + 'px';
      var ten = this.getAttribute('ten');
      var h = hinh(ten);
      if (!h) { if (ten) cho.add(this); return; }
      var svg = document.createElementNS(NS, 'svg');
      var a = { width: co, height: co, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', style: 'display:block;stroke-width:var(--bt-net,2)' };
      for (var k in a) svg.setAttribute(k, a[k]);
      h.forEach(function (s) {
        var el = document.createElementNS(NS, s[0]);
        for (var k2 in s[1]) el.setAttribute(k2, s[1][k2]);
        svg.appendChild(el);
      });
      this.shadowRoot.replaceChildren(svg);
    }
  }
  customElements.define('ib-icon', IbIcon);
  (function doi() {
    var g = window.IslandBookingSystemDesignSystemV2_449f87;
    if (g && g.HINH && cho.size) { cho.forEach(function (e) { e.ve(); }); cho.clear(); }
    setTimeout(doi, g && g.HINH ? 1000 : 50);
  })();
})();
