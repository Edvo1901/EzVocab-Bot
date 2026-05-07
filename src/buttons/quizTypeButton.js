const quizService = require('../services/quizService');

module.exports = {
	customID: 'quiz:type:',
	async execute(interaction) {
		const [, , sessionId, questionIndex] = interaction.customId.split(':');
		return quizService.showTypingModal(interaction, sessionId, Number(questionIndex));
	},
};
