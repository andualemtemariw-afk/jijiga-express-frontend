# Jijiga Express — Live Frontend Replacement

This is a standalone Next.js frontend wired to the hardened Supabase backend in project `nwqhsvhgjmezoouvowyw`.

## Included
- Auth sign-in/sign-up
- Role-aware workspace for customer, Mamila, rider, dispatcher and owner_admin
- Live dashboard RPC integration
- KHAT live-batch ordering
- EEU recharge ordering (300–3,000 ETB)
- Mamila batch publishing and order confirmation
- Rider workflow transitions + OTP verification
- Dispatcher rider/vendor assignment
- Operations metrics and cash-control view
- No service-role key in browser code

## Environment
Copy `.env.example` to `.env.local` and set the publishable key.

## Run
```bash
npm install
npm run build
npm run start
```

## Important
The existing production Vercel project could be inspected, but its source repository was not exposed through the connected tools. This folder is therefore a clean replacement build rather than a claimed edit of the existing source.
