const { SlashCommandBuilder } = require('discord.js');
const quizService = require('../../services/quizService');
const { warningEmbed, errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('quiz-now')
		.setDescription('Start a quiz session immediately in this channel.'),

	async execute(interaction) {
		await interaction.deferReply({ flags: 64 });
		const result = await quizService.createQuizSessionForChannel(interaction.channelId);
		if (result.error) {
			return interaction.editReply({
				embeds: [errorEmbed('Quiz setup failed', result.error)],
			});
		}
		if (result.alreadyActive) {
			return interaction.editReply({
				embeds: [warningEmbed('Quiz already active', 'Finish the current quiz first.')],
			});
		}

		await quizService.postCurrentQuestion(interaction.channel, result.sessionId);
		return interaction.editReply({
			embeds: [warningEmbed('Quiz started', 'Question 1 has been posted.')],
		});
	},
};
