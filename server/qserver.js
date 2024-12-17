const QUser = require("./qsq");
const express = require("express");

const quser = new QUser();
const web = express();
const ws = require("express-ws")(web);

web.use(express.json());

web.post("/createAccount", (req, res) => {
    const account_data = req.body;
    quser.add(
        account_data.fullname,
        account_data.username,
        account_data.bio || "",
        async function(data){
            res.status(200).json(data);
        }
    )
})

web.post("/getMe", (req, res) => {
    quser.getUserByAuth(
        req.body.auth_token || "",
        async function(user_info){
            res.status(200).json(user_info);
        }
    )
})

web.post("/getUserById", (req, res) => {
    quser.getHandledUser(
        req.body.auth_token,
        req.body.user_id,
        async function(user_info){
            res.status(200).json(user_info)
        }
    )
})

web.post("/getUserByUsername", (req, res) => {
    quser.getHandledUserByUsername(
        req.body.auth_token,
        req.body.username,
        async function(user_info){
            res.status(200).json(user_info)
        }
    )
})

web.ws("/sendMessage", (ws, res) => {
    ws.on("message", (msg) => {
        const msg_data = JSON.parse(msg);
        quser.sendMessage(
            msg_data.auth_token,
            msg_data.to,
            msg_data.text,
            msg_data.buttons || [],
            async function(msg_info){
                ws.send(
                    JSON.stringify(msg_info)
                )
            }
        )
    })
})

web.ws("/sendMedia", (ws, res) => {
    ws.on("message", (msg) => {
        const msg_data = JSON.parse(msg);
        quser.sendMedia(
            msg_data.auth_token,
            msg_data.to,
            msg_data.text,
            msg_data.buttons || [],
            msg_data.media || "",
            async function(msg_info){
                ws.send(
                    JSON.stringify(msg_info)
                )
            }
        )
    })
})

web.ws("/getMeHandshake", (ws, res) => {
    ws.on("message", (msg) => {
        quser.getUserByAuth(
            msg.auth_token,
            async function(user_info){
                ws.send(JSON.stringify(user_info))
            }
        )
    })
})

web.listen(3001, '0.0.0.0', () => {
    console.log("Listening ...");
})