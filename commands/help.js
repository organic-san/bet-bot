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
                "本機器人提供賭盤之設置\n" +
                "註: 本機器人所提供之coins僅供娛樂用途，並非供賭博之用。\n" +
                "請勿以coins兌換現實金錢或將本機器人作為現實賭博之工具。\n" +
                "任何從本機器人衍生之爭議與製作者無關，同時製作者並未從中收取利益。\n")
            .addField(`賭盤相關`,
                "\`/bet play\` - 選擇選項下注\n" +
                "\`/bet info\` - 顯示賭盤說明、賠率等資訊\n" +
                "\`/review\` - 回顧過往舉辦過的賭盤\n")
            .addField(`其他`, 
                "\`/daily\` - 每日獎勵，每日3:00(UTC+8)重置領取次數\n" + 
                "\`/user info\` - 查看該用戶的資訊\n" +
                "\`/user ranking\` - 顯示伺服器中的排名\n" +
                "\`/gacha\` - 日版賽馬娘遊戲當期轉蛋模擬器\n")
            .addField("設定相關(需要管理伺服器權限)", 
                "\`/bet create\` - 設定並開啟賭盤\n" + 
                "\`/bet close\` - 關閉賭盤\n" + 
                "\`/bet result\` - 設定賭盤結果，並發還coins給所有人\n" +
                "\`/setting\` - 賭盤功能設定與顯示等\n" +
                "\` ├\` - 顯示所有投注紀錄\n" +
                "\` ├\` - 顯示上次賭盤的下注結果\n" +
                "\` ├\` - 重置所有人的coin(s)\n" +
                "\` └\` - 設定、檢視、刪除獎勵箱(向全體發放獎勵)\n" +
                "\` └\` - 設定、檢視、編輯、刪除自訂模板\n" +
                "\`/user setting\` - 用戶\n" +
                "\` ├\` - 發放coin(s)\n" +
                "\` ├\` - 扣回coin(s)\n" +
                "\` └\` - 重置持有coin(s)與下注紀錄\n")
            .addField("取消方法", 
                "所有選項之取消，只需放著不動，即可取消該選擇。")
            .addField(`機器人製作者`,`organic_san_2#0500`)
            .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
        interaction.reply({embeds: [embed]});
    }
};