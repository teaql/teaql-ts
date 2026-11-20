'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const output=process.env.TEAQL_NATURAL_MESSAGES_EVIDENCE_DIR||path.join(fs.mkdtempSync(path.join(os.tmpdir(),'teaql-ts-natural-evidence-')),'run');
process.argv.push('--example-only','--output',output);
require('../../scripts/verify-natural-messages.cjs');
