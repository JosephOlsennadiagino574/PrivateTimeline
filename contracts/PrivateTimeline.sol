// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PrivateTimeline is SepoliaConfig {
    struct EncryptedLocation {
        uint256 timestamp;
        euint32 encryptedLatitude;
        euint32 encryptedLongitude;
        euint32 encryptedPlaceType;
        euint32 encryptedAccuracy;
    }

    struct QueryResult {
        euint32 encryptedCount;
        euint32 encryptedDuration;
        bool isRevealed;
    }

    struct DecryptedResult {
        uint32 count;
        uint32 duration;
        bool isRevealed;
    }

    mapping(address => EncryptedLocation[]) private userLocations;
    mapping(address => mapping(bytes32 => QueryResult)) private queryResults;
    mapping(address => mapping(bytes32 => DecryptedResult)) private decryptedResults;
    
    event LocationAdded(address indexed user, uint256 timestamp);
    event QueryExecuted(address indexed user, bytes32 queryId);
    event ResultRevealed(address indexed user, bytes32 queryId);

    function addEncryptedLocation(
        euint32 latitude,
        euint32 longitude,
        euint32 placeType,
        euint32 accuracy
    ) public {
        userLocations[msg.sender].push(EncryptedLocation({
            timestamp: block.timestamp,
            encryptedLatitude: latitude,
            encryptedLongitude: longitude,
            encryptedPlaceType: placeType,
            encryptedAccuracy: accuracy
        }));
        
        emit LocationAdded(msg.sender, block.timestamp);
    }

    function queryVisitsToPlaceType(
        euint32 targetPlaceType,
        uint256 startTime,
        uint256 endTime
    ) public returns (bytes32) {
        bytes32 queryId = keccak256(abi.encodePacked(msg.sender, block.timestamp));
        
        euint32 count = FHE.asEuint32(0);
        euint32 duration = FHE.asEuint32(0);
        
        for (uint256 i = 0; i < userLocations[msg.sender].length; i++) {
            EncryptedLocation storage loc = userLocations[msg.sender][i];
            
            ebool isInTimeRange = FHE.and(
                FHE.gt(FHE.asEuint32(uint32(loc.timestamp)), FHE.asEuint32(uint32(startTime))),
                FHE.lt(FHE.asEuint32(uint32(loc.timestamp)), FHE.asEuint32(uint32(endTime)))
            );
            
            ebool isTargetPlace = FHE.eq(loc.encryptedPlaceType, targetPlaceType);
            ebool shouldCount = FHE.and(isInTimeRange, isTargetPlace);
            
            count = FHE.add(count, FHE.select(shouldCount, FHE.asEuint32(1), FHE.asEuint32(0)));
            duration = FHE.add(duration, FHE.select(shouldCount, loc.encryptedAccuracy, FHE.asEuint32(0)));
        }
        
        queryResults[msg.sender][queryId] = QueryResult({
            encryptedCount: count,
            encryptedDuration: duration,
            isRevealed: false
        });
        
        emit QueryExecuted(msg.sender, queryId);
        return queryId;
    }

    function requestResultDecryption(bytes32 queryId) public {
        require(!queryResults[msg.sender][queryId].isRevealed, "Already revealed");
        
        QueryResult storage result = queryResults[msg.sender][queryId];
        bytes32[] memory ciphertexts = new bytes32[](2);
        ciphertexts[0] = FHE.toBytes32(result.encryptedCount);
        ciphertexts[1] = FHE.toBytes32(result.encryptedDuration);
        
        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptQueryResult.selector);
    }

    function decryptQueryResult(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        FHE.checkSignatures(requestId, cleartexts, proof);
        
        uint32[] memory results = abi.decode(cleartexts, (uint32[]));
        
        // In production, would map requestId to specific query
        bytes32 queryId = keccak256(abi.encodePacked(msg.sender, block.timestamp - 1));
        
        decryptedResults[msg.sender][queryId] = DecryptedResult({
            count: results[0],
            duration: results[1],
            isRevealed: true
        });
        
        queryResults[msg.sender][queryId].isRevealed = true;
        emit ResultRevealed(msg.sender, queryId);
    }

    function queryLocationProximity(
        euint32 targetLatitude,
        euint32 targetLongitude,
        euint32 radius,
        uint256 startTime,
        uint256 endTime
    ) public returns (bytes32) {
        bytes32 queryId = keccak256(abi.encodePacked(msg.sender, block.timestamp));
        
        euint32 count = FHE.asEuint32(0);
        
        for (uint256 i = 0; i < userLocations[msg.sender].length; i++) {
            EncryptedLocation storage loc = userLocations[msg.sender][i];
            
            ebool isInTimeRange = FHE.and(
                FHE.gt(FHE.asEuint32(uint32(loc.timestamp)), FHE.asEuint32(uint32(startTime))),
                FHE.lt(FHE.asEuint32(uint32(loc.timestamp)), FHE.asEuint32(uint32(endTime)))
            );
            
            euint32 latDiff = FHE.abs(FHE.sub(loc.encryptedLatitude, targetLatitude));
            euint32 longDiff = FHE.abs(FHE.sub(loc.encryptedLongitude, targetLongitude));
            ebool isInRadius = FHE.lt(FHE.add(latDiff, longDiff), radius);
            
            ebool shouldCount = FHE.and(isInTimeRange, isInRadius);
            count = FHE.add(count, FHE.select(shouldCount, FHE.asEuint32(1), FHE.asEuint32(0)));
        }
        
        queryResults[msg.sender][queryId] = QueryResult({
            encryptedCount: count,
            encryptedDuration: FHE.asEuint32(0),
            isRevealed: false
        });
        
        emit QueryExecuted(msg.sender, queryId);
        return queryId;
    }

    function getLocationCount(address user) public view returns (uint256) {
        return userLocations[user].length;
    }

    function getDecryptedResult(address user, bytes32 queryId) public view returns (
        uint32 count,
        uint32 duration,
        bool isRevealed
    ) {
        DecryptedResult storage result = decryptedResults[user][queryId];
        return (result.count, result.duration, result.isRevealed);
    }
}