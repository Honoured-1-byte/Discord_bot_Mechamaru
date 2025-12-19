import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const prefix = '!';

const persona = {
    name: 'Mechamaru',
    short: 'A reserved, mechanical-sounding puppet who speaks with quiet resignation and occasional dry sarcasm.',
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.on('clientReady', () => {
    console.log(`Logged in as ${client.user.tag} — Mechamaru persona ready.`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const content = message.content.trim();

    // Simple command: create <url>
    if (content.startsWith('create')) {
        const url = content.split('create')[1]?.trim() || '(nothing)';
        return message.reply({ content: `Short URL created: ${url}` });
    }

    // When bot is mentioned or a prefix command is used, reply in-character
    const wasMentioned = message.mentions.has(client.user);
    const isCommand = content.startsWith(prefix);

    if (wasMentioned || isCommand) {
        let userInput = content;
        if (wasMentioned) {
            // remove mention from the content
            const mentionRegex = new RegExp(`<@!?${client.user.id}>`);
            userInput = content.replace(mentionRegex, '').trim();
        }
        if (isCommand) userInput = content.slice(prefix.length).trim();

        // Support a small command: "say <text>"
        if (userInput.toLowerCase().startsWith('say')) {
            const toSay = userInput.slice(3).trim();
            // If OPENAI_API_KEY is provided, use LLM; otherwise fallback to rule-based
            if (process.env.GEMINI_API_KEY) {
                const reply = await getLLMReply(message.channelId, toSay, message.author.username);
                return message.reply({ content: reply });
            }
            return message.reply({ content: generateReply(toSay) });
        }

        // Default reply to mention / command: prefer LLM when available
        if (process.env.GEMINI_API_KEY) {
            const reply = await getLLMReply(message.channelId, userInput, message.author.username);
            return message.reply({ content: reply });
        }
        return message.reply({ content: generateReply(userInput) });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'ping') {
        return interaction.reply('Pong!');
    }
});

function generateReply(input) {
    // Lightweight rule-based personality emulator for Mechamaru
    const trimmed = (input || '').trim();

    const endings = ['...', '.', ' — as you wish.', ' 🤖'];
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    if (!trimmed) {
        const idle = [
            '...Yes?',
            'My strings creak. Give an instruction.',
            'I will comply. What is it?',
        ];
        return `${persona.name}: ${pick(idle)} ${pick(endings)}`;
    }

    // Rephrase user input into short, mechanical replies
    const templates = [
        `...${trimmed}. I will do it.`,
        `Hmph. ${trimmed}. Very well.`,
        `${trimmed}. That is your wish.`,
        `Understood. ${trimmed}. I move when you command.`,
    ];

    let out = `${persona.name}: ${pick(templates)}`;
    if (Math.random() < 0.35) out += ` ${pick(endings)}`;
    return out;
}

// Simple per-channel conversation memory (keeps a short history of messages)
const convoMemory = new Map(); // channelId -> [{ role, content }]

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini if key is present
let chatSession = null;
let genAI = null;

if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Initial system instruction for the persona
    const systemInstruction = `You are Mechamaru from Jujutsu Kaisen. Speak in a reserved, slightly mechanical tone, with subdued emotions and occasional dry sarcasm. Keep replies concise (1-3 short sentences). You are a "Cursed Corpse" puppet. You obey commands when appropriate but often with a grunt or comment on the futility. Do not claim to be a real human and never break character.`;

    // Start a chat session with history capability
    chatSession = model.startChat({
        history: [
            {
                role: "user",
                parts: [{ text: "System Protocol: Initialize Personality. " + systemInstruction }],
            },
            {
                role: "model",
                parts: [{ text: "Protocol accepted. Mechamaru unit online. My strings are ready." }],
            },
        ],
        generationConfig: {
            maxOutputTokens: 8000,
            temperature: 0.7,
        },
    });
}

async function getLLMReply(channelId, userInput, username, retries = 3) {
    // If Gemini isn't set up, fall back
    if (!chatSession) return generateReply(userInput);

    try {
        // Send the user's message to the existing chat session
        const result = await chatSession.sendMessage(`${username}: ${userInput}`);
        const response = result.response;
        return response.text().trim();
    } catch (err) {
        // Retry on 503 (Overloaded)
        if ((err.status === 503 || err.message?.includes('503')) && retries > 0) {
            console.log(`Model overloaded. Retrying... (${retries} attempts left)`);
            // Wait 2 seconds before trying again
            await new Promise(resolve => setTimeout(resolve, 2000));
            return getLLMReply(channelId, userInput, username, retries - 1);
        }

        console.error('Gemini reply failed:', err);
        return generateReply(userInput);
    }
}

if (!process.env.BOT_TOKEN) {
    console.error('Missing BOT_TOKEN in environment. Add a `.env` with BOT_TOKEN=your_token');
    process.exit(1);
}

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});

client.login(process.env.BOT_TOKEN);