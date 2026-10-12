# PromptChain, explained simply

## The problem

Imagine you're a student with an assignment due tomorrow. You open ChatGPT and type: "Write code for sorting." You get back something generic — maybe it works, maybe it's missing error handling you didn't think to ask for. You don't know why the answer wasn't better, or what to change to get a better one. So you rephrase it, guess again, and hope.

This happens to almost everyone who uses AI chatbots, not just students. The quality of the answer depends heavily on how you ask, and most people have no reliable way to tell a good question from a bad one until after they've already gotten a disappointing answer.

## What PromptChain does

PromptChain automates the guessing-and-rephrasing process, and it does it in a way you can actually watch happen.

Instead of you rewriting your question five times by trial and error, the tool does that work for you. You give it a starting question. It sends that question to an AI model and gets an answer back. Then a second AI model — acting purely as a judge, not the one that answered — reads the question and the answer and scores it across nine dimensions of quality: whether the answer was clear, whether it handled tricky edge cases, whether it stayed on topic, and so on. That score isn't a single number pulled from nowhere — it comes with a short written reason for each dimension, the same way a teacher might leave comments on an essay explaining a grade.

PromptChain doesn't stop there. It takes that judge's feedback and uses it to write a new, improved version of the original question — targeting whatever the judge flagged as weak. Then it asks that new version, gets a new answer, and judges that one too. It repeats this cycle a few times, always keeping the best-scoring version so far and only replacing it if a new attempt actually scores higher.

## Why the "loop" part matters

Think of a photographer shooting a fast-moving subject. They don't take one photo and hope. They take several, look at each, keep the best, and adjust the angle or the light based on what didn't work last time. Nobody thinks the tenth photo is cheating — it's just what happens when you get to try again with feedback each time.

PromptChain applies that idea to writing prompts. It's a bit like a spellchecker, but instead of catching a typo, it's catching the deeper reasons a question doesn't get you what you want, and it proposes entire rewrites — not just a fixed word — based on scored feedback rather than a guess about what "sounds better."

Because every round is scored and recorded, you see the whole climb, not just the final answer. You can watch the score improve round by round — sometimes a lot, sometimes only slightly, and every so often the first attempt was already close to the best one, in which case the tool correctly leaves it alone rather than forcing a change that makes it worse.

## Who this is for, and what it is not

The tool is built with students and developers learning to work with AI models in mind — people trying to understand not just "type something and see what happens" but why some prompts consistently produce better results, with the reasoning made visible instead of hidden.

It does not guarantee a perfect prompt, and it does not replace understanding what you're actually asking for. It's a structured way to iterate faster and see the reasoning behind each iteration — the same kind of improvement a person could do by hand, just done consistently, so getting better at asking questions becomes something you can observe and learn from, rather than a skill you're expected to already have.
