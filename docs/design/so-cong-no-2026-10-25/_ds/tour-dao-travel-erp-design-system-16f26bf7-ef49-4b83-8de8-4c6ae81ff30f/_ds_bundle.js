/* @ds-bundle: {"format":4,"namespace":"TourDaoTravelERPDesignSystem_16f26b","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"DataTable","sourcePath":"components/core/DataTable.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"Tabs","sourcePath":"components/core/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"7d0b85891808","components/core/Button.jsx":"6b89785b6f54","components/core/Card.jsx":"28f43315f577","components/core/DataTable.jsx":"a33020ab4c4d","components/core/Input.jsx":"890cdc29df82","components/core/Tabs.jsx":"6f009b6a9e68","ui_kits/booking-site/Site.jsx":"ee2c3ec57fe3","ui_kits/erp-app/App.jsx":"6a6033f97b83","ui_kits/home/Desktop.jsx":"7e59032d6f0e","ui_kits/home/Icon.jsx":"61cafde21352","ui_kits/home/Phone.jsx":"44b7d35e1349","ui_kits/home/ios-frame.jsx":"24642b887be3"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TourDaoTravelERPDesignSystem_16f26b = window.TourDaoTravelERPDesignSystem_16f26b || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function Badge({
  status = 'neutral',
  children
}) {
  const m = {
    success: ['--status-success-fg', '--status-success-bg'],
    warning: ['--status-warning-fg', '--status-warning-bg'],
    error: ['--status-error-fg', '--status-error-bg'],
    info: ['--status-info-fg', '--status-info-bg']
  }[status] || ['--text-2', '--surface-sunken'];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 20,
      padding: '0 var(--sp-3)',
      borderRadius: 'var(--radius-pill)',
      background: `var(${m[1]})`,
      color: `var(${m[0]})`,
      font: 'var(--fw-semibold) var(--fs-sm) var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'currentColor'
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = 'primary',
  size,
  icon,
  disabled,
  children,
  style,
  ...r
}) {
  const v = {
    primary: {
      background: 'var(--color-brand)',
      color: '#fff',
      border: '1px solid var(--color-brand)'
    },
    accent: {
      background: 'var(--color-accent)',
      color: 'var(--td-gray-900)',
      border: '1px solid var(--color-accent)'
    },
    secondary: {
      background: 'var(--surface-card)',
      color: 'var(--color-brand)',
      border: '1px solid var(--color-brand)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-1)',
      border: '1px solid transparent'
    }
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: disabled
  }, r, {
    style: {
      height: size === 'sm' ? 'var(--ctl-h-compact)' : 'var(--ctl-h)',
      padding: '0 var(--sp-5)',
      borderRadius: 'var(--radius-md)',
      font: 'var(--fw-semibold) var(--fs-md) var(--font-sans)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? .45 : 1,
      display: 'inline-flex',
      whiteSpace: 'nowrap',
      alignItems: 'center',
      gap: 'var(--sp-3)',
      transition: 'filter var(--dur-fast) var(--ease)',
      ...v,
      ...style
    },
    onMouseEnter: e => !disabled && (e.currentTarget.style.filter = 'brightness(.92)'),
    onMouseLeave: e => e.currentTarget.style.filter = ''
  }), icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function Card({
  title,
  actions,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-1)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-1)',
      ...style
    }
  }, (title || actions) && /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--sp-4) var(--sp-5)',
      borderBottom: '1px solid var(--border-1)',
      font: 'var(--fw-semibold) var(--fs-lg) var(--font-sans)'
    }
  }, title, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--sp-3)'
    }
  }, actions)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--sp-5)'
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/DataTable.jsx
try { (() => {
function DataTable({
  columns,
  rows,
  selected,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      font: 'var(--fs-md) var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      height: 'var(--row-h)',
      padding: '0 var(--sp-4)',
      textAlign: c.align || 'left',
      background: 'var(--surface-sunken)',
      borderBottom: '1px solid var(--border-2)',
      font: 'var(--fw-semibold) var(--fs-sm) var(--font-sans)',
      color: 'var(--text-2)',
      textTransform: 'uppercase',
      letterSpacing: '.04em'
    }
  }, c.label)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    onClick: () => onSelect && onSelect(i),
    "aria-selected": selected === i,
    style: {
      background: selected === i ? 'var(--surface-row-selected)' : '',
      cursor: onSelect ? 'pointer' : 'default'
    },
    onMouseEnter: e => selected !== i && (e.currentTarget.style.background = 'var(--surface-row-hover)'),
    onMouseLeave: e => e.currentTarget.style.background = selected === i ? 'var(--surface-row-selected)' : ''
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    style: {
      height: 'var(--row-h)',
      padding: '0 var(--sp-4)',
      textAlign: c.align || 'left',
      borderBottom: '1px solid var(--border-1)',
      fontFamily: c.mono ? 'var(--font-mono)' : '',
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap'
    }
  }, r[c.key]))))));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  hint,
  error,
  style,
  ...r
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      font: 'var(--fw-medium) var(--fs-sm) var(--font-sans)',
      color: 'var(--text-2)'
    }
  }, label, /*#__PURE__*/React.createElement("input", _extends({}, r, {
    style: {
      height: 'var(--ctl-h)',
      padding: '0 var(--sp-4)',
      border: `1px solid ${error ? 'var(--status-error-fg)' : 'var(--border-2)'}`,
      borderRadius: 'var(--radius-md)',
      font: 'var(--fs-md) var(--font-sans)',
      color: 'var(--text-1)',
      background: 'var(--surface-card)',
      outline: 'none',
      ...style
    },
    onFocus: e => e.target.style.boxShadow = '0 0 0 2px var(--focus-ring)',
    onBlur: e => e.target.style.boxShadow = ''
  })), (error || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      color: error ? 'var(--status-error-fg)' : 'var(--text-3)',
      fontWeight: 400
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/Tabs.jsx
try { (() => {
function Tabs({
  items,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'flex',
      gap: 'var(--sp-5)',
      borderBottom: '1px solid var(--border-1)'
    }
  }, items.map(i => /*#__PURE__*/React.createElement("button", {
    key: i,
    role: "tab",
    "aria-selected": i === value,
    onClick: () => onChange && onChange(i),
    style: {
      padding: 'var(--sp-3) 0',
      background: 'none',
      border: 0,
      borderBottom: i === value ? '2px solid var(--color-brand)' : '2px solid transparent',
      marginBottom: -1,
      color: i === value ? 'var(--color-brand)' : 'var(--text-2)',
      font: 'var(--fw-semibold) var(--fs-md) var(--font-sans)',
      cursor: 'pointer'
    }
  }, i)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/booking-site/Site.jsx
try { (() => {
const {
  Button,
  Badge,
  Input,
  Card
} = window.TourDaoTravelERPDesignSystem_16f26b;
const TOURS = [['Đà Nẵng – Hội An', '4 ngày 3 đêm', '5.490.000'], ['Phú Quốc nghỉ dưỡng', '3 ngày 2 đêm', '4.290.000'], ['Hà Nội – Sa Pa', '3 ngày 2 đêm', '3.890.000']];
function App() {
  const [pick, setPick] = React.useState(null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh'
    }
  }, /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 48px',
      height: 64,
      background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-tour-dao.png",
    width: "36",
    height: "36",
    style: {
      borderRadius: 8
    }
  }), /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--color-brand)',
      fontSize: 'var(--fs-xl)'
    }
  }, "Tour Dao")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 24,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Tour trong n\u01B0\u1EDBc"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Tour qu\u1ED1c t\u1EBF"), /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, "Tra c\u1EE9u booking"), /*#__PURE__*/React.createElement(Button, {
    size: "sm"
  }, "\u0110\u0103ng nh\u1EADp"))), /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-shell)',
      color: '#fff',
      padding: '56px 48px 72px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--fw-bold) var(--fs-4xl)/1.15 var(--font-sans)',
      maxWidth: 640
    }
  }, "\u0110i \u0111\xE2u c\u0169ng c\xF3 ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-accent)'
    }
  }, "Tour Dao")), /*#__PURE__*/React.createElement("p", {
    style: {
      color: '#E8CFD2',
      maxWidth: 520
    }
  }, "Ch\u1ECDn h\xE0nh tr\xECnh, gi\u1EEF ch\u1ED7 v\xE0 theo d\xF5i booking c\u1EE7a b\u1EA1n trong m\u1ED9t n\u01A1i."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'end',
      background: '#fff',
      padding: 16,
      borderRadius: 'var(--radius-lg)',
      maxWidth: 760,
      color: 'var(--text-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "\u0110i\u1EC3m \u0111\u1EBFn",
    placeholder: "\u0110\xE0 N\u1EB5ng, Ph\xFA Qu\u1ED1c\u2026"
  })), /*#__PURE__*/React.createElement(Input, {
    label: "Ng\xE0y kh\u1EDFi h\xE0nh",
    type: "date"
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "accent"
  }, "T\xECm tour"))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '32px 48px'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: 'var(--fw-bold) var(--fs-2xl) var(--font-sans)'
    }
  }, "Tour n\u1ED5i b\u1EADt"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 24
    }
  }, TOURS.map((t, i) => /*#__PURE__*/React.createElement(Card, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 110,
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-md)',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--text-3)',
      font: 'var(--fs-sm) var(--font-mono)',
      marginBottom: 12
    }
  }, "[ \u1EA3nh tour ]"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("b", null, t[0]), /*#__PURE__*/React.createElement(Badge, {
    status: "success"
  }, "C\xF2n ch\u1ED7")), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-3)',
      fontSize: 'var(--fs-sm)',
      margin: '4px 0 12px'
    }
  }, t[1]), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--color-brand)',
      fontSize: 'var(--fs-lg)'
    }
  }, t[2], " \u20AB"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: pick === i ? 'accent' : 'primary',
    onClick: () => setPick(i)
  }, pick === i ? 'Đã chọn' : 'Đặt tour')))))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/booking-site/Site.jsx", error: String((e && e.message) || e) }); }

