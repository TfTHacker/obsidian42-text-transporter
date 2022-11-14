# Bookmarks
Bookmarks are shortcuts to files in your vault. You can have multiple bookmarks defined in settings.
Bookmark is made up of the following parameters on one line:
+ File Name seperated by semicolon ; then the command
+ Command can be one of the following:
  + TOP - for top of the file
  + BOTTOM - for the bottom of the file
  + the text on a line in your target file. If you provide this as the location, all transporter operations will happen from the line after the location

### Examples
+ ACTIONS_List.md;# Next Actions ----------
  + In the ACTIONS_List file, at the line with "# Next Actions ----------"
+ books/toRead.md;TOP
  + In the folder books, in a file called toRead.md, interact with the line at the top

# Daily Notes Pages
Instead of a file name, you can use DNPTODAY. This will then use today's Daily Note Page as the bookmark page. The commands form above are supported.

### Examples
+ DNPTODAY;TOP
  + Todays Daily note page, at the top of the file
+ DNPTODAY;BOTTOM 
  + Todays Daily note page, at the bottom of the file
+ DNPTODAY;Next Actions ==== 
  + Todays Daily note page, at the location of the file with the line "Next Actions ===="

# Context menu
+ For quickly using a bookmark, add a * to the beginning of the bookmark line. This will create two context menu commands:
  + Copy to Bookmark
  + Push to bookmark

### Examples
Using some of the examples above, not changing their behavior except they will appear in the context menu:
+ *ACTIONS_List.md;# Next Actions ----------
+ *DNPTODAY;TOP

# Managing Bookmarks
In addition to managing bookmarks in settings, there are three command palette commands that you can use. These commands let you create quickly new bookmarks, delete existing bookmarks, and even open a bookmark directly. Command palette commands:
-  Add bookmark from current file/location
-  Open bookmarked file
-  Remove a bookmark from the bookmarks colllection
