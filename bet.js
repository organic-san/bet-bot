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
        Discord.Intents.FLAGS.DIRECT_MESSAGES
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
 * @type {Map<string, guild.guildInformation>}
 */
let guildInformation = new Map;

let gachaData = fs.readFileSync(`./data/gacha.json`);
gachaData = JSON.parse(gachaData);

const guildDirs = fs.readdirSync('./data/guildData');
guildDirs.forEach( file => {
    try{
        const fileDirs = fs.readdirSync(`./data/guildData/${file}`);
        if(!fileDirs.includes("awardBox")) 
            fs.mkdirSync(`./data/guildData/${file}/awardBox`, err => {if(err) console.error(err)});
        if(!fileDirs.includes("betRecord")) 
            fs.mkdirSync(`./data/guildData/${file}/betRecord`, err => {if(err) console.error(err)});
        if(!fileDirs.includes("betTemplate")) 
            fs.mkdirSync(`./data/guildData/${file}/betTemplate`, err => {if(err) console.error(err)});
        let parseJsonlist = fs.readFileSync(`./data/guildData/${file}/basicInfo.json`);
        parseJsonlist = JSON.parse(parseJsonlist);
            
        let parseBetData = fs.readFileSync(`./data/guildData/${file}/betInfo.json`);
        parseJsonlist.betInfo = JSON.parse(parseBetData);
        const newG = new guild.guildInformation({ "id": file, "name": parseJsonlist.name });
        newG.toGuildInformation(parseJsonlist);
        guildInformation.set(file, newG);

    } catch (err) {
        console.error(err);
    }
});

let isready = false;

client.on('ready', () =>{
    console.log(`????????????: ${client.user.tag} ??? ${new Date()}`);
    client.user.setActivity('/help'/*, { type: 'PLAYING' }*/);

    setTimeout(async () => {
        console.log(`????????????: ${new Date()}`);
        //TODO: ???????????????????????????
        /*
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`????????????: <t:${Math.floor(client.readyTimestamp / 1000)}:F>`));
        if(client.user.id !== process.env.BOT_ID_ACIDTEST)
            client.channels.fetch(process.env.CHECK_CH_ID2).then(channel => channel.send(`????????????: <t:${Math.floor(client.readyTimestamp / 1000)}:F>`));
        */
        isready = true;
        
    }, parseInt(process.env.LOADTIME) * 1000);

    setInterval(() => {
        guildInformation.forEach(async (val, key) => {
            fs.writeFile(`./data/guildData/${key}/basicInfo.json`, JSON.stringify(val, null, '\t'),async function (err) {
                if (err)
                    return console.log(err);
            });
            fs.writeFile(`./data/guildData/${key}/betInfo.json`, JSON.stringify(val.betInfo, null, '\t'),async function (err) {
                if (err)
                    return console.log(err);
            });
            val.users.forEach((ele, id) => {
                fs.writeFile(`./data/guildData/${key}/users/${ele.id}.json`, JSON.stringify(ele, null, '\t'),async function (err) {
                    if (err)
                        return console.log(err);
                });
                ele.saveTime++;
                if(ele.saveTime > 3) val.users.delete(id);
            });
            fs.readdirSync(`./data/guildData/${key}/awardBox`).forEach(box => {
                let awardBox = new guild.betAwardBox(0, 0, 0);
                awardBox.toAwardBoxObject(
                    JSON.parse(
                        fs.readFileSync(`./data/guildData/${key}/awardBox/${box}`)
                    )
                );
                if(awardBox.endTime < Date.now()) {
                    fs.unlink(`./data/guildData/${key}/awardBox/${box}`, function () {
                        console.log(`??????: ${val.name} ???????????? ID: ${awardBox.id} (????????????)`);
                    });
                }
            });
        });
        let time = new Date();
        console.log(`Saved in ${time} (auto)`);
        //TODO: ???????????????????????????
        /*
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`????????????: <t:${Math.floor(Date.now() / 1000)}:F>`)).catch(err => console.log(err));
        */
    },10 * 60 * 1000)
    
});
//#endregion

