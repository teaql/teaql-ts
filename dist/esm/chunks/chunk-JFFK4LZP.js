import {
  __privateAdd,
  __privateGet,
  __privateSet
} from "./chunk-IQGZNIAK.js";

// src/core/builtin-messages-v1.json
var builtin_messages_v1_default = {
  schema: "teaql.i18n/v1",
  defaultLocale: "en",
  locales: {
    en: {
      messages: {
        "checker.required": "The {location} is required",
        "checker.min": "The {location} should be equal or greater than {system}, but input is {input}",
        "checker.max": "The {location} should be equal or less than {system}, but input is {input}",
        "checker.minLength": "The length of {location} should be equal or greater than {system}, but the length of {input} is {input_len}",
        "checker.maxLength": "The length of {location} should be equal or less than {system}, but the length of {input} is {input_len}"
      },
      vocabulary: {}
    },
    "zh-CN": {
      messages: {
        "checker.required": "{location} \u662F\u5FC5\u586B\u9879",
        "checker.min": "{location} \u5E94\u8BE5\u5927\u4E8E\u7B49\u4E8E {system}\uFF0C\u4F46\u8F93\u5165\u503C\u4E3A {input}",
        "checker.max": "{location} \u5E94\u8BE5\u5C0F\u4E8E\u7B49\u4E8E {system}\uFF0C\u4F46\u8F93\u5165\u503C\u4E3A {input}",
        "checker.minLength": "{location} \u7684\u957F\u5EA6\u5E94\u5927\u4E8E\u7B49\u4E8E {system}\uFF0C\u4F46\u5B9E\u9645\u957F\u5EA6\u4E3A {input_len}",
        "checker.maxLength": "{location} \u7684\u957F\u5EA6\u5E94\u5C0F\u4E8E\u7B49\u4E8E {system}\uFF0C\u4F46\u5B9E\u9645\u957F\u5EA6\u4E3A {input_len}"
      },
      vocabulary: {}
    },
    "zh-TW": {
      messages: {
        "checker.required": "{location} \u662F\u5FC5\u586B\u7684",
        "checker.min": "{location} \u61C9\u8A72\u7B49\u65BC\u6216\u5927\u65BC {system}\uFF0C\u4F46\u8F38\u5165\u70BA {input}",
        "checker.max": "{location} \u61C9\u8A72\u7B49\u65BC\u6216\u5C0F\u65BC {system}\uFF0C\u4F46\u8F38\u5165\u70BA {input}",
        "checker.minLength": "{location} \u7684\u9577\u5EA6\u61C9\u8A72\u7B49\u65BC\u6216\u5927\u65BC {system}\uFF0C\u4F46 {input} \u7684\u9577\u5EA6\u662F {input_len}",
        "checker.maxLength": "{location} \u7684\u9577\u5EA6\u61C9\u8A72\u7B49\u65BC\u6216\u5C0F\u65BC {system}\uFF0C\u4F46 {input} \u7684\u9577\u5EA6\u662F {input_len}"
      },
      vocabulary: {}
    },
    ja: {
      messages: {
        "checker.required": "{location} \u306F\u5FC5\u9808\u3067\u3059",
        "checker.min": "{location} \u306F {system} \u4EE5\u4E0A\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002\u5165\u529B\u5024\u306F {input} \u3067\u3059",
        "checker.max": "{location} \u306F {system} \u4EE5\u4E0B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002\u5165\u529B\u5024\u306F {input} \u3067\u3059",
        "checker.minLength": "{location} \u306E\u9577\u3055\u306F {system} \u4EE5\u4E0A\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002\u5B9F\u969B\u306E\u9577\u3055\u306F {input_len} \u3067\u3059",
        "checker.maxLength": "{location} \u306E\u9577\u3055\u306F {system} \u4EE5\u4E0B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002\u5B9F\u969B\u306E\u9577\u3055\u306F {input_len} \u3067\u3059"
      },
      vocabulary: {}
    },
    ko: {
      messages: {
        "checker.required": "{location}\uC740(\uB294) \uD544\uC218\uC785\uB2C8\uB2E4",
        "checker.min": "{location}\uC740(\uB294) {system} \uC774\uC0C1\uC774\uC5B4\uC57C \uD558\uC9C0\uB9CC \uC785\uB825\uAC12\uC740 {input}\uC785\uB2C8\uB2E4",
        "checker.max": "{location}\uC740(\uB294) {system} \uC774\uD558\uC5EC\uC57C \uD558\uC9C0\uB9CC \uC785\uB825\uAC12\uC740 {input}\uC785\uB2C8\uB2E4",
        "checker.minLength": "{location}\uC758 \uAE38\uC774\uB294 {system} \uC774\uC0C1\uC774\uC5B4\uC57C \uD558\uC9C0\uB9CC \uC2E4\uC81C \uAE38\uC774\uB294 {input_len}\uC785\uB2C8\uB2E4",
        "checker.maxLength": "{location}\uC758 \uAE38\uC774\uB294 {system} \uC774\uD558\uC5EC\uC57C \uD558\uC9C0\uB9CC \uC2E4\uC81C \uAE38\uC774\uB294 {input_len}\uC785\uB2C8\uB2E4"
      },
      vocabulary: {}
    },
    de: {
      messages: {
        "checker.required": "{location} ist erforderlich",
        "checker.min": "{location} muss mindestens {system} sein, aber die Eingabe ist {input}",
        "checker.max": "{location} darf h\xF6chstens {system} sein, aber die Eingabe ist {input}",
        "checker.minLength": "Die L\xE4nge von {location} muss mindestens {system} sein, ist aber {input_len}",
        "checker.maxLength": "Die L\xE4nge von {location} darf h\xF6chstens {system} sein, ist aber {input_len}"
      },
      vocabulary: {}
    },
    fr: {
      messages: {
        "checker.required": "{location} est obligatoire",
        "checker.min": "{location} doit \xEAtre sup\xE9rieur ou \xE9gal \xE0 {system}, mais la valeur saisie est {input}",
        "checker.max": "{location} doit \xEAtre inf\xE9rieur ou \xE9gal \xE0 {system}, mais la valeur saisie est {input}",
        "checker.minLength": "La longueur de {location} doit \xEAtre sup\xE9rieure ou \xE9gale \xE0 {system}, mais elle est {input_len}",
        "checker.maxLength": "La longueur de {location} doit \xEAtre inf\xE9rieure ou \xE9gale \xE0 {system}, mais elle est {input_len}"
      },
      vocabulary: {}
    },
    es: {
      messages: {
        "checker.required": "{location} es requerido/a",
        "checker.min": "{location} debe ser mayor o igual que {system}, pero el valor ingresado es {input}",
        "checker.max": "{location} debe ser menor o igual que {system}, pero el valor ingresado es {input}",
        "checker.minLength": "La longitud de {location} debe ser mayor o igual que {system}, pero es {input_len}",
        "checker.maxLength": "La longitud de {location} debe ser menor o igual que {system}, pero es {input_len}"
      },
      vocabulary: {}
    },
    pt: {
      messages: {
        "checker.required": "{location} \xE9 obrigat\xF3rio",
        "checker.min": "{location} deve ser maior ou igual a {system}, mas a entrada \xE9 {input}",
        "checker.max": "{location} deve ser menor ou igual a {system}, mas a entrada \xE9 {input}",
        "checker.minLength": "O comprimento de {location} deve ser maior ou igual a {system}, mas \xE9 {input_len}",
        "checker.maxLength": "O comprimento de {location} deve ser menor ou igual a {system}, mas \xE9 {input_len}"
      },
      vocabulary: {}
    },
    ar: {
      messages: {
        "checker.required": "{location} \u0645\u0637\u0644\u0648\u0628",
        "checker.min": "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 {location} \u0645\u0633\u0627\u0648\u064A\u064B\u0627 \u0623\u0648 \u0623\u0643\u0628\u0631 \u0645\u0646 {system}\u060C \u0644\u0643\u0646 \u0627\u0644\u0645\u064F\u062F\u062E\u0644 \u0647\u0648 {input}",
        "checker.max": "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 {location} \u0645\u0633\u0627\u0648\u064A\u064B\u0627 \u0623\u0648 \u0623\u0635\u063A\u0631 \u0645\u0646 {system}\u060C \u0644\u0643\u0646 \u0627\u0644\u0645\u064F\u062F\u062E\u0644 \u0647\u0648 {input}",
        "checker.minLength": "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0637\u0648\u0644 {location} \u0645\u0633\u0627\u0648\u064A\u064B\u0627 \u0623\u0648 \u0623\u0643\u0628\u0631 \u0645\u0646 {system}\u060C \u0644\u0643\u0646 \u0627\u0644\u0637\u0648\u0644 \u0647\u0648 {input_len}",
        "checker.maxLength": "\u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0637\u0648\u0644 {location} \u0645\u0633\u0627\u0648\u064A\u064B\u0627 \u0623\u0648 \u0623\u0635\u063A\u0631 \u0645\u0646 {system}\u060C \u0644\u0643\u0646 \u0627\u0644\u0637\u0648\u0644 \u0647\u0648 {input_len}"
      },
      vocabulary: {}
    },
    th: {
      messages: {
        "checker.required": "{location} \u0E40\u0E1B\u0E47\u0E19\u0E2A\u0E34\u0E48\u0E07\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19",
        "checker.min": "{location} \u0E04\u0E27\u0E23\u0E08\u0E30\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E1A\u0E2B\u0E23\u0E37\u0E2D\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32 {system} \u0E41\u0E15\u0E48\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19\u0E04\u0E37\u0E2D {input}",
        "checker.max": "{location} \u0E04\u0E27\u0E23\u0E08\u0E30\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E1A\u0E2B\u0E23\u0E37\u0E2D\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32 {system} \u0E41\u0E15\u0E48\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19\u0E04\u0E37\u0E2D {input}",
        "checker.minLength": "\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E02\u0E2D\u0E07 {location} \u0E04\u0E27\u0E23\u0E08\u0E30\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E1A\u0E2B\u0E23\u0E37\u0E2D\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32 {system} \u0E41\u0E15\u0E48\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E04\u0E37\u0E2D {input_len}",
        "checker.maxLength": "\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E02\u0E2D\u0E07 {location} \u0E04\u0E27\u0E23\u0E08\u0E30\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E1A\u0E2B\u0E23\u0E37\u0E2D\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32 {system} \u0E41\u0E15\u0E48\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E04\u0E37\u0E2D {input_len}"
      },
      vocabulary: {}
    },
    id: {
      messages: {
        "checker.required": "{location} wajib diisi",
        "checker.min": "{location} harus sama dengan atau lebih besar dari {system}, tetapi input adalah {input}",
        "checker.max": "{location} harus sama dengan atau lebih kecil dari {system}, tetapi input adalah {input}",
        "checker.minLength": "Panjang {location} harus sama dengan atau lebih besar dari {system}, tetapi panjangnya {input_len}",
        "checker.maxLength": "Panjang {location} harus sama dengan atau lebih kecil dari {system}, tetapi panjangnya {input_len}"
      },
      vocabulary: {}
    },
    fil: {
      messages: {
        "checker.required": "Ang {location} ay kinakailangan",
        "checker.min": "Ang {location} ay dapat katumbas o mas malaki kaysa {system}, ngunit ang input ay {input}",
        "checker.max": "Ang {location} ay dapat katumbas o mas maliit kaysa {system}, ngunit ang input ay {input}",
        "checker.minLength": "Ang haba ng {location} ay dapat katumbas o mas malaki kaysa {system}, ngunit ang haba ay {input_len}",
        "checker.maxLength": "Ang haba ng {location} ay dapat katumbas o mas maliit kaysa {system}, ngunit ang haba ay {input_len}"
      },
      vocabulary: {}
    },
    uk: {
      messages: {
        "checker.required": "{location} \u0454 \u043E\u0431\u043E\u0432'\u044F\u0437\u043A\u043E\u0432\u0438\u043C",
        "checker.min": "{location} \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0431\u0443\u0442\u0438 \u0440\u0456\u0432\u043D\u0438\u043C \u0430\u0431\u043E \u0431\u0456\u043B\u044C\u0448\u0438\u043C \u0437\u0430 {system}, \u0430\u043B\u0435 \u0432\u0432\u0456\u0434\u043D\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F {input}",
        "checker.max": "{location} \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0431\u0443\u0442\u0438 \u0440\u0456\u0432\u043D\u0438\u043C \u0430\u0431\u043E \u043C\u0435\u043D\u0448\u0438\u043C \u0437\u0430 {system}, \u0430\u043B\u0435 \u0432\u0432\u0456\u0434\u043D\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F {input}",
        "checker.minLength": "\u0414\u043E\u0432\u0436\u0438\u043D\u0430 {location} \u043F\u043E\u0432\u0438\u043D\u043D\u0430 \u0431\u0443\u0442\u0438 \u0440\u0456\u0432\u043D\u043E\u044E \u0430\u0431\u043E \u0431\u0456\u043B\u044C\u0448\u043E\u044E \u0437\u0430 {system}, \u0430\u043B\u0435 \u0434\u043E\u0432\u0436\u0438\u043D\u0430 \u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C {input_len}",
        "checker.maxLength": "\u0414\u043E\u0432\u0436\u0438\u043D\u0430 {location} \u043F\u043E\u0432\u0438\u043D\u043D\u0430 \u0431\u0443\u0442\u0438 \u0440\u0456\u0432\u043D\u043E\u044E \u0430\u0431\u043E \u043C\u0435\u043D\u0448\u043E\u044E \u0437\u0430 {system}, \u0430\u043B\u0435 \u0434\u043E\u0432\u0436\u0438\u043D\u0430 \u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C {input_len}"
      },
      vocabulary: {}
    },
    vi: {
      messages: {
        "checker.required": "{location} l\xE0 b\u1EAFt bu\u1ED9c",
        "checker.min": "{location} ph\u1EA3i l\u1EDBn h\u01A1n ho\u1EB7c b\u1EB1ng {system}, nh\u01B0ng gi\xE1 tr\u1ECB nh\u1EADp l\xE0 {input}",
        "checker.max": "{location} ph\u1EA3i nh\u1ECF h\u01A1n ho\u1EB7c b\u1EB1ng {system}, nh\u01B0ng gi\xE1 tr\u1ECB nh\u1EADp l\xE0 {input}",
        "checker.minLength": "\u0110\u1ED9 d\xE0i c\u1EE7a {location} ph\u1EA3i l\u1EDBn h\u01A1n ho\u1EB7c b\u1EB1ng {system}, nh\u01B0ng \u0111\u1ED9 d\xE0i l\xE0 {input_len}",
        "checker.maxLength": "\u0110\u1ED9 d\xE0i c\u1EE7a {location} ph\u1EA3i nh\u1ECF h\u01A1n ho\u1EB7c b\u1EB1ng {system}, nh\u01B0ng \u0111\u1ED9 d\xE0i l\xE0 {input_len}"
      },
      vocabulary: {}
    }
  }
};

