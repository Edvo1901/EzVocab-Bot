const { SlashCommandBuilder } = require('discord.js');
const schedulerService = require('../../services/schedulerService');
const { successEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('test-vocab-quiz')
		.setDescription('[DEV] Start daily quiz now (quiz_channel_id), same as scheduled job.'),
	developer: true,

	async execute(interaction) {
		await interaction.deferReply({ flags: 64 });
		await schedulerService.postDailyQuiz(interaction.client);
		return interaction.editReply({
			embeds: [
				successEmbed(
					'Daily quiz triggered',
					'If no quiz was already active for the quiz channel, question 1 was posted there. Otherwise nothing changed.',
				),
			],
		});
	},
};
