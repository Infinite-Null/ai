/**
 * WordPress dependencies
 */
import { registerPlugin } from '@wordpress/plugins';

/**
 * Internal dependencies
 */
import LabelGenerationPlugin from './components/LabelGenerationPlugin';
import './index.scss';

registerPlugin( 'ai-label-generation', {
	render: () => <LabelGenerationPlugin />,
} );
