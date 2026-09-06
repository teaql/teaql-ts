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
    const copy = new _SelectQuery(this.entity);
    copy.filterCondition = this.filterCondition;
    copy.limitValue = this.limitValue;
    copy.offsetValue = this.offsetValue;
    copy.orderItems = [...this.orderItems];
    copy.selectItems = [...this.selectItems];
    copy.properties = [...this.properties];
    copy.joins = [...this.joins];
    copy.groupByItems = [...this.groupByItems];
    copy.aggregateItems = this.aggregateItems.map((item) => ({ ...item }));
    copy.aggregationCache = this.aggregationCache;
    copy.facets = this.facets.map((facet) => ({ ...facet, query: facet.query.clone() }));
    copy.relations = this.relations.map((relation) => ({
      ...relation,
      query: relation.query?.clone()
    }));
    copy.relationAggregates = this.relationAggregates.map((aggregate) => ({
      ...aggregate,
      query: aggregate.query.clone()
    }));
    copy.commentText = this.commentText;
    copy.purposeText = this.purposeText;
    copy.idSetPaginationOptions = this.idSetPaginationOptions;
    copy.idSetPaginationRuntimeContext = this.idSetPaginationRuntimeContext;
    copy.topNProbeThreshold = this.topNProbeThreshold;
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
    count.filterCondition = this.filterCondition;
    count.commentText = this.commentText;
    count.purposeText = this.purposeText;
    count.aggregate("Count", "id", alias);
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

export {
  locales,
  UnsupportedLocaleError,
  parseLocale,
  checkResultToWire,
  I18nCatalog,
  contextSchemaCapability,
  ContextRootError,
  UserContext,
  CheckException,
  mergeRuntimeBootstrap,
  RuntimeModule,
  SortDirection,
  OrderBy,
  AggregationCacheOptions,
  SelectQuery,
  MutationQuery
};
//# sourceMappingURL=chunk-65WCFPGD.js.map
