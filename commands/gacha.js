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
            .setDescription('要抽的次數，每10次轉蛋將會有一次SR/二星必中，抽取數大於10抽將只顯示SSR/三星結果')
            .setRequired(true)
        ),
	tag: "gacha",
    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction, gachaData) {
        await interaction.deferReply().catch(() => {});
        const much = interaction.options.getInteger('much');
        const type = interaction.options.getString('type');
        if(much > 200) return interaction.editReply("請不要輸入大於一井(200抽)的數量。").catch(() => {});
        if(much < 1) return interaction.editReply("請不要輸入小於1抽的數量。").catch(() => {});
        let result = `${type === "umamusume" ? "賽馬娘池" : "支援卡池"} 抽取 ${much} 抽 結果如下:\n`;
        let count = 0;
        if(type === "umamusume") {
            if(much > 10) result += "(抽取數大於10抽將只顯示☆3以上的結果)\n"
            for(let i = 0; i < much; i++) {
                if(Math.random() < (i % 10 !== 9 ? gachaData.star3Percent : gachaData.roll10Star3Percent)) {
                    if(Math.random() < gachaData.pickUpStar3Percent) {
                        result += `${i + 1}: ☆3 ${gachaData.pickUpStar3[Math.floor(Math.random() * gachaData.pickUpStar3.length)]} (pickup)\n`;
                    } else {
                        result += `${i + 1}: ☆3 ${gachaData.noPickUpStar3[Math.floor(Math.random() * gachaData.noPickUpStar3.length)]}\n`;
                    }
                    count ++;
                } else if((Math.random() < (i % 10 !== 9 ? (gachaData.star3Percent + gachaData.star2Percent) : (gachaData.roll10Star3Percent + gachaData.roll10Star2Percent))
                        && much <= 10)) {
                    if(Math.random() < gachaData.pickUpStar2Percent) {
                        result += `${i + 1}: ☆2 ${gachaData.pickUpStar2[Math.floor(Math.random() * gachaData.pickUpStar2.length)]} (pickup)\n`;
                    } else {
                        result += `${i + 1}: ☆2 ${gachaData.noPickUpStar2[Math.floor(Math.random() * gachaData.noPickUpStar2.length)]}\n`;
                    }
                } else if(much <= 10){
                    result += `${i + 1}: ☆1 ${gachaData.noPickUpStar1[Math.floor(Math.random() * gachaData.noPickUpStar1.length)]}\n`;
                }
            }
            result += "\n總☆3數: " + count + " 個。";
            if(count > 30) result = 
                `賽馬娘池 抽取 ${much} 抽 結果如下:\n(抽取數大於10抽將只顯示☆3以上的結果)\n\n抽到太多☆3了! 無法顯示結果!\n\n總☆3數: ${count} 個。`
            interaction.editReply(result);
        } else if(type === "support") {
            if(much > 10) result += "(抽取數大於10抽將只顯示SSR以上的結果)\n"
            for(let i = 0; i < much; i++) {
                if(Math.random() < (i % 10 !== 9 ? gachaData.SSRPercent : gachaData.roll10SSRPercent)) {
                    if(Math.random() < gachaData.pickUpSSRPercent) {
                        result += `${i + 1}: SSR ${gachaData.pickUpSSR[Math.floor(Math.random() * gachaData.pickUpSSR.length)]} (pickup)\n`;
                    } else {
                        result += `${i + 1}: SSR ${gachaData.noPickUpSSR[Math.floor(Math.random() * gachaData.noPickUpSSR.length)]}\n`;
                    }
                    count ++;
                } else if((Math.random() < (i % 10 !== 9 ? (gachaData.SSRPercent + gachaData.SRPercent) : (gachaData.roll10SSRPercent + gachaData.roll10SRPercent)))
                        && much <= 10) {
                    if(Math.random() < gachaData.pickUpSRPercent) {
                        result += `${i + 1}: SR   ${gachaData.pickUpSR[Math.floor(Math.random() * gachaData.pickUpSR.length)]} (pickup)\n`;
                    } else {
                        result += `${i + 1}: SR   ${gachaData.noPickUpSR[Math.floor(Math.random() * gachaData.noPickUpSR.length)]}\n`;
                    }
                } else if(much <= 10){
                    if(Math.random() < gachaData.pickUpRPercent) {
                        result += `${i + 1}: R     ${gachaData.pickUpR[Math.floor(Math.random() * gachaData.pickUpR.length)]} (pickup)\n`;
                    } else {
                        result += `${i + 1}: R     ${gachaData.noPickUpR[Math.floor(Math.random() * gachaData.noPickUpR.length)]}\n`;
                    }
                }
            }
            result += "\n總SSR數: " + count + " 個。";
            if(count > 30) result = 
                `支援卡池 抽取 ${much} 抽 結果如下:\n(抽取數大於10抽將只顯示SSR以上的結果)\n\n抽到太多SSR了! 無法顯示結果!\n\n總SSR數: ${count} 個。`
            interaction.editReply(result);
        }
        
	},
};