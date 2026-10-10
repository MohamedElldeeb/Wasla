# Insights review (fixtures, no Apify)

Generated 2026-10-10 by `scripts/fixtures-run.mjs` + `scripts/insights-review.mjs`. The REAL n8n Code nodes ran on the saved real-run fixtures (`docs/samples/fixtures/`), with live OpenRouter calls for the LLM steps (planner openai/gpt-4o-mini, writer openai/gpt-4o-mini; 44 calls, about $0.00881). **Offer used:** "Wasla finds B2B clients for agencies and sends personalized WhatsApp messages". "Today" for time-based facts is 2026-10-10.

## 0. What the planner produced for this offer

- **Ideal prospect:** Marketing and advertising agencies in Egypt looking to quickly connect with new B2B clients.
- **Search phrases (max 4):** وكالات تسويق · Advertising agencies · وكالات دعاية · Marketing firms
- **Synonyms for later rounds:** مستقلين · Freelancers · وكالات إعلانات · Ad agencies
- **Allowed Maps categories:** وكالة تسويق · Marketing agency · وكالة دعاية · Advertising agency · مستقل · Freelancer · وكالة إعلانات · Ad agency
- **Signals:** activity (25) · review_insights (25) · owner_engagement (-25)
- **Opportunity map:** new_business · low_owner_engagement
- **Complaints the offer can help with:** Many agencies struggle to find suitable clients quickly.

## 1. Funnel: alexandria

| Step | Places |
|---|---|
| Found by the search (fixture) | 24 |
| Removed: government, utilities, education, hospitals, worship, embassies, military | −4 |
| Removed: closed | −0 |
| Removed: outside the allowed categories and not judged clearly fit | −0 |
| Removed: other filters / landline filter | −0 |
| Sent to the LLM fit check (inside or outside the categories) | 20 |
| Removed: not fit (never charged) | −7 |
| **Delivered (fit or maybe)** | **11** |

No minimum-reviews or mobile-only filter was applied (both are off by default now).

### Every place: gate verdict and fit label

"Fit check (all)" is a second opinion run on EVERY place, including those the deterministic gates removed, so you can see what the gates would have missed or over-removed.

| # | Place | Maps category | Gate | Fit check (all): label, reason | Result |
|---|---|---|---|---|---|
| 1 | Scitecs | وكالة تسويق | pass | fit: وكالة تسويق تبحث عن عملاء B2B. | **delivered** (fit) |
| 2 | سنجر سابقا | خدمة وسائل النقل | outside categories → fit check decides | not_fit: خدمة نقل، ليست وكالة تسويق. | removed: not fit |
| 3 | The Marketing house | وكالة تسويق | pass | fit: وكالة تسويق تبحث عن عملاء B2B. | **delivered** (fit) |
| 4 | شركة لافينوس للتسويق الالكتروني | وكالة تسويق | pass | fit: وكالة تسويق تبحث عن عملاء B2B. | **delivered** (maybe) |
| 5 | Promo Marketing Agency | وكالة تسويق | pass | fit: وكالة تسويق تبحث عن عملاء B2B. | **delivered** (fit) |
| 6 | Ocd | وكالة تسويق | pass | fit: وكالة تسويق تبحث عن عملاء B2B. | **delivered** (maybe) |
| 7 | مكتب الاسكندرية للاستشارات القانونية | شركة محاماة | outside categories → fit check decides | not_fit: شركة محاماة، ليست وكالة تسويق. | removed: not fit |
| 8 | مكتب البهنساوي للمحاماة و الاستشارات القانونية | محام عام | outside categories → fit check decides | not_fit: محاماة، ليست وكالة تسويق. | removed: not fit |
| 9 | مكتب المستشار /عصام حمزه الاسيوطي للمحاماة و الاستشارات القانونية | مكتب الشركات | outside categories → fit check decides | not_fit: مكتب شركات، ليست وكالة تسويق. | removed: not fit |
| 10 | معهد تكنولوجيا المعلومات - ITI | جامعة | global:education | not_fit: جامعة، ليست وكالة تسويق. | removed: global:education |
| 11 | Alexandria Business Association | مكتب حكومي | global:government | not_fit: مكتب حكومي وليس وكالة تسويق. | removed: global:government |
| 12 | كلية الأعمال - جامعة الإسكندرية | كلية | global:education | not_fit: كلية تعليمية وليست وكالة تسويق. | removed: global:education |
| 13 | ALSHEHAB لخدمات رجال الأعمال | خدمة إدارة الأعمال | outside categories → fit check decides | maybe: خدمة إدارة الأعمال قد تحتاج تسويق. | removed: outside the allowed categories and not clearly fit |
| 14 | Icons Co-working Space | منطقة عمل جماعي | outside categories → fit check decides | maybe: منطقة عمل جماعي، قد تتعاون مع وكالات. | **delivered** (fit, category learned) |
| 15 | Kite Business Space | منطقة عمل جماعي | outside categories → fit check decides | maybe: منطقة عمل جماعي، ممكن تتعامل مع وكالات. | **delivered** (fit, category learned) |
| 16 | Espaces - Alexandria | منطقة عمل جماعي | outside categories → fit check decides | maybe: منطقة عمل جماعي، قد تكون لها علاقات تسويقية. | **delivered** (fit, category learned) |
| 17 | Jenica Agency | وكالة تسويق | pass | fit: وكالة تسويق وإعلانات، تتناسب مع العرض. | **delivered** (fit) |
| 18 | بالم هيلز للتنمية | مكتب الشركات | outside categories → fit check decides | maybe: مكتب شركات، قد يحتاج خدمات تسويقية. | removed: not fit |
| 19 | المتحدة للاسكان والتعمير | مكتب الشركات | outside categories → fit check decides | maybe: مكتب شركات، ممكن يحتاج تسويق. | removed: not fit |
| 20 | Carnival Trading | مكتب الشركات | outside categories → fit check decides | maybe: مكتب شركات، قد يحتاج خدمات تسويقية. | removed: not fit |
| 21 | Talent Idea Advertising Agency | وكالة إعلانية | pass | fit: وكالة إعلانات تبحث عن عملاء B2B. | **delivered** (maybe) |
| 22 | Digitopia Agency | وكالة تسويق | pass | fit: وكالة تسويق تسعى للتواصل مع عملاء جدد. | **delivered** (fit) |
| 23 | كلية الحاسبات وعلوم البيانات جامعة الإسكندرية | كلية | global:education | not_fit: كلية تعليمية، ليست وكالة تسويق أو إعلان. | removed: global:education |
| 24 | AIT Systems | شركة برمجيات | outside categories → fit check decides | not_fit: شركة برمجيات، ليست وكالة تسويق أو إعلان. | removed: outside the allowed categories and not clearly fit |

