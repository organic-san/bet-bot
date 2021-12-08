const Discord = require('discord.js');

class GuildInformationArray {
    /**
     * 
     * @param {Array<GuildInformation>} guildInfoList 傳入伺服器資訊陣列或空陣列
     * @param {Array<string>} guildList 伺服器ID陣列
     */
    constructor(guildInfoList, guildList) {
        this.guilds = guildInfoList;
        this.guildList = guildList;
    }

    get lastGuild () {
        return this.guilds[this.guilds.length - 1];
    }

    /**
     * 
     * @param {GuildInformation} info 伺服器資訊
     */
    pushGuildInfo(info) {
        this.guilds.push(info);
    }

    /**
     * 
     * @param {string} list 
     */
    pushGuildList(list) {
        if(!this.guildList.includes(list))
            this.guildList.push(list);
    }

    sortGuildList() {
        this.guildList.sort((a, b) => { return a - b; });
    }

    /**
     * 
     * @param {string} guildId GuildId
     * @returns hasGuildId?
     */
    has(guildId) {
        return this.guildList.includes(guildId);
    }

    /**
     * 
     * @param {GuildInformation} guildUnit 
     */
    addGuild(guildUnit) {
        this.guilds.push(guildUnit);
        this.guildList.push(guildUnit.id);
    }

    removeGuild(guildId) {
        var posl = this.guildList.indexOf(guildId);
        this.guildList.splice(posl, 1);
        var posg = this.guilds.findIndex((element) => element.id === guildId);
        this.guilds.splice(posg, 1);
    }

    /**
     * 
     * @param {String} guildId 伺服器ID
     * @returns 伺服器資訊
     */
    getGuild(guildId){
        return this.guilds.find((element) => element.id === guildId);
    }

    /**
     * 
     * @param {Discord.Guild} guild 
     */
    updateGuild(guild) {
        const element = this.guilds.find((element) => element.id === guild.id);
        element.name = guild.name;
        if(!element.joinedAt) element.joinedAt = new Date(Date.now());
        element.recordAt = new Date(Date.now());
    }

}


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
    }

}

module.exports.User = User;
module.exports.GuildInformation = GuildInformation;
module.exports.GuildInformationArray = GuildInformationArray;
