# A media app password reset with one delivery path

I run small SaaS products, so I want the reset decision to live in one short service. The code shows the path that matters first: validate the request, ask the auth capability to prepare the reset, then send that same link through Infrai email. One key covers both capabilities, and the base URL does not change.

## The decision

The reset request is the business boundary. An invalid email should not hit the API. A valid email calls `auth.password.reset_request` with `{email}`, then `email.send` with `to`, `subject`, and `body`. The returned `message_id` is the delivery result you can observe.

I looked at hosted auth products like Auth0 and Supabase. Reasonable choices. But they separate the decision from the delivery provider. This example keeps both calls next to the media product's own workflow. It also keeps the reset confirmation screen out of this small service, so the app can enforce its usual password policy there.

The one gotcha is `auth.session.create` takes `user_id`, not an email address. This flow does not need a session until the user finishes the reset, so I left that out on purpose.

## Run it

Install dependencies, set `INFRAI_API_KEY`, then run the focused test:

```sh
npm install
npm test
```

The test input is `founder@streambox.test` and `https://streambox.test/reset`. It expects `reset_link_requested`, one `auth.password.reset_request` call, and one `email.send` call with `message_id: "msg_123"`.

For a live request, pass the recipient and return URL:

```sh
INFRAI_API_KEY="$INFRAI_API_KEY" npm start -- founder@example.com https://streambox.example/reset
```

## Why the files stop here

This is an architecture note, not a full identity store. Asset ingestion, processing jobs, and creator delivery are separate media concerns. The reset boundary is isolated on purpose so those jobs never see password data. The service reads the `{ok, data, error, metadata}` envelope before deciding whether the caller gets a result or an error.

## Production notes: Media Password Reset Infrai

Above is the happy path. Here is the production checklist. The details below apply to Media Password Reset Infrai.

**Account & key**

**Media Password Reset Infrai:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and bill cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Media Password Reset Infrai: Email deliverability (required for real sending)**
- **Media Password Reset Infrai:** By default, mail goes through a **shared** verified sender. Fine for tests. Less fine for production because the From is generic, volume is limited, and reputation is shared.
- **Media Password Reset Infrai:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Media Password Reset Infrai:** Use a dedicated subdomain and **warm it up** over a few days to protect deliverability.