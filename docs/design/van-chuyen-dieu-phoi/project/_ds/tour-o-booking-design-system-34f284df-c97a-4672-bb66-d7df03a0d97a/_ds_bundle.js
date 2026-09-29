/* @ds-bundle: {"format":4,"namespace":"TourOBookingDesignSystem_34f284","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CardHead","sourcePath":"components/core/Card.jsx"},{"name":"RowLink","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"PriceTag","sourcePath":"components/core/Chip.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"ICON_NAMES","sourcePath":"components/core/Icon.jsx"},{"name":"Banner","sourcePath":"components/feedback/Banner.jsx"},{"name":"Note","sourcePath":"components/feedback/Banner.jsx"},{"name":"Skeleton","sourcePath":"components/feedback/Banner.jsx"},{"name":"Sheet","sourcePath":"components/feedback/Sheet.jsx"},{"name":"Counter","sourcePath":"components/forms/Counter.jsx"},{"name":"GuestRow","sourcePath":"components/forms/Counter.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Sidebar","sourcePath":"components/navigation/Sidebar.jsx"},{"name":"Topbar","sourcePath":"components/navigation/Sidebar.jsx"},{"name":"TabBar","sourcePath":"components/navigation/TabBar.jsx"},{"name":"MobileBar","sourcePath":"components/navigation/TabBar.jsx"},{"name":"OrderCard","sourcePath":"components/orders/OrderCard.jsx"},{"name":"StatTile","sourcePath":"components/orders/StatTile.jsx"},{"name":"RevenueChart","sourcePath":"components/orders/StatTile.jsx"},{"name":"SummaryBand","sourcePath":"components/orders/SummaryBand.jsx"},{"name":"KV","sourcePath":"components/orders/SummaryBand.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"fdb144dae3c6","components/core/Badge.jsx":"a1f9476df013","components/core/Button.jsx":"5e180fec8f71","components/core/Card.jsx":"e37ca24ae200","components/core/Chip.jsx":"edc16b48f180","components/core/Icon.jsx":"1299fa07ecf8","components/feedback/Banner.jsx":"28e89e15e6c5","components/feedback/Sheet.jsx":"4985ff15f0cf","components/forms/Counter.jsx":"0d41234b5031","components/forms/Field.jsx":"b5ad904ac653","components/navigation/Sidebar.jsx":"34d9f17e1792","components/navigation/TabBar.jsx":"f02feefff5ea","components/orders/OrderCard.jsx":"afbe00ded142","components/orders/StatTile.jsx":"8c469563faf2","components/orders/SummaryBand.jsx":"8cb875c87ee9","ui_kits/booking-app/Home.jsx":"85b2d811babc","ui_kits/booking-app/Login.jsx":"b00841c61a48","ui_kits/booking-app/OrderDetail.jsx":"d8caa1aedc4a","ui_kits/booking-app/OrderForm.jsx":"b5e79eaa913d","ui_kits/booking-app/Orders.jsx":"6acdd1b4344a","ui_kits/booking-app/data.js":"d4386f67c4a7"},"inlinedExternals":[],"unexposedExports":[{"name":"initials","sourcePath":"components/core/Avatar.jsx"},{"name":"vnd","sourcePath":"components/orders/OrderCard.jsx"}]} */

