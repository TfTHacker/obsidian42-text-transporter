# Text Transporter - advanced text management for Obsidian

Text Transporter you'll know if you need it :-). If you are a text ninja! Keyboard lover!

Text Transporter allows you to quickly move content around your vault, from one file to the next, without leaving the file you are working on.

In addition, it makes it easy to work with block references in yours vault.

Check out this quick video to see what it is all about:

<a href="https://www.loom.com/share/6968895a4a7244acbce071068152aa21" target="_blank">
    <img style="max-width:300px;" src="https://cdn.loom.com/sessions/thumbnails/6968895a4a7244acbce071068152aa21-with-play.gif">
</a>

## Block Reference Commands

*  Add block ref ID's to selection and Copy them to clipboard
*  Copy embeded block reference
*  Copy embeded alias block reference
*  Replace a link with its original text (via context menu or CP All Commands)
*  Replace a link with its original text and alias (via context menu or CP All Commands)

## Transporter Commands - Copy, Push, Pull 

*  Copy line/selection to another file
*  Push line/selection to another file
*  Push line/selection to another file as Block Ref
*  Copy line(s) from another file
*  Pull line(s) from another file
*  Pull line(s) from another file as block references
*  Modifier keys in the file suggester
  + Press Ctrl (or Meta key) when clicking on an item and when the transport command is performed, the target file will be opened 
  + Press Shift when clicking on a bookmark will continue the suggester process into selecting lines from the target file, but the first line will be based on the bookmark location 

## Selection commands

*  Select current line
*  Select block - previous
*  Select block - next
*  Select current line and expand up into previous block
*  Select current line and expand down into next block

# Quick Capture
* Opens a form where you can type in text and then quickly capture it to a file in your vault. The Quick Capture screen accepts enters for new lines. Ctrl+Enter will click the capture button.

## Boookmarks

* Bookmkarks are shortcuts to files in your vault. You can have multiple bookmarks defined in settings.
* See this page for more details: [Bookmarks help](README-Bookmarks.md)

# Manual installation 
* Go to the releases page of this repository and find the most current release.
* Download the 3 files main.js, manifest.json, and styles.css at the bottom of the release page.
* Open your Obsidian Vault folder location on your computer (however you normally do with your Operating System)
* You should see a folder in your vault called .obsidian ... open that ... and then open the plugins folder within it. (Obsidian Vault\.obsidian\plugins)
* Create a new folder within this plugins folder and name it whatever you want. Something like "obsidian-text-transporter" for example.
* Copy the files that you downloaded into this new "obsidian-text-transporter" plugin folder.
* Open Obsidian and go to Settings > Community Plugins ... Turn OFF Safe Mode if it is currently on
* You then will see a section called "Installed plugins". Click the refresh button to the right.
* This plugin should now show up. Now simply Enable it with the toggle to the right of it.
