'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createOwnedRunner,ownedBytes}=require('../fix-e-alignment/owned-command.cjs');
const repo=path.resolve(__dirname,'../..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 const supplied=process.env.TEAQL_FILE_BOOTSTRAP_OUTPUT;assert(supplied&&path.isAbsolute(supplied));assert(!fs.existsSync(supplied));fs.mkdirSync(supplied,{recursive:true});
 const report={schema:'teaql.typescript-file-bootstrap-example/v1',passed:false,rounds:[],sameStores:true,manualSeed:false};
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'teaql-ts-file-bootstrap-build-'));let runner;
 try{
  runner=createOwnedRunner();const config=path.join(scratch,'jest.cjs'),tsconfig=path.join(scratch,'tsconfig.json');
  fs.writeFileSync(tsconfig,JSON.stringify({extends:path.join(repo,'tsconfig.json'),compilerOptions:{baseUrl:repo,types:['node','jest'],typeRoots:[path.join(repo,'node_modules/@types')],paths:{'teaql-ts':[path.join(repo,'src/index.ts')],'teaql-ts/*':[path.join(repo,'src/*')]}}}));
  fs.writeFileSync(config,'module.exports = '+JSON.stringify({rootDir:repo,roots:[__dirname],testEnvironment:'node',
   testMatch:['**/examples/school-management/file-bootstrap.test.ts'],moduleNameMapper:{'^teaql-ts$':path.join(repo,'src/index.ts'),'^teaql-ts/(.*)$':path.join(repo,'src/$1')},
   transform:{'^.+\\.tsx?$':['ts-jest',{tsconfig}]}})+';\n');
  for(const round of [1,2]){
   const log=path.join(supplied,'round-'+round+'.log'),fd=fs.openSync(log,'wx');let result;
   try{result=await runner.run([process.execPath,path.join(repo,'node_modules/jest/bin/jest.js'),'--config',config,'--runInBand','--cacheDirectory',path.join(scratch,'jest')],
    {cwd:repo,env:{...process.env,TEAQL_FILE_BOOTSTRAP_EVIDENCE_DIR:supplied,TEAQL_FILE_BOOTSTRAP_ROUND:String(round)},timeout:120000,stdio:['ignore',fd,fd]});}
   finally{fs.closeSync(fd);}
   const bytes=fs.readFileSync(log),text=bytes.toString();report.rounds.push({round,exitCode:result.status,signal:result.signal,logSha256:sha(bytes)});
   assert.equal(result.status,0,text.slice(-14000));
   const rows=text.split(/\r?\n/).filter(l=>l.startsWith('FILE_BOOTSTRAP=')).map(l=>JSON.parse(l.slice('FILE_BOOTSTRAP='.length)));
   assert.deepEqual(rows.map(r=>r.scenario).sort(),['concurrent','conflict','floor','reconcile','rejected','school']);assert(rows.every(r=>r.passed&&r.round===round));
  }report.passed=true;
 }catch(error){report.error=error.stack;console.error(error.stack);process.exitCode=1;}
 finally{
  report.cleanup={sharedCachesDeleted:false,sourceOrDatabasesDeleted:false};
  if(!runner||runner.safeToClean){report.cleanup.disposedOwnedBytes=ownedBytes(scratch);fs.rmSync(scratch,{recursive:true});report.cleanup.scratchRemoved=true;}
  else{report.cleanup.scratchRemoved=false;report.cleanup.unsafeRetention=scratch;report.passed=false;process.exitCode=1;}
  runner?.dispose();fs.writeFileSync(path.join(supplied,'receipt.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({passed:report.passed,directory:supplied,error:report.error}));
 }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
