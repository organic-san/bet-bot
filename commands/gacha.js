const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const fs = require('fs');
const Canvas = require('canvas');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('gacha')
		.setDescription('日版/繁體中文版賽馬娘遊戲當期轉蛋模擬器')
        .addStringOption(opt => 
            opt.setName('version')
            .setDescription('轉蛋的版本，根據版本會有不同的轉蛋範圍與pickup角色/支援卡。')
            .addChoice('日文版pick-up轉蛋', "JP")
            .addChoice('繁體中文版特選轉蛋', "TC")
            .setRequired(true)
        ).addStringOption(opt => 
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
        const much = interaction.options.getInteger('much');
        const type = interaction.options.getString('type');
        const version = interaction.options.getString('version');
        let gDt;
        if(version === "JP") gDt = gachaData.jp;
        else if(version === "TC") gDt = gachaData.tc;
        else if(version === "JP2") gDt = gachaData.jp2;
        if(much > 200) return interaction.reply("請不要輸入大於一井(200抽)的數量。").catch(() => {});
        if(much < 1) return interaction.reply("請不要輸入小於1抽的數量。").catch(() => {});
        let result = `${type === "umamusume" ? "賽馬娘池" : "支援卡池"} 抽取 ${much} 抽 結果如下:\n`;
        let count = 0;
        if(type === "umamusume") {
            if(much > 10) result += "(抽取數大於10抽將只顯示☆3以上的結果)\n"
            for(let i = 0; i < much; i++) {
                if(Math.random() < (i % 10 !== 9 ? gDt.star3Percent : gDt.roll10Star3Percent)) {
                    if(Math.random() < gDt.pickUpStar3Percent) {
                        result += `${i + 1}: ☆3 ${gDt.pickUpStar3[Math.floor(Math.random() * gDt.pickUpStar3.length)]} (pickup)\n`;
                    } else {
                        result += `${i + 1}: ☆3 ${gDt.noPickUpStar3[Math.floor(Math.random() * gDt.noPickUpStar3.length)]}\n`;
                    }
                    count ++;
                } else if((Math.random() < (i % 10 !== 9 ? (gDt.star3Percent + gDt.star2Percent) : (gDt.roll10Star3Percent + gDt.roll10Star2Percent))
                        && much <= 10)) {
                    if(Math.random() < gDt.pickUpStar2Percent) {
                        result += `${i + 1}: ☆2 ${gDt.pickUpStar2[Math.floor(Math.random() * gDt.pickUpStar2.length)]} (pickup)\n`;
                    } else {
                        result += `${i + 1}: ☆2 ${gDt.noPickUpStar2[Math.floor(Math.random() * gDt.noPickUpStar2.length)]}\n`;
                    }
                } else if(much <= 10){
                    result += `${i + 1}: ☆1 ${gDt.noPickUpStar1[Math.floor(Math.random() * gDt.noPickUpStar1.length)]}\n`;
                }
            }
            result += "\n總☆3數: " + count + " 個。";
            if(count > 30) result = 
                `賽馬娘池 抽取 ${much} 抽 結果如下:\n(抽取數大於10抽將只顯示☆3以上的結果)\n\n抽到太多☆3了! 無法顯示結果!\n\n總☆3數: ${count} 個。`
            interaction.reply(result).catch(() => {});

        } else if(type === "support") {
            let dirRute = (version === "JP" ? "" : "TC");
            await interaction.deferReply();
            let result = [];

            for(let i = 0; i < much; i++) {
                const rnd = Math.random();
                if(rnd < (i % 10 !== 9 ? gDt.SSRPercent : gDt.roll10SSRPercent)) {
                    if(Math.random() < (gDt.PUSSR.length * gDt.pickUpSSRNormalPercent)) {
                        result.push({link: gDt.PUSSR[Math.floor(Math.random() * gDt.PUSSR.length)], type: "PUSSR"});
                    } else {
                        result.push({link: gDt.SSR[Math.floor(Math.random() * gDt.SSR.length)], type: "SSR"});
                    }
                    count ++;
                } else if((rnd < (i % 10 !== 9 ? (gDt.SSRPercent + gDt.SRPercent) : (gDt.roll10SSRPercent + gDt.roll10SRPercent)))
                        && much <= 10) {
                    if(Math.random() < gDt.PUSR.length * gDt.pickUpSRNormalPercent) {
                        result.push({link: gDt.PUSR[Math.floor(Math.random() * gDt.PUSR.length)], type: "PUSR"});
                    } else {
                        result.push({link: gDt.SR[Math.floor(Math.random() * gDt.SR.length)], type: "SR"});
                    }
                } else if(much <= 10){
                    if(Math.random() < gDt.PUR.length * gDt.pickUpRNormalPercent) {
                        result.push({link: gDt.PUR[Math.floor(Math.random() * gDt.PUR.length)], type: "PUR"});
                    } else {
                        result.push({link: gDt.R[Math.floor(Math.random() * gDt.R.length)], type: "R"});
                    }
                }
            }

            const pivWide = 150;
            const picHight = 200;
            const canvasHight = Math.ceil(result.length / 5) * picHight + 46;
            const canvas = Canvas.createCanvas(pivWide * 5, canvasHight);
            const context = canvas.getContext('2d');

            const img = await Canvas.loadImage(`./pic/write.png`);
            context.drawImage(img, 0, 0, pivWide * 5, canvasHight);

            for(let i = 0; i < result.length; i++){
                const img = await Canvas.loadImage(fs.readFileSync(`./pic/${dirRute}${result[i].type}/${result[i].link}`));
                if(img) context.drawImage(img, pivWide * (i % 5), picHight * Math.floor(i / 5), pivWide, picHight);
            }

            context.font = "18px Sans";
            context.fillText(`${version === "JP" ? "日文版pick-up轉蛋" : "繁體中文版特選轉蛋"} 支援卡池 抽取 ${much} 抽 ` + 
                `${count > 10 ? "(抽取數大於10抽將只顯示SSR以上的結果)" : ""}\n總SSR數: ${count} 個`, 5, canvasHight -29);
            const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'profile-image.png');

            interaction.editReply({
                files: [attachment]
            })

            /*
            //舊的轉蛋生成
            if(much > 10) result += "(抽取數大於10抽將只顯示SSR以上的結果)\n"
            for(let i = 0; i < much; i++) {
                if(Math.random() < (i % 10 !== 9 ? gDt.SSRPercent : gDt.roll10SSRPercent)) {
                    if(Math.random() < gDt.pickUpSSRPercent) {
                        result += `${i + 1}: SSR ${gDt.pickUpSSR[Math.floor(Math.random() * gDt.pickUpSSR.length)]} (pickup)\n`;
                    } else {
                        result += `${i + 1}: SSR ${gDt.noPickUpSSR[Math.floor(Math.random() * gDt.noPickUpSSR.length)]}\n`;
                    }
                    count ++;
                } else if((Math.random() < (i % 10 !== 9 ? (gDt.SSRPercent + gDt.SRPercent) : (gDt.roll10SSRPercent + gDt.roll10SRPercent)))
                        && much <= 10) {
                    if(Math.random() < gDt.pickUpSRPercent) {
                        result += `${i + 1}: SR   ${gDt.pickUpSR[Math.floor(Math.random() * gDt.pickUpSR.length)]} (pickup)\n`;
                    } else {
                        result += `${i + 1}: SR   ${gDt.noPickUpSR[Math.floor(Math.random() * gDt.noPickUpSR.length)]}\n`;
                    }
                } else if(much <= 10){
                    if(Math.random() < gDt.pickUpRPercent) {
                        result += `${i + 1}: R     ${gDt.pickUpR[Math.floor(Math.random() * gDt.pickUpR.length)]} (pickup)\n`;
                    } else {
                        result += `${i + 1}: R     ${gDt.noPickUpR[Math.floor(Math.random() * gDt.noPickUpR.length)]}\n`;
                    }
                }
            }
            result += "\n總SSR數: " + count + " 個。";
            if(count > 30) result = 
                `支援卡池 抽取 ${much} 抽 結果如下:\n(抽取數大於10抽將只顯示SSR以上的結果)\n\n抽到太多SSR了! 無法顯示結果!\n\n總SSR數: ${count} 個。`
            interaction.reply(result).catch(() => {});
            */
        }
        
	},
};