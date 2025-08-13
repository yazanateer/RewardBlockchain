// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ICourseCertificate {
    function mintCertificate(
        address to,
        uint256 courseId,
        string calldata courseTitle,
        string calldata courseDescription,   // <— NEW
        uint256 completedAt
    ) external returns (uint256 tokenId);
}

contract CourseManager is Ownable {
    struct Course {
        uint256 id;
        string title;
        string description;
        string[3] milestones;
        uint256 createdAt;
        bool exists;
    }

    uint256 public courseCount;
    mapping(uint256 => Course) public courses;

    // registrations
    mapping(uint256 => mapping(address => bool)) private _isRegistered;
    mapping(address => uint256[]) private _userRegistrations;

    // progress + completion
    mapping(uint256 => mapping(address => bool[3])) private _milestoneDone; // courseId => user => [3]
    mapping(uint256 => mapping(address => uint8)) private _milestoneCount;  // 0..3
    mapping(uint256 => mapping(address => bool)) private _isCompleted;      // courseId => user
    mapping(address => uint256[]) private _userCompletions;                 // user => completed courseIds

    // certificate NFT
    ICourseCertificate public certificate; // set once deployed
    mapping(address => mapping(uint256 => uint256)) public certificateTokenId; // user => courseId => tokenId

    event CourseCreated(uint256 indexed courseId, string title, string description, string[3] milestones, uint256 timestamp);
    event Registered(address indexed user, uint256 indexed courseId, uint256 timestamp);
    event MilestoneCompleted(address indexed user, uint256 indexed courseId, uint8 index, uint256 timestamp);
    event CourseCompleted(address indexed user, uint256 indexed courseId, uint256 timestamp);
    event CertificateMinted(address indexed user, uint256 indexed courseId, uint256 tokenId);
    event CertificateAddressSet(address indexed certificate);

    constructor() Ownable(msg.sender) {}

    /**  admin */

    function setCertificate(address cert) external onlyOwner {
        certificate = ICourseCertificate(cert);
        emit CertificateAddressSet(cert);
    }

    /**  courses  */

    function createCourse(
        string calldata _title,
        string calldata _description,
        string[3] calldata _milestones
    ) external onlyOwner {
        courseCount++;
        courses[courseCount] = Course({
            id: courseCount,
            title: _title,
            description: _description,
            milestones: _milestones,
            createdAt: block.timestamp,
            exists: true
        });
        emit CourseCreated(courseCount, _title, _description, _milestones, block.timestamp);
    }

    function getCourse(uint256 courseId)
        external
        view
        returns (
            uint256 id,
            string memory title,
            string memory description,
            string[3] memory milestones,
            uint256 createdAt
        )
    {
        require(courses[courseId].exists, "Course does not exist");
        Course storage c = courses[courseId];
        return (c.id, c.title, c.description, c.milestones, c.createdAt);
    }

    /**  registration  */

    function registerForCourse(uint256 courseId) external {
        require(courses[courseId].exists, "Course does not exist");
        require(!_isRegistered[courseId][msg.sender], "Already registered");
        _isRegistered[courseId][msg.sender] = true;
        _userRegistrations[msg.sender].push(courseId);
        emit Registered(msg.sender, courseId, block.timestamp);
    }

    function isRegistered(uint256 courseId, address user) external view returns (bool) {
        return _isRegistered[courseId][user];
    }

    function getMyRegisteredCourses() external view returns (uint256[] memory) {
        return _userRegistrations[msg.sender];
    }

    /**  progress & completion  */

    function completeMilestone(uint256 courseId, uint8 index) external {
        require(courses[courseId].exists, "Course does not exist");
        require(_isRegistered[courseId][msg.sender], "Not registered");
        require(index < 3, "Bad index");
        require(!_isCompleted[courseId][msg.sender], "Already completed");
        require(!_milestoneDone[courseId][msg.sender][index], "Already done");
        require(index == _milestoneCount[courseId][msg.sender], "Wrong order");

        _milestoneDone[courseId][msg.sender][index] = true;
        _milestoneCount[courseId][msg.sender] += 1;
        emit MilestoneCompleted(msg.sender, courseId, index, block.timestamp);

        if (_milestoneCount[courseId][msg.sender] == 3) {
            _isCompleted[courseId][msg.sender] = true;
            _userCompletions[msg.sender].push(courseId);
            emit CourseCompleted(msg.sender, courseId, block.timestamp);

            // Mint NFT certificate if the certificate contract is set
            if (address(certificate) != address(0)) {
                uint256 tokenId = certificate.mintCertificate(
                    msg.sender,
                    courseId,
                    courses[courseId].title,
                    courses[courseId].description,
                    block.timestamp
                );
                certificateTokenId[msg.sender][courseId] = tokenId;
                emit CertificateMinted(msg.sender, courseId, tokenId);
            }
        }
    }

    function isCompleted(uint256 courseId, address user) external view returns (bool) {
        return _isCompleted[courseId][user];
    }

    function getMyCompletedCourses() external view returns (uint256[] memory) {
        return _userCompletions[msg.sender];
    }

    function getMyCourseProgress(uint256 courseId)
        external
        view
        returns (bool registered, bool completed, uint8 completedCount, bool[3] memory done)
    {
        registered = _isRegistered[courseId][msg.sender];
        completed = _isCompleted[courseId][msg.sender];
        completedCount = _milestoneCount[courseId][msg.sender];
        done = _milestoneDone[courseId][msg.sender];
    }
}