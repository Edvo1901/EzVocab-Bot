const { SlashCommandBuilder } = require('discord.js');
const { importTenseQuizJsonFromAttachment } = require('../../services/tenseQuizService');
const { successEmbed, errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('import-tense-quiz-json')
		.setDescription('Import tense quiz questions from a JSON file attachment.')
		.addAttachmentOption((option) =>
			option
				.setName('file')
				.setDescription('JSON array: sentence, options[4], correct_index, explanation')
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
			const summary = await importTenseQuizJsonFromAttachment(attachment.url);
			const description = [
				`Inserted: ${summary.inserted}`,
				`Failed: ${summary.failed}`,
				`Total processed: ${summary.inserted + summary.failed}`,
				summary.errors.length > 0 ? `Sample errors: ${summary.errors.join(' | ')}` : null,
			]
				.filter(Boolean)
				.join('\n');

			return interaction.editReply({
				embeds: [successEmbed('Tense quiz import completed', description)],
			});
		} catch (error) {
			return interaction.editReply({
				embeds: [errorEmbed('Import failed', error.message)],
			});
		}
	},
};
