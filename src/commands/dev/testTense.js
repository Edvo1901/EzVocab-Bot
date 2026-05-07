const { SlashCommandBuilder } = require('discord.js');
const schedulerService = require('../../services/schedulerService');
const { successEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('test-tense')
		.setDescription('[DEV] Post one daily tense now (daily_tense_channel_id).'),
	developer: true,

	async execute(interaction) {
		await interaction.deferReply({ flags: 64 });
		await schedulerService.postDailyTense(interaction.client);
		return interaction.editReply({
			embeds: [
				successEmbed(
					'Daily tense triggered',
					'Posted a random tense to your configured daily tense channel.',
				),
			],
		});
	},
};
