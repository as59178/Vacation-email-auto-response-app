// App that you would need to build:

// You have to write a Node.js based app that is able to respond to emails sent to your Gmail mailbox while you’re out on a vacation.



// What should the app do?

// The app should check for new emails in a given Gmail ID
// * You need to implement the “Login with google” API for this

// The app should send replies to Emails that have no prior replies
// * The app should identify and isolate the email threads in which no prior email has been sent by you.

// * This means that the app should only reply to first time email threads sent by others to your mailbox.

// * The email that you send as a reply can have any content you’d like, it doesn’t matter.

// The app should add a Label to the email and move the email to the label
// * After sending the reply, the email should be tagged with a label in Gmail. Feel free to name the label anything.

// * If the label is not created already, you’ll need to create it. Use Google’s APIs to accomplish this

// The app should repeat this sequence of steps 1-3 in random intervals of 45 to 120 seconds


// What things should be tested properly?

// Use your own Gmail to write and test the app. You can send an email to yourself.
// The app should make sure that no double replies are sent to any email at any point. Every email that qualifies the criterion should be replied back with one and only one auto reply.


// Technical guidelines for building the app:

// Use Google APIs to implement the app. Go though the API documentation linked below and decide the best approach for each of the modules that you need to build.
// * https://developers.google.com/gmail/api/guides

// * Please do not use IMAP based extensions like mail-notifier to build this. Use Google’s APIs instead.



// Build this app on Node.js. Any other submissions will not be evaluated
// Use modern JavaScript standards while coding.
// * For Example: Try to use ‘let’ and ‘const’ and avoid ‘var’

// Use Promises, async/await wherever possible to avoid callback hell and unreadable code
// Write clean code, add comments wherever needed. Remember, your reporting manager would be reading and evaluating your code
// Write a detailed spec about the libraries and technologies used
// Lastly, write a note on areas where your code can be improved

const { google } = require("googleapis");
const { authenticate } = require("@google-cloud/local-auth");
const express = require("express");
const app = express();
const port = 1570;
const path = require("path");
const fs = require("fs").promises;

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://mail.google.com/",
];

app.get("/", async (req, res) => {
  //only for authentication
  const credentials = await fs.readFile("credentials.json");
  const auth = await authenticate({
    keyfilePath: path.join(__dirname, "credentials.json"),
    scopes: SCOPES,
  });
  console.log("This is AUTH = ", auth);
  const gmail = google.gmail({ version: "v1", auth });
  const response = await gmail.users.labels.list({
    userId: "me",
  });

  //it is main function where everything is happening

  async function main() {
    const labelId = await createLabel(auth);
    console.log(`Created label with ID ${labelId}`);

    setInterval(async () => {
      const messages = await getUnrepliedMessages(auth);
      console.log(`We Have ${messages.length} Unreplied Messages`);

      for (const message of messages) {
        await addLabel(auth, message, labelId);
        console.log(`Lable added to ${message.id}`);

        await sendReply(auth, message);
        console.log(`Reply is sent to ${message.id}`);
      }
    }, Math.floor(Math.random() * (120 - 45 + 1) + 45) * 1000);
    //0.5 * 76 + 45 = 83 ms * 1000 = 83 seconds
  }


  async function getUnrepliedMessages(auth) {
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "-in:chats -from:me -has:userlabels",
    });
    return res.data.messages || [];
  }

  const LABEL_NAME = "AmanSingh";

  async function createLabel(auth) {
    const gmail = google.gmail({ version: "v1", auth });

    try {
      const res = await gmail.users.labels.create({
        userId: "me",
        requestBody: {
          name: LABEL_NAME,
          labelListVisibility: "labelShow",
          messageListVisibility: "show",
        },
      });
      return res.data.id;
    } catch (err) {
      if (err.code === 409) {
        const res = await gmail.users.labels.list({
          userId: "me",
        });
        const label = res.data.labels.find(
          (label) => label.name === LABEL_NAME
        );
        return label.id;
      } else {
        throw err;
      }
    }
  }

  async function addLabel(auth, message, labelId) {
    const gmail = google.gmail({ version: "v1", auth });
    await gmail.users.messages.modify({
      userId: "me",
      id: message.id,
      requestBody: {
        addLabelIds: [labelId],
        removeLabelIds: ["INBOX"],
      },
    });
  }

  async function sendReply(auth, message) {
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "metadata",
      metadataHeaders: ["Subject", "From"],
    });
    const subject = res.data.payload.headers.find(
      (header) => header.name === "Subject"
    ).value;
    const from = res.data.payload.headers.find(
      (header) => header.name === "From"
    ).value;

    const replyTo = from.match(/<(.*)>/)[1];
    //<ambanisona99@gmailcom> as first and ambanisona99@gmailcom as second
    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
    const replyBody = `Hello,

  Thank you for reaching out. I am currently out of the office and on vacation. During this time, 
  I will have limited access to email and may not be able to respond promptly. 
  If your matter is urgent, please contact ambanisona99@gmail.com  who will be happy to assist you.
  
  Thank you for your understanding and I look forward to reconnecting with you upon my return.
  
  Best regards,
  Aman Singh`;
    const rawMessage = [
      `From: me`,
      `To: ${replyTo}`,
      `Subject: ${replySubject}`,
      `In-Reply-To: ${message.id}`,
      `References: ${message.id}`,
      "",
      replyBody,
    ].join("\n");

    const encodedMessage = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });
  }


  main().catch(console.error);

  res.send("Congratulation for subscribing");
});

app.listen(port, () => {
  console.log(`We are listening the ${port}`);
});
