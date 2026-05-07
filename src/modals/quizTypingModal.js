const quizService = require('../services/quizService');

module.exports = {
	customID: 'quiz:type:submit:',
	async execute(interaction) {
		const [, , , sessionId, questionIndex] = interaction.customId.split(':');
		return quizService.handleTypingSubmit(interaction, sessionId, Number(questionIndex));
	},
};
