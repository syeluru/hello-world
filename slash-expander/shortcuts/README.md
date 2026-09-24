# No-code alternative: an iOS Shortcut

If you'd rather not install a custom keyboard, a Shortcut can call the same server
and put the draft on your clipboard. You trigger it with the Action button, Back Tap
(Settings › Accessibility › Touch › Back Tap), Siri, or the share sheet, then paste.

Build it in the Shortcuts app:

1. **Get Contents of URL**
   - URL: `https://your-server.example.com/expand`
   - Method: `POST`
   - Headers: `Authorization` = `Bearer <EXPANDER_TOKEN>`
   - Request Body: JSON, `command` = `availability-tomorrow`
2. **Get Dictionary Value** `text` from *Contents of URL*
3. **Copy to Clipboard**
4. (Optional) **Show Notification** "Availability copied"

Name it "Availability tomorrow" and you can also say "Hey Siri, availability tomorrow".

The trade-off: you can't trigger it by typing `/availability-tomorrow` inline. Only the
keyboard extension in `../ios` can do that.
