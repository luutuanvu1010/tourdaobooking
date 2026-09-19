/* @ds-bundle: {"format":4,"namespace":"TourODesignSystem_8db7ce","components":[{"name":"BookingCTA","sourcePath":"components/action/BookingCTA.jsx"},{"name":"ContactCTA","sourcePath":"components/action/ContactCTA.jsx"},{"name":"ContactChannels","sourcePath":"components/action/ContactChannels.jsx"},{"name":"PriceDisplay","sourcePath":"components/action/PriceDisplay.jsx"},{"name":"Breadcrumb","sourcePath":"components/chrome/Breadcrumb.jsx"},{"name":"DEFAULT_FOOTER_COLUMNS","sourcePath":"components/chrome/Footer.jsx"},{"name":"Footer","sourcePath":"components/chrome/Footer.jsx"},{"name":"FooterBadges","sourcePath":"components/chrome/FooterBadges.jsx"},{"name":"DEFAULT_NAV","sourcePath":"components/chrome/Header.jsx"},{"name":"Header","sourcePath":"components/chrome/Header.jsx"},{"name":"SiteLogo","sourcePath":"components/chrome/SiteLogo.jsx"},{"name":"AuthorityMeta","sourcePath":"components/content/AuthorityMeta.jsx"},{"name":"Body","sourcePath":"components/content/Body.jsx"},{"name":"Card","sourcePath":"components/content/Card.jsx"},{"name":"FAQ","sourcePath":"components/content/FAQ.jsx"},{"name":"FactStrip","sourcePath":"components/content/FactStrip.jsx"},{"name":"Gallery","sourcePath":"components/content/Gallery.jsx"},{"name":"InfoCard","sourcePath":"components/content/InfoCard.jsx"},{"name":"NearbySection","sourcePath":"components/content/NearbySection.jsx"},{"name":"SkeletonCard","sourcePath":"components/content/SkeletonCard.jsx"},{"name":"DEFAULT_EMPTY_LINKS","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"HomeHero","sourcePath":"components/home/HomeHero.jsx"},{"name":"DEFAULT_HUBS","sourcePath":"components/home/HomeHubGrid.jsx"},{"name":"HomeHubGrid","sourcePath":"components/home/HomeHubGrid.jsx"},{"name":"HomeStatsBand","sourcePath":"components/home/HomeStatsBand.jsx"},{"name":"HomeTourGrid","sourcePath":"components/home/HomeTourGrid.jsx"},{"name":"DEFAULT_TRUST_ITEMS","sourcePath":"components/home/HomeTrustBar.jsx"},{"name":"HomeTrustBar","sourcePath":"components/home/HomeTrustBar.jsx"},{"name":"DetailLayout","sourcePath":"components/layout/DetailLayout.jsx"},{"name":"Hero","sourcePath":"components/layout/Hero.jsx"},{"name":"Section","sourcePath":"components/layout/Section.jsx"},{"name":"Sidebar","sourcePath":"components/layout/Sidebar.jsx"},{"name":"WaveDivider","sourcePath":"components/layout/WaveDivider.jsx"},{"name":"EntityIndex","sourcePath":"components/listing/EntityIndex.jsx"},{"name":"MapView","sourcePath":"components/map/MapView.jsx"},{"name":"RouteMap","sourcePath":"components/map/RouteMap.jsx"},{"name":"ArticleDetail","sourcePath":"components/templates/ArticleDetail.jsx"},{"name":"AttractionDetail","sourcePath":"components/templates/AttractionDetail.jsx"},{"name":"TourDetail","sourcePath":"components/templates/TourDetail.jsx"}],"sourceHashes":{"components/action/BookingCTA.jsx":"67c93f58e704","components/action/ContactCTA.jsx":"f903f5b91887","components/action/ContactChannels.jsx":"dc0aacb9962e","components/action/PriceDisplay.jsx":"9c6b007180b2","components/chrome/Breadcrumb.jsx":"f463256317c7","components/chrome/Footer.jsx":"d29a004fd05f","components/chrome/FooterBadges.jsx":"ba996da55d91","components/chrome/Header.jsx":"639a4dfa0d6b","components/chrome/SiteLogo.jsx":"c0d36caff50b","components/content/AuthorityMeta.jsx":"28f8f03806df","components/content/Body.jsx":"a7f1b3dc0699","components/content/Card.jsx":"ee74484869e3","components/content/FAQ.jsx":"118b4e497701","components/content/FactStrip.jsx":"09dd4cbff8ca","components/content/Gallery.jsx":"b9a6d87bb0e5","components/content/InfoCard.jsx":"6db6c1f24796","components/content/NearbySection.jsx":"053531770012","components/content/SkeletonCard.jsx":"f9ec2998b6c4","components/feedback/EmptyState.jsx":"a3fc658f8755","components/home/HomeHero.jsx":"c04a1dbc49cd","components/home/HomeHubGrid.jsx":"70673d76bb04","components/home/HomeStatsBand.jsx":"a73ffb7efb7f","components/home/HomeTourGrid.jsx":"aafb9f9eea7e","components/home/HomeTrustBar.jsx":"ebc7e916d5aa","components/layout/DetailLayout.jsx":"c0e45e2d7d5d","components/layout/Hero.jsx":"08ef142b2caa","components/layout/Section.jsx":"ca652801ed20","components/layout/Sidebar.jsx":"3c1659d2c43e","components/layout/WaveDivider.jsx":"b8b6d053227f","components/listing/EntityIndex.jsx":"85830ac1b9ed","components/map/MapView.jsx":"6905480c673b","components/map/RouteMap.jsx":"4ef988985aed","components/templates/ArticleDetail.jsx":"09fed54dea5f","components/templates/AttractionDetail.jsx":"6cdc85d06d2c","components/templates/TourDetail.jsx":"c344a24c4a1a","ui_kits/website/App.jsx":"4bdb6849743c","ui_kits/website/data.js":"fa9639d2c2f7"},"inlinedExternals":[],"unexposedExports":[{"name":"slugify","sourcePath":"components/layout/Section.jsx"}]} */

