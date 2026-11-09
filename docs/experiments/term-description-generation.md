# Category and Tag Description Generation

## Summary

Suggests a short description explaining the scope of an existing category or tag, using its saved name, parent category, and a sample of assigned posts. This fills WordPress's standard Description field rather than creating a topic summary, narrative overview, or archive template.

## At a Glance

- **Type:** Experiment; off by default
- **Runs without a user action:** No
- **When it runs:** Click **Generate description** on an existing category or tag edit screen
- **Sent to your AI provider:** Saved term name and taxonomy, parent category name if present, and titles (up to 200 characters) and text excerpts (up to 1,000 characters) from up to five recent public, password-free posts assigned directly to the term; configured site/copy guidelines also apply
- **Requests and data:** One request per click when eligible source content exists; no background requests
- **Good to know:** Generation does not save or replace the existing description. Review/edit the suggestion, click **Use description**, and then click WordPress's **Update** button to save.

## Try it

1. Connect a text-generation provider in **Settings → Connectors**.
2. Enable **Category and Tag Description Generation** in **Settings → AI**.
3. Open **Posts → Categories** or **Posts → Tags** and edit a term with at least one public, password-free post assigned directly to it.
4. Click **Generate description** below Description. The existing field stays unchanged while you review the suggestion.
5. Edit the suggestion, then choose **Use description**, or **Discard** it. Using a suggestion replaces the current form field, including any unsaved edits in that field.
6. Click **Update** to persist the description normally.

Generation uses saved term details. Save changes to the name or parent before requesting a new suggestion. The preview exists only in this page view and is lost on navigation or reload. Provider failures preserve the description and any earlier suggestion.

## Scope and limitations

- Existing built-in categories and tags only; no Add New form, bulk actions, or custom taxonomies in this POC.
- Uses the latest five eligible `post` posts, not all content. Posts assigned only to child categories are excluded.
- Drafts, private posts, and password-protected posts are excluded. Sites with additional content-access rules should review whether public post excerpts are appropriate to send to their provider.
- Saved excerpts are preferred; otherwise text is extracted from saved post content. Blocks and shortcodes are not rendered or executed.
- Empty terms, or terms without eligible source text, return an error without a provider request.
- Does not change archive templates or introduce term metadata. How a description appears on the frontend depends on the theme.

## Developer reference

Ability: `ai/term-description-generation`. Input: `{ "term_id": 123 }`. Output: one plain-text string. Requires `edit_term` for the target term. REST uses the standard Abilities API authentication and nonce handling:

```text
POST /wp-json/wp-abilities/v1/abilities/ai/term-description-generation/run
{"input":{"term_id":123}}
```

The ability only generates; it never saves. It supports the standard `wpai_term_description_generation_system_instruction`, `wpai_term_description_generation_prompt`, and `wpai_term_description_generation_prompt_builder` filters, site/copy guidelines, and developer model preferences.

Related work: [Topic Pages #1136](https://github.com/WordPress/ai/issues/1136) and [PR #1306](https://github.com/WordPress/ai/pull/1306) generate current-topic summaries and historical overviews in separate storage. This experiment describes the term's content scope in the existing Description field.
