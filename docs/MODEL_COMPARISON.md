# Model comparison: first WhatsApp message (round 2)

Generated 2026-10-10 by `scripts/model-compare.mjs` (no Apify).

## What changed in round 2
- The generation prompt and validator were rewritten (rules: no rating or stars, no micro-district, no jargon, no time-of-day greeting, one personal detail at most from the lead's specialty or praised themes, benefits only from the offer with an `offer_quote` check, a concrete CTA from the offer profile, a signature, 35 to 70 words, variety of openings). The two reference messages from the review are used as few-shot style examples marked as written for a different seller.
- The offer profile for Wasla now has `cta_offer` ("أبعتلكم 10 شركات مناسبة لشغلكم ببلاش") and `sender_name` ("محمد").
- Only the two models you asked for are compared, on the same 10 fixture leads (Cairo and Alexandria marketing agencies kept by the new fit logic). The planner is fixed to Gemini 2.5 Flash, so the planner comparison is dropped.
- Each model got **one attempt** (the real workflow adds one automatic retry on top). "Style audit" re-checks every produced text, including rejected ones, against the rules.

I did not rank the models. The numbers below are objective; the texts are for you to judge.

## Objective results

| | Gemini 2.5 Flash | Claude Haiku 4.5 |
|---|---|---|
| Passed validation first time | 8 / 10 | 6 / 10 |
| Texts with at least one style violation | 2 / 10 | 3 / 10 |
| Different openings (first 5 words) | 10 / 10 | 10 / 10 |
| Average words | 40 | 43 |
| Average latency (s) | 1.9 | 3.8 |
| Cost for 10 messages (USD) | 0.0080 | 0.0327 |
| Tokens per message (avg) | 1648 | 2210 |

## Side by side

For each lead: the angle the pipeline chose (if any opportunity is tied to the offer), then the text from each model.

### 1. فيرست ماركتس - أفضل شركة تسويق إلكتروني وتصميم مواقع ومتاجر إلكترونية (cairo, angle: dormant_activity)

**Gemini 2.5 Flash** — valid · 44 words

> أهلا يا فريق فيرست ماركتس، عملاءكم دايما بيشكروا في احترافيتكم في تنفيذ التطبيقات. إحنا عاملين أداة بتلاقي لوكالات التسويق شركات محتاجة خدماتها فعلا. كمان بنجهز لكل شركة رسالة جاهزة تتبعت على واتساب. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

**Claude Haiku 4.5** — rejected: style:own_praise · 42 words · audit: own_praise

> أهلا يا فريق فيرست ماركتس، فريقكم متعاون ودايما بينفذ التطبيقات باحترافية. إحنا في وصلة بنلاقي لوكالات التسويق شركات محتاجة خدماتها فعلا، وبنكتب لكل شركة رسالة واتساب شخصية تتبعت عليها. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تجربوا التواصل معاها؟ محمد من وصلة

### 2. ماركترمارت (cairo, angle: dormant_activity)

**Gemini 2.5 Flash** — valid · 40 words

> أهلا يا فريق ماركترمارت، عملاءكم دايما بيشكروا في فريق العمل والاحترافية عندكم. إحنا بنساعد وكالات التسويق إنها تلاقي شركات جديدة محتاجة خدماتها، وبنجهز لكل شركة رسالة واتساب مخصوصة. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

**Claude Haiku 4.5** — rejected: style:jargon · 43 words · audit: jargon

> أهلا يا فريق ماركترمارت، عملاءكم دايما بيشكروا في احترافية الفريق اللي عندكم. إحنا في وصلة بنوفر لوكالات التسويق شركات B2B محتاجة خدماتها فعلا، ومع كل شركة رسالة واتساب شخصية جاهزة تتبعت. تحبوا نبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

### 3. شركة إنجاز ميديا للتسويق الإلكتروني و تصميم المواقع (cairo, general opening / hook)

**Gemini 2.5 Flash** — valid · 40 words

> أهلا يا فريق شركة إنجاز ميديا، عملاءكم دايما بيشكروا في شغلكم في تصميم المواقع وتحسين محركات البحث. إحنا بنساعد وكالات التسويق تلاقي عملاء جدد ومناسبين وتتواصل معاهم بسرعة. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

**Claude Haiku 4.5** — valid · 54 words

> أهلا يا فريق إنجاز ميديا، عملاءكم دايما بيشكروا في الشغل الاحترافي اللي بتقدموه في التصميم والـ SEO. إحنا عاملين حاجة اسمها وصلة بتجيب لوكالات التسويق زيكم شركات جديدة محتاجة خدماتكم فعلا. كل شركة نبعتها لكم مع رسالة واتساب جاهزة تبعتوها مباشرة. تحبوا نبدأ بـ 10 شركات مناسبة لشغلكم ببلاش تجربوا بيها؟ محمد من وصلة

### 4. The Creative Zone (cairo, angle: dormant_activity)

**Gemini 2.5 Flash** — valid · 45 words

> أهلا يا فريق The Creative Zone، إحنا بنساعد الوكالات إنها تلاقي عملاء جدد ومناسبين وتتواصل معاهم بسرعة. وصلة بتجيب لوكالات الإعلان شركات محتاجة خدماتها فعلاً، ومع كل شركة رسالة جاهزة تتبعت على واتساب. تحبوا نبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

**Claude Haiku 4.5** — rejected: style:jargon · 41 words · audit: jargon

> أهلا يا فريق Creative Zone، بنساعد وكالات إعلانية زيكم تلاقي شركات محتاجة خدماتها فعلا. إحنا بنجيب لكم عملاء B2B جدد ونكتب رسائل واتساب شخصية لكل واحد منهم. لو حابين، أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تبدأوا معاهم دلوقتي. محمد من وصلة

### 5. Essence Adverts (cairo, general opening / hook)

**Gemini 2.5 Flash** — rejected: style:word_count_32,own_praise · 32 words · audit: word_count_32, own_praise

> أهلا يا فريق Essence Adverts، شغلكم في إنتاج الفيديو مميز. إحنا بنساعد وكالات التسويق تلاقي عملاء جدد ومناسبين وتتواصل معاهم بسرعة. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها؟ محمد من وصلة

**Claude Haiku 4.5** — valid · 43 words

> أهلا يا فريق Essence Adverts، شغلكم في الإنتاج والفيديو محتاج عملاء جدد كتير. إحنا في وصلة بنلاقي شركات محتاجة خدمات زي تاعتكم بالظبط، وبنكتب لكل شركة رسالة واتساب شخصية تتبعت ليها. تحبوا نبعتلكم 10 شركات مناسبة لتخصصكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

### 6. Plus One Up (cairo, angle: dormant_activity)

**Gemini 2.5 Flash** — valid · 41 words

> أهلا يا فريق Plus One Up، عملاءكم دايما بيشكروا في فريق عملكم وأفكاركم المختلفة. إحنا بنساعد وكالات التسويق تلاقي شركات محتاجة خدماتها، ومع كل شركة بنجهز رسالة واتساب جاهزة. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

**Claude Haiku 4.5** — valid · 42 words

> أهلا يا فريق Plus One Up، عملاءكم دايما بيشكروا في الأفكار المختلفة اللي بتقدموها. إحنا بنساعد الوكالات تلاقي شركات محتاجة خدماتهم فعلا، وبنكتب لكل شركة رسالة واتساب شخصية تروح ليهم. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

### 7. ripplemark Egypt (cairo, general opening / hook)

**Gemini 2.5 Flash** — valid · 40 words

> أهلا يا فريق ripplemark Egypt، شايف شغلكم واضح جدا في التسويق عبر الإنترنت. إحنا عاملين وصلة عشان نلاقي للوكالات شركات مناسبة محتاجة خدماتهم ونجهز لكل شركة رسالة واتساب مظبوطة. تحبوا نبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها؟
> محمد من وصلة

**Claude Haiku 4.5** — valid · 43 words

> أهلا يا فريق ripplemark Egypt، شغلكم في التسويق عبر الإنترنت بيحتاج عملاء جدد بشكل دوري. إحنا بنساعد وكالات التسويق إنها تلاقي شركات محتاجة خدماتها فعلا، وبنكتب لكل شركة رسالة واتساب شخصية. تحبوا نبعتلكم 10 شركات مناسبة لتخصصكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

### 8. TeleTarget (cairo, angle: dormant_activity)

**Gemini 2.5 Flash** — valid · 39 words

> أهلا يا فريق TeleTarget، عملاءكم دايما بيشكروا في فريقكم المحترف والنتائج الممتازة. إحنا بنلاقي لوكالات التسويق شركات محتاجة خدماتها فعلا، ومع كل شركة بنجهز رسالة واتساب جاهزة. تحبوا نبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

**Claude Haiku 4.5** — rejected: style:offer_quote_not_in_offer · 41 words

> أهلا يا فريق TeleTarget، عملاءكم دايما بيشكروا في النتائج الممتازة اللي بتقدموها. إحنا في وصلة بنساعد وكالات التسويق يلاقوا شركات محتاجة خدماتهم فعلا، وبنكتب لكل شركة رسالة واتساب شخصية. ممكن نبعتلكم 10 شركات مناسبة لتخصصكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

### 9. Scitecs (alexandria, general opening / hook)

**Gemini 2.5 Flash** — rejected: style:jargon,assumes_need · 39 words · audit: jargon, assumes_need

> أهلا يا فريق Scitecs، شغلكم في التسويق محتاج عملاء جدد باستمرار. إحنا في وصلة بنلاقي شركات عملاء B2B مناسبين ليكوا، وبنكتب لكل شركة رسالة واتساب جاهزة ومظبوطة. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟
> محمد من وصلة

**Claude Haiku 4.5** — valid · 38 words

> أهلا يا فريق Scitecs، إحنا في وصلة بنساعد وكالات التسويق تلاقي شركات محتاجة خدماتهم فعلا. بنجيبلكم العملاء المناسبين وبنكتب لكل واحد رسالة واتساب شخصية تتبعت براحتكم. تحبوا نبعتلكم 10 شركات مناسبة لتخصصكم ببلاش تجربوا معاهم؟ محمد من وصلة

### 10. The Marketing house (alexandria, general opening / hook)

**Gemini 2.5 Flash** — valid · 39 words

> أهلا يا فريق The Marketing house، شغلكم في التسويق دايماً بيحتاج عملاء جدد. إحنا بنلاقي لوكالات التسويق شركات محتاجة خدماتها فعلاً، وبنجهز لكل شركة رسالة واتساب مناسبة. تحبوا أبعتلكم 10 شركات مناسبة لشغلكم ببلاش تشوفوها بنفسكم؟ محمد من وصلة

**Claude Haiku 4.5** — valid · 40 words

> أهلا يا فريق The Marketing house، إحنا بنساعد وكالات التسويق يلاقوا شركات محتاجة خدماتهم فعلا. وصلة بتجيبلكم قائمة شركات مناسبة وبتكتب لكل واحدة رسالة واتساب شخصية. لو حابين، أبعتلكم 10 شركات ممكنة لتخصصكم ببلاش تجربوا بيها دلوقتي. محمد من وصلة

