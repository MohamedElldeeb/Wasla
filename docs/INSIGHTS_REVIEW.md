# Insights review, round 2 (fixtures, no Apify)

Generated 2026-10-10 by `scripts/fixtures-run.mjs` + `scripts/insights-review.mjs`. The REAL n8n Code nodes ran on the saved real-run fixtures (`docs/samples/fixtures/`), with live OpenRouter calls for the LLM steps (planner google/gemini-2.5-flash, writer google/gemini-2.5-flash; 43 calls, about $0.04117). **Offer used:** "Wasla finds B2B clients for agencies and sends personalized WhatsApp messages", with CTA offer "أبعتلكم 10 شركات مناسبة لشغلكم ببلاش" and sender "محمد من وصلة". "Today" for time-based facts is 2026-10-10.

## What changed in round 2

**Fit and categories (section 1 of the brief)**
- One rule, in `decideFit` (`lib/insights/core.mjs`) and used by the full run and by the probe: inside the allowed categories fit or maybe is kept; outside them only a "fit" backed by the categories, description or website address is kept; "maybe", "not fit" and name-only evidence are removed.
- The fit check now returns `evidence` (category, description, website, name_only, none). The name is context only; the prompt says words in a name are not evidence, and that an industry or product word next to the business-type word names what the business sells (the real-estate-marketing case). A "fit" with name-only evidence is removed (the tax office with "B2B" in its name has a test).
- Nothing is learned from the model any more. A category joins the allowed list only from the user: "Looks right" on the probe sample (new button), or a lead the user sent (`learnCategoryFromSent`).
- This table now shows the label the pipeline itself used (the earlier "second opinion" column is gone, so the table can no longer contradict the result).
- The planner now runs on google/gemini-2.5-flash (`OPENROUTER_PLANNER_MODEL`), asked for 6 to 20 categories covering the service, consultant, company, agency and online wordings.

**Opportunities (section 2)**
- Every planner opportunity must carry `why_it_means_they_need_the_offer`; one without it is dropped, and the prompt says to drop benefits the offer does not literally deliver.
- The writer must return `offer_quote`, a phrase copied from the offer that states the benefit; the validator rejects a message whose quote is not in the offer, and known invented-benefit phrases.
- With no usable opportunity the message uses a personalization hook: the lead's other Maps categories (specialty) or what customers praise; otherwise a clean general opening.
- Free Maps data now used: search rank (new opportunity `weak_search_rank`), all categories (specialty), `reviewsDistribution` (share of 1-2 star reviews), and a social page used as the website counts as no real website.

**Messages (section 3)**
- New prompt with the style rules (the example messages are NOT in the global prompt: they are the optional per-organization style_examples, filled here for the Wasla fixture organization), plus validator rules for: no rating or review count, no micro-district, no jargon (B2B), no time-of-day greeting, no "ممكن نتكلم", the concrete `cta_offer`, a signature "name من company", 35 to 70 words.
- New offer-profile fields `cta_offer` and `sender_name`, asked in the onboarding interview and editable on the summary card.
- Variety: the campaign's earlier openings are given to the writer and rejected by the validator, and a new "Dedupe openings" node in WF3 sends a duplicate of the same run back for its single retry.

**This run, measured on the generated messages** (16 generated): 13 valid, 3 failed after the retry (style:copies_style_example, style:own_praise, style:assumes_need), 12 needed the automatic retry. 13 of 13 valid messages have a different first five words within their campaign. Length 36 to 48 words. Style audit re-run on the final texts: 0 of 13 violate a rule.


**Still not perfect (honest list)**
- 3 of 16 messages fail even after the one automatic retry (reasons above). They are not saved and not charged; the user can press regenerate. The causes are model variance (a message under 35 words, an assumed need, an occasional invalid JSON reply from the provider), not logic bugs.
- The validator cannot prove a hook is true: "عملاءكم بيشكروا في ..." comes from the review themes, and some models still add an invented need ("شغلكم محتاج ...") that only a pattern check catches.
- A message that still fails after the retry is now stored as a visible "failed" row: the review queue shows the lead with "Couldn't write a good message" and a Try again button (no credit is charged).
- A place counts as "inside the categories" if ANY of its Maps categories is allowed (AIT Systems is a software company that also lists an internet marketing category), so it is delivered as "maybe" with a capped score.
- The offer text is the only source of "what we promise"; if a profile is thin, the quote check rejects more messages.
## 0. What the planner produced for this offer

- **Ideal prospect:** وكالة تسويق أو دعاية وإعلان تبحث عن عملاء B2B جدد وتواجه صعوبة في التواصل الفعال معهم.
- **Search phrases (max 4):** وكالة تسويق · شركات دعاية واعلان · Marketing agency · Advertising company
- **Synonyms for later rounds:** وكالة إعلانات · مكتب تسويق · Digital marketing agency · Creative agency
- **Allowed Maps categories (20):** وكالة تسويق · Marketing Agency · وكالة إعلانات · Advertising Agency · خدمة تسويق عبر الإنترنت · Internet Marketing Service · مستشار تسويق · Marketing Consultant · وكالة دعاية وإعلان · Advertising and Marketing Agency · شركة علاقات عامة · Public Relations Company · مصمم جرافيك · Graphic Designer · خدمة تصميم مواقع الويب · Website Designer · استوديو تصميم · Design Studio · مستشار أعمال · Business Consultant
- **Signals:** new_business (50) · unclaimed_listing (30) · profile_completeness (20) · has_website (-10) · owner_engagement (-20)
- **Opportunity map:** new_business: الوكالات الجديدة تحتاج إلى تدفق مستمر من العملاء لبدء أعمالها وتنميتها، وعرضنا يوفر لهم ذلك.
  - unclaimed_listing: إذا كانت الوكالة لا تدير صفحتها الخاصة، فقد تكون مشغولة جدًا أو تفتقر للموارد، وعرضنا يوفر لها الوقت والجهد في البحث عن عملاء.
  - thin_profile: الوكالة التي لديها ملف شخصي غير مكتمل قد تكون بحاجة إلى التركيز على الحصول على عملاء جدد قبل تحسين حضورها الرقمي، وهذا ما نقدمه.
