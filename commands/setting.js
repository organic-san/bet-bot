const guild = require('../functions/guildInfo');
const fs = require('fs');
const Discord = require('discord.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('setting')
        .setDescription('與系統相關的設定(由管理員操控)')
        .addSubcommand(opt =>
            opt.setName('show-record')
                .setDescription('顯示賭盤的投注紀錄')
        ).addSubcommand(opt =>
            opt.setName('show-result')
                .setDescription('顯示上次賭盤的下注結果')
        ).addSubcommand(opt =>
            opt.setName('reset-coins')
                .setDescription('重置所有人的coin(s)')
        ).addSubcommand(opt =>
            opt.setName('adjust-tax-rate')
                .setDescription('調整金額獲得比例')
        ),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.guildInformation} guildInformation
     */
    async execute(interaction, guildInformation) {
        //權限
        if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: "此指令僅限管理員使用。", ephemeral: true });
        }

        if (interaction.options.getSubcommand() === 'show-record') {
            //if(guildInformation.betInfo.isPlaying === 0) 
            //    return interaction.reply({content: "目前並未舉行賭盤。", components:[]});

            if (guildInformation.betInfo.betRecord.length === 0)
                return interaction.reply({ content: "賭盤中搜尋不到投注紀錄。", components: [] });

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    [
                        new Discord.ButtonBuilder()
                            .setCustomId('promise')
                            .setLabel('確認顯示')
                            .setStyle(Discord.ButtonStyle.Primary),
                    ]
                );

            const msg = await interaction.reply({
                content: "即將顯示所有投注紀錄，內容可能會造成洗版。確認顯示?請點選下方按鈕確認。",
                components: [row],
                fetchReply: true
            });
            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                i.update({
                    content: `即將顯示所有投注紀錄。`,
                    components: []
                })
                const onePpageMax = 20;
                let playing = guildInformation.betInfo.isPlaying;
                for (let i = 0; i < Math.floor((guildInformation.betInfo.betRecord.length - 1) / onePpageMax) + 1; i++) {
                    const embed = new Discord.EmbedBuilder()
                        .setColor(process.env.EMBEDCOLOR)
                        .setTitle(`目前賭盤: ${guildInformation.betInfo.name} | ${playing === 1 ? "🟢投注中" : (playing === 2 ? "🔴封盤中" : "🟡已開盤")}`)
                        .setTimestamp()
                        .setFooter({
                            text: `${interaction.guild.name} | 第 ${i + 1} 頁`,
                            iconURL: `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`
                        });


                    let nameStr = [];
                    let coinStr = [];
                    let targetStr = [];
                    for (let j = i * onePpageMax; j < Math.min(i * onePpageMax + onePpageMax, guildInformation.betInfo.betRecord.length); j++) {
                        const target = guildInformation.betInfo.getOption(guildInformation.betInfo.betRecord[j].optionId);
                        nameStr.push(
                            "<t:" + Math.floor(guildInformation.betInfo.betRecord[j].time / 1000) + ":T> "
                            + '<@' + guildInformation.betInfo.betRecord[j].userId + '>'
                        );
                        coinStr.push(guildInformation.betInfo.betRecord[j].coins.toString());
                        targetStr.push(target.name);
                    }
                    embed.addFields(
                        { name: '投注時間與用戶名稱', value: nameStr.join('\n'), inline: true },
                        { name: '投注金額', value: coinStr.join('\n'), inline: true },
                        { name: '投注對象', value: targetStr.join('\n'), inline: true }
                    );

                    await interaction.channel.send({ embeds: [embed] });
                }
                collector.stop("set");
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消設定。`,
                        components: []
                    });
                }
            });

        } else if (interaction.options.getSubcommand() === 'show-result') {
            if (guildInformation.betInfo.isPlaying !== 0)
                return interaction.reply({ content: "賭盤正進行中，尚未產生結果。", components: [] });

            if (guildInformation.betInfo.betRecord.length === 0)
                return interaction.reply({ content: "上次賭盤沒有下注紀錄。", components: [] });

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    [
                        new Discord.ButtonBuilder()
                            .setCustomId('promise')
                            .setLabel('確認顯示')
                            .setStyle(Discord.ButtonStyle.Primary),
                    ]
                );

            const msg = await interaction.reply({
                content: "即將顯示下注結果，內容可能會造成洗版。確認顯示?請點選下方按鈕確認。",
                components: [row],
                fetchReply: true
            });
            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                let fileDirs = fs.readdirSync(`./data/guildData/${guildInformation.id}/betRecord`);
                fileDirs = fileDirs[fileDirs.length - 1];
                try {
                    let parseJsonlist = fs.readFileSync(`./data/guildData/${guildInformation.id}/betRecord/${fileDirs}`);
                    parseJsonlist = JSON.parse(parseJsonlist);

                    const result = new guild.betRecordObject();
                    result.toBetRecordObject(parseJsonlist);
                    const mag = (Math.floor((result.totalBet / result.winner.betCount) * 10) / 10);

                    i.update({
                        content: `即將顯示上一次的下注結果。\n` +
                            `總投注coin(s): ${guildInformation.betInfo.totalBet} coin(s)\n` +
                            `開盤選項名稱: ${result.winner.name}\n` +
                            `開盤選項賠率: ` +
                            `${result.winner.betCount > 0 ? mag : "無法計算"}\n`,
                        components: []
                    })
                    /**
                     * @type {Map<String, number[]>}
                     */
                    let total = new Map();
                    let nameStr = [[]];
                    let coinStr = [[]];
                    let getStr = [[]];
                    for (let i = 0; i < guildInformation.betInfo.betRecord.length; i++) {
                        let uid = guildInformation.betInfo.betRecord[i].userId;
                        let cis = guildInformation.betInfo.betRecord[i].coins;
                        let get = (guildInformation.betInfo.betRecord[i].optionId === result.winner.id ? mag : 0);
                        if (total.has(uid))
                            total.set(uid, [total.get(uid)[0] + cis, total.get(uid)[1] + cis * get]);
                        else
                            total.set(uid, [cis, cis * get]);

                    }
                    let c = 0;
                    total.forEach((v, k) => {
                        if (c % 20 === 0) {
                            nameStr[Math.floor(c / 20)] = [];
                            coinStr[Math.floor(c / 20)] = [];
                            getStr[Math.floor(c / 20)] = [];
                        }
                        nameStr[Math.floor(c / 20)].push('<@' + k + '>');
                        coinStr[Math.floor(c / 20)].push(v[0] + ' coin(s)');
                        getStr[Math.floor(c / 20)].push(Math.floor(v[1]) + ' coin(s)');
                        c++;
                    });
                    for (let i = 0; i < nameStr.length; i++) {
                        const embed = new Discord.EmbedBuilder()
                            .setColor(process.env.EMBEDCOLOR)
                            .setTitle(`賭盤: ${guildInformation.betInfo.name} 的結果`)
                            .setTimestamp()
                            .setFooter({
                                text: `${interaction.guild.name} | 第 ${i + 1} 頁`,
                                iconURL: `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`
                            })
                            .addFields(
                                { name: '用戶名稱', value: nameStr[i].join('\n'), inline: true },
                                { name: '投注金額', value: coinStr[i].join('\n'), inline: true },
                                { name: '獲得金額', value: getStr[i].join('\n'), inline: true }
                            );
                        await interaction.channel.send({ embeds: [embed] });
                    }

                } catch (err) {
                    console.error(err);
                }
                collector.stop("set");
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消設定。`,
                        components: []
                    });
                }
            });

        } else if (interaction.options.getSubcommand() === 'reset-coins') {
            if (guildInformation.betInfo.isPlaying !== 0)
                return interaction.reply({ content: "請先關閉當前賭盤再執行本操作。", components: [] });

            const row = new Discord.MessageActionRow()
                .addComponents(
                    [
                        new Discord.MessageButton()
                            .setCustomId('promise')
                            .setLabel('確認刪除')
                            .setStyle('PRIMARY'),
                    ]
                );
            const msg = await interaction.reply({
                content: "即將重置所有人的coin(s)，此操作無法反悔。確認刪除?請點選下方按鈕確認。",
                components: [row],
                fetchReply: true
            });
            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });

            collector.on('collect', async i => {

                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });

                await i.deferUpdate();

                let filename = fs.readdirSync(`./data/guildData/${interaction.guild.id}/users`);

                filename.forEach(filename => {
                    let parseJsonlist = fs.readFileSync(`./data/guildData/${interaction.guild.id}/users/${filename}`);
                    parseJsonlist = JSON.parse(parseJsonlist);
                    let newUser = new guild.User(parseJsonlist.id, parseJsonlist.tag);
                    newUser.toUser(parseJsonlist);
                    newUser.coins = 100;
                    newUser.lastAwardTime = 0;

                    guildInformation.addUser(newUser);
                    fs.writeFile(
                        `./data/guildData/${interaction.guild.id}/users/${filename}`,
                        JSON.stringify(newUser, null, '\t'
                        ), async function (err) {
                            if (err)
                                return console.log(err);
                        });
                });

                i.editReply({
                    content: `已重置所有人的持有coin(s)。`,
                    components: []
                });
                collector.stop("set");
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消設定。`,
                        components: []
                    });
                }
            });

        } else if (interaction.options.getSubcommand() === "adjust-tax-rate") {
            const row = rowCreate(false);
            const msg = await interaction.reply({
                content:
                    `目前設定的 發還金額比例 為 ${guildInformation.taxRate} %\n` +
                    `點選下方面板調整發還金額比例(最終抽成比例將以開盤當下為標準，若賠率低於1則賠率將設為1)`,
                components: row,
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });

            let rate = 0;
            let isSet = false;
            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                if (!isSet) {
                    if (i.customId === 'delete') {
                        rate = Math.floor(rate / 10);
                    } else if (i.customId === 'complete') {
                        isSet = true;
                    } else {
                        rate += i.customId;
                        rate = Math.min(rate, 100);
                    }
                    const row = rowCreate(rate >= 100);
                    if (isSet) {
                        if (rate === 0) {
                            i.update({
                                content: `發還金額比例請至少設定為大於等於 1 %。`,
                                components: []
                            });
                        } else {
                            guildInformation.taxRate = rate;
                            i.update({
                                content: `已將發還金額比例設為 ${guildInformation.taxRate} %。`,
                                components: []
                            });
                        }
                        collector.stop("set");
                    } else {
                        i.update({
                            content:
                                `目前設定的 發還金額比例 為 ${guildInformation.taxRate} %\n` +
                                `點選下方面板調整發還金額比例(最終抽成比例將以開盤當下為標準，若賠率低於1則賠率將設為1)\n` +
                                `\`\`\`\n調整後的發還金額比例: ${rate} %\n\`\`\``,
                            components: row
                        });
                    }
                    collector.resetTimer({ time: 120 * 1000 });
                }
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消設定。`,
                        components: []
                    });
                }
            });
        }

    }
}

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