client.on('interactionCreate', async interaction => {
    if(!isready) return;

    if(!interaction.guild && interaction.isCommand()) return interaction.reply("????????????????????????????????????!");
    
    //?????????????????????&??????
    if(!guildInformation.get(interaction.guild.id)){
        fs.mkdirSync(`./data/guildData/${interaction.guild.id}`, err => {if(err) console.error(err)});
        fs.mkdirSync(`./data/guildData/${interaction.guild.id}/users`, err => {if(err) console.error(err)});
        fs.mkdirSync(`./data/guildData/${interaction.guild.id}/betRecord`, err => {if(err) console.error(err)});
        fs.mkdirSync(`./data/guildData/${interaction.guild.id}/awardBox`, err => {if(err) console.error(err)});
        fs.mkdirSync(`./data/guildData/${interaction.guild.id}/betTemplate`, err => {if(err) console.error(err)});
        const basicInfo = new guild.guildInformation(interaction.guild);
        fs.writeFile(
            `./data/guildData/${interaction.guild.id}/basicInfo.json`, 
            JSON.stringify(basicInfo, null, '\t'), err => {if(err) console.error(err)}
        );
        fs.writeFile(
            `./data/guildData/${interaction.guild.id}/betInfo.json`, 
            JSON.stringify(basicInfo.betInfo, null, '\t'), err => {if(err) console.error(err)}
        );
        guildInformation.set(interaction.guild.id, basicInfo)
        console.log(`${client.user.tag} ????????? ${interaction.guild.name} (${interaction.guild.id}) (???????????????????????????/interaction)`);
        //TODO: ???????????????????????????
        /*
        client.channels.fetch(process.env.CHECK_CH_ID).then(channel => 
            channel.send(`${client.user.tag} ????????? **${interaction.guild.name}** (${interaction.guild.id}) (???????????????????????????/interaction)`)
        );
        */
    }
    let element = guildInformation.get(interaction.guild.id);
    element.name = interaction.guild.name;
    if(!element.joinedAt) element.joinedAt = new Date(Date.now());
    element.recordAt = new Date(Date.now());

    //???????????????????????????
    const userData = element.getUser(interaction.user.id);
    if(!userData) {
        const userData = fs.readdirSync(`./data/guildData/${interaction.guild.id}/users`)
            .filter(file => file.endsWith('.json') && file.startsWith(interaction.user.id));
        if(userData.length === 0) {
            const userData = new guild.User(interaction.user.id, interaction.user.tag);
            fs.writeFile(
                `./data/guildData/${interaction.guild.id}/users/${interaction.user.id}.json`,
                JSON.stringify(userData, null, '\t'), err => {if(err) console.error(err)}
            );
            element.addUser(userData);
        } else {
            try{
                let parseJsonlist = fs.readFileSync(`./data/guildData/${interaction.guild.id}/users/${interaction.user.id}.json`);
                parseJsonlist = JSON.parse(parseJsonlist);
                let newUser = new guild.User(parseJsonlist.id, parseJsonlist.tag);
                newUser.toUser(parseJsonlist);
                element.addUser(newUser);
            } catch (err) {
                console.error(err);
            }
        }
    } else {
        userData.tag = interaction.user.tag;
        userData.saveTime = 0;
    }
    
    //????????????
    if (!interaction.isCommand()) return;

    //????????????ID?????????????????????(????????????)?????????
    let commandName = "";
    if(!!interaction.options.getSubcommand(false)) commandName = interaction.commandName + "/" + interaction.options.getSubcommand(false);
    else commandName = interaction.commandName;
    console.log("isInteraction: isCommand: " + commandName + ", tag: " + interaction.user.tag + ", guild: " + interaction.guild.name)
	const command = client.commands.get(interaction.commandName);
	if (!command) return;

	try {
        if(command.tag === "interaction") await command.execute(interaction);
        if(command.tag === "gacha") await command.execute(interaction, gachaData);
		if(command.tag === "guildInfo") await command.execute(interaction, guildInformation.get(interaction.guild.id));
		//if(command.tag === "musicList") await command.execute(interaction, musicList.get(interaction.guild.id));

	} catch (error) {
		console.error(error);
        if(interaction.replied) 
		    interaction.editReply({ content: '??????! ?????????????????????!', embeds: [], components: [] });
        else
		    interaction.reply({ content: '??????! ?????????????????????!', ephemeral: true });
	}
});

