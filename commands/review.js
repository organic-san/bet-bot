const guild = require('../functions/guildInfo');
const Discord = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('review')
        .setDescription('查看過去的投注資訊'),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.guildInformation} guildInformation
     */
    async execute(interaction, guildInformation) {
        if (guildInformation.betInfo.count < 1)
            return interaction.reply({ content: "尚未產生投注紀錄。", components: [] });

        const msg = await interaction.deferReply({ fetchReply: true });
        /**
         * @type Map<number, guild.betRecordObject>
         */
        let resultMap = new Map();
        let fileDirs = fs.readdirSync(`./data/guildData/${guildInformation.id}/betRecord`);

        let page = parseInt(fileDirs[fileDirs.length - 1]);
        let recordLoad = fs.readFileSync(`./data/guildData/${guildInformation.id}/betRecord/${page}.json`);

        recordLoad = JSON.parse(recordLoad);
        let result = new guild.betRecordObject();
        result.toBetRecordObject(recordLoad);
        resultMap.set(page, result);

        interaction.editReply({
            embeds: [createResultEmbed(result, interaction)],
            components: [createRow(page, fileDirs.length)]
        });

        const filter = i => ['next', 'back'].includes(i.customId) && !i.user.bot;
        const collector = msg.createMessageComponentCollector({ filter, time: 60 * 1000 });

        collector.on('collect', async i => {

            if (i.customId === 'next') page++;
            if (i.customId === 'back') page--;
            await i.deferUpdate();
            if (!resultMap.has(page)) {
                let recordLoad = fs.readFileSync(`./data/guildData/${guildInformation.id}/betRecord/${page}.json`);
                recordLoad = JSON.parse(recordLoad);
                let result = new guild.betRecordObject();
                result.toBetRecordObject(recordLoad);
                resultMap.set(page, result);
                interaction.editReply({
                    embeds: [createResultEmbed(result, interaction)],
                    components: [createRow(page, fileDirs.length)]
                });
            } else {
                interaction.editReply({
                    embeds: [createResultEmbed(resultMap.get(page), interaction)],
                    components: [createRow(page, fileDirs.length)]
                });

            }
        });

        collector.on('end', (c, r) => {
            if (r !== "messageDelete" && r !== "user" && r !== "set") {
                interaction.editReply({
                    components: []
                });
            }
        });

    },
};

/**
 * 
 * @param {guild.betRecordObject} result 
 * @param {Discord.CommandInteraction} interaction 
 */
function createResultEmbed(result, interaction) {
    const embed = new Discord.EmbedBuilder()
        .setColor(process.env.EMBEDCOLOR)
        .setTitle(`第 ${result.id} 次投注: ${result.name}`)
        .setDescription(result.description)
        .addFields({ name: `投注資訊`, value: `選項數量: ${result.option.length}\n總累計賭金:  ${result.totalBet}` })
        .setTimestamp()
        .setFooter({
            text: `${interaction.guild.name}`,
            iconURL: `https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`
        });

    result.option.forEach(option => {
        let odds = oddsCalc(option.betCount, result.totalBet, result.betTaxRate);
        if (option.id === result.winner.id) {
            embed.addFields({
                name: "🏆 " + option.id + ". " + option.name + ' (獲勝選項)',
                value: option.description + `\n累計賭金: ${option.betCount} coin(s) \n` + `賠率: ${odds === 0 ? "無法計算賠率" : odds}`
            });
        } else {
            embed.addFields({
                name: "📔 " + option.id + ". " + option.name,
                value: option.description + `\n累計賭金: ${option.betCount} coin(s) \n` + `賠率: ${odds === 0 ? "無法計算賠率" : odds}`
            });
        }

    })
    return embed;
}

/**
 * 
 * @param {number} now 
 * @param {number} max 
 * @returns 
 */
function createRow(now, max) {
    let row = new Discord.ActionRowBuilder()
        .addComponents(
            [
                new Discord.ButtonBuilder()
                    .setCustomId('back')
                    .setLabel('上一頁')
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setDisabled(now <= 1),
                new Discord.ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('下一頁')
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setDisabled(now >= max)
            ]
        );
    return row;
}

function oddsCalc(betCoins, totalBetCoins, taxRate) {
    if (betCoins === 0) return 0;
    else return Math.max(1, Math.floor((totalBetCoins / betCoins) * (taxRate / 100) * 10) / 10);
}