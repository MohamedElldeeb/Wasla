# Model comparison: first WhatsApp message

Generated 2026-10-10 by `scripts/model-compare.mjs` (no Apify). The same 10 fixture leads (Cairo and Alexandria marketing agencies from `docs/samples/fixtures/`), the same production prompt (`n8n/code/gen_build.js`) and the same validator (`gen_validate.js`: 30 to 110 words, no links, at most one emoji kept, and the tact check: no complaints, low ratings or weaknesses). Each model got **one attempt** (the real workflow adds one automatic retry on top). Offer used: "Wasla finds B2B clients for agencies and sends personalized WhatsApp messages".

I did not rank the models. The numbers below are objective; the texts are for you to judge.

## Objective results

| | GPT-4o mini | Gemini 2.5 Flash | Claude Haiku 4.5 |
|---|---|---|---|
| Passed validation first time | 5 / 10 | 10 / 10 | 9 / 10 |
| Average words | 42 | 52 | 38 |
| Average latency (s) | 2.2 | 2.0 | 3.4 |
| Cost for 10 messages (USD) | 0.0018 | 0.0058 | 0.0198 |
| Tokens per message (avg) | 883 | 946 | 1190 |

## Side by side

Opportunity = the angle the lead's message is built on (chosen from the lead's real data, never shown as a complaint in the text).

### 1. فيرست ماركتس - أفضل شركة تسويق إلكتروني وتصميم مواقع ومتاجر إلكترونية (cairo, angle: low_owner_engagement)

**GPT-4o mini** — rejected: tact:claim:سمعت,claim:من افضل · 47 words

> سمعت إنكم من أفضل الوكالات في المنطقة الأولى وكمان عندكم تقييم 4.8، حاجة حلوة! إحنا في وصلة نقدر نساعدكم توصلوا لعملاء B2B بشكل أسرع، ونعمل لكم رسائل واتساب شخصية لكل عميل. تعزيز التواصل مع العملاء ممكن يكون له تأثير كبير على رضاهم. ممكن نتكلم عن كده؟ 😊

**Gemini 2.5 Flash** — valid · 52 words

> صباح الفل عليكم في فيرست ماركتس. بما إنكم في المنطقة الأولى، إحنا "وصلة" بنساعد وكالات التسويق في القاهرة تلاقي عملاء B2B جدد. إحنا بنكتب رسائل واتساب متخصصة لكل عميل، عشان نسهل عليكم التواصل معاهم. ده ممكن يخلي العملاء الجداد يكونوا مبسوطين أكتر من الأول كده. إيه رأيكم نتكلم أكتر عن الموضوع ده؟

**Claude Haiku 4.5** — valid · 36 words

> شغل التسويق والتصاميم في المنطقة الأولى شغل شاق 💪 إحنا في وصلة بنساعد الوكالات زيك تلاقي عملاء B2B مناسبين وتتواصل معاهم بسرعة. الفكرة إن التواصل السريع بيزود رضا العملاء عندك. ممكن نتكلم في الفكرة دي شوية؟

### 2. The Creative Zone (cairo, angle: low_owner_engagement)

**GPT-4o mini** — rejected: tact:claim:سمعت · 47 words

> سمعت إنكم في 5th Settlement، وده مكان معروف بالإبداع! إحنا عندنا وصلة، بنساعد الوكالات زيكم إنكم توصلوا لعملاء B2B بسرعة من خلال رسائل واتساب شخصية. تعزيز التواصل مع العملاء ممكن يزيد من رضاهم، وفي نفس الوقت يفتح لكم أبواب جديدة. ممكن نتكلم أكتر عن الموضوع ده؟ 😊

**Gemini 2.5 Flash** — valid · 57 words

> يا مساء الفل على The Creative Zone!
> بما إنكم في التجمع الخامس، أكيد بتشوفوا شغل كتير ومحتاجين تتواصلوا مع شركات.
> إحنا في Wasla بنساعد وكالات التسويق والدعاية إنهم يلاقوا عملاء B2B جدد ومناسبين ليهم.
> بنوفرلكم كمان رسائل واتساب متفصلة لكل عميل، عشان تضمنوا تواصل سريع ومظبوط.
> إيه رأيكم في فكرة تسهيل التواصل مع عملائكم الجداد بالشكل ده؟

