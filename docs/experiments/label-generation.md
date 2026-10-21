# Label Generation

## Summary

The Label Generation experiment adds AI-assisted block labeling to the WordPress Block Editor. It surfaces a **Generate block labels** button in the Document Overview (List View) header and a **Generate label** button inside the block **Rename** modal. Backed by the `ai/label-generation` Ability, the experiment analyzes the text content of container blocks (such as `core/group` or `core/columns`) and generates concise 3–6 word descriptive labels that are stored directly in each block's `metadata.name` attribute. This makes long, highly structured posts and pages much easier to skim and navigate in List View without altering any visible front-end content.

## Overview

### For End Users

When enabled, the experiment provides two primary entry points in the Block Editor:

1. **Document Overview (List View) Header Action**:

   - Opening the Document Overview (List View) sidebar reveals a **Generate block labels** button in the header toolbar next to the close button.
   - Clicking it scans the document for container blocks that contain content but lack a custom label.
   - The AI generates concise labels (e.g., "Customer Testimonials", "Pricing & Plan Comparison", "Hero Section") and applies them to each container block.
   - Each block shows a spinner and temporary busy state while its label is being generated.
   - Hand-crafted labels already assigned to blocks are preserved.

2. **Block Rename Modal Action**:
   - Selecting any block and opening the **Rename** modal (via the block settings toolbar or List View item menu) displays a **Generate label** button.
   - Clicking the button gathers the text from the block and its child blocks, requests an AI-generated label, and populates the text input field.
   - Users can review, edit, or regenerate the label before clicking **Save**.

**Key Features:**

- Generates concise 3–6 word noun phrases capturing the block's primary purpose.
- Operates on container blocks (`core/group`, `core/columns`, etc.) and their nested descendants.
- Saves generated labels to the standard WordPress block `metadata.name` attribute.
- Preserves existing custom block labels unless explicitly renamed in the Rename modal.
- Only affects editor navigation; no markup changes are rendered on the front end.
- Enforces a minimum content length (25 characters by default) to ensure sufficient context for meaningful summaries.
- Accessible UI feedback with progress counters and announcement notices.

### For Developers

The experiment consists of two main components:

1. **Experiment Class** (`WordPress\AI\Experiments\Label_Generation\Label_Generation`): Handles feature registration, editor asset enqueuing, and localized configuration.
2. **Ability Class** (`WordPress\AI\Abilities\Label_Generation\Label_Generation`): Implements prompt generation, validation, permission handling, and AI invocation via the WordPress Abilities API (`ai/label-generation`).

The ability can be called directly via the REST API for custom workflows, CLI scripts, or automated content migrations.

## Architecture & Implementation

### Key Hooks & Entry Points

The experiment class registers two primary actions:

- `wp_abilities_api_init` → `register_ability()`: Registers the `ai/label-generation` ability with the WordPress Abilities API.
- `admin_enqueue_scripts` → `enqueue_assets()`: Loads the frontend script and stylesheet on post editor screens (`post.php` and `post-new.php`).

Because the feature loader skips registration when an experiment is disabled, no assets or hooks are loaded when the experiment toggle is off.

### Assets & Data Flow

The frontend entry point is `src/experiments/label-generation/index.tsx`, compiled to `build-scripts/experiments/label-generation`. It registers a block editor plugin (`ai-label-generation`) that renders:

- `LabelGenerationListViewHeader`: Mounts into the Gutenberg List View sidebar header container (`.editor-list-view-sidebar__list-view-container`) using a React portal.
- `RenameModalWrapper`: Monitors the DOM for Gutenberg's block Rename modal, extracts the block's content, and renders the `RenameModalButton` inside the modal form.

Configuration is localized onto `window.aiLabelGenerationData`:

| Key                | Source                                             | Default | Description                                                                                    |
| ------------------ | -------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `enabled`          | `$this->is_enabled()`                              | `false` | Whether the experiment is currently enabled.                                                   |
| `minContentLength` | `get_min_content_length( 'label-generation', 25 )` | `25`    | Minimum content length (characters excluding whitespace) required to trigger label generation. |

### Candidate Collection & Traversal

In List View, `collectLabelCandidates()` recursively traverses the editor block tree:

- Traverses child blocks in bottom-first (leaf-first) order.
- Considers container blocks (`block.innerBlocks.length > 0`).
- Skips blocks that already have a non-empty `metadata.name` attribute.
- Verifies that the block's subtree text meets the `minContentLength` requirement.
- Generates labels sequentially, updating `metadata.name` via `@wordpress/block-editor`'s `updateBlockAttributes`.

### Input Schema

```php
array(
    'type'       => 'object',
    'properties' => array(
        'post_id' => array(
            'type'              => 'integer',
            'sanitize_callback' => 'absint',
            'description'       => 'The ID of the post to generate a label for.',
        ),
        'content' => array(
            'type'        => 'string',
            'description' => 'The block content to generate a label for.',
        ),
    ),
)
```