- **Complaints the offer can help with:** none stated (review complaints will not be used as an opportunity)

## 1. Funnel: alexandria

| Step | Places |
|---|---|
| Found by the search (fixture) | 24 |
| Removed: government, utilities, education, hospitals, worship, embassies, military | −4 |
| Removed: closed | −0 |
| Sent to the LLM fit check | 20 |
| Removed: outside the allowed categories without a clear fit backed by evidence | −1 |
| Removed: not fit (never charged) | −10 |
| **Delivered (fit or maybe)** | **9** |

No minimum-reviews or mobile-only filter was applied (both are off by default).

### Every place: gate, fit check, decision

The fit column is the label the pipeline itself used (one call per place, temperature 0). "inside" / "outside" = the place's Maps categories against the planner's allowed list.

| # | Place | Maps categories | Gate | Fit check: label · evidence · reason | Decision |
|---|---|---|---|---|---|
| 1 | Scitecs | وكالة تسويق | inside the categories | fit · category · وكالة تسويق تبحث عن عملاء B2B | **delivered** (fit) |
| 2 | سنجر سابقا | خدمة وسائل النقل | outside the categories | not_fit · category · خدمة وسائل النقل ليست وكالة تسويق | removed: not fit |
| 3 | The Marketing house | وكالة تسويق | inside the categories | fit · category · وكالة تسويق تبحث عن عملاء B2B | **delivered** (fit) |
| 4 | شركة لافينوس للتسويق الالكتروني | وكالة تسويق | inside the categories | fit · category · وكالة تسويق تبحث عن عملاء B2B | **delivered** (fit) |
| 5 | Promo Marketing Agency | وكالة تسويق, وكالة تصميم, خدمة التسويق عبر الإنترنت, وكالة إعلانية | inside the categories | fit · category · وكالة تسويق تبحث عن عملاء B2B | **delivered** (fit) |
| 6 | Ocd | وكالة تسويق | inside the categories | fit · category · وكالة تسويق تبحث عن عملاء B2B | **delivered** (fit) |
| 7 | مكتب الاسكندرية للاستشارات القانونية | شركة محاماة | outside the categories | not_fit · category · شركة محاماة لا تبحث عن عملاء B2B لوكالات التسويق. | removed: not fit |
| 8 | مكتب البهنساوي للمحاماة و الاستشارات القانونية | محام عام | outside the categories | not_fit · category · محام عام لا يبحث عن عملاء B2B لوكالات التسويق. | removed: not fit |
| 9 | مكتب المستشار /عصام حمزه الاسيوطي للمحاماة و الاستشارات القانونية | مكتب الشركات | outside the categories | not_fit · category · مكتب محاماة لا يبحث عن عملاء B2B لوكالات التسويق. | removed: not fit |
| 10 | معهد تكنولوجيا المعلومات - ITI | جامعة | global:education | not sent (removed by a gate) | removed: global:education |
| 11 | Alexandria Business Association | مكتب حكومي | global:government | not sent (removed by a gate) | removed: global:government |
| 12 | كلية الأعمال - جامعة الإسكندرية | كلية | global:education | not sent (removed by a gate) | removed: global:education |
| 13 | ALSHEHAB لخدمات رجال الأعمال | خدمة إدارة الأعمال | outside the categories | maybe · category · خدمة إدارة الأعمال قد تحتاج لعملاء B2B. | removed: outside the categories, not a "fit" with evidence |
| 14 | Icons Co-working Space | منطقة عمل جماعي | outside the categories | not_fit · category · منطقة عمل جماعي ليست وكالة تسويق. | removed: not fit |
| 15 | Kite Business Space | منطقة عمل جماعي, خدمة التخطيط للاجتماعات, وكالة تأجير وحدات مكتبية | outside the categories | not_fit · category · منطقة عمل جماعي ليست وكالة تسويق. | removed: not fit |
| 16 | Espaces - Alexandria | منطقة عمل جماعي | outside the categories | not_fit · category · منطقة عمل جماعي ليست وكالة تسويق. | removed: not fit |
| 17 | Jenica Agency | وكالة تسويق, وكالة إعلانية, مصمم رسومات, خدمة التسويق عبر الإنترنت | inside the categories | fit · category · وكالة تسويق تبحث عن عملاء B2B | **delivered** (fit) |
| 18 | بالم هيلز للتنمية | مكتب الشركات | outside the categories | not_fit · category · مكتب شركات لا يبحث عن عملاء B2B لوكالات التسويق. | removed: not fit |
| 19 | المتحدة للاسكان والتعمير | مكتب الشركات | outside the categories | not_fit · category · مكتب شركات لا يبحث عن عملاء B2B لوكالات التسويق. | removed: not fit |
| 20 | Carnival Trading | مكتب الشركات | outside the categories | not_fit · category · مكتب شركات لا يبحث عن عملاء B2B لوكالات التسويق. | removed: not fit |
| 21 | Talent Idea Advertising Agency | وكالة إعلانية | inside the categories | fit · category · وكالة إعلانية تبحث عن عملاء B2B | **delivered** (fit) |
| 22 | Digitopia Agency | وكالة تسويق | inside the categories | fit · category · وكالة تسويق تبحث عن عملاء B2B | **delivered** (fit) |
| 23 | كلية الحاسبات وعلوم البيانات جامعة الإسكندرية | كلية | global:education | not sent (removed by a gate) | removed: global:education |
| 24 | AIT Systems | شركة برمجيات, استشاري كمبيوتر, خدمة أمان الكمبيوتر, دعم الكمبيوتر والخدمات | inside the categories | maybe · category · وكالة تجارة إلكترونية وخدمة تسويق عبر الإنترنت قد تبحث عن عملاء B2B | **delivered** (maybe) |

