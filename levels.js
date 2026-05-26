const LEVELS = [
  {
    id: 1,
    title: "Two",
    start: [".....",".....",".....",".....","....."],
    goal:  [".....",".....","..XX.",".....","....."],
    seeds: 2,
    maxTicks: 0,
    hint: "Just tap two empty cells."
  },
  {
    id: 2,
    title: "Triangle",
    start: [".....",".....",".....",".....","....."],
    goal:  [".....","..X..",".X.X.",".....","....."],
    seeds: 3,
    maxTicks: 0,
    hint: "Tap the three cells the goal shows."
  },
  {
    id: 3,
    title: "Born",
    start: [".....",".....",".....",".....","....."],
    goal:  [".....",".....",".XXX.",".....","....."],
    seeds: 2,
    maxTicks: 1,
    hint: "Place two seeds vertically across the center row, then tick."
  },
  {
    id: 4,
    title: "Cross",
    start: [".....",".....",".....",".....","....."],
    goal:  [".....",".X.X.","..X..",".X.X.","....."],
    seeds: 2,
    maxTicks: 2,
    hint: "Two seeds, two ticks. Symmetry helps."
  },
  {
    id: 5,
    title: "Pillar",
    start: [".....",".....",".....",".....","....."],
    goal:  ["..X..","..X..","..X..","..X..","..X.."],
    seeds: 2,
    maxTicks: 5,
    hint: "Two seeds will grow into a column. Pick the right ones."
  },
  {
    id: 6,
    title: "Spread",
    start: [".....",".....",".....",".....","....."],
    goal:  [".....",".....","XXXXX",".....","....."],
    seeds: 2,
    maxTicks: 4,
    hint: "A pair of seeds becomes the whole row."
  },
  {
    id: 7,
    title: "Compass",
    start: [".....",".....",".....",".....","....."],
    goal:  ["..X..",".....","X...X",".....","..X.."],
    seeds: 2,
    maxTicks: 3,
    hint: "Cells on the middle axis can reach the corners."
  },
  {
    id: 8,
    title: "Mirror",
    start: [".....",".....",".....",".....","....."],
    goal:  [".....",".X.X.",".X.X.",".....","....."],
    seeds: 2,
    maxTicks: 2,
    hint: "Two seeds, vertically stacked."
  },
  {
    id: 9,
    title: "Echo",
    start: [".....","..X..",".....","..X..","....."],
    goal:  [".....",".X.X.","..X..",".X.X.","....."],
    seeds: 2,
    maxTicks: 2,
    hint: "Sometimes the garden grows on its own."
  },
  {
    id: 10,
    title: "Bloom",
    start: [".....",".....",".....",".....","....."],
    goal:  [".X.X.",".....",".X.X.",".....","....."],
    seeds: 2,
    maxTicks: 3,
    hint: "Two seeds high in the grid. Three ticks. Watch it travel."
  }
];
