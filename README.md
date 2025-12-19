# Mechamaru Discord Bot

This project runs a small Discord bot that replies in a Mechamaru-like persona.

Setup

- Copy `.env.example` to `.env` and set your bot token:

```
BOT_TOKEN=your_actual_bot_token_here
```

- Make sure `Message Content Intent` is enabled for your bot in the Discord Developer Portal if you want the bot to read message text.

- Install dependencies and run:

```bash
npm install
npm start
```

Usage

- Mention the bot or use commands prefixed with `!`.
- Example: `@Mechamaru say Hello` or `!say Hello` — the bot will reply in-character.

Notes

- The bot uses a lightweight, rule-based responder to emulate personality by default. If you provide an `OPENAI_API_KEY` in `.env`, the bot will call OpenAI's Chat API to produce richer, persona-driven replies (Mechamaru).
- Do not commit your real `.env` containing the token or API key.

LLM integration

- To enable the OpenAI LLM integration, set `OPENAI_API_KEY` in your `.env` (see `.env.example`).
- Once set, mentioning the bot or using `!say <text>` will send that prompt to the model with a Mechamaru system persona and reply with the model's output.

Privacy & cost

- Messages are sent to OpenAI when the LLM integration is enabled; this may incur API usage costs. Do not share sensitive information through the bot.