### Scores of the delivered leads

**Excluded (15):**

- سنجر سابقا: the fit check said not fit (category: خدمة وسائل النقل ليست وكالة تسويق)
- مكتب الاسكندرية للاستشارات القانونية: the fit check said not fit (category: شركة محاماة لا تبحث عن عملاء B2B لوكالات التسويق.)
- مكتب البهنساوي للمحاماة و الاستشارات القانونية: the fit check said not fit (category: محام عام لا يبحث عن عملاء B2B لوكالات التسويق.)
- مكتب المستشار /عصام حمزه الاسيوطي للمحاماة و الاستشارات القانونية: the fit check said not fit (category: مكتب محاماة لا يبحث عن عملاء B2B لوكالات التسويق.)
- معهد تكنولوجيا المعلومات - ITI: global exclusion (education) by category "جامعة"
- Alexandria Business Association: global exclusion (government) by category "مكتب حكومي"
- كلية الأعمال - جامعة الإسكندرية: global exclusion (education) by category "كلية"
- ALSHEHAB لخدمات رجال الأعمال: outside the allowed categories and the fit check said maybe (evidence: category); only "fit" with category, description or website evidence is kept outside
- Icons Co-working Space: the fit check said not fit (category: منطقة عمل جماعي ليست وكالة تسويق.)
- Kite Business Space: the fit check said not fit (category: منطقة عمل جماعي ليست وكالة تسويق.)
- Espaces - Alexandria: the fit check said not fit (category: منطقة عمل جماعي ليست وكالة تسويق.)
- بالم هيلز للتنمية: the fit check said not fit (category: مكتب شركات لا يبحث عن عملاء B2B لوكالات التسويق.)
- المتحدة للاسكان والتعمير: the fit check said not fit (category: مكتب شركات لا يبحث عن عملاء B2B لوكالات التسويق.)
- Carnival Trading: the fit check said not fit (category: مكتب شركات لا يبحث عن عملاء B2B لوكالات التسويق.)
- كلية الحاسبات وعلوم البيانات جامعة الإسكندرية: global exclusion (education) by category "كلية"

**Kept, with the opportunity score:**

| Lead | Score | Why (favorable signals) | Cap applied |
|---|---|---|---|
| Scitecs | 15 | (none favorable: a low score is a real result) |  |
| The Marketing house | 12 | (none favorable: a low score is a real result) |  |
| شركة لافينوس للتسويق الالكتروني | 48 | صفحة مكتملة |  |
| Promo Marketing Agency | 10 | (none favorable: a low score is a real result) |  |
| Ocd | 23 | لا يملك موقعًا إلكترونيًا حقيقيًا |  |
| Jenica Agency | 33 | صفحة مكتملة |  |
| Talent Idea Advertising Agency | 10 | (none favorable: a low score is a real result) |  |
| Digitopia Agency | 50 | صفحة مكتملة · نادرًا ما يرد على التقييمات |  |
| AIT Systems | 34 | نادرًا ما يرد على التقييمات |  |

## 1. Funnel: cairo

| Step | Places |
|---|---|
| Found by the search (fixture) | 20 |
| Removed: government, utilities, education, hospitals, worship, embassies, military | −2 |
| Removed: closed | −0 |
| Sent to the LLM fit check | 18 |
| Removed: outside the allowed categories without a clear fit backed by evidence | −0 |
| Removed: not fit (never charged) | −11 |
| **Delivered (fit or maybe)** | **7** |

No minimum-reviews or mobile-only filter was applied (both are off by default).

### Every place: gate, fit check, decision

The fit column is the label the pipeline itself used (one call per place, temperature 0). "inside" / "outside" = the place's Maps categories against the planner's allowed list.

