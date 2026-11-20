'use strict';
const path=require('node:path'),repo=path.resolve(__dirname,'../../..');
module.exports={rootDir:repo,roots:[__dirname],testEnvironment:'node',testMatch:['**/showcase/verify.test.ts'],moduleNameMapper:{'^teaql-ts$':path.join(repo,'src/index.ts'),'^teaql-ts/(.*)$':path.join(repo,'src/$1'),'^context-generated/(.*)$':path.resolve(__dirname,'../typescript-node-lib-core/src/$1')},transform:{'^.+\\.tsx?$':['ts-jest',{tsconfig:path.join(__dirname,'tsconfig.showcase.json')}]}};
