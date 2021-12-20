const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('幫助清單'),
	tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {

        const embed = new Discord.MessageEmbed()
            .setColor(process.env.EMBEDCOLOR)
            .setTitle(`${interaction.client.user.tag} 的使用說明`)
            .setDescription( 
                "本機器人提供賭盤之設置" +
                "註: 本機器人所提供之coins僅供娛樂用途，並非供賭博之用。\n" +
                "請勿以coins兌換現實金錢或將本機器人作為現實賭博之工具。\n" +
                "任何從本機器人衍生之爭議與製作者無關，同時製作者並未從中收取利益。")
            .addField(`賭盤相關`,
                "\`/bet play\` - 選擇選項下注\n")
            .addField(`其他`, 
                "\`/daily\` - 每日獎勵，每日3:00(UTC+8)重置領取次數\n" + 
                "\`/user info\` - 查看該用戶的資訊\n")
            .addField("設定相關(需要管理伺服器權限)", 
                "\`/bet set\` - 設定並開啟賭盤\n" + 
                "\`/bet close\` - 關閉賭盤\n" + 
                "\`/bet result\` - 設定賭盤結果，並發還coins給所有人\n" +
                "\`/bet setting\` - 歸零金額、顯示所有投注結果等設定\n" +
                "\`/user setting\` - 收回、發放或歸零金錢")
                .addField("取消方法", 
                "所有選項之取消，只需放著不動，即可取消該選擇。")
                .addField("使用聲明", 
                "本機器人所提供之coins僅供娛樂用途，並非供賭博之用。\n" + 
                "請勿以coins兌換現實金錢或將本機器人作為現實賭博之工具。\n" +
                "任何從本機器人衍生之爭議與製作者無關。")
            .addField(`機器人製作者`,`organic_san_2#0500`)
            .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
        interaction.reply({embeds: [embed]});
    }
};