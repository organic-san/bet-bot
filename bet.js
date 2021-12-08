const Discord = require('discord.js');
const fs = require('fs');
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

let isReady = false;

client.on('ready', () =>{
    console.log(`登入成功: ${client.user.tag} 於 ${new Date()}`);
    client.user.setActivity('/help'/*, { type: 'PLAYING' }*/);

    
    setTimeout(() => {
        console.log(`設定成功: ${new Date()}`);
        /*
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`登入成功: <t:${Math.floor(client.readyTimestamp / 1000)}:F>`));
        if(client.user.id !== process.env.BOT_ID_ACIDTEST)
            client.channels.fetch(process.env.CHECK_CH_ID2).then(channel => channel.send(`登入成功: <t:${Math.floor(client.readyTimestamp / 1000)}:F>`));
        */
        isReady = true;
    }, parseInt(process.env.LOADTIME) * 1000);
    
});
//#endregion

client.on('interactionCreate', async interaction => {
    if(!isReady) return;

    if(!interaction.guild && interaction.isCommand()) return interaction.reply("無法在私訊中使用斜線指令!");

    /*
    //伺服器資料建立&更新
    if(!guildInformation.has(interaction.guild.id)){
        const thisGI = new guild.GuildInformation(interaction.guild, []);
        guildInformation.addGuild(thisGI);
        console.log(`${client.user.tag} 加入了 ${interaction.guild.name} (${interaction.guild.id}) (缺少伺服器資料觸發/interaction)`);
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
            channel.send(`${client.user.tag} 加入了 **${interaction.guild.name}** (${interaction.guild.id}) (缺少伺服器資料觸發/interaction)`)
        );
    }
    guildInformation.updateGuild(interaction.guild);
    */
    if (!interaction.isCommand()) return;
    if(!interaction.channel.permissionsFor(client.user).has(Discord.Permissions.FLAGS.SEND_MESSAGES) || 
        !interaction.channel.permissionsFor(client.user).has(Discord.Permissions.FLAGS.ADD_REACTIONS))
        return interaction.reply({content: "我不能在這裡說話!", ephemeral: true});
    

    //讀取指令ID，過濾無法執行(沒有檔案)的指令
    let commandName = "";
    if(!!interaction.options.getSubcommand(false)) commandName = interaction.commandName + "/" + interaction.options.getSubcommand(false);
    else commandName = interaction.commandName;
    console.log("isInteraction: isCommand: " + commandName + ", id: " + interaction.commandId + ", guild: " + interaction.guild.name)
	const command = client.commands.get(interaction.commandName);
	if (!command) return;

	try {
        if(command.tag === "interaction") await command.execute(interaction);
		//if(command.tag === "guildInfo") await command.execute(interaction, guildInformation.getGuild(interaction.guild.id));
		//if(command.tag === "musicList") await command.execute(interaction, musicList.get(interaction.guild.id));

	} catch (error) {
		console.error(error);
		await interaction.reply({ content: '糟糕! 好像出了點錯誤!', ephemeral: true });
	}
});