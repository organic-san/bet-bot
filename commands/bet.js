const guild = require('../functions/guildInfo');
const fs = require('fs');
const Discord = require('discord.js');
const user = require('./user');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('bet')
        .setDescription('下注')
        .addSubcommand(opt =>
            opt.setName('play')
                .setDescription('下注')
        ).addSubcommand(opt =>
            opt.setName('info')
                .setDescription('目前投注情形，查看選項、賠率等')
        ).addSubcommand(opt =>
            opt.setName('create')
                .setDescription('設定投注(由管理員操控)')
        ).addSubcommand(opt =>
            opt.setName('close')
                .setDescription('關閉投注(由管理員操控)')
        ).addSubcommand(opt =>
            opt.setName('auto-close')
                .setDescription('設定自動關閉投注的時間(由管理員操控)')
                .addStringOption(opt =>
                    opt.setName('date')
                        .setDescription('設定自動封盤日期，請依以下格式輸入: yyyy/mm/dd hh:mm:ss (GMT+8時間)')
                        .setRequired(true)
                )
        ).addSubcommand(opt =>
            opt.setName('result')
                .setDescription('開盤(由管理員操控)')
        ).addSubcommand(opt =>
            opt.setName('resultsp')
                .setDescription('開盤(特殊版)(由管理員操控)')
        ),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.guildInformation} guildInformation
     */
    async execute(interaction, guildInformation) {

        if (guildInformation.betInfo.autoClose && (guildInformation.betInfo.autoCloseDate < Date.now())) {
            guildInformation.betInfo.isPlaying = 2;
            fs.writeFile(
                `./data/guildData/${guildInformation.id}/betInfo.json`,
                JSON.stringify(guildInformation.betInfo, null, '\t'), async function (err) {
                    if (err)
                        return console.log(err);
                });
        }

        if (interaction.options.getSubcommand() === 'play') {
            if (guildInformation.betInfo.isPlaying === 0)
                return interaction.reply({ content: "目前並未舉行投注活動，活動舉行請洽伺服器管理員。", ephemeral: true });
            if (guildInformation.betInfo.isPlaying === 2)
                return interaction.reply({ content: "投注已封盤，無法再下注。", ephemeral: true });

            let playRaseRowData = [];
            guildInformation.betInfo.option.forEach(option => {
                let odds = oddsCalc(option.betCount, guildInformation.betInfo.totalBet, guildInformation.taxRate);
                playRaseRowData.push({
                    label: option.name,
                    value: option.id,
                    description: `累計賭金: ${option.betCount} coin(s) ` +
                        `賠率: ${odds === 0 ? "尚無法計算賠率" : odds}`
                });
            })
            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.StringSelectMenuBuilder()
                        .setCustomId('optionSelect')
                        .setPlaceholder('選擇要下注的對象')
                        .addOptions(playRaseRowData),
                );

            const msg = await interaction.reply({ content: "請選擇一個下注的對象。關於選項的說明請查看/bet info。", components: [row], fetchReply: true });

            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });

            let target = "";
            let money = 0;
            let isMoneySet = false;

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                await i.deferUpdate();
                if (!target) {
                    target = i.values[0];
                    const row = rowCreate(false);
                    const targetData = guildInformation.betInfo.getOption(target);
                    i.editReply({
                        content:
                            `選擇的選項為: ${targetData.name}\n` +
                            `目前持有金額為: \$${guildInformation.getUser(interaction.user.id).coins} coin(s)\n請輸入下注金額(單次投注最低 $100 coins)。`,
                        components: row
                    });
                    collector.resetTimer({ time: 120 * 1000 });

                } else if (!isMoneySet) {
                    if (i.customId === 'delete') {
                        money = Math.floor(money / 10);
                    } else if (i.customId === 'complete') {
                        isMoneySet = true;
                    } else {
                        money += i.customId;
                        money = Math.min(money, guildInformation.getUser(interaction.user.id).coins);
                    }
                    if (!isMoneySet) {
                        const row = rowCreate(money >= guildInformation.getUser(interaction.user.id).coins);
                        const targetData = guildInformation.betInfo.option.find(element => element.id === target);
                        i.editReply({
                            content:
                                `選擇的選項為: ${targetData.name}\n` +
                                `目前持有金額為: \$${guildInformation.getUser(interaction.user.id).coins} coin(s)\n` +
                                `請輸入下注金額(單次投注最低 $100 coins)。\n\`\`\`\n下注金額: \$${money} coin(s)\n\`\`\``,
                            components: row
                        });
                    } else {

                        if (money === 0) {
                            i.editReply({
                                content: `因為輸入金額為 0 coin，因此取消下注。`,
                                components: []
                            });

                        } else {
                            if (guildInformation.getUser(interaction.user.id).coins - money < 0) {
                                return i.editReply({
                                    content: `持有coin(s)並不足以支付本次下注。`,
                                    components: []
                                });
                            }

                            if (money < 100) {
                                return i.editReply({
                                    content: `需要投注至少 $100 coins 才能完成投注。`,
                                    components: []
                                });
                            }

                            if (guildInformation.betInfo.isPlaying !== 1) {
                                return i.editReply({
                                    content: `投注期限已過，無法再投注。`,
                                    components: []
                                });
                            }

                            const targetData = guildInformation.betInfo.getOption(target);
                            guildInformation.getUser(interaction.user.id).coins -= money;
                            guildInformation.getUser(interaction.user.id).totalBet += money;
                            guildInformation.betInfo.addRecord(interaction.user.id, target, money);
                            targetData.betCount += money;
                            guildInformation.betInfo.totalBet += money;
                            fs.writeFile(
                                `./data/guildData/${guildInformation.id}/users/${guildInformation.getUser(interaction.user.id).id}.json`,
                                JSON.stringify(guildInformation.getUser(interaction.user.id), null, '\t'), async function (err) {
                                    if (err)
                                        return console.log(err);
                                });
                            i.editReply({
                                content: `下注成功!\n對象: ${targetData.name}\n金額: ${money} coin(s)`,
                                components: []
                            });
                        }
                        collector.stop("set");
                    }
                }
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消下注。`,
                        components: []
                    });
                }
            });

        } else if (interaction.options.getSubcommand() === 'info') {
            if (guildInformation.betInfo.isPlaying === 0)
                return interaction.reply({ content: "目前並未舉行投注活動，活動舉行請洽伺服器管理員。", ephemeral: true });

            const embed = new Discord.EmbedBuilder()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`目前投注: ${guildInformation.betInfo.name} | ${guildInformation.betInfo.isPlaying === 1 ? "🟢投注中" : "🔴封盤中"}`)
                .setDescription(guildInformation.betInfo.description)
                .addFields({
                    name: `目前投注資訊`,
                    value: `選項數量: ${guildInformation.betInfo.option.length}\n` +
                        `總累計賭金:  ${guildInformation.betInfo.totalBet}` +
                        `${guildInformation.betInfo.autoClose ? `\n` +
                            `自動封盤時間: <t:${guildInformation.betInfo.autoCloseDate / 1000}:R>` : ""}`
                })
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name}`,
                    iconURL: `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`
                });

            // 原本的方式

            // guildInformation.betInfo.option.forEach(option => {
            //     let odds = oddsCalc(option.betCount, guildInformation.betInfo.totalBet, guildInformation.taxRate);
            //     embed.addField("📔 " + option.id + ". " + option.name, option.description + `\n累計賭金: ${option.betCount} coin(s) \n` +
            //         `賠率: ${odds === 0 ? "尚無法計算賠率" : odds}`)
            // })

            // 臨時更動的方式

            guildInformation.betInfo.option.forEach(option => {
                let odds1 = oddsCalc(option.betCount, guildInformation.betInfo.totalBet, 80);
                let odds2 = oddsCalc(option.betCount, guildInformation.betInfo.totalBet, 20);
                embed.addFields({
                    name: "📔 " + option.id + ". " + option.name,
                    value: option.description + `\n累計賭金: ${option.betCount} coin(s) \n` +
                        `獨贏賠率: ${odds1 === 0 ? "尚無法計算賠率" : odds1} ` +
                        `位置賠率: ${odds2 === 0 ? "尚無法計算賠率" : odds2} `
                });
            })

            // 臨時區域結束

            interaction.reply({ embeds: [embed] });

        } else {
            //權限
            if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.ManageMessages)) {
                return interaction.reply({ content: "此指令僅限管理員使用。", ephemeral: true });
            }
        }

        if (interaction.options.getSubcommand() === 'create') {
            if (guildInformation.betInfo.isPlaying != 0)
                return interaction.reply({ content: "目前已有其他投注進行中，請先關閉其他投注再建立新投注。", ephemeral: true });

            let defaultRaceData = [];
            let defaultRaseRowData = [];

            let mode = "";
            let chooseBetID = -1;
            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    [
                        new Discord.ButtonBuilder()
                            .setCustomId('default')
                            .setLabel('從預設模板中選擇')
                            .setStyle(Discord.ButtonStyle.Primary),
                        new Discord.ButtonBuilder()
                            .setCustomId('custom')
                            .setLabel('從自訂模板中選擇')
                            .setStyle(Discord.ButtonStyle.Primary)
                    ]
                );
            const msg = await interaction.reply({ content: "請選擇設定模式", components: [row], fetchReply: true });

            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                await i.deferUpdate();

                if (!mode) {
                    mode = i.customId;

                    if (mode === "default") {
                        const raseFileName = fs.readdirSync('data/raseData').filter(file => file.endsWith('.json'));
                        if (raseFileName.length === 0) {
                            i.editReply({ content: "目前沒有可以選擇的預設模板。", components: [] });
                            collector.stop('set');
                        } else {
                            collector.resetTimer({ time: 120 * 1000 });
                            raseFileName.forEach((fileName, value) => {
                                try {
                                    let text = fs.readFileSync(`data/raseData/${fileName}`);
                                    defaultRaceData[value] = JSON.parse(text);
                                    defaultRaseRowData.push({
                                        label: defaultRaceData[value].name,
                                        value: value.toString(),
                                        description: defaultRaceData[value].description.slice(0, 50),
                                    });
                                } catch (err) {
                                    console.log(err);
                                }
                            });
                            const row = new Discord.ActionRowBuilder()
                                .addComponents(
                                    new Discord.StringSelectMenuBuilder()
                                        .setCustomId('raceSelect')
                                        .setPlaceholder('選擇一個預設模板')
                                        .addOptions(defaultRaseRowData),
                                );
                            i.editReply({ content: "請選擇一個預設模板。", components: [row] });
                        }

                    } else if (mode === "custom") {
                        const raseFileName = fs.readdirSync(`data/guildData/${interaction.guild.id}/betTemplate`).filter(file => file.endsWith('.json'));
                        if (raseFileName.length === 0) {
                            i.editReply({ content: "目前沒有可以選擇的自訂模板。可於/setting進行設定。", components: [] });
                            collector.stop('set');
                        } else {
                            collector.resetTimer({ time: 120 * 1000 });
                            raseFileName.forEach((fileName, value) => {
                                try {
                                    let text = fs.readFileSync(`data/guildData/${interaction.guild.id}/betTemplate/${fileName}`);
                                    defaultRaceData[value] = JSON.parse(text);
                                    defaultRaseRowData.push({
                                        label: defaultRaceData[value].name,
                                        value: value.toString(),
                                        description: defaultRaceData[value].description.slice(0, 50),
                                    });
                                } catch (err) {
                                    console.log(err);
                                }
                            });
                            const row = new Discord.ActionRowBuilder()
                                .addComponents(
                                    new Discord.StringSelectMenuBuilder()
                                        .setCustomId('raceSelect')
                                        .setPlaceholder('選擇一個預設模板')
                                        .addOptions(defaultRaseRowData),
                                );
                            i.editReply({ content: "請選擇一個預設模板。", components: [row] });
                        }
                    }
                } else {
                    if (chooseBetID === -1) {
                        chooseBetID = i.values;
                        collector.resetTimer({ time: 120 * 1000 });
                        const embed = new Discord.EmbedBuilder()
                            .setColor(process.env.EMBEDCOLOR)
                            .setTitle(`模板: ${defaultRaceData[i.values].name} 預覽`)
                            .setDescription(defaultRaceData[i.values].description)
                            .setTimestamp()
                            .setFooter({
                                text: `${interaction.client.user.tag}`,
                                iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
                            });

                        defaultRaceData[i.values].option.forEach(ele => {
                            embed.addFields({
                                name: `📔 ${ele.id}. ${ele.name}`,
                                value: ele.description
                            });
                        })
                        const row = new Discord.ActionRowBuilder()
                            .addComponents(
                                [
                                    new Discord.ButtonBuilder()
                                        .setCustomId('promise')
                                        .setLabel('確認開啟投注')
                                        .setStyle(Discord.ButtonStyle.Primary),
                                ]
                            );
                        i.editReply({ content: "此為模板預覽，確認後請點擊下方按鈕以開啟投注。", embeds: [embed], components: [row] })

                    } else {
                        if (guildInformation.betInfo.isPlaying !== 0) {
                            collector.stop('set');
                            return i.editReply({
                                content: `已經有其他投注正在執行，無法開啟投注。`,
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
                            [],
                            [],
                            defaultRaceData[chooseBetID].priority
                        )
                        i.editReply({
                            content: `設定完成。已將投注設為「${defaultRaceData[chooseBetID].name}」。從現在開始所有用戶可以下注。`,
                            embeds: [],
                            components: []
                        });
                        fs.writeFile(
                            `./data/guildData/${guildInformation.id}/betInfo.json`,
                            JSON.stringify(guildInformation.betInfo, null, '\t'), async function (err) {
                                if (err)
                                    return console.log(err);
                            });
                        collector.stop("set");
                    }
                }
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消設定。`,
                        components: [],
                        embeds: []
                    });
                }
            });


        } else if (interaction.options.getSubcommand() === 'close') {
            if (guildInformation.betInfo.isPlaying != 1)
                return interaction.reply({ content: "找不到目前能封盤的投注。", ephemeral: true });

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    [
                        new Discord.ButtonBuilder()
                            .setCustomId('promise')
                            .setLabel('確認封盤')
                            .setStyle(Discord.ButtonStyle.Primary),
                    ]
                );
            const msg = await interaction.reply({ content: "確定封盤?請點選下方按鈕確認。", components: [row], fetchReply: true });

            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                guildInformation.betInfo.isPlaying = 2;
                i.update({
                    content: `封盤完成。`,
                    components: []
                })
                collector.stop("set");
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消封盤。`,
                        components: []
                    });
                }
            });

        } else if (interaction.options.getSubcommand() === 'auto-close') {
            if (guildInformation.betInfo.isPlaying === 0)
                return interaction.reply({ content: "找不到目前能封盤的投注。", ephemeral: true });
            if (guildInformation.betInfo.isPlaying === 2)
                return interaction.reply({ content: "投注已封盤，無法再設定自動封盤。", ephemeral: true });

            let date = Date.parse(interaction.options.getString('date'));

            if (isNaN(date))
                return interaction.reply({ content: "輸入的日期格式錯誤。", ephemeral: true });
            if (date < Date.now() + 1000 * 60 * 5)
                return interaction.reply({ content: "請輸入至少在5分鐘後的時間！", ephemeral: true });

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    [
                        new Discord.ButtonBuilder()
                            .setCustomId('promise')
                            .setLabel('確認封盤')
                            .setStyle(Discord.ButtonStyle.Primary),
                    ]
                );

            const msg = await interaction.reply({
                content: `確定將時間設定為 <t:${date / 1000}:F>? 請點選下方按鈕確認。`,
                components: [row],
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                guildInformation.betInfo.setAutoClose(date);
                i.update({
                    content: `自動封盤時間：<t:${date / 1000}:F> 設定完成。`,
                    components: []
                })

                fs.writeFile(
                    `./data/guildData/${guildInformation.id}/betInfo.json`,
                    JSON.stringify(guildInformation.betInfo, null, '\t'), async function (err) {
                        if (err)
                            return console.log(err);
                    });

                collector.stop("set");
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消封盤。`,
                        components: []
                    });
                }
            });

        } else if (interaction.options.getSubcommand() === 'result') {
            if (guildInformation.betInfo.isPlaying != 2)
                return interaction.reply({ content: "找不到目前能開盤的投注。如果要開盤，請先封盤。", ephemeral: true });

            let optionData = [];
            guildInformation.betInfo.option.forEach(option => {
                optionData.push({
                    label: option.name,
                    value: option.id,
                    description: option.description
                });
            })
            optionData.push({
                label: "取消投注",
                value: "cancel",
                description: `取消投注，並向所有投注的用戶發還他們投注的coin(s)。`
            })
            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.StringSelectMenuBuilder()
                        .setCustomId('optionSelect')
                        .setPlaceholder('選擇要下注的對象')
                        .addOptions(optionData),
                );

            const msg = await interaction.reply({ content: "請選擇要開盤的對象。", components: [row], fetchReply: true });

            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });
            let target = "";

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                if (!target) {
                    target = i.values[0];
                    const row = new Discord.ActionRowBuilder()
                        .addComponents(
                            [
                                new Discord.ButtonBuilder()
                                    .setCustomId('promise')
                                    .setLabel('確認開盤')
                                    .setStyle(Discord.ButtonStyle.Primary),
                            ]
                        );
                    const targetData = guildInformation.betInfo.getOption(target) ?? { name: "取消投注", betCount: 1 };
                    i.update({
                        content: `目前要開盤的選項為: ${targetData.name}。\n` +
                            `${targetData.betCount === 0 ? "若開啟此選項，將沒有人會贏得投注。\n" : ""}確認選項無誤，請按下下方按鈕。`,
                        components: [row]
                    });
                    collector.resetTimer({ time: 120 * 1000 });

                } else {
                    if (guildInformation.betInfo.isPlaying !== 2) {
                        collector.stop('set');
                        return i.update({
                            content: `本次投注已由其他人關閉。`,
                            embeds: [],
                            components: []
                        });
                    }
                    await i.deferUpdate();

                    /**
                     * @type {Map<string, guild.User>}
                     */
                    let userList = new Map();

                    if (target === "cancel") {
                        let rebackList = new Map();
                        guildInformation.betInfo.betRecord.forEach(element => {
                            if (userList.has(element.userId)) {
                                userList.get(element.userId).coins += element.coins;
                                userList.get(element.userId).totalBet -= element.coins;
                            } else {
                                let newUser = new guild.User(element.userId, 'undefined');
                                newUser.coins = element.coins;
                                newUser.totalBet = -element.coins;
                                userList.set(newUser.id, newUser);
                            }
                            rebackList.set(element.userId, rebackList.get(element.userId) ? rebackList.get(element.userId) + element.coins : element.coins)
                        })
                        rebackList.forEach((val, key) => {
                            interaction.client.users.fetch(key).then(user => {
                                user.send(`**${interaction.guild.name}** 伺服器中的投注「${guildInformation.betInfo.name}」已取消。\n` +
                                    `已將您賭注的 ${val} coin(s) 發還。`).catch((err) => console.log(err))
                            });
                        });
                        guildInformation.betInfo.isPlaying = 0;
                        interaction.editReply({
                            content: `已取消投注，正在發還coin(s)。`,
                            components: []
                        });
                        fs.writeFile(
                            `./data/guildData/${guildInformation.id}/betRecord/${guildInformation.betInfo.id}.json`,
                            JSON.stringify(guildInformation.outputBetRecord(
                                new guild.betGameOptionObject("0", "投注取消", "本次投注取消，所有coin(s)退回原投注者。"), guildInformation.taxRate
                                , guildInformation.taxRate), null, '\t'), err => { if (err) console.error(err) }
                        )
                        fs.writeFile(
                            `./data/guildData/${guildInformation.id}/betInfo.json`,
                            JSON.stringify(guildInformation.betInfo, null, '\t'), async function (err) {
                                if (err) return console.log(err);
                            }
                        );
                        let newUser = new guild.User('0', 'undefined');
                        userList.forEach((val, key) => {
                            if (guildInformation.users.has(key)) {
                                guildInformation.users.get(key).saveTime = 0;
                                guildInformation.users.get(key).coins += val.coins;
                                guildInformation.users.get(key).totalBet += val.totalBet;
                                guildInformation.users.get(key).joinTimes += 1;
                                fs.writeFile(`./data/guildData/${interaction.guild.id}/users/${key}.json`,
                                    JSON.stringify(guildInformation.users.get(key), null, '\t'), async function (err) {
                                        if (err) return console.log(err);
                                    });
                            } else {
                                let parse = fs.readFileSync(`./data/guildData/${interaction.guild.id}/users/${key}.json`);
                                parse = JSON.parse(parse);
                                newUser.toFullUser(parse);
                                newUser.coins += val.coins;
                                newUser.totalBet += val.totalBet;
                                newUser.joinTimes += 1;
                                fs.writeFile(`./data/guildData/${interaction.guild.id}/users/${key}.json`,
                                    JSON.stringify(newUser, null, '\t'), async function (err) {
                                        if (err) return console.log(err);
                                    });
                            }
                        });
                        collector.stop('set');

                    } else {
                        let rebackList = new Map();
                        const winOption = guildInformation.betInfo.getOption(target);
                        let coinGet = oddsCalc(winOption.betCount, guildInformation.betInfo.totalBet, guildInformation.taxRate);
                        guildInformation.betInfo.betRecord.forEach(element => {
                            if (element.optionId === winOption.id) {
                                if (userList.has(element.userId)) {
                                    userList.get(element.userId).coins += Math.floor(element.coins * coinGet);
                                    userList.get(element.userId).totalGet += Math.floor(element.coins * coinGet);
                                } else {
                                    let newUser = new guild.User(element.userId, 'undefined');
                                    newUser.coins = Math.floor(element.coins * coinGet);
                                    newUser.totalGet = Math.floor(element.coins * coinGet);
                                    userList.set(newUser.id, newUser);
                                }
                                rebackList.set(element.userId,
                                    rebackList.get(element.userId)
                                        ? rebackList.get(element.userId) + Math.floor(element.coins * coinGet)
                                        : Math.floor(element.coins * coinGet)
                                );
                            } else {
                                rebackList.set(element.userId, rebackList.get(element.userId) ? rebackList.get(element.userId) : 0);
                            }
                        })
                        rebackList.forEach((val, key) => {
                            if (val === 0) {
                                interaction.client.users.fetch(key).then(user => {
                                    user.send(`感謝您參與 **${interaction.guild.name}** 伺服器中的投注「${guildInformation.betInfo.name}」。\n` +
                                        `本次投注已開盤，開出的選項是: ${winOption.name}。\n` +
                                        `您並未贏得投注。`).catch((err) => console.log(err))
                                })
                            } else {
                                interaction.client.users.fetch(key).then(user => {
                                    user.send(`恭喜您在 **${interaction.guild.name}** 伺服器中的投注「${guildInformation.betInfo.name}」中贏得投注!\n` +
                                        `本次投注已開盤，開出的選項是: ${winOption.name}。\n` +
                                        `已將您獲得的 ${val} coin(s) 發還。`).catch((err) => console.log(err))
                                })
                            }
                        })
                        guildInformation.betInfo.isPlaying = 0;
                        interaction.editReply({
                            content: `本次投注獲勝選項為 ${winOption.name}。已將所有coin(s)發還。`,
                            components: []
                        });
                        fs.writeFile(
                            `./data/guildData/${guildInformation.id}/betRecord/${guildInformation.betInfo.id}.json`,
                            JSON.stringify(guildInformation.outputBetRecord(winOption, guildInformation.taxRate), null, '\t'), err => { if (err) console.error(err) }
                        );
                        fs.writeFile(
                            `./data/guildData/${guildInformation.id}/betInfo.json`,
                            JSON.stringify(guildInformation.betInfo, null, '\t'), async function (err) {
                                if (err) return console.log(err);
                            }
                        );
                        let newUser = new guild.User('0', 'undefined');
                        userList.forEach((val, key) => {
                            if (guildInformation.users.has(key)) {
                                guildInformation.users.get(key).saveTime = 0;
                                guildInformation.users.get(key).coins += val.coins;
                                guildInformation.users.get(key).totalGet += val.totalGet;
                                guildInformation.users.get(key).joinTimes += 1;
                                fs.writeFile(`./data/guildData/${interaction.guild.id}/users/${key}.json`,
                                    JSON.stringify(guildInformation.users.get(key), null, '\t'), async function (err) {
                                        if (err) return console.log(err);
                                    });
                            } else {
                                let parse = fs.readFileSync(`./data/guildData/${interaction.guild.id}/users/${key}.json`);
                                parse = JSON.parse(parse);
                                newUser.toFullUser(parse);
                                newUser.coins += val.coins;
                                newUser.totalGet += val.totalGet;
                                newUser.joinTimes += 1;
                                fs.writeFile(`./data/guildData/${interaction.guild.id}/users/${key}.json`,
                                    JSON.stringify(newUser, null, '\t'), async function (err) {
                                        if (err) return console.log(err);
                                    });
                            }
                        });
                        collector.stop('set');
                    }
                }
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消開盤。`,
                        components: []
                    });
                }
            });
        } else if (interaction.options.getSubcommand() === 'resultsp') {
            if (guildInformation.betInfo.isPlaying != 2)
                return interaction.reply({ content: "找不到目前能開盤的投注。如果要開盤，請先封盤。", ephemeral: true });

            let optionData = [];
            guildInformation.betInfo.option.forEach(option => {
                optionData.push({
                    label: option.name,
                    value: option.id,
                    description: option.description
                });
            })
            optionData.push({
                label: "取消投注",
                value: "cancel",
                description: `取消投注，並向所有投注的用戶發還他們投注的coin(s)。`
            })
            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.StringSelectMenuBuilder()
                        .setCustomId('optionSelect')
                        .setPlaceholder('選擇要下注的對象')
                        .addOptions(optionData),
                );

            const msg = await interaction.reply({ content: "請選擇要開盤的對象1(返還80%)。", components: [row], fetchReply: true });

            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });
            let target = "";
            let opt = [];

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });

                // 選擇開盤對象
                if (!target) {
                    if (!opt[0]) {
                        opt.push(i.values[0]);
                        i.update({ content: "請選擇要開盤的對象2(返還20%)。", components: [row] });

                    } else if (!opt[1]) {
                        opt.push(i.values[0]);
                        i.update({ content: "請選擇要開盤的對象3(返還20%)。", components: [row] });

                    } else {
                        opt.push(i.values[0]);
                        if (opt.includes("cancel")) target = "cancel";
                        else target = "str";
                        const row = new Discord.ActionRowBuilder()
                            .addComponents(
                                [
                                    new Discord.ButtonBuilder()
                                        .setCustomId('promise')
                                        .setLabel('確認開盤')
                                        .setStyle(Discord.ButtonStyle.Primary),
                                ]
                            );
                        const targetData1 = guildInformation.betInfo.getOption(opt[0]) ?? { name: "取消投注", betCount: 1 };
                        const targetData2 = guildInformation.betInfo.getOption(opt[1]) ?? { name: "取消投注", betCount: 1 };
                        const targetData3 = guildInformation.betInfo.getOption(opt[2]) ?? { name: "取消投注", betCount: 1 };
                        i.update({
                            content: `目前要開盤的第一選項為: ${targetData1.name}。\n` +
                                `目前要開盤的第二選項為: ${targetData2.name}。\n` +
                                `目前要開盤的第三選項為: ${targetData3.name}。\n` +
                                `${(targetData1.betCount === 0 && targetData2.betCount === 0 && targetData3.betCount === 0)
                                    ? "若開啟此選項，某些選項沒有人贏得投注。\n"
                                    : ""
                                }確認選項無誤，請按下下方按鈕。`,
                            components: [row]
                        });
                    }
                    collector.resetTimer({ time: 120 * 1000 });

                    // 處理開盤過程
                } else {
                    if (guildInformation.betInfo.isPlaying !== 2) {
                        collector.stop('set');
                        return i.update({
                            content: `本次投注已由其他人關閉。`,
                            embeds: [],
                            components: []
                        });
                    }
                    await i.deferUpdate();

                    /**
                     * @type {Map<string, guild.User>}
                     */
                    let userList = new Map();

                    if (target === "cancel") {
                        let rebackList = new Map();
                        guildInformation.betInfo.betRecord.forEach(element => {
                            if (userList.has(element.userId)) {
                                userList.get(element.userId).coins += element.coins;
                                userList.get(element.userId).totalBet -= element.coins;
                            } else {
                                let newUser = new guild.User(element.userId, 'undefined');
                                newUser.coins = element.coins;
                                newUser.totalBet = -element.coins;
                                userList.set(newUser.id, newUser);
                            }
                            rebackList.set(element.userId, rebackList.get(element.userId) ? rebackList.get(element.userId) + element.coins : element.coins)
                        })
                        rebackList.forEach((val, key) => {
                            interaction.client.users.fetch(key).then(user => {
                                user.send(`**${interaction.guild.name}** 伺服器中的投注「${guildInformation.betInfo.name}」已取消。\n` +
                                    `已將您賭注的 ${val} coin(s) 發還。`).catch((err) => console.log(err))
                            });
                        });
                        guildInformation.betInfo.isPlaying = 0;
                        interaction.editReply({
                            content: `已取消投注，正在發還coin(s)。`,
                            components: []
                        });
                        fs.writeFile(
                            `./data/guildData/${guildInformation.id}/betRecord/${guildInformation.betInfo.id}.json`,
                            JSON.stringify(guildInformation.outputBetRecord(
                                new guild.betGameOptionObject("0", "投注取消", "本次投注取消，所有coin(s)退回原投注者。"), guildInformation.taxRate
                                , guildInformation.taxRate), null, '\t'), err => { if (err) console.error(err) }
                        )
                        fs.writeFile(
                            `./data/guildData/${guildInformation.id}/betInfo.json`,
                            JSON.stringify(guildInformation.betInfo, null, '\t'), async function (err) {
                                if (err) return console.log(err);
                            }
                        );
                        let newUser = new guild.User('0', 'undefined');
                        userList.forEach((val, key) => {
                            if (guildInformation.users.has(key)) {
                                guildInformation.users.get(key).saveTime = 0;
                                guildInformation.users.get(key).coins += val.coins;
                                guildInformation.users.get(key).totalBet += val.totalBet;
                                guildInformation.users.get(key).joinTimes += 1;
                                fs.writeFile(`./data/guildData/${interaction.guild.id}/users/${key}.json`,
                                    JSON.stringify(guildInformation.users.get(key), null, '\t'), async function (err) {
                                        if (err) return console.log(err);
                                    });
                            } else {
                                let parse = fs.readFileSync(`./data/guildData/${interaction.guild.id}/users/${key}.json`);
                                parse = JSON.parse(parse);
                                newUser.toFullUser(parse);
                                newUser.coins += val.coins;
                                newUser.totalBet += val.totalBet;
                                newUser.joinTimes += 1;
                                fs.writeFile(`./data/guildData/${interaction.guild.id}/users/${key}.json`,
                                    JSON.stringify(newUser, null, '\t'), async function (err) {
                                        if (err) return console.log(err);
                                    });
                            }
                        });
                        collector.stop('set');

                    } else {

                        // 多選項開局設定更改

                        let rebackList = new Map();
                        const winOption1 = guildInformation.betInfo.getOption(opt[0]);
                        const winOption2 = guildInformation.betInfo.getOption(opt[1]);
                        const winOption3 = guildInformation.betInfo.getOption(opt[2]);

                        let coinGet1 = oddsCalc(winOption1.betCount, guildInformation.betInfo.totalBet, 80);
                        let coinGet2 = oddsCalc(winOption2.betCount, guildInformation.betInfo.totalBet, 20);
                        let coinGet3 = oddsCalc(winOption3.betCount, guildInformation.betInfo.totalBet, 20);

                        guildInformation.betInfo.betRecord.forEach(element => {
                            if (element.optionId === winOption1.id || element.optionId === winOption2.id || element.optionId === winOption3.id) {
                                let coinGet = 0;
                                switch (element.optionId) {
                                    case winOption1.id: coinGet = coinGet1; break;
                                    case winOption2.id: coinGet = coinGet2; break;
                                    case winOption3.id: coinGet = coinGet3; break;
                                }
                                if (userList.has(element.userId)) {
                                    userList.get(element.userId).coins += Math.floor(element.coins * coinGet);
                                    userList.get(element.userId).totalGet += Math.floor(element.coins * coinGet);
                                } else {
                                    let newUser = new guild.User(element.userId, 'undefined');
                                    newUser.coins = Math.floor(element.coins * coinGet);
                                    newUser.totalGet = Math.floor(element.coins * coinGet);
                                    userList.set(newUser.id, newUser);
                                }
                                rebackList.set(element.userId,
                                    rebackList.get(element.userId)
                                        ? rebackList.get(element.userId) + Math.floor(element.coins * coinGet)
                                        : Math.floor(element.coins * coinGet)
                                );
                            } else {
                                rebackList.set(element.userId, rebackList.get(element.userId) ? rebackList.get(element.userId) : 0);
                            }
                        })
                        rebackList.forEach((val, key) => {
                            if (val === 0) {
                                interaction.client.users.fetch(key).then(user => {
                                    user.send(`感謝您參與 **${interaction.guild.name}** 伺服器中的投注「${guildInformation.betInfo.name}」。\n` +
                                        `本次投注已開盤，開出的第一名選項是: ${winOption1.name}。\n` +
                                        `開出的第二名選項是: ${winOption2.name}。\n` +
                                        `開出的第三名選項是: ${winOption3.name}。\n` +
                                        `您並未贏得投注。`).catch((err) => console.log(err))
                                })
                            } else {
                                interaction.client.users.fetch(key).then(user => {
                                    user.send(`恭喜您在 **${interaction.guild.name}** 伺服器中的投注「${guildInformation.betInfo.name}」中贏得投注!\n` +
                                        `本次投注已開盤，開出的第一名選項是: ${winOption1.name}。\n` +
                                        `開出的第二名選項是: ${winOption2.name}。\n` +
                                        `開出的第三名選項是: ${winOption3.name}。\n` +
                                        `已將您獲得的 ${val} coin(s) 發還。`).catch((err) => console.log(err))
                                })
                            }
                        })
                        guildInformation.betInfo.isPlaying = 0;
                        interaction.editReply({
                            content:
                                `本次投注已開盤，開出的第一名選項是: ${winOption1.name}。\n` +
                                `開出的第二名選項是: ${winOption2.name}。\n` +
                                `開出的第三名選項是: ${winOption3.name}。\n` +
                                `已將所有coin(s)發還。`,
                            components: []
                        });
                        fs.writeFile(
                            `./data/guildData/${guildInformation.id}/betRecord/${guildInformation.betInfo.id}.json`,
                            JSON.stringify(guildInformation.outputBetRecord(winOption1, 80), null, '\t'), err => { if (err) console.error(err) }
                        );
                        fs.writeFile(
                            `./data/guildData/${guildInformation.id}/betInfo.json`,
                            JSON.stringify(guildInformation.betInfo, null, '\t'), async function (err) {
                                if (err) return console.log(err);
                            }
                        );
                        let newUser = new guild.User('0', 'undefined');
                        userList.forEach((val, key) => {
                            if (guildInformation.users.has(key)) {
                                guildInformation.users.get(key).saveTime = 0;
                                guildInformation.users.get(key).coins += val.coins;
                                guildInformation.users.get(key).totalGet += val.totalGet;
                                guildInformation.users.get(key).joinTimes += 1;
                                fs.writeFile(`./data/guildData/${interaction.guild.id}/users/${key}.json`,
                                    JSON.stringify(guildInformation.users.get(key), null, '\t'), async function (err) {
                                        if (err) return console.log(err);
                                    });
                            } else {
                                let parse = fs.readFileSync(`./data/guildData/${interaction.guild.id}/users/${key}.json`);
                                parse = JSON.parse(parse);
                                newUser.toFullUser(parse);
                                newUser.coins += val.coins;
                                newUser.totalGet += val.totalGet;
                                newUser.joinTimes += 1;
                                fs.writeFile(`./data/guildData/${interaction.guild.id}/users/${key}.json`,
                                    JSON.stringify(newUser, null, '\t'), async function (err) {
                                        if (err) return console.log(err);
                                    });
                            }
                        });
                        collector.stop('set');
                    }
                }
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消開盤。`,
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
        new Discord.ActionRowBuilder()
            .addComponents([
                new Discord.ButtonBuilder()
                    .setLabel('1')
                    .setCustomId('1')
                    .setStyle(Discord.ButtonStyle.Secondary)
                    .setDisabled(isOver),
                new Discord.ButtonBuilder()
                    .setLabel('2')
                    .setCustomId('2')
                    .setStyle(Discord.ButtonStyle.Secondary)
                    .setDisabled(isOver),
                new Discord.ButtonBuilder()
                    .setLabel('3')
                    .setCustomId('3')
                    .setStyle(Discord.ButtonStyle.Secondary)
                    .setDisabled(isOver),
                new Discord.ButtonBuilder()
                    .setLabel('4')
                    .setCustomId('4')
                    .setStyle(Discord.ButtonStyle.Secondary)
                    .setDisabled(isOver),
                new Discord.ButtonBuilder()
                    .setLabel('5')
                    .setCustomId('5')
                    .setStyle(Discord.ButtonStyle.Secondary)
                    .setDisabled(isOver),
            ]),
        new Discord.ActionRowBuilder()
            .addComponents([
                new Discord.ButtonBuilder()
                    .setLabel('6')
                    .setCustomId('6')
                    .setStyle(Discord.ButtonStyle.Secondary)
                    .setDisabled(isOver),
                new Discord.ButtonBuilder()
                    .setLabel('7')
                    .setCustomId('7')
                    .setStyle(Discord.ButtonStyle.Secondary)
                    .setDisabled(isOver),
                new Discord.ButtonBuilder()
                    .setLabel('8')
                    .setCustomId('8')
                    .setStyle(Discord.ButtonStyle.Secondary)
                    .setDisabled(isOver),
                new Discord.ButtonBuilder()
                    .setLabel('9')
                    .setCustomId('9')
                    .setStyle(Discord.ButtonStyle.Secondary)
                    .setDisabled(isOver),
                new Discord.ButtonBuilder()
                    .setLabel('0')
                    .setCustomId('0')
                    .setStyle(Discord.ButtonStyle.Secondary)
                    .setDisabled(isOver),
            ]),
        new Discord.ActionRowBuilder()
            .addComponents([
                new Discord.ButtonBuilder()
                    .setLabel('刪除一格')
                    .setCustomId('delete')
                    .setStyle(Discord.ButtonStyle.Primary),

                new Discord.ButtonBuilder()
                    .setLabel('決定')
                    .setCustomId('complete')
                    .setStyle(Discord.ButtonStyle.Success),
            ]),
    ];
}

function oddsCalc(betCoins, totalBetCoins, taxRate) {
    if (betCoins === 0) return 0;
    else return Math.max(1, Math.floor((totalBetCoins / betCoins) * (taxRate / 100) * 10) / 10);
}