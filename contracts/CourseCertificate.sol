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

    // NOTE: includes courseDescription and completedAt, so SVG can show both.
    function mintCertificate(
        address to,
        uint256 courseId,
        string calldata courseTitle,
        string calldata courseDescription,
        uint256 completedAt
    ) external onlyCourseManager returns (uint256 tokenId) {
        tokenId = ++nextTokenId;
        _safeMint(to, tokenId);

        // Escape for JSON & SVG contexts
        string memory tJSON = _escapeJSON(courseTitle);
        string memory dJSON = _escapeJSON(courseDescription);
        string memory tSVG  = _escapeSVG(courseTitle);
        string memory dSVG  = _escapeSVG(courseDescription);

        // Build image + attributes (now includes owner & contract in the SVG)
        string memory image = _imageData(tSVG, dSVG, tokenId, completedAt, to, address(this));
        string memory attrs = _attributesJSON(courseId, dJSON, completedAt);

        // Minimal on-chain metadata
        string memory json = string.concat(
            '{"name":"', tJSON, ' - Certificate #', tokenId.toString(), '",',
            '"description":"Certificate of completion for ', tJSON, ' on RewardChain.",',
            '"image":"', image, '","attributes":[', attrs, ']}'
        );

        _setTokenURI(
            tokenId,
            string.concat("data:application/json;base64,", Base64.encode(bytes(json)))
        );

        emit CertificateMinted(to, tokenId, courseId);
    }

    /* ---------- helpers: JSON, SVG & date formatting ---------- */

    function _imageData(
        string memory titleSVG,
        string memory descSVG,
        uint256 tokenId,
        uint256 completedAt,
        address ownerAddr,
        address contractAddr
    ) internal pure returns (string memory) {
        string memory svg = _buildSVG(titleSVG, descSVG, tokenId, completedAt, ownerAddr, contractAddr);
        return string.concat("data:image/svg+xml;base64,", Base64.encode(bytes(svg)));
    }

    function _attributesJSON(
        uint256 courseId,
        string memory descForJSON,
        uint256 completedAt
    ) internal pure returns (string memory) {
        // Keep the numeric Unix timestamp for marketplaces ("display_type":"date")
        return string.concat(
            '{"trait_type":"Course ID","value":', courseId.toString(), '},',
            '{"trait_type":"Course Description","value":"', descForJSON, '"},',
            '{"trait_type":"Completed At","display_type":"date","value":', completedAt.toString(), '}'
        );
    }

    // Escape " and \ for JSON strings
    function _escapeJSON(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
        bytes memory out = new bytes(b.length * 2);
        uint256 j;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 ch = b[i];
            if (ch == '"' || ch == "\\") { out[j++] = "\\"; }
            out[j++] = ch;
        }
        assembly { mstore(out, j) }
        return string(out);
    }

    // Escape &, <, >, ", ' for SVG text nodes
    function _escapeSVG(string memory s) internal pure returns (string memory) {
        bytes memory b = bytes(s);
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

    // === UTC date helpers (no external libs) ===
    uint256 private constant SECONDS_PER_DAY   = 24 * 60 * 60;
    uint256 private constant SECONDS_PER_HOUR  = 60 * 60;
    uint256 private constant SECONDS_PER_MIN   = 60;

    function _isLeap(uint256 year) private pure returns (bool) {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    }

    function _daysInMonth(uint256 year, uint256 month) private pure returns (uint256) {
        if (month == 1 || month == 3 || month == 5 || month == 7 || month == 8 || month == 10 || month == 12) return 31;
        if (month == 4 || month == 6 || month == 9 || month == 11) return 30;
        return _isLeap(year) ? 29 : 28; // February
    }

    // Convert unix seconds -> (year, month, day, hour, minute) in UTC
    function _timestampToYMDHM(uint256 ts)
        private
        pure
        returns (uint256 year, uint256 month, uint256 day, uint256 hour, uint256 minute)
    {
        uint256 daysSinceEpoch = ts / SECONDS_PER_DAY;
        uint256 secsRemainder  = ts % SECONDS_PER_DAY;

        // time
        hour   = secsRemainder / SECONDS_PER_HOUR;
        minute = (secsRemainder % SECONDS_PER_HOUR) / SECONDS_PER_MIN;

        // date
        year = 1970;
        while (true) {
            uint256 diy = _isLeap(year) ? 366 : 365;
            if (daysSinceEpoch < diy) break;
            daysSinceEpoch -= diy;
            year++;
        }

        month = 1;
        while (true) {
            uint256 dim = _daysInMonth(year, month);
            if (daysSinceEpoch < dim) { day = daysSinceEpoch + 1; break; }
            daysSinceEpoch -= dim;
            month++;
        }
    }

    function _two(uint256 v) private pure returns (string memory) {
        return v < 10 ? string.concat("0", v.toString()) : v.toString();
    }

    function _formatUTC(uint256 ts) private pure returns (string memory) {
        (uint256 y, uint256 m, uint256 d, uint256 hh, uint256 mm) = _timestampToYMDHM(ts);
        return string.concat(
            y.toString(), "/",
            _two(m), "/", _two(d), " ",
            _two(hh), ":", _two(mm), " UTC"
        );
    }

    // Address -> 0x… string
    function _addrHex(address a) private pure returns (string memory) {
        // 20 bytes for an Ethereum address
        return Strings.toHexString(uint160(a), 20);
    }

    function _buildSVG(
        string memory title,
        string memory description,
        uint256 tokenId,
        uint256 completedAt,
        address ownerAddr,
        address contractAddr
    ) internal pure returns (string memory) {
        string memory prettyUTC = _formatUTC(completedAt);
        string memory ownerStr = _addrHex(ownerAddr);
        string memory contractStr = _addrHex(contractAddr);

        return string(
            abi.encodePacked(
                "<svg xmlns='http://www.w3.org/2000/svg' width='800' height='520'>",
                    "<defs>",
                        "<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>",
                            "<stop offset='0%' stop-color='#1e3a8a'/>",
                            "<stop offset='100%' stop-color='#3b82f6'/>",
                        "</linearGradient>",
                    "</defs>",
                    "<rect width='100%' height='100%' fill='url(#g)'/>",
                    "<rect x='24' y='24' width='752' height='472' rx='16' ry='16' fill='white' fill-opacity='0.08' stroke='#93c5fd'/>",

                    "<text x='50%' y='110' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='28' fill='#ffffff'>RewardChain Certificate</text>",
                    "<text x='50%' y='170' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='22' fill='#dbeafe'>", title, "</text>",

                    "<foreignObject x='80' y='195' width='640' height='70'>",
                        "<div xmlns='http://www.w3.org/1999/xhtml' style='font-family:Arial, Helvetica, sans-serif; color:#dbeafe; font-size:16px; text-align:center;'>",
                            description,
                        "</div>",
                    "</foreignObject>",

                    "<text x='50%' y='285' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='14' fill='#d1d5db'>Owner: ",
                        ownerStr,
                    "</text>",
                    "<text x='50%' y='310' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='14' fill='#d1d5db'>Contract: ",
                        contractStr,
                    "</text>",

                    "<text x='50%' y='350' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='16' fill='#c7d2fe'>Completed: ",
                        prettyUTC,
                    "</text>",
                    "<text x='50%' y='390' text-anchor='middle' font-family='Arial, Helvetica, sans-serif' font-size='16' fill='#bfdbfe'>Token #",
                        tokenId.toString(),
                    "</text>",
                "</svg>"
            )
        );
    }
}
