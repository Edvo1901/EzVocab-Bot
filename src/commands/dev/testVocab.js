const { SlashCommandBuilder } = require('discord.js');
const schedulerService = require('../../services/schedulerService');
const { successEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('test-vocab')
		.setDescription('[DEV] Post one daily word now (daily_word_channel_id).'),
	developer: true,

	async execute(interaction) {
		await interaction.deferReply({ flags: 64 });
		await schedulerService.postDailyWord(interaction.client);
		return interaction.editReply({
			embeds: [
				successEmbed(
					'Daily word triggered',
					'Posted a random word to your configured daily word channel.',
				),
			],
		});
	},
};
