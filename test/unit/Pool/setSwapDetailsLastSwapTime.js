const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = ethers;
const { parseEther } = ethers.utils;

const { toBytes8 } = require('../utils').helpers;

describe('setSwapDetailsLastSwapTime', function () {
  before(async function () {
    const { pool, dai, stETH, enzymeVault } = this;
    const { chainlinkDAI, chainlinkSteth, chainlinkEnzymeVault } = this;
    const [governance] = this.accounts.governanceContracts;

    const ERC20Mock = await ethers.getContractFactory('ERC20Mock');
    const ChainlinkAggregatorMock = await ethers.getContractFactory('ChainlinkAggregatorMock');
    const PriceFeedOracle = await ethers.getContractFactory('PriceFeedOracle');

    const otherToken = await ERC20Mock.deploy();

    const chainlinkNewAsset = await ChainlinkAggregatorMock.deploy();
    await chainlinkNewAsset.setLatestAnswer(BigNumber.from((1e18).toString()));

    const priceFeedOracle = await PriceFeedOracle.deploy(
      [dai.address, stETH.address, enzymeVault.address, otherToken.address],
      [chainlinkDAI.address, chainlinkSteth.address, chainlinkEnzymeVault.address, chainlinkNewAsset.address],
      [18, 18, 18, 18],
    );

    await pool.connect(governance).updateAddressParameters(toBytes8('PRC_FEED'), priceFeedOracle.address);

    this.otherToken = otherToken;
  });

  it('set last swap time for asset', async function () {
    const { pool, otherToken } = this;
    const {
      governanceContracts: [governance],
      members: [member],
    } = this.accounts;

    const tokenAmount = parseEther('100000');
    await pool.connect(governance).addAsset(otherToken.address, true, '0', '0', 100);
    await otherToken.mint(pool.address, tokenAmount);

    const lastSwapTime = 11512651;

    await pool.connect(governance).updateAddressParameters(toBytes8('SWP_OP'), member.address);

    await pool.connect(member).setSwapDetailsLastSwapTime(otherToken.address, lastSwapTime);

    const swapDetails = await pool.swapDetails(otherToken.address);
    expect(swapDetails.lastSwapTime).to.equal(lastSwapTime);
  });

  it('revers if not called by swap operator', async function () {
    const { pool, otherToken } = this;
    const {
      governanceContracts: [governance],
      members: [arbitraryCaller],
    } = this.accounts;

    const tokenAmount = parseEther('100000');
    await pool.connect(governance).addAsset(otherToken.address, true, '0', '0', 100);
    await otherToken.mint(pool.address, tokenAmount);

    const lastSwapTime = '11512651';

    await expect(
      pool.connect(arbitraryCaller).setSwapDetailsLastSwapTime(otherToken.address, lastSwapTime),
    ).to.be.revertedWith('Pool: Not swapOperator');
  });
});
