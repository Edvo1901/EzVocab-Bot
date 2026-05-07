const { addTenseEntry, parseExamplesFromMultiline } = require('../services/tenseService');
const { tenseDetailEmbed, errorEmbed, warningEmbed } = require('../services/embedTemplates');

module.exports = {
	customID: 'tense:add',
	async execute(interaction) {
		const payload = {
			name: interaction.fields.getTextInputValue('name'),
			structure: interaction.fields.getTextInputValue('structure'),
			usageNote: interaction.fields.getTextInputValue('usage_note'),
			examples: parseExamplesFromMultiline(
				interaction.fields.getTextInputValue('examples'),
			),
		};

		const result = await addTenseEntry(payload);
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
			embeds: [tenseDetailEmbed(result.item, 'Tense Added')],
			flags: 64,
		});
	},
};
