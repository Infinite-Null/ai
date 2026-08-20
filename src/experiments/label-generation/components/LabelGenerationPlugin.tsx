/**
 * WordPress dependencies
 */
import { Button, Icon } from '@wordpress/components';
import { PluginPostStatusInfo } from '@wordpress/editor';
import { __, sprintf } from '@wordpress/i18n';
import { Stack, Text } from '@wordpress/ui';
import { pencil } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { getSettings } from '../utils';
import { useLabelGeneration } from '../hooks/useLabelGeneration';

export default function LabelGenerationPlugin() {
	const {
		isLoading: isGeneratingLabel,
		progress,
		total,
		minContentLength,
		isContentTooShort,
		generate: generateLabel,
	} = useLabelGeneration();

	if ( ! getSettings().enabled ) {
		return null;
	}

	const buttonLabel = isGeneratingLabel
		? sprintf(
				/* translators: %1$d: number of blocks with labels generated, %2$d: total number of blocks */
				__( 'Generating block labels… (%1$d/%2$d)', 'ai' ),
				progress,
				total
		  )
		: __( 'Generate Block Labels', 'ai' );

	const buttonDescription = isContentTooShort
		? sprintf(
				/* translators: %d: minimum number of characters required */
				__(
					'Content translation will be available when the post content has at least %d characters.',
					'ai'
				),
				minContentLength
		  )
		: __(
				'Generates a concise label for individual content blocks.',
				'ai'
		  );

	return (
		<PluginPostStatusInfo>
			<Stack
				direction="column"
				gap="sm"
				align="stretch"
				className="ai-label-generation-plugin"
			>
				<Button
					icon={ <Icon icon={ pencil } aria-hidden="true" /> }
					variant="secondary"
					className="ai-label-generation-plugin__button"
					__next40pxDefaultSize
					onClick={ generateLabel }
					disabled={ isGeneratingLabel }
					isBusy={ isGeneratingLabel }
					accessibleWhenDisabled
				>
					{ buttonLabel }
				</Button>

				<Text className="ai-label-generation-plugin__description">
					{ buttonDescription }
				</Text>
			</Stack>
		</PluginPostStatusInfo>
	);
}