**Claude Haiku 4.5** — valid · 31 words

> The Creative Zone في الـ 5th Settlement؟ تمام التمام 👍 إحنا Wasla، بنساعد وكالات إعلانية زيكم تلاقي عملاء B2B جدد وتتواصل معاهم بسرعة عبر واتساب. ممكن نساعدكم تزيدوا التواصل مع العملاء؟

### 3. Essence Adverts (cairo, angle: low_owner_engagement)

**GPT-4o mini** — valid · 43 words

> إنتو شغالين في مجال التسويق الإبداعي، وده مجال ممتع جدًا. إحنا في وصلة بنساعد وكالات زي بتاعتكم إنهم يوصلوا لعملاء B2B بسرعة، وكمان نكتب رسائل واتساب شخصية لكل عميل. ده ممكن يعزز التواصل مع العملاء ويزود رضاهم. ممكن نتكلم أكتر عن الموضوع؟ 😊

**Gemini 2.5 Flash** — valid · 50 words

> صباح الفل على أهل Essence Adverts!
> بما إنكم وكالة تسويق، إحنا في Wasla بنساعد الوكالات في القاهرة تلاقي عملاء B2B جدد وتتواصل معاهم بطريقة شخصية وسريعة عن طريق رسايل واتساب.
> ده بيخلي التواصل مع العملاء أحسن ويزود رضاهم عن الخدمة.
> ممكن نتكلم أكتر عن إزاي Wasla ممكن تساعدكم في ده؟

**Claude Haiku 4.5** — valid · 36 words

> شفنا Essence Adverts في منطقتكم وملاحظين إن الناس بتثق فيكم 🤝 إحنا في Wasla بنساعد وكالات زي ما تتواصل مع عملاء B2B جدد بسرعة وسهولة. ممكن نكون عونكم في إن تحافظوا على العملاء الحاليين بتواصل أفضل؟

### 4. Plus One Up (cairo)

**GPT-4o mini** — valid · 41 words

> إنتوا في Plus One Up وكالتكم في منشأة ناصر لها سمعة طيبة بجد! إحنا في وصلة بنساعد الوكالات زيكم إنهم يلاقوا عملاء B2B بسرعة من خلال رسائل واتساب شخصية لكل عميل. ممكن نتكلم عن إزاي نساعدكم في توسيع قاعدة عملائكم؟ 😊

**Gemini 2.5 Flash** — valid · 48 words

> يا مساء الخير على Plus One Up! شايف إن نشاطكم في منشأة ناصر كويس أوي. إحنا في Wasla بنساعد الوكالات زيكم إنها تلاقي عملاء B2B جدد وتوصلهم رسائل واتساب متفصلة لكل عميل. ده بيسرع التواصل مع العملاء المحتملين وبيوفر وقت ومجهود. تفتكروا ممكن يكون ده مفيد ليكم إزاي؟

**Claude Haiku 4.5** — valid · 35 words

> Plus One Up في منشأة ناصر، شايفين إن الفريق بتاعكم بيقدم أفكار جديدة فعلاً 💡 إحنا في Wasla بنساعد وكالات زيكم تلاقي عملاء B2B جدد وتتواصل معاهم بشكل شخصي وسريع. ممكن نساعدكم تطلعوا عملاء أكتر؟

### 5. ripplemark Egypt (cairo)

**GPT-4o mini** — rejected: tact:claim:سمعت · 43 words

> إزاي حالكم؟ سمعت إن ريبلمارك مصر موجودة في معادي السرايات الغربية وتقييمكم ٤.٦ يعكس شغل محترم. إحنا في وصلة بنساعد وكالات زيكم في الوصول لعملاء B2B بسرعة وكفاءة من خلال رسائل واتساب شخصية لكل عميل. ممكن نتكلم عن إزاي نساعدكم في كده؟ 😊

**Gemini 2.5 Flash** — valid · 55 words

