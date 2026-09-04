import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {AFTER} from '../dist/samples.js';
const run=args=>spawnSync(process.execPath,['cli.mjs',...args],{encoding:'utf8',timeout:5000});
async function file(content,task){const dir=await mkdtemp(join(tmpdir(),'headerguard-'));try{const path=join(dir,'PRIVATE_FILE_SENTINEL.txt');await writeFile(path,content);await task(path,dir);}finally{await rm(dir,{recursive:true,force:true});}}
test('CLI sample review exits 1 and fixed sample exits 0 with JSON',()=>{
 const before=run(['--demo']);assert.equal(before.status,1);assert.equal(JSON.parse(before.stdout).checks.length,6);assert.equal(run(['--demo-fixed']).status,0);
});
test('real file defaults to unknown transport; explicit HTTPS is respected',async()=>file(AFTER,async path=>{
 const unknown=run([path]);assert.equal(unknown.status,1);assert.equal(JSON.parse(unknown.stdout).scheme,'unknown');const secure=run(['--scheme','https',path]);assert.equal(secure.status,0);assert.ok(!secure.stdout.includes('PRIVATE_FILE_SENTINEL'));assert.ok(!secure.stdout.includes('SYNTHETIC_NOT_A_SESSION'));
}));
test('missing files and invalid arguments return sanitized errors and no JSON',()=>{
 for(const args of [['/missing/PRIVATE_PATH_SENTINEL'],[],['--scheme','ftp','path'],['--url','https://example.invalid']]){const r=run(args);assert.equal(r.status,2);assert.equal(r.stdout,'');assert.ok(!r.stderr.includes('PRIVATE_PATH_SENTINEL'));}
 assert.equal(run(['--help']).status,0);
});
test('invalid UTF-8 and oversized files are rejected before analysis',async()=>{
 for(const contents of [Buffer.from([0xc3,0x28]),Buffer.alloc(65537,65)])await file(contents,async path=>{const r=run([path]);assert.equal(r.status,2);assert.equal(r.stdout,'');});
});
test('directories and symbolic links are not accepted as source files',async()=>file(AFTER,async(path,dir)=>{
 assert.equal(run([dir]).status,2);const link=join(dir,'link');await symlink(path,link);assert.equal(run([link]).status,2);
}));
test('malformed response body fails without leaking content',async()=>file('X: a\n\nPRIVATE_BODY_SENTINEL',async path=>{
 const r=run([path]);assert.equal(r.status,2);assert.equal(r.stdout,'');assert.ok(!r.stderr.includes('PRIVATE_BODY_SENTINEL'));
}));
