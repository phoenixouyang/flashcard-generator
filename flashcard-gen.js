// require dependencies
const fs = require('fs');
const OpenAI = require('openai');

// read markdown file as a string
const systemPrompt = fs.readFileSync('./INSTRUCTIONS.md', 'utf-8');


// set baseurl for openrouter
const baseURL = 'https://openrouter.ai/api/v1';

// set path to find .env file
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
  quiet: true
});

const { OPENROUTER_API_KEY } = process.env

async function main() {

  console.log("Flashcard Generator - Developed by Phoenix Ouyang");
  console.log("-------------------------------------------------");

  // check for openrouter api key
  if (!OPENROUTER_API_KEY) {
      console.error(`Missing API Key: OPENROUTER_API_KEY`);
      process.exit(1);
  }

  // create new instance of OpenAI
  const openai = new OpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL
  });

  // get command line arguments
  const args = process.argv.slice(2);
  
  let notesPath = null;
  let count = 3;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count') {
      if (i + 1 < args.length) {
        count = parseInt(args[i + 1], 10);
        if (isNaN(count) || count <= 0 || count > 5) {
          console.log('Count must be between 1 and 5');
          process.exit(1);
        }
        i++;
      } else {
        console.log('Please enter a value for --count, or exclude it from your arguments');
        process.exit(1);
      }
    } else if (!notesPath) {
      notesPath = args[i];
    } else {
      console.log('Please enter one note path');
      console.log('Usage: node flashcard-gen.js path/to/notes.md [--count NUMBER]');
      process.exit(1);
    }
  }

  // check if a file was provided
  if (!notesPath) {
    console.error('Please provide a file for your notes');
    console.log('Usage: node flashcard-gen.js path/to/notes.md [--count NUMBER]');
    process.exit(1);
  }

  
  let content;
  try {
    content = fs.readFileSync(notesPath, 'utf-8');
  } catch (err) {
    console.log(`Could not read file ${notesPath}: ${err.message}`);
    process.exit(1);
  }
  
  const userPrompt = `<notes>
  ${content}
  </notes>

  Generate ${count} flashcards from the notes above.

  In the question field, expand all acronyms. Each acronym should be replaced by its full form. 
  `;

  console.log("Please wait a few minutes for your flashcards to generate.");
  console.log("----------------------------------------------------------");
  
  const response = await openai.chat.completions.create({
    model: 'google/gemini-2.0-flash-001', // WARNING: this is a paid model
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ],
    temperature: 0.5,

  });
  
  const message = response.choices[0]?.message?.content;

  // Extract all cards using regex
  const cardRegex = /=== CARD \d+ ===.*?===/gs;
  const cards = message.match(cardRegex);

  if (!cards) {
    console.log(message);
    console.log('❌ No cards found in output.');
    process.exit(1);
  }

  console.log(`\n✅ Generated ${cards.length} flashcard(s):\n`);
  cards.forEach((card) => {
    console.log(card);
    console.log(); 
  });

}

main();