const tenseQuizService = require('../services/tenseQuizService');

module.exports = {
	customID: 'tense-quiz:next:',
	async execute(interaction) {
		const [, , sessionId] = interaction.customId.split(':');
		return tenseQuizService.handleNextInteraction(interaction, sessionId);
	},
};
