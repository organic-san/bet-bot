const Discord = require('discord.js');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('help')
        .setDescription('幫助清單'),
    tag: "interaction",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
    async execute(interaction) {

        const embed = new Discord.EmbedBuilder()
            .setColor(process.env.EMBEDCOLOR)
            .setTitle(`${interaction.client.user.tag} 的使用說明`)
            .setDescription(
                "本機器人提供投注之設置\n" +
                "註: 本機器人所提供之coins僅供娛樂用途，並非供賭博之用。\n" +
                "請勿以coins兌換現實金錢或將本機器人作為現實賭博之工具。\n" +
                "任何從本機器人衍生之爭議與製作者無關，同時製作者並未從中收取利益。\n")
            .addFields(
                {
                    name: "投注相關",
                    value: "\`/bet play\` - 選擇選項下注\n" +
                        "\`/bet info\` - 顯示投注說明、賠率等資訊\n" +
                        "\`/review\` - 回顧過往舉辦過的投注\n"
                },
                {
                    name: "其他",
                    value: "\`/daily\` - 每日獎勵，每日3:00(UTC+8)重置領取次數\n" +
                        "\`/user info\` - 查看該用戶的資訊\n" +
                        "\`/user ranking\` - 顯示伺服器中的排名\n" +
                        "\`/gacha\` - 日版賽馬娘遊戲當期轉蛋模擬器\n"
                },
                {
                    name: "設定相關(需要管理伺服器權限)",
                    value: 
                        "\`/bet\` - 投注活動相關流程\n" +
                        "\` ├ create\` - 開啟一場新的投注\n" +
                        "\` ├ close\` - 停止投注，進入封盤\n" +
                        "\` ├ auto-close\` - 設定自動封盤時間\n" +
                        "\` └ result\` - 開盤，並發還coins給所有人\n" +
                        "\`/template\` - 樣板設定\n" +
                        "\` ├ create\` - 建立新的樣板\n" +
                        "\` ├ show\` - 顯示目前的樣板一覽\n" +
                        "\` ├ edit\` - 編輯既有的樣板\n" +
                        "\` └ delete\` - 刪除樣板\n" +
                        "\`/awardbox\` - 獎勵箱設定(向全體發放獎勵)\n" +
                        "\` ├ create\` - 建立新的獎勵箱\n" +
                        "\` ├ show\` - 顯示目前的獎勵箱一覽\n" +
                        "\` └ delete\` - 停止發放獎勵\n" +
                        "\`/setting\` - 投注功能設定與顯示等\n" +
                        "\` ├ show-record\` - 顯示所有投注紀錄\n" +
                        "\` ├ show-result\` - 顯示上次投注的下注結果\n" +
                        "\` ├ reset-coins\` - 重置所有人的coin(s)\n" +
                        "\` └ adjust-tax-rate\` - 調整發還金額比例\n" +
                        "\`/user setting\` - 用戶\n" +
                        "\` ├\` - 發放coin(s)\n" +
                        "\` ├\` - 扣回coin(s)\n" +
                        "\` └\` - 重置持有coin(s)與下注紀錄\n"
                },
                {
                    name: "取消方法",
                    value: "所有選項之取消，只需放著不動，即可取消該選擇。"
                },
                {
                    name: "機器人製作者",
                    value: "discord: @organic_san"
                }
            )
            .setFooter({
                text: `${interaction.client.user.tag} | ${interaction.client.user.id}`,
                iconURL: interaction.client.user.displayAvatarURL({ extension: "png" })
            })
        interaction.reply({ embeds: [embed] });
    }
};