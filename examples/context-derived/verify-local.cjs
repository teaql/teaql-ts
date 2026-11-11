'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {createOwnedRunner,ownedBytes}=require('../fix-e-alignment/owned-command.cjs');
const repo=path.resolve(__dirname,'../..'),fixture=path.join(__dirname,'fixture'),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const requested=process.env.TEAQL_CONTEXT_FIX_EVIDENCE_DIR;
const output=requested?path.resolve(requested):fs.mkdtempSync(path.join(os.tmpdir(),'teaql-ts-context-evidence-'));
if(requested){assert(!fs.existsSync(output),'use a new evidence directory');fs.mkdirSync(output,{recursive:true});}
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'teaql-ts-context-build-')),runner=createOwnedRunner();
const report={schema:'teaql.typescript-context-derived-mutation/v1',passed:false,rounds:[],publicPublication:false,runtimeSource:path.join(repo,'src')};
function inputs(){
  const bytes=fs.readFileSync(path.join(fixture,'generated-files.json')),files=JSON.parse(bytes);
  const actual=[];
  function walk(directory){for(const name of fs.readdirSync(directory)){
    const file=path.join(directory,name),stat=fs.lstatSync(file);assert(!stat.isSymbolicLink());
    if(stat.isDirectory())walk(file);else{assert(stat.isFile());actual.push(path.relative(fixture,file));}
  }}
  walk(fixture);
  assert.deepEqual(actual.sort(),[...Object.keys(files),'model.xml','generated-files.json'].sort(),'unexpected generated fixture input');
  for(const[name,hash]of Object.entries(files)){
    assert(!path.isAbsolute(name)&&!name.split('/').includes('..'));
    const file=path.join(fixture,name);assert.equal(fs.realpathSync(file),file);assert.equal(sha(fs.readFileSync(file)),hash,name);
  }
  return{files,manifestSha256:sha(bytes),modelSha256:sha(fs.readFileSync(path.join(fixture,'model.xml')))};
}
function sourceHash(){
  const hash=crypto.createHash('sha256');
  function walk(directory){for(const name of fs.readdirSync(directory).sort()){
    const file=path.join(directory,name),stat=fs.lstatSync(file);assert(!stat.isSymbolicLink());
    if(stat.isDirectory())walk(file);else{hash.update(path.relative(repo,file)+'\0');hash.update(fs.readFileSync(file));}
  }}
  walk(path.join(repo,'src'));
  for(const name of ['package.json','package-lock.json','tsconfig.json']){hash.update(name+'\0');hash.update(fs.readFileSync(path.join(repo,name)));}
  return hash.digest('hex');
}
async function main(){
  try{
    const disk=fs.statfsSync(scratch);assert(disk.bavail*disk.bsize>2*1024**3);
    report.fixture=inputs();report.sourceSha256=sourceHash();report.sourceCommit=cp.execFileSync('git',['-C',repo,'rev-parse','HEAD']).toString().trim();
    report.applicationSha256=sha(fs.readFileSync(path.join(__dirname,'verify.test.ts')));
    assert(fs.existsSync(path.join(repo,'node_modules/jest/bin/jest.js')),'run npm ci at the runtime root first');
    const tsconfig=path.join(scratch,'tsconfig.json'),config=path.join(scratch,'jest.cjs');
    fs.writeFileSync(tsconfig,JSON.stringify({extends:path.join(repo,'tsconfig.json'),compilerOptions:{types:['node','jest'],
      typeRoots:[path.join(repo,'node_modules/@types')],baseUrl:repo,paths:{'teaql-ts':[path.join(repo,'src/index.ts')],
        'teaql-ts/*':[path.join(repo,'src/*')],'context-generated/*':[path.join(fixture,'src/*')]}}}));
    fs.writeFileSync(config,'module.exports='+JSON.stringify({rootDir:repo,roots:[__dirname],testEnvironment:'node',
      testMatch:['**/examples/context-derived/verify.test.ts'],moduleNameMapper:{'^teaql-ts$':path.join(repo,'src/index.ts'),
        '^teaql-ts/(.*)$':path.join(repo,'src/$1'),'^context-generated/(.*)$':path.join(fixture,'src/$1')},
      transform:{'^.+\\.tsx?$':['ts-jest',{tsconfig}]}})+';\n');
    for(const round of[1,2]){
      const command=[process.execPath,path.join(repo,'node_modules/jest/bin/jest.js'),'--config',config,'--runInBand','--cacheDirectory',path.join(scratch,'jest')];
      const file=path.join(output,'round-'+round+'.log'),fd=fs.openSync(file,'wx');let result;
      try{result=await runner.run(command,{cwd:repo,timeout:120000,env:{...process.env,
        TEAQL_EXPECTED_RUNTIME_ENTRY:path.join(repo,'src/index.ts'),TEAQL_CONTEXT_FIX_DB:path.join(output,'fixture')},stdio:['ignore',fd,fd]});}
      finally{fs.closeSync(fd);}
      const bytes=fs.readFileSync(file),rows=[...bytes.toString().matchAll(/^TS_CONTEXT_FIX_CASE=(.+)$/gm)].map(match=>JSON.parse(match[1]));
      report.rounds.push({round,command,exitCode:result.status,logSha256:sha(bytes),observations:rows});
      assert(!result.error&&!result.signal&&result.status===0,bytes.toString().slice(-7000));
      assert.deepEqual(rows.map(row=>row.provider).sort(),['file','sqlite']);
      for(const row of rows){assert.equal(row.passed,true);assert.equal(row.noOpProviderCalls,0);assert.equal(row.failedCheckProviderCalls,0);assert.equal(row.updateAudits,1);assert.equal(row.objectLocation,true);assert.equal(row.graphRollback,true);}
      assert.deepEqual(inputs(),report.fixture);assert.equal(sourceHash(),report.sourceSha256);
    }
    report.sameDatabase=true;report.stores={};
    for(const name of ['fixture.sqlite','fixture.json'])report.stores[name]=sha(fs.readFileSync(path.join(output,name)));
    report.passed=true;
  }catch(error){report.error=error.stack;process.exitCode=1;console.error(error.stack);}
  finally{
    report.disposedOwnedBytes=runner.safeToClean?ownedBytes(scratch):0;
    if(runner.safeToClean)fs.rmSync(scratch,{recursive:true});else report.unsafeBuildRetention=scratch;
    report.scratchRemoved=!fs.existsSync(scratch);runner.dispose();
    fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({passed:report.passed,rounds:report.rounds.length,evidence:output}));
    if(!requested&&report.passed&&report.scratchRemoved)fs.rmSync(output,{recursive:true});
  }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
