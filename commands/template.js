const guild = require('../functions/guildInfo');
const fs = require('fs');
const Discord = require('discord.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('template')
        .setDescription('投注的樣板設定(由管理員操控)')
        .addSubcommand(opt =>
            opt.setName('create')
                .setDescription('建立新的賭盤模板')
        ).addSubcommand(opt =>
            opt.setName('show')
                .setDescription('顯示已設定的賭盤模板')
        ).addSubcommand(opt =>
            opt.setName('edit')
                .setDescription('修改已設定的賭盤模板')
        ).addSubcommand(opt =>
            opt.setName('delete')
                .setDescription('刪除已設定的賭盤模板')
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
            await interaction.deferReply();
            const overtimeLimit = 5 * 60;
            const titleLengthLimit = 40;
            const descriptionLengthLimit = 1500;
            let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/betTemplate`);
            filename.forEach((v, i) => filename[i] = v.slice(0, v.length - 5));

            if (filename.length >= 20) return interaction.editReply(`設定失敗: 已達到模板上限，無法新增模板。\n請使用 /template delete 來刪除模板。`);

            const msg = await interaction.editReply(
                {
                    content: "建立賭盤模板: 建立作為賭盤舉行用的賭盤模板，以進行賭盤。\n" +
                        "建立賭盤模板時的幾項規則: \n" +
                        "1. 標題或選項不可與已設定的模板名稱或選項相同。\n" +
                        "2. 選項至多20項，至少2項。\n" +
                        `3. 名稱類上限為${titleLengthLimit}字。\n` +
                        `4. 說明類上限為${descriptionLengthLimit}字。\n` +
                        "5. 如果一定時間(" + overtimeLimit / 60 + "分鐘)沒有操作，將取消建立流程。\n" +
                        `⬇️請在這個頻道中輸入要設定的**模板名稱**(上限${titleLengthLimit}字)。`,
                    fetchReply: true,
                }
            );

            const filter = message => message.author.id === interaction.user.id;
            let collected = await interaction.channel.awaitMessages({ filter: filter, max: 1, time: overtimeLimit * 1000 });
            if (!msg.deletable) return;
            let name = collected.first().content;
            if (!name) return interaction.editReply(`設定失敗: 輸入逾時，已取消設定。`);
            if (name.length > titleLengthLimit) return interaction.editReply(`設定失敗: 超過字數限制，已取消設定。`);
            if (filename.includes(name)) return interaction.editReply(`設定失敗: 已有相同名稱之模版。修改模版可以使用/setting。`);
            interaction.editReply({
                content: "標題設定成功: 「" + name + "」。\n" +
                    `⬇️請在這個頻道中輸入要設定的**模板說明**(上限${descriptionLengthLimit}字)。`
            })

            collected = await interaction.channel.awaitMessages({ filter: filter, max: 1, time: overtimeLimit * 1000 });
            if (!msg.deletable) return;
            let description = collected.first().content;
            if (!description) return interaction.editReply(`設定失敗: 輸入逾時，已取消設定。`);
            if (description.length > descriptionLengthLimit) return interaction.editReply(`設定失敗: 超過字數限制，已取消設定。`);

            const template = new guild.betTemplateObject(name, description, [], []);

            interaction.editReply({
                content: "賭盤說明設定成功! 目前模板的設定如下。\n" +
                    `🛠️請選擇要執行的操作。`,
                embeds: [templateEmbed(template, interaction)],
                components: [buttomComponent(template.option.length)],
            })

            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });
            let mode = "";
            let removeOption = "";

            collector.on('collect', async i => {
                await i.deferUpdate();
                if (i.user.id !== interaction.user.id) return i.editReply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });

                if (!i.values) mode = i.customId;
                else removeOption = i.values[0];

                if (mode === "add") {
                    interaction.editReply({
                        content: "建立新選項: 為這個賭盤模板新增選項。\n" +
                            `⬇️請在這個頻道中輸入要新增的**選項名稱**(上限${titleLengthLimit}字)。`,
                        embeds: [],
                        components: [],
                    })
                    collector.resetTimer({ time: overtimeLimit * 1000 + 60 * 1000 });
                    let collected = await interaction.channel.awaitMessages({ filter: filter, max: 1, time: overtimeLimit * 1000 });
                    if (!msg.deletable) return collector.stop("set");
                    let name = collected.first().content;
                    let reason = "";
                    let description = "";

                    if (!name)
                        reason = `選項新增失敗: 名稱輸入逾時，取消新增選項。`;
                    if (name.length > titleLengthLimit)
                        reason = `選項新增失敗: 名稱超過字數限制，取消新增選項。`;
                    if (template.isNameUsed(name)) reason = `選項新增失敗: 此選項名稱已使用。`;

                    if (!reason) {
                        interaction.editReply({
                            content: "選項名稱設定成功: 「" + name + "」。\n" +
                                `⬇️請在這個頻道中輸入要設定的**選項說明**(上限${descriptionLengthLimit}字)。`,
                            components: [],
                        })
                        collector.resetTimer({ time: overtimeLimit * 1000 + 60 * 1000 });
                        collected = await interaction.channel.awaitMessages({ filter: filter, max: 1, time: overtimeLimit * 1000 });
                        if (!msg.deletable) return collector.stop("set");
                        description = collected.first().content;

                        if (!description)
                            reason = `選項新增失敗: 說明輸入逾時，取消新增選項。`;
                        if (description.length > descriptionLengthLimit)
                            reason = `選項新增失敗: 說明超過字數限制，取消新增選項。`;
                    }

                    if (reason) {
                        interaction.editReply({
                            content: `${reason}\n` +
                                `🛠️請選擇要執行的操作。`,
                            embeds: [templateEmbed(template, interaction)],
                            components: [buttomComponent(template.option.length)],
                        })
                    } else {
                        template.addOption({ name: name, description: description });
                        interaction.editReply({
                            content: `選項新增成功: 新增第 ${template.option.length} 個選項「${name}」。\n` +
                                `🛠️請選擇要執行的操作。`,
                            embeds: [templateEmbed(template, interaction)],
                            components: [buttomComponent(template.option.length)],
                        });
                    }
                    collector.resetTimer({ time: overtimeLimit * 1000 });

                } else if (mode === "remove") {
                    if (!removeOption) {
                        let rowData = [];
                        template.option.forEach((opt) => {
                            rowData.push({
                                label: "選項: " + opt.name,
                                value: opt.name,
                                description: opt.description.slice(0, 50)
                            });
                        });

                        const row = new Discord.ActionRowBuilder()
                            .addComponents(
                                new Discord.StringSelectMenuBuilder()
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


                } else if (mode === "complete") {
                    interaction.editReply({
                        content: `請確認目前的模板設定。\n` +
                            `🛠️確認後請按下確認按鈕。`,
                        embeds: [templateEmbed(template, interaction)],
                        components: [CompleteButtomComponent()],
                    });
                    //TODO: 賭盤優先順序(建立模板)

                } else if (mode === "checked") {
                    collector.stop("set");
                    let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/betTemplate`);
                    filename.forEach((v, i) => filename[i] = v.slice(0, v.length - 5));
                    if (filename.includes(template.name)) {
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

                } else if (mode === "cancel") {
                    interaction.editReply({
                        content: `已取消目前的動作。\n` +
                            `🛠️請選擇要執行的操作。`,
                        embeds: [templateEmbed(template, interaction)],
                        components: [buttomComponent(template.option.length)],
                    });
                    collector.resetTimer({ time: overtimeLimit * 1000 });

                } else {
                    throw "Error: interaction/template/create | 不存在的模式呼喚";
                }
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消建立新模板。`,
                        components: [],
                        embeds: []
                    });
                }
            });

        } else if (interaction.options.getSubcommand() === 'show') {
            let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/betTemplate`);
            if (!filename[0]) {
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

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.StringSelectMenuBuilder()
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

            const collector = msg.createMessageComponentCollector({ time: 120 * 1000 });

            let removeOption = "";

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });

                removeOption = i.values[0];
                let template = fs.readFileSync(`./data/guildData/${interaction.guild.id}/betTemplate/${removeOption}.json`);
                template = JSON.parse(template);

                interaction.editReply({
                    content: `以下為選擇的模板。`,
                    embeds: [templateEmbed(template, interaction)],
                    components: [],
                });
                collector.stop("set");
            });

            collector.on('end', (c, r) => {
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消查看。`,
                        components: [],
                        embeds: []
                    });
                }
            });

        } else if (interaction.options.getSubcommand() === 'edit') {

            let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/betTemplate`);
            if (!filename[0]) {
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

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.StringSelectMenuBuilder()
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

            const filter1 = (i) => { i.deferUpdate(); return i.user.id === interaction.user.id };
            let collected = await msg.awaitMessageComponent({ filter: filter1, time: 600 * 1000 });
            let tempName = collected.values[0];
            if (!tempName) return interaction.editReply(`設定失敗: 輸入逾時，已取消設定。`);

            let tempBuffer = fs.readFileSync(`./data/guildData/${interaction.guild.id}/betTemplate/${tempName}.json`);
            tempBuffer = JSON.parse(tempBuffer);

            let template = new guild.betTemplateObject(tempBuffer.name, tempBuffer.description, [], tempBuffer.priority);
            tempBuffer.option.forEach(val => {
                template.addOption({ name: val.name, description: val.description });
            });
            interaction.editReply({
                content: "已選擇要修改的模板。 該模板的設定如下。\n" +
                    `🛠️請選擇要執行的操作。`,
                embeds: [templateEmbed(template, interaction)],
                components: [buttomComponent(template.option.length)],
            })

            const overtimeLimit = 5 * 60;
            const titleLengthLimit = 40;
            const descriptionLengthLimit = 1500;
            let mode = "";
            let removeOption = "";
            const collector = msg.createMessageComponentCollector({ time: overtimeLimit * 1000 });
            const filter = message => message.author.id === interaction.user.id;

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                await i.deferUpdate();

                if (!i.values) mode = i.customId;
                else removeOption = i.values[0];

                if (mode === "add") {
                    interaction.editReply({
                        content: "建立新選項: 為這個賭盤模板新增選項。\n" +
                            `⬇️請在這個頻道中輸入要新增的**選項名稱**(上限${titleLengthLimit}字)。`,
                        embeds: [],
                        components: [],
                    })
                    collector.resetTimer({ time: overtimeLimit * 1000 + 60 * 1000 });
                    let collected = await interaction.channel.awaitMessages({ filter: filter, max: 1, time: overtimeLimit * 1000 });
                    if (!msg.deletable) return collector.stop("set");
                    let name = collected.first().content;
                    let reason = "";
                    let description = "";

                    if (!name)
                        reason = `選項新增失敗: 名稱輸入逾時，取消新增選項。`;
                    if (name.length > titleLengthLimit)
                        reason = `選項新增失敗: 名稱超過字數限制，取消新增選項。`;
                    if (template.isNameUsed(name)) reason = `選項新增失敗: 此選項名稱已使用。`;

                    if (!reason) {
                        interaction.editReply({
                            content: "選項名稱設定成功: 「" + name + "」。\n" +
                                `⬇️請在這個頻道中輸入要設定的**選項說明**(上限${descriptionLengthLimit}字)。`,
                            components: [],
                        })
                        collector.resetTimer({ time: overtimeLimit * 1000 + 60 * 1000 });
                        collected = await interaction.channel.awaitMessages({ filter: filter, max: 1, time: overtimeLimit * 1000 });
                        if (!msg.deletable) return collector.stop("set");
                        description = collected.first().content;

                        if (!description)
                            reason = `選項新增失敗: 說明輸入逾時，取消新增選項。`;
                        if (description.length > descriptionLengthLimit)
                            reason = `選項新增失敗: 說明超過字數限制，取消新增選項。`;
                    }

                    if (reason) {
                        interaction.editReply({
                            content: `${reason}\n` +
                                `🛠️請選擇要執行的操作。`,
                            embeds: [templateEmbed(template, interaction)],
                            components: [buttomComponent(template.option.length)],
                        })
                    } else {
                        template.addOption({ name: name, description: description });
                        interaction.editReply({
                            content: `選項新增成功: 新增第 ${template.option.length} 個選項「${name}」。\n` +
                                `🛠️請選擇要執行的操作。`,
                            embeds: [templateEmbed(template, interaction)],
                            components: [buttomComponent(template.option.length)],
                        });
                    }
                    collector.resetTimer({ time: overtimeLimit * 1000 });

                } else if (mode === "remove") {
                    if (!removeOption) {
                        let rowData = [];
                        template.option.forEach((opt) => {
                            rowData.push({
                                label: "選項: " + opt.name,
                                value: opt.name,
                                description: opt.description.slice(0, 50)
                            });
                        });

                        const row = new Discord.ActionRowBuilder()
                            .addComponents(
                                new Discord.StringSelectMenuBuilder()
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


                } else if (mode === "complete") {
                    interaction.editReply({
                        content: `請確認目前的模板設定。\n` +
                            `🛠️確認後請按下確認按鈕。`,
                        embeds: [templateEmbed(template, interaction)],
                        components: [CompleteButtomComponent()],
                    });

                } else if (mode === "checked") {
                    collector.stop("set");
                    template.option.forEach((value, index) => {
                        value.id = (index + 1).toString();
                    });
                    fs.writeFile(
                        `./data/guildData/${interaction.guild.id}/betTemplate/${template.name}.json`,
                        JSON.stringify(template, null, '\t'),
                        async function (err) { if (err) return console.log(err) }
                    );
                    interaction.editReply({
                        content: `設定完成: 已修改模板「${template.name}」。`,
                        embeds: [],
                        components: [],
                    });

                } else if (mode === "cancel") {
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
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
                    interaction.editReply({
                        content: `取消修改。`,
                        components: [],
                        embeds: []
                    });
                }
            });


        } else if (interaction.options.getSubcommand() === 'delete') {
            let filename = fs.readdirSync(`./data/guildData/${guildInformation.id}/betTemplate`);
            if (!filename[0]) {
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

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    new Discord.StringSelectMenuBuilder()
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
            const collector = msg.createMessageComponentCollector({ time: overtimeLimit * 1000 });

            let removeOption = "";
            let template;

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "僅可由指令使用者觸發這些操作。", ephemeral: true });
                await i.deferUpdate();
                if (!removeOption) {
                    removeOption = i.values[0];
                    template = fs.readFileSync(`./data/guildData/${interaction.guild.id}/betTemplate/${removeOption}.json`);
                    template = JSON.parse(template);

                    const row = new Discord.ActionRowBuilder()
                        .addComponents(
                            [
                                new Discord.ButtonBuilder()
                                    .setCustomId('checked')
                                    .setLabel('確認刪除模板')
                                    .setStyle(Discord.ButtonStyle.Danger)
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
                    try {
                        fs.unlinkSync(`./data/guildData/${interaction.guild.id}/betTemplate/${removeOption}.json`);
                    } catch (err) {
                        if (err) {
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
                if (r !== "messageDelete" && r !== "user" && r !== "set") {
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
 * @param {guild.betTemplateObject} template 
 * @param {Discord.CommandInteraction} interaction 
 */
function templateEmbed(template, interaction) {
    const embed = new Discord.EmbedBuilder()
        .setColor(process.env.EMBEDCOLOR)
        .setTitle(`模板: ${template.name} 預覽`)
        .setDescription(template.description)
        .setTimestamp()
        .setFooter({
            text: `${interaction.client.user.tag}`,
            iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
        });

    template.option.forEach((ele, ind) => {
        embed.addFields({ name: "📔 " + (ind + 1) + ". " + ele.name, value: ele.description });
    })

    return embed;
}

/**
 * 
 * @param {number} length 
 */
function buttomComponent(length) {
    const row = new Discord.ActionRowBuilder()
        .addComponents(
            [
                new Discord.ButtonBuilder()
                    .setCustomId('add')
                    .setLabel('添加選項')
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setDisabled(length > 20),
                new Discord.ButtonBuilder()
                    .setCustomId('remove')
                    .setLabel('移除選項')
                    .setStyle(Discord.ButtonStyle.Danger)
                    .setDisabled(length < 1),
                new Discord.ButtonBuilder()
                    .setCustomId('complete')
                    .setLabel('設定完成')
                    .setStyle(Discord.ButtonStyle.Success)
                    .setDisabled(length < 2),
            ]
        );
    return row;
}

function CompleteButtomComponent() {
    const row = new Discord.ActionRowBuilder()
        .addComponents(
            [
                new Discord.ButtonBuilder()
                    .setCustomId('checked')
                    .setLabel('確認新增模板')
                    .setStyle(Discord.ButtonStyle.Success),
                new Discord.ButtonBuilder()
                    .setCustomId('cancel')
                    .setLabel('取消確認，繼續設定')
                    .setStyle(Discord.ButtonStyle.Primary),
            ]
        );
    return row;
}