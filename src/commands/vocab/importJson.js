const { SlashCommandBuilder } = require('discord.js');
const { importVocabJsonFromAttachment } = require('../../services/vocabService');
const { successEmbed, errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('import-json')
		.setDescription('Import vocabulary entries from a JSON file attachment.')
		.addAttachmentOption((option) =>
			option
				.setName('file')
				.setDescription('JSON file containing entries')
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
			const summary = await importVocabJsonFromAttachment(attachment.url);
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
				embeds: [successEmbed('Import completed', description)],
			});
		} catch (error) {
			return interaction.editReply({
				embeds: [errorEmbed('Import failed', error.message)],
			});
		}
	},
};
