const guild = require('../functions/guildInfo.js');
const Discord = require('discord.js');
const fs = require('fs');

const awardResetClock = 3 - 8;
const awardReset = awardResetClock * 60 * 60 * 1000;
const dayMiliSecond = 86400 * 1000;

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('daily')
        .setDescription('領取每日獎勵'),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.guildInformation} guildInformation
     */
    async execute(interaction, guildInformation) {
        if (!guildInformation) throw "Error: interaction/daily | cannot find guildInformation";

        const user = guildInformation.getUser(interaction.user.id);

        let content = "";

        if (Math.floor((Date.now() - awardReset) / dayMiliSecond) !== Math.floor((user.lastAwardTime - awardReset) / dayMiliSecond)) {
            user.coins += 30;
            user.lastAwardTime = Date.now();
            content += `領取成功!\n持有硬幣: ${user.coins - 30} + 30 => ${user.coins}!\n每日3:00(UTC+8)過後能再度領取每日獎勵。`

        } else {
            content += `今天已經領取過每日獎勵了!\n每日3:00(UTC+8)過後能再度領取每日獎勵。`;
        }

        const fileDirs = fs.readdirSync(`./data/guildData/${guildInformation.id}/awardBox`);
        fileDirs.forEach(fileName => {
            try {
                let awardBox = new guild.betAwardBox('0', 0, 0);
                awardBox.toAwardBoxObject(JSON.parse(fs.readFileSync(`./data/guildData/${guildInformation.id}/awardBox/${fileName}`)));
                if (!awardBox.awardIdList.includes(interaction.user.id)) {
                    awardBox.awardIdList.push(interaction.user.id);
                    user.coins += awardBox.coinMuch;
                    content += `\n-------\n📬領取額外獎勵成功!\n獲得 ${awardBox.coinMuch} coin(s)\n` +
                        `持有硬幣: ${user.coins - awardBox.coinMuch} + ${awardBox.coinMuch} => ${user.coins}!`;
                    fs.writeFile(`./data/guildData/${guildInformation.id}/awardBox/${fileName}`,
                        JSON.stringify(awardBox, null, '\t'),
                        err => { if (err) return console.log(err); }
                    );
                }

            } catch (err) {
                console.error(err);
            }
        });

        await interaction.reply({
            content: content.slice(0, 1900),
            ephemeral: true
        });
    },
};