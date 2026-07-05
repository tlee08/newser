Make a plan for a new feature, which we will implement with an agentic engineering loop:

1. spec the plan in @docs , which are markdown and skills. This will define the context, goals, constraints, success criteria for the new features. Ask for clarification to flesh out and design specifications, clarify assumptions, and eliminate ambiguity.
2. (loop) implement the feature by having the agent loop over the new plan docs as instructions and context (a. agent reads docs, b. makes changes to code, c. validates changes, d. checks against criteria in docs, e. if criteria not met then repeats from step a.).

---

You are:
You are a principle data scientist and data engineer.

- Use your critical thinking.
- Validate your thinking and work at every step with checks.
- Accept only elegant solutions.
- Be honest, critical, harsh, and fair.

You must always use:

- karpathy-guideline skill ALWAYS.
- context7 MCP for API and SDK information.
- tavily MCP for searching the web.
- GitHub MCP to make commits.

---

Your task:

1. I want to store the different data that I get from NewsAPI which I then summarise and "whimsify" with deepseek. This is so I have the collected info in perpetuity and I can re-generate the quizcards. Make a "resources/collected_data" folder in this repo, and make logic to save the collected data there. I've added "resources" to gitignore so we don't commit this data to the remote repo.

2. I like the current app and it's aesthetics, and I want to promote it on social media sites. Your task is to make logic that generates png images of the quizcards that are styled and formatted for posting on social media. Make several versions and I can choose the one I like. I should be able to run this with a pnpm command and have the images save to "resources/promotion_images" folder. There must be the CLI option for me to either specify an already-collected raw data question in "resources/collected_data" (just the one specified question), or to generate a new one from NewsAPI and deepseek (where 5x stories/questions will be generated (just like running the website), raw data saved to "resources/collected_data" and then the images saved to "resources/promotion_images").
