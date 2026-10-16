FrameCast for macOS
===================

Internal screen recorder for the Frame Empire team.
Record. Share. Move on.


What is in this zip
-------------------
FrameCast.app  — the application. That is all you need.


Install
-------
1. Double-click FrameCast-mac.zip to unzip it. You will see FrameCast.app.
2. Drag FrameCast.app into your /Applications folder.
3. Delete the zip when you are done. Keep the app in /Applications.


Open the app for the FIRST TIME ONLY
------------------------------------
macOS does not know who signed this app so a plain double-click will refuse
to open it. Do this once:

1. Open your /Applications folder (Finder sidebar, Applications).
2. Right-click FrameCast.app.
3. Click Open.
4. A popup appears saying "FrameCast cannot be verified". Click Open.

After that one time you can open FrameCast normally.


Grant permissions
-----------------
The first time you record, macOS will ask for permission to capture:
  - Your screen (Screen Recording)
  - Your microphone, if you turn one on
  - Your camera, if you turn one on

Click Allow on every prompt. If you miss one, open System Settings,
go to Privacy & Security, find FrameCast in each list, and switch it on.


Making your first recording
---------------------------
1. Click the FrameCast icon in your menu bar (purple square with an F).
2. Pick what to capture: Full Screen, Window, or Area.
3. Click Record.
4. When finished, click the Stop button in the menu bar.
5. The recording opens for review. From there you can share, trim, and export.


Trouble
-------
"The app is damaged and cannot be opened"
  Run this once in Terminal:
    xattr -d com.apple.quarantine /Applications/FrameCast.app
  Then open the app normally.

"FrameCast will damage your computer. Move to Bin."
  System Settings → Privacy & Security → scroll down to "FrameCast was blocked" → Open Anyway.

Logs for debugging
  ~/Library/Logs/uk.co.frameempire.framecast/


Help
----
Message Andrei. Or email hello@frameempire.co.uk with a screenshot and a short description.
