import bot from './bot.js';
import app from './server.js'; // Import the Express App

const startString = '🚀 CompliBot is online...';
const PORT = process.env.PORT || 3000;

// 1. Start Bot
bot.launch();

// 2. Start Server
app.listen(PORT, () => {
    console.log(`${startString} (Web Dashboard on Port ${PORT})`);
});

// Graceful Stop
process.once('SIGINT', () => { bot.stop('SIGINT'); process.exit(); });
process.once('SIGTERM', () => { bot.stop('SIGTERM'); process.exit(); });