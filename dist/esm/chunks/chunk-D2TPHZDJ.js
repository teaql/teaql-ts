import {
  decimalOrderKey
} from "./chunk-2M5YIPLE.js";
import {
  ObjectStorage
} from "./chunk-QG6ZEHP2.js";
import {
  __privateAdd,
  __privateGet,
  __privateSet,
  __privateWrapper
} from "./chunk-UNAWFD3C.js";

// src/core/long.ts
var LONG_TEXT = /^-?(?:0|[1-9][0-9]*)$/;
var MIN_LONG = -(1n << 63n);
var MAX_LONG = (1n << 63n) - 1n;
function long(value) {
  if (typeof value !== "string" && typeof value !== "bigint") {
    throw new TypeError("Long requires a signed 64-bit integer string or bigint");
  }
  const text = String(value);
  if (!LONG_TEXT.test(text)) throw new TypeError("Long requires a canonical integer string");
  const exact = BigInt(text);
  if (exact < MIN_LONG || exact > MAX_LONG) throw new RangeError("Long is outside signed 64-bit range");
  return exact.toString();
}
function compareLongs(left, right) {
  const a = BigInt(long(left));
  const b = BigInt(long(right));
  return a < b ? -1 : a > b ? 1 : 0;
}
function longOrderKey(value) {
  return decimalOrderKey(long(value));
}

// src/core/checker.ts
var CheckException = class extends Error {
  constructor(violations) {
    super(`Check failed: ${violations.map((v) => v.message ?? `${v.ruleId}:${v.location}`).join("; ")}`);
    this.violations = violations;
    this.name = "CheckException";
  }
};

// src/core/object-location.ts
function lowerCamel(name) {
  const parts = name.split("_");
  return parts[0] + parts.slice(1).map((part) => part ? part[0].toUpperCase() + part.slice(1) : "").join("");
}
function renderJsonFieldName(name, profile) {
  if (profile === "snake_case") return name;
  const camel = lowerCamel(name);
  if (profile === "camelCase" || !camel) return camel;
  return camel[0].toUpperCase() + camel.slice(1);
}
function escapeJsonPointer(value) {
  return value.replace(/~/g, "~0").replace(/\//g, "~1");
}
var ObjectLocation = class _ObjectLocation {
  constructor(segments) {
    this.segments = segments;
  }
  static root() {
    return new _ObjectLocation([]);
  }
  static property(name) {
    return _ObjectLocation.root().property(name);
  }
  property(name) {
    return new _ObjectLocation([...this.segments, { kind: "property", name }]);
  }
  index(index) {
    return new _ObjectLocation([...this.segments, { kind: "index", index }]);
  }
  prefixedBy(prefix) {
    return new _ObjectLocation([...prefix.segments, ...this.segments]);
  }
  modelPath() {
    return this.render((name) => name);
  }
  nativePath() {
    return this.render(lowerCamel);
  }
  instancePath(profile = "camelCase") {
    return this.segments.map((segment) => segment.kind === "index" ? String(segment.index) : escapeJsonPointer(renderJsonFieldName(segment.name, profile))).map((value) => `/${value}`).join("");
  }
  toString() {
    return this.nativePath();
  }
  render(propertyName) {
    let result = "";
    for (const segment of this.segments) {
      if (segment.kind === "index") result += `[${segment.index}]`;
      else result += `${result ? "." : ""}${propertyName(segment.name)}`;
    }
    return result;
  }
};

// src/core/mutation-version.ts
var MIN = -(1n << 63n);
var MAX = (1n << 63n) - 1n;
var SAFE = BigInt(Number.MAX_SAFE_INTEGER);
var MutationVersionError = class extends CheckException {
  constructor(code, operation = "mutation") {
    super([{
      ruleId: code,
      location: ObjectLocation.property("version"),
      message: code === "version_exhausted" ? `${operation} version is exhausted in the signed 64-bit domain` : `${operation} requires an exact version in its permitted lifecycle state`
    }]);
    this.code = code;
    this.name = "MutationVersionError";
  }
};
function entityVersion(value) {
  let exact;
  if (typeof value === "bigint") exact = value;
  else if (typeof value === "number" && Number.isSafeInteger(value)) exact = BigInt(value);
  else if (typeof value === "string" && /^(?:0|-?[1-9][0-9]*)$/.test(value)) exact = BigInt(value);
  else throw new MutationVersionError("invalid_type");
  if (exact < MIN || exact > MAX) throw new MutationVersionError("invalid_type");
  return exact >= -SAFE && exact <= SAFE ? Number(exact) : long(exact);
}
function nextEntityVersion(operation, original) {
  if (operation === "Create") return 1;
  const version = BigInt(entityVersion(original));
  let next;
  switch (operation) {
    case "Update":
      if (version <= 0n) throw new MutationVersionError("invalid_type", operation);
      next = version + 1n;
      break;
    case "Delete":
      if (version <= 0n) throw new MutationVersionError("invalid_type", operation);
      next = -version - 1n;
      break;
    case "Recover":
      if (version >= 0n) throw new MutationVersionError("invalid_type", operation);
      next = -version + 1n;
      break;
    default:
      throw new MutationVersionError("invalid_type");
  }
  if (next < MIN || next > MAX) throw new MutationVersionError("version_exhausted", operation);
  return entityVersion(next);
}

// src/core/business-clock.ts
var SystemBusinessClock = class {
  now() {
    return /* @__PURE__ */ new Date();
  }
};
var FixedBusinessClock = class {
  constructor(value) {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new TypeError("Business clock requires a valid Date");
    this.milliseconds = value.getTime();
  }
  now() {
    return new Date(this.milliseconds);
  }
};

// src/core/value-privacy.ts
var PLAINTEXT_LOG_ENV = "TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS";
var PLAINTEXT_LOG_ACK = "I_UNDERSTAND_SENSITIVE_DATA_MAY_BE_WRITTEN_TO_DISK";
var redacted = "[REDACTED]";
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
  return !!value && typeof value === "object" && credentialObject(value, /* @__PURE__ */ new WeakSet());
}
function credentialObject(value, seen) {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.some((child) => credentialObject(child, seen));
    return Object.entries(value).some(([key, child]) => credentialName(key) || credentialObject(child, seen));
  } finally {
    seen.delete(value);
  }
}
function logValueStrings(value) {
  if (value === void 0 || value === null || value === "") return [];
  return typeof value === "object" ? objectStrings(value, /* @__PURE__ */ new WeakSet()) : [String(value)];
}
function objectStrings(value, seen) {
  if (value === void 0 || value === null || value === "") return [];
  if (typeof value === "object") {
    if (seen.has(value)) return [];
    seen.add(value);
    try {
      if (Array.isArray(value)) return value.flatMap((child) => objectStrings(child, seen));
      if (value instanceof Date) return [value.toISOString()];
      return Object.values(value).flatMap((child) => objectStrings(child, seen));
    } finally {
      seen.delete(value);
    }
  }
  return [String(value)];
}
function scrubLogText(text, values) {
  return [...new Set(values)].sort((a, b) => b.length - a.length).reduce((result, value) => result?.split(value).join(redacted), text);
}
function businessMask(value, seen = /* @__PURE__ */ new WeakSet()) {
  if (value === null || value === void 0) return null;
  if (typeof value === "object") {
    if (seen.has(value)) return redacted;
    seen.add(value);
    try {
      if (Array.isArray(value)) return value.map((child) => businessMask(child, seen));
      if ("type" in value) return businessMask(value.value, seen);
      if (!(value instanceof Date)) return redacted;
    } finally {
      seen.delete(value);
    }
  }
  return maskAuditValue(value instanceof Date ? value.toISOString() : String(value));
}

