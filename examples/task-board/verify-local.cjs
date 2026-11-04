'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createOwnedRunner,ownedBytes}=require('../fix-e-alignment/owned-command.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),example=__dirname,repo=path.resolve(example,'../..');
function fixture(){
 const manifest=JSON.parse(fs.readFileSync(path.join(example,'fixture-manifest.json')));
 assert.equal(manifest.schema,'teaql.typescript-task-board-fixture/v1');assert.equal(manifest.evaluationErrors,0);
 assert.equal(sha(fs.readFileSync(path.join(example,'model.xml'))),manifest.modelSha256);
 const actual=[];function visit(dir,prefix=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){assert(!e.isSymbolicLink());const n=path.join(prefix,e.name),f=path.join(dir,e.name);if(e.isDirectory())visit(f,n);else{assert(e.isFile());actual.push(n);}}}
 visit(path.join(example,'ts-lib-core'));assert.deepEqual(actual.sort(),Object.keys(manifest.files).sort());
 for(const[n,h]of Object.entries(manifest.files))assert.equal(sha(fs.readFileSync(path.join(example,'ts-lib-core',n))),h);
 for(const[n,h]of Object.entries(manifest.assist))assert.equal(sha(fs.readFileSync(path.join(example,'assist',n))),h);
 return manifest;
}
async function main(){
 const requested=process.env.TEAQL_TASK_BOARD_EVIDENCE_DIR,output=requested?path.resolve(requested):fs.mkdtempSync(path.join(os.tmpdir(),'teaql-ts-taskboard-evidence-'));
 if(requested){assert(path.isAbsolute(requested)&&!fs.existsSync(output));fs.mkdirSync(output,{recursive:true});}
 const r={schema:'teaql.typescript-task-board-example/v1',passed:false,rounds:[],sameDatabase:true,manualSeedSQL:false,generatedImplementationHandEdited:false};
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'teaql-ts-taskboard-build-'));let runner;
 try{
  const model=fixture();r.modelSha256=model.modelSha256;r.generatorCommit=model.generatorCommit;r.generatedFiles=Object.keys(model.files).length;
  r.runtimeOrigin=fs.realpathSync(require.resolve('teaql-ts'));
  r.expectedRuntime=path.resolve(process.env.TEAQL_TASK_BOARD_EXPECTED_RUNTIME||path.join(repo,'dist/index.js'));
  assert.equal(r.runtimeOrigin,r.expectedRuntime,'runtime origin must be explicit and exact');
  runner=createOwnedRunner();
  async function run(name,command,extra={}){const f=path.join(output,name+'.log'),fd=fs.openSync(f,'wx');let q;try{q=await runner.run(command,{cwd:example,env:{...process.env,...extra,TMPDIR:scratch},timeout:120000,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}const text=fs.readFileSync(f,'utf8');assert(!q.error&&!q.signal&&q.status===0&&runner.safeToClean,name+': '+text.slice(-5000));return{text,exitCode:q.status,signal:q.signal,logSha256:sha(Buffer.from(text))};}
  const compile=await run('compile',[process.execPath,require.resolve('typescript/bin/tsc'),'--noEmit','--pretty','false','-p','tsconfig.json']);r.compile={...compile,text:undefined};
  const database=path.join(output,'task-board.sqlite');
  for(const round of[1,2]){
   assert.equal(fs.existsSync(database),round===2);
   const result=await run('round-'+round,[process.execPath,require.resolve('ts-node/dist/bin.js'),'verify.ts'],{TEAQL_TASK_BOARD_DB:database,TEAQL_TASK_BOARD_ROUND:String(round)});
   const frames=result.text.split(/\r?\n/).filter(n=>n.startsWith('TYPESCRIPT_TASK_BOARD=')).map(n=>JSON.parse(n.slice('TYPESCRIPT_TASK_BOARD='.length)));assert.equal(frames.length,1);
   const v=frames[0];assert(v.passed&&v.round===round&&v.typedDynamicMatch&&v.checkerRejected&&v.missingAuditRejected&&v.notLoadedRejected&&v.parserInjectionRejected);
   assert.equal(v.seeded,round===1?2:0);assert.equal(v.renamed,round===1?2:0);assert.equal(v.runtimeOrigin,r.runtimeOrigin);
   r.rounds.push({round,exitCode:result.exitCode,signal:result.signal,logSha256:result.logSha256,result:v});assert.deepEqual(fixture(),model);
  }
  assert.deepEqual(r.rounds[0].result.taskIds,r.rounds[1].result.taskIds);assert.deepEqual(r.rounds[0].result.versions,r.rounds[1].result.versions);
  r.databaseSha256=sha(fs.readFileSync(database));r.passed=true;
 }catch(error){r.error=error.stack;process.exitCode=1;}
 finally{
  r.cleanup={scratchRemoved:false,sharedCachesDeleted:false,databasesDeleted:false};
  if(!runner||runner.safeToClean){r.cleanup.disposedOwnedBytes=ownedBytes(scratch);fs.rmSync(scratch,{recursive:true});r.cleanup.scratchRemoved=true;}else{r.cleanup.unsafeRetention=scratch;r.passed=false;process.exitCode=1;}
  runner?.dispose();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(r,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,passed:r.passed,error:r.error}));
 }
}
module.exports={fixture};if(require.main===module)main().catch(e=>{console.error(e.stack);process.exitCode=1;});