// src/core/i18n.ts
var locales = ["en", "zh-CN", "zh-TW", "ja", "ko", "de", "fr", "es", "pt", "ar", "th", "id", "fil", "uk", "vi"];
var UnsupportedLocaleError = class extends Error {
  constructor(localeCode) {
    super(`Unsupported locale: ${localeCode}`);
    this.localeCode = localeCode;
  }
};
var aliases = { "en-us": "en", "en-gb": "en", "zh": "zh-CN", "zh-hans": "zh-CN", "zh-sg": "zh-CN", "cn": "zh-CN", "zh-hant": "zh-TW", "zh-hk": "zh-TW", "zh-mo": "zh-TW", "tw": "zh-TW", "ja-jp": "ja", "ko-kr": "ko", "de-de": "de", "fr-fr": "fr", "es-mx": "es", "pt-br": "pt", "pt-pt": "pt", "ar-sa": "ar", "th-th": "th", "id-id": "id", "tl": "fil", "fil-ph": "fil", "uk-ua": "uk", "vi-vn": "vi" };
function parseLocale(code) {
  if (typeof code !== "string" || !code.trim()) throw new UnsupportedLocaleError(code);
  const normalized = code.trim().replace(/_/g, "-").toLowerCase();
  const canonical = locales.find((v) => v.toLowerCase() === normalized);
  if (canonical) return canonical;
  const alias = aliases[normalized];
  if (!alias) throw new UnsupportedLocaleError(code);
  return alias;
}
function checkResultToWire(result, profile = "camelCase") {
  return { ruleId: result.ruleId, entityType: result.entityType, location: result.location.segments, instancePath: result.location.instancePath(profile), sourceInstancePath: result.sourceInstancePath, inputValue: result.inputValue, systemValue: result.systemValue, message: result.message };
}
var _I18nCatalog = class _I18nCatalog {
  constructor(data, fallback) {
    this.data = data;
    this.fallback = fallback;
    if (data.schema !== "teaql.i18n/v1") throw new Error("Unsupported i18n schema");
    Object.keys(data.locales).forEach(parseLocale);
  }
  message(locale, key) {
    return this.data.locales[locale]?.messages[key] ?? this.fallback?.data.locales[locale]?.messages[key] ?? this.data.locales.en?.messages[key] ?? this.fallback?.data.locales.en?.messages[key] ?? key;
  }
  translate(result, locale) {
    const keys = { required: "checker.required", min: "checker.min", max: "checker.max", min_str_len: "checker.minLength", min_length: "checker.minLength", max_str_len: "checker.maxLength", max_length: "checker.maxLength" };
    const key = keys[result.ruleId.toLowerCase()] ?? `checker.${result.ruleId.toLowerCase()}`;
    const input = String(result.inputValue);
    const length = typeof result.inputValue === "string" ? [...result.inputValue].length : 0;
    result.message = this.message(locale, key).split("{location}").join(result.location.nativePath()).split("{system}").join(String(result.systemValue)).split("{input}").join(input).split("{input_len}").join(String(length));
    return result;
  }
};
_I18nCatalog.builtin = new _I18nCatalog(builtin_messages_v1_default);
var I18nCatalog = _I18nCatalog;

// src/core/schema-capability.ts
var contextSchemaCapability = /* @__PURE__ */ Symbol("teaql.context.schema-capability");

