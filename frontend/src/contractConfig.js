// ---- addresses ----
export const contractAddress    = "0x3c5510213B6Bba082E1aB361d08c974E6f28f3F8"; // CourseManager
export const certificateAddress = "0x5cb1C45d794DecCC40Eec3237EaF2B6998Ba543F"; // CourseCertificate

// ---- CourseManager ABI ----
export const contractABI = [

  {
  "inputs": [],
  "name": "owner",
  "outputs": [{"internalType": "address", "name": "", "type": "address"}],
  "stateMutability": "view",
  "type": "function"
  },
  // reads
  {
    "inputs": [],
    "name": "courseCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "courseId", "type": "uint256" }],
    "name": "getCourse",
    "outputs": [
      { "internalType": "uint256", "name": "id", "type": "uint256" },
      { "internalType": "string", "name": "title", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "string[3]", "name": "milestones", "type": "string[3]" },
      { "internalType": "uint256", "name": "createdAt", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMyRegisteredCourses",
    "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs":[
      { "internalType":"uint256","name":"courseId","type":"uint256" },
      { "internalType":"address","name":"user","type":"address" }
    ],
    "name":"isRegistered",
    "outputs":[{ "internalType":"bool","name":"","type":"bool" }],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[{ "internalType":"uint256","name":"courseId","type":"uint256" }],
    "name":"getMyCourseProgress",
    "outputs":[
      { "internalType":"bool","name":"registered","type":"bool" },
      { "internalType":"bool","name":"completed","type":"bool" },
      { "internalType":"uint8","name":"completedCount","type":"uint8" },
      { "internalType":"bool[3]","name":"done","type":"bool[3]" }
    ],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[
      {"internalType":"address","name":"","type":"address"},
      {"internalType":"uint256","name":"","type":"uint256"}
    ],
    "name":"certificateTokenId",
    "outputs":[{"internalType":"uint256","name":"","type":"uint256"}],
    "stateMutability":"view",
    "type":"function"
  },

  // writes
  {
    "inputs":[
      { "internalType":"string","name":"_title","type":"string" },
      { "internalType":"string","name":"_description","type":"string" },
      { "internalType":"string[3]","name":"_milestones","type":"string[3]" }
    ],
    "name":"createCourse",
    "outputs":[],
    "stateMutability":"nonpayable",
    "type":"function"
  },
  {
    "inputs":[{ "internalType":"uint256","name":"courseId","type":"uint256" }],
    "name":"registerForCourse",
    "outputs":[],
    "stateMutability":"nonpayable",
    "type":"function"
  },
  {
    "inputs":[
      { "internalType":"uint256","name":"courseId","type":"uint256" },
      { "internalType":"uint8","name":"index","type":"uint8" }
    ],
    "name":"completeMilestone",
    "outputs":[],
    "stateMutability":"nonpayable",
    "type":"function"
  },
  {
    "inputs":[
      { "internalType":"uint256","name":"courseId","type":"uint256" },
      { "internalType":"address","name":"user","type":"address" }
    ],
    "name":"isCompleted",
    "outputs":[{ "internalType":"bool","name":"","type":"bool" }],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs": [],
    "name": "getMyCompletedCourses",
    "outputs": [{ "internalType":"uint256[]","name":"","type":"uint256[]" }],
    "stateMutability": "view",
    "type": "function"
  },

  // events (optional to listen)
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType":"uint256","name":"courseId","type":"uint256" },
      { "indexed": false, "internalType":"string","name":"title","type":"string" },
      { "indexed": false, "internalType":"string","name":"description","type":"string" },
      { "indexed": false, "internalType":"string[3]","name":"milestones","type":"string[3]" },
      { "indexed": false, "internalType":"uint256","name":"timestamp","type":"uint256" }
    ],
    "name":"CourseCreated",
    "type":"event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType":"address","name":"user","type":"address" },
      { "indexed": true,  "internalType":"uint256","name":"courseId","type":"uint256" },
      { "indexed": false, "internalType":"uint256","name":"timestamp","type":"uint256" }
    ],
    "name":"Registered",
    "type":"event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType":"address","name":"user","type":"address" },
      { "indexed": true,  "internalType":"uint256","name":"courseId","type":"uint256" },
      { "indexed": false, "internalType":"uint8","name":"index","type":"uint8" },
      { "indexed": false, "internalType":"uint256","name":"timestamp","type":"uint256" }
    ],
    "name":"MilestoneCompleted",
    "type":"event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true,  "internalType":"address","name":"user","type":"address" },
      { "indexed": true,  "internalType":"uint256","name":"courseId","type":"uint256" },
      { "indexed": false, "internalType":"uint256","name":"timestamp","type":"uint256" }
    ],
    "name":"CourseCompleted",
    "type":"event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true,  "internalType":"address","name":"user","type":"address"},
      {"indexed": true,  "internalType":"uint256","name":"courseId","type":"uint256"},
      {"indexed": false, "internalType":"uint256","name":"tokenId","type":"uint256"}
    ],
    "name":"CertificateMinted",
    "type":"event"
  }
];

// ---- CourseCertificate (ERC721) ABI ----
export const certificateABI = [
  {
    "inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],
    "name":"tokenURI",
    "outputs":[{"internalType":"string","name":"","type":"string"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],
    "name":"ownerOf",
    "outputs":[{"internalType":"address","name":"","type":"address"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[],
    "name":"name",
    "outputs":[{"internalType":"string","name":"","type":"string"}],
    "stateMutability":"view",
    "type":"function"
  },
  {
    "inputs":[],
    "name":"symbol",
    "outputs":[{"internalType":"string","name":"","type":"string"}],
    "stateMutability":"view",
    "type":"function"
  }
];

// (optional) handy default export
export default {
  contractAddress,
  contractABI,
  certificateAddress,
  certificateABI,
};
