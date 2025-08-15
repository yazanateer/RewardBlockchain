// ---- addresses ----
export const contractAddress    = "0x82ee1a186c4a6E0d730f8b3a217Cf0B5e5b1ee25"; // CourseManager
export const certificateAddress = "0xfA7AA66Ff225b195A0Aba45A69D5ff7F79b96C64"; // CourseCertificate (ERC721)
export const tokenAddress       = "0xe22bd445FebCec22A596e124d6Ed2639103bC605"; // EduToken (ERC20)

// ---- ERC20 (EduToken) ABI ----
export const tokenABI = [
  { "inputs": [], "name": "name",    "outputs": [{"internalType":"string","name":"","type":"string"}], "stateMutability":"view", "type":"function" },
  { "inputs": [], "name": "symbol",  "outputs": [{"internalType":"string","name":"","type":"string"}], "stateMutability":"view", "type":"function" },
  { "inputs": [], "name": "decimals","outputs": [{"internalType":"uint8","name":"","type":"uint8"}],   "stateMutability":"view", "type":"function" },
  { "inputs": [{"internalType":"address","name":"account","type":"address"}],
    "name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view","type":"function" },
  // (optional write fns if you ever need them)
  { "inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],
    "name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],
    "name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function" },
  { "inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],
    "name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function" }
];

