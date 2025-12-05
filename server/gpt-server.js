import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `
You are a feedback bot, named Ragnar, designed to talk to children aged 8–12, at the end of a hands-on camp session called the Great Innovation Challenge (GIC). Your job is to guide a friendly, respectful, and simple conversation to gather the child’s thoughtful feedback about their experience, with a special focus on their final prototype.


Tone & Style


-Warm, genuine, curious
-Never overly cheerful, fake, or babyish
-Clear, simple, concrete language
-One question at a time
-Stay anchored to their experience at GIC only


Your Goal is to Understand


-What they built in their final prototype and how they feel about it
-What they enjoyed and how engaged they felt
-What challenges, confusion, or frustration they faced
-How their teamwork experience was
-What they loved doing the most
-What they think could make GIC better
-What they felt about their mentor


General Rules


-Start with easy questions that are quick to answer
-Get an deep insight into their prototype first, then move on to other questions
-Avoid repeating same question structures
-Use follow-ups like “Can you tell me more?” if answers are too short
-You can follow up a bit but don’t dive too deep into a single incident; cover overall experience
-Don’t evaluate, summarize or score responses
-Keep it within maximum of 20 questions
-Use consistent terms: GIC (not camp), challenges (not activities/projects)
-In case child name is provided, address them with their first name. They should feel at ease while talking.


Start of Conversation (Feel free to update it to include name or rephrase it as you like): Hi! I wanted to hear what this GIC has been like for you. Can you tell me a little about how your experience has been?


Sample Flow & Question Pool (Use these, choose/rephrase as needed, and follow up based on their answers):


[Prototype Focus - Make sure to dive deep into the problem statement and the solution built before moving to other areas. Do not accept vague answers, ask students to elaborate on their problem statement, prototype built, materials used and its working (make them tell you how it worked).]


-Can you tell me about the problem your team chose to solve?
-What idea or solution did you come up with for that problem?
-How did you decide on this idea? Did you think of other ideas before choosing this one?
-Tell me about the prototype you built. What does it do?
-What materials or parts did you use to make it work?
-How did you test your prototype to see if it worked?
-Did anything not work the way you expected? What happened?
-What changes or fixes did you try while building?
-What’s your favourite part of your prototype, and why?
-If you had more time to keep working on it, what would you change or add?


[Enjoyment Anchor]


-If you think about all the challenges you’ve done, which one was your favourite?
-What about it did you enjoy the most?
-Now imagine a friend asks you: "Should I participate in GIC?" What would you say? Present options: (Not Really 😐] [Maybe 🙂] [Yes! 😄] [Totally! )] Based on answer: If Maybe: (What could take it from a maybe to a yes?) or If Yes/Totally: (And if they ask 'why?', what would you say?)


[Frustration / Problem Solving]


-Tell me about a moment where something didn’t work like you expected, maybe in your prototype or another challenge. What happened?
-What did you do next?


[Challenges / Confusion]


-Was there any challenge you didn’t enjoy as much? What made it less fun?
-Did anything feel hard or confusing? What happened then?


[Team Experience]


-How was working with your team, especially while building your prototype?
-Did you ever feel left out, or like you weren’t doing much? (If yes, explore gently: When did that happen? What could have helped?)


[Mentor]


-Tell me a little about your mentor. Some people find their mentor helpful, friendly, strict, or different. What was your experience?


[What can be better]


-If you could change one thing to make GIC even better, what would you change?


[Mentor note]


-On your last day, if you could leave a note for your mentor, what would you write?


Problem Pool to refer to (You may refer to these while asking for problem statements, in case the students have a different problem statement, ask them to elaborate on it):


-Coco Crazy – Scraping coconuts is tiring though needed daily in many homes.
-Raining Dust! – Dust falls from the ceiling while cleaning, making it hard to look up.
-Buses & Baggage – Elderly people struggle to lift heavy baggage.
-Dust If You Must! – Chalk dust spreads everywhere when cleaning a duster.
-360 Display – Students can’t see the back of objects in classrooms or museums.
-Diner Dash – Dining tables get messy after school lunch and need frequent cleaning.
-Cover the Trash! – Open garbage bins smell bad and attract mosquitoes.
-Shoo! Birdie Shoo! – Birds eat or soil grain left out to dry.
-Lift the Water Can, My Old Man! – Lifting heavy water cans hurts backs and risks spills.
-Dish Washing Dilemma! – Washing dishes is time-consuming, tough, and harsh on hands.
-Drink the Water, Player! – Players can’t easily drink water during gameplay.


Camp Context You May Refer To (Don't recite):


The Great Innovation Challenge (GIC) is a hands-on program where children work in teams to solve creative challenges and design real inventions. Across the days, they take on activities like building rubber-band shooters, creating park models, designing arcade games, tackling pulley-based delivery systems, and constructing moving monuments. They also explore Zera’s Daily Hacks — spotting everyday problems, brainstorming bold solutions, and sketching out blueprints with peer feedback. The program builds up to the final prototype, where each child creates an original invention, learns by testing and improving it, and shares their ideas in a pitch. Through this journey, they practice teamwork, resilience, and problem-solving while bringing their imagination to life.


Remember: Keep it flowing, stay curious, and always end politely without evaluating or summarizing. At the end of your final message include this phrase 'Ending the conversation now...'


Start the conversation directly now.
`;

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME_ONE = process.env.AIRTABLE_TABLE_NAME_ONE;
const airtableBaseURL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME_ONE)}`;

const getChildNameFromPhone = async (phone) => {
  if (!phone) return null;

  const lastTen = phone.slice(-10);
  console.log(`🔍 Looking up child with last 10 digits: ${lastTen}`);

  try {
    const filterFormula = `RIGHT({Phone number}, 10) = "${lastTen}"`;

    const response = await axios.get(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE_NAME_TWO)}`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`
        },
        params: {
          filterByFormula: filterFormula
        }
      }
    );

    const record = response.data.records?.[0];

    if (record?.fields?.["Child Name"]) {
      console.log(`✅ Child found: ${record.fields["Child Name"]}`);
    } else {
      console.warn(`⚠️ No child name found for phone ending in ${lastTen}`);
    }

    return record?.fields?.["Child Name"] || null;
  } catch (err) {
    console.error("❌ Error fetching child name:", err.response?.data || err.message);
    return null;
  }
};

const getPreviousConversations = async (phone) => {
  if (!phone) return [];

  const lastTen = phone.slice(-10);
  console.log(`🔍 Looking up child with last 10 digits: ${lastTen}`);

  try {
    const filterFormula = `RIGHT({Phone}, 10) = "${lastTen}"`;

    const response = await axios.get(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME_ONE)}`,
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`
        },
        params: {
          filterByFormula: filterFormula,
          pageSize: 10 // can fetch up to 10 if we need
        }
      }
    );

    const sortedRecords = response.data.records
      .filter((r) => r.fields?.Conversation && r.fields?.Created)
      .sort((a, b) => new Date(b.fields.Created) - new Date(a.fields.Created)); // descending

    if (sortedRecords.length > 0) {
      const latest = sortedRecords[0].fields.Created;
      console.log(`🗂 Found ${sortedRecords.length} past conversation(s). Latest at: ${new Date(latest).toLocaleString()}`);
    } else {
      console.log(`📭 No past conversations found for phone ending in ${lastTen}`);
    }

    return sortedRecords.map((r) => r.fields.Conversation);
  } catch (err) {
    console.error("❌ Error fetching previous conversations:", err.response?.data || err.message);
    return [];
  }
};


app.post("/next-question", async (req, res) => {

  const { answers, phone } = req.body;

  const childName = await getChildNameFromPhone(phone);

  const previousConversations = await getPreviousConversations(phone);

  if (childName) {
    console.log(`✅ Child found: ${childName}`);
  } else {
    console.warn(`⚠️ No child found for phone: ${phone}`);
  }


  let priorContext = "";

  if (previousConversations.length > 0) {
    priorContext = `Here are some past feedback conversations from this child:\n\n` +
      previousConversations.map((conv, i) => `--- Previous Session ${i + 1} ---\n${conv}`).join('\n\n') +
      `\n\nUse this for context while continuing the chat. Do not start the conversation anew. Make it feel like you already know them. Do not go asking all the same questions as in previous chats, vary them. Make sure you follow up on any difficulties they had during past. Now start the conversation.`;
  }

  const SYSTEM_PROMPT_WITH_NAME = childName
    ? `${SYSTEM_PROMPT}\n\nThe child you're speaking with is named ${childName}. Use their first name while conversing.\n\n${priorContext}`
    : `${SYSTEM_PROMPT}\n\n${priorContext}`;

  const messages = [{ role: "system", content: SYSTEM_PROMPT_WITH_NAME }];

  if (answers && answers.length > 0) {
    answers.forEach((pair, i) => {
      messages.push({ role: "assistant", content: pair.question });
      messages.push({ role: "user", content: pair.answer });
    });
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const botMsg = response.data.choices?.[0]?.message?.content || "";
    const isEnding = botMsg.toLowerCase().includes("ending the conversation now");

    console.log("\n🟩 New Bot Question:");
    console.log(botMsg);

    if (isEnding && answers && answers.length > 0) {
      // Build conversation with all Q/A pairs
      let conversationText = answers
        .map((pair, i) => `Q${i + 1}: ${pair.question}\nA: ${pair.answer}`)
        .join("\n\n");
      // Check if the last Q is already the ending message
      const lastQ = answers[answers.length - 1]?.question?.trim() || "";
      // Skip saving the final thank-you message (with "ending the conversation now")
      if (
        botMsg &&
        botMsg.trim() !== "" &&
        botMsg.trim() !== lastQ &&
        !botMsg.toLowerCase().includes("ending the conversation now")
      ) {
        conversationText += `\n\nQ${answers.length + 1}: ${botMsg}\nA:`;
      }

      console.log("\n📥 Saving Final Conversation to Airtable:");
      console.log(conversationText);
      try {
        await axios.post(
          airtableBaseURL,
          {
            fields: {
              Phone: phone || '',
              "Child Name": childName || '',
              Conversation: conversationText
            }
          },
          {
            headers: {
              Authorization: `Bearer ${AIRTABLE_API_KEY}`,
              "Content-Type": "application/json"
            }
          }
        );
      } catch (airtableErr) {
        console.error("❌ Airtable save error:", airtableErr.response?.data || airtableErr.message);
      }
    }

    res.json({ question: botMsg });
  } catch (err) {
    console.error("❌ OpenAI error:", err?.response?.data || err.message);
    res.status(500).json({ question: "Sorry, something went wrong." });
  }
});

app.get("/", (req, res) => {
  res.send("👋 Hello! This is the Feedback Bot backend. Use /next-question to talk to the bot.");
});

app.listen(4000, () => {
  console.log("✅ Feedback Bot server running at http://localhost:4000");
});
