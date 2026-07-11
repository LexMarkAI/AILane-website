(() => {
  // node_modules/dompurify/dist/purify.es.mjs
  function _arrayLikeToArray(r, a) {
    (null == a || a > r.length) && (a = r.length);
    for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
    return n;
  }
  function _arrayWithHoles(r) {
    if (Array.isArray(r)) return r;
  }
  function _iterableToArrayLimit(r, l) {
    var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
    if (null != t) {
      var e, n, i, u, a = [], f = true, o = false;
      try {
        if (i = (t = t.call(r)).next, 0 === l) ;
        else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = true) ;
      } catch (r2) {
        o = true, n = r2;
      } finally {
        try {
          if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
        } finally {
          if (o) throw n;
        }
      }
      return a;
    }
  }
  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }
  function _slicedToArray(r, e) {
    return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
  }
  function _unsupportedIterableToArray(r, a) {
    if (r) {
      if ("string" == typeof r) return _arrayLikeToArray(r, a);
      var t = {}.toString.call(r).slice(8, -1);
      return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
    }
  }
  var entries = Object.entries;
  var setPrototypeOf = Object.setPrototypeOf;
  var isFrozen = Object.isFrozen;
  var getPrototypeOf = Object.getPrototypeOf;
  var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  var freeze = Object.freeze;
  var seal = Object.seal;
  var create = Object.create;
  var _ref = typeof Reflect !== "undefined" && Reflect;
  var apply = _ref.apply;
  var construct = _ref.construct;
  if (!freeze) {
    freeze = function freeze2(x) {
      return x;
    };
  }
  if (!seal) {
    seal = function seal2(x) {
      return x;
    };
  }
  if (!apply) {
    apply = function apply2(func, thisArg) {
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        args[_key - 2] = arguments[_key];
      }
      return func.apply(thisArg, args);
    };
  }
  if (!construct) {
    construct = function construct2(Func) {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      return new Func(...args);
    };
  }
  var arrayForEach = unapply(Array.prototype.forEach);
  var arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
  var arrayPop = unapply(Array.prototype.pop);
  var arrayPush = unapply(Array.prototype.push);
  var arraySplice = unapply(Array.prototype.splice);
  var arrayIsArray = Array.isArray;
  var stringToLowerCase = unapply(String.prototype.toLowerCase);
  var stringToString = unapply(String.prototype.toString);
  var stringMatch = unapply(String.prototype.match);
  var stringReplace = unapply(String.prototype.replace);
  var stringIndexOf = unapply(String.prototype.indexOf);
  var stringTrim = unapply(String.prototype.trim);
  var numberToString = unapply(Number.prototype.toString);
  var booleanToString = unapply(Boolean.prototype.toString);
  var bigintToString = typeof BigInt === "undefined" ? null : unapply(BigInt.prototype.toString);
  var symbolToString = typeof Symbol === "undefined" ? null : unapply(Symbol.prototype.toString);
  var objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
  var objectToString = unapply(Object.prototype.toString);
  var regExpTest = unapply(RegExp.prototype.test);
  var typeErrorCreate = unconstruct(TypeError);
  function unapply(func) {
    return function(thisArg) {
      if (thisArg instanceof RegExp) {
        thisArg.lastIndex = 0;
      }
      for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        args[_key3 - 1] = arguments[_key3];
      }
      return apply(func, thisArg, args);
    };
  }
  function unconstruct(Func) {
    return function() {
      for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        args[_key4] = arguments[_key4];
      }
      return construct(Func, args);
    };
  }
  function addToSet(set, array) {
    let transformCaseFunc = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : stringToLowerCase;
    if (setPrototypeOf) {
      setPrototypeOf(set, null);
    }
    if (!arrayIsArray(array)) {
      return set;
    }
    let l = array.length;
    while (l--) {
      let element = array[l];
      if (typeof element === "string") {
        const lcElement = transformCaseFunc(element);
        if (lcElement !== element) {
          if (!isFrozen(array)) {
            array[l] = lcElement;
          }
          element = lcElement;
        }
      }
      set[element] = true;
    }
    return set;
  }
  function cleanArray(array) {
    for (let index = 0; index < array.length; index++) {
      const isPropertyExist = objectHasOwnProperty(array, index);
      if (!isPropertyExist) {
        array[index] = null;
      }
    }
    return array;
  }
  function clone(object) {
    const newObject = create(null);
    for (const _ref2 of entries(object)) {
      var _ref3 = _slicedToArray(_ref2, 2);
      const property = _ref3[0];
      const value = _ref3[1];
      const isPropertyExist = objectHasOwnProperty(object, property);
      if (isPropertyExist) {
        if (arrayIsArray(value)) {
          newObject[property] = cleanArray(value);
        } else if (value && typeof value === "object" && value.constructor === Object) {
          newObject[property] = clone(value);
        } else {
          newObject[property] = value;
        }
      }
    }
    return newObject;
  }
  function stringifyValue(value) {
    switch (typeof value) {
      case "string": {
        return value;
      }
      case "number": {
        return numberToString(value);
      }
      case "boolean": {
        return booleanToString(value);
      }
      case "bigint": {
        return bigintToString ? bigintToString(value) : "0";
      }
      case "symbol": {
        return symbolToString ? symbolToString(value) : "Symbol()";
      }
      case "undefined": {
        return objectToString(value);
      }
      case "function":
      case "object": {
        if (value === null) {
          return objectToString(value);
        }
        const valueAsRecord = value;
        const valueToString = lookupGetter(valueAsRecord, "toString");
        if (typeof valueToString === "function") {
          const stringified = valueToString(valueAsRecord);
          return typeof stringified === "string" ? stringified : objectToString(stringified);
        }
        return objectToString(value);
      }
      default: {
        return objectToString(value);
      }
    }
  }
  function lookupGetter(object, prop) {
    while (object !== null) {
      const desc = getOwnPropertyDescriptor(object, prop);
      if (desc) {
        if (desc.get) {
          return unapply(desc.get);
        }
        if (typeof desc.value === "function") {
          return unapply(desc.value);
        }
      }
      object = getPrototypeOf(object);
    }
    function fallbackValue() {
      return null;
    }
    return fallbackValue;
  }
  function isRegex(value) {
    try {
      regExpTest(value, "");
      return true;
    } catch (_unused) {
      return false;
    }
  }
  var html$1 = freeze(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "search", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]);
  var svg$1 = freeze(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "enterkeyhint", "exportparts", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "inputmode", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "part", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]);
  var svgFilters = freeze(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]);
  var svgDisallowed = freeze(["animate", "color-profile", "cursor", "discard", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]);
  var mathMl$1 = freeze(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "mprescripts"]);
  var mathMlDisallowed = freeze(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]);
  var text = freeze(["#text"]);
  var html = freeze(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "command", "commandfor", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "exportparts", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inert", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "nonce", "noshade", "novalidate", "nowrap", "open", "optimum", "part", "pattern", "placeholder", "playsinline", "popover", "popovertarget", "popovertargetaction", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "slot", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "wrap", "xmlns"]);
  var svg = freeze(["accent-height", "accumulate", "additive", "alignment-baseline", "amplitude", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dur", "edgemode", "elevation", "end", "exponent", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "intercept", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "mask-type", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "slope", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "tablevalues", "targetx", "targety", "transform", "transform-origin", "text-anchor", "text-decoration", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]);
  var mathMl = freeze(["accent", "accentunder", "align", "bevelled", "close", "columnalign", "columnlines", "columnspacing", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lquote", "lspace", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]);
  var xml = freeze(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]);
  var MUSTACHE_EXPR = seal(/{{[\w\W]*|^[\w\W]*}}/g);
  var ERB_EXPR = seal(/<%[\w\W]*|^[\w\W]*%>/g);
  var TMPLIT_EXPR = seal(/\${[\w\W]*/g);
  var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/);
  var ARIA_ATTR = seal(/^aria-[\-\w]+$/);
  var IS_ALLOWED_URI = seal(
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    // eslint-disable-line no-useless-escape
  );
  var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
  var ATTR_WHITESPACE = seal(
    /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g
    // eslint-disable-line no-control-regex
  );
  var DOCTYPE_NAME = seal(/^html$/i);
  var CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);
  var ELEMENT_MARKUP_PROBE = seal(/<[/\w!]/g);
  var COMMENT_MARKUP_PROBE = seal(/<[/\w]/g);
  var FALLBACK_TAG_CLOSE = seal(/<\/no(script|embed|frames)/i);
  var SELF_CLOSING_TAG = seal(/\/>/i);
  var NODE_TYPE = {
    element: 1,
    attribute: 2,
    text: 3,
    cdataSection: 4,
    entityReference: 5,
    // Deprecated
    entityNode: 6,
    // Deprecated
    processingInstruction: 7,
    comment: 8,
    document: 9,
    documentType: 10,
    documentFragment: 11,
    notation: 12
    // Deprecated
  };
  var getGlobal = function getGlobal2() {
    return typeof window === "undefined" ? null : window;
  };
  var _createTrustedTypesPolicy = function _createTrustedTypesPolicy2(trustedTypes, purifyHostElement) {
    if (typeof trustedTypes !== "object" || typeof trustedTypes.createPolicy !== "function") {
      return null;
    }
    let suffix = null;
    const ATTR_NAME = "data-tt-policy-suffix";
    if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) {
      suffix = purifyHostElement.getAttribute(ATTR_NAME);
    }
    const policyName = "dompurify" + (suffix ? "#" + suffix : "");
    try {
      return trustedTypes.createPolicy(policyName, {
        createHTML(html2) {
          return html2;
        },
        createScriptURL(scriptUrl) {
          return scriptUrl;
        }
      });
    } catch (_) {
      console.warn("TrustedTypes policy " + policyName + " could not be created.");
      return null;
    }
  };
  var _createHooksMap = function _createHooksMap2() {
    return {
      afterSanitizeAttributes: [],
      afterSanitizeElements: [],
      afterSanitizeShadowDOM: [],
      beforeSanitizeAttributes: [],
      beforeSanitizeElements: [],
      beforeSanitizeShadowDOM: [],
      uponSanitizeAttribute: [],
      uponSanitizeElement: [],
      uponSanitizeShadowNode: []
    };
  };
  var _resolveSetOption = function _resolveSetOption2(cfg, key, fallback, options) {
    return objectHasOwnProperty(cfg, key) && arrayIsArray(cfg[key]) ? addToSet(options.base ? clone(options.base) : {}, cfg[key], options.transform) : fallback;
  };
  function createDOMPurify() {
    let window2 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : getGlobal();
    const DOMPurify = (root) => createDOMPurify(root);
    DOMPurify.version = "3.4.11";
    DOMPurify.removed = [];
    if (!window2 || !window2.document || window2.document.nodeType !== NODE_TYPE.document || !window2.Element) {
      DOMPurify.isSupported = false;
      return DOMPurify;
    }
    let document2 = window2.document;
    const originalDocument = document2;
    const currentScript = originalDocument.currentScript;
    window2.DocumentFragment;
    const HTMLTemplateElement = window2.HTMLTemplateElement, Node = window2.Node, Element = window2.Element, NodeFilter = window2.NodeFilter, _window$NamedNodeMap = window2.NamedNodeMap;
    _window$NamedNodeMap === void 0 ? window2.NamedNodeMap || window2.MozNamedAttrMap : _window$NamedNodeMap;
    window2.HTMLFormElement;
    const DOMParser = window2.DOMParser, trustedTypes = window2.trustedTypes;
    const ElementPrototype = Element.prototype;
    const cloneNode = lookupGetter(ElementPrototype, "cloneNode");
    const remove = lookupGetter(ElementPrototype, "remove");
    const getNextSibling = lookupGetter(ElementPrototype, "nextSibling");
    const getChildNodes = lookupGetter(ElementPrototype, "childNodes");
    const getParentNode = lookupGetter(ElementPrototype, "parentNode");
    const getShadowRoot = lookupGetter(ElementPrototype, "shadowRoot");
    const getAttributes = lookupGetter(ElementPrototype, "attributes");
    const getNodeType = Node && Node.prototype ? lookupGetter(Node.prototype, "nodeType") : null;
    const getNodeName = Node && Node.prototype ? lookupGetter(Node.prototype, "nodeName") : null;
    if (typeof HTMLTemplateElement === "function") {
      const template = document2.createElement("template");
      if (template.content && template.content.ownerDocument) {
        document2 = template.content.ownerDocument;
      }
    }
    let trustedTypesPolicy;
    let emptyHTML = "";
    let defaultTrustedTypesPolicy;
    let defaultTrustedTypesPolicyResolved = false;
    let IN_TRUSTED_TYPES_POLICY = 0;
    const _assertNotInTrustedTypesPolicy = function _assertNotInTrustedTypesPolicy2() {
      if (IN_TRUSTED_TYPES_POLICY > 0) {
        throw typeErrorCreate('A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.');
      }
    };
    const _createTrustedHTML = function _createTrustedHTML2(html2) {
      _assertNotInTrustedTypesPolicy();
      IN_TRUSTED_TYPES_POLICY++;
      try {
        return trustedTypesPolicy.createHTML(html2);
      } finally {
        IN_TRUSTED_TYPES_POLICY--;
      }
    };
    const _createTrustedScriptURL = function _createTrustedScriptURL2(scriptUrl) {
      _assertNotInTrustedTypesPolicy();
      IN_TRUSTED_TYPES_POLICY++;
      try {
        return trustedTypesPolicy.createScriptURL(scriptUrl);
      } finally {
        IN_TRUSTED_TYPES_POLICY--;
      }
    };
    const _getDefaultTrustedTypesPolicy = function _getDefaultTrustedTypesPolicy2() {
      if (!defaultTrustedTypesPolicyResolved) {
        defaultTrustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
        defaultTrustedTypesPolicyResolved = true;
      }
      return defaultTrustedTypesPolicy;
    };
    const _document = document2, implementation = _document.implementation, createNodeIterator = _document.createNodeIterator, createDocumentFragment = _document.createDocumentFragment, getElementsByTagName = _document.getElementsByTagName;
    const importNode = originalDocument.importNode;
    let hooks = _createHooksMap();
    DOMPurify.isSupported = typeof entries === "function" && typeof getParentNode === "function" && implementation && implementation.createHTMLDocument !== void 0;
    const MUSTACHE_EXPR$1 = MUSTACHE_EXPR, ERB_EXPR$1 = ERB_EXPR, TMPLIT_EXPR$1 = TMPLIT_EXPR, DATA_ATTR$1 = DATA_ATTR, ARIA_ATTR$1 = ARIA_ATTR, IS_SCRIPT_OR_DATA$1 = IS_SCRIPT_OR_DATA, ATTR_WHITESPACE$1 = ATTR_WHITESPACE, CUSTOM_ELEMENT$1 = CUSTOM_ELEMENT;
    let IS_ALLOWED_URI$1 = IS_ALLOWED_URI;
    let ALLOWED_TAGS = null;
    const DEFAULT_ALLOWED_TAGS = addToSet({}, [...html$1, ...svg$1, ...svgFilters, ...mathMl$1, ...text]);
    let ALLOWED_ATTR = null;
    const DEFAULT_ALLOWED_ATTR = addToSet({}, [...html, ...svg, ...mathMl, ...xml]);
    let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
      tagNameCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      },
      attributeNameCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      },
      allowCustomizedBuiltInElements: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: false
      }
    }));
    let FORBID_TAGS = null;
    let FORBID_ATTR = null;
    const EXTRA_ELEMENT_HANDLING = Object.seal(create(null, {
      tagCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      },
      attributeCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      }
    }));
    let ALLOW_ARIA_ATTR = true;
    let ALLOW_DATA_ATTR = true;
    let ALLOW_UNKNOWN_PROTOCOLS = false;
    let ALLOW_SELF_CLOSE_IN_ATTR = true;
    let SAFE_FOR_TEMPLATES = false;
    let SAFE_FOR_XML = true;
    let WHOLE_DOCUMENT = false;
    let SET_CONFIG = false;
    let SET_CONFIG_ALLOWED_TAGS = null;
    let SET_CONFIG_ALLOWED_ATTR = null;
    let FORCE_BODY = false;
    let RETURN_DOM = false;
    let RETURN_DOM_FRAGMENT = false;
    let RETURN_TRUSTED_TYPE = false;
    let SANITIZE_DOM = true;
    let SANITIZE_NAMED_PROPS = false;
    const SANITIZE_NAMED_PROPS_PREFIX = "user-content-";
    let KEEP_CONTENT = true;
    let IN_PLACE = false;
    let USE_PROFILES = {};
    let FORBID_CONTENTS = null;
    const DEFAULT_FORBID_CONTENTS = addToSet({}, [
      "annotation-xml",
      "audio",
      "colgroup",
      "desc",
      "foreignobject",
      "head",
      "iframe",
      "math",
      "mi",
      "mn",
      "mo",
      "ms",
      "mtext",
      "noembed",
      "noframes",
      "noscript",
      "plaintext",
      "script",
      // <selectedcontent> mirrors the selected <option>'s subtree, cloned by
      // the UA (customizable <select>) — including any on* handlers — and the
      // engine re-mirrors synchronously whenever a removal changes which
      // option/selectedcontent is current, even inside DOMPurify's inert
      // DOMParser document. Hoisting its children on removal re-inserts a fresh
      // mirror target ahead of the walk, which the engine refills, looping
      // forever (DoS) and amplifying output. Dropping its content on removal
      // (rather than hoisting) breaks that cascade; the content is a duplicate
      // of the option, which is sanitized on its own. See campaign-3 F1/F6.
      "selectedcontent",
      "style",
      "svg",
      "template",
      "thead",
      "title",
      "video",
      "xmp"
    ]);
    let DATA_URI_TAGS = null;
    const DEFAULT_DATA_URI_TAGS = addToSet({}, ["audio", "video", "img", "source", "image", "track"]);
    let URI_SAFE_ATTRIBUTES = null;
    const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "role", "summary", "title", "value", "style", "xmlns"]);
    const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
    const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
    let NAMESPACE = HTML_NAMESPACE;
    let IS_EMPTY_INPUT = false;
    let ALLOWED_NAMESPACES = null;
    const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [MATHML_NAMESPACE, SVG_NAMESPACE, HTML_NAMESPACE], stringToString);
    const DEFAULT_MATHML_TEXT_INTEGRATION_POINTS = freeze(["mi", "mo", "mn", "ms", "mtext"]);
    let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS);
    const DEFAULT_HTML_INTEGRATION_POINTS = freeze(["annotation-xml"]);
    let HTML_INTEGRATION_POINTS = addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS);
    const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, ["title", "style", "font", "a", "script"]);
    let PARSER_MEDIA_TYPE = null;
    const SUPPORTED_PARSER_MEDIA_TYPES = ["application/xhtml+xml", "text/html"];
    const DEFAULT_PARSER_MEDIA_TYPE = "text/html";
    let transformCaseFunc = null;
    let CONFIG = null;
    const formElement = document2.createElement("form");
    const isRegexOrFunction = function isRegexOrFunction2(testValue) {
      return testValue instanceof RegExp || testValue instanceof Function;
    };
    const _parseConfig = function _parseConfig2() {
      let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      if (CONFIG && CONFIG === cfg) {
        return;
      }
      if (!cfg || typeof cfg !== "object") {
        cfg = {};
      }
      cfg = clone(cfg);
      PARSER_MEDIA_TYPE = // eslint-disable-next-line unicorn/prefer-includes
      SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
      transformCaseFunc = PARSER_MEDIA_TYPE === "application/xhtml+xml" ? stringToString : stringToLowerCase;
      ALLOWED_TAGS = _resolveSetOption(cfg, "ALLOWED_TAGS", DEFAULT_ALLOWED_TAGS, {
        transform: transformCaseFunc
      });
      ALLOWED_ATTR = _resolveSetOption(cfg, "ALLOWED_ATTR", DEFAULT_ALLOWED_ATTR, {
        transform: transformCaseFunc
      });
      ALLOWED_NAMESPACES = _resolveSetOption(cfg, "ALLOWED_NAMESPACES", DEFAULT_ALLOWED_NAMESPACES, {
        transform: stringToString
      });
      URI_SAFE_ATTRIBUTES = _resolveSetOption(cfg, "ADD_URI_SAFE_ATTR", DEFAULT_URI_SAFE_ATTRIBUTES, {
        transform: transformCaseFunc,
        base: DEFAULT_URI_SAFE_ATTRIBUTES
      });
      DATA_URI_TAGS = _resolveSetOption(cfg, "ADD_DATA_URI_TAGS", DEFAULT_DATA_URI_TAGS, {
        transform: transformCaseFunc,
        base: DEFAULT_DATA_URI_TAGS
      });
      FORBID_CONTENTS = _resolveSetOption(cfg, "FORBID_CONTENTS", DEFAULT_FORBID_CONTENTS, {
        transform: transformCaseFunc
      });
      FORBID_TAGS = _resolveSetOption(cfg, "FORBID_TAGS", clone({}), {
        transform: transformCaseFunc
      });
      FORBID_ATTR = _resolveSetOption(cfg, "FORBID_ATTR", clone({}), {
        transform: transformCaseFunc
      });
      USE_PROFILES = objectHasOwnProperty(cfg, "USE_PROFILES") ? cfg.USE_PROFILES && typeof cfg.USE_PROFILES === "object" ? clone(cfg.USE_PROFILES) : cfg.USE_PROFILES : false;
      ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false;
      ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false;
      ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false;
      ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false;
      SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false;
      SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false;
      WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false;
      RETURN_DOM = cfg.RETURN_DOM || false;
      RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false;
      RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false;
      FORCE_BODY = cfg.FORCE_BODY || false;
      SANITIZE_DOM = cfg.SANITIZE_DOM !== false;
      SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false;
      KEEP_CONTENT = cfg.KEEP_CONTENT !== false;
      IN_PLACE = cfg.IN_PLACE || false;
      IS_ALLOWED_URI$1 = isRegex(cfg.ALLOWED_URI_REGEXP) ? cfg.ALLOWED_URI_REGEXP : IS_ALLOWED_URI;
      NAMESPACE = typeof cfg.NAMESPACE === "string" ? cfg.NAMESPACE : HTML_NAMESPACE;
      MATHML_TEXT_INTEGRATION_POINTS = objectHasOwnProperty(cfg, "MATHML_TEXT_INTEGRATION_POINTS") && cfg.MATHML_TEXT_INTEGRATION_POINTS && typeof cfg.MATHML_TEXT_INTEGRATION_POINTS === "object" ? clone(cfg.MATHML_TEXT_INTEGRATION_POINTS) : addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS);
      HTML_INTEGRATION_POINTS = objectHasOwnProperty(cfg, "HTML_INTEGRATION_POINTS") && cfg.HTML_INTEGRATION_POINTS && typeof cfg.HTML_INTEGRATION_POINTS === "object" ? clone(cfg.HTML_INTEGRATION_POINTS) : addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS);
      const customElementHandling = objectHasOwnProperty(cfg, "CUSTOM_ELEMENT_HANDLING") && cfg.CUSTOM_ELEMENT_HANDLING && typeof cfg.CUSTOM_ELEMENT_HANDLING === "object" ? clone(cfg.CUSTOM_ELEMENT_HANDLING) : create(null);
      CUSTOM_ELEMENT_HANDLING = create(null);
      if (objectHasOwnProperty(customElementHandling, "tagNameCheck") && isRegexOrFunction(customElementHandling.tagNameCheck)) {
        CUSTOM_ELEMENT_HANDLING.tagNameCheck = customElementHandling.tagNameCheck;
      }
      if (objectHasOwnProperty(customElementHandling, "attributeNameCheck") && isRegexOrFunction(customElementHandling.attributeNameCheck)) {
        CUSTOM_ELEMENT_HANDLING.attributeNameCheck = customElementHandling.attributeNameCheck;
      }
      if (objectHasOwnProperty(customElementHandling, "allowCustomizedBuiltInElements") && typeof customElementHandling.allowCustomizedBuiltInElements === "boolean") {
        CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = customElementHandling.allowCustomizedBuiltInElements;
      }
      seal(CUSTOM_ELEMENT_HANDLING);
      if (SAFE_FOR_TEMPLATES) {
        ALLOW_DATA_ATTR = false;
      }
      if (RETURN_DOM_FRAGMENT) {
        RETURN_DOM = true;
      }
      if (USE_PROFILES) {
        ALLOWED_TAGS = addToSet({}, text);
        ALLOWED_ATTR = create(null);
        if (USE_PROFILES.html === true) {
          addToSet(ALLOWED_TAGS, html$1);
          addToSet(ALLOWED_ATTR, html);
        }
        if (USE_PROFILES.svg === true) {
          addToSet(ALLOWED_TAGS, svg$1);
          addToSet(ALLOWED_ATTR, svg);
          addToSet(ALLOWED_ATTR, xml);
        }
        if (USE_PROFILES.svgFilters === true) {
          addToSet(ALLOWED_TAGS, svgFilters);
          addToSet(ALLOWED_ATTR, svg);
          addToSet(ALLOWED_ATTR, xml);
        }
        if (USE_PROFILES.mathMl === true) {
          addToSet(ALLOWED_TAGS, mathMl$1);
          addToSet(ALLOWED_ATTR, mathMl);
          addToSet(ALLOWED_ATTR, xml);
        }
      }
      EXTRA_ELEMENT_HANDLING.tagCheck = null;
      EXTRA_ELEMENT_HANDLING.attributeCheck = null;
      if (objectHasOwnProperty(cfg, "ADD_TAGS")) {
        if (typeof cfg.ADD_TAGS === "function") {
          EXTRA_ELEMENT_HANDLING.tagCheck = cfg.ADD_TAGS;
        } else if (arrayIsArray(cfg.ADD_TAGS)) {
          if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
            ALLOWED_TAGS = clone(ALLOWED_TAGS);
          }
          addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
        }
      }
      if (objectHasOwnProperty(cfg, "ADD_ATTR")) {
        if (typeof cfg.ADD_ATTR === "function") {
          EXTRA_ELEMENT_HANDLING.attributeCheck = cfg.ADD_ATTR;
        } else if (arrayIsArray(cfg.ADD_ATTR)) {
          if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
            ALLOWED_ATTR = clone(ALLOWED_ATTR);
          }
          addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
        }
      }
      if (objectHasOwnProperty(cfg, "ADD_URI_SAFE_ATTR") && arrayIsArray(cfg.ADD_URI_SAFE_ATTR)) {
        addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR, transformCaseFunc);
      }
      if (objectHasOwnProperty(cfg, "FORBID_CONTENTS") && arrayIsArray(cfg.FORBID_CONTENTS)) {
        if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
          FORBID_CONTENTS = clone(FORBID_CONTENTS);
        }
        addToSet(FORBID_CONTENTS, cfg.FORBID_CONTENTS, transformCaseFunc);
      }
      if (objectHasOwnProperty(cfg, "ADD_FORBID_CONTENTS") && arrayIsArray(cfg.ADD_FORBID_CONTENTS)) {
        if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
          FORBID_CONTENTS = clone(FORBID_CONTENTS);
        }
        addToSet(FORBID_CONTENTS, cfg.ADD_FORBID_CONTENTS, transformCaseFunc);
      }
      if (KEEP_CONTENT) {
        ALLOWED_TAGS["#text"] = true;
      }
      if (WHOLE_DOCUMENT) {
        addToSet(ALLOWED_TAGS, ["html", "head", "body"]);
      }
      if (ALLOWED_TAGS.table) {
        addToSet(ALLOWED_TAGS, ["tbody"]);
        delete FORBID_TAGS.tbody;
      }
      if (cfg.TRUSTED_TYPES_POLICY) {
        if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== "function") {
          throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
        }
        if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== "function") {
          throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
        }
        const previousTrustedTypesPolicy = trustedTypesPolicy;
        trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
        try {
          emptyHTML = _createTrustedHTML("");
        } catch (error) {
          trustedTypesPolicy = previousTrustedTypesPolicy;
          throw error;
        }
      } else if (cfg.TRUSTED_TYPES_POLICY === null) {
        trustedTypesPolicy = void 0;
        emptyHTML = "";
      } else {
        if (trustedTypesPolicy === void 0) {
          trustedTypesPolicy = _getDefaultTrustedTypesPolicy();
        }
        if (trustedTypesPolicy && typeof emptyHTML === "string") {
          emptyHTML = _createTrustedHTML("");
        }
      }
      if (freeze) {
        freeze(cfg);
      }
      CONFIG = cfg;
    };
    const ALL_SVG_TAGS = addToSet({}, [...svg$1, ...svgFilters, ...svgDisallowed]);
    const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
    const _checkSvgNamespace = function _checkSvgNamespace2(tagName, parent, parentTagName) {
      if (parent.namespaceURI === HTML_NAMESPACE) {
        return tagName === "svg";
      }
      if (parent.namespaceURI === MATHML_NAMESPACE) {
        return tagName === "svg" && (parentTagName === "annotation-xml" || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
      }
      return Boolean(ALL_SVG_TAGS[tagName]);
    };
    const _checkMathMlNamespace = function _checkMathMlNamespace2(tagName, parent, parentTagName) {
      if (parent.namespaceURI === HTML_NAMESPACE) {
        return tagName === "math";
      }
      if (parent.namespaceURI === SVG_NAMESPACE) {
        return tagName === "math" && HTML_INTEGRATION_POINTS[parentTagName];
      }
      return Boolean(ALL_MATHML_TAGS[tagName]);
    };
    const _checkHtmlNamespace = function _checkHtmlNamespace2(tagName, parent, parentTagName) {
      if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) {
        return false;
      }
      if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) {
        return false;
      }
      return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
    };
    const _checkValidNamespace = function _checkValidNamespace2(element) {
      let parent = getParentNode(element);
      if (!parent || !parent.tagName) {
        parent = {
          namespaceURI: NAMESPACE,
          tagName: "template"
        };
      }
      const tagName = stringToLowerCase(element.tagName);
      const parentTagName = stringToLowerCase(parent.tagName);
      if (!ALLOWED_NAMESPACES[element.namespaceURI]) {
        return false;
      }
      if (element.namespaceURI === SVG_NAMESPACE) {
        return _checkSvgNamespace(tagName, parent, parentTagName);
      }
      if (element.namespaceURI === MATHML_NAMESPACE) {
        return _checkMathMlNamespace(tagName, parent, parentTagName);
      }
      if (element.namespaceURI === HTML_NAMESPACE) {
        return _checkHtmlNamespace(tagName, parent, parentTagName);
      }
      if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && ALLOWED_NAMESPACES[element.namespaceURI]) {
        return true;
      }
      return false;
    };
    const _forceRemove = function _forceRemove2(node) {
      arrayPush(DOMPurify.removed, {
        element: node
      });
      try {
        getParentNode(node).removeChild(node);
      } catch (_) {
        remove(node);
        if (!getParentNode(node)) {
          throw typeErrorCreate("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place");
        }
      }
    };
    const _neutralizeRoot = function _neutralizeRoot2(root) {
      const childNodes = getChildNodes(root);
      if (childNodes) {
        const snapshot = [];
        arrayForEach(childNodes, (child) => {
          arrayPush(snapshot, child);
        });
        arrayForEach(snapshot, (child) => {
          try {
            remove(child);
          } catch (_) {
          }
        });
      }
      const attributes = getAttributes(root);
      if (attributes) {
        for (let i = attributes.length - 1; i >= 0; --i) {
          const attribute = attributes[i];
          const name = attribute && attribute.name;
          if (typeof name === "string") {
            try {
              root.removeAttribute(name);
            } catch (_) {
            }
          }
        }
      }
    };
    const _removeAttribute = function _removeAttribute2(name, element) {
      try {
        arrayPush(DOMPurify.removed, {
          attribute: element.getAttributeNode(name),
          from: element
        });
      } catch (_) {
        arrayPush(DOMPurify.removed, {
          attribute: null,
          from: element
        });
      }
      element.removeAttribute(name);
      if (name === "is") {
        if (RETURN_DOM || RETURN_DOM_FRAGMENT) {
          try {
            _forceRemove(element);
          } catch (_) {
          }
        } else {
          try {
            element.setAttribute(name, "");
          } catch (_) {
          }
        }
      }
    };
    const _stripDisallowedAttributes = function _stripDisallowedAttributes2(element) {
      const attributes = getAttributes(element);
      if (!attributes) {
        return;
      }
      for (let i = attributes.length - 1; i >= 0; --i) {
        const attribute = attributes[i];
        const name = attribute && attribute.name;
        if (typeof name !== "string" || ALLOWED_ATTR[transformCaseFunc(name)]) {
          continue;
        }
        try {
          element.removeAttribute(name);
        } catch (_) {
        }
      }
    };
    const _neutralizeSubtree = function _neutralizeSubtree2(root) {
      const stack = [root];
      while (stack.length > 0) {
        const node = stack.pop();
        const nodeType = getNodeType ? getNodeType(node) : node.nodeType;
        if (nodeType === NODE_TYPE.element) {
          _stripDisallowedAttributes(node);
        }
        const childNodes = getChildNodes(node);
        if (childNodes) {
          for (let i = childNodes.length - 1; i >= 0; --i) {
            stack.push(childNodes[i]);
          }
        }
      }
    };
    const _initDocument = function _initDocument2(dirty) {
      let doc = null;
      let leadingWhitespace = null;
      if (FORCE_BODY) {
        dirty = "<remove></remove>" + dirty;
      } else {
        const matches = stringMatch(dirty, /^[\r\n\t ]+/);
        leadingWhitespace = matches && matches[0];
      }
      if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && NAMESPACE === HTML_NAMESPACE) {
        dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + "</body></html>";
      }
      const dirtyPayload = trustedTypesPolicy ? _createTrustedHTML(dirty) : dirty;
      if (NAMESPACE === HTML_NAMESPACE) {
        try {
          doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
        } catch (_) {
        }
      }
      if (!doc || !doc.documentElement) {
        doc = implementation.createDocument(NAMESPACE, "template", null);
        try {
          doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
        } catch (_) {
        }
      }
      const body = doc.body || doc.documentElement;
      if (dirty && leadingWhitespace) {
        body.insertBefore(document2.createTextNode(leadingWhitespace), body.childNodes[0] || null);
      }
      if (NAMESPACE === HTML_NAMESPACE) {
        return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? "html" : "body")[0];
      }
      return WHOLE_DOCUMENT ? doc.documentElement : body;
    };
    const _createNodeIterator = function _createNodeIterator2(root) {
      return createNodeIterator.call(
        root.ownerDocument || root,
        root,
        // eslint-disable-next-line no-bitwise
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION,
        null
      );
    };
    const _stripTemplateExpressions = function _stripTemplateExpressions2(value) {
      value = stringReplace(value, MUSTACHE_EXPR$1, " ");
      value = stringReplace(value, ERB_EXPR$1, " ");
      value = stringReplace(value, TMPLIT_EXPR$1, " ");
      return value;
    };
    const _scrubTemplateExpressions2 = function _scrubTemplateExpressions(node) {
      var _node$querySelectorAl;
      node.normalize();
      const walker = createNodeIterator.call(
        node.ownerDocument || node,
        node,
        // eslint-disable-next-line no-bitwise
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_CDATA_SECTION | NodeFilter.SHOW_PROCESSING_INSTRUCTION,
        null
      );
      let currentNode = walker.nextNode();
      while (currentNode) {
        currentNode.data = _stripTemplateExpressions(currentNode.data);
        currentNode = walker.nextNode();
      }
      const templates = (_node$querySelectorAl = node.querySelectorAll) === null || _node$querySelectorAl === void 0 ? void 0 : _node$querySelectorAl.call(node, "template");
      if (templates) {
        arrayForEach(templates, (tmpl) => {
          if (_isDocumentFragment(tmpl.content)) {
            _scrubTemplateExpressions2(tmpl.content);
          }
        });
      }
    };
    const _isClobbered = function _isClobbered2(element) {
      const realTagName = getNodeName ? getNodeName(element) : null;
      if (typeof realTagName !== "string") {
        return false;
      }
      if (transformCaseFunc(realTagName) !== "form") {
        return false;
      }
      return typeof element.nodeName !== "string" || typeof element.textContent !== "string" || typeof element.removeChild !== "function" || // Realm-safe NamedNodeMap detection: equality against the cached
      // prototype getter. Clobbered .attributes (e.g. <input name="attributes">)
      // makes the direct read diverge from the cached read; a clean form
      // (same-realm OR foreign-realm) has both reads pointing at the same
      // canonical NamedNodeMap.
      element.attributes !== getAttributes(element) || typeof element.removeAttribute !== "function" || typeof element.setAttribute !== "function" || typeof element.namespaceURI !== "string" || typeof element.insertBefore !== "function" || typeof element.hasChildNodes !== "function" || // NodeType clobbering probe. Cached Node.prototype.nodeType getter
      // returns the integer 1 for any Element regardless of realm; direct
      // read on a clobbered form (e.g. <input name="nodeType">) returns
      // the named child element. Cheap addition — nodeType is read from
      // an internal slot, no serialization cost — and removes a residual
      // clobbering surface used by several mXSS / PI / comment branches
      // in _sanitizeElements that compare currentNode.nodeType directly.
      element.nodeType !== getNodeType(element) || // HTMLFormElement has [LegacyOverrideBuiltIns]: a descendant named
      // "childNodes" shadows the prototype getter. Direct reads of
      // form.childNodes from a clobbered form return the named child
      // instead of the real NodeList, so any walk that reads it directly
      // skips the form's real children. Compare the direct read to the
      // cached Node.prototype getter — when the form's named-property
      // getter intercepts the read, the two values differ and we flag
      // the form. This catches every clobbering child type (input,
      // select, etc.) regardless of whether the named child happens to
      // carry a numeric .length, which a typeof-based probe would miss
      // (e.g. HTMLSelectElement.length is a defined unsigned-long).
      element.childNodes !== getChildNodes(element);
    };
    const _isDocumentFragment = function _isDocumentFragment2(value) {
      if (!getNodeType || typeof value !== "object" || value === null) {
        return false;
      }
      try {
        return getNodeType(value) === NODE_TYPE.documentFragment;
      } catch (_) {
        return false;
      }
    };
    const _isNode = function _isNode2(value) {
      if (!getNodeType || typeof value !== "object" || value === null) {
        return false;
      }
      try {
        return typeof getNodeType(value) === "number";
      } catch (_) {
        return false;
      }
    };
    function _executeHooks(hooks2, currentNode, data) {
      if (hooks2.length === 0) {
        return;
      }
      arrayForEach(hooks2, (hook) => {
        hook.call(DOMPurify, currentNode, data, CONFIG);
      });
    }
    const _isUnsafeNode = function _isUnsafeNode2(currentNode, tagName) {
      if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.textContent) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.innerHTML)) {
        return true;
      }
      if (SAFE_FOR_XML && currentNode.namespaceURI === HTML_NAMESPACE && tagName === "style" && _isNode(currentNode.firstElementChild)) {
        return true;
      }
      if (currentNode.nodeType === NODE_TYPE.processingInstruction) {
        return true;
      }
      if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, currentNode.data)) {
        return true;
      }
      return false;
    };
    const _sanitizeDisallowedNode = function _sanitizeDisallowedNode2(currentNode, tagName) {
      if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName)) {
        if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) {
          return false;
        }
        if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(tagName)) {
          return false;
        }
      }
      if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
        const parentNode = getParentNode(currentNode);
        const childNodes = getChildNodes(currentNode);
        if (childNodes && parentNode) {
          const childCount = childNodes.length;
          for (let i = childCount - 1; i >= 0; --i) {
            const hoisted = IN_PLACE ? childNodes[i] : cloneNode(childNodes[i], true);
            parentNode.insertBefore(hoisted, getNextSibling(currentNode));
          }
        }
      }
      _forceRemove(currentNode);
      return true;
    };
    const _sanitizeElements = function _sanitizeElements2(currentNode) {
      _executeHooks(hooks.beforeSanitizeElements, currentNode, null);
      if (_isClobbered(currentNode)) {
        _forceRemove(currentNode);
        return true;
      }
      const tagName = transformCaseFunc(getNodeName ? getNodeName(currentNode) : currentNode.nodeName);
      _executeHooks(hooks.uponSanitizeElement, currentNode, {
        tagName,
        allowedTags: ALLOWED_TAGS
      });
      if (_isUnsafeNode(currentNode, tagName)) {
        _forceRemove(currentNode);
        return true;
      }
      if (FORBID_TAGS[tagName] || !(EXTRA_ELEMENT_HANDLING.tagCheck instanceof Function && EXTRA_ELEMENT_HANDLING.tagCheck(tagName)) && !ALLOWED_TAGS[tagName]) {
        return _sanitizeDisallowedNode(currentNode, tagName);
      }
      const nt = getNodeType ? getNodeType(currentNode) : currentNode.nodeType;
      if (nt === NODE_TYPE.element && !_checkValidNamespace(currentNode)) {
        _forceRemove(currentNode);
        return true;
      }
      if ((tagName === "noscript" || tagName === "noembed" || tagName === "noframes") && regExpTest(FALLBACK_TAG_CLOSE, currentNode.innerHTML)) {
        _forceRemove(currentNode);
        return true;
      }
      if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
        const content = _stripTemplateExpressions(currentNode.textContent);
        if (currentNode.textContent !== content) {
          arrayPush(DOMPurify.removed, {
            element: currentNode.cloneNode()
          });
          currentNode.textContent = content;
        }
      }
      _executeHooks(hooks.afterSanitizeElements, currentNode, null);
      return false;
    };
    const _isValidAttribute = function _isValidAttribute2(lcTag, lcName, value) {
      if (FORBID_ATTR[lcName]) {
        return false;
      }
      if (SANITIZE_DOM && (lcName === "id" || lcName === "name") && (value in document2 || value in formElement)) {
        return false;
      }
      const nameIsPermitted = ALLOWED_ATTR[lcName] || EXTRA_ELEMENT_HANDLING.attributeCheck instanceof Function && EXTRA_ELEMENT_HANDLING.attributeCheck(lcName, lcTag);
      if (ALLOW_DATA_ATTR && regExpTest(DATA_ATTR$1, lcName)) ;
      else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$1, lcName)) ;
      else if (!nameIsPermitted) {
        if (
          // First condition does a very basic check if a) it's basically a valid custom element tagname AND
          // b) if the tagName passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
          // and c) if the attribute name passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.attributeNameCheck
          _isBasicCustomElement(lcTag) && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(lcTag)) && (CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName) || CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.attributeNameCheck(lcName, lcTag)) || // Alternative, second condition checks if it's an `is`-attribute, AND
          // the value passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
          lcName === "is" && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(value))
        ) ;
        else {
          return false;
        }
      } else if (URI_SAFE_ATTRIBUTES[lcName]) ;
      else if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) ;
      else if ((lcName === "src" || lcName === "xlink:href" || lcName === "href") && lcTag !== "script" && stringIndexOf(value, "data:") === 0 && DATA_URI_TAGS[lcTag]) ;
      else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) ;
      else if (value) {
        return false;
      } else ;
      return true;
    };
    const RESERVED_CUSTOM_ELEMENT_NAMES = addToSet({}, ["annotation-xml", "color-profile", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "missing-glyph"]);
    const _isBasicCustomElement = function _isBasicCustomElement2(tagName) {
      return !RESERVED_CUSTOM_ELEMENT_NAMES[stringToLowerCase(tagName)] && regExpTest(CUSTOM_ELEMENT$1, tagName);
    };
    const _applyTrustedTypesToAttribute = function _applyTrustedTypesToAttribute2(lcTag, lcName, namespaceURI, value) {
      if (trustedTypesPolicy && typeof trustedTypes === "object" && typeof trustedTypes.getAttributeType === "function" && !namespaceURI) {
        switch (trustedTypes.getAttributeType(lcTag, lcName)) {
          case "TrustedHTML": {
            return _createTrustedHTML(value);
          }
          case "TrustedScriptURL": {
            return _createTrustedScriptURL(value);
          }
        }
      }
      return value;
    };
    const _setAttributeValue = function _setAttributeValue2(currentNode, name, namespaceURI, value) {
      try {
        if (namespaceURI) {
          currentNode.setAttributeNS(namespaceURI, name, value);
        } else {
          currentNode.setAttribute(name, value);
        }
        if (_isClobbered(currentNode)) {
          _forceRemove(currentNode);
        } else {
          arrayPop(DOMPurify.removed);
        }
      } catch (_) {
        _removeAttribute(name, currentNode);
      }
    };
    const _sanitizeAttributes = function _sanitizeAttributes2(currentNode) {
      _executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
      const attributes = currentNode.attributes;
      if (!attributes || _isClobbered(currentNode)) {
        return;
      }
      const hookEvent = {
        attrName: "",
        attrValue: "",
        keepAttr: true,
        allowedAttributes: ALLOWED_ATTR,
        forceKeepAttr: void 0
      };
      let l = attributes.length;
      const lcTag = transformCaseFunc(currentNode.nodeName);
      while (l--) {
        const attr = attributes[l];
        const name = attr.name, namespaceURI = attr.namespaceURI, attrValue = attr.value;
        const lcName = transformCaseFunc(name);
        const initValue = attrValue;
        let value = name === "value" ? initValue : stringTrim(initValue);
        hookEvent.attrName = lcName;
        hookEvent.attrValue = value;
        hookEvent.keepAttr = true;
        hookEvent.forceKeepAttr = void 0;
        _executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
        value = hookEvent.attrValue;
        if (SANITIZE_NAMED_PROPS && (lcName === "id" || lcName === "name") && stringIndexOf(value, SANITIZE_NAMED_PROPS_PREFIX) !== 0) {
          _removeAttribute(name, currentNode);
          value = SANITIZE_NAMED_PROPS_PREFIX + value;
        }
        if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, value)) {
          _removeAttribute(name, currentNode);
          continue;
        }
        if (lcName === "attributename" && stringMatch(value, "href")) {
          _removeAttribute(name, currentNode);
          continue;
        }
        if (hookEvent.forceKeepAttr) {
          continue;
        }
        if (!hookEvent.keepAttr) {
          _removeAttribute(name, currentNode);
          continue;
        }
        if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(SELF_CLOSING_TAG, value)) {
          _removeAttribute(name, currentNode);
          continue;
        }
        if (SAFE_FOR_TEMPLATES) {
          value = _stripTemplateExpressions(value);
        }
        if (!_isValidAttribute(lcTag, lcName, value)) {
          _removeAttribute(name, currentNode);
          continue;
        }
        value = _applyTrustedTypesToAttribute(lcTag, lcName, namespaceURI, value);
        if (value !== initValue) {
          _setAttributeValue(currentNode, name, namespaceURI, value);
        }
      }
      _executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
    };
    const _sanitizeShadowDOM2 = function _sanitizeShadowDOM(fragment) {
      let shadowNode = null;
      const shadowIterator = _createNodeIterator(fragment);
      _executeHooks(hooks.beforeSanitizeShadowDOM, fragment, null);
      while (shadowNode = shadowIterator.nextNode()) {
        _executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
        _sanitizeElements(shadowNode);
        _sanitizeAttributes(shadowNode);
        if (_isDocumentFragment(shadowNode.content)) {
          _sanitizeShadowDOM2(shadowNode.content);
        }
        const shadowNodeType = getNodeType ? getNodeType(shadowNode) : shadowNode.nodeType;
        if (shadowNodeType === NODE_TYPE.element) {
          const innerSr = getShadowRoot(shadowNode);
          if (_isDocumentFragment(innerSr)) {
            _sanitizeAttachedShadowRoots(innerSr);
            _sanitizeShadowDOM2(innerSr);
          }
        }
      }
      _executeHooks(hooks.afterSanitizeShadowDOM, fragment, null);
    };
    const _sanitizeAttachedShadowRoots = function _sanitizeAttachedShadowRoots2(root) {
      const stack = [{
        node: root,
        shadow: null
      }];
      while (stack.length > 0) {
        const item = stack.pop();
        if (item.shadow) {
          _sanitizeShadowDOM2(item.shadow);
          continue;
        }
        const node = item.node;
        const nodeType = getNodeType ? getNodeType(node) : node.nodeType;
        const isElement = nodeType === NODE_TYPE.element;
        const childNodes = getChildNodes(node);
        if (childNodes) {
          for (let i = childNodes.length - 1; i >= 0; --i) {
            stack.push({
              node: childNodes[i],
              shadow: null
            });
          }
        }
        if (isElement) {
          const rootName = getNodeName ? getNodeName(node) : null;
          if (typeof rootName === "string" && transformCaseFunc(rootName) === "template") {
            const content = node.content;
            if (_isDocumentFragment(content)) {
              stack.push({
                node: content,
                shadow: null
              });
            }
          }
        }
        if (isElement) {
          const sr = getShadowRoot(node);
          if (_isDocumentFragment(sr)) {
            stack.push({
              node: null,
              shadow: sr
            }, {
              node: sr,
              shadow: null
            });
          }
        }
      }
    };
    DOMPurify.sanitize = function(dirty) {
      let cfg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
      let body = null;
      let importedNode = null;
      let currentNode = null;
      let returnNode = null;
      IS_EMPTY_INPUT = !dirty;
      if (IS_EMPTY_INPUT) {
        dirty = "<!-->";
      }
      if (typeof dirty !== "string" && !_isNode(dirty)) {
        dirty = stringifyValue(dirty);
        if (typeof dirty !== "string") {
          throw typeErrorCreate("dirty is not a string, aborting");
        }
      }
      if (!DOMPurify.isSupported) {
        return dirty;
      }
      if (SET_CONFIG) {
        ALLOWED_TAGS = SET_CONFIG_ALLOWED_TAGS;
        ALLOWED_ATTR = SET_CONFIG_ALLOWED_ATTR;
      } else {
        _parseConfig(cfg);
      }
      if (hooks.uponSanitizeElement.length > 0 || hooks.uponSanitizeAttribute.length > 0) {
        ALLOWED_TAGS = clone(ALLOWED_TAGS);
      }
      if (hooks.uponSanitizeAttribute.length > 0) {
        ALLOWED_ATTR = clone(ALLOWED_ATTR);
      }
      DOMPurify.removed = [];
      const inPlace = IN_PLACE && typeof dirty !== "string" && _isNode(dirty);
      if (inPlace) {
        const nn = getNodeName ? getNodeName(dirty) : dirty.nodeName;
        if (typeof nn === "string") {
          const tagName = transformCaseFunc(nn);
          if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
            throw typeErrorCreate("root node is forbidden and cannot be sanitized in-place");
          }
        }
        if (_isClobbered(dirty)) {
          throw typeErrorCreate("root node is clobbered and cannot be sanitized in-place");
        }
        try {
          _sanitizeAttachedShadowRoots(dirty);
        } catch (error) {
          _neutralizeRoot(dirty);
          throw error;
        }
      } else if (_isNode(dirty)) {
        body = _initDocument("<!---->");
        importedNode = body.ownerDocument.importNode(dirty, true);
        if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === "BODY") {
          body = importedNode;
        } else if (importedNode.nodeName === "HTML") {
          body = importedNode;
        } else {
          body.appendChild(importedNode);
        }
        _sanitizeAttachedShadowRoots(importedNode);
      } else {
        if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && // eslint-disable-next-line unicorn/prefer-includes
        dirty.indexOf("<") === -1) {
          return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(dirty) : dirty;
        }
        body = _initDocument(dirty);
        if (!body) {
          return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : "";
        }
      }
      if (body && FORCE_BODY) {
        _forceRemove(body.firstChild);
      }
      const nodeIterator = _createNodeIterator(inPlace ? dirty : body);
      try {
        while (currentNode = nodeIterator.nextNode()) {
          _sanitizeElements(currentNode);
          _sanitizeAttributes(currentNode);
          if (_isDocumentFragment(currentNode.content)) {
            _sanitizeShadowDOM2(currentNode.content);
          }
        }
      } catch (error) {
        if (inPlace) {
          _neutralizeRoot(dirty);
        }
        throw error;
      }
      if (inPlace) {
        arrayForEach(DOMPurify.removed, (entry) => {
          if (entry.element) {
            _neutralizeSubtree(entry.element);
          }
        });
        if (SAFE_FOR_TEMPLATES) {
          _scrubTemplateExpressions2(dirty);
        }
        return dirty;
      }
      if (RETURN_DOM) {
        if (SAFE_FOR_TEMPLATES) {
          _scrubTemplateExpressions2(body);
        }
        if (RETURN_DOM_FRAGMENT) {
          returnNode = createDocumentFragment.call(body.ownerDocument);
          while (body.firstChild) {
            returnNode.appendChild(body.firstChild);
          }
        } else {
          returnNode = body;
        }
        if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) {
          returnNode = importNode.call(originalDocument, returnNode, true);
        }
        return returnNode;
      }
      let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
      if (WHOLE_DOCUMENT && ALLOWED_TAGS["!doctype"] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) {
        serializedHTML = "<!DOCTYPE " + body.ownerDocument.doctype.name + ">\n" + serializedHTML;
      }
      if (SAFE_FOR_TEMPLATES) {
        serializedHTML = _stripTemplateExpressions(serializedHTML);
      }
      return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(serializedHTML) : serializedHTML;
    };
    DOMPurify.setConfig = function() {
      let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      _parseConfig(cfg);
      SET_CONFIG = true;
      SET_CONFIG_ALLOWED_TAGS = ALLOWED_TAGS;
      SET_CONFIG_ALLOWED_ATTR = ALLOWED_ATTR;
    };
    DOMPurify.clearConfig = function() {
      CONFIG = null;
      SET_CONFIG = false;
      SET_CONFIG_ALLOWED_TAGS = null;
      SET_CONFIG_ALLOWED_ATTR = null;
      trustedTypesPolicy = defaultTrustedTypesPolicy;
      emptyHTML = "";
    };
    DOMPurify.isValidAttribute = function(tag, attr, value) {
      if (!CONFIG) {
        _parseConfig({});
      }
      const lcTag = transformCaseFunc(tag);
      const lcName = transformCaseFunc(attr);
      return _isValidAttribute(lcTag, lcName, value);
    };
    DOMPurify.addHook = function(entryPoint, hookFunction) {
      if (typeof hookFunction !== "function") {
        return;
      }
      if (!objectHasOwnProperty(hooks, entryPoint)) {
        return;
      }
      arrayPush(hooks[entryPoint], hookFunction);
    };
    DOMPurify.removeHook = function(entryPoint, hookFunction) {
      if (!objectHasOwnProperty(hooks, entryPoint)) {
        return void 0;
      }
      if (hookFunction !== void 0) {
        const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
        return index === -1 ? void 0 : arraySplice(hooks[entryPoint], index, 1)[0];
      }
      return arrayPop(hooks[entryPoint]);
    };
    DOMPurify.removeHooks = function(entryPoint) {
      if (!objectHasOwnProperty(hooks, entryPoint)) {
        return;
      }
      hooks[entryPoint] = [];
    };
    DOMPurify.removeAllHooks = function() {
      hooks = _createHooksMap();
    };
    return DOMPurify;
  }
  var purify = createDOMPurify();

  // knowledge-library/kl-app.jsx
  var { useState, useEffect, useRef, useCallback } = React;
  var SUPABASE_URL = "https://cnbsxwtvazfvzmltkuvx.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExMDM3MDMsImV4cCI6MjA4NjY3OTcwM30.WBM0Pcg9lcZ5wfdDKIcUZoiLh97C50h7ZXL6WlDVZ5g";
  var EILEEN_ENDPOINT = SUPABASE_URL.replace(".supabase.co", ".functions.supabase.co") + "/functions/v1/eileen-intelligence";
  var HUB_FUNCTIONS_BASE = SUPABASE_URL.replace(".supabase.co", ".functions.supabase.co");
  var HUB_ALLOWED_TIERS = ["operational", "operational_readiness", "governance", "enterprise"];
  var KL_SUBSCRIPTION_TIERS = [
    // KL-VAULT-INTEGRATION-001 §2.2 — RULE 11 subscription tiers (exact strings) for the
    // entitlement-aware Documents nav routing (see detectKLPass / Sidebar).
    "operational_readiness",
    "governance",
    "institutional"
  ];
  var HUB_WORKSPACE_FACETS = [
    // DOCV-ROOM-RECTIFY-001 — full-page surface (not an in-app facet): href routes
    // to the standalone /operational/documents/ vault page (mirrors Parliament Live /
    // Calendar below). The in-app HubVaultFacet is retained as a fallback but is no
    // longer reachable from this nav.
    { id: "vault", label: "Document Vault", href: "/operational/documents/" },
    { id: "alerts", label: "Alerts" },
    // OPERATIONAL-CASES-SITE-005 — full-page surface (not an in-app facet): href routes to the
    // standalone /operational/cases/ page (ACEI-filtered recent tribunal decisions + relocated
    // enforcement notices). Placed adjacent to Alerts; navigates via the href handler below.
    { id: "cases", label: "Recent Cases", href: "/operational/cases/" },
    { id: "acei", label: "ACEI Overview" },
    { id: "intelligence", label: "Intelligence" },
    // PARLIAMENT-LIVE-001 — full-page surface (not an in-app facet): href routes
    // to the standalone /operational/parliament-live/ page. Sits under Intelligence;
    // inherits the rail's operational/enterprise/governance gating (hubChrome).
    { id: "parliament-live", label: "Parliament Live", href: "/operational/parliament-live/" },
    { id: "ticker", label: "Ticker" },
    { id: "notes", label: "Notes" },
    // OOX-001 CALENDAR-PAGE-001 — full-page surface (not an in-app facet): href routes
    // to the standalone /operational/calendar/ page (the month-grid calendar merging the
    // tenant's events with the dated statutory/rates/horizon intelligence). HubCalendarFacet
    // is retained (no deletion) as the in-app fallback; the nav now navigates to the page.
    { id: "calendar", label: "Calendar", href: "/operational/calendar/" }
  ];
  var HUB_FACET_LABELS = {
    vault: "Document Vault",
    alerts: "Alerts",
    acei: "ACEI Overview",
    intelligence: "Intelligence",
    ticker: "Ticker",
    notes: "Notes",
    calendar: "Calendar"
  };
  function klOperationalMode() {
    try {
      if (window.__klMode === "operational") return true;
    } catch (e) {
    }
    try {
      var p = window.location && window.location.pathname || "";
      if (p === "/operational" || p.indexOf("/operational/") === 0) return true;
    } catch (e) {
    }
    return false;
  }
  function klRouteReplace(target) {
    var here = "";
    try {
      here = window.location && window.location.pathname || "";
    } catch (e) {
      here = "";
    }
    if (here.replace(/\/+$/, "") === String(target).replace(/\/+$/, "")) return false;
    window.location.replace(target);
    return true;
  }
  function detectHubSession() {
    if (typeof window === "undefined" || !window.supabase || !window.supabase.createClient) {
      return Promise.resolve(null);
    }
    var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return sb.auth.getSession().then(function(gs) {
      var session = gs && gs.data && gs.data.session;
      if (!session) return null;
      var token = session.access_token;
      var payload;
      try {
        payload = JSON.parse(atob(token.split(".")[1]));
      } catch (e) {
        return null;
      }
      var userId = payload.sub;
      return fetch(
        SUPABASE_URL + "/rest/v1/kl_account_profiles?select=subscription_tier&user_id=eq." + userId + "&limit=1",
        { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + token, "Accept": "application/json" } }
      ).then(function(r) {
        return r.ok ? r.json() : null;
      }).then(function(rows) {
        var tier = rows && rows[0] && rows[0].subscription_tier;
        if (!tier || HUB_ALLOWED_TIERS.indexOf(tier) < 0) return null;
        var hubSession = {
          sb,
          token,
          anon: SUPABASE_ANON_KEY,
          supabaseUrl: SUPABASE_URL,
          functionsBase: HUB_FUNCTIONS_BASE,
          userId,
          email: payload.email || "",
          tier
        };
        return sb.rpc("get_my_org_id").then(function(orgRes) {
          if (orgRes && orgRes.error) {
            console.warn("[OOX-001] get_my_org_id failed \u2014 failing open to hub", orgRes.error);
            return hubSession;
          }
          var orgId = orgRes && orgRes.data;
          if (!orgId) return null;
          function finishHub() {
            if (klOperationalMode() === false && (window.location.pathname || "").replace(/\/+$/, "") !== "/operational") {
              klRouteReplace("/operational/");
              return null;
            }
            return hubSession;
          }
          var orgTierP = fetch(
            SUPABASE_URL + "/rest/v1/organisations?id=eq." + orgId + "&select=tier",
            { headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + token, "Accept": "application/json" } }
          ).then(function(r) {
            return r.ok ? r.json() : null;
          }).then(function(orows) {
            return orows && orows[0] && orows[0].tier;
          }).catch(function() {
            return null;
          });
          var stateP = sb.from("operational_onboarding_state").select("landing_unlocked").limit(1);
          return Promise.all([orgTierP, stateP]).then(function(rr) {
            var orgTier = rr[0];
            if (orgTier) hubSession.orgTier = orgTier;
            var stRes = rr[1];
            if (stRes && stRes.error) {
              console.warn("[OOX-001] onboarding-state read failed \u2014 failing open to hub", stRes.error);
              return finishHub();
            }
            var row = stRes && stRes.data && stRes.data[0];
            if (row && row.landing_unlocked === true) return finishHub();
            if ((window.location.pathname || "").replace(/\/+$/, "") !== "/operational/onboarding") {
              klRouteReplace("/operational/onboarding/");
            }
            return null;
          });
        }).catch(function(e) {
          console.warn("[OOX-001] hub routing resolution failed \u2014 failing open to hub", e);
          return hubSession;
        });
      }).catch(function() {
        return null;
      });
    }).catch(function() {
      return null;
    });
  }
  function detectKLPass() {
    var token, userId;
    try {
      token = window.__klToken;
      userId = window.__klUserId;
    } catch (e) {
    }
    if (!token || !userId) return Promise.resolve(false);
    return fetch(SUPABASE_URL + "/rest/v1/rpc/kl_session_entitlement", {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ p_user_id: userId })
    }).then(function(r) {
      return r.ok ? r.json() : null;
    }).then(function(rows) {
      var ent = Array.isArray(rows) ? rows[0] || null : rows || null;
      if (!ent) return false;
      var live = ent.expires_at && new Date(ent.expires_at).getTime() > Date.now();
      var active = ent.status == null || String(ent.status).toLowerCase() === "active";
      return !!(live && active);
    }).catch(function() {
      return false;
    });
  }
  function hubSendToEileen(hubSession, body) {
    return fetch(hubSession.functionsBase + "/eileen-operational", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + hubSession.token,
        "apikey": hubSession.anon,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }).then(function(r) {
      if (!r.ok) throw new Error("http_" + r.status);
      return r.json();
    });
  }
  var INSTRUMENT_NAMES = {
    "ERA 1996": "Employment Rights Act 1996",
    "EqA 2010": "Equality Act 2010",
    "HSWA 1974": "Health and Safety at Work Act 1974",
    "NMWA 1998": "National Minimum Wage Act 1998",
    "TULRCA 1992": "Trade Union and Labour Relations (Consolidation) Act 1992",
    "ERA 2025": "Employment Rights Act 2025",
    "PIDA 1998": "Public Interest Disclosure Act 1998",
    "WTR 1998": "Working Time Regulations 1998",
    "MPL 1999": "Maternity and Parental Leave Regulations 1999",
    "TUPE 2006": "Transfer of Undertakings Regulations 2006",
    "ACAS Code 1": "ACAS Code of Practice on Disciplinary and Grievance",
    "FWR 2014": "Flexible Working Regulations 2014",
    "PTWR 2000": "Part-Time Workers Regulations 2000",
    "FTER 2002": "Fixed-Term Employees Regulations 2002",
    "AWR 2010": "Agency Workers Regulations 2010",
    "PAL 2002": "Paternity and Adoption Leave Regulations 2002",
    "SPL 2014": "Shared Parental Leave Regulations 2014",
    "MHSWR 1999": "Management of Health and Safety at Work Regulations 1999",
    "DPA 2018": "Data Protection Act 2018"
  };
  var __klLiveFeedCache = {};
  var __klLiveFeedPending = {};
  function __klLiveFeedRows(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.rows)) return data.rows;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.data)) return data.data;
    return null;
  }
  function fetchLiveFeedSection(section) {
    if (__klLiveFeedCache[section]) return Promise.resolve(__klLiveFeedCache[section]);
    if (__klLiveFeedPending[section]) return __klLiveFeedPending[section];
    var p = (function() {
      if (!window.__klToken) return Promise.resolve({ state: "unavailable" });
      return fetch(
        SUPABASE_URL + "/functions/v1/kl-live-feed?section=" + encodeURIComponent(section),
        { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
      ).then(function(resp) {
        if (!resp.ok) return { state: "unavailable" };
        return resp.json().then(function(data) {
          if (!data || data.error) return { state: "unavailable" };
          var result = {
            state: "live",
            data,
            generatedAt: data.generated_at || data.generatedAt || null
          };
          __klLiveFeedCache[section] = result;
          return result;
        }).catch(function() {
          return { state: "unavailable" };
        });
      }).catch(function() {
        return { state: "unavailable" };
      }).then(function(result) {
        delete __klLiveFeedPending[section];
        return result;
      });
    })();
    __klLiveFeedPending[section] = p;
    return p;
  }
  function ensureInstrumentsMap() {
    return fetchLiveFeedSection("instruments").then(function(result) {
      if (result.state !== "live") return window.__klInstrumentsMap || null;
      var d = result.data;
      var map = null;
      if (d && d.instruments && typeof d.instruments === "object" && !Array.isArray(d.instruments)) map = d.instruments;
      else if (d && d.map && typeof d.map === "object" && !Array.isArray(d.map)) map = d.map;
      else if (d && typeof d === "object" && !Array.isArray(d)) map = d;
      if (map) window.__klInstrumentsMap = map;
      return window.__klInstrumentsMap || null;
    });
  }
  function instrumentEntry(instId) {
    var m = typeof window !== "undefined" && window.__klInstrumentsMap || null;
    if (!m || !instId) return null;
    var entry = m[instId] || m[String(instId).toLowerCase()];
    return entry && typeof entry === "object" ? entry : null;
  }
  function instrumentDisplayTitle(instId) {
    var entry = instrumentEntry(instId);
    if (entry && entry.display_title) return entry.display_title;
    return INSTRUMENT_NAMES[instId] || instId;
  }
  function instrumentShortCitation(instId) {
    var entry = instrumentEntry(instId);
    return entry && entry.short_citation || null;
  }
  var DOMAINS = [
    {
      id: "dismissal",
      slug: "dismissal",
      name: "Dismissal and Disciplinary",
      orientation: "This area covers the law governing how employment relationships end and how employers must conduct disciplinary processes. It is the most litigated area of UK employment law.",
      eileenGreeting: "I\u2019m here to help with dismissal and disciplinary matters. What\u2019s your situation?",
      subAreas: [
        { name: "Unfair Dismissal", instruments: "ERA 1996 Part X, ERA 2025 ss.1\u20136", scope: "Qualifying service, automatically unfair reasons, day-one rights (ERA 2025), remedies and compensation." },
        { name: "Wrongful Dismissal", instruments: "ERA 1996 ss.86\u201391", scope: "Notice periods, breach of contract, payment in lieu of notice, garden leave." },
        { name: "Constructive Dismissal", instruments: "ERA 1996 s.95(1)(c)", scope: "Fundamental breach, last straw doctrine, resignation in response to breach." },
        { name: "Gross Misconduct", instruments: "ACAS Code of Practice 1", scope: "Definition, investigation requirements, suspension, right to be accompanied, appeal rights." },
        { name: "ACAS Disciplinary Code", instruments: "ACAS Code 1, ERA 1996 s.207A", scope: "Full Code requirements, tribunal uplift for non-compliance, step-by-step procedure." },
        { name: "Capability and Performance", instruments: "ACAS performance guidance", scope: "Performance improvement plans, capability procedures, reasonable adjustments." },
        { name: "Probationary Dismissals", instruments: "ERA 1996 Part X, ERA 2025 s.1", scope: "Probationary period rights, day-one protection changes, notice during probation." },
        { name: "Redundancy", instruments: "ERA 1996 Part XI, TULRCA 1992 s.188", scope: "Genuine redundancy, selection criteria, collective consultation, redundancy pay." }
      ]
    },
    {
      id: "discrimination",
      slug: "discrimination",
      name: "Discrimination and Harassment",
      orientation: "This area covers protection against unlawful discrimination, harassment, and victimisation in the workplace. It represents the largest concentration of case law in the Ailane intelligence estate.",
      eileenGreeting: "I\u2019m here to help with discrimination and harassment matters. What\u2019s your situation?",
      subAreas: [
        { name: "The Nine Protected Characteristics", instruments: "EqA 2010 s.4", scope: "Age, disability, gender reassignment, marriage/civil partnership, pregnancy/maternity, race, religion/belief, sex, sexual orientation." },
        { name: "Direct Discrimination", instruments: "EqA 2010 s.13", scope: "Less favourable treatment, comparator requirements, burden of proof, defences." },
        { name: "Indirect Discrimination", instruments: "EqA 2010 s.19", scope: "Provision, criterion or practice, particular disadvantage, justification defence." },
        { name: "Harassment", instruments: "EqA 2010 s.26, Worker Protection Act 2023", scope: "Unwanted conduct, third-party harassment (new employer duty), sexual harassment." },
        { name: "Victimisation", instruments: "EqA 2010 s.27", scope: "Protected acts, detriment, protection for complainants and witnesses." },
        { name: "Reasonable Adjustments", instruments: "EqA 2010 ss.20\u201322", scope: "Duty to adjust for disabled workers, substantial disadvantage, auxiliary aids." },
        { name: "Equal Pay", instruments: "EqA 2010 ss.64\u201380", scope: "Like work, work rated as equivalent, work of equal value, material factor defence." },
        { name: "EHRC Employment Code", instruments: "EHRC Statutory Code of Practice", scope: "Full Code guidance, employer liability, vicarious liability, reasonable steps defence." }
      ]
    },
    {
      id: "contracts",
      slug: "contracts",
      name: "Contracts and Terms",
      orientation: "This area covers the legal framework governing employment contracts, written terms, working time, and contractual rights.",
      eileenGreeting: "I\u2019m here to help with contracts and employment terms. What\u2019s your situation?",
      subAreas: [
        { name: "Written Statement of Particulars", instruments: "ERA 1996 ss.1\u201312", scope: "Day-one right, required content, changes to particulars, remedies for failure." },
        { name: "Express and Implied Terms", instruments: "Common law", scope: "Express terms, implied terms (mutual trust, duty of care, fidelity), custom and practice." },
        { name: "Variation of Contract", instruments: "ERA 1996 s.4", scope: "Lawful variation, agreement, fire and rehire restrictions (ERA 2025)." },
        { name: "Restrictive Covenants", instruments: "Common law, ERA 2025", scope: "Non-compete, non-solicitation, confidentiality, reasonableness test." },
        { name: "Working Time", instruments: "WTR 1998", scope: "48-hour week, opt-out, rest breaks, annual leave calculation (Brazel)." },
        { name: "Part-Time and Fixed-Term Rights", instruments: "PTWR 2000, FTER 2002", scope: "Less favourable treatment, objective justification, successive fixed-term contracts." },
        { name: "Agency Worker Rights", instruments: "AWR 2010", scope: "12-week qualifying period, day-one rights, comparator assessment." },
        { name: "Flexible Working", instruments: "ERA 1996 s.80F, FWR 2014, ERA 2025", scope: "Day-one right (ERA 2025), application process, grounds for refusal." },
        { name: "Zero-Hours and Low-Hours", instruments: "ERA 2025", scope: "Guaranteed hours, reasonable notice of shifts, compensation for cancellations." },
        { name: "Holiday Pay Calculations", instruments: "WTR 1998 Reg.16, EqA 2010", scope: "Normal remuneration, 52-week reference, Brazel methodology, rolled-up holiday pay." }
      ]
    },
    {
      id: "family-leave",
      slug: "family-leave",
      name: "Family Leave and Pregnancy",
      orientation: "This area covers legal entitlements during pregnancy, maternity, paternity, adoption, and other family-related leave. One of the most active areas post-ERA 2025.",
      eileenGreeting: "I\u2019m here to help with family leave and pregnancy matters. What\u2019s your situation?",
      subAreas: [
        { name: "Maternity Leave and Pay", instruments: "MPL 1999, SMP Regs", scope: "OML, AML, statutory maternity pay, notification, KIT days, return to work." },
        { name: "Paternity Leave and Pay", instruments: "PAL 2002", scope: "Entitlement, notice, timing, statutory paternity pay." },
        { name: "Shared Parental Leave", instruments: "SPL Regs 2014", scope: "Eligibility, curtailment, notice of entitlement and intention." },
        { name: "Adoption Leave", instruments: "PAL 2002", scope: "Matching, notification, statutory adoption pay, overseas adoption." },
        { name: "Parental Leave (Unpaid)", instruments: "MPL 1999 Part III", scope: "18 weeks per child, qualifying conditions, postponement, default scheme." },
        { name: "Time Off for Dependants", instruments: "ERA 1996 s.57A", scope: "Reasonable time off, definition of dependant, no pay requirement." },
        { name: "Pregnancy Discrimination", instruments: "EqA 2010 s.18", scope: "Protected period, unfavourable treatment, no comparator required." },
        { name: "Redundancy During Pregnancy/Maternity", instruments: "Protection from Redundancy Act 2023, ERA 2025", scope: "Priority right to suitable alternative, extended protection period." },
        { name: "Neonatal Care Leave", instruments: "ERA 2025", scope: "New entitlement, qualifying conditions, duration, statutory neonatal care pay." }
      ]
    },
    {
      id: "transfers",
      slug: "transfers",
      name: "Business Transfers",
      orientation: "This area covers the Transfer of Undertakings regulations and the legal framework for business sales, outsourcing, and service provision changes.",
      eileenGreeting: "I\u2019m here to help with business transfers and TUPE. What\u2019s your situation?",
      subAreas: [
        { name: "What Constitutes a Transfer", instruments: "TUPE 2006 Reg.3", scope: "Relevant transfer, economic entity, service provision change, organised grouping." },
        { name: "Employee Rights on Transfer", instruments: "TUPE 2006 Reg.4", scope: "Automatic transfer of contracts, continuity, preservation of terms." },
        { name: "Information and Consultation", instruments: "TUPE 2006 Regs.13\u201316", scope: "Duty to inform/consult, long enough before transfer, compensation for failure." },
        { name: "ETO Reasons", instruments: "TUPE 2006 Reg.7", scope: "Economic/technical/organisational reasons, when dismissal may be fair." },
        { name: "Harmonisation Post-Transfer", instruments: "TUPE 2006 Reg.4(4)", scope: "Prohibition on varying terms by reason of transfer, one-year restriction." },
        { name: "Collective Redundancy in Transfer", instruments: "TULRCA 1992 s.188, TUPE 2006", scope: "Dual consultation requirements, interaction of obligations." },
        { name: "Outsourcing and Insourcing", instruments: "TUPE 2006 Reg.3(1)(b)", scope: "Service provision changes, activities ceasing and being carried on." }
      ]
    },
    {
      id: "health-safety",
      slug: "health-safety",
      name: "Health and Safety",
      orientation: "This area covers the employer\u2019s duty to provide a safe working environment and the regulatory enforcement framework. Ailane\u2019s estate includes 2,498 HSE prosecutions (\xA3462.7M in fines) and 30,543 enforcement notices.",
      eileenGreeting: "I\u2019m here to help with health and safety matters. What\u2019s your situation?",
      subAreas: [
        { name: "General Duties", instruments: "HSWA 1974 ss.2\u20139", scope: "Employer\u2019s general duty to employees (s.2), to non-employees (s.3), premises control (s.4)." },
        { name: "Risk Assessment", instruments: "MHSWR 1999 Reg.3", scope: "Suitable and sufficient assessment, significant findings, review and revision." },
        { name: "Display Screen Equipment", instruments: "DSE Regs 1992", scope: "Workstation assessment, eye tests, breaks, home/hybrid working DSE." },
        { name: "Workplace Stress", instruments: "HSWA 1974, MHSWR 1999, HSE Standards", scope: "Management standards (demands, control, support, relationships, role, change)." },
        { name: "Accident Reporting", instruments: "RIDDOR 2013", scope: "Reportable injuries, occupational diseases, dangerous occurrences, deadlines." },
        { name: "HSE Enforcement", instruments: "HSWA 1974 ss.21\u201325", scope: "Improvement notices, prohibition notices, prosecution, sentencing guidelines." },
        { name: "Safety Representatives", instruments: "SRSC Regs 1977, HSCER 1996", scope: "Appointment, functions, time off, employer consultation duty." },
        { name: "Right to Refuse Unsafe Work", instruments: "ERA 1996 s.44, HSWA 1974", scope: "Automatic unfair dismissal, detriment protection, reasonable belief." }
      ]
    },
    {
      id: "whistleblowing",
      slug: "whistleblowing",
      name: "Whistleblowing",
      orientation: "This area covers legal protection for workers who report wrongdoing. Users who arrive here are often in acute situations with immediate employment consequences.",
      eileenGreeting: "I\u2019m here to help with whistleblowing and protected disclosures. What\u2019s your situation?",
      subAreas: [
        { name: "Qualifying Disclosures", instruments: "ERA 1996 s.43B", scope: "Six categories: criminal offence, legal obligation failure, miscarriage of justice, H&S danger, environmental damage, concealment." },
        { name: "Protected Disclosures", instruments: "ERA 1996 ss.43C\u201343H", scope: "Disclosure to employer, legal adviser, Minister, prescribed person, wider disclosure." },
        { name: "Automatic Unfair Dismissal", instruments: "ERA 1996 s.103A", scope: "No qualifying service, no compensation cap, burden of proof, interim relief." },
        { name: "Detriment Short of Dismissal", instruments: "ERA 1996 s.47B", scope: "Acts or deliberate failures, co-worker liability, vicarious liability." },
        { name: "Prescribed Persons", instruments: "PI Disclosure (Prescribed Persons) Order", scope: "Full list of prescribed regulators, coverage, reporting routes." },
        { name: "NDAs and Confidentiality Clauses", instruments: "ERA 1996 s.43J", scope: "Void provisions, settlement agreements, clauses preventing protected disclosures." },
        { name: "Whistleblowing Policies", instruments: "ACAS workplace policies guide", scope: "Best practice policies, designated officers, investigation, protection." }
      ]
    },
    {
      id: "data-monitoring",
      slug: "data-monitoring",
      name: "Data and Monitoring",
      orientation: "This area covers data protection obligations in the employment relationship, including employee monitoring, subject access requests, and data retention.",
      eileenGreeting: "I\u2019m here to help with data protection and employee monitoring matters. What\u2019s your situation?",
      subAreas: [
        { name: "Employer GDPR Obligations", instruments: "UK GDPR, DPA 2018", scope: "Lawful bases for employee data, legitimate interests, privacy notices." },
        { name: "Lawful Bases for HR Processing", instruments: "UK GDPR Art.6, Art.9", scope: "Special category data (health, union, biometric), employment condition." },
        { name: "Data Protection Impact Assessments", instruments: "UK GDPR Art.35", scope: "When DPIAs required for HR systems, systematic monitoring, large-scale special category." },
        { name: "Employee Monitoring", instruments: "ICO Employment Practices Code", scope: "Email/internet, CCTV, telephone recording, covert monitoring, impact assessments." },
        { name: "Subject Access Requests", instruments: "UK GDPR Art.15", scope: "Right to access, one-month period, exemptions, redaction of third-party data." },
        { name: "Data Retention", instruments: "UK GDPR Art.5(1)(e)", scope: "Retention schedules, statutory minimums (tax, pension, H&S), destruction procedures." },
        { name: "International Data Transfers", instruments: "UK GDPR Art.44\u201349", scope: "Post-Brexit adequacy, standard contractual clauses, binding corporate rules." },
        { name: "Biometric Data", instruments: "UK GDPR Art.9, DPA 2018", scope: "Fingerprint/facial recognition clocking-in, explicit consent, DPIA, proportionality." }
      ]
    }
  ];
  function bl(record, englishField, lang) {
    if (!record) return "";
    if (lang !== "cy") return record[englishField] || "";
    var cyField = englishField + "_cy";
    return record[cyField] || record[englishField] || "";
  }
  function getRoute() {
    var hash = (window.location.hash || "").replace("#", "") || "/";
    if (hash.indexOf("/domain/") === 0) {
      var slug = hash.replace("/domain/", "");
      var domain = DOMAINS.find(function(d) {
        return d.slug === slug;
      });
      return domain ? { view: "domain", domain } : { view: "welcome" };
    }
    return { view: "welcome" };
  }
  var CONTRACT_INTENT_PATTERNS = [
    /\b(check|review|audit|analyse|analyze)\b.*\b(contract|document|policy|handbook)\b/i,
    /\b(contract|document|policy|handbook)\b.*\b(check|review|audit|analyse|analyze)\b/i,
    /\bupload\b.*\b(contract|document)\b/i,
    /\b(compliance|compliant)\b.*\b(check|review)\b/i,
    /\bcontract\s+compliance\b/i,
    /\bcheck\s+my\s+contract\b/i,
    /\breview\s+my\s+(contract|document)\b/i,
    /\bis\s+my\s+contract\s+(legal|compliant|ok|okay)\b/i
  ];
  function hasContractIntent(text2) {
    return CONTRACT_INTENT_PATTERNS.some(function(pattern) {
      return pattern.test(text2 || "");
    });
  }
  (function() {
    if (typeof document === "undefined") return;
    if (document.getElementById("kl-r1b-keyframes")) return;
    const style = document.createElement("style");
    style.id = "kl-r1b-keyframes";
    style.textContent = "@keyframes kl-pulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }";
    document.head.appendChild(style);
  })();
  (function() {
    if (typeof document === "undefined") return;
    if (document.getElementById("kl-live-001-styles")) return;
    const style = document.createElement("style");
    style.id = "kl-live-001-styles";
    style.textContent = [
      /* §W-C: Coming-into-force rail (horizontal scroll by design) */
      ".kl-forward-rail { display: flex; gap: 10px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 6px; }",
      '.kl-forward-rail-note { width: 100%; max-width: 820px; margin-bottom: 16px; font-size: 11px; color: #475569; font-family: "DM Mono", monospace; text-align: center; }',
      ".kl-forward-card { flex: 0 0 230px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 12px; min-width: 0; }",
      /* §W-A: live calendar */
      '.kl-live-chip { border-radius: 14px; padding: 4px 10px; font-size: 11px; cursor: pointer; font-family: "DM Sans", sans-serif; white-space: nowrap; transition: all 0.15s; }',
      '.kl-cal-viewbtn { border-radius: 6px; padding: 4px 12px; font-size: 11px; cursor: pointer; font-family: "DM Sans", sans-serif; }',
      ".kl-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }",
      ".kl-cal-cell { min-height: 44px; border-radius: 4px; padding: 3px 4px; border: 1px solid transparent; }",
      ".kl-cal-cell.has-events { cursor: pointer; background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); }",
      ".kl-cal-cell.selected { border-color: #0EA5E9; background: rgba(14,165,233,0.08); }",
      ".kl-topic-chip-row { display: flex; gap: 6px; flex-wrap: wrap; }",
      /* §W-C: per-topic currency strip */
      ".kl-currency-strip { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; padding: 10px 14px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 28px; max-width: 720px; }",
      /* §W-E: mobile pass. The first four rules re-assert index.html mobile
         rules that are cascade-dead there (the base .kl-panelrail /
         .kl-topbar-title / padding rules appear LATER in its <style> block at
         equal specificity, so the early max-width:767px block never wins —
         the rail was being auto-placed into an implicit grid row on phones,
         crushing the main column). Injected last, these win the cascade. */
      "@media (max-width: 767px) {",
      "  .kl-panelrail { display: none !important; }",
      "  .kl-topbar-title { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }",
      "  .kl-messages { padding: 16px; }",
      "  .kl-conversation-input { padding: 12px 16px; }",
      "  .kl-welcome { padding: 32px 16px; }",
      "  .kl-topic-chip-row, .kl-domain-selector { overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }",
      "  .kl-live-chip, .kl-cal-viewbtn { min-height: 44px; display: inline-flex; align-items: center; }",
      "  .kl-cal-cell { min-height: 48px; }",
      "  .kl-forward-card { flex-basis: 200px; }",
      "  .kl-currency-strip { flex-direction: column; align-items: flex-start; gap: 8px; }",
      /* §W-E: Eileen markdown data tables → stacked rows */
      "  .eileen-response-content table, .eileen-response-content tbody, .eileen-response-content tr, .eileen-response-content td, .eileen-response-content th { display: block; width: 100%; box-sizing: border-box; }",
      "  .eileen-response-content thead { display: none; }",
      "  .eileen-response-content tr { border-bottom: 1px solid #1E293B; padding: 6px 0; }",
      "  .eileen-response-content td { border-bottom: none !important; }",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  })();
  (function() {
    if (typeof document === "undefined") return;
    if (document.getElementById("kl-live-002-styles")) return;
    const style = document.createElement("style");
    style.id = "kl-live-002-styles";
    style.textContent = [
      /* D6: one viewport-height scroll architecture. dvh (not vh) so mobile
         browser chrome cannot open a phantom page scrollbar behind the app —
         the main column owns exactly one scroll context per view. */
      "html { height: 100%; overflow: hidden; }",
      "body { height: 100dvh; }",
      "#kl-root { height: 100dvh; }",
      ".kl-main { overflow: hidden; }",
      ".kl-panel-drawer-body { overflow-y: auto; overflow-x: hidden; }",
      /* D1: single centred content container for the welcome column —
         hero, research-area grid, and shelf all inherit from it. */
      ".kl-content-container { width: 100%; max-width: 1260px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }",
      ".kl-forward-rail-note { max-width: none; }",
      /* D4: hero clears the top-bar height on scroll — the layout consumes
         the existing --kl-topbar-height variable. */
      ".kl-welcome { scroll-padding-top: calc(var(--kl-topbar-height, 56px) + 8px); }",
      ".kl-welcome-greeting { scroll-margin-top: calc(var(--kl-topbar-height, 56px) + 8px); }",
      /* D2: research-area card grid (replaces the .kl-domain-compact rows).
         2 columns from 768px up; single column below. */
      ".kl-domain-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; width: 100%; }",
      ".kl-domain-card { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; min-height: 132px; padding: 16px 18px; background: var(--kl-surface, #0F1D32); border: 1px solid var(--kl-border, #1E3A5F); border-radius: 10px; cursor: pointer; text-align: left; width: 100%; font-family: var(--kl-font-sans, sans-serif); color: var(--kl-text, #F1F5F9); transition: background 0.2s, border-color 0.2s; }",
      ".kl-domain-card:hover { background: var(--kl-surface-hover, #162440); border-color: var(--kl-cyan, #0EA5E9); }",
      ".kl-domain-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; }",
      ".kl-domain-card-name { font-weight: 600; font-size: 15px; min-width: 0; }",
      ".kl-domain-card-count { font-size: 10px; font-family: var(--kl-font-mono, monospace); color: var(--kl-cyan, #0EA5E9); background: rgba(14,165,233,0.1); border: 1px solid rgba(14,165,233,0.25); border-radius: 10px; padding: 2px 8px; white-space: nowrap; flex-shrink: 0; }",
      ".kl-domain-card-desc { font-size: 13px; color: var(--kl-text-muted, #94A3B8); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }",
      ".kl-domain-card-explore { margin-top: auto; font-size: 12px; font-weight: 500; color: var(--kl-cyan, #0EA5E9); }",
      /* D5: fixed book-spine width; title clamps inside the spine. */
      ".kl-book { flex: 0 0 100px; }",
      ".kl-book-title { display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; min-width: 0; }",
      /* D3: Saved Items / Notes drawer — fixed-width overlay above page
         content, internal scroll only. z-index sits above the mobile sidebar
         (40) and below the modal layer (ExpiredModal 100, vault dialog 1000). */
      ".kl-panel-drawer { top: 0; right: 0; width: 400px; height: 100dvh; z-index: 60; }",
      ".kl-notes-editor-bar { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 4px 0 8px; background: var(--kl-bg, #0A1628); border-bottom: 1px solid var(--kl-border, #1E3A5F); flex-shrink: 0; }",
      /* D7: compact help chip (mobile replacement for the floating card). */
      ".kl-eileen-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 6px 14px; border-radius: 22px; background: rgba(10, 22, 40, 0.9); border: 1px solid rgba(14, 165, 233, 0.3); color: var(--kl-cyan, #0EA5E9); font-size: 12px; font-weight: 500; font-family: var(--kl-font-sans, sans-serif); cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }",
      "@media (max-width: 767px) {",
      "  .kl-domain-card-grid { grid-template-columns: 1fr; }",
      "  .kl-domain-card { min-height: 44px; }",
      /* D5: shelf becomes a horizontal scroll-snap row — no wrap-shrink.
         !important needed to beat the inline flex styles and the 540px
         80px-shrink rule in index.html. */
      "  .kl-shelf { flex-wrap: nowrap !important; overflow-x: auto !important; justify-content: flex-start !important; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }",
      "  .kl-book { flex: 0 0 100px !important; width: 100px !important; height: 130px !important; scroll-snap-align: start; }",
      "  .kl-book > div:nth-child(2) { font-size: 10px !important; }",
      /* D3: drawer becomes a full-screen sheet; action bar buttons stay
         tappable (≥44px). */
      "  .kl-panel-drawer { width: 100%; }",
      "  .kl-notes-editor-bar button { min-height: 44px; }",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  })();
  (function() {
    if (typeof document === "undefined") return;
    if (document.getElementById("eileen-nexus-001-styles")) return;
    const style = document.createElement("style");
    style.id = "eileen-nexus-001-styles";
    style.textContent = [
      ".kl-nexus-host { position: relative; display: block; border-radius: 50%; }",
      ".kl-nexus-host .kl-nexus-canvas { display: block; }",
      ".kl-nexus-halo { transition: box-shadow 0.3s ease; }",
      ".kl-nexus-halo--dormant { box-shadow: 0 0 8px rgba(14,165,233,0.1); }",
      ".kl-nexus-halo--ready { box-shadow: 0 0 12px rgba(14,165,233,0.2); }",
      ".kl-nexus-halo--processing { box-shadow: 0 0 20px rgba(14,165,233,0.4); animation: klNexusHaloPulse 1.5s ease-in-out infinite; }",
      ".kl-nexus-halo--presenting { box-shadow: 0 0 24px rgba(14,165,233,0.5); }",
      "@keyframes klNexusHaloPulse {",
      "  0%, 100% { box-shadow: 0 0 20px rgba(14,165,233,0.4); }",
      "  50% { box-shadow: 0 0 28px rgba(14,165,233,0.55); }",
      "}",
      "@media (prefers-reduced-motion: reduce) {",
      "  .kl-nexus-halo--processing { animation: none; }",
      "}"
    ].join("\n");
    document.head.appendChild(style);
  })();
  var __nexusModulePromise = null;
  function loadNexusModule() {
    if (typeof document === "undefined") return Promise.resolve(false);
    if (window.AilaneNexus && window.AilaneNexus.createNexus) {
      startNexusPoll();
      return Promise.resolve(true);
    }
    if (__nexusModulePromise) return __nexusModulePromise;
    __nexusModulePromise = new Promise(function(resolve) {
      var s = document.createElement("script");
      s.src = "/assets/js/nexus.js";
      s.onload = function() {
        var ok = !!(window.AilaneNexus && window.AilaneNexus.createNexus);
        if (ok) startNexusPoll();
        resolve(ok);
      };
      s.onerror = function() {
        resolve(false);
      };
      document.head.appendChild(s);
    });
    return __nexusModulePromise;
  }
  var NEXUS_URL = "https://cnbsxwtvazfvzmltkuvx.functions.supabase.co/eileen-nexus-intel";
  async function fetchNexus() {
    var ctrl = new AbortController();
    var timeoutId = setTimeout(function() {
      ctrl.abort();
    }, 6e3);
    try {
      var r = await fetch(NEXUS_URL, { signal: ctrl.signal });
      clearTimeout(timeoutId);
      if (!r.ok) {
        console.warn("[Nexus] HTTP " + r.status);
        return;
      }
      var data = await r.json();
      if (data.version !== "v3") {
        console.warn("[Nexus] contract drift: expected v3, got " + data.version);
        return;
      }
      if (!Array.isArray(data.categories) || data.categories.length === 0) {
        return;
      }
      var categories = data.categories.map(function(c) {
        return {
          id: c.id,
          label: typeof c.label === "string" ? c.label.replace(/_/g, " ").replace(/\b\w/g, function(ch) {
            return ch.toUpperCase();
          }) : c.id,
          claim_frequency: c.claim_frequency,
          provision_count: c.provision_count
        };
      });
      if (window.AilaneNexus && window.AilaneNexus.updateLive) {
        window.AilaneNexus.updateLive({
          categories,
          relationships: Array.isArray(data.relationships) ? data.relationships : [],
          instruments: Array.isArray(data.instruments) ? data.instruments : [],
          snapshotAt: data.snapshotAt || null
        });
      }
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn("[Nexus] fetch failed, retaining seed weights");
    }
  }
  var __nexusPollTimer = null;
  function startNexusPoll() {
    if (__nexusPollTimer) return;
    fetchNexus();
    __nexusPollTimer = setInterval(fetchNexus, 5 * 60 * 1e3);
  }
  var ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"];
  var MAX_FILE_SIZE = 10 * 1024 * 1024;
  function formatFileSize(bytes) {
    if (bytes == null) return "";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function renderMarkdown(text2) {
    if (!text2) return "";
    var escaped = escapeHtml(text2);
    var codeBlocks = [];
    escaped = escaped.replace(/```(?:[a-z]*)\n([\s\S]*?)```/gm, function(match, code) {
      var idx = codeBlocks.length;
      codeBlocks.push(`<pre style="background:#0F172A;border:1px solid #1E293B;border-radius:8px;padding:12px 16px;overflow-x:auto;margin:12px 0"><code style="font-family:'DM Mono',monospace;font-size:12px;color:#0EA5E9;line-height:1.6">` + code.trim() + "</code></pre>");
      return "\n%%CODEBLOCK_" + idx + "%%\n";
    });
    var tables = [];
    escaped = escaped.replace(/(\|.+\|\n\|[-:| ]+\|\n(?:\|.+\|\n?)+)/gm, function(match) {
      var idx = tables.length;
      var rows = match.trim().split("\n").filter(function(r) {
        return !r.match(/^\|[-:| ]+\|$/);
      });
      if (rows.length < 1) {
        tables.push(match);
        return "%%TABLE_" + idx + "%%";
      }
      var headerCells = rows[0].split("|").filter(function(c) {
        return c.trim();
      }).map(function(c) {
        return '<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #1E293B;color:#F1F5F9;font-weight:600;font-size:12px">' + c.trim() + "</th>";
      }).join("");
      var bodyRows = rows.slice(1).map(function(row) {
        var cells = row.split("|").filter(function(c) {
          return c.trim();
        }).map(function(c) {
          return '<td style="padding:8px 12px;border-bottom:1px solid #1E293B;color:#CBD5E1;font-size:13px">' + c.trim() + "</td>";
        }).join("");
        return "<tr>" + cells + "</tr>";
      }).join("");
      tables.push('<div style="overflow-x:auto;margin:12px 0"><table style="width:100%;border-collapse:collapse;background:#0F172A;border-radius:8px;overflow:hidden"><thead><tr>' + headerCells + "</tr></thead><tbody>" + bodyRows + "</tbody></table></div>");
      return "\n%%TABLE_" + idx + "%%\n";
    });
    var withInline = escaped.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>").replace(/\*\*(.+?)\*\*/g, '<strong style="color:#F1F5F9">$1</strong>').replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>").replace(/`([^`]+)`/g, `<code style="background:#1E293B;padding:2px 6px;border-radius:4px;font-family:'DM Mono',monospace;font-size:12px;color:#0EA5E9">$1</code>`).replace(/\(([a-z][a-z0-9-]+)\s+(§|s\.)([^)]+)\)/gi, function(match, instId, prefix, sectionRef) {
      var lowerInstId = instId.toLowerCase();
      var display = instId;
      var liveMap = typeof window !== "undefined" && window.__klInstrumentsMap || null;
      var entry = liveMap && (liveMap[lowerInstId] || liveMap[instId]);
      if (entry && entry.display_title) display = entry.display_title;
      return '<span class="kl-ref-link" data-inst="' + escapeHtml(lowerInstId) + '" data-section="' + escapeHtml(prefix + sectionRef) + '" title="Open in Library: ' + escapeHtml(display) + " " + escapeHtml(prefix + sectionRef) + '">' + escapeHtml(display + " " + prefix + sectionRef) + "</span>";
    });
    var lines = withInline.split("\n");
    var out = [];
    var ulItems = [];
    var olItems = [];
    function flushUl() {
      if (ulItems.length) {
        out.push('<ul style="margin:12px 0;padding-left:24px;color:#CBD5E1;list-style:disc">' + ulItems.join("") + "</ul>");
        ulItems = [];
      }
    }
    function flushOl() {
      if (olItems.length) {
        out.push('<ol style="margin:12px 0;padding-left:24px;color:#CBD5E1">' + olItems.join("") + "</ol>");
        olItems = [];
      }
    }
    function flushLists() {
      flushUl();
      flushOl();
    }
    lines.forEach(function(line) {
      var trimmed = line.trim();
      var codeMatch = trimmed.match(/^%%CODEBLOCK_(\d+)%%$/);
      if (codeMatch) {
        flushLists();
        out.push(codeBlocks[parseInt(codeMatch[1])]);
        return;
      }
      var tableMatch = trimmed.match(/^%%TABLE_(\d+)%%$/);
      if (tableMatch) {
        flushLists();
        out.push(tables[parseInt(tableMatch[1])]);
        return;
      }
      var headerMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (headerMatch) {
        flushLists();
        var hLevel = headerMatch[1].length;
        if (hLevel === 2) out.push(`<h3 style="color:#F1F5F9;font-family:'DM Sans',sans-serif;font-size:16px;font-weight:600;margin:20px 0 10px">` + headerMatch[2] + "</h3>");
        else if (hLevel === 3) out.push(`<h4 style="color:#F1F5F9;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;margin:16px 0 8px">` + headerMatch[2] + "</h4>");
        else out.push(`<h4 style="color:#F1F5F9;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;margin:16px 0 8px">` + headerMatch[2] + "</h4>");
        return;
      }
      if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
        flushLists();
        out.push('<hr style="border:none;border-top:1px solid #1E293B;margin:16px 0">');
        return;
      }
      if (trimmed.indexOf("&gt; ") === 0) {
        flushLists();
        var quoteContent = trimmed.substring(5);
        out.push('<blockquote style="border-left:3px solid #0EA5E9;padding:8px 16px;margin:12px 0;color:#CBD5E1;font-style:italic;background:#0F172A;border-radius:0 6px 6px 0">' + quoteContent + "</blockquote>");
        return;
      }
      var olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (olMatch) {
        flushUl();
        olItems.push('<li style="margin:4px 0;padding-left:4px">' + olMatch[2] + "</li>");
        return;
      }
      var ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (ulMatch) {
        flushOl();
        ulItems.push('<li style="margin:4px 0;padding-left:4px">' + ulMatch[1] + "</li>");
        return;
      }
      if (trimmed === "") {
        flushLists();
        return;
      }
      flushLists();
      out.push('<p style="margin:0 0 12px;line-height:1.7">' + line + "</p>");
    });
    flushLists();
    return out.join("");
  }
  var ACAS_PART_TITLES = {
    "Foreword": "About This Code",
    "Introduction": "What This Code Covers",
    "Keys to handling disciplinary situations in the workplace": "Handling Disciplinary Situations",
    "Keys to handling grievances in the workplace": "Handling Workplace Grievances",
    "Disciplinary situations": "When Disciplinary Action May Be Needed",
    "Grievance procedure": "How to Handle a Grievance",
    "Holding a meeting": "Conducting the Meeting",
    "Settlement agreements": "Using Settlement Agreements",
    "Flexible working": "Managing Flexible Working Requests",
    "Redundancy handling": "Managing Redundancy Fairly",
    "Bullying and harassment": "Addressing Bullying and Harassment",
    "Absence management": "Managing Employee Absence",
    "Whistleblowing": "Handling Whistleblowing Disclosures"
  };
  function humanisePartTitle(title, cat) {
    if (!title) return title;
    if (cat === "acas" || cat === "guidance") {
      return ACAS_PART_TITLES[title] || title;
    }
    return title;
  }
  if (typeof window !== "undefined") {
    window.__klFns = window.__klFns || {};
    window.__klFns["humanisePartTitle"] = humanisePartTitle;
  }
  function formatRelativeTime(iso) {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - then);
    const mins = Math.floor(diff / 6e4);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + "d ago";
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }
  function classifyDate(dateStr) {
    var now = /* @__PURE__ */ new Date();
    var d = new Date(dateStr);
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    var weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    if (d >= today) return "Today";
    if (d >= yesterday) return "Yesterday";
    if (d >= weekAgo) return "This Week";
    return "Earlier";
  }
  function groupSessionsByTime(sessions) {
    var groups = {
      today: { label: "Today", items: [] },
      yesterday: { label: "Yesterday", items: [] },
      thisWeek: { label: "This Week", items: [] },
      earlier: { label: "Earlier", items: [] }
    };
    var groupKeyMap = { "Today": "today", "Yesterday": "yesterday", "This Week": "thisWeek", "Earlier": "earlier" };
    sessions.forEach(function(s) {
      var group = s.dateGroup || classifyDate(s.lastActivity);
      var key = groupKeyMap[group] || "earlier";
      groups[key].items.push(s);
    });
    return [groups.today, groups.yesterday, groups.thisWeek, groups.earlier].filter(function(g) {
      return g.items.length > 0;
    });
  }
  var CATEGORY_TITLES = {
    unfair_dismissal: "Unfair Dismissal",
    discrimination: "Discrimination",
    wages_deductions: "Wages and Deductions",
    working_time: "Working Time",
    whistleblowing: "Whistleblowing",
    health_safety: "Health and Safety",
    tupe: "Business Transfers (TUPE)",
    data_protection: "Data Protection",
    family_leave: "Family Leave",
    redundancy: "Redundancy",
    contractual: "Contract Terms",
    equal_pay: "Equal Pay"
  };
  function truncate(s, n) {
    if (!s) return "";
    return s.length > n ? s.substring(0, n - 1) + "\u2026" : s;
  }
  function CanonicalNexus({ size, interactive, showRelationships, nexusState }) {
    const hostRef = useRef(null);
    const px = size || 180;
    useEffect(() => {
      const host = hostRef.current;
      if (!host) return;
      let instance = null;
      let cancelled = false;
      loadNexusModule().then(function(ok) {
        if (!ok || cancelled) return;
        const canvas = document.createElement("canvas");
        canvas.className = "kl-nexus-canvas";
        canvas.setAttribute("aria-hidden", "true");
        host.appendChild(canvas);
        instance = window.AilaneNexus.createNexus(canvas, {
          pageTier: "landing",
          size: px,
          interactive: interactive === true,
          showRelationships: showRelationships !== false,
          dataSource: "eileen-nexus-intel"
        });
      });
      return function() {
        cancelled = true;
        if (instance) instance.destroy();
        while (host.firstChild) host.removeChild(host.firstChild);
      };
    }, [px, interactive, showRelationships]);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: hostRef,
        className: "kl-nexus-host kl-nexus-halo kl-nexus-halo--" + (nexusState || "dormant"),
        style: { width: px + "px", height: px + "px" }
      }
    );
  }
  function EileenStaticDot() {
    return /* @__PURE__ */ React.createElement(
      "span",
      {
        "aria-hidden": "true",
        style: {
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "#0EA5E9",
          boxShadow: "0 0 6px rgba(14,165,233,0.5)",
          flexShrink: 0,
          display: "inline-block"
        }
      }
    );
  }
  function EileenSenderLabel() {
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        "aria-hidden": "true",
        style: {
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "#0EA5E9",
          boxShadow: "0 0 6px rgba(14,165,233,0.5)",
          flexShrink: 0
        }
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "kl-msg-sender", style: { marginBottom: 0 } }, "Eileen"));
  }
  function EileenErrorMessage({ message, retryAction, retryLabel }) {
    return /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      gap: "12px",
      padding: "16px",
      background: "#0F172A",
      borderRadius: "12px",
      border: "1px solid #1E293B",
      margin: "8px 0",
      maxWidth: "520px"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      marginTop: "6px",
      background: "#F59E0B",
      boxShadow: "0 0 8px rgba(245,158,11,0.4)",
      flexShrink: 0
    } }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", lineHeight: 1.6, margin: "0 0 8px" } }, message), retryAction && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: retryAction,
        style: {
          background: "transparent",
          border: "1px solid #334155",
          color: "#94A3B8",
          borderRadius: "6px",
          padding: "6px 14px",
          fontSize: "12px",
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer"
        }
      },
      retryLabel || "Try again"
    )));
  }
  function ContractUploadPrompt({ onUpload }) {
    return /* @__PURE__ */ React.createElement("div", { style: {
      background: "#0F172A",
      border: "1px solid #0EA5E9",
      borderRadius: "12px",
      padding: "20px",
      margin: "12px 0",
      maxWidth: "520px"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: "#0EA5E9",
      boxShadow: "0 0 8px rgba(14,165,233,0.5)"
    } }), /* @__PURE__ */ React.createElement("span", { style: { color: "#F1F5F9", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 } }, "Ready to check your contract")), /* @__PURE__ */ React.createElement("p", { style: { color: "#CBD5E1", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, margin: "0 0 16px" } }, "Upload your employment contract or HR document and Eileen will route it through the Contract Compliance Check engine for analysis against current UK employment legislation."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onUpload,
        style: {
          background: "#0EA5E9",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "13px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          cursor: "pointer"
        },
        onMouseEnter: function(e) {
          e.currentTarget.style.background = "#0284C7";
        },
        onMouseLeave: function(e) {
          e.currentTarget.style.background = "#0EA5E9";
        }
      },
      "Upload Document"
    ));
  }
  function QualifyingQuestion({ onSelect }) {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-eileen" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content" }, /* @__PURE__ */ React.createElement(EileenSenderLabel, null), /* @__PURE__ */ React.createElement("div", { className: "kl-msg-body", style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("p", null, "Before we begin \u2014 are you an employer or HR professional managing staff, or a worker with a question about your own employment?")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          onSelect("employer");
        },
        style: {
          padding: "8px 16px",
          borderRadius: "8px",
          background: "rgba(14, 165, 233, 0.1)",
          border: "1px solid rgba(14, 165, 233, 0.3)",
          color: "#0EA5E9",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.15s"
        },
        onMouseEnter: function(e) {
          e.currentTarget.style.background = "rgba(14, 165, 233, 0.2)";
        },
        onMouseLeave: function(e) {
          e.currentTarget.style.background = "rgba(14, 165, 233, 0.1)";
        }
      },
      "Employer / HR Professional"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          onSelect("worker");
        },
        style: {
          padding: "8px 16px",
          borderRadius: "8px",
          background: "rgba(139, 92, 246, 0.1)",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          color: "#A78BFA",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          transition: "all 0.15s"
        },
        onMouseEnter: function(e) {
          e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)";
        },
        onMouseLeave: function(e) {
          e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
        }
      },
      "Worker"
    ))));
  }
  function TypingIndicator() {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-eileen" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content" }, /* @__PURE__ */ React.createElement(EileenSenderLabel, null), /* @__PURE__ */ React.createElement("div", { className: "kl-typing-dots", style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("span", { className: "kl-dot" }), /* @__PURE__ */ React.createElement("span", { className: "kl-dot" }), /* @__PURE__ */ React.createElement("span", { className: "kl-dot" }))));
  }
  var ADVISOR_TIPS = {
    "dismissal": "Eileen can guide you through unfair dismissal rights, disciplinary procedures, and the ACAS Code. This is the most litigated area of UK employment law.",
    "discrimination": "Eileen covers all nine protected characteristics, the EHRC Code, harassment obligations including the new Worker Protection Act 2023, and equal pay.",
    "contracts": "Eileen can analyse your contract terms against current legislation \u2014 including the new flexible working and zero-hours provisions under ERA 2025.",
    "family-leave": "Eileen covers maternity, paternity, shared parental leave, and the new neonatal care leave under ERA 2025. One of the most active areas of legislative change.",
    "transfers": "Eileen can explain TUPE transfer obligations, employee consultation requirements, and the interaction with collective redundancy law.",
    "health-safety": "Eileen draws on 2,498 HSE prosecution records and 30,543 enforcement notices to contextualise your health and safety obligations.",
    "whistleblowing": "Eileen covers qualifying disclosures, protected disclosure routes, and the employment protections for workers who raise concerns.",
    "data-monitoring": "Eileen can guide you through employer GDPR obligations, employee monitoring rules, and subject access request handling."
  };
  var ADVISOR_GENERIC_TIP = "I'm here whenever you need me. Ask a question or upload a contract for analysis.";
  function FloatingNexusAdvisor({ nearDomain, nexusState, prefersReducedMotion, onProximityDomain, dismissed, onDismiss }) {
    var _show = useState(false);
    var showTooltip = _show[0];
    var setShowTooltip = _show[1];
    var tip = nearDomain ? ADVISOR_TIPS[nearDomain] : null;
    var _mobileVp = useState(typeof window !== "undefined" && window.innerWidth < 768);
    var isMobileVp = _mobileVp[0];
    var setIsMobileVp = _mobileVp[1];
    useEffect(function() {
      function onResize() {
        setIsMobileVp(window.innerWidth < 768);
      }
      window.addEventListener("resize", onResize);
      return function() {
        window.removeEventListener("resize", onResize);
      };
    }, []);
    useEffect(function() {
      if (tip && !dismissed) {
        setShowTooltip(true);
      } else if (!tip) {
        var t = setTimeout(function() {
          setShowTooltip(false);
        }, 300);
        return function() {
          clearTimeout(t);
        };
      }
    }, [tip, dismissed]);
    function handleDismissCard() {
      setShowTooltip(false);
      if (typeof onDismiss === "function") onDismiss();
    }
    var _pos = useState({ x: null, y: null });
    var pos = _pos[0];
    var setPos = _pos[1];
    var dragging = useRef(false);
    var dragOffset = useRef({ x: 0, y: 0 });
    var lastProximityCheck = useRef(0);
    function checkProximity(currentX, currentY) {
      var nowTs = Date.now();
      if (nowTs - lastProximityCheck.current < 100) return;
      lastProximityCheck.current = nowTs;
      var elements = document.querySelectorAll("[data-domain-slug], [data-feed-id], [data-calendar-id]");
      var closest = null;
      var closestDist = Infinity;
      elements.forEach(function(el) {
        var rect = el.getBoundingClientRect();
        var cx = (rect.left + rect.right) / 2;
        var cy = (rect.top + rect.bottom) / 2;
        var dist = Math.sqrt(Math.pow(currentX - cx, 2) + Math.pow(currentY - cy, 2));
        if (dist < 120 && dist < closestDist) {
          closestDist = dist;
          closest = el.dataset.domainSlug || null;
        }
      });
      if (typeof onProximityDomain === "function") onProximityDomain(closest);
    }
    function handleMouseDown(e) {
      if (window.innerWidth < 768) {
        setShowTooltip(function(v) {
          return !v;
        });
        return;
      }
      dragging.current = true;
      var rect = e.currentTarget.getBoundingClientRect();
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      e.preventDefault();
    }
    function handleTouchStart(e) {
      if (window.innerWidth < 768) {
        setShowTooltip(function(v) {
          return !v;
        });
        return;
      }
      dragging.current = true;
      var touch = e.touches[0];
      var rect = e.currentTarget.getBoundingClientRect();
      dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    useEffect(function() {
      function handleMouseMove(e) {
        if (!dragging.current) return;
        var x = Math.max(0, Math.min(window.innerWidth - 52, e.clientX - dragOffset.current.x));
        var y = Math.max(0, Math.min(window.innerHeight - 52, e.clientY - dragOffset.current.y));
        setPos({ x, y });
        checkProximity(e.clientX, e.clientY);
      }
      function handleMouseUp() {
        dragging.current = false;
        setPos(function(prev) {
          if (prev.x !== null && (prev.x < 60 || prev.y < 60)) {
            return { x: null, y: null };
          }
          return prev;
        });
      }
      function handleTouchMove(e) {
        if (!dragging.current) return;
        var touch = e.touches[0];
        var x = Math.max(0, Math.min(window.innerWidth - 52, touch.clientX - dragOffset.current.x));
        var y = Math.max(0, Math.min(window.innerHeight - 52, touch.clientY - dragOffset.current.y));
        setPos({ x, y });
        checkProximity(touch.clientX, touch.clientY);
        if (e.cancelable) e.preventDefault();
      }
      function handleTouchEnd() {
        dragging.current = false;
        setPos(function(prev) {
          if (prev.x !== null && (prev.x < 60 || prev.y < 60)) {
            return { x: null, y: null };
          }
          return prev;
        });
      }
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
      return function() {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      };
    }, []);
    function renderTipCard(text2) {
      return React.createElement(
        "div",
        {
          style: {
            background: "#0F172A",
            border: "1px solid #1E293B",
            borderRadius: "12px",
            padding: "14px 18px",
            maxWidth: "300px",
            transition: "opacity 0.3s, transform 0.3s",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
          }
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" } },
          React.createElement(EileenStaticDot, null),
          React.createElement("span", { style: { color: "#0EA5E9", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, flex: 1 } }, "Eileen"),
          React.createElement("button", {
            type: "button",
            onClick: handleDismissCard,
            "aria-label": "Dismiss Eileen helper",
            style: {
              background: "none",
              border: "none",
              color: "#64748B",
              fontSize: "16px",
              cursor: "pointer",
              padding: "0 0 0 8px",
              lineHeight: 1,
              flexShrink: 0
            }
          }, "\xD7")
        ),
        React.createElement("p", { style: { color: "#CBD5E1", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, margin: 0 } }, text2)
      );
    }
    if (isMobileVp) {
      return React.createElement(
        "div",
        {
          style: {
            position: "fixed",
            bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
            // z-index 50: above page content, below the panel drawer (60) so the
            // full-screen sheet covers the chip on mobile (§W-G.3).
            right: "16px",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "8px"
          }
        },
        showTooltip ? renderTipCard(tip || ADVISOR_GENERIC_TIP) : null,
        React.createElement(
          "button",
          {
            type: "button",
            className: "kl-eileen-chip",
            "aria-label": showTooltip ? "Hide Eileen helper" : "Show Eileen helper",
            "aria-expanded": showTooltip,
            onClick: function() {
              setShowTooltip(function(v) {
                return !v;
              });
            }
          },
          React.createElement("span", {
            "aria-hidden": "true",
            style: {
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#0EA5E9",
              boxShadow: "0 0 6px rgba(14,165,233,0.5)",
              flexShrink: 0
            }
          }),
          "Eileen"
        )
      );
    }
    var posStyle = pos.x !== null ? {
      position: "fixed",
      left: pos.x + "px",
      top: pos.y + "px",
      zIndex: 1e3,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "8px",
      cursor: dragging.current ? "grabbing" : "grab"
    } : {
      position: "fixed",
      bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
      right: "24px",
      zIndex: 1e3,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "8px",
      cursor: dragging.current ? "grabbing" : "grab"
    };
    return React.createElement(
      "div",
      { style: posStyle },
      // Advisor tooltip
      showTooltip && tip ? renderTipCard(tip) : null,
      // Nexus orb (draggable)
      React.createElement(
        "div",
        {
          onMouseDown: handleMouseDown,
          onTouchStart: handleTouchStart,
          role: "button",
          "aria-label": "Drag Eileen",
          style: {
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: dragging.current ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
            boxShadow: "0 0 " + (nearDomain ? "16" : "8") + "px rgba(14,165,233," + (nearDomain ? "0.3" : "0.15") + ")",
            transition: "box-shadow 0.3s"
          }
        },
        React.createElement(CanonicalNexus, {
          size: 52,
          interactive: false,
          showRelationships: false,
          nexusState: nearDomain ? "ready" : nexusState || "dormant"
        })
      )
    );
  }
  function NexusSendButton({ size, nexusState, disabled, onClick, prefersReducedMotion, tier }) {
    var s = size || 38;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick,
        disabled,
        className: "kl-nexus-halo kl-nexus-halo--" + (disabled ? "dormant" : nexusState || "dormant"),
        style: {
          width: s + "px",
          height: s + "px",
          borderRadius: "50%",
          border: "none",
          background: disabled ? "transparent" : "#0EA5E9",
          padding: 0,
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.3 : 1,
          transition: "opacity 0.2s, background 0.3s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden"
        },
        "aria-label": "Send message to Eileen"
      },
      /* @__PURE__ */ React.createElement(
        "svg",
        {
          width: Math.round(s * 0.45),
          height: Math.round(s * 0.45),
          viewBox: "0 0 24 24",
          fill: "none",
          style: { position: "relative", zIndex: 1 },
          "aria-hidden": "true"
        },
        /* @__PURE__ */ React.createElement(
          "path",
          {
            d: "M5 12h14M13 6l6 6-6 6",
            stroke: "#FFFFFF",
            strokeWidth: "2.5",
            strokeLinecap: "round",
            strokeLinejoin: "round"
          }
        )
      )
    );
  }
  function FileAttachmentBubble({ filename, fileSize, status, charCount }) {
    const sizeLabel = formatFileSize(fileSize);
    const statusIcon = {
      uploading: "\u23F3",
      // ⏳
      extracting: "\u2699\uFE0F",
      // ⚙️
      ready: "\u2705",
      // ✅
      error: "\u274C"
      // ❌
    }[status] || "\u23F3";
    const statusLabel = {
      uploading: "Uploading...",
      extracting: "Extracting text...",
      ready: charCount ? charCount.toLocaleString() + " characters extracted" : "Ready",
      error: "Upload failed"
    }[status] || "";
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 14px",
          borderRadius: "10px",
          background: "rgba(14,165,233,0.08)",
          border: "1px solid rgba(14,165,233,0.2)",
          maxWidth: "320px"
        }
      },
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: "24px" }, "aria-hidden": "true" }, "\u{1F4C4}"),
      /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            color: "#E2E8F0",
            fontSize: "13px",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }
        },
        filename
      ), /* @__PURE__ */ React.createElement("div", { style: { color: "#94A3B8", fontSize: "11px", marginTop: "2px" } }, sizeLabel + " \xB7 " + statusLabel)),
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: "16px" }, "aria-hidden": "true" }, statusIcon)
    );
  }
  function AnalysisResultMessage({ data }) {
    const score = data.overall_score;
    const status = data.status;
    const findings = data.findings || [];
    const forwardFindings = data.forward_findings || [];
    const summary = data.summary || {};
    const engineVersion = data.engine_version || "";
    const analysisTimeMs = data.analysis_time_ms || 0;
    const checksUsed = data.checks_used;
    const checkLimit = data.check_limit;
    const [showCompliant, setShowCompliant] = useState(false);
    const expandedRef = useRef({});
    const [, setTick] = useState(0);
    function toggleFinding(key) {
      expandedRef.current[key] = !expandedRef.current[key];
      setTick((c) => c + 1);
    }
    if (status === "out_of_scope") {
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            padding: "16px",
            borderRadius: "10px",
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.2)"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: "14px", fontWeight: 600, color: "#FBBF24", marginBottom: "8px" } }, "\u26A0\uFE0F Document Outside Scope"),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: "13px", color: "#CBD5E1", lineHeight: 1.5 } }, "This document does not appear to be a UK employment contract, staff handbook, or workplace policy. The compliance engine analyses employment documents only. If this is an employment document, try uploading it in a different format (PDF or DOCX).")
      );
    }
    const scoreColor = score >= 65 ? "#22C55E" : score >= 30 ? "#F59E0B" : "#EF4444";
    const SEV_COLORS = {
      critical: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", text: "#EF4444", label: "Critical" },
      major: { bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", text: "#FBBF24", label: "Major" },
      minor: { bg: "rgba(234,179,8,0.06)", border: "rgba(234,179,8,0.2)", text: "#EAB308", label: "Minor" },
      compliant: { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.2)", text: "#22C55E", label: "Compliant" }
    };
    const severityOrder = { critical: 0, major: 1, minor: 2, compliant: 3 };
    const visibleFindings = findings.filter((f) => showCompliant || f.severity !== "compliant").slice().sort((a, b) => (severityOrder[a.severity] != null ? severityOrder[a.severity] : 4) - (severityOrder[b.severity] != null ? severityOrder[b.severity] : 4));
    const forwardNonCompliant = forwardFindings.filter((f) => f.severity !== "compliant");
    const compliantCount = findings.filter((f) => f.severity === "compliant").length;
    const findingsTotal = findings.length;
    const forwardTotal = forwardFindings.length;
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: "100%" } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          background: "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(14,165,233,0.04))",
          border: "1px solid rgba(14,165,233,0.25)",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "16px"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: "13px", color: "rgba(255,255,255,0.6)", fontFamily: "'DM Sans', sans-serif", marginBottom: "4px" } }, "Contract Compliance Score"),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: "28px", fontWeight: 700, color: scoreColor, fontFamily: "'DM Mono', monospace" } }, Math.round(score) + "%"),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px", fontFamily: "'DM Sans', sans-serif" } }, findingsTotal + " finding" + (findingsTotal === 1 ? "" : "s") + " \xB7 " + forwardTotal + " forward exposure item" + (forwardTotal === 1 ? "" : "s"))
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" } }, Object.entries(summary).map(function(entry) {
      var sev = entry[0];
      var count = entry[1];
      if (!count) return null;
      var colors = { critical: "#EF4444", major: "#F59E0B", minor: "#3B82F6", compliant: "#22C55E" };
      return React.createElement("span", {
        key: sev,
        style: {
          background: (colors[sev] || "#666") + "20",
          border: "1px solid " + (colors[sev] || "#666") + "40",
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "12px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          color: colors[sev] || "#aaa"
        }
      }, count + " " + sev);
    })), status === "sparse_report" && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#FBBF24", marginBottom: "12px" } }, "\u26A0\uFE0F Some requirements could not be assessed. Manual review recommended for gaps."), visibleFindings.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "14px", fontWeight: 700, color: "#22D3EE", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" } }, "Current Law Findings"), visibleFindings.map((finding, idx) => {
      const sev = SEV_COLORS[finding.severity] || SEV_COLORS.minor;
      const key = "c" + idx + "-" + finding.severity;
      const isExpanded = !!expandedRef.current[key];
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key,
          style: {
            marginBottom: "8px",
            borderRadius: "8px",
            background: sev.bg,
            border: "1px solid " + sev.border,
            overflow: "hidden"
          }
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            onClick: () => toggleFinding(key),
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              cursor: "pointer"
            }
          },
          /* @__PURE__ */ React.createElement(
            "span",
            {
              style: {
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: "4px",
                background: sev.border,
                color: sev.text
              }
            },
            sev.label
          ),
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", color: "#CBD5E1", flex: 1, minWidth: 0 } }, finding.clause_category),
          finding.statutory_ref && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#64748B" } }, finding.statutory_ref),
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", color: "#64748B", marginLeft: "4px" } }, isExpanded ? "\u25B2" : "\u25BC")
        ),
        isExpanded && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 12px 12px 12px" } }, finding.clause_text && finding.clause_text !== "[Not found in document]" && /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#94A3B8",
              fontStyle: "italic",
              padding: "6px 10px",
              marginBottom: "8px",
              borderRadius: "4px",
              background: "rgba(0,0,0,0.2)",
              borderLeft: "2px solid " + sev.border
            }
          },
          finding.clause_text.length > 300 ? finding.clause_text.slice(0, 300) + "\u2026" : finding.clause_text
        ), finding.finding_detail && /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#CBD5E1",
              lineHeight: 1.5,
              marginBottom: "8px"
            }
          },
          finding.finding_detail
        ), finding.remediation && /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#0EA5E9",
              lineHeight: 1.5,
              padding: "8px 10px",
              borderRadius: "4px",
              background: "rgba(14,165,233,0.06)",
              borderLeft: "2px solid rgba(14,165,233,0.3)"
            }
          },
          /* @__PURE__ */ React.createElement("strong", { style: { fontSize: "11px", display: "block", marginBottom: "4px" } }, "Remediation"),
          finding.remediation
        ))
      );
    }), compliantCount > 0 && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setShowCompliant(!showCompliant),
        style: {
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.5)",
          fontSize: "12px",
          cursor: "pointer",
          padding: "8px 0",
          fontFamily: "'DM Sans', sans-serif"
        }
      },
      showCompliant ? "Hide compliant items" : "Show " + compliantCount + " compliant item" + (compliantCount === 1 ? "" : "s")
    ), forwardNonCompliant.length > 0 && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          fontSize: "14px",
          fontWeight: 700,
          color: "#A855F7",
          marginTop: "20px",
          marginBottom: "8px",
          fontFamily: "'DM Sans', sans-serif"
        }
      },
      "Legislative Horizon \u2014 Forward Exposure"
    ), forwardNonCompliant.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: "11px", color: "#94A3B8", marginBottom: "10px" } }, "These findings relate to provisions of the Employment Rights Act 2025 not yet in force. They do not affect the current compliance position."), forwardNonCompliant.map((finding, idx) => {
      const sev = SEV_COLORS[finding.severity] || SEV_COLORS.minor;
      const key = "f" + idx;
      const isExpanded = !!expandedRef.current[key];
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key,
          style: {
            marginBottom: "8px",
            borderRadius: "8px",
            background: "rgba(167,139,250,0.04)",
            border: "1px solid rgba(167,139,250,0.15)",
            overflow: "hidden"
          }
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            onClick: () => toggleFinding(key),
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              cursor: "pointer"
            }
          },
          /* @__PURE__ */ React.createElement(
            "span",
            {
              style: {
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: "4px",
                background: sev.border,
                color: sev.text
              }
            },
            sev.label
          ),
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", color: "#CBD5E1", flex: 1, minWidth: 0 } }, finding.clause_category),
          finding.forward_effective_date && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#A78BFA" } }, "Expected: " + finding.forward_effective_date),
          /* @__PURE__ */ React.createElement("span", { style: { fontSize: "12px", color: "#64748B", marginLeft: "4px" } }, isExpanded ? "\u25B2" : "\u25BC")
        ),
        isExpanded && /* @__PURE__ */ React.createElement("div", { style: { padding: "0 12px 12px 12px" } }, finding.finding_detail && /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#CBD5E1",
              lineHeight: 1.5,
              marginBottom: "8px"
            }
          },
          finding.finding_detail
        ), finding.remediation && /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#A78BFA",
              lineHeight: 1.5,
              padding: "8px 10px",
              borderRadius: "4px",
              background: "rgba(167,139,250,0.04)",
              borderLeft: "2px solid rgba(167,139,250,0.2)"
            }
          },
          /* @__PURE__ */ React.createElement(
            "strong",
            {
              style: { fontSize: "11px", display: "block", marginBottom: "4px" }
            },
            "Action Before Commencement"
          ),
          finding.remediation
        ))
      );
    })), /* @__PURE__ */ React.createElement("div", { style: { marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: "12px" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: async (e) => {
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = "Generating PDF\u2026";
          try {
            const token = window.__klToken;
            if (!token) throw new Error("Not authenticated");
            const response = await fetch(
              SUPABASE_URL + "/functions/v1/generate-report-pdf",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": "Bearer " + token,
                  "apikey": SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ upload_id: data.upload_id })
              }
            );
            if (!response.ok) throw new Error("PDF generation failed");
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Ailane-Compliance-Report.pdf";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            btn.textContent = "\u2713 Downloaded";
            btn.disabled = false;
            setTimeout(() => {
              btn.textContent = "\u{1F4C4} Download PDF Report";
            }, 2e3);
          } catch (err) {
            console.error("PDF download error:", err);
            btn.textContent = "\u274C Failed \u2014 try again";
            btn.disabled = false;
            setTimeout(() => {
              btn.textContent = "\u{1F4C4} Download PDF Report";
            }, 3e3);
          }
        },
        style: {
          background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "14px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          cursor: "pointer",
          transition: "transform 0.15s, box-shadow 0.15s"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(14,165,233,0.3)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        }
      },
      "\u{1F4C4} Download PDF Report"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: async (e) => {
          var btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = "Saving\u2026";
          try {
            var token = window.__klToken;
            if (!token) throw new Error("Not authenticated");
            var docId = data.document_id;
            if (docId) {
              var resp = await fetch(
                SUPABASE_URL + "/rest/v1/kl_vault_documents?id=eq." + docId,
                {
                  method: "PATCH",
                  headers: {
                    "Authorization": "Bearer " + token,
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                  },
                  body: JSON.stringify({ analysis_status: "completed" })
                }
              );
              if (!resp.ok) throw new Error("Vault update failed (" + resp.status + ")");
            }
            btn.textContent = "\u2713 Saved to Vault";
            btn.style.background = "rgba(16,185,129,0.15)";
            btn.style.color = "#10B981";
            btn.style.borderColor = "rgba(16,185,129,0.3)";
          } catch (err) {
            console.error("Save to Vault error:", err);
            btn.textContent = "\u274C Failed \u2014 try again";
            btn.disabled = false;
            setTimeout(function() {
              btn.textContent = "\u{1F4BE} Save to Vault";
            }, 3e3);
          }
        },
        style: {
          background: "transparent",
          color: "#CBD5E1",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "8px",
          padding: "10px 20px",
          fontSize: "14px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.15s"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.borderColor = "rgba(14,165,233,0.3)";
          e.currentTarget.style.color = "#0EA5E9";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
          e.currentTarget.style.color = "#CBD5E1";
        }
      },
      "\u{1F4BE} Save to Vault"
    )), /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          marginTop: "12px",
          paddingTop: "10px",
          borderTop: "1px solid rgba(148,163,184,0.1)",
          fontSize: "11px",
          color: "#64748B",
          lineHeight: 1.5
        }
      },
      "Engine " + engineVersion + " \xB7 " + Math.round(analysisTimeMs / 1e3) + "s analysis time",
      checksUsed != null && checkLimit != null ? " \xB7 Check " + checksUsed + "/" + checkLimit + " used" : "",
      /* @__PURE__ */ React.createElement("div", { style: { marginTop: "6px", fontSize: "10px", color: "#475569" } }, "This analysis is regulatory intelligence grounded in Ailane's compliance engine. It does not constitute legal advice. AI Lane Limited (Company No. 17035654, ICO Reg. 00013389720) trading as Ailane.")
    ));
  }
  var __eileenVoiceDisclosureShown = false;
  function selectEileenVoice() {
    try {
      var voices = window.speechSynthesis && window.speechSynthesis.getVoices() || [];
      if (!voices.length) return null;
      var fiona = voices.find(function(v) {
        return /fiona/i.test(v.name);
      });
      if (fiona) return fiona;
      var namedFemale = ["kate", "serena", "moira", "martha", "tessa"];
      for (var i = 0; i < namedFemale.length; i++) {
        var match = voices.find(function(v) {
          return new RegExp(namedFemale[i], "i").test(v.name);
        });
        if (match) return match;
      }
      var maleTokens = /(daniel|oliver|arthur|male|man)/i;
      var enGbFemale = voices.find(function(v) {
        return (v.lang === "en-GB" || /en[-_]gb/i.test(v.lang)) && !maleTokens.test(v.name);
      });
      if (enGbFemale) return enGbFemale;
      var enGb = voices.find(function(v) {
        return v.lang === "en-GB" || /en[-_]gb/i.test(v.lang);
      });
      if (enGb) return enGb;
      var en = voices.find(function(v) {
        return /^en/i.test(v.lang);
      });
      if (en) return en;
      return voices[0] || null;
    } catch (err) {
      return null;
    }
  }
  function stripMarkdownForSpeech(src) {
    if (!src) return "";
    var s = String(src);
    s = s.replace(/```[\s\S]*?```/g, " ");
    s = s.replace(/`([^`]+)`/g, "$1");
    s = s.replace(/^#{1,6}\s+/gm, "");
    s = s.replace(/^>\s+/gm, "");
    s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
    s = s.replace(/\*([^*]+)\*/g, "$1");
    s = s.replace(/__([^_]+)__/g, "$1");
    s = s.replace(/_([^_]+)_/g, "$1");
    s = s.replace(/~~([^~]+)~~/g, "$1");
    s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    s = s.replace(/^[\s]*[-*+]\s+/gm, "");
    s = s.replace(/^[\s]*\d+\.\s+/gm, "");
    s = s.replace(/<[^>]+>/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }
  function ReadAloudButton({ text: text2 }) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    useEffect(function() {
      return function() {
        try {
          if (isSpeaking && window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
        } catch (e) {
        }
      };
    }, []);
    function handleClick() {
      if (!window.speechSynthesis) return;
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }
      var clean = stripMarkdownForSpeech(text2);
      if (!clean) return;
      window.speechSynthesis.cancel();
      var utt = new SpeechSynthesisUtterance(clean);
      var voice = selectEileenVoice();
      if (voice) utt.voice = voice;
      utt.lang = voice && voice.lang || "en-GB";
      utt.pitch = 1.15;
      utt.rate = 0.92;
      utt.volume = 0.9;
      utt.onend = function() {
        setIsSpeaking(false);
      };
      utt.onerror = function() {
        setIsSpeaking(false);
      };
      setIsSpeaking(true);
      window.speechSynthesis.speak(utt);
      if (!__eileenVoiceDisclosureShown) {
        __eileenVoiceDisclosureShown = true;
        try {
          var toast = document.createElement("div");
          toast.textContent = "Eileen uses AI-generated voice technology";
          toast.style.cssText = "position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#1E293B;color:#F1F5F9;padding:10px 18px;border-radius:8px;font-size:12px;font-family:DM Sans,sans-serif;z-index:9999;border:1px solid #334155;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:1;transition:opacity 0.4s;";
          document.body.appendChild(toast);
          setTimeout(function() {
            toast.style.opacity = "0";
            setTimeout(function() {
              if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
          }, 3500);
        } catch (e) {
        }
      }
    }
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleClick,
        className: "kl-action-btn",
        title: isSpeaking ? "Stop reading" : "Read aloud",
        "aria-label": isSpeaking ? "Stop reading" : "Read response aloud"
      },
      isSpeaking ? "\u25A0 Stop" : "\u25B6 Read aloud"
    );
  }
  function UploadCompleteMessage({ filename, charCount, documentId, onRunAnalysis, onVaultOnly, dismissed, msgId, extractionFailed }) {
    if (dismissed) {
      return /* @__PURE__ */ React.createElement("div", { style: {
        marginTop: "8px",
        padding: "10px 14px",
        background: "rgba(16,185,129,0.08)",
        border: "1px solid rgba(16,185,129,0.25)",
        borderRadius: "8px",
        fontSize: "13px",
        color: "#10B981",
        fontFamily: "'DM Sans', sans-serif"
      } }, "\u2713 Saved to Document Vault");
    }
    var sizeLabel = extractionFailed ? "saved to vault (text extraction unavailable)" : charCount != null ? charCount.toLocaleString() + " characters extracted" : "ready";
    return /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.7 } }, "I have your contract", filename ? " \u2014 " + filename : "", " \u2014 ", sizeLabel, ". How would you like to proceed?"), extractionFailed && /* @__PURE__ */ React.createElement("div", { style: { fontSize: "12px", color: "#b08000", marginTop: "10px", marginBottom: "8px" } }, "Text extraction was not possible. The file is saved in your vault. To run a compliance check, try re-uploading as a text-based PDF."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" } }, !extractionFailed && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          if (typeof onRunAnalysis === "function") onRunAnalysis(documentId, msgId);
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          transition: "opacity 0.2s"
        },
        onMouseEnter: function(e) {
          e.currentTarget.style.opacity = "0.9";
        },
        onMouseLeave: function(e) {
          e.currentTarget.style.opacity = "1";
        }
      },
      "\u2713 Run Compliance Check"
    ), extractionFailed && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: true,
        title: "Text extraction failed \\u2014 file saved to vault but cannot run compliance check",
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          background: "#334155",
          color: "#94A3B8",
          border: "none",
          borderRadius: "8px",
          cursor: "not-allowed",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          opacity: 0.6
        }
      },
      "Compliance Check Unavailable"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          if (typeof onVaultOnly === "function") onVaultOnly(msgId);
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 18px",
          background: "transparent",
          color: "#CBD5E1",
          border: "1px solid #334155",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 500,
          fontFamily: "'DM Sans', sans-serif",
          transition: "border-color 0.2s, color 0.2s"
        },
        onMouseEnter: function(e) {
          e.currentTarget.style.borderColor = "#64748B";
          e.currentTarget.style.color = "#F1F5F9";
        },
        onMouseLeave: function(e) {
          e.currentTarget.style.borderColor = "#334155";
          e.currentTarget.style.color = "#CBD5E1";
        }
      },
      "Save to Vault only"
    )));
  }
  function MessageBubble({ msg, onRunAnalysis, onVaultOnly }) {
    if (msg.type === "file_upload") {
      return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-user" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content" }, /* @__PURE__ */ React.createElement(
        FileAttachmentBubble,
        {
          filename: msg.filename,
          fileSize: msg.fileSize,
          status: msg.status,
          charCount: msg.charCount
        }
      )));
    }
    if (msg.role === "user") {
      return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-user" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-body" }, msg.content)));
    }
    if (msg.isUploadComplete) {
      return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-eileen" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content", style: { position: "relative" } }, /* @__PURE__ */ React.createElement(EileenSenderLabel, null), /* @__PURE__ */ React.createElement(
        UploadCompleteMessage,
        {
          filename: msg.filename,
          charCount: msg.charCount,
          documentId: msg.documentId,
          msgId: msg.id,
          dismissed: !!msg.vaultOnly,
          extractionFailed: !!msg.extractionFailed,
          onRunAnalysis,
          onVaultOnly
        }
      )));
    }
    const hasStats = msg.provisionsCount != null || msg.casesCount != null;
    const renderAnalysisResult = msg.isAnalysisResult && msg.analysisData;
    const html2 = renderAnalysisResult ? "" : renderMarkdown(msg.content || "");
    function handleRunClick() {
      if (typeof onRunAnalysis === "function") {
        onRunAnalysis(msg.documentId, msg.id);
      }
    }
    return /* @__PURE__ */ React.createElement("div", { className: "kl-msg kl-msg-eileen" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-content", style: { position: "relative" } }, /* @__PURE__ */ React.createElement(EileenSenderLabel, null), msg.isAnalysisLoading && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "8px",
          marginBottom: "4px"
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "kl-analysis-pulse",
          style: {
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#0EA5E9",
            animation: "kl-pulse 1.5s ease-in-out infinite",
            flexShrink: 0
          },
          "aria-hidden": "true"
        }
      ),
      /* @__PURE__ */ React.createElement("span", { style: { color: "#94A3B8", fontSize: "11px", fontStyle: "italic" } }, "Compliance engine active")
    ), renderAnalysisResult ? /* @__PURE__ */ React.createElement("div", { className: "kl-msg-body", style: { marginTop: "8px" } }, /* @__PURE__ */ React.createElement(AnalysisResultMessage, { data: msg.analysisData })) : /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "eileen-response-content",
        style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.7, marginTop: "8px" },
        dangerouslySetInnerHTML: { __html: html2 }
      }
    ), msg.analysisReady && msg.documentId && !msg.analysisTriggered && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleRunClick,
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "12px",
          padding: "10px 18px",
          background: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          transition: "opacity 0.2s"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.opacity = "0.9";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.opacity = "1";
        }
      },
      "\u2713 Run Contract Compliance Check"
    ), msg.analysisReady && msg.analysisTriggered && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          marginTop: "12px",
          padding: "8px 14px",
          background: "rgba(14,165,233,0.08)",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#64748B",
          display: "inline-block"
        }
      },
      "\u2713 Contract Compliance Check initiated"
    ), msg.role === "assistant" && !msg.isAnalysisResult && !msg.isAnalysisLoading && !msg.isLocal && /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      gap: "2px",
      marginTop: "10px",
      paddingTop: "8px",
      borderTop: "1px solid rgba(255,255,255,0.06)"
    } }, /* @__PURE__ */ React.createElement(ReadAloudButton, { text: msg.content || "" }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function(e) {
          var btn = e.currentTarget;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(msg.content || "").then(function() {
              var orig = btn.textContent;
              btn.textContent = "\u2713 Copied";
              setTimeout(function() {
                btn.textContent = orig;
              }, 1500);
            });
          }
        },
        className: "kl-action-btn",
        title: "Copy to clipboard"
      },
      "Copy"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function(e) {
          var btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = "Saving\u2026";
          var token = window.__klToken;
          var userId = window.__klUserId;
          if (!token || !userId) {
            btn.textContent = "Not signed in";
            btn.disabled = false;
            return;
          }
          var noteTitle = (msg.content || "").split("\n")[0].slice(0, 50) || "Eileen response";
          var now = /* @__PURE__ */ new Date();
          var dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
          var timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
          var attribution = "[Eileen \u2014 " + dateStr + " " + timeStr + "] " + noteTitle;
          fetch(SUPABASE_URL + "/rest/v1/kl_workspace_notes", {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + token,
              "apikey": SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
              "Prefer": "return=representation"
            },
            body: JSON.stringify({
              user_id: userId,
              project_id: null,
              title: noteTitle,
              content_plain: msg.content || "",
              content_json: {},
              note_type: "eileen_response",
              source_attribution: attribution
            })
          }).then(function(resp) {
            if (resp.ok) {
              btn.textContent = "\u2713 Saved";
              btn.style.color = "#10B981";
              resp.json().then(function(data) {
                if (Array.isArray(data) && data[0] && typeof window.__klNotesRefresh === "function") {
                  window.__klNotesRefresh(data[0]);
                }
              }).catch(function() {
              });
              var toast = document.createElement("div");
              toast.textContent = "Saved to Saved Items";
              toast.style.cssText = "position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#10B981;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;font-family:DM Sans,sans-serif;z-index:9999;opacity:1;transition:opacity 0.3s;";
              document.body.appendChild(toast);
              setTimeout(function() {
                toast.style.opacity = "0";
                setTimeout(function() {
                  document.body.removeChild(toast);
                }, 300);
              }, 2e3);
            } else {
              btn.textContent = "Failed";
              btn.style.color = "#EF4444";
            }
            setTimeout(function() {
              btn.textContent = "Save";
              btn.style.color = "";
              btn.disabled = false;
            }, 2e3);
          }).catch(function() {
            btn.textContent = "Failed";
            setTimeout(function() {
              btn.textContent = "Save";
              btn.style.color = "";
              btn.disabled = false;
            }, 2e3);
          });
        },
        className: "kl-action-btn",
        title: "Save this response to Saved Items"
      },
      "Save"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function() {
          var text2 = msg.content || "";
          var safeTitle = text2.split("\n")[0].slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, "") || "Eileen-response";
          var disclaimer = "\n\n---\nThis content was exported from the Ailane Knowledge Library. It constitutes regulatory intelligence, not legal advice. For legal advice, consult a qualified employment solicitor. AI Lane Limited \xB7 Company No. 17035654 \xB7 ICO Reg. 00013389720 \xB7 ailane.ai/terms/";
          var blob = new Blob([text2 + disclaimer], { type: "text/plain;charset=utf-8" });
          var url = URL.createObjectURL(blob);
          var a = document.createElement("a");
          a.href = url;
          a.download = safeTitle.replace(/\s+/g, "-") + ".txt";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        className: "kl-action-btn",
        title: "Download this response as a text file"
      },
      "Download"
    )), hasStats && /* @__PURE__ */ React.createElement("div", { className: "kl-msg-footer" }, /* @__PURE__ */ React.createElement("div", { className: "kl-msg-stats" }, "Based on ", msg.provisionsCount || 0, " provision", msg.provisionsCount === 1 ? "" : "s", " and ", msg.casesCount || 0, " case", msg.casesCount === 1 ? "" : "s"))));
  }
  function MessageInput({ onSend, disabled, onFileSelect, pulseUpload, onInputChange, nexusState, tier, prefersReducedMotion }) {
    const [value, setValue] = useState("");
    const fileInputRef = useRef(null);
    const textInputRef = useRef(null);
    useEffect(function() {
      function onSeed(e) {
        var text2 = e && e.detail && e.detail.text;
        if (typeof text2 !== "string" || !text2) return;
        setValue(text2);
        if (typeof onInputChange === "function") onInputChange(text2.trim().length);
        if (textInputRef.current) {
          try {
            textInputRef.current.focus();
          } catch (err) {
          }
        }
      }
      window.addEventListener("kl-seed-input", onSeed);
      return function() {
        window.removeEventListener("kl-seed-input", onSeed);
      };
    }, [onInputChange]);
    function handleChange(e) {
      var v = e.target.value;
      setValue(v);
      if (typeof onInputChange === "function") onInputChange(v.trim().length);
    }
    function submit() {
      const text2 = value.trim();
      if (!text2 || disabled) return;
      onSend(text2);
      setValue("");
      if (typeof onInputChange === "function") onInputChange(0);
    }
    function onKey(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    }
    function onPaperclipClick() {
      if (fileInputRef.current) fileInputRef.current.click();
    }
    return /* @__PURE__ */ React.createElement("div", { className: "kl-input-bar" }, onFileSelect && /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "file",
        ref: fileInputRef,
        accept: ".pdf,.docx,.doc,.txt",
        style: { display: "none" },
        onChange: onFileSelect
      }
    ), onFileSelect && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onPaperclipClick,
        title: "Upload a contract for compliance analysis",
        "aria-label": "Upload a contract for compliance analysis",
        style: {
          background: "rgba(14,165,233,0.08)",
          border: "1px solid rgba(14,165,233,0.2)",
          borderRadius: "8px",
          cursor: "pointer",
          padding: "6px 10px",
          color: "#0EA5E9",
          fontSize: "13px",
          fontWeight: 500,
          fontFamily: "'DM Sans', sans-serif",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap",
          flexShrink: 0,
          animation: pulseUpload ? "kl-pulse 1.5s ease-in-out 3" : "none"
        }
      },
      /* @__PURE__ */ React.createElement(
        "svg",
        {
          width: "16",
          height: "16",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "2",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": "true"
        },
        /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
        /* @__PURE__ */ React.createElement("polyline", { points: "17 8 12 3 7 8" }),
        /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })
      ),
      /* @__PURE__ */ React.createElement("span", null, "Upload contract")
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: textInputRef,
        className: "kl-input",
        type: "text",
        placeholder: "Ask Eileen anything about UK employment law...",
        "aria-label": "Message Eileen",
        value,
        onChange: handleChange,
        onKeyDown: onKey,
        disabled
      }
    ), /* @__PURE__ */ React.createElement(
      NexusSendButton,
      {
        size: 38,
        nexusState: nexusState || "dormant",
        disabled: disabled || !value.trim(),
        onClick: submit,
        prefersReducedMotion,
        tier: tier || window.__klTier || "kl"
      }
    ));
  }
  function ConversationArea({ messages, isLoading, onSend, tier, onFileSelect, onRunAnalysis, onVaultOnly, floatingNexusExpanded, onToggleFloatingNexus, showQualifier, onUserTypeSelect, pulseUpload, nexusState, prefersReducedMotion, onInputChange, nearDomain, onDomainHover, onDomainLeave, hubMode, hubSession, matterRefreshKey }) {
    const scrollRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [messages, isLoading]);
    const empty = messages.length === 0;
    function onDragOver(e) {
      if (!onFileSelect) return;
      e.preventDefault();
      setIsDragging(true);
    }
    function onDragLeave(e) {
      if (!onFileSelect) return;
      e.preventDefault();
      setIsDragging(false);
    }
    function onDrop(e) {
      if (!onFileSelect) return;
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        onFileSelect({ target: { files } });
      }
    }
    const dragOverlay = isDragging && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          zIndex: 50,
          background: "rgba(14,165,233,0.08)",
          border: "2px dashed #0EA5E9",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { color: "#0EA5E9", fontSize: "16px", fontWeight: 500 } }, "Drop your contract here")
    );
    return /* @__PURE__ */ React.createElement("div", { className: "kl-main" }, empty ? /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "kl-welcome",
        style: { position: "relative" },
        onDragOver,
        onDragLeave,
        onDrop
      },
      dragOverlay,
      /* @__PURE__ */ React.createElement("div", { className: "kl-content-container" }, /* @__PURE__ */ React.createElement("div", { className: "kl-welcome-nexus" }, /* @__PURE__ */ React.createElement(CanonicalNexus, { size: 180, interactive: true, nexusState })), /* @__PURE__ */ React.createElement("h1", { className: "kl-welcome-greeting" }, "What can I help you with today?"), /* @__PURE__ */ React.createElement("div", { className: "kl-eileen-subtitle", style: {
        fontSize: "12px",
        color: "#64748B",
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.06em",
        marginBottom: "24px",
        textAlign: "center"
      } }, "Eileen \xB7 UK Employment Law Intelligence"), /* @__PURE__ */ React.createElement("div", { className: "kl-welcome-input" }, /* @__PURE__ */ React.createElement(MessageInput, { onSend, disabled: isLoading, onFileSelect, pulseUpload, onInputChange, nexusState, tier, prefersReducedMotion })), hubMode && hubSession && /* @__PURE__ */ React.createElement(HubMatterPanel, { hubSession, refreshKey: matterRefreshKey }), /* @__PURE__ */ React.createElement(HorizonAlert, null), /* @__PURE__ */ React.createElement(ForwardRail, null), /* @__PURE__ */ React.createElement("div", { className: "kl-domain-card-grid" }, DOMAINS.map(function(domain) {
        var navToDomain = function() {
          window.location.hash = "/domain/" + domain.slug;
        };
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: domain.id,
            type: "button",
            className: "kl-domain-card",
            "data-domain-slug": domain.slug,
            "aria-label": "Explore " + domain.name,
            onClick: navToDomain,
            onMouseEnter: function() {
              if (typeof onDomainHover === "function") onDomainHover(domain.slug);
            },
            onMouseLeave: function() {
              if (typeof onDomainLeave === "function") onDomainLeave();
            }
          },
          /* @__PURE__ */ React.createElement("span", { className: "kl-domain-card-head" }, /* @__PURE__ */ React.createElement("span", { className: "kl-domain-card-name" }, domain.name), /* @__PURE__ */ React.createElement("span", { className: "kl-domain-card-count" }, domain.subAreas.length, " topics")),
          /* @__PURE__ */ React.createElement("span", { className: "kl-domain-card-desc" }, domain.orientation),
          /* @__PURE__ */ React.createElement("span", { className: "kl-domain-card-explore" }, "Explore ", /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2192"))
        );
      })), /* @__PURE__ */ React.createElement(BookShelf, { onOpenBook: function(book) {
        if (typeof window.__klOpenPanel === "function") {
          window.__klOpenPanel("research");
          window.__klPendingInstrument = book.id;
          window.dispatchEvent(new CustomEvent("kl-open-instrument", { detail: { id: book.id } }));
        }
      } }))
    ) : /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "kl-conversation",
        style: { position: "relative" },
        onDragOver,
        onDragLeave,
        onDrop
      },
      dragOverlay,
      /* @__PURE__ */ React.createElement("div", { style: {
        position: "absolute",
        bottom: window.innerWidth <= 768 ? "100px" : "80px",
        right: "24px",
        zIndex: 30,
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none"
      } }, /* @__PURE__ */ React.createElement(CanonicalNexus, { size: 52, interactive: false, showRelationships: false, nexusState })),
      /* @__PURE__ */ React.createElement("div", { className: "kl-messages", ref: scrollRef, role: "log", "aria-live": "polite", onClick: function(e) {
        var target = e.target;
        if (target && target.classList && target.classList.contains("kl-ref-link")) {
          var instId = target.getAttribute("data-inst");
          if (instId && typeof window.__klOpenPanel === "function") {
            window.__klOpenPanel("research");
            window.__klPendingInstrument = instId;
            window.dispatchEvent(new CustomEvent("kl-open-instrument", { detail: { id: instId } }));
          }
        }
      } }, messages.map((m, i) => {
        if (m.role === "system_ui" && m.type === "contract_upload_prompt") {
          return /* @__PURE__ */ React.createElement(ContractUploadPrompt, { key: i, onUpload: function() {
            var fileInput = document.querySelector('.kl-conversation-input input[type="file"]') || document.querySelector('.kl-welcome-input input[type="file"]');
            if (fileInput) fileInput.click();
          } });
        }
        if (m.isError) {
          return /* @__PURE__ */ React.createElement(EileenErrorMessage, { key: i, message: m.errorMessage || m.content, retryAction: m.retryAction, retryLabel: m.retryLabel });
        }
        return /* @__PURE__ */ React.createElement(MessageBubble, { key: i, msg: m, onRunAnalysis, onVaultOnly });
      }), showQualifier && /* @__PURE__ */ React.createElement(QualifyingQuestion, { onSelect: onUserTypeSelect }), isLoading && /* @__PURE__ */ React.createElement(TypingIndicator, null)),
      hubMode && hubSession && /* @__PURE__ */ React.createElement(HubMatterPanel, { hubSession, refreshKey: matterRefreshKey }),
      /* @__PURE__ */ React.createElement("div", { className: "kl-conversation-input" }, /* @__PURE__ */ React.createElement(MessageInput, { onSend, disabled: isLoading, onFileSelect, pulseUpload, onInputChange, nexusState, tier, prefersReducedMotion }))
    ));
  }
  async function loadRegulatoryFeed() {
    if (!window.__klToken) return [];
    try {
      var now = /* @__PURE__ */ new Date();
      var past = new Date(now);
      past.setDate(past.getDate() - 90);
      var future = new Date(now);
      future.setDate(future.getDate() + 90);
      var resp = await fetch(
        SUPABASE_URL + "/rest/v1/regulatory_requirements?effective_from=gte." + past.toISOString().split("T")[0] + "&effective_from=lte." + future.toISOString().split("T")[0] + "&select=id,requirement_name,statutory_basis,effective_from,commencement_status,is_forward_requirement,source_act&order=effective_from.desc&limit=20",
        { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
      );
      var data = await resp.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error("Regulatory feed failed:", e);
      return [];
    }
  }
  function RegulatoryFeedItem({ item, onDiscuss }) {
    var _exp = useState(false);
    var expanded = _exp[0];
    var setExpanded = _exp[1];
    var now = /* @__PURE__ */ new Date();
    var effectiveDate = new Date(item.effective_from);
    var isPast = effectiveDate <= now;
    var daysAway = Math.ceil((effectiveDate - now) / (1e3 * 60 * 60 * 24));
    var badgeColor = isPast ? "#10B981" : daysAway <= 30 ? "#EF4444" : "#D97706";
    var badgeText = isPast ? "In force" : daysAway + " days";
    return /* @__PURE__ */ React.createElement("div", { "data-feed-id": item.id, style: { padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: function() {
          setExpanded(!expanded);
        },
        style: { cursor: "pointer" },
        role: "button",
        tabIndex: 0,
        onKeyDown: function(e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        },
        "aria-expanded": expanded
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" } }, /* @__PURE__ */ React.createElement("span", { style: {
        fontSize: "10px",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        color: badgeColor,
        background: badgeColor + "15",
        padding: "2px 6px",
        borderRadius: "4px",
        whiteSpace: "nowrap"
      } }, badgeText), /* @__PURE__ */ React.createElement("span", { style: {
        color: "#E2E8F0",
        fontSize: "12px",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        flex: 1,
        minWidth: 0
      } }, item.requirement_name)),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#0EA5E9", fontSize: "10px", fontFamily: "'DM Mono', monospace" } }, item.source_act), /* @__PURE__ */ React.createElement("span", { style: { color: "#64748B", fontSize: "10px" } }, effectiveDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })))
    ), expanded && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.04)" } }, /* @__PURE__ */ React.createElement("p", { style: {
      color: "#CBD5E1",
      fontSize: "11px",
      fontFamily: "'DM Sans', sans-serif",
      lineHeight: 1.5,
      margin: "0 0 8px"
    } }, item.statutory_basis), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: function(e) {
          e.stopPropagation();
          onDiscuss(item);
        },
        style: {
          background: "transparent",
          border: "1px solid #0EA5E9",
          color: "#0EA5E9",
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "11px",
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer"
        }
      },
      "Discuss with Eileen"
    )));
  }
  function klVaultNavButton(key, label) {
    return React.createElement("button", {
      key,
      type: "button",
      onClick: function() {
        window.location.href = "/knowledge-library/vault/";
      },
      "aria-label": label,
      style: {
        width: "100%",
        textAlign: "left",
        display: "block",
        background: "transparent",
        border: "none",
        borderLeft: "2px solid transparent",
        color: "#94A3B8",
        cursor: "pointer",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "13px",
        padding: "8px 16px"
      }
    }, label);
  }
  function Sidebar({ open, sessionHistory, activeSessionId, onSelectSession, onNewChat, onCrownQuery, nexusState, prefersReducedMotion, lang, hubChrome, currentFacet, onSelectFacet, hubSession, hasKLSession, hasSubscription }) {
    var _historyOpen = useState(false);
    var historyOpen = _historyOpen[0];
    var setHistoryOpen = _historyOpen[1];
    var _calUnread = useState(false);
    var calUnread = _calUnread[0];
    var setCalUnread = _calUnread[1];
    var _feed = useState([]);
    var feedItems = _feed[0];
    var setFeedItems = _feed[1];
    var _feedExpanded = useState(false);
    var feedExpanded = _feedExpanded[0];
    var setFeedExpanded = _feedExpanded[1];
    useEffect(function() {
      if (hubChrome) return;
      var cancelled = false;
      loadRegulatoryFeed().then(function(items) {
        if (!cancelled) setFeedItems(items);
      });
      return function() {
        cancelled = true;
      };
    }, [hubChrome]);
    useEffect(function() {
      if (!hubChrome || !hubSession || !hubSession.sb || !hubSession.sb.from) return;
      var alive = true;
      var sb = hubSession.sb;
      function readAck() {
        return sb.from("kl_user_preferences").select("preferences").eq("user_id", hubSession.userId).limit(1).then(function(res) {
          var p = !res.error && res.data && res.data[0] && res.data[0].preferences || {};
          var seen = p.calendar_seen_max || null;
          var viewed = p.calendar_last_viewed || null;
          if (!seen) {
            try {
              seen = localStorage.getItem("ailane_calendar_seen_max");
            } catch (e) {
            }
          }
          if (!viewed) {
            try {
              viewed = localStorage.getItem("ailane_calendar_last_viewed");
            } catch (e) {
            }
          }
          return { seen, viewed };
        }).catch(function() {
          var seen = null, viewed = null;
          try {
            seen = localStorage.getItem("ailane_calendar_seen_max");
            viewed = localStorage.getItem("ailane_calendar_last_viewed");
          } catch (e) {
          }
          return { seen, viewed };
        });
      }
      Promise.all([
        sb.from("v_kl_calendar_feed").select("event_date").neq("feed", "client").order("event_date", { ascending: false }).limit(1).then(function(res) {
          return !res.error && res.data && res.data[0] ? res.data[0].event_date : null;
        }).catch(function() {
          return null;
        }),
        readAck()
      ]).then(function(r) {
        if (!alive) return;
        var newest = r[0] ? String(r[0]).slice(0, 10) : null;
        if (!newest) {
          setCalUnread(false);
          return;
        }
        var ack = r[1] || {};
        var unread;
        if (ack.seen) {
          unread = newest > String(ack.seen).slice(0, 10);
        } else if (ack.viewed) {
          var nt = new Date(newest).getTime();
          var vt = new Date(ack.viewed).getTime();
          unread = isNaN(nt) || isNaN(vt) ? true : nt > vt;
        } else {
          unread = true;
        }
        setCalUnread(!!unread);
      }).catch(function() {
      });
      return function() {
        alive = false;
      };
    }, [hubChrome, hubSession]);
    return React.createElement(
      "nav",
      { className: "kl-sidebar" + (open ? "" : " collapsed"), role: "navigation", "aria-label": "Conversation history" },
      // §5 — Sidebar Nexus indicator (20px, shows Eileen's current state)
      React.createElement(
        "div",
        {
          style: { display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }
        },
        React.createElement(EileenStaticDot, null),
        React.createElement("span", {
          style: { color: "#94A3B8", fontSize: "11px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }
        }, "Eileen")
      ),
      React.createElement(
        "div",
        { className: "kl-sidebar-section" },
        React.createElement(
          "button",
          { className: "kl-new-chat-btn", onClick: onNewChat },
          React.createElement(
            "svg",
            { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.25", strokeLinecap: "round", strokeLinejoin: "round" },
            React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }),
            React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })
          ),
          React.createElement("span", null, "New Conversation")
        )
      ),
      // OOX-001 INTELLIGENCE-FOLD §1.1 + OOX-CARDS §1.1: this middle scroll panel is
      // PUBLIC-KL ONLY. In the gated hub chrome — hub mode OR operational mode
      // (hubChrome) — the "Regulatory Intelligence" feed is removed (its in-force
      // statutory catalogue now lives inside the Intelligence facet — §1.2) and the
      // "Your workspace" facet rail occupies the scroll area instead. Public KL (neither
      // flag): the feed below is unchanged. The rail keeps Eileen / New Conversation /
      // workspace / History.
      hubChrome ? React.createElement(
        "div",
        {
          style: { flex: 1, overflowY: "auto", minHeight: 0, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 0" }
        },
        React.createElement("div", {
          style: { color: "#64748B", fontSize: "10px", fontFamily: "'DM Mono', monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", padding: "8px 16px" }
        }, "Your workspace"),
        HUB_WORKSPACE_FACETS.map(function(f) {
          var active = currentFacet === f.id;
          var href = f.href;
          if (f.id === "vault" && hasKLSession && !hasSubscription) href = "/knowledge-library/vault/";
          return React.createElement("button", {
            key: f.id,
            type: "button",
            onClick: function() {
              if (href) {
                window.location.href = href;
                return;
              }
              onSelectFacet(active ? null : f.id);
            },
            "aria-pressed": active,
            style: {
              width: "100%",
              textAlign: "left",
              display: "block",
              background: active ? "rgba(14,165,233,0.12)" : "transparent",
              border: "none",
              borderLeft: active ? "2px solid #0EA5E9" : "2px solid transparent",
              color: active ? "#F1F5F9" : "#94A3B8",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              padding: "8px 16px"
            }
          }, [
            React.createElement("span", { key: "lbl" }, f.label),
            // OOX-001 CALENDAR-PAGE-001 §1.10 — new-events dot on the Calendar nav item.
            f.id === "calendar" && calUnread ? React.createElement("span", {
              key: "badge",
              title: "New dates",
              "aria-label": "New dates",
              style: {
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#22d3ee",
                marginLeft: "8px",
                verticalAlign: "middle",
                boxShadow: "0 0 6px rgba(34,211,238,0.6)"
              }
            }) : null
          ]);
        }),
        // KL-VAULT-INTEGRATION-001 §2.3 (branch 1) — a subscription holder who ALSO holds
        // an active KL pass gets a visible secondary link to their KL session vault, in
        // addition to the (unchanged) Operational Document Vault above.
        hasKLSession ? klVaultNavButton("kl-session-vault", "Knowledge Library session vault") : null
      ) : React.createElement(
        "div",
        { style: { flex: 1, overflowY: "auto", minHeight: 0 } },
        // KL-VAULT-INTEGRATION-001 §2.3 (branch 2) — a KL-only pass holder (no subscription,
        // active KL session) is no longer orphaned: their Documents nav routes to their own
        // session vault. Public KL users (no pass) see no change (branch 3).
        hasKLSession && !hasSubscription ? React.createElement(
          "div",
          { style: { marginTop: "12px" } },
          React.createElement("div", {
            style: {
              color: "#64748B",
              fontSize: "10px",
              fontFamily: "'DM Mono', monospace",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "8px 16px"
            }
          }, "Your workspace"),
          klVaultNavButton("kl-only-documents", "Documents")
        ) : null,
        React.createElement(
          "div",
          { style: { marginTop: "12px" } },
          React.createElement("div", {
            style: {
              color: "#64748B",
              fontSize: "10px",
              fontFamily: "'DM Mono', monospace",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "8px 16px"
            }
          }, "Regulatory Intelligence"),
          feedItems.length === 0 ? React.createElement("div", {
            style: { padding: "8px 16px", color: "#475569", fontSize: "11px" }
          }, "No recent regulatory events") : (function() {
            var display = feedExpanded ? feedItems : feedItems.slice(0, 3);
            var rendered = display.map(function(item, i) {
              return React.createElement(RegulatoryFeedItem, {
                key: item.id || i,
                item,
                // AMD-050 §3.3 + KLUX-001 Art. 5: seed the input, do NOT auto-send.
                onDiscuss: function(it) {
                  var seed = "Tell me about " + (it.requirement_name || "this regulatory event") + (it.source_act ? " under " + it.source_act : "") + " and what it means for employers.";
                  if (typeof window.__klSeedInput === "function") {
                    window.__klSeedInput(seed);
                  } else if (typeof onCrownQuery === "function") {
                    onCrownQuery(seed);
                  }
                }
              });
            });
            if (feedItems.length > 3) {
              rendered.push(React.createElement(
                "button",
                {
                  key: "__feed-toggle",
                  type: "button",
                  onClick: function() {
                    setFeedExpanded(!feedExpanded);
                  },
                  style: {
                    width: "100%",
                    padding: "8px 16px",
                    marginTop: "4px",
                    background: "transparent",
                    border: "none",
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    color: "#0EA5E9",
                    fontSize: "11px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 500,
                    textAlign: "left",
                    cursor: "pointer"
                  },
                  "aria-expanded": feedExpanded
                },
                feedExpanded ? "\u25B2 Show fewer" : "\u25BC Show all regulatory events (" + feedItems.length + ")"
              ));
            }
            return rendered;
          })()
        )
      ),
      React.createElement(
        "div",
        { style: { flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.06)" } },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: function() {
              setHistoryOpen(!historyOpen);
            },
            style: {
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              background: "transparent",
              border: "none",
              color: "#64748B",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.06em",
              textTransform: "uppercase"
            }
          },
          React.createElement("span", null, "History (" + sessionHistory.length + ")"),
          React.createElement("span", {
            style: { fontSize: "9px", transition: "transform 0.15s", transform: historyOpen ? "rotate(180deg)" : "rotate(0)" }
          }, "\u25BC")
        ),
        historyOpen && React.createElement(
          "div",
          {
            style: { maxHeight: "240px", overflowY: "auto", padding: "0 8px 8px" }
          },
          sessionHistory.length === 0 ? React.createElement("div", { className: "kl-sidebar-empty" }, "No prior conversations") : groupSessionsByTime(sessionHistory).map(function(group) {
            return React.createElement(
              React.Fragment,
              { key: group.label },
              React.createElement("div", {
                style: {
                  fontSize: "9px",
                  fontWeight: 500,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "8px 10px 3px",
                  fontFamily: "'DM Mono', monospace"
                }
              }, group.label),
              group.items.map(function(s) {
                return React.createElement(
                  "button",
                  {
                    key: s.sessionId,
                    className: "kl-history-item" + (s.sessionId === activeSessionId ? " active" : ""),
                    onClick: function() {
                      onSelectSession(s.sessionId);
                    }
                  },
                  React.createElement("div", { className: "kl-history-title" }, truncate(s.title, 40)),
                  React.createElement("div", { className: "kl-history-time" }, formatRelativeTime(s.lastActivity))
                );
              })
            );
          })
        )
      )
    );
  }
  function SessionCountdown({ expiresAt, onExpired }) {
    const [remaining, setRemaining] = useState("");
    const [isUrgent, setIsUrgent] = useState(false);
    const firedRef = useRef(false);
    useEffect(() => {
      firedRef.current = false;
      if (!expiresAt) return void 0;
      const expiry = new Date(expiresAt).getTime();
      if (isNaN(expiry)) return void 0;
      function tick() {
        const diff = expiry - Date.now();
        if (diff <= 0) {
          setRemaining("Expired");
          setIsUrgent(true);
          if (!firedRef.current && typeof onExpired === "function") {
            firedRef.current = true;
            onExpired();
          }
          return false;
        }
        const totalSecs = Math.floor(diff / 1e3);
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor(totalSecs % 3600 / 60);
        const secs = totalSecs % 60;
        const label = hours > 0 ? hours + "h " + String(mins).padStart(2, "0") + "m" : mins + "m " + String(secs).padStart(2, "0") + "s";
        setRemaining(label);
        setIsUrgent(diff < 15 * 60 * 1e3);
        return true;
      }
      if (!tick()) return void 0;
      const interval = setInterval(() => {
        if (!tick()) clearInterval(interval);
      }, 1e3);
      return () => clearInterval(interval);
    }, [expiresAt, onExpired]);
    if (!expiresAt) return null;
    return /* @__PURE__ */ React.createElement("span", { className: "kl-session-countdown" + (isUrgent ? " urgent" : ""), title: "Time remaining in this session" }, /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u23F1"), /* @__PURE__ */ React.createElement("span", { className: "kl-session-countdown-time" }, remaining));
  }
  function ExpiredModal() {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-expired-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "kl-expired-title" }, /* @__PURE__ */ React.createElement("div", { className: "kl-expired-backdrop", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("div", { className: "kl-expired-content" }, /* @__PURE__ */ React.createElement("h2", { id: "kl-expired-title", className: "kl-expired-title" }, "Session expired"), /* @__PURE__ */ React.createElement("p", { className: "kl-expired-body" }, "Your Knowledge Library session has ended. Purchase a new session to continue your research."), /* @__PURE__ */ React.createElement("a", { className: "kl-expired-cta", href: "/knowledge-library-preview/" }, "Get a new session")));
  }
  function MobileSidebarBackdrop({ onClick }) {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-sidebar-backdrop", onClick, "aria-hidden": "true" });
  }
  function klOrgTierBadge(orgTier) {
    switch (orgTier) {
      case "operational_readiness":
      case "operational":
        return { label: "Operational", cls: "kl-badge-operational" };
      case "governance":
        return { label: "Governance", cls: "kl-badge-governance" };
      case "institutional":
      case "enterprise":
        return { label: orgTier === "institutional" ? "Institutional" : "Enterprise", cls: "kl-badge-enterprise" };
      default:
        if (!orgTier) return { label: "Operational", cls: "kl-badge-operational" };
        return {
          label: String(orgTier).replace(/[_-]+/g, " ").replace(/\b\w/g, function(c) {
            return c.toUpperCase();
          }),
          cls: "kl-badge-operational"
        };
    }
  }
  function TopBar({ sidebarOpen, onToggleSidebar, accessType, tier, sessionExpiresAt, onSessionExpired, lang, onToggleLang, operationalMode, orgTier, hubSession }) {
    let badgeLabel = "KNOWLEDGE LIBRARY";
    let badgeClass = "kl-badge-per-session";
    if (operationalMode) {
      var ob = klOrgTierBadge(orgTier);
      badgeLabel = ob.label;
      badgeClass = ob.cls;
    } else if (accessType === "subscription") {
      if (tier === "operational_readiness") {
        badgeLabel = "OPERATIONAL";
        badgeClass = "kl-badge-operational";
      } else if (tier === "governance") {
        badgeLabel = "GOVERNANCE";
        badgeClass = "kl-badge-governance";
      } else if (tier === "enterprise" || tier === "institutional") {
        badgeLabel = "ENTERPRISE";
        badgeClass = "kl-badge-enterprise";
      }
    } else if (accessType === "per_session") {
      badgeLabel = "PER-SESSION";
    }
    var brandLabel = operationalMode ? "Ailane Operational" : "AILANE Knowledge Library";
    var brandHref = operationalMode ? "/operational/" : "/";
    return /* @__PURE__ */ React.createElement("div", { className: "kl-topbar" }, /* @__PURE__ */ React.createElement("button", { className: "kl-topbar-toggle", onClick: onToggleSidebar, "aria-label": sidebarOpen ? "Collapse sidebar" : "Expand sidebar" }, /* @__PURE__ */ React.createElement("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "12", x2: "21", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "6", x2: "21", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "18", x2: "21", y2: "18" }))), /* @__PURE__ */ React.createElement(
      "a",
      {
        className: "kl-topbar-title",
        href: brandHref,
        style: {
          color: "#22D3EE",
          textDecoration: "none",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: "16px",
          cursor: "pointer"
        }
      },
      brandLabel
    ), /* @__PURE__ */ React.createElement("div", { className: "kl-topbar-right" }, hubSession && /* @__PURE__ */ React.createElement(HubNotifBell, { hubSession }), accessType === "per_session" && sessionExpiresAt && /* @__PURE__ */ React.createElement(SessionCountdown, { expiresAt: sessionExpiresAt, onExpired: onSessionExpired }), onToggleLang && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: onToggleLang,
        className: "kl-lang-toggle",
        title: lang === "en" ? "Newid i Gymraeg" : "Switch to English",
        "aria-label": lang === "en" ? "Switch to Welsh" : "Switch to English",
        style: {
          background: "none",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: "6px",
          color: "#fff",
          padding: "4px 10px",
          fontSize: "13px",
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.5px",
          marginRight: "8px"
        }
      },
      lang === "en" ? "CY" : "EN"
    ), /* @__PURE__ */ React.createElement("span", { className: "kl-tier-badge " + badgeClass }, badgeLabel)));
  }
  var PANEL_DEFS = [
    // Primary group (AMD-044 §4.2)
    { id: "vault", label: "Document Vault", minTier: "operational_readiness", group: "primary" },
    { id: "notes", label: "Saved Items", minTier: null, group: "primary" },
    { id: "research", label: "Research", minTier: null, group: "primary" },
    // Secondary group — clipboard slot removed per AMD-044 §4
    { id: "calendar", label: "Calendar", minTier: "operational_readiness", group: "secondary" }
  ];
  function PanelIcon({ id }) {
    var iconProps = { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.75", strokeLinecap: "round", strokeLinejoin: "round" };
    if (id === "vault") {
      return React.createElement(
        "svg",
        iconProps,
        React.createElement("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
        React.createElement("polyline", { points: "14 2 14 8 20 8" }),
        React.createElement("line", { x1: "16", y1: "13", x2: "8", y2: "13" }),
        React.createElement("line", { x1: "16", y1: "17", x2: "8", y2: "17" })
      );
    }
    if (id === "notes") {
      return React.createElement(
        "svg",
        iconProps,
        React.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
        React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
      );
    }
    if (id === "research") {
      return React.createElement(
        "svg",
        iconProps,
        React.createElement("circle", { cx: "11", cy: "11", r: "8" }),
        React.createElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })
      );
    }
    if (id === "calendar") {
      return React.createElement(
        "svg",
        iconProps,
        React.createElement("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
        React.createElement("line", { x1: "16", y1: "2", x2: "16", y2: "6" }),
        React.createElement("line", { x1: "8", y1: "2", x2: "8", y2: "6" }),
        React.createElement("line", { x1: "3", y1: "10", x2: "21", y2: "10" })
      );
    }
    return React.createElement("span", { style: { fontSize: "18px" } }, "?");
  }
  var TIER_RANK = {
    loading: 1,
    per_session: 0,
    kl_quick_session: 0,
    kl_day_pass: 0,
    kl_research_week: 0,
    operational_readiness: 1,
    governance: 2,
    enterprise: 3,
    institutional: 3
    /* AMD-123 G-4.1 transitional alias */
  };
  function PanelRail({ activePanel, onSelectPanel, accessType, tier, hubMode }) {
    var userRank = TIER_RANK[tier] != null ? TIER_RANK[tier] : TIER_RANK[accessType] != null ? TIER_RANK[accessType] : 0;
    var defs = hubMode ? PANEL_DEFS.filter(function(p) {
      return p.id === "research";
    }) : PANEL_DEFS;
    var primaryPanels = defs.filter(function(p) {
      return p.group === "primary";
    });
    var secondaryPanels = defs.filter(function(p) {
      return p.group === "secondary";
    });
    function renderButton(p) {
      var minRank = p.minTier ? TIER_RANK[p.minTier] != null ? TIER_RANK[p.minTier] : 99 : 0;
      var locked = userRank < minRank;
      var isActive = activePanel === p.id;
      return React.createElement(
        "button",
        {
          key: p.id,
          type: "button",
          className: "kl-panel-rail-btn" + (isActive ? " active" : "") + (locked ? " locked" : ""),
          title: locked ? p.label + " (upgrade required)" : p.label,
          "aria-label": p.label,
          "aria-pressed": isActive,
          disabled: locked,
          onClick: function() {
            if (!locked) onSelectPanel(isActive ? null : p.id);
          }
        },
        React.createElement(PanelIcon, { id: p.id })
      );
    }
    return React.createElement(
      "div",
      { className: "kl-panelrail", role: "toolbar", "aria-label": "Workspace panels" },
      primaryPanels.map(renderButton),
      primaryPanels.length && secondaryPanels.length ? React.createElement("div", {
        className: "kl-panel-rail-divider",
        style: {
          width: "24px",
          height: "1px",
          background: "rgba(255,255,255,0.08)",
          margin: "4px 0"
        },
        "aria-hidden": "true"
      }) : null,
      secondaryPanels.map(renderButton)
    );
  }
  var NOTES_DISCLAIMER = "\n\n---\nThis content was exported from the Ailane Knowledge Library. It constitutes regulatory intelligence, not legal advice. For legal advice, consult a qualified employment solicitor. AI Lane Limited \xB7 Company No. 17035654 \xB7 ICO Reg. 00013389720 \xB7 ailane.ai/terms/";
  function noteTypeIcon(noteType) {
    if (noteType === "clip") return "\u{1F4CC}";
    if (noteType === "eileen_response") return "\u{1F4AC}";
    return "\u{1F4DD}";
  }
  function relativeTime(dateStr) {
    if (!dateStr) return "";
    var diff = Date.now() - new Date(dateStr).getTime();
    var mins = Math.floor(diff / 6e4);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.floor(hrs / 24);
    if (days < 7) return days + "d ago";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  function downloadNoteFile(note, format) {
    var safeTitle = (note.title || "note").replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/ +/g, "-");
    var content, mimeType, ext;
    if (format === "md") {
      content = "# " + (note.title || "Untitled Note") + "\n\n" + (note.content_plain || "") + NOTES_DISCLAIMER;
      mimeType = "text/markdown";
      ext = ".md";
    } else {
      content = (note.title || "Untitled Note") + "\n\n" + (note.content_plain || "") + NOTES_DISCLAIMER;
      mimeType = "text/plain;charset=utf-8";
      ext = ".txt";
    }
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = safeTitle + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function NotesPanel() {
    var _notes = useState([]);
    var notes = _notes[0];
    var setNotes = _notes[1];
    var _active = useState(null);
    var activeId = _active[0];
    var setActiveId = _active[1];
    var _activeNote = useState(null);
    var activeNote = _activeNote[0];
    var setActiveNote = _activeNote[1];
    var _title = useState("Untitled Note");
    var title = _title[0];
    var setTitle = _title[1];
    var _body = useState("");
    var body = _body[0];
    var setBody = _body[1];
    var _status = useState("loading");
    var status = _status[0];
    var setStatus = _status[1];
    var _filter = useState("all");
    var filter = _filter[0];
    var setFilter = _filter[1];
    var _editable = useState(false);
    var editable = _editable[0];
    var setEditable = _editable[1];
    var _confirmDelete = useState(null);
    var confirmDelete = _confirmDelete[0];
    var setConfirmDelete = _confirmDelete[1];
    var _downloadOpen = useState(false);
    var downloadOpen = _downloadOpen[0];
    var setDownloadOpen = _downloadOpen[1];
    var saveTimer = useRef(null);
    useEffect(function() {
      var cancelled = false;
      async function load() {
        if (!window.__klToken || !window.__klUserId) {
          setStatus("saved");
          return;
        }
        try {
          var resp = await fetch(
            SUPABASE_URL + "/rest/v1/kl_workspace_notes?user_id=eq." + window.__klUserId + "&order=pinned.desc,updated_at.desc&select=id,title,note_type,source_attribution,pinned,updated_at,content_plain",
            { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
          );
          var data = await resp.json();
          if (cancelled) return;
          if (Array.isArray(data)) {
            setNotes(data);
          }
          setStatus("saved");
        } catch (e) {
          console.error("Notes load failed:", e);
          if (!cancelled) setStatus("error");
        }
      }
      load();
      return function() {
        cancelled = true;
        if (saveTimer.current) clearTimeout(saveTimer.current);
      };
    }, []);
    useEffect(function() {
      window.__klNotesRefresh = function(newNote2) {
        if (newNote2) {
          setNotes(function(prev) {
            return [newNote2].concat(prev);
          });
        }
      };
      return function() {
        delete window.__klNotesRefresh;
      };
    }, []);
    function selectNote(note) {
      setActiveId(note.id);
      setActiveNote(note);
      setTitle(note.title || "Untitled Note");
      setBody(note.content_plain || "");
      setStatus("saved");
      setEditable(note.note_type === "note" || !note.note_type);
      setDownloadOpen(false);
      if (window.__klToken) {
        fetch(
          SUPABASE_URL + "/rest/v1/kl_workspace_notes?id=eq." + note.id + "&select=*",
          { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
        ).then(function(r) {
          return r.json();
        }).then(function(d) {
          if (Array.isArray(d) && d[0]) {
            setBody(d[0].content_plain || "");
            setTitle(d[0].title || "Untitled Note");
            setActiveNote(d[0]);
          }
        }).catch(function() {
        });
      }
    }
    function newNote() {
      if (!window.__klToken || !window.__klUserId) return;
      var dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      var newTitle = "Untitled Note \u2014 " + dateStr;
      fetch(SUPABASE_URL + "/rest/v1/kl_workspace_notes", {
        method: "POST",
        headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify({ user_id: window.__klUserId, project_id: null, title: newTitle, content_plain: "", note_type: "note" })
      }).then(function(r) {
        return r.json();
      }).then(function(d) {
        if (Array.isArray(d) && d[0]) {
          setNotes(function(prev) {
            return [d[0]].concat(prev);
          });
          selectNote(d[0]);
          setEditable(true);
        }
      }).catch(function(e) {
        console.error("Create note failed:", e);
      });
    }
    async function performSave(nextTitle, nextBody, currentId) {
      if (!window.__klToken || !window.__klUserId || !currentId) return;
      setStatus("saving");
      var now = (/* @__PURE__ */ new Date()).toISOString();
      try {
        var resp = await fetch(
          SUPABASE_URL + "/rest/v1/kl_workspace_notes?id=eq." + currentId,
          {
            method: "PATCH",
            headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
            body: JSON.stringify({ title: nextTitle || "Untitled Note", content_plain: nextBody, updated_at: now })
          }
        );
        if (!resp.ok) throw new Error("PATCH " + resp.status);
        setNotes(function(prev) {
          return prev.map(function(n) {
            return n.id === currentId ? Object.assign({}, n, { title: nextTitle, content_plain: nextBody, updated_at: now }) : n;
          });
        });
        setStatus("saved");
      } catch (e) {
        console.error("Notes save failed:", e);
        setStatus("error");
      }
    }
    function scheduleSave(nextTitle, nextBody) {
      setStatus("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(function() {
        performSave(nextTitle, nextBody, activeId);
      }, 3e3);
    }
    async function deleteNote(noteId) {
      if (!window.__klToken) return;
      try {
        await fetch(SUPABASE_URL + "/rest/v1/kl_workspace_notes?id=eq." + noteId, {
          method: "DELETE",
          headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY }
        });
        setNotes(function(prev) {
          return prev.filter(function(n) {
            return n.id !== noteId;
          });
        });
        if (activeId === noteId) {
          setActiveId(null);
          setActiveNote(null);
        }
        setConfirmDelete(null);
      } catch (e) {
        console.error("Delete failed:", e);
      }
    }
    var filteredNotes = notes.filter(function(n) {
      if (filter === "all") return true;
      if (filter === "note") return n.note_type === "note" || !n.note_type;
      if (filter === "clip") return n.note_type === "clip";
      if (filter === "eileen") return n.note_type === "eileen_response";
      return true;
    });
    var statusLabel = status === "loading" ? "Loading\u2026" : status === "dirty" ? "Unsaved changes" : status === "saving" ? "Saving\u2026" : status === "error" ? "Couldn\u2019t save \u2014 try again in a moment" : "\u2713 Saved";
    var statusColor = status === "saved" ? "#10B981" : status === "saving" ? "#F59E0B" : status === "error" ? "#EF4444" : "#94A3B8";
    var filterChips = ["all", "note", "clip", "eileen"];
    var filterLabels = { all: "All", note: "Notes", clip: "Clips", eileen: "Eileen" };
    var noteListView = React.createElement(
      "div",
      {
        style: {
          width: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          flex: 1
        }
      },
      // Filter chips row
      React.createElement(
        "div",
        { style: { display: "flex", gap: "4px", padding: "0 0 8px", flexWrap: "wrap" } },
        filterChips.map(function(f) {
          return React.createElement("button", {
            key: f,
            type: "button",
            onClick: function() {
              setFilter(f);
            },
            style: {
              padding: "3px 8px",
              borderRadius: "12px",
              fontSize: "10px",
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
              border: "none",
              background: filter === f ? "rgba(14,165,233,0.2)" : "rgba(255,255,255,0.04)",
              color: filter === f ? "#0EA5E9" : "#94A3B8",
              transition: "all 0.15s"
            }
          }, filterLabels[f]);
        })
      ),
      // New Note button
      React.createElement("button", {
        type: "button",
        onClick: newNote,
        style: {
          width: "100%",
          padding: "8px",
          borderRadius: "8px",
          background: "rgba(14,165,233,0.08)",
          border: "1px solid rgba(14,165,233,0.2)",
          color: "#0EA5E9",
          fontSize: "12px",
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px"
        }
      }, "+ New Note"),
      // Scrollable note list
      React.createElement(
        "div",
        { style: { flex: 1, overflowY: "auto", minHeight: 0 } },
        filteredNotes.length === 0 ? React.createElement(
          "div",
          { style: { color: "#64748B", fontSize: "12px", textAlign: "center", padding: "20px 4px" } },
          filter === "all" ? "No saved items yet." : "No " + filterLabels[filter].toLowerCase() + " found."
        ) : filteredNotes.map(function(n) {
          var isActive = activeId === n.id;
          return React.createElement(
            "div",
            {
              key: n.id,
              style: {
                padding: "8px",
                marginBottom: "4px",
                borderRadius: "6px",
                background: isActive ? "rgba(14,165,233,0.08)" : "rgba(255,255,255,0.02)",
                borderLeft: isActive ? "3px solid #0EA5E9" : "3px solid transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "flex-start",
                gap: "6px",
                transition: "all 0.15s"
              },
              onClick: function() {
                selectNote(n);
              }
            },
            // Type icon
            React.createElement("span", { style: { fontSize: "12px", flexShrink: 0, marginTop: "1px" } }, noteTypeIcon(n.note_type)),
            // Title + meta
            React.createElement(
              "div",
              { style: { minWidth: 0, flex: 1 } },
              React.createElement("div", { style: {
                color: isActive ? "#E2E8F0" : "#CBD5E1",
                fontSize: "12px",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              } }, (n.title || "Untitled Note").substring(0, 40)),
              React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" } },
                n.pinned ? React.createElement("span", { style: { fontSize: "9px" } }, "\u{1F4CC}") : null,
                React.createElement("span", { style: { color: "#64748B", fontSize: "10px", fontFamily: "'DM Mono', monospace" } }, relativeTime(n.updated_at))
              )
            ),
            // Delete button
            React.createElement("button", {
              type: "button",
              onClick: function(e) {
                e.stopPropagation();
                setConfirmDelete(n.id);
              },
              style: { background: "none", border: "none", color: "#64748B", fontSize: "12px", cursor: "pointer", padding: "0 2px", flexShrink: 0, opacity: 0.6 },
              title: "Delete",
              "aria-label": "Delete note"
            }, "\u2715")
          );
        })
      )
    );
    var deleteDialog = confirmDelete ? React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          background: "rgba(10,22,40,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      },
      React.createElement(
        "div",
        {
          style: {
            background: "#0F1D32",
            border: "1px solid #1E3A5F",
            borderRadius: "10px",
            padding: "20px",
            maxWidth: "260px",
            textAlign: "center"
          }
        },
        React.createElement("p", { style: { color: "#E2E8F0", fontSize: "13px", marginBottom: "14px" } }, "Delete this note?"),
        React.createElement(
          "div",
          { style: { display: "flex", gap: "8px", justifyContent: "center" } },
          React.createElement("button", {
            type: "button",
            onClick: function() {
              setConfirmDelete(null);
            },
            className: "kl-action-btn",
            style: { fontSize: "12px", padding: "6px 14px" }
          }, "Cancel"),
          React.createElement("button", {
            type: "button",
            onClick: function() {
              deleteNote(confirmDelete);
            },
            style: {
              fontSize: "12px",
              padding: "6px 14px",
              borderRadius: "4px",
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#EF4444",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif"
            }
          }, "Delete")
        )
      )
    ) : null;
    var editorView = null;
    if (activeId && activeNote) {
      var isReadOnly = (activeNote.note_type === "clip" || activeNote.note_type === "eileen_response") && !editable;
      editorView = React.createElement(
        "div",
        {
          className: "kl-notes-editor",
          style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }
        },
        // §W-G sticky action bar: Back · note title · Download
        React.createElement(
          "div",
          { className: "kl-notes-editor-bar" },
          React.createElement("button", {
            type: "button",
            onClick: function() {
              setActiveId(null);
              setActiveNote(null);
              setDownloadOpen(false);
            },
            style: {
              background: "none",
              border: "none",
              color: "#0EA5E9",
              fontSize: "12px",
              cursor: "pointer",
              padding: "4px 6px 4px 0",
              fontFamily: "'DM Sans', sans-serif",
              flexShrink: 0
            }
          }, "\u2190 Back"),
          // Note title — editable input, flexes between Back and Download
          React.createElement("input", {
            className: "kl-notes-title",
            type: "text",
            value: title,
            readOnly: isReadOnly,
            onChange: function(e) {
              if (isReadOnly) return;
              var v = e.target.value;
              setTitle(v);
              scheduleSave(v, body);
            },
            placeholder: "Untitled Note",
            style: Object.assign({ flex: 1, minWidth: 0 }, isReadOnly ? { opacity: 0.8 } : {})
          }),
          // Download button with dropdown
          React.createElement(
            "div",
            { style: { position: "relative", flexShrink: 0 } },
            React.createElement("button", {
              type: "button",
              onClick: function() {
                setDownloadOpen(!downloadOpen);
              },
              className: "kl-action-btn",
              title: "Download",
              style: { fontSize: "11px", padding: "3px 8px" }
            }, "\u2B07 Download"),
            downloadOpen ? React.createElement(
              "div",
              {
                style: {
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "4px",
                  background: "#0F1D32",
                  border: "1px solid #1E3A5F",
                  borderRadius: "6px",
                  padding: "4px 0",
                  zIndex: 20,
                  minWidth: "180px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
                }
              },
              React.createElement("button", {
                type: "button",
                onClick: function() {
                  downloadNoteFile({ title, content_plain: body }, "md");
                  setDownloadOpen(false);
                },
                style: {
                  display: "block",
                  width: "100%",
                  padding: "6px 12px",
                  background: "transparent",
                  border: "none",
                  color: "#E2E8F0",
                  fontSize: "12px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif"
                }
              }, "Download as Markdown (.md)"),
              React.createElement("button", {
                type: "button",
                onClick: function() {
                  downloadNoteFile({ title, content_plain: body }, "txt");
                  setDownloadOpen(false);
                },
                style: {
                  display: "block",
                  width: "100%",
                  padding: "6px 12px",
                  background: "transparent",
                  border: "none",
                  color: "#E2E8F0",
                  fontSize: "12px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif"
                }
              }, "Download as Text (.txt)"),
              React.createElement("div", { style: { height: "1px", background: "#1E3A5F", margin: "4px 0" } }),
              React.createElement("button", {
                type: "button",
                disabled: true,
                title: "Coming soon \u2014 requires server-side export",
                style: {
                  display: "block",
                  width: "100%",
                  padding: "6px 12px",
                  background: "transparent",
                  border: "none",
                  color: "#64748B",
                  fontSize: "12px",
                  textAlign: "left",
                  cursor: "not-allowed",
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: 0.5
                }
              }, "Download as PDF (.pdf)"),
              React.createElement("button", {
                type: "button",
                disabled: true,
                title: "Coming soon \u2014 requires server-side export",
                style: {
                  display: "block",
                  width: "100%",
                  padding: "6px 12px",
                  background: "transparent",
                  border: "none",
                  color: "#64748B",
                  fontSize: "12px",
                  textAlign: "left",
                  cursor: "not-allowed",
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: 0.5
                }
              }, "Download as DOCX (.docx)")
            ) : null
          )
        ),
        // Source attribution (for clips / eileen responses)
        activeNote.source_attribution ? React.createElement("div", {
          style: { color: "#64748B", fontSize: "11px", fontStyle: "italic", margin: "6px 0 0", fontFamily: "'DM Mono', monospace", flexShrink: 0 }
        }, activeNote.source_attribution) : null,
        // Status indicator + Email (greyed out) row
        React.createElement(
          "div",
          {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", margin: "6px 0", flexShrink: 0 }
          },
          React.createElement("span", {
            style: { fontSize: "10px", color: statusColor, fontFamily: "'DM Mono', monospace" }
          }, statusLabel),
          React.createElement("button", {
            type: "button",
            disabled: true,
            className: "kl-action-btn",
            title: "Coming soon \u2014 requires server-side export",
            style: { fontSize: "11px", padding: "3px 8px", opacity: 0.4, cursor: "not-allowed" }
          }, "\u2709 Email")
        ),
        // Edit button for read-only notes
        isReadOnly ? React.createElement("button", {
          type: "button",
          onClick: function() {
            setEditable(true);
          },
          className: "kl-action-btn",
          style: { fontSize: "11px", padding: "3px 8px", marginBottom: "6px", alignSelf: "flex-start", flexShrink: 0 }
        }, "\u270E Edit") : null,
        // Body editor / reader — internal scroll only
        React.createElement("textarea", {
          className: "kl-notes-body",
          value: body,
          readOnly: isReadOnly,
          onChange: function(e) {
            if (isReadOnly) return;
            var v = e.target.value;
            setBody(v);
            scheduleSave(title, v);
          },
          placeholder: "Take notes during your research...",
          style: Object.assign({ flex: 1, minHeight: 0 }, isReadOnly ? { opacity: 0.85 } : {})
        })
      );
    }
    return React.createElement(
      "div",
      {
        className: "kl-notes-panel",
        style: { display: "flex", flexDirection: "column", height: "100%", position: "relative", minHeight: 0 }
      },
      editorView ? editorView : noteListView,
      deleteDialog
    );
  }
  function VaultPanel() {
    return React.createElement(
      "div",
      { style: { padding: "12px", fontFamily: "'DM Sans', sans-serif" } },
      React.createElement(
        "div",
        { style: { fontSize: "14px", fontWeight: 600, color: "#F1F5F9", marginBottom: "8px" } },
        "The Document Vault has moved"
      ),
      React.createElement(
        "p",
        { style: { color: "#94A3B8", fontSize: "13px", lineHeight: 1.6, marginBottom: "14px" } },
        "Your documents, monitoring, exposure reports and Solicitors Preparation Bundles now live in the Documents Vault room."
      ),
      React.createElement("a", {
        href: "/operational/documents/",
        style: { display: "inline-block", background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.3)", color: "#0EA5E9", borderRadius: "8px", padding: "10px 16px", fontSize: "13px", fontWeight: 500, textDecoration: "none" }
      }, "Open the Documents Vault \u2192")
    );
  }
  function LiveIndicator({ generatedAt }) {
    var label = "Live";
    if (generatedAt) {
      var d = new Date(generatedAt);
      if (!isNaN(d.getTime())) {
        label = "Live \xB7 " + d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      }
    }
    return React.createElement(
      "span",
      {
        title: "Data from the live Knowledge Library feed",
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          fontSize: "10px",
          fontFamily: "'DM Mono', monospace",
          color: "#10B981",
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.25)",
          borderRadius: "10px",
          padding: "1px 8px",
          whiteSpace: "nowrap"
        }
      },
      React.createElement("span", {
        "aria-hidden": "true",
        style: { width: "5px", height: "5px", borderRadius: "50%", background: "#10B981", flexShrink: 0 }
      }),
      label
    );
  }
  function FreshnessBadge({ lastVerified, style }) {
    if (!lastVerified) return null;
    var d = new Date(lastVerified);
    if (isNaN(d.getTime())) return null;
    var days = Math.floor((Date.now() - d.getTime()) / 864e5);
    var dateLabel = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    var stale = days > 90;
    var color = stale ? "#D97706" : "#10B981";
    return React.createElement("span", {
      className: "kl-freshness-badge",
      title: stale ? "Last verified " + dateLabel + " \u2014 re-verification scheduled" : "Verified current as of " + dateLabel,
      style: Object.assign({
        fontSize: "10px",
        padding: "1px 6px",
        borderRadius: "3px",
        display: "inline-block",
        background: color + "15",
        color,
        whiteSpace: "nowrap"
      }, style || {})
    }, stale ? "Verified " + dateLabel + " \u2014 re-verification scheduled" : "Verified current \u2014 " + dateLabel);
  }
  var LIVE_FEED_COLOURS = {
    regulatory: "#0EA5E9",
    rates: "#10B981",
    horizon: "#D97706",
    client: "#8B5CF6"
  };
  var LIVE_FEED_LABELS = {
    regulatory: "Regulatory",
    rates: "Rates & limits",
    horizon: "Horizon",
    client: "My events"
  };
  function ForwardRail() {
    var _state = useState("loading");
    var railState = _state[0];
    var setRailState = _state[1];
    var _rows = useState([]);
    var rows = _rows[0];
    var setRows = _rows[1];
    var _gen = useState(null);
    var generatedAt = _gen[0];
    var setGeneratedAt = _gen[1];
    useEffect(function() {
      var cancelled = false;
      fetchLiveFeedSection("forward_rail").then(function(result) {
        if (cancelled) return;
        if (result.state !== "live") {
          setRailState("unavailable");
          return;
        }
        var data = __klLiveFeedRows(result.data) || [];
        var sorted = data.slice().sort(function(a, b) {
          return new Date(a.event_date || a.date || a.effective_from || 0) - new Date(b.event_date || b.date || b.effective_from || 0);
        });
        setRows(sorted);
        setGeneratedAt(result.generatedAt);
        setRailState("live");
      });
      return function() {
        cancelled = true;
      };
    }, []);
    if (railState === "loading") {
      return React.createElement("div", { className: "kl-forward-rail-note" }, "Loading coming-into-force feed\u2026");
    }
    if (railState === "unavailable") {
      return React.createElement(
        "div",
        { className: "kl-forward-rail-note" },
        "Coming into force \u2014 live feed not yet available"
      );
    }
    if (rows.length === 0) {
      return React.createElement(
        "div",
        { className: "kl-forward-rail-note" },
        "Coming into force \u2014 no upcoming items"
      );
    }
    return React.createElement(
      "div",
      {
        className: "kl-forward-rail-wrap",
        // §W-F D1: width inherited from .kl-content-container (no per-section cap)
        style: { width: "100%", marginBottom: "20px" }
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" } },
        React.createElement("span", {
          style: {
            fontSize: "10px",
            fontWeight: 500,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: "'DM Mono', monospace"
          }
        }, "Coming into force"),
        React.createElement(LiveIndicator, { generatedAt })
      ),
      React.createElement(
        "div",
        { className: "kl-forward-rail" },
        rows.slice(0, 12).map(function(row, i) {
          var dt = new Date(row.event_date || row.date || row.effective_from);
          var hasDate = !isNaN(dt.getTime());
          var colour = LIVE_FEED_COLOURS[row.feed] || LIVE_FEED_COLOURS.regulatory;
          var title = row.title || row.requirement_name || "Untitled item";
          return React.createElement(
            "div",
            { key: row.ref_id || i, className: "kl-forward-card" },
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" } },
              React.createElement("span", {
                "aria-hidden": "true",
                style: { width: "6px", height: "6px", borderRadius: "50%", background: colour, flexShrink: 0 }
              }),
              React.createElement("span", {
                style: { color: colour, fontSize: "10px", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }
              }, hasDate ? dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date TBC")
            ),
            React.createElement("div", {
              style: { color: "#E2E8F0", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, lineHeight: 1.4 }
            }, truncate(title, 90)),
            row.detail ? React.createElement("div", {
              style: { color: "#64748B", fontSize: "11px", lineHeight: 1.4, marginTop: "4px" }
            }, truncate(row.detail, 100)) : null,
            row.url ? React.createElement("a", {
              href: row.url,
              target: "_blank",
              rel: "noopener noreferrer",
              style: { fontSize: "10px", color: "#0EA5E9", textDecoration: "none", marginTop: "6px", display: "inline-block" }
            }, "\u2197 Source") : null
          );
        })
      )
    );
  }
  var DOMAIN_ACEI_HINTS = {
    "dismissal": ["Dismissal Procedures", "Unfair Dismissal", "Redundancy"],
    "discrimination": ["Discrimination"],
    "contracts": ["Working Arrangements", "Employment Documentation", "Pay & Compensation"],
    "family-leave": ["Family Leave"],
    "transfers": ["TUPE & Business Transfers"],
    "health-safety": ["Health & Safety"],
    "whistleblowing": ["Whistleblowing"],
    "data-monitoring": ["Data Protection", "Data Protection & Monitoring"]
  };
  function __klNormKey(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  function findTopicTile(tiles, domain) {
    if (!tiles || typeof tiles !== "object" || Array.isArray(tiles) || !domain) return null;
    var candidates = [domain.id, domain.slug, domain.name].concat(DOMAIN_ACEI_HINTS[domain.id] || []);
    var normCandidates = [];
    candidates.forEach(function(c) {
      var n = __klNormKey(c);
      if (n) normCandidates.push(n);
    });
    var keys = Object.keys(tiles);
    for (var i = 0; i < keys.length; i++) {
      if (normCandidates.indexOf(__klNormKey(keys[i])) !== -1) return tiles[keys[i]];
    }
    return null;
  }
  function TopicCurrencyStrip({ domain }) {
    var _state = useState("loading");
    var stripState = _state[0];
    var setStripState = _state[1];
    var _tile = useState(null);
    var tile = _tile[0];
    var setTile = _tile[1];
    var _gen = useState(null);
    var generatedAt = _gen[0];
    var setGeneratedAt = _gen[1];
    useEffect(function() {
      var cancelled = false;
      setStripState("loading");
      setTile(null);
      fetchLiveFeedSection("topic_tiles").then(function(result) {
        if (cancelled) return;
        if (result.state !== "live") {
          setStripState("unavailable");
          return;
        }
        var d = result.data;
        var tiles = d && (d.topic_tiles || d.tiles) || d;
        setTile(findTopicTile(tiles, domain));
        setGeneratedAt(result.generatedAt);
        setStripState("live");
      });
      return function() {
        cancelled = true;
      };
    }, [domain && domain.id]);
    var noteStyle = {
      fontSize: "11px",
      color: "#475569",
      fontFamily: "'DM Mono', monospace",
      margin: "0 0 28px"
    };
    if (stripState === "loading") {
      return React.createElement("div", { className: "kl-currency-note", style: noteStyle }, "Loading currency data\u2026");
    }
    if (stripState === "unavailable") {
      return React.createElement(
        "div",
        { className: "kl-currency-note", style: noteStyle },
        "Live currency data not yet available for this area"
      );
    }
    if (!tile) return null;
    var news = tile.latest_news || null;
    var range = tile.verified_range || null;
    var horizonOpen = tile.horizon_open;
    function fmtDate(v) {
      if (!v) return null;
      var d = new Date(v);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    }
    var rangeMin = range && fmtDate(range.min);
    var rangeMax = range && fmtDate(range.max);
    return React.createElement(
      "div",
      { className: "kl-currency-strip" },
      React.createElement(LiveIndicator, { generatedAt }),
      news && news.title ? React.createElement(
        "span",
        {
          style: { fontSize: "12px", color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", minWidth: 0 }
        },
        news.url ? React.createElement("a", {
          href: news.url,
          target: "_blank",
          rel: "noopener noreferrer",
          style: { color: "#0EA5E9", textDecoration: "none" }
        }, truncate(news.title, 80)) : truncate(news.title, 80),
        news.published_date && fmtDate(news.published_date) ? React.createElement("span", { style: { color: "#64748B", fontSize: "11px" } }, " \xB7 " + fmtDate(news.published_date)) : null
      ) : null,
      rangeMin && rangeMax ? React.createElement("span", {
        style: { fontSize: "11px", color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }
      }, "Provisions verified " + rangeMin + " \u2013 " + rangeMax) : null,
      horizonOpen != null ? React.createElement("span", {
        style: { fontSize: "11px", color: "#D97706", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }
      }, horizonOpen + " open horizon item" + (horizonOpen === 1 ? "" : "s")) : null
    );
  }
  function CalendarPanel() {
    var _reqs = useState([]);
    var reqs = _reqs[0];
    var setReqs = _reqs[1];
    var _loading = useState(true);
    var loading = _loading[0];
    var setLoading = _loading[1];
    var _filter = useState("all");
    var filter = _filter[0];
    var setFilter = _filter[1];
    var _expanded = useState({});
    var expanded = _expanded[0];
    var setExpanded = _expanded[1];
    var _liveState = useState("loading");
    var liveState = _liveState[0];
    var setLiveState = _liveState[1];
    var _liveRows = useState([]);
    var liveRows = _liveRows[0];
    var setLiveRows = _liveRows[1];
    var _generatedAt = useState(null);
    var generatedAt = _generatedAt[0];
    var setGeneratedAt = _generatedAt[1];
    var _view = useState("list");
    var view = _view[0];
    var setView = _view[1];
    var _monthCursor = useState(function() {
      var n = /* @__PURE__ */ new Date();
      return new Date(n.getFullYear(), n.getMonth(), 1);
    });
    var monthCursor = _monthCursor[0];
    var setMonthCursor = _monthCursor[1];
    var _feedsOn = useState({ regulatory: true, rates: true, horizon: true, client: true });
    var feedsOn = _feedsOn[0];
    var setFeedsOn = _feedsOn[1];
    var _selectedDay = useState(null);
    var selectedDay = _selectedDay[0];
    var setSelectedDay = _selectedDay[1];
    useEffect(function() {
      var cancelled = false;
      async function loadLegacy() {
        if (!window.__klToken) {
          if (!cancelled) setLoading(false);
          return;
        }
        try {
          var resp = await fetch(
            SUPABASE_URL + "/rest/v1/regulatory_requirements?select=id,requirement_name,statutory_basis,effective_from,commencement_status,is_forward_requirement,source_act&order=effective_from.asc",
            { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
          );
          var data = await resp.json();
          if (cancelled) return;
          if (Array.isArray(data)) setReqs(data);
        } catch (e) {
          console.error("Calendar load failed:", e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      fetchLiveFeedSection("calendar").then(function(result) {
        if (cancelled) return;
        if (result.state === "live") {
          var rows = __klLiveFeedRows(result.data) || [];
          setLiveRows(rows);
          setGeneratedAt(result.generatedAt);
          setLiveState("live");
          setLoading(false);
        } else {
          setLiveState("unavailable");
          loadLegacy();
        }
      });
      return function() {
        cancelled = true;
      };
    }, []);
    function evDateKey(value) {
      var s = String(value || "");
      var m = s.match(/^\d{4}-\d{2}-\d{2}/);
      if (m) return m[0];
      var d = new Date(s);
      if (isNaN(d.getTime())) return null;
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
    function feedKeyOf(row) {
      return LIVE_FEED_COLOURS[row.feed] ? row.feed : "regulatory";
    }
    function fmtDayLabel(key) {
      var d = /* @__PURE__ */ new Date(key + "T00:00:00");
      if (isNaN(d.getTime())) return key;
      return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    var filteredLive = liveRows.filter(function(r) {
      return feedsOn[feedKeyOf(r)] && evDateKey(r.event_date || r.date);
    });
    function toggleFeed(key) {
      setFeedsOn(function(prev) {
        var next = {};
        for (var k in prev) next[k] = prev[k];
        next[key] = !prev[key];
        return next;
      });
      setSelectedDay(null);
    }
    function renderLiveRow(row, idx) {
      var key = "live-" + (row.ref_id || idx) + "-" + idx;
      var isExpanded = !!expanded[key];
      var fk = feedKeyOf(row);
      var colour = LIVE_FEED_COLOURS[fk];
      var dateKey = evDateKey(row.event_date || row.date);
      var d = dateKey ? /* @__PURE__ */ new Date(dateKey + "T00:00:00") : null;
      var endKey = row.end_date ? evDateKey(row.end_date) : null;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key,
          onClick: function() {
            toggleExpand(key);
          },
          role: "button",
          tabIndex: 0,
          onKeyDown: function(e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleExpand(key);
            }
          },
          "aria-expanded": isExpanded,
          style: {
            display: "flex",
            gap: "12px",
            padding: "10px 0",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            cursor: "pointer"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: {
          minWidth: "44px",
          height: "44px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: colour + "15",
          borderRadius: "8px",
          flexShrink: 0
        } }, /* @__PURE__ */ React.createElement("span", { style: {
          color: colour,
          fontSize: "18px",
          fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif",
          lineHeight: 1
        } }, d ? d.getDate() : "\u2013"), /* @__PURE__ */ React.createElement("span", { style: {
          color: colour,
          fontSize: "9px",
          fontFamily: "'DM Mono', monospace",
          textTransform: "uppercase"
        } }, d ? d.toLocaleDateString("en-GB", { month: "short" }) : "")),
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: {
          color: "#E2E8F0",
          fontSize: "12px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500
        } }, row.title || "Untitled event"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "center", marginTop: "2px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: {
          color: colour,
          fontSize: "9px",
          fontFamily: "'DM Mono', monospace",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        } }, LIVE_FEED_LABELS[fk]), endKey && endKey !== dateKey && /* @__PURE__ */ React.createElement("span", { style: { color: "#64748B", fontSize: "10px", fontFamily: "'DM Mono', monospace" } }, "until " + (/* @__PURE__ */ new Date(endKey + "T00:00:00")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }))), isExpanded && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, row.detail && /* @__PURE__ */ React.createElement("p", { style: {
          color: "#CBD5E1",
          fontSize: "11px",
          lineHeight: 1.5,
          margin: "0 0 8px",
          fontFamily: "'DM Sans', sans-serif"
        } }, row.detail), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" } }, row.url && /* @__PURE__ */ React.createElement(
          "a",
          {
            href: row.url,
            target: "_blank",
            rel: "noopener noreferrer",
            onClick: function(e) {
              e.stopPropagation();
            },
            style: { fontSize: "11px", color: "#0EA5E9", textDecoration: "none" }
          },
          "\u2197 View source"
        ), row.ref_id && /* @__PURE__ */ React.createElement("span", { style: { fontSize: "10px", color: "#475569", fontFamily: "'DM Mono', monospace" } }, row.ref_id))))
      );
    }
    function renderMonthView() {
      var year = monthCursor.getFullYear();
      var month = monthCursor.getMonth();
      var firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
      var daysInMonth = new Date(year, month + 1, 0).getDate();
      var todayKey = evDateKey((/* @__PURE__ */ new Date()).toISOString());
      var byDay = {};
      filteredLive.forEach(function(r) {
        var k = evDateKey(r.event_date || r.date);
        if (!k) return;
        if (!byDay[k]) byDay[k] = [];
        byDay[k].push(r);
      });
      var cells = [];
      for (var b = 0; b < firstWeekday; b++) cells.push(null);
      for (var day = 1; day <= daysInMonth; day++) cells.push(day);
      var monthLabel = monthCursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      function navBtnStyle() {
        return {
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "6px",
          color: "#94A3B8",
          fontSize: "12px",
          padding: "4px 10px",
          cursor: "pointer",
          fontFamily: "inherit",
          minHeight: "32px"
        };
      }
      return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "kl-cal-viewbtn",
          "aria-label": "Previous month",
          onClick: function() {
            setMonthCursor(new Date(year, month - 1, 1));
            setSelectedDay(null);
          },
          style: navBtnStyle()
        },
        "\u2039"
      ), /* @__PURE__ */ React.createElement("span", { style: { color: "#E2E8F0", fontSize: "13px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" } }, monthLabel), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "kl-cal-viewbtn",
          "aria-label": "Next month",
          onClick: function() {
            setMonthCursor(new Date(year, month + 1, 1));
            setSelectedDay(null);
          },
          style: navBtnStyle()
        },
        "\u203A"
      )), /* @__PURE__ */ React.createElement("div", { className: "kl-cal-grid", style: { marginBottom: "4px" } }, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(function(wd) {
        return /* @__PURE__ */ React.createElement("div", { key: wd, style: {
          textAlign: "center",
          color: "#475569",
          fontSize: "9px",
          fontFamily: "'DM Mono', monospace",
          textTransform: "uppercase",
          padding: "2px 0"
        } }, wd);
      })), /* @__PURE__ */ React.createElement("div", { className: "kl-cal-grid" }, cells.map(function(day2, i) {
        if (day2 === null) return /* @__PURE__ */ React.createElement("div", { key: "b" + i, className: "kl-cal-cell", "aria-hidden": "true" });
        var key = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day2).padStart(2, "0");
        var events = byDay[key] || [];
        var feedsHere = [];
        events.forEach(function(r) {
          var fk = feedKeyOf(r);
          if (feedsHere.indexOf(fk) === -1) feedsHere.push(fk);
        });
        var isToday = key === todayKey;
        var isSelected = key === selectedDay;
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key,
            className: "kl-cal-cell" + (events.length ? " has-events" : "") + (isSelected ? " selected" : ""),
            role: events.length ? "button" : void 0,
            tabIndex: events.length ? 0 : void 0,
            "aria-label": events.length ? fmtDayLabel(key) + " \u2014 " + events.length + " event" + (events.length === 1 ? "" : "s") : void 0,
            onClick: events.length ? function() {
              setSelectedDay(isSelected ? null : key);
            } : void 0,
            onKeyDown: events.length ? function(e) {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedDay(isSelected ? null : key);
              }
            } : void 0
          },
          /* @__PURE__ */ React.createElement("div", { style: {
            fontSize: "11px",
            color: isToday ? "#0EA5E9" : events.length ? "#E2E8F0" : "#64748B",
            fontWeight: isToday ? 700 : 400,
            fontFamily: "'DM Sans', sans-serif"
          } }, day2),
          feedsHere.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "2px", marginTop: "2px", flexWrap: "wrap" } }, feedsHere.slice(0, 4).map(function(fk) {
            return /* @__PURE__ */ React.createElement("span", { key: fk, "aria-hidden": "true", style: {
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: LIVE_FEED_COLOURS[fk],
              display: "inline-block"
            } });
          }))
        );
      })), selectedDay && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "12px" } }, /* @__PURE__ */ React.createElement("div", { style: {
        color: "#94A3B8",
        fontSize: "12px",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        padding: "6px 0",
        borderBottom: "1px solid #1E293B"
      } }, fmtDayLabel(selectedDay)), (byDay[selectedDay] || []).map(renderLiveRow)));
    }
    function renderListView() {
      var sorted = filteredLive.slice().sort(function(a, b) {
        return String(evDateKey(a.event_date || a.date)).localeCompare(String(evDateKey(b.event_date || b.date)));
      });
      var groupedLive = {};
      sorted.forEach(function(r) {
        var k = evDateKey(r.event_date || r.date);
        var monthKey = k.slice(0, 7);
        if (!groupedLive[monthKey]) {
          var d = /* @__PURE__ */ new Date(k + "T00:00:00");
          groupedLive[monthKey] = {
            label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
            items: []
          };
        }
        groupedLive[monthKey].items.push(r);
      });
      var monthKeys = Object.keys(groupedLive).sort();
      if (monthKeys.length === 0) {
        return /* @__PURE__ */ React.createElement("div", { style: { color: "#64748B", fontSize: "12px", padding: "8px 4px" } }, "No events match the selected feeds.");
      }
      return monthKeys.map(function(mk) {
        var g = groupedLive[mk];
        return /* @__PURE__ */ React.createElement("div", { key: mk, style: { marginBottom: "20px" } }, /* @__PURE__ */ React.createElement("div", { style: {
          color: "#94A3B8",
          fontSize: "13px",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          padding: "8px 0",
          borderBottom: "1px solid #1E293B",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        } }, /* @__PURE__ */ React.createElement("span", null, g.label), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#475569" } }, g.items.length, " event", g.items.length === 1 ? "" : "s")), g.items.map(renderLiveRow));
      });
    }
    function renderLiveCalendar() {
      return /* @__PURE__ */ React.createElement("div", { style: { padding: "12px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(LiveIndicator, { generatedAt }), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "4px" } }, [{ id: "month", label: "Month" }, { id: "list", label: "List" }].map(function(v) {
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: v.id,
            type: "button",
            className: "kl-cal-viewbtn",
            "aria-pressed": view === v.id,
            onClick: function() {
              setView(v.id);
              setSelectedDay(null);
            },
            style: {
              border: view === v.id ? "1px solid #0EA5E9" : "1px solid rgba(255,255,255,0.1)",
              background: view === v.id ? "rgba(14,165,233,0.15)" : "transparent",
              color: view === v.id ? "#0EA5E9" : "#94A3B8"
            }
          },
          v.label
        );
      }))), /* @__PURE__ */ React.createElement("div", { className: "kl-topic-chip-row", style: { marginBottom: "14px" } }, ["regulatory", "rates", "horizon", "client"].map(function(fk) {
        var on = feedsOn[fk];
        var colour = LIVE_FEED_COLOURS[fk];
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: fk,
            type: "button",
            className: "kl-live-chip",
            "aria-pressed": on,
            onClick: function() {
              toggleFeed(fk);
            },
            style: {
              border: "1px solid " + (on ? colour : "rgba(255,255,255,0.1)"),
              background: on ? colour + "15" : "transparent",
              color: on ? colour : "#64748B"
            }
          },
          LIVE_FEED_LABELS[fk]
        );
      })), view === "month" ? renderMonthView() : renderListView());
    }
    function toggleExpand(id) {
      setExpanded(function(prev) {
        var next = {};
        for (var k in prev) next[k] = prev[k];
        next[id] = !prev[id];
        return next;
      });
    }
    function discussWithEileen(req) {
      var seed = "Tell me about " + (req.requirement_name || "this regulatory event") + (req.source_act ? " under " + req.source_act : "") + " and what it means for employers.";
      if (typeof window.__klSeedInput === "function") {
        window.__klSeedInput(seed);
      } else if (typeof window.__klSendMessage === "function") {
        window.__klSendMessage(seed);
      }
    }
    if (liveState === "loading") {
      return /* @__PURE__ */ React.createElement("div", { style: { color: "#94A3B8", fontSize: "13px", padding: "12px" } }, "Connecting to the live calendar feed\u2026");
    }
    if (liveState === "live") {
      return renderLiveCalendar();
    }
    if (loading) {
      return /* @__PURE__ */ React.createElement("div", { style: { color: "#94A3B8", fontSize: "13px", padding: "12px" } }, "Loading regulatory calendar\u2026");
    }
    var forwardCount = reqs.filter(function(r) {
      return r.is_forward_requirement;
    }).length;
    var filteredReqs = reqs.filter(function(r) {
      if (filter === "forward") return r.is_forward_requirement;
      if (filter === "in_force") return r.commencement_status === "in_force";
      return true;
    });
    var filterButtons = [
      { id: "all", label: "All (" + reqs.length + ")" },
      { id: "in_force", label: "In Force" },
      { id: "forward", label: "Forward (" + forwardCount + ")" }
    ];
    var grouped = {};
    filteredReqs.forEach(function(req) {
      if (!req.effective_from) return;
      var d = new Date(req.effective_from);
      var key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      var label = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      if (!grouped[key]) grouped[key] = { label, items: [] };
      grouped[key].items.push(req);
    });
    var months = Object.keys(grouped).sort();
    return /* @__PURE__ */ React.createElement("div", { style: { padding: "12px" } }, /* @__PURE__ */ React.createElement("div", { style: {
      fontSize: "10px",
      color: "#475569",
      fontFamily: "'DM Mono', monospace",
      marginBottom: "10px"
    } }, "Live calendar feed not yet available \u2014 showing regulatory requirements"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" } }, filterButtons.map(function(f) {
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: f.id,
          type: "button",
          onClick: function() {
            setFilter(f.id);
          },
          style: {
            padding: "4px 10px",
            borderRadius: "4px",
            fontSize: "11px",
            cursor: "pointer",
            fontFamily: "inherit",
            border: filter === f.id ? "1px solid #0EA5E9" : "1px solid rgba(255,255,255,0.1)",
            background: filter === f.id ? "rgba(14,165,233,0.15)" : "transparent",
            color: filter === f.id ? "#0EA5E9" : "#94A3B8"
          }
        },
        f.label
      );
    })), months.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { color: "#64748B", fontSize: "12px", padding: "8px 4px" } }, "No requirements match this filter.") : months.map(function(monthKey) {
      var month = grouped[monthKey];
      return /* @__PURE__ */ React.createElement("div", { key: monthKey, style: { marginBottom: "20px" } }, /* @__PURE__ */ React.createElement("div", { style: {
        color: "#94A3B8",
        fontSize: "13px",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        padding: "8px 0",
        borderBottom: "1px solid #1E293B",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      } }, /* @__PURE__ */ React.createElement("span", null, month.label), /* @__PURE__ */ React.createElement("span", { style: { fontSize: "11px", color: "#475569" } }, month.items.length, " event", month.items.length === 1 ? "" : "s")), month.items.map(function(req, i) {
        var d = new Date(req.effective_from);
        var dayNum = d.getDate();
        var isExpanded = !!expanded[req.id];
        var statusColor = req.commencement_status === "in_force" ? "#10B981" : req.is_forward_requirement ? "#D97706" : "#0EA5E9";
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: req.id || i,
            "data-calendar-id": req.id,
            onClick: function() {
              toggleExpand(req.id);
            },
            role: "button",
            tabIndex: 0,
            onKeyDown: function(e) {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleExpand(req.id);
              }
            },
            "aria-expanded": isExpanded,
            style: {
              display: "flex",
              gap: "12px",
              padding: "10px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              cursor: "pointer"
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: {
            minWidth: "44px",
            height: "44px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: statusColor + "15",
            borderRadius: "8px",
            flexShrink: 0
          } }, /* @__PURE__ */ React.createElement("span", { style: {
            color: statusColor,
            fontSize: "18px",
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1
          } }, dayNum), /* @__PURE__ */ React.createElement("span", { style: {
            color: statusColor,
            fontSize: "9px",
            fontFamily: "'DM Mono', monospace",
            textTransform: "uppercase"
          } }, d.toLocaleDateString("en-GB", { month: "short" }))),
          /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: {
            color: "#E2E8F0",
            fontSize: "12px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500
          } }, req.requirement_name), req.source_act && /* @__PURE__ */ React.createElement("div", { style: {
            color: "#64748B",
            fontSize: "10px",
            fontFamily: "'DM Mono', monospace",
            marginTop: "2px"
          } }, req.source_act), isExpanded && /* @__PURE__ */ React.createElement("div", { style: { marginTop: "8px" } }, req.statutory_basis && /* @__PURE__ */ React.createElement("p", { style: {
            color: "#CBD5E1",
            fontSize: "11px",
            lineHeight: 1.5,
            margin: "0 0 8px",
            fontFamily: "'DM Sans', sans-serif"
          } }, req.statutory_basis), /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              onClick: function(e) {
                e.stopPropagation();
                discussWithEileen(req);
              },
              style: {
                background: "transparent",
                border: "1px solid #0EA5E9",
                color: "#0EA5E9",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "11px",
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer"
              }
            },
            "Discuss with Eileen"
          )))
        );
      }));
    }));
  }
  function ResearchPanel({ lang }) {
    var _tab = useState("library");
    var tab = _tab[0];
    var setTab = _tab[1];
    var _search = useState("");
    var search = _search[0];
    var setSearch = _search[1];
    var _data = useState([]);
    var data = _data[0];
    var setData = _data[1];
    var _loading = useState(true);
    var loading = _loading[0];
    var setLoading = _loading[1];
    var _expanded = useState({});
    var expanded = _expanded[0];
    var setExpanded = _expanded[1];
    var _instruments = useState([]);
    var instruments = _instruments[0];
    var setInstruments = _instruments[1];
    var _activeInstrument = useState(null);
    var activeInstrument = _activeInstrument[0];
    var setActiveInstrument = _activeInstrument[1];
    var _instrumentDetail = useState(null);
    var instrumentDetail = _instrumentDetail[0];
    var setInstrumentDetail = _instrumentDetail[1];
    var _detailLoading = useState(false);
    var detailLoading = _detailLoading[0];
    var setDetailLoading = _detailLoading[1];
    var _instMapReady = useState(!!(typeof window !== "undefined" && window.__klInstrumentsMap));
    var setInstMapReady = _instMapReady[1];
    useEffect(function() {
      var cancelled = false;
      ensureInstrumentsMap().then(function(map) {
        if (!cancelled && map) setInstMapReady(true);
      });
      return function() {
        cancelled = true;
      };
    }, []);
    useEffect(function() {
      if (tab === "library") {
        setLoading(false);
        return;
      }
      var cancelled = false;
      async function load() {
        if (!window.__klToken) {
          setLoading(false);
          return;
        }
        setLoading(true);
        try {
          var path = tab === "provisions" ? "/rest/v1/kl_provisions?select=provision_id,title,instrument_id,section_num,in_force,is_era_2025,last_verified&order=instrument_id,section_num&limit=500" : "/rest/v1/kl_cases?select=case_id,name,citation,court,year,principle&order=year.desc&limit=100";
          var headers = { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY };
          var resp = await fetch(SUPABASE_URL + path, { headers });
          if (tab === "provisions" && !resp.ok) {
            resp = await fetch(
              SUPABASE_URL + "/rest/v1/kl_provisions?select=provision_id,title,instrument_id,section_num,in_force,is_era_2025&order=instrument_id,section_num&limit=500",
              { headers }
            );
          }
          var d = await resp.json();
          if (cancelled) return;
          setData(Array.isArray(d) ? d : []);
        } catch (e) {
          console.error("Research load failed:", e);
          if (!cancelled) setData([]);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      load();
      return function() {
        cancelled = true;
      };
    }, [tab]);
    useEffect(function() {
      if (tab !== "library") return;
      var cancelled = false;
      async function loadInstruments() {
        try {
          var resp = await fetch("/knowledge-library/content/content-index.json");
          var d = await resp.json();
          if (!cancelled && Array.isArray(d)) {
            setInstruments(d);
            if (window.__klPendingInstrument) {
              var pending = window.__klPendingInstrument;
              delete window.__klPendingInstrument;
              var target = d.find(function(inst) {
                return inst.id === pending;
              });
              if (target) {
                setTimeout(function() {
                  loadInstrumentDetail(target);
                }, 100);
              }
            }
          }
        } catch (e) {
          console.warn("Library manifest fetch failed:", e);
        }
      }
      if (instruments.length === 0) loadInstruments();
      return function() {
        cancelled = true;
      };
    }, [tab]);
    useEffect(function() {
      function handleOpen(e) {
        var instId = e.detail && e.detail.id;
        if (!instId) return;
        setTab("library");
        var found = instruments.find(function(inst) {
          return inst.id === instId;
        });
        if (found) {
          loadInstrumentDetail(found);
        } else {
          window.__klPendingInstrument = instId;
        }
      }
      window.addEventListener("kl-open-instrument", handleOpen);
      return function() {
        window.removeEventListener("kl-open-instrument", handleOpen);
      };
    }, [instruments]);
    function toggleInstrument(instId) {
      setExpanded(function(prev) {
        var next = {};
        for (var k in prev) next[k] = prev[k];
        next[instId] = !prev[instId];
        return next;
      });
    }
    async function loadInstrumentDetail(inst) {
      setActiveInstrument(inst);
      setInstrumentDetail(null);
      setDetailLoading(true);
      try {
        var filename = inst.filename || (inst.id ? inst.id + ".json" : null);
        if (filename) {
          var resp = await fetch("/knowledge-library/content/" + filename);
          if (resp.ok) {
            var d = await resp.json();
            setInstrumentDetail(d);
          }
        }
      } catch (e) {
        console.warn("Content file fetch failed:", e);
      } finally {
        setDetailLoading(false);
      }
    }
    var filtered = data.filter(function(item) {
      if (!search) return true;
      var s = search.toLowerCase();
      if (tab === "provisions") {
        return (item.title || "").toLowerCase().indexOf(s) !== -1 || (item.instrument_id || "").toLowerCase().indexOf(s) !== -1;
      }
      return (item.name || "").toLowerCase().indexOf(s) !== -1 || (item.citation || "").toLowerCase().indexOf(s) !== -1;
    });
    var filteredInstruments = instruments;
    if (tab === "library" && search) {
      var libSearch = search.toLowerCase();
      var isCy = lang === "cy";
      filteredInstruments = instruments.filter(function(inst) {
        if ((inst.title || "").toLowerCase().indexOf(libSearch) !== -1) return true;
        if ((inst.short || "").toLowerCase().indexOf(libSearch) !== -1) return true;
        if ((inst.warmSubtitle || "").toLowerCase().indexOf(libSearch) !== -1) return true;
        if ((inst.cat || "").toLowerCase().indexOf(libSearch) !== -1) return true;
        if (isCy) {
          if ((inst.title_cy || "").toLowerCase().indexOf(libSearch) !== -1) return true;
          if ((inst.warmSubtitle_cy || "").toLowerCase().indexOf(libSearch) !== -1) return true;
        }
        return false;
      });
    }
    var groupedProvisions = {};
    if (tab === "provisions") {
      filtered.forEach(function(item) {
        var key = item.instrument_id || "Other";
        if (!groupedProvisions[key]) {
          groupedProvisions[key] = [];
        }
        groupedProvisions[key].push(item);
      });
    }
    var instrumentKeys = Object.keys(groupedProvisions).sort();
    function renderProvisionsTab() {
      if (instrumentKeys.length === 0) {
        return React.createElement("div", { style: { color: "#64748B", fontSize: "12px", padding: "8px 4px" } }, "No results.");
      }
      return instrumentKeys.map(function(instId) {
        var items = groupedProvisions[instId];
        var isOpen = !!expanded[instId];
        return React.createElement(
          "div",
          { key: instId, style: { marginBottom: "6px" } },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: function() {
                toggleInstrument(instId);
              },
              style: {
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: "6px",
                background: "rgba(14,165,233,0.04)",
                border: "1px solid rgba(14,165,233,0.12)",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "#E2E8F0",
                fontSize: "12px",
                fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif"
              }
            },
            // \u00A7W-B: live-feed display_title (+ short_citation where present);
            // unmapped codes fall back to the raw instrument_id unchanged.
            React.createElement(
              "span",
              { style: { minWidth: 0 } },
              instrumentDisplayTitle(instId),
              instrumentShortCitation(instId) && React.createElement("span", {
                style: { fontSize: "10px", color: "#64748B", fontFamily: "'DM Mono', monospace", marginLeft: "6px" }
              }, instrumentShortCitation(instId))
            ),
            React.createElement(
              "span",
              { style: { display: "flex", alignItems: "center", gap: "6px" } },
              React.createElement("span", { style: { fontSize: "10px", color: "#0EA5E9", fontFamily: "'DM Mono', monospace" } }, items.length + " provisions"),
              React.createElement("span", { style: { fontSize: "10px", color: "#64748B", transition: "transform 0.15s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" } }, "\u25BC")
            )
          ),
          isOpen && React.createElement(
            "div",
            { style: { paddingLeft: "8px", marginTop: "4px" } },
            items.map(function(item) {
              return React.createElement(
                "div",
                {
                  key: item.provision_id,
                  style: {
                    padding: "6px 8px",
                    marginBottom: "2px",
                    borderRadius: "4px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    cursor: "pointer"
                  },
                  onClick: function() {
                    var seedMsg = "Tell me about " + item.title + (item.instrument_id ? " under the " + instrumentDisplayTitle(item.instrument_id) : "");
                    if (window.__klSendMessage) window.__klSendMessage(seedMsg);
                  },
                  title: "Ask Eileen about this provision"
                },
                React.createElement("div", { style: { color: "#E2E8F0", fontSize: "12px", fontWeight: 500 } }, item.title),
                React.createElement(
                  "div",
                  { style: { display: "flex", gap: "6px", marginTop: "2px", flexWrap: "wrap", alignItems: "center" } },
                  React.createElement(
                    "span",
                    { style: { color: "#475569", fontSize: "10px", fontFamily: "'DM Mono', monospace" } },
                    item.section_num ? "s." + item.section_num : ""
                  ),
                  item.is_era_2025 && React.createElement("span", {
                    style: { color: "#F59E0B", fontSize: "10px", padding: "1px 5px", borderRadius: "3px", background: "rgba(245,158,11,0.1)" }
                  }, "ERA 2025"),
                  React.createElement(
                    "span",
                    { style: { color: item.in_force ? "#10B981" : "#94A3B8", fontSize: "10px" } },
                    item.in_force ? "In force" : "Not yet"
                  ),
                  // §W-D: freshness badge from kl_provisions.last_verified
                  React.createElement(FreshnessBadge, { lastVerified: item.last_verified })
                )
              );
            })
          )
        );
      });
    }
    function renderCasesTab() {
      if (filtered.length === 0) {
        return React.createElement("div", { style: { color: "#64748B", fontSize: "12px", padding: "8px 4px" } }, "No results.");
      }
      return filtered.slice(0, 50).map(function(item) {
        var caseKey = "case-" + item.case_id;
        var isOpen = !!expanded[caseKey];
        return React.createElement(
          "div",
          {
            key: item.case_id,
            style: {
              marginBottom: "6px",
              borderRadius: "6px",
              overflow: "hidden",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)"
            }
          },
          React.createElement(
            "div",
            {
              onClick: function() {
                toggleInstrument(caseKey);
              },
              style: {
                padding: "8px 10px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start"
              }
            },
            React.createElement(
              "div",
              { style: { flex: 1, minWidth: 0 } },
              React.createElement("div", { style: { color: "#E2E8F0", fontSize: "12px", fontWeight: 500 } }, item.name),
              React.createElement(
                "div",
                { style: { color: "#64748B", fontSize: "10px", marginTop: "2px", fontFamily: "'DM Mono', monospace" } },
                [item.citation, item.court, item.year].filter(Boolean).join(" \xB7 ")
              )
            ),
            React.createElement("span", {
              style: { fontSize: "9px", color: "#64748B", flexShrink: 0, marginTop: "4px", transition: "transform 0.15s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" },
              "aria-hidden": "true"
            }, "\u25BC")
          ),
          isOpen && React.createElement(
            "div",
            {
              style: { padding: "0 10px 10px", borderTop: "1px solid rgba(255,255,255,0.04)" }
            },
            item.principle && React.createElement("div", {
              style: { fontSize: "12px", color: "#CBD5E1", lineHeight: 1.5, marginTop: "8px", marginBottom: "10px" }
            }, item.principle),
            React.createElement("button", {
              type: "button",
              onClick: function() {
                if (window.__klSendMessage) window.__klSendMessage("Tell me about the case " + item.name + (item.citation ? " (" + item.citation + ")" : "") + " and what it means for employers");
              },
              style: {
                padding: "6px 12px",
                borderRadius: "6px",
                background: "rgba(14,165,233,0.08)",
                border: "1px solid rgba(14,165,233,0.2)",
                color: "#0EA5E9",
                fontSize: "11px",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif"
              }
            }, "\u2192 Discuss with Eileen")
          )
        );
      });
    }
    function renderLibraryTab() {
      if (activeInstrument) {
        return renderInstrumentDetail();
      }
      var CATEGORY_LABELS = {
        legislation: "UK Employment Legislation",
        acas: "ACAS Codes of Practice & Guidance",
        hse: "Health & Safety Executive Guidance",
        ico: "ICO Data Protection Guidance",
        ehrc: "Equality & Human Rights Commission",
        horizon: "Forward Intelligence & Horizon",
        training: "Training Resources",
        caselaw: "Case Law Intelligence",
        guidance: "Regulatory Guidance",
        "employment-relations": "Employment Relations",
        "cross-cutting": "Cross-Cutting Provisions"
      };
      var CATEGORY_ORDER = ["legislation", "acas", "hse", "ehrc", "ico", "guidance", "employment-relations", "cross-cutting", "horizon", "training", "caselaw"];
      var CATEGORY_COLOURS = {
        legislation: "#0EA5E9",
        acas: "#10B981",
        hse: "#F59E0B",
        ico: "#8B5CF6",
        ehrc: "#EC4899",
        horizon: "#F97316",
        training: "#06B6D4",
        caselaw: "#6366F1",
        guidance: "#14B8A6",
        "employment-relations": "#10B981",
        "cross-cutting": "#64748B"
      };
      var grouped = {};
      filteredInstruments.forEach(function(inst) {
        var cat = inst.cat || "legislation";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(inst);
      });
      var filteredCats = CATEGORY_ORDER.filter(function(c) {
        return grouped[c] && grouped[c].length > 0;
      });
      Object.keys(grouped).forEach(function(c) {
        if (filteredCats.indexOf(c) === -1) filteredCats.push(c);
      });
      if (instruments.length === 0) {
        return React.createElement(
          "div",
          { style: { color: "#64748B", fontSize: "13px", padding: "12px", textAlign: "center" } },
          "Loading instrument library\u2026"
        );
      }
      if (filteredCats.length === 0) {
        return React.createElement("div", { style: { color: "#64748B", fontSize: "12px", padding: "8px 4px" } }, "No instruments match your search.");
      }
      return React.createElement(
        "div",
        null,
        filteredCats.map(function(cat) {
          var items = grouped[cat];
          var label = CATEGORY_LABELS[cat] || cat;
          var catColor = CATEGORY_COLOURS[cat] || "#0EA5E9";
          var isCatOpen = expanded[cat] !== false;
          return React.createElement(
            "div",
            { key: cat, style: { marginBottom: "12px" } },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: function() {
                  toggleInstrument(cat);
                },
                style: {
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  background: "rgba(14,165,233,0.06)",
                  border: "1px solid rgba(14,165,233,0.15)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: catColor,
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif"
                }
              },
              React.createElement("span", null, label),
              React.createElement(
                "span",
                { style: { display: "flex", alignItems: "center", gap: "6px" } },
                React.createElement("span", { style: { fontSize: "10px", color: "#64748B", fontFamily: "'DM Mono', monospace" } }, items.length + " instruments"),
                React.createElement("span", { style: { fontSize: "9px", color: "#64748B", transition: "transform 0.15s", transform: isCatOpen ? "rotate(180deg)" : "rotate(0)" } }, "\u25BC")
              )
            ),
            isCatOpen && React.createElement(
              "div",
              { style: { paddingLeft: "4px", marginTop: "6px" } },
              items.map(function(inst) {
                var accentColor = CATEGORY_COLOURS[inst.cat] || "#0EA5E9";
                return React.createElement(
                  "div",
                  {
                    key: inst.id,
                    onClick: function() {
                      loadInstrumentDetail(inst);
                    },
                    style: {
                      padding: "0",
                      marginBottom: "6px",
                      borderRadius: "4px",
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      border: "1px solid rgba(255,255,255,0.06)",
                      display: "flex"
                    },
                    onMouseEnter: function(e) {
                      e.currentTarget.style.transform = "translateX(4px)";
                      e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.3)";
                    },
                    onMouseLeave: function(e) {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  },
                  // Book spine accent
                  React.createElement("div", {
                    style: {
                      width: "4px",
                      background: accentColor,
                      flexShrink: 0
                    }
                  }),
                  // Book cover content
                  React.createElement(
                    "div",
                    {
                      style: {
                        flex: 1,
                        padding: "10px 12px",
                        background: "rgba(255,255,255,0.02)"
                      }
                    },
                    // AMD-050 §4: render the human-readable topicLabel as primary
                    // when present; the formal title falls back to a secondary line.
                    // Brief 3B: bl() swaps title/warmSubtitle to Welsh when lang==='cy'.
                    // topicLabel stays English — human-readable tag, not translatable.
                    React.createElement(
                      "div",
                      { style: { color: "#E2E8F0", fontSize: "12px", fontWeight: 500, marginBottom: "4px", lineHeight: 1.3 } },
                      inst.topicLabel || bl(inst, "title", lang)
                    ),
                    inst.topicLabel && inst.title && React.createElement("div", {
                      style: { color: "#64748B", fontSize: "11px", lineHeight: 1.35, marginBottom: "4px" }
                    }, bl(inst, "title", lang)),
                    (function() {
                      var ws = bl(inst, "warmSubtitle", lang);
                      if (!ws) return null;
                      return React.createElement("div", {
                        style: { color: "#94A3B8", fontSize: "11px", lineHeight: 1.4, marginBottom: "6px" }
                      }, ws.length > 100 ? ws.slice(0, 100) + "\u2026" : ws);
                    })(),
                    React.createElement(
                      "div",
                      { style: { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" } },
                      inst.sectionCount > 0 && React.createElement("span", {
                        style: { fontSize: "10px", color: accentColor, fontFamily: "'DM Mono', monospace" }
                      }, inst.sectionCount + " provisions"),
                      inst.caseCount > 0 && React.createElement("span", {
                        style: { fontSize: "10px", color: "#64748B", fontFamily: "'DM Mono', monospace" }
                      }, inst.caseCount + " cases"),
                      inst.isInForce != null && React.createElement("span", {
                        style: {
                          fontSize: "9px",
                          padding: "1px 5px",
                          borderRadius: "3px",
                          background: inst.isInForce ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                          color: inst.isInForce ? "#10B981" : "#F59E0B"
                        }
                      }, inst.isInForce ? "In force" : "Pending")
                    )
                  )
                );
              })
            )
          );
        })
      );
    }
    function renderInstrumentDetail() {
      return React.createElement(
        "div",
        null,
        React.createElement("button", {
          type: "button",
          onClick: function() {
            setActiveInstrument(null);
            setInstrumentDetail(null);
          },
          style: {
            background: "none",
            border: "none",
            color: "#0EA5E9",
            fontSize: "12px",
            cursor: "pointer",
            padding: "0 0 10px",
            fontFamily: "'DM Sans', sans-serif",
            textAlign: "left"
          }
        }, "\u2190 Back to Library"),
        detailLoading ? React.createElement("div", { style: { color: "#94A3B8", fontSize: "13px", padding: "20px 0", textAlign: "center" } }, "Loading instrument detail\u2026") : instrumentDetail ? renderInstrumentContent(instrumentDetail) : renderInstrumentSummary(activeInstrument)
      );
    }
    function renderInstrumentSummary(inst) {
      var summaryTitle = bl(inst, "title", lang);
      var summaryWarm = bl(inst, "warmSubtitle", lang);
      return React.createElement(
        "div",
        null,
        React.createElement("div", { style: { fontSize: "16px", fontWeight: 600, color: "#E2E8F0", marginBottom: "8px" } }, summaryTitle),
        React.createElement(
          "div",
          { style: { fontSize: "12px", color: "#64748B", marginBottom: "4px", fontFamily: "'DM Mono', monospace" } },
          (inst.type || "") + (inst.jurisdiction ? " \xB7 " + inst.jurisdiction : "")
        ),
        // \u00A7W-D: freshness badge when the manifest carries lastVerified
        (inst.lastVerified || inst.last_verified) && React.createElement(
          "div",
          { style: { marginBottom: "8px" } },
          React.createElement(FreshnessBadge, { lastVerified: inst.lastVerified || inst.last_verified, style: { padding: "2px 6px", borderRadius: "4px" } })
        ),
        inst.chapters && React.createElement("div", { style: { fontSize: "12px", color: "#94A3B8", marginBottom: "12px", lineHeight: 1.5 } }, inst.chapters),
        summaryWarm && React.createElement("div", {
          style: {
            fontSize: "13px",
            color: "#CBD5E1",
            lineHeight: 1.6,
            marginBottom: "12px",
            padding: "12px",
            background: "rgba(14,165,233,0.04)",
            borderRadius: "8px",
            borderLeft: "2px solid rgba(14,165,233,0.2)"
          }
        }, summaryWarm),
        inst.sourceUrl && React.createElement("a", {
          href: inst.sourceUrl,
          target: "_blank",
          rel: "noopener noreferrer",
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "12px",
            fontSize: "11px",
            color: "#0EA5E9",
            textDecoration: "none",
            fontFamily: "'DM Sans', sans-serif"
          }
        }, "\u2197 View on legislation.gov.uk"),
        !inst.warmSubtitle && React.createElement(
          "div",
          { style: { fontSize: "12px", color: "#475569", fontStyle: "italic", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" } },
          "Deep content for this instrument is being enriched. Ask Eileen for current intelligence."
        ),
        React.createElement("button", {
          type: "button",
          onClick: function() {
            if (window.__klSendMessage) window.__klSendMessage("Tell me about the " + inst.title + " and what it means for employers");
          },
          style: {
            marginTop: "12px",
            padding: "8px 14px",
            borderRadius: "6px",
            background: "rgba(14,165,233,0.08)",
            border: "1px solid rgba(14,165,233,0.2)",
            color: "#0EA5E9",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif"
          }
        }, "\u2192 Ask Eileen about this instrument")
      );
    }
    function renderInstrumentContent(detail) {
      var formalTitle = bl(detail, "title", lang) || detail.shortTitle || activeInstrument && bl(activeInstrument, "title", lang) || "Instrument";
      var topicLabel = detail.topicLabel || activeInstrument && activeInstrument.topicLabel || null;
      var displayTitle = topicLabel || formalTitle;
      var displayType = detail.type || activeInstrument && activeInstrument.type || "";
      var displayJurisdiction = detail.jurisdiction || activeInstrument && activeInstrument.jurisdiction || "";
      var description = bl(detail, "desc", lang) || bl(detail, "description", lang) || bl(detail, "summary", lang) || bl(detail, "overview", lang) || activeInstrument && bl(activeInstrument, "warmSubtitle", lang) || "";
      var inForce = detail.isInForce != null ? detail.isInForce : activeInstrument && activeInstrument.isInForce;
      var lastVerified = detail.lastVerified || detail.last_verified || activeInstrument && (activeInstrument.lastVerified || activeInstrument.last_verified) || null;
      var instCat = activeInstrument && activeInstrument.cat || detail.cat || "";
      var provisions = [];
      if (Array.isArray(detail.provisions)) {
        provisions = detail.provisions;
      } else if (Array.isArray(detail.parts)) {
        detail.parts.forEach(function(part) {
          var rawPartLabel = part.title || part.num || part.name || "";
          var partLabel = humanisePartTitle(rawPartLabel, instCat);
          (part.sections || []).forEach(function(sec) {
            provisions.push({
              title: sec.title || sec.name || "",
              section: sec.num || sec.sectionNum || sec.section || "",
              text: sec.text || sec.currentText || sec.content || "",
              summary: sec.summary || sec.keyPrinciple || "",
              sourceUrl: sec.sourceUrl || null,
              partLabel,
              leadingCases: sec.leadingCases || []
            });
          });
        });
      }
      var cases = [];
      if (Array.isArray(detail.leadingCases)) cases = cases.concat(detail.leadingCases);
      if (Array.isArray(detail.cases)) cases = cases.concat(detail.cases);
      provisions.forEach(function(p) {
        if (Array.isArray(p.leadingCases)) cases = cases.concat(p.leadingCases);
      });
      var sourceUrl = detail.sourceUrl || activeInstrument && activeInstrument.sourceUrl || provisions[0] && provisions[0].sourceUrl || null;
      return React.createElement(
        "div",
        null,
        // Title block
        React.createElement(
          "div",
          { style: { marginBottom: "16px" } },
          React.createElement("div", { style: { fontSize: "16px", fontWeight: 600, color: "#E2E8F0", marginBottom: "6px" } }, displayTitle),
          // AMD-050 §4: formal title rendered secondary when a topicLabel is set.
          topicLabel && formalTitle && topicLabel !== formalTitle ? React.createElement("div", {
            style: { fontSize: "11px", color: "#64748B", marginBottom: "4px" }
          }, formalTitle) : null,
          React.createElement(
            "div",
            { style: { fontSize: "11px", color: "#64748B", fontFamily: "'DM Mono', monospace", marginBottom: "4px" } },
            [displayType, displayJurisdiction, detail.currentAsOf && "Verified " + detail.currentAsOf].filter(Boolean).join(" \xB7 ")
          ),
          detail.chapters && React.createElement("div", { style: { fontSize: "11px", color: "#94A3B8", marginBottom: "8px" } }, detail.chapters),
          React.createElement(
            "div",
            { style: { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" } },
            React.createElement("span", {
              style: {
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "4px",
                display: "inline-block",
                background: inForce ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                color: inForce ? "#10B981" : "#F59E0B"
              }
            }, inForce ? "In force" : "Not yet commenced"),
            // §W-D: freshness badge alongside the in-force state
            React.createElement(FreshnessBadge, { lastVerified, style: { padding: "2px 6px", borderRadius: "4px" } })
          )
        ),
        description && React.createElement("div", {
          style: {
            fontSize: "13px",
            color: "#CBD5E1",
            lineHeight: 1.6,
            marginBottom: "16px",
            padding: "12px",
            background: "rgba(14,165,233,0.04)",
            borderRadius: "8px",
            borderLeft: "2px solid rgba(14,165,233,0.2)"
          }
        }, typeof description === "string" ? description : JSON.stringify(description)),
        sourceUrl && React.createElement("a", {
          href: sourceUrl,
          target: "_blank",
          rel: "noopener noreferrer",
          style: {
            display: "inline-block",
            marginBottom: "16px",
            fontSize: "11px",
            color: "#0EA5E9",
            textDecoration: "none",
            fontFamily: "'DM Sans', sans-serif"
          }
        }, "\u2197 View original source"),
        React.createElement("button", {
          type: "button",
          onClick: function() {
            if (window.__klSendMessage) window.__klSendMessage("Give me a comprehensive briefing on the " + displayTitle + " including key obligations, recent changes, and practical implications for employers");
          },
          style: {
            display: "block",
            marginBottom: "16px",
            padding: "8px 14px",
            borderRadius: "6px",
            background: "rgba(14,165,233,0.08)",
            border: "1px solid rgba(14,165,233,0.2)",
            color: "#0EA5E9",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif"
          }
        }, "\u2192 Get a full briefing from Eileen"),
        // Provisions list (Level 2 + Level 3 on expand)
        provisions.length > 0 && React.createElement(
          "div",
          { style: { marginTop: "8px" } },
          React.createElement("div", {
            style: { fontSize: "12px", fontWeight: 600, color: "#0EA5E9", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" }
          }, "Provisions (" + provisions.length + ")"),
          provisions.slice(0, 40).map(function(prov, idx) {
            var provKey = "prov-" + idx;
            var isProvOpen = !!expanded[provKey];
            var provTitle = prov.summary || prov.title || prov.name || "Section " + (prov.section || prov.sectionNum || prov.num || idx + 1);
            if (provTitle.length > 140) provTitle = provTitle.slice(0, 140) + "\u2026";
            var provOfficialTitle = prov.summary && prov.title && prov.title !== prov.summary ? prov.title : null;
            var provText = prov.text || "";
            var provSection = prov.section || "";
            return React.createElement(
              "div",
              {
                key: provKey,
                style: { marginBottom: "3px", borderRadius: "4px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.04)" }
              },
              React.createElement(
                "div",
                {
                  onClick: function() {
                    toggleInstrument(provKey);
                  },
                  style: {
                    padding: "6px 8px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.02)"
                  }
                },
                React.createElement(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  React.createElement("span", { style: { color: "#E2E8F0", fontSize: "11px" } }, provTitle),
                  provSection && React.createElement(
                    "span",
                    { style: { color: "#475569", fontSize: "10px", marginLeft: "6px", fontFamily: "'DM Mono', monospace" } },
                    (String(provSection).indexOf("s.") === 0 ? "" : "s.") + provSection
                  ),
                  provOfficialTitle && React.createElement("div", {
                    style: { color: "#475569", fontSize: "10px", fontStyle: "italic", marginTop: "1px" }
                  }, provOfficialTitle)
                ),
                React.createElement("span", { style: { fontSize: "8px", color: "#475569", transition: "transform 0.15s", transform: isProvOpen ? "rotate(180deg)" : "rotate(0)" } }, "\u25BC")
              ),
              isProvOpen && React.createElement(
                "div",
                { style: { padding: "8px", borderTop: "1px solid rgba(255,255,255,0.04)" } },
                prov.summary && React.createElement(
                  "div",
                  { style: { fontSize: "11px", color: "#CBD5E1", lineHeight: 1.6, marginBottom: "6px" } },
                  prov.summary.length > 400 ? prov.summary.slice(0, 400) + "\u2026" : prov.summary
                ),
                provText && React.createElement(
                  "div",
                  { style: { fontSize: "11px", color: "#94A3B8", lineHeight: 1.6, maxHeight: "200px", overflowY: "auto", fontFamily: "'DM Mono', monospace" } },
                  provText.length > 500 ? provText.slice(0, 500) + "\u2026" : provText
                ),
                prov.sourceUrl && React.createElement("a", {
                  href: prov.sourceUrl,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "10px",
                    color: "#0EA5E9",
                    textDecoration: "none",
                    marginTop: "6px",
                    marginBottom: "4px"
                  }
                }, "\u2197 View on legislation.gov.uk"),
                React.createElement("button", {
                  type: "button",
                  onClick: function() {
                    if (window.__klSendMessage) window.__klSendMessage("Explain " + provTitle + " of the " + displayTitle + " and its practical implications");
                  },
                  style: {
                    display: "block",
                    marginTop: "6px",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    background: "rgba(14,165,233,0.06)",
                    border: "1px solid rgba(14,165,233,0.15)",
                    color: "#0EA5E9",
                    fontSize: "10px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif"
                  }
                }, "\u2192 Ask Eileen")
              )
            );
          })
        ),
        cases.length > 0 && React.createElement(
          "div",
          { style: { marginTop: "16px" } },
          React.createElement("div", {
            style: { fontSize: "12px", fontWeight: 600, color: "#0EA5E9", marginBottom: "8px", fontFamily: "'DM Sans', sans-serif" }
          }, "Leading Cases (" + cases.length + ")"),
          cases.slice(0, 20).map(function(c, idx) {
            var caseText = c.principle || c.heldText || c.held || c.significance || "";
            return React.createElement(
              "div",
              {
                key: "lc-" + idx,
                style: { padding: "8px", marginBottom: "4px", borderRadius: "4px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }
              },
              React.createElement("div", { style: { color: "#E2E8F0", fontSize: "12px", fontWeight: 500 } }, c.name || c.title || "Unnamed case"),
              (c.citation || c.court || c.year) && React.createElement(
                "div",
                { style: { color: "#64748B", fontSize: "10px", marginTop: "2px", fontFamily: "'DM Mono', monospace" } },
                [c.citation, c.court, c.year].filter(Boolean).join(" \xB7 ")
              ),
              caseText && React.createElement(
                "div",
                { style: { color: "#94A3B8", fontSize: "11px", marginTop: "4px", lineHeight: 1.4 } },
                caseText.length > 200 ? caseText.slice(0, 200) + "\u2026" : caseText
              ),
              (c.tna_url || c.supremecourt_url || c.judiciary_url) && React.createElement("a", {
                href: c.tna_url || c.supremecourt_url || c.judiciary_url,
                target: "_blank",
                rel: "noopener noreferrer",
                style: { fontSize: "10px", color: "#0EA5E9", textDecoration: "none", marginTop: "4px", display: "inline-block" }
              }, "\u2197 Read judgment")
            );
          })
        )
      );
    }
    var tabs = [
      { id: "library", label: "Library" },
      { id: "provisions", label: "Provisions" },
      { id: "cases", label: "Cases" }
    ];
    return React.createElement(
      "div",
      null,
      React.createElement(
        "div",
        { style: { display: "flex", gap: "8px", marginBottom: "10px" } },
        tabs.map(function(t) {
          return React.createElement("button", {
            key: t.id,
            type: "button",
            onClick: function() {
              setTab(t.id);
              setSearch("");
              setExpanded({});
            },
            style: {
              flex: 1,
              padding: "6px",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "inherit",
              border: tab === t.id ? "1px solid #0EA5E9" : "1px solid rgba(255,255,255,0.1)",
              background: tab === t.id ? "rgba(14,165,233,0.1)" : "transparent",
              color: tab === t.id ? "#0EA5E9" : "#94A3B8",
              fontWeight: tab === t.id ? 600 : 400
            }
          }, t.label);
        })
      ),
      React.createElement("input", {
        type: "text",
        placeholder: "Search " + tab + "\u2026",
        value: search,
        onChange: function(e) {
          setSearch(e.target.value);
        },
        style: {
          width: "100%",
          padding: "8px 12px",
          borderRadius: "6px",
          fontSize: "13px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.03)",
          color: "#E2E8F0",
          marginBottom: "10px",
          outline: "none",
          boxSizing: "border-box",
          fontFamily: "inherit"
        }
      }),
      loading ? React.createElement("div", { style: { color: "#94A3B8", fontSize: "13px", padding: "12px" } }, "Loading\u2026") : tab === "library" ? renderLibraryTab() : tab === "provisions" ? renderProvisionsTab() : renderCasesTab()
    );
  }
  var PLACEHOLDER_DESCRIPTIONS = {
    documents: "Create structured documents with watermarks, disclaimers, and export controls.",
    eileen: "Context-aware Eileen chat with Vault and Calendar integration.",
    planner: "Six-step contract planning workflow with gap analysis and compliance mapping."
  };
  function PlaceholderPanel({ panelId }) {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-placeholder-panel" }, /* @__PURE__ */ React.createElement("div", { className: "kl-placeholder-icon", "aria-hidden": "true" }, "\u2699"), /* @__PURE__ */ React.createElement("div", { className: "kl-placeholder-title" }, "Coming soon"), /* @__PURE__ */ React.createElement("p", { className: "kl-placeholder-body" }, PLACEHOLDER_DESCRIPTIONS[panelId] || "This panel is under development."));
  }
  var PANEL_LABELS = {
    vault: "Document Vault",
    notes: "Saved Items",
    documents: "Documents",
    calendar: "Calendar",
    eileen: "Eileen",
    research: "Research",
    planner: "Contract Planner"
  };
  var PANEL_COMPONENTS = {
    vault: VaultPanel,
    notes: NotesPanel,
    calendar: CalendarPanel,
    research: ResearchPanel
  };
  function PanelDrawer({ panelId, onClose, lang }) {
    if (!panelId) return null;
    const PanelContent = PANEL_COMPONENTS[panelId] || PlaceholderPanel;
    const label = PANEL_LABELS[panelId] || panelId;
    return /* @__PURE__ */ React.createElement("div", { className: "kl-panel-drawer", role: "dialog", "aria-label": label }, /* @__PURE__ */ React.createElement("div", { className: "kl-panel-drawer-header" }, /* @__PURE__ */ React.createElement("span", { className: "kl-panel-drawer-title" }, label), /* @__PURE__ */ React.createElement("button", { className: "kl-panel-drawer-close", onClick: onClose, "aria-label": "Close panel" }, "\u2715")), /* @__PURE__ */ React.createElement("div", { className: "kl-panel-drawer-body" }, /* @__PURE__ */ React.createElement(PanelContent, { panelId, lang })));
  }
  function AdvisoryBanner() {
    return /* @__PURE__ */ React.createElement("div", { className: "kl-advisory" }, /* @__PURE__ */ React.createElement("p", null, "This is regulatory intelligence. It does not constitute legal advice. AI Lane Limited (Company No. 17035654, ICO Reg. 00013389720)"));
  }
  function HorizonAlert() {
    const [event, setEvent] = useState(null);
    useEffect(() => {
      let cancelled = false;
      async function load() {
        try {
          const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          const resp = await fetch(
            SUPABASE_URL + "/rest/v1/regulatory_requirements?is_forward_requirement=eq.true&effective_from=gte." + today + "&select=requirement_name,statutory_basis,effective_from&order=effective_from.asc&limit=1",
            {
              headers: {
                "Authorization": "Bearer " + (window.__klToken || ""),
                "apikey": SUPABASE_ANON_KEY
              }
            }
          );
          const data = await resp.json();
          if (cancelled) return;
          if (Array.isArray(data) && data[0]) {
            setEvent(data[0]);
          }
        } catch (e) {
          console.warn("HorizonAlert fetch failed (non-blocking):", e);
        }
      }
      if (window.__klToken) load();
      return () => {
        cancelled = true;
      };
    }, []);
    if (!event) return null;
    const effectiveDate = new Date(event.effective_from);
    const now = /* @__PURE__ */ new Date();
    const diffDays = Math.max(0, Math.ceil((effectiveDate - now) / (1e3 * 60 * 60 * 24)));
    const dateLabel = effectiveDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const urgencyColor = diffDays <= 30 ? "#F59E0B" : diffDays <= 90 ? "#0EA5E9" : "#64748B";
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "kl-horizon-alert",
        style: {
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "6px 14px",
          borderRadius: "8px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "16px",
          marginTop: "8px",
          maxWidth: "640px",
          width: "100%",
          fontFamily: "'DM Sans', sans-serif"
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: urgencyColor,
            flexShrink: 0
          }
        }
      ),
      /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#E2E8F0", fontSize: "12px", fontWeight: 500 } }, event.requirement_name), event.statutory_basis && /* @__PURE__ */ React.createElement("span", { style: { color: "#64748B", fontSize: "11px", marginLeft: "6px" } }, event.statutory_basis)),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            color: urgencyColor,
            fontSize: "11px",
            fontWeight: 500,
            fontFamily: "'DM Mono', monospace",
            whiteSpace: "nowrap",
            flexShrink: 0
          }
        },
        diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow" : diffDays + " days",
        " \u2014 ",
        dateLabel
      )
    );
  }
  function BookShelf({ onOpenBook }) {
    var _books = useState([]);
    var books = _books[0];
    var setBooks = _books[1];
    useEffect(function() {
      var cancelled = false;
      fetch("/knowledge-library/content/content-index.json").then(function(r) {
        return r.json();
      }).then(function(data) {
        if (!cancelled && Array.isArray(data)) {
          var byCat = {};
          data.forEach(function(inst) {
            if (!byCat[inst.cat]) byCat[inst.cat] = [];
            byCat[inst.cat].push(inst);
          });
          var featured = [];
          var catOrder = ["legislation", "acas", "hse", "ehrc", "ico"];
          catOrder.forEach(function(cat) {
            if (byCat[cat]) {
              featured = featured.concat(byCat[cat].slice(0, 3));
            }
          });
          setBooks(featured.slice(0, 15));
        }
      }).catch(function(e) {
        console.warn("BookShelf fetch failed:", e);
      });
      return function() {
        cancelled = true;
      };
    }, []);
    if (books.length === 0) return null;
    var BOOK_COLOURS = {
      legislation: { bg: "linear-gradient(160deg, #1a2332 0%, #0f1923 50%, #1a2332 100%)", text: "#D4A017", spine: "#D4A017" },
      acas: { bg: "linear-gradient(160deg, #0f2318 0%, #0a1a12 50%, #0f2318 100%)", text: "#10B981", spine: "#10B981" },
      hse: { bg: "linear-gradient(160deg, #231a0f 0%, #1a1208 50%, #231a0f 100%)", text: "#F59E0B", spine: "#F59E0B" },
      ehrc: { bg: "linear-gradient(160deg, #1f0f23 0%, #170a1a 50%, #1f0f23 100%)", text: "#EC4899", spine: "#EC4899" },
      ico: { bg: "linear-gradient(160deg, #0f1523 0%, #0a0f1a 50%, #0f1523 100%)", text: "#8B5CF6", spine: "#8B5CF6" }
    };
    return React.createElement(
      "div",
      {
        className: "kl-bookshelf",
        // §W-F D1: width inherited from .kl-content-container (no per-section cap)
        style: { width: "100%", marginTop: "32px" }
      },
      React.createElement("div", {
        style: {
          fontSize: "10px",
          fontWeight: 500,
          color: "#475569",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "12px",
          fontFamily: "'DM Mono', monospace",
          textAlign: "center"
        }
      }, "The Employment Law Library"),
      React.createElement(
        "div",
        {
          className: "kl-shelf",
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            justifyContent: "center",
            padding: "16px 12px 20px",
            background: "linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(139,92,246,0.02) 100%)",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.04)",
            position: "relative"
          }
        },
        books.map(function(book) {
          var colours = BOOK_COLOURS[book.cat] || BOOK_COLOURS.legislation;
          var shortTitle = book.short || book.title;
          if (shortTitle.length > 35) shortTitle = shortTitle.slice(0, 32) + "\u2026";
          return React.createElement(
            "div",
            {
              key: book.id,
              onClick: function() {
                onOpenBook(book);
              },
              className: "kl-book",
              style: {
                width: "100px",
                height: "130px",
                borderRadius: "2px 4px 4px 2px",
                background: colours.bg,
                cursor: "pointer",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "10px 8px 8px",
                overflow: "hidden",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: "2px 2px 8px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.05)",
                borderLeft: "4px solid " + colours.spine
              },
              title: book.title,
              onMouseEnter: function(e) {
                e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
                e.currentTarget.style.boxShadow = "2px 6px 16px rgba(0,0,0,0.5), inset -1px 0 0 rgba(255,255,255,0.08)";
              },
              onMouseLeave: function(e) {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "2px 2px 8px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.05)";
              }
            },
            React.createElement("div", {
              style: {
                width: "60%",
                height: "1px",
                background: colours.text,
                opacity: 0.3,
                marginBottom: "6px"
              }
            }),
            React.createElement(
              "div",
              {
                style: {
                  color: colours.text,
                  fontSize: "10px",
                  fontWeight: 600,
                  lineHeight: 1.25,
                  fontFamily: "'DM Sans', sans-serif",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  minWidth: 0
                }
              },
              // §W-F D5: clamp the title inside the spine (kl-book-title)
              React.createElement("span", { className: "kl-book-title" }, shortTitle)
            ),
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end"
                }
              },
              React.createElement("span", {
                style: {
                  fontSize: "7px",
                  color: colours.text,
                  opacity: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: "'DM Mono', monospace"
                }
              }, book.cat === "legislation" ? "Act" : book.cat === "acas" ? "ACAS" : book.cat === "hse" ? "HSE" : book.cat === "ico" ? "ICO" : book.cat === "ehrc" ? "EHRC" : ""),
              React.createElement("div", {
                style: {
                  width: "3px",
                  height: "80%",
                  position: "absolute",
                  right: 0,
                  top: "10%",
                  background: "repeating-linear-gradient(180deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px)"
                }
              })
            )
          );
        }),
        React.createElement("div", {
          style: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, rgba(139,92,246,0.1), rgba(14,165,233,0.1), rgba(139,92,246,0.1))",
            borderRadius: "0 0 8px 8px"
          }
        })
      ),
      React.createElement(
        "div",
        { style: { textAlign: "center", marginTop: "12px" } },
        React.createElement("button", {
          type: "button",
          onClick: function() {
            if (typeof window.__klOpenPanel === "function") window.__klOpenPanel("research");
          },
          style: {
            background: "transparent",
            border: "none",
            color: "#0EA5E9",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            padding: "4px 8px"
          }
        }, "Browse all 72 instruments \u2192")
      )
    );
  }
  function DomainSubPage({ domain, onBack, onAskEileen, onSend, isLoading, onFileSelect, nexusState, prefersReducedMotion, onInputChange, tier, lang }) {
    var _exp = useState(null);
    var expandedSubArea = _exp[0];
    var setExpandedSubArea = _exp[1];
    return React.createElement(
      "div",
      {
        className: "kl-main",
        style: { display: "flex", flexDirection: "column", height: "100%" }
      },
      // §4.2 Breadcrumb
      React.createElement(
        "nav",
        {
          role: "navigation",
          "aria-label": "Breadcrumb",
          style: {
            padding: "12px 24px",
            borderBottom: "1px solid #1E3A5F",
            background: "#0F1D32",
            flexShrink: 0
          }
        },
        React.createElement("span", {
          style: { color: "#94A3B8", cursor: "pointer", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" },
          onClick: onBack
        }, "Knowledge Library"),
        React.createElement("span", { style: { color: "#475569", margin: "0 8px" } }, "\u203A"),
        React.createElement("span", {
          style: { color: "#F1F5F9", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }
        }, domain.name)
      ),
      // §4.3 Domain selector — compact horizontal tabs.
      // KL-LIVE-001 §W-E: className activates the index.html mobile rule
      // (.kl-domain-selector → horizontal scroll, no wrap, under 768px).
      React.createElement(
        "div",
        {
          className: "kl-domain-selector",
          style: {
            padding: "8px 24px",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            borderBottom: "1px solid #1E3A5F",
            background: "#0F1D32",
            flexShrink: 0
          }
        },
        DOMAINS.map(function(d) {
          return React.createElement("button", {
            key: d.id,
            type: "button",
            onClick: function() {
              window.location.hash = "/domain/" + d.slug;
            },
            style: {
              background: d.id === domain.id ? "#0EA5E9" : "transparent",
              color: d.id === domain.id ? "#FFFFFF" : "#94A3B8",
              border: d.id === domain.id ? "none" : "1px solid #334155",
              borderRadius: "16px",
              padding: "4px 12px",
              fontSize: "12px",
              fontFamily: "'DM Sans', sans-serif",
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "all 0.15s"
            }
          }, d.name);
        })
      ),
      // Scrollable main content
      React.createElement(
        "div",
        {
          style: { flex: 1, overflowY: "auto", padding: "24px", minHeight: 0 }
        },
        // §4.4 Domain Header
        React.createElement("h1", {
          style: {
            color: "#0EA5E9",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "28px",
            margin: "0 0 12px",
            fontWeight: 700
          }
        }, domain.name),
        React.createElement("p", {
          style: {
            color: "#CBD5E1",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "15px",
            lineHeight: 1.7,
            maxWidth: "720px",
            margin: "0 0 16px"
          }
        }, domain.orientation),
        // KL-LIVE-001 §W-C: per-topic currency strip (topic_tiles live feed)
        React.createElement(TopicCurrencyStrip, { domain }),
        // §4.5 Sub-Area Grid
        React.createElement("h2", {
          style: {
            color: "#F1F5F9",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "18px",
            margin: "0 0 16px",
            fontWeight: 600
          }
        }, "Topics in this area"),
        // KL-LIVE-001 §W-E: className activates the index.html mobile rule
        // (.kl-domain-subarea-grid → single column under 768px).
        React.createElement(
          "div",
          {
            className: "kl-domain-subarea-grid",
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "12px",
              marginBottom: "32px"
            }
          },
          domain.subAreas.map(function(sa, i) {
            var isExpanded = expandedSubArea === i;
            var toggleExpand = function() {
              setExpandedSubArea(isExpanded ? null : i);
            };
            return React.createElement(
              "div",
              { key: i },
              // Sub-area card header
              React.createElement(
                "div",
                {
                  role: "button",
                  tabIndex: 0,
                  "aria-expanded": isExpanded,
                  "aria-label": sa.name + (isExpanded ? " \u2014 collapse" : " \u2014 expand for details"),
                  onClick: toggleExpand,
                  onKeyDown: function(e) {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand();
                    }
                  },
                  style: {
                    background: "#111827",
                    border: isExpanded ? "1px solid #0EA5E9" : "1px solid #1E293B",
                    borderRadius: isExpanded ? "8px 8px 0 0" : "8px",
                    padding: "16px",
                    cursor: "pointer",
                    transition: "border-color 0.2s"
                  }
                },
                React.createElement("h3", {
                  style: { color: "#F1F5F9", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", margin: "0 0 6px", fontWeight: 600 }
                }, sa.name),
                React.createElement("p", {
                  style: { color: "#64748B", fontSize: "12px", fontFamily: "'DM Mono', monospace", margin: "0 0 8px" }
                }, sa.instruments),
                React.createElement("span", {
                  style: { color: isExpanded ? "#0EA5E9" : "#475569", fontSize: "11px" }
                }, isExpanded ? "\u25BE Less" : "\u25B8 Details")
              ),
              // Expanded details
              isExpanded ? React.createElement(
                "div",
                {
                  style: {
                    background: "#0F172A",
                    border: "1px solid #1E293B",
                    borderTop: "none",
                    borderRadius: "0 0 8px 8px",
                    padding: "16px"
                  }
                },
                React.createElement("p", {
                  style: { color: "#CBD5E1", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, margin: "0 0 12px" }
                }, sa.scope),
                React.createElement("button", {
                  type: "button",
                  onClick: function() {
                    onAskEileen("Tell me about " + sa.name.toLowerCase() + " in the context of " + domain.name.toLowerCase());
                  },
                  style: {
                    background: "transparent",
                    border: "1px solid #0EA5E9",
                    color: "#0EA5E9",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }
                }, "Discuss with Eileen \u2192")
              ) : null
            );
          })
        ),
        // §4.6 Key Instruments Strip
        React.createElement("h2", {
          style: {
            color: "#F1F5F9",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "18px",
            margin: "0 0 16px",
            fontWeight: 600
          }
        }, "Key instruments"),
        React.createElement(
          "div",
          {
            style: { display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "32px" }
          },
          (function() {
            var seen = {};
            var unique = [];
            domain.subAreas.forEach(function(sa) {
              sa.instruments.split(", ").forEach(function(inst) {
                if (!seen[inst]) {
                  seen[inst] = true;
                  unique.push(inst);
                }
              });
            });
            return unique;
          })().map(function(inst, i) {
            return React.createElement("span", {
              key: i,
              style: {
                background: "#1E293B",
                color: "#0EA5E9",
                padding: "6px 12px",
                borderRadius: "16px",
                fontSize: "12px",
                fontFamily: "'DM Mono', monospace",
                whiteSpace: "nowrap"
              }
            }, inst);
          })
        )
      ),
      // §4.7 Eileen Panel — anchored at bottom
      React.createElement(
        "div",
        {
          style: {
            borderTop: "1px solid #1E3A5F",
            padding: "16px 24px",
            background: "#0F1D32",
            flexShrink: 0
          }
        },
        React.createElement(
          "div",
          {
            style: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }
          },
          React.createElement(EileenStaticDot, null),
          React.createElement("span", {
            style: { color: "#94A3B8", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }
          }, domain.eileenGreeting)
        ),
        React.createElement(MessageInput, { onSend, disabled: isLoading, onFileSelect, onInputChange, nexusState, tier, prefersReducedMotion })
      )
    );
  }
  var CREATE_CHECKOUT_URL = "https://cnbsxwtvazfvzmltkuvx.functions.supabase.co/create-checkout";
  var UPSELL_CONFIG = {
    kl_quick_session: {
      threshold: 20,
      title: "Need more time?",
      message: "Your Quick Session is nearly up. Extend now and your remaining time and check allowance carry over.",
      offers: [
        { cta: "Extend to Day Pass \u2014 \xA320", productType: "kl_extend_qs_to_day" },
        { cta: "Extend to Research Week \u2014 \xA380", productType: "kl_extend_qs_to_week" }
      ]
    },
    kl_day_pass: {
      threshold: 60,
      title: "Extend your research",
      message: "Your Day Pass is nearly up. Extend to a Research Week for 7 full days \u2014 your remaining time and check allowance carry over.",
      offers: [
        { cta: "Extend to Research Week \u2014 \xA360", productType: "kl_extend_day_to_week" }
      ]
    }
  };
  function UpsellCard({ productType, minutesRemaining, onDismiss }) {
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState("");
    const [err, setErr] = useState("");
    const c = UPSELL_CONFIG[productType];
    if (!c) return null;
    if (minutesRemaining == null || minutesRemaining <= 0 || minutesRemaining > c.threshold) return null;
    function startExtend(offer) {
      if (!consent) {
        setErr("Please confirm you have read the Terms of Service and Privacy Policy before proceeding.");
        return;
      }
      if (busy) return;
      setErr("");
      setBusy(offer.productType);
      try {
        if (window.gtag) window.gtag("event", "begin_checkout", { item_id: offer.productType });
      } catch (e) {
      }
      fetch(CREATE_CHECKOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_type: offer.productType })
      }).then((r) => r.json()).then((d) => {
        if (d && d.url) {
          window.location.href = d.url;
          return;
        }
        throw new Error(d && d.error || "no url");
      }).catch(() => {
        setBusy("");
        setErr("Checkout is temporarily unavailable \u2014 please try again in a moment.");
      });
    }
    const ready = consent && !busy;
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "complementary",
        "aria-label": "Session extension prompt",
        style: {
          position: "fixed",
          bottom: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "440px",
          width: "90%",
          padding: "16px 20px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(14,165,233,0.04) 100%)",
          border: "1px solid rgba(14,165,233,0.25)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          zIndex: 1e3,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          fontFamily: "'DM Sans', sans-serif"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#0EA5E9", fontSize: "14px", fontWeight: 600, marginBottom: "6px" } }, c.title), /* @__PURE__ */ React.createElement("div", { style: { color: "#CBD5E1", fontSize: "13px", lineHeight: 1.5 } }, c.message)), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: onDismiss,
          "aria-label": "Dismiss extension prompt",
          style: {
            background: "none",
            border: "none",
            color: "#64748B",
            fontSize: "18px",
            cursor: "pointer",
            padding: "0 0 0 12px",
            lineHeight: 1
          }
        },
        "\xD7"
      )),
      /* @__PURE__ */ React.createElement("label", { style: { display: "flex", gap: "8px", alignItems: "flex-start", marginTop: "12px", cursor: "pointer" } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: consent,
          onChange: (e) => {
            setConsent(e.target.checked);
            if (e.target.checked) setErr("");
          },
          style: { marginTop: "3px", flex: "none" }
        }
      ), /* @__PURE__ */ React.createElement("span", { style: { color: "#94A3B8", fontSize: "12px", lineHeight: 1.45 } }, "I have read and agree to the", " ", /* @__PURE__ */ React.createElement("a", { href: "/terms/", target: "_blank", rel: "noopener noreferrer", style: { color: "#38BDF8" } }, "Terms of Service"), " ", "and", " ", /* @__PURE__ */ React.createElement("a", { href: "/privacy/", target: "_blank", rel: "noopener noreferrer", style: { color: "#38BDF8" } }, "Privacy Policy"), ".")),
      /* @__PURE__ */ React.createElement("div", { style: { marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" } }, c.offers.map((offer) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: offer.productType,
          type: "button",
          onClick: () => startExtend(offer),
          disabled: !ready,
          style: {
            display: "inline-block",
            padding: "8px 16px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            background: "#0EA5E9",
            color: "#FFFFFF",
            border: "none",
            textDecoration: "none",
            cursor: ready ? "pointer" : "not-allowed",
            opacity: ready ? 1 : 0.45
          }
        },
        busy === offer.productType ? "Preparing secure checkout\u2026" : offer.cta
      ))),
      err ? /* @__PURE__ */ React.createElement("div", { style: { marginTop: "10px", color: "#F87171", fontSize: "12px", lineHeight: 1.45 } }, err) : null
    );
  }
  async function saveKlPreferences(partial) {
    if (!window.__klToken || !window.__klUserId) return;
    try {
      var checkResp = await fetch(
        SUPABASE_URL + "/rest/v1/kl_user_preferences?user_id=eq." + window.__klUserId + "&select=id,preferences",
        { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
      );
      var existing = await checkResp.json();
      if (Array.isArray(existing) && existing.length > 0) {
        var merged = Object.assign({}, existing[0].preferences, partial);
        await fetch(
          SUPABASE_URL + "/rest/v1/kl_user_preferences?id=eq." + existing[0].id,
          {
            method: "PATCH",
            headers: {
              "Authorization": "Bearer " + window.__klToken,
              "apikey": SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
              "Prefer": "return=minimal"
            },
            body: JSON.stringify({ preferences: merged, updated_at: (/* @__PURE__ */ new Date()).toISOString() })
          }
        );
      } else {
        await fetch(
          SUPABASE_URL + "/rest/v1/kl_user_preferences",
          {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + window.__klToken,
              "apikey": SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
              "Prefer": "return=minimal"
            },
            body: JSON.stringify({ user_id: window.__klUserId, preferences: partial })
          }
        );
      }
    } catch (err) {
      console.error("Failed to save preferences:", err);
    }
  }
  function fmtHubMatterDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch (e) {
      return String(iso);
    }
  }
  var HUB_MATTER_BTN_STYLE = {
    background: "transparent",
    border: "1px solid rgba(14,165,233,0.3)",
    borderRadius: "6px",
    color: "#0EA5E9",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "12px",
    padding: "6px 12px",
    cursor: "pointer",
    minHeight: "32px"
  };
  var HUB_MATTER_BTN_DANGER = Object.assign({}, HUB_MATTER_BTN_STYLE, {
    color: "#F87171",
    border: "1px solid rgba(239,68,68,0.35)"
  });
  var HUB_MATTER_BTN_PRIMARY = Object.assign({}, HUB_MATTER_BTN_STYLE, {
    background: "#0EA5E9",
    color: "#fff",
    border: "1px solid #0EA5E9"
  });
  function HubMatterRow({ m, hubSession, onChanged, onToast }) {
    var _mode = useState(null);
    var mode = _mode[0];
    var setMode = _mode[1];
    var _reason = useState("");
    var reason = _reason[0];
    var setReason = _reason[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    function act(op, extra) {
      setBusy(true);
      var body = Object.assign({ op, matter_id: m.id }, extra || {});
      return hubSendToEileen(hubSession, { matter_action: body }).then(function(resp) {
        return resp && resp.matter_result;
      });
    }
    function doExtend() {
      var r = (reason || "").trim();
      if (!r) return;
      act("extend", { retention_reason: r }).then(function(mr) {
        setBusy(false);
        if (mr && mr.matter_ok) onToast("Kept until " + fmtHubMatterDate(mr.expires_at));
        else console.warn("[OOX-001] extend failed", mr && mr.matter_error);
        onChanged();
      }).catch(function(e) {
        console.warn("[OOX-001] extend failed", e);
        setBusy(false);
        onChanged();
      });
    }
    function doDelete() {
      act("delete").then(function(mr) {
        setBusy(false);
        if (mr && mr.matter_ok) onToast("Cleared");
        else console.warn("[OOX-001] delete failed", mr && mr.matter_error);
        onChanged();
      }).catch(function(e) {
        console.warn("[OOX-001] delete failed", e);
        setBusy(false);
        onChanged();
      });
    }
    function doResolve() {
      act("resolve").then(function(mr) {
        setBusy(false);
        if (mr && mr.matter_ok) onToast("Marked resolved \u2014 clears automatically after 30 days");
        else console.warn("[OOX-001] resolve failed", mr && mr.matter_error);
        onChanged();
      }).catch(function(e) {
        console.warn("[OOX-001] resolve failed", e);
        setBusy(false);
        onChanged();
      });
    }
    var rowChildren = [
      React.createElement(
        "div",
        { key: "main", style: { minWidth: 0 } },
        React.createElement("div", { style: { color: "#F1F5F9", fontSize: "13px", lineHeight: 1.4 } }, m.summary || "(no summary)"),
        React.createElement("div", { style: { color: "#64748B", fontSize: "11px", fontFamily: "'DM Mono', monospace", marginTop: "2px" } }, "Clears " + fmtHubMatterDate(m.expires_at))
      )
    ];
    if (mode === "keep") {
      rowChildren.push(React.createElement(
        "div",
        { key: "keep", style: { display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" } },
        React.createElement("input", {
          type: "text",
          value: reason,
          maxLength: 240,
          placeholder: "Reason to keep (e.g. ongoing tribunal claim)",
          onChange: function(e) {
            setReason(e.target.value);
          },
          onKeyDown: function(e) {
            if (e.key === "Enter") {
              e.preventDefault();
              doExtend();
            }
          },
          style: { flex: 1, minWidth: "160px", background: "#0A1628", border: "1px solid #1E3A5F", borderRadius: "6px", color: "#F1F5F9", fontSize: "12px", padding: "6px 10px", fontFamily: "'DM Sans', sans-serif" }
        }),
        React.createElement("button", { type: "button", disabled: busy || !reason.trim(), style: HUB_MATTER_BTN_PRIMARY, onClick: doExtend }, "Save reason"),
        React.createElement("button", { type: "button", style: HUB_MATTER_BTN_STYLE, onClick: function() {
          setMode(null);
          setReason("");
        } }, "Cancel")
      ));
    } else if (mode === "clear") {
      rowChildren.push(React.createElement(
        "div",
        { key: "clear", style: { display: "flex", gap: "6px", marginTop: "8px", alignItems: "center", flexWrap: "wrap" } },
        React.createElement("span", { style: { color: "#94A3B8", fontSize: "12px", flex: 1, minWidth: "160px" } }, "Clear this from memory? This cannot be undone."),
        React.createElement("button", { type: "button", disabled: busy, style: HUB_MATTER_BTN_DANGER, onClick: doDelete }, "Confirm clear"),
        React.createElement("button", { type: "button", style: HUB_MATTER_BTN_STYLE, onClick: function() {
          setMode(null);
        } }, "Cancel")
      ));
    } else {
      rowChildren.push(React.createElement(
        "div",
        { key: "actions", style: { display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" } },
        React.createElement("button", { type: "button", style: HUB_MATTER_BTN_STYLE, onClick: function() {
          setMode("keep");
        } }, "Keep"),
        React.createElement("button", { type: "button", style: HUB_MATTER_BTN_DANGER, onClick: function() {
          setMode("clear");
        } }, "Clear now"),
        React.createElement("button", { type: "button", disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: doResolve }, "Mark resolved")
      ));
    }
    return React.createElement("div", {
      style: { padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }
    }, rowChildren);
  }
  function HubMatterPanel({ hubSession, refreshKey }) {
    var _matters = useState([]);
    var matters = _matters[0];
    var setMatters = _matters[1];
    var _toast = useState("");
    var toast = _toast[0];
    var setToast = _toast[1];
    var _capOpen = useState(false);
    var capOpen = _capOpen[0];
    var setCapOpen = _capOpen[1];
    var _capText = useState("");
    var capText = _capText[0];
    var setCapText = _capText[1];
    var _capCats = useState("");
    var capCats = _capCats[0];
    var setCapCats = _capCats[1];
    var _capErr = useState("");
    var capErr = _capErr[0];
    var setCapErr = _capErr[1];
    var _capBusy = useState(false);
    var capBusy = _capBusy[0];
    var setCapBusy = _capBusy[1];
    var toastTimer = useRef(null);
    function showToast(msg) {
      setToast(msg);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(function() {
        setToast("");
      }, 3200);
    }
    var refresh = useCallback(function() {
      if (!hubSession) return;
      hubSendToEileen(hubSession, { matter_action: { op: "list" } }).then(function(resp) {
        var mr = resp && resp.matter_result;
        if (!mr || mr.matter_error || !Array.isArray(mr.matters)) {
          if (mr && mr.matter_error) console.warn("[OOX-001] matter list error:", mr.matter_error);
          setMatters([]);
          return;
        }
        setMatters(mr.matters.filter(function(m) {
          return m && m.due_soon === true;
        }));
      }).catch(function(e) {
        console.warn("[OOX-001] matter list failed", e);
        setMatters([]);
      });
    }, [hubSession]);
    useEffect(function() {
      refresh();
    }, [refresh, refreshKey]);
    useEffect(function() {
      return function() {
        if (toastTimer.current) clearTimeout(toastTimer.current);
      };
    }, []);
    function saveCapture() {
      var summary = (capText || "").trim();
      setCapErr("");
      if (!summary) return;
      var catList = (capCats || "").split(",").map(function(s) {
        return s.trim();
      }).filter(Boolean);
      setCapBusy(true);
      hubSendToEileen(hubSession, { matter_action: { op: "upsert", summary, acei_categories: catList } }).then(function(resp) {
        setCapBusy(false);
        var mr = resp && resp.matter_result;
        if (mr && mr.matter_ok) {
          showToast("Remembered");
          setCapOpen(false);
          setCapText("");
          setCapCats("");
          refresh();
        } else if (mr && mr.matter_error) {
          setCapErr(mr.matter_error);
        } else {
          setCapErr("Could not save the matter. Please try again.");
        }
      }).catch(function(e) {
        setCapBusy(false);
        console.warn("[OOX-001] upsert failed", e);
        setCapErr("Could not save the matter. Please try again.");
      });
    }
    var children = [];
    if (matters.length > 0) {
      children.push(React.createElement(
        "div",
        {
          key: "card",
          style: { background: "#0F1D32", border: "1px solid #1E3A5F", borderRadius: "10px", padding: "8px 14px 12px", marginBottom: "8px" }
        },
        React.createElement("div", {
          style: { color: "#94A3B8", fontSize: "10px", fontFamily: "'DM Mono', monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 0" }
        }, "Matter memory \u2014 due to clear"),
        matters.map(function(m) {
          return React.createElement(HubMatterRow, { key: m.id, m, hubSession, onChanged: refresh, onToast: showToast });
        })
      ));
    }
    var captureChildren = [
      React.createElement("button", {
        key: "toggle",
        type: "button",
        className: "kl-action-btn",
        onClick: function() {
          setCapErr("");
          setCapOpen(!capOpen);
        }
      }, capOpen ? "Close" : "+ Remember a matter")
    ];
    if (capOpen) {
      captureChildren.push(React.createElement(
        "div",
        {
          key: "form",
          style: { marginTop: "8px", background: "#0F1D32", border: "1px solid #1E3A5F", borderRadius: "10px", padding: "12px" }
        },
        React.createElement("label", {
          htmlFor: "hub-matter-capture-text",
          style: { display: "block", color: "#94A3B8", fontSize: "12px", marginBottom: "6px", lineHeight: 1.4 }
        }, "Describe the matter \u2014 use roles, not names. Eileen stores it anonymised."),
        React.createElement("textarea", {
          id: "hub-matter-capture-text",
          value: capText,
          rows: 2,
          maxLength: 600,
          onChange: function(e) {
            setCapText(e.target.value);
          },
          style: { width: "100%", background: "#0A1628", border: "1px solid #1E3A5F", borderRadius: "6px", color: "#F1F5F9", fontSize: "13px", padding: "8px 10px", fontFamily: "'DM Sans', sans-serif", resize: "vertical" }
        }),
        React.createElement("input", {
          type: "text",
          value: capCats,
          placeholder: "ACEI categories (optional, comma-separated)",
          onChange: function(e) {
            setCapCats(e.target.value);
          },
          style: { width: "100%", marginTop: "6px", background: "#0A1628", border: "1px solid #1E3A5F", borderRadius: "6px", color: "#F1F5F9", fontSize: "12px", padding: "6px 10px", fontFamily: "'DM Sans', sans-serif" }
        }),
        capErr ? React.createElement("div", { style: { color: "#F87171", fontSize: "12px", marginTop: "6px" } }, capErr) : null,
        React.createElement(
          "div",
          { style: { display: "flex", gap: "6px", marginTop: "8px" } },
          React.createElement("button", { type: "button", disabled: capBusy || !capText.trim(), style: HUB_MATTER_BTN_PRIMARY, onClick: saveCapture }, "Remember"),
          React.createElement("button", { type: "button", style: HUB_MATTER_BTN_STYLE, onClick: function() {
            setCapOpen(false);
            setCapText("");
            setCapCats("");
            setCapErr("");
          } }, "Cancel")
        )
      ));
    }
    children.push(React.createElement("div", { key: "capture" }, captureChildren));
    if (toast) {
      children.push(React.createElement("div", {
        key: "toast",
        role: "status",
        "aria-live": "polite",
        style: { marginTop: "8px", color: "#10B981", fontSize: "12px", fontFamily: "'DM Mono', monospace" }
      }, toast));
    }
    return React.createElement("div", {
      className: "kl-hub-matter-panel",
      style: { maxWidth: "860px", width: "100%", margin: "0 auto 8px" }
    }, children);
  }
  var HUB_ACEI_CAT_LABELS = {
    discrimination_harassment: "Discrimination & harassment",
    harassment_bullying: "Harassment & bullying",
    unfair_dismissal: "Unfair dismissal",
    wrongful_dismissal: "Wrongful dismissal",
    redundancy: "Redundancy & restructure",
    redundancy_restructure: "Redundancy & restructure",
    pay_wages: "Pay & wages",
    wages_pay: "Pay & wages",
    national_minimum_wage: "National minimum wage",
    working_time: "Working time",
    holiday_pay: "Holiday pay",
    family_leave: "Family & parental leave",
    whistleblowing: "Whistleblowing",
    tupe: "TUPE transfers",
    contracts_terms: "Contracts & terms",
    health_safety: "Health & safety",
    data_protection: "Data protection",
    grievance_disciplinary: "Grievance & disciplinary",
    equal_pay: "Equal pay",
    trade_union: "Trade union & collective",
    worker_status: "Worker status & classification",
    immigration_rtw: "Immigration & right to work"
  };
  function hubAceiIsNum(v) {
    return v != null && v !== "" && !isNaN(Number(v));
  }
  function hubAceiF2(v) {
    return hubAceiIsNum(v) ? Number(v).toFixed(2) : "\u2014";
  }
  function hubAceiF3(v) {
    return hubAceiIsNum(v) ? Number(v).toFixed(3) : "\u2014";
  }
  function hubAceiInt(v) {
    return hubAceiIsNum(v) ? String(Math.round(Number(v))) : "\u2014";
  }
  function hubAceiSmart(v) {
    if (!hubAceiIsNum(v)) return "\u2014";
    var n = Number(v);
    return n === Math.round(n) ? String(n) : n.toFixed(2);
  }
  function hubAceiDi(v) {
    if (!hubAceiIsNum(v)) return "\u2014";
    var n = Number(v);
    return n === Math.round(n) ? String(n) : n.toFixed(1);
  }
  function hubAceiHumanise(raw) {
    if (raw == null) return "\u2014";
    var key = String(raw).toLowerCase();
    if (HUB_ACEI_CAT_LABELS[key]) return HUB_ACEI_CAT_LABELS[key];
    return String(raw).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, function(c) {
      return c.toUpperCase();
    }) || "\u2014";
  }
  function hubAceiData(res, name, fallback) {
    if (!res) return fallback;
    if (res.error) {
      console.warn("[OOX-001] ACEI read failed: " + name, res.error);
      return fallback;
    }
    return res.data == null ? fallback : res.data;
  }
  var HUB_ACEI_CARD_STYLE = { background: "#0F1D32", border: "1px solid #1E3A5F", borderRadius: "12px", padding: "20px 24px" };
  var HUB_ACEI_SECTION_H = { color: "#94A3B8", fontFamily: "'DM Mono', monospace", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" };
  function hubAceiEmptyState() {
    return React.createElement(
      "div",
      {
        style: { maxWidth: "460px", margin: "24px auto", textAlign: "center", background: "#0F1D32", border: "1px solid #1E3A5F", borderRadius: "12px", padding: "32px 24px" }
      },
      React.createElement("div", {
        "aria-hidden": "true",
        style: { width: "48px", height: "48px", margin: "0 auto 18px", borderRadius: "50%", background: "radial-gradient(circle at 32% 30%, #38BDF8, #0F1D32)", boxShadow: "0 0 24px rgba(14,165,233,0.35)" }
      }),
      React.createElement("div", {
        style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, marginBottom: "20px" }
      }, "Your exposure index is calculated once your company profile is complete. Add your company number and SIC so Eileen can resolve your sector and weight your exposure."),
      React.createElement("a", {
        href: "/operational/onboarding/",
        style: { display: "inline-block", background: "#0EA5E9", color: "#fff", textDecoration: "none", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 500, padding: "10px 18px", borderRadius: "8px" }
      }, "Set up your workspace")
    );
  }
  function hubAceiDomainHeader(d0) {
    if (!d0) return null;
    var meta = [
      React.createElement("div", { key: "lbl", style: { color: "#F1F5F9", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500 } }, "Employment-law exposure index"),
      React.createElement("div", { key: "drt", style: { color: "#94A3B8", fontFamily: "'DM Mono', monospace", fontSize: "12px", marginTop: "4px" } }, "Domain risk total: " + hubAceiSmart(d0.drt))
    ];
    if (d0.structural_flag === true) {
      meta.push(React.createElement("span", {
        key: "badge",
        style: { alignSelf: "flex-start", marginTop: "8px", color: "#F59E0B", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "6px", fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", padding: "2px 8px" }
      }, "Structural"));
    }
    return React.createElement(
      "div",
      {
        key: "di-card",
        style: { display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap", marginBottom: "20px", background: "#0F1D32", border: "1px solid #1E3A5F", borderRadius: "12px", padding: "20px 24px" }
      },
      React.createElement(
        "div",
        { style: { fontFamily: "'DM Mono', monospace", fontSize: "40px", fontWeight: 600, color: "#F1F5F9", lineHeight: 1, whiteSpace: "nowrap" } },
        hubAceiDi(d0.di),
        React.createElement("span", { style: { fontSize: "16px", color: "#64748B", marginLeft: "4px" } }, "/100")
      ),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", minWidth: 0 } }, meta)
    );
  }
  function hubAceiCategoryTable(rows) {
    var sorted = rows.slice().sort(function(a, b) {
      var av = hubAceiIsNum(a && a.wcs) ? Number(a.wcs) : -Infinity;
      var bv = hubAceiIsNum(b && b.wcs) ? Number(b.wcs) : -Infinity;
      return bv - av;
    });
    var headers = ["Category", "Likelihood (L)", "Impact (I)", "CRS (L\xD7I)", "Sector \xD7 (sm)", "Jurisdiction \xD7 (jm)", "Weighted (WCS)"];
    var thBase = { padding: "9px 12px", borderBottom: "2px solid #1E3A5F", color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" };
    var thText = Object.assign({}, thBase, { textAlign: "left" });
    var thNum = Object.assign({}, thBase, { textAlign: "right" });
    var tdText = { padding: "9px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#F1F5F9", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 500 };
    var tdNum = { padding: "9px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#CBD5E1", fontFamily: "'DM Mono', monospace", fontSize: "13px", textAlign: "right", whiteSpace: "nowrap" };
    var tdWcs = Object.assign({}, tdNum, { color: "#F1F5F9", fontWeight: 600 });
    var headRow = React.createElement("tr", null, headers.map(function(h, i) {
      return React.createElement("th", { key: h, style: i === 0 ? thText : thNum }, h);
    }));
    var bodyRows = sorted.map(function(row, idx) {
      var smStr = hubAceiF2(row.sm);
      var smEmph = hubAceiIsNum(row.sm) && smStr !== "1.00";
      var smStyle = smEmph ? Object.assign({}, tdNum, { color: "#0EA5E9", fontWeight: 600 }) : tdNum;
      return React.createElement(
        "tr",
        { key: idx },
        React.createElement("td", { style: tdText }, hubAceiHumanise(row.category)),
        React.createElement("td", { style: tdNum }, hubAceiSmart(row.l)),
        React.createElement("td", { style: tdNum }, hubAceiSmart(row.i)),
        React.createElement("td", { style: tdNum }, hubAceiF2(row.crs)),
        React.createElement("td", { style: smStyle }, smStr),
        React.createElement("td", { style: tdNum }, hubAceiF2(row.jm)),
        React.createElement("td", { style: tdWcs }, hubAceiF3(row.wcs))
      );
    });
    return React.createElement(
      "div",
      { key: "cat", style: { marginBottom: "20px" } },
      React.createElement("div", { style: HUB_ACEI_SECTION_H }, "Exposure by category"),
      React.createElement(
        "div",
        { style: { overflowX: "auto", background: "#0F1D32", border: "1px solid #1E3A5F", borderRadius: "10px" } },
        React.createElement(
          "table",
          { style: { width: "100%", borderCollapse: "collapse", minWidth: "640px" } },
          React.createElement("thead", null, headRow),
          React.createElement("tbody", null, bodyRows)
        )
      ),
      React.createElement(
        "div",
        { style: { color: "#64748B", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", lineHeight: 1.5, marginTop: "10px" } },
        "Weighted scores reflect your sector (Sector \xD7) and jurisdiction mix (Jurisdiction \xD7). WCS = CRS \xD7 Sector \xD7 \xD7 Jurisdiction \xD7."
      )
    );
  }
  function hubAceiSectorPanel(org, sector) {
    var children = [
      React.createElement("h3", { key: "h", style: { color: "#F1F5F9", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600, margin: "0 0 4px" } }, "Your sector benchmark")
    ];
    if (!sector) {
      children.push(React.createElement("div", { key: "na", style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" } }, "Sector benchmark not available for your SIC classification."));
      return React.createElement("div", { key: "sector", style: HUB_ACEI_CARD_STYLE }, children);
    }
    var subTxt = sector.sector_name || "\u2014";
    if (sector.sector_group_name) subTxt += " \xB7 " + sector.sector_group_name;
    children.push(React.createElement("div", { key: "sub", style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", marginBottom: "14px" } }, subTxt));
    var stats = [
      ["Sector exposure multiplier", hubAceiF2(sector.sector_multiplier)],
      ["Employers in sector", hubAceiInt(sector.employer_count)],
      ["Tribunal cases", hubAceiInt(sector.tribunal_cases)],
      ["Cases per employer", hubAceiF2(sector.cases_per_employer)]
    ];
    children.push(React.createElement("div", {
      key: "grid",
      style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "14px" }
    }, stats.map(function(s) {
      return React.createElement(
        "div",
        { key: s[0], style: { background: "#0A1628", border: "1px solid #1E3A5F", borderRadius: "8px", padding: "12px 14px" } },
        React.createElement("div", { style: { color: "#64748B", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", marginBottom: "6px" } }, s[0]),
        React.createElement("div", { style: { color: "#F1F5F9", fontFamily: "'DM Mono', monospace", fontSize: "18px", fontWeight: 600 } }, s[1])
      );
    })));
    children.push(React.createElement(
      "div",
      { key: "cmp", style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", lineHeight: 1.5 } },
      "Your sector multiplier is " + hubAceiF2(sector.sector_multiplier) + " \u2014 applied as the Sector \xD7 in your weighted scores above."
    ));
    var orgMult = org && org.acei_sector_multiplier;
    if (hubAceiIsNum(orgMult) && hubAceiF2(orgMult) !== hubAceiF2(sector.sector_multiplier)) {
      children.push(React.createElement(
        "div",
        { key: "note", style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", lineHeight: 1.5, marginTop: "8px" } },
        "Applied value for your organisation: " + hubAceiF2(orgMult) + " \u2014 this is the multiplier applied to this tenant."
      ));
    }
    return React.createElement("div", { key: "sector", style: HUB_ACEI_CARD_STYLE }, children);
  }
  function HubAceiFacet({ hubSession }) {
    var _state = useState({ status: "loading", cats: [], dom: null, org: null, sector: null });
    var state = _state[0];
    var setState = _state[1];
    useEffect(function() {
      var alive = true;
      var sb = hubSession && hubSession.sb;
      if (!sb || !sb.from) {
        setState({ status: "ready", cats: [], dom: null, org: null, sector: null });
        return;
      }
      Promise.all([
        sb.from("acei_category_scores").select("category,domain,l,i,sm,jm,crs,wcs,week_start_date").order("week_start_date", { ascending: false }).limit(60),
        sb.from("acei_domain_scores").select("domain,drt,dmr,di,structural_flag,week_start_date").order("week_start_date", { ascending: false }).limit(1),
        sb.from("organisations").select("name,acei_sector_code,acei_sector_multiplier").maybeSingle()
      ]).then(function(res) {
        var cats2 = hubAceiData(res[0], "acei_category_scores", []);
        var dom = hubAceiData(res[1], "acei_domain_scores", []);
        var org = hubAceiData(res[2], "organisations", null);
        var code = org && org.acei_sector_code;
        if (code) {
          return sb.from("sector_exposure_summary").select("sector_code,sector_name,sector_group_name,sector_multiplier,employer_count,tribunal_cases,cases_per_employer").eq("sector_code", code).maybeSingle().then(function(secRes) {
            if (!alive) return;
            setState({ status: "ready", cats: cats2 || [], dom: dom && dom[0] || null, org, sector: hubAceiData(secRes, "sector_exposure_summary", null) });
          });
        }
        if (alive) setState({ status: "ready", cats: cats2 || [], dom: dom && dom[0] || null, org, sector: null });
      }).catch(function(e) {
        console.warn("[OOX-001] ACEI facet: reads failed", e);
        if (alive) setState({ status: "ready", cats: [], dom: null, org: null, sector: null });
      });
      return function() {
        alive = false;
      };
    }, [hubSession]);
    if (state.status === "loading") {
      return React.createElement("div", { style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", padding: "8px 0" } }, "Loading your exposure index\u2026");
    }
    var cats = state.cats || [];
    if (!cats.length) return hubAceiEmptyState();
    var maxWeek = null;
    cats.forEach(function(r) {
      if (r && r.week_start_date != null) {
        if (maxWeek === null || String(r.week_start_date) > String(maxWeek)) maxWeek = r.week_start_date;
      }
    });
    var latest = maxWeek === null ? cats : cats.filter(function(r) {
      return String(r.week_start_date) === String(maxWeek);
    });
    return React.createElement(
      "div",
      { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } },
      hubAceiDomainHeader(state.dom),
      // §1.3
      hubAceiCategoryTable(latest),
      // §1.4
      hubAceiSectorPanel(state.org, state.sector)
      // §1.5
    );
  }
  function hubVaultUnwrap(res, name) {
    if (!res || res.error) {
      console.warn("[OOX-001] Vault read failed: " + name, res && res.error);
      return { error: true };
    }
    return { rows: Array.isArray(res.data) ? res.data : [] };
  }
  function hubVaultAal2StepUp(sb) {
    try {
      var mfa = sb && sb.auth && sb.auth.mfa;
      if (!mfa || !mfa.getAuthenticatorAssuranceLevel) return Promise.resolve(false);
      return mfa.getAuthenticatorAssuranceLevel().then(function(r) {
        var d = r && r.data;
        return !!(d && d.currentLevel === "aal1" && d.nextLevel === "aal2");
      }).catch(function() {
        return false;
      });
    } catch (e) {
      return Promise.resolve(false);
    }
  }
  function hubVaultStatusClass(status) {
    var s = String(status == null ? "" : status).toLowerCase();
    if (/(complete|done|extracted|analy[sz]ed|ready|success|\bok\b)/.test(s)) return "ok";
    if (/(fail|error|reject)/.test(s)) return "bad";
    if (/(pend|queue|process|progress|run|extract|analy[sz]ing|wait)/.test(s)) return "busy";
    return "idle";
  }
  function hubVaultDate(iso) {
    if (!iso) return "\u2014";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch (e) {
      return String(iso);
    }
  }
  var HUB_VAULT_PILL_BASE = { display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", letterSpacing: "0.01em", padding: "3px 9px", borderRadius: "999px", border: "1px solid #1E3A5F", background: "#0A1628", color: "#94A3B8" };
  var HUB_VAULT_PILL_STYLES = {
    ok: { color: "#22C55E", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)" },
    busy: { color: "#0EA5E9", borderColor: "rgba(14,165,233,0.3)", background: "rgba(14,165,233,0.12)" },
    bad: { color: "#F87171", borderColor: "rgba(248,113,113,0.32)", background: "rgba(248,113,113,0.08)" },
    idle: { color: "#64748B" }
  };
  var HUB_VAULT_CHIP_STYLE = { display: "inline-block", fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", color: "#0EA5E9", whiteSpace: "nowrap", background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.3)", padding: "2px 8px", borderRadius: "6px" };
  var HUB_VAULT_VIS_BASE = { display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 8px", borderRadius: "999px", border: "1px solid #1E3A5F", color: "#94A3B8", background: "rgba(148,163,184,0.06)" };
  var HUB_VAULT_VIS_ORG = { color: "#0EA5E9", borderColor: "rgba(14,165,233,0.3)", background: "rgba(14,165,233,0.12)" };
  var HUB_VAULT_CARD_STYLE = { background: "#0F1D32", border: "1px solid #1E3A5F", borderLeft: "2px solid rgba(14,165,233,0.3)", borderRadius: "12px", padding: "16px 18px" };
  function hubVaultStatusPill(status, key) {
    if (status == null || status === "") {
      return React.createElement("span", { key, style: Object.assign({}, HUB_VAULT_PILL_BASE, HUB_VAULT_PILL_STYLES.idle) }, "\u2014");
    }
    var pillStyle = Object.assign({}, HUB_VAULT_PILL_BASE, HUB_VAULT_PILL_STYLES[hubVaultStatusClass(status)]);
    return React.createElement("span", { key, style: pillStyle }, hubAceiHumanise(status));
  }
  function HubVaultMovedCard() {
    return React.createElement(
      "div",
      { style: { maxWidth: "520px", margin: "48px auto 0", width: "100%" } },
      React.createElement(
        "div",
        { style: HUB_VAULT_CARD_STYLE },
        React.createElement("div", { style: { fontSize: "16px", fontWeight: 700, color: "#F1F5F9", fontFamily: "'DM Sans', sans-serif", marginBottom: "8px" } }, "The Document Vault has moved"),
        React.createElement(
          "div",
          { style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", lineHeight: 1.6, marginBottom: "16px" } },
          "Your monitored documents, exposure reports, Solicitors Preparation Bundles and notification settings now live in the Documents Vault room."
        ),
        React.createElement("a", {
          href: "/operational/documents/",
          style: { display: "inline-block", background: "#0EA5E9", color: "#fff", borderRadius: "8px", padding: "10px 18px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600, textDecoration: "none" }
        }, "Open the Documents Vault \u2192")
      )
    );
  }
  function HubStepUpGate({ hubSession, onElevated }) {
    var _code = useState("");
    var code = _code[0];
    var setCode = _code[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var _err = useState("");
    var err = _err[0];
    var setErr = _err[1];
    var _noTotp = useState(false);
    var noTotp = _noTotp[0];
    var setNoTotp = _noTotp[1];
    var inputRef = useRef(null);
    useEffect(function() {
      var alive = true;
      try {
        hubSession.sb.auth.mfa.listFactors().then(function(r) {
          var totp = r && r.data && r.data.totp || [];
          var verified = totp.filter(function(f) {
            return f.status === "verified";
          });
          if (alive && !verified.length) setNoTotp(true);
        }).catch(function() {
        });
      } catch (e) {
      }
      return function() {
        alive = false;
      };
    }, [hubSession]);
    useEffect(function() {
      if (!noTotp && inputRef.current) inputRef.current.focus();
    }, [noTotp]);
    function verify() {
      var clean = (code || "").replace(/\D/g, "");
      if (busy) return;
      if (clean.length !== 6) {
        setErr("Enter the 6-digit code from your authenticator app.");
        return;
      }
      setBusy(true);
      setErr("");
      var mfa = hubSession.sb.auth.mfa;
      mfa.listFactors().then(function(r) {
        if (r.error) throw r.error;
        var totp = (r.data && r.data.totp || []).filter(function(f) {
          return f.status === "verified";
        });
        if (!totp.length) {
          setNoTotp(true);
          throw { silent: true };
        }
        return mfa.challenge({ factorId: totp[0].id }).then(function(c) {
          if (c.error) throw c.error;
          return mfa.verify({ factorId: totp[0].id, challengeId: c.data.id, code: clean });
        });
      }).then(function(v) {
        if (v.error) throw v.error;
        return hubSession.sb.auth.getSession();
      }).then(function(gs) {
        var s = gs && gs.data && gs.data.session;
        var tok = s && s.access_token;
        if (tok) {
          hubSession.token = tok;
          window.__klToken = tok;
          if (window.__ailaneUser) window.__ailaneUser.token = tok;
        }
        onElevated();
      }).catch(function(e) {
        setBusy(false);
        if (e && e.silent) return;
        setErr(e && e.message || "That code didn\u2019t work. Please try again.");
      });
    }
    function signInAgain() {
      var done = function() {
        window.location.replace("/login/");
      };
      try {
        hubSession.sb.auth.signOut().then(done, done);
      } catch (e) {
        done();
      }
    }
    var inner = noTotp ? [
      React.createElement(
        "p",
        { key: "b", className: "kl-expired-body", style: { fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.55, color: "#94A3B8", margin: "0 0 24px" } },
        "Your second step is set up with a method this page can\u2019t verify here. Sign in again to confirm it\u2019s you."
      ),
      React.createElement("button", { key: "go", type: "button", onClick: signInAgain, style: { display: "inline-flex", padding: "12px 24px", background: "#0EA5E9", color: "#fff", border: "none", borderRadius: "10px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 500, cursor: "pointer" } }, "Sign in again")
    ] : [
      React.createElement(
        "p",
        { key: "b", style: { fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.55, color: "#94A3B8", margin: "0 0 20px" } },
        "Two-factor authentication is on for your account. Enter the 6-digit code from your authenticator app to open your workspace."
      ),
      React.createElement("input", {
        key: "in",
        ref: inputRef,
        type: "text",
        inputMode: "numeric",
        autoComplete: "one-time-code",
        maxLength: 6,
        placeholder: "123456",
        value: code,
        "aria-label": "Authenticator code",
        onChange: function(e) {
          setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
        },
        onKeyDown: function(e) {
          if (e.key === "Enter") verify();
        },
        style: { width: "180px", padding: "12px 16px", background: "#0A1628", border: "1px solid #1E3A5F", borderRadius: "10px", color: "#F1F5F9", fontSize: "1.2rem", letterSpacing: "0.3em", outline: "none", textAlign: "center", fontFamily: "'DM Mono', monospace" }
      }),
      React.createElement(
        "div",
        { key: "act", style: { marginTop: "18px" } },
        React.createElement("button", {
          type: "button",
          onClick: verify,
          disabled: busy,
          style: { display: "inline-flex", padding: "12px 24px", background: "#0EA5E9", color: "#fff", border: "none", borderRadius: "10px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 500, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }
        }, busy ? "Verifying\u2026" : "Verify")
      ),
      React.createElement(
        "div",
        { key: "alt", style: { marginTop: "14px" } },
        React.createElement("button", {
          type: "button",
          onClick: signInAgain,
          style: { background: "none", border: "none", color: "#64748B", fontSize: "12px", cursor: "pointer", textDecoration: "underline", fontFamily: "'DM Sans', sans-serif" }
        }, "Sign out and use a different account")
      )
    ];
    return React.createElement(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Two-factor verification",
        style: { position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }
      },
      React.createElement("div", { style: { position: "absolute", inset: 0, background: "rgba(10, 14, 22, 0.82)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" } }),
      React.createElement(
        "div",
        { style: { position: "relative", maxWidth: "420px", width: "100%", background: "#0F1D32", border: "1px solid #1E3A5F", borderTop: "2px solid #0EA5E9", borderRadius: "12px", padding: "32px 28px", boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6)", textAlign: "center" } },
        React.createElement("h2", { style: { fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 500, color: "#F1F5F9", margin: "0 0 12px", letterSpacing: "-0.01em" } }, "Confirm it\u2019s you"),
        inner,
        err ? React.createElement("div", { role: "alert", style: { color: "#F87171", fontSize: "13px", marginTop: "14px", fontFamily: "'DM Sans', sans-serif" } }, err) : null
      )
    );
  }
  function HubNotifBell({ hubSession }) {
    var _items = useState(null);
    var items = _items[0];
    var setItems = _items[1];
    var _open = useState(false);
    var open = _open[0];
    var setOpen = _open[1];
    var wrapRef = useRef(null);
    var load = useCallback(function() {
      return fetch(hubSession.supabaseUrl + "/rest/v1/vault_client_notifications?user_id=eq." + hubSession.userId + "&channel_in_app=eq.true&select=id,kind,title,body,status_band,created_at,read_at&order=created_at.desc&limit=12", {
        headers: { "apikey": hubSession.anon, "Authorization": "Bearer " + hubSession.token, "Accept": "application/json" }
      }).then(function(r) {
        return r.ok ? r.json() : null;
      }).then(function(rows2) {
        if (Array.isArray(rows2)) setItems(rows2);
      }).catch(function(e) {
        console.warn("[NOTIF-PREFS-UI-001] bell read failed", e);
      });
    }, [hubSession]);
    useEffect(function() {
      load();
      var t = setInterval(load, 3e5);
      return function() {
        clearInterval(t);
      };
    }, [load]);
    useEffect(function() {
      if (!open) return;
      function onDocClick(e) {
        if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
      }
      function onKey(e) {
        if (e.key === "Escape") setOpen(false);
      }
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onKey);
      return function() {
        document.removeEventListener("mousedown", onDocClick);
        document.removeEventListener("keydown", onKey);
      };
    }, [open]);
    function markDisplayedRead() {
      var unread = (items || []).filter(function(n) {
        return !n.read_at;
      });
      if (!unread.length) return;
      var ids = unread.map(function(n) {
        return n.id;
      });
      var now = (/* @__PURE__ */ new Date()).toISOString();
      fetch(hubSession.supabaseUrl + "/rest/v1/vault_client_notifications?id=in.(" + ids.join(",") + ")&read_at=is.null", {
        method: "PATCH",
        headers: { "apikey": hubSession.anon, "Authorization": "Bearer " + hubSession.token, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({ read_at: now })
      }).then(function(r) {
        if (r.ok) setItems(function(prev) {
          return (prev || []).map(function(n) {
            return n.read_at ? n : Object.assign({}, n, { read_at: now });
          });
        });
      }).catch(function(e) {
        console.warn("[NOTIF-PREFS-UI-001] mark-read failed", e);
      });
    }
    function toggle() {
      var next = !open;
      setOpen(next);
      if (next) markDisplayedRead();
    }
    var unreadCount = (items || []).filter(function(n) {
      return !n.read_at;
    }).length;
    var bellChildren = [
      React.createElement(
        "svg",
        { key: "i", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" },
        React.createElement("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }),
        React.createElement("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })
      )
    ];
    if (unreadCount > 0) {
      bellChildren.push(React.createElement("span", {
        key: "n",
        "aria-hidden": "true",
        style: { position: "absolute", top: "2px", right: "2px", minWidth: "15px", height: "15px", padding: "0 3px", borderRadius: "999px", background: "#0EA5E9", color: "#fff", fontSize: "9px", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", lineHeight: 1 }
      }, unreadCount > 9 ? "9+" : String(unreadCount)));
    }
    var list = null;
    if (open) {
      var rows = (items || []).map(function(n) {
        return React.createElement(
          "div",
          { key: n.id, style: { padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "8px", alignItems: "flex-start" } },
          React.createElement("span", { "aria-hidden": "true", style: { flexShrink: 0, marginTop: "5px", width: "7px", height: "7px", borderRadius: "50%", background: n.read_at ? "rgba(148,163,184,0.35)" : "#0EA5E9" } }),
          React.createElement(
            "div",
            { style: { minWidth: 0 } },
            React.createElement("div", { style: { color: "#F1F5F9", fontSize: "12px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4, wordBreak: "break-word" } }, n.title || "Vault update"),
            n.body ? React.createElement("div", { style: { color: "#94A3B8", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.45, marginTop: "2px", wordBreak: "break-word" } }, n.body) : null,
            React.createElement("div", { style: { color: "#64748B", fontSize: "10px", fontFamily: "'DM Mono', monospace", marginTop: "4px" } }, hubVaultDate(n.created_at))
          )
        );
      });
      list = React.createElement(
        "div",
        {
          role: "region",
          "aria-label": "Vault notifications",
          style: { position: "absolute", top: "calc(100% + 8px)", right: 0, width: "320px", maxWidth: "86vw", background: "#0F1D32", border: "1px solid #1E3A5F", borderRadius: "10px", boxShadow: "0 16px 40px rgba(0,0,0,0.5)", zIndex: 60, overflow: "hidden" }
        },
        React.createElement("div", { style: { padding: "10px 14px", borderBottom: "1px solid #1E3A5F", color: "#94A3B8", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace" } }, "Vault notifications"),
        React.createElement(
          "div",
          { style: { maxHeight: "320px", overflowY: "auto" } },
          rows.length ? rows : React.createElement(
            "div",
            { style: { padding: "18px 14px", color: "#64748B", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 } },
            "No notifications yet. We\u2019ll post here when a change in the law triggers a re-check of your monitored documents."
          )
        ),
        React.createElement("a", {
          href: "/operational/documents/#notifications",
          style: { display: "block", padding: "10px 14px", borderTop: "1px solid #1E3A5F", color: "#0EA5E9", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }
        }, "Notification settings \u2192")
      );
    }
    return React.createElement(
      "div",
      { ref: wrapRef, style: { position: "relative" } },
      React.createElement("button", {
        type: "button",
        onClick: toggle,
        "aria-haspopup": "true",
        "aria-expanded": open ? "true" : "false",
        "aria-label": "Vault notifications" + (unreadCount ? " (" + unreadCount + " unread)" : ""),
        style: { position: "relative", background: "transparent", border: "none", color: open ? "#F1F5F9" : "#94A3B8", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px" }
      }, bellChildren),
      list
    );
  }
  function hubAlertsDaysUntil(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    var now = /* @__PURE__ */ new Date();
    var a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    var b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((a - b) / 864e5);
  }
  var HUB_ALERTS_CARD_STYLE = { background: "#0F1D32", border: "1px solid #1E3A5F", borderLeft: "2px solid rgba(14,165,233,0.3)", borderRadius: "12px", padding: "14px 16px" };
  var HUB_ALERTS_TOP_STYLE = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" };
  var HUB_ALERTS_TITLE_STYLE = { fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: "#F1F5F9", wordBreak: "break-word" };
  var HUB_ALERTS_SUB_STYLE = { marginTop: "3px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#94A3B8", lineHeight: 1.5, wordBreak: "break-word" };
  var HUB_ALERTS_META_STYLE = { marginTop: "9px", display: "flex", flexWrap: "wrap", gap: "6px 8px", alignItems: "center" };
  var HUB_ALERTS_MONO_STYLE = { fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#64748B", letterSpacing: "0.02em" };
  var HUB_ALERTS_FLAG_BASE = { display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", letterSpacing: "0.02em", padding: "2px 9px", borderRadius: "999px", border: "1px solid #1E3A5F", background: "#0A1628", color: "#94A3B8" };
  var HUB_ALERTS_FLAG_OVERDUE = { color: "#F87171", borderColor: "rgba(248,113,113,0.32)", background: "rgba(248,113,113,0.08)" };
  var HUB_ALERTS_FLAG_DUE = { color: "#0EA5E9", borderColor: "rgba(14,165,233,0.3)", background: "rgba(14,165,233,0.12)" };
  var HUB_ALERTS_FLAG_ICO = { fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0EA5E9", borderColor: "rgba(14,165,233,0.3)", background: "rgba(14,165,233,0.12)" };
  var HUB_ALERTS_EMPTY_STYLE = { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6 };
  var HUB_ALERTS_ERR_STYLE = { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" };
  var HUB_ALERTS_LIST_STYLE = { display: "flex", flexDirection: "column", gap: "12px", margin: "2px 0 4px" };
  function hubAlertsFlag(kind, label, key) {
    var extra = kind === "overdue" ? HUB_ALERTS_FLAG_OVERDUE : kind === "due" ? HUB_ALERTS_FLAG_DUE : kind === "ico" ? HUB_ALERTS_FLAG_ICO : null;
    return React.createElement("span", { key, style: extra ? Object.assign({}, HUB_ALERTS_FLAG_BASE, extra) : HUB_ALERTS_FLAG_BASE }, label);
  }
  function hubAlertsMono(text2, key) {
    return React.createElement("span", { key, style: HUB_ALERTS_MONO_STYLE }, text2);
  }
  function hubAlertsCard(id, idx, top, meta) {
    var children = [top];
    if (meta.length) children.push(React.createElement("div", { key: "meta", style: HUB_ALERTS_META_STYLE }, meta));
    return React.createElement("div", { key: id != null ? id : idx, style: HUB_ALERTS_CARD_STYLE }, children);
  }
  var HUB_ALERTS_BAND_RED = { color: "#F87171", borderColor: "rgba(248,113,113,0.32)", background: "rgba(248,113,113,0.08)" };
  var HUB_ALERTS_BAND_AMBER = { color: "#D97706", borderColor: "rgba(217,119,6,0.34)", background: "rgba(217,119,6,0.10)" };
  var HUB_ALERTS_BAND_GREEN = { color: "#22C55E", borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)" };
  var HUB_ALERTS_LINK_STYLE = { fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#38BDF8", textDecoration: "none", fontWeight: 600 };
  var HUB_ALERTS_FOOT_STYLE = { marginTop: "10px", color: "#64748B", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", lineHeight: 1.5 };
  function hubAlertsTonePill(tone, label, key) {
    if (label == null || label === "") return null;
    var extra = tone === "red" ? HUB_ALERTS_BAND_RED : tone === "amber" ? HUB_ALERTS_BAND_AMBER : tone === "green" ? HUB_ALERTS_BAND_GREEN : tone === "blue" ? HUB_ALERTS_FLAG_DUE : null;
    return React.createElement("span", { key, style: extra ? Object.assign({}, HUB_ALERTS_FLAG_BASE, extra) : HUB_ALERTS_FLAG_BASE }, label);
  }
  function hubAlertsBandPill(band, key) {
    if (band == null || band === "") return null;
    var b = String(band).toLowerCase();
    var tone = b === "red" || b === "amber" || b === "green" ? b : "idle";
    return hubAlertsTonePill(tone, b.charAt(0).toUpperCase() + b.slice(1), key);
  }
  function hubAlertsPriorityPill(priority, key) {
    if (priority == null || priority === "") return null;
    var p = String(priority).toLowerCase();
    var tone = /^(high|urgent|critical|1)$/.test(p) ? "red" : /^(medium|med|moderate|2)$/.test(p) ? "amber" : /^(low|routine|3)$/.test(p) ? "green" : "idle";
    return hubAlertsTonePill(tone, hubAceiHumanise(priority), key);
  }
  function hubAlertsSeverityPill(alertClass, key) {
    if (alertClass == null || alertClass === "") return null;
    var n = Number(alertClass);
    if (n === 1) return hubAlertsTonePill("red", "High", key);
    if (n === 2) return hubAlertsTonePill("amber", "Medium", key);
    return hubAlertsTonePill("idle", hubAceiHumanise(alertClass), key);
  }
  function hubAlertsSlaChip(iso, key) {
    var d = hubAlertsDaysUntil(iso);
    if (d == null || d < 0) return null;
    return React.createElement("span", { key, style: HUB_VAULT_CHIP_STYLE }, d === 0 ? "Due today" : d + (d === 1 ? " day left" : " days left"));
  }
  function hubAlertsLink(url, label, key) {
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) return null;
    return React.createElement("a", { key, href: url, target: "_blank", rel: "noopener noreferrer", style: HUB_ALERTS_LINK_STYLE }, label);
  }
  function hubAlertsPenalty(v) {
    if (v == null || String(v).trim() === "") return null;
    var n = typeof v === "number" ? v : Number(String(v).replace(/[£,\s]/g, ""));
    if (!isNaN(n) && isFinite(n)) return "\xA3" + n.toLocaleString("en-GB");
    return String(v);
  }
  function hubAlertsCardTopEl(title, sub, pillEl) {
    var main = [React.createElement("div", { key: "t", style: HUB_ALERTS_TITLE_STYLE }, title)];
    if (sub) main.push(React.createElement("div", { key: "s", style: HUB_ALERTS_SUB_STYLE }, sub));
    return React.createElement(
      "div",
      { key: "top", style: HUB_ALERTS_TOP_STYLE },
      React.createElement("div", { key: "main", style: { minWidth: 0 } }, main),
      pillEl || null
    );
  }
  function hubAlertsCategoryHeading(title, count, error) {
    var text2 = !error && count != null ? title + " \xB7 " + count : title;
    return React.createElement("div", { key: "h", style: HUB_ACEI_SECTION_H }, text2);
  }
  function hubAlertsCategoryCard(sectionKey, title, count, error, items, emptyText, footer) {
    var children = [hubAlertsCategoryHeading(title, count, error)];
    if (error) {
      children.push(React.createElement("div", { key: "err", style: HUB_ALERTS_ERR_STYLE }, "Alerts are temporarily unavailable."));
    } else if (!items.length) {
      children.push(React.createElement("div", { key: "empty", style: HUB_ALERTS_EMPTY_STYLE }, emptyText));
    } else {
      children.push(React.createElement("div", { key: "list", style: HUB_ALERTS_LIST_STYLE }, items));
    }
    if (!error && footer) children.push(React.createElement("div", { key: "foot", style: HUB_ALERTS_FOOT_STYLE }, footer));
    return React.createElement("div", { key: sectionKey, style: { marginBottom: "24px" } }, children);
  }
  function hubAlertsContractNotif(n, idx) {
    var title = n.title || (n.kind ? hubAceiHumanise(n.kind) : "Contract update");
    var top = hubAlertsCardTopEl(title, n.body || null, hubAlertsBandPill(n.status_band, "band"));
    var meta = [];
    if (n.created_at) meta.push(hubAlertsMono(hubVaultDate(n.created_at), "dt"));
    return hubAlertsCard("cn-" + (n.id != null ? n.id : idx), idx, top, meta);
  }
  function hubAlertsContractForward(f, idx) {
    var sub = f.affected_category ? hubAceiHumanise(f.affected_category) : null;
    var top = hubAlertsCardTopEl(f.source_title || "Forward change", sub, hubVaultStatusPill(f.status, "st"));
    var meta = [];
    if (f.commencement_date) meta.push(hubAlertsMono("Commences " + hubVaultDate(f.commencement_date), "cm"));
    if (f.sla_deadline) {
      meta.push(hubAlertsMono("SLA " + hubVaultDate(f.sla_deadline), "sla"));
      var chip = hubAlertsSlaChip(f.sla_deadline, "slac");
      if (chip) meta.push(chip);
    }
    return hubAlertsCard("cf-" + (f.id != null ? f.id : idx), idx, top, meta);
  }
  function hubAlertsContractDoc(c, idx) {
    var title = c.role_title || c.employee_ref || "Contract";
    var top = hubAlertsCardTopEl(title, c.key_finding ? truncate(c.key_finding, 160) : null, hubAlertsBandPill(c.status_band, "band"));
    var meta = [];
    if (c.critical_gaps != null) meta.push(hubAlertsMono(c.critical_gaps === 1 ? "1 critical gap" : c.critical_gaps + " critical gaps", "cg"));
    if (c.compliance_score != null && c.compliance_score !== "") meta.push(hubAlertsMono("Score " + c.compliance_score, "cs"));
    return hubAlertsCard("cc-" + (c.id != null ? c.id : idx), idx, top, meta);
  }
  function hubAlertsContractCard(contract, error) {
    var items = [];
    var notifs = contract.notifications || [];
    for (var i = 0; i < notifs.length; i++) items.push(hubAlertsContractNotif(notifs[i], i));
    var fwd = contract.forward || [];
    for (var j = 0; j < fwd.length; j++) items.push(hubAlertsContractForward(fwd[j], j));
    var docs = contract.contracts || [];
    for (var k = 0; k < docs.length; k++) items.push(hubAlertsContractDoc(docs[k], k));
    return hubAlertsCategoryCard(
      "contract",
      "Contract Alerts",
      contract.count,
      error,
      items,
      "No contract alerts \u2014 your monitored contracts are up to date.",
      null
    );
  }
  function hubAlertsStatuteHorizon(h, idx) {
    var sub = h.parliament_stage || h.status || null;
    var top = hubAlertsCardTopEl(h.legislation_short_name || "Legislation", sub, hubAlertsPriorityPill(h.priority, "pri"));
    var meta = [];
    if (h.expected_enactment) meta.push(hubAlertsMono("Coming into force " + hubVaultDate(h.expected_enactment), "ef"));
    if (h.relevant_to_org === true) meta.push(hubAlertsFlag("due", "Affects your contracts", "rel"));
    var link = hubAlertsLink(h.source_url, "Source \u2192", "src");
    if (link) meta.push(link);
    return hubAlertsCard("sh-" + (h.id != null ? h.id : idx), idx, top, meta);
  }
  function hubAlertsStatuteUpcoming(u, idx) {
    var top = hubAlertsCardTopEl(u.short_title || "Statute", u.obligations_summary ? truncate(u.obligations_summary, 160) : null, null);
    var meta = [];
    if (u.commencement_date) meta.push(hubAlertsMono("Commences " + hubVaultDate(u.commencement_date), "cm"));
    var link = hubAlertsLink(u.legislation_gov_url, "legislation.gov.uk \u2192", "src");
    if (link) meta.push(link);
    return hubAlertsCard("su-" + (u.id != null ? u.id : idx), idx, top, meta);
  }
  function hubAlertsStatuteAlert(a, idx) {
    var top = hubAlertsCardTopEl(a.title || "Alert", a.summary ? truncate(a.summary, 160) : null, hubAlertsSeverityPill(a.alert_class, "sev"));
    var meta = [];
    if (a.alert_type) meta.push(hubAlertsMono(hubAceiHumanise(a.alert_type), "typ"));
    if (a.sla_deadline) {
      meta.push(hubAlertsMono("SLA " + hubVaultDate(a.sla_deadline), "sla"));
      var chip = hubAlertsSlaChip(a.sla_deadline, "slac");
      if (chip) meta.push(chip);
    }
    var link = hubAlertsLink(a.source_url, "Source \u2192", "src");
    if (link) meta.push(link);
    return hubAlertsCard("sa-" + (a.id != null ? a.id : idx), idx, top, meta);
  }
  function hubAlertsStatuteCard(statute, error) {
    var items = [];
    var hz = statute.horizon || [];
    for (var i = 0; i < hz.length; i++) items.push(hubAlertsStatuteHorizon(hz[i], i));
    var up = statute.upcoming || [];
    for (var j = 0; j < up.length; j++) items.push(hubAlertsStatuteUpcoming(up[j], j));
    var al = statute.alerts || [];
    for (var k = 0; k < al.length; k++) items.push(hubAlertsStatuteAlert(al[k], k));
    return hubAlertsCategoryCard(
      "statute",
      "Statute & Legislation",
      statute.count,
      error,
      items,
      "No statute changes flagged right now.",
      null
    );
  }
  function hubAlertsEnforcementEvent(e, idx) {
    var sub = e.action_type ? hubAceiHumanise(e.action_type) : null;
    var top = hubAlertsCardTopEl(e.organisation || "Enforcement action", sub, null);
    var meta = [];
    if (e.sector) meta.push(hubAlertsMono(hubAceiHumanise(e.sector), "sec"));
    var pen = hubAlertsPenalty(e.penalty_amount);
    if (pen) meta.push(hubAlertsMono(pen, "pen"));
    if (e.date_issued) meta.push(hubAlertsMono(hubVaultDate(e.date_issued), "dt"));
    var link = hubAlertsLink(e.source_url, "Source \u2192", "src");
    if (link) meta.push(link);
    return hubAlertsCard("ee-" + (e.id != null ? e.id : idx), idx, top, meta);
  }
  function hubAlertsEnforcementCard(enf, error) {
    var items = [];
    var events = enf.events || [];
    for (var i = 0; i < events.length; i++) items.push(hubAlertsEnforcementEvent(events[i], i));
    var footer = null;
    if (!error) {
      var bits = [];
      if (enf.note) bits.push(enf.note);
      if (enf.data_current_through) bits.push("Data current through " + hubVaultDate(enf.data_current_through));
      if (bits.length) footer = bits.join("  \xB7  ");
    }
    return hubAlertsCategoryCard(
      "enforcement",
      "Enforcement & Regulatory",
      enf.count,
      error,
      items,
      "No recent enforcement activity in your categories.",
      footer
    );
  }
  function HubAlertsFacet({ hubSession }) {
    var _state = useState({ status: "loading", error: false, alerts: null });
    var state = _state[0];
    var setState = _state[1];
    useEffect(function() {
      var alive = true;
      if (!hubSession || !hubSession.functionsBase || !hubSession.token) {
        setState({ status: "ready", error: true, alerts: null });
        return;
      }
      (async function() {
        var alerts2 = null, alertsError = null;
        try {
          var res = await fetch(hubSession.functionsBase + "/operational-alerts", {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + hubSession.token,
              "apikey": hubSession.anon,
              "Content-Type": "application/json"
            },
            body: "{}"
          });
          if (!res.ok) {
            alertsError = new Error("operational-alerts " + res.status);
          } else {
            alerts2 = await res.json();
          }
        } catch (e) {
          alertsError = e;
        }
        if (!alive) return;
        if (alertsError || !alerts2) {
          console.warn("[OOX-001] Alerts facet: operational-alerts invoke failed", alertsError);
          setState({ status: "ready", error: true, alerts: null });
          return;
        }
        setState({ status: "ready", error: false, alerts: alerts2 });
      })();
      return function() {
        alive = false;
      };
    }, [hubSession]);
    if (state.status === "loading") {
      return React.createElement("div", { style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", padding: "8px 0" } }, "Loading your alerts\u2026");
    }
    var alerts = state.alerts || {};
    return React.createElement(
      "div",
      { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } },
      hubAlertsContractCard(alerts.contract || {}, state.error),
      // §2.2
      hubAlertsStatuteCard(alerts.statute || {}, state.error),
      // §2.3
      hubAlertsEnforcementCard(alerts.enforcement || {}, state.error)
      // §2.4
    );
  }
  function hubIntelSanitiseHtml(html2) {
    if (html2 == null || html2 === "") return "";
    try {
      return purify.sanitize(String(html2), {
        ALLOWED_TAGS: ["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "h3", "h4", "a", "span"],
        ALLOWED_ATTR: ["href"],
        ALLOWED_URI_REGEXP: /^https?:\/\//i
      });
    } catch (e) {
      console.warn("[OOX-001] Intelligence: sanitise failed", e);
      return "";
    }
  }
  function hubIntelText(v) {
    if (v == null) return "";
    if (Array.isArray(v)) return v.filter(function(x) {
      return x != null && x !== "";
    }).map(String).join("\n");
    if (typeof v === "object") {
      try {
        return JSON.stringify(v);
      } catch (e) {
        return "";
      }
    }
    return String(v);
  }
  var HUB_INTEL_CAVEAT_STYLE = { background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.28)", borderRadius: "10px", padding: "11px 14px", marginBottom: "18px", color: "#7DD3FC", fontFamily: "'DM Sans', sans-serif", fontSize: "12.5px", lineHeight: 1.55 };
  var HUB_INTEL_CARD_STYLE = { background: "#0F1D32", border: "1px solid #1E3A5F", borderLeft: "2px solid rgba(14,165,233,0.3)", borderRadius: "12px", padding: "16px 18px" };
  var HUB_INTEL_CARD_TRACKING_STYLE = { borderColor: "rgba(14,165,233,0.45)", borderLeftColor: "#38BDF8", background: "rgba(14,165,233,0.06)" };
  var HUB_INTEL_LIST_STYLE = { display: "flex", flexDirection: "column", gap: "14px", margin: "2px 0 4px" };
  var HUB_INTEL_TOP_STYLE = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" };
  var HUB_INTEL_TITLE_STYLE = { fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 700, color: "#F1F5F9", wordBreak: "break-word" };
  var HUB_INTEL_META_STYLE = { marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "2px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "12.5px", color: "#94A3B8" };
  var HUB_INTEL_CHIPS_STYLE = { display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" };
  var HUB_INTEL_CHIP_BASE = { display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", letterSpacing: "0.01em", padding: "3px 9px", borderRadius: "999px", border: "1px solid #1E3A5F", background: "#0A1628", color: "#94A3B8" };
  var HUB_INTEL_CHIP_TYPE = { color: "#0EA5E9", borderColor: "rgba(14,165,233,0.3)", background: "rgba(14,165,233,0.12)" };
  var HUB_INTEL_CHIP_HIGH = { color: "#F87171", borderColor: "rgba(248,113,113,0.32)", background: "rgba(248,113,113,0.08)" };
  var HUB_INTEL_SUBHEAD_STYLE = { marginTop: "14px", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#64748B" };
  var HUB_INTEL_SUMMARY_STYLE = { marginTop: "12px", color: "#E2E8F0", fontFamily: "'DM Sans', sans-serif", fontSize: "14.5px", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" };
  var HUB_INTEL_TEXT_STYLE = { marginTop: "6px", color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" };
  var HUB_INTEL_HTML_STYLE = { marginTop: "6px", color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, wordBreak: "break-word" };
  var HUB_INTEL_FOOT_STYLE = { marginTop: "14px", display: "flex", flexWrap: "wrap", gap: "8px 14px", alignItems: "center" };
  var HUB_INTEL_SOURCE_STYLE = { fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#38BDF8", textDecoration: "none", fontWeight: 600 };
  var HUB_INTEL_DISCLAIMER_STYLE = { marginTop: "10px", color: "#64748B", fontFamily: "'DM Sans', sans-serif", fontSize: "11.5px", lineHeight: 1.5, whiteSpace: "pre-wrap" };
  var HUB_INTEL_TRACK_BASE = { flexShrink: 0, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, letterSpacing: "0.01em", padding: "6px 12px", borderRadius: "999px", border: "1px solid #1E3A5F", background: "#0A1628", color: "#CBD5E1", whiteSpace: "nowrap" };
  var HUB_INTEL_TRACK_ON = { color: "#38BDF8", borderColor: "rgba(56,189,248,0.45)", background: "rgba(14,165,233,0.14)" };
  var HUB_INTEL_FILTER_STYLE = { display: "flex", justifyContent: "flex-end", marginBottom: "14px" };
  var HUB_INTEL_TOGGLE_BASE = { cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, padding: "6px 12px", borderRadius: "8px", border: "1px solid #1E3A5F", background: "#0A1628", color: "#94A3B8" };
  var HUB_INTEL_TOGGLE_ON = { color: "#38BDF8", borderColor: "rgba(56,189,248,0.45)", background: "rgba(14,165,233,0.14)" };
  var HUB_INTEL_C1_STYLE = { background: "rgba(14,165,233,0.07)", border: "1px solid rgba(14,165,233,0.28)", borderLeft: "3px solid #38BDF8", borderRadius: "10px", padding: "13px 16px", marginBottom: "18px", color: "#BAE6FD", fontFamily: "'DM Sans', sans-serif", fontSize: "13.5px", lineHeight: 1.6 };
  var HUB_INTEL_GAP_OPEN_STYLE = { cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "12.5px", fontWeight: 600, padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(56,189,248,0.45)", background: "rgba(14,165,233,0.10)", color: "#38BDF8" };
  var HUB_INTEL_GAP_FORM_STYLE = { background: "#0F1D32", border: "1px solid #1E3A5F", borderRadius: "12px", padding: "16px 18px", margin: "14px 0 6px" };
  var HUB_INTEL_GAP_LABEL_STYLE = { display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: "12.5px", fontWeight: 600, color: "#E2E8F0", margin: "12px 0 6px" };
  var HUB_INTEL_GAP_TEXTAREA_STYLE = { width: "100%", minHeight: "84px", resize: "vertical", boxSizing: "border-box", padding: "10px 12px", background: "#0A1628", border: "1px solid #1E3A5F", borderRadius: "8px", color: "#F1F5F9", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" };
  var HUB_INTEL_GAP_INPUT_STYLE = { width: "100%", boxSizing: "border-box", padding: "10px 12px", background: "#0A1628", border: "1px solid #1E3A5F", borderRadius: "8px", color: "#F1F5F9", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" };
  var HUB_INTEL_GAP_SUBMIT_STYLE = { cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 700, padding: "9px 18px", borderRadius: "8px", border: "none", background: "#38BDF8", color: "#042027" };
  var HUB_INTEL_GAP_CANCEL_STYLE = { cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600, padding: "9px 18px", borderRadius: "8px", border: "1px solid #1E3A5F", background: "transparent", color: "#94A3B8" };
  var HUB_INTEL_GAP_CONFIRM_STYLE = { background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "12px", padding: "16px 18px", margin: "14px 0 6px", color: "#6EE7B7", fontFamily: "'DM Sans', sans-serif", fontSize: "13.5px", lineHeight: 1.6 };
  function hubIntelChip(label, variant, key) {
    var extra = variant === "type" ? HUB_INTEL_CHIP_TYPE : variant === "high" ? HUB_INTEL_CHIP_HIGH : null;
    return React.createElement("span", { key, style: extra ? Object.assign({}, HUB_INTEL_CHIP_BASE, extra) : HUB_INTEL_CHIP_BASE }, label);
  }
  var HUB_INTEL_KC_LINE_STYLE = { marginTop: "8px", color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" };
  var HUB_INTEL_KC_META_STYLE = { display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "5px" };
  function hubIntelKcEmpty() {
    return React.createElement("div", { key: "kc-empty", style: HUB_INTEL_KC_LINE_STYLE }, "No key changes listed yet.");
  }
  function hubIntelKcLine(text2, key) {
    return React.createElement("div", { key, style: HUB_INTEL_KC_LINE_STYLE }, text2);
  }
  function hubIntelKcObject(el, key) {
    if (el == null || typeof el !== "object") return null;
    var change = el.change != null ? String(el.change).trim() : "";
    var note = el.note != null ? String(el.note).trim() : "";
    var primary = change !== "" ? change : note;
    if (primary === "") return null;
    var chips = [];
    if (el.severity != null && String(el.severity).trim() !== "") {
      var sev = String(el.severity).trim();
      var high = /high|critical|severe|urgent/i.test(sev);
      chips.push(hubIntelChip("Severity: " + sev, high ? "high" : null, "sev"));
    }
    if (el.expected != null && String(el.expected).trim() !== "") {
      chips.push(hubIntelChip("Expected: " + String(el.expected).trim(), null, "exp"));
    }
    var kids = [React.createElement("div", { key: "c" }, primary)];
    if (chips.length) kids.push(React.createElement("div", { key: "m", style: HUB_INTEL_KC_META_STYLE }, chips));
    return React.createElement("div", { key, style: HUB_INTEL_KC_LINE_STYLE }, kids);
  }
  function hubIntelKeyChanges(raw) {
    if (raw == null) return null;
    var val = raw;
    if (typeof val === "string") {
      var s = val.trim();
      if (s === "") return [hubIntelKcEmpty()];
      try {
        val = JSON.parse(s);
      } catch (e) {
        return [hubIntelKcLine(s, "kc0")];
      }
      if (val == null) return [hubIntelKcEmpty()];
    }
    if (Array.isArray(val)) {
      var nodes = [];
      val.forEach(function(el, i) {
        if (el == null) return;
        if (typeof el === "object") {
          var n = hubIntelKcObject(el, "kc" + i);
          if (n) nodes.push(n);
        } else {
          var t = String(el).trim();
          if (t !== "") nodes.push(hubIntelKcLine(t, "kc" + i));
        }
      });
      return nodes.length ? nodes : [hubIntelKcEmpty()];
    }
    if (typeof val === "object") {
      var one = hubIntelKcObject(val, "kc0");
      return one ? [one] : [hubIntelKcEmpty()];
    }
    var str = String(val).trim();
    return str !== "" ? [hubIntelKcLine(str, "kc0")] : [hubIntelKcEmpty()];
  }
  var HUB_INTEL_DISCUSS_STYLE = { marginTop: "14px", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", background: "transparent", border: "1px solid #0EA5E9", color: "#0EA5E9", borderRadius: "8px", padding: "6px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600 };
  function hubIntelDiscussBtn(seed, key) {
    return React.createElement("button", {
      key: key || "discuss",
      type: "button",
      style: HUB_INTEL_DISCUSS_STYLE,
      "aria-label": "Discuss with Eileen",
      onClick: function() {
        if (typeof window.__klDiscussWithEileen === "function") window.__klDiscussWithEileen(seed);
        else if (typeof window.__klSeedInput === "function") window.__klSeedInput(seed);
      }
    }, "\u2192 Discuss with Eileen");
  }
  function hubIntelCard(row, idx, isTracked, onToggle) {
    var cardStyle = isTracked ? Object.assign({}, HUB_INTEL_CARD_STYLE, HUB_INTEL_CARD_TRACKING_STYLE) : HUB_INTEL_CARD_STYLE;
    var children = [];
    var name = row.legislation_short_name || row.legislation_title || "Untitled instrument";
    var left = [React.createElement("div", { key: "title", style: HUB_INTEL_TITLE_STYLE }, name)];
    var meta = [];
    if (row.parliament_stage) meta.push(React.createElement("span", { key: "stage" }, hubIntelText(row.parliament_stage)));
    if (row.expected_enactment) meta.push(React.createElement("span", { key: "exp" }, "Expected in-force: " + hubIntelText(row.expected_enactment)));
    if (meta.length) left.push(React.createElement("div", { key: "meta", style: HUB_INTEL_META_STYLE }, meta));
    children.push(React.createElement(
      "div",
      { key: "top", style: HUB_INTEL_TOP_STYLE },
      React.createElement("div", { key: "l", style: { minWidth: 0 } }, left),
      React.createElement("button", {
        key: "track",
        type: "button",
        style: isTracked ? Object.assign({}, HUB_INTEL_TRACK_BASE, HUB_INTEL_TRACK_ON) : HUB_INTEL_TRACK_BASE,
        "aria-pressed": isTracked ? "true" : "false",
        "aria-label": (isTracked ? "Untrack " : "Track ") + name,
        onClick: function() {
          onToggle(row);
        }
      }, isTracked ? "\u2713 Tracking" : "+ Track")
    ));
    var chips = [];
    if (row.legislation_type) chips.push(hubIntelChip(hubIntelText(row.legislation_type), "type", "type"));
    if (row.priority) {
      var high = String(row.priority).toLowerCase() === "high";
      chips.push(hubIntelChip("Priority: " + hubIntelText(row.priority), high ? "high" : null, "prio"));
    }
    if (row.status) chips.push(hubIntelChip(hubIntelText(row.status), null, "status"));
    if (chips.length) children.push(React.createElement("div", { key: "chips", style: HUB_INTEL_CHIPS_STYLE }, chips));
    if (row.headline_summary) children.push(React.createElement("div", { key: "sum", style: HUB_INTEL_SUMMARY_STYLE }, hubIntelText(row.headline_summary)));
    var kcNodes = hubIntelKeyChanges(row.key_changes);
    if (kcNodes) {
      children.push(React.createElement("div", { key: "kch", style: HUB_INTEL_SUBHEAD_STYLE }, "Key changes"));
      children.push(React.createElement("div", { key: "kc" }, kcNodes));
    }
    var bi = hubIntelSanitiseHtml(row.business_impact_html);
    if (bi) {
      children.push(React.createElement("div", { key: "bih", style: HUB_INTEL_SUBHEAD_STYLE }, "Business impact"));
      children.push(React.createElement("div", { key: "bi", style: HUB_INTEL_HTML_STYLE, dangerouslySetInnerHTML: { __html: bi } }));
    }
    var ps = hubIntelSanitiseHtml(row.preparatory_steps_html);
    if (ps) {
      children.push(React.createElement("div", { key: "psh", style: HUB_INTEL_SUBHEAD_STYLE }, "Preparatory steps"));
      children.push(React.createElement("div", { key: "ps", style: HUB_INTEL_HTML_STYLE, dangerouslySetInnerHTML: { __html: ps } }));
    }
    if (Array.isArray(row.affected_categories) && row.affected_categories.length) {
      var cats = [];
      row.affected_categories.forEach(function(c, i) {
        if (c != null && c !== "") cats.push(hubIntelChip(hubIntelText(c), null, "cat" + i));
      });
      if (cats.length) children.push(React.createElement("div", { key: "cats", style: HUB_INTEL_CHIPS_STYLE }, cats));
    }
    if (row.source_url && /^https?:\/\//i.test(String(row.source_url))) {
      children.push(React.createElement(
        "div",
        { key: "foot", style: HUB_INTEL_FOOT_STYLE },
        React.createElement("a", { key: "src", href: String(row.source_url), target: "_blank", rel: "noopener noreferrer", style: HUB_INTEL_SOURCE_STYLE }, "Source")
      ));
    }
    if (row.disclaimer_text) children.push(React.createElement("div", { key: "disc", style: HUB_INTEL_DISCLAIMER_STYLE }, hubIntelText(row.disclaimer_text)));
    var discussName = row.legislation_short_name || row.legislation_title || "this legislation";
    children.push(hubIntelDiscussBtn("Explain the " + discussName + " and what it means for my organisation.", "discuss"));
    return React.createElement("div", { key: row.id != null ? row.id : idx, style: cardStyle }, children);
  }
  function HubIntelGapForm({ hubSession, orgId }) {
    var _open = useState(false);
    var open = _open[0];
    var setOpen = _open[1];
    var _desc = useState("");
    var desc = _desc[0];
    var setDesc = _desc[1];
    var _src = useState("");
    var src = _src[0];
    var setSrc = _src[1];
    var _jur = useState("");
    var jur = _jur[0];
    var setJur = _jur[1];
    var _status = useState("idle");
    var status = _status[0];
    var setStatus = _status[1];
    var _err = useState("");
    var err = _err[0];
    var setErr = _err[1];
    var sb = hubSession && hubSession.sb;
    function submit(e) {
      if (e && e.preventDefault) e.preventDefault();
      var description = (desc || "").trim();
      if (!description) return;
      if (!sb || !sb.from || !orgId) {
        console.error("[OOX-001] Intelligence: gap submission blocked (no client/org)");
        setErr("Sorry \u2014 we couldn\u2019t submit that just now. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("submitting");
      setErr("");
      Promise.resolve(sb.from("horizon_gap_submissions").insert({
        org_id: orgId,
        submitted_by: hubSession.userId,
        instrument_description: description,
        source_url_hint: (src || "").trim() || null,
        jurisdiction_hint: (jur || "").trim() || null
      })).then(function(r) {
        if (r && r.error) throw r.error;
        setStatus("success");
      }).catch(function(e2) {
        console.error("[OOX-001] Intelligence: gap submission failed", e2);
        setErr("Sorry \u2014 we couldn\u2019t submit that just now. Please try again.");
        setStatus("error");
      });
    }
    if (status === "success") {
      return React.createElement(
        "div",
        { style: HUB_INTEL_GAP_CONFIRM_STYLE },
        "Thank you \u2014 we\u2019ll check this against Parliament and legislation.gov.uk and update your horizon if it\u2019s a current change. You can add more detail or a source any time."
      );
    }
    if (!open) {
      return React.createElement(
        "div",
        { style: { margin: "16px 0 4px" } },
        React.createElement(
          "button",
          { type: "button", style: HUB_INTEL_GAP_OPEN_STYLE, onClick: function() {
            setOpen(true);
          } },
          "Have we missed something?"
        )
      );
    }
    var fields = [];
    fields.push(React.createElement(
      "div",
      { key: "lead", style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", lineHeight: 1.55 } },
      "This horizon is not a complete record. Tell us about a change you think we\u2019ve missed \u2014 every suggestion is reviewed by a person before anything is added."
    ));
    fields.push(React.createElement("label", { key: "l1", style: HUB_INTEL_GAP_LABEL_STYLE }, "Describe the change you think we\u2019ve missed"));
    fields.push(React.createElement("textarea", {
      key: "t1",
      style: HUB_INTEL_GAP_TEXTAREA_STYLE,
      value: desc,
      onChange: function(ev) {
        setDesc(ev.target.value);
      },
      placeholder: "The bill, regulation, consultation or other change you think is missing\u2026"
    }));
    fields.push(React.createElement("label", { key: "l2", style: HUB_INTEL_GAP_LABEL_STYLE }, "Link to a source (a bill or legislation.gov.uk page), if you have one (optional)"));
    fields.push(React.createElement("input", {
      key: "i2",
      type: "url",
      style: HUB_INTEL_GAP_INPUT_STYLE,
      value: src,
      onChange: function(ev) {
        setSrc(ev.target.value);
      },
      placeholder: "https://\u2026"
    }));
    fields.push(React.createElement("label", { key: "l3", style: HUB_INTEL_GAP_LABEL_STYLE }, "Jurisdiction (optional)"));
    fields.push(React.createElement("input", {
      key: "i3",
      type: "text",
      style: HUB_INTEL_GAP_INPUT_STYLE,
      value: jur,
      onChange: function(ev) {
        setJur(ev.target.value);
      },
      placeholder: "e.g. England & Wales"
    }));
    if (status === "error" && err) {
      fields.push(React.createElement("div", { key: "e", style: { color: "#F87171", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", marginTop: "10px" } }, err));
    }
    var submitDisabled = (desc || "").trim().length === 0 || status === "submitting";
    fields.push(React.createElement(
      "div",
      { key: "act", style: { display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" } },
      React.createElement(
        "button",
        {
          key: "submit",
          type: "submit",
          disabled: submitDisabled,
          style: submitDisabled ? Object.assign({}, HUB_INTEL_GAP_SUBMIT_STYLE, { opacity: 0.5, cursor: "not-allowed" }) : HUB_INTEL_GAP_SUBMIT_STYLE
        },
        status === "submitting" ? "Submitting\u2026" : "Submit"
      ),
      React.createElement("button", {
        key: "cancel",
        type: "button",
        style: HUB_INTEL_GAP_CANCEL_STYLE,
        onClick: function() {
          setOpen(false);
          setErr("");
          setStatus("idle");
        }
      }, "Cancel")
    ));
    return React.createElement("form", { style: HUB_INTEL_GAP_FORM_STYLE, onSubmit: submit }, fields);
  }
  function HubIntelHorizonView({ hubSession }) {
    var _state = useState({ status: "loading", pipeline: [], tracked: /* @__PURE__ */ new Set(), orgId: null, error: false });
    var state = _state[0];
    var setState = _state[1];
    var _trackedOnly = useState(false);
    var trackedOnly = _trackedOnly[0];
    var setTrackedOnly = _trackedOnly[1];
    useEffect(function() {
      var alive = true;
      var sb = hubSession && hubSession.sb;
      if (!sb || !sb.from) {
        setState({ status: "ready", pipeline: [], tracked: /* @__PURE__ */ new Set(), orgId: null, error: true });
        return;
      }
      Promise.all([
        sb.from("kl_legislative_horizon").select("id,legislation_short_name,legislation_title,legislation_type,parliament_stage,expected_enactment,priority,status,headline_summary,key_changes,business_impact_html,preparatory_steps_html,disclaimer_text,affected_categories,source_url,display_order").eq("is_published", true).order("display_order", { ascending: true }),
        sb.from("org_horizon_watchlist").select("horizon_id"),
        sb.rpc("get_my_org_id")
      ]).then(function(res) {
        if (!alive) return;
        var pipe = hubVaultUnwrap(res[0], "kl_legislative_horizon");
        var watch = hubVaultUnwrap(res[1], "org_horizon_watchlist");
        if (res[2] && res[2].error) console.warn("[OOX-001] Intelligence: get_my_org_id failed", res[2].error);
        var orgId = res[2] && !res[2].error ? res[2].data : null;
        var tracked = /* @__PURE__ */ new Set();
        (watch.rows || []).forEach(function(w) {
          if (w && w.horizon_id != null) tracked.add(w.horizon_id);
        });
        setState({ status: "ready", pipeline: pipe.rows || [], tracked, orgId, error: !!pipe.error });
      }).catch(function(e) {
        console.warn("[OOX-001] Intelligence facet: reads failed", e);
        if (alive) setState({ status: "ready", pipeline: [], tracked: /* @__PURE__ */ new Set(), orgId: null, error: true });
      });
      return function() {
        alive = false;
      };
    }, [hubSession]);
    function toggleTrack(row) {
      var sb = hubSession && hubSession.sb;
      if (!sb || !sb.from || row == null || row.id == null) return;
      var id = row.id;
      var wasTracked = state.tracked.has(id);
      var op = wasTracked ? sb.from("org_horizon_watchlist").delete().eq("horizon_id", id) : sb.from("org_horizon_watchlist").insert({ org_id: state.orgId, horizon_id: id, added_by: hubSession.userId });
      Promise.resolve(op).then(function(r) {
        if (r && r.error) throw r.error;
        setState(function(prev) {
          var next = new Set(prev.tracked);
          if (wasTracked) next.delete(id);
          else next.add(id);
          return Object.assign({}, prev, { tracked: next });
        });
      }).catch(function(e) {
        console.warn(wasTracked ? "[OOX-001] Intelligence: untrack failed" : "[OOX-001] Intelligence: track failed", e);
      });
    }
    if (state.status === "loading") {
      return React.createElement("div", { style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", padding: "8px 0" } }, "Loading the forward horizon\u2026");
    }
    var children = [];
    children.push(React.createElement(
      "div",
      { key: "caveat", style: HUB_INTEL_C1_STYLE, role: "note" },
      React.createElement("strong", { key: "s" }, "This is regulatory intelligence to support your decisions \u2014 not legal advice."),
      " It is not a complete record of all applicable law, and the absence of an item here is not assurance that nothing has changed. For advice on your own situation, consult a qualified professional."
    ));
    children.push(React.createElement(HubIntelGapForm, { key: "gap", hubSession, orgId: state.orgId }));
    if (state.error) {
      children.push(React.createElement("div", { key: "err", style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" } }, "\u2014"));
      return React.createElement("div", { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } }, children);
    }
    var pipeline = state.pipeline || [];
    if (!pipeline.length) {
      children.push(React.createElement("div", { key: "empty", style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6 } }, "No forward legislation is currently published."));
      return React.createElement("div", { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } }, children);
    }
    children.push(React.createElement(
      "div",
      { key: "filter", style: HUB_INTEL_FILTER_STYLE },
      React.createElement("button", {
        type: "button",
        style: trackedOnly ? Object.assign({}, HUB_INTEL_TOGGLE_BASE, HUB_INTEL_TOGGLE_ON) : HUB_INTEL_TOGGLE_BASE,
        "aria-pressed": trackedOnly ? "true" : "false",
        onClick: function() {
          setTrackedOnly(!trackedOnly);
        }
      }, trackedOnly ? "Showing tracked only" : "Show tracked only")
    ));
    var rows = trackedOnly ? pipeline.filter(function(r) {
      return r && state.tracked.has(r.id);
    }) : pipeline;
    if (!rows.length) {
      children.push(React.createElement(
        "div",
        { key: "empty2", style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6 } },
        trackedOnly ? "You are not tracking any items yet." : "No forward legislation is currently published."
      ));
      return React.createElement("div", { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } }, children);
    }
    children.push(React.createElement(
      "div",
      { key: "list", style: HUB_INTEL_LIST_STYLE },
      rows.map(function(row, idx) {
        return hubIntelCard(row, idx, state.tracked.has(row.id), toggleTrack);
      })
    ));
    return React.createElement("div", { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } }, children);
  }
  var HUB_INTEL_REQ_COLS = "id,category,requirement_name,statutory_basis,source_act,applies_to,mandatory,jurisdiction_code,description,current_minimum,commencement_status,commencement_note,effective_from,effective_to,is_forward_requirement,version";
  var HUB_INTEL_MAND_BADGE = { flexShrink: 0, display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", padding: "3px 10px", borderRadius: "999px", color: "#F87171", border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.1)" };
  var HUB_INTEL_FILTERBAR_STYLE = { display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" };
  var HUB_INTEL_SELECT_STYLE = { cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, padding: "6px 12px", borderRadius: "8px", border: "1px solid #1E3A5F", background: "#0A1628", color: "#CBD5E1" };
  var HUB_INTEL_TOGGLE_GROUP_STYLE = { display: "inline-flex", gap: "6px" };
  function hubIntelReqCard(row, idx) {
    var children = [];
    var name = hubIntelText(row.requirement_name) || "Untitled requirement";
    var left = [React.createElement("div", { key: "title", style: HUB_INTEL_TITLE_STYLE }, name)];
    var metaBits = [];
    if (row.statutory_basis) metaBits.push(hubIntelText(row.statutory_basis));
    if (row.source_act) metaBits.push(hubIntelText(row.source_act));
    if (metaBits.length) left.push(React.createElement("div", { key: "meta", style: HUB_INTEL_META_STYLE }, metaBits.join(" \xB7 ")));
    children.push(React.createElement(
      "div",
      { key: "top", style: HUB_INTEL_TOP_STYLE },
      React.createElement("div", { key: "l", style: { minWidth: 0 } }, left),
      row.mandatory === true ? React.createElement("span", { key: "mand", style: HUB_INTEL_MAND_BADGE }, "Mandatory") : null
    ));
    var chips = [];
    if (row.category) chips.push(hubIntelChip(hubAceiHumanise(row.category), "type", "cat"));
    if (row.commencement_status) {
      var label = hubAceiHumanise(row.commencement_status);
      if (row.effective_from) label += " \xB7 " + hubVaultDate(row.effective_from);
      chips.push(hubIntelChip(label, null, "cs"));
    }
    if (chips.length) children.push(React.createElement("div", { key: "chips", style: HUB_INTEL_CHIPS_STYLE }, chips));
    if (row.description != null && hubIntelText(row.description) !== "") {
      children.push(React.createElement("div", { key: "desc", style: HUB_INTEL_TEXT_STYLE }, hubIntelText(row.description)));
    }
    var reqName = hubIntelText(row.requirement_name) || "this requirement";
    var reqBasis = hubIntelText(row.statutory_basis);
    children.push(hubIntelDiscussBtn(
      "Explain the requirement '" + reqName + "'" + (reqBasis ? " (" + reqBasis + ")" : "") + " and how we comply.",
      "discuss"
    ));
    return React.createElement("div", { key: row.id != null ? row.id : idx, style: HUB_INTEL_CARD_STYLE }, children);
  }
  function HubIntelInForceView({ hubSession }) {
    var _state = useState({ status: "loading", rows: [], error: false });
    var state = _state[0];
    var setState = _state[1];
    var _cat = useState("all");
    var cat = _cat[0];
    var setCat = _cat[1];
    var _comm = useState("inforce");
    var comm = _comm[0];
    var setComm = _comm[1];
    useEffect(function() {
      var alive = true;
      var sb = hubSession && hubSession.sb;
      if (!sb || !sb.from) {
        setState({ status: "ready", rows: [], error: true });
        return;
      }
      sb.from("regulatory_requirements").select(HUB_INTEL_REQ_COLS).order("category", { ascending: true }).order("requirement_name", { ascending: true }).then(function(res) {
        if (!alive) return;
        var out = hubVaultUnwrap(res, "regulatory_requirements");
        setState({ status: "ready", rows: out.rows || [], error: !!out.error });
      }).catch(function(e) {
        console.warn("[OOX-001] Intelligence in-force: read failed", e);
        if (alive) setState({ status: "ready", rows: [], error: true });
      });
      return function() {
        alive = false;
      };
    }, [hubSession]);
    if (state.status === "loading") {
      return React.createElement("div", { style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", padding: "8px 0" } }, "Loading the statutory catalogue\u2026");
    }
    var children = [];
    children.push(React.createElement(
      "div",
      { key: "caveat", style: HUB_INTEL_CAVEAT_STYLE },
      "In-force statutory requirements \u2014 reference information drawn from the regulatory catalogue. Intelligence, not advice."
    ));
    if (state.error) {
      children.push(React.createElement("div", { key: "err", style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" } }, "\u2014"));
      return React.createElement("div", null, children);
    }
    var all = state.rows || [];
    var byComm = all.filter(function(r) {
      var fwd = r && r.is_forward_requirement === true;
      return comm === "forward" ? fwd : !fwd;
    });
    var catVals = [];
    var seenCat = {};
    all.forEach(function(r) {
      var c = r && r.category;
      if (c != null && c !== "" && !seenCat[c]) {
        seenCat[c] = true;
        catVals.push(c);
      }
    });
    catVals.sort(function(a, b) {
      var ha = hubAceiHumanise(a), hb = hubAceiHumanise(b);
      return ha < hb ? -1 : ha > hb ? 1 : 0;
    });
    var rows = cat === "all" ? byComm : byComm.filter(function(r) {
      return r && String(r.category) === cat;
    });
    var catOptions = [React.createElement("option", { key: "all", value: "all" }, "All categories")];
    catVals.forEach(function(c) {
      catOptions.push(React.createElement("option", { key: c, value: c }, hubAceiHumanise(c)));
    });
    children.push(React.createElement(
      "div",
      { key: "filter", style: HUB_INTEL_FILTERBAR_STYLE },
      React.createElement("select", {
        key: "catsel",
        value: cat,
        "aria-label": "Filter by category",
        onChange: function(e) {
          setCat(e.target.value);
        },
        style: HUB_INTEL_SELECT_STYLE
      }, catOptions),
      React.createElement(
        "div",
        { key: "commtoggle", style: HUB_INTEL_TOGGLE_GROUP_STYLE },
        React.createElement("button", {
          type: "button",
          "aria-pressed": comm === "inforce" ? "true" : "false",
          style: comm === "inforce" ? Object.assign({}, HUB_INTEL_TOGGLE_BASE, HUB_INTEL_TOGGLE_ON) : HUB_INTEL_TOGGLE_BASE,
          onClick: function() {
            setComm("inforce");
          }
        }, "In force"),
        React.createElement("button", {
          type: "button",
          "aria-pressed": comm === "forward" ? "true" : "false",
          style: comm === "forward" ? Object.assign({}, HUB_INTEL_TOGGLE_BASE, HUB_INTEL_TOGGLE_ON) : HUB_INTEL_TOGGLE_BASE,
          onClick: function() {
            setComm("forward");
          }
        }, "Forward-dated")
      )
    ));
    if (!rows.length) {
      children.push(React.createElement(
        "div",
        { key: "empty", style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6 } },
        comm === "forward" ? "No forward-dated statutory requirements match." : "No in-force statutory requirements match."
      ));
      return React.createElement("div", null, children);
    }
    children.push(React.createElement(
      "div",
      { key: "list", style: HUB_INTEL_LIST_STYLE },
      rows.map(function(row, idx) {
        return hubIntelReqCard(row, idx);
      })
    ));
    return React.createElement("div", null, children);
  }
  var HUB_INTEL_VIEWS = [
    { id: "inforce", label: "In force \u2014 statutory requirements" },
    { id: "horizon", label: "Coming into force \u2014 forward pipeline" }
  ];
  var HUB_INTEL_SEG_WRAP = { display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap" };
  var HUB_INTEL_SEG_BASE = { flex: "1 1 220px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600, padding: "9px 14px", borderRadius: "8px", border: "1px solid #1E3A5F", background: "#0A1628", color: "#94A3B8", textAlign: "center" };
  var HUB_INTEL_SEG_ON = { color: "#F1F5F9", borderColor: "#0EA5E9", background: "rgba(14,165,233,0.14)" };
  function HubIntelFacet({ hubSession }) {
    var _view = useState("inforce");
    var view = _view[0];
    var setView = _view[1];
    var seg = React.createElement(
      "div",
      { key: "seg", style: HUB_INTEL_SEG_WRAP, role: "tablist", "aria-label": "Intelligence views" },
      HUB_INTEL_VIEWS.map(function(v) {
        var on = view === v.id;
        return React.createElement("button", {
          key: v.id,
          type: "button",
          role: "tab",
          "aria-selected": on ? "true" : "false",
          style: on ? Object.assign({}, HUB_INTEL_SEG_BASE, HUB_INTEL_SEG_ON) : HUB_INTEL_SEG_BASE,
          onClick: function() {
            setView(v.id);
          }
        }, v.label);
      })
    );
    return React.createElement(
      "div",
      { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } },
      seg,
      view === "inforce" ? React.createElement(HubIntelInForceView, { key: "inforce", hubSession }) : React.createElement(HubIntelHorizonView, { key: "horizon", hubSession })
    );
  }
  var HUB_NOTES_COLS = "id,title,content_plain,pinned,note_type,updated_at,created_at";
  var HUB_NOTES_CARD_STYLE = { background: "#0F1D32", border: "1px solid #1E3A5F", borderRadius: "12px", padding: "16px 18px" };
  var HUB_NOTES_CARD_PINNED = { borderColor: "rgba(14,165,233,0.45)", borderLeft: "2px solid #38BDF8", background: "rgba(14,165,233,0.06)" };
  var HUB_NOTES_LIST_STYLE = { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" };
  var HUB_NOTES_TITLE_STYLE = { fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: "#F1F5F9", wordBreak: "break-word" };
  var HUB_NOTES_SNIPPET_STYLE = { marginTop: "6px", color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "13.5px", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" };
  var HUB_NOTES_META_STYLE = { marginTop: "8px", color: "#64748B", fontFamily: "'DM Mono', monospace", fontSize: "11px" };
  var HUB_NOTES_PIN_TAG = { display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0, color: "#38BDF8", background: "rgba(14,165,233,0.12)", border: "1px solid rgba(56,189,248,0.35)", borderRadius: "999px", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 600, padding: "2px 9px", whiteSpace: "nowrap" };
  var HUB_NOTES_INPUT_STYLE = { width: "100%", background: "#0A1628", border: "1px solid #1E3A5F", borderRadius: "6px", color: "#F1F5F9", fontSize: "13px", padding: "8px 10px", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" };
  var HUB_NOTES_TEXTAREA_STYLE = Object.assign({}, HUB_NOTES_INPUT_STYLE, { resize: "vertical", marginTop: "8px" });
  var HUB_NOTES_ACTIONS_STYLE = { display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" };
  var HUB_NOTES_ERR_STYLE = { color: "#F87171", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", marginTop: "8px" };
  function hubNotesSort(notes) {
    return (notes || []).slice().sort(function(a, b) {
      var ap = a && a.pinned ? 1 : 0;
      var bp = b && b.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      var au = a && a.updated_at ? String(a.updated_at) : "";
      var bu = b && b.updated_at ? String(b.updated_at) : "";
      if (au < bu) return 1;
      if (au > bu) return -1;
      return 0;
    });
  }
  function hubNotesSnippet(text2) {
    if (text2 == null) return "";
    var s = String(text2).trim();
    if (s.length <= 200) return s;
    return s.slice(0, 200).replace(/\s+\S*$/, "") + "\u2026";
  }
  function HubNoteCard({ note, hubSession, onChanged, onRemoved }) {
    var _mode = useState(null);
    var mode = _mode[0];
    var setMode = _mode[1];
    var _title = useState(note.title || "");
    var title = _title[0];
    var setTitle = _title[1];
    var _content = useState(note.content_plain || "");
    var content = _content[0];
    var setContent = _content[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var _err = useState("");
    var err = _err[0];
    var setErr = _err[1];
    function sbReady() {
      var sb = hubSession && hubSession.sb;
      return sb && sb.from ? sb : null;
    }
    function saveEdit() {
      var sb = sbReady();
      if (!sb) return;
      var t = (title || "").trim();
      var c = (content || "").trim();
      if (!c) {
        setErr("Note content cannot be empty.");
        return;
      }
      setBusy(true);
      setErr("");
      sb.from("kl_workspace_notes").update({ title: t || null, content_plain: c, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", note.id).select(HUB_NOTES_COLS).single().then(function(r) {
        setBusy(false);
        if (r && r.error) throw r.error;
        setMode(null);
        onChanged(r && r.data || Object.assign({}, note, { title: t || null, content_plain: c }));
      }).catch(function(e) {
        setBusy(false);
        console.warn("[OOX-001] Notes: edit failed", e);
        setErr("Could not save changes. Please try again.");
      });
    }
    function doDelete() {
      var sb = sbReady();
      if (!sb) return;
      setBusy(true);
      setErr("");
      sb.from("kl_workspace_notes").delete().eq("id", note.id).then(function(r) {
        setBusy(false);
        if (r && r.error) throw r.error;
        onRemoved(note.id);
      }).catch(function(e) {
        setBusy(false);
        console.warn("[OOX-001] Notes: delete failed", e);
        setErr("Could not delete this note. Please try again.");
        setMode(null);
      });
    }
    function togglePin() {
      var sb = sbReady();
      if (!sb) return;
      var next = !note.pinned;
      setBusy(true);
      sb.from("kl_workspace_notes").update({ pinned: next, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", note.id).select(HUB_NOTES_COLS).single().then(function(r) {
        setBusy(false);
        if (r && r.error) throw r.error;
        onChanged(r && r.data || Object.assign({}, note, { pinned: next }));
      }).catch(function(e) {
        setBusy(false);
        console.warn("[OOX-001] Notes: pin toggle failed", e);
      });
    }
    var cardStyle = note.pinned ? Object.assign({}, HUB_NOTES_CARD_STYLE, HUB_NOTES_CARD_PINNED) : HUB_NOTES_CARD_STYLE;
    if (mode === "edit") {
      return React.createElement(
        "div",
        { style: cardStyle },
        React.createElement("input", {
          type: "text",
          value: title,
          maxLength: 200,
          placeholder: "Title (optional)",
          "aria-label": "Note title",
          onChange: function(e) {
            setTitle(e.target.value);
          },
          style: HUB_NOTES_INPUT_STYLE
        }),
        React.createElement("textarea", {
          value: content,
          rows: 4,
          placeholder: "Write your note\u2026",
          "aria-label": "Note content",
          onChange: function(e) {
            setContent(e.target.value);
          },
          style: HUB_NOTES_TEXTAREA_STYLE
        }),
        err ? React.createElement("div", { style: HUB_NOTES_ERR_STYLE }, err) : null,
        React.createElement(
          "div",
          { style: HUB_NOTES_ACTIONS_STYLE },
          React.createElement("button", { type: "button", disabled: busy || !content.trim(), style: HUB_MATTER_BTN_PRIMARY, onClick: saveEdit }, busy ? "Saving\u2026" : "Save"),
          React.createElement("button", { type: "button", disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function() {
            setMode(null);
            setTitle(note.title || "");
            setContent(note.content_plain || "");
            setErr("");
          } }, "Cancel")
        )
      );
    }
    if (mode === "delete") {
      return React.createElement(
        "div",
        { style: cardStyle },
        React.createElement("div", { style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", lineHeight: 1.5 } }, "Delete this note? This cannot be undone."),
        err ? React.createElement("div", { style: HUB_NOTES_ERR_STYLE }, err) : null,
        React.createElement(
          "div",
          { style: HUB_NOTES_ACTIONS_STYLE },
          React.createElement("button", { type: "button", disabled: busy, style: HUB_MATTER_BTN_DANGER, onClick: doDelete }, busy ? "Deleting\u2026" : "Confirm delete"),
          React.createElement("button", { type: "button", disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function() {
            setMode(null);
            setErr("");
          } }, "Cancel")
        )
      );
    }
    var children = [
      React.createElement(
        "div",
        { key: "hdr", style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" } },
        React.createElement(
          "div",
          { style: { minWidth: 0 } },
          React.createElement("div", { style: HUB_NOTES_TITLE_STYLE }, note.title ? note.title : "Untitled")
        ),
        note.pinned ? React.createElement("span", { style: HUB_NOTES_PIN_TAG }, "\u{1F4CC} Pinned") : null
      )
    ];
    var snip = hubNotesSnippet(note.content_plain);
    if (snip) children.push(React.createElement("div", { key: "snip", style: HUB_NOTES_SNIPPET_STYLE }, snip));
    children.push(React.createElement("div", { key: "meta", style: HUB_NOTES_META_STYLE }, "Updated " + hubVaultDate(note.updated_at)));
    if (err) children.push(React.createElement("div", { key: "err", style: HUB_NOTES_ERR_STYLE }, err));
    children.push(React.createElement(
      "div",
      { key: "actions", style: HUB_NOTES_ACTIONS_STYLE },
      React.createElement("button", { type: "button", disabled: busy, style: HUB_MATTER_BTN_STYLE, "aria-pressed": note.pinned ? "true" : "false", onClick: togglePin }, note.pinned ? "Unpin" : "Pin"),
      React.createElement("button", { type: "button", disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function() {
        setTitle(note.title || "");
        setContent(note.content_plain || "");
        setErr("");
        setMode("edit");
      } }, "Edit"),
      React.createElement("button", { type: "button", disabled: busy, style: HUB_MATTER_BTN_DANGER, onClick: function() {
        setErr("");
        setMode("delete");
      } }, "Delete")
    ));
    return React.createElement("div", { style: cardStyle }, children);
  }
  function HubNotesFacet({ hubSession }) {
    var _state = useState({ status: "loading", notes: [], error: false });
    var state = _state[0];
    var setState = _state[1];
    var _nt = useState("");
    var newTitle = _nt[0];
    var setNewTitle = _nt[1];
    var _nc = useState("");
    var newContent = _nc[0];
    var setNewContent = _nc[1];
    var _cb = useState(false);
    var creating = _cb[0];
    var setCreating = _cb[1];
    var _ce = useState("");
    var createErr = _ce[0];
    var setCreateErr = _ce[1];
    useEffect(function() {
      var alive = true;
      var sb = hubSession && hubSession.sb;
      if (!sb || !sb.from) {
        setState({ status: "ready", notes: [], error: true });
        return;
      }
      sb.from("kl_workspace_notes").select(HUB_NOTES_COLS).order("pinned", { ascending: false }).order("updated_at", { ascending: false }).limit(100).then(function(res) {
        if (!alive) return;
        var un = hubVaultUnwrap(res, "kl_workspace_notes");
        if (un.error) {
          setState({ status: "ready", notes: [], error: true });
          return;
        }
        setState({ status: "ready", notes: hubNotesSort(un.rows || []), error: false });
      }).catch(function(e) {
        console.warn("[OOX-001] Notes facet: read failed", e);
        if (alive) setState({ status: "ready", notes: [], error: true });
      });
      return function() {
        alive = false;
      };
    }, [hubSession]);
    function createNote() {
      var sb = hubSession && hubSession.sb;
      if (!sb || !sb.from) return;
      var t = (newTitle || "").trim();
      var c = (newContent || "").trim();
      if (!c) {
        setCreateErr("Write something to save.");
        return;
      }
      setCreating(true);
      setCreateErr("");
      sb.from("kl_workspace_notes").insert({ user_id: hubSession.userId, title: t || null, content_plain: c, content_json: {}, note_type: "note", pinned: false }).select(HUB_NOTES_COLS).single().then(function(r) {
        setCreating(false);
        if (r && r.error) throw r.error;
        var row = r && r.data;
        if (!row) {
          setCreateErr("Could not save the note. Please try again.");
          return;
        }
        setNewTitle("");
        setNewContent("");
        setState(function(prev) {
          return { status: "ready", notes: hubNotesSort([row].concat(prev.notes || [])), error: prev.error };
        });
      }).catch(function(e) {
        setCreating(false);
        console.warn("[OOX-001] Notes: create failed", e);
        setCreateErr("Could not save the note. Please try again.");
      });
    }
    function handleChanged(row) {
      if (!row || row.id == null) return;
      setState(function(prev) {
        var next = (prev.notes || []).map(function(n) {
          return n.id === row.id ? row : n;
        });
        return Object.assign({}, prev, { notes: hubNotesSort(next) });
      });
    }
    function handleRemoved(id) {
      setState(function(prev) {
        return Object.assign({}, prev, { notes: (prev.notes || []).filter(function(n) {
          return n.id !== id;
        }) });
      });
    }
    if (state.status === "loading") {
      return React.createElement("div", { style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", padding: "8px 0" } }, "Loading your notes\u2026");
    }
    var children = [];
    var notes = state.notes || [];
    if (state.error) {
      children.push(React.createElement("div", { key: "err", style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", marginBottom: "16px" } }, "Could not load your notes just now."));
    } else if (!notes.length) {
      children.push(React.createElement("div", { key: "empty", style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, marginBottom: "20px" } }, "No notes yet \u2014 capture your first below."));
    } else {
      children.push(React.createElement(
        "div",
        { key: "list", style: HUB_NOTES_LIST_STYLE },
        notes.map(function(n) {
          return React.createElement(HubNoteCard, { key: n.id, note: n, hubSession, onChanged: handleChanged, onRemoved: handleRemoved });
        })
      ));
    }
    children.push(React.createElement(
      "div",
      { key: "newform", style: HUB_NOTES_CARD_STYLE },
      React.createElement("div", { key: "h", style: HUB_ACEI_SECTION_H }, "New note"),
      React.createElement("input", {
        key: "title",
        type: "text",
        value: newTitle,
        maxLength: 200,
        placeholder: "Title (optional)",
        "aria-label": "New note title",
        onChange: function(e) {
          setNewTitle(e.target.value);
        },
        style: HUB_NOTES_INPUT_STYLE
      }),
      React.createElement("textarea", {
        key: "content",
        value: newContent,
        rows: 3,
        placeholder: "Write a note\u2026",
        "aria-label": "New note content",
        onChange: function(e) {
          setNewContent(e.target.value);
        },
        style: HUB_NOTES_TEXTAREA_STYLE
      }),
      createErr ? React.createElement("div", { key: "err", style: HUB_NOTES_ERR_STYLE }, createErr) : null,
      React.createElement(
        "div",
        { key: "actions", style: HUB_NOTES_ACTIONS_STYLE },
        React.createElement("button", { type: "button", disabled: creating || !newContent.trim(), style: HUB_MATTER_BTN_PRIMARY, onClick: createNote }, creating ? "Saving\u2026" : "Save note")
      )
    ));
    return React.createElement("div", { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } }, children);
  }
  var HUB_CAL_COLS = "id,event_type,title,description,event_date,end_date,recurrence,visibility,status,user_id";
  var HUB_CAL_TYPE_OPTS = [
    { v: "policy_renewal", l: "Policy renewal" },
    { v: "training_deadline", l: "Training deadline" },
    { v: "board_reporting", l: "Board reporting" },
    { v: "appraisal_cycle", l: "Appraisal cycle" },
    { v: "probation_review", l: "Probation review" },
    { v: "custom", l: "Custom" }
  ];
  var HUB_CAL_TYPE_LABELS = { policy_renewal: "Policy renewal", training_deadline: "Training deadline", board_reporting: "Board reporting", appraisal_cycle: "Appraisal cycle", probation_review: "Probation review", custom: "Custom" };
  var HUB_CAL_REC_OPTS = [
    { v: "none", l: "No recurrence" },
    { v: "monthly", l: "Monthly" },
    { v: "quarterly", l: "Quarterly" },
    { v: "biannual", l: "Biannual" },
    { v: "annual", l: "Annual" }
  ];
  var HUB_CAL_REC_LABELS = { monthly: "Monthly", quarterly: "Quarterly", biannual: "Biannual", annual: "Annual" };
  var HUB_CAL_DATE_STYLE = { fontFamily: "'DM Mono', monospace", fontSize: "14px", fontWeight: 700, color: "#F1F5F9", letterSpacing: "0.02em", whiteSpace: "nowrap" };
  var HUB_CAL_DATE_OVERDUE = { color: "#F87171" };
  var HUB_CAL_OVERDUE_TAG = { display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0, color: "#F87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: "999px", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 600, padding: "2px 9px", whiteSpace: "nowrap" };
  var HUB_CAL_TITLE_STYLE = { marginTop: "10px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700, color: "#F1F5F9", wordBreak: "break-word" };
  var HUB_CAL_REC_TAG = { display: "inline-block", fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em", color: "#94A3B8", whiteSpace: "nowrap", background: "rgba(148,163,184,0.08)", border: "1px solid #1E3A5F", padding: "2px 8px", borderRadius: "6px" };
  var HUB_CAL_META_ROW = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "10px" };
  var HUB_CAL_DESC_STYLE = { marginTop: "10px", color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "13.5px", lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" };
  var HUB_CAL_FIELD_LABEL = { color: "#64748B", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", margin: "10px 0 4px" };
  var HUB_CAL_SELECT_STYLE = Object.assign({}, HUB_NOTES_INPUT_STYLE, { cursor: "pointer" });
  var HUB_CAL_CHECKBOX_ROW = { display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "pointer" };
  var HUB_CAL_SHARED_NOTE = { marginTop: "12px", color: "#64748B", fontFamily: "'DM Mono', monospace", fontSize: "11px" };
  var HUB_CAL_STATUS_CLASS = { active: "busy", completed: "ok", snoozed: "idle", cancelled: "idle" };
  function hubCalTypeLabel(t) {
    var k = String(t == null ? "" : t).toLowerCase();
    return HUB_CAL_TYPE_LABELS[k] || hubAceiHumanise(t);
  }
  function hubCalRecLabel(r) {
    var k = String(r == null ? "" : r).toLowerCase();
    if (!k || k === "none") return "";
    return HUB_CAL_REC_LABELS[k] || hubAceiHumanise(r);
  }
  function hubCalTodayStr() {
    var d = /* @__PURE__ */ new Date();
    function p(n) {
      return (n < 10 ? "0" : "") + n;
    }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function hubCalDate(dateStr) {
    if (!dateStr) return "\u2014";
    var s = String(dateStr);
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return s;
    try {
      var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      if (isNaN(d.getTime())) return s;
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch (e) {
      return s;
    }
  }
  function hubCalIsOverdue(ev) {
    if (!ev || !ev.event_date) return false;
    if (String(ev.status) !== "active") return false;
    return String(ev.event_date) < hubCalTodayStr();
  }
  function hubCalSort(events) {
    return (events || []).slice().sort(function(a, b) {
      var ad = a && a.event_date ? String(a.event_date) : "";
      var bd = b && b.event_date ? String(b.event_date) : "";
      if (ad < bd) return -1;
      if (ad > bd) return 1;
      var at = a && a.title ? String(a.title) : "";
      var bt = b && b.title ? String(b.title) : "";
      return at < bt ? -1 : at > bt ? 1 : 0;
    });
  }
  function hubCalStatusPill(status, key) {
    var cls = HUB_CAL_STATUS_CLASS[String(status == null ? "" : status).toLowerCase()] || "idle";
    return React.createElement("span", { key, style: Object.assign({}, HUB_VAULT_PILL_BASE, HUB_VAULT_PILL_STYLES[cls]) }, hubAceiHumanise(status || "active"));
  }
  function hubCalVisTag(vis, key) {
    var isOrg = String(vis == null ? "" : vis).toLowerCase() === "org_shared";
    return React.createElement("span", { key, style: isOrg ? Object.assign({}, HUB_VAULT_VIS_BASE, HUB_VAULT_VIS_ORG) : HUB_VAULT_VIS_BASE }, isOrg ? "org" : "personal");
  }
  function hubCalSelectEl(key, value, onChange, opts, ariaLabel, placeholder) {
    var children = [];
    if (placeholder != null) children.push(React.createElement("option", { key: "__ph", value: "", disabled: true }, placeholder));
    opts.forEach(function(o) {
      children.push(React.createElement("option", { key: o.v, value: o.v }, o.l));
    });
    return React.createElement("select", { key, value, "aria-label": ariaLabel, onChange, style: HUB_CAL_SELECT_STYLE }, children);
  }
  function HubCalEventCard({ event, hubSession, orgId, isOwner, onChanged, onRemoved }) {
    var _mode = useState(null);
    var mode = _mode[0];
    var setMode = _mode[1];
    var _title = useState(event.title || "");
    var title = _title[0];
    var setTitle = _title[1];
    var _etype = useState(event.event_type || "");
    var etype = _etype[0];
    var setEtype = _etype[1];
    var _edate = useState(event.event_date || "");
    var edate = _edate[0];
    var setEdate = _edate[1];
    var _desc = useState(event.description || "");
    var desc = _desc[0];
    var setDesc = _desc[1];
    var _recur = useState(event.recurrence || "none");
    var recur = _recur[0];
    var setRecur = _recur[1];
    var _share = useState(String(event.visibility || "") === "org_shared");
    var share = _share[0];
    var setShare = _share[1];
    var _busy = useState(false);
    var busy = _busy[0];
    var setBusy = _busy[1];
    var _err = useState("");
    var err = _err[0];
    var setErr = _err[1];
    function sbReady() {
      var sb = hubSession && hubSession.sb;
      return sb && sb.from ? sb : null;
    }
    function resetEdit() {
      setTitle(event.title || "");
      setEtype(event.event_type || "");
      setEdate(event.event_date || "");
      setDesc(event.description || "");
      setRecur(event.recurrence || "none");
      setShare(String(event.visibility || "") === "org_shared");
      setErr("");
    }
    function saveEdit() {
      var sb = sbReady();
      if (!sb) return;
      var t = (title || "").trim();
      var d = (edate || "").trim();
      if (!t) {
        setErr("A title is required.");
        return;
      }
      if (!etype) {
        setErr("Choose an event type.");
        return;
      }
      if (!d) {
        setErr("A date is required.");
        return;
      }
      var shareOrg = !!share;
      if (shareOrg && orgId == null) {
        setErr("Could not confirm your organisation \u2014 please try again.");
        return;
      }
      setBusy(true);
      setErr("");
      var recVal = recur && recur !== "none" ? recur : null;
      sb.from("kl_calendar_events").update({ title: t, event_type: etype, event_date: d, description: (desc || "").trim() || null, recurrence: recVal, visibility: shareOrg ? "org_shared" : "personal", org_id: shareOrg ? orgId : null, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", event.id).select(HUB_CAL_COLS).single().then(function(r) {
        setBusy(false);
        if (r && r.error) throw r.error;
        setMode(null);
        onChanged(r && r.data || Object.assign({}, event, { title: t, event_type: etype, event_date: d, description: (desc || "").trim() || null, recurrence: recVal, visibility: shareOrg ? "org_shared" : "personal" }));
      }).catch(function(e) {
        setBusy(false);
        console.warn("[OOX-001] Calendar: edit failed", e);
        setErr("Could not save changes. Please try again.");
      });
    }
    function doDelete() {
      var sb = sbReady();
      if (!sb) return;
      setBusy(true);
      setErr("");
      sb.from("kl_calendar_events").delete().eq("id", event.id).then(function(r) {
        setBusy(false);
        if (r && r.error) throw r.error;
        onRemoved(event.id);
      }).catch(function(e) {
        setBusy(false);
        console.warn("[OOX-001] Calendar: delete failed", e);
        setErr("Could not delete this date. Please try again.");
        setMode(null);
      });
    }
    function setStatus(next) {
      var sb = sbReady();
      if (!sb) return;
      setBusy(true);
      setErr("");
      sb.from("kl_calendar_events").update({ status: next, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", event.id).select(HUB_CAL_COLS).single().then(function(r) {
        setBusy(false);
        if (r && r.error) throw r.error;
        onChanged(r && r.data || Object.assign({}, event, { status: next }));
      }).catch(function(e) {
        setBusy(false);
        console.warn("[OOX-001] Calendar: status update failed", e);
        setErr("Could not update the status. Please try again.");
      });
    }
    var overdue = hubCalIsOverdue(event);
    var cardStyle = overdue ? Object.assign({}, HUB_VAULT_CARD_STYLE, { borderLeft: "2px solid rgba(248,113,113,0.5)" }) : HUB_VAULT_CARD_STYLE;
    if (mode === "edit") {
      return React.createElement(
        "div",
        { style: cardStyle },
        React.createElement("div", { style: HUB_CAL_FIELD_LABEL }, "Title"),
        React.createElement("input", { type: "text", value: title, maxLength: 200, placeholder: "What is due?", "aria-label": "Event title", onChange: function(e) {
          setTitle(e.target.value);
        }, style: HUB_NOTES_INPUT_STYLE }),
        React.createElement("div", { style: HUB_CAL_FIELD_LABEL }, "Type"),
        hubCalSelectEl("etype", etype, function(e) {
          setEtype(e.target.value);
        }, HUB_CAL_TYPE_OPTS, "Event type", "Select type\u2026"),
        React.createElement("div", { style: HUB_CAL_FIELD_LABEL }, "Date"),
        React.createElement("input", { type: "date", value: edate || "", "aria-label": "Event date", onChange: function(e) {
          setEdate(e.target.value);
        }, style: HUB_NOTES_INPUT_STYLE }),
        React.createElement("div", { style: HUB_CAL_FIELD_LABEL }, "Description (optional)"),
        React.createElement("textarea", { value: desc, rows: 3, placeholder: "Add any detail\u2026", "aria-label": "Event description", onChange: function(e) {
          setDesc(e.target.value);
        }, style: HUB_NOTES_TEXTAREA_STYLE }),
        React.createElement("div", { style: HUB_CAL_FIELD_LABEL }, "Recurrence"),
        hubCalSelectEl("erec", recur, function(e) {
          setRecur(e.target.value);
        }, HUB_CAL_REC_OPTS, "Recurrence", null),
        React.createElement(
          "label",
          { style: HUB_CAL_CHECKBOX_ROW },
          React.createElement("input", { type: "checkbox", checked: share, "aria-label": "Share with organisation", onChange: function(e) {
            setShare(e.target.checked);
          } }),
          "Share with organisation"
        ),
        err ? React.createElement("div", { style: HUB_NOTES_ERR_STYLE }, err) : null,
        React.createElement(
          "div",
          { style: HUB_NOTES_ACTIONS_STYLE },
          React.createElement("button", { type: "button", disabled: busy || !title.trim() || !etype || !edate, style: HUB_MATTER_BTN_PRIMARY, onClick: saveEdit }, busy ? "Saving\u2026" : "Save"),
          React.createElement("button", { type: "button", disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function() {
            setMode(null);
            resetEdit();
          } }, "Cancel")
        )
      );
    }
    if (mode === "delete") {
      return React.createElement(
        "div",
        { style: cardStyle },
        React.createElement("div", { style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", lineHeight: 1.5 } }, "Delete this date? This cannot be undone."),
        err ? React.createElement("div", { style: HUB_NOTES_ERR_STYLE }, err) : null,
        React.createElement(
          "div",
          { style: HUB_NOTES_ACTIONS_STYLE },
          React.createElement("button", { type: "button", disabled: busy, style: HUB_MATTER_BTN_DANGER, onClick: doDelete }, busy ? "Deleting\u2026" : "Confirm delete"),
          React.createElement("button", { type: "button", disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function() {
            setMode(null);
            setErr("");
          } }, "Cancel")
        )
      );
    }
    var recLabel = hubCalRecLabel(event.recurrence);
    var children = [
      React.createElement(
        "div",
        { key: "top", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" } },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0 } },
          React.createElement("span", { style: overdue ? Object.assign({}, HUB_CAL_DATE_STYLE, HUB_CAL_DATE_OVERDUE) : HUB_CAL_DATE_STYLE }, hubCalDate(event.event_date)),
          overdue ? React.createElement("span", { style: HUB_CAL_OVERDUE_TAG }, "Overdue") : null
        ),
        hubCalStatusPill(event.status, "st")
      ),
      React.createElement("div", { key: "title", style: HUB_CAL_TITLE_STYLE }, event.title ? event.title : "Untitled"),
      React.createElement(
        "div",
        { key: "meta", style: HUB_CAL_META_ROW },
        React.createElement("span", { key: "type", style: HUB_VAULT_CHIP_STYLE }, hubCalTypeLabel(event.event_type)),
        recLabel ? React.createElement("span", { key: "rec", style: HUB_CAL_REC_TAG }, "\u21BB " + recLabel) : null,
        hubCalVisTag(event.visibility, "vis")
      )
    ];
    if (event.description) children.push(React.createElement("div", { key: "desc", style: HUB_CAL_DESC_STYLE }, event.description));
    if (err) children.push(React.createElement("div", { key: "err", style: HUB_NOTES_ERR_STYLE }, err));
    if (isOwner) {
      var actions = [];
      if (String(event.status) === "active") {
        actions.push(React.createElement("button", { key: "done", type: "button", disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function() {
          setStatus("completed");
        } }, "Mark complete"));
        actions.push(React.createElement("button", { key: "snooze", type: "button", disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function() {
          setStatus("snoozed");
        } }, "Snooze"));
      } else {
        actions.push(React.createElement("button", { key: "reopen", type: "button", disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function() {
          setStatus("active");
        } }, "Reopen"));
      }
      actions.push(React.createElement("button", { key: "edit", type: "button", disabled: busy, style: HUB_MATTER_BTN_STYLE, onClick: function() {
        resetEdit();
        setMode("edit");
      } }, "Edit"));
      actions.push(React.createElement("button", { key: "del", type: "button", disabled: busy, style: HUB_MATTER_BTN_DANGER, onClick: function() {
        setErr("");
        setMode("delete");
      } }, "Delete"));
      children.push(React.createElement("div", { key: "actions", style: HUB_NOTES_ACTIONS_STYLE }, actions));
    } else {
      children.push(React.createElement("div", { key: "shared", style: HUB_CAL_SHARED_NOTE }, "Shared by your organisation \xB7 read-only"));
    }
    return React.createElement("div", { style: cardStyle }, children);
  }
  function HubCalendarFacet({ hubSession }) {
    var _state = useState({ status: "loading", events: [], orgId: null, error: false });
    var state = _state[0];
    var setState = _state[1];
    var _nt = useState("");
    var nTitle = _nt[0];
    var setNTitle = _nt[1];
    var _ntype = useState("");
    var nType = _ntype[0];
    var setNType = _ntype[1];
    var _ndate = useState("");
    var nDate = _ndate[0];
    var setNDate = _ndate[1];
    var _ndesc = useState("");
    var nDesc = _ndesc[0];
    var setNDesc = _ndesc[1];
    var _nrec = useState("none");
    var nRec = _nrec[0];
    var setNRec = _nrec[1];
    var _nshare = useState(false);
    var nShare = _nshare[0];
    var setNShare = _nshare[1];
    var _cb = useState(false);
    var creating = _cb[0];
    var setCreating = _cb[1];
    var _ce = useState("");
    var createErr = _ce[0];
    var setCreateErr = _ce[1];
    useEffect(function() {
      var alive = true;
      var sb = hubSession && hubSession.sb;
      if (!sb || !sb.from) {
        setState({ status: "ready", events: [], orgId: null, error: true });
        return;
      }
      Promise.all([
        sb.from("kl_calendar_events").select(HUB_CAL_COLS).neq("status", "cancelled").order("event_date", { ascending: true }).limit(100),
        sb.rpc("get_my_org_id")
      ]).then(function(res) {
        if (!alive) return;
        var un = hubVaultUnwrap(res[0], "kl_calendar_events");
        if (res[1] && res[1].error) console.warn("[OOX-001] Calendar: get_my_org_id failed", res[1].error);
        var orgId = res[1] && !res[1].error ? res[1].data : null;
        if (un.error) {
          setState({ status: "ready", events: [], orgId, error: true });
          return;
        }
        setState({ status: "ready", events: hubCalSort(un.rows || []), orgId, error: false });
      }).catch(function(e) {
        console.warn("[OOX-001] Calendar facet: reads failed", e);
        if (alive) setState({ status: "ready", events: [], orgId: null, error: true });
      });
      return function() {
        alive = false;
      };
    }, [hubSession]);
    function createEvent() {
      var sb = hubSession && hubSession.sb;
      if (!sb || !sb.from) return;
      var t = (nTitle || "").trim();
      var d = (nDate || "").trim();
      if (!t) {
        setCreateErr("A title is required.");
        return;
      }
      if (!nType) {
        setCreateErr("Choose an event type.");
        return;
      }
      if (!d) {
        setCreateErr("A date is required.");
        return;
      }
      var shareOrg = !!nShare;
      if (shareOrg && state.orgId == null) {
        setCreateErr("Could not confirm your organisation \u2014 please try again.");
        return;
      }
      setCreating(true);
      setCreateErr("");
      var recVal = nRec && nRec !== "none" ? nRec : null;
      sb.from("kl_calendar_events").insert({ user_id: hubSession.userId, event_type: nType, title: t, event_date: d, description: (nDesc || "").trim() || null, recurrence: recVal, status: "active", visibility: shareOrg ? "org_shared" : "personal", org_id: shareOrg ? state.orgId : null }).select(HUB_CAL_COLS).single().then(function(r) {
        setCreating(false);
        if (r && r.error) throw r.error;
        var row = r && r.data;
        if (!row) {
          setCreateErr("Could not save this date. Please try again.");
          return;
        }
        setNTitle("");
        setNType("");
        setNDate("");
        setNDesc("");
        setNRec("none");
        setNShare(false);
        setState(function(prev) {
          return Object.assign({}, prev, { events: hubCalSort([row].concat(prev.events || [])) });
        });
      }).catch(function(e) {
        setCreating(false);
        console.warn("[OOX-001] Calendar: create failed", e);
        setCreateErr("Could not save this date. Please try again.");
      });
    }
    function handleChanged(row) {
      if (!row || row.id == null) return;
      setState(function(prev) {
        var next = (prev.events || []).map(function(n) {
          return n.id === row.id ? row : n;
        });
        return Object.assign({}, prev, { events: hubCalSort(next) });
      });
    }
    function handleRemoved(id) {
      setState(function(prev) {
        return Object.assign({}, prev, { events: (prev.events || []).filter(function(n) {
          return n.id !== id;
        }) });
      });
    }
    if (state.status === "loading") {
      return React.createElement("div", { style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", padding: "8px 0" } }, "Loading your calendar\u2026");
    }
    var children = [];
    var events = state.events || [];
    if (state.error) {
      children.push(React.createElement("div", { key: "err", style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", marginBottom: "16px" } }, "Could not load your calendar just now."));
    } else if (!events.length) {
      children.push(React.createElement("div", { key: "empty", style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6, marginBottom: "20px" } }, "No upcoming dates yet \u2014 add your first below."));
    } else {
      children.push(React.createElement(
        "div",
        { key: "list", style: HUB_NOTES_LIST_STYLE },
        events.map(function(ev) {
          return React.createElement(HubCalEventCard, { key: ev.id, event: ev, hubSession, orgId: state.orgId, isOwner: ev.user_id === hubSession.userId, onChanged: handleChanged, onRemoved: handleRemoved });
        })
      ));
    }
    children.push(React.createElement(
      "div",
      { key: "newform", style: HUB_NOTES_CARD_STYLE },
      React.createElement("div", { key: "h", style: HUB_ACEI_SECTION_H }, "New date"),
      React.createElement("div", { key: "lt", style: HUB_CAL_FIELD_LABEL }, "Title"),
      React.createElement("input", { key: "title", type: "text", value: nTitle, maxLength: 200, placeholder: "What is due?", "aria-label": "New event title", onChange: function(e) {
        setNTitle(e.target.value);
      }, style: HUB_NOTES_INPUT_STYLE }),
      React.createElement("div", { key: "ltype", style: HUB_CAL_FIELD_LABEL }, "Type"),
      hubCalSelectEl("type", nType, function(e) {
        setNType(e.target.value);
      }, HUB_CAL_TYPE_OPTS, "New event type", "Select type\u2026"),
      React.createElement("div", { key: "ld", style: HUB_CAL_FIELD_LABEL }, "Date"),
      React.createElement("input", { key: "date", type: "date", value: nDate, "aria-label": "New event date", onChange: function(e) {
        setNDate(e.target.value);
      }, style: HUB_NOTES_INPUT_STYLE }),
      React.createElement("div", { key: "ldesc", style: HUB_CAL_FIELD_LABEL }, "Description (optional)"),
      React.createElement("textarea", { key: "desc", value: nDesc, rows: 3, placeholder: "Add any detail\u2026", "aria-label": "New event description", onChange: function(e) {
        setNDesc(e.target.value);
      }, style: HUB_NOTES_TEXTAREA_STYLE }),
      React.createElement("div", { key: "lrec", style: HUB_CAL_FIELD_LABEL }, "Recurrence"),
      hubCalSelectEl("rec", nRec, function(e) {
        setNRec(e.target.value);
      }, HUB_CAL_REC_OPTS, "New event recurrence", null),
      React.createElement(
        "label",
        { key: "share", style: HUB_CAL_CHECKBOX_ROW },
        React.createElement("input", { type: "checkbox", checked: nShare, "aria-label": "Share with organisation", onChange: function(e) {
          setNShare(e.target.checked);
        } }),
        "Share with organisation"
      ),
      createErr ? React.createElement("div", { key: "cerr", style: HUB_NOTES_ERR_STYLE }, createErr) : null,
      React.createElement(
        "div",
        { key: "actions", style: HUB_NOTES_ACTIONS_STYLE },
        React.createElement("button", { type: "button", disabled: creating || !nTitle.trim() || !nType || !nDate, style: HUB_MATTER_BTN_PRIMARY, onClick: createEvent }, creating ? "Saving\u2026" : "Save date")
      )
    ));
    return React.createElement("div", { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } }, children);
  }
  var HUB_TICKER_RELEVANT_BADGE = { flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "4px", color: "#38BDF8", background: "rgba(14,165,233,0.12)", border: "1px solid rgba(56,189,248,0.35)", borderRadius: "999px", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 600, padding: "3px 10px", whiteSpace: "nowrap" };
  var HUB_TICKER_BODY_STYLE = { marginTop: "12px", color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.7, wordBreak: "break-word" };
  var HUB_TICKER_BODY_COLLAPSED = Object.assign({}, HUB_TICKER_BODY_STYLE, { maxHeight: "180px", overflow: "hidden" });
  var HUB_TICKER_MOREBTN_STYLE = { marginTop: "8px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600, padding: "4px 0", border: "none", background: "none", color: "#38BDF8" };
  var HUB_TICKER_FILTERS_STYLE = { display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "flex-end", alignItems: "center", marginBottom: "14px" };
  var HUB_TICKER_LONG = 600;
  function hubTickerUrgencyVariant(u) {
    var k = String(u == null ? "" : u).toLowerCase();
    if (k === "act" || k === "action" || k === "urgent" || k === "high") return "high";
    if (k === "monitor" || k === "watch" || k === "review" || k === "low") return "type";
    return null;
  }
  function hubTickerTierLabel(t) {
    if (t == null || t === "") return "";
    var s = String(t).trim();
    return /^\d+$/.test(s) ? "Tier " + s : hubAceiHumanise(s);
  }
  function hubTickerCatChips(cat) {
    var list = Array.isArray(cat) ? cat : cat == null || cat === "" ? [] : [cat];
    var out = [];
    list.forEach(function(c, i) {
      if (c != null && c !== "") out.push(hubIntelChip(hubAceiHumanise(c), null, "cat" + i));
    });
    return out;
  }
  function hubTickerCatMatch(cat, catSet) {
    if (!catSet || !catSet.size || cat == null || cat === "") return false;
    if (Array.isArray(cat)) return cat.some(function(c) {
      return c != null && catSet.has(String(c).toLowerCase());
    });
    return catSet.has(String(cat).toLowerCase());
  }
  function hubTickerLatestCatSet(res) {
    if (!res || res.error || !Array.isArray(res.data) || !res.data.length) {
      if (res && res.error) console.warn("[OOX-001] Ticker: acei_category_scores read failed", res.error);
      return null;
    }
    var rows = res.data;
    var maxWeek = null;
    rows.forEach(function(r) {
      if (r && r.week_start_date != null && (maxWeek === null || String(r.week_start_date) > String(maxWeek))) maxWeek = r.week_start_date;
    });
    var set = /* @__PURE__ */ new Set();
    rows.forEach(function(r) {
      if (!r || r.category == null || r.category === "") return;
      if (maxWeek !== null && String(r.week_start_date) !== String(maxWeek)) return;
      set.add(String(r.category).toLowerCase());
    });
    return set.size ? set : null;
  }
  function hubTickerDistinct(rows, field, lower) {
    var seen = {}, out = [];
    (rows || []).forEach(function(r) {
      if (!r || r[field] == null || r[field] === "") return;
      var v = String(r[field]);
      if (lower) v = v.toLowerCase();
      if (!seen[v]) {
        seen[v] = 1;
        out.push(v);
      }
    });
    var allNum = out.length > 0 && out.every(function(v) {
      return /^\d+$/.test(v);
    });
    return out.sort(function(a, b) {
      return allNum ? Number(a) - Number(b) : a < b ? -1 : a > b ? 1 : 0;
    });
  }
  function hubTickerCard(row, idx, isRelevant, isExpanded, onToggleExpand) {
    var cardStyle = isRelevant ? Object.assign({}, HUB_INTEL_CARD_STYLE, HUB_INTEL_CARD_TRACKING_STYLE) : HUB_INTEL_CARD_STYLE;
    var children = [];
    var left = [React.createElement("div", { key: "title", style: HUB_INTEL_TITLE_STYLE }, hubIntelText(row.event_title) || "Untitled briefing")];
    var dateStr = row.event_date ? hubVaultDate(row.event_date) : "";
    if (dateStr && dateStr !== "\u2014") left.push(React.createElement("div", { key: "meta", style: HUB_INTEL_META_STYLE }, React.createElement("span", { key: "d" }, dateStr)));
    children.push(React.createElement(
      "div",
      { key: "top", style: HUB_INTEL_TOP_STYLE },
      React.createElement("div", { key: "l", style: { minWidth: 0 } }, left),
      isRelevant ? React.createElement("span", { key: "rel", style: HUB_TICKER_RELEVANT_BADGE, title: "Matches a category in your exposure profile" }, "\u25C6 Relevant to your exposure") : null
    ));
    var chips = [];
    var tierLabel = hubTickerTierLabel(row.tier);
    if (tierLabel) chips.push(hubIntelChip(tierLabel, null, "tier"));
    if (row.legislative_urgency != null && String(row.legislative_urgency) !== "") {
      chips.push(hubIntelChip(hubAceiHumanise(row.legislative_urgency), hubTickerUrgencyVariant(row.legislative_urgency), "urg"));
    }
    Array.prototype.push.apply(chips, hubTickerCatChips(row.acei_category));
    if (chips.length) children.push(React.createElement("div", { key: "chips", style: HUB_INTEL_CHIPS_STYLE }, chips));
    var raw = row.briefing_text == null ? "" : String(row.briefing_text);
    var bodyHtml = renderMarkdown(raw);
    if (bodyHtml) {
      var isLong = raw.length > HUB_TICKER_LONG;
      children.push(React.createElement("div", {
        key: "body",
        style: isLong && !isExpanded ? HUB_TICKER_BODY_COLLAPSED : HUB_TICKER_BODY_STYLE,
        dangerouslySetInnerHTML: { __html: bodyHtml }
      }));
      if (isLong) {
        children.push(React.createElement("button", {
          key: "more",
          type: "button",
          style: HUB_TICKER_MOREBTN_STYLE,
          "aria-expanded": isExpanded ? "true" : "false",
          onClick: function() {
            onToggleExpand(row);
          }
        }, isExpanded ? "Show less" : "Show more"));
      }
    }
    if (row.source_url && /^https?:\/\//i.test(String(row.source_url))) {
      children.push(React.createElement(
        "div",
        { key: "foot", style: HUB_INTEL_FOOT_STYLE },
        React.createElement("a", { key: "src", href: String(row.source_url), target: "_blank", rel: "noopener noreferrer", style: HUB_INTEL_SOURCE_STYLE }, "Source")
      ));
    }
    return React.createElement("div", { key: row.id != null ? row.id : idx, style: cardStyle }, children);
  }
  function HubTickerFacet({ hubSession }) {
    var _state = useState({ status: "loading", briefings: [], catSet: null, error: false });
    var state = _state[0];
    var setState = _state[1];
    var _expanded = useState(function() {
      return /* @__PURE__ */ new Set();
    });
    var expanded = _expanded[0];
    var setExpanded = _expanded[1];
    var _tierF = useState("all");
    var tierF = _tierF[0];
    var setTierF = _tierF[1];
    var _urgF = useState("all");
    var urgF = _urgF[0];
    var setUrgF = _urgF[1];
    var _relOnly = useState(false);
    var relOnly = _relOnly[0];
    var setRelOnly = _relOnly[1];
    useEffect(function() {
      var alive = true;
      var sb = hubSession && hubSession.sb;
      if (!sb || !sb.from) {
        setState({ status: "ready", briefings: [], catSet: null, error: true });
        return;
      }
      Promise.all([
        sb.from("ticker_briefings").select("id,event_title,tier,briefing_text,acei_category,event_date,source_url,legislative_urgency,created_at").order("event_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(50),
        sb.from("acei_category_scores").select("category,week_start_date").order("week_start_date", { ascending: false }).limit(60)
      ]).then(function(res) {
        if (!alive) return;
        var feed = hubVaultUnwrap(res[0], "ticker_briefings");
        var catSet2 = hubTickerLatestCatSet(res[1]);
        setState({ status: "ready", briefings: feed.rows || [], catSet: catSet2, error: !!feed.error });
      }).catch(function(e) {
        console.warn("[OOX-001] Ticker facet: reads failed", e);
        if (alive) setState({ status: "ready", briefings: [], catSet: null, error: true });
      });
      return function() {
        alive = false;
      };
    }, [hubSession]);
    function toggleExpand(row) {
      if (row == null || row.id == null) return;
      setExpanded(function(prev) {
        var next = new Set(prev);
        if (next.has(row.id)) next.delete(row.id);
        else next.add(row.id);
        return next;
      });
    }
    if (state.status === "loading") {
      return React.createElement("div", { style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", padding: "8px 0" } }, "Loading the intelligence feed\u2026");
    }
    var children = [];
    children.push(React.createElement(
      "div",
      { key: "caveat", style: HUB_INTEL_CAVEAT_STYLE },
      "Global employment-law intelligence feed. Items matching your exposure profile are highlighted; the full global feed always shows. Intelligence, not advice."
    ));
    if (state.error) {
      children.push(React.createElement("div", { key: "err", style: { color: "#94A3B8", fontFamily: "'DM Sans', sans-serif", fontSize: "13px" } }, "\u2014"));
      return React.createElement("div", { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } }, children);
    }
    var briefings = state.briefings || [];
    if (!briefings.length) {
      children.push(React.createElement("div", { key: "empty", style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6 } }, "No intelligence briefings available yet."));
      return React.createElement("div", { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } }, children);
    }
    var catSet = state.catSet;
    var hasRelevance = !!(catSet && catSet.size);
    var tiers = hubTickerDistinct(briefings, "tier", false);
    var urgencies = hubTickerDistinct(briefings, "legislative_urgency", true);
    var controls = [];
    if (tiers.length > 1) {
      var tierOpts = [{ v: "all", l: "All tiers" }].concat(tiers.map(function(t) {
        return { v: t, l: hubTickerTierLabel(t) };
      }));
      controls.push(hubCalSelectEl("tierf", tierF, function(e) {
        setTierF(e.target.value);
      }, tierOpts, "Filter by tier", null));
    }
    if (urgencies.length > 1) {
      var urgOpts = [{ v: "all", l: "All urgency" }].concat(urgencies.map(function(u) {
        return { v: u, l: hubAceiHumanise(u) };
      }));
      controls.push(hubCalSelectEl("urgf", urgF, function(e) {
        setUrgF(e.target.value);
      }, urgOpts, "Filter by urgency", null));
    }
    if (hasRelevance) {
      controls.push(React.createElement("button", {
        key: "relbtn",
        type: "button",
        style: relOnly ? Object.assign({}, HUB_INTEL_TOGGLE_BASE, HUB_INTEL_TOGGLE_ON) : HUB_INTEL_TOGGLE_BASE,
        "aria-pressed": relOnly ? "true" : "false",
        onClick: function() {
          setRelOnly(!relOnly);
        }
      }, relOnly ? "Showing relevant only" : "Relevant to me only"));
    }
    if (controls.length) children.push(React.createElement("div", { key: "filters", style: HUB_TICKER_FILTERS_STYLE }, controls));
    var rows = briefings.filter(function(r) {
      if (!r) return false;
      if (tierF !== "all" && String(r.tier == null ? "" : r.tier) !== tierF) return false;
      if (urgF !== "all" && String(r.legislative_urgency == null ? "" : r.legislative_urgency).toLowerCase() !== urgF) return false;
      if (relOnly && !hubTickerCatMatch(r.acei_category, catSet)) return false;
      return true;
    });
    if (!rows.length) {
      children.push(React.createElement("div", { key: "empty2", style: { color: "#CBD5E1", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", lineHeight: 1.6 } }, "No briefings match the current filter."));
      return React.createElement("div", { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } }, children);
    }
    children.push(React.createElement(
      "div",
      { key: "list", style: HUB_INTEL_LIST_STYLE },
      rows.map(function(row, idx) {
        return hubTickerCard(row, idx, hubTickerCatMatch(row.acei_category, catSet), expanded.has(row.id), toggleExpand);
      })
    ));
    return React.createElement("div", { style: { maxWidth: "900px", margin: "0 auto", width: "100%" } }, children);
  }
  function HubFacetView({ facet, hubSession, onBack }) {
    var label = HUB_FACET_LABELS[facet] || "Workspace";
    var body = facet === "acei" ? React.createElement(
      "div",
      { style: { flex: 1, overflowY: "auto", padding: "24px" } },
      React.createElement(HubAceiFacet, { hubSession })
    ) : facet === "vault" ? React.createElement(
      "div",
      { style: { flex: 1, overflowY: "auto", padding: "24px" } },
      React.createElement(HubVaultMovedCard, null)
    ) : facet === "alerts" ? React.createElement(
      "div",
      { style: { flex: 1, overflowY: "auto", padding: "24px" } },
      React.createElement(HubAlertsFacet, { hubSession })
    ) : facet === "intelligence" ? React.createElement(
      "div",
      { style: { flex: 1, overflowY: "auto", padding: "24px" } },
      React.createElement(HubIntelFacet, { hubSession })
    ) : facet === "ticker" ? React.createElement(
      "div",
      { style: { flex: 1, overflowY: "auto", padding: "24px" } },
      React.createElement(HubTickerFacet, { hubSession })
    ) : facet === "notes" ? React.createElement(
      "div",
      { style: { flex: 1, overflowY: "auto", padding: "24px" } },
      React.createElement(HubNotesFacet, { hubSession })
    ) : facet === "calendar" ? React.createElement(
      "div",
      { style: { flex: 1, overflowY: "auto", padding: "24px" } },
      React.createElement(HubCalendarFacet, { hubSession })
    ) : React.createElement(
      "div",
      { style: { flex: 1, overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" } },
      React.createElement(
        "div",
        { className: "kl-placeholder-panel", style: { maxWidth: "420px" } },
        React.createElement("div", { className: "kl-placeholder-icon" }, "\u{1F6E0}\uFE0F"),
        React.createElement("div", { className: "kl-placeholder-title" }, label),
        React.createElement("div", { className: "kl-placeholder-body" }, "This area is being wired in \u2014 coming shortly.")
      )
    );
    return React.createElement(
      "div",
      { className: "kl-main" },
      React.createElement(
        "div",
        {
          style: { display: "flex", alignItems: "center", gap: "12px", padding: "14px 24px", borderBottom: "1px solid var(--kl-border, #1E3A5F)", flexShrink: 0 }
        },
        React.createElement("button", {
          type: "button",
          className: "kl-action-btn",
          onClick: onBack,
          "aria-label": "Back to Eileen"
        }, "\u2190 Back to Eileen"),
        React.createElement("div", { style: { fontSize: "15px", fontWeight: 500, color: "#F1F5F9", fontFamily: "'DM Sans', sans-serif" } }, label)
      ),
      body
    );
  }
  function App() {
    const [messages, setMessages] = useState([]);
    const [sessionId, setSessionId] = useState(() => "eileen-" + Date.now() + "-" + Math.random().toString(36).substr(2, 7));
    const [sessionHistory, setSessionHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === "undefined" ? true : window.innerWidth > 768);
    const [activePanel, setActivePanel] = useState(function() {
      try {
        var saved = localStorage.getItem("ailane_kl_active_panel");
        return saved === "notes" || saved === "research" ? saved : null;
      } catch (e) {
        return null;
      }
    });
    function handleSelectPanel(panelId) {
      setActivePanel(panelId);
      try {
        if (panelId) localStorage.setItem("ailane_kl_active_panel", panelId);
        else localStorage.setItem("ailane_kl_active_panel", "");
      } catch (e) {
      }
      saveKlPreferences({ active_panel: panelId || null });
    }
    const [helperDismissed, setHelperDismissed] = useState(function() {
      try {
        return localStorage.getItem("ailane_kl_helper_dismissed") === "1";
      } catch (e) {
        return false;
      }
    });
    function handleHelperDismiss() {
      setHelperDismissed(true);
      try {
        localStorage.setItem("ailane_kl_helper_dismissed", "1");
      } catch (e) {
      }
      saveKlPreferences({ helper_dismissed: true });
    }
    const [hubSession, setHubSession] = useState(null);
    useEffect(function() {
      var alive = true;
      detectHubSession().then(function(s) {
        if (alive) setHubSession(s);
      });
      return function() {
        alive = false;
      };
    }, []);
    const [hasKLSession, setHasKLSession] = useState(false);
    useEffect(function() {
      var alive = true;
      detectKLPass().then(function(v) {
        if (alive) setHasKLSession(!!v);
      });
      return function() {
        alive = false;
      };
    }, []);
    const hubMode = !!hubSession;
    const [hubStepUpNeeded, setHubStepUpNeeded] = useState(false);
    useEffect(function() {
      var alive = true;
      if (!hubSession || !hubSession.sb) {
        setHubStepUpNeeded(false);
        return;
      }
      hubVaultAal2StepUp(hubSession.sb).then(function(needed) {
        if (alive) setHubStepUpNeeded(!!needed);
      });
      return function() {
        alive = false;
      };
    }, [hubSession]);
    const operationalMode = klOperationalMode();
    const hubChrome = hubMode || operationalMode;
    const hasSubscription = hubMode || window.__klAccessType === "subscription" || KL_SUBSCRIPTION_TIERS.indexOf(window.__klTier) >= 0 || !!(hubSession && (KL_SUBSCRIPTION_TIERS.indexOf(hubSession.tier) >= 0 || KL_SUBSCRIPTION_TIERS.indexOf(hubSession.orgTier) >= 0));
    const orgTier = hubSession && hubSession.orgTier;
    const [currentFacet, setCurrentFacet] = useState(null);
    const [pendingEileenSeed, setPendingEileenSeed] = useState(null);
    const [matterRefreshKey, setMatterRefreshKey] = useState(0);
    function handleSelectFacet(id) {
      setCurrentFacet(id);
      if (id && window.location.hash && window.location.hash !== "#/") {
        window.location.hash = "/";
      }
    }
    useEffect(function() {
      if (pendingEileenSeed != null && !currentFacet) {
        var seed = pendingEileenSeed;
        setPendingEileenSeed(null);
        if (typeof window.__klSeedInput === "function") window.__klSeedInput(seed);
      }
    }, [pendingEileenSeed, currentFacet]);
    const [accessType, setAccessType] = useState(window.__klAccessType || null);
    const [tier, setTier] = useState(window.__klTier || window.__klProductType || null);
    const [sessionExpiresAt, setSessionExpiresAt] = useState(window.__klSessionExpiry || null);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [minutesRemaining, setMinutesRemaining] = useState(null);
    const [upsellDismissed, setUpsellDismissed] = useState(false);
    const [floatingNexusOpen, setFloatingNexusOpen] = useState(false);
    const [lang, setLang] = useState(function() {
      try {
        return localStorage.getItem("ailane_kl_lang") || "en";
      } catch (e) {
        return "en";
      }
    });
    function toggleLang() {
      setLang(function(prev) {
        var next = prev === "en" ? "cy" : "en";
        try {
          localStorage.setItem("ailane_kl_lang", next);
        } catch (e) {
        }
        return next;
      });
    }
    const [nearDomain, setNearDomain] = useState(null);
    const nearDomainTimeout = useRef(null);
    function handleDomainHover(domainSlug) {
      setNearDomain(domainSlug);
      if (nearDomainTimeout.current) clearTimeout(nearDomainTimeout.current);
      nearDomainTimeout.current = setTimeout(function() {
        setNearDomain(null);
      }, 5e3);
    }
    function handleDomainLeave() {
      if (nearDomainTimeout.current) clearTimeout(nearDomainTimeout.current);
      nearDomainTimeout.current = setTimeout(function() {
        setNearDomain(null);
      }, 2e3);
    }
    const [nexusState, setNexusState] = useState("dormant");
    const presentingTimerRef = useRef(null);
    const [userType, setUserType] = useState(function() {
      try {
        return localStorage.getItem("ailane_kl_user_type") || null;
      } catch (e) {
        return null;
      }
    });
    const [showQualifier, setShowQualifier] = useState(false);
    const [qualifierShownThisSession, setQualifierShownThisSession] = useState(false);
    const [hasUploadedThisSession, setHasUploadedThisSession] = useState(false);
    const pageLoadTime = useRef(Date.now());
    const [upsellGraceElapsed, setUpsellGraceElapsed] = useState(false);
    useEffect(function() {
      var t = setTimeout(function() {
        setUpsellGraceElapsed(true);
      }, 3e4);
      return function() {
        clearTimeout(t);
      };
    }, []);
    useEffect(function() {
      try {
        var params = new URLSearchParams(window.location.search || "");
        if (params.get("extend") !== "1") return;
        var toast = document.createElement("div");
        toast.textContent = "Session extended \u2014 your expiry and check allowance have been updated.";
        toast.style.cssText = "position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#10B981;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;font-family:DM Sans,sans-serif;z-index:9999;max-width:92%;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:1;transition:opacity 0.4s;";
        document.body.appendChild(toast);
        setTimeout(function() {
          toast.style.opacity = "0";
          setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
          }, 400);
        }, 4500);
        params.delete("extend");
        var qs = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : "") + (window.location.hash || ""));
      } catch (e) {
      }
    }, []);
    const contractPromptShown = useRef(false);
    const [currentView, setCurrentView] = useState(function() {
      var route = getRoute();
      return route.view;
    });
    const [currentDomain, setCurrentDomain] = useState(function() {
      var route = getRoute();
      return route.domain || null;
    });
    useEffect(function() {
      function handleRoute() {
        var route = getRoute();
        if (route.view === "domain") {
          setCurrentView("domain");
          setCurrentDomain(route.domain);
        } else {
          setCurrentView(messages.length > 0 ? "conversation" : "welcome");
          setCurrentDomain(null);
        }
      }
      window.addEventListener("hashchange", handleRoute);
      return function() {
        window.removeEventListener("hashchange", handleRoute);
      };
    }, [messages.length]);
    const loadSessionHistory = useCallback(async function() {
      if (!window.__klToken || !window.__klUserId) return;
      try {
        const resp = await fetch(
          SUPABASE_URL + "/rest/v1/kl_eileen_conversations?user_id=eq." + window.__klUserId + "&select=session_id,user_message,categories_matched,created_at&order=created_at.desc&limit=200",
          { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
        );
        const data = await resp.json();
        if (!Array.isArray(data)) return;
        const grouped = {};
        data.forEach((row) => {
          if (!grouped[row.session_id]) {
            var title = row.user_message ? row.user_message.substring(0, 50) : "(untitled)";
            if (row.categories_matched && row.categories_matched.length > 0) {
              var catKey = row.categories_matched[0];
              if (CATEGORY_TITLES[catKey]) {
                title = CATEGORY_TITLES[catKey];
              }
            }
            grouped[row.session_id] = {
              sessionId: row.session_id,
              title,
              lastActivity: row.created_at,
              dateGroup: classifyDate(row.created_at),
              messageCount: 1
            };
          } else {
            grouped[row.session_id].messageCount++;
          }
        });
        var sessions = Object.values(grouped);
        var categoryTitleValues = Object.values(CATEGORY_TITLES);
        sessions.forEach(function(s) {
          if (s.messageCount > 1 && categoryTitleValues.indexOf(s.title) !== -1) {
            s.title = s.title + " (" + s.messageCount + ")";
          }
        });
        setSessionHistory(sessions.slice(0, 50));
      } catch (err) {
        console.error("Failed to load session history:", err);
      }
    }, []);
    async function loadUserPreferences() {
      if (!window.__klToken || !window.__klUserId) return;
      try {
        var resp = await fetch(
          SUPABASE_URL + "/rest/v1/kl_user_preferences?user_id=eq." + window.__klUserId + "&select=preferences",
          { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
        );
        var data = await resp.json();
        if (Array.isArray(data) && data.length > 0 && data[0].preferences) {
          var prefs = data[0].preferences;
          if (prefs.user_type) {
            setUserType(prefs.user_type);
            try {
              localStorage.setItem("ailane_kl_user_type", prefs.user_type);
            } catch (e) {
            }
          }
          if (prefs.helper_dismissed) {
            setHelperDismissed(true);
            try {
              localStorage.setItem("ailane_kl_helper_dismissed", "1");
            } catch (e) {
            }
          }
          var hasLocalPanel = false;
          try {
            hasLocalPanel = localStorage.getItem("ailane_kl_active_panel") !== null;
          } catch (e) {
          }
          if (!hasLocalPanel && (prefs.active_panel === "notes" || prefs.active_panel === "research")) {
            setActivePanel(prefs.active_panel);
          }
        }
      } catch (err) {
        console.error("Failed to load user preferences:", err);
      }
    }
    useEffect(() => {
      function onReady(e) {
        setAccessType(e.detail.accessType);
        setTier(e.detail.tier);
        setSessionExpiresAt(window.__klSessionExpiry || null);
        loadSessionHistory();
        loadUserPreferences();
      }
      window.addEventListener("ailane-kl-ready", onReady);
      if (window.__klAccessType) {
        loadSessionHistory();
        loadUserPreferences();
      }
      return () => window.removeEventListener("ailane-kl-ready", onReady);
    }, [loadSessionHistory]);
    useEffect(function() {
      if (window.__klToken) ensureInstrumentsMap();
    }, []);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const prefersReducedMotion = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    useEffect(function() {
      if (typeof window === "undefined" || !window.speechSynthesis) return void 0;
      try {
        window.speechSynthesis.getVoices();
      } catch (e) {
      }
      function onVoicesChanged() {
        try {
          window.speechSynthesis.getVoices();
        } catch (e) {
        }
      }
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
      return function() {
        try {
          window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
          window.speechSynthesis.cancel();
        } catch (e) {
        }
      };
    }, []);
    useEffect(() => {
      function onResize() {
        var mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (mobile) {
          setSidebarOpen(false);
        }
      }
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, []);
    useEffect(() => {
      const el = document.getElementById("kl-root");
      if (el) el.classList.toggle("sidebar-collapsed", !sidebarOpen);
    }, [sidebarOpen]);
    useEffect(() => {
      if (!sessionExpiresAt) {
        setMinutesRemaining(null);
        return void 0;
      }
      const expiresAt = new Date(sessionExpiresAt).getTime();
      if (isNaN(expiresAt)) return void 0;
      function update() {
        const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 6e4));
        setMinutesRemaining(diff);
      }
      update();
      const interval = setInterval(update, 6e4);
      return () => clearInterval(interval);
    }, [sessionExpiresAt]);
    async function loadSession(sid) {
      try {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      } catch (e) {
      }
      if (!window.__klToken) return;
      try {
        const resp = await fetch(
          SUPABASE_URL + "/rest/v1/kl_eileen_conversations?session_id=eq." + sid + "&select=user_message,eileen_response,created_at&order=created_at.asc",
          { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
        );
        const data = await resp.json();
        if (!Array.isArray(data)) return;
        const msgs = [];
        data.forEach((row) => {
          msgs.push({ role: "user", content: row.user_message });
          msgs.push({ role: "assistant", content: row.eileen_response });
        });
        setMessages(msgs);
        setSessionId(sid);
      } catch (err) {
        console.error("Failed to load session:", err);
      }
    }
    function newChat() {
      try {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      } catch (e) {
      }
      setSessionId("eileen-" + Date.now() + "-" + Math.random().toString(36).substr(2, 7));
      setMessages([]);
      setCurrentView("welcome");
      setCurrentDomain(null);
      setCurrentFacet(null);
      contractPromptShown.current = false;
      if (window.location.hash && window.location.hash !== "#/") {
        window.location.hash = "/";
      }
    }
    async function sendMessage(text2) {
      const clean = (text2 || "").trim();
      if (!clean || isLoading) return;
      if (currentFacet) setCurrentFacet(null);
      if (currentView === "domain") {
        setCurrentView("conversation");
      }
      setMessages((prev) => [...prev, { role: "user", content: clean }]);
      setIsLoading(true);
      if (presentingTimerRef.current) {
        clearTimeout(presentingTimerRef.current);
        presentingTimerRef.current = null;
      }
      setNexusState("processing");
      try {
        var data;
        if (hubMode) {
          var hubData = await hubSendToEileen(hubSession, { question: clean });
          var hubText = hubData && (hubData.response || hubData.answer || hubData.text || hubData.message);
          data = hubText ? { response: hubText } : null;
        } else {
          var requestBody = {
            message: (userType ? "[Context: user is " + (userType === "employer" ? "an employer/HR professional managing staff" : "a worker with a question about their own employment") + "] " : "") + clean,
            session_id: sessionId,
            page_context: currentDomain ? "knowledge-library/domain/" + currentDomain.slug : "knowledge-library"
          };
          if (currentDomain) {
            requestBody.domain_context = currentDomain.id;
          }
          const resp = await fetch(EILEEN_ENDPOINT, {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + window.__klToken,
              "Content-Type": "application/json",
              "apikey": SUPABASE_ANON_KEY
            },
            body: JSON.stringify(requestBody)
          });
          data = await resp.json();
        }
        if (data && data.response) {
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: data.response,
            provisionsCount: data.provisions_count,
            casesCount: data.cases_count
          }]);
          loadSessionHistory();
          setNexusState("presenting");
          presentingTimerRef.current = setTimeout(function() {
            setNexusState("dormant");
            presentingTimerRef.current = null;
          }, 2e3);
          if (hubMode) setMatterRefreshKey(function(k) {
            return k + 1;
          });
          var userMsgCount = 0;
          for (var i = 0; i < messages.length; i++) {
            if (messages[i] && messages[i].role === "user") userMsgCount++;
          }
          userMsgCount += 1;
          var elapsedMs = Date.now() - pageLoadTime.current;
          if (!userType && !qualifierShownThisSession && (userMsgCount >= 2 || elapsedMs >= 6e4)) {
            setShowQualifier(true);
            setQualifierShownThisSession(true);
          }
          if (hasContractIntent(clean) && !contractPromptShown.current && !hasUploadedThisSession) {
            contractPromptShown.current = true;
            setTimeout(function() {
              setMessages(function(prev) {
                return prev.concat([{
                  role: "system_ui",
                  type: "contract_upload_prompt"
                }]);
              });
            }, 800);
          }
        } else {
          setNexusState("dormant");
          setMessages((prev) => [...prev, {
            role: "assistant",
            isError: true,
            errorMessage: "I wasn't able to process that just now. This is usually temporary \u2014 would you like to try again?",
            retryAction: function() {
              sendMessage(clean);
            }
          }]);
        }
      } catch (err) {
        console.error("sendMessage error:", err);
        setNexusState("dormant");
        var isOffline = !navigator.onLine || err && err.message && err.message.indexOf("fetch") !== -1;
        setMessages((prev) => [...prev, {
          role: "assistant",
          isError: true,
          errorMessage: isOffline ? "It looks like we've lost connection. Please check your internet and try again when you're ready." : "I wasn't able to process that just now. This is usually temporary \u2014 would you like to try again?",
          retryAction: function() {
            sendMessage(clean);
          }
        }]);
      } finally {
        setIsLoading(false);
      }
    }
    function handleInputChange(inputLength) {
      if (inputLength > 0 && nexusState === "dormant") setNexusState("ready");
      else if (inputLength === 0 && nexusState === "ready") setNexusState("dormant");
    }
    useEffect(function() {
      return function() {
        if (presentingTimerRef.current) clearTimeout(presentingTimerRef.current);
      };
    }, []);
    window.__klSendMessage = sendMessage;
    window.__klSeedInput = function(text2) {
      if (typeof text2 !== "string" || !text2) return;
      try {
        window.dispatchEvent(new CustomEvent("kl-seed-input", { detail: { text: text2 } }));
      } catch (e) {
        var ev = document.createEvent("CustomEvent");
        ev.initCustomEvent("kl-seed-input", true, true, { text: text2 });
        window.dispatchEvent(ev);
      }
    };
    window.__klDiscussWithEileen = function(seed) {
      if (typeof seed !== "string" || !seed) return;
      setPendingEileenSeed(seed);
      setCurrentFacet(null);
    };
    window.__klOpenPanel = function(panelId) {
      handleSelectPanel(panelId);
    };
    window.__klHandleFileSelect = handleFileSelect;
    async function handleUserTypeSelect(type) {
      setUserType(type);
      setShowQualifier(false);
      try {
        localStorage.setItem("ailane_kl_user_type", type);
      } catch (e) {
      }
      if (!window.__klToken || !window.__klUserId) return;
      try {
        var checkResp = await fetch(
          SUPABASE_URL + "/rest/v1/kl_user_preferences?user_id=eq." + window.__klUserId + "&select=id,preferences",
          { headers: { "Authorization": "Bearer " + window.__klToken, "apikey": SUPABASE_ANON_KEY } }
        );
        var existing = await checkResp.json();
        if (Array.isArray(existing) && existing.length > 0) {
          var merged = Object.assign({}, existing[0].preferences, { user_type: type });
          await fetch(
            SUPABASE_URL + "/rest/v1/kl_user_preferences?id=eq." + existing[0].id,
            {
              method: "PATCH",
              headers: {
                "Authorization": "Bearer " + window.__klToken,
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
              },
              body: JSON.stringify({ preferences: merged, updated_at: (/* @__PURE__ */ new Date()).toISOString() })
            }
          );
        } else {
          await fetch(
            SUPABASE_URL + "/rest/v1/kl_user_preferences",
            {
              method: "POST",
              headers: {
                "Authorization": "Bearer " + window.__klToken,
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
              },
              body: JSON.stringify({
                user_id: window.__klUserId,
                preferences: { user_type: type }
              })
            }
          );
        }
      } catch (err) {
        console.error("Failed to save user type:", err);
      }
    }
    function addMessage(msg) {
      setMessages((prev) => [...prev, msg]);
    }
    function updateFileMessage(msgId, updates) {
      setMessages((prev) => prev.map((m) => m.id === msgId ? Object.assign({}, m, updates) : m));
    }
    async function uploadFile(file, msgId) {
      const storagePath = window.__klUserId + "/" + Date.now() + "-" + file.name;
      let uploadOk = false;
      try {
        const uploadResp = await fetch(
          SUPABASE_URL + "/storage/v1/object/kl-document-vault/" + encodeURIComponent(storagePath),
          {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + window.__klToken,
              "apikey": SUPABASE_ANON_KEY,
              "Content-Type": file.type || "application/octet-stream",
              "x-upsert": "true"
            },
            body: file
          }
        );
        uploadOk = uploadResp.ok;
      } catch (err) {
        console.error("Storage upload failed:", err);
      }
      if (!uploadOk) {
        updateFileMessage(msgId, { status: "error" });
        addMessage({
          role: "assistant",
          isError: true,
          errorMessage: "The document upload didn't complete. Please check the file is a PDF or Word document and try again."
        });
        return;
      }
      const isSubscription = window.__klAccessType === "subscription" || window.__klTier === "operational_readiness" || window.__klTier === "governance" || window.__klTier === "enterprise" || window.__klTier === "institutional";
      const docRecord = {
        user_id: window.__klUserId,
        filename: file.name,
        storage_path: storagePath,
        file_size_bytes: file.size,
        mime_type: file.type,
        extraction_status: "pending",
        analysis_status: "pending",
        session_only: !isSubscription,
        expires_at: isSubscription ? null : window.__klSessionExpiry || null
      };
      let documentId = null;
      try {
        const insertResp = await fetch(SUPABASE_URL + "/rest/v1/kl_vault_documents", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + window.__klToken,
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify(docRecord)
        });
        if (insertResp.ok) {
          const insertedDocs = await insertResp.json();
          if (Array.isArray(insertedDocs) && insertedDocs[0] && insertedDocs[0].id) {
            documentId = insertedDocs[0].id;
          }
        }
      } catch (err) {
        console.error("Vault insert failed:", err);
      }
      if (!documentId) {
        updateFileMessage(msgId, { status: "error" });
        addMessage({
          role: "assistant",
          isError: true,
          errorMessage: "The document upload didn't complete. Please check the file is a PDF or Word document and try again."
        });
        return;
      }
      updateFileMessage(msgId, { documentId, status: "extracting" });
      let extractResult = null;
      try {
        const extractResp = await fetch(
          SUPABASE_URL + "/functions/v1/kl_document_extract",
          {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + window.__klToken,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ document_id: documentId })
          }
        );
        if (extractResp.ok) {
          extractResult = await extractResp.json();
        }
      } catch (err) {
        console.error("Document extract failed:", err);
      }
      var charCount = extractResult && typeof extractResult.char_count === "number" ? extractResult.char_count : null;
      var extractionFailed = charCount === null;
      updateFileMessage(msgId, {
        status: extractionFailed ? "saved-no-extract" : "ready",
        charCount: charCount || 0
      });
      addMessage({
        id: "ready-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
        role: "assistant",
        content: "",
        isLocal: true,
        isUploadComplete: true,
        filename: file.name,
        fileSize: file.size,
        charCount: charCount || 0,
        documentId,
        vaultOnly: false,
        extractionFailed
      });
    }
    function handleVaultOnly(msgId) {
      setMessages(function(prev) {
        return prev.map(function(m) {
          return m.id === msgId ? Object.assign({}, m, { vaultOnly: true }) : m;
        });
      });
    }
    async function handleRunAnalysis(documentId, msgId) {
      setMessages(
        (prev) => prev.map((m) => m.id === msgId ? Object.assign({}, m, { analysisTriggered: true }) : m)
      );
      const loadingMsgId = "analysis-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
      addMessage({
        id: loadingMsgId,
        role: "assistant",
        content: "Routing your contract through the compliance engine\u2026",
        isLocal: true,
        isAnalysisLoading: true
      });
      const phases = [
        { delay: 8e3, text: "Analysing against UK employment law requirements\u2026" },
        { delay: 2e4, text: "Checking statutory provisions and forward legislative exposure\u2026" },
        { delay: 4e4, text: "Compiling findings and scoring compliance position\u2026" }
      ];
      const phaseTimers = phases.map(
        (phase) => setTimeout(() => {
          setMessages(
            (prev) => prev.map((m) => m.id === loadingMsgId ? Object.assign({}, m, { content: phase.text }) : m)
          );
        }, phase.delay)
      );
      try {
        const token = window.__klToken;
        if (!token) throw new Error("Not authenticated");
        const startResponse = await fetch(
          SUPABASE_URL + "/functions/v1/kl-compliance-bridge",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
              document_id: documentId,
              document_type: "employment_contract",
              action: "start"
            })
          }
        );
        const startData = await startResponse.json();
        if (!startResponse.ok) {
          phaseTimers.forEach((t) => clearTimeout(t));
          if (startData && startData.error === "check_limit_reached") {
            setMessages(
              (prev) => prev.map((m) => {
                if (m.id === loadingMsgId) {
                  return Object.assign({}, m, {
                    content: startData.message || "You have used all bundled Contract Compliance Checks in this session. Additional checks are available at \xA315 each.",
                    isAnalysisLoading: false,
                    isLocal: true
                  });
                }
                if (m.id === msgId) {
                  return Object.assign({}, m, { analysisTriggered: false });
                }
                return m;
              })
            );
            return;
          }
          throw new Error(startData && (startData.error || startData.detail) || "Analysis failed");
        }
        var uploadId = startData.upload_id;
        if (!uploadId) throw new Error("No upload_id returned from bridge");
        setMessages(function(prev) {
          return prev.map(function(m) {
            return m.id === loadingMsgId ? Object.assign({}, m, { content: "Analysing your contract against UK employment law requirements. This typically takes 60\u201390 seconds." }) : m;
          });
        });
        var maxPolls = 60;
        var pollCount = 0;
        var pollResult = null;
        while (pollCount < maxPolls) {
          await new Promise(function(resolve) {
            setTimeout(resolve, 5e3);
          });
          pollCount++;
          var elapsed = pollCount * 5;
          if (elapsed === 15) {
            setMessages(function(prev) {
              return prev.map(function(m) {
                return m.id === loadingMsgId ? Object.assign({}, m, { content: "Checking statutory provisions and case law references\u2026" }) : m;
              });
            });
          } else if (elapsed === 35) {
            setMessages(function(prev) {
              return prev.map(function(m) {
                return m.id === loadingMsgId ? Object.assign({}, m, { content: "Assessing forward legislative exposure under ERA 2025\u2026" }) : m;
              });
            });
          } else if (elapsed === 60) {
            setMessages(function(prev) {
              return prev.map(function(m) {
                return m.id === loadingMsgId ? Object.assign({}, m, { content: "Compiling findings and scoring compliance position\u2026" }) : m;
              });
            });
          }
          try {
            var pollResponse = await fetch(
              SUPABASE_URL + "/functions/v1/kl-compliance-bridge",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                  document_id: documentId,
                  upload_id: uploadId,
                  action: "poll"
                })
              }
            );
            var pollData = await pollResponse.json();
            if (pollData.status === "processing") {
              continue;
            }
            pollResult = pollData;
            break;
          } catch (pollErr) {
            console.warn("Poll error (will retry):", pollErr);
            continue;
          }
        }
        phaseTimers.forEach(function(t) {
          clearTimeout(t);
        });
        if (!pollResult) {
          throw new Error("Analysis is taking longer than expected. Your results will appear in the Document Vault when ready.");
        }
        setMessages(function(prev) {
          var withoutLoading = prev.filter(function(m) {
            return m.id !== loadingMsgId;
          });
          return withoutLoading.concat([{
            id: "result-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
            role: "assistant",
            content: "",
            isLocal: true,
            isAnalysisResult: true,
            // R1-C §3: merge upload_id so the PDF download button in
            // AnalysisResultMessage can reference it via data.upload_id.
            // Sprint F §2.2: merge document_id so the Save to Vault button
            // can PATCH the kl_vault_documents row.
            analysisData: Object.assign({}, pollResult, { upload_id: uploadId, document_id: documentId })
          }]);
        });
      } catch (err) {
        phaseTimers.forEach((t) => clearTimeout(t));
        console.error("handleRunAnalysis error:", err);
        setMessages(
          (prev) => prev.map((m) => {
            if (m.id === loadingMsgId) {
              return Object.assign({}, m, {
                content: "I was unable to complete the analysis. " + (err && err.message || "Please try again."),
                isAnalysisLoading: false,
                isLocal: true
              });
            }
            if (m.id === msgId) {
              return Object.assign({}, m, { analysisTriggered: false });
            }
            return m;
          })
        );
      }
    }
    function handleFileSelect(e) {
      const file = e && e.target && e.target.files && e.target.files[0];
      if (!file) return;
      setHasUploadedThisSession(true);
      const parts = file.name.split(".");
      const ext = parts.length > 1 ? "." + parts[parts.length - 1].toLowerCase() : "";
      if (ALLOWED_EXTENSIONS.indexOf(ext) === -1) {
        addMessage({
          role: "assistant",
          content: "I can accept PDF, DOCX, or TXT files up to 10MB. The file you selected (" + (ext || "unknown type") + ") is not a supported format.",
          isLocal: true
        });
        if (e.target && "value" in e.target) e.target.value = "";
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        addMessage({
          role: "assistant",
          content: "That file is too large (" + (file.size / (1024 * 1024)).toFixed(1) + "MB). The maximum is 10MB.",
          isLocal: true
        });
        if (e.target && "value" in e.target) e.target.value = "";
        return;
      }
      const msgId = "upload-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
      addMessage({
        id: msgId,
        role: "user",
        type: "file_upload",
        filename: file.name,
        fileSize: file.size,
        status: "uploading",
        documentId: null,
        charCount: null
      });
      uploadFile(file, msgId);
      if (e.target && "value" in e.target) e.target.value = "";
    }
    return /* @__PURE__ */ React.createElement(React.Fragment, null, hubMode && hubStepUpNeeded && /* @__PURE__ */ React.createElement(HubStepUpGate, { hubSession, onElevated: () => setHubStepUpNeeded(false) }), /* @__PURE__ */ React.createElement(
      TopBar,
      {
        sidebarOpen,
        onToggleSidebar: () => setSidebarOpen(!sidebarOpen),
        accessType,
        tier,
        sessionExpiresAt,
        onSessionExpired: () => setSessionExpired(true),
        lang,
        onToggleLang: toggleLang,
        operationalMode,
        orgTier,
        hubSession
      }
    ), lang === "cy" && /* @__PURE__ */ React.createElement(
      "div",
      {
        role: "note",
        style: {
          fontSize: "10px",
          color: "#94a3b8",
          textAlign: "center",
          padding: "2px 0",
          background: "rgba(245,158,11,0.06)",
          borderBottom: "1px solid rgba(245,158,11,0.1)",
          fontFamily: "'DM Sans', sans-serif"
        }
      },
      "Cyfieithiad AI \u2014 nid cyfieithiad swyddogol. / AI translation \u2014 not an official translation."
    ), /* @__PURE__ */ React.createElement(
      Sidebar,
      {
        open: sidebarOpen,
        sessionHistory,
        activeSessionId: sessionId,
        onSelectSession: (sid) => {
          loadSession(sid);
          if (window.innerWidth <= 768) setSidebarOpen(false);
        },
        onNewChat: () => {
          newChat();
          if (window.innerWidth <= 768) setSidebarOpen(false);
        },
        onCrownQuery: sendMessage,
        nexusState,
        prefersReducedMotion: prefersReducedMotion.current,
        lang,
        hubChrome,
        currentFacet,
        onSelectFacet: (id) => {
          handleSelectFacet(id);
          if (window.innerWidth <= 768) setSidebarOpen(false);
        },
        hubSession,
        hasKLSession,
        hasSubscription
      }
    ), currentView === "domain" && currentDomain ? /* @__PURE__ */ React.createElement(
      DomainSubPage,
      {
        domain: currentDomain,
        onBack: function() {
          window.location.hash = "/";
        },
        onAskEileen: function(question) {
          sendMessage(question);
        },
        onSend: sendMessage,
        isLoading,
        onFileSelect: handleFileSelect,
        nexusState,
        prefersReducedMotion: prefersReducedMotion.current,
        onInputChange: handleInputChange,
        tier,
        lang
      }
    ) : hubMode && currentFacet ? /* @__PURE__ */ React.createElement(HubFacetView, { facet: currentFacet, hubSession, onBack: () => setCurrentFacet(null) }) : /* @__PURE__ */ React.createElement(
      ConversationArea,
      {
        messages,
        isLoading,
        onSend: sendMessage,
        accessType,
        tier,
        onFileSelect: handleFileSelect,
        onRunAnalysis: handleRunAnalysis,
        onVaultOnly: handleVaultOnly,
        floatingNexusExpanded: floatingNexusOpen,
        onToggleFloatingNexus: () => setFloatingNexusOpen(!floatingNexusOpen),
        showQualifier,
        onUserTypeSelect: handleUserTypeSelect,
        pulseUpload: messages.some(function(m) {
          return m.role === "system_ui" && m.type === "contract_upload_prompt";
        }) && !hasUploadedThisSession,
        nexusState,
        prefersReducedMotion: prefersReducedMotion.current,
        onInputChange: handleInputChange,
        nearDomain,
        onDomainHover: handleDomainHover,
        onDomainLeave: handleDomainLeave,
        hubMode,
        hubSession,
        matterRefreshKey
      }
    ), currentView !== "domain" && messages.length === 0 && /* @__PURE__ */ React.createElement(
      FloatingNexusAdvisor,
      {
        nearDomain,
        nexusState,
        prefersReducedMotion: prefersReducedMotion.current,
        onProximityDomain: function(slug) {
          if (slug) handleDomainHover(slug);
          else handleDomainLeave();
        },
        dismissed: helperDismissed,
        onDismiss: handleHelperDismiss
      }
    ), /* @__PURE__ */ React.createElement(
      PanelRail,
      {
        activePanel,
        onSelectPanel: handleSelectPanel,
        accessType,
        tier,
        hubMode: hubChrome
      }
    ), /* @__PURE__ */ React.createElement(AdvisoryBanner, null), sidebarOpen && /* @__PURE__ */ React.createElement(MobileSidebarBackdrop, { onClick: () => setSidebarOpen(false) }), activePanel && (!hubChrome || activePanel === "research") && /* @__PURE__ */ React.createElement(PanelDrawer, { panelId: activePanel, onClose: () => handleSelectPanel(null), lang }), !upsellDismissed && !sessionExpired && upsellGraceElapsed && /* @__PURE__ */ React.createElement(
      UpsellCard,
      {
        productType: window.__klProductType || tier || "",
        minutesRemaining,
        onDismiss: () => setUpsellDismissed(true)
      }
    ), sessionExpired && /* @__PURE__ */ React.createElement(ExpiredModal, null));
  }
  window.initKLApp = function() {
    const container = document.getElementById("kl-root");
    if (!container) return;
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(App));
  };
  if (window.__klAccessType) {
    window.initKLApp();
  }
})();
/*! Bundled license information:

dompurify/dist/purify.es.mjs:
  (*! @license DOMPurify 3.4.11 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.4.11/LICENSE *)
*/
