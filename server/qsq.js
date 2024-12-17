const { Database } = require("sqlite3");
const Qtils = require("./qtils");

class QUser {
    constructor() {
        this.users = new Database("./users.db", (error) => { if (error) { console.log(error);process.exit(0); } });
        this.qtils = new Qtils();
        this.setup();
    }

    setup() {
        this.users.exec("CREATE TABLE IF NOT EXISTS users ( user_id INTEGER PRIMARY KEY, user_data TEXT )");
        
    }

    async getUsers(callback = () => {}) {
        this.users.all("SELECT * FROM users", [], (err, rows) => { if (err) { callback( { "status": "CANNOT_GET_USERS", "MESSAGE": err.message } ) } else { callback( { "status": "OK", "users": rows } ) } });
    }
    
    async getUserById(user_id, callback = () => {}) {
        await this.getUsers((clback) => {
            if (clback.status == "OK"){
                for (let user_index = 0;user_index < clback.users.length;user_index++){
                    let user = JSON.parse(clback.users[user_index].user_data);
                    if (user.user_id == user_id){
                        callback({status: "OK", user: user});
                        return {status: "OK", user: user};
                    }
                    
                }
                callback({status: "INVALID_AUTH_TOKEN", user: {}});
                return {"status": "INVALID_AUTH_TOKEN", user: {}};
            } else {
                callback({status: clback.status});
                return {status: clback};
            }
        })
    }

    async getUserByAuth(auth_token, callback = () => {}) {
        await this.getUsers((clback) => {
            if (clback.status == "OK"){
                for (let user_index = 0;user_index < clback.users.length;user_index++){
                    let user = JSON.parse(clback.users[user_index].user_data);
                    if (user.auth_token == auth_token){
                        return callback({status: "OK", user: user});
                    }
                    
                }
                return callback({status: "INVALID_AUTH_TOKEN", user: {}})
            }
        })
    }

    async getUserByUsername(username, callback = () => {}) {
        await this.getUsers((clback) => {
            if (clback.status == "OK"){
                for (let user_index = 0;user_index < clback.users.length;user_index++){
                    let user = JSON.parse(clback.users[user_index].user_data);
                    if (user.username == username){
                        return callback({status: "OK", user: user});
                    }
                    
                }
                return callback({status: "INVALID_USERNAME", user: {}})
            }
        })
    }

    async add(
        fullname = "",
        username = "",
        bio = "",
        callback = () => {}
    ){

        fullname = fullname.trim();
        username = username.trim().toLowerCase().replace(" ", "");
        bio = bio.trim();

        if (!(1 < fullname.length && fullname.length < 20)){
            callback({"status": "INVALID_FULLNAME_LENGTH"});
            return;
        }

        if (!(5 <= username.length && username.length < 10)){
            callback({"status": "INVALID_USERNAME_LENGTH"});
            return;
        }

        if (!(0 <= bio.length && bio.length < 50)){
            callback({"status": "INVALID_BIO_LENGTH"});
            return;
        }

        await this.getUserByUsername(username, (very) => {
            if (very.status === "OK"){ callback({"status": "EXISTS_USERNAME"});return; }
            else{
                this.qtils.createUserId().then((user_id) => {
                    this.qtils.createUserAuth().then((user_auth) => {
                        const user_data = {
                            "fullname": fullname,
                            "username": username,
                            "bio": bio,
                            "user_id": user_id,
                            "auth_token": user_auth,
                            "messages": []
                        };
        
                        this.users.run(
                            "INSERT INTO users (user_id, user_data) VALUES (?, ?)",
                            [
                                user_id,
                                JSON.stringify(
                                    user_data
                                )
                            ],
                            (err) => {
                                if (err){
                                    callback({"status": "INSERT_ERROR", "message": err.message});
                                    return;
                                } else {
                                    callback({"status": "OK", "user": user_data});
                                    return;
                                }
                            }
                        )
                    })
                })
            }
        })
    }

    async delete(
        auth_token = "",
        callback = () => {}
    ){
        await this.getUserByAuth(auth_token, (very) => {
            if (very.status === "OK"){
                this.users.run("DELETE FROM users WHERE user_id = ?", [very.user.user_id], (err) => {
                    if (err){ callback({"status": "CANNOT_DELETE", "message": err.message}); return; };
                    callback({"status": "OK", "deleted_user": very.user});
                    return;
                })
            } else {
                callback({"status": very.status});
                return;
            }
        })
    }

    async getHandledMessage(
        auth_token = "",
        callback = () => {}
    ){
        await this.getUserByAuth(auth_token, (very) => {
            if (very.status === "OK"){
                callback({"status": "OK", "message": very.user.messages[very.user.messages.length - 1]});
                return;
            } else {
                callback({"status": very.status});
                return;
            }
        })
    }

    async getHandledUser(
        auth_token = "",
        user_id = 0,
        callback = () => {}
    ){
        await this.getUserByAuth(auth_token, async function(very) {
            if (very.status === "OK"){
                const q = new QUser();
                await q.getUserById(user_id, async function(_usr) {
                    if (_usr.status === "OK"){
                        _usr.user.messages = [];
                        delete _usr.user.auth_token
                        delete _usr.user.messages
                        callback({"status": "OK", "user": _usr.user});
                        return;
                    } else {
                        callback({"status": _usr.status});
                        return;
                    }
                })
                    
            } else {
                callback({"status": very.status});
                return;
            }
        })
    }