// src/core/checker-privacy.ts
var presentationToken = /* @__PURE__ */ Symbol("TeaQL.CheckerPresentation");
var presentations = /* @__PURE__ */ new WeakMap();
var active = /* @__PURE__ */ new WeakMap();
var metadata = (r) => {
  const token = r[presentationToken];
  return token && presentations.get(token);
};
function retain(r, value) {
  const token = Object.freeze({});
  presentations.set(token, value);
  Object.defineProperty(r, presentationToken, { value: token, enumerable: true, configurable: true });
}
function originalLength(r) {
  const state = metadata(r);
  if (state?.masked && Object.is(state.value, r.inputValue) && state.length !== void 0) return state.length;
  return typeof r.inputValue === "string" ? Array.from(r.inputValue).length : 0;
}
function kind(r, declaring, policy, allow) {
  const fields = r.location.segments.filter((s) => s.kind === "property").map((s) => s.name);
  const field = fields[fields.length - 1] ?? "", configured = policy?.(r.entityType?.trim() ? r.entityType : declaring, field);
  if (fields.some(credentialName) || configured === "credential" || hasCredentials(r.inputValue)) return "credential";
  return !allow && (configured === "masked" || field.startsWith("#")) ? "masked" : void 0;
}
function expectedValue(r, classification) {
  const value = r.systemValue;
  if (value === void 0 || value === null || typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") return value;
  return classification === "credential" || hasCredentials(value) ? "[REDACTED]" : value;
}
function frozenMask(value) {
  const masked = businessMask(value);
  const freeze = (v) => Array.isArray(v) ? Object.freeze(v.map(freeze)) : v;
  return freeze(masked);
}
function project(r, declaring, policy, allow) {
  const value = { ...r }, old = metadata(r), classification = kind(r, declaring, policy, allow);
  if (declaring && !value.entityType?.trim()) value.entityType = declaring;
  const alreadySafe = old?.masked && Object.is(old.value, r.inputValue) && (old.kind === "credential" || classification !== "credential");
  let input = r.inputValue;
  if (!alreadySafe && input !== null && input !== void 0) {
    if (classification === "credential") input = "[REDACTED]";
    else if (classification === "masked") input = frozenMask(input);
  }
  const system = expectedValue(r, classification), changed = !Object.is(input, r.inputValue) || !Object.is(system, r.systemValue);
  if (Object.prototype.hasOwnProperty.call(r, "inputValue")) value.inputValue = input;
  if (Object.prototype.hasOwnProperty.call(r, "systemValue")) value.systemValue = system;
  const secrets = [
    ...!Object.is(input, r.inputValue) ? logValueStrings(r.inputValue) : [],
    ...!Object.is(system, r.systemValue) ? logValueStrings(r.systemValue) : []
  ];
  const masked = !!alreadySafe || !Object.is(input, r.inputValue);
  const state = masked ? { masked: true, value: input, length: originalLength(r), kind: alreadySafe ? old.kind : classification } : {};
  if (!changed && old?.message !== void 0 && old.message === r.message) state.message = old.message;
  return { value, state, changed, secrets };
}
function redactions(values) {
  return [...new Set(values.flatMap((value) => value ? [value, JSON.stringify(value).slice(1, -1)] : []))].sort((a, b) => b.length - a.length);
}
function prepareCheckerResults(results, declaring, policy, checkedValues = []) {
  const allow = plaintextLogsEnabled(), rows = results.map((r) => project(r, declaring, policy, allow));
  const inherited = results.flatMap((r) => active.get(r)?.redactions ?? []);
  const checked = checkedValues.flatMap((values) => Object.entries(values).flatMap(([field, value]) => {
    const configured = policy?.(declaring, field);
    const sensitive = credentialName(field) || hasCredentials(value) || configured === "credential" || !allow && (configured === "masked" || field.startsWith("#"));
    return sensitive ? logValueStrings(value) : [];
  }));
  const known = redactions([...inherited, ...checked, ...rows.flatMap((r) => r.secrets)]);
  const owned = rows.map((row) => {
    if (row.value.message !== void 0) row.value.message = scrubLogText(row.value.message, known);
    retain(row.value, { ...row.state, message: row.value.message });
    active.set(row.value, { redactions: known, length: row.state.length ?? originalLength(row.value), input: row.value.inputValue, system: row.value.systemValue });
    return row.value;
  });
  return {
    values: owned,
    finish(translated) {
      const projected = translated.map((r) => project(r, declaring, policy, allow));
      const all = redactions([...known, ...projected.flatMap((r) => r.secrets)]);
      return projected.map((row) => {
        if (row.state.message === void 0) row.value.message = scrubLogText(row.value.message, all);
        retain(row.value, { ...row.state, message: row.value.message });
        return row.value;
      });
    },
    close() {
      for (const r of owned) active.delete(r);
    }
  };
}
function checkerInputLength(result) {
  return active.get(result)?.length ?? originalLength(result);
}
function checkerTemplateLiteral(result, text) {
  return scrubLogText(text, active.get(result)?.redactions ?? []) ?? "";
}
function markCheckerRendering(result) {
  const scope = active.get(result);
  if (scope && Object.is(scope.input, result.inputValue) && Object.is(scope.system, result.systemValue)) {
    retain(result, { ...metadata(result), message: result.message });
  }
}
function translateCheckerResults(context, results, declaring, policy, checkedValues = []) {
  if (!results.length) {
    const translated = context.translateCheckResults(results, declaring);
    if (!translated.length) return;
    const scope2 = prepareCheckerResults(translated, declaring, policy, checkedValues);
    try {
      results.splice(0, results.length, ...scope2.finish(scope2.values));
    } finally {
      scope2.close();
    }
    return;
  }
  const scope = prepareCheckerResults(results, declaring, policy, checkedValues);
  try {
    const translated = context.translateCheckResults(scope.values, declaring);
    results.splice(0, results.length, ...scope.finish(translated));
  } finally {
    scope.close();
  }
}

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
    const template = this.message(locale, key);
    if (template === key && result.message?.trim()) return result;
    const input = String(result.inputValue);
    const values = {
      "{location}": result.location.nativePath(),
      "{system}": String(result.systemValue),
      "{input}": input,
      "{input_len}": String(checkerInputLength(result))
    };
    const publicTemplate = template === _I18nCatalog.builtin.message(locale, key);
    result.message = template.split(/(\{(?:location|system|input|input_len)\})/g).map((part) => Object.prototype.hasOwnProperty.call(values, part) ? values[part] : publicTemplate ? part : checkerTemplateLiteral(result, part)).join("");
    markCheckerRendering(result);
    return result;
  }
};
_I18nCatalog.builtin = new _I18nCatalog(builtin_messages_v1_default);
var I18nCatalog = _I18nCatalog;

