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
        this.awardBoxCount = 0;
        this.taxRate = 100;
        /**
         * @type {Map<string, User>}
         */
        this.users = new Map();
        this.betInfo = new BetGameObject('undefined', 0, 'nothing', [], 0, 0, [], []);
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
        this.awardBoxCount = obj.awardBoxCount ?? 0;
        this.betInfo.toBetGameObject(obj.betInfo);
        this.taxRate = obj.taxRate ?? 100;
    }

    toJSON() {
        return {
            "id": this.id,
            "name": this.name,
            "joinedAt": this.joinedAt,
            "recordAt": this.recordAt,
            "betCount": this.betCount,
            "awardBoxCount": this.awardBoxCount,
            "taxRate": this.taxRate,
        }
    }

    /**
     * 
     * @param {BetGameOptionObject} winner 
     * @param {BetGameOptionObject} betTaxRate 
     * @returns 
     */
    outputBetRecord(winner, betTaxRate) {
        const newRecord = new BetRecordObject(
            this.betInfo.name, 
            this.betInfo.id, 
            this.betInfo.description,
            this.betInfo.option,
            winner,
            this.betInfo.totalBet,
            betTaxRate
            )
        return newRecord;
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

    toFullUser(userObj) {
        this.id = userObj.id;
        this.tag = userObj.tag;

        this.DM = userObj.DM;
        this.coins = userObj.coins;
        this.totalBet = userObj.totalBet;
        this.totalGet = userObj.totalGet;
        this.joinTimes = userObj.joinTimes;
        this.lastAwardTime = userObj.lastAwardTime;
    }

    toJSON() {
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
     * @param {Array<Array<number>>} priority
     * @param {boolean} autoClose
     * @param {number} autoCloseDate
     */    
    constructor(name, id, description, option, isPlaying, count, betRecord, priority, autoClose, autoCloseDate) {
        this.isPlaying = isPlaying;
        this.count = count;
        this.id = id;
        this.name = name;
        this.description = description;
        this.option = option;
        this.betRecord = betRecord;
        this.priority = priority;
        this.totalBet = 0;
        this.autoClose = autoClose ?? false;
        this.autoCloseDate = autoCloseDate ?? 0;
    }

    toBetGameObject(obj) {
        this.isPlaying = obj.isPlaying ?? 0;
        this.count = obj.count ?? 0;
        this.id = obj.id ?? 0;
        this.name = obj.name ?? 'undefined';
        this.description = obj.description ?? 'nothing';
        this.totalBet = obj.totalBet ?? 0;
        this.priority = obj.priority ?? [];
        this.autoCloseDate = obj.autoCloseDate ?? 0;
        this.autoClose = obj.autoClose ?? false;
        obj.option.forEach(option => {
            const newBetOpt = new BetGameOptionObject(0, 'undefined', 'nothing');
            newBetOpt.toOption(option);
            this.option.push(newBetOpt);
        });
        
        obj.betRecord.forEach(option => {
            const newRC = new BetGameResultObject("0", 0, "0");
            newRC.toOption(option);
            this.betRecord.push(newRC);
        })
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

    setAutoClose(date) {
        this.autoClose = true;
        this.autoCloseDate = date;
    }

}

class BetTemplateObject {

    /**
     * 
     * @param {String} name 
     * @param {String} description 
     * @param {Array<BetGameOptionObject>} option 
     * @param {Array<Array<number>>} priority
     */    
    constructor(name, description, option, priority) {
        this.name = name;
        this.description = description;
        this.option = option;
        this.priority = priority;
    }

    /*
    toBetGameObject(obj) {
        this.name = obj.name ?? 'undefined';
        this.description = obj.description ?? 'nothing';
        this.priority = obj.priority ?? [];
        obj.option.forEach(option => {
            const newBetOpt = new BetGameOptionObject(0, 'undefined', 'nothing');
            newBetOpt.toOption(option);
            this.option.push(newBetOpt);
        });
    }
    */

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
     * @param {{name: string, description: string}} option 
     */
    addOption(option) {
        this.option.push(option);
    }

    removeOption(name) {
        let removeID = -1;
        this.option.forEach((val, ind) => {
            if(val.name === name) removeID = ind;
        })
        return this.option.splice(removeID, 1);
    }

    isNameUsed(name) {
        let used = false;
        this.option.forEach(val => {
            if(val.name === name) used = true;
        })
        return used;
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

    toOption(opt) {
        this.id = opt.id ?? 0;
        this.name = opt.name ?? 'undefiend';
        this.description = opt.description ?? 'nothing';
        this.betCount = opt.betCount ?? 0;
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

    toOption(opt) {
        this.userId = opt.userId ?? "0";
        this.time = opt.time ?? 'undefiend';
        this.coins = opt.coins ?? 0;
        this.optionId = opt.optionId ?? "0";
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
         * @param {Number} totalBet 
         * @param {Array<Array<number>>} priority
         * @param {number} taxRate
         */    
    constructor(name, id, description, option, winner, totalBet, taxRate, priority) {
        this.id = id;
        this.name = name;
        this.description = description;
        /**
         * @type {Array<BetGameObject>}
         */
        this.option = option ?? [];
        this.totalBet = totalBet ?? 0;
        this.priority = priority ?? [];
        this.winner = winner ?? new BetGameOptionObject;
        this.betTaxRate = taxRate ?? 100;
    }

    toBetRecordObject(obj) {
        this.id = obj.id ?? 0;
        this.name = obj.name ?? 'undefined';
        this.description = obj.description ?? 'nothing';
        this.totalBet = obj.totalBet ?? 0;
        obj.option.forEach(option => {
            const newBetOpt = new BetGameOptionObject(0, 'undefined', 'nothing');
            newBetOpt.toOption(option);
            this.option.push(newBetOpt);
        });
        this.priority = obj.priority ?? [];
        this.winner.toOption(obj.winner);
        this.betTaxRate = obj.betTaxRate ?? 100;
        
    }
}

class BetAwardBox {

    /**
     * 
     * @param {string} id 
     * @param {number} coinMuch 
     * @param {number} days 設定日數
     */
    constructor(id, coinMuch, days) {
        this.id = id;
        this.coinMuch = coinMuch;
        this.startTime = Date.now();
        let endDay = Date.now() + (days * 86400 * 1000);
        let endTime = Math.ceil(endDay / (1000 * 86400)) * (1000 * 86400) + 1000 * (3 - 8) * 60 * 60;
        this.endTime = endTime;
        /**
         * @type {Array<string>}
         */
        this.awardIdList = [];
    }

    toAwardBoxObject(obj) {
        this.id = obj.id ?? '0';
        this.coinMuch = obj.coinMuch ?? 0;
        this.startTime = obj.startTime ?? 0;
        this.endTime = obj.endTime ?? 0;
        this.awardIdList = obj.awardIdList ?? [];
        
    }
}


module.exports.User = User;
module.exports.guildInformation = GuildInformation;

module.exports.betGameObject = BetGameObject;
module.exports.betGameOptionObject = BetGameOptionObject;
module.exports.betGameResultObject = BetGameResultObject;

module.exports.betTemplateObject = BetTemplateObject;

module.exports.betRecordObject = BetRecordObject;

module.exports.betAwardBox = BetAwardBox;

