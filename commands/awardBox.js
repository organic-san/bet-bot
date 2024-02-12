const Discord = require('discord.js');
const guild = require('../functions/guildInfo');
const fs = require('fs');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('awardbox')
        .setDescription('設定獎勵箱(由管理員操控)')
        .addSubcommand(opt =>
            opt.setName('create')
                .setDescription('設定獎勵箱(可於每日獎勵領取)')
        ).addSubcommand(opt =>
            opt.setName('show')
                .setDescription('設定獎勵箱(可於每日獎勵領取)')
        ).addSubcommand(opt =>
            opt.setName('delete')
                .setDescription('設定獎勵箱(可於每日獎勵領取)')
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

        if (interaction.options.getSubcommand() === 'create') {
            if (fs.readdirSync(`./data/guildData/${guildInformation.id}/awardBox`).length >= 5) {
                return interaction.reply({
                    content:
                        `獎勵箱只能設置到5個。請等待獎勵箱失效或取消獎勵箱。\n注: 獎勵箱將會持續到當日換日時刻3:00(UTC+8)`,
                    components: []
                });
            }
            const row = rowCreate(false);
            const msg = await interaction.reply({
                content:
                    `設立獎勵箱，用以發放給所有人獎勵，可使用/daily獲得獎勵。\n` +
                    `請輸入要設置的獎勵箱的日期長度。`,
                components: row,
                fetchReply: true
            });
            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });

            let time = 0;
            let isTimeSet = false;
            let isMoneySet = false;
            let money = 0;
            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                if (!isTimeSet) {
                    if (i.customId === 'delete') {
                        time = Math.floor(time / 10);
                    } else if (i.customId === 'complete') {
                        isTimeSet = true;
                    } else {
                        time += i.customId;
                        time = Math.min(time, 60);
                    }
                    if (!isTimeSet) {
                        const row = rowCreate(time >= 60);
                        i.update({
                            content:
                                `設立獎勵箱，用以發放給所有人獎勵，可使用/daily獲得獎勵。\n` +
                                `請輸入要設立的獎勵箱的日期長度。` +
                                `\`\`\`\n獎勵箱日期長度: ${time} 日\n\`\`\``,
                            components: row
                        });
                    } else {
                        const row = rowCreate(money >= 100000);
                        i.update({
                            content:
                                `設立獎勵箱，用以發放給所有人獎勵，可使用/daily獲得獎勵。\n` +
                                `請輸入要設立的獎勵箱的金額。` +
                                `\`\`\`\n獎勵箱金額: \$${money} coin(s)\n\`\`\``,
                            components: row
                        });
                    }
                    collector.resetTimer({ time: 120 * 1000 });
                } else {
                    if (time === 0) {
                        collector.stop("set");
                        return i.update({
                            content: `因為輸入日期長度為 0，因此不設立獎勵箱。`,
                            components: []
                        });
                    }
                    if (i.customId === 'delete') {
                        money = Math.floor(money / 10);
                    } else if (i.customId === 'complete') {
                        isMoneySet = true;
                    } else {
                        money += i.customId;
                        money = Math.min(money, 100000);
                    }
                    if (!isMoneySet) {
                        const row = rowCreate(money >= 100000);
                        i.update({
                            content:
                                `設立獎勵箱，用以發放給所有人獎勵，可使用/daily獲得獎勵。\n` +
                                `請輸入要設立的獎勵箱的金額。` +
                                `\`\`\`\n獎勵箱金額: \$${money} coin(s)\n\`\`\``,
                            components: row
                        });
                    } else {
                        if (money === 0) {
                            i.update({
                                content: `因為輸入金額為 0 coin，因此不設立獎勵箱。`,
                                components: []
                            });
                        } else {
                            guildInformation.awardBoxCount++;
                            let awardBox = new guild.betAwardBox(guildInformation.awardBoxCount.toString(), money, time);
                            i.update({
                                content: `成功設定獎勵箱!\n` +
                                    `領取截止時間: <t:${Math.floor((awardBox.endTime) / 1000)}:F>\n金額: ${money} coin(s)`,
                                components: []
                            });
                            fs.writeFile(`./data/guildData/${guildInformation.id}/awardBox/${awardBox.id}.json`,
                                JSON.stringify(awardBox, null, '\t'),
                                err => { if (err) return console.log(err); }
                            );
                            fs.writeFile(`./data/guildData/${guildInformation.id}/basicInfo.json`,
                                JSON.stringify(guildInformation, null, '\t'),
                                err => { if (err) return console.log(err); }
                            );
                        }
                        collector.stop("set");
                    }
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

        } else if (interaction.options.getSubcommand() === 'show') {
            let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/awardBox`);
            if (filename.length <= 0) {
                return interaction.reply({
                    content:
                        `目前並沒有設置獎勵箱。`,
                    components: []
                });
            }
            const embed = new Discord.EmbedBuilder()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`${interaction.guild.name} 的獎勵箱一覽`)
                .setTimestamp()
                .setFooter({
                    text: `${interaction.guild.name}`,
                    iconURL: `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`
                })

            filename.forEach((filename) => {
                try {
                    let awardBox = new guild.betAwardBox('0', 0, 0);
                    awardBox.toAwardBoxObject(
                        JSON.parse(
                            fs.readFileSync(`./data/guildData/${guildInformation.id}/awardBox/${filename}`)
                        )
                    );
                    embed.addFields({
                        name: `獎勵箱 ${awardBox.id}`,
                        value: `設定金額: ${awardBox.coinMuch} \n` +
                            `截止時間: <t:${Math.floor(awardBox.endTime / 1000)}:F> \n` +
                            `領取人數: ${awardBox.awardIdList.length}`
                    });
                } catch (err) {
                    console.error(err);
                }
            });
            interaction.reply({
                content:
                    `以下為目前發放中的獎勵箱。`,
                embeds: [embed],
                components: []
            });

        } else if (interaction.options.getSubcommand() === 'delete') {
            let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/awardBox`);
            if (filename.length <= 0) {
                return interaction.reply({
                    content:
                        `目前並沒有設置獎勵箱。`,
                    components: []
                });
            }
            let boxRowData = [];
            filename.forEach((filename) => {
                try {
                    let awardBox = new guild.betAwardBox('0', 0, 0);
                    awardBox.toAwardBoxObject(
                        JSON.parse(
                            fs.readFileSync(`./data/guildData/${guildInformation.id}/awardBox/${filename}`)
                        )
                    );
                    let time = new Date(awardBox.endTime);
                    boxRowData.push({
                        label: "獎勵箱 " + awardBox.id,
                        value: awardBox.id,
                        description: `設定金額: ${awardBox.coinMuch} ` +
                            `截止時間: ${time.getDate()}日 ` +
                            `${time.getHours()}:${time.getMinutes() < 10 ? '0' + time.getMinutes() : time.getMinutes()}(UTC+8) ` +
                            `領取人數: ${awardBox.awardIdList.length}`
                    });
                } catch (err) {
                    console.error(err);
                }
            });
            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.StringSelectMenuBuilder()
                        .setCustomId('optionSelect')
                        .setPlaceholder('選擇要刪除的獎勵箱')
                        .addOptions(boxRowData),
                );
            const msg = await interaction.reply({
                content:
                    `請選擇要刪除的獎勵箱。`,
                components: [row],
                fetchReply: true
            });
            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });
            let target = '0';

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                if (target == 0) {
                    target = i.values[0];
                    let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/awardBox`);
                    if (!filename.includes(target + '.json')) {
                        collector.stop('set');
                        return i.update({ content: `該獎勵箱已失效或被刪除，因此停止刪除動作。`, components: [] });
                    }
                    try {
                        let awardBox = new guild.betAwardBox('0', 0, 0);
                        awardBox.toAwardBoxObject(
                            JSON.parse(
                                fs.readFileSync(`./data/guildData/${guildInformation.id}/awardBox/${target + '.json'}`)
                            )
                        );
                        const row = new Discord.ActionRowBuilder()
                            .addComponents(
                                [
                                    new Discord.ButtonBuilder()
                                        .setCustomId('promise')
                                        .setLabel('確認刪除')
                                        .setStyle(Discord.ButtonStyle.Primary),
                                ]
                            );
                        i.update({
                            content:
                                `即將刪除獎勵箱 ${awardBox.id}。確認刪除?請點擊下方按鈕。` +
                                "獎勵箱資訊:\n" +
                                `設定金額: ${awardBox.coinMuch}\n` +
                                `起始時間: <t:${Math.floor(awardBox.startTime / 1000)}:F>\n` +
                                `截止時間: <t:${Math.floor(awardBox.endTime / 1000)}:F>\n` +
                                `領取人數: ${awardBox.awardIdList.length}`
                            , components: [row]
                        }
                        );
                    } catch (err) {
                        console.error(err);
                    }
                    collector.resetTimer({ time: 120 * 1000 });

                } else {
                    let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/awardBox`);
                    if (!filename.includes(target + '.json')) {
                        collector.stop('set');
                        return i.update({ content: `該獎勵箱已失效或被刪除，因此停止刪除動作。`, components: [] });
                    }
                    try {
                        let awardBox = new guild.betAwardBox('0', 0, 0);
                        awardBox.toAwardBoxObject(
                            JSON.parse(
                                fs.readFileSync(`./data/guildData/${guildInformation.id}/awardBox/${target + '.json'}`)
                            )
                        );
                        fs.unlink(`./data/guildData/${guildInformation.id}/awardBox/${target + '.json'}`, function () {
                            console.log(`刪除: ${guildInformation.name} 的獎勵箱 ID: ${awardBox.id} (手動刪除)`);
                        });
                        i.update({
                            content:
                                `已刪除該獎勵箱 ${awardBox.id}。` +
                                "獎勵箱資訊:\n" +
                                `設定金額: ${awardBox.coinMuch}\n` +
                                `起始時間: <t:${Math.floor(awardBox.startTime / 1000)}:F>\n` +
                                `截止時間: <t:${Math.floor(awardBox.endTime / 1000)}:F>\n` +
                                `領取人數: ${awardBox.awardIdList.length}`
                            , components: []
                        }
                        );
                    } catch (err) {
                        console.error(err);
                    }
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