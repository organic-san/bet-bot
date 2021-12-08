const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bot-info')
        .setDescription('機器人的相關的資訊'),
    tag: "interaction",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     */
	async execute(interaction) {
        const time = interaction.client.user.createdAt;
        let char = "";
        switch(time.getDay()){
            case 0: char = "日"; break;
            case 1: char = "一"; break;
            case 2: char = "二"; break;
            case 3: char = "三"; break;
            case 4: char = "四"; break;
            case 5: char = "五"; break;
            case 6: char = "六"; break;
        }
        const timejoin = interaction.guild.members.cache.get(interaction.client.user.id).joinedAt;
        let week = '';
        switch(timejoin.getDay()){
            case 0: week = "日"; break;
            case 1: week = "一"; break;
            case 2: week = "二"; break;
            case 3: week = "三"; break;
            case 4: week = "四"; break;
            case 5: week = "五"; break;
            case 6: week = "六"; break;
        }
        const uptime = interaction.client.uptime;
        const uptimeday = Math.floor(uptime / (86400 * 1000));
        const uptimehour = Math.floor((uptime % (86400 * 1000)) / (3600 * 1000));
        const uptimemin = Math.floor((uptime % (3600 * 1000)) / (60 * 1000));
        const uptimesec = Math.floor((uptime % (60 * 1000)) / (1 * 1000));
        const embed3 = new Discord.MessageEmbed()
            .setColor(process.env.EMBEDCOLOR)
            .setTitle(`${interaction.client.user.username} 的資訊`)
            .setDescription(`關於這個機器人的資訊：`)
            .addField('製作者', `organic_san_2#0500`)
            .addField('建立日期', `${time.getFullYear()} ${time.getMonth()+1}/${time.getDate()} (${char})`, true)
            .addField('加入伺服器時間', `${timejoin.getFullYear()} ${timejoin.getMonth()+1}/${timejoin.getDate()} (${week})`, true)
            .addField('持續運作時間', `${uptimeday}d ${uptimehour}h ${uptimemin}m ${uptimesec}s`, true)
            .addField('參與伺服器數量', `${interaction.client.guilds.cache.size}`, true)
            .addField('延遲', `${interaction.client.ws.ping}ms`, true)
            .setThumbnail(interaction.client.user.displayAvatarURL({dynamic: true}))
            .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
            .setTimestamp()
        interaction.reply({embeds: [embed3]});
	},
};