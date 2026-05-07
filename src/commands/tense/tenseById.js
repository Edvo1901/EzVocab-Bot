const { SlashCommandBuilder } = require('discord.js');
const tenseRepository = require('../../services/db/tenseRepository');
const { tenseDetailEmbed, errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tense-by-id')
		.setDescription('Show full details of a tense item by ID.')
		.addIntegerOption((option) =>
			option.setName('id').setDescription('Tense ID').setRequired(true),
		),

	async execute(interaction) {
		const id = interaction.options.getInteger('id', true);
		const item = await tenseRepository.getTenseById(id);
		if (!item) {
			return interaction.reply({
				embeds: [errorEmbed('Not found', `No tense found with ID: ${id}.`)],
				flags: 64,
			});
		}

		return interaction.reply({
			embeds: [tenseDetailEmbed(item)],
			flags: 64,
		});
	},
};
