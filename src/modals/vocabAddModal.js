const { addVocabEntry, parseExamplesFromMultiline } = require('../services/vocabService');
const {
	vocabDetailEmbed,
	errorEmbed,
	warningEmbed,
} = require('../services/embedTemplates');

module.exports = {
	customID: 'vocab:add',
	async execute(interaction) {
		const payload = {
			text: interaction.fields.getTextInputValue('text'),
			type: interaction.fields.getTextInputValue('type'),
			viDefinition: interaction.fields.getTextInputValue('vi_definition'),
			examples: parseExamplesFromMultiline(
				interaction.fields.getTextInputValue('examples'),
			),
		};

		const result = await addVocabEntry(payload);
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
						`${result.duplicate.text} (ID: ${result.duplicate.id}) already exists with type ${result.duplicate.type}.`,
					),
				],
				flags: 64,
			});
		}

		return interaction.reply({
			embeds: [vocabDetailEmbed(result.item, 'Word Added')],
			flags: 64,
		});
	},
};
