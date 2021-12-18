const { SlashCommandBuilder } = require('@discordjs/builders');
const guild = require('../functions/guildInfo');
const fs = require('fs');
const Discord = require('discord.js');
const { resourceLimits } = require('worker_threads');

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
            
                const msg = await interaction.reply({content: "請選擇一個下注的對象。關於選項的說明請查看/bet info。", components: [row], fetchReply: true});

                const collector = msg.createMessageComponentCollector({time: 120 * 1000 });

                let target = "";
                let money = 0;
                let isMoneySet = false;

                collector.on('collect', async i => {
                    if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
                    if(!target) {
                        target = i.values[0];
                        const row = rowCreate(false);
                        const targetData = guildInformation.betInfo.option.find(element => element.id === target);
                        i.update({
                            content: 
                                `選擇的選項為: ${targetData.name}` +  
                                `目前持有金額為: \$${guildInformation.getUser(interaction.user.id).coins} coin(s)\n請輸入下注金額。`, 
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
                            const targetData = guildInformation.betInfo.option.find(element => element.id === target);
                            i.update({
                                content: 
                                    `選擇的選項為: ${targetData.name}\n` + 
                                    `目前持有金額為: \$${guildInformation.getUser(interaction.user.id).coins} coin(s)\n` + 
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
                                if(guildInformation.getUser(interaction.user.id).coins <= 0) {
                                    return i.update({
                                        content: `持有coin(s)並不足以支付本次下注。`, 
                                        components: []
                                    });
                                }
                                if(guildInformation.betInfo.isPlaying !== 1){
                                    return i.update({
                                        content: `投注期限已過，無法再投注。`, 
                                        components: []
                                    });
                                }
                                const targetData = guildInformation.betInfo.option.find(element => element.id === target);
                                guildInformation.getUser(interaction.user.id).coins -= money;
                                guildInformation.getUser(interaction.user.id).totalBet += money;
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
                    defaultRaceData[value] = JSON.parse(text);
                    defaultRaseRowData.push({
                        label: defaultRaceData[value].name,
                        value: value.toString(),
                        description: defaultRaceData[value].description,
                    });
                });
            });
            
            let mode = "";
            let chooseBetID = -1;
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

            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });
            
            collector.on('collect', async i => {
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
                if(!mode) {
                    mode = i.customId;
                    if(mode === "default"){
                        if(raseFileName.length === 0) {
                            i.update({content: "目前沒有可以選擇的預設模板。", components: [], fetchReply: true});
                        }
                        collector.resetTimer({ time: 120 * 1000 });
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
                    if(chooseBetID === -1) {
                        chooseBetID = i.values;
                        collector.resetTimer({ time: 120 * 1000 });
                        const embed = new Discord.MessageEmbed()
                            .setColor(process.env.EMBEDCOLOR)
                            .setTitle(`模板: ${defaultRaceData[i.values].name} 預覽`)
                            .setDescription(defaultRaceData[i.values].description)
                            .setTimestamp()
                            .setFooter(`${interaction.client.user.tag}`,interaction.client.user.displayAvatarURL({dynamic: true}));
                        defaultRaceData[i.values].option.forEach(ele => {
                            embed.addField(ele.name, ele.description);
                        })
                        const row = new Discord.MessageActionRow()
                        .addComponents(
                            [
                                new Discord.MessageButton()
                                    .setCustomId('promise')
                                    .setLabel('確認開啟賭盤')
                                    .setStyle('PRIMARY'),
                            ]
                        );
                        i.update({content: "此為模板預覽，確認後請點擊下方按鈕以開啟賭盤。",embeds: [embed], components: [row], fetchReply: true})
                    
                    } else {
                        if(guildInformation.betInfo.isPlaying !== 1) {
                            return i.update({
                                content: `已經有其他賭盤正在執行，無法開啟賭盤。`, 
                                embeds: [],
                                components: []
                            });
                        }
                        guildInformation.betInfo.count++;
                        /**
                         * @type {Array<guild.betGameOptionObject>}
                         */
                        let betOptions = [];
                        defaultRaceData[chooseBetID].option.forEach(element => {
                            betOptions.push(
                                new guild.betGameOptionObject(
                                    element.id,
                                    element.name,
                                    element.description
                                )
                            )
                        })
                        guildInformation.betInfo = new guild.betGameObject(
                            defaultRaceData[chooseBetID].name,
                            guildInformation.betInfo.count,
                            defaultRaceData[chooseBetID].description,
                            betOptions,
                            1,
                            guildInformation.betInfo.count,
                            []
                        )
                        i.update({
                            content: `設定完成。已將賭盤設為 ${defaultRaceData[chooseBetID].name}。從現在開始所有用戶可以下注。`,
                            embeds: [],
                            components: []
                        });
                        collector.stop("set");
                    }
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

            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });
            
            collector.on('collect', async i => {
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
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
            
            let optionData = [];
            guildInformation.betInfo.option.forEach(option => {
                optionData.push({
                    label: option.name,
                    value: option.id,
                    description: `累計賭金: ${option.betCount} coin(s) ` + 
                        `賠率: ${option.betCount>0 ? Math.floor((guildInformation.betInfo.totalBet / option.betCount) * 10) / 10 : "尚無法計算賠率"}`
                });
            })
            optionData.push({
                label: "取消賭盤",
                value: "cancel",
                description: `取消賭盤，並向所有投注的用戶發還他們投注的coin(s)。`
            })
            const row = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageSelectMenu()
                    .setCustomId('optionSelect')
                    .setPlaceholder('選擇要下注的對象')
                    .addOptions(optionData),
            );
        
            const msg = await interaction.reply({content: "請選擇要開盤的對象。", components: [row], fetchReply: true});

            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });
            let target = "";

            collector.on('collect', async i => {
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
                if(!target) {
                    target = i.values[0];
                    const row = new Discord.MessageActionRow()
                    .addComponents(
                        [
                            new Discord.MessageButton()
                                .setCustomId('promise')
                                .setLabel('確認開盤')
                                .setStyle('PRIMARY'),
                        ]
                    );
                    const targetData = guildInformation.betInfo.option.find(element => element.id === target) ?? {name: "取消賭盤"};
                    i.update({
                        content: `目前要開盤的選項為: ${targetData.name}。確認選項無誤，請按下下方按鈕。`, 
                        components: [row]
                    });
                    collector.resetTimer({ time: 180 * 1000 });

                } else {
                    if(target === "cancel") {
                        let rebackList = new Map();
                        guildInformation.betInfo.betRecord.forEach(element => {
                            guildInformation.getUser(element.userId).coins += element.coins;
                            rebackList.set(element.userId, rebackList.get(element.userId) ? rebackList.get(element.userId) + element.coins : element.coins)
                        })
                        rebackList.forEach((val, key) => {
                            interaction.client.users.fetch(key).then(user => {
                                user.send(`**${interaction.guild.name}** 伺服器中的賭盤「${guildInformation.betInfo.name}」已取消。\n` + 
                                    `已將您賭注的 ${val} coin(s) 發還。`).catch((err) => console.log(err))
                            })
                            guildInformation.getUser(key).joinTimes += 1;
                        })
                        guildInformation.betInfo.isPlaying = 0;
                        i.update({
                            content: `已取消賭盤，正在發還coin(s)。`, 
                            components: []
                        });
                        guildInformation.betRecord.push(new guild.betRecordObject(
                            guildInformation.betInfo.name,
                            guildInformation.betInfo.id,
                            guildInformation.betInfo.description,
                            guildInformation.betInfo.option,
                            {
                                "name": "賭盤取消",
                                "id": "0",
                                "description": "本次賭盤取消，所有coin(s)退回原投注者。",
				                "betCount": 0
                            },
                        ))
                        
                    } else {
                        let rebackList = new Map();
                        const winOption = guildInformation.betInfo.option.find(element => element.id === target);
                        guildInformation.betInfo.betRecord.forEach(element => {
                            if(element.id !== winOption.id) return;
                            let coinGet = Math.floor(element.coins * (Math.floor((guildInformation.betInfo.totalBet / winOption.betCount) * 10) / 10));
                            guildInformation.getUser(element.userId).coins += coinGet;
                            guildInformation.getUser(element.userId).totalGet += coinGet;
                            rebackList.set(element.userId, rebackList.get(element.userId) ? rebackList.get(element.userId) + coinGet : coinGet)
                        })
                        rebackList.forEach((val, key) => {
                            interaction.client.users.fetch(key).then(user => {
                                user.send(`恭喜您在 **${interaction.guild.name}** 伺服器中的賭盤「${guildInformation.betInfo.name}」中贏得投注!\n` + 
                                    `已將您獲得的 ${val} coin(s)發還。`).catch((err) => console.log(err))
                            })
                            guildInformation.getUser(key).joinTimes += 1;
                        })
                        guildInformation.betInfo.isPlaying = 0;
                        i.update({
                            content: `本次賭盤獲勝選項為 ${winOption.name}。已將所有coin(s)發還。`, 
                            components: []
                        });
                        guildInformation.betRecord.push(new guild.betRecordObject(
                            guildInformation.betInfo.name,
                            guildInformation.betInfo.id,
                            guildInformation.betInfo.description,
                            guildInformation.betInfo.option,
                            winOption,
                        ))
                    }
                }
            });

            collector.on('end', (c, r) => {
                if(r !== "messageDelete" && r !== "user" && r !== "set"){
                    interaction.editReply({
                        content: `取消開盤。`, 
                        components: []
                    });
                }
            });

        } else if(interaction.options.getSubcommand() === 'setting') {

            const row = new Discord.MessageActionRow()
            .addComponents(
                [
                    new Discord.MessageButton()
                        .setCustomId('all')
                        .setLabel('顯示所有投注紀錄')
                        .setStyle('PRIMARY'),
                    new Discord.MessageButton()
                        .setCustomId('reset')
                        .setLabel('重置所有人的coin(s)')
                        .setStyle('PRIMARY'),
                ]
            );
            const msg = await interaction.reply({
                content: "請選擇要執行的項目。", 
                components: [row], 
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });
            let optionChoose = "";

            collector.on('collect', async i => {
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
                if(!optionChoose) {
                    optionChoose = i.customId;

                    if(optionChoose === "all") {
                        if(guildInformation.betInfo.isPlaying === 0) 
                            return interaction.reply({content: "目前並未舉行賭盤。", ephemeral: true});

                        if(guildInformation.betInfo.betRecord.length === 0) 
                            return interaction.reply({content: "本次賭盤尚未有投注紀錄。", ephemeral: true});

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
                        if(guildInformation.betInfo.isPlaying !== 0) 
                            return interaction.reply({content: "請先關閉當前賭盤再執行本操作。", ephemeral: true});

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
                            content: "即將重置所有人的coin，此操作無法反悔。確認刪除?請點選下方按鈕確認。", 
                            components: [row], 
                            fetchReply: true
                        });
                    }
                    
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
                    for(let i = 0; i < guildInformation.users.length; i++) {
                        guildInformation.users[i].coins = 100;
                        guildInformation.users[i].lastAwardTime = 0;
                    }
                    i.update({
                        content: `已重置所有人的持有coin(s)。`, 
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