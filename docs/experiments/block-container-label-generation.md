# Block Container Label Generation

## Summary

The Block Container Label Generation experiment adds AI-assisted block labeling to the WordPress Block Editor. It surfaces a **Generate block labels** button in the Document Overview (List View) header and a **Generate label** button inside the block **Rename** modal. The experiment analyzes the text content of container blocks (such as `core/group` or `core/columns`) and generates descriptive labels.

## Overview

### For End Users

When enabled, the experiment provides two primary entry points in the Block Editor:

1. **Document Overview (List View) Header Action**:

   - Opening the Document Overview (List View) sidebar reveals a **Generate block labels** button in the header toolbar next to the close button.
   - Clicking it scans the document for container blocks that contain content.
   - The AI generates concise labels (e.g., "Customer Testimonials", "Pricing & Plan Comparison", "Hero Section") and applies them to each container block.
   - Each block shows a temporary busy state while its label is being generated.

2. **Block Rename Modal Action**:
   - Selecting any block and opening the **Rename** modal displays a **Generate label** button.
   - Clicking the button gathers the context, requests an AI-generated label, and populates the text input field.
   - Users can review, edit, or regenerate the label before clicking **Save**.

**Key Features:**

- Generates concise noun phrases capturing the block's primary purpose.
- Enforces a minimum content length (25 characters by default) to ensure sufficient context for meaningful summaries.
- Accessible UI feedback with progress counters.

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

## Using the Ability via REST API

### Endpoint

```text
POST /wp-json/wp-abilities/v1/abilities/ai/block-container-label-generation/run
```

### Authentication

You can authenticate using either:

1. **Application Password** (Recommended)
2. **Cookie Authentication with Nonce**

See [TESTING_REST_API.md](../TESTING_REST_API.md) for detailed authentication instructions.

### Request Examples

#### Example: Generate a label

```bash
curl -X POST "https://yoursite.com/wp-json/wp-abilities/v1/abilities/ai/block-container-label-generation/run" \
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

## Testing

### Manual Testing

1. **Enable the experiment:**

   - Go to `Settings -> AI`
   - Enable global AI features and toggle **Block Container Label Generation**
   - Ensure valid AI connector credentials are configured

2. **Generate block labels in List View:**

   - Create or edit a post or page and add container blocks with content (e.g., several `Group` blocks containing paragraphs or headings)
   - Open **Document Overview (List View)** in the top toolbar
   - Click the **Generate block labels** button in the List View sidebar header
   - Verify that container blocks without custom labels show a temporary busy state and update with concise, descriptive labels
   - Verify that container blocks with existing custom labels are preserved

3. **Generate label in Rename modal:**

   - Select a container block in the editor
   - Open the block options menu (three dots) and select **Rename**
   - Click the **Generate label** button inside the modal
   - Verify that the label input field populates with an AI-generated suggestion
   - Edit or click **Save** and verify the new label appears in List View

## Notes & Considerations

### Requirements

- Requires valid AI credentials and a text-generation-capable model
- Requires users with `edit_post` capability on the target post ID
