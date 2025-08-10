export const contractAddress = "0x65E4Eebf482b733b7746aCdC317cD1ad763D4c7b";

export const contractABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "_title", "type": "string" },
      { "internalType": "string", "name": "_description", "type": "string" },
      { "internalType": "string[3]", "name": "_milestones", "type": "string[3]" }
    ],
    "name": "createCourse",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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
  }
];