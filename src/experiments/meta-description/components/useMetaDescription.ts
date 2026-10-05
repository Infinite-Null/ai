/**
 * Hook for meta description generation logic.
 */

/**
 * WordPress dependencies
 */
import { dispatch, useDispatch, useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';
import { useState, useCallback, useMemo, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';

/**
 * Internal dependencies
 */
import { runAbility } from '../../../utils/run-ability';
import { ensureProvider } from '../../../utils/provider-status';
import { hasMinimumContent } from '../../../utils/character-count';
import { getAdapter } from '../seo-adapters';
import type {
	MetaDescriptionAbilityInput,
	MetaDescriptionAbilityResponse,
	MetaDescriptionSuggestion,
	MetaDescriptionData,
} from '../types';

const NOTICE_ID = 'ai_meta_description_error';
const MINIMUM_CONTENT_COUNT_DEFAULT = 250;

const getLocalized = (): MetaDescriptionData | undefined =>
	( window as any ).aiMetaDescriptionData as MetaDescriptionData | undefined;

interface UseMetaDescriptionReturn {
	isGenerating: boolean;
	suggestion: MetaDescriptionSuggestion | null;
	currentDescription: string;
	metaKey: string;
	hasSeoPlugin: boolean;
	isContentTooShort: boolean;
	tooShortLabel: string;
	ensureProviderAvailable: () => boolean;
	generateDescription: () => Promise< void >;
	abortGeneration: () => void;
	applyDescription: ( text: string ) => void;
	clearSuggestion: () => void;
}

/**
 * Hook providing meta description generation state and actions.
 *
 * @return Object with generation state, suggestion, and handlers.
 */
export function useMetaDescription(): UseMetaDescriptionReturn {
	const localized = getLocalized();
	const metaKey = localized?.metaKey ?? 'wpai_meta_description';
	const seoPlugin = localized?.seoPlugin ?? null;
	const hasSeoPlugin = Boolean( seoPlugin );

	// The active SEO plugin decides how the description is written to and read from the
	// editor. The default adapter uses core/editor post meta; Yoast targets its own store.
	const adapter = useMemo( () => getAdapter( seoPlugin ), [ seoPlugin ] );

	const { editPost } = useDispatch( editorStore );
	const { removeNotice, createErrorNotice } = dispatch( noticesStore );

	const [ isGenerating, setIsGenerating ] = useState( false );
	const [ suggestion, setSuggestion ] =
		useState< MetaDescriptionSuggestion | null >( null );

	// Ref to the active AbortController so generation can be cancelled.
	const abortControllerRef = useRef< AbortController | null >( null );

	const ensureProviderAvailable = useCallback(
		() => ensureProvider( NOTICE_ID ),
		[]
	);

	const { postId, content, title, meta, currentDescription } = useSelect(
		( select ) => {
			const editor = select( editorStore );
			const currentMeta = editor.getEditedPostAttribute( 'meta' ) as
				| Record< string, string >
				| undefined;

			return {
				postId: editor.getCurrentPostId() as number,
				content: editor.getEditedPostContent(),
				title: editor.getEditedPostAttribute( 'title' ) as string,
				meta: currentMeta,
				currentDescription: adapter.read( select, { metaKey } ),
			};
		},
		[ adapter, metaKey ]
	);

	const minContentLength =
		localized?.minContentLength ?? MINIMUM_CONTENT_COUNT_DEFAULT;
	const isContentTooShort = ! hasMinimumContent( content, minContentLength );

	// Minimum-length requirement message, surfaced as the button tooltip when
	// the content is too short to generate from.
	const tooShortLabel = sprintf(
		/* translators: %d: minimum number of characters required. */
		__(
			'Meta Description generation will be available when the post content has at least %d characters.',
			'ai'
		),
		minContentLength
	);

	const abortGeneration = useCallback( () => {
		if ( abortControllerRef.current ) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
	}, [] );

	const generateDescription = useCallback( async () => {
		if ( ! ensureProvider( NOTICE_ID ) ) {
			return;
		}

		// Cancel any in-flight request before starting a new one.
		abortGeneration();

		const controller = new AbortController();
		abortControllerRef.current = controller;

		setIsGenerating( true );
		setSuggestion( null );

		// Clear any existing notices.
		removeNotice( NOTICE_ID );

		try {
			// Generate the meta description.
			const params: MetaDescriptionAbilityInput = {
				content,
				title,
				post_id: postId,
			};

			const response = await runAbility< MetaDescriptionAbilityResponse >(
				'ai/meta-description',
				params,
				{ signal: controller.signal }
			);

			if ( response?.description ) {
				setSuggestion( response.description );
			} else {
				createErrorNotice(
					__( 'No meta description suggestion was generated.', 'ai' ),
					{ id: NOTICE_ID, isDismissible: true }
				);
			}
		} catch ( error: any ) {
			// Silently ignore cancellations — the user intentionally stopped the request.
			if ( error?.name === 'AbortError' ) {
				return;
			}

			const message =
				typeof error === 'string'
					? error
					: error?.message ??
					  __( 'Failed to generate meta description.', 'ai' );

			createErrorNotice( message, {
				id: NOTICE_ID,
				isDismissible: true,
			} );
		} finally {
			// Only clear the generating state if this controller is still current
			// (it may have been replaced by a newer call to generateDescription).
			if ( abortControllerRef.current === controller ) {
				abortControllerRef.current = null;
			}
			setIsGenerating( false );
		}
	}, [ content, title, postId, removeNotice, createErrorNotice, abortGeneration ] );

	const applyDescription = useCallback(
		( text: string ) => {
			adapter.apply( text, { metaKey, meta, editPost } );
		},
		[ adapter, editPost, metaKey, meta ]
	);

	const clearSuggestion = useCallback( () => {
		setSuggestion( null );
	}, [] );

	return {
		isGenerating,
		suggestion,
		currentDescription,
		metaKey,
		hasSeoPlugin,
		isContentTooShort,
		tooShortLabel,
		ensureProviderAvailable,
		generateDescription,
		abortGeneration,
		applyDescription,
		clearSuggestion,
	};
}
