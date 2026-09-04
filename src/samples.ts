export const BEFORE=`HTTP/2 200
Content-Type: text/html; charset=utf-8
Server: demo-server/0.0
X-Powered-By: DemoFramework
Strict-Transport-Security: max-age=0
X-Content-Type-Options: sniff
Content-Security-Policy-Report-Only: default-src 'self'
X-Frame-Options: ALLOW-FROM https://example.invalid
Referrer-Policy: unsafe-url
Set-Cookie: demo_session=SYNTHETIC_NOT_A_SESSION; Path=/
`;
export const AFTER=`HTTP/2 200
Content-Type: text/html; charset=utf-8
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Set-Cookie: demo_session=SYNTHETIC_NOT_A_SESSION; Path=/
`;
