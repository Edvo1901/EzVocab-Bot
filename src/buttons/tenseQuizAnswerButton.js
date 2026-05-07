const tenseQuizService = require('../services/tenseQuizService');

module.exports = {
	customID: 'tense-quiz:answer:',
	async execute(interaction) {
		const [, , sessionId, questionIndex, option] = interaction.customId.split(':');
		return tenseQuizService.handleAnswerInteraction(
			interaction,
			sessionId,
			Number(questionIndex),
			option,
		);
	},
};
