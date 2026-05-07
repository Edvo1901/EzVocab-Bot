const { updateVocabEntry, parseExamplesFromMultiline } = require('../services/vocabService');
const {
	vocabDetailEmbed,
	errorEmbed,
	warningEmbed,
} = require('../services/embedTemplates');

module.exports = {
	customID: 'vocab:update:',
	async execute(interaction) {
		const [, , idPart] = interaction.customId.split(':');
		const id = Number(idPart);
		if (Number.isNaN(id)) {
			return interaction.reply({
				embeds: [errorEmbed('Update failed', 'Invalid item ID.')],
				flags: 64,
			});
		}

		const payload = {
			text: interaction.fields.getTextInputValue('text'),
			type: interaction.fields.getTextInputValue('type'),
			viDefinition: interaction.fields.getTextInputValue('vi_definition'),
			examples: parseExamplesFromMultiline(
				interaction.fields.getTextInputValue('examples'),
			),
		};

		const result = await updateVocabEntry(id, payload);
		if (result.notFound) {
			return interaction.reply({
				embeds: [errorEmbed('Update failed', `No entry found with ID: ${id}.`)],
				flags: 64,
			});
		}
		if (result.error) {
			return interaction.reply({
				embeds: [errorEmbed('Update failed', result.error)],
				flags: 64,
			});
		}
		if (result.duplicate) {
			return interaction.reply({
				embeds: [
					warningEmbed(
						'Duplicate entry',
						`Update would duplicate ${result.duplicate.text} (ID: ${result.duplicate.id}).`,
					),
				],
				flags: 64,
			});
		}

		return interaction.reply({
			embeds: [vocabDetailEmbed(result.item, 'Word Updated')],
			flags: 64,
		});
	},
};