> يا مساء الفل، إزيك؟ إحنا في Wasla بنساعد شركات التسويق زي ripplemark Egypt إنها تلاقي عملاء جدد يناسبوها. بما إنكم في المعادي، أكيد مهتمين تتواصلوا مع شركات أكتر في المنطقة عندكم أو في القاهرة عمومًا. إحنا بنجهز رسايل واتساب مخصصة لكل عميل عشان توصلوا لأكتر عدد منهم. تحب تعرف تفاصيل أكتر عن إزاي ممكن نساعدكم؟

**Claude Haiku 4.5** — valid · 44 words

> لاحظنا إن ripplemark في معادي بتشتغل في التسويق والدعاية، وعملاء كتير بيقولوا عنكم كويس. إحنا من Wasla، بنساعد الوكالات زيكم تلاقي عملاء B2B جدد وتتواصل معاهم بسهولة عبر واتساب. الفكرة إننا نوفر لكم قائمة عملاء مناسبين ورسايل واتساب شخصية. هل الموضوع ده يهمكم دلوقتي؟

### 6. المصرى للتسويق العقارى بالقاهرة الجديدة (cairo, angle: low_owner_engagement)

**GPT-4o mini** — rejected: tact:claim:سمعت · 47 words

> سمعت إن المصرى للتسويق العقارى يبني سمعة قوية في قسم أول القاهرة الجديدة. إحنا في وصلة بنساعد الوكالات زيكم إنهم يلاقيوا عملاء B2B بسرعة من خلال رسائل واتساب شخصية لكل عميل. تعزيز التواصل مع العملاء ممكن يساعدكم في رفع مستوى رضائهم. ممكن نتكلم أكتر عن كده؟ 😊

**Gemini 2.5 Flash** — valid · 59 words

> صباح الفل! إحنا في Wasla بنلاحظ إن شركات التسويق اللي زيكم في القاهرة الجديدة بيكونوا محتاجين دايمًا طرق جديدة يوصلوا بيها لعملاء B2B.
> إحنا بنساعد الوكالات إنهم يلاقوا عملاء جدد ومناسبين، وبنكتب لهم كمان رسايل واتساب لكل عميل عشان يتواصلوا معاهم بشكل أسرع وأسهل. ده بيخلي التواصل مع العملاء أقوى وبيزود رضاهم.
> إيه رأيك لو نشوف إزاي ممكن نساعدكم؟

**Claude Haiku 4.5** — valid · 45 words

> الحمد لله على التسويق العقاري في القاهرة الجديدة بقى أكتر احتياج! 🚀 إحنا في Wasla بنساعد وكالات زي حضرتك تلاقي عملاء B2B جدد وتتكلم معاهم على الواتس بشكل شخصي وسريع. الموضوع بسيط: أنت تركز على الشغل، إحنا نلاقي لك العملاء المناسبين. ممكن نتكلم شوية دقائق؟

### 7. B2B للاستشارات المالية وخدمات الضرائب (cairo)

**GPT-4o mini** — valid · 45 words

> إزايك! أنا شايف إن مكتب "B2B للاستشارات المالية" عنده تقييم ٥ نجوم، وده واضح إنه بيخليكم في مكانة قوية في النزهة. إحنا بنقدم خدمة بتساعد الوكالات زيكم في الوصول لعملاء B2B بسرعة وكفاءة، وبتكتب رسائل واتساب شخصية لكل عميل. ممكن نتكلم عن فكرة التعاون؟ 😊

**Gemini 2.5 Flash** — valid · 51 words

> صباح الفل عليكم في B2B للاستشارات المالية! إحنا في Wasla بنساعد شركات كتير زيكم هنا في النزهة تلاقي عملاء B2B جدد. بنوفر أدوات بتسهل عليكم التواصل معاهم بسرعة وبتكتبلهم رسايل واتساب متفصلة لكل عميل. ده بيوفر وقت ومجهود كبير عشان تركزوا في شغلكم الأساسي. ممكن نعرف إزاي بتوصلوا لعملائكم الجداد دلوقتي؟

**Claude Haiku 4.5** — valid · 37 words

