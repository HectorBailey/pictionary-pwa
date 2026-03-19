const WORDS = [
  // Animals
  'cat', 'dog', 'elephant', 'giraffe', 'penguin', 'dolphin', 'butterfly', 'snake',
  'rabbit', 'turtle', 'owl', 'shark', 'octopus', 'flamingo', 'frog', 'bear',
  'horse', 'whale', 'spider', 'bee', 'parrot', 'crab', 'jellyfish', 'monkey',

  // Food & Drink
  'pizza', 'banana', 'hamburger', 'ice cream', 'watermelon', 'sushi', 'cake',
  'cookie', 'taco', 'popcorn', 'pancake', 'donut', 'avocado', 'pineapple',
  'grapes', 'cheese', 'sandwich', 'chocolate', 'coffee', 'cupcake',

  // Objects
  'umbrella', 'guitar', 'bicycle', 'camera', 'scissors', 'lightbulb', 'telescope',
  'anchor', 'key', 'balloon', 'candle', 'diamond', 'crown', 'compass', 'hourglass',
  'ladder', 'magnet', 'envelope', 'trophy', 'wheelbarrow', 'kite', 'drum',
  'backpack', 'hammer', 'paintbrush',

  // Nature
  'mountain', 'volcano', 'rainbow', 'cactus', 'sunflower', 'mushroom', 'tornado',
  'island', 'waterfall', 'snowflake', 'palm tree', 'lightning', 'wave', 'moon',
  'forest', 'river', 'cloud', 'sunrise', 'iceberg', 'cave',

  // Places & Buildings
  'castle', 'lighthouse', 'pyramid', 'bridge', 'windmill', 'igloo', 'tent',
  'skyscraper', 'treehouse', 'barn', 'church', 'fountain',

  // Transport
  'rocket', 'submarine', 'helicopter', 'sailboat', 'hot air balloon', 'train',
  'ambulance', 'skateboard', 'canoe', 'tractor',

  // People & Body
  'pirate', 'wizard', 'robot', 'astronaut', 'mermaid', 'ninja', 'clown',
  'skeleton', 'ghost', 'angel', 'detective',

  // Activities
  'fishing', 'surfing', 'camping', 'bowling', 'skiing', 'painting',
  'juggling', 'gardening', 'cooking', 'diving',

  // Household
  'bathtub', 'lamp', 'couch', 'television', 'toaster', 'bookshelf', 'pillow',
  'mirror', 'stairs', 'window', 'clock', 'broom',

  // Clothing & Accessories
  'hat', 'glasses', 'necklace', 'boot', 'glove', 'scarf', 'crown', 'ring',

  // Misc
  'treasure chest', 'spaceship', 'dragon', 'unicorn', 'sword', 'shield',
  'map', 'flag', 'bone', 'skull', 'feather', 'heart', 'star', 'fire',
  'snowman', 'scarecrow', 'parachute', 'drum', 'violin', 'piano',
  'globe', 'satellite', 'meteor', 'rainbow', 'tornado',

  // More drawable nouns
  'chair', 'table', 'door', 'fence', 'wheel', 'bell', 'chain',
  'nest', 'web', 'leaf', 'acorn', 'branch', 'log', 'rock',
  'sand castle', 'snowboard', 'trampoline', 'swing', 'slide',
  'ferris wheel', 'roller coaster', 'carousel', 'maze',
  'volcano', 'glacier', 'desert', 'jungle', 'swamp',
  'cannon', 'catapult', 'bow and arrow', 'axe',
  'treasure map', 'binoculars', 'magnifying glass',
  'stethoscope', 'thermometer', 'bandage',
  'traffic light', 'stop sign', 'mailbox',
  'lollipop', 'candy cane', 'gingerbread man',
  'jack-o-lantern', 'christmas tree', 'present',
  'fireworks', 'birthday cake', 'party hat',
]

// Deduplicate
const UNIQUE_WORDS = [...new Set(WORDS)]

export function getRandomWordOptions(count = 3): string[] {
  const shuffled = [...UNIQUE_WORDS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