// src/core/trace-chain.ts
function cloneTraceNodes(source) {
  return Object.freeze(source.map((node) => Object.freeze({ ...node })));
}
var _parent, _node;
var MutationTraceScope = class {
  constructor(parent, node) {
    __privateAdd(this, _parent);
    __privateAdd(this, _node);
    __privateSet(this, _parent, parent);
    __privateSet(this, _node, Object.freeze({ ...node }));
    Object.freeze(this);
  }
  recover() {
    const nodes = [];
    let scope = this;
    while (scope) {
      nodes.push(__privateGet(scope, _node));
      scope = __privateGet(scope, _parent);
    }
    return cloneTraceNodes(nodes.reverse());
  }
};
_parent = new WeakMap();
_node = new WeakMap();
function mutationScopeForEntity(parent, entity, id, rootComment, localComment) {
  const reason = parent ? localComment : rootComment;
  if (parent && (typeof reason !== "string" || /^\p{White_Space}*$/u.test(reason))) return parent;
  const rawId = String(id);
  const entityId = /^(0|[1-9][0-9]*)$/.test(rawId) && BigInt(rawId) <= 18446744073709551615n ? id : void 0;
  return new MutationTraceScope(parent, {
    kind: "auditReason",
    name: entity,
    entityId,
    detail: reason
  });
}
var intentKinds = /* @__PURE__ */ new Set(["comment", "purpose", "auditReason"]);
var nonBlank = (value) => !/^\p{White_Space}*$/u.test(value);
function canonicalSQLTracePath(source, backend, operation) {
  const last = (kind) => {
    for (let index = source.length - 1; index >= 0; index--) {
      if (source[index].kind === kind) return source[index].detail ?? "";
    }
    return void 0;
  };
  const canonical = ["operation", "provider", "sql"].every((kind) => source.some((node) => node.kind === kind));
  let path;
  if (canonical) path = source.filter((node) => !intentKinds.has(node.kind));
  else {
    const root = source.find((node) => nonBlank(node.name))?.name ?? "unknown";
    let entity = root;
    if (operation !== "select") {
      for (const node of source) if (node.kind === "entity" && nonBlank(node.name)) entity = node.name;
    }
    path = [
      { kind: "operation", name: root, detail: operation === "select" ? "query" : "mutation" },
      { kind: operation === "select" ? "request" : "entity", name: operation === "select" ? root : entity, detail: "" },
      ...source.filter((node) => node.kind === "relation"),
      { kind: "provider", name: nonBlank(backend) ? backend : "unknown", detail: "" },
      { kind: "sql", name: operation, detail: "" }
    ];
  }
  return Object.freeze({
    tracePath: cloneTraceNodes(path),
    comment: last("comment"),
    purpose: last("purpose"),
    auditReason: last("auditReason")
  });
}
function queryTraceSource(entity, comment, purpose) {
  return cloneTraceNodes([
    { kind: "comment", name: entity, detail: comment },
    { kind: "purpose", name: entity, detail: purpose }
  ]);
}

// src/sql/log-rendering.ts
function debugSQL(parameterizedSQL, parameters, databaseKind = "sqlite") {
  return renderSQL(parameterizedSQL, parameters, databaseKind);
}
function renderSQL(parameterizedSQL, parameters, databaseKind, parameterLiteral) {
  if (parameterLiteral && !parameterizedSQL.trim()) throw new Error("Missing SQL template");
  let positionalIndex = 0;
  const used = /* @__PURE__ */ new Set();
  const literal = (index) => {
    if (index < 0 || index >= parameters.length) throw new Error("SQL bind count mismatch");
    used.add(index);
    return parameterLiteral ? parameterLiteral(index) : sqlLiteral(parameters[index], databaseKind);
  };
  let result = "";
  let state = "sql";
  for (let index = 0; index < parameterizedSQL.length; index++) {
    const char = parameterizedSQL[index];
    const next = parameterizedSQL[index + 1] ?? "";
    if (state === "sql" && char === "'") {
      result += char;
      state = "single";
      continue;
    }
    if (state === "sql" && char === '"') {
      result += char;
      state = "double";
      continue;
    }
    if (state === "sql" && char === "`") {
      result += char;
      state = "backtick";
      continue;
    }
    if (state === "sql" && char === "-" && next === "-") {
      result += "--";
      index++;
      state = "line-comment";
      continue;
    }
    if (state === "sql" && char === "/" && next === "*") {
      result += "/*";
      index++;
      state = "block-comment";
      continue;
    }
    if (state === "single") {
      result += char;
      if (char === "'" && next === "'") result += parameterizedSQL[++index];
      else if (char === "'") state = "sql";
      continue;
    }
    if (state === "double") {
      result += char;
      if (char === '"' && next === '"') result += parameterizedSQL[++index];
      else if (char === '"') state = "sql";
      continue;
    }
    if (state === "backtick") {
      result += char;
      if (char === "`" && next === "`") result += parameterizedSQL[++index];
      else if (char === "`") state = "sql";
      continue;
    }
    if (state === "line-comment") {
      result += char;
      if (char === "\r" || char === "\n") state = "sql";
      continue;
    }
    if (state === "block-comment") {
      result += char;
      if (char === "*" && next === "/") {
        result += "/";
        index++;
        state = "sql";
      }
      continue;
    }
    if (char === "?") {
      if (parameterLiteral || positionalIndex < parameters.length) result += literal(positionalIndex++);
      else result += char;
      continue;
    }
    if (char === "$" && /[0-9]/.test(parameterizedSQL[index + 1] ?? "")) {
      let end = index + 1;
      while (/[0-9]/.test(parameterizedSQL[end] ?? "")) end++;
      const parameterIndex = Number(parameterizedSQL.slice(index + 1, end)) - 1;
      result += parameterLiteral || parameterIndex >= 0 && parameterIndex < parameters.length ? literal(parameterIndex) : parameterizedSQL.slice(index, end);
      index = end - 1;
      continue;
    }
    if (parameterizedSQL.slice(index).match(/^@p[0-9]+/i)) {
      const placeholder = parameterizedSQL.slice(index).match(/^@p([0-9]+)/i);
      const parameterIndex = Number(placeholder[1]) - 1;
      result += parameterLiteral || parameterIndex >= 0 && parameterIndex < parameters.length ? literal(parameterIndex) : placeholder[0];
      index += placeholder[0].length - 1;
      continue;
    }
    result += char;
  }
  if (parameterLiteral && (used.size !== parameters.length || state !== "sql" && state !== "line-comment")) {
    throw new Error("Incomplete SQL diagnostic rendering");
  }
  return result;
}
function sqlLiteral(value, databaseKind) {
  if (value && typeof value === "object" && "type" in value) {
    const typed = value;
    if (typed.type === "Null" || typed.type === "TypedNull") return "NULL";
    if (typed.type === "Date") {
      const date = typed.value instanceof Date ? typed.value.toISOString().slice(0, 10) : String(typed.value);
      if (databaseKind === "postgresql") return `DATE ${quoteSQLString(date)}`;
      if (databaseKind === "mysql") return `CAST(${quoteSQLString(date)} AS DATE)`;
      return quoteSQLString(date);
    }
    if (typed.type === "Timestamp") {
      if (databaseKind === "sqlite") return String(typed.value);
      const iso = new Date(Number(typed.value)).toISOString();
      if (databaseKind === "postgresql") return `TIMESTAMPTZ ${quoteSQLString(iso)}`;
      return `CAST(${quoteSQLString(iso.slice(0, 23).replace("T", " "))} AS DATETIME(3))`;
    }
    if (typed.type === "Bool") return typed.value ? "TRUE" : "FALSE";
    if (["I64", "U64", "F64", "Decimal"].includes(typed.type)) return String(typed.value);
    if (typed.type === "Text") return quoteSQLString(String(typed.value));
  }
  if (value === null || value === void 0) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value instanceof Date) {
    if (databaseKind === "sqlite") return String(value.getTime());
    if (databaseKind === "postgresql") return `TIMESTAMPTZ ${quoteSQLString(value.toISOString())}`;
    return `CAST(${quoteSQLString(value.toISOString().slice(0, 23).replace("T", " "))} AS DATETIME(3))`;
  }
  if (value instanceof Uint8Array) {
    return `X'${Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("")}'`;
  }
  if (typeof value === "object") return quoteSQLString(JSON.stringify(value));
  return quoteSQLString(String(value));
}
function quoteSQLString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

