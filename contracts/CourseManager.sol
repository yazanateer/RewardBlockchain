// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

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

    event CourseCreated(
        uint256 indexed courseId, 
        string title, 
        string description, 
        string[3] milestones, 
        uint256 timestamp
    );

    // ✅ Constructor sets deployer as owner (compatible with OpenZeppelin v5)
    constructor() Ownable(msg.sender) {}

    /// @notice Create a new course with 3 milestones
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

    /// @notice Retrieve a course by ID
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
}