(() => {

const __ds_ns = (window.TourODesignSystem_8db7ce = window.TourODesignSystem_8db7ce || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/action/BookingCTA.jsx
try { (() => {
const css = `
.booking-cta{background:var(--c-accent-soft);border:1px solid var(--c-accent);border-radius:var(--radius-md);padding:var(--s5);display:flex;flex-direction:column;gap:var(--s4)}
.booking-price{display:flex;flex-direction:column;gap:var(--s2)}
.booking-price-value{font-family:var(--font-display);font-size:var(--fs-h4);font-weight:var(--fw-700);color:var(--c-accent-strong)}
.booking-asof{font-family:var(--font-ui);font-size:var(--fs-sm);color:var(--c-text-muted)}
.booking-btn{display:inline-flex;align-items:center;justify-content:center;background:var(--c-accent);color:var(--c-text-inverse);font-family:var(--font-ui);font-size:var(--fs-base);font-weight:var(--fw-600);padding:var(--s3) var(--s5);border-radius:var(--radius-pill);text-decoration:none;transition:background var(--m-fast) var(--m-ease)}
.booking-btn:hover{background:var(--c-accent-strong)}
`;

/** Khối hành động trong sidebar: giá + nút đặt. Một trong hai nơi DUY NHẤT
 *  được phép hiện giá (nơi kia là thanh dính). */
function BookingCTA({
  priceText = '',
  ctaUrl = '',
  ctaLabel = 'Đặt vé qua Zalo',
  asOf = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "booking-cta"
  }, /*#__PURE__*/React.createElement("style", null, css), priceText && /*#__PURE__*/React.createElement("div", {
    className: "booking-price",
    "data-region": "action-block",
    "data-field": "gia"
  }, /*#__PURE__*/React.createElement("span", {
    className: "booking-price-value"
  }, priceText), asOf && /*#__PURE__*/React.createElement("span", {
    className: "booking-asof"
  }, asOf)), ctaUrl && /*#__PURE__*/React.createElement("a", {
    href: ctaUrl,
    className: "booking-btn btn-primary"
  }, ctaLabel));
}
Object.assign(__ds_scope, { BookingCTA });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/action/BookingCTA.jsx", error: String((e && e.message) || e) }); }

// components/action/ContactCTA.jsx
try { (() => {
const css = `
.contact-cta{display:inline-flex;align-items:center;gap:var(--s3);padding:var(--s3) var(--s5);border:2px solid var(--c-accent);border-radius:var(--radius-pill);background:var(--c-accent-soft);color:var(--c-text);font-family:var(--font-ui);font-weight:var(--fw-600);font-size:var(--fs-base);text-decoration:none;transition:background var(--m-fast) var(--m-ease),border-color var(--m-fast) var(--m-ease)}
.contact-cta:hover{background:var(--c-accent);color:var(--c-text-inverse)}
.contact-icon{font-size:var(--fs-h5)}
.contact-label{font-weight:var(--fw-700)}
.contact-number{font-weight:var(--fw-500);color:var(--c-text-muted)}
.contact-cta:hover .contact-number{color:var(--c-text-inverse)}
`;

/** Nút gọi điện — viền san hô 2px, đảo nền khi rê chuột. */
function ContactCTA({
  telephone,
  label = 'Gọi ngay'
}) {
  if (!telephone) return null;
  return /*#__PURE__*/React.createElement("a", {
    href: 'tel:' + telephone,
    className: "contact-cta"
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("span", {
    className: "contact-icon"
  }, "\uD83D\uDCDE"), /*#__PURE__*/React.createElement("span", {
    className: "contact-label"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "contact-number"
  }, telephone));
}
Object.assign(__ds_scope, { ContactCTA });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/action/ContactCTA.jsx", error: String((e && e.message) || e) }); }

// components/action/ContactChannels.jsx
try { (() => {
const css = `
.contact-channels{display:flex;flex-direction:column;gap:var(--s2)}
.contact-btn{display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-ui);font-size:var(--fs-base);font-weight:var(--fw-600);padding:var(--s3) var(--s5);border-radius:var(--radius-pill);text-decoration:none;border:1px solid var(--c-border);background:var(--c-card);color:var(--c-text);transition:background var(--m-fast) var(--m-ease),border-color var(--m-fast) var(--m-ease)}
.contact-btn:hover{background:var(--c-surface-alt);border-color:var(--c-primary)}
`;

/** Cụm kênh liên hệ xếp dọc: Zalo, gọi điện, WhatsApp. Kênh chưa nhập thì
 *  KHÔNG render nút chết. */
function ContactChannels({
  zaloUrl = '',
  hotline = '',
  whatsapp = '',
  labels = {}
}) {
  const l = {
    zalo: 'Chat Zalo',
    call: 'Gọi điện',
    whatsapp: 'WhatsApp',
    ...labels
  };
  const telHref = hotline ? 'tel:' + hotline.replace(/\s+/g, '') : '';
  const waHref = whatsapp ? 'https://wa.me/' + whatsapp.replace(/\s+/g, '') : '';
  if (!zaloUrl && !telHref && !waHref) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "contact-channels"
  }, /*#__PURE__*/React.createElement("style", null, css), zaloUrl && /*#__PURE__*/React.createElement("a", {
    href: zaloUrl,
    className: "contact-btn contact-zalo",
    target: "_blank",
    rel: "noopener"
  }, l.zalo), telHref && /*#__PURE__*/React.createElement("a", {
    href: telHref,
    className: "contact-btn contact-call"
  }, l.call), waHref && /*#__PURE__*/React.createElement("a", {
    href: waHref,
    className: "contact-btn contact-whatsapp",
    target: "_blank",
    rel: "noopener"
  }, l.whatsapp));
}
Object.assign(__ds_scope, { ContactChannels });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/action/ContactChannels.jsx", error: String((e && e.message) || e) }); }

// components/action/PriceDisplay.jsx
try { (() => {
const css = `
.price-area{background:var(--c-accent-soft);border-radius:var(--radius-md);padding:var(--s5);display:flex;align-items:center;justify-content:space-between;gap:var(--s4);flex-wrap:wrap}
.price-value{font-family:var(--font-display);font-size:var(--fs-h4);font-weight:var(--fw-700);color:var(--c-accent-strong)}
.price-free{font-size:var(--fs-h5);font-weight:var(--fw-600);color:var(--c-green-text);background:var(--c-green-soft);padding:var(--s2) var(--s4);border-radius:var(--radius-pill)}
.cta-btn{display:inline-flex;align-items:center;padding:var(--s3) var(--s5);background:var(--c-accent);color:var(--c-text-inverse);font-weight:var(--fw-600);font-size:var(--fs-base);border-radius:var(--radius-pill);white-space:nowrap;text-decoration:none;transition:background var(--m-fast) var(--m-ease)}
.cta-btn:hover{background:var(--c-accent-strong)}
@media (max-width:640px){.price-area{flex-direction:column;align-items:flex-start}}
`;

/** Dải giá trong thân nội dung: giá bên trái, nút mua bên phải.
 *  Miễn phí thì hiện viên xanh lá, KHÔNG hiện nút. */
function PriceDisplay({
  label = '',
  isFree = false,
  ctaLabel = 'Mua vé',
  ctaHref = '#'
}) {
  if (!label && !isFree) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "price-area"
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
    className: "price-info"
  }, isFree ? /*#__PURE__*/React.createElement("span", {
    className: "price-free"
  }, "Mi\u1EC5n ph\xED") : /*#__PURE__*/React.createElement("span", {
    className: "price-value"
  }, label)), !isFree && /*#__PURE__*/React.createElement("a", {
    href: ctaHref,
    className: "cta-btn"
  }, ctaLabel));
}
Object.assign(__ds_scope, { PriceDisplay });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/action/PriceDisplay.jsx", error: String((e && e.message) || e) }); }

// components/chrome/Breadcrumb.jsx
try { (() => {
const css = `
.breadcrumb{padding:var(--s4) 0}
.breadcrumb-list{display:flex;align-items:center;gap:var(--s2);list-style:none;font-size:var(--fs-sm);color:var(--c-text-muted);flex-wrap:wrap;margin:0;padding:0}
.breadcrumb-item{display:flex;align-items:center;gap:var(--s2)}
.breadcrumb-item + .breadcrumb-item::before{content:'/';color:var(--c-border);font-size:var(--fs-sm)}
.breadcrumb-item a{color:var(--c-text-muted);text-decoration:none;transition:color var(--m-fast) var(--m-ease)}
.breadcrumb-item a:hover{color:var(--c-primary)}
.breadcrumb-item [aria-current='page']{color:var(--c-primary);font-weight:var(--fw-600)}
.breadcrumb.inverse .breadcrumb-list{color:var(--c-text-inverse);opacity:.85}
.breadcrumb.inverse .breadcrumb-item + .breadcrumb-item::before{color:var(--c-text-inverse);opacity:.55}
.breadcrumb.inverse .breadcrumb-item a{color:var(--c-text-inverse);opacity:.85}
.breadcrumb.inverse .breadcrumb-item a:hover{opacity:1}
.breadcrumb.inverse .breadcrumb-item [aria-current='page']{color:var(--c-text-inverse);font-weight:var(--fw-600)}
`;

/** Đường dẫn phân cấp. `inverse` cho hero ảnh (chữ trắng). */
function Breadcrumb({
  crumbs = [],
  inverse = false
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: 'breadcrumb' + (inverse ? ' inverse' : ''),
    "aria-label": "\u0110\u01B0\u1EDDng d\u1EABn"
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("ol", {
    className: "breadcrumb-list"
  }, crumbs.map((c, i) => /*#__PURE__*/React.createElement("li", {
    className: "breadcrumb-item",
    key: i
  }, c.href ? /*#__PURE__*/React.createElement("a", {
    href: c.href
  }, c.label) : /*#__PURE__*/React.createElement("span", {
    "aria-current": i === crumbs.length - 1 ? 'page' : undefined
  }, c.label)))));
}
Object.assign(__ds_scope, { Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/chrome/FooterBadges.jsx
try { (() => {
const css = `
.foot-badges{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s5);padding-bottom:var(--s5)}
.badge-row{list-style:none;display:flex;flex-wrap:wrap;align-items:center;gap:var(--s4);margin:0;padding:0}
.badge-row img{display:block;max-height:40px;width:auto;opacity:.85;transition:opacity var(--m-fast) var(--m-ease)}
.badge-row a:hover img,.badge-row a:focus-visible img{opacity:1}
@media (max-width:480px){.foot-badges{gap:var(--s4)}.badge-row img{max-height:32px}}
`;
const KIND_ORDER = [{
  kind: 'chung-nhan',
  label: 'Chứng nhận, giấy phép'
}, {
  kind: 'thanh-toan',
  label: 'Hình thức thanh toán'
}, {
  kind: 'mang-xa-hoi',
  label: 'Mạng xã hội'
}];

/** Dải huy hiệu chân trang. Thứ tự NHÓM cố định ở code — logo thanh toán xen
 *  giữa hai giấy phép là một mớ ảnh rời. */
function FooterBadges({
  badges = []
}) {
  const items = badges.filter(b => b && b.src);
  const groups = KIND_ORDER.map(g => ({
    ...g,
    items: items.filter(b => b.kind === g.kind)
  })).filter(g => g.items.length > 0);
  if (groups.length === 0) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "foot-badges"
  }, /*#__PURE__*/React.createElement("style", null, css), groups.map(g => /*#__PURE__*/React.createElement("ul", {
    className: "badge-row",
    "aria-label": g.label,
    key: g.kind
  }, g.items.map((b, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, b.url ? /*#__PURE__*/React.createElement("a", {
    href: b.url,
    target: "_blank",
    rel: "noopener"
  }, /*#__PURE__*/React.createElement("img", {
    src: b.src,
    alt: b.alt || g.label
  })) : /*#__PURE__*/React.createElement("img", {
    src: b.src,
    alt: b.alt || ''
  }))))));
}
Object.assign(__ds_scope, { FooterBadges });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/FooterBadges.jsx", error: String((e && e.message) || e) }); }

// components/chrome/SiteLogo.jsx
try { (() => {
const css = `
.tdc-logo-mark{width:34px;height:34px;flex:none}
img.tdc-logo-mark{width:auto;height:34px;max-width:180px;object-fit:contain}
`;

/** Dấu hiệu thương hiệu — NGUỒN DUY NHẤT (06-BINDING_MAP §2).
 *  Có ảnh logo thì dùng ảnh; không thì khối SVG dự phòng (thuyền + sóng). */
function SiteLogo({
  src = '',
  name = 'Tour Đảo',
  hideWordmark = false
}) {
  const showWordmark = !(src && hideWordmark);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, css), src ? /*#__PURE__*/React.createElement("img", {
    className: "tdc-logo-mark",
    src: src,
    alt: ""
  }) : /*#__PURE__*/React.createElement("svg", {
    className: "tdc-logo-mark",
    viewBox: "0 0 40 40",
    fill: "none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "20",
    cy: "20",
    r: "19",
    fill: "var(--c-primary)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 26 L20 9 L20 26 Z",
    fill: "var(--c-sand)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 9 L26 26 L20 26 Z",
    fill: "var(--c-sand-soft)"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 30 Q 12 27 16 30 T 24 30 T 32 30",
    stroke: "var(--c-surface)",
    strokeWidth: "1.4",
    fill: "none",
    strokeLinecap: "round"
  })), showWordmark && /*#__PURE__*/React.createElement("span", null, name));
}
Object.assign(__ds_scope, { SiteLogo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/SiteLogo.jsx", error: String((e && e.message) || e) }); }

// components/chrome/Footer.jsx
try { (() => {
const css = `
.site-footer{background:var(--c-footer-bg);color:var(--c-footer-text);padding:var(--s7) 0 var(--s5);font-size:var(--fs-sm)}
.site-footer--image{position:relative;isolation:isolate}
.site-footer .foot-bg{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover}
.site-footer .foot-bg-veil{position:absolute;inset:0;z-index:-1;background:var(--c-footer-bg);opacity:.88}
.site-footer--image .container{position:relative}
.foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.2fr;gap:var(--s6);margin-bottom:var(--s6)}
.foot-brand .logo{display:flex;align-items:center;gap:var(--s3);font-family:var(--font-display);font-weight:var(--fw-800);font-size:var(--fs-nav);color:var(--c-text-inverse);margin-bottom:var(--s3);text-decoration:none}
.foot-brand p{font-size:var(--fs-sm);max-width:36ch;line-height:1.6;color:var(--c-footer-text)}
.foot-col h4{color:var(--c-text-inverse);font-size:var(--fs-label);letter-spacing:var(--ls-eyebrow);line-height:var(--lh-eyebrow);text-transform:uppercase;margin-bottom:var(--s3);font-family:var(--font-ui);font-weight:var(--fw-600)}
.foot-col ul{list-style:none;display:flex;flex-direction:column;gap:var(--s2);margin:0;padding:0}
.foot-col a{color:var(--c-footer-text);text-decoration:none;transition:color var(--m-fast) var(--m-ease)}
.foot-col a:hover{color:var(--c-sand)}
.foot-bottom{border-top:1px solid var(--c-footer-border);padding-top:var(--s4);display:flex;justify-content:space-between;align-items:center;gap:var(--s3);flex-wrap:wrap;font-size:var(--fs-badge);color:var(--c-footer-muted)}
@media (max-width:768px){.foot-grid{grid-template-columns:1fr 1fr;gap:var(--s5)}}
@media (max-width:480px){.foot-grid{grid-template-columns:1fr}}
`;
const DEFAULT_FOOTER_COLUMNS = [{
  heading: 'Khám phá',
  links: [{
    label: 'Điểm tham quan',
    href: '/diem-tham-quan/'
  }, {
    label: 'Trải nghiệm',
    href: '/trai-nghiem/'
  }, {
    label: 'Địa danh',
    href: '/dia-danh/'
  }]
}, {
  heading: 'Dịch vụ',
  links: [{
    label: 'Tour',
    href: '/tour/'
  }, {
    label: 'Đặt vé trực tuyến',
    href: '#'
  }]
}, {
  heading: 'Xem theo mục',
  links: [{
    label: 'Khách sạn',
    href: '/khach-san/'
  }, {
    label: 'Resort',
    href: '/resort/'
  }, {
    label: 'Đi lại',
    href: '/di-lai/'
  }, {
    label: 'Cẩm nang',
    href: '/cam-nang/'
  }]
}];

/** Chrome chân trang: cụm thương hiệu + tagline, các cột liên kết, dải huy hiệu,
 *  hàng pháp nhân. Ảnh nền (nếu có) nằm dưới lớp phủ màu chân trang đục 88% —
 *  con số này là lớp giữ tương phản AA, không phải hiệu ứng thẩm mỹ. */
function Footer({
  brandName = 'Tour Đảo',
  legalName = 'Công ty TNHH Tour Đảo',
  foundedYear = 2026,
  logoSrc = '',
  tagline = 'Tour đảo Nha Trang, xe đón tận khách sạn, hướng dẫn viên đi cùng suốt chuyến.',
  disclaimer = 'Giá và giờ khởi hành có thể thay đổi theo thời tiết và quy định của cảng.',
  columns = DEFAULT_FOOTER_COLUMNS,
  channels = [],
  badges = [],
  backgroundImage = ''
}) {
  const year = new Date().getFullYear();
  const copyrightYear = foundedYear < year ? foundedYear + '–' + year : String(year);
  return /*#__PURE__*/React.createElement("footer", {
    className: 'site-footer' + (backgroundImage ? ' site-footer--image' : '')
  }, /*#__PURE__*/React.createElement("style", null, css), backgroundImage && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("img", {
    className: "foot-bg",
    src: backgroundImage,
    alt: ""
  }), /*#__PURE__*/React.createElement("div", {
    className: "foot-bg-veil",
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "foot-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "foot-brand"
  }, /*#__PURE__*/React.createElement("a", {
    href: "/",
    className: "logo",
    "aria-label": "V\u1EC1 trang ch\u1EE7"
  }, /*#__PURE__*/React.createElement(__ds_scope.SiteLogo, {
    src: logoSrc,
    name: brandName
  })), /*#__PURE__*/React.createElement("p", null, tagline)), columns.map(col => /*#__PURE__*/React.createElement("div", {
    className: "foot-col",
    key: col.heading
  }, /*#__PURE__*/React.createElement("h4", null, col.heading), /*#__PURE__*/React.createElement("ul", null, col.links.map(l => /*#__PURE__*/React.createElement("li", {
    key: l.href + l.label
  }, /*#__PURE__*/React.createElement("a", {
    href: l.href
  }, l.label)))))), channels.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "foot-col"
  }, /*#__PURE__*/React.createElement("h4", null, "V\u1EC1 ch\xFAng t\xF4i"), /*#__PURE__*/React.createElement("ul", null, channels.map(c => /*#__PURE__*/React.createElement("li", {
    key: c.href
  }, /*#__PURE__*/React.createElement("a", {
    href: c.href,
    target: c.external ? '_blank' : undefined,
    rel: c.external ? 'noopener' : undefined
  }, c.label)))))), /*#__PURE__*/React.createElement(__ds_scope.FooterBadges, {
    badges: badges
  }), /*#__PURE__*/React.createElement("div", {
    className: "foot-bottom"
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 ", copyrightYear, " ", legalName), /*#__PURE__*/React.createElement("span", null, disclaimer))));
}
Object.assign(__ds_scope, { DEFAULT_FOOTER_COLUMNS, Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/Footer.jsx", error: String((e && e.message) || e) }); }

// components/chrome/Header.jsx
try { (() => {
const css = `
.site-header{position:sticky;top:0;z-index:100;background:var(--c-surface);border-bottom:1px solid var(--c-border)}
.site-header .header-inner{display:flex;align-items:center;gap:var(--s6);height:var(--header-h)}
.site-header .logo{display:flex;align-items:center;gap:var(--s3);font-family:var(--font-display);font-weight:var(--fw-800);font-size:var(--fs-nav);color:var(--c-primary-strong);letter-spacing:0;flex-shrink:0;text-decoration:none}
.nav-main{display:flex;align-items:center;gap:var(--s2);flex:1}
.nav-main a,.nav-toggle{display:inline-flex;align-items:center;gap:var(--s1);padding:var(--s3);border-radius:var(--radius-sm);font-family:inherit;font-size:var(--fs-sm);font-weight:var(--fw-600);color:var(--c-text-muted);background:none;border:none;cursor:pointer;text-decoration:none;transition:all var(--m-fast) var(--m-ease)}
.nav-main a:hover,.nav-toggle:hover,.nav-main a.active,.nav-toggle.active{color:var(--c-primary);background:var(--c-primary-soft)}
.nav-group{position:relative}
.nav-caret{transition:transform var(--m-fast) var(--m-ease)}
.nav-group[data-open='true'] .nav-caret{transform:rotate(180deg)}
.nav-submenu{display:none;position:absolute;top:calc(100% + var(--s2));left:0;min-width:232px;flex-direction:column;padding:var(--s2);background:var(--c-card);border:1px solid var(--c-border);border-radius:var(--radius-md);box-shadow:var(--shadow-raised);z-index:120}
.nav-group[data-open='true'] .nav-submenu{display:flex}
.nav-submenu a{white-space:nowrap}
.nav-actions{display:flex;align-items:center;gap:var(--s3)}
.lang-switch{display:flex;flex-wrap:wrap;justify-content:center;gap:var(--s1);font-size:var(--fs-sm);color:var(--c-text-muted);font-weight:var(--fw-500)}
.lang-sep{color:var(--c-border)}
.lang-switch .active{color:var(--c-primary);font-weight:var(--fw-700)}
.lang-switch a{color:var(--c-text-muted);font-weight:var(--fw-500);text-decoration:none}
.lang-switch a:hover{color:var(--c-primary)}
.lang-switch .disabled{color:var(--c-border);cursor:not-allowed}
.hamburger{display:none;width:44px;height:44px;border-radius:50%;align-items:center;justify-content:center;background:var(--c-primary-soft);color:var(--c-primary);border:none;cursor:pointer}
@media (max-width:1023px){
  .nav-main{display:none;flex-direction:column;position:absolute;top:var(--header-h);left:0;right:0;background:var(--c-surface);padding:var(--s4);border-bottom:1px solid var(--c-border);z-index:99;align-items:stretch}
  .site-header[data-menu='open'] .nav-main{display:flex}
  .lang-switch{display:none}
  .hamburger{display:inline-flex}
  .nav-group,.nav-submenu{display:block;position:static;min-width:0;padding:0;border:none;box-shadow:none;background:none}
  .nav-submenu a{padding-left:var(--s5)}
  .nav-toggle{display:none}
}
`;
const DEFAULT_NAV = [{
  label: 'Trang chủ',
  href: '/',
  kind: 'home',
  children: []
}, {
  label: 'Tour',
  href: '/tour/',
  children: []
}, {
  label: 'Khám phá',
  href: '/kham-pha/',
  children: [{
    label: 'Điểm tham quan',
    href: '/diem-tham-quan/'
  }, {
    label: 'Trải nghiệm',
    href: '/trai-nghiem/'
  }, {
    label: 'Địa danh',
    href: '/dia-danh/'
  }]
}, {
  label: 'Lưu trú',
  href: '/luu-tru/',
  children: [{
    label: 'Khách sạn',
    href: '/khach-san/'
  }, {
    label: 'Resort',
    href: '/resort/'
  }]
}, {
  label: 'Cẩm nang',
  href: '/cam-nang/',
  children: []
}, {
  label: 'Liên hệ',
  href: '/lien-he/',
  children: []
}];

/** Chrome đầu trang: logo, menu (nhóm thả xuống bấm bằng button, không hover),
 *  cụm chuyển ngôn ngữ, hamburger 44px ở ≤1023px. */
function Header({
  currentPath = '/',
  navItems = DEFAULT_NAV,
  languages = [],
  lang = 'vi',
  brandName = 'Tour Đảo',
  logoSrc = '',
  onNavigate
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [openGroup, setOpenGroup] = React.useState(null);
  const hit = i => i.href && (i.kind === 'home' ? currentPath === i.href : currentPath.startsWith(i.href));
  const isActive = item => hit(item) || (item.children || []).some(hit);
  const go = (e, href) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(href);
    }
    setMenuOpen(false);
  };
  return /*#__PURE__*/React.createElement("header", {
    className: "site-header",
    "data-menu": menuOpen ? 'open' : 'closed'
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
    className: "container header-inner"
  }, /*#__PURE__*/React.createElement("a", {
    href: "/",
    className: "logo",
    "aria-label": "V\u1EC1 trang ch\u1EE7",
    onClick: e => go(e, '/')
  }, /*#__PURE__*/React.createElement(__ds_scope.SiteLogo, {
    src: logoSrc,
    name: brandName
  })), /*#__PURE__*/React.createElement("nav", {
    className: "nav-main",
    "aria-label": "\u0110i\u1EC1u h\u01B0\u1EDBng ch\xEDnh"
  }, navItems.map(item => item.children && item.children.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "nav-group",
    key: item.label,
    "data-open": openGroup === item.label ? 'true' : 'false'
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: 'nav-link nav-toggle' + (isActive(item) ? ' active' : ''),
    "aria-expanded": openGroup === item.label,
    onClick: () => setOpenGroup(openGroup === item.label ? null : item.label)
  }, item.label, /*#__PURE__*/React.createElement("svg", {
    className: "nav-caret",
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "nav-submenu"
  }, item.children.map(c => /*#__PURE__*/React.createElement("a", {
    key: c.href,
    href: c.href,
    className: currentPath.startsWith(c.href) ? 'active' : '',
    onClick: e => go(e, c.href)
  }, c.label)))) : /*#__PURE__*/React.createElement("a", {
    key: item.label,
    href: item.href,
    className: 'nav-link' + (isActive(item) ? ' active' : ''),
    onClick: e => go(e, item.href)
  }, item.label))), /*#__PURE__*/React.createElement("div", {
    className: "nav-actions"
  }, languages.length > 1 && /*#__PURE__*/React.createElement("div", {
    className: "lang-switch",
    "aria-label": "Ch\u1ECDn ng\xF4n ng\u1EEF"
  }, languages.map((l, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: l.code
  }, i > 0 && /*#__PURE__*/React.createElement("span", {
    className: "lang-sep"
  }, "\xB7"), l.code === lang ? /*#__PURE__*/React.createElement("span", {
    className: "active",
    "aria-current": "true"
  }, l.label) : l.href ? /*#__PURE__*/React.createElement("a", {
    href: l.href,
    hrefLang: l.code
  }, l.label) : /*#__PURE__*/React.createElement("span", {
    className: "disabled",
    "aria-disabled": "true",
    title: "Ch\u01B0a c\xF3 b\u1EA3n d\u1ECBch"
  }, l.label)))), /*#__PURE__*/React.createElement("button", {
    className: "hamburger",
    "aria-label": menuOpen ? 'Đóng menu' : 'Mở menu',
    "aria-expanded": menuOpen,
    onClick: () => setMenuOpen(!menuOpen)
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("line", {
    x1: "4",
    y1: "6",
    x2: "20",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4",
    y1: "12",
    x2: "20",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4",
    y1: "18",
    x2: "20",
    y2: "18"
  }))))));
}
Object.assign(__ds_scope, { DEFAULT_NAV, Header });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chrome/Header.jsx", error: String((e && e.message) || e) }); }

// components/content/AuthorityMeta.jsx
try { (() => {
/** Vùng dữ liệu thẩm quyền — KHÔNG hiển thị gì (hidden + aria-hidden).
 *  Chỉ mang data-* cho máy đọc: người duyệt, nguồn gốc nội dung, URL nguồn. */
function AuthorityMeta({
  approvedBy = '',
  contentProvenance,
  officialSource = '',
  sameAs = [],
  author = {}
}) {
  const referenceUrl = officialSource || sameAs[0] || author.url || (author.sameAs || [])[0];
  return /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("section", {
    className: "authority-meta",
    hidden: true,
    "aria-hidden": "true",
    "data-authority-meta": true,
    "data-approved-by": approvedBy || undefined,
    "data-content-provenance": contentProvenance || undefined,
    "data-source-url": referenceUrl || undefined,
    "data-author-name": author.title || approvedBy || undefined
  }));
}
Object.assign(__ds_scope, { AuthorityMeta });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/AuthorityMeta.jsx", error: String((e && e.message) || e) }); }

// components/content/Body.jsx
try { (() => {
const css = `
.body-block{max-width:var(--measure,70ch);line-height:var(--lh-body);font-size:var(--fs-base)}
.body-block p{margin-bottom:var(--s4)}
.body-block h2,.body-block h3,.body-block h4{margin-top:var(--s6);margin-bottom:var(--s3);font-family:var(--font-display);font-weight:var(--fw-700);line-height:var(--lh-heading)}
.body-block figure{margin:var(--s5) 0}
.body-block figure img{max-width:100%;border-radius:var(--radius-md)}
`;

/** Nội dung dài (portable text đã đơn giản hoá). Bề rộng đọc 70ch —
 *  không cho chữ trải hết 1200px. */
function Body({
  blocks = [],
  className = ''
}) {
  if (!blocks || blocks.length === 0) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: 'body-block ' + className
  }, /*#__PURE__*/React.createElement("style", null, css), blocks.map((b, i) => {
    if (b.type === 'image') return /*#__PURE__*/React.createElement("figure", {
      key: i
    }, /*#__PURE__*/React.createElement("img", {
      src: b.src,
      alt: b.alt || ''
    }));
    if (b.style === 'h2') return /*#__PURE__*/React.createElement("h2", {
      key: i
    }, b.text);
    if (b.style === 'h3') return /*#__PURE__*/React.createElement("h3", {
      key: i
    }, b.text);
    if (b.style === 'h4') return /*#__PURE__*/React.createElement("h4", {
      key: i
    }, b.text);
    return /*#__PURE__*/React.createElement("p", {
      key: i
    }, b.text);
  }));
}
Object.assign(__ds_scope, { Body });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Body.jsx", error: String((e && e.message) || e) }); }

// components/content/Card.jsx
try { (() => {
const css = `
.card{position:relative;isolation:isolate;display:flex;flex-direction:column;background:var(--c-card);border:1px solid var(--c-border);border-radius:var(--radius-md);overflow:hidden;box-shadow:var(--shadow-card);transition:transform var(--m-fast) var(--m-ease),box-shadow var(--m-fast) var(--m-ease),border-color var(--m-fast) var(--m-ease);text-decoration:none;color:inherit}
.card::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(135deg,color-mix(in srgb,var(--c-primary-soft) 55%,transparent),transparent 42%),linear-gradient(0deg,color-mix(in srgb,var(--c-sand) 7%,transparent),transparent 34%);opacity:.55;z-index:0}
.card:hover{transform:translateY(var(--card-lift));box-shadow:var(--shadow-raised);border-color:var(--c-primary)}
.card-img-wrap{position:relative;z-index:1;aspect-ratio:4/3;overflow:hidden;background:linear-gradient(135deg,var(--c-primary-soft),var(--c-sand-soft))}
.card-img{width:100%;height:100%;object-fit:cover}
.card-img-placeholder{min-height:var(--s9);background:linear-gradient(135deg,var(--c-surface-alt),var(--c-primary-soft))}
.card-body{position:relative;z-index:1;padding:var(--s4);flex:1;display:flex;flex-direction:column}
.card-title{font-family:var(--font-display);font-weight:var(--fw-700);font-size:var(--fs-card-title);color:var(--c-text);margin-bottom:var(--s2);line-height:1.20;letter-spacing:-0.01em}
.card-summary{font-size:var(--fs-sm);color:var(--c-text-muted);line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:var(--s4)}
.card-meta{display:flex;align-items:center;gap:var(--s2);flex-wrap:wrap;margin-top:auto}
.card-badge{display:inline-flex;align-items:center;gap:var(--s1);padding:var(--s1) var(--s3);border-radius:var(--radius-pill);font-size:var(--fs-badge);font-weight:var(--fw-600);font-family:var(--font-ui)}
.badge-default{background:var(--c-primary-soft);color:var(--c-primary)}
.badge-author,.badge-free{background:var(--c-green-soft);color:var(--c-green-text)}
.badge-past{background:var(--c-surface-alt);color:var(--c-text-muted)}
.card-author{font-size:var(--fs-sm);color:var(--c-text-muted);font-weight:var(--fw-500)}
.card-price{display:inline-flex;align-items:center;padding:var(--s1) var(--s3);background:var(--c-accent-soft);color:var(--c-accent-strong);font-size:var(--fs-base);font-weight:var(--fw-800);border-radius:var(--radius-sm);margin-left:auto}
`;

/** Thẻ listing dùng chung mọi trang danh sách. Giá bật lên gần ngang tiêu đề
 *  thẻ — đây là trang bán tour. */
function Card({
  title,
  summary,
  href = '#',
  image = '',
  imageAlt = '',
  badge = '',
  badgeVariant = 'default',
  priceLabel = '',
  authorLabel = '',
  onClick
}) {
  const badgeClass = badgeVariant === 'author' ? 'badge-author' : badgeVariant === 'free' ? 'badge-free' : badgeVariant === 'past' ? 'badge-past' : 'badge-default';
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    className: "card",
    onClick: onClick
  }, /*#__PURE__*/React.createElement("style", null, css), image ? /*#__PURE__*/React.createElement("div", {
    className: "card-img-wrap"
  }, /*#__PURE__*/React.createElement("img", {
    className: "card-img",
    src: image,
    alt: imageAlt || title
  })) : /*#__PURE__*/React.createElement("div", {
    className: "card-img-wrap card-img-placeholder",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "card-title"
  }, title), /*#__PURE__*/React.createElement("p", {
    className: "card-summary"
  }, summary), /*#__PURE__*/React.createElement("div", {
    className: "card-meta"
  }, badge && /*#__PURE__*/React.createElement("span", {
    className: 'card-badge ' + badgeClass
  }, badge), authorLabel && /*#__PURE__*/React.createElement("span", {
    className: "card-author"
  }, authorLabel), priceLabel && /*#__PURE__*/React.createElement("span", {
    className: "card-price"
  }, priceLabel))));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Card.jsx", error: String((e && e.message) || e) }); }

// components/content/FAQ.jsx
try { (() => {
const css = `
.faq-section{padding:var(--s7) 0}
.faq-heading{font-family:var(--font-display);font-size:var(--fs-h3);font-weight:var(--fw-800);color:var(--c-text);line-height:var(--lh-heading);margin-bottom:var(--s5)}
.faq-list{display:flex;flex-direction:column}
.faq-item{border-bottom:1px solid var(--c-border)}
.faq-item:first-child{border-top:1px solid var(--c-border)}
.faq-question{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s4);padding:var(--s4) 0;font-weight:var(--fw-600);font-size:var(--fs-base);color:var(--c-text);cursor:pointer;list-style:none;transition:color var(--m-fast) var(--m-ease)}
.faq-question::-webkit-details-marker{display:none}
.faq-question:hover{color:var(--c-primary)}
.faq-chevron{flex-shrink:0;margin-top:2px;color:var(--c-text-muted);transition:transform var(--m-base) var(--m-ease)}
.faq-item[open] .faq-chevron{transform:rotate(180deg)}
.faq-item[open] .faq-question{color:var(--c-primary)}
.faq-answer{padding:0 0 var(--s4);font-size:var(--fs-sm);color:var(--c-text-muted);line-height:var(--lh-body)}
@media (max-width:768px){.faq-section{padding:var(--s5) 0}}
`;

/** Câu hỏi thường gặp — `<details>` thật, không JS. */
function FAQ({
  faq = [],
  heading = 'Câu hỏi thường gặp',
  id,
  contained = true
}) {
  if (faq.length === 0) return null;
  return /*#__PURE__*/React.createElement("section", {
    className: "faq-section",
    id: id
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
    className: contained ? 'container' : undefined
  }, /*#__PURE__*/React.createElement("h2", {
    className: "faq-heading"
  }, heading), /*#__PURE__*/React.createElement("div", {
    className: "faq-list",
    role: "list"
  }, faq.map((item, i) => /*#__PURE__*/React.createElement("details", {
    className: "faq-item",
    role: "listitem",
    key: i
  }, /*#__PURE__*/React.createElement("summary", {
    className: "faq-question"
  }, /*#__PURE__*/React.createElement("span", null, item.question), /*#__PURE__*/React.createElement("svg", {
    className: "faq-chevron",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "6 9 12 15 18 9"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "faq-answer",
    "data-speakable": true
  }, /*#__PURE__*/React.createElement("p", null, item.answer)))))));
}
Object.assign(__ds_scope, { FAQ });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/FAQ.jsx", error: String((e && e.message) || e) }); }

// components/content/FactStrip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const css = `
.fact-strip{padding:0 0 var(--s4)}
.fact-strip--inline{padding:0;grid-area:facts}
.fact-grid{display:grid;grid-template-columns:repeat(var(--fact-cols,3),1fr);gap:var(--s3);margin:0;background:var(--c-surface-alt);border:1px solid var(--c-border);border-radius:var(--radius-md);padding:var(--s4)}
@media (min-width:1024px){.fact-strip--inline .fact-grid{grid-template-columns:1fr}}
.fact{min-width:0}
.fact-label{display:flex;align-items:center;gap:var(--s2);font-family:var(--font-ui);font-size:var(--fs-sm);font-weight:var(--fw-500);color:var(--c-text-muted)}
.fact-icon{font-size:1.25rem;line-height:1;flex:none}
.fact-value{margin:2px 0 0;font-family:var(--font-display);font-size:var(--fs-base);font-weight:var(--fw-700);color:var(--c-text);overflow-wrap:anywhere}
.fact-value a{color:var(--c-primary)}
@media (max-width:1023px){.fact-grid{grid-template-columns:repeat(min(var(--fact-cols,3),2),1fr)}}
@media (max-width:640px){
  .fact-grid{grid-template-columns:1fr}
  .fact{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:var(--s2)}
  .fact-value{margin:0;flex:1 1 14ch}
}
`;

/** Vùng "Thông tin nhanh" — nơi DUY NHẤT của các field ngắn (06 §3.1).
 *  Vượt trần `max` thì cắt CÓ TIẾNG (console.warn), không cắt câm. */
function FactStrip({
  facts = [],
  inline = false,
  max = 6
}) {
  const allVisible = facts.filter(x => x.visible !== false);
  if (allVisible.length > max) {
    console.warn('[FactStrip] ' + allVisible.length + ' ô hiển thị vượt trần ' + max + ' — cắt bớt: ' + allVisible.slice(max).map(x => x.field).join(', '));
  }
  const visible = allVisible.slice(0, max);
  if (visible.length === 0) return null;
  const cols = Math.min(visible.length, 3);
  return /*#__PURE__*/React.createElement("section", {
    className: 'fact-strip' + (inline ? ' fact-strip--inline' : '')
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
    className: inline ? undefined : 'container'
  }, /*#__PURE__*/React.createElement("dl", {
    className: "fact-grid",
    style: {
      '--fact-cols': cols
    }
  }, visible.map(x => /*#__PURE__*/React.createElement("div", {
    className: "fact",
    "data-field": x.field,
    key: x.field
  }, /*#__PURE__*/React.createElement("dt", {
    className: "fact-label"
  }, /*#__PURE__*/React.createElement("span", {
    className: "fact-icon",
    "aria-hidden": "true"
  }, x.icon), x.label), /*#__PURE__*/React.createElement("dd", {
    className: "fact-value"
  }, x.href ? /*#__PURE__*/React.createElement("a", _extends({
    href: x.href
  }, x.href.startsWith('http') ? {
    target: '_blank',
    rel: 'noopener'
  } : {}), x.value) : x.value))))));
}
Object.assign(__ds_scope, { FactStrip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/FactStrip.jsx", error: String((e && e.message) || e) }); }

// components/content/Gallery.jsx
try { (() => {
const css = `
.gallery-section{padding:var(--s7) 0}
.gallery-single{border-radius:var(--radius-md);overflow:hidden;margin:0}
.gallery-img{width:100%;height:auto;display:block;object-fit:cover}
.gallery-single .gallery-img{border-radius:var(--radius-md)}
.gallery-scroll{display:flex;gap:var(--s4);overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding-bottom:var(--s2)}
.gallery-scroll::-webkit-scrollbar{display:none}
.gallery-slide{scroll-snap-align:start;flex-shrink:0;border-radius:var(--radius-md);overflow:hidden;margin:0}
.gallery-slide:first-child{width:100%;max-width:820px}
.gallery-slide:not(:first-child){width:240px}
.gallery-slide .gallery-img{height:100%;aspect-ratio:4/3;border-radius:var(--radius-md)}
@media (max-width:768px){.gallery-section{padding:var(--s5) 0}.gallery-slide:first-child{width:85vw}.gallery-slide:not(:first-child){width:180px}}
`;

/** Dải ảnh cuộn ngang có scroll-snap. Một ảnh → hiện full, không dựng dải. */
function Gallery({
  images = [],
  contained = true
}) {
  if (images.length === 0) return null;
  return /*#__PURE__*/React.createElement("section", {
    className: "gallery-section"
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
    className: contained ? 'container' : undefined
  }, images.length === 1 ? /*#__PURE__*/React.createElement("figure", {
    className: "gallery-single"
  }, /*#__PURE__*/React.createElement("img", {
    src: images[0].src,
    alt: images[0].alt || '',
    className: "gallery-img"
  })) : /*#__PURE__*/React.createElement("div", {
    className: "gallery-scroll",
    role: "region",
    "aria-label": "Th\u01B0 vi\u1EC7n \u1EA3nh",
    tabIndex: 0
  }, images.map((img, i) => /*#__PURE__*/React.createElement("figure", {
    className: "gallery-slide",
    key: i
  }, /*#__PURE__*/React.createElement("img", {
    src: img.src,
    alt: img.alt || '',
    className: "gallery-img"
  }))))));
}
Object.assign(__ds_scope, { Gallery });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Gallery.jsx", error: String((e && e.message) || e) }); }

// components/content/InfoCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const css = `
.info-card{margin:0}
.info-row{display:flex;justify-content:space-between;align-items:flex-start;gap:var(--s3);padding:var(--s2) 0;border-bottom:1px solid var(--c-border)}
.info-row:last-child{border-bottom:none}
.info-row-label{font-family:var(--font-ui);font-size:var(--fs-sm);font-weight:var(--fw-500);color:var(--c-text-muted);display:flex;align-items:center;gap:var(--s2);flex-shrink:0}
.info-row-icon{font-size:1rem;line-height:1}
.info-row-value{font-family:var(--font-ui);font-size:var(--fs-sm);font-weight:var(--fw-600);color:var(--c-text);text-align:right;margin:0;min-width:0;overflow-wrap:anywhere}
.info-row-value a{color:var(--c-primary);text-decoration:none}
.info-row-value a:hover{text-decoration:underline}
`;

/** Danh sách nhãn–giá trị trong thẻ sidebar. Chỉ còn ba template dùng
 *  (cẩm nang, công ty, tác giả) — mọi template có hàng ở 06 §3.1 dùng FactStrip. */
function InfoCard({
  rows = []
}) {
  const visible = rows.filter(r => r.visible !== false);
  if (visible.length === 0) return null;
  return /*#__PURE__*/React.createElement("dl", {
    className: "info-card"
  }, /*#__PURE__*/React.createElement("style", null, css), visible.map(r => /*#__PURE__*/React.createElement("div", {
    className: "info-row",
    "data-field": r.field,
    key: r.field
  }, /*#__PURE__*/React.createElement("dt", {
    className: "info-row-label"
  }, /*#__PURE__*/React.createElement("span", {
    className: "info-row-icon",
    "aria-hidden": "true"
  }, r.icon), r.label), /*#__PURE__*/React.createElement("dd", {
    className: "info-row-value"
  }, r.href ? /*#__PURE__*/React.createElement("a", _extends({
    href: r.href
  }, r.href.startsWith('http') ? {
    target: '_blank',
    rel: 'noopener'
  } : {}), r.value || 'Xem') : r.value))));
}
Object.assign(__ds_scope, { InfoCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/InfoCard.jsx", error: String((e && e.message) || e) }); }

// components/content/NearbySection.jsx
try { (() => {
const css = `
.nearby{background:var(--c-surface-alt);padding:var(--s7) 0}
.nearby-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--s6)}
.nearby-title{font-family:var(--font-display);font-size:var(--fs-h3);font-weight:var(--fw-700);color:var(--c-text);line-height:var(--lh-heading)}
.nearby-all{font-family:var(--font-ui);font-size:var(--fs-sm);color:var(--c-primary);text-decoration:none;font-weight:var(--fw-600)}
.nearby-all:hover{text-decoration:underline}
.nearby-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--s5)}
.nearby-grid:has(> :last-child:nth-child(1)){grid-template-columns:1fr}
.nearby-grid:has(> :last-child:nth-child(2)){grid-template-columns:repeat(2,1fr)}
.nearby-grid:has(> :last-child:nth-child(3)){grid-template-columns:repeat(3,1fr)}
.nearby-card{background:var(--c-card);border-radius:var(--radius-md);box-shadow:var(--shadow-card);text-decoration:none;color:inherit;overflow:hidden;transition:box-shadow var(--m-fast) var(--m-ease),transform var(--m-fast) var(--m-ease)}
.nearby-card:hover{box-shadow:var(--shadow-raised);transform:translateY(var(--card-lift))}
.nearby-card-img{aspect-ratio:4/3;overflow:hidden}
.nearby-card-img img{width:100%;height:100%;object-fit:cover}
.nearby-placeholder{width:100%;height:100%;background:var(--c-primary-soft)}
.nearby-card-body{padding:var(--s3)}
.nearby-card-title{font-family:var(--font-display);font-size:var(--fs-base);font-weight:var(--fw-700);color:var(--c-text);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:var(--s2)}
.nearby-badge{display:inline-block;font-family:var(--font-ui);font-size:var(--fs-badge);font-weight:var(--fw-600);background:var(--c-primary-soft);color:var(--c-primary);padding:var(--badge-py) var(--badge-px);border-radius:var(--radius-pill)}
.nearby-distance{display:block;font-family:var(--font-ui);font-size:var(--fs-sm);color:var(--c-text-muted);margin-top:var(--s1)}
@media (max-width:1023px){.nearby-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:640px){.nearby-grid{grid-template-columns:1fr}}
`;

/** Dải "Gần đây" cuối trang chi tiết. Lưới CO theo số mục thật — bốn cột với
 *  hai mục để hở hai ô, trông như thiếu dữ liệu. */
function NearbySection({
  title,
  entities = [],
  viewAllUrl = ''
}) {
  if (entities.length === 0) return null;
  return /*#__PURE__*/React.createElement("section", {
    className: "nearby"
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nearby-head"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "nearby-title"
  }, title), viewAllUrl && /*#__PURE__*/React.createElement("a", {
    href: viewAllUrl,
    className: "nearby-all"
  }, "Xem t\u1EA5t c\u1EA3 \u2192")), /*#__PURE__*/React.createElement("div", {
    className: "nearby-grid"
  }, entities.map((e, i) => /*#__PURE__*/React.createElement("a", {
    href: e.href || '#',
    className: "nearby-card",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "nearby-card-img"
  }, e.image ? /*#__PURE__*/React.createElement("img", {
    src: e.image,
    alt: e.imageAlt || e.title
  }) : /*#__PURE__*/React.createElement("div", {
    className: "nearby-placeholder"
  })), /*#__PURE__*/React.createElement("div", {
    className: "nearby-card-body"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "nearby-card-title"
  }, e.title), e.categoryBadge && /*#__PURE__*/React.createElement("span", {
    className: "nearby-badge"
  }, e.categoryBadge), e.distance && /*#__PURE__*/React.createElement("span", {
    className: "nearby-distance"
  }, e.distance)))))));
}
Object.assign(__ds_scope, { NearbySection });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/NearbySection.jsx", error: String((e && e.message) || e) }); }

// components/content/SkeletonCard.jsx
try { (() => {
const css = `
.skeleton-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s5)}
.skeleton-card{background:var(--c-card);border:1px solid var(--c-border);border-radius:var(--radius-md);overflow:hidden}
.skeleton-img{aspect-ratio:4/3;width:100%}
.skeleton-body{padding:var(--s4);display:flex;flex-direction:column;gap:var(--s3)}
.skeleton-bar{border-radius:var(--radius-sm);height:14px}
.skeleton-bar--title{width:70%;height:18px}
.skeleton-bar--text{width:90%;height:14px}
.skeleton{background:var(--c-border);animation:tdc-pulse 1.5s ease-in-out infinite}
@keyframes tdc-pulse{0%,100%{opacity:1}50%{opacity:.4}}
@media (max-width:1023px){.skeleton-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:640px){.skeleton-grid{grid-template-columns:1fr}}
`;

/** Ô chờ tải cho lưới thẻ. Nhịp đập 1.5s, opacity 1 → .4. */
function SkeletonCard({
  count = 3
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "skeleton-grid"
  }, /*#__PURE__*/React.createElement("style", null, css), Array.from({
    length: count
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    className: "skeleton-card",
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "skeleton skeleton-img"
  }), /*#__PURE__*/React.createElement("div", {
    className: "skeleton-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "skeleton skeleton-bar skeleton-bar--title"
  }), /*#__PURE__*/React.createElement("div", {
    className: "skeleton skeleton-bar skeleton-bar--text"
  })))));
}
Object.assign(__ds_scope, { SkeletonCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/SkeletonCard.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
const css = `
.empty-state{display:flex;flex-direction:column;align-items:center;text-align:center;padding:var(--s9) var(--container-padding);background:var(--c-surface-alt)}
.empty-icon{color:var(--c-text-muted);opacity:.4;margin-bottom:var(--s5)}
.empty-message{font-size:var(--fs-h5);color:var(--c-text-muted);margin-bottom:var(--s6);max-width:32ch}
.empty-links{display:flex;flex-wrap:wrap;gap:var(--s3) var(--s5);justify-content:center}
.empty-link{font-size:var(--fs-sm);color:var(--c-primary);text-decoration:none;font-weight:var(--fw-500)}
.empty-link:hover{text-decoration:underline}
`;
const DEFAULT_EMPTY_LINKS = [{
  label: 'Về trang chủ',
  href: '/'
}, {
  label: 'Khám phá',
  href: '/kham-pha/'
}, {
  label: 'Lưu trú',
  href: '/luu-tru/'
}, {
  label: 'Đi lại',
  href: '/di-lai/'
}];

/** Trạng thái rỗng dùng chung mọi listing (06 §5.2). Luôn kèm lối ra —
 *  danh sách rỗng không được là ngõ cụt. */
function EmptyState({
  message = 'Chưa có nội dung trong mục này.',
  links = DEFAULT_EMPTY_LINKS
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "empty-state"
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("svg", {
    className: "empty-icon",
    viewBox: "0 0 64 64",
    width: "64",
    height: "64",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "32",
    r: "28"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "32",
    r: "3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 4v10M32 50v10M4 32h10M50 32h10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18.4 18.4l7 7M38.6 38.6l7 7M45.6 18.4l-7 7M25.4 38.6l-7 7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 8l6 16l-6 4l-6-4z",
    fill: "currentColor",
    stroke: "none",
    opacity: "0.6"
  })), /*#__PURE__*/React.createElement("p", {
    className: "empty-message"
  }, message), /*#__PURE__*/React.createElement("nav", {
    className: "empty-links",
    "aria-label": "L\u1ED1i \u0111i kh\xE1c"
  }, links.map(l => /*#__PURE__*/React.createElement("a", {
    href: l.href,
    className: "empty-link",
    key: l.href
  }, l.label))));
}
Object.assign(__ds_scope, { DEFAULT_EMPTY_LINKS, EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/home/HomeHero.jsx
try { (() => {
const css = `
.home-hero{position:relative;min-height:var(--hero-min-h);overflow:hidden;background:var(--c-primary);display:flex;align-items:flex-end}
.home-hero .hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.home-hero .hero-gradient{position:absolute;inset:0;z-index:2;background:linear-gradient(to top,var(--c-primary-strong) 0%,color-mix(in srgb,var(--c-primary) 28%,transparent) 55%,transparent 100%)}
.hero-stamp{position:absolute;top:28px;right:28px;z-index:10;width:100px;height:100px;border:3px solid var(--c-coral);border-radius:50%;color:var(--c-coral);transform:rotate(12deg);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:var(--s1)}
.stamp-text{font-family:var(--font-ui);font-size:var(--fs-badge);font-weight:var(--fw-700);letter-spacing:var(--ls-eyebrow);text-transform:uppercase;line-height:var(--lh-eyebrow);white-space:pre-line}
.stamp-line{width:40px;height:1px;background:var(--c-coral)}
.stamp-year{font-family:var(--font-ui);font-size:var(--fs-badge);font-weight:var(--fw-700)}
.home-hero .hero-content{position:relative;z-index:3;padding-bottom:72px;padding-top:80px}
.hero-text-wrap{max-width:700px}
.hero-eyebrow{font-weight:var(--fw-600);font-size:var(--fs-label);letter-spacing:var(--ls-eyebrow);line-height:var(--lh-eyebrow);text-transform:uppercase;color:var(--c-text-inverse);opacity:.65;margin-bottom:var(--s3)}
.hero-title{font-family:var(--font-display);font-weight:var(--fw-800);font-size:clamp(var(--fs-h2),5vw,var(--fs-hero));color:var(--c-text-inverse);line-height:1.1;margin-bottom:var(--s4);text-wrap:pretty}
.hero-summary{font-weight:var(--fw-500);font-size:var(--fs-base);color:var(--c-text-inverse);opacity:.82;line-height:var(--lh-body);max-width:540px}
.hero-actions{display:flex;flex-wrap:wrap;gap:var(--s3);margin-top:var(--s5)}
.hero-book{display:inline-flex;align-items:center;background:var(--c-accent);color:var(--c-text-inverse);font-family:var(--font-ui);font-weight:var(--fw-700);font-size:var(--fs-base);padding:var(--s3) var(--s5);border-radius:var(--radius-pill);text-decoration:none;transition:background var(--m-fast) var(--m-ease)}
.hero-book:hover{background:var(--c-accent-strong)}
.hero-credit{position:absolute;bottom:var(--s4);right:var(--s5);z-index:4;font-family:var(--font-ui);font-size:var(--fs-badge);font-style:italic;color:var(--c-text-inverse);opacity:.45}
@media (max-width:1024px){.home-hero{min-height:440px}.hero-stamp{top:20px;right:20px;width:80px;height:80px}}
@media (max-width:640px){
  .home-hero{min-height:var(--hero-min-h-mobile)}
  .home-hero .hero-content{padding-bottom:var(--s7);padding-top:var(--s7)}
  .hero-title{font-size:clamp(var(--fs-h3),6vw,var(--fs-h2))}
  .hero-stamp{display:none}
  .hero-credit{bottom:var(--s2);right:var(--s4)}
}
`;

/** Hero trang chủ: ảnh tràn viền, gradient từ đáy, con dấu tròn màu coral xoay
 *  12° (ẩn ở ≤640px), câu định vị + CTA Zalo. */
function HomeHero({
  title,
  summary = '',
  image = '',
  imageAlt = '',
  eyebrow = '',
  imageCredit = '',
  stampText = '',
  stampYear = '',
  ctaLabel = '',
  ctaHref = ''
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: "home-hero"
  }, /*#__PURE__*/React.createElement("style", null, css), image && /*#__PURE__*/React.createElement("img", {
    className: "hero-img",
    src: image,
    alt: imageAlt
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-gradient",
    "aria-hidden": "true"
  }), stampText && /*#__PURE__*/React.createElement("div", {
    className: "hero-stamp",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    className: "stamp-text"
  }, stampText), /*#__PURE__*/React.createElement("div", {
    className: "stamp-line"
  }), stampYear && /*#__PURE__*/React.createElement("span", {
    className: "stamp-year"
  }, stampYear)), /*#__PURE__*/React.createElement("div", {
    className: "container hero-content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-text-wrap"
  }, eyebrow && /*#__PURE__*/React.createElement("p", {
    className: "hero-eyebrow"
  }, eyebrow), /*#__PURE__*/React.createElement("h1", {
    className: "hero-title"
  }, title), summary && /*#__PURE__*/React.createElement("p", {
    className: "hero-summary"
  }, summary), ctaLabel && ctaHref && /*#__PURE__*/React.createElement("div", {
    className: "hero-actions"
  }, /*#__PURE__*/React.createElement("a", {
    className: "hero-book",
    href: ctaHref
  }, ctaLabel)))), imageCredit && /*#__PURE__*/React.createElement("div", {
    className: "hero-credit"
  }, imageCredit));
}
Object.assign(__ds_scope, { HomeHero });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/home/HomeHero.jsx", error: String((e && e.message) || e) }); }

// components/home/HomeStatsBand.jsx
try { (() => {
const css = `
.stats-band{background:var(--c-primary);color:var(--c-text-inverse);padding:var(--s7) 0}
.stats-grid{display:grid;grid-template-columns:repeat(var(--stat-cols,4),1fr);gap:0}
.stat{display:flex;flex-direction:column;gap:var(--s2);padding:0 var(--s6)}
.stat:first-child{padding-left:0}
.stat:last-child{padding-right:0}
.stat + .stat{border-left:1px solid color-mix(in srgb,var(--c-text-inverse) 24%,transparent)}
.stat-rule{width:var(--underline-width);height:var(--underline-height);background:var(--c-sand);border-radius:2px}
.stat-value{font-family:var(--font-display);font-size:var(--fs-h1);font-weight:var(--fw-800);line-height:var(--lh-display)}
.stat-label{font-size:var(--fs-sm);font-weight:var(--fw-600)}
.stat-note{font-size:var(--fs-label);opacity:.7}
@media (max-width:1023px){.stats-grid{grid-template-columns:repeat(min(var(--stat-cols,4),2),1fr);gap:var(--s5)}.stat{padding:0}.stat + .stat{border-left:none}}
@media (max-width:640px){.stats-grid{grid-template-columns:1fr}.stat-value{font-size:var(--fs-h3)}}
`;

/** Dải số liệu nền --c-primary. Trụ của trang chủ: KHÔNG đọc document nào nên
 *  site có 4 hay 40 sản phẩm thì khối này vẫn đầy.
 *  Cấm đổi nền sang --c-sand: cặp đó chỉ đạt tương phản 3.28. */
function HomeStatsBand({
  stats = []
}) {
  const items = stats.filter(s => s.value || s.label);
  if (items.length === 0) return null;
  const cols = Math.min(items.length, 4);
  return /*#__PURE__*/React.createElement("section", {
    className: "stats-band"
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
    className: "container stats-grid",
    style: {
      '--stat-cols': cols
    }
  }, items.map((s, i) => /*#__PURE__*/React.createElement("div", {
    className: "stat",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "stat-rule",
    "aria-hidden": "true"
  }), s.value && /*#__PURE__*/React.createElement("span", {
    className: "stat-value"
  }, s.value), s.label && /*#__PURE__*/React.createElement("span", {
    className: "stat-label"
  }, s.label), s.note && /*#__PURE__*/React.createElement("span", {
    className: "stat-note"
  }, s.note)))));
}
Object.assign(__ds_scope, { HomeStatsBand });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/home/HomeStatsBand.jsx", error: String((e && e.message) || e) }); }

// components/home/HomeTourGrid.jsx
try { (() => {
const css = `
.home-tours{background:var(--c-band-bg);padding:var(--s7) 0}
.tours-eyebrow{font-family:var(--font-display);font-size:var(--fs-xs);font-weight:var(--fw-800);letter-spacing:0.12em;color:var(--c-sand);margin:0}
.tours-heading{font-family:var(--font-display);font-size:var(--fs-section);font-weight:var(--fw-800);letter-spacing:-0.015em;line-height:var(--lh-heading);color:var(--c-band-text);margin:var(--s1) 0}
.tours-sub{font-size:var(--fs-base);line-height:var(--lh-body);color:var(--c-band-muted);margin:0 0 var(--s4);max-width:56ch}
.tours-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s3);list-style:none;margin:0;padding:0}
.tour-card{background:var(--c-card);border-radius:var(--radius-md);overflow:hidden}
.tour-card a{display:block;color:inherit;text-decoration:none}
.tour-thumb{display:block;width:100%;aspect-ratio:12/7;object-fit:cover}
.tour-thumb-empty{background:linear-gradient(135deg,var(--c-hero-fallback-top-teal),var(--c-hero-fallback-bottom-teal))}
.tour-body{padding:var(--s3)}
.tour-title{font-family:var(--font-display);font-size:var(--fs-card-title);font-weight:var(--fw-700);letter-spacing:-0.01em;line-height:1.24;color:var(--c-text);margin:0}
.tour-meta{font-size:var(--fs-label);color:var(--c-text-muted);margin:var(--s1) 0 0}
.tours-all{display:inline-block;margin-top:var(--s4);background:var(--c-sand);color:var(--c-sand-text-strong);font-family:var(--font-display);font-weight:var(--fw-700);font-size:var(--fs-base);padding:var(--s2) var(--s4);border-radius:var(--radius-sm);text-decoration:none}
@media (max-width:900px){.tours-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:600px){.tours-grid{grid-template-columns:1fr}}
`;

/** "Tour nổi bật" — dải màu đậm đầu tiên của trang chủ: thẻ trắng nổi trên nền
 *  xanh, cắt mạch trắng liền vốn làm cả trang trôi thành một mảng. */
function HomeTourGrid({
  tours = [],
  indexHref = '/tour/',
  total = 0,
  onNavigate
}) {
  if (tours.length === 0) return null;
  return /*#__PURE__*/React.createElement("section", {
    className: "home-tours"
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("p", {
    className: "tours-eyebrow"
  }, "TOUR BI\u1EC2N \u0110\u1EA2O"), /*#__PURE__*/React.createElement("h2", {
    className: "tours-heading"
  }, "Tour n\u1ED5i b\u1EADt"), /*#__PURE__*/React.createElement("p", {
    className: "tours-sub"
  }, "Kh\u1EDFi h\xE0nh h\u1EB1ng ng\xE0y t\u1EEB Nha Trang, c\xF3 xe \u0111\xF3n t\u1EADn kh\xE1ch s\u1EA1n n\u1ED9i th\xE0nh."), /*#__PURE__*/React.createElement("ul", {
    className: "tours-grid"
  }, tours.map(t => /*#__PURE__*/React.createElement("li", {
    className: "tour-card",
    key: t.slug
  }, /*#__PURE__*/React.createElement("a", {
    href: '/tour/' + t.slug + '/',
    onClick: onNavigate ? e => {
      e.preventDefault();
      onNavigate('/tour/' + t.slug + '/');
    } : undefined
  }, t.image ? /*#__PURE__*/React.createElement("img", {
    className: "tour-thumb",
    src: t.image,
    alt: t.imageAlt || ''
  }) : /*#__PURE__*/React.createElement("div", {
    className: "tour-thumb tour-thumb-empty",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "tour-body"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "tour-title"
  }, t.title), t.duration && /*#__PURE__*/React.createElement("p", {
    className: "tour-meta"
  }, t.duration)))))), /*#__PURE__*/React.createElement("a", {
    className: "tours-all",
    href: indexHref,
    onClick: onNavigate ? e => {
      e.preventDefault();
      onNavigate(indexHref);
    } : undefined
  }, "Xem t\u1EA5t c\u1EA3 ", total, " tour")));
}
Object.assign(__ds_scope, { HomeTourGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/home/HomeTourGrid.jsx", error: String((e && e.message) || e) }); }

// components/home/HomeTrustBar.jsx
try { (() => {
const css = `
.why-section{background:var(--c-surface-alt);border-top:1px solid var(--c-border);border-bottom:1px solid var(--c-border);padding:var(--s9) 0}
.why-head{display:flex;flex-direction:column;gap:var(--s3);margin-bottom:var(--s7)}
.why-head h2{font-family:var(--font-display);font-size:var(--fs-h3);font-weight:var(--fw-800);color:var(--c-primary);line-height:var(--lh-heading);text-wrap:balance}
.why-underline{display:block;width:var(--underline-width);height:var(--underline-height);background:var(--c-sand);border-radius:2px}
.why-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--s6) var(--s7)}
.why-item{display:flex;gap:var(--s4)}
.why-icon{width:var(--s7);height:var(--s7);flex:none;border-radius:var(--radius-md);background:var(--c-primary-soft);display:flex;align-items:center;justify-content:center;font-size:var(--fs-h4)}
.why-body{display:flex;flex-direction:column;gap:var(--s1)}
.why-title{font-family:var(--font-display);font-size:var(--fs-card-title);font-weight:var(--fw-700);color:var(--c-text);line-height:var(--lh-heading)}
.why-desc{font-size:var(--fs-sm);color:var(--c-text-muted);line-height:var(--lh-body)}
@media (max-width:767px){.why-grid{grid-template-columns:1fr}}
`;
const DEFAULT_TRUST_ITEMS = [{
  icon: '🚐',
  title: 'Xe đưa đón tận nơi',
  description: 'Không bắt khách tự ra bến. Tài xế nhận khách ngay tại khách sạn theo giờ đã hẹn.'
}, {
  icon: '🧭',
  title: 'Hướng dẫn viên đi cùng',
  description: 'Có người chịu trách nhiệm suốt chuyến, từ lúc lên xe đến lúc về lại khách sạn.'
}, {
  icon: '🏷️',
  title: 'Giá tốt',
  description: 'Báo giá trọn gói, không phụ thu phát sinh trong ngày. Giá trên trang là giá bạn trả.'
}, {
  icon: '💬',
  title: 'Thanh toán linh hoạt',
  description: 'Chốt qua Zalo với người thật, thống nhất cách thanh toán trước khi giữ chỗ.'
}];

/** "Vì sao chọn" — bốn điểm khác biệt, lưới 2×2. Đây là lập luận bán hàng,
 *  không phải chú thích: nội dung đến từ định vị công ty, không từ CMS. */
function HomeTrustBar({
  items = DEFAULT_TRUST_ITEMS,
  heading = 'Vì sao chọn Tour Đảo'
}) {
  if (items.length === 0) return null;
  return /*#__PURE__*/React.createElement("section", {
    className: "why-section"
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, heading && /*#__PURE__*/React.createElement("div", {
    className: "why-head"
  }, /*#__PURE__*/React.createElement("h2", null, heading), /*#__PURE__*/React.createElement("span", {
    className: "why-underline",
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "why-grid"
  }, items.map(it => /*#__PURE__*/React.createElement("div", {
    className: "why-item",
    key: it.title
  }, /*#__PURE__*/React.createElement("div", {
    className: "why-icon",
    "aria-hidden": "true"
  }, it.icon), /*#__PURE__*/React.createElement("div", {
    className: "why-body"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "why-title"
  }, it.title), /*#__PURE__*/React.createElement("p", {
    className: "why-desc"
  }, it.description)))))));
}
Object.assign(__ds_scope, { DEFAULT_TRUST_ITEMS, HomeTrustBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/home/HomeTrustBar.jsx", error: String((e && e.message) || e) }); }

// components/layout/Hero.jsx
try { (() => {
const css = `
.hero-block{border-radius:var(--radius-lg);overflow:hidden;background:var(--c-primary-soft)}
.hero-media-grid{display:grid}
.hero-block--mosaic .hero-media-grid{grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:var(--s1);height:clamp(320px,34vw,430px);background:var(--c-card)}
.hero-main{position:relative;height:400px;overflow:hidden}
.hero-block--mosaic .hero-main{height:100%}
.hero-main-figure{width:100%;height:100%;margin:0}
.hero-main-figure img{width:100%;height:100%;object-fit:cover;display:block}
.hero-gradient-overlay{position:absolute;inset:0;background:linear-gradient(to top,var(--c-primary-strong) 0%,transparent 55%);pointer-events:none}
.hero-overlay{position:absolute;bottom:0;left:0;right:0;padding:var(--s7) var(--s5) var(--s5);z-index:2;display:flex;flex-direction:column;gap:var(--s3)}
.hero-shell--full{width:100vw;margin-left:calc(50% - 50vw);border-radius:0}
.hero-shell--full .hero-block{border-radius:0}
.hero-gallery-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:var(--s1);min-width:0;min-height:0;height:100%;overflow:hidden}
.hero-gallery-item{margin:0;min-width:0;min-height:0;width:100%;height:100%;overflow:hidden;background:var(--c-primary-soft)}
.hero-gallery-item img{width:100%;height:100%;object-fit:cover;display:block;transition:transform var(--m-base) var(--m-ease)}
.hero-gallery-item:hover img{transform:scale(1.05)}
.hero-gradient{position:relative;min-height:clamp(280px,36vw,420px);overflow:hidden;border-radius:var(--radius-lg);background:radial-gradient(720px 300px at 92% 0%,color-mix(in srgb,var(--c-green) 20%,transparent),transparent 62%),radial-gradient(620px 260px at 10% 8%,color-mix(in srgb,var(--c-sand) 18%,transparent),transparent 62%),linear-gradient(135deg,var(--c-primary-strong),var(--c-primary) 52%,color-mix(in srgb,var(--c-primary) 80%,var(--c-green) 20%))}
.hero-landscape{position:absolute;inset:auto 0 0;height:46%;background:linear-gradient(180deg,color-mix(in srgb,var(--c-green) 18%,transparent),color-mix(in srgb,var(--c-primary-strong) 72%,transparent));clip-path:polygon(0 42%,13% 32%,28% 40%,43% 28%,58% 39%,75% 29%,100% 40%,100% 100%,0 100%);opacity:.72}
.hero-gradient-inner{position:relative;z-index:2;padding:var(--s7) var(--s6);display:flex;flex-direction:column;gap:var(--s3)}
@media (max-width:768px){
  .hero-block--mosaic .hero-media-grid{grid-template-columns:1fr;height:auto}
  .hero-main,.hero-block--mosaic .hero-main{height:280px}
  .hero-gallery-grid{grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:1fr;height:84px}
  .hero-overlay{padding:var(--s5) var(--s4) var(--s4)}
  .hero-gradient-inner{padding:var(--s5) var(--s4)}
}
@media (min-width:769px) and (max-width:1023px){
  .hero-main{height:340px}
  .hero-block--mosaic .hero-media-grid{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);height:340px}
  .hero-block--mosaic .hero-main{height:100%}
}
`;

/** Hero trang chi tiết: ảnh chính + (đúng 4 ảnh) khảm bên phải kiểu trang đặt
 *  phòng. Không có ảnh → nền gradient biển đảo. Overlay nhận breadcrumb, phù
 *  hiệu, h1, đoạn mở. */
function Hero({
  image = '',
  gallery = [],
  imageAlt = '',
  fullBleed = false,
  children
}) {
  const items = (gallery || []).filter(g => g && g.src).slice(0, 4);
  const hasGallery = items.length === 4;
  return /*#__PURE__*/React.createElement("section", {
    className: 'hero-shell' + (fullBleed ? ' hero-shell--full' : '')
  }, /*#__PURE__*/React.createElement("style", null, css), image ? /*#__PURE__*/React.createElement("div", {
    className: hasGallery ? 'hero-block hero-block--mosaic' : 'hero-block'
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-media-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-main"
  }, /*#__PURE__*/React.createElement("figure", {
    className: "hero-main-figure"
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: imageAlt
  })), /*#__PURE__*/React.createElement("div", {
    className: "hero-gradient-overlay",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "hero-overlay"
  }, /*#__PURE__*/React.createElement("div", {
    className: fullBleed ? 'container' : undefined,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--s3)'
    }
  }, children))), hasGallery && /*#__PURE__*/React.createElement("div", {
    className: "hero-gallery-grid"
  }, items.map((g, i) => /*#__PURE__*/React.createElement("figure", {
    className: "hero-gallery-item",
    key: i
  }, /*#__PURE__*/React.createElement("img", {
    src: g.src,
    alt: g.alt || ''
  })))))) : /*#__PURE__*/React.createElement("div", {
    className: "hero-gradient"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hero-landscape",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "container hero-gradient-inner"
  }, children)));
}
Object.assign(__ds_scope, { Hero });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Hero.jsx", error: String((e && e.message) || e) }); }

// components/layout/Section.jsx
try { (() => {
const css = `
.section{position:relative;padding:var(--s7) 0}
.section-head{margin-bottom:var(--s6)}
.section-title{font-family:var(--font-display);font-size:var(--fs-section);font-weight:var(--fw-800);color:var(--c-primary);line-height:var(--lh-heading);letter-spacing:-0.015em;margin-bottom:var(--s3)}
.section-underline{display:block;width:var(--underline-width);height:var(--underline-height);background:var(--c-sand);border-radius:2px}
@media (max-width:768px){.section{padding:var(--s5) 0}.section-title{font-size:var(--fs-h4)}}
`;
function slugify(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Mục nội dung có tiêu đề + gạch chân cát. Mục có tiêu đề LUÔN neo được:
 *  không truyền id thì sinh từ tiêu đề (bỏ dấu tiếng Việt). */
function Section({
  heading,
  id,
  contained = true,
  children
}) {
  const sectionId = id || (heading ? slugify(heading) : undefined);
  return /*#__PURE__*/React.createElement("section", {
    className: "section",
    id: sectionId
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
    className: contained ? 'container' : undefined
  }, heading && /*#__PURE__*/React.createElement("div", {
    className: "section-head"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "section-title"
  }, heading), /*#__PURE__*/React.createElement("span", {
    className: "section-underline",
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "section-body"
  }, children)));
}
Object.assign(__ds_scope, { slugify, Section });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Section.jsx", error: String((e && e.message) || e) }); }

// components/layout/Sidebar.jsx
try { (() => {
const css = `
.sidebar{grid-area:sidebar;width:340px;position:sticky;top:calc(var(--header-h) + var(--sidebar-offset,0px) + var(--s4));align-self:start;display:flex;flex-direction:column;gap:var(--s4)}
.sidebar-card{background:var(--c-card);border:1px solid var(--c-border);border-radius:var(--radius-md);padding:var(--s4)}
@media (max-width:1023px){.sidebar{width:100%;position:static}}
`;

/** Cột phụ 340px dính dưới header. Mỗi ô là một `.sidebar-card`.
 *  `stickyBar` cộng chiều cao thanh dính vào chỗ dính (DR-033). */
function Sidebar({
  cards = [],
  stickyBar = false
}) {
  const visible = cards.filter(c => c && c.visible !== false);
  if (visible.length === 0) return null;
  return /*#__PURE__*/React.createElement("aside", {
    className: "sidebar",
    style: {
      '--sidebar-offset': stickyBar ? 'var(--sticky-bar-h)' : '0px'
    }
  }, /*#__PURE__*/React.createElement("style", null, css), visible.map((c, i) => /*#__PURE__*/React.createElement("div", {
    className: "sidebar-card",
    key: c.name || i
  }, c.content)));
}
Object.assign(__ds_scope, { Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/layout/DetailLayout.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const css = `
.detail-badges{display:flex;flex-wrap:wrap;gap:var(--s2)}
.detail-badge{padding:var(--badge-py) var(--badge-px);border-radius:var(--radius-pill);background:color-mix(in srgb,var(--c-text-inverse) 22%,transparent);color:var(--c-text-inverse);font-size:var(--fs-label);font-weight:var(--fw-600);backdrop-filter:blur(4px)}
.detail-summary{max-width:62ch;color:var(--c-text-inverse);font-size:var(--fs-base);line-height:var(--lh-body);opacity:.92}
.detail-title{font-family:var(--font-display);font-size:clamp(var(--fs-h3),4.2vw,var(--fs-hero));font-weight:var(--fw-800);color:var(--c-text-inverse);line-height:var(--lh-display);text-wrap:balance;padding-bottom:var(--s2);margin:0}
.sticky-bar{position:sticky;top:var(--header-h);z-index:90;background:var(--c-surface);border-bottom:1px solid var(--c-border)}
.sticky-bar__inner{display:flex;align-items:center;justify-content:space-between;gap:var(--s5);height:var(--sticky-bar-h)}
.sticky-bar__jump{display:flex;gap:var(--s5);overflow-x:auto;scrollbar-width:none;align-self:stretch}
.sticky-bar__jump::-webkit-scrollbar{display:none}
.sticky-bar__jump a{display:inline-flex;align-items:center;height:100%;font-size:var(--fs-sm);font-weight:var(--fw-600);color:var(--c-text-muted);white-space:nowrap;text-decoration:none;border-bottom:2px solid transparent;transition:color var(--m-fast) var(--m-ease),border-color var(--m-fast) var(--m-ease)}
.sticky-bar__jump a:hover{color:var(--c-primary);border-bottom-color:var(--c-primary)}
.sticky-bar__action{display:flex;align-items:center;gap:var(--s4);flex-shrink:0}
.sticky-bar__price{font-family:var(--font-display);font-size:var(--fs-h5);font-weight:var(--fw-800);color:var(--c-primary-strong);white-space:nowrap}
.sticky-bar__cta{padding:var(--s3) var(--s5);border-radius:var(--radius-pill);background:var(--c-accent);color:var(--c-text-inverse);font-size:var(--fs-sm);font-weight:var(--fw-700);white-space:nowrap;text-decoration:none;transition:background var(--m-fast) var(--m-ease)}
.sticky-bar__cta:hover{background:var(--c-accent-strong)}
@media (max-width:767px){.sticky-bar__jump{display:none}.sticky-bar__inner{justify-content:flex-end}}
.two-col{display:grid;grid-template-columns:1fr 340px;grid-template-areas:'. facts' 'main sidebar';gap:var(--s7);align-items:start;padding-top:var(--s6);padding-bottom:var(--s7)}
.content-main{grid-area:main;min-width:0}
.updated-section{padding-top:var(--s4)}
.updated-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:var(--s4);padding:var(--s4) 0;border-top:1px solid var(--c-border)}
.updated,.reference-source{font-size:var(--fs-sm);color:var(--c-text-muted);display:flex;align-items:center;gap:var(--s2)}
.updated svg{color:var(--c-primary)}
.reference-source a{color:var(--c-primary);text-decoration:none;font-weight:var(--fw-600)}
.reference-source a:hover{text-decoration:underline}
@media (max-width:1023px){.two-col{grid-template-columns:1fr;grid-template-areas:'facts' 'main' 'sidebar'}}
`;

/** Khung chung MỌI trang chi tiết: hero full-bleed → thanh dính → hai cột
 *  (nội dung + sidebar 340px) → dải "Gần đây".
 *  Thông tin nhanh ≤2 ô thì gộp vào cột sidebar (vùng grid 'facts'), >2 ô thì
 *  trải dải ngang dưới thanh dính — hợp đồng 06 §3.1. */
function DetailLayout({
  title,
  image = '',
  gallery = [],
  crumbs = [],
  badges = [],
  summary = '',
  speakable = false,
  facts = [],
  factsMax = 6,
  jumpLinks = [],
  priceLabel = '',
  ctaHref = '',
  ctaLabel = '',
  sidebarCards = [],
  updatedAt = '',
  sameAsHref = '',
  sameAsLabel = '',
  nearbyTitle = '',
  nearby = [],
  children
}) {
  const showStickyBar = jumpLinks.length > 0 || !!priceLabel || !!(ctaHref && ctaLabel);
  const factsVisible = (facts || []).filter(x => x.visible !== false);
  const factsInline = factsVisible.length > 0 && factsVisible.length <= 2;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement(__ds_scope.Hero, {
    image: image,
    gallery: gallery,
    fullBleed: true
  }, crumbs.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.Breadcrumb, {
    crumbs: crumbs,
    inverse: true
  }), badges.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "detail-badges"
  }, badges.map(b => /*#__PURE__*/React.createElement("span", {
    className: "detail-badge",
    key: b
  }, b))), /*#__PURE__*/React.createElement("h1", {
    className: "detail-title"
  }, title), summary && /*#__PURE__*/React.createElement("p", _extends({
    className: "detail-summary"
  }, speakable ? {
    'data-speakable': true
  } : {}), summary)), showStickyBar && /*#__PURE__*/React.createElement("div", {
    className: "sticky-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container sticky-bar__inner"
  }, /*#__PURE__*/React.createElement("nav", {
    className: "sticky-bar__jump",
    "aria-label": title
  }, jumpLinks.map(j => /*#__PURE__*/React.createElement("a", {
    href: j.href,
    key: j.href
  }, j.label))), /*#__PURE__*/React.createElement("div", {
    className: "sticky-bar__action"
  }, priceLabel && /*#__PURE__*/React.createElement("span", {
    className: "sticky-bar__price"
  }, priceLabel), ctaHref && ctaLabel && /*#__PURE__*/React.createElement("a", {
    className: "sticky-bar__cta",
    href: ctaHref,
    target: "_blank",
    rel: "noopener"
  }, ctaLabel)))), !factsInline && factsVisible.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.FactStrip, {
    facts: facts,
    max: factsMax
  }), /*#__PURE__*/React.createElement("div", {
    className: "container two-col"
  }, factsInline && /*#__PURE__*/React.createElement(__ds_scope.FactStrip, {
    facts: facts,
    inline: true,
    max: factsMax
  }), /*#__PURE__*/React.createElement("div", {
    className: "content-main"
  }, children, /*#__PURE__*/React.createElement("div", {
    className: "updated-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "updated-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "updated"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 6 12 12 16 14"
  })), "C\u1EADp nh\u1EADt ", updatedAt), sameAsHref && /*#__PURE__*/React.createElement("div", {
    className: "reference-source"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDD17"), "Ngu\u1ED3n tham kh\u1EA3o: ", /*#__PURE__*/React.createElement("a", {
    href: sameAsHref,
    target: "_blank",
    rel: "noopener"
  }, sameAsLabel))))), /*#__PURE__*/React.createElement(__ds_scope.Sidebar, {
    cards: sidebarCards,
    stickyBar: showStickyBar
  })), nearby.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.NearbySection, {
    title: nearbyTitle,
    entities: nearby
  }));
}
Object.assign(__ds_scope, { DetailLayout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/DetailLayout.jsx", error: String((e && e.message) || e) }); }

// components/layout/WaveDivider.jsx
try { (() => {
const css = `
.wave{line-height:0}
.wave svg{display:block;width:100%}
.wave--flip svg{transform:scaleY(-1)}
`;

/** Dải sóng SVG giữa các mục lớn của trang chủ. Hoạ tiết biển đảo DUY NHẤT được
 *  phép dùng — mọi hoạ tiết đất liền (ruộng, đồi, đường bình độ) đã gỡ ở v2. */
function WaveDivider({
  fill = 'var(--c-primary)',
  flip = false,
  opacity = 0.08,
  noSecond = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: 'wave' + (flip ? ' wave--flip' : ''),
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 1440 48",
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M0,24 C180,48 360,0 540,24 C720,48 900,0 1080,24 C1260,48 1380,12 1440,24 L1440,48 L0,48 Z",
    fill: fill,
    opacity: opacity
  }), !noSecond && /*#__PURE__*/React.createElement("path", {
    d: "M0,32 C200,8 400,48 600,32 C800,16 1000,48 1200,32 C1320,24 1400,36 1440,32 L1440,48 L0,48 Z",
    fill: fill,
    opacity: opacity * 0.6
  })));
}
Object.assign(__ds_scope, { WaveDivider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/WaveDivider.jsx", error: String((e && e.message) || e) }); }

// components/home/HomeHubGrid.jsx
try { (() => {
const css = `
.hubs-wave-top{background:var(--c-primary);padding-top:2px}
.hubs-wave-bottom{background:var(--c-primary)}
.hubs-section{background:var(--c-primary);padding:72px 0}
.hubs-title{font-family:var(--font-display);font-weight:var(--fw-900);font-size:clamp(var(--fs-h3),3vw,var(--fs-h2));color:var(--c-text-inverse);margin-bottom:var(--s2);text-align:center}
.hubs-sub{font-weight:var(--fw-500);font-size:var(--fs-sm);color:var(--c-text-inverse);opacity:.6;text-align:center;margin-bottom:var(--s6)}
.hubs-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--s4)}
.hubs-grid:has(> :last-child:nth-child(3)){grid-template-columns:repeat(3,1fr)}
.hub-card{background:var(--c-card);border-radius:var(--radius-lg);padding:var(--s6) var(--s5);display:flex;flex-direction:column;gap:var(--s4);transition:transform var(--m-fast) var(--m-ease),box-shadow var(--m-fast) var(--m-ease);color:inherit;text-decoration:none}
.hub-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg)}
.hub-icon{width:48px;height:48px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;font-size:var(--fs-h5)}
.hub-name{font-family:var(--font-display);font-weight:var(--fw-800);font-size:var(--fs-h5);color:var(--c-text);margin-bottom:var(--s1)}
.hub-desc{font-weight:var(--fw-500);font-size:var(--fs-label);color:var(--c-text-muted);line-height:1.55}
.hub-footer{margin-top:auto;display:flex;align-items:center;justify-content:space-between}
.hub-count{font-family:var(--font-ui);font-weight:var(--fw-700);font-size:var(--fs-label);padding:4px 10px;border-radius:var(--radius-pill);color:var(--c-primary);background:var(--c-primary-soft)}
.hub-arrow{color:var(--c-text-muted);font-size:var(--fs-card-title)}
@media (max-width:1024px){.hubs-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:640px){.hubs-section{padding:var(--s7) 0}.hubs-grid{grid-template-columns:1fr;gap:var(--s3)}.hub-card{padding:var(--s5) var(--s4)}}
`;
const DEFAULT_HUBS = [{
  entity: 'hub-kham-pha',
  href: '/kham-pha/',
  label: 'Khám phá',
  desc: 'Địa điểm, di tích, thiên nhiên, đảo biển',
  emoji: '🏛️',
  iconBg: 'var(--c-primary-soft)'
}, {
  entity: 'hub-luu-tru',
  href: '/luu-tru/',
  label: 'Lưu trú',
  desc: 'Khách sạn, resort, homestay ở mọi mức giá',
  emoji: '🛏️',
  iconBg: 'var(--c-green-soft)'
}, {
  entity: 'hub-di-lai',
  href: '/di-lai/',
  label: 'Đi lại',
  desc: 'Sân bay, xe bus, taxi, thuê xe máy',
  emoji: '🚌',
  iconBg: 'var(--c-sand-soft)'
}];

/** Lưới hub "Bắt đầu từ đâu?" — khối nền --c-primary có sóng ở hai mép. */
function HomeHubGrid({
  hubs = DEFAULT_HUBS,
  heading = 'Bắt đầu từ đâu?',
  sub = 'Chọn chuyên mục bạn cần — mỗi hub có đầy đủ danh sách, bộ lọc và thông tin thực tế.',
  counts = {}
}) {
  if (hubs.length === 0) return null;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
    className: "hubs-wave-top",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(__ds_scope.WaveDivider, {
    fill: "var(--c-primary)",
    opacity: 0.08,
    flip: true,
    noSecond: true
  })), /*#__PURE__*/React.createElement("div", {
    className: "hubs-section"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, heading && /*#__PURE__*/React.createElement("h2", {
    className: "hubs-title"
  }, heading), sub && /*#__PURE__*/React.createElement("p", {
    className: "hubs-sub"
  }, sub), /*#__PURE__*/React.createElement("div", {
    className: "hubs-grid"
  }, hubs.map(h => /*#__PURE__*/React.createElement("a", {
    href: h.href,
    className: "hub-card",
    key: h.entity
  }, /*#__PURE__*/React.createElement("div", {
    className: "hub-icon",
    style: {
      background: h.iconBg
    },
    "aria-hidden": "true"
  }, h.emoji), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "hub-name"
  }, h.label), /*#__PURE__*/React.createElement("p", {
    className: "hub-desc"
  }, h.desc)), /*#__PURE__*/React.createElement("div", {
    className: "hub-footer"
  }, counts[h.entity] !== undefined && /*#__PURE__*/React.createElement("span", {
    className: "hub-count"
  }, counts[h.entity], " \u0111\u1ECBa \u0111i\u1EC3m"), /*#__PURE__*/React.createElement("span", {
    className: "hub-arrow",
    "aria-hidden": "true"
  }, "\u203A"))))))), /*#__PURE__*/React.createElement("div", {
    className: "hubs-wave-bottom",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(__ds_scope.WaveDivider, {
    fill: "var(--c-surface)"
  })));
}
Object.assign(__ds_scope, { DEFAULT_HUBS, HomeHubGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/home/HomeHubGrid.jsx", error: String((e && e.message) || e) }); }

// components/listing/EntityIndex.jsx
try { (() => {
const css = `
.entity-index .entity-header{position:relative;overflow:hidden;padding:var(--s7) 0 var(--s5);background:radial-gradient(620px 260px at 8% 0%,color-mix(in srgb,var(--c-primary-soft) 70%,transparent),transparent 66%),linear-gradient(135deg,var(--c-primary-soft),var(--c-sand-soft));border-bottom:1px solid color-mix(in srgb,var(--c-border) 70%,transparent)}
.entity-index .entity-header::after{content:"";position:absolute;inset:auto 0 0;height:18px;pointer-events:none;background:var(--c-surface-alt);opacity:.52}
.entity-title{font-family:var(--font-display);font-size:var(--fs-h1);font-weight:var(--fw-800);color:var(--c-text);line-height:var(--lh-heading);margin-bottom:var(--s3)}
.entity-underline{display:block;width:36px;height:3px;background:linear-gradient(90deg,var(--c-sand),color-mix(in srgb,var(--c-green) 42%,var(--c-sand)));border-radius:2px;margin-bottom:var(--s4)}
.entity-desc{font-size:var(--fs-h5);color:var(--c-text-muted);max-width:var(--measure,70ch);margin-top:var(--s2)}
.term-filter{padding:var(--s5) 0 0}
.term-pills{display:flex;flex-wrap:wrap;gap:var(--s2)}
.term-pill{display:inline-flex;align-items:center;padding:var(--s2) var(--s4);background:color-mix(in srgb,var(--c-primary-soft) 82%,var(--c-card));color:var(--c-primary);border:1px solid color-mix(in srgb,var(--c-primary) 14%,transparent);border-radius:var(--radius-pill);font-size:var(--fs-sm);font-weight:var(--fw-600);font-family:var(--font-ui);text-decoration:none;transition:background var(--m-fast) var(--m-ease),color var(--m-fast) var(--m-ease)}
.term-pill:hover,.term-pill[aria-current='true']{background:var(--c-primary);color:var(--c-text-inverse)}
.entity-body{padding:var(--s7) 0;background:linear-gradient(180deg,color-mix(in srgb,var(--c-card) 28%,transparent),transparent 22%)}
.card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--s5)}
.card-grid:has(> :last-child:nth-child(1)){grid-template-columns:1fr}
.card-grid:has(> :last-child:nth-child(1)) .card{display:grid;grid-template-columns:minmax(0,42%) 1fr;align-items:stretch}
.card-grid:has(> :last-child:nth-child(1)) .card-img-wrap{height:100%;min-height:240px;aspect-ratio:auto}
.card-grid:has(> :last-child:nth-child(2)){grid-template-columns:repeat(2,1fr)}
.entity-count{font-size:var(--fs-sm);color:var(--c-text-muted);margin-top:var(--s6)}
@media (max-width:1023px){.card-grid{grid-template-columns:repeat(2,1fr)}}
@media (max-width:767px){.card-grid:has(> :last-child:nth-child(1)) .card{grid-template-columns:1fr}.card-grid:has(> :last-child:nth-child(1)) .card-img-wrap{min-height:0}}
@media (max-width:640px){.card-grid{grid-template-columns:1fr}}
`;

/** Trang danh sách một nhánh entity: tiêu đề nhánh (h1) trên nền gradient
 *  cát–xanh, hàng viên lọc term, lưới thẻ 3 cột, tổng số.
 *  Lưới CO theo số mục thật: 1 mục thì thẻ nằm ngang, không để một thẻ dọc lẻ loi. */
function EntityIndex({
  title,
  description,
  entities = [],
  terms = [],
  activeTerm = '',
  totalCount,
  emptyMessage,
  onNavigate
}) {
  const count = totalCount != null ? totalCount : entities.length;
  const nav = href => onNavigate ? e => {
    e.preventDefault();
    onNavigate(href);
  } : undefined;
  return /*#__PURE__*/React.createElement("div", {
    className: "entity-index"
  }, /*#__PURE__*/React.createElement("style", null, css), /*#__PURE__*/React.createElement("div", {
    className: "entity-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "entity-title"
  }, title), /*#__PURE__*/React.createElement("span", {
    className: "entity-underline",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("p", {
    className: "entity-desc"
  }, description))), terms.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "term-filter"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("div", {
    className: "term-pills"
  }, terms.map(t => /*#__PURE__*/React.createElement("a", {
    href: t.href || '#',
    className: "term-pill",
    key: t.slug || t.name,
    "aria-current": activeTerm === (t.slug || t.name) ? 'true' : undefined,
    onClick: nav(t.href || '#')
  }, t.name))))), /*#__PURE__*/React.createElement("div", {
    className: "entity-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, entities.length > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "card-grid"
  }, entities.map(e => /*#__PURE__*/React.createElement(__ds_scope.Card, {
    key: e.slug,
    title: e.title,
    summary: e.summary,
    href: e.href || '#',
    image: e.image,
    imageAlt: e.imageAlt,
    badge: e.badge,
    badgeVariant: e.badgeVariant || 'default',
    priceLabel: e.priceLabel,
    authorLabel: e.authorLabel,
    onClick: nav(e.href || '#')
  }))), /*#__PURE__*/React.createElement("p", {
    className: "entity-count"
  }, count, " k\u1EBFt qu\u1EA3")) : /*#__PURE__*/React.createElement(__ds_scope.EmptyState, {
    message: emptyMessage
  }))));
}
Object.assign(__ds_scope, { EntityIndex });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/listing/EntityIndex.jsx", error: String((e && e.message) || e) }); }

// components/map/MapView.jsx
try { (() => {
const css = `
.mapview{position:relative;border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--c-border);background:linear-gradient(180deg,var(--c-primary-soft),color-mix(in srgb,var(--c-sea) 14%,var(--c-primary-soft)))}
.mapview-frame{width:100%;height:100%;border:0;display:block}
.mapview-fallback{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--s2);color:var(--c-text-muted);font-size:var(--fs-sm);text-align:center;padding:var(--s4)}
.mapview-pin{font-size:1.75rem;line-height:1}
.mapview-coords{font-family:var(--font-ui);font-size:var(--fs-label);color:var(--c-text-muted)}
.mapview-title{font-family:var(--font-display);font-weight:var(--fw-700);font-size:var(--fs-sm);color:var(--c-text)}
`;

/** Bản đồ một điểm. `embedSrc` rỗng → khung dự phòng có toạ độ, KHÔNG vẽ bản
 *  đồ giả: bản đồ sai còn tệ hơn không có bản đồ. */
function MapView({
  geo,
  title,
  height = 240,
  markers = [],
  embedSrc = ''
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "mapview",
    style: {
      height: height + 'px'
    }
  }, /*#__PURE__*/React.createElement("style", null, css), embedSrc ? /*#__PURE__*/React.createElement("iframe", {
    className: "mapview-frame",
    src: embedSrc,
    title: title,
    loading: "lazy",
    style: {
      height: height + 'px'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    className: "mapview-fallback"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mapview-pin",
    "aria-hidden": "true"
  }, "\uD83D\uDCCD"), /*#__PURE__*/React.createElement("span", {
    className: "mapview-title"
  }, title), geo && /*#__PURE__*/React.createElement("span", {
    className: "mapview-coords"
  }, geo.lat.toFixed(4), ", ", geo.lng.toFixed(4)), markers.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "mapview-coords"
  }, markers.length, " \u0111i\u1EC3m \u0111\xE1nh d\u1EA5u")));
}
Object.assign(__ds_scope, { MapView });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/MapView.jsx", error: String((e && e.message) || e) }); }

// components/map/RouteMap.jsx
try { (() => {
const css = `
.routemap{border:1px solid var(--c-border);border-radius:var(--radius-md);overflow:hidden;background:var(--c-surface-alt)}
.routemap-frame{width:100%;border:0;display:block}
.routemap-list{list-style:none;margin:0;padding:var(--s4);display:flex;flex-direction:column;gap:var(--s3)}
.routemap-item{display:flex;align-items:flex-start;gap:var(--s3)}
.routemap-dot{flex:none;width:22px;height:22px;border-radius:var(--radius-pill);background:var(--c-primary);color:var(--c-text-inverse);font-family:var(--font-ui);font-size:var(--fs-badge);font-weight:var(--fw-700);display:flex;align-items:center;justify-content:center;margin-top:2px}
.routemap-name{font-family:var(--font-display);font-size:var(--fs-sm);font-weight:var(--fw-700);color:var(--c-text)}
.routemap-time{font-size:var(--fs-label);color:var(--c-text-muted)}
`;

/** Lộ trình xe đưa đón: bản đồ nhúng (nếu có) + danh sách điểm đón theo thứ tự
 *  giờ đón. Không có bản đồ thì danh sách vẫn đủ dùng. */
function RouteMap({
  points = [],
  height = 260,
  embedSrc = ''
}) {
  if (points.length === 0 && !embedSrc) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "routemap"
  }, /*#__PURE__*/React.createElement("style", null, css), embedSrc && /*#__PURE__*/React.createElement("iframe", {
    className: "routemap-frame",
    src: embedSrc,
    title: "L\u1ED9 tr\xECnh xe \u0111\u01B0a \u0111\xF3n",
    loading: "lazy",
    style: {
      height: height + 'px'
    }
  }), /*#__PURE__*/React.createElement("ol", {
    className: "routemap-list"
  }, points.map((p, i) => /*#__PURE__*/React.createElement("li", {
    className: "routemap-item",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "routemap-dot",
    "aria-hidden": "true"
  }, i + 1), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "routemap-name"
  }, p.name), p.time && /*#__PURE__*/React.createElement("span", {
    className: "routemap-time"
  }, " \xB7 ", p.time), p.note && /*#__PURE__*/React.createElement("div", {
    className: "routemap-time"
  }, p.note))))));
}
Object.assign(__ds_scope, { RouteMap });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/map/RouteMap.jsx", error: String((e && e.message) || e) }); }

// components/templates/ArticleDetail.jsx
try { (() => {
/** Trang chi tiết CẨM NANG. Delta: không có giá, không FactStrip — dùng
 *  InfoCard trong sidebar (DR-046); đoạn mở bật `data-speakable` vì chỉ Article
 *  khai speakable trong JSON-LD. */
function ArticleDetail({
  data = {},
  nearby = []
}) {
  const {
    title,
    summary,
    image,
    gallery = [],
    badges = [],
    crumbs = [],
    infoRows = [],
    blocks = [],
    faq = [],
    updatedAt,
    sameAsHref,
    sameAsLabel,
    author = {},
    approvedBy,
    contentProvenance
  } = data;
  const sidebarCards = [{
    name: 'info',
    visible: infoRows.length > 0,
    content: /*#__PURE__*/React.createElement(__ds_scope.InfoCard, {
      rows: infoRows
    })
  }];
  return /*#__PURE__*/React.createElement(__ds_scope.DetailLayout, {
    title: title,
    image: image,
    gallery: gallery,
    crumbs: crumbs,
    badges: badges,
    summary: summary,
    speakable: true,
    sidebarCards: sidebarCards,
    updatedAt: updatedAt,
    sameAsHref: sameAsHref,
    sameAsLabel: sameAsLabel,
    nearbyTitle: "C\u1EA9m nang li\xEAn quan",
    nearby: nearby
  }, /*#__PURE__*/React.createElement(__ds_scope.Body, {
    blocks: blocks
  }), faq.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.FAQ, {
    faq: faq,
    id: "cau-hoi",
    contained: false
  }), /*#__PURE__*/React.createElement(__ds_scope.AuthorityMeta, {
    author: author,
    approvedBy: approvedBy,
    contentProvenance: contentProvenance,
    sameAs: sameAsHref ? [sameAsHref] : []
  }));
}
Object.assign(__ds_scope, { ArticleDetail });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/templates/ArticleDetail.jsx", error: String((e && e.message) || e) }); }

// components/templates/AttractionDetail.jsx
try { (() => {
/** Trang chi tiết ĐIỂM THAM QUAN. Delta: dải giá vé trong thân bài, bản đồ toạ
 *  độ trong sidebar, nhãn CTA là "Đặt vé" (uiCopy.bookTicket). */
function AttractionDetail({
  data = {},
  contact = {},
  nearby = []
}) {
  const {
    title,
    summary,
    image,
    gallery = [],
    badges = [],
    facts = [],
    crumbs = [],
    priceText,
    priceLabel,
    isFree = false,
    asOf,
    ctaHref,
    ctaLabel = 'Đặt vé',
    overview = [],
    highlights = [],
    tips = [],
    faq = [],
    images = [],
    geo,
    updatedAt,
    sameAsHref,
    sameAsLabel
  } = data;
  const jumpLinks = [overview.length > 0 && {
    href: '#tong-quan',
    label: 'Tổng quan'
  }, highlights.length > 0 && {
    href: '#diem-noi-bat',
    label: 'Điểm nổi bật'
  }, tips.length > 0 && {
    href: '#kinh-nghiem',
    label: 'Kinh nghiệm'
  }, faq.length > 0 && {
    href: '#cau-hoi',
    label: 'Câu hỏi'
  }].filter(Boolean);
  const sidebarCards = [{
    name: 'booking',
    visible: !!(priceText || ctaHref),
    content: /*#__PURE__*/React.createElement(__ds_scope.BookingCTA, {
      priceText: priceText,
      asOf: asOf,
      ctaUrl: ctaHref,
      ctaLabel: ctaLabel
    })
  }, {
    name: 'map',
    visible: !!geo,
    content: geo ? /*#__PURE__*/React.createElement(__ds_scope.MapView, {
      geo: geo,
      title: title
    }) : null
  }, {
    name: 'about',
    visible: !!(contact.zaloUrl || contact.hotline),
    content: /*#__PURE__*/React.createElement(__ds_scope.ContactChannels, {
      zaloUrl: contact.zaloUrl,
      hotline: contact.hotline
    })
  }];
  return /*#__PURE__*/React.createElement(__ds_scope.DetailLayout, {
    title: title,
    image: image,
    gallery: gallery,
    crumbs: crumbs,
    badges: badges,
    summary: summary,
    facts: facts,
    jumpLinks: jumpLinks,
    priceLabel: priceLabel,
    ctaHref: ctaHref,
    ctaLabel: ctaLabel,
    sidebarCards: sidebarCards,
    updatedAt: updatedAt,
    sameAsHref: sameAsHref,
    sameAsLabel: sameAsLabel,
    nearbyTitle: "G\u1EA7n \u0111\xE2y",
    nearby: nearby
  }, overview.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.Section, {
    heading: "T\u1ED5ng quan",
    id: "tong-quan",
    contained: false
  }, /*#__PURE__*/React.createElement(__ds_scope.Body, {
    blocks: overview
  })), (priceLabel || isFree) && /*#__PURE__*/React.createElement(__ds_scope.PriceDisplay, {
    label: priceLabel,
    isFree: isFree,
    ctaLabel: "Mua v\xE9",
    ctaHref: ctaHref || '#'
  }), highlights.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.Section, {
    heading: "\u0110i\u1EC3m n\u1ED5i b\u1EADt",
    id: "diem-noi-bat",
    contained: false
  }, /*#__PURE__*/React.createElement(__ds_scope.Body, {
    blocks: highlights
  })), images.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.Gallery, {
    images: images,
    contained: false
  }), tips.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.Section, {
    heading: "Kinh nghi\u1EC7m \u0111i",
    id: "kinh-nghiem",
    contained: false
  }, /*#__PURE__*/React.createElement(__ds_scope.Body, {
    blocks: tips
  })), faq.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.FAQ, {
    faq: faq,
    id: "cau-hoi",
    contained: false
  }));
}
Object.assign(__ds_scope, { AttractionDetail });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/templates/AttractionDetail.jsx", error: String((e && e.message) || e) }); }

// components/templates/TourDetail.jsx
try { (() => {
/** Trang chi tiết TOUR. Delta so với khung chung: thanh dính luôn có giá + CTA
 *  Zalo, sidebar mở đầu bằng khối đặt chỗ, thân bài có lịch trình và điểm đón. */
function TourDetail({
  data = {},
  contact = {},
  nearby = [],
  onNavigate
}) {
  const {
    title,
    summary,
    image,
    gallery = [],
    badges = [],
    facts = [],
    crumbs = [],
    priceText,
    priceLabel,
    asOf,
    ctaHref,
    ctaLabel = 'Đặt vé qua Zalo',
    itinerary = [],
    included = [],
    notes = [],
    faq = [],
    pickupPoints = [],
    updatedAt,
    sameAsHref,
    sameAsLabel
  } = data;
  const jumpLinks = [itinerary.length > 0 && {
    href: '#lich-trinh',
    label: 'Lịch trình'
  }, included.length > 0 && {
    href: '#gia-bao-gom',
    label: 'Giá bao gồm'
  }, pickupPoints.length > 0 && {
    href: '#diem-don',
    label: 'Điểm đón'
  }, faq.length > 0 && {
    href: '#cau-hoi',
    label: 'Câu hỏi'
  }].filter(Boolean);
  const sidebarCards = [{
    name: 'booking',
    visible: !!(priceText || ctaHref),
    content: /*#__PURE__*/React.createElement(__ds_scope.BookingCTA, {
      priceText: priceText,
      asOf: asOf,
      ctaUrl: ctaHref,
      ctaLabel: ctaLabel
    })
  }, {
    name: 'about',
    visible: !!(contact.zaloUrl || contact.hotline),
    content: /*#__PURE__*/React.createElement(__ds_scope.ContactChannels, {
      zaloUrl: contact.zaloUrl,
      hotline: contact.hotline
    })
  }, {
    name: 'map',
    visible: pickupPoints.length > 0,
    content: /*#__PURE__*/React.createElement(__ds_scope.RouteMap, {
      points: pickupPoints
    })
  }];
  return /*#__PURE__*/React.createElement(__ds_scope.DetailLayout, {
    title: title,
    image: image,
    gallery: gallery,
    crumbs: crumbs,
    badges: badges,
    summary: summary,
    facts: facts,
    jumpLinks: jumpLinks,
    priceLabel: priceLabel,
    ctaHref: ctaHref,
    ctaLabel: ctaLabel,
    sidebarCards: sidebarCards,
    updatedAt: updatedAt,
    sameAsHref: sameAsHref,
    sameAsLabel: sameAsLabel,
    nearbyTitle: "Tour kh\xE1c",
    nearby: nearby
  }, itinerary.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.Section, {
    heading: "L\u1ECBch tr\xECnh",
    id: "lich-trinh",
    contained: false
  }, /*#__PURE__*/React.createElement(__ds_scope.Body, {
    blocks: itinerary
  })), included.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.Section, {
    heading: "Gi\xE1 bao g\u1ED3m",
    id: "gia-bao-gom",
    contained: false
  }, /*#__PURE__*/React.createElement(__ds_scope.Body, {
    blocks: included
  })), notes.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.Section, {
    heading: "L\u01B0u \xFD",
    contained: false
  }, /*#__PURE__*/React.createElement(__ds_scope.Body, {
    blocks: notes
  })), faq.length > 0 && /*#__PURE__*/React.createElement(__ds_scope.FAQ, {
    faq: faq,
    id: "cau-hoi",
    contained: false
  }));
}
Object.assign(__ds_scope, { TourDetail });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/templates/TourDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/App.jsx
try { (() => {
const {
  useState
} = React;
const D = window.TD_DATA;
const NS = window.TourODesignSystem_8db7ce;
const {
  Header,
  Footer,
  HomeHero,
  HomeTourGrid,
  HomeHubGrid,
  HomeTrustBar,
  HomeStatsBand,
  Section,
  Card,
  EntityIndex,
  TourDetail,
  AttractionDetail,
  ArticleDetail,
  WaveDivider,
  FAQ
} = NS;
const LANGS = [{
  code: 'vi',
  label: 'VI'
}, {
  code: 'en',
  label: 'EN',
  href: '/en/'
}];
function Chrome({
  path,
  go,
  children
}) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Header, {
    currentPath: path,
    logoSrc: D.logo,
    brandName: D.brand.name,
    languages: LANGS,
    onNavigate: go
  }), /*#__PURE__*/React.createElement("main", {
    id: "main-content"
  }, children), /*#__PURE__*/React.createElement(Footer, {
    logoSrc: D.logo,
    brandName: D.brand.name,
    legalName: D.brand.legalName,
    foundedYear: D.brand.foundedYear,
    channels: [{
      label: D.contact.hotline,
      href: 'tel:' + D.contact.hotline.replace(/\s+/g, '')
    }, {
      label: 'Chat Zalo',
      href: D.contact.zaloUrl,
      external: true
    }, {
      label: D.contact.email,
      href: 'mailto:' + D.contact.email
    }]
  }));
}
function Home({
  go
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(HomeHero, {
    eyebrow: "C\u1EA9m nang \u0111\u1ECBa ph\u01B0\u01A1ng",
    title: "Tour \u0111\u1EA3o Nha Trang, \u0111\xF3n t\u1EADn kh\xE1ch s\u1EA1n",
    summary: "Kh\u1EDFi h\xE0nh h\u1EB1ng ng\xE0y t\u1EEB Nha Trang. H\u01B0\u1EDBng d\u1EABn vi\xEAn \u0111i c\xF9ng su\u1ED1t chuy\u1EBFn, b\xE1o gi\xE1 tr\u1ECDn g\xF3i, ch\u1ED1t ch\u1ED7 qua Zalo v\u1EDBi ng\u01B0\u1EDDi th\u1EADt.",
    image: "../../assets/img/ht-hero.jpg",
    imageAlt: "V\u1ECBnh Nha Trang nh\xECn t\u1EEB tr\xEAn \u0111\u1EA3o",
    stampText: 'Tour\nĐảo',
    stampYear: "2026",
    imageCredit: "\u1EA2nh: v\u1ECBnh Nha Trang",
    ctaLabel: "\u0110\u1EB7t v\xE9 qua Zalo",
    ctaHref: D.contact.zaloUrl
  }), /*#__PURE__*/React.createElement(HomeTourGrid, {
    tours: D.tours.slice(0, 3),
    total: D.tours.length,
    indexHref: "/tour/",
    onNavigate: go
  }), /*#__PURE__*/React.createElement(HomeHubGrid, {
    counts: {
      'hub-kham-pha': 18,
      'hub-luu-tru': 12,
      'hub-di-lai': 6
    }
  }), /*#__PURE__*/React.createElement(HomeTrustBar, {
    heading: "V\xEC sao ch\u1ECDn Tour \u0110\u1EA3o"
  }), /*#__PURE__*/React.createElement(Section, {
    heading: "\u0110i\u1EC3m tham quan n\u1ED5i b\u1EADt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kit-grid"
  }, D.attractions.map(a => /*#__PURE__*/React.createElement(Card, {
    key: a.slug,
    title: a.title,
    summary: a.summary,
    image: a.image,
    badge: a.badge,
    href: '/diem-tham-quan/' + a.slug + '/',
    onClick: e => {
      e.preventDefault();
      go('/diem-tham-quan/hon-tam/');
    }
  })))), /*#__PURE__*/React.createElement(HomeStatsBand, {
    stats: [{
      value: '7',
      label: 'tuyến tour đang khai thác'
    }, {
      value: '2026',
      label: 'năm thành lập',
      note: 'Công ty TNHH Tour Đảo'
    }, {
      value: '5',
      label: 'ngôn ngữ hỗ trợ'
    }, {
      value: '100%',
      label: 'xe đón tận khách sạn',
      note: 'nội thành Nha Trang'
    }]
  }), /*#__PURE__*/React.createElement(Section, {
    heading: "C\u1EA9m nang b\u1EA3n \u0111\u1ECBa"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kit-grid kit-grid--3"
  }, D.articles.map(a => /*#__PURE__*/React.createElement(Card, {
    key: a.slug,
    title: a.title,
    summary: a.summary,
    image: a.image,
    badge: a.badge,
    badgeVariant: "author",
    authorLabel: a.authorLabel,
    href: '/cam-nang/' + a.slug + '/',
    onClick: e => {
      e.preventDefault();
      go('/cam-nang/di-nha-trang-mua-nao/');
    }
  })))), /*#__PURE__*/React.createElement(FAQ, {
    heading: "C\xE2u h\u1ECFi th\u01B0\u1EDDng g\u1EB7p",
    faq: [{
      question: 'Đặt tour thế nào?',
      answer: 'Nhắn Zalo hoặc gọi hotline. Chúng tôi xác nhận chỗ, hẹn giờ đón, rồi chốt cách thanh toán.'
    }, {
      question: 'Xe đón ở đâu?',
      answer: 'Tận khách sạn trong nội thành Nha Trang. Khách ở Bãi Dài hẹn trước một ngày.'
    }, {
      question: 'Huỷ tour có mất tiền không?',
      answer: 'Huỷ trước 24 giờ không mất phí. Cảng cấm ra khơi thì chuyển ngày hoặc hoàn tiền.'
    }]
  }));
}
function TourIndex({
  go
}) {
  const [term, setTerm] = useState('');
  const list = term ? D.tours.filter(t => t.term === term) : D.tours;
  const terms = [{
    name: 'Tất cả',
    slug: ''
  }, {
    name: 'Trong ngày',
    slug: 'trong-ngay'
  }, {
    name: 'Nửa ngày',
    slug: 'nua-ngay'
  }, {
    name: 'Ghép đoàn',
    slug: 'ghep-doan'
  }].map(t => ({
    ...t,
    href: '#' + t.slug
  }));
  return /*#__PURE__*/React.createElement(EntityIndex, {
    title: "Tour",
    description: "Tour bi\u1EC3n \u0111\u1EA3o kh\u1EDFi h\xE0nh h\u1EB1ng ng\xE0y t\u1EEB Nha Trang, c\xF3 xe \u0111\xF3n t\u1EADn kh\xE1ch s\u1EA1n n\u1ED9i th\xE0nh.",
    terms: terms,
    activeTerm: term,
    totalCount: list.length,
    entities: list.map(t => ({
      ...t,
      href: '/tour/' + t.slug + '/'
    })),
    emptyMessage: "Ch\u01B0a c\xF3 tour n\xE0o trong m\u1EE5c n\xE0y.",
    onNavigate: href => {
      if (href.startsWith('#')) setTerm(href.slice(1));else go('/tour/3-dao/');
    }
  });
}
function AttractionIndex({
  go
}) {
  return /*#__PURE__*/React.createElement(EntityIndex, {
    title: "\u0110i\u1EC3m tham quan",
    description: "\u0110\u1EA3o, b\xE3i bi\u1EC3n v\xE0 di t\xEDch quanh v\u1ECBnh Nha Trang, k\xE8m gi\u1EDD m\u1EDF c\u1EEDa v\xE0 c\xE1ch \u0111i.",
    totalCount: D.attractions.length,
    entities: D.attractions.map(a => ({
      ...a,
      href: '/diem-tham-quan/' + a.slug + '/'
    })),
    onNavigate: () => go('/diem-tham-quan/hon-tam/')
  });
}
function GuideHub({
  go
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "kit-hub-head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "container"
  }, /*#__PURE__*/React.createElement("p", {
    className: "kit-eyebrow"
  }, "HUB KH\xC1M PH\xC1"), /*#__PURE__*/React.createElement("h1", {
    className: "kit-hub-title"
  }, "Kh\xE1m ph\xE1 Nha Trang"), /*#__PURE__*/React.createElement("p", {
    className: "kit-hub-sub"
  }, "Ch\u1ECDn chuy\xEAn m\u1EE5c b\u1EA1n c\u1EA7n \u2014 m\u1ED7i hub c\xF3 \u0111\u1EA7y \u0111\u1EE7 danh s\xE1ch, b\u1ED9 l\u1ECDc v\xE0 th\xF4ng tin th\u1EF1c t\u1EBF."))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--c-primary)'
    }
  }, /*#__PURE__*/React.createElement(WaveDivider, {
    fill: "var(--c-surface)"
  })), D.hubSections.map(s => /*#__PURE__*/React.createElement(Section, {
    key: s.key,
    heading: s.title
  }, /*#__PURE__*/React.createElement("div", {
    className: 'kit-grid' + (s.key === 'articles' ? ' kit-grid--3' : '')
  }, D[s.key].slice(0, 4).map(it => /*#__PURE__*/React.createElement(Card, {
    key: it.slug,
    title: it.title,
    summary: it.summary,
    image: it.image,
    badge: it.badge,
    priceLabel: it.priceLabel,
    authorLabel: it.authorLabel,
    badgeVariant: s.key === 'articles' ? 'author' : 'default',
    href: s.href + it.slug + '/',
    onClick: e => {
      e.preventDefault();
      go(s.key === 'tours' ? '/tour/3-dao/' : s.key === 'articles' ? '/cam-nang/di-nha-trang-mua-nao/' : '/diem-tham-quan/hon-tam/');
    }
  }))), /*#__PURE__*/React.createElement("p", {
    className: "kit-viewall"
  }, /*#__PURE__*/React.createElement("a", {
    href: s.href,
    onClick: e => {
      e.preventDefault();
      go(s.key === 'tours' ? '/tour/' : '/diem-tham-quan/');
    }
  }, "Xem t\u1EA5t c\u1EA3 \u2192")))));
}
const NEARBY_TOURS = D.tours.slice(1, 4).map(t => ({
  title: t.title,
  image: t.image,
  categoryBadge: 'Tour',
  href: '/tour/' + t.slug + '/'
}));
const NEARBY_PLACES = D.attractions.slice(1).map(a => ({
  title: a.title,
  image: a.image,
  categoryBadge: a.badge,
  distance: 'cách 4,2 km'
}));
const NEARBY_GUIDES = D.articles.slice(1).map(a => ({
  title: a.title,
  image: a.image,
  categoryBadge: 'Cẩm nang'
}));
function App() {
  const [path, setPath] = useState('/');
  const go = p => {
    setPath(p);
    window.scrollTo(0, 0);
  };
  let screen;
  if (path === '/') screen = /*#__PURE__*/React.createElement(Home, {
    go: go
  });else if (path === '/tour/') screen = /*#__PURE__*/React.createElement(TourIndex, {
    go: go
  });else if (path === '/diem-tham-quan/') screen = /*#__PURE__*/React.createElement(AttractionIndex, {
    go: go
  });else if (path === '/kham-pha/') screen = /*#__PURE__*/React.createElement(GuideHub, {
    go: go
  });else if (path.startsWith('/tour/')) screen = /*#__PURE__*/React.createElement(TourDetail, {
    data: D.tourDetail,
    contact: D.contact,
    nearby: NEARBY_TOURS
  });else if (path.startsWith('/diem-tham-quan/')) screen = /*#__PURE__*/React.createElement(AttractionDetail, {
    data: D.attractionDetail,
    contact: D.contact,
    nearby: NEARBY_PLACES
  });else if (path.startsWith('/cam-nang/')) screen = /*#__PURE__*/React.createElement(ArticleDetail, {
    data: D.articleDetail,
    nearby: NEARBY_GUIDES
  });else screen = /*#__PURE__*/React.createElement(Home, {
    go: go
  });
  return /*#__PURE__*/React.createElement(Chrome, {
    path: path,
    go: go
  }, screen);
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/data.js
try { (() => {
// Dữ liệu mẫu cho UI kit. Nhãn giao diện lấy nguyên văn từ uiCopy.ts / HOME_COPY
// của repo tourdaovn; nội dung tour là ví dụ có thật về tuyến (Hòn Mun, Hòn Tằm,
// Vinpearl) nhưng giá và giờ là số minh hoạ.
const IMG = n => '../../assets/img/' + n + '.jpg';
window.TD_DATA = {
  brand: {
    name: 'Tour Đảo',
    legalName: 'Công ty TNHH Tour Đảo',
    foundedYear: 2026
  },
  contact: {
    zaloUrl: 'https://zalo.me/0000000000',
    hotline: '0258 123 456',
    email: 'lienhe@tourdao.vn'
  },
  logo: '../../assets/logo-tourdao.png',
  tours: [{
    slug: '3-dao',
    title: 'Tour 3 đảo Nha Trang',
    duration: 'Trong ngày · 8 giờ',
    image: IMG('tour-hero'),
    summary: 'Hòn Mun, Hòn Một, Hòn Tằm trong một ngày. Xe đón tận khách sạn nội thành, ăn trưa trên tàu.',
    badge: 'Trong ngày',
    priceLabel: '450.000 ₫',
    term: 'trong-ngay'
  }, {
    slug: 'hon-tam',
    title: 'Hòn Tằm nửa ngày',
    duration: 'Nửa ngày · 4 giờ',
    image: IMG('ht-g1'),
    summary: 'Tắm biển, tắm bùn khoáng, về lại khách sạn trước 13h.',
    badge: 'Nửa ngày',
    priceLabel: '380.000 ₫',
    term: 'nua-ngay'
  }, {
    slug: 'lan-bien-hon-mun',
    title: 'Lặn biển Hòn Mun',
    duration: 'Trong ngày · 6 giờ',
    image: IMG('ht-g3'),
    summary: 'Hai lần lặn kèm huấn luyện viên, có bảo hiểm và thiết bị.',
    badge: 'Ghép đoàn',
    priceLabel: '890.000 ₫',
    term: 'ghep-doan'
  }, {
    slug: 'vinpearl',
    title: 'Vinpearl một ngày',
    duration: 'Trong ngày · 9 giờ',
    image: IMG('ht-g2'),
    summary: 'Vé cáp treo, công viên nước và khu vui chơi. Xe đón hai chiều.',
    badge: 'Trong ngày',
    priceLabel: '980.000 ₫',
    term: 'trong-ngay'
  }, {
    slug: 'dao-binh-hung',
    title: 'Đảo Bình Hưng',
    duration: 'Trong ngày · 10 giờ',
    image: IMG('ht-g4'),
    summary: 'Ra khỏi vịnh Nha Trang, bãi đá trứng và làng chài Bình Hưng.',
    badge: 'Ghép đoàn',
    priceLabel: '650.000 ₫',
    term: 'ghep-doan'
  }],
  attractions: [{
    slug: 'hon-tam',
    title: 'Hòn Tằm',
    summary: 'Bãi tắm nước trong, khu nghỉ dưỡng và dịch vụ tắm bùn khoáng.',
    image: IMG('ht-g1'),
    badge: 'Đảo'
  }, {
    slug: 'hon-mun',
    title: 'Hòn Mun',
    summary: 'Vùng lõi bảo tồn biển, rạn san hô dày nhất vịnh Nha Trang.',
    image: IMG('ht-g3'),
    badge: 'Đảo'
  }, {
    slug: 'thap-ba-ponagar',
    title: 'Tháp Bà Ponagar',
    summary: 'Cụm đền tháp Chăm thế kỷ VIII bên bờ sông Cái.',
    image: IMG('ht-g2'),
    badge: 'Di tích'
  }, {
    slug: 'bai-dai',
    title: 'Bãi Dài',
    summary: 'Bãi cát trải dài phía nam sân bay Cam Ranh.',
    image: IMG('ht-g4'),
    badge: 'Bãi biển'
  }],
  articles: [{
    slug: 'di-nha-trang-mua-nao',
    title: 'Đi Nha Trang mùa nào?',
    summary: 'Tháng 2 đến tháng 8 biển lặng, tàu ra đảo chạy đủ chuyến.',
    image: IMG('ht-g2'),
    badge: 'Cẩm nang',
    authorLabel: 'Ban biên tập'
  }, {
    slug: 'di-lai-trong-thanh-pho',
    title: 'Đi lại trong thành phố',
    summary: 'Xe bus số 4 và 18, taxi, thuê xe máy — giá và giờ chạy.',
    image: IMG('ht-g4'),
    badge: 'Cẩm nang',
    authorLabel: 'Ban biên tập'
  }, {
    slug: 'an-gi-o-nha-trang',
    title: 'Ăn gì ở Nha Trang',
    summary: 'Bún cá sứa, bánh căn, nem nướng — quán và khung giờ.',
    image: IMG('ht-g1'),
    badge: 'Cẩm nang',
    authorLabel: 'Ban biên tập'
  }],
  tourDetail: {
    title: 'Tour 3 đảo Nha Trang',
    summary: 'Hòn Mun, Hòn Một, Hòn Tằm trong một ngày. Xe đón tận khách sạn nội thành, ăn trưa trên tàu, hướng dẫn viên đi cùng suốt chuyến.',
    image: IMG('tour-hero'),
    gallery: ['ht-g1', 'ht-g2', 'ht-g3', 'ht-g4'].map(n => ({
      src: IMG(n),
      alt: ''
    })),
    crumbs: [{
      label: 'Trang chủ',
      href: '/'
    }, {
      label: 'Tour',
      href: '/tour/'
    }, {
      label: 'Tour 3 đảo Nha Trang'
    }],
    badges: ['Tour trong ngày', 'Ghép đoàn'],
    facts: [{
      field: 'thoiGian',
      icon: '⏱️',
      label: 'Thời gian',
      value: '8 giờ'
    }, {
      field: 'khoiHanh',
      icon: '🕗',
      label: 'Khởi hành',
      value: '07:45 hằng ngày'
    }, {
      field: 'diemDon',
      icon: '🚐',
      label: 'Điểm đón',
      value: 'Khách sạn nội thành'
    }, {
      field: 'quyMo',
      icon: '👥',
      label: 'Quy mô',
      value: 'Ghép đoàn tối đa 25 khách'
    }, {
      field: 'ngonNgu',
      icon: '💬',
      label: 'Hướng dẫn viên',
      value: 'Tiếng Việt, tiếng Anh'
    }, {
      field: 'phuongTien',
      icon: '⛵',
      label: 'Phương tiện',
      value: 'Tàu gỗ có mái, áo phao đủ'
    }],
    priceText: '450.000 ₫/khách',
    priceLabel: '450.000 ₫',
    asOf: 'Giá cập nhật 08/2026',
    ctaHref: 'https://zalo.me/0000000000',
    ctaLabel: 'Đặt vé qua Zalo',
    itinerary: [{
      text: '07:45 — xe đón tại khách sạn nội thành theo giờ đã hẹn.'
    }, {
      text: '08:30 — tàu rời cảng Cầu Đá, chặng đầu đi Hòn Mun.'
    }, {
      text: '09:15 — lặn ống thở ngắm san hô ở vùng lõi bảo tồn.'
    }, {
      text: '12:00 — ăn trưa trên tàu, neo tại Hòn Một.'
    }, {
      text: '14:00 — Hòn Tằm: tắm biển, ghế nằm bãi, tắm tráng nước ngọt.'
    }, {
      text: '16:30 — về cảng, xe trả khách tại khách sạn.'
    }],
    included: [{
      text: 'Giá bao gồm: xe đưa đón hai chiều, vé tàu, vé tham quan ba đảo, bữa trưa, thiết bị lặn ống thở, hướng dẫn viên, bảo hiểm chuyến đi.'
    }, {
      text: 'Không bao gồm: đồ uống ngoài bữa trưa, dịch vụ tắm bùn ở Hòn Tằm, tiền tip.'
    }],
    notes: [{
      text: 'Cảng cấm ra khơi vì thời tiết thì chuyển ngày hoặc hoàn tiền, không thu thêm phí.'
    }, {
      text: 'Khách ở Bãi Dài cần hẹn trước một ngày vì lệch tuyến xe nội thành.'
    }],
    faq: [{
      question: 'Mưa bão thì sao?',
      answer: 'Cảng cấm ra khơi thì chuyển ngày hoặc hoàn tiền, không thu thêm phí.'
    }, {
      question: 'Trẻ nhỏ đi được không?',
      answer: 'Được. Trẻ dưới 1 mét tính nửa giá, tàu có áo phao cỡ nhỏ.'
    }, {
      question: 'Có đón ở Bãi Dài không?',
      answer: 'Có, cần hẹn trước một ngày vì lệch tuyến xe nội thành.'
    }],
    pickupPoints: [{
      name: 'Khách sạn khu Trần Phú',
      time: '07:45'
    }, {
      name: 'Khu Hùng Vương – Biệt Thự',
      time: '07:55'
    }, {
      name: 'Cảng Cầu Đá',
      time: '08:15',
      note: 'Điểm lên tàu'
    }],
    updatedAt: '24/08/2026',
    sameAsHref: 'https://khanhhoa.gov.vn',
    sameAsLabel: 'khanhhoa.gov.vn'
  },
  attractionDetail: {
    title: 'Hòn Tằm',
    summary: 'Đảo gần bờ nhất trong vịnh Nha Trang, có bãi tắm nước trong, khu nghỉ dưỡng và dịch vụ tắm bùn khoáng.',
    image: IMG('ht-hero'),
    gallery: ['ht-g1', 'ht-g2', 'ht-g3', 'ht-g4'].map(n => ({
      src: IMG(n),
      alt: ''
    })),
    crumbs: [{
      label: 'Trang chủ',
      href: '/'
    }, {
      label: 'Khám phá',
      href: '/kham-pha/'
    }, {
      label: 'Điểm tham quan',
      href: '/diem-tham-quan/'
    }, {
      label: 'Hòn Tằm'
    }],
    badges: ['Đảo', 'Trong vịnh'],
    facts: [{
      field: 'viTri',
      icon: '📍',
      label: 'Vị trí',
      value: 'Vịnh Nha Trang, cách bờ 7 km'
    }, {
      field: 'thoiGianDi',
      icon: '⛵',
      label: 'Thời gian ra đảo',
      value: '15 phút tàu từ cảng Cầu Đá'
    }, {
      field: 'gioMoCua',
      icon: '🕗',
      label: 'Giờ mở cửa',
      value: '07:30 – 17:00'
    }, {
      field: 'phuHop',
      icon: '👨‍👩‍👧',
      label: 'Phù hợp',
      value: 'Gia đình có trẻ nhỏ'
    }],
    priceText: '150.000 ₫/vé vào đảo',
    priceLabel: '150.000 ₫',
    asOf: 'Giá cập nhật 08/2026',
    ctaHref: 'https://zalo.me/0000000000',
    ctaLabel: 'Đặt vé',
    overview: [{
      text: 'Hòn Tằm nằm trong vịnh Nha Trang, cách cảng Cầu Đá khoảng 15 phút tàu. Đảo có một bãi tắm chính hướng tây, nước lặng gần như cả năm, nên là điểm đầu tiên nhiều gia đình chọn khi mới tới thành phố.'
    }, {
      style: 'h3',
      text: 'Đi bằng gì'
    }, {
      text: 'Tàu gỗ chạy tuyến từ cảng Cầu Đá theo chuyến, hoặc đi kèm tour ba đảo. Mua vé tại cảng vào mùa cao điểm nên tới trước 08:00.'
    }],
    highlights: [{
      text: 'Bãi tắm nước lặng, có ghế nằm và tắm tráng nước ngọt.'
    }, {
      text: 'Khu tắm bùn khoáng nóng nằm phía đông đảo, tính phí riêng.'
    }, {
      text: 'Đường mòn lên đỉnh đảo, khoảng 25 phút, nhìn được toàn vịnh.'
    }],
    tips: [{
      text: 'Buổi chiều gió lên, tàu về sau 16:30 hay lắc. Ai say sóng nên về chuyến trước.'
    }, {
      text: 'Vé tắm bùn không nằm trong vé vào đảo — hỏi giá trước khi vào.'
    }],
    faq: [{
      question: 'Vé vào đảo có gồm ghế nằm không?',
      answer: 'Có ghế nằm ở bãi chính. Ghế trong khu resort tính riêng.'
    }, {
      question: 'Chuyến tàu cuối về lúc nào?',
      answer: '17:00 trong mùa cao điểm, 16:30 mùa thấp điểm.'
    }],
    images: ['ht-g1', 'ht-g3', 'ht-g4'].map(n => ({
      src: IMG(n),
      alt: 'Hòn Tằm'
    })),
    geo: {
      lat: 12.2013,
      lng: 109.2364
    },
    updatedAt: '24/08/2026',
    sameAsHref: 'https://www.openstreetmap.org',
    sameAsLabel: 'openstreetmap.org'
  },
  articleDetail: {
    title: 'Đi Nha Trang mùa nào?',
    summary: 'Từ tháng 2 đến tháng 8 biển lặng, tàu ra đảo chạy đủ chuyến. Tháng 10 và 11 là mùa mưa, nhiều ngày cảng cấm ra khơi.',
    image: IMG('ht-g2'),
    crumbs: [{
      label: 'Trang chủ',
      href: '/'
    }, {
      label: 'Cẩm nang',
      href: '/cam-nang/'
    }, {
      label: 'Đi Nha Trang mùa nào?'
    }],
    badges: ['Cẩm nang'],
    infoRows: [{
      field: 'tacGia',
      icon: '✍️',
      label: 'Tác giả',
      value: 'Ban biên tập'
    }, {
      field: 'loaiBai',
      icon: '🏷️',
      label: 'Loại bài',
      value: 'Cẩm nang thời điểm'
    }, {
      field: 'nguon',
      icon: '🔗',
      label: 'Nguồn',
      value: 'nchmf.gov.vn',
      href: 'https://nchmf.gov.vn'
    }],
    blocks: [{
      style: 'h2',
      text: 'Mùa biển lặng: tháng 2 đến tháng 8'
    }, {
      text: 'Đây là khoảng thời gian tàu ra đảo chạy đủ chuyến. Sáng thường nắng, gió nhẹ, biển trong. Tháng 6 và 7 nắng gắt nhất — nên ra đảo chuyến sớm và về trước trưa nếu đi cùng trẻ nhỏ.'
    }, {
      style: 'h2',
      text: 'Mùa mưa: tháng 9 đến tháng 12'
    }, {
      text: 'Tháng 10 và 11 mưa nhiều nhất. Cảng có thể cấm ra khơi cả ngày, nên tour đảo hay bị dồn hoặc chuyển ngày. Nếu chỉ có một hai ngày ở Nha Trang trong khoảng này, nên đặt tour vào ngày đầu để còn ngày dự phòng.'
    }, {
      type: 'image',
      src: IMG('ht-g4'),
      alt: 'Biển Nha Trang mùa gió'
    }, {
      style: 'h2',
      text: 'Ngày lễ và giá phòng'
    }, {
      text: 'Ba mốc đông nhất là Tết Nguyên đán, 30/4 và tháng 7. Giá phòng khu Trần Phú trong các mốc này thường gấp đôi ngày thường, còn tour đảo hay hết chỗ trước hai đến ba ngày.'
    }],
    faq: [{
      question: 'Tháng nào rẻ nhất?',
      answer: 'Tháng 5 và tháng 9 ngoài dịp lễ: biển vẫn đi được mà giá phòng thấp.'
    }, {
      question: 'Mưa cả ngày thì làm gì?',
      answer: 'Tháp Bà Ponagar, chợ Đầm, các quán trong thành phố đều không phụ thuộc thời tiết biển.'
    }],
    updatedAt: '24/08/2026',
    sameAsHref: 'https://nchmf.gov.vn',
    sameAsLabel: 'nchmf.gov.vn',
    author: {
      title: 'Ban biên tập'
    },
    approvedBy: 'Ban biên tập',
    contentProvenance: 'human'
  },
  hubSections: [{
    title: 'Điểm tham quan nổi bật',
    href: '/diem-tham-quan/',
    key: 'attractions'
  }, {
    title: 'Tour nổi bật',
    href: '/tour/',
    key: 'tours'
  }, {
    title: 'Cẩm nang bản địa',
    href: '/cam-nang/',
    key: 'articles'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/data.js", error: String((e && e.message) || e) }); }

__ds_ns.BookingCTA = __ds_scope.BookingCTA;

__ds_ns.ContactCTA = __ds_scope.ContactCTA;

__ds_ns.ContactChannels = __ds_scope.ContactChannels;

__ds_ns.PriceDisplay = __ds_scope.PriceDisplay;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.DEFAULT_FOOTER_COLUMNS = __ds_scope.DEFAULT_FOOTER_COLUMNS;

__ds_ns.Footer = __ds_scope.Footer;

__ds_ns.FooterBadges = __ds_scope.FooterBadges;

__ds_ns.DEFAULT_NAV = __ds_scope.DEFAULT_NAV;

__ds_ns.Header = __ds_scope.Header;

__ds_ns.SiteLogo = __ds_scope.SiteLogo;

__ds_ns.AuthorityMeta = __ds_scope.AuthorityMeta;

__ds_ns.Body = __ds_scope.Body;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.FAQ = __ds_scope.FAQ;

__ds_ns.FactStrip = __ds_scope.FactStrip;

__ds_ns.Gallery = __ds_scope.Gallery;

__ds_ns.InfoCard = __ds_scope.InfoCard;

__ds_ns.NearbySection = __ds_scope.NearbySection;

__ds_ns.SkeletonCard = __ds_scope.SkeletonCard;

__ds_ns.DEFAULT_EMPTY_LINKS = __ds_scope.DEFAULT_EMPTY_LINKS;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.HomeHero = __ds_scope.HomeHero;

__ds_ns.DEFAULT_HUBS = __ds_scope.DEFAULT_HUBS;

__ds_ns.HomeHubGrid = __ds_scope.HomeHubGrid;

__ds_ns.HomeStatsBand = __ds_scope.HomeStatsBand;

__ds_ns.HomeTourGrid = __ds_scope.HomeTourGrid;

__ds_ns.DEFAULT_TRUST_ITEMS = __ds_scope.DEFAULT_TRUST_ITEMS;

__ds_ns.HomeTrustBar = __ds_scope.HomeTrustBar;

__ds_ns.DetailLayout = __ds_scope.DetailLayout;

__ds_ns.Hero = __ds_scope.Hero;

__ds_ns.Section = __ds_scope.Section;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.WaveDivider = __ds_scope.WaveDivider;

__ds_ns.EntityIndex = __ds_scope.EntityIndex;

__ds_ns.MapView = __ds_scope.MapView;

__ds_ns.RouteMap = __ds_scope.RouteMap;

__ds_ns.ArticleDetail = __ds_scope.ArticleDetail;

__ds_ns.AttractionDetail = __ds_scope.AttractionDetail;

__ds_ns.TourDetail = __ds_scope.TourDetail;

})();
