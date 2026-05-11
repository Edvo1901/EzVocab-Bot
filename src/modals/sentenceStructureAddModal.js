const {
	addSentenceStructureEntry,
	parseExamplesFromMultiline,
} = require('../services/sentenceStructureService');
const {
	sentenceStructureDetailEmbed,
	errorEmbed,
	warningEmbed,
} = require('../services/embedTemplates');

module.exports = {
	customID: 'sentence-structure:add',
	async execute(interaction) {
		const payload = {
			name: interaction.fields.getTextInputValue('name'),
			structure: interaction.fields.getTextInputValue('structure'),
			meaningNote: interaction.fields.getTextInputValue('meaning_note'),
			examples: parseExamplesFromMultiline(
				interaction.fields.getTextInputValue('examples'),
			),
		};

		const result = await addSentenceStructureEntry(payload);
		if (result.error) {
			return interaction.reply({
				embeds: [errorEmbed('Add failed', result.error)],
				flags: 64,
			});
		}
		if (result.duplicate) {
			return interaction.reply({
				embeds: [
					warningEmbed(
						'Duplicate entry',
						`${result.duplicate.name} (ID: ${result.duplicate.id}) already exists.`,
					),
				],
				flags: 64,
			});
		}

		return interaction.reply({
			embeds: [sentenceStructureDetailEmbed(result.item, 'Pattern added')],
			flags: 64,
		});
	},
};
