const { SlashCommandBuilder } = require('@discordjs/builders');
const guild = require('../functions/guildInfo');
const Discord = require('discord.js');
const fs = require('fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('review')
        .setDescription('查看過去的賭盤資訊'),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.guildInformation} guildInformation
     */
	async execute(interaction, guildInformation) {
        if(guildInformation.betInfo.count < 1) 
            return interaction.reply({content: "尚未產生投注紀錄。", components:[]});

        const msg = await interaction.deferReply({fetchReply: true});
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
            const collector = msg.createMessageComponentCollector({filter, time: 60 * 1000 });

        collector.on('collect', async i => {
            
            if (i.customId === 'next') page++;
            if (i.customId === 'back') page--;
            await i.deferUpdate();
            if(!resultMap.has(page)) {
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
            if(r !== "messageDelete" && r !== "user" && r !== "set"){
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
    const embed = new Discord.MessageEmbed()
        .setColor(process.env.EMBEDCOLOR)
        .setTitle(`第 ${result.id} 次賭盤: ${result.name}`)
        .setDescription(result.description)
        .addField(`賭盤資訊`, `選項數量: ${result.option.length}\n總累計賭金:  ${result.totalBet}`)
        .setTimestamp()
        .setFooter(`${interaction.guild.name}`,`https://cdn.discordapp.com/icons/${interaction.guild.id}/${interaction.guild.icon}.jpg`);

    let p = "";
    if(result.priority[0]) {
        result.priority.forEach(row => {
            row.forEach(column => {
                p += column.toString() + " = ";
            })
            p = p.substring(0, p.length - 3) + " > ";
        })
        p = p.substring(0, p.length - 3);
        embed.addField("📌 開盤優先順序", p);
    }
    
    result.option.forEach(option => {
        if(option.id === result.winner.id) {
            embed.addField("🏆 " + option.id + ". " + option.name + ' (獲勝選項)', option.description + `\n累計賭金: ${option.betCount} coin(s) \n` +
                `賠率: ${option.betCount>0 ? Math.floor((result.totalBet / option.betCount) * 10) / 10 : "無法計算賠率"}`)
        } else {
            embed.addField("📔 " + option.id + ". " + option.name, option.description + `\n累計賭金: ${option.betCount} coin(s) \n` +
                `賠率: ${option.betCount>0 ? Math.floor((result.totalBet / option.betCount) * 10) / 10 : "無法計算賠率"}`)
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
    let row = new Discord.MessageActionRow()
        .addComponents(
            [
                new Discord.MessageButton()
                    .setCustomId('back')
                    .setLabel('上一頁')
                    .setStyle('PRIMARY')
                    .setDisabled(now <= 1),
                new Discord.MessageButton()
                    .setCustomId('next')
                    .setLabel('下一頁')
                    .setStyle('PRIMARY')
                    .setDisabled(now >= max)
            ]
        );
    return row;
}