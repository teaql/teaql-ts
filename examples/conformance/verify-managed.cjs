'use strict';
// Local repository source, original generated fixture, two unreset SQLite rounds.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createOwnedRunner,ownedBytes}=require('../fix-e-alignment/owned-command.cjs');
const repo=path.resolve(__dirname,'../..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(){
  const m=JSON.parse(fs.readFileSync(path.join(__dirname,'current-generator-fixture.json')));
  assert.equal(sha(fs.readFileSync(path.join(__dirname,'model.xml'))),m.modelSha256);
  for(const[n,h]of Object.entries(m.files))assert.equal(sha(fs.readFileSync(path.join(__dirname,n))),h,n);
  return m;
}
async function main(){
  const requested=process.env.TEAQL_MANAGED_EVIDENCE_DIR,output=requested?path.resolve(requested):fs.mkdtempSync(path.join(os.tmpdir(),'teaql-ts-managed-evidence-'));
  if(requested){assert(path.isAbsolute(requested)&&!fs.existsSync(output));fs.mkdirSync(output,{recursive:true});}
  const r={schema:'teaql.typescript-managed-example/v1',passed:false,rounds:[],sameDatabase:true,sourceOnly:true,installedSdkAccepted:false};let scratch,runner;
  try{
    scratch=fs.mkdtempSync(path.join(os.tmpdir(),'teaql-ts-managed-example-'));runner=createOwnedRunner();const before=fixture();r.modelSha256=before.modelSha256;
    const config=path.join(scratch,'jest.cjs'),tsconfig=path.join(scratch,'tsconfig.json');
    fs.writeFileSync(tsconfig,JSON.stringify({extends:path.join(repo,'tsconfig.json'),compilerOptions:{baseUrl:repo,types:['node','jest'],typeRoots:[path.join(repo,'node_modules/@types')],lib:['ES2022','DOM'],paths:{'teaql-ts':[path.join(repo,'src/index.ts')],'teaql-ts/*':[path.join(repo,'src/*')]}}}));
    fs.writeFileSync(config,'module.exports='+JSON.stringify({rootDir:repo,roots:[__dirname],testEnvironment:'node',testTimeout:30000,testMatch:[__dirname+'/managed-*.test.ts'],moduleNameMapper:{'^teaql-ts$':repo+'/src/index.ts','^teaql-ts/(.*)$':repo+'/src/$1'},transform:{'^.+\\.tsx?$':['ts-jest',{tsconfig}]}})+';\n');
    for(const round of [1,2]){
      const results=path.join(output,'round-'+round+'.json'),log=path.join(output,'round-'+round+'.log'),fd=fs.openSync(log,'wx');let q;
      const command=[process.execPath,path.join(repo,'node_modules/jest/bin/jest.js'),'--config',config,'--runInBand','--no-cache','--json','--outputFile',results];
      try{q=await runner.run(command,{cwd:repo,env:{...process.env,TEAQL_MANAGED_DATABASE:path.join(output,'managed.sqlite')},timeout:120000,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
      r.rounds.push({round,command,exitCode:q.status,signal:q.signal,logSha256:sha(fs.readFileSync(log))});
      assert.equal(q.status,0,'inspect retained '+log);assert.equal(q.signal,null);
      const native=JSON.parse(fs.readFileSync(results));assert.equal(native.numFailedTests+native.numRuntimeErrorTestSuites+native.numPendingTests,0);assert.equal(native.numPassedTests,14);assert.equal(native.numTotalTestSuites,2);
      const cases=native.testResults.flatMap(s=>s.assertionResults.map(t=>({name:t.fullName,status:t.status}))).sort((a,b)=>a.name.localeCompare(b.name));
      Object.assign(r.rounds.at(-1),{passed:native.numPassedTests,resultsSha256:sha(fs.readFileSync(results)),cases});assert.deepEqual(fixture(),before);
    }
    assert.deepEqual(r.rounds[0].cases,r.rounds[1].cases);r.databaseSha256=sha(fs.readFileSync(path.join(output,'managed.sqlite')));r.passed=true;
    console.log('PASS TypeScript managed creation example: 6 boundary and 8 SQLite cases twice on one database');
  }catch(error){r.error=error.stack;console.error(error.stack);process.exitCode=1;}
  finally{r.cleanup={scratchRemoved:false,sharedCachesDeleted:false,sourceOrDatabasesDeleted:false};try{assert(!runner||runner.safeToClean);r.cleanup.disposedOwnedBytes=scratch?ownedBytes(scratch):0;if(scratch)fs.rmSync(scratch,{recursive:true});r.cleanup.scratchRemoved=true;}catch(error){r.cleanup.error=error.stack;r.cleanup.retained=scratch;process.exitCode=1;r.passed=false;}
    runner?.dispose();fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(r,null,2)+'\n');console.log('Retained managed example evidence: '+output);}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
