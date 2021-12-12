const Discord = require('discord.js');

class GuildInformation {

    /**
     * 
     * @param {Discord.Guild} guild
     * @param {Array<User>} users
     */
    constructor(guild, users) {
        this.id = guild.id;
        this.name = guild.name;
        this.joinedAt = new Date(Date.now());
        this.recordAt = new Date(Date.now());
        this.betInfo = new BetGameObject('undefined', 0, 'nothing', [], 0, 0, [])
        this.users = users;
    }

    /**
     * 
     * @param {Object} obj 
     * @param {Discord.Guild} guild 
     * @param {Discord.Client} client 
     */
    static async toGuildInformation(obj, guild) {
        let newGI = new GuildInformation(guild ,[]);
        newGI.joinedAt = obj.joinedAt ?? new Date(Date.now());
        newGI.recordAt = obj.recordAt ?? new Date(Date.now());
        obj.users.forEach(user => {
            const newUser = new User(user.id ?? 0, user.tag ?? "undefined#0000");
            newUser.DM = user.DM ?? true;
            newUser.coins = user.coins ?? 100;
            newUser.lastAwardTime = user.lastAwardTime ?? Date.now();
            newGI.users.push(newUser);
        })

        newGI.betInfo.isPlaying = obj.betInfo.isPlaying ?? 0;
        newGI.betInfo.count = obj.betInfo.count ?? 0;
        newGI.betInfo.id = obj.betInfo.id ?? 0;
        newGI.betInfo.name = obj.betInfo.name ?? 'undefined';
        newGI.betInfo.description = obj.betInfo.description ?? 'nothing';
        newGI.betInfo.totalBet = obj.betInfo.totalBet ?? 0;
        obj.betInfo.option.forEach(option => {
            const newBetOpt = new BetGameOptionObject(1, 'undefined', 'nothing');
            newBetOpt.id = option.id ?? 0;
            newBetOpt.name = option.name ?? 'undefiend';
            newBetOpt.description = option.description ?? 'nothing';
            newBetOpt.betCount = option.betCount ?? 0;
            newGI.betInfo.option.push(newBetOpt);
        })
        obj.betInfo.betRecord.forEach(element => {
            const newRC = new BetGameResultObject("0", 0, "0");
            newRC.userId = element.userId;
            newRC.coins = element.coins;
            newRC.time = element.time;
            newRC.optionId = element.optionId;
            newGI.betInfo.betRecord.push(newRC);
        })
        
        return newGI;
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
        return this.users.find((element) => element.id === userId);
    }

    /**
     * 
     * @param {string} userId 
     * @returns 
     */
    has(userId) {
        const target = this.users.find((element) => element.id === userId);
        return target ? true : false;
    }

    /**
     * 
     * @param {User} userUnit 
     */
    addUser(userUnit) {
        this.users.push(userUnit);
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
        this.lastAwardTime = 0;
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

}

class BetUserRecordObject {

}

module.exports.User = User;
module.exports.GuildInformation = GuildInformation;

module.exports.betGameObject = BetGameObject;
module.exports.betGameOptionObject = BetGameOptionObject;
module.exports.betGameResultObject = BetGameResultObject;

module.exports.betRecordObject = BetRecordObject;
module.exports.betUserRecordObject = BetUserRecordObject;