| # | Place | Maps categories | Gate | Fit check: label · evidence · reason | Decision |
|---|---|---|---|---|---|
| 1 | فيرست ماركتس - أفضل شركة تسويق إلكتروني وتصميم مواقع ومتاجر إلكترونية | وكالة تسويق | inside the categories | fit · category · وكالة تسويق تبحث عن عملاء B2B جدد | **delivered** (fit) |
| 2 | ماركترمارت | خدمة التسويق عبر الإنترنت | inside the categories | fit · category · خدمة التسويق عبر الإنترنت تبحث عن عملاء B2B | **delivered** (fit) |
| 3 | شركة إنجاز ميديا للتسويق الإلكتروني و تصميم المواقع | خدمة التسويق عبر الإنترنت, وكالة تصميم, شركة استضافة على الويب, مصمم مواقع ويب | inside the categories | fit · category · وكالة تسويق وتصميم تبحث عن عملاء B2B | **delivered** (fit) |
| 4 | جهاز تنمية المشروعات الصغيرة والمتوسطة والمتناهية الصغر | خدمة تطوير أعمال | outside the categories | not_fit · category · جهاز حكومي لتنمية المشروعات، ليس وكالة تسويق | removed: not fit |
| 5 | محطة كهرباء العاصمة الإدارية الجديدة | محطة كهرباء | global:utility | not sent (removed by a gate) | removed: global:utility |
| 6 | Asd Business Solutions | خدمة تطوير أعمال | outside the categories | not_fit · category · خدمة تطوير أعمال، ليست وكالة تسويق | removed: not fit |
| 7 | Cairo Marketing Company CMC | مورد معدات, معدات المخابز, مقهى, مُستَورِد معدات | outside the categories | not_fit · category · مورد معدات ومطعم ومقهى، ليس وكالة تسويق. | removed: not fit |
| 8 | المصرى للتسويق العقارى بالقاهرة الجديدة | مستشار تسويق | inside the categories | not_fit · category · مستشار تسويق عقاري، ليس وكالة تسويق عامة | removed: not fit |
| 9 | The Creative Zone | وكالة إعلانية | inside the categories | fit · category · وكالة إعلانية تبحث عن عملاء B2B | **delivered** (fit) |
| 10 | B2B Shipping Services | خدمة شحن | outside the categories | not_fit · category · خدمة شحن، ليس وكالة تسويق. | removed: not fit |
| 11 | B2B للاستشارات المالية وخدمات الضرائب | مكتب الشركات | outside the categories | not_fit · category · استشارات مالية وخدمات ضرائب، ليس وكالة تسويق. | removed: not fit |
| 12 | BDR auto | تاجر سيارات | outside the categories | not_fit · category · تاجر سيارات، ليس وكالة تسويق. | removed: not fit |
| 13 | Essence Adverts | وكالة تسويق, وكالة إعلانية, خدمة إنتاج الفيديو | inside the categories | fit · category · وكالة تسويق وإعلانات تبحث عن عملاء B2B | **delivered** (fit) |
| 14 | Plus One Up | وكالة تسويق | inside the categories | fit · category · وكالة تسويق تبحث عن عملاء B2B جدد | **delivered** (fit) |
| 15 | ripplemark Egypt | وكالة تسويق, خدمة التسويق عبر الإنترنت | inside the categories | fit · category · وكالة تسويق تبحث عن عملاء B2B جدد | **delivered** (fit) |
| 16 | 2B | متجر أجهزة إلكترونية | outside the categories | not_fit · category · متجر أجهزة إلكترونية، ليس وكالة تسويق. | removed: not fit |
| 17 | iCall Outsourcing | مركز الاتصالات | outside the categories | not_fit · category · مركز اتصالات، ليس وكالة تسويق. | removed: not fit |
| 18 | TeleTarget | خدمة التسويق عبر الهاتف | outside the categories | not_fit · category · خدمة التسويق عبر الهاتف، منافس محتمل. | removed: not fit |
| 19 | BD Scientific Office - Egypt | مكتب الشركات | outside the categories | not_fit · category · مكتب شركات، ليس وكالة تسويق. | removed: not fit |
| 20 | معهد السالزيان دون بوسكو | مركز تدريب, مدرسة | global:education | not sent (removed by a gate) | removed: global:education |

### 2. Cairo: what is excluded and why, and the new scores

**Excluded (13):**

- جهاز تنمية المشروعات الصغيرة والمتوسطة والمتناهية الصغر: the fit check said not fit (category: جهاز حكومي لتنمية المشروعات، ليس وكالة تسويق)
- محطة كهرباء العاصمة الإدارية الجديدة: global exclusion (utility) by category "محطة كهرباء"
- Asd Business Solutions: the fit check said not fit (category: خدمة تطوير أعمال، ليست وكالة تسويق)
- Cairo Marketing Company CMC: the fit check said not fit (category: مورد معدات ومطعم ومقهى، ليس وكالة تسويق.)
- المصرى للتسويق العقارى بالقاهرة الجديدة: the fit check said not fit (category: مستشار تسويق عقاري، ليس وكالة تسويق عامة)
- B2B Shipping Services: the fit check said not fit (category: خدمة شحن، ليس وكالة تسويق.)
- B2B للاستشارات المالية وخدمات الضرائب: the fit check said not fit (category: استشارات مالية وخدمات ضرائب، ليس وكالة تسويق.)
- BDR auto: the fit check said not fit (category: تاجر سيارات، ليس وكالة تسويق.)
- 2B: the fit check said not fit (category: متجر أجهزة إلكترونية، ليس وكالة تسويق.)
- iCall Outsourcing: the fit check said not fit (category: مركز اتصالات، ليس وكالة تسويق.)
- TeleTarget: the fit check said not fit (category: خدمة التسويق عبر الهاتف، منافس محتمل.)
- BD Scientific Office - Egypt: the fit check said not fit (category: مكتب شركات، ليس وكالة تسويق.)
- معهد السالزيان دون بوسكو: global exclusion (education) by category "مركز تدريب"