// src/core/log-privacy.ts
var PLAINTEXT_LOG_ENV = "TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS";
var PLAINTEXT_LOG_ACK = "I_UNDERSTAND_SENSITIVE_DATA_MAY_BE_WRITTEN_TO_DISK";
var redacted = "[REDACTED]";
var redactedSQL = "[REDACTED SQL; NOT REPLAYABLE]";
var debugLabel = "-- TeaQL DEBUG PLAINTEXT; EXPLICIT OPT-IN\n";
var warned = false;
function maskAuditValue(value) {
  const scalars = Array.from(value);
  if (scalars.length < 8 || /^[0-9]+$/.test(value)) return "*".repeat(scalars.length);
  return scalars.slice(0, 2).join("") + "*".repeat(scalars.length - 4) + scalars.slice(-2).join("");
}
function plaintextLogsEnabled() {
  const environment = globalThis.process?.env;
  const enabled = environment?.[PLAINTEXT_LOG_ENV] === PLAINTEXT_LOG_ACK;
  if (enabled && !warned) {
    warned = true;
    console.warn("TeaQL: sensitive plaintext logging enabled; application data may be written to disk. Authentication secrets remain redacted.");
  }
  return enabled;
}
function credentialName(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [
    "password",
    "passwd",
    "passphrase",
    "privatekey",
    "secret",
    "accesstoken",
    "refreshtoken",
    "idtoken",
    "apikey",
    "authorization",
    "credential",
    "sessiontoken",
    "magiclinktoken"
  ].some((word) => normalized.includes(word));
}
function hasCredentials(value) {
  if (Array.isArray(value)) return value.some(hasCredentials);
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, child]) => credentialName(key) || hasCredentials(child));
  }
  return false;
}
function logValueStrings(value) {
  if (value === void 0 || value === null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap(logValueStrings);
  if (value instanceof Date) return [value.toISOString()];
  if (typeof value === "object") return Object.values(value).flatMap(logValueStrings);
  return [String(value)];
}
function scrubLogText(text, values) {
  return [...new Set(values)].sort((a, b) => b.length - a.length).reduce((result, value) => result?.split(value).join(redacted), text);
}
var projections = /* @__PURE__ */ new WeakMap();
var safeAlternatives = /* @__PURE__ */ new WeakMap();
var rawProvenance = /* @__PURE__ */ new WeakMap();
function retainSQLLogProvenance(metadata, bindings, intentValues = []) {
  rawProvenance.set(metadata, {
    bindings: bindings ? inheritSQLLogBindings(bindings) : void 0,
    intentValues: Object.freeze(intentValues.map(copyLogValue))
  });
}
function bindingPolicies(metadata) {
  const supplied = metadata.parameterLogPolicies;
  const valid = !!supplied && supplied.length === metadata.parameters.length;
  const credentialStatement = credentialName(metadata.parameterizedSQL) && (metadata.sqlOrigin !== "generated" || !valid);
  return metadata.parameters.map((value, index) => {
    if (credentialStatement || hasCredentials(value)) return "credential";
    const policy = valid ? supplied[index] : void 0;
    return policy === "plain" || policy === "masked" || policy === "credential" ? policy : "unknown";
  });
}
function bindingIsMasked(policy, allow) {
  return policy === "credential" || policy === "unknown" || !allow && policy !== "plain";
}
function privateLogValueStrings(source) {
  if (!source) return [];
  const policies = bindingPolicies(source);
  return source.parameters.flatMap((value, index) => bindingIsMasked(policies[index], false) ? logValueStrings(value) : []);
}
function copyLogValue(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (Array.isArray(value)) return Object.freeze(value.map(copyLogValue));
  if (value && typeof value === "object") return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, copyLogValue(child)])
  ));
  return value;
}
function inheritSQLLogBindings(source, inherited) {
  const sources = inherited ? [inherited, source] : [source];
  return Object.freeze({
    parameterizedSQL: "",
    sqlOrigin: "generated",
    parameters: Object.freeze(sources.flatMap((item) => item.parameters.map(copyLogValue))),
    parameterLogPolicies: Object.freeze(sources.flatMap(bindingPolicies))
  });
}
function businessMask(value) {
  if (value === null || value === void 0) return null;
  if (Array.isArray(value)) return value.map(businessMask);
  if (value && typeof value === "object" && "type" in value) {
    return businessMask(value.value);
  }
  if (typeof value === "object" && !(value instanceof Date)) return redacted;
  return maskAuditValue(value instanceof Date ? value.toISOString() : String(value));
}
function projectSQLLog(metadata, inherited, intentValues = []) {
  const allow = plaintextLogsEnabled() && metadata.logMode !== "masked";
  const prior = projections.get(metadata);
  if (prior !== void 0 && (!prior || allow)) return metadata;
  const safe = safeAlternatives.get(metadata);
  if (!allow && safe) return safe;
  const projected = projectWithPolicy(metadata, allow, inherited, intentValues);
  projections.set(projected, allow);
  if (allow) {
    const alternative = projectWithPolicy(metadata, false, inherited, intentValues);
    projections.set(alternative, false);
    safeAlternatives.set(projected, alternative);
  }
  return projected;
}
function projectWithPolicy(metadata, allow, inherited, intentValues = []) {
  const retained = rawProvenance.get(metadata);
  if (retained?.bindings) inherited = inheritSQLLogBindings(retained.bindings, inherited);
  if (retained) intentValues = [...intentValues, ...retained.intentValues];
  const supplied = metadata.parameterLogPolicies;
  const policiesValid = !supplied || supplied.length === metadata.parameters.length;
  const credentialStatement = credentialName(metadata.parameterizedSQL) && (metadata.sqlOrigin !== "generated" || !supplied || !policiesValid);
  const policies = bindingPolicies(metadata);
  const masked = policies.map((policy) => bindingIsMasked(policy, allow));
  const secrets = metadata.parameters.flatMap((value, index) => masked[index] ? logValueStrings(value) : []);
  if (inherited) {
    const inheritedPolicies = bindingPolicies(inherited);
    secrets.push(...inherited.parameters.flatMap((value, index) => bindingIsMasked(inheritedPolicies[index], allow) ? logValueStrings(value) : []));
  }
  const intentSecrets = [...secrets, ...intentValues.flatMap(logValueStrings)];
  const unknownDebugIntent = !allow && metadata.logMode === "debug-plaintext" && !inherited;
  const intentText = (value) => unknownDebugIntent && value ? redacted : scrubLogText(value, intentSecrets);
  const safeValues = metadata.parameters.map((value, index) => {
    if (!masked[index]) return copyLogValue(value);
    return policies[index] === "masked" ? businessMask(value) : redacted;
  });
  const bareTemplate = metadata.parameterizedSQL.replace(/\$[0-9]+|@p[0-9]+/gi, "?");
  const unsafeSQL = (!allow || credentialStatement) && metadata.sqlOrigin !== "generated" && /['"`$]|--|\/\*|\b\d+\b|:[A-Za-z_]/.test(bareTemplate);
  const kind = metadata.databaseKind ?? "sqlite";
  let rendered = redactedSQL;
  let omissionReason = unsafeSQL ? "untrusted-literal-sql" : !policiesValid ? "policy-count-mismatch" : void 0;
  if (!unsafeSQL && policiesValid) {
    try {
      rendered = renderSQL(metadata.parameterizedSQL, safeValues, kind, (index) => sqlLiteral(safeValues[index], kind) + (masked[index] ? " /* masked */" : ""));
      rendered = (allow ? masked.some(Boolean) ? "-- TeaQL DEBUG PLAINTEXT; EXPLICIT OPT-IN; PARTIALLY MASKED; NOT REPLAYABLE\n" : debugLabel : "-- TeaQL MASKED; NOT REPLAYABLE\n") + rendered;
    } catch {
      rendered = redactedSQL;
      omissionReason = "unsupported-or-mismatched-bindings";
    }
  }
  const projected = Object.freeze({
    ...metadata,
    ...metadata.statements ? { statements: Object.freeze(metadata.statements.map((statement) => projectWithPolicy(statement, allow, inheritSQLLogBindings(metadata, inherited), intentValues))) } : {},
    parameterizedSQL: unsafeSQL ? redactedSQL : metadata.sqlOrigin === "generated" ? metadata.parameterizedSQL : scrubLogText(metadata.parameterizedSQL, secrets),
    parameters: Object.freeze(safeValues),
    parameterLogPolicies: Object.freeze(policies),
    maskedParameters: Object.freeze(masked),
    logMode: allow ? "debug-plaintext" : "masked",
    omissionReason,
    debugSQL: rendered,
    comment: intentText(metadata.comment),
    purpose: intentText(metadata.purpose),
    auditReason: intentText(metadata.auditReason),
    // Counts are operational metadata, not a copy of a masked numeric binding.
    resultSummary: metadata.resultCount !== void 0 ? `${metadata.resultCount} rows returned` : metadata.affectedRows !== void 0 ? `${metadata.affectedRows} rows affected` : scrubLogText(metadata.resultSummary, secrets),
    tracePath: Object.freeze(metadata.tracePath.map((frame) => Object.freeze(
      Object.fromEntries(Object.entries(frame).map(([key, value]) => [key, key !== "entityId" && typeof value === "string" ? intentText(value) : value]))
    ))),
    // Typed identity is structural (as in the audit event's id), not prose.
    ...metadata.mutationLineage ? { mutationLineage: Object.freeze(metadata.mutationLineage.map((node) => Object.freeze(Object.fromEntries(Object.entries(node).map(([key, value]) => [key, key !== "entityId" && typeof value === "string" ? intentText(value) : value]))))) } : {}
  });
  return projected;
}

// src/core/query-snapshot.ts
var origins = /* @__PURE__ */ new WeakMap();
function queryDiagnosticOrigin(query) {
  return origins.get(query);
}
function retainQueryDiagnosticOrigin(source, target) {
  origins.set(target, origins.get(source) ?? snapshotQuery(source));
}
function snapshotQuery(value, seen = /* @__PURE__ */ new Map()) {
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Uint8Array) return new Uint8Array(value);
  const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if ("value" in descriptor && descriptor.enumerable) descriptor.value = snapshotQuery(descriptor.value, seen);
    Object.defineProperty(copy, key, descriptor);
  }
  const origin = origins.get(value);
  if (origin) origins.set(copy, origin);
  return copy;
}

// src/core/loaded-scalar-snapshot.ts
var _values;
var LoadedScalarSnapshot = class {
  constructor(values = {}) {
    __privateAdd(this, _values);
    __privateSet(this, _values, snapshotQuery(values));
    Object.freeze(this);
  }
  /** Copies prevent callers or mutable JSON/date fields from rewriting history. */
  values() {
    return snapshotQuery(__privateGet(this, _values));
  }
};
_values = new WeakMap();

