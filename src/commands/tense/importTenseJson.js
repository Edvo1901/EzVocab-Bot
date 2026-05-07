const { SlashCommandBuilder } = require('discord.js');
const { importTenseJsonFromAttachment } = require('../../services/tenseService');
const { successEmbed, errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('import-tense-json')
		.setDescription('Import tense entries from a JSON file attachment.')
		.addAttachmentOption((option) =>
			option
				.setName('file')
				.setDescription('JSON file containing tense entries')
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
			const summary = await importTenseJsonFromAttachment(attachment.url);
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
				embeds: [successEmbed('Tense import completed', description)],
			});
		} catch (error) {
			return interaction.editReply({
				embeds: [errorEmbed('Import failed', error.message)],
			});
		}
	},
};