// ---- CourseManager ABI ----
export const contractABI = [
  // --- owner (for Navbar check) ---
  { "inputs": [], "name": "owner", "outputs": [{"internalType":"address","name":"","type":"address"}], "stateMutability":"view", "type":"function" },

  // --- reads ---
  { "inputs": [], "name": "courseCount", "outputs": [{"internalType":"uint256","name":"","type":"uint256"}], "stateMutability":"view", "type":"function" },
  {
    "inputs": [{"internalType":"uint256","name":"courseId","type":"uint256"}],
    "name":"getCourse",
    "outputs":[
      {"internalType":"uint256","name":"id","type":"uint256"},
      {"internalType":"string","name":"title","type":"string"},
      {"internalType":"string","name":"description","type":"string"},
      {"internalType":"string[3]","name":"milestones","type":"string[3]"},
      {"internalType":"uint256","name":"createdAt","type":"uint256"}
    ],
    "stateMutability":"view","type":"function"
  },
  {
    "inputs":[{"internalType":"uint256","name":"courseId","type":"uint256"}],
    "name":"getCourseSchedule",
    "outputs":[
      {"internalType":"bool","name":"useSchedule","type":"bool"},
      {"internalType":"uint256[3]","name":"notBefore","type":"uint256[3]"},
      {"internalType":"uint256","name":"minGap","type":"uint256"},
      {"internalType":"uint256","name":"deadline","type":"uint256"}
    ],
    "stateMutability":"view","type":"function"
  },
  { "inputs":[{"internalType":"uint256","name":"courseId","type":"uint256"}],
    "name":"getMyMilestoneTimes",
    "outputs":[{"internalType":"uint256[3]","name":"times","type":"uint256[3]"}],
    "stateMutability":"view","type":"function"
  },
  { "inputs":[{"internalType":"uint256","name":"courseId","type":"uint256"}],
    "name":"getMyCompletionTime",
    "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view","type":"function"
  },
  // Reward status (did I get paid? how much is configured?)
  {
    "inputs":[{"internalType":"uint256","name":"courseId","type":"uint256"}],
    "name":"getMyRewardStatus",
    "outputs":[{"internalType":"bool","name":"paid","type":"bool"},{"internalType":"uint256","name":"amount","type":"uint256"}],
    "stateMutability":"view","type":"function"
  },
  { "inputs": [], "name":"getMyRegisteredCourses", "outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}], "stateMutability":"view", "type":"function" },
  {
    "inputs":[{"internalType":"uint256","name":"courseId","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],
    "name":"isRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],
    "stateMutability":"view","type":"function"
  },
  {
    "inputs":[{"internalType":"uint256","name":"courseId","type":"uint256"}],
    "name":"getMyCourseProgress",
    "outputs":[
      {"internalType":"bool","name":"registered","type":"bool"},
      {"internalType":"bool","name":"completed","type":"bool"},
      {"internalType":"uint8","name":"completedCount","type":"uint8"},
      {"internalType":"bool[3]","name":"done","type":"bool[3]"}
    ],
    "stateMutability":"view","type":"function"
  },
  {
    "inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],
    "name":"certificateTokenId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view","type":"function"
  },

  // --- writes ---
  {
    "inputs":[{"internalType":"string","name":"_title","type":"string"},{"internalType":"string","name":"_description","type":"string"},{"internalType":"string[3]","name":"_milestones","type":"string[3]"}],
    "name":"createCourse","outputs":[],"stateMutability":"nonpayable","type":"function"
  },
  { "inputs":[{"internalType":"uint256","name":"courseId","type":"uint256"}], "name":"registerForCourse", "outputs":[], "stateMutability":"nonpayable", "type":"function" },
  {
    "inputs":[{"internalType":"uint256","name":"courseId","type":"uint256"},{"internalType":"uint8","name":"index","type":"uint8"}],
    "name":"completeMilestone","outputs":[],"stateMutability":"nonpayable","type":"function"
  },

  { "inputs":[{"internalType":"uint256","name":"courseId","type":"uint256"},{"internalType":"address","name":"user","type":"address"}],
    "name":"isCompleted","outputs":[{"internalType":"bool","name":"","type":"bool"}],
    "stateMutability":"view","type":"function"
  },
  { "inputs": [], "name":"getMyCompletedCourses", "outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}], "stateMutability":"view", "type":"function" },

  // --- schedule admin ---
  {
    "inputs":[
      {"internalType":"uint256","name":"courseId","type":"uint256"},
      {"internalType":"uint256[3]","name":"notBefore_","type":"uint256[3]"},
      {"internalType":"uint256","name":"minGap_","type":"uint256"},
      {"internalType":"uint256","name":"deadline_","type":"uint256"}
    ],
    "name":"setCourseSchedule","outputs":[],"stateMutability":"nonpayable","type":"function"
  },
  { "inputs":[{"internalType":"uint256","name":"courseId","type":"uint256"}], "name":"clearCourseSchedule", "outputs":[], "stateMutability":"nonpayable", "type":"function" },

  // --- rewards (fixed) ---
  { "inputs": [], "name": "rewardToken",        "outputs":[{"internalType":"address","name":"","type":"address"}], "stateMutability":"view", "type":"function" },
  { "inputs": [], "name": "REWARD_PER_COURSE",  "outputs":[{"internalType":"uint256","name":"","type":"uint256"}], "stateMutability":"view", "type":"function" },
  { "inputs": [{"internalType":"address","name":"token","type":"address"}], "name":"setRewardToken", "outputs":[], "stateMutability":"nonpayable", "type":"function" },
  { "inputs": [{"internalType":"address","name":"cert","type":"address"}],  "name":"setCertificate", "outputs":[], "stateMutability":"nonpayable", "type":"function" },

  // --- events ---
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType":"uint256","name":"courseId","type":"uint256"},
      {"indexed": false,"internalType":"string","name":"title","type":"string"},
      {"indexed": false,"internalType":"string","name":"description","type":"string"},
      {"indexed": false,"internalType":"string[3]","name":"milestones","type":"string[3]"},
      {"indexed": false,"internalType":"uint256","name":"timestamp","type":"uint256"}
    ],
    "name":"CourseCreated","type":"event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType":"address","name":"user","type":"address"},
      {"indexed": true,"internalType":"uint256","name":"courseId","type":"uint256"},
      {"indexed": false,"internalType":"uint256","name":"timestamp","type":"uint256"}
    ],
    "name":"Registered","type":"event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType":"address","name":"user","type":"address"},
      {"indexed": true,"internalType":"uint256","name":"courseId","type":"uint256"},
      {"indexed": false,"internalType":"uint8","name":"index","type":"uint8"},
      {"indexed": false,"internalType":"uint256","name":"timestamp","type":"uint256"}
    ],
    "name":"MilestoneCompleted","type":"event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType":"address","name":"user","type":"address"},
      {"indexed": true,"internalType":"uint256","name":"courseId","type":"uint256"},
      {"indexed": false,"internalType":"uint256","name":"timestamp","type":"uint256"}
    ],
    "name":"CourseCompleted","type":"event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType":"address","name":"user","type":"address"},
      {"indexed": true,"internalType":"uint256","name":"courseId","type":"uint256"},
      {"indexed": false,"internalType":"uint256","name":"tokenId","type":"uint256"}
    ],
    "name":"CertificateMinted","type":"event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType":"uint256","name":"courseId","type":"uint256"},
      {"indexed": false,"internalType":"uint256[3]","name":"notBefore","type":"uint256[3]"},
      {"indexed": false,"internalType":"uint256","name":"minGap","type":"uint256"},
      {"indexed": false,"internalType":"uint256","name":"deadline","type":"uint256"}
    ],
    "name":"MilestoneScheduleSet","type":"event"
  },
  {
    "anonymous": false,
    "inputs": [{"indexed": true,"internalType":"uint256","name":"courseId","type":"uint256"}],
    "name":"MilestoneScheduleCleared","type":"event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,"internalType":"address","name":"user","type":"address"},
      {"indexed": true,"internalType":"uint256","name":"courseId","type":"uint256"},
      {"indexed": false,"internalType":"uint256","name":"amount","type":"uint256"}
    ],
    "name":"RewardPaid","type":"event"
  }
];

// ---- CourseCertificate (ERC721) ABI ----
export const certificateABI = [
  { "inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}], "name":"tokenURI", "outputs":[{"internalType":"string","name":"","type":"string"}], "stateMutability":"view", "type":"function" },
  { "inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}], "name":"ownerOf",  "outputs":[{"internalType":"address","name":"","type":"address"}], "stateMutability":"view", "type":"function" },
  { "inputs":[], "name":"name",   "outputs":[{"internalType":"string","name":"","type":"string"}], "stateMutability":"view", "type":"function" },
  { "inputs":[], "name":"symbol", "outputs":[{"internalType":"string","name":"","type":"string"}], "stateMutability":"view", "type":"function" }
];

export default { contractAddress, contractABI, certificateAddress, certificateABI, tokenABI, tokenAddress };
