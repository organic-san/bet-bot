const Discord = require('discord.js');

class GuildInformation {

    /**
     * 
     * @param {Discord.Guild} guild
     */
    constructor(guild) {
        this.id = guild.id;
        this.name = guild.name;
        this.joinedAt = new Date(Date.now());
        this.recordAt = new Date(Date.now());
        /**
         * @type {Map<string, User>}
         */
        this.users = new Map();
        this.betCount = 0;
        this.betInfo = new BetGameObject('undefined', 0, 'nothing', [], 0, 0, []);
        /**
         * @type {Array<BetRecordObject>}
         */
        this.betRecord = [];
        /**
         * @type {Array<BetAwardBox>}
         */
        this.awardBox = [];
    }

    /**
     * 
     * @param {Object} obj 
     */
    toGuildInformation(obj) {
        this.joinedAt = obj.joinedAt;
        this.recordAt = obj.recordAt;
        this.betCount = obj.betCount;
        this.betInfo.toBetGameObject(obj.betInfo);
    }

    /*
    static async toGuildInformation(obj, guild) {
        let newGI = new GuildInformation(guild ,[]);
        newGI.joinedAt = obj.joinedAt ?? new Date(Date.now());
        newGI.recordAt = obj.recordAt ?? new Date(Date.now());
        obj.users.forEach(user => {
            const newUser = new User(user.id ?? 0, user.tag ?? "undefined#0000");
            newUser.DM = user.DM ?? true;
            newUser.coins = user.coins ?? 100;
            newUser.totalBet = user.totalBet ?? 0;
            newUser.totalGet = user.totalGet ?? 0;
            newUser.joinTimes = user.joinTimes ?? 0;
            newUser.lastAwardTime = user.lastAwardTime ?? Date.now();
            newGI.users.push(newUser);
        });

        obj.awardBox?.forEach(box => {
            const newBox = new BetAwardBox(0, 0, '0');
            newBox.coinMuch = box.coinMuch;
            newBox.id = box.id;
            newBox.untilTime = box.untilTime;
            newGI.awardBox.push(newBox);
        });

        newGI.betInfo.isPlaying = obj.betInfo.isPlaying ?? 0;
        newGI.betInfo.count = obj.betInfo.count ?? 0;
        newGI.betInfo.id = obj.betInfo.id ?? 0;
        newGI.betInfo.name = obj.betInfo.name ?? 'undefined';
        newGI.betInfo.description = obj.betInfo.description ?? 'nothing';
        newGI.betInfo.totalBet = obj.betInfo.totalBet ?? 0;
        obj.betInfo.option.forEach(option => {
            const newBetOpt = new BetGameOptionObject(0, 'undefined', 'nothing');
            newBetOpt.id = option.id ?? 0;
            newBetOpt.name = option.name ?? 'undefiend';
            newBetOpt.description = option.description ?? 'nothing';
            newBetOpt.betCount = option.betCount ?? 0;
            newGI.betInfo.option.push(newBetOpt);
        });

        obj.betInfo.betRecord.forEach(element => {
            const newRC = new BetGameResultObject("0", 0, "0");
            newRC.userId = element.userId;
            newRC.coins = element.coins;
            newRC.totalBet = element.totalBet ?? 0;
            newRC.totalGet = element.totalGet ?? 0;
            newRC.joinTimes = element.joinTimes ?? 0;
            newRC.time = element.time;
            newRC.optionId = element.optionId;
            newGI.betInfo.betRecord.push(newRC);
        });

        obj.betRecord.forEach(element => {
            const newRC = new BetRecordObject('undefined', 0, 'nothing', [], new BetGameOptionObject('0', 'undefined', 'nothing'));
            newRC.id = element.id ?? 0;
            newRC.name = element.name ?? 'undefined';
            newRC.description = element.description ?? 'nothing';
            newRC.totalBet = element.totalBet ?? 0;
            newRC.winner.id = element.winner.id;
            newRC.winner.name = element.winner.name;
            newRC.winner.description = element.winner.description;
            newRC.winner.betCount = element.winner.betCount;
            element.option.forEach(eleopt => {
                const newOPT = new BetGameOptionObject('0', 'undefined', 'nothing')
                newOPT.id = eleopt.id;
                newOPT.description = eleopt.description;
                newOPT.name = eleopt.name;
                newOPT.betCount = eleopt.betCount;
                newRC.option.push(newOPT);
            })
            newGI.betRecord.push(newRC);
        });
        
        return newGI;
    }
    */

    outputBasic() {
        return {
            "id": this.id,
            "name": this.name,
            "joinedAt": this.joinedAt,
            "recordAt": this.recordAt,
            "betCount": this.betCount
        }
    }

    outputBet() {
        return this.betInfo;
    }

    get usersMuch() {
        return this.users.length;
    }

