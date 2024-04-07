const Discord = require('discord.js');
const guild = require('../functions/guildInfo');
const fs = require('fs');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('user')
        .setDescription('用戶')
        .addSubcommand(opt =>
            opt.setName('info')
                .setDescription('查看該用戶的資料')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('要查看的對象')
                )
        ).addSubcommand(opt =>
            opt.setName('ranking')
                .setDescription('查看等級排行')
                .addStringOption(opt =>
                    opt.setName('sort-by')
                        .setDescription('選擇要排行的排序依據')
                        .addChoices(
                            { name: '持有coin(s)', value: 'coins' },
                            { name: '總下注coin(s)', value: 'totalBet' },
                            { name: '總獲得coin(s)', value: 'totalGet' }
                        )
                        .setRequired(true)
                )
        ).addSubcommand(opt =>
            opt.setName('setting')
                .setDescription('用戶相關設定(由管理員操控)')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('要查看的對象')
                        .setRequired(true)
                )
        )/*.addSubcommand(opt =>
            opt.setName('group-setting')
            .setDescription('用戶相關設定(由管理員操控)')
            .addRoleOption(opt => 
                opt.setName('user')
                .setDescription('要查看的對象')
                .setRequired(true)
            )
        )*/,
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.guildInformation} guildInformation 
     */
    async execute(interaction, guildInformation) {

        if (interaction.options.getSubcommand() === 'info') {

            let user = interaction.options.getUser('user') ?? interaction.user;

            let userData = guildInformation.getUser(user.id);
            if (!userData) {
                userData = fs.readdirSync(`./data/guildData/${interaction.guild.id}/users`)
                    .filter(file => file.endsWith('.json') && file.startsWith(user.id));
                if (userData.length === 0) {
                    return interaction.reply({ content: `在我的資料中沒有 ${user} 的資料。可能是因為他不在這個伺服器，或者沒有參與遊戲。`, ephemeral: true });
                } else {
                    try {
                        let parseJsonlist = fs.readFileSync(`./data/guildData/${interaction.guild.id}/users/${user.id}.json`);
                        parseJsonlist = JSON.parse(parseJsonlist);
                        userData = new guild.User(parseJsonlist.id, parseJsonlist.tag);
                        userData.toUser(parseJsonlist);
                    } catch (err) {
                        console.error(err);
                    }
                }
            }

            let embed = new Discord.EmbedBuilder()
                .setColor(process.env.EMBEDCOLOR)
                .addFields(
                    { name: '持有金錢', value: userData.coins + " coin(s)", inline: true },
                    { name: '累計下注', value: userData.totalBet + " coin(s)", inline: true },
                    { name: '累計獲得', value: userData.totalGet + " coin(s)", inline: true },
                    { name: '回收率', value: userData.totalBet > 0 ? Math.floor((userData.totalGet / userData.totalBet) * 100) + "%" : "無法計測", inline: true },
                    { name: '參與次數', value: `${userData.joinTimes}`, inline: true },
                    { name: '平均獲得', value: userData.joinTimes > 0 ? ((userData.totalGet / userData.joinTimes)) + 'coin(s)' : "無法計測", inline: true },
                )
                .setFooter({
                    text: `${interaction.client.user.tag} | ${interaction.client.user.id}`,
                    iconURL: interaction.client.user.displayAvatarURL({ extension: "png" })
                })
                .setTimestamp();


            if (interaction.guild.members.cache.get(user.id).nickname)
                embed.setAuthor({
                    name: `${interaction.guild.members.cache.get(user.id).nickname} (${user.tag})`,
                    iconURL: user.displayAvatarURL({ dynamic: true })
                });
            else
                embed.setAuthor({
                    name: `${user.tag}`,
                    iconURL: user.displayAvatarURL({ dynamic: true })
                });

            interaction.reply({ embeds: [embed] });

        } else if (interaction.options.getSubcommand() === 'ranking') {
            await interaction.deferReply();
            let mode = interaction.options.getString('sort-by');
            /**
             * @type {Array<guild.User>}
             */
            let userList = [];
            let filename = fs.readdirSync(`./data/guildData/${interaction.guild.id}/users`);
            filename.forEach(filename => {
                let parseJsonlist = fs.readFileSync(`./data/guildData/${interaction.guild.id}/users/${filename}`);
                parseJsonlist = JSON.parse(parseJsonlist);
                let newUser = new guild.User(parseJsonlist.id, parseJsonlist.tag);
                newUser.toUser(parseJsonlist);
                userList.push(newUser);
            });
            userList.sort((a, b) => b[mode] - a[mode]);

            const pageShowHax = 10;
            let page = 0;
            const levels = levelsEmbed(interaction.guild, userList, page, pageShowHax, mode);
            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    [
                        new Discord.ButtonBuilder()
                            .setCustomId('上一頁')
                            .setLabel('上一頁')
                            .setStyle(Discord.ButtonStyle.Primary),
                        new Discord.ButtonBuilder()
                            .setCustomId('下一頁')
                            .setLabel('下一頁')
                            .setStyle(Discord.ButtonStyle.Primary),
                    ]
                );
            const msg = await interaction.editReply({ embeds: [levels], components: [row], fetchReply: true });

            const filter = i => ['上一頁', '下一頁'].includes(i.customId) && !i.user.bot;
            const collector = msg.createMessageComponentCollector({ filter, time: 60 * 1000 });

            collector.on('collect', async i => {
                if (i.customId === '下一頁')
                    if (page * pageShowHax + pageShowHax < userList.length) page++;
                if (i.customId === '上一頁')
                    if (page > 0) page--;
                const levels = levelsEmbed(interaction.guild, userList, page, pageShowHax, mode);
                i.update({ embeds: [levels], components: [row] });
                collector.resetTimer({ time: 60 * 1000 });
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete") {
                    const levels = levelsEmbed(interaction.guild, userList, page, pageShowHax, mode);
                    interaction.editReply({ embeds: [levels], components: [] })
                }
            });

        } else {
            //權限
            if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.ManageMessages)) {
                return interaction.reply({ content: "此指令僅限管理員使用。", ephemeral: true });
            }
        }

        //以下需要管理權限
        if (interaction.options.getSubcommand() === 'setting') {
            let user = interaction.options.getUser('user') ?? interaction.user;

            let userData = guildInformation.getUser(user.id);
            if (!userData) {
                userData = fs.readdirSync(`./data/guildData/${interaction.guild.id}/users`)
                    .filter(file => file.endsWith('.json') && file.startsWith(user.id));
                if (userData.length === 0) {
                    return interaction.reply({ content: `在我的資料中沒有 ${user} 的資料。可能是因為他不在這個伺服器，或者沒有參與遊戲。`, ephemeral: true });
                } else {
                    try {
                        let parseJsonlist = fs.readFileSync(`./data/guildData/${interaction.guild.id}/users/${user.id}.json`);
                        parseJsonlist = JSON.parse(parseJsonlist);
                        userData = new guild.User(parseJsonlist.id, parseJsonlist.tag);
                        userData.toUser(parseJsonlist);
                    } catch (err) {
                        console.error(err);
                    }
                }
            }

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    [
                        new Discord.ButtonBuilder()
                            .setCustomId('add')
                            .setLabel('為該用戶追加coin(s)')
                            .setStyle(Discord.ButtonStyle.Primary),
                        new Discord.ButtonBuilder()
                            .setCustomId('reduce')
                            .setLabel('扣除該用戶的coin(s)')
                            .setStyle(Discord.ButtonStyle.Primary),
                        new Discord.ButtonBuilder()
                            .setCustomId('reset')
                            .setLabel('重置該用戶的coin(s)與下注紀錄')
                            .setStyle(Discord.ButtonStyle.Primary),
                    ]
                );
            const msg = await interaction.reply({
                content: `請選擇要對 <@${userData.id}> 執行的項目。`,
                components: [row],
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });
            let optionChoose = "";
            let isMoneySet = false;
            let money = 0;
            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                if (!optionChoose) {
                    optionChoose = i.customId;

                    if (optionChoose === "add" || optionChoose === 'reduce') {
                        const row = rowCreate(false);
                        i.update({
                            content:
                                `選擇的對象為: <@${userData.id}>\n` +
                                `對象目前持有金額為: \$${userData.coins} coin(s)\n` +
                                `請輸入要${optionChoose === 'add' ? '發放' : '收回'}的金額。`,
                            components: row
                        });
                        collector.resetTimer({ time: 180 * 1000 });

                    } else if (optionChoose === 'reset') {
                        const row = new Discord.MessageActionRow()
                            .addComponents(
                                [
                                    new Discord.MessageButton()
                                        .setCustomId('promise')
                                        .setLabel('確認重置')
                                        .setStyle('PRIMARY'),
                                ]
                            );
                        i.update({
                            content: `即將重置 <@${userData.id}> 的持有coin(s)與下注紀錄。確認重置?請點選下方按鈕確認。`,
                            components: [row],
                            fetchReply: true
                        });
                        collector.resetTimer({ time: 120 * 1000 });
                    }

                } else if (optionChoose === "add" || optionChoose === 'reduce') {
                    await i.deferUpdate();
                    if (i.customId === 'delete') {
                        money = Math.floor(money / 10);
                    } else if (i.customId === 'complete') {
                        isMoneySet = true;
                    } else {
                        money += i.customId;
                        if (optionChoose === 'add') {
                            money = Math.min(money, 1000_0000);
                        } else {
                            money = Math.min(money, userData.coins);
                        }

                    }
                    if (!isMoneySet) {
                        const row = rowCreate(optionChoose === 'add' ? money >= 1000_0000 : money >= userData.coins);
                        i.editReply({
                            content:
                                `選擇的對象為: <@${userData.id}>\n` +
                                `對象目前持有金額為: \$${userData.coins} coin(s)\n` +
                                `請輸入要${optionChoose === 'add' ? '發放' : '收回'}的金額。\n` +
                                `\`\`\`\n${optionChoose === 'add' ? '發放' : '收回'}金額: \$${money} coin(s)\n\`\`\``,
                            components: row
                        });
                    } else {
                        if (money === 0) {
                            i.editReply({
                                content: `因為輸入金額為 0 coin，因此不做${optionChoose === 'add' ? '發放' : '收回'}。`,
                                components: []
                            });
                        } else {
                            if (optionChoose === 'reduce' && userData.coins - money < 0) {
                                return i.update({
                                    content: `收回的金額超過對方持有的金額，因此無法收回。`,
                                    components: []
                                });
                            }
                            if (optionChoose === 'add')
                                userData.coins += money;
                            else
                                userData.coins -= money;
                            i.editReply({
                                content: `${optionChoose === 'add' ? '發放' : '收回'}成功!\n對象: <@${userData.id}>\n金額: ${money} coin(s)`,
                                components: []
                            });
                            fs.writeFile(
                                `./data/guildData/${guildInformation.id}/users/${userData.id}.json`,
                                JSON.stringify(userData, null, '\t'), async function (err) {
                                    if (err)
                                        return console.log(err);
                                });
                        }
                        collector.stop("set");
                    }
                } else if (optionChoose === 'reset') {

                    userData.coins = 100;
                    userData.totalBet = 0;
                    userData.totalGet = 0;
                    userData.joinTimes = 0;
                    userData.lastAwardTime = 0;
                    i.update({
                        content: `已重置 <@${userData.id}> 的持有coin(s)與下注紀錄。`,
                        components: []
                    });
                    collector.stop("set");
                    fs.writeFile(
                        `./data/guildData/${guildInformation.id}/users/${userData.id}.json`,
                        JSON.stringify(userData, null, '\t'), async function (err) {
                            if (err)
                                return console.log(err);
                        });
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

    },
};