(() => {

const __ds_ns = (window.TourOBookingDesignSystem_34f284 = window.TourOBookingDesignSystem_34f284 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function initials(name = "") {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "?") + (w.length > 1 ? w[w.length - 1][0] : "")).toLocaleUpperCase("vi-VN");
}
function Avatar({
  name,
  size = "sm",
  style
}) {
  const lg = size === "lg";
  return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: lg ? "var(--avatar)" : "var(--logo-bar)",
      height: lg ? "var(--avatar)" : "var(--logo-bar)",
      borderRadius: "var(--radius-pill)",
      fontWeight: 800,
      fontSize: lg ? "var(--fs-name)" : "var(--fs-badge)",
      color: lg ? "var(--c-on-dark)" : "var(--c-sand-text)",
      background: lg ? "var(--c-primary)" : "var(--c-sand)",
      ...style
    }
  }, initials(name));
}
Object.assign(__ds_scope, { initials, Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const tones = {
  draft: {
    color: "var(--c-sand-text)",
    background: "var(--c-sand-soft)"
  },
  confirmed: {
    color: "var(--c-green-text)",
    background: "var(--c-green-soft)"
  },
  cancelled: {
    color: "var(--c-text-muted)",
    background: "var(--c-surface-alt)"
  }
};
const LABEL = {
  draft: "Nháp",
  confirmed: "Đã xác nhận",
  cancelled: "Đã huỷ"
};
function Badge({
  status = "draft",
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      padding: "2px 10px",
      fontSize: ".8rem",
      fontWeight: 700,
      lineHeight: 1.5,
      borderRadius: "999px",
      whiteSpace: "nowrap",
      ...tones[status],
      ...style
    }
  }, children ?? LABEL[status]);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const base = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--s2)",
  padding: "10px 18px",
  font: "inherit",
  fontWeight: 700,
  textDecoration: "none",
  textAlign: "center",
  cursor: "pointer",
  color: "var(--c-primary)",
  background: "#fff",
  border: "1px solid var(--c-primary)",
  borderRadius: "var(--radius-sm)",
  minHeight: "var(--tap-min)",
  boxSizing: "border-box",
  transition: "background var(--m-fast) ease"
};
const variants = {
  default: {},
  primary: {
    color: "#fff",
    background: "var(--c-primary)"
  },
  accent: {
    color: "#fff",
    background: "var(--c-accent)",
    borderColor: "var(--c-accent)"
  },
  danger: {
    color: "var(--c-danger)",
    borderColor: "var(--c-danger)"
  },
  link: {
    padding: "4px 8px",
    background: "none",
    border: 0,
    textDecoration: "underline",
    fontWeight: 600,
    minHeight: 0
  },
  pill: {
    fontSize: "var(--fs-label)",
    fontWeight: 600,
    color: "var(--c-primary)",
    background: "var(--c-primary-soft)",
    border: "none",
    padding: "0 var(--s4)"
  },
  "pill-danger": {
    fontSize: "var(--fs-label)",
    fontWeight: 600,
    color: "var(--c-accent-strong)",
    background: "var(--c-accent-soft)",
    border: "none",
    padding: "0 var(--s4)"
  }
};
const hovers = {
  primary: {
    background: "var(--c-primary-strong)",
    borderColor: "var(--c-primary-strong)"
  },
  accent: {
    background: "var(--c-accent-strong)",
    borderColor: "var(--c-accent-strong)"
  },
  default: {
    background: "var(--c-soft-hover)"
  }
};
function Button({
  variant = "default",
  size = "md",
  block = false,
  disabled = false,
  loading = false,
  icon,
  href,
  children,
  style,
  onClick,
  type = "button",
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [down, setDown] = React.useState(false);
  const s = {
    ...base,
    ...variants[variant],
    ...(hover && !disabled ? hovers[variant] : null)
  };
  if (size === "lg") Object.assign(s, {
    height: "var(--h-field)",
    minHeight: "var(--h-field)",
    padding: "0 var(--s4)",
    fontWeight: 800,
    fontSize: "var(--fs-ui)",
    gap: "var(--s3)"
  });
  if (block) Object.assign(s, {
    display: "flex",
    width: "100%"
  });
  if (disabled) Object.assign(s, {
    opacity: .5,
    cursor: "not-allowed"
  });
  if (down && !disabled) s.filter = "brightness(.94)";
  const Tag = href ? "a" : "button";
  const spinner = loading ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: "var(--spinner)",
      height: "var(--spinner)",
      border: "var(--spinner-bar) solid var(--c-spinner-track)",
      borderTopColor: "var(--c-on-dark)",
      borderRadius: "50%",
      animation: "tdb-spin var(--m-spin) linear infinite",
      flex: "none"
    }
  }) : null;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    type: href ? undefined : type,
    disabled: href ? undefined : disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setDown(false);
    },
    onMouseDown: () => setDown(true),
    onMouseUp: () => setDown(false),
    style: {
      ...s,
      ...style
    }
  }, rest), loading && /*#__PURE__*/React.createElement("style", null, "@keyframes tdb-spin{to{transform:rotate(360deg)}}"), spinner, icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  variant = "plain",
  title,
  padding,
  children,
  style,
  ...rest
}) {
  const s = {
    background: "var(--c-card)",
    borderRadius: "var(--radius-md)",
    padding: padding ?? "var(--s4)",
    marginBottom: 0
  };
  if (variant === "bordered" || variant === "list") Object.assign(s, {
    border: "1px solid var(--c-border)",
    boxShadow: "var(--shadow-card)"
  });
  if (variant === "list") s.padding = 0;
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      ...s,
      ...style
    }
  }, rest), title && /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      color: "var(--c-primary)",
      fontSize: "1.1rem",
      margin: "0 0 var(--s3)"
    }
  }, title), children);
}
function CardHead({
  icon,
  title,
  count,
  action,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--s2)",
      padding: "var(--s3) var(--s4)",
      borderBottom: "1px solid var(--c-border)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--s1)",
      fontFamily: "var(--font-display)",
      fontWeight: 700
    }
  }, icon, title), count, action && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontSize: "var(--fs-label)",
      fontWeight: 600
    }
  }, action));
}
function RowLink({
  children,
  trailing,
  danger,
  onClick,
  href
}) {
  const Tag = href ? "a" : "button";
  return /*#__PURE__*/React.createElement(Tag, {
    href: href,
    onClick: onClick,
    type: href ? undefined : "button",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      minHeight: "var(--row-h)",
      padding: 0,
      font: "inherit",
      color: danger ? "var(--c-danger)" : "var(--c-text)",
      fontWeight: danger ? 700 : undefined,
      textDecoration: "none",
      textAlign: "left",
      background: "none",
      border: 0,
      borderBottom: "1px solid var(--c-border)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", null, children), trailing ?? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--c-text-muted)",
      display: "flex"
    }
  }, "\u203A"));
}
Object.assign(__ds_scope, { Card, CardHead, RowLink });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
const tones = {
  unit: {
    color: "var(--c-primary)",
    background: "var(--c-primary-soft)"
  },
  code: {
    color: "var(--c-text-muted)",
    background: "var(--c-surface-alt)"
  },
  muted: {
    color: "var(--c-text-muted)",
    background: "var(--c-surface-alt)"
  },
  warn: {
    color: "var(--c-sand-text)",
    background: "var(--c-sand-soft)",
    border: "1px solid var(--c-sand-border)"
  }
};
function Chip({
  tone = "unit",
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-block",
      padding: "0 var(--s2)",
      fontSize: "var(--fs-badge)",
      fontWeight: 600,
      lineHeight: 1.5,
      borderRadius: "var(--radius-pill)",
      whiteSpace: "nowrap",
      ...tones[tone],
      ...style
    }
  }, children);
}
function PriceTag({
  children,
  old,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "baseline",
      gap: "var(--s2)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      padding: "0 var(--s2)",
      fontSize: "var(--fs-label)",
      fontWeight: 600,
      color: "var(--c-accent-strong)",
      background: "var(--c-accent-soft)",
      borderRadius: "var(--radius-sm)",
      whiteSpace: "nowrap"
    }
  }, children), old && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-label)",
      color: "var(--c-text-muted)",
      textDecoration: "line-through"
    }
  }, old));
}
Object.assign(__ds_scope, { Chip, PriceTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Verbatim shapes from web/icons.ts (tourdaobooking). 24×24 grid, stroke currentColor, never filled.
const SHAPES = {
  "home": [["path", {
    "d": "M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"
  }]],
  "orders": [["rect", {
    "x": 5,
    "y": 4,
    "width": 14,
    "height": 17,
    "rx": 2
  }], ["path", {
    "d": "M9 9h6M9 13h6M9 17h3"
  }]],
  "plus": [["path", {
    "d": "M12 5v14M5 12h14"
  }]],
  "me": [["circle", {
    "cx": 12,
    "cy": 8,
    "r": 4
  }], ["path", {
    "d": "M4 21c0-4 3.5-6 8-6s8 2 8 6"
  }]],
  "services": [["path", {
    "d": "M3 12V4h8l10 10-8 8L3 12z"
  }], ["circle", {
    "cx": 7.5,
    "cy": 8.5,
    "r": 1.2
  }]],
  "staff": [["circle", {
    "cx": 9,
    "cy": 8,
    "r": 3.5
  }], ["path", {
    "d": "M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"
  }], ["circle", {
    "cx": 17,
    "cy": 9,
    "r": 2.5
  }], ["path", {
    "d": "M17.5 14.5c2.5.3 4 2 4 4.5"
  }]],
  "back": [["path", {
    "d": "M15 5l-7 7 7 7"
  }]],
  "next": [["path", {
    "d": "M9 5l7 7-7 7"
  }]],
  "lock": [["rect", {
    "x": 5,
    "y": 11,
    "width": 14,
    "height": 9,
    "rx": 2
  }], ["path", {
    "d": "M8 11V8a4 4 0 0 1 8 0v3"
  }]],
  "alert": [["path", {
    "d": "M12 4l9 16H3L12 4z"
  }], ["path", {
    "d": "M12 10v4M12 17v.01"
  }]],
  "close": [["path", {
    "d": "M6 6l12 12M18 6L6 18"
  }]],
  "contact-card": [["rect", {
    "x": 3,
    "y": 5,
    "width": 18,
    "height": 14,
    "rx": 2
  }], ["circle", {
    "cx": 9,
    "cy": 11,
    "r": 2.2
  }], ["path", {
    "d": "M5.8 16.2c.5-1.4 1.7-2.1 3.2-2.1s2.7.7 3.2 2.1M15.5 10h3.2M15.5 13.5h3.2"
  }]],
  "pin": [["path", {
    "d": "M12 21s7-5.6 7-11a7 7 0 0 0-14 0c0 5.4 7 11 7 11z"
  }], ["circle", {
    "cx": 12,
    "cy": 10,
    "r": 2.4
  }]],
  "history": [["path", {
    "d": "M3.5 12a8.5 8.5 0 1 0 2.6-6.1"
  }], ["path", {
    "d": "M3.2 4.4v3.9h3.9"
  }], ["path", {
    "d": "M12 8.2V12l2.8 1.8"
  }]],
  "chat": [["path", {
    "d": "M4.5 5.5h15v10.5H9.5l-5 4V5.5z"
  }], ["path", {
    "d": "M8.5 9.5h7M8.5 12.5h4.5"
  }]],
  "doc-check": [["rect", {
    "x": 6,
    "y": 3,
    "width": 12,
    "height": 18,
    "rx": 2
  }], ["path", {
    "d": "M9 12.6l2 2 4-5.4"
  }]],
  "money": [["rect", {
    "x": 2,
    "y": 9,
    "width": 15,
    "height": 9,
    "rx": 1.5
  }], ["rect", {
    "x": 7,
    "y": 6,
    "width": 15,
    "height": 9,
    "rx": 1.5
  }], ["circle", {
    "cx": 14.5,
    "cy": 10.5,
    "r": 2
  }]],
  "assign": [["circle", {
    "cx": 9,
    "cy": 8,
    "r": 3.2
  }], ["path", {
    "d": "M3 20c0-3.6 2.8-5.6 6-5.6s6 2 6 5.6"
  }], ["circle", {
    "cx": 18,
    "cy": 7,
    "r": 3.4
  }], ["path", {
    "d": "M18 5.4v3.2M16.4 7h3.2"
  }]],
  "clock": [["circle", {
    "cx": 12,
    "cy": 12.5,
    "r": 8.5
  }], ["path", {
    "d": "M12 7.5v5l3.5 2"
  }]],
  "chart": [["path", {
    "d": "M4 20V13"
  }], ["path", {
    "d": "M9.5 20V6"
  }], ["path", {
    "d": "M15 20V15.5"
  }], ["path", {
    "d": "M20 20V10"
  }]],
  "handset": [["path", {
    "d": "M5.5 4.5c-1 0-1.8.9-1.6 1.9.6 3.3 2.2 6.3 4.4 8.5s5.2 3.8 8.5 4.4c1 .2 1.9-.6 1.9-1.6v-1.9a1.2 1.2 0 0 0-.9-1.2l-3-.8a1.2 1.2 0 0 0-1.2.3l-1 1.1a10.7 10.7 0 0 1-4.6-4.6l1.1-1a1.2 1.2 0 0 0 .3-1.2l-.8-3a1.2 1.2 0 0 0-1.2-.9H5.5z"
  }]],
  "guests": [["circle", {
    "cx": 12,
    "cy": 8,
    "r": 3.6
  }], ["path", {
    "d": "M4.5 20c0-4 3-6 7.5-6s7.5 2 7.5 6"
  }]],
  "face": [["path", {
    "d": "M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8"
  }], ["path", {
    "d": "M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8"
  }], ["path", {
    "d": "M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16"
  }], ["path", {
    "d": "M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16"
  }], ["path", {
    "d": "M8.5 9v1.5"
  }], ["path", {
    "d": "M15.5 9v1.5"
  }], ["path", {
    "d": "M12 9v4h-1"
  }], ["path", {
    "d": "M9 16c1.7 1.3 4.3 1.3 6 0"
  }]],
  "help": [["circle", {
    "cx": 12,
    "cy": 12,
    "r": 8.5
  }], ["path", {
    "d": "M9.6 9.6a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.6"
  }], ["path", {
    "d": "M12 17v.01"
  }]]
};
function Icon({
  name,
  size = 24,
  strokeWidth,
  style,
  ...rest
}) {
  const shapes = SHAPES[name];
  if (!shapes) return null;
  const bold = name === "plus" || name === "back";
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth ?? (bold ? 2.2 : 1.8),
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: {
      flex: "none",
      display: "block",
      ...style
    }
  }, rest), shapes.map(([tag, attrs], i) => React.createElement(tag, {
    key: i,
    ...attrs
  })));
}
const ICON_NAMES = Object.keys(SHAPES);
Object.assign(__ds_scope, { Icon, ICON_NAMES });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Banner.jsx
try { (() => {
const tones = {
  danger: {
    color: "var(--c-danger-text)",
    background: "var(--c-danger-soft)",
    borderColor: "var(--c-danger-border)"
  },
  warning: {
    color: "var(--c-sand-text)",
    background: "var(--c-sand-soft)",
    borderColor: "var(--c-sand-border)"
  },
  info: {
    color: "var(--c-primary)",
    background: "var(--c-primary-soft)",
    borderColor: "var(--c-border)"
  },
  ok: {
    color: "var(--c-green-text)",
    background: "var(--c-green-soft)",
    borderColor: "var(--c-green-border)"
  }
};
function Banner({
  tone = "danger",
  title,
  lines,
  actions,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: tone === "danger" ? "alert" : "status",
    style: {
      padding: "var(--s3) var(--s4)",
      border: "1px solid",
      borderRadius: "var(--radius-sm)",
      ...tones[tone],
      ...style
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700
    }
  }, title), children, lines && /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: "var(--s2) 0 0",
      paddingLeft: "var(--s4)"
    }
  }, lines.map((l, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, l))), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "var(--s2)",
      marginTop: "var(--s3)"
    }
  }, actions));
}
function Note({
  tone = "info",
  icon,
  children
}) {
  const t = tone === "warn" ? {
    color: "var(--c-sand-text)",
    background: "var(--c-sand-soft)",
    border: "1px solid var(--c-sand-border)"
  } : {
    color: "var(--c-primary)",
    background: "var(--c-primary-soft)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--s2)",
      padding: "var(--s2) var(--s3)",
      fontSize: "var(--fs-label)",
      fontWeight: 600,
      borderRadius: "var(--radius-sm)",
      ...t
    }
  }, icon, children);
}
function Skeleton({
  rows = 2
}) {
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      display: "grid",
      gap: "var(--s2)"
    }
  }, /*#__PURE__*/React.createElement("style", null, "@keyframes tdb-pulse{0%,100%{opacity:1}50%{opacity:.6}}"), Array.from({
    length: rows
  }, (_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      height: "var(--h-order-skeleton)",
      borderRadius: "var(--radius-md)",
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      animation: "tdb-pulse 1.2s ease-in-out infinite"
    }
  })));
}
Object.assign(__ds_scope, { Banner, Note, Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Banner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Sheet.jsx
try { (() => {
function Sheet({
  open = true,
  title,
  onClose,
  children,
  footer,
  wide,
  inline
}) {
  if (!open) return null;
  const sheet = /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-label": typeof title === "string" ? title : undefined,
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      width: wide ? "var(--w-confirm)" : "var(--w-sheet)",
      maxWidth: "100%",
      maxHeight: inline ? undefined : "calc(100vh - var(--s7))",
      background: "var(--c-surface)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-overlay)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--s2)",
      padding: "var(--s2) var(--s3) var(--s2) var(--s4)",
      borderBottom: "1px solid var(--c-border)"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      color: "var(--c-primary)",
      fontSize: "var(--fs-title)"
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "\u0110\xF3ng",
    onClick: onClose,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "var(--tap-min)",
      minHeight: "var(--tap-min)",
      padding: 0,
      color: "var(--c-primary)",
      background: "#fff",
      border: "1px solid var(--c-primary)",
      borderRadius: "var(--radius-sm)",
      cursor: "pointer",
      fontSize: 18,
      fontWeight: 700
    }
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      padding: "var(--s4)"
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "var(--s3) var(--s4)",
      background: "var(--c-surface)",
      borderTop: "1px solid var(--c-border)",
      borderRadius: "0 0 var(--radius-lg) var(--radius-lg)"
    }
  }, footer));
  if (inline) return sheet;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "var(--s4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      background: "var(--c-scrim)"
    }
  }), sheet);
}
Object.assign(__ds_scope, { Sheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Sheet.jsx", error: String((e && e.message) || e) }); }

// components/forms/Counter.jsx
try { (() => {
const btn = {
  width: "var(--counter-btn)",
  height: "var(--counter-btn)",
  padding: 0,
  fontSize: "var(--fs-counter)",
  fontWeight: 700,
  lineHeight: 1,
  color: "var(--c-primary)",
  background: "none",
  border: 0,
  cursor: "pointer",
  font: "inherit"
};
function Counter({
  value,
  defaultValue = 0,
  min = 0,
  max = 99,
  onChange,
  invalid
}) {
  const [inner, setInner] = React.useState(defaultValue);
  const v = value ?? inner;
  const set = n => {
    const c = Math.max(min, Math.min(max, n));
    setInner(c);
    onChange?.(c);
  };
  const dis = d => ({
    ...btn,
    fontSize: "var(--fs-counter)",
    ...(d ? {
      color: "var(--c-text-muted)",
      opacity: .5,
      cursor: "not-allowed"
    } : null)
  });
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      background: "var(--c-surface)",
      border: "1px solid " + (invalid ? "var(--c-danger)" : "var(--c-border)"),
      borderRadius: "var(--radius-sm)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "B\u1EDBt",
    disabled: v <= min,
    onClick: () => set(v - 1),
    style: dis(v <= min)
  }, "\u2212"), /*#__PURE__*/React.createElement("input", {
    inputMode: "numeric",
    value: v,
    onChange: e => set(Number(e.target.value.replace(/\D/g, "")) || 0),
    style: {
      width: "var(--counter-field)",
      height: "var(--counter-btn)",
      margin: 0,
      padding: 0,
      textAlign: "center",
      font: "inherit",
      fontSize: "var(--fs-ui)",
      fontWeight: 700,
      color: "var(--c-text)",
      border: 0,
      borderLeft: "1px solid var(--c-border)",
      borderRight: "1px solid var(--c-border)",
      borderRadius: 0,
      outline: "none"
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Th\xEAm",
    disabled: v >= max,
    onClick: () => set(v + 1),
    style: dis(v >= max)
  }, "+"));
}
function GuestRow({
  label,
  sub,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--s3)",
      padding: "var(--s2) 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      lineHeight: 1.4
    }
  }, label), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "var(--fs-label)",
      color: "var(--c-text-muted)"
    }
  }, sub)), children);
}
Object.assign(__ds_scope, { Counter, GuestRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Counter.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
const inputBase = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  margin: "var(--s1) 0 0",
  padding: "10px 12px",
  font: "inherit",
  fontSize: "var(--fs-ui)",
  color: "var(--c-text)",
  background: "#fff",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--radius-sm)",
  outline: "none"
};
function Field({
  label,
  hint,
  error,
  variant = "default",
  as = "input",
  options,
  trailing,
  count,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const login = variant === "login";
  const s = {
    ...inputBase
  };
  if (as === "textarea") Object.assign(s, {
    minHeight: 72,
    resize: "vertical"
  });
  if (login) Object.assign(s, {
    height: "var(--h-field)",
    margin: 0,
    padding: "0 var(--s4)",
    fontSize: "var(--fs-field)",
    fontWeight: 600,
    transition: "border-color var(--m-fast) ease, box-shadow var(--m-fast) ease"
  });
  if (trailing) s.paddingRight = "var(--pin-toggle-space)";
  if (focus) Object.assign(s, login ? {
    borderColor: "var(--c-primary)",
    boxShadow: "0 0 0 var(--ring-field) var(--c-primary-soft)"
  } : {
    outline: "2px solid var(--c-primary)",
    outlineOffset: 0
  });
  if (error) s.borderColor = "var(--c-danger)";
  const Tag = as;
  const kids = as === "select" ? options?.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value ?? o,
    value: o.value ?? o
  }, o.label ?? o)) : undefined;
  const control = React.createElement(Tag, {
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: s,
    ...rest
  }, kids);
  const labelStyle = login ? {
    fontSize: "var(--fs-label)",
    fontWeight: 700,
    color: "var(--c-text)"
  } : {
    fontSize: "var(--fs-label)",
    fontWeight: 600,
    color: "var(--c-text-muted)"
  };
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: login ? "var(--s2)" : 0,
      ...style
    }
  }, (label || count) && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: "var(--s2)",
      ...labelStyle
    }
  }, label, count && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      color: "var(--c-text-muted)",
      fontVariantNumeric: "tabular-nums"
    }
  }, count)), trailing ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "block"
    }
  }, control, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: "50%",
      right: "var(--s1)",
      transform: "translateY(-50%)"
    }
  }, trailing)) : control, hint && !error && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      marginTop: "var(--s1)",
      fontSize: "var(--fs-label)",
      fontWeight: 500,
      color: "var(--c-text-muted)"
    }
  }, hint), error && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--s1)",
      marginTop: "var(--s2)",
      fontSize: "var(--fs-label)",
      fontWeight: 600,
      color: "var(--c-danger-text)"
    }
  }, error));
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Sidebar.jsx
try { (() => {
function Sidebar({
  groups = [],
  active,
  onNavigate,
  user,
  logoSrc,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "\u0110i\u1EC1u h\u01B0\u1EDBng ch\xEDnh",
    style: {
      display: "flex",
      flexDirection: "column",
      width: "var(--w-sidebar)",
      height: "100%",
      background: "var(--c-primary-strong)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate?.("home");
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--s2)",
      padding: "var(--s4)",
      color: "var(--c-on-dark)",
      textDecoration: "none",
      borderBottom: "1px solid var(--c-sidebar-border)",
      fontWeight: 800,
      fontSize: "1.1rem",
      lineHeight: 1.25
    }
  }, logoSrc && /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "",
    width: "30",
    height: "30",
    style: {
      width: "var(--logo-bar)",
      height: "var(--logo-bar)",
      borderRadius: "var(--radius-pill)",
      display: "block"
    }
  }), /*#__PURE__*/React.createElement("span", null, "Island Booking ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      opacity: .8
    }
  }, "System"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--s5)",
      padding: "var(--s4) var(--s3)",
      overflowY: "auto",
      minHeight: 0
    }
  }, groups.filter(g => g.items.length).map(g => /*#__PURE__*/React.createElement("div", {
    key: g.title
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 var(--s3) var(--s1)",
      fontSize: "var(--fs-badge)",
      fontWeight: 700,
      letterSpacing: "var(--ls-eyebrow)",
      color: "var(--c-sidebar-item)",
      textTransform: "uppercase"
    }
  }, g.title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 1
    }
  }, g.items.map(it => {
    const on = it.id === active;
    const badgeTone = it.badgeTone === "sand" ? {
      color: "var(--c-sand-text)",
      background: "var(--c-sand)",
      fontWeight: 800
    } : it.badgeTone === "accent" ? {
      color: "var(--c-on-dark)",
      background: "var(--c-accent)"
    } : {
      color: "var(--c-on-dark)",
      background: "var(--c-sidebar-badge)"
    };
    return /*#__PURE__*/React.createElement("a", {
      key: it.id,
      href: "#",
      "aria-current": on ? "page" : undefined,
      onClick: e => {
        e.preventDefault();
        onNavigate?.(it.id);
      },
      style: {
        display: "flex",
        alignItems: "center",
        gap: "var(--s3)",
        padding: "var(--s2) var(--s3)",
        fontSize: "var(--fs-label)",
        color: on ? "var(--c-on-dark)" : "var(--c-sidebar-item)",
        fontWeight: on ? 700 : 500,
        background: on ? "var(--c-sidebar-active)" : "transparent",
        textDecoration: "none",
        borderRadius: "var(--radius-sm)"
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 18
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, it.label), it.badge ? /*#__PURE__*/React.createElement("span", {
      style: {
        flex: "none",
        padding: "1px var(--s2)",
        fontSize: "var(--fs-badge)",
        fontWeight: 700,
        borderRadius: "var(--radius-pill)",
        ...badgeTone
      }
    }, it.badge) : null);
  }))))), user && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      display: "flex",
      alignItems: "center",
      gap: "var(--s3)",
      padding: "var(--s4)",
      borderTop: "1px solid var(--c-sidebar-border)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: user.name
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-label)",
      fontWeight: 700,
      color: "var(--c-on-dark)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, user.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-badge)",
      color: "var(--c-sidebar-item)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, user.role)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: user.onLogout,
    style: {
      flex: "none",
      padding: "var(--s1)",
      font: "inherit",
      fontSize: "var(--fs-badge)",
      fontWeight: 600,
      color: "var(--c-sidebar-item)",
      background: "none",
      border: 0,
      textDecoration: "underline",
      cursor: "pointer"
    }
  }, "\u0110\u0103ng xu\u1EA5t")));
}
function Topbar({
  title,
  search = true,
  onNew,
  onSearch
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--s3) var(--s5)",
      flexWrap: "nowrap",
      minHeight: "var(--bar-h)",
      padding: "0 var(--s4)",
      background: "var(--c-surface)",
      color: "var(--c-text-muted)",
      borderBottom: "1px solid var(--c-border)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "0 1 auto",
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      fontSize: "var(--fs-label)",
      fontWeight: 600
    }
  }, title), search && /*#__PURE__*/React.createElement("input", {
    type: "search",
    placeholder: "T\xECm m\xE3 \u0111\u01A1n, t\xEAn kh\xE1ch, S\u0110T\u2026",
    "aria-label": "T\xECm \u0111\u01A1n",
    onKeyDown: e => e.key === "Enter" && onSearch?.(e.target.value),
    style: {
      flex: "1 1 auto",
      maxWidth: "var(--w-search)",
      marginLeft: "auto",
      padding: "10px 12px",
      font: "inherit",
      fontSize: "var(--fs-ui)",
      color: "var(--c-text)",
      background: "#fff",
      border: "1px solid var(--c-border)",
      borderRadius: "var(--radius-sm)"
    }
  }), onNew && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onNew,
    style: {
      flex: "none",
      marginLeft: search ? 0 : "auto",
      whiteSpace: "nowrap",
      padding: "10px 18px",
      font: "inherit",
      fontWeight: 700,
      color: "#fff",
      background: "var(--c-accent)",
      border: "1px solid var(--c-accent)",
      borderRadius: "var(--radius-sm)",
      cursor: "pointer"
    }
  }, "T\u1EA1o \u0111\u01A1n"));
}
Object.assign(__ds_scope, { Sidebar, Topbar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TabBar.jsx
try { (() => {
function TabBar({
  tabs = [],
  active,
  onNavigate,
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "\u0110i\u1EC1u h\u01B0\u1EDBng ch\xEDnh",
    style: {
      display: "flex",
      padding: "0 var(--s1)",
      background: "var(--c-surface)",
      borderTop: "1px solid var(--c-border)",
      ...style
    }
  }, tabs.map(t => {
    const on = t.id === active;
    const isNew = t.icon === "plus";
    return /*#__PURE__*/React.createElement("a", {
      key: t.id,
      href: "#",
      "aria-current": on ? "page" : undefined,
      onClick: e => {
        e.preventDefault();
        onNavigate?.(t.id);
      },
      style: {
        flex: "1 1 0",
        minWidth: 0,
        minHeight: "var(--tabbar-h)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--s1)",
        fontSize: "var(--fs-tab)",
        fontWeight: on ? 800 : 600,
        color: on ? "var(--c-primary)" : "var(--c-text-muted)",
        textDecoration: "none"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "var(--tab-icon)",
        ...(isNew ? {
          width: "var(--tab-icon)",
          borderRadius: "50%",
          color: "var(--c-on-dark)",
          background: "var(--c-accent)"
        } : null)
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: t.icon
    })), /*#__PURE__*/React.createElement("span", null, t.label));
  }));
}
function MobileBar({
  title,
  onBack,
  user,
  logoSrc
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--s2)",
      minHeight: "var(--bar-h)",
      padding: "0 var(--s4)",
      background: "var(--c-primary)",
      color: "#fff"
    }
  }, onBack && /*#__PURE__*/React.createElement("a", {
    href: "#",
    "aria-label": "Quay l\u1EA1i",
    onClick: e => {
      e.preventDefault();
      onBack();
    },
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "var(--tap-min)",
      height: "var(--tap-min)",
      marginLeft: "calc(-1 * var(--s3))",
      color: "var(--c-on-dark)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "back",
    size: 26
  })), title ? /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      fontSize: "var(--fs-bar-title)",
      fontWeight: 800,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, title) : /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--s2)",
      fontWeight: 800,
      fontSize: "1.1rem"
    }
  }, logoSrc && /*#__PURE__*/React.createElement("img", {
    src: logoSrc,
    alt: "",
    width: "30",
    height: "30",
    style: {
      borderRadius: 999
    }
  }), "Island Booking ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      opacity: .8
    }
  }, "System")), user && /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: user,
    style: {
      marginLeft: "auto"
    }
  }));
}
Object.assign(__ds_scope, { TabBar, MobileBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TabBar.jsx", error: String((e && e.message) || e) }); }

// components/orders/OrderCard.jsx
try { (() => {
const nf = new Intl.NumberFormat("vi-VN");
const vnd = n => nf.format(n) + " ₫";
function OrderCard({
  index,
  when,
  name,
  status = "draft",
  phone,
  pax,
  remaining = 0,
  details,
  href = "#",
  defaultOpen = false,
  onOpen
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      flexDirection: "column",
      padding: "var(--s3) var(--s4)",
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      borderRadius: "var(--radius-md)",
      outline: hover ? "2px solid var(--c-primary)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--s2)"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: e => {
      if (onOpen) {
        e.preventDefault();
        onOpen();
      }
    },
    style: {
      flex: "1 1 auto",
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: "var(--s1)",
      color: "inherit",
      textDecoration: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: "var(--s2)"
    }
  }, index !== undefined && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      color: "var(--c-text-muted)",
      fontVariantNumeric: "tabular-nums"
    }
  }, index, "."), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      fontWeight: 600,
      whiteSpace: "nowrap"
    }
  }, when), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "1 1 auto",
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, name), /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    status: status,
    style: {
      flex: "none"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "nowrap",
      alignItems: "center",
      gap: "var(--s1) var(--s3)",
      minWidth: 0,
      overflow: "hidden",
      fontSize: "var(--fs-label)",
      color: "var(--c-text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--s1)",
      textDecoration: "underline",
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "handset",
    size: 16
  }), phone), pax && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "0 1 auto",
      minWidth: 0,
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--s1)",
      overflow: "hidden",
      whiteSpace: "nowrap"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "guests",
    size: 16
  }), pax), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      whiteSpace: "nowrap"
    }
  }, "C\xF2n thu ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: remaining === 0 ? "var(--c-green-text)" : "var(--c-accent-strong)"
    }
  }, vnd(remaining))))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-expanded": open,
    "aria-label": "Xem th\xEAm chi ti\u1EBFt \u0111\u01A1n",
    onClick: () => setOpen(!open),
    style: {
      flex: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "var(--tap-min)",
      height: "var(--tap-min)",
      margin: 0,
      padding: 0,
      color: "var(--c-text-muted)",
      background: "none",
      border: 0,
      borderRadius: "var(--radius-sm)",
      cursor: "pointer",
      fontSize: "var(--fs-ui)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      transition: "transform var(--m-fast)",
      transform: open ? "rotate(180deg)" : "none"
    }
  }, "\u25BE"))), open && details && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: "var(--s1)",
      marginTop: "var(--s2)",
      paddingTop: "var(--s2)",
      fontSize: "var(--fs-label)",
      color: "var(--c-text-muted)",
      borderTop: "1px solid var(--c-border)"
    }
  }, details.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, d))));
}
Object.assign(__ds_scope, { vnd, OrderCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/orders/OrderCard.jsx", error: String((e && e.message) || e) }); }

// components/orders/StatTile.jsx
try { (() => {
function StatTile({
  icon,
  label,
  value,
  sub,
  tone,
  compact,
  href = "#"
}) {
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--s1)",
      padding: "var(--s3) var(--s4)",
      color: "inherit",
      textDecoration: "none",
      background: "var(--c-card)",
      border: "1px solid var(--c-border)",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-card)",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "var(--s1)",
      fontSize: "var(--fs-badge)",
      fontWeight: 700,
      color: "var(--c-text-muted)",
      textTransform: "uppercase"
    }
  }, icon, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: compact ? "var(--fs-stat-sm)" : "var(--fs-stat)",
      whiteSpace: "nowrap",
      color: tone === "due" ? "var(--c-accent-strong)" : tone === "ok" ? "var(--c-green-text)" : "var(--c-text)",
      lineHeight: 1.3
    }
  }, value), sub && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-label)",
      color: "var(--c-text-muted)"
    }
  }, sub));
}
function RevenueChart({
  days
}) {
  const max = Math.max(0, ...days.map(d => d.total));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--s2)",
      marginTop: "var(--s2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: "var(--s2)",
      height: "var(--h-chart)"
    }
  }, days.map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    "aria-hidden": "true",
    style: {
      flex: 1,
      height: Math.max(Math.round(d.total / (max || 1) * 100), 4) + "%",
      background: d.past ? "var(--c-primary)" : "var(--c-primary-soft)",
      borderRadius: "var(--radius-sm) var(--radius-sm) 0 0"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "var(--fs-badge)",
      color: "var(--c-text-muted)"
    }
  }, days.map((d, i) => /*#__PURE__*/React.createElement("span", {
    key: i
  }, d.label))));
}
Object.assign(__ds_scope, { StatTile, RevenueChart });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/orders/StatTile.jsx", error: String((e && e.message) || e) }); }