### Scores of the delivered leads

**Excluded (13):**

- سنجر سابقا: category "خدمة وسائل النقل" is outside the allowed list and the fit check did not call it a clear fit (not_fit: خدمة نقل، ليست وكالة تسويق.); the name is never used on its own
- مكتب الاسكندرية للاستشارات القانونية: category "شركة محاماة" is outside the allowed list and the fit check did not call it a clear fit (not_fit: شركة محاماة، ليست وكالة تسويق.); the name is never used on its own
- مكتب البهنساوي للمحاماة و الاستشارات القانونية: category "محام عام" is outside the allowed list and the fit check did not call it a clear fit (not_fit: محاماة، ليست وكالة تسويق.); the name is never used on its own
- مكتب المستشار /عصام حمزه الاسيوطي للمحاماة و الاستشارات القانونية: category "مكتب الشركات" is outside the allowed list and the fit check did not call it a clear fit (not_fit: مكتب شركات، ليست وكالة تسويق.); the name is never used on its own
- معهد تكنولوجيا المعلومات - ITI: global exclusion (education) by category "جامعة"
- Alexandria Business Association: global exclusion (government) by category "مكتب حكومي"
- كلية الأعمال - جامعة الإسكندرية: global exclusion (education) by category "كلية"
- ALSHEHAB لخدمات رجال الأعمال: category "خدمة إدارة الأعمال" is outside the allowed list and the fit check did not call it a clear fit (maybe: خدمة إدارة الأعمال قد تحتاج تسويق.); the name is never used on its own
- بالم هيلز للتنمية: category "مكتب الشركات" is outside the allowed list and the fit check did not call it a clear fit (maybe: مكتب شركات، قد يحتاج خدمات تسويقية.); the name is never used on its own
- المتحدة للاسكان والتعمير: category "مكتب الشركات" is outside the allowed list and the fit check did not call it a clear fit (maybe: مكتب شركات، ممكن يحتاج تسويق.); the name is never used on its own
- Carnival Trading: category "مكتب الشركات" is outside the allowed list and the fit check did not call it a clear fit (maybe: مكتب شركات، قد يحتاج خدمات تسويقية.); the name is never used on its own
- كلية الحاسبات وعلوم البيانات جامعة الإسكندرية: global exclusion (education) by category "كلية"
- AIT Systems: category "شركة برمجيات" is outside the allowed list and the fit check did not call it a clear fit (not_fit: شركة برمجيات، ليست وكالة تسويق أو إعلان.); the name is never used on its own

**Kept, with the new opportunity score:**

