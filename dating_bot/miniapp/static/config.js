// Public HTTPS URL of the FastAPI backend, e.g. "https://api.example.com".
window.YAQIN_API_URL = "";
// Bot username without @, used to open the verification flow from the Mini App.
window.YAQIN_BOT_USERNAME = "";
// Demo when API URL пустой (GitHub Pages). Задайте YAQIN_API_URL — демо выключится.
// Чтобы форсировать демо при живом API: window.YAQIN_DEMO_MODE = true;
window.YAQIN_DEMO_MODE = !String(window.YAQIN_API_URL || '').trim();