// components/orders/SummaryBand.jsx
try { (() => {
function SummaryBand({
  code,
  status,
  items = [],
  stacked
}) {
  const lbl = {
    fontSize: "var(--fs-badge)",
    fontWeight: 700,
    opacity: .72
  };
  const val = {
    fontFamily: "var(--font-display)",
    fontSize: "var(--fs-title)",
    fontWeight: 700,
    color: "var(--c-on-dark)"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: stacked ? "column" : "row",
      alignItems: stacked ? "stretch" : "center",
      gap: stacked ? "var(--s3)" : "var(--s7)",
      padding: stacked ? "var(--s4)" : "var(--s5) var(--s6)",
      color: "var(--c-on-dark)",
      background: "var(--c-primary)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "var(--s1)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: lbl
  }, "M\xE3 \u0111\u01A1n"), /*#__PURE__*/React.createElement("span", {
    style: val
  }, code), status), !stacked && /*#__PURE__*/React.createElement("span", {
    style: {
      alignSelf: "stretch",
      width: 1,
      background: "var(--c-on-dark)",
      opacity: .18
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "grid",
      gridTemplateColumns: stacked ? "1fr 1fr" : "repeat(4, auto)",
      gap: "var(--s5) var(--s6)"
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: lbl
  }, it.label), /*#__PURE__*/React.createElement("span", {
    style: {
      ...val,
      color: it.due ? "var(--c-sand)" : "var(--c-on-dark)"
    }
  }, it.value), it.sub && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "var(--fs-label)",
      opacity: .72
    }
  }, it.sub)))));
}
function KV({
  label,
  children,
  strong,
  warn
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: "var(--s4)",
      padding: "4px 0",
      ...(strong ? {
        fontWeight: 800,
        color: "var(--c-accent)",
        fontSize: "1.1rem"
      } : null)
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      textAlign: "right",
      overflowWrap: "anywhere",
      ...(warn ? {
        fontWeight: 700,
        color: "var(--c-sand-text)"
      } : null)
    }
  }, children));
}
Object.assign(__ds_scope, { SummaryBand, KV });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/orders/SummaryBand.jsx", error: String((e && e.message) || e) }); }

