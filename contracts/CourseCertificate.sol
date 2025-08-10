// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract CourseCertificate is ERC721URIStorage, Ownable {
    using Strings for uint256;

    address public courseManager;
    uint256 public nextTokenId;

    error NotCourseManager();

    event CourseManagerSet(address indexed courseManager);
    event CertificateMinted(address indexed to, uint256 indexed tokenId, uint256 indexed courseId);

    constructor() ERC721("RewardChain Certificate", "RCCERT") Ownable(msg.sender) {}

    function setCourseManager(address _cm) external onlyOwner {
        courseManager = _cm;
        emit CourseManagerSet(_cm);
    }

    modifier onlyCourseManager() {
        if (msg.sender != courseManager) revert NotCourseManager();
        _;
    }

    function mintCertificate(
        address to,
        uint256 courseId,
        string calldata courseTitle,
        uint256 completedAt
    ) external onlyCourseManager returns (uint256 tokenId) {
        tokenId = ++nextTokenId;
        _safeMint(to, tokenId);

        // Escape for each context:
        string memory titleForJSON = _escapeJSON(courseTitle);
        string memory titleForSVG  = _escapeSVG(courseTitle);

        // Build SVG + data URL
        string memory svg = _buildSVG(titleForSVG, tokenId);
        string memory imageData = string(
            abi.encodePacked("data:image/svg+xml;base64,", Base64.encode(bytes(svg)))
        );

        // JSON metadata (data: URL)
        string memory json = string(
            abi.encodePacked(
                "{",
                    "\"name\":\"", titleForJSON, " - Certificate #", tokenId.toString(), "\",",
                    "\"description\":\"Certificate of completion for ", titleForJSON, " on RewardChain.\",",
                    "\"image\":\"", imageData, "\",",
                    "\"attributes\":[",
                        "{", "\"trait_type\":\"Course ID\",\"value\":", courseId.toString(), "},",
                        "{", "\"trait_type\":\"Completed At\",\"display_type\":\"date\",\"value\":", completedAt.toString(), "}",
                    "]",
                "}"
            )
        );

        _setTokenURI(
            tokenId,
            string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))))
        );

        emit CertificateMinted(to, tokenId, courseId);
    }

    //  helpers 

    // Escape " and \ for JSON strings
    function _escapeJSON(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory out = new bytes(b.length * 2); // worst case
        uint256 j;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 ch = b[i];
            if (ch == '"' || ch == "\\") { out[j++] = "\\"; }
            out[j++] = ch;
        }
        assembly { mstore(out, j) }
        return string(out);
    }

    // Escape &, <, >, ", ' for XML/SVG text nodes
    function _escapeSVG(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        // worst case ~6x (if every char is replaced by &quot; etc.) – keep it simple
        bytes memory out = new bytes(b.length * 6);
        uint256 j;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 ch = b[i];
            if (ch == "&") { out[j++]="&"; out[j++]="a"; out[j++]="m"; out[j++]="p"; out[j++]=";"; }
            else if (ch == "<") { out[j++]="&"; out[j++]="l"; out[j++]="t"; out[j++]=";"; }
            else if (ch == ">") { out[j++]="&"; out[j++]="g"; out[j++]="t"; out[j++]=";"; }
            else if (ch == "\"") { out[j++]="&"; out[j++]="q"; out[j++]="u"; out[j++]="o"; out[j++]="t"; out[j++]=";"; }
            else if (ch == "'") { out[j++]="&"; out[j++]="a"; out[j++]="p"; out[j++]="o"; out[j++]="s"; out[j++]=";"; }
            else { out[j++] = ch; }
        }
        assembly { mstore(out, j) }
        return string(out);
    }

    function _buildSVG(string memory title, uint256 tokenId) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                "<svg xmlns='http://www.w3.org/2000/svg' width='800' height='400'>",
                    "<defs>",
                        "<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>",
                            "<stop offset='0%' stop-color='#1e3a8a'/>",
                            "<stop offset='100%' stop-color='#3b82f6'/>",
                        "</linearGradient>",
                    "</defs>",
                    "<rect width='100%' height='100%' fill='url(#g)'/>",
                    "<rect x='24' y='24' width='752' height='352' rx='16' ry='16' fill='white' fill-opacity='0.08' stroke='#93c5fd'/>",
                    "<text x='50%' y='120' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='28' fill='#ffffff'>RewardChain Certificate</text>",
                    "<text x='50%' y='190' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='22' fill='#dbeafe'>", title, "</text>",
                    "<text x='50%' y='250' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='16' fill='#bfdbfe'>Token #", tokenId.toString(), "</text>",
                "</svg>"
            )
        );
    }
}
