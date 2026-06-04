# Scenario Profiles

Storyboard design is driven by `brief.json.scenario`.

## ecommerce

Use for 电商、带货、卖点展示、种草、淘宝/抖音/小红书商品短视频.

Goal: prove why the product is worth buying.

Timing: do not force equal durations. Use shorter proof/setup shots and give more time to action/lifestyle shots when they need readable motion. For a 15s five-shot ecommerce video, a typical rhythm is about 2.7s / 3.0s / 3.4s / 3.8s / 2.1s, adjusted by the actual selling points and narration.

Default structure:

| Order | Shot role | Job |
| --- | --- | --- |
| 1-N | Selling point proof | One visual proof per top selling point |
| N+1 | Lifestyle/use scene | Put the product into the buyer's real context |
| N+2 | Product closing | Clean hero frame for price, brand, CTA overlays |

Prompt bias:
- Concrete use actions.
- Clear start/end motion.
- Product identity and color accuracy.
- Ordinary believable people/hands/scenes unless the brand calls for luxury.
- Continuity: keep one model/wardrobe/product identity; move from proof shots to a real-life use scene, then return to a clean hero closing.
- Narration: one short sentence per proof point, then one use-case sentence and one closing sentence.
- Scene library: prefer studio for product proof, school/home/street/playground scenes for real-life proof, clean studio for closing.

## ad

Use for 广告片、投放素材、品牌广告、强记忆点短片.

Goal: make the product memorable and persuasive in a short commercial arc.

Timing: hooks are usually short; benefit magnifiers and closings can hold longer. Generate provider-minimum clips when needed and trim in final assembly.

Default structure:

| Order | Shot role | Job |
| --- | --- | --- |
| 1 | Advertising hook | Strong visual memory point |
| 2 | Product reveal | Product body becomes clear |
| 3 | Emotional scene | Brand mood and desire |
| 4 | Benefit magnifier | Most important benefit in sensory form |
| 5 | Ad closing | Leave room for logo/slogan/CTA overlays |

Prompt bias:
- Stronger lighting and composition than ecommerce.
- One memorable visual motif.
- Less literal explanation, more sensory proof.
- No generated text; all copy is post-production.
- Continuity: define one visual motif in shot 1 and echo it through reveal, emotional scene, benefit magnifier, and closing.
- Narration: default to no voiceover for concept/cinematic ad films. Add short persuasive voiceover only when the user asks for it or the ad is closer to a product explainer.
- Scene library: choose fewer environments, with lighting/motif continuity stronger than literal realism.

## promo

Use for 宣传片、品牌宣传片、产品宣传片、公司/产品价值介绍.

Goal: tell a coherent product or brand story.

Timing: opening and product entry can be brief, while advantage/user-value shots often need more time. Closing should hold long enough for narration and brand information.

Default structure:

| Order | Shot role | Job |
| --- | --- | --- |
| 1 | Context opening | Establish category, world, or user problem |
| 2 | Product entry | Transition from context to product |
| 3 | Core advantages | Show main features/strengths |
| 4 | User value | Show how the product helps the audience |
| 5 | Brand closing | Clean final frame for brand overlays |

Prompt bias:
- More narrative continuity than ecommerce.
- Calm, polished camera language.
- Product and brand value over hard selling.
- Suitable for slightly longer edits and voiceover.
- Continuity: each shot should feel like the next chapter in the same product story.
- Narration: explanatory and smooth, with one idea per shot.
- Scene library: choose context scenes that can support opening, product entry, user value, and closing.
