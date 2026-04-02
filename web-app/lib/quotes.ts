/**
 * Motivational quotes library for loading states and tab transitions.
 * Each quote is tagged by category so views can pull contextually relevant quotes.
 */

export type QuoteCategory =
  | 'generation'
  | 'workout'
  | 'diet'
  | 'coach'
  | 'analytics'
  | 'rest'
  | 'general'

export interface Quote {
  text: string
  author: string
  categories: QuoteCategory[]
}

const QUOTES: Quote[] = [
  // --- Generation / Motivation ---
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger", categories: ['generation', 'workout'] },
  { text: "Success isn't always about greatness. It's about consistency.", author: "Dwayne Johnson", categories: ['generation', 'general'] },
  { text: "Don't limit your challenges. Challenge your limits.", author: "Jerry Dunn", categories: ['generation', 'general'] },
  { text: "The hard days are what make you stronger.", author: "Aly Raisman", categories: ['generation', 'workout'] },
  { text: "Strength does not come from the body. It comes from the will.", author: "Mahatma Gandhi", categories: ['generation', 'workout'] },
  { text: "We are what we repeatedly do. Excellence is not an act, but a habit.", author: "Aristotle", categories: ['generation', 'general'] },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill", categories: ['generation', 'workout'] },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb", categories: ['generation', 'general'] },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela", categories: ['generation', 'general'] },
  { text: "The difference between try and triumph is a little umph.", author: "Marvin Phillips", categories: ['generation', 'workout'] },
  { text: "If something stands between you and your success, move it. Never be denied.", author: "Dwayne Johnson", categories: ['generation', 'general'] },

  // --- Workout ---
  { text: "No man has the right to be an amateur in the matter of physical training.", author: "Socrates", categories: ['workout', 'general'] },
  { text: "The clock is ticking. Are you becoming the person you want to be?", author: "Greg Plitt", categories: ['workout', 'general'] },
  { text: "The resistance that you fight physically in the gym strengthens your character.", author: "Arnold Schwarzenegger", categories: ['workout'] },
  { text: "Training gives us an outlet for suppressed energies created by stress.", author: "Arnold Schwarzenegger", categories: ['workout', 'rest'] },
  { text: "What hurts today makes you stronger tomorrow.", author: "Jay Cutler", categories: ['workout'] },
  { text: "If it doesn't challenge you, it doesn't change you.", author: "Fred DeVito", categories: ['workout', 'generation'] },
  { text: "Push harder than yesterday if you want a different tomorrow.", author: "Vincent Williams", categories: ['workout'] },
  { text: "The last three or four reps is what makes the muscle grow.", author: "Arnold Schwarzenegger", categories: ['workout'] },
  { text: "Sweat is just fat crying.", author: "Tony Horton", categories: ['workout'] },
  { text: "Your muscles don't know how much weight you're lifting. They only know effort.", author: "Dorian Yates", categories: ['workout'] },
  { text: "The iron never lies to you. Two hundred pounds is always two hundred pounds.", author: "Henry Rollins", categories: ['workout'] },
  { text: "I don't count my sit-ups. I only start counting when it starts hurting.", author: "Muhammad Ali", categories: ['workout'] },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso", categories: ['workout', 'generation'] },
  { text: "Once you learn to quit, it becomes a habit.", author: "Vince Lombardi", categories: ['workout', 'general'] },
  { text: "To keep the body in good health is a duty, otherwise we cannot keep the mind strong.", author: "Buddha", categories: ['workout', 'rest'] },
  { text: "The only place where success comes before work is in the dictionary.", author: "Vidal Sassoon", categories: ['workout', 'general'] },

  // --- Diet / Nutrition ---
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn", categories: ['diet', 'general'] },
  { text: "Let food be thy medicine and medicine be thy food.", author: "Hippocrates", categories: ['diet'] },
  { text: "The food you eat can be either the safest form of medicine or the slowest form of poison.", author: "Ann Wigmore", categories: ['diet'] },
  { text: "Your diet is a bank account. Good food choices are good investments.", author: "Bethenny Frankel", categories: ['diet'] },
  { text: "Those who think they have no time for healthy eating will sooner or later have to find time for illness.", author: "Edward Stanley", categories: ['diet'] },
  { text: "One cannot think well, love well, sleep well, if one has not dined well.", author: "Virginia Woolf", categories: ['diet'] },
  { text: "The greatest wealth is health.", author: "Virgil", categories: ['diet', 'general'] },
  { text: "He who has health has hope, and he who has hope has everything.", author: "Thomas Carlyle", categories: ['diet', 'general'] },
  { text: "Every time you eat is an opportunity to nourish your body.", author: "Michael Pollan", categories: ['diet'] },
  { text: "Eat breakfast like a king, lunch like a prince, dinner like a pauper.", author: "Adelle Davis", categories: ['diet'] },
  { text: "Don't dig your grave with your own knife and fork.", author: "English Proverb", categories: ['diet'] },
  { text: "Life expectancy would grow by leaps and bounds if green vegetables smelled as good as bacon.", author: "Doug Larson", categories: ['diet'] },

  // --- Coach / Guidance ---
  { text: "A coach is someone who tells you what you don't want to hear so you can be who you've always wanted to be.", author: "Tom Landry", categories: ['coach'] },
  { text: "Everyone needs a coach. Every famous athlete had a coach.", author: "Bill Gates", categories: ['coach'] },
  { text: "Accountability is the glue that ties commitment to the result.", author: "Bob Proctor", categories: ['coach', 'general'] },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King", categories: ['coach', 'workout'] },
  { text: "A good coach can change a game. A great coach can change a life.", author: "John Wooden", categories: ['coach'] },
  { text: "The mediocre teacher tells. The good teacher explains. The great teacher inspires.", author: "William Arthur Ward", categories: ['coach'] },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein", categories: ['coach', 'general'] },
  { text: "Coming together is a beginning, staying together is progress, working together is success.", author: "Henry Ford", categories: ['coach'] },

  // --- Analytics / Progress ---
  { text: "What gets measured gets managed.", author: "Peter Drucker", categories: ['analytics'] },
  { text: "Progress, not perfection, is what we should be asking of ourselves.", author: "Julia Cameron", categories: ['analytics', 'general'] },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier", categories: ['analytics', 'generation'] },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu", categories: ['analytics', 'general'] },
  { text: "The secret of change is to focus all of your energy on building the new.", author: "Socrates", categories: ['analytics', 'generation'] },
  { text: "Without data, you're just another person with an opinion.", author: "W. Edwards Deming", categories: ['analytics'] },
  { text: "You can't manage what you can't measure.", author: "W. Edwards Deming", categories: ['analytics'] },
  { text: "It does not matter how slowly you go, as long as you do not stop.", author: "Confucius", categories: ['analytics', 'general'] },
  { text: "What we achieve inwardly will change outer reality.", author: "Plutarch", categories: ['analytics', 'general'] },
  { text: "Be not afraid of growing slowly; be afraid only of standing still.", author: "Chinese Proverb", categories: ['analytics', 'general'] },

  // --- Rest / Recovery ---
  { text: "Rest when you're weary. Refresh and renew yourself, your body, your mind.", author: "Ralph Marston", categories: ['rest'] },
  { text: "Sleep is the best meditation.", author: "Dalai Lama", categories: ['rest'] },
  { text: "Almost everything will work again if you unplug it for a few minutes, including you.", author: "Anne Lamott", categories: ['rest'] },
  { text: "The time to relax is when you don't have time for it.", author: "Sydney J. Harris", categories: ['rest'] },
  { text: "Tension is who you think you should be. Relaxation is who you are.", author: "Chinese Proverb", categories: ['rest'] },
  { text: "Your calm mind is the ultimate weapon against your challenges.", author: "Bryant McGill", categories: ['rest', 'general'] },
  { text: "Sometimes the most productive thing you can do is relax.", author: "Mark Black", categories: ['rest'] },
  { text: "An empty lantern provides no light. Self-care is the fuel that allows your light to shine.", author: "Lucinda Bassett", categories: ['rest'] },

  // --- General Motivation ---
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", categories: ['general', 'generation'] },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", categories: ['general'] },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", categories: ['general'] },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln", categories: ['general'] },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson", categories: ['general'] },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun", categories: ['general', 'generation'] },
  { text: "Whether you think you can, or you think you can't — you're right.", author: "Henry Ford", categories: ['general'] },
  { text: "Tough times never last, but tough people do.", author: "Robert H. Schuller", categories: ['general'] },
  { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery", categories: ['general', 'workout'] },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson", categories: ['general'] },
  { text: "Strive for progress, not perfection.", author: "David Pettit", categories: ['general', 'analytics'] },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar", categories: ['general', 'generation'] },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin", categories: ['general', 'workout'] },
  { text: "Our greatest glory is not in never falling, but in rising every time we fall.", author: "Confucius", categories: ['general'] },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan", categories: ['general'] },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb", categories: ['general', 'generation'] },
  { text: "Be stronger than your strongest excuse.", author: "Elaine Welteroth", categories: ['general', 'workout'] },
]

