import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze,parseHeaders,exportReport,LIMITS} from '../dist/engine.js';
import {BEFORE,AFTER} from '../dist/samples.js';
const run=(raw,scheme='https')=>analyze(raw,scheme);
const state=(raw,id,scheme='https')=>run(raw,scheme).checks.find(c=>c.id===id).status;
test('before and after samples expose real differences across six checks',()=>{
 const a=run(BEFORE),b=run(AFTER);assert.equal(a.checks.filter(c=>c.status==='review').length,5);assert.equal(a.checks.filter(c=>c.status==='missing').length,1);assert.ok(b.checks.every(c=>c.status==='pass'));
});
test('parser supports HTTP 1.1, 2 and 3, CRLF and case-insensitive header names',()=>{
 for(const version of ['1.0','1.1','2','2.0','3']){
 const r=parseHeaders(`HTTP/${version} 200 OK\r\nx-CONTENT-type-options: nosniff\r\n\r\n`);assert.equal(r.statusCode,200);assert.deepEqual(r.headers.get('x-content-type-options'),['nosniff']);}
});
test('raw field lines preserve values with colons and repeated cookie lines',()=>{
 const p=parseHeaders('Location: https://example.invalid/a:b\nSet-Cookie: a=demo\nSet-Cookie: b=demo\n');assert.equal(p.statusCode,null);assert.equal(p.headerCount,3);assert.equal(p.headers.get('location')[0],'https://example.invalid/a:b');assert.equal(p.headers.get('set-cookie').length,2);
});
test('request lines, folded headers, invalid names and control bytes fail closed',()=>{
 for(const s of ['GET / HTTP/1.1','Bad Name: test',' Name: test','X-Test : test','X-Test: abc\0def','X-Test: abc\rX: def','X-Test: a\n\tcontinued','HTTP/2 200'])assert.throws(()=>run(s));
});
test('multiple response blocks and response bodies are never silently combined',()=>{
 for(const s of ['HTTP/2 301\nLocation: /\n\nHTTP/2 200\nX: a','X: a\n\n<body>hello</body>','HTTP/2 100 Continue\nHTTP/2 200\nX: a'])assert.throws(()=>run(s));
});
test('byte, line and header limits use inclusive boundaries',()=>{
 const line='X: '+'a'.repeat(LIMITS.lineLength-3);parseHeaders(line);assert.throws(()=>parseHeaders(line+'a'));
 parseHeaders(Array(200).fill('X: a').join('\n'));assert.throws(()=>parseHeaders(Array(201).fill('X: a').join('\n')));
 const max=Array(8).fill('X: '+'a'.repeat(8188)).join('\n')+'\n';assert.equal(new TextEncoder().encode(max).length,LIMITS.bytes);parseHeaders(max);assert.throws(()=>parseHeaders(max+'\n'));
});
test('UTF-8 bytes are measured; empty input and invalid scheme are rejected',()=>{
 assert.throws(()=>run('X: '+'ş'.repeat(32768)),/64 KiB/);assert.throws(()=>run('   '));assert.throws(()=>run('X: a','ftp'));
});
test('HSTS missing, zero and positive max-age are distinct',()=>{
 assert.equal(state('X: a','hsts'),'missing');assert.equal(state('Strict-Transport-Security: max-age=0','hsts'),'review');assert.equal(state('Strict-Transport-Security: max-age=1','hsts'),'pass');assert.equal(state('Strict-Transport-Security: max-age="31536000"; includeSubDomains','hsts'),'pass');
});
test('HSTS on HTTP or unknown transport never passes',()=>{
 for(const s of ['http','unknown'])assert.equal(state('Strict-Transport-Security: max-age=31536000','hsts',s),'review');
});
test('HSTS duplicates, invalid values and unsupported directives need review',()=>{
 for(const v of ['max-age=-1','max-age=1.5','max-age=abc','max-age=999999999999999999','includeSubDomains','max-age=1; MAX-AGE=2','max-age=1;includeSubDomains=true','max-age=1;unknown=yes',''])assert.equal(state('Strict-Transport-Security: '+v,'hsts'),'review');
 assert.equal(state('Strict-Transport-Security: max-age=1\nStrict-Transport-Security: max-age=2','hsts'),'review');
});
test('nosniff accepts casing but not duplicate or comma-merged policies',()=>{
 assert.equal(state('X-Content-Type-Options: NoSnIfF','nosniff'),'pass');for(const v of ['sniff','','nosniff, nosniff'])assert.equal(state('X-Content-Type-Options: '+v,'nosniff'),'review');assert.equal(state('X-Content-Type-Options: nosniff\nX-Content-Type-Options: nosniff','nosniff'),'review');
});
test('report-only policy is not treated as enforcing CSP or framing',()=>{
 const text="Content-Security-Policy-Report-Only: default-src 'self'; frame-ancestors 'none'";assert.equal(state(text,'csp'),'missing');assert.equal(state(text,'framing'),'missing');
});
test('CSP uses script-src before default-src and examines script-src-elem',()=>{
 const base="Content-Security-Policy: default-src *; script-src 'self'; object-src 'none'; base-uri 'self'";assert.equal(state(base,'csp'),'pass');assert.equal(state(base+"; script-src-elem *",'csp'),'review');
 assert.equal(state("Content-Security-Policy: default-src 'self'; script-src *; object-src 'none'; base-uri 'self'",'csp'),'review');
});
test('CSP partial, unsafe, nonce and duplicate policies do not claim full validation',()=>{
 for(const value of ["default-src 'self'","script-src 'unsafe-inline'","script-src 'nonce-SYNTHETIC'","default-src 'self'; default-src 'none'","default-src 'self', default-src 'none'",''])assert.equal(state('Content-Security-Policy: '+value,'csp'),'review');
 assert.equal(state("Content-Security-Policy: default-src 'self'\nContent-Security-Policy: default-src 'none'",'csp'),'review');
});
test('default-src does not substitute for frame-ancestors',()=>assert.equal(state("Content-Security-Policy: default-src 'none'",'framing'),'missing'));
test('enforced frame-ancestors is considered before X-Frame-Options',()=>{
 assert.equal(state("Content-Security-Policy: frame-ancestors 'self'\nX-Frame-Options: DENY",'framing'),'pass');
 assert.equal(state('Content-Security-Policy: frame-ancestors *\nX-Frame-Options: DENY','framing'),'review');
});
test('framing handles valid XFO fallback and flags obsolete or ambiguous values',()=>{
 for(const value of ['DENY','sameorigin'])assert.equal(state('X-Frame-Options: '+value,'framing'),'pass');
 for(const value of ['ALLOW-FROM https://example.invalid','DENY, SAMEORIGIN',''])assert.equal(state('X-Frame-Options: '+value,'framing'),'review');
 assert.equal(state('X-Frame-Options: DENY\nX-Frame-Options: DENY','framing'),'review');
});
test('Referrer-Policy uses the last recognized comma-separated value',()=>{
 assert.equal(state('Referrer-Policy: unsafe-url, no-referrer','referrer'),'pass');assert.equal(state('Referrer-Policy: no-referrer, unsafe-url','referrer'),'review');assert.equal(state('Referrer-Policy: no-referrer, unknown-token','referrer'),'pass');assert.equal(state('Referrer-Policy: unknown-token','referrer'),'review');
});
test('Referrer-Policy repeated fields preserve order and restricted policies pass',()=>{
 assert.equal(state('Referrer-Policy: unsafe-url\nReferrer-Policy: same-origin','referrer'),'pass');
 for(const value of ['no-referrer','same-origin','strict-origin','strict-origin-when-cross-origin'])assert.equal(state('Referrer-Policy: '+value,'referrer'),'pass');
});
test('technology disclosure is a review item, not a vulnerability verdict',()=>{
 assert.equal(state('Server: DemoProduct','disclosure'),'review');assert.equal(state('X-Powered-By: DemoFramework','disclosure'),'review');assert.equal(state('X-Test: yes','disclosure'),'pass');
});
test('non-HTML and non-2xx responses receive explicit context notes',()=>{
 const r=run('HTTP/2 302\nContent-Type: application/json\nLocation: https://example.invalid');assert.equal(r.notes.length,3);assert.ok(!JSON.stringify(r).includes('example.invalid'));
});
test('analysis and JSON never contain raw cookies, custom names, nonce or URLs',()=>{
 const r=run('HTTP/2 200 PRIVATE_STATUS_SENTINEL\nSet-Cookie: AUTH_SESSION_SECRET_SENTINEL\nX-PRIVATE_NAME_SENTINEL: PRIVATE_VALUE_SENTINEL\nLocation: https://PRIVATE_HOST_SENTINEL.invalid\nContent-Security-Policy: script-src \'nonce-PRIVATE_NONCE_SENTINEL\'');
 for(const output of [JSON.stringify(r),exportReport(r)])for(const secret of ['PRIVATE_STATUS_SENTINEL','AUTH_SESSION_SECRET_SENTINEL','PRIVATE_NAME_SENTINEL','PRIVATE_VALUE_SENTINEL','PRIVATE_HOST_SENTINEL','PRIVATE_NONCE_SENTINEL'])assert.ok(!output.includes(secret));
});
test('report field allowlist excludes unrelated raw data added to result objects',()=>{
 const r=run(AFTER);r.headers='RAW_HEADER_SENTINEL';r.checks[0].value='RAW_VALUE_SENTINEL';const out=exportReport(r);assert.ok(!out.includes('RAW_HEADER_SENTINEL'));assert.ok(!out.includes('RAW_VALUE_SENTINEL'));assert.equal(JSON.parse(out).checks.length,6);
});
