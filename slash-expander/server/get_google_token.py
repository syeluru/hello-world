"""One-time helper: sign in with Google and print a refresh token for the server.

Usage: python get_google_token.py path/to/client_secret.json
(Create an OAuth client of type "Desktop app" in Google Cloud Console first.)
"""

import sys

from google_auth_oauthlib.flow import InstalledAppFlow

from calendar_client import SCOPES

flow = InstalledAppFlow.from_client_secrets_file(sys.argv[1], SCOPES)
creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")
print("GOOGLE_CLIENT_ID=" + creds.client_id)
print("GOOGLE_CLIENT_SECRET=" + creds.client_secret)
print("GOOGLE_REFRESH_TOKEN=" + creds.refresh_token)
