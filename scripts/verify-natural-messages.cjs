'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createOwnedRunner,ownedBytes}=require('../examples/fix-e-alignment/owned-command.cjs');
const {sourceFiles,selection}=require('./natural-source-inventory.cjs');
const repo=path.resolve(__dirname,'..'),args=process.argv.slice(2),index=args.indexOf('--output');
assert(index>=0&&args[index+1],'--output /new/evidence/path is required');
const output=path.resolve(args[index+1]);assert(!fs.existsSync(output),'never overwrite retained evidence');fs.mkdirSync(output,{recursive:true});
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'teaql-ts-natural-build-')),runtime=path.join(scratch,'source'),runner=createOwnedRunner();
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function files(){return sourceFiles(repo);}
function source(){return Object.fromEntries(files().map(name=>{const f=path.join(repo,name);assert(fs.lstatSync(f).isFile()&&!fs.lstatSync(f).isSymbolicLink());return [name,sha(fs.readFileSync(f))];}));}
const report={scope:'local-source',passed:false,commands:[],publicPublication:false};
async function run(name,command,timeout=300000,env={}){
  const log=path.join(output,name+'.log'),fd=fs.openSync(log,'wx');let result;
  try{result=await runner.run(command,{cwd:runtime,env:{...process.env,PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH,
    TEAQL_TYPESCRIPT_EXAMPLE_SOURCE_ROOT:repo,...env},timeout,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
  report.commands.push({name,command,exitCode:result.status,signal:result.signal,log:path.basename(log),logSha256:sha(fs.readFileSync(log))});
  assert(!result.error&&result.status===0&&!result.signal,`${name} failed; see ${log}`);return fs.readFileSync(log,'utf8');
}
async function main(){
  try{
    const disk=fs.statfsSync(scratch);assert(disk.bavail*disk.bsize>3*1024**3);
    report.freeBytesBefore=disk.bavail*disk.bsize;report.sourceCommit=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
    report.sourceSelection=selection;report.sourceHashes=source();report.node=process.version;report.scratch=scratch;
    for(const name of files()){
      const from=path.join(repo,name),to=path.join(runtime,name);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);fs.chmodSync(to,fs.statSync(from).mode&0o777);
    }
    // Project-scoped npm requires the policy in package.json, not the CLI flag.
    // This is a recorded execution overlay in the disposable copy only.
    const manifest=path.join(runtime,'package.json'),pkg=JSON.parse(fs.readFileSync(manifest));
    pkg.allowScripts={'better-sqlite3@13.0.3':true,'esbuild@0.28.2':true};
    fs.writeFileSync(manifest,JSON.stringify(pkg,null,2)+'\n');
    report.dependencyScriptPolicy={sourceEdited:false,allowScripts:pkg.allowScripts,executionManifestSha256:sha(fs.readFileSync(manifest))};
    await run('source-inventory-tests',[process.execPath,'--test','scripts/natural-source-inventory.test.cjs']);
    await run('dependencies',['npm','ci','--offline','--no-audit','--fund=false']);
    await run('typecheck',[process.execPath,path.join(runtime,'node_modules/typescript/bin/tsc'),'--noEmit']);
    const jest=[process.execPath,path.join(runtime,'node_modules/jest/bin/jest.js'),'--config',path.join(runtime,'jest.config.cjs'),'--runInBand','--cacheDirectory',path.join(scratch,'jest')];
    await run('focused',[...jest,'tests/natural-messages.test.ts','--json','--outputFile',path.join(output,'focused-summary.json')]);
    const focused=JSON.parse(fs.readFileSync(path.join(output,'focused-summary.json')));assert(focused.success&&focused.numPassedTests>=13);
    report.focused={passed:focused.numPassedTests,failed:focused.numFailedTests};
    if(args.includes('--full')){
      await run('native',[...jest,'--json','--outputFile',path.join(output,'native-summary.json')]);
      const native=JSON.parse(fs.readFileSync(path.join(output,'native-summary.json')));assert(native.success&&native.numPassedTests>=1157);
      report.native={passed:native.numPassedTests,failed:native.numFailedTests,pending:native.numPendingTests,suites:native.numPassedTestSuites};
    }
    await run('build',['npm','run','build']);
    await run('browser-bundle',[path.join(runtime,'node_modules/esbuild/bin/esbuild'),'src/core/natural-messages/index.ts','--bundle','--platform=browser','--format=esm','--outfile='+path.join(scratch,'natural-browser.js')]);
    const smoke=path.join(scratch,'artifact-smoke.cjs');
    fs.writeFileSync(smoke,`const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
      async function main(){for(const [kind,api] of [['cjs',require(${JSON.stringify(path.join(runtime,'dist/index.js'))})],['esm',await import(pathToFileURL(${JSON.stringify(path.join(runtime,'dist/esm/index.js'))}).href)]]){
        const model=api.CheckerPresentationModel.fromJson(JSON.stringify({schema:'teaql.checker-model/v1',revision:'artifact',entities:{Entry:{labels:{en:'entry'},fields:[{name:'name',labels:{en:'name'}}]}}}));
        const context=new api.UserContext().installCheckerPresentationModel(model).installCheckerMessageWarning(()=>{});
        const result=context.translateCheckResultsFrom('Entry',[{ruleId:'required',location:api.ObjectLocation.property('name')}])[0];
        assert.equal(result.message,'The name is required.');assert.equal(api.checkResultToWire(result).instancePath,'/name');console.log('TS_NATURAL_ARTIFACT='+kind);
      }}main().catch(error=>{console.error(error);process.exitCode=1;});`);
    await run('artifacts',[process.execPath,smoke]);
    if(args.includes('--example')){
      const example=path.join(runtime,'examples/natural-messages'),fixture=path.join(example,'fixture');
      const manifest=JSON.parse(fs.readFileSync(path.join(fixture,'generated-files.json')));
      for(const [name,hash] of Object.entries(manifest))assert.equal(sha(fs.readFileSync(path.join(fixture,name))),hash,'generated library changed: '+name);
      report.fixture=manifest;
      const config=path.join(scratch,'example-jest.cjs'),tsconfig=path.join(scratch,'example-tsconfig.json');
      fs.writeFileSync(tsconfig,JSON.stringify({extends:path.join(runtime,'tsconfig.json'),compilerOptions:{types:['node','jest'],typeRoots:[path.join(runtime,'node_modules/@types')],baseUrl:runtime,
        paths:{'teaql-ts':[path.join(runtime,'src/index.ts')],'teaql-ts/*':[path.join(runtime,'src/*')],'natural-generated/*':[path.join(fixture,'src/*')]}}}));
      fs.writeFileSync(config,'module.exports='+JSON.stringify({rootDir:runtime,roots:[example],testEnvironment:'node',testMatch:['**/examples/natural-messages/verify.test.ts'],
        moduleNameMapper:{'^teaql-ts$':path.join(runtime,'src/index.ts'),'^teaql-ts/(.*)$':path.join(runtime,'src/$1'),'^natural-generated/(.*)$':path.join(fixture,'src/$1')},
        transform:{'^.+\\.tsx?$':['ts-jest',{tsconfig}]}})+';\n');
      const database=path.join(output,'example.sqlite'),fileDatabase=path.join(output,'example.json');report.rounds=[];
      for(const round of [1,2]){
        const log=await run('example-'+round,[process.execPath,path.join(runtime,'node_modules/jest/bin/jest.js'),'--config',config,'--runInBand','--cacheDirectory',path.join(scratch,'example-jest')],120000,
          {TEAQL_EXPECTED_RUNTIME_ENTRY:path.join(runtime,'src/index.ts'),TEAQL_NATURAL_MESSAGES_DB:database,TEAQL_NATURAL_MESSAGES_FILE:fileDatabase});
        const responses=[...log.matchAll(/^TS_NATURAL_RESPONSE=(.+)$/gm)].map(match=>JSON.parse(match[1]));
        const checks=[...log.matchAll(/^TS_NATURAL_SQLITE_PASS=(.+)$/gm)].map(match=>JSON.parse(match[1]));
        assert.equal(responses.length,8);assert.equal(checks.length,2);
        assert.deepEqual(checks.map(check=>check.provider).sort(),['file','sqlite']);
        for(const check of checks){assert.equal(check.passed,true);assert.equal(check.automaticMetadata,true);assert.equal(check.rendererCalls,1);assert.equal(check.unchangedParent,true);}
        fs.writeFileSync(path.join(output,'responses-'+round+'.json'),JSON.stringify(responses,null,2)+'\n');
        report.rounds.push({round,checks});
      }
      const oracle=path.join(scratch,'readback.cjs');fs.writeFileSync(oracle,`const Database=require(${JSON.stringify(path.join(runtime,'node_modules/better-sqlite3'))});const db=new Database(${JSON.stringify(database)},{readonly:true});try{console.log(JSON.stringify(db.prepare('SELECT name,version FROM entry_data ORDER BY id').all()));}finally{db.close();}`);
      const rows=JSON.parse(await run('sqlite-readback',[process.execPath,oracle]));
      assert.equal(rows.filter(row=>row.name==='renamed').length,2);assert.equal(rows.filter(row=>row.name==='first').length,2);
      report.sqliteRows=rows;report.sameDatabase=true;report.databaseSha256=sha(fs.readFileSync(database));
      const fileState=JSON.parse(fs.readFileSync(fileDatabase)),fileRows=Object.values(fileState.data.Entry);
      assert.equal(fileRows.filter(row=>row.name==='renamed').length,2);assert.equal(fileRows.filter(row=>row.name==='first').length,2);
      report.fileRows=fileRows.map(row=>({name:row.name,version:row.version}));report.fileDatabaseSha256=sha(fs.readFileSync(fileDatabase));
    }
    if(args.includes('--fix-e')){
      await run('fix-e-example',[process.execPath,'examples/fix-e-alignment/verify-local.cjs'],300000,
        {TEAQL_FIX_E_EVIDENCE_DIR:path.join(output,'fix-e-alignment')});
    }
    for(const [name,digest] of Object.entries(report.sourceHashes))if(name.startsWith('src/'))assert.equal(sha(fs.readFileSync(path.join(runtime,name))),digest,'build changed source: '+name);
    assert.deepEqual(source(),report.sourceHashes,'candidate changed during execution');report.passed=true;
  }catch(error){report.error=error.stack;process.exitCode=1;console.error(error.stack);}
  finally{
    report.removedBuildBytes=runner.safeToClean?ownedBytes(scratch):0;
    if(runner.safeToClean)fs.rmSync(scratch,{recursive:true});else report.unsafeBuildRetention=scratch;
    report.scratchRemoved=!fs.existsSync(scratch);runner.dispose();
    report.retainedFileHashes=Object.fromEntries(fs.readdirSync(output).filter(n=>fs.statSync(path.join(output,n)).isFile()).map(n=>[n,sha(fs.readFileSync(path.join(output,n)))]));
    fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({passed:report.passed,evidence:output,focused:report.focused,native:report.native,removedBuildBytes:report.removedBuildBytes,scratchRemoved:report.scratchRemoved}));
  }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
