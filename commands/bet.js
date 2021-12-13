const { SlashCommandBuilder } = require('@discordjs/builders');
const guild = require('../functions/guildInfo');
const fs = require('fs');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bet')
        .setDescription('下注')
        .addSubcommand(opt =>
            opt.setName('play')
            .setDescription('下注')
        ).addSubcommand(opt =>
            opt.setName('info')
            .setDescription('目前賭盤情形，查看選項、賠率等')
        ).addSubcommand(opt =>
            opt.setName('set')
            .setDescription('設定賭盤(由管理員操控)')
        ).addSubcommand(opt =>
            opt.setName('close')
            .setDescription('關閉賭盤(由管理員操控)')
        ).addSubcommand(opt =>
            opt.setName('result')
            .setDescription('開盤(由管理員操控)')
        ).addSubcommand(opt =>
            opt.setName('setting')
            .setDescription('其他細節設定(顯示所有投注紀錄、重設所有紀錄、指定分發/回收coins)(由管理員操控)')
        ),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation
     */
	async execute(interaction, guildInformation) {
        if (interaction.options.getSubcommand() === 'play') {
            if(guildInformation.betInfo.isPlaying === 0) 
                return interaction.reply({content: "目前並未舉行賭盤活動，活動舉行請洽伺服器管理員。", ephemeral: true});
            if(guildInformation.betInfo.isPlaying === 2) 
                return interaction.reply({content: "賭盤已封盤，無法再下注。", ephemeral: true});

                let playRaseRowData = [];
                guildInformation.betInfo.option.forEach(option => {
                    playRaseRowData.push({
                        label: option.name,
                        value: option.id,
                        description: `累計賭金: ${option.betCount} coin(s) ` + 
                            `賠率: ${option.betCount>0 ? Math.floor((guildInformation.betInfo.totalBet / option.betCount) * 10) / 10 : "尚無法計算賠率"}`
                    });
                })
                const row = new Discord.MessageActionRow()
                .addComponents(
                    new Discord.MessageSelectMenu()
                        .setCustomId('optionSelect')
                        .setPlaceholder('選擇要下注的對象')
                        .addOptions(playRaseRowData),
                );
            
                const msg = await interaction.reply({content: "請選擇一個下注的對象。", components: [row], fetchReply: true});

                const filter = i => i.user.id === interaction.user.id;
                const collector = msg.createMessageComponentCollector({filter, time: 60 * 1000 });

                let target = "";
                let money = 0;
                let isMoneySet = false;

                collector.on('collect', async i => {
                    if(!target) {
                        target = i.values[0];
                        const row = rowCreate(false);
                        i.update({
                            content: `目前持有金額為: \$${guildInformation.getUser(interaction.user.id).coins} coin(s)\n請輸入下注金額。`, 
                            components: row
                        });
                        collector.resetTimer({ time: 180 * 1000 });
                    } else if (!isMoneySet) {
                        collector.resetTimer({ time: 180 * 1000 });
                        if(i.customId === 'delete') {
                            money = Math.floor(money / 10);
                        } else if(i.customId === 'complete') {
                            isMoneySet = true;
                        } else {
                            money += i.customId;
                            money = Math.min(money, guildInformation.getUser(interaction.user.id).coins);
                        }
                        if(!isMoneySet) {
                            const row = rowCreate(money >= guildInformation.getUser(interaction.user.id).coins);
                            i.update({
                                content: `目前持有金額為: \$${guildInformation.getUser(interaction.user.id).coins} coin(s)\n` + 
                                    `請輸入下注金額。\n\`\`\`\n下注金額: \$${money} coin(s)\n\`\`\``, 
                                components: row
                            });
                        } else {
                            if(money === 0) {
                                i.update({
                                    content: `因為輸入金額為 0 coin，因此取消下注。`, 
                                    components: []
                                });
                            } else {
                                const targetData = guildInformation.betInfo.option.find(element => element.id === target);
                                guildInformation.getUser(interaction.user.id).coins -= money;
                                guildInformation.betInfo.betRecord.push(
                                    new guild.betGameResultObject(interaction.user.id, money, target)
                                );
                                targetData.betCount += money;
                                guildInformation.betInfo.totalBet += money;
                                i.update({
                                    content: `下注成功!\n對象: ${targetData.name}\n金額: ${money} coin(s)`, 
                                    components: []
                                });
                            }
                            collector.stop("set");
                        }
                    }
                });

                collector.on('end', (c, r) => {
                    if(r !== "messageDelete" && r !== "user" && r !== "set"){
                        interaction.editReply({
                            content: `取消下注。`, 
                            components: []
                        });
                    }
                });

        } else if(interaction.options.getSubcommand() === 'info') {
            if(guildInformation.betInfo.isPlaying === 0) 
                return interaction.reply({content: "目前並未舉行賭盤活動，活動舉行請洽伺服器管理員。", ephemeral: true});

            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`目前賭盤: ${guildInformation.betInfo.name} | ${guildInformation.betInfo.isPlaying === 1 ? "投注中" : "封盤中"}`)
                .setDescription(guildInformation.betInfo.description)
                .setTimestamp()
                .setFooter(`${interaction.guild.name}`,`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`);

            guildInformation.betInfo.option.forEach(option => {
                embed.addField(option.name, option.description + `\n累計賭金: ${option.betCount} coin(s) \n` +
                    `賠率: ${option.betCount>0 ? Math.floor((guildInformation.betInfo.totalBet / option.betCount) * 10) / 10 : "尚無法計算賠率"}`)
            })
            interaction.reply({embeds: [embed]});

        } else {
            //權限
            if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD)){ 
                return interaction.reply({content: "此指令需要管理伺服器的權限才能使用。", ephemeral: true});
            }
        }
        
        if(interaction.options.getSubcommand() === 'set') {
            if(guildInformation.betInfo.isPlaying != 0) 
                return interaction.reply({content: "目前已有其他賭盤進行中，請先關閉其他賭盤再建立新賭盤。", ephemeral: true});
            
            let defaultRaceData = [];
            let defaultRaseRowData = [];
            const raseFileName = fs.readdirSync('data/raseData').filter(file => file.endsWith('.json'));
            raseFileName.forEach((fileName, value) => {
                fs.readFile(`data/raseData/${fileName}`,async (err, text) => {
                    if (err)
                        throw err;
                    defaultRaceData.push(JSON.parse(text));
                    defaultRaseRowData.push({
                        label: defaultRaceData[value].name,
                        value: value.toString(),
                        description: defaultRaceData[value].description,
                    });
                });
            });
            
            let mode = "";
            const row = new Discord.MessageActionRow()
            .addComponents(
                [
                    new Discord.MessageButton()
                        .setCustomId('default')
                        .setLabel('從預設清單中選擇')
                        .setStyle('PRIMARY'),
                    new Discord.MessageButton()
                        .setCustomId('custom')
                        .setLabel('自行設定')
                        .setStyle('PRIMARY')
                ]
            );
            const msg = await interaction.reply({content: "請選擇設定模式(尚未支援自行設定)", components: [row], fetchReply: true});

            const filter = i => i.user.id === interaction.user.id;
            const collector = msg.createMessageComponentCollector({filter, time: 60 * 1000 });
            
            collector.on('collect', async i => {
                if(!mode) {
                    mode = i.customId;
                    if(mode === "default"){
                        collector.resetTimer({ time: 60 * 1000 });
                        const row = new Discord.MessageActionRow()
                        .addComponents(
                            new Discord.MessageSelectMenu()
                                .setCustomId('raceSelect')
                                .setPlaceholder('選擇一個預設模板')
                                .addOptions(defaultRaseRowData),
                        );
                    
                        i.update({content: "請選擇一個預設模板。", components: [row], fetchReply: true});

                    } else if(mode === "custom") {
                        i.update({content: "目前並不支援此設定模式。", components: [], fetchReply: true});
                        //TODO: 自行設定賭盤
                    }
                
                } else if(mode === 'default') {
                    //TODO: 選擇後顯示摩版內容，再讓使用者選擇是否開啟賭盤
                    guildInformation.betInfo.count++;
                    /**
                     * @type {Array<guild.betGameOptionObject>}
                     */
                    let betOptions = [];
                    defaultRaceData[i.values].option.forEach(element => {
                        betOptions.push(
                            new guild.betGameOptionObject(
                                element.id,
                                element.name,
                                element.description
                            )
                        )
                    })
                    guildInformation.betInfo = new guild.betGameObject(
                        defaultRaceData[i.values].name,
                        guildInformation.betInfo.count,
                        defaultRaceData[i.values].description,
                        betOptions,
                        1,
                        guildInformation.betInfo.count,
                        []
                    )
                    i.update({
                        content: `設定完成。已將賭盤設為 ${defaultRaceData[i.values].name}。從現在開始所有用戶可以下注。`, 
                        components: []
                    });
                    collector.stop("set");
                }
            });

            collector.on('end', (c, r) => {
                if(r !== "messageDelete" && r !== "user" && r !== "set"){
                    interaction.editReply({
                        content: `取消設定。`, 
                        components: []
                    });
                }
            });
            

        } else if(interaction.options.getSubcommand() === 'close') {
            if(guildInformation.betInfo.isPlaying != 1) 
                return interaction.reply({content: "找不到目前能封盤的賭盤。", ephemeral: true});
            
            const row = new Discord.MessageActionRow()
            .addComponents(
                [
                    new Discord.MessageButton()
                        .setCustomId('promise')
                        .setLabel('確認封盤')
                        .setStyle('PRIMARY'),
                ]
            );
            const msg = await interaction.reply({content: "確定封盤?請點選下方按鈕確認。", components: [row], fetchReply: true});

            const filter = i => i.user.id === interaction.user.id;
            const collector = msg.createMessageComponentCollector({filter, time: 60 * 1000 });
            
            collector.on('collect', async i => {
                guildInformation.betInfo.isPlaying = 2;
                i.update({
                    content: `封盤完成。`, 
                    components: []
                })
                collector.stop("set");
            });

            collector.on('end', (c, r) => {
                if(r !== "messageDelete" && r !== "user" && r !== "set"){
                    interaction.editReply({
                        content: `取消封盤。`, 
                        components: []
                    });
                }
            });

        } else if(interaction.options.getSubcommand() === 'result') {
            if(guildInformation.betInfo.isPlaying != 2) 
                return interaction.reply({content: "找不到目前能開盤的賭盤。", ephemeral: true});
            //TODO: 回發部分

        } else if(interaction.options.getSubcommand() === 'setting') {
            if(guildInformation.betInfo.isPlaying === 0) 
                return interaction.reply({content: "目前並未舉行賭盤。", ephemeral: true});

            if(guildInformation.betInfo.betRecord.length === 0) 
                return interaction.reply({content: "本次賭盤尚未有投注紀錄。", ephemeral: true});


            const row = new Discord.MessageActionRow()
            .addComponents(
                [
                    new Discord.MessageButton()
                        .setCustomId('all')
                        .setLabel('顯示所有投注紀錄')
                        .setStyle('PRIMARY'),
                    new Discord.MessageButton()
                        .setCustomId('reset')
                        .setLabel('清除所有(包含過往)投注紀錄與持有金錢')
                        .setStyle('PRIMARY'),
                        new Discord.MessageButton()
                        .setCustomId('give')
                        .setLabel('發放特定用戶coin(s)')
                        .setStyle('PRIMARY'),
                    new Discord.MessageButton()
                        .setCustomId('take')
                        .setLabel('回收特定用戶coin(s)')
                        .setStyle('PRIMARY'),
                ]
            );
            const msg = await interaction.reply({
                content: "請選擇要執行的項目。", 
                components: [row], 
                fetchReply: true
            });

            const filter = i => i.user.id === interaction.user.id;
            const collector = msg.createMessageComponentCollector({filter, time: 60 * 1000 });
            let optionChoose = "";

            collector.on('collect', async i => {
                if(!optionChoose) {
                    optionChoose = i.customId;

                    if(optionChoose === "all") {
                        const row = new Discord.MessageActionRow()
                        .addComponents(
                            [
                                new Discord.MessageButton()
                                    .setCustomId('promise')
                                    .setLabel('確認顯示')
                                    .setStyle('PRIMARY'),
                            ]
                        );
                        i.update({
                            content: "即將顯示所有下注紀錄，內容可能會造成洗版。確認顯示?請點選下方按鈕確認。", 
                            components: [row], 
                            fetchReply: true
                        });
                    } else if(optionChoose === 'reset') {
                        const row = new Discord.MessageActionRow()
                        .addComponents(
                            [
                                new Discord.MessageButton()
                                    .setCustomId('promise')
                                    .setLabel('確認刪除')
                                    .setStyle('PRIMARY'),
                            ]
                        );
                        i.update({
                            content: "即將刪除所有紀錄，包含過往紀錄與持有金錢等，**無法反悔**。確認刪除?請點選下方按鈕確認。", 
                            components: [row], 
                            fetchReply: true
                        });
                    }
                    //TODO: 其他設定項
                } else if(optionChoose === "all") {
                    i.update({
                        content: `即將顯示所有下注紀錄。`, 
                        components: []
                    })
                    const onePpageMax = 20;
                    for(let i = 0; i < Math.floor((guildInformation.betInfo.betRecord.length - 1) / onePpageMax) + 1; i++) {
                        const embed = new Discord.MessageEmbed()
                        .setColor(process.env.EMBEDCOLOR)
                        .setTitle(`目前賭盤: ${guildInformation.betInfo.name} | ${guildInformation.betInfo.isPlaying === 1 ? "投注中" : "封盤中"}`)
                        .setDescription(guildInformation.betInfo.description)
                        .setTimestamp()
                        .setFooter(`${interaction.guild.name} | 第 ${i + 1} 頁`,
                            `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`);
                        
                        let nameStr = [];
                        let coinStr = [];
                        let targetStr = [];
                        for(let j = i * onePpageMax; j < Math.min(i * onePpageMax + onePpageMax, guildInformation.betInfo.betRecord.length); j++) {
                            const target = guildInformation.betInfo.option.find(element => element.id === guildInformation.betInfo.betRecord[j].optionId);
                            nameStr.push('<@' + guildInformation.betInfo.betRecord[j].userId + '>');
                            coinStr.push(guildInformation.betInfo.betRecord[j].coins.toString());
                            targetStr.push(target.name);
                        }
                        embed
                            .addField('用戶名稱', nameStr.join('\n'), true)
                            .addField('投注金額', coinStr.join('\n'), true)
                            .addField('投注對象', targetStr.join('\n'), true);

                        await interaction.channel.send({embeds: [embed]});
                    }
                    collector.stop("set");
                } else if(optionChoose === 'reset') {
                    guildInformation.betInfo = new guild.betGameObject('undefined', 0, 'nothing', [], 0, 0, []);
                    for(let i = 0; i < guildInformation.users.length; i++) {
                        guildInformation.users[i].coins = 100;
                        guildInformation.users[i].lastAwardTime = 0;
                    }
                    i.update({
                        content: `已刪除所有資訊。`, 
                        components: []
                    });
                    collector.stop("set");
                }
            });

            collector.on('end', (c, r) => {
                if(r !== "messageDelete" && r !== "user" && r !== "set"){
                    interaction.editReply({
                        content: `取消顯示。`, 
                        components: []
                    });
                }
            });
        }
	},
};

