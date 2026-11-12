'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const assert=require('node:assert/strict'),test=require('node:test');
const {sourceFiles,selection}=require('./natural-source-inventory.cjs');
function fixture(work){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'teaql-ts-source-inventory-'));
  try{
    cp.execFileSync('git',['init','--quiet',directory]);fs.mkdirSync(path.join(directory,'src'));fs.mkdirSync(path.join(directory,'dist'));
    fs.writeFileSync(path.join(directory,'src/index.ts'),'export const value = 1;\n');
    fs.writeFileSync(path.join(directory,'dist/chunk-old.js'),'old build\n');
    cp.execFileSync('git',['add','src/index.ts','dist/chunk-old.js'],{cwd:directory});return work(directory);
  }finally{fs.rmSync(directory,{recursive:true});}
}
test('rebuilt dist chunks are excluded before and after replacement',()=>fixture(directory=>{
  assert.deepEqual(sourceFiles(directory),['src/index.ts']);fs.unlinkSync(path.join(directory,'dist/chunk-old.js'));
  fs.writeFileSync(path.join(directory,'dist/chunk-new.js'),'new build\n');
  assert.deepEqual(sourceFiles(directory),['src/index.ts']);assert.equal(selection.missingTrackedSourceFilesAreErrors,true);
}));
test('missing tracked source is rejected rather than silently omitted',()=>fixture(directory=>{
  fs.unlinkSync(path.join(directory,'src/index.ts'));assert.throws(()=>sourceFiles(directory),/ENOENT/);
}));
test('source symlinks and symlink ancestors are rejected',()=>fixture(directory=>{
  fs.writeFileSync(path.join(directory,'ordinary.ts'),'export const safe = true;\n');
  fs.unlinkSync(path.join(directory,'src/index.ts'));fs.symlinkSync('../ordinary.ts',path.join(directory,'src/index.ts'));
  assert.throws(()=>sourceFiles(directory),/non-file source/);
  fs.unlinkSync(path.join(directory,'src/index.ts'));fs.writeFileSync(path.join(directory,'src/index.ts'),'export const value = 1;\n');
  fs.renameSync(path.join(directory,'src'),path.join(directory,'real-src'));fs.symlinkSync('real-src',path.join(directory,'src'),'dir');
  assert.throws(()=>sourceFiles(directory),/symlink ancestor/);
}));