client.on('messageCreate', async msg =>{
    if(!isready) return;
    if(!msg.guild || !msg.member) return; //??????????????????guild?????? = ???????????????(??????)
    if(msg.webhookId) return;
    
    if(msg.author.id === process.env.OWNER1_ID || msg.author.id === process.env.OWNER2_ID){
        if(msg.content.startsWith("bet^s")){
            guildInformation.forEach(async (val, key) => {
                fs.writeFile(`./data/guildData/${key}/basicInfo.json`, JSON.stringify(val, null, '\t'),async function (err) {
                    if (err)
                        return console.log(err);
                });
                fs.writeFile(`./data/guildData/${key}/betInfo.json`, JSON.stringify(val.betInfo, null, '\t'),async function (err) {
                    if (err)
                        return console.log(err);
                });
                val.users.forEach((ele, id) => {
                    fs.writeFile(`./data/guildData/${key}/users/${ele.id}.json`, JSON.stringify(ele, null, '\t'),async function (err) {
                        if (err)
                            return console.log(err);
                    });
                    ele.saveTime++;
                    if(ele.saveTime > 3) val.users.delete(id);
                });
                fs.readdirSync(`./data/guildData/${key}/awardBox`).forEach(box => {
                    let awardBox = new guild.betAwardBox(0, 0, 0);
                    awardBox.toAwardBoxObject(
                        JSON.parse(
                            fs.readFileSync(`./data/guildData/${key}/awardBox/${box}`)
                        )
                    );
                    if(awardBox.endTime < Date.now()) {
                        fs.unlink(`./data/guildData/${key}/awardBox/${box}`, function () {
                            console.log(`??????: ${val.name} ???????????? ID: ${awardBox.id} (????????????)`);
                        });
                    }
                });
            });
            let time = new Date();
            console.log(`Saved in ${time} (handle)`);
            //TODO: ???????????????????????????
            /*
            client.channels.fetch(process.env.CHECK_CH_ID).then(channel => channel.send(`????????????: <t:${Math.floor(Date.now() / 1000)}:F>`)).catch(err => console.log(err));
            */
        }else if(msg.content.startsWith("bet^t")){
            console.log(guildInformation.get(msg.guild.id));
        }else if(msg.content.startsWith("bet^a")){
            console.log(guildInformation.get(msg.guild.id).getUser(msg.author.id).saveTime=10);
        }else if(msg.content.startsWith(".say")){
            const word = msg.content.split(/\s+/);
            if(!word[1]) return;
            if(!Number.isNaN(parseInt(word[1]))){
                let matches = word[1].match(/^<#!?(\d+)>$/) ?? word[1].match(/\d+/);
                if (!matches) return;
                if(matches[0].startsWith("<")) matches = matches[1]; else matches = matches[0];
                let channelt = client.channels.cache.get(matches);
                channelt.send(msg.content.substring(word[0].length + word[1].length + 2))
            }else{
                msg.channel.send(msg.content.substring(word[0].length + 1));
            }
            msg.delete().catch(() => {});
        }else if(msg.content.startsWith("bet^gu")){
            gachaData = fs.readFileSync(`./data/gacha.json`);
            gachaData = JSON.parse(gachaData);
        }
    }
})