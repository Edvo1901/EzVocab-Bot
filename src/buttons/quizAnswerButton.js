const quizService = require('../services/quizService');

module.exports = {
	customID: 'quiz:answer:',
	async execute(interaction) {
		const [, , sessionId, questionIndex, option] = interaction.customId.split(':');
		return quizService.handleAnswerInteraction(
			interaction,
			sessionId,
			Number(questionIndex),
			option,
		);
	},
};
