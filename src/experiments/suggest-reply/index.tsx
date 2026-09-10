/**
 * Suggest reply experiment plugin registration.
 */

/**
 * WordPress dependencies
 */
import domReady from '@wordpress/dom-ready';

/**
 * Internal dependencies
 */
import { init, initEditPage } from './components/SuggestReply';
import './index.scss';

declare global {
	interface Window {
		aiSuggestReplyData?: {
			enabled: boolean | string;
			is_edit_page?: boolean | string;
			comment_id?: number | string;
		};
	}
}

domReady( () => {
	const data = window.aiSuggestReplyData;

	const isEnabled =
		data?.enabled === true ||
		data?.enabled === '1' ||
		data?.enabled === 'true';

	if ( ! isEnabled ) {
		return;
	}

	const isEditPage =
		data?.is_edit_page === true ||
		data?.is_edit_page === '1' ||
		data?.is_edit_page === 'true';
	const commentId = data?.comment_id ? Number( data.comment_id ) : 0;

	if ( isEditPage && commentId > 0 ) {
		initEditPage( commentId );
		return;
	}

	init();
} );
