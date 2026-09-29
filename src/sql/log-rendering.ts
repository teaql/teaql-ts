/** Render provider placeholders as SQL literals so the statement can be copied into a SQL client. */
export type SQLDatabaseKind = 'postgresql' | 'mysql' | 'sqlite';
export type SQLParameterLogPolicy = 'plain' | 'masked' | 'credential' | 'unknown';

export function debugSQL(
  parameterizedSQL: string,
  parameters: readonly unknown[],
  databaseKind: SQLDatabaseKind = 'sqlite',
): string {
  return renderSQL(parameterizedSQL, parameters, databaseKind);
}

/** Shared scanner for diagnostics. A callback enables strict bind accounting. */
export function renderSQL(
  parameterizedSQL: string,
  parameters: readonly unknown[],
  databaseKind: SQLDatabaseKind,
  parameterLiteral?: (index: number) => string,
): string {
  if (parameterLiteral && !parameterizedSQL.trim()) throw new Error('Missing SQL template');
  let positionalIndex = 0;
  const used = new Set<number>();
  const literal = (index: number): string => {
    if (index < 0 || index >= parameters.length) throw new Error('SQL bind count mismatch');
    used.add(index);
    return parameterLiteral ? parameterLiteral(index) : sqlLiteral(parameters[index], databaseKind);
  };
  let result = '';
  let state: 'sql' | 'single' | 'double' | 'backtick' | 'line-comment' | 'block-comment' = 'sql';
  for (let index = 0; index < parameterizedSQL.length; index++) {
    const char = parameterizedSQL[index];
    const next = parameterizedSQL[index + 1] ?? '';
    if (state === 'sql' && char === "'") {
      result += char;
      state = 'single';
      continue;
    }
    if (state === 'sql' && char === '"') { result += char; state = 'double'; continue; }
    if (state === 'sql' && char === '`') { result += char; state = 'backtick'; continue; }
    if (state === 'sql' && char === '-' && next === '-') {
      result += '--'; index++; state = 'line-comment'; continue;
    }
    if (state === 'sql' && char === '/' && next === '*') {
      result += '/*'; index++; state = 'block-comment'; continue;
    }
    if (state === 'single') {
      result += char;
      if (char === "'" && next === "'") result += parameterizedSQL[++index];
      else if (char === "'") state = 'sql';
      continue;
    }
    if (state === 'double') {
      result += char;
      if (char === '"' && next === '"') result += parameterizedSQL[++index];
      else if (char === '"') state = 'sql';
      continue;
    }
    if (state === 'backtick') {
      result += char;
      if (char === '`' && next === '`') result += parameterizedSQL[++index];
      else if (char === '`') state = 'sql';
      continue;
    }
    if (state === 'line-comment') {
      result += char;
      if (char === '\r' || char === '\n') state = 'sql';
      continue;
    }
    if (state === 'block-comment') {
      result += char;
      if (char === '*' && next === '/') { result += '/'; index++; state = 'sql'; }
      continue;
    }
    if (char === '?') {
      if (parameterLiteral || positionalIndex < parameters.length) result += literal(positionalIndex++);
      else result += char;
      continue;
    }
    if (char === '$' && /[0-9]/.test(parameterizedSQL[index + 1] ?? '')) {
      let end = index + 1;
      while (/[0-9]/.test(parameterizedSQL[end] ?? '')) end++;
      const parameterIndex = Number(parameterizedSQL.slice(index + 1, end)) - 1;
      result += parameterLiteral || (parameterIndex >= 0 && parameterIndex < parameters.length)
        ? literal(parameterIndex) : parameterizedSQL.slice(index, end);
      index = end - 1;
      continue;
    }
    if (parameterizedSQL.slice(index).match(/^@p[0-9]+/i)) {
      const placeholder = parameterizedSQL.slice(index).match(/^@p([0-9]+)/i)!;
      const parameterIndex = Number(placeholder[1]) - 1;
      result += parameterLiteral || (parameterIndex >= 0 && parameterIndex < parameters.length)
        ? literal(parameterIndex) : placeholder[0];
      index += placeholder[0].length - 1;
      continue;
    }
    result += char;
  }
  if (parameterLiteral && (used.size !== parameters.length || (state !== 'sql' && state !== 'line-comment'))) {
    throw new Error('Incomplete SQL diagnostic rendering');
  }
  return result;
}

export function sqlLiteral(value: unknown, databaseKind: SQLDatabaseKind): string {
  if (value && typeof value === 'object' && 'type' in value) {
    const typed = value as { type: string; value?: unknown };
    if (typed.type === 'Null' || typed.type === 'TypedNull') return 'NULL';
    if (typed.type === 'Date') {
      const date = typed.value instanceof Date
        ? typed.value.toISOString().slice(0, 10) : String(typed.value);
      if (databaseKind === 'postgresql') return `DATE ${quoteSQLString(date)}`;
      if (databaseKind === 'mysql') return `CAST(${quoteSQLString(date)} AS DATE)`;
      return quoteSQLString(date);
    }
    if (typed.type === 'Timestamp') {
      if (databaseKind === 'sqlite') return String(typed.value);
      const iso = new Date(Number(typed.value)).toISOString();
      if (databaseKind === 'postgresql') return `TIMESTAMPTZ ${quoteSQLString(iso)}`;
      return `CAST(${quoteSQLString(iso.slice(0, 23).replace('T', ' '))} AS DATETIME(3))`;
    }
    if (typed.type === 'Bool') return typed.value ? 'TRUE' : 'FALSE';
    if (['I64', 'U64', 'F64', 'Decimal'].includes(typed.type)) return String(typed.value);
    if (typed.type === 'Text') return quoteSQLString(String(typed.value));
  }
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (value instanceof Date) {
    if (databaseKind === 'sqlite') return String(value.getTime());
    if (databaseKind === 'postgresql') return `TIMESTAMPTZ ${quoteSQLString(value.toISOString())}`;
    return `CAST(${quoteSQLString(value.toISOString().slice(0, 23).replace('T', ' '))} AS DATETIME(3))`;
  }
  if (value instanceof Uint8Array) {
    return `X'${Array.from(value, byte => byte.toString(16).padStart(2, '0')).join('')}'`;
  }
  if (typeof value === 'object') return quoteSQLString(JSON.stringify(value));
  return quoteSQLString(String(value));
}

function quoteSQLString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
