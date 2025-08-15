// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ICourseCertificate {
    function mintCertificate(
        address to,
        uint256 courseId,
        string calldata courseTitle,
        string calldata courseDescription,
        uint256 completedAt
    ) external returns (uint256 tokenId);
}

interface IEduToken {
    function mint(address to, uint256 amount) external;
    function balanceOf(address) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
}

contract CourseManager is Ownable {
    uint256 public constant REWARD_PER_COURSE = 10 ether; // 10 * 1e18

    struct Course {
        uint256 id;
        string title;
        string description;
        string[3] milestones;
        uint256 createdAt;
        bool exists;

        bool useSchedule;
        uint256[3] notBefore;
        uint256 minGap;
        uint256 deadline;
    }

    uint256 public courseCount;
    mapping(uint256 => Course) public courses;

    // registrations
    mapping(uint256 => mapping(address => bool)) private _isRegistered;
    mapping(address => uint256[]) private _userRegistrations;

    // progress + completion
    mapping(uint256 => mapping(address => bool[3])) private _milestoneDone;
    mapping(uint256 => mapping(address => uint8))  private _milestoneCount;
    mapping(uint256 => mapping(address => bool))   private _isCompleted;
    mapping(address => uint256[])                  private _userCompletions;

    // timestamps
    mapping(uint256 => mapping(address => uint256[3])) private _milestoneAt;
    mapping(uint256 => mapping(address => uint256))     private _completedAt;

    // certificate NFT
    ICourseCertificate public certificate;
    mapping(address => mapping(uint256 => uint256)) public certificateTokenId;

    // ERC20 reward
    IEduToken public rewardToken; // set by owner (must set CourseManager as minter on the token)
    mapping(uint256 => mapping(address => bool)) public rewardPaid; // courseId => user => paid?

    // events
    event CourseCreated(uint256 indexed courseId, string title, string description, string[3] milestones, uint256 timestamp);
    event Registered(address indexed user, uint256 indexed courseId, uint256 timestamp);
    event MilestoneCompleted(address indexed user, uint256 indexed courseId, uint8 index, uint256 timestamp);
    event CourseCompleted(address indexed user, uint256 indexed courseId, uint256 timestamp);
    event CertificateMinted(address indexed user, uint256 indexed courseId, uint256 tokenId);
    event CertificateAddressSet(address indexed certificate);

    // schedule events
    event MilestoneScheduleSet(uint256 indexed courseId, uint256[3] notBefore, uint256 minGap, uint256 deadline);
    event MilestoneScheduleCleared(uint256 indexed courseId);

    // reward events
    event RewardTokenSet(address indexed token);
    event RewardPaid(address indexed user, uint256 indexed courseId, uint256 amount);

    constructor() Ownable(msg.sender) {}

    /**  certificate  */
    function setCertificate(address cert) external onlyOwner {
        certificate = ICourseCertificate(cert);
        emit CertificateAddressSet(cert);
    }

    /**  rewards  */
    function setRewardToken(address token) external onlyOwner {
        rewardToken = IEduToken(token);
        emit RewardTokenSet(token);
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
            exists: true,
            useSchedule: false,
            notBefore: [uint256(0), uint256(0), uint256(0)],
            minGap: 0,
            deadline: 0
        });
        emit CourseCreated(courseCount, _title, _description, _milestones, block.timestamp);
    }

    function setCourseSchedule(
        uint256 courseId,
        uint256[3] calldata notBefore_,
        uint256 minGap_,
        uint256 deadline_
    ) external onlyOwner {
        require(courses[courseId].exists, "Course does not exist");
        require((notBefore_[0] <= notBefore_[1]) && (notBefore_[1] <= notBefore_[2]), "notBefore must be ascending");

        Course storage c = courses[courseId];
        c.useSchedule = true;
        c.notBefore = notBefore_;
        c.minGap = minGap_;
        c.deadline = deadline_;
        emit MilestoneScheduleSet(courseId, notBefore_, minGap_, deadline_);
    }

    function clearCourseSchedule(uint256 courseId) external onlyOwner {
        require(courses[courseId].exists, "Course does not exist");
        Course storage c = courses[courseId];
        c.useSchedule = false;
        c.notBefore = [uint256(0), uint256(0), uint256(0)];
        c.minGap = 0;
        c.deadline = 0;
        emit MilestoneScheduleCleared(courseId);
    }

    function getCourse(uint256 courseId)
        external
        view
        returns (uint256 id, string memory title, string memory description, string[3] memory milestones, uint256 createdAt)
    {
        require(courses[courseId].exists, "Course does not exist");
        Course storage c = courses[courseId];
        return (c.id, c.title, c.description, c.milestones, c.createdAt);
    }

    function getCourseSchedule(uint256 courseId)
        external
        view
        returns (bool useSchedule, uint256[3] memory notBefore, uint256 minGap, uint256 deadline)
    {
        require(courses[courseId].exists, "Course does not exist");
        Course storage c = courses[courseId];
        return (c.useSchedule, c.notBefore, c.minGap, c.deadline);
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

    /**  progress milestones  */
    function completeMilestone(uint256 courseId, uint8 index) external {
        require(courses[courseId].exists, "Course does not exist");
        require(_isRegistered[courseId][msg.sender], "Not registered");
        require(index < 3, "Bad index");
        require(!_isCompleted[courseId][msg.sender], "Already completed");
        require(!_milestoneDone[courseId][msg.sender][index], "Already done");
        require(index == _milestoneCount[courseId][msg.sender], "Wrong order");

        Course storage c = courses[courseId];

        // time rules
        if (c.useSchedule) {
            uint256 nb = c.notBefore[index];
            if (nb != 0) require(block.timestamp >= nb, "Too early for this milestone");
            if (c.minGap != 0 && index > 0) {
                uint256 prevAt = _milestoneAt[courseId][msg.sender][index - 1];
                require(prevAt != 0, "Previous milestone has no timestamp");
                require(block.timestamp >= prevAt + c.minGap, "Respect min gap");
            }
            if (c.deadline != 0) require(block.timestamp <= c.deadline, "Course deadline passed");
        }

        // mark done
        _milestoneDone[courseId][msg.sender][index] = true;
        _milestoneCount[courseId][msg.sender] += 1;
        _milestoneAt[courseId][msg.sender][index] = block.timestamp;

        emit MilestoneCompleted(msg.sender, courseId, index, block.timestamp);

        // finished course
        if (_milestoneCount[courseId][msg.sender] == 3) {
            _isCompleted[courseId][msg.sender] = true;
            _userCompletions[msg.sender].push(courseId);
            _completedAt[courseId][msg.sender] = block.timestamp;
            emit CourseCompleted(msg.sender, courseId, block.timestamp);

            // certificate
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

            // reward
            if (address(rewardToken) != address(0) && !rewardPaid[courseId][msg.sender]) {
                rewardPaid[courseId][msg.sender] = true;
                rewardToken.mint(msg.sender, REWARD_PER_COURSE);
                emit RewardPaid(msg.sender, courseId, REWARD_PER_COURSE);
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

    function getMyMilestoneTimes(uint256 courseId) external view returns (uint256[3] memory times) {
        times = _milestoneAt[courseId][msg.sender];
    }

    function getMyCompletionTime(uint256 courseId) external view returns (uint256) {
        return _completedAt[courseId][msg.sender];
    }

    // keep the old frontend happy: same signature, constant amount
    function rewardForCourse(uint256 /*courseId*/) external pure returns (uint256) {
        return REWARD_PER_COURSE;
    }

    // small helper if your UI wants it
    function getMyRewardStatus(uint256 courseId) external view returns (bool paid, uint256 amount) {
        paid = rewardPaid[courseId][msg.sender];
        amount = (address(rewardToken) == address(0)) ? 0 : REWARD_PER_COURSE;
    }
}
