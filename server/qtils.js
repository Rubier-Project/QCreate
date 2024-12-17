const crypto = require("crypto");

class Qtils {
    async createUserId() {
        return Math.floor( Math.random() * 999999999999999999 ) - 10000000;
    }

    async createUserAuth() {
        return crypto.createHash("md5").update(
            `fsudy+_$#@+(USFDIU(S()43905uysdfj${new Date().getTime()}))`
        ).digest("hex")
    }

}

module.exports = Qtils;