| Lead | Score | Why (favorable signals) | Cap applied |
|---|---|---|---|
| Scitecs | — | (none favorable: a low score is a real result) |  |
| The Marketing house | — | (none favorable: a low score is a real result) |  |
| شركة لافينوس للتسويق الالكتروني | 13 | (none favorable: a low score is a real result) |  |
| Promo Marketing Agency | — | (none favorable: a low score is a real result) |  |
| Ocd | — | (none favorable: a low score is a real result) |  |
| Jenica Agency | 53 | نشط: تقييمات حديثة |  |
| Talent Idea Advertising Agency | — | (none favorable: a low score is a real result) |  |
| Digitopia Agency | 50 | نادرًا ما يرد على التقييمات |  |
| Icons Co-working Space | 47 | نشط: تقييمات حديثة |  |
| Kite Business Space | 60 | نشط: تقييمات حديثة · نادرًا ما يرد على التقييمات |  |
| Espaces - Alexandria | 67 | نشط: تقييمات حديثة · نادرًا ما يرد على التقييمات |  |

## 1. Funnel: cairo

| Step | Places |
|---|---|
| Found by the search (fixture) | 20 |
| Removed: government, utilities, education, hospitals, worship, embassies, military | −2 |
| Removed: closed | −0 |
| Removed: outside the allowed categories and not judged clearly fit | −0 |
| Removed: other filters / landline filter | −0 |
| Sent to the LLM fit check (inside or outside the categories) | 18 |
| Removed: not fit (never charged) | −7 |
| **Delivered (fit or maybe)** | **8** |

No minimum-reviews or mobile-only filter was applied (both are off by default now).

### Every place: gate verdict and fit label

"Fit check (all)" is a second opinion run on EVERY place, including those the deterministic gates removed, so you can see what the gates would have missed or over-removed.

| # | Place | Maps category | Gate | Fit check (all): label, reason | Result |
|---|---|---|---|---|---|
| 1 | فيرست ماركتس - أفضل شركة تسويق إلكتروني وتصميم مواقع ومتاجر إلكترونية | وكالة تسويق | pass | fit: وكالة تسويق تبحث عن عملاء B2B. | **delivered** (fit) |
| 2 | ماركترمارت | خدمة التسويق عبر الإنترنت | outside categories → fit check decides | fit: خدمة تسويق تستهدف عملاء B2B. | removed: outside the allowed categories and not clearly fit |
| 3 | شركة إنجاز ميديا للتسويق الإلكتروني و تصميم المواقع | خدمة التسويق عبر الإنترنت | outside categories → fit check decides | fit: شركة تسويق إلكتروني تبحث عن عملاء B2B. | removed: outside the allowed categories and not clearly fit |
| 4 | جهاز تنمية المشروعات الصغيرة والمتوسطة والمتناهية الصغر | خدمة تطوير أعمال | outside categories → fit check decides | not_fit: جهة حكومية لا تتعامل مع B2B. | removed: not fit |
| 5 | محطة كهرباء العاصمة الإدارية الجديدة | محطة كهرباء | global:utility | not_fit: محطة كهرباء، ليست وكالة تسويق. | removed: global:utility |
| 6 | Asd Business Solutions | خدمة تطوير أعمال | outside categories → fit check decides | maybe: خدمة تطوير أعمال، قد تكون مهتمة. | removed: not fit |
| 7 | Cairo Marketing Company CMC | مورد معدات | outside categories → fit check decides | not_fit: مورد معدات، ليس وكالة تسويق. | removed: not fit |
| 8 | المصرى للتسويق العقارى بالقاهرة الجديدة | مستشار تسويق | outside categories → fit check decides | maybe: مستشار تسويق، قد يبحث عن عملاء. | **delivered** (fit, category learned) |
| 9 | The Creative Zone | وكالة إعلانية | pass | fit: وكالة إعلانية تبحث عن عملاء B2B. | **delivered** (fit) |
| 10 | B2B Shipping Services | خدمة شحن | outside categories → fit check decides | not_fit: خدمة شحن، ليست وكالة تسويق. | removed: not fit |
| 11 | B2B للاستشارات المالية وخدمات الضرائب | مكتب الشركات | outside categories → fit check decides | fit: استشارات مالية تستهدف عملاء B2B. | **delivered** (fit, category learned) |
| 12 | BDR auto | تاجر سيارات | outside categories → fit check decides | not_fit: تاجر سيارات، ليس وكالة تسويق. | removed: not fit |
| 13 | Essence Adverts | وكالة تسويق | pass | fit: وكالة تسويق تبحث عن عملاء B2B. | **delivered** (fit) |
| 14 | Plus One Up | وكالة تسويق | pass | fit: وكالة تسويق تستهدف عملاء B2B. | **delivered** (fit) |
| 15 | ripplemark Egypt | وكالة تسويق | pass | fit: وكالة تسويق تقدم خدمات B2B. | **delivered** (fit) |
| 16 | 2B | متجر أجهزة إلكترونية | outside categories → fit check decides | not_fit: متجر إلكترونيات، ليس وكالة تسويق. | removed: not fit |
| 17 | iCall Outsourcing | مركز الاتصالات | outside categories → fit check decides | not_fit: مركز اتصالات، ليس وكالة تسويق. | removed: outside the allowed categories and not clearly fit |
| 18 | TeleTarget | خدمة التسويق عبر الهاتف | outside categories → fit check decides | maybe: خدمة تسويق عبر الهاتف، قد تكون ذات صلة. | **delivered** (fit, category learned) |
| 19 | BD Scientific Office - Egypt | مكتب الشركات | outside categories → fit check decides | not_fit: مكتب شركات، ليس وكالة تسويق. | removed: not fit |
| 20 | معهد السالزيان دون بوسكو | مركز تدريب | global:education | not_fit: مركز تدريب، ليس وكالة تسويق. | removed: global:education |