/**
 * 
 * @param {boolean} isOver 
 * @returns 
 */
function rowCreate(isOver) {
    return [
        new Discord.MessageActionRow()
            .addComponents([
                new Discord.MessageButton()
                    .setLabel('1')
                    .setCustomId('1')
                    .setStyle('SECONDARY')
                    .setDisabled(isOver),
                new Discord.MessageButton()
                    .setLabel('2')
                    .setCustomId('2')
                    .setStyle('SECONDARY')
                    .setDisabled(isOver),
                new Discord.MessageButton()
                    .setLabel('3')
                    .setCustomId('3')
                    .setStyle('SECONDARY')
                    .setDisabled(isOver),
                new Discord.MessageButton()
                    .setLabel('4')
                    .setCustomId('4')
                    .setStyle('SECONDARY')
                    .setDisabled(isOver),
                new Discord.MessageButton()
                    .setLabel('5')
                    .setCustomId('5')
                    .setStyle('SECONDARY')
                    .setDisabled(isOver),
            ]), 
        new Discord.MessageActionRow()
            .addComponents([
                new Discord.MessageButton()
                    .setLabel('6')
                    .setCustomId('6')
                    .setStyle('SECONDARY')
                    .setDisabled(isOver),
                new Discord.MessageButton()
                    .setLabel('7')
                    .setCustomId('7')
                    .setStyle('SECONDARY')
                    .setDisabled(isOver),
                new Discord.MessageButton()
                    .setLabel('8')
                    .setCustomId('8')
                    .setStyle('SECONDARY')
                    .setDisabled(isOver),
                new Discord.MessageButton()
                    .setLabel('9')
                    .setCustomId('9')
                    .setStyle('SECONDARY')
                    .setDisabled(isOver),
                new Discord.MessageButton()
                    .setLabel('0')
                    .setCustomId('0')
                    .setStyle('SECONDARY')
                    .setDisabled(isOver),
            ]),
        new Discord.MessageActionRow()
            .addComponents([
                new Discord.MessageButton()
                    .setLabel('刪除一格')
                    .setCustomId('delete')
                    .setStyle('PRIMARY'),
                
                new Discord.MessageButton()
                    .setLabel('決定')
                    .setCustomId('complete')
                    .setStyle('SUCCESS')
                    .setDisabled(false),
            ]),
    ];
}