**Kept, with the opportunity score:**

| Lead | Score | Why (favorable signals) | Cap applied |
|---|---|---|---|
| فيرست ماركتس - أفضل شركة تسويق إلكتروني وتصميم مواقع ومتاجر إلكترونية | 50 | صفحة مكتملة · نادرًا ما يرد على التقييمات |  |
| ماركترمارت | 45 | صفحة مكتملة · نادرًا ما يرد على التقييمات |  |
| شركة إنجاز ميديا للتسويق الإلكتروني و تصميم المواقع | 31 | (none favorable: a low score is a real result) |  |
| The Creative Zone | 50 | صفحة مكتملة · نادرًا ما يرد على التقييمات |  |
| Essence Adverts | 41 | نادرًا ما يرد على التقييمات · صفحة مكتملة |  |
| Plus One Up | 18 | (none favorable: a low score is a real result) |  |
| ripplemark Egypt | 19 | (none favorable: a low score is a real result) |  |

## 3. Lead briefs and first messages

For the 8 marketing agencies in the Alexandria fixtures and every kept agency in the Cairo fixtures. Facts are computed in code. Review summaries come from the LLM and show their confidence. Where the fixture has no reviews for a place, the brief uses the Maps listing only and says so. The lead facts (rating, district) are shown to YOU; the writer never receives them.

### alexandria (9)

#### Scitecs

- **Listing:** وكالة تسويق; قسم سيدى جابر; rating 4.4 from 14 reviews; website yes; Maps search rank 2; phone +20 3 4041116
- **Score:** 15
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0, 14% of all its ratings are 1-2★; recent avg n/a; listing claimed; photos 3; hours yes; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** thin_profile [strength 1]: thin listing: 3 photos, hours yes
- **First message** (rejected: style:copies_style_example; 0 words; built on: thin_profile):

  > (none)

#### The Marketing house

- **Listing:** وكالة تسويق; قسم سيدى جابر; rating 5 from 1 reviews; website yes; Maps search rank 9; phone +20 15 56666886
- **Score:** 12
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0, 0% of all its ratings are 1-2★; recent avg n/a; listing claimed; photos 1; hours yes; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** thin_profile [strength 2]: thin listing: 1 photos, hours yes
- **First message** (valid, after one automatic retry; 39 words; built on: thin_profile; hook note: عملاء B2B جدد لوكالتك):

  > سؤال سريع: إزاي بتلاقوا شركات جديدة تتعاملوا معاها دلوقتي؟ إحنا في وصلة بنلاقي شركات للوكالات اللي زيكم، وبنجهز رسايل واتساب شخصية لكل شركة. ده بيخلي التواصل أسرع وأسهل بكتير. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟
  > محمد من وصلة

#### شركة لافينوس للتسويق الالكتروني

- **Listing:** وكالة تسويق; قسم سيدى جابر; rating 5 from 11 reviews; website no; Maps search rank 2; phone +20 10 27669962
- **Score:** 48
- **Facts (code):** activity dormant (last review 2024-08-03, 798 days ago); 10 reviews fetched (6 with text); owner reply rate 60%; low (1-2★) reviews 0, unanswered 0, 0% of all its ratings are 1-2★; recent avg 5; listing claimed; photos 27; hours yes; new business: unknown (never assumed old)
- **What customers say (high confidence, 6 texts):** Customers praise Lavenus for their excellent service, work quality, punctuality, and creative ideas.
  - Praised: التعامل الرائع (2), جودة العمل (3), الالتزام بالمواعيد (2), الأفكار الإبداعية (2)
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (rejected: style:own_praise; 0 words; no opportunity tied to the offer: personal hook or general opening):

  > (none)

#### Promo Marketing Agency

- **Listing:** وكالة تسويق, وكالة تصميم, خدمة التسويق عبر الإنترنت, وكالة إعلانية; محرم بك; rating 5 from 4 reviews; website yes; Maps search rank 4; phone +20 15 55418907
- **Score:** 10
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0, 0% of all its ratings are 1-2★; recent avg n/a; listing claimed; photos 0; hours yes; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** thin_profile [strength 3]: thin listing: 0 photos, hours yes
- **First message** (valid, after one automatic retry; 40 words; built on: thin_profile; hook note: عملاء B2B جدد للوكالة مع رسايل مخصصة):

  > وصلة بتساعد وكالات التسويق تلاقي شركات محتاجة خدماتها. شغلكم في التصميم والتسويق الإلكتروني بيخلي فرصتكم كبيرة مع عملاء جداد. إحنا بنجهز رسايل واتساب شخصية لكل عميل عشان تتواصلوا معاهم بسهولة. تحبوا نبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟ محمد من وصلة

#### Ocd

- **Listing:** وكالة تسويق; اللبان; rating 5 from 2 reviews; website no; Maps search rank 5; phone +20 10 27188476
- **Score:** 23
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0, 0% of all its ratings are 1-2★; recent avg n/a; listing claimed; photos 4; hours no; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** thin_profile [strength 1]: thin listing: 4 photos, hours no
- **First message** (rejected: style:assumes_need; 0 words; built on: thin_profile):

  > (none)

#### Jenica Agency

