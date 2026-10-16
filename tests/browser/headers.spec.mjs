import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
async function report(page){
 const pending=page.waitForEvent('download');await page.locator('#export').click();
 const download=await pending;return readFile(await download.path(),'utf8');
}
test('samples and transport changes update all six checks under a subdirectory',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');
 await expect(page.locator('#review')).toHaveText('5');
 await expect(page.locator('#missing')).toHaveText('1');
 await expect(page.locator('.check')).toHaveCount(6);
 await page.locator('#after').click();
 await expect(page.locator('#pass')).toHaveText('6');
 expect(JSON.parse(await report(page)).checks.every(c=>c.status==='pass')).toBe(true);
 await page.locator('#scheme').selectOption('http');
 await expect(page.locator('#export')).toBeDisabled();
 await expect(page.locator('#pass')).toHaveText('—');
 await page.locator('#analyze').click();
 await expect(page.locator('#pass')).toHaveText('5');
 await expect(page.locator('#review')).toHaveText('1');
 expect(JSON.parse(await report(page)).checks.find(c=>c.id==='hsts').status).toBe('review');
 expect(errors).toEqual([]);
});
test('raw values stay private while response-context warnings survive export',async({page})=>{
 const requests=[];page.on('request',r=>requests.push({url:r.url(),method:r.method(),body:r.postData()}));
 await page.goto('./');
 await page.locator('#input').fill('HTTP/2 302\nContent-Type: application/json\nSet-Cookie: PRIVATE_COOKIE_SENTINEL\nX-PRIVATE-NAME: <img src=x onerror=alert(1)>\nLocation: https://private.invalid');
 await page.locator('#analyze').click();
 await expect(page.locator('#result-note')).toContainText('HTML dışı');
 await expect(page.locator('#result-note')).toContainText('2xx');
 await expect(page.locator('#checks')).not.toContainText('PRIVATE_COOKIE_SENTINEL');
 await expect(page.locator('#checks img')).toHaveCount(0);
 const raw=await report(page), data=JSON.parse(raw);
 expect(data.notes).toHaveLength(3);
 for(const value of ['PRIVATE_COOKIE_SENTINEL','X-PRIVATE-NAME','private.invalid','<img'])expect(raw).not.toContain(value);
 expect(requests.every(r=>r.method==='GET'&&r.body===null&&r.url.startsWith('http://127.0.0.1:4173/dist/'))).toBe(true);
 expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
 await page.locator('#clear').click();
 await expect(page.locator('#input')).toHaveValue('');
 await expect(page.locator('#export')).toBeDisabled();
 await expect(page.locator('.check')).toHaveCount(0);
});
test('malformed response invalidates results and Unicode whitespace cannot pass nosniff',async({page})=>{
 await page.goto('./');
 await page.locator('#input').fill('X-Test: value\n\n<body>private</body>');
 await page.locator('#analyze').click();
 await expect(page.locator('#status')).toContainText('Birden fazla yanıt veya gövde');
 await expect(page.locator('#export')).toBeDisabled();
 await expect(page.locator('.check')).toHaveCount(0);
 await page.locator('#input').fill('X-Content-Type-Options: \u00a0nosniff\u00a0');
 await page.locator('#analyze').click();
 expect(JSON.parse(await report(page)).checks.find(c=>c.id==='nosniff').status).toBe('review');
 await page.locator('#after').click();
 await expect(page.locator('#pass')).toHaveText('6');
});