    async getHandledUserByUsername(
        auth_token = "",
        username = "",
        callback = () => {}
    ){
        await this.getUserByAuth(auth_token, async function(very) {
            if (very.status === "OK"){
                const q = new QUser();
                await q.getUserByUsername(username, async function(_usr) {
                    if (_usr.status === "OK"){
                        _usr.user.messages = [];
                        delete _usr.user.auth_token
                        delete _usr.user.messages
                        callback({"status": "OK", "user": _usr.user});
                        return;
                    } else {
                        callback({"status": _usr.status});
                        return;
                    }
                })
                    
            } else {
                callback({"status": very.status});
                return;
            }
        })
    }

    async sendMessage(
        auth_token = "",
        to = 0,
        rich_text = "",
        buttons = [""],
        callback = () => {}
    ){
        await this.getUserByAuth(auth_token, async function(very) {
            if (very.status === "OK"){
                const q = new QUser();
                await q.getUserById(to, (to_user) => {
                    if (to_user.status === "OK"){
                        let text = rich_text.trim();
                        let real_buttons = [];

                        if (!(1 < text.length && text.length < 50)){ callback({"status": "INVALID_TEXT_LENGTH"});return; }
                        if (!(0 <= buttons.length && buttons.length < 10)){ callback({"status": "INVALID_BUTTONS_INDEX_LENGTH"});return; }

                        for (let button_index = 0;button_index < buttons.length;button_index++){
                            let button = buttons[button_index];
                            real_buttons.push(button.trim());
                        }

                        for (let button_index = 0;button_index < buttons.length;button_index++){
                            let button = buttons[button_index];
                            if (!(1 <= button.length && button.length < 15)){ callback({"status": "INVALID_BUTTON_LENGTH"});return; }
                        }

                        let message_context = {
                            "from_fullname": very.user.fullname,
                            "from_id": very.user.user_id,
                            "text": text,
                            "buttons": real_buttons,
                            "is_media": false
                        }
                        
                        very.user.messages.push(message_context);
                        to_user.user.messages.push(message_context);

                        q.users.run("UPDATE users SET user_data = ? WHERE user_id = ?", [
                            JSON.stringify(very.user),
                            very.user.user_id
                        ], (er) => {
                            if (er){ callback({"status": "PUSHING_ERROR", "message": er.message});return; }
                        })

                        q.users.run("UPDATE users SET user_data = ? WHERE user_id = ?", [
                            JSON.stringify(to_user.user),
                            to_user.user.user_id
                        ], (er) => {
                            if (er){ callback({"status": "PUSHING_ERROR", "message": er.message});return; }
                        })

                        callback({"status": "OK", "message": message_context});
                        return;
                    } else {
                        callback({"status": to_user.status});
                        return;
                    }
                })
            } else {
                callback({"status": very.status});
                return;
            }
        })
    }

    async sendMedia(
        auth_token = "",
        to = 0,
        rich_text = "",
        buttons = [""],
        media = "",
        callback = () => {}
    ){
        await this.getUserByAuth(auth_token, async function(very) {
            if (very.status === "OK"){
                const q = new QUser();
                await q.getUserById(to, (to_user) => {
                    if (to_user.status === "OK"){
                        let text = rich_text.trim();
                        let real_buttons = [];

                        if (!(1 < text.length && text.length < 50)){ callback({"status": "INVALID_TEXT_LENGTH"});return; }
                        if (!(0 <= buttons.length && buttons.length < 10)){ callback({"status": "INVALID_BUTTONS_INDEX_LENGTH"});return; }

                        for (let button_index = 0;button_index < buttons.length;button_index++){
                            let button = buttons[button_index];
                            real_buttons.push(button.trim());
                        }

                        for (let button_index = 0;button_index < buttons.length;button_index++){
                            let button = buttons[button_index];
                            if (!(1 <= button.length && button.length < 15)){ callback({"status": "INVALID_BUTTON_LENGTH"});return; }
                        }

                        let message_context = {
                            "from_fullname": very.user.fullname,
                            "from_id": very.user.user_id,
                            "text": text,
                            "buttons": real_buttons,
                            "is_media": true,
                            "media": media
                        }
                        
                        very.user.messages.push(message_context);
                        to_user.user.messages.push(message_context);

                        q.users.run("UPDATE users SET user_data = ? WHERE user_id = ?", [
                            JSON.stringify(very.user),
                            very.user.user_id
                        ], (er) => {
                            if (er){ callback({"status": "PUSHING_ERROR", "message": er.message});return; }
                        })

                        q.users.run("UPDATE users SET user_data = ? WHERE user_id = ?", [
                            JSON.stringify(to_user.user),
                            to_user.user.user_id
                        ], (er) => {
                            if (er){ callback({"status": "PUSHING_ERROR", "message": er.message});return; }
                        })

                        callback({"status": "OK", "message": message_context});
                        return;
                    } else {
                        callback({"status": to_user.status});
                        return;
                    }
                })
            } else {
                callback({"status": very.status});
                return;
            }
        })
    }

}

module.exports = QUser;

// {
//     status: 'OK',
//     user: {
//       fullname: 'Ali',
//       username: 'alie3',
//       bio: '',
//       user_id: 231978511350702700,
//       auth_token: '541cf6d1b36e9209d0aa4a124e241c09',
//       messages: []
//     }
// }

// {
//     status: 'OK',
//     user: {
//       fullname: 'Mmd',
//       username: 'mmdjafary',
//       bio: '',
//       user_id: 998698131573354200,
//       auth_token: 'e0aa59570433c136f2d89245a578ab41',
//       messages: []
//     }
// }