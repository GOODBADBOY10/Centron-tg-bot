// const { handleMessage, sendMessage } = require("./lib/telegram");
// const { errorHandler } = require("./lib/helper");

// async function handler(req, method) {
//     try {
//         if ( method === "GET" ) {
//             return "Hello Get"
//         }

//         const { body } = req;
//         if ( body && body.message ) {
//             const messageObj = body.message;
//             await handleMessage(messageObj);
//             return "Success";
//         }

//         return "Unknown request";
//     } catch (error) {
//         errorHandler(error, "mainIndexHandler");
//     }
// }


// module.exports = { handler };


import webhookCallback from './lib/bot.js'

async function handler(req, method) {
  if (method === 'GET') return "Hello Get";

  return new Promise((resolve, reject) => {
    const fakeRes = {
      end: () => resolve("Success"),
      setHeader: () => {},
      statusCode: 200,
    };

    try {
      webhookCallback(req, fakeRes);
    } catch (err) {
      reject("Error in webhook");
    }
  });
}

export default  { handler };