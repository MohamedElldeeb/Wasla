# Model comparison: first WhatsApp message (round 2)

Generated 2026-10-10 by `scripts/model-compare.mjs` (no Apify).

## What changed in round 2
- The generation prompt and validator were rewritten (rules: no rating or stars, no micro-district, no jargon, no time-of-day greeting, one personal detail at most from the lead's specialty or praised themes, benefits only from the offer with an `offer_quote` check, a concrete CTA from the offer profile, a signature, 35 to 70 words, variety of openings). The two reference messages are no longer in the global prompt: they are the Wasla organization's own style_examples (optional per-organization field, empty by default).
- The offer profile for Wasla now has `cta_offer` ("أبعتلكم 10 شركات مناسبة لشغلكم ببلاش") and `sender_name` ("محمد").
- Only the two models you asked for are compared, on the same 10 fixture leads (Cairo and Alexandria marketing agencies kept by the new fit logic). The planner is fixed to Gemini 2.5 Flash, so the planner comparison is dropped.
- Each model got **one attempt** (the real workflow adds one automatic retry on top). "Style audit" re-checks every produced text, including rejected ones, against the rules.

I did not rank the models. The numbers below are objective; the texts are for you to judge.

## Objective results

| | Gemini 2.5 Flash | Claude Haiku 4.5 |
|---|---|---|
| Passed validation first time | 4 / 10 | 5 / 10 |
| Texts with at least one style violation | 6 / 10 | 3 / 10 |
| Different openings (first 5 words) | 10 / 10 | 10 / 10 |
| Average words | 39 | 44 |
| Average latency (s) | 1.9 | 3.3 |
| Cost for 10 messages (USD) | 0.0079 | 0.0333 |
| Tokens per message (avg) | 1662 | 2231 |

## Side by side

For each lead: the angle the pipeline chose (if any opportunity is tied to the offer), then the text from each model.

### 1. فيرست ماركتس - أفضل شركة تسويق إلكتروني وتصميم مواقع ومتاجر إلكترونية (cairo, angle: dormant_activity)

**Gemini 2.5 Flash** — rejected: style:jargon · 42 words · audit: jargon

> أهلا يا فريق فيرست ماركتس، عملاءكم دايماً بيتكلموا عن نتائج السوشيال ميديا اللي بتحققوها. إحنا في وصلة بنلاقي وكالات التسويق عملاء B2B محتاجين خدماتهم بالظبط، وبنكتب لكل عميل رسالة واتساب مخصوصة. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها؟
> محمد من وصلة

**Claude Haiku 4.5** — valid · 46 words

> أهلا يا فريق فيرست ماركتس، عملاءكم دايما بيشكروا في نتائج السوشيال ميديا اللي بتقدموها. إحنا عاملين أداة اسمها وصلة بتجيب لوكالات التسويق شركات محتاجة خدماتها فعلا، ومع كل شركة رسالة جاهزة تتبعت على واتساب. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

### 2. ماركترمارت (cairo, angle: dormant_activity)

**Gemini 2.5 Flash** — valid · 38 words

> أهلا يا فريق ماركترمارت، عملاءكم دايما بيشكروا في فريق عملكم المتعاون. إحنا في وصلة بنساعد وكالات التسويق تلاقي عملاء جدد ومناسبين، وبنجهز لكل عميل رسالة واتساب شخصية. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها؟ محمد من وصلة

**Claude Haiku 4.5** — rejected: style:jargon · 43 words · audit: jargon

> أهلا يا فريق ماركترمارت، عملاءكم دايما بيشكروا في الاحترافية اللي بتقدموها. إحنا بوصلة بنجيب لوكالات التسويق شركات B2B محتاجة خدماتهم فعلا، ومع كل شركة رسالة واتساب شخصية جاهزة تتبعت. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش عشان تشوفوا الفكرة بنفسكم؟ محمد من وصلة

### 3. شركة إنجاز ميديا للتسويق الإلكتروني و تصميم المواقع (cairo, general opening / hook)

**Gemini 2.5 Flash** — rejected: style:own_praise · 40 words · audit: own_praise

> أهلا يا فريق شركة إنجاز ميديا، شغلكم في تصميم المواقع متميز وعملاءكم بيشكروا فيه. إحنا في وصلة بنلاقي لوكالات التسويق شركات جديدة محتاجة خدماتهم، وبنكتب لكل شركة رسالة واتساب مظبوطة. تحبوا نبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟
> محمد من وصلة

**Claude Haiku 4.5** — valid · 46 words

> أهلا يا فريق إنجاز ميديا، عملاءكم دايما بيشكروا في التصاميم والـ SEO اللي بتقدموها. إحنا عاملين أداة اسمها وصلة بتجيب لوكالات التسويق شركات محتاجة خدماتها فعلا، ومع كل شركة رسالة جاهزة تتبعت على واتساب. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

### 4. The Creative Zone (cairo, angle: dormant_activity)

**Gemini 2.5 Flash** — valid · 41 words

> أهلا يا فريق The Creative Zone، عملاءكم دايماً بيشكروا في احترافيتكم. إحنا في وصلة بنلاقي وكالات التسويق عملاء جداد ومناسبين، وبنكتب رسايل واتساب شخصية لكل عميل عشان تتواصلوا معاهم بسرعة. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها؟ محمد من وصلة

**Claude Haiku 4.5** — valid · 45 words

> أهلا يا فريق The Creative Zone، عملاءكم دايما بيشكروا في الاحترافية اللي بتقدموها. إحنا عاملين أداة اسمها وصلة بتجيب لوكالات التسويق شركات محتاجة خدماتها فعلا، ومع كل شركة رسالة جاهزة تتبعت على واتساب. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

### 5. Essence Adverts (cairo, general opening / hook)

**Gemini 2.5 Flash** — rejected: style:own_praise · 44 words · audit: own_praise

> أهلا يا فريق Essence Adverts، شغلكم في إنتاج الفيديو مميز. إحنا في وصلة بنلاقي لوكالات التسويق عملاء جدد ومناسبين ونجهز رسائل واتساب مخصوصة لكل عميل. كده تقدروا توصلوا للشركات اللي محتاجة خدماتكم بسهولة. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها؟ محمد من وصلة

**Claude Haiku 4.5** — rejected: style:assumes_need · 42 words · audit: assumes_need

> أهلا يا فريق Essence Adverts، شغلكم في الإنتاج والفيديو بيحتاج عملاء جدد يقدروا يستفيدوا من خدماتكم. إحنا بنساعد وكالات زي شغلكم تلاقي شركات محتاجة فعلا وتتواصل معاهم براسايل واتساب شخصية. تحبوا نبعتلكم 10 شركات مناسبة لتخصصكم ببلاش تشوفوهم بنفسكم؟ محمد من وصلة

### 6. Plus One Up (cairo, angle: thin_profile)

**Gemini 2.5 Flash** — valid · 43 words

> أهلا يا فريق Plus One Up، عملاءكم دايماً بيشكروا في فريق عملكم والأفكار المختلفة. إحنا بنساعد وكالات التسويق تلاقي عملاء جدد ومناسبين ليها. بنجهز رسايل واتساب شخصية لكل عميل عشان تتواصلوا معاهم بسرعة. ممكن نبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟ محمد من وصلة

**Claude Haiku 4.5** — rejected: style:offer_quote_not_in_offer · 45 words

> أهلا يا فريق Plus One Up، عملاءكم دايما بيشكروا في الأفكار المختلفة اللي بتقدموها. إحنا عندنا أداة اسمها وصلة بتجيب لوكالات التسويق شركات فعلا محتاجة خدماتها، ومع كل شركة رسالة واتساب شخصية جاهزة. تحبوا نبعتلكم 10 شركات مناسبة لتخصصكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

### 7. ripplemark Egypt (cairo, general opening / hook)

**Gemini 2.5 Flash** — rejected: style:jargon,own_praise · 40 words · audit: jargon, own_praise

> أهلا يا فريق ripplemark Egypt، شغلكم في التسويق عبر الإنترنت واضح إنه مميز. إحنا في وصلة بنلاقي لوكالات التسويق عملاء B2B محتاجين شغلهم، ومع كل عميل بنجهز رسالة واتساب مخصوصة. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟ محمد من وصلة

**Claude Haiku 4.5** — rejected: style:jargon,offer_quote_not_in_offer · 42 words · audit: jargon

> أهلا يا فريق ripplemark، شغلكم في التسويق عبر الإنترنت بيحتاج عملاء جدد كتير. إحنا في وصلة بنجيب لكم شركات B2B محتاجة خدماتكم فعلا، ومع كل شركة رسالة واتساب جاهزة تتبعتوها. تحبوا نبعتلكم 10 شركات مناسبة ببلاش الأول تشوفوا إزاي؟ محمد من وصلة

### 8. TeleTarget (cairo, angle: dormant_activity)

**Gemini 2.5 Flash** — rejected: style:word_count_31 · 31 words · audit: word_count_31

> أهلا يا فريق TeleTarget، عملاءكم دايماً بيشكروا في فريقكم المحترف. إحنا بنلاقي عملاء جداد للشركات وبنكتب رسايل واتساب شخصية لكل عميل. تحبوا نبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟ محمد من وصلة

**Claude Haiku 4.5** — valid · 44 words

> أهلا يا فريق TeleTarget، عملاءكم دايما بيشكروا في النتائج الممتازة اللي بتقدموها. إحنا عاملين حاجة اسمها وصلة بتجيب لوكالات التسويق شركات محتاجة خدماتها فعلا، ومع كل شركة رسالة جاهزة تتبعت على واتساب. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

### 9. Scitecs (alexandria, angle: thin_profile)

**Gemini 2.5 Flash** — rejected: style:word_count_32 · 32 words · audit: word_count_32

> أهلا يا فريق Scitecs، إحنا في وصلة بنساعد وكالات التسويق تلاقي شركات محتاجة خدماتها. بنوفر ليكم عملاء جدد ومناسبين وتتواصلوا معاهم بسرعة. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش؟ محمد من وصلة

**Claude Haiku 4.5** — valid · 36 words

> أهلا يا فريق Scitecs، إحنا عاملين أداة اسمها وصلة بتجيب لوكالات التسويق شركات محتاجة خدماتها فعلا، ومع كل شركة رسالة جاهزة تتبعت على واتساب. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

### 10. The Marketing house (alexandria, angle: thin_profile)

**Gemini 2.5 Flash** — valid · 43 words

> أهلا يا فريق The Marketing house، شغلكم في التسويق مهم لكل شركة. إحنا في وصلة بنلاقي للوكالات زيكم شركات مناسبة تحتاج خدماتكم، وبنجهز لكل شركة رسالة واتساب مخصوصة. لو تحبوا تشوفوا إزاي بنشتغل، ممكن أبعتلكم 10 شركات مناسبة لشغلكم ببلاش. محمد من وصلة

**Claude Haiku 4.5** — rejected: style:offer_quote_not_in_offer · 50 words

> أهلا يا فريق The Marketing house، إحنا عاملين أداة اسمها وصلة بتجيب لوكالات التسويق شركات محتاجة خدماتها فعلا، ومع كل شركة رسالة جاهزة تتبعت على واتساب. بدل ما تقعدوا تدوروا على عملاء، ليكم قائمة شركات مناسبة لشغلكم ببلاش تشتغلوا معاهم دلوقتي. ممكن نبعتلكم 10 شركات الأول تجربوا؟ محمد من وصلة