### 2. Cairo: what is excluded and why, and the new scores

**Excluded (12):**

- ماركترمارت: category "خدمة التسويق عبر الإنترنت" is outside the allowed list and the fit check did not call it a clear fit (fit: خدمة تسويق تستهدف عملاء B2B.); the name is never used on its own
- شركة إنجاز ميديا للتسويق الإلكتروني و تصميم المواقع: category "خدمة التسويق عبر الإنترنت" is outside the allowed list and the fit check did not call it a clear fit (fit: شركة تسويق إلكتروني تبحث عن عملاء B2B.); the name is never used on its own
- جهاز تنمية المشروعات الصغيرة والمتوسطة والمتناهية الصغر: category "خدمة تطوير أعمال" is outside the allowed list and the fit check did not call it a clear fit (not_fit: جهة حكومية لا تتعامل مع B2B.); the name is never used on its own
- محطة كهرباء العاصمة الإدارية الجديدة: global exclusion (utility) by category "محطة كهرباء"
- Asd Business Solutions: category "خدمة تطوير أعمال" is outside the allowed list and the fit check did not call it a clear fit (maybe: خدمة تطوير أعمال، قد تكون مهتمة.); the name is never used on its own
- Cairo Marketing Company CMC: category "مورد معدات" is outside the allowed list and the fit check did not call it a clear fit (not_fit: مورد معدات، ليس وكالة تسويق.); the name is never used on its own
- B2B Shipping Services: category "خدمة شحن" is outside the allowed list and the fit check did not call it a clear fit (not_fit: خدمة شحن، ليست وكالة تسويق.); the name is never used on its own
- BDR auto: category "تاجر سيارات" is outside the allowed list and the fit check did not call it a clear fit (not_fit: تاجر سيارات، ليس وكالة تسويق.); the name is never used on its own
- 2B: category "متجر أجهزة إلكترونية" is outside the allowed list and the fit check did not call it a clear fit (not_fit: متجر إلكترونيات، ليس وكالة تسويق.); the name is never used on its own
- iCall Outsourcing: category "مركز الاتصالات" is outside the allowed list and the fit check did not call it a clear fit (not_fit: مركز اتصالات، ليس وكالة تسويق.); the name is never used on its own
- BD Scientific Office - Egypt: category "مكتب الشركات" is outside the allowed list and the fit check did not call it a clear fit (not_fit: مكتب شركات، ليس وكالة تسويق.); the name is never used on its own
- معهد السالزيان دون بوسكو: global exclusion (education) by category "مركز تدريب"

**Kept, with the new opportunity score:**

| Lead | Score | Why (favorable signals) | Cap applied |
|---|---|---|---|
| فيرست ماركتس - أفضل شركة تسويق إلكتروني وتصميم مواقع ومتاجر إلكترونية | 50 | نادرًا ما يرد على التقييمات |  |
| The Creative Zone | 50 | نادرًا ما يرد على التقييمات |  |
| Essence Adverts | 63 | نشط: تقييمات حديثة · نادرًا ما يرد على التقييمات |  |
| Plus One Up | 23 | (none favorable: a low score is a real result) |  |
| ripplemark Egypt | — | (none favorable: a low score is a real result) |  |
| المصرى للتسويق العقارى بالقاهرة الجديدة | 44 | نادرًا ما يرد على التقييمات |  |
| B2B للاستشارات المالية وخدمات الضرائب | — | (none favorable: a low score is a real result) |  |
| TeleTarget | 43 | نادرًا ما يرد على التقييمات |  |

## 3. Lead briefs and first messages

For the 8 marketing agencies in the Alexandria fixtures and every kept agency in the Cairo fixtures. Facts are computed in code. Review summaries come from the LLM and show their confidence. Where the fixture has no reviews for a place (the old run dropped those leads before the reviews step), the brief uses the Maps listing only and says so.

### alexandria (9)

#### Scitecs