/**
 * 顯示整個伺服器的經驗值排名
 * @param {Discord.Guild} guild 該伺服器的Discord資料
 * @param {Array<guild.User>} element 該伺服器的資訊
 * @param {number} page 頁數
 * @param {number} pageShowHax 單頁上限 
 * @param {string} mode 模式
 * @returns 包含排名的Discord.MessageEmbed
 */
function levelsEmbed(guild, element, page, pageShowHax, mode) {
    //#region 等級排行顯示清單
    let modestr = "";
    if (mode === 'coins') modestr = '持有coin(s)';
    else if (mode === 'totalBet') modestr = '總下注coin(s)';
    else if (mode === 'totalGet') modestr = '總獲得coin(s)';
    let embed = new Discord.EmbedBuilder()
        .setTitle(`${guild.name} 的${modestr}排行`)
        .setColor(process.env.EMBEDCOLOR)
        .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.jpg`);

    //let ebmsgrk = "";
    //let ebmsgname = "";
    //let ebmsgexp = "";
    for (let i = page * pageShowHax; i < Math.min(page * pageShowHax + pageShowHax, element.length); i++) {
        embed.addFields({
            name: `#${i + 1} ${element[i].tag}`,
            value: `${element[i][mode]} coin(s)`
        });
    }
    embed.setDescription(`#${page * pageShowHax + 1} ~ #${Math.min(page * pageShowHax + pageShowHax, element.length)}` +
        ` / #${element.length}`);

    return embed;
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