- **Listing:** وكالة تسويق, وكالة إعلانية, مصمم رسومات, خدمة التسويق عبر الإنترنت, مستشار تسويق, Media house; قسم سيدى جابر; rating 4.8 from 16 reviews; website yes; Maps search rank 2; phone +20 10 00953137
- **Score:** 33
- **Facts (code):** activity active (last review 2026-07-19, 83 days ago); 10 reviews fetched (3 with text); owner reply rate 40%; low (1-2★) reviews 1, unanswered 0, 6% of all its ratings are 1-2★; recent avg 4.6; listing claimed; photos 9; hours yes; new business: unknown (never assumed old)
- **What customers say (medium confidence, 3 texts):** Reviews praise the agency's professional and highly experienced team, as well as their quality work and creative thinking.
  - Praised: فريق محترف (2), خبرة عالية (1), جودة العمل (1), تفكير إبداعي (1)
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid, after one automatic retry; 43 words; no opportunity tied to the offer: personal hook or general opening; hook note: عملاء الشركة بيشكروا في فريقهم المحترف.):

  > أهلا بفريق Jenica Agency، عملاءكم بيشكروا في فريقكم المحترف. عشان كده، "وصلة" بتلاقي لوكالات التسويق عملاء جداد ومناسبين وبتتواصل معاهم بسرعة. إحنا بنجهز رسايل واتساب شخصية لكل عميل عشان تتواصلوا معاهم بسهولة. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوهم؟ محمد من وصلة

#### Talent Idea Advertising Agency

- **Listing:** وكالة إعلانية; قسم سيدى جابر; rating 5 from 1 reviews; website yes; Maps search rank 5; phone +20 10 60771121
- **Score:** 10
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0, 0% of all its ratings are 1-2★; recent avg n/a; listing claimed; photos 0; hours yes; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** thin_profile [strength 3]: thin listing: 0 photos, hours yes
- **First message** (valid, after one automatic retry; 39 words; built on: thin_profile; hook note: الحصول على عملاء B2B جدد للوكالة):

  > بعد إذنكم، "وصلة" بتساعد الوكالات إنها تلاقي شركات عميلة وتجهز رسايل واتساب مخصصة لكل شركة. ده بيخليكم توصلوا لعملاء جداد ومناسبين بسهولة وسرعة. لو حابين، ممكن نبعتلكم 10 شركات متخصصة في مجالكم تجربوا بيها الخدمة مجاناً؟ محمد من وصلة

#### Digitopia Agency

- **Listing:** وكالة تسويق; قسم سيدى جابر; rating 3.8 from 16 reviews; website yes; Maps search rank 7; phone +20 15 01177375
- **Score:** 50
- **Facts (code):** activity slowing (last review 2025-10-12, 363 days ago); 10 reviews fetched (2 with text); owner reply rate 0%; low (1-2★) reviews 5, unanswered 5, 31% of all its ratings are 1-2★; recent avg 3; listing claimed; photos 23; hours yes; new business: unknown (never assumed old)
- **What customers say (low confidence, 2 texts):** Reviews praise the agency's creative thinking and incredible teams.
  - Praised: التفكير الإبداعي (1), فرق عمل رائعة (1)
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid, after one automatic retry; 37 words; no opportunity tied to the offer: personal hook or general opening; hook note: الحصول على عملاء B2B جدد ومناسبين لوكالات التسويق):

  > أهلا، شغلنا كله موجه لوكالات التسويق اللي زيكم. "وصلة" بتساعدكم تلاقوا عملاء جدد ومناسبين، وكمان بتكتب رسايل واتساب مخصوصة لكل عميل عشان تتواصلوا معاهم بسرعة. ممكن نبعتلكم 10 شركات مناسبة لشغلكم ببلاش تجربوا بيها؟
  > محمد من وصلة

#### AIT Systems

- **Listing:** شركة برمجيات, استشاري كمبيوتر, خدمة أمان الكمبيوتر, دعم الكمبيوتر والخدمات, شركة لإدارة قواعد البيانات, وكالة تجارة إلكترونية, خدمة التجارة الإلكترونية, خدمة التسويق عبر الإنترنت; قسم سيدى جابر; rating 5 from 37 reviews; website yes; Maps search rank 3; phone +20 12 00007043
- **Score:** 34 · fit: maybe
- **Facts (code):** activity active (last review 2026-10-04, 6 days ago); 10 reviews fetched (10 with text); owner reply rate 0%; low (1-2★) reviews 0, unanswered 0, 0% of all its ratings are 1-2★; recent avg 5; listing claimed; photos 1; hours yes; new business: unknown (never assumed old)
- **What customers say (high confidence, 10 texts):** Customers praise AIT Systems' professionalism, quick response, excellent technical support, and their honesty and clarity in dealings.
  - Praised: سرعة الاستجابة (3), الاحترافية (6), الدعم الفني (4), الأمانة والوضوح (2)
