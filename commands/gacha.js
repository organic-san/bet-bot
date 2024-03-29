const Discord = require('discord.js');
const fs = require('fs');
const Canvas = require('canvas');
Canvas.registerFont('font/TaipeiSansTCBeta-Regular.ttf', { family: 'a', });

const gachaName = {
    JP: "日文版pick-up轉蛋",
    JP2: "日文版2.5周年紀念轉蛋",
    TC: "繁體中文版特選轉蛋"
}

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('gacha')
        .setDescription('日版/繁體中文版賽馬娘遊戲當期轉蛋模擬器')
        .addStringOption(opt =>
            opt.setName('version')
                .setDescription('轉蛋的版本，根據版本會有不同的轉蛋範圍與pickup角色/支援卡。')
                .addChoices(
                    { name: gachaName.JP, value: "JP" },
                    { name: gachaName.TC, value: "TC" },
                    // {name: gachaName.JP2, value: "JP2"}
                )
                .setRequired(true)
        ).addStringOption(opt =>
            opt.setName('type')
                .setDescription('轉蛋的內容')
                .addChoices(
                    { name: '賽馬娘轉蛋', value: "umamusume" },
                    { name: '支援卡轉蛋', value: "support" }
                )
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
        await interaction.deferReply().catch(() => { });
        const much = interaction.options.getInteger('much');
        const type = interaction.options.getString('type');
        const version = interaction.options.getString('version');
        let gDt;

        if (version === "JP") gDt = gachaData.jp;
        else if (version === "TC") gDt = gachaData.tc;
        //else if(version === "JP2") gDt = gachaData.jp2;
        else return interaction.editReply({ content: "抱歉，目前資料庫中不存在這個遊戲版本。" });

        if (much > 200) return interaction.editReply("請不要輸入大於一井(200抽)的數量。").catch(() => { });
        if (much < 1) return interaction.editReply("請不要輸入小於1抽的數量。").catch(() => { });
        let count = 0;
        let dirRute = (version + "/");
        let result = [];

        if (type === "umamusume") {
            for (let i = 0; i < much; i++) {
                const rnd = Math.random();
                if (rnd < (i % 10 !== 9 ? gDt.star3Percent : gDt.roll10Star3Percent)) {
                    if (Math.random() < (gDt.PUstar3.length * gDt.pickUpStar3NormalPercent)) {
                        result.push({ link: gDt.PUstar3[Math.floor(Math.random() * gDt.PUstar3.length)], type: "PUstar3", time: i, pickup: true });
                    } else {
                        result.push({ link: gDt.star3[Math.floor(Math.random() * gDt.star3.length)], type: "star3", time: i, pickup: false });
                    }
                    count++;
                } else if ((rnd < (i % 10 !== 9 ? (gDt.star3Percent + gDt.star2Percent) : (gDt.roll10Star3Percent + gDt.roll10Star2Percent)))
                    && much <= 10) {
                    if (Math.random() < gDt.PUstar2.length * gDt.pickUpStar2NormalPercent) {
                        result.push({ link: gDt.PUstar2[Math.floor(Math.random() * gDt.PUstar2.length)], type: "PUstar2", time: i, pickup: true });
                    } else {
                        result.push({ link: gDt.star2[Math.floor(Math.random() * gDt.star2.length)], type: "star2", time: i, pickup: false });
                    }
                } else if (much <= 10) {
                    if (Math.random() < gDt.PUstar1.length * gDt.pickUpStar1NormalPercent) {
                        result.push({ link: gDt.PUstar1[Math.floor(Math.random() * gDt.PUstar1.length)], type: "PUstar1", time: i, pickup: true });
                    } else {
                        result.push({ link: gDt.star1[Math.floor(Math.random() * gDt.star1.length)], type: "star1", time: i, pickup: false });
                    }
                }
            }

            const [pivWide, picHight] = version === "TC" ? [150, 164] : [150, 150];
            const canvasHight = Math.ceil(result.length / 5) * picHight + 50;
            const canvas = Canvas.createCanvas(pivWide * 5, canvasHight);
            const context = canvas.getContext('2d');
            context.font = "18px a";

            const img = await Canvas.loadImage(`./pic/write.png`);
            context.drawImage(img, 0, 0, pivWide * 5, canvasHight);
            const star3 = await Canvas.loadImage(`./pic/star3.png`);
            const star2 = await Canvas.loadImage(`./pic/star2.png`);
            const star1 = await Canvas.loadImage(`./pic/star1.png`);

            for (let i = 0; i < result.length; i++) {
                const img = await Canvas.loadImage(fs.readFileSync(`./pic/${dirRute}${result[i].type}/${result[i].link}`));
                if (img) context.drawImage(img, pivWide * (i % 5), picHight * Math.floor(i / 5), pivWide, picHight);

                //邊框處理
                if (version === "TC") {
                    if (result[i].type.endsWith('star3')) {
                        context.drawImage(star3, pivWide * (i % 5), (picHight * Math.floor(i / 5)), pivWide, picHight);
                    } else if (result[i].type.endsWith('star2')) {
                        context.drawImage(star2, pivWide * (i % 5), (picHight * Math.floor(i / 5)), pivWide, picHight);
                    } else {
                        context.drawImage(star1, pivWide * (i % 5), (picHight * Math.floor(i / 5)), pivWide, picHight);
                    }
                } else {
                    if (result[i].type.endsWith('star3')) {
                        context.drawImage(star3, pivWide * (i % 5) - 6, (picHight * Math.floor(i / 5)) - 35, pivWide + 11, picHight + 40);
                    } else if (result[i].type.endsWith('star2')) {
                        context.drawImage(star2, pivWide * (i % 5) - 6, (picHight * Math.floor(i / 5)) - 35, pivWide + 11, picHight + 40);
                    } else {
                        context.drawImage(star1, pivWide * (i % 5) - 6, (picHight * Math.floor(i / 5)) - 35, pivWide + 11, picHight + 40);
                    }
                }

                //抽取數處理
                const numBlock = await Canvas.loadImage(`./pic/number.png`);
                context.drawImage(numBlock, pivWide * (i % 5), (picHight * Math.floor(i / 5) + picHight - 32), 100 * 0.28, 56 * 0.72);
                context.fillText((result[i].time + 1).toString().padStart(3, ' '), pivWide * (i % 5), (picHight * Math.floor(i / 5) + + picHight - 5));

                //PU符號處理
                if (result[i].pickup) {
                    const pu = await Canvas.loadImage(`./pic/pu.png`);
                    context.drawImage(pu, pivWide * (i % 5), (picHight * Math.floor(i / 5) + picHight - 46), 100 * 0.6, 40 * 0.6);
                }
            }

            context.fillText(`${gachaName[version]} 賽馬娘轉蛋 抽取 ${much} 抽結果` +
                `\n總SSR數: ${count} 個 ${much > 10 ? "(抽取數大於10抽將只顯示★3以上的結果)" : ""}`, 5, canvasHight - 29);
            context.fillText(`@${interaction.client.user.tag}`, 600, canvasHight - 5);
            const attachment = new Discord.AttachmentBuilder(canvas.toBuffer(), 'image.png');

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    [
                        new Discord.ButtonBuilder()
                            .setCustomId(`gacha:${version}:${type}:${much}`)
                            .setLabel('再抽一次')
                            .setStyle(Discord.ButtonStyle.Primary),
                    ]
                );

            interaction.editReply({ content: `${interaction.user}`, files: [attachment], components: [row] }).catch(() => { });

        } else if (type === "support") {
            for (let i = 0; i < much; i++) {
                const rnd = Math.random();
                if (rnd < (i % 10 !== 9 ? gDt.SSRPercent : gDt.roll10SSRPercent)) {
                    if (Math.random() < (gDt.PUSSR.length * gDt.pickUpSSRNormalPercent)) {
                        result.push({ link: gDt.PUSSR[Math.floor(Math.random() * gDt.PUSSR.length)], type: "PUSSR", time: i, pickup: true });
                    } else {
                        result.push({ link: gDt.SSR[Math.floor(Math.random() * gDt.SSR.length)], type: "SSR", time: i, pickup: false });
                    }
                    count++;
                } else if ((rnd < (i % 10 !== 9 ? (gDt.SSRPercent + gDt.SRPercent) : (gDt.roll10SSRPercent + gDt.roll10SRPercent)))
                    && much <= 10) {
                    if (Math.random() < gDt.PUSR.length * gDt.pickUpSRNormalPercent) {
                        result.push({ link: gDt.PUSR[Math.floor(Math.random() * gDt.PUSR.length)], type: "PUSR", time: i, pickup: true });
                    } else {
                        result.push({ link: gDt.SR[Math.floor(Math.random() * gDt.SR.length)], type: "SR", time: i, pickup: false });
                    }
                } else if (much <= 10) {
                    if (Math.random() < gDt.PUR.length * gDt.pickUpRNormalPercent) {
                        result.push({ link: gDt.PUR[Math.floor(Math.random() * gDt.PUR.length)], type: "PUR", time: i, pickup: true });
                    } else {
                        result.push({ link: gDt.R[Math.floor(Math.random() * gDt.R.length)], type: "R", time: i, pickup: false });
                    }
                }
            }

            const pivWide = 150;
            const picHight = 200;
            const canvasHight = Math.ceil(result.length / 5) * picHight + 46;
            const canvas = Canvas.createCanvas(pivWide * 5, canvasHight);
            const context = canvas.getContext('2d');
            context.font = "18px a";

            const img = await Canvas.loadImage(`./pic/write.png`);
            context.drawImage(img, 0, 0, pivWide * 5, canvasHight);

            for (let i = 0; i < result.length; i++) {
                const img = await Canvas.loadImage(fs.readFileSync(`./pic/${dirRute}${result[i].type}/${result[i].link}`));
                if (img) context.drawImage(img, pivWide * (i % 5), picHight * Math.floor(i / 5), pivWide, picHight);
                const numBlock = await Canvas.loadImage(`./pic/number.png`);
                if (result[i].pickup) {
                    const pu = await Canvas.loadImage(`./pic/pu.png`);
                    context.drawImage(pu, pivWide * (i % 5), (picHight * Math.floor(i / 5) + 142), 100 * 0.8, 40 * 0.8);
                }
                context.drawImage(numBlock, pivWide * (i % 5), (picHight * Math.floor(i / 5) + 162), 100 * 0.8, 56 * 0.8);
                context.fillText((result[i].time + 1).toString().padStart(3, ' '), pivWide * (i % 5) + 24, (picHight * Math.floor(i / 5) + 192));
            }

            context.fillText(`${gachaName[version]} 支援卡轉蛋 抽取 ${much} 抽結果` +
                `\n總SSR數: ${count} 個 ${much > 10 ? "(抽取數大於10抽將只顯示SSR以上的結果)" : ""}`, 5, canvasHight - 29);
            context.fillText(`@${interaction.client.user.tag}`, 600, canvasHight - 5);
            const attachment = new Discord.AttachmentBuilder(canvas.toBuffer(), 'image.png');

            const row = new Discord.ActionRowBuilder()
                .addComponents(
                    [
                        new Discord.ButtonBuilder()
                            .setCustomId(`gacha:${version}:${type}:${much}`)
                            .setLabel('再抽一次')
                            .setStyle(Discord.ButtonStyle.Primary),
                    ]
                );

            interaction.editReply({ content: `${interaction.user}`, files: [attachment], components: [row] }).catch(() => { });
        } else {
            return interaction.editReply({ content: "抱歉，目前資料庫中不存在這個轉蛋種類。" });
        }
    },
};