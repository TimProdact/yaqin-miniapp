// Public HTTPS URL of the FastAPI backend, e.g. "https://api.example.com".
window.YAQIN_API_URL = "";
// Bot username without @ — deep links / QR событий.
window.YAQIN_BOT_USERNAME = "yaqin_bot";
// Optional Direct Link short name from BotFather (t.me/bot/<short>?startapp=…).
// Если пусто — используем Main Mini App: t.me/bot?startapp=…
window.YAQIN_MINIAPP_SHORT_NAME = "";
// Demo when API URL пустой (GitHub Pages). Задайте YAQIN_API_URL — демо выключится.
// Чтобы форсировать демо при живом API: window.YAQIN_DEMO_MODE = true;
window.YAQIN_DEMO_MODE = !String(window.YAQIN_API_URL || '').trim();