- **Top opportunities (planner's map, real evidence):** thin_profile [strength 2]: thin listing: 1 photos, hours yes
- **First message** (valid; 40 words; built on: thin_profile; hook note: مساعدة شركات البرمجيات في العثور على عملاء جدد):

  > أهلا يا فريق AIT Systems، عملاءكم بيشكروا في سرعة الاستجابة عندكم. إحنا في وصلة بنساعد شركات البرمجيات تلاقي عملاء جدد ومناسبين. بنبعت رسايل واتساب متفصلة لكل عميل عشان توصلوا أسرع. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟
  > محمد من وصلة

### cairo (7)

#### فيرست ماركتس - أفضل شركة تسويق إلكتروني وتصميم مواقع ومتاجر إلكترونية

- **Listing:** وكالة تسويق; مدينة نصر; rating 4.8 from 83 reviews; website yes; Maps search rank 1; phone +20 10 04417918
- **Score:** 50
- **Facts (code):** activity slowing (last review 2026-04-30, 163 days ago); 10 reviews fetched (9 with text); owner reply rate 0%; low (1-2★) reviews 0, unanswered 0, 4% of all its ratings are 1-2★; recent avg 5; listing claimed; photos 36; hours yes; new business: unknown (never assumed old)
- **What customers say (high confidence, 9 texts):** Customers praise the company's professionalism in website and application design, the effectiveness of their SEO and social media work, and the team's cooperation.
  - Praised: فريق متعاون (1), نتائج السوشيال ميديا (1), تطبيق احترافي (1), فهم السيو (1)
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid, after one automatic retry; 42 words; no opportunity tied to the offer: personal hook or general opening; hook note: عملاء B2B جدد لوكالتك):

  > أهلا يا فريق فيرست ماركتس، إحنا في وصلة بنلاقي شركات عملاء جدد لوكالات التسويق ونجهز رسايل واتساب شخصية لكل عميل. ده بيخلي التواصل أسرع وأسهل مع العملاء المهتمين بخدماتكم. ممكن نبعتلكم 10 شركات مناسبة لشغلكم من غير أي تكلفة؟
  > محمد من وصلة

#### ماركترمارت

- **Listing:** خدمة التسويق عبر الإنترنت; قسم الزاوية الحمراء; rating 5 from 23 reviews; website yes; Maps search rank 2; phone +20 11 18817390
- **Score:** 45
- **Facts (code):** activity slowing (last review 2026-02-09, 243 days ago); 10 reviews fetched (5 with text); owner reply rate 20%; low (1-2★) reviews 0, unanswered 0, 0% of all its ratings are 1-2★; recent avg 5; listing claimed; photos 52; hours yes; new business: unknown (never assumed old)
- **What customers say (medium confidence, 5 texts):** Customers praise MarketerMart for its outstanding team, professionalism, and commitment in service delivery.
  - Praised: فريق عمل متميز (4), احترافية (2), التزام (2)
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; 37 words; no opportunity tied to the offer: personal hook or general opening; hook note: فتح الكلام بسؤال عن طريقة الحصول على عملاء جدد، مع ذكر مديح العملاء):

  > سؤال سريع: إزاي بتلاقوا عملاء جدد ومناسبين دلوقتي؟ إحنا في وصلة بنلاقي شركات بتحتاج خدمات زي اللي بتقدموها وبنبعتلكم بياناتهم كاملة. عملاءكم بيشكروا في فريق عملكم المتميز. تحبوا نبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟ محمد من وصلة

#### شركة إنجاز ميديا للتسويق الإلكتروني و تصميم المواقع

- **Listing:** خدمة التسويق عبر الإنترنت, وكالة تصميم, شركة استضافة على الويب, مصمم مواقع ويب; مدينة نصر; rating 4.1 from 100 reviews; website yes; Maps search rank 3; phone +20 10 18889985
- **Score:** 31
- **Facts (code):** activity active (last review 2026-09-18, 22 days ago); 10 reviews fetched (9 with text); owner reply rate 40%; low (1-2★) reviews 3, unanswered 0, 20% of all its ratings are 1-2★; recent avg 3.8; listing claimed; photos 7; hours yes; new business: unknown (never assumed old)
- **What customers say (high confidence, 9 texts):** Positive reviews praise the company for website design, SEO, and Google ad campaigns, while negative reviews criticize poor management, lack of experience, and credibility issues.
  - Praised: تصميم المواقع (3), تحسين محركات البحث (SEO) (2), حملات جوجل الإعلانية (2), فريق العمل (1)
  - Complaints seen (shown to you, never put in the message): سوء الإدارة (2), عدم الخبرة (2), المصداقية (2), قلة الذوق (1)
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid, after one automatic retry; 38 words; no opportunity tied to the offer: personal hook or general opening; hook note: إيجاد شركات جديدة بناءً على تخصصهم في تصميم المواقع):

  > لو بتدوروا على شركات جديدة محتاجة شغلكم، إحنا في وصلة بنلاقي شركات للوكالات اللي زيكم. عملاءكم بيشكروا في تصميم المواقع، وإحنا ممكن نساعدكم تلاقوا شركات بتدور على خدماتكم. تحبوا نبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟ محمد من وصلة

#### The Creative Zone

- **Listing:** وكالة إعلانية; 5th Settlement; rating 4.9 from 49 reviews; website yes; Maps search rank 9; phone +20 10 99988114
- **Score:** 50
- **Facts (code):** activity slowing (last review 2026-03-12, 212 days ago); 10 reviews fetched (4 with text); owner reply rate 0%; low (1-2★) reviews 0, unanswered 0, 4% of all its ratings are 1-2★; recent avg 5; listing claimed; photos 27; hours yes; new business: unknown (never assumed old)
- **What customers say (medium confidence, 4 texts):** Customers praise the professionalism and high quality of the place, describing it as the best in the market.
  - Praised: الاحترافية (1), الأفضل في السوق (2), المكان المنظم والنظيف (1)
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; 38 words; no opportunity tied to the offer: personal hook or general opening; hook note: عملاء وكالة The Creative Zone بيشكروا في شغلهم، وممكن نوصلهم بعملاء جدد.):

  > وصلة بتلاقي عملاء جدد للوكالات وتكتب رسايل واتساب شخصية لكل عميل. شغلكم في The Creative Zone عملاءكم بيشكروا فيه إنه الأفضل في السوق، وممكن نوصلكم بشركات محتاجة خدماتكم. تحبوا نبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟ محمد من وصلة

