<?php
/**
 * Term description generation ability.
 *
 * @package WordPress\AI
 */

declare( strict_types=1 );

namespace WordPress\AI\Abilities\Term_Description_Generation;

use WP_Error;
use WP_Term;
use WordPress\AI\Abstracts\Abstract_Ability;
use WordPress\AI\Experiments\Term_Description_Generation\Term_Description_Generation as Experiment;

use function WordPress\AI\normalize_content;

/**
 * Generates a description without changing the term.
 *
 * @since x.x.x
 */
class Term_Description_Generation extends Abstract_Ability {
	/**
	 * {@inheritDoc}
	 *
	 * @since x.x.x
	 */
	protected function guideline_categories(): array {
		return array( 'site', 'copy' );
	}

	/**
	 * {@inheritDoc}
	 *
	 * @since x.x.x
	 */
	protected function input_schema(): array {
		return array(
			'type'                 => 'object',
			'properties'           => array(
				'term_id' => array(
					'type'        => 'integer',
					'minimum'     => 1,
					'description' => __( 'The category or tag to describe.', 'ai' ),
				),
			),
			'required'             => array( 'term_id' ),
			'additionalProperties' => false,
		);
	}

	/**
	 * {@inheritDoc}
	 *
	 * @since x.x.x
	 */
	protected function output_schema(): array {
		return array(
			'type'      => 'string',
			'minLength' => 1,
		);
	}

	/**
	 * {@inheritDoc}
	 *
	 * @since x.x.x
	 */
	protected function meta(): array {
		return array( 'show_in_rest' => true );
	}

	/**
	 * Resolves only the built-in taxonomies supported by this experiment.
	 *
	 * @since x.x.x
	 *
	 * @param int $term_id Term ID.
	 * @return \WP_Term|\WP_Error Term or error.
	 */
	private function get_term( int $term_id ) {
		$term = get_term( $term_id );
		if ( ! $term instanceof WP_Term || ! in_array( $term->taxonomy, array( 'category', 'post_tag' ), true ) ) {
			return new WP_Error( 'invalid_term', __( 'Choose an existing category or tag.', 'ai' ) );
		}
		return $term;
	}

	/**
	 * {@inheritDoc}
	 *
	 * @since x.x.x
	 */
	protected function permission_callback( $input ) {
		$term = $this->get_term( (int) ( $input['term_id'] ?? 0 ) );
		if ( is_wp_error( $term ) ) {
			return $term;
		}
		if ( ! current_user_can( 'edit_term', $term->term_id ) ) {
			return new WP_Error( 'insufficient_capabilities', __( 'You do not have permission to generate a description for this term.', 'ai' ) );
		}
		return true;
	}

	/**
	 * {@inheritDoc}
	 *
	 * @since x.x.x
	 */
	protected function execute_callback( $input ) {
		$term = $this->get_term( (int) $input['term_id'] );
		if ( is_wp_error( $term ) ) {
			return $term;
		}

		// Query only public, password-free posts assigned directly to this term.
		// phpcs:ignore WordPressVIPMinimum.Functions.RestrictedFunctions.get_posts_get_posts -- suppress_filters is explicitly false below.
		$posts = get_posts(
			array(
				'post_type'           => 'post',
				'post_status'         => 'publish',
				'has_password'        => false,
				'posts_per_page'      => 5,
				'orderby'             => array(
					'date' => 'DESC',
					'ID'   => 'DESC',
				),
				'ignore_sticky_posts' => true,
				'suppress_filters'    => false,
				// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query -- Bounded query for directly assigned term posts.
				'tax_query'           => array(
					array(
						'taxonomy'         => $term->taxonomy,
						'field'            => 'term_id',
						'terms'            => $term->term_id,
						'include_children' => false,
					),
				),
			)
		);
		$articles = array();
		foreach ( $posts as $post ) {
			// Respect sites that make the built-in post type non-public.
			if ( ! is_post_publicly_viewable( $post ) ) {
				continue;
			}
			$title   = $this->plain_text( $post->post_title, 200 );
			$excerpt = $this->plain_text( '' !== trim( $post->post_excerpt ) ? $post->post_excerpt : $post->post_content, 1000 );
			if ( '' === $title && '' === $excerpt ) {
				continue;
			}

			$articles[] = array(
				'title'   => $title,
				'excerpt' => $excerpt,
			);
		}
		if ( empty( $articles ) ) {
			return new WP_Error( 'insufficient_content', __( 'Assign at least one public, password-free post with text to this category or tag before generating a description.', 'ai' ) );
		}

		$parent  = $term->parent ? get_term( $term->parent, $term->taxonomy ) : null;
		$context = array(
			'name'     => $this->plain_text( $term->name, 200 ),
			'taxonomy' => $term->taxonomy,
			'parent'   => $parent instanceof WP_Term ? $this->plain_text( $parent->name, 200 ) : '',
			'articles' => $articles,
		);
		$prompt  = $this->filter_prompt(
			"Describe the scope of this category or tag using the following reference data:\n" . wp_json_encode( $context ),
			$context
		);
		$result  = $this->generate_description( $prompt );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$description = trim( sanitize_textarea_field( $result ), " \t\n\r\0\x0B\"'" );
		if ( '' === $description ) {
			return new WP_Error( 'no_results', __( 'No description was generated. Please try again.', 'ai' ) );
		}
		return $description;
	}

	/**
	 * Normalizes saved text without rendering blocks or executing shortcodes.
	 *
	 * @since x.x.x
	 *
	 * @param string $text Saved text.
	 * @param int    $limit Maximum number of characters.
	 * @return string Bounded plain text.
	 */
	private function plain_text( string $text, int $limit ): string {
		return mb_substr( normalize_content( $text ), 0, $limit );
	}

	/**
	 * Generates one description using the configured provider.
	 *
	 * @since x.x.x
	 *
	 * @param string $prompt Assembled prompt.
	 * @return string|\WP_Error Generated text or provider error.
	 */
	protected function generate_description( string $prompt ) {
		$builder = wp_ai_client_prompt( $prompt )->using_system_instruction( $this->get_system_instruction() );
		$builder = $this->filter_prompt_builder( $builder, Experiment::class, array(), $prompt );
		$builder = $this->ensure_text_generation_supported( $builder, __( 'Connect a provider that supports text generation in Settings → Connectors.', 'ai' ) );
		if ( is_wp_error( $builder ) ) {
			return $builder;
		}
		return $builder->generate_text();
	}
}