// ui_kits/booking-app/Home.jsx
try { (() => {
const {
  StatTile,
  RevenueChart,
  Card: HCard,
  CardHead: HCardHead,
  Badge: HBadge,
  Icon: HIcon,
  Banner: HBanner
} = window.TourOBookingDesignSystem_34f284;
const hvnd = n => new Intl.NumberFormat("vi-VN").format(n) + " ₫";
const hshort = n => n >= 1e6 ? new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 2
}).format(n / 1e6) + "tr ₫" : n >= 1e3 ? new Intl.NumberFormat("vi-VN").format(Math.round(n / 1e3)) + "k ₫" : n + " ₫";
function TodayRow({
  o,
  onOpen,
  phone
}) {
  return /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onOpen(o.id);
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      color: "inherit",
      textDecoration: "none",
      borderBottom: "1px solid var(--c-border)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      width: "var(--w-time-col)",
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      color: "var(--c-primary)"
    }
  }, o.time), !phone && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontSize: 12,
      color: "var(--c-text-muted)"
    }
  }, /*#__PURE__*/React.createElement(HIcon, {
    name: "pin",
    size: 14
  }), o.place)), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700
    }
  }, o.name, " \xB7 ", o.paxFull), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--c-text-muted)",
      fontSize: ".9rem"
    }
  }, phone ? `${o.place} · ${o.service}` : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      textDecoration: "underline"
    }
  }, /*#__PURE__*/React.createElement(HIcon, {
    name: "handset",
    size: 16
  }), o.phone), " \xB7 ", o.service))), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 4,
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      color: o.remaining === 0 ? "var(--c-green-text)" : "var(--c-accent-strong)"
    }
  }, phone ? hshort(o.remaining) : hvnd(o.remaining)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--c-text-muted)",
      fontSize: ".9rem"
    }
  }, o.remaining === 0 ? "đã trả đủ" : "còn lại")));
}
function HomeScreen({
  data,
  onOpen,
  onNav,
  phone
}) {
  const today = data.orders.filter(o => o.today);
  const unpaid = data.orders.filter(o => o.status !== "cancelled" && o.remaining > 0);
  const weekTotal = data.week.reduce((a, d) => a + d.total, 0);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: "var(--fs-title)"
    }
  }, "Ch\xE0o Trang"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--c-text-muted)",
      fontSize: 14
    }
  }, "Ch\u1EE7 nh\u1EADt, 12/10/2026 \xB7 ", today.length, " chuy\u1EBFn \u0111\xF3n h\xF4m nay")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: phone ? "1fr 1fr" : "repeat(3, minmax(0,1fr))",
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(StatTile, {
    icon: /*#__PURE__*/React.createElement(HIcon, {
      name: "money",
      size: 16
    }),
    label: phone ? "Còn thiếu" : "Còn thiếu tiền",
    compact: phone,
    value: (phone ? hshort : hvnd)(unpaid.reduce((a, o) => a + o.remaining, 0)),
    sub: phone ? `${unpaid.length} đơn` : `${unpaid.length} đơn · sớm nhất đón 12/10`,
    tone: "due"
  }), /*#__PURE__*/React.createElement(StatTile, {
    icon: /*#__PURE__*/React.createElement(HIcon, {
      name: "doc-check",
      size: 16
    }),
    compact: phone,
    label: phone ? "Đơn nháp" : "Đơn nháp chưa xác nhận",
    value: data.orders.filter(o => o.status === "draft").length,
    sub: "C\u1EA7n x\xE1c nh\u1EADn \u0111\u01A1n"
  }), /*#__PURE__*/React.createElement(StatTile, {
    icon: /*#__PURE__*/React.createElement(HIcon, {
      name: "assign",
      size: 16
    }),
    compact: phone,
    label: phone ? "Chưa phụ trách" : "Chưa có người phụ trách",
    value: data.orders.filter(o => !o.handler && o.status !== "cancelled").length,
    sub: phone ? "Cần gán" : "Cần gán trước giờ đón"
  }), phone && /*#__PURE__*/React.createElement(StatTile, {
    icon: /*#__PURE__*/React.createElement(HIcon, {
      name: "chart",
      size: 16
    }),
    compact: true,
    label: "Doanh thu c\u1EE7a t\xF4i",
    value: hshort(weekTotal),
    sub: "Tu\u1EA7n n\xE0y \xB7 9 \u0111\u01A1n"
  })), !phone && /*#__PURE__*/React.createElement(HCard, {
    variant: "bordered",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      fontFamily: "var(--font-display)",
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement(HIcon, {
    name: "chart",
    size: 16
  }), "Doanh thu c\u1EE7a t\xF4i"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--c-text-muted)",
      fontSize: ".9rem"
    }
  }, "Tu\u1EA7n n\xE0y \xB7 06/10\u201312/10")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: "var(--fs-stat)"
    }
  }, hvnd(weekTotal)), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--c-text-muted)",
      fontSize: ".9rem"
    }
  }, "9 \u0111\u01A1n \u0111\xE3 x\xE1c nh\u1EADn")), /*#__PURE__*/React.createElement(RevenueChart, {
    days: data.week
  })), /*#__PURE__*/React.createElement(HCard, {
    variant: "list",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(HCardHead, {
    icon: /*#__PURE__*/React.createElement(HIcon, {
      name: "clock",
      size: 16
    }),
    title: "Chuy\u1EBFn \u0111\xF3n h\xF4m nay",
    count: /*#__PURE__*/React.createElement(HBadge, {
      status: "confirmed"
    }, today.length),
    action: /*#__PURE__*/React.createElement("a", {
      href: "#",
      onClick: e => {
        e.preventDefault();
        onNav("orders");
      }
    }, phone ? "Tất cả" : "Xem tất cả")
  }), /*#__PURE__*/React.createElement("div", null, today.map(o => /*#__PURE__*/React.createElement(TodayRow, {
    key: o.id,
    o: o,
    onOpen: onOpen,
    phone: phone
  })))), /*#__PURE__*/React.createElement(HCard, {
    variant: "list"
  }, /*#__PURE__*/React.createElement(HCardHead, {
    icon: /*#__PURE__*/React.createElement(HIcon, {
      name: "alert",
      size: 16
    }),
    title: "C\u1EA7n xem l\u1EA1i"
  }), [["sand", "Sheet đã đổi giá VN-DAO-03", "650.000 ₫ → 690.000 ₫ · giá ghi đè vẫn đang bán"], ["accent", "2 góp ý mới chưa trả lời", "GY-014 báo lỗi · GY-015 đề xuất"]].map(([t, title, sub]) => /*#__PURE__*/React.createElement("a", {
    key: title,
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      color: "inherit",
      textDecoration: "none",
      borderBottom: "1px solid var(--c-border)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: "none",
      width: "var(--icon-badge)",
      height: "var(--icon-badge)",
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...(t === "sand" ? {
        background: "var(--c-sand-soft)",
        color: "var(--c-sand-text)"
      } : {
        background: "var(--c-accent-soft)",
        color: "var(--c-accent-strong)"
      })
    }
  }, /*#__PURE__*/React.createElement(HIcon, {
    name: "alert",
    size: 17
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 700
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--c-text-muted)",
      fontSize: ".9rem"
    }
  }, sub))))));
}
window.HomeScreen = HomeScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/booking-app/Home.jsx", error: String((e && e.message) || e) }); }