> النزهة فيها حركة كويسة في المكاتب الاستشارية دلوقتي 💼 إحنا في Wasla بنساعد مكاتب زيك تلاقي عملاء B2B جدد وتكتب لهم رسائل واتساب شخصية ما تاخد وقت. ممكن نتكلم شوية عن إزاي ممكن نساعدك تنمي العملاء بتوعك؟

### 8. TeleTarget (cairo)

**GPT-4o mini** — rejected: tact:claim:سمعنا · 38 words

> إحنا بنحب شغل الوكالات في العاشرة، وسمعنا عن تقييمكم العالي. عايزين نشارككم وصلة، اللي بتساعد الوكالات في الوصول لعملاء B2B بسرعة وبتكتب رسائل واتساب شخصية لكل عميل. ممكن نتكلم كده عن كيفية مساعدتكم في توسيع قاعدة عملائكم؟ 😊

**Gemini 2.5 Flash** — valid · 50 words

> يا مساء الفل على TeleTarget في العاشر! عاملين إيه؟
> إحنا في وصلة بنساعد شركات التسويق في مصر تلاقي عملاء B2B جدد وتتواصل معاهم بطريقة شخصية ومظبوطة.
> الموضوع كله عشان نوفر وقت ومجهود في البحث عن عملاء جدد ونخلي التواصل أسرع وأسهل.
> كنتوا ممكن تكونوا مهتمين تعرفوا إزاي ممكن نشتغل سوا؟

**Claude Haiku 4.5** — valid · 35 words

> TeleTarget شغالة في التسويق عبر الهاتف وسط العاشرة، صح؟ إحنا في Wasla بنساعد وكالات زيك تلاقي عملاء B2B جدد وتكتب رسائل واتساب شخصية ليهم بسرعة. ممكن نتكلم شوية عن إزاي ممكن نساعدك تطور القاعدة دي؟

### 9. Scitecs (alexandria)

**GPT-4o mini** — valid · 34 words

> مبروك على تقييمكم العالي! يبدو إنكم عاملين شغل كويس في عزبة سعد. إحنا في وصلة نساعد الوكالات زيكم إنهم يوصلوا لعملاء B2B بسرعة، من خلال رسائل واتساب شخصية لكل عميل. ممكن نتكلم عن كده؟

**Gemini 2.5 Flash** — valid · 51 words

> صباح الخير! إزيك يا فندم.
> شفت Scitecs على Google Maps إنها وكالة تسويق في عزبة سعد.
> إحنا في Wasla بنساعد الوكالات زيكم إنها تلاقي عملاء B2B جدد وتتواصل معاهم بشكل شخصي وسريع.
> بنكتب رسايل واتساب مخصصة لكل عميل عشان يوصلكم أحسن فرص.
> إيه رأيكم لو وضحنا لحضرتك إزاي Wasla ممكن تساعدكم؟

**Claude Haiku 4.5** — valid · 32 words

> شفنا إن Scitecs في عزبة سعد بتشتغل في التسويق والدعاية. إحنا في Wasla بنساعد الوكالات زيكم تلاقي عملاء B2B جدد وتتواصل معاهم بسرعة عبر رسائل واتساب شخصية. ممكن نساعدكم تزودوا الحجوزات والشغل؟

### 10. The Marketing house (alexandria)

**GPT-4o mini** — valid · 39 words

> إنتوا في وكالة The Marketing house بتشتغلوا في مجال التسويق، وده مش سهل في القاهرة. إحنا ممكن نساعدكوا توصلوا لعملاء B2B بسرعة من خلال رسائل واتساب شخصية لكل عميل. ممكن نتكلم شوية عن كيف نقدر نساعدكم في كده؟ 😊

**Gemini 2.5 Flash** — valid · 50 words

> يا مساء الفل على The Marketing House! إحنا في Wasla بنساعد وكالات التسويق اللي زيكم تلاقي عملاء B2B جدد. عارفين إن الموضوع ده ممكن ياخد وقت ومجهود كبير. إحنا بنوفر عليكم ده وبنبعتلكم رسايل واتساب مخصصة لكل عميل عشان تتواصلوا معاهم بسهولة وسرعة. تفتكروا دي ممكن تكون حاجة مفيدة ليكم؟

