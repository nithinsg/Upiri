/*
 * ŪPIRI design-context runtime.
 *
 * The UPIRI_2.0 page is a design-context export: markup lives inside <x-dc>
 * with `sc-if` / `sc-for` control-flow elements and `{{ path }}` bindings, and
 * the component logic ships as a <script type="text/x-dc"> class extending
 * DCLogic. The exporter expects a ./support.js next to the page to provide that
 * base class and to render the template. This is that runtime.
 *
 * Supported template surface (everything the page uses):
 *   {{ path }}                  in text nodes and attribute values
 *   style="{{ obj }}"           React-style style objects or plain CSS strings
 *   style-hover="css"           hover overlay on top of the resolved style
 *   onClick / onChange="{{ h }}"  handler bound fresh on every render
 *   value="{{ x }}"             property binding for input / select / textarea
 *   <sc-if value="{{ cond }}">  conditional block
 *   <sc-for list="{{ a }}" as="o">  repeat block
 *   <helmet>                    hoisted into <head> at boot
 *   hint-placeholder-*          editor-only hints, stripped
 *
 * Rendering patches the live DOM in place (nodes are reused across renders) so
 * focus, caret position and CSS animations survive a state update.
 */
(function () {
  'use strict';

  /* ---------------- style objects ---------------- */

  var UNITLESS = {
    animationIterationCount: 1, aspectRatio: 1, borderImageOutset: 1, borderImageSlice: 1,
    borderImageWidth: 1, boxFlex: 1, boxFlexGroup: 1, boxOrdinalGroup: 1, columnCount: 1,
    columns: 1, flex: 1, flexGrow: 1, flexPositive: 1, flexShrink: 1, flexNegative: 1,
    flexOrder: 1, fontWeight: 1, gridArea: 1, gridColumn: 1, gridColumnEnd: 1, gridColumnSpan: 1,
    gridColumnStart: 1, gridRow: 1, gridRowEnd: 1, gridRowSpan: 1, gridRowStart: 1, lineClamp: 1,
    lineHeight: 1, opacity: 1, order: 1, orphans: 1, tabSize: 1, widows: 1, zIndex: 1, zoom: 1,
    fillOpacity: 1, floodOpacity: 1, stopOpacity: 1, strokeDasharray: 1, strokeDashoffset: 1,
    strokeMiterlimit: 1, strokeOpacity: 1, strokeWidth: 1
  };

  function kebab(k) {
    return k.charAt(0) === '-' ? k : k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
  }

  function styleText(v) {
    if (v == null || v === false || v === true) return '';
    if (typeof v === 'string') return v;
    var out = '';
    for (var k in v) {
      if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
      var raw = v[k];
      if (raw == null || raw === false || raw === '') continue;
      var val = (typeof raw === 'number' && raw !== 0 && !UNITLESS[k]) ? raw + 'px' : String(raw);
      out += kebab(k) + ':' + val + ';';
    }
    return out;
  }

  /* ---------------- expressions ---------------- */

  var BINDING = /\{\{\s*([^}]*?)\s*\}\}/g;

  function resolve(scope, path) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    var parts = path.split('.');
    var cur = scope[parts[0]];
    for (var i = 1; i < parts.length && cur != null; i++) cur = cur[parts[i]];
    return cur;
  }

  /* Splits "a {{ x }} b" into ['a ', {p:'x'}, ' b']; returns null when static. */
  function parseParts(text) {
    if (text.indexOf('{{') === -1) return null;
    var parts = [], last = 0, m;
    BINDING.lastIndex = 0;
    while ((m = BINDING.exec(text))) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      parts.push({ p: m[1] });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  function interp(parts, scope) {
    if (parts.length === 1 && typeof parts[0] === 'object') {
      var only = resolve(scope, parts[0].p);
      return only == null ? '' : String(only);
    }
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (typeof part === 'string') out += part;
      else { var v = resolve(scope, part.p); out += v == null ? '' : String(v); }
    }
    return out;
  }

  /* ---------------- compiler ---------------- */

  function isCtrl(el, name) { return el.localName.toLowerCase() === name; }

  function compileChildren(parent) {
    var out = [];
    for (var n = parent.firstChild; n; n = n.nextSibling) {
      var ins = compile(n);
      if (ins) out.push(ins);
    }
    return out;
  }

  function compile(node) {
    if (node.nodeType === 3) {
      var parts = parseParts(node.nodeValue);
      return parts ? { t: 'itext', parts: parts } : { t: 'text', v: node.nodeValue };
    }
    if (node.nodeType !== 1) return null; // comments and friends

    if (isCtrl(node, 'sc-if')) {
      return { t: 'if', path: attrPath(node, 'value'), children: compileChildren(node) };
    }
    if (isCtrl(node, 'sc-for')) {
      return {
        t: 'for',
        path: attrPath(node, 'list'),
        as: node.getAttribute('as') || 'item',
        children: compileChildren(node)
      };
    }

    var proto = node.cloneNode(false);
    var tag = node.localName.toLowerCase();
    var formControl = tag === 'input' || tag === 'select' || tag === 'textarea';
    var ins = {
      t: 'el', proto: proto, tag: tag,
      dyn: [], events: [], hover: null, styleParts: null,
      staticStyle: node.getAttribute('style') || '', valuePath: null,
      children: compileChildren(node)
    };

    var attrs = Array.prototype.slice.call(node.attributes);
    for (var i = 0; i < attrs.length; i++) {
      var name = attrs[i].name, lower = name.toLowerCase(), value = attrs[i].value;

      if (lower.indexOf('hint-placeholder') === 0) { proto.removeAttribute(name); continue; }

      if (lower === 'style-hover') {
        ins.hover = value;
        proto.removeAttribute(name);
        continue;
      }
      if (lower === 'onclick') {
        ins.events.push({ type: 'click', path: bare(value) });
        proto.removeAttribute(name);
        continue;
      }
      if (lower === 'onchange') {
        ins.events.push({
          type: (tag === 'input' || tag === 'textarea') ? 'input' : 'change',
          path: bare(value)
        });
        proto.removeAttribute(name);
        continue;
      }
      if (lower === 'value' && formControl) {
        var vp = parseParts(value);
        if (vp) { ins.valuePath = vp; proto.removeAttribute(name); }
        continue;
      }
      if (value.indexOf('{{') === -1) continue; // plain static attribute, keep as cloned

      if (lower === 'style') ins.styleParts = parseParts(value);
      else ins.dyn.push({ name: name, parts: parseParts(value) });
      proto.removeAttribute(name);
    }

    return ins;
  }

  function bare(value) {
    var m = /\{\{\s*([^}]*?)\s*\}\}/.exec(value);
    return m ? m[1] : value;
  }

  function attrPath(node, name) {
    return bare(node.getAttribute(name) || '');
  }

  /* ---------------- renderer ---------------- */

  function renderChildren(instrs, ctxs, scope, out) {
    for (var i = 0; i < instrs.length; i++) {
      if (!ctxs[i]) ctxs[i] = {};
      renderInstr(instrs[i], ctxs[i], scope, out);
    }
  }

  function renderInstr(ins, ctx, scope, out) {
    if (ins.t === 'text') {
      if (!ctx.node) ctx.node = document.createTextNode(ins.v);
      out.push(ctx.node);
      return;
    }
    if (ins.t === 'itext') {
      var text = interp(ins.parts, scope);
      if (!ctx.node) { ctx.node = document.createTextNode(text); ctx.last = text; }
      else if (ctx.last !== text) { ctx.node.nodeValue = text; ctx.last = text; }
      out.push(ctx.node);
      return;
    }
    if (ins.t === 'if') {
      if (resolve(scope, ins.path)) {
        if (!ctx.ctxs) ctx.ctxs = [];
        renderChildren(ins.children, ctx.ctxs, scope, out);
      } else {
        ctx.ctxs = null; // drop instances; rebuilt fresh so entry animations replay
      }
      return;
    }
    if (ins.t === 'for') {
      var list = resolve(scope, ins.path);
      if (!Array.isArray(list)) list = list ? Array.prototype.slice.call(list) : [];
      if (!ctx.items) ctx.items = [];
      if (ctx.items.length > list.length) ctx.items.length = list.length;
      for (var i = 0; i < list.length; i++) {
        if (!ctx.items[i]) ctx.items[i] = [];
        var sub = Object.create(scope);
        sub[ins.as] = list[i];
        sub.$index = i;
        renderChildren(ins.children, ctx.items[i], sub, out);
      }
      return;
    }

    /* element */
    if (!ctx.node) {
      ctx.node = ins.proto.cloneNode(false);
      ctx.ctxs = [];
      ctx.handlers = {};
      bindEvents(ins, ctx);
    }

    for (var d = 0; d < ins.dyn.length; d++) {
      var a = ins.dyn[d];
      var av = interp(a.parts, scope);
      if (ctx['a_' + a.name] !== av) {
        ctx['a_' + a.name] = av;
        ctx.node.setAttribute(a.name, av);
      }
    }

    for (var e = 0; e < ins.events.length; e++) {
      ctx.handlers[ins.events[e].type] = resolve(scope, ins.events[e].path);
    }

    if (ins.styleParts) {
      ctx.base = ins.styleParts.length === 1 && typeof ins.styleParts[0] === 'object'
        ? styleText(resolve(scope, ins.styleParts[0].p))
        : interp(ins.styleParts, scope);
    } else if (ins.hover) {
      ctx.base = ins.staticStyle;
    }
    if (ins.styleParts || ins.hover) applyStyle(ins, ctx);

    var kids = [];
    renderChildren(ins.children, ctx.ctxs, scope, kids);
    patchChildren(ctx.node, kids);

    if (ins.valuePath) {
      var val = interp(ins.valuePath, scope);
      if (ctx.node.value !== val) ctx.node.value = val;
    }

    out.push(ctx.node);
  }

  function applyStyle(ins, ctx) {
    var text = ctx.base || '';
    if (ins.hover && ctx.hovering) {
      if (text && text.charAt(text.length - 1) !== ';') text += ';';
      text += ins.hover;
    }
    if (ctx.styleText === text) return;
    ctx.styleText = text;
    ctx.node.style.cssText = text;
  }

  function bindEvents(ins, ctx) {
    for (var i = 0; i < ins.events.length; i++) {
      (function (type) {
        ctx.node.addEventListener(type, function (ev) {
          var h = ctx.handlers[type];
          if (typeof h === 'function') h(ev);
        });
      })(ins.events[i].type);
    }
    if (ins.hover) {
      ctx.node.addEventListener('mouseenter', function () { ctx.hovering = true; applyStyle(ins, ctx); });
      ctx.node.addEventListener('mouseleave', function () { ctx.hovering = false; applyStyle(ins, ctx); });
      ctx.node.addEventListener('focus', function () { ctx.hovering = true; applyStyle(ins, ctx); });
      ctx.node.addEventListener('blur', function () { ctx.hovering = false; applyStyle(ins, ctx); });
    }
  }

  function patchChildren(parent, nodes) {
    var wanted = nodes.length ? new Set(nodes) : null;
    for (var n = parent.firstChild; n;) {
      var next = n.nextSibling;
      if (!wanted || !wanted.has(n)) parent.removeChild(n);
      n = next;
    }
    var ref = parent.firstChild;
    for (var i = 0; i < nodes.length; i++) {
      if (ref === nodes[i]) ref = ref.nextSibling;
      else parent.insertBefore(nodes[i], ref);
    }
  }

  /* ---------------- component base ---------------- */

  class DCLogic {
    constructor(props) {
      this.props = props || {};
      this.state = {};
    }
    setState(patch) {
      var next = typeof patch === 'function' ? patch(this.state) : patch;
      if (next) Object.assign(this.state, next);
      if (this._scheduleRender) this._scheduleRender();
    }
    componentDidMount() {}
    renderVals() { return {}; }
  }
  window.DCLogic = DCLogic;

  /* ---------------- boot ---------------- */

  function readProps(scriptEl) {
    var props = {};
    var raw = scriptEl && scriptEl.getAttribute('data-props');
    if (!raw) return props;
    try {
      var spec = JSON.parse(raw);
      for (var k in spec) if (Object.prototype.hasOwnProperty.call(spec, k)) props[k] = spec[k].default;
    } catch (err) {
      console.warn('[dc] could not read data-props:', err);
    }
    /* ?prop=value overrides, so screens stay linkable for review. */
    try {
      new URLSearchParams(location.search).forEach(function (value, key) {
        if (!(key in props)) return;
        props[key] = value === 'true' ? true : value === 'false' ? false : value;
      });
    } catch {
      /* no URLSearchParams support: keep the defaults */
    }
    return props;
  }

  function boot() {
    var root = document.querySelector('x-dc');
    var scriptEl = document.querySelector('script[data-dc-script]');
    if (!root || !scriptEl) return;

    var helmet = root.querySelector('helmet');
    if (helmet) {
      while (helmet.firstChild) document.head.appendChild(helmet.firstChild);
      helmet.parentNode.removeChild(helmet);
    }

    /* Markup lives in an inert <template> so the browser never tries to parse
       `{{ … }}` as real SVG geometry (cx/cy/r/d) while loading the page. */
    var host = root.querySelector('template[data-dc-template]');
    var template = compileChildren(host ? host.content : root);
    while (root.firstChild) root.removeChild(root.firstChild);

    var Component;
    try {
      Component = new Function('DCLogic', scriptEl.textContent + '\nreturn Component;')(DCLogic);
    } catch (err) {
      console.error('[dc] component script failed to evaluate:', err);
      return;
    }

    var app = new Component(readProps(scriptEl));
    var ctxs = [];
    var queued = false;

    function render() {
      var vals = app.renderVals();
      var nodes = [];
      renderChildren(template, ctxs, vals, nodes);
      patchChildren(root, nodes);
    }

    app._scheduleRender = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; render(); });
    };

    render();
    if (typeof app.componentDidMount === 'function') app.componentDidMount();
    window.__dc = { app: app, render: render };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
