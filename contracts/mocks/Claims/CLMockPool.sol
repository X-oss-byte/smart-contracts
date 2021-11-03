// SPDX-License-Identifier: GPL-3.0-only
import "../../interfaces/IPool.sol";

pragma solidity ^0.8.0;

contract CLMockPool {
  IPool.Asset[] public assets;

  function sendPayout(
    uint payoutAsset,
    address payable payoutAddress,
    uint amount
  ) public {}

  function addAsset(address assetAddress, uint8 decimals) external {
    assets.push(IPool.Asset(assetAddress, decimals, false));
  }

  function getTokenPrice(uint assetId) public view returns (uint tokenPrice) {
    if (assetId == 0) {
      tokenPrice = 38200000000000000; // 1 NXM ~ 0.0382 ETH
    }
    tokenPrice = 3820000000000000000; // 1 NXM ~ 3.82 DAI
  }
}