// src/core/request-intent.ts
var mutationSnapshots = /* @__PURE__ */ new WeakMap();
var querySources = /* @__PURE__ */ new WeakMap();
var graphRequests = /* @__PURE__ */ new WeakMap();
var scopeOwners = /* @__PURE__ */ new WeakMap();
var RequestIntentError = class extends Error {
  constructor(code, field, requestKind) {
    super(`${code}: ${requestKind} request requires a non-blank ${field}; supply it at the request entry point`);
    this.code = code;
    this.field = field;
    this.requestKind = requestKind;
    this.name = "RequestIntentError";
  }
};
function requireText(value, field, kind) {
  if (typeof value !== "string" || /^\p{White_Space}*$/u.test(value)) {
    throw new RequestIntentError(
      field === "comment" ? "REQUEST_COMMENT_REQUIRED" : "QUERY_PURPOSE_REQUIRED",
      field,
      kind
    );
  }
  return value;
}
var _comment, _purpose;
var QueryIntent = class {
  constructor(comment, purpose) {
    __privateAdd(this, _comment);
    __privateAdd(this, _purpose);
    __privateSet(this, _comment, requireText(comment, "comment", "query"));
    __privateSet(this, _purpose, requireText(purpose, "purpose", "query"));
    Object.freeze(this);
  }
  get comment() {
    return __privateGet(this, _comment);
  }
  get purpose() {
    return __privateGet(this, _purpose);
  }
};
_comment = new WeakMap();
_purpose = new WeakMap();
var _comment2;
var MutationIntent = class {
  constructor(comment) {
    __privateAdd(this, _comment2);
    __privateSet(this, _comment2, requireText(comment, "comment", "mutation"));
    Object.freeze(this);
  }
  get comment() {
    return __privateGet(this, _comment2);
  }
  get auditReason() {
    return __privateGet(this, _comment2);
  }
  readbackIntent() {
    return new QueryIntent(__privateGet(this, _comment2), "verify persisted mutation result");
  }
};
_comment2 = new WeakMap();
var _intent, _query;
var _QueryRequest = class _QueryRequest {
  constructor(query, intent) {
    __privateAdd(this, _intent);
    __privateAdd(this, _query);
    const source = query;
    __privateSet(this, _intent, intent === void 0 ? new QueryIntent(source?._comment ?? source?.commentText, source?._purpose ?? source?.purposeText) : new QueryIntent(intent?.comment, intent?.purpose));
    __privateSet(this, _query, snapshotQuery(query));
    const captured = __privateGet(this, _query);
    for (const [field, value] of [
      ["commentText", this.comment],
      ["purposeText", this.purpose],
      ["_comment", this.comment],
      ["_purpose", this.purpose]
    ]) {
      Object.defineProperty(captured, field, {
        value,
        enumerable: !field.startsWith("_"),
        configurable: true,
        writable: false
      });
    }
    querySources.set(captured, cloneTraceNodes(querySources.get(query) ?? queryTraceSource(String(source.entity), this.comment, this.purpose)));
    Object.freeze(this);
  }
  get intent() {
    return __privateGet(this, _intent);
  }
  get query() {
    return __privateGet(this, _query);
  }
  get comment() {
    return __privateGet(this, _intent).comment;
  }
  get purpose() {
    return __privateGet(this, _intent).purpose;
  }
  get traceSource() {
    return querySources.get(__privateGet(this, _query));
  }
  /** Runtime derivation preserves this invocation's source across builder clones. */
  withQuery(query) {
    const request = new _QueryRequest(query, this.intent);
    querySources.set(request.query, cloneTraceNodes(this.traceSource));
    return request;
  }
  /** Append one local relation and its qualified property; never accept caller frames. */
  derive(query, relation) {
    const request = this.withQuery(query);
    querySources.set(request.query, cloneTraceNodes([...this.traceSource, {
      kind: "relation",
      name: relation,
      detail: `${String(this.query.entity)}.${relation}`
    }]));
    return request;
  }
};
_intent = new WeakMap();
_query = new WeakMap();
var QueryRequest = _QueryRequest;
var _intent2, _mutation;
var MutationRequest = class {
  constructor(mutation, intent) {
    __privateAdd(this, _intent2);
    __privateAdd(this, _mutation);
    __privateSet(this, _intent2, new MutationIntent(intent === void 0 ? mutation?.comment : intent?.comment));
    __privateSet(this, _mutation, { ...mutation });
    Object.defineProperty(__privateGet(this, _mutation), "comment", {
      value: __privateGet(this, _intent2).comment,
      enumerable: true,
      writable: false,
      configurable: false
    });
    Object.freeze(this);
  }
  get intent() {
    return __privateGet(this, _intent2);
  }
  get mutation() {
    return __privateGet(this, _mutation);
  }
  get comment() {
    return __privateGet(this, _intent2).comment;
  }
  /** @internal Generated hydration/commit provenance, never a wire field. */
  withLoadedSnapshot(snapshot) {
    mutationSnapshots.set(this, new LoadedScalarSnapshot(snapshot.values()));
    return this;
  }
  /** @internal Does not become part of the write payload or policy input. */
  loadedValues() {
    return mutationSnapshots.get(this)?.values() ?? {};
  }
  /** Runtime-owned execution capability; raw mutation fields cannot forge it. */
  get graphSession() {
    return graphRequests.get(this)?.session;
  }
  scopeFor(key) {
    const graph = graphRequests.get(this);
    const scope = mutationScopeForEntity(graph?.parent, key.entity, key.id, this.comment, graph?.localComment);
    if (graph) scopeOwners.set(scope, graph.session);
    return scope;
  }
  traceFor(key) {
    const mutation = __privateGet(this, _mutation);
    const specific = mutation.ledgerRoot?.traceChain(mutation.ledgerKey ?? key);
    return specific?.length ? cloneTraceNodes(specific) : this.scopeFor(key).recover();
  }
  /** Safe event projection; internal policy intent is never mutated. */
  auditProjection(key, payload, bindings) {
    const secrets = [
      ...logValueStrings(payload),
      ...logValueStrings(__privateGet(this, _mutation).id),
      ...bindings ? privateLogValueStrings(bindings) : logValueStrings(this.loadedValues()),
      ...privateLogValueStrings(this.graphSession?.logBindings)
    ];
    return Object.freeze({
      reason: scrubLogText(this.comment, secrets),
      mutationLineage: cloneTraceNodes(this.traceFor(key).map((node) => ({
        ...node,
        detail: scrubLogText(node.detail, secrets)
      })))
    });
  }
};
_intent2 = new WeakMap();
_mutation = new WeakMap();
var _intent3, _bindings;
var GraphMutationSession = class {
  constructor(intent) {
    __privateAdd(this, _intent3);
    __privateAdd(this, _bindings);
    __privateSet(this, _intent3, new MutationIntent(intent?.comment));
    Object.freeze(this);
  }
  get intent() {
    return __privateGet(this, _intent3);
  }
  request(mutation, parent, localComment) {
    if (parent && scopeOwners.get(parent) !== this)
      throw new Error("GRAPH_TRACE_SCOPE_MISMATCH: parent scope belongs to another graph invocation");
    const request = new MutationRequest(mutation, __privateGet(this, _intent3));
    graphRequests.set(request, { session: this, parent, localComment });
    return request;
  }
  /** @internal Preflight snapshots bind provenance for all siblings before SQL. */
  captureLogBindings(source) {
    __privateSet(this, _bindings, inheritSQLLogBindings(source, __privateGet(this, _bindings)));
  }
  /** @internal Never put this raw provenance on a wire or log record. */
  get logBindings() {
    return __privateGet(this, _bindings);
  }
};
_intent3 = new WeakMap();
_bindings = new WeakMap();
var GraphCommittedError = class extends Error {
  constructor(cause) {
    super("GRAPH_ALREADY_COMMITTED: post-commit processing failed; do not retry as an uncommitted mutation");
    this.cause = cause;
    this.committed = true;
    this.name = "GraphCommittedError";
  }
};

