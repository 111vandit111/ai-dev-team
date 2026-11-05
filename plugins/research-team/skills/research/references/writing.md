# Writing rules: no AI tells

Applies to prose you write for the user: final reports, summaries, commit messages, the research answer, the resume review and rebuild. It does not apply to code, quotes, URLs, paths, tables of data, or text copied from the user's own files.

## Explanations: plain language
Whenever you explain something (what was done, why, how a result was reached, what a finding means), write so a smart reader new to the topic understands it on the first read.
- Use short, common words. "use" not "utilize", "start" not "initiate", "show" not "demonstrate", "because" not "due to the fact that".
- One idea per sentence. Aim for 15-20 words; split anything past 25.
- Say what happened, then why it matters. Put the result first, the detail after.
- Name the actor: "the builder changed the login file", not "changes were made".
- Explain a technical term the first time you use it, in a few plain words ("a race condition, where two actions collide"). Skip jargon the reader doesn't need.
- Use a small concrete example or comparison when an idea is abstract. Keep it true; don't stretch it.
- Prefer a short paragraph or a numbered list of steps over dense text. No stacked clauses, no nested parentheses.
- Don't simplify by dropping facts or by sounding childish. Keep numbers, names, caveats and the real confidence level.

## Gate
Before you show prose, scan it once against the lists below. Count real findings. **6 or fewer: ship it. More than 6: fix them in one pass, then ship.** Never loop more than once. A match is a finding only if the context doesn't excuse it (see Keep).

## P0: always fix
- Chatbot filler: "Great question!", "I hope this helps", "Certainly!", "Let me know if..."
- Cutoff disclaimers ("as of my last update").
- Vague attribution with no source: "experts say", "studies show", "many believe". Name the source or cut the claim.
- Significance inflation on routine facts: "marks a pivotal moment", "a testament to".
- Placeholders left in: `[Your Name]`, `<insert X>`.

## P1: fix before showing
- **Banned words** (and their forms): delve, tapestry, landscape (metaphor), realm, paradigm, embark, beacon, testament, robust, comprehensive, cutting-edge, leverage (verb), pivotal, underscore, meticulous, seamless, game-changer, nestled, vibrant, thriving, showcase, deep dive, unpack, intricate, holistic, actionable, impactful, synergy, ever-evolving, at its core, best practices (as filler), genuinely, truly.
- **Cluster words**: two or more in one paragraph is a finding. harness, navigate, foster, elevate, unleash, streamline, empower, bolster, spearhead, resonate, facilitate, underpin, nuanced, crucial, multifaceted, ecosystem (metaphor), myriad, plethora, encompass, transformative, cornerstone, paramount, poised, burgeoning, quintessential, overarching.
- **Density words**: only when one word repeats 3+ times (or 3% of the words): significant, innovative, effective, dynamic, scalable, compelling, unprecedented, remarkable, sophisticated.
- **Wordy swaps**: "in order to" → "to", "utilize" → "use", "it is important to note that" → cut, "could potentially" → "could".
- **Formulaic frames**: "It's not X, it's Y" (and the two-sentence split version), more than once per piece. "In today's fast-paced world", "In the rapidly evolving...", "Let's dive in", "Let's break this down".
- **Closers**: generic future lines ("The future looks bright"), "worth your time", "thank me later", "the line I keep coming back to", a final paragraph that restates what you just said.
- **Candor theater**: "to be honest", "let's be clear", "I would rather flag this", "full disclosure". State the fact.
- **Bare-noun bullet lists**: 5 or more short adjective+noun items with no verbs. Write sentences or cut.
- **Synonym cycling**: renaming the same thing in each sentence to avoid repeating a word. Repeat the word.

## P2: fix when cheap
- Em dashes and `--`: aim for zero, at most one per 1,000 words. Use a comma, a period or parentheses.
- Bold on more than one phrase per section. Emoji in headings.
- "Moreover", "Furthermore", "Additionally", "In conclusion" as openers.
- "serves as", "features", "boasts" where "is" or "has" works.
- Rule-of-three lists that are padding rather than three real items.
- Every paragraph the same length. Sentences all the same shape.
- Hashtag piles (6+), title-case headings, "-ing" tails that add nothing ("...ensuring a seamless experience").

## Keep (not findings)
- Words inside quotes, code, URLs, identifiers, or the user's own text.
- A technical sense: "robust" in statistics, "leverage" in finance, "harness" as a test harness.
- A hedge that carries real uncertainty ("may", "likely" when that is the confidence level).
- "Actually" that marks a real correction. Three real items in a list of three.
- Plain, neutral wording in technical text. Don't force personality.

## Rewrite rules
1. **Subtract and sharpen; never invent.** Every fact, number, name, date and level of confidence in the rewrite must come from the source or the user. If a specific is missing, leave the vague wording and flag the gap. In a resume, mark it `[?]`.
2. Don't add a speaker the text didn't have: no "in my experience", "I've seen this a hundred times".
3. Don't add manufactured stakes, a foil ("everyone says X, but they're wrong"), or fragments chopped for rhythm.
4. Don't swap one tell for another. Banning "leverage" does not license "harness".
5. If the draft is already clean, return it unchanged.
6. Lead with the answer. No warm-up sentence, no recap of the question.
