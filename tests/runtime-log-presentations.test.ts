import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {spawn, ChildProcess} from 'node:child_process';
import {RuntimeLogger, RuntimeLoggingError, RuntimeLogFormat, loggingTelemetry} from '../src/core/runtime-logging';
import {UserContext} from '../src/core/context';
import {observeRuntimeOperation} from '../src/core/telemetry';
import {RuntimeDiagnosticSQLLogSink} from '../src/sql/core';
import {MutationPolicyError} from '../src/core/mutation-policy';
import {SQLiteTeaQLClient} from '../src/sql/sqlite';
import {SelectQuery} from '../src/core/ast';
import {PLAINTEXT_LOG_ACK} from '../src/core/log-privacy';

let directory: string;
beforeEach(() => {directory = fs.mkdtempSync(path.join(os.tmpdir(), 'teaql-log-presentations-'));});
afterEach(() => {fs.rmSync(directory, {recursive: true});});
const scalar = (text: string): string => JSON.parse('"' + text.replace(/"/gu, '\\"') + '"');
function parse(text: string, format: RuntimeLogFormat): any[] {
  expect(text.endsWith('\n')).toBe(true); const lines = text.slice(0, -1).split('\n');
  if (format === 'json') return lines.map(line => JSON.parse(line));
  const rows: any[] = []; let sql: string[] | undefined;
  for (const line of lines) {
    expect(line).not.toMatch(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u);
    const header = /^(\S+) \[TeaQL\]\[(.*)\]\[(INFO|WARN|ERROR)\] (.*) runtime=(\S+)$/u.exec(line);
    if (header) {
      expect(header[1].endsWith('Z')).toBe(true); expect(Number.isFinite(Date.parse(header[1]))).toBe(true);
      rows.push({timestamp: header[1], log_name: scalar(header[2]), level: header[3], event: scalar(header[4]), runtime: header[5]}); sql = undefined;
    } else {
      expect(rows.length).toBeGreaterThan(0); expect(line.startsWith('  ')).toBe(true); const row = rows[rows.length - 1];
      if (!('message' in row)) row.message = scalar(line.slice(2));
      else if (line === '  sql:') {sql = []; row.sql = '';}
      else if (line.startsWith('    ') && sql) {sql.push(scalar(line.slice(4))); row.sql = sql.join('\n');}
      else {const separator = line.indexOf('=', 2); expect(separator).toBeGreaterThan(2); row[scalar(line.slice(2, separator))] = JSON.parse(line.slice(separator + 1)); sql = undefined;}
    }
  }
  for (const row of rows) for (const key of ['timestamp','level','log_name','runtime','event','message']) expect(typeof row[key]).toBe('string');
  return rows;
}
const read = (format: RuntimeLogFormat, ...files: string[]): any[] => files.flatMap(file => parse(fs.readFileSync(file, 'utf8'), format));
const files = (file: string): string[] => fs.readdirSync(path.dirname(file)).map(name => path.join(path.dirname(file), name));

describe.each(['json','human'] as const)('%s presentation', format => {
  const make = (environment: Record<string,string> = {}, base = directory) => new RuntimeLogger({logFormat: format, environment, workingDirectory: base});

  test('selection, names, endpoint, fixed contexts and two starts', () => {
    expect(new RuntimeLogger({environment: {}, workingDirectory: path.join(directory, 'default')}).logFormat).toBe('json');
    for (const [index, [logName, domain, modelNames, expected]] of ([
      ['application','domain',['model'],'application'],[undefined,'domain',['model'],'domain'],[undefined,'',['model'],'model'],
      [undefined,'',[],'teaql'],[undefined,'',['one','two'],'teaql'],
    ] as const).entries()) {
      const base = path.join(directory, String(index)); const env: Record<string,string> = {TEAQL_LOG_FORMAT: format, TEAQL_DOMAIN: domain};
      const logger = new RuntimeLogger({logName, modelNames, environment: env, workingDirectory: base});
      expect(logger.logFormat).toBe(format); expect(logger.logName).toBe(expected); expect(logger.path).toBe(path.join(base, 'logs', expected + '.log'));
      env.TEAQL_LOG_FORMAT = 'invalid-unused'; env.TEAQL_DOMAIN = 'changed'; const context = new UserContext(logger); expect(context.runtimeLogger).toBe(logger);
      expect(logger.write('INFO','frozen','startup-owned')).toBe(true);
      new RuntimeLogger({logName: expected, logFormat: format, environment: {}, workingDirectory: base}); expect(read(format, logger.path!)).toHaveLength(3);
      const other = make({TEAQL_LOG_FORMAT: 'invalid-unused', TEAQL_LOG_ENDPOINT: 'override/custom.log'}, base); expect(other.path).toBe(path.join(base,'override/custom.log'));
    }
  });

  test('both streams keep the same typed projected event and escaped human SQL', () => {
    for (const endpoint of ['stdout','stderr']) {
      const chunks: Buffer[] = []; const native = require('node:fs') as typeof fs;
      const spy = jest.spyOn(native, 'writeSync').mockImplementation(((fd: number, bytes: any) => {expect(fd).toBe(endpoint === 'stderr' ? 2 : 1); const chunk = Buffer.from(bytes); chunks.push(chunk); return chunk.length;}) as any);
      const fields = {category: 'SQL', trace_id: '0123456789abcdef0123456789abcdef', outcome: 'retrying', error_code: 'connection_timeout',
        entity_id: 9007199254740993n, enabled: true, result_count: 0, omission_reason: null, changes: [{field:'password',value:'***'}], sql: 'SELECT id\nFROM customer\n\u001b\r\u0085\u2028'};
      const message = 'Readable \\u001b\nFORGED\u001b\r\u0085\u2029';
      try {const logger = make({TEAQL_LOG_ENDPOINT: endpoint}); expect(logger.write('WARN','unknown.kind',message,fields)).toBe(true);} finally {spy.mockRestore();}
      const rows = parse(Buffer.concat(chunks).toString('utf8'), format); expect(rows).toHaveLength(2); delete rows[1].timestamp;
      expect(rows[1]).toEqual({...fields, entity_id:'9007199254740993', level:'WARN', log_name:'teaql', runtime:'typescript', event:'unknown.kind', message});
      expect(fs.readdirSync(directory)).toEqual([]);
    }
  });

  test('native outcomes, SQL privacy, exact ack and original SQLite values', async () => {
    const logger = make(); const identity = {traceId:'0123456789abcdef0123456789abcdef',spanId:'0123456789abcdef'};
    const telemetry = loggingTelemetry({start: () => ({success() {}, failure() {}, correlation: () => identity})}, logger);
    expect(await observeRuntimeOperation(telemetry,{family:'query',name:'probe'},async () => 42)).toBe(42);
    for (const error of [new MutationPolicyError('POLICY-CANARY'),new Error('DRIVER-CANARY')])
      await expect(observeRuntimeOperation(telemetry,{family:'query',name:'probe'},async () => {throw error;})).rejects.toBe(error);
    expect(read(format,logger.path!).map(row=>row.level)).toEqual(['INFO','INFO','WARN','ERROR']);
    const previous = process.env.TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS;
    const context = new UserContext(logger); const client = new SQLiteTeaQLClient(':memory:', {Customer:{table:'customer',auditMaskFields:['email'],columns:{
      id:{columnName:'id',logicalType:'integer',decode:'string'},version:{columnName:'version',logicalType:'integer',decode:'number'},
      email:{columnName:'email',logicalType:'text',decode:'native'},password:{columnName:'password',logicalType:'text',decode:'native'},
    }}}).setUserContext(context);
    try {
      await context.insertResource('dataService',client).ensureSchema();
      for (const [index, ack] of ['', 'true', PLAINTEXT_LOG_ACK].entries()) {
        process.env.TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS = ack;
        new RuntimeDiagnosticSQLLogSink(() => logger).write({operation:'select',executionOutcome:'retrying',telemetryCorrelation:identity,
          parameterizedSQL:'SELECT id FROM customer WHERE password = ?',parameters:['PASSWORD-CANARY'],debugSQL:'PASSWORD-CANARY',tracePath:[],elapsedMicros:1,resultSummary:''});
        const payload = {email:'EMAIL-CANARY',password:'PASSWORD-CANARY'}; const mutation = {entity:'Customer',action:'Create',id:String(42+index),payload,comment:'create target '+(42+index)+' PASSWORD-CANARY'};
        await client.executeMutation(mutation); expect(mutation.payload).toEqual(payload);
      }
      const stored = await client.executeQuery(new SelectQuery('Customer').comment('read fixture').purpose('verify original values').limit(10));
      expect(stored).toHaveLength(3); expect(stored.every(row => row.email === 'EMAIL-CANARY' && row.password === 'PASSWORD-CANARY')).toBe(true);
      const rows = read(format,logger.path!); const retries = rows.filter(row => row.event === 'sql.retry'); expect(retries).toHaveLength(3);
      expect(retries.every(row => row.level === 'WARN' && row.trace_id === identity.traceId)).toBe(true);
      expect(rows.some(row => row.category === 'AUDIT' && row.audit?.id === '42')).toBe(true);
      expect(fs.readFileSync(logger.path!,'utf8')).not.toMatch(/PASSWORD-CANARY|POLICY-CANARY|DRIVER-CANARY/);
    } finally {await client.close(); if(previous === undefined) delete process.env.TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS; else process.env.TEAQL_ALLOW_SENSITIVE_PLAINTEXT_LOGS = previous;}
  });

  test('positive retention keeps numeric newest order and whole blocks', () => {
    const logger=make({TEAQL_LOG_MAX_SIZE:'256',TEAQL_LOG_MAX_FILES:'2'});
    for(let sequence=0;sequence<5;sequence++)expect(logger.write('INFO','retention','界'.repeat(200),{sequence,sql:'SELECT\n'+sequence})).toBe(true);
    for(let i=0;i<3;i++){const rows=read(format,logger.path+(i?'.'+i:''));expect(rows).toHaveLength(1);expect(rows[0].sequence).toBe(4-i);expect(rows[0].sql).toBe('SELECT\n'+(4-i));}
    expect(files(logger.path!)).toHaveLength(3);expect(fs.existsSync(logger.path+'.3')).toBe(false);
  });

  test.each([false,true])('whole UTF8 multiline size/day/restart/retention/oversize, override %s', override => {
    const env: Record<string,string> = {TEAQL_LOG_MAX_SIZE:'1K',TEAQL_LOG_MAX_FILES:'100'}; if(override) env.TEAQL_LOG_ENDPOINT='override/custom.log';
    const logger = make(env); for(let index=0;index<40;index++) expect(logger.write('INFO','regular','界'.repeat(25),{index,sql:'SELECT id\nFROM customer'})).toBe(true);
    const paths = files(logger.path!); expect(paths.length).toBeGreaterThan(1); for(const file of paths) {expect(fs.statSync(file).size).toBeGreaterThan(0);expect(fs.statSync(file).size).toBeLessThanOrEqual(1024);}
    const rows = read(format,...paths); expect(rows).toHaveLength(41); expect(rows.filter(row=>'index'in row).map(row=>row.index).sort((a,b)=>a-b)).toEqual(Array.from({length:40},(_,i)=>i));
    expect(rows.filter(row=>'index'in row).every(row=>row.sql==='SELECT id\nFROM customer')).toBe(true);
    expect(logger.write('WARN','oversize','whole',{sql:'界'.repeat(2000)+'\nLAST'})).toBe(true); const before = fs.readFileSync(logger.path!); expect(before.length).toBeGreaterThan(1024); expect(parse(before.toString('utf8'),format)).toHaveLength(1);
    expect(logger.write('INFO','after','next')).toBe(true); expect(fs.readFileSync(logger.path+'.1')).toEqual(before);
    for(const restart of [false,true]) {const yesterday = new Date(Date.now()-172800000); fs.utimesSync(logger.path!,yesterday,yesterday); const old = fs.readFileSync(logger.path!);
      if(restart) make(env); else expect(logger.write('INFO','day','UTC rotation')).toBe(true); expect(fs.readFileSync(logger.path+'.1')).toEqual(old); expect(read(format,logger.path!)).toHaveLength(1);}
    const zero = make({...env,TEAQL_LOG_MAX_FILES:'0'}); expect(zero.write('INFO','last','界'.repeat(2000))).toBe(true); expect(files(logger.path!)).toEqual([logger.path]); expect(read(format,logger.path!)).toHaveLength(1);
  });

  test('mixed files and I/O failures preserve files and actual business results', async () => {
    const logger = make(); const other = format === 'json' ? 'human' : 'json'; const archive = logger.path+'.10'; fs.writeFileSync(archive,'preserve archive bytes');
    let before = fs.readFileSync(logger.path!); expect(() => new RuntimeLogger({logFormat:other,environment:{TEAQL_LOG_MAX_SIZE:'1',TEAQL_LOG_MAX_FILES:'0'},workingDirectory:directory})).toThrow(RuntimeLoggingError);
    expect(fs.readFileSync(logger.path!)).toEqual(before); expect(fs.readFileSync(archive,'utf8')).toBe('preserve archive bytes');
    const replacement = new RuntimeLogger({logFormat:other,environment:{},workingDirectory:path.join(directory,'replacement')}); before=fs.readFileSync(replacement.path!);fs.writeFileSync(logger.path!,before);
    const telemetry = loggingTelemetry(undefined,logger); expect(await observeRuntimeOperation(telemetry,{family:'query',name:'probe'},async()=>42)).toBe(42);
    const error = new Error('SECRET-BUSINESS-ERROR'); await expect(observeRuntimeOperation(telemetry,{family:'query',name:'probe'},async()=>{throw error;})).rejects.toBe(error);
    expect(logger.write('INFO','later','business completion')).toBe(false);expect(fs.readFileSync(logger.path!)).toEqual(before);expect(fs.readFileSync(archive,'utf8')).toBe('preserve archive bytes');
    fs.unlinkSync(logger.path!);fs.mkdirSync(logger.path!);expect(logger.write('ERROR','later','I/O failure')).toBe(false);expect(()=>make()).toThrow(RuntimeLoggingError);
  });

  test('browser methods retain prefix and the same safely projected structured record', () => {
    const captures: any[]=[]; const spies=['info','warn','error'].map(method=>jest.spyOn(console,method as 'info').mockImplementation((prefix,record)=>{captures.push({method,prefix,record});}));
    try {
      const logger=new RuntimeLogger({logFormat:format,platform:'browser',modelNames:['model'],environment:{TEAQL_DOMAIN:'SERVER-CANARY',TEAQL_LOG_FORMAT:'invalid-unused'}});
      const safe=Object.freeze({id:'42',password:'***'});logger.write('WARN','sql.retry','Retry scheduled',{category:'SQL',sql:'SELECT\nprobe',audit:safe});logger.write('ERROR','probe.failure','Failed',{error_code:'provider'});
      expect(captures.map(row=>row.method)).toEqual(['info','warn','error']);expect(captures[1].prefix).toContain('[TeaQL][model][WARN] sql.retry');expect(captures[1].record.audit).toBe(safe);
      expect(captures[1].record.log_name).toBe('model');expect(logger.path).toBeUndefined();
      if(format==='human') expect(parse(captures[1].prefix,'human')[0]).toEqual(captures[1].record);
      else expect(captures[1].prefix).toBe('[TeaQL][model][WARN] sql.retry');
      expect(JSON.stringify(captures)).not.toContain('CANARY');
    } finally {spies.forEach(spy=>spy.mockRestore());}
  });

  test('native processes coordinate multiline blocks and subsequent start', async () => {
    const rows = await nativeWriters(directory, Array.from({length:4},(_,i)=>[String(i),format] as const));expect(rows).toEqual([0,0,0,0]);expect(await nativeWriters(directory,[['following',format]])).toEqual([0]);
    const all=read(format,...files(path.join(directory,'logs/teaql.log'))); const ids=all.filter(row=>row.id);expect(all).toHaveLength(155);expect(new Set(ids.map(row=>row.id)).size).toBe(150);expect(ids.every(row=>row.sql==='SELECT\n'+row.id)).toBe(true);
  },60_000);
});

test.each(['','debug','JSON','human\nFORMAT-CANARY'])('invalid server and browser format fails without echo: %j', value => {
  const errors: any[]=[];const spy=jest.spyOn(console,'error').mockImplementation((...args)=>{errors.push(args);});
  try {
    expect(()=>new RuntimeLogger({logFormat:value as RuntimeLogFormat,environment:{},workingDirectory:directory})).toThrow(RuntimeLoggingError);
    expect(()=>new RuntimeLogger({environment:{TEAQL_LOG_FORMAT:value},workingDirectory:directory})).toThrow(RuntimeLoggingError);
    expect(()=>new RuntimeLogger({platform:'browser',logFormat:value as RuntimeLogFormat})).toThrow(RuntimeLoggingError);
    expect(errors).toHaveLength(1);expect(JSON.stringify(errors)).not.toContain('CANARY');expect(fs.readdirSync(directory)).toEqual([]);
  } finally {spy.mockRestore();}
});
test('browser default ignores invalid server format and environment getters', () => {
  const spy=jest.spyOn(console,'info').mockImplementation(()=>{});
  try {expect(new RuntimeLogger({platform:'browser',environment:{get TEAQL_LOG_FORMAT(): string {throw new Error('server environment read');}}}).logFormat).toBe('json');} finally {spy.mockRestore();}
});

async function nativeWriters(base: string, variants: ReadonlyArray<readonly [string, RuntimeLogFormat]>): Promise<number[]> {
  const modulePath=path.resolve(__dirname,'../dist/core/runtime-logging.js');
  const code=`const {RuntimeLogger}=require(process.argv[1]);let logger;try{logger=new RuntimeLogger({logFormat:process.argv[4],workingDirectory:process.argv[2],environment:{TEAQL_LOG_MAX_SIZE:'2K',TEAQL_LOG_MAX_FILES:'100'}})}catch{process.exit(2)}for(let i=0;i<30;i++){const id=process.argv[3]+'/'+i;if(!logger.write('INFO','parallel','原生并发',{id,sql:'SELECT\\n'+id}))process.exit(1)}`;
  const children: ChildProcess[]=[];
  try {return await Promise.all(variants.map(([worker,format])=>new Promise<number>((resolve,reject)=>{
    const child=spawn(process.execPath,['-e',code,modulePath,base,worker,format],{env:{TMPDIR:os.tmpdir()}});children.push(child);child.stdout!.resume();child.stderr!.resume();child.on('error',reject);child.on('exit',code=>resolve(code??-1));
  })));} finally {await Promise.all(children.map(child=>child.exitCode!==null||child.signalCode!==null?Promise.resolve():new Promise<void>(resolve=>{child.once('exit',()=>resolve());child.kill('SIGTERM');})));}
}
test('mixed native process formats select one presentation without interleaving', async () => {
  const codes=await nativeWriters(directory,[['json','json'],['human','human']]);expect([...codes].sort()).toEqual([0,2]);
  const file=path.join(directory,'logs/teaql.log');const winner=fs.readFileSync(file,'utf8').startsWith('{')?'json':'human';
  const rows=read(winner,...files(file));expect(rows).toHaveLength(31);expect(rows.filter(row=>row.id)).toHaveLength(30);
},60_000);
