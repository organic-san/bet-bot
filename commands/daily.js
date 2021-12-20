const { SlashCommandBuilder } = require('@discordjs/builders');
const guild = require('../functions/guildInfo');
const Discord = require('discord.js');

const awardResetClock = 3 - 8;
const awardReset = awardResetClock * 60 * 60 * 1000;
const dayMiliSecond = 86400 * 1000;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('daily')
        .setDescription('領取每日獎勵'),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation
     */
	async execute(interaction, guildInformation) {
        if(!guildInformation) throw "Error: interaction/daily | cannot find guildInformation";

        const user = guildInformation.getUser(interaction.user.id);
        if (Math.floor((Date.now() - awardReset) / dayMiliSecond) !== Math.floor((user.lastAwardTime - awardReset) / dayMiliSecond)) {
            user.coins += 30;
            user.lastAwardTime = Date.now();
            await interaction.reply({
                content: `領取成功! \n` + 
                    `持有硬幣: ${user.coins - 30} + 30 => ${user.coins}!\n` +
                    `每日3:00(UTC+8)過後能再度領取獎勵。`, 
                ephemeral: true 
            });
        } else {
            await interaction.reply({ 
                content: `今天已經領取過獎勵了!\n` + 
                    `每日3:00(UTC+8)過後能再度領取獎勵。`, 
                ephemeral: true 
            });
        }
	},
};