    /**
     * 
     * @param {String} userId 用戶ID
     * @returns 用戶資訊
     */
    getUser(userId){
        return this.users.get(userId);
    }

    /**
     * 
     * @param {string} userId 
     * @returns 
     */
    has(userId) {
        const target = this.users.has(userId);
        return target ? true : false;
    }

    /**
     * 
     * @param {User} userUnit 
     */
    addUser(userUnit) {
        this.users.set(userUnit.id, userUnit);
    }

    
}

class User {

    /**
     * 
     * @param {string} userId 用戶ID
     * @param {string} userTag 用戶TAG
     */
    constructor(userId, userTag) {
        this.id = userId;
        this.tag = userTag;
        this.DM = true;
        this.coins = 100;
        this.totalBet = 0;
        this.totalGet = 0;
        this.joinTimes = 0;
        this.lastAwardTime = 0;
        this.saveTime = 0;
    }
    
    toUser(userObj) {
        this.DM = userObj.DM;
        this.coins = userObj.coins;
        this.totalBet = userObj.totalBet;
        this.totalGet = userObj.totalGet;
        this.joinTimes = userObj.joinTimes;
        this.lastAwardTime = userObj.lastAwardTime;
    }

    outputUser() {
        return {
            "id": this.id,
            "tag": this.tag,
            "DM": this.DM,
            "coins": this.coins,
            "totalBet": this.totalBet,
            "totalGet": this.totalGet,
            "joinTimes": this.joinTimes,
            "lastAwardTime": this.lastAwardTime,
        }
    }

}

class BetGameObject {

    /**
     * 
     * @param {String} name 
     * @param {Number} id 
     * @param {String} description 
     * @param {Array<BetGameOptionObject>} option 
     * @param {Number} isPlaying
     * @param {Number} count
     * @param {Array<BetGameResultObject>} betRecord
     */    
    constructor(name, id, description, option, isPlaying, count, betRecord) {
        this.isPlaying = isPlaying;
        this.count = count;
        this.id = id;
        this.name = name;
        this.description = description;
        this.option = option;
        this.betRecord = betRecord;
        this.totalBet = 0;
    }

    toBetGameObject(obj) {
        this.isPlaying = obj.isPlaying ?? 0;
        this.count = obj.count ?? 0;
        this.id = obj.id ?? 0;
        this.name = obj.name ?? 'undefined';
        this.description = obj.description ?? 'nothing';
        this.totalBet = obj.totalBet ?? 0;
        obj.option.forEach(option => {
            const newBetOpt = new BetGameOptionObject(0, 'undefined', 'nothing');
            newBetOpt.id = option.id ?? 0;
            newBetOpt.name = option.name ?? 'undefiend';
            newBetOpt.description = option.description ?? 'nothing';
            newBetOpt.betCount = option.betCount ?? 0;
            this.option.push(newBetOpt);
        });
    }

    /**
     * 
     * @param {String} optionId 選項ID
     * @returns 查詢選項資訊
     */
    getOption(optionId){
        return this.option.find((element) => element.id === optionId);
    }

    /**
     * 
     * @param {String} userId 
     * @param {String} optionId 
     * @param {number} coinMuch 
     */
    addRecord(userId, optionId, coinMuch) {
        this.betRecord.push(new BetGameResultObject(userId, coinMuch, optionId));
    }

}

class BetGameOptionObject {

    /**
     * 
     * @param {String} id 
     * @param {String} name 
     * @param {String} description 
     */
    constructor(id, name, description) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.betCount = 0;
    }
}

class BetGameResultObject {

    /**
     * 
     * @param {String} userId 
     * @param {Number} coins 
     * @param {String} optionId 
     */
    constructor(userId, coins, optionId) {
        this.userId = userId;
        this.time = Date.now();
        this.coins = coins;
        this.optionId = optionId;
    }
}

class BetRecordObject {
    /**
         * 
         * @param {String} name 
         * @param {Number} id 
         * @param {String} description 
         * @param {Array<BetGameOptionObject>} option 
         * @param {BetGameOptionObject} winner 
         */    
    constructor(name, id, description, option, winner) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.option = option;
        this.totalBet = 0;
        this.winner = winner;
    }
}

class BetAwardBox {

    /**
     * 
     * @param {number} coinMuch 
     * @param {number} untilTime 
     * @param {string} id 
     */
    constructor(coinMuch, untilTime, id) {
        this.coinMuch = coinMuch;
        this.untilTime = untilTime;
        this.id = id;
    }
}


module.exports.User = User;
module.exports.guildInformation = GuildInformation;

module.exports.betGameObject = BetGameObject;
module.exports.betGameOptionObject = BetGameOptionObject;
module.exports.betGameResultObject = BetGameResultObject;

module.exports.betRecordObject = BetRecordObject;

module.exports.betAwardBox = BetAwardBox;

