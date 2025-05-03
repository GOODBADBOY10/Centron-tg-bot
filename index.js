import express from 'express'
const PORT = process.env.PORT || 4040;
import handler from './controllers/index.js'
// const { handler } = require("./controllers")
import bot from './controllers/lib/bot.js'
// const { bot } = require("./controllers/lib/bot.ts");
import dotenv from 'dotenv'
// require('dotenv').config();

const app = express();
app.use(express.json());

app.post("/", async (req, res) => {
    // console.log(req.body);
    const result = await handler(req, 'POST');
    res.send(result);
    // res.send(await handler(req, "POST"));
    // res.send("Hello Post");
})


app.get("/", async (req, res) => {
    const result = await handler(req, 'GET');
    res.send(result);
    // res.send("Hello Get");
});

app.listen(PORT, async function (err) {
    if (err) console.log(err);
    console.log("Server is running on PORT", PORT);
    // Set webhook URL once here (customize for production)
    const webhookUrl = 'https://efa9-102-89-83-156.ngrok-free.app/';

    if (bot && bot.telegram) {
        await bot.telegram.setWebhook(webhookUrl);
        // console.log('Webhook set to:', webhookUrl);
    } else {
        console.error('Bot or bot.telegram is undefined');
    }
});