# Contact page configuration

The demo contains fictional phone/email/hours, an unconfirmed address and disabled messenger buttons. The booking form and Formspree integration are unchanged. No Google API key is invented or required by the selected Share/Embed iframe.

## Google Maps

`contacts-map.js` stores the configuration in one `config` object. The default `embedUrl` is an existing Google Share/Embed URL for **Kyiv as a city**, copied unchanged from the [published Kyiv city embed](https://kyiv.qaday.org/kyiv-qaday-2021/). It does not identify a dental clinic. Its place ID and city label refer to Kyiv; do not label that geographic selection as the clinic's position. The external Maps link opens an unselected city viewport.

Google's [Share/Embed instructions](https://support.google.com/maps/answer/7101463?hl=en) describe obtaining the iframe. Alternatively, the [Maps Embed API](https://developers.google.com/maps/documentation/embed/embedding-map) supports a `view` mode without markers but requires the client's valid, restricted Google Cloud API key. Do not insert a dummy key.

The iframe is created only after the visitor selects “Показати карту”. Until then, no Google request or preconnect is made. The cover is a local decorative illustration, not a real map. The frame reserves its dimensions, has a descriptive title, `loading="lazy"`, a strict-origin referrer policy and fullscreen support. The page keeps an external Google Maps link as a fallback. A 15-second timeout and iframe error allow retrying; a cross-origin iframe load event cannot prove that Google's internal application rendered correctly.

### Replace with the real client's location

1. Verify the full address and Google Maps place with the client.
2. Open that place in Google Maps → Share → Embed a map → Copy HTML. Copy only the iframe's `src` into `config.embedUrl`.
3. Set `config.address` to the verified full address and `config.placeUrl` to the actual Google Maps place URL.
4. Set `config.directionsUrl` to an actual Google Maps directions URL for that address or Place ID. The “Прокласти маршрут” link is shown only when both the address and directions URL are configured.
5. Update the demo note, city heading and schedule in `contacts.html`; check the marker and route manually on phone and desktop.

No real address or clinic marker is configured in this demo.

## Phone, email and messengers

Replace the phone and email text in `contacts.html` only with confirmed details. Then explicitly change their plain text to `tel:` / `mailto:` links if wanted. Automatic contact detection is currently disabled on this page.

Set `config.telegramUrl` to a verified `https://t.me/...` address and `config.viberUrl` to the owner's verified `viber:` deep link. Empty values preserve the disabled buttons. The script validates the scheme (and Telegram host) before replacing a disabled button with a link. Update the messenger demo note after real configuration.

## Checks and limits

Local browser checks cover responsive cards, keyboard controls, deferred iframe creation, title/lazy attributes, iframe load/error/timeout lifecycle with an intercepted Google response, external fallback, disabled demo contacts and the unchanged form using intercepted Formspree requests. No real form submission is sent.

The executor's network policy does not allow Google Maps hosts, so a live interactive Google map cannot be rendered here. The embed source is a genuine published Google Share/Embed URL; actual Google tiles, gestures and provider availability must be checked from the Cloudflare preview on an unrestricted connection. Do not describe a mocked iframe lifecycle test as a successful live Google Maps render.
