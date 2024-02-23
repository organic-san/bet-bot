const guild = require('../functions/guildInfo');
const fs = require('fs');
const Discord = require('discord.js');
const JSZip = require('jszip');

module.exports = {
    data: new Discord.SlashCommandBuilder()
        .setName('create-zip')
        .setDescription('建立資料備份(由管理員操控)'),

    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.guildInformation} guildInformation
     */
    async execute(interaction, guildInformation) {
        //權限
        if (!interaction.member.permissions.has(Discord.PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: "此指令僅限管理員使用。", ephemeral: true });
        }

        await interaction.deferReply();

        const folderPath = './data/guildData/' + interaction.guildId;

        const zip = new JSZip();

        // 建立資料夾
        function addFolderToZip(folderPath, zip, currentPath = '') {
            const files = fs.readdirSync(folderPath);

            files.forEach(file => {
                const filePath = `${folderPath}/${file}`;
                const stats = fs.statSync(filePath);

                if (stats.isDirectory()) {
                    addFolderToZip(filePath, zip, `${currentPath}${file}/`);
                } else {
                    const content = fs.readFileSync(filePath);
                    zip.file(`${currentPath}${file}`, content);
                }
            });
        }

        // 将文件夹添加到 zip 中
        addFolderToZip(folderPath, zip);

        // 生成 zip 文件
        new Promise((resolve, reject) => {
            zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
                .pipe(fs.createWriteStream(`./data/guildData/${interaction.guildId}.zip`))
                .on('finish', () => {
                    resolve();
                })
                .on('error', (err) => {
                    reject(err);
                });
        }).then(() => {
            interaction.editReply({ content: `資料備份已建立，請點擊下方連結下載。`, files: [`./data/guildData/${interaction.guildId}.zip`] });
        }).catch((err) => {
            interaction.editReply({ content: `資料備份建立失敗，錯誤訊息: ${err}` });
        });

    }
}

/**
 * 
 * @param {guild.betTemplateObject} template 
 * @param {Discord.CommandInteraction} interaction 
 */
function templateEmbed(template, interaction) {
    const embed = new Discord.EmbedBuilder()
        .setColor(process.env.EMBEDCOLOR)
        .setTitle(`模板: ${template.name} 預覽`)
        .setDescription(template.description)
        .setTimestamp()
        .setFooter({
            text: `${interaction.client.user.tag}`,
            iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
        });

    template.option.forEach((ele, ind) => {
        embed.addFields({ name: "📔 " + (ind + 1) + ". " + ele.name, value: ele.description });
    })

    return embed;
}

/**
 * 
 * @param {number} length 
 */
function buttomComponent(length) {
    const row = new Discord.ActionRowBuilder()
        .addComponents(
            [
                new Discord.ButtonBuilder()
                    .setCustomId('add')
                    .setLabel('添加選項')
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setDisabled(length > 20),
                new Discord.ButtonBuilder()
                    .setCustomId('multiadd')
                    .setLabel('批次添加選項')
                    .setStyle(Discord.ButtonStyle.Primary)
                    .setDisabled(length > 20),
                new Discord.ButtonBuilder()
                    .setCustomId('remove')
                    .setLabel('移除選項')
                    .setStyle(Discord.ButtonStyle.Danger)
                    .setDisabled(length < 1),
                new Discord.ButtonBuilder()
                    .setCustomId('complete')
                    .setLabel('設定完成')
                    .setStyle(Discord.ButtonStyle.Success)
                    .setDisabled(length < 2),
            ]
        );
    return row;
}

function CompleteButtomComponent() {
    const row = new Discord.ActionRowBuilder()
        .addComponents(
            [
                new Discord.ButtonBuilder()
                    .setCustomId('checked')
                    .setLabel('確認新增模板')
                    .setStyle(Discord.ButtonStyle.Success),
                new Discord.ButtonBuilder()
                    .setCustomId('cancel')
                    .setLabel('取消確認，繼續設定')
                    .setStyle(Discord.ButtonStyle.Primary),
            ]
        );
    return row;
}