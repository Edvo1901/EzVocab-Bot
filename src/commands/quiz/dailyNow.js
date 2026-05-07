const { SlashCommandBuilder } = require('discord.js');
const schedulerService = require('../../services/schedulerService');
const { successEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('daily-now')
		.setDescription('Post a daily word immediately to the configured channel.'),

	async execute(interaction) {
		await interaction.deferReply({ flags: 64 });
		await schedulerService.postDailyWord(interaction.client);
		return interaction.editReply({
			embeds: [successEmbed('Daily word triggered', 'Posted current daily word now.')],
		});
	},
};