// src/core/mutation-policy.ts
var MISSING_MUTATION_POLICY = "MUTATION-POLICY-001";
var MISSING_MUTATION_POLICY_APPROVAL = "MUTATION-POLICY-002";
var MutationPolicyError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MutationPolicyError";
  }
};
var DelegatingMutationPolicyRegistry = class {
  constructor(resolver) {
    this.resolver = resolver;
  }
  resolve(requestKey) {
    return this.resolver(requestKey);
  }
};
var DelegatingMutationPolicyApprovalProvider = class {
  constructor(finder) {
    this.finder = finder;
  }
  findApproval(identity) {
    return this.finder(identity);
  }
};
var DelegatingMutationGovernanceSink = class {
  constructor(consumer) {
    this.consumer = consumer;
  }
  onWarning(context, warning) {
    this.consumer(context, warning);
  }
};
var ConsoleMutationGovernanceSink = class {
  onWarning(_context, warning) {
    if (!warning.firstOccurrence || typeof console === "undefined") return;
    console.warn(
      `TeaQL mutation policy warning code=${warning.warningCode} requestKey=${warning.snapshot.requestKey} source=${warning.snapshot.source} approval=${warning.snapshot.approvalStatus}`
    );
  }
};
var executionSequence = 0;
var MutationPolicyRuntimeState = class {
  constructor() {
    this.profile = {
      warningSink: new ConsoleMutationGovernanceSink()
    };
    this.emittedWarnings = /* @__PURE__ */ new Set();
    this.graphActive = false;
    this.graphReviewed = false;
    this.preflight = [];
    this.preflightKeys = [];
    this.remaining = /* @__PURE__ */ new Map();
  }
  setRegistry(registry) {
    this.profile.registry = registry;
  }
  setApprovalProvider(provider) {
    this.profile.approvalProvider = provider;
  }
  setWarningSink(sink) {
    this.profile.warningSink = sink;
  }
  beginGraph() {
    if (this.graphActive) throw new MutationPolicyError("mutation policy graph is already active");
    this.graphActive = true;
    this.graphReviewed = false;
    this.preflight = [];
    this.preflightKeys = [];
    this.rootEntity = void 0;
    this.auditReason = void 0;
    this.remaining.clear();
    this.graphSnapshot = void 0;
  }
  endGraph() {
    this.graphActive = false;
    this.graphReviewed = false;
    this.preflight = [];
    this.preflightKeys = [];
    this.rootEntity = void 0;
    this.auditReason = void 0;
    this.remaining.clear();
    this.graphSnapshot = void 0;
  }
  recordPreflight(mutation) {
    if (!this.graphActive) return;
    if (this.graphReviewed) {
      throw new MutationPolicyError("mutation preflight cannot change after policy review");
    }
    const operation = operationFromMutation(mutation);
    this.rootEntity ?? (this.rootEntity = operation.entity);
    this.auditReason ?? (this.auditReason = mutationComment(mutation));
    this.preflight.push(operation);
    this.preflightKeys.push(operationMatchKey(mutation, operation));
  }
  enterMutation(context, mutation) {
    const operation = operationFromMutation(mutation);
    if (!this.graphActive) {
      return { snapshot: this.review(context, this.plan(
        operation.entity,
        mutationComment(mutation),
        [operation]
      )) };
    }
    if (!this.graphReviewed) {
      if (this.profile.registry && this.preflight.length === 0) {
        throw new MutationPolicyError(
          "customer mutation policy requires complete graph preflight before provider mutation"
        );
      }
      if (!this.profile.registry && this.preflight.length === 0) {
        return { snapshot: this.review(context, this.plan(
          operation.entity,
          mutationComment(mutation),
          [operation]
        )) };
      }
      const operations = this.preflight.length ? this.preflight : [operation];
      this.graphSnapshot = this.review(context, this.plan(
        this.rootEntity ?? operations[0].entity,
        this.auditReason ?? mutationComment(mutation),
        operations
      ));
      this.remaining.clear();
      const plannedKeys = this.preflight.length ? this.preflightKeys : operations.map(operationSignature);
      for (const signature of plannedKeys) {
        this.remaining.set(signature, (this.remaining.get(signature) ?? 0) + 1);
      }
      this.graphReviewed = true;
    }
    this.consume(operationMatchKey(mutation, operation));
    return { snapshot: this.graphSnapshot };
  }
  ensureGraphComplete() {
    if (this.graphReviewed && this.remaining.size) {
      throw new MutationPolicyError(
        "reviewed mutation plan contains operations that were not executed"
      );
    }
  }
  review(context, input) {
    validatePlan(input);
    const plan = freezePlan(input);
    const policy = this.profile.registry?.resolve(plan.requestKey);
    let source;
    let identity;
    let approvalStatus;
    let warningCodes;
    if (!policy) {
      source = "generated_default";
      approvalStatus = "not_applicable";
      warningCodes = [MISSING_MUTATION_POLICY];
    } else {
      identity = freezeIdentity(policy.identity);
      const decision = policy.review(context, plan);
      if (!decision || decision.verdict !== "allow" && decision.verdict !== "deny") {
        throw new MutationPolicyError("customer mutation policy returned an invalid decision");
      }
      if (decision.verdict === "deny") {
        throw new MutationPolicyError(
          `[MUTATION POLICY DENIED] ${decision.code || "MUTATION-POLICY-DENIED"}: ${decision.message || "mutation rejected"}`
        );
      }
      source = "customer";
      const approval = this.profile.approvalProvider?.findApproval(identity);
      approvalStatus = validApproval(approval, identity) ? "approved" : "missing";
      warningCodes = approvalStatus === "approved" ? [] : [MISSING_MUTATION_POLICY_APPROVAL];
    }
    const snapshot = Object.freeze({
      executionId: plan.executionId,
      requestKey: plan.requestKey,
      source,
      policy: identity,
      approvalStatus,
      warningCodes: Object.freeze([...warningCodes]),
      operations: Object.freeze(plan.operations.map((operation) => Object.freeze({
        kind: operation.kind,
        entity: operation.entity,
        entityId: cloneAndFreeze(operation.entityId),
        changedFields: Object.freeze(Object.keys(operation.changedValues).sort())
      })))
    });
    for (const code of warningCodes) this.emitWarning(context, snapshot, code);
    return snapshot;
  }
  plan(root, reason, operations) {
    executionSequence += 1;
    return freezePlan({
      executionId: `teaql-mutation-${executionSequence}`,
      requestKey: `${root}.saveGraph`,
      rootEntityType: root,
      auditReason: new MutationIntent(reason).comment,
      operations
    });
  }
  consume(signature) {
    const count = this.remaining.get(signature) ?? 0;
    if (count < 1) {
      throw new MutationPolicyError(
        "provider mutation is not present in the reviewed graph plan"
      );
    }
    if (count === 1) this.remaining.delete(signature);
    else this.remaining.set(signature, count - 1);
  }
  emitWarning(context, snapshot, warningCode) {
    const policy = snapshot.policy ? `${snapshot.policy.policyId}:${snapshot.policy.version}:${snapshot.policy.fingerprint}` : "none";
    const key = `${snapshot.requestKey}|${policy}|${warningCode}`;
    const firstOccurrence = !this.emittedWarnings.has(key);
    this.emittedWarnings.add(key);
    try {
      this.profile.warningSink.onWarning(context, Object.freeze({
        snapshot,
        warningCode,
        firstOccurrence
      }));
    } catch {
    }
  }
};
function operationFromMutation(value) {
  const entity = String(value?.entity ?? "").trim();
  const action = String(value?.action ?? "").toLowerCase();
  const kinds = {
    create: "create",
    update: "update",
    delete: "delete",
    recover: "recover"
  };
  if (!entity || !kinds[action]) {
    throw new MutationPolicyError("mutation must contain a supported entity operation");
  }
  const payload = value?.payload && typeof value.payload === "object" ? value.payload : {};
  return Object.freeze({
    kind: kinds[action],
    entity,
    entityId: cloneAndFreeze(value?.id ?? payload.id),
    originalVersion: value?.version ?? value?.expectedVersion,
    changedValues: cloneRecord(payload)
  });
}
function mutationComment(value) {
  return new MutationIntent(value?.comment).comment;
}
function validatePlan(plan) {
  new MutationIntent(plan?.auditReason);
  if (!plan.executionId?.trim()) throw new MutationPolicyError("execution id is required");
  if (!plan.requestKey?.trim()) throw new MutationPolicyError("request key is required");
  if (!plan.rootEntityType?.trim()) throw new MutationPolicyError("root entity type is required");
  if (!plan.operations.length) throw new MutationPolicyError("mutation plan is empty");
}
function freezeIdentity(identity) {
  if (!identity || !identity.policyId?.trim() || !identity.version?.trim() || !identity.fingerprint?.trim()) {
    throw new MutationPolicyError("customer mutation policy identity is invalid");
  }
  return Object.freeze({
    policyId: identity.policyId.trim(),
    version: identity.version.trim(),
    fingerprint: identity.fingerprint.trim()
  });
}
function validApproval(approval, identity) {
  return !!approval && sameIdentity(approval.policy, identity) && !!approval.approvedBy?.trim() && approval.approvedAt instanceof Date && Number.isFinite(approval.approvedAt.getTime()) && approval.approvedAt.getTime() !== 0;
}
function sameIdentity(left, right) {
  return left.policyId === right.policyId && left.version === right.version && left.fingerprint === right.fingerprint;
}
function freezePlan(plan) {
  return Object.freeze({
    executionId: plan.executionId,
    requestKey: plan.requestKey,
    rootEntityType: plan.rootEntityType,
    auditReason: plan.auditReason,
    operations: Object.freeze(plan.operations.map((operation) => Object.freeze({
      kind: operation.kind,
      entity: operation.entity,
      entityId: cloneAndFreeze(operation.entityId),
      originalVersion: operation.originalVersion,
      changedValues: cloneRecord(operation.changedValues)
    })))
  });
}
function cloneAndFreeze(value, ancestors = /* @__PURE__ */ new WeakSet()) {
  if (value === null || value === void 0 || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if (ancestors.has(value)) {
      throw new MutationPolicyError("mutation policy values must not contain cycles");
    }
    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        return Object.freeze(value.map((item) => cloneAndFreeze(item, ancestors)));
      }
      const record = value;
      if ("id" in record && Object.keys(record).some((key) => key !== "id")) {
        return cloneAndFreeze(record.id, ancestors);
      }
      return Object.freeze(Object.fromEntries(
        Object.entries(record).map(([key, item]) => [key, cloneAndFreeze(item, ancestors)])
      ));
    } finally {
      ancestors.delete(value);
    }
  }
  return String(value);
}
function cloneRecord(value) {
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, cloneAndFreeze(item)])
  ));
}
function operationSignature(operation) {
  return canonicalJSON({
    kind: operation.kind,
    entity: operation.entity,
    entityId: operation.entityId,
    originalVersion: operation.originalVersion,
    changedValues: operation.changedValues
  });
}
function operationMatchKey(mutation, operation) {
  const ledgerKey = mutation?.ledgerKey;
  if (ledgerKey && typeof ledgerKey === "object" && String(ledgerKey.entity ?? "").trim() && ledgerKey.id !== void 0 && ledgerKey.id !== null) {
    return `ledger:${String(ledgerKey.entity).trim()}:${canonicalJSON(ledgerKey.id)}`;
  }
  return `operation:${operationSignature(operation)}`;
}
function canonicalJSON(value) {
  if (typeof value === "bigint") return JSON.stringify(`${value.toString()}n`);
  if (value === void 0) return '"<undefined>"';
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJSON(item)}`).join(",")}}`;
}

