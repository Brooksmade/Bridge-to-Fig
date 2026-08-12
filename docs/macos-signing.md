# macOS signing and notarization

The macOS release build has to clear two separate Apple gates, and they fail independently:

- **Code signing** proves the app came from you. It uses a *Developer ID Application* certificate
  exported from your Mac. This works offline and keeps working even if your Apple account lapses,
  because the certificate is already issued.
- **Notarization** uploads the signed app to Apple, which scans it and issues a ticket. Without
  that ticket, Gatekeeper refuses to open the app and the only way past it is a Terminal command —
  not something you can ask an end user to do. Notarization needs live credentials and an active
  paid Developer Program membership.

Because the two are independent, the usual failure looks confusing: the build signs the app
perfectly and then dies at notarization. That means the certificate is fine and the *credentials*
are not. Don't go re-exporting certificates when notarization fails.

## The secrets

All of these live in
[Settings → Secrets and variables → Actions](https://github.com/Brooksmade/Bridge-to-Fig/settings/secrets/actions).
GitHub secrets are write-only — you can never read one back, so if you are unsure what a value is,
replace it rather than guess.

| Secret | What it is | Used for |
|---|---|---|
| `APPLE_CERTIFICATE` | base64 of the `.p12` exported from Keychain | Signing |
| `APPLE_CERTIFICATE_PASSWORD` | the password you set when exporting that `.p12` | Signing |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: Nayhan Brooks (3KXZTGLBXQ)` | Signing |
| `APPLE_TEAM_ID` | `3KXZTGLBXQ` | Both |
| `APPLE_API_KEY_P8` | base64 of the App Store Connect `.p8` key | Notarization |
| `APPLE_API_KEY_ID` | the 10-character Key ID | Notarization |
| `APPLE_API_ISSUER` | the Issuer UUID | Notarization |
| `APPLE_ID` | your Apple ID email | Notarization (legacy fallback) |
| `APPLE_PASSWORD` | an app-specific password | Notarization (legacy fallback) |

`APPLE_CERTIFICATE` and `APPLE_CERTIFICATE_PASSWORD` are a matched pair. Changing one without the
other breaks the build — that is the single most common self-inflicted failure here.

`APPLE_CERTIFICATE_PASSWORD` and `APPLE_PASSWORD` are unrelated despite the similar names. The
first unlocks a file; the second authenticates to Apple. Putting an app-specific password into
`APPLE_CERTIFICATE_PASSWORD` breaks signing while leaving notarization just as broken as before.

## Notarization credentials: use an API key

There are two ways to authenticate. `.github/workflows/release.yml` prefers the API key whenever
`APPLE_API_KEY_P8` is set, and blanks `APPLE_ID` and `APPLE_PASSWORD` in that case so only one path
is ever live.

**Prefer the App Store Connect API key.** App-specific passwords are silently revoked every time
the Apple ID account password changes. Nothing tells you; the next release just fails with a 401.
API keys do not expire on password changes, are not tied to 2FA, and are what Apple intends for CI.

### Creating the API key

1. Go to [App Store Connect → Integrations → App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
2. Select the **Team Keys** tab — not Individual Keys
3. **+** → name it `bridge-to-fig-notarize` → **Access: Developer** → **Generate**
4. **Download** the `.p8`. Apple allows this exactly once; if you lose it, revoke the key and make
   a new one
5. Note the **Key ID** (10 characters, in the key's row) and the **Issuer ID** (a UUID above the
   table)

### Storing it

```bash
base64 -i ~/Downloads/AuthKey_XXXXXXXXXX.p8 | tr -d '\n' | pbcopy
```

Then confirm the clipboard actually took it before pasting — a silent clipboard failure has cost
more than one release here:

```bash
pbpaste | wc -c
```

Set `APPLE_API_KEY_P8` to that value, `APPLE_API_KEY_ID` to the Key ID, and `APPLE_API_ISSUER` to
the Issuer UUID.

The workflow decodes the key and checks it begins with a PEM header, so a truncated paste fails in
the first thirty seconds with a clear message instead of six minutes later as a generic
notarization error.

## The signing certificate

You only need to redo this if signing itself fails.

### Finding the right certificate

Your Mac has more than one, and only one of them can sign a distributable app:

```bash
security find-identity -v -p codesigning
```

```
1) ... "Apple Development: Nayhan Brooks (7ZU9U2FWZ8)"         ← wrong, cannot distribute
2) ... "Developer ID Application: Nayhan Brooks (3KXZTGLBXQ)"  ← this one
```

Picking the wrong one produces this at build time:

```
certificate from APPLE_CERTIFICATE "Apple Development: ..." does not match provided identity
```

### Exporting it

On macOS 26 Keychain Access still exists but was moved out of `/System/Applications/Utilities/`,
so Spotlight and Launchpad no longer find it:

```bash
open "/System/Library/CoreServices/Applications/Keychain Access.app"
```

1. Sidebar → **login** → category **My Certificates**
2. Select **`Developer ID Application: Nayhan Brooks (3KXZTGLBXQ)`**
3. Expand it with the triangle and confirm a **private key** sits underneath. Without the key the
   export is useless
4. Right-click → **Export…** → format **Personal Information Exchange (.p12)** → save to Desktop
5. Set a password — this becomes `APPLE_CERTIFICATE_PASSWORD`. Save it in a password manager
6. macOS then asks for your Mac login password to authorize the export. That one is local and goes
   into no secret

Verify you exported the right certificate before uploading anything:

```bash
openssl pkcs12 -in ~/Desktop/Certificates.p12 -nokeys -clcerts -legacy | openssl x509 -noout -subject
```

The subject must contain `Developer ID Application` and `3KXZTGLBXQ`.

Then encode, confirm, and upload:

```bash
base64 -i ~/Desktop/Certificates.p12 | tr -d '\n' | pbcopy
pbpaste | wc -c    # expect a few thousand characters, starting MIIM
```

Update `APPLE_CERTIFICATE` and `APPLE_CERTIFICATE_PASSWORD` **together**, then delete the file — it
contains your private key:

```bash
rm ~/Desktop/Certificates.p12
```

## Check before you tag

A release build takes about twelve minutes and consumes a version number, because a pushed tag
cannot be moved. Verify credentials locally first.

For an API key:

```bash
xcrun notarytool history --key ~/Downloads/AuthKey_XXXXXXXXXX.p8 --key-id KEY_ID --issuer ISSUER_UUID
```

For an Apple ID:

```bash
xcrun notarytool history --apple-id EMAIL --team-id 3KXZTGLBXQ --password APP_SPECIFIC_PASSWORD
```

Either printing your notarization history means the credentials work and the release will get past
notarization.

## Troubleshooting

Read the error text rather than guessing — each of these has a distinct cause.

| Symptom | Cause | Fix |
|---|---|---|
| `401. Invalid credentials` | Authentication failed outright. The app-specific password is wrong or has been revoked | Switch to an API key, or re-enter `APPLE_ID` and `APPLE_PASSWORD` from values you have just verified with `notarytool` |
| `403` | Authentication *succeeded*, authorization failed | Accept the updated Program License Agreement at [App Store Connect → Agreements](https://appstoreconnect.apple.com/agreements), and confirm the membership is active |
| `certificate ... does not match provided identity` | `APPLE_CERTIFICATE` holds the wrong certificate | Re-export *Developer ID Application*, not *Apple Development* |
| Certificate import step fails | `APPLE_CERTIFICATE_PASSWORD` does not match the `.p12` in `APPLE_CERTIFICATE` | Re-export and update both together |
| Signing works, notarization fails | Normal and expected — they are independent | Leave the certificate alone; fix the credentials |
| Certificate valid until 2031 but notarization still fails | Certificate expiry is not membership status. A certificate outlives a lapsed membership | Check membership at [developer.apple.com/account](https://developer.apple.com/account) |

A 401 locally and a 403 in CI, or the reverse, means the two are being handed *different*
credentials — the secret does not contain what you tested with.

## If notarization has to wait

Removing `APPLE_API_KEY_P8`, `APPLE_ID`, and `APPLE_PASSWORD` makes the build sign without
notarizing, which produces a DMG. Understand the cost before doing it: Gatekeeper blocks an
un-notarized download, and the only way past is `xattr -cr` in Terminal. That is not something you
can reasonably ask a designer to do, so treat it as a last resort rather than a shortcut.
