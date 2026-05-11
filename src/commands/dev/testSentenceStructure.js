const { SlashCommandBuilder } = require('discord.js');
const schedulerService = require('../../services/schedulerService');
const { successEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('test-sentence-structure')
		.setDescription(
			'[DEV] Post one daily sentence structure now (daily_sentence_structure_channel_id).',
		),
	developer: true,

	async execute(interaction) {
		await interaction.deferReply({ flags: 64 });
		await schedulerService.postDailySentenceStructure(interaction.client);
		return interaction.editReply({
			embeds: [
				successEmbed(
					'Daily sentence structure triggered',
					'Posted a random pattern to your configured daily sentence structure channel.',
				),
			],
		});
	},
};
