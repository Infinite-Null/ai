/**
 * Internal dependencies
 */
import { hasMinimumContent } from '../../../utils/character-count';
import { getBlockText } from '../../../utils/blocks';
import { runAbility } from '../../../utils/run-ability';
import { LABEL_GENERATION_MINIMUM_CONTENT_LENGTH_DEFAULT } from '../constants';
import type { AILabelGenerationData, Block } from '../types';

/**
 * Retrieves the label generation settings from the global window object.
 *
 * @return The label generation settings.
 */
export const getSettings = (): AILabelGenerationData => {
	const settings = window?.aiLabelGenerationData ?? {};

	return {
		enabled: settings.enabled ?? false,
		minContentLength:
			settings.minContentLength ??
			LABEL_GENERATION_MINIMUM_CONTENT_LENGTH_DEFAULT,
	};
};

/**
 * Generates a label for a given block's content.
 *
 * @param content The content to generate a label for.
 * @param postId  The ID of the post.
 * @return  A promise that resolves to the generated label.
 */
export function generateLabel(
	content: string,
	postId: number
): Promise< string > {
	return runAbility< string >( 'ai/label-generation', {
		content,
		post_id: postId,
	} );
}

/**
 * Combines content fragments into one normalized string.
 *
 * @param parts Content fragments.
 * @return Normalized content.
 */
function combineContent( parts: string[] ): string {
	return parts.filter( Boolean ).join( ' ' ).replace( /\s+/g, ' ' ).trim();
}

/**
 * Recursively collects readable content and eligible container blocks.
 *
 * Each returned candidate contains the combined content of the container and
 * all of its descendants. Candidates are returned in deepest-first order.
 *
 * @param blocks           Blocks to traverse.
 * @param minContentLength Minimum content length required for generation.
 * @return Combined subtree content and eligible label candidates.
 */
export function collectLabelCandidates(
	blocks: Block[],
	minContentLength: number
): { content: string; candidates: { clientId: string; content: string }[] } {
	const contentParts: string[] = [];
	const candidates: { clientId: string; content: string }[] = [];

	for ( const block of blocks ) {
		// Collect content and eligible container blocks from the inner blocks.
		const childResult = collectLabelCandidates(
			block.innerBlocks,
			minContentLength
		);

		// Add child candidates to the list of candidates, follow a bottom(leaf)-first order.
		candidates.push( ...childResult.candidates );

		const blockContent = combineContent( [
			getBlockText( block ),
			childResult.content,
		] );

		if ( blockContent ) {
			contentParts.push( blockContent );
		}

		const existingLabel = block.attributes?.metadata?.name?.trim();
		const isContainer = block.innerBlocks.length > 0;

		if (
			isContainer &&
			! existingLabel &&
			hasMinimumContent( blockContent, minContentLength )
		) {
			candidates.push( {
				clientId: block.clientId,
				content: blockContent,
			} );
		}
	}

	return {
		content: combineContent( contentParts ),
		candidates,
	};
}