#### Essence Adverts

- **Listing:** وكالة تسويق, وكالة إعلانية, خدمة إنتاج الفيديو; قسم المعادي; rating 4.6 from 49 reviews; website yes; Maps search rank 1; phone +20 10 01588828
- **Score:** 41
- **Facts (code):** activity active (last review 2026-10-06, 4 days ago); 10 reviews fetched (2 with text); owner reply rate 10%; low (1-2★) reviews 0, unanswered 0, 8% of all its ratings are 1-2★; recent avg 5; listing claimed; photos 9; hours yes; new business: unknown (never assumed old)
- **What customers say (low confidence, 2 texts):** Customers praise Essence Adverts for their production quality, professionalism, and creativity.
  - Praised: جودة الإنتاج (2), الاحترافية (1), الإبداع (1)
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid, after one automatic retry; 38 words; no opportunity tied to the offer: personal hook or general opening; hook note: عملاء شركات جدد لوكالتك، مع التركيز على تخصصهم في إنتاج الفيديو.):

  > فكرة سريعة: "وصلة" بتلاقي شركات جديدة لوكالات التسويق وتكتب رسايل واتساب مخصوصة لكل شركة. ده هيسهل عليكم تلاقوا شركات محتاجة شغلكم في إنتاج الفيديو. لو حابين تعرفوا إزاي، ممكن أبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟
  > محمد من وصلة

#### Plus One Up

- **Listing:** وكالة تسويق; المعصرة; rating 5 from 16 reviews; website yes; Maps search rank 2; phone +20 11 15173395
- **Score:** 18
- **Facts (code):** activity slowing (last review 2026-05-16, 147 days ago); 10 reviews fetched (6 with text); owner reply rate 80%; low (1-2★) reviews 0, unanswered 0, 0% of all its ratings are 1-2★; recent avg 5; listing claimed; photos 5; hours yes; new business: unknown (never assumed old)
- **What customers say (high confidence, 6 texts):** Customers praise Plus One Up's excellent and creative team, mentioning that they offer evolving ideas.
  - Praised: فريق عمل (5), أفكار مختلفة (1), تطور (1), مؤهلات عالية (1)
- **Top opportunities (planner's map, real evidence):** thin_profile [strength 1]: thin listing: 5 photos, hours yes
- **First message** (valid, after one automatic retry; 48 words; built on: thin_profile; hook note: ثناء العملاء على فريق العمل كمدخل لعرض خدمة العملاء الجدد.):

  > أهلا يا فريق Plus One Up، عملاءكم بيشكروا في فريق عملكم. عشان كده، إحنا في وصلة بنساعد وكالات التسويق تلاقي شركات جديدة محتاجة خدماتها، وبنجهز رسايل واتساب لكل شركة. ده بيخليكم تلاقوا زباين جداد وتتواصلوا معاهم بسرعة. ممكن نبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها؟
  > محمد من وصلة

#### ripplemark Egypt

- **Listing:** وكالة تسويق, خدمة التسويق عبر الإنترنت; قسم المعادي; rating 4.6 from 31 reviews; website yes; Maps search rank 4; phone +20 2 25211510
- **Score:** 19
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0, 10% of all its ratings are 1-2★; recent avg n/a; listing claimed; photos 6; hours yes; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; 36 words; no opportunity tied to the offer: personal hook or general opening; hook note: عملاء B2B جدد لوكالتك، وتجهيز رسائل واتساب):

  > بعد إذنكم، وصلة بتلاقي عملاء جدد لوكالات التسويق وتجهز رسايل واتساب مخصصة لكل عميل عشان تتواصلوا معاهم بسرعة. عملاءكم بيشكروا في شغلكم في التسويق عبر الإنترنت. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟
  > محمد من وصلة

## 4. Valuable data the spec does not use yet

Used since round 2 (free, already in the place data): Maps search rank, all categories (specialty), the rating distribution, and a social page as "website" (1 of 44 places here). Still unused:

1. **Review bursts.** TeleTarget (cairo): 9 of its latest 10 reviews on 2026-06-11; Essence Adverts (cairo): 5 of its latest 10 reviews on 2025-02-08; فيرست ماركتس - أفضل شركة تسويق إلكتروني وتصميم مواقع ومتاجر إلكترونية (cairo): 9 of its latest 10 reviews on 2026-04-28. Not used in messages (as requested); useful later as a trust fact about a rating.
2. **Owner reply content.** 51 reviews have an owner reply; 4 of them are long and defensive (over 300 characters). Reply tone separates owners who care about reputation from copy-paste repliers.
3. **Reviewer language and local-guide share.** 22% of the fetched reviews are not in Arabic, and 26% come from Local Guides. The language mix says whether a business serves expats or international clients.
4. **Opening hours.** 24-hour claims and Friday/Saturday hours show who is reachable when; the send window could prefer hours when the business is open.
5. **`claimThisBusiness` + photos + hours together** make a free "Maps readiness" fact.
