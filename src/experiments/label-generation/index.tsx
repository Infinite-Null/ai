/**
 * WordPress dependencies
 */
import { registerPlugin } from '@wordpress/plugins';

/**
 * Internal dependencies
 */
import LabelGenerationListViewHeader from './components/LabelGenerationListViewHeader';
import LabelGenerationBlockSettingsMenuItem from './components/LabelGenerationBlockSettingsMenuItem';
import { useLabelGeneration } from './hooks/useLabelGeneration';
import './index.scss';

function LabelGeneration() {
	const labelGeneration = useLabelGeneration();

	return (
		<>
			<LabelGenerationListViewHeader
				labelGeneration={ labelGeneration }
			/>
			<LabelGenerationBlockSettingsMenuItem
				labelGeneration={ labelGeneration }
			/>
		</>
	);
}

registerPlugin( 'ai-label-generation', {
	render: LabelGeneration,
} );
