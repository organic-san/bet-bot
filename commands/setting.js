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
            .setRequired(true)
        ),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.guildInformation} guildInformation
     */
	async execute(interaction, guildInformation) {
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
                content: "即將顯示所有下注紀錄，內容可能會造成洗版。確認顯示?請點選下方按鈕確認。", 
                components: [row],
                fetchReply: true
            });
            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });

            collector.on('collect', async i => {
                i.update({
                    content: `即將顯示所有下注紀錄。`, 
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
                return interaction.reply({content: "上次賭盤沒有投注紀錄。", components:[]});

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
                content: "即將顯示所有下注紀錄，內容可能會造成洗版。確認顯示?請點選下方按鈕確認。", 
                components: [row],
                fetchReply: true
            });
            const collector = msg.createMessageComponentCollector({time: 120 * 1000 });

            collector.on('collect', async i => {
                let fileDirs = fs.readdirSync(`./data/guildData/${guildInformation.id}/betRecord`);
                fileDirs = fileDirs[fileDirs.length - 1];
                try {
                    let parseJsonlist = fs.readFileSync(`./data/guildData/${guildInformation.id}/betRecord/${fileDirs}`);
                    parseJsonlist = JSON.parse(parseJsonlist);

                    const result = new guild.betRecordObject();
                    result.toBetRecordObject(parseJsonlist);
                    const mag = (Math.floor((result.totalBet / result.winner.betCount) * 10) / 10);

                    i.update({
                        content: `即將顯示上一次的所有下注紀錄。\n` +
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