// ui_kits/booking-app/Login.jsx
try { (() => {
const {
  Field: LField,
  Button: LButton,
  Icon: LIcon
} = window.TourOBookingDesignSystem_34f284;
function LoginScreen({
  onLogin,
  phone
}) {
  const [pin, setPin] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const submit = e => {
    e.preventDefault();
    if (pin.length !== 6) {
      setErr("Mã PIN phải đủ 6 số.");
      return;
    }
    setErr(null);
    setLoading(true);
    setTimeout(onLogin, 700);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      minHeight: "100%",
      background: "var(--c-surface)",
      padding: phone ? "8px 20px 20px" : "24px 48px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 0 auto",
      display: "flex",
      alignItems: phone ? "flex-start" : "center",
      justifyContent: "center",
      padding: phone ? "16px 0" : "8px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      maxWidth: "var(--w-login)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/icon-192.png",
    alt: "",
    style: {
      display: "block",
      width: phone ? 48 : 72,
      height: phone ? 48 : 72,
      margin: `0 auto ${phone ? 12 : 16}px`,
      borderRadius: "var(--radius-icon)",
      boxShadow: "var(--shadow-card)"
    }
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: 800,
      fontSize: phone ? "var(--fs-login-title)" : "var(--fs-login-title-wide)",
      lineHeight: 1.22,
      color: "var(--c-primary)",
      textAlign: "center"
    }
  }, "Tour \u0110\u1EA3o Booking"), err && /*#__PURE__*/React.createElement("div", {
    role: "alert",
    style: {
      margin: "24px 0 0",
      padding: "12px 16px",
      fontSize: 14,
      borderRadius: 8,
      color: "var(--c-danger-text)",
      background: "var(--c-danger-soft)",
      border: "1px solid var(--c-danger-border)"
    }
  }, err), /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: phone ? 12 : 16,
      marginTop: phone ? 24 : 32
    }
  }, /*#__PURE__*/React.createElement(LField, {
    variant: "login",
    label: "S\u1ED1 \u0111i\u1EC7n tho\u1EA1i",
    type: "tel",
    placeholder: "09xx xxx xxx",
    defaultValue: "0989 123 456"
  }), /*#__PURE__*/React.createElement(LField, {
    variant: "login",
    label: "M\xE3 PIN 6 s\u1ED1",
    count: `${pin.length}/6`,
    type: show ? "text" : "password",
    inputMode: "numeric",
    maxLength: 6,
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022",
    value: pin,
    onChange: e => setPin(e.target.value.replace(/\D/g, "")),
    trailing: /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setShow(!show),
      style: {
        height: 44,
        padding: "0 12px",
        font: "inherit",
        fontSize: 14,
        fontWeight: 700,
        color: "var(--c-primary)",
        background: "transparent",
        border: 0,
        borderRadius: 6,
        cursor: "pointer"
      }
    }, show ? "Ẩn" : "Hiện")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginTop: phone ? 0 : 8
    }
  }, /*#__PURE__*/React.createElement(LButton, {
    type: "submit",
    variant: "primary",
    size: "lg",
    loading: loading,
    style: {
      flex: 1
    }
  }, loading ? "Đang đăng nhập…" : "Đăng nhập"), /*#__PURE__*/React.createElement(LButton, {
    size: "lg",
    "aria-label": "\u0110\u0103ng nh\u1EADp b\u1EB1ng Face ID / v\xE2n tay",
    style: {
      width: 52,
      padding: 0
    },
    onClick: () => {
      setLoading(true);
      setTimeout(onLogin, 500);
    }
  }, /*#__PURE__*/React.createElement(LIcon, {
    name: "face"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: phone ? 16 : 24,
      fontSize: 14,
      color: "var(--c-text-muted)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "H\u1ED7 tr\u1EE3 k\u1EF9 thu\u1EADt"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: "flex",
      alignItems: "center",
      minHeight: 44,
      padding: "0 16px",
      fontWeight: 800,
      color: "var(--c-primary)",
      textDecoration: "none",
      background: "var(--c-soft-hover)",
      borderRadius: 999
    }
  }, "0989 929 373")), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 8,
      fontSize: 12,
      color: "var(--c-text-muted)",
      textAlign: "center"
    }
  }, "Phi\xEAn b\u1EA3n 1.6 \xB7 27/09/2026"))), /*#__PURE__*/React.createElement("footer", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: phone ? 12 : 16,
      borderTop: "1px solid var(--c-border)",
      fontSize: phone ? 12 : 14,
      lineHeight: 1.6,
      color: "var(--c-text-muted)",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      color: "var(--c-text)"
    }
  }, "C\xF4ng ty TNHH Tour \u0110\u1EA3o"), " \xB7 MST 4201969169"), /*#__PURE__*/React.createElement("span", {
    style: {
      textWrap: "balance"
    }
  }, "19 \u0111\u01B0\u1EDDng B2 Khu \u0111\xF4 th\u1ECB V\u0129nh \u0110i\u1EC1m Trung, Ph\u01B0\u1EDDng T\xE2y Nha Trang, t\u1EC9nh Kh\xE1nh Ho\xE0")));
}
window.LoginScreen = LoginScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/booking-app/Login.jsx", error: String((e && e.message) || e) }); }