// ui_kits/erp-app/App.jsx
try { (() => {
const {
  Button,
  Badge,
  Input,
  Tabs,
  DataTable,
  Card
} = window.TourDaoTravelERPDesignSystem_16f26b;
const NAV = ['Tổng quan', 'Booking', 'Tour & Lịch', 'Khách hàng', 'Nhà cung cấp', 'Công nợ', 'Báo cáo'];
const ROWS = [['BK-0417', 'Nguyễn Văn An', 'Đà Nẵng – Hội An 4N3Đ', '12/10/2026', 12450000, 'success', 'Đã xác nhận'], ['BK-0418', 'Trần Thị Bích', 'Phú Quốc 3N2Đ', '15/10/2026', 8900000, 'warning', 'Chờ thanh toán'], ['BK-0419', 'Công ty Sao Mai', 'Hà Nội – Sa Pa 3N2Đ', '18/10/2026', 46200000, 'info', 'Đang xử lý'], ['BK-0420', 'Lê Minh Quân', 'Nhật Bản 6N5Đ', '02/11/2026', 58000000, 'error', 'Quá hạn'], ['BK-0421', 'Phạm Hoài Nam', 'Đà Lạt 3N2Đ', '05/11/2026', 6300000, 'success', 'Đã xác nhận']];
const fmt = n => n.toLocaleString('vi-VN');
function Shell({
  nav,
  setNav,
  children,
  density,
  setDensity
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      height: '100vh'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      background: 'var(--surface-shell)',
      color: '#fff',
      padding: 'var(--sp-5) var(--sp-3)',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 var(--sp-3) var(--sp-5)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-tour-dao.png",
    width: "32",
    height: "32",
    style: {
      borderRadius: 6
    }
  }), /*#__PURE__*/React.createElement("b", null, "Tour Dao ERP")), NAV.map(n => /*#__PURE__*/React.createElement("button", {
    key: n,
    onClick: () => setNav(n),
    style: {
      textAlign: 'left',
      height: 36,
      padding: '0 var(--sp-4)',
      border: 0,
      borderRadius: 'var(--radius-md)',
      background: n === nav ? 'var(--color-brand)' : 'transparent',
      color: n === nav ? '#fff' : '#E8CFD2',
      font: 'var(--fw-medium) var(--fs-md) var(--font-sans)',
      cursor: 'pointer',
      borderLeft: n === nav ? '3px solid var(--color-accent)' : '3px solid transparent'
    }
  }, n))), /*#__PURE__*/React.createElement("main", {
    "data-density": density,
    style: {
      overflow: 'auto',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--sp-6)',
      background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-1)'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "T\xECm booking, kh\xE1ch, tour\u2026",
    style: {
      width: 320,
      height: 32
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    variant: "ghost",
    onClick: () => setDensity(density === 'compact' ? 'cozy' : 'compact')
  }, "M\u1EADt \u0111\u1ED9: ", density === 'compact' ? 'Gọn' : 'Chuẩn'), /*#__PURE__*/React.createElement(Badge, {
    status: "info"
  }, "Admin"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--sp-6)'
    }
  }, children)));
}
function Kpi({
  l,
  v,
  s
}) {
  return /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-3)',
      fontSize: 'var(--fs-sm)'
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-bold) var(--fs-3xl) var(--font-sans)',
      color: 'var(--color-brand)'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-3)',
      fontSize: 'var(--fs-sm)'
    }
  }, s));
}
function Bookings({
  sel,
  setSel
}) {
  const [tab, setTab] = React.useState('Tất cả');
  const rows = ROWS.filter(r => tab === 'Tất cả' || tab === 'Cần xử lý' && r[5] !== 'success').map(r => ({
    id: r[0],
    c: r[1],
    t: r[2],
    d: r[3],
    a: fmt(r[4]),
    s: /*#__PURE__*/React.createElement(Badge, {
      status: r[5]
    }, r[6])
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--fw-bold) var(--fs-2xl) var(--font-sans)'
    }
  }, "Booking"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary"
  }, "Xu\u1EA5t Excel"), /*#__PURE__*/React.createElement(Button, null, "T\u1EA1o booking"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 'var(--sp-5)'
    }
  }, /*#__PURE__*/React.createElement(Kpi, {
    l: "Doanh thu th\xE1ng 10",
    v: "131,8 tr \u20AB",
    s: "+8% so v\u1EDBi th\xE1ng 9"
  }), /*#__PURE__*/React.createElement(Kpi, {
    l: "Booking m\u1EDF",
    v: "42",
    s: "5 c\u1EA7n x\u1EED l\xFD"
  }), /*#__PURE__*/React.createElement(Kpi, {
    l: "C\xF4ng n\u1EE3 ph\u1EA3i thu",
    v: "64,2 tr \u20AB",
    s: "1 qu\xE1 h\u1EA1n"
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Danh s\xE1ch booking",
    actions: /*#__PURE__*/React.createElement(Tabs, {
      items: ['Tất cả', 'Cần xử lý'],
      value: tab,
      onChange: setTab
    })
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      margin: 'calc(-1*var(--sp-5))',
      marginTop: 'calc(-1*var(--sp-5))'
    }
  }, /*#__PURE__*/React.createElement(DataTable, {
    selected: sel,
    onSelect: setSel,
    columns: [{
      key: 'id',
      label: 'Mã',
      mono: true
    }, {
      key: 'c',
      label: 'Khách'
    }, {
      key: 't',
      label: 'Tour'
    }, {
      key: 'd',
      label: 'Khởi hành'
    }, {
      key: 'a',
      label: 'Tổng (₫)',
      align: 'right',
      mono: true
    }, {
      key: 's',
      label: 'Trạng thái'
    }],
    rows: rows
  }))));
}
function App() {
  const [nav, setNav] = React.useState('Booking');
  const [sel, setSel] = React.useState(0);
  const [density, setDensity] = React.useState('cozy');
  return /*#__PURE__*/React.createElement(Shell, {
    nav: nav,
    setNav: setNav,
    density: density,
    setDensity: setDensity
  }, nav === 'Booking' || nav === 'Tổng quan' ? /*#__PURE__*/React.createElement(Bookings, {
    sel: sel,
    setSel: setSel
  }) : /*#__PURE__*/React.createElement(Card, {
    title: nav
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-3)'
    }
  }, "M\xE0n h\xECnh n\xE0y ch\u01B0a \u0111\u01B0\u1EE3c d\u1EF1ng trong UI kit.")));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/erp-app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/home/Desktop.jsx
