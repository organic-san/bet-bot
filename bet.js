const Discord = require('discord.js');
const fs = require('fs');
const { array } = require('zod');
const guild = require('./functions/guildInfo.js');

require('dotenv').config();

const options = {
    restTimeOffset: 100,
    intents: [
        Discord.Intents.FLAGS.GUILDS,
        Discord.Intents.FLAGS.GUILD_MESSAGES,
        Discord.Intents.FLAGS.DIRECT_MESSAGES, 
        Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ],
};

const client = new Discord.Client(options);
client.login(process.env.TOKEN);

client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

/**
 * @type {Array<guild.GuildInformation>}
 */
let guildInformation = [];

/**
 * @type {Array<string>}
 */
let guildList = [];

let isready = false;

client.on('ready', () =>{
    console.log(`登入成功: ${client.user.tag} 於 ${new Date()}`);
    client.user.setActivity('/help'/*, { type: 'PLAYING' }*/);

    
    fs.readFile("./data/guildData/guildlist.json", (err,word) => {
        if(err) throw err;
        var parseJsonlist = JSON.parse(word);
        parseJsonlist.forEach(element => {
            if(guildList.includes(element)) return;
            guildList.push(element);
        });
        guildList.sort((a, b) => a - b);
        guildList.forEach(async (element) => {
            const filename = `./data/guildData/${element}.json`;
            fs.readFile(filename, async (err, text) => {
                if (err)
                    throw err;
                console.log(element);
                const targetGuild = await client.guilds.fetch(JSON.parse(text).id);
                guildInformation.push(
                    await guild.GuildInformation.toGuildInformation(JSON.parse(text), targetGuild)
                );
            });
        });
    });
    
    setTimeout(() => {
        console.log(`設定成功: ${new Date()}`);
        //TODO: 除錯用資料傳送處理
        /*
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`登入成功: <t:${Math.floor(client.readyTimestamp / 1000)}:F>`));
        if(client.user.id !== process.env.BOT_ID_ACIDTEST)
            client.channels.fetch(process.env.CHECK_CH_ID2).then(channel => channel.send(`登入成功: <t:${Math.floor(client.readyTimestamp / 1000)}:F>`));
        */
        isready = true;
    }, parseInt(process.env.LOADTIME) * 1000);

    setInterval(() => {
        fs.writeFile("./data/guildData/guildlist.json", JSON.stringify(guildList, null, '\t'), function (err){
            if (err)
                console.log(err);
        });
        guildInformation.forEach(async (element) => {
            const filename = `./data/guildData/${element.id}.json`;
            fs.writeFile(filename, JSON.stringify(element, null, '\t'),async function (err) {
                if (err)
                    return console.log(err);
            });
        });
        time = new Date();
        console.log(`Saved in ${time} (auto)`);
        //TODO: 除錯用資料傳送處理
        /*
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`自動存檔: <t:${Math.floor(Date.now() / 1000)}:F>`)).catch(err => console.log(err));
        */
    },10 * 60 * 1000)
    
});
//#endregion

client.on('interactionCreate', async interaction => {
    if(!isready) return;

    if(!interaction.guild && interaction.isCommand()) return interaction.reply("無法在私訊中使用斜線指令!");

    
    //伺服器資料建立&更新
    if(!guildInformation.find(element => element.id === interaction.guild.id)){
        const thisGI = new guild.GuildInformation(interaction.guild, []);
        guildInformation.push(thisGI);
        guildList.push(interaction.guild.id)
        console.log(`${client.user.tag} 加入了 ${interaction.guild.name} (${interaction.guild.id}) (缺少伺服器資料觸發/interaction)`);
        //TODO: 除錯用資料傳送處理
        /*
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
            channel.send(`${client.user.tag} 加入了 **${interaction.guild.name}** (${interaction.guild.id}) (缺少伺服器資料觸發/interaction)`)
        );
        */
    }
    const element = guildInformation.find((element) => element.id === interaction.guild.id);
    element.name = interaction.guild.name;
    if(!element.joinedAt) element.joinedAt = Date.now();
    element.recordAt = Date.now();

    //個人資料檢查與建立
    if(!element.has(interaction.user.id)) {
        element.addUser(new guild.User(interaction.user.id, interaction.user.tag));
    }
    element.getUser(interaction.user.id).tag = interaction.user.tag;
    
    //發言檢測
    if (!interaction.isCommand()) return;
    if(!interaction.channel.permissionsFor(client.user).has(Discord.Permissions.FLAGS.SEND_MESSAGES) || 
        !interaction.channel.permissionsFor(client.user).has(Discord.Permissions.FLAGS.ADD_REACTIONS))
        return interaction.reply({content: "我在這裡不具有發言的權限。請到可以使用指令的頻道使用指令。", ephemeral: true});
    

    //讀取指令ID，過濾無法執行(沒有檔案)的指令
    let commandName = "";
    if(!!interaction.options.getSubcommand(false)) commandName = interaction.commandName + "/" + interaction.options.getSubcommand(false);
    else commandName = interaction.commandName;
    console.log("isInteraction: isCommand: " + commandName + ", id: " + interaction.commandId + ", guild: " + interaction.guild.name)
	const command = client.commands.get(interaction.commandName);
	if (!command) return;

	try {
        if(command.tag === "interaction") await command.execute(interaction);
		if(command.tag === "guildInfo") await command.execute(interaction, guildInformation.find(element => element.id === interaction.guild.id));
		//if(command.tag === "musicList") await command.execute(interaction, musicList.get(interaction.guild.id));

	} catch (error) {
		console.error(error);
		await interaction.reply({ content: '糟糕! 好像出了點錯誤!', ephemeral: true });
	}
});

client.on('messageCreate', async msg =>{
    if(!isready) return;
    if(!msg.guild || !msg.member) return; //訊息內不存在guild元素 = 非群組消息(私聊)
    if(msg.webhookId) return;
    
    if(msg.author.id === process.env.OWNER1_ID || msg.author.id === process.env.OWNER2_ID){
        if(msg.content.startsWith("bet^s")){
            fs.writeFile("./data/guildData/guildlist.json", JSON.stringify(guildList, null, '\t'), function (err){
                if (err)
                    console.log(err);
            });
            guildInformation.forEach(async (element) => {
                const filename = `./data/guildData/${element.id}.json`;
                fs.writeFile(filename, JSON.stringify(element, null, '\t'),async function (err) {
                    if (err)
                        return console.log(err);
                });
            });
            time = new Date();
            console.log(`Saved in ${time} (handle)`);
            //TODO: 除錯用資料傳送處理
            /*
            client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`手動存檔: <t:${Math.floor(Date.now() / 1000)}:F>`)).catch(err => console.log(err));
            */
           if(msg.deletable) msg.delete();
        }
    }
})