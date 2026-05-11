const {
	updateSentenceStructureEntry,
	parseExamplesFromMultiline,
} = require('../services/sentenceStructureService');
const {
	sentenceStructureDetailEmbed,
	errorEmbed,
	warningEmbed,
} = require('../services/embedTemplates');

module.exports = {
	customID: 'sentence-structure:update:',
	async execute(interaction) {
		const [, , idPart] = interaction.customId.split(':');
		const id = Number(idPart);
		if (Number.isNaN(id)) {
			return interaction.reply({
				embeds: [errorEmbed('Update failed', 'Invalid pattern ID.')],
				flags: 64,
			});
		}

		const payload = {
			name: interaction.fields.getTextInputValue('name'),
			structure: interaction.fields.getTextInputValue('structure'),
			meaningNote: interaction.fields.getTextInputValue('meaning_note'),
			examples: parseExamplesFromMultiline(
				interaction.fields.getTextInputValue('examples'),
			),
		};

		const result = await updateSentenceStructureEntry(id, payload);
		if (result.notFound) {
			return interaction.reply({
				embeds: [
					errorEmbed('Update failed', `No sentence structure found with ID: ${id}.`),
				],
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
						`Update would duplicate ${result.duplicate.name} (ID: ${result.duplicate.id}).`,
					),
				],
				flags: 64,
			});
		}

		return interaction.reply({
			embeds: [sentenceStructureDetailEmbed(result.item, 'Pattern updated')],
			flags: 64,
		});
	},
};
