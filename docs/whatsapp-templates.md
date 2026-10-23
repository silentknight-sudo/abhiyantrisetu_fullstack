# WhatsApp templates to submit for approval

Submit these in WhatsApp Manager (or your BSP's dashboard: Interakt, AiSensy or Gupshup) under the **Utility** category. The **name**, the **order of variables** and the **order of buttons** must match exactly, because the API fills them by position (`apps/api/src/modules/notifications/templates.ts`). Submit each in **English (en)** and **Hindi (hi)**; users get the language they chose in the app.

## 1. `setu_new_lead` (to partners)

|                                      | English                                                                                                                       | Hindi                                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Body                                 | New job near you: _{{1}}_ in {{2}}, {{3}} km away ({{4}}). Tap _Interested_ and open the Setu Partner app to send your quote. | आपके पास नया काम: _{{1}}_, {{2}} में, {{3}} किमी दूर ({{4}})। _Interested_ दबाएँ और कोटेशन भेजने के लिए Setu Partner ऐप खोलें। |
| Buttons (quick reply, in this order) | 1. `Interested` · 2. `Not today`                                                                                              | 1. `Interested` · 2. `आज नहीं`                                                                                                 |
| Sample values                        | {{1}} Kitchen tap leaking · {{2}} Sector Pi · {{3}} 1.2 · {{4}} up to ₹3,000                                                  | same                                                                                                                           |

The buttons send `lead:<id>:accept` and `lead:<id>:decline` back to `POST /v1/webhooks/whatsapp`. _Interested_ marks the lead as seen; _Not today_ declines it, so the next partner can be tried.

## 2. `setu_quote_received` (to customers)

|               | English                                                                                              | Hindi                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Body          | {{1}} has sent you a quote of {{2}} for “{{3}}”. Compare quotes and hire in the Abhiyantri Setu app. | {{1}} ने “{{3}}” के लिए {{2}} का कोटेशन भेजा है। Abhiyantri Setu ऐप में कोटेशन की तुलना करें और काम सौंपें। |
| Sample values | {{1}} Ramesh Kumar · {{2}} ₹1,829 · {{3}} Bathroom tap leaking                                       | same                                                                                                        |

## 3. `setu_hired` (to partners)

|               | English                                                                                                                                   | Hindi                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Body          | You're hired for “{{1}}” in {{2}}. Open the Setu Partner app to schedule the visit. The customer will share a 4-digit start code on site. | आपको {{2}} में “{{1}}” का काम मिला है। विज़िट का समय तय करने के लिए Setu Partner ऐप खोलें। ग्राहक साइट पर 4 अंकों का स्टार्ट कोड देंगे। |
| Sample values | {{1}} Bathroom tap leaking · {{2}} Sector Pi                                                                                              | same                                                                                                                                    |

## 4. `setu_job_update` (to customers and partners)

|               | English                                             | Hindi                                             |
| ------------- | --------------------------------------------------- | ------------------------------------------------- |
| Body          | Update on “{{1}}”: {{2}}. Open the app for details. | “{{1}}” पर अपडेट: {{2}}। जानकारी के लिए ऐप खोलें। |
| Sample values | {{1}} Bathroom tap leaking · {{2}} Work in progress | {{2}} काम चल रहा है                               |

## Rules the API already follows

- Messages go only to people who opted in (`POST /v1/me/whatsapp-opt-in`); everyone else gets push only, and the skip is logged with the reason.
- Every message is logged in the `notifications` table with its status, so ops can see what was sent, skipped or failed.
- Inbound webhooks are checked against `WHATSAPP_APP_SECRET` and each message is handled once, even when Meta retries.
