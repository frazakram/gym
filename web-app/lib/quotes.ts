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
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown", categories: ['generation', 'workout', 'general'] },
  { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown", categories: ['generation', 'workout'] },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger", categories: ['generation', 'workout'] },
  { text: "Success isn't always about greatness. It's about consistency.", author: "Dwayne Johnson", categories: ['generation', 'general'] },
  { text: "Don't limit your challenges. Challenge your limits.", author: "Jerry Dunn", categories: ['generation', 'general'] },
  { text: "The hard days are what make you stronger.", author: "Aly Raisman", categories: ['generation', 'workout'] },
  { text: "Strength does not come from the body. It comes from the will.", author: "Gandhi", categories: ['generation', 'workout'] },
  { text: "Rome wasn't built in a day, but they worked on it every single day.", author: "Unknown", categories: ['generation', 'general'] },

  // --- Workout ---
  { text: "No man has the right to be an amateur in the matter of physical training.", author: "Socrates", categories: ['workout', 'general'] },
  { text: "The clock is ticking. Are you becoming the person you want to be?", author: "Greg Plitt", categories: ['workout', 'general'] },
  { text: "The resistance that you fight physically in the gym strengthens you character.", author: "Arnold Schwarzenegger", categories: ['workout'] },
  { text: "Training gives us an outlet for suppressed energies created by stress.", author: "Arnold Schwarzenegger", categories: ['workout', 'rest'] },
  { text: "You don't have to be extreme, just consistent.", author: "Unknown", categories: ['workout', 'general'] },
  { text: "What hurts today makes you stronger tomorrow.", author: "Jay Cutler", categories: ['workout'] },
  { text: "If it doesn't challenge you, it doesn't change you.", author: "Fred DeVito", categories: ['workout', 'generation'] },
  { text: "Push harder than yesterday if you want a different tomorrow.", author: "Vincent Williams", categories: ['workout'] },

  // --- Diet / Nutrition ---
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn", categories: ['diet', 'general'] },
  { text: "You are what you eat, so don't be fast, cheap, easy, or fake.", author: "Unknown", categories: ['diet'] },
  { text: "Let food be thy medicine and medicine be thy food.", author: "Hippocrates", categories: ['diet'] },
  { text: "Eat for the body you want, not for the body you have.", author: "Unknown", categories: ['diet'] },
  { text: "Nutrition is the foundation. Training is the catalyst.", author: "Unknown", categories: ['diet', 'workout'] },
  { text: "The food you eat can be either the safest form of medicine or the slowest form of poison.", author: "Ann Wigmore", categories: ['diet'] },
  { text: "Proper nutrition is 80% of the battle.", author: "Unknown", categories: ['diet', 'generation'] },
  { text: "Your diet is a bank account. Good food choices are good investments.", author: "Bethenny Frankel", categories: ['diet'] },

  // --- Coach / Guidance ---
  { text: "A coach is someone who tells you what you don't want to hear so you can be who you've always wanted to be.", author: "Tom Landry", categories: ['coach'] },
  { text: "Everyone needs a coach. Every famous athlete had a coach.", author: "Bill Gates", categories: ['coach'] },
  { text: "Accountability is the glue that ties commitment to the result.", author: "Bob Proctor", categories: ['coach', 'general'] },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King", categories: ['coach', 'workout'] },

  // --- Analytics / Progress ---
  { text: "What gets measured gets managed.", author: "Peter Drucker", categories: ['analytics'] },
  { text: "Progress, not perfection, is what we should be asking of ourselves.", author: "Julia Cameron", categories: ['analytics', 'general'] },
  { text: "Small progress is still progress.", author: "Unknown", categories: ['analytics', 'general'] },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier", categories: ['analytics', 'generation'] },
  { text: "Track your progress. You'll be amazed at how far you've come.", author: "Unknown", categories: ['analytics'] },
  { text: "The only way to see results is to stay consistent and track everything.", author: "Unknown", categories: ['analytics', 'general'] },

  // --- Rest / Recovery ---
  { text: "Rest when you're weary. Refresh and renew yourself, your body, your mind.", author: "Ralph Marston", categories: ['rest'] },
  { text: "Recovery is not a sign of weakness. It's a sign of intelligence.", author: "Unknown", categories: ['rest'] },
  { text: "Your body whispers before it screams. Listen to it.", author: "Unknown", categories: ['rest', 'general'] },
  { text: "Sleep is the best meditation.", author: "Dalai Lama", categories: ['rest'] },
  { text: "Almost everything will work again if you unplug it for a few minutes, including you.", author: "Anne Lamott", categories: ['rest'] },

  // --- General Motivation ---
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", categories: ['general', 'generation'] },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", categories: ['general'] },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", categories: ['general'] },
  { text: "It's not about having time. It's about making time.", author: "Unknown", categories: ['general', 'workout'] },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln", categories: ['general'] },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson", categories: ['general'] },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun", categories: ['general', 'generation'] },
  { text: "Great things never come from comfort zones.", author: "Unknown", categories: ['general', 'workout'] },
]

/**
 * Get a random quote, optionally filtered by category.
 */
export function getRandomQuote(category?: QuoteCategory): Quote {
  const pool = category
    ? QUOTES.filter(q => q.categories.includes(category))
    : QUOTES
  const safePool = pool.length > 0 ? pool : QUOTES
  return safePool[Math.floor(Math.random() * safePool.length)]
}

/**
 * Get a deterministic quote that changes every ~60 seconds.
 * Useful for loading states so quote doesn't flicker on re-renders.
 */
export function getQuote(category?: QuoteCategory): Quote {
  const pool = category
    ? QUOTES.filter(q => q.categories.includes(category))
    : QUOTES
  const safePool = pool.length > 0 ? pool : QUOTES
  const index = Math.floor(Date.now() / 60_000) % safePool.length
  return safePool[index]
}