**Claude Haiku 4.5** — rejected: tact:claim:سمعنا · 44 words

> سمعنا إن The Marketing house شغالة في المنطقة دي وعندكم شغل كويس. إحنا في Wasla بنساعد الوكالات زيكم تلاقي عملاء B2B جدد وتكتب معاهم واتساب شخصي من أول مرة. الفكرة إننا بنوفر لكم الوقت والجهد في البحث والتواصل. ممكن نقول لكم أكتر عن كده؟


## Planner comparison

The campaign planner (WF0) writes the search phrases, the allowed Google Maps categories, the signals and the opportunity map from the offer profile. It runs on `OPENROUTER_PLANNER_MODEL`, which can differ from the message model. Same prompt (`n8n/code/plan_build.js`), same two unrelated offers, three models, one attempt each.

### Offer: Wasla (finds B2B clients for agencies)

**GPT-4o mini** (6.3s, $0.0006)

- Ideal prospect: Marketing and advertising agencies in Egypt looking for new B2B clients to enhance their business outreach.
- Search phrases: وكالات تسويق · Advertising agencies · وكالات دعاية · Marketing firms
- Allowed categories: وكالة تسويق · Marketing agency · وكالة دعاية · Advertising agency · مستقل · Freelancer
- Signals: activity 50, owner_engagement 25, new_business 50, unclaimed_listing 50
- Opportunities: unclaimed_listing: يمكنك تحسين ظهورك على الإنترنت من خلال توثيق صفحتك. | new_business: استفد من خدماتنا لجذب عملاء جدد بسرعة.
- Complaints the offer can help with: Many agencies struggle to find suitable clients quickly.

**Gemini 2.5 Flash** (7.3s, $0.0036)

- Ideal prospect: وكالة تسويق أو دعاية وإعلان أو مستقل في مصر يبحث عن عملاء B2B جدد ومناسبين ويريد التواصل معهم بفعالية وسرعة.
- Search phrases: وكالة تسويق · شركات دعاية واعلان · Marketing agency · Advertising agency
- Allowed categories: وكالة تسويق · وكالة إعلانات · مستشار تسويق · خدمة تسويق عبر الإنترنت · Marketing Agency · Advertising Agency · Marketing Consultant · Internet Marketing Service
- Signals: review_insights 70, activity 50, unanswered_low_reviews 60, new_business 80, profile_completeness 40, has_website 20
- Opportunities: new_business: نحن نساعد الوكالات الجديدة على بناء قاعدة عملاء قوية من خلال تحديد العملاء المحتملين والتواصل معهم بفعالية. | unanswered_low_reviews: نحن نقدم أدوات تساعد الوكالات على تحسين سمعتها من خلال التواصل الفعال مع العملاء المحتملين والحاليين. | dormant_activity: نحن ننشط تواجد الوكالات على الإنترنت من خلال جلب عملاء B2B جدد وزيادة التفاعل.
- Complaints the offer can help with: الوكالات التي يشتكي عملاؤها من صعوبة التواصل أو عدم الحصول على نتائج كافية في جذب العملاء الجدد.

**Claude Haiku 4.5** (13.2s, $0.0093)

- Ideal prospect: Marketing and advertising agencies, digital marketing firms, and creative studios in Cairo that need a steady stream of qualified B2B clients and want to reach prospects quickly via personalized WhatsApp outreach.
- Search phrases: وكالة تسويق رقمي · digital marketing agency · وكالة إعلان وتسويق · advertising agency Cairo
- Allowed categories: Marketing agency · وكالة تسويق · Advertising agency · وكالة إعلان · Digital marketing service · خدمة التسويق الرقمي · Creative agency · وكالة إبداعية · Public relations agency · وكالة العلاقات العامة · Branding agency · وكالة العلامات التجارية
- Signals: review_insights 35, activity 25, owner_engagement 20, size_proxy 30, profile_completeness 15, unclaimed_listing -20
- Opportunities: unclaimed_listing: Our tool helps you claim and optimize your agency's online presence while simultaneously building your client pipeline through targeted B2B outreach. | dormant_activity: We can reactivate your agency's growth by delivering qualified leads and enabling you to engage prospects with personalized WhatsApp messages at scale. | review_theme: Our lead generation and direct messaging system addresses the core challenge agencies face: finding and contacting the right clients quickly and consistently. | multi_branch: For multi-branch agencies, our platform centralizes lead discovery and personalized outreach across all locations, ensuring no prospect is missed.
- Complaints the offer can help with: Agencies often complain about difficulty finding qualified clients, slow sales cycles, and inefficient outreach—all of which Wasla directly solves through targeted lead discovery and personalized WhatsApp messaging.


