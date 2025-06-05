# Threat Hunter

A web app for analyzing URLs for Indicators of Compromise (IOCs) and generating SIEM queries.

## Google OAuth Configuration

Set the following environment variables in a `.env` file or your environment:

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` – credentials from Google Cloud Console.
- `GOOGLE_CALLBACK_URL` – the callback URL registered with Google. For Replit or other proxies, use the public HTTPS URL followed by `/auth/google/callback`.
- `SESSION_SECRET` – session signing secret.
- `DATABASE_URL` – PostgreSQL connection string.

When deploying behind a proxy, Express is configured to trust the first proxy so that OAuth callbacks use the correct protocol.

Run the type checker with `npm run check`.

## Usage

1. Start the application with `npm run dev`.
2. Visit the site and click **Sign in with Google**.
3. After signing in you can analyze URLs. Previous analyses are saved per user and can be accessed from the history menu.