// src/core/context.ts
var resourceIdentities = /* @__PURE__ */ new WeakMap();
var nextResourceIdentity = 1;
function resourceIdentity(value) {
  if (!value || typeof value !== "object" && typeof value !== "function") return String(value);
  const object = value;
  let identity = resourceIdentities.get(object);
  if (!identity) {
    identity = nextResourceIdentity++;
    resourceIdentities.set(object, identity);
  }
  return String(identity);
}
var ContextRootError = class extends Error {
  constructor(reason, expectedType, activeRoot) {
    super(`context root ${reason}: expected ${expectedType}`);
    this.reason = reason;
    this.expectedType = expectedType;
    this.activeRoot = activeRoot;
    this.name = "ContextRootError";
  }
};
var UserContext = class {
  constructor() {
    this.mutationPolicy = new MutationPolicyRuntimeState();
    this.resources = /* @__PURE__ */ new Map();
    this.continuousPageCursors = /* @__PURE__ */ new Map();
    this.retainedIdSets = /* @__PURE__ */ new Map();
    this.idSetBuilds = /* @__PURE__ */ new Map();
    this.continuousPageRuntime = {
      owner: "",
      get: (key, offset) => this.getContinuousPageCursor(key, offset),
      put: (key, offset, cursor) => this.putContinuousPageCursor(key, offset, cursor),
      observe: (plan, cursorId) => {
        this.continuousPagePlan = plan;
        this.continuousPageCursorId = cursorId;
      }
    };
    this.idSetPaginationRuntime = {
      owner: "",
      scope: "",
      get: (key) => this.idSetStore().get(key),
      put: (key, value) => this.idSetStore().put(key, value),
      build: (key, builder) => this.singleFlightIdSetBuild(key, builder),
      observe: (plan, count) => {
        this.idSetPaginationPlan = plan;
        this.idSetPaginationCount = count;
        this.idSetPaginationCountAccuracy = plan === "ID_SET_BUILD" || plan === "ID_SET_HIT" ? "EXACT" : plan === "ID_SET_FALLBACK_LIMIT_EXCEEDED" ? "LOWER_BOUND" : "UNKNOWN";
      }
    };
    this.userIdentifier = "";
    this.continuousPagePlan = "DISABLED";
    this.idSetPaginationPlan = "ID_SET_DISABLED";
    this.idSetPaginationCountAccuracy = "UNKNOWN";
    this.locale = "en";
    this.i18nCatalog = I18nCatalog.builtin;
  }
  setLocaleCode(code) {
    const locale = parseLocale(code);
    this.locale = locale;
    return this;
  }
  setLanguageCode(code) {
    return this.setLocaleCode(code);
  }
  installI18nCatalog(catalog) {
    if (!catalog) throw new Error("catalog is required");
    this.i18nCatalog = catalog;
    return this;
  }
  installIdSetPaginationStore(store) {
    if (!store) throw new Error("ID set pagination store is required");
    return this.insertResource("idSetPaginationStore", store);
  }
  translateCheckResults(results) {
    return results.map((result) => this.i18nCatalog.translate(result, this.locale));
  }
  withMutationPolicyRegistry(registry) {
    if (!registry || typeof registry.resolve !== "function") {
      throw new TypeError("mutation policy registry must expose resolve(requestKey)");
    }
    this.mutationPolicy.setRegistry(registry);
    return this;
  }
  withMutationPolicyApprovalProvider(provider) {
    if (!provider || typeof provider.findApproval !== "function") {
      throw new TypeError("mutation policy approval provider must expose findApproval(identity)");
    }
    this.mutationPolicy.setApprovalProvider(provider);
    return this;
  }
  withMutationGovernanceSink(sink) {
    if (!sink || typeof sink.onWarning !== "function") {
      throw new TypeError("mutation governance sink must expose onWarning(context, warning)");
    }
    this.mutationPolicy.setWarningSink(sink);
    return this;
  }
  reviewMutationPlan(plan) {
    return this.mutationPolicy.review(this, plan);
  }
  /** @internal Used by governed data-service graph orchestration. */
  beginMutationPolicyGraph() {
    this.mutationPolicy.beginGraph();
  }
  /** @internal Used by generated preflight after Checker/Fix. */
  recordMutationPolicyPreflight(mutation) {
    this.mutationPolicy.recordPreflight(mutation);
  }
  /** @internal Called at the provider mutation boundary. */
  enterMutationPolicy(mutation) {
    return this.mutationPolicy.enterMutation(this, mutation).snapshot;
  }
  /** @internal Must run before the surrounding graph transaction commits. */
  ensureMutationPolicyGraphComplete() {
    this.mutationPolicy.ensureGraphComplete();
  }
  /** @internal Always runs when the graph operation leaves its transaction. */
  endMutationPolicyGraph() {
    this.mutationPolicy.endGraph();
  }
  beginFixEvidence() {
    return this.insertResource("fixEvidenceCurrent", []);
  }
  recordFixEvidence(evidence) {
    const label = String(evidence.sourceLabel || "");
    const normalized = label.toLowerCase();
    if (!evidence.entityType || !evidence.modelPath || !label || normalized.includes("authorization") || normalized.includes("cookie") || normalized.includes("token=")) {
      throw new TypeError("Fix evidence must contain only safe framework provenance labels");
    }
    const current = this.getResource("fixEvidenceCurrent") ?? [];
    if (!this.getResource("fixEvidenceCurrent")) this.insertResource("fixEvidenceCurrent", current);
    current.push(Object.freeze({ ...evidence }));
    return this;
  }
  finishFixEvidence() {
    const current = this.getResource("fixEvidenceCurrent") ?? [];
    this.insertResource("fixEvidenceLast", Object.freeze([...current]));
    return this.removeResource("fixEvidenceCurrent");
  }
  lastFixEvidence() {
    return this.getResource("fixEvidenceLast") ?? [];
  }
  insertResource(name, resource) {
    this.resources.set(name, resource);
    return this;
  }
  getResource(name) {
    return this.resources.get(name);
  }
  removeResource(name) {
    this.resources.delete(name);
    return this;
  }
  requireResource(name) {
    const resource = this.getResource(name);
    if (resource === void 0) {
      throw new Error(`Required UserContext resource is missing: ${name}`);
    }
    return resource;
  }
  /**
   * Explicitly reconcile the installed Runtime Module with this context's data service.
   * Installing a module never performs schema changes.
   */
  ensureSchema() {
    const service = this.requireResource("dataService");
    const ensure = service[contextSchemaCapability];
    if (!ensure) {
      throw new Error("Configured dataService is not a schema-aware TeaQL provider");
    }
    return ensure.call(service, this);
  }
  withActiveRoot(root) {
    if (!root || !root.entity || root.id === void 0 || root.id === null) {
      throw new TypeError("active root must be a typed entity reference");
    }
    return this.insertResource("activeRoot", Object.freeze({ ...root }));
  }
  requireActiveRoot(expectedType) {
    const root = this.getResource("activeRoot");
    if (!root) throw new ContextRootError("missing", expectedType);
    if (root.entity !== expectedType) throw new ContextRootError("type_mismatch", expectedType, root);
    return root;
  }
  /**
   * Bind local optimization state without copying trusted runtime resources
   * into the query or federation JSON payload.
   */
  prepareQuery(query) {
    this.continuousPageRuntime.owner = this.userIdentifier;
    this.idSetPaginationRuntime.owner = this.userIdentifier;
    const activeRoot = this.getResource("activeRoot");
    this.idSetPaginationRuntime.scope = [
      this.userIdentifier,
      activeRoot ? `${activeRoot.entity}:${String(activeRoot.id)}` : "-",
      resourceIdentity(this.getResource("dataService"))
    ].join("|");
    return query.bindContinuousPageRuntime(this.continuousPageRuntime).bindIdSetPaginationRuntime(this.idSetPaginationRuntime);
  }
  getContinuousPageCursor(key, offset) {
    const storeKey = `${key}:${offset}`;
    const cursor = this.continuousPageCursors.get(storeKey);
    if (cursor && cursor.expiresAt <= Date.now()) {
      this.continuousPageCursors.delete(storeKey);
      return void 0;
    }
    return cursor;
  }
  putContinuousPageCursor(key, offset, cursor) {
    if (this.continuousPageCursors.size >= 4096) {
      const oldest = [...this.continuousPageCursors.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
      if (oldest) this.continuousPageCursors.delete(oldest[0]);
    }
    this.continuousPageCursors.set(`${key}:${offset}`, cursor);
  }
  getRetainedIdSet(key) {
    const value = this.retainedIdSets.get(key);
    if (value && value.expiresAt <= Date.now()) {
      this.retainedIdSets.delete(key);
      return void 0;
    }
    return value;
  }
  idSetStore() {
    return this.getResource("idSetPaginationStore") ?? {
      get: (key) => this.getRetainedIdSet(key),
      put: (key, value) => this.putRetainedIdSet(key, value),
      invalidate: (key) => {
        this.retainedIdSets.delete(key);
      }
    };
  }
  putRetainedIdSet(key, value) {
    const memoryCeiling = 256 * 1024 * 1024;
    if (value.ids.byteLength > memoryCeiling) {
      throw new Error("ID set exceeds the process-local store memory ceiling");
    }
    const retainedBytes = () => [...this.retainedIdSets.values()].reduce((sum, retained) => sum + retained.ids.byteLength, 0);
    while (this.retainedIdSets.size >= 64 || retainedBytes() + value.ids.byteLength > memoryCeiling) {
      const oldest = [...this.retainedIdSets.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
      if (!oldest) break;
      this.retainedIdSets.delete(oldest[0]);
    }
    this.retainedIdSets.set(key, value);
  }
  async singleFlightIdSetBuild(key, builder) {
    const existing = this.idSetBuilds.get(key);
    if (existing) return { value: await existing, built: false };
    const pending = builder();
    this.idSetBuilds.set(key, pending);
    try {
      return { value: await pending, built: true };
    } finally {
      this.idSetBuilds.delete(key);
    }
  }
};

// src/core/checker.ts
var CheckException = class extends Error {
  constructor(violations) {
    super(`Check failed: ${violations.map((v) => v.message ?? `${v.ruleId}:${v.location}`).join("; ")}`);
    this.violations = violations;
    this.name = "CheckException";
  }
};

// src/core/ast.ts
var SortDirection = /* @__PURE__ */ ((SortDirection2) => {
  SortDirection2["Asc"] = "Asc";
  SortDirection2["Desc"] = "Desc";
  return SortDirection2;
})(SortDirection || {});
var OrderBy = class _OrderBy {
  constructor(field, expr, direction) {
    this.field = field;
    this.expr = expr;
    this.direction = direction;
  }
  static new(field, direction) {
    return new _OrderBy(field, null, direction);
  }
  static expr(expr, direction) {
    return new _OrderBy("", expr, direction);
  }
  static asc(field) {
    return _OrderBy.new(field, "Asc" /* Asc */);
  }
  static desc(field) {
    return _OrderBy.new(field, "Desc" /* Desc */);
  }
};
var AggregationCacheOptions = class _AggregationCacheOptions {
  constructor(enabledValue, cacheExpiredMillis, propagateValue, propagateCacheExpiredMillis) {
    this.enabledValue = enabledValue;
    this.cacheExpiredMillis = cacheExpiredMillis;
    this.propagateValue = propagateValue;
    this.propagateCacheExpiredMillis = propagateCacheExpiredMillis;
  }
  static enabled(cacheExpiredMillis) {
    return new _AggregationCacheOptions(true, cacheExpiredMillis, false, 0);
  }
  propagate(cacheExpiredMillis) {
    this.propagateValue = true;
    this.propagateCacheExpiredMillis = cacheExpiredMillis;
    return this;
  }
};
var SelectQuery = class _SelectQuery {
  constructor(entity) {
    this.hardLimitValue = 1e4;
    this.filterCondition = null;
    this.limitValue = 0;
    this.offsetValue = 0;
    this.orderItems = [];
    this.selectItems = [];
    this.properties = [];
    this.joins = [];
    this.groupByItems = [];
    this.aggregateItems = [];
    this.facets = [];
    this.relations = [];
    this.relationAggregates = [];
    this.entity = entity;
    Object.defineProperty(this, "hardLimitValue", { enumerable: false, writable: true, value: 1e4 });
    Object.defineProperty(this, "continuousPageFetchOptions", { enumerable: false, writable: true, value: void 0 });
    Object.defineProperty(this, "continuousPageRuntimeContext", { enumerable: false, writable: true, value: void 0 });
    Object.defineProperty(this, "idSetPaginationOptions", { enumerable: false, writable: true, value: void 0 });
    Object.defineProperty(this, "idSetPaginationRuntimeContext", { enumerable: false, writable: true, value: void 0 });
    Object.defineProperty(this, "topNProbeThreshold", { enumerable: false, writable: true, value: void 0 });
  }
  comment(text) {
    this.commentText = text;
    return this;
  }
  purpose(text) {
    this.purposeText = text;
    return this;
  }
  facetBy(facetName, relationName, request, includeAllFacets = true) {
    this.facets.push({
      facetName,
      relationName,
      query: request.toQuery(),
      includeAllFacets
    });
    return this;
  }
  clone() {
    const copy = snapshotQuery(this);
    for (const field of ["commentText", "purposeText", "_comment", "_purpose"]) {
      const descriptor = Object.getOwnPropertyDescriptor(copy, field);
      if (descriptor && "value" in descriptor && descriptor.configurable) {
        Object.defineProperty(copy, field, { ...descriptor, writable: true });
      }
    }
    return copy;
  }
  filter(condition) {
    this.filterCondition = condition;
    return this;
  }
  limit(limit) {
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new Error("QUERY_INVALID_LIMIT: limit must be a positive safe integer");
    }
    this.limitValue = limit;
    return this;
  }
  optimizeForContinuousPageFetch() {
    return this.optimizeForContinuousPageFetchWith("default", 600);
  }
  optimizeForContinuousPageFetchWith(namespace, ttlSeconds) {
    if (!namespace?.trim()) throw new Error("continuous page namespace must not be empty");
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) throw new Error("continuous page ttlSeconds must be a positive integer");
    this.continuousPageFetchOptions = { namespace, ttlSeconds };
    return this;
  }
  bindContinuousPageRuntime(runtime) {
    this.continuousPageRuntimeContext = runtime;
    return this;
  }
  localContinuousPageOptions() {
    return this.continuousPageFetchOptions;
  }
  localContinuousPageRuntime() {
    return this.continuousPageRuntimeContext;
  }
  clearContinuousPageRuntime() {
    this.continuousPageRuntimeContext = void 0;
    return this;
  }
  optimizePaginationWithIdSet() {
    return this.optimizePaginationWithIdSetConfig("default", 600, 3e6);
  }
  optimizePaginationWithIdSetConfig(namespace, ttlSeconds, maxIds) {
    if (!namespace?.trim()) throw new Error("ID set namespace must not be empty");
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) throw new Error("ID set ttlSeconds must be a positive integer");
    if (!Number.isSafeInteger(maxIds) || maxIds <= 0) throw new Error("ID set maxIds must be a positive integer");
    this.idSetPaginationOptions = { namespace, ttlSeconds, maxIds };
    return this;
  }
  bindIdSetPaginationRuntime(runtime) {
    this.idSetPaginationRuntimeContext = runtime;
    return this;
  }
  localIdSetPaginationOptions() {
    return this.idSetPaginationOptions;
  }
  localIdSetPaginationRuntime() {
    return this.idSetPaginationRuntimeContext;
  }
  clearIdSetPaginationRuntime() {
    this.idSetPaginationRuntimeContext = void 0;
    return this;
  }
  topNProbeParentThreshold(threshold) {
    if (!Number.isSafeInteger(threshold) || threshold < 0) {
      throw new Error("topNProbeParentThreshold must be a non-negative safe integer");
    }
    this.topNProbeThreshold = threshold;
    return this;
  }
  localTopNProbeParentThreshold() {
    return this.topNProbeThreshold;
  }
  prepareForList() {
    if (!Number.isSafeInteger(this.offsetValue) || this.offsetValue < 0) {
      throw new Error("QUERY_INVALID_OFFSET: offset must be a non-negative safe integer");
    }
    if (this.limitValue && (!Number.isSafeInteger(this.limitValue) || this.limitValue < 1)) {
      throw new Error("QUERY_INVALID_LIMIT: limit must be a positive safe integer");
    }
    this.applyListLimit(this.hardLimitValue);
    return this;
  }
  forExactCount(alias = "__teaql_total") {
    const count = new _SelectQuery(this.entity);
    count.filterCondition = snapshotQuery(this.filterCondition);
    count.commentText = this.commentText;
    count.purposeText = this.purposeText;
    count.aggregate("Count", "id", alias);
    retainQueryDiagnosticOrigin(this, count);
    return count;
  }
  applyListLimit(ceiling) {
    if (!this.limitValue) this.limitValue = ceiling;
    if (this.limitValue > ceiling) {
      throw new Error(`QUERY_HARD_LIMIT_EXCEEDED: requested limit ${this.limitValue} exceeds hard limit ${ceiling}`);
    }
    for (const relation of this.relations) {
      relation.query?.applyListLimit(1e4);
    }
  }
  offset(offset) {
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new Error("QUERY_INVALID_OFFSET: offset must be a non-negative safe integer");
    }
    this.offsetValue = offset;
    return this;
  }
  relation(name) {
    this.relations.push({ name });
    return this;
  }
  relationQuery(name, query, localKey = "id", foreignKey = "id", many = true) {
    this.relations.push({ name, query, localKey, foreignKey, many });
    return this;
  }
  relationAggregate(relationName, alias, query, singleResult = true) {
    this.relationAggregates.push({ relationName, alias, query, singleResult });
    return this;
  }
  order(orderBy) {
    this.orderItems.push(orderBy);
    return this;
  }
  select(items) {
    this.selectItems.push(...items);
    return this;
  }
  enableAggregationCacheFor(cacheExpiredMillis) {
    this.aggregationCache = AggregationCacheOptions.enabled(cacheExpiredMillis);
    return this;
  }
  propagateAggregationCache(cacheExpiredMillis) {
    if (!this.aggregationCache) {
      this.aggregationCache = AggregationCacheOptions.enabled(0);
    }
    this.aggregationCache.propagate(cacheExpiredMillis);
    return this;
  }
  aggregate(functionName, field, alias) {
    this.aggregateItems.push({ function: functionName, field, alias });
    return this;
  }
  groupBy(item) {
    this.groupByItems.push(item);
    return this;
  }
};
var MutationQuery = class {
  constructor(entity, action, payload, id, comment, expectedVersion) {
    this.entity = entity;
    this.action = action;
    this.payload = payload;
    this.id = id;
    this.comment = comment;
    this.expectedVersion = expectedVersion;
  }
};