- **Listing:** وكالة تسويق; قسم سيدى جابر; rating 4.4 from 14 reviews; website yes; phone +20 3 4041116
- **Score:** —
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0; recent avg n/a; listing claimed; photos 3; hours yes; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; built on: general offer):

  > إزاي حالك؟ شفت إنكم في عزبة سعد وعندكم تقييم 4.4، ده شيء ممتاز. إحنا ممكن نساعدكم توصلوا لعملاء B2B بسرعة من خلال خدمة وصلة اللي بتكتب رسائل واتساب شخصية لكل عميل. ممكن نتكلم أكتر عن كده؟ 😊

#### The Marketing house

- **Listing:** وكالة تسويق; قسم سيدى جابر; rating 5 from 1 reviews; website yes; phone +20 15 56666886
- **Score:** —
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0; recent avg n/a; listing claimed; photos 1; hours yes; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid, after one automatic retry; built on: general offer):

  > إزاي الحال؟ أنا شفت إن وكالة The Marketing house عندها تقييم ٥ في مجال التسويق. إحنا في وصلة بنساعد الوكالات زيكم في الوصول لعملاء B2B بسرعة، وكمان بنكتب رسائل واتساب شخصية لكل عميل. ده ممكن يسهّل عليكم التواصل مع العملاء الجدد. ممكن نتكلم أكتر عن الموضوع ده؟ 😊

#### شركة لافينوس للتسويق الالكتروني

- **Listing:** وكالة تسويق; قسم سيدى جابر; rating 5 from 11 reviews; website no; phone +20 10 27669962
- **Score:** 13 · fit: maybe
- **Facts (code):** activity dormant (last review 2024-08-03, 798 days ago); 10 reviews fetched (6 with text); owner reply rate 60%; low (1-2★) reviews 0, unanswered 0; recent avg 5; listing claimed; photos 27; hours yes; new business: unknown (never assumed old)
- **What customers say (high confidence, 6 texts):** Lavenus Digital Marketing Company is highly appreciated by customers for its quality of work and commitment to deadlines. There are no notable complaints.
  - Praised: التعامل الرائع (1), جودة العمل (2), الالتزام بالمواعيد (3), أفكار إبداعية (2)
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; built on: general offer):

  > إزايك؟ عرفت إن شركة لافينوس في كليوباترا عندها تصنيف 5، حاجة رائعة! إحنا في وصلة بنساعد وكالات التسويق في الوصول لعملاء B2B بسرعة، وكمان بنكتب رسائل واتساب شخصية لكل عميل. ممكن نكتشف سوا إزاي نساعدكم في توسيع قاعدة عملاءكم؟ 😊

#### Promo Marketing Agency

- **Listing:** وكالة تسويق; محرم بك; rating 5 from 4 reviews; website yes; phone +20 15 55418907
- **Score:** —
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0; recent avg n/a; listing claimed; photos 0; hours yes; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; built on: general offer):

  > إحنا بنقدّم خدمة وصلة، اللي بتساعد الوكالات زيكم في الوصول لعملاء B2B بسرعة. عرفت إنكم في منطقة الباب الجديد ومنشا وعندكم تقييم 5. ممكن نستفيد من الخبرات المختلفة؟ عايز أسمع رأيكم في الموضوع.

#### Ocd

- **Listing:** وكالة تسويق; اللبان; rating 5 from 2 reviews; website no; phone +20 10 27188476
- **Score:** — · fit: maybe
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0; recent avg n/a; listing claimed; photos 4; hours no; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; built on: general offer):

  > إزايك؟ إحنا عايزين نساعدك في وكالتكم "Ocd". زي ما شفتوا، عندكم تقييم 5 نجوم، و ده معناه إنكم قادرين على تقديم خدمة ممتازة. وصلة بتساعدكم توصلوا لعملاء B2B بسرعة وكفاءة عن طريق رسائل واتساب شخصية. ممكن نتكلم عن فرص التعاون؟ 😊

#### Jenica Agency

- **Listing:** وكالة تسويق; قسم سيدى جابر; rating 4.8 from 16 reviews; website yes; phone +20 10 00953137
- **Score:** 53
- **Facts (code):** activity active (last review 2026-07-19, 83 days ago); 10 reviews fetched (3 with text); owner reply rate 40%; low (1-2★) reviews 1, unanswered 0; recent avg 4.6; listing claimed; photos 9; hours yes; new business: unknown (never assumed old)
- **What customers say (medium confidence, 3 texts):** Jenica Agency received positive reviews for its professionalism and high expertise. There are no recorded complaints.
  - Praised: فريق محترف (3), خبرة عالية (2), تفكير مبتكر (1), تجربة ممتازة (1)
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; built on: general offer):

  > لقيت وكالة جنيكا في سيدي جابر وأعرف إن تقييمهم عالي. عايزين نساعدكم توصلوا لعملاء B2B بسرعة وبدون تعب. إحنا في وصلة بنكتب رسائل واتساب شخصية لكل عميل عشان تقدروا تتواصلوا مع العملاء الجدد بسهولة. ممكن نناقش الفكرة؟ 😊

