const { SlashCommandBuilder } = require('@discordjs/builders');
const guild = require('../functions/guildInfo');
const fs = require('fs');
const Discord = require('discord.js');
const user = require('./user');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setting')
        .setDescription('與系統相關的設定或查詢，例如顯示結果或設定獎勵箱(由管理員操控)')
        .addStringOption(opt => 
            opt.setName('option')
            .setDescription('選擇要排行的排序依據')
            .addChoice('顯示賭盤的投注紀錄', 'all')
            .addChoice('顯示上次賭盤的下注結果', 'result')
            .addChoice('重置所有人的coin(s)', 'reset')
            .addChoice('設定獎勵箱(可於每日獎勵領取)', 'awardBoxCreate')
            .addChoice('查看所有獎勵箱', 'awardBoxShow')
            .addChoice('刪除獎勵箱', 'awardBoxDelete')
            .addChoice('設定賭盤模板', 'betTemplateCreate')
            .addChoice('查看賭盤模板', 'betTemplateShow')
            .addChoice('修改既有的賭盤模板', 'betTemplateEdit')
            .addChoice('刪除賭盤模板', 'betTemplateDelete')
            .setRequired(true)
        ),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.guildInformation} guildInformation
     */
	async execute(interaction, guildInformation) {
        //權限
        if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_MESSAGES)){ 
            return interaction.reply({content: "此指令僅限管理員使用。", ephemeral: true});
        }

        let option = interaction.options.getString('option');
        if(option === 'all') {
            //if(guildInformation.betInfo.isPlaying === 0) 
            //    return interaction.reply({content: "目前並未舉行賭盤。", components:[]});

            if(guildInformation.betInfo.betRecord.length === 0) 
                return interaction.reply({content: "賭盤中搜尋不到投注紀錄。", components:[]});

            const row = new Discord.MessageActionRow()
            .addComponents(
                [
                    new Discord.MessageButton()
                        .setCustomId('promise')
                        .setLabel('確認顯示')
                        .setStyle('PRIMARY'),
                ]
            );
            
            const msg = await interaction.reply({
                content: "即將顯示所有投注紀錄，內容可能會造成洗版。確認顯示?請點選下方按鈕確認。", 
                components: [row],
                fetchReply: true
            });
            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });

            collector.on('collect', async i => {
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
                i.update({
                    content: `即將顯示所有投注紀錄。`, 
                    components: []
                })
                const onePpageMax = 20;
                let playing = guildInformation.betInfo.isPlaying;
                for(let i = 0; i < Math.floor((guildInformation.betInfo.betRecord.length - 1) / onePpageMax) + 1; i++) {
                    const embed = new Discord.MessageEmbed()
                    .setColor(process.env.EMBEDCOLOR)
                    .setTitle(`目前賭盤: ${guildInformation.betInfo.name} | ${playing === 1 ? "🟢投注中" : (playing === 2 ? "🔴封盤中" : "🟡已開盤")}`)
                    .setTimestamp()
                    .setFooter(`${interaction.guild.name} | 第 ${i + 1} 頁`,
                        `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`);
                    
                    let nameStr = [];
                    let coinStr = [];
                    let targetStr = [];
                    for(let j = i * onePpageMax; j < Math.min(i * onePpageMax + onePpageMax, guildInformation.betInfo.betRecord.length); j++) {
                        const target = guildInformation.betInfo.getOption(guildInformation.betInfo.betRecord[j].optionId);
                        nameStr.push(
                            "<t:" + Math.floor(guildInformation.betInfo.betRecord[j].time / 1000) + ":T> "
                            + '<@' + guildInformation.betInfo.betRecord[j].userId + '>'
                        );
                        coinStr.push(guildInformation.betInfo.betRecord[j].coins.toString());
                        targetStr.push(target.name);
                    }
                    embed
                        .addField('投注時間與用戶名稱', nameStr.join('\n'), true)
                        .addField('投注金額', coinStr.join('\n'), true)
                        .addField('投注對象', targetStr.join('\n'), true);

                    await interaction.channel.send({embeds: [embed]});
                }
                collector.stop("set");
            });

            collector.on('end', (c, r) => {
                if(r !== "messageDelete" && r !== "user" && r !== "set"){
                    interaction.editReply({
                        content: `取消設定。`, 
                        components: []
                    });
                }
            });
            
        }else if(option === 'result') {
            if(guildInformation.betInfo.isPlaying !== 0) 
                return interaction.reply({content: "賭盤正進行中，尚未產生結果。", components: [] });

            if(guildInformation.betInfo.betRecord.length === 0) 
                return interaction.reply({content: "上次賭盤沒有下注紀錄。", components:[]});

            const row = new Discord.MessageActionRow()
            .addComponents(
                [
                    new Discord.MessageButton()
                        .setCustomId('promise')
                        .setLabel('確認顯示')
                        .setStyle('PRIMARY'),
                ]
            );

            const msg = await interaction.reply({
                content: "即將顯示下注結果，內容可能會造成洗版。確認顯示?請點選下方按鈕確認。", 
                components: [row],
                fetchReply: true
            });
            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });

            collector.on('collect', async i => {
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
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
                    //TODO: 顯示單一用戶累計獲得量
                    for(let i = 0; i < guildInformation.betInfo.betRecord.length; i++) {
                        let uid = guildInformation.betInfo.betRecord[i].userId;
                        let cis = guildInformation.betInfo.betRecord[i].coins;
                        let get = guildInformation.betInfo.betRecord[i].optionId === (result.winner.id ? mag : 0);
                        if(total.has(uid))
                            total.set(uid, [total.get(uid)[0] + cis, total.get(uid)[1] + cis * get]);
                        else
                            total.set(uid, [cis, cis * get]);
                        
                    }
                    let c = 0;
                    total.forEach((v, k) => {
                        nameStr[Math.floor(c/20)].push('<@' + k + '>');
                        coinStr[Math.floor(c/20)].push(v[0] + ' coin(s)');
                        getStr[Math.floor(c/20)].push(Math.floor(v[1]) + ' coin(s)');
                        c++;
                    });
                    for(let i = 0; i < nameStr.length; i++){
                        const embed = new Discord.MessageEmbed()
                            .setColor(process.env.EMBEDCOLOR)
                            .setTitle(`賭盤: ${guildInformation.betInfo.name} 的結果`)
                            .setTimestamp()
                            .setFooter(`${interaction.guild.name} | 第 ${i + 1} 頁`,
                                `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`)
                            .addField('用戶名稱', nameStr[i].join('\n'), true)
                            .addField('投注金額', coinStr[i].join('\n'), true)
                            .addField('獲得金額', getStr[i].join('\n'), true);
                        await interaction.channel.send({embeds: [embed]});
                    }

                } catch(err) {
                    console.error(err);
                }
                collector.stop("set");
            });

            collector.on('end', (c, r) => {
                if(r !== "messageDelete" && r !== "user" && r !== "set"){
                    interaction.editReply({
                        content: `取消設定。`, 
                        components: []
                    });
                }
            });
        
        }else if(option === 'reset') {
            if(guildInformation.betInfo.isPlaying !== 0) 
                return interaction.reply({content: "請先關閉當前賭盤再執行本操作。", components: [] });

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
            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });

            collector.on('collect', async i => {
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
                await i.deferUpdate();
                let filename = fs.readdirSync(`./data/guildData/${interaction.guild.id}/users`);
                filename.forEach(filename => {
                    let parseJsonlist = fs.readFileSync(`./data/guildData/${interaction.guild.id}/users/${filename}`);
                    parseJsonlist = JSON.parse(parseJsonlist);
                    let newUser = new guild.User(parseJsonlist.id, parseJsonlist.tag);
                    newUser.toUser(parseJsonlist);
                    newUser.coins = 100;
                    newUser.lastAwardTime = 0;
                    if(guildInformation.getUser(newUser.id)) {
                        guildInformation.getUser(newUser.id).coins = 100;
                        guildInformation.getUser(newUser.id).lastAwardTime = 0;
                    }
                    fs.writeFile(
                        `./data/guildData/${interaction.guild.id}/users/${filename}`, 
                        JSON.stringify(newUser.outputUser(), null, '\t'
                    ),async function (err) {
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
                if(r !== "messageDelete" && r !== "user" && r !== "set"){
                    interaction.editReply({
                        content: `取消設定。`, 
                        components: []
                    });
                }
            });

        }else if(option === 'awardBoxCreate') {
            if(fs.readdirSync(`./data/guildData/${guildInformation.id}/awardBox`).length >= 5) {
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
            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });

            let time = 0;
            let isTimeSet = false;
            let isMoneySet = false;
            let money = 0;
            collector.on('collect', async i => {
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
                if(!isTimeSet) {
                    if(i.customId === 'delete') {
                        time = Math.floor(time / 10);
                    } else if(i.customId === 'complete') {
                        isTimeSet = true;
                    } else {
                        time += i.customId;
                        time = Math.min(time, 60);
                    }
                    if(!isTimeSet) {
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
                    if(time === 0) {
                        collector.stop("set");
                        return i.update({
                            content: `因為輸入日期長度為 0，因此不設立獎勵箱。`, 
                            components: []
                        });
                    }
                    if(i.customId === 'delete') {
                        money = Math.floor(money / 10);
                    } else if(i.customId === 'complete') {
                        isMoneySet = true;
                    } else {
                        money += i.customId;
                        money = Math.min(money, 100000);
                    }
                    if(!isMoneySet) {
                        const row = rowCreate(money >= 100000);
                        i.update({
                            content: 
                                `設立獎勵箱，用以發放給所有人獎勵，可使用/daily獲得獎勵。\n` +
                                `請輸入要設立的獎勵箱的金額。` +
                                `\`\`\`\n獎勵箱金額: \$${money} coin(s)\n\`\`\``, 
                            components: row
                        });
                    } else {
                        if(money === 0) {
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
                                err => { if (err) return console.log(err);}
                            );
                            fs.writeFile(`./data/guildData/${guildInformation.id}/basicInfo.json`,
                                JSON.stringify(guildInformation.outputBasic(), null, '\t'),
                                err => { if (err) return console.log(err);}
                            );
                        }
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

        }else if(option === 'awardBoxShow') {
            let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/awardBox`);
            if(filename.length <= 0) {
                return interaction.reply({
                    content: 
                        `目前並沒有設置獎勵箱。`, 
                    components: []
                });
            }
            const embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .setTitle(`${interaction.guild.name} 的獎勵箱一覽`)
                .setTimestamp()
                .setFooter(
                    `${interaction.guild.name}`,
                    `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`
                );
            
            filename.forEach((filename) => {
                try{
                    let awardBox = new guild.betAwardBox('0', 0, 0);
                    awardBox.toAwardBoxObject(
                        JSON.parse(
                            fs.readFileSync(`./data/guildData/${guildInformation.id}/awardBox/${filename}`)
                        )
                    );
                    embed.addField("獎勵箱 " + awardBox.id, 
                        `設定金額: ${awardBox.coinMuch}\n` + 
                        `起始時間: <t:${Math.floor(awardBox.startTime / 1000)}:F>\n` +
                        `截止時間: <t:${Math.floor(awardBox.endTime / 1000)}:F>\n` +
                        `領取人數: ${awardBox.awardIdList.length}`
                    )
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

        }else if(option === 'awardBoxDelete') {
            let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/awardBox`);
            if(filename.length <= 0) {
                return interaction.reply({
                    content: 
                        `目前並沒有設置獎勵箱。`, 
                    components: []
                });
            }
            let boxRowData = [];
            filename.forEach((filename) => {
                try{
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
                        `${time.getHours()}:${time.getMinutes()<10?'0'+time.getMinutes():time.getMinutes()}(UTC+8) ` +
                        `領取人數: ${awardBox.awardIdList.length}`
                    });
                } catch (err) {
                    console.error(err);
                }
            });
            const row = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageSelectMenu()
                    .setCustomId('optionSelect')
                    .setPlaceholder('選擇要刪除的獎勵箱')
                    .addOptions(boxRowData),
            );
            const msg = await interaction.reply({
                content: 
                    `請選擇要刪除的獎勵箱。`, 
                components: row,
                fetchReply: true
            });
            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });
            let target = '0';
            
            collector.on('collect', async i => {
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
                if(target == 0) {
                    target = i.values[0];
                    let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/awardBox`);
                    if(!filename.includes(target + '.json')) {
                        collector.stop('set');
                        return i.update({content: `該獎勵箱已失效或被刪除，因此停止刪除動作。`, components: []});
                    }
                    try{
                        let awardBox = new guild.betAwardBox('0', 0, 0);
                        awardBox.toAwardBoxObject(
                            JSON.parse(
                                fs.readFileSync(`./data/guildData/${guildInformation.id}/awardBox/${target + '.json'}`)
                            )
                        );
                        const row = new Discord.MessageActionRow()
                            .addComponents(
                                [
                                    new Discord.MessageButton()
                                        .setCustomId('promise')
                                        .setLabel('確認刪除')
                                        .setStyle('PRIMARY'),
                                ]
                            );
                        i.update({content: 
                            `即將刪除獎勵箱 ${awardBox.id}。確認刪除?請點擊下方按鈕。` + 
                            "獎勵箱資訊:\n" + 
                            `設定金額: ${awardBox.coinMuch}\n` + 
                            `起始時間: <t:${Math.floor(awardBox.startTime / 1000)}:F>\n` +
                            `截止時間: <t:${Math.floor(awardBox.endTime / 1000)}:F>\n` +
                            `領取人數: ${awardBox.awardIdList.length}`
                            , components: [row]}
                        );
                    } catch (err) {
                        console.error(err);
                    }
                    collector.resetTimer({ time: 120 * 1000 });
                    
                } else {
                    let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/awardBox`);
                    if(!filename.includes(target + '.json')) {
                        collector.stop('set');
                        return i.update({content: `該獎勵箱已失效或被刪除，因此停止刪除動作。`, components: []});
                    }
                    try{
                        let awardBox = new guild.betAwardBox('0', 0, 0);
                        awardBox.toAwardBoxObject(
                            JSON.parse(
                                fs.readFileSync(`./data/guildData/${guildInformation.id}/awardBox/${target + '.json'}`)
                            )
                        );
                        fs.unlink(`./data/guildData/${guildInformation.id}/awardBox/${target + '.json'}`, function () {
                            console.log(`刪除: ${guildInformation.name} 的獎勵箱 ID: ${awardBox.id} (手動刪除)`);
                        });
                        i.update({content: 
                            `已刪除該獎勵箱 ${awardBox.id}。`+ 
                            "獎勵箱資訊:\n" +
                            `設定金額: ${awardBox.coinMuch}\n` + 
                            `起始時間: <t:${Math.floor(awardBox.startTime / 1000)}:F>\n` +
                            `截止時間: <t:${Math.floor(awardBox.endTime / 1000)}:F>\n` +
                            `領取人數: ${awardBox.awardIdList.length}`
                            , components: []}
                        );
                    } catch (err) {
                        console.error(err);
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

        } else if(option === 'betTemplateCreate') {
            const overtimeLimit = 5 * 60;
            const titleLengthLimit = 40;
            const descriptionLengthLimit = 250;
            let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/betTemplate`);
            filename.forEach((v, i) => filename[i] = v.slice(0, v.length - 5));
            const msg = await interaction.reply(
                {
                    content: "建立賭盤模板: 建立作為賭盤舉行用的賭盤模板，以進行賭盤。\n" +
                        "建立賭盤模板時的幾項規則: \n" +
                        "1. 標題不可與已設定的賭盤模板相同。\n" +
                        "2. 選項至多20項，至少2項。\n" +
                        `3. 名稱類上限為${titleLengthLimit}字。\n` +
                        `4. 說明類上限為${descriptionLengthLimit}字。\n` +
                        "5. 如果一定時間(" + overtimeLimit / 60 + "分鐘)沒有操作，將取消建立流程。\n" +
                        `⬇️請在這個頻道中輸入要設定的**模板名稱**(上限${titleLengthLimit}字)。`,
                    fetchReply: true,
                }
            );

            const filter = message => message.author.id === interaction.user.id;
            let collected = await interaction.channel.awaitMessages({filter: filter,  max: 1, time: overtimeLimit * 1000 });
            let name = collected.first().content;
            if (!name) return interaction.editReply(`設定失敗: 輸入逾時，已取消設定。`);
            if(name.length > titleLengthLimit) return interaction.editReply(`設定失敗: 超過字數限制，已取消設定。`);
            if(filename.includes(name)) return interaction.editReply(`設定失敗: 已有相同名稱之模版。修改模版可以使用/setting。`);
            interaction.editReply({
                content: "標題設定成功: 「" + name + "」。\n" +
                    `⬇️請在這個頻道中輸入要設定的**模板說明**(上限${descriptionLengthLimit}字)。`
            })

            collected = await interaction.channel.awaitMessages({filter: filter,  max: 1, time: overtimeLimit * 1000 });
            let description = collected.first().content;
            if (!description) return interaction.editReply(`設定失敗: 輸入逾時，已取消設定。`);
            if(description.length > descriptionLengthLimit) return interaction.editReply(`設定失敗: 超過字數限制，已取消設定。`);

            const template = new guild.betTemplateObject(name, description, [], []);
            

            interaction.editReply({
                content: "賭盤說明設定成功! 目前賭盤的設定如下。\n" +
                    `🛠️請選擇要執行的操作。`,
                embeds: [templateEmbed(template, interaction)],
                components: [buttomComponent(template.option.length)],
            })
            
            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });
            let mode = "";
            let removeOption = "";

            collector.on('collect', async i => {
                await i.deferUpdate();
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
                
                if(!i.values) mode = i.customId;
                else removeOption = i.values[0];
                
                if(mode === "add") {
                    interaction.editReply({
                        content: "建立新選項: 為這個賭盤模板新增選項。\n" +
                            `⬇️請在這個頻道中輸入要新增的**選項名稱**(上限${titleLengthLimit}字)。`,
                        embeds: [],
                        components: [],
                    })
                    collector.resetTimer({ time: overtimeLimit * 1000 + 60 * 1000 });
                    let collected = await interaction.channel.awaitMessages({filter: filter,  max: 1, time: overtimeLimit * 1000 });
                    let name = collected.first().content;
                    let reason = "";
                    let description = "";

                    if (!name) 
                        reason = `選項新增失敗: 名稱輸入逾時，取消新增選項。`;
                    if(name.length > titleLengthLimit) 
                        reason = `選項新增失敗: 名稱超過字數限制，取消新增選項。`;
                    if(template.isNameUsed(name)) reason = `選項新增失敗: 此選項名稱已使用。`;

                    if(!reason) {
                        interaction.editReply({
                            content: "選項名稱設定成功: 「" + name + "」。\n" +
                                `⬇️請在這個頻道中輸入要設定的**選項說明**(上限${descriptionLengthLimit}字)。`,
                                components: [],
                        })
                        collector.resetTimer({ time: overtimeLimit * 1000 + 60 * 1000 });
                        collected = await interaction.channel.awaitMessages({filter: filter,  max: 1, time: overtimeLimit * 1000 });
                        description = collected.first().content;

                        if (!description) 
                            reason = `選項新增失敗: 說明輸入逾時，取消新增選項。`;
                        if(description.length > descriptionLengthLimit) 
                            reason = `選項新增失敗: 說明超過字數限制，取消新增選項。`;
                    }

                    if(reason) {
                        interaction.editReply({
                            content: `${reason}\n` +
                                `🛠️請選擇要執行的操作。`,
                            embeds: [templateEmbed(template, interaction)],
                            components: [buttomComponent(template.option.length)],
                        })
                    } else {
                        template.addOption({name: name, description: description});
                        interaction.editReply({
                            content: `選項新增成功: 新增第 ${template.option.length} 個選項「${name}」。\n` +
                                `🛠️請選擇要執行的操作。`,
                            embeds: [templateEmbed(template, interaction)],
                            components: [buttomComponent(template.option.length)],
                        });
                    }
                    collector.resetTimer({ time: overtimeLimit * 1000 });

                } else if(mode === "remove") {
                    if(!removeOption) {
                        let rowData = [];
                        template.option.forEach((opt) => {
                            rowData.push({
                                label: "選項: " + opt.name,
                                value: opt.name,
                                description: opt.description
                            });
                        });
                        
                        const row = new Discord.MessageActionRow()
                        .addComponents(
                            new Discord.MessageSelectMenu()
                                .setCustomId('optionSelect')
                                .setPlaceholder('選擇要刪除的選項')
                                .addOptions(rowData),
                        );
                        interaction.editReply({
                            content: 
                                `🛠️請選擇要要刪除的選項。`, 
                            components: [row],
                        });
                        collector.resetTimer({ time: overtimeLimit * 1000 });
                    } else {
                        let removedItem = template.removeOption(removeOption)[0];
                        interaction.editReply({
                            content: `選項刪除成功: 移除選項「${removedItem.name}」: ${removedItem.description}。\n` +
                                `🛠️請選擇要執行的操作。`,
                            embeds: [templateEmbed(template, interaction)],
                            components: [buttomComponent(template.option.length)],
                        });
                        removedItem = "";
                    }


                } else if(mode === "complete") {
                    interaction.editReply({
                        content: `請確認目前的賭盤模板設定。\n` +
                            `🛠️確認後請按下確認按鈕。`,
                        embeds: [templateEmbed(template, interaction)],
                        components: [CompleteButtomComponent()],
                    });
                    
                } else if(mode === "checked") {
                    collector.stop("set");
                    let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/betTemplate`);
                    filename.forEach((v, i) => filename[i] = v.slice(0, v.length - 5));
                    if(filename.includes(template.name)) {
                        return interaction.editReply({
                            content: `設定失敗: 已有相同名稱之模版，可能是其他用戶在您設定時新增了模板。修改模版可以使用/setting。`,
                            embeds: [],
                            components: [],
                        });
                    }
                    template.option.forEach((value, index) => {
                        value.id = (index + 1).toString();
                    });
                    fs.writeFile(
                        `./data/guildData/${interaction.guild.id}/betTemplate/${template.name}.json`, 
                        JSON.stringify(template, null, '\t'),
                        async function (err) { if (err) return console.log(err) }
                    );
                    interaction.editReply({
                        content: `設定完成: 新增模板「${template.name}」。`,
                        embeds: [],
                        components: [],
                    });

                } else if(mode === "cancel") {
                    interaction.editReply({
                        content: `已取消目前的動作。\n` +
                            `🛠️請選擇要執行的操作。`,
                        embeds: [templateEmbed(template, interaction)],
                        components: [buttomComponent(template.option.length)],
                    });
                    collector.resetTimer({ time: overtimeLimit * 1000 });

                } else {
                    throw "Error: interaction/setting/betTemplateCreate | 不存在的模式呼喚";
                }
            });

            collector.on('end', (c, r) => {
                if(r !== "messageDelete" && r !== "user" && r !== "set"){
                    interaction.editReply({
                        content: `取消建立新賭盤模板。`, 
                        components: [],
                        embeds: []
                    });
                }
            });
            
        } else if(option === 'betTemplateShow') {
            let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/betTemplate`);
            if(!filename[0]) {
                return interaction.reply(`目前並沒有已設定的模板。`)
            }
            filename.forEach((v, i) => filename[i] = v.slice(0, v.length - 5));

            let rowData = [];
            filename.forEach((opt) => {
                rowData.push({
                    label: "賭盤: " + opt,
                    value: opt,
                });
            });
            
            const row = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageSelectMenu()
                    .setCustomId('optionSelect')
                    .setPlaceholder('選擇要查看的模板')
                    .addOptions(rowData),
            );
            const msg = await interaction.reply({
                content: 
                    `🛠️請選擇要要查看的模板。`, 
                components: [row],
                fetchReply: true
            });

            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });

            let removeOption = "";

            collector.on('collect', async i => {
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
                
                removeOption = i.values[0];
                let template = fs.readFileSync(`./data/guildData/${interaction.guild.id}/betTemplate/${removeOption}.json`);
                template = JSON.parse(template);

                interaction.editReply({
                    content: `以下為選擇要查看的模板。`,
                    embeds: [templateEmbed(template, interaction)],
                    components: [],
                });
                collector.stop("set");
            });

            collector.on('end', (c, r) => {
                if(r !== "messageDelete" && r !== "user" && r !== "set"){
                    interaction.editReply({
                        content: `取消查看。`, 
                        components: [],
                        embeds: []
                    });
                }
            });
            
        } else if(option === 'betTemplateEdit') {
            interaction.reply('即將開放本功能，但目前尚無法使用。')
            /*
            //TODO
            let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/betTemplate`);
            if(!filename[0]) {
                return interaction.reply(`目前並沒有已設定的模板。`)
            }
            filename.forEach((v, i) => filename[i] = v.slice(0, v.length - 5));

            let rowData = [];
            filename.forEach((opt) => {
                rowData.push({
                    label: "賭盤: " + opt,
                    value: opt,
                });
            });
            
            const row = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageSelectMenu()
                    .setCustomId('optionSelect')
                    .setPlaceholder('選擇要修改的模板')
                    .addOptions(rowData),
            );
            const msg = await interaction.reply({
                content: 
                    `🛠️請選擇要要修改的模板。`, 
                components: [row],
                fetchReply: true
            });

            const overtimeLimit = 5 * 60;
            const collector = msg.createMessageComponentCollector({time: overtimeLimit * 1000 });

            let removeOption = "";
            let template;

            collector.on('collect', async i => {
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
                await i.deferUpdate();
                if(!removeOption) {
                    removeOption = i.values[0];
                    template = fs.readFileSync(`./data/guildData/${interaction.guild.id}/betTemplate/${removeOption}.json`);
                    template = JSON.parse(template);

                    collector.resetTimer({ time: overtimeLimit * 1000 });
                } else {
                    
                }
            });

            collector.on('end', (c, r) => {
                if(r !== "messageDelete" && r !== "user" && r !== "set"){
                    interaction.editReply({
                        content: `取消修改。`, 
                        components: [],
                        embeds: []
                    });
                }
            });
            //TODOEND
            */
            
        } else if(option === 'betTemplateDelete') {
            let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/betTemplate`);
            if(!filename[0]) {
                return interaction.reply(`目前並沒有已設定的模板。`)
            }
            filename.forEach((v, i) => filename[i] = v.slice(0, v.length - 5));

            let rowData = [];
            filename.forEach((opt) => {
                rowData.push({
                    label: "賭盤: " + opt,
                    value: opt,
                });
            });
            
            const row = new Discord.MessageActionRow()
            .addComponents(
                new Discord.MessageSelectMenu()
                    .setCustomId('optionSelect')
                    .setPlaceholder('選擇要刪除的模板')
                    .addOptions(rowData),
            );
            const msg = await interaction.reply({
                content: 
                    `🛠️請選擇要要刪除的模板。`, 
                components: [row],
                fetchReply: true
            });

            const overtimeLimit = 2 * 60;
            const collector = msg.createMessageComponentCollector({time: overtimeLimit * 1000 });

            let removeOption = "";
            let template;

            collector.on('collect', async i => {
                if(i.user.id !== interaction.user.id) return i.reply({content: "僅可由指令使用者觸發這些操作。", ephemeral: true});
                await i.deferUpdate();
                if(!removeOption) {
                    removeOption = i.values[0];
                    template = fs.readFileSync(`./data/guildData/${interaction.guild.id}/betTemplate/${removeOption}.json`);
                    template = JSON.parse(template);

                    const row = new Discord.MessageActionRow()
                        .addComponents(
                            [
                                new Discord.MessageButton()
                                    .setCustomId('checked')
                                    .setLabel('確認刪除模板')
                                    .setStyle('DANGER'),
                            ]
                        );

                    interaction.editReply({
                        content: `以下為選擇要刪除的模板。\n` +
                            `🛠️確認後請按下確認按鈕。`,
                        embeds: [templateEmbed(template, interaction)],
                        components: [row],
                    });
                    collector.resetTimer({ time: overtimeLimit * 1000 });
                } else {
                    collector.stop("set");
                    await interaction.editReply({
                        content: `已刪除以下的模板。\n`,
                        embeds: [templateEmbed(template, interaction)],
                        components: [],
                    });
                    try{
                        fs.unlinkSync(`./data/guildData/${interaction.guild.id}/betTemplate/${removeOption}.json`);
                    }catch (err) {
                        if(err) {
                            interaction.editReply({
                                content: `模板刪除失敗: 可能是因為已經有其他人員刪除此模板。\n`,
                                embeds: [],
                                components: [],
                            });
                        }
                    } 
                }
            });

            collector.on('end', (c, r) => {
                if(r !== "messageDelete" && r !== "user" && r !== "set"){
                    interaction.editReply({
                        content: `取消刪除。`, 
                        components: [],
                        embeds: []
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

/**
 * 
 * @param {guild.betTemplateObject} template 
 * @param {Discord.CommandInteraction} interaction 
 */
function templateEmbed(template, interaction) {
    const embed = new Discord.MessageEmbed()
            .setColor(process.env.EMBEDCOLOR)
            .setTitle(`模板: ${template.name} 預覽`)
            .setDescription(template.description)
            .setTimestamp()
            .setFooter(`${interaction.client.user.tag}`,interaction.client.user.displayAvatarURL({dynamic: true}));

        let p = "";
        if(template.priority) {
            if(template.priority[0]) {
                template.priority.forEach(row => {
                    row.forEach(column => {
                        p += column.toString() + " = ";
                    })
                    p = p.substring(0, p.length - 3) + " > ";
                })
                p = p.substring(0, p.length - 3);
                embed.addField("📌 開盤優先順序", p);
            }
        }

        template.option.forEach((ele, ind) => {
            embed.addField("📔 " + (ind + 1) + ". "  + ele.name, ele.description);
        })

    return embed;
}

/**
 * 
 * @param {number} length 
 */
function  buttomComponent(length) {
    const row = new Discord.MessageActionRow()
        .addComponents(
            [
                new Discord.MessageButton()
                    .setCustomId('add')
                    .setLabel('添加選項')
                    .setStyle('PRIMARY')
                    .setDisabled(length > 20),
                new Discord.MessageButton()
                    .setCustomId('remove')
                    .setLabel('移除選項')
                    .setStyle('DANGER')
                    .setDisabled(length < 1),
                new Discord.MessageButton()
                    .setCustomId('complete')
                    .setLabel('設定完成')
                    .setStyle('SUCCESS')
                    .setDisabled(length < 2),
            ]
        );
    return row;
}

function  CompleteButtomComponent() {
    const row = new Discord.MessageActionRow()
        .addComponents(
            [
                new Discord.MessageButton()
                    .setCustomId('checked')
                    .setLabel('確認新增模板')
                    .setStyle('SUCCESS'),
                new Discord.MessageButton()
                    .setCustomId('cancel')
                    .setLabel('取消確認，繼續設定')
                    .setStyle('PRIMARY'),
            ]
        );
    return row;
}