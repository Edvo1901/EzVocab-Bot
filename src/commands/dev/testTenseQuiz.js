const { SlashCommandBuilder } = require('discord.js');
const schedulerService = require('../../services/schedulerService');
const { successEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('test-tense-quiz')
		.setDescription('[DEV] Start tense quiz now (tense_quiz_channel_id), same as scheduled job.'),
	developer: true,

	async execute(interaction) {
		await interaction.deferReply({ flags: 64 });
		await schedulerService.postDailyTenseQuiz(interaction.client);
		return interaction.editReply({
			embeds: [
				successEmbed(
					'Tense quiz triggered',
					'If no tense quiz was already active for that channel, question 1 was posted there. Otherwise nothing changed.',
				),
			],
		});
	},
};