#### Talent Idea Advertising Agency

- **Listing:** وكالة إعلانية; قسم سيدى جابر; rating 5 from 1 reviews; website yes; phone +20 10 60771121
- **Score:** — · fit: maybe
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0; recent avg n/a; listing claimed; photos 0; hours yes; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; built on: general offer):

  > إحنا بنساعد الوكالات الإعلانية زي Talent Idea في سيدي جابر إنهم يوصلوا لعملاء B2B بسرعة. وصلة بتكتب رسائل واتساب شخصية لكل عميل عشان تواصلهم يبقى أسهل. ممكن نتكلم عن الموضوع أكتر؟

#### Digitopia Agency

- **Listing:** وكالة تسويق; قسم سيدى جابر; rating 3.8 from 16 reviews; website yes; phone +20 15 01177375
- **Score:** 50
- **Facts (code):** activity slowing (last review 2025-10-12, 363 days ago); 10 reviews fetched (2 with text); owner reply rate 0%; low (1-2★) reviews 5, unanswered 5; recent avg 3; listing claimed; photos 23; hours yes; new business: unknown (never assumed old)
- **What customers say (low confidence, 2 texts):** Reviews praise the creative thinking and great teams at Digitopia Agency. There are no recorded complaints.
  - Praised: تفكير إبداعي (1), فرق رائعة (1)