// src/core/internal-id.ts
function internalId(value) {
  if (typeof value === "number" && (!Number.isSafeInteger(value) || value <= 0)) {
    throw new RangeError("Internal ID must be a positive safe integer when supplied as a number");
  }
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
    throw new TypeError("Internal ID must be an exact positive integer");
  }
  const text = String(value);
  if (!/^[1-9][0-9]*$/.test(text)) throw new TypeError("Internal ID must be a canonical positive integer");
  if (BigInt(text) > (1n << 63n) - 1n) throw new RangeError("Internal ID exceeds signed 64-bit range");
  return text;
}

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
  const last = (kind2) => {
    for (let index = source.length - 1; index >= 0; index--) {
      if (source[index].kind === kind2) return source[index].detail ?? "";
    }
    return void 0;
  };
  const canonical = ["operation", "provider", "sql"].every((kind2) => source.some((node) => node.kind === kind2));
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
var redacted2 = "[REDACTED]";
var redactedSQL = "[REDACTED SQL; NOT REPLAYABLE]";
var debugLabel = "-- TeaQL DEBUG PLAINTEXT; EXPLICIT OPT-IN\n";
var projections = /* @__PURE__ */ new WeakMap();
var safeAlternatives = /* @__PURE__ */ new WeakMap();
var rawProvenance = /* @__PURE__ */ new WeakMap();
function retainSQLLogProvenance(metadata2, bindings, intentValues = []) {
  rawProvenance.set(metadata2, {
    bindings: bindings ? inheritSQLLogBindings(bindings) : void 0,
    intentValues: Object.freeze(intentValues.map(copyLogValue))
  });
}
function bindingPolicies(metadata2) {
  const supplied = metadata2.parameterLogPolicies;
  const valid = !!supplied && supplied.length === metadata2.parameters.length;
  const credentialStatement = credentialName(metadata2.parameterizedSQL) && (metadata2.sqlOrigin !== "generated" || !valid);
  return metadata2.parameters.map((value, index) => {
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
function projectSQLLog(metadata2, inherited, intentValues = []) {
  const allow = plaintextLogsEnabled() && metadata2.logMode !== "masked";
  const prior = projections.get(metadata2);
  if (prior !== void 0 && (!prior || allow)) return metadata2;
  const safe = safeAlternatives.get(metadata2);
  if (!allow && safe) return safe;
  const projected = projectWithPolicy(metadata2, allow, inherited, intentValues);
  projections.set(projected, allow);
  if (allow) {
    const alternative = projectWithPolicy(metadata2, false, inherited, intentValues);
    projections.set(alternative, false);
    safeAlternatives.set(projected, alternative);
  }
  return projected;
}
function projectSafeSQLLog(metadata2) {
  const safe = safeAlternatives.get(metadata2);
  if (safe) return safe;
  if (projections.get(metadata2) === false) return metadata2;
  const projected = projectWithPolicy(metadata2, false);
  projections.set(projected, false);
  return projected;
}
function projectWithPolicy(metadata2, allow, inherited, intentValues = []) {
  const retained = rawProvenance.get(metadata2);
  if (retained?.bindings) inherited = inheritSQLLogBindings(retained.bindings, inherited);
  if (retained) intentValues = [...intentValues, ...retained.intentValues];
  const supplied = metadata2.parameterLogPolicies;
  const policiesValid = !supplied || supplied.length === metadata2.parameters.length;
  const credentialStatement = credentialName(metadata2.parameterizedSQL) && (metadata2.sqlOrigin !== "generated" || !supplied || !policiesValid);
  const policies = bindingPolicies(metadata2);
  const masked = policies.map((policy) => bindingIsMasked(policy, allow));
  const secrets = metadata2.parameters.flatMap((value, index) => masked[index] ? logValueStrings(value) : []);
  if (inherited) {
    const inheritedPolicies = bindingPolicies(inherited);
    secrets.push(...inherited.parameters.flatMap((value, index) => bindingIsMasked(inheritedPolicies[index], allow) ? logValueStrings(value) : []));
  }
  const intentSecrets = [...secrets, ...intentValues.flatMap(logValueStrings)];
  const unknownDebugIntent = !allow && metadata2.logMode === "debug-plaintext" && !inherited;
  const intentText = (value) => unknownDebugIntent && value ? redacted2 : scrubLogText(value, intentSecrets);
  const safeValues = metadata2.parameters.map((value, index) => {
    if (!masked[index]) return copyLogValue(value);
    return policies[index] === "masked" ? businessMask(value) : redacted2;
  });
  const bareTemplate = metadata2.parameterizedSQL.replace(/\$[0-9]+|@p[0-9]+/gi, "?");
  const unsafeSQL = (!allow || credentialStatement) && metadata2.sqlOrigin !== "generated" && /['"`$]|--|\/\*|\b\d+\b|:[A-Za-z_]/.test(bareTemplate);
  const kind2 = metadata2.databaseKind ?? "sqlite";
  let rendered = redactedSQL;
  let omissionReason = unsafeSQL ? "untrusted-literal-sql" : !policiesValid ? "policy-count-mismatch" : void 0;
  if (!unsafeSQL && policiesValid) {
    try {
      rendered = renderSQL(metadata2.parameterizedSQL, safeValues, kind2, (index) => sqlLiteral(safeValues[index], kind2) + (masked[index] ? " /* masked */" : ""));
      rendered = (allow ? masked.some(Boolean) ? "-- TeaQL DEBUG PLAINTEXT; EXPLICIT OPT-IN; PARTIALLY MASKED; NOT REPLAYABLE\n" : debugLabel : "-- TeaQL MASKED; NOT REPLAYABLE\n") + rendered;
    } catch {
      rendered = redactedSQL;
      omissionReason = "unsupported-or-mismatched-bindings";
    }
  }
  const projected = Object.freeze({
    ...metadata2,
    ...metadata2.statements ? { statements: Object.freeze(metadata2.statements.map((statement) => projectWithPolicy(statement, allow, inheritSQLLogBindings(metadata2, inherited), intentValues))) } : {},
    parameterizedSQL: unsafeSQL ? redactedSQL : metadata2.sqlOrigin === "generated" ? metadata2.parameterizedSQL : scrubLogText(metadata2.parameterizedSQL, secrets),
    parameters: Object.freeze(safeValues),
    parameterLogPolicies: Object.freeze(policies),
    maskedParameters: Object.freeze(masked),
    logMode: allow ? "debug-plaintext" : "masked",
    omissionReason,
    debugSQL: rendered,
    comment: intentText(metadata2.comment),
    purpose: intentText(metadata2.purpose),
    auditReason: intentText(metadata2.auditReason),
    ...metadata2.traceChain ? { traceChain: Object.freeze(metadata2.traceChain.map((node) => Object.freeze(Object.fromEntries(Object.entries(node).map(([key, value]) => [key, key !== "entityId" && typeof value === "string" ? intentText(value) : value]))))) } : {},
    // Counts are operational metadata, not a copy of a masked numeric binding.
    resultSummary: metadata2.resultCount !== void 0 ? `${metadata2.resultCount} rows returned` : metadata2.affectedRows !== void 0 ? `${metadata2.affectedRows} rows affected` : scrubLogText(metadata2.resultSummary, secrets),
    tracePath: Object.freeze(metadata2.tracePath.map((frame) => Object.freeze(
      Object.fromEntries(Object.entries(frame).map(([key, value]) => [key, key !== "entityId" && typeof value === "string" ? intentText(value) : value]))
    ))),
    ...metadata2.traceChain ? { traceChain: Object.freeze(metadata2.traceChain.map((node) => Object.freeze(Object.fromEntries(Object.entries(node).map(([key, value]) => [key, key !== "entityId" && typeof value === "string" ? intentText(value) : value]))))) } : {},
    // Typed identity is structural (as in the audit event's id), not prose.
    ...metadata2.mutationLineage ? { mutationLineage: Object.freeze(metadata2.mutationLineage.map((node) => Object.freeze(Object.fromEntries(Object.entries(node).map(([key, value]) => [key, key !== "entityId" && typeof value === "string" ? intentText(value) : value]))))) } : {}
  });
  return projected;
}

// src/core/query-snapshot.ts
var origins = /* @__PURE__ */ new WeakMap();
var requestOwners = /* @__PURE__ */ new WeakMap();
function queryExecutionOwner(query) {
  return requestOwners.get(query);
}
function retainQueryExecutionOwner(query, owner) {
  requestOwners.set(query, owner);
}
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
  const owner = requestOwners.get(value);
  if (owner) requestOwners.set(copy, owner);
  return copy;
}

// src/core/loaded-scalar-snapshot.ts
var loadedSnapshots = /* @__PURE__ */ new WeakMap();
var LoadedEntityIdentityError = class extends CheckException {
  constructor(field) {
    super([{
      ruleId: "entity_version_conflict",
      location: ObjectLocation.property(field),
      message: "ENTITY_VERSION_CONFLICT: loaded entity identity must remain unchanged"
    }]);
    this.code = "ENTITY_VERSION_CONFLICT";
    this.name = "LoadedEntityIdentityError";
  }
};
var _values, _owner, _identityKey, _origin, _persistedVersion;
var _LoadedScalarSnapshot = class _LoadedScalarSnapshot {
  constructor(values = {}, key, version, origin = "hydrated") {
    __privateAdd(this, _values);
    __privateAdd(this, _owner);
    __privateAdd(this, _identityKey);
    __privateAdd(this, _origin);
    __privateAdd(this, _persistedVersion);
    __privateSet(this, _values, snapshotQuery(values));
    __privateSet(this, _origin, origin);
    if (origin === "hydrated" && key && version !== void 0) {
      const exact = entityVersion(version);
      __privateSet(this, _persistedVersion, exact);
      if (exact !== 0) {
        if (values.id !== void 0) __privateSet(this, _identityKey, Object.freeze({ ...key }));
        __privateSet(this, _owner, Object.freeze({ key: Object.freeze({ ...key }), version: exact }));
      }
    }
    if (!__privateGet(this, _identityKey) && key && values.id !== void 0) __privateSet(this, _identityKey, Object.freeze({ ...key }));
    Object.freeze(this);
  }
  /** Copies prevent callers or mutable JSON/date fields from rewriting history. */
  values() {
    return snapshotQuery(__privateGet(this, _values));
  }
  get origin() {
    return __privateGet(this, _origin);
  }
  get persistedVersion() {
    return __privateGet(this, _persistedVersion);
  }
  /** @internal Exact canonical top-level difference for detached preparation. */
  changedField(values) {
    const fields = [.../* @__PURE__ */ new Set([...Object.keys(__privateGet(this, _values)), ...Object.keys(values)])].sort();
    return fields.find((field) => !Object.prototype.hasOwnProperty.call(__privateGet(this, _values), field) || !Object.prototype.hasOwnProperty.call(values, field) || !sameValue(__privateGet(this, _values)[field], values[field]));
  }
  /** Validate even read-only nodes, before root attachment or FK normalization. */
  validateNativeIdentity(key, nativeID, nativeVersion) {
    const expected = __privateGet(this, _identityKey);
    if (expected && (expected.entity !== key.entity || !Object.is(expected.id, key.id) || !Object.is(expected.id, nativeID))) throw new LoadedEntityIdentityError("id");
    if (__privateGet(this, _owner)) {
      let version;
      try {
        version = entityVersion(nativeVersion);
      } catch {
        throw new LoadedEntityIdentityError("version");
      }
      if (version !== __privateGet(this, _owner).version) throw new LoadedEntityIdentityError("version");
    }
  }
  /** Normalize restored intent first. Clean old views may observe an advanced
   * ledger, but a dirty old view must never borrow its newer committed version. */
  validateMutationVersion(root, key) {
    if (!__privateGet(this, _owner) || !root.hasPending(key)) return;
    if (__privateGet(this, _owner).key.entity !== key.entity || !Object.is(__privateGet(this, _owner).key.id, key.id) || root.isNew(key) || root.originalVersion(key) !== __privateGet(this, _owner).version) {
      throw new LoadedEntityIdentityError("version");
    }
  }
  /** @internal Generated hydration stores provenance outside entity/JSON state. */
  static captureFor(entity, values, key, version, origin = "hydrated") {
    const snapshot = new _LoadedScalarSnapshot(values, key, version, origin);
    loadedSnapshots.set(entity, snapshot);
    return snapshot;
  }
  /** @internal Mutation uses the loaded values, not already-edited properties. */
  static forEntity(entity) {
    return loadedSnapshots.get(entity);
  }
  /** @internal Rollback restores provenance together with authoritative entity state. */
  static restoreFor(entity, snapshot) {
    if (snapshot) loadedSnapshots.set(entity, snapshot);
    else loadedSnapshots.delete(entity);
  }
  /** @internal Called only after model-field admission, before completeness and Fix. */
  discardRestoredFields(root, key) {
    const owner = __privateGet(this, _owner);
    if (!owner || owner.key.entity !== key.entity || !Object.is(owner.key.id, key.id) || root.originalVersion(key) !== owner.version || root.isNew(key) || root.isDeleted(key)) return;
    const restored = /* @__PURE__ */ Object.create(null);
    for (const [field, value] of Object.entries(root.change(key))) {
      const original = Object.getOwnPropertyDescriptor(__privateGet(this, _values), field);
      if (field !== "id" && field !== "version" && original && "value" in original && original.value !== void 0 && sameValue(original.value, value)) restored[field] = value;
    }
    root.discardFields(key, restored);
  }
};
_values = new WeakMap();
_owner = new WeakMap();
_identityKey = new WeakMap();
_origin = new WeakMap();
_persistedVersion = new WeakMap();
var LoadedScalarSnapshot = _LoadedScalarSnapshot;
function sameValue(a, b, budget = { nodes: 4096 }, depth = 0) {
  if (--budget.nodes < 0 || depth > 64 || typeof a !== typeof b) return false;
  if (typeof a === "number") return Number.isFinite(a) && Number.isFinite(b) && Object.is(a, b);
  if (a === null || b === null || typeof a !== "object") return Object.is(a, b);
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && Number.isFinite(a.getTime()) && a.getTime() === b.getTime();
  if (a instanceof Uint8Array || b instanceof Uint8Array) return a instanceof Uint8Array && b instanceof Uint8Array && a.length === b.length && a.every((value, index) => value === b[index]);
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (!Array.isArray(a) && (Object.getPrototypeOf(a) !== Object.prototype && Object.getPrototypeOf(a) !== null || Object.getPrototypeOf(b) !== Object.prototype && Object.getPrototypeOf(b) !== null)) return false;
  if (Array.isArray(a) && a.length !== b.length) return false;
  const left = Object.getOwnPropertyDescriptors(a), right = Object.getOwnPropertyDescriptors(b);
  const keys = Object.keys(left).filter((key) => left[key].enumerable);
  if (keys.length !== Object.keys(right).filter((key) => right[key].enumerable).length) return false;
  return keys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && right[key].enumerable && "value" in left[key] && "value" in right[key] && sameValue(left[key].value, right[key].value, budget, depth + 1));
}

// src/core/prepared-mutation.ts
var refField = "__teaql_prepared_reference";
var keyOf = (key) => `${key.entity}\0${typeof key.id}:${String(key.id)}`;
var PreparedMutationError = class extends CheckException {
  constructor(field = "") {
    super([{
      ruleId: "mutation_changed_after_preparation",
      location: field ? ObjectLocation.property(field) : ObjectLocation.root(),
      message: "Mutation differs from its prepared and reviewed state; prepare and review it again"
    }]);
    this.code = "MUTATION_CHANGED_AFTER_PREPARATION";
    this.name = "PreparedMutationError";
  }
};
var PreparedGraphState = class {
  constructor() {
    this.sources = [];
    this.objects = /* @__PURE__ */ new WeakMap();
    this.tokens = /* @__PURE__ */ new Map();
    this.entries = [];
    this.aliases = /* @__PURE__ */ new Map();
    this.bindings = [];
    this.metadata = [];
    this.sealed = false;
  }
  get rootEntity() {
    return this.sources[0]?.key.entity ?? this.entries[0]?.key.entity;
  }
  get size() {
    return this.entries.length;
  }
  register(object, root, key, references, read) {
    if (this.sealed) throw new PreparedMutationError();
    if (this.objects.has(object)) return;
    const source = { object, token: /* @__PURE__ */ Symbol("prepared entity"), root, key: { ...key }, origin: { ...key }, references, read };
    this.objects.set(object, source);
    this.tokens.set(source.token, source);
    this.sources.push(source);
  }
  members(objects) {
    return objects.map((object) => {
      const source = this.objects.get(object);
      if (!source) throw new PreparedMutationError();
      return source.token;
    });
  }
  bind(read) {
    this.bindings.push({ read, value: read() });
  }
  bindMetadata(read) {
    this.metadata.push({ read, value: new LoadedScalarSnapshot(read()) });
  }
  captureInput() {
    for (const source of this.sources) source.native = new LoadedScalarSnapshot(this.canonical(source.read(), source.references));
  }
  resolved(key) {
    return this.aliases.get(keyOf(key)) ?? key;
  }
  canonical(values, references) {
    const result = { ...values };
    for (const [field, target] of Object.entries(references)) {
      const value = result[field];
      if (!value || typeof value !== "object") continue;
      const source = this.objects.get(value);
      if (source) {
        if (source.key.entity !== target) throw new PreparedMutationError(field);
        result[field] = { [refField]: source.token };
      } else if (value.id !== void 0 && value.id !== null) result[field] = value.id;
      else throw new PreparedMutationError(field);
    }
    return result;
  }
  materialize(values, logical = false) {
    return Object.fromEntries(Object.entries(values).map(([field, value]) => {
      const token = value && typeof value === "object" ? value[refField] : void 0;
      if (typeof token !== "symbol") return [field, value];
      const source = this.tokens.get(token);
      if (!source) throw new PreparedMutationError(field);
      const target = this.resolved(source.origin);
      if (!logical && !this.aliases.has(keyOf(source.origin)) && source.root.isNew(source.key)) throw new PreparedMutationError(field);
      return [field, target.id];
    }));
  }
  difference(expected, actual) {
    return new LoadedScalarSnapshot(this.materialize(expected.values(), true)).changedField(this.materialize(actual, true));
  }
  rootState(root, key, references) {
    return {
      values: new LoadedScalarSnapshot(this.canonical(root.change(key), references)),
      version: root.originalVersion(key),
      fresh: root.isNew(key),
      deleted: root.isDeleted(key),
      trace: new LoadedScalarSnapshot({ trace: root.traceChain(key) })
    };
  }
  assertRoot(root, key, references, expected) {
    if (root.originalVersion(key) !== expected.version) throw new PreparedMutationError("version");
    if (root.isNew(key) !== expected.fresh || root.isDeleted(key) !== expected.deleted) throw new PreparedMutationError();
    const field = this.difference(expected.values, this.canonical(root.change(key), references));
    if (field !== void 0) throw new PreparedMutationError(field);
    if (expected.trace.changedField({ trace: root.traceChain(key) }) !== void 0) throw new PreparedMutationError("comment");
  }
  assertNative(source) {
    if (!source.native) throw new PreparedMutationError();
    const field = this.difference(source.native, this.canonical(source.read(), source.references));
    if (field !== void 0) throw new PreparedMutationError(field === "__teaql_comment" ? "comment" : field === "__teaql_key" ? "id" : field.startsWith("__teaql_") ? "" : field);
  }
  remember(request, mutation, references) {
    if (this.sealed) throw new PreparedMutationError();
    const root = mutation.ledgerRoot;
    const key = mutation.ledgerKey ?? { entity: String(mutation.entity), id: mutation.id ?? /* @__PURE__ */ Symbol("unassigned") };
    if (this.entries.some((entry2) => root && entry2.root === root && keyOf(entry2.key) === keyOf(key))) throw new PreparedMutationError("id");
    const values = new LoadedScalarSnapshot(this.canonical(mutation.payload ?? {}, references));
    const entry = {
      request,
      root,
      key: { ...key },
      mutation: { ...mutation, payload: void 0 },
      references,
      values,
      input: new LoadedScalarSnapshot(this.canonical(request.mutation.payload ?? {}, references)),
      loaded: new LoadedScalarSnapshot(this.canonical(request.loadedValues(), references)),
      state: root ? this.rootState(root, key, references) : void 0,
      status: "prepared"
    };
    this.entries.push(entry);
    return { ...mutation, id: mutation.id ?? mutation.ledgerKey?.id, payload: this.materialize(values.values(), true) };
  }
  seal() {
    if (this.sealed) return;
    for (const source of this.sources) this.assertNative(source);
    for (const entry of this.entries) if (entry.root && entry.state) this.assertRoot(entry.root, entry.key, entry.references, entry.state);
    for (const source of this.sources) source.state = this.rootState(source.root, source.key, source.references);
    this.sealed = true;
    this.validate();
  }
  validate() {
    for (const binding of this.bindings) if (binding.read() !== binding.value) throw new PreparedMutationError("context");
    for (const metadata2 of this.metadata) if (metadata2.value.changedField(metadata2.read()) !== void 0) throw new PreparedMutationError("metadata");
    for (const source of this.sources) {
      this.assertNative(source);
      if (source.state) this.assertRoot(source.root, source.key, source.references, source.state);
    }
    for (const entry of this.entries) if (entry.root && entry.state) this.assertRoot(entry.root, this.resolved(entry.key), entry.references, entry.state);
  }
  entry(request) {
    const mutation = request.mutation;
    const entry = this.entries.find((entry2) => entry2.request === request || mutation.ledgerRoot && entry2.root === mutation.ledgerRoot && mutation.ledgerKey && keyOf(this.resolved(entry2.key)) === keyOf(mutation.ledgerKey)) ?? this.entries.find((entry2) => !entry2.root && entry2.status === "prepared" && entry2.mutation.entity === mutation.entity && entry2.mutation.action === mutation.action && entry2.mutation.id === mutation.id && this.difference(
      entry2.root && mutation.action === "Update" ? entry2.values : entry2.input,
      this.canonical(mutation.payload ?? {}, entry2.references)
    ) === void 0);
    if (!entry) throw new PreparedMutationError();
    return entry;
  }
  replay(request) {
    if (!this.sealed) return void 0;
    this.validate();
    const entry = this.entry(request), actual = request.mutation, expected = entry.mutation;
    if (entry.status !== "prepared") throw new PreparedMutationError();
    if (actual.entity !== expected.entity || actual.action !== expected.action) throw new PreparedMutationError();
    if (actual.id !== expected.id) throw new PreparedMutationError("id");
    if (actual.action !== "Create" && entityVersion(actual.version !== void 0 ? actual.version : actual.expectedVersion) !== (expected.version ?? expected.expectedVersion)) throw new PreparedMutationError("version");
    if (request.comment !== expected.comment) throw new PreparedMutationError("comment");
    let field = this.difference(
      entry.root && actual.action === "Update" ? entry.values : entry.input,
      this.canonical(actual.payload ?? {}, entry.references)
    );
    if (field !== void 0) throw new PreparedMutationError(field);
    field = this.difference(entry.loaded, this.canonical(request.loadedValues(), entry.references));
    if (field !== void 0) throw new PreparedMutationError(field);
    return {
      ...expected,
      ledgerKey: actual.ledgerKey,
      ledgerRoot: actual.ledgerRoot,
      payload: snapshotQuery(this.materialize(entry.values.values()))
    };
  }
  providerResult(request, result) {
    if (!this.sealed) return;
    this.validate();
    const entry = this.entry(request);
    if (entry.status !== "prepared") throw new PreparedMutationError();
    entry.result = { id: result.id, version: result.version };
    entry.status = "executed";
    if (!this.sources.some((source) => source.root === entry.root && keyOf(source.key) === keyOf(entry.key))) entry.status = "applied";
  }
  applied(root, oldKey, newKey) {
    if (!this.sealed) return;
    const entry = this.entries.find((entry2) => entry2.root === root && keyOf(this.resolved(entry2.key)) === keyOf(oldKey));
    if (!entry || entry.status !== "executed" || entry.result?.id !== newKey.id || oldKey.entity !== newKey.entity) throw new PreparedMutationError("id");
    if (keyOf(oldKey) !== keyOf(newKey)) {
      if (entry.mutation.action !== "Create" || this.aliases.has(keyOf(entry.key))) throw new PreparedMutationError("id");
      this.aliases.set(keyOf(entry.key), { ...newKey });
    }
    entry.status = "applied";
    entry.state = this.rootState(root, newKey, entry.references);
    for (const source of this.sources) if (source.root === root && keyOf(source.key) === keyOf(oldKey)) {
      source.key = { ...newKey };
      source.native = new LoadedScalarSnapshot(this.canonical(source.read(), source.references));
      source.state = this.rootState(root, newKey, source.references);
    }
  }
  committed(root, key) {
    for (const entry of this.entries) if (entry.root === root && keyOf(this.resolved(entry.key)) === keyOf(key)) {
      entry.status = "committed";
      entry.state = this.rootState(root, key, entry.references);
    }
    for (const source of this.sources) if (source.root === root && keyOf(source.key) === keyOf(key)) source.state = this.rootState(root, key, source.references);
  }
  complete() {
    if (!this.sealed) return;
    this.validate();
    if (this.entries.some((entry) => entry.status !== "applied" && entry.status !== "committed")) throw new PreparedMutationError();
  }
};

// src/core/request-intent.ts
var mutationSnapshots = /* @__PURE__ */ new WeakMap();
var querySources = /* @__PURE__ */ new WeakMap();
var graphRequests = /* @__PURE__ */ new WeakMap();
var scopeOwners = /* @__PURE__ */ new WeakMap();
function operationSnapshot(operation) {
  if (!["named-count", "facet", "relation-count", "relation-select", "aggregate", "pagination"].includes(operation.kind) || operation.method !== void 0 && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(operation.method) || operation.alias !== void 0 && typeof operation.alias !== "string" || operation.relation !== void 0 && typeof operation.relation !== "string") {
    throw new Error("QUERY_OPERATION_INVALID: invalid generated operation descriptor");
  }
  return Object.freeze({
    kind: operation.kind,
    method: operation.method,
    alias: operation.alias,
    relation: operation.relation
  });
}
function queryOperationComment(operation) {
  const captured = operationSnapshot(operation);
  const literal = (value) => "'" + value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029") + "'";
  if (!captured.method) return "framework: " + captured.kind + (captured.relation ? " " + captured.relation : "") + (captured.alias !== void 0 ? " " + literal(captured.alias) : "");
  return captured.method + "(" + (captured.alias !== void 0 ? literal(captured.alias) : captured.kind === "relation-select" ? "..." : "") + ")";
}
var requestBindingToken = /* @__PURE__ */ Symbol("runtime request binding");
var RequestIntentError = class extends Error {
  constructor(code, field, requestKind) {
    super(`${code}: ${requestKind} request requires a non-blank ${field}; supply it at the request entry point`);
    this.code = code;
    this.field = field;
    this.requestKind = requestKind;
    this.name = "RequestIntentError";
  }
};
function requireText(value, field, kind2) {
  if (typeof value !== "string" || /^\p{White_Space}*$/u.test(value)) {
    throw new RequestIntentError(
      field === "comment" ? "REQUEST_COMMENT_REQUIRED" : "QUERY_PURPOSE_REQUIRED",
      field,
      kind2
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
var _intent, _query, _parent2, _comment3, _name, _operation, _invocation;
var _QueryRequest = class _QueryRequest {
  constructor(query, intent, binding) {
    __privateAdd(this, _intent);
    __privateAdd(this, _query);
    __privateAdd(this, _parent2);
    __privateAdd(this, _comment3);
    __privateAdd(this, _name);
    __privateAdd(this, _operation);
    __privateAdd(this, _invocation);
    const source = query;
    const previous = queryExecutionOwner(query);
    const previousOwner = previous instanceof _QueryRequest ? previous : void 0;
    __privateSet(this, _intent, intent === void 0 ? previousOwner?.intent ?? new QueryIntent(source?._comment ?? source?.commentText, source?._purpose ?? source?.purposeText) : new QueryIntent(intent?.comment, intent?.purpose));
    if (binding && binding[requestBindingToken] !== true)
      throw new Error("QUERY_REQUEST_OWNERSHIP_INVALID: request binding is runtime-owned");
    const owner = previousOwner && previousOwner.intent.comment === __privateGet(this, _intent).comment && previousOwner.purpose === __privateGet(this, _intent).purpose ? previousOwner : void 0;
    __privateSet(this, _invocation, binding?.invocation ?? (binding?.parent ? __privateGet(binding.parent, _invocation) : void 0) ?? (owner ? __privateGet(owner, _invocation) : void 0) ?? Object.freeze({}));
    __privateSet(this, _parent2, binding ? binding.parent : owner?.parentRequest);
    __privateSet(this, _comment3, requireText(binding?.comment ?? owner?.comment ?? __privateGet(this, _intent).comment, "comment", "query"));
    __privateSet(this, _name, binding?.name ?? owner?.requestName ?? String(source.entity ?? "query"));
    __privateSet(this, _operation, binding?.operation ?? owner?.operation);
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
    querySources.set(captured, cloneTraceNodes(binding?.source ?? owner?.traceSource ?? querySources.get(query) ?? queryTraceSource(String(source.entity), this.intent.comment, this.purpose)));
    retainQueryExecutionOwner(captured, this);
    Object.freeze(this);
  }
  get intent() {
    return __privateGet(this, _intent);
  }
  get query() {
    return __privateGet(this, _query);
  }
  get comment() {
    return __privateGet(this, _comment3);
  }
  get purpose() {
    return __privateGet(this, _intent).purpose;
  }
  get traceSource() {
    return querySources.get(__privateGet(this, _query));
  }
  get parentRequest() {
    return __privateGet(this, _parent2);
  }
  get rootRequest() {
    let root = this;
    while (root.parentRequest) root = root.parentRequest;
    return root;
  }
  get requestName() {
    return __privateGet(this, _name);
  }
  get operation() {
    return __privateGet(this, _operation);
  }
  get traceChain() {
    const comments = [];
    for (let node = this; node; node = node.parentRequest)
      comments.push({ kind: "comment", name: node.requestName, detail: node.comment });
    return cloneTraceNodes([
      { kind: "purpose", name: this.rootRequest.requestName, detail: this.purpose },
      ...comments.reverse()
    ]);
  }
  /** Runtime derivation preserves this invocation's source across builder clones. */
  withQuery(query) {
    const previous = queryExecutionOwner(query);
    if (previous instanceof _QueryRequest && __privateGet(previous, _invocation) !== __privateGet(this, _invocation)) {
      throw new Error("QUERY_SCOPE_OWNER_MISMATCH: replacement belongs to another query invocation");
    }
    return new _QueryRequest(query, this.intent, {
      [requestBindingToken]: true,
      parent: this.parentRequest,
      comment: this.comment,
      name: this.requestName,
      operation: this.operation,
      source: this.traceSource,
      invocation: __privateGet(this, _invocation)
    });
  }
  /** A real operation child need not execute SQL itself; descendants retain it. */
  deriveOperation(query, operation) {
    const captured = operationSnapshot(operation);
    return new _QueryRequest(query, this.intent, {
      [requestBindingToken]: true,
      parent: this,
      comment: queryOperationComment(captured),
      name: String(query.entity ?? this.requestName),
      operation: captured,
      source: this.traceSource
    });
  }
  /** Local description for work created by the framework, never a root authorization. */
  deriveHelper(query, comment) {
    return new _QueryRequest(query, this.intent, {
      [requestBindingToken]: true,
      parent: this,
      comment: requireText(comment, "comment", "query"),
      name: String(query.entity ?? this.requestName),
      source: this.traceSource
    });
  }
  /** Preserve the Q-operation parent and the actual nested request's own comment. */
  derive(query, relation, operation) {
    if (operation) return this.deriveOperation(this.query, operation).deriveChild(query, relation);
    const owner = `${String(this.query.entity)}.${relation}`;
    return this.deriveChild(query, relation, void 0, owner);
  }
  /** Aggregates execute their operation; an anonymous template is not a value load. */
  deriveAggregate(query, relation, operation) {
    const facet = this.parentRequest?.operation?.kind === "facet" ? this.parentRequest : void 0;
    const branch = facet ? facet.deriveHelper(query, "aggregate " + facet.operation.relation) : this.deriveOperation(query, operation);
    const physical = [...this.traceSource, {
      kind: "relation",
      name: relation,
      detail: `${String(this.query.entity)}.${relation}`
    }];
    const scoped = new _QueryRequest(query, this.intent, {
      [requestBindingToken]: true,
      parent: branch.parentRequest,
      comment: branch.comment,
      name: branch.requestName,
      operation: branch.operation,
      source: physical
    });
    const comment = query._comment ?? query.commentText;
    return comment === void 0 ? scoped : scoped.deriveChild(query);
  }
  /** Bind a framework helper or value query below an existing operation parent. */
  deriveChild(query, relation, defaultComment, requestName) {
    const source = query;
    const comment = source._comment ?? source.commentText;
    return new _QueryRequest(query, this.intent, {
      [requestBindingToken]: true,
      parent: this,
      comment: comment === void 0 ? defaultComment ?? `load ${String(source.entity)}` : requireText(comment, "comment", "query"),
      name: requestName ?? String(source.entity),
      source: relation === void 0 ? this.traceSource : [...this.traceSource, {
        kind: "relation",
        name: relation,
        detail: `${String(this.query.entity)}.${relation}`
      }]
    });
  }
};
_intent = new WeakMap();
_query = new WeakMap();
_parent2 = new WeakMap();
_comment3 = new WeakMap();
_name = new WeakMap();
_operation = new WeakMap();
_invocation = new WeakMap();
var QueryRequest = _QueryRequest;
var _intent2, _mutation;
var MutationRequest = class {
  constructor(mutation, intent) {
    __privateAdd(this, _intent2);
    __privateAdd(this, _mutation);
    __privateSet(this, _intent2, new MutationIntent(intent === void 0 ? mutation?.comment : intent?.comment));
    __privateSet(this, _mutation, { ...mutation });
    if (mutation.payload && typeof mutation.payload === "object")
      __privateGet(this, _mutation).payload = { ...mutation.payload };
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
  /** @internal Checker-only detached provenance, not caller input or write payload. */
  bindCheckerLoadedValues(mutation) {
    Object.defineProperty(mutation, "loadedValues", {
      value: Object.freeze({ ...this.loadedValues() }),
      enumerable: false,
      writable: false,
      configurable: false
    });
    return mutation;
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
var _intent3, _bindings, _preparedCount, _sealed, _prepared;
var GraphMutationSession = class {
  constructor(intent) {
    __privateAdd(this, _intent3);
    __privateAdd(this, _bindings);
    __privateAdd(this, _preparedCount, 0);
    __privateAdd(this, _sealed, false);
    __privateAdd(this, _prepared, new PreparedGraphState());
    __privateSet(this, _intent3, new MutationIntent(intent?.comment));
    Object.freeze(this);
  }
  get intent() {
    return __privateGet(this, _intent3);
  }
  /** @internal Only generated complete traversal may seal a prepared plan. */
  sealPreparedGraph() {
    __privateGet(this, _prepared).seal();
    __privateSet(this, _sealed, true);
  }
  get isPreparedSealed() {
    return __privateGet(this, _sealed);
  }
  get preparedRootEntity() {
    return __privateGet(this, _prepared).rootEntity;
  }
  /** @internal Generated graph registration carries no Context-owned ledger. */
  registerSource(object, root, key, references, read) {
    __privateGet(this, _prepared).register(object, root, key, references, read);
  }
  sourceMembers(objects) {
    return __privateGet(this, _prepared).members(objects);
  }
  captureInputSources() {
    __privateGet(this, _prepared).captureInput();
  }
  bindExecutionReference(read) {
    __privateGet(this, _prepared).bind(read);
  }
  bindExecutionMetadata(read) {
    __privateGet(this, _prepared).bindMetadata(read);
  }
  capturePreparedMutation(request, mutation, references) {
    return __privateGet(this, _prepared).remember(request, mutation, references);
  }
  replayPreparedMutation(request) {
    return __privateGet(this, _prepared).replay(request);
  }
  validatePreparedSources() {
    __privateGet(this, _prepared).validate();
  }
  recordPreparedResult(request, result) {
    __privateGet(this, _prepared).providerResult(request, result);
  }
  acceptPreparedResult(root, oldKey, newKey) {
    __privateGet(this, _prepared).applied(root, oldKey, newKey);
  }
  finishPreparedCommit(root, key) {
    __privateGet(this, _prepared).committed(root, key);
  }
  requirePreparedComplete() {
    __privateGet(this, _prepared).complete();
  }
  get isPreparedEmpty() {
    return __privateGet(this, _sealed) && __privateGet(this, _preparedCount) === 0;
  }
  /** @internal Manual unsealed graphs retain their existing transaction behavior. */
  recordPreparedMutation() {
    if (__privateGet(this, _sealed)) throw new Error("GRAPH_PREPARATION_SEALED: cannot add mutations after complete preparation");
    __privateWrapper(this, _preparedCount)._++;
  }
  /** @internal A sealed empty plan must never admit an unplanned write. */
  requireMutationAllowed() {
    if (this.isPreparedEmpty) throw new Error("GRAPH_PREPARATION_EMPTY: complete graph has no admitted mutations");
  }
  /** @internal Admission always precedes cancellation, including unknown baselines. */
  discardRestoredFields(layout, root, key, snapshot) {
    if (layout.entity !== key.entity) throw new Error("MUTATION_LAYOUT_OWNER_MISMATCH");
    layout.validate(root.change(key), !root.isNew(key));
    snapshot?.discardRestoredFields(root, key);
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
_preparedCount = new WeakMap();
_sealed = new WeakMap();
_prepared = new WeakMap();
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
  /** @internal Review the complete detached plan before transaction entry. */
  prepareGraphReview(context, rootEntity) {
    if (!this.graphActive || this.graphReviewed || this.preflight.length === 0) return;
    const operations = this.preflight;
    this.graphSnapshot = this.review(context, this.plan(
      rootEntity ?? this.rootEntity ?? operations[0].entity,
      this.auditReason,
      operations
    ));
    this.remaining.clear();
    for (const signature of this.preflightKeys) this.remaining.set(signature, (this.remaining.get(signature) ?? 0) + 1);
    this.graphReviewed = true;
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
    this.businessClock = new SystemBusinessClock();
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
  withInternalIdGenerator(generator) {
    if (!generator || typeof generator.generateId !== "function") {
      throw new TypeError("Internal ID generator must provide generateId(entity, context)");
    }
    return this.insertResource("idGenerator", generator);
  }
  /** Reserve before constructing an entity. Failure must never choose another allocator. */
  async generateInternalId(entity) {
    if (typeof entity !== "string" || !entity.trim() || entity !== entity.trim()) {
      throw new TypeError("Internal ID entity type is required");
    }
    if (this.resources.has("idGenerator")) {
      const generator = this.getResource("idGenerator");
      if (!generator || typeof generator.generateId !== "function") {
        throw new TypeError("Configured internal ID generator must provide generateId(entity, context)");
      }
      return internalId(await generator.generateId(entity, this));
    }
    const service = this.requireResource("dataService");
    if (typeof service.reserveInternalId !== "function") {
      throw new TypeError("Configured data service must provide reserveInternalId(entity, context)");
    }
    return internalId(await service.reserveInternalId(entity, this));
  }
  withBusinessClock(clock) {
    if (!clock || typeof clock.now !== "function") throw new TypeError("Business clock must provide now()");
    this.businessClock = clock;
    return this;
  }
  businessTime() {
    const value = this.businessClock.now();
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new TypeError("Business clock returned an invalid Date");
    return new Date(value.getTime());
  }
  /** UTC calendar date derived from the same business-clock provider. */
  businessDate() {
    return this.businessTime().toISOString().slice(0, 10);
  }
  withObjectStorage(provider) {
    return this.insertResource("objectStorageProvider", provider);
  }
  withObjectStorageObserver(observer) {
    return this.insertResource("objectStorageObserver", observer);
  }
  objectStorage(comment) {
    return new ObjectStorage(this, comment);
  }
  /** Runtime-owned outer boundary used by generated Q execution, never SDK code. */
  async withQueryRequest(query, work) {
    const service = this.requireResource("dataService");
    return service.withQueryRequest ? service.withQueryRequest(query, work) : work();
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
  translateCheckResults(results, declaringEntityType) {
    if (!results.length) return results;
    const scope = prepareCheckerResults(results, declaringEntityType);
    try {
      const translated = scope.values.map((result) => this.i18nCatalog.translate(result, this.locale));
      results.splice(0, results.length, ...scope.finish(translated));
      return results;
    } finally {
      scope.close();
    }
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
  /** @internal Generated post-Fix snapshots are reviewed before provider work. */
  prepareMutationPolicyGraph(rootEntity) {
    this.mutationPolicy.prepareGraphReview(this, rootEntity);
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
    const id = root.id;
    const valid = typeof id === "number" ? Number.isSafeInteger(id) && id > 0 : typeof id === "bigint" ? id > 0n : typeof id === "string" && /^[1-9][0-9]*$/.test(id);
    if (!valid) throw new ContextRootError("invalid_id", expectedType, root);
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

export {
  long,
  compareLongs,
  longOrderKey,
  CheckException,
  renderJsonFieldName,
  ObjectLocation,
  MutationVersionError,
  entityVersion,
  nextEntityVersion,
  SystemBusinessClock,
  FixedBusinessClock,
  credentialName,
  translateCheckerResults,
  locales,
  UnsupportedLocaleError,
  parseLocale,
  checkResultToWire,
  I18nCatalog,
  internalId,
  contextSchemaCapability,
  cloneTraceNodes,
  MutationTraceScope,
  mutationScopeForEntity,
  canonicalSQLTracePath,
  queryTraceSource,
  debugSQL,
  retainSQLLogProvenance,
  inheritSQLLogBindings,
  projectSQLLog,
  projectSafeSQLLog,
  queryDiagnosticOrigin,
  retainQueryDiagnosticOrigin,
  snapshotQuery,
  LoadedEntityIdentityError,
  LoadedScalarSnapshot,
  PreparedMutationError,
  queryOperationComment,
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
  UserContext
};
//# sourceMappingURL=chunk-D2TPHZDJ.js.map