// ui_kits/booking-app/OrderDetail.jsx
try { (() => {
const {
  SummaryBand,
  KV,
  Badge: DBadge,
  Button: DButton,
  Card: DCard,
  Sheet: DSheet,
  Field: DField,
  Banner: DBanner,
  Note: DNote,
  Icon: DIcon,
  Chip: DChip
} = window.TourOBookingDesignSystem_34f284;
const dvnd = n => new Intl.NumberFormat("vi-VN").format(n) + " ₫";
function OrderDetailScreen({
  order: o,
  onUpdate,
  phone
}) {
  const [sheet, setSheet] = React.useState(null);
  const [flash, setFlash] = React.useState(null);
  const [place, setPlace] = React.useState(o.place);
  const [time, setTime] = React.useState(o.time);
  const adult = o.total > 0 ? Math.round(o.total * 0.75) : 0;
  const services = /*#__PURE__*/React.createElement(DCard, {
    variant: "bordered",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h2", null, "D\u1ECBch v\u1EE5"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 16,
      fontWeight: 700,
      lineHeight: 1.3
    }
  }, o.service), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 4,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(DChip, {
    tone: "code"
  }, "VN-DAO-01"), /*#__PURE__*/React.createElement(DChip, null, "/ kh\xE1ch")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, [["Người lớn", o.paxFull.split(" · ")[0], adult], ["Trẻ em", o.paxFull.split(" · ")[1], o.total - adult]].filter(l => l[1]).map(([n, q, t]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) auto",
      columnGap: 12,
      rowGap: 4,
      padding: "8px 0",
      borderBottom: "1px solid var(--c-border)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, n), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      fontVariantNumeric: "tabular-nums",
      textAlign: "right"
    }
  }, dvnd(t)), /*#__PURE__*/React.createElement("span", {
    style: {
      gridColumn: "1 / -1",
      color: "var(--c-text-muted)",
      fontSize: 14
    }
  }, q)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      border: "1px solid var(--c-border)",
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      minHeight: 44,
      padding: "0 12px",
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", null, "Th\xF4ng tin chuy\u1EBFn"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: "var(--c-text-muted)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, o.date, " \xB7 ", time, " \xB7 ", place))), o.status === "confirmed" && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(DNote, {
    icon: /*#__PURE__*/React.createElement(DIcon, {
      name: "lock",
      size: 16
    })
  }, "\u0110\u01A1n \u0111\xE3 x\xE1c nh\u1EADn \u2014 gi\xE1 v\xE0 s\u1ED1 kh\xE1ch \u0111\xE3 kho\xE1.")));
  const side = /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(DCard, {
    variant: "bordered",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h2", null, "Ti\u1EC1n"), /*#__PURE__*/React.createElement(KV, {
    label: "T\u1EA1m t\xEDnh"
  }, dvnd(o.total)), /*#__PURE__*/React.createElement(KV, {
    label: "\u0110\xE3 tr\u1EA3"
  }, dvnd(o.paid)), /*#__PURE__*/React.createElement(KV, {
    label: "C\xF2n thu",
    strong: true
  }, dvnd(o.remaining))), /*#__PURE__*/React.createElement(DCard, {
    variant: "bordered",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h2", null, "Kh\xE1ch"), /*#__PURE__*/React.createElement(KV, {
    label: "T\xEAn"
  }, o.name), /*#__PURE__*/React.createElement(KV, {
    label: "S\u0110T"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, o.phone)), /*#__PURE__*/React.createElement(KV, {
    label: "Ng\u01B0\u1EDDi l\u1EADp"
  }, o.staff), /*#__PURE__*/React.createElement(KV, {
    label: "Ph\u1EE5 tr\xE1ch",
    warn: !o.handler
  }, o.handler ?? "Chưa có")));
  return /*#__PURE__*/React.createElement("div", null, flash && /*#__PURE__*/React.createElement(DBanner, {
    tone: "ok",
    style: {
      marginBottom: 16
    }
  }, flash), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(SummaryBand, {
    stacked: phone,
    code: o.code,
    status: /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(DBadge, {
      status: o.status
    })),
    items: [{
      label: "Ngày đón",
      value: `${o.date} · ${time}`
    }, {
      label: "Khách",
      value: o.paxFull
    }, {
      label: "Tổng",
      value: dvnd(o.total)
    }, {
      label: "Còn thu",
      value: dvnd(o.remaining),
      due: o.remaining > 0
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(DButton, {
    variant: "primary",
    onClick: () => setSheet("trip"),
    style: phone ? {
      flex: 1.5
    } : null
  }, "S\u1EEDa th\xF4ng tin chuy\u1EBFn"), /*#__PURE__*/React.createElement(DButton, {
    variant: "pill",
    onClick: () => {
      onUpdate({
        handler: "Phạm Văn Lộc"
      });
      setFlash("Đã gán Phạm Văn Lộc phụ trách đơn.");
    }
  }, "\u0110\u1ED5i ng\u01B0\u1EDDi ph\u1EE5 tr\xE1ch"), o.status === "draft" && /*#__PURE__*/React.createElement(DButton, {
    variant: "accent",
    onClick: () => {
      onUpdate({
        status: "confirmed"
      });
      setFlash("Đã xác nhận đơn. Gửi ảnh xác nhận cho khách.");
    },
    style: phone ? {
      flex: 1.5
    } : null
  }, "X\xE1c nh\u1EADn \u0111\u01A1n"), o.status !== "cancelled" && /*#__PURE__*/React.createElement(DButton, {
    variant: "danger",
    onClick: () => setSheet("cancel")
  }, "Hu\u1EF7 \u0111\u01A1n")), phone ? /*#__PURE__*/React.createElement(React.Fragment, null, services, side) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) var(--w-side)",
      gap: 24,
      alignItems: "start"
    }
  }, services, side), /*#__PURE__*/React.createElement(DSheet, {
    open: sheet === "trip",
    title: "S\u1EEDa th\xF4ng tin chuy\u1EBFn",
    onClose: () => setSheet(null),
    footer: /*#__PURE__*/React.createElement(DButton, {
      variant: "primary",
      block: true,
      onClick: () => {
        setSheet(null);
        setFlash("Đã lưu thông tin chuyến.");
      }
    }, "L\u01B0u th\xF4ng tin chuy\u1EBFn")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(DField, {
    label: "Gi\u1EDD \u0111\xF3n",
    value: time,
    onChange: e => setTime(e.target.value)
  }), /*#__PURE__*/React.createElement(DField, {
    label: "N\u01A1i \u0111\xF3n",
    value: place,
    onChange: e => setPlace(e.target.value)
  }), /*#__PURE__*/React.createElement(DField, {
    label: "Ghi ch\xFA cho h\u01B0\u1EDBng d\u1EABn vi\xEAn",
    as: "textarea"
  }))), /*#__PURE__*/React.createElement(DSheet, {
    open: sheet === "cancel",
    title: "Hu\u1EF7 \u0111\u01A1n",
    onClose: () => setSheet(null),
    footer: /*#__PURE__*/React.createElement(DButton, {
      variant: "danger",
      block: true,
      onClick: () => {
        onUpdate({
          status: "cancelled"
        });
        setSheet(null);
        setFlash("Đã huỷ đơn.");
      }
    }, "Hu\u1EF7 \u0111\u01A1n n\xE0y")
  }, /*#__PURE__*/React.createElement(DBanner, {
    tone: "warning",
    style: {
      marginBottom: 16
    }
  }, "\u0110\u01A1n \u0111\xE3 hu\u1EF7 kh\xF4ng m\u1EDF l\u1EA1i \u0111\u01B0\u1EE3c. Kh\xE1ch s\u1EBD kh\xF4ng nh\u1EADn tin nh\u1EAFn n\xE0o."), /*#__PURE__*/React.createElement(DField, {
    label: "L\xFD do hu\u1EF7",
    as: "select",
    options: ["Khách đổi lịch", "Thời tiết xấu", "Khách không liên lạc được", "Khác"]
  })));
}
window.OrderDetailScreen = OrderDetailScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/booking-app/OrderDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/booking-app/OrderForm.jsx
try { (() => {
const {
  Field: FField,
  Counter: FCounter,
  GuestRow: FGuestRow,
  Button: FButton,
  Card: FCard,
  Chip: FChip,
  PriceTag: FPriceTag,
  KV: FKV,
  Banner: FBanner
} = window.TourOBookingDesignSystem_34f284;
const fvnd = n => new Intl.NumberFormat("vi-VN").format(n) + " ₫";
function OrderFormScreen({
  data,
  onSave,
  phone
}) {
  const [svc, setSvc] = React.useState(data.services[0]);
  const [adults, setAdults] = React.useState(2);
  const [kids, setKids] = React.useState(0);
  const [name, setName] = React.useState("");
  const [err, setErr] = React.useState(null);
  const total = adults * svc.adult + kids * svc.child;
  const save = () => {
    if (!name.trim()) {
      setErr(["Thông tin khách: chưa nhập tên khách"]);
      return;
    }
    onSave({
      name,
      total,
      pax: `${adults}NL${kids ? ` ${kids}TE` : ""}`,
      service: svc.name
    });
  };
  const summary = /*#__PURE__*/React.createElement(FCard, {
    variant: "bordered"
  }, /*#__PURE__*/React.createElement("h2", null, "T\xF3m t\u1EAFt"), /*#__PURE__*/React.createElement(FKV, {
    label: `${svc.name}`
  }, fvnd(total)), /*#__PURE__*/React.createElement(FKV, {
    label: "\u0110\u1EB7t c\u1ECDc"
  }, "0 \u20AB"), /*#__PURE__*/React.createElement(FKV, {
    label: "C\xF2n thu",
    strong: true
  }, fvnd(total)), !phone && /*#__PURE__*/React.createElement(FButton, {
    variant: "primary",
    block: true,
    onClick: save,
    style: {
      marginTop: 12
    }
  }, "L\u01B0u \u0111\u01A1n nh\xE1p"));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: phone ? 96 : 0
    }
  }, !phone && /*#__PURE__*/React.createElement("h1", null, "T\u1EA1o \u0111\u01A1n"), err && /*#__PURE__*/React.createElement(FBanner, {
    tone: "danger",
    title: "Kh\xF4ng l\u01B0u \u0111\u01B0\u1EE3c \u0111\u01A1n",
    lines: err,
    style: {
      marginBottom: 16
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: phone ? null : {
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) var(--w-side)",
      gap: 24,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(FCard, {
    variant: "bordered",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h2", null, "Th\xF4ng tin kh\xE1ch"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: phone ? "1fr" : "1fr 1fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(FField, {
    label: "T\xEAn kh\xE1ch",
    placeholder: "Nguy\u1EC5n V\u0103n A",
    value: name,
    onChange: e => {
      setName(e.target.value);
      setErr(null);
    },
    error: err && !name ? "Cần nhập tên khách" : null
  }), /*#__PURE__*/React.createElement(FField, {
    label: "S\u1ED1 \u0111i\u1EC7n tho\u1EA1i",
    type: "tel",
    placeholder: "09xx xxx xxx"
  }))), /*#__PURE__*/React.createElement(FCard, {
    variant: "bordered",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h2", null, "D\u1ECBch v\u1EE5"), /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--c-border)",
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 12
    }
  }, data.services.map(s => /*#__PURE__*/React.createElement("button", {
    key: s.code,
    type: "button",
    onClick: () => setSvc(s),
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      width: "100%",
      padding: "10px 12px",
      font: "inherit",
      textAlign: "left",
      color: "var(--c-text)",
      background: s === svc ? "var(--c-surface-alt)" : "none",
      border: 0,
      borderBottom: "1px solid var(--c-border)",
      cursor: "pointer"
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
    style: {
      fontWeight: s === svc ? 700 : 500
    }
  }, s.name), " ", /*#__PURE__*/React.createElement(FChip, {
    tone: "code"
  }, s.code)), /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: "nowrap",
      color: "var(--c-text-muted)"
    }
  }, fvnd(s.adult))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16,
      background: "var(--c-card)",
      border: "1px solid var(--c-border)",
      borderRadius: 12,
      boxShadow: "var(--shadow-card)"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 16,
      fontWeight: 700,
      lineHeight: 1.3
    }
  }, svc.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(FChip, {
    tone: "code"
  }, svc.code), /*#__PURE__*/React.createElement(FChip, null, "/ kh\xE1ch")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      fontSize: 14,
      fontWeight: 600,
      color: "var(--c-text-muted)"
    }
  }, "S\u1ED1 kh\xE1ch"), /*#__PURE__*/React.createElement(FGuestRow, {
    label: "Ng\u01B0\u1EDDi l\u1EDBn",
    sub: /*#__PURE__*/React.createElement(FPriceTag, null, fvnd(svc.adult))
  }, /*#__PURE__*/React.createElement(FCounter, {
    value: adults,
    onChange: setAdults
  })), /*#__PURE__*/React.createElement(FGuestRow, {
    label: "Tr\u1EBB em",
    sub: /*#__PURE__*/React.createElement(FPriceTag, null, fvnd(svc.child))
  }, /*#__PURE__*/React.createElement(FCounter, {
    value: kids,
    onChange: setKids
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", null, "Th\xE0nh ti\u1EC1n"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800
    }
  }, fvnd(total)))))), !phone && summary), phone && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      flexDirection: "column",
      padding: "12px 16px",
      background: "var(--c-surface)",
      borderTop: "1px solid var(--c-border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8,
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", null, "C\xF2n thu"), /*#__PURE__*/React.createElement("b", {
    style: {
      color: "var(--c-accent)"
    }
  }, fvnd(total))), /*#__PURE__*/React.createElement(FButton, {
    variant: "primary",
    block: true,
    onClick: save
  }, "L\u01B0u \u0111\u01A1n nh\xE1p")));
}
window.OrderFormScreen = OrderFormScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/booking-app/OrderForm.jsx", error: String((e && e.message) || e) }); }

