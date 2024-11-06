# 1.0.12

### Updates
- Updating plugin to newest Obsidian recommendations https://docs.obsidian.md/oo24/plugin.
- Transition to Biome from EsLint and Prettier.
- The internal command names have been renamed. Any plugins using these internal command names will need to be updated.

# 1.0.11

Fixes:
- Problem with bookmarks to DNPTODAY and DNPTOMORROW

# 1.0.10

Fixes:

- Bad link to online help corrected [#75](https://github.com/TfTHacker/obsidian42-text-transporter/issues/75)
- Blockembeds were not working with callouts [#72](https://github.com/TfTHacker/obsidian42-text-transporter/issues/72)
- If a file conatined a ; in its name, it would error out for some commands. [#64](https://github.com/TfTHacker/obsidian42-text-transporter/issues/64)
- If a custom Alias placeholder was defined, it was not being used in the Replace link with text & alias command [#68](https://github.com/TfTHacker/obsidian42-text-transporter/issues/68)

# 1.0.7

- Removed from settings ability to remove icon from ribbon bar. This feature is now native to Obsidian and the plug doesn't need to manage it.
- Removed debugging toggle from settings. In the end, this wasn't useful for troubleshooting. Let us apply the KISS principle.
- Dependencies updated

# 1.0.6

- Dependencies updated
- Cleaned up file names
- Added a GitHub action to automate the release process

# 1.0.4

- New: DNPTOMORROW for templating. Great code contribution (https://github.com/TfTHacker/obsidian42-text-transporter/pull/65). Thank you @bwydoogh.
- Updated project dependencies and updated to latest esbuild process

# 1.0.3

Fixes:

- Problem with Quick Capture not working if there isn't an open document
- Fixed images in README.md
