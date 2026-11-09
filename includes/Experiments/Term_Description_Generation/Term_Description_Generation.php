<?php
/**
 * Category and tag description generation experiment.
 *
 * @package WordPress\AI
 */

declare( strict_types=1 );

namespace WordPress\AI\Experiments\Term_Description_Generation;

use WordPress\AI\Abilities\Term_Description_Generation\Term_Description_Generation as Ability;
use WordPress\AI\Abstracts\Abstract_Feature;
use WordPress\AI\Asset_Loader;
use WordPress\AI\Experiments\Experiment_Category;

// Exit if accessed directly.
defined( 'ABSPATH' ) || exit;

/**
 * Offers descriptions for review on existing category and tag edit screens.
 *
 * @since x.x.x
 */
class Term_Description_Generation extends Abstract_Feature {
	/**
	 * {@inheritDoc}
	 *
	 * @since x.x.x
	 */
	public static function get_id(): string {
		return 'term-description-generation';
	}

	/**
	 * {@inheritDoc}
	 *
	 * @since x.x.x
	 */
	protected function load_metadata(): array {
		return array(
			'label'       => __( 'Category and Tag Description Generation', 'ai' ),
			'description' => __( 'Suggests descriptions for categories and tags using their assigned posts.', 'ai' ),
			'category'    => Experiment_Category::ADMIN,
			'usage'       => array(
				'trigger'  => 'on_demand',
				'runs'     => __( 'When you click Generate description on a category or tag edit screen', 'ai' ),
				'sends'    => __( 'Saved term name and taxonomy, parent category name, and titles and text excerpts from up to five public, password-free posts assigned directly to the term', 'ai' ),
				'requests' => __( 'One request per click when eligible content exists', 'ai' ),
				'details'  => __( 'Review the suggestion, use it in the Description field, then click Update to save.', 'ai' ),
			),
		);
	}

	/**
	 * {@inheritDoc}
	 *
	 * @since x.x.x
	 */
	public function register(): void {
		add_action( 'wp_abilities_api_init', array( $this, 'register_abilities' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	/**
	 * Registers the generation ability.
	 *
	 * @since x.x.x
	 */
	public function register_abilities(): void {
		wp_register_ability(
			'ai/term-description-generation',
			array(
				'label'         => __( 'Category and Tag Description Generation', 'ai' ),
				'description'   => __( 'Generates a category or tag description for review without saving it.', 'ai' ),
				'ability_class' => Ability::class,
			)
		);
	}

	/**
	 * Loads controls only on supported term edit screens.
	 *
	 * @since x.x.x
	 *
	 * @param string $hook_suffix Current admin page.
	 */
	public function enqueue_assets( string $hook_suffix ): void {
		$screen = get_current_screen();
		if ( 'term.php' !== $hook_suffix || ! $screen || ! in_array( $screen->taxonomy, array( 'category', 'post_tag' ), true ) ) {
			return;
		}

		// Core has already resolved and authorized the term before this hook runs.
		global $tag;
		if ( ! $tag instanceof \WP_Term || ! current_user_can( 'edit_term', $tag->term_id ) ) {
			return;
		}

		Asset_Loader::enqueue_script( 'term-description-generation', 'experiments/term-description-generation', array( 'include_core_abilities' => true ) );
		Asset_Loader::enqueue_style( 'term-description-generation', 'experiments/term-description-generation', array( 'wp-components' ) );
		Asset_Loader::localize_script( 'term-description-generation', 'TermDescriptionGenerationData', array( 'termId' => $tag->term_id ) );
	}
}
