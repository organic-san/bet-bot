const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('gacha')
		.setDescription('日版賽馬娘遊戲當期轉蛋模擬器')
        .addStringOption(opt => 
            opt.setName('type')
            .setDescription('轉蛋的內容')
            .addChoice('賽馬娘轉蛋', "umamusume")
            .addChoice('支援卡轉蛋', "support")
            .setRequired(true)
        ).addIntegerOption(opt => 
            opt.setName('much')
            .setDescription('要抽的次數，每10次轉蛋將會有一次SR/二星必中')
            .setRequired(true)
        ),
	tag: "gacha",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction, gachaData) {
        await interaction.deferReply();
        const much = interaction.options.getInteger('much');
        const type = interaction.options.getString('type');
        if(much > 200) return interaction.editReply("請不要輸入大於一井(200抽)的數量。")
        if(much < 1) return interaction.editReply("請不要輸入小於1抽的數量。")
        let result = ``;
        interaction.editReply(`${type === "umamusume" ? "賽馬娘池" : "支援卡池"} 抽取 ${much} 抽 結果如下:\n`);
        if(type === "umamusume") {
            for(let i = 0; i < much; i++) {
                if(Math.random() < (i % 10 !== 9 ? gachaData.star3Percent : gachaData.roll10Star3Percent)) {
                    if(Math.random() < gachaData.pickUpStar3Percent) {
                        result += `☆3 ${gachaData.pickUpStar3[Math.floor(Math.random() * gachaData.pickUpStar3.length)]} (pickup)\n`;
                    } else {
                        result += `☆3 ${gachaData.noPickUpStar3[Math.floor(Math.random() * gachaData.noPickUpStar3.length)]}\n`;
                    }
                } else if(Math.random() < (i % 10 !== 9 ? (gachaData.star3Percent + gachaData.star2Percent) : (gachaData.roll10Star3Percent + gachaData.roll10Star2Percent))) {
                    if(Math.random() < gachaData.pickUpStar2Percent) {
                        result += `☆2 ${gachaData.pickUpStar2[Math.floor(Math.random() * gachaData.pickUpStar2.length)]} (pickup)\n`;
                    } else {
                        result += `☆2 ${gachaData.noPickUpStar2[Math.floor(Math.random() * gachaData.noPickUpStar2.length)]}\n`;
                    }
                } else {
                    result += `☆1 ${gachaData.noPickUpStar1[Math.floor(Math.random() * gachaData.noPickUpStar1.length)]}\n`;
                }
                if(i % 50 === 49) {
                    interaction.channel.send(result + '_ _');
                    result = "";
                }
                if((i % 10 === 9) && (i % 50 !== 49)) result += '\n';
            }
            if(result) interaction.channel.send(result);
        } else if(type === "support") {
            for(let i = 0; i < much; i++) {
                if(Math.random() < (i % 10 !== 9 ? gachaData.SSRPercent : gachaData.roll10SSRPercent)) {
                    if(Math.random() < gachaData.pickUpSSRPercent) {
                        result += `SSR ${gachaData.pickUpSSR[Math.floor(Math.random() * gachaData.pickUpSSR.length)]} (pickup)\n`;
                    } else {
                        result += `SSR ${gachaData.noPickUpSSR[Math.floor(Math.random() * gachaData.noPickUpSSR.length)]}\n`;
                    }
                } else if(Math.random() < (i % 10 !== 9 ? (gachaData.SSRPercent + gachaData.SRPercent) : (gachaData.roll10SSRPercent + gachaData.roll10SRPercent))) {
                    if(Math.random() < gachaData.pickUpSRPercent) {
                        result += `SR   ${gachaData.pickUpSR[Math.floor(Math.random() * gachaData.pickUpSR.length)]} (pickup)\n`;
                    } else {
                        result += `SR   ${gachaData.noPickUpSR[Math.floor(Math.random() * gachaData.noPickUpSR.length)]}\n`;
                    }
                } else {
                    if(Math.random() < gachaData.pickUpRPercent) {
                        result += `R     ${gachaData.pickUpR[Math.floor(Math.random() * gachaData.pickUpR.length)]} (pickup)\n`;
                    } else {
                        result += `R     ${gachaData.noPickUpR[Math.floor(Math.random() * gachaData.noPickUpR.length)]}\n`;
                    }
                }
                if(i % 50 === 49) {
                    interaction.channel.send(result + '_ _');
                    result = "";
                }
                if((i % 10 === 9) && (i % 50 !== 49)) result += '\n';
            }
            if(result) interaction.channel.send(result);
        }
        
	},
};