// src/core/runtime-module.ts
function mergeRuntimeBootstrap(left, right) {
  const leftRoot = left.defaultDomainRoot;
  const rightRoot = right.defaultDomainRoot;
  if (leftRoot && rightRoot && (leftRoot.entity !== rightRoot.entity || leftRoot.id !== rightRoot.id)) {
    throw new Error("Cannot compose Runtime Modules with different Default Domain Roots");
  }
  const constants = /* @__PURE__ */ new Map();
  for (const value of [...left.constants ?? [], ...right.constants ?? []]) {
    constants.set(`${value.entity}:${value.id}`, value);
  }
  return {
    defaultDomainRoot: rightRoot ?? leftRoot,
    constants: [...constants.values()],
    ensure: left.ensure && right.ensure ? async (context) => {
      await left.ensure(context);
      await right.ensure(context);
    } : right.ensure ?? left.ensure
  };
}
var RuntimeModule = class _RuntimeModule {
  constructor(schemas = {}, checkers = {}, bootstrap = {}) {
    this.schemas = Object.freeze({ ...schemas });
    this.checkers = Object.freeze({ ...checkers });
    this.bootstrap = Object.freeze({
      defaultDomainRoot: bootstrap.defaultDomainRoot,
      constants: Object.freeze([...bootstrap.constants ?? []]),
      ensure: bootstrap.ensure
    });
  }
  and(other) {
    return new _RuntimeModule(
      { ...this.schemas, ...other.schemas },
      { ...this.checkers, ...other.checkers },
      mergeRuntimeBootstrap(this.bootstrap, other.bootstrap)
    );
  }
};

export {
  locales,
  UnsupportedLocaleError,
  parseLocale,
  checkResultToWire,
  I18nCatalog,
  contextSchemaCapability,
  cloneTraceNodes,
  MutationTraceScope,
  mutationScopeForEntity,
  canonicalSQLTracePath,
  queryTraceSource,
  debugSQL,
  credentialName,
  retainSQLLogProvenance,
  inheritSQLLogBindings,
  projectSQLLog,
  queryDiagnosticOrigin,
  LoadedScalarSnapshot,
  RequestIntentError,
  QueryIntent,
  MutationIntent,
  QueryRequest,
  MutationRequest,
  GraphMutationSession,
  GraphCommittedError,
  MISSING_MUTATION_POLICY,
  MISSING_MUTATION_POLICY_APPROVAL,
  MutationPolicyError,
  DelegatingMutationPolicyRegistry,
  DelegatingMutationPolicyApprovalProvider,
  DelegatingMutationGovernanceSink,
  MutationPolicyRuntimeState,
  ContextRootError,
  UserContext,
  CheckException,
  SortDirection,
  OrderBy,
  AggregationCacheOptions,
  SelectQuery,
  MutationQuery,
  mergeRuntimeBootstrap,
  RuntimeModule
};
//# sourceMappingURL=chunk-JFFK4LZP.js.map
