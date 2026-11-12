'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');

// dist is rebuilt from src by this gate. A repository-wide example run may
// already have replaced its content-addressed chunks. Missing SOURCE is still
// an error; do not turn this into a general "skip missing files" policy.
const selection=Object.freeze({excludedBuildOutputPrefixes:Object.freeze(['dist/']),missingTrackedSourceFilesAreErrors:true});
function sourceFiles(repo){
  assert.equal(fs.realpathSync(repo),repo,'source root cannot be a symlink alias');
  const names=cp.execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:repo}).toString().split('\0').filter(Boolean);
  return [...new Set(names)].filter(name=>!selection.excludedBuildOutputPrefixes.some(prefix=>name.startsWith(prefix))).sort().map(name=>{
    assert(!path.isAbsolute(name)&&!name.split('/').includes('..'));
    const file=path.join(repo,name),stat=fs.lstatSync(file);
    assert(stat.isFile()&&!stat.isSymbolicLink(),'non-file source input: '+name);
    assert.equal(fs.realpathSync(file),file,'source input cannot use a symlink ancestor');return name;
  });
}
module.exports={sourceFiles,selection};
