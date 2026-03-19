import easyRaw from '../../words/easy.txt?raw'
import mediumRaw from '../../words/medium.txt?raw'
import hardRaw from '../../words/hard.txt?raw'
import myWordsRaw from '../../words/myWords.txt?raw'
import objectsRaw from '../../words/objects.txt?raw'

function parseWordList(raw: string): string[] {
  return raw
    .split('\n')
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 0)
}

const EASY = parseWordList(easyRaw)
const MEDIUM = parseWordList(mediumRaw)
const MY_WORDS = parseWordList(myWordsRaw)
const OBJECTS = parseWordList(objectsRaw)
const HARD = parseWordList(hardRaw)

const NORMAL_WORDS = [...new Set([...EASY, ...MEDIUM, ...MY_WORDS, ...OBJECTS])]
const HARD_WORDS = [...new Set(HARD)]

export function getRandomWordOptions(count = 3, hard = false): string[] {
  const pool = hard ? HARD_WORDS : NORMAL_WORDS
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