### Offer: Tax and accounting firm

**GPT-4o mini** (6.6s, $0.0006)

- Ideal prospect: Small businesses like restaurants, clinics, pharmacies, shops, and factories in Cairo that need help with tax services and electronic invoicing.
- Search phrases: مطاعم · عيادات · صيدليات · محلات
- Allowed categories: مطعم · عيادة · صيدلية · محل · مصنع
- Signals: review_insights 50, activity 25, unanswered_low_reviews 50, new_business 25
- Opportunities: unanswered_low_reviews: يمكننا مساعدتك في تحسين سمعتك من خلال معالجة الشكاوى. | no_website: نقدم خدمات تساعدك في إدارة الفواتير والضرائب بسهولة. | thin_profile: يمكننا مساعدتك في تحسين وجودك الرقمي.
- Complaints the offer can help with: Customers complain about tax complexities and fines.

**Gemini 2.5 Flash** (6.2s, $0.0035)

- Ideal prospect: A small restaurant, clinic, pharmacy, shop, or small factory in Cairo that needs help with taxes, e-invoicing, and bookkeeping due to lack of a dedicated accountant or fear of fines.
- Search phrases: مطعم · عيادة · صيدلية · مصنع صغير
- Allowed categories: Restaurant · مطعم · Clinic · عيادة · Pharmacy · صيدلية · Shop · محل · Factory · مصنع · Medical Clinic · عيادة طبية · Retail Store · متجر بيع بالتجزئة
- Signals: size_proxy -70, new_business 50, unclaimed_listing 40, profile_completeness -30, has_website -20
- Opportunities: new_business: نحن نساعد الشركات الجديدة على تأسيس أنظمة ضريبية ودفترية صحيحة من البداية. | unclaimed_listing: نحن نقدم الدعم الإداري والمالي لتمكين الشركات من التركيز على أعمالها الأساسية. | thin_profile: نحن نساعد الشركات على تنظيم عملياتها الإدارية والمالية لتعزيز كفاءتها.
- Complaints the offer can help with: —

**Claude Haiku 4.5** (11.0s, $0.0093)

- Ideal prospect: A small business in Cairo (restaurant, clinic, pharmacy, retail shop, or small factory) that needs help with tax compliance, e-invoicing, and bookkeeping to avoid penalties and reduce accounting complexity.
- Search phrases: مطاعم القاهرة · عيادات طبية القاهرة · صيدليات القاهرة · محلات تجارية صغيرة القاهرة
- Allowed categories: Restaurant · مطعم · Medical Clinic · عيادة طبية · Pharmacy · صيدلية · Retail Store · متجر بيع بالتجزئة · Small Factory · مصنع صغير · Grocery Store · متجر بقالة
- Signals: review_insights 40, unanswered_low_reviews 35, activity 20, profile_completeness -15, owner_engagement -20, unclaimed_listing 25
- Opportunities: review_theme: Our service handles tax compliance and e-invoicing so you avoid penalties and focus on running your business. | unclaimed_listing: We help small businesses get organized with proper bookkeeping and tax records, starting with a free setup consultation. | unanswered_low_reviews: Our team takes over your accounting burden so you can respond to customers and improve your service quality. | dormant_activity: We set up your e-invoicing and tax system so you can confidently operate and attract more customers without compliance worries.
- Complaints the offer can help with: Customers complain about slow service, disorganization, or closure due to tax issues; the seller's tax, e-invoicing, and bookkeeping services directly prevent penalties and operational chaos.