### Output Schema

```php
array(
    'type'        => 'string',
    'description' => 'The generated label for the post.',
)
```

### Permissions

The ability's `permission_callback()` verifies:

- **When `post_id` is supplied:**
  - Verifies the post exists; returns `post_not_found` otherwise.
  - Verifies `current_user_can( 'edit_post', $post_id )`; returns `insufficient_permissions` otherwise.
  - Verifies the post's post type has `show_in_rest` enabled; returns `false` otherwise.
- **When `post_id` is omitted:**
  - Verifies `current_user_can( 'edit_posts' )`; returns `insufficient_permissions` otherwise.

### Content Validation & Normalization

Content passed to the ability is normalized using `normalize_content()` (strips tags, shortcodes, and extra whitespace). If character count excluding spaces is below `get_min_content_length( 'label-generation', 25 )`, the ability returns a `content_too_short` error. The generated label is sanitized using `wp_kses_post()`.

## Using the Ability via REST API

### Endpoint

```text
POST /wp-json/wp-abilities/v1/abilities/ai/label-generation/run
```

### Authentication

You can authenticate using either:

1. **Application Password** (Recommended for external integrations / CLI)
2. **Cookie Authentication with Nonce** (For in-browser REST requests)

See [TESTING_REST_API.md](../TESTING_REST_API.md) for detailed authentication setup.

### Request Examples

#### Example 1: Generate a label from block content

```bash
curl -X POST "https://yoursite.com/wp-json/wp-abilities/v1/abilities/ai/label-generation/run" \
  -u "username:application-password" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "content": "Discover our flexible monthly subscription tiers, enterprise volume discounts, and 30-day money-back guarantee."
    }
  }'
```

**Response:**

```json
"Pricing and Plans"
```

#### Example 2: Generate a label associated with a post

```bash
curl -X POST "https://yoursite.com/wp-json/wp-abilities/v1/abilities/ai/label-generation/run" \
  -u "username:application-password" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "post_id": 42,
      "content": "Read what our customers have to say about our fast delivery and friendly support team."
    }
  }'
```

**Response:**

```json
"Customer Testimonials"
```

#### Example 3: Using JavaScript `runAbility` in the editor

```ts
import { runAbility } from '../../utils/run-ability';

const label = await runAbility< string >( 'ai/label-generation', {
  post_id: postId,
  content: blockTextContent,
} );
```

### Error Responses

The ability may return the following `WP_Error` codes:

| Error Code                 | HTTP Status | Description                                                                       |
| -------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `content_not_provided`     | 400         | No content was provided or content normalized to an empty string.                 |
| `content_too_short`        | 400         | The content character count (excluding spaces) is less than the required minimum. |
| `post_not_found`           | 404         | The specified `post_id` does not exist.                                           |
| `insufficient_permissions` | 403         | The current user lacks permission to edit the post or edit posts.                 |
| `no_results`               | 500         | The AI provider returned an empty response.                                       |
| `unsupported_model`        | 500         | No configured AI provider supports text generation.                               |

Example error response:

```json
{
  "code": "content_too_short",
  "message": "A minimum of 25 characters is required to generate a label.",
  "data": { "status": 400 }
}
```

## Extending the Experiment

### Customizing the System Instruction

The default prompt instructions reside in `includes/Abilities/Label_Generation/system-instruction.php`. You can modify tone, length, or phrasing rules dynamically using the scoped `wpai_label_generation_system_instruction` filter:

```php
add_filter(
    'wpai_label_generation_system_instruction',
    static function ( string $instruction ): string {
        return $instruction . "\nPrefer action-oriented verbs when labeling interactive or form blocks.";
    }
);
```

### Filtering User Prompts

You can inspect or modify the assembled prompt (`<content>...</content>`) before it is sent to the model using `wpai_label_generation_prompt`:

```php
add_filter(
    'wpai_label_generation_prompt',
    static function ( string $prompt ): string {
        // Append context or formatting constraints.
        return $prompt;
    }
);
```

### Customizing the Prompt Builder

Use `wpai_label_generation_prompt_builder` to customize the `WP_AI_Client_Prompt_Builder` instance before text generation (e.g., to adjust temperature, model preference, or request options):

```php
add_filter(
    'wpai_label_generation_prompt_builder',
    static function ( \WP_AI_Client_Prompt_Builder $builder ): \WP_AI_Client_Prompt_Builder {
        return $builder->using_temperature( 0.3 );
    }
);
```

### Adjusting the Minimum Content Length

By default, blocks must contain at least 25 characters (excluding spaces) to be eligible for label generation. You can adjust this threshold site-wide:

```php
add_filter(
    'wpai_min_content_length',
    static function ( int $length, string $feature ): int {
        if ( 'label-generation' === $feature ) {
            return 50; // Require at least 50 characters.
        }
        return $length;
    },
    10,
    2
);
```
