const {
	SlashCommandBuilder,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');
const sentenceStructureRepository = require('../../services/db/sentenceStructureRepository');
const { errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('update-sentence-structure')
		.setDescription('Update a sentence structure pattern by ID.')
		.addIntegerOption((option) =>
			option.setName('id').setDescription('Pattern ID').setRequired(true),
		),

	async execute(interaction) {
		const id = interaction.options.getInteger('id', true);
		const item = await sentenceStructureRepository.getSentenceStructureById(id);
		if (!item) {
			return interaction.reply({
				embeds: [
					errorEmbed('Update failed', `No sentence structure found with ID: ${id}.`),
				],
				flags: 64,
			});
		}

		const modal = new ModalBuilder()
			.setCustomId(`sentence-structure:update:${id}`)
			.setTitle(`Update Pattern ID ${id}`);

		const nameInput = new TextInputBuilder()
			.setCustomId('name')
			.setLabel('Pattern name (optional)')
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

		const meaningInput = new TextInputBuilder()
			.setCustomId('meaning_note')
			.setLabel('Meaning / notes (optional)')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false)
			.setValue(item.meaningNote)
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
			new ActionRowBuilder().addComponents(meaningInput),
			new ActionRowBuilder().addComponents(examplesInput),
		);

		return interaction.showModal(modal);
	},
};
