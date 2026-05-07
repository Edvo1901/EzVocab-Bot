const {
	SlashCommandBuilder,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');
const tenseRepository = require('../../services/db/tenseRepository');
const { errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('update-tense')
		.setDescription('Update an existing tense item by ID.')
		.addIntegerOption((option) =>
			option.setName('id').setDescription('Tense ID').setRequired(true),
		),

	async execute(interaction) {
		const id = interaction.options.getInteger('id', true);
		const item = await tenseRepository.getTenseById(id);
		if (!item) {
			return interaction.reply({
				embeds: [errorEmbed('Update failed', `No tense found with ID: ${id}.`)],
				flags: 64,
			});
		}

		const modal = new ModalBuilder()
			.setCustomId(`tense:update:${id}`)
			.setTitle(`Update Tense ID ${id}`);

		const nameInput = new TextInputBuilder()
			.setCustomId('name')
			.setLabel('Tense name (optional)')
			.setStyle(TextInputStyle.Short)
			.setRequired(false)
			.setValue(item.name)
			.setMaxLength(255);

		const structureInput = new TextInputBuilder()
			.setCustomId('structure')
			.setLabel('Sentence structure (optional)')
			.setStyle(TextInputStyle.Short)
			.setRequired(false)
			.setValue(item.structure)
			.setMaxLength(500);

		const usageInput = new TextInputBuilder()
			.setCustomId('usage_note')
			.setLabel('When to use (optional)')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false)
			.setValue(item.usageNote)
			.setMaxLength(2000);

		const examplesInput = new TextInputBuilder()
			.setCustomId('examples')
			.setLabel('Examples (optional, one per line)')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false)
			.setValue((item.examples || []).join('\n'))
			.setMaxLength(2000);

		modal.addComponents(
			new ActionRowBuilder().addComponents(nameInput),
			new ActionRowBuilder().addComponents(structureInput),
			new ActionRowBuilder().addComponents(usageInput),
			new ActionRowBuilder().addComponents(examplesInput),
		);

		return interaction.showModal(modal);
	},
};