// ui_kits/booking-app/Orders.jsx
try { (() => {
const {
  OrderCard: OOrderCard,
  Field: OField,
  Button: OButton
} = window.TourOBookingDesignSystem_34f284;
const ovnd = n => new Intl.NumberFormat("vi-VN").format(n) + " ₫";
function OrdersScreen({
  data,
  onOpen,
  onNew,
  phone
}) {
  const [q, setQ] = React.useState("");
  const [st, setSt] = React.useState("");
  const list = data.orders.filter(o => (!st || o.status === st) && (!q || (o.name + o.code + o.phone).toLowerCase().includes(q.toLowerCase())));
  return /*#__PURE__*/React.createElement("div", null, !phone && /*#__PURE__*/React.createElement("h1", null, "\u0110\u01A1n h\xE0ng"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "search",
    placeholder: "T\xECm m\xE3 \u0111\u01A1n, t\xEAn, S\u0110T\u2026",
    value: q,
    onChange: e => setQ(e.target.value),
    style: {
      flex: "1 1 220px",
      minWidth: 0,
      padding: "10px 12px",
      font: "inherit",
      fontSize: 16,
      color: "var(--c-text)",
      background: "#fff",
      border: "1px solid var(--c-border)",
      borderRadius: 8
    }
  }), /*#__PURE__*/React.createElement("select", {
    value: st,
    onChange: e => setSt(e.target.value),
    "aria-label": "L\u1ECDc tr\u1EA1ng th\xE1i",
    style: {
      flex: "0 0 auto",
      padding: "10px 12px",
      font: "inherit",
      fontSize: 16,
      color: "var(--c-text)",
      background: "#fff",
      border: "1px solid var(--c-border)",
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "M\u1ECDi tr\u1EA1ng th\xE1i"), /*#__PURE__*/React.createElement("option", {
    value: "draft"
  }, "Nh\xE1p"), /*#__PURE__*/React.createElement("option", {
    value: "confirmed"
  }, "\u0110\xE3 x\xE1c nh\u1EADn"), /*#__PURE__*/React.createElement("option", {
    value: "cancelled"
  }, "\u0110\xE3 hu\u1EF7")), !phone && /*#__PURE__*/React.createElement(OButton, {
    variant: "primary",
    onClick: onNew
  }, "+ T\u1EA1o \u0111\u01A1n")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 8
    }
  }, list.map((o, i) => /*#__PURE__*/React.createElement(OOrderCard, {
    key: o.id,
    index: i + 1,
    when: o.when,
    name: o.name,
    status: o.status,
    phone: o.phone,
    pax: o.pax,
    remaining: o.remaining,
    onOpen: () => onOpen(o.id),
    details: [`Khách: ${o.name}`, `Mã đơn: ${o.code}`, `Số khách: ${o.paxFull}`, `Đã trả ${ovnd(o.paid)}`, `Tổng ${ovnd(o.total)}`, o.service, `Đón tại ${o.place}`, `Người lập: ${o.staff}`, /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 600,
        color: "var(--c-text)"
      }
    }, o.handler ? `Phụ trách: ${o.handler}` : "Chưa có người phụ trách")]
  }))), list.length === 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      padding: "32px 16px",
      textAlign: "center",
      color: "var(--c-text-muted)"
    }
  }, "Ch\u01B0a c\xF3 \u0111\u01A1n n\xE0o kh\u1EDBp."));
}
window.OrdersScreen = OrdersScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/booking-app/Orders.jsx", error: String((e && e.message) || e) }); }