- **Top opportunities (planner's map, real evidence):** low_owner_engagement [strength 3]: owner replied to 0% of the latest 10 reviews
- **First message** (valid, after one automatic retry; built on: low_owner_engagement):

  > إزاي الحال؟ عرفت إن وكالة Digitopia بتشتغل في التسويق في سيدي جابر. إحنا في وصلة بنساعد الوكالات في الوصول لعملاء B2B بسرعة وبتواصل شخصي. تعزيز التواصل مع العملاء ممكن يزيد من رضاهم بشكل ملحوظ. ممكن نتناقش أكتر عن الموضوع؟ 😊

#### AIT Systems

- **Listing:** شركة برمجيات; قسم سيدى جابر; rating 5 from 37 reviews; website yes; phone +20 12 00007043
- **Not delivered by the pipeline:** did not pass the gates (shown for completeness)
- **Score:** —
- **Facts (code):** activity active (last review 2026-10-04, 6 days ago); 10 reviews fetched (10 with text); owner reply rate 0%; low (1-2★) reviews 0, unanswered 0; recent avg 5; listing claimed; photos 1; hours yes; new business: unknown (never assumed old)
- **What customers say:** not analysed
- **Top opportunities (planner's map, real evidence):** low_owner_engagement [strength 3]: owner replied to 0% of the latest 10 reviews

### cairo (8)

#### فيرست ماركتس - أفضل شركة تسويق إلكتروني وتصميم مواقع ومتاجر إلكترونية

- **Listing:** وكالة تسويق; مدينة نصر; rating 4.8 from 83 reviews; website yes; phone +20 10 04417918
- **Score:** 50
- **Facts (code):** activity slowing (last review 2026-04-30, 163 days ago); 10 reviews fetched (9 with text); owner reply rate 0%; low (1-2★) reviews 0, unanswered 0; recent avg 5; listing claimed; photos 36; hours yes; new business: unknown (never assumed old)
- **What customers say (high confidence, 9 texts):** Customers of First Markets value professionalism and collaboration in project execution. There are no recorded complaints.
  - Praised: التعاون (1), احترافية التنفيذ (1), فهم السيو (1), نتائج سوشيال ميديا (1)
- **Top opportunities (planner's map, real evidence):** low_owner_engagement [strength 3]: owner replied to 0% of the latest 10 reviews
- **First message** (valid; built on: low_owner_engagement):

  > آه، شفت إنكم من "فيرست ماركتس" في المنطقة الأولى، وتقييمكم 4.8 ممتاز! إحنا في وصلة بنساعد الوكالات زيكم في التواصل مع عملاء B2B عن طريق كتابة رسائل واتساب شخصية لكل عميل. ده ممكن يساعدكم تزيدوا من رضا العملاء عندكم. ممكن نتكلم أكتر عن الموضوع؟

#### The Creative Zone

- **Listing:** وكالة إعلانية; 5th Settlement; rating 4.9 from 49 reviews; website yes; phone +20 10 99988114
- **Score:** 50
- **Facts (code):** activity slowing (last review 2026-03-12, 212 days ago); 10 reviews fetched (4 with text); owner reply rate 0%; low (1-2★) reviews 0, unanswered 0; recent avg 5; listing claimed; photos 27; hours yes; new business: unknown (never assumed old)
- **What customers say (medium confidence, 4 texts):** The Creative Zone received positive reviews for its professionalism and cleanliness. There are no recorded complaints.
  - Praised: احترافية (1), أفضل في السوق (2), مساحات منظمة (1), نظافة (1)
- **Top opportunities (planner's map, real evidence):** low_owner_engagement [strength 3]: owner replied to 0% of the latest 10 reviews
- **First message** (valid; built on: low_owner_engagement):

  > إزاي الأمور في The Creative Zone دلوقتي؟ 😄 إحنا هنا في وصلة بنساعد الوكالات زيكم في العثور على عملاء B2B بسهولة. التواصل السريع مع العملاء الجدد ممكن يزيد من رضاهم بشكل كبير. تحب تعرف أكتر عن الطريقة اللي بنشتغل بيها؟

#### Essence Adverts

- **Listing:** وكالة تسويق; قسم المعادي; rating 4.6 from 49 reviews; website yes; phone +20 10 01588828
- **Score:** 63
- **Facts (code):** activity active (last review 2026-10-06, 4 days ago); 10 reviews fetched (2 with text); owner reply rate 10%; low (1-2★) reviews 0, unanswered 0; recent avg 5; listing claimed; photos 9; hours yes; new business: unknown (never assumed old)
- **What customers say (low confidence, 2 texts):** Customers of Essence Adverts praise the quality of production and professionalism. There are no recorded complaints.
  - Praised: جودة الإنتاج (2), الاحترافية (2), الاهتمام بالتفاصيل (1), الإبداع (1)
- **Top opportunities (planner's map, real evidence):** low_owner_engagement [strength 2]: owner replied to 10% of the latest 10 reviews
- **First message** (valid; built on: low_owner_engagement):

  > أحب أقول إن تقييمكم 4.6 هو حاجة مميزة، وده بيعكس ثقة عملائكم فيكم. إحنا في وصلة ممكن نساعدكم في تعزيز التواصل مع عملاء جدد عن طريق كتابة رسائل واتساب شخصية لكل عميل. ده ممكن يساعدكم في زيادة رضاهم. ممكن نتكلم شوية عن الموضوع؟ 😊

#### Plus One Up

- **Listing:** وكالة تسويق; المعصرة; rating 5 from 16 reviews; website yes; phone +20 11 15173395
- **Score:** 23
- **Facts (code):** activity slowing (last review 2026-05-16, 147 days ago); 10 reviews fetched (6 with text); owner reply rate 80%; low (1-2★) reviews 0, unanswered 0; recent avg 5; listing claimed; photos 5; hours yes; new business: unknown (never assumed old)
- **What customers say (high confidence, 6 texts):** Customers of Plus One Up praise their creative team and new ideas. There are no recorded complaints.
  - Praised: فريق مبدع (5), أفكار جديدة (2), تطور مستمر (2), وقت ثمين (1)
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; built on: general offer):

  > إحنا في وصلة بنساعد الوكالات زي Plus One Up في منشأة ناصر، نوفر ليهم عملاء B2B بشكل أسرع. عندنا إمكانية كتابة رسائل واتساب شخصية تصل مباشرة للعملاء الجدد. ممكن تكون طريقة جيدة ليك عشان توصل لعملاء مناسبين وتكبر شغلك. تحب نناقش الفكرة؟ 😊

#### ripplemark Egypt

- **Listing:** وكالة تسويق; قسم المعادي; rating 4.6 from 31 reviews; website yes; phone +20 2 25211510
- **Score:** —
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0; recent avg n/a; listing claimed; photos 6; hours yes; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; built on: general offer):

  > إنتو في منطقة معادي السرايات الغربية، وده مكان حلو لفرص التسويق. إحنا في وصلة بنساعد الوكالات زي وكالتكم في توصيلهم لعملاء B2B بسرعة، وكمان بنكتب رسائل واتساب شخصية لكل عميل. ده هيخليكم تلاقوا عملاء جدد بشكل أسرع. ممكن نتكلم عن ده كمان؟ 😊

#### المصرى للتسويق العقارى بالقاهرة الجديدة

- **Listing:** مستشار تسويق; قسم أول القاهرة الجديدة; rating 4.3 from 12 reviews; website yes; phone +20 11 21016189
- **Score:** 44
- **Facts (code):** activity dormant (last review 2023-05-31, 1228 days ago); 10 reviews fetched (5 with text); owner reply rate 0%; low (1-2★) reviews 1, unanswered 1; recent avg 4.2; listing UNCLAIMED; photos 0; hours no; new business: unknown (never assumed old)
- **What customers say (medium confidence, 5 texts):** Customers seem to value respect and credibility in this business, but there are complaints about lack of credibility and being too busy.
  - Praised: احترام العملاء (2), مصداقية (1), جودة الخدمة (1), تواصل جيد (1)
  - Complaints seen (shown to you, never put in the message): عدم مصداقية (1), مشغولين جدا (1) ← the offer can help
- **Top opportunities (planner's map, real evidence):** low_owner_engagement [strength 3]: owner replied to 0% of the latest 10 reviews
- **First message** (valid; built on: low_owner_engagement):

  > لقيتكم وانا بدور على شغل في قسم أول القاهرة الجديدة، وشفت إنكم عندكم تقييم 4.3. إحنا في وصلة بنساعد الوكالات زي وكالتكم في التواصل مع عملاء B2B عن طريق رسائل واتساب شخصية. ده ممكن يساعدكم في تعزيز التواصل مع عملاء جدد وزيادة رضاهم. ممكن نتكلم عن ده شوية؟ 🙂

#### B2B للاستشارات المالية وخدمات الضرائب

- **Listing:** مكتب الشركات; قسم النزهة; rating 5 from 1 reviews; website yes; phone +20 2 21923040
- **Score:** —
- **Facts (code):** activity unknown; 0 reviews fetched (0 with text); owner reply rate n/a; low (1-2★) reviews 0, unanswered 0; recent avg n/a; listing claimed; photos 8; hours yes; new business: unknown (never assumed old)
- **What customers say:** no reviews in the fixture for this place
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; built on: general offer):

  > إحنا عارفين إنكم شغالين في مكتب الشركات في النزهة وعندكم تقييم 5! ممكن نساعدكم في الوصول لعملاء B2B بسرعة عن طريق رسائل واتساب شخصية. عايزين نعرف رأيكم في الموضوع؟ 😊

#### TeleTarget

- **Listing:** خدمة التسويق عبر الهاتف; مدينة نصر; rating 4.2 from 21 reviews; website yes; phone +20 10 18550619
- **Score:** 43
- **Facts (code):** activity slowing (last review 2026-06-14, 118 days ago); 10 reviews fetched (6 with text); owner reply rate 20%; low (1-2★) reviews 0, unanswered 0; recent avg 5; listing claimed; photos 15; hours yes; new business: unknown (never assumed old)
- **What customers say (high confidence, 6 texts):** TeleTarget received positive reviews for its professionalism and quality of service. There are no complaints from customers.
  - Praised: فريق محترف (2), تواصل ممتاز (2), نتائج ممتازة (3), خدمة متميزة (2)
- **Top opportunities (planner's map, real evidence):** none of the offer-relevant opportunity types applies
- **First message** (valid; built on: general offer):

  > إزاي حالك؟ أنا شفت إنكم بتقدموا خدمة تسويق عبر الهاتف في العاشرة، وعايز أقولكم إن إحنا هنا بنساعد الوكالات زيكم في التواصل مع عملاء B2B بسرعة. وصلة بتوفر رسائل واتساب شخصية لكل عميل عشان تسهل عليكم الوصول للعملاء الجدد. ممكن نستفيد من خبرتنا سوا؟ 😊

## 4. Data in the fixtures that the spec does not use yet

1. **Review bursts.** TeleTarget (cairo): 9 of its latest 10 reviews on 2026-06-11; Essence Adverts (cairo): 5 of its latest 10 reviews on 2025-02-08; فيرست ماركتس - أفضل شركة تسويق إلكتروني وتصميم مواقع ومتاجر إلكترونية (cairo): 9 of its latest 10 reviews on 2026-04-28. Many reviews on one day is how some businesses solicit or buy reviews. A "review velocity looks organic" fact would help judge whether a high rating can be trusted, and tells us the business already invests in reputation (a buyer for reputation or marketing offers).
2. **Maps search rank** (`rank`, `searchString`): every place records its rank for the query. The median rank in these fixtures is 3. A business that ranks low for its own category query has a visibility problem, which is a strong hook for any marketing or discovery offer, and costs nothing to keep.
3. **Website is a social page.** 1 of 44 places list a Facebook/Instagram/WhatsApp page as their "website". Today they count as "has a website". Treating them as "no real website" gives a more accurate website signal.
4. **Owner reply content.** 51 reviews have an owner reply; 4 of them are long and defensive (over 300 characters, usually answering a 1-star review). Reply tone and length separate owners who care about reputation (good prospects for reputation tools) from copy-paste "thank you" repliers.
5. **Reviewer language and local-guide share.** 22% of the fetched reviews are not in Arabic, and 26% come from Local Guides. The language mix says whether a business serves expats or international clients, which changes the right message language.
6. **Rating distribution** (`reviewsDistribution`) is already in the place data: the share of 1-star reviews over the full history is more reliable than the 10 newest reviews for "how many unhappy customers", and costs no credits.
7. **Opening hours.** 24-hour claims and Friday/Saturday hours show who is reachable when; the send window could prefer hours when the business is open.
8. **Several categories on one listing** (e.g. a software company also listed as marketing, hosting and web design) is a stronger sign of what the business really sells than the primary category; the fit check already reads all categories.
9. **`claimThisBusiness` + photos + hours together** make a "Maps readiness" fact that is free and was the strongest opportunity for several offers here.
