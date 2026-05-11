const { SlashCommandBuilder } = require('discord.js');
const sentenceStructureRepository = require('../../services/db/sentenceStructureRepository');
const { sentenceStructureDetailEmbed, errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sentence-structure-by-id')
		.setDescription('Show full details of a sentence structure pattern by ID.')
		.addIntegerOption((option) =>
			option.setName('id').setDescription('Pattern ID').setRequired(true),
		),

	async execute(interaction) {
		const id = interaction.options.getInteger('id', true);
		const item = await sentenceStructureRepository.getSentenceStructureById(id);
		if (!item) {
			return interaction.reply({
				embeds: [
					errorEmbed('Not found', `No sentence structure found with ID: ${id}.`),
				],
				flags: 64,
			});
		}

		return interaction.reply({
			embeds: [sentenceStructureDetailEmbed(item)],
			flags: 64,
		});
	},
};
