/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           ConnectBlog — Render Keep-Alive Service            ║
 * ║                                                              ║
 * ║  Pings the backend every 5 minutes to prevent Render free    ║
 * ║  tier from sleeping the service.                             ║
 * ║                                                              ║
 * ║  ⏰ Schedule:                                               ║
 * ║     • Active  : 6:00 AM  → 11:59 PM  (IST, UTC+5:30)       ║
 * ║     • Paused  : 12:00 AM → 5:59 AM   (IST, quiet hours)    ║
 * ║     • Interval: Every 5 minutes                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const https = require('https');
const http = require('http');

// ─────────────────────────────────────────────
//  CONFIG  (edit BACKEND_URL in production env)
// ─────────────────────────────────────────────
const PING_INTERVAL_MS = 5 * 60 * 1000;  // 5 minutes
const QUIET_HOUR_START = 0;               // 12:00 AM  (midnight)  IST
const QUIET_HOUR_END = 6;               // 06:00 AM              IST
const IST_OFFSET_HOURS = 5.5;            // UTC +5:30
const TIMEZONE_LABEL = 'IST (UTC+5:30)';

// ─────────────────────────────────────────────
//  HELPER — current hour in IST
// ─────────────────────────────────────────────
function getCurrentISTHour() {
    const nowUTC = new Date();
    // IST = UTC + 5:30
    const istMs = nowUTC.getTime() + (IST_OFFSET_HOURS * 60 * 60 * 1000);
    const istDate = new Date(istMs);
    return istDate.getUTCHours(); // 0–23
}

function getISTTimeString() {
    const nowUTC = new Date();
    const istMs = nowUTC.getTime() + (IST_OFFSET_HOURS * 60 * 60 * 1000);
    const istDate = new Date(istMs);
    return istDate.toUTCString().replace('GMT', TIMEZONE_LABEL);
}

// ─────────────────────────────────────────────
//  HELPER — is it quiet hours right now?
// ─────────────────────────────────────────────
function isQuietHours() {
    const hour = getCurrentISTHour();
    // Quiet if: hour >= 0 (midnight) AND hour < 6 (before 6 AM)
    return hour >= QUIET_HOUR_START && hour < QUIET_HOUR_END;
}

// ─────────────────────────────────────────────
//  HELPER — pretty tag for console
// ─────────────────────────────────────────────
function tag() {
    return `[KeepAlive ${getISTTimeString()}]`;
}

// ─────────────────────────────────────────────
//  PING — fires an HTTP/HTTPS GET to the health
//  endpoint of this very service on Render
// ─────────────────────────────────────────────
function pingServer(backendUrl) {
    return new Promise((resolve) => {
        const url = `${backendUrl}/api/health`;
        const isHttps = url.startsWith('https');
        const requester = isHttps ? https : http;

        const req = requester.get(url, { timeout: 15000 }, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                console.log(`${tag()} ✅ Ping OK  → ${res.statusCode}  ${url}`);
                resolve({ success: true, status: res.statusCode });
            });
        });

        req.on('timeout', () => {
            req.destroy();
            console.warn(`${tag()} ⏱️  Ping TIMEOUT (15s)  → ${url}`);
            resolve({ success: false, reason: 'timeout' });
        });

        req.on('error', (err) => {
            console.warn(`${tag()} ❌ Ping ERROR → ${err.message}`);
            resolve({ success: false, reason: err.message });
        });
    });
}

// ─────────────────────────────────────────────
//  MAIN — starts the keep-alive loop
// ─────────────────────────────────────────────
function startKeepAlive(backendUrl) {
    if (!backendUrl) {
        console.warn('[KeepAlive] ⚠️  BACKEND_URL not set — keep-alive is DISABLED.');
        console.warn('[KeepAlive]    Set BACKEND_URL env var to your Render service URL.');
        console.warn('[KeepAlive]    Example: https://connectblog-backend.onrender.com');
        return;
    }

    console.log('╔══════════════════════════════════════════════╗');
    console.log('║        ConnectBlog Keep-Alive  STARTED       ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Target : ${backendUrl.padEnd(35)}║`);
    console.log('║  Interval : Every 5 minutes                  ║');
    console.log('║  Active   : 6 AM – 12 AM  (IST)             ║');
    console.log('║  Quiet    : 12 AM – 6 AM  (IST) — no pings  ║');
    console.log('╚══════════════════════════════════════════════╝');

    // Run the pinging loop every 5 minutes
    setInterval(async () => {
        if (isQuietHours()) {
            const hour = getCurrentISTHour();
            const minsUntilActive = (QUIET_HOUR_END - hour) * 60;
            console.log(
                `${tag()} 🌙 Quiet hours (12 AM–6 AM IST) — skipping ping.` +
                ` Resumes in ~${minsUntilActive} min.`
            );
            return;
        }

        await pingServer(backendUrl);
    }, PING_INTERVAL_MS);

    // Fire one initial ping immediately at startup (only if NOT quiet hours)
    if (!isQuietHours()) {
        setTimeout(() => pingServer(backendUrl), 5000); // small delay so server is ready
    } else {
        console.log(`${tag()} 🌙 Server started during quiet hours — first ping deferred to 6 AM IST.`);
    }
}

module.exports = { startKeepAlive };
