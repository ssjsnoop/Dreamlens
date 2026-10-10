/*
 * Dreamlens interpretation engine
 * Pure JS, no dependencies. Works in the browser (window.DreamEngine) and Node (require).
 *
 * How it works (and why):
 *  - Dream content research (Hall & Van de Castle; Domhoff) shows dreams fall into stable,
 *    recurring categories, so we detect those themes from the wording of the dream.
 *  - The continuity hypothesis says dreams mostly mirror waking concerns, and emotion in the
 *    dream is the best clue to what it's about, so we read emotion and let it shape the reading.
 *  - Symbol meanings (Jungian, folk dictionaries) are traditions, not proven facts, so every
 *    reading is labelled as "most likely" with a pattern-match strength, never as certainty.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DreamEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------------------------------------------------------- THEMES */
  // patterns: [regex, weight]. Score = sum(weight * min(count, 2)). A theme needs score >= 2.
  // tone: 'neg' | 'pos' | 'neu' (used to notice when the feeling doesn't match the usual theme)
  const THEMES = [
    {
      id: 'deceased', name: 'A loved one who has died', glyph: '🕯️', tone: 'neu',
      patterns: [
        [/\b(?:dead|late|deceased|passed(?: away)?|died)\b[^.!?]{0,40}\b(?:mom|mum|mother|dad|father|grandma|grandmother|grandpa|grandfather|nana|papa|brother|sister|husband|wife|son|daughter|friend|uncle|aunt|grandparent|baby|child|dog|cat|pet)\b/, 4],
        [/\b(?:mom|mum|mother|dad|father|grandma|grandmother|grandpa|grandfather|nana|papa|brother|sister|husband|wife|son|daughter|friend|uncle|aunt|grandparent|dog|cat)\b[^.!?]{0,40}\b(?:who|that|had|has)\b[^.!?]{0,15}\b(?:died|passed|dead|deceased)\b/, 4],
        [/\b(?:passed away|deceased|late (?:mom|mum|dad|husband|wife|grandma|grandpa|brother|sister|mother|father)|back from the dead|came back to life|alive again|visited me)\b/, 4],
        [/\bmiss(?:ed|ing)? (?:him|her|them)\b/, 1]
      ],
      core: "This is most likely your mind continuing its bond with them. Dreams of loved ones who have died are common and are usually part of grieving and staying connected, not a puzzle to be solved.",
      detail: "Studies of bereaved dreamers find these dreams often contain warmth and comfort, sometimes advice or reassurance, and sometimes the shock of seeing the person alive again. They tend to feel vivid, and the people who have them often say they helped with grief. Many people and traditions also see them as visits. Science can't test that, so hold it in whatever way feels true to you.",
      variants: [
        { when: /\b(?:advice|told me|said to me|message|reassur|warned|spoke to me)\b/, add: "Dreams where they give advice or reassurance are a recognized type. Often they voice your own sense of what they would say, which is still a real inheritance from them." },
        { emo: ['sadness', 'guilt'], add: "If you woke up sad, that is the natural cost of a continuing bond. It doesn't mean something is wrong, and it often softens with time. Unsaid things often surface in these dreams." },
        { emo: ['calm', 'joy'], add: "The warmth you describe fits the most common pattern: the dream gives you a safe place to be with them again." }
      ],
      jung: "Jung treated figures of the dead as part of the inner world too: the dead person can carry qualities, memories and unfinished conversations that still live in you.",
      folk: "Nearly every culture has traditions of the dead visiting through dreams, and many treat these as meaningful and welcome.",
      science: "Dreams of the deceased are a well-documented type. Researchers find they are often positive or comforting and are linked with grief processing, though they can also be upsetting.",
      ask: ["If you could say one thing to them, what would it be?", "What did they feel like in the dream: close, distant, worried, at peace?", "Is there a memory or quality of theirs you're carrying right now?"]
    },
    {
      id: 'chased', name: 'Being chased', glyph: '🏃', tone: 'neg',
      patterns: [
        [/\bchas(?:e|ed|es|ing)\b/, 4],
        [/\b(?:pursu(?:ed|ing|er)|hunted|hunting me|stalk(?:ed|ing|er)|after me|coming after|running from|ran from|run(?:ning)? away from|followed me|following me|trying to (?:catch|get|kill) me)\b/, 3],
        [/\b(?:ran|running|run|fled|fleeing|hid|hiding)\b/, 1]
      ],
      core: "You're likely avoiding something, such as a decision, a conversation, a feeling or a responsibility, that has been gaining on you.",
      detail: "Being chased is one of the most commonly reported threat dreams. The classic reading is that whatever is chasing you stands in for something you'd rather not face right now. Who or what chases you matters: a faceless stranger usually points to a vague pressure or dread, while someone you know points to a specific situation or relationship.",
      variants: [
        { when: /(?:can'?t|could(?:n'?t| not)|unable to) (?:run|move)|legs (?:were |felt |was )?(?:heavy|jelly|stuck|slow)|slow motion|running in (?:place|slow)/, add: "You couldn't run properly, which adds a feeling of being stuck or under-resourced. It's less 'I'm avoiding it' and more 'I don't feel able to deal with it yet.'" },
        { when: /turned (?:around|to face)|faced (?:it|him|her|them)|stopped running|stood (?:my|their) ground|fought back|(?:it|he|she|they) (?:became|turned) (?:friendly|small)/, add: "You turned and faced it. That's a good sign: dreams where you confront the pursuer or the threat resolves are often read as movement toward dealing with the real issue." },
        { when: /got away|escaped|lost (?:him|her|them|it)|woke up before/, add: "Getting away (or waking first) often matches the relief of postponing something rather than solving it." }
      ],
      jung: "Jung would call the pursuer a shadow figure: a rejected or unlived part of you that chases until it is acknowledged. The remedy is to turn around and ask what it wants.",
      folk: "Dream dictionaries: running away from a problem in waking life that needs attention.",
      science: "Threat-simulation research notes that chases and attacks are among the most common threats in dreams. Dreams over-represent danger compared with everyday life.",
      ask: ["What have you been putting off, hoping it will go away?", "If the pursuer could speak, what would it say it wants?", "Who or what in your week feels like it's getting closer?"]
    },
    {
      id: 'falling', name: 'Falling', glyph: '🪂', tone: 'neg',
      patterns: [
        [/\b(?:falling|fell|fallen)\b(?! (?:in love|asleep|apart|behind|for|short|out with))/, 3],
        [/\bfalls? (?:off|down|from|into|through|to)\b/, 3],
        [/\b(?:plummet(?:ed|ing)?|dropp?(?:ed|ing) (?:off|from|through|into)|tumbl(?:ed|ing)|plunge[ds]?|plunging|free ?fall|jolt(?:ed)? awake|woke up (?:right )?(?:before|as|when) i (?:hit|landed))\b/, 3],
        [/\b(?:cliff|ledge)\b/, 1]
      ],
      core: "You're feeling a loss of footing or control somewhere: insecurity, overload, or a situation that feels like it could go wrong.",
      detail: "Falling dreams are among the most universal. The usual reading is anxiety about losing support, status or control. There is also a physical explanation: the falling sensation often hits as you drift into sleep (a 'hypnic jerk'), and your brain can build a falling story around it.",
      variants: [
        { emo: ['calm', 'joy', 'awe'], add: "A calm or exhilarating fall flips the meaning. It points to letting go, releasing something you've been gripping, rather than fear of losing it." },
        { when: /\b(?:hit|landed|crash(?:ed)?|woke up (?:right )?(?:before|as|when) i (?:hit|landed))\b/, add: "Waking just before impact is the classic version, and a very common one, since the jolt is often partly your body." }
      ],
      jung: "Jung would ask what in your conscious attitude is 'too high'. Falling is often read as a bringing-down-to-earth of an inflated plan or pose, or a call to descend into something deeper.",
      folk: "Dream dictionaries: insecurity, or holding too tightly to a situation you could let go of.",
      science: "Falling sensations frequently occur at sleep onset, before the dream-rich REM stage, so many falling dreams are partly a body event.",
      ask: ["Where do you feel unsupported right now?", "Is there something you're gripping that would be okay to release?", "What new goal or risk have you climbed up to recently?"]
    },
    {
      id: 'teeth', name: 'Teeth falling out', glyph: '🦷', tone: 'neg', suppresses: ['falling'],
      patterns: [
        [/\b(?:teeth|tooth|dentist|dental|molars?|gums?|braces)\b/, 3],
        [/\b(?:crumbl(?:ed|ing)|fell out|falling out|loose|wiggl(?:ed|ing)|cracked|spit (?:out|up))\b/, 1]
      ],
      core: "You feel anxious about how you're seen, or worried about losing power or control in some area. It's often tied to appearance, communication or an upcoming change.",
      detail: "Teeth dreams are among the most commonly reported 'typical dreams.' Teeth connect to confidence, communication and aging, so the popular readings are social anxiety, a fear of saying the wrong thing, worry about appearance, or a transition. Losing baby teeth was a step into growing up.",
      variants: [
        { when: /\b(?:toothache|jaw|clench(?:ing|ed)?|grind(?:ing)?|dentist)\b/, add: "If your teeth or jaw have actually been bothering you (clenching, grinding, a dental appointment), the dream may simply be incorporating that physical sensation." }
      ],
      jung: "Symbolically, teeth relate to power, aggression and life-stage transitions. Losing them can mark a loss of 'bite' or an initiation into something new.",
      folk: "Traditional dictionaries: confidence being knocked, social anxiety, or a family or aging worry (it varies a lot by culture).",
      science: "Despite its fame, there's no single proven cause. Links to stress and to waking dental or jaw sensations are plausible but not firmly established.",
      ask: ["Is there something you're worried about saying, or having said?", "Where do you feel your confidence is being tested?", "Is a transition coming up?"]
    },
    {
      id: 'exam', name: 'Being tested or unprepared', glyph: '📝', tone: 'neg',
      patterns: [
        [/\b(?:exams?|tests?|quiz(?:zes)?|finals?|midterms?|grades?|graded|failed|failing|flunk(?:ed)?)\b/, 3],
        [/\b(?:unprepared|not ready|never studied|didn'?t study|forgot (?:to study|about the|the) (?:exam|test|class)|haven'?t (?:studied|been to class)|skipp?ed class|couldn'?t (?:answer|finish)|blank (?:mind|page)|don'?t know (?:any of )?the answers?)\b/, 3],
        [/\b(?:professor|teacher|homework|assignment|semester|syllabus|classroom)\b/, 1]
      ],
      core: "You feel evaluated or under-prepared for something that matters now: a real test, a role, a deadline, or someone's judgment.",
      detail: "This is the classic anxiety dream, and it often shows up decades after school ends. It usually isn't about school at all. School is just the mind's template for 'being judged on whether I'm good enough.' It tends to surface when you face a performance, a review, a new responsibility or heavy self-criticism.",
      variants: [
        { when: /\b(?:passed|aced|did well|got an a|easy)\b/, add: "You did fine in the dream. Dreams where you pass often show more confidence than your worry would suggest." }
      ],
      jung: "Jung would see the examiner as an inner judge, the part of you that sets standards. The dream asks whether those standards are yours or borrowed.",
      folk: "Dream dictionaries: feeling unprepared for the challenges of waking life, or being judged by yourself or others.",
      science: "Nearly everyone has been evaluated at some point, so the school template is a shared one, and the dream reuses it for any current pressure.",
      ask: ["What are you being measured on right now, by others or by yourself?", "Where do you feel you should have prepared more?", "Whose approval is the 'professor' in your life?"]
    },
    {
      id: 'exposed', name: 'Being naked or exposed', glyph: '🫣', tone: 'neg',
      patterns: [
        [/\b(?:naked|nude|no clothes|without clothes|underwear|forgot (?:my )?(?:pants|clothes|shirt)|half[- ]dressed|exposed)\b/, 3],
        [/\b(?:everyone (?:was )?(?:staring|looking|laughing|watching)|embarrass(?:ed|ing)|humiliat(?:ed|ing)|ashamed)\b/, 1]
      ],
      core: "You feel exposed or fear being judged: worried that a flaw, a secret or a lack of preparation will be seen.",
      detail: "Dreaming of being naked in public is a very common 'typical dream.' It tends to appear when you feel vulnerable: a new group, a performance, something you're hiding, or a fear of being 'found out'.",
      variants: [
        { when: /(?:no ?one|nobody) (?:noticed|cared|looked)|didn'?t (?:care|notice)/, add: "Nobody reacting is informative: your fear of exposure may be much bigger than the actual risk." },
        { emo: ['shame'], add: "The embarrassment is the point. The dream stages your fear of being judged so you can feel it safely." }
      ],
      jung: "Jung would call it the persona, your social mask, slipping, and ask what you've been hiding behind it.",
      folk: "Dream dictionaries: vulnerability, shame, or fear of being found out.",
      science: "A widely reported typical dream. Self-conscious emotions are potent triggers for dream content, as they are in waking life.",
      ask: ["Where do you feel you're pretending right now?", "What would be at stake if people saw the real you in this situation?", "Is there something you're hiding that you'd rather share?"]
    },
    {
      id: 'stage', name: 'On stage or being watched', glyph: '🎤', tone: 'neg',
      patterns: [
        [/\b(?:stage|speech|presentation|presenting|audience|performance|perform(?:ing)?|audition|recital|podium|microphone|forgot (?:my )?(?:lines|words)|crowd (?:was )?(?:watching|staring)|everyone (?:was )?(?:watching|staring))\b/, 3]
      ],
      core: "You feel pressure to perform, or a fear of failing in front of others.",
      detail: "Performing dreams (blanking on stage, a speech you can't deliver) track real-life moments where you feel observed and judged. They often arrive before something that matters, or when you've been getting feedback.",
      variants: [],
      jung: "Jung would point to the persona: the part you present publicly. The dream may question how much of you is on display.",
      folk: "Dream dictionaries: social anxiety, fear of being judged, or a wish for recognition.",
      science: "Anticipatory stress about social evaluation commonly shows up in dream content.",
      ask: ["What are you about to 'go on stage' for?", "What would a good-enough performance look like?", "Who in the audience matters most?"]
    },
    {
      id: 'late', name: 'Being late or missing out', glyph: '⏰', tone: 'neg',
      patterns: [
        [/\b(?:late for|running late|(?:was|am|were) late|missed (?:my|the|a)|miss(?:ing)? (?:my|the) (?:flight|train|bus|plane|boat|ride|exam|interview|meeting)|couldn'?t (?:make it|get there|catch)|too late|ran out of time|out of time|hurr(?:y|ied|ying)|rushing)\b/, 3],
        [/\b(?:airport|platform|station|deadline)\b/, 1]
      ],
      core: "You feel behind or worried about missing an opportunity: time pressure, overload, or the fear that a chance is slipping away.",
      detail: "Lateness dreams usually reflect a to-do list that outruns your capacity, or a sense that a window in life is closing. The specific thing you're late for is the clue.",
      variants: [
        { when: /\b(?:packing|suitcase|luggage|forgot (?:to pack|my bag))\b/, add: "Packing trouble or forgotten luggage adds 'I'm not ready for this transition'." }
      ],
      jung: "Jung would ask what part of you is trying to catch up with the life you're living.",
      folk: "Dream dictionaries: missing an important opportunity, or feeling pressured by time.",
      science: "Time pressure is a classic waking concern that dreams readily reuse.",
      ask: ["What are you afraid of missing?", "What's on your plate that you can't keep up with?", "Is the deadline real, or is it a pressure you've put on yourself?"]
    },
    {
      id: 'lost', name: 'Being lost or unsure of direction', glyph: '🧭', tone: 'neg',
      patterns: [
        [/\blost\b(?! (?:my|the|a|his|her) (?:wallet|phone|keys?|purse|bag|ring|passport|ticket|baby|child))/, 3],
        [/\b(?:can'?t find (?:my|the) (?:way|car|room|class|exit|house|door)|wandering|maze|labyrinth|no idea where|don'?t know where (?:i am|i was|to go)|wrong (?:way|turn|bus|train)|dead end|crossroads?|directions)\b/, 3],
        [/\b(?:road|path|journey|fork)\b/, 1]
      ],
      core: "You're unsure of your direction: a decision, a role or the next step in your life feels unclear.",
      detail: "Being lost in a dream is usually about not knowing where to go next in waking life. The setting often matches the area: a school suggests learning or identity, a city suggests social life, a house suggests your inner life.",
      variants: [
        { when: /\b(?:found (?:my|the) way|got (?:there|home|out)|someone (?:showed|helped|guided))\b/, add: "You found your way or got help, which suggests part of you already knows more than you think." }
      ],
      jung: "Jung linked mazes and labyrinths to the winding path of self-discovery, with the center as the self.",
      folk: "Dream dictionaries: feeling directionless or facing a choice.",
      science: "Disorientation is a common dream feature, since dreaming brains blend places loosely. The emotional tone matters more than the map.",
      ask: ["What decision are you circling without choosing?", "What would 'home' look like in this part of your life?", "Who could you ask for directions?"]
    },
    {
      id: 'flying', name: 'Flying', glyph: '🕊️', tone: 'pos',
      patterns: [
        [/\bfl(?:y|ying|ew)\b(?! (?:to|home|out|back|from|on a|in a|with))/, 3],
        [/\b(?:soar(?:ed|ing)?|hover(?:ed|ing)?|levitat(?:e|ed|ing)|glid(?:e|ed|ing)|airborne|above the (?:city|clouds|ground|trees))\b/, 3],
        [/\bfloat(?:ed|ing)? (?:up|above|over|through the air)\b/, 2]
      ],
      core: "You're sensing freedom, capability, or a wish to rise above something that has been weighing on you.",
      detail: "Flying dreams are generally read as feeling in control, expansive or free. They often arrive when you're feeling confident or when you're longing for an escape from limits.",
      variants: [
        { emo: ['fear', 'helpless'], add: "Flying with fear, or struggling to stay up, usually points to ambition mixed with worry about holding it together." },
        { when: /\b(?:couldn'?t|can'?t|struggl|barely|hard to|power lines|low to the ground)\b/, add: "Struggling to stay aloft suggests you want freedom but doubt your resources." },
        { when: /\b(?:lucid|knew i was dreaming|realized i was dreaming)\b/, add: "Flying is among the first things people try once they realize they're dreaming." }
      ],
      jung: "Jung read ascent as spirit, perspective and detachment, but also a risk of inflation if you drift too far from the ground.",
      folk: "Dream dictionaries: freedom, success, or escape.",
      science: "Flying is a typical dream and is especially common in lucid dreams, where people who realize they're dreaming often try it first.",
      ask: ["What would you rise above, if you could?", "Where in your life do you want more freedom?", "Were you in control of the flight?"]
    },
    {
      id: 'water', name: 'Water, waves or drowning', glyph: '🌊', tone: 'neu',
      patterns: [
        [/\b(?:drown(?:ed|ing)?|tsunami|tidal wave|flood(?:ed|ing)?|submerged|underwater|sinking|can'?t breathe|water (?:rising|filling))\b/, 3],
        [/\b(?:water|ocean|sea|waves?|swim(?:ming)?|swam|river|lake|pool|rain|tide|beach|shore)\b/, 2]
      ],
      core: "Water usually stands for your emotional life: what you're feeling right now and how much of it you can handle.",
      detail: "Across dream traditions, water maps to emotion. The state of the water is the clue to the state of your feelings.",
      variants: [
        { when: /\b(?:drown(?:ed|ing)?|tsunami|tidal wave|flood(?:ed|ing)?|submerged|can'?t breathe|water (?:rising|filling)|wave (?:crashed|hit))\b/, add: "Rising water, waves or drowning point to feeling overwhelmed: more emotion or demand than you can comfortably process right now." },
        { when: /\b(?:calm|clear|crystal|still|warm|float(?:ed|ing)|swim(?:ming)?|swam)\b/, add: "Calm, clear or swimmable water suggests emotional ease or flow. You're in your depth." },
        { when: /\b(?:murky|muddy|dark|dirty|cold)\b/, add: "Murky, dark or cold water suggests feelings you can't see clearly or haven't fully looked at." },
        { emo: ['fear', 'helpless'], add: "Fear of the water suggests the feeling it stands for is the thing that scares you." }
      ],
      jung: "Jung treated water as the unconscious itself. Depth equals how far down you're going, and the surface is what you show.",
      folk: "Dream dictionaries: emotions, cleansing, or change, with troubled water for troubled feelings.",
      science: "Water is one of the most commonly reported dream settings. Physical sensations such as thirst or needing the bathroom can also seep into water dreams.",
      ask: ["How much feeling are you carrying that you haven't said out loud?", "Were you in control of the water or at its mercy?", "What's 'rising' in your life right now?"]
    },
    {
      id: 'house', name: 'Houses and rooms', glyph: '🏠', tone: 'neu',
      patterns: [
        [/\b(?:hidden room|secret room|found (?:a )?(?:new |extra |hidden )?room|rooms? (?:i|that i) (?:never|didn'?t) (?:knew?|saw)|basement|attic|cellar)\b/, 3],
        [/\b(?:house (?:was|is) (?:falling|collaps(?:ing|ed)|on fire|flooded))\b/, 3],
        [/\b(?:house|home|apartment|hallway|staircase|stairs|bedroom|garage)\b/, 2]
      ],
      core: "A house tends to represent you: your mind, your life or your sense of security. What's happening in it mirrors what's happening inside.",
      detail: "In dreams, rooms often map to areas of life or parts of you. The condition of the house, who is in it, and which part of it you're in are the clues.",
      variants: [
        { when: /\b(?:hidden room|secret room|found (?:a )?(?:new |extra |hidden )?room|rooms? (?:i|that i) (?:never|didn'?t) (?:knew?|saw))\b/, add: "Finding rooms you didn't know existed is often read as discovering unused potential or parts of yourself." },
        { when: /\b(?:basement|cellar)\b/, add: "A basement points to what's buried or unprocessed, the deeper layers." },
        { when: /\battic\b/, add: "An attic points to old memories, ideas and things stored away." },
        { when: /\bhouse (?:was|is) (?:falling|collaps(?:ing|ed)|on fire|flooded)\b/, add: "A damaged or collapsing house points to a sense of security being shaken." }
      ],
      jung: "Jung famously dreamed of a many-storeyed house as a map of the psyche: upper floors are conscious, lower floors the unconscious.",
      folk: "Dream dictionaries: the self, home life, and security.",
      science: "Dreams are heavily set in familiar places, which fits the continuity idea: the brain builds scenes from what you know.",
      ask: ["Which room were you in, and what does that room mean to you?", "Did the house feel safe?", "What in your home life needs attention?"]
    },
    {
      id: 'death', name: 'Death or dying', glyph: '🌑', tone: 'neg',
      patterns: [
        [/\b(?:i (?:died|was dying|was killed|am dying|was dead|was shot|was drowning)|my own (?:funeral|death)|dying|(?:someone|he|she|they|everyone) (?:died|was dead|dies)|funeral|coffin|grave|cemetery|corpse|dead body|buried)\b/, 3],
        [/\b(?:die|died|death|dead|killed)\b/, 1]
      ],
      core: "Death in a dream is rarely literal. It most often stands for an ending or transformation, a role, relationship, habit or phase, and your feelings about letting it go.",
      detail: "If you died, something in you may be finishing and making room for something new. If someone you know died, it often points to the relationship or qualities they represent changing, not their actual death. It can also reflect anxiety about losing them.",
      variants: [
        { emo: ['calm', 'joy'], add: "Peace in the dream suggests acceptance of the ending." },
        { emo: ['fear', 'sadness'], add: "Fear or sadness suggests the change is unwelcome or happening faster than you'd like." }
      ],
      jung: "Jung saw death in dreams as transformation, the end of one attitude so another can begin.",
      folk: "Dream dictionaries: endings, change, or fear of loss, and almost never a literal prediction.",
      science: "Dreams are not predictions. Death themes often track stress, loss, or big life transitions.",
      ask: ["What in your life feels like it's ending?", "What would you want to carry forward from it?", "What feels like it's trying to begin?"]
    },
    {
      id: 'ex', name: 'An ex or old flame', glyph: '💔', tone: 'neu',
      patterns: [
        [/\b(?:my ex|ex[- ](?:boyfriend|girlfriend|husband|wife|partner)|former (?:partner|lover)|old flame|old (?:boyfriend|girlfriend))\b/, 4]
      ],
      core: "It's rarely about wanting them back. It's more often about a quality, a time of your life, or an unresolved feeling they stand for.",
      detail: "Exes appear when something in your present echoes that relationship: a feeling of being unseen, a similar conflict, or a reminder of who you were then. They can also be the mind's shorthand for 'a chapter I haven't finished processing'.",
      variants: [
        { emo: ['calm', 'joy'], add: "A warm or neutral feeling suggests peace with that chapter, or a longing for something you associate with that time rather than the person." },
        { emo: ['anger', 'sadness', 'guilt'], add: "Strong feelings suggest something from that relationship remains unprocessed. It doesn't mean you should reconnect." }
      ],
      jung: "Jung would ask what quality in them you projected, and whether you can find it in yourself.",
      folk: "Dream dictionaries: unresolved feelings, nostalgia, or a current relationship echoing the old one.",
      science: "Emotionally charged past relationships are common dream material, consistent with the idea that dreams rework unresolved emotional memories.",
      ask: ["What did that time in your life give you that you may be missing?", "Is something in your current relationship echoing the old one?", "What would you tell the earlier you?"]
    },
    {
      id: 'betrayal', name: 'Betrayal or cheating', glyph: '🗝️', tone: 'neg',
      patterns: [
        [/\b(?:cheat(?:ed|ing|s)?|affair|unfaithful|betray(?:ed|al)?|lied to me|backstab(?:bed|bing)?|behind my back|another (?:woman|man)|with someone else)\b/, 3]
      ],
      core: "This usually points to insecurity or a trust issue, and it is not evidence of anything real. It can mean you feel neglected or replaceable, or that something in the relationship (or in yourself) needs attention.",
      detail: "Cheating and betrayal dreams are extremely common and are usually about the feeling (fear of loss, being overlooked) rather than the facts. They can also be about betraying yourself: ignoring your own needs.",
      variants: [
        { emo: ['anger', 'sadness'], add: "The feelings you woke with are the real material. Carrying them into the day without checking them against reality is the main risk." }
      ],
      jung: "Jung would ask whether the 'unfaithful' figure represents a part of you that you've neglected.",
      folk: "Dream dictionaries: insecurity, jealousy, or a fear of betrayal.",
      science: "People tend to treat dreams as evidence, especially when they match existing worries. In a well-known study, people gave dreams extra weight when they fit what they already believed. A cheating dream is not evidence of cheating.",
      ask: ["What have you been feeling unsure of in this relationship, or in yourself?", "Is there something you need more of, such as attention, reassurance or time?", "What would it be like to say the feeling out loud, without accusing anyone?"]
    },
    {
      id: 'romance', name: 'Romance and intimacy', glyph: '💞', tone: 'pos',
      patterns: [
        [/\b(?:crush|kiss(?:ed|ing)?|dating|romantic|in love|fell in love|falling in love|love interest|intimate|made out|hugged me|held (?:me|my hand)|attracted)\b/, 3],
        [/\b(?:sex|sexual|making love|seduc\w+|aroused)\b/, 3]
      ],
      core: "You're craving closeness, or something in your waking connections, to a person or to a part of yourself, is stirring.",
      detail: "Romantic and sexual dreams are common and usually aren't literal. They tend to be about attraction, closeness, or a desire for something the person represents, such as affirmation, vitality or being seen. Waking context matters: a new crush, a distance in a relationship, or a wish for connection all feed them.",
      variants: [
        { emo: ['shame', 'guilt', 'confusion'], add: "Feeling guilty or confused about a dream is very common. Dreams aren't choices, and they don't commit you to anything." }
      ],
      jung: "Jung would see the partner as an anima or animus figure: an inner counterpart representing qualities you're integrating.",
      folk: "Dream dictionaries: desire, connection, or a need for love.",
      science: "Romantic and sexual content is a normal part of dream content in large samples, and it varies by culture.",
      ask: ["What do you associate with that person, besides the person?", "Where in your life do you want more closeness or attention?", "What would feel good to receive or to express?"]
    },
    {
      id: 'pregnancy', name: 'Pregnancy, birth or babies', glyph: '🍼', tone: 'neu',
      patterns: [
        [/\b(?:pregnan(?:t|cy)|babies|baby|newborn|infant|giving birth|gave birth|labor|expecting|toddler|crib)\b/, 3],
        [/\b(?:forgot (?:my|the) baby|lost (?:my|the) baby)\b/, 3]
      ],
      core: "Something new is gestating in your life, such as a project, idea, role or responsibility. Or you're thinking about care and dependence.",
      detail: "Baby and pregnancy dreams often stand for a new beginning you're nurturing, such as a business, a creative work or a relationship. If pregnancy or parenthood is on your mind in real life, this is also simply an ordinary continuation of that.",
      variants: [
        { when: /\b(?:forgot|lost|neglect(?:ed)?|couldn'?t find|left (?:the|my) baby)\b/, add: "Forgetting or neglecting the baby is a very common way for the mind to flag a new responsibility you worry you aren't tending enough." }
      ],
      jung: "Jung read infants as the birth of something new in the self, often an unrealized potential.",
      folk: "Dream dictionaries: new beginnings, creativity, or responsibility.",
      science: "Dreams about babies and pregnancy are common in both people who are and aren't expecting, and they track preoccupation with care, change and responsibility.",
      ask: ["What new thing are you carrying that needs care?", "Do you feel ready for it, or are you afraid of dropping it?", "Who is helping you hold it?"]
    },
    {
      id: 'snake', name: 'Snakes', glyph: '🐍', tone: 'neg',
      patterns: [
        [/\b(?:snakes?|serpents?|viper|cobra|rattlesnake|anaconda)\b/, 4]
      ],
      core: "A snake often stands for something unsettling you sense but haven't dealt with: a hidden threat, a deceptive situation, or a change you're resisting.",
      detail: "Snakes are rich, double-edged symbols: danger and deceit on one side, healing and renewal on the other (a snake sheds its skin). How the snake behaved and how you felt are the clue.",
      variants: [
        { when: /\b(?:bit|bitten|bite|striking)\b/, add: "Being bitten tends to point to a 'sting' you feel from a specific person or situation." },
        { when: /\b(?:shed|skin|friendly|harmless|beautiful|gentle)\b/, add: "A calm snake, or one shedding its skin, leans toward transformation rather than threat." }
      ],
      jung: "Jung saw the serpent as a symbol of instinct and the unconscious. It can threaten or heal depending on how you relate to it.",
      folk: "Dream dictionaries: betrayal, hidden enemies, or rebirth.",
      science: "Snakes and spiders are common fear objects, and dreams tend to emphasize threat, so they get frequent cameos. Beyond that, symbolic meaning is traditional rather than proven.",
      ask: ["What feels hidden, or not quite honest, in your situation?", "What are you resisting changing?", "Did the snake approach you, or did you approach it?"]
    },
    {
      id: 'insects', name: 'Spiders and swarming creatures', glyph: '🕷️', tone: 'neg',
      patterns: [
        [/\b(?:spiders?|cobwebs?|insects?|bugs?|roach(?:es)?|cockroach(?:es)?|ants|bees|wasps?|hornets?|swarm|mosquito(?:es)?|maggots?|worms|crawling on me)\b/, 3]
      ],
      core: "Small, many or crawling things usually mirror nagging worries: irritations or fears that feel small individually but hard to shake. They can also mean a feeling of being invaded or entangled.",
      detail: "Swarms and crawlers tend to map to pressures that multiply: emails, obligations, other people's demands. A spider's web can point to being caught up in a situation, though in some traditions spiders also stand for creativity and patient work.",
      variants: [],
      jung: "Jung would ask what small, repressed things are collecting at the edge of awareness.",
      folk: "Dream dictionaries: worries, entanglement, or feeling overwhelmed by small things.",
      science: "Spiders and insects are common fear objects, and dreams tend to emphasize threat, but symbolic meaning is traditional rather than proven.",
      ask: ["What small irritations have been piling up?", "Where do you feel crowded or invaded?", "What would clearing one small thing look like?"]
    },
    {
      id: 'predator', name: 'Wild or aggressive animals', glyph: '🐺', tone: 'neg',
      patterns: [
        [/\b(?:shark|wolf|wolves|bear|lion|tiger|crocodile|alligator|bull|snarling|growl(?:ed|ing)?|bit me|bitten|attacked by|mauled|rabid|pack of)\b/, 3]
      ],
      core: "A wild or aggressive animal represents raw instinct, anger or threat. It may be something in you, or someone around you, that feels hard to tame.",
      detail: "Predators in dreams are often read as unprocessed anger or fear, or a person or situation that feels dangerous. Different animals carry different qualities: the shark (a cold threat), the wolf (a pack or an instinct), the bear (a protective power).",
      variants: [
        { when: /\b(?:tamed|befriended|friendly|petted|it let me|didn'?t attack)\b/, add: "If the animal was calm or you befriended it, the dream may show you coming to terms with a strong part of yourself." }
      ],
      jung: "Jung read animals as instinctual energies. Taming or befriending them is part of integrating them.",
      folk: "Dream dictionaries: hidden threats, anger, or unacknowledged power.",
      science: "Threat-simulation research notes that animal attackers are a recurring dream threat, in line with dreams over-representing danger.",
      ask: ["What or who feels dangerous or untamed right now?", "Is there anger you haven't expressed?", "What does the animal represent to you?"]
    },
    {
      id: 'animals', name: 'Animals', glyph: '🐾', tone: 'neu',
      patterns: [
        [/\b(?:dogs?|puppy|puppies|cats?|kittens?|horses?|birds?|fish|rabbits?|deer|butterfl(?:y|ies)|owls?|pets?|animals?)\b/, 2]
      ],
      core: "Animals often stand in for instincts, loyalty or a part of your personality. How the animal treated you is the clue.",
      detail: "A friendly animal tends to mean something instinctive or loyal is on your side. An animal in trouble, lost or hurt tends to mean a neglected need or something you feel responsible for.",
      variants: [
        { when: /\b(?:died|dead|hurt|injured|lost|missing|starv\w*)\b/, add: "A pet in danger or missing often reflects worry about something you're responsible for caring for." }
      ],
      jung: "Jung saw animals as instincts and natural energies within us.",
      folk: "Dream dictionaries: the particular qualities of the animal (loyalty, independence, freedom).",
      science: "Animals are among the most common characters in dreams, especially for children.",
      ask: ["What quality do you associate with this animal?", "Were you caring for it or afraid of it?", "What instinct of yours is it?"]
    },
    {
      id: 'monster', name: 'Monsters, intruders and shadowy figures', glyph: '👤', tone: 'neg',
      patterns: [
        [/\b(?:monster|demon|devil|ghost|zombie|creature|shadow(?:y)? (?:figure|man|person)|dark figure|stranger|intruder|burglar|break(?:ing)? in|broke in|evil|haunt(?:ed|ing)?|vampire|alien|witch|creepy|lurk(?:ed|ing)?)\b/, 3],
        [/\bsomeone (?:was )?(?:in|outside) (?:the|my) (?:house|room|window)\b/, 3]
      ],
      core: "Something unfamiliar or threatening is pressing at the edge of your awareness: a worry you can't name, a person or situation that feels unsafe, or a part of yourself you've pushed away.",
      detail: "Dream monsters are rarely random. They tend to carry the feeling of whatever you're most unsettled by, in a form that's easier to flee than a vague worry. The more faceless the figure, the more diffuse the worry.",
      variants: [
        { when: /\b(?:break(?:ing)? in|intruder|burglar|broke in|someone (?:was )?(?:in|outside))\b/, add: "An intruder often maps to a boundary being crossed (your time, privacy or energy) by a person or an obligation." },
        { when: /\b(?:friendly|turned out|harmless|wanted to talk|just a)\b/, add: "A monster turning out to be harmless suggests the fear is bigger than the thing itself." }
      ],
      jung: "Jung would call this the shadow, the disowned parts of ourselves. The figure often shares your sex and carries what you've rejected. The classic move is to ask it what it wants.",
      folk: "Dream dictionaries: fear, a hidden problem, or a person you distrust.",
      science: "Nightmares of threatening figures fit both threat-simulation ideas and emotional processing of stress, and both can be true.",
      ask: ["What's a worry you can't quite name?", "What would the figure say if it could speak?", "Where are your boundaries being crossed?"]
    },
    {
      id: 'violence', name: 'Conflict and aggression', glyph: '⚔️', tone: 'neg',
      patterns: [
        [/\b(?:attack(?:ed|ing)?|stab(?:bed|bing)?|shot|shoot(?:ing)?|gun|knife|fight(?:ing)?|fought|punch(?:ed|ing)?|beat (?:me|him|her|up)|hit me|kill(?:ed|ing)? (?:me|him|her|them)|murder(?:ed)?|war|bomb(?:s|ing)?|explosion|soldiers|assault(?:ed)?|strangl(?:ed|ing)|hostage)\b/, 3]
      ],
      core: "Conflict, with someone else or inside you. It can be anger you aren't expressing, feeling attacked or criticized, or a sense that something is a threat.",
      detail: "Across large dream samples, conflict and aggression show up routinely, so a fight in a dream isn't a sign that something is wrong with you. Look at who was fighting whom, and who had the upper hand: that maps closely to who has the upper hand in your conflict.",
      variants: [
        { when: /\b(?:i (?:fought|punched|hit|defended|stood up)|fought back)\b/, add: "You fought back or defended yourself, which tends to show some readiness to stand up for yourself." },
        { when: /\b(?:couldn'?t (?:fight|hit|punch|scream)|my punches|weak(?:ly)?)\b/, add: "Ineffective punches or a weak voice are a common dream pattern and fit a sense of powerlessness in a conflict." }
      ],
      jung: "Jung would ask which part of you is at war with another, and what each side wants.",
      folk: "Dream dictionaries: inner or outer conflict, or repressed anger.",
      science: "Aggressive interactions are a staple of dream content in the large samples used by dream researchers, and dream threats rise with waking stress.",
      ask: ["Who or what are you in conflict with right now?", "Is there anger you haven't said?", "Who held the power in the dream, and who holds it in your life?"]
    },
    {
      id: 'fire', name: 'Fire', glyph: '🔥', tone: 'neu',
      patterns: [
        [/\b(?:fire|fires|burning|burn(?:ed|t)?|flames?|smoke|wildfire|blaze|inferno|on fire|ablaze)\b/, 3]
      ],
      core: "Fire is intensity: strong emotion (often anger or passion), urgency, or something being destroyed to make room for change.",
      detail: "Fire can warm or destroy, so context decides. Wildfire and out-of-control burning suggest anger or stress spreading beyond what you can contain. A contained, warm fire suggests passion, comfort or purpose.",
      variants: [
        { emo: ['anger'], add: "Given the anger you describe, the fire probably reflects it directly." },
        { emo: ['calm', 'joy'], add: "A calm or warm feeling suggests fire as energy or purpose rather than danger." }
      ],
      jung: "Jung treated fire as transformation: what is burned away makes room for something new.",
      folk: "Dream dictionaries: anger, passion, or purification.",
      science: "Fire is a common threat in dreams and a common symbol of strong emotion.",
      ask: ["What are you feeling intensely right now?", "What needs to burn away?", "Is something getting out of control?"]
    },
    {
      id: 'vehicle', name: 'Cars, driving and crashes', glyph: '🚗', tone: 'neu',
      patterns: [
        [/\b(?:brakes? (?:didn'?t|wouldn'?t|failed|weren'?t)|no brakes|steering (?:wheel )?(?:didn'?t|wouldn'?t)|out of control|backseat|back seat|passenger seat|nobody (?:was )?driving|no ?one (?:was )?driving|car (?:crash|accident)|crash(?:ed|ing)? (?:the|my) car|swerv(?:ed|ing)|drove off|drove into|runaway)\b/, 3],
        [/\b(?:cars?|driving|drove|drive|driver|brakes?|steer(?:ing)?|crash(?:ed|ing)?|accident|bus|train|truck|motorcycle|bike|bicycle|boat|ship|plane|airplane|taxi|highway|wreck(?:ed)?|passenger)\b/, 2]
      ],
      core: "Vehicles tend to represent your life's direction and how much control you feel over it.",
      detail: "The question a vehicle dream asks is: who's driving? Whether you steer, ride along, lose the brakes or crash maps neatly onto control, direction and pace in your waking life.",
      variants: [
        { when: /\b(?:brakes? (?:didn'?t|wouldn'?t|failed|weren'?t)|no brakes|steering (?:wheel )?(?:didn'?t|wouldn'?t)|out of control|runaway)\b/, add: "Brakes that fail, or steering that doesn't respond, are the textbook 'I can't slow this down' image." },
        { when: /\b(?:backseat|back seat|passenger seat|nobody (?:was )?driving|no ?one (?:was )?driving|someone else (?:was )?driving)\b/, add: "Not being in the driver's seat suggests letting others steer your decisions, or feeling carried along by circumstances." },
        { when: /\b(?:crash(?:ed|ing)?|accident|wreck(?:ed)?)\b/, add: "A crash often dramatizes the fear that your current direction will end badly, or is an anxious rehearsal of that outcome." },
        { emo: ['calm', 'joy'], add: "Smooth, enjoyable driving suggests you feel in control of where you're headed." }
      ],
      jung: "Jung would ask what is driving you: ego, habit, or something deeper.",
      folk: "Dream dictionaries: life direction, ambition, and control.",
      science: "Vehicles are among the commonest everyday dream objects, which fits dreams drawing on daily experience.",
      ask: ["Who's driving your life right now?", "What would slowing down look like?", "Where do you feel carried rather than steering?"]
    },
    {
      id: 'trapped', name: 'Trapped, stuck or unable to move', glyph: '⛓️', tone: 'neg',
      patterns: [
        [/\b(?:trapped|locked (?:in|up|out)|cage[d]?|can'?t get out|couldn'?t get out|buried alive|suffocat(?:ed|ing)|elevator|cornered|tied (?:up|down)|quicksand)\b/, 3],
        [/\bstuck\b/, 2],
        [/\bmud\b/, 1],
        [/\b(?:couldn'?t move|can'?t move|paraly[sz]ed|frozen|couldn'?t (?:scream|speak|talk|yell)|can'?t (?:scream|speak|talk|yell)|no voice|voice (?:wouldn'?t|didn'?t) (?:come|work)|mute)\b/, 4]
      ],
      core: "You feel constrained, by an obligation, a relationship, a job or your own limits, and unable to act the way you want.",
      detail: "Being stuck in a dream tends to mirror a waking feeling of having no good options or no voice. The thing that traps you (a room, mud, a locked door, your own body) is the clue to where.",
      variants: [
        { when: /\b(?:couldn'?t move|can'?t move|paraly[sz]ed|frozen|couldn'?t (?:scream|speak|yell)|can'?t (?:scream|speak|yell)|no voice)\b/, add: "Being unable to move or scream is a very common dream experience with a physical basis: during REM sleep your body is naturally paralyzed. If you also felt awake or sensed a presence in the room, that may be sleep paralysis. It is common and harmless, though frightening." }
      ],
      jung: "Jung would ask what part of you is being kept from growing.",
      folk: "Dream dictionaries: feeling restricted or powerless.",
      science: "Muscle paralysis is a normal part of REM sleep, which is why running or screaming dreams often feel blocked.",
      ask: ["What feels like it has you in a corner?", "What would you say or do if you were free?", "What's the smallest step toward the exit?"]
    },
    {
      id: 'work', name: 'Work and your role', glyph: '💼', tone: 'neu',
      patterns: [
        [/\b(?:fired|laid off|interview|boss|supervisor|manager|coworkers?|colleagues?|promotion|employee|paycheck)\b/, 3],
        [/\b(?:office|meeting|deadline|client|customer|shift|job|work(?:ing)?)\b/, 1]
      ],
      core: "Your work life, with its pressure, your role or how you're being judged, is occupying your mind. Work dreams are classic replays of daily preoccupation.",
      detail: "Work dreams are the textbook case of continuity: what occupies your days shows up at night. They get more intense when you're under pressure, in transition, or doing something repetitive for long periods.",
      variants: [
        { when: /\b(?:fired|laid off|quit|let go)\b/, add: "Being fired is usually about a fear of inadequacy or losing security more than your actual job." },
        { emo: ['anger'], add: "Anger at a boss in a dream often means something you haven't been able to say at work." }
      ],
      jung: "Jung would ask who you are beyond the role. Work dreams can ask whether your persona and your self still fit.",
      folk: "Dream dictionaries: pressure, responsibility, or ambition.",
      science: "Work and school settings are among the commonest in dreams, in line with the continuity hypothesis.",
      ask: ["What at work is taking more of your attention than you'd like?", "Where do you feel judged?", "What do you wish you could say or change?"]
    },
    {
      id: 'family', name: 'Family and close people', glyph: '👪', tone: 'neu',
      patterns: [
        [/\b(?:mom|mum|mother|dad|father|parents?|grandma|grandmother|grandpa|grandfather|sibling|brother|sister|wife|husband|spouse|kids?|children|child|son|daughter|family)\b/, 2]
      ],
      core: "People from your inner circle show up because they're on your mind. The dream is likely about your relationship with them, or what they represent (care, authority, safety).",
      detail: "Close people dominate dreams because they dominate our lives. A useful distinction from Jungian work: is the dream about the real person (their actual role in your life), or about the quality they stand for within you (nurturing, criticism, protectiveness)?",
      variants: [
        { emo: ['anger', 'sadness', 'guilt'], add: "Conflict or sadness with a family member in a dream often mirrors real tension or something unsaid." },
        { emo: ['calm', 'joy'], add: "Warmth suggests you're feeling supported, or missing that support." }
      ],
      jung: "Jung distinguished the 'objective' level (the real person) from the 'subjective' level (the person as part of you). Try both.",
      folk: "Dream dictionaries: the actual relationship, or the role they play for you.",
      science: "Dreams feature familiar people far more often than strangers, which supports the continuity hypothesis.",
      ask: ["Is this about them, or about a quality of theirs inside you?", "Is something unsaid between you?", "What do you need from them, or want to give them?"]
    },
    {
      id: 'loss', name: 'Losing things, theft or money worries', glyph: '👛', tone: 'neg',
      patterns: [
        [/\blost (?:my|the|a|his|her) (?:wallet|phone|keys?|purse|bag|ring|passport|ticket)\b/, 3],
        [/\bcan'?t find (?:my|the) (?:wallet|phone|keys?|purse|bag|ring|passport|ticket)\b/, 3],
        [/\b(?:stolen|robbed|pickpocket(?:ed)?|bankrupt(?:cy)?|broke|can'?t pay|couldn'?t pay|debt)\b/, 3],
        [/\b(?:money|cash|bills?|rent|wallet|purse|credit card|bank)\b/, 2]
      ],
      core: "You fear losing something that gives you security, identity or connection, or you've already felt something slip away.",
      detail: "Lost keys, wallets and phones stand for access, identity and connection. Money in dreams is usually about worth and security more than finances. If you're under real financial pressure, it's often exactly that.",
      variants: [
        { when: /\b(?:stolen|robbed|pickpocket(?:ed)?)\b/, add: "Theft in a dream often reflects feeling that someone (or something, like work or time) is taking from you." }
      ],
      jung: "Jung would ask what in you has been mislaid: a talent, a value, a voice.",
      folk: "Dream dictionaries: insecurity, loss of control, or a fear of lacking.",
      science: "Anxiety about resources and security is a common source of dream content.",
      ask: ["What feels at risk of slipping away?", "What do you rely on that feels unsteady?", "What do you feel is being taken from you?"]
    },
    {
      id: 'bathroom', name: 'Bathrooms and privacy', glyph: '🚽', tone: 'neu',
      patterns: [
        [/\b(?:toilet|bathroom|restroom|pee(?:ing)?|urinat(?:e|ing)|bladder|public toilet|stall|no (?:door|privacy)|had to go)\b/, 3]
      ],
      core: "Two likely answers. The boring one is often right: your bladder, which dreams love to incorporate. The other is about privacy, release or exposure.",
      detail: "If you woke needing the bathroom, that is most likely the cause. Otherwise, bathroom dreams tend to be about privacy and boundaries (finding no stall, no door), or about 'letting go' of something you've been holding in.",
      variants: [
        { when: /\b(?:no (?:door|privacy)|everyone (?:could )?see|watching|dirty|disgusting|filthy)\b/, add: "Lack of privacy points to a boundary issue, a feeling that your space isn't respected." }
      ],
      jung: "Jung would see this as release and the shedding of what you no longer need.",
      folk: "Dream dictionaries: letting go, privacy, or emotional release.",
      science: "Dreams readily weave in real bodily sensations, including a full bladder.",
      ask: ["Did you need to go when you woke up?", "Where do you need more privacy?", "What are you holding in?"]
    },
    {
      id: 'wedding', name: 'Weddings and commitment', glyph: '💍', tone: 'neu',
      patterns: [
        [/\b(?:wedding|married|marry|marriage|bride|groom|bridesmaid|engaged|engagement|vows|altar|fianc[eé]e?)\b/, 3]
      ],
      core: "Commitment, union or a big life transition: a merging of two things (people, roles, or parts of yourself). If a wedding is actually in your life, it's likely just that on your mind.",
      detail: "Weddings in dreams often symbolize committing to something: a person, a path, a job or a new identity. The feeling you had at the altar tells you whether the commitment feels like a choice or a pressure.",
      variants: [
        { when: /\b(?:cold feet|ran away|wrong (?:person|man|woman)|didn'?t want|not ready|late for|forgot)\b/, add: "Doubt, running away or the wrong partner point to hesitation about a commitment, whether or not it's a literal one." }
      ],
      jung: "Jung called this the 'sacred marriage' symbol, the union of opposites within the self.",
      folk: "Dream dictionaries: commitment, partnership, or transition.",
      science: "Dream content tends to reflect life events and anticipation. People planning weddings dream of them often.",
      ask: ["What are you being asked to commit to?", "Do you feel ready, or are you being rushed?", "What are you merging or leaving behind?"]
    },
    {
      id: 'celebrity', name: 'Famous people', glyph: '⭐', tone: 'neu',
      patterns: [
        [/\b(?:celebrity|famous|actor|actress|singer|rapper|president|politician|movie star|athlete|youtuber|streamer|influencer|billionaire)\b/, 3]
      ],
      core: "A famous person in a dream is usually a costume for a quality you associate with them, or just leftover media: we dream about what we see.",
      detail: "Ask what you admire, envy or fear about that person. They are often the mind's shorthand for ambition, attractiveness, power or visibility. If you've been seeing them online, news and shows are 'day residue' that often seeds dreams.",
      variants: [],
      jung: "Jung would see the famous figure as a projection of a quality you haven't claimed in yourself.",
      folk: "Dream dictionaries: desire for recognition or admiration for the person's traits.",
      science: "Recent media consumption commonly appears in dreams.",
      ask: ["What do you associate with this person?", "Which of their qualities do you want or fear?", "Have you been seeing them a lot lately?"]
    },
    {
      id: 'mirror', name: 'Mirrors and changing identity', glyph: '🪞', tone: 'neu',
      patterns: [
        [/\b(?:mirror|reflection|didn'?t recogni[sz]e (?:myself|my face)|different face|looked (?:different|older|younger)|someone else'?s body|(?:was|became) (?:a )?(?:different|another) (?:person|man|woman|body)|shapeshift|transform(?:ed|ing)?|aged)\b/, 3]
      ],
      core: "Questions about identity: who you're becoming, who you're pretending to be, or how you see yourself right now.",
      detail: "Mirror and transformation dreams often show up during life changes, such as a new role, a breakup, a move or aging. The face in the mirror tends to reflect how you feel about yourself rather than how you look.",
      variants: [
        { emo: ['fear', 'confusion'], add: "Not recognizing yourself suggests a change that hasn't been fully absorbed yet." }
      ],
      jung: "Jung would ask which version of you is looking back: persona, shadow or self.",
      folk: "Dream dictionaries: self-image, hidden aspects, or a transformation.",
      science: "Self-related content, including appearance, is a stable feature of dream reports.",
      ask: ["Who are you becoming?", "What part of yourself have you been hiding?", "Who would you like to look back at you?"]
    },
    {
      id: 'heights', name: 'Heights, climbing and edges', glyph: '⛰️', tone: 'neu',
      patterns: [
        [/\b(?:cliff|roof(?:top)?|tall building|skyscraper|bridge|ledge|mountain|climb(?:ing|ed)?|ladder|tower|summit|high up|edge of)\b/, 2]
      ],
      core: "Heights are about ambition, risk and perspective: how far you've climbed and how you feel about the drop.",
      detail: "Climbing often maps to effort and aspiration. Standing at a high edge maps to a risk or a decision. How you felt up there is the clue.",
      variants: [
        { emo: ['fear', 'helpless'], add: "Vertigo or dread suggests a risk or promotion that scares you more than it thrills you." },
        { emo: ['calm', 'joy', 'awe'], add: "A calm or exhilarating view suggests perspective and accomplishment." }
      ],
      jung: "Jung linked mountains to the self and the long climb toward it.",
      folk: "Dream dictionaries: ambition, challenge, and fear of failure.",
      science: "Fear of heights is a common waking fear, and dreams readily reuse it.",
      ask: ["What are you climbing toward?", "What risk are you at the edge of?", "What would the view be if you made it?"]
    },
    {
      id: 'disaster', name: 'Storms, disasters and upheaval', glyph: '🌪️', tone: 'neg',
      patterns: [
        [/\b(?:storm|thunder|lightning|tornado|hurricane|earthquake|apocalypse|end of the world|disaster|volcano|avalanche|collaps(?:e|ed|ing)|meteor|asteroid|world (?:was )?ending|blackout)\b/, 3]
      ],
      core: "Upheaval: something big and outside your control feels like it's shaking your foundation. It could be change, uncertainty, or a stretch of stress where everything feels at stake.",
      detail: "Disaster dreams often rise during real stress, news overload or big transitions. They dramatize the feeling more than the facts.",
      variants: [
        { emo: ['calm', 'awe'], add: "If the disaster felt strangely calm or awe-inspiring, the dream may be about welcoming a change you've been resisting." }
      ],
      jung: "Jung would say a dream of upheaval can mark the collapse of an old attitude so a new one can form.",
      folk: "Dream dictionaries: major change, fear, or emotional turbulence.",
      science: "People under stress or after trauma report more threatening dream content.",
      ask: ["What feels like it's shaking right now?", "What would you do if the old structure fell?", "How much of this is news or stress overload?"]
    },
    {
      id: 'tech', name: 'Phones and communication trouble', glyph: '📱', tone: 'neg',
      patterns: [
        [/(?:can'?t|couldn'?t|wouldn'?t|kept|wrong) (?:type|dial|text|call|send|unlock|log in|connect)|(?:buttons|keys|numbers) (?:kept|wouldn'?t|were)|phone (?:died|was dead|broke|wouldn'?t)|\bwrong number\b/, 3],
        [/\b(?:phone|texting|text message|dial(?:ing)?|keyboard|typing|screen|battery|password|email|laptop|computer|internet|wifi|notification|autocorrect)\b/, 2]
      ],
      core: "Communication frustration: you're trying to reach someone, express something or get something done, and it isn't working.",
      detail: "Phones that won't dial and keys that won't type are among the most 'modern' typical dreams. They tend to reflect a relationship or message where you feel unheard, or an everyday overload of messages. It's also day residue: we dream about what we use all day.",
      variants: [],
      jung: "Jung would ask what message is trying to get through, and from whom.",
      folk: "Dream dictionaries: blocked communication or a missing connection.",
      science: "Dreams reuse the objects and activities of daily life, and screens are now a major part of that.",
      ask: ["Who are you trying to reach?", "What are you trying to say that isn't getting through?", "How much of your day is spent on screens?"]
    },
    {
      id: 'food', name: 'Food, eating and hunger', glyph: '🍽️', tone: 'neu',
      patterns: [
        [/\b(?:starv(?:ing|ed)|hungry|feast|buffet|couldn'?t eat|nothing to eat)\b/, 3],
        [/\b(?:eat(?:ing)?|ate|food|cook(?:ing|ed)?|restaurant|cake|dinner|meal|baking|bread|dessert|chewing)\b/, 2]
      ],
      core: "Nourishment: what you're hungry for in life, whether attention, rest, connection or meaning, and whether you feel fed.",
      detail: "Food dreams often reflect real appetite or a symbolic one. A feast suggests abundance; an empty table or hunger suggests unmet needs. Also check the literal: real hunger, or a late-night snack, can shape a dream.",
      variants: [
        { when: /\b(?:starv\w*|hungry|couldn'?t eat|no food|nothing to eat|empty)\b/, add: "Craving something unavailable points to a need that isn't being met." },
        { when: /\b(?:feast|buffet|delicious|cake)\b/, add: "Abundance suggests satisfaction or a wish for treats and rest." }
      ],
      jung: "Jung would see eating as taking something in, a new idea or experience being digested.",
      folk: "Dream dictionaries: fulfilment, desire, or lack.",
      science: "Physical states such as hunger and thirst can influence dream content.",
      ask: ["What are you hungry for, besides food?", "Who is feeding you, and who isn't?", "Did you eat before bed?"]
    },
    {
      id: 'success', name: 'Winning, praise and success', glyph: '🏆', tone: 'pos',
      patterns: [
        [/\b(?:won|win(?:ning)?|award|prize|promotion|applause|applaud(?:ed|ing)?|celebrat(?:e|ed|ing|ion)|trophy|treasure|champion|congratulat(?:ed|ions)|standing ovation|graduat(?:ed|ion|ing)|got (?:the|a) (?:job|offer)|found (?:money|gold))\b/, 3]
      ],
      core: "A wish, a rehearsal, or earned confidence: positive dreams often reflect what you want, hope for, or feel capable of.",
      detail: "Enjoy it, but notice that people tend to over-read pleasant dreams as promises. In studies, dreams that match what we already hope are rated as more meaningful. A good dream is a nice sign of your mood, not a forecast.",
      variants: [],
      jung: "Jung would say celebration marks integration, a part of you being recognized.",
      folk: "Dream dictionaries: success, recognition, or luck.",
      science: "Positive dream content is linked with better next-day mood in some studies, and people rate dreams that fit their hopes as more meaningful.",
      ask: ["What are you hoping for that this dream made feel possible?", "Where do you deserve more recognition?", "What would you do next if you believed this?"]
    },
    {
      id: 'magic', name: 'Magic, powers and the impossible', glyph: '✨', tone: 'pos',
      patterns: [
        [/\b(?:magic(?:al)?|superpowers?|super powers?|special powers|magic powers|superhero|telekinesis|spell|wizard|sorcerer|invisible|invisibility|teleport(?:ed|ing)?|time travel|portal|x-ray)\b/, 3]
      ],
      core: "Untapped capacity, or a wish for more control: you may be wanting more power over a situation that feels out of your hands. The positive version is that you're sensing strengths you haven't used.",
      detail: "Powers in dreams often show up when you feel limited in waking life, or when you're quietly growing into something. The kind of power is the clue: invisibility (wanting to escape notice), teleporting (escape), strength (control).",
      variants: [],
      jung: "Jung would point to the archetype of the magician or hero: potential trying to enter consciousness.",
      folk: "Dream dictionaries: hidden potential or the wish for control.",
      science: "Dreams freely violate physical rules, and that's normal for REM dreaming.",
      ask: ["What would you do with this power in real life?", "Where do you feel powerless right now?", "What strength might you be underusing?"]
    },
    {
      id: 'lucid', name: 'Knowing you were dreaming', glyph: '🌙', tone: 'neu',
      patterns: [
        [/\b(?:lucid|knew (?:i was|it was) (?:dreaming|a dream)|realized (?:i was|it was) (?:dreaming|a dream)|aware (?:i was|that i was) dreaming|control(?:led|ling)? the dream|took control|just a dream|this is a dream|dream within a dream|false awakening)\b/, 4]
      ],
      core: "You noticed you were dreaming. This is lucid dreaming, a normal if less common state in which part of your waking self-awareness switches on during REM sleep.",
      detail: "Lucid dreams aren't usually 'about' your waking life in a symbolic sense. The interesting part is what you did with the awareness: flew, explored, confronted something, or woke up. Many people have had at least one, and some train for them.",
      variants: [],
      jung: "Jung would find this interesting as the ego meeting the unconscious on equal terms.",
      folk: "Many traditions prize lucid or aware dreaming as a path to insight.",
      science: "Lucid dreaming is well documented in sleep labs, and it can be learned by some people with practice.",
      ask: ["What did you do once you knew?", "Was there anything you avoided, or wanted to face?", "Do you want to try for it again?"]
    },
    {
      id: 'old_self', name: 'Childhood and the past', glyph: '🧸', tone: 'neu',
      patterns: [
        [/\b(?:childhood|grew up|kid again|when i was (?:a )?(?:kid|child|little)|old (?:house|school|room|friends|neighborhood|town)|high school|middle school|elementary|grandparents'? house|used to live|back in school)\b/, 3]
      ],
      core: "An older chapter of your life, or the version of you who lived it, is asking for attention.",
      detail: "Dreams of old homes, schools and friends often appear when something in the present echoes that time: a feeling of being small, of belonging, or of unfinished business. They can be nostalgia, or a reminder of a need that was met (or missed) then.",
      variants: [
        { emo: ['sadness'], add: "Longing for a past place suggests you're missing something it gave you, such as safety, simplicity or belonging." }
      ],
      jung: "Jung would see the child as the potential and spontaneity you may have left behind.",
      folk: "Dream dictionaries: nostalgia, unresolved issues from the past.",
      science: "Autobiographical memories are a major source of dream content.",
      ask: ["What did that time give you that you want now?", "What unfinished business is there?", "What would your younger self say to you?"]
    },
    {
      id: 'health', name: 'Illness, injury and body worries', glyph: '🩺', tone: 'neg',
      patterns: [
        [/\b(?:hospital|doctor|sick|illness|surgery|injur(?:ed|y)|bleeding|blood|cancer|diagnos(?:ed|is)|nurse|ambulance|medicine|wound(?:ed)?|broken (?:bone|arm|leg)|hair (?:falling|fell)|losing (?:my )?hair)\b/, 3]
      ],
      core: "Worry about health, vulnerability, or something in you that needs repair or care. Caring for someone else can feed these dreams too.",
      detail: "Illness dreams usually reflect vulnerability, not diagnosis. They often track caretaking stress, burnout, or a feeling that something in your life is 'hurt' and needs tending.",
      variants: [],
      jung: "Jung would ask what in you is wounded, and what kind of care it needs.",
      folk: "Dream dictionaries: vulnerability, or a part of life that needs healing.",
      science: "Dreams aren't reliable predictors of illness. If a physical symptom is worrying you, a real check-in with a clinician is worth more than any dream reading.",
      ask: ["What in your life feels hurt or depleted?", "Who are you taking care of, and who takes care of you?", "Is a real health worry behind this? It's worth checking with a professional."]
    },
    {
      id: 'bizarre', name: 'A jumbled, shifting dream', glyph: '🌀', tone: 'neu',
      patterns: [
        [/\b(?:weird|strange|bizarre|random|nonsense|made no sense|doesn'?t make sense|didn'?t make sense|surreal|jumbled|all over the place|kept changing|changed (?:into|to))\b/, 2]
      ],
      core: "A jumbled, shifting dream is the normal default, not a puzzle you failed to solve. REM dreams stitch memories, feelings and sensations together loosely.",
      detail: "Most dreams are strange. Scenes change, people swap, and logic breaks. That's typical of how the sleeping brain blends recent memories and emotions. The strongest signal is usually the feeling that stays with you, not the plot.",
      variants: [],
      jung: "Jung would say to pick the single most vivid image and ask what you associate with it.",
      folk: "Dream dictionaries focus on single symbols, so pick the one that stood out.",
      science: "Bizarre and shifting content is normal in REM dreaming and is explained by theories such as activation-synthesis and memory consolidation.",
      ask: ["Which one image stuck with you the most?", "What did you feel most strongly?", "What from the last few days did it remix?"]
    }
  ];
  THEMES.forEach(function (t) {
    t._pats = t.patterns.map(function (p) { return { re: new RegExp(p[0].source, 'gi'), w: p[1] }; });
  });

  /* -------------------------------------------------------------- EMOTIONS */
  const EMOTIONS = {
    fear: { label: 'Fear', re: /\b(?:scared|afraid|terrified|terror|terrifying|panic(?:ked|king)?|fear(?:ful)?|horrif(?:ied|ying)|dread|anxious|anxiety|nervous|frightened|frightening|petrified|creeped out|heart (?:was )?(?:racing|pounding)|nightmare|screamed?|screaming|woke up (?:sweating|screaming|scared|in a panic))\b/gi,
      line: "Fear usually means the issue behind the dream feels unresolved or threatening to you, not just interesting." },
    sadness: { label: 'Sadness', re: /\b(?:sad|sadness|cry(?:ing)?|cried|tears|grie(?:f|ving)|griev(?:ed|ing)|lonely|loneliness|empty|heartbroken|heartbreak|miss(?:ed|ing)? (?:him|her|them|you)|mourn(?:ed|ing)?|depress(?:ed|ing)|hopeless|devastat(?:ed|ing)|woke up crying)\b/gi,
      line: "Sadness often points to a loss or longing that is still being processed. It usually asks for gentleness more than analysis." },
    joy: { label: 'Joy', re: /\b(?:happy|joy(?:ful)?|excited|exciting|wonderful|amazing|beautiful|loved|loving|laugh(?:ed|ing)?|delight(?:ed|ful)?|euphoric|thrill(?:ed|ing)|fun|great|fantastic|proud|free(?:dom)?|alive|elated|blissful)\b/gi,
      line: "Joy suggests a wish, a strength or a connection that's alive for you right now." },
    calm: { label: 'Calm', re: /\b(?:calm|peaceful|peace|relax(?:ed|ing)|serene|safe|content|warm|comfort(?:ed|ing|able)?|cozy|gentle|soothing|tranquil|at ease|relieved|relief)\b/gi,
      line: "Calm suggests acceptance, safety or resolution about whatever the dream touched." },
    anger: { label: 'Anger', re: /\b(?:angry|anger|furious|rage|mad|yell(?:ed|ing)|screamed at|hate|hated|annoyed|frustrat(?:ed|ing)|irritated|resent(?:ful|ment)?|livid|fuming)\b/gi,
      line: "Anger often points to a boundary crossed or a need that isn't being met, something you may not have had a chance to say." },
    shame: { label: 'Embarrassment', re: /\b(?:embarrass(?:ed|ing)|ashamed|humiliat(?:ed|ing)|shame|awkward|self[- ]conscious|mortified)\b/gi,
      line: "Embarrassment points to a fear of being judged or found lacking, which is usually much louder in the dream than in real life." },
    guilt: { label: 'Guilt', re: /\b(?:guilt(?:y)?|sorry|regret|should(?:n'?t)? have|remorse|blame(?:d)?)\b/gi,
      line: "Guilt points to a value you feel you've let down, or something unsaid that you want to repair." },
    confusion: { label: 'Confusion', re: /\b(?:confus(?:ed|ing)|bewildered|disoriented|puzzled|didn'?t understand|couldn'?t understand)\b/gi,
      line: "Confusion often mirrors a decision or situation where you don't yet have enough information or clarity." },
    awe: { label: 'Awe', re: /\b(?:awe|awestruck|magical|breathtaking|incredible|majestic|vast|sacred|mystical|transcend(?:ent)?)\b/gi,
      line: "Awe suggests something larger than your usual concerns is speaking to you, such as meaning, beauty or possibility." },
    helpless: { label: 'Helplessness', re: /\b(?:helpless|powerless|couldn'?t (?:move|run|scream|stop|do anything)|can'?t (?:move|run|scream|stop)|unable to|no control|out of control|stuck|trapped|paraly[sz]ed)\b/gi,
      line: "Helplessness tends to mirror a situation where you feel you lack options, support or a voice." }
  };

  const FEEL_MAP = { scared: 'fear', sad: 'sadness', happy: 'joy', calm: 'calm', angry: 'anger', embarrassed: 'shame', guilty: 'guilt', confused: 'confusion', awed: 'awe', helpless: 'helpless' };

  const SAFETY_RE = /\b(?:kill(?:ing)? myself|suicid(?:e|al)|end(?:ing)? my (?:own )?life|want(?:ed)? to die|don'?t want to (?:live|be alive)|hurt(?:ing)? myself|self[- ]harm|better off (?:dead|without me))\b/i;

  /* --------------------------------------------------------------- HELPERS */
  function normalize(t) {
    return String(t || '')
      .replace(/[‘’ʼ]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, ' - ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
  function countAll(re, text) {
    re.lastIndex = 0;
    const out = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      out.push(m[0]);
      if (m[0].length === 0) re.lastIndex++;
    }
    return out;
  }
  function unique(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function sentence(s) { return s; }

  /* -------------------------------------------------------------- ANALYSIS */
  function analyze(rawText, opts) {
    opts = opts || {};
    const text = normalize(rawText);
    const words = text ? text.split(' ').length : 0;
    if (words < 3) return { ok: false, reason: 'short', words: words };

    // emotions (negated feelings such as "wasn't scared at all" are dropped first)
    const emoText = text.replace(/\b(?:wasn'?t|weren'?t|isn'?t|not|never|no|without|didn'?t feel|don'?t feel)\s+(?:even\s+|really\s+|at all\s+|very\s+|so\s+|that\s+)?\w+/g, ' ');
    const emoScores = {};
    Object.keys(EMOTIONS).forEach(function (k) {
      const hits = countAll(EMOTIONS[k].re, emoText);
      let s = Math.min(hits.length, 3);
      if (s) emoScores[k] = s;
    });
    (opts.feel || []).forEach(function (f) {
      const k = FEEL_MAP[f] || f;
      if (EMOTIONS[k]) emoScores[k] = (emoScores[k] || 0) + 3;
    });
    const emoRanked = Object.keys(emoScores).sort(function (a, b) { return emoScores[b] - emoScores[a]; });
    const emotions = [];
    if (emoRanked.length) {
      emotions.push(emoRanked[0]);
      if (emoRanked[1] && emoScores[emoRanked[1]] >= Math.max(2, emoScores[emoRanked[0]] * 0.6)) emotions.push(emoRanked[1]);
    }

    // themes
    const scored = THEMES.map(function (t, idx) {
      let score = 0;
      let evidence = [];
      t._pats.forEach(function (p) {
        const hits = countAll(p.re, text);
        if (hits.length) {
          score += p.w * Math.min(hits.length, 2);
          evidence = evidence.concat(hits);
        }
      });
      evidence = unique(evidence.map(function (e) { return e.trim(); })).filter(function (e) { return e.length >= 3; });
      return { theme: t, idx: idx, score: score, evidence: evidence.slice(0, 4) };
    }).filter(function (x) { return x.score >= 2; })
      .sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });

    const safety = SAFETY_RE.test(text);
    const notes = [];
    const recurring = !!opts.recurring || /\b(?:again and again|same dream|keeps? coming back|recurring|every night|over and over|always dream|keep dreaming|dream again|had this (?:dream )?before)\b/.test(text);
    const nightmare = (emoScores.fear || 0) >= 3 || /\b(?:woke up (?:screaming|sweating|terrified|scared|in a panic)|nightmare)\b/.test(text);
    const dayResidue = /\b(?:(?:after|before) (?:i )?(?:watch(?:ed|ing)|read(?:ing)?|play(?:ed|ing)|scroll(?:ed|ing))|(?:movie|show|game|news|book) (?:i|we) (?:watched|read|played)|been (?:stressed|worried|thinking about))\b/.test(text);

    const result = {
      ok: true, words: words, safety: safety, recurring: recurring,
      emotions: emotions.map(function (k) { return { id: k, label: EMOTIONS[k].label }; }),
      themes: scored.map(function (x) { return { id: x.theme.id, name: x.theme.name, glyph: x.theme.glyph, score: x.score, evidence: x.evidence }; })
    };

    if (!scored.length) {
      // Fallback: emotion + continuity based reading
      result.fallback = true;
      result.primary = null;
      result.secondary = [];
      result.confidence = { level: 'loose', label: 'No classic pattern found', note: 'No well-known dream pattern stood out in the wording, so this reading leans on feeling and general principles rather than a symbol.' };
      result.headline = emotions.length
        ? "No classic dream symbol stands out, so the feeling is your best clue."
        : "No classic dream symbol stands out. Most dreams are ordinary replays, so add more detail for a sharper reading.";
      result.paragraphs = [
        "Most dreams are everyday remixes: recent events, people and worries rearranged by a brain that is sorting memory and emotion overnight. Without a famous symbol to anchor on, the most reliable clue is how the dream felt and what in your life currently feels the same way."
      ];
      if (emotions.length) {
        result.paragraphs.push(EMOTIONS[emotions[0]].line + " Try finding where you feel " + EMOTIONS[emotions[0]].label.toLowerCase() + " in your waking week, because that is likely what this dream is about.");
      } else {
        result.paragraphs.push("Try adding who was there, where it happened, what you did and, above all, how it felt. Even one clear emotion changes the reading.");
      }
      result.lenses = {
        jung: "Jung would say to pick the single most vivid image and ask what you associate with it, rather than reaching for a dictionary.",
        folk: "Dream dictionaries need a recognizable symbol. Add a few more details and try again.",
        science: "Dream content tends to mirror waking concerns (the continuity hypothesis), mixed with fragments of memory. Specific symbol meanings aren't scientifically established."
      };
      result.ask = [
        "How did the dream feel, and where do you feel that way in your waking life?",
        "Who or what from the last couple of days showed up in it?",
        "What was the one image that stuck with you?"
      ];
    } else {
      const top = scored[0];
      const t = top.theme;
      const suppressed = t.suppresses || [];
      const secondaries = scored.slice(1).filter(function (x) {
        return suppressed.indexOf(x.theme.id) === -1 && x.score >= Math.max(3, top.score * 0.5);
      }).slice(0, 3);
      result.primary = { id: t.id, name: t.name, glyph: t.glyph, evidence: top.evidence };
      result.secondary = secondaries.map(function (x) {
        return { id: x.theme.id, name: x.theme.name, glyph: x.theme.glyph, core: x.theme.core, evidence: x.evidence };
      });

      // confidence
      const second = scored[1];
      let level = top.score >= 7 ? 'strong' : top.score >= 3 ? 'good' : 'loose';
      let note = 'Based on how closely your wording matches well-known dream patterns. It says nothing about whether the reading is "true", because no one can know that.';
      if (second && second.score >= top.score * 0.85 && top.score >= 4) {
        note = 'Two themes are nearly tied, so read both. The reading below leads with the higher-scoring one.';
      }
      result.confidence = { level: level, label: level === 'strong' ? 'Strong pattern match' : level === 'good' ? 'Good pattern match' : 'Loose pattern match', note: note };

      result.headline = t.core;
      const paragraphs = [t.detail];
      // variants
      const added = [];
      t.variants.forEach(function (v) {
        let ok = false;
        if (v.when && v.when.test(text)) ok = true;
        if (v.emo) {
          const need = Array.isArray(v.emo) ? v.emo : [v.emo];
          if (need.some(function (e) { return emotions.indexOf(e) !== -1; })) ok = true;
        }
        if (ok && added.length < 3) added.push(v.add);
      });
      added.forEach(function (a) { paragraphs.push(a); });

      // emotion line
      if (emotions.length) {
        const e = emotions[0];
        const calmish = ['joy', 'calm', 'awe'].indexOf(e) !== -1;
        const scaryish = ['fear', 'anger', 'helpless', 'sadness', 'shame', 'guilt'].indexOf(e) !== -1;
        if (t.tone === 'neg' && calmish) {
          paragraphs.push("Notice that you felt " + EMOTIONS[e].label.toLowerCase() + " even though this theme is usually unsettling. Emotion is the best single clue in dream interpretation, and a mismatch like this tends to soften the reading toward acceptance, relief or excitement about the thing, not fear of it.");
        } else if (t.tone === 'pos' && scaryish) {
          paragraphs.push("This theme is usually pleasant, yet you felt " + EMOTIONS[e].label.toLowerCase() + ". That often points to mixed feelings about something you want: it matters to you, and part of you is worried about it.");
        } else {
          paragraphs.push(EMOTIONS[e].line);
        }
      }
      result.paragraphs = paragraphs;
      result.lenses = { jung: t.jung, folk: t.folk, science: t.science || "Dream content tends to mirror waking concerns. Specific symbol meanings aren't scientifically established." };
      const ask = t.ask.slice();
      if (emotions.length) ask.push("You felt " + EMOTIONS[emotions[0]].label.toLowerCase() + ". Where else in your life do you feel that lately?");
      result.ask = ask;
    }

    // notes (apply to both)
    if (recurring) notes.push({ kind: 'recurring', text: "You mentioned this has come up before. A common view, consistent with the continuity idea, is that recurring dreams track a stressor or theme that hasn't settled yet, and they often fade when the waking situation does." });
    if (nightmare) notes.push({ kind: 'nightmare', text: "If bad dreams are frequent or leave you shaken, a doctor or therapist can help. Imagery rehearsal, which means rewriting the ending while awake, is a well-studied treatment for recurring nightmares." });
    if (dayResidue) notes.push({ kind: 'residue', text: "You mentioned things from your day. Dreams often borrow from what you watched, read or worried about, so part of the 'meaning' may simply be leftovers." });
    result.notes = notes;
    return result;
  }

  /* ----------------------------------------------------------------- EXPORT */
  function themeInfo(id) {
    for (let i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return null;
  }
  function libraryEntry(id) {
    const t = themeInfo(id);
    if (!t) return null;
    return {
      id: t.id, name: t.name, glyph: t.glyph, headline: t.core, paragraphs: [t.detail].concat(t.variants.map(function (v) { return v.add; })),
      lenses: { jung: t.jung, folk: t.folk, science: t.science }, ask: t.ask
    };
  }
  function listThemes() {
    return THEMES.map(function (t) { return { id: t.id, name: t.name, glyph: t.glyph, core: t.core }; });
  }

  return {
    analyze: analyze,
    listThemes: listThemes,
    libraryEntry: libraryEntry,
    EMOTION_LABELS: Object.keys(EMOTIONS).reduce(function (o, k) { o[k] = EMOTIONS[k].label; return o; }, {}),
    version: '1.0.0'
  };
});
