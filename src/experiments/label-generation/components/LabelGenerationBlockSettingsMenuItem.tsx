/**
 * WordPress dependencies
 */
import { MenuItem, Spinner } from '@wordpress/components';
import {
	BlockSettingsMenuControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import { pencil } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { hasMinimumContent } from '../../../utils/character-count';
import { getBlockSubtreeContent, getSettings } from '../utils';
import type { UseLabelGenerationReturn } from '../hooks/useLabelGeneration';
import type { Block } from '../types';

type LabelGenerationBlockMenuItemProps = {
	labelGeneration: UseLabelGenerationReturn;
};

export default function LabelGenerationBlockSettingsMenuItem( {
	labelGeneration,
}: LabelGenerationBlockMenuItemProps ) {
	const { minContentLength } = getSettings();
	const {
		isLoading: isAnyGenerating,
		activeClientId,
		generateSingleBlock,
	} = labelGeneration;

	return (
		<BlockSettingsMenuControls>
			{ ( { selectedClientIds } ) => {
				if ( ! selectedClientIds || selectedClientIds.length !== 1 ) {
					return null;
				}

				const clientId = selectedClientIds[ 0 ];

				return (
					<BlockMenuItemInner
						clientId={ clientId }
						minContentLength={ minContentLength }
						isAnyGenerating={ isAnyGenerating }
						activeClientId={ activeClientId }
						generateSingleBlock={ generateSingleBlock }
					/>
				);
			} }
		</BlockSettingsMenuControls>
	);
}

function BlockMenuItemInner( {
	clientId,
	minContentLength,
	isAnyGenerating,
	activeClientId,
	generateSingleBlock,
}: {
	clientId: string;
	minContentLength: number;
	isAnyGenerating: boolean;
	activeClientId: string | null;
	generateSingleBlock: ( clientId: string ) => Promise< void >;
} ) {
	const block = useSelect(
		( sel ) =>
			(
				sel( blockEditorStore ) as {
					getBlock: ( id: string ) => Block | null;
				}
			 ).getBlock( clientId ),
		[ clientId ]
	);

	if ( ! block ) {
		return null;
	}

	// Apply only to container blocks (matching the bulk generator logic).
	const isContainer = ( block.innerBlocks?.length ?? 0 ) > 0;
	if ( ! isContainer ) {
		return null;
	}

	const blockContent = getBlockSubtreeContent( block );
	const isContentTooShort = ! hasMinimumContent(
		blockContent,
		minContentLength
	);

	const hasExistingLabel = Boolean(
		block.attributes?.metadata?.name?.trim()
	);
	const isThisBlockGenerating = activeClientId === clientId;

	const label = isThisBlockGenerating
		? __( 'Generating label…', 'ai' )
		: hasExistingLabel
		? __( 'Regenerate Block Label', 'ai' )
		: __( 'Generate Block Label', 'ai' );

	const info =
		isAnyGenerating && ! isThisBlockGenerating
			? __( 'Another label is currently being generated.', 'ai' )
			: isContentTooShort
			? sprintf(
					/* translators: %d: minimum number of characters required */
					__(
						'At least %d characters required to generate a label.',
						'ai'
					),
					minContentLength
			  )
			: undefined;

	return (
		<MenuItem
			icon={ isThisBlockGenerating ? <Spinner /> : pencil }
			disabled={ isAnyGenerating || isContentTooShort }
			onClick={ () => {
				generateSingleBlock( clientId );
			} }
			{ ...( info && { info } ) }
		>
			{ label }
		</MenuItem>
	);
}
