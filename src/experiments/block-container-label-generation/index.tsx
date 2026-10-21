/**
 * WordPress dependencies
 */
import { registerPlugin } from '@wordpress/plugins';

/**
 * Internal dependencies
 */
import BlockContainerLabelGenerationListViewHeader from './components/BlockContainerLabelGenerationListViewHeader';
import RenameModalWrapper from './components/RenameModalWrapper';
import { useBlockContainerLabelGeneration } from './hooks/useBlockContainerLabelGeneration';
import './index.scss';

function BlockContainerLabelGeneration() {
	const labelGeneration = useBlockContainerLabelGeneration();

	return (
		<>
			<BlockContainerLabelGenerationListViewHeader
				labelGeneration={ labelGeneration }
			/>
			<RenameModalWrapper />
		</>
	);
}

registerPlugin( 'ai-block-container-label-generation', {
	render: BlockContainerLabelGeneration,
} );
