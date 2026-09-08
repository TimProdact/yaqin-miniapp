# Yaqin Mini App on GitHub Pages

GitHub Pages hosts the static Mini App frontend only. The FastAPI backend must run separately on a public HTTPS URL.

Set the backend URL in `dating_bot/miniapp/static/config.js`:

```js
window.YAQIN_API_URL = "https://api.example.com";
```

After deployment, configure the Telegram bot's `WEBAPP_URL` to the Pages URL and restart the bot.
