FrameCast for Mac
=================

The Frame Empire screen recorder.
Record. Share. Move on.
Needs a Mac with Apple Silicon (M1 or newer) and macOS 13.1 or later.


What is in this zip
-------------------
FrameCast.app    The app.
README.txt       This file.


Install
-------
1. Double-click the zip. You get FrameCast.app.
2. Drag FrameCast.app into your Applications folder.
3. You can delete the zip afterwards.


Open it the FIRST time
----------------------
macOS blocks apps that are not from the App Store the first time.
Do this once:

1. Open Applications and double-click FrameCast.
   macOS says it cannot be opened. Click Done (or OK).
2. Open System Settings, then Privacy & Security.
3. Scroll down. Next to "FrameCast was blocked", click Open Anyway.
4. Confirm with your password or Touch ID, then click Open.

From then on FrameCast opens normally.


Allow recording
---------------
The first time you record, macOS asks for permission:
  Screen Recording (needed), Microphone and Camera (only if you use them).
Click Allow. If you missed one: System Settings, Privacy & Security,
find the list (Screen Recording, Microphone or Camera) and switch FrameCast on.
macOS may ask you to quit and reopen FrameCast after that.


Your first recording
--------------------
1. Click the FrameCast icon in the menu bar at the top of the screen.
2. Choose what to record: the whole screen, one window, or an area.
3. Click Record.
4. Click the stop icon in the menu bar when you are done.
5. The recording opens. Trim it, then export it as a video file to share.

Recordings save to your own Mac. No login needed.


If something goes wrong
-----------------------
"FrameCast is damaged and cannot be opened"
  Open Terminal and paste this line, then press Return:
    xattr -dr com.apple.quarantine /Applications/FrameCast.app
  Then open FrameCast again.

Logs, if Andrei asks for them
  In Finder press Cmd + Shift + G and paste:
  ~/Library/Logs/uk.co.frameempire.framecast


Help
----
Message Andrei, or email hello@frameempire.co.uk with a screenshot.
