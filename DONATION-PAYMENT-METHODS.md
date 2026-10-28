# Additional giving methods

This change adds NGN bank transfer, USSD and OPay alongside the existing global card checkout. It does not move production to test mode, initiate a live payment, or alter database policies/schema.

## Enablement

After confirming merchant-account availability and completing sandbox tests, set `DONATION_PAYMENT_METHODS=card,bank_transfer,ussd,opay` on the **active** Render API (`Christ-Reformation-House-website-new-1`). Restrict this list to methods actually approved for the merchant account. The default remains `card`, and an empty value disables all methods. The API sends currency-specific availability to the website. Additional methods currently appear only for NGN; other currencies retain card checkout. Card encryption is not required for transfer-only giving.

Bank transfer uses Flutterwave V4 `/customers` and `/virtual-accounts`, not the direct-charge endpoint. Each account is dynamic, expires after one hour, and is tied to one donation reference. The generated amount is displayed as returned by the provider because it may include fees. Never substitute a manually supplied bank account. No BVN/NIN is collected. The account details must not be reused.

USSD fetches bank codes from Flutterwave, displays the returned instructions as text, and asks the donor to authorize on their phone. OPay redirects to the provider authorization URL. The card PIN decline on an earlier donation does not establish that these other methods are approved or operational.

## Verification and recovery

The existing database metadata claim prevents duplicate initialization across workers/restarts. A timeout or lost persistence after account creation remains unresolved, rather than generating another account. Bank transfers resume from saved provider account details. If persistence failed before these details were saved, a maintainer must reconcile the reference in Flutterwave before doing anything else.

The paid button only calls verification. Successful transfers require a provider charge matching reference, amount, currency and customer. The API queries charges scoped to the virtual account, then retrieves the matching charge before crediting the donation. If a provider response uses a different reference or a mismatched amount, leave it unresolved for reconciliation. Duplicate matching transfers require manual review. Signed webhooks are also checked against the donation; production webhooks must be configured.

Expired details are hidden and do not automatically become failed donations, because a transfer may still be processing. Continue checking or contact the ministry if money was sent. Never advise a second transfer merely because the first is pending.

## Testing

Local automated tests mock the network and payment database, including account creation, recovery, expiry, mismatches, USSD, OPay, currency restrictions and privacy. They do not prove merchant permissions, settlement, webhook delivery or real bank acceptance.

For an actual provider test, use a **separate sandbox environment** with Flutterwave TEST `FLW_CLIENT_ID` and `FLW_CLIENT_SECRET`, and `FLW_API_BASE_URL=https://developersandbox-api.flutterwave.com`. Run `node backend/scripts/sandbox-transfer-check.js` from the project root. The script refuses the live API, creates only a sandbox customer/account, checks for a matching simulated successful charge, and never writes a donation to Supabase. No real card, PIN or bank transfer is needed. Do not put secrets in chat or commit them. Never replace the production service's credentials to run this test.

Before production enablement, verify real sandbox transfer success and failure, valid/invalid signed webhooks, USSD and OPay authorization, provider permission/currency limits, and the ministry's reconciliation process. Production deployment and environment changes require the user's approval.

Official references:
- https://developer.flutterwave.com/v4.0.0/docs/pay-with-bank-transfer
- https://developer.flutterwave.com/v4/reference/virtual_accounts_post
- https://developer.flutterwave.com/v4.0.0/docs/ussd
- https://developer.flutterwave.com/v4.0.0/docs/opay
