const { SlashCommandBuilder } = require('discord.js');
const { importSentenceStructureJsonFromAttachment } = require('../../services/sentenceStructureService');
const { successEmbed, errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('import-sentence-structure-json')
		.setDescription('Import sentence structure patterns from a JSON file attachment.')
		.addAttachmentOption((option) =>
			option
				.setName('file')
				.setDescription('JSON file containing pattern entries')
				.setRequired(true),
		),

	async execute(interaction) {
		const attachment = interaction.options.getAttachment('file', true);
		if (!attachment.contentType?.includes('json') && !attachment.name.endsWith('.json')) {
			return interaction.reply({
				embeds: [errorEmbed('Import failed', 'Please upload a valid JSON file.')],
				flags: 64,
			});
		}

		await interaction.deferReply({ flags: 64 });
		try {
			const summary = await importSentenceStructureJsonFromAttachment(attachment.url);
			const description = [
				`Inserted: ${summary.inserted}`,
				`Skipped (duplicates): ${summary.skipped}`,
				`Failed: ${summary.failed}`,
				`Total: ${summary.inserted + summary.skipped + summary.failed}`,
				summary.errors.length > 0 ? `Errors: ${summary.errors.join(' | ')}` : null,
			]
				.filter(Boolean)
				.join('\n');

			return interaction.editReply({
				embeds: [successEmbed('Sentence structure import completed', description)],
			});
		} catch (error) {
			return interaction.editReply({
				embeds: [errorEmbed('Import failed', error.message)],
			});
		}
	},
};