// ui_kits/booking-app/data.js
try { (() => {
// Fake sample data for the UI kit (not real customers).
window.TDB_DATA = {
  user: {
    name: "Lê Thu Trang",
    role: "Bán hàng · Quản trị"
  },
  orders: [{
    id: "o1",
    code: "TD-20261012-0003",
    when: "12/10 · 07:30",
    time: "07:30",
    date: "12/10",
    name: "Nguyễn Thị Hương",
    status: "confirmed",
    phone: "0901 234 567",
    pax: "4NL 2TE",
    paxFull: "04 NL · 02 TE",
    remaining: 1200000,
    paid: 4150000,
    total: 5350000,
    place: "Cầu cảng Vĩnh Nguyên",
    service: "Tour 4 đảo Nha Trang",
    staff: "Lê Thu Trang",
    handler: "Phạm Văn Lộc",
    today: true
  }, {
    id: "o2",
    code: "TD-20261012-0004",
    when: "12/10 · 08:15",
    time: "08:15",
    date: "12/10",
    name: "Đoàn công ty Hải Âu",
    status: "confirmed",
    phone: "0935 888 120",
    pax: "12NL",
    paxFull: "12 NL",
    remaining: 0,
    paid: 9480000,
    total: 9480000,
    place: "KS Mường Thanh Luxury",
    service: "Tour Đảo Khỉ +1 dịch vụ",
    staff: "Trần Minh Khoa",
    handler: null,
    today: true
  }, {
    id: "o3",
    code: "TD-20261012-0007",
    when: "12/10 · 13:00",
    time: "13:00",
    date: "12/10",
    name: "Anh Đặng Quốc Bảo",
    status: "draft",
    phone: "0977 456 019",
    pax: "2NL 1EB",
    paxFull: "02 NL · 01 EB",
    remaining: 1180000,
    paid: 0,
    total: 1180000,
    place: "Bến tàu Hòn Chồng",
    service: "Lặn ngắm san hô Hòn Mun",
    staff: "Lê Thu Trang",
    handler: null,
    today: true
  }, {
    id: "o4",
    code: "TD-20261013-0001",
    when: "13/10 · 07:00",
    time: "07:00",
    date: "13/10",
    name: "Chị Võ Ngọc Ánh",
    status: "draft",
    phone: "0868 221 334",
    pax: "3NL",
    paxFull: "03 NL",
    remaining: 1770000,
    paid: 0,
    total: 1770000,
    place: "Cầu cảng Vĩnh Nguyên",
    service: "Tour 4 đảo Nha Trang",
    staff: "Nguyễn Hải Yến",
    handler: null
  }, {
    id: "o5",
    code: "TD-20261014-0002",
    when: "14/10 · 09:00",
    time: "09:00",
    date: "14/10",
    name: "Gia đình ông Lý Thành",
    status: "cancelled",
    phone: "0912 005 678",
    pax: "2NL 2TE",
    paxFull: "02 NL · 02 TE",
    remaining: 0,
    paid: 0,
    total: 1960000,
    place: "Vinpearl Harbour",
    service: "Tour Đảo Hoa Lan",
    staff: "Trần Minh Khoa",
    handler: null
  }],
  week: [{
    label: "T2",
    total: 3200000,
    past: true
  }, {
    label: "T3",
    total: 5400000,
    past: true
  }, {
    label: "T4",
    total: 2100000,
    past: true
  }, {
    label: "T5",
    total: 6900000,
    past: true
  }, {
    label: "T6",
    total: 0
  }, {
    label: "T7",
    total: 0
  }, {
    label: "CN",
    total: 0
  }],
  services: [{
    code: "VN-DAO-01",
    name: "Tour 4 đảo Nha Trang",
    adult: 590000,
    child: 390000
  }, {
    code: "VN-DAO-03",
    name: "Lặn ngắm san hô Hòn Mun",
    adult: 690000,
    child: 490000
  }, {
    code: "VN-KHI-02",
    name: "Tour Đảo Khỉ",
    adult: 450000,
    child: 300000
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/booking-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHead = __ds_scope.CardHead;

__ds_ns.RowLink = __ds_scope.RowLink;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.PriceTag = __ds_scope.PriceTag;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.ICON_NAMES = __ds_scope.ICON_NAMES;

__ds_ns.Banner = __ds_scope.Banner;

__ds_ns.Note = __ds_scope.Note;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Sheet = __ds_scope.Sheet;

__ds_ns.Counter = __ds_scope.Counter;

__ds_ns.GuestRow = __ds_scope.GuestRow;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.Topbar = __ds_scope.Topbar;

__ds_ns.TabBar = __ds_scope.TabBar;

__ds_ns.MobileBar = __ds_scope.MobileBar;

__ds_ns.OrderCard = __ds_scope.OrderCard;

__ds_ns.StatTile = __ds_scope.StatTile;

__ds_ns.RevenueChart = __ds_scope.RevenueChart;

__ds_ns.SummaryBand = __ds_scope.SummaryBand;

__ds_ns.KV = __ds_scope.KV;

})();