try { (() => {
const {
  Button,
  Badge,
  Input,
  Card,
  DataTable
} = window.TourDaoTravelERPDesignSystem_16f26b;
const {
  kpis,
  tours,
  tasks,
  actions
} = window.HOME;
const NAV = [['Trang chủ', 'layout-dashboard'], ['Booking', 'ticket'], ['Tour & Lịch', 'calendar-days'], ['Khách hàng', 'users'], ['Nhà cung cấp', 'building-2'], ['Công nợ', 'wallet'], ['Báo cáo', 'bar-chart-3']];
function Desktop() {
  const [nav, setNav] = React.useState('Trang chủ');
  const [done, setDone] = React.useState({});
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '232px 1fr',
      height: '100vh',
      minHeight: 720
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      background: 'var(--surface-shell)',
      color: '#fff',
      padding: 'var(--sp-5) var(--sp-3)',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 var(--sp-3) var(--sp-5)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-tour-dao.png",
    width: "34",
    height: "34",
    style: {
      borderRadius: 6
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      lineHeight: 1.1
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 'var(--fs-xl)'
    }
  }, "Tour Dao"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--fs-xs)',
      color: '#E8CFD2'
    }
  }, "Travel ERP"))), NAV.map(([n, i]) => /*#__PURE__*/React.createElement("button", {
    key: n,
    onClick: () => setNav(n),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      height: 38,
      padding: '0 var(--sp-4)',
      border: 0,
      borderLeft: n === nav ? '3px solid var(--color-accent)' : '3px solid transparent',
      borderRadius: 'var(--radius-md)',
      background: n === nav ? 'var(--color-brand)' : 'transparent',
      color: n === nav ? '#fff' : '#E8CFD2',
      font: 'var(--fw-medium) var(--fs-md) var(--font-sans)',
      cursor: 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: i
  }), n)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: 'var(--sp-3)',
      color: '#E8CFD2',
      fontSize: 'var(--fs-sm)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "settings"
  }), "C\xE0i \u0111\u1EB7t")), /*#__PURE__*/React.createElement("main", {
    style: {
      overflow: 'auto',
      background: 'var(--surface-app)'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--sp-6)',
      background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border-1)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 340
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16,
    color: "var(--text-3)",
    style: {
      position: 'absolute',
      left: 10,
      top: 8
    }
  }), /*#__PURE__*/React.createElement(Input, {
    placeholder: "T\xECm booking, kh\xE1ch, tour\u2026",
    style: {
      width: '100%',
      height: 32,
      paddingLeft: 32,
      boxSizing: 'border-box'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    color: "var(--text-2)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 'var(--fs-sm)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: 'var(--td-gold-500)',
      display: 'grid',
      placeItems: 'center',
      fontWeight: 700
    }
  }, "M"), "Minh Anh"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--sp-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'end'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-3)',
      fontSize: 'var(--fs-sm)'
    }
  }, "Th\u1EE9 S\xE1u, 02/10/2026"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      font: 'var(--fw-bold) var(--fs-3xl)/1.2 var(--font-serif)'
    }
  }, "Ch\xE0o bu\u1ED5i s\xE1ng, Minh Anh")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "download",
      size: 16
    })
  }, "Xu\u1EA5t b\xE1o c\xE1o"), /*#__PURE__*/React.createElement(Button, {
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16
    })
  }, "T\u1EA1o booking"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
      gap: 'var(--sp-5)'
    }
  }, kpis.map(([l, v, s, i]) => /*#__PURE__*/React.createElement(Card, {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      color: 'var(--text-3)',
      fontSize: 'var(--fs-sm)'
    }
  }, l, /*#__PURE__*/React.createElement(Icon, {
    name: i,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      font: 'var(--fw-bold) var(--fs-2xl) var(--font-serif)',
      whiteSpace: 'nowrap',
      color: 'var(--color-brand)',
      margin: '4px 0'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-3)',
      fontSize: 'var(--fs-sm)'
    }
  }, s)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))',
      gap: 'var(--sp-5)'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Tour s\u1EAFp kh\u1EDFi h\xE0nh",
    actions: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost"
    }, "Xem t\u1EA5t c\u1EA3")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      margin: 'calc(-1*var(--sp-5))'
    }
  }, /*#__PURE__*/React.createElement(DataTable, {
    columns: [{
      key: 't',
      label: 'Tour'
    }, {
      key: 'd',
      label: 'Ngày',
      mono: true
    }, {
      key: 'k',
      label: 'Khách',
      align: 'right'
    }, {
      key: 's',
      label: 'Trạng thái'
    }],
    rows: tours.map(r => ({
      t: r[0],
      d: r[1],
      k: r[2],
      s: /*#__PURE__*/React.createElement(Badge, {
        status: r[3]
      }, r[4])
    }))
  }))), /*#__PURE__*/React.createElement(Card, {
    title: "Vi\u1EC7c c\u1EA7n l\xE0m"
  }, tasks.map(([l, w, i], k) => /*#__PURE__*/React.createElement("label", {
    key: k,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 'var(--sp-3) 0',
      borderBottom: k < 3 ? '1px solid var(--border-1)' : 0,
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!done[k],
    onChange: () => setDone({
      ...done,
      [k]: !done[k]
    }),
    style: {
      accentColor: 'var(--td-red-600)'
    }
  }), /*#__PURE__*/React.createElement(Icon, {
    name: i,
    size: 16,
    color: "var(--text-3)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      textDecoration: done[k] ? 'line-through' : 'none',
      color: done[k] ? 'var(--text-3)' : 'var(--text-1)'
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--fs-sm)',
      color: w === 'Hôm nay' ? 'var(--status-error-fg)' : 'var(--text-3)'
    }
  }, w))))))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(Desktop, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/home/Desktop.jsx", error: String((e && e.message) || e) }); }

// ui_kits/home/Icon.jsx
try { (() => {
function Icon({
  name,
  size = 18,
  color = 'currentColor',
  stroke = 1.75,
  style
}) {
  const pas = name.replace(/(^|-)(\w)/g, (m, a, b) => b.toUpperCase());
  let node = window.lucide.icons[pas] || [];
  if (typeof node[0] === 'string') node = node[2] || [];
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: 'none',
      ...style
    },
    "aria-hidden": "true"
  }, node.map((n, i) => React.createElement(n[0], {
    key: i,
    ...n[1]
  })));
}
window.Icon = Icon;
window.HOME = {
  kpis: [['Doanh thu tháng 10', '131,8 tr ₫', '+8% so với tháng 9', 'trending-up'], ['Booking đang mở', '42', '5 cần xử lý', 'ticket'], ['Công nợ phải thu', '64,2 tr ₫', '1 khoản quá hạn', 'wallet'], ['Khách khởi hành tuần này', '128', '6 đoàn', 'users']],
  tours: [['Đà Nẵng – Hội An 4N3Đ', '12/10', '24 khách', 'success', 'Sẵn sàng'], ['Phú Quốc 3N2Đ', '15/10', '18 khách', 'warning', 'Thiếu visa 2'], ['Hà Nội – Sa Pa 3N2Đ', '18/10', '32 khách', 'info', 'Chờ xe'], ['Nhật Bản 6N5Đ', '02/11', '16 khách', 'error', 'Cọc quá hạn']],
  tasks: [['Xác nhận khách sạn Phú Quốc', 'Hôm nay', 'building-2'], ['Thu cọc BK-0420 – Lê Minh Quân', 'Hôm nay', 'banknote'], ['Gửi báo giá Công ty Sao Mai', 'Ngày mai', 'file-text'], ['Duyệt hồ sơ visa Nhật Bản', 'Ngày mai', 'stamp']],
  actions: [['Tạo booking', 'plus-circle'], ['Báo giá', 'file-text'], ['Thu tiền', 'banknote'], ['Lịch tour', 'calendar-days']]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/home/Icon.jsx", error: String((e && e.message) || e) }); }

// ui_kits/home/Phone.jsx
try { (() => {
const {
  Button,
  Badge,
  Card
} = window.TourDaoTravelERPDesignSystem_16f26b;
const {
  kpis,
  tours,
  tasks,
  actions
} = window.HOME;
function Phone() {
  const [tab, setTab] = React.useState('Trang chủ');
  const T = [['Trang chủ', 'layout-dashboard'], ['Booking', 'ticket'], ['Lịch', 'calendar-days'], ['Khách', 'users'], ['Thêm', 'menu']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      placeItems: 'center',
      minHeight: '100vh',
      background: '#E4DEDF'
    }
  }, /*#__PURE__*/React.createElement(IOSDevice, null, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-app)',
      paddingTop: 54
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-shell)',
      color: '#fff',
      padding: '12px 16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-tour-dao.png",
    width: "28",
    height: "28",
    style: {
      borderRadius: 6
    }
  }), /*#__PURE__*/React.createElement("b", {
    style: {
      fontFamily: 'var(--font-serif)',
      fontSize: 18
    }
  }, "Tour Dao")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 22
  }), /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 22
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: '#E8CFD2'
    }
  }, "Th\u1EE9 S\xE1u, 02/10"), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 26px/1.2 var(--font-serif)'
    }
  }, "Ch\xE0o Minh Anh"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 8
    }
  }, actions.map(([l, i]) => /*#__PURE__*/React.createElement("button", {
    key: l,
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      minHeight: 64,
      padding: '10px 0',
      background: 'var(--surface-card)',
      border: '1px solid var(--border-1)',
      borderRadius: 10,
      font: '500 11px var(--font-sans)',
      color: 'var(--text-1)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: i,
    size: 22,
    color: "var(--color-brand)"
  }), l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      overflowX: 'auto',
      margin: '0 -16px',
      padding: '0 16px'
    }
  }, kpis.slice(0, 3).map(([l, v, s]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      flex: 'none',
      width: 150,
      background: 'var(--surface-card)',
      border: '1px solid var(--border-1)',
      borderRadius: 10,
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-3)'
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 22px var(--font-serif)',
      color: 'var(--color-brand)'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: 'var(--text-3)'
    }
  }, s)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 18px var(--font-serif)',
      marginBottom: 8
    }
  }, "Tour s\u1EAFp kh\u1EDFi h\xE0nh"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, tours.slice(0, 3).map(r => /*#__PURE__*/React.createElement("div", {
    key: r[0],
    style: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border-1)',
      borderRadius: 10,
      padding: 12,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, r[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: 'var(--text-3)'
    }
  }, r[1], " \xB7 ", r[2])), /*#__PURE__*/React.createElement(Badge, {
    status: r[3]
  }, r[4]))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: '700 18px var(--font-serif)',
      marginBottom: 8
    }
  }, "Vi\u1EC7c c\u1EA7n l\xE0m"), tasks.slice(0, 3).map(([l, w, i]) => /*#__PURE__*/React.createElement("div", {
    key: l,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minHeight: 44,
      borderBottom: '1px solid var(--border-1)',
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: i,
    size: 18,
    color: "var(--text-3)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: w === 'Hôm nay' ? 'var(--status-error-fg)' : 'var(--text-3)'
    }
  }, w))))), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      justifyContent: 'space-around',
      background: 'var(--surface-card)',
      borderTop: '1px solid var(--border-1)',
      padding: '6px 0 30px'
    }
  }, T.map(([n, i]) => /*#__PURE__*/React.createElement("button", {
    key: n,
    onClick: () => setTab(n),
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      minWidth: 56,
      minHeight: 44,
      border: 0,
      background: 'none',
      font: '500 10px var(--font-sans)',
      color: n === tab ? 'var(--color-brand)' : 'var(--text-3)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: i,
    size: 22
  }), n))))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(Phone, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/home/Phone.jsx", error: String((e && e.message) || e) }); }

// ui_kits/home/ios-frame.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).

/* BEGIN USAGE */
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports (to window): IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard
//
// Usage — wrap your screen content in <IOSDevice> to get the bezel, status bar
// and home indicator (props: title, dark, keyboard):
//
//   <IOSDevice title="Settings">
//     ...your screen content...
//   </IOSDevice>
//   <IOSDevice dark title="Search" keyboard>…</IOSDevice>
/* END USAGE */

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return (
    /*#__PURE__*/
    // data-om-starter: inert presence marker — Claude Design's starter-usage
    // probe reads it; it renders nothing. Keep it on this root element.
    React.createElement("div", {
      "data-om-starter": "ios-frame",
      style: {
        width,
        height,
        borderRadius: 48,
        overflow: 'hidden',
        position: 'relative',
        background: dark ? '#000' : '#F2F2F7',
        boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
        fontFamily: '-apple-system, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 11,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 126,
        height: 37,
        borderRadius: 24,
        background: '#000',
        zIndex: 50
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10
      }
    }, /*#__PURE__*/React.createElement(IOSStatusBar, {
      dark: dark
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }
    }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
      title: title,
      dark: dark
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto'
      }
    }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
      dark: dark
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        height: 34,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: 8,
        pointerEvents: 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 139,
        height: 5,
        borderRadius: 100,
        background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
      }
    })))
  );
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/home/ios-frame.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
