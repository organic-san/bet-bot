const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const guild = require('../functions/guildInfo');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('user')
        .setDescription('用戶')
        .addSubcommand(opt =>
            opt.setName('info')
            .setDescription('查看該用戶的資料')
            .addUserOption(opt => 
                opt.setName('user')
                .setDescription('要查看的對象')
            )
        )/*.addSubcommand(opt =>
            opt.setName('ranking')
            .setDescription('查看等級排行')
        )*/.addSubcommand(opt =>
            opt.setName('setting')
            .setDescription('用戶相關設定(由管理員操控)')
            .addUserOption(opt => 
                opt.setName('user')
                .setDescription('要查看的對象')
                .setRequired(true)
            )
        ),
    tag: "guildInfo",

    /**
     * 
     * @param {Discord.CommandInteraction} interaction 
     * @param {guild.GuildInformation} guildInformation 
     */
	async execute(interaction, guildInformation) {
        /*
        if(!(interaction.guild.members.cache.get((interaction.options.getUser('user') ?? interaction.user).id))) 
            return interaction.reply({content: "我沒辦法在這個伺服器中找到他。", ephemeral:true});
        */
        if (interaction.options.getSubcommand() === 'info') {

            const user = interaction.options.getUser('user') ?? interaction.user;
            
            let userData = guildInformation.getUser(user.id);
            if(!userData) 
                return interaction.reply({content: `在我的資料中沒有 ${user} 的資料。可能是因為他不在這個伺服器，或者沒有參與遊戲。`, ephemeral: true});
            let embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .addField('持有金錢', userData.coins + " coin(s)", true)
                .addField('累計下注', userData.totalBet + " coin(s)", true)
                .addField('累計獲得', userData.totalGet + " coin(s)", true)
                .addField('回收率', userData.totalGet > 0 ? ((userData.totalBet / userData.totalGet) * 100) + "%" : "無法計測", true)
                .addField('參與次數', `${userData.joinTimes}`, true)
                .addField('平均獲得', userData.joinTimes > 0 ? ((userData.totalGet / userData.joinTimes)) + 'cion(s)' : "無法計測", true)
                .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
                .setTimestamp();
                

            if(interaction.guild.members.cache.get(user.id).nickname)
                embed.setAuthor(`${interaction.guild.members.cache.get(user.id).nickname} (${user.tag})`, user.displayAvatarURL({dynamic: true}));
            else
                embed.setAuthor(`${user.tag}`, user.displayAvatarURL({dynamic: true}));
            
            interaction.reply({embeds: [embed], ephemeral: true});

        } else if(interaction.options.getSubcommand() === 'ranking') {
            //TODO: 排名系統
            /*
            if(!guildInformation.levels) return interaction.reply({content: "哎呀！這個伺服器並沒有開啟等級系統！"});
            const pageShowHax = 20;
            let page = 0;
            guildInformation.sortUser();
            const levels = levelsEmbed(interaction.guild, guildInformation, page, pageShowHax);
            const row = new Discord.MessageActionRow()
			.addComponents(
				[
                    new Discord.MessageButton()
                        .setCustomId('上一頁')
                        .setLabel('上一頁')
                        .setStyle('PRIMARY'),
                    new Discord.MessageButton()
                        .setCustomId('下一頁')
                        .setLabel('下一頁')
                        .setStyle('PRIMARY')
                ]
			);
            const msg = await interaction.reply({embeds: [levels], components: [row], fetchReply: true});

            const filter = i => ['上一頁', '下一頁'].includes(i.customId) && !i.user.bot;
            const collector = msg.createMessageComponentCollector({filter, time: 60 * 1000 });
            
            collector.on('collect', async i => {
                if (i.customId === '下一頁') 
                    if(page * pageShowHax + pageShowHax < guildInformation.usersMuch) page++;
                if(i.customId === '上一頁')
                    if(page > 0) page--;
                guildInformation.sortUser();
                const levels = levelsEmbed(interaction.guild, guildInformation, page, pageShowHax);
                i.update({embeds: [levels], components: [row]});
                collector.resetTimer({ time: 60 * 1000 });
            });
            
            collector.on('end', (c, r) => {
                if(r !== "messageDelete"){
                    const levels = levelsEmbed(interaction.guild, guildInformation, page, pageShowHax);
                    interaction.editReply({embeds: [levels], components: []})
                }
            });
            */
        } else { 
            //權限
            if (!interaction.member.permissions.has(Discord.Permissions.FLAGS.MANAGE_GUILD)){ 
                return interaction.reply({content: "此指令需要管理伺服器的權限才能使用。", ephemeral: true});
            }
        }
        
        //以下需要管理權限
        if(interaction.options.getSubcommand() === 'setting') {
            const user = interaction.options.getUser('user') ?? interaction.user;
            
            let userData = guildInformation.getUser(user.id);
            if(!userData) return interaction.reply({content: `在我的資料中沒有 ${user} 的資料。可能是因為他不在這個伺服器，或者沒有參與遊戲。`, ephemeral: true});
            
            /*
            let embed = new Discord.MessageEmbed()
                .setColor(process.env.EMBEDCOLOR)
                .addField('持有金錢', userData.coins + " coin(s)", true)
                .addField('累計下注', userData.totalBet + " coin(s)", true)
                .addField('累計獲得', userData.totalGet + " coin(s)", true)
                .setFooter(`${interaction.client.user.tag}`,`${interaction.client.user.displayAvatarURL({dynamic: true})}`)
                .setTimestamp(),
                

            if(interaction.guild.members.cache.get(user.id).nickname){
                embed.setAuthor(`${interaction.guild.members.cache.get(user.id).nickname} (${user.tag})`, user.displayAvatarURL({dynamic: true}));
            }else{
                embed.setAuthor(`${user.tag}`, user.displayAvatarURL({dynamic: true}));
            }
            interaction.reply({embeds: [embed], ephemeral: true});
            */
        } 
        
	},
};

/**
 * 顯示整個伺服器的經驗值排名
 * @param {Discord.Guild} guild 該伺服器的Discord資料
 * @param {guild.GuildInformation} element 該伺服器的資訊
 * @param {number} page 頁數
 * @param {number} pageShowHax 單頁上限 
 * @returns 包含排名的Discord.MessageEmbed
 */
function levelsEmbed(guild, element, page, pageShowHax){
    //#region 等級排行顯示清單
    let levelembed = new Discord.MessageEmbed()
        .setTitle(`${guild.name} 的等級排行`)
        .setColor(process.env.EMBEDCOLOR)                            
        .setThumbnail(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.jpg`);

    let ebmsgrk = "";
    let ebmsgname = "";
    let ebmsgexp = "";
    for(let i = page * pageShowHax; i < Math.min(page * pageShowHax + pageShowHax, element.users.length); i++){
        let nametag = new String(element.users[i].tag);
        if(nametag.length > 20){nametag = nametag.substring(0,20) + `...`;}
        ebmsgrk += `#${i + 1} \n`;
        ebmsgname += `${nametag}\n`
        ebmsgexp += `${element.users[i].exp} exp. (lv.${element.users[i].levels})\n`;
    }
    levelembed.setDescription(`#${page * pageShowHax + 1} ~ #${Math.min(page * pageShowHax + pageShowHax, element.users.length)}` + 
        ` / #${element.users.length}`);
    levelembed.addField("rank", ebmsgrk, true);
    levelembed.addField("name", ebmsgname, true);
    levelembed.addField("exp.", ebmsgexp, true);

    return levelembed;
}