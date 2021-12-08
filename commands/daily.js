const { SlashCommandBuilder } = require('@discordjs/builders');
const guild = require('../functions/guildInfo');
const Discord = require('discord.js');

const awardCooldownHour = 12;
const awardCooldown = awardCooldownHour * 60 * 60;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('daily')
        .setDescription('領取每日硬幣'),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation
     */
	async execute(interaction, guildInformation) {
        if(!guildInformation) throw "Error: interaction/daily | cannot find guildInformation";

        const user = guildInformation.getUser(interaction.user.id);
        if (Date.now() - user.lastAwardTime >= awardCooldown * 1000) {
            user.coins += 30;
            user.lastAwardTime = Date.now();
            await interaction.reply({ 
                content: `領取成功! \n` + 
                    `持有硬幣: ${user.coins - 30} + 30 => ${user.coins}!\n` +
                    `預計於 <t:${Math.floor((user.lastAwardTime + awardCooldown * 1000) / 1000)}:F> 時可再度領取每日獎勵。`, 
                ephemeral: true 
            });
        } else {
            console.log(user.lastAwardTime);
            console.log(Date.now() - user.lastAwardTime);
            console.log(guildInformation);
            await interaction.reply({ 
                content: `距離上次獲得獎勵還沒超過${awardCooldownHour}小時! \n` + 
                    `預計於 <t:${Math.floor((user.lastAwardTime + awardCooldown * 1000) / 1000)}:F> 時可再度領取每日獎勵。`, 
                ephemeral: true 
            });
        }
	},
};