# Yaqin Mini App on GitHub Pages

GitHub Pages hosts the static Mini App frontend only. The FastAPI backend must run separately on a public HTTPS URL.

Configure the frontend in `dating_bot/miniapp/static/config.js`:

```js
window.YAQIN_DEMO_MODE = false;              // true keeps the sample data
window.YAQIN_API_URL = "https://api.example.com";
window.YAQIN_BOT_USERNAME = "your_bot";      // opens /start verify from the Mini App
```

With `YAQIN_DEMO_MODE = true` the app runs on built-in sample profiles and never calls the backend, which is what the Pages preview uses. Setting a real `YAQIN_API_URL` switches every screen to live data from the bot's database.

After deployment, configure the Telegram bot's `WEBAPP_URL` to the Pages URL and restart the bot.

## Frontend structure

`dating_bot/miniapp/static/js/` holds ES modules loaded by `index.html`:

| File | Purpose |
|---|---|
| `main.js` | entry point: Telegram init, screen registry, click handling |
| `router.js` | routes, navigation history, render tokens for async screens |
| `api.js` | HTTP client, sends `X-Telegram-Init-Data` |
| `repository.js` | data source that swaps between the API and demo data |
| `data.js`, `state.js` | sample content and localStorage state |
| `screens/` | one module per section: discover, groups, chats, me, verify |
