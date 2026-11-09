/**
 * WordPress dependencies
 */
import domReady from '@wordpress/dom-ready';
import { createRoot, useRef, useState } from '@wordpress/element';
import { Button, Notice, TextareaControl } from '@wordpress/components';
import { speak } from '@wordpress/a11y';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { runAbility } from '../../utils/run-ability';
import { getErrorMessage } from '../../utils/errors';
import './index.scss';

declare global {
	interface Window {
		aiTermDescriptionGenerationData?: { termId: number };
	}
}

/**
 * Generate and review a suggestion before using the standard term form.
 *
 * @param props             Component properties.
 * @param props.termId      Saved term ID.
 * @param props.description Core's existing description field.
 */
function DescriptionSuggestion( {
	termId,
	description,
}: {
	termId: number;
	description: HTMLTextAreaElement;
} ) {
	const [ isGenerating, setIsGenerating ] = useState( false );
	const [ suggestion, setSuggestion ] = useState< string | null >( null );
	const [ error, setError ] = useState( '' );
	const inFlight = useRef( false );
	const generateButton = useRef< HTMLButtonElement >( null );

	const generate = async () => {
		if ( inFlight.current ) {
			return;
		}
		inFlight.current = true;
		setIsGenerating( true );
		setError( '' );
		try {
			const result = await runAbility< string >(
				'ai/term-description-generation',
				{ term_id: termId }
			);
			if ( typeof result !== 'string' || ! result.trim() ) {
				throw new Error(
					__(
						'No description was generated. Please try again.',
						'ai'
					)
				);
			}
			setSuggestion( result.trim() );
			speak( __( 'Description suggestion ready for review.', 'ai' ) );
		} catch ( caught ) {
			setError( getErrorMessage( caught ) );
		} finally {
			inFlight.current = false;
			setIsGenerating( false );
		}
	};

	const useDescription = () => {
		if ( ! suggestion?.trim() ) {
			return;
		}
		description.value = suggestion.trim();
		description.dispatchEvent( new Event( 'input', { bubbles: true } ) );
		description.dispatchEvent( new Event( 'change', { bubbles: true } ) );
		setSuggestion( null );
		description.focus();
		speak(
			__(
				'Description added to the form. Click Update to save your changes.',
				'ai'
			)
		);
	};

	return (
		<div className="ai-term-description-generation">
			<Button
				__next40pxDefaultSize
				ref={ generateButton }
				type="button"
				variant="secondary"
				isBusy={ isGenerating }
				disabled={ isGenerating }
				onClick={ generate }
			>
				{ isGenerating
					? __( 'Generating description…', 'ai' )
					: __( 'Generate description', 'ai' ) }
			</Button>
			<p className="description">
				{ __(
					'Uses the saved name, parent category, and up to five public posts. Review the suggestion before using it.',
					'ai'
				) }
			</p>
			{ error && (
				<Notice status="error" isDismissible={ false }>
					{ error }
				</Notice>
			) }
			{ suggestion !== null && (
				<div className="ai-term-description-generation__preview">
					<TextareaControl
						label={ __( 'Suggested description', 'ai' ) }
						value={ suggestion }
						onChange={ setSuggestion }
						disabled={ isGenerating }
						help={ __(
							'Using this suggestion replaces the Description field. Click Update to save it.',
							'ai'
						) }
						__nextHasNoMarginBottom
					/>
					<div className="ai-term-description-generation__actions">
						<Button
							__next40pxDefaultSize
							type="button"
							variant="primary"
							disabled={ isGenerating || ! suggestion.trim() }
							onClick={ useDescription }
						>
							{ __( 'Use description', 'ai' ) }
						</Button>
						<Button
							__next40pxDefaultSize
							type="button"
							variant="tertiary"
							disabled={ isGenerating }
							onClick={ () => {
								setSuggestion( null );
								generateButton.current?.focus();
							} }
						>
							{ __( 'Discard', 'ai' ) }
						</Button>
					</div>
				</div>
			) }
		</div>
	);
}

domReady( () => {
	const termId = Number( window.aiTermDescriptionGenerationData?.termId );
	const description =
		document.querySelector< HTMLTextAreaElement >( '#description' );
	if (
		! termId ||
		! description ||
		document.getElementById( 'ai-term-description-generation' )
	) {
		return;
	}
	const container = document.createElement( 'div' );
	container.id = 'ai-term-description-generation';
	description.after( container );
	createRoot( container ).render(
		<DescriptionSuggestion termId={ termId } description={ description } />
	);
} );