// Seeded-ish shuffle using a simple hash for better randomness per session
let _shuffled: Quote[] | null = null
function getShuffled(): Quote[] {
  if (!_shuffled) {
    _shuffled = [...QUOTES].sort(() => Math.random() - 0.5)
  }
  return _shuffled
}

/**
 * Get a random quote, optionally filtered by category.
 * Uses a session-shuffled pool for better variety.
 */
export function getRandomQuote(category?: QuoteCategory): Quote {
  const all = getShuffled()
  const pool = category
    ? all.filter(q => q.categories.includes(category))
    : all
  const safePool = pool.length > 0 ? pool : all
  return safePool[Math.floor(Math.random() * safePool.length)]
}

// Counter for round-robin selection per category to avoid repeats
const _counters: Record<string, number> = {}

/**
 * Get a quote that rotates on each call per category.
 * Deterministic within the same minute, shuffled across sessions.
 */
export function getQuote(category?: QuoteCategory): Quote {
  const all = getShuffled()
  const pool = category
    ? all.filter(q => q.categories.includes(category))
    : all
  const safePool = pool.length > 0 ? pool : all
  const key = category || '__all__'
  const counter = (_counters[key] || 0)
  _counters[key] = counter + 1
  // Mix time + counter for unique picks
  const index = (Math.floor(Date.now() / 60_000) + counter) % safePool.length
  return safePool[index]
}
