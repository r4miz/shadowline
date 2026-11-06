// Single place to edit the public site's identity and contact details.
// Keep `name` in sync with src/lib/brand.ts in the app.
//
// TODO (owner): replace the placeholder contact details before launch.
export const site = {
  name: "Shadowline",
  legalName: "Shadowline",
  tagline: "Shadow AI audits and AI governance for growing companies.",
  description:
    "We find the AI tools your staff already use, show you the risk in plain English, write the policy, and recommend the one platform your team should run on.",
  contact: {
    email: "hello@example.com",
    phone: "+1 (000) 000-0000",
    phoneHref: "tel:+10000000000",
    location: "Michigan, United States",
    bookingUrl: "", // e.g. a Calendly link; leave empty to hide the button
  },
  /** Where the contact form posts (Resend). Set RESEND_API_KEY, EMAIL_FROM, CONTACT_TO in the environment. */
  url: "https://